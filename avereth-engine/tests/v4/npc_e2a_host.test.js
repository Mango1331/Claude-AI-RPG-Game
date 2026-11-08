// NPC E2-A on the host path (planner turn → narrator reply → extractor answer through the parser): met and
// handled_by reach World through the real extraction call; swipe, regenerate, edit and reload keep one entry and one
// knowledge row; an old player record without known_at/desk meets no one; a met person is a watcher, no threat.
// The extractor answers are scripted (they test the host path, never how a free model fills the fields).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, outcomeOf, lastUser, GO } from './patch8_lib.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { heldThreats } from '../../src/v4/pulse.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const HALL = 'loc.alderwatch.guild_hall';
const ev = (r, t) => (r?.events || []).filter((e) => e.t === t);
const clerk = { seq: 2, type: 'person.new', ref: 'hall_clerk', name: null, role: 'clerk', desc: ['grey-haired woman with spectacles at the long counter'], armed: null, present: true, relevant: true, threat: false, at: HALL, band: 'SHORT', distinct_from: null };
const arriveAt = (at) => ({ seq: 1, type: 'arrive', at, forced_by: null, with: null });

/** He met a clerk at the Guild hall, went back out to where he started and goes to the hall again. */
async function backToTheHall() {
    const g = await campaign(content);
    const start = g.state().scene.at;
    await say(g, '*I walk to the Guild hall*', GO(HALL, 'I walk to the Guild hall'));
    await g.reply('He walked into the Guild hall. A grey-haired woman with spectacles worked the long counter.', { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: null } }, deltas: [arriveAt(HALL), clerk] });
    const id = Object.values(g.state().entities).find((e) => e.kind === 'npc' && /grey-haired woman/.test(e.traits || ''))?.id;
    assert.ok(id, 'the clerk is a person of the hall');
    await say(g, '*I walk back out to the verge*', GO(start, 'I walk back out to the verge'));
    await g.reply('He walked back out to the verge.', { scene: start, expected: { 1: { arrived: true, at: start, with: null, met: null } }, deltas: [arriveAt(start)] });
    assert.ok(!g.state().scene.present.includes(id));
    await say(g, '*I go back to the Guild hall*', GO(HALL, 'I go back to the Guild hall'));
    return { g, id, start };
}
const PROSE = 'He went back to the Guild hall. The clerk stood behind the counter and waved.';
const metAnswer = (id) => ({ scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: [{ who: id, evidence: 'The clerk stood behind the counter and waved' }] } }, deltas: [arriveAt(HALL)] });

test('E2-A host: the GO offers the clerk (known_at), the reply meets her through the real extraction path', async () => {
    const { g, id } = await backToTheHall();
    assert.deepEqual(outcomeOf(g).known_at, { 1: [id] });
    assert.equal(outcomeOf(g).expected_keys['1'], 'go');
    const r = await g.reply(PROSE, metAnswer(id));
    assert.equal(r.extract.changed !== false, true);
    assert.equal(ev(r.record, 'scene.entered').filter((e) => e.d.id === id).length, 1);
    assert.ok(g.state().scene.present.includes(id));
    // a met person is a watcher of the scene, never a threat of PULSE
    assert.ok(!heldThreats(g.state()).includes(id));
    assert.deepEqual(validateState(g.state(), content), []);
});

test('E2-A host: swipe, regenerate, edit and reload keep one entry; the fold is identical', async () => {
    const { g, id } = await backToTheHall();
    const first = JSON.stringify(outcomeOf(g).known_at);
    for (const type of ['swipe', 'regenerate']) {
        await prepareGenerationAsync(g.chat, g.content, { type, settings: { planner: true }, llm: g.llm });
        assert.equal(JSON.stringify(outcomeOf(g).known_at), first, type);
    }
    // an edit of the player message: the step offers the same people
    g.chat.at(-1).mes = '*I head back to the Guild hall*';
    g.plans = [JSON.stringify({ commands: [{ seq: 1, ...GO(HALL, 'I head back to the Guild hall') }] })];
    await prepareGenerationAsync(g.chat, g.content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    assert.equal(JSON.stringify(outcomeOf(g).known_at), first);
    await g.reply(PROSE, metAnswer(id));
    // a second reply to the same message (the reply regenerated): one entry in the chat
    g.chat.pop();
    await prepareGenerationAsync(g.chat, g.content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    await g.reply(PROSE, metAnswer(id));
    const last = g.chat.length - 1;
    assert.equal(ev(rec(g.chat[last]), 'scene.entered').filter((e) => e.d.id === id).length, 1);
    const folded = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(folded, g.state());
    assert.ok(folded.scene.present.includes(id));
});

test('E2-A host: an old player record without known_at meets no one; an answer without met is processed as before', async () => {
    const { g, id } = await backToTheHall();
    const o = outcomeOf(g);
    delete o.known_at;
    const r = await g.reply(PROSE, metAnswer(id));
    assert.equal(ev(r.record, 'scene.entered').filter((e) => e.d.id === id).length, 0);
    assert.ok(ev(r.record, 'delta.rejected').some((e) => e.d.rule === 'met_not_known_here'));
    const { g: h, id: hid } = await backToTheHall();
    const plain = await h.reply(PROSE, { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null } }, deltas: [arriveAt(HALL)] });
    assert.ok(!ev(plain.record, 'delta.rejected').some((e) => /^met_/.test(e.d.rule)));
    assert.ok(!h.state().scene.present.includes(hid), 'without met and without enter she stays out, as in .168');
    assert.equal(h.state().scene.at, HALL);
    assert.equal(lastUser(h).events.filter((e) => e.t === 'outcome.recorded').length, 1);
});
