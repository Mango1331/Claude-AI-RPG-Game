// K2 + D5 (pilot 01 B5, FACHPLAN_PILOT01_KORREKTUREN §3, GPT review §2 C): goods the story already shows as an object
// in the shop or in the seller's hands change hands when bought, instead of a second copy being created; and an
// ordinary TAKE does not carry off wares on sale. Original T41–T43 (I82–I86): the Primer in the case by the window,
// bought for 30 cp, then "tucked away" by a planner take: two Primers for one payment on .174.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { rec } from '../../src/host.js';
import { pilot, chainCase, playerCase, replyCase, events, rejected, valid } from './pilot01_lib.js';

const content = await loadProductContent();
const SHOP = 'loc.ashbridge.bookshop_with_the_primer';
const SELLER = 'npc.npcshopkeeper_primer';
const primers = (s) => Object.values(s.objects).filter((o) => /^primer$/i.test(o.name) && o.holder?.entity === 'pc');
const coin = (s) => s.entities.pc.sheet.coin_cp;

test('K2 original T41–T43: the Primer in the case is the one he buys; tucking it away takes nothing more', async () => {
    const chat = await chainCase(content, 81, 85);
    const s = valid(chat, content);
    const buy = rec(chat[83]);
    assert.equal(events(buy, 'object.created').length, 0, 'no second Primer');
    assert.equal(primers(s).length, 1, 'one Primer for one payment');
    const offer = Object.values(s.offers).find((o) => o.seller === SELLER && o.lines.some((l) => /primer/i.test(l.what)));
    assert.equal(offer.lines[0].object, 'obj.t82.primer', 'the line names the object shown in the case');
    assert.deepEqual(events(buy, 'object.moved').map((e) => [e.d.id, e.d.to.entity]), [['obj.t82.primer', 'pc']]);
    assert.equal(events(buy, 'transaction.completed').length, 1);
    assert.equal(primers(s).length, 1);
    assert.equal(coin(s), coin(valid(chat.slice(0, 83), content)) - 30);
    // T43: the take of the Primer he already holds books nothing
    assert.equal(events(rec(chat[85]), 'object.moved').filter((e) => e.d.id === 'obj.t82.primer').length, 0);
    assert.equal(valid(JSON.parse(JSON.stringify(chat)), content).objects['obj.t82.primer'].holder.entity, 'pc');
});

test('D5: while it is on sale, an ordinary take of the ware is refused; the offer and the ware stay as they are', async () => {
    const chat = await chainCase(content, 81, 82);
    const m = { mes: 'I take the Primer out of the case and tuck it under my arm.', is_user: true, is_system: false, extra: {} };
    chat.push(m);
    const { r } = await playerCase(content, 83, { chat, answers: [JSON.stringify({ commands: [{ seq: 1, type: 'take', object: 'obj.t82.primer', qty: 1, quote: 'I take the Primer out of the case' }] })] });
    const res = events(r, 'cmd.resolved')[0].d;
    assert.equal(res.status, 'refused');
    assert.match(res.reason, /for sale/);
    const s = valid(chat, content);
    assert.equal(s.objects['obj.t82.primer'].holder.loc, SHOP);
    assert.equal(primers(s).length, 0);
});

/** The bookshop after T41, with extra things of the scene and a reply offering some of them. */
async function shopWith(objects, prose, offerLines, accept, { purse = null } = {}) {
    const chat = await chainCase(content, 81, 82);
    if (purse != null) rec(chat[82]).events.push({ t: 'coin.changed', d: { id: 'pc', value: purse, delta: purse - coin(valid(chat, content)), why: 'test purse' } });
    for (const o of objects) rec(chat[82]).events.push({ t: 'object.created', d: { object: { marks: [], for_quests: [], kind: 'item', stack: (o.qty ?? 1) > 1, unit: null, source: { turn: 38, how: 'story' }, ...o } } });
    chat.push({ mes: 'I ask what else he sells.', is_user: true, is_system: false, extra: {} });
    await playerCase(content, 83, { chat, answers: [JSON.stringify({ commands: [] })] });
    chat.push({ mes: prose, is_user: false, is_system: false, extra: {} });
    await replyCase(content, 84, { chat, answer: JSON.stringify({ scene: 'here', expected: {}, deltas: [{ scene: null, seq: 1, type: 'offer', seller: SELLER, lines: offerLines }] }) });
    const s = valid(chat, content);
    const offer = Object.values(s.offers).filter((o) => o.seller === SELLER && o.status === 'open').at(-1);
    if (!accept) return { chat, s, offer };
    chat.push({ mes: accept.text, is_user: true, is_system: false, extra: {} });
    await playerCase(content, 85, { chat, answers: [JSON.stringify({ commands: [{ seq: 1, type: 'offer.accept', offer: offer.id, lines: [offer.lines[0].id], qty: accept.qty ?? null, party_words: null, agreed_cp: null, price_evidence: null, quote: accept.text }] })] });
    return { chat, s: valid(chat, content), offer, r: rec(chat[85]) };
}
const line = (what, qty, cp, said) => ({ what, kind: 'goods', service: null, qty, price_cp: cp, said, effect: null, teaches: null, equipment: false, base: null, quality: null, phase: 'firm', condition: null, pricing: { basis: 'total', quote: said, currency_quote: 'copper' } });

