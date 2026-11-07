// .163 (patch_plans_10b/REVIEW_PULSE162_PRODUKTDIFF_SOL.md R1/R2): the narrator hears the same sought-contact exception
// the firewall enforces (R1), and a search seeks a kind only by whole words of its focus, never by a part of a word or a
// shared adjective (R2). The review's reproduction, turned into regressions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign } from './patch8_lib.js';
import { applyEvent } from '../../src/state.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { searchSought, focusNames } from '../../src/v4/pulse.js';
import { buildContext } from '../../src/context.js';
import { applyWorld } from '../../src/v4/world.js';
import { Dice } from '../../src/rng.js';

const content = await loadProductContent();
const realm = 'realm.valedorn_crown';
function places(s) {
    s.places['loc.wood'] = { id: 'loc.wood', name: 'Hartwood', kind: 'wilderness', parent: realm, realm, tags: [], population: { species: 'wild boar', anchor: 'boar', levels: [4, 7] } };
    s.places['loc.wood.glade'] = { id: 'loc.wood.glade', name: 'Oak glade', kind: 'site', parent: 'loc.wood', realm, tags: [] };
    s.scene.at = 'loc.wood.glade'; s.scene.present = ['pc'];
    return s;
}
function turn(s0, commands, input) {
    const s = structuredClone(s0), events = [], emit = (e) => { applyEvent(s, e); events.push(e); };
    emit({ t: 'turn.begun', d: { turn: s.turn + 1, input_hash: 'r163', input } });
    const ctx = resolveCommands(s, content, commands.map((c, i) => ({ seq: i + 1, ...c })), emit, { c: true, msg: 1, dice: Dice.from(s) });
    const outcome = { c: true, kind: 'v4', actions: [], extra: ctx.extra, resolutions: ctx.resolutions, auth: ctx.auth, expected_keys: {} };
    s.last.outcome = outcome;
    return { s, ctx, events, envelope: buildContext(s, content, { outcome }).text.split('\n').filter((x) => /Nobody new|Someone new/.test(x)).join('\n') };
}
const boar = { seq: 1, type: 'creature.new', ref: 'boar', species: 'wild boar', anchor: 'boar', desc: [], count: 1, present: true, band: 'SHORT', cluster: null, stronger: null, threat: true, more: true, population: 'loc.wood', life_stage: 'adult' };
const attack = (s, deltas = [boar, { seq: 2, type: 'hostile', by: ['boar'] }], prose = 'A wild boar bursts out and charges him.') =>
    applyWorld(s, content, { scene: 'here', expected: {}, deltas }, { msg: 50, prose });
const fight = (r) => !!r.state.encounter || !!(r.state.pending_combat || []).length;
const SEARCH = (what) => ({ type: 'activity', kind: 'search', what, minutes: 30, until: null, quote: `I search for ${what}` });
async function withScores(score, fn) {
    const d = content.rules.checks.difficulty_scores, was = d.moderate;
    d.moderate = score;
    try { return await fn(); } finally { d.moderate = was; }
}
async function withForce(force, fn) {
    const was = content.rules.pulse.force;
    content.rules.pulse.force = force;
    try { return await fn(); } finally { content.rules.pulse.force = was; }
}
const base = async () => places(structuredClone((await campaign(content)).state()));

// ------------------------------------------------------------------------------------------------ R2
test('.163 R2: a search seeks a kind only by whole words: boar tracks yes, broken boards and wild herbs no', async () => {
    const anchor = content.anchors.get('boar');
    for (const [focus, yes] of [['boar tracks', true], ['the boars', true], ['tracks of a wild boar', true], ['broken boards', false], ['wild herbs', false], ['the wild', false], ['a boardwalk', false]])
        assert.equal(focusNames(content, focus, 'wild boar', anchor), yes, focus);
    assert.equal(focusNames(content, 'the next snapping turtle in the darkening pond', 'giant snapping turtles', content.anchors.get('aquatic')), true, 'a participle does not hide the head noun');
    assert.equal(focusNames(content, 'a hound', 'feral dogs', content.anchors.get('dog')), true, 'the content\'s kind words hold');
    // the contract branch: the named creature, never any word of the objective
    const s = await base();
    delete s.places['loc.wood'].population;
    s.quests['quest.boar'] = { id: 'quest.boar', status: 'active', taker: 'pc', title: 'Defeat wild boar', objectives: [{ verb: 'DEFEAT', what: 'wild boar', qty: 1 }] };
    assert.deepEqual(searchSought(s, content, 'wild herbs'), []);
    assert.deepEqual(searchSought(s, content, 'boar tracks'), [{ contract: 'quest.boar' }]);
});

