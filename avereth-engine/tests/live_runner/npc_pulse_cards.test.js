// P2-A of the GPT review of 2449990 (patch_plans_10b/REVIEW_NPC_PULSE_RUNNER_2449990_GPT.md §3): what the narrator
// was actually shown of a stored anchor or an open agreement. Only the current engine block of a narrator request
// counts (its last "[AVERETH ENGINE — authoritative game state" message), only that person's card in it, the whole
// stored value (a value cut by the card's cap is "partial"), and every later request until the first whole delivery.
// A chat of the real engine (host path, scripted planner/extractor answers); the requests are the real narrator blocks
// of its turns, or constructed ones where a case needs an older prompt section or a later card.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, GO } from '../v4/patch8_lib.js';
import { rec } from '../../src/host.js';
import { processReplyAny, runExtraction } from '../../src/v4/runtime.js';
import { npcPulseAnalysis, npcPulseMarkdown } from '../../tools/st_live/live/npc_pulse.mjs';

const content = await loadProductContent();
const HALL = 'loc.alderwatch.guild_hall';
const arrive = (at, more = {}) => ({ seq: 1, type: 'arrive', at, forced_by: null, with: null, ...more });
const VOICE = 'flat and precise, every word weighed twice';
const MANNER = 'dry and unhurried with strangers, warm only once they keep a promise to her'; // 75 of the 80 allowed
const INTEREST = 'old marching tunes and the maps of the northern roads';
const PROMISE = 'Hessa promised to keep a copy of the Alderwatch road map for Alaric until dusk and to mark the safe wells on it';

async function replyWith(g, prose, answer, said) {
    g.chat.push({ mes: prose, is_user: false, is_system: false, extra: {} });
    const id = g.chat.length - 1;
    const p = processReplyAny(g.chat, id, g.content, said?.context ? { narratorContext: said.context.diagnostics } : {});
    g.answer = answer;
    if (p.extract) await runExtraction(g.chat, id, g.content, g.llm);
    return rec(g.chat[id]);
}
/** Hessa met with a long promise, left at the verge, met again: three anchors; then two turns of talk with her. */
async function hessa() {
    const g = await campaign(content);
    const start = g.state().scene.at;
    const calls = [];
    const turn = async (text, ...commands) => {
        const r = await say(g, text, ...commands);
        if (r.context) calls.push({ role: 'narrator', turn: g.chat.filter((m) => m.is_user).length, request: { messages: [{ role: 'system', content: 'You narrate Avereth.' }, { role: 'system', content: r.context.text }] } });
        return r;
    };
    let r = await turn('*I walk to the Guild hall*', GO(HALL, 'I walk to the Guild hall'));
    await replyWith(g, 'He walked into the Guild hall. Hessa, a grey-haired woman with spectacles at the long counter, promised to keep a copy of the road map for him and to mark the safe wells.',
        { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: null } }, deltas: [arrive(HALL), { seq: 2, type: 'person.new', ref: 'hall_clerk', name: 'Hessa', role: 'clerk', desc: ['grey-haired woman with spectacles at the long counter'], armed: null, present: true, relevant: true, threat: false, at: HALL, band: 'SHORT', distinct_from: null },
            { seq: 3, type: 'thread', id: null, text: PROMISE, kind: 'promise', status: 'open', resolution: null, who: ['pc', 'hall_clerk'] }] }, r);
    const id = Object.values(g.state().entities).find((e) => e.name === 'Hessa').id;
    r = await turn('*I walk back out to the verge*', GO(start, 'I walk back out to the verge'));
    await replyWith(g, 'He walked back out to the verge.', { scene: start, expected: { 1: { arrived: true, at: start, with: null, met: null } }, deltas: [arrive(start)] }, r);
    r = await turn('*I go back to the Guild hall*', GO(HALL, 'I go back to the Guild hall'));
    await replyWith(g, 'He went back to the Guild hall. Hessa stood behind the counter and waved, humming an old marching tune over her maps.',
        { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: [{ who: id, evidence: 'Hessa stood behind the counter and waved' }] } },
            deltas: [arrive(HALL), { seq: 2, type: 'fact', s: id, p: 'voice', o: VOICE }, { seq: 3, type: 'fact', s: id, p: 'manner', o: MANNER }, { seq: 4, type: 'fact', s: id, p: 'interest', o: INTEREST }] }, r);
    r = await turn('*I ask Hessa about the wells*');
    await replyWith(g, 'Hessa tapped the map where the safe wells were.', { scene: HALL, expected: {}, deltas: [] }, r);
    r = await turn('*I thank Hessa*');
    await replyWith(g, 'Hessa nodded.', { scene: HALL, expected: {}, deltas: [] }, r);
    const stored = g.chat.filter((m) => m.is_user).length - 2; // the turn whose reply stored the anchors
    return { g, id, calls, stored };
}
const block = (turn, lines) => `[AVERETH ENGINE — authoritative game state, turn ${turn}. Numbers, rolls, positions and knowledge below are binding; narrate, never recalculate.]\n${lines.join('\n')}`;
const anchor = (a, p) => a.npc.anchors.find((x) => x.p === p);

