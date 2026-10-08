// Runtime V4: the command handlers (docs/RUNTIME_V4_PLAN.md §4.1, §4.4). The interpreter translated the player's story
// message into typed commands (src/v4/interpret.js), the agency guard dropped what was no decision (src/v4/agency.js);
// here the engine checks each command against the state at its step and books it. Every command gets a status:
//
//   resolved     booked now (coin, quest status, objects, the clerk's knowledge)
//   authorized   the reply may show it happen (arrival, time, a new object from gathering); where it ends, the story says
//   conditional  computed now, booked if its condition happens in the reply (arrival at a Guild hall -> turn-in)
//   pending      needs a price or an agreement first: an OPEN DECISION the narrator stops at
//   refused      a guard says no; the reply shows why in the world
//   clarify      the reference is ambiguous: the System asks, no story turn
//
// and one PLAYER ACTIONS line for the narrator (the engine block, src/context.js), in the order of the message. What the
// reply may change because of a command (auth), what the extractor must answer (expectedKeys) and what waits for the
// reply (conditionals) go into the turn's outcome; the world applier (src/v4/world.js) reads them from there.
import { formatCoin } from '../economy.js';
import { resolveCheck } from '../checks.js';
import { entityLabel, setFactEvents, truth } from '../knowledge.js';
import { normText, slug, formatClock } from '../util.js';
import { deriveCharacter } from '../derived.js';
import {
    placeName, hallOf, hallOfSettlement, settlementOf, sameSettlement, heldBy, membership, today, contracts, listingsOf, boardKey, isLooseCoin, listedToday,
} from './domain.js';
import { sameWant } from './world.js';
import { journeyReady, knownAt } from './catalog.js';
import { pickLines, bookPurchase, picksText, saleUnits, unitsText } from './trade.js';
import {
    REGISTRATION_OFFER, feeOf, openRegistration, registerEvents, rankCanon, acceptContract, completeContract, abandonContract, contractReady, objectiveText,
    promotion, takenByOthers, bookBoard, isHunt, trophyText, proofTerms, handoverTerms,
} from './guild.js';

const VERBS = { rest: 'RESTS', sleep: 'SLEEPS', wait: 'WAITS', work: 'WORKS', train: 'TRAINS', study: 'STUDIES', craft: 'CRAFTS', search: 'SEARCHES', gather: 'GATHERS', errand: 'RUNS ERRANDS' };
const UNTIL = { done: 'until it is done', noon: 'until noon', evening: 'until evening', end_of_day: 'until the end of the day', night: 'until nightfall', dawn: 'until dawn', morning: 'until morning' };
const YIELDING = new Set(['gather', 'search', 'craft']);
const ROAMING = new Set(['gather', 'search', 'errand']);
const RESTING = new Set(['rest', 'sleep']);

/** An empty resolution context for one player message. */
export function newTurnContext(content) {
    return {
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: content.rules.time.default_cap_min, journey: null },
        conditionals: [], expectedKeys: {}, actions: [], extra: [], resolutions: [],
        booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] },
        searchChecks: [],
        boardShown: null,
    };
}

// ------------------------------------------------------------------------------------------------ helpers
const who = (s, id) => (id === 'guild' ? 'the Guild' : entityLabel(s, id));
const present = (s, id) => typeof id === 'string' && s.scene.present.includes(id) && s.entities[id]?.status !== 'dead';
const cpText = (cp, content) => `${cp} cp${cp >= 10 ? ` (${formatCoin(cp, content)})` : ''}`;

/** A catalog object id: a V4 object, or "item.<template>" for what Alaric's own sheet carries. */
function objectOf(s, content, ref) {
    if (typeof ref !== 'string') return null;
    if (ref.startsWith('item.')) {
        const tpl = ref.slice(5);
        const qty = s.entities.pc.sheet.inventory[tpl];
        return qty ? { id: ref, template: tpl, name: content.items.get(tpl)?.name || s.item_names?.[tpl] || tpl, qty, holder: { entity: 'pc' } } : null;
    }
    return s.objects[ref] || null;
}

/** Minutes until a named time of day (next occurrence), or the fixed allowance for "done". */
export function untilMinutes(content, s, until) {
    const t = content.rules.time;
    if (until === 'done') return t.done_min;
    const target = t.until[until];
    if (target === undefined) return t.default_cap_min;
    const now = s.clock.minute % 1440;
    return target > now ? target - now : target + 1440 - now;
}

/**
 * Prototype C (setting 'planner', src/v4/planner.js): the minutes the engine books for an activity, or null when he
 * names neither a duration nor an end. A duration he names is the duration; an end he names runs to it (over
 * midnight). Without either, rest and sleep are a question (the activity handler), anything else is the story's as in A.
 */
export function engineMinutes(content, s, c) {
    const t = content.rules.time;
    if (Number.isInteger(c.minutes) && c.minutes > 0) return c.minutes;
    if (c.until && c.until !== 'done' && t.until[c.until] !== undefined) return untilMinutes(content, s, c.until);
    return null;
}

/**
 * Prototype C: natural recovery for booked rest or sleep. Per hour, a share of each maximum (rules.recovery), rounded
 * down, never above the maximum; no minutes, no recovery. Returns the resource.changed events and their lines.
 */
export function recoveryEvents(s, content, minutes, why) {
    const sheet = s.entities.pc.sheet;
    const dv = deriveCharacter(sheet, content);
    const max = { hp: dv.maxHp, mp: dv.maxMp, sta: dv.maxSta };
    const pct = content.rules.recovery.per_hour_pct;
    const events = [];
    const parts = [];
    for (const r of ['hp', 'mp', 'sta']) {
        const now = Number(sheet[r] ?? 0);
        const gain = Math.min(Math.floor((max[r] * pct[r] * minutes) / 6000), Math.max(0, max[r] - now));
        if (gain > 0) {
            events.push({ t: 'resource.changed', d: { id: 'pc', resource: r, value: now + gain, why } });
            parts.push(`${r.toUpperCase()} ${now}→${now + gain}/${max[r]}`);
        }
    }
    return { events, text: parts.length ? parts.join(', ') : 'nothing to recover (HP, MP and STA are full)' };
}

function questLine(q) {
    return `"${q.title}"`;
}

/**
 * The Guild hall a message means by "the guild" without naming a town: the hall of the settlement he is in; else the
 * branch of his active Guild contracts (one); else the branch he registered at.
 */
function guildHallMeant(s) {
    const here = settlementOf(s, s.scene.at);
    if (here) return hallOfSettlement(s, here);
    const branches = [...new Set(contracts(s).filter((q) => q.status === 'active').map((q) => q.source?.branch).filter(Boolean))];
    const town = branches.length === 1 ? branches[0] : membership(s)?.branch || null;
    return town ? hallOfSettlement(s, town) : null;
}

/** The one contract a turn-in or acceptance without a name can mean, or a question. */
function pickQuest(s, ref, statuses, kind = null) {
    if (typeof ref === 'string') return { q: s.quests[ref] || null };
    const pool = Object.values(s.quests).filter((q) => statuses.includes(q.status) && (!kind || q.kind === kind));
    if (ref && typeof ref === 'object' && typeof ref.new === 'string') {
        const hit = pool.filter((q) => normText(q.title) === normText(ref.new));
        return hit.length === 1 ? { q: hit[0] } : { q: null, unknown: ref.new };
    }
    if (pool.length === 1) return { q: pool[0] };
    return { q: null, clarify: pool.map((q) => q.title) };
}

