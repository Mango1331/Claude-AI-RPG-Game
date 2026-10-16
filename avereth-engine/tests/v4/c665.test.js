// c.6.6.5: trade integrity (showing is no give, a buyer's bid is a sale, never a purchase), completed contract slips
// filed with the Guild, living settlements (crowd, everyday trades without a SEARCH, people of the crowd in a fight),
// Defeat XP that weighs a creature's real strength, the loot at the fight's end in its System block, and the live
// campaign of 15.10.2026 (continued under c.6.6.4, exported 16.10.2026) loading and playing on from its last clean
// state, #88 (spec turn 41).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { foldChat, rec, turnBlock } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { announcedAbandon } from '../../src/v4/planner.js';
import { lootEvents } from '../../src/v4/loot.js';
import { findTrades, settlementLife, crowdCount } from '../../src/v4/settlement.js';
import { strengthOf, defeatXp } from '../../src/progression.js';
import { scaleCreature } from '../../src/npcgen.js';
import { npcDecide } from '../../src/combat.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1016.json'), 'utf8'));
const PARTS = { 'obj.loot.mudwyrm.skin.f': 2, 'obj.loot.mudwyrm.fang.f': 2, 'obj.loot.mudwyrm.venom.f': 2, 'obj.loot.mudwyrm.scale.f': 3 };
const KEEPER = 'npc.pshopkeeper';

/** The live chat up to message `n` (exclusive), played on with a scripted planner (Prototype C on). */
function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    return rec(g.chat.findLast((m) => m.is_user));
}
const outcomeOf = (r) => r.events.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
const held = (s) => Object.fromEntries(Object.values(s.objects).filter((o) => o.holder?.entity === 'pc').map((o) => [o.id, o.qty ?? 1]));
const coin = (g) => g.state().entities.pc.sheet.coin_cp;

// the live planner's answer to #89 and the live narration of #90, #92
const LIVE_GIVES = Object.entries(PARTS).map(([object, qty]) => ({ type: 'give', object, qty, to: KEEPER, quote: 'i take out every monster part i carry with me' }));
const LIVE_BID = { seq: 1, type: 'bid', buyer: KEEPER, lines: Object.entries(PARTS).map(([object, qty]) => ({ object, qty })), price_cp: 80 };
const SHOW = '*i take out every monster part i carry with me*';
const SELL = '*i accept and sell all parts to her*';

/** From #88: lay the parts out (the live planner's four gives) and let her bid; returns the open bid. */
async function toBid(g, deltas = [LIVE_BID]) {
    const shown = await say(g, SHOW, ...LIVE_GIVES);
    const reply = await g.reply(fx.messages[90].mes, { expected: {}, deltas });
    return { shown, reply, bid: Object.values(g.state().offers).find((o) => o.status === 'open' && o.seller === KEEPER) };
}

