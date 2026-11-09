// NPC E3 (patch_plans_10b/NPC_E2_E3_FACHPLAN.md §2 R10, §4 E3, §7, §12 C1–C6; decisions D2/D3/D13 of §13): a person's
// voice, manner and interest are lasting anchors only from what they show of themselves in a later encounter – after a
// shared moment with Alaric from before their current presence began (scene.since, derived in the fold) –, never a
// mood, never Alaric's view of them; one clear observation suffices; an anchor changes at most once per later presence.
// Original chats: User02 (Tam's first encounter, tests/v4/fixtures/user02_157.jsonl.gz) and User01 (Brenna back at the
// Guild hall, user01_e2b172.json.gz). Every extractor answer here is SYNTHETIC; the path is the real one
// (answer → replyTurnV4 → World → delta.js → fact.asserted → fold → card).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';
import { buildContext } from '../../src/context.js';
import { applyEvent } from '../../src/state.js';
import { truth } from '../../src/knowledge.js';
import { sideOf } from '../../src/v4/scene_handles.js';
import { campaign, say, GO } from './patch8_lib.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';

const content = await loadProductContent();
const u1 = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user01_e2b172.json.gz', import.meta.url)))).chat;
const u2 = zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user02_157.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(JSON.parse).slice(1);
const at = (chat, i) => foldChat(structuredClone(chat), i).state;
const TAM = 'npc.npcguild_clerk', BRENNA = 'npc.npcglassmere_clerk';
const reply = (state, deltas, prose, msg) => replyTurnV4(structuredClone(state), content, { scene: null, expected: {}, deltas }, { prose, msg });
const fact = (s, p, o, seq = 1) => ({ scene: null, seq, type: 'fact', s, p, o });
const asserted = (r) => r.events.filter((e) => e.t === 'fact.asserted').map((e) => e.d.fact);
const rules = (r) => r.events.filter((e) => e.t === 'delta.rejected' && e.d.item?.type === 'fact').map((e) => e.d.rule);
const header = (s, id, input) => buildContext(s, content, { input, outcome: s.last.outcome, budget: 1400 }).text.split('\n').find((l) => l.startsWith('• ') && l.includes(`[${id}]`));
/** The next player turn (nothing to book), as the host plays it: the turn advances. */
const next = (s, msg) => playerTurnV4(structuredClone(s), content, '*I wait a moment*', { msg, c: true, commands: [] }).state;
const tamFirst = () => at(u2, 8); // Tam at the desk since turn 3; the first sighting (turn 3) is all they share
const brennaBack = () => at(u1, 66); // Brenna back at the desk since turn 27; shared moments of turns 3 and 23
const MANNER = "dry, unhurried, keeps strangers at a ledger's length";

// --------------------------------------------------------------------------------------------------------------- C1
test('E3 C1: a person named at the first contact gets no anchor in that same presence; an unnamed new person neither', () => {
    const s = tamFirst();
    assert.equal(s.scene.since[TAM], 3);
    const r = reply(s, [fact(TAM, 'manner', 'dry and teasing with newcomers')], u2[8].mes, 8);
    assert.deepEqual([asserted(r).length, rules(r)], [0, ['anchor_first_contact']]);
    assert.ok(!/manner:/.test(header(r.state, TAM, 'Tam')), 'the card has no anchor');
    const n = reply(s, [{ scene: null, seq: 1, type: 'person.new', ref: 'porter', name: null, role: 'porter', desc: ['broad porter with a rope over his shoulder'], armed: null, present: true, relevant: true, threat: false, at: s.scene.at, band: 'SHORT', distinct_from: null },
        fact('porter', 'voice', 'slow, gravelly, every word weighed')], 'A broad porter with a rope over his shoulder spoke slowly, every word weighed.', 8);
    assert.deepEqual(rules(n), ['anchor_first_contact']);
    assert.ok(!asserted(n).some((f) => f.p === 'voice'));
});

