// PULSE package A (patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md §5, §6 A): the one deterministic event
// window of a narrative turn of a ruleset-2 planner campaign. The engine decides whether the world brings something
// into this turn and of what coarse kind; the story shapes it inside those bounds, the world applier (src/v4/world.js)
// enforces them. ROAD AHEAD (Patch 5) is the travel frame of this window, not a second chance.
//
//   pulseBegin   before the handlers: the turn's static exclusions (fight, Dungeon, learning, a repeated input)
//   handlers     register what exposes him (pulseLeg: an authorized leg of a journey; pulsePause: a pause the engine
//                booked) and what he actively sought (pulseSought: an authorized/successful search for a population)
//   pulseFinish  after the handlers: the first exposure in the order of his message, the dynamic exclusions, held
//                threats, the one draw (seed|turn, never the clock, the step number or his words), the kind, the
//                narrator line and auth.pulse; one pulse.rolled event for a real draw only
//
// Package C (W7a, plan §6 C): a pause that is the first exposure is decided in its own handler, before its time and
// recovery are booked (pulseClaimPause); pulseFinish then keeps that decision and draws nothing. Out in the land a
// danger, obstacle or strange window, in a settlement's street a trouble window cuts it short (from 30 booked minutes
// on at a minute in [15, M-15], below that at its end) and stops the later steps of his message (resolveCommands:
// 'rest interrupted'); a safe lodging is never cut short.
//
// Package B (plan §6 B, §12.5): inside a true Living Dungeon the window has the frame dungeon. Its DANGER is only ever
// a free minion slot of his level and cycle (living.js wanderSlot), bound for the reply by the existing dungeon.ahead
// (wander: true) together with the draw; the slot is met only by a valid creature (dungeon.slot). A DUNGEON AHEAD turn
// draws nothing, and a turn never holds a second reservation. The Dungeon's own firewall (dungeon_foe, its slots)
// stays the only rule for its foes (governs: false). No model call, no die of the fight's dice stream.
import { hash32, normText, formatClock } from '../util.js';
import { lineage, placeName, settlementOf, namesKind, sameKinds, kindOf as kindWords } from './domain.js';
import { rulesetOf } from '../content.js';
import { dayPart, outdoorsInTown } from './settlement.js';
import { trueDungeonOf } from './dungeon.js';
import { livingOf, floorAt, wanderSlot, companiesHere, slotSay } from './living.js';
import { sceneHandle } from './scene_handles.js';

export const PULSE_VERSION = 1;
const PHASES = ['day', 'evening', 'night'];
const PAUSES = new Set(['rest', 'sleep', 'wait']);
const LEARNING = new Set(['train', 'study']);
const HARD_STOP = new Set(['buy', 'pay', 'guild.register', 'offer.accept']);
const KILL = new Set(['ATTACK', 'DEFEAT', 'KILL', 'HUNT', 'SLAY', 'CULL']);
// Package C (plan §6 C table): what a pause's window may bring, by the safety of where he pauses, and which kinds cut
// it short. Every other kind happens before he settles or as the pause ends; a safe lodging never draws a hostile kind
const PAUSE_BARRED = {
    dungeon: new Set(),
    safe: new Set(['danger', 'obstacle', 'trouble']),
    street: new Set(['danger', 'obstacle']),
    exposed: new Set(),
};
const INTERRUPTS = {
    dungeon: new Set(['danger']), // package B: only the level's own encounter, bound to its slot, cuts a Dungeon rest short
    safe: new Set(),
    street: new Set(['trouble']),
    exposed: new Set(['danger', 'obstacle', 'strange']),
};
// the engine's cause of a cut-short pause (binding; the story shapes only its details)
const CAUSE_TEXT = {
    danger: "ONE group of this land's people or creatures comes upon him with hostile intent (its strength is the land's, AREA LEVELS and populations, never his; nobody else joins it)",
    obstacle: 'the weather or the ground turns against him: a storm, biting cold, rising water or smoke (no foe)',
    strange: 'an unexplained light or sound very close to him (no effect on him unless he acts on it)',
    trouble: 'someone is at his things or a quarrel breaks out right beside him (nobody takes anything of his or strikes first in this reply)',
};
export const CAUSE_SHORT = {
    danger: "a hostile group of this land's people or creatures came upon him",
    obstacle: 'the weather or the ground turned against him',
    strange: 'an unexplained light or sound close by',
    trouble: 'someone at his things or a quarrel right beside him',
};

