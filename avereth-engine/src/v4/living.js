// Patch 8 (Living Dungeons, docs/PATCH8_LIVING_DUNGEONS.md): what makes a true Dungeon (src/v4/dungeon.js, its
// classification) a place to delve again and again. The engine owns each level's essential contents and progress; the
// narrator shapes the rooms, the mood and the meeting. No map is generated and no room count is fixed.
//
// Canonical state (one owner per fact, never two copies of it):
//   places[root].dungeon   the classification (theme, Rank, level Ranks, control): dungeon.js, unchanged
//   dungeons[root]         the living structure, fixed when the Dungeon is first established in play (dungeon.established):
//     gate {names, text, requires, fee_cp, keeper, contract_free}, capacity, reset_min, seed, parties [the companies
//                          that delve it]; contract_free (Patch 8.1): an active Guild contract for work in it waives the fee
//     floors {n: {rank, spans {minion, guard, boss}: [lo, hi], slots [spec], manifest, sealed}}  per level, fixed
//     cycle, cycle_start   the reset cycle (game minutes, never real time)
//     run {floors {n: {parts, pace, slots [instance], cleared}}, resources {node: left}}   the current cycle
//     clears [{cycle, floor, credit, pc, others, total, turn, minute}]   every clear, for the record and the Guild
//     inside {party: {floor, until}}, booked_to   the companies inside now, and how far their days are booked
//     ahead {turn, floor, ref, slot, cycle}   the encounter the engine placed ahead of his GO this turn
//     pass {turn}   his paid entry while he is inside
//   a slot instance        {id, role, name, species, anchor, count, type, levels[], ref, entities[], at, taken}: the role
//                          and its cycle; the entities (entity.slot) are the individuals; neither copies the other: whether
//                          a slot is resolved is read from its entities' status (dead, fled, surrendered) or `taken` (a
//                          company resolved it before it was ever met)
//   a room                 places[id] with its level (dungeon.js): the concrete place; a level's number is its floor
//
// Determinism: every draw is a hash of the campaign seed, the Dungeon, the cycle and what is drawn (never the shared
// dice stream, so nothing else of a campaign changes); everything drawn is stored in an event, a replay or a swipe
// re-applies it, and nothing is rolled again.
import { clone, hash32, normText, slug } from '../util.js';
import { trueDungeonOf, dungeonOf, rankText, guildRecord } from './dungeon.js';
import { placeName, settlementOf, realmOf } from './domain.js';

const DAY = 1440;
const roll = (key) => parseInt(hash32(String(key)), 16);
const pick = (key, list) => list[roll(key) % list.length];
const between = (key, [a, b]) => (b <= a ? a : a + (roll(key) % (b - a + 1)));
const titled = (t) => String(t || '').split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const ROLES = ['minion', 'guard', 'boss'];

/** The living structure of a Dungeon, or null (not established yet, or no true Dungeon). */
export const livingOf = (s, root) => (root && s.dungeons?.[root]) || null;
/** The true Dungeon a place lies in that is established, or null. */
export function livingAt(s, place) {
    const root = trueDungeonOf(s, place);
    return livingOf(s, root);
}
/** The level of a place in its Dungeon: 0 at the gate (the Dungeon itself), else its room's level (1 when unknown). */
export function floorAt(s, place) {
    const root = trueDungeonOf(s, place);
    if (!root) return null;
    if (place === root) return 0;
    const level = s.places[place]?.level;
    return Number.isInteger(level) && level > 0 ? level : 1;
}
/** Patch 8: the level window of an ordinary foe met at a place of a Living Dungeon (its level's minion span), or null. */
export function levelSpan(s, place) {
    const root = trueDungeonOf(s, place);
    const x = livingOf(s, root);
    if (!x) return null;
    const f = x.floors[Math.max(1, floorAt(s, place))] || x.floors[Object.keys(x.floors)[0]];
    return f?.spans?.minion || null;
}
/** Is Alaric inside the Dungeon (a room of it, past its gate)? */
export const insideOf = (s, root) => !!root && s.scene.at !== root && trueDungeonOf(s, s.scene.at) === root;

// ------------------------------------------------------------------------------------------------ establishment
function bandOf(content, rank) {
    const bands = content.rules.ranks.bands;
    const lo = bands.find((b) => b.rank === rank?.min) || bands[0];
    const hi = bands.find((b) => b.rank === rank?.max) || lo;
    return [lo.min, hi.max];
}
/** The level window of each encounter role on a level of this Rank (rules.living.role_spans): inside the band, always. */
export function spansFor(content, rank) {
    const [lo, hi] = bandOf(content, rank);
    const w = hi - lo + 1;
    const spans = {};
    for (const role of ROLES) {
        const [a, b] = content.rules.living.role_spans[role];
        const from = Math.min(hi, lo + Math.floor(w * a));
        spans[role] = [from, Math.max(from, Math.min(hi, lo + Math.floor(w * b)))];
    }
    return spans;
}

/** The anchors a theme names, in the order it names them ("crystal beetles and mineral slimes": arthropod, slime). */
function themeKinds(content, theme) {
    const t = ` ${normText(theme).replace(/[^a-z0-9]+/g, ' ')} `;
    const found = [];
    for (const [alias, id] of content.anchorAliases) {
        const i = t.indexOf(` ${alias} `) >= 0 ? t.indexOf(` ${alias} `) : t.indexOf(` ${alias}s `);
        if (i < 0 || found.some((f) => f.id === id)) continue;
        // the species is the alias with the word before it when that word describes it ("crystal beetle")
        const before = t.slice(0, i).trim().split(' ').at(-1);
        // (never a plural noun or another creature: "skeletons, ghouls" are two kinds)
        const describes = before && before.length > 3 && !/[^s]s$/.test(before) && !content.anchorAliases.some(([a]) => a === before)
            && !['and', 'with', 'deeper', 'down', 'some', 'many', 'their', 'the', 'more', 'then'].includes(before);
        const species = describes ? `${before} ${alias}` : alias;
        found.push({ id, i, species: species.replace(/s$/, '') });
    }
    return found.sort((a, b) => a.i - b.i);
}

/** The slots of a level nobody wrote down: its theme's creatures, a guard on every level, a boss on the last one. */
function generatedSlots(content, theme, n, last, key) {
    const kinds = themeKinds(content, theme || '');
    const fallback = /\b(?:undead|crypt|tomb|grave|barrow|catacomb)/.test(normText(theme)) ? 'skeleton' : /\b(?:cave|cavern|grotto|crystal)/.test(normText(theme)) ? 'arthropod' : 'goblin';
    const list = kinds.length ? kinds : [{ id: fallback, species: content.anchors.get(fallback).aliases[0] }];
    const common = list[Math.min(n - 1, list.length - 1)];
    const deep = list.at(-1);
    const L = content.rules.living;
    const slots = [
        { id: 'first', role: 'minion', species: [common.species], anchor: common.id, count: [2, 3] },
        { id: 'second', role: 'minion', species: [list[(n) % list.length].species], anchor: list[(n) % list.length].id, count: [1, 3] },
    ];
    if (last) slots.push({ id: 'boss', role: 'boss', name: `the ${titled(deep.species)} ${pick(`${key}|boss`, L.boss_titles)}`, species: `${deep.species}`, anchor: deep.id });
    else slots.push({ id: 'guard', role: 'guard', name: `the ${titled(common.species)} ${pick(`${key}|guard`, L.guard_titles)}`, species: common.species, anchor: common.id });
    return slots;
}

/** The companies that delve this Dungeon (fixed at its establishment). */
function partiesFor(content, root, levels, count, key) {
    const L = content.rules.living;
    const out = [];
    for (let i = 0; i < count; i++) {
        const name = L.party_names[(roll(`${key}|party|${i}`) + i) % L.party_names.length];
        if (out.some((p) => p.name === name)) continue;
        out.push({
            id: `party.${slug(String(name).replace(/^the /i, ''))}`, name, size: between(`${key}|size|${i}`, L.party.size),
            leader: L.leader_names[(roll(`${key}|leader|${i}`) + i) % L.leader_names.length],
            affiliation: pick(`${key}|aff|${i}`, L.affiliations), reach: Math.max(1, Math.min(levels, 1 + (roll(`${key}|reach|${i}`) % levels))),
        });
    }
    return out;
}

