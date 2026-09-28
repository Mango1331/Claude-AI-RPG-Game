// Runtime V4, P0 (docs/P0_SPIKES.md): the shared helpers of tools/p0 — secret scrubbing, JSON extraction, SillyTavern's
// Include Body Parameters, the strict schema dialect, the structured call with its repair retry, and the delta checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scrub, extractJsonObject, assertNoSecrets, parseArgs, flattenRefs } from '../../tools/p0/lib/util.mjs';
import { setIncludeBodyKey, includeBodyKeys, configuredReasoning, openProvider } from '../../tools/p0/lib/provider.mjs';
import { O, S, I, E, A, N, REF, strictProblems } from '../../tools/p0/lib/schema.mjs';
import { structuredCall, checkAnswer, isRetryable, chatWithRetry } from '../../tools/p0/lib/structured.mjs';
import { loadDeltaVocab, deltaSchema, splitBlock, checkBlock, goldMatch, scoreDeltas } from '../../tools/p0/lib/deltas.mjs';

test('scrub removes keys, bearer tokens and api_key parameters; assertNoSecrets refuses them', () => {
    const key = 'sk-test-1234567890abcdefXYZ';
    const text = `Authorization: Bearer ${key} failed; url https://x/v1?api_key=abcdef123456 and ${key} again`;
    const s = scrub(text, [key]);
    assert.ok(!s.includes(key));
    assert.ok(!s.includes('abcdef123456'));
    assert.throws(() => assertNoSecrets(`{"a":"${key}"}`, [key]), /API key/);
    assert.throws(() => assertNoSecrets('"Authorization": "Bearer abcdefgh1234"'), /Authorization/);
    assert.doesNotThrow(() => assertNoSecrets('{"model":"zai-org/GLM-5.3-Flash","usage":{"prompt_tokens":10}}', [key]));
});

test('extractJsonObject tolerates think blocks, code fences and prose around the object', () => {
    assert.deepEqual(extractJsonObject('<think>hm {"x":1}</think>```json\n{"commands": []}\n```').value, { commands: [] });
    assert.deepEqual(extractJsonObject('Sure! {"mode": "question", "speech_only": true} Hope that helps.').value, { mode: 'question', speech_only: true });
    assert.equal(extractJsonObject('no json here').value, null);
});

test('parseArgs reads --key value, --flag and --key=value', () => {
    assert.deepEqual(parseArgs(['--reps', '3', '--dry-run', '--mode=plain', 'x']), { _: ['x'], reps: '3', 'dry-run': true, mode: 'plain' });
});

test('setIncludeBodyKey replaces in place and never duplicates a key (SillyTavern drops YAML with duplicates)', () => {
    const yaml = 'clear_thinking: true\nreasoning_effort: low';
    const r = setIncludeBodyKey(yaml, 'reasoning_effort', 'none');
    assert.equal(r.applied, true);
    assert.equal(r.text, 'clear_thinking: true\nreasoning_effort: none');
    assert.equal((r.text.match(/reasoning_effort/g) || []).length, 1);
    assert.equal(setIncludeBodyKey(yaml, 'reasoning_effort', null).text, 'clear_thinking: true');
    assert.equal(setIncludeBodyKey('', 'reasoning_effort', 'none').text, 'reasoning_effort: none');
    assert.deepEqual(JSON.parse(setIncludeBodyKey('{"reasoning_effort":"low","x":1}', 'reasoning_effort', 'minimal').text), { reasoning_effort: 'minimal', x: 1 });
    assert.equal(setIncludeBodyKey('nested:\n  a: 1', 'reasoning_effort', 'none').applied, false);
    assert.deepEqual(includeBodyKeys(yaml), ['clear_thinking', 'reasoning_effort']);
    assert.equal(configuredReasoning(yaml), 'low');
    assert.equal(configuredReasoning('{"reasoning_effort":"high"}'), 'high');
});

