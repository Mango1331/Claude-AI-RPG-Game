// Patch 8 (Living Dungeons, docs/PATCH8_LIVING_DUNGEONS.md): what makes a true Dungeon (src/v4/dungeon.js, its
// classification) a place to delve again and again. The engine owns each level's essential contents and progress; the
// narrator shapes the rooms, the mood and the meeting. No map is generated and no room count is fixed.
//
// Canonical state (one owner per fact, never two copies of it):
//   places[root].dungeon   the classification (theme, Rank, level Ranks, control): dungeon.js, unchanged
//   dungeons[root]         the living structure, fixed when the Dungeon is first established in play (dungeon.established):
//     gate {names, text, requires, fee_cp, keeper}, capacity, reset_min, seed, parties [the companies that delve it]
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
import { trueDungeonOf, dungeonOf, rankText } from './dungeon.js';
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
        gate: { names: spec.gate?.names || [], text: spec.gate?.text || `the way into ${p.name}`, requires, fee_cp: spec.gate?.fee_cp || 0, keeper: spec.gate?.keeper || null },
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
/** The next encounter of a level nobody has met (in order; a guard or boss only once the rest of its level is resolved). */
function nextWaiting(s, run) {
    const waiting = run.slots.findIndex((sl) => !sl.entities.length && !sl.taken);
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
export function slotForNew(s, content, d, arrivedAt) {
    const root = trueDungeonOf(s, arrivedAt || s.scene.at);
    const x = livingOf(s, root);
    if (!x?.ahead || x.ahead.turn !== s.turn || x.ahead.cycle !== x.cycle) return null;
    const floor = floorAt(s, arrivedAt || s.scene.at);
    const cands = [x.ahead, ...(x.ahead.next ? [x.ahead.next] : [])].filter((a) => a.floor === floor);
    for (const a of cands) {
        const sl = x.run.floors[a.floor]?.slots.find((y) => y.id === a.slot);
        if (!sl || sl.entities.length || sl.taken) continue;
        if (normText(d.ref) === normText(sl.ref)) return { root, floor: a.floor, slot: sl };
        // the reply named them otherwise: the engine's encounter of this kind, where he went on into a new part
        if (d.anchor === sl.anchor && d.more !== true) return { root, floor: a.floor, slot: sl };
    }
    return null;
}
/** Is this creature.new a slot of this cycle that is already resolved (the boss he killed, shown again)? */
export function resolvedSlotNamed(s, d) {
    for (const x of Object.values(s.dungeons || {})) {
        for (const [n, f] of Object.entries(x.run.floors)) {
            const sl = f.slots.find((y) => normText(y.ref) === normText(d.ref) || (y.name && normText(y.name) === normText(d.ref)));
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
    ev.push({ t: 'dungeon.slot', d: { id: root, cycle: x.cycle, floor, slot: slot.id, set: { entities: ids, at, met_turn: s.turn } } });
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
 * Whether Alaric may pass the gate into the Dungeon now (from outside it, or from its gate into a room): its access
 * rule, its fee (paid only with his consent: an offer he accepts) and how many are inside. Inside already: nothing.
 * @returns {null|{refuse: string}|{fee: number, keeper: string}}
 */
export function gateCheck(s, content, root, { group = 1 } = {}) {
    const x = livingOf(s, root);
    if (!x || insideOf(s, root)) return null;
    if (x.gate.requires === 'guild' && !s.guild?.membership) return { refuse: `${x.gate.keeper || 'the gate'} lets only registered Guild members into ${x.name}; he is not registered` };
    const o = occupancy(s, x);
    if (o.parties + group > x.capacity) return { refuse: `${x.name} is full: ${o.parties} adventurers are inside and it holds at most ${x.capacity} at once; he has to wait until some come out` };
    if (x.gate.fee_cp > 0 && !x.pass) return { fee: x.gate.fee_cp, keeper: x.gate.keeper || 'the gate-keeper' };
    return null;
}

/**
 * Patch 8 (13A, live 21.10.2026 02:22): the gate a report or an arrival means is the Dungeon itself, its way in (the
 * ruined chapel above the Old Crown Catacombs): a name its gate goes by, or one naming the Dungeon and a word of where it
 * lies. Null for anything else; never a room inside.
 */
export function entranceOf(s, content, ref) {
    const name = normText(typeof ref === 'string' ? s.places?.[ref]?.name || '' : ref?.new?.name || ref?.new || '');
    if (!name || (typeof ref === 'string' && (!s.places?.[ref] || s.places[ref].visited || s.places[ref].level))) return null;
    for (const p of Object.values(s.places || {}).filter((x) => x.dungeon?.real)) {
        if (typeof ref === 'string' && ref !== p.id && s.places[ref]?.parent !== p.id) continue;
        const x = livingOf(s, p.id);
        const gate = (x?.gate.names?.length ? x.gate.names : content.dungeons?.get(p.id)?.living?.gate?.names) || [];
        const own = normText(p.name);
        const where = normText(p.where || '').split(' ').filter((w) => w.length > 4);
        const isGate = gate.some((g) => name.includes(normText(g)));
        const namesIt = name.includes(own) && where.some((w) => name.split(' ').includes(w));
        const under = typeof ref === 'string' ? s.places[ref]?.parent === p.id : ref?.new?.parent === p.id;
        if (isGate && (name.includes(own) || under)) return p.id;
        if (namesIt) return p.id;
    }
    return null;
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
        if (st.kind === 'enter') { if (!now.inside[st.p.id] && occupancy(s, now).parties + st.p.size <= now.capacity) emit({ t: 'dungeon.party', d: { id: root, party: st.p.id, kind: 'enter', until: st.until, minute: st.at } }); continue; }
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
function slotState(s, sl) {
    if (sl.taken) return 'dealt with by another company';
    if (!sl.entities.length) return 'not met';
    if (resolved(s, sl)) return 'defeated';
    return 'met, still standing';
}
/** What he knows of a level (the HUD, the planner): met encounters, cleared or not; nothing he has not seen. */
export function floorText(s, x, n, { all = false } = {}) {
    const f = x.run.floors[n];
    if (!f) return null;
    const seen = f.slots.filter((sl) => all || sl.entities.length || f.cleared);
    const head = f.slots.find((sl) => sl.role !== 'minion');
    const bits = [f.cleared ? `CLEARED this cycle${f.cleared.credit === 'pc' ? ' (by him)' : ' (by others)'}` : `${f.slots.filter((sl) => resolved(s, sl) && (all || sl.entities.length)).length} of ${all ? f.slots.length : '?'} threats dealt with`];
    if (all) bits.push(...f.slots.map((sl) => `${sl.name ? titled(sl.name) : `${sl.count} ${sl.species}`} (${roleText(sl)}): ${slotState(s, sl)}`));
    else if (seen.length) bits.push(...seen.map((sl) => `${sl.name ? titled(sl.name) : sl.species} — ${slotState(s, sl)}`));
    if (head && (all || head.entities.length) && !f.cleared) bits.push(`its ${roleText(head)} ${resolved(s, head) ? 'is down' : 'still stands'}`);
    return `level ${n} (${rankText(x.floors[n].rank)}): ${bits.join('; ')}`;
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
    const left = Math.max(0, Math.ceil((x.cycle_start + x.reset_min - s.clock.minute) / DAY));
    rows.push(['Dungeon cycle', `cycle ${x.cycle} (renews in ${left} day${left === 1 ? '' : 's'}) · inside: ${o.total}/${x.capacity}`]);
    return rows;
}

/** The narrator's lines for the Dungeon he is in (state only: the level, its threats, a clear to show, companies). */
export function contextLines(s) {
    const root = trueDungeonOf(s, s.scene.at);
    const x = livingOf(s, root);
    if (!x) return [];
    const mine = floorAt(s, s.scene.at);
    const L = [];
    if (mine === 0) {
        const o = occupancy(s, x);
        L.push(`GATE — ${titled(x.gate.text)}${x.gate.keeper ? `, kept by ${x.gate.keeper}` : ''}: ${x.gate.requires === 'guild' ? 'registered Guild members only; ' : ''}${x.gate.fee_cp ? `entry fee ${x.gate.fee_cp} cp (only when he agrees to pay); ` : ''}at most ${x.capacity} inside at once, ${o.parties} inside now.`);
    }
    const here = companiesOn(s, x, mine).filter((p) => p.npc);
    if (here.length) L.push(`OTHER ADVENTURERS ${mine === 0 ? 'at the gate' : `on level ${mine}`} now (the engine's; if the story brings them in, they are these people): ${here.map((p) => `${p.name}, ${p.size} strong, led by ${p.leader} (${p.npc}; ${p.affiliation})`).join(' · ')}.`);
    const f = x.run.floors[Math.max(1, mine)];
    if (f) {
        L.push(`LEVEL ${Math.max(1, mine)} (the engine's, cycle ${x.cycle}): ${floorText(s, x, Math.max(1, mine), { all: true })}. Only the engine adds this level's foes, guardian and boss; a foe it marks defeated stays so until the Dungeon renews; never bring a slain guardian or boss back.`);
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
            if (sl && !sl.entities.length) L.push(`ENGINE ENCOUNTER (level ${a.floor}): when the reply shows ${sl.name ? titled(sl.name) : `the ${sl.species}${sl.count > 1 ? 's' : ''}`} where he arrives, report creature.new ref "${sl.ref}", species "${sl.species}", anchor "${sl.anchor}", count ${sl.count}`);
        }
    }
    for (const p of companiesOn(s, x, mine).filter((y) => y.npc)) L.push(`${p.npc} leads ${p.name} (inside on this level)`);
    return L;
}
