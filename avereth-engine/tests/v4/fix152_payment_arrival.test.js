import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk } from './patch8_lib.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync, processReplyAny, runExtraction, onEditedV4 } from '../../src/v4/runtime.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/batch25_payment_arrival.json', import.meta.url)));
const money = s => s.entities.pc.sheet.coin_cp;
async function original(arrive = true) {
    const chat = structuredClone(f.prefix);
    assert.equal(chat.length, 109);
    assert.deepEqual(foldChat(chat).errors, []);
    chat.push({ mes: f.player, is_user: true, extra: {} });
    const result = await prepareGenerationAsync(chat, content, { llm: async () => JSON.stringify(f.plan), settings: { planner: true } });
    assert.equal(result.action, 'context');
    const before = foldChat(chat).state, card = before.decisions.find(d => d.route === 'free');
    assert.equal(card.source.message, 109);
    chat.push({ mes: arrive ? f.reply : 'Alaric stays at the counter. The innkeeper waits.', is_user: false, extra: {} });
    processReplyAny(chat, 110, content);
    const answer = arrive ? f.answer : { scene: 'here', expected: { 2: { arrived: false, at: null, with: null } }, deltas: [] };
    await runExtraction(chat, 110, content, async () => JSON.stringify(answer));
    assert.equal(rec(chat[110]).extraction.status, 'applied');
    return { chat, before, card };
}
test('152 original T55/I109→I110: arrival expires the card, persists a foldable reply and permits the next actual input', async () => {
    const { chat, before, card } = await original();
    const folded = foldChat(chat);
    assert.deepEqual(folded.errors, []);
    assert.deepEqual(validateState(folded.state, content), []);
    assert.equal(folded.state.scene.at, 'loc.alderwatch.mests_smithy');
    assert.equal(money(folded.state), money(before));
    assert.equal(folded.state.decisions.some(d => d.id === card.id), false);
    assert.ok(rec(chat[110]).events.some(e => e.t === 'decision.closed' && e.d.id === card.id && e.d.status === 'expired'));
    assert.equal(rec(chat[110]).events.some(e => e.t === 'decision.opened' && e.d.decision?.route === 'free'), false);
    assert.equal(rec(chat[110]).events.some(e => e.t === 'coin.changed' || e.t === 'transaction.completed'), false);
    const restored = JSON.parse(JSON.stringify(chat));
    assert.deepEqual(foldChat(restored).state, folded.state);
    restored.push({ mes: f.next, is_user: true, extra: {} });
    const next = await prepareGenerationAsync(restored, content, { llm: async () => '{"commands":[]}', settings: { planner: true } });
    assert.equal(next.action, 'context');
    assert.equal(foldChat(restored).state.turn, before.turn + 1);
    assert.equal(money(foldChat(restored).state), money(before));
    chat.push({ mes: `#pay ${card.id}`, is_user: true, extra: {} });
    const refused = await prepareGenerationAsync(chat, content);
    assert.equal(refused.action, 'panels');
    assert.equal(money(foldChat(chat).state), money(before));
});
test('152 unconfirmed arrival leaves the original source card in place; a status panel does not expire it', async () => {
    const { chat, before, card } = await original(false);
    chat.push({ mes: '#status', is_user: true, extra: {} });
    await prepareGenerationAsync(chat, content);
    const folded = foldChat(chat);
    assert.deepEqual(folded.errors, []);
    assert.equal(folded.state.scene.at, before.scene.at);
    assert.deepEqual(folded.state.decisions.find(d => d.id === card.id), card);
    chat.push({ mes: `#pay ${card.id}`, is_user: true, extra: {} });
    await prepareGenerationAsync(chat, content);
    assert.equal(money(foldChat(chat).state), money(before) - 2);
});

async function pair() {
    const g = await campaign(content); g.contract = false;
    await walk(g, 'loc.alderwatch', { text: 'I enter the shop.', at: { new: { name: 'Porters shop', kind: 'site', parent: 'loc.alderwatch' } },
        deltas: ['Odo', 'Nell'].map((name, i) => ({ seq: i + 1, type: 'person.new', ref: name.toLowerCase(), name,
            role: 'porter', desc: ['porter'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' })), prose: 'He enters the shop. Odo and Nell wait beside him.' });
    const ids = ['Odo', 'Nell'].map(name => Object.values(g.state().entities).find(e => e.name === name).id);
    return { g, ids };
}
const pay = (to, n) => ({ type: 'pay', to, amount_cp: n, for: null, money: { quote: `${n} copper`, currency_quote: null }, recipient_quote: null });
test('152 two cards expire on arrival; reload preserves expiry and an unapplied alternate reply never debits', async () => {
    const { g, ids } = await pair(), before = money(g.state());
    await say(g, 'I give Odo 2 copper and Nell 3 copper, then leave for Alderwatch.', pay(ids[0], 2), pay(ids[1], 3), { type: 'go', to: 'loc.alderwatch' });
    const cards = g.state().decisions.filter(d => d.route === 'free'); assert.equal(cards.length, 2);
    await g.reply('Alaric leaves the shop and reaches Alderwatch.', { scene: 'loc.alderwatch', expected: { 3: { arrived: true, at: 'loc.alderwatch', with: null } }, deltas: [{ seq: 1, type: 'arrive', at: 'loc.alderwatch', with: null, forced_by: null }] });
    assert.deepEqual(foldChat(g.chat).errors, []);
    assert.equal(g.state().decisions.some(d => d.route === 'free'), false);
    assert.equal(money(g.state()), before);
    const id = g.chat.length - 1;
    let calls = 0;
    await runExtraction(g.chat, id, content, async () => { calls++; return '{}'; });
    assert.equal(calls, 0);
    g.chat = structuredClone(g.chat);
    g.chat[id].swipe_id = 1; g.chat[id].mes = 'An alternate description of the street.';
    assert.deepEqual(foldChat(g.chat).errors, []);
    assert.equal(money(g.state()), before);
    assert.equal(g.state().decisions.filter(d => d.route === 'free').length, 2, 'an unapplied alternate also undoes the arrival, leaving its original cards at the original place');
    Object.assign(g.chat[id], { mes: 'Alaric leaves the shop and reaches Alderwatch.', swipe_id: 0 });
    assert.equal(g.state().decisions.some(d => d.route === 'free'), false);
    for (const card of cards) { await say(g, `#pay ${card.id}`); assert.equal(money(g.state()), before); }
});
test('152 payment before departure remains once-only and actual source/confirmation edits remain blocked', async () => {
    const { g, ids } = await pair(), before = money(g.state());
    await say(g, 'I give Odo 2 copper.', pay(ids[0], 2));
    const source = g.chat.length - 1, card = g.state().decisions.find(d => d.route === 'free');
    await g.reply('Odo waits.', { expected: {}, deltas: [] });
    await say(g, `#pay ${card.id}`); const confirm = g.chat.findLastIndex(m => m.is_user);
    await say(g, `#pay ${card.id}`);
    await walk(g, 'loc.alderwatch', { text: 'I leave the shop.', at: 'loc.alderwatch', prose: 'He leaves the shop and reaches Alderwatch.' });
    assert.deepEqual(foldChat(g.chat).errors, []);
    assert.equal(money(g.state()), before - 2);
    for (const [id, text] of [[source, 'I give Odo nothing.'], [confirm, '#status']]) {
        const copy = structuredClone(g.chat); copy[id].mes = text; onEditedV4(copy, id);
        assert.ok(foldChat(copy).errors.length > 0);
        assert.equal(money(foldChat(copy).state), before);
    }
});
