// Campaign state = fold(events). Event-sourced: the event log is the only persistent truth; this reducer derives
// the current state. The reducer is deterministic and never rolls dice (rolls are already inside the events).
//
// State layout (see docs/DATENMODELL.md):
//   entities  – PC, NPCs, creatures, locations, factions (World Truth about identities and status)
//   facts     – temporal world facts {s,p,o, since, until, visibility}; ended facts stay for history (never deleted)
//   claims    – propositions people may believe (true or false)
//   knowledge – per entity: what it knows/believes and from which source (Character Knowledge / Belief)
//   memories  – episodic memories with participants + witnesses (Character Memory is witness-scoped)
//   relations – graph edges (attitude, membership, ownership, ...) with history
//   quests, threads, scene, encounter, clock, rng
//   places, objects, offers, guild, decisions, services – Runtime V4 domains (src/v4/domain.js); empty in a V3 campaign
import { clone, uniq } from './util.js';
import { emptyDomains, applyDomainEvent, V4_EVENTS } from './v4/domain.js';
import { applyGrowthEvent } from './v4/growth.js';

export const STATE_VERSION = 3;

export function emptyState() {
    return {
        v: STATE_VERSION,
        meta: { started: false },
        rng: { seed: 0, n: 0 },
        clock: { minute: 0 },
        turn: 0,
        seq: 0,
        mode: 'setup',
        creation: { step: 0, class: null, skills: [] },
        entities: {},
        scene: { location: null, place: '', at: null, present: [], positions: {}, awareness: {}, concealed: [] },
        encounter: null,
        facts: {},
        claims: {},
        knowledge: {},
        memories: [],
        relations: {},
        quests: {},
        threads: {},
        last: { outcome: null, rejected: [], check: null, input: null, situations: [] },
        inputs: [], // the player's recent messages {turn, input}: a decision whose reply missed it can still be recorded
        pending_combat: [], // NPC commitments reported by the narrator (Core #23 PENDING), resolved next turn
        pending_intents: {},
        skill_defs: {}, // Patch 9B-1: the campaign's dynamic Skill definitions (skill.defined), fixed once defined
        passive_defs: {}, // Patch 9B-2: the campaign's dynamic Passive definitions (passive.defined)
        ...emptyDomains(),
    };
}

/** Fold events onto a base state (the base is cloned once; events are applied in place for speed). */
export function fold(events, base = emptyState()) {
    const state = clone(base);
    for (const e of events) applyEvent(state, e);
    return state;
}

function ensureKnowledge(state, who) {
    if (!state.knowledge[who]) state.knowledge[who] = {};
    return state.knowledge[who];
}

function nextId(state, prefix) {
    state.seq += 1;
    return `${prefix}${state.seq}`;
}

function pcOf(state) {
    return state.entities.pc;
}

function sheetOf(state, id) {
    const e = state.entities[id];
    if (!e || !e.sheet) throw new Error(`entity ${id} has no character sheet`);
    return e.sheet;
}

function addItem(sheet, item, qty) {
    sheet.inventory[item] = (sheet.inventory[item] || 0) + qty;
    if (sheet.inventory[item] <= 0) delete sheet.inventory[item];
}

