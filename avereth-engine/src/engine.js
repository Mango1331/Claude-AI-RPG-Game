// Engine facade — the whole API a host (SillyTavern extension, tests, CLI) needs:
//
//   startCampaign(content, {seed, firstMessage})      -> events            (stored with the first message)
//   playerTurn(state, content, input, {msg})          -> {events, outcome, command, state}   (stored with the user message)
//   turnContext(state, content, {...})                -> {text, sections, tokens}           (injected into the prompt)
//   narratorReply(state, content, replyText, {msg})   -> {events, clean, corrections, ...}  (stored with the reply)
//
// State is never stored: it is fold(events) over the chat. Every roll is drawn from the counter-based Dice, so
// re-running a turn from the same state (swipe/regenerate) yields the same results — dice are never rerolled.
import { Dice, newSeed } from './rng.js';
import { applyEvent, fold } from './state.js';
import { anchorFor, templateFor, locationByName, weaponFamily } from './content.js';
import { deriveCharacter } from './derived.js';
import { selectClass, selectSkills } from './creation.js';
import { scaleCreature, chooseCreatureLevel, humanSheet } from './npcgen.js';
import { initEncounter, addCombatant, runCombat, endEncounterEvents, terminal } from './combat.js';
import { parseIntent } from './intent.js';
import { runCommands } from './commands.js';
import { stealthEvents } from './checks.js';
import { extractReport, reportToEvents } from './delta.js';
import { truth, knows, perceivers, entityLabel, setFactEvents, PC_NAME_FACT, PC_LOOK_FACT } from './knowledge.js';
import { buildContext } from './context.js';
import { parseCoin } from './economy.js';
import { clone, hash32, normText, uniq } from './util.js';

export const ENGINE_VERSION = '2.0.0';