/**
 * The Guild hall an earlier GO of this message leads to. He is not there yet (the reply decides whether he arrives), so
 * what is done at its desk waits for the arrival: a conditional the world applier books there (src/v4/world.js).
 */
const hallAhead = (ctx, c) => ctx.auth.gos.filter((g) => g.hall && g.seq < c.seq).at(-1) || null;

/** Prototype C: giving up a Guild contract (quest.abandon on the planner path). No payout, Quest XP or completion. */
function abandonGuild(s, content, q, c, ctx, emit) {
    const slip = Object.values(s.objects).find((o) => (o.for_quests || []).includes(q.id) && o.holder?.entity === 'pc' && o.kind === 'document');
    const desk = !!hallOf(s, s.scene.at);
    // the slip of a contract no longer active goes back with give (src/v4/planner.js CONTRACT_RULES), never a quest command
    if (q.status !== 'active') return { status: 'refused', reason: `the contract is ${q.status}`, line: `NOTHING TO DO — ${questLine(q)} is ${q.status}.` };
    if (desk) {
        abandonContract(s, q, emit, { step: c.seq, desk: true });
        return { status: 'resolved', line: `GIVES UP — ${questLine(q)} at the Guild desk: the clerk strikes it from the ledger${slip ? ' and takes back its contract slip' : ''}. No payout, no Quest XP, not completed.` };
    }
    const go = hallAhead(ctx, c);
    if (go) {
        ctx.conditionals.push({ seq: c.seq, kind: 'abandon', quest: q.id, condition: 'arrive_guild_hall', hall: go.to });
        return { status: 'conditional', condition: 'arrive_guild_hall', line: `GIVES UP, when he reaches the Guild hall — ${questLine(q)}: the clerk strikes it from the ledger${slip ? ' and takes back its contract slip' : ''}. No payout, no Quest XP, not completed. If the reply does not reach the hall, nothing is given up.` };
    }
    abandonContract(s, q, emit, { step: c.seq, desk: false });
    return { status: 'resolved', line: `GIVES UP — ${questLine(q)}. No payout, no Quest XP.${slip ? ' Its contract slip stays with him until he hands it back at a Guild hall.' : ''}` };
}