/** One cycle of a level: its slot instances (species, count and levels drawn for this cycle) and its pace. */
function floorRun(floor, n, cycle, key, root) {
    const k = `${key}|c${cycle}|l${n}`;
    const base = slug(root.replace(/^loc\./, '')).slice(0, 24);
    const pace = floor.slots.map((sl, i) => (i === 0 ? 0 : pick(`${k}|pace|${i}`, floor.pace || [0, 1])));
    // the ref names the encounter by its place in the level, never by a plural word (V3 reads "…_ghouls" as one creature
    // standing for a group: src/delta.js isGroupCreature)
    const slots = floor.slots.map((sl, i) => {
        const species = Array.isArray(sl.species) ? pick(`${k}|${sl.id}|species`, sl.species) : sl.species;
        const count = sl.role === 'minion' ? between(`${k}|${sl.id}|count`, sl.count || [1, 2]) : 1;
        const span = floor.spans[sl.role] || floor.spans.minion;
        const levels = Array.from({ length: count }, (_, i) => between(`${k}|${sl.id}|lv|${i}`, span));
        return {
            id: sl.id, role: sl.role, name: sl.name || null, species, anchor: sl.anchor, count, type: sl.type || null, levels,
            ref: `${base}_c${cycle}_l${n}_e${i + 1}`, entities: [], at: null, taken: null,
        };
    });
    return { parts: 0, pace, slots, cleared: null };
}

/**
 * The events that establish a true Dungeon once, at its first relevant contact (he is at it or in it, or sets off for
 * it). Its own content entry (lore.json dungeons[].living) where there is one, else drawn from its classification
 * (theme, levels, Rank) by the rules: a Dungeon play discovered later works the same way. Nothing of Alaric's decides.
 */
export function establishEvents(s, content, root) {
    const p = s.places?.[root];
    if (!p?.dungeon?.real || livingOf(s, root)) return [];
    const spec = content.dungeons?.get(root)?.living || {};
    const L = content.rules.living;
    const key = `${s.rng?.seed ?? 0}|${root}`;
    const c = p.dungeon;
    // every level from the top to the deepest the world named (a level 2 means a level 1 above it)
    const numbers = [...Object.keys(c.levels || {}), ...Object.keys(spec.floors || {})].map(Number).filter((n) => n > 0);
    const levels = Array.from({ length: Math.max(1, ...numbers) }, (_, i) => i + 1);
    const rootRank = c.rank || c.levels?.[levels[0]] || { min: 'F', max: 'F' };
    const floors = {};
    for (const n of levels) {
        const rank = c.levels?.[n] || c.rank || rootRank;
        const own = spec.floors?.[n];
        const last = n === levels.at(-1);
        floors[n] = {
            rank, spans: spansFor(content, rank),
            slots: own?.slots || generatedSlots(content, c.theme, n, last, `${key}|l${n}`),
            manifest: own?.manifest || (last ? 'the deepest halls fall still, and whatever ruled them rules no longer' : 'the way deeper lies open and quiet; nothing on this level stands against him any more'),
            sealed: own?.sealed === true, pace: own?.pace || L.pace,
        };
    }
    const requires = spec.gate?.requires !== undefined ? spec.gate.requires : /\b(?:guild|registered)\b/i.test(c.control || '') ? 'guild' : null;
    const dungeon = {
        id: root, name: p.name, since: { turn: s.turn, minute: s.clock.minute }, seed: key,
        gate: { names: spec.gate?.names || [], text: spec.gate?.text || `the way into ${p.name}`, requires, fee_cp: spec.gate?.fee_cp || 0, keeper: spec.gate?.keeper || null, ...(spec.gate?.contract_free ? { contract_free: true } : {}) },
        capacity: spec.capacity || L.capacity_by_rank[rootRank.min] || 8,
        reset_min: (spec.reset_days || L.reset_days_by_rank[rootRank.min] || 3) * DAY,
        floors, parties: partiesFor(content, root, levels.length, spec.parties ?? L.parties, key),
        resources_spec: spec.resources || [],
        cycle: 1, cycle_start: s.clock.minute, booked_to: s.clock.minute, inside: {}, clears: [], ahead: null, pass: null,
    };
    dungeon.run = runFor(dungeon, 1);
    return [{ t: 'dungeon.established', d: { dungeon } }];
}

function runFor(d, cycle, only = null) {
    const floors = {};
    for (const [n, f] of Object.entries(d.floors)) if (!only || only.includes(Number(n))) floors[n] = floorRun(f, Number(n), cycle, d.seed, d.id);
    return { floors, resources: Object.fromEntries((d.resources_spec || []).map((r) => [r.id, r.qty])) };
}

// ------------------------------------------------------------------------------------------------ reducer
/** Apply one dungeon.* event in place (domain.js hands them here). */
export function applyLivingEvent(state, e) {
    if (!state.dungeons) state.dungeons = {};
    const d = e.d || {};
    if (e.t === 'dungeon.established') { state.dungeons[d.dungeon.id] = clone(d.dungeon); return; }
    const x = state.dungeons[d.id];
    if (!x) throw new Error(`unknown dungeon ${d.id}`);
    const slotOf = () => x.run.floors[d.floor]?.slots.find((sl) => sl.id === d.slot);
    switch (e.t) {
        case 'dungeon.ahead': x.ahead = d.ahead ? clone(d.ahead) : null; break;
        case 'dungeon.slot': { const sl = slotOf(); if (sl && x.cycle === d.cycle) Object.assign(sl, clone(d.set)); break; }
        case 'dungeon.part': if (x.cycle === d.cycle && x.run.floors[d.floor]) x.run.floors[d.floor].parts += 1; break;
        case 'dungeon.cleared':
            if (x.cycle === d.cycle && x.run.floors[d.floor]) x.run.floors[d.floor].cleared = { turn: d.turn, minute: d.minute, credit: d.credit };
            x.clears = [...(x.clears || []), clone(d)].slice(-24);
            break;
        case 'dungeon.reset':
            x.cycle = d.cycle;
            x.cycle_start = d.cycle_start;
            for (const [n, run] of Object.entries(d.floors)) x.run.floors[n] = clone(run);
            if (d.resources) x.run.resources = { ...x.run.resources, ...d.resources };
            x.deferred = d.deferred || [];
            x.ahead = null;
            break;
        case 'dungeon.party':
            if (d.kind === 'enter') x.inside = { ...x.inside, [d.party]: { floor: 0, until: d.until } };
            else if (d.kind === 'exit') { const { [d.party]: _, ...rest } = x.inside; x.inside = rest; }
            else if (d.kind === 'floor' && x.inside[d.party]) x.inside[d.party].floor = d.floor;
            break;
        case 'dungeon.booked': x.booked_to = d.to; break;
        case 'dungeon.pass': x.pass = d.pass ? clone(d.pass) : null; break;
        case 'dungeon.resource': x.run.resources = { ...x.run.resources, [d.node]: d.left }; break;
        default: throw new Error(`unknown dungeon event ${e.t}`);
    }
}
export const LIVING_EVENTS = ['dungeon.established', 'dungeon.ahead', 'dungeon.slot', 'dungeon.part', 'dungeon.cleared', 'dungeon.reset', 'dungeon.party', 'dungeon.booked', 'dungeon.pass', 'dungeon.resource'];

