// NPC E2-B on the host path (planner turn → narrator context → reply → extractor answer through the parser): an
// agreement bound to its parties through the real extraction call, the arrival card on the GO back (NOT YET SHOWN, its
// agreement on the attitude row, KNOWN AT trimmed for the narrator only), swipe/regenerate/edit with the same context,
// the settlement without who keeping the parties, save/reload and a regenerated reply folding to the same state.
// The extractor answers are scripted (they test the host path, never how a free model fills the fields).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, outcomeOf, GO } from './patch8_lib.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { runCommands } from '../../src/commands.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const HALL = 'loc.alderwatch.guild_hall';
const ev = (r, t) => (r?.events || []).filter((e) => e.t === t);
const clerk = { seq: 2, type: 'person.new', ref: 'hall_clerk', name: null, role: 'clerk', desc: ['grey-haired woman with spectacles at the long counter'], armed: null, present: true, relevant: true, threat: false, at: HALL, band: 'SHORT', distinct_from: null };
const arriveAt = (at) => ({ seq: 1, type: 'arrive', at, forced_by: null, with: null });
const KEEP = 'The clerk promised to keep a copy of the Alderwatch road map for Alaric until dusk';
const promise = (who) => ({ seq: 3, type: 'thread', id: null, text: KEEP, kind: 'promise', status: 'open', resolution: null, who });
const threads = (s) => Object.values(s.threads).filter((t) => t.text === KEEP);
const PROSE = 'He went back to the Guild hall. The clerk stood behind the counter and waved, a folded map in her hand.';

/** He meets the clerk, she promises him the map, he goes back out and then to the hall again. */
async function promisedThenBack() {
    const g = await campaign(content);
    const extracts = [];
    const ask = g.llm;
    g.llm = async (req) => { if (String(req.purpose).startsWith('extract')) extracts.push(JSON.stringify(req.messages)); return ask(req); };
    const start = g.state().scene.at;
    await say(g, '*I walk to the Guild hall*', GO(HALL, 'I walk to the Guild hall'));
    await g.reply('He walked into the Guild hall. A grey-haired woman with spectacles at the long counter promised to keep a copy of the road map for him until dusk.',
        { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: null } }, deltas: [arriveAt(HALL), clerk, promise(['pc', 'hall_clerk'])] });
    const id = Object.values(g.state().entities).find((e) => e.kind === 'npc' && /grey-haired woman/.test(e.traits || ''))?.id;
    assert.ok(id);
    await say(g, '*I walk back out to the verge*', GO(start, 'I walk back out to the verge'));
    await g.reply('He walked back out to the verge.', { scene: start, expected: { 1: { arrived: true, at: start, with: null, met: null } }, deltas: [arriveAt(start)] });
    const r = await say(g, '*I go back to the Guild hall*', GO(HALL, 'I go back to the Guild hall'));
    return { g, id, r, extracts };
}

test('E2-B host: the agreement is bound to {pc, clerk} through the parser; the GO back cards her NOT YET SHOWN with it, KNOWN AT trimmed for the narrator only', async () => {
    const { g, id, r, extracts } = await promisedThenBack();
    const [t] = threads(g.state());
    assert.deepEqual(t.who, ['pc', id]);
    assert.deepEqual(outcomeOf(g).known_at, { 1: [id] });
    const text = r.context.text;
    assert.match(text, /ARRIVING AT [^\n]* — people known there; NOT YET SHOWN: present only if the story shows them there/);
    const lines = text.split('\n');
    const head = lines.findIndex((l) => l.startsWith('• ') && l.includes(`[${id}]`) && l.endsWith('; NOT YET SHOWN'));
    assert.ok(head >= 0, 'her card is marked NOT YET SHOWN');
    assert.match(lines[head + 1], /^ {2}toward Alaric: .*; between you: The clerk promised to keep a copy of the Alderwatch road map/, 'the agreement rides on the attitude row (shortened first)');
    assert.deepEqual(r.context.diagnostics.arrivalNpcIds, [id]);
    const known = lines.find((l) => l.startsWith('KNOWN AT '));
    assert.ok(known && !known.includes(id) && /the people carded under ARRIVING AT$/.test(known), 'the narrator reads her once, on her card');
    assert.ok(!g.state().scene.present.includes(id), 'the card makes nobody present');
    // the extractor of the reply reads the whole KNOWN AT line from the outcome
    await g.reply(PROSE, { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: null } }, deltas: [arriveAt(HALL)] });
    assert.ok(extracts.at(-1).includes(`(${id})`) && extracts.at(-1).includes('KNOWN AT'));
    assert.ok(!g.state().scene.present.includes(id), 'a reply without met and without enter leaves her out');
    assert.deepEqual(validateState(g.state(), content), []);
});

