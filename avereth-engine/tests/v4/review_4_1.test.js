// The independent review of 4.1.0 (ChatGPT, 30.09.2026), each counterexample reproduced on 4.1.0 and fixed in 4.1.1
// (docs/INTEGRATION_4_1.md §7): coin the story gives Alaric (who hands it over, whether he took it, whether the engine
// booked it already), the quantities of purchases and sales, the journey he has actually begun, the kind a hunting
// contract names, and the escort readiness after a refused arrival. Each finding has its positive and negative cases.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { buildCatalog, journeyReady } from '../../src/v4/catalog.js';
import { catalogText, parseInterpretation } from '../../src/v4/interpret.js';
import { deltaVocabularyText } from '../../src/v4/extract.js';
import { linePrice, pickLines } from '../../src/v4/trade.js';
import { isLooseCoin } from '../../src/v4/domain.js';

const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));
const deltasVocab = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/deltas.json'), 'utf8'));
const commandsVocab = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/commands.json'), 'utf8'));

async function created() {
    const g = new Chat4(content, { listings: gold.board_generator.listings });
    const warrior = content.classes.get('warrior');
    await g.player('Warrior');
    await g.player(warrior.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    return g.state();
}
const base = await created();

const NOBODY = { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] };
/** The state after a player turn whose outcome authorised `auth` (the rest of state.last as the engine keeps it). */
function after(state, { auth = {}, expected_keys = {}, booked = NOBODY, resolutions = [] } = {}) {
    const s = structuredClone(state);
    s.last = { ...s.last, input: 'x', outcome: { kind: 'v4', actions: [], extra: [], resolutions, expected_keys, conditionals: [], booked, search_checks: [], check_die: null,
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120, ...auth } } };
    return s;
}
/** Resolve player commands on a copy: the state after them, their context and events. */
function play(state, commands) {
    const s = structuredClone(state);
    const events = [];
    const ctx = resolveCommands(s, content, commands, (e) => { applyEvent(s, e); events.push(e); });
    return { s, ctx, events, after: (extra = {}) => after(s, { auth: ctx.auth, expected_keys: ctx.expectedKeys, booked: ctx.booked, resolutions: ctx.resolutions, ...extra }) };
}
function person(s, id, role, extra = {}) {
    s.entities[id] = { id, kind: 'npc', name: null, descriptors: [role], traits: role, status: 'alive', location: s.scene.location, at: s.scene.at, created: { turn: s.turn, minute: s.clock.minute }, source: { kind: 'narration' }, card: {}, template: 'commoner', ...extra };
    if (extra.status !== 'dead' && !s.scene.present.includes(id)) s.scene.present.push(id);
    return s;
}
const coin = (s) => s.entities.pc.sheet.coin_cp;
const rules = (r) => r.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule);
const gift = (from, cp, why = 'coin') => ({ seq: 1, type: 'coin.gift', from, cp, why });
const held = (s) => Object.values(s.objects).filter((o) => o.holder?.entity === 'pc').map((o) => [o.name, o.qty]);
const TAKE = (name) => ({ auth: { take: [1], takeNames: { 1: name } }, expected_keys: { 1: 'take' } });

// ------------------------------------------------------------------------------------------------ 1. coin.gift
test('coin: a living person here may give Alaric coin of their own will; the story alone never puts other coin in his purse', () => {
    const s = person(structuredClone(base), 'npc.farmer', 'grateful farmer');
    const given = applyWorld(after(s), content, { expected: {}, deltas: [gift('npc.farmer', 5, 'thanks for the help')] }, { msg: 9 });
    assert.equal(coin(given.state), coin(s) + 5, 'a voluntary gift stays possible');
    for (const from of ['the counter', 'the dead bandit\'s purse', 'a chest under the bed']) {
        const r = applyWorld(after(s), content, { expected: {}, deltas: [gift(from, 14, 'he pockets the coins')] }, { msg: 9 });
        assert.equal(coin(r.state), coin(s), from);
        assert.deepEqual(rules(r), ['pc_inventory'], from);
        assert.ok(r.corrections.some((c) => /purse did not change: the 14 cp/.test(c)), 'the next block tells the narrator');
    }
    // a gift from someone who is not here, or dead, is no hand-over either
    const gone = person(structuredClone(base), 'npc.bandit', 'bandit', { status: 'dead' });
    assert.deepEqual(rules(applyWorld(after(gone), content, { expected: {}, deltas: [gift('npc.bandit', 14)] }, { msg: 9 })), ['pc_inventory']);
});

