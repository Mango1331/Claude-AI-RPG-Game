import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { applyWorld } from '../../src/v4/world.js';
import { acceptContract, goalText } from '../../src/v4/guild.js';
import { clearDone } from '../../src/v4/living.js';
import { applyEvent } from '../../src/state.js';
import { rec, setRec, foldChat } from '../../src/host.js';
import { evaluate } from '../../tools/st_live/live/evaluator.mjs';
import { campaign } from './patch8_lib.js';

const content = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/batch3_guild_purchase.json', import.meta.url)));
const A = 'quest.clear_mossback_warrens_level_1', B = A + '_3', HALL = 'loc.ashbridge.guild_hall';
const begin = x => playerTurnV4(structuredClone(x.state), content, x.player, { c: true, commands: structuredClone(x.commands), msg: x.index });
const finish = (x, t = begin(x)) => applyWorld(t.state, content, structuredClone(x.answer), { msg: x.index, prose: x.prose });
function commit(s, q) {
    const events = [], result = acceptContract(s, content, q, e => { events.push(e); applyEvent(s, e); }, { step: 1 });
    return { result, events };
}
function replay(s, events, expected) {
    const copy = structuredClone(s);
    for (const e of JSON.parse(JSON.stringify(events))) applyEvent(copy, e);
    assert.deepEqual(copy, expected);
}

test('Batch3 T150: another active Clear for the same canonical Dungeon/floor cannot be stacked', () => {
    const x = structuredClone(f.accept), r = begin(x);
    assert.equal(r.state.quests[A].status, 'active');
    assert.equal(r.state.quests[B].status, 'listed');
    assert.ok(r.outcome.actions.some(l => /already.*active|already holds/i.test(l)));
    assert.match(goalText(x.state, content, x.state.quests[B], { board: true }), /already.*active|already holds/i);
    assert.ok(!r.events.some(e => e.t === 'object.created' && e.d.object.for_quests?.includes(B)));
});

test('Batch3 Clear identity ignores title, branch and day, but allows a different floor', () => {
    const s = structuredClone(f.accept.state), q = s.quests[B];
    q.title = 'An entirely different notice'; q.source.branch = 'loc.another_city'; q.source.listed.day++;
    assert.equal(commit(s, q).result?.ok, false);
    q.clear.floor = 2;
    assert.notEqual(commit(s, q).result?.ok, false);
    assert.equal(q.status, 'active');
});

test('Batch3 conditional acceptance checks again after the authorized Guild arrival', () => {
    const x = structuredClone(f.accept); x.state.scene.at = 'loc.ashbridge.the_sows_rest';
    x.commands = [{ seq: 1, type: 'go', to: HALL, quote: 'I go to the Guild hall' },
        { seq: 2, type: 'quest.accept', quest: B, quote: 'accept the new Clear contract' }];
    x.player = 'I go to the Guild hall and accept the new Clear contract.';
    x.answer = { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null } },
        deltas: [{ seq: 1, type: 'arrive', at: HALL, with: null, forced_by: null }] };
    const t = begin(x), r = finish(x, t);
    assert.equal(r.state.scene.at, HALL); assert.equal(r.state.quests[B].status, 'listed');
    assert.ok(r.events.some(e => e.t === 'cmd.completed' && e.d.seq === 2 && e.d.ok === false));
    replay(x.state, [...t.events, ...r.events], r.state);
});

for (const status of ['completed', 'abandoned']) test(`Batch3 a ${status} Clear does not prohibit a new contract; old Clear credit is not reused`, () => {
    const s = structuredClone(f.payout.state); s.turn += 10;
    for (const q of Object.values(s.quests).filter(q => q.clear)) q.status = status;
    const q = { ...structuredClone(s.quests[B]), id: 'quest.new_clear', status: 'listed', history: [], taker: null };
    s.quests[q.id] = q;
    assert.notEqual(commit(s, q).result?.ok, false);
    assert.equal(clearDone(s, q).ok, false);
    const dungeon = s.dungeons[q.clear.dungeon];
    dungeon.clears.push({ floor: 1, cycle: dungeon.cycle + 1, credit: 'pc', turn: s.turn + 1 });
    assert.equal(clearDone(s, q).ok, true);
});

test('Batch3 Ruleset 1 acceptance is unchanged', () => {
    const s = structuredClone(f.accept.state); s.meta.ruleset = 1;
    assert.notEqual(commit(s, s.quests[B]).result?.ok, false);
    assert.equal(s.quests[B].status, 'active');
});

