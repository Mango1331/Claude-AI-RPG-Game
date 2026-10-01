// Runtime V4 4.1.5: the findings of the live run of 30.09.2026 22:41 (docs/INTEGRATION_4_1.md §12) one by one, each with
// the case the run got wrong and the case that must stay as it was. The run itself is replayed in live_0930c.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { firewall } from '../../src/v4/firewall.js';
import { isHunt, huntObjectives, checkProof, engineClause } from '../../src/v4/guild.js';
import { parseIntent, maskNames } from '../../src/intent.js';
import { routeTurn } from '../../src/v4/turn.js';
import { scaleCreature } from '../../src/npcgen.js';
import { defeatXp, strengthOf } from '../../src/progression.js';
import { EXTRACTOR_VERSION } from '../../src/v4/extract.js';
import { NARRATOR_CONTRACT_REVISION } from '../../src/util.js';
import { setFactEvents } from '../../src/knowledge.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_0930c.json'), 'utf8'));
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));

async function created(cls = 'Warrior', listings = gold.board_generator.listings) {
    const g = new Chat4(content, { listings });
    await g.player(cls);
    const c = content.classes.get(cls.toLowerCase());
    await g.player(c.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    return g;
}
const base = (await created()).state();
const HALL = 'loc.redmarch.guild_hall';
const at = (s, place, location) => { Object.assign(s.scene, { at: place, location, present: ['pc'] }); return s; };
function after(state) {
    const s = structuredClone(state);
    s.last = { ...s.last, input: 'x', outcome: { kind: 'v4', actions: [], extra: [], resolutions: [], expected_keys: {}, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] }, search_checks: [], check_die: null,
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120 } } };
    return s;
}
const play = (state, commands) => { const s = structuredClone(state); const ctx = resolveCommands(s, content, commands, (e) => applyEvent(s, e)); return { s, ctx }; };
const rules = (r) => r.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule);
const boarListing = fx.listings.find((l) => /Gnaw-Hide/.test(l.title));
function contract(s, id, listing, status = 'active') {
    s.quests[id] = { id, title: listing.title, kind: 'guild_contract', status, rank: 'Novice', level: listing.level, qtype: listing.qtype, payout_cp: listing.payout_cp, client: listing.client,
        desired_end_state: listing.desired_end_state, details: [], notes: [], proof: listing.proof.map((p, i) => ({ id: `p${i + 1}`, ...p })),
        objectives: listing.objectives.map((o, i) => ({ id: `o${i + 1}`, ...o, status: 'open' })), history: status === 'active' ? [{ turn: s.turn, minute: 0, status: 'active' }] : [], source: { board: HALL, branch: 'loc.redmarch' } };
    s.guild.membership = { rank: 'Novice', since: { turn: 1, minute: 0 }, branch: 'loc.redmarch' };
    return s;
}

// ------------------------------------------------------------------------------------------------ 1. stealth
test('taking the "Gnaw Hide Boars" contract is no stealth: a name masked, and a stealth word counts only as his verb', () => {
    const TAKE = '*i take the Cull the Gnaw Hide Boars at the Mill Road Turnips Quest and register it at the front desk*';
    const s = at(contract(structuredClone(base), 'quest.boars', boarListing, 'listed'), HALL, 'loc.redmarch');
    assert.equal(parseIntent(TAKE, s, content).kind, 'narrative', '4.1.4: stealth');
    assert.equal(routeTurn(s, content, TAKE), 'v4', 'the interpreter reads it (quest.accept)');
    // either guard alone: the title unknown to the engine, only the verb position decides
    assert.equal(parseIntent(TAKE, structuredClone(base), content).kind, 'narrative');
    assert.equal(maskNames(TAKE, s).includes('Hide'), false, 'the known title is masked');
    // the same class: a verb inside a name is no deed ("Kill the Rat King" is a title, not an attack)
    const rat = at(contract(structuredClone(base), 'quest.rat', { ...boarListing, title: 'Kill the Rat King of the Tannery Drains' }, 'listed'), HALL, 'loc.redmarch');
    assert.equal(parseIntent('*I take the Kill the Rat King of the Tannery Drains contract*', rat, content).kind, 'narrative');
    assert.equal(parseIntent('I skin the boar and take its hide', structuredClone(base), content).kind, 'narrative', 'a hide is a skin');
    // a name where his own verb stands is his deed: the words of a contract "Kill the Rats" said as what he does
    const rats = at(contract(structuredClone(base), 'quest.rats', { ...boarListing, title: 'Kill the Rats' }, 'active'), HALL, 'loc.redmarch');
    for (const m of ['I kill the rats', '*kill the rats*', 'I take my staff and kill the rats']) assert.notEqual(parseIntent(m, rats, content).kind, 'narrative', m);
    assert.equal(parseIntent('*I take the Kill the Rats contract*', rats, content).kind, 'narrative');
    // what stays stealth
    for (const m of ['*i crouch down and sneak closer into medium range*', 'I hide behind the crates', 'I try to hide', '*I keep myself hidden as i lay in wait*', 'I carefully creep forward', '*sneak up on them*']) {
        assert.equal(parseIntent(m, s, content).kind, 'stealth', m);
    }
    // V3 reads as before (the change is V4's)
    const v3 = structuredClone(s);
    v3.meta = { ...v3.meta, runtime: 'v3' };
    assert.equal(parseIntent(TAKE, v3, content).kind, 'stealth');
});