test('coin: loot is his when he takes it (a TAKE the reply carried out, or a search); not when the take failed', () => {
    const s = person(structuredClone(base), 'npc.bandit', 'bandit', { status: 'dead' });
    const loot = [gift('npc.bandit', 14, 'coins from the dead bandit\'s purse')];
    const took = applyWorld(after(s, TAKE('the bandit\'s coins')), content, { expected: { 1: { taken: true } }, deltas: loot }, { msg: 9 });
    assert.equal(coin(took.state), coin(s) + 14);
    assert.deepEqual(held(took.state), [], 'the coins he took are no object besides');
    const missed = applyWorld(after(s, TAKE('the bandit\'s coins')), content, { expected: { 1: { taken: false } }, deltas: loot }, { msg: 9 });
    assert.equal(coin(missed.state), coin(s), 'the reply says he did not get it');
    const searched = applyWorld(after(s, { auth: { gather: true, roam: true } }), content, { expected: {}, deltas: loot }, { msg: 9 });
    assert.equal(coin(searched.state), coin(s) + 14, 'searching the body turns it up');
    // he takes a purse that lies here (a known thing: booked at once) and empties it
    const purse = structuredClone(s);
    purse.objects['obj.purse'] = { id: 'obj.purse', name: 'a leather purse', kind: 'item', stack: false, qty: 1, unit: null, holder: { loc: purse.scene.at }, marks: [], for_quests: [], source: {} };
    const pick = play(purse, [{ seq: 1, type: 'take', object: 'obj.purse', qty: null, quote: 'I take the purse' }]);
    assert.equal(pick.ctx.resolutions[0].status, 'resolved');
    const emptied = applyWorld(pick.after(), content, { expected: {}, deltas: [gift('the purse', 6, 'six copper inside')] }, { msg: 9 });
    assert.equal(coin(emptied.state), coin(purse) + 6, 'a take the engine booked at once counts as his taking');
    // a man the story killed (his status a fact) hands nobody anything
    const slain = person(structuredClone(base), 'npc.thug', 'thug');
    const dead = applyWorld(after(slain), content, { expected: {}, deltas: [{ seq: 1, type: 'fact', s: 'npc.thug', p: 'status', o: 'dead' }, { ...gift('npc.thug', 5), seq: 2 }] }, { msg: 9 });
    assert.equal(coin(dead.state), coin(slain), 'the dead man\'s coin is loot, not a gift');
    assert.deepEqual(rules(dead), ['pc_inventory'], 'the fact made him dead; the coin was refused as untaken loot');
});

test('coin: the payout the Guild just booked is counted out on the counter; pocketing it is the same coin, the next turn too', () => {
    const s = structuredClone(base);
    s.scene.at = 'loc.tidecross.guild_hall';
    s.scene.location = 'loc.tidecross';
    s.guild.membership = { rank: 'Novice', since: { turn: 1, minute: 0 }, branch: 'loc.tidecross' };
    s.quests['quest.cart'] = { id: 'quest.cart', title: 'Shepherd Cart to Millbrook', kind: 'guild_contract', status: 'active', ready: true, rank: 'Novice', level: 2, qtype: 'standard', payout_cp: 90, client: 'Aldsa Corren', objectives: [], proof: [], history: [], details: [], notes: [], source: { branch: 'loc.tidecross' } };
    const turnIn = play(s, [{ seq: 1, type: 'quest.turn_in', quest: 'quest.cart', quote: 'I turn it in' }]);
    assert.equal(coin(turnIn.s), coin(s) + 90);
    assert.deepEqual(turnIn.s.credits.map((c) => [c.cp, c.at]), [[90, 'loc.tidecross.guild_hall']], 'the engine keeps its credit');
    // the same reply: the clerk slides it over, the extractor calls the counter the giver
    const same = applyWorld(turnIn.after(), content, { expected: {}, deltas: [gift('the counter', 90, 'Alaric pockets the coins from the counter')] }, { msg: 62 });
    assert.equal(coin(same.state), coin(s) + 90);
    // the next turn: "I take the copper" — authorised, the coin is his already
    const take = play(same.state, [{ seq: 1, type: 'take', object: { new: 'the copper' }, qty: null, quote: 'i take the copper' }]);
    assert.equal(take.ctx.resolutions[0].status, 'authorized');
    const next = applyWorld(take.after(), content, { expected: { 1: { taken: true } }, deltas: [gift('the counter', 90, 'the copper counted out on the counter')] }, { msg: 64 });
    assert.equal(coin(next.state), coin(s) + 90, 'the payout is credited once');
    assert.deepEqual(rules(next), ['engine_booked']);
    assert.deepEqual(held(next.state), [], 'and no phantom copper');
    // the clerk herself is the Guild (unchanged)
    assert.deepEqual(rules(applyWorld(turnIn.after(), content, { expected: {}, deltas: [gift('the Guild clerk', 90, 'the reward for the escort')] }, { msg: 62 })), ['guild_payout']);
    // coin he loots elsewhere that day is new coin
    const road = structuredClone(next.state);
    road.scene.at = 'loc.redmarch.verge';
    const loot = applyWorld(after(road, TAKE('the coins')), content, { expected: { 1: { taken: true } }, deltas: [gift('the ditch', 3, 'coins in the ditch')] }, { msg: 70 });
    assert.equal(coin(loot.state), coin(road) + 3);
});