const phaseAt = (minute) => dayPart({ clock: { minute } });
const seedOf = (s) => s.meta?.seed ?? s.rng?.seed ?? 0;
const draw = (s, tag, mod) => parseInt(hash32(`${seedOf(s)}|${s.turn}|${tag}`), 16) % mod;
/** Is he inside a true Dungeon (past its gate)? The gate itself is the land outside. */
export const insideDungeon = (s, at = s.scene.at) => { const r = at ? trueDungeonOf(s, at) : null; return !!r && r !== at; };
/** Does PULSE govern this campaign's story turns (the planner path of ruleset 2)? */
export const pulseCampaign = (s, envx) => !!envx?.c && rulesetOf(s) >= 2;

/** The threats still here (Patch 5's rule): living creatures that are a threat, the scene's threats; his company not. */
export function heldThreats(s, go = null) {
    const goWith = new Set(go?.with || []);
    return (s.scene.present || []).filter((id) => id !== 'pc' && !goWith.has(id) && s.entities[id] && s.entities[id].status !== 'dead'
        && (s.entities[id].kind === 'creature' ? s.entities[id].threat !== false : (s.scene.threats || []).includes(id)));
}

/** The frame of a scene or pause where he stands: dungeon (package B), street, inside (a settlement) or wild. */
export function sceneFrame(s, content, at = s.scene.at) {
    if (insideDungeon(s, at) && livingOf(s, trueDungeonOf(s, at))) return 'dungeon';
    if (settlementOf(s, at)) return outdoorsInTown(s, content, at) ? 'street' : 'inside';
    return 'wild';
}

/**
 * The safety of a pause where he stands (plan §6 C): safe (a lodging: any room of a settlement, a lodging he was
 * granted here, or a place under a roof out in the land), street (a settlement's street), exposed (out in the open).
 * Only the pause's safety reads the roof; the frame, chance and kinds stay package A's (sceneFrame).
 */
export function pauseSafety(s, content, at = s.scene.at) {
    const frame = sceneFrame(s, content, at);
    if (frame === 'dungeon') return 'dungeon';
    if (frame === 'inside') return 'safe';
    if (frame === 'street') return 'street';
    return roofed(s, content, at) ? 'safe' : 'exposed';
}

/** Out in the land, is this place a roof over him (a house, a mill, a hall; a room; a lodging he was granted here)? */
function roofed(s, content, at) {
    const p = s.places[at];
    if (!p) return false;
    if ((s.services || []).some((x) => x.service === 'lodging' && x.at === at && s.clock.minute - (x.minute ?? 0) <= 1440)) return true;
    if (p.kind === 'interior') return true;
    const R = content.rules.pulse.pause || {};
    const exact = new Set(R.roofed_words || []);
    const suffix = R.roofed_suffixes || [];
    return normText(p.name || '').split(/[^a-z]+/).filter(Boolean).map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
        .some((w) => exact.has(w) || suffix.some((x) => w.length > x.length && w.endsWith(x)));
}

/** Before the handlers. Returns the turn's PULSE context (ctx.pulse), or null where PULSE does not run. */
export function pulseBegin(s, content, ordered, envx) {
    if (!pulseCampaign(s, envx) || !content.rules.pulse) return null;
    const P = { v: PULSE_VERSION, governs: true, reason: null, legs: [], pauses: [], sought: [], dungeonAhead: false, claim: null, interruptedAt: null };
    const inputs = s.inputs || [];
    const [prev, now] = [inputs.at(-2), inputs.at(-1)];
    if (s.encounter || (s.pending_combat || []).length) P.reason = 'combat';
    else if (insideDungeon(s)) {
        // package B: a Living Dungeon's inside has its window (frame dungeon); its foe rule and DUNGEON AHEAD govern its foes
        P.governs = false;
        if (livingOf(s, trueDungeonOf(s, s.scene.at))) P.dungeon = trueDungeonOf(s, s.scene.at);
        else P.reason = 'dungeon';
    }
    // .168 (review of .167, P2): the static exclusions of every frame, inside a Living Dungeon too
    if (!P.reason && ordered.some((c) => c.type === 'activity' && LEARNING.has(c.kind))) P.reason = 'learning';
    else if (!P.reason && prev && now && prev.turn === now.turn - 1 && normText(prev.input) && normText(prev.input) === normText(now.input)) P.reason = 'repeat';
    return P;
}