// ------------------------------------------------------------------------------------------------ slots
const DONE = (s, id) => { const e = s.entities[id]; return !e || e.status === 'dead' || !!e.fled || !!e.surrendered_to; };
/** Is a slot of this cycle resolved: met and every individual of it dead, fled or surrendered, or taken by a company? */
export const resolved = (s, sl) => !!sl.taken || (sl.entities.length > 0 && sl.entities.every((id) => DONE(s, id)));
/** Did Alaric's side resolve it (deaths in his fights, flight from him, surrender to him)? */
const byPc = (s, sl) => !sl.taken && sl.entities.length > 0 && sl.entities.every((id) => DONE(s, id));
/** Identity reservation is not an encounter: old materialised slots already have at/met_turn. */
export const slotMet = sl => !!sl.at || sl.met_turn != null;
/** The next encounter of a level nobody has met (in order; a guard or boss only once the rest of its level is resolved). */
function nextWaiting(s, run) {
    const waiting = run.slots.findIndex((sl) => !slotMet(sl) && !resolved(s, sl));
    if (waiting < 0) return null;
    const sl = run.slots[waiting];
    if (sl.role !== 'minion' && run.slots.slice(0, waiting).some((x) => x.role === 'minion' && !resolved(s, x))) return null;
    return { sl, waiting };
}
/** The next slot of a level the engine places ahead of him: its encounter, or a quiet part first (its pace). */
export function nextSlot(s, d, floor) {
    const run = d.run.floors[floor];
    if (!run) return null;
    const w = nextWaiting(s, run);
    if (!w) return null;
    const { sl, waiting } = w;
    // the quiet parts before it (pace): the k-th new part of the level holds it (what others dealt with takes no part)
    const due = run.pace.slice(0, waiting + 1).reduce((n, q, j) => n + (run.slots[j].taken ? 0 : q + 1), 0);
    return run.parts + 1 >= due ? sl : { quiet: true, slot: sl };
}

/** The slot a creature the reply brings in fills: the one the engine placed ahead (by its ref, else by its kind there). */
export function slotForNew(s, content, d, arrivedAt, prose = '') {
    const root = trueDungeonOf(s, arrivedAt || s.scene.at);
    const x = livingOf(s, root);
    if (!x) return null;
    const floor = floorAt(s, arrivedAt || s.scene.at);
    const slots = x.run.floors[floor]?.slots || [];
    const known = slots.find((sl) => (normText(sl.ref) === normText(d.ref) || (sl.story_ref && normText(sl.story_ref) === normText(d.ref))) && sl.entities.length);
    if (known) return resolved(s, known) ? null : { root, floor, slot: known, existing: true };
    if (d.present === false) {
        const exact = slots.find(sl => normText(sl.ref) === normText(d.ref) && !sl.taken && !sl.entities.length);
        return exact ? { root, floor, slot: exact } : null;
    }
    const free = slots.filter((sl) => !sl.entities.length && !sl.taken);
    const hit = (sl) => ({ root, floor, slot: sl, story_ref: d.ref });
    // Keep normal pacing and the engine's explicit encounter refs.
    const ahead = x.ahead?.turn === s.turn && x.ahead.cycle === x.cycle ? [x.ahead, ...(x.ahead.next ? [x.ahead.next] : [])] : [];
    for (const a of ahead.filter((a) => a.floor === floor)) {
        const sl = free.find((sl) => sl.id === a.slot);
        if (sl && (normText(d.ref) === normText(sl.ref) || (d.anchor === sl.anchor && d.more !== true))) return hit(sl);
    }
    // An explicitly visible creative foe may fill one unambiguous compatible slot, including a later guard.
    // Occupied slots (even elsewhere), other floors/cycles, and larger/smaller groups are never repurposed.
    if (d.present !== true || d.more === true || d.threat === false || ahead.some((a) => a.floor === floor && free.some((sl) => sl.id === a.slot))) return null;
    const guardScene = /\b(?:warden|guardian|guard(?:s|ing)?|patrol\w*|circuit|sentinel)\b/i.test([d.ref, d.species, ...(d.desc || []), prose].join(' '));
    const compatible = free.filter((sl) => sl.anchor === d.anchor && sl.count === (d.count ?? 1) && (sl.role === 'minion' || (sl.role === 'guard' && guardScene)));
    const named = compatible.find((sl) => normText(d.ref) === normText(sl.ref) || (sl.name && normText(d.ref) === normText(sl.name)));
    if (named) return hit(named);
    if (compatible.length === 1) return hit(compatible[0]);
    return null;
}
/** Is this creature.new a slot of this cycle that is already resolved (the boss he killed, shown again)? */
export function resolvedSlotNamed(s, d) {
    for (const x of Object.values(s.dungeons || {})) {
        for (const [n, f] of Object.entries(x.run.floors)) {
            const sl = f.slots.find((y) => normText(y.ref) === normText(d.ref) || (y.story_ref && x.id === trueDungeonOf(s, s.scene.at) && Number(n) === floorAt(s, s.scene.at) && normText(y.story_ref) === normText(d.ref)) || (y.name && normText(y.name) === normText(d.ref)));
            if (sl && resolved(s, sl)) return { root: x.id, floor: Number(n), slot: sl };
        }
    }
    return null;
}

/** The events that make the created individuals the slot's (their level, type, name) before their profile is fixed. */
export function slotEntityEvents(s, content, hit, ids, at) {
    const { root, floor, slot } = hit;
    const x = livingOf(s, root);
    const type = slot.type || content.rules.living.role_type[slot.role] || 'normal';
    const ev = ids.map((id, i) => ({ t: 'entity.updated', d: { id, set: {
        level: slot.levels[i] ?? slot.levels[0], type, slot: { dungeon: root, cycle: x.cycle, floor, id: slot.id, role: slot.role },
        ...(slot.name && ids.length === 1 ? { name: titled(slot.name.replace(/^the /i, '')), known_name: null } : {}),
    } } }));
    ev.push({ t: 'dungeon.slot', d: { id: root, cycle: x.cycle, floor, slot: slot.id, set: { entities: ids, at, ...(at ? { met_turn: s.turn } : {}), ...(hit.story_ref && /^[a-z]+\.[a-z0-9_]+$/i.test(hit.story_ref) && hit.story_ref !== slot.ref ? { story_ref: hit.story_ref } : {}) } } });
    return ev;
}

// ------------------------------------------------------------------------------------------------ the engine's encounter ahead
/**
 * At his GO in or into an established Dungeon, into a part not yet seen: what the next part holds (the engine's
 * encounter, a quiet part, or nothing left), stored (dungeon.ahead) and told. Back through rooms he knows holds nothing new.
 * @returns {{events: object[], lines: string[]}|null}
 */