test('coin: the other side of a trade the engine books does not give him coin (a sale\'s price, a purchase\'s change); change for a payment of his own amount does', () => {
    // a sale: the price comes from the sale, not a second time from the buyer
    const s = person(structuredClone(base), 'npc.tanner', 'tanner');
    s.objects['obj.pelt'] = { id: 'obj.pelt', name: 'wolf pelt', kind: 'item', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: {} };
    s.entities.pc.sheet.inventory['obj.pelt'] = 1;
    const sell = play(s, [{ seq: 1, type: 'sell', object: 'obj.pelt', qty: null, to: 'npc.tanner', min_cp: 20, quote: 'not under 20' }]);
    const sold = applyWorld(sell.after(), content, { expected: { 1: { sold: true, price_cp: 25 } }, deltas: [gift('npc.tanner', 25, 'payment for the pelt')] }, { msg: 9 });
    assert.equal(coin(sold.state), coin(s) + 25);
    assert.deepEqual(rules(sold), ['engine_booked']);
    // someone else here is no party to that sale
    person(s, 'npc.child', 'tanner\'s daughter');
    const tip = applyWorld(play(s, [{ seq: 1, type: 'sell', object: 'obj.pelt', qty: null, to: 'npc.tanner', min_cp: 20, quote: 'not under 20' }]).after(), content, { expected: { 1: { sold: false, price_cp: null } }, deltas: [gift('npc.child', 1, 'a copper for the story')] }, { msg: 9 });
    assert.equal(coin(tip.state), coin(s) + 1);
    // a purchase: he paid exactly the price; "change" from the seller is not a gift
    const v = person(structuredClone(base), 'npc.vendor', 'water vendor');
    v.offers['offer.w'] = { id: 'offer.w', seller: 'npc.vendor', at: v.scene.at, status: 'open', canon: false, turn: v.turn, lines: [{ id: 'l1', what: 'water flask', kind: 'goods', service: null, qty: 1, price_cp: 3 }] };
    const bought = play(v, [{ seq: 1, type: 'offer.accept', offer: 'offer.w', lines: ['l1'], qty: null, quote: 'here is a silver' }]);
    const change = applyWorld(bought.after(), content, { expected: {}, deltas: [gift('npc.vendor', 7, 'his change')] }, { msg: 9 });
    assert.equal(coin(change.state), coin(v) - 3);
    assert.deepEqual(rules(change), ['engine_booked']);
    // a payment of an amount he chose (a silver for a 1 cp toll): the change is real coin back
    const paid = play(v, [{ seq: 1, type: 'pay', to: 'npc.vendor', amount_cp: 10, for: 'the toll', quote: 'i give him one silver waiting for my change' }]);
    const back = applyWorld(paid.after(), content, { expected: {}, deltas: [gift('npc.vendor', 9, 'change from the silver')] }, { msg: 9 });
    assert.equal(coin(back.state), coin(v) - 1);
});

