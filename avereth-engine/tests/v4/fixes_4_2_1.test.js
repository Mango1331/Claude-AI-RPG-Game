// Engine 4.2.1: the review of the Gen 3.5 branch (4.2.0) and the two open findings of 4.1.5, one by one, each with the
// case that showed it (docs/ARCHITECTURE_GEN35.md §8).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { applyWorld } from '../../src/v4/world.js';
import { mayTake } from '../../src/v4/envelope.js';
import { ownedClause } from '../../src/v4/ownership.js';
import { isHunt } from '../../src/v4/guild.js';

const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_0930c.json'), 'utf8'));
const g0 = new Chat4(content, { listings: gold.board_generator.listings });
await g0.player('Warrior');
await g0.player(content.classes.get('warrior').skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
const base = g0.state();
function after(state) {
    const s = structuredClone(state);
    s.last = { ...s.last, input: 'x', outcome: { kind: 'v4', actions: [], extra: [], resolutions: [], expected_keys: {}, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] }, search_checks: [], check_die: null,
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120 } } };
    return s;
}
const world = (s, deltas) => applyWorld(after(s), content, { expected: {}, deltas }, { msg: 9 });
const rules = (r) => r.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule);
const boar = (extra = {}) => ({ seq: 1, type: 'creature.new', ref: 'wild boar', species: 'wild boar', anchor: 'boar', desc: ['grey-bristled'], count: 1, present: true, band: 'MEDIUM', ...extra });
const npc = (id, name, descriptors) => ({ id, kind: 'npc', name, descriptors, traits: '', status: 'alive', location: base.scene.location, at: base.scene.at, card: {}, created: { turn: 1, minute: 0 } });

// ------------------------------------------------------------------------------------------------ 4.1.5 open findings
test('a stronger one coming where an ordinary one left, its numbers fixed, is another individual; one not yet fixed is shown stronger', () => {
    // an ordinary boar was here, its profile fixed, and left alive
    const seen = world(base, [boar()]).state;
    const first = Object.values(seen.entities).find((e) => e.kind === 'creature');
    assert.ok(first.profile && first.variation !== 'strong');
    const gone = structuredClone(seen);
    gone.scene.present = gone.scene.present.filter((x) => x !== first.id);
    // the same kind comes back, ordinary: the one that left (as 4.1.2)
    const back = world(gone, [boar()]).state;
    assert.deepEqual(Object.values(back.entities).filter((e) => e.kind === 'creature').map((e) => e.id), [first.id]);
    // "a boar half again the size of the others": not the ordinary one that left, a stronger individual
    const big = world(gone, [boar({ ref: 'big boar', stronger: true })]).state;
    const boars = Object.values(big.entities).filter((e) => e.kind === 'creature');
    assert.equal(boars.length, 2, '4.2.0: the returning path reused the ordinary boar and dropped "stronger"');
    assert.equal(boars.find((e) => e.id !== first.id).variation, 'strong');
    // one known but never seen up close (no numbers yet) is this one, now shown stronger, before its numbers are fixed
    const unseen = structuredClone(gone);
    delete unseen.entities[first.id].profile;
    const shown = world(unseen, [boar({ stronger: true })]).state;
    assert.equal(shown.entities[first.id].variation, 'strong');
    assert.ok(shown.entities[first.id].profile, 'its numbers are fixed with the variation');
    assert.equal(Object.values(shown.entities).filter((e) => e.kind === 'creature').length, 1);
});

test('asking the witnesses where the beasts den is work, not a confirmation errand; having the kill witnessed or signed still is', () => {
    const listing = fx.listings.find((l) => /Gnaw-Hide/.test(l.title));
    const withTalk = (what) => ({ ...listing, objectives: [...listing.objectives.filter((o) => o.verb !== 'TALK'), { verb: 'TALK', what }] });
    assert.equal(isHunt(withTalk('to witnesses about where the beasts den'), content), false, '4.2.0: "witness" made it a confirmation');
    assert.equal(isHunt(withTalk('the witnesses at the mill'), content), false, 'the witnesses are people to ask');
    assert.equal(isHunt(withTalk('the farmer about the sightings'), content), false);
    assert.equal(isHunt(withTalk('Old Mara to verify the sightings and learn where they den'), content), false, 'a confirmation word beside an inquiry: still work');
    assert.equal(isHunt(withTalk('Harl Cotter to confirm the losses have stopped'), content), true, 'as 4.1.5');
    assert.equal(isHunt(withTalk('the reeve to witness the kill'), content), true);
    assert.equal(isHunt(withTalk('the steward to sign the proof'), content), true);
});

