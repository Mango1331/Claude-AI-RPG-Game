// Regression cases of the SillyTavern live run of 30.09.2026 (build 4.0.8, the ChatGPT experiment branch): the Novice
// board, the escort of Aldsa's wool cart with the four wolves at the Ford Narrows, the turn-in and the tavern. Written
// for 4.0.9 by the experiment branch and revised in the integration (docs/INTEGRATION_4_1.md): companions arrive with
// Alaric by arrive.with instead of a role-guessing party bookmark, a person known without a name is named by
// person.named, people who stay behind stay at their place, JOURNEY READY comes from the journey he has begun, a large
// passive large fauna may be background from scene context, and loose coin is never an item.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { awardXp, defeatXp, questXp } from '../../src/progression.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { guardCommands } from '../../src/v4/agency.js';
import { buildCatalog, journeyReady } from '../../src/v4/catalog.js';
import { firewall } from '../../src/v4/firewall.js';
import { parseExtraction } from '../../src/v4/extract.js';
import { playerActionsBlock } from '../../src/context.js';

const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));

async function created() {
    const g = new Chat4(content, { listings: gold.board_generator.listings });
    const warrior = content.classes.get('warrior');
    await g.player('Warrior');
    await g.player(warrior.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    return g;
}

const NOBODY = { registration: false, grants: [], turnIns: [], accepted: [] };
/** The state after a player turn whose outcome authorised `auth` (the rest of state.last as the engine keeps it). */
function after(state, { input = 'We go on.', auth = {}, expected_keys = {}, actions = [] } = {}) {
    const s = structuredClone(state);
    s.last = {
        ...s.last, input,
        outcome: {
            kind: 'v4', actions, extra: [], resolutions: [], expected_keys, conditionals: [], booked: NOBODY, search_checks: [], check_die: null,
            auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120, ...auth },
        },
    };
    return s;
}
const TRAVEL = { go: { seq: 1 }, gos: [{ seq: 1, to: null, name: 'the established journey' }], roam: true, timeCap: 720 };

/** The escort as the run had it: Aldsa's contract from the Redmarch board, her driver and her at the verge with Alaric. */
function escort(state, { objective = 'ESCORT' } = {}) {
    const s = structuredClone(state);
    const person = (id, role) => ({ id, kind: 'npc', name: null, descriptors: [role], traits: role, status: 'alive', location: 'loc.redmarch', created: { turn: s.turn, minute: s.clock.minute }, source: { kind: 'narration' }, card: {}, template: 'commoner' });
    s.entities['npc.wool_driver'] = person('npc.wool_driver', 'wool cart driver');
    s.entities['npc.wool_factor'] = person('npc.wool_factor', 'wool factor');
    s.scene.present = ['pc', 'npc.wool_driver', 'npc.wool_factor'];
    s.quests['quest.cart'] = {
        id: 'quest.cart', title: 'Shepherd Cart to Millbrook', kind: 'guild_contract', status: 'active', rank: 'Novice', level: 2, qtype: 'standard',
        payout_cp: 90, client: 'Aldsa Corren, wool factor', desired_end_state: 'the wool cart reaches Millbrook', details: [], notes: [], history: [], proof: [],
        objectives: [{ id: 'o1', verb: objective, what: 'the wool cart to Millbrook', qty: 1, unit: 'cart', where: 'Millbrook', status: 'open' }],
        source: { board: 'loc.redmarch.guild_hall', branch: 'loc.redmarch' },
    };
    return s;
}
const FORD = { new: { name: 'Ford Narrows', kind: 'wilderness', parent: 'realm.veyrhold' } };
const rules = (r) => r.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule);

test('XP: four same-rank Level-1 wolves and the Level-2 standard escort reach Level 2 with 8 XP carried over (Core #25)', () => {
    const wolf = defeatXp(1, 'normal', 'F', content);
    const quest = questXp(2, 'standard', content);
    assert.deepEqual([wolf, quest, 4 * wolf + quest], [12, 60, 108], 'the run had 4 × 10 + 40 = 80: no Level-up');
    const events = awardXp({ level: 1, class: 'warrior', xp: 4 * wolf }, quest, content, 'Quest XP');
    assert.equal(events.find((e) => e.t === 'level.up')?.d.level, 2);
    assert.equal(events.find((e) => e.t === 'level.up')?.d.xp_after, 8);
});