test('Batch3 T196: legacy active duplicates remain payable once, with quest-specific coin and XP tags', () => {
    const x = structuredClone(f.payout), t = begin(x), r = finish(x, t), events = [...t.events, ...r.events];
    assert.equal(r.state.quests[A].status, 'completed'); assert.equal(r.state.quests[B].status, 'completed');
    assert.deepEqual(events.filter(e => e.t === 'transaction.completed' && e.d.from === 'guild').map(e => [e.d.quest, e.d.cp]), [[A, 60], [B, 120]]);
    assert.deepEqual(events.filter(e => e.t === 'xp.changed' && e.d.reason.startsWith('Quest XP:')).map(e => [e.d.quest, e.d.amount]), [[A, 46], [B, 180]]);
    replay(x.state, events, r.state);
    const again = playerTurnV4(r.state, content, x.player, { c: true, commands: x.commands, msg: 600 });
    assert.ok(!again.events.some(e => e.t === 'coin.changed' || e.t === 'xp.changed'));
});

function manual(enter = true) {
    const x = structuredClone(f.manual);
    if (enter) {
        const stock = Object.values(x.state.offers).find(o => o.stock === 'manuals' && o.at === HALL && o.status === 'open');
        assert.ok(stock);
        x.answer.deltas.push({ seq: 3, type: 'enter', who: stock.seller, scene: HALL });
        x.answer.deltas.filter(d => d.type === 'fact').forEach(d => { d.seq = 4; });
    }
    return x;
}

test('Batch3 T153: original missing seller/offer books no purchase and explicitly says what is missing', () => {
    const x = manual(false), r = finish(x);
    assert.equal(r.state.entities.pc.sheet.coin_cp, x.state.entities.pc.sheet.coin_cp);
    assert.ok(!r.events.some(e => e.t === 'object.created' && /Primer of Mend/.test(e.d.object.name)));
    assert.match(JSON.stringify(r.system), /NOT BOUGHT.*Primer of Mend/i);
});

test('Batch3 arrival plus actual seller presence buys the canonical Primer once without a new narrated offer', () => {
    const x = manual(), t = begin(x), r = finish(x, t);
    const books = Object.values(r.state.objects).filter(o => o.name === 'Primer of Mend' && o.holder?.entity === 'pc');
    assert.equal(books.length, 1); assert.ok(books[0].profile);
    assert.equal(r.state.entities.pc.sheet.coin_cp, x.state.entities.pc.sheet.coin_cp - 120);
    assert.equal(r.events.filter(e => e.t === 'transaction.completed').length, 1);
    replay(x.state, [...t.events, ...r.events], r.state);
    const training = playerTurnV4(r.state, content, 'I study mend for two hours.', { c: true, commands: [
        { seq: 1, type: 'activity', kind: 'study', what: 'mend', learn: 'mend', minutes: 120, quote: 'I study mend for two hours.' },
    ] });
    assert.ok(training.events.some(e => e.t === 'growth.opened'));
});

for (const why of ['no arrival', 'wrong scene', 'too expensive', 'no funds', 'closed offer']) test(`Batch3 canonical purchase refuses ${why}`, () => {
    const x = manual();
    if (why === 'no arrival') { x.answer.deltas = x.answer.deltas.filter(d => d.type !== 'arrive'); x.answer.expected[1].arrived = false; }
    if (why === 'wrong scene') x.answer.deltas.find(d => d.type === 'enter').scene = x.state.scene.at;
    if (why === 'too expensive') x.commands.find(c => c.type === 'buy').max_cp = 119;
    if (why === 'no funds') x.state.entities.pc.sheet.coin_cp = 119;
    if (why === 'closed offer') Object.values(x.state.offers).filter(o => o.stock === 'manuals').forEach(o => { o.status = 'closed'; });
    const r = finish(x);
    assert.equal(r.state.entities.pc.sheet.coin_cp, x.state.entities.pc.sheet.coin_cp);
    assert.ok(!r.events.some(e => e.t === 'transaction.completed'));
});

