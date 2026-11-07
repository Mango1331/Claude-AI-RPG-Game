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
// Package A: a pause gets its window but is never cut short (package C); the inside of a Dungeon has none (package B:
// DUNGEON AHEAD stays its only encounter source). No model call, no die of the fight's dice stream.
import { hash32, normText } from '../util.js';
import { lineage, placeName, settlementOf, namesKind, sameKinds } from './domain.js';
import { rulesetOf } from '../content.js';
import { dayPart, outdoorsInTown } from './settlement.js';
import { trueDungeonOf } from './dungeon.js';
import { sceneHandle } from './scene_handles.js';

export const PULSE_VERSION = 1;
const PHASES = ['day', 'evening', 'night'];
const PAUSES = new Set(['rest', 'sleep', 'wait']);
const LEARNING = new Set(['train', 'study']);
const HARD_STOP = new Set(['buy', 'pay', 'guild.register', 'offer.accept']);
const KILL = new Set(['ATTACK', 'DEFEAT', 'KILL', 'HUNT', 'SLAY', 'CULL']);
// a pause of package A only brings what happens before he settles or as it ends
const PAUSE_BARRED = new Set(['danger', 'obstacle', 'trouble']);

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

/** The frame of a scene or pause where he stands: street, inside (a settlement) or wild (out in the land). */
export function sceneFrame(s, content, at = s.scene.at) {
    if (settlementOf(s, at)) return outdoorsInTown(s, content, at) ? 'street' : 'inside';
    return 'wild';
}

/** Before the handlers. Returns the turn's PULSE context (ctx.pulse), or null where PULSE does not run. */
export function pulseBegin(s, content, ordered, envx) {
    if (!pulseCampaign(s, envx) || !content.rules.pulse) return null;
    const P = { v: PULSE_VERSION, governs: true, reason: null, legs: [], pauses: [], sought: [], dungeonAhead: false };
    const inputs = s.inputs || [];
    const [prev, now] = [inputs.at(-2), inputs.at(-1)];
    if (s.encounter || (s.pending_combat || []).length) P.reason = 'combat';
    else if (insideDungeon(s)) { P.reason = 'dungeon'; P.governs = false; } // package B; DUNGEON AHEAD and its foe rule govern
    else if (ordered.some((c) => c.type === 'activity' && LEARNING.has(c.kind))) P.reason = 'learning';
    else if (prev && now && prev.turn === now.turn - 1 && normText(prev.input) && normText(prev.input) === normText(now.input)) P.reason = 'repeat';
    return P;
}

/** A handler authorized a leg of a journey (the frame travel). */
export function pulseLeg(ctx, c, go, s) {
    ctx.pulse?.legs.push({ seq: c.seq ?? 0, go, minute: s.clock.minute });
}