/** A handler authorized a leg of a journey (the frame travel). */
export function pulseLeg(ctx, c, go, s) {
    ctx.pulse?.legs.push({ seq: c.seq ?? 0, go, minute: s.clock.minute });
}

/** The activity handler books a pause (rest, sleep, wait with the engine's minutes): before its time.advanced. */
export function pulsePause(ctx, c, minutes, s) {
    if (ctx.pulse && PAUSES.has(c.kind) && minutes > 0) ctx.pulse.pauses.push({ seq: c.seq ?? 0, kind: c.kind, minutes, start: s.clock.minute });
}

/**
 * Package C (plan §6 C, §12.4, §14.2): the activity handler is about to book a pause of `minutes` (the engine's, only a
 * pause it really books). When the pause is the first exposure of his message, the turn's one window is decided now,
 * before time and recovery are booked; pulseFinish keeps this decision and draws nothing more. Returns the cut
 * {seq, kind, after_min, of_min, at_end, cause, minute} when an open window cuts the pause short (the handler books
 * after_min minutes and their recovery only; at_end: under rules.pulse.pause.interrupt_min the pause is booked in full
 * and the event meets him as it ends), else null. Either way a cut stops the later steps of the message.
 */
export function pulseClaimPause(s, content, ctx, emit, c, minutes, ordered) {
    const P = ctx.pulse;
    if (!P || !PAUSES.has(c.kind) || !(minutes > 0)) return null;
    pulsePause(ctx, c, minutes, s);
    // a leg authorized earlier in the message is the first exposure (pulseFinish decides it); a second pause keeps the
    // first one's decision
    if (P.claim || P.legs.length) return null;
    const exposure = { type: 'pause', seq: c.seq ?? 0, pause: P.pauses.at(-1) };
    P.claim = settle(s, content, ctx, emit, ordered, exposure, true);
    const d = P.claim.d;
    if (!d?.open || !INTERRUPTS[d.safety]?.has(d.kind)) { emitDecision(s, emit, P.claim); return null; }
    const R = content.rules.pulse.pause || {};
    const least = R.interrupt_min ?? 30;
    const edge = Math.min(R.edge_min ?? 15, Math.floor(least / 2));
    const atEnd = minutes < least;
    // m in [edge, M - edge] (30 min: 15; 31 min: 15 or 16), its own key: the clock and the step do not move it
    const after = atEnd ? minutes : edge + draw(s, 'pulse.at', minutes - 2 * edge + 1);
    // later: how many later steps of the message this cut stops (resolveCommands refuses them, 'rest interrupted')
    const later = (ordered || []).filter((x) => (x.seq ?? 0) > exposure.seq).length;
    const cut = { seq: exposure.seq, kind: c.kind, after_min: after, of_min: minutes, at_end: atEnd, cause: d.kind, minute: s.clock.minute + after, later, ...(d.wander ? { who: d.wander.who, many: d.wander.many } : {}) };
    d.interrupt = cut;
    P.interruptedAt = exposure.seq;
    // the decision and its cut go into the record before the pause's time and recovery
    emitDecision(s, emit, P.claim);
    return cut;
}

/**
 * §5.8: a contact he actively sought, registered only by a handler that authorized the GO or resolved the search with
 * success: {population: place id} or {contract: quest id}. Raw planner intent registers nothing.
 */
export function pulseSought(ctx, entry) {
    const P = ctx.pulse;
    if (!P || !entry) return;
    if (!P.sought.some((x) => x.population === entry.population && x.contract === entry.contract)) P.sought.push(entry);
}

/** The populations and contracts an authorized GO seeks: a local hunt exploration, a habitat, a hunt's place. */
export function goSought(s, go, c) {
    const out = [];
    if (c.within && s.places[c.within]?.population) out.push({ population: c.within });
    const to = typeof c.to === 'string' ? c.to : null;
    if (to) {
        // §5.8: the habitat itself, or a place within the habitat of a hunt he has taken on; never every place below a
        // population (going to a farm in the orchard country is no hunt)
        if (s.places[to]?.population) out.push({ population: to });
        const line = lineage(s, to);
        for (const q of Object.values(s.quests || {})) if (q.status === 'active' && (q.taker || 'pc') === 'pc' && q.hunt?.at && line.includes(q.hunt.at) && !out.some((x) => x.population === q.hunt.at)) out.push({ population: q.hunt.at });
    }
    return out;
}