test('a present return journey with "came from" is not dropped as a remembered one', () => {
    const quote = 'I walk back along the road I came from';
    const guard = guardCommands(quote, [{ seq: 1, type: 'go', to: { new: 'back along the road' }, quote }], {});
    assert.equal(guard.kept.length, 1);
    assert.equal(guard.dropped.length, 0);
});

test('C1: the listings a board has just shown cannot be taken away in the reply that shows them', async () => {
    const g = await created();
    await g.player('I go to the Guild hall.', [{ seq: 1, type: 'go', to: 'loc.redmarch.guild_hall', quote: 'I go to the Guild hall' }]);
    await g.reply('Alaric reached the Guild hall.', { expected: { 1: { arrived: true, at: 'loc.redmarch.guild_hall' } }, deltas: [{ seq: 1, type: 'arrive', at: 'loc.redmarch.guild_hall', forced_by: null }] });
    assert.ok(!Object.values(g.state().quests).length, 'no board before he reads it');
    await g.player('I read the Novice Board.', [{ seq: 1, type: 'board.read', rank: 'Novice', quote: 'I read the Novice Board' }]);
    const visible = g.state().last.outcome.board.listings;
    assert.equal(visible.length, 5);
    const r = await g.reply('Five jobs are freshly chalked; the clerk says somebody took the first this morning.', {
        expected: {}, deltas: [{ seq: 1, type: 'listing.gone', listing: visible[0], why: 'taken_by_other' }],
    });
    assert.deepEqual(rules(r.record), ['board_first_display']);
    assert.equal(g.state().quests[visible[0]].status, 'listed');
    assert.ok(r.record.corrections.some((c) => /remains AVAILABLE/.test(c)));
});

test('C2: the companions an arrival names arrive with Alaric; who is not named stays at the old place, where the story finds that same person again', async () => {
    const g = await created();
    let s = after(escort(g.state()), { auth: TRAVEL });
    const ford = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: FORD, forced_by: null, with: ['npc.wool_driver'] }] }, { msg: 100 });
    assert.deepEqual(ford.rejected, []);
    assert.deepEqual(ford.state.scene.present, ['pc', 'npc.wool_driver'], 'the driver came along, the factor stayed');
    assert.equal(ford.state.entities['npc.wool_factor'].at, 'loc.redmarch.verge');
    assert.ok(!ford.events.some((e) => e.t === 'journey.party'), 'no party bookmark');
    // back at the verge: the driver comes back with him; the factor is not put back into the scene by the engine (only the
    // story knows whether he waited), and when the story has him there, "the wool factor" is that same factor
    s = after(ford.state, { auth: TRAVEL });
    const back = applyWorld(s, content, { expected: {}, deltas: [
        { seq: 1, type: 'arrive', at: 'loc.redmarch.verge', forced_by: null, with: ['npc.wool_driver'] },
        { seq: 2, type: 'enter', who: 'the wool factor' },
    ] }, { msg: 102 });
    assert.deepEqual(back.rejected, []);
    assert.deepEqual([...back.state.scene.present].sort(), ['npc.wool_driver', 'npc.wool_factor', 'pc']);
    const alone = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: 'loc.redmarch.verge', forced_by: null, with: null }] }, { msg: 102 });
    assert.deepEqual(alone.state.scene.present, ['pc'], 'nobody reappears by himself');
    // someone who walked off is not waiting there
    s = after(back.state);
    const gone = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'leave', who: 'npc.wool_factor' }] }, { msg: 104 });
    assert.equal(gone.state.entities['npc.wool_factor'].at, null);
});

test('C2: an arrival answered only as an expected go brings its "with" along too; a with of someone not here is refused', async () => {
    const g = await created();
    const s = after(escort(g.state()), { auth: TRAVEL, expected_keys: { 1: 'go' } });
    const r = applyWorld(s, content, { expected: { 1: { arrived: true, at: FORD, with: ['npc.wool_driver', 'npc.wool_factor', 'npc.nobody'] } }, deltas: [] }, { msg: 100 });
    assert.deepEqual([...r.state.scene.present].sort(), ['npc.wool_driver', 'npc.wool_factor', 'pc']);
    assert.deepEqual(rules(r), ['world_rule'], 'npc.nobody is no one');
    // an answer that leaves with out is valid: with is optional there, like a |null delta field
    const p = parseExtraction(JSON.stringify({ expected: { 1: { arrived: true, at: null } }, deltas: [] }), content.deltaVocab, {}, { 1: 'go' });
    assert.equal(p.valid, true, p.errors.join('; '));
});

