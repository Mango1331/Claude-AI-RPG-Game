// Patch 7 (dungeon foundations): a ruin, a cave, a crypt or a tower that Alaric explores room by room is one place of
// the place tree (src/v4/domain.js), marked as explored room by room (rooms), and its rooms are the places below it.
// Belonging (the tree) is not the way between rooms: which room leads to which is a short list of the ways the story
// established or he walked (links), each with whether he knows it, which way it can be taken, and the obstacle that
// stands in it (a Patch 6 feature: the way is open once he got past it, made it harmless or it was destroyed).
//
// Review of a5035f0: being explored room by room is navigation, not a Dungeon. Not every cave, crypt or ruin is one
// (lore.dungeons); a true Dungeon (its own ecology, a danger Rank of its own) carries its classification besides:
//
//   places[id].rooms    true on the place explored room by room (the outermost building or cave of the rooms)
//   places[id].level    a room's level, when known (1 the entry level, 2 one floor down, 0 one up)
//   places[id].visited  {turn, minute} when he first stood in a room of it
//   places[id].dungeon  a true Dungeon: {theme, rank: {min, max}|null, levels: {n: {min, max}}, control, hidden: [the
//                       established fields he does not know], guild: [the fields on the Guild's record], heard: [what
//                       reports say, not canon]}
//   links      id -> {id, a, b, name, both, hidden, feature, dir: up|down|null (from a to b), since, found, by}; two
//              rooms can be joined by more than one way (an iron door and a ventilation shaft)
//
// The engine moves him between rooms only along ways he knows and can take (commands.js go, and every arrival the
// world applier books: src/v4/world.js); a room he has never seen is reached the first time by going on from where he
// is, and the way he took is kept. No map is generated: the place is what the story established. A Dungeon's Rank is
// the world's, never fitted to Alaric.
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

/** The place explored room by room that a place lies in (itself, or the one its room belongs to), or null. */
export function dungeonOf(s, id) {
    // (c.6.6.15 marked it dungeon: true)
    return lineage(s, id).find((x) => s.places[x].rooms || s.places[x].dungeon === true) || null;
}

/** The true Dungeon a place lies in (classified by the world: places[id].dungeon.real), or null. */
export function trueDungeonOf(s, id) {
    return lineage(s, id).find((x) => s.places[x].dungeon?.real) || null;
}

/** "F–D" for a Rank range, "E" for one Rank. */
export const rankText = (r) => (!r ? null : r.min === r.max ? r.min : `${r.min}–${r.max}`);

/**
 * A Dungeon's classification as text (review of a5035f0). all: as the world has it, with what reports say besides
 * (the narrator, the extractor); else only what Alaric knows (the HUD, the planner): the established fields not hidden
 * from him, and rumours as rumours. Null when there is nothing to tell.
 */
/**
 * What of a Dungeon is on the Guild's record (final review of e4d61b8): its keys. A content Dungeon of a campaign
 * started before the record existed is public as it was seeded: all of it that is not hidden.
 */
export function guildRecord(c, by = null) {
    if (c?.guild) return c.guild;
    if (by !== 'content') return [];
    return ['theme', 'rank', 'control', ...Object.keys(c?.levels || {}).map((n) => `level:${n}`)].filter((k) => !(c?.hidden || []).includes(k));
}

export function dungeonText(s, id, { all = false, guild = false } = {}) {
    const p = s.places?.[id];
    const c = p?.dungeon;
    if (!c) return null;
    // guild (final review of e4d61b8): only what the Guild has on record (c.guild: its own telling, or the content's
    // public Dungeons), never what is hidden nor what Alaric alone saw, and no rumour
    const record = guild ? guildRecord(c, p.by) : null;
    const shown = (k) => (guild ? record.includes(k) : all || !(c.hidden || []).includes(k));
    const levels = Object.entries(c.levels || {}).filter(([n]) => shown(`level:${n}`)).map(([n, r]) => `level ${n}: ${rankText(r)}`);
    const bits = c.real ? [shown('theme') ? c.theme : null, shown('rank') && c.rank ? `Rank ${rankText(c.rank)}` : null, levels.length ? levels.join(', ') : null, shown('control') ? c.control : null].filter(Boolean) : [];
    const heard = (guild ? [] : c.heard || []).map((h) => [h.theme, h.rank ? `Rank ${rankText(h.rank)}` : null, h.level ? `level ${h.level}` : null, h.control].filter(Boolean).join(', ')).filter(Boolean);
    if (!bits.length && !heard.length) return null;
    return [bits.length ? `a Dungeon: ${bits.join('; ')}` : null, heard.length ? `rumoured: ${heard.slice(-2).join(' / ')}` : null].filter(Boolean).join('; ');
}