export function aheadEvents(s, content, { into = false, root: dest = null, floor: to = null } = {}) {
    const root = dest || trueDungeonOf(s, s.scene.at);
    const x = livingOf(s, root);
    if (!x || !into) return null;
    const here = s.scene.at === root || trueDungeonOf(s, s.scene.at) !== root ? 1 : floorAt(s, s.scene.at);
    const floor = Math.max(1, to || here);
    const lines = [];
    const say = (sl) => `${sl.count > 1 ? `${sl.count} ${sl.species}${/s$/.test(sl.species) ? '' : 's'}` : sl.name ? `${titled(sl.name)} (${sl.species})` : `a ${sl.species}`}`;
    const n = nextSlot(s, x, floor);
    let ahead = null;
    if (n && !n.quiet) {
        ahead = { turn: s.turn, cycle: x.cycle, floor, slot: n.id, ref: n.ref };
        lines.push(`DUNGEON AHEAD (the engine's) — going on into a part of level ${floor} he has not seen: there he meets ${say(n)}${n.role === 'boss' ? ', the master of this Dungeon' : n.role === 'guard' ? `, the guardian of level ${floor}` : ''}. That is where this walk ends; bring exactly these, and the quiet way there is told in passing (a sound, a shadow or old tracks without consequence are no stop).`);
    } else if (n?.quiet) {
        lines.push(`DUNGEON AHEAD (the engine's) — the next part of level ${floor} he goes into holds no foe: a room, a find, a fork or a sign of what lies further; no fight there. Carry the walk to it, not further.`);
    } else if (x.run.floors[floor]?.slots.some(sl => !resolved(s, sl))) {
        lines.push(`DUNGEON AHEAD (the engine's) — previously met foes of level ${floor} still stand; no further encounter is placed until the remaining threats allow it. Invent no extra guardian or boss.`);
    } else if (x.run.floors[floor]) {
        lines.push(`DUNGEON AHEAD (the engine's) — level ${floor} holds nothing more that stands against him this cycle${x.run.floors[floor].cleared ? ' (cleared)' : ''}; what he finds there is quiet. Invent no new guardian or boss.`);
    }
    // the way down: its next level's first encounter, when the way to it is open
    const below = x.run.floors[floor + 1];
    const open = below && (!x.floors[floor]?.sealed || x.run.floors[floor]?.cleared);
    if (below && open) {
        const m = nextSlot(s, x, floor + 1);
        if (m && !m.quiet) {
            if (ahead) ahead.next = { floor: floor + 1, slot: m.id, ref: m.ref };
            else ahead = { turn: s.turn, cycle: x.cycle, floor: floor + 1, slot: m.id, ref: m.ref };
            lines.push(`If he goes DOWN to level ${floor + 1} instead, the first part there holds ${say(m)}.`);
        }
    } else if (below && !open) lines.push(`The way down to level ${floor + 1} is sealed until level ${floor}'s guardian falls: he cannot go down yet.`);
    const others = companiesOn(s, x, floor).map((p) => `${p.name} (${p.size}, led by ${p.leader}; ${p.affiliation}${p.npc ? `; ${p.npc}` : ''})`);
    if (others.length) lines.push(`OTHER ADVENTURERS on level ${floor} now: ${others.join(' · ')}. If the story brings them in, they are these people, not new ones.`);
    return { events: [{ t: 'dungeon.ahead', d: { id: root, ahead } }], lines };
}

const leaderId = (p) => `npc.${p.id.replace(/^party\./, 'party_')}`;
/** The companies inside on a level now (0: at the gate), with the id of their leader once he can meet them. */
function companiesOn(s, x, floor) {
    return (x.parties || []).filter((p) => x.inside?.[p.id] && x.inside[p.id].floor === floor)
        .map((p) => ({ ...p, npc: s.entities[leaderId(p)] ? leaderId(p) : null }));
}
/**
 * The leaders of the companies where he is (his level, or the gate), as people of the world once: the same person
 * every time he meets that company (src/v4/identity.js resolves them by id), never a new one; not in his scene until
 * the story brings them in.
 */
function leaderEvents(s, x) {
    if (trueDungeonOf(s, s.scene.at) !== x.id) return [];
    return companiesOn(s, x, floorAt(s, s.scene.at)).filter((p) => !p.npc).map((p) => ({ t: 'entity.created', d: { entity: {
        id: leaderId(p), kind: 'npc', name: p.leader, known_name: null, descriptors: [p.leader.toLowerCase(), `leader of ${p.name}`, 'adventurer'],
        traits: `leads ${p.name} (${p.size} strong), ${p.affiliation}`, status: 'alive', location: x.id, created: { turn: s.turn, minute: s.clock.minute },
        source: { kind: 'engine', party: p.id }, card: {}, template: 'adventurer', party: p.id,
    } } }));
}

// ------------------------------------------------------------------------------------------------ gate and capacity
/** How many are inside now: the companies, and Alaric with whoever travels with him when he is inside. */
export function occupancy(s, x) {
    const parties = Object.keys(x.inside || {}).reduce((n, id) => n + ((x.parties || []).find((p) => p.id === id)?.size || 0), 0);
    // his own place inside (whoever travels with him took theirs at the gate: gateCheck's group)
    const pc = insideOf(s, x.id) ? 1 : 0;
    return { parties, pc, total: parties + pc };
}

/**
 * Patch 8.1 (§3): the active Guild contract whose work the gate lets in without its fee, or null. Only where the gate
 * waives it for authorized work (gate.contract_free, its content entry for a Dungeon established before 8.1), and only
 * for a contract booked for this very Dungeon (q.dungeon, a level clear's own) and its kind of work (a cull or a
 * clear): derived from state, never a stored free pass; another Dungeon's contract, or one done or given up, waives
 * nothing. No text of the contract is read here.
 */
export function waiverOf(s, content, root) {
    const x = livingOf(s, root);
    if (!x || !(x.gate.contract_free ?? content?.dungeons?.get(root)?.living?.gate?.contract_free)) return null;
    return Object.values(s.quests || {}).find((q) => q.kind === 'guild_contract' && q.status === 'active' && (q.dungeon || q.clear?.dungeon) === root
        && (!!q.clear || (q.objectives || []).some((o) => o.verb === 'DEFEAT'))) || null;
}

/**
 * The gate as it stands for him now (the System panel and gateCheck read the same): refused and why, the fee due, or
 * waived by a contract, or his paid pass; how many are inside.
 * @returns {null|{refuse?: string, full?: boolean, fee?: number, keeper: string, waived?: object, pass?: object, occupancy: object}}
 */
export function gateState(s, content, root, { group = 1 } = {}) {
    const x = livingOf(s, root);
    if (!x) return null;
    const keeper = x.gate.keeper || 'the gate-keeper';
    const o = occupancy(s, x);
    if (x.gate.requires === 'guild' && !s.guild?.membership) return { refuse: `${x.gate.keeper || 'the gate'} lets only registered Guild members into ${x.name}; he is not registered`, keeper, occupancy: o };
    if (o.parties + group > x.capacity) return { refuse: `${x.name} is full: ${o.parties} adventurers are inside and it holds at most ${x.capacity} at once; he has to wait until some come out`, full: true, keeper, occupancy: o };
    if (!(x.gate.fee_cp > 0)) return { keeper, occupancy: o };
    if (x.pass) return { keeper, pass: x.pass, occupancy: o };
    const waived = waiverOf(s, content, root);
    if (waived) return { keeper, waived, occupancy: o };
    return { fee: x.gate.fee_cp, keeper, occupancy: o };
}

/**
 * Whether Alaric may pass the gate into the Dungeon now (from outside it, or from its gate into a room): its access
 * rule, its fee (paid only with his consent: an offer he accepts; waived for a contract's work) and how many are inside.
 * Inside already: nothing.
 * @returns {null|{refuse: string}|{fee: number, keeper: string}}
 */
export function gateCheck(s, content, root, { group = 1 } = {}) {
    if (!livingOf(s, root) || insideOf(s, root)) return null;
    const g = gateState(s, content, root, { group });
    if (g.refuse) return { refuse: g.refuse };
    return g.fee ? { fee: g.fee, keeper: g.keeper } : null;
}

/** Patch 8.1: the canonical offer of a gate's fee (one id per Dungeon; one decision for it). */
export const gateOfferId = (root) => `offer.gate.${root.replace(/^loc\./, '')}`;

/**
 * Patch 8.1 (§1, live 21.10.2026 10:17: the watchman's own "entry, 10 cp" was paid, no pass followed, and the gate asked
 * the same 10 cp again): the gate's own fee offer, created once when he stands at a gate whose fee is due (not first
 * when he tries to enter), so the planner, the catalog and the panel all know the one price. Idempotent: an open one
 * stays. One whose fee is no longer due (a contract waives it, a pass) is withdrawn.
 */
export function gateOfferEvents(s, content, root, fee = null) {
    const x = livingOf(s, root);
    if (!x) return [];
    const id = gateOfferId(root);
    const open = s.offers?.[id]?.status === 'open';
    const due = fee ?? (insideOf(s, root) ? null : gateCheck(s, content, root)?.fee ?? null);
    if (due && !open) return [
        { t: 'offer.created', d: { offer: { id, seller: 'gate', at: root, status: 'open', canon: true, gate: root, turn: s.turn, lines: [{ id: 'l1', what: `Entry to ${x.name}`, kind: 'service', service: 'dungeon_entry', qty: 1, price_cp: due }] } } },
        { t: 'decision.opened', d: { decision: { id: `dec.gate.${root.replace(/^loc\./, '')}`, kind: 'payment', what: `the entry fee of ${x.name}`, offer: id, at: root, turn: s.turn, price_cp: due } } },
    ];
    if (!due && open && !insideOf(s, root)) return [
        { t: 'offer.closed', d: { id, status: 'expired' } },
        ...(s.decisions || []).filter((d) => d.offer === id).map((d) => ({ t: 'decision.closed', d: { id: d.id, status: 'expired' } })),
    ];
    return [];
}