/**
 * The world hunts he has taken on whose habitat he stands in now: the contract the engine booked earlier is the
 * authorization (never his words alone). Only for the firewall's target exception (that population's creatures); it
 * neither blocks this turn's window nor covers anyone else.
 */
export function huntsHere(s) {
    const here = lineage(s, s.scene.at);
    return Object.values(s.quests || {}).filter((q) => q.status === 'active' && (q.taker || 'pc') === 'pc' && q.hunt?.at && here.includes(q.hunt.at))
        .map((q) => ({ population: q.hunt.at, hunt: q.id }));
}

/**
 * .163 (review of .162, R2): does a search's focus name this kind of creature? The engine's kind reading (namesKind:
 * noun phrase, stems, the kind words of the content) or the kind's head noun as a whole stemmed word of the focus
 * ("the next snapping turtle in the pond"). Never a part of a word ("broken boards" is no boar) and never a shared
 * adjective ("wild herbs" names no wild boar). It decides a firewall exception, so it reads words, not letters.
 */
export function focusNames(content, focus, kind, anchor = null) {
    const same = sameKinds(content);
    const one = (w) => same?.get(w) || w;
    const words = new Set([...kindWords(focus, { species: true }).words].map(one));
    const head = kindWords(kind, { species: true }).head;
    if (head && words.has(one(head))) return true;
    // the body plan's own kind words of the content (a boar's "swine"), as whole words too
    return (anchor?.kinds || []).some((k) => words.has(one(kindWords(k, { species: true }).head)));
}

/** What a successful search seeks: a population of this place (or above) its words name, a contract's target kind. */
export function searchSought(s, content, focus) {
    const out = [];
    if (!normText(focus)) return out;
    for (const id of lineage(s, s.scene.at)) {
        const pop = s.places[id]?.population;
        if (pop && focusNames(content, focus, pop.species, content.anchors.get(pop.anchor))) out.push({ population: id });
    }
    for (const q of Object.values(s.quests || {})) {
        if (q.status !== 'active' || (q.taker || 'pc') !== 'pc' || q.hunt) continue;
        if ((q.objectives || []).some((o) => KILL.has(o.verb) && o.what && focusNames(content, focus, o.what))) out.push({ contract: q.id });
    }
    return out;
}

/**
 * World applier: is this new creature the contact his authorized seeking this turn was for, where he actually is now
 * (the population of the place he reached, after the arrivals this reply applied)?
 */
export function soughtMatch(s, content, sought, id) {
    const e = s.entities[id];
    if (!e || e.kind !== 'creature' || !(sought || []).length) return false;
    const here = lineage(s, s.scene.at);
    for (const x of sought) {
        if (x.population && e.population_at === x.population && here.includes(x.population)) return true;
        if (x.contract && !e.population_at) {
            const q = s.quests?.[x.contract];
            const anchor = content.anchors.get(e.anchor || e.profile?.anchor);
            if (q?.status === 'active' && (q.objectives || []).some((o) => KILL.has(o.verb) && namesKind(o.what, e.species, anchor, sameKinds(content)))) return true;
        }
    }
    return false;
}

/** The frame (travel, wild, street, inside), the day part and the base chance of an exposure. */
function frameOf(s, content, exposure) {
    const R = content.rules.pulse;
    let frame, minute;
    if (exposure.type === 'travel') { frame = 'travel'; minute = exposure.leg.minute; }
    else if (exposure.type === 'pause') {
        frame = sceneFrame(s, content);
        // the day part covering most of the pause (no order of steps, no clock-dependent draw)
        const count = { day: 0, evening: 0, night: 0 };
        for (let m = 0; m < exposure.pause.minutes; m += 15) count[phaseAt(exposure.pause.start + m)]++;
        minute = null;
        exposure.phase = PHASES.reduce((a, b) => (count[b] > count[a] ? b : a), phaseAt(exposure.pause.start));
    } else { frame = sceneFrame(s, content); minute = s.clock.minute; }
    const phase = exposure.phase || phaseAt(minute);
    let base = R.base[frame][phase];
    // Patch 5's share stays the travel rule's: rules.travel.leg_event_pct scales the travel row
    const leg = content.rules.travel?.leg_event_pct;
    if (frame === 'travel' && Number.isFinite(leg) && R.base.travel.day) base = (base * leg) / R.base.travel.day;
    return { frame, phase, base };
}