/** The true Dungeons Alaric can know of near a settlement (or in its land, out in it): the content's and those play classified. */
export function nearDungeons(s, town, realm, { guild = false } = {}) {
    return Object.values(s.places || {}).filter((p) => p.dungeon?.real && dungeonText(s, p.id, { guild }) && (town ? p.near === town || (!p.near && p.realm === realm) : p.realm === realm))
        .map((p) => p.id);
}

/**
 * Final review of e4d61b8: the danger Rank the world established where a creature is met: the Rank of that level of a
 * true Dungeon, else the Dungeon's own; null outside a true Dungeon or where no Rank is established (canon only, never
 * a rumour; never anything of Alaric's).
 */
export function rankAt(s, place) {
    const d = trueDungeonOf(s, place);
    if (!d) return null;
    const c = s.places[d].dungeon;
    const level = s.places[place]?.level;
    return (Number.isInteger(level) && c.levels?.[level]) || c.rank || null;
}

/**
 * The classification a dungeon delta makes (review of a5035f0): seen or told by the Guild, it is the world's and known
 * to him; hidden, the world's and not his; a rumour is only what was said. What the world established stays: another
 * theme, Rank, level Rank or holder later is refused (conflicts), never an overwrite, and nothing follows Alaric's level.
 * @param {{theme?, rank?: {min, max}|null, level?: number|null, control?, how: 'seen'|'guild'|'hidden'|'rumor'}} d
 * @returns {{next: object, conflicts: string[]}}
 */
