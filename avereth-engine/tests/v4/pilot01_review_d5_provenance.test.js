// GPT follow-up review of .178 (main testrun_10b/npc-20261109-160250Z/REVIEW_178_PRODUKTDIFF_GPT.md §3.4): "was ever
// Alaric's" (had_pc) is no ownership. A thing he sold to the shopkeeper, who then lays it out and offers it, is the
// shopkeeper's ware: bought, not taken. What is his and lies where he himself laid it down stays his to take back,
// as does what he dropped from his pack; what the seller hands him after an offer closed stays a gift (.48).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { rec } from '../../src/host.js';
import { chainCase, playerCase, replyCase, events, rejected, valid } from './pilot01_lib.js';

const content = await loadProductContent();
const SHOP = 'loc.ashbridge.bookshop_with_the_primer';
const SELLER = 'npc.npcshopkeeper_primer';
const WHISTLE = 'obj.test.whistle';
const coin = (s) => s.entities.pc.sheet.coin_cp;
const line = (what, qty, cp, said) => ({ what, kind: 'goods', service: null, qty, price_cp: cp, said, effect: null, teaches: null, equipment: false, base: null, quality: null, phase: 'firm', condition: null, pricing: { basis: 'total', quote: said, currency_quote: 'copper' } });

async function say(chat, mes, commands = []) {
    chat.push({ mes, is_user: true, is_system: false, extra: {} });
    const { r } = await playerCase(content, chat.length - 1, { chat, answers: [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, quote: mes, ...c })) })] });
    return r;
}
async function reply(chat, mes, deltas) {
    chat.push({ mes, is_user: false, is_system: false, extra: {} });
    const { r } = await replyCase(content, chat.length - 1, { chat, answer: JSON.stringify({ scene: 'here', expected: {}, deltas: deltas.map((d, i) => ({ scene: null, seq: i + 1, ...d })) }) });
    return r;
}
/** The bookshop after T41 with Alaric holding a tin whistle. */
async function shopWithWhistle() {
    const chat = await chainCase(content, 81, 82);
    rec(chat[82]).events.push({ t: 'object.created', d: { object: { id: WHISTLE, name: 'tin whistle', kind: 'item', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: 30, how: 'story' } } } });
    return chat;
}
/** He sells the whistle to the shopkeeper by the shopkeeper's bid. */
async function sold(chat) {
    await say(chat, 'I show the shopkeeper my tin whistle.');
    await reply(chat, 'The shopkeeper turned the whistle over in his fingers. "Four copper for it."',
        [{ type: 'bid', buyer: SELLER, lines: [{ object: WHISTLE, qty: 1 }], price_cp: 4, said: 'Four copper for it', phase: 'firm', condition: null, pricing: { basis: 'total', quote: 'Four copper for it' } }]);
    const r = await say(chat, 'I sell him the whistle.', [{ type: 'sell', object: WHISTLE, to: SELLER, min_cp: null }]);
    assert.ok(events(r, 'transaction.completed').some((e) => e.d.from === SELLER && e.d.cp === 4), JSON.stringify(events(r, 'cmd.resolved')));
    return chat;
}
const shelve = (chat, offer = true) => reply(chat, 'He set the whistle on the shelf by the window. "Six copper, if anyone wants a tune."',
    [{ type: 'object.move', object: WHISTLE, qty: null, to: SHOP }, ...(offer ? [{ type: 'offer', seller: SELLER, lines: [line('tin whistle', 1, 6, 'Six copper')] }] : [])]);

test('D5 provenance: the whistle he sold, laid out and offered by the shopkeeper, is bought, not taken back', async () => {
    const chat = await sold(await shopWithWhistle());
    const paid = coin(valid(chat, content));
    const r = await shelve(chat);
    assert.equal(rejected(r).length, 0, rejected(r).map((e) => e.d.reason).join(' | '));
    const s = valid(chat, content);
    assert.deepEqual(s.objects[WHISTLE].holder, { loc: SHOP });
    assert.equal(Object.values(s.offers).find((o) => o.seller === SELLER && o.status === 'open' && o.lines[0].what === 'tin whistle').lines[0].object, WHISTLE, 'the offer names the whistle on the shelf');
    const t = await say(chat, 'I take the whistle back off the shelf.', [{ type: 'take', object: WHISTLE, qty: 1 }]);
    const res = events(t, 'cmd.resolved')[0].d;
    assert.equal(res.status, 'refused', JSON.stringify(res));
    assert.match(res.reason, /for sale/);
    const after = valid(JSON.parse(JSON.stringify(chat)), content);
    assert.deepEqual(after.objects[WHISTLE].holder, { loc: SHOP });
    assert.equal(coin(after), paid, 'no coin moves');
});

