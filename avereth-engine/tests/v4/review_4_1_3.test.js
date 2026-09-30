// The review of 4.1.3 (30.09.2026), each point shown on 4.1.3 (5a8ccab) and fixed in 4.1.4 (docs/INTEGRATION_4_1.md
// §11): words a speech tag gives as said ("*I say* I strike the wolf.") started a fight; a fight against people
// ("FIND bandits" + "DEFEAT bandits") was a hunt with body parts as proof; the catalog showed no readiness where the
// desk accepted the turn-in (the listed proof in hand with the full count). Found on the way: the kill count counted
// creatures only, so five dead bandits made "0 of 5 bandits".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { buildContext } from '../../src/context.js';
import { contractReady, defeatTally, isHunt, boardRequest, BOARD_VERSION } from '../../src/v4/guild.js';
import { routeTurn } from '../../src/v4/turn.js';
import { setFactEvents } from '../../src/knowledge.js';
import { parseIntent } from '../../src/intent.js';

const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));
const g0 = new Chat4(content, { listings: gold.board_generator.listings });
await g0.player('Warrior');
await g0.player(content.classes.get('warrior').skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
const base = g0.state();

const HALL = 'loc.redmarch.guild_hall';
const at = (s, place, location) => { Object.assign(s.scene, { at: place, location, present: ['pc'] }); return s; };
function after(state) {
    const s = structuredClone(state);
    s.last = { ...s.last, input: 'x', outcome: { kind: 'v4', actions: [], extra: [], resolutions: [], expected_keys: {}, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] }, search_checks: [], check_die: null,
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120 } } };
    return s;
}
function play(state, commands) {
    const s = structuredClone(state);
    const ctx = resolveCommands(s, content, commands, (e) => applyEvent(s, e));
    return { s, ctx };
}
function contract(s, objectives, proof = []) {
    s.quests['quest.x'] = { id: 'quest.x', title: 'The Job', kind: 'guild_contract', status: 'active', rank: 'Novice', level: 1, qtype: 'standard', payout_cp: 90, client: 'the reeve',
        desired_end_state: 'the road is safe', details: [], notes: [], proof, objectives: objectives.map((o, i) => ({ id: `o${i + 1}`, qty: null, unit: null, where: null, status: 'open', ...o })),
        history: [{ turn: s.turn, minute: s.clock.minute, status: 'active' }], source: { board: HALL, branch: 'loc.redmarch' } };
    s.guild.membership = { rank: 'Novice', since: { turn: 1, minute: 0 }, branch: 'loc.redmarch' };
    return s;
}
/** Someone who died in a fight this turn: a creature of a species, or a person as V4 creates them (role in the descriptors). */
function dead(s, id, who) {
    s.entities[id] = who.species
        ? { id, kind: 'creature', species: who.species, anchor: who.anchor, name: null, descriptors: [who.species], status: 'alive', location: s.scene.location, at: s.scene.at, created: { turn: s.turn, minute: 0 }, source: { kind: 'narration' }, card: {} }
        : { id, kind: 'npc', name: null, descriptors: who.descriptors, traits: '', status: 'alive', location: s.scene.location, at: s.scene.at, created: { turn: s.turn, minute: 0 }, source: { kind: 'narration' }, card: {}, template: 'commoner' };
    for (const e of setFactEvents(s, { s: id, p: 'status', o: 'dead', source: { kind: 'combat' } })) applyEvent(s, e);
    return s;
}
const rules = (r) => r.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule);
const TURN_IN = [{ seq: 1, type: 'quest.turn_in', quest: 'quest.x', quote: 'I turn it in' }];

