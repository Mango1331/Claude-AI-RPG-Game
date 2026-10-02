// Experimental Narrator-as-GM runtime.
//
// The LLM owns semantic interpretation: what the player meant, which known actor/object/skill they referred to,
// and the ordinary fictional consequence of an action. The engine still owns rules, resources, combat math and
// canonical state. The narrator reaches those hard domains through the functions in this file instead of a
// pre-narration regex/command interpretation pass.
//
// This module intentionally reuses the existing deterministic engines. It is a scaffold, not a parallel ruleset:
// - combat actions are converted to an explicit intent and resolved by playerTurn();
// - story/economy/quest commands are resolved by playerTurnV4();
// - creative ability use against the environment spends engine-owned resources here, while the physical consequence
//   remains GM adjudication and is persisted separately with commitWorld();
// - world changes still pass through applyWorld(), the firewall, ownership rules and event sourcing.
import { applyEvent } from '../state.js';
import { clone, hash32, normText, num, roundHalfUp } from '../util.js';
import { deriveCharacter, rawPower } from '../derived.js';
import { playerTurn } from '../engine.js';
import { playerTurnV4 } from '../v4/turn.js';
import { applyWorld } from '../v4/world.js';
import { buildCatalog } from '../v4/catalog.js';
import { sceneHandle } from '../v4/scene_handles.js';
import { entityLabel, statusOf } from '../knowledge.js';

export const GM_TOOLS_VERSION = 'gm-tools-0.1';

const STORY_COMMANDS = new Set([
    'go', 'activity', 'take', 'drop', 'give', 'use', 'pay', 'buy', 'sell',
    'offer.accept', 'offer.decline', 'quest.accept', 'quest.turn_in', 'quest.abandon',
    'guild.register', 'guild.promote', 'board.read', 'journey.continue', 'equip', 'unequip',
]);

const WORLD_TYPES = new Set([
    'fact', 'thread', 'attitude', 'memory', 'person_new', 'person_named', 'creature_new',
    'enter', 'leave', 'position', 'aware', 'hostile', 'intent',
    'quest_detail', 'quest_progress', 'quest_ready', 'time',
]);

function error(code, message, extra = {}) {
    return { ok: false, code, message, ...extra };
}

function skillOf(state, content, ref) {
    const q = normText(ref || '');
    if (!q) return null;
    const known = new Set(Object.keys(state.entities.pc?.sheet?.skills || {}));
    if (known.has(ref) && content.skills.has(ref)) return content.skills.get(ref);
    const hits = [...known].map((id) => content.skills.get(id)).filter(Boolean)
        .filter((s) => normText(s.name) === q || normText(s.id) === q);
    return hits.length === 1 ? hits[0] : null;
}

function targetOf(state, content, ref) {
    const q = normText(ref || '');
    if (!q) return null;
    if (state.entities[ref] && ref !== 'pc' && statusOf(state, ref) !== 'dead') return ref;
    const present = (state.scene?.present || []).filter((id) => id !== 'pc' && state.entities[id] && statusOf(state, id) !== 'dead');
    const hits = present.filter((id) => {
        const e = state.entities[id];
        return [e.name, entityLabel(state, id), sceneHandle(state, content, id), ...(e.descriptors || [])]
            .filter(Boolean).some((x) => normText(x) === q);
    });
    return hits.length === 1 ? hits[0] : null;
}

function actionSummary(outcome) {
    if (!outcome) return null;
    if (outcome.kind === 'combat') {
        return {
            kind: outcome.kind,
            started: outcome.started || null,
            records: outcome.records || [],
            illegal: outcome.illegal || null,
            ended: outcome.ended || null,
            next: outcome.next || null,
        };
    }
    return outcome;
}

function stage(session, result, call) {
    return {
        ...session,
        events: result.events.slice(),
        state: result.state,
        actionResolved: true,
        calls: [...session.calls, call],
    };
}

/** A generation-local transaction. It is committed to the assistant swipe only when the final reply arrives. */
export function createGmSession({ chatId, userIndex, input, beforeState }) {
    return {
        v: GM_TOOLS_VERSION,
        chatId,
        userIndex,
        input: String(input || ''),
        inputHash: hash32(String(input || '')),
        beforeState: clone(beforeState),
        state: null,
        events: [],
        actionResolved: false,
        worldCommits: 0,
        calls: [],
    };
}

