// Runtime V4 4.1.2: the parts of the live run of 30.09.2026 14:56 (docs/INTEGRATION_4_1.md §9) one by one, each with
// the case the run got wrong and the case that must stay as it was. The run itself is replayed in live_0930b.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { catalogPlaces } from '../../src/v4/catalog.js';
import { guardCommands } from '../../src/v4/agency.js';
import { parseExtraction, extractorSystem } from '../../src/v4/extract.js';
import { parseBoard, defeatTally, tallyText, isHunt } from '../../src/v4/guild.js';
import { namesKind } from '../../src/v4/domain.js';
import { deedsOf, parseIntent } from '../../src/intent.js';
import { setFactEvents } from '../../src/knowledge.js';

const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));
const TASK = 'Escort the Harrow mill flour cart down the south road to the waystation.';

async function created(listings = gold.board_generator.listings) {
    const g = new Chat4(content, { listings });
    const warrior = content.classes.get('warrior');
    await g.player('Warrior');
    await g.player(warrior.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    return g;
}
const base = (await created()).state();

function play(state, commands) {
    const s = structuredClone(state);
    const ctx = resolveCommands(s, content, commands, (e) => applyEvent(s, e));
    return { s, ctx };
}
function after(s, ctx) {
    const t = structuredClone(s);
    t.last = { ...t.last, input: 'x', outcome: { kind: 'v4', actions: [], extra: [], resolutions: ctx?.resolutions || [], expected_keys: ctx?.expectedKeys || {}, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] }, search_checks: [], check_die: null,
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120, ...(ctx?.auth || {}) } } };
    return t;
}
const at = (s, place, location) => { s.scene.at = place; s.scene.location = location; s.scene.present = ['pc']; return s; };
function hunt(s, qty = 4, what = 'wolves') {
    s.quests['quest.wolves'] = { id: 'quest.wolves', title: 'Wolves at the Fold', kind: 'guild_contract', status: 'active', rank: 'Novice', level: 1, qtype: 'standard', payout_cp: 90, client: 'a shepherd',
        desired_end_state: 'the pack no longer harries the fold', details: [], notes: [], proof: [{ id: 'p1', kind: 'object', what: 'wolf ears', qty, unit: 'pair' }],
        objectives: [{ id: 'o1', verb: 'DEFEAT', what, qty, unit: null, where: null, status: 'open' }],
        history: [{ turn: s.turn, minute: s.clock.minute, status: 'active' }], source: { board: 'loc.redmarch.guild_hall', branch: 'loc.redmarch' } };
    return s;
}
/** A creature of the kind that died on this turn (the engine's status fact, as a fight leaves it). */
function killed(s, id, species, anchor) {
    s.entities[id] = { id, kind: 'creature', species, anchor, name: null, descriptors: [species], status: 'alive', location: s.scene.location, at: s.scene.at, created: { turn: s.turn, minute: s.clock.minute }, source: { kind: 'narration' }, card: {} };
    for (const e of setFactEvents(s, { s: id, p: 'status', o: 'dead', source: { kind: 'combat' } })) applyEvent(s, e);
    return s;
}
const rules = (r) => r.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule);