/** The coarse kind of an open window: frame x day part weights, repetition, world evidence for danger. */
function kindOf(s, content, frame, phase, exposure, recent, dz = null) {
    const R = content.rules.pulse;
    const i = PHASES.indexOf(phase);
    const w = Object.fromEntries(Object.entries(R.kinds[frame] || {}).map(([k, v]) => [k, v[i] ?? v[0]]));
    if (exposure.type === 'pause') for (const k of PAUSE_BARRED[exposure.safety] || PAUSE_BARRED.safe) delete w[k];
    // package B: in a Dungeon danger is a free minion slot of his level, a meeting a company inside on it; a share
    // with nothing behind it falls away (the draw spreads it over the rest)
    if (dz) {
        if (!dz.slot) delete w.danger;
        if (!dz.companies.length) delete w.meeting;
    } else if (w.danger) {
        const line = lineage(s, s.scene.at);
        const backed = line.some((id) => s.places[id]?.population || Array.isArray(s.places[id]?.encounter_levels));
        if (!backed) w.danger = Math.floor(w.danger / 2);
    }
    const last = recent.at(-1)?.kind;
    for (const r of recent.slice(0, -1)) if (w[r.kind]) w[r.kind] = Math.ceil(w[r.kind] / 2);
    if (last && w[last] != null && Object.entries(w).some(([k, v]) => k !== last && v > 0)) w[last] = 0;
    const entries = Object.entries(w).filter(([, v]) => v > 0);
    const total = entries.reduce((a, [, v]) => a + v, 0);
    if (!total) return null;
    let r = draw(s, 'pulse.kind', total);
    for (const [k, v] of entries) { if (r < v) return k; r -= v; }
    return entries.at(-1)[0];
}

/**
 * Package B: what a Dungeon window can hold where he is: the level, the free minion slot that may come to him (none
 * when this turn already holds an encounter reference) and the companies inside on his level.
 */
function dungeonWindow(s, root) {
    const x = livingOf(s, root);
    const floor = Math.max(1, floorAt(s, s.scene.at));
    const bound = x?.ahead?.turn === s.turn; // a reference of this turn already: never a second one
    return { root, floor, cycle: x?.cycle ?? null, slot: x && !bound ? wanderSlot(s, root, floor) : null, companies: companiesHere(s, root, floor) };
}

/** Package B: has this turn already reserved the Dungeon's encounter (a wandering minion)? Then no DUNGEON AHEAD. */
export function aheadReserved(s, ctx, root) {
    const x = livingOf(s, root);
    return ctx.pulse?.reservedAhead === root || !!(x?.ahead?.wander && x.ahead.turn === s.turn);
}

/** The chance of this turn's window: base x the miss streak, capped (V3, plan §2 D). */
export function pulseChance(content, base, misses) {
    const R = content.rules.pulse;
    return Math.min(R.cap_abs, R.cap_mult * base, base * (1 + R.step * misses));
}

const KIND_TEXT = {
    meeting: 'a MEETING: people or creatures of this place who do not attack him (travellers, locals, an animal, someone who wants something of him)',
    life: 'TOWN LIFE: news, a commotion, a procession, a request or a market scene he can take up or ignore',
    trouble: 'TROUBLE: tension close to him (a quarrel, a demand, an attempted theft); nobody strikes first or takes anything of his in this reply',
    obstacle: 'an OBSTACLE: the way or the weather turns against him (a washed-out ford, a fallen tree, a storm); no foe',
    trace: 'a TRACE or FIND: tracks, remains, a sign of something nearby, a thing lying here; nothing is taken, followed or entered unless he chooses',
    strange: 'something STRANGE: an odd light, sound, magic or wonder; it has no effect on him unless he acts on it',
    danger: 'DANGER: ONE group of this land\'s people or creatures turns on him or bars his way with hostile intent; its strength is the land\'s (AREA LEVELS, populations), never his; nobody else joins it',
};
const FRAME_TEXT = { wild: 'out in the land', street: 'in the street', inside: 'indoors' };
// package B: the kinds inside a Dungeon (danger is its wandering minion, a meeting one of the companies inside)
const DUNGEON_TEXT = {
    meeting: (d) => `OTHER ADVENTURERS: ${d.company || 'a company inside'} of this level cross his way (the engine's company; they do not attack him)`,
    trace: () => 'a TRACE or FIND: tracks, remains, a sign of what lives on this level, a thing lying here; nothing is taken, followed or entered unless he chooses',
    strange: () => 'something STRANGE: an odd light, sound, draught or old magic of this place; it has no effect on him unless he acts on it',
};
const wanderCause = (who, many) => `${who} of this level ${many ? 'come' : 'comes'} upon him (the engine's encounter; exactly these, nothing else)`;