// ------------------------------------------------------------------------------------------------ 2. hunt confirmation errands
test('a cull the generator gave a confirmation errand is still a hunt; the errand is not booked; a talk that is work stays', () => {
    assert.equal(isHunt(boarListing, content), true, '4.1.4: false (TALK Harl Cotter to confirm the losses have stopped)');
    assert.deepEqual(huntObjectives(boarListing, content).map((o) => o.verb), ['FIND', 'DEFEAT']);
    const talk = { ...boarListing, objectives: [...boarListing.objectives.slice(0, 2), { verb: 'TALK', what: 'the old shepherd about where the pack dens' }] };
    assert.equal(isHunt(talk, content), false, 'a talk that is work: mixed');
    assert.equal(huntObjectives(talk, content).length, 3);
    const satchel = fx.listings.find((l) => /Satchel/.test(l.title));
    assert.equal(isHunt(satchel, content), false);
    assert.deepEqual(huntObjectives(satchel, content).map((o) => `${o.verb} ${o.what}`), ["DELIVER sealed chirurgeon's satchel", 'TALK the quarry overseer to confirm receipt'], 'a delivery keeps its receipt');
    // a hunt whose listed proof is a sign-off: the acceptance names trophies, never "signed … no signature required"
    const s = at(contract(structuredClone(base), 'quest.boars', { ...boarListing, proof: [{ kind: 'mark', what: "Harl Cotter's mark", qty: null, unit: null, on: 'contract slip', consume: null }] }, 'listed'), HALL, 'loc.redmarch');
    const line = play(s, [{ seq: 1, type: 'quest.accept', quest: 'quest.boars', quote: 'I take the boars' }]).ctx.actions.join(' ');
    assert.match(line, /Proof: trophies of the kills brought to a Guild hall; no local inspection, witness or signature is required\./);
});

// ------------------------------------------------------------------------------------------------ 3. quest notes
test('a quest note drops what is the engine\'s (status, payout, XP, rank) and keeps the story; a false status is corrected', () => {
    const listed = contract(structuredClone(base), 'quest.boars', boarListing, 'listed');
    const note = "Contract registered and active; payout 60 cp from the Alderwatch drawer. Proof at turn-in: boar tusks, or Harl Cotter's own mark signing for them alive or dead. Cotter has already gone through three adventurers this season; the boars return after dark and he has lost patience.";
    const detail = (s, n) => applyWorld(after(s), content, { expected: {}, deltas: [{ seq: 1, type: 'quest.detail', quest: 'quest.boars', note: n, schedule: null }] }, { msg: 9 });
    const r = detail(listed, note);
    assert.deepEqual(r.state.quests['quest.boars'].details.map((x) => x.note), ["Proof at turn-in: boar tusks, or Harl Cotter's own mark signing for them alive or dead. Cotter has already gone through three adventurers this season; the boars return after dark and he has lost patience.".slice(0, 200)], 'a note keeps 200 characters');
    assert.ok(r.corrections.some((c) => /is still LISTED on the Guild board: Alaric has not accepted it/.test(c)), '4.1.4: stored as memory, no correction');
    // the claim is true: nothing to correct
    const active = contract(structuredClone(base), 'quest.boars', boarListing, 'active');
    assert.deepEqual(detail(active, note).corrections.filter((c) => /LISTED|ACTIVE/.test(c)), []);
    // the story stays: a client's own bonus, a price on the road, the route
    for (const keep of ['Cotter adds a bonus of 10 cp from his own purse if the fence stays whole.', 'The ferry over the Mill Race costs 2 cp.', 'The boars are most active at dusk near the wallow.']) {
        assert.equal(engineClause(keep), false, keep);
        assert.deepEqual(detail(active, keep).state.quests['quest.boars'].details.map((x) => x.note), [keep]);
    }
    // only the engine's: refused as a whole
    assert.deepEqual(rules(detail(active, 'Contract logged and active; payout 60 cp from the drawer.')), ['engine_owned_detail']);
    // a note that also names Quest XP, rank or promotion, or changes the payment: only those clauses go (4.1.4: the
    // firewall refused the whole note, and the story in it with it)
    for (const [n, kept] of [
        ['Payout 60 cp and 15 Quest XP at the desk. A clean cull counts toward his promotion. The boars sleep in the beech copse by day.', 'The boars sleep in the beech copse by day.'],
        ['No payment if the fence is broken again. The registration fee is waived for him. Cotter keeps a lantern lit at the gate.', 'Cotter keeps a lantern lit at the gate.'],
    ]) {
        const m = detail(active, n);
        assert.deepEqual(rules(m), [], n);
        assert.deepEqual(m.state.quests['quest.boars'].details.map((x) => x.note), [kept]);
    }
    // a note that is nothing but a change of the mechanics stays refused (the firewall, as before)
    assert.deepEqual(rules(detail(active, 'No payment if the fence is broken again. His Guild rank goes up after this one.')), ['guild_quest_detail']);
});