test('coin: "the bandit\'s coins", "the silver on the counter" are loose coin; a purse or a pouch of coins is a thing', () => {
    for (const t of ['the bandit\'s coins', 'the dead man\'s silver', 'the silver on the counter', 'coins from the chest', 'a pile of coins', '14 copper']) assert.equal(isLooseCoin(t), true, t);
    for (const t of ['a coin purse', 'his purse', 'a pouch of coins', 'the loot', 'Tomas\' purse']) assert.equal(isLooseCoin(t), false, t);
});

// ------------------------------------------------------------------------------------------------ 2./3. trade
function vendor(lines) {
    const s = person(structuredClone(base), 'npc.vendor', 'water vendor');
    s.offers['offer.w'] = { id: 'offer.w', seller: 'npc.vendor', at: s.scene.at, status: 'open', canon: false, turn: s.turn, lines: lines.map((l, i) => ({ id: `l${i + 1}`, kind: 'goods', service: null, ...l })) };
    return s;
}
const buy = (extra) => ({ seq: 1, type: 'buy', what: 'water flask', from: 'npc.vendor', qty: null, max_cp: null, any_price: false, quote: 'water', ...extra });
const accept = (extra) => ({ seq: 1, type: 'offer.accept', offer: 'offer.w', lines: ['l1'], qty: null, quote: 'deal', ...extra });

test('purchase: the number he names is bought and paid, by buy and by offer.accept; his limit holds for that total', () => {
    const s = vendor([{ what: 'water flask', qty: 1, price_cp: 3 }]);
    for (const cmd of [buy({ qty: 3 }), accept({ qty: 3 })]) {
        const r = play(s, [cmd]);
        assert.equal(r.ctx.resolutions[0].status, 'resolved', cmd.type);
        assert.equal(coin(r.s), coin(s) - 9, `${cmd.type}: 3 × 3 cp`);
        assert.deepEqual(held(r.s), [['water flask', 3]], `${cmd.type}: three flasks`);
        assert.match(r.ctx.actions[0], /3 water flask for 9 cp/);
    }
    const one = play(s, [accept()]);
    assert.deepEqual([coin(s) - coin(one.s), held(one.s)], [3, [['water flask', 1]]], 'no number: the line as offered');
    const limit = play(s, [buy({ qty: 3, max_cp: 8 })]);
    assert.deepEqual([limit.ctx.resolutions[0].status, coin(limit.s)], ['refused', coin(s)], 'the limit is checked against what he would pay');
    assert.match(limit.ctx.actions[0], /costs 9 cp, more than the 8 cp/);
    const poor = structuredClone(s);
    poor.entities.pc.sheet.coin_cp = 8;
    const broke = play(poor, [accept({ qty: 3 })]);
    assert.deepEqual([broke.ctx.resolutions[0].reason, coin(broke.s), held(broke.s)], ['not enough coin', 8, []]);
});

test('purchase: an offer line may be a lot ("three for nine"); a part of it only at a whole price per piece; several lines with one number is a question', () => {
    assert.deepEqual(linePrice({ what: 'flask', qty: 3, price_cp: 9 }), { units: 3, cp: 9 });
    assert.deepEqual(linePrice({ what: 'flask', qty: 3, price_cp: 9 }, 6), { units: 6, cp: 18 });
    assert.deepEqual(linePrice({ what: 'flask', qty: 3, price_cp: 9 }, 2), { units: 2, cp: 6 });
    assert.ok(linePrice({ what: 'arrows', qty: 20, price_cp: 5 }, 10).error, 'no guessed price for half a bundle');
    assert.deepEqual(linePrice({ what: 'arrows', qty: 20, price_cp: 5 }, 40), { units: 40, cp: 10 });
    const s = vendor([{ what: 'water flask', qty: 3, price_cp: 9 }, { what: 'arrows', qty: 20, price_cp: 5 }]);
    const lot = play(s, [accept()]);
    assert.deepEqual([coin(s) - coin(lot.s), held(lot.s)], [9, [['water flask', 3]]], 'the lot as offered, once, not 3 × 9');
    const three = play(s, [buy({ qty: 3 })]);
    assert.deepEqual([coin(s) - coin(three.s), held(three.s)], [9, [['water flask', 3]]], 'three of a three-for-nine line is that line');
    const half = play(s, [accept({ lines: ['l2'], qty: 10 })]);
    assert.deepEqual([half.ctx.resolutions[0].status, coin(half.s)], ['refused', coin(s)]);
    assert.match(half.ctx.actions[0], /arrows is sold 20 for 5 cp/);
    assert.equal(pickLines(s.offers['offer.w'], null, 2).clarify.length, 2);
    const which = play(s, [accept({ lines: null, qty: 2 })]);
    assert.equal(which.ctx.resolutions[0].status, 'clarify');
    assert.match(buildCatalog(s, content).offers[0].lines.map((l) => catalogText({ here: {}, offers: [{ id: 'offer.w', seller: 'x', lines: [l] }] })).join(), /l1 water flask 3 for 9 cp/);
});