// ------------------------------------------------------------------------------------------------ board task
test('the board shows what a notice asks him to do; the desired end state stays the engine\'s memory', async () => {
    const listings = gold.board_generator.listings.map((l, i) => (i === 0 ? { ...l, task: TASK } : l));
    const g = await created(listings);
    await g.player('I go to the Guild hall.', [{ seq: 1, type: 'go', to: 'loc.redmarch.guild_hall', quote: 'I go to the Guild hall' }]);
    await g.reply('Alaric reached the Guild hall.', { expected: { 1: { arrived: true, at: 'loc.redmarch.guild_hall' } }, deltas: [{ seq: 1, type: 'arrive', at: 'loc.redmarch.guild_hall', forced_by: null }] });
    await g.player('I read the Novice Board.', [{ seq: 1, type: 'board.read', rank: 'Novice', quote: 'I read the Novice Board' }]);
    const line = g.state().last.outcome.actions[0];
    assert.match(line, new RegExp(`\\*\\*Miller's Run Escort\\*\\* — client: Harrow's mill · reward: 80 cp · ${TASK.replace(/\./g, '\\.')}`));
    assert.match(line, /\*\*Weasel Sign at Fenwick's Coop\*\* — .* · the henhouse raider dead/, 'a listing without a task shows its end state, as before');
    const q = Object.values(g.state().quests).find((x) => x.title === "Miller's Run Escort");
    assert.equal(q.task, TASK);
    assert.equal(q.desired_end_state, 'the flour cart delivered to the south-road waystation', 'kept apart');
});

test('the generator\'s listing may carry task or leave it out; a task that is no string is refused', () => {
    const one = (extra) => JSON.stringify({ listings: [{ title: 'Wolves at the Fold', client: 'a shepherd', rank: 'Novice', level: 1, qtype: 'standard', payout_cp: 60, ...extra,
        desired_end_state: 'the pack no longer harries the fold', objectives: [{ verb: 'DEFEAT', what: 'wolves', qty: 3, unit: null, where: null }], proof: [{ kind: 'object', what: 'wolf ears', qty: 3, unit: 'pair', on: null, consume: null }] }] });
    const need = { rank: 'Novice', missing: 1 };
    assert.equal(parseBoard(one({ task: 'Hunt down the wolves harrying the fold.' }), content, need).listings[0].task, 'Hunt down the wolves harrying the fold.');
    assert.equal(parseBoard(one({}), content, need).listings[0].task, null);
    assert.equal(parseBoard(one({ task: null }), content, need).listings[0].task, null);
    assert.equal(parseBoard(one({ task: 7 }), content, need).listings, null);
});

// ------------------------------------------------------------------------------------------------ hunt proof
test('a hunt\'s acceptance names its proof: trophies at a Guild hall, no local inspection or signature', () => {
    assert.equal(isHunt(hunt(structuredClone(base)).quests['quest.wolves'], content), true);
    assert.equal(isHunt({ objectives: [{ verb: 'ESCORT', what: 'a cart' }] }, content), false);
    const s = at(structuredClone(base), 'loc.redmarch.guild_hall', 'loc.redmarch');
    s.guild.membership = { rank: 'Novice', since: { turn: 1, minute: 0 }, branch: 'loc.redmarch' };
    hunt(s).quests['quest.wolves'].status = 'listed';
    s.quests['quest.wolves'].history = [];
    const acc = play(s, [{ seq: 1, type: 'quest.accept', quest: 'quest.wolves', quote: 'I take the wolves' }]);
    assert.match(acc.ctx.actions?.[0] ?? acc.ctx.resolutions[0].line, /Proof: .*wolf ears brought to a Guild hall; no local inspection, witness or signature is required\./);
});

// ------------------------------------------------------------------------------------------------ the way back
test('"the guild building" is the Guild hall: the one of the town he is in, out in the wilds the one of his contract', () => {
    const go = (s, to = { new: 'the guild building' }) => {
        const { ctx } = play(s, [{ seq: 1, type: 'go', to, quote: 'walk to the guild building' }]);
        return { status: ctx.resolutions[0].status, reason: ctx.resolutions[0].reason, to: ctx.auth.gos[0]?.to, hall: ctx.auth.gos[0]?.hall };
    };
    const street = structuredClone(base);
    assert.notEqual(street.scene.at, 'loc.redmarch.guild_hall');
    assert.deepEqual(go(street), { status: 'authorized', reason: undefined, to: 'loc.redmarch.guild_hall', hall: true });
    const wilds = hunt(at(structuredClone(base), 'realm.veyrhold', 'realm.veyrhold'));
    assert.deepEqual(go(wilds), { status: 'authorized', reason: undefined, to: 'loc.redmarch.guild_hall', hall: true });
    assert.equal(go(at(structuredClone(base), 'loc.redmarch.guild_hall', 'loc.redmarch')).reason, 'already here', 'no second Guild place inside the hall');
    // a place that is no Guild building stays a new place
    assert.deepEqual(go(street, { new: 'the reedbeds' }), { status: 'authorized', reason: undefined, to: null, hall: false });
});

test('out in the wilds the catalog lists the Guild halls of the realm\'s towns and the places play made in the realm', () => {
    const s = at(structuredClone(base), 'realm.veyrhold', 'realm.veyrhold');
    s.places['realm.veyrhold.weirs'] = { id: 'realm.veyrhold.weirs', name: 'eel-weirs', kind: 'site', parent: 'realm.veyrhold', by: 'reply', tags: [] };
    const ids = catalogPlaces(s).map((p) => p.id);
    assert.ok(ids.includes('loc.redmarch.guild_hall'), ids.join(', '));
    assert.ok(ids.includes('realm.veyrhold.weirs'));
    const town = catalogPlaces(at(structuredClone(base), 'loc.redmarch.verge', 'loc.redmarch')).map((p) => p.id);
    assert.ok(!town.includes('realm.veyrhold.weirs'), 'in town the list is what it was');
});

test('agency: the "Walk" of a steward\'s label is no actor word; the steward himself still is', () => {
    const context = { present: [{ id: 'npc.oss', names: ["Oss, Steward of the Eelmongers' Walk, broad man leaning on a gaff"] }] };
    const back = 'walk back to the city';
    assert.deepEqual(guardCommands(back, [{ seq: 1, type: 'go', to: { new: 'the city' }, quote: back }], context).dropped, []);
    const his = 'the steward takes the joints and signs the slip';
    assert.deepEqual(guardCommands(his, [{ seq: 1, type: 'give', object: 'obj.joints', qty: 2, to: 'npc.oss', quote: his }], context).dropped.map((d) => d.rule), ['npc_actor']);
    const oss = 'Oss walks me to the jetty';
    assert.deepEqual(guardCommands(oss, [{ seq: 1, type: 'go', to: { new: 'the jetty' }, quote: oss }], context).dropped.map((d) => d.rule), ['npc_actor']);
});

// ------------------------------------------------------------------------------------------------ the kill count
test('kinds: the objective\'s kind matches the creature\'s species or body plan, not another kind', () => {
    const wolf = content.anchors.get('wolf');
    assert.equal(namesKind('adult bog striders', 'bog strider', null), true);
    assert.equal(namesKind('the wolves harrying the fold', 'grey wolf', wolf), true);
    assert.equal(namesKind('wolves', 'dire wolf', wolf), true);
    assert.equal(namesKind('the wolves harrying the sheep', 'sheep', content.anchors.get('deer')), false);
    assert.equal(namesKind('bog striders', 'giant rat', content.anchors.get('rat')), false);
});

test('the engine counts the kills since the contract was taken; trophies are no count', () => {
    const s = hunt(structuredClone(base));
    killed(s, 'mon.wolf_a', 'grey wolf', 'wolf');
    killed(s, 'mon.wolf_b', 'grey wolf', 'wolf');
    killed(s, 'mon.rat', 'giant rat', 'rat');
    const q = s.quests['quest.wolves'];
    assert.deepEqual(defeatTally(s, content, q), [{ what: 'wolves', qty: 4, done: 2 }]);
    assert.equal(tallyText(defeatTally(s, content, q)), '2 of 4 wolves');
    // a wolf dead before the contract was taken is not its kill
    const earlier = structuredClone(s);
    earlier.quests['quest.wolves'].history = [{ turn: s.turn + 1, minute: 0, status: 'active' }];
    assert.equal(defeatTally(earlier, content, earlier.quests['quest.wolves'])[0].done, 0);
    // an objective without a number has no count
    const loose = structuredClone(s);
    loose.quests['quest.wolves'].objectives[0].qty = null;
    assert.deepEqual(defeatTally(loose, content, loose.quests['quest.wolves']), []);
});

test('quest.ready on fewer kills than named: refused without a reason the story gives, accepted with one', () => {
    const s = hunt(structuredClone(base));
    for (const x of ['a', 'b', 'c']) killed(s, `mon.wolf_${x}`, 'grey wolf', 'wolf');
    const ready = (alternative) => applyWorld(after(s), content, { expected: {}, deltas: [{ seq: 1, type: 'quest.ready', quest: 'quest.wolves', note: 'four wolves dead, the fold is safe', alternative }] }, { msg: 9 });
    const plain = ready(null);
    assert.deepEqual(rules(plain), ['quest_count']);
    assert.notEqual(plain.state.quests['quest.wolves'].ready, true);
    assert.ok(plain.corrections.some((c) => /still IN PROGRESS: the engine counts 3 of 4 wolves defeated/.test(c)));
    const other = ready('the last wolf fled the valley for good after its pack leader fell');
    assert.deepEqual(rules(other), []);
    assert.equal(other.state.quests['quest.wolves'].ready, true);
    assert.match(other.state.quests['quest.wolves'].ready_note || '', /fled the valley for good/);
    // the full count needs no reason
    killed(s, 'mon.wolf_d', 'grey wolf', 'wolf');
    assert.deepEqual(rules(ready(null)), []);
});

test('a hunt\'s details keep the route but not a local sign-off as a condition; other work keeps its receipt', () => {
    const s = hunt(structuredClone(base));
    const detail = (quest, note) => applyWorld(after(s), content, { expected: {}, deltas: [{ seq: 1, type: 'quest.detail', quest, note, schedule: null }] }, { msg: 9 });
    const r = detail('quest.wolves', 'The fold lies past the second ford. The shepherd must inspect the carcasses and sign the slip before payment.');
    assert.deepEqual(r.state.quests['quest.wolves'].details.map((x) => x.note), ['The fold lies past the second ford.']);
    assert.ok(r.corrections.some((c) => /no local inspection, witness or signature is required/.test(c)));
    assert.deepEqual(rules(detail('quest.wolves', 'The shepherd must sign the slip before payment.')), ['guild_quest_detail']);
    // a signature that is story, not a condition, stays
    assert.equal(detail('quest.wolves', 'The shepherd signed for the last lambs yesterday.').state.quests['quest.wolves'].details.length, 1);
    // a delivery keeps its receipt
    const d = structuredClone(s);
    d.quests['quest.wolves'].objectives = [{ id: 'o1', verb: 'DELIVER', what: 'a parcel', qty: 1, unit: null, where: 'Millbrook', status: 'open' }];
    const receipt = applyWorld(after(d), content, { expected: {}, deltas: [{ seq: 1, type: 'quest.detail', quest: 'quest.wolves', note: 'The factor must sign for the parcel on delivery.', schedule: null }] }, { msg: 9 });
    assert.equal(receipt.state.quests['quest.wolves'].details.length, 1);
});

// ------------------------------------------------------------------------------------------------ schema
test('"type": "place" is no delta type: the run\'s recorded answer fails the schema and is repaired; the extractor is told so', () => {
    // the first answer to the reply after "back to the city and to the guild building" (cmd logger, build 4.1.1)
    const recorded = '{"expected": {"2": {"arrived": true, "at": {"new": {"name": "Guild desk tollhouse", "kind": "interior", "parent": {"new": {"name": "Eelmongers\' Walk", "kind": "district", "parent": "loc.glassmere"}}}}, "with": null}}, "deltas": [{"seq": 1, "type": "place", "note": "new place: Eelmongers\' Walk"}, {"seq": 2, "type": "arrive", "at": {"new": {"name": "Guild desk tollhouse", "kind": "interior", "parent": {"new": {"name": "Eelmongers\' Walk", "kind": "district", "parent": "loc.glassmere"}}}}, "forced_by": null, "with": null}]}';
    const ids = { places: ['loc.glassmere', 'loc.glassmere.guild_hall'], quests: [], objects: [] };
    const bad = parseExtraction(recorded, content.deltaVocab, ids, { 2: 'go' });
    assert.equal(bad.valid, false);
    assert.ok(bad.errors.some((e) => /deltas\/0|type/.test(e)), bad.errors.join(' | '));
    const fixed = parseExtraction(recorded.replace('{"seq": 1, "type": "place", "note": "new place: Eelmongers\' Walk"}, ', '').replace('"seq": 2', '"seq": 1'), content.deltaVocab, ids, { 2: 'go' });
    assert.deepEqual(fixed.errors, []);
    assert.match(extractorSystem(content.deltaVocab), /there is no delta for a place alone/);
});

// ------------------------------------------------------------------------------------------------ intents
test('the message\'s deeds: with "*i say*" only the starred parts; without, the whole message', () => {
    assert.equal(deedsOf('found 3 killed 2 *i say calmly* is that enough?'), 'i say calmly');
    assert.equal(deedsOf('*I nod* and walk out'), '*I nod* and walk out', 'no speech marker: unchanged');
    assert.equal(deedsOf('I attack the wolf'), 'I attack the wolf');
    assert.equal(deedsOf('"Die!" *i shout and swing at the wolf*'), 'i shout and swing at the wolf');
});

test('V3 reads the whole message as before: the V4 intent changes are gated by the runtime', () => {
    const v3 = structuredClone(base);
    v3.meta = { ...v3.meta, runtime: 'v3' };
    assert.notEqual(parseIntent('*I keep myself hidden as i lay in wait*', v3, content).kind, 'stealth');
    assert.equal(parseIntent('*I keep myself hidden as i lay in wait*', base, content).kind, 'stealth');
    assert.equal(parseIntent('*I sneak along the hedge*', v3, content).kind, 'stealth');
});