const GROUP_RE = /\b(?:everyone|everybody|all of you|you all|the (?:group|room|crowd|table|company))\b/i;
const SELF_INTRO_RE = /\b(?:my name(?:'s| is)|i am|i'm|call me|name's|they call me)\s+alaric\b/i;
const HOLD_RE = /\b(?:i\s+)?(?:wait|hold (?:my )?(?:position|ground|fire)|do nothing|pass (?:my )?turn|end (?:my )?turn|stay put)\b/i;
const TRADE_RE = /\b(?:buy|buys|bought|sell|sells|sold|pay|pays|paid|price|cost|costs|haggle|coin|coins|copper|silver|gold)\b/i;

// ------------------------------------------------------------------------------------------------ campaign start
/** Initial campaign events from content/campaign_start.json and the First Message's location line. */
export function startCampaign(content, { seed = newSeed(), firstMessage = '' } = {}) {
    const st = content.start;
    const m = /Location:\s*[^\n`]*?\boutside\s+([A-Z][\w' -]*?)\s*,\s*([A-Z][\w' -]*)/.exec(String(firstMessage));
    let loc = m ? locationByName(content, m[1].trim()) : null;
    if (!loc) loc = content.locations.get(st.start_locations[(seed >>> 0) % st.start_locations.length]);
    const p = st.pc;
    const sheet = {
        level: p.level, class: p.class, stats: { ...p.stats }, skills: {}, equipment: { ...p.equipment },
        inventory: { ...p.inventory }, coin_cp: p.coin_cp, xp: p.xp, free_points: p.free_points,
    };
    const dv = deriveCharacter(sheet, content);
    Object.assign(sheet, { hp: dv.maxHp, mp: dv.maxMp, sta: dv.maxSta });
    const at = { turn: 0, minute: st.start_scene.clock_minutes };
    const pc = { id: 'pc', kind: 'pc', name: p.name, race: p.race, age: p.age, origin: p.origin, descriptors: p.descriptors.map((d) => d.toLowerCase()), status: 'alive', location: loc.id, sheet };
    const facts = [
        { id: PC_NAME_FACT, s: 'pc', p: 'name', o: p.name, visibility: 'public' },
        { id: PC_LOOK_FACT, s: 'pc', p: 'appearance', o: p.public_facts.join('; '), visibility: 'public' },
        ...st.initial_facts.map((f) => ({ id: `f.pc.${f.p}`, s: f.s, p: f.p, o: f.o, visibility: f.visibility })),
    ].map((f) => ({ ...f, since: at, until: null, importance: 0.9, hard: false, source: { kind: 'campaign_start' } }));
    const knowledge = facts.map((f) => ({ who: 'pc', about: f.id, stance: 'knows', source: 'self', ...at }));
    return [{
        t: 'campaign.started',
        d: {
            seed: seed >>> 0, minute: at.minute, entities: [pc], location: loc.id, place: `${st.start_scene.place.replace(/the city$/, loc.name)}`,
            facts, knowledge, campaign: content.manifest.id, content_version: content.manifest.version, engine_version: ENGINE_VERSION,
        },
    }];
}

// ------------------------------------------------------------------------------------------------ player turn
/**
 * Resolve the player's message. Deterministic for a given (state, input).
 * @returns {{events, outcome, command: null|{panels, llm}, intent, situations, state}}
 */
export function playerTurn(state, content, input, { msg = null } = {}) {
    if (!state.meta.started) throw new Error('campaign not started');
    const s = clone(state);
    const dice = Dice.from(s);
    const events = [];
    const emit = (e) => {
        if (dice.n !== s.rng.n) e.rng_to = dice.n;
        applyEvent(s, e);
        events.push(e);
    };
    const text = String(input ?? '');
    const intent = parseIntent(text, s, content);
    if (intent.kind === 'command') {
        const r = runCommands(s, content, text);
        for (const e of r.events) emit(e);
        return { events, outcome: null, command: { panels: r.panels, llm: r.llm }, intent, situations: [], state: s };
    }
    emit({ t: 'turn.begun', d: { turn: s.turn + 1, input_hash: hash32(text), input: text.slice(0, 240) } });
    const situations = [];
    let outcome;
    if (s.entities.pc.status === 'dead') {
        outcome = { kind: 'note', text: 'Alaric is dead (0 HP). The campaign has ended; nothing further is resolved. (Swipe/delete messages to revise the last turn.)' };
    } else if (s.mode === 'creation') {
        outcome = creationTurn(s, content, intent, emit);
    } else {
        outcome = storyTurn(s, content, text, intent, dice, emit, situations);
    }
    if (TRADE_RE.test(text) && s.mode !== 'creation') situations.push('trade');
    emit({ t: 'outcome.recorded', d: { outcome, situations } });
    return { events, outcome, command: null, intent, situations, state: s };
}

function creationTurn(s, content, intent, emit) {
    if (intent.kind === 'creation.class') {
        const r = selectClass(s, content, intent.class);
        if (r.errors) return { kind: 'creation.invalid', reason: r.errors.join(' ') };
        r.events.forEach(emit);
        return r.outcome;
    }
    if (intent.kind === 'creation.skills') {
        const r = selectSkills(s, content, intent.skills);
        if (r.errors) return { kind: 'creation.invalid', reason: r.errors.join(' ') };
        r.events.forEach(emit);
        return r.outcome;
    }
    return { kind: 'creation.invalid', reason: intent.reason || 'not a creation choice' };
}

function storyTurn(s, content, text, intent, dice, emit, situations) {
    const pcAction = pcActionOf(s, intent, text);
    // 1) an NPC commitment reported last turn resolves first; player input cannot erase it (Core #23 PENDING)
    const committed = (s.pending_combat || []).map((p) => p.by).filter((by) => s.entities[by] && s.entities[by].status !== 'dead' && s.scene.present.includes(by));
    if ((s.pending_combat || []).length) emit({ t: 'combat.pending_cleared', d: {} });
    if (committed.length) {
        return combatTurn(s, content, dice, emit, { trigger: { actor: committed[0], target: 'pc' }, committed, pcAction: pcAction?.kind ? pcAction : null }, situations);
    }
    // 2) combat: an ACTIVE encounter continues; a declared attack starts one
    if (s.encounter) {
        if (pcAction?.note) return { kind: 'combat', records: [], note: pcAction.note, next: "Alaric's Turn" };
        return combatTurn(s, content, dice, emit, { pcAction }, situations);
    }
    if (pcAction?.note) return { kind: 'note', text: pcAction.note };
    if (pcAction?.kind === 'attack') {
        return combatTurn(s, content, dice, emit, { trigger: { actor: 'pc', target: pcAction.target, skill: pcAction.skill, move: pcAction.move }, pcAction: null }, situations);
    }
    // 3) declared stealth: opposed check (or automatic with nobody around)
    if (intent.kind === 'stealth') {
        const r = stealthEvents(s, content, dice);
        r.events.forEach(emit);
        situations.push('stealth');
        return { kind: 'check', check: r.check };
    }
    // 4) ordinary story turn: one pre-committed CHECK DIE the narrator may use for a Core #7 check
    return { kind: 'narrative', check_die: dice.d100('check die'), flags: intent.flags || {} };
}

/** Map the parsed intent to a combat action, or a note when the declared action cannot be resolved. */
function pcActionOf(s, intent, text) {
    const name = (id) => entityLabel(s, id);
    switch (intent.kind) {
        case 'attack': return { kind: 'attack', skill: intent.skill, target: intent.target, move: intent.move };
        case 'skill': return { kind: 'skill', skill: intent.skill, dir: intent.dir, target: intent.target };
        case 'move': return { kind: 'move', dir: intent.dir, target: intent.target };
        case 'flee': return { kind: 'flee' };
        case 'ambiguous_target': return { note: `Alaric's attack needs a target: ${intent.candidates.map(name).join(' or ')}. Nothing was spent or rolled; ask which one (Core #23: never choose among several targets for him).` };
        case 'unknown_skill': return { note: `Alaric does not know ${intent.name}. Nothing was spent or rolled.` };
        case 'no_target': return { note: 'There is no valid target for an attack here. Nothing was spent or rolled.' };
        default:
            if (s.encounter && HOLD_RE.test(text)) return { kind: 'hold' };
            return null;
    }
}

// ------------------------------------------------------------------------------------------------ combat
/**
 * Who fights: only actual commitment — the target Alaric attacks, and every NPC/creature the narrator reported as
 * committing to an attack. Bystanders are never combatants because of attitude or kinship; if they join later, the
 * narrator reports their commitment and they are inserted into the fixed Turn Order.
 */
function combatants(s, leadId, committed = []) {
    return uniq([leadId, ...committed]).filter((id) => s.entities[id] && s.entities[id].status !== 'dead');
}

/** Give an NPC/creature its locked combat profile once (Content #7 anchors / proposed human templates). */
const FAMILY_CLASS = { bow: 'ranger', focus: 'mage', precision: 'duelist', heavy_melee: 'guardian', melee: 'warrior' };

function materialise(s, content, dice, emit, id) {
    const e = s.entities[id];
    if (e.sheet || e.profile) return;
    if (e.kind === 'creature') {
        const anchor = content.anchors.get(e.anchor) || anchorFor(content, [e.species, ...(e.descriptors || [])].join(' '));
        const area = truth(s, s.scene.location, 'danger')[0]?.o || 'unknown';
        const level = e.level || chooseCreatureLevel(area, content, dice);
        emit({ t: 'entity.updated', d: { id, set: { profile: scaleCreature(anchor, level, e.type || 'normal', content) } } });
        return;
    }
    const words = [...(e.descriptors || []), e.traits || ''].join(' ');
    let tpl = content.templates.get(e.template) || templateFor(content, words) || content.templates.get('commoner');
    const overrides = {};
    if (e.level) overrides.level = e.level;
    if (tpl.gear_from_starter_kit) {
        // an adventurer's Class follows what the narration shows: a named weapon, else a class word ("archer" = ranger)
        const byWord = normText(words).split(' ').map((w) => (w === 'archer' ? 'ranger' : w)).find((w) => content.classes.has(w));
        const cls = content.classes.get(e.class) || content.classes.get(FAMILY_CLASS[weaponFamily(content, words)]) || content.classes.get(byWord) || content.classes.get('warrior');
        const kit = content.kits[cls.id].map((i) => content.items.get(i));
        const w = kit.find((i) => i.slot === 'weapon');
        const a = kit.find((i) => i.slot === 'armor');
        overrides.class = cls.id;
        overrides.weapon = { name: w.name, family: w.family, atk: w.atk || 0, matk: w.matk || 0 };
        overrides.armor = a ? { name: a.name, def: a.def || 0, mdef: a.mdef || 0 } : null;
        tpl = { ...tpl, skills: cls.skill_pool.slice(0, 2) };
    }
    const sheet = humanSheet(tpl, overrides, content);
    sheet.generated.temperament = tpl.temperament;
    // kit containers (quiver) fill the inventory: an NPC archer carries real, finite arrows like Alaric
    if (tpl.gear_from_starter_kit) for (const i of content.kits[overrides.class].map((x) => content.items.get(x))) for (const [item, qty] of Object.entries(i?.contains || {})) sheet.inventory[item] = (sheet.inventory[item] || 0) + qty;
    emit({ t: 'entity.sheet_set', d: { id, sheet } });
}

/**
 * One combat step for this player message: start (PC attack or pending NPC commitment), let a new attacker join,
 * run NPC Turns until Alaric's Turn / terminal state, and emit every resulting state change as events.
 */
function combatTurn(s, content, dice, emit, { trigger = null, pcAction = null, committed = [] }, situations) {
    let started = null;
    let enc;
    if (!s.encounter) {
        const lead = trigger.actor === 'pc' ? trigger.target : trigger.actor;
        const ids = combatants(s, lead, committed);
        // legality first: an attack that is impossible from the start begins nothing and costs nothing (Core #24)
        if (trigger.actor === 'pc') {
            const trial = clone(s);
            const tdice = new Dice(dice.seed, dice.n);
            for (const id of ids) materialise(trial, content, tdice, (e) => applyEvent(trial, e), id);
            const tenc = initEncounter(trial, content, tdice, trigger, ids.map((id) => ({ id, side: 'hostile' })), 'trial');
            const tr = runCombat({ enc: tenc, content, dice: tdice, state: trial }, null);
            if (tr.stopped === 'illegal' && !tr.records.length) return { kind: 'combat', records: [], illegal: tr.illegal, not_started: true };
        }
        for (const id of ids) materialise(s, content, dice, emit, id);
        enc = initEncounter(s, content, dice, trigger, ids.map((id) => ({ id, side: 'hostile' })), `enc.t${s.turn}`);
        Object.assign(enc.intents, s.pending_intents || {});
        started = { reason: enc.ambush_reason, order: enc.order.map((id) => entityLabel(s, id)).join(' > '), ambush: enc.ambush };
    } else {
        enc = clone(s.encounter);
        const joiners = committed.filter((id) => !enc.combatants[id]);
        for (const id of joiners) {
            materialise(s, content, dice, emit, id);
            addCombatant(enc, s, content, id, 'hostile', 'attack');
        }
        if (joiners.length) started = { reason: `${joiners.map((id) => entityLabel(s, id)).join(', ')} ${joiners.length > 1 ? 'join' : 'joins'} the fight`, order: enc.order.map((id) => entityLabel(s, id)).join(' > '), joined: joiners };
        if (pcAction?.kind === 'attack' && pcAction.target && !enc.combatants[pcAction.target]) {
            materialise(s, content, dice, emit, pcAction.target);
            addCombatant(enc, s, content, pcAction.target, 'hostile', null);
        }
    }
    const res = runCombat({ enc, content, dice, state: s }, pcAction);
    if (enc.log.length > 20) enc.log = enc.log.slice(-20);
    const outcome = { kind: 'combat', started, records: res.records, illegal: res.illegal || null, next: null };
    emit({ t: started && !s.encounter ? 'encounter.started' : 'encounter.updated', d: { encounter: enc } });
    for (const id of Object.keys(enc.combatants)) if (id !== 'pc' && s.scene.awareness[id] !== 'aware') emit({ t: 'scene.awareness', d: { id, level: 'aware' } });
    // mirror the PC's resources and every sheet-bearer's ammunition into the sheet (the snapshot stays authoritative for NPCs)
    const pcC = enc.combatants.pc;
    for (const r of ['hp', 'mp', 'sta']) if (pcC.current[r] !== s.entities.pc.sheet[r]) emit({ t: 'resource.changed', d: { id: 'pc', resource: r, value: pcC.current[r] } });
    for (const r of res.records) if (r.ammo && s.entities[r.actor]?.sheet) emit({ t: 'item.changed', d: { id: r.actor, item: r.ammo.item, qty: -r.ammo.used, why: r.skill_name } });
    // deaths are world truth (hard facts) witnessed by everyone present who noticed the fight (not the unaware)
    for (const c of Object.values(enc.combatants)) {
        if (c.current.hp === 0 && s.entities[c.id].status !== 'dead') {
            emit({ t: 'entity.status', d: { id: c.id, status: 'dead' } });
            setFactEvents(s, { id: `f.${c.id}.status.t${s.turn}`, s: c.id, p: 'status', o: 'dead', hard: true, importance: 0.9, source: { kind: 'engine', encounter: enc.id } }).forEach(emit);
            const deathFact = truth(s, c.id, 'status')[0];
            for (const w of perceivers(s)) if (w !== c.id && deathFact && s.scene.awareness[w] !== 'unaware') emit({ t: 'knowledge.gained', d: { who: w, about: deathFact.id, stance: 'knows', source: 'witnessed', turn: s.turn, minute: s.clock.minute } });
        }
    }
    if (terminal(enc)) {
        const end = endEncounterEvents(s, content, enc);
        const levelups = end.events.filter((e) => e.t === 'level.up').map((e) => `Level ${e.d.level}`);
        end.events.forEach(emit);
        // write the survivors' condition back to their persistent profiles/sheets and positions
        for (const c of Object.values(enc.combatants)) {
            if (c.id === 'pc' || s.entities[c.id].status === 'dead') continue;
            const e = s.entities[c.id];
            if (e.sheet) for (const r of ['hp', 'mp', 'sta']) { if (c.current[r] !== undefined && c.current[r] !== e.sheet[r]) emit({ t: 'resource.changed', d: { id: c.id, resource: r, value: c.current[r] } }); }
            else if (e.profile && c.current.hp !== e.profile.hp) emit({ t: 'entity.updated', d: { id: c.id, set: { profile: { ...e.profile, hp: c.current.hp } } } });
            if (c.current.escaped) emit({ t: 'scene.left', d: { id: c.id } });
            else if (s.scene.present.includes(c.id)) emit({ t: 'scene.position', d: { id: c.id, band: c.current.band, cover: c.current.cover } });
            if (c.current.surrendered) emit({ t: 'entity.updated', d: { id: c.id, set: { surrendered_to: 'pc' } } });
        }
        emit({ t: 'memory.recorded', d: { memory: fightMemory(s, content, enc, end.summary) } });
        outcome.ended = end.summary;
        outcome.levelups = levelups;
        situations.push('loot');
    } else {
        outcome.next = `Alaric's Turn (Round ${enc.round})`;
    }
    return outcome;
}

function fightMemory(s, content, enc, summary) {
    const foes = Object.values(enc.combatants).filter((c) => c.id !== 'pc');
    const fate = (c) => (s.entities[c.id].status === 'dead' ? 'killed' : c.current.escaped ? 'fled' : c.current.surrendered ? 'surrendered' : 'survived');
    const skills = uniq(enc.log.filter((r) => r.actor === 'pc' && r.skill_name).map((r) => r.skill_name));
    const text = `Fight at ${s.scene.place || entityLabel(s, s.scene.location)}: {pc}${skills.length ? ` (${skills.join(', ')})` : ''} vs ${foes.map((c) => `${entityLabel(s, c.id)} — ${fate(c)}`).join('; ')}${summary.pc_dead ? '; {pc} died' : ''}.`;
    const witnesses = uniq([...perceivers(s).filter((id) => s.scene.awareness[id] !== 'unaware'), ...foes.filter((c) => s.entities[c.id].status !== 'dead').map((c) => c.id)]);
    return {
        id: `m.${enc.id}`, turn: s.turn, minute: s.clock.minute, text, who: ['pc', ...foes.map((c) => c.id)], witnesses,
        seen: s.scene.concealed.includes('pc') ? ['pc'] : witnesses.slice(), location: s.scene.location, place: s.scene.place,
        importance: 7, kind: 'combat',
    };
}

// ------------------------------------------------------------------------------------------------ narrator reply
/**
 * Validate the narrator's reply: fact report -> events, perception (who has now seen Alaric), an episodic trace of
 * the turn, and tracker drift detection (numbers in the reply that contradict the engine -> corrections).
 */
export function narratorReply(state, content, replyText, { msg = null } = {}) {
    const s = clone(state);
    const events = [];
    const emit = (e) => { applyEvent(s, e); events.push(e); };
    const { clean, report, error } = extractReport(replyText);
    const res = reportToEvents(report, s, content, { msg });
    res.events.forEach(emit);
    for (const r of res.rejected) emit({ t: 'delta.rejected', d: r });
    if (s.mode !== 'creation' && s.meta.started && !String(s.last.outcome?.kind || '').startsWith('creation')) {
        // perception: an NPC that can see Alaric now knows his appearance and remembers the first sight of him
        for (const id of perceivers(s)) {
            if (id === 'pc' || s.entities[id].kind !== 'npc' || s.scene.concealed.includes('pc') || knows(s, id, PC_LOOK_FACT)) continue;
            if (s.scene.awareness[id] === 'unaware') continue; // present but has not noticed him
            emit({ t: 'knowledge.gained', d: { who: id, about: PC_LOOK_FACT, stance: 'knows', source: 'witnessed', turn: s.turn, minute: s.clock.minute } });
            emit({ t: 'memory.recorded', d: { memory: {
                id: `m.t${s.turn}.seen.${id}`, turn: s.turn, minute: s.clock.minute, text: `first saw {pc} at ${s.scene.place || entityLabel(s, s.scene.location)}`,
                who: [id, 'pc'], witnesses: [id], seen: [id], location: s.scene.location, place: s.scene.place, importance: 4, kind: 'meeting',
            } } });
        }
        // speech: introducing himself by name tells every NPC present at the end of the turn (including people the
        // reply just introduced) that can see him — knowledge by perception, not by the narrator's say-so
        if (SELF_INTRO_RE.test(s.last.input || '') && !s.scene.concealed.includes('pc')) {
            // only those he speaks to hear his name: NPCs named in the message, or the only NPC who notices him
            const listeners = perceivers(s).filter((id) => id !== 'pc' && s.entities[id].kind === 'npc' && s.scene.awareness[id] !== 'unaware');
            const addressed = listeners.filter((id) => [s.entities[id].name, ...(s.entities[id].descriptors || [])].filter(Boolean).some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s.last.input)));
            const toAll = GROUP_RE.test(s.last.input) || listeners.length === 1;
            for (const id of addressed.length ? addressed : toAll ? listeners : []) {
                if (knows(s, id, PC_NAME_FACT)) continue;
                emit({ t: 'knowledge.gained', d: { who: id, about: PC_NAME_FACT, stance: 'knows', source: 'told:pc', turn: s.turn, minute: s.clock.minute } });
            }
        }
        const ep = episode(s, msg);
        if (ep) emit({ t: 'memory.recorded', d: { memory: ep } });
    }
    const corrections = [...res.corrections, ...trackerDrift(s, content, clean)];
    for (const r of res.rejected) corrections.push(`Rejected from your fact report: ${r.reason}.`);
    if (!report) corrections.push(`Your previous reply had no valid <avereth> fact report (${error}). Append it at the very end, {} if nothing changed.`);
    return { events, clean, report, accepted: res.accepted, rejected: res.rejected, corrections, report_error: report ? null : error, state: s };
}

