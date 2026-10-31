import { privateQuestsOf, questVisible } from '../content.js';
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
import { transferCargo, bookDelivery, cargoProvenance } from './delivery.js';
import { formatCoin, numbersIn } from '../economy.js';
import { spendsStatPoints, assignHint } from '../commands.js';
import { resolveCheck } from '../checks.js';
import { entityLabel, setFactEvents, truth } from '../knowledge.js';
import { normText, slug, formatClock, hash32 } from '../util.js';
import { deriveCharacter } from '../derived.js';
import {
    lineage, placeName, hallOf, hallOfSettlement, guildDestination, guildJourney, settlementOf, sameSettlement, heldBy, membership, today, contracts, listingsOf, boardKey, isLooseCoin, listedToday,
} from './domain.js';
import { sameWant, keyWords, wantedLines } from './world.js';
import { LOOT_WORDS, lootedHere } from './loot.js';
import { shopSearch, findTrades } from './settlement.js';
import { journeyReady, knownAt } from './catalog.js';
import { continueOptions, setIntentEvents, endIntentEvents, activeIntents, goSetsGoal } from './intents.js';
import { knownByName } from './known.js';
import { useOf, spoiled, unitsOf, profileOf, rankRefusal, itemProfile, restoreOf, restoreEffect, namedSource, equipmentSlotKnown, offerCard } from './items.js';
import { itemEffectOf, rulesetOf } from '../content.js';
import { learningActivity, stoneActivation } from './growth.js';
import { effectiveStats } from '../passives.js';
import { jobAction, jobOf } from './private_jobs.js';
import { acceptPassive, declinePassive } from './passive_growth.js';
import { acceptSkill, declineSkill, developmentOffers, skillOffers } from './skill_growth.js';
import { classOffer, classSelection, acceptClass } from './class_growth.js';
import { pickLines, bookPurchase, picksText, saleUnits, unitsText, bookSale, bidSale, bidText, acceptanceWhy, offerAvailability, purchaseLines, samePurchaseRequest, purchaseDecisionMatches } from './trade.js';
import { approachedBy, sceneHandle } from './scene_handles.js';
import { attemptEvents, pendingSpring, searchedBefore, searchFinds, featureEvent, featureNamed, keyOf, placeState, featuresAt } from './features.js';
import { dungeonOf, trueDungeonOf, isRoom, roomKnown, wayBetween, knownRoomNamed, hiddenWayFinds, linkEvent, otherEnd, linksAt, blockerOf, goesFrom, firstStop } from './dungeon.js';
import { livingOf, establishEvents, gateCheck, gateOfferEvents, gateOfferId, gateCard, namesGate, aheadEvents, insideOf, returnStone, sealRefusal, floorAt, gatherEvents } from './living.js';
import {
    REGISTRATION_OFFER, feeOf, openRegistration, registerEvents, rankCanon, acceptContract, completeContract, abandonContract, contractReady, objectiveText,
    promotion, takenByOthers, bookBoard, isHunt, trophyText, proofTerms, handoverTerms, goalText, openGuildManuals,
} from './guild.js';

const VERBS = { rest: 'RESTS', sleep: 'SLEEPS', wait: 'WAITS', work: 'WORKS', train: 'TRAINS', study: 'STUDIES', craft: 'CRAFTS', search: 'SEARCHES', gather: 'GATHERS', errand: 'RUNS ERRANDS' };
const UNTIL = { done: 'until it is done', noon: 'until noon', evening: 'until evening', end_of_day: 'until the end of the day', night: 'until nightfall', dawn: 'until dawn', morning: 'until morning' };
const YIELDING = new Set(['gather', 'search', 'craft']);
const ROAMING = new Set(['gather', 'search', 'errand']);
const RESTING = new Set(['rest', 'sleep']);
// 4.3.0-c.6.6.51: the steps that pay for something, and the words of a room or bed he takes to sleep in
const PURCHASES = new Set(['offer.accept', 'buy', 'pay']);
const ROOM_WORDS = /\b(?:rooms?|beds?|bunks?|cots?|berths?|lodgings?|quarters)\b/;
// review of .51: a place to sleep that is no room or bed he takes ("in the hayloft", "under the stars", "out to the stable")
const ELSEWHERE = /\b(?:stables?|hayloft|loft|barn|shed|byre|bench|floor|ground|grass|road|roadside|verge|camp|campfire|fire|hearth|trees?|stars|open|outside|outdoors|wagon|cart|alley|street|square|ditch|hedge|field|woods|forest|tent|bedroll|rough)\b/;
// Patch 9C-1: the activities that learn or practise (src/v4/growth.js)
const LEARNING = new Set(['train', 'study']);
// the slots of what he holds in his hands (wielded, not worn): "everything I wear" leaves them as they are
const HELD_SLOTS = new Set(['weapon', 'offhand']);

/** An empty resolution context for one player message. */
export function newTurnContext(content) {
    return {
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: content.rules.time.default_cap_min, journey: null },
        conditionals: [], expectedKeys: {}, actions: [], extra: [], resolutions: [],
        booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [], goods: [] },
        searchChecks: [],
        boardShown: null,
    };
}

// ------------------------------------------------------------------------------------------------ helpers
const who = (s, id) => (id === 'guild' ? 'the Guild' : entityLabel(s, id));
const present = (s, id) => typeof id === 'string' && s.scene.present.includes(id) && s.entities[id]?.status !== 'dead';
const cpText = (cp, content) => `${cp} cp${cp >= 10 ? ` (${formatCoin(cp, content)})` : ''}`;
const feeWords = (fee) => (fee % 10 === 0 ? `${fee / 10} silver (${fee} cp)` : `${fee} cp`);

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

/** Materialise outgoing sheet units once; a returned object keeps this physical identity. */
function transferTemplate(s, o, to, n, seq, ctx, emit, envx, { drop = false } = {}) {
    const base = `obj.t${env(ctx).msg}.${slug(o.name)}`;
    let id = base;
    const delivery = envx?.c && rulesetOf(s) >= 2;
    if (delivery) for (let i = 2; s.objects[id]; i++) id = `${base}_${i}`;
    const provenance = delivery ? cargoProvenance(s, o, { objectId: id, qty: n }) : {};
    emit({ t: 'item.changed', d: { id: 'pc', item: o.template, qty: -n, why: drop ? 'dropped' : `given to ${who(s, to.entity)}` } });
    emit({ t: 'object.created', d: { object: {
        id, name: o.name, kind: 'item', stack: n > 1, qty: n, unit: null, holder: to,
        ...provenance, marks: [], for_quests: [],
        source: { turn: s.turn, how: drop ? 'dropped' : 'given', item: o.template },
    } } });
    if (envx?.c) bookDelivery(s, emit, o, to, n, seq, { drop, objectId: id });
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
    // 4.3.0-c.6.6.3: a village without a branch (Hollow Ford) means the hall of his contracts, not none
    if (here && hallOfSettlement(s, here)) return hallOfSettlement(s, here);
    const branches = [...new Set(contracts(s).filter((q) => q.status === 'active').map((q) => q.source?.branch).filter(Boolean))];
    const town = branches.length === 1 ? branches[0] : membership(s)?.branch || null;
    return town ? hallOfSettlement(s, town) : null;
}