test('purchase: a purchase agreed in advance (a limit, no price yet) books the number he named when the reply names the price', () => {
    const s = person(structuredClone(base), 'npc.vendor', 'water vendor');
    const ask = play(s, [buy({ qty: 3, max_cp: 10 })]);
    assert.equal(ask.ctx.resolutions[0].status, 'conditional');
    const offer = { seq: 1, type: 'offer', seller: 'npc.vendor', lines: [{ what: 'water flask', kind: 'goods', service: null, qty: 1, price_cp: 3 }] };
    const r = applyWorld(ask.after(), content, { expected: { 1: { priced: true, taken_anyway: false } }, deltas: [offer] }, { msg: 9 });
    assert.deepEqual([coin(s) - coin(r.state), held(r.state)], [9, [['water flask', 3]]]);
    const dear = play(s, [buy({ qty: 3, max_cp: 8 })]);
    const no = applyWorld(dear.after(), content, { expected: { 1: { priced: true, taken_anyway: false } }, deltas: [offer] }, { msg: 9 });
    assert.deepEqual([coin(no.state), held(no.state)], [coin(s), []], '9 cp is above his limit of 8');
    assert.ok(no.system.some((x) => /NOT BOUGHT — 3 water flask: 9 cp is above his limit of 8 cp/.test(x)));
});

test('purchase: an interpreter answer may leave out offer.accept\'s qty (null), as every nullable argument', () => {
    const catalog = buildCatalog(vendor([{ what: 'water flask', qty: 1, price_cp: 3 }]), content);
    const p = parseInterpretation(JSON.stringify({ commands: [{ seq: 1, type: 'offer.accept', offer: 'offer.w', quote: 'deal' }] }), commandsVocab, catalog);
    assert.deepEqual(p.errors, []);
    assert.deepEqual([p.commands[0].lines, p.commands[0].qty], [null, null]);
    const bad = parseInterpretation(JSON.stringify({ commands: [{ seq: 1, type: 'offer.accept', offer: 'offer.w', lines: null, qty: 0, quote: 'deal' }] }), commandsVocab, catalog);
    assert.ok(bad.errors.length, 'a given qty is still checked');
});

function herbs(qty, template = false) {
    const s = person(structuredClone(base), 'npc.herbalist', 'herbalist');
    if (template) s.entities.pc.sheet.inventory.torch = qty;
    else {
        s.objects['obj.herb'] = { id: 'obj.herb', name: 'marsh herb', kind: 'resource', stack: true, qty, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: {} };
        s.entities.pc.sheet.inventory['obj.herb'] = qty;
    }
    return s;
}
const sell = (object, extra) => ({ seq: 1, type: 'sell', object, qty: null, to: 'npc.herbalist', min_cp: null, quote: 'I sell', ...extra });
const buyerHolds = (s) => Object.values(s.objects).filter((o) => o.holder?.entity === 'npc.herbalist').map((o) => [o.name, o.qty]);

