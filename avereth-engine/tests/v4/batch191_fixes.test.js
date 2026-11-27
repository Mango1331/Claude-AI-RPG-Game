// Corrections after the natural NPC batch on .191 (main: testrun_10b/npc-20261115-103140Z/GEGENREVIEW_OPUS.md and
// GEGENBEWERTUNG_GPT_ZU_OPUS.md), each on its original record of the batch (tests/replay/corpus191) and with the
// positive and negative cases around it:
//   P1 Warrior T70: the Dungeon card offers no foe the engine then refuses; a thread keeps no creature just refused
//   P2 Rogue T7–T20: a Guild hunt site named as a place of the Guild's town lies in that town, not out in the realm
//   P3 Rogue T13: a known person met at the place a GO step with words for its target actually reached
//   P4 Warrior T47: the narrator's TRAVEL line names an invitation or a guide as no cause that moves him
import test from 'node:test';
import assert from 'node:assert/strict';
import { reply191, player191, run191, before191, rejectedOf, eventsOf, E } from './batch191_lib.js';
import * as evidence from '../../src/v4/run9_evidence.js';
import { slotForNew, contextLines } from '../../src/v4/living.js';

// (a namespace import: the red run on the unchanged .191 code fails per test, not at loading)
const refusedCreatureInThread = (...a) => { assert.equal(typeof evidence.refusedCreatureInThread, 'function', 'refusedCreatureInThread'); return evidence.refusedCreatureInThread(...a); };
const card = (res) => (res.context.text.match(/LEVEL 1 \(the engine's[^\n]*/) || [''])[0];
const goblins = { species: 'goblin warrior', anchor: 'goblin', count: 2 };
const lookouts = [{ species: 'goblin lookout', anchor: 'goblin' }];
const withThread = (text, extra = {}) => (a) => ({ ...a, deltas: a.deltas.map((d) => (d.type === 'thread' ? { ...d, text, ...extra } : d)) });

// ------------------------------------------------------------------------------------------------ P1
test('P1 W T70 original: the refused spear-goblins stay out of the thread; its update is refused and its T69 text stands', async () => {
    const r = await reply191('w191', 140);
    assert.deepEqual(rejectedOf(r.record), [[1, 'creature.new', 'dungeon_foe'], [2, 'aware', 'creature_continuity'], [3, 'thread', 'creature_continuity']]);
    assert.equal(eventsOf(r.record, 'thread.set').length, 0);
    const t = r.state().threads['thread.t66.1'];
    assert.match(t.text, /knock of a spear-butt against stone/, 'the version of T69 (sounds) stays');
    assert.ok(!Object.values(r.state().threads).some((x) => /spear-goblins/.test(x.text)));
});

test('P1 W T70 positive: the same reply without the refused creatures keeps its thread update; sounds, traces and reports stay', async () => {
    for (const text of [
        'From deeper in the black of the tunnel something hooted again, long and satisfied',
        'Fresh tracks of two goblins lead on into the deeper tunnel',
        'The lookout had said two goblins guard the stair below',
    ]) {
        const r = await reply191('w191', 140, withThread(text));
        assert.ok(!rejectedOf(r.record).some(([, type]) => type === 'thread'), text);
        assert.equal(r.state().threads['thread.t66.1'].text, text);
    }
});

test('P1 the thread guard: newcomers named by species or by count and body plan; booked creatures, traces and rumours are no claim', () => {
    const yes = ['From deeper in the black of the tunnel something hooted again, long and satisfied, as the two spear-goblins advanced',
        'Two goblin warriors wait in the next hall', 'Two more goblins crouch beyond the fire'];
    const no = ['The hoot from the deep tunnel came again, closer, and a third goblin answered it', 'Fresh tracks of two goblins lead deeper',
        'Small bootprints of two goblin warriors go into the dark', 'The miners say two goblins guard the stair',
        'The two goblins of the lookout post are dead', 'The goblin lookout lay dying in the ash'];
    for (const t of yes) assert.equal(refusedCreatureInThread(t, [goblins], lookouts), true, t);
    for (const t of no) assert.equal(refusedCreatureInThread(t, [goblins], lookouts), false, t);
    assert.equal(refusedCreatureInThread('Two goblins wait by the fire', [goblins], []), true, 'nothing booked of that kind: the count names them');
    assert.equal(refusedCreatureInThread('Two goblin warriors advanced', [], lookouts), false, 'nothing refused: no guard');
});

test('P1 W T70 card: in the fight the Dungeon card offers no free slot of the level; entering a new part it offers only the engine\'s encounter', async () => {
    const fight = card((await player191('w191', 139)).res);
    assert.doesNotMatch(fight, /creative appearance|even before an earlier encounter/);
    assert.match(fight, /no newcomer joins the fight/);
    assert.match(fight, /the level's other encounters wait in their own parts of it/);
    const going = card((await player191('w191', 125)).res);
    assert.match(going, /The engine's encounter of this reply \(its DUNGEON AHEAD line\) may take a creative appearance/);
    assert.doesNotMatch(going, /even before an earlier encounter/);
    // a PULSE wanderer reserved this turn: the card names its PULSE line, never a DUNGEON AHEAD it does not have
    const s = before191('w191', 126);
    s.dungeons['loc.mossback_warrens'].ahead = { ...s.dungeons['loc.mossback_warrens'].ahead, wander: true };
    const wander = contextLines(s, E.content).find((l) => l.startsWith('LEVEL 1'));
    assert.match(wander, /\(its PULSE line\) may take a creative appearance/);
    assert.doesNotMatch(wander, /DUNGEON AHEAD/);
});

test('P1 B5: a creative appearance fills only the encounter of the section he is in, never one that waits in a later part', () => {
    const s = before191('w191', 140);
    const d = { ref: 'mon.creative', species: 'goblin spearman', anchor: 'goblin', count: 2, present: true, more: false, threat: null };
    assert.equal(slotForNew(s, E.content, d, 'loc.mossback_warrens.l1_s1'), null, 'the warband waits in part 2');
    const t = structuredClone(s);
    t.places['loc.mossback_warrens.l1_s2'] = { ...t.places['loc.mossback_warrens.l1_s1'], id: 'loc.mossback_warrens.l1_s2', section: 2 };
    assert.equal(slotForNew(t, E.content, d, 'loc.mossback_warrens.l1_s2')?.slot?.id, 'warband', 'in its own part it may appear');
});

// ------------------------------------------------------------------------------------------------ P2
const OLD_CULVERT = 'realm.duskreach.millrace_row_culvert_ashbridge';
const CULVERT = 'loc.ashbridge.millrace_row_culvert';
// These address tests exercise the accepted historical serpent contract. .208 can publish
// the initial four before this archived second answer is needed; select it explicitly here.
const serpentBoard = run191('r191').answers[13].filter(a => a.purpose === 'board').at(-1).content;
const siteAs = (where) => (a, purpose) => {
    if (!/board/.test(purpose) || !Array.isArray(a.listings)) return a;
    a = JSON.parse(serpentBoard);
    const l = a.listings[0];
    const o = l.objectives.find((x) => x.verb === 'DEFEAT');
    const old = o.where;
    o.where = where;
    l.task = String(l.task).split(old).join(where);
    l.desired_end_state = String(l.desired_end_state).split(old).join(where);
    return a;
};
const created = (record, name) => eventsOf(record, 'place.created').map((e) => e.d.place).find((p) => p.name === name);

test('P2 R T7 original board: "Millrace Row culvert, Ashbridge" is a place of Ashbridge with its population and hunt; the other hunt sites stay in the realm', async () => {
    const p = await player191('r191', 13, (a,purpose)=>purpose==='board'?JSON.parse(serpentBoard):a);
    const culvert = created(p.record, 'Millrace Row culvert, Ashbridge');
    assert.equal(culvert.id, CULVERT);
    assert.equal(culvert.parent, 'loc.ashbridge');
    assert.deepEqual(culvert.population, { anchor: 'serpent', species: 'ditch serpent', levels: [1, 1] });
    const quest = eventsOf(p.record, 'quest.created').map((e) => e.d.quest).find((q) => q.id === 'quest.slay_the_ditch_serpent');
    assert.deepEqual(quest.hunt, { at: CULVERT, age: 'adult' });
    for (const name of ['reed-bank paths of the Reed Flats', 'Windmill Gully', 'Thornwood Edge charcoal camps']) assert.equal(created(p.record, name).parent, 'realm.duskreach', name);
    // W T6 original board: sites "south of Ashbridge" are out in the realm
    const w = await player191('w191', 11);
    for (const name of ['the old quarry track east of Ashbridge', 'the millpond hamlet fields south of Ashbridge']) assert.equal(created(w.record, name).parent, 'realm.duskreach', name);
});

test('P2 negative: a direction, a road or another town keeps a hunt site in the realm; only the address form of the Guild\'s town is in town', async () => {
    for (const [where, parent] of [['the old quarry track east of Ashbridge', 'realm.duskreach'], ['the north road culvert, Ashbridge', 'realm.duskreach'],
        ['Tanner cellar, Glassmere', 'realm.duskreach'], ['the Millrace Row culvert, the Ashbridge', 'loc.ashbridge']]) {
        const p = await player191('r191', 13, siteAs(where));
        assert.equal(created(p.record, where)?.parent, parent, where);
    }
});

test('P2 an existing save keeps its hunt site where it was: a site of that name already in the realm is reused, nothing is moved or duplicated', async () => {
    const r = await reply191('r191', 14); // the original records: the culvert under the realm from T7 on
    const s = r.state();
    assert.equal(s.places[OLD_CULVERT]?.parent, 'realm.duskreach');
    assert.equal(s.places[CULVERT], undefined);
    assert.equal(s.quests['quest.slay_the_ditch_serpent'].hunt.at, OLD_CULVERT);
});

test('P2 R T7–T22 chained on the corrected board: the walks in Ashbridge are local (no realm journey, no 45/50 minutes, no road halt), the hunt is credited and paid', async () => {
    const { chain191 } = await import('./batch191_lib.js');
    const chat = await chain191('r191', 13, 43, (t) => (t===run191('r191').answers[13].find(a=>a.purpose==='board').content?serpentBoard:t).split(OLD_CULVERT).join(CULVERT));
    const out = (i) => chat[i].extra.avereth;
    const gos = (i) => (out(i).events.find((e) => e.t === 'outcome.recorded')?.d.outcome.auth?.gos || []).map((g) => g.mode);
    for (const i of [17, 27, 35, 39]) assert.deepEqual(gos(i), ['local'], `#${i}`);
    const travel = (i) => out(i).events.filter((e) => e.t === 'time.advanced' && e.d.why === 'travel').reduce((n, e) => n + e.d.minutes, 0);
    assert.equal(travel(28), 15, 'T14 house → culvert: no 45-minute journey');
    assert.ok(travel(40) <= 15, `T20 lane → hall: ${travel(40)} min, not 50`);
    assert.ok(!out(36).events.some((e) => e.t === 'scene.moved' && /On the way to/.test(e.d.place || '')), 'T18: no halt on the realm road');
    assert.equal(out(36).events.find((e) => e.t === 'pulse.rolled')?.d?.exposure ?? out(35).events.find((e) => e.t === 'pulse.rolled')?.d.exposure, 'scene');
    const s = E.host.foldChat(chat, chat.length).state;
    assert.equal(s.quests['quest.slay_the_ditch_serpent'].status, 'completed');
    assert.equal(s.places[CULVERT].parent, 'loc.ashbridge');
    assert.equal(s.places[OLD_CULVERT], undefined);
});

// ------------------------------------------------------------------------------------------------ P3
const metAs = (who, evidence) => (a) => ({ ...a, expected: { ...a.expected, 1: { ...a.expected[1], met: [{ who, evidence }] } } });
const SHOWN = 'The widow stood on her swept stoop and looked at the Guild plate longer than at his face.';

test('P3 R T13 original: the met of a GO with words for its target is judged at the house it reached, no longer refused as "no arrival"', async () => {
    const r = await reply191('r191', 26);
    assert.equal(r.state().scene.at, 'loc.ashbridge.widow_hesses_house');
    const met = (r.record.rejected || []).filter((x) => x.type === 'expected');
    assert.deepEqual(met, [], '.199 accepts the original local doorstep greeting');
    assert.ok(r.state().scene.present.includes('npc.widow_hesse'));
    assert.ok(!met.some((x) => x.rule === 'met_without_arrival'));
});

test('P3 positive: with a quote that shows her there, the widow the step names is met at her house (present, met event)', async () => {
    const { run191 } = await import('./batch191_lib.js');
    const chat = run191('r191').chat.map((m, i) => (i === 26 ? { ...structuredClone(m), mes: m.mes.replace(/The widow came down one step of her stoop to meet him, and looked at the Guild plate longer than at his face\./, SHOWN) } : m));
    assert.ok(chat[26].mes.includes(SHOWN));
    const r = await reply191('r191', 26, metAs('npc.widow_hesse', SHOWN), { chat });
    assert.ok(!(r.record.rejected || []).some((x) => x.type === 'expected'), JSON.stringify(r.record.rejected));
    assert.ok(r.state().scene.present.includes('npc.widow_hesse'));
});

test('P3 negative: legacy met follows a confirmed arrival and checks the reported identity against state', async () => {
    const other = await reply191('r191', 26, metAs('npc.npcoldest_washing_wife', 'The widow came down one step of her stoop to meet him'));
    assert.ok(!(other.record.rejected || []).some(r => r.rule === 'met_not_known_here'));
    assert.ok(other.state().scene.present.includes('npc.npcoldest_washing_wife'));
    // an arrive the report does not back (it says the house): no arrival, no met
    const told = 'The widow came down one step of her stoop to meet him';
    const stray = await reply191('r191', 26, (a) => ({ ...metAs('npc.widow_hesse', told)(a), deltas: a.deltas.map((d) => (d.type === 'arrive' ? { ...d, at: 'loc.glassmere' } : d)) }));
    assert.ok(stray.record.rejected.some((x) => x.type === 'expected' && x.rule === 'met_without_arrival'));
    // the arrival reported in another town: the step's words name her, but she was last in Ashbridge
    const far = await reply191('r191', 26, (a) => ({ ...metAs('npc.widow_hesse', told)(a), expected: { 1: { ...a.expected[1], at: 'loc.glassmere', met: [{ who: 'npc.widow_hesse', evidence: told }] } },
        deltas: a.deltas.map((d) => (d.type === 'arrive' ? { ...d, at: 'loc.glassmere' } : d)) }));
    assert.equal(far.state().scene.at, 'loc.glassmere');
    assert.ok(!(far.record.rejected || []).some(r => r.rule === 'met_not_known_here'));
    assert.ok(far.state().scene.present.includes('npc.widow_hesse'));
    // W T12 original: Hedwin came along (arrive.with); no met to refuse
    const along = await reply191('w191', 24);
    assert.ok(!along.record.rejected.some((x) => x.type === 'expected'), JSON.stringify(along.record.rejected));
    assert.ok(along.state().scene.present.includes('npc.npcmillpond_farmer'));
    // W T8 original: a GO to a known place keeps the player turn's offered people (a wrong id stays not known here)
    const known = await reply191('w191', 16);
    assert.deepEqual(known.record.rejected.filter((x) => x.type === 'expected').map((x) => x.rule), ['npc_presence']);
});

// ------------------------------------------------------------------------------------------------ P4
test('P4 W T47: no booked GO distinguishes chosen continuation from a proposal or refusal', async () => {
    const p = await player191('w191', 93); // "Stew would be welcome, Hedwin …": the planner books no go (7d)
    const line = (p.res.context.text.match(/TRAVEL THIS TURN —[^\n]*/) || [''])[0];
    assert.match(line, /no booked route from the pen gate by the pond/);
    assert.match(line, /this turn has no continuation assessment/);
    assert.match(line, /Keep his established place unless actually displaced by an external cause/);
    // a chosen step keeps its line as before
    const go = await player191('w191', 79); // T40: GO to the long house
    assert.match(go.res.context.text, /TRAVEL THIS TURN — GOES — to the long house by the mill/);
});

// ------------------------------------------------------------------------------------------------ P5 (decision: kept)
test('P5 W T12 original: a parent scene (the hamlet) after the arrival in the long house stays refused – the tag cannot tell the long house from elsewhere in the hamlet', async () => {
    const r = await reply191('w191', 24);
    assert.equal(r.state().scene.at, 'loc.the_long_house_by_the_mill');
    assert.deepEqual(r.record.rejected.filter((x) => x.rule === 'scene_context').map((x) => x.type), ['person.new', 'fact', 'fact', 'fact', 'thread']);
});
