// Regression cases isolated from the successful 30 September 2026 SillyTavern 4.0.8 branch.
// This suite is independent of the mixed-branch Completion Logger.
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
import { buildCatalog } from '../../src/v4/catalog.js';
import { firewall } from '../../src/v4/firewall.js';
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

function escortScene(state) {
    const s = structuredClone(state);
    s.scene.at = 'loc.redmarch.verge';
    s.scene.location = 'loc.redmarch';
    s.scene.present = ['pc', 'npc.wool_driver', 'npc.wool_factor'];
    const base = { kind: 'npc', status: 'alive', location: 'loc.redmarch', at: 'loc.redmarch.verge', source: { kind: 'narration' }, card: {}, template: 'commoner' };
    s.entities['npc.wool_driver'] = { ...base, id: 'npc.wool_driver', name: null, descriptors: ['wool cart driver'], traits: 'wool cart driver' };
    s.entities['npc.wool_factor'] = { ...base, id: 'npc.wool_factor', name: null, descriptors: ['wool factor'], traits: 'wool factor' };
    s.quests['quest.cart'] = {
        id: 'quest.cart', title: 'Shepherd Cart to Millbrook', kind: 'guild_contract', status: 'active',
        rank: 'Novice', payout_cp: 90, ready: false,
        details: ['the wool factor and driver depart with Alaric on the river road'],
        notes: [], objectives: [{ verb: 'ESCORT', what: 'wool cart to Millbrook' }],
        proof: [], history: [], client: 'wool factor',
    };
    return s;
}

function travelTurn(s, input = 'We continue toward Millbrook') {
    s.last = {
        input,
        outcome: {
            kind: 'v4', actions: ['1. CONTINUES — the established escort'], extra: [],
            auth: { go: { seq: 1 }, gos: [{ seq: 1, to: null, name: 'the established journey' }], roam: true, take: [], gather: false, rest: false, timeCap: 720 },
            expected_keys: {}, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [] },
        },
    };
    return s;
}

test('4.0.9 XP: four same-rank L1 wolves plus a standard L2 escort exceed the first level threshold with carryover', () => {
    const wolf = defeatXp(1, 'normal', 'F', content);
    const quest = questXp(2, 'standard', content);
    assert.equal(wolf, 12);
    assert.equal(quest, 60);
    const xp = 4 * wolf + quest;
    assert.equal(xp, 108);
    const events = awardXp({ level: 1, class: 'warrior', xp: 4 * wolf }, quest, content, 'Quest XP');
    assert.equal(events.find((e) => e.t === 'level.up')?.d.level, 2);
    assert.equal(events.find((e) => e.t === 'level.up')?.d.xp_after, 8);
});

test('current return journey containing "came from" is not dropped as a retrospective memory', () => {
    const quote = 'I walk back along the road I came from';
    const guard = guardCommands(quote, [{ seq: 1, type: 'go', to: { new: 'back along the road' }, quote }], {});
    assert.equal(guard.kept.length, 1);
    assert.equal(guard.dropped.length, 0);
});

test('just-displayed Board listings cannot be removed retrospectively in the reading reply', async () => {
    const g = await created();
    await g.player('I go to the Guild hall.', [{ seq: 1, type: 'go', to: 'loc.redmarch.guild_hall', quote: 'I go to the Guild hall' }]);
    await g.reply('Alaric reached the Guild hall.', { expected: { '1': { arrived: true, at: 'loc.redmarch.guild_hall' } },
        deltas: [{ seq: 1, type: 'arrive', at: 'loc.redmarch.guild_hall', forced_by: null }] });
    await g.player('I read the Novice Board.', [{ seq: 1, type: 'board.read', rank: 'Novice', quote: 'I read the Novice Board' }]);
    const visible = g.state().last.outcome.board.listings;
    assert.equal(visible.length, 5);
    const id = visible[0];
    const r = await g.reply('Five jobs are freshly displayed; the clerk claims somebody has taken the first.', {
        expected: {}, deltas: [{ seq: 1, type: 'listing.gone', listing: id, why: 'taken_by_other' }],
    });
    assert.ok(r.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'board_first_display'));
    assert.equal(g.state().quests[id].status, 'listed');
});

test('a real escort party survives two scene changes and exposes JOURNEY READY without rematching generic NPC labels', async () => {
    const g = await created();
    let s = travelTurn(escortScene(g.state()));
    const ford = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'arrive',
        at: { new: { name: 'Ford Narrows', kind: 'wilderness', parent: 'realm.veyrhold' } }, forced_by: null }] }, { msg: 100 });
    assert.ok(ford.state.journey, 'party is now an event-sourced continuity bookmark');
    assert.deepEqual(new Set(ford.state.journey.party), new Set(['npc.wool_driver', 'npc.wool_factor']));
    assert.ok(ford.state.scene.present.includes('npc.wool_driver'));
    assert.ok(ford.state.scene.present.includes('npc.wool_factor'));
    const cat = buildCatalog(ford.state, content);
    assert.match(cat.journey_ready || '', /quest\.cart/);
    s = travelTurn(ford.state);
    const millbrook = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'arrive',
        at: { new: { name: 'Millbrook', kind: 'settlement', parent: 'realm.veyrhold' } }, forced_by: null }] }, { msg: 102 });
    assert.ok(millbrook.state.scene.present.includes('npc.wool_driver'));
    assert.ok(millbrook.state.scene.present.includes('npc.wool_factor'));
    assert.deepEqual(new Set(millbrook.state.journey.party), new Set(['npc.wool_driver', 'npc.wool_factor']));
});

