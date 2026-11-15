// Location architecture .190, stage 3 (docs/LOCATION_ARCHITECTURE_190.md; decisions D1 = B5, D1a–D1d): a true Living
// Dungeon is a fixed, finite, linear run of sections per level. The engine owns them; the story names and shapes them.
//
//   a section       places[`${root}.l${n}_s${k}`] {kind: 'interior', parent: root, level: n, section: k, by: 'dungeon'}
//                   made by place.created at his first confirmed arrival (never before: the GO only previews it), named
//                   by that arrival's report (else "part k of level n"), never renamed; the same id on every visit
//   its way         a link from the part before (the gate for part 1; the last part of the level above for part 1 of a
//                   deeper level, dir down), made with the section (by: 'dungeon')
//   the track       a level has as many sections as its encounters and their quiet parts (the pace of its first cycle,
//                   fixed for the Dungeon): an encounter of every cycle is met in the same section (D1d: no quiet parts
//                   after the track); the way down is at its last section (D1c), behind the seal where there is one
//   no side chambers (D1a), no loops, and no room, passage, stair or level the story invents (world.js refuses them)
//
// An older save's rooms of the Dungeon (made by the story before .190) stay what they are: they are the level's first
// sections in the order he first stood in them; the track goes on after them (migration as a reading, no event rewritten).
import { normText } from '../util.js';
import { trueDungeonOf } from './dungeon.js';
import { livingOf, floorAt, trackPace } from './living.js';

export const sectionId = (root, n, k) => `${root}.l${n}_s${k}`;
const defaultName = (n, k) => `part ${k} of level ${n}`;

/** A level's track: its length and the section of each encounter (slot order), fixed for the Dungeon. */
export function trackOf(x, n) {
    const pace = trackPace(x, n);
    if (!pace) return null;
    const positions = [];
    let k = 0;
    for (const q of pace) { k += q + 1; positions.push(k); }
    return { length: k, positions };
}

/**
 * The length of a level's track for this save: its fixed track, or – where an older save's story-made rooms already
 * fill it – those rooms and one section for each encounter of this cycle not met in one of them (the level stays
 * playable to its guardian; nothing more is added).
 */
export function trackLength(s, root, n) {
    const x = livingOf(s, root);
    const track = trackOf(x, n);
    if (!track) return 0;
    const legacy = sectionsOf(s, root, n).filter((id) => !Number.isInteger(s.places[id].section));
    if (!legacy.length) return track.length;
    // stable while he goes on: every encounter of this cycle not met in one of those rooms has its own section
    const after = (x.run.floors[n]?.slots || []).filter((sl) => !(sl.at && legacy.includes(sl.at))).length;
    return Math.max(track.length, legacy.length + after);
}

/** The sections of a level he has, in track order (an older save's rooms first, by when he first stood in them). */
export function sectionsOf(s, root, n) {
    const rooms = Object.values(s.places || {}).filter((p) => p.id !== root && trueDungeonOf(s, p.id) === root && floorAt(s, p.id) === n
        && (Number.isInteger(p.section) || p.visited));
    const legacy = rooms.filter((p) => !Number.isInteger(p.section)).sort((a, b) => (a.visited.turn - b.visited.turn) || (a.visited.minute - b.visited.minute) || (a.id < b.id ? -1 : 1));
    const own = rooms.filter((p) => Number.isInteger(p.section)).sort((a, b) => a.section - b.section);
    return [...legacy, ...own].map((p) => p.id);
}

/** Where a place lies on its Dungeon's track: {root, level, k} (k 0: the gate), or null outside a Living Dungeon. */
export function positionOf(s, id) {
    const root = trueDungeonOf(s, id);
    if (!root || !livingOf(s, root)) return null;
    if (id === root) return { root, level: 0, k: 0 };
    const level = floorAt(s, id);
    const k = sectionsOf(s, root, level).indexOf(id) + 1;
    return k > 0 ? { root, level, k } : null;
}

const BACK = /\b(?:back|previous|retrace|the way i came|where i came from)\b/;
const OUT = /\b(?:out|outside|exit|leave|surface|daylight|the gate|the entrance)\b/;
const UP = /\b(?:up|upstairs|ascend|climb up|level above)\b/;
// a way down a level by its own words (a stair, the level below); "down the sloping passage" is a way on (B1, R-B6)
const DOWN = /\b(?:downstairs|descend|descends|descending|stair|stairs|stairway|staircase|lower level|next level|level below|deeper level)\b/;

