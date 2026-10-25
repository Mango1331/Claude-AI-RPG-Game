import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { applyWorld } from '../../src/v4/world.js';
import { planContext, parsePlan, withContentSkills } from '../../src/v4/planner.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { campaign, inject, say, lastUser } from './patch8_lib.js';
import { prepareGenerationAsync, processReplyAny, runExtraction } from '../../src/v4/runtime.js';
import { foldChat } from '../../src/host.js';
const content = await loadProductContent();
const vocab = JSON.parse(fs.readFileSync(new URL('../../content/commands.json', import.meta.url)));
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run15_trade.json', import.meta.url)));
const clone = structuredClone;
const commands = (s, cs, msg = 193) => {
    const state = clone(s), events = [];
    const ctx = resolveCommands(state, content, cs, e => { events.push(e); applyEvent(state, e); }, { c: true, msg });
    return { state, events, ctx };
};
const cp = r => r.state.entities.pc.sheet.coin_cp;
const coins = r => r.events.filter(e => e.t === 'coin.changed');
const purchase = f.cases.duplicate.commands[0];
const pay = f.cases.duplicate.commands[2];
const simple = () => [
    { ...purchase, quote: "I'll take the eight-silver pair." },
    { ...pay, seq: 2, quote: 'I hand over the coins for the pair.' },
];
function world(name, answer = f.cases[name].answer, prose = f.cases[name].text) {
    const c = f.cases[name]; return applyWorld(clone(c.state), content, clone(answer), { msg: c.i, prose });
}
function bidAnswer(said, price_cp, qty = 4) {
    const a = clone(f.cases.price.answer); a.deltas = [{ ...a.deltas[0], said, price_cp, lines: [{ ...a.deltas[0].lines[0], qty }] }]; return a;
}
function plan(s, text, cs) {
    return parsePlan(JSON.stringify({ commands: cs }), vocab, withContentSkills(planContext(s, content, buildCatalog(s, content, { c: true })), content, s), text);
}