test('P2-A: a card cut by the 170-character cap delivers its anchor and agreement only partly; a value it cut away entirely is not delivered', async () => {
    const { g, id, calls } = await hessa();
    // the real compact card of the next turns: voice whole, manner cut by the cap, interest gone; the promise cut on the
    // attitude row (it is longer than the row's room)
    const block = calls.at(-2).request.messages[1].content.split('\n');
    const at = block.findIndex((l) => l.startsWith('• ') && l.includes(`[${id}]`));
    const head = block[at];
    const card = [head, ...block.slice(at + 1).filter((l, k, xs) => xs.slice(0, k + 1).every((y) => y.startsWith('  ')))];
    assert.ok(head.length <= 170 && head.endsWith('…') && head.includes(`voice: ${VOICE};`) && !head.includes(MANNER) && !head.includes('interest:'), head);
    assert.ok(card.some((l) => l.includes('; between you: Hessa promised') && l.endsWith('…')) && !card.some((l) => l.includes(PROMISE)), card.join('\n'));
    const a = npcPulseAnalysis(g.chat, { calls });
    const cov = (k) => a.coverage.find((c) => c.id === k);
    assert.deepEqual([cov('anchor_on_card').count, cov('agreement_on_card').count], [1, 0], 'only the whole voice was delivered');
    assert.equal(anchor(a, 'voice').later.status, 'full');
    assert.equal(anchor(a, 'manner').later.status, 'partial', 'a cut value is no whole delivery');
    assert.equal(anchor(a, 'interest').later.status, 'none');
    assert.equal(cov('anchor_on_card').partial, 1);
    const agreement = a.npc.agreements.find((x) => x.text === PROMISE);
    assert.equal(agreement.onCard.status, 'partial');
    assert.equal(cov('agreement_on_card').partial, 1);
    const md = npcPulseMarkdown(a);
    assert.match(md, /gekürzt \(Zug \d+\)/);
});

test('P2-A: an older prompt section with the words is no delivery; only the current engine block counts', async () => {
    const { g, id, stored } = await hessa();
    const older = `manner: ${MANNER}; between you: ${PROMISE}`;
    // a request for every turn of the run: the words stand in the chat and other sections, her card is not in the block
    const calls = Array.from({ length: stored + 2 }, (_, k) => k + 1).map((turn) => ({ role: 'narrator', turn, request: { messages: [
        { role: 'system', content: 'You narrate Avereth.' },
        { role: 'assistant', content: `An old card the story repeated: • Hessa [${id}] — person, clerk; ${older}` },
        { role: 'system', content: block(turn - 1, ['ACTIVE SCENE: nobody besides Alaric.']) },
        { role: 'user', content: `earlier engine words: ${older}` },
    ] } }));
    const a = npcPulseAnalysis(g.chat, { calls });
    const cov = (k) => a.coverage.find((c) => c.id === k);
    assert.deepEqual([cov('anchor_on_card').count, cov('agreement_on_card').count], [0, 0], 'no delivery from older prompt words');
    assert.equal(anchor(a, 'manner').later.status, 'none');
    assert.equal(a.npc.agreements.find((x) => x.text === PROMISE).onCard.status, 'none');
    // the engine's bookkeeping request after the narration of a turn carries a state too; it is no narration
    const report = { role: 'narrator', turn: stored + 1, request: { messages: [{ role: 'system', content: `[AVERETH ENGINE — FACT REPORT REQUEST] write the report.\n\n• Hessa [${id}] — person, clerk; voice: ${VOICE}; old map` }] } };
    assert.equal(anchor(npcPulseAnalysis(g.chat, { calls: [...calls.slice(0, stored + 1), report, calls.at(-1)] }), 'voice').later.status, 'none');
});

test('P2-A: a later whole card is found although the first turn with her present had none; without requests it stays unknown', async () => {
    const { g, id, stored } = await hessa();
    const card = [`• Hessa [${id}] — person, clerk; voice: ${VOICE}; manner: ${MANNER}; interest: ${INTEREST}; grey-haired woman with spectacles at the long counter`,
        '  toward Alaric: no established attitude; knows him by name', `  open between you: ${PROMISE}`];
    const calls = [
        { role: 'narrator', turn: stored + 1, request: { messages: [{ role: 'system', content: block(stored, ['ACTIVE SCENE: nobody besides Alaric.']) }] } },
        { role: 'narrator', turn: stored + 2, request: { messages: [{ role: 'system', content: block(stored + 1, ['ACTIVE SCENE — canonical handles:', ...card]) }] } },
    ];
    const a = npcPulseAnalysis(g.chat, { calls });
    const cov = (k) => a.coverage.find((c) => c.id === k);
    assert.deepEqual([cov('anchor_on_card').count, cov('agreement_on_card').count], [3, 1], 'the later whole card counts');
    for (const p of ['voice', 'manner', 'interest']) assert.deepEqual([anchor(a, p).later.status, anchor(a, p).later.fullAt], ['full', stored + 2], p);
    const agreement = a.npc.agreements.find((x) => x.text === PROMISE);
    assert.deepEqual([agreement.onCard.status, agreement.onCard.fullAt], ['full', stored + 2]);
    // a different, longer value that merely starts with the stored one is no delivery of it
    const both = (lines) => [stored + 1, stored + 2].map((turn) => ({ role: 'narrator', turn, request: { messages: [{ role: 'system', content: block(turn - 1, lines) }] } }));
    const longer = both([`• Hessa [${id}] — person, clerk; voice: ${VOICE} and slow; grey-haired woman`]);
    assert.equal(anchor(npcPulseAnalysis(g.chat, { calls: longer }), 'voice').later.status, 'none');
    // another person's card with her value is not hers
    const other = both([`• Hob [npc.hob] — person, porter; voice: ${VOICE}; broad porter`]);
    assert.equal(anchor(npcPulseAnalysis(g.chat, { calls: other }), 'voice').later.status, 'none');
    const none = npcPulseAnalysis(g.chat);
    assert.equal(anchor(none, 'voice').later.status, 'unknown');
    assert.equal(none.npc.agreements.find((x) => x.text === PROMISE).onCard.status, 'unknown');
    assert.match(npcPulseMarkdown(none), /\| \? \|/);
});