test('a free fact that calls a listed contract active is refused and corrected (4.1.4 refused it without a word)', () => {
    const s = at(contract(structuredClone(base), 'quest.boars', boarListing, 'listed'), HALL, 'loc.redmarch');
    const ctx = { isGuildContractRef: (ref) => ref === 'quest.boars', inGuildHall: true, contracts: Object.values(s.quests) };
    const r = firewall([{ seq: 3, type: 'fact', s: 'quest.boars', p: 'status', o: 'active with Guild stamp on the slip, logged by the clerk' }], { ...ctx, state: s }, s);
    assert.deepEqual(r.reject.map((x) => x.rule), ['engine_owned_fact']);
    assert.ok(r.corrections.some((c) => /still LISTED/.test(c)), JSON.stringify(r.corrections));
});

// ------------------------------------------------------------------------------------------------ 5. creature strength and XP
test('a stronger individual has the individual variation of the content as its numbers; its Defeat XP follows the numbers, not the name', () => {
    const boar = content.anchors.get('boar');
    const std = scaleCreature(boar, 1, 'normal', content);
    const strong = scaleCreature(boar, 1, 'normal', content, 'strong');
    assert.deepEqual([std.max_hp, std.atk, std.def, std.mdef, std.init, std.variation], [41, 11, 2, 0, 7, undefined]);
    assert.deepEqual([strong.max_hp, strong.atk, strong.def, strong.mdef, strong.init, strong.variation], [49, 13, 3, 1, 9, 'strong'], 'Content #7: HP/ATK +20 %, DEF/MDEF +1, Init +2');
    // XP: a standard creature its Level's XP exactly; the stronger one more, less than an Elite or the next Level
    assert.equal(strengthOf({ max_hp: 41, atk: 11 }, std, content), 1);
    const x = (f, type = 'normal') => defeatXp(1, type, 'F', content, strengthOf(f, scaleCreature(boar, 1, type, content), content));
    assert.deepEqual([x(std), x(strong), x(scaleCreature(boar, 1, 'elite', content), 'elite'), defeatXp(2, 'normal', 'F', content)], [12, 14, 18, 24]);
    // an Elite that is also a stronger individual is worth more than an Elite
    assert.ok(x(scaleCreature(boar, 1, 'elite', content, 'strong'), 'elite') > 18);
});

async function boarFight(stronger) {
    const g = await created('Warrior');
    await g.player('*I walk down to the wallow*', [{ seq: 1, type: 'go', to: { new: 'the wallow' }, quote: 'I walk down to the wallow' }]);
    await g.reply('Three boars root at the wallow; the third is half again the size of the others.', {
        expected: { 1: { arrived: true, at: { new: { name: 'the wallow', kind: 'wilderness', parent: 'loc.redmarch' } }, with: null } },
        deltas: [{ seq: 1, type: 'arrive', at: { new: { name: 'the wallow', kind: 'wilderness', parent: 'loc.redmarch' } }, forced_by: null, with: null },
            { seq: 2, type: 'creature.new', ref: 'wild boars', species: 'wild boar', anchor: 'boar', desc: ['grey-bristled'], count: 2, present: true, band: 'ENGAGED' },
            { seq: 3, type: 'creature.new', ref: 'big boar', species: 'big boar', anchor: 'boar', desc: ['half again the size of the others'], count: 1, present: true, band: 'ENGAGED', stronger }],
    });
    // one boar after the other, each fight to its end (the others stand by until attacked)
    for (const label of ['Wild Boar A', 'Wild Boar B', 'Big Boar A']) {
        for (let n = 0; n < 12; n++) {
            await g.player(`*I basic attack ${label}*`);
            await g.reply('Steel and tusk.', { expected: {}, deltas: [] });
            if (!g.state().encounter) break;
        }
    }
    const evs = g.chat.flatMap((m) => m.extra?.avereth?.events || []);
    const started = evs.filter((e) => e.t === 'encounter.started').map((e) => e.d.encounter);
    const defeat = Object.fromEntries(started.flatMap((enc) => Object.values(enc.combatants).filter((c) => c.side === 'hostile').map((c) => [c.label, c.fixed.defeat_xp])));
    return { g, xp: evs.filter((e) => e.t === 'xp.changed'), ended: evs.filter((e) => e.t === 'encounter.ended'), defeat };
}

