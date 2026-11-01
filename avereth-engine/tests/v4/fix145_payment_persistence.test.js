import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk } from './patch8_lib.js';
import { foldChat, foldBlock, rec, turnBlock } from '../../src/host.js';
import { onEditedV4, prepareGenerationAsync } from '../../src/v4/runtime.js';

const content = await loadProductContent();
const coin = s => s.entities.pc.sheet.coin_cp;
async function payment() {
    const g = await campaign(content, { skills: 'Arcane Bolt + Arcane Ward' });
    g.contract = false;
    await walk(g, 'loc.alderwatch', { text: 'I enter the shop.', at: { new: { name: 'Odo shop', kind: 'site', parent: 'loc.alderwatch' } },
        deltas: [{ seq: 1, type: 'person.new', ref: 'odo', name: 'Odo', role: 'shopkeeper', desc: ['shopkeeper'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' }], prose: 'He enters. Odo looks up.' });
    const before = coin(g.state()), odo = Object.values(g.state().entities).find(e => e.name === 'Odo').id;
    const text = 'I leave five copper on the counter for Odo.';
    await say(g, text, { type: 'pay', to: odo, amount_cp: 5, for: null, quote: text, money: { quote: 'five copper', currency_quote: null }, recipient_quote: null });
    const source = g.chat.findLastIndex(m => m.is_user), card = g.state().decisions.find(d => d.route === 'free');
    await g.reply('Odo waits.', { expected: {}, deltas: [] });
    await say(g, `#pay ${card.id}`);
    const confirm = g.chat.findLastIndex(m => m.is_user);
    return { g, before, source, confirm, card };
}

for (const [name, target, text] of [
    ['source words', 'source', 'I give Odo nothing.'],
    ['confirmation to panel', 'confirm', '#status'],
    ['confirmation to another id', 'confirm', '#pay dec.pay.other'],
    ['confirmation to prose', 'confirm', 'I look at the counter.'],
]) test(`.145 real edit: ${name} invalidates the whole payment before any debit`, async () => {
    const { g, before, source, confirm } = await payment();
    const index = target === 'source' ? source : confirm, old = g.chat[index].mes;
    g.chat[index].mes = text;
    onEditedV4(g.chat, index); // actual UI handler; never mutate a stored event
    const folded = foldChat(g.chat);
    assert.ok(foldBlock(folded));
    assert.equal(coin(folded.state), before);
    assert.equal(folded.state.decisions.some(d => d.route === 'free'), target === 'confirm');
    const calls = [];
    g.chat.push({ mes: 'I look around.', is_user: true, extra: {} });
    const blocked = await prepareGenerationAsync(g.chat, content, { llm: async req => { calls.push(req); throw Error('must not call'); } });
    assert.equal(blocked.action, 'fold_blocked');
    assert.deepEqual(calls, []);
    assert.equal(rec(g.chat.at(-1)), undefined, 'no new authoritative record');
    g.chat.pop();
    g.chat[index].mes = old;
    onEditedV4(g.chat, index);
    assert.equal(foldBlock(foldChat(g.chat)), null, 'restoring the real text resumes without migration');
    assert.equal(coin(g.state()), before - 5);
    await say(g, '#bag');
    const text2 = 'I wait one minute.';
    const next = await say(g, text2, { type: 'activity', kind: 'wait', what: null, minutes: 1, until: null, quote: text2 });
    assert.equal(next.action, 'context', 'normal play resumes');
    await g.reply('Odo nods.', { expected: {}, deltas: [] });
    assert.equal(coin(g.state()), before - 5);
});

test('.145 deleting a source or snapshot failure never applies the later debit or transaction', async () => {
    const { g, before, source, confirm } = await payment();
    for (const mode of ['delete', 'snapshot']) {
        const chat = structuredClone(g.chat);
        if (mode === 'delete') chat.splice(source, 2);
        else rec(chat[source]).events.find(e => e.t === 'decision.opened' && e.d.decision.route === 'free').d.decision.amount_cp = 6;
        const folded = foldChat(chat);
        assert.ok(foldBlock(folded));
        assert.equal(coin(folded.state), before, mode);
        assert.ok(folded.failures[0].index <= confirm);
    }
});

test('.145 edit before confirmation is checked against actual text even without an edit notification', async () => {
    const { g, before, source, confirm } = await payment();
    g.chat.splice(confirm);
    g.chat[source].mes = 'I offer Odo fifty copper.';
    const cardId = rec(g.chat[source]).events.find(e => e.t === 'decision.opened' && e.d.decision.route === 'free').d.decision.id;
    const r = await say(g, `#pay ${cardId}`);
    assert.equal(r.action, 'fold_blocked');
    assert.equal(coin(foldChat(g.chat).state), before);
});

test('.145 ordinary reload, regeneration, panels and reply swipe keep one payment and allow play', async () => {
    const { g, before, confirm } = await payment();
    g.chat = structuredClone(g.chat);
    assert.equal(foldBlock(foldChat(g.chat)), null);
    assert.equal(coin(g.state()), before - 5);
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', llm: async () => { throw Error('no model'); } });
    assert.equal(r.action, 'abort', 'posted native record is reused');
    await say(g, '#status');
    const m = 'I wait one minute.';
    await say(g, m, { type: 'activity', kind: 'wait', what: null, minutes: 1, until: null, quote: m });
    await g.reply('Odo nods.', { expected: {}, deltas: [] });
    const reply = g.chat.at(-1), original = structuredClone(reply);
    reply.mes = 'Odo smiles.';
    reply.swipe_id = 1;
    assert.equal(foldBlock(foldChat(g.chat)), null);
    assert.equal(coin(g.state()), before - 5);
    Object.assign(reply, original);
    assert.equal(coin(g.state()), before - 5);
    assert.ok(rec(g.chat[confirm]).events.some(e => e.t === 'transaction.completed' && e.d.native));
});

test('.145 ST marks handled #pay user messages as system without invalidating their authority', async () => {
    const { g, before, confirm } = await payment();
    g.chat[confirm].is_system = true;
    assert.equal(foldBlock(foldChat(g.chat)), null);
    assert.equal(coin(g.state()), before - 5);
    const again = await say(g, g.chat[confirm].mes);
    assert.equal(again.action, 'panels');
    assert.equal(coin(g.state()), before - 5);
});

test('.145 an alternative extracted reply cannot replay payment to a departed NPC', async () => {
    const { g, before, source, confirm, card } = await payment();
    const tail = structuredClone(g.chat.slice(confirm));
    g.chat.splice(source + 1);
    await g.reply('Odo leaves the shop.', { expected: {}, deltas: [{ seq: 1, type: 'leave', who: card.seller }] });
    assert.equal(g.state().scene.present.includes(card.seller), false);
    g.chat.push(...tail);
    const f = foldChat(g.chat);
    assert.ok(foldBlock(f));
    assert.equal(coin(f.state), before);
});