// --------------------------------------------------------------------------------------------------------------- C2
test('E3 C2: Brenna back at the desk (an earlier meeting, a new presence) – her manner is an anchor on the card head, the look shortened, ≤ 170', () => {
    const s = brennaBack();
    const r = reply(s, [fact(BRENNA, 'manner', MANNER)], u1[66].mes, 66);
    const [f] = asserted(r);
    assert.deepEqual([f.s, f.p, f.o, rules(r).length], [BRENNA, 'manner', MANNER, 0]);
    const ctx = buildContext(r.state, content, { input: u1[69].mes, outcome: r.state.last.outcome, budget: 1400 });
    const head = ctx.text.split('\n').find((l) => l.startsWith('• ') && l.includes(`[${BRENNA}]`));
    assert.match(head, new RegExp(`— person, [^;]+; manner: ${MANNER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}; `), 'manner before the look');
    assert.ok(head.length <= 170, `${head.length}`);
    // counter cases: not here, about Alaric, too long
    const away = reply(at(u1, 61), [fact(BRENNA, 'manner', MANNER)], u1[62].mes, 62);
    assert.deepEqual(rules(away), ['anchor_absent']);
    assert.deepEqual(rules(reply(s, [fact(BRENNA, 'manner', 'warm toward Alaric, cool with everyone else')], u1[66].mes, 66)), ['anchor_value']);
    assert.deepEqual(rules(reply(s, [fact(BRENNA, 'manner', 'dry and unhurried, keeps strangers at a ledger\'s length and every promise in a careful column')], u1[66].mes, 66)), ['anchor_value']);
});

// --------------------------------------------------------------------------------------------------------------- C3
test('E3 C3: a mood is no anchor ("furious tonight", "angry"); a habit is ("always short with drunks")', () => {
    const s = brennaBack();
    for (const o of ['furious tonight', 'angry', 'very tired right now']) assert.deepEqual(rules(reply(s, [fact(BRENNA, 'manner', o)], u1[66].mes, 66)), ['anchor_mood'], o);
    const habit = reply(s, [fact(BRENNA, 'manner', 'always short with drunks')], u1[66].mes, 66);
    assert.deepEqual(asserted(habit).map((f) => f.o), ['always short with drunks']);
});

// --------------------------------------------------------------------------------------------------------------- C4
test('E3 C4: one value per trait and reply; a second value in the same presence is refused; a later presence changes it once (the old fact ends)', () => {
    let s = brennaBack();
    const two = reply(s, [fact(BRENNA, 'manner', MANNER), fact(BRENNA, 'manner', 'brisk and impatient with idlers', 2)], u1[66].mes, 66);
    assert.deepEqual([asserted(two).length, rules(two)], [1, ['anchor_scope']]);
    s = two.state;
    // a later turn of the same presence: still the same encounter
    s = next(s, 67);
    const same = reply(s, [fact(BRENNA, 'temperament', 'brisk and impatient with idlers')], u1[68].mes, 68);
    assert.deepEqual(rules(same), ['anchor_scope'], 'temperament is manner; the same presence');
    // she leaves; a later turn she is back: a new presence span
    s = reply(next(same.state, 69), [{ scene: null, seq: 1, type: 'leave', who: BRENNA }], 'Brenna went into the back office.', 70).state;
    assert.ok(!s.scene.present.includes(BRENNA) && s.scene.since[BRENNA] === undefined);
    s = reply(next(s, 71), [{ scene: null, seq: 1, type: 'enter', who: BRENNA, evidence: 'Brenna came back to the counter' }], 'Brenna came back to the counter.', 72).state;
    assert.equal(s.scene.since[BRENNA], s.turn);
    const old = truth(s, BRENNA, 'manner')[0];
    const later = reply(s, [fact(BRENNA, 'temperament', 'brisk and impatient with idlers')], 'Brenna came back to the counter and waved two idlers off, brisk as ever.', 72);
    const [f] = asserted(later);
    assert.deepEqual([f.p, f.o], ['manner', 'brisk and impatient with idlers'], 'normalised to manner');
    assert.ok(later.events.some((e) => e.t === 'fact.ended' && e.d.id === old.id), 'the old anchor ends (until)');
    assert.match(header(later.state, BRENNA, 'Brenna'), /manner: brisk and impatient with idlers/);
    const again = reply(later.state, [fact(BRENNA, 'manner', 'patient with newcomers')], 'Brenna explained the board again.', 72);
    assert.deepEqual(rules(again), ['anchor_scope'], 'at most once per later presence');
    // the same value again changes nothing and is no refusal
    assert.deepEqual([asserted(reply(later.state, [fact(BRENNA, 'manner', 'brisk and impatient with idlers')], 'Brenna waved.', 72)).length, rules(reply(later.state, [fact(BRENNA, 'manner', 'brisk and impatient with idlers')], 'Brenna waved.', 72)).length], [0, 0]);
});