// what an offer of entry to a Dungeon is called: entry, admission, a toll, the way in (never a torch or a guide's lamp)
const ENTRY = /\b(?:entry|enter(?:ing)?|entrance|admission|admit(?:tance)?|toll|fee|pass(?:age)?|way in|let (?:him|you|alaric) (?:in|through|pass))\b/;
/**
 * Patch 8.1 (§1): whether an offer line the story made at a Living Dungeon's gate sells entry to it, which only the
 * gate's own fee (the engine's) does. A guard may still sell a torch, a map or any other thing of his own.
 */
export function entryLine(s, root, line) {
    const x = livingOf(s, root);
    if (!x || line?.kind !== 'service') return false;
    const t = normText(line.what || '');
    return ENTRY.test(t) || t.includes(normText(x.name)) || (x.gate.names || []).some((g) => t.includes(normText(g)));
}

/**
 * Patch 8 (13A, live 21.10.2026 02:22): the gate a report or an arrival means is the Dungeon itself, its way in (the
 * ruined chapel above the Old Crown Catacombs): a name its gate goes by, or one naming the Dungeon and a word of where it
 * lies. Null for anything else; never a room inside.
 */
export function entranceOf(s, content, ref) {
    const name = normText(typeof ref === 'string' ? s.places?.[ref]?.name || '' : ref?.new?.name || ref?.new || '');
    if (!name || (typeof ref === 'string' && (!s.places?.[ref] || s.places[ref].visited || s.places[ref].level))) return null;
    const matches = [];
    for (const p of Object.values(s.places || {}).filter((x) => x.dungeon?.real)) {
        if (typeof ref === 'string' && ref !== p.id && s.places[ref]?.parent !== p.id) continue;
        const x = livingOf(s, p.id);
        const gate = (x?.gate.names?.length ? x.gate.names : content.dungeons?.get(p.id)?.living?.gate?.names) || [];
        const own = normText(p.name);
        const where = normText(p.where || '').split(' ').filter((w) => w.length > 4);
        const isGate = gate.some((g) => name.includes(normText(g)));
        const namesIt = name.includes(own) && where.some((w) => name.split(' ').includes(w));
        const under = typeof ref === 'string' ? s.places[ref]?.parent === p.id : ref?.new?.parent === p.id;
        const parent = typeof ref === 'string' ? s.places[ref]?.parent : ref?.new?.parent;
        const realm = typeof parent === 'string' ? s.places[parent]?.realm || (s.places[parent]?.kind === 'realm' ? parent : null) : null;
        const exactGate = gate.some(g => name === normText(g));
        if ((isGate && (name.includes(own) || under)) || namesIt || (exactGate && realm && realm === p.realm)) matches.push(p.id);
    }
    return matches.length === 1 ? matches[0] : null;
}

/** Why an arrival into a room of a sealed level is refused (its level above not cleared), else null. */
export function sealRefusal(s, to, level = null) {
    const root = trueDungeonOf(s, to);
    const x = livingOf(s, root);
    if (!x || to === root) return null;
    const floor = Number.isInteger(level) && level > 0 ? level : floorAt(s, to);
    const above = x.floors[floor - 1];
    if (!above?.sealed || x.run.floors[floor - 1]?.cleared) return null;
    // a room of that level he has already stood in was reached before the seal mattered (an old save): not cut off
    if (s.places[to]?.visited) return null;
    return `the way down to level ${floor} of ${x.name} is sealed until the guardian of level ${floor - 1} falls`;
}

// ------------------------------------------------------------------------------------------------ the cycle
/**
 * The events the passing of time and what happened bring about, in order up to now: establishing the Dungeon he is at,
 * its resets, the companies' days, the levels cleared and what that means for his contracts. Called after each step
 * of a turn that can change them (src/v4/turn.js, src/v4/world.js, src/engine.js).
 */
export function syncEvents(s, content, emit, { touch = [] } = {}) {
    const here = trueDungeonOf(s, s.scene.at);
    for (const root of new Set([here, ...touch].filter(Boolean))) for (const e of establishEvents(s, content, root)) emit(e);
    for (const x of Object.values(s.dungeons || {})) {
        // in the order of the world's time: the companies' days up to a reset that falls due, the reset, the rest
        const due = x.cycle_start + x.reset_min;
        if (!s.encounter && s.clock.minute >= due) partyEvents(s, content, emit, x.id, due);
        cycleEvents(s, content, emit, x.id);
        partyEvents(s, content, emit, x.id, s.clock.minute);
        clearEvents(s, content, emit, x.id);
        for (const e of leaderEvents(s, s.dungeons[x.id])) emit(e);
        // his paid entry lasts while he is inside, and ends once he is out again
        const pass = s.dungeons[x.id].pass;
        if (pass && insideOf(s, x.id) && !pass.inside) emit({ t: 'dungeon.pass', d: { id: x.id, pass: { ...pass, inside: true } } });
        else if (pass?.inside && !insideOf(s, x.id)) emit({ t: 'dungeon.pass', d: { id: x.id, pass: null } });
        // Patch 8.1: at its gate, the gate's own fee is on offer as soon as it is due (and withdrawn once it is not)
        if (s.scene.at === x.id && !s.encounter) for (const e of gateOfferEvents(s, content, x.id)) emit(e);
    }
}

/** A level he is on is renewed only once he has left it, at the latest when its next reset falls due as well. */
function cycleEvents(s, content, emit, root) {
    const x = s.dungeons[root];
    if (s.encounter) return; // never in the middle of a fight
    const due = x.cycle_start + x.reset_min;
    const mine = insideOf(s, root) ? floorAt(s, s.scene.at) : null;
    if (s.clock.minute >= due) {
        const periods = Math.floor((s.clock.minute - x.cycle_start) / x.reset_min);
        const cycle = x.cycle + periods;
        const forced = (x.deferred || []).length > 0; // a level deferred once is renewed now in any case
        const keep = mine && !forced ? [mine] : [];
        const all = Object.keys(x.floors).map(Number);
        const fresh = runFor({ ...x }, cycle, all.filter((n) => !keep.includes(n)));
        emit({ t: 'dungeon.reset', d: { id: root, cycle, from: x.cycle, cycle_start: x.cycle_start + periods * x.reset_min, floors: fresh.floors, resources: fresh.resources, deferred: keep, minute: s.clock.minute } });
        for (const e of decayEvents(s, root, all.filter((n) => !keep.includes(n)))) emit(e);
        return;
    }
    // a level kept for him while he was on it: renewed now that he has left it
    const waiting = (x.deferred || []).filter((n) => n !== mine);
    if (waiting.length) {
        const fresh = runFor({ ...x }, x.cycle, waiting);
        emit({ t: 'dungeon.reset', d: { id: root, cycle: x.cycle, from: x.cycle, cycle_start: x.cycle_start, floors: fresh.floors, resources: null, deferred: (x.deferred || []).filter((n) => n === mine), minute: s.clock.minute } });
        for (const e of decayEvents(s, root, waiting)) emit(e);
    }
}

/**
 * The rule for what lies about at a reset: what nobody took of the old cycle (the story's finds left on the floor of a
 * renewed level) is gone; what was ever Alaric's (dropped or set down by him) stays where he left it, and so does
 * anything in a room he stands in.
 */
