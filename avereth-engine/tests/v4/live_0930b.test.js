// Runtime V4, the live run of 30.09.2026 14:56 (build 4.1.1) replayed through the product's host path with the model's
// recorded answers (tests/v4/live_0930b.json): registration in Glassmere, the Bog Striders contract at the Reed Flats,
// two fights, the trophies, the way back. What the run got wrong (docs/INTEGRATION_4_1.md §9):
//   - "walk back to the city" was dropped as the steward's deed (the "Walk" of his label), "the guild building" became
//     a new place, and out at the weirs the catalog listed no Guild hall;
//   - the big strider that withdrew came back as a second "Bog Strider D"; the first stayed alive in the state;
//   - three striders died, four pairs of leg joints lay in the pack, and the contract was booked ready for four;
//   - "found 3 killed 2 *i say calmly*" asked for an attack target, "Heavy Slash at it" offered the steward, "keep
//     myself hidden as i lay in wait" was no stealth;
//   - the steward's inspection and signature became a condition of the payout; a fact's object text became the clerk.
// The replay gives the recorded answers; where this build asks differently it says so: the second fight is played
// with the run's skills against the strider that is actually there (the run named "Bog Strider D", which is now the
// returning first one) until it ends. The two messages that got a target question in the run are no replay turns (the
// chat keeps them hidden); they are checked against the replay's state instead.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { validateState } from '../../src/validate.js';
import { parseIntent } from '../../src/intent.js';
import { routeTurn } from '../../src/v4/turn.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { sceneHandle } from '../../src/v4/scene_handles.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { checkProof } from '../../src/v4/guild.js';
import { applyEvent } from '../../src/state.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_0930b.json'), 'utf8'));
const QUEST = 'quest.bog_striders_in_the_reed_flats';
const striders = (s) => Object.values(s.entities).filter((e) => e.kind === 'creature' && e.species === 'bog strider');

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
            // the second fight: the run's skills against the strider that is actually there
            if (t.route === 'v3' && /Bog Strider D/.test(text)) {
                const live = striders(before).find((e) => before.scene.present.includes(e.id) && e.status !== 'dead');
                if (!live) { story = false; continue; }
                const label = before.encounter?.combatants?.[live.id]?.label || sceneHandle(before, content, live.id);
                text = text.replace('Bog Strider D', label);
            }
            at[t.i] = { before, prep: await g.player(text, t.commands || []), catalog: g.calls.filter((c) => c.purpose === 'interpret').at(-1)?.messages[1].content };
            story = at[t.i].prep.action === 'context';
            at[t.i].state = g.state();
            check(t.i);
        } else if (story) {
            at[t.i] = { rec: (await g.reply(t.reply, t.answer ?? { expected: {}, deltas: [] })).record };
            at[t.i].state = g.state();
            check(t.i);
        }
        if (t.i === 44) {
            for (let n = 0; n < 8 && g.state().encounter; n++) {
                const alive = Object.values(g.state().encounter.combatants).filter((c) => c.side === 'hostile' && !c.current.defeated);
                await g.player(`*I basic attack ${alive[0].label}*`);
                await g.reply('The blade comes around again.', { expected: {}, deltas: [] });
                check(`44+${n}`);
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

test('the returning strider is the one that withdrew: three striders in all, all three dead after the second fight', () => {
    const mound = 'mon.npcbog_strider_mound';
    assert.ok(!S(32).scene.present.includes(mound), 'it backed off into the reeds');
    assert.ok(S(40).scene.present.includes(mound), 'the creature.new of its return brought the same strider back');
    assert.equal(striders(S(40)).length, 3, 'the run made a fourth, "Bog Strider D"');
    const end = g.state();
    assert.deepEqual(striders(end).map((e) => [e.id, e.status]).sort(), [['mon.npcbog_strider_flankers_1', 'dead'], ['mon.npcbog_strider_flankers_2', 'dead'], [mound, 'dead']]);
    assert.equal(end.entities.pc.sheet.xp, 36, 'three striders, 12 XP each, as the run');
});

test('the contract is not ready on four pairs of joints for three kills: the engine count stands, the story may still say how', () => {
    assert.ok(refused(48).includes('quest_count'), 'the run booked it ready for four');
    assert.notEqual(S(48).quests[QUEST].ready, true);
    assert.deepEqual(Object.values(S(48).objects).filter((o) => o.holder?.entity === 'pc' && /joints/.test(o.name)).map((o) => o.qty), [2, 2], 'the trophies stay his');
    assert.match(buildCatalog(S(48), content).quests.find((q) => q.id === QUEST).info, /defeated \(engine count\): 3 of 4 bog striders/);
    assert.ok(at[48].rec.corrections.some((c) => /still IN PROGRESS: the engine counts 3 of 4 bog striders/.test(c)), 'the narrator is told the count');
});

test('the Guild asks no local signature for a hunt: the steward\'s sign-off is not stored as a condition; the route is', () => {
    const notes = S(14).quests[QUEST].details.map((x) => x.note);
    assert.ok(notes.some((n) => /south road out of Glassmere/.test(n)), 'the route stays');
    assert.ok(!notes.some((n) => /must confirm/.test(n)), 'the run stored "must confirm ... and inspect/sign the site before payment"');
    assert.ok(!S(38).quests[QUEST].details.some((x) => /sign the proof once/.test(x.note)));
    assert.match(S(13).last.outcome.actions[0], /Proof: 4 pairs of bog strider leg joints brought to a Guild hall; no local inspection, witness or signature is required/);
});

test('the way back: both parts of "walk back to the city and to the guild building" are his, the second is Glassmere\'s Guild hall', () => {
    const r = S(49).last.outcome.resolutions;
    assert.deepEqual(r.map((x) => [x.type, x.status]), [['go', 'authorized'], ['go', 'authorized']], 'the run dropped the first as npc_actor');
    assert.match(S(49).last.outcome.actions[1], /GOES — to Adventurers' Guild hall, Glassmere/);
    assert.match(at[49].catalog, /loc\.glassmere\.guild_hall/, 'out at the weirs the catalog now names the hall');
});

test('a fact about the Walk\'s tollhouse is about the tollhouse, not the clerk whose role ends "at the Walk"', () => {
    const facts = Object.values(S(50).facts || {}).flat().filter((f) => f?.p === 'housed_in');
    assert.ok(facts.length);
    assert.ok(facts.every((f) => !/^npc\./.test(String(f.o))), JSON.stringify(facts.map((f) => f.o)));
});

test('the messages that asked for a target or ignored the hiding: a report is no attack, "it" is the strider, waiting hidden is stealth', () => {
    const s = S(34);
    assert.equal(parseIntent('found 3 killed 2 *i say calmly* is that enough for you to sign my proof? or do i have to hunt more?', s, content).kind, 'narrative');
    assert.equal(routeTurn(S(38), content, '*I Nod and go back down but i keep myself hidden as i lay in wait for more to come*'), 'v3');
    assert.equal(parseIntent('*I Nod and go back down but i keep myself hidden as i lay in wait for more to come*', S(38), content).kind, 'stealth');
    const i = parseIntent('*i Dash forward sword ready and Heavy Slash at it*', S(40), content);
    assert.deepEqual([i.kind, i.target], ['attack', 'mon.npcbog_strider_mound']);
    // a declared attack in the same convention is still an attack
    assert.equal(parseIntent('Die! *i say and Heavy Slash at it*', S(40), content).kind, 'attack');
    assert.notEqual(S(40).entities['mon.npcbog_strider_mound'].status, 'dead');
});

test('review of 4.1.2: at the real Guild hall, four pairs of joints for three kills are not paid either; a way the story gives is, once', () => {
    // the run's end state, at the Glassmere hall, the joints in the unit the listed proof names (the run's extractor
    // wrote "pairs of leg joints", which "pairs" did not match: 4.1.2 refused this turn-in only by that chance)
    const s = structuredClone(g.state());
    Object.assign(s.scene, { at: 'loc.glassmere.guild_hall', location: 'loc.glassmere', present: ['pc'] });
    for (const o of Object.values(s.objects)) if (o.holder?.entity === 'pc' && /joints/.test(o.name)) o.unit = 'pairs';
    assert.equal(checkProof(s, s.quests[QUEST]).ok, true, 'the listed proof is in hand');
    const turnIn = (state) => {
        const x = structuredClone(state);
        const ctx = resolveCommands(x, content, [{ seq: 1, type: 'quest.turn_in', quest: QUEST, quote: 'i pull them out and turn the Quest in' }], (e) => applyEvent(x, e));
        return { x, r: ctx.resolutions[0] };
    };
    const refused = turnIn(s);
    assert.equal(refused.r.status, 'refused', '4.1.2 paid it by the proof');
    assert.match(refused.r.reason, /engine counts 3 of 4 bog striders defeated/);
    assert.deepEqual([refused.x.entities.pc.sheet.coin_cp, refused.x.quests[QUEST].status], [30, 'active']);
    // the story establishes the rest otherwise
    applyEvent(s, { t: 'quest.ready', d: { id: QUEST, note: 'the colony at the weirs is broken', alternative: 'the last adult fled downriver and the nests are empty' } });
    const paid = turnIn(s);
    assert.equal(paid.r.status, 'resolved');
    assert.deepEqual([paid.x.entities.pc.sheet.coin_cp, paid.x.quests[QUEST].status], [30 + s.quests[QUEST].payout_cp, 'completed']);
    assert.equal(turnIn(paid.x).r.reason, 'already_completed');
});
