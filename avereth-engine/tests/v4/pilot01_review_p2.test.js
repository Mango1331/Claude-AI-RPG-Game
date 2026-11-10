// GPT product diff review of .175–.177 (main testrun_10b/npc-20261109-160250Z/REVIEW_175_177_PRODUKTDIFF_GPT.md):
//   P2-R1 (§3.1): a settlement by id names a party absent from the scene only by their name, known name or a role word
//         no one else of the record has; "the clerk" of two clerks, or a report naming another person, is no one.
//   P2-R2 (§3.2): wares the story shows in a shop stay the seller's after an offer for them closed (one of two equal
//         quills bought, the rest of a stack after part of it was bought): bought, not taken. What was his (he bought
//         it and laid it down) is his to take back; a thing no offer named stays free.
//   P3 (§3.2): two lines of one new offer never name the same displayed thing.
//   D1 (§3.1, neighbouring limit): a report under a promise's id as a debt is judged by its parties like any other.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { rec } from '../../src/host.js';
import { pilot, upTo, chainCase, playerCase, replyCase, events, rejected, valid } from './pilot01_lib.js';

const content = await loadProductContent();
const CLERK = 'npc.npcashbridge_clerk';

// ---------------------------------------------------------------------------------------------------------- P2-R1
/** I124 (the crossroads cairn, only Alaric here) with a promise of the Ashbridge clerk and, if asked, a second clerk. */
function cairnWith({ bess = null } = {}) {
    const chat = upTo(124);
    const r = rec(chat[123]);
    const at = { turn: 56, minute: 1900 };
    r.events.push({ t: 'thread.set', d: { thread: { id: 'thread.test.anna', text: 'The clerk promised to keep Alaric\'s second contract slip back for him', kind: 'promise', status: 'open', since: at, updated: at, source: { kind: 'narration', msg: 123 }, at: 'loc.ashbridge.guild_hall', who: [CLERK, 'pc'] } } });
    if (bess) {
        r.events.push({ t: 'entity.created', d: { entity: { id: 'npc.test.bess', kind: 'npc', name: 'Bess', descriptors: [bess, 'thin woman with ink-stained fingers'], traits: 'thin woman with ink-stained fingers', status: 'alive', location: 'realm.duskreach', at: 'loc.crossroads_cairn_on_the_south_road', created: at, source: { kind: 'narration', msg: 123 }, card: {}, template: 'commoner' } } },
            { t: 'scene.entered', d: { id: 'npc.test.bess', band: 'SHORT' } });
    }
    return chat;
}
const settle = (text, resolution = 'settled') => JSON.stringify({ scene: 'here', expected: {}, deltas: [{ scene: null, seq: 1, type: 'thread', id: 'thread.test.anna', kind: 'promise', status: 'resolved', text, resolution, who: null }] });
const identity = (r) => rejected(r).filter((e) => e.d.item?.type === 'thread' && /thread identity/.test(e.d.reason));

test('P2-R1: "the other clerk Bess" settles nothing of the absent clerk\'s promise', async () => {
    const { chat, r } = await replyCase(content, 124, { chat: cairnWith({ bess: 'clerk' }), answer: settle('The other clerk Bess settled a different debt at the guild desk') });
    assert.equal(identity(r).length, 1, rejected(r).map((e) => e.d.reason).join(' | '));
    assert.equal(valid(chat, content).threads['thread.test.anna'].status, 'open');
});

test('P2-R1: "the clerk" of two clerks of the record is no one, here or not', async () => {
    const { chat, r } = await replyCase(content, 124, { chat: cairnWith({ bess: 'clerk' }), answer: settle('The clerk kept the slip back as promised') });
    assert.equal(identity(r).length, 1);
    assert.equal(valid(chat, content).threads['thread.test.anna'].status, 'open');
});

test('P2-R1: a report naming another person by name is about them, even with the role word of the party', async () => {
    const { chat, r } = await replyCase(content, 124, { chat: cairnWith({ bess: 'serving woman' }), answer: settle('Bess handed over the slip the clerk had kept back') });
    assert.equal(identity(r).length, 1);
    assert.equal(valid(chat, content).threads['thread.test.anna'].status, 'open');
});

test('P2-R1 positive: the one clerk of the record named by her role settles her promise from afar', async () => {
    const { chat, r } = await replyCase(content, 124, { chat: cairnWith(), answer: settle('The clerk kept the slip back as promised', 'the clerk sent word that the slip waits at the desk') });
    assert.equal(identity(r).length, 0, rejected(r).map((e) => e.d.reason).join(' | '));
    const t = valid(chat, content).threads['thread.test.anna'];
    assert.equal(t.status, 'resolved');
    assert.match(t.text, /^The clerk promised to keep/);
});

