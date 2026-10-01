// Runtime V4, the live run of 30.09.2026 22:41 (build 4.1.4) replayed through the product's host path with the model's
// recorded answers (tests/v4/live_0930c.json): a Mage registers at Alderwatch, reads the Novice board, takes the boar
// cull and kills three boars. What the run got wrong (docs/INTEGRATION_4_1.md §12):
//   - "*i take the Cull the Gnaw Hide Boars at the Mill Road Turnips Quest and register it at the front dest*" was a
//     stealth check against the clerk (the "Hide" of the title): no quest.accept, the contract stayed on the board;
//   - the Board generator gave the cull a "TALK Harl Cotter to confirm the losses have stopped", which made it mixed work;
//   - the extractor stored "Contract registered and active; payout 60 cp …" as a quest note, and nobody told the
//     narrator that the contract was still listed;
//   - the "big boar" had the numbers of a common one (and gave its 12 XP).
// The replay gives the recorded answers. Where this build asks differently it says so: message 15 now goes to the
// interpreter, whose answer the run never got; the replay gives the one it asks for (quest.accept of the listing). The
// stealth check of message 15 took one die in the run, so the fight's dice shift by one draw: the fight is played with
// the run's commands against the boars that are actually there, and to its end.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { validateState } from '../../src/validate.js';
import { routeTurn } from '../../src/v4/turn.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { defeatTally, tallyText, isHunt } from '../../src/v4/guild.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_0930c.json'), 'utf8'));
const Q = 'quest.cull_the_gnaw_hide_boars_at_the_mill_road_turnips';
const ACCEPT = [{ seq: 1, type: 'quest.accept', quest: Q, quote: 'i take the Cull the Gnaw Hide Boars at the Mill Road Turnips Quest' }];
const events = (g, i) => g.chat[i]?.extra?.avereth?.events || [];

async function replay() {
    const g = new Chat4(content, { seed: fx.seed, greeting: fx.greeting, listings: fx.listings });
    for (const m of fx.creation) await g.player(m);
    const at = {};
    const problems = [];
    const check = (i) => problems.push(...validateState(g.state(), content).map((p) => `${i}: ${p}`));
    let story = true;
    for (const t of fx.turns) {
        if (t.player !== undefined) {
            const before = g.state();
            let text = t.player;
            // the fight: the run's commands against a boar that is still standing
            const label = /(Wild Boar [AB]|Big Boar A)/.exec(text)?.[1];
            if (label && before.encounter) {
                const named = Object.values(before.encounter.combatants).find((c) => c.label === label);
                const standing = Object.values(before.encounter.combatants).filter((c) => c.side === 'hostile' && !c.current.defeated);
                if ((!named || named.current.defeated) && standing.length) text = text.replace(label, standing[0].label);
                if (!standing.length) { story = false; continue; }
            }
            at[t.i] = { route: routeTurn(before, content, text), before };
            const prep = await g.player(text, t.i === 15 ? ACCEPT : t.commands || []);
            at[t.i].msg = g.chat.length - 1;
            at[t.i].actions = g.state().last?.outcome?.actions || [];
            story = prep.action === 'context';
            at[t.i].state = g.state();
            check(t.i);
        } else if (story) {
            const r = await g.reply(t.reply, t.answer ?? { expected: {}, deltas: [] });
            at[t.i] = { rec: r.record, state: g.state() };
            check(t.i);
        }
    }
    // the fight to its end, as the run's player fought it
    for (let n = 0; n < 12 && g.state().encounter; n++) {
        const alive = Object.values(g.state().encounter.combatants).filter((c) => c.side === 'hostile' && !c.current.defeated);
        await g.player(`*I basic attack ${alive[0].label}*`);
        await g.reply('The staff comes down again.', { expected: {}, deltas: [] });
        check(`end+${n}`);
    }
    return { g, at, problems };
}

const { g, at, problems } = await replay();
const S = (i) => at[i].state;

test('the run replays on this build with the invariants intact after every message', () => {
    assert.deepEqual(problems, []);
    assert.equal(g.chat.filter((m) => m.extra?.avereth?.extraction?.status === 'failed').length, 0);
});

test('taking the "Gnaw-Hide Boars" contract is no stealth: the message goes to the interpreter and the contract is his', () => {
    assert.equal(at[15].route, 'v4', 'the run: v3, a stealth check against the clerk');
    assert.ok(!events(g, at[15].msg).some((e) => e.t === 'scene.concealed'));
    assert.equal(S(15).quests[Q].status, 'active');
    assert.ok(Object.values(S(15).objects).some((o) => o.holder?.entity === 'pc' && /contract slip/i.test(o.name)));
    // the real stealth of the run stays stealth
    assert.equal(at[25].route, 'v3');
});