/**
 * Where his words take him from here in a Living Dungeon: {to} a section he has, {preview} the next one (made only by
 * the confirmed arrival), {refuse} with the line, or null where this is not a step inside a Living Dungeon.
 * preview: {id, root, level, k, from, down, name}
 */
export const ENTER = /\b(?:in|inside|into|enter|enters|entering|deeper|down|on|onward|onwards|descend|the way into|delve|go in|further in)\b/;

export function sectionStep(s, words) {
    const here = s.scene.at;
    const root = trueDungeonOf(s, here);
    const x = livingOf(s, root);
    if (!x) return null;
    const w = normText(words || '');
    const preview = (level, k, from, down = false) => ({ preview: { id: sectionId(root, level, k), root, level, k, from, down, name: defaultName(level, k) } });
    const own = (level) => sectionsOf(s, root, level).filter((id) => Number.isInteger(s.places[id].section));
    const legacy = (level) => sectionsOf(s, root, level).length - own(level).length;
    const ownAt = (level, k) => own(level).find((id) => s.places[id].section === k) || null;
    const last = (level) => sectionsOf(s, root, level).at(-1) || null;
    if (here === root) {
        // at the gate: in is the first part of level 1 (an older save's first room where it has one)
        const first = sectionsOf(s, root, 1)[0];
        return first ? { to: first } : preview(1, 1, root);
    }
    const level = floorAt(s, here);
    const mine = s.places[here]?.section;
    // the way he came: the part (or gate) this section was made from; an older save's rooms keep their own ways
    const back = Number.isInteger(mine) ? Object.values(s.links || {}).find((l) => l.by === 'dungeon' && l.b === here)?.a || null : null;
    if (OUT.test(w)) return { to: root };
    if (BACK.test(w) || (UP.test(w) && mine === 1 && level > 1)) return back ? { to: back } : null;
    const length = trackLength(s, root, level);
    // the next part: after his own section k, k + 1; from an older save's room, the first section after those rooms
    const k = Number.isInteger(mine) ? mine : legacy(level);
    if (DOWN.test(w) && k < length && x.floors[level + 1]) return { refuse: `there is no way down here: the way down to level ${level + 1} of ${x.name} is at the end of level ${level} (part ${length}); he goes on to reach it` };
    if (DOWN.test(w) && !x.floors[level + 1]) return { refuse: `${x.name} has no level below level ${level}` };
    const next = ownAt(level, k + 1);
    if (next) return { to: next };
    if (k < length) return preview(level, k + 1, here);
    // the end of the level's track: the way down, where there is a level below (D1c)
    if (!x.floors[level + 1]) return { refuse: `nothing further on level ${level} of ${x.name}: this is the end of its way${level > 1 ? '' : ' and it has no level below'}` };
    if (x.floors[level].sealed && !x.run.floors[level]?.cleared) return { refuse: `the way down to level ${level + 1} of ${x.name} is sealed until the guardian of level ${level} falls` };
    const below = sectionsOf(s, root, level + 1)[0];
    return below ? { to: below } : preview(level + 1, legacy(level + 1) + 1, last(level) === here ? here : here, true);
}

/** The ways on from a section for the planner and the narrator (EXITS): on, down, or the end of the level. */
export function sectionExits(s, here = s.scene.at) {
    const at = positionOf(s, here);
    if (!at || at.k === 0) return [];
    const x = livingOf(s, at.root);
    const track = { length: trackLength(s, at.root, at.level) };
    const out = [];
    if (sectionsOf(s, at.root, at.level)[at.k]) return out; // the part on is a known one: its way is listed
    if (at.k < track.length) out.push(`on: part ${at.k + 1} of level ${at.level} (not seen yet; go {"new": "on"})`);
    else if (x.floors[at.level + 1]) out.push(x.floors[at.level].sealed && !x.run.floors[at.level]?.cleared
        ? `down to level ${at.level + 1}: sealed until the guardian of level ${at.level} falls`
        : `down to level ${at.level + 1} (go {"new": "down"})`);
    else out.push(`nothing further: the end of level ${at.level}`);
    return out;
}

/** The state as it would be with him in a previewed part (for the next step of the same message only; never booked). */
export function afterPreview(s, p) {
    const v = { ...s, places: { ...s.places, [p.id]: s.places[p.id] || { id: p.id, name: p.name, kind: 'interior', parent: p.root, level: p.level, section: p.k, visited: { turn: s.turn, minute: s.clock.minute }, tags: [] } },
        links: { ...s.links, [`preview.${p.id}`]: { id: `preview.${p.id}`, a: p.from, b: p.id, both: true, by: 'dungeon' } }, scene: { ...s.scene, at: p.id } };
    return v;
}
