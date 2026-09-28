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
import { entityLabel, setFactEvents } from '../knowledge.js';
import { normText, slug } from '../util.js';
import {
    placeName, hallOf, settlementOf, sameSettlement, heldBy, membership, today, contracts, listingsOf, boardKey,
} from './domain.js';
import { sameWant } from './world.js';
import {
    REGISTRATION_OFFER, feeOf, openRegistration, registerEvents, rankCanon, acceptContract, completeContract, checkProof, proofText,
    promotion, takenByOthers, bookBoard,
} from './guild.js';

const VERBS = { rest: 'RESTS', sleep: 'SLEEPS', wait: 'WAITS', work: 'WORKS', train: 'TRAINS', study: 'STUDIES', craft: 'CRAFTS', search: 'SEARCHES', gather: 'GATHERS', errand: 'RUNS ERRANDS' };
const UNTIL = { done: 'until it is done', noon: 'until noon', evening: 'until evening', end_of_day: 'until the end of the day', night: 'until nightfall', dawn: 'until dawn', morning: 'until morning' };
const YIELDING = new Set(['gather', 'search', 'craft']);
const ROAMING = new Set(['gather', 'search', 'errand']);
const RESTING = new Set(['rest', 'sleep']);

/** An empty resolution context for one player message. */
export function newTurnContext(content) {
    return {
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: content.rules.time.default_cap_min },
        conditionals: [], expectedKeys: {}, actions: [], extra: [], resolutions: [],
        booked: { registration: false, grants: [], turnIns: [], accepted: [] },
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

function questLine(q) {
    return `"${q.title}"`;
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

// ------------------------------------------------------------------------------------------------ handlers
// Each handler: (s, content, c, ctx, emit, env) -> {status, reason?, line?, extra?, cap?, condition?}
const HANDLERS = {
    go(s, content, c, ctx) {
        if (s.encounter) return { status: 'refused', reason: 'not during a fight', line: 'CANNOT GO — not while the fight runs.' };
        const known = typeof c.to === 'string';
        if (known && !s.places[c.to]) return { status: 'refused', reason: 'unknown place', line: 'CANNOT GO — no such place is known.' };
        if (known && c.to === s.scene.at) return { status: 'refused', reason: 'already here', line: `NOTHING TO DO — he is already at ${placeName(s, c.to)}.` };
        const name = known ? placeName(s, c.to) : String(c.to?.new || 'somewhere');
        const t = content.rules.time;
        const cap = !known ? t.unknown_place_cap_min : sameSettlement(s, c.to, s.scene.at) ? t.default_cap_min : t.travel_cap_min;
        const go = { seq: c.seq, to: known ? c.to : null, name, hall: known && !!hallOf(s, c.to), newName: known ? null : name };
        ctx.auth.go = go;
        ctx.auth.gos.push(go);
        ctx.auth.timeCap = Math.max(ctx.auth.timeCap, cap);
        ctx.expectedKeys[String(c.seq)] = 'go';
        return { status: 'authorized', line: `GOES — to ${name} (the story decides whether and where he arrives).` };
    },
    activity(s, content, c, ctx) {
        if (s.encounter) return { status: 'refused', reason: 'not during a fight', line: 'CANNOT — not while the fight runs.' };
        const t = content.rules.time;
        const cap = c.until ? untilMinutes(content, s, c.until) : c.minutes ? Math.ceil(c.minutes * t.minutes_factor) : t.default_cap_min;
        ctx.auth.timeCap = Math.max(ctx.auth.timeCap, cap);
        if (YIELDING.has(c.kind)) ctx.auth.gather = true;
        if (ROAMING.has(c.kind)) ctx.auth.roam = true;
        if (RESTING.has(c.kind)) ctx.auth.rest = true;
        ctx.expectedKeys[String(c.seq)] = 'activity';
        const span = c.until ? UNTIL[c.until] || `until ${c.until}` : c.minutes ? `for ${c.minutes} minutes` : 'for a while';
        return { status: 'authorized', cap, line: `${VERBS[c.kind] || String(c.kind).toUpperCase()} ${c.what ? `${c.what} ` : ''}${span} (at most ${cap} minutes; the story decides how long it takes and what it yields).` };
    },
    take(s, content, c, ctx, emit) {
        if (c.object && typeof c.object === 'object') {
            ctx.auth.take.push(c.seq);
            ctx.auth.takeNames = { ...(ctx.auth.takeNames || {}), [String(c.seq)]: String(c.object.new).slice(0, 80) };
            ctx.expectedKeys[String(c.seq)] = 'take';
            return { status: 'authorized', line: `TAKES — ${c.object.new}, if it is there (the story decides whether he gets it).` };
        }
        const o = objectOf(s, content, c.object);
        if (!o) return { status: 'refused', reason: 'unknown object', line: 'CANNOT TAKE — there is no such thing here.' };
        if (o.holder?.entity === 'pc') return { status: 'refused', reason: 'he holds it already', line: `NOTHING TO DO — he holds ${o.name} already.` };
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
        const offer = Object.values(s.offers).find((o) => o.status === 'open' && !o.canon && o.seller === c.to && (c.amount_cp === null || c.amount_cp === undefined || o.lines.reduce((n, l) => n + l.price_cp * (l.qty || 1), 0) === c.amount_cp));
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
        if (match) {
            const price = match.lines.reduce((n, l) => n + l.price_cp * (l.qty || 1), 0) * (c.qty && match.lines.length === 1 ? c.qty : 1);
            if (c.max_cp !== null && c.max_cp !== undefined && price > c.max_cp && !c.any_price) {
                return { status: 'refused', reason: 'above his limit', line: `DOES NOT BUY — ${match.lines.map((l) => l.what).join(', ')} costs ${cpText(price, content)}, more than the ${c.max_cp} cp he allows.` };
            }
            return HANDLERS['offer.accept'](s, content, { ...c, type: 'offer.accept', offer: match.o.id, lines: match.lines.map((l) => l.id) }, ctx, emit);
        }
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
        emit({ t: 'decision.opened', d: { decision: { id: `dec.t${s.turn}.${c.seq}`, kind: 'sale', what: o.name, object: o.id, seller: c.to || null, at: s.scene.at, turn: s.turn, min_cp: c.min_cp ?? null, qty: c.qty || null, seq: c.seq } } });
        ctx.expectedKeys[String(c.seq)] = 'sell';
        if (c.min_cp !== null && c.min_cp !== undefined) {
            return { status: 'conditional', condition: 'buyer_agrees', line: `SELLS — ${o.name}${c.to ? ` to ${who(s, c.to)}` : ''} if the buyer pays at least ${c.min_cp} cp (the story decides whether the buyer agrees).` };
        }
        return {
            status: 'pending', reason: 'no_price', line: `WANTS TO SELL — ${o.name}; no price is agreed.`,
            extra: [`OPEN DECISION — Alaric offers ${o.name} for sale; no price is agreed. Let the buyer name a price, then stop: he has not agreed to sell.`],
        };
    },
    'offer.accept'(s, content, c, ctx, emit) {
        const o = s.offers[c.offer];
        if (!o || o.status !== 'open') return { status: 'refused', reason: 'no open offer', line: 'CANNOT ACCEPT — there is no such open offer.' };
        const lines = Array.isArray(c.lines) && c.lines.length ? o.lines.filter((l) => c.lines.includes(l.id)) : o.lines;
        if (!lines.length) return { status: 'refused', reason: 'no such line', line: 'CANNOT ACCEPT — the offer has no such item.' };
        if (o.canon && !hallOf(s, s.scene.at)) return { status: 'refused', reason: 'not at a Guild hall', line: 'CANNOT PAY — the Guild registers members at a Guild hall.' };
        if (!o.canon && !present(s, o.seller)) return { status: 'refused', reason: 'the seller is not here', line: `CANNOT ACCEPT — ${who(s, o.seller)} is not here.` };
        const price = lines.reduce((n, l) => n + l.price_cp * (l.qty || 1), 0);
        const coin = s.entities.pc.sheet.coin_cp;
        if (coin < price) return { status: 'refused', reason: 'not enough coin', line: `CANNOT PAY — ${cpText(price, content)} needed, he has ${coin} cp.` };
        emit({ t: 'transaction.completed', d: { offer: o.id, lines: lines.map((l) => l.id), cp: price, seller: o.seller } });
        emit({ t: 'coin.changed', d: { id: 'pc', value: coin - price, delta: -price, why: lines.map((l) => l.what).join(', ') } });
        const reg = lines.some((l) => l.service === 'guild_registration');
        let power = null;
        if (reg) {
            power = registerEvents(s, content, emit).power;
            ctx.booked.registration = true;
            ctx.booked.grants.push('Guild plate');
        }
        for (const l of lines.filter((x) => x.kind === 'goods')) {
            emit({ t: 'object.created', d: { object: { id: `obj.t${env(ctx).msg}.${slug(l.what)}`, name: l.what, kind: 'item', stack: (l.qty || 1) > 1, qty: l.qty || 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: s.turn, how: 'bought', from: o.seller } } } });
            ctx.booked.grants.push(l.what);
        }
        for (const l of lines.filter((x) => x.kind === 'service' && x.service !== 'guild_registration')) emit({ t: 'service.granted', d: { service: l.service || 'other', what: l.what, by: o.seller, at: s.scene.at, turn: s.turn } });
        emit({ t: 'offer.closed', d: { id: o.id, status: 'accepted' } });
        for (const d of s.decisions.filter((x) => x.offer === o.id || (reg && x.kind === 'registration') || (x.kind === 'purchase' && x.seller === o.seller) || (x.kind === 'purchase' && !x.seller && x.at === s.scene.at))) emit({ t: 'decision.closed', d: { id: d.id, status: 'accepted' } });
        if (reg) return { status: 'resolved', line: `PAYS — the Guild registration fee, ${price} cp: registered at Guild Rank ${content.rules.guild.ranks[0]}; the crystal reads his Power Rank: ${power} (his measured strength, a separate scale from the Guild's ranks); he receives his Guild plate.` };
        return { status: 'resolved', line: `ACCEPTS the offer — ${lines.map((l) => l.what).join(', ')} for ${cpText(price, content)}; he pays ${who(s, o.seller)}.` };
    },
    'offer.decline'(s, content, c, ctx, emit) {
        const o = s.offers[c.offer];
        if (!o || o.status !== 'open') return { status: 'refused', reason: 'no open offer', line: 'NOTHING TO DO — there is no such open offer.' };
        emit({ t: 'offer.closed', d: { id: o.id, status: 'declined' } });
        for (const d of s.decisions.filter((x) => x.offer === o.id)) emit({ t: 'decision.closed', d: { id: d.id, status: 'declined' } });
        return { status: 'resolved', line: `DECLINES — ${o.canon ? 'the Guild registration' : `${who(s, o.seller)}'s offer`}.` };
    },
    'quest.accept'(s, content, c, ctx, emit) {
        const pick = pickQuest(s, c.quest, ['listed', 'offered']);
        if (pick.clarify) return pick.clarify.length ? { status: 'clarify', reason: 'which contract?', line: `CLARIFY — which one does he take: ${pick.clarify.join(' or ')}?` } : { status: 'refused', reason: 'nothing to accept', line: 'CANNOT ACCEPT — nothing is on offer.' };
        const q = pick.q;
        if (!q) return { status: 'refused', reason: 'no such contract', line: `CANNOT ACCEPT — no such contract${pick.unknown ? ` ("${pick.unknown}")` : ''} is on offer.` };
        if (q.kind === 'guild_contract') {
            if (q.status === 'active' || q.status === 'completed') return { status: 'refused', reason: `already ${q.status}`, line: `NOTHING TO DO — ${questLine(q)} is already ${q.status === 'active' ? 'his' : 'turned in'}.` };
            if (q.status !== 'listed') return { status: 'refused', reason: `the listing is ${q.status}`, line: `CANNOT ACCEPT — ${questLine(q)} is no longer on the board.` };
            if (!membership(s)) return { status: 'refused', reason: 'not a Guild member', line: `CANNOT ACCEPT — ${questLine(q)}: he is not a Guild member.` };
            const ranks = content.rules.guild.ranks;
            if (ranks.indexOf(q.rank) > ranks.indexOf(membership(s).rank)) return { status: 'refused', reason: 'rank too high', line: `CANNOT ACCEPT — ${questLine(q)} is ${q.rank} work; he is ${membership(s).rank}.` };
            const hall = hallOf(s, s.scene.at);
            if (!hall || settlementOf(s, hall) !== q.source?.branch) {
                return { status: 'refused', reason: 'not at the Guild hall of that board', line: `CANNOT ACCEPT — ${questLine(q)} is taken at the Guild hall of ${s.places[q.source?.branch]?.name || 'its branch'}.` };
            }
            acceptContract(s, content, q, emit, { step: c.seq });
            ctx.booked.accepted.push(q.id);
            ctx.booked.grants.push('contract slip');
            return { status: 'resolved', line: `ACCEPTS — ${questLine(q)} at the Guild desk; the clerk logs it and hands him its contract slip (the Guild pays ${q.payout_cp} cp on completion).` };
        }
        // private work: its giver must be here
        if (q.status !== 'offered') return { status: 'refused', reason: `the job is ${q.status}`, line: `NOTHING TO DO — ${questLine(q)} is ${q.status}.` };
        if (q.giver && !present(s, q.giver)) return { status: 'refused', reason: 'the giver is not here', line: `CANNOT ACCEPT — ${who(s, q.giver)}, who offered ${questLine(q)}, is not here.` };
        emit({ t: 'quest.status', d: { id: q.id, from: 'offered', to: 'active', taker: 'pc', at: s.scene.at, step: c.seq } });
        ctx.booked.accepted.push(q.id);
        return { status: 'resolved', line: `ACCEPTS — ${questLine(q)}${q.giver ? ` from ${who(s, q.giver)}` : ''}.` };
    },
    'quest.turn_in'(s, content, c, ctx, emit) {
        const pick = pickQuest(s, c.quest, ['active'], 'guild_contract');
        if (pick.clarify) {
            // the one that was just turned in, named again ("I turn the quest in"): nothing to do, not a question
            const done = Object.values(s.quests).filter((q) => q.kind === 'guild_contract' && q.status === 'completed' && (q.history || []).some((h) => h.status === 'completed' && Math.floor((h.minute ?? 0) / 1440) + 1 === today(s)));
            if (!pick.clarify.length && done.length) return { status: 'refused', reason: 'already_completed', line: `NOTHING TO DO — ${questLine(done.at(-1))} is already turned in.` };
            return pick.clarify.length ? { status: 'clarify', reason: 'which contract?', line: `CLARIFY — which contract does he turn in: ${pick.clarify.join(' or ')}?` } : { status: 'refused', reason: 'no active contract', line: 'CANNOT TURN IN — he has no active Guild contract.' };
        }
        const q = pick.q;
        if (!q) return { status: 'refused', reason: 'unknown contract', line: `CANNOT TURN IN — no such contract${pick.unknown ? ` ("${pick.unknown}")` : ''}.` };
        if (q.status === 'completed') return { status: 'refused', reason: 'already_completed', line: `NOTHING TO DO — ${questLine(q)} is already turned in.` };
        if (q.kind !== 'guild_contract') return { status: 'refused', reason: 'private work', line: `NOTHING TO TURN IN — ${questLine(q)} is private work; its giver settles it.` };
        if (q.status !== 'active') return { status: 'refused', reason: `the contract is ${q.status}`, line: `CANNOT TURN IN — ${questLine(q)} is ${q.status}.` };
        if (hallOf(s, s.scene.at)) {
            const r = completeContract(s, content, q, emit, { step: c.seq });
            if (!r.ok) return { status: 'refused', reason: r.reason, line: `TURNS IN — ${questLine(q)}: the desk refuses it, ${r.reason}.` };
            ctx.booked.turnIns.push(q.id);
            return { status: 'resolved', line: `TURNS IN — ${questLine(q)}: the desk checks ${proofText(q)} → accepted; the Guild pays ${q.payout_cp} cp.` };
        }
        const go = ctx.auth.gos.filter((g) => g.hall && g.seq < c.seq).at(-1);
        if (go) {
            const pre = checkProof(s, q);
            ctx.conditionals.push({ seq: c.seq, kind: 'turn_in', quest: q.id, condition: 'arrive_guild_hall', hall: go.to });
            ctx.booked.turnIns.push(q.id);
            return {
                status: 'conditional', condition: 'arrive_guild_hall',
                line: `TURNS IN, when he reaches the Guild hall — ${questLine(q)}: the desk checks ${proofText(q)} → ${pre.ok ? `accepted; the Guild pays ${q.payout_cp} cp` : `refused: ${pre.reason}`}. If the reply does not reach the hall, nothing is turned in.`,
            };
        }
        return { status: 'refused', reason: 'not at a Guild hall', line: `CANNOT TURN IN — ${questLine(q)}: contracts are turned in at a Guild hall.` };
    },
    'quest.abandon'(s, content, c, ctx, emit) {
        const pick = pickQuest(s, c.quest, ['active']);
        if (pick.clarify) return pick.clarify.length ? { status: 'clarify', reason: 'which one?', line: `CLARIFY — which does he give up: ${pick.clarify.join(' or ')}?` } : { status: 'refused', reason: 'nothing active', line: 'NOTHING TO DO — he has nothing to give up.' };
        const q = pick.q;
        if (!q || q.status !== 'active') return { status: 'refused', reason: 'not active', line: 'NOTHING TO DO — that is not his to give up.' };
        emit({ t: 'quest.status', d: { id: q.id, from: 'active', to: 'abandoned', at: s.scene.at, step: c.seq } });
        return { status: 'resolved', line: `GIVES UP — ${questLine(q)}.` };
    },
    'guild.register'(s, content, c, ctx, emit) {
        if (!hallOf(s, s.scene.at)) return { status: 'refused', reason: 'not at a Guild hall', line: 'CANNOT REGISTER — only at a Guild hall.' };
        if (membership(s) && ctx.booked.registration) return { status: 'resolved', line: 'REGISTERS — done: the fee he paid above registered him.' };
        if (membership(s)) return { status: 'refused', reason: 'already a member', line: 'NOTHING TO DO — he is already a member.' };
        const fee = openRegistration(s, content, emit);
        return { status: 'pending', reason: 'fee', line: `REGISTERS — pending: the Guild's registration fee is ${fee % 10 === 0 ? `${fee / 10} silver (${fee} cp)` : `${fee} cp`}, one-time; ${rankCanon(content)}. Let the clerk name the fee and explain; stop there: he has not agreed to pay.` };
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
        const hall = hallOf(s, s.scene.at);
        if (!hall) return { status: 'refused', reason: 'no Guild board here', line: 'CANNOT READ — the Guild board is in the Guild hall.' };
        const branch = settlementOf(s, hall);
        const rank = c.rank || membership(s)?.rank || 'Novice';
        if (envx.dice) takenByOthers(s, content, branch, rank, envx.dice, emit);
        // the generator's listings for this board (host.js ran it before this turn, canonical first)
        const gen = envx.board && envx.board.branch === branch && envx.board.rank === rank ? envx.board : null;
        if (gen?.listings?.length) bookBoard(s, content, gen, gen.listings, emit);
        const listed = listingsOf(s, branch, rank);
        if (!listed.length) {
            ctx.boardShown = { branch, rank, failed: true };
            return { status: 'resolved', reason: 'generator_failed', line: 'READS the board — BOARD: no new official contracts can be shown right now; invent none.' };
        }
        emit({ t: 'board.shown', d: { branch, rank, listings: listed.map((q) => q.id) } });
        ctx.boardShown = { branch, rank, listings: listed.map((q) => q.id) };
        return { status: 'resolved', line: `READS the ${rank} board — BOARD (canonical; show exactly these, invent no other official contract): ${listed.map((q) => `${q.title} · ${q.payout_cp} cp`).join(' | ')}.` };
    },
    equip(s, content, c, ctx, emit) {
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
 * Resolve the commands of one message in order. emit applies each event to s at once, so every command is checked
 * against the state after the ones before it ("pay the fee, then read the board").
 * @param {{msg?: number, dice?: object, board?: object}} envx msg: the player message's index; dice: the engine's
 *   dice (the board's taken-by-others draw); board: the Board generator's validated listings for this turn
 */
export function resolveCommands(s, content, commands, emit, envx = {}) {
    const ctx = newTurnContext(content);
    const ordered = [...commands].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    ctx.env = { msg: envx.msg ?? s.turn, commands: ordered };
    const lines = new Map();
    for (const c of ordered) {
        const h = HANDLERS[c.type];
        const r = h ? h(s, content, c, ctx, emit, envx) : { status: 'refused', reason: `unknown command ${c.type}`, line: null };
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