// ------------------------------------------------------------------------------------------------ review of 4.2.0
test('a memory is everyday prose: "registered surprise", "the only reward", "promoted to head cook" stay; the Guild\'s own words go', () => {
    for (const x of ['Wenna registered surprise at the news.', "The only reward was Bren's relieved smile.", 'Bren was promoted to head cook last spring.',
        'He logged every boat that came in.', 'The dice game paid out well for Tam.']) assert.equal(ownedClause(x, { store: 'memory' }), null, x);
    for (const [x, kind] of [['Alaric registered at the Guild desk.', 'guild.standing'], ['The contract is registered and active.', 'quest.status'], ['The bounty was 20 cp.', 'pc.coin'],
        ['The clerk paid out the 60 cp reward.', 'pc.coin'], ['Alaric was promoted to Guild Rank Iron.', 'guild.standing'], ['He earned 40 XP for the boars.', 'pc.progress']]) assert.equal(ownedClause(x, { store: 'memory' }), kind, x);
    // in a quest note the old verdicts hold (the Guild's money and status words are the engine's there)
    assert.equal(ownedClause('The reward was posted at the hall.', { store: 'note' }), 'pc.coin');
    // in the world applier: the memory is kept whole
    const s = structuredClone(base);
    s.entities['npc.wenna'] = npc('npc.wenna', 'Wenna', ['innkeeper']);
    s.scene.present.push('npc.wenna');
    const r = world(s, [{ seq: 1, type: 'memory', text: 'Wenna registered surprise at the news of the wolves.', who: ['npc.wenna'], imp: 6 }]);
    assert.deepEqual(rules(r), []);
    assert.match(r.events.find((e) => e.t === 'memory.recorded').d.memory.text, /registered surprise/);
});

test('in a fight only one who fights him may rob him: not the merchant who happens to stand there', () => {
    const s = structuredClone(base);
    s.entities['npc.tam'] = npc('npc.tam', 'Tam', ['wool merchant']);
    s.entities['npc.cob'] = npc('npc.cob', 'Cob', ['drover']);
    s.encounter = { id: 'enc.x', combatants: { pc: { id: 'pc', side: 'pc' }, 'npc.cob': { id: 'npc.cob', side: 'hostile' }, 'mon.wolf': { id: 'mon.wolf', side: 'hostile' } } };
    assert.equal(mayTake(s, 'npc.tam', 'robbery').ok, false, '4.2.0: any running fight let him rob');
    assert.equal(mayTake(s, 'npc.cob', 'robbery').ok, true, 'one who fights him');
    assert.equal(mayTake({ ...s, encounter: null }, 'npc.cob', 'robbery').ok, false, 'outside the fight a drover is no robber');
});

test('a cause comes first: an attitude the reply lowers after the attack legitimises nothing (the envelope reads each step)', () => {
    const s = structuredClone(base);
    s.entities['npc.bren'] = npc('npc.bren', 'Bren', ['barkeep']);
    s.entities['npc.bren'].template = 'commoner';
    s.scene.present.push('npc.bren');
    s.scene.positions['npc.bren'] = { band: 'SHORT', cover: 'none' };
    const later = world(s, [{ seq: 1, type: 'hostile', by: ['npc.bren'] }, { seq: 2, type: 'attitude', who: 'npc.bren', delta: -40, why: 'Alaric insulted him' }]);
    assert.ok(rules(later).includes('envelope'));
    assert.ok(!later.events.some((e) => e.t === 'combat.pending'));
    // the insult told first: the story gave the cause (a reaction constraint, deliberately, docs/ARCHITECTURE_GEN35.md §2.3)
    const first = world(s, [{ seq: 1, type: 'attitude', who: 'npc.bren', delta: -40, why: 'Alaric insulted him' }, { seq: 2, type: 'hostile', by: ['npc.bren'] }]);
    assert.ok(first.events.some((e) => e.t === 'combat.pending'));
});

test('during a fight only its moment ends with it: a lasting mark, a tattoo, the kind\'s status stay facts', () => {
    const s = structuredClone(base);
    for (const id of ['mon.wolf_a', 'mon.wolf_b']) {
        s.entities[id] = { id, kind: 'creature', name: null, descriptors: ['grey wolf'], traits: '', status: 'alive', location: base.scene.location, at: base.scene.at, card: {}, species: 'grey wolf', anchor: 'wolf', created: { turn: 1, minute: 0 } };
        s.scene.present.push(id);
        s.scene.positions[id] = { band: 'SHORT', cover: 'none' };
    }
    const f = world(s, [{ seq: 1, type: 'hostile', by: ['mon.wolf_a', 'mon.wolf_b'] }]).state;
    assert.ok(f.encounter);
    const r = world(f, [
        { seq: 1, type: 'fact', s: 'mon.wolf_a', p: 'wounded', o: 'lost its left eye to the blade' },
        { seq: 2, type: 'fact', s: 'mon.wolf_b', p: 'tattoo', o: 'a black serpent burned into its flank' },
        { seq: 3, type: 'fact', s: 'the wolves', p: 'status', o: 'one of them dead by the stream' },
        { seq: 4, type: 'fact', s: 'mon.wolf_b', p: 'demeanor', o: 'snarling, hackles up' },
    ]).state;
    const scope = (p) => Object.values(r.facts).find((x) => x.p === p)?.scope ?? null;
    assert.equal(scope('wounded'), null, 'a lost eye outlives the fight');
    assert.equal(scope('tattoo'), null);
    assert.equal(scope('status'), null);
    assert.deepEqual(scope('demeanor'), { fight: f.encounter.id }, 'its snarl is the fight\'s');
});