test('K2 part of a displayed stack: he gets exactly the units he paid for, the rest stays on the shelf, nothing is copied', async () => {
    const { s, offer, r } = await shopWith([{ id: 'obj.test.candles', name: 'tallow candles', qty: 5, holder: { loc: SHOP } }],
        'The shopkeeper tapped the bundle of tallow candles on the shelf. "Two of those for four copper."', [line('tallow candles', 2, 4, 'Two of those for four copper')],
        { text: 'I take the two candles.', qty: 2 });
    assert.equal(offer.lines[0].object, 'obj.test.candles');
    assert.equal(events(r, 'object.created').length, 0);
    const moved = events(r, 'object.moved');
    assert.deepEqual(moved.map((e) => [e.d.id, e.d.qty, e.d.to.entity]), [['obj.test.candles', 2, 'pc']]);
    assert.equal(s.objects['obj.test.candles'].qty, 3);
    assert.equal(s.objects['obj.test.candles'].holder.loc, SHOP);
    assert.equal(s.objects[moved[0].d.split].qty, 2);
    assert.equal(s.objects[moved[0].d.split].holder.entity, 'pc');
});

test('K2 a displayed stack smaller than the line, or two equal things: no link, the old purchase (one new object), nothing moved', async () => {
    const few = await shopWith([{ id: 'obj.test.wax', name: 'wax seals', qty: 1, holder: { loc: SHOP } }],
        'The shopkeeper nodded at the wax seals. "Three wax seals, six copper."', [line('wax seals', 3, 6, 'Three wax seals, six copper')], { text: 'I buy the three wax seals.', qty: 3 });
    assert.equal(few.offer.lines[0].object, undefined);
    assert.equal(few.s.objects['obj.test.wax'].holder.loc, SHOP);
    assert.equal(events(few.r, 'object.created').length, 1);
    const two = await shopWith([{ id: 'obj.test.quill_a', name: 'quill', holder: { loc: SHOP } }, { id: 'obj.test.quill_b', name: 'quill', holder: { loc: SHOP } }],
        'The shopkeeper held up a quill. "A quill, two copper."', [line('quill', 1, 2, 'A quill, two copper')], { text: 'I buy the quill.' });
    assert.equal(two.offer.lines[0].object, undefined, 'ambiguous: not linked');
    assert.equal(events(two.r, 'object.created').length, 1);
    assert.deepEqual([two.s.objects['obj.test.quill_a'].holder.loc, two.s.objects['obj.test.quill_b'].holder.loc], [SHOP, SHOP]);
});

test('K2 equipment of the same name but another profile is not the offered article: no link', async () => {
    const crude = { kind: 'gear', base: 'dagger', quality: 'crude', slot: 'weapon' };
    const { offer } = await shopWith([{ id: 'obj.test.dagger', name: 'Fine Dagger', profile: crude, use: 'equipment', holder: { loc: SHOP } }],
        'The shopkeeper laid a fine dagger on the counter. "Fine dagger, fifteen copper."',
        [{ ...line('dagger', 1, 15, 'Fine dagger, fifteen copper'), equipment: true, base: 'dagger', quality: 'fine' }]);
    assert.ok(offer, 'the offer stands');
    assert.equal(offer.lines[0].object, undefined, 'a crude dagger object is not the fine dagger on offer');
});

test('K2 equipment shown with exactly the offered profile is linked and bought as that object', async () => {
    const proseG = 'The shopkeeper laid a fine dagger on the counter. "Fine dagger, fifteen copper."';
    const lineG = { ...line('dagger', 1, 15, 'Fine dagger, fifteen copper'), equipment: true, base: 'dagger', quality: 'fine' };
    const probe = await shopWith([], proseG, [lineG]);
    const offered = probe.offer.lines[0];
    assert.equal(offered.profile?.kind, 'gear');
    const { offer, r, s } = await shopWith([{ id: 'obj.test.dagger', name: offered.what, profile: structuredClone(offered.profile), use: 'equipment', holder: { loc: SHOP } }], proseG, [lineG], { text: 'I buy the dagger.' }, { purse: 500 });
    assert.equal(offer.lines[0].object, 'obj.test.dagger');
    assert.equal(events(r, 'transaction.completed').length, 1, JSON.stringify(events(r, 'cmd.resolved')));
    assert.equal(events(r, 'object.created').length, 0);
    assert.equal(s.objects['obj.test.dagger'].holder.entity, 'pc');
    assert.deepEqual(s.objects['obj.test.dagger'].profile, offered.profile);
    assert.equal(coin(s), 500 - offered.price_cp);
});

test('D5 does not block what is not on sale: a thing lying in the shop with no offer for it is taken as before', async () => {
    const chat = await chainCase(content, 81, 82);
    rec(chat[82]).events.push({ t: 'object.created', d: { object: { id: 'obj.test.scrap', name: 'scrap of paper', kind: 'item', stack: false, qty: 1, unit: null, marks: [], for_quests: [], holder: { loc: SHOP }, source: { turn: 38, how: 'story' } } } });
    chat.push({ mes: 'I pick up the scrap of paper from the floor.', is_user: true, is_system: false, extra: {} });
    const { r } = await playerCase(content, 83, { chat, answers: [JSON.stringify({ commands: [{ seq: 1, type: 'take', object: 'obj.test.scrap', qty: 1, quote: 'I pick up the scrap of paper' }] })] });
    assert.equal(events(r, 'cmd.resolved')[0].d.status, 'resolved');
    assert.equal(valid(chat, content).objects['obj.test.scrap'].holder.entity, 'pc');
    assert.ok(pilot.length === 141);
    assert.equal(rejected(r).length, 0);
});