function decayEvents(s, root, floors) {
    const out = [];
    for (const o of Object.values(s.objects || {})) {
        const at = o.holder?.loc;
        if (!at || at === s.scene.at || o.had_pc || trueDungeonOf(s, at) !== root || !floors.includes(floorAt(s, at)) || at === root) continue;
        out.push({ t: 'object.consumed', d: { id: o.id, by: 'dungeon_reset' } });
    }
    return out;
}

/** The plan of a company for a day: when it goes in and out (or null: it does not come that day). */
function dayPlan(content, x, p, day) {
    const L = content.rules.living.party;
    const k = `${x.seed}|${p.id}|d${day}`;
    if (roll(`${k}|visit`) % 100 >= L.visit_pct) return null;
    const enter = day * DAY + between(`${k}|in`, L.enter_min);
    return { enter, exit: enter + between(`${k}|stay`, L.stay_min) };
}

/**
 * The companies' days, booked step by step up to now: in, down a level, out. On a level they come to, they deal with
 * the next encounter of it nobody has met yet (one per visit, in its order), never with what Alaric met or what stands
 * on his level while he is there; no XP or loot of theirs is ever his.
 */
function partyEvents(s, content, emit, root, to) {
    const x = s.dungeons[root];
    const from = x.booked_to;
    if (to <= from || !(x.parties || []).length) return;
    const steps = [];
    for (let day = Math.floor(from / DAY) - 1; day <= Math.floor(to / DAY); day++) {
        for (const p of x.parties) {
            const plan = dayPlan(content, x, p, day);
            if (!plan) continue;
            steps.push({ at: plan.enter, p, kind: 'enter', until: plan.exit });
            for (let f = 1; f <= p.reach; f++) {
                const at = plan.enter + f * content.rules.living.party.floor_min;
                if (at < plan.exit) steps.push({ at, p, kind: 'floor', floor: f });
            }
            steps.push({ at: plan.exit, p, kind: 'exit' });
        }
    }
    for (const st of steps.filter((y) => y.at > from && y.at <= to).sort((a, b) => a.at - b.at || a.p.id.localeCompare(b.p.id))) {
        const now = s.dungeons[root];
        // Patch 8.4.3 (live 22.10.2026 09:00: with Alaric inside, Wren Company (2) and Ashen Hands (4) both came in, 7 of
        // 6): a company comes in only where every place it takes is free, his own counted (occupancy's total)
        if (st.kind === 'enter') { if (!now.inside[st.p.id] && occupancy(s, now).total + st.p.size <= now.capacity) emit({ t: 'dungeon.party', d: { id: root, party: st.p.id, kind: 'enter', until: st.until, minute: st.at } }); continue; }
        if (!now.inside[st.p.id]) continue;
        if (st.kind === 'exit') { emit({ t: 'dungeon.party', d: { id: root, party: st.p.id, kind: 'exit', minute: st.at } }); continue; }
        // a step of a day before this cycle began dealt with what the reset renewed: nothing of it stays
        if (st.at < now.cycle_start) continue;
        // down only past a seal that is broken
        if (st.floor > 1 && now.floors[st.floor - 1]?.sealed && !now.run.floors[st.floor - 1]?.cleared) continue;
        emit({ t: 'dungeon.party', d: { id: root, party: st.p.id, kind: 'floor', floor: st.floor, minute: st.at } });
        if (insideOf(s, root) && floorAt(s, s.scene.at) === st.floor) continue; // not before his eyes
        // the next of the level's encounters nobody has met, in its order (a guardian or boss only after the rest)
        const w = nextWaiting(s, s.dungeons[root].run.floors[st.floor] || { slots: [] });
        if (w) emit({ t: 'dungeon.slot', d: { id: root, cycle: s.dungeons[root].cycle, floor: st.floor, slot: w.sl.id, set: { taken: { party: st.p.id, minute: st.at } } } });
        clearEvents(s, content, emit, root);
    }
    emit({ t: 'dungeon.booked', d: { id: root, to } });
}

/**
 * A level all of whose encounters are resolved is cleared, once per cycle. Credit: Alaric's when his side resolved at
 * least half of them, or its guardian or boss; else the companies'. A Guild contract to clear that level that he can no
 * longer earn this way (cleared by others first) is withdrawn by the Guild, without penalty.
 */
function clearEvents(s, content, emit, root) {
    const x = s.dungeons[root];
    for (const [n, f] of Object.entries(x.run.floors)) {
        if (f.cleared || !f.slots.length || !f.slots.every((sl) => resolved(s, sl))) continue;
        const pc = f.slots.filter((sl) => byPc(s, sl)).length;
        const head = f.slots.find((sl) => sl.role !== 'minion');
        const credit = pc * 2 >= f.slots.length || (head && byPc(s, head)) ? 'pc' : 'others';
        emit({ t: 'dungeon.cleared', d: { id: root, cycle: x.cycle, floor: Number(n), credit, pc, others: f.slots.length - pc, total: f.slots.length, turn: s.turn, minute: s.clock.minute } });
        if (credit === 'others') for (const e of withdrawnEvents(s, root, Number(n))) emit(e);
    }
}

/** The contracts to clear a level that others cleared first: active ones fail (no penalty), listed ones come down. */
function withdrawnEvents(s, root, floor) {
    const out = [];
    for (const q of Object.values(s.quests || {}).filter((y) => clearOf(s, y)?.dungeon === root && clearOf(s, y).floor === floor && ['active', 'listed'].includes(y.status))) {
        const since = (q.history || []).find((h) => h.status === (q.status === 'active' ? 'active' : 'listed'))?.turn ?? 0;
        if ((s.dungeons[root].clears || []).some((c) => c.floor === floor && c.credit === 'pc' && c.turn >= since)) continue;
        out.push({ t: 'quest.status', d: { id: q.id, from: q.status, to: q.status === 'active' ? 'failed' : 'taken_by_other', at: root, by: 'others_cleared' } });
    }
    return out;
}

/**
 * Patch 8.3: the encounters a Living Dungeon holds at the world's time, as drawn: its cycle's (the one a reset due by
 * now brings, as cycleEvents books it when he comes, or, not established yet, the first, as establishing it will fix
 * it: the same deterministic draws, runFor). Nothing is emitted. Null for no Living Dungeon.
 */
export function runNow(s, content, root) {
    const x = livingOf(s, root) || establishEvents(s, content, root)[0]?.d.dungeon || null;
    if (!x) return null;
    const periods = x.reset_min > 0 && s.clock.minute >= x.cycle_start + x.reset_min ? Math.floor((s.clock.minute - x.cycle_start) / x.reset_min) : 0;
    return periods ? runFor(x, x.cycle + periods) : x.run;
}

/**
 * How many of what a contract counts a Dungeon holds, over its levels or the levels named. Patch 8.3 (live 22.10.2026:
 * "Skeletons in the Burial Galleries (3)" where its cycle held 2 restless skeletons and 2 risen bones; 8.1 counted
 * the smallest count of each encounter whose possible kinds included the one asked): the encounters as drawn for the
 * cycle he meets (runNow), each with its drawn kind and number. counts(slot) says which count, by the rule the engine
 * counts the kills with (guild.js cullKind). Nothing hidden is told. Null for no Living Dungeon.
 */
export function cullPopulation(s, content, root, counts, { levels = null } = {}) {
    const run = runNow(s, content, root);
    if (!run) return null;
    let n = 0;
    for (const [k, f] of Object.entries(run.floors)) {
        if (levels?.length && !levels.includes(Number(k))) continue;
        for (const sl of f.slots) if (counts(sl)) n += sl.count || 1;
    }
    return n;
}
/** The name of the encounter a Living Dungeon's creature belongs to (its slot's spec), or null. */
export function slotNameOf(s, e) {
    const sl = e?.slot && s.dungeons?.[e.slot.dungeon]?.floors?.[e.slot.floor]?.slots?.find((y) => y.id === e.slot.id);
    return sl?.name || null;
}