function canResolvePrimary(session) {
    return !session.actionResolved && session.worldCommits === 0;
}

/**
 * Resolve an ordinary combat/mechanical action chosen semantically by the Narrator.
 * The Narrator supplies canonical ids; the deterministic combat engine owns legality, resources, turns and damage.
 */
export function resolveCombat(session, content, args = {}) {
    if (!canResolvePrimary(session)) return { session, result: error('primary_action_already_resolved', 'Resolve the player action at most once before committing world consequences.') };
    const action = String(args.action || '').toLowerCase();
    let intent;

    if (action === 'attack') {
        const skill = skillOf(session.beforeState, content, args.skill);
        if (!skill) return { session, result: error('unknown_skill', 'Use avereth_lookup(kind="skills") and pass one of Alaric\'s canonical skill ids or exact names.') };
        if (!skill.attack) return { session, result: error('not_an_attack_skill', `${skill.name} is not an offensive attack.`) };
        const target = targetOf(session.beforeState, content, args.target);
        if (!target) return { session, result: error('unknown_target', 'The target is not one unique living actor in the current scene. Use avereth_lookup(kind="scene").') };
        intent = { kind: 'attack', skill: skill.id, target, target_how: 'gm_tool', move: args.move === 'closer' || args.move === 'away' ? args.move : null };
    } else if (action === 'skill') {
        const skill = skillOf(session.beforeState, content, args.skill);
        if (!skill) return { session, result: error('unknown_skill', 'Use avereth_lookup(kind="skills") and pass one of Alaric\'s canonical skill ids or exact names.') };
        if (skill.attack) {
            const target = targetOf(session.beforeState, content, args.target);
            if (!target) return { session, result: error('unknown_target', 'This offensive skill needs one unique living actor in the current scene.') };
            intent = { kind: 'attack', skill: skill.id, target, target_how: 'gm_tool', move: args.move === 'closer' || args.move === 'away' ? args.move : null };
        } else {
            const target = args.target ? targetOf(session.beforeState, content, args.target) : null;
            intent = { kind: 'skill', skill: skill.id, target, dir: args.move === 'closer' ? 'closer' : 'away' };
        }
    } else if (action === 'stealth') intent = { kind: 'stealth' };
    else if (action === 'flee') intent = { kind: 'flee' };
    else if (action === 'engage') {
        const target = targetOf(session.beforeState, content, args.target);
        if (!target) return { session, result: error('unknown_target', 'Engage needs one unique living actor in the current scene.') };
        intent = { kind: 'engage', targets: [target] };
    } else if (action === 'hold') intent = { kind: 'hold' };
    else return { session, result: error('unsupported_action', 'Supported actions: attack, skill, stealth, flee, engage, hold.') };

    const r = playerTurn(session.beforeState, content, session.input, { msg: session.userIndex, intent });
    if (r.command) return { session, result: error('needs_clarification', r.command.panels?.join('\n') || 'The engine needs clarification.') };
    const next = stage(session, r, { tool: 'avereth_resolve_combat', args: clone(args) });
    return {
        session: next,
        result: {
            ok: true,
            authoritative: true,
            outcome: actionSummary(r.outcome),
            state: {
                turn: r.state.turn,
                hp: r.state.entities.pc.sheet.hp,
                mp: r.state.entities.pc.sheet.mp,
                sta: r.state.entities.pc.sheet.sta,
                encounter: r.state.encounter ? { id: r.state.encounter.id, round: r.state.encounter.round, current: r.state.encounter.current } : null,
            },
            instruction: 'Narrate the authoritative outcome exactly. Do not substitute the wording of the player message for a different resolved skill or result.',
        },
    };
}

/**
 * Transitional bridge for deterministic non-combat domains. The Narrator supplies existing V4 command objects
 * directly; there is deliberately no regex/LLM interpreter in front of them.
 */