test('strict schema builders: closed objects, all keys required, optional ones nullable; problems are reported', () => {
    const s = O({ a: S(), b: N(I(0)), c: E(['x', 'y']), d: A(REF(['id.1'])) });
    assert.deepEqual(strictProblems(s), []);
    assert.deepEqual(s.required, ['a', 'b', 'c', 'd']);
    assert.deepEqual(N(E(['x'])).enum, ['x', null]);
    const loose = { type: 'object', properties: { a: { type: 'string' } }, required: [] };
    assert.equal(strictProblems(loose).length, 2);
    assert.ok(strictProblems({ type: 'string', oneOf: [] })[0].includes('oneOf'));
    const flat = flattenRefs({ $defs: { x: { type: 'string' } }, type: 'object', properties: { a: { $ref: '#/$defs/x' } } });
    assert.deepEqual(flat, { type: 'object', properties: { a: { type: 'string' } } });
});

test('structuredCall: a valid answer passes, an invalid one gets exactly one plain repair call with the error list', async () => {
    const schema = O({ ok: { type: 'boolean' } });
    const seen = [];
    const provider = await openProvider({ backend: 'mock', mock: async (req) => { seen.push(req); return { content: seen.length === 1 ? 'Here: {"ok": "yes"}' : '{"ok": true}' }; } });
    const r = await structuredCall(provider, { name: 't', schema, system: 'sys', user: 'u', mode: 'json_schema', maxTokens: 50 });
    assert.equal(r.valid_first, false);
    assert.equal(r.valid_final, true);
    assert.equal(r.repaired, true);
    assert.equal(seen.length, 2);
    assert.ok(seen[0].jsonSchema, 'first call sends the schema');
    assert.equal(seen[1].jsonSchema, undefined, 'the repair goes without the schema (plan §3.4)');
    assert.match(seen[1].messages.at(-1).content, /not valid/);
    assert.equal(checkAnswer('{"ok": true}', schema).rawJson, true);
    assert.equal(checkAnswer('```json\n{"ok": true}\n```', schema).rawJson, false);
});

test('transport retries: 429 and 5xx are retried with a pause, a 400 is not', async () => {
    assert.equal(isRetryable({ status: 'provider_error', error: 'Too Many Requests' }), true);
    assert.equal(isRetryable({ status: 'http_error', error: 'HTTP 503: busy' }), true);
    assert.equal(isRetryable({ status: 'provider_error', error: 'Bad Request' }), false);
    let n = 0;
    const provider = await openProvider({ backend: 'mock', mock: async () => (++n < 3 ? { error: 'HTTP 429: slow down' } : { content: 'ok' }) });
    const r = await chatWithRetry(provider, { messages: [{ role: 'user', content: 'x' }] }, { sleep: async () => {} });
    assert.equal(r.ok, true);
    assert.equal(r.transport_retries, 2);
});

test('delta blocks: split from the prose; a missing expected key is incomplete, a wrong field invalid', () => {
    const vocab = loadDeltaVocab();
    const schema = deltaSchema(vocab, { places: ['loc.a'] }, { 1: 'go' });
    assert.deepEqual(strictProblems(schema), []);
    const { prose, block } = splitBlock('Story text.\n\n<avereth>{"expected":{},"deltas":[]}</avereth>');
    assert.equal(prose, 'Story text.');
    const inc = checkBlock(block, schema, { 1: 'go' });
    assert.equal(inc.valid, true);
    assert.equal(inc.complete, false);
    assert.deepEqual(inc.missing, ['1']);
    const bad = checkBlock('{"expected":{"1":{"arrived":true,"at":"loc.a"}},"deltas":[{"seq":1,"type":"coin","cp":-7,"taken_by":"x"}]}', schema, { 1: 'go' });
    assert.equal(bad.valid, false);
    assert.equal(checkBlock(null, schema, { 1: 'go' }).present, false);
    assert.equal(splitBlock('Prose <avereth>{"expected":{}').block, '{"expected":{}', 'an unclosed block at the end still counts');
});