// --------------------------------------------------------------------------------------------------------------- C5
test('E3 C5: scene.since is derived from the events alone – a saved chat folds it the same way again, after a JSON round trip and step by step', () => {
    const chat = structuredClone(u1).slice(0, 70);
    const a = foldChat(structuredClone(chat)).state, b = foldChat(JSON.parse(JSON.stringify(chat))).state;
    assert.deepEqual(a.scene.since, b.scene.since);
    assert.deepEqual(a.scene.since, { [BRENNA]: 27, 'npc.npchearth_fighter': 27 });
    // the anchor reply's events applied one by one give the state the reply returned
    const s = brennaBack();
    const r = reply(s, [fact(BRENNA, 'manner', MANNER)], u1[66].mes, 66);
    const f = structuredClone(s);
    for (const e of r.events) applyEvent(f, e);
    assert.deepEqual(f, r.state);
});

test('E3 C5 host: a companion begins a new presence where they arrive; the anchor goes through the parser and survives swipe, regenerate and reload', async () => {
    const HALL = 'loc.alderwatch.guild_hall';
    const g = await campaign(content);
    const start = g.state().scene.at;
    const clerk = { seq: 2, type: 'person.new', ref: 'hall_clerk', name: null, role: 'clerk', desc: ['grey-haired woman with spectacles at the long counter'], armed: null, present: true, relevant: true, threat: false, at: HALL, band: 'SHORT', distinct_from: null };
    await say(g, '*I walk to the Guild hall*', GO(HALL, 'I walk to the Guild hall'));
    const first = await g.reply('He walked into the Guild hall. A grey-haired woman with spectacles worked the long counter, humming an old marching tune.',
        { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: null } }, deltas: [{ seq: 1, type: 'arrive', at: HALL, forced_by: null, with: null }, clerk, { seq: 3, type: 'fact', s: 'hall_clerk', p: 'interest', o: 'old marching tunes' }] });
    const id = Object.values(g.state().entities).find((e) => /grey-haired woman/.test(e.traits || '')).id;
    assert.ok(first.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'anchor_first_contact'), 'first contact');
    const met = g.state().scene.since[id];
    // she walks out with him: at the verge her presence begins anew
    await say(g, '*I ask the clerk to walk with me to the verge*', GO(start, 'I ask the clerk to walk with me to the verge'));
    await g.reply('He walked back out to the verge, the clerk at his side.', { scene: start, expected: { 1: { arrived: true, at: start, with: [id], met: null } }, deltas: [{ seq: 1, type: 'arrive', at: start, forced_by: null, with: [id] }] });
    assert.ok(g.state().scene.present.includes(id), 'she came with him');
    assert.ok(g.state().scene.since[id] > met, 'a companion begins a new presence at the destination');
    await say(g, '*I listen to the clerk*');
    const answer = { scene: start, expected: {}, deltas: [{ seq: 1, type: 'fact', s: id, p: 'interest', o: 'old marching tunes' }] };
    const PROSE = 'The clerk hummed an old marching tune again as they stood at the verge, tapping the rhythm on her ledger.';
    const r = await g.reply(PROSE, answer);
    assert.deepEqual(r.record.events.filter((e) => e.t === 'fact.asserted').map((e) => [e.d.fact.s, e.d.fact.p, e.d.fact.o]), [[id, 'interest', 'old marching tunes']]);
    const s1 = structuredClone(g.state());
    // regenerate the reply, swipe it: the same anchor, once
    for (const type of ['regenerate', 'swipe']) {
        g.chat.pop();
        await prepareGenerationAsync(g.chat, g.content, { type, settings: { planner: true }, llm: g.llm });
        const x = await g.reply(PROSE, answer);
        assert.equal(x.record.events.filter((e) => e.t === 'fact.asserted').length, 1, type);
    }
    assert.deepEqual(g.state(), s1);
    // save and reload
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state, s1);
    // the next turn's card shows it
    const nextTurn = await say(g, '*I ask her about the tune*');
    assert.ok(nextTurn.context.text.split('\n').some((l) => l.startsWith('• ') && l.includes(`[${id}]`) && l.includes('interest: old marching tunes')));
    assert.equal(rec(g.chat.findLast((m) => m.is_user)).events.filter((e) => e.t === 'outcome.recorded').length, 1);
});

// --------------------------------------------------------------------------------------------------------------- C6
test('E3 C6: anchors write no attitude or relation; sideOf is unchanged', () => {
    const s = brennaBack();
    const r = reply(s, [fact(BRENNA, 'manner', MANNER), fact(BRENNA, 'interest', 'well-kept ledgers and honest tallies', 2)], u1[66].mes, 66);
    assert.equal(asserted(r).length, 2);
    assert.ok(!r.events.some((e) => /^relation|attitude/.test(e.t)));
    assert.deepEqual(r.state.relations, s.relations);
    assert.equal(sideOf(r.state, BRENNA), sideOf(s, BRENNA));
});