test('P2-R1 positive: named by her name, she is identified beside a second clerk', async () => {
    const chat = cairnWith({ bess: 'clerk' });
    rec(chat[123]).events.push({ t: 'entity.updated', d: { id: CLERK, set: { name: 'Anna', descriptors: ['clerk', 'anna'] } } });
    const { r } = await replyCase(content, 124, { chat, answer: settle('Anna the clerk kept the slip back as promised') });
    assert.equal(identity(r).length, 0, rejected(r).map((e) => e.d.reason).join(' | '));
    assert.equal(valid(chat, content).threads['thread.test.anna'].status, 'resolved');
});

test('P2-R1 unchanged: a party present settles; the id and a copy of the parties alone do not', async () => {
    const here = cairnWith();
    rec(here[123]).events.push({ t: 'scene.entered', d: { id: CLERK, band: 'SHORT' } });
    const present = await replyCase(content, 124, { chat: here, answer: settle('The slip was kept back as promised') });
    assert.equal(identity(present.r).length, 0);
    const bare = await replyCase(content, 124, { chat: cairnWith(), answer: settle('The slip was kept back as promised') });
    assert.equal(identity(bare.r).length, 1);
});

test('D1 neighbouring limit: a promise reported as a debt under its id is judged by its parties like any report', async () => {
    const other = JSON.stringify({ scene: 'here', expected: {}, deltas: [{ scene: null, seq: 1, type: 'thread', id: 'thread.test.anna', kind: 'debt', status: 'resolved', text: 'Bess paid back the two silver she owed', resolution: 'paid', who: ['npc.test.bess', 'pc'] }] });
    const a = await replyCase(content, 124, { chat: cairnWith({ bess: 'clerk' }), answer: other });
    assert.equal(identity(a.r).length, 1, 'another party: another matter');
    assert.equal(valid(a.chat, content).threads['thread.test.anna'].status, 'open');
    // known limit (patchnote): with only its own party here, a shifted kind is not told apart; kind and words stay
    const here = cairnWith();
    rec(here[123]).events.push({ t: 'scene.entered', d: { id: CLERK, band: 'SHORT' } });
    const same = JSON.stringify({ scene: 'here', expected: {}, deltas: [{ scene: null, seq: 1, type: 'thread', id: 'thread.test.anna', kind: 'debt', status: 'resolved', text: 'The clerk was paid what she was owed', resolution: 'paid', who: [CLERK] }] });
    const b = await replyCase(content, 124, { chat: here, answer: same });
    const t = valid(b.chat, content).threads['thread.test.anna'];
    assert.deepEqual([t.kind, t.status], ['promise', 'resolved']);
    assert.match(t.text, /^The clerk promised to keep/);
});

// ---------------------------------------------------------------------------------------------------------- P2-R2
const SHOP = 'loc.ashbridge.bookshop_with_the_primer';
const SELLER = 'npc.npcshopkeeper_primer';
const coin = (s) => s.entities.pc.sheet.coin_cp;
const line = (what, qty, cp, said) => ({ what, kind: 'goods', service: null, qty, price_cp: cp, said, effect: null, teaches: null, equipment: false, base: null, quality: null, phase: 'firm', condition: null, pricing: { basis: 'total', quote: said, currency_quote: 'copper' } });
/** The bookshop after T41 with extra things on display and a reply offering lines of them (bought when asked). */
async function shop(objects, prose, lines, accept = null) {
    const chat = await chainCase(content, 81, 82);
    for (const o of objects) rec(chat[82]).events.push({ t: 'object.created', d: { object: { marks: [], for_quests: [], kind: 'item', stack: (o.qty ?? 1) > 1, unit: null, source: { turn: 38, how: 'story' }, ...o } } });
    chat.push({ mes: 'I ask what else he sells.', is_user: true, is_system: false, extra: {} });
    await playerCase(content, 83, { chat, answers: [JSON.stringify({ commands: [] })] });
    chat.push({ mes: prose, is_user: false, is_system: false, extra: {} });
    await replyCase(content, 84, { chat, answer: JSON.stringify({ scene: 'here', expected: {}, deltas: [{ scene: null, seq: 1, type: 'offer', seller: SELLER, lines }] }) });
    const offer = Object.values(valid(chat, content).offers).filter((o) => o.seller === SELLER && o.status === 'open').at(-1);
    if (accept) {
        chat.push({ mes: accept.text, is_user: true, is_system: false, extra: {} });
        await playerCase(content, chat.length - 1, { chat, answers: [JSON.stringify({ commands: [{ seq: 1, type: 'offer.accept', offer: offer.id, lines: [offer.lines[0].id], qty: accept.qty ?? null, party_words: null, agreed_cp: null, price_evidence: null, quote: accept.text }] })] });
    }
    return { chat, offer };
}
/** His next message with one planner command. */
async function command(chat, mes, cmd) {
    chat.push({ mes, is_user: true, is_system: false, extra: {} });
    const { r } = await playerCase(content, chat.length - 1, { chat, answers: [JSON.stringify({ commands: [{ seq: 1, quote: mes, ...cmd }] })] });
    return events(r, 'cmd.resolved')[0]?.d;
}
const QUILLS = [{ id: 'obj.test.quill_a', name: 'quill', holder: { loc: SHOP } }, { id: 'obj.test.quill_b', name: 'quill', holder: { loc: SHOP } }];

