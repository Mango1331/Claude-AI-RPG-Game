// Runtime V4: the quantities and prices of trade, one model for buying and selling (docs/INTEGRATION_4_1.md §7):
//
//   offer line   a lot: `qty` units (1 when the price is per piece) for `price_cp` ("three flasks for nine copper")
//   purchase     how many units Alaric takes of one line (null: the line as offered); he pays exactly their price
//   sale         how many units of what he holds leave him; he gets exactly the price the buyer agreed to
//   bid          (4.3.0-c.6.6.5) a buyer's price for things he holds: lines name his objects and units, one price for
//                the lot; accepting it is one sale of exactly those (bookSale with several items)
//
// Every purchase and sale books exactly those units against exactly that coin, and never more units than there are
// (review of 4.1.0: three flasks bought for the price of one, ten herbs sold while he held one, a partial sale that
// handed over the whole stack). The command handlers (src/v4/commands.js) and the world applier (src/v4/world.js)
// both book through here.
import { itemTraits, equipmentSlotKnown } from './items.js';
import { normText } from '../util.js';
import { hallOf } from './domain.js';
import { rulesetOf } from '../content.js';
import { trainingOfferWhy } from './growth.js';
import { coinFromWords, coinMentions, coinEvidence, numbersIn } from '../economy.js';

const flat = text => normText(text || '').replace(/[^a-z0-9]+/g, ' ').trim();
const contains = (text, part) => !!flat(part) && ` ${flat(text)} `.includes(` ${flat(part)} `);

/** In a sale-only exchange, goods prices must not silently become PC purchases.
 * A separate, current purchase request permits a real offer, including same-named goods.
 */
export function saleOfferLines(state, seller, lines) {
    if (!Array.isArray(lines)) return [];
    const current = (state.decisions || []).filter(d => d.turn === state.turn && d.at === state.scene.at && (!d.seller || d.seller === seller));
    const sales = current.filter(d => d.kind === 'sale' && state.objects[d.object]?.holder?.entity === 'pc');
    if (!sales.length) return [];
    return lines.filter(l => (l.kind || 'goods') === 'goods'
        && sales.some(d => d.seller === seller || (state.scene.present.includes(seller) && purchaseLines(state.objects[d.object].name, [l]).length))
        && !current.some(d => d.kind === 'purchase' && purchaseLines(d.what, [l]).length));
}

/** Match separately named prices to selected offer positions, never sum unrelated amounts. */
function positionPrices(quote, picks, currency) {
    if (!picks || picks.length < 2 || coinMentions(quote, { rules: { currency } }).length < 2) return null;
    const clauses = quote.split(/\s+(?:and|then)\s+|[;.!?]/i);
    const seen = new Set();
    for (const clause of clauses) {
        const mentions = coinMentions(clause, { rules: { currency } });
        if (!mentions.length) continue;
        if (mentions.length !== 1) return null;
        const named = picks.filter(p => flat(p.line.what).split(' ').filter(w => w.length > 2 && !['the','for','with','and','night'].includes(w)).some(w => contains(clause, w)));
        if (named.length !== 1 || seen.has(named[0].line.id)) return null;
        const p = named[0];
        if (mentions[0] !== p.cp) return false;
        seen.add(p.line.id);
    }
    return seen.size === picks.length ? true : null;
}

/** Explicit product words constrain a selection; a generic "deal" remains valid.
 * Use distinguishing words from this actual offer, not a dictionary of room/product special cases.
 */
function selectionWhy(quote, offer, selected) {
    const ignored = new Set(['the', 'for', 'and', 'with', 'night', 'one', 'per', 'pair', 'copper', 'cp', 'silver', 'gold']);
    const words = line => [...new Set(requestWords(`${line.what} ${line.service || ''} ${line.said || ''}`).filter(w => w.length > 2 && !ignored.has(w) && !numbersIn(w).length))];
    const unique = new Map(offer.lines.map(line => [line.id, words(line).filter(w => offer.lines.filter(other => words(other).includes(w)).length === 1)]));
    const names = (text, line) => unique.get(line.id).some(w => requestWords(text).includes(w));
    const exclusions = [...quote.matchAll(/\b(?:not|without|except)\s+([^,.;!?]*?)(?=\bbut\b|[,.;!?]|$)/gi)].map(m => m[1]);
    if (selected.some(line => exclusions.some(text => names(text, line)))) return 'selected goods include a position he explicitly excluded';
    const requested = offer.lines.filter(line => names(quote, line) && !exclusions.some(text => names(text, line)));
    if (selected.length && requested.some(line => !selected.some(p => p.id === line.id)))
        return 'selected goods omit a position in his explicit order; clarify the offer positions';
    if (!offer.lines.some(line => names(quote, line))) return null;
    return selected.some(line => unique.get(line.id).length && !names(quote, line))
        ? 'selected goods differ from his explicit order; clarify the offer positions' : null;
}