export function resolveStory(session, content, args = {}) {
    if (!canResolvePrimary(session)) return { session, result: error('primary_action_already_resolved', 'Resolve the player action at most once before committing world consequences.') };
    const commands = Array.isArray(args.commands) ? args.commands.map((c, i) => ({ ...c, seq: c.seq ?? i + 1 })) : [];
    if (!commands.length) return { session, result: error('no_commands', 'No deterministic story command was supplied.') };
    for (const c of commands) {
        if (!STORY_COMMANDS.has(c.type)) return { session, result: error('unsupported_command', `${c.type} is not exposed by the GM-tool bridge.`) };
        if (c.type === 'board.read') return { session, result: error('board_not_migrated', 'Board generation still uses the legacy path in this scaffold. Claude should give it a dedicated GM tool rather than hiding an LLM generator behind this bridge.') };
    }
    const r = playerTurnV4(session.beforeState, content, session.input, {
        msg: session.userIndex,
        commands,
        dropped: [],
        board: null,
        interp: { version: GM_TOOLS_VERSION, source: 'narrator_tool', ms: 0, failed: false },
    });
    if (r.command) return { session, result: error('needs_clarification', r.command.panels?.join('\n') || 'The engine needs clarification.') };
    const next = stage(session, r, { tool: 'avereth_resolve_story', args: clone(args) });
    return {
        session: next,
        result: {
            ok: true,
            authoritative: true,
            outcome: r.outcome,
            instruction: 'Narrate only what the engine booked plus ordinary world causality. A pending/open decision remains the player\'s decision.',
        },
    };
}

function abilityPower(state, content, skill) {
    if (!skill.attack) return null;
    const sheet = state.entities.pc.sheet;
    const derived = deriveCharacter(sheet, content);
    return rawPower(skill, sheet.stats, { atk: derived.atk, matk: derived.matk });
}

/**
 * Creative ability use against scenery, an object or another non-combat fictional target.
 * The engine validates ownership/cost and supplies a mechanical power profile. It intentionally does NOT decide
 * whether stone breaks, water freezes, a rope burns, etc.; that is GM adjudication from the established fiction.
 */
export function useAbilityOnWorld(session, content, args = {}) {
    if (!canResolvePrimary(session)) return { session, result: error('primary_action_already_resolved', 'Resolve the player action at most once before committing world consequences.') };
    if (session.beforeState.encounter) return { session, result: error('active_combat_not_migrated', 'Creative environmental ability use during an ACTIVE encounter is intentionally not implemented in this scaffold; it needs explicit turn/action-economy design.') };
    const skill = skillOf(session.beforeState, content, args.skill);
    if (!skill) return { session, result: error('unknown_skill', 'Use avereth_lookup(kind="skills") and pass one of Alaric\'s canonical skill ids or exact names.') };
    if (skill.ammo) return { session, result: error('ammo_ability_not_migrated', 'Ammo-consuming creative ability use is not implemented in this scaffold.') };

    const s = clone(session.beforeState);
    const events = [];
    const emit = (e) => { applyEvent(s, e); events.push(e); };
    const sheet = s.entities.pc.sheet;
    const profLevel = sheet.skills?.[skill.id]?.prof || 1;
    const prof = content.rules.proficiency.levels[String(profLevel)] || { cost: 1, power: 1 };
    const cost = skill.cost ? {
        resource: skill.cost.resource,
        amount: roundHalfUp(Number(skill.cost.amount || 0) * Number(prof.cost ?? 1)),
        base_amount: Number(skill.cost.amount || 0),
        proficiency: profLevel,
    } : null;
    if (cost && Number(sheet[cost.resource] || 0) < cost.amount) {
        return { session, result: error('insufficient_resource', `${skill.name} costs ${cost.amount} ${cost.resource.toUpperCase()} at proficiency P${profLevel}, but Alaric has only ${sheet[cost.resource] || 0}.`) };
    }

    emit({ t: 'turn.begun', d: { turn: s.turn + 1, input_hash: hash32(session.input), input: session.input.slice(0, 240) } });
    if (cost) emit({ t: 'resource.changed', d: { id: 'pc', resource: cost.resource, value: sheet[cost.resource] - cost.amount, why: `${skill.name}: creative world use` } });
    const outcome = {
        kind: 'gm_ability',
        skill: { id: skill.id, name: skill.name, category: skill.category, type: skill.type_text || null },
        target: { ref: args.target_ref || null, description: String(args.target_description || '').slice(0, 240) },
        goal: String(args.goal || '').slice(0, 240),
        mechanical: {
            cost,
            range: skill.range || null,
            raw_power: abilityPower(session.beforeState, content, skill),
            proficiency_power: Number(prof.power ?? 1),
            modified_power: skill.attack ? num(abilityPower(session.beforeState, content, skill) * Number(prof.power ?? 1)) : null,
            damage_type: skill.attack?.damage_type || null,
            effects: skill.effects || [],
        },
        adjudication: 'The Narrator decides the physical/world consequence from established fiction. raw_power is a comparison aid, not automatic creature damage. Persist any durable consequence with avereth_commit_world.',
    };
    emit({ t: 'outcome.recorded', d: { outcome, situations: [] } });
    const r = { events, state: s, outcome };
    const next = stage(session, r, { tool: 'avereth_use_ability_on_world', args: clone(args) });
    return {
        session: next,
        result: {
            ok: true,
            authoritative: true,
            outcome,
            state: { turn: s.turn, hp: sheet.hp, mp: sheet.mp, sta: sheet.sta },
            instruction: 'Adjudicate the fictional consequence now. If it durably changes the world, call avereth_commit_world before writing the final prose.',
        },
    };
}

