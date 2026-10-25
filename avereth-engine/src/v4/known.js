// Known places (Patch 2, live run of 18.10.2026: the chartmaker's old Dungeon in the Weald was a fact, a memory and a
// thread, but no place; the player's "towards the Dungeon location from the map" had nothing to point at, and the
// valley he found was a new place beside it). A place someone tells of, a map shows or a rumour names gets a place id
// of its own, marked as known by report: who reported it, how, and where it is said to lie, in their words. It is a
// destination Alaric can choose and the extractor can name, never a confirmed part of the world: the report's details
// are the report's (not world facts), and the place is "visited" only when he arrives. A report the story shows wrong
// marks the place "false"; the world's facts stay untouched. Arriving at it, under whatever new words, is the same id.
import { normText } from '../util.js';

/** Statuses of a known place: by report, seen (he has been there), or the report proved wrong. */
export const KNOWN = { reported: 'reported', visited: 'visited', false: 'false' };

/** A place of this realm with this name (a reported one only, unless any will do). */
export function knownByName(s, name, realm, { reportedOnly = false } = {}) {
    const n = normText(name || '');
    if (!n) return null;
    // a true Dungeon is one place of its name in its realm, wherever a new mention puts it (review of Patch 7)
    return Object.values(s.places).find((p) => normText(p.name) === n && (p.realm ?? null) === (realm ?? null) && p.kind !== 'realm'
        && (!reportedOnly || p.known === KNOWN.reported || !!p.dungeon?.real)) || null;
}

/**
 * Apply a place.reported delta: {place: id | {new}, by?, how, where?, false?}. A new place is created as known by
 * report (resolvePlace with reported); a known one gets the report added. A place he has seen keeps its status (a
 * report does not unmake what he saw); "false" only for one he has not seen.
 * @returns {{id?: string, error?: string}}
 */
export function reportPlace(s, d, emit, { by = null, place }) {
    const ref = d.place;
    if (!ref) return { error: 'place.reported needs a place' };
    const r = place(ref);
    if (r.error) return r;
    const p = s.places[r.id];
    if (!p || p.kind === 'realm') return { error: 'a realm is no reported place' };
    const report = { by, how: d.how || 'told', where: d.where ? String(d.where).slice(0, 160) : null, turn: s.turn, minute: s.clock.minute };
    if (d.false === true) {
        if (p.known === KNOWN.reported) emit({ t: 'place.updated', d: { id: r.id, set: { known: KNOWN.false }, report: { ...report, how: 'disproved' } } });
        return { id: r.id };
    }
    // a place he has stood at (or one the world was built with) needs no report; a reported one collects its sources
    if (p.known === KNOWN.reported) emit({ t: 'place.updated', d: { id: r.id, set: {}, report } });
    return { id: r.id };
}

/**
 * The reported place this turn's GO set off for, when the extractor says he arrived there but describes it with new
 * words ({new: …}) or not at all: that place, by its id. Null otherwise.
 * @param {string|number} [seq] the GO whose expected answer this is (else any GO that arrived)
 */
export function reportedTarget(s, auth, expected, ref, seq = null, scene = null) {
    if (typeof ref === 'string') return null;
    const gos = (auth.gos || []).filter((g) => g.to && s.places[g.to]?.known === KNOWN.reported && (seq === null || String(g.seq) === String(seq)));
    const go = gos.find((g) => expected?.[String(g.seq)]?.arrived === true);
    if (!go) return null;
    // A separately stated actual scene distinguishes a stop from an alias for the goal.
    // Older reports without that context retain their existing destination identity.
    if (scene != null && scene !== 'here' && scene !== go.to) return null;
    return go.to;
}

/** The places of the reported kind on the way up from id (itself first). */
function reportedUp(s, id) {
    const out = [];
    for (let cur = id, i = 0; cur && s.places[cur] && i < 12; cur = s.places[cur].parent, i++) if (s.places[cur].known === KNOWN.reported) out.push(cur);
    return out;
}

/** Arriving at id: it, and a reported place it lies in, are seen now. */
export function visitEvents(s, id) {
    return reportedUp(s, id).map((p) => ({ t: 'place.updated', d: { id: p, set: { known: KNOWN.visited, visited: { turn: s.turn, minute: s.clock.minute } } } }));
}

/** "the old Dungeon (reported by the chartmaker: two days into the Weald)" for the catalog, the context and the HUD. */
export function knownNote(s, p, label = (id) => s.entities[id]?.name || s.entities[id]?.descriptors?.[0] || id) {
    if (!p?.known || p.known === KNOWN.visited) return '';
    const last = (p.reports || []).filter((r) => r.how !== 'disproved').at(-1);
    if (p.known === KNOWN.false) return 'reported, but the report proved false';
    const who = last?.by ? label(last.by) : null;
    const how = last?.how === 'map' ? 'on a map' : last?.how === 'rumor' ? 'by rumour' : last?.how === 'written' ? 'in writing' : 'told';
    return `known only by report (${[who ? `${how}, ${who}` : how, last?.where].filter(Boolean).join(': ')}); not seen yet`;
}

/** The reported places Alaric knows of (not proved false), newest report first. */
export function reportedPlaces(s) {
    return Object.values(s.places).filter((p) => p.known === KNOWN.reported)
        .sort((a, b) => ((b.reports || []).at(-1)?.minute ?? 0) - ((a.reports || []).at(-1)?.minute ?? 0));
}

/** The short form for a goal's line: "by report, not seen: two days south into the Weald…". */
export function knownShort(s, p) {
    if (!p?.known || p.known === KNOWN.visited) return '';
    if (p.known === KNOWN.false) return 'the report proved false';
    const where = (p.reports || []).filter((r) => r.how !== 'disproved').at(-1)?.where;
    return `by report, not seen${where ? `: ${where.length > 80 ? `${where.slice(0, 79)}…` : where}` : ''}`;
}