// ------------------------------------------------------------------------------------------------ P0 trade
test('c.6.6.5 trade 1-4: from the clean state after #88, laying the parts out gives nothing away; "eight silver for the lot" is her bid; accepting it sells exactly those parts for +80 cp (417), no package, the bid closed', async () => {
    const g = live(89);
    // 1. the last clean state: 337 cp, the four stacks 2/2/2/3, at the shop with its keeper
    assert.equal(coin(g), 337);
    assert.deepEqual(Object.fromEntries(Object.entries(held(g.state())).filter(([id]) => id.startsWith('obj.loot.'))), PARTS);
    assert.ok(g.state().scene.present.includes(KEEPER));
    // 2. "i take out every monster part": the planner's four gives (as live) are no gives; nothing changes hands
    const { shown, reply, bid } = await toBid(g, [LIVE_BID, { seq: 2, type: 'object.move', object: 'obj.loot.mudwyrm.skin.f', qty: 2, to: KEEPER }]);
    assert.ok(!shown.events.some((e) => ['object.moved', 'coin.changed', 'transaction.completed', 'offer.created'].includes(e.t)), shown.events.map((e) => e.t).join());
    assert.deepEqual(shown.plan.dropped.map((d) => d.rule), ['shows', 'shows', 'shows', 'shows']);
    assert.match(outcomeOf(shown).extra.join(' '), /SHOWS — he lays out .*they stay his/);
    assert.ok(reply.record.rejected.some((r) => r.rule === 'pc_inventory'), 'her handling the parts moves none of them');
    assert.equal(coin(g), 337);
    // 3. her price is a bid for exactly these four stacks and quantities
    assert.equal(bid.bid, true);
    assert.equal(bid.price_cp, 80);
    assert.deepEqual(Object.fromEntries(bid.lines.map((l) => [l.object, l.qty])), PARTS);
    // 4. "i accept and sell all parts to her" (the live planner's offer.accept): a sale, +80
    const before = held(g.state());
    const sold = await say(g, SELL, { type: 'offer.accept', offer: bid.id, lines: ['l1'], qty: null, quote: 'i accept and sell all parts to her' });
    assert.match(outcomeOf(sold).actions[0], /SELLS — .* for 80 cp/);
    assert.equal(coin(g), 417);
    const s = g.state();
    for (const id of Object.keys(PARTS)) assert.equal(s.objects[id].holder.entity, KEEPER, id);
    const now = held(s);
    assert.deepEqual(Object.keys(now).sort(), Object.keys(before).filter((id) => !PARTS[id]).sort(), 'only the nine parts left him');
    assert.ok(!Object.values(s.objects).some((o) => o.source?.how === 'bought'), 'no "lot" package');
    assert.equal(s.offers[bid.id].status, 'accepted');
    // the reply shows her count out the coin: that coin is the sale's, not a gift
    const y = await g.reply(fx.messages[92].mes, { expected: {}, deltas: [{ seq: 1, type: 'coin.gift', from: KEEPER, cp: 80, why: 'eight silver for the parts' }] });
    assert.ok(y.record.rejected.some((r) => r.rule === 'engine_booked'));
    assert.equal(coin(g), 417);
    // 10. reload and regenerate book nothing twice
    assert.equal(foldChat(structuredClone(g.chat)).state.entities.pc.sheet.coin_cp, 417);
    g.chat.pop();
    await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    assert.equal(coin(g), 417);
    assert.equal(foldChat(structuredClone(g.chat)).state.entities.pc.sheet.coin_cp, 417);
});

test('c.6.6.5 trade 5: a bid declined or left open moves nothing; 337 cp and all four stacks stay his', async () => {
    const g = live(89);
    const { bid } = await toBid(g);
    const declined = await say(g, '*i shake my head* No, I will keep them.', { type: 'offer.decline', offer: bid.id, quote: 'No, I will keep them.' });
    assert.ok(!declined.events.some((e) => e.t === 'object.moved' || e.t === 'coin.changed'));
    assert.equal(g.state().offers[bid.id].status, 'declined');
    assert.equal(coin(g), 337);
    assert.deepEqual(Object.fromEntries(Object.entries(held(g.state())).filter(([id]) => id.startsWith('obj.loot.'))), PARTS);
    const h = live(89);
    await toBid(h);
    await say(h, '*i look around the shop*');
    assert.equal(coin(h), 337);
    assert.deepEqual(Object.fromEntries(Object.entries(held(h.state())).filter(([id]) => id.startsWith('obj.loot.'))), PARTS);
});

test('c.6.6.5 trade 6: selling part of a stack keeps the rest with its Rank, species, origin and value; a bid for things he no longer holds is void, never a negative stock', async () => {
    const g = live(89);
    const bid = { seq: 1, type: 'bid', buyer: KEEPER, lines: [{ object: 'obj.loot.mudwyrm.scale.f', qty: 1 }], price_cp: 4 };
    await say(g, '*i show her one of the scale plates*');
    await g.reply('"Four copper for one plate."', { expected: {}, deltas: [bid] });
    const open = Object.values(g.state().offers).find((o) => o.status === 'open' && o.bid);
    const plate = structuredClone(g.state().objects['obj.loot.mudwyrm.scale.f']);
    await say(g, 'Deal.', { type: 'offer.accept', offer: open.id, lines: null, qty: null, quote: 'Deal.' });
    const s = g.state();
    assert.equal(coin(g), 341);
    const rest = s.objects['obj.loot.mudwyrm.scale.f'];
    assert.equal(rest.qty, 2);
    for (const k of ['rank', 'species', 'material', 'anchor', 'value_cp', 'level']) assert.deepEqual(rest[k], plate[k], k);
    const part = Object.values(s.objects).find((o) => o.holder?.entity === KEEPER && o.material === 'scale');
    assert.equal(part.qty, 1);
    assert.equal(part.rank, 'F');
    // a bid for three plates when he holds two: not sold, nothing moves
    await g.reply('"Then the other plates too - I\'ll give six for three."', { expected: {}, deltas: [{ seq: 1, type: 'bid', buyer: KEEPER, lines: [{ object: 'obj.loot.mudwyrm.scale.f', qty: 3 }], price_cp: 6 }] });
    const stale = Object.values(g.state().offers).find((o) => o.status === 'open' && o.bid);
    assert.equal(stale.lines[0].qty, 2, 'a bid is for what he holds');
});

