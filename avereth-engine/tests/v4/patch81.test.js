// Patch 8.1 (docs/PATCH8_1_GATE_GROUP_COMBAT.md): Dungeon gate, group combat, combat truth and the Guild board, against
// the live test of 21.10.2026 10:17 (tests/v4/live_1021d.json, build .25, GLM-5.3-Flash): the chat played on from its
// messages with a scripted planner and scripted extractor answers. What the live run did is reproduced from its own
// records (the watchman's offer, the two encounters, the extractor's empty answers); new turns run under this build.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { foldChat, rec, turnBlock } from '../../src/host.js';
import { prepareGenerationAsync, runExtraction } from '../../src/v4/runtime.js';
import { worldPanel } from '../../src/display.js';
import { hudRows, gateCard, gateState, gateCheck, floorText, renewText, cullPopulation, waiverOf } from '../../src/v4/living.js';
import { parseBoard, bookBoard, defeatTally, goalText } from '../../src/v4/guild.js';
import { groupJoiners } from '../../src/v4/group_combat.js';
import { extractorCatalog } from '../../src/v4/catalog.js';
import { playerTurn } from '../../src/engine.js';
import { firewall } from '../../src/v4/firewall.js';
import { Chat4 } from './harness.js';
import { say, lastUser, outcomeOf, linesOf, inject, GROTTO } from './patch8_lib.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1021d.json'), 'utf8'));
const A = 'mon.glimmerdeep_grotto_c1_l1_e1_1';
const B = 'mon.glimmerdeep_grotto_c1_l1_e1_2';
const QUEST = 'quest.cull_the_crystal_beetles_of_glimmerdeeps_outer_grottos';
const WATCHMAN = 'npc.npccleft_watchman';
const GATE_OFFER = 'offer.gate.glimmerdeep_grotto';

/** The live chat up to message n (exclusive), played on with a scripted planner (Prototype C on). */
function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
const coin = (g) => g.state().entities.pc.sheet.coin_cp;
const allEvents = (g) => g.chat.flatMap((m) => rec(m)?.events || []);
const PAY = { type: 'offer.accept', offer: GATE_OFFER, lines: ['l1'], qty: null, quote: 'i pay 10 copper' };
const ENTER = { type: 'go', to: { new: 'into the dungeon' }, quote: 'walk into the dungeon' };
const into = (name = 'First Gallery of Glimmerdeep') => ({ 1: { arrived: true, at: { new: { name, kind: 'interior', parent: GROTTO } }, with: null } });

// ------------------------------------------------------------------------------------------------ A. the gate (§1-3)
test('8.1 gate 1: at the gate the gate\'s own fee is on offer at once (before he tries to enter), in the catalog as the gate\'s, once', async () => {
    const g = live(17);
    assert.equal(g.state().scene.at, GROTTO);
    assert.equal(g.state().offers[GATE_OFFER], undefined, 'the live run had none before he tried to enter');
    await say(g, fx.messages[17].mes);
    const ev = lastUser(g).events;
    assert.equal(ev.filter((e) => e.t === 'offer.created' && e.d.offer.id === GATE_OFFER).length, 1);
    assert.equal(ev.find((e) => e.t === 'offer.created').d.offer.lines[0].price_cp, 10);
    const cat = extractorCatalog(g.state(), content, { c: true });
    assert.match(cat.text, /OFFERS: offer\.gate\.glimmerdeep_grotto \(the gate: l1 Entry to Glimmerdeep Grotto 10 cp\)/);
    // idempotent: the next turn at the gate creates none
    await g.reply('The watchman waits.', { expected: {}, deltas: [] });
    await say(g, '*i wait*');
    assert.equal(lastUser(g).events.filter((e) => e.t === 'offer.created').length, 0);
});

