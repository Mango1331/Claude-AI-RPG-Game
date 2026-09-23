// World Truth vs Character Knowledge vs Belief vs Memory.
//  * facts:     what IS true, with a validity window (since/until). Changes end the old fact (kept as history)
//               and assert a new one — the Graphiti/Zep "invalidate, don't delete" pattern.
//  * claims:    propositions a character can hold that may be FALSE (rumours, lies, mistakes).
//  * knowledge: per character, which fact/claim it knows or believes, from which source (witnessed / told:X /
//               rumor / inferred / public), with the predecessor stance kept (Talk of the Town belief facets).
//  * memories:  episodic records with participants and witnesses; a character only "remembers" what it witnessed
//               (Generative Agents: per-agent memory stream, perception-scoped).
// NPCs never read world truth directly: the context builder only shows them their own knowledge rows.
import { normText } from './util.js';

// Predicates are normalised so that "state"/"condition" and "status" are the same slot. FUNCTIONAL predicates hold
// one current value per subject (a new value ends the old one); all other predicates may hold several values.
const PRED_SYNONYMS = {
    state: 'status', condition: 'status', located_in: 'location', located_at: 'location', lives_in: 'residence',
    lives_at: 'residence', resides_in: 'residence', ruled_by: 'ruler', led_by: 'leader', owned_by: 'owner',
    called: 'name', named: 'name',
};
export const FUNCTIONAL = new Set(['status', 'location', 'residence', 'ruler', 'leader', 'owner', 'allegiance', 'occupation', 'name', 'title', 'price', 'danger', 'appearance']);
// Terminal states are HARD facts automatically: a destroyed city or a dead person only changes with a stated cause.
const TERMINAL_STATUS = /^(?:dead|destroyed|ruined|razed|burned|burnt|burned down|collapsed|sunk|annihilated|wiped out|obliterated)$/;

// Ids of the two PC identity facts created at campaign start (who has SEEN Alaric / who knows his NAME).
export const PC_NAME_FACT = 'f.pc.name';
export const PC_LOOK_FACT = 'f.pc.appearance';

export function normPredicate(p) {
    const k = normText(p).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    return PRED_SYNONYMS[k] || k;
}

export function isTerminalStatus(p, o) {
    return p === 'status' && TERMINAL_STATUS.test(normText(o));
}

export function currentFacts(state, filter = () => true) {
    return Object.values(state.facts).filter((f) => !f.until && filter(f));
}

/** Current value(s) of a predicate for a subject (world truth). */
export function truth(state, s, p) {
    return currentFacts(state, (f) => f.s === s && f.p === p);
}

/** Current status of an entity or location: the status fact if one exists, else the entity field, else 'exists'. */
export function statusOf(state, id) {
    const f = truth(state, id, 'status')[0];
    if (f) return f.o;
    return state.entities[id]?.status || 'exists';
}

/**
 * Events that record a fact. Functional predicates end the old current value (kept as history) before the new one
 * is asserted; non-functional predicates simply add a value. Re-asserting an existing value is a no-op.
 */
export function setFactEvents(state, { s, p, o, visibility = 'public', importance = 0.5, hard = false, source, id }) {
    const events = [];
    const at = { turn: state.turn, minute: state.clock.minute };
    const current = truth(state, s, p);
    if (current.some((f) => normText(f.o) === normText(o))) return [];
    if (FUNCTIONAL.has(p)) {
        for (const old of current) events.push({ t: 'fact.ended', d: { id: old.id, until: at, reason: `superseded by ${s} ${p} ${o}` } });
    }
    const fact = {
        id: id || `f.${slugPart(s)}.${slugPart(p)}.t${state.turn}`, s, p, o, since: at, until: null, visibility,
        importance, hard: !!hard || isTerminalStatus(p, o), source,
    };
    events.push({ t: 'fact.asserted', d: { fact } });
    return events;
}

function slugPart(x) {
    return normText(x).replace(/[^a-z0-9]+/g, '_').slice(0, 24);
}

/** What a character knows/believes (optionally only about given subjects). Returns resolved rows. */
export function knowledgeOf(state, who, subjects = null) {
    const rows = [];
    for (const [about, k] of Object.entries(state.knowledge[who] || {})) {
        const f = state.facts[about];
        const c = state.claims[about];
        const prop = f || c;
        if (!prop) continue;
        if (subjects && !subjects.includes(prop.s) && !subjects.includes(prop.o)) continue;
        rows.push({
            about, s: prop.s, p: prop.p, o: prop.o, stance: k.stance, source: k.source, turn: k.turn,
            minute: k.minute, is_fact: !!f, true: f ? true : c.truth === 'true', outdated: !!(f && f.until),
            visibility: prop.visibility || 'public',
        });
    }
    return rows;
}

export function knows(state, who, about) {
    return !!(state.knowledge[who] && state.knowledge[who][about]);
}

/** How a character can identify Alaric: by name, by sight (name unknown), or not at all. */
export function pcIdentityFor(state, who) {
    if (who === 'pc') return { level: 'self', label: state.entities.pc.name };
    if (knows(state, who, PC_NAME_FACT)) return { level: 'name', label: state.entities.pc.name };
    if (knows(state, who, PC_LOOK_FACT)) return { level: 'seen', label: 'the stranger' };
    return { level: 'unknown', label: 'someone unseen' };
}

/** Memories an entity can recall (it was a participant or witness). */
export function memoriesOf(state, who) {
    return state.memories.filter((m) => (m.who || []).includes(who) || (m.witnesses || []).includes(who));
}

/**
 * Memory text as a given viewer remembers it. Memory texts refer to the PC as "{pc}"; a viewer who never learned
 * Alaric's name or never saw him remembers "the stranger" / "someone unseen" instead (no knowledge leaks).
 * viewer = null renders the narrator's (objective) version.
 */
export function memoryText(state, m, viewer = null) {
    const name = state.entities.pc?.name || 'Alaric';
    if (!String(m.text).includes('{pc}')) return m.text;
    let label = name;
    if (viewer && viewer !== 'pc') {
        // only a viewer who SAW Alaric in this moment can attribute it to him (by name if it knows the name)
        const saw = m.seen ? m.seen.includes(viewer) : true;
        label = !saw ? 'someone unseen' : pcIdentityFor(state, viewer).level === 'name' ? name : 'the stranger';
    }
    return m.text.split('{pc}').join(label);
}

/** Present, perceiving entities (for witness sets). Unaware NPCs still perceive; the dead and the absent do not. */
export function perceivers(state) {
    return state.scene.present.filter((id) => state.entities[id] && state.entities[id].status !== 'dead');
}

export function entityLabel(state, id) {
    const e = state.entities[id];
    if (!e) return id;
    return e.name || (e.descriptors && e.descriptors[0] ? `the ${e.descriptors[0]}` : id);
}

/** Label for an entity id OR a content location/faction id (used when rendering facts). */
export function anyLabel(state, content, id) {
    if (state.entities[id]) return entityLabel(state, id);
    if (content) {
        const l = content.locations.get(id) || content.factions.get(id);
        if (l) return l.name;
    }
    return id;
}

/** Human-readable proposition "s p o" with entity names. */
export function propText(state, prop, content = null) {
    const s = anyLabel(state, content, prop.s);
    const o = anyLabel(state, content, prop.o);
    return `${s} ${String(prop.p).replace(/_/g, ' ')} ${o}`.trim();
}