test('C2: the story naming the anonymous driver names that driver (person.new of the name later reuses him); "person.aldsa_corren" finds Aldsa', async () => {
    const g = await created();
    const s = after(escort(g.state()));
    const named = applyWorld(s, content, { expected: {}, deltas: [
        { seq: 1, type: 'person.named', who: 'npc.wool_driver', name: 'Dren' },
        { seq: 2, type: 'person.named', who: 'npc.wool_factor', name: 'Aldsa' },
    ] }, { msg: 103 });
    assert.deepEqual(named.rejected, []);
    assert.equal(named.state.entities['npc.wool_driver'].name, 'Dren');
    const again = applyWorld(after(named.state), content, { expected: {}, deltas: [
        { seq: 1, type: 'person.new', ref: 'person.dren', name: 'Dren', role: 'wool cart driver', desc: [], present: true, at: null, band: 'SHORT' },
        { seq: 2, type: 'attitude', who: 'person.aldsa_corren', delta: 10, why: 'he walked up to the wolf' },
    ] }, { msg: 105 });
    assert.deepEqual(again.rejected, []);
    assert.equal(Object.values(again.state.entities).filter((e) => e.kind === 'npc' && e.name === 'Dren').length, 1, 'one Dren');
    assert.ok(again.events.some((e) => e.t === 'relation.set' && e.d.rel.a === 'npc.wool_factor' && e.d.rel.type === 'attitude'), 'the attitude reaches Aldsa');
    // a person already named otherwise is not renamed
    const rename = applyWorld(after(named.state), content, { expected: {}, deltas: [{ seq: 1, type: 'person.named', who: 'npc.wool_driver', name: 'Piet' }] }, { msg: 107 });
    assert.deepEqual(rules(rename), ['world_rule']);
    assert.equal(rename.state.entities['npc.wool_driver'].name, 'Dren');
});

test('C4: JOURNEY READY comes from the contract: an escort he has set off on can be continued without anyone of it being present', async () => {
    const g = await created();
    const s = escort(g.state());
    assert.equal(journeyReady(s), null, 'accepted, not begun: no journey (review of 4.1.0)');
    // the story stored the trip with the driver, who is here: he agrees to go on, and the journey has begun
    s.quests['quest.cart'].notes = ['Alaric walks beside the wool cart driver on the river road'];
    assert.equal(journeyReady(s)?.contact, 'npc.wool_driver');
    const start = [];
    const go = resolveCommands(s, content, [{ seq: 1, type: 'journey.continue', quote: 'we set off' }], (e) => start.push(e));
    assert.equal(go.resolutions[0].status, 'authorized');
    assert.deepEqual(start.filter((e) => e.t === 'quest.journey').map((e) => e.d.id), ['quest.cart']);
    const begun = structuredClone(s);
    begun.quests['quest.cart'].journey = { since: begun.turn, from: begun.scene.at };
    const ford = applyWorld(after(begun, { auth: TRAVEL }), content, { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: FORD, forced_by: null, with: null }] }, { msg: 100 }).state;
    assert.deepEqual(ford.scene.present, ['pc'], 'nobody came along in this answer');
    assert.equal(journeyReady(ford)?.id, 'quest.cart');
    assert.match(buildCatalog(ford, content).journey_ready, /^quest\.cart — "Shepherd Cart to Millbrook": the contract's journey is underway/);
    const events = [];
    const ctx = resolveCommands(ford, content, [{ seq: 1, type: 'journey.continue', quote: 'then we continue' }], (e) => events.push(e));
    assert.equal(ctx.resolutions[0].status, 'authorized');
    assert.equal(ctx.auth.roam, true);
    // once the outcome is reached, there is no journey left to continue
    const ready = structuredClone(ford);
    ready.quests['quest.cart'].ready = true;
    assert.equal(journeyReady(ready), null);
});

