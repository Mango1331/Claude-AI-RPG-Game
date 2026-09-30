// Runtime V4, the live run of 30.09.2026 06:34 (build 4.0.8 of the ChatGPT experiment branch) replayed through the
// product's host path with the model's recorded answers (tests/v4/live_0930.json): registration, the Novice board, the
// escort of Aldsa's wool cart to Millbrook with the four wolves at the Ford Narrows, the turn-in in Tidecross and the
// tavern. What the run got wrong (docs/INTEGRATION_4_1.md): the board lost two listings in the reply that showed them
// (C1), twelve penned sheep became twelve combat profiles (C5), "*i nod and we continue*" found no journey to continue
// because the companions had fallen out of the scene, so the arrival at Millbrook was refused while the escort was
// booked ready in the same reply (C2-C4), taking the paid-out copper made a second, phantom "copper" (C6); four wolves
// and the escort left Alaric at 80 XP, short of Level 2.
// The recorded answers were written for the run's own course. Where this build asks differently, the replay gives
// the answer the request now asks for, and says so: message 51, where the catalog now shows JOURNEY READY. The dice
// differ from the run's after message 20 (the sheep no longer draw profiles), so the fight is played with the run's
// skills until it ends rather than blow by blow.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { validateState } from '../../src/validate.js';
import { questXp, defeatXp } from '../../src/progression.js';
import { currentFacts } from '../../src/knowledge.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_0930.json'), 'utf8'));
const ESCORT = 'quest.shepherd_cart_to_millbrook';
// the answer the interpreter's request asks for now: the catalog of message 51 shows JOURNEY READY (the run's had none)
const NOW = { 51: [{ seq: 1, type: 'journey.continue', quote: 'we continue' }] };

async function replay() {
    const g = new Chat4(content, { seed: fx.seed, greeting: fx.greeting, listings: fx.listings });
    for (const m of fx.creation) await g.player(m);
    const at = {};
    const problems = [];
    const check = (i) => problems.push(...validateState(g.state(), content).map((p) => `${i}: ${p}`));
    let story = true;
    for (const t of fx.turns) {
        if (t.player !== undefined) {
            if (t.route === 'v3') {
                if (!g.state().encounter) { story = false; continue; } // the fight ended before the run's next blow
                const s = g.state();
                const named = /(Wolf [A-D])/.exec(t.player)?.[1];
                const alive = Object.values(s.encounter.combatants).filter((c) => c.side === 'hostile' && !c.current.defeated);
                const target = alive.some((c) => c.label === named) ? named : alive[0].label; // the run's target, or one still standing
                at[t.i] = { prep: await g.player(t.player.replace(named, target)) };
                story = at[t.i].prep.action === 'context';
            } else {
                at[t.i] = { prep: await g.player(t.player, NOW[t.i] ?? t.commands), catalog: g.calls.filter((c) => c.purpose === 'interpret').at(-1)?.messages[1].content };
                story = at[t.i].prep.action === 'context';
            }
            at[t.i].state = g.state();
            check(t.i);
        } else if (story) {
            at[t.i] = { rec: (await g.reply(t.reply, t.answer ?? { expected: {}, deltas: [] })).record };
            at[t.i].state = g.state();
            check(t.i);
        }
        // the run's blows are spent and wolves still stand: the fight goes on with the run's skills until it ends
        if (t.i === 40) {
            for (let n = 0; n < 12 && g.state().encounter; n++) {
                const alive = Object.values(g.state().encounter.combatants).filter((c) => c.side === 'hostile' && !c.current.defeated);
                await g.player(`*I Heavy Slash ${alive[0].label}*`);
                await g.reply('The blade comes around again.', { expected: {}, deltas: [] });
                check(`40+${n}`);
            }
        }
    }
    return { g, at, problems };
}

const { g, at, problems } = await replay();
const S = (i) => at[i].state;
const refused = (i) => (at[i].rec?.rejected || []).map((x) => x.rule);

test('the run replays on this build with the invariants intact after every message', () => {
    assert.deepEqual(problems, []);
    assert.equal(g.chat.filter((m) => m.extra?.avereth?.extraction?.status === 'failed').length, 0);
});

test('C1: the board keeps the five listings it showed; the escort is accepted from it', () => {
    assert.deepEqual(refused(14).filter((r) => r === 'board_first_display').length, 2, 'the run removed the Reed Docks and the Gnawed Barrow jobs');
    const s = S(14);
    assert.equal(Object.values(s.quests).filter((q) => q.status === 'listed').length, 5);
    assert.equal(S(17).quests[ESCORT].status, 'active');
});

