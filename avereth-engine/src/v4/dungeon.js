// Patch 7 (dungeon foundations): a ruin, a cave, a crypt or a tower that Alaric explores room by room is one place of
// the place tree (src/v4/domain.js), marked as a dungeon, and its rooms are the places below it. Belonging (the tree)
// is not the way between rooms: which room leads to which is a short list of the ways the story established or he
// walked (links), each with whether he knows it, which way it can be taken, and the obstacle that stands in it (a
// Patch 6 feature: the way is open once he got past it, made it harmless or it was destroyed).
//
//   places[id].dungeon  true on the dungeon itself (the outermost building or cave of the rooms)
//   places[id].level    a room's level, when known (1 the entry level, 2 one floor down, 0 one up)
//   places[id].visited  {turn, minute} when he first stood in a room of a dungeon
//   links      id -> {id, a, b, name, both, hidden, feature, dir: up|down|null (from a to b), since, found, by}
//
// The engine moves him between rooms only along ways he knows and can take (commands.js go, and every arrival the
// world applier books: src/v4/world.js); a room he has never seen is reached the first time by going on from where he
// is, and the way he took is kept. No map is generated: the dungeon is what the story established.
import { normText } from '../util.js';
import { lineage, placeName } from './domain.js';

const ROOM_KINDS = new Set(['site', 'interior']);
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'into', 'through', 'room', 'way', 'his', 'my', 'old', 'and', 'back', 'door', 'there', 'here']);
const words = (t) => [...new Set(normText(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)))];

/** The building or cave a place belongs to: the outermost of its chain of sites and rooms, or null. */
export function complexOf(s, id) {
    let top = null;
    for (let cur = id, i = 0; cur && s.places?.[cur] && i < 16; cur = s.places[cur].parent, i++) {
        if (!ROOM_KINDS.has(s.places[cur].kind)) break;
        top = cur;
    }
    return top;
}

/** The dungeon a place lies in (the dungeon itself, or one of its rooms), or null. */
export function dungeonOf(s, id) {
    return lineage(s, id).find((x) => s.places[x].dungeon) || null;
}

/** A room of a dungeon (a place below it, not the dungeon itself). */
export function isRoom(s, id) {
    const d = dungeonOf(s, id);
    return !!d && d !== id;
}

/** The rooms of a dungeon. */
export const roomsOf = (s, d) => Object.values(s.places || {}).filter((p) => p.id !== d && dungeonOf(s, p.id) === d);

/** The ways at a place (hidden ones only when asked: the narrator's and the extractor's, never the player's). */
export function linksAt(s, id, { hidden = false } = {}) {
    return Object.values(s.links || {}).filter((l) => (l.a === id || l.b === id) && (hidden || !l.hidden));
}
export const otherEnd = (l, id) => (l.a === id ? l.b : l.a);
/** Can this way be taken from this end (a one-way drop only from its top)? */
export const goesFrom = (l, from) => l.a === from || (l.both && l.b === from);
export const linkBetween = (s, a, b) => Object.values(s.links || {}).find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a)) || null;
/** The obstacle that stands in a way while it stands (a locked door not yet opened), else null. */
export function blockerOf(s, l) {
    const f = l?.feature ? s.features?.[l.feature] : null;
    return f && f.status === 'active' ? f : null;
}
/** The direction of a way taken from this end ("down" taken back up is "up"). */
export const dirFrom = (l, from) => (!l.dir ? null : l.a === from ? l.dir : l.dir === 'down' ? 'up' : 'down');

/** Has he stood there (a room of a dungeon, or a place he knows by report and has seen)? */
export const visited = (s, id) => !!(s.places?.[id]?.visited || s.places?.[id]?.known === 'visited');

/**
 * Does Alaric know this room? He stood in it, knows it by report, or it lies at the end of a way he knows from a room
 * he stood in (or from the dungeon's way in). Not merely because it lies in the same dungeon.
 */
export function roomKnown(s, id) {
    const p = s.places?.[id];
    if (!p) return false;
    const d = dungeonOf(s, id);
    if (!d || d === id || visited(s, id) || p.known === 'reported') return true;
    return linksAt(s, id).some((l) => { const o = otherEnd(l, id); return o === d || visited(s, o); });
}

/** The living creatures he left in a room (Patch 5 entity.left): a known danger on the way through it. */
function dangerAt(s, id) {
    return Object.values(s.entities || {}).filter((e) => e.kind === 'creature' && e.status !== 'dead' && e.threat !== false && e.left?.at === id && !s.scene.present.includes(e.id));
}

/**
 * The way he knows from a to b inside one dungeon: through ways he knows and can take from their end, past no
 * standing obstacle, and through rooms he has stood in (never through one he has not seen). Breadth first over the
 * few ways of a dungeon: no geography.
 * @returns {{path: string[]}|{blocked: {link: object, feature: object}}|{danger: {at: string, who: object[]}}|{none: true}}
 */