test('c.6.6.5 trade 7: an offer stored the wrong way round (the c.6.6.4 extractor\'s "mudwyrm parts … the lot") is never paid for: naming his things it is sold, else the System asks', async () => {
    const g = live(89);
    await say(g, SHOW, ...LIVE_GIVES);
    await g.reply(fx.messages[90].mes, { expected: {}, deltas: [{ seq: 1, type: 'offer', seller: KEEPER, lines: [{ what: 'F-Rank mudwyrm parts: 2 skins, 2 fangs, 2 venom sacs, 3 scale plates — the lot', kind: 'goods', service: null, qty: 1, price_cp: 80 }] }] });
    const offer = Object.values(g.state().offers).find((o) => o.status === 'open' && o.seller === KEEPER);
    assert.ok(!offer.bid);
    await say(g, SELL, { type: 'offer.accept', offer: offer.id, lines: ['l1'], qty: null, quote: 'i accept and sell all parts to her' });
    assert.equal(coin(g), 417, 'the live words sell, never buy');
    assert.ok(!Object.values(g.state().objects).some((o) => o.source?.how === 'bought'));
    // an offer that names none of his things: no purchase, a question
    const h = live(89);
    await say(h, '*i look at her shelves*');
    await h.reply('"Salted eel skins, three for a silver."', { expected: {}, deltas: [{ seq: 1, type: 'offer', seller: KEEPER, lines: [{ what: 'salted eel skins', kind: 'goods', service: null, qty: 3, price_cp: 10 }] }] });
    const eel = Object.values(h.state().offers).find((o) => o.status === 'open' && o.seller === KEEPER);
    h.chat.push({ mes: 'I accept and sell them to her', is_user: true, is_system: false, extra: {} });
    h.plans = [JSON.stringify({ commands: [{ seq: 1, type: 'offer.accept', offer: eel.id, lines: null, qty: null, quote: 'I accept and sell them to her' }] })];
    const r = await prepareGenerationAsync(h.chat, content, { type: 'normal', settings: { planner: true }, llm: h.llm });
    assert.equal(r.action, 'panels');
    assert.match(r.panels[0], /CLARIFY/);
    assert.equal(coin(h), 337);
});

test('c.6.6.5 trade 8-9: a gift stays a give, showing is none; buying from an offer still pays; "here to deliver" and the hand-over are as in c.6.6.4', async () => {
    const st = structuredClone(foldChat(fx.messages.slice(0, 89)).state);
    const give = (q, qty = 1) => ({ seq: 1, type: 'give', object: 'obj.loot.mudwyrm.fang.f', qty, to: KEEPER, quote: q });
    assert.equal(announcedAbandon('*i give her the fang as a gift*', [give('i give her the fang as a gift')], st).kept.length, 1);
    assert.equal(announcedAbandon('I give you this fang', [give('I give you this fang')], st).kept.length, 1);
    assert.equal(announcedAbandon('*i show you this fang*', [give('i show you this fang')], st).kept.length, 0);
    assert.equal(announcedAbandon('*i spread the items out for appraisal*', [give('i spread the items out for appraisal')], st).kept.length, 0);
    assert.equal(announcedAbandon('*i lay the fangs on the counter* what would you pay for these?', [give('i lay the fangs on the counter', 2)], st).kept.length, 0);
    assert.equal(announcedAbandon("im with the guild and here to deliver this crate", [{ seq: 1, type: 'give', object: 'x', to: 'y', quote: 'here to deliver this crate' }]).kept.length, 0);
    assert.equal(announcedAbandon('Here is the crate, I hand it to you', [{ seq: 1, type: 'give', object: 'x', to: 'y', quote: 'Here is the crate, I hand it to you' }]).kept.length, 1);
    // the gift itself books one fang to her
    const g = live(89);
    const r = await say(g, '*i give her the fang as a gift*', give('i give her the fang as a gift'));
    assert.ok(r.events.some((e) => e.t === 'object.moved' && e.d.to.entity === KEEPER && e.d.qty === 1));
    assert.equal(g.state().objects['obj.loot.mudwyrm.fang.f'].qty, 1);
    // an ordinary purchase from her offer still pays
    await g.reply('"A salted eel skin? One copper."', { expected: {}, deltas: [{ seq: 1, type: 'offer', seller: KEEPER, lines: [{ what: 'salted eel skin', kind: 'goods', service: null, qty: 1, price_cp: 1 }] }] });
    const eel = Object.values(g.state().offers).find((o) => o.status === 'open' && !o.bid && o.seller === KEEPER);
    const bought = await say(g, 'I\'ll take it.', { type: 'offer.accept', offer: eel.id, lines: null, qty: null, quote: 'I\'ll take it.' });
    assert.ok(bought.events.some((e) => e.t === 'coin.changed' && e.d.delta === -1));
    assert.equal(coin(g), 336);
});