function toward(s, go) {
    return go?.to ? placeName(s, go.to) : go?.journey || go?.name || 'where he is going';
}

/** The one narrator line of this turn's window (ctx.extra): none for a quiet scene. */
function lineFor(s, content, d, exposure, held, later) {
    if (exposure.type === 'travel') {
        const to = toward(s, exposure.leg.go);
        // the held and quiet lines are Patch 5's own (ROAD AHEAD is this frame); only the open one is PULSE's
        if (held.length) return `THE ROAD — ${held.map((id) => sceneHandle(s, content, id)).join(', ')} ${held.length > 1 ? 'are' : 'is'} still here as he goes on toward ${to}: the story shows how they take it; nothing new meets him on this leg.`;
        if (!d?.open) return `THE ROAD — this leg toward ${to} is uneventful: no ambush, attack or obstacle meets him on it. Scenery, weather, far-off animals and harmless travellers are atmosphere; carry the travel forward until he arrives or the day's travel ends, and leave every choice about it to him.`;
        return `THE ROAD — PULSE (the engine's; ${d.phase}): on this leg toward ${to} ONE concrete thing happens: ${KIND_TEXT[d.kind]}. It is a real stop short of ${to} (the one exception to carrying the way forward); what he does about it is his decision. If nothing of this kind can fit what he does, nothing happens.`;
    }
    if (held.length) return `STILL HERE (PULSE) — ${held.map((id) => sceneHandle(s, content, id)).join(', ')}: the threat is still present; no new foe is brought into this scene while it is.`;
    if (!d?.open) return null;
    const dungeon = d.frame === 'dungeon';
    const where = dungeon ? `level ${d.floor}` : `${d.phase}, ${FRAME_TEXT[d.frame] || d.frame}`;
    const cause = (x) => (x.who ? wanderCause(x.who, x.many) : CAUSE_TEXT[x.cause]);
    if (exposure.type === 'pause' && d.interrupt) {
        const x = d.interrupt;
        const resting = x.kind !== 'wait';
        const wait = x.later ? ' his later steps of this message wait (NOT DONE), and' : '';
        if (x.at_end) return `REST INTERRUPTED (the engine's; ${where}) — at the end of his ${x.of_min} min ${x.kind} (booked in full${resting ? ', with its recovery' : ''}), at ${formatClock(x.minute)}: ${cause(x)}. Tell this cause as what meets him as his ${x.kind} ends;${wait} what he does now is his decision.`;
        return `REST INTERRUPTED (the engine's; ${where}) — at ${formatClock(x.minute)}, after ${x.after_min} of the ${x.of_min} min he chose for his ${x.kind} (booked: ${x.after_min} min${resting ? ', recovery for those minutes only' : ''}): ${cause(x)}. Tell this cause as what ends his ${x.kind}; he gets no more of it,${wait} what he does now is his decision.`;
    }
    const what = dungeon && DUNGEON_TEXT[d.kind] ? `${DUNGEON_TEXT[d.kind](d)}. No foe: the level's foes come only as the engine adds them` : KIND_TEXT[d.kind];
    if (exposure.type === 'pause') {
        const at = later ? ` (at the end of step ${exposure.pause.seq}, before his next steps)` : '';
        return `PULSE (the engine's; ${where}) — before he settles or as his ${exposure.pause.kind} ends${at}, ONE thing happens that he notices: ${what}. The ${exposure.pause.kind} itself is as booked.`;
    }
    // package B: the wandering minion comes to him here (not ahead where he arrives); the one encounter of this turn
    if (dungeon && d.wander) return `PULSE (the engine's; ${where}) — DANGER: ${d.wander.who} of this level ${d.wander.many ? 'come' : 'comes'} to him here, where he is (the engine's encounter for this reply; exactly these, nothing else, and no other foe). What he does about it is his decision.`;
    if (dungeon) return `PULSE (the engine's; ${where}) — ONE thing happens around him that he notices: ${what}. It moves him nowhere and binds him to nothing; what he does about it is his decision.`;
    return `PULSE (the engine's; ${where}) — ONE concrete thing happens around him that he notices: ${KIND_TEXT[d.kind]}. It takes nothing of his, moves him nowhere and binds him to nothing; what he does about it is his decision. If nothing of this kind can fit the scene, nothing happens.`;
}

