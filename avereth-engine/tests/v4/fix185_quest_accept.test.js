// Build .185 – Mage T22/T27 (testrun_10b/npc-20261113-135417Z/REVIEW.md §5, natural batch 13.11.2026 on .183): "I'd
// like to accept the Mossback Warrens Level 1 contract — and what can you tell me about the mossbacks …?" – the agency
// guard dropped the acceptance as a question (the dash split knew no "and" before the question), the narrator told the
// contract stamped, logged and ACTIVE; in T27 he did so again when asked to confirm. The batch ZIP is not in the
// repository: the case is rebuilt with the review's wording on the User04 chat (Alderwatch Guild hall, #73, the
// listed "Clear Old Crown Catacombs Level 1"). Fix: a question joined by "and/but/also/so" after a dash no longer turns
// the deed before it into a question (unless that deed is only weighed); a dropped acceptance of a listed contract
// gives the narrator a NOT ACCEPTED line; the Guild block says a [listed] contract is never told as his or active.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat } from '../../src/host.js';
import { guardCommands } from '../../src/v4/agency.js';
import { buildContext } from '../../src/context.js';
import { Chat4 } from './harness.js';
import { say, linesOf, lastUser } from './patch8_lib.js';

const content = await loadProductContent();
const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user04_qol159.json.gz', import.meta.url))));
const Q = 'quest.clear_old_crown_catacombs_level_1';
const T22 = "I'd like to accept the Mossback Warrens Level 1 contract — and what can you tell me about the mossbacks before I head down?";
const guard = (message, quote) => guardCommands(message, [{ seq: 1, type: 'quest.accept', quest: 'q1', quote }], { inGuildHall: true });
function hall() {
    const g = new Chat4(content);
    g.chat = f.chat.slice(0, 73).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
const dropped = (g) => lastUser(g).events.find((e) => e.t === 'cmd.interpreted').d.dropped || [];

test('.185 T22 original wording: the acceptance before "— and what can you tell me …?" is kept (.184: dropped as question)', () => {
    const r = guard(T22, "I'd like to accept the Mossback Warrens Level 1 contract");
    assert.deepEqual(r.dropped.map((d) => d.rule), []);
    assert.equal(r.kept.length, 1);
    for (const m of ["I accept the Mossback contract — but what does it pay?", "I accept the Mossback contract - also, where is the warren?", "I take the Mossback contract — so how far is it?"])
        assert.equal(guard(m, m.split(/ [—-] /)[0]).kept.length, 1, m);
});

test('.185 T22 against: real questions and acceptances only weighed or planned stay protected', () => {
    for (const [m, rule] of [
        ['Could I accept the Mossback contract — and what does it pay?', 'question'],
        ['Could I accept the Mossback contract?', 'question'],
        ['If I accepted the Mossback contract, what would it pay?', 'question'],
        ['I wonder whether I should accept the Mossback contract — and what does it pay?', 'question'],
        ['I might accept the Mossback contract — but what does it pay?', 'question'],
        ["I'd consider accepting the Mossback contract - and what does it pay?", 'question'],
        ["I'm thinking about whether to accept the Mossback contract — and what does it pay?", 'question'],
        ["I'll accept the Mossback contract tomorrow — and what does it pay?", 'plan'], // .184: dropped as a question
    ]) {
        const r = guard(m, m.split(/ [—-] |,/)[0]);
        assert.equal(r.kept.length, 0, m);
        assert.deepEqual(r.dropped.map((d) => d.rule), [rule], m);
    }
});

test('.185 T22 host path (User04 #73): the acceptance with a following question books the contract ACTIVE', async () => {
    const g = hall();
    const msg = "I'd like to accept the Clear Old Crown Catacombs Level 1 contract — and what can you tell me about the catacombs before I head down?";
    await say(g, msg, { type: 'quest.accept', quest: Q, quote: "I'd like to accept the Clear Old Crown Catacombs Level 1 contract" });
    assert.deepEqual(dropped(g), []);
    assert.equal(g.state().quests[Q].status, 'active');
    assert.match(linesOf(g), /ACCEPTS — "Clear Old Crown Catacombs Level 1"/);
});

test('.185 T22/T27 against (host path): a dropped acceptance is told as NOT ACCEPTED; the contract stays listed', async () => {
    const g = hall();
    await say(g, 'Could I accept the Clear Old Crown Catacombs Level 1 contract — and what does it pay?', { type: 'quest.accept', quest: Q, quote: 'Could I accept the Clear Old Crown Catacombs Level 1 contract' });
    assert.deepEqual(dropped(g).map((d) => d.rule), ['question']);
    assert.equal(g.state().quests[Q].status, 'listed');
    assert.match(linesOf(g), /NOT ACCEPTED — "Could I accept the Clear Old Crown Catacombs Level 1 contract": it reads as a question\. "Clear Old Crown Catacombs Level 1" stays LISTED on the Guild board: nothing is stamped, logged or handed to him, it is not his and not active\./);
    assert.doesNotMatch(linesOf(g), /ACCEPTS —/);
});

test('.185 T27: the Guild block of the narrator says a [listed] contract is never told as his or active, also when he asks', () => {
    const s = foldChat(structuredClone(f.chat), 73).state;
    const text = buildContext(s, content, { input: 'Is the catacombs contract active under my name now?', outcome: { c: true }, budget: 6000 }).text;
    assert.match(text, new RegExp(`- ${Q.replace(/\./g, '\\.')}: Clear Old Crown Catacombs Level 1 \\[listed\\]`));
    assert.match(text, /A \[listed\] contract becomes Alaric's only by an ACCEPTS line of the engine; until then nobody stamps, logs or hands it to him, and nobody calls it his or active, also when he asks whether it is\./);
});