// ------------------------------------------------------------------------------------------------ handlers
// Each handler: (s, content, c, ctx, emit, env) -> {status, reason?, line?, extra?, cap?, condition?}
const HANDLERS = {
    'journey.continue'(s, content, c, ctx, emit, envx) {
        if (s.encounter) return { status: 'refused', reason: 'not during a fight', line: 'CANNOT DEPART — not while the fight runs.' };
        const ready = journeyReady(s, { c: !!envx?.c });
        if (!ready) {
            // 4.3.0-c.6.6: "I start to make my way back to Ashbridge" after the delivery: the planner read a journey that
            // had ended, beside the go that is the actual travel (live 07.10.2026). The go stands, also where it was
            // marked as building on this step; nothing is told about a journey
            if (envx?.c && (ctx.env?.commands || []).some((x) => x.type === 'go' && (x.seq ?? 0) > (c.seq ?? 0))) {
                return { status: 'refused', reason: 'no established journey; the go of this message is the travel', done: true, line: null };
            }
            return { status: 'refused', reason: 'no established journey', line: 'NOTHING TO DEPART ON — no stored journey/departure is ready to continue here.' };
        }
        // his agreement to go on with this quest's journey is its start: from now on it is his to continue, whoever of
        // its people the scene still shows (review of 4.1.0: an accepted escort is no journey before he sets off)
        const q = s.quests[ready.id];
        if (q?.status === 'active' && !q.journey) emit({ t: 'quest.journey', d: { id: q.id, at: s.scene.at } });
        const go = { seq: c.seq, to: null, name: `the established journey for "${ready.label}"`, hall: false, newName: 'the established journey' };
        ctx.auth.go = go;
        ctx.auth.gos.push(go);
        ctx.auth.roam = true;
        ctx.auth.timeCap = Math.max(ctx.auth.timeCap, content.rules.time.travel_cap_min);
        return { status: 'authorized', line: `DEPARTS/CONTINUES — the already-established journey of "${ready.label}"${ready.companion ? ` with ${entityLabel(s, ready.companion)}` : ''}; carry routine travel forward in THIS reply until they reach the destination or a concrete event creates a real decision/stop. Scenery, harmless conversation and uneventful road are not reasons to stop and ask the player to say "continue" again.` };
    },
    go(s, content, c, ctx, emit, envx) {
        if (s.encounter) return { status: 'refused', reason: 'not during a fight', line: 'CANNOT GO — not while the fight runs.' };
        // "the guild building", "back to the guild": the Guild hall is an engine node, never a new place to invent
        // (live 30.09.2026 14:56: the narrator made a "Guild desk" of it where no payout is possible)
        if (c.to && typeof c.to === 'object' && /\bguild\b/i.test(String(c.to.new || ''))) {
            const hall = guildHallMeant(s);
            if (hall) c = { ...c, to: hall };
        }
        const known = typeof c.to === 'string';
        if (known && !s.places[c.to]) return { status: 'refused', reason: 'unknown place', line: 'CANNOT GO — no such place is known.' };
        if (known && c.to === s.scene.at) return { status: 'refused', reason: 'already here', done: true, line: `NOTHING TO DO — he is already at ${placeName(s, c.to)}.` };
        const name = known ? placeName(s, c.to) : String(c.to?.new || 'somewhere');
        const t = content.rules.time;
        const cap = !known ? t.unknown_place_cap_min : sameSettlement(s, c.to, s.scene.at) ? t.default_cap_min : t.travel_cap_min;
        const go = { seq: c.seq, to: known ? c.to : null, name, hall: known && !!hallOf(s, c.to), newName: known ? null : name };
        ctx.auth.go = go;
        ctx.auth.gos.push(go);
        ctx.auth.timeCap = Math.max(ctx.auth.timeCap, cap);
        ctx.expectedKeys[String(c.seq)] = 'go';
        // he sets off while a quest's journey is ready with its people here: an arrival out of the settlement starts it
        const ready = journeyReady(s, { c: !!envx?.c });
        if (ready?.contact && s.quests[ready.id]?.status === 'active' && !s.quests[ready.id].journey) {
            ctx.auth.journey = ready.id;
            ctx.extra.push(`JOURNEY PACING — this GO starts the established journey of "${ready.label}". Carry routine travel forward in this same reply until destination or a concrete complication/open decision actually interrupts it; do not stop merely for scenery, harmless conversation or to make Alaric say "continue" again.`);
        }
        // Prototype C (4.3.0-c.6): the people he met there before are that place's people, not new ones
        const there = envx?.c && known && !ctx.extra.some((x) => x.startsWith(`KNOWN AT ${name} (`)) ? knownAt(s, content, c.to) : [];
        if (there.length) ctx.extra.push(`KNOWN AT ${name} (met there before; when the story shows the people of that place, they are these, not new ones; whoever works there is at work unless the story establishes otherwise): ${there.map((p) => `${p.label} (${p.id})`).join(' · ')}`);
        return { status: 'authorized', line: `GOES — to ${name} (the story decides whether and where he arrives).` };
    },
    activity(s, content, c, ctx, emit, envx) {
        if (s.encounter) return { status: 'refused', reason: 'not during a fight', line: 'CANNOT — not while the fight runs.' };
        // Prototype C: rest or sleep without a duration or an end is a question; nothing passes, nothing is recovered
        if (envx?.c && RESTING.has(c.kind) && !engineMinutes(content, s, c)) {
            return { status: 'clarify', reason: 'how long?', line: `CLARIFY — How long does he want to ${c.kind}? Name a duration ("for 2 hours") or an end ("until ${c.kind === 'sleep' ? 'morning' : 'evening'}").` };
        }
        const t = content.rules.time;
        const cap = c.until ? untilMinutes(content, s, c.until) : c.minutes ? Math.ceil(c.minutes * t.minutes_factor) : t.default_cap_min;
        ctx.auth.timeCap = Math.max(ctx.auth.timeCap, cap);
        if (YIELDING.has(c.kind)) ctx.auth.gather = true;
        if (ROAMING.has(c.kind)) ctx.auth.roam = true;
        if (RESTING.has(c.kind)) ctx.auth.rest = true;
        ctx.expectedKeys[String(c.seq)] = 'activity';
        const span = c.until ? UNTIL[c.until] || `until ${c.until}` : c.minutes ? `for ${c.minutes} minutes` : 'for a while';
        // Prototype C: the engine books a duration it can name, and the recovery of rest and sleep, in this turn's
        // record (a swipe or a regeneration reuses it); the extractor's time for the same span is not counted again
        const booked = envx?.c && c.kind !== 'search' ? engineMinutes(content, s, c) : null;
        if (booked) {
            emit({ t: 'time.advanced', d: { minutes: booked, why: c.kind } });
            ctx.auth.booked_min = (ctx.auth.booked_min || 0) + booked;
            ctx.auth.timeCap = Math.max(ctx.auth.timeCap, ctx.auth.booked_min);
            ctx.engineLines.push(`TIME — ${c.kind} ${span}: ${booked} min (now ${formatClock(s.clock.minute)})`);
            let rec = '';
            if (RESTING.has(c.kind)) {
                const r = recoveryEvents(s, content, booked, c.kind);
                r.events.forEach(emit);
                ctx.auth.recovered = true;
                ctx.engineLines.push(`RECOVERY — ${r.text}`);
                rec = ` Recovery booked: ${r.text}.`;
            }
            return { status: 'resolved', cap, line: `${VERBS[c.kind] || String(c.kind).toUpperCase()} ${c.what ? `${c.what} ` : ''}${span} — resolved by the engine: ${booked} minutes pass; it is now ${formatClock(s.clock.minute)}.${rec} Narrate it as done, at that length; do not cut it short or add time.` };
        }
        if (c.kind === 'search' && envx?.dice) {
            const actor = s.entities.pc?.sheet?.stats?.PER ?? 5;
            const opposition = content.rules.checks?.difficulty_scores?.moderate ?? 6;
            const check = resolveCheck(envx.dice, { label: `Search: ${c.what || 'the area'}`, actor, opposition });
            const record = {
                what: String(c.what || 'search the area').slice(0, 80), stat: 'PER', actor: check.actor_score,
                opposition: check.opposition, chance: check.chance, roll: check.roll, success: check.success,
                claimed: check.success, by: 'engine', seq: c.seq,
            };
            emit({ t: 'check.recorded', d: record });
            ctx.searchChecks.push(record);
            const result = check.success
                ? 'SUCCESS — reveal a concrete discovery, encounter or actionable lead; a teaser-only answer is not a resolved search'
                : 'FAILURE — resolve it concretely as no relevant find, a false lead, danger/complication, or this avenue being exhausted; do not repeat an interchangeable hint';
            return { status: 'authorized', cap, line: `SEARCHES ${c.what ? `${c.what} ` : ''}${span}. SEARCH CHECK (PER ${check.actor_score} vs ${check.opposition}): ${check.chance}% (d100 ${check.roll}) → ${result}.` };
        }
        return { status: 'authorized', cap, line: `${VERBS[c.kind] || String(c.kind).toUpperCase()} ${c.what ? `${c.what} ` : ''}${span} (at most ${cap} minutes; the story decides how long it takes and what it yields).` };
    },
    take(s, content, c, ctx, emit) {
        if (c.object && typeof c.object === 'object') {
            ctx.auth.take.push(c.seq);
            ctx.auth.takeNames = { ...(ctx.auth.takeNames || {}), [String(c.seq)]: String(c.object.new).slice(0, 80) };
            ctx.expectedKeys[String(c.seq)] = 'take';
            // loose coin is his purse's number, never an item: what the engine booked already (a Guild payout) is his,
            // coin the story newly lets him take (loot, a found purse's contents) the extractor books as coin
            if (isLooseCoin(c.object.new)) return { status: 'authorized', line: `TAKES — ${c.object.new}, if it is there; coin counts in his purse (coin the engine already paid him is not counted again).` };
            return { status: 'authorized', line: `TAKES — ${c.object.new}, if it is there (the story decides whether he gets it).` };
        }
        const o = objectOf(s, content, c.object);
        if (!o) return { status: 'refused', reason: 'unknown object', line: 'CANNOT TAKE — there is no such thing here.' };
        if (o.holder?.entity === 'pc') return { status: 'refused', reason: 'he holds it already', done: true, line: `NOTHING TO DO — he holds ${o.name} already.` };
        if (o.holder?.entity) return { status: 'refused', reason: 'someone holds it', line: `CANNOT TAKE — ${who(s, o.holder.entity)} holds ${o.name}; ${who(s, o.holder.entity)} would have to give it.` };
        if (o.holder?.loc !== s.scene.at) return { status: 'refused', reason: 'it is not here', line: `CANNOT TAKE — ${o.name} is not here.` };
        const part = c.qty && c.qty < (o.qty ?? 1) ? c.qty : null;
        emit({ t: 'object.moved', d: { id: o.id, to: { entity: 'pc' }, ...(part ? { qty: part, split: `${o.id}_${s.turn}` } : {}) } });
        return { status: 'resolved', line: `TAKES — ${o.name}${(part || o.qty) && (o.stack || (o.qty ?? 1) > 1 || o.unit) ? ` (${part || o.qty}${o.unit ? ` ${o.unit}` : ''})` : ''} along.` };
    },
    drop(s, content, c, ctx, emit) {
        const o = objectOf(s, content, c.object);
        if (!o || o.holder?.entity !== 'pc') return { status: 'refused', reason: 'he does not hold it', line: `CANNOT DROP — he does not hold ${o ? o.name : 'that'}.` };
        const qty = c.qty && c.qty < (o.qty ?? 1) ? c.qty : null;
        if (o.template) {
            const n = qty || o.qty;
            emit({ t: 'item.changed', d: { id: 'pc', item: o.template, qty: -n, why: 'dropped' } });
            emit({ t: 'object.created', d: { object: { id: `obj.t${env(ctx).msg}.${slug(o.name)}`, name: o.name, kind: 'item', stack: n > 1, qty: n, unit: null, holder: { loc: s.scene.at }, marks: [], for_quests: [], source: { turn: s.turn, how: 'dropped' } } } });
        } else emit({ t: 'object.moved', d: { id: o.id, to: { loc: s.scene.at }, ...(qty ? { qty, split: `${o.id}_${s.turn}` } : {}) } });
        return { status: 'resolved', line: `DROPS — ${o.name}${qty ? ` (${qty})` : ''}; it stays here.` };
    },
    give(s, content, c, ctx, emit) {
        const o = objectOf(s, content, c.object);
        if (!o || o.holder?.entity !== 'pc') return { status: 'refused', reason: 'he does not hold it', line: `CANNOT GIVE — he does not hold ${o ? o.name : 'that'}.` };
        if (!present(s, c.to) || c.to === 'pc') return { status: 'refused', reason: 'nobody to give it to', line: `CANNOT GIVE — ${typeof c.to === 'string' && s.entities[c.to] ? `${who(s, c.to)} is not here` : 'there is no such person here'}.` };
        const qty = c.qty && c.qty < (o.qty ?? 1) ? c.qty : null;
        if (o.template) {
            const n = qty || o.qty;
            emit({ t: 'item.changed', d: { id: 'pc', item: o.template, qty: -n, why: `given to ${who(s, c.to)}` } });
            emit({ t: 'object.created', d: { object: { id: `obj.t${env(ctx).msg}.${slug(o.name)}`, name: o.name, kind: 'item', stack: n > 1, qty: n, unit: null, holder: { entity: c.to }, marks: [], for_quests: [], source: { turn: s.turn, how: 'given' } } } });
        } else emit({ t: 'object.moved', d: { id: o.id, to: { entity: c.to }, ...(qty ? { qty, split: `${o.id}_${s.turn}` } : {}) } });
        return { status: 'resolved', line: `GIVES — ${o.name}${qty ? ` (${qty})` : ''} to ${who(s, c.to)}.` };
    },
    use(s, content, c, ctx, emit) {
        const o = objectOf(s, content, c.object);
        if (!o || o.holder?.entity !== 'pc') return { status: 'refused', reason: 'he does not hold it', line: `CANNOT USE — he does not hold ${o ? o.name : 'that'}.` };
        const qty = c.qty || 1;
        if (o.template) emit({ t: 'item.changed', d: { id: 'pc', item: o.template, qty: -Math.min(qty, o.qty), why: 'used' } });
        else emit({ t: 'object.consumed', d: { id: o.id, by: 'pc', ...(qty < (o.qty ?? 1) ? { qty } : {}) } });
        return { status: 'resolved', line: `USES — ${o.name}${qty > 1 ? ` (${qty})` : ''}; it is used up.` };
    },
    pay(s, content, c, ctx, emit) {
        const reg = s.offers[REGISTRATION_OFFER];
        const fee = feeOf(content);
        const theFee = c.amount_cp === null || c.amount_cp === undefined || c.amount_cp === fee;
        if (reg?.status === 'open' && hallOf(s, s.scene.at) && theFee) {
            return HANDLERS['offer.accept'](s, content, { ...c, type: 'offer.accept', offer: REGISTRATION_OFFER, lines: null }, ctx, emit);
        }
        // "Here are the 2 silver, register me": the fee of a registration this message asks for (or names) is the Guild's
        // canon fee, paid at the desk; never an ordinary payment to the clerk
        const asks = (env(ctx).commands || []).some((x) => x.type === 'guild.register') || /\b(?:regist\w*|membership|guild)\b/i.test(c.for || '');
        if (asks && theFee && hallOf(s, s.scene.at) && !membership(s)) {
            openRegistration(s, content, emit);
            return HANDLERS['offer.accept'](s, content, { ...c, type: 'offer.accept', offer: REGISTRATION_OFFER, lines: null }, ctx, emit);
        }
        // an open offer of the one he pays: paying it is accepting it
        const offer = Object.values(s.offers).find((o) => o.status === 'open' && !o.canon && o.seller === c.to && (c.amount_cp === null || c.amount_cp === undefined || pickLines(o).cp === c.amount_cp));
        if (offer) return HANDLERS['offer.accept'](s, content, { ...c, type: 'offer.accept', offer: offer.id, lines: null }, ctx, emit);
        if (!present(s, c.to)) return { status: 'refused', reason: 'nobody to pay', line: 'CANNOT PAY — the one he means to pay is not here.' };
        if (c.amount_cp === null || c.amount_cp === undefined) {
            emit({ t: 'decision.opened', d: { decision: { id: `dec.t${s.turn}.${c.seq}`, kind: 'payment', what: c.for || 'a payment', seller: c.to, at: s.scene.at, turn: s.turn } } });
            ctx.expectedKeys[String(c.seq)] = 'pay';
            return {
                status: 'pending', reason: 'no_amount', line: `WANTS TO PAY — ${who(s, c.to)}${c.for ? ` for ${c.for}` : ''}; the amount is not known.`,
                extra: [`OPEN DECISION — Alaric means to pay ${who(s, c.to)}${c.for ? ` for ${c.for}` : ''}; the amount is not known. Let ${who(s, c.to)} name it, then stop: he has not paid yet.`],
            };
        }
        const coin = s.entities.pc.sheet.coin_cp;
        if (coin < c.amount_cp) return { status: 'refused', reason: 'not enough coin', line: `CANNOT PAY — ${cpText(c.amount_cp, content)} needed, he has ${coin} cp.` };
        emit({ t: 'coin.changed', d: { id: 'pc', value: coin - c.amount_cp, delta: -c.amount_cp, why: `paid ${who(s, c.to)}${c.for ? ` for ${c.for}` : ''}` } });
        emit({ t: 'transaction.completed', d: { to: c.to, cp: c.amount_cp, for: c.for || null } });
        return { status: 'resolved', line: `PAYS — ${cpText(c.amount_cp, content)} to ${who(s, c.to)}${c.for ? ` for ${c.for}` : ''}.` };
    },
    buy(s, content, c, ctx, emit) {
        const offers = Object.values(s.offers).filter((o) => o.status === 'open' && !o.canon && present(s, o.seller) && (!c.from || o.seller === c.from));
        const match = offers.map((o) => ({ o, lines: o.lines.filter((l) => sameWant(c.what, l.what)) })).find((x) => x.lines.length);
        // an offer lists it: buying is accepting that line, in the number he names and within the limit he set
        if (match) return HANDLERS['offer.accept'](s, content, { ...c, type: 'offer.accept', offer: match.o.id, lines: match.lines.map((l) => l.id), qty: c.qty ?? null }, ctx, emit);
        const limit = c.max_cp !== null && c.max_cp !== undefined;
        emit({ t: 'decision.opened', d: { decision: { id: `dec.t${s.turn}.${c.seq}`, kind: 'purchase', what: c.what, seller: c.from || null, at: s.scene.at, turn: s.turn, max_cp: limit ? c.max_cp : null, any_price: !!c.any_price, qty: c.qty || null, priced: false, seq: c.seq } } });
        ctx.expectedKeys[String(c.seq)] = 'buy';
        if (limit || c.any_price) {
            const rule = c.any_price ? 'at any price' : `if the price is at most ${c.max_cp} cp`;
            return {
                status: 'conditional', condition: 'priced_within', line: `BUYS — ${c.what} ${rule}: when the seller names the price, he pays it and takes it${c.any_price ? '' : '; above it he declines'}.`,
            };
        }
        return {
            status: 'pending', reason: 'no_price', line: `WANTS — ${c.what}; no price is known.`,
            extra: [`OPEN DECISION — Alaric wants ${c.what}; no price is known. Let the seller name the prices, then stop: he has not agreed to pay.`],
        };
    },
    sell(s, content, c, ctx, emit) {
        const o = objectOf(s, content, c.object);
        if (!o || o.holder?.entity !== 'pc') return { status: 'refused', reason: 'he does not hold it', line: `CANNOT SELL — he does not hold ${o ? o.name : 'that'}.` };
        if (c.to && !present(s, c.to)) return { status: 'refused', reason: 'nobody to sell to', line: `CANNOT SELL — ${who(s, c.to)} is not here.` };
        // exactly the units he offers, never more than he holds (review of 4.1.0: ten herbs offered while he held one)
        const n = saleUnits(s, o.id, c.qty ?? null);
        if (n.error) return { status: 'refused', reason: 'he holds fewer', line: `CANNOT SELL — ${c.qty} ${o.name}: ${n.error}.` };
        const what = (o.qty ?? 1) > 1 ? unitsText(o.name, n.units) : o.name;
        emit({ t: 'decision.opened', d: { decision: { id: `dec.t${s.turn}.${c.seq}`, kind: 'sale', what: o.name, object: o.id, seller: c.to || null, at: s.scene.at, turn: s.turn, min_cp: c.min_cp ?? null, qty: n.units, seq: c.seq } } });
        ctx.expectedKeys[String(c.seq)] = 'sell';
        if (c.min_cp !== null && c.min_cp !== undefined) {
            return { status: 'conditional', condition: 'buyer_agrees', line: `SELLS — ${what}${c.to ? ` to ${who(s, c.to)}` : ''} if the buyer pays at least ${c.min_cp} cp (the story decides whether the buyer agrees).` };
        }
        return {
            status: 'pending', reason: 'no_price', line: `WANTS TO SELL — ${what}; no price is agreed.`,
            extra: [`OPEN DECISION — Alaric offers ${what} for sale; no price is agreed. Let the buyer name a price, then stop: he has not agreed to sell.`],
        };
    },
    'offer.accept'(s, content, c, ctx, emit) {
        const o = s.offers[c.offer];
        if (!o || o.status !== 'open') return { status: 'refused', reason: 'no open offer', line: 'CANNOT ACCEPT — there is no such open offer.' };
        // the lines he takes, in the number he names (review of 4.1.0: "three flasks" became one flask for one price)
        const pick = pickLines(o, c.lines, c.qty ?? null);
        if (pick.clarify) return { status: 'clarify', reason: 'which line?', line: `CLARIFY — ${c.qty} of which: ${pick.clarify.join(' or ')}?` };
        if (pick.error === 'the offer has no such item') return { status: 'refused', reason: 'no such line', line: 'CANNOT ACCEPT — the offer has no such item.' };
        if (pick.error) return { status: 'refused', reason: 'not in that amount', line: `CANNOT BUY ${c.qty} — ${pick.error}.` };
        if (o.canon && !hallOf(s, s.scene.at)) return { status: 'refused', reason: 'not at a Guild hall', line: 'CANNOT PAY — the Guild registers members at a Guild hall.' };
        if (!o.canon && !present(s, o.seller)) return { status: 'refused', reason: 'the seller is not here', line: `CANNOT ACCEPT — ${who(s, o.seller)} is not here.` };
        const price = pick.cp;
        // a limit he set ("if it's no more than 6 copper") holds for what he actually buys
        if (c.max_cp !== null && c.max_cp !== undefined && !c.any_price && price > c.max_cp) {
            return { status: 'refused', reason: 'above his limit', line: `DOES NOT BUY — ${picksText(pick.picks)} costs ${cpText(price, content)}, more than the ${c.max_cp} cp he allows.` };
        }
        const coin = s.entities.pc.sheet.coin_cp;
        if (coin < price) return { status: 'refused', reason: 'not enough coin', line: `CANNOT PAY — ${cpText(price, content)} needed, he has ${coin} cp.` };
        bookPurchase(s, emit, { offer: o, picks: pick.picks, cp: price, objectId: (what) => `obj.t${env(ctx).msg}.${slug(what)}` });
        const reg = pick.picks.some((p) => p.line.service === 'guild_registration');
        let power = null;
        if (reg) {
            power = registerEvents(s, content, emit).power;
            ctx.booked.registration = true;
            ctx.booked.grants.push('Guild plate');
        }
        for (const p of pick.picks.filter((x) => x.line.kind === 'goods')) ctx.booked.grants.push(p.line.what);
        // the seller was paid exactly the price: coin from the seller in the reply (change) is not a gift
        if (!o.canon) ctx.booked.sellers.push(o.seller);
        emit({ t: 'offer.closed', d: { id: o.id, status: 'accepted' } });
        for (const d of s.decisions.filter((x) => x.offer === o.id || (reg && x.kind === 'registration') || (x.kind === 'purchase' && x.seller === o.seller) || (x.kind === 'purchase' && !x.seller && x.at === s.scene.at))) emit({ t: 'decision.closed', d: { id: d.id, status: 'accepted' } });
        if (reg) return { status: 'resolved', line: `PAYS — the Guild registration fee, ${price} cp: registered at Guild Rank ${content.rules.guild.ranks[0]}; the crystal reads his Power Rank: ${power} (his measured strength, a separate scale from the Guild's ranks); he receives his Guild plate.` };
        return { status: 'resolved', line: `ACCEPTS the offer — ${picksText(pick.picks)} for ${cpText(price, content)}; he pays ${who(s, o.seller)}.` };
    },
    'offer.decline'(s, content, c, ctx, emit) {
        const o = s.offers[c.offer];
        if (!o || o.status !== 'open') return { status: 'refused', reason: 'no open offer', line: 'NOTHING TO DO — there is no such open offer.' };
        emit({ t: 'offer.closed', d: { id: o.id, status: 'declined' } });
        for (const d of s.decisions.filter((x) => x.offer === o.id)) emit({ t: 'decision.closed', d: { id: d.id, status: 'declined' } });
        return { status: 'resolved', line: `DECLINES — ${o.canon ? 'the Guild registration' : `${who(s, o.seller)}'s offer`}.` };
    },
    'quest.accept'(s, content, c, ctx, emit, envx) {
        const pick = pickQuest(s, c.quest, ['listed', 'offered']);
        if (pick.clarify) return pick.clarify.length ? { status: 'clarify', reason: 'which contract?', line: `CLARIFY — which one does he take: ${pick.clarify.join(' or ')}?` } : { status: 'refused', reason: 'nothing to accept', line: 'CANNOT ACCEPT — nothing is on offer.' };
        const q = pick.q;
        if (!q) return { status: 'refused', reason: 'no such contract', line: `CANNOT ACCEPT — no such contract${pick.unknown ? ` ("${pick.unknown}")` : ''} is on offer.` };
        if (q.kind === 'guild_contract') {
            if (q.status === 'active' || q.status === 'completed') return { status: 'refused', reason: `already ${q.status}`, done: q.status === 'active', line: `NOTHING TO DO — ${questLine(q)} is already ${q.status === 'active' ? 'his' : 'turned in'}.` };
            if (q.status !== 'listed') return { status: 'refused', reason: `the listing is ${q.status}`, line: `CANNOT ACCEPT — ${questLine(q)} is no longer on the board.` };
            // Prototype C (4.3.0-c.6): the board is the day's; a notice of an earlier day came down with its day
            if (envx?.c && !listedToday(s, q)) return { status: 'refused', reason: 'the listing expired', line: `CANNOT ACCEPT — ${questLine(q)} is no longer on the board: the Guild renews its board every day, and that notice came down with its day.` };
            if (!membership(s)) return { status: 'refused', reason: 'not a Guild member', line: `CANNOT ACCEPT — ${questLine(q)}: he is not a Guild member.` };
            const ranks = content.rules.guild.ranks;
            if (ranks.indexOf(q.rank) > ranks.indexOf(membership(s).rank)) return { status: 'refused', reason: 'rank too high', line: `CANNOT ACCEPT — ${questLine(q)} is ${q.rank} work; he is ${membership(s).rank}.` };
            const hall = hallOf(s, s.scene.at);
            // Prototype C (4.3.0-c.5): at the Guild hall of that board an earlier GO of this message leads to
            const ahead = envx?.c && (!hall || settlementOf(s, hall) !== q.source?.branch) ? hallAhead(ctx, c) : null;
            const there = ahead && settlementOf(s, ahead.to) === q.source?.branch ? hallOf(s, ahead.to) : null;
            if (!there && (!hall || settlementOf(s, hall) !== q.source?.branch)) {
                return { status: 'refused', reason: 'not at the Guild hall of that board', line: `CANNOT ACCEPT — ${questLine(q)} is taken at the Guild hall of ${s.places[q.source?.branch]?.name || 'its branch'}.` };
            }
            if (!there) acceptContract(s, content, q, emit, { step: c.seq });
            else ctx.conditionals.push({ seq: c.seq, kind: 'accept', quest: q.id, condition: 'arrive_guild_hall', hall: there });
            ctx.booked.accepted.push(q.id);
            ctx.booked.grants.push('contract slip');
            // a hunt is proven by trophies of the kills at a Guild hall (live 30.09.2026 14:56: the clerk made a local
            // steward's inspection and signature a condition of the payout)
            // Prototype C (4.3.0-c.6): a hunt by its slip, goods by the goods (src/v4/guild.js proofTerms)
            const proof = envx?.c ? proofTerms(q, content) : isHunt(q, content) ? ` Proof: ${trophyText(q)} brought to a Guild hall; no local inspection, witness or signature is required.` : '';
            const terms = `Contract memory: ${q.desired_end_state || objectiveText(q)}.${proof} The stored objectives and any verification examples are continuity guidance, not mandatory steps or wording. Payout (${q.payout_cp} cp), XP, completed-contract credit and promotion remain engine-owned at explicit turn-in.`;
            if (there) return { status: 'conditional', condition: 'arrive_guild_hall', line: `ACCEPTS, when he reaches the Guild hall — ${questLine(q)}: the clerk logs it and hands him its contract slip. ${terms} If the reply does not reach the hall, nothing is accepted.` };
            return { status: 'resolved', line: `ACCEPTS — ${questLine(q)} at the Guild desk; the clerk logs it and hands him its contract slip. ${terms}` };
        }
        // private work: its giver must be here
        if (q.status !== 'offered') return { status: 'refused', reason: `the job is ${q.status}`, line: `NOTHING TO DO — ${questLine(q)} is ${q.status}.` };
        if (q.giver && !present(s, q.giver)) return { status: 'refused', reason: 'the giver is not here', line: `CANNOT ACCEPT — ${who(s, q.giver)}, who offered ${questLine(q)}, is not here.` };
        emit({ t: 'quest.status', d: { id: q.id, from: 'offered', to: 'active', taker: 'pc', at: s.scene.at, step: c.seq } });
        ctx.booked.accepted.push(q.id);
        return { status: 'resolved', line: `ACCEPTS — ${questLine(q)}${q.giver ? ` from ${who(s, q.giver)}` : ''}.` };
    },
    'quest.turn_in'(s, content, c, ctx, emit, envx) {
        const pick = pickQuest(s, c.quest, ['active'], 'guild_contract');
        if (pick.clarify) {
            // the one that was just turned in, named again ("I turn the quest in"): nothing to do, not a question
            const done = Object.values(s.quests).filter((q) => q.kind === 'guild_contract' && q.status === 'completed' && (q.history || []).some((h) => h.status === 'completed' && Math.floor((h.minute ?? 0) / 1440) + 1 === today(s)));
            if (!pick.clarify.length && done.length) return { status: 'refused', reason: 'already_completed', done: true, line: `NOTHING TO DO — ${questLine(done.at(-1))} is already turned in.` };
            return pick.clarify.length ? { status: 'clarify', reason: 'which contract?', line: `CLARIFY — which contract does he turn in: ${pick.clarify.join(' or ')}?` } : { status: 'refused', reason: 'no active contract', line: 'CANNOT TURN IN — he has no active Guild contract.' };
        }
        const q = pick.q;
        if (!q) return { status: 'refused', reason: 'unknown contract', line: `CANNOT TURN IN — no such contract${pick.unknown ? ` ("${pick.unknown}")` : ''}.` };
        if (q.status === 'completed') return { status: 'refused', reason: 'already_completed', done: true, line: `NOTHING TO DO — ${questLine(q)} is already turned in.` };
        if (q.kind !== 'guild_contract') return { status: 'refused', reason: 'private work', line: `NOTHING TO TURN IN — ${questLine(q)} is private work; its giver settles it.` };
        if (q.status !== 'active') return { status: 'refused', reason: `the contract is ${q.status}`, line: `CANNOT TURN IN — ${questLine(q)} is ${q.status}.` };
        const cc = !!envx?.c;
        const hands = cc ? handoverTerms(q, content) : '';
        if (hallOf(s, s.scene.at)) {
            const r = completeContract(s, content, q, emit, { step: c.seq, c: cc });
            if (!r.ok) return { status: 'refused', reason: r.reason, line: `TURNS IN — ${questLine(q)}: the desk refuses it, ${r.reason}.` };
            ctx.booked.turnIns.push(q.id);
            return { status: 'resolved', line: `TURNS IN — ${questLine(q)}: the world has established the contract outcome; the Guild accepts the turn-in and pays ${q.payout_cp} cp.${hands}` };
        }
        const go = hallAhead(ctx, c);
        if (go) {
            // the same check the desk makes on arrival (guild.js contractReady)
            const ready = contractReady(s, content, q, { c: cc });
            ctx.conditionals.push({ seq: c.seq, kind: 'turn_in', quest: q.id, condition: 'arrive_guild_hall', hall: go.to });
            ctx.booked.turnIns.push(q.id);
            return {
                status: 'conditional', condition: 'arrive_guild_hall',
                line: `TURNS IN, when he reaches the Guild hall — ${questLine(q)}: ${ready.ok ? `the achieved outcome is ready for desk acceptance; the Guild pays ${q.payout_cp} cp` : ready.mode === 'count_short' || (cc && ready.mode !== 'not_ready') ? `the desk will refuse it: ${ready.reason}` : 'the story has not yet established the contract outcome as achieved'}.${ready.ok ? hands : ''} If the reply does not reach the hall, nothing is turned in.`,
            };
        }
        return { status: 'refused', reason: 'not at a Guild hall', line: `CANNOT TURN IN — ${questLine(q)}: contracts are turned in at a Guild hall.` };
    },
    'quest.abandon'(s, content, c, ctx, emit, envx) {
        const pick = pickQuest(s, c.quest, ['active']);
        if (pick.clarify) return pick.clarify.length ? { status: 'clarify', reason: 'which one?', line: `CLARIFY — which does he give up: ${pick.clarify.join(' or ')}?` } : { status: 'refused', reason: 'nothing active', line: 'NOTHING TO DO — he has nothing to give up.' };
        const q = pick.q;
        // Prototype C: a Guild contract is given up at the desk (its slip goes back to the Guild), or on arrival at the
        // hall he sets off for earlier in the message; never a payout, Quest XP or completion
        if (envx?.c && q?.kind === 'guild_contract') return abandonGuild(s, content, q, c, ctx, emit);
        if (!q || q.status !== 'active') return { status: 'refused', reason: 'not active', line: 'NOTHING TO DO — that is not his to give up.' };
        emit({ t: 'quest.status', d: { id: q.id, from: 'active', to: 'abandoned', at: s.scene.at, step: c.seq } });
        return { status: 'resolved', line: `GIVES UP — ${questLine(q)}.` };
    },
    'guild.register'(s, content, c, ctx, emit, envx) {
        // Prototype C (4.3.0-c.5): at the Guild hall an earlier GO of this message leads to; the clerk names the fee there
        const ahead = envx?.c && !hallOf(s, s.scene.at) ? hallAhead(ctx, c) : null;
        if (!hallOf(s, s.scene.at) && !ahead) return { status: 'refused', reason: 'not at a Guild hall', line: 'CANNOT REGISTER — only at a Guild hall.' };
        if (membership(s) && ctx.booked.registration) return { status: 'resolved', line: 'REGISTERS — done: the fee he paid above registered him.' };
        if (membership(s)) return { status: 'refused', reason: 'already a member', done: true, line: 'NOTHING TO DO — he is already a member.' };
        const fee = openRegistration(s, content, emit, ahead ? hallOf(s, ahead.to) : s.scene.at);
        return { status: 'pending', reason: 'fee', line: `REGISTERS${ahead ? ', when he reaches the Guild hall' : ''} — pending: the Guild's registration fee is ${fee % 10 === 0 ? `${fee / 10} silver (${fee} cp)` : `${fee} cp`}, one-time; ${rankCanon(content)}. Let the clerk name the fee and explain; stop there: he has not agreed to pay.` };
    },
    'guild.promote'(s, content, c, ctx, emit) {
        if (!hallOf(s, s.scene.at)) return { status: 'refused', reason: 'not at a Guild hall', line: 'CANNOT ASK FOR PROMOTION — only at a Guild hall.' };
        const p = promotion(s, content);
        if (!p.eligible) return { status: 'refused', reason: p.reason, line: `NOT ELIGIBLE — ${p.text || p.reason}.` };
        emit({ t: 'guild.promoted', d: { rank: p.next, from: membership(s).rank } });
        setFactEvents(s, { s: 'pc', p: 'guild_rank', o: p.next, source: { kind: 'engine' }, importance: 0.7 }).forEach(emit);
        return { status: 'resolved', line: `PROMOTION — the desk confirms: ${p.text}; he is examined and rises to ${p.next}.` };
    },
    'board.read'(s, content, c, ctx, emit, envx) {
        // Prototype C (4.3.0-c.5): the board of the Guild hall an earlier GO of this message leads to (host.js generated
        // it for that hall already); he sees it when he gets there, booked on his arrival (src/v4/world.js)
        const ahead = envx.c && !hallOf(s, s.scene.at) ? hallAhead(ctx, c) : null;
        const hall = hallOf(s, s.scene.at) || (ahead && hallOf(s, ahead.to));
        if (!hall) return { status: 'refused', reason: 'no Guild board here', line: envx.c ? 'NO BOARD HERE — the Guild\'s contract board hangs inside a Guild hall and he is not in one; he sees no listing this turn.' : 'CANNOT READ — the Guild board is in the Guild hall.' };
        const branch = settlementOf(s, hall);
        const rank = c.rank || membership(s)?.rank || 'Novice';
        // Prototype C (4.3.0-c.6): Alaric's five offers are his slice of the Guild's work: other adventurers have their
        // own and take none of his; the board turns over with the day instead (below)
        if (envx.dice && !envx.c) takenByOthers(s, content, branch, rank, envx.dice, emit);
        // the generator's listings for this board (host.js ran it before this turn, canonical first)
        const gen = envx.board && envx.board.branch === branch && envx.board.rank === rank ? envx.board : null;
        if (gen?.listings?.length) {
            // Prototype C (4.3.0-c.6): the first reading of a new day finds a new board; the notices nobody took came
            // down (expired: remembered, no longer to be taken). A board that could not be renewed is not taken down
            if (envx.c) for (const q of listingsOf(s, branch, rank).filter((x) => !listedToday(s, x))) emit({ t: 'quest.status', d: { id: q.id, from: 'listed', to: 'expired', by: 'board' } });
            bookBoard(s, content, gen, gen.listings, emit);
        } else if (gen?.failed) emit({ t: 'board.failed', d: { branch, rank, error: gen.failed } }); // on record for #audit
        const listed = listingsOf(s, branch, rank).filter((q) => !envx.c || listedToday(s, q));
        const when = ahead ? ', when he reaches the Guild hall' : '';
        if (!listed.length) {
            ctx.boardShown = { branch, rank, failed: true };
            return { status: 'resolved', reason: 'generator_failed', line: `READS the board${when} — BOARD: no new official contracts can be shown right now; invent none.` };
        }
        if (!ahead) emit({ t: 'board.shown', d: { branch, rank, listings: listed.map((q) => q.id) } });
        else ctx.conditionals.push({ seq: c.seq, kind: 'board', condition: 'arrive_guild_hall', hall, branch, rank, listings: listed.map((q) => q.id) });
        ctx.boardShown = { branch, rank, listings: listed.map((q) => q.id) };
        const rows = listed.map((q) => `**${q.title}** — client: ${q.client || 'unspecified'} · reward: ${q.payout_cp} cp · ${q.task || q.desired_end_state || objectiveText(q)}`).join('\n');
        // Prototype C (4.3.0-c.6.2): only the reading that posts the day's board shows new notices; a later reading that
        // day shows the same ones again, not as new
        const fresh = !envx.c || !!gen?.listings?.length;
        const line = `READS the ${rank} board${when} — BOARD (${fresh ? 'these listings now become canonical because Alaric actually reads them; ' : ''}show exactly these, invent no other official contract; present the notices in the existing title-first readable format; ${fresh ? 'these official listings have JUST become available: do not claim, withdraw or retroactively remove any of them during this first display' : 'these are the notices posted earlier today, the same as before, nothing new: do not call them new, fresh or just posted, and do not claim, withdraw or remove any of them during this display'}):\n${rows}\nStored objectives and any verification examples are continuity memory only.`;
        if (ahead) return { status: 'conditional', condition: 'arrive_guild_hall', line: `${line}\nIf the reply does not reach the hall, he sees none of it.` };
        return { status: 'resolved', line };
    },
    equip(s, content, c, ctx, emit) {
        const eq = s.entities.pc.sheet.equipment || {};
        const asked = typeof c.object === 'object' && c.object?.new ? normText(c.object.new) : null;
        const already = Object.entries(eq).find(([, ref]) => {
            const it = typeof ref === 'string' ? content.items.get(ref) : ref;
            const n = normText(it?.name || ref?.name || ref || '');
            return asked && (n.includes(asked) || asked.includes(n));
        });
        if (already) {
            const it = typeof already[1] === 'string' ? content.items.get(already[1]) : already[1];
            return { status: 'resolved', reason: 'already equipped', line: `READIES — ${it?.name || c.object.new} is already equipped; drawing/readying it is not an equipment swap.` };
        }
        const o = objectOf(s, content, c.object);
        const tpl = o?.template || [...content.items.entries()].find(([, i]) => o && normText(i.name) === normText(o.name))?.[0];
        if (!o || o.holder?.entity !== 'pc') return { status: 'refused', reason: 'he does not hold it', line: 'CANNOT EQUIP — he does not hold that.' };
        const item = tpl && content.items.get(tpl);
        if (!item?.slot || item.slot === 'ammo' || item.slot === 'container') return { status: 'refused', reason: 'no gear values', line: `CANNOT EQUIP — the engine knows no gear values for ${o.name}.` };
        const slot = c.slot || item.slot;
        const current = s.entities.pc.sheet.equipment[slot];
        if (o.template) emit({ t: 'item.changed', d: { id: 'pc', item: tpl, qty: -1, why: 'equipped' } });
        else emit({ t: 'object.consumed', d: { id: o.id, by: 'equipped' } });
        if (current) {
            const cur = typeof current === 'string' ? current : null;
            if (cur) emit({ t: 'item.changed', d: { id: 'pc', item: cur, qty: 1, why: 'unequipped' } });
        }
        emit({ t: 'item.equipped', d: { id: 'pc', slot, item: tpl } });
        return { status: 'resolved', line: `EQUIPS — ${item.name} (${slot}).` };
    },
    unequip(s, content, c, ctx, emit) {
        const eq = s.entities.pc.sheet.equipment;
        const ref = typeof c.object === 'string' ? c.object.replace(/^item\./, '') : null;
        const slot = Object.keys(eq).find((k) => eq[k] === ref || (typeof eq[k] === 'object' && normText(eq[k]?.name) === normText(content.items.get(ref)?.name || ref)));
        if (!slot) return { status: 'refused', reason: 'not equipped', line: 'NOTHING TO DO — he has nothing like that equipped.' };
        const cur = eq[slot];
        emit({ t: 'item.equipped', d: { id: 'pc', slot, item: null } });
        if (typeof cur === 'string') emit({ t: 'item.changed', d: { id: 'pc', item: cur, qty: 1, why: 'unequipped' } });
        return { status: 'resolved', line: `UNEQUIPS — ${typeof cur === 'string' ? content.items.get(cur)?.name || cur : cur.name}.` };
    },
};

// the message index of the player message (ids of what a command creates)
const env = (ctx) => ctx.env || {};

/** The command types the engine resolves (the vocabulary's commands must all be here: tests/unit/v4_turn.test.js). */
export const COMMAND_TYPES = Object.keys(HANDLERS);

/**
 * Prototype C (4.3.0-c.6): the planner's "other", his own deed that no command fits ("use some cloth to stop my
 * bleeding"): a step of the message in its place (live 04.10.2026 16:35: it was lost between "cut the tusk" and "walk
 * into the den"). It books nothing: HP, MP, STA, coin and possessions change only by the engine's own commands.
 */
function otherStep(s, content, c) {
    const what = c.quote ? `"${String(c.quote).replace(/[<>`]/g, '').slice(0, 100)}"` : String(c.what || 'something').replace(/[<>`]/g, '').slice(0, 100);
    return { status: 'resolved', line: `DOES — ${what}: his own action; tell it as it happens. It books nothing: no HP, MP, STA, coin or possessions change by it.` };
}