test('C3: an escort is not ready in a reply whose arrival the engine refused; other work of that reply may be', async () => {
    const g = await created();
    const s = escort(g.state());
    // no number on the wolves: the engine's kill count (4.1.2) is not what this case is about
    s.quests['quest.wolves'] = { ...structuredClone(s.quests['quest.cart']), id: 'quest.wolves', title: 'Wolves on the River Road', objectives: [{ id: 'o1', verb: 'DEFEAT', what: 'the wolf pack', qty: null, unit: null, where: 'river road', status: 'open' }] };
    const r = applyWorld(after(s, { input: 'I wait here' }), content, { expected: {}, deltas: [
        { seq: 1, type: 'arrive', at: { new: { name: 'Millbrook', kind: 'settlement', parent: 'realm.veyrhold' } }, forced_by: null, with: null },
        { seq: 2, type: 'quest.ready', quest: 'quest.cart', note: 'the wool cart is safe' },
        { seq: 3, type: 'quest.ready', quest: 'quest.wolves', note: 'the four wolves are dead' },
    ] }, { msg: 105 });
    assert.deepEqual(rules(r), ['no_go', 'quest_dependency']);
    assert.notEqual(r.state.quests['quest.cart'].ready, true, 'however the note is worded');
    assert.equal(r.state.quests['quest.wolves'].ready, true, 'the dead wolves do not depend on where he is');
    assert.ok(r.corrections.some((c) => /"Shepherd Cart to Millbrook" is still IN PROGRESS/.test(c)));
});

test('C5 notemp: large uncommitted fauna may stay background; hostile groups and hunting targets stay individual', async () => {
    const g = await created();
    const s = after(escort(g.state()));
    const count = (r, species) => Object.values(r.state.entities).filter((e) => e.kind === 'creature' && e.species === species).length;
    const sheep = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'sheep', species: 'sheep', anchor: 'deer', desc: ['penned in a corner of the yard'], count: 12, present: true, band: 'MEDIUM' }] }, { msg: 106 });
    assert.equal(count(sheep, 'sheep'), 0);
    assert.ok(sheep.events.some((e) => e.t === 'fact.asserted' && e.d.fact.p === 'background_fauna' && e.d.fact.o === '12 sheep'));
    const wolves = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'wolves', species: 'wolf', anchor: 'wolf', desc: ['watching from the ridge'], count: 5, present: true, band: 'LONG' }] }, { msg: 107 });
    assert.equal(count(wolves, 'wolf'), 0, 'without a hidden species-behaviour tag, an uncommitted large pack may remain background');
    assert.ok(wolves.events.some((e) => e.t === 'fact.asserted' && e.d.fact.p === 'background_fauna' && e.d.fact.o === '5 wolf'));
    const stampede = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'stags', species: 'stag', anchor: 'deer', desc: ['rutting'], count: 6, present: true, band: 'SHORT' }, { seq: 2, type: 'hostile', by: ['stags'] }] }, { msg: 108 });
    assert.equal(count(stampede, 'stag'), 6, 'a group that attacks is individual');
    const job = structuredClone(s);
    job.quests['quest.rats'] = { ...structuredClone(job.quests['quest.cart']), id: 'quest.rats', title: 'Rats in the Grain Cellars', objectives: [{ id: 'o1', verb: 'DEFEAT', what: 'the rats in the grain cellars', qty: null, unit: null, where: 'grain cellars', status: 'open' }] };
    const rats = applyWorld(job, content, { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'rats', species: 'cellar rat', anchor: 'rat', desc: ['in the grain sacks'], count: 8, present: true, band: 'SHORT' }] }, { msg: 109 });
    assert.equal(count(rats, 'cellar rat'), 8, 'the rats a contract is to defeat are its targets');
    job.quests['quest.hounds'] = { ...structuredClone(job.quests['quest.cart']), id: 'quest.hounds', title: 'Bog Hounds at the Reed Docks', objectives: [{ id: 'o1', verb: 'DEFEAT', what: 'the bog hound pack', qty: null, unit: null, where: 'Reed Docks', status: 'open' }] };
    delete job.quests['quest.rats'];
    const flock = applyWorld(job, content, { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'sheep', species: 'sheep', anchor: 'deer', desc: ['penned'], count: 12, present: true, band: 'MEDIUM' }] }, { msg: 110 });
    assert.equal(count(flock, 'sheep'), 0, 'a hound job makes no flock of sheep its targets');
});