test('sale: never more than he holds; a part of a stack leaves him and the rest stays; he is paid the agreed price once', () => {
    const one = play(herbs(1), [sell('obj.herb', { qty: 10, min_cp: 5 })]);
    assert.deepEqual([one.ctx.resolutions[0].status, one.s.decisions.length], ['refused', 0]);
    assert.match(one.ctx.actions[0], /CANNOT SELL — 10 marsh herb: he holds only 1/);
    const s = herbs(10);
    const part = play(s, [sell('obj.herb', { qty: 4, min_cp: 8 })]);
    assert.match(part.ctx.actions[0], /SELLS — 4 marsh herb to the herbalist if the buyer pays at least 8 cp/);
    const r = applyWorld(part.after(), content, { expected: { 1: { sold: true, price_cp: 9 } }, deltas: [] }, { msg: 9 });
    assert.deepEqual(held(r.state), [['marsh herb', 6]]);
    assert.deepEqual(buyerHolds(r.state), [['marsh herb', 4]]);
    assert.equal(coin(r.state), coin(s) + 9);
    assert.equal(r.state.entities.pc.sheet.inventory['obj.herb'], 6);
    // no number: the thing as he holds it (as before)
    const all = applyWorld(play(s, [sell('obj.herb', { min_cp: 8 })]).after(), content, { expected: { 1: { sold: true, price_cp: 20 } }, deltas: [] }, { msg: 9 });
    assert.deepEqual([held(all.state), buyerHolds(all.state)], [[], [['marsh herb', 10]]]);
    // below his price: nothing moves
    const cheap = applyWorld(part.after(), content, { expected: { 1: { sold: true, price_cp: 5 } }, deltas: [] }, { msg: 9 });
    assert.deepEqual([held(cheap.state), coin(cheap.state)], [[['marsh herb', 10]], coin(s)]);
});

test('sale: a sheet item sells in whole units he has, never below zero; what left him before the sale is not sold', () => {
    const torches = herbs(2, true);
    const five = play(torches, [sell('item.torch', { qty: 5, min_cp: 1 })]);
    assert.equal(five.ctx.resolutions[0].status, 'refused');
    const two = play(torches, [sell('item.torch', { qty: 2, min_cp: 1 })]);
    const r = applyWorld(two.after(), content, { expected: { 1: { sold: true, price_cp: 2 } }, deltas: [] }, { msg: 9 });
    assert.equal(r.state.entities.pc.sheet.inventory.torch, undefined);
    assert.equal(coin(r.state), coin(torches) + 2);
    // the herbs went elsewhere before the reply sold them: no sale, no coin
    const s = herbs(4);
    const offered = play(s, [sell('obj.herb', { qty: 4, min_cp: 4 })]);
    const gone = offered.after();
    gone.objects['obj.herb'].holder = { loc: gone.scene.at };
    delete gone.entities.pc.sheet.inventory['obj.herb'];
    const none = applyWorld(gone, content, { expected: { 1: { sold: true, price_cp: 6 } }, deltas: [] }, { msg: 9 });
    assert.equal(coin(none.state), coin(s));
    assert.ok(none.system.some((x) => /NOT SOLD — marsh herb/.test(x)));
});

// ------------------------------------------------------------------------------------------------ 4. journey
function contract(s, id, title, verb = 'ESCORT') {
    s.quests[id] = { id, title, kind: 'guild_contract', status: 'active', rank: 'Novice', level: 2, qtype: 'standard', payout_cp: 90, client: 'a client', desired_end_state: `${title} is done`, details: [], notes: [], history: [], proof: [], objectives: [{ id: 'o1', verb, what: title, qty: 1, unit: null, where: 'Millbrook', status: 'open' }], source: { board: 'loc.redmarch.guild_hall', branch: 'loc.redmarch' } };
    return s;
}
const at = (s, place, location) => { s.scene.at = place; s.scene.location = location; s.scene.present = ['pc']; return s; };
const TRAVEL = { go: { seq: 1 }, gos: [{ seq: 1, to: null, name: 'somewhere' }], roam: true, timeCap: 720 };

test('journey: an accepted escort or delivery is no journey until he sets off on it; alone in another town, "we go on" continues nothing', () => {
    const s = contract(contract(structuredClone(base), 'quest.cart', 'Shepherd Cart to Millbrook'), 'quest.parcel', 'Parcel to Ashbridge', 'DELIVER');
    for (const [place, location] of [['loc.tidecross', 'loc.tidecross'], ['realm.veyrhold', 'realm.veyrhold']]) {
        const alone = at(structuredClone(s), place, location);
        assert.equal(journeyReady(alone), null, place);
        assert.equal(buildCatalog(alone, content).journey_ready, undefined);
        assert.equal(play(alone, [{ seq: 1, type: 'journey.continue', quote: 'we go on' }]).ctx.resolutions[0].status, 'refused');
    }
});