test('two common boars and a stronger one: the stronger gives more XP; the name "big boar" alone does not; each fight pays once at its end', async () => {
    const plain = await boarFight(null);
    assert.deepEqual(plain.defeat, { 'Wild Boar A': 12, 'Wild Boar B': 12, 'Big Boar A': 12 }, 'a name alone');
    const strong = await boarFight(true);
    assert.deepEqual(strong.defeat, { 'Wild Boar A': 12, 'Wild Boar B': 12, 'Big Boar A': 14 });
    const big = Object.values(strong.g.state().entities).find((e) => e.species === 'big boar');
    assert.deepEqual([big.profile.max_hp, big.profile.atk, big.profile.variation], [49, 13, 'strong']);
    for (const f of [plain, strong]) {
        assert.equal(f.ended.length, 3, 'three fights, each to its end');
        assert.equal(f.xp.length, 3, 'Combat XP once per fight, at its end');
        assert.deepEqual(f.xp.map((e) => e.d.amount), f.ended.map((e) => e.d.summary.xp_awarded));
    }
    assert.deepEqual(strong.xp.map((e) => e.d.amount), [12, 12, 14]);
    assert.equal(Object.values(strong.g.state().entities).filter((e) => e.kind === 'creature' && e.status === 'dead').length, 3);
});

// ------------------------------------------------------------------------------------------------ found on the way: proof matching
test('the trophies in hand match their proof by what it names and the unit\'s first word; the count still decides', () => {
    const q = { proof: [{ kind: 'object', what: 'boar tusks, one pair per kill', qty: 3, unit: 'pairs' }] };
    const s = structuredClone(base);
    s.objects['obj.tusks'] = { id: 'obj.tusks', name: 'boar tusks', kind: 'trophy', qty: 3, unit: 'pairs', holder: { entity: 'pc' }, marks: [] };
    assert.equal(checkProof(s, q).ok, true, '4.1.4: "3 pairs of boar tusks, one pair per kill missing"');
    const joints = { proof: [{ kind: 'object', what: 'bog strider leg joints', qty: 4, unit: 'pairs' }] };
    s.objects['obj.joints'] = { id: 'obj.joints', name: 'bog strider leg joints', kind: 'resource', qty: 4, unit: 'pairs of leg joints', holder: { entity: 'pc' }, marks: [] };
    assert.equal(checkProof(s, joints).ok, true, 'the live run 14:56: "pairs of leg joints" is "pairs"');
    assert.equal(checkProof(s, { proof: [{ kind: 'object', what: 'wolf pelts', qty: 1, unit: 'pelt' }] }).ok, false);
    assert.equal(checkProof(s, { proof: [{ kind: 'object', what: 'boar tusks', qty: 3, unit: 'baskets' }] }).ok, false, 'another unit');
});

// ------------------------------------------------------------------------------------------------ 4. the narrator contract
test('the narrator contract carries its revision; the extractor is told about stronger individuals and engine-owned notes', () => {
    const contract = fs.readFileSync(path.join(ROOT, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
    assert.equal(contract.split('\n')[1], NARRATOR_CONTRACT_REVISION, 'the line the engine looks for on the card');
    assert.equal(EXTRACTOR_VERSION, 'extract-5.0');
    assert.equal(content.deltaVocab.version, 'delta-0.15');
    assert.deepEqual(content.deltaVocab.deltas.find((d) => d.type === 'creature.new').fields.stronger, { type: 'boolean', nullable: true });
    assert.ok(content.deltaVocab.rules.some((r) => /stronger: true only when the reply clearly establishes/.test(r) && /Never from a name or label alone/.test(r)));
});