// ------------------------------------------------------------------------------------------------ Guild contracts
/** The level of a Dungeon a contract is to clear: its where names the level ("Old Crown Catacombs, level 1"). */
export function clearTarget(s, q) {
    for (const o of (q.objectives || []).filter((y) => ['ATTACK', 'DEFEAT', 'CLEAR'].includes(y.verb) && !(Number.isInteger(y.qty) && y.qty > 1))) {
        const text = normText(`${o.where || ''} ${o.what || ''}`);
        const lv = /\blevel (\d+)\b/.exec(text);
        if (!lv) continue;
        const p = Object.values(s.places || {}).find((x) => x.dungeon?.real && text.includes(normText(x.name)));
        if (p) return { dungeon: p.id, floor: Number(lv[1]) };
    }
    return null;
}
/** The level a contract is to clear: booked with it, else read from its objectives (a contract of an older campaign). */
export const clearOf = (s, q) => q?.clear || (q?.kind === 'guild_contract' ? clearTarget(s, q) : null);
/** Whether he has cleared the level a contract names since he took it (his credit, any cycle). */
export function clearDone(s, q) {
    const c = clearOf(s, q);
    if (!c) return null;
    const x = livingOf(s, c.dungeon);
    const since = (q.history || []).find((h) => h.status === 'active')?.turn ?? 0;
    const mine = (x?.clears || []).find((y) => y.floor === c.floor && y.credit === 'pc' && y.turn >= since);
    const name = x?.name || placeName(s, c.dungeon);
    return { ok: !!mine, name, floor: c.floor, text: mine ? 'cleared by him' : x?.run.floors[c.floor]?.cleared ? 'cleared by others' : 'not cleared yet' };
}

// ------------------------------------------------------------------------------------------------ resources
/**
 * Patch 8: gathering on a level of a Living Dungeon that holds a find of its own (the glimmer crystal vein): its whole
 * yield of this cycle, once; spent until the Dungeon renews. Null where the level holds none (gathering as before).
 * @returns {null|{events: object[], line: string}}
 */
export function gatherEvents(s, root, what = '') {
    const x = livingOf(s, root);
    if (!x || !insideOf(s, root)) return null;
    const floor = floorAt(s, s.scene.at);
    const nodes = (x.resources_spec || []).filter((r) => r.floor === floor);
    const want = normText(what);
    const node = nodes.find((r) => want && normText(`${r.name} ${r.item}`).split(' ').some((w) => w.length > 3 && want.includes(w))) || nodes[0];
    if (!node) return null;
    const left = x.run.resources?.[node.id] ?? 0;
    if (left <= 0) return { events: [], line: `GATHERS — the ${node.name} is spent this cycle: nothing to take until the Dungeon renews (the engine's).` };
    const id = `obj.res.${slug(root.replace(/^loc\./, ''))}.${node.id}`;
    const held = s.objects?.[id]?.holder?.entity === 'pc';
    const events = [
        held ? { t: 'object.added', d: { id, qty: left } } : { t: 'object.created', d: { object: { id: s.objects?.[id] ? `${id}.c${x.cycle}` : id, name: node.item, kind: 'resource', stack: true, qty: left, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: s.turn, how: 'gathered', at: s.scene.at }, rank: x.floors[floor]?.rank?.min || 'F', value_cp: node.value_cp || 1 } } },
        { t: 'dungeon.resource', d: { id: root, node: node.id, left: 0 } },
    ];
    return { events, item: node.item, line: `GATHERS — ${left} ${node.item} from the ${node.name} (the engine's: booked into his pack); the ${node.name} is spent until the Dungeon renews.` };
}

// ------------------------------------------------------------------------------------------------ return stone
/** A Return Stone: crushed inside a Dungeon, out of a fight, it carries him to that Dungeon's gate (the events, or why not). */
export function returnStone(s, content, o) {
    if (!o?.return_stone) return null;
    const root = trueDungeonOf(s, s.scene.at);
    if (s.encounter || (s.pending_combat || []).length) return { refuse: 'not in a fight' };
    if (!root || s.scene.at === root) return { refuse: root ? `he stands at the gate of ${s.places[root].name} already` : 'it works only inside a Dungeon' };
    const events = [];
    for (const who of s.scene.present.filter((id) => id !== 'pc' && s.entities[id]?.kind === 'creature' && s.entities[id].status !== 'dead')) {
        events.push({ t: 'entity.updated', d: { id: who, set: { left: { at: s.scene.at, minute: s.clock.minute, turn: s.turn, leg: false } } } });
    }
    events.push({ t: 'object.consumed', d: { id: o.id, by: 'pc', ...((o.qty ?? 1) > 1 ? { qty: 1 } : {}) } });
    events.push({ t: 'scene.moved', d: { at: root, location: settlementOf(s, root) || realmOf(s, root), place: placeName(s, root), reset_present: true, track_history: true } });
    return { events, to: root };
}

// ------------------------------------------------------------------------------------------------ views
const roleText = (sl) => (sl.role === 'boss' ? 'boss' : sl.role === 'guard' ? 'guardian' : 'foes');
/**
 * Patch 8.1 (§8, live 21.10.2026 10:17: "glass beetle — met, still standing" with one of the two dead): how a met
 * encounter stands, counted from its own individuals: how many of them are up, and how the others went down.
 */
function slotState(s, sl) {
    if (sl.taken) return 'dealt with by another company';
    if (!sl.entities.length) return 'not met';
    if (!slotMet(sl) && !resolved(s, sl)) return 'known, not met';
    const n = sl.entities.length;
    const up = sl.entities.filter((id) => !DONE(s, id)).length;
    const dead = sl.entities.filter((id) => s.entities[id]?.status === 'dead').length;
    const fled = sl.entities.filter((id) => s.entities[id]?.status !== 'dead' && s.entities[id]?.fled).length;
    const gave = n - up - dead - fled;
    const down = [dead ? `${dead} dead` : '', fled ? `${fled} fled` : '', gave > 0 ? `${gave} surrendered` : ''].filter(Boolean).join(', ');
    if (n === 1) return up ? 'met, alive' : `defeated (${down})`;
    return up ? `${up} of ${n} alive${down ? `; ${down}` : ''}` : `all ${n} defeated (${down})`;
}
/** A slot's encounter by its name, or its kind and how many of them (met: the individuals the engine made). */
const slotName = (sl) => (sl.name ? titled(sl.name) : `${sl.entities.length || sl.count} ${sl.species}`);
/** What he knows of a level (the HUD, the planner): met encounters, cleared or not; nothing he has not seen. */
export function floorText(s, x, n, { all = false } = {}) {
    const f = x.run.floors[n];
    if (!f) return null;
    const seen = f.slots.filter((sl) => all || sl.entities.length || f.cleared);
    const head = f.slots.find((sl) => sl.role !== 'minion');
    const bits = [f.cleared ? `CLEARED this cycle${f.cleared.credit === 'pc' ? ' (by him)' : ' (by others)'}` : `${f.slots.filter((sl) => resolved(s, sl) && (all || sl.entities.length)).length} of ${all ? f.slots.length : '?'} threats dealt with`];
    if (all) bits.push(...f.slots.map((sl) => `${slotName(sl)} (${roleText(sl)}): ${slotState(s, sl)}`));
    else if (seen.length) bits.push(...seen.map((sl) => `${slotName(sl)} — ${slotState(s, sl)}`));
    if (head && (all || slotMet(head)) && !f.cleared) bits.push(`its ${roleText(head)} ${resolved(s, head) ? 'is down' : 'still stands'}`);
    return `level ${n} (${rankText(x.floors[n].rank)}): ${bits.join('; ')}`;
}

/**
 * Patch 8.1 (§5): when the Dungeon renews, to the minute: "2d 4h", "59m"; "renewal pending" once it is due but held (a
 * fight, or the level he stands on), never a negative time.
 */
export function renewText(s, x) {
    const left = x.cycle_start + x.reset_min - s.clock.minute;
    if (left <= 0) return 'renewal pending';
    const d = Math.floor(left / DAY);
    const h = Math.floor((left % DAY) / 60);
    const m = left % 60;
    const time = d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
    const held = (x.deferred || []).length ? `; level ${x.deferred.join(', ')} renewal pending (once he has left it)` : '';
    return `renews in ${time}${held}`;
}