test('journey: it begins when he agrees to continue it, or sets off with its people and leaves the town; then nobody of it need be present', () => {
    const s = person(contract(structuredClone(base), 'quest.cart', 'Shepherd Cart to Millbrook'), 'npc.driver', 'wool cart driver');
    s.quests['quest.cart'].notes = ['Alaric walks beside the wool cart driver on the river road'];
    assert.equal(journeyReady(s)?.contact, 'npc.driver', 'the story path: its people are here');
    // a GO inside the town while they are here starts nothing
    const inn = play(s, [{ seq: 1, type: 'go', to: 'loc.redmarch.guild_hall', quote: 'I go to the hall first' }]);
    assert.equal(inn.ctx.auth.journey, 'quest.cart');
    const hall = applyWorld(inn.after(), content, { expected: { 1: { arrived: true, at: 'loc.redmarch.guild_hall', with: null } }, deltas: [] }, { msg: 9 });
    assert.equal(hall.state.scene.at, 'loc.redmarch.guild_hall');
    assert.equal(hall.state.quests['quest.cart'].journey, undefined);
    assert.equal(journeyReady(hall.state), null, 'and alone at the hall there is no journey');
    // a GO with them that leaves the town begins it
    const road = play(s, [{ seq: 1, type: 'go', to: { new: 'the river road' }, quote: 'we set off' }]);
    const ford = applyWorld(road.after(), content, { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: { new: { name: 'Ford Narrows', kind: 'wilderness', parent: 'realm.veyrhold' } }, forced_by: null, with: null }] }, { msg: 9 });
    assert.deepEqual(ford.state.quests['quest.cart'].journey, { since: s.turn, from: 'loc.redmarch.verge' });
    assert.deepEqual(ford.state.scene.present, ['pc']);
    assert.equal(journeyReady(ford.state)?.id, 'quest.cart');
    assert.equal(play(ford.state, [{ seq: 1, type: 'journey.continue', quote: 'we go on' }]).ctx.resolutions[0].status, 'authorized');
    // his agreement to continue it begins it too
    const agreed = play(s, [{ seq: 1, type: 'journey.continue', quote: 'let us go' }]);
    assert.equal(agreed.s.quests['quest.cart'].journey.since, s.turn);
    // reached: nothing left to continue
    const done = structuredClone(ford.state);
    done.quests['quest.cart'].ready = true;
    assert.equal(journeyReady(done), null);
});

test('journey: with several contracts only a begun one is underway; of several begun, the one whose people are here, else the latest', () => {
    const s = contract(contract(structuredClone(base), 'quest.cart', 'Shepherd Cart to Millbrook'), 'quest.pilgrims', 'Pilgrims to Lumenford');
    const road = at(structuredClone(s), 'realm.veyrhold', 'realm.veyrhold');
    road.quests['quest.pilgrims'].journey = { since: 5, from: 'loc.redmarch.verge' };
    assert.equal(journeyReady(road)?.id, 'quest.pilgrims', 'the accepted cart is not underway');
    road.quests['quest.cart'].journey = { since: 7, from: 'loc.redmarch.verge' };
    assert.equal(journeyReady(road)?.id, 'quest.cart', 'the latest begun');
    person(road, 'npc.pilgrim', 'pilgrim elder');
    road.quests['quest.pilgrims'].notes = ['the pilgrim elder leads the way along the road'];
    assert.equal(journeyReady(road)?.id, 'quest.pilgrims', 'its people are here');
});

