// 4.3.0-c.6.6.51 (live 23.10.2026 11:07, docs/PROTOTYPE_C.md): the planner ran out of tokens twice on "two hours of
// training, then the room, then sleep until morning" (plan and its repair at 900, the reasoning spent on whether the sleep
// needs the payment: ORDER_RULES said "the go needs the pay", the shared bed example had none), and on the other days
// "take the room and sleep" while no price was known booked the night anyway, told in the room, paid the next morning.
// Played through the product's host path (tests/v4/patch8_lib.js): a sleep or rest in a room he takes in the same
// message happens only once that room is booked; training stays on its own; the other "needs" stay as they were.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk, outcomeOf, lastUser } from './patch8_lib.js';
import { LLM } from '../../src/v4/runtime.js';
import { plannerRequest, planContext, withContentSkills } from '../../src/v4/planner.js';
import { interpreterSystem } from '../../src/v4/interpret.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';

const content = await loadProductContent();

const ACT = (kind, more = {}) => ({ type: 'activity', kind, what: null, minutes: null, until: null, learn: null, teacher: null, tags: null, aspects: null, material: null, ...more });
const TRAIN = ACT('train', { what: 'concentration drills', minutes: 120, learn: 'INT', quote: 'I spend two hours in focused meditation drilling my concentration' });
const SLEEP = (more = {}) => ACT('sleep', { until: 'morning', quote: 'sleep until morning', ...more });
const KEEPER = { seq: 1, type: 'person.new', ref: 'keeper', name: null, role: 'innkeeper', desc: ['stout innkeeper'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' };
const ROOM = (price_cp, seller = 'keeper', seq = 2) => ({ seq, type: 'offer', seller, lines: [{ what: 'a room for the night', kind: 'service', service: 'lodging', qty: 1, price_cp }] });
const MSG = 'I spend two hours in focused meditation drilling my concentration, then pay for the room and sleep until morning.';

/** Alaric (Mage, ruleset 2) at the Dented Kettle; the innkeeper there, with a room on offer at `price` (none: no offer). */
async function atInn(price = 4) {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    await walk(g, 'loc.alderwatch', { text: '*i walk into town to the inn*', at: { new: { name: 'The Dented Kettle', kind: 'site', parent: 'loc.alderwatch' } }, deltas: [KEEPER, ...(price === null ? [] : [ROOM(price)])] });
    return g;
}
const sheet = (g) => g.state().entities.pc.sheet;
const lodging = (g) => (g.state().services || []).filter((x) => x.service === 'lodging');
const statuses = (g) => outcomeOf(g).resolutions.map((r) => [r.type, r.status, r.reason ?? null]);
const types = (g) => lastUser(g).events.map((e) => e.t);
const openOffer = (g) => Object.values(g.state().offers).find((o) => o.status === 'open' && o.lines.some((l) => l.service === 'lodging'));

// ------------------------------------------------------------------------------------------------ 1 the multi-part message
test('.51 (1): two hours of training, then the room paid, then sleep until morning: all three booked; the sleep in the room it paid for, marked or not', async () => {
    for (const needs of [2, null]) {
        const g = await atInn(4);
        const coin = sheet(g).coin_cp;
        const minute = g.state().clock.minute;
        const offer = openOffer(g);
        await say(g, MSG, TRAIN, { type: 'offer.accept', offer: offer.id, lines: ['l1'], qty: null, quote: 'pay for the room' }, SLEEP(needs ? { needs } : {}));
        assert.deepEqual(statuses(g), [['activity', 'resolved', null], ['offer.accept', 'resolved', null], ['activity', 'resolved', null]], String(needs));
        assert.equal(sheet(g).coin_cp, coin - 4);
        assert.equal(lodging(g).length, 1, 'the night he paid for');
        assert.ok(types(g).includes('growth.progress'), 'the training on its own');
        assert.ok(g.state().clock.minute > minute + 120, 'the sleep passes');
        assert.ok(types(g).filter((t) => t === 'time.advanced').length >= 2);
    }
});

// ------------------------------------------------------------------------------------------------ 2 the price not known yet
test('.51 (2): the room\'s price not known yet ("pay for another night\'s room", no offer): the training is booked, the sleep is not; nothing is paid, no night is granted; the next message sleeps in it', async () => {
    for (const needs of [2, null]) {
        const g = await atInn(null);
        const coin = sheet(g).coin_cp;
        const minute = g.state().clock.minute;
        await say(g, MSG, TRAIN, { type: 'buy', what: "another night's room", from: 'npc.keeper', qty: null, max_cp: null, any_price: false, quote: 'pay for the room' }, SLEEP(needs ? { needs } : {}));
        assert.deepEqual(statuses(g), [['activity', 'resolved', null], ['buy', 'pending', 'no_price'], ['activity', 'refused', 'room not booked']], String(needs));
        assert.match(outcomeOf(g).actions[2], /^3\. NOT DONE — "sleep until morning": he would sleep in the room or bed of step 2, and it is not his yet: no price is agreed and nothing is paid for it\. He does not sleep in this reply; tell no night in it\./);
        assert.ok(outcomeOf(g).extra.some((x) => /^OPEN DECISION — Alaric wants another night's room; no price is known\./.test(x)));
        assert.ok(types(g).includes('growth.progress'), 'the training stands on its own');
        assert.equal(g.state().clock.minute, minute + 120, 'only the training passes');
        assert.equal(sheet(g).coin_cp, coin);
        assert.equal(lodging(g).length, 0);
        // the reply names the price; nothing is paid by it
        await g.reply('"Four copper a night," the innkeeper says.', { expected: { 1: { minutes: 120, done: true }, 2: { priced: true, taken_anyway: false } }, deltas: [ROOM(4, 'npc.keeper', 1)] });
        assert.equal(sheet(g).coin_cp, coin);
        assert.equal(lodging(g).length, 0);
        // he pays and sleeps: now he sleeps in it
        await say(g, 'I pay the four copper and sleep until morning.', { type: 'offer.accept', offer: openOffer(g).id, lines: ['l1'], qty: null, quote: 'I pay the four copper' }, SLEEP());
        assert.deepEqual(statuses(g), [['offer.accept', 'resolved', null], ['activity', 'resolved', null]]);
        assert.equal(sheet(g).coin_cp, coin - 4);
        assert.equal(lodging(g).length, 1);
    }
});

test('.51 (2b): a room taken only "if it is no more than 6 copper" is not booked yet: no sleep in it in this reply; the price named within it books the room, not the night', async () => {
    const g = await atInn(null);
    const coin = sheet(g).coin_cp;
    const minute = g.state().clock.minute;
    await say(g, "I'll take a room if it's no more than 6 copper, then sleep till morning.",
        { type: 'buy', what: 'a room for the night', from: 'npc.keeper', qty: null, max_cp: 6, any_price: false, quote: "I'll take a room if it's no more than 6 copper" },
        SLEEP({ needs: 1, quote: 'then sleep till morning' }));
    assert.deepEqual(statuses(g), [['buy', 'conditional', null], ['activity', 'refused', 'room not booked']]);
    assert.match(outcomeOf(g).actions[1], /it is not his yet: its price is still to be named, nothing is paid for it yet\. He does not sleep in this reply/);
    assert.equal(g.state().clock.minute, minute, 'no night passes');
    await g.reply('"Four copper," the innkeeper says, and he counts it out.', { expected: { 1: { priced: true, taken_anyway: false } }, deltas: [ROOM(4, 'npc.keeper', 1)] });
    assert.equal(sheet(g).coin_cp, coin - 4, 'the purchase he agreed to in advance');
    assert.equal(lodging(g).length, 1);
    assert.equal(g.state().clock.minute < minute + 600, true, 'the night was not booked with it');
});

// ------------------------------------------------------------------------------------------------ 3 a booking that fails
test('.51 (3): a booking that fails makes no paid night: too little coin, or a price above his limit', async () => {
    const g = await atInn(80);
    const coin = sheet(g).coin_cp;
    const minute = g.state().clock.minute;
    await say(g, 'I pay for the room and sleep until morning.', { type: 'offer.accept', offer: openOffer(g).id, lines: ['l1'], qty: null, quote: 'I pay for the room' }, SLEEP());
    assert.deepEqual(statuses(g).map((x) => x.slice(0, 2)), [['offer.accept', 'refused'], ['activity', 'refused']]);
    assert.match(outcomeOf(g).actions[1], /it is not his yet: that step did not happen\. He does not sleep in this reply/);
    assert.equal(sheet(g).coin_cp, coin);
    assert.equal(lodging(g).length, 0);
    assert.equal(g.state().clock.minute, minute);
    // above the limit he named: declined in the reply, nothing paid, no night
    const h = await atInn(null);
    await say(h, "I'll take a room if it's no more than 3 copper, then sleep till morning.",
        { type: 'buy', what: 'a room for the night', from: 'npc.keeper', qty: null, max_cp: 3, any_price: false, quote: "I'll take a room if it's no more than 3 copper" }, SLEEP({ quote: 'then sleep till morning' }));
    assert.deepEqual(statuses(h), [['buy', 'conditional', null], ['activity', 'refused', 'room not booked']]);
    await h.reply('"Nine copper," the innkeeper says. He shakes his head.', { expected: { 1: { priced: true, taken_anyway: false } }, deltas: [ROOM(9, 'npc.keeper', 1)] });
    assert.equal(sheet(h).coin_cp, coin);
    assert.equal(lodging(h).length, 0);
});

// ------------------------------------------------------------------------------------------------ 4 the other "needs"
test('.51 (4): the other "needs" stay as they were: the ferry (go after the pay, also when it is agreed in advance), a sleep after a go, a training that needs nothing', async () => {
    const ferry = async (price, buy) => {
        const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
        await walk(g, 'loc.alderwatch', { text: '*i go down to the ferry*', at: { new: { name: 'Alder Ferry', kind: 'site', parent: 'loc.alderwatch' } }, deltas: [
            { ...KEEPER, role: 'ferryman', desc: ['old ferryman'] }, ...(price === null ? [] : [{ seq: 2, type: 'offer', seller: 'keeper', lines: [{ what: 'crossing to the far bank', kind: 'service', service: 'other', qty: 1, price_cp: price }] }])] });
        const offer = Object.values(g.state().offers).find((o) => o.status === 'open');
        await say(g, '*i pay the ferryman and cross to the far bank*', buy ? buy : { type: 'offer.accept', offer: offer.id, lines: ['l1'], qty: null, quote: 'i pay the ferryman' },
            { type: 'go', to: { new: 'the far bank' }, needs: 1, quote: 'cross to the far bank' });
        return statuses(g).map((x) => x.slice(0, 2));
    };
    assert.deepEqual(await ferry(2), [['offer.accept', 'resolved'], ['go', 'authorized']]);
    assert.deepEqual(await ferry(900), [['offer.accept', 'refused'], ['go', 'refused']]);
    assert.deepEqual(await ferry(null, { type: 'buy', what: 'the crossing', from: 'npc.keeper', qty: null, max_cp: 5, any_price: false, quote: 'i pay the ferryman' }), [['buy', 'conditional'], ['go', 'authorized']], 'the story decides the crossing, as before');
    // a sleep after a go: as ever; a training before a pending room: on its own
    const g = await atInn(null);
    await say(g, '*i go up to the hayloft and sleep until morning*', { type: 'go', to: { new: 'the hayloft' }, quote: 'i go up to the hayloft' }, SLEEP({ needs: 1, quote: 'sleep until morning' }));
    assert.deepEqual(statuses(g).map((x) => x.slice(0, 2)), [['go', 'authorized'], ['activity', 'refused']]);
});

// ------------------------------------------------------------------------------------------------ 5 budgets and prompts
test('.51 (5): planner and extractor, with their repairs, ask with the new budgets (2000, 4000), the Forge with 1500; Board and interpreter as before', async () => {
    assert.deepEqual([LLM.plan.maxTokens, LLM.extract.maxTokens, LLM.forge.maxTokens, LLM.board.maxTokens, LLM.interpret.maxTokens], [2000, 4000, 1500, 3000, 2500]);
    const g = await atInn(4);
    const asked = [];
    const base = g.llm;
    g.llm = async (q) => { asked.push([q.purpose, q.maxTokens]); return base(q); };
    g.chat.push({ mes: '*i sleep until morning*', is_user: true, is_system: false, extra: {} });
    g.plans = ['not json', JSON.stringify({ commands: [{ seq: 1, ...SLEEP({ quote: 'i sleep until morning' }) }] })];
    await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    await g.reply('He sleeps.', 'not json either');
    assert.deepEqual(asked.filter(([p]) => /^(plan|extract)/.test(p)), [['plan', 2000], ['plan_repair', 2000], ['extract', 4000], ['extract_repair', 4000]]);
});

test('.51 (6): one rule for "needs" in the planner\'s prompt: the bed example sleeps once the bed is his, training and sleep stand alone; the interpreter of Runtime V4-A keeps its examples', async () => {
    const g = await atInn(4);
    const ctx = withContentSkills(planContext(g.state(), content, buildCatalog(g.state(), content, { known: true })), content);
    const system = plannerRequest(content.commandVocab, ctx, 'x').messages[0].content;
    assert.match(system, /"kind":"sleep","what":null,"minutes":null,"until":"morning","needs":1,"quote":"then sleep till morning"/);
    assert.doesNotMatch(system, /"until":"morning","quote":"then sleep till morning"/, 'no bed example without its needs');
    assert.match(system, /He takes a room or a bed and then sleeps or rests in it: the sleep needs the step that takes it/);
    assert.match(system, /Training, study and sleep stand on their own/);
    assert.match(system, /"learn":"AGI","teacher":null,"tags":null,"aspects":null,"material":null,"quote":"i spend two hours drilling my footwork in the yard"\}/, 'the training carries no needs');
    assert.match(system, /"until":"morning","needs":2,"quote":"sleep till morning"/);
    const a = interpreterSystem(content.commandVocab);
    assert.match(a, /"until":"morning","quote":"then sleep till morning"/);
    assert.doesNotMatch(a, /needs/);
});

// ------------------------------------------------------------------------------------------------ 7, 8 review of .51
test('.51 review (7): a room he asks for does not hold up a sleep he places elsewhere himself: in the hayloft, or after going out to the stable; going up to the room is no elsewhere', async () => {
    const BUY = { type: 'buy', what: 'a room', from: 'npc.keeper', qty: null, max_cp: null, any_price: false };
    // his sleep names its own place
    const g = await atInn(null);
    const minute = g.state().clock.minute;
    await say(g, '*i ask the innkeeper for a room, but i sleep in the hayloft until morning*', { ...BUY, quote: 'i ask the innkeeper for a room' },
        SLEEP({ what: 'in the hayloft', quote: 'i sleep in the hayloft until morning' }));
    assert.deepEqual(statuses(g), [['buy', 'pending', 'no_price'], ['activity', 'resolved', null]]);
    assert.ok(g.state().clock.minute > minute, 'the night passes, in the hayloft');
    assert.equal(lodging(g).length, 0, 'and no room is his by it');
    // he goes out to the stable and sleeps there, marked as building on the go or not
    for (const needs of [2, null]) {
        const h = await atInn(null);
        await say(h, '*i ask about a room, then go out to the stable and sleep there until morning*', { ...BUY, quote: 'i ask about a room' },
            { type: 'go', to: { new: 'the stable' }, quote: 'go out to the stable' }, SLEEP({ ...(needs ? { needs } : {}), quote: 'sleep there until morning' }));
        assert.deepEqual(statuses(h).map((x) => x.slice(0, 2)), [['buy', 'pending'], ['go', 'authorized'], ['activity', 'refused']], String(needs));
    }
    // up to the room he asked for: still that room, still waiting for it
    const k = await atInn(null);
    await say(k, '*i ask about a room, go up to it and sleep until morning*', { ...BUY, quote: 'i ask about a room' },
        { type: 'go', to: { new: 'the room upstairs' }, quote: 'go up to it' }, SLEEP());
    assert.deepEqual(statuses(k).map((x) => x.slice(0, 2)), [['buy', 'pending'], ['go', 'authorized'], ['activity', 'refused']]);
});

test('.51 review (8): only a room or bed booked for him lets him sleep in it: a payment "for the room" that books none, or a part of its price, is no booking', async () => {
    const PAY = (cp, words) => ({ type: 'pay', to: 'npc.keeper', amount_cp: cp, for: 'the room', quote: `I pay the innkeeper ${words}` });
    // No room on offer: purchase consent waits; it is not an independent gift.
    const g = await atInn(null);
    const coin = sheet(g).coin_cp;
    const minute = g.state().clock.minute;
    await say(g, 'I pay the innkeeper four copper for the room and sleep until morning.', PAY(4, 'four copper for the room'), SLEEP());
    assert.deepEqual(statuses(g), [['pay', 'conditional', null], ['activity', 'refused', 'room not booked']]);
    assert.match(outcomeOf(g).actions[1], /it is not his yet: its price is still to be named, nothing is paid for it yet\. He does not sleep in this reply/);
    assert.equal(sheet(g).coin_cp, coin, 'no money leaves without the room booking');
    assert.equal(lodging(g).length, 0);
    assert.equal(g.state().clock.minute, minute);
    // a part of the price of the room on offer (2 of 4 cp)
    const h = await atInn(4);
    await say(h, 'I pay the innkeeper two copper toward the room and sleep until morning.', PAY(2, 'two copper toward the room'), SLEEP());
    assert.equal(statuses(h)[0][1], 'refused');
    assert.equal(sheet(h).coin_cp, coin, 'a too-low purchase limit is no free payment');
    assert.deepEqual(statuses(h)[1], ['activity', 'refused', 'room not booked']);
    assert.equal(lodging(h).length, 0);
    assert.ok(openOffer(h), 'the room is still on offer');
    // its whole price: the room is booked, he sleeps in it
    const k = await atInn(4);
    await say(k, 'I pay the innkeeper four copper for the room and sleep until morning.', PAY(4, 'four copper for the room'), SLEEP());
    assert.deepEqual(statuses(k), [['pay', 'resolved', null], ['activity', 'resolved', null]]);
    assert.equal(lodging(k).length, 1);
});