function leg(s, a, b, d) {
    if (a === b) return { path: [a], ways: [] };
    const search = (open) => {
        const prev = new Map([[a, null]]);
        const queue = [a];
        while (queue.length) {
            const cur = queue.shift();
            for (const l of linksAt(s, cur)) {
                if (!goesFrom(l, cur)) continue;
                const nxt = otherEnd(l, cur);
                if (prev.has(nxt) || !s.places[nxt]) continue;
                if (!open && blockerOf(s, l)) continue;
                if (nxt !== b && nxt !== d && !visited(s, nxt)) continue;
                prev.set(nxt, { from: cur, link: l });
                if (nxt === b) {
                    const path = [b];
                    const ways = [];
                    for (let x = prev.get(b); x; x = prev.get(x.from)) { path.unshift(x.from); ways.unshift(x.link); }
                    return { path, ways };
                }
                queue.push(nxt);
            }
        }
        return null;
    };
    const found = search(false);
    if (found) {
        const stop = found.path.slice(1, -1).find((x) => dangerAt(s, x).length);
        return stop ? { danger: { at: stop, who: dangerAt(s, stop) } } : found;
    }
    const past = search(true);
    const stuck = past?.ways.find((l) => blockerOf(s, l));
    return stuck ? { blocked: { link: stuck, feature: blockerOf(s, stuck) } } : { none: true };
}

/**
 * The way he knows from one place to another where either lies in a dungeon (out of one to its way in, across the
 * land between as before, into another from its way in). Outside dungeons every way is free (Patch 5 journeys).
 * @returns {{path: string[], ways: object[]}|{blocked}|{danger}|{none}}
 */
export function wayBetween(s, from, to) {
    const dFrom = dungeonOf(s, from);
    const dTo = dungeonOf(s, to);
    if (!dFrom && !dTo) return { path: [from, to], ways: [] };
    if (dFrom && dFrom === dTo) return leg(s, from, to, dFrom);
    const out = dFrom ? leg(s, from, dFrom, dFrom) : { path: [from], ways: [] };
    if (!out.path) return out;
    const inn = dTo ? leg(s, dTo, to, dTo) : { path: [to], ways: [] };
    if (!inn.path) return inn;
    return { path: [...out.path, ...inn.path.filter((x) => !out.path.includes(x))], ways: [...out.ways, ...inn.ways] };
}

/** The ways from here he knows (and, for the narrator and the extractor, the hidden ones), as the catalog, context and HUD name them. */
export function exitsFrom(s, id, { hidden = false } = {}) {
    const d = dungeonOf(s, id);
    if (!d) return [];
    return linksAt(s, id, { hidden }).filter((l) => goesFrom(l, id)).map((l) => {
        const to = otherEnd(l, id);
        return { link: l, to, name: l.name, blocker: blockerOf(s, l), dir: dirFrom(l, id), hidden: !!l.hidden, out: to === d };
    });
}

/** One way from here: "iron door → Armory (loc.…), blocked by feat.2 (locked iron door)". */
export function exitText(s, e, { ids = true } = {}) {
    const where = `${placeName(s, e.to)}${ids ? ` (${e.to})` : ''}`;
    const bits = [e.dir, e.link.both ? null : 'one way', e.blocker ? `blocked by ${ids ? `${e.blocker.id} ` : ''}(${e.blocker.name})` : null, e.hidden && ids ? 'HIDDEN: he has not found it' : null].filter(Boolean);
    return `${ids ? `${e.link.id} ` : ''}${e.name ? `${e.name} → ` : ''}${e.out ? `out to ${where}` : where}${bits.length ? `, ${bits.join(', ')}` : ''}`;
}

/** "Old watchtower › Crypt (level 2)": where he is in a dungeon, for the context and the HUD. */
export function roomLabel(s, id) {
    const d = dungeonOf(s, id);
    if (!d) return placeName(s, id);
    const p = s.places[id];
    return `${d === id ? p.name : `${s.places[d].name} › ${p.name}`}${Number.isInteger(p.level) ? ` (level ${p.level})` : ''}`;
}

/** The known room of this dungeon a name means (its own words, or the name of a known way from here to it), or null. */
export function knownRoomNamed(s, from, name) {
    const d = dungeonOf(s, from);
    if (!d) return null;
    const want = words(name);
    if (!want.length) return null;
    const same = (t) => { const have = words(t); return have.length && want.every((w) => have.includes(w)); };
    const exits = exitsFrom(s, from).filter((e) => (e.name && same(e.name)) || same(s.places[e.to]?.name || ''));
    if (exits.length === 1) return exits[0].to;
    if (exits.length > 1) return { ambiguous: exits.map((e) => e.to) };
    const rooms = [s.places[d], ...roomsOf(s, d)].filter((p) => roomKnown(s, p.id) && same(p.name));
    if (rooms.length === 1) return rooms[0].id;
    return rooms.length > 1 ? { ambiguous: rooms.map((p) => p.id) } : null;
}