// ------------------------------------------------------------------------------------------------ 5. hunted
test('fauna: a hunting contract makes the kind it names its targets, not other kinds of the same body plan', () => {
    const job = (what) => {
        const s = after(structuredClone(base));
        s.quests['quest.hunt'] = { id: 'quest.hunt', title: 'Hunt', kind: 'guild_contract', status: 'active', rank: 'Novice', level: 1, qtype: 'standard', payout_cp: 40, objectives: [{ id: 'o1', verb: 'DEFEAT', what, qty: 6, unit: null, where: null, status: 'open' }], proof: [], history: [], details: [], notes: [], source: { branch: 'loc.redmarch' } };
        return s;
    };
    const individual = (s, species, anchor, count = 12) => Object.values(applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: `the ${species}`, species, anchor, desc: [], count, present: true, band: 'LONG' }] }, { msg: 9 }).state.entities)
        .filter((e) => e.kind === 'creature').length;
    assert.equal(individual(job('wild goats'), 'sheep', 'deer'), 0, 'sheep are no wild goats (the deer plan lists "goat")');
    assert.equal(individual(job('wild goats'), 'wild goats', 'deer'), 12);
    assert.equal(individual(job('wild goats'), 'goat', 'deer'), 12);
    assert.equal(individual(job('giant rats'), 'field mice', 'rat'), 0, 'mice are no giant rats');
    assert.equal(individual(job('giant rats'), 'rats', 'rat', 8), 8);
    assert.equal(individual(job('rats'), 'swarm of rats', 'rat', 8), 8);
    assert.equal(individual(job('the vermin in the cellar'), 'rats', 'rat', 8), 8, 'the whole kind of the body plan');
    assert.equal(individual(job('crop-eating crows'), 'ravens', 'raptor'), 0);
    assert.equal(individual(job('the birds raiding the fields'), 'ravens', 'raptor'), 12);
    assert.equal(individual(job('rustled horses'), 'cattle', 'horse'), 0);
    assert.equal(individual(job('the wolves harrying the sheep'), 'sheep', 'deer'), 0, 'the victims an objective names are not its targets');
    assert.equal(individual(job('the rats gnawing the grain sacks'), 'rats', 'rat', 8), 8);
    assert.equal(individual(after(structuredClone(base)), 'sheep', 'deer'), 0, 'no contract: background');
    assert.equal(individual(job('wild goats'), 'wolves', 'wolf', 5), 5, 'aggressive packs stay individual regardless');
});

// ------------------------------------------------------------------------------------------------ 6. C3
test('escort readiness: only a refused journey before the claim, with no applied arrival before it, holds it back', () => {
    const s = person(contract(structuredClone(base), 'quest.cart', 'Shepherd Cart to Millbrook'), 'npc.driver', 'wool cart driver');
    const MILL = { new: { name: 'Millbrook', kind: 'settlement', parent: 'realm.veyrhold' } };
    const ready = (seq) => ({ seq, type: 'quest.ready', quest: 'quest.cart', note: 'the cart reached Millbrook' });
    const run = (state, deltas, auth = TRAVEL) => applyWorld(after(state, { auth }), content, { expected: {}, deltas }, { msg: 52 });
    const later = run(s, [{ seq: 1, type: 'arrive', at: MILL, forced_by: null, with: ['npc.driver'] }, { seq: 2, type: 'arrive', at: 'loc.nowhere', forced_by: null, with: null }, ready(3)]);
    assert.equal(later.state.quests['quest.cart'].ready, true, 'a refused move after the applied arrival');
    const stranger = run(s, [{ seq: 1, type: 'arrive', at: MILL, forced_by: null, with: ['npc.driver', 'the flock-hand'] }, ready(2)]);
    assert.equal(stranger.state.quests['quest.cart'].ready, true, 'an unknown companion is no refused journey');
    assert.deepEqual(rules(stranger), ['world_rule']);
    const there = run(s, [{ seq: 1, type: 'arrive', at: MILL, forced_by: null, with: ['npc.driver'] }]).state;
    const hall = run(there, [{ seq: 1, type: 'arrive', at: { new: { name: 'wool hall', kind: 'site', parent: null } }, forced_by: null, with: null }, ready(2)], {});
    assert.deepEqual(rules(hall), ['no_go']);
    assert.equal(hall.state.quests['quest.cart'].ready, true, 'a refused step inside the town he is in');
    const first = run(s, [ready(1), { seq: 2, type: 'arrive', at: MILL, forced_by: null, with: null }], {});
    assert.equal(first.state.quests['quest.cart'].ready, true, 'the claim came before the refused journey');
    const refused = run(s, [{ seq: 1, type: 'arrive', at: MILL, forced_by: null, with: null }, ready(2)], {});
    assert.deepEqual(rules(refused), ['no_go', 'quest_dependency'], 'the live case of 30.09. stays refused');
    assert.notEqual(refused.state.quests['quest.cart'].ready, true);
});

// ------------------------------------------------------------------------------------------------ 7. quest.offer
test('the extractor is told that an offer of help is no private quest, that an offer line is a lot and where coin comes from', () => {
    const text = deltaVocabularyText(deltasVocab);
    assert.match(text, /quest\.offer .*someone offering to guide, accompany or help Alaric is a fact or an intent, not a quest/);
    assert.match(text, /offer .*qty: how many units the price is for .*price_cp: the price of those qty units together/);
    assert.match(text, /coin\.gift .*from: the person who hands it over, or where he takes it from/);
});