// ------------------------------------------------------------------------------------------------ 1. speech
test('words a speech tag gives as said never start a fight: the ones after it and the ones that run into it', () => {
    const w = applyWorld(after(base), content, { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'the wolf', species: 'grey wolf', anchor: 'wolf', desc: [], count: 1, present: true, band: 'SHORT' }] }, { msg: 9 }).state;
    const wolf = Object.values(w.entities).find((e) => e.kind === 'creature').id;
    const read = (m) => { const i = parseIntent(m, w, content); return [i.kind, i.target ?? null, routeTurn(w, content, m)]; };
    // the case of the review and the two that must stay
    assert.deepEqual(read('*I say* I strike the wolf.'), ['narrative', null, 'v4'], '4.1.3: an attack on the wolf');
    assert.deepEqual(read('I attack the wolf. *I shout* Get back!'), ['attack', wolf, 'v3']);
    assert.deepEqual(read('I found three and killed two *I say calmly*'), ['narrative', null, 'v4']);
    // the same speech on the other side of the tag (4.1.3: attacks)
    assert.equal(read('I strike you down *I shout*')[0], 'narrative');
    assert.equal(read('I strike you down. *I shout*')[0], 'narrative', 'a tag with no words after it closes the words before it');
    assert.equal(read('Get back! *I shout* and I slash at the wolf')[0], 'narrative', 'after the tag: said');
    assert.equal(read('found 3 killed 2 *i say calmly* is that enough for you to sign my proof? or do i have to hunt more?')[0], 'narrative');
    // deeds stay deeds: in the stars, or a closed sentence of his own before a tag with words of its own
    assert.deepEqual(read('*I shout* Get back! *I strike the wolf*').slice(0, 2), ['attack', wolf]);
    assert.deepEqual(read('"Back!" *i shout and swing at the wolf*').slice(0, 2), ['attack', wolf]);
    assert.deepEqual(read('*I draw my sword* I strike the wolf. *I shout* Die!').slice(0, 2), ['attack', wolf]);
    assert.deepEqual(read('I attack the wolf.').slice(0, 2), ['attack', wolf], 'no speech tag: the whole message as before');
});

// ------------------------------------------------------------------------------------------------ 2. hunts and people
test('a fight against people is no hunt: bandits, raiders, deserters by the roles the NPC templates know; beasts and monsters are', () => {
    const q = (...objectives) => ({ objectives: objectives.map(([verb, what]) => ({ verb, what })) });
    assert.equal(isHunt(q(['FIND', 'bandits'], ['DEFEAT', 'bandits']), content), false, '4.1.3: a hunt');
    assert.equal(isHunt(q(['DEFEAT', 'the raiders on the east road']), content), false);
    assert.equal(isHunt(q(['DEFEAT', "Rook's brigands"]), content), false);
    assert.equal(isHunt(q(['DEFEAT', 'the bandit leader and his wolves']), content), false);
    assert.equal(isHunt(q(['FIND', 'the missing trapper'], ['DEFEAT', 'wolves']), content), false, 'finding a person is work of its own');
    for (const what of ['wolves', 'bog striders', 'goblins', 'the wolf-man', 'a man-eating tiger', "the miner's cave troll"]) assert.equal(isHunt(q(['FIND', 'their lair'], ['DEFEAT', what]), content), true, what);
    assert.equal(isHunt(q(['FIND', 'bog strider nesting mounds'], ['DEFEAT', 'bog striders'], ['DEFEND', 'the weir platforms and eel boats']), content), true, 'the live run');
});

test('a bandit contract keeps its proof and its local confirmation; its kills are counted by role (4.1.2 counted 0 of 2)', () => {
    const s = contract(at(structuredClone(base), 'realm.veyrhold', 'realm.veyrhold'), [{ verb: 'FIND', what: 'the bandit camp' }, { verb: 'DEFEAT', what: 'bandits', qty: 2 }], [{ id: 'p1', kind: 'mark', what: "the reeve's seal", on: 'contract slip' }]);
    const note = 'The reeve must confirm the camp is broken before payment.';
    const detail = applyWorld(after(s), content, { expected: {}, deltas: [{ seq: 1, type: 'quest.detail', quest: 'quest.x', note, schedule: null }] }, { msg: 9 });
    assert.deepEqual(detail.state.quests['quest.x'].details.map((x) => x.note), [note], '4.1.3 refused it as a hunt');
    const listed = at(structuredClone(s), HALL, 'loc.redmarch');
    Object.assign(listed.quests['quest.x'], { status: 'listed', history: [] });
    assert.ok(!/no local inspection/.test(play(listed, [{ seq: 1, type: 'quest.accept', quest: 'quest.x', quote: 'I take the bandit job' }]).ctx.actions.join(' ')));
    // the count: people by their role (a raider is a bandit), never a dead wolf or a dead shepherd
    dead(s, 'npc.b1', { descriptors: ['bandit', 'scarred man with a crossbow'] });
    dead(s, 'mon.w1', { species: 'grey wolf', anchor: 'wolf' });
    dead(s, 'npc.shepherd', { descriptors: ['shepherd'] });
    assert.deepEqual(defeatTally(s, content, s.quests['quest.x']), [{ what: 'bandits', qty: 2, done: 1 }]);
    const ready = (st) => applyWorld(after(st), content, { expected: {}, deltas: [{ seq: 1, type: 'quest.ready', quest: 'quest.x', note: 'the camp is broken', alternative: null }] }, { msg: 9 });
    assert.deepEqual(rules(ready(s)), ['quest_count']);
    dead(s, 'npc.b2', { descriptors: ['raider', 'the raider'] });
    assert.deepEqual(defeatTally(s, content, s.quests['quest.x']), [{ what: 'bandits', qty: 2, done: 2 }]);
    assert.deepEqual(rules(ready(s)), [], 'two dead bandits are the count');
});