/**
 * The room of a dungeon a new mention means: the same name (and level, where both are known) among its rooms, the one
 * next to where he is first. Two rooms of that name and nothing to tell them apart: ambiguous, never a pick.
 * @returns {{id: string}|{ambiguous: string[]}|null}
 */
export function roomByName(s, d, n, near) {
    const name = normText(n.name || '');
    const hits = [s.places[d], ...roomsOf(s, d)].filter((p) => normText(p.name) === name
        && !(Number.isInteger(n.level) && Number.isInteger(p.level) && n.level !== p.level));
    if (hits.length <= 1) return hits.length ? { id: hits[0].id } : null;
    const close = hits.filter((p) => p.id === near || linkBetween(s, p.id, near));
    return close.length === 1 ? { id: close[0].id } : { ambiguous: hits.map((p) => p.id) };
}

/** The hidden way of this place a successful search finds (the one the focus names, else one), or null. */
export function hiddenWayFinds(s, place, focus = []) {
    const ways = linksAt(s, place, { hidden: true }).filter((l) => l.hidden);
    if (!ways.length) return null;
    const named = ways.find((l) => words(`${l.name || ''} ${s.places[otherEnd(l, place)]?.name || ''} passage door way`).some((w) => focus.includes(w)));
    return { link: named || ways[0], named: !!named };
}

/** The events for a way, whole (link.set). */
export const linkEvent = (l) => ({ t: 'link.set', d: { link: { ...l } } });

/** A new way between two places (the next id). */
export function newLink(s, { a, b, name = null, both = true, hidden = false, feature = null, dir = null, how = 'seen', by = 'reply' }) {
    const id = `link.${Object.keys(s.links || {}).length + 1}`;
    const at = { turn: s.turn, minute: s.clock.minute };
    return { id, a, b, name: name ? String(name).slice(0, 60) : null, both, hidden, feature, dir, since: at, found: hidden ? null : { ...at, how }, by };
}

/** The level a room has when reached from another by a way (one down from level 1 is level 2). */
export function levelVia(s, from, l) {
    const base = s.places[from]?.level ?? (dungeonOf(s, from) === from || !dungeonOf(s, from) ? 1 : null);
    if (!Number.isInteger(base)) return null;
    const dir = l ? dirFrom(l, from) : null;
    return dir === 'down' ? base + 1 : dir === 'up' ? base - 1 : base;
}

/**
 * Mark a dungeon: the building or cave of a place, with the ways he already walked inside it (scene.history) kept as
 * ways, so marking it late does not cut him off from rooms he went through before. Returns the events.
 */
export function markEvents(s, id) {
    const root = complexOf(s, id);
    if (!root || s.places[root].dungeon || dungeonOf(s, root)) return [];
    const events = [{ t: 'place.updated', d: { id: root, set: { dungeon: true } } }];
    const inside = (x) => !!x && (x === root || lineage(s, x).includes(root));
    const steps = [...(s.scene.history || []), s.scene.at];
    const links = { ...(s.links || {}) };
    for (let i = 1; i < steps.length; i++) {
        const [a, b] = [steps[i - 1], steps[i]];
        if (a === b || !inside(b) || (!inside(a) && b === root)) continue;
        const from = inside(a) ? a : root;
        if (from === b || Object.values(links).some((l) => (l.a === from && l.b === b) || (l.a === b && l.b === from))) continue;
        const l = newLink({ ...s, links }, { a: from, b, how: 'walked', by: 'walked' });
        links[l.id] = l;
        events.push(linkEvent(l));
    }
    for (const x of new Set(steps.filter(inside))) if (!s.places[x].visited) events.push({ t: 'place.updated', d: { id: x, set: { visited: { turn: s.turn, minute: s.clock.minute } } } });
    return events;
}

/** The text of the dungeon he is in for #map: its known rooms by level, and the ways he knows between them. */
export function mapText(s, d) {
    const rooms = [s.places[d], ...roomsOf(s, d)].filter((p) => roomKnown(s, p.id));
    const byLevel = new Map();
    for (const p of rooms) {
        const k = Number.isInteger(p.level) ? `Level ${p.level}` : p.id === d ? 'Way in' : 'Level unknown';
        byLevel.set(k, [...(byLevel.get(k) || []), p]);
    }
    const L = [`${s.places[d].name}${s.scene.at === d || dungeonOf(s, s.scene.at) === d ? ` — you are in ${placeName(s, s.scene.at)}` : ''}`];
    for (const [k, ps] of byLevel) {
        L.push(`${k}:`);
        for (const p of ps) {
            const ways = exitsFrom(s, p.id).map((e) => exitText(s, e, { ids: false }));
            L.push(`- ${p.name}${visited(s, p.id) ? '' : ' (seen, not entered)'}${ways.length ? `: ${ways.join(' · ')}` : ''}`);
        }
    }
    return L.join('\n');
}