/** The HUD rows of the Dungeon he is in or at. */
export function hudRows(s) {
    const root = trueDungeonOf(s, s.scene.at);
    const x = livingOf(s, root);
    if (!x) return [];
    const mine = floorAt(s, s.scene.at);
    const rows = [];
    const levels = Object.keys(x.run.floors).map(Number).filter((n) => n === mine || x.run.floors[n].cleared || x.run.floors[n].slots.some((sl) => sl.entities.length));
    rows.push(['Levels', levels.map((n) => floorText(s, x, n)).join(' · ') || 'nothing met yet']);
    const o = occupancy(s, x);
    rows.push(['Dungeon cycle', `cycle ${x.cycle} (${renewText(s, x)}) · inside: ${o.total}/${x.capacity}`]);
    return rows;
}

/**
 * Patch 8.1 (§4): the System card of a Living Dungeon's gate, from the engine's state only: status, how many are inside
 * of how many, his party, when it renews, the Ranks of the levels he knows (the Guild's record or his own visit, never a
 * hidden one), who may enter, the fee (due, waived, paid). "ENTER DUNGEON?" is information: entering is his GO.
 * Shown on arrival at the gate, on looking at it, and when entry or its fee is pending or refused, never every message.
 */
export function gateCard(s, content, root, { group = 1 } = {}) {
    const x = livingOf(s, root);
    if (!x) return [];
    const p = s.places[root];
    const c = p.dungeon || {};
    const g = gateState(s, content, root, { group });
    const record = guildRecord(c, p.by);
    const been = new Set(Object.values(s.places).filter((q) => q.visited && Number.isInteger(q.level) && trueDungeonOf(s, q.id) === root).map((q) => q.level));
    const levels = Object.keys(x.floors).map(Number).filter((n) => !(c.hidden || []).includes(`level:${n}`) && (record.includes(`level:${n}`) || been.has(n)));
    const ranks = levels.map((n) => `level ${n}: Rank ${rankText(c.levels?.[n] || x.floors[n].rank)}`);
    const fee = !(x.gate.fee_cp > 0) ? 'none' : g.pass ? `${x.gate.fee_cp} cp, paid (valid until he comes out)` : g.waived ? `Waived — authorized contract ("${g.waived.title}")` : `${x.gate.fee_cp} cp (the gate's own offer; paid only when he agrees)`;
    return [
        `SYSTEM — DUNGEON GATE · ${x.name}`,
        `Status: ${g.full ? 'FULL' : g.refuse ? 'CLOSED to him' : 'OPEN'} · Inside: ${g.occupancy.total}/${x.capacity} · His party: ${group} · Cycle ${x.cycle}: ${renewText(s, x)}`,
        `Known levels: ${ranks.join(' · ') || 'none on record'}`,
        `Access: ${x.gate.requires === 'guild' ? 'registered Guild members' : 'anyone'} · Fee: ${fee}`,
        g.refuse ? `ENTRY REFUSED — ${g.refuse}` : 'ENTER DUNGEON? — he goes in when he says so (this card books nothing)',
    ];
}
/** Patch 8.1: does an act at a gate look at the gate itself (its entrance, its display), by its names? */
export function namesGate(s, root, text) {
    const x = livingOf(s, root);
    const t = normText(text || '');
    return !!x && (/\b(?:gate|entrance|entry|way in|display|sigil|runes?)\b/.test(t) || (x.gate.names || []).some((g) => t.includes(normText(g))));
}

/** The narrator's lines for the Dungeon he is in (state only: the level, its threats, a clear to show, companies). */
export function contextLines(s, content = null) {
    const root = trueDungeonOf(s, s.scene.at);
    const x = livingOf(s, root);
    if (!x) return [];
    const mine = floorAt(s, s.scene.at);
    const L = [];
    if (mine === 0) {
        const g = gateState(s, content, root);
        // Patch 8.1: the fee is the gate's own, fixed by the engine (one offer); nobody asks another or a second time
        const fee = !x.gate.fee_cp ? '' : g.pass ? 'his entry fee is paid; ' : g.waived ? `no fee for him: his Guild contract "${g.waived.title}" is work the gate lets in; ` : `entry fee ${x.gate.fee_cp} cp, the engine's one fixed price (only when he agrees; nobody asks it twice or sells entry); `;
        L.push(`GATE — ${titled(x.gate.text)}${x.gate.keeper ? `, kept by ${x.gate.keeper}` : ''}: ${x.gate.requires === 'guild' ? 'registered Guild members only; ' : ''}${fee}at most ${x.capacity} inside at once, ${g.occupancy.parties} inside now.`);
    }
    const here = companiesOn(s, x, mine).filter((p) => p.npc);
    if (here.length) L.push(`OTHER ADVENTURERS ${mine === 0 ? 'at the gate' : `on level ${mine}`} now (the engine's; if the story brings them in, they are these people): ${here.map((p) => `${p.name}, ${p.size} strong, led by ${p.leader} (${p.npc}; ${p.affiliation})`).join(' · ')}.`);
    const f = x.run.floors[Math.max(1, mine)];
    if (f) {
        L.push(`LEVEL ${Math.max(1, mine)} (the engine's, cycle ${x.cycle}): ${floorText(s, x, Math.max(1, mine), { all: true })}. The story may give a visible foe a creative appearance within one uniquely matching free slot of this level (same body plan and count), even before an earlier encounter is resolved; its slot fixes Level, power and loot. Otherwise only the engine adds foes, guardian and boss; no extra key or delivery condition opens its seal; a foe it marks defeated stays so until the Dungeon renews; never bring a slain guardian or boss back.`);
        if (f.cleared?.turn === s.turn && f.cleared.credit === 'pc') L.push(`LEVEL ${Math.max(1, mine)} CLEARED NOW — show it in the world: ${x.floors[Math.max(1, mine)].manifest}.`);
        const taken = f.slots.filter((sl) => sl.taken && !sl.told);
        if (taken.length) L.push(`SIGNS OF OTHERS — ${taken.map((sl) => `${sl.name ? titled(sl.name) : `the ${sl.species}s`} of this level ${sl.count > 1 ? 'were' : 'was'} already dealt with by ${(x.parties.find((p) => p.id === sl.taken.party) || {}).name || 'another company'} earlier`).join('; ')}: remains, scorch marks, tracks; nothing of it is his.`);
    }
    if ((x.deferred || []).length || s.clock.minute >= x.cycle_start + x.reset_min - 60) L.push(`The Dungeon renews itself on its own cycle; changes never happen before his eyes.`);
    return L;
}

/** The catalog's lines (planner and extractor): the level's state; the extractor also the encounter the engine placed. */
export function catalogLines(s, { extractor = false } = {}) {
    const root = trueDungeonOf(s, s.scene.at);
    const x = livingOf(s, root);
    if (!x) return [];
    const mine = Math.max(1, floorAt(s, s.scene.at));
    const L = [floorText(s, x, mine)];
    if (extractor && x.ahead?.turn === s.turn) {
        for (const a of [x.ahead, x.ahead.next].filter(Boolean)) {
            const sl = x.run.floors[a.floor]?.slots.find((y) => y.id === a.slot);
            if (sl && !slotMet(sl) && !resolved(s, sl)) L.push(`ENGINE ENCOUNTER (level ${a.floor}): when the reply shows ${sl.name ? titled(sl.name) : `the ${sl.species}${sl.count > 1 ? 's' : ''}`} where he arrives, report creature.new ref "${sl.ref}", species "${sl.species}", anchor "${sl.anchor}", count ${sl.count}`);
        }
    }
    for (const p of companiesOn(s, x, mine).filter((y) => y.npc)) L.push(`${p.npc} leads ${p.name} (inside on this level)`);
    return L;
}