test('P2-R2: one of two equal quills bought (no link, a new quill); the two on display are still bought, not taken', async () => {
    const { chat, offer } = await shop(QUILLS, 'The shopkeeper held up a quill. "A quill, two copper."', [line('quill', 1, 2, 'A quill, two copper')], { text: 'I buy the quill.' });
    assert.equal(offer.lines[0].object, undefined, 'ambiguous: not linked (K2)');
    const before = valid(chat, content);
    assert.equal(before.offers[offer.id].status, 'accepted');
    const paid = coin(before);
    const bought = Object.values(before.objects).filter((o) => o.name === 'quill' && o.holder?.entity === 'pc');
    assert.equal(bought.length, 1);
    const res = await command(chat, 'I pick up the other quill too.', { type: 'take', object: 'obj.test.quill_a', qty: 1 });
    assert.equal(res.status, 'refused', JSON.stringify(res));
    assert.match(res.reason, /for sale/);
    const s = valid(JSON.parse(JSON.stringify(chat)), content);
    assert.deepEqual([s.objects['obj.test.quill_a'].holder, s.objects['obj.test.quill_b'].holder], [{ loc: SHOP }, { loc: SHOP }]);
    assert.equal(Object.values(s.objects).filter((o) => o.name === 'quill' && o.holder?.entity === 'pc').length, 1, 'one quill for one payment');
    assert.equal(coin(s), paid);
});

test('P2-R2: the rest of a displayed stack after he bought part of it stays the seller\'s', async () => {
    const { chat } = await shop([{ id: 'obj.test.candles', name: 'tallow candles', qty: 5, holder: { loc: SHOP } }],
        'The shopkeeper tapped the bundle of tallow candles on the shelf. "Two of those for four copper."', [line('tallow candles', 2, 4, 'Two of those for four copper')], { text: 'I take the two candles.', qty: 2 });
    assert.equal(valid(chat, content).objects['obj.test.candles'].qty, 3);
    const res = await command(chat, 'I take the rest of the candles from the shelf.', { type: 'take', object: 'obj.test.candles', qty: 3 });
    assert.equal(res.status, 'refused');
    assert.equal(valid(chat, content).objects['obj.test.candles'].holder.loc, SHOP);
});

test('P2-R2 positive: what he bought and laid down is his to take back, also beside an open offer of the same', async () => {
    const { chat } = await shop(QUILLS, 'The shopkeeper held up a quill. "A quill, two copper."', [line('quill', 1, 2, 'A quill, two copper')], { text: 'I buy the quill.' });
    const mine = Object.values(valid(chat, content).objects).find((o) => o.name === 'quill' && o.holder?.entity === 'pc').id;
    assert.equal((await command(chat, 'I set my quill down on the counter.', { type: 'drop', object: mine, qty: 1 })).status, 'resolved');
    // a new offer of quills while his own lies there
    chat.push({ mes: 'The shopkeeper nodded at the quills. "Another, two copper, if you like."', is_user: false, is_system: false, extra: {} });
    await replyCase(content, chat.length - 1, { chat, answer: JSON.stringify({ scene: 'here', expected: {}, deltas: [{ scene: null, seq: 1, type: 'offer', seller: SELLER, lines: [line('quill', 1, 2, 'Another, two copper')] }] }) });
    const res = await command(chat, 'I pick my quill back up.', { type: 'take', object: mine, qty: 1 });
    assert.equal(res.status, 'resolved', JSON.stringify(res));
    assert.equal(valid(chat, content).objects[mine].holder.entity, 'pc');
});

test('P2-R2 positive: a thing no offer ever named stays free to take in the same shop', async () => {
    const { chat } = await shop([...QUILLS, { id: 'obj.test.scrap', name: 'scrap of paper', holder: { loc: SHOP } }], 'The shopkeeper held up a quill. "A quill, two copper."', [line('quill', 1, 2, 'A quill, two copper')], { text: 'I buy the quill.' });
    const res = await command(chat, 'I pick up the scrap of paper from the floor.', { type: 'take', object: 'obj.test.scrap', qty: 1 });
    assert.equal(res.status, 'resolved');
    assert.equal(valid(chat, content).objects['obj.test.scrap'].holder.entity, 'pc');
});

// ---------------------------------------------------------------------------------------------------------- P3
test('P3: two lines of one new offer never name the same displayed quill; the first one does', async () => {
    const { offer } = await shop([QUILLS[0]], 'The shopkeeper held up a quill. "This quill, two copper. A second quill, three copper."', [line('quill', 1, 2, 'This quill, two copper'), line('quill', 1, 3, 'A second quill, three copper')]);
    assert.deepEqual(offer.lines.map((l) => l.object ?? null), ['obj.test.quill_a', null]);
    assert.ok(pilot.length === 141);
});