/** The one contract a turn-in or acceptance without a name can mean, or a question. */
function pickQuest(s, ref, statuses, kind = null) {
    if (typeof ref === 'string') return { q: s.quests[ref] && questVisible(s, s.quests[ref]) ? s.quests[ref] : null };
    const pool = Object.values(s.quests).filter(q => questVisible(s, q)).filter((q) => statuses.includes(q.status) && (!kind || q.kind === kind));
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
const hallAhead = (ctx, c, candidate = false) => ctx.auth.gos.filter((g) => (g.hall || (candidate && g.guild_candidate)) && g.seq < c.seq).at(-1) || null;

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

// ------------------------------------------------------------------------------------------------ the road (Patch 5)
/**
 * Patch 5: whom a quest journey under way takes along on a GO or a "continue": its charge, while he or she is with him
 * (an escort is not left at the roadside because the extractor did not list the charge again). Nobody else.
 */
function companionOf(s, envx) {
    if (!envx?.c) return {};
    const ready = journeyReady(s, { c: !!envx?.c });
    return ready?.companion && s.quests[ready.id]?.journey && present(s, ready.companion) ? { with: [ready.companion], along: true } : {};
}

/**
 * Patch 5: one leg of a journey beyond his settlement (a known place elsewhere, a goal, a quest's journey). The road is
 * no spawn table: the engine decides only whether this leg may bring one concrete interruption (rules.travel
 * leg_event_pct, drawn from the campaign seed and the turn, so a swipe or a replay draws the same, and no die of the
 * fight is used up), never what it is; the story makes it fit the land, its creatures and people as the world has them.
 * Those of an interruption still here are still here: nothing new meets him while they are (no interruption made again
 * with each message). auth.road: 'open' | 'quiet'; on a quiet leg nobody the reply introduces turns on him (world.js).
 */
function roadLine(s, content, c, ctx, go) {
    if (!ctx.auth.c) return;
    const goWith = new Set(go.with || []);
    const held = s.scene.present.filter((id) => id !== 'pc' && !goWith.has(id) && s.entities[id] && s.entities[id].status !== 'dead'
        && (s.entities[id].kind === 'creature' ? s.entities[id].threat !== false : (s.scene.threats || []).includes(id)));
    const pct = content.rules.travel?.leg_event_pct ?? 0;
    const roll = parseInt(hash32(`${s.meta?.seed ?? ''}|${s.turn}|${s.clock.minute}|${c.seq}|road`), 16) % 100;
    ctx.auth.road = !held.length && roll < pct ? 'open' : 'quiet';
    const toward = go.to ? placeName(s, go.to) : go.journey || go.name;
    if (held.length) ctx.extra.push(`THE ROAD — ${held.map((id) => sceneHandle(s, content, id)).join(', ')} ${held.length > 1 ? 'are' : 'is'} still here as he goes on toward ${toward}: the story shows how they take it; nothing new meets him on this leg.`);
    else if (ctx.auth.road === 'open') ctx.extra.push(`THE ROAD — this leg toward ${toward} may (not must) bring ONE concrete interruption that fits the land he crosses and the hour: people or creatures of this land, an obstacle on the way, a meeting. It stops the travel where it happens, short of where he is going; what he does about it (fight, pay, talk, flee, another way) is his decision, not the story's. Scenery, weather and far-off signs are atmosphere, not interruptions.`);
    else ctx.extra.push(`THE ROAD — this leg toward ${toward} is uneventful: no ambush, attack or obstacle meets him on it. Scenery, weather, far-off animals and harmless travellers are atmosphere; carry the travel forward until he arrives or the day's travel ends, and leave every choice about it to him.`);
}

// ------------------------------------------------------------------------------------------------ handlers
// Each handler: (s, content, c, ctx, emit, env) -> {status, reason?, line?, extra?, cap?, condition?}
const SELLING = /\b(?:sell\w*|sold)\b/i;
const PART_ONLY = /\b(?:only|just|except|but not|apart from|keep(?:ing)? (?:the|my|back))\b/i;
const BUYING = /\b(?:buy\w*|bought|purchas\w*|pay(?:s|ing)?|paid)\b/i;
const independentPayment = c => /\b(?:as an? |extra )(?:tip|donation|gift)\b/i.test(c.quote || '')
    || /^(?:an? )?(?:tip|donation|gift)(?: for .*)?$/i.test(c.for || '');
// A missing optional `for` must not erase an explicit purpose in the player's own payment clause.
function registrationPaymentWords(c, text = '') {
    let quote = String(c.quote || '').trim();
    const raw = String(text || ''), at = quote ? raw.toLowerCase().indexOf(quote.toLowerCase()) : -1;
    if (at >= 0) {
        const tail = raw.slice(at + quote.length);
        // Only the immediately following purpose belongs to a shortened quote; never scan another action's words.
        if (/^[\s,]*(?:for|towards?|to)\b/i.test(tail)) quote += tail.split(/[.;!?]|\bthen\b/i)[0];
    }
    quote = quote.split(/[.;!?]|\b(?:then|ask(?:s|ing)?)\b/i)[0];
    return /\b(?:for|towards?|to (?:finish|complete|finali[sz]e))\s+(?:(?:my|the|our|guild)\s+){0,3}(?:registration|membership)\b|\bto (?:register|join the guild)\b/i.test(quote);
}
function expirePurchaseRequest(s, c, emit, seller = null) {
    const request = {kind:'purchase', what:c.what, seller:c.from || null, at:s.scene.at, qty:c.qty || null};
    for (const d of s.decisions.filter(d => samePurchaseRequest(d, request, seller))) emit({t:'decision.closed', d:{id:d.id, status:'expired'}});
}
function paymentFor(c, lines) {
    if (independentPayment(c)) return false;
    const wanted = keyWords(c.for || '').filter(w => !numbersIn(w).size && !['fit', 'fitted', 'now', 'pair', 'payment'].includes(w));
    const goods = new Set(keyWords(lines.map(l => l.what).join(' ')));
    const overlap = wanted.filter(w => goods.has(w)).length;
    return !!overlap && (overlap === wanted.length || overlap >= 3);
}

/**
 * Prototype C (4.3.0-c.6.6.5): the bid an offer stored the wrong way round makes, when its lines name things Alaric
 * holds by every word of their names (species and material, "venom sacs" for "F-Rank Mudwyrm Venom Sac"), with the
 * number written before them or else all he holds of each; null when they name none of his things.
 */
function bidOfOffer(s, o) {
    const text = o.lines.map((l) => l.what).join(' ; ');
    const said = new Set(keyWords(text));
    const lines = [];
    for (const x of heldBy(s, 'pc').filter((h) => !h.id.startsWith('obj.slip.') && h.id !== 'obj.guild_plate' && !(h.for_quests || []).length)) {
        const words = keyWords(x.name);
        if (!words.length || !words.every((w) => said.has(w))) continue;
        const last = words.at(-1);
        const n = normText(text).match(new RegExp(`\\b(\\d+)\\s+(?:[a-z-]+\\s+){0,3}?${last}`));
        const qty = Math.min(n ? Number(n[1]) : (x.qty ?? 1), x.qty ?? 1);
        lines.push({ id: `l${lines.length + 1}`, what: x.name, kind: 'goods', service: null, object: x.id, qty, price_cp: null });
    }
    return lines.length ? { lines, price_cp: pickLines(o).cp ?? 0 } : null;
}

/**
 * Prototype C (4.3.0-c.6.6.5): Alaric accepts a buyer's bid for things he holds: one sale of exactly the things and
 * units of the bid (or the lines he names, when each has its own price), for exactly its price (src/v4/trade.js). A bid
 * whose things he no longer holds is void (nothing changes hands, never a negative stock); a part of a lot priced only
 * whole is a question for the buyer, not a sale.
 */
function acceptBid(s, content, c, ctx, emit, o) {
    if (!present(s, o.seller)) return { status: 'refused', reason: 'the buyer is not here', line: `CANNOT SELL — ${who(s, o.seller)} is not here.` };
    // a bid priced only for the whole lot is accepted whole unless he holds part of it back in words ("only the
    // fangs", "but I keep the sacs"): the line ids a planner copies along are no choice of his (live: lines ["l1"])
    const priced = (o.lines || []).every((l) => Number.isInteger(l.price_cp));
    const sale = bidSale(s, o, priced || PART_ONLY.test(c.quote || '') ? c.lines : null);
    if (sale.error) {
        if (sale.stale) emit({ t: 'offer.closed', d: { id: o.id, status: 'expired' } });
        return { status: 'refused', reason: sale.stale ? 'no longer held' : 'part of a lot', line: `NOT SOLD — ${sale.error}. Nothing changes hands; the buyer may name a new price.` };
    }
    const what = bidText(sale.lines);
    const booked = bookSale(s, emit, { offer: o, items: sale.lines.map((l) => ({ ref: l.object, units: l.qty, splitId: `${l.object}_t${s.turn}` })), buyer: o.seller, cp: sale.cp, what });
    if (booked.error) return { status: 'refused', reason: booked.error, line: `NOT SOLD — ${booked.error}.` };
    ctx.soldInBid = new Set([...(ctx.soldInBid || []), ...sale.lines.map((l) => l.object)]);
    // the buyer paid him exactly the price: coin from her in the reply is this coin, never a gift (world.js coin.gift)
    ctx.booked.sellers.push(o.seller);
    emit({ t: 'offer.closed', d: { id: o.id, status: 'accepted' } });
    for (const d of s.decisions.filter((x) => x.kind === 'sale' && sale.lines.some((l) => l.object === x.object))) emit({ t: 'decision.closed', d: { id: d.id, status: 'sold' } });
    return { status: 'resolved', line: `SELLS — ${what} to ${who(s, o.seller)} for ${cpText(sale.cp, content)}: the coin is his now, the things are ${who(s, o.seller)}'s (the engine booked both).` };
}

/**
 * Patch 7: the line of a way barred by an obstacle he has not got past (src/v4/dungeon.js). Patch 8.3 (live
 * 22.10.2026: he went down the sound steps to the fallen flight): he may come up to it and see it; he does not get past
 * or over it, and nothing of an attempt on it happens.
 */
function barred(f, toward) {
    return { status: 'refused', reason: 'blocked', line: `BLOCKED — the way to ${toward} is barred by ${f.name} (${f.id}): going there does not get him past it. He may come up to it and see it, but he does not get past or over it and makes no attempt on it: he stays on this side, where he is; dealing with it (an attempt), another way or turning back is his choice.` };
}

/**
 * Patch 7: a GO in or into a place explored room by room (src/v4/dungeon.js). A known room, also named by its name or
 * by the way to it, is reached only by ways he knows and can take, through rooms he has stood in; a way barred by an
 * obstacle stays barred however he words it (the iron door he names, even when a shaft leads to the same room). A
 * part he has not seen yet he reaches by going on from where he is (the story shows it; the world applier keeps the
 * way he took), unless what he names lies behind an obstacle here. Review of a5035f0: a room he knows of (a map) with
 * no way to it known is something to look for a way to, not a place to arrive at; a walk through several rooms stops
 * where a hidden trap waits (firstStop), so the trap is never stepped over.
 * @returns {{refuse?: object, to?: string, route?: object, explore?: string, stop?: string}}
 */
function dungeonGo(s, c) {
    const here = s.scene.at;
    let to = c.to;
    let via = null;
    if (to && typeof to === 'object') {
        if (!dungeonOf(s, here)) return {};
        const name = String(to.new || '');
        const meant = knownRoomNamed(s, here, name);
        if (meant?.ambiguous) return { refuse: { status: 'clarify', reason: 'which way?', line: `CLARIFY — which way does he take: to ${meant.ambiguous.map((id) => placeName(s, id)).join(' or to ')}?` } };
        if (!meant) {
            const want = keyOf(name);
            const side = (words) => [['left', 'right'], ['north', 'south'], ['east', 'west']].map(pair => pair.find(w => words.includes(w)));
            const way = (words) => words.some(w => /^(?:passage|corridor|tunnel|path|route|way|door|gate|archway|stair|stairs)$/.test(w));
            const toward = side(want);
            const f = featuresAt(s, here).find((x) => {
                if (x.kind !== 'obstacle' || x.status !== 'active') return false;
                const have = keyOf(x.name);
                const atSide = side(have);
                // Before a passage has a canonical link, its direction can still identify the barred way.
                // Conflicting directions never match; a shared generic word alone does not identify it.
                if (toward.some((d, i) => d && atSide[i] && d !== atSide[i])) return false;
                if (way(want) && way(have) && toward.some((d, i) => d && d === atSide[i])) return true;
                return want.length > 0 && want.every(w => have.includes(w));
            });
            return f ? { refuse: barred(f, name) } : {};
        }
        to = meant.id;
        via = meant.link || null;
    }
    if (typeof to !== 'string' || !s.places[to] || to === here || (!dungeonOf(s, here) && !dungeonOf(s, to))) return {};
    if (isRoom(s, to) && !roomKnown(s, to)) return { refuse: { status: 'refused', reason: 'no known way', line: 'NO KNOWN WAY — he knows of no such place here; he stays where he is.' } };
    // the way he named: that way, barred or open
    if (via) {
        if (blockerOf(s, via)) return { refuse: barred(blockerOf(s, via), placeName(s, to)) };
        if (goesFrom(via, here)) return { to, route: { path: [here, to], ways: [via] } };
    }
    const w = wayBetween(s, here, to);
    if (w.blocked) return { refuse: barred(w.blocked.feature, placeName(s, to)) };
    if (w.danger) return { refuse: { status: 'clarify', reason: 'danger on the way', line: `CLARIFY — the way he knows to ${placeName(s, to)} leads back through ${placeName(s, w.danger.at)}, where he left ${w.danger.who.map((e) => who(s, e.id)).join(', ')}: does he go there?` } };
    if (w.none && isRoom(s, to) && !linksAt(s, to).length) return { explore: to };
    if (w.none) return { refuse: { status: 'refused', reason: 'no known way', line: `NO KNOWN WAY — he knows no open way from ${placeName(s, here)} to ${placeName(s, to)}: he stays where he is; another way has to be found first.` } };
    const stop = firstStop(s, w.path, w.ways);
    return { to, route: w, ...(stop ? { stop: stop.at } : {}) };
}

/**
 * Patch 8: a GO at, into or inside a true Dungeon (src/v4/living.js). Its establishment at first contact, the gate he
 * passes going from its gate (or from outside) into its parts, and the engine's encounter ahead of a GO into a part he
 * has not seen. Returns {refuse} when the gate turns him back (or asks its fee first), else null.
 */
function livingGo(s, content, c, ctx, emit, { known, nav, envx }) {
    const here = trueDungeonOf(s, s.scene.at);
    const dest = known ? trueDungeonOf(s, c.to) : here;
    if (!dest) return null;
    for (const e of establishEvents(s, content, dest)) emit(e);
    const x = livingOf(s, dest);
    if (!x) return null;
    // past the gate: from the gate (or from outside) into a part of it
    const passing = !insideOf(s, dest) && (known ? c.to !== dest : s.scene.at === dest);
    if (passing) {
        // he and whoever travels with him (an escort's charge) take places
        const group = 1 + (companionOf(s, envx).with || []).length;
        const g = gateCheck(s, content, dest, { group });
        // Patch 8.1 (§4): the gate's System card whenever it turns him back or waits for its fee
        if (g?.refuse || g?.fee) ctx.engineLines.push(...gateCard(s, content, dest, { group }));
        if (g?.refuse) return { refuse: { status: 'refused', reason: 'gate', line: `CANNOT ENTER — ${g.refuse}. He stays at the gate of ${x.name}.` } };
        if (g?.fee) {
            // the gate's one offer (created when he came to the gate, else now): never a second price
            for (const e of gateOfferEvents(s, content, dest, g.fee)) emit(e);
            return { refuse: { status: 'pending', reason: 'fee', line: `ENTRY FEE — ${g.keeper} asks ${cpText(g.fee, content)} to let him into ${x.name} (the gate's fixed fee, ${gateOfferId(dest)}); he has not agreed to pay: he is still at the gate. Let the keeper name this fee; stop there.` } };
        }
    }
    // a sealed level stays sealed however he words it
    const sealed = known ? sealRefusal(s, c.to) : null;
    if (sealed) return { refuse: { status: 'refused', reason: 'sealed', line: `SEALED — ${sealed}. He stays where he is.` } };
    // the engine's encounter ahead: a GO into a part he has not stood in (from the gate or inside): one nobody showed
    // yet, or one he has only seen (the stair down he knows of)
    const fresh = known && c.to !== dest && !s.places[c.to]?.visited && trueDungeonOf(s, c.to) === dest;
    const into = (s.scene.at === dest || insideOf(s, dest)) && (!known || !!nav?.explore || fresh);
    const a = into ? aheadEvents(s, content, { into: true, root: dest, floor: fresh ? floorAt(s, c.to) : null }) : null;
    if (a) {
        a.events.forEach(emit);
        ctx.extra.push(...a.lines);
    }
    return null;
}

/** Patch 8.1 (§11): the System card of a Guild board's official listings (canonical data only). */
function boardCard(s, content, rank, branch, listed) {
    return [
        `SYSTEM — GUILD BOARD · ${rank} · ${placeName(s, branch)}`,
        ...listed.map((q) => `${q.title}${goalText(s, content, q, { board: true })} · ${q.rank || rank}${q.hunt && s.places[q.hunt.at]?.population ? ` · enemy levels ${s.places[q.hunt.at].population.levels.join('–')} · risk depends on species and encounter numbers` : ` · quest level ${q.level}`} · client: ${q.client || 'unspecified'} · reward: ${cpText(q.payout_cp, content)} · ${String(q.task || q.desired_end_state || objectiveText(q)).replace(/\s+/g, ' ').slice(0, 120)}`),
    ];
}

const HANDLERS = {
    'journey.continue'(s, content, c, ctx, emit, envx) {
        if (s.encounter) return { status: 'refused', reason: 'not during a fight', line: 'CANNOT DEPART — not while the fight runs.' };
        // Patch 2: his own goals and the quest journey; with more than one, "I continue" is a question, never a pick
        const options = continueOptions(s, { c: !!envx?.c });
        if (options.length > 1) return { status: 'clarify', reason: 'which journey?', line: `CLARIFY — continue which: ${options.map((o) => (o.kind === 'intent' ? `${o.label} (${o.place ? placeName(s, o.place) : `somewhere: ${o.seek}`})` : o.label)).join(' or ')}?` };
        const goal = options[0]?.kind === 'intent' ? options[0] : null;
        if (goal) {
            // Patch 5: a goal with no place yet (seek) goes on toward what he set off to find; his first words keep the
            // way he chose (a route is how he travels, never a destination)
            const name = goal.place ? placeName(s, goal.place) : goal.seek;
            const go = { seq: c.seq, to: goal.place || null, name, hall: !!goal.place && !!hallOf(s, goal.place), newName: goal.place ? null : name, intent: goal.id, ...companionOf(s, envx) };
            ctx.auth.go = go;
            ctx.auth.gos.push(go);
            ctx.auth.roam = true;
            ctx.auth.timeCap = Math.max(ctx.auth.timeCap, goal.place ? content.rules.time.travel_cap_min : content.rules.time.unknown_place_cap_min);
            ctx.expectedKeys[String(c.seq)] = 'go';
            setIntentEvents(s, { goal: goal.label, place: goal.place }).events.forEach(emit);
            const first = s.intents[goal.id]?.quote;
            const way = first && first !== c.quote ? ` He set off saying "${String(first).slice(0, 120)}": that is still his way.` : '';
            roadLine(s, content, c, ctx, go);
            return { status: 'authorized', line: `CONTINUES — ${goal.place ? `toward ${name}` : `on his way to find ${name}`}, his own goal "${goal.label}" (the story decides how far he gets and whether he arrives; it does not move him further than this message does).${way}` };
        }
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
        // 4.3.0-c.6.6.2: its companion travels with him, also where the road has not reached its end yet (world.js)
        const go = { seq: c.seq, to: null, name: `the established journey for "${ready.label}"`, hall: false, newName: 'the established journey', journey: ready.label, with: ready.companion ? [ready.companion] : [], ...(envx?.c ? { along: true } : {}) };
        ctx.auth.go = go;
        ctx.auth.gos.push(go);
        ctx.auth.roam = true;
        ctx.auth.timeCap = Math.max(ctx.auth.timeCap, content.rules.time.travel_cap_min);
        roadLine(s, content, c, ctx, go);
        return { status: 'authorized', line: `DEPARTS/CONTINUES — the already-established journey of "${ready.label}"${ready.companion ? ` with ${entityLabel(s, ready.companion)}` : ''}; carry routine travel forward in THIS reply until they reach the destination or a concrete event creates a real decision/stop. Scenery, harmless conversation and uneventful road are not reasons to stop and ask the player to say "continue" again.` };
    },
    go(s, content, c, ctx, emit, envx) {
        if (s.encounter) return { status: 'refused', reason: 'not during a fight', line: 'CANNOT GO — not while the fight runs.' };
        const guildTown = envx?.c && rulesetOf(s) >= 2 && guildJourney(s, c);
        if (guildTown) c = { ...c, to: { new: `Guild hall in ${s.places[guildTown].name}` } };
        let guildCandidate = false;
        let guildSettlement = null;
        // Reuse an established branch. In C/Ruleset 2 a new premises may be visited,
        // but only World evidence can grant its functional Guild status.
        if (typeof c.to?.new === 'string') {
            // A preceding destination qualifies this Hall even if that GO was refused as "already here".
            // It is reference context only: arrival and turn-in remain conditional on the actual route.
            const previous = (ctx.env?.commands || []).filter(x => x.type === 'go' && x.seq < c.seq).at(-1);
            const target = typeof previous?.to === 'string' ? previous.to : typeof previous?.to?.new === 'string'
                ? knownByName(s, previous.to.new, s.places[s.scene.at]?.realm || s.scene.location, { reportedOnly: false })?.id : null;
            const town = target && settlementOf(s, target)
                || (/^(?:i\s+)?(?:enter|step|walk)\b/i.test(String(c.quote || '').trim()) ? settlementOf(s, s.scene.at) : null);
            const destination = guildDestination(s, c.to.new, town || settlementOf(s, guildHallMeant(s)), { allowNew: !!envx?.c && rulesetOf(s) >= 2 });
            if (destination?.error) return { status: 'refused', reason: destination.error, line: `CANNOT GO — ${destination.error}.` };
            if (destination?.id) c = { ...c, to: destination.id };
            guildCandidate = !!destination?.candidate;
            guildSettlement = destination?.settlement || null;
        }
        if (envx?.c && rulesetOf(s) >= 2 && typeof c.to?.new === 'string') {
            const p = knownByName(s, c.to.new, s.places[s.scene.at]?.realm || s.scene.location, { reportedOnly: false });
            if (p) c = { ...c, to: p.id };
        }
        // Patch 8: at a Dungeon's gate, going "in" (the Dungeon he stands at) is the step past the gate into its first part
        if (envx?.c && typeof c.to === 'string' && c.to === s.scene.at && s.places[c.to]?.dungeon?.real) c = { ...c, to: { new: `the way into ${placeName(s, c.to)}` } };
        // Patch 7: in a dungeon he goes by the ways he knows (src/v4/dungeon.js)
        const nav = envx?.c ? dungeonGo(s, c) : {};
        if (nav.refuse) return nav.refuse;
        if (nav.to) c = { ...c, to: nav.to };
        // a room he knows of, no way to it: he goes on to find one (reached only by a way the story shows him)
        const sought = nav.explore ? placeName(s, nav.explore) : null;
        if (sought) c = { ...c, to: { new: sought } };
        const known = typeof c.to === 'string';
        if (known && !s.places[c.to]) return { status: 'refused', reason: 'unknown place', line: 'CANNOT GO — no such place is known.' };
        if (known && c.to === s.scene.at) return { status: 'refused', reason: 'already here', done: true, line: `NOTHING TO DO — he is already at ${placeName(s, c.to)}.` };
        if (c.within != null && (!envx?.c || rulesetOf(s) < 2 || known || !s.places[c.within]?.population || !lineage(s, s.scene.at).includes(c.within)))
            return { status: 'refused', reason: 'invalid local habitat scope', line: 'CANNOT GO — local exploration needs the current habitat; choose a normal destination to leave it.' };
        const name = known ? placeName(s, c.to) : String(c.to?.new || 'somewhere');
        const t = content.rules.time;
        const inside = known && !!dungeonOf(s, s.scene.at) && dungeonOf(s, s.scene.at) === dungeonOf(s, c.to);
        const cap = !known ? t.unknown_place_cap_min : inside || sameSettlement(s, c.to, s.scene.at) ? t.default_cap_min : t.travel_cap_min;
        const go = { seq: c.seq, to: known ? c.to : null, name, hall: known && !!hallOf(s, c.to), newName: known ? null : name,
            ...((guildCandidate || (envx?.c && rulesetOf(s) >= 2 && known && guildDestination(s, name, settlementOf(s, c.to), { allowNew: true })?.candidate))
                ? { guild_candidate: true, guild_settlement: guildSettlement || (known ? settlementOf(s, c.to) : null) } : {}) };
        if (c.within) {
            go.within = c.within;
            ctx.extra.push(`LOCAL HUNT EXPLORATION — ${name} is a new part of ${placeName(s, c.within)} (${c.within}), not a new independent population. Its new site/den uses that parent. This authorizes no arrival by itself.`);
        }
        // Patch 8 (src/v4/living.js): a true Dungeon is established at its first contact; passing its gate is checked
        // (who may enter, its fee only with his consent, how many are inside); and going on into a part he has not seen,
        // the engine places what that part holds before the story tells it
        const lived = envx?.c ? livingGo(s, content, c, ctx, emit, { known, nav, envx }) : null;
        if (lived?.refuse) return lived.refuse;
        ctx.auth.go = go;
        ctx.auth.gos.push(go);
        ctx.auth.timeCap = Math.max(ctx.auth.timeCap, cap);
        ctx.expectedKeys[String(c.seq)] = 'go';
        // he sets off while a quest's journey is ready with its people here: an arrival out of the settlement starts it
        const ready = journeyReady(s, { c: !!envx?.c });
        if (ready?.contact && s.quests[ready.id]?.status === 'active' && !s.quests[ready.id].journey) {
            ctx.auth.journey = ready.id;
            if (ready.companion) go.with = [ready.companion];
            ctx.extra.push(`JOURNEY PACING — this GO starts the established journey of "${ready.label}". Carry routine travel forward in this same reply until destination or a concrete complication/open decision actually interrupts it; do not stop merely for scenery, harmless conversation or to make Alaric say "continue" again.`);
        }
        // Patch 5: a leg beyond his settlement (a known place elsewhere, a place known by report, a quest's journey): the
        // charge of a journey under way goes with him; a step to a place nearby (up the scree above the ford) is his alone
        if (ctx.auth.journey || (known && (goSetsGoal(s, c.to) || (!sameSettlement(s, c.to, s.scene.at) && s.places[c.to]?.kind !== 'realm' && !!settlementOf(s, c.to))))) {
            if (!ctx.auth.journey) Object.assign(go, companionOf(s, envx));
            roadLine(s, content, c, ctx, go);
        }
        // Patch 6: a hidden hazard at the place he goes into springs as he enters it (src/v4/features.js), the engine's roll;
        // review of 32c7d2c: booked only where the reply's arrival there is confirmed (a conditional of the arrival)
        // Patch 7: and one across the way he takes there (the tripwire on that doorway); review of a5035f0: a walk
        // through several rooms that stops at a hidden trap on the way: the trap is the one at the stop, and the walk
        // ends there (world.js viaStop)
        const stopAt = nav.stop || null;
        const legWays = stopAt ? nav.route.ways.slice(0, nav.route.path.indexOf(stopAt)) : nav.route?.ways || [];
        if (stopAt) go.stop = stopAt;
        if (envx?.c && known && envx.dice) {
            const pending = pendingSpring(s, content, envx.dice, { place: stopAt || c.to, seq: c.seq, ways: legWays.map((l) => l.feature).filter(Boolean) });
            if (pending) { ctx.conditionals.push(pending.conditional); ctx.extra.push(pending.line); }
        }
        // Patch 7: back through rooms he knows, every way open: told in passing, no new decision on the way
        if (stopAt) ctx.extra.push(`THE WAY — toward ${name}${nav.route.path.indexOf(stopAt) > 1 ? ` through ${nav.route.path.slice(1, nav.route.path.indexOf(stopAt)).map((id) => placeName(s, id)).join(', ')}` : ''}: the walk stops in ${placeName(s, stopAt)}, where what is said below happens; he is in ${placeName(s, stopAt)} after it, and goes on only by his next decision.`);
        else if (nav.route?.path?.length > 2) ctx.extra.push(`THE WAY — through ${nav.route.path.slice(1, -1).map((id) => placeName(s, id)).join(', ')}: rooms he knows, every way on it open; tell the walk briefly, nothing new on the way unless the story has its own reason.`);
        // Patch 2: a destination beyond his settlement, or a place he knows by report, is his goal until he reaches it
        // (src/v4/intents.js); a quest's journey is that quest's own
        if (known && !ctx.auth.journey && goSetsGoal(s, c.to)) setIntentEvents(s, { goal: `reach ${name}`, place: c.to, quote: c.quote, why: 'he set off for it' }).events.forEach(emit);
        // Prototype C (4.3.0-c.6): the people he met there before are that place's people, not new ones
        const there = envx?.c && known && !ctx.extra.some((x) => x.startsWith(`KNOWN AT ${name} (`)) ? knownAt(s, content, c.to) : [];
        if (there.length) ctx.extra.push(`KNOWN AT ${name} (met there before; when the story shows the people of that place, they are these, not new ones; whoever works there is at work unless the story establishes otherwise): ${there.map((p) => `${p.label} (${p.id})`).join(' · ')}`);
        // Patch 8 (pacing): a way he chose is carried to its end, never stopped for what changes nothing
        const pace = envx?.c ? ' Carry the way forward in this reply until he arrives, something acts on him, or a real choice of way appears; a sound, a shadow or a track without consequence is passed in a clause, never a stop.' : '';
        if (sought) return { status: 'authorized', line: `GOES — on to find a way to ${sought}: he knows of it, not of a way there; he gets there only by a way the story shows him find (a stair, a door, a passage), never straight.${pace}` };
        return { status: 'authorized', line: `GOES — to ${name} (the story decides whether and where he arrives).${pace}` };
    },
    // Patch 2: his goals are his own decisions (src/v4/intents.js); setting one changes nothing in the world
    'intent.set'(s, content, c, ctx, emit) {
        // a destination the record knows (by id, or by its name in this realm); a name the record does not know stays
        // the goal's words: his goal makes no place
        const named = c.to && typeof c.to === 'object' ? knownByName(s, c.to.new, s.places[s.scene.at]?.realm ?? null) : null;
        const place = typeof c.to === 'string' && s.places[c.to] ? c.to : named?.id || null;
        const goal = String(c.goal || (place ? `reach ${placeName(s, place)}` : '')).trim();
        if (!goal) return { status: 'refused', reason: 'no goal', line: 'NOTHING TO NOTE — no goal named.' };
        const r = setIntentEvents(s, { goal, place, quote: c.quote, why: 'his decision' });
        r.events.forEach(emit);
        return { status: 'resolved', done: true, line: `GOAL NOTED — "${goal}"${place ? ` (${placeName(s, place)})` : ''}: his own decision, remembered; nothing happens until he acts on it.` };
    },
    'intent.drop'(s, content, c, ctx, emit) {
        const pool = activeIntents(s).concat(Object.values(s.intents || {}).filter((i) => i.status === 'paused'));
        const named = typeof c.intent === 'string' && s.intents?.[c.intent] ? s.intents[c.intent] : null;
        const target = named || (pool.length === 1 ? pool[0] : null);
        if (!target) return pool.length ? { status: 'clarify', reason: 'which goal?', line: `CLARIFY — which goal does he give up: ${pool.map((i) => i.goal).join(' or ')}?` } : { status: 'refused', reason: 'no goal', done: true, line: 'NOTHING TO DO — he has no goal to give up.' };
        const status = c.achieved ? 'done' : 'dropped';
        endIntentEvents(s, target.id, status, c.achieved ? 'he says it is done' : 'he gave it up').forEach(emit);
        return { status: 'resolved', done: true, line: `GOAL ${status === 'done' ? 'DONE' : 'DROPPED'} — "${target.goal}".` };
    },
    activity(s, content, c, ctx, emit, envx) {
        if (s.encounter) return { status: 'refused', reason: 'not during a fight', line: 'CANNOT — not while the fight runs.' };
        // Patch 8.1 (§4): looking over a Living Dungeon's gate shows its System card (the act itself goes on as ever)
        if (envx?.c && livingOf(s, s.scene.at) && namesGate(s, s.scene.at, `${c.what || ''} ${c.quote || ''}`)) ctx.engineLines.push(...gateCard(s, content, s.scene.at));
        // Prototype C (4.3.0-c.6.6.4): looting the foes of a fight he won is no search: the engine credited their loot at
        // the fight's end (src/v4/loot.js); no check, no time, nothing more on them (live 15.10.2026: a failed SEARCH)
        const looted = envx?.c && c.kind === 'search' && LOOT_WORDS.test(`${c.what || ''} ${c.quote || ''}`) ? lootedHere(s) : [];
        if (looted.length) return { status: 'resolved', reason: 'looted already', done: true, line: `LOOTED ALREADY — what ${looted.map((id) => who(s, id)).join(', ')} left was credited at the fight's end (the engine's automatic loot, in his pack); there is nothing more on the remains. No check, no time.` };
        // Prototype C (4.3.0-c.6.6.5): an ordinary shop or service of the settlement he is in is found, not searched for
        // (live 15.10.2026: "look for a store to sell the monster parts to" in Ashbridge by day was a failed PER check
        // and an hour): which trades the place has, the shops the story established first, no check; he chooses where
        // to go. A secret, a hidden way or an illegal dealer stays a SEARCH
        const wants = `${c.what || ''} ${c.quote || ''}`;
        const found = envx?.c && c.kind === 'search' && shopSearch(content, wants) ? findTrades(s, content, wants) : null;
        if (found) {
            emit({ t: 'time.advanced', d: { minutes: found.minutes, why: 'asking around' } });
            ctx.auth.booked_min = (ctx.auth.booked_min || 0) + found.minutes;
            ctx.auth.timeCap = Math.max(ctx.auth.timeCap, ctx.auth.booked_min);
            ctx.engineLines.push(`FOUND — the trades here, no check: ${found.minutes} min (now ${formatClock(s.clock.minute)})`);
            return { status: 'resolved', reason: 'ordinary trade', done: true, line: `FINDS — ${found.line} Show the trades he can see or is pointed to as places he may go; he decides where to go, nothing is entered, bought or sold yet.` };
        }
        // Prototype C: rest or sleep without a duration or an end is a question; nothing passes, nothing is recovered
        if (envx?.c && RESTING.has(c.kind) && !engineMinutes(content, s, c)) {
            return { status: 'clarify', reason: 'how long?', line: `CLARIFY — How long does he want to ${c.kind}? Name a duration ("for 2 hours") or an end ("until ${c.kind === 'sleep' ? 'morning' : 'evening'}").` };
        }
        // Patch 6: the same search at the same place, nothing changed there and nothing new in his hands: no second roll
        // and nothing more to find (src/v4/features.js); another focus or method is a new search
        const before = envx?.c && envx.dice && c.kind === 'search' ? searchedBefore(s, s.scene.at, String(c.what || c.quote || 'the area')) : null;
        if (before) {
            return { status: 'resolved', reason: 'searched already', done: true, line: `SEARCHED ALREADY — he searched ${c.what || 'here'} here before (turn ${before.turn}: ${before.success ? 'found what there was to find' : 'found nothing'}), and nothing here has changed since: the same search yields nothing new, no roll, nothing more to take. Looking elsewhere, another way or with a tool is a new search; say plainly that this one is done.` };
        }
        // Patch 9C-1 (ruleset 2, the planner path): training or study with a learning target. The engine decides what
        // it is (a Skill he knows, a learning goal, a new technique), checks its teacher and books time, the session and
        // its progress, or nothing at all (a question, a refusal)
        if (envx?.c && LEARNING.has(c.kind) && rulesetOf(s) >= 2 && (c.learn || c.teacher || c.material)) {
            const minutes = engineMinutes(content, s, c);
            const r = learningActivity(s, content, c, minutes, s.clock.minute);
            if (r.status !== 'resolved') return { status: r.status, reason: r.reason, line: r.line };
            emit({ t: 'time.advanced', d: { minutes, why: c.kind } });
            ctx.auth.booked_min = (ctx.auth.booked_min || 0) + minutes;
            ctx.auth.timeCap = Math.max(ctx.auth.timeCap, ctx.auth.booked_min);
            ctx.expectedKeys[String(c.seq)] = 'activity';
            ctx.engineLines.push(`TIME — ${c.kind}: ${minutes} min (now ${formatClock(s.clock.minute)})`);
            r.events.forEach(emit);
            ctx.engineLines.push(r.engine);
            return { status: 'resolved', cap: minutes, line: `${r.line} ${minutes} minutes pass; it is now ${formatClock(s.clock.minute)}. Narrate it at that length.` };
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
        // Patch 8: a find of a Living Dungeon's level (the crystal vein): its yield of this cycle, booked now (src/v4/living.js)
        const find = envx?.c && c.kind === 'gather' ? gatherEvents(s, trueDungeonOf(s, s.scene.at), `${c.what || ''} ${c.quote || ''}`) : null;
        if (find) {
            find.events.forEach(emit);
            ctx.auth.gather = false;
            if (find.item) ctx.booked.grants.push(find.item);
        }
        const booked = envx?.c && c.kind !== 'search' ? engineMinutes(content, s, c) : null;
        if (find && !booked) return { status: 'resolved', cap, line: find.line };
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
                // Patch 8.4.3 (live 22.10.2026 09:00: MP 8→29 booked, the story said the mana stayed spent): what came back
                rec = ` Recovery booked: ${r.text}; tell what came back as it came back, never that it did not.`;
            }
            if (find) return { status: 'resolved', cap, line: `${find.line} ${booked} minutes pass; it is now ${formatClock(s.clock.minute)}.` };
            return { status: 'resolved', cap, line: `${VERBS[c.kind] || String(c.kind).toUpperCase()} ${c.what ? `${c.what} ` : ''}${span} — resolved by the engine: ${booked} minutes pass; it is now ${formatClock(s.clock.minute)}.${rec} Narrate it as done, at that length; do not cut it short or add time.` };
        }
        if (c.kind === 'search' && envx?.dice) {
            // Patch 6: the same search at the same place, nothing changed there and nothing new in his hands: no second
            // roll (src/v4/features.js); another focus or method is a new search
            const place = s.scene.at;
            const focus = String(c.what || c.quote || 'the area');
            const actor = s.entities.pc?.sheet ? effectiveStats(s.entities.pc.sheet, content).PER ?? 5 : 5;
            const opposition = content.rules.checks?.difficulty_scores?.moderate ?? 6;
            const check = resolveCheck(envx.dice, { label: `Search: ${c.what || 'the area'}`, actor, opposition });
            // Patch 6: a hidden feature of this place the search finds is found, by the engine (what it is, not a hint)
            const pick = envx.c && check.success ? searchFinds(s, place, focus) : null;
            // Patch 7: or a hidden way from here (src/v4/dungeon.js): the one his search names first
            const hiddenWay = envx.c && check.success ? hiddenWayFinds(s, place, keyOf(focus)) : null;
            const wayFirst = !!hiddenWay && (!pick || (hiddenWay.named && !keyOf(`${pick.name} ${pick.kind}`).some((w) => keyOf(focus).includes(w))));
            const found = wayFirst ? null : pick;
            const way = wayFirst ? hiddenWay.link : null;
            if (way) emit(linkEvent({ ...way, hidden: false, found: { turn: s.turn, minute: s.clock.minute, how: 'search' } }));
            // what it found is found before the search is remembered: the place as this search left it (placeState)
            if (found) emit(featureEvent({ ...found, hidden: false, found: { turn: s.turn, minute: s.clock.minute, how: 'search' }, history: [...(found.history || []), { turn: s.turn, minute: s.clock.minute, what: 'found by his search' }] }));
            const record = {
                what: String(c.what || 'search the area').slice(0, 80), stat: 'PER', actor: check.actor_score,
                opposition: check.opposition, chance: check.chance, roll: check.roll, success: check.success,
                claimed: check.success, by: 'engine', seq: c.seq,
                ...(envx.c ? { search: true, at: place, focus: keyOf(focus), found: found?.id || way?.id || null, sig: placeState(s, place) } : {}),
            };
            emit({ t: 'check.recorded', d: record });
            ctx.searchChecks.push(record);
            const result = way
                ? `SUCCESS — he finds ${way.name || 'a hidden way'} (${way.id}), leading to ${placeName(s, otherEnd(way, place))}: tell plainly where it is and where it leads as far as he can see; he knows it now (going through it is his own decision)`
                : found
                ? `SUCCESS — he finds ${found.name} (${found.id}, a ${found.kind}${found.trigger ? ` that springs on ${found.trigger}` : ''}): tell plainly what it is and where; he knows it now`
                : check.success
                    // Patch 8.4.1 (live 22.10.2026 05:43, turn 16): in a Living Dungeon a found foe would be the story's, not
                    // the engine's; there the search finds a thing, a way or a lead, never a foe
                    ? (envx.c && livingOf(s, trueDungeonOf(s, place)) && insideOf(s, trueDungeonOf(s, place))
                        ? 'SUCCESS — reveal a concrete discovery or an actionable lead (a thing, a hidden mark, tracks or a sound that lead on into the level); it brings no foe: the foes of this level come only as the engine adds them (the LEVEL line); a teaser-only answer is not a resolved search'
                        : 'SUCCESS — reveal a concrete discovery, encounter or actionable lead; a teaser-only answer is not a resolved search')
                    : envx.c
                        ? 'FAILURE — he finds nothing new this way: say so plainly (no false lead, nothing he wrongly believes, no interchangeable hint); what is there stays as it is, and another place, method or tool may still find it'
                        : 'FAILURE — resolve it concretely as no relevant find, a false lead, danger/complication, or this avenue being exhausted; do not repeat an interchangeable hint';
            return { status: 'authorized', success: check.success, cap, line: `SEARCHES ${c.what ? `${c.what} ` : ''}${span}. SEARCH CHECK (PER ${check.actor_score} vs ${check.opposition}): ${check.chance}% (d100 ${check.roll}) → ${result}.` };
        }
        return { status: 'authorized', cap, line: `${VERBS[c.kind] || String(c.kind).toUpperCase()} ${c.what ? `${c.what} ` : ''}${span} (at most ${cap} minutes; the story decides how long it takes and what it yields).` };
    },
    take(s, content, c, ctx, emit, envx) {
        // Prototype C (4.3.0-c.6.6.4): the pelts and fangs of foes looted at the fight's end are in his pack already
        const looted = envx?.c && c.object && typeof c.object === 'object' && LOOT_WORDS.test(String(c.object.new || '')) ? lootedHere(s) : [];
        if (looted.length) return { status: 'resolved', reason: 'looted already', done: true, line: `NOTHING MORE — what ${looted.map((id) => who(s, id)).join(', ')} left was credited at the fight's end (the engine's automatic loot, in his pack).` };
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
        // Prototype C (4.3.0-c.6.6.3): the thing someone here keeps ready for his contract (the crate the chirurgeon set out,
        // the basket on the chandler's counter) is his to take, unless they hold it back for a reason of their own: the
        // story decides, and their hand-over books it. Anything else of theirs stays theirs (live 11.10.2026)
        const keeper = o.holder?.entity;
        if (keeper && envx?.c && present(s, keeper) && (o.for_quests || []).some((id) => s.quests[id]?.status === 'active' && s.quests[id]?.taker === 'pc')) {
            return { status: 'authorized', uncertain: true, line: `TAKES — ${o.name} from ${who(s, keeper)}, who keeps it for his contract: he takes it along unless ${who(s, keeper)} holds it back for a reason of their own (the story decides; if it stays with them, nothing that was to follow it happens).` };
        }
        if (keeper) return { status: 'refused', reason: 'someone holds it', line: `CANNOT TAKE — ${who(s, keeper)} holds ${o.name}; ${who(s, keeper)} would have to give it.` };
        if (o.holder?.loc !== s.scene.at) return { status: 'refused', reason: 'it is not here', line: `CANNOT TAKE — ${o.name} is not here.` };
        // Patch 7: a thing in a container that is still shut (the locked chest): opened first, by his attempt
        const shut = o.in ? s.features?.[o.in] : o.in_name ? featureNamed(s, o.holder.loc, o.in_name) : null;
        if (shut && shut.status === 'active' && shut.kind === 'obstacle') return { status: 'refused', reason: 'shut in', line: `CANNOT TAKE — ${o.name} is in ${shut.name} (${shut.id}), which is not open yet: he has to get it open first (an attempt).` };
        const part = c.qty && c.qty < (o.qty ?? 1) ? c.qty : null;
        emit({ t: 'object.moved', d: { id: o.id, to: { entity: 'pc' }, ...(part ? { qty: part, split: `${o.id}_${s.turn}` } : {}) } });
        return { status: 'resolved', line: `TAKES — ${o.name}${(part || o.qty) && (o.stack || (o.qty ?? 1) > 1 || o.unit) ? ` (${part || o.qty}${o.unit ? ` ${o.unit}` : ''})` : ''} along.` };
    },
    drop(s, content, c, ctx, emit, envx) {
        // Patch 3 (live 18.10.2026: "he leaves the staff with them" while the staff stayed equipped): gear he wears or
        // wields comes off first, then it lies here; it gives him nothing while it lies here
        const worn = typeof c.object === 'string' && c.object.startsWith('item.') && !objectOf(s, content, c.object) && Object.values(s.entities.pc.sheet.equipment || {}).some((r) => r === c.object.slice(5) || r?.object === c.object.slice(5));
        const off = worn ? HANDLERS.unequip(s, content, { ...c, object: c.object }, ctx, emit) : null;
        // Patch 7.1: a piece of his own, taken off, is that object again
        const o = objectOf(s, content, worn && s.objects[c.object.slice(5)] ? c.object.slice(5) : c.object);
        if (!o || o.holder?.entity !== 'pc') return { status: 'refused', reason: 'he does not hold it', line: `CANNOT DROP — he does not hold ${o ? o.name : 'that'}.` };
        const qty = c.qty && c.qty < (o.qty ?? 1) ? c.qty : null;
        if (o.template) {
            const n = qty || o.qty;
            transferTemplate(s, o, { loc: s.scene.at }, n, c.seq, ctx, emit, envx, { drop: true });
        } else if (envx?.c) transferCargo(s, content, emit, o, { loc: s.scene.at }, qty, c.seq, { drop: true });
        else emit({ t: 'object.moved', d: { id: o.id, to: { loc: s.scene.at }, ...(qty ? { qty, split: `${o.id}_${s.turn}` } : {}) } });
        return { status: 'resolved', line: `DROPS — ${o.name}${qty ? ` (${qty})` : ''}${off ? ' (taken off first: no longer equipped)' : ''}; it stays here, not his gear until he takes it again.` };
    },
    give(s, content, c, ctx, emit, envx) {
        const text = envx?.text || (env(ctx).commands || []).map(x => x.quote || '').join(' ');
        const commerce = /\b(?:pay me|sell\w*|what (?:it|they)(?:'s| is| are) worth)\b/i;
        const bid = Object.values(s.offers).some(o => o.status === 'open' && o.bid && o.seller === c.to && o.lines.some(l => l.object === c.object));
        if (envx?.c && rulesetOf(s) >= 2 && (commerce.test(c.quote || '') || (bid && commerce.test(text)))
            && !/\b(?:as a gift|for free|no payment|do not pay|don't pay)\b/i.test(c.quote || text)) {
            return { status: 'pending', reason: 'commercial handover needs a sale', line: 'NOT GIVEN AWAY — this handover is for a sale or appraisal. The goods stay Alaric’s until a price is agreed and the sale books both goods and coin.' };
        }
        const o = objectOf(s, content, c.object);
        if (!o || o.holder?.entity !== 'pc') return { status: 'refused', reason: 'he does not hold it', line: `CANNOT GIVE — he does not hold ${o ? o.name : 'that'}.` };
        // Prototype C (4.3.0-c.6.6.3): "I'll follow you up to hand it over myself": he goes to the one he hands it to, in this
        // message. The hand-over waits for them: booked when the story has it change hands there (src/v4/world.js); if the
        // reply does not bring him to them, or they will not take it, he keeps it (live 11.10.2026, Sister Maren)
        if (envx?.c && c.to !== 'pc' && (!present(s, c.to) || (rulesetOf(s) >= 2 && ctx.auth.gos.at(-1)?.to !== s.scene.at)) && (!o.template || rulesetOf(s) >= 2) && ctx.auth.gos.some((g) => (g.seq ?? 0) < (c.seq ?? 0))) {
            const toName = typeof c.to === 'string' && s.entities[c.to] ? who(s, c.to) : String(c.to?.new || c.to || 'the one he goes to').slice(0, 60);
            ctx.conditionals.push({ seq: c.seq, kind: 'give', object: o.id, template: o.template || null, qty: c.qty ?? null, to: typeof c.to === 'string' && s.entities[c.to] ? c.to : null, toName: c.to?.new || null, at: ctx.auth.gos.at(-1)?.to || null, condition: 'hand_over' });
            return { status: 'conditional', condition: 'hand_over', line: `GIVES, when he reaches ${toName} — ${o.name}, into their own hands. If the reply does not bring him to them, or they will not take it, he keeps it.` };
        }
        if (!present(s, c.to) || c.to === 'pc') return { status: 'refused', reason: 'nobody to give it to', line: `CANNOT GIVE — ${typeof c.to === 'string' && s.entities[c.to] ? `${who(s, c.to)} is not here` : 'there is no such person here'}.` };
        const qty = c.qty && c.qty < (o.qty ?? 1) ? c.qty : null;
        if (o.template) {
            const n = qty || o.qty;
            transferTemplate(s, o, { entity: c.to }, n, c.seq, ctx, emit, envx);
        } else if (envx?.c) transferCargo(s, content, emit, o, { entity: c.to }, qty, c.seq);
        else emit({ t: 'object.moved', d: { id: o.id, to: { entity: c.to }, ...(qty ? { qty, split: `${o.id}_${s.turn}` } : {}) } });
        return { status: 'resolved', line: `GIVES — ${o.name}${qty ? ` (${qty})` : ''} to ${who(s, c.to)}.` };
    },
    use(s, content, c, ctx, emit, envx) {
        if (envx?.c && typeof c.object?.new === 'string') {
            const words = text => normText(text).replace(/[^a-z0-9]+/g, ' ').trim();
            const asked = words(c.object.new);
            const bought = asked ? (ctx.boughtObjects || []).map(id => s.objects[id])
                .filter(o => o?.holder?.entity === 'pc' && o.qty > 0 && ` ${words(o.name)} `.includes(` ${asked} `)) : [];
            if (bought.length > 1) return { status: 'clarify', reason: 'which bought item?', line: 'CANNOT USE — more than one bought item matches; name which. None is consumed.' };
            if (bought.length === 1) c = { ...c, object: bought[0].id };
        }
        // Patch 3: a thing he takes in this very message ("cut some meat out ... cook it and eat it") is used once the
        // story has him take it (the world applier books it then); never before it is his
        if (c.object && typeof c.object === 'object' && typeof c.object.new === 'string') {
            const take = Object.entries(ctx.auth.takeNames || {}).find(([seq, name]) => Number(seq) < (c.seq ?? 0) && sameWant(c.object.new, name));
            if (!take) return { status: 'refused', reason: 'he does not hold it', line: `CANNOT USE — he does not hold ${String(c.object.new).slice(0, 60)}.` };
            ctx.conditionals.push({ seq: c.seq, kind: 'use', name: take[1], take: Number(take[0]), qty: c.qty ?? null, condition: 'taken' });
            return { status: 'conditional', condition: 'taken', line: `USES, once he has it — ${take[1]}${c.qty ? ` (${c.qty})` : ''}: only what the story lets him take (step ${take[0]}); if he gets none, he uses none.` };
        }
        // gear he wears or wields is used, never used up (a staff, a cloak)
        const tpl = typeof c.object === 'string' && c.object.startsWith('item.') ? c.object.slice(5) : null;
        if (tpl && Object.values(s.entities.pc.sheet.equipment || {}).includes(tpl)) {
            return { status: 'resolved', line: `USES — ${content.items.get(tpl)?.name || tpl} (his gear: it stays equipped and is not used up; the story tells what it does).` };
        }
        const o = objectOf(s, content, c.object);
        if (!o || o.holder?.entity !== 'pc') return { status: 'refused', reason: 'he does not hold it', line: `CANNOT USE — he does not hold ${o ? o.name : 'that'}.` };
        // Patch 8: a Return Stone carries him to the gate of the Dungeon he is in, used up in the same step
        const back = envx?.c ? returnStone(s, content, o) : null;
        if (back?.refuse) return { status: 'refused', reason: back.refuse, line: `CANNOT USE — ${o.name}: ${back.refuse}; it stays his, unused.` };
        if (back) {
            back.events.forEach(emit);
            return { status: 'resolved', line: `USES — ${o.name}: crushed in his hand, it carries him out to the gate of ${placeName(s, back.to)}; the stone is spent. He stands at the gate now (the engine moved him).` };
        }
        // Patch 9C-2b: a Skill Stone he activates (ruleset 2, the planner path): checked here, booked by the shared
        // finalization after the turn (src/v4/growth.js finalizeGrowth) together with the one unit it spends; one that
        // fails there books nothing and stays his
        const stone = envx?.c ? stoneActivation(s, content, o) : null;
        if (stone?.refuse) return { status: 'refused', reason: 'stone', line: `CANNOT USE — ${o.name}: ${stone.refuse}; it stays his, whole and unused, and he learns nothing from it.` };
        if (stone) {
            const key = `stone:${o.id}:t${s.turn}`;
            if ((ctx.booked.activations || []).some((a) => a.object === o.id)) return { status: 'refused', reason: 'stone', line: `CANNOT USE — ${o.name} is activated once in this message already.` };
            ctx.booked.activations = [...(ctx.booked.activations || []), { key, object: o.id, seq: c.seq }];
            return { status: 'resolved', line: `ACTIVATES — ${o.name} (it holds ${stone.target.aspects.length ? `${stone.target.aspects.join('/')} ` : ''}${stone.target.fn}): he wakes the stone and takes in what it holds. The engine books what he learns from it below (NEW SKILL), and the stone is spent then; if no NEW SKILL is named, the stone stays whole and he learns nothing.` };
        }
        // Review of 9C-2b (R1): a thing called a Skill Stone whose teaching was never established is no source: refused,
        // never told as a tool that does something
        const called = envx?.c && rulesetOf(s) >= 2 && profileOf(content, o)?.kind !== 'skill_source' ? namedSource(content, o) : null;
        if (called === 'stone') return { status: 'refused', reason: 'stone', line: `CANNOT USE — ${o.name}: what it holds was never established, so it teaches nothing; it stays his, whole and unused, and he learns nothing from it.` };
        // Patch 9C-2c: a Passive Stone's power only the engine establishes; one the story or a trader called so gives nothing
        if (called === 'passive_stone') return { status: 'refused', reason: 'passive stone', line: `CANNOT USE — ${o.name}: no power of it was ever established by the engine, so it awakens nothing; it stays his, whole and unused, and nothing about him changes. Tell no new Passive or power.` };
        // Patch 9C-2b: reading a manual teaches nothing by itself; studying it for a time is (activity study)
        const manual = called === 'manual' || (envx?.c && rulesetOf(s) >= 2 && profileOf(content, o)?.kind === 'skill_source' && profileOf(content, o).source === 'manual');
        if (manual) return { status: 'resolved', line: `READS — ${o.name}: he looks it over; it stays his. Reading teaches him nothing by itself: no Skill and no Learning Progress unless he studies it for a time (the engine books study).` };
        // Hotfix c.6.6.18: an attack item (the scorchburst scroll) is resolved as an attack (src/v4/planner.js itemAttack),
        // never used up here with its effect left to the story; where no attack is made of it, it stays his
        if (itemEffectOf(content, o)?.attack) return { status: 'refused', reason: 'an attack item', line: `CANNOT USE — ${o.name} is an attack: thrown at a foe, the engine resolves it in a fight; nothing was used up, it stays his, nothing burns and nothing is struck.` };
        // Patch 7.2: a restorative (a healing potion, a mana potion, a stamina tonic) restores what its own profile says,
        // never more than his maximum and never what the story claims; outside a fight here, in one it is his main action
        // on his Turn (src/combat.js itemAction). One that would do nothing is refused and stays his
        const rp = restoreOf(content, o);
        if (rp) {
            if (s.encounter || (s.pending_combat || []).length) return { status: 'refused', reason: 'in a fight', line: `CANNOT USE — in a fight ${o.name} is his main action on his Turn; nothing was drunk or used up.` };
            const sheet = s.entities.pc.sheet;
            const dv = deriveCharacter(sheet, content);
            const max = { hp: dv.maxHp, mp: dv.maxMp, sta: dv.maxSta };
            const current = { hp: sheet.hp, mp: sheet.mp, sta: sheet.sta };
            const n = Math.min(c.qty || 1, o.qty ?? 1);
            const done = [];
            for (let i = 0; i < n; i++) {
                const x = restoreEffect(content, rp, { level: sheet.level, current, max });
                if (x.refused) { if (!done.length) return { status: 'refused', reason: 'no effect', line: `CANNOT USE — ${x.refused}; nothing was drunk or used up, it stays his.` }; break; }
                current[x.resource] = x.after;
                done.push(x);
            }
            const R = rp.resource.toUpperCase();
            emit({ t: 'resource.changed', d: { id: 'pc', resource: rp.resource, value: current[rp.resource], why: `${o.name} (${done.length > 1 ? `${done.length} × ` : ''}${rp.amount} ${R})` } });
            const left = (o.qty ?? 1) - done.length;
            if (o.template) emit({ t: 'item.changed', d: { id: 'pc', item: o.template, qty: -done.length, why: 'used' } });
            else emit({ t: 'object.consumed', d: { id: o.id, by: 'pc', ...(left > 0 ? { qty: done.length } : {}) } });
            const gained = done.reduce((a, x) => a + x.amount, 0);
            const lost = done.length * rp.amount - gained;
            return { status: 'resolved', line: `USES — ${o.name}${done.length > 1 ? ` (${done.length})` : ''}: ${R} ${done[0].before} → ${current[rp.resource]} (+${gained}${lost ? `; ${lost} beyond his maximum of ${max[rp.resource]} is lost` : ''}); ${left > 0 ? `${left} left` : 'it is used up'}. The engine booked it; no other effect.` };
        }
        const use = useOf(content, o);
        // a tool, gear or a document is used, not used up (live 18.10.2026: the flint and steel). 4.3.0-c.6.6.48 (live
        // 23.10.2026: the unprofiled "Lesser Spark Stone" used three times, each told as a power waking in him): what it
        // achieves is the story's, in the world; a Skill, Learning Progress or a new ability only the engine books
        const growth = envx?.c && rulesetOf(s) >= 2 ? ' Using it gives him no Skill, no Learning Progress and no new ability or power: the engine books those, and it booked none here.' : '';
        if (use === 'tool' || use === 'equipment') return { status: 'resolved', line: `USES — ${o.name} (a tool: it stays with him, not used up; the story tells what it achieves).${growth}` };
        const qty = Math.min(c.qty || 1, o.qty ?? 1);
        const left = (o.qty ?? 1) - qty;
        if (o.template) emit({ t: 'item.changed', d: { id: 'pc', item: o.template, qty: -qty, why: 'used' } });
        else emit({ t: 'object.consumed', d: { id: o.id, by: 'pc', ...(left > 0 ? { qty } : {}) } });
        if (use === 'food') {
            const off = spoiled(s, o) ? ' It has spoiled (kept too long): he eats it anyway, as he chose; the story tells how it sits.' : '';
            return { status: 'resolved', line: `EATS — ${unitsOf(qty, o.unit || 'portion')} of ${o.name}; ${left > 0 ? `${unitsOf(left, o.unit || 'portion')} left, still his` : 'none left'}.${off} No other meal is eaten or used up.` };
        }
        return { status: 'resolved', line: `USES — ${o.name}${qty > 1 ? ` (${qty})` : ''}; ${left > 0 ? `used up: ${qty}, ${left} left` : 'it is used up'}.` };
    },
    pay(s, content, c, ctx, emit) {
        const reg = s.offers[REGISTRATION_OFFER];
        const fee = feeOf(content);
        const theFee = c.amount_cp === null || c.amount_cp === undefined || c.amount_cp === fee;
        // Registration-purpose money belongs to the canonical service, never the ordinary cash fallback.
        const explicitPurpose = !c.for && registrationPaymentWords(c, env(ctx).text);
        const asksRegistration = explicitPurpose || (env(ctx).commands || []).some(x => x.type === 'guild.register');
        const registrationFee = !independentPayment(c) && (/\b(?:regist\w*|membership|guild fee)\b/i.test(c.for || '')
            || ((asksRegistration || reg?.status === 'open') && (!c.for || /^(?:the )?fee$/i.test(c.for))));
        if (ctx.auth.c && rulesetOf(s) >= 2 && registrationFee) {
            if (membership(s)) return { status: 'refused', reason: 'already a member', line: 'NOT PAID — already registered; no second registration fee.' };
            if (!hallOf(s, s.scene.at)) return { status: 'refused', reason: 'not at a Guild hall', line: 'NOT PAID — registration requires arrival inside a Guild hall; the registration fee stays with Alaric.' };
        }
        if (reg?.status === 'open' && hallOf(s, s.scene.at) && theFee && !independentPayment(c) && (!c.for || registrationFee)) {
            return HANDLERS['offer.accept'](s, content, { ...c, type: 'offer.accept', offer: REGISTRATION_OFFER, lines: null }, ctx, emit);
        }
        // "Here are the 2 silver, register me": the fee of a registration this message asks for (or names) is the Guild's
        // canon fee, paid at the desk; never an ordinary payment to the clerk
        const asks = asksRegistration || /\b(?:regist\w*|membership|guild)\b/i.test(c.for || '');
        if (asks && registrationFee && theFee && hallOf(s, s.scene.at) && !membership(s)) {
            openRegistration(s, content, emit);
            return HANDLERS['offer.accept'](s, content, { ...c, type: 'offer.accept', offer: REGISTRATION_OFFER, lines: null }, ctx, emit);
        }
        // Patch 8.4.2 (live 22.10.2026 07:49: "I put one silver on the counter" for the 2 silver fee was booked as a payment
        // to the clerk, then the fee again: 30 cp): another amount for a registration is no payment; the registration
        // stays open at its fee. A payment that names something else (a tip for her help) stays an ordinary one
        const other = !!c.for && !/\b(?:regist\w*|membership|guild|fee)\b/i.test(c.for);
        if (asks && !other && !theFee && hallOf(s, s.scene.at) && !membership(s)) {
            openRegistration(s, content, emit);
            const offered = cpText(c.amount_cp, content);
            return {
                status: 'refused', reason: `the Guild's registration fee is ${feeWords(fee)}, not ${offered}; nothing was paid`,
                line: `NOT PAID — ${offered} is not the Guild's registration fee (${feeWords(fee)}, one-time): nothing is paid, his coin stays ${cpText(s.entities.pc.sheet.coin_cp, content)}. Let the clerk name the fee; he has not paid it.`,
            };
        }
        // A purchase-purpose payment must buy its goods/service, never fall through to a free cash transfer.
        // Reuse existing offers and purchase decisions; a room is already an engine-booked service.
        const settlingDebt = /\b(?:debt|repay|repayment|reimburse)\b/i.test(`${c.for || ''} ${c.quote || ''}`);
        const purchase = ctx.auth.c && rulesetOf(s) >= 2 && !independentPayment(c) && !settlingDebt && (
            ROOM_WORDS.test(c.for || c.quote || '') || /\b(?:buy|purchase|offered|quoted)\b/i.test(c.quote || '')
            || (c.for && (s.decisions.some(d => d.kind === 'purchase' && d.at === s.scene.at && (!d.seller || d.seller === c.to) && paymentFor(c, [{what:d.what}]))
                || Object.values(s.offers).some(o => !o.canon && !o.bid && o.seller === c.to && o.at === s.scene.at && paymentFor(c, o.lines)))));
        if (purchase) {
            if (!present(s, c.to)) return { status: 'refused', reason: 'nobody to pay', line: 'CANNOT BUY — the seller is not here; nothing was paid.' };
            if (!c.for) return { status: 'clarify', reason: 'purchase purpose missing', line: 'NOT PAID — which offered goods or service is this payment for? Nothing changes hands.' };
            const buy = {...c, type:'buy', what:c.for, from:c.to, qty:null, max_cp:c.amount_cp ?? null, any_price:false};
            expirePurchaseRequest(s, buy, emit);
            return HANDLERS.buy(s, content, buy, ctx, emit);
        }
        // an open offer of the one he pays: paying it is accepting it
        const offer = Object.values(s.offers).find((o) => o.status === 'open' && !o.canon && !o.bid && o.seller === c.to
            && (!ctx.auth.c || rulesetOf(s) < 2 || (!independentPayment(c) && (!c.for || paymentFor(c, o.lines))))
            && (c.amount_cp === null || c.amount_cp === undefined || pickLines(o).cp === c.amount_cp));
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
        const offers = Object.values(s.offers).filter((o) => o.status === 'open' && !o.bid
            && !offerAvailability(s, o) && (!o.canon || o.stock === 'manuals') && (!c.from || o.seller === c.from));
        const matches = offers.map((o) => ({ o, lines: purchaseLines(c.what, o.lines) })).filter((x) => x.lines.length);
        if (matches.length > 1) return { status: 'clarify', reason: 'which offer?', line: 'CLARIFY — several sellers or offers match; select the seller and offer before buying.' };
        const match = matches[0];
        // an offer lists it: buying is accepting that line, in the number he names and within the limit he set
        if (match) return HANDLERS['offer.accept'](s, content, { ...c, type: 'offer.accept', offer: match.o.id, lines: match.lines.map((l) => l.id), qty: c.qty ?? null }, ctx, emit);
        const limit = c.max_cp !== null && c.max_cp !== undefined;
        emit({ t: 'decision.opened', d: { decision: { id: `dec.t${s.turn}.${c.seq}`, kind: 'purchase', what: c.what, seller: c.from || null, at: s.scene.at, turn: s.turn, max_cp: limit ? c.max_cp : null, any_price: !!c.any_price, qty: c.qty || null, priced: false, seq: c.seq } } });
        ctx.expectedKeys[String(c.seq)] = 'buy';
        if (limit || c.any_price) {
            const rule = limit ? `if the price is at most ${c.max_cp} cp` : 'at any price';
            return {
                status: 'conditional', condition: 'priced_within', line: `BUYS — ${c.what} ${rule}: when the seller names the price, he pays it and takes it${limit ? '; above it he declines' : ''}.`,
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
        // Prototype C (4.3.0-c.6.6.5): what a buyer here has bid for is sold by accepting that bid ("i accept and sell all
        // parts to her"): the sell commands of the message cover the lot, or he sells exactly a line she priced
        const bid = Object.values(s.offers).find((x) => x.status === 'open' && x.bid && present(s, x.seller) && (!c.to || x.seller === c.to) && x.lines.some((l) => l.object === o.id));
        if (bid) {
            const sells = (env(ctx).commands || []).filter((x) => x.type === 'sell');
            const line = bid.lines.find((l) => l.object === o.id);
            const whole = bid.lines.every((l) => sells.some((x) => x.object === l.object && (!x.qty || x.qty === l.qty))) || /\b(?:all|every\w*|the lot|the whole|them)\b/i.test(c.quote || '');
            if (whole) return HANDLERS['offer.accept'](s, content, { ...c, type: 'offer.accept', offer: bid.id, lines: null, qty: null }, ctx, emit);
            if (Number.isInteger(line.price_cp) && (!c.qty || c.qty === line.qty)) return HANDLERS['offer.accept'](s, content, { ...c, type: 'offer.accept', offer: bid.id, lines: [line.id], qty: null }, ctx, emit);
        }
        if (ctx.soldInBid?.has(o.id)) return { status: 'resolved', done: true, line: `SOLD — ${o.name} went with the lot above.` };
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
        if (!o || o.status !== 'open') {
            if (o?.bid && o.status === 'accepted' && ctx.soldInBid?.size) return { status: 'resolved', done: true, line: 'SOLD — with the lot above.' };
            return { status: 'refused', reason: 'no open offer', line: 'CANNOT ACCEPT — there is no such open offer.' };
        }
        if (ctx.auth.c && rulesetOf(s) >= 2) {
            const why = acceptanceWhy(c, o, who(s, o.seller), content.rules.currency);
            if (why) return { status: 'refused', reason: why, line: `NOT AGREED — ${why}. Nothing changes hands; clarify the party or price.` };
        }
        if (o.bid) return acceptBid(s, content, c, ctx, emit, o);
        const employeeQuote = /\b(?:I(?:'ll| will)? (?:work|guard|watch|keep)|my (?:wage|pay)|hire me)\b/i.test(c.quote || '');
        const ambiguousWork = o.lines.some(l => l.kind === 'service' && l.service === 'other'
            && /\b(?:keeping|guarding|watching|working|shift)\b/i.test(l.what))
            && !/\b(?:buy|purchase|hire|pay|rent)\b/i.test(c.quote || '');
        if (!o.canon && (employeeQuote || ambiguousWork) && o.lines.some(l => l.kind === 'service')) {
            return { status: 'clarify', reason: 'work is not a purchase', line: `CLARIFY — is the NPC hiring Alaric, or is Alaric buying the NPC’s service? ${privateQuestsOf(s) ? 'Record employer-paid work as a private job.' : 'Record the NPC request and terms as ordinary world facts.'} No money was charged.` };
        }

        // Prototype C (4.3.0-c.6.6.5): an offer is the other side SELLING to Alaric; agreeing to sell his own things is
        // never paying for them (live 15.10.2026: "i accept and sell all parts to her" paid 80 cp for his own parts)
        if (!o.canon && SELLING.test(c.quote || '') && !BUYING.test(c.quote || '')) {
            // an offer stored the wrong way round whose lines name exactly his own things ("mudwyrm parts: 2 skins, 2
            // fangs … the lot") is the buyer's price for them; anything else is a question, never a purchase
            const lot = bidOfOffer(s, o);
            if (lot) {
                const bid = { ...o, bid: true, lines: lot.lines, price_cp: lot.price_cp };
                emit({ t: 'offer.created', d: { offer: bid } });
                return acceptBid(s, content, { ...c, lines: null }, ctx, emit, bid);
            }
            return { status: 'clarify', reason: 'buy or sell?', line: `CLARIFY — ${who(s, o.seller)}'s open offer sells ${picksText(pickLines(o).picks || [])} to Alaric; he speaks of selling. Does he buy that, or sell his own things (which, and for what price)?` };
        }
        // the lines he takes, in the number he names (review of 4.1.0: "three flasks" became one flask for one price)
        const pick = pickLines(o, c.lines, c.qty ?? null);
        if (pick.clarify) return { status: 'clarify', reason: 'which line?', line: `CLARIFY — ${c.qty} of which: ${pick.clarify.join(' or ')}?` };
        if (pick.error === 'the offer has no such item') return { status: 'refused', reason: 'no such line', line: `CANNOT ACCEPT — the offer has no such item. Available positions: ${o.lines.map(l => `${l.id}: ${l.what}`).join('; ')}. Nothing was bought.` };
        if (pick.error) return { status: 'refused', reason: 'not in that amount', line: `CANNOT BUY ${c.qty} — ${pick.error}.` };
        const price = pick.cp;
        const booked = bookPurchase(s, emit, { offer: o, picks: pick.picks, cp: price, objectId: (what) => `obj.t${env(ctx).msg}.${slug(what)}`, content, consent: c });
        if (booked.error) {
            const why = booked.error === 'above his price limit' ? `${picksText(pick.picks)} costs ${cpText(price, content)}, more than the ${c.max_cp} cp he allows` : booked.error;
            return { status: 'refused', reason: booked.error, line: `NOT BOUGHT — ${why}. Nothing changes hands.` };
        }
        const reg = pick.picks.some((p) => p.line.service === 'guild_registration');
        // Patch 8: the gate's fee paid: he may pass the gate (src/v4/living.js), until he is out again
        if (o.gate) emit({ t: 'dungeon.pass', d: { id: o.gate, pass: { turn: s.turn, cp: price } } });
        let power = null;
        if (reg) {
            power = registerEvents(s, content, emit).power;
            ctx.booked.registration = true;
            ctx.booked.grants.push('Guild plate');
        }
        // the goods are the engine's: on the planner's path the story's hand-over of exactly these, by this seller, is
        // this purchase (world.js, 4.3.0-c.6.6.48), anything else it tells stands; without the planner, by their name
        for (const p of pick.picks.filter((x) => x.line.kind === 'goods')) {
            if (ctx.auth.c) (ctx.booked.goods ||= []).push({ what: p.line.what, units: p.units, seller: o.seller });
            else ctx.booked.grants.push(p.line.what);
        }
        // the seller was paid exactly the price: coin from the seller in the reply (change) is not a gift
        if (!o.canon) ctx.booked.sellers.push(o.seller);
        for (const d of s.decisions.filter((x) => x.offer === o.id || (reg && x.kind === 'registration') || purchaseDecisionMatches(x, o, pick.picks))) emit({ t: 'decision.closed', d: { id: d.id, status: 'accepted' } });
        if (o.gate) return { status: 'resolved', line: `PAYS — the entry fee of ${placeName(s, o.gate)}, ${cpText(price, content)}: he may pass the gate (until he comes out again).` };
        if (reg) return { status: 'resolved', line: `PAYS — the Guild registration fee, ${price} cp: registered at Guild Rank ${content.rules.guild.ranks[0]}; the crystal reads his Power Rank: ${power} (his measured strength, a separate scale from the Guild's ranks); he receives his Guild plate.` };
        return { status: 'resolved', line: `ACCEPTS the offer — ${picksText(pick.picks)} for ${cpText(price, content)}; he pays ${who(s, o.seller)}.` };
    },
    // Patch 9C-2c (src/v4/passive_growth.js): his answer to a development the engine offers him (a POSSIBLE PASSIVE);
    // 9C completion: the older names of development.accept/decline, for a Passive (an offered Skill's id goes there too)
    'passive.accept'(s, content, c, ctx, emit, envx) {
        if (skillOffers(s).some((d) => d.id === c.offer)) return HANDLERS['development.accept'](s, content, c, ctx, emit, envx);
        if (!envx?.c) return { status: 'refused', reason: 'not here', line: 'NO NEW PASSIVE — no development is offered to him.' };
        const r = acceptPassive(s, content, c.offer ?? null, c.replace ?? null);
        if (r.refuse) return { status: 'refused', reason: r.refuse, line: r.line };
        for (const e of r.events) emit(e);
        (ctx.booked.passives ||= []).push(r.gained);
        return { status: 'resolved', line: r.line };
    },
    'passive.decline'(s, content, c, ctx, emit, envx) {
        if (skillOffers(s).some((d) => d.id === c.offer)) return HANDLERS['development.decline'](s, content, c, ctx, emit, envx);
        if (!envx?.c) return { status: 'refused', reason: 'not here', line: 'NOTHING TO DECLINE — no development is offered to him.' };
        if (classSelection(s, c.offer) || (!c.offer && classOffer(s) && !developmentOffers(s).length)) return { status: 'resolved', line: 'CLASS CHOICE POSTPONED — the same options stay available in #class; nothing about him changes.' };
        const r = declinePassive(s, content, c.offer ?? null);
        if (r.refuse) return { status: 'refused', reason: r.refuse, line: r.line };
        for (const e of r.events) emit(e);
        return { status: 'resolved', line: r.line };
    },
    // 9C completion (src/v4/skill_growth.js): his answer to any development the engine offers him, a Passive or a Skill:
    // the offer he names, else the one offered when there is exactly one
    'development.accept'(s, content, c, ctx, emit, envx) {
        if (!envx?.c) return { status: 'refused', reason: 'not here', line: 'NOTHING TO ACCEPT — no development is offered to him.' };
        if (classSelection(s, c.offer) || (!c.offer && classOffer(s) && !developmentOffers(s).length)) {
            const r = acceptClass(s, content, c.offer || classOffer(s).id);
            if (r.refuse) return { status: 'refused', reason: r.refuse, line: r.line };
            r.events.forEach(emit); (ctx.booked.classes ||= []).push(r.booked);
            return { status: 'resolved', line: r.line };
        }
        const all = [...developmentOffers(s), ...(classOffer(s) ? [classOffer(s)] : [])];
        const d = typeof c.offer === 'string' ? all.find((x) => x.id === c.offer) : all.length === 1 ? all[0] : null;
        if (!d) return { status: 'refused', reason: all.length ? 'which offer?' : 'no offer', line: `NOTHING TO ACCEPT — ${all.length ? `which of the offered developments: ${all.map((x) => `${x.kind === 'class' ? 'E class choice' : x.kind === 'skill' ? x.skill.name : x.passive.name} (${x.id})`).join(' or ')}` : 'no development is offered to him'}. Nothing changes.` };
        if (d.kind === 'passive') return HANDLERS['passive.accept'](s, content, { ...c, offer: d.id }, ctx, emit, envx);
        const r = acceptSkill(s, content, d.id);
        if (r.refuse) return { status: 'refused', reason: r.refuse, line: r.line };
        for (const e of r.events) emit(e);
        (ctx.booked.skills ||= []).push(r.booked);
        return { status: 'resolved', line: r.line };
    },
    'development.decline'(s, content, c, ctx, emit, envx) {
        if (!envx?.c) return { status: 'refused', reason: 'not here', line: 'NOTHING TO DECLINE — no development is offered to him.' };
        if (classSelection(s, c.offer) || (!c.offer && classOffer(s) && !developmentOffers(s).length)) return { status: 'resolved', line: 'CLASS CHOICE POSTPONED — the same options stay available in #class; nothing about him changes.' };
        const all = [...developmentOffers(s), ...(classOffer(s) ? [classOffer(s)] : [])];
        const d = typeof c.offer === 'string' ? all.find((x) => x.id === c.offer) : all.length === 1 ? all[0] : null;
        if (!d) return { status: 'refused', reason: all.length ? 'which offer?' : 'no offer', line: `NOTHING TO DECLINE — ${all.length ? `which of ${all.map((x) => (x.kind === 'class' ? 'E class choice' : x.kind === 'skill' ? x.skill.name : x.passive.name)).join(' or ')}?` : 'no development is offered to him'}` };
        if (d.kind === 'passive') return HANDLERS['passive.decline'](s, content, { ...c, offer: d.id }, ctx, emit, envx);
        const r = declineSkill(s, content, d.id);
        if (r.refuse) return { status: 'refused', reason: r.refuse, line: r.line };
        for (const e of r.events) emit(e);
        return { status: 'resolved', line: r.line };
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
            if (!there) {
                const accepted = acceptContract(s, content, q, emit, { step: c.seq });
                if (!accepted.ok) return { status: 'refused', reason: accepted.reason, line: `CANNOT ACCEPT — ${questLine(q)}: ${accepted.reason}.` };
            } else ctx.conditionals.push({ seq: c.seq, kind: 'accept', quest: q.id, condition: 'arrive_guild_hall', hall: there });
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
        return { status: 'resolved', line: `ACCEPTS — ${questLine(q)}${q.giver ? ` from ${who(s, q.giver)}` : ''}. Acceptance alone performs no work or journey and earns no wages. Tell only the agreement unless PLAYER ACTIONS also contains his actual work.` };
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
        const go = hallAhead(ctx, c, !!envx?.c && rulesetOf(s) >= 2);
        if (go) {
            // the same check the desk makes on arrival (guild.js contractReady)
            const ready = contractReady(s, content, q, { c: cc });
            ctx.conditionals.push({ seq: c.seq, kind: 'turn_in', quest: q.id, condition: 'arrive_guild_hall', hall: go.guild_candidate ? null : go.to, ...(go.guild_candidate ? { guild_candidate: true, go_seq: go.seq } : {}) });
            ctx.booked.turnIns.push(q.id);
            return {
                status: 'conditional', condition: 'arrive_guild_hall',
                line: `TURNS IN, when he reaches the Guild hall — ${questLine(q)}: ${ready.ok ? `the achieved outcome is ready for desk acceptance; the Guild pays ${q.payout_cp} cp` : ready.mode === 'count_short' || (cc && ready.mode !== 'not_ready') ? `the desk will refuse it: ${ready.reason}` : 'the story has not yet established the contract outcome as achieved'}.${ready.ok ? hands : ''} If the reply does not reach the hall, nothing is turned in.${go.guild_candidate ? " This destination is not yet a recognized branch: only a narrated operating, staffed Guild desk can establish it. A sign or rumor cannot. Do not add further proof or payment requirements." : ""}`,
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
        return { status: 'pending', reason: 'fee', line: `REGISTERS${ahead ? ', when he reaches the Guild hall' : ''} — pending: the Guild's registration fee is ${feeWords(fee)}, one-time; ${rankCanon(content)}. Let the clerk name the fee and explain; stop there: he has not agreed to pay.` };
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
        if (!ahead && envx.c) {
            openGuildManuals(s, content, emit, hall);
            const stock = Object.values(s.offers).find(o => o.stock === 'manuals' && o.status === 'open' && o.at === hall);
            if (stock) ctx.engineLines.push(...offerCard(s, content, stock));
        }
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
        // Patch 8: a cull's number and a Dungeon level to clear show on the board (src/v4/guild.js goalText)
        const rows = listed.map((q) => `**${q.title}**${envx?.c ? goalText(s, content, q, { board: true }) : ''} — client: ${q.client || 'unspecified'} · reward: ${q.payout_cp} cp · ${q.task || q.desired_end_state || objectiveText(q)}`).join('\n');
        // Prototype C (4.3.0-c.6.2): only the reading that posts the day's board shows new notices; a later reading that
        // day shows the same ones again, not as new
        const fresh = !envx.c || !!gen?.listings?.length;
        const line = `READS the ${rank} board${when} — BOARD (${fresh ? 'these listings now become canonical because Alaric actually reads them; ' : ''}show exactly these, invent no other official contract; present the notices in the existing title-first readable format; ${fresh ? 'these official listings have JUST become available: do not claim, withdraw or retroactively remove any of them during this first display' : 'these are the notices posted earlier today, the same as before, nothing new: do not call them new, fresh or just posted, and do not claim, withdraw or remove any of them during this display'}):\n${rows}\nStored objectives and any verification examples are continuity memory only.`;
        if (ahead) return { status: 'conditional', condition: 'arrive_guild_hall', line: `${line}\nIf the reply does not reach the hall, he sees none of it.` };
        // Patch 8.1 (§11): the official listings as the engine has them, in the System card (the story may word the
        // notices; their number, client, reward, Rank and goal are these)
        if (envx.c) ctx.engineLines.push(...boardCard(s, content, rank, settlementOf(s, hall), listed));
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
        const bought = asked ? (ctx.boughtObjects || []).map(id => s.objects[id]).filter(o => o && normText(o.name) === asked) : [];
        const o = asked ? (bought.length === 1 ? bought[0] : null) : objectOf(s, content, c.object);
        if (!o || o.holder?.entity !== 'pc') return { status: 'refused', reason: 'he does not hold it', line: 'CANNOT EQUIP — he does not hold that.' };
        if (o.profile === null) return { status: 'refused', reason: 'ordinary merchandise', line: `CANNOT EQUIP — ${o.name} has no combat equipment values.` };
        // Patch 7.1: a piece of his own (bought, looted, found) is worn with its own values, never those of a template of
        // the same name; a template item of the sheet as before
        let own = !o.template ? profileOf(content, o) : null;
        const tpl = own ? null : o.template || (content.items.has(o.source?.item) ? o.source.item : null) || [...content.items.entries()].find(([, i]) => normText(i.name) === normText(o.name))?.[0];
        // a thing established before snapshots (an "iron sword" of the story): its values as its name gives them now
        if (!own && !tpl) own = itemProfile(content, o);
        const item = own?.kind === 'gear' ? { id: o.id, object: o.id, name: o.name, rank: own.rank, slot: own.slot, family: own.family, atk: own.atk, matk: own.matk, def: own.def, mdef: own.mdef, ...(own.requires_rank ? { requires_rank: own.requires_rank } : {}) } : tpl && content.items.get(tpl);
        if (!item?.slot || ['ammo', 'container'].includes(item.slot)) return { status: 'refused', reason: 'no gear values', line: `CANNOT EQUIP — the engine knows no gear values for ${o.name}.` };
        // Patch 7.1: ranked gear only up to his own Power-Rank (or the Rank the piece itself names)
        const ranked = rankRefusal(content, s.entities.pc.sheet.level, { kind: 'gear', title: o.name, rank: item.rank, requires_rank: item.requires_rank });
        if (ranked) return { status: 'refused', reason: 'rank', line: `CANNOT EQUIP — ${ranked}. It stays in his pack.` };
        const slot = c.slot || item.slot;
        if (!equipmentSlotKnown(content, slot) || slot !== item.slot) return { status: 'refused', reason: 'wrong equipment slot', line: `CANNOT EQUIP — ${o.name} fits the ${item.slot} slot only. It stays in his pack.` };
        const current = s.entities.pc.sheet.equipment[slot];
        if (o.template) emit({ t: 'item.changed', d: { id: 'pc', item: tpl, qty: -1, why: 'equipped' } });
        else if ((o.qty ?? 1) > 1) {
            // Wear one physical unit; its separate identity lets unequip return it without touching the spare units.
            const base = `${o.id}_equipped`;
            let id = base;
            for (let n = 2; s.objects[id]; n++) id = `${base}_${n}`;
            emit({ t: 'object.moved', d: { id: o.id, qty: 1, split: id, to: { consumed: 'equipped' } } });
            if (own) Object.assign(item, { id, object: id });
        }
        else emit({ t: 'object.consumed', d: { id: o.id, by: 'equipped' } });
        if (current) {
            if (typeof current === 'string') emit({ t: 'item.changed', d: { id: 'pc', item: current, qty: 1, why: 'unequipped' } });
            else if (current.object && s.objects[current.object]) emit({ t: 'object.moved', d: { id: current.object, to: { entity: 'pc' } } });
        }
        emit({ t: 'item.equipped', d: { id: 'pc', slot, item: own ? item : tpl } });
        const vals = ['atk', 'matk', 'def', 'mdef'].filter((k) => item[k]).map((k) => `${k.toUpperCase()} ${item[k]}`).join(', ');
        return { status: 'resolved', line: `EQUIPS — ${item.name} (${slot}${vals ? `; ${vals}` : ''}).` };
    },
    unequip(s, content, c, ctx, emit) {
        const eq = s.entities.pc.sheet.equipment;
        // Patch 3: "I take off everything I'm wearing" (object null): all he wears, not the weapon or shield in his hands
        if (c.object === null || c.object === undefined) {
            const worn = Object.keys(eq).filter((k) => eq[k] && !HELD_SLOTS.has(k));
            if (!worn.length) return { status: 'refused', reason: 'not equipped', done: true, line: 'NOTHING TO DO — he wears nothing he could take off.' };
            const names = worn.map((k) => HANDLERS.unequip(s, content, { ...c, object: typeof eq[k] === 'string' ? `item.${eq[k]}` : eq[k]?.id ? `item.${eq[k].id}` : eq[k] }, ctx, emit))
                .filter((r) => r.status === 'resolved').map((r) => r.line.replace(/^UNEQUIPS — |\.$/g, ''));
            return { status: 'resolved', line: `UNEQUIPS — ${names.join(', ')}: all he wore; in his pack now, no longer worn.` };
        }
        const ref = typeof c.object === 'string' ? c.object.replace(/^item\./, '') : null;
        // Patch 7.1: a piece of his own is named by its object id (the catalog's "item.<id>")
        const slot = Object.keys(eq).find((k) => eq[k] === ref || (typeof eq[k] === 'object' && (eq[k]?.object === ref || eq[k]?.id === ref || normText(eq[k]?.name) === normText(content.items.get(ref)?.name || ref))));
        if (!slot) return { status: 'refused', reason: 'not equipped', line: 'NOTHING TO DO — he has nothing like that equipped.' };
        const cur = eq[slot];
        emit({ t: 'item.equipped', d: { id: 'pc', slot, item: null } });
        if (typeof cur === 'string') emit({ t: 'item.changed', d: { id: 'pc', item: cur, qty: 1, why: 'unequipped' } });
        // Patch 7.1: a piece of his own goes back to his pack with its own values
        else if (cur?.object && s.objects[cur.object]) emit({ t: 'object.moved', d: { id: cur.object, to: { entity: 'pc' } } });
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
/**
 * Prototype C (4.3.0-c.6.6.6, live 18.10.2026: "I walk into the middle of them" before a fight was only told; the hounds'
 * distances were whatever the story said next): his step outside a fight, one band nearer to (or farther from) the one
 * he names or those he moves among (src/v4/scene_handles.js approachedBy). The engine sets the new distances; the story
 * tells the step and how they answer it.
 */
function moveStep(s, content, c, ctx, emit) {
    const moved = c.target === null || typeof c.target === 'string' ? approachedBy(s, { move: c.dir, moveTarget: c.target }) : [];
    if (!moved.length) return { status: 'resolved', line: `MOVES — ${c.dir === 'away' ? 'back' : 'closer'}: nobody here is nearer or farther for it; tell the step as it happens.` };
    for (const x of moved) emit({ t: 'scene.position', d: { id: x.id, band: x.to, cover: s.scene.positions[x.id]?.cover || 'none' } });
    const label = (id) => sceneHandle(s, content, id);
    ctx.engineLines?.push(`MOVED — ${moved.map((x) => `${label(x.id)} ${x.from} → ${x.to}`).join(' · ')}`);
    return { status: 'resolved', line: `MOVES — one step ${c.dir === 'away' ? 'back from' : 'closer to'} ${moved.map((x) => `${label(x.id)} (${x.from} → ${x.to})`).join(', ')}: the engine's distances now; tell the step and how they answer it, and put no one nearer or farther than this.` };
}

// Patch 6: his attempt on an obstacle or hazard of this place (src/v4/features.js): the engine's check, before the story
function attemptStep(s, content, c, ctx, emit, envx) {
    if (s.encounter) return { status: 'refused', reason: 'not during a fight', line: 'CANNOT — not while the fight runs.' };
    const r = attemptEvents(s, content, envx?.dice, emit, c);
    const rec = s.last?.check;
    if (rec?.feature && rec.seq === c.seq) ctx.engineLines?.push(`CHECK — ${rec.what}: ${rec.chance}% · d100 ${rec.roll} → ${rec.success ? 'SUCCESS' : 'FAILURE'}`);
    return r;
}

function otherStep(s, content, c) {
    const what = c.quote ? `"${String(c.quote).replace(/[<>`]/g, '').slice(0, 100)}"` : String(c.what || 'something').replace(/[<>`]/g, '').slice(0, 100);
    // Patch 8.4.1 (live 22.10.2026 05:43, turn 19): words that spend his Stat Points change nothing; #assign does
    if (spendsStatPoints(`${c.what || ''} ${c.quote || ''}`, content)) {
        const free = s.entities.pc?.sheet?.free_points ?? 0;
        return { status: 'refused', reason: assignHint(free), line: `NOT DONE — ${what}: his Free Stat Points are spent only by the System command #assign, never by words; nothing is assigned, his stats and his ${free} Free Stat Point${free === 1 ? '' : 's'} stay as they are. Tell no change in him from it (no new strength, mana, toughness or focus).` };
    }
    return { status: 'resolved', line: `DOES — ${what}: his own action; tell it as it happens. It books nothing: no HP, MP, STA, stats or Stat Points, Skills, coin or possessions change by it.` };
}

/** 4.3.0-c.6.6.51: why the room of a step (its resolution) is not his yet. */
function roomWhy(res) {
    if (res?.status === 'pending') return 'no price is agreed and nothing is paid for it';
    if (res?.status === 'conditional') return 'its price is still to be named, nothing is paid for it yet';
    if (res?.status === 'resolved') return 'what it paid books no room or bed for him (a payment, not a booking)';
    return 'that step did not happen';
}

/** Review of .51: a go of the message that takes him somewhere to sleep other than a room or bed of this place. */
function goesElsewhere(s, x) {
    if (x.type !== 'go') return false;
    if (typeof x.to === 'string') {
        const p = s.places[x.to];
        return !!p && x.to !== s.scene.at && p.parent !== s.scene.at && !ROOM_WORDS.test(normText(p.name || ''));
    }
    const name = normText(String(x.to?.new?.name ?? x.to?.new ?? ''));
    return ELSEWHERE.test(name) && !ROOM_WORDS.test(name);
}

/** 4.3.0-c.6.6.51: does this step of the message take a room or a bed (a lodging line of an offer, or one in its words)? */
function takesRoom(s, x) {
    if (x.type === 'offer.accept') {
        const lines = (s.offers?.[x.offer]?.lines || []).filter((l) => !Array.isArray(x.lines) || !x.lines.length || x.lines.includes(l.id));
        return lines.some((l) => l.service === 'lodging' || ROOM_WORDS.test(normText(l.what || '')));
    }
    return (x.type === 'buy' || x.type === 'pay') && ROOM_WORDS.test(normText(String((x.type === 'buy' ? x.what : x.for) || '')));
}

/**
 * 4.3.0-c.6.6.51: the steps of the message that take the room or bed a rest or sleep (c) is in: the room its "needs"
 * names, else every earlier step that takes one. Review of .51: none when his sleep names another place for itself ("in
 * the hayloft") or he goes elsewhere after them ("out to the stable"): that sleep stands on its own.
 */
function roomSteps(s, ordered, c) {
    const own = normText(`${c.what || ''} ${c.quote || ''}`);
    if (ELSEWHERE.test(own) && !ROOM_WORDS.test(own)) return [];
    const earlier = ordered.filter((x) => (x.seq ?? 0) < (c.seq ?? 0));
    const away = Math.max(-Infinity, ...earlier.filter((x) => goesElsewhere(s, x)).map((x) => x.seq ?? 0));
    const named = Number.isInteger(c.needs) ? earlier.find((x) => x.seq === c.needs) : null;
    if (named && PURCHASES.has(named.type) && takesRoom(s, named)) return (named.seq ?? 0) > away ? [named] : [];
    return earlier.filter((x) => (x.seq ?? 0) > away && takesRoom(s, x));
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
    ctx.env = { msg: envx.msg ?? s.turn, commands: ordered, text: envx.text || '' };
    // Related commands are alternate descriptions of one trade, not independent coin/goods transfers.
    // Links exist for this invocation only. Each handler still checks presence, custody, price and funds.
    const trades = new Map();
    const selections = new Map();
    if (envx.c && rulesetOf(s) >= 2) for (const c of ordered.filter(c => ['offer.accept', 'buy', 'sell'].includes(c.type))) {
        let a = c;
        if (c.type === 'buy') {
            const matches = Object.values(s.offers).filter(o => o.status === 'open' && !o.bid && !o.canon && (!c.from || o.seller === c.from))
                .map(o => ({ o, lines: purchaseLines(c.what, o.lines) })).filter(x => x.lines.length);
            if (matches.length !== 1) continue;
            a = { ...c, type: 'offer.accept', offer: matches[0].o.id, lines: matches[0].lines.map(l => l.id) };
        } else if (c.type === 'sell') {
            const matches = Object.values(s.offers).filter(o => o.status === 'open' && o.bid && (!c.to || o.seller === c.to)
                && o.lines.some(l => l.object === c.object && (!c.qty || l.qty === c.qty)));
            if (matches.length !== 1) continue;
            const o = matches[0];
            const priced = o.lines.every(l => Number.isInteger(l.price_cp));
            const whole = o.lines.every(l => ordered.some(x => x.type === 'sell' && x.object === l.object && (!x.qty || x.qty === l.qty)))
                || /\b(?:all|every\w*|the lot|the whole|them)\b/i.test(c.quote || '');
            if (!priced && !whole) continue;
            a = { ...c, type: 'offer.accept', offer: o.id, lines: priced ? o.lines.filter(l => l.object === c.object).map(l => l.id) : null };
        }
        const o = s.offers[a.offer];
        if (!o || o.status !== 'open') continue;
        const selected = (o.lines || []).filter(l => !a.lines?.length || a.lines.includes(l.id));
        const key = JSON.stringify([o.id, selected.map(l => l.id).sort(), o.bid ? null : a.qty ?? null]);
        const group = selections.get(key) || { command: a, offer: o, bought: false, refused: null, sale: !!o.bid };
        selections.set(key, group); trades.set(c, group);
        for (const part of ordered) {
            if (part.type === 'pay' && !o.bid && part.to === o.seller && part.amount_cp === pickLines(o, a.lines, a.qty ?? null).cp
                && !independentPayment(part)) {
                if (!part.for) trades.set(part, null); // matching amount/payee alone is not a purpose
                else if (paymentFor(part, selected)) {
                    if (trades.has(part) && trades.get(part) !== group) trades.set(part, null);
                    else trades.set(part, group);
                }
            }
            if (part.type === 'give' && o.bid && part.to === o.seller && selected.some(l => l.object === part.object && (!part.qty || part.qty === l.qty))
                && !/\b(?:gift|free|no payment)\b/i.test(part.quote || '')) trades.set(part, group);
        }
    }
    // 4.3.0-c.6.6.5: what he only laid out or showed (the planner guard took it for no give) stays his; the story may let
    // the other look, weigh and name a price (a bid), nothing more
    const shown = (envx.dropped || []).filter((x) => x.rule === 'shows').map((x) => x.command || {});
    if (shown.length) {
        const things = [...new Set(shown.map((c) => objectOf(s, content, c.object)?.name).filter(Boolean))];
        const to = typeof shown[0].to === 'string' && present(s, shown[0].to) ? who(s, shown[0].to) : null;
        ctx.extra.push(`SHOWS — he lays out${things.length ? ` ${things.join(', ')}` : ' his things'} for ${to || 'them'} to look at: they stay his. ${to ? `${to[0].toUpperCase()}${to.slice(1)}` : 'They'} may handle, weigh and price them; nothing changes hands until he himself sells or gives them in a later message.`);
    }
    const lines = new Map();
    const happened = new Set();
    const uncertain = new Set();
    const lodged = new Set();
    for (const c of ordered) {
        const trade = trades.get(c);
        const h = HANDLERS[c.type] || (envx.c && c.type === 'other' ? otherStep : null) || (envx.c && c.type === 'move' ? moveStep : null) || (envx.c && c.type === 'attempt' ? attemptStep : null);
        // Prototype C (4.3.0-c.5): a step the planner marked as building on an earlier one of the message (needs) is not
        // taken when that one did not happen (refused, an open decision, a question, dropped by the agency guard); one
        // that found its goal true already (done: "already his", "already here") did, and so did a registration that
        // made him a member (the fee paid in a step between; the guard drops such a registration as redundant)
        const tradeNeed = trade?.command.needs;
        const internalNeed = Number.isInteger(tradeNeed) && ordered.some(x => x.seq === tradeNeed && trades.get(x) === trade);
        const required = c.needs ?? (!internalNeed ? tradeNeed : null);
        const need = envx.c && Number.isInteger(required) && !happened.has(required) ? required : null;
        const redundantRegistration = (envx.dropped || []).some((x) => x.rule === 'redundant'
            && x.command?.seq === need && x.command.type === 'guild.register');
        // Paying the already-open canonical fee replaces only its redundant registration request.
        // The offer handler still validates location, price, selection, funds and existing membership.
        const registrationPayment = redundantRegistration && c.type === 'offer.accept' && c.offer === REGISTRATION_OFFER
            && s.offers[c.offer]?.status === 'open' && s.offers[c.offer]?.canon === true
            && s.offers[c.offer]?.lines?.some((l) => l.service === 'guild_registration');
        const alreadyRegistered = membership(s) && (redundantRegistration
            || ctx.resolutions.some((x) => x.seq === need && x.type === 'guild.register' && x.status === 'resolved'));
        const unmet = need !== null && !registrationPayment && !alreadyRegistered;
        // 4.3.0-c.6.6.51 (live 23.10.2026 11:07: "take the room and sleep until morning" with no price known yet booked the
        // night, told in the room and paid for the next morning): he rests or sleeps in a room he takes in this message
        // only once it is booked, marked by the planner or not. Review of .51: booked is a room or bed the engine granted
        // him in this message (service.granted); a price still to be named, a payment that books none or a part of the
        // price is no booking. A training of the same message needs nothing of it
        const rooms = envx.c && c.type === 'activity' && RESTING.has(c.kind) ? roomSteps(s, ordered, c) : [];
        const room = rooms.length && !rooms.some((x) => lodged.has(x.seq)) ? rooms.at(-1) : null;
        const quoted = c.quote ? `"${String(c.quote).slice(0, 80)}"` : c.type;
        const booking = (e) => {
            if (e.t === 'object.created' && e.d.object?.source?.how === 'bought' && e.d.object.holder?.entity === 'pc') (ctx.boughtObjects ||= []).push(e.d.object.id);
            if (trade && e.t === 'transaction.completed' && (e.d.offer === trade.offer.id || (trade.sale && e.d.from === trade.offer.seller && e.d.to === 'pc'))) trade.bought = true;
            if (e.t === 'service.granted' && (e.d?.service === 'lodging' || ROOM_WORDS.test(normText(e.d?.what || '')))) {
                lodged.add(c.seq);
                if (trade) lodged.add(trade.command.seq);
            }
            emit(e);
        };
        const waitingGive = envx.c && rulesetOf(s) >= 2 && c.type === 'go' && ctx.conditionals.some(k => k.kind === 'give' && k.seq < c.seq);
        const saleQuote = trade?.sale ? ordered.filter(x => trades.get(x) === trade).map(x => x.quote || '').join(' ') : '';
        const appraise = trade?.sale && /\b(?:check|apprais\w*|inspect|worth)\b/i.test(saleQuote)
            && !/\b(?:deal|accept|agreed|sold)\b/i.test(saleQuote) && !Number.isInteger(trade.command.min_cp) && !Number.isInteger(trade.command.agreed_cp);
        const afterTravel = envx.c && rulesetOf(s) >= 2 && ctx.auth.gos.length > 0
            && ['activity', 'attempt', 'take', 'use', 'buy', 'offer.accept', 'sell', 'pay', 'equip', 'unequip'].includes(c.type);
        if (!afterTravel && !unmet && c.type === 'buy') expirePurchaseRequest(s, c, emit, trade?.offer.seller);
        let destinationBuy = null;
        if (afterTravel && !unmet && c.type === 'buy') {
            const go = ctx.auth.gos.at(-1);
            // Existing destination or its explicit new name, never a portable unlimited permission.
            if ((go.to || go.newName) && (Number.isInteger(c.max_cp) || c.any_price)) {
                emit({ t: 'decision.opened', d: { decision: { id: `dec.t${s.turn}.${c.seq}`, kind: 'purchase', what: c.what,
                    seller: c.from || null, at: go.to || null, destination: { to: go.to || null, name: go.newName || null },
                    turn: s.turn, max_cp: c.max_cp ?? null, any_price: !!c.any_price, qty: c.qty || null, seq: c.seq } } });
                ctx.expectedKeys[String(c.seq)] = 'buy';
                destinationBuy = { status: 'conditional', condition: 'arrive_and_price', line: `BUYS AT DESTINATION — ${c.what}, only after confirmed arrival and an unambiguous seller/offer within ${c.any_price ? 'his agreed price' : `${c.max_cp} cp`}. Otherwise only show the offer.` };
            }
        }
        const r = destinationBuy || (afterTravel ? { status: 'refused', reason: 'arrival pending', line: `NOT DONE — ${quoted}: the earlier journey has not arrived yet. Perform this action after confirmed arrival; no local check, payment or activity time was booked.` }
            : waitingGive ? { status: 'refused', reason: 'handover still conditional', line: 'NOT DONE — the later journey waits for the handover at the first destination.' }
            : room ? { status: 'refused', reason: 'room not booked', line: `NOT DONE — ${quoted}: he would ${c.kind} in the room or bed of step ${room.seq}, and it is not his yet: ${roomWhy(ctx.resolutions.find((x) => x.seq === room.seq))}. He does not ${c.kind} in this reply; tell no ${c.kind === 'sleep' ? 'night' : 'rest'} in it.` }
            : unmet ? { status: 'refused', reason: `needs step ${need}`, line: `NOT DONE — ${quoted}: it was to follow step ${need}, which did not happen; it does not happen in this reply (someone else's help does not do it for him).` }
            : trades.has(c) && !trade ? { status: 'clarify', reason: 'ambiguous trade payment', line: 'NOT PAID — this payment could belong to several trades. Clarify which; no additional coin was booked.' }
            : trade?.bought ? { status: 'resolved', done: true, line: 'TRADE — the payment and goods above already complete this same transaction; nothing is booked again.' }
            : trade?.refused ? { status: 'refused', reason: trade.refused, line: 'NOT TRADED — the same trade remains unresolved; no separate payment or gift is made.' }
            : appraise ? { status: 'pending', reason: 'price still under appraisal', line: 'NOT SOLD — the buyer must finish appraising and name the final price. The goods remain Alaric’s; no gift or payment was booked.' }
            : trade ? HANDLERS['offer.accept'](s, content, { ...trade.command, seq: c.seq }, ctx, booking)
            : h ? h(s, content, c, ctx, booking, envx) : { status: 'refused', reason: `unknown command ${c.type}`, line: null });
        if (trade && !trade.bought && !unmet && ['refused', 'pending', 'clarify'].includes(r.status)) trade.refused = r.reason || 'trade unresolved';
        // 4.3.0-c.6.6.3: a step that builds on one the story still decides (a take from someone's keeping) follows it there
        if (!unmet && Number.isInteger(c.needs) && uncertain.has(c.needs) && r.line) r.line = `${r.line} Only once step ${c.needs} has happened in the story; if it does not, this does not happen either.`;
        if (r.uncertain) uncertain.add(c.seq);
        if (r.done || !['refused', 'pending', 'clarify'].includes(r.status)) happened.add(c.seq);
        ctx.resolutions.push({ seq: c.seq, type: c.type, status: r.status, ...(r.reason ? { reason: r.reason } : {}), ...(r.cap ? { cap: r.cap } : {}), ...(r.condition ? { condition: r.condition } : {}), quote: c.quote ?? null,
            ...(envx.c && rulesetOf(s) >= 2 && c.job && jobAction(c) && jobOf(s, c.job) ? { job: c.job, ...(typeof r.success === 'boolean' ? { work_ok: r.success } : {}) } : {}) });
        if (ctx.resolutions.at(-1).job && r.line) r.line += ` For "${jobOf(s, c.job).title}": "${String(c.quote || '').slice(0, 200)}" is his chosen work action, not an automatic success or completion.`;
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