test('.163 R2: a successful search for broken boards at the boar habitat is no boar search: the window decides, a new boar\'s attack is refused', async () => {
    const s = await base();
    await withScores(0.0001, () => withForce({ open: false }, async () => {
        const boards = turn(s, [SEARCH('broken boards')], 'I search for broken boards.');
        assert.equal(boards.ctx.searchChecks[0].success, true);
        assert.equal(boards.ctx.auth.pulse.sought, undefined);
        assert.notEqual(boards.ctx.auth.pulse.reason, 'sought');
        assert.equal(boards.ctx.auth.pulse.rolled, true, 'the regular window is drawn');
        const r = attack(boards.s);
        assert.equal(fight(r), false);
        assert.ok(r.rejected.some((x) => x.rule === 'pulse'), JSON.stringify(r.rejected));
        assert.doesNotMatch(boards.envelope, /Exception he sought himself/);
        // the positive control: boar tracks
        const tracks = turn(s, [SEARCH('boar tracks')], 'I search for boar tracks.');
        assert.deepEqual(tracks.ctx.auth.pulse.sought, [{ population: 'loc.wood' }]);
        assert.equal(fight(attack(tracks.s)), true);
    }));
});

// ------------------------------------------------------------------------------------------------ R1
test('.163 R1: the narrator hears the sought exception the firewall allows: successful search at the habitat', async () => {
    const s = await base();
    await withScores(0.0001, async () => {
        const t = turn(s, [SEARCH('boar tracks')], 'I search for boar tracks.');
        assert.match(t.envelope, /Nobody new in this reply attacks Alaric or takes his coin or things/);
        assert.match(t.envelope, /Exception he sought himself: the wild boar of Hartwood he is seeking, where he actually is may meet him and turn on him; they take nothing of his either\./);
        assert.equal(fight(attack(t.s)), true, 'and the world applier allows exactly that');
        // strangers stay refused in the same turn
        const r = attack(t.s, [{ seq: 1, type: 'person.new', ref: 'bandits', name: null, role: 'bandit', desc: ['armed bandit'], present: true, relevant: true, threat: true, at: null, band: 'SHORT' }, { seq: 2, type: 'hostile', by: ['bandits'] }], 'Bandits attack him.');
        assert.ok(r.rejected.some((x) => x.rule === 'pulse'));
    });
});

test('.163 R1: an active hunt with a closed window: the narrator hears the hunt exception; other kinds and people are not named', async () => {
    const s = await base();
    s.quests['quest.boar'] = { id: 'quest.boar', status: 'active', taker: 'pc', hunt: { at: 'loc.wood' }, objectives: [{ verb: 'DEFEAT', what: 'wild boar', qty: 1 }] };
    await withForce({ open: false }, async () => {
        const t = turn(s, [], 'I lure the boar by tapping the tree.');
        assert.equal(t.ctx.auth.pulse.rolled, true);
        assert.match(t.envelope, /Exception he sought himself: the wild boar of his hunt in Hartwood, while he is in their habitat may meet him and turn on him/);
        assert.equal(fight(attack(t.s)), true);
    });
});

test('.163 R1: a population he seeks and hunts is named once', async () => {
    const s = await base();
    s.quests['quest.boar'] = { id: 'quest.boar', status: 'active', taker: 'pc', hunt: { at: 'loc.wood' }, objectives: [{ verb: 'DEFEAT', what: 'wild boar', qty: 1 }] };
    await withScores(0.0001, async () => {
        const t = turn(s, [SEARCH('boar tracks')], 'I search for boar tracks.');
        assert.equal((t.envelope.match(/wild boar/g) || []).length, 1, t.envelope);
    });
});

test('.163 R1: a leg to the habitat: the exception holds only once he has actually arrived; nothing without seeking; a danger window keeps both rules', async () => {
    const s = await base();
    s.scene.at = 'loc.alderwatch'; // in town, setting out for the habitat
    const leg = turn(s, [{ type: 'go', to: 'loc.wood', quote: 'I head into the Hartwood to hunt boar' }], 'I head into the Hartwood to hunt boar.');
    assert.equal(leg.ctx.auth.pulse.exposure, 'travel');
    assert.match(leg.envelope, /the wild boar of Hartwood he is seeking, only once he has actually reached Hartwood \(never on the way there\)/);
    const plain = turn(s, [], 'I look around the square.');
    assert.doesNotMatch(plain.envelope, /Exception/);
    // danger window with a sought contact (built directly: a scene where both apply)
    const both = await base();
    const ctx = { c: true, kind: 'v4', actions: [], extra: [], resolutions: [], auth: { c: true, gos: [], pulse: { v: 1, governs: true, rolled: true, open: true, kind: 'danger', exposure: 'scene', sought: [{ population: 'loc.wood' }] } }, expected_keys: {} };
    both.last.outcome = ctx;
    const text = buildContext(both, content, { outcome: ctx }).text;
    assert.match(text, /Someone new in this reply attacks Alaric only as the ONE hostile group the PULSE line names.*Exception he sought himself: the wild boar of Hartwood/);
});