async function report({ tagged = true, double = true } = {}) {
    const g = await campaign(content), entries = double ? [[A, 60, 46], [B, 120, 180]] : [[A, 60, 46]];
    const events = [];
    let coin = g.state().entities.pc.sheet.coin_cp;
    for (const [id, cp, xp] of entries) {
        events.push({ t: 'quest.created', d: { quest: { id, title: 'Same title', kind: 'guild_contract', status: 'active', payout_cp: cp, objectives: [] } } },
            { t: 'coin.changed', d: { id: 'pc', value: coin += cp, delta: cp, why: 'Guild payout: Same title' } },
            { t: 'transaction.completed', d: { to: 'pc', from: 'guild', cp, for: 'Same title', ...(tagged ? { quest: id } : {}) } },
            { t: 'xp.changed', d: { id: 'pc', xp, amount: xp, reason: 'Quest XP: Same title', ...(tagged ? { quest: id } : {}) } },
            { t: 'quest.status', d: { id, to: 'completed' } });
    }
    const m = { mes: 'Paid.', is_user: false, extra: {} }; setRec(m, { events }); g.chat.push(m);
    return evaluate(JSON.parse(JSON.stringify(g.chat)));
}

test('Batch3 evaluator attributes money and XP by Quest ID, including identical titles', async () => {
    const ev = await report();
    assert.deepEqual(ev.quests.filter(q => [A,B].includes(q.id)).map(q => [q.id, q.payout, q.xp]), [[A, 60, 46], [B, 120, 180]]);
});
test('Batch3 evaluator preserves unambiguous single legacy payout', async () => {
    const ev = await report({ tagged: false, double: false });
    assert.equal(ev.quests.find(q => q.id === A).payout, 60);
});
test('Batch3 evaluator does not assign a shared legacy total to each quest', async () => {
    const ev = await report({ tagged: false });
    for (const q of ev.quests.filter(q => [A,B].includes(q.id))) {
        assert.equal(q.payout, null); assert.equal(q.xp, null); assert.equal(q.payout_attribution, 'ambiguous');
    }
});

test('Batch3 two conditional acceptances of the same clearance book only the first', () => {
    const x = structuredClone(f.accept), C = 'quest.second_clear';
    x.state.quests[A].status = 'completed'; x.state.scene.at = 'loc.ashbridge.the_sows_rest';
    x.state.quests[C] = { ...structuredClone(x.state.quests[B]), id: C };
    Object.values(x.state.guild.boards).find(b => b.listings.includes(B)).listings.push(C);
    x.player = 'I go to the Guild hall and accept both posted Clear contracts.';
    x.commands = [{ seq: 1, type: 'go', to: HALL, quote: x.player },
        { seq: 2, type: 'quest.accept', quest: B, quote: x.player }, { seq: 3, type: 'quest.accept', quest: C, quote: x.player }];
    x.answer = { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null } },
        deltas: [{ seq: 1, type: 'arrive', at: HALL, with: null, forced_by: null }] };
    const r = finish(x);
    assert.equal(r.state.quests[B].status, 'active'); assert.equal(r.state.quests[C].status, 'listed');
});

test('Batch3 canonical purchase settles at an intermediate shop before a later authorized departure', () => {
    const x = manual(), inn = x.state.scene.at;
    x.player = 'I go to the Guild, buy the Primer of Mend for 120 cp, then return to the inn.';
    x.commands = [x.commands[0], x.commands[1], { seq: 3, type: 'go', to: inn, quote: x.player }];
    x.answer.scene = inn;
    for (const d of x.answer.deltas) d.scene = HALL;
    x.answer.deltas.push({ seq: 5, type: 'arrive', at: inn, with: null, forced_by: null, scene: inn });
    x.answer.expected[3] = { arrived: true, at: inn, with: null };
    const t = begin(x), r = finish(x, t);
    assert.equal(r.state.scene.at, inn);
    assert.equal(r.state.entities.pc.sheet.coin_cp, x.state.entities.pc.sheet.coin_cp - 120);
    assert.equal(r.events.filter(e => e.t === 'transaction.completed').length, 1);
    replay(x.state, [...t.events, ...r.events], r.state);
});

test('Batch3 narrated handover after a canonical purchase cannot create a second manual', () => {
    const x = manual(), seller = x.answer.deltas.find(d => d.type === 'enter').who;
    x.answer.deltas.push({ seq: 5, type: 'object.new', name: 'Primer of Mend', kind: 'document', holder: seller, qty: 1, unit: null, value_cp: 120, desc: [] },
        { seq: 6, type: 'object.move', object: { new: 'Primer of Mend' }, to: 'pc', qty: 1 });
    const r = finish(x);
    assert.equal(Object.values(r.state.objects).filter(o => o.name === 'Primer of Mend').length, 1);
    assert.equal(r.events.filter(e => e.t === 'transaction.completed').length, 1);
});
