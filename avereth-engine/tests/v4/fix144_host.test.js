// .144 (finance simplification S1, patch_plans_10b/PATCH_FINANCE_SIMPLIFICATION.md §6 S1, §10.1): payment cards in the
// product host. Words make a card; only the player's own "#pay <id>" message pays it; the stored record, a reload,
// a deleted card message and the next narration agree with that.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk, outcomeOf } from './patch8_lib.js';
import { foldChat, foldBlock, rec, turnBlock } from '../../src/host.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const KEEPER = { seq: 1, type: 'person.new', ref: 'keeper', name: 'Odo', role: 'shopkeeper', desc: ['lean shopkeeper'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' };
const BOY = { seq: 2, type: 'person.new', ref: 'boy', name: 'Pip', role: 'errand boy', desc: ['errand boy'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' };
const coin = (g) => g.state().entities.pc.sheet.coin_cp;
const idOf = (g, name) => Object.keys(g.state().entities).find((id) => g.state().entities[id].name === name);
const cards = (g) => g.state().decisions.filter((d) => d.kind === 'payment' && d.state === 'needs_confirmation');
const PAY = (to, cp, quote, money, more = {}) => ({ type: 'pay', to, amount_cp: cp, for: null, quote, money: money ? { quote: money, currency_quote: null } : null, recipient_quote: null, ...more });

async function shop() {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    g.contract = false;
    await walk(g, 'loc.alderwatch', { text: '*i walk into town to the shop*', at: { new: { name: "Odo's Sundries", kind: 'site', parent: 'loc.alderwatch' } },
        deltas: [KEEPER, BOY], prose: 'He goes in. Odo looks up from the counter; a boy sweeps the floor.' });
    return g;
}
function reloaded(g) {
    const again = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(again, g.state());
    assert.deepEqual(validateState(again, content), []);
    return again;
}

test('.144 S1 host: a card is visible and unpaid; #pay pays it once without a story turn; the next narration knows it is done', async () => {
    const g = await shop();
    const before = coin(g), odo = idOf(g, 'Odo');
    const m = 'I leave five copper on the counter for Odo.';
    await say(g, m, PAY(odo, 5, m, 'five copper'));
    const card = cards(g)[0];
    assert.deepEqual([card.seller, card.amount_cp, card.route], [odo, 5, 'free']);
    assert.equal(coin(g), before);
    assert.match(outcomeOf(g).actions[0], new RegExp(`NOT PAID — payment card ${card.id.replace(/\./g, '\\.')}: .*Only the player's own message "#pay ${card.id.replace(/\./g, '\\.')}", sent on its own, pays exactly this`));
    await g.reply('Odo glances at the coins but leaves them lie.', { expected: {}, deltas: [] });
    const turn = g.state().turn;
    // #pay inside other words, or beside another command, pays nothing
    await say(g, `#status #pay ${card.id}`);
    assert.equal(coin(g), before);
    // his own #pay: paid once, no story turn, no model call
    const asked = [];
    const llm = g.llm;
    g.llm = async (req) => { asked.push(req.purpose); return llm(req); };
    const r = await say(g, `#pay ${card.id}`);
    assert.equal(r.action, 'panels');
    assert.match(r.panels.join('\n'), /PAID — 5 cp to Odo/);
    assert.deepEqual(asked, []);
    assert.equal(coin(g), before - 5);
    assert.equal(g.state().turn, turn, 'no story turn');
    // again: nothing more
    const again = await say(g, `#pay ${card.id}`);
    assert.match(again.panels.join('\n'), /NOT PAID — there is no open payment card/);
    assert.equal(coin(g), before - 5);
    reloaded(g);
    // the next story message: the narrator's engine block tells the handover as done, once
    g.chat.push({ mes: 'I nod to Odo and look at the lanterns.', is_user: true, is_system: false, extra: {} });
    const block = JSON.stringify(turnBlock(g.chat, g.chat.length - 1, content).context);
    assert.match(block, /PAID BEFORE THIS INPUT \(#pay dec\.pay\.t\d+\.1\): Alaric handed Odo 5 cp\. It is done/);
});

test('.144 S1 host: two people in one message get two cards, each paid by its own #pay; different payments to one person make no card', async () => {
    const g = await shop();
    const before = coin(g), odo = idOf(g, 'Odo'), pip = idOf(g, 'Pip');
    const m = 'I leave five copper for Odo and two copper for Pip on the counter.';
    await say(g, m, PAY(odo, 5, 'I leave five copper for Odo', 'five copper'), PAY(pip, 2, 'two copper for Pip on the counter', 'two copper'));
    assert.deepEqual(cards(g).map((d) => [d.seller, d.amount_cp]), [[odo, 5], [pip, 2]]);
    for (const d of cards(g)) await say(g, `#pay ${d.id}`);
    assert.equal(coin(g), before - 7);
    reloaded(g);
    await g.reply('They take the coins.', { expected: {}, deltas: [] });
    const c = 'I leave five copper for Odo, then three copper more for Odo.';
    await say(g, c, PAY(odo, 5, 'I leave five copper for Odo', 'five copper'), PAY(odo, 3, 'then three copper more for Odo', 'three copper'));
    assert.deepEqual(cards(g), []);
    assert.deepEqual(outcomeOf(g).resolutions.map((x) => x.status), ['pending', 'clarify']);
    assert.equal(coin(g), before - 7);
});

test('.144 S1 host: the card lapses with his next acting message; words never pay it', async () => {
    const g = await shop();
    const before = coin(g), odo = idOf(g, 'Odo');
    const m = 'I leave five copper on the counter for Odo.';
    await say(g, m, PAY(odo, 5, m, 'five copper'));
    const id = cards(g)[0].id;
    await g.reply('Odo waits.', { expected: {}, deltas: [] });
    await say(g, 'Yes, I pay him.', PAY(odo, 5, 'Yes, I pay him.', null));
    assert.equal(coin(g), before);
    const r = await say(g, `#pay ${id}`);
    assert.match(r.panels.join('\n'), /NOT PAID — there is no open payment card/);
    assert.equal(coin(g), before);
});

test('.144 S1 host: deleting the card message after #pay stops the fold instead of booking the old coin', async () => {
    const g = await shop();
    const odo = idOf(g, 'Odo');
    const m = 'I leave five copper on the counter for Odo.';
    await say(g, m, PAY(odo, 5, m, 'five copper'));
    const id = cards(g)[0].id;
    const at = g.chat.findLastIndex((x) => x.is_user && x.mes === m);
    await g.reply('Odo waits.', { expected: {}, deltas: [] });
    await say(g, `#pay ${id}`);
    assert.equal(foldBlock(foldChat(g.chat)), null);
    const edited = structuredClone(g.chat);
    edited.splice(at, 2); // his message with the card and the reply to it
    const block = foldBlock(foldChat(edited));
    assert.ok(block, 'the fold stops');
    assert.equal(block.type, 'decision.closed');
    assert.match(block.notice, /BLOCKED — the campaign record could not be rebuilt/);
    assert.ok(rec(g.chat.at(-2)).command);
});

test('.144 S1 host §6.4: two payments, a panel in between, then a story message: the next narration knows both handovers, once', async () => {
    const g = await shop();
    const odo = idOf(g, 'Odo'), pip = idOf(g, 'Pip');
    const m = 'I leave five copper for Odo and two copper for Pip on the counter.';
    await say(g, m, PAY(odo, 5, 'I leave five copper for Odo', 'five copper'), PAY(pip, 2, 'two copper for Pip on the counter', 'two copper'));
    await g.reply('They look at the coins.', { expected: {}, deltas: [] });
    for (const d of cards(g)) await say(g, `#pay ${d.id}`);
    await say(g, '#bag');
    g.chat.push({ mes: 'I nod to them both.', is_user: true, is_system: false, extra: {} });
    const block = JSON.stringify(turnBlock(g.chat, g.chat.length - 1, content).context);
    assert.equal((block.match(/PAID BEFORE THIS INPUT/g) || []).length, 2);
    assert.match(block, /Alaric handed Odo 5 cp/);
    assert.match(block, /Alaric handed Pip 2 cp/);
});

test('.144 S1 host §6.4: the same card id with other content after an edit (other words or amount) stops the fold before its coin', async () => {
    const g = await shop();
    const odo = idOf(g, 'Odo');
    const m = 'I leave five copper on the counter for Odo.';
    await say(g, m, PAY(odo, 5, m, 'five copper'));
    const id = cards(g)[0].id;
    const at = g.chat.findLastIndex((x) => x.is_user && x.mes === m);
    await g.reply('Odo waits.', { expected: {}, deltas: [] });
    await say(g, `#pay ${id}`);
    for (const change of [(d) => { d.source.input_hash = 'x0'; }, (d) => { d.amount_cp = 6; }]) {
        const edited = structuredClone(g.chat);
        // the card message as an edit re-resolved it: the same id dec.pay.t<turn>.<seq>, other source words or amount
        change(rec(edited[at]).events.find((e) => e.t === 'decision.opened' && e.d.decision.id === id).d.decision);
        const fold = foldChat(edited);
        const block = foldBlock(fold);
        assert.ok(block, 'the fold stops');
        assert.equal(block.type, 'decision.closed', 'at the close, before the coin of the payment');
    }
});