test('Run15 T97 original: a requested discount is not unconditional consent to the old price', () => {
    const c = f.cases.duplicate, r = commands(c.state, c.commands);
    assert.equal(cp(r), c.state.entities.pc.sheet.coin_cp);
    assert.equal(r.events.filter(e => e.t === 'transaction.completed').length, 0);
});
test('one purchase and its explicit payment debit exactly once', () => {
    const r = commands(f.cases.duplicate.state, simple());
    assert.equal(cp(r), 534); assert.equal(coins(r).length, 1);
    assert.equal(r.events.filter(e => e.t === 'object.created').length, 1);
});
test('payment before acceptance of the same selected line is also one purchase', () => {
    const [a, p] = simple(), r = commands(f.cases.duplicate.state, [{ ...p, seq: 1 }, { ...a, seq: 2 }]);
    assert.equal(cp(r), 534); assert.equal(coins(r).length, 1);
    assert.equal(r.events.filter(e => e.t === 'object.created').length, 1);
});
test('two genuinely independent purchases of equal price from one seller both book', () => {
    const s = clone(f.cases.duplicate.state), o = clone(s.offers[purchase.offer]);
    o.id = 'offer.other'; o.lines = [{ ...o.lines[0], what: 'iron sword' }]; s.offers[o.id] = o;
    const r = commands(s, [simple()[0], { seq: 2, type: 'offer.accept', offer: o.id, quote: "I'll also buy the iron sword." }]);
    assert.equal(cp(r), 454); assert.equal(coins(r).length, 2);
});
test('an explicit tip remains a separate payment, even at the same amount', () => {
    const r = commands(f.cases.duplicate.state, [simple()[0], { ...pay, seq: 2, for: 'a tip for your help', quote: 'I also give you eight silver as a tip.' }]);
    assert.equal(cp(r), 454); assert.equal(coins(r).length, 2);
});
test('insufficient funds never create goods or a second payment', () => {
    const s = clone(f.cases.duplicate.state); s.entities.pc.sheet.coin_cp = 70;
    const r = commands(s, simple()); assert.equal(cp(r), 70); assert.equal(coins(r).length, 0);
});
test('Run15 T29 original: explicit Hessel consent cannot sell the plates to Doss', () => {
    const c = f.cases.wrongParty, r = commands(c.state, c.commands, c.i);
    assert.equal(coins(r).length, 0);
    assert.equal(r.state.objects['obj.loot.crystal_beetle.chitin.f'].holder.entity, 'pc');
});
test('acceptance constraints reject a different counterparty or total before booking', () => {
    for (const more of [{ party_words: 'Hessel' }, { agreed_cp: 120 }]) {
        const c = f.cases.wrongParty, r = commands(c.state, [{ ...c.commands[0], ...more }]);
        assert.equal(coins(r).length, 0);
    }
});
test('an unqualified Deal still accepts the one valid local offer', () => {
    const c = f.cases.wrongParty, r = commands(c.state, [{ ...c.commands[0], quote: 'Deal.' }]);
    assert.equal(coins(r).length, 1); assert.equal(cp(r), 186);
});
test('planner repair receives an explicit mismatch, not another merchant substituted silently', () => {
    const c = f.cases.wrongParty, p = plan(c.state, c.text, c.commands);
    assert.equal(p.commands, null); assert.match(p.errors.join(' '), /party|Hessel|counterparty/i);
});
test('party evidence must be copied from the player message', () => {
    const c = f.cases.wrongParty, p = plan(c.state, 'Deal.', [{ ...c.commands[0], quote: 'Deal.', party_words: 'Doss' }]);
    assert.equal(p.commands, null);
});
test('Run15 T26 original: four correctly extracted copper stay four, not one', () => {
    const r = world('price'), o = Object.values(r.state.offers).find(o => o.id === 'offer.t52.6');
    assert.equal(o.price_cp, 4);
});
test('a lot price is not multiplied by its quantity', () => {
    const said = 'Four plates for one copper, the whole lot.';
    const r = world('price', bidAnswer(said, 1), said);
    assert.equal(r.state.offers['offer.t52.6'].price_cp, 1);
});
test('one explicit total wins over the separate per-piece prices it totals', () => {
    const said = 'Two at four silver each, two at two silver each. Twelve silver the lot.';
    const r = world('price', bidAnswer(said, 120), said);
    assert.equal(r.state.offers['offer.t52.6'].price_cp, 120);
});
test('a price range does not become a fixed offer at its first number', () => {
    const said = 'A copper or two per plate.';
    const r = world('price', bidAnswer(said, 4), said);
    assert.ok(!r.state.offers['offer.t52.6']);
});
test('different unit prices without a total are not added as a lot price', () => {
    const said = 'Two silver each for the first plates, three silver each for the others.';
    const r = world('price', bidAnswer(said, 50), said);
    assert.ok(!r.state.offers['offer.t52.6']);
});
test('Run15 T17 original: third-party advice creates neither a Guild lodging offer nor a Guild chitin bid', () => {
    const r = world('advice'); assert.equal(r.events.filter(e => e.t === 'offer.created').length, 0);
    assert.ok(r.events.some(e => e.t === 'fact.asserted' || e.t === 'place.created'));
});
test('Run15 T18 original: advice about Old Fen does not create a Marta healing offer', () => {
    const r = world('fen'); assert.equal(r.events.filter(e => e.t === 'offer.created').length, 0);
});
test('a present seller can offer their own service, or explicitly book it for the player', () => {
    const s = clone(f.cases.advice.state), seller = 'npc.npcguild_keeper_glassmere';
    for (const [what, said] of [['a meal here', 'I can serve you a meal for three copper.'], ['a bed at the Drowned Ox', 'I can book you a bed at the Drowned Ox for three copper.']]) {
        const a = { scene: s.scene.at, expected: {}, deltas: [{ seq: 1, type: 'offer', seller, lines: [{ what, kind: 'service', service: what.includes('bed') ? 'lodging' : 'meal', qty: 1, price_cp: 3, said }] }] };
        const r = applyWorld(s, content, a, { msg: 34, prose: said }); assert.equal(r.events.filter(e => e.t === 'offer.created').length, 1);
    }
});
test('Run15 T94 original: appraisal and requested payment cannot give the plate away for free', () => {
    const c = f.cases.sale, r = commands(c.state, c.commands, c.i);
    assert.equal(r.state.objects['obj.loot.bog_strider.chitin.f'].holder.entity, 'pc');
});
test('an explicit accepted sale and its handover use one bookSale', () => {
    const c = f.cases.sale, cs = clone(c.commands);
    cs[0].quote = 'Deal, I hand over the plate for eight silver.';
    cs[1].quote = 'Deal, I hand over the plate for eight silver.';
    const r = commands(c.state, cs, c.i);
    assert.equal(r.state.objects['obj.loot.bog_strider.chitin.f'].holder.entity, 'npc.npcsmith_ironmonger');
    assert.equal(coins(r).length, 1); assert.equal(coins(r)[0].d.delta, 80);
});
test('an explicit free gift remains a gift even with a matching buyer bid open', () => {
    const c = f.cases.sale, r = commands(c.state, [{ ...c.commands[0], quote: 'Keep the plate as a gift. No payment.' }], c.i);
    assert.equal(r.state.objects['obj.loot.bog_strider.chitin.f'].holder.entity, 'npc.npcsmith_ironmonger');
    assert.equal(coins(r).length, 0);
});
test('a successful purchase survives event replay and JSON reload without another debit', () => {
    const s = clone(f.cases.duplicate.state), r = commands(s, simple()), replay = clone(s);
    for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, e);
    assert.deepEqual(JSON.parse(JSON.stringify(replay)), JSON.parse(JSON.stringify(r.state)));
    assert.deepEqual(commands(s, simple()).events, r.events, 'alternate reply recomputes from the same pre-turn state');
});
test('Ruleset 1 keeps its historical independent payment interpretation', () => {
    const s = clone(f.cases.duplicate.state); s.meta.ruleset = 1;
    assert.equal(cp(commands(s, simple())), 454);
});

