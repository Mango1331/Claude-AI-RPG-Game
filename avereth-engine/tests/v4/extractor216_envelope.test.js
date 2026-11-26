// .216: the archived User12–14 replies put the ordered world deltas beside the
// numbered step receipts, one level too deep; the emitted list itself is complete.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { parseExtraction } from '../../src/v4/extract.js';

const { deltaVocab } = await loadProductContent();
const parse = (text, keys = {}) => parseExtraction(text, deltaVocab, { places: ['loc.hall'] }, keys, { sceneRequired: true, startScene: 'loc.hall' });

test('move only the misplaced list, before the existing receipt, delta and scene checks', () => {
    const expected = { 1: { handled_by: { who: 'npc.clerk', evidence: 'She stamps the slip.' } }, 2: { priced: false, taken_anyway: false } };
    const deltas = [
        { seq: 1, type: 'fact', s: 'npc.clerk', p: 'work', o: 'The old seal says "deltas": [}].' },
        { seq: 2, type: 'memory', text: 'He keeps the receipt.', who: ['pc'], imp: 6 },
    ];
    const keys = { 1: 'desk', 2: 'buy' };
    const canonical = parse(JSON.stringify({ scene: 'here', expected, deltas }), keys);
    assert(canonical.valid && canonical.complete, JSON.stringify(canonical));
    const nested = JSON.stringify({ scene: 'here', expected: { ...expected, deltas } });
    for (const answer of [nested, nested.slice(0, -1), '```json\n' + nested + '\n```'])
        assert.deepEqual(parse(answer, keys).value, canonical.value);
    const empty = parse('{"scene":"here","expected":{"deltas":[]}}', { 1: 'buy' });
    assert(empty.valid && !empty.complete);
    assert.deepEqual(empty.missing, ['1']);
    assert.deepEqual(empty.value.deltas, []);
});

test('do not invent, concatenate or choose between delta sources', () => {
    for (const answer of [
        '{"scene":"here","expected":{"1":{"deltas":[]}}}',
        '{"scene":"here","expected":{"deltas":{}}}',
        '{"scene":"here","deltas":[],"expected":{"deltas":[]}}',
        '{"scene":"here","deltas":null,"expected":{"deltas":[]}}',
        '{"scene":"here","expected":{"deltas":[],"other":[]}}',
        '{"scene":"here","expected":{"1":{"deltas":[]},"deltas":[]}}',
        '{"scene":"here","expected":{"deltas":[],"deltas":[]}}',
        '{"scene":"here","expected":{},"expected":{"deltas":[]}}',
        '{"scene":"here","expected":{"deltas":[]},"expected":{},"deltas":[]}',
        String.raw`{"scene":"here","expected":{"deltas":[{"type":"time","seq":1,"minutes":5,"m\u0069nutes":8}]}}`,
        '{"scene":"here","expected":{"deltas":[{"seq":1,"type":"time","minutes":5}',
        '```json\n{"scene":"here","expected":{"deltas":[]}}\n```\n```json\n{"scene":"here","deltas":[]}\n```',
        '```json\n{"scene":"here","deltas":[]}\n```\n```json\n{"scene":"here","expected":{"deltas":[]}}\n```',
    ]) assert.equal(parse(answer).valid, false, answer);
});

test('evidence remains literal, even when its punctuation looks like JSON or a smart quote', () => {
    const quote = 'The clerk says “done”. She points to the words "expected" and "deltas" beside <think>the old seal</think>.';
    const value = parse(JSON.stringify({ scene: 'here', expected: { deltas: [{ seq: 1, type: 'fact', s: 'pc', p: 'mark', o: quote }] } }));
    assert(value.valid, JSON.stringify(value.errors));
    assert.equal(value.value.deltas[0].o, quote);
});

test('normal and misplaced lists produce the same remaining errors and semantic repair requests', () => {
    for (const [scene, deltas] of [
        ['here', [{ seq: 1, type: 'unlisted' }]],
        ['loc.unlisted', [{ seq: 1, type: 'time', minutes: 5 }]],
    ]) {
        const correct = parse(JSON.stringify({ scene, expected: {}, deltas }));
        const misplaced = parse(JSON.stringify({ scene, expected: { deltas } }));
        assert(!correct.valid || correct.issues.length, JSON.stringify(correct));
        assert.deepEqual(misplaced.errors, correct.errors);
        assert.deepEqual(misplaced.issues, correct.issues);
    }
});

test('the receipt for an arrival still needs an arrival delta in story order', () => {
    const at = 'loc.hall';
    const receipt = { arrived: true, at, with: null, met: null };
    const normal = { scene: at, expected: { 1: receipt }, deltas: [] };
    const nested = { scene: at, expected: { 1: receipt, deltas: [] } };
    const checked = parse(JSON.stringify(normal), { 1: 'go' });
    assert(checked.issues.some(issue => issue.why.includes('corresponding arrive')), JSON.stringify(checked));
    assert.deepEqual(parse(JSON.stringify(nested), { 1: 'go' }).issues, checked.issues);
});