/** The dynamic exclusions after the handlers (the resolutions of this message). */
function dynamicReason(s, ctx, ordered, exposure, early = false) {
    const P = ctx.pulse;
    if (P.dungeonAhead) return 'dungeon_ahead';
    // a leg from inside a Dungeon (going up and out) keeps package A's rule: no window on it
    if (P.dungeon && exposure.type === 'travel') return 'dungeon_leg';
    if (ctx.resolutions.some((r) => HARD_STOP.has(r.type) && r.status === 'pending')
        || (s.decisions || []).some((x) => x.kind === 'payment' && x.state === 'needs_confirmation' && x.turn === s.turn)) return 'hard_stop';
    const types = ordered.map((c) => c.type);
    if (types.includes('board.read') && types.every((t) => t === 'board.read' || t === 'go') && exposure.type !== 'travel') return 'board';
    // a pause claimed in its handler is booked: the message is not invalid (its own resolution follows)
    if (!early && ordered.length && !ctx.resolutions.some((r) => !['refused', 'clarify'].includes(r.status))) return 'invalid';
    if (P.sought.length && exposure.type !== 'travel') return 'sought';
    const st = s.pulse;
    if (exposure.type === 'pause' && st?.pause && st.pause.at === s.scene.at && st.pause.turn === s.turn - 1) return 'pause_block';
    return null;
}

/**
 * The one decision for an exposure: the exclusions known now, held threats, the one draw, the kind, its event.
 * early: claimed by a pause's handler before its booking (the later steps of the message are not resolved yet).
 */
function settle(s, content, ctx, emit, ordered, exposure, early = false) {
    const P = ctx.pulse;
    const R = content.rules.pulse;
    if (exposure.type === 'pause') exposure.safety = pauseSafety(s, content);
    let reason = P.reason || dynamicReason(s, ctx, ordered, exposure, early);
    const held = !reason ? heldThreats(s, exposure.leg?.go) : [];
    if (!reason && held.length) reason = 'held';
    let d = null;
    if (!reason) {
        const { frame, phase, base } = frameOf(s, content, exposure);
        const st = s.pulse || { misses: 0, recent: [] };
        const p = Math.round(pulseChance(content, base, st.misses) * 100) / 100;
        const roll = draw(s, 'pulse', 10000) / 100;
        // tests and scripted host smokes only (rules.pulse.force, null in the product): replaces the draw, optionally only
        // for a player message containing `when`; a list holds one such entry per message (the first that fits)
        const input = String(s.inputs?.at(-1)?.input || '');
        const forced = (Array.isArray(R.force) ? R.force : [R.force]).find((f) => f && typeof f.open === 'boolean' && (!f.when || input.includes(f.when))) || null;
        const open = forced ? forced.open : roll < p;
        const barred = exposure.type === 'pause' ? PAUSE_BARRED[exposure.safety] : null;
        const dz = frame === 'dungeon' ? dungeonWindow(s, P.dungeon) : null;
        const available = (k) => !dz || (k === 'danger' ? !!dz.slot : k === 'meeting' ? dz.companies.length > 0 : true);
        const kind = open ? (forced?.kind && !barred?.has(forced.kind) && available(forced.kind) ? forced.kind : kindOf(s, content, frame, phase, exposure, st.recent || [], dz)) : null;
        d = { v: PULSE_VERSION, turn: s.turn, at: s.scene.at, exposure: exposure.type, frame, phase, base: Math.round(base * 100) / 100, misses_before: st.misses, p, roll, open: open && !!kind, kind, leg: exposure.leg?.seq ?? null,
            ...(exposure.type === 'pause' ? { safety: exposure.safety } : {}), ...(dz ? { floor: dz.floor } : {}), ...(forced ? { forced: true } : {}) };
        // package B: an open danger in a Dungeon is its free minion slot, bound for this reply with the draw
        if (d.open && d.kind === 'danger' && dz?.slot) {
            d.wander = { dungeon: dz.root, cycle: dz.cycle, floor: dz.floor, slot: dz.slot.id, ref: dz.slot.ref, who: slotSay(dz.slot), many: dz.slot.count > 1 };
            P.reservedAhead = dz.root;
        }
        if (d.open && d.kind === 'meeting' && dz) d.company = dz.companies[0].name;
    }
    // early: the event goes out once a pause's cut is known (pulseClaimPause adds d.interrupt)
    const out = { exposure, reason, held, d, emitted: false };
    if (!early) emitDecision(s, emit, out);
    return out;
}

