// Runtime V4: the error clusters of the live runs V8–V12 and of P0 (docs/P0_BERICHT.md §5, §11), each as a turn
// through the product's host path. The interpreter is scripted to give the tempting wrong command (what an LLM did in
// P0/S1) or the right one; the extractor to give what a faithful reader of a contradicting reply reports. The engine
// (agency guard, handlers, firewall, world rules) decides.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { validateState } from '../../src/validate.js';

const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));
const T = (id) => gold.turns.find((t) => t.id === id);
const fill = (answer, expectedKeys = {}) => {
    const a = structuredClone(answer);
    for (const d of a.deltas || []) {
        const spec = content.deltaVocab.deltas.find((x) => x.type === d.type);
        for (const [k, f] of Object.entries(spec?.fields || {})) if (d[k] === undefined) d[k] = f.nullable ? null : k === 'count' ? 1 : d[k];
    }
    for (const [k, t] of Object.entries(expectedKeys)) if ((t === 'buy' || t === 'pay') && a.expected?.[k] && a.expected[k].taken_anyway === undefined) a.expected[k].taken_anyway = false;
    return a;
};

async function created() {
    const g = new Chat4(content, { listings: gold.board_generator.listings });
    const w = content.classes.get('warrior');
    await g.player('Warrior');
    await g.player(w.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    return g;
}

/** At the Guild hall of Redmarch with the clerk, the board generated (gold turn t1), optionally registered (t2, t3). */
async function atHall({ register = false } = {}) {
    const g = await created();
    for (const id of register ? ['t1', 't2', 't3'] : ['t1']) {
        const t = T(id);
        await g.player(t.player, t.commands);
        await g.reply('The story goes on.', fill(t.recovery, t.expected_keys));
    }
    return g;
}

const outcome = (g) => g.state().last.outcome;
const statuses = (g) => outcome(g).resolutions.map((r) => r.status);
const dropped = (g) => (outcome(g).dropped || []).map((d) => d.rule);

test('"I\'m here to register" at the roadside is a purpose, not a registration; "Register me" at the desk registers (pending the fee)', async () => {
    const g = await created();
    await g.player("Hello, I'm Alaric and I'm here to register with the adventurer guild *I say, smiling*", [{ seq: 1, type: 'guild.register', quote: "I'm here to register with the adventurer guild" }]);
    assert.deepEqual(outcome(g).resolutions, []);
    assert.deepEqual(dropped(g), ['purpose']);
    assert.match(outcome(g).actions[0], /^NOTHING TO BOOK/);
    const h = await atHall();
    await h.player('Register me, please.', [{ seq: 1, type: 'guild.register', quote: 'Register me, please.' }]);
    assert.deepEqual(statuses(h), ['pending']);
    assert.equal(h.state().offers['offer.registration'].lines[0].price_cp, 20, 'the canon fee, not a narrated price');
});

test('"I came here from the reedbeds" is no go; "I gave you the heads" is no give (memories, not decisions)', async () => {
    const g = await atHall();
    await g.player('I came here from the reedbeds this morning.', [{ seq: 1, type: 'go', to: { new: 'the reedbeds' }, quote: 'I came here from the reedbeds this morning.' }]);
    assert.deepEqual(outcome(g).resolutions, []);
    assert.deepEqual(dropped(g), ['retrospective']);
    await g.reply('The clerk nods.', fill({ expected: {}, deltas: [] }));
    await g.player('I gave you my pouch an hour ago.', [{ seq: 1, type: 'give', object: 'item.small_pouch', qty: null, to: 'npc.guild_clerk', quote: 'I gave you my pouch an hour ago.' }]);
    assert.deepEqual(outcome(g).resolutions, []);
    assert.deepEqual(dropped(g), ['retrospective']);
    assert.equal(g.state().entities.pc.sheet.inventory.small_pouch, 1, 'he still has it');
});

test('the clerk taking the basket is no turn-in of Alaric\'s; "Could I take the escort?" is no acceptance', async () => {
    const g = await atHall({ register: true });
    assert.match(g.calls.filter((c) => c.purpose === 'interpret').at(-1).messages[1].content, /npc\.guild_clerk \(Guild clerk/, 'the catalog names the clerk by the role the reply gave him');
    await g.player('*the clerk takes the basket from me and marks the herb run complete*', [{ seq: 1, type: 'quest.turn_in', quest: g.ids.get('quest.herb_run_marshmint'), quote: 'the clerk takes the basket from me and marks the herb run complete' }]);
    assert.deepEqual(outcome(g).resolutions, []);
    assert.deepEqual(dropped(g), ['npc_actor']);
    await g.reply('She raises an eyebrow.', fill({ expected: {}, deltas: [] }));
    const escort = g.ids.get('quest.millers_run_escort');
    await g.player("Could I take the Miller's Run escort?", [{ seq: 1, type: 'quest.accept', quest: escort, quote: "Could I take the Miller's Run escort?" }]);
    assert.deepEqual(outcome(g).resolutions, []);
    assert.deepEqual(dropped(g), ['question']);
    assert.equal(g.state().quests[escort].status, 'listed');
});

test('"register it" after taking the slip is one acceptance at the desk (with its contract slip); "leave the dead rats" is no drop', async () => {
    const g = await atHall({ register: true });
    const escort = g.ids.get('quest.millers_run_escort');
    await g.player("*I take the Miller's Run slip from the board and register it at the desk*", [{ seq: 1, type: 'quest.accept', quest: escort, quote: "I take the Miller's Run slip from the board and register it at the desk" }]);
    assert.deepEqual(statuses(g), ['resolved']);
    const s = g.state();
    assert.equal(s.quests[escort].status, 'active');
    assert.equal(s.objects[`obj.slip.${escort.replace(/^quest\./, '')}`].holder.entity, 'pc');
    await g.reply('The clerk stamps it.', fill({ expected: {}, deltas: [] }));
    // dead rats lying in the cellar are not his to drop
    const h = await atHall();
    h.chat.at(-1).extra.avereth.events.push({ t: 'object.created', d: { object: { id: 'obj.t6.dead_rats', name: 'dead rats', kind: 'trophy', stack: true, qty: 3, unit: null, holder: { loc: 'loc.redmarch.guild_hall' }, marks: [], for_quests: [], source: { turn: 1, how: 'story' } } } });
    await h.player('I leave the dead rats where they lie.', [{ seq: 1, type: 'drop', object: 'obj.t6.dead_rats', qty: null, quote: 'I leave the dead rats where they lie.' }]);
    assert.deepEqual(outcome(h).resolutions, [], 'the guard drops it: he does not hold them');
    assert.equal(h.state().objects['obj.t6.dead_rats'].holder.loc, 'loc.redmarch.guild_hall');
});

test('reading the board shows exactly the canonical listings; the narrator is told to invent no other', async () => {
    const g = await atHall({ register: true });
    await g.player('*i walk over to the board and look over the Novice contracts*', [{ seq: 1, type: 'board.read', rank: null, quote: 'i walk over to the board and look over the Novice contracts' }]);
    assert.deepEqual(statuses(g), ['resolved']);
    const line = outcome(g).actions[0];
    assert.match(line, /BOARD \(canonical; show exactly these, invent no other official contract\)/);
    const listed = Object.values(g.state().quests).filter((q) => q.status === 'listed');
    assert.equal(listed.length, 4, 'five were posted; the Weasel contract was taken by someone else in the reply to message 9');
    for (const q of listed) assert.ok(line.includes(`${q.title} · ${q.payout_cp} cp`), q.title);
    assert.ok(!line.includes('Weasel'));
});

test('the Guild\'s fee is no ordinary offer; the reeve paying the Guild reward is refused and corrected (firewall)', async () => {
    const g = await atHall();
    await g.player('Register me, please.', [{ seq: 1, type: 'guild.register', quote: 'Register me, please.' }]);
    const r = await g.reply('"Two silver," the clerk says. "The plate is included."', fill({ expected: {}, deltas: [
        { seq: 1, type: 'offer', seller: 'npc.guild_clerk', lines: [{ what: 'Guild registration with plate', kind: 'service', service: 'other', qty: 1, price_cp: 20 }] },
    ] }));
    assert.deepEqual(r.record.rejected.map((x) => x.rule), ['guild_canon_price']);
    assert.deepEqual(Object.values(g.state().offers).map((o) => o.id), ['offer.registration'], 'only the engine\'s canon offer');
    // the payout: a client pays a contract's reward in the story
    const h = await atHall({ register: true });
    const escort = h.ids.get('quest.millers_run_escort');
    await h.player("*I take the Miller's Run slip and have it logged*", [{ seq: 1, type: 'quest.accept', quest: escort, quote: "I take the Miller's Run slip and have it logged" }]);
    const coin = h.state().entities.pc.sheet.coin_cp;
    const p = await h.reply('An old miller presses eight silver into his hand for the escort.', fill({ expected: {}, deltas: [
        { seq: 1, type: 'person.new', ref: 'miller', name: 'Harrow', role: 'miller', desc: ['old'], present: true, at: null },
        { seq: 2, type: 'coin.gift', from: 'miller', cp: 80, why: "payment for the Miller's Run escort" },
    ] }));
    assert.deepEqual(p.record.rejected.map((x) => x.rule), ['guild_payout']);
    assert.equal(h.state().entities.pc.sheet.coin_cp, coin, 'no coin changed hands');
    assert.ok(p.record.corrections.some((c) => /paid only by the Guild/.test(c)));
});

test('a purchase or payment the reply has Alaric make without his agreement is overreach: not applied, corrected, shown', async () => {
    const g = await atHall({ register: true });
    await g.player('*i ask the woman behind the bar what a meal costs*', []);
    const coin = g.state().entities.pc.sheet.coin_cp;
    await g.reply('"Two copper," she says, and pushes a bowl at him. He eats.', fill({ expected: {}, deltas: [
        { seq: 1, type: 'person.new', ref: 'barwoman', name: null, role: 'woman behind the bar', desc: ['broad'], present: true, at: null },
        { seq: 2, type: 'offer', seller: 'barwoman', lines: [{ what: 'bowl of stew', kind: 'goods', service: 'meal', qty: 1, price_cp: 2 }] },
        { seq: 3, type: 'overreach', kind: 'purchase', what: 'ate the stew without agreeing to buy it' },
    ] }));
    assert.equal(g.state().entities.pc.sheet.coin_cp, coin);
    // expected: taken_anyway on an open purchase decision
    await g.player('I want a bath.', [{ seq: 1, type: 'buy', what: 'a bath', from: null, qty: null, max_cp: null, any_price: false, quote: 'I want a bath.' }]);
    assert.deepEqual(statuses(g), ['pending']);
    const r = await g.reply('He sinks into the tub she fills.', fill({ expected: { 1: { priced: false, taken_anyway: true } }, deltas: [] }));
    assert.ok(r.record.system.some((x) => x.startsWith('NOT APPLIED')));
    assert.ok(r.record.corrections.some((c) => /had Alaric decide something/.test(c)));
    assert.equal(g.state().entities.pc.sheet.coin_cp, coin);
});

test('a purchase agreed in advance ("if it\'s no more than 6 copper") is booked when the seller names a price within it', async () => {
    const g = await atHall({ register: true });
    await g.player("I'll take a bed if it's no more than 6 copper.", [{ seq: 1, type: 'buy', what: 'a bed for the night', from: null, qty: null, max_cp: 6, any_price: false, quote: "I'll take a bed if it's no more than 6 copper" }]);
    assert.deepEqual(statuses(g), ['conditional']);
    const coin = g.state().entities.pc.sheet.coin_cp;
    await g.reply('"A bed? Four copper," says the clerk.', fill({ expected: { 1: { priced: true, taken_anyway: false } }, deltas: [
        { seq: 1, type: 'offer', seller: 'npc.guild_clerk', lines: [{ what: 'bed in the Guild dormitory', kind: 'service', service: 'lodging', qty: 1, price_cp: 4 }] },
    ] }));
    const s = g.state();
    assert.equal(s.entities.pc.sheet.coin_cp, coin - 4);
    assert.ok((s.services || []).some((x) => x.service === 'lodging'));
    assert.deepEqual(s.decisions, []);
});

test('a sale with a lowest price is booked when the buyer pays at least that; a sale no price was agreed for is overreach', async () => {
    const g = await atHall();
    await g.player("I'll sell you my pouch, not under 3 copper.", [{ seq: 1, type: 'sell', object: 'item.small_pouch', qty: null, to: 'npc.guild_clerk', min_cp: 3, quote: "I'll sell you my pouch, not under 3 copper." }]);
    assert.deepEqual(statuses(g), ['conditional']);
    const coin = g.state().entities.pc.sheet.coin_cp;
    const r = await g.reply('"Three copper, then," says the clerk, and counts it out.', fill({ expected: { 1: { sold: true, price_cp: 3 } }, deltas: [] }));
    assert.equal(r.record.extraction.status, 'applied', 'the extractor can answer a sale (delta-0.3)');
    let s = g.state();
    assert.equal(s.entities.pc.sheet.coin_cp, coin + 3);
    assert.ok(!s.entities.pc.sheet.inventory.small_pouch, 'the pouch is gone');
    assert.deepEqual(s.decisions, []);
    const h = await atHall();
    await h.player('I want to sell my pouch.', [{ seq: 1, type: 'sell', object: 'item.small_pouch', qty: null, to: null, min_cp: null, quote: 'I want to sell my pouch.' }]);
    assert.deepEqual(statuses(h), ['pending']);
    const before = h.state().entities.pc.sheet.coin_cp;
    const x = await h.reply('The clerk pays him two copper for it without a word.', fill({ expected: { 1: { sold: true, price_cp: 2 } }, deltas: [] }));
    assert.ok(x.record.system.some((l) => l.startsWith('NOT APPLIED')), 'shown as not applied');
    s = h.state();
    assert.equal(s.entities.pc.sheet.coin_cp, before);
    assert.equal(s.entities.pc.sheet.inventory.small_pouch, 1);
    assert.deepEqual(validateState(s, content), []);
});

test('known refs are exact: an id the catalog does not have fails the schema and is repaired; the Guild hall named anew is the engine\'s node', async () => {
    const g = await created();
    await g.player('*i walk to the guild*', [{ seq: 1, type: 'go', to: 'loc.redmarch.guild_hall', quote: 'i walk to the guild' }]);
    // first answer: a rewritten id; the repair answers with a new place named like the hall
    let n = 0;
    const base = g.llm;
    g.llm = async (req) => {
        if (!req.purpose.startsWith('extract')) return base(req);
        n += 1;
        if (n === 1) return JSON.stringify({ expected: { 1: { arrived: true, at: 'loc.redmarch.guildhall' } }, deltas: [{ seq: 1, type: 'arrive', at: 'loc.redmarch.guildhall' }] });
        return JSON.stringify({ expected: { 1: { arrived: true, at: { new: { name: "Adventurers' Guild hall", kind: 'site', parent: 'loc.redmarch' } } } }, deltas: [{ seq: 1, type: 'arrive', at: { new: { name: "Adventurers' Guild hall", kind: 'site', parent: 'loc.redmarch' } } }] });
    };
    const r = await g.reply('He pushes open the Guild doors.');
    assert.equal(r.record.extraction.status, 'applied');
    assert.equal(r.record.extraction.repaired, true);
    const s = g.state();
    assert.equal(s.scene.at, 'loc.redmarch.guild_hall', 'the engine\'s hall node, not a second hall');
    assert.equal(Object.values(s.places).filter((p) => /guild hall/i.test(p.name) && p.parent === 'loc.redmarch').length, 1);
});

test('the story moves Alaric only after his own go; a new thing is his only after his take (firewall no_go, pc_inventory)', async () => {
    const g = await atHall();
    await g.player('*i look around the hall*', []);
    const r = await g.reply('He wanders out to the market and pockets a copper ring from a stall.', fill({ expected: {}, deltas: [
        { seq: 1, type: 'arrive', at: { new: { name: 'market square', kind: 'site', parent: 'loc.redmarch' } } },
        { seq: 2, type: 'object.new', name: 'copper ring', kind: 'item', qty: 1, unit: null, holder: 'pc', for_quest: null },
    ] }));
    assert.deepEqual(r.record.rejected.map((x) => x.rule).sort(), ['no_go', 'pc_inventory']);
    const s = g.state();
    assert.equal(s.scene.at, 'loc.redmarch.guild_hall');
    assert.ok(!Object.values(s.objects).some((o) => o.name === 'copper ring'));
    assert.deepEqual(validateState(s, content), []);
});