test('the cull is a hunt: the confirmation errand is not booked, the acceptance names the tusks and no local sign-off', () => {
    const q = S(15).quests[Q];
    assert.deepEqual(q.objectives.map((o) => o.verb), ['FIND', 'DEFEAT'], 'the listing had TALK "Harl Cotter to confirm the losses have stopped"');
    assert.equal(isHunt(q, content), true);
    assert.match(at[15].actions.join(' '), /Proof: 3 pairs of boar tusks, one pair per kill brought to a Guild hall; no local inspection, witness or signature is required\./);
    // the delivery of the satchel keeps its receipt
    const satchel = Object.values(S(15).quests).find((x) => /Satchel/.test(x.title));
    assert.ok(satchel.objectives.some((o) => o.verb === 'TALK' && /confirm receipt/.test(o.what)));
});

test('the quest note keeps the story, not "registered and active; payout 60 cp"', () => {
    const notes = S(16).quests[Q].details.map((x) => x.note);
    assert.equal(notes.length, 2);
    assert.ok(notes.every((n) => !/registered|active|payout|60 cp/i.test(n)), JSON.stringify(notes));
    assert.match(notes[0], /^Proof at turn-in: boar tusks, or Harl Cotter's own mark signing for them alive or dead\. Cotter has already gone through three adventurers this season/);
    assert.match(notes[1], /^Route: Mill Road is the south road out of Alderwatch's walled gate/);
    assert.deepEqual(at[16].rec.corrections, [], 'the contract is active now: the claim is true, nothing to correct');
});

test('three boars killed: the engine counts them for the active contract; the big boar, a common one in its numbers, gives 12 XP like the others', () => {
    const end = g.state();
    const boars = Object.values(end.entities).filter((e) => e.kind === 'creature');
    assert.deepEqual(boars.map((e) => e.status), ['dead', 'dead', 'dead']);
    assert.ok(boars.every((e) => e.profile.max_hp === 41 && e.profile.atk === 11 && !e.profile.variation), 'the recorded answer named it "big boar" and nothing more');
    const xp = g.chat.flatMap((m) => m.extra?.avereth?.events || []).filter((e) => e.t === 'xp.changed');
    assert.equal(xp.length, 1, 'Combat XP once, at the end of the encounter');
    assert.equal(xp[0].d.amount, 36);
    assert.match(xp[0].d.reason, /Big Boar A 12/);
    assert.equal(tallyText(defeatTally(end, content, end.quests[Q])), '3 of 3 tusked pen-breaking boars');
    assert.match(buildCatalog(end, content).quests.find((x) => x.id === Q).info, /defeated \(engine count\): 3 of 3/);
});

test('the rest the run could not test, in a controlled continuation: tusks in hand, back at the hall, paid once', async () => {
    const end = g.state();
    assert.ok(!/(?<!NOT )READY FOR TURN-IN/.test(buildCatalog(end, content).quests.find((x) => x.id === Q).info), 'no tusks yet, no story readiness');
    // he cuts the tusks (the take the story would book) and walks back to the Guild hall
    await g.player('*I cut the tusks from all three boars*', [{ seq: 1, type: 'take', object: { new: 'boar tusks' }, qty: 3, quote: 'I cut the tusks from all three boars' }]);
    await g.reply('He works the tusks free, three pairs, and wraps them in his cloak.', { expected: { 1: { taken: true } }, deltas: [{ seq: 1, type: 'object.new', name: 'boar tusks', kind: 'trophy', qty: 3, unit: 'pairs', holder: 'pc', for_quest: Q }] });
    assert.match(buildCatalog(g.state(), content).quests.find((x) => x.id === Q).info, /READY FOR TURN-IN: the listed proof is in hand \(3 pairs of boar tusks/);
    await g.player('*I walk back to Alderwatch and the Guild hall*', [{ seq: 1, type: 'go', to: 'loc.alderwatch.guild_hall', quote: 'I walk back to Alderwatch and the Guild hall' }]);
    await g.reply('The walk back takes the rest of the morning.', { expected: { 1: { arrived: true, at: 'loc.alderwatch.guild_hall', with: null } }, deltas: [{ seq: 1, type: 'arrive', at: 'loc.alderwatch.guild_hall', forced_by: null, with: null }] });
    assert.equal(g.state().scene.at, 'loc.alderwatch.guild_hall');
    const coin = g.state().entities.pc.sheet.coin_cp;
    const xp = g.state().entities.pc.sheet.xp;
    await g.player('*I put the tusks on the counter and turn the contract in*', [{ seq: 1, type: 'quest.turn_in', quest: Q, quote: 'turn the contract in' }]);
    assert.equal(g.state().quests[Q].status, 'completed');
    assert.equal(g.state().entities.pc.sheet.coin_cp, coin + 60);
    assert.ok(g.state().entities.pc.sheet.xp > xp || g.state().entities.pc.sheet.level > 1, 'Quest XP');
    await g.reply('The clerk counts out sixty copper.', { expected: {}, deltas: [] });
    await g.player('*I turn the boar contract in again*', [{ seq: 1, type: 'quest.turn_in', quest: Q, quote: 'turn the boar contract in again' }]);
    assert.equal(g.state().last.outcome.resolutions[0].reason, 'already_completed');
    assert.equal(g.state().entities.pc.sheet.coin_cp, coin + 60, 'paid once');
});