/** Apply one event in place. Unknown event types throw (schema drift must be loud). */
export function applyEvent(state, e) {
    const d = e.d || {};
    switch (e.t) {
        // ------------------------------------------------------------------ campaign / creation
        case 'campaign.started': {
            // runtime: 'v4' for a campaign started under Runtime V4 (its story turns go through the interpreter and the
            // extractor); a campaign without it is a V3 campaign and stays one
            // Patch 9A: ruleset, the rules it plays by (src/content.js rulesetOf); a campaign started before has none: 1
            state.meta = { started: true, campaign: d.campaign, content_version: d.content_version, runtime: d.runtime || 'v3', ruleset: d.ruleset || 1 };
            state.rng = { seed: d.seed >>> 0, n: 0 };
            state.clock.minute = d.minute;
            state.mode = 'creation';
            state.creation = { step: 1, class: null, skills: [] };
            for (const ent of d.entities) state.entities[ent.id] = clone(ent);
            state.scene = { location: d.location, place: d.place, at: d.at ?? null, present: ['pc'], positions: {}, awareness: {}, concealed: [] };
            for (const p of d.places || []) state.places[p.id] = clone(p);
            for (const f of d.facts || []) state.facts[f.id] = clone(f);
            for (const k of d.knowledge || []) ensureKnowledge(state, k.who)[k.about] = clone(k);
            break;
        }
        case 'creation.class_selected': {
            const s = sheetOf(state, 'pc');
            s.class = d.class;
            for (const stat of d.favored) s.stats[stat] += 1;
            s.skills[d.basic_attack] = { prof: 1, pp: 0 };
            state.creation.class = d.class;
            state.creation.step = 2;
            break;
        }
        case 'creation.completed': {
            const s = sheetOf(state, 'pc');
            for (const id of d.skills) s.skills[id] = { prof: 1, pp: 0 };
            for (const [slot, ref] of Object.entries(d.equip)) s.equipment[slot] = clone(ref);
            for (const [item, qty] of Object.entries(d.items || {})) addItem(s, item, qty);
            s.hp = d.hp; s.mp = d.mp; s.sta = d.sta;
            state.creation = { step: 3, class: s.class, skills: d.skills.slice(), turn: state.turn };
            state.mode = 'story';
            break;
        }
        // ------------------------------------------------------------------ entities / scene / time
        case 'entity.created':
            if (state.entities[d.entity.id]) throw new Error(`entity exists: ${d.entity.id}`);
            state.entities[d.entity.id] = clone(d.entity);
            break;
        case 'entity.updated': {
            const ent = state.entities[d.id];
            if (!ent) throw new Error(`unknown entity ${d.id}`);
            for (const [k, v] of Object.entries(d.set || {})) {
                if (k === 'descriptors') ent.descriptors = uniq([...(ent.descriptors || []), ...v]);
                else ent[k] = clone(v);
            }
            break;
        }
        case 'entity.sheet_set': // full combat-profile materialisation for an NPC (npcgen)
            state.entities[d.id].sheet = clone(d.sheet);
            break;
        case 'scene.moved': {
            const from = state.scene.at;
            if (d.track_history && d.at !== undefined && d.at !== from && from) state.scene.history = [...(state.scene.history || []), from].slice(-16);
            state.scene.location = d.location ?? state.scene.location;
            state.scene.place = d.place ?? state.scene.place;
            if (d.at !== undefined) state.scene.at = d.at; // V4: the place node
            if (d.reset_present) {
                state.scene.present = ['pc'];
                state.scene.positions = {};
                state.scene.awareness = {};
                // A/V3 has no tactical-scene flags; do not add keys on the planner-off path.
                if (state.scene.relevant) state.scene.relevant = [];
                if (state.scene.threats) state.scene.threats = [];
                state.scene.concealed = [];
            }
            for (const id of state.scene.present) if (state.entities[id]) state.entities[id].location = state.scene.location;
            break;
        }
        case 'scene.entered':
            if (!state.scene.present.includes(d.id)) state.scene.present.push(d.id);
            if (d.band) state.scene.positions[d.id] = { band: d.band, cover: d.cover || 'none' };
            if (state.entities[d.id]) state.entities[d.id].location = state.scene.location;
            break;
        case 'scene.left':
            state.scene.present = state.scene.present.filter((x) => x !== d.id);
            if (state.scene.relevant) state.scene.relevant = state.scene.relevant.filter((x) => x !== d.id);
            if (state.scene.threats) state.scene.threats = state.scene.threats.filter((x) => x !== d.id);
            delete state.scene.positions[d.id];
            delete state.scene.awareness[d.id];
            break;
        // Prototype C: relevance and explicit threat are current-scene properties, not permanent
        // NPC identities/attitudes. A hostage may be relevant without being a hostile combatant.
        case 'scene.tactical': {
            for (const [key, enabled] of [['relevant', d.relevant], ['threats', d.threat]]) {
                const ids = new Set(state.scene[key] || []);
                if (enabled) ids.add(d.id);
                else ids.delete(d.id);
                state.scene[key] = [...ids];
            }
            break;
        }
        // the escort party bookmark of the 4.0.9 experiment: read and ignored, so its chats still fold (companions now
        // arrive with Alaric by arrive.with, src/v4/world.js)
        case 'journey.party':
            break;
        case 'scene.position':
            // Patch 7.1: the knot someone stands in stays theirs until the story sets another (or "apart": null)
            state.scene.positions[d.id] = { band: d.band, cover: d.cover || 'none', ...(d.cluster !== undefined ? { cluster: d.cluster } : Object.hasOwn(state.scene.positions[d.id] || {}, 'cluster') ? { cluster: state.scene.positions[d.id].cluster } : {}) };
            break;
        case 'scene.awareness':
            state.scene.awareness[d.id] = d.level;
            break;
        case 'scene.concealed':
            state.scene.concealed = d.ids.slice();
            break;
        case 'time.advanced':
            state.clock.minute += d.minutes;
            break;
        case 'turn.begun': {
            // carry: the player's messages whose replies had no fact report; the next report may still record what
            // they decided (their payments, hand-overs, accepted quests), see delta.js PLAYER OWNERSHIP
            const old = state.last || {};
            const carry = old.report_missing ? [...(old.carry || []), old.input].filter(Boolean).slice(-3) : [];
            state.turn = d.turn;
            state.last = { outcome: null, rejected: [], check: null, input: d.input ?? null, situations: [], carry };
            state.inputs = [...(state.inputs || []), { turn: d.turn, input: d.input ?? '' }].slice(-12);
            break;
        }
        case 'report.missing': // the narrator's reply to this turn had no (valid) fact report
            state.last.report_missing = true;
            break;
        case 'report.requested': // the missing report was asked for separately (host.js reportRequest); a record only
            break;
        // ------------------------------------------------------------------ character sheet deltas
        case 'resource.changed': {
            const s = sheetOf(state, d.id);
            s[d.resource] = d.value;
            // Patch 3 (review): a wound of Alaric's (fact scope.hurt, src/v4/world.js) is healed for good the moment his
            // HP reach the maximum it was told under; a later, unrelated hurt does not bring it back
            if (d.id === 'pc' && d.resource === 'hp') {
                for (const f of Object.values(state.facts)) {
                    if (f.scope?.hurt && !f.until && d.value >= f.scope.hurt) f.until = { turn: state.turn, minute: state.clock.minute };
                }
            }
            break;
        }
        case 'item.changed': {
            const s = sheetOf(state, d.id);
            addItem(s, d.item, d.qty);
            if (d.name) {
                if (!state.item_names) state.item_names = {};
                state.item_names[d.item] = d.name;
            }
            break;
        }
        case 'item.equipped': {
            const s = sheetOf(state, d.id);
            if (d.item === null) delete s.equipment[d.slot];
            else s.equipment[d.slot] = clone(d.item);
            break;
        }
        case 'coin.changed':
            sheetOf(state, d.id).coin_cp = d.value;
            break;
        case 'stat.assigned': {
            const s = sheetOf(state, d.id);
            s.stats[d.stat] += d.amount;
            s.free_points -= d.amount;
            break;
        }
        case 'xp.changed': {
            const s = sheetOf(state, d.id);
            s.xp = d.xp;
            break;
        }
        case 'level.up': {
            const s = sheetOf(state, d.id);
            s.level = d.level;
            s.free_points += d.free_points;
            for (const stat of d.favored) s.stats[stat] += 1;
            s.xp = d.xp_after;
            break;
        }
        case 'skill.learned':
            sheetOf(state, d.id).skills[d.skill] = { prof: d.prof ?? 1, pp: 0 };
            break;
        // Patch 9B-1: a dynamic Skill definition of this campaign (src/skills.js defineSkill validated it); defining is
        // not learning, and a definition never changes once it is booked
        case 'skill.defined': {
            if (!state.skill_defs) state.skill_defs = {};
            if (state.skill_defs[d.skill.id]) throw new Error(`skill defined twice: ${d.skill.id}`);
            state.skill_defs[d.skill.id] = clone(d.skill);
            break;
        }
        // Patch 9B-2: a dynamic Passive definition of this campaign (src/passives.js definePassive validated it); fixed
        // once booked, gained by no one by it
        case 'passive.defined': {
            if (!state.passive_defs) state.passive_defs = {};
            if (state.passive_defs[d.passive.id]) throw new Error(`passive defined twice: ${d.passive.id}`);
            state.passive_defs[d.passive.id] = clone(d.passive);
            break;
        }
        // Patch 9B-2: a person gains a defined Passive; the sheet keeps the fixed definition (src/derived.js reads it)
        case 'passive.gained': {
            const s = sheetOf(state, d.id);
            const p = state.passive_defs?.[d.passive];
            if (!p) throw new Error(`gain of an unknown passive ${d.passive}`);
            if (!s.passives) s.passives = {};
            if (s.passives[d.passive]) throw new Error(`passive gained twice: ${d.passive}`);
            const { id, name, scope, condition, effects } = clone(p);
            s.passives[d.passive] = { id, name, scope, condition, effects };
            break;
        }
        // Patch 9B-1: Proficiency Progress of a known Skill (src/skills.js): the PP and Proficiency it stands at after it
        case 'skill.progress': {
            const s = sheetOf(state, d.id);
            if (!s.skills[d.skill]) throw new Error(`progress of an unknown skill ${d.skill}`);
            s.skills[d.skill] = { ...s.skills[d.skill], prof: d.to.prof, pp: d.to.pp };
            if (d.key) { if (!state.pp_keys) state.pp_keys = {}; state.pp_keys[d.key] = true; }
            break;
        }
        // Patch 9C-1: his learning goals and training (src/v4/growth.js): opened, a session, progress, closed
        case 'growth.opened': case 'growth.session': case 'growth.progress': case 'growth.closed':
            applyGrowthEvent(state, e);
            break;
        case 'entity.status':
            state.entities[d.id].status = d.status;
            if (d.status === 'dead' && state.entities[d.id].sheet) state.entities[d.id].sheet.hp = 0;
            break;
        // ------------------------------------------------------------------ encounter
        case 'encounter.started':
            state.encounter = clone(d.encounter);
            state.mode = 'combat';
            state.pending_intents = {}; // folded into the encounter's intents by the engine
            break;
        case 'encounter.updated': // full replacement after a resolution step (records carry the rolls)
            state.encounter = clone(d.encounter);
            break;
        case 'encounter.ended':
            state.encounter = null;
            state.mode = 'story';
            break;
        // ------------------------------------------------------------------ knowledge / memory / relations
        case 'fact.asserted':
            state.facts[d.fact.id] = clone(d.fact);
            break;
        case 'fact.ended':
            if (state.facts[d.id]) state.facts[d.id].until = clone(d.until);
            break;
        case 'claim.created':
            state.claims[d.claim.id] = clone(d.claim);
            break;
        case 'knowledge.gained': {
            const k = ensureKnowledge(state, d.who);
            const prev = k[d.about];
            k[d.about] = { ...clone(d), previous: prev ? { stance: prev.stance, source: prev.source, turn: prev.turn } : null };
            break;
        }
        case 'memory.recorded':
            state.memories.push(clone(d.memory));
            break;
        case 'relation.set':
            state.relations[d.rel.id] = clone(d.rel);
            break;
        case 'relation.changed': {
            const r = state.relations[d.id];
            if (!r) throw new Error(`unknown relation ${d.id}`);
            r.value = d.value;
            r.history.push({ turn: d.turn, minute: d.minute, delta: d.delta, why: d.why });
            break;
        }
        case 'quest.set':
            state.quests[d.quest.id] = clone(d.quest);
            break;
        case 'thread.set':
            state.threads[d.thread.id] = clone(d.thread);
            break;
        case 'combat.pending':
            state.pending_combat = [...(state.pending_combat || []).filter((p) => p.by !== d.by), clone(d)];
            break;
        case 'combat.pending_cleared':
            state.pending_combat = d.by ? (state.pending_combat || []).filter((p) => p.by !== d.by) : [];
            break;
        case 'combat.intent':
            if (state.encounter) state.encounter.intents[d.who] = d.intent;
            else {
                state.pending_intents = state.pending_intents || {};
                state.pending_intents[d.who] = d.intent;
            }
            break;
        // ------------------------------------------------------------------ audit only
        case 'outcome.recorded':
            state.last.outcome = clone(d.outcome);
            state.last.situations = (d.situations || []).slice();
            break;
        case 'delta.rejected':
            state.last.rejected.push(clone(d));
            break;
        case 'check.recorded':
            state.last.check = clone(d);
            // Patch 6: what he searched for where, so the same search is not rolled again (src/v4/features.js)
            if (d.search) state.searches = [...(state.searches || []), { at: d.at, focus: d.focus || [], tool: d.tool || null, success: d.success, turn: state.turn, minute: state.clock.minute, found: d.found || null, sig: d.sig ?? null }].slice(-40);
            break;
        case 'note':
            break;
        default:
            if (V4_EVENTS.has(e.t)) {
                applyDomainEvent(state, e);
                break;
            }
            throw new Error(`unknown event type: ${e.t}`);
    }
    if (typeof e.rng_to === 'number') state.rng.n = e.rng_to;
    if (typeof e.seq_to === 'number') state.seq = Math.max(state.seq, e.seq_to);
    return state;
}

export { nextId, pcOf, sheetOf, ensureKnowledge };