/**
 * Resolve the commands of one message in order. emit applies each event to s at once, so every command is checked
 * against the state after the ones before it ("pay the fee, then read the board").
 * @param {{msg?: number, dice?: object, board?: object, c?: boolean, dropped?: object[]}} envx msg: the player message's
 *   index; dice: the engine's dice (the board's taken-by-others draw); board: the Board generator's validated listings
 *   for this turn; c: the planner path (Prototype C); dropped: the commands its agency guard dropped
 */
export function resolveCommands(s, content, commands, emit, envx = {}) {
    const ctx = newTurnContext(content);
    // Prototype C (the planner path): engine-owned time, recovery and contract abandonment
    if (envx.c) ctx.auth.c = true;
    ctx.engineLines = [];
    const ordered = [...commands].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    ctx.env = { msg: envx.msg ?? s.turn, commands: ordered };
    const lines = new Map();
    const happened = new Set();
    for (const c of ordered) {
        const h = HANDLERS[c.type] || (envx.c && c.type === 'other' ? otherStep : null);
        // Prototype C (4.3.0-c.5): a step the planner marked as building on an earlier one of the message (needs) is not
        // taken when that one did not happen (refused, an open decision, a question, dropped by the agency guard); one
        // that found its goal true already (done: "already his", "already here") did, and so did a registration that
        // made him a member (the fee paid in a step between; the guard drops such a registration as redundant)
        const need = envx.c && Number.isInteger(c.needs) && !happened.has(c.needs) ? c.needs : null;
        const unmet = need !== null && !(membership(s) && [...ctx.resolutions, ...(envx.dropped || []).map((x) => x.command || {})]
            .some((x) => x.seq === need && x.type === 'guild.register'));
        const r = unmet ? { status: 'refused', reason: `needs step ${c.needs}`, line: `NOT DONE — ${c.quote ? `"${String(c.quote).slice(0, 80)}"` : c.type}: it was to follow step ${c.needs}, which did not happen.` }
            : h ? h(s, content, c, ctx, emit, envx) : { status: 'refused', reason: `unknown command ${c.type}`, line: null };
        if (r.done || !['refused', 'pending', 'clarify'].includes(r.status)) happened.add(c.seq);
        ctx.resolutions.push({ seq: c.seq, type: c.type, status: r.status, ...(r.reason ? { reason: r.reason } : {}), ...(r.cap ? { cap: r.cap } : {}), ...(r.condition ? { condition: r.condition } : {}), quote: c.quote ?? null });
        if (r.line) lines.set(c.seq, r.line);
        if (r.extra) ctx.extra.push(...r.extra);
    }
    // "Register me, here is the fee": a registration a later command of the same message paid is no open decision
    if (ctx.booked.registration) {
        for (const res of ctx.resolutions.filter((x) => x.type === 'guild.register' && x.status === 'pending')) {
            res.status = 'resolved';
            delete res.reason;
            lines.set(res.seq, 'REGISTERS — he asks to be registered and pays the fee at once (below).');
        }
    }
    for (const res of ctx.resolutions) {
        emit({ t: 'cmd.resolved', d: res });
        if (lines.has(res.seq)) ctx.actions.push(`${res.seq}. ${lines.get(res.seq)}`);
    }
    delete ctx.env;
    return ctx;
}

/** The contracts a Guild hall's board shows for Alaric (the BOARD line of the catalog). */
export function boardOf(s, branch, rank) {
    return listingsOf(s, branch, rank);
}

export { boardKey, contracts, heldBy };
