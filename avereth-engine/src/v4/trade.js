// Runtime V4: the quantities and prices of trade, one model for buying and selling (docs/INTEGRATION_4_1.md §7):
//
//   offer line   a lot: `qty` units (1 when the price is per piece) for `price_cp` ("three flasks for nine copper")
//   purchase     how many units Alaric takes of one line (null: the line as offered); he pays exactly their price
//   sale         how many units of what he holds leave him; he gets exactly the price the buyer agreed to
//
// Every purchase and sale books exactly those units against exactly that coin, and never more units than there are
// (review of 4.1.0: three flasks bought for the price of one, ten herbs sold while he held one, a partial sale that
// handed over the whole stack). The command handlers (src/v4/commands.js) and the world applier (src/v4/world.js)
// both book through here.

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

/**
 * Book a purchase: the coin leaves Alaric, the goods come to him in the units bought, a service is granted. The
 * caller closes the offer and the decisions it answers.
 * @param {{offer: object, picks: object[], cp: number, objectId: (name: string) => string}} p objectId: the id of a
 *   goods object Alaric receives
 */
export function bookPurchase(s, emit, { offer, picks, cp, objectId }) {
    const coin = s.entities.pc.sheet.coin_cp;
    const counted = picks.some((p) => p.units !== (Number(p.line.qty) || 1));
    emit({ t: 'transaction.completed', d: { offer: offer.id, lines: picks.map((p) => p.line.id), ...(counted ? { units: picks.map((p) => p.units) } : {}), cp, seller: offer.seller } });
    emit({ t: 'coin.changed', d: { id: 'pc', value: coin - cp, delta: -cp, why: picksText(picks) } });
    for (const p of picks.filter((x) => x.line.kind === 'goods')) {
        emit({ t: 'object.created', d: { object: { id: objectId(p.line.what), name: p.line.what, kind: 'item', stack: p.units > 1, qty: p.units, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: s.turn, how: 'bought', from: offer.seller } } } });
    }
    for (const p of picks.filter((x) => x.line.kind === 'service' && x.line.service !== 'guild_registration')) {
        emit({ t: 'service.granted', d: { service: p.line.service || 'other', what: p.line.what, by: offer.seller, at: s.scene.at, turn: s.turn } });
    }
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
 * Book a sale: exactly `units` leave Alaric (the rest of a stack stays his), exactly `cp` come in. The coin is the
 * engine's credit to him (transaction.completed to "pc"): coin the story shows him pick up there afterwards is this
 * coin, not new coin (src/v4/world.js coin.gift).
 */
export function bookSale(s, emit, { ref, units, buyer, cp, what, splitId }) {
    const o = s.objects[ref];
    if (o?.holder?.entity === 'pc') {
        const part = units < (o.qty ?? 1) ? units : null;
        emit({ t: 'object.moved', d: { id: o.id, to: buyer ? { entity: buyer } : { loc: s.scene.at }, ...(part ? { qty: part, split: splitId } : {}) } });
    } else if (String(ref).startsWith('item.')) emit({ t: 'item.changed', d: { id: 'pc', item: ref.slice(5), qty: -units, why: 'sold' } });
    emit({ t: 'coin.changed', d: { id: 'pc', value: s.entities.pc.sheet.coin_cp + cp, delta: cp, why: `sold ${what}` } });
    emit({ t: 'transaction.completed', d: { to: 'pc', from: buyer, cp, for: what, at: s.scene.at } });
}
