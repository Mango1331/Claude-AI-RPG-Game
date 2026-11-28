// Location architecture .190 (stage 1, docs/LOCATION_ARCHITECTURE_190.md; plans A1/A2 on main): one place book over the
// one place store (state.places, folded from the event log). It answers four separate questions – never one list for
// all of them:
//   exists      is there such a place at all (also a hidden room)          → s.places[id]
//   known       may a model name it / may Alaric choose it                  → knownPlace / knownPlaceIds
//   advertised  what a prompt shows (rank and budget)                       → catalogPlaces (src/v4/catalog.js), unchanged
//   reachable   may he set off for it from here                             → the GO handler and the topology (dungeon.js)
// and one resolver of a player's or a reply's words for a place, with exactly four outcomes:
//   {existing: id} · {ambiguous: [ids]} · {new: {name, kind, scope}} · {invalid: reason}
// The resolver never merges by "contains": a name that only mentions another place as its landmark ("the eel carts
// behind Brannic Vell's smokehouse") is another place (probe over the 65 natural GO {new} of .186/.188). A prefix is a
// closer name of the same place only inside one settlement (or out in the realm), never a settlement for its own site.
import { normText } from '../util.js';
import { settlementOf } from './domain.js';
import { isRoom, roomKnown, trueDungeonOf, dungeonOf } from './dungeon.js';

const label = (t) => normText(t || '').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(?:the|a|an) /, '');
const significant = (l) => l.split(' ').filter((w) => w.length > 2 && !['the', 'and', 'old'].includes(w));

/** May a model name this place, may Alaric choose it: it exists and he knows it (a room only once he knows that room). */
export function knownPlace(s, id) {
    const p = s.places?.[id];
    if (!p) return false;
    // review of .190 (G4): a place whose report proved false is no place he knows (the report stays a memory)
    if (p.known === 'false') return false;
    if (isRoom(s, id)) return roomKnown(s, id);
    return true;
}

/**
 * Every place id Alaric knows and a reply may put him or others at from here, here first (the extractor's valid place
 * references): a room only of the ruin or Dungeon he is in (another ruin's guard room is no place from here).
 */
export function knownPlaceIds(s) {
    const here = s.scene?.at;
    const mine = here ? dungeonOf(s, here) : null;
    const ids = Object.keys(s.places || {}).filter((id) => knownPlace(s, id) && (!isRoom(s, id) || dungeonOf(s, id) === mine));
    return here && ids.includes(here) ? [here, ...ids.filter((id) => id !== here)] : ids;
}

/** The settlement a place lies in, or null (out in the realm). */
const townOf = (s, id) => settlementOf(s, id) || null;

/**
 * The known places a name may mean from here: inside the settlement he is in (and its children), or – out of a
 * settlement – in the realm he is in; places out in the open realm count from a settlement too (a site behind the
 * town). Never a place of another settlement.
 */
function inScope(s, id, from) {
    const p = s.places[id];
    if (!p || p.kind === 'realm' || id === from) return false;
    const here = s.places[from];
    const town = townOf(s, from);
    const there = townOf(s, id);
    if (p.kind === 'settlement') return p.realm === here?.realm;
    if (town) return there === town || (!there && p.realm === here?.realm);
    return !there && p.realm === here?.realm;
}

/** A settlement and a site of its own are two places, whatever their names (Ashbridge / Ashbridge city gate). */
const ownSite = (s, a, b) => (s.places[a]?.kind === 'settlement' && townOf(s, b) === a) || (s.places[b]?.kind === 'settlement' && townOf(s, a) === b);

/**
 * The known true Dungeon a name means by its own head word ("the Grotto mouth" → Glimmerdeep Grotto), unique in the
 * realm. The gate, never a room of it: arriving at the gate is not yet being inside.
 */
export function dungeonByHeadWord(s, name, from) {
    const l = label(name);
    // going in is the way into the Dungeon (the GO handler's entry), never the gate he would go back to
    if (/^(?:into|inside|in|deeper|down into)\b/.test(l)) return null;
    const words = significant(l);
    if (!words.length) return null;
    const realm = s.places[from]?.realm ?? null;
    const hits = Object.values(s.places).filter((p) => p.dungeon?.real && (p.realm ?? null) === realm && knownPlace(s, p.id)
        && trueDungeonOf(s, from) !== p.id).filter((p) => {
        const head = significant(label(p.name)).at(-1);
        // the Dungeon by its head word as the head of his words ("the third grotto"), or its way in ("the Grotto mouth");
        // a road, a camp or a farm named after it ("the Grotto road toward the hills") is another place
        return head && head.length > 3 && words.includes(head) && (words.at(-1) === head || GATE_WORDS.has(words.at(-1)));
    });
    return hits.length === 1 ? hits[0].id : hits.length > 1 ? { ambiguous: hits.map((p) => p.id) } : null;
}
const LOCATIVE = /^(?:behind|beside|by|near|at|on|in|off|past|beyond|under|below|above|over|along|across|outside|opposite|between|(?:north|south|east|west)(?:east|west)? of)\b/;
const GATE_WORDS = new Set(['mouth', 'entrance', 'gate', 'gates', 'door', 'doors', 'opening', 'cleft', 'portal']);