test('8.1 gate 2: the watchman\'s own "entry, 10 cp" (live #18) is refused as the gate\'s; his torch is his to sell; the narrator hears the one price', async () => {
    const g = live(17);
    await say(g, fx.messages[17].mes);
    const r = await g.reply(fx.messages[18].mes, { expected: {}, deltas: [
        { seq: 1, type: 'offer', seller: WATCHMAN, lines: [{ what: 'entry to Glimmerdeep Grotto, marked down by the watchman', kind: 'service', service: 'other', qty: 1, price_cp: 10, said: 'Ten copper to walk in' }, { what: 'a pitch torch', kind: 'goods', service: null, qty: 1, price_cp: 2, said: 'Ten copper to walk in' }] },
    ] });
    assert.ok(r.record.rejected.some((x) => x.rule === 'gate_fee'));
    const s = g.state();
    const own = Object.values(s.offers).filter((o) => o.seller === WATCHMAN && o.status === 'open');
    assert.deepEqual(own.flatMap((o) => o.lines.map((l) => l.what)), ['a pitch torch'], 'the torch stands, the entry does not');
    assert.ok(r.record.corrections.some((c) => /Entry to Glimmerdeep Grotto is fixed by the engine at its gate: its fee is 10 cp, the gate's own offer \(offer\.gate\.glimmerdeep_grotto\)/.test(c)));
    // the narrator's GATE line: the fee is the engine's
    const u = g.chat.length;
    g.chat.push({ mes: '*i look around*', is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: [] })];
    await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    assert.match(turnBlock(g.chat, u, content, {}).context.text, /GATE — .*entry fee 10 cp, the engine's one fixed price \(only when he agrees; nobody asks it twice or sells entry\)/);
});

test('8.1 gate 3: "pay the fee" pays only (he stays at the gate); "enter" afterwards needs no second price; 10 cp in all', async () => {
    const g = live(17);
    await say(g, fx.messages[17].mes);
    await g.reply('The watchman names the toll.', { expected: {}, deltas: [] });
    const before = coin(g);
    await say(g, '*i nod and pay the 10 copper*', PAY);
    assert.match(linesOf(g), /PAYS — the entry fee of Glimmerdeep Grotto, 10 cp/);
    assert.equal(coin(g), before - 10);
    assert.equal(g.state().dungeons[GROTTO].pass.cp, 10);
    await g.reply('The copper changes hands.', { expected: {}, deltas: [] });
    assert.equal(g.state().scene.at, GROTTO, 'paying is no step through the gate');
    await say(g, '*i walk into the gate*', ENTER);
    assert.match(linesOf(g), /GOES — /);
    assert.doesNotMatch(linesOf(g), /ENTRY FEE/);
    await g.reply('He walks in.', { expected: into(), deltas: [] });
    assert.notEqual(g.state().scene.at, GROTTO);
    assert.equal(coin(g), before - 10, 'one fee');
    assert.equal(allEvents(g).filter((e) => e.t === 'coin.changed' && e.d.delta === -10).length, 1);
});

test('8.1 gate 4: "pay and enter" does both in order; "enter" with the fee open stops at the existing offer (no new price, no coin)', async () => {
    const g = live(17);
    await say(g, fx.messages[17].mes);
    await g.reply('The watchman names the toll.', { expected: {}, deltas: [] });
    const before = coin(g);
    await say(g, '*i walk in*', { type: 'go', to: { new: 'into the grotto' }, quote: 'i walk in' });
    assert.match(linesOf(g), /ENTRY FEE — .*10 cp.*offer\.gate\.glimmerdeep_grotto/);
    assert.equal(lastUser(g).events.filter((e) => e.t === 'offer.created').length, 0, 'the offer made at the gate stands');
    assert.equal(coin(g), before);
    await g.reply('The watchman holds up a hand.', { expected: {}, deltas: [] });
    await say(g, fx.messages[23].mes, PAY, ENTER);
    const res = outcomeOf(g).resolutions.map((r) => [r.type, r.status]);
    assert.deepEqual(res, [['offer.accept', 'resolved'], ['go', 'authorized']]);
    assert.equal(coin(g), before - 10);
});

test('8.1 gate 5: a free gate asks nothing; a valid pass asks no new price; a closed or full gate is refused with its card', async () => {
    const g = live(17);
    await say(g, fx.messages[17].mes);
    const s = g.state();
    // the pass he paid: no fee
    const paid = structuredClone(s);
    paid.dungeons[GROTTO].pass = { turn: 9, cp: 10 };
    assert.equal(gateCheck(paid, content, GROTTO), null);
    assert.match(gateCard(paid, content, GROTTO).join('\n'), /Fee: 10 cp, paid \(valid until he comes out\)/);
    // a gate without a fee
    const free = structuredClone(s);
    free.dungeons[GROTTO].gate.fee_cp = 0;
    assert.equal(gateCheck(free, content, GROTTO), null);
    assert.match(gateCard(free, content, GROTTO).join('\n'), /Fee: none/);
    // not registered: refused, no fee asked
    const stranger = structuredClone(s);
    stranger.guild.membership = null;
    assert.match(gateCheck(stranger, content, GROTTO).refuse, /registered Guild members/);
    assert.match(gateCard(stranger, content, GROTTO).join('\n'), /Status: CLOSED to him[\s\S]*ENTRY REFUSED/);
    // full
    const full = structuredClone(s);
    full.dungeons[GROTTO].inside = Object.fromEntries(full.dungeons[GROTTO].parties.map((p) => [p.id, { floor: 1, until: 99999 }]));
    full.dungeons[GROTTO].capacity = 1;
    assert.equal(gateState(full, content, GROTTO).full, true);
    assert.match(gateCard(full, content, GROTTO).join('\n'), /Status: FULL/);
});

test('8.1 gate 6 (§3): a Guild contract for work in this Dungeon (its q.dungeon) waives the fee: the open offer is withdrawn, he enters without paying', async () => {
    const g = live(17);
    await say(g, fx.messages[17].mes);
    await g.reply('The watchman names the toll.', { expected: {}, deltas: [] });
    assert.equal(g.state().offers[GATE_OFFER].status, 'open');
    // a contract booked under 8.1 carries its Dungeon (bookBoard); the live one predates it
    inject(g, [{ t: 'quest.created', d: { quest: { ...g.state().quests[QUEST], dungeon: GROTTO, floor: 1 } } }]);
    assert.equal(waiverOf(g.state(), content, GROTTO)?.id, QUEST);
    assert.match(gateCard(g.state(), content, GROTTO).join('\n'), /Fee: Waived — authorized contract \("Cull the Crystal Beetles of Glimmerdeep's Outer Grottos"\)/);
    const before = coin(g);
    await say(g, '*i walk into the gate*', ENTER);
    assert.ok(lastUser(g).events.some((e) => e.t === 'offer.closed' && e.d.id === GATE_OFFER && e.d.status === 'expired'));
    assert.match(linesOf(g), /GOES — /);
    await g.reply('He walks in.', { expected: into(), deltas: [] });
    assert.equal(coin(g), before);
    assert.notEqual(g.state().scene.at, GROTTO);
});

test('8.1 gate 7 (§3): no waiver for another Dungeon\'s contract, a contract done or given up, a contract of other work, or a gate without that cooperation', async () => {
    const g = live(17);
    await say(g, fx.messages[17].mes);
    const base = g.state();
    const withQuest = (set, gate = {}) => {
        const s = structuredClone(base);
        s.quests[QUEST] = { ...s.quests[QUEST], dungeon: GROTTO, ...set };
        Object.assign(s.dungeons[GROTTO].gate, gate);
        return s;
    };
    assert.ok(gateCheck(withQuest({}), content, GROTTO) === null);
    assert.equal(gateCheck(withQuest({ dungeon: 'loc.old_crown_catacombs' }), content, GROTTO).fee, 10);
    assert.equal(gateCheck(withQuest({ status: 'completed' }), content, GROTTO).fee, 10);
    assert.equal(gateCheck(withQuest({ status: 'abandoned' }), content, GROTTO).fee, 10);
    assert.equal(gateCheck(withQuest({ objectives: [{ id: 'o1', verb: 'DELIVER', what: 'a crate', qty: 1, status: 'open' }] }), content, GROTTO).fee, 10);
    assert.equal(gateCheck(withQuest({}, { contract_free: false }), content, GROTTO).fee, 10);
    // the live contract (booked before 8.1, no q.dungeon): no text of it is read at the gate
    assert.equal(gateCheck(base, content, GROTTO).fee, 10);
    // other rules still hold: unregistered with the contract is refused
    const s = withQuest({});
    s.guild.membership = null;
    assert.ok(gateCheck(s, content, GROTTO).refuse);
});

test('8.1 gate 8: replay, swipe and regenerate of the paying turn pay once; the fold equals the live state', async () => {
    const g = live(17);
    await say(g, fx.messages[17].mes);
    await g.reply('The watchman names the toll.', { expected: {}, deltas: [] });
    await say(g, '*i pay 10 copper*', PAY);
    const first = JSON.stringify(lastUser(g).events);
    const c1 = coin(g);
    for (const type of ['swipe', 'regenerate']) {
        await prepareGenerationAsync(g.chat, content, { type, settings: { planner: true }, llm: async () => { throw new Error('no LLM call'); } });
        assert.equal(JSON.stringify(lastUser(g).events), first, type);
    }
    assert.equal(coin(g), c1);
    assert.deepEqual(foldChat(g.chat).state.dungeons, g.state().dungeons);
    // the whole live chat folds under this build to what the live run recorded
    const s = foldChat(fx.messages).state;
    assert.equal(s.entities[B].status, 'dead');
    assert.equal(s.entities[A].status, 'alive');
    assert.equal(s.entities.pc.sheet.coin_cp, 10, 'the live run paid twice (20 cp)');
});

// ------------------------------------------------------------------------------------------------ B. gate display (§4, §5)
test('8.1 display 1: the gate card on arrival (the live arrival #16), and only then: status, inside/capacity, his party, renewal to the minute, known levels, access, fee, ENTER DUNGEON?', () => {
    const chat = fx.messages.map((m) => structuredClone(m));
    const before = foldChat(chat, 16).state;
    const after = foldChat(chat, 17).state;
    const panel = worldPanel(before, content, { events: rec(chat[16]).events, state: after });
    assert.match(panel, /SYSTEM — DUNGEON GATE · Glimmerdeep Grotto/);
    assert.match(panel, /Status: OPEN · Inside: \d+\/6 · His party: 1 · Cycle 1: renews in 2d 23h/);
    assert.match(panel, /Known levels: level 1: Rank F/);
    assert.match(panel, /Access: registered Guild members · Fee: 10 cp \(the gate's own offer; paid only when he agrees\)/);
    assert.match(panel, /ENTER DUNGEON\? — he goes in when he says so \(this card books nothing\)/);
    // not on an ordinary reply at the gate
    const later = worldPanel(foldChat(chat, 18).state, content, { events: rec(chat[18]).events, state: foldChat(chat, 19).state });
    assert.doesNotMatch(later, /DUNGEON GATE/);
});

test('8.1 display 2: renewal to the minute, never negative; "renewal pending" when due but held; the HUD row says the same', () => {
    const s = foldChat(fx.messages, 17).state;
    const x = s.dungeons[GROTTO];
    const at = (minute, deferred = []) => renewText({ ...s, clock: { minute } }, { ...x, deferred });
    const due = x.cycle_start + x.reset_min;
    assert.equal(at(due - (2 * 1440 + 4 * 60)), 'renews in 2d 4h');
    assert.equal(at(due - 59), 'renews in 59m');
    assert.equal(at(due - 125), 'renews in 2h 5m');
    assert.equal(at(due), 'renewal pending');
    assert.equal(at(due + 500), 'renewal pending');
    assert.match(at(due - 60, [1]), /renews in 1h 0m; level 1 renewal pending \(once he has left it\)/);
    const row = hudRows(s).find((r) => r[0] === 'Dungeon cycle');
    assert.match(row[1], /cycle 1 \(renews in 2d 23h\) · inside: \d+\/6/);
});

test('8.1 display 3: looking at the gate shows its card; a level the record hides is not shown', async () => {
    const g = live(17);
    await say(g, '*i look over the gate and the notice post*', { type: 'activity', kind: 'search', what: 'the gate and the notice post', minutes: 5, until: null, quote: 'i look over the gate and the notice post' });
    assert.ok((outcomeOf(g).engine_lines || []).some((l) => /SYSTEM — DUNGEON GATE/.test(l)));
    const s = structuredClone(g.state());
    s.places[GROTTO].dungeon.hidden = ['level:1'];
    assert.match(gateCard(s, content, GROTTO).join('\n'), /Known levels: none on record/);
});

test('8.1 display 4: the lore says what gate displays are, and Glimmerdeep\'s rights (no retroactive confiscation of loot)', () => {
    const lore = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/lore.json'), 'utf8'));
    const t = lore.entries.find((e) => e.id === 'lore.dungeons').text;
    assert.match(t, /gate manifestation or magic display .* how many are inside .* Ranks of the levels known to it, and when the Dungeon next renews/);
    assert.match(t, /not every natural Dungeon has one/);
    const glim = lore.dungeons.find((d) => d.id === GROTTO);
    assert.match(glim.control, /what they kill and the free crystal there is theirs/);
    assert.equal(glim.living.gate.contract_free, true);
});

// ------------------------------------------------------------------------------------------------ C. group combat (§7)
test('8.1 group 1 (live #25): "Flame Lance Beetle B" brings Beetle A into the same encounter, each with its own Initiative; the lance strikes B alone', async () => {
    const g = live(25);
    await say(g, fx.messages[25].mes, { type: 'use_skill', skill: 'mage.flame_lance', target: B, quote: 'I flame Lance Beetle B' });
    const s = g.state();
    assert.deepEqual(Object.keys(s.encounter.combatants).sort(), [A, B, 'pc'].sort());
    assert.ok(s.encounter.order.includes(A) && s.encounter.order.includes(B));
    const o = outcomeOf(g);
    const lance = o.records.find((r) => r.actor === 'pc');
    assert.deepEqual(lance.strikes.map((k) => k.target), [B]);
    assert.equal(s.encounter.combatants[A].current.hp, s.encounter.combatants[A].fixed.max_hp, 'A is not struck');
    assert.equal(s.encounter.combatants[A].label, 'Glass Beetle A');
    assert.equal(s.encounter.combatants[B].label, 'Glass Beetle B');
});

test('8.1 group 2: the fight against both runs to its end as one encounter; each death and its XP once; no second encounter', async () => {
    const g = live(25);
    inject(g, [{ t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: 80 } }, { t: 'resource.changed', d: { id: 'pc', resource: 'mp', value: 72 } }]);
    await say(g, fx.messages[25].mes, { type: 'use_skill', skill: 'mage.flame_lance', target: B, quote: 'I flame Lance Beetle B' });
    for (let i = 0; i < 12 && g.state().encounter; i++) {
        await g.reply('The fight goes on.', { expected: {}, deltas: [] });
        const enc = g.state().encounter;
        if (!enc) break;
        const t = Object.values(enc.combatants).find((c) => c.side === 'hostile' && c.current.hp > 0)?.id;
        await say(g, '*i basic attack it*', { type: 'use_skill', skill: 'mage.basic_attack', target: t, quote: 'i basic attack it' });
    }
    const ev = allEvents(g).slice(fx.messages.slice(0, 25).flatMap((m) => rec(m)?.events || []).length);
    if (g.state().entities.pc.status === 'dead') return; // a fair fight can be lost: still one encounter
    assert.equal(ev.filter((e) => e.t === 'encounter.started').length, 1, 'one encounter');
    assert.equal(ev.filter((e) => e.t === 'entity.status' && e.d.status === 'dead').length, 2);
    assert.equal(ev.filter((e) => e.t === 'encounter.ended').length, 1);
});

/** A small group of `n` beside him in a V4-C scene (the live gallery's state), as a reply that showed them would store it. */
function groupScene(g, kind, n, { threat = null, anchor = 'wolf', npc = false, aware = 'aware', extra = {} } = {}) {
    const ids = Array.from({ length: n }, (_, i) => `${npc ? 'npc' : 'mon'}.${kind}_${i + 1}`);
    inject(g, ids.flatMap((id) => [
        { t: 'entity.created', d: { entity: { id, kind: npc ? 'npc' : 'creature', name: null, descriptors: [kind], traits: '', status: 'alive', location: g.state().scene.location, created: { turn: g.state().turn, minute: g.state().clock.minute }, ...(npc ? { template: 'commoner' } : { species: kind, anchor }), group: `grp_${kind}`, ...(threat !== null ? { threat } : {}), ...extra } } },
        { t: 'scene.entered', d: { id, band: 'SHORT' } },
        { t: 'scene.awareness', d: { id, level: aware } },
    ]));
    return ids;
}

test('8.1 group 3: a wolf pack defends its member he attacks; a deer herd (no foe: threat false) stays out; peaceful people are not made foes by their group', async () => {
    const g = live(17);
    const wolves = groupScene(g, 'wolf', 3);
    const deer = groupScene(g, 'deer', 3, { threat: false, anchor: 'deer' });
    const folk = groupScene(g, 'pilgrim', 2, { npc: true });
    const s = g.state();
    assert.deepEqual(groupJoiners(s, content, [wolves[0]], { c: true, pcAttacks: true }).now.sort(), wolves.slice(1).sort());
    assert.deepEqual(groupJoiners(s, content, [deer[0]], { c: true, pcAttacks: true }), { now: [], later: [] });
    assert.deepEqual(groupJoiners(s, content, [folk[0]], { c: true, pcAttacks: true }), { now: [], later: [] });
    // the legacy paths are unchanged: no group joins without the planner
    assert.deepEqual(groupJoiners(s, content, [wolves[0]], { c: false, pcAttacks: true }), { now: [], later: [] });
});

test('8.1 group 4: an established hostile group fights together (a story threat, an outlaw\'s role, a Dungeon\'s foes); one fleeing, holding or giving up stays out', async () => {
    const g = live(17);
    const gob = groupScene(g, 'goblin', 3, { anchor: 'goblin' });
    inject(g, [{ t: 'scene.tactical', d: { id: gob[1], relevant: true, threat: true } }]);
    const bandits = groupScene(g, 'bandit', 2, { npc: true, extra: { traits: 'a highway bandit' } });
    inject(g, [{ t: 'fact.asserted', d: { fact: { id: 'f.test.bandit', s: bandits[0], p: 'occupation', o: 'bandit', since: { turn: 1, minute: 0 }, until: null, visibility: 'public', importance: 0.5, hard: false, source: { kind: 'test' } } } }]);
    let s = g.state();
    assert.deepEqual(groupJoiners(s, content, [gob[0]], { c: true }).now.sort(), gob.slice(1).sort(), 'a marked threat of the group makes it hostile');
    assert.deepEqual(groupJoiners(s, content, [bandits[1]], { c: true }).now, [bandits[0]], 'an outlaw of the group makes it hostile');
    inject(g, [{ t: 'intent.set', d: { who: gob[2], intent: 'flee' } }].filter(() => false));
    s = structuredClone(g.state());
    s.pending_intents = { [gob[2]]: 'flee' };
    assert.deepEqual(groupJoiners(s, content, [gob[0]], { c: true }).now, [gob[1]]);
    // the Dungeon's own foes (entity.slot) are a hostile group
    const live25 = foldChat(fx.messages, 25).state;
    assert.deepEqual(groupJoiners(live25, content, [B], { c: true }).now, [A]);
    // dead or surrendered members stay out
    const t = structuredClone(live25);
    t.entities[A].surrendered_to = 'pc';
    assert.deepEqual(groupJoiners(t, content, [B], { c: true }).now, []);
});

test('8.1 group 5 (stealth): an unaware member does not know where he is: an ambush that ends the conflict leaves it out; if the fight goes on it joins after the opening', () => {
    const base = foldChat(fx.messages, 25).state;
    const ambush = (hp) => {
        const s = structuredClone(base);
        s.scene.awareness[A] = 'unaware';
        s.scene.awareness[B] = 'unaware';
        // Patch 8.4: hidden by his stealth (8.1 set none here, and so tested an open attack as a stealthy one; the open
        // one is tests/v4/patch84.test.js)
        s.scene.concealed = ['pc'];
        // a beetle the opening cannot kill (a tough one: a scene the live run did not have), or one it surely kills
        s.entities[B].profile = hp === null ? { ...s.entities[B].profile, hp: 300, max_hp: 300 } : { ...s.entities[B].profile, hp };
        return playerTurn(s, content, '*i flame lance beetle b from hiding*', { msg: 25, c: true, intent: { kind: 'attack', skill: 'mage.flame_lance', target: B, target_how: 'planner', move: null, move_target: null } });
    };
    const quick = ambush(5);
    assert.equal(quick.outcome.started.ambush, true);
    assert.ok(quick.outcome.ended, 'the opening ended it');
    assert.ok(!quick.events.some((e) => e.t === 'encounter.started' && e.d.encounter.combatants[A]), 'A was never forced into it');
    const long = ambush(null);
    assert.equal(long.outcome.started.ambush, true);
    assert.ok(!long.outcome.ended);
    assert.ok(long.state.encounter.combatants[A], 'A joins once the fight goes on past the opening');
    assert.match(long.outcome.started.reason, /Glass Beetle A joins the fight, alerted by it/);
    assert.ok(!long.outcome.records.some((r) => r.actor === A && r.round === 0), 'no Turn replayed for it');
});

test('8.1 group 6: an attack refused before the fight (out of reach) starts nothing and brings no group in; an area attack adds each member once', () => {
    const s = structuredClone(foldChat(fx.messages, 25).state);
    s.scene.positions[B] = { band: 'LONG', cover: 'none' };
    const t = playerTurn(s, content, '*basic attack b*', { msg: 25, c: true, intent: { kind: 'attack', skill: 'mage.basic_attack', target: B, target_how: 'planner', move: null, move_target: null } });
    assert.ok(t.outcome.illegal);
    assert.ok(!t.events.some((e) => e.t === 'encounter.started'));
});

// ------------------------------------------------------------------------------------------------ D. combat truth (§8, §9)
test('8.1 truth 1: the level line counts the met ones from their own fate ("1 of 2 alive; 1 dead"), not "met, still standing"', () => {
    const s = foldChat(fx.messages, 29).state;
    const x = s.dungeons[GROTTO];
    assert.match(floorText(s, x, 1, { all: true }), /2 glass beetle \(foes\): 1 of 2 alive; 1 dead/);
    assert.match(floorText(s, x, 1), /2 glass beetle — 1 of 2 alive; 1 dead/);
    assert.doesNotMatch(floorText(s, x, 1, { all: true }), /met, still standing/);
    assert.doesNotMatch(floorText(s, x, 1), /mineral slime|Glimmer Queen/, 'nothing unmet in his view');
});

test('8.1 truth 2 (live #29): the combat step ends with STATE NOW — BINDING: A alive at its HP, B dead from before, Alaric, the fight goes on; group members go by their kind, not the cut plural', async () => {
    const g = live(29);
    await say(g, fx.messages[29].mes, { type: 'use_skill', skill: 'mage.flame_lance', target: A, quote: 'i Flame Lance Beetle A' });
    const u = g.chat.findLastIndex((m) => m.is_user);
    const text = turnBlock(g.chat, u, content, {}).context.text;
    const enc = g.state().encounter;
    if (enc) {
        const a = enc.combatants[A];
        assert.match(text, new RegExp(`STATE NOW — BINDING \\(end the reply so; no other foe\\): Glass Beetle A alive ${a.current.hp}/${a.fixed.max_hp} HP · Glass Beetle B DEAD \\(earlier\\) · Alaric \\d+/80 HP · fight goes on, Alaric's Turn\\.`));
    } else assert.match(text, /STATE NOW — BINDING .*Glass Beetle A DEAD · Glass Beetle B DEAD \(earlier\).*fight OVER/);
    assert.doesNotMatch(text, /Glass Beetle A \(the dog-sized beetles with glassy faceted sh\)/);
    assert.match(text, /Glass Beetle A \(a glass beetle\)/);
});

test('8.1 truth 3 (§9): the extractor\'s catalog lists the dead of the last turns here (RECENT DEAD), never a ref as a look', () => {
    const s = foldChat(fx.messages, 29).state;
    const cat = extractorCatalog(s, content, { c: true });
    assert.match(cat.text, /RECENT DEAD \(here, killed in the engine's fights; never a creature\.new, never alive, never fleeing\): mon\.glimmerdeep_grotto_c1_l1_e1_2 \[Glass Beetle B\]/);
    assert.match(cat.text, /PRESENT: mon\.glimmerdeep_grotto_c1_l1_e1_1 \[Glass Beetle A\]/);
    assert.doesNotMatch(cat.text, /glimmerdeep_grotto_c1_l1_e1 1/);
});

test('8.1 truth 4 (§9, live #28 and #30): an empty answer (the length cut) gets one short repair, not the same one again; empty twice: nothing applied, the state kept', async () => {
    for (const second of ['', JSON.stringify({ expected: {}, deltas: [] })]) {
        const chat = fx.messages.slice(0, 31).map((m) => structuredClone(m));
        // the reply as it was before its extraction ran (the live record kept the failure of the old repair)
        chat[30].extra.avereth.extraction = { status: 'pending' };
        chat[30].extra.avereth.events = [];
        const calls = [];
        const answers = ['', second];
        const llm = async ({ messages, purpose }) => { calls.push({ purpose, messages }); return answers.shift(); };
        const before = JSON.stringify(foldChat(chat).state.entities);
        await runExtraction(chat, 30, content, llm);
        assert.deepEqual(calls.map((c) => c.purpose), ['extract', 'extract_repair'], 'one repair at most');
        const rep = calls[1].messages;
        assert.match(rep.at(-1).content, /Your previous answer was empty: it ran out of room before the JSON\. Answer now with the JSON object alone/);
        assert.ok(!rep.some((m) => m.role === 'assistant'), 'the empty answer is not repeated back');
        const x = rec(chat[30]).extraction;
        if (second) assert.equal(x.status, 'applied');
        else {
            assert.equal(x.status, 'failed');
            assert.equal(JSON.stringify(foldChat(chat).state.entities), before, 'no partial deltas');
        }
    }
});

test('8.1 truth 5 (§9, live #24): an awareness quote joining two clauses of the reply holds; a clause the reply does not hold is still refused', () => {
    const chat = fx.messages.slice(0, 25).map((m) => structuredClone(m));
    const prose = chat[24].mes;
    const s = foldChat(chat, 25).state; // the beetles as that reply's own creature.new made them
    const group = 'glimmerdeep_grotto_c1_l1_e1';
    const res = (evidence) => import('../../src/v4/identity.js').then(({ resolveRef }) => resolveRef(s, content, group, { scope: 'all', evidence, prose, groups: new Map(), refs: new Map(), single: (r) => r }));
    return Promise.all([
        res("the nearer one's head came up at the sound of his boots; both watched him now").then((r) => assert.equal(r.kind, 'all')),
        res("the nearer one's head came up at the sound of his boots; both charged him at once").then((r) => assert.equal(r.kind, 'unclear')),
    ]);
});

// ------------------------------------------------------------------------------------------------ E. Guild board (§10-12)
const listing = () => {
    const q = foldChat(fx.messages, 12).state.quests[QUEST];
    return { title: q.title, client: q.client, rank: q.rank, level: q.level, qtype: q.qtype, payout_cp: q.payout_cp, task: q.task, desired_end_state: q.desired_end_state, objectives: q.objectives.map(({ id, status, ...o }) => o), proof: [] };
};
const NEED = { branch: 'loc.glassmere', rank: 'Novice', missing: 1, day: 1, have: [], c: true };
function book(l) {
    const s = structuredClone(foldChat(fx.messages, 11).state);
    const p = parseBoard(JSON.stringify({ listings: [l] }), content, NEED, s);
    const events = [];
    bookBoard(s, content, NEED, p.listings, (e) => events.push(e));
    return { p, s, quest: events.find((e) => e.t === 'quest.created')?.d.quest, events };
}

test('8.1 board 1 (live #11): "Cull the Crystal Beetles" asks no more than one cycle of Glimmerdeep holds at the least (2, not 6); its Dungeon and level are booked with it; nothing is established', () => {
    const { quest, events, s } = book(listing());
    assert.equal(quest.objectives.find((o) => o.verb === 'DEFEAT').qty, 2);
    assert.equal(quest.dungeon, GROTTO);
    assert.equal(quest.floor, 1);
    assert.ok(!events.some((e) => e.t === 'dungeon.established'));
    assert.equal(s.dungeons?.[GROTTO], undefined);
    assert.equal(cullPopulation(s, content, GROTTO, (sl) => sl.id === 'beetles'), 2);
    // the live contract keeps its number
    assert.equal(foldChat(fx.messages).state.quests[QUEST].objectives.find((o) => o.verb === 'DEFEAT').qty, 6);
});

test('8.1 board 2: the boss counts only for a contract that names it; a cull of a kind the Dungeon does not hold is no Dungeon cull', () => {
    const queen = { ...listing(), title: 'Slay the Glimmer Queen', objectives: [{ verb: 'DEFEAT', what: 'the Glimmer Queen', qty: 1, unit: null, where: 'Glimmerdeep Grotto level 1' }] };
    assert.equal(book(queen).quest.objectives[0].qty, 1);
    const goblins = { ...listing(), title: 'Cull the Goblins of Glimmerdeep', objectives: [{ verb: 'DEFEAT', what: 'goblin', qty: 5, unit: null, where: 'Glimmerdeep Grotto level 1' }] };
    const r = book(goblins);
    assert.equal(r.p.listings.length, 0);
    assert.match(r.p.refused[0].why, /Glimmerdeep Grotto holds no "goblin" among its renewing foes/);
    // the tally: the queen is no "crystal beetle" of a cull
    const s = structuredClone(foldChat(fx.messages, 29).state);
    s.quests[QUEST].objectives.find((o) => o.verb === 'DEFEAT').qty = 2;
    const id = 'mon.queen_test';
    s.entities[id] = { id, kind: 'creature', species: 'crystal beetle queen', status: 'dead', slot: { dungeon: GROTTO, cycle: 1, floor: 1, id: 'queen', role: 'boss' }, met_at: s.scene.at };
    s.facts[`f.${id}.status`] = { id: `f.${id}.status`, s: id, p: 'status', o: 'dead', since: { turn: s.turn, minute: s.clock.minute }, until: null, hard: true, visibility: 'public', importance: 0.9, source: { kind: 'engine' } };
    assert.equal(defeatTally(s, content, s.quests[QUEST])[0].killed, 1, 'Beetle B only, not the queen');
});

test('8.1 board 3 (§11): reading the board shows the official listings in the System card: title, count, Rank, client, reward, goal', async () => {
    // the live board's five listings as the generator wrote them (#11)
    const live11 = rec(fx.messages[11]).events.filter((e) => e.t === 'quest.created').map((e) => e.d.quest);
    const listings = live11.map((q, i) => ({ id: `quest.l${i}`, title: q.title, client: q.client, rank: q.rank, level: q.level, qtype: q.qtype, payout_cp: q.payout_cp, task: q.task, desired_end_state: q.desired_end_state, objectives: q.objectives.map(({ id, status, ...o }) => o), proof: q.proof.map(({ id, ...p }) => p) }));
    const g = new Chat4(content, { listings, greeting: fx.messages[0].mes });
    g.chat = fx.messages.slice(0, 11).map((m) => structuredClone(m));
    g.listings = listings;
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    await say(g, fx.messages[11].mes, { type: 'board.read', rank: null, quote: 'i walk over to the quest board and look at it' });
    const card = outcomeOf(g).engine_lines || [];
    assert.equal(card[0], 'SYSTEM — GUILD BOARD · Novice · Glassmere');
    assert.match(card[1], /^Cull the Crystal Beetles of Glimmerdeep's Outer Grottos \(2\) · Novice · client: Warden Ellas Vane, Glimmerdeep Cleft Warden for the Amberveil Academy · reward: 60 cp \(6 Silver\) · Enter Glimmerdeep Grotto level 1/);
});

test('8.1 board 4 (§12, live #12): "wool cart notice — taken" while the board lists it is refused, with the board\'s truth; a story clause adds no term', () => {
    const s = foldChat(fx.messages, 12).state;
    const contracts = Object.values(s.quests).filter((q) => q.kind === 'guild_contract').map((q) => ({ id: q.id, title: q.title, payout_cp: q.payout_cp, client: q.client, status: q.status }));
    const r = firewall([{ seq: 1, type: 'fact', s: 'wool cart notice', p: 'taken', o: 'the stocky adventurer plucked the wool cart notice off the board and carried it toward the counter' }], { contracts, c: true, inGuildHall: true });
    assert.equal(r.reject[0]?.rule, 'engine_owned_fact');
    assert.match(r.corrections[0], /"Escort a Wool Cart to the Millbridge Ford" is still LISTED on the Guild board/);
    // an ordinary fact of the hall stays
    assert.equal(firewall([{ seq: 1, type: 'fact', s: 'the board', p: 'stands', o: 'beside the stairs' }], { contracts, c: true, inGuildHall: true }).accept.length, 1);
});

test('8.1 board 5: the contract\'s memory says its goal, count, payout and status are its whole terms; its HUD count is the booked number', async () => {
    const g = live(17);
    inject(g, [{ t: 'quest.created', d: { quest: { ...g.state().quests[QUEST], dungeon: GROTTO, objectives: g.state().quests[QUEST].objectives.map((o) => (o.verb === 'DEFEAT' ? { ...o, qty: 2 } : o)) } } }]);
    await say(g, '*i look around*');
    const u = g.chat.findLastIndex((m) => m.is_user);
    assert.match(turnBlock(g.chat, u, content, {}).context.text, /payout: 60 cp \(paid only by the Guild on explicit accepted turn-in\) \| these are its whole terms: no clause the story adds binds it/);
    assert.equal(goalText(g.state(), content, g.state().quests[QUEST]), ' — 0/2 defeated');
});

test('8.1 group 7: squaring up to Beetle B (engage) and Beetle B rushing him (the reply\'s commitment) both bring Beetle A in; two of four wolves on a road still stay two (Patch 5)', async () => {
    const base = foldChat(fx.messages, 25).state;
    const eng = playerTurn(structuredClone(base), content, '*i ready my staff against beetle b*', { msg: 25, c: true, intent: { kind: 'engage', targets: [B] } });
    assert.deepEqual(Object.keys(eng.state.encounter.combatants).sort(), [A, B, 'pc'].sort());
    const g = live(25);
    await say(g, '*i wait*');
    await g.reply('Beetle B rushes him.', { expected: {}, deltas: [{ seq: 1, type: 'hostile', by: [B], scope: null, evidence: 'Beetle B rushes him' }] });
    const s = g.state();
    assert.ok(s.encounter, rec(g.chat.at(-1)).rejected?.map((x) => x.rule).join(','));
    assert.deepEqual(Object.keys(s.encounter.combatants).sort(), [A, B, 'pc'].sort(), 'the Dungeon\'s encounter attacks together');
});