test('C5: the twelve penned sheep are one background fact; the four wolves at the ford are four profiles', () => {
    const s = S(20);
    assert.equal(Object.values(s.entities).filter((e) => e.kind === 'creature').length, 0);
    assert.deepEqual(currentFacts(s, (f) => f.p === 'background_fauna').map((f) => `${f.s}: ${f.o}`), ['loc.tidecross.cordwainer_row: 12 sheep']);
    const wolves = Object.values(S(26).entities).filter((e) => e.kind === 'creature' && e.anchor === 'wolf');
    assert.equal(wolves.length, 4);
    assert.ok(wolves.every((w) => w.profile && w.profile.max_hp > 0), 'locked before the first blow');
});

test('C4: both recorded continuations of the road are authorised journeys; the first one begins the escort\'s journey', () => {
    for (const i of [23, 25]) assert.deepEqual(S(i).last.outcome.resolutions.map((r) => [r.type, r.status]), [['journey.continue', 'authorized']], `message ${i}`);
    assert.equal(S(21).quests[ESCORT].journey, undefined, 'accepted and about to leave: not begun yet');
    assert.equal(S(23).quests[ESCORT].journey?.from, 'loc.tidecross.cordwainer_row');
});

test('the fight: all four wolves fall; their locked DefeatXP reaches Alaric once', () => {
    const s = g.state();
    const wolves = Object.values(s.entities).filter((e) => e.kind === 'creature' && e.anchor === 'wolf' && e.species === 'wolf');
    assert.equal(wolves.length, 4);
    assert.ok(wolves.every((w) => w.status === 'dead'));
    const combat = g.chat.flatMap((m) => m.extra?.avereth?.events || []).filter((e) => e.t === 'xp.changed' && /^Combat XP/.test(e.d.reason));
    assert.deepEqual(combat.map((e) => e.d.amount), [4 * defeatXp(1, 'normal', 'F', content)]);
});

test('C2: who stays at the ford while Alaric climbs the scree is at the ford; nobody reappears there by himself on the way back', () => {
    const s = S(44);
    assert.ok(!s.scene.present.includes('npc.aldsa'));
    assert.equal(s.entities['npc.aldsa'].at, 'loc.ford_narrows_on_the_river_road');
    // the recorded answers never brought Aldsa back into the scene (they had no arrive.with, no enter); she travelled
    // on to Millbrook in the story, so the ford on the way home must not show her
    assert.equal(S(58).scene.at, 'loc.ford_narrows_on_the_river_road');
    assert.ok(!S(58).scene.present.includes('npc.aldsa'));
});

test('C3/C4: at message 51 the catalog shows the journey underway; the arrival at Millbrook is his and the escort is ready there', () => {
    assert.match(at[51].catalog, /JOURNEY READY: quest\.shepherd_cart_to_millbrook — "Shepherd Cart to Millbrook": the contract's journey is underway/);
    assert.deepEqual(S(51).last.outcome.resolutions.map((r) => [r.type, r.status]), [['journey.continue', 'authorized']]);
    assert.ok(!refused(52).includes('no_go'), 'the run refused the arrival');
    assert.ok(!refused(52).includes('quest_dependency'));
    assert.equal(S(52).quests[ESCORT].ready, true);
    assert.match(S(52).entities.pc.location ?? S(52).scene.location, /./);
    assert.equal(S(52).places[S(52).scene.at].name, 'Millbrook');
});

test('D: the turn-in pays the posted 90 cp once and its Quest XP; four wolves and the escort make Level 2', () => {
    const s = S(61);
    assert.equal(s.quests[ESCORT].status, 'completed');
    assert.equal(s.entities.pc.sheet.coin_cp, 50 - 20 + 90, '120 cp: 1 gold 2 silver, as the run');
    const xp = 4 * defeatXp(1, 'normal', 'F', content) + questXp(2, 'standard', content);
    assert.equal(xp, 108);
    assert.deepEqual([s.entities.pc.sheet.level, s.entities.pc.sheet.xp], [2, xp - 100]);
});

test('C6: taking the paid-out copper makes no second copper; the water costs its one copper once, after he agrees', () => {
    assert.ok(!Object.values(S(64).objects).some((o) => /copper/i.test(o.name)), 'the run made an object "copper"');
    assert.equal(S(64).entities.pc.sheet.coin_cp, 120);
    assert.deepEqual(S(65).last.outcome.resolutions.map((r) => [r.type, r.status]), [['buy', 'pending'], ['activity', 'authorized']]);
    assert.equal(S(66).entities.pc.sheet.coin_cp, 120, 'nothing is paid before he agrees');
    assert.equal(S(68).entities.pc.sheet.coin_cp, 119);
});