test('C6: loose coin is never an item: taking the paid-out copper books nothing more; loot coin is coin.gift; the Guild pays nobody twice', async () => {
    const g = await created();
    const s = g.state();
    s.entities.pc.sheet.coin_cp = 120;
    const events = [];
    const ctx = resolveCommands(s, content, [{ seq: 1, type: 'take', object: { new: 'the copper' }, qty: null, quote: 'I take the copper' }], (e) => events.push(e));
    assert.equal(ctx.resolutions[0].status, 'authorized', 'not refused: coin can be his to take');
    assert.match(ctx.actions[0], /coin counts in his purse \(coin the engine already paid him is not counted again\)/);
    const t = after(s, { auth: { take: [1], takeNames: { 1: 'the copper' } }, expected_keys: { 1: 'take' } });
    const took = applyWorld(t, content, { expected: { 1: { taken: true } }, deltas: [{ seq: 1, type: 'object.new', name: '90 copper', kind: 'item', qty: 1, unit: null, holder: 'pc', for_quest: null }] }, { msg: 64 });
    assert.ok(!Object.values(took.state.objects).length, 'no phantom "copper"');
    assert.deepEqual(rules(took), ['currency_wallet']);
    assert.equal(took.state.entities.pc.sheet.coin_cp, 120);
    // a pile of coin lying about is no object either; what he takes of it is coin, when he takes it (review of 4.1.0)
    const deltas = [
        { seq: 1, type: 'object.new', name: 'a pile of silver', kind: 'item', qty: 1, unit: null, holder: 'here', for_quest: null },
        { seq: 2, type: 'coin.gift', from: 'the dead bandit\'s purse', cp: 14, why: 'coins found on the bandit' },
        { seq: 3, type: 'object.new', name: 'a coin purse', kind: 'item', qty: 1, unit: null, holder: 'here', for_quest: null },
    ];
    const told = applyWorld(after(s), content, { expected: {}, deltas }, { msg: 70 });
    assert.equal(told.state.entities.pc.sheet.coin_cp, 120, 'the story alone does not put coin in his purse');
    const loot = applyWorld(after(s, { auth: { take: [1], takeNames: { 1: 'the bandit\'s coins' } }, expected_keys: { 1: 'take' } }), content, { expected: { 1: { taken: true } }, deltas }, { msg: 70 });
    assert.equal(loot.state.entities.pc.sheet.coin_cp, 134);
    assert.deepEqual(Object.values(loot.state.objects).map((o) => o.name), ['a coin purse'], 'a purse is a thing; the coins he took are no object');
    // the payout of a contract that was just turned in, handed over in the story: refused
    const fw = firewall([{ seq: 1, type: 'coin.gift', from: 'npc.tidecross_guild_desk_clerk', cp: 90, why: 'Guild payout for the shepherd cart' }],
        { contracts: [{ id: 'quest.cart', title: 'Shepherd Cart to Millbrook', payout_cp: 90, status: 'completed' }], booked: { ...NOBODY, turnIns: ['quest.cart'] }, inGuildHall: true });
    assert.deepEqual(fw.reject.map((x) => x.rule), ['guild_payout']);
});

test('quest.detail may restate the posted payout in any coin and keep route memory; a changed or withheld payout is refused', () => {
    const ctx = { contracts: [{ id: 'quest.cart', title: 'Shepherd Cart', payout_cp: 90, status: 'active' }] };
    const note = (n) => firewall([{ seq: 1, type: 'quest.detail', quest: 'quest.cart', note: n, schedule: null }], ctx);
    for (const ok of ['Meet Aldsa by the wool shed; posted reward 90 cp; take the river road.', 'payout nine silver on return to the Guild hall', 'A 5 cp road toll is charged by the ferryman.']) assert.equal(note(ok).accept.length, 1, ok);
    for (const bad of ['The Guild reward is now 150 cp; the previous posted reward was 90 cp.', 'Aldsa will not pay if the flock loses a sheep.', 'the reward was doubled by the clerk']) assert.equal(note(bad).accept.length, 0, bad);
});

test('C7: an unpriced purchase is a hard stop before payment, service or consumption; invented consent counts as taken_anyway', () => {
    const text = playerActionsBlock({ actions: ['1. WANTS — water; no price is known.'], extra: [], resolutions: [{ type: 'buy', status: 'pending' }], search_checks: [] });
    assert.match(text, /PENDING TRADE IS A HARD STOP/);
    assert.match(text, /BEFORE any payment, delivery, drinking/);
    assert.match(content.deltaVocab.expected.buy.summary, /a nod or consent the reply invents for him is no agreement/);
    assert.match(content.deltaVocab.expected.pay.summary, /a nod or consent the reply invents for him is no agreement/);
});