// ------------------------------------------------------------------------------------------------ P1.1 slips
test('c.6.6.5 slips 11: a turn-in files its slip with the Guild; accepted, READY or refused contracts keep theirs; the Guild plate stays', async () => {
    // READY at #82: the mudwyrm slip is still his, with its READY seal
    const ready = foldChat(fx.messages.slice(0, 83)).state;
    assert.equal(ready.objects['obj.slip.cull_the_mudwyrm_brood_at_the_brickworks_clay_pits'].holder.entity, 'pc');
    assert.ok(ready.entities.pc.sheet.inventory['obj.slip.cull_the_mudwyrm_brood_at_the_brickworks_clay_pits']);
    // a turn-in refused (#61, just accepted, nothing done): the slip stays
    const g = live(63);
    const refused = await say(g, '*i turn the quest in*', { type: 'quest.turn_in', quest: 'quest.cull_the_mudwyrm_brood_at_the_brickworks_clay_pits', quote: 'i turn the quest in' });
    assert.notEqual(g.state().quests['quest.cull_the_mudwyrm_brood_at_the_brickworks_clay_pits'].status, 'completed', JSON.stringify(outcomeOf(refused)?.actions));
    assert.equal(g.state().objects['obj.slip.cull_the_mudwyrm_brood_at_the_brickworks_clay_pits'].holder.entity, 'pc');
    // the turn-in of #83/#84 under this build: filed; the plate stays
    const done = live(83);
    await say(done, fx.messages[83].mes,
        { type: 'go', to: 'loc.ashbridge.guild_hall', quote: 'i travel back to the guild hall' },
        { type: 'quest.turn_in', quest: 'quest.cull_the_mudwyrm_brood_at_the_brickworks_clay_pits', quote: 'turn in the ques' });
    const x = await done.reply(fx.messages[84].mes, { expected: { 1: { arrived: true, at: 'loc.ashbridge.guild_hall', with: null } }, deltas: [] });
    const s = done.state();
    assert.equal(s.quests['quest.cull_the_mudwyrm_brood_at_the_brickworks_clay_pits'].status, 'completed');
    assert.deepEqual(s.objects['obj.slip.cull_the_mudwyrm_brood_at_the_brickworks_clay_pits'].holder, { consumed: 'guild' });
    assert.ok(!s.entities.pc.sheet.inventory['obj.slip.cull_the_mudwyrm_brood_at_the_brickworks_clay_pits']);
    assert.equal(s.objects['obj.guild_plate'].holder.entity, 'pc');
    assert.match(x.record.panel, /ITEM - Guild contract slip: Cull the Mudwyrm Brood at the Brickworks Clay Pits → filed at the Guild desk/);
});

test('c.6.6.5 slips 12: the three slips of contracts completed before this build leave his effective inventory on load, idempotently; quests, payouts and XP stay as they were', () => {
    const a = foldChat(structuredClone(fx.messages.slice(0, 89)));
    const b = foldChat(structuredClone(fx.messages.slice(0, 89)));
    assert.deepEqual(a.state, b.state, 'the same on every load');
    const s = a.state;
    for (const q of ['wagon_guard_to_the_quarry_gate', 'tonic_run_to_the_wayshrine', 'cull_the_mudwyrm_brood_at_the_brickworks_clay_pits']) {
        assert.equal(s.quests[`quest.${q}`].status, 'completed');
        assert.deepEqual(s.objects[`obj.slip.${q}`].holder, { consumed: 'guild' });
        assert.ok(!(`obj.slip.${q}` in s.entities.pc.sheet.inventory));
        assert.ok(s.objects[`obj.slip.${q}`].marks.some((m) => /COMPLETED/.test(m.text)), 'its history stays');
    }
    assert.equal(s.entities.pc.sheet.coin_cp, 337);
    assert.equal(s.entities.pc.sheet.xp, 145);
    assert.ok(s.entities.pc.sheet.inventory['obj.guild_plate']);
    // nothing is written: the stored events are the chat's own
    assert.equal(fx.messages.slice(0, 89).reduce((n, m) => n + (m.extra?.avereth?.events?.length || 0), 0), structuredClone(fx.messages.slice(0, 89)).reduce((n, m) => n + (m.extra?.avereth?.events?.length || 0), 0));
});