test('D5 provenance: the same after the offer for it closed (declined): still the shopkeeper\'s on the shelf', async () => {
    const chat = await sold(await shopWithWhistle());
    await shelve(chat);
    const offer = Object.values(valid(chat, content).offers).find((o) => o.seller === SELLER && o.status === 'open' && o.lines[0].object === WHISTLE);
    await say(chat, 'No, I will not buy it back.', [{ type: 'offer.decline', offer: offer.id }]);
    assert.equal(valid(chat, content).offers[offer.id].status, 'declined');
    const t = await say(chat, 'I take the whistle back off the shelf.', [{ type: 'take', object: WHISTLE, qty: 1 }]);
    assert.equal(events(t, 'cmd.resolved')[0].d.status, 'refused');
});

test('D5 provenance positive: his own whistle, laid down by him beside an open offer of whistles, is his to take back', async () => {
    const chat = await shopWithWhistle();
    await reply(chat, 'The shopkeeper nodded at a box of tin whistles. "Tin whistle, six copper."', [{ type: 'offer', seller: SELLER, lines: [line('tin whistle', 1, 6, 'Tin whistle, six copper')] }]);
    assert.equal((events(await say(chat, 'I set my whistle down on the counter.', [{ type: 'drop', object: WHISTLE, qty: 1 }]), 'cmd.resolved')[0].d.status), 'resolved');
    const t = await say(chat, 'I pick my whistle back up.', [{ type: 'take', object: WHISTLE, qty: 1 }]);
    assert.equal(events(t, 'cmd.resolved')[0].d.status, 'resolved', JSON.stringify(events(t, 'cmd.resolved')));
    const s = valid(JSON.parse(JSON.stringify(chat)), content);
    assert.equal(s.objects[WHISTLE].holder.entity, 'pc');
});

test('D5 provenance positive: sold and taken back by the shopkeeper into his hands, he may hand it over as a gift', async () => {
    const chat = await sold(await shopWithWhistle());
    const r = await reply(chat, '"Keep it," the shopkeeper said, pressing the whistle back into his hand. "It sounds better with you."', [{ type: 'object.move', object: WHISTLE, qty: null, to: 'pc' }]);
    assert.equal(rejected(r).filter((e) => e.d.rule === 'for_sale').length, 0, rejected(r).map((e) => e.d.reason).join(' | '));
    assert.equal(valid(chat, content).objects[WHISTLE].holder.entity, 'pc');
});

test('D5 provenance positive: a thing he dropped from his pack, beside an open offer of the same name, is his to take back', async () => {
    const chat = await chainCase(content, 81, 82);
    const r = await say(chat, 'I set my small pouch down on the counter.', [{ type: 'drop', object: 'item.small_pouch', qty: 1 }]);
    assert.equal(events(r, 'cmd.resolved')[0].d.status, 'resolved', JSON.stringify(events(r, 'cmd.resolved')));
    const pouch = Object.values(valid(chat, content).objects).find((o) => o.source?.how === 'dropped' && o.holder?.loc === SHOP);
    assert.ok(pouch, 'his pouch lies on the counter');
    await reply(chat, `The shopkeeper pointed at a row of pouches on the wall. "${pouch.name}, five copper."`, [{ type: 'offer', seller: SELLER, lines: [line(pouch.name, 1, 5, `${pouch.name}, five copper`)] }]);
    const t = await say(chat, 'I pick my pouch back up.', [{ type: 'take', object: pouch.id, qty: 1 }]);
    assert.equal(events(t, 'cmd.resolved')[0].d.status, 'resolved', JSON.stringify(events(t, 'cmd.resolved')));
    const s = valid(JSON.parse(JSON.stringify(chat)), content);
    assert.ok(s.objects[pouch.id]?.holder?.entity === 'pc' || (s.entities.pc.sheet.inventory.small_pouch ?? 0) >= 1, 'the pouch is his again');
});