test('a named driver reuses the existing anonymous companion instead of creating a second driver', async () => {
    const g = await created();
    const s = travelTurn(escortScene(g.state()));
    const r = applyWorld(s, content, { expected: {}, deltas: [{
        seq: 1, type: 'person.new', ref: 'person.dren', name: 'Dren', role: 'wool cart driver',
        desc: ['the same wool cart driver'], present: true, at: null, band: 'SHORT',
    }] }, { msg: 103 });
    assert.equal(r.state.entities['npc.wool_driver'].name, 'Dren');
    assert.equal(Object.values(r.state.entities).filter((e) => e.kind === 'npc' && e.name === 'Dren').length, 1);
});

test('a rejected arrival cannot make an escort ready for turn-in in the very same reply', async () => {
    const g = await created();
    const s = escortScene(g.state());
    s.last = { input: 'I wait here', outcome: {
        kind: 'v4', actions: ['1. WAITS'], auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120 },
        expected_keys: {}, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [] },
    } };
    const r = applyWorld(s, content, { expected: {}, deltas: [
        { seq: 1, type: 'arrive', at: { new: { name: 'Millbrook', kind: 'settlement', parent: 'realm.veyrhold' } }, forced_by: null },
        { seq: 2, type: 'quest.ready', quest: 'quest.cart', note: 'the wool cart reached Millbrook safely' },
    ] }, { msg: 105 });
    assert.ok(r.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'no_go'));
    assert.ok(r.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'quest_dependency'));
    assert.notEqual(r.state.quests['quest.cart'].ready, true);
});

test('a dozen ordinary nonhostile sheep remain one compact scenery fact, not twelve HUD combatants', async () => {
    const g = await created();
    const s = escortScene(g.state());
    const n = Object.keys(s.entities).length;
    s.last = { input: 'I look at the pasture', outcome: {
        kind: 'v4', auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120 },
        expected_keys: {}, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [] },
    } };
    const r = applyWorld(s, content, { expected: {}, deltas: [{
        seq: 1, type: 'creature.new', ref: 'sheep', species: 'sheep', anchor: 'deer', desc: ['grazing peacefully'],
        count: 12, present: true, band: 'MEDIUM',
    }] }, { msg: 106 });
    assert.equal(Object.keys(r.state.entities).length, n);
    assert.ok(r.events.some((e) => e.t === 'fact.asserted' && e.d.fact.p === 'background_fauna'));
});

test('a larger, visible threatening wolf pack is NOT treated as background fauna', async () => {
    const g = await created();
    const s = escortScene(g.state());
    s.last = { input: 'I see wolves coming down from the ridge', outcome: {
        kind: 'v4', auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120 },
        expected_keys: {}, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [] },
    } };
    const r = applyWorld(s, content, { expected: {}, deltas: [{
        seq: 1, type: 'creature.new', ref: 'wolfpack', species: 'wolf', anchor: 'wolf',
        desc: ['five wolves charging down the ridge'], count: 5, present: true, band: 'SHORT',
    }] }, { msg: 107 });
    assert.equal(r.events.filter((e) => e.t === 'entity.created' && e.d.entity.kind === 'creature').length, 5);
});

test('already credited copper cannot be collected again as a phantom object', async () => {
    const g = await created();
    const s = g.state();
    s.entities.pc.sheet.coin_cp = 120;
    const events = [];
    const r = resolveCommands(s, content, [{ seq: 1, type: 'take', object: { new: 'the copper' }, qty: 1, quote: 'I take the copper' }], (e) => events.push(e));
    assert.equal(r.resolutions[0].reason, 'currency already booked');
    assert.ok(!events.some((e) => e.t === 'object.created' || e.t === 'coin.changed'));
    assert.equal(s.entities.pc.sheet.coin_cp, 120);
});

test('operational quest detail can include the correct posted reward but cannot increase Guild payout', () => {
    const ctx = { contracts: [{ id: 'quest.cart', title: 'Shepherd Cart', payout_cp: 90, status: 'active' }] };
    const okay = firewall([{ seq: 1, type: 'quest.detail', quest: 'quest.cart', note: 'Meet Aldsa by the wool shed; posted reward 90 cp; take the river road.', schedule: null }], ctx);
    assert.equal(okay.accept.length, 1);
    const abuse = firewall([{ seq: 1, type: 'quest.detail', quest: 'quest.cart', note: 'The Guild reward is now 150 cp; the previous posted reward was 90 cp.', schedule: null }], ctx);
    assert.ok(abuse.reject.length >= 1);
    const toll = firewall([{ seq: 1, type: 'quest.detail', quest: 'quest.cart', note: 'A 5 cp road toll is charged by the ferryman.', schedule: null }], ctx);
    assert.equal(toll.accept.length, 1);
});

test('unpriced water stays a hard pending trade boundary in the engine narrator instructions', () => {
    const text = playerActionsBlock({ actions: ['1. WANTS — water; no price is known.'],
        extra: ['OPEN DECISION — seller names the price and stops.'],
        resolutions: [{ type: 'buy', status: 'pending' }], search_checks: [] });
    assert.match(text, /PENDING TRADE IS A HARD STOP/);
    assert.match(text, /BEFORE any payment, delivery, drinking/);
});