/**
 * Resolve a reference to a place: a known id, or {new: name} / {new: {name, kind, parent}}.
 * @param {object} s state
 * @param {string|object} ref
 * @param {{from?: string, kind?: string|null}} [opts] from: where he is (scope); kind: the kind a new place would have
 * @returns {{existing: string}|{ambiguous: string[]}|{new: {name: string, kind: string|null, scope: string}}|{invalid: string}}
 */
export function resolvePlaceRef(s, ref, { from = s.scene?.at, kind = null } = {}) {
    if (ref === 'here') return { existing: from };
    if (typeof ref === 'string') {
        if (!s.places?.[ref]) return { invalid: `unknown place ${ref}` };
        return knownPlace(s, ref) ? { existing: ref } : { invalid: `${ref} is not known to Alaric` };
    }
    const n = typeof ref?.new === 'string' ? { name: ref.new } : ref?.new;
    if (!n?.name || !String(n.name).trim()) return { invalid: 'a place needs an id or a name' };
    const q = label(n.name);
    if (!q) return { invalid: 'a place needs a name' };
    const pool = Object.keys(s.places).filter((id) => inScope(s, id, from) && knownPlace(s, id));
    const exact = pool.filter((id) => label(s.places[id].name) === q);
    if (exact.length === 1) return { existing: exact[0] };
    if (exact.length > 1) return { ambiguous: exact };
    const gate = dungeonByHeadWord(s, n.name, from);
    if (typeof gate === 'string') return { existing: gate };
    if (gate?.ambiguous) return { ambiguous: gate.ambiguous };
    // a closer name of the same place: the known name begins with his words ("the tannery rows" → "the Tannery Rows
    // behind the Ashbridge tanneries"); two significant words or one long one, never a settlement for its own site
    if (significant(q).length >= 2 || q.length >= 8) {
        // the rest of the known name must say where that same place lies ("… behind the tanneries", "… by the cooper's
        // yard"); a further noun makes it another place or a part of it (Dunmarrow's Ford / Dunmarrow's Ford Guildhall,
        // old quarry / old quarry track east of Ashbridge: replay corpus b18/b19)
        const closer = pool.filter((id) => label(s.places[id].name).startsWith(`${q} `) && LOCATIVE.test(label(s.places[id].name).slice(q.length + 1))
            && !(label(s.places[from]?.name) === q && ownSite(s, from, id))
            && !pool.some((o) => s.places[o].kind === 'settlement' && label(s.places[o].name) === q && ownSite(s, o, id)));
        if (closer.length === 1) return { existing: closer[0] };
        if (closer.length > 1) return { ambiguous: closer };
    }
    return { new: { name: String(n.name).trim(), kind: n.kind || kind || null, scope: from } };
}

/**
 * The one known person a shorter name means at a known place (.188 Rogue #80: "Ostrek … works the tannery rows" is
 * Meister Ostrek of the rendering shed there): his name ends in these words and he is usually at this place or a part of
 * it. Never by one word of another place's people, never two candidates.
 */
export function usualPersonNamed(s, name, at) {
    const words = normText(name || '').replace(/^(?:the|a|an) /, '').split(' ').filter(Boolean);
    if (!words.length || words.join(' ').length < 4 || !at || !s.places?.[at]) return null;
    const inPlace = (id) => { for (let cur = id, i = 0; cur && i < 16; cur = s.places[cur]?.parent, i++) if (cur === at) return true; return false; };
    const hits = Object.values(s.entities || {}).filter((e) => e.kind === 'npc' && e.name && e.status !== 'dead' && e.at && inPlace(e.at)).filter((e) => {
        const own = normText(e.name).split(' ');
        return own.length > words.length && own.slice(-words.length).join(' ') === words.join(' ');
    });
    return hits.length === 1 ? hits[0].id : null;
}