// ------------------------------------------------------------------------------------------------ P1.2-1.4 settlements
test('c.6.6.5 settlements 13-14: the Ashbridge market by day is crowded in the narrator\'s block without stored crowd people; its trades include a monster-parts buyer, the known shop first', async () => {
    const g = live(87);
    const before = Object.keys(g.state().entities).length;
    assert.equal(crowdCount(g.state(), content), 3);
    await say(g, '*i look around the market*');
    const block = turnBlock(g.chat, g.chat.length - 1, content).context.text;
    assert.match(block, /SETTLEMENT LIFE — Ashbridge is a city/);
    assert.match(block, /crowded: residents and stallholders/);
    assert.match(block, /hunter's exchange \/ monster-parts buyer/);
    await g.reply('Stalls, carts and voices everywhere.', { expected: {}, deltas: [{ seq: 1, type: 'person.new', ref: 'fishwife', name: null, role: 'fishwife', desc: ['shouting fishwife'], present: true, relevant: false, threat: false, at: null, band: 'SHORT' }] });
    assert.equal(Object.keys(g.state().entities).length, before, 'the crowd is colour, not stored people');
    // after the shop is known, finding a buyer names it, not a new one
    const at88 = foldChat(fx.messages.slice(0, 89)).state;
    assert.match(findTrades(at88, content, 'a buyer for monster parts').line, /known: Shop with the Crossed Knife and Shears \(monster-parts shopkeeper\)/);
});

test('c.6.6.5 settlements 15: "look for a store to sell the monster parts to" (live #85) finds the trades without a check and without the lost hour; he still goes where he chooses', async () => {
    const g = live(85);
    const minute = g.state().clock.minute;
    const r = await say(g, fx.messages[85].mes,
        { type: 'go', to: { new: 'the market district' }, quote: 'walk into the market district of the city' },
        { type: 'activity', kind: 'search', what: 'a store to sell the monster parts to', minutes: null, until: null, quote: 'look for a store to sell the monster parts to' });
    assert.ok(!r.events.some((e) => e.t === 'check.recorded'), 'no SEARCH check (live: PER 45 %, d100 68, failure)');
    const o = outcomeOf(r);
    assert.match(o.actions.join(' '), /FINDS — Ashbridge \(city\) has: hunter's exchange \/ monster-parts buyer/);
    assert.match(o.actions.join(' '), /1\. GOES/);
    assert.equal(g.state().clock.minute - minute, 10);
});

test('c.6.6.5 settlements 16: a real search for something hidden is still a SEARCH, and its result is in the System block', async () => {
    const g = live(87);
    const r = await say(g, '*i search the alleys for a hidden cellar door*', { type: 'activity', kind: 'search', what: 'a hidden cellar door', minutes: null, until: null, quote: 'i search the alleys for a hidden cellar door' });
    const check = r.events.find((e) => e.t === 'check.recorded');
    assert.ok(check);
    const x = await g.reply('He tries door after door.', { expected: { 1: { minutes: 30, done: true } }, deltas: [] });
    assert.match(x.record.panel, new RegExp(`SEARCH — a hidden cellar door \\(PER \\d+ vs \\d+\\): [\\d.]+% · d100 ${check.d.roll} → ${check.d.success ? 'SUCCESS' : 'FAILURE'}`));
});

test('c.6.6.5 settlements 17: a passer-by he attacks in the crowded market becomes a person and the target; an area attack meets the people closest; inside the shop nobody is made up', async () => {
    const g = live(87);
    const r = await say(g, '*i punch the fishmonger*', { type: 'use_skill', skill: null, target: { new: 'the fishmonger' }, quote: 'i punch the fishmonger' });
    const made = r.events.filter((e) => e.t === 'entity.created');
    assert.equal(made.length, 1);
    assert.equal(made[0].d.entity.template, 'commoner');
    assert.ok(r.events.some((e) => e.t === 'encounter.started' && e.d.encounter.combatants[made[0].d.entity.id]));
    const h = live(87);
    const area = await say(h, '*i cast arcane burst in the middle of the crowd*', { type: 'use_skill', skill: 'mage.arcane_burst', target: null, quote: 'i cast arcane burst in the middle of the crowd' });
    const enc = area.events.find((e) => e.t === 'encounter.started').d.encounter;
    assert.equal(Object.keys(enc.combatants).filter((id) => id !== 'pc').length, 3, 'three people of the crowd, no A-Z list');
    // inside the shop there is no crowd: no one is made up
    const k = live(89);
    k.chat.push({ mes: '*i punch the fishmonger*', is_user: true, is_system: false, extra: {} });
    k.plans = [JSON.stringify({ commands: [{ seq: 1, type: 'use_skill', skill: null, target: { new: 'the fishmonger' }, quote: 'i punch the fishmonger' }] })];
    const inside = await prepareGenerationAsync(k.chat, content, { type: 'normal', settings: { planner: true }, llm: k.llm });
    assert.equal(inside.action, 'panels');
    assert.match(inside.panels[0], /not a valid target/);
});

test('c.6.6.5 settlements 18: a village is no city: no monster-parts buyer, the larger places that have one named; a thin crowd', () => {
    const s = structuredClone(foldChat(fx.messages.slice(0, 87)).state);
    applyEvent(s, { t: 'place.created', d: { place: { id: 'loc.reedwick', name: 'Reedwick', kind: 'settlement', parent: 'realm.duskreach', realm: 'realm.duskreach', tags: [], by: 'reply' } } });
    applyEvent(s, { t: 'place.created', d: { place: { id: 'loc.reedwick.green', name: 'Village Green', kind: 'district', parent: 'loc.reedwick', realm: 'realm.duskreach', tags: [], by: 'reply' } } });
    s.scene.at = 'loc.reedwick.green';
    const f = findTrades(s, content, 'a buyer for monster parts');
    assert.match(f.line, /A village like Reedwick has no hunter's exchange \/ monster-parts buyer; the nearest larger places that do: .*Ashbridge/);
    assert.equal(crowdCount(s, content), 1);
    assert.match(settlementLife(s, content), /Reedwick is a village/);
    assert.doesNotMatch(settlementLife(s, content), /arcane supplies/);
});

// ------------------------------------------------------------------------------------------------ combat, XP, display
test('c.6.6.5 XP 19-21: the strong armored mudwyrm (84 HP, ATK 14, DEF 6) is worth clearly more than the 20-HP ones, not four times; the old fights keep 12/12/14', () => {
    const ref = scaleCreature({ id: 'r', name: 'r', ...content.rules.xp.strength.reference }, 1, 'normal', content);
    const xp = (anchor, fixed) => defeatXp(1, 'normal', 'F', content, strengthOf(fixed, scaleCreature(content.anchors.get(anchor), 1, 'normal', content), content, ref));
    const small = xp('serpent', { max_hp: 20, atk: 8, def: 0, mdef: 1 });
    const big = xp('armored_beast', { max_hp: 84, atk: 14, def: 6, mdef: 2 });
    assert.equal(small, 12);
    assert.ok(big >= 18 && big < 48, `${big}`);
    assert.equal(xp('wolf', scaleCreature(content.anchors.get('wolf'), 1, 'normal', content)), 12, 'ordinary fauna keep their Level\'s XP');
    const s = foldChat(fx.messages.slice(0, 89)).state;
    const amounts = fx.messages.slice(59, 89).flatMap((m) => (m.extra?.avereth?.events || []).filter((e) => e.t === 'xp.changed' && /Combat XP/.test(e.d.reason)).map((e) => e.d.amount));
    assert.deepEqual(amounts, [12, 12, 14]);
    assert.equal(s.entities.pc.sheet.xp, 145);
});

/** A creature appears at the shop; Alaric Flame Lances it until the fight is over. */
async function fight(g, spec) {
    await say(g, '*i look around*');
    await g.reply('Something comes out of the back room.', { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: spec.ref, species: spec.species, anchor: spec.anchor, desc: spec.desc, count: 1, present: true, band: 'SHORT', stronger: spec.stronger ?? null, threat: null }] });
    const s = g.state();
    const id = s.scene.present.filter((x) => s.entities[x]?.kind === 'creature' && s.entities[x].status !== 'dead').at(-1);
    const rounds = [];
    for (let i = 0; i < 8; i++) {
        const r = await say(g, '*flame lance it*', { type: 'use_skill', skill: 'mage.flame_lance', target: id, quote: 'flame lance it' });
        rounds.push(r);
        const x = await g.reply('The fight goes on.', { expected: {}, deltas: [] });
        if (r.events.some((e) => e.t === 'encounter.ended')) return { id, rounds, r, x };
    }
    throw new Error('the fight did not end');
}

test('c.6.6.5 XP 21 + display 22: a strong mudwyrm fight pays its locked Defeat XP once; COMBAT END shows the loot it brought, no ITEM line twice; a fight without loot shows no LOOT block', async () => {
    const g = live(89);
    const { r, x } = await fight(g, { ref: 'big wyrm', species: 'mudwyrm', anchor: 'armored_beast', desc: ['huge mudwyrm with plated hide'], stronger: true });
    const xp = r.events.filter((e) => e.t === 'xp.changed');
    assert.equal(xp.length, 1);
    assert.ok(xp[0].d.amount >= 18, `${xp[0].d.amount}`);
    assert.match(x.record.panel, /COMBAT END — .* defeated · \+\d+ XP/);
    assert.match(x.record.panel, /`LOOT ACQUIRED:`\n`  F-Rank Mudwyrm Scale Plate ×\d`/);
    assert.doesNotMatch(x.record.panel, /ITEM \+ F-Rank Mudwyrm/);
    const outcome = outcomeOf(r);
    assert.ok(outcome.loot.every((l) => !/now ×/.test(l)), 'what this fight brought, not the stack total');
    // a fight in which the foe yields nothing: no LOOT ACQUIRED block (a spirit at 0 essence, or a fled foe)
    const h = live(89);
    const none = await fight(h, { ref: 'wisp', species: 'grey wisp', anchor: 'spirit', desc: ['a grey wisp'] });
    if (!outcomeOf(none.r).loot) assert.doesNotMatch(none.x.record.panel, /LOOT ACQUIRED/);
});

test('c.6.6.5 narrator 23-24: the Mage\'s Basic Attack is a bolt from where he stands; automatic loot is in the magic pouch; a toll nobody booked is no payment', async () => {
    const g = live(89);
    await say(g, '*i look around*');
    await g.reply('A dog slinks in from the back yard, hackles up.', { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'dog', species: 'yard dog', anchor: 'wolf', desc: ['scarred yard dog'], count: 1, present: true, band: 'SHORT', stronger: null, threat: null }] });
    const dog = g.state().scene.present.find((id) => g.state().entities[id]?.kind === 'creature');
    let block = '';
    for (let i = 0; i < 4 && !/Basic Attack ->/.test(block); i++) {
        await say(g, '*i basic attack*', { type: 'use_skill', skill: 'mage.basic_attack', target: dog, quote: 'i basic attack' });
        block = turnBlock(g.chat, g.chat.length - 1, content).context.text;
        await g.reply('The fight goes on.', { expected: {}, deltas: [] });
    }
    assert.match(block, /Basic Attack -> .*Magical \/ Ranged \/ Projectile: from where he stands, no step and no melee blow/);
    if (/LOOT \(/.test(block)) assert.match(block, /magic pouch: no weight, bulk, packing, straps or carrying effort/);
    const contract = fs.readFileSync(path.join(ROOT, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
    assert.match(contract, /Automatic loot sits in his magic pouch/);
    assert.match(contract, /A toll, fee, fine or theft of Alaric's coin is told as done only when the engine block books it/);
    // the live #84 toll: refused, and the next reply is told it was not paid
    const h = live(83);
    await say(h, fx.messages[83].mes, { type: 'go', to: 'loc.ashbridge.guild_hall', quote: 'i travel back to the guild hall' });
    const x = await h.reply(fx.messages[84].mes, { expected: { 1: { arrived: true, at: 'loc.ashbridge.guild_hall', with: null } }, deltas: [{ seq: 1, type: 'coerce', kind: 'fine', by: 'Ashbridge south gate', coin_cp: 1, because: "the gate's usual toll from a mud-stained traveler", object: null }] });
    assert.ok(x.record.rejected.some((r) => r.rule === 'coerce'));
    assert.ok((x.record.corrections || []).some((c) => /was not paid/.test(c)), JSON.stringify(x.record.corrections));
    assert.equal(h.state().entities.pc.sheet.coin_cp, 217);
});

test('c.6.6.5 B1-B2: a defensive creature struck in its cover closes to defend itself (planner path; the old path holds); venom only from a creature shown venomous', () => {
    const enc = {
        intents: {}, trigger: null,
        combatants: {
            pc: { id: 'pc', side: 'pc', model: 'character', current: { hp: 80, band: 'MEDIUM' }, fixed: { max_hp: 85 } },
            'mon.c': { id: 'mon.c', side: 'hostile', model: 'creature', current: { hp: 51, band: 'MEDIUM', cover: 'partial' }, fixed: { max_hp: 84, temperament: 'defensive', attack: { range: 'ENGAGED' } } },
        },
        log: [{ actor: 'mon.c', kind: 'cover' }, { actor: 'pc', kind: 'attack', target: 'mon.c', strikes: [{ target: 'mon.c' }] }],
    };
    assert.equal(npcDecide({ enc, c: true, state: null, content }, 'mon.c').kind, 'close_and_attack');
    assert.equal(npcDecide({ enc: structuredClone(enc), c: false, state: null, content }, 'mon.c').kind, 'hold');
    const quiet = structuredClone(enc);
    quiet.log = [{ actor: 'pc', kind: 'attack', target: 'mon.c', strikes: [{ target: 'mon.c' }] }, { actor: 'mon.c', kind: 'hold' }];
    assert.equal(npcDecide({ enc: quiet, c: true, state: null, content }, 'mon.c').kind, 'hold', 'not struck since its last Turn: it keeps its cover');
    const low = structuredClone(enc);
    low.combatants['mon.c'].current.hp = 13;
    assert.equal(npcDecide({ enc: low, c: true, state: null, content }, 'mon.c').kind, 'flee');
    const loot = (species, desc) => {
        const s = { turn: 9, entities: { pc: { id: 'pc', kind: 'pc', sheet: { coin_cp: 0, inventory: {}, equipment: {} } }, 'mon.x': { id: 'mon.x', status: 'dead', kind: 'creature', species, descriptors: desc, profile: { anchor: 'serpent', rank: 'F', level: 1, attack: { name: 'Bite' } } } }, objects: {}, scene: { present: ['pc'] } };
        return lootEvents(s, content, { id: 'enc.t9', combatants: { pc: { id: 'pc', current: { hp: 20 } }, 'mon.x': { id: 'mon.x', current: { hp: 0 } } } }).lines.join(' ');
    };
    assert.doesNotMatch(loot('mudwyrm', ['long, low grey-brown hide']), /Venom/);
    assert.match(loot('marsh viper', ['green scales']), /Venom Sac/);
});

// ------------------------------------------------------------------------------------------------ compatibility
test('c.6.6.5 compatibility 26-27: the live chat to #88 loads with its hard state intact (337 cp, 145 XP, three quests completed, the parts 2/2/2/3, 85 HP max); the broken #89-#92 replay as stored and show why', () => {
    const s = foldChat(structuredClone(fx.messages.slice(0, 89))).state;
    assert.equal(s.entities.pc.sheet.coin_cp, 337);
    assert.equal(s.entities.pc.sheet.xp, 145);
    assert.equal(s.entities.pc.sheet.level, 2);
    assert.equal(Object.values(s.quests).filter((q) => q.status === 'completed').length, 3);
    assert.equal(s.scene.at, 'loc.ashbridge.market_district.shop_with_the_crossed_knife_and_shears');
    assert.ok(s.scene.present.includes(KEEPER));
    for (const [id, qty] of Object.entries(PARTS)) assert.equal(s.objects[id].qty, qty);
    // the broken turns as c.6.6.4 stored them: four gives, then 80 cp paid for a "lot" of his own parts
    const broken = foldChat(structuredClone(fx.messages)).state;
    assert.equal(broken.entities.pc.sheet.coin_cp, 257);
    assert.ok(Object.values(broken.objects).some((o) => o.source?.how === 'bought' && /the lot/.test(o.name)));
    const t89 = fx.messages[89].extra.avereth;
    assert.deepEqual(t89.plan ? t89.interp.commands.map((c) => c.type) : [], ['give', 'give', 'give', 'give'], 'the live planner read laying out as four gives');
    // the same planner answer under this build: no give
    const st = foldChat(structuredClone(fx.messages.slice(0, 89))).state;
    assert.equal(announcedAbandon(fx.messages[89].mes, t89.interp.commands, st).kept.length, 0);
});