test('ordinary polite acceptance is not mistaken for a named counterparty', () => {
    const c = f.cases.wrongParty, r = commands(c.state, [{ ...c.commands[0], quote: 'Deal, please.' }]);
    assert.equal(coins(r).length, 1);
});
test('buy plus pay uses the same offer and retains its spending limit', () => {
    const c = { seq: 1, type: 'buy', what: 'lacquered strider-plate shin-guards', from: pay.to, max_cp: 80, quote: "I'll buy the lacquered strider-plate shin-guards." };
    let r = commands(f.cases.duplicate.state, [c, simple()[1]]); assert.equal(cp(r), 534); assert.equal(coins(r).length, 1);
    r = commands(f.cases.duplicate.state, [{ ...c, max_cp: 70 }, simple()[1]]); assert.equal(cp(r), 614); assert.equal(coins(r).length, 0);
});
test('an ambiguous additional payment is not charged after two legitimate purchases', () => {
    const s = clone(f.cases.duplicate.state), o = clone(s.offers[purchase.offer]); o.id = 'offer.other'; s.offers[o.id] = o;
    const r = commands(s, [simple()[0], { ...simple()[0], seq: 2, offer: o.id }, { ...pay, seq: 3, for: null }]);
    assert.equal(coins(r).length, 2); assert.equal(cp(r), 454);
});
test('a sale minimum is enforced even when an open bid matches its object', () => {
    const c = f.cases.sale, r = commands(c.state, [{ seq: 1, type: 'sell', object: c.commands[0].object, to: c.commands[0].to, min_cp: 120, quote: 'I sell it only for twelve silver.' }]);
    assert.equal(coins(r).length, 0); assert.equal(r.state.objects[c.commands[0].object].holder.entity, 'pc');
});
test('a commercial GIVE without a second acceptance command also preserves custody', () => {
    const c = f.cases.sale, r = commands(c.state, [{ ...c.commands[0], quote: 'I hand it over; check it and pay me what it is worth.' }]);
    assert.equal(r.state.objects[c.commands[0].object].holder.entity, 'pc'); assert.equal(coins(r).length, 0);
});
test('a plate unit rate cannot price an additional, different item in the same bid', () => {
    const a = bidAnswer('A copper a plate.', 4); a.deltas[0].lines.push({ object: 'obj.guild_plate', qty: 1 });
    const r = world('price', a, 'A copper a plate.'); assert.ok(!r.state.offers['offer.t52.6']);
});
test('ordinary narrative third-person offers still work', () => {
    const said = 'He will pay four copper for the lot.';
    const r = world('price', bidAnswer(said, 4), `Doss considers the plates. ${said}`);
    assert.equal(r.state.offers['offer.t52.6'].price_cp, 4);
});
test('a tip identified in its quote remains independent even without a for field', () => {
    const r = commands(f.cases.duplicate.state, [simple()[0], { ...pay, seq: 2, for: null, quote: 'And eight silver as a tip for you.' }]);
    assert.equal(cp(r), 454); assert.equal(coins(r).length, 2);
});
test('a partial lot purchase and its payment buy exactly the selected units', () => {
    const s = clone(f.cases.duplicate.state), o = s.offers[purchase.offer];
    o.lines = [{ ...o.lines[0], what: 'water flasks', qty: 3, price_cp: 9 }];
    const r = commands(s, [{ ...simple()[0], qty: 2, quote: 'Two of the water flasks, please.' },
        { ...pay, seq: 2, amount_cp: 6, for: 'two water flasks', quote: 'I hand over the six copper for the flasks.' }]);
    assert.equal(cp(r), 608); assert.equal(coins(r).length, 1);
    assert.equal(r.events.find(e => e.t === 'object.created').d.object.qty, 2);
});
test('known correct party and exact total evidence validate and book', () => {
    const c = f.cases.wrongParty, text = 'Deal, Doss. One copper for the lot.';
    const cs = [{ ...c.commands[0], quote: text, party_words: 'Doss', agreed_cp: 1 }];
    assert.ok(plan(c.state, text, cs).commands); assert.equal(coins(commands(c.state, cs)).length, 1);
});
test('a different explicit price is returned to planner repair', () => {
    const c = f.cases.wrongParty, text = 'Deal, Doss. Twelve silver for the lot.';
    const p = plan(c.state, text, [{ ...c.commands[0], quote: text, party_words: 'Doss', agreed_cp: 120 }]);
    assert.equal(p.commands, null); assert.match(p.errors.join(' '), /price/i);
});
test('constraint fields cannot conceal a contradictory quoted party or price', () => {
    const c = f.cases.wrongParty;
    const r = commands(c.state, [{ ...c.commands[0], party_words: 'Doss', agreed_cp: 1 }]); assert.equal(coins(r).length, 0);
    const cs = [{ ...c.commands[0], quote: 'Twelve silver for the lot.', agreed_cp: 1 }]; assert.equal(coins(commands(c.state, cs)).length, 0);
});
test('a role description mentioning another trader is no identity alias', () => {
    const c = f.cases.wrongParty, s = clone(c.state); s.entities['npc.doss'].descriptors.push('Hessel is his friend');
    assert.equal(coins(commands(s, c.commands)).length, 0);
});
test('a three-for-nine offer keeps its lot price and its quantity', () => {
    const c = f.cases.advice, seller = 'npc.npcguild_keeper_glassmere', said = 'Three water flasks for nine copper.';
    const a = { scene: c.state.scene.at, expected: {}, deltas: [{ seq: 1, type: 'offer', seller, lines: [{ what: 'water flasks', kind: 'goods', qty: 3, price_cp: 9, said }] }] };
    const r = applyWorld(c.state, content, a, { msg: c.i, prose: said });
    const o = r.events.find(e => e.t === 'offer.created').d.offer;
    assert.equal(o.lines[0].qty, 3); assert.equal(o.lines[0].price_cp, 9);
});
test('product host caches the purchase; reload and an alternative reply do not repeat its debit', async () => {
    const g = await campaign(content), s = g.state(), seller = clone(f.cases.duplicate.state.entities[pay.to]);
    seller.at = s.scene.at;
    const offer = clone(f.cases.duplicate.state.offers[purchase.offer]); offer.at = s.scene.at;
    inject(g, [{ t: 'entity.created', d: { entity: seller } }, { t: 'scene.entered', d: { id: seller.id } },
        { t: 'coin.changed', d: { id: 'pc', value: 614, delta: 584 } }, { t: 'offer.created', d: { offer } }]);
    const text = "I'll take the eight-silver pair. I hand over the coins for the pair.";
    await say(g, text, ...simple());
    const before = JSON.stringify(lastUser(g));
    assert.equal(g.state().entities.pc.sheet.coin_cp, 534);
    assert.equal(lastUser(g).events.filter(e => e.t === 'coin.changed').length, 1);
    await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: async () => { throw Error('cached turn must not call provider'); } });
    assert.equal(JSON.stringify(lastUser(g)), before);
    const reload = JSON.parse(JSON.stringify(g.chat)); assert.deepEqual(foldChat(reload).state, g.state());
    await g.reply('Mara takes the coins and gives him the pair.', { expected: {}, deltas: [] });
    const id = g.chat.length - 1;
    const msg = g.chat[id], old = clone(msg.extra), oldText = msg.mes;
    msg.mes = 'Mara hands him his purchase.'; msg.swipes = [oldText, msg.mes]; msg.swipe_id = 1;
    msg.swipe_info = [{ extra: old }, { extra: clone(old) }];
    const p = processReplyAny(g.chat, id, content, {});
    if (p.extract) await runExtraction(g.chat, id, content, g.llm);
    assert.equal(g.state().entities.pc.sheet.coin_cp, 534);
    msg.mes = oldText; msg.swipe_id = 0; msg.extra = clone(old);
    assert.equal(g.state().entities.pc.sheet.coin_cp, 534);
});
test('a linked payment cannot bypass a failed prerequisite of the purchase', () => {
    const [a, p] = simple();
    const r = commands(f.cases.duplicate.state, [{ seq: 1, type: 'take', object: 'obj.missing', quote: 'I take the missing item first.' },
        { ...p, seq: 2 }, { ...a, seq: 3, needs: 1 }]);
    assert.equal(cp(r), 614); assert.equal(coins(r).length, 0);
});
test('payment before lodging acceptance still books the bed for dependent sleep', () => {
    const s = clone(f.cases.duplicate.state), o = s.offers[purchase.offer];
    o.lines = [{ id: 'l1', what: 'a bed', kind: 'service', service: 'lodging', qty: 1, price_cp: 3 }];
    const r = commands(s, [{ ...pay, seq: 1, amount_cp: 3, for: null, quote: 'I pay three copper.' },
        { ...purchase, seq: 2, quote: 'I accept the bed.' }, { seq: 3, type: 'activity', kind: 'sleep', what: 'the bed', minutes: 60, until: null, needs: 2, quote: 'Then I sleep in the bed.' }]);
    assert.equal(coins(r).length, 1); assert.equal(r.ctx.resolutions.at(-1).status, 'resolved');
});
test('selling one item cannot accept an unpriced multi-item lot containing another item', () => {
    const c = f.cases.sale, s = clone(c.state), id = 'obj.another';
    s.objects[id] = { id, name: 'venom gland', kind: 'item', qty: 1, holder: { entity: 'pc' } };
    s.offers[c.commands[1].offer].lines.push({ id: 'l2', object: id, what: 'venom gland', qty: 1, price_cp: null });
    const r = commands(s, [{ seq: 1, type: 'sell', object: c.commands[0].object, to: c.commands[0].to, min_cp: null, quote: 'I sell only the chitin plate.' }]);
    assert.equal(coins(r).length, 0); assert.equal(r.state.objects[id].holder.entity, 'pc');
    assert.equal(r.state.objects[c.commands[0].object].holder.entity, 'pc');
});
test('an item named spear tip is not mistaken for an independent gratuity', () => {
    const s = clone(f.cases.duplicate.state); s.offers[purchase.offer].lines[0].what = 'iron spear tip';
    const r = commands(s, [{ ...simple()[0], quote: 'I accept the iron spear tip.' },
        { ...pay, seq: 2, for: 'iron spear tip', quote: 'I hand over the coins for the iron spear tip.' }]);
    assert.equal(coins(r).length, 1); assert.equal(cp(r), 534);
});
test('same payee and amount without a purpose do not authorize an extra payment', () => {
    const r = commands(f.cases.duplicate.state, [simple()[0], { ...pay, seq: 2, for: null, quote: 'And another payment of eight silver.' }]);
    assert.equal(coins(r).length, 1); assert.equal(r.ctx.resolutions.at(-1).status, 'clarify');
});
test('an explicit tip before buying is not redirected into the open purchase', () => {
    const s = clone(f.cases.duplicate.state); s.offers[purchase.offer].lines = [s.offers[purchase.offer].lines[0]];
    const r = commands(s, [{ ...pay, seq: 1, for: 'a tip for your help', quote: 'Eight silver as a tip for you.' }, { ...simple()[0], seq: 2 }]);
    assert.equal(coins(r).length, 2); assert.equal(r.events.filter(e => e.t === 'object.created').length, 1);
});