test('E2-B host: swipe, regenerate and an edit build the same arrival card; settlement without who keeps the parties; save/reload and a regenerated reply fold the same', async () => {
    const { g, id, r } = await promisedThenBack();
    const first = r.context.text;
    for (const type of ['swipe', 'regenerate']) {
        const again = await prepareGenerationAsync(g.chat, g.content, { type, settings: { planner: true }, llm: g.llm });
        assert.equal(again.context.text, first, type);
    }
    g.chat.at(-1).mes = '*I head back to the Guild hall*';
    g.plans = [JSON.stringify({ commands: [{ seq: 1, ...GO(HALL, 'I head back to the Guild hall') }] })];
    const edited = await prepareGenerationAsync(g.chat, g.content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    assert.equal(edited.context.text.split('\n').filter((l) => /NOT YET SHOWN|between you/.test(l)).join('\n'), first.split('\n').filter((l) => /NOT YET SHOWN|between you/.test(l)).join('\n'));
    // the reply meets her and settles the agreement by its id, without who
    const t = threads(g.state())[0];
    const settle = { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: [{ who: id, evidence: 'The clerk stood behind the counter and waved' }] } },
        deltas: [arriveAt(HALL), { seq: 2, type: 'thread', id: t.id, text: KEEP, kind: 'promise', status: 'resolved', resolution: 'she handed him the folded map', who: null }] };
    const done = await g.reply(PROSE, settle);
    const set = ev(done.record, 'thread.set').map((e) => e.d.thread);
    assert.deepEqual(set.map((x) => [x.id, x.status, x.who]), [[t.id, 'resolved', ['pc', id]]]);
    assert.ok(!runCommands(g.state(), content, '#npc clerk').panels.join('\n').includes('Open between you'), '#npc shows no settled agreement as open');
    // a regenerated reply to the same message: one settlement, one entry
    g.chat.pop();
    await prepareGenerationAsync(g.chat, g.content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    const again = await g.reply(PROSE, settle);
    assert.equal(ev(again.record, 'thread.set').length, 1);
    assert.equal(ev(again.record, 'scene.entered').filter((e) => e.d.id === id).length, 1);
    // save (JSON) and reload: the same state, the agreement settled with its parties
    const saved = JSON.parse(JSON.stringify(g.chat));
    const reloaded = foldChat(saved).state;
    assert.deepEqual(reloaded, g.state());
    assert.deepEqual([reloaded.threads[t.id].status, reloaded.threads[t.id].who], ['resolved', ['pc', id]]);
    // the next turn: her card says settled (no newer meaningful memory with her), never open
    const next = await say(g, '*I thank the clerk for the map*');
    const card = next.context.text.split('\n').filter((l) => l.includes('between you'));
    assert.ok(card.length && card.every((l) => /between you: settled — /.test(l) && !/open between you/.test(l)), card.join('\n'));
    assert.equal(lastUserCount(g), 1);
});

const lastUserCount = (g) => rec(g.chat.findLast((m) => m.is_user)).events.filter((e) => e.t === 'outcome.recorded').length;