/** The activity handler booked a pause (rest, sleep, wait with the engine's minutes): before its time.advanced. */
export function pulsePause(ctx, c, minutes, s) {
    if (ctx.pulse && PAUSES.has(c.kind) && minutes > 0) ctx.pulse.pauses.push({ seq: c.seq ?? 0, kind: c.kind, minutes, start: s.clock.minute });
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

/** What a successful search seeks: a population of this place (or above) its words name, a contract's target kind. */
export function searchSought(s, content, focus) {
    const out = [];
    const words = normText(focus);
    if (!words) return out;
    for (const id of lineage(s, s.scene.at)) {
        const pop = s.places[id]?.population;
        if (pop && (namesKind(focus, pop.species, content.anchors.get(pop.anchor), sameKinds(content)) || words.includes(normText(String(pop.species).split(/\s+/).at(-1))))) out.push({ population: id });
    }
    for (const q of Object.values(s.quests || {})) {
        if (q.status !== 'active' || (q.taker || 'pc') !== 'pc' || q.hunt) continue;
        const named = (q.objectives || []).some((o) => KILL.has(o.verb) && normText(o.what).split(/\s+/).some((w) => w.length >= 4 && words.includes(w.replace(/s$/, ''))));
        if (named) out.push({ contract: q.id });
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
function kindOf(s, content, frame, phase, exposure, recent) {
    const R = content.rules.pulse;
    const i = PHASES.indexOf(phase);
    const w = Object.fromEntries(Object.entries(R.kinds[frame] || {}).map(([k, v]) => [k, v[i] ?? v[0]]));
    if (exposure.type === 'pause') for (const k of PAUSE_BARRED) delete w[k];
    if (w.danger) {
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
    const where = `${d.phase}, ${FRAME_TEXT[d.frame] || d.frame}`;
    if (exposure.type === 'pause') {
        const at = later ? ` (at the end of step ${exposure.pause.seq}, before his next steps)` : '';
        return `PULSE (the engine's; ${where}) — before he settles or as his ${exposure.pause.kind} ends${at}, ONE thing happens that he notices: ${KIND_TEXT[d.kind]}. The ${exposure.pause.kind} itself is as booked.`;
    }
    return `PULSE (the engine's; ${where}) — ONE concrete thing happens around him that he notices: ${KIND_TEXT[d.kind]}. It takes nothing of his, moves him nowhere and binds him to nothing; what he does about it is his decision. If nothing of this kind can fit the scene, nothing happens.`;
}

/** The dynamic exclusions after the handlers (the resolutions of this message). */
function dynamicReason(s, ctx, ordered, exposure) {
    const P = ctx.pulse;
    if (P.dungeonAhead) return 'dungeon_ahead';
    if (ctx.resolutions.some((r) => HARD_STOP.has(r.type) && r.status === 'pending')
        || (s.decisions || []).some((x) => x.kind === 'payment' && x.state === 'needs_confirmation' && x.turn === s.turn)) return 'hard_stop';
    const types = ordered.map((c) => c.type);
    if (types.includes('board.read') && types.every((t) => t === 'board.read' || t === 'go') && exposure.type !== 'travel') return 'board';
    if (ordered.length && !ctx.resolutions.some((r) => !['refused', 'clarify'].includes(r.status))) return 'invalid';
    if (P.sought.length && exposure.type !== 'travel') return 'sought';
    const st = s.pulse;
    if (exposure.type === 'pause' && st?.pause && st.pause.at === s.scene.at && st.pause.turn === s.turn - 1) return 'pause_block';
    return null;
}

/** After the handlers: the one decision of this message, its event, its line and auth.pulse. */
export function pulseFinish(s, content, ctx, emit, ordered) {
    const P = ctx.pulse;
    if (!P) return;
    const R = content.rules.pulse;
    // the first exposure in the order of his message: a leg the engine authorized or a pause it booked; else the scene
    const firsts = [...P.legs.map((leg) => ({ type: 'travel', seq: leg.seq, leg })), ...P.pauses.map((pause) => ({ type: 'pause', seq: pause.seq, pause }))]
        .sort((a, b) => a.seq - b.seq);
    const exposure = firsts[0] || { type: 'scene' };
    const hunts = huntsHere(s);
    const auth = { v: PULSE_VERSION, governs: P.governs, rolled: false, exposure: exposure.type, ...(P.sought.length ? { sought: P.sought } : {}), ...(hunts.length ? { hunts } : {}) };
    let reason = P.reason || dynamicReason(s, ctx, ordered, exposure);
    const held = !reason ? heldThreats(s, exposure.leg?.go) : [];
    if (!reason && held.length) reason = 'held';
    let d = null;
    if (!reason) {
        const { frame, phase, base } = frameOf(s, content, exposure);
        const st = s.pulse || { misses: 0, recent: [] };
        const p = Math.round(pulseChance(content, base, st.misses) * 100) / 100;
        const roll = draw(s, 'pulse', 10000) / 100;
        // tests and scripted host smokes only (rules.pulse.force, null in the product): replaces the draw, optionally only
        // for a player message containing `when`
        const forced = R.force && typeof R.force.open === 'boolean' && (!R.force.when || String(s.inputs?.at(-1)?.input || '').includes(R.force.when)) ? R.force : null;
        const open = forced ? forced.open : roll < p;
        let kind = open ? (forced?.kind && (exposure.type !== 'pause' || !PAUSE_BARRED.has(forced.kind)) ? forced.kind : kindOf(s, content, frame, phase, exposure, st.recent || [])) : null;
        d = { v: PULSE_VERSION, turn: s.turn, at: s.scene.at, exposure: exposure.type, frame, phase, base: Math.round(base * 100) / 100, misses_before: st.misses, p, roll, open: open && !!kind, kind, leg: exposure.leg?.seq ?? null, ...(forced ? { forced: true } : {}) };
        Object.assign(auth, { rolled: true, eligible: true, frame, phase, p, roll, misses: d.misses_before, open: d.open, kind: d.kind });
        emit({ t: 'pulse.rolled', d });
    } else {
        Object.assign(auth, { eligible: false, reason });
        if (reason === 'held') auth.held = held;
        // a later turn of the same pause block keeps the block going (no draw, no streak change)
        if (reason === 'pause_block') emit({ t: 'pulse.pause', d: { at: s.scene.at, turn: s.turn } });
    }
    if (exposure.type === 'travel') ctx.auth.road = d?.open && d.kind === 'danger' ? 'open' : 'quiet';
    const later = exposure.type === 'pause' && ctx.resolutions.some((r) => r.seq > exposure.seq && !['refused', 'clarify'].includes(r.status));
    // a travel leg always has its one line (held, quiet or open), as ROAD AHEAD had; a scene or pause only when open or held
    const line = lineFor(s, content, d, exposure, reason === 'held' ? held : [], later);
    if (line) ctx.extra.push(line);
    ctx.auth.pulse = auth;
}
