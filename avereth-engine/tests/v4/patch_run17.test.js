import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { fold, applyEvent } from '../../src/state.js';
import { setRec, rec, foldChat } from '../../src/host.js';
import { coinFromWords, coinMentions } from '../../src/economy.js';
import { tradePrice } from '../../src/v4/trade.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { guardCommands } from '../../src/v4/agency.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { attackCommitted } from '../../src/v4/envelope.js';

const content = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run17.json', import.meta.url)));
const before = i => fold(f.records.filter(r => r.i < i).flatMap(r => r.events));
const money = r => r.events.filter(e => e.t === 'coin.changed');
const teacher = 'npc.npcstone_instructor', offer = 'offer.t112.10';
function run(s, commands) {
    const state = structuredClone(s), events = [];
    resolveCommands(state, content, commands, e => { events.push(e); applyEvent(state, e); }, { c: true, msg: 113 });
    return { state, events };
}
function quote(s, lines) {
    return applyWorld(s, content, { scene: s.scene.at, expected: {}, deltas: [
        { seq: 1, type: 'offer', seller: teacher, lines },
    ] }, { msg: 90 });
}
const lesson = { what: 'arcane bolt lesson', kind: 'service', service: 'training', qty: 1, price_cp: 40, said: 'four silver', teaches: null };
function purchaseState(cp = 50) {
    const s = before(113); s.offers[offer].lines[0].price_cp = cp;
    return s;
}
async function act(commands, text, mutate = () => {}) {
    const chat = Array.from({ length: 114 }, () => ({ mes: '', is_user: false, is_system: false, extra: {} }));
    for (const r of f.records) setRec(chat[r.i], { events: structuredClone(r.events) });
    const price = f.cases.price;
    setRec(chat[112], { events: applyWorld(before(112), content, price.answer, { msg: 112, prose: price.text }).events });
    // Isolate consumer regressions on the agreed price; the original T56 publication is tested separately.
    rec(chat[112]).events.find(e => e.t === 'offer.created').d.offer.lines[0].price_cp = 50;
    mutate(rec(chat[112]));
    chat[113] = { mes: text, is_user: true, is_system: false, extra: {} };
    const result = await prepareGenerationAsync(chat, content, { type: 'normal', settings: { planner: true }, llm: async () => JSON.stringify({ commands }) });
    return { result, record: rec(chat[113]), state: foldChat(chat).state, chat };
}