export function classified(cur, d, turn, by = null) {
    const c = { real: false, theme: null, rank: null, levels: {}, control: null, hidden: [], heard: [], ...(cur || {}) };
    if (d.how === 'rumor') return { next: { ...c, heard: [...c.heard, { theme: d.theme || null, rank: d.rank || null, level: d.level ?? null, control: d.control || null, turn }].slice(-6) }, conflicts: [] };
    const conflicts = [];
    const next = { ...c, real: true, levels: { ...c.levels }, hidden: [...c.hidden], guild: [...guildRecord(c, by)] };
    const set = (key, field, value, same) => {
        if (value === null || value === undefined) return;
        const had = key.startsWith('level:') ? next.levels[key.slice(6)] : next[field];
        if (had && !same(had, value)) { conflicts.push(key); return; }
        if (key.startsWith('level:')) next.levels[key.slice(6)] = value;
        else next[field] = value;
        // hidden: the world's, not his yet; seen or told: he knows it now (also what was hidden before)
        next.hidden = d.how === 'hidden' && !(had && !next.hidden.includes(key)) ? [...new Set([...next.hidden, key])] : next.hidden.filter((k) => k !== key);
        // what the Guild's records told him is on the Guild's record (its board may use it)
        if (d.how === 'guild') next.guild = [...new Set([...next.guild, key])];
    };
    const sameRank = (a, b) => a.min === b.min && a.max === b.max;
    set('theme', 'theme', d.theme ? String(d.theme).slice(0, 120) : null, (a, b) => normText(a) === normText(b));
    if (Number.isInteger(d.level)) set(`level:${d.level}`, null, d.rank || null, sameRank);
    else set('rank', 'rank', d.rank || null, sameRank);
    set('control', 'control', d.control ? String(d.control).slice(0, 120) : null, (a, b) => normText(a) === normText(b));
    return { next, conflicts };
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
/** Every way between two places (an iron door and a shaft may join the same rooms). */
export const linksBetween = (s, a, b) => Object.values(s.links || {}).filter((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
/** A way between two places, one he knows first. */
export const linkBetween = (s, a, b) => { const all = linksBetween(s, a, b); return all.find((l) => !l.hidden) || all[0] || null; };
/**
 * The way between two places a report means (review of a5035f0): the one of that name; without a name, the only one;
 * a way he walked without a name is the one a name is given to. Null: another way between the same two places.
 */
export function sameWay(s, a, b, name) {
    const all = linksBetween(s, a, b);
    if (!all.length) return null;
    const want = words(name || '');
    if (!want.length) return all.length === 1 ? all[0] : all.find((l) => !l.hidden) || all[0];
    const named = all.find((l) => { const have = words(l.name || ''); return have.length && (want.every((w) => have.includes(w)) || have.every((w) => want.includes(w))); });
    return named || all.find((l) => !l.name) || null;
}
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

/**
 * The known room of this place a name means: the way he names from here (that way: "the iron door"), the room it leads
 * to by its name, or a known room of it; two different rooms for one name are a question.
 * @returns {{id: string, link?: object}|{ambiguous: string[]}|null}
 */
export function knownRoomNamed(s, from, name) {
    const d = dungeonOf(s, from);
    if (!d) return null;
    const want = words(name);
    if (!want.length) return null;
    const same = (t) => { const have = words(t); return have.length && want.every((w) => have.includes(w)); };
    const pick = (list, viaWay) => {
        const tos = [...new Set(list.map((e) => e.to))];
        if (tos.length > 1) return { ambiguous: tos };
        return tos.length ? { id: tos[0], ...(viaWay && list.length === 1 ? { link: list[0].link } : {}) } : null;
    };
    const exits = exitsFrom(s, from);
    const byWay = pick(exits.filter((e) => e.name && same(e.name)), true);
    if (byWay) return byWay;
    const byRoom = pick(exits.filter((e) => same(s.places[e.to]?.name || '')), false);
    if (byRoom) return byRoom;
    const rooms = [s.places[d], ...roomsOf(s, d)].filter((p) => roomKnown(s, p.id) && same(p.name));
    if (rooms.length === 1) return { id: rooms[0].id };
    return rooms.length > 1 ? { ambiguous: rooms.map((p) => p.id) } : null;
}

/**
 * Review of a5035f0: the first room on a way through several rooms where something he does not know of waits for him
 * (a hidden trap that springs as he enters, or across the way into it): there the walk stops, so it is never stepped
 * over. A trap made harmless or spent stops nothing.
 * @returns {{at: string, index: number}|null}
 */
export function firstStop(s, path, ways) {
    for (let i = 1; i < path.length - 1; i++) {
        const into = ways[i - 1];
        const trap = Object.values(s.features || {}).some((f) => f.hidden && f.kind === 'hazard' && f.status === 'active'
            && ((f.trigger === 'enter' && f.at === path[i]) || (f.trigger === 'cross' && !!f.on && f.on === into?.feature)));
        if (trap) return { at: path[i], index: i };
    }
    return null;
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
    const close = hits.filter((p) => p.id === near || linksBetween(s, p.id, near).length);
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

/**
 * The level a room has when reached from another by a way (one down from level 1 is level 2). Patch 8.3 (live
 * 22.10.2026 02:00: the stair down from the gate of the Old Crown Catacombs led to "level 1" booked as level 2, behind
 * the seal of level 1): a true Dungeon's own place is its gate (living.js floorAt: level 0), not a room of level 1;
 * every way from the gate into the Dungeon, down or level, reaches level 1. A building or cave explored room by room
 * that is no true Dungeon counts its own place as level 1, as before.
 */
export function levelVia(s, from, l) {
    if (trueDungeonOf(s, from) === from) return 1;
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
    if (!root || s.places[root].rooms || dungeonOf(s, root)) return [];
    const events = [{ t: 'place.updated', d: { id: root, set: { rooms: true } } }];
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
    const known = dungeonText(s, d);
    const L = [`${s.places[d].name}${known ? ` (${known})` : ''}${s.scene.at === d || dungeonOf(s, s.scene.at) === d ? ` — you are in ${placeName(s, s.scene.at)}` : ''}`];
    for (const [k, ps] of byLevel) {
        L.push(`${k}:`);
        for (const p of ps) {
            const ways = exitsFrom(s, p.id).map((e) => exitText(s, e, { ids: false }));
            L.push(`- ${p.name}${visited(s, p.id) ? '' : ' (seen, not entered)'}${ways.length ? `: ${ways.join(' · ')}` : ''}`);
        }
    }
    return L.join('\n');
}