/** Explicit consent constraints, shared by the planner repair and the command handler. No inferred new party. */
export function acceptanceWhy(c, offer, party, currency) {
    const addressed = String(c.quote || '').match(/\b(?:[Dd]one|[Dd]eal|[Yy]es|[Ff]ine|[Aa]greed|[Tt]hanks),\s+([A-Z][a-z'-]*(?:\s+[A-Z][a-z'-]*){0,2})(?=[.!?]|$)/);
    for (const named of [c.party_words, addressed?.[1]].filter(Boolean)) {
        const label = /^the\s/i.test(named) ? party.split(',').slice(0, 2).join(', ') : party.split(',')[0];
        if (!contains(label, named.replace(/^the\s+/i, ''))) return `counterparty ${named} is not ${party}`;
    }
    const quote = String(c.quote || '');
    const lines = (offer.lines || []).filter(l => !c.lines?.length || c.lines.includes(l.id));
    const picked = offer.bid ? null : pickLines(offer, c.lines, c.qty ?? null);
    const selection = !offer.bid && selectionWhy(quote, offer, lines);
    if (selection) return selection;
    const total = offer.bid ? (lines.length === offer.lines.length && Number.isInteger(offer.price_cp) ? offer.price_cp : lines.reduce((n, l) => n + (l.price_cp || 0), 0)) : picked.cp;
    const qty = offer.bid ? (lines.length === 1 ? lines[0].qty : 0) : (picked.picks?.length === 1 ? picked.picks[0].units : 0);
    const mentions = currency ? coinMentions(quote, { rules: { currency } }) : [];
    const positions = currency && !offer.bid ? positionPrices(quote, picked.picks, currency) : null;
    if (positions === false) return 'a stated item price differs from the selected position';
    const price = positions === true ? { handled: true, cp: total } : currency ? tradePrice(null, quote, qty, { rules: { currency } }) : { handled: false };
    if (price.handled && price.cp === null) return 'the quoted trade price is not unambiguous';
    const said = price.handled ? price.cp : currency && mentions.length === 1 ? coinFromWords(quote, { rules: { currency } }) : null;
    const discount = /\bdiscount\b|\b\w*(?:pence|copper|silver|gold|percent)\s+off\b|\b(?:knock|take)\b[^.;]{0,25}\boff\b|\bfor less\b/i.test(quote);
    const fixedPrice = said === total && /\b(?:agreed|offered|final|new|discount(?:ed)?) price\b/i.test(quote) && /\b(?:accept|deal|take|buy)\b/i.test(quote);
    if (discount && !fixedPrice) return 'a requested discount needs an agreed new price; the old offer is not accepted';
    if (Number.isInteger(c.agreed_cp) && said !== null && c.agreed_cp !== said) return 'agreed_cp contradicts the player’s stated price';
    const agreed = Number.isInteger(c.agreed_cp) ? c.agreed_cp : said;
    if (agreed !== null && agreed !== undefined && Number.isInteger(total) && agreed !== total)
        return `agreed price ${agreed} cp differs from this offer's ${total} cp`;
    if (Number.isInteger(c.max_cp) && total > c.max_cp && !c.any_price) return 'the offer is above his price limit';
    if (Number.isInteger(c.min_cp) && total < c.min_cp) return 'the bid is below his price limit';
    return null;
}