test('the Board generator and the narrator are told that work against people is no hunt; the generator\'s version says the prompt changed', () => {
    const text = JSON.stringify(boardRequest(base, content, { branch: 'loc.redmarch', rank: 'Novice', missing: 5, day: 1, have: [] }));
    assert.match(text, /its work is killing animals or monsters/);
    assert.match(text, /Work against people \(bandits, raiders, deserters\) is no hunt: its proof fits the job/);
    assert.equal(BOARD_VERSION, 'board-4.6');
    assert.match(fs.readFileSync(path.join(ROOT, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8'), /work against people \(bandits, raiders\) is no hunt and keeps a proof that fits it/);
});

// ------------------------------------------------------------------------------------------------ 3. shown = done
test('what the catalog and the quest memory show as ready is what the desk does, in every case', () => {
    const wolves = (kills, ears, story) => {
        const s = contract(at(structuredClone(base), HALL, 'loc.redmarch'), [{ verb: 'DEFEAT', what: 'wolves', qty: 2 }], [{ id: 'p1', kind: 'object', what: 'wolf ears', qty: 2, unit: 'pair' }]);
        for (let i = 0; i < kills; i++) dead(s, `mon.w${i}`, { species: 'grey wolf', anchor: 'wolf' });
        if (ears) s.objects['obj.ears'] = { id: 'obj.ears', name: 'wolf ears', kind: 'trophy', qty: ears, unit: 'pair', holder: { entity: 'pc' }, marks: [] };
        if (story) applyEvent(s, { t: 'quest.ready', d: { id: 'quest.x', note: 'the pack is gone', ...(story === 'alternative' ? { alternative: 'the second wolf fled the valley for good' } : {}) } });
        return s;
    };
    const herbs = (inHand) => {
        const s = contract(at(structuredClone(base), HALL, 'loc.redmarch'), [{ verb: 'GATHER', what: 'marshmint', qty: 1, unit: 'basket' }], [{ id: 'p1', kind: 'object', what: 'marshmint', qty: 1, unit: 'basket' }]);
        if (inHand) s.objects['obj.mint'] = { id: 'obj.mint', name: 'marshmint', kind: 'resource', qty: 1, unit: 'basket', holder: { entity: 'pc' }, marks: [] };
        return s;
    };
    const cases = {
        'full count, the ears in hand, no quest.ready (4.1.3 showed nothing)': [wolves(2, 2), true],
        'one kill, the ears in hand': [wolves(1, 2), false],
        'the story says ready, full count, no ears': [wolves(2, 0, 'ready'), true],
        'the story says ready, one kill, no alternative (a campaign of 4.1.1)': [wolves(1, 0, 'ready'), false],
        'the story says ready, one kill, the rest fled for good': [wolves(1, 0, 'alternative'), true],
        'the basket of herbs in hand': [herbs(true), true],
        'no basket': [herbs(false), false],
    };
    for (const [name, [s, expected]] of Object.entries(cases)) {
        const info = buildCatalog(s, content).quests.find((q) => q.id === 'quest.x').info;
        const memory = buildContext(s, content, { input: 'I wait.', outcome: { kind: 'v4', actions: ['NOTHING TO BOOK'], extra: [], search_checks: [] } }).text;
        const desk = play(s, TURN_IN).ctx.resolutions[0].status === 'resolved';
        assert.equal(contractReady(s, content, s.quests['quest.x']).ok, expected, name);
        assert.equal(desk, expected, `${name}: the desk`);
        assert.equal(/(?<!NOT )READY FOR TURN-IN/.test(info), expected, `${name}: the catalog — ${info}`);
        assert.equal(/(?<!NOT )READY FOR TURN-IN/.test(memory), expected, `${name}: the quest memory`);
    }
    assert.match(buildCatalog(wolves(2, 2), content).quests.find((q) => q.id === 'quest.x').info, /READY FOR TURN-IN: the listed proof is in hand \(2 pair of wolf ears\)/);
});