test('gold matching: regex on any leaf, $has, $range, $any, alternatives; scoring counts forbidden deltas as misses', () => {
    assert.equal(goldMatch('/reed/i', { new: { name: 'reedbeds', parent: 'loc.a' } }), true);
    assert.equal(goldMatch({ $has: [{ price_cp: 4 }, { price_cp: 2 }] }, [{ price_cp: 2 }, { price_cp: 4 }]), true);
    assert.equal(goldMatch({ $range: [10, 20] }, 21), false);
    assert.equal(goldMatch({ type: 'person.new', $any: '/ossler/i', present: false }, { type: 'person.new', name: 'Ossler', present: false }), true);
    assert.equal(goldMatch(['loc.x', '/mill/i'], 'Millbrook'), true);
    const s = scoreDeltas({ expected: { 1: { arrived: true } }, critical: [{ type: 'arrive' }], forbidden: [{ type: 'coin.gift' }] },
        { expected: { 1: { arrived: true, at: null } }, deltas: [{ type: 'arrive', at: 'loc.x' }, { type: 'coin.gift', cp: 5 }] });
    assert.equal(s.expected_ok, 1);
    assert.equal(s.critical_found, 1);
    assert.equal(s.forbidden_hits.length, 1);
    assert.equal(Math.round(s.semantic * 100), 67);
});

test('report bundles the summaries and refuses anything that looks like a key', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const { main } = await import('../../tools/p0/report.mjs');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p0-report-'));
    try {
        fs.mkdirSync(path.join(dir, 's3'));
        fs.writeFileSync(path.join(dir, 's3', 'summary.md'), '# P0 / S3 Domänen-Prototyp (V12-Pfad): Ergebnis\n\n- **36 von 36 Prüfungen erfüllt**\n');
        assert.equal(main(['--in', dir], { log: () => {} }), 0);
        const text = fs.readFileSync(path.join(dir, 'P0_ERGEBNIS.md'), 'utf8');
        assert.match(text, /36 von 36/);
        assert.match(text, /fehlt: S0 Structured Output/);
        fs.writeFileSync(path.join(dir, 's3', 'summary.md'), '# S3\n\nerror: sk-fake-abcdefghijklmnopqrstuvwx\n');
        assert.throws(() => main(['--in', dir], { log: () => {} }), /API-Key/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('rescore: the recorded P0 answers give the recorded decision numbers again; the corrections sit beside them', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { ENGINE_ROOT, readJsonl } = await import('../../tools/p0/lib/util.mjs');
    const { rescoreS2, rescoreS1 } = await import('../../tools/p0/rescore.mjs');
    const { DATA_FILE } = await import('../../tools/p0/s2_deltas.mjs');
    const { CORPUS_FILE } = await import('../../tools/p0/s1_interpreter.mjs');
    const dir = path.join(ENGINE_ROOT, 'p0_out');
    if (!fs.existsSync(path.join(dir, 's2', 'a.json'))) return; // the results of 27.09. are not in this checkout
    const s2 = rescoreS2(path.join(dir, 's2'), readJsonl(DATA_FILE));
    assert.equal(s2.a.semantic_micro_pct, 87.4, 'A as measured');
    assert.equal(s2.a.semantic_turns_v1_pct, 85.2);
    assert.equal(s2.b_block.semantic_micro_pct, 67.3, 'B as measured');
    assert.equal(s2.a.semantic_turns_v2_pct, 81.6, 'A per turn, without the turns that have no gold item');
    assert.equal(s2.a.forbidden_hits, 7);
    assert.equal(s2.a.critical, '58/63');
    assert.ok(s2.b_block_strict.semantic_micro_pct < s2.b_block.semantic_micro_pct, 'B counting only schema-valid blocks');
    const s1 = rescoreS1(path.join(dir, 's1', 'results.json'), readJsonl(CORPUS_FILE));
    assert.equal(s1.layers[0].negative_precision_pct, 93.1);
    assert.equal(s1.layers[0].recall_pct, 94.2);
});