/** Price evidence for trade only. A unit rate is not a lot total; ranges and several rates are unresolved. */
export function tradePrice(cp, said, qty, content) {
    const text = String(said || '');
    if (!text.trim()) return { cp, handled: false };
    if (/\b(?:between|from)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b[^.;]{0,25}\b(?:and|to)\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b|\b(?:gold|silver|coppers?|cp)\s+or\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+or\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:gold|silver|coppers?|cp)\b/i.test(text)) return { cp: null, handled: true };
    const totals = [...text.matchAll(/((?:[a-z0-9-]+\s+){1,5}(?:gold|silver|coppers?|cp))\s+(?:for\s+)?(?:the\s+)?(?:lot|all|together|total)\b/gi)]
        .map(m => coinFromWords(m[1], content)).filter(Number.isInteger);
    if (totals.length) return { cp: totals.length === 1 ? totals[0] : null, handled: true };
    // Build .107: "two silver a fair deal" judges the price; it is no rate per unit
    const rates = [...text.matchAll(/\b(?:gold|silver|coppers?|cp)\s+(?:each\b|apiece\b|per\b|(?:a|an)\s+(?!piece of coin\b|(?:fair|good|great|decent|reasonable|honest|fine|square|bargain|steal|deal|price|sum|total)\b))/gi)];
    const evidence = coinEvidence(text, content);
    if (rates.length) {
        if (/\b(?:if|unless|depending|provided)\b/i.test(text.slice(rates[0].index))) return {cp:null,handled:true};
        return { cp: rates.length === 1 && evidence.compound && qty > 0 ? evidence.cp * qty : null, handled: true };
    }
    if (evidence.mentions.length > 1 || (evidence.mentions.length && evidence.cp === null))
        return { cp: evidence.compound ? evidence.cp : null, handled: true };
    return { cp, handled: false };
}

