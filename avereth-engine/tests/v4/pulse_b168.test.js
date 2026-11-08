// .168 (patch_plans_10b/REVIEW_PULSE167_PRODUKTDIFF_GPT.md §3, P2): the static exclusions of package A (learning, a
// technical repeat of the same input) hold inside a Living Dungeon too; the Dungeon branch only sets its frame and
// governs: false. Host path: planner turns, narrator replies, extractor answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk, delve, hero, fightAll, living, outcomeOf, lastUser, GO, CATA } from './patch8_lib.js';
import { pulseBegin } from '../../src/v4/pulse.js';
import { foldChat } from '../../src/host.js';
import { clone } from '../../src/util.js';

const content = await loadProductContent();
const LOOK = (quote = 'I look around the gallery') => ({ type: 'other', what: 'look around', quote });
const ev = (r, t) => (r?.events || []).filter((e) => e.t === t);
async function withForce(force, fn) {
    const was = content.rules.pulse.force;
    content.rules.pulse.force = force;
    try { return await fn(); } finally { content.rules.pulse.force = was; }
}
const DANGER = { open: true, kind: 'danger' };
async function gallery() {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel; a stair goes down.' });
    await delve(g, 'First Burial Gallery');
    await fightAll(g);
    assert.equal(g.state().encounter, null);
    return g;
}

test('.168 P2: the same input twice in a row inside a Living Dungeon: the second is a technical repeat (no draw, no reservation, streak unchanged)', async () => {
    const g = await gallery();
    await withForce({ open: false }, () => say(g, '*I look around the gallery*', LOOK()));
    assert.equal(ev(lastUser(g), 'pulse.rolled').length, 1, 'the first draws');
    await g.reply('Dust and old bones.', { expected: {}, deltas: [] });
    const before = clone(g.state().pulse);
    await withForce(DANGER, () => say(g, '*I look around the gallery*', LOOK()));
    const p = outcomeOf(g).auth.pulse;
    assert.equal(p.reason, 'repeat', JSON.stringify(p));
    assert.equal(p.governs, false, 'the Dungeon firewall still governs its foes');
    assert.equal(ev(lastUser(g), 'pulse.rolled').length, 0);
    assert.equal(ev(lastUser(g), 'dungeon.ahead').length, 0, 'no wandering minion reserved');
    assert.deepEqual(g.state().pulse, before, 'misses and recent unchanged');
    await g.reply('Still dust.', { expected: {}, deltas: [] });
    // save/reload: the same fold, and the repeat stays a repeat
    assert.deepEqual(foldChat(structuredClone(g.chat)).state, g.state());
});

test('.168 P2: study inside a Living Dungeon is learning: no draw, no reservation', async () => {
    const g = await gallery();
    const before = clone(g.state().pulse);
    await withForce(DANGER, () => say(g, '*I study my Flame Lance for an hour*', { type: 'activity', kind: 'study', what: 'Flame Lance', learn: 'mage.flame_lance', minutes: 60, until: null, quote: 'I study my Flame Lance for an hour' }));
    const o = outcomeOf(g);
    assert.ok(o, JSON.stringify(lastUser(g).plan?.error || lastUser(g).continuation));
    assert.ok(o.resolutions.some((r) => r.type === 'activity' && r.status === 'resolved'), `a valid study: ${JSON.stringify(o.resolutions)}`);
    const p = o.auth.pulse;
    assert.equal(p.reason, 'learning', JSON.stringify(p));
    assert.equal(p.governs, false);
    assert.equal(ev(lastUser(g), 'pulse.rolled').length, 0);
    assert.equal(ev(lastUser(g), 'dungeon.ahead').length, 0);
    assert.deepEqual(g.state().pulse, before);
});

test('.168: positive controls inside the Dungeon: two different inputs both draw; combat, DUNGEON AHEAD and a Dungeon without a living record as before', async () => {
    const g = await gallery();
    await withForce({ open: false }, () => say(g, '*I look around the gallery*', LOOK()));
    assert.equal(ev(lastUser(g), 'pulse.rolled').length, 1);
    await g.reply('Dust.', { expected: {}, deltas: [] });
    await withForce(DANGER, () => say(g, '*I listen at the far arch*', LOOK('I listen at the far arch')));
    assert.equal(ev(lastUser(g), 'pulse.rolled').length, 1, 'a different input draws');
    assert.equal(ev(lastUser(g), 'dungeon.ahead')[0]?.d.ahead.wander, true, 'and its danger reserves the free minion as in .167');
    await g.reply('Nothing comes.', { expected: {}, deltas: [] });
    await withForce(DANGER, () => say(g, '*I go on deeper*', GO({ new: 'deeper' }, 'I go on deeper')));
    assert.equal(outcomeOf(g).auth.pulse.reason, 'dungeon_ahead');
    assert.equal(ev(lastUser(g), 'pulse.rolled').length, 0);
    const s = clone(g.state());
    const fight = clone(s); fight.encounter = { id: 'enc.test' };
    assert.deepEqual([pulseBegin(fight, content, [LOOK()], { c: true }).reason, pulseBegin(fight, content, [LOOK()], { c: true }).governs], ['combat', true], 'combat first, as in .166/.167');
    const pending = clone(s); pending.pending_combat = [{ by: 'x' }];
    assert.equal(pulseBegin(pending, content, [LOOK()], { c: true }).reason, 'combat');
    const old = clone(s); delete old.dungeons[CATA];
    for (const cmds of [[LOOK()], [{ type: 'activity', kind: 'study', minutes: 60 }]]) {
        const P = pulseBegin(old, content, cmds, { c: true });
        assert.deepEqual([P.reason, P.governs], ['dungeon', false], 'a Dungeon without a living record keeps its exclusion first');
    }
    const live = pulseBegin(s, content, [LOOK('something new')], { c: true });
    assert.deepEqual([live.reason, live.governs, live.dungeon], [null, false, CATA]);
    assert.ok(living(g));
});