function emitDecision(s, emit, out) {
    if (out.emitted) return;
    out.emitted = true;
    if (out.d) emit({ t: 'pulse.rolled', d: out.d });
    // package B: the wandering minion's reservation, the turn's one encounter reference (living.js slotForNew reads it)
    const w = out.d?.wander;
    if (w) emit({ t: 'dungeon.ahead', d: { id: w.dungeon, ahead: { turn: s.turn, cycle: w.cycle, floor: w.floor, slot: w.slot, ref: w.ref, wander: true } } });
    // a later turn of the same pause block keeps the block going (no draw, no streak change)
    else if (out.reason === 'pause_block') emit({ t: 'pulse.pause', d: { at: s.scene.at, turn: s.turn } });
}

/** After the handlers: the one decision of this message, its event, its line and auth.pulse. */
export function pulseFinish(s, content, ctx, emit, ordered) {
    const P = ctx.pulse;
    if (!P) return;
    // a pause decided in its handler (package C) is this message's decision; else the first exposure in the order of
    // his message: a leg the engine authorized or a pause it booked; else the scene
    let out = P.claim;
    if (!out) {
        const firsts = [...P.legs.map((leg) => ({ type: 'travel', seq: leg.seq, leg })), ...P.pauses.map((pause) => ({ type: 'pause', seq: pause.seq, pause }))]
            .sort((a, b) => a.seq - b.seq);
        out = settle(s, content, ctx, emit, ordered, firsts[0] || { type: 'scene' });
    }
    const { exposure, reason, held, d } = out;
    const hunts = huntsHere(s);
    const auth = { v: PULSE_VERSION, governs: P.governs, rolled: false, exposure: exposure.type, ...(P.sought.length ? { sought: P.sought } : {}), ...(hunts.length ? { hunts } : {}) };
    if (d) {
        Object.assign(auth, { rolled: true, eligible: true, frame: d.frame, phase: d.phase, p: d.p, roll: d.roll, misses: d.misses_before, open: d.open, kind: d.kind,
            ...(d.safety ? { safety: d.safety } : {}), ...(d.interrupt ? { interrupt: d.interrupt } : {}) });
    } else {
        Object.assign(auth, { eligible: false, reason });
        if (reason === 'held') auth.held = held;
    }
    if (exposure.type === 'travel') ctx.auth.road = d?.open && d.kind === 'danger' ? 'open' : 'quiet';
    const later = exposure.type === 'pause' && ctx.resolutions.some((r) => r.seq > exposure.seq && !['refused', 'clarify'].includes(r.status));
    // a travel leg always has its one line (held, quiet or open), as ROAD AHEAD had; a scene or pause only when open or held
    const line = lineFor(s, content, d, exposure, reason === 'held' ? held : [], later);
    if (line) ctx.extra.push(line);
    ctx.auth.pulse = auth;
}

/**
 * Package C (plan §6 C 5): the binding fact of a pause the last turn's window cut short, for the next story turn once
 * (host turnBlock, as paidCardFacts): from the stored pulse.rolled event, never from the reply.
 */
export function restCutFacts(events) {
    return (events || []).filter((e) => e?.t === 'pulse.rolled' && e.d?.interrupt).map((e) => {
        const x = e.d.interrupt;
        const stopped = x.later ? ' His later steps of that message were not done.' : '';
        const short = x.who ? `${x.who} of this level came upon him` : CAUSE_SHORT[x.cause];
        return x.at_end
            ? `REST ENDED BY AN EVENT (the engine's, last turn): his ${x.of_min} min ${x.kind} ran in full; at ${formatClock(x.minute)}, as it ended, ${short}.${stopped}`
            : `REST CUT SHORT (the engine's, last turn): at ${formatClock(x.minute)}, after ${x.after_min} of ${x.of_min} min of his ${x.kind}, ${short}; time${x.kind === 'wait' ? '' : ' and recovery'} as booked (${x.after_min} min).${stopped}`;
    });
}