/** Known remote services and explicit third-party price advice are information, not this speaker's offer. */
export function offerAdvice(what, said, party, places, here, prose = '') {
    const text = String(said || '');
    const booking = /\bI(?:'ll| will| can)?\s+(?:book|reserve|arrange)\b/i.test(text);
    if (booking) return false;
    const spoken = !prose || [...prose.matchAll(/["“]([^"”]+)["”]/g)].some(m => contains(m[1], text));
    if (spoken && /\b(?:he|she|they)(?:'ll| will| would)\s+(?:give|pay|charge|sell|buy)\b/i.test(text)) return true;
    for (const m of text.matchAll(/\b([A-Z][a-z'-]*(?:\s+[A-Z][a-z'-]*){0,2})\s+(?:(?:will|would|can)\s+)?(?:sells?|buys?|charges?|offers?|asks?|pays?)\b/g)) {
        // First-person contractions are the speaker, not names of other traders ("I'd pay the next man").
        if (/^(?:(?:I|We)(?:['’](?:d|ll))?|You|He|She|They|It)$/.test(m[1])) continue;
        const name = party.split(',')[0];
        if (!contains(name, m[1]) && !contains(m[1], name)) return true;
    }
    const provider = String(what || '').match(/\bby\s+([A-Z][a-z'-]*(?:\s+[A-Z][a-z'-]*){0,2})\b/);
    if (provider && !contains(party, provider[1])) return true;
    const local = new Set([here]);
    let p = (places || []).find(p => p.id === here);
    while (p?.parent && !local.has(p.parent) && ['interior', 'site'].includes(p.kind)) {
        p = places.find(x => x.id === p.parent);
        if (p && ['interior', 'site'].includes(p.kind)) local.add(p.id); else break;
    }
    return (places || []).some(p => !local.has(p.id) && contains(what, p.name) && /\b(?:at|in)\b/i.test(what));
}

/** The price of `units` of an offer line (null: the line as offered), or why it is not sold in that amount. */
export function linePrice(line, units = null) {
    const lot = Math.max(1, Number(line.qty) || 1);
    const price = Math.max(0, Number(line.price_cp) || 0);
    if (units === null || units === undefined || units === lot) return { units: lot, cp: price };
    if (units % lot === 0) return { units, cp: price * (units / lot) };
    if (price % lot === 0) return { units, cp: (price / lot) * units };
    return { error: `${line.what} is sold ${lot} for ${price} cp` };
}

/**
 * The lines Alaric takes of an offer and how many units of each: a number of units belongs to one line (with several
 * lines it is a question), without one every line is taken as offered.
 * @returns {{picks: {line, units, cp}[], cp: number} | {clarify: string[]} | {error: string}}
 */
export function pickLines(offer, lineIds = null, units = null) {
    if (lineIds?.some(id => !offer.lines.some(l => l.id === id))) return { error: 'the offer has no such item' };
    const lines = Array.isArray(lineIds) && lineIds.length ? offer.lines.filter((l) => lineIds.includes(l.id)) : offer.lines;
    if (!lines.length) return { error: 'the offer has no such item' };
    if (units && lines.length > 1) return { clarify: lines.map((l) => l.what) };
    const picks = [];
    for (const line of lines) {
        const p = linePrice(line, units);
        if (p.error) return { error: p.error };
        picks.push({ line, units: p.units, cp: p.cp });
    }
    return { picks, cp: picks.reduce((n, p) => n + p.cp, 0) };
}

/** "water flask", "3 water flask": what a purchase or sale is of, for the lines and the coin's reason. */
export const unitsText = (what, units) => (units > 1 ? `${units} ${what}` : what);
export const picksText = (picks) => picks.map((p) => unitsText(p.line.what, p.units)).join(', ');

/** Current availability, shared by views, catalog and the final purchase boundary. */
export function offerAvailability(s, o) {
    if (!o || o.status !== 'open') return 'no open offer';
    if (o.gate) return s.scene.at === o.gate ? null : 'not at the gate';
    if (o.canon && !hallOf(s, s.scene.at)) return 'not at a Guild hall';
    if (o.stock === 'manuals' && hallOf(s, o.at) !== hallOf(s, s.scene.at)) return 'another Guild hall';
    if (!o.canon && o.at && o.at !== s.scene.at) return 'another offer location';
    if ((!o.canon || o.stock === 'manuals') && !s.scene.present.includes(o.seller)) return 'the seller is not here';
    return null;
}

const requestWords = value => flat(value).split(' ').filter(w => !['a','an','the','for','of','with','and','some','please'].includes(w)).map(w => w.replace(/s$/, '')).sort();
/** A shared generic noun is not consent. Extra offered detail is allowed, conflicting modifiers are not. */
export function purchaseLines(want, lines) {
    const words = requestWords(want);
    if (!words.length) return [];
    const exact = lines.filter(l => { const other = requestWords(l.what); return words.every(w => other.includes(w)); });
    if (exact.length === 1) return exact;
    if (exact.length) return []; // several distinct products need an explicit selection
    const parts = String(want).split(/\s+and\s+/i);
    if (parts.length < 2) return [];
    const picks = parts.map(part => purchaseLines(part, lines));
    return picks.every(p => p.length === 1) ? [...new Set(picks.flat())] : [];
}
export function samePurchaseRequest(a, b, seller = null) {
    return a.kind === 'purchase' && b.kind === 'purchase' && a.at === b.at
        && (a.seller || seller) === (b.seller || seller) && (a.qty ?? null) === (b.qty ?? null)
        && JSON.stringify(requestWords(a.what)) === JSON.stringify(requestWords(b.what));
}
export function purchaseDecisionMatches(d, offer, picks) {
    if (d.kind !== 'purchase' || d.at !== offer.at || (d.seller && d.seller !== offer.seller)) return false;
    const lines = purchaseLines(d.what, offer.lines);
    return lines.length === picks.length && lines.every(l => picks.some(p => p.line.id === l.id && (d.qty == null || d.qty === p.units)));
}

/**
 * Book a purchase: the coin leaves Alaric, the goods come to him in the units bought, a service is granted. The
 * booker closes the live offer atomically with its effects; callers close only matching decisions.
 * @param {{offer: object, picks: object[], cp: number, objectId: (name: string) => string, content?: object}} p objectId:
 *   the id of a goods object Alaric receives; content: the goods' behaviour (Patch 3, src/v4/items.js)
 */
export function bookPurchase(s, emit, { offer, picks, cp, objectId, content = null, consent = null }) {
    const live = s.offers[offer.id];
    const unavailable = offerAvailability(s, live);
    if (unavailable) return { error: unavailable };
    const selection = pickLines(live, picks.map(p => p.line.id), picks.length === 1 ? picks[0].units : null);
    if (selection.error || selection.clarify || selection.picks.length !== picks.length || selection.cp !== cp)
        return { error: selection.error || 'selection or price changed' };
    offer = live; picks = selection.picks;
    if (consent?.kind === 'purchase' && rulesetOf(s) >= 2 && (consent.turn !== s.turn || !purchaseDecisionMatches(consent, offer, picks))) return { error: 'purchase consent is stale or mismatched' };
    if (consent && Number.isInteger(consent.max_cp) && cp > consent.max_cp) return { error: 'above his price limit' };
    if (content && picks.some(p => p.line.equipment === true && (p.line.profile?.kind !== 'gear' || !equipmentSlotKnown(content, p.line.profile.slot)))) return { error: 'equipment has no supported profile' };
    if (content && rulesetOf(s) >= 2) {
        const why = picks.map(p => trainingOfferWhy(s, content, offer.seller, p.line)).find(Boolean);
        if (why) return { error: why };
    }
    const coin = s.entities.pc.sheet.coin_cp;
    if (!Number.isInteger(cp) || cp < 0 || coin < cp) return { error: 'not enough coin' };
    const counted = picks.some((p) => p.units !== (Number(p.line.qty) || 1));
    emit({ t: 'transaction.completed', d: { offer: offer.id, lines: picks.map((p) => p.line.id), ...(counted ? { units: picks.map((p) => p.units) } : {}), cp, seller: offer.seller } });
    emit({ t: 'coin.changed', d: { id: 'pc', value: coin - cp, delta: -cp, why: picksText(picks) } });
    for (const p of picks.filter((x) => x.line.kind === 'goods')) {
        // Patch 7.1: exactly the variant offered: the line's profile, fixed when the offer was made (never rolled again)
        const traits = content ? itemTraits(content, { name: p.line.what, kind: 'item' }, s.clock.minute, p.line.profile ?? (p.line.profile === null ? null : undefined)) : {};
        // Explicit ordinary merchandise never acquires combat values later from its name.
        if (p.line.equipment === false && p.line.profile === null) {
            traits.profile = null;
            if (traits.use === 'equipment') traits.use = 'tool';
        }
        const base = objectId(p.line.what);
        let id = base;
        for (let n = 2; s.objects[id]; n++) id = `${base}_${n}`;
        emit({ t: 'object.created', d: { object: { id, name: p.line.what, ...(p.line.appearance ? {appearance:p.line.appearance} : {}), kind: 'item', stack: p.units > 1, qty: p.units, unit: null, ...traits, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: s.turn, how: 'bought', from: offer.seller } } } });
    }
    for (const p of picks.filter((x) => x.line.kind === 'service' && x.line.service !== 'guild_registration')) {
        // Each bought training line is a separate commitment, even in the same transaction and minute.
        const id = p.line.service === 'training' ? `svc:${s.turn}:${s.clock.minute}:${offer.seller}:${offer.id}:${p.line.id}` : null;
        emit({ t: 'service.granted', d: { ...(id ? { id } : {}), service: p.line.service || 'other', what: p.line.what, by: offer.seller, at: s.scene.at, turn: s.turn } });
    }
    emit({ t: 'offer.closed', d: { id: offer.id, status: 'accepted' } });
    return { picks, cp };
}

/** How many units of a catalog thing Alaric holds: a V4 object he holds, or a sheet item "item.<template>". */
export function heldUnits(s, ref) {
    if (typeof ref !== 'string') return 0;
    if (ref.startsWith('item.')) return s.entities.pc.sheet.inventory[ref.slice(5)] || 0;
    const o = s.objects[ref];
    return o?.holder?.entity === 'pc' ? (o.qty ?? 1) : 0;
}

/**
 * The units a sale is of: the number he names, never more than he holds; without a number an object goes whole and a
 * sheet item one at a time (as before).
 * @returns {{units: number} | {error: string}}
 */
export function saleUnits(s, ref, qty = null) {
    const held = heldUnits(s, ref);
    if (!held) return { error: 'he does not hold it' };
    if (qty && qty > held) return { error: `he holds only ${held}` };
    return { units: qty || (String(ref).startsWith('item.') ? 1 : held) };
}

/**
 * Book a sale: exactly `units` of each thing leave Alaric (the rest of a stack stays his, with its Rank and origin),
 * exactly `cp` come in, once for the whole sale: a buyer's price for a lot of several things is one price (4.3.0-c.6.6.5,
 * live 15.10.2026: "eight silver for the lot" of four stacks). items: [{ref, units, splitId}], or ref/units/splitId for
 * one thing. The coin is the engine's credit to him (transaction.completed to "pc"): coin the story shows him pick up
 * there afterwards is this coin, not new coin (src/v4/world.js coin.gift).
 */
export function bookSale(s, emit, { items = null, ref, units, buyer, cp, what, splitId, offer = null }) {
    if (!buyer || buyer === 'pc' || !s.scene.present.includes(buyer) || s.entities[buyer]?.status === 'dead') return { error: 'the buyer is not present' };
    if (!Number.isInteger(cp) || cp < 0) return { error: 'invalid sale price' };
    const lot = items || [{ ref, units, splitId }];
    if (!lot.length || new Set(lot.map(it => it.ref)).size !== lot.length) return { error: 'empty or duplicate sale lines' };
    for (const it of lot) {
        if (!Number.isInteger(it.units) || it.units <= 0 || heldUnits(s, it.ref) < it.units) return { error: 'the complete lot is no longer held' };
        const o = s.objects[it.ref];
        if (o && it.units < (o.qty ?? 1) && (!it.splitId || s.objects[it.splitId])) return { error: 'invalid stack split' };
    }
    if (offer) {
        const live = s.offers[offer.id];
        if (!live || live.status !== 'open' || !live.bid || live.seller !== buyer || live.at !== s.scene.at) return { error: 'the bid is no longer available here' };
        const ids = live.lines.filter(l => lot.some(it => it.ref === l.object && it.units === l.qty)).map(l => l.id);
        const selection = bidSale(s, live, ids);
        if (selection.error || ids.length !== lot.length || selection.cp !== cp) return { error: selection.error || 'the lot or price differs from the bid' };
    }
    for (const it of items || [{ ref, units, splitId }]) {
        const o = s.objects[it.ref];
        if (o?.holder?.entity === 'pc') {
            const part = it.units < (o.qty ?? 1) ? it.units : null;
            emit({ t: 'object.moved', d: { id: o.id, to: buyer ? { entity: buyer } : { loc: s.scene.at }, ...(part ? { qty: part, split: it.splitId } : {}) } });
        } else if (String(it.ref).startsWith('item.')) emit({ t: 'item.changed', d: { id: 'pc', item: String(it.ref).slice(5), qty: -it.units, why: 'sold' } });
    }
    emit({ t: 'coin.changed', d: { id: 'pc', value: s.entities.pc.sheet.coin_cp + cp, delta: cp, why: `sold ${what}` } });
    emit({ t: 'transaction.completed', d: { to: 'pc', from: buyer, cp, for: what, at: s.scene.at, ...(offer ? { offer: offer.id } : {}) } });
    return { ok: true };
}

/**
 * Prototype C (4.3.0-c.6.6.5): a buyer's bid for things Alaric holds, as it stands now: the lines he sells (all of them,
 * or the ones he names when each has its own price), the price, and why it cannot be sold now (he no longer holds
 * that many, or he names part of a lot the buyer priced only whole).
 * @returns {{lines: object[], cp: number} | {error: string, stale?: boolean}}
 */
export function bidSale(s, offer, lineIds = null) {
    const all = offer.lines || [];
    const lines = Array.isArray(lineIds) && lineIds.length ? all.filter((l) => lineIds.includes(l.id)) : all;
    if (!lines.length) return { error: 'the bid has no such thing' };
    const priced = lines.every((l) => Number.isInteger(l.price_cp));
    if (lines.length < all.length && !priced) return { error: `the ${offer.price_cp} cp are for the whole lot (${all.map((l) => unitsText(l.what, l.qty)).join(', ')}); for part of it the buyer has named no price` };
    for (const l of lines) {
        const held = heldUnits(s, l.object);
        if (held < l.qty) return { error: `he ${held ? `holds only ${held}` : 'no longer holds any'} of ${l.what} (the bid was for ${l.qty})`, stale: true };
    }
    const cp = lines.length === all.length && Number.isInteger(offer.price_cp) ? offer.price_cp : lines.reduce((n, l) => n + (l.price_cp || 0), 0);
    return { lines, cp };
}

/** "F-Rank Mudwyrm Skin ×2, F-Rank Mudwyrm Fang ×2": the things of a bid. */
export const bidText = (lines) => lines.map((l) => `${l.what} ×${l.qty}`).join(', ');