function ensureNarrative(session, content) {
    if (session.state) return session;
    const r = playerTurn(session.beforeState, content, session.input, {
        msg: session.userIndex,
        intent: { kind: 'narrative', flags: { gm_tool_default: true } },
    });
    return {
        ...stage(session, r, { tool: 'implicit_narrative_turn', args: {} }),
        actionResolved: false,
    };
}

function deltaOf(change, seq, state) {
    if (!change || !WORLD_TYPES.has(change.type)) throw new Error(`unsupported world change type: ${change?.type || 'missing'}`);
    const q = state.quests?.[change.quest];
    switch (change.type) {
        case 'fact': return { seq, type: 'fact', s: change.s || state.scene.at || state.scene.location, p: change.p, o: change.o };
        case 'thread': return { seq, type: 'thread', text: change.text, kind: change.kind || 'other', status: change.status || 'open' };
        case 'attitude': return { seq, type: 'attitude', who: change.who, delta: Number(change.delta || 0), why: change.why };
        case 'memory': return { seq, type: 'memory', text: change.text, who: change.who || [], imp: Number(change.imp || 6) };
        case 'person_new': return { seq, type: 'person.new', ref: change.ref, name: change.name ?? null, role: change.role || 'person', desc: change.desc || [], present: change.present !== false, at: change.at ?? null, band: change.band ?? null };
        case 'person_named': return { seq, type: 'person.named', who: change.who, name: change.name };
        case 'creature_new': return { seq, type: 'creature.new', ref: change.ref, species: change.species, anchor: change.anchor, desc: change.desc || [], count: Number(change.count || 1), present: change.present !== false, band: change.band ?? null, stronger: change.stronger ?? null };
        case 'enter': return { seq, type: 'enter', who: change.who };
        case 'leave': return { seq, type: 'leave', who: change.who };
        case 'position': return { seq, type: 'position', who: change.who, band: change.band, cover: change.cover ?? null };
        case 'aware': return { seq, type: 'aware', who: change.who, level: change.level };
        case 'hostile': return { seq, type: 'hostile', by: Array.isArray(change.by) ? change.by : [change.by] };
        case 'intent': return { seq, type: 'intent', who: change.who, intent: change.intent };
        case 'quest_detail':
            if (!q) throw new Error(`unknown quest ${change.quest}`);
            return { seq, type: 'quest.detail', quest: change.quest, note: change.note, schedule: change.schedule ?? null };
        case 'quest_progress':
            if (!q) throw new Error(`unknown quest ${change.quest}`);
            return { seq, type: 'quest.progress', quest: change.quest, objective: change.objective, status: change.status };
        case 'quest_ready':
            if (!q) throw new Error(`unknown quest ${change.quest}`);
            return { seq, type: 'quest.ready', quest: change.quest, note: change.note, alternative: change.alternative ?? null };
        case 'time': return { seq, type: 'time', minutes: Math.max(0, Math.round(Number(change.minutes || 0))) };
        default: throw new Error('unreachable');
    }
}