/**
 * Verbatim trace of the player's action (research: verbatim text beats extracted artifacts). It is Alaric's own
 * record only — the player's words describe intentions NPCs did not perceive; NPC memories come from narration
 * reports, first sight and fights. The people present are kept in `about` so retrieval can find the episode.
 */
function episode(s, msg) {
    const input = s.last.input;
    if (!input || s.encounter || s.last.outcome?.kind === 'combat') return null;
    const others = s.scene.present.filter((id) => id !== 'pc' && s.entities[id] && s.entities[id].status !== 'dead');
    return {
        id: `m.t${s.turn}${msg !== null ? `.m${msg}` : ''}.ep`, turn: s.turn, minute: s.clock.minute,
        text: `${s.scene.place || entityLabel(s, s.scene.location)}: {pc}: "${input.replace(/\s+/g, ' ').slice(0, 160)}"`,
        who: ['pc'], about: others, witnesses: ['pc'], seen: ['pc'], location: s.scene.location,
        place: s.scene.place, importance: others.length ? 3 : 2, kind: 'episode', msg,
    };
}

/** Numbers about Alaric in the reply that contradict the engine (Testrun-v1: "Init 8", missing Coin, arrow drift). */
export function trackerDrift(s, content, text) {
    const out = [];
    const pc = s.entities.pc;
    if (!pc?.sheet) return out;
    const sh = pc.sheet;
    const dv = deriveCharacter(sh, content);
    const others = s.scene.present.filter((id) => id !== 'pc').flatMap((id) => [s.entities[id]?.name, ...(s.entities[id]?.descriptors || [])]).filter(Boolean).map(normText);
    const lines = String(text).split(/\n/).filter((l) => !others.some((o) => normText(l).includes(o)));
    const seen = new Set();
    const flag = (field, shown, value, why = '') => {
        if (seen.has(field) || Number(shown) === value) return;
        seen.add(field);
        out.push(`Tracker drift: ${field} shown as ${shown}, engine value is ${value}${why}. Use the engine value.`);
    };
    for (const l of lines) {
        let m;
        if ((m = /\bInit(?:iative)?\s*[:=]?\s*(\d+)/i.exec(l))) flag('Initiative', m[1], dv.init, ` (AGI ${sh.stats.AGI} + floor(PER ${sh.stats.PER}/2))`);
        if ((m = /\bHP\s*[:=]?\s*(\d+)\s*\/\s*(\d+)/i.exec(l)) && Number(m[2]) === dv.maxHp) flag('HP', m[1], sh.hp);
        if ((m = /\bSTA\s*[:=]?\s*(\d+)\s*\/\s*(\d+)/i.exec(l)) && Number(m[2]) === dv.maxSta) flag('STA', m[1], sh.sta);
        if ((m = /\bMP\s*[:=]?\s*(\d+)\s*\/\s*(\d+)/i.exec(l)) && Number(m[2]) === dv.maxMp) flag('MP', m[1], sh.mp);
        if ((m = /\bXP\s*[:=]?\s*(\d+)\s*\/\s*(\d+)/i.exec(l))) flag('XP', m[1], sh.xp);
        if (sh.inventory.standard_arrow !== undefined && ((m = /\b(\d+)\s+(?:Standard\s+)?Arrows?\b/i.exec(l)) || (m = /\bArrows?\s*[:=(]\s*(\d+)/i.exec(l)))) flag('Arrows', m[1], sh.inventory.standard_arrow);
        if ((m = /\bCoin\s*[:=]\s*([^|\n]+)/i.exec(l))) {
            const cp = parseCoin(m[1], content);
            if (cp !== null && cp !== sh.coin_cp) flag('Coin (Copper)', cp, sh.coin_cp);
        }
    }
    return out;
}

// ------------------------------------------------------------------------------------------------ context
/**
 * The prompt block for the upcoming generation. outcome defaults to the one recorded for this turn.
 * opts: {input, corrections, budget, lastReply, systemQuery}
 */
export function turnContext(state, content, opts = {}) {
    const outcome = opts.outcome !== undefined ? opts.outcome : state.last.outcome;
    const situations = opts.situations || state.last.situations || [];
    return buildContext(state, content, { ...opts, outcome, situations });
}

/** Fold a list of per-message event arrays into the campaign state. */
export function foldChat(eventLists) {
    return fold(eventLists.flat());
}