test('Run17 original price evidence reads 50, not 60 copper', () => {
    const said = f.cases.price.answer.deltas.find(d => d.type === 'offer').lines[0].said;
    assert.equal(coinFromWords(said, content), 50);
    assert.deepEqual(coinMentions(said, content), [50]);
});
test('Run17 apostrophes inside words never create currency or hide a real price', () => {
    for (const text of ["one's", 'one’s', "1's", "merchant's", "it's"])
        assert.equal(coinFromWords(text, content), null, text);
    for (const text of ["It's five silver", 'This one’s five silver', "A merchant's vial costs five silver"])
        assert.equal(coinFromWords(text, content), 50, text);
});
test('Run17 numeric currency abbreviations stay supported consistently', () => {
    for (const text of ['1s', '1 s', 'one silver']) {
        assert.equal(coinFromWords(text, content), 10);
        assert.deepEqual(coinMentions(text, content), [10]);
    }
    assert.equal(coinFromWords('1g 2s 3cp', content), 123);
});
test('Run17 compound currency is one price, separate prices remain ambiguous', () => {
    assert.equal(tradePrice(null, 'one silver and five copper', 1, content).cp, 15);
    assert.equal(tradePrice(null, '1s 5c', 1, content).cp, 15);
    assert.equal(tradePrice(null, 'five silver for one; three silver for the other', 1, content).cp, null);
    assert.equal(tradePrice(null, 'five silver or three silver', 1, content).cp, null);
});
test('Run17 a mixed-currency unit price keeps quantity math and rejects two independent rates', () => {
    assert.equal(tradePrice(null, 'one silver and five copper each', 2, content).cp, 30);
    assert.equal(tradePrice(null, 'one silver each and five copper each', 2, content).cp, null);
});
test('Run17 original T56 creates the two actual 50/30 prices without a false correction', () => {
    const c = f.cases.price, r = applyWorld(before(c.i), content, c.answer, { msg: c.i, prose: c.text });
    assert.deepEqual(r.events.find(e => e.t === 'offer.created').d.offer.lines.map(l => l.price_cp), [50, 30]);
    assert.ok(!r.events.some(e => e.t === 'note' && e.d.kind === 'amount.corrected'));
});
test('Run17 explicit compound consent cannot silently pay an unrelated price', () => {
    const c = { ...f.cases.accept.commands[0], quote: "I'll take it for one silver and five copper.", agreed_cp: null };
    assert.equal(money(run(purchaseState(50), [c])).length, 0);
    assert.equal(money(run(purchaseState(15), [c]))[0].d.delta, -15);
});
test('Run17 short-unit consent and ambiguous alternatives cannot bypass the posted price', () => {
    for (const quote of ["I'll take it for 1s.", "I'll pay five silver or three silver."])
        assert.equal(money(run(purchaseState(50), [{ ...f.cases.accept.commands[0], quote, agreed_cp: null }])).length, 0);
});
test('Run17 original purchase then drink resolves after ownership exists, exactly once', async () => {
    const r = await act(f.cases.accept.commands, f.cases.accept.text);
    assert.equal(r.record.plan.failed, false);
    assert.deepEqual(money(r.record).map(e => e.d.delta), [-50]);
    assert.equal(r.state.entities.pc.sheet.mp, 72);
    const item = r.record.events.find(e => e.t === 'object.created').d.object.id;
    assert.deepEqual(r.state.objects[item].holder, { consumed: 'pc' });
    assert.equal(r.record.events.filter(e => e.t === 'object.consumed').length, 1);
    const replay = foldChat(r.chat, 113).state;
    for (const e of JSON.parse(JSON.stringify(r.record.events))) applyEvent(replay, e);
    assert.deepEqual(replay, r.state);
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(r.chat))).state, r.state);
    const saved = structuredClone(r.record.events);
    await prepareGenerationAsync(r.chat, content, { type: 'regenerate', settings: { planner: true }, llm: () => { throw Error('reuse the existing plan'); } });
    assert.deepEqual(rec(r.chat[113]).events, saved);
    assert.deepEqual(foldChat(r.chat).state, r.state);
});
test('Run17 repeating the use command cannot drink one bought vial twice', async () => {
    const commands = structuredClone(f.cases.accept.commands);
    commands.push({ ...commands[1], seq: 3 });
    const r = await act(commands, f.cases.accept.text);
    assert.equal(r.state.entities.pc.sheet.mp, 72);
    assert.equal(r.record.events.filter(e => e.t === 'object.consumed').length, 1);
    assert.deepEqual(money(r.record).map(e => e.d.delta), [-50]);
});
test('Run17 a failed purchase cannot grant or consume the following new item', async () => {
    const r = await act(f.cases.accept.commands, f.cases.accept.text, record => {
        record.events.push({ t: 'coin.changed', d: { id: 'pc', value: 10, delta: -88, why: 'test precondition' } });
    });
    assert.equal(money(r.record).length, 0);
    assert.equal(r.state.entities.pc.sheet.mp, 47);
    assert.ok(!r.record.events.some(e => ['object.created', 'object.consumed'].includes(e.t)));
});
test('Run17 unrelated, premature and ambiguous new-item uses remain unowned', async () => {
    const use = { seq: 1, type: 'use', object: { new: 'small mana draught vial' }, qty: 1, quote: 'I drink the vial' };
    const alone = await act([use], use.quote);
    assert.equal(alone.state.entities.pc.sheet.mp, 47);
    const backwards = await act([use, { ...f.cases.accept.commands[0], seq: 2, quote: 'I buy the brew', agreed_cp: null }], 'I drink the vial, then I buy the brew.');
    assert.equal(backwards.state.entities.pc.sheet.mp, 47);
    const both = await act([{ ...f.cases.accept.commands[0], lines: null, qty: null, agreed_cp: null, quote: 'I buy both brews' }, { ...use, seq: 2 }], 'I buy both brews. I drink the vial.');
    assert.equal(both.state.entities.pc.sheet.mp, 47);
    assert.ok(!both.record.events.some(e => e.t === 'object.consumed'));
});
test('Run17 guards do not mistake a wish to use the newly bought item for activation', async () => {
    const c = structuredClone(f.cases.accept.commands);
    c[1].quote = "I'd like to use the vial";
    const r = await act(c, "I'll take your own brew at five silver. I'd like to use the vial.");
    assert.equal(r.state.entities.pc.sheet.mp, 47);
});
test('Run17 original bundled training is not published as an executable paid lesson', () => {
    const c = f.cases.training, r = applyWorld(before(c.i), content, c.answer, { msg: c.i, prose: c.text });
    assert.ok(!r.events.some(e => e.t === 'offer.created' && e.d.offer.lines.some(l => l.service === 'training')));
    assert.equal(money(r).length, 0);
});
test('Run17 unqualified teachers cannot sell new pure skill training', () => {
    const r = quote(before(91), [lesson]);
    assert.ok(!r.events.some(e => e.t === 'offer.created'));
    assert.ok(r.rejected.some(e => e.rule === 'training_offer'));
});
test('Run17 a previously published unqualified lesson is refused before payment', () => {
    const c = f.cases.lesson, r = run(before(c.i), c.commands);
    assert.equal(money(r).length, 0);
    assert.ok(!r.events.some(e => e.t === 'service.granted'));
});
test('Run17 qualified lessons and separately priced stones remain valid without automatic skill gains', () => {
    const s = before(91); s.entities[teacher].template = 'hedge_mage';
    const stone = { what: 'Arcane Bolt Skill Stone', kind: 'goods', service: null, qty: 1, price_cp: 10,
        teaches: { source: 'stone', fn: 'bolt', tags: ['Arcane'], aspects: [] } };
    const quoted = quote(s, [lesson, stone]);
    const o = quoted.events.find(e => e.t === 'offer.created').d.offer;
    assert.equal(o.lines.length, 2);
    const r = run(quoted.state, [{ seq: 1, type: 'offer.accept', offer: o.id, lines: null, qty: null, quote: 'I buy the lesson and stone' }]);
    assert.deepEqual(money(r).map(e => e.d.delta), [-50]);
    assert.equal(r.events.filter(e => e.t === 'service.granted').length, 1);
    assert.equal(r.events.filter(e => e.t === 'object.created').length, 1);
    assert.deepEqual(r.state.entities.pc.sheet.skills, s.entities.pc.sheet.skills);
});
test('Run17 ordinary manual dexterity training is not mistaken for a physical book', () => {
    const s = before(91); s.entities[teacher].template = 'hedge_mage'; s.offers = {};
    assert.ok(quote(s, [{ ...lesson, what: 'manual dexterity drills' }]).events.some(e => e.t === 'offer.created'));
});
test('Run17 a trained mage cannot charge for an explicitly martial or named warrior technique', () => {
    const s = before(91); s.entities[teacher].template = 'hedge_mage'; s.offers = {};
    for (const what of ['Martial strike lesson', 'Heavy Slash lesson']) {
        const r = quote(s, [{ ...lesson, what }]);
        assert.ok(!r.events.some(e => e.t === 'offer.created'), what);
        assert.ok(r.rejected.some(e => e.rule === 'training_offer'), what);
    }
});
test('Run17 a stale qualified-teacher offer is rechecked against its actual topic before payment', () => {
    const s = before(91); s.entities[teacher].template = 'hedge_mage';
    s.offers['offer.t90.8'].lines[0].what = 'Heavy Slash lesson';
    assert.equal(money(run(s, [f.cases.lesson.commands[0]])).length, 0);
});
test('Run17 a missing teacher, ordinary services and legacy contracts retain their proper boundaries', () => {
    const s = before(91), old = structuredClone(s); old.meta.ruleset = 1; old.offers = {};
    assert.ok(quote(old, [lesson]).events.some(e => e.t === 'offer.created'));
    const ordinary = structuredClone(s); ordinary.offers = {};
    assert.ok(quote(ordinary, [{ ...lesson, service: 'other', what: 'a local history lesson' }]).events.some(e => e.t === 'offer.created'));
    s.scene.present = s.scene.present.filter(id => id !== teacher);
    assert.equal(money(run(s, [f.cases.lesson.commands[0]])).length, 0);
});
test('Run17 original sprang attack starts a fight without a player attack', () => {
    const c = f.cases.hound, r = applyWorld(before(c.i), content, c.answer, { msg: c.i, prose: c.text });
    assert.ok(r.state.encounter);
    assert.ok(!r.rejected.some(e => e.rule === 'attack_commitment'));
});
test('Run17 past-tense spring attacks preserve actor, negation, quote and hypothetical protection', () => {
    assert.equal(attackCommitted('The hound watched Alaric. Then it sprang at him.', 'Then it sprang at him.', ['hound']), true);
    for (const text of ['The hound smiles at Alaric.', 'The hound sprang at Alaric yesterday.', 'The hound never sprang at Alaric.', 'If the hound sprang at Alaric, he would flee.', 'The guard said, "The hound sprang at Alaric."'])
        assert.equal(attackCommitted(text, null, ['hound'], ['guard']), false, text);
    assert.equal(attackCommitted('The hound watches. Bren sprang at Alaric.', null, ['hound'], ['Bren']), false);
});
test('Run17 finding a bed and waking in retrospect never grant unbooked sleep', async () => {
    const c = f.cases.bed;
    const r = run(before(c.i), c.commands);
    assert.equal(r.state.entities.pc.sheet.mp, 47);
    assert.ok(!r.events.some(e => e.t === 'resource.changed'));
    const m = f.cases.dawn, dawn = applyWorld(before(m.i), content, m.answer, { msg: m.i });
    assert.equal(dawn.state.entities.pc.sheet.mp, 47);
});
test('Run17 explicit turning in for the night uses existing sleep/recovery and price protections', () => {
    const s = before(95), command = { seq: 1, type: 'activity', kind: 'sleep', until: 'morning', minutes: null, what: null, quote: 'I turn in for the night' };
    s.clock.minute = 1300;
    s.entities.pc.sheet.mp = 0;
    assert.equal(guardCommands(command.quote, [command], {}, { state: false }).kept.length, 1);
    const r = run(s, [command]);
    assert.ok(r.state.entities.pc.sheet.mp > 0);
    assert.ok(r.events.some(e => e.t === 'time.advanced' && e.d.why === 'sleep'));
});