/** Persist durable world consequences through the existing firewall/ownership/world applier. */
export function commitWorld(session, content, args = {}) {
    let base = ensureNarrative(session, content);
    const changes = Array.isArray(args.changes) ? args.changes : [];
    if (!changes.length) return { session: base, result: error('no_changes', 'No durable world changes were supplied.') };
    let deltas;
    try {
        deltas = changes.map((c, i) => deltaOf(c, i + 1, base.state));
    } catch (e) {
        return { session: base, result: error('invalid_change', String(e.message || e)) };
    }
    const r = applyWorld(base.state, content, { expected: {}, deltas }, {
        msg: base.userIndex,
        prose: String(args.evidence || ''),
    });
    const next = {
        ...base,
        state: r.state,
        events: [...base.events, ...r.events],
        worldCommits: base.worldCommits + 1,
        calls: [...base.calls, { tool: 'avereth_commit_world', args: clone(args) }],
    };
    return {
        session: next,
        result: {
            ok: true,
            applied: deltas.length - r.rejected.length,
            rejected: r.rejected,
            corrections: r.corrections,
            opened_combat: r.opened || null,
            instruction: r.corrections.length ? 'Respect the corrections in the final narration.' : 'The accepted world changes are now canonical for this swipe.',
        },
    };
}

/** Read-only canonical lookup so the Narrator can use ids instead of guessing them. */
export function lookup(session, content, args = {}) {
    const state = session.state || session.beforeState;
    const kind = String(args.kind || 'scene');
    const ref = String(args.ref || '');
    if (kind === 'scene') {
        return {
            ok: true,
            here: { id: state.scene.at, location: state.scene.location, place: state.scene.place },
            present: (state.scene.present || []).filter((id) => id !== 'pc' && state.entities[id]).map((id) => ({
                id, handle: sceneHandle(state, content, id), name: state.entities[id].name || null,
                kind: state.entities[id].kind, status: statusOf(state, id), position: state.scene.positions?.[id] || null,
            })),
        };
    }
    if (kind === 'skills') {
        return {
            ok: true,
            skills: Object.keys(state.entities.pc?.sheet?.skills || {}).map((id) => {
                const s = content.skills.get(id);
                return s && { id: s.id, name: s.name, category: s.category, cost: s.cost || null, range: s.range || null, attack: s.attack || null, effects: s.effects || [] };
            }).filter(Boolean),
        };
    }
    if (kind === 'entity') {
        const id = targetOf({ ...state, scene: { ...state.scene, present: Object.keys(state.entities) } }, content, ref) || (state.entities[ref] ? ref : null);
        if (!id) return error('not_found', 'No unique entity matched that reference.');
        return { ok: true, id, entity: clone(state.entities[id]), present: state.scene.present.includes(id), position: state.scene.positions?.[id] || null };
    }
    if (kind === 'quest') {
        const q = state.quests?.[ref] || Object.values(state.quests || {}).find((x) => normText(x.title) === normText(ref));
        return q ? { ok: true, quest: clone(q) } : error('not_found', 'No quest matched that reference.');
    }
    if (kind === 'object') {
        const o = state.objects?.[ref] || Object.values(state.objects || {}).find((x) => normText(x.name) === normText(ref));
        return o ? { ok: true, object: clone(o) } : error('not_found', 'No object matched that reference.');
    }
    if (kind === 'place') {
        const p = state.places?.[ref] || Object.values(state.places || {}).find((x) => normText(x.name) === normText(ref));
        return p ? { ok: true, place: clone(p) } : error('not_found', 'No place matched that reference.');
    }
    if (kind === 'catalog') return { ok: true, catalog: buildCatalog(state, content) };
    return error('unsupported_lookup', 'Supported lookup kinds: scene, skills, entity, quest, object, place, catalog.');
}

/** Ensure even a no-tool conversational turn advances deterministically once before committing the assistant swipe. */
export function finalizeGmSession(session, content) {
    return ensureNarrative(session, content);
}
