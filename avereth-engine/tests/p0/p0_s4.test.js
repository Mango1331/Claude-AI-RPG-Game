// P0 / S4 (GM-tools experiment, Prototype B): the harness offline. A perfect Narrator meets S1's numbers; a lookup or a
// refused malformed command costs a round, not the case; a booked payment on a negative case is false agency; the
// SillyTavern backend forwards the tools and reads the calls back, and no output carries a key.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { openProvider } from '../../tools/p0/lib/provider.mjs';
import { readJsonl } from '../../tools/p0/lib/util.mjs';
import { loadVocabulary, loadScenes } from '../../tools/p0/lib/interpreter.mjs';
import { main as s1main, CORPUS_FILE, PRODUCT_VOCAB_FILE, s1MockResponder, promptKit } from '../../tools/p0/s1_interpreter.mjs';
import { main as s4main, s4MockResponder, gmTools, gmSystem, gmUser, readAnswer } from '../../tools/p0/s4_gm_tools.mjs';

const quiet = { log: () => {}, progress: () => {} };
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `p0-${name}-`));
const vocab = loadVocabulary(PRODUCT_VOCAB_FILE);
const scenes = loadScenes();
const corpus = readJsonl(CORPUS_FILE);
const neg = corpus.find((c) => !c.expect.length && c.tags.includes('question'));
const neutral = corpus.find((c) => c.id === 'real_v2_03'); // "*i follow the sounds bow ready …*": nothing the guard can catch
const pos = corpus.find((c) => c.expect.length === 1 && c.expect[0].type === 'go');
const pos2 = corpus.find((c) => c.expect.length && c !== pos && !c.expect[0].anyOf);

test('S4 prompt: the Narrator contract with the GM-mode rule, the scene catalog, the five GM tools', () => {
    const sys = gmSystem();
    assert.match(sys, /SANDBOX NARRATOR CONTRACT/);
    assert.match(sys, /GM TOOL MODE/);
    assert.ok(!sys.includes('{{user}}'));
    assert.deepEqual(gmTools().map((t) => t.function.name), ['avereth_lookup', 'avereth_resolve_combat', 'avereth_resolve_story', 'avereth_use_ability_on_world', 'avereth_commit_world']);
    const u = gmUser(scenes[pos.scene], pos.text);
    assert.match(u, /CATALOG/);
    assert.ok(u.endsWith(pos.text));
    const a = readAnswer({ content: '', tool_calls: [
        { id: 'c1', name: 'avereth_resolve_story', arguments: JSON.stringify({ commands: [{ type: 'go', to: 'loc.x', quote: 'q' }] }) },
        { id: 'c2', name: 'avereth_resolve_combat', arguments: '{"action":"attack","skill":"mage.flame_lance","target":"mon.a"}' },
        { id: 'c3', name: 'avereth_lookup', arguments: 'not json' },
    ] });
    assert.equal(a.story.length, 1);
    assert.deepEqual(a.other.map((x) => x.type), ['combat.attack']);
    assert.equal(a.lookups, 1);
    assert.match(a.calls[2].error, /not JSON/);
});

test('S4 with the mock: perfect answers score 100 %; a lookup or a malformed command costs a round; a payment on a negative is false agency', async () => {
    const out = tmp('s4');
    try {
        const respond = s4MockResponder(corpus, scenes, vocab, { lookupFirst: [pos.id], malformedFirst: [pos2.id], wrong: [neg.id, neutral.id] });
        const provider = await openProvider({ backend: 'mock', mock: respond });
        assert.equal(await s4main(['--out', out, '--concurrency', '16'], { ...quiet, provider, vocab }), 0);
        const res = JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8'));
        const byId = new Map(res.records.map((r) => [r.id, r]));
        assert.equal(byId.get(pos.id).rounds, 2);
        assert.equal(byId.get(pos.id).lookups, 1);
        assert.equal(byId.get(pos.id).score.exact, true, 'the lookup round did not lose the decision');
        assert.equal(byId.get(pos2.id).rounds, 2);
        assert.equal(byId.get(pos2.id).rejected_story, 1);
        assert.equal(byId.get(pos2.id).score.exact, true, 'the repaired command counts');
        // a payment on a question: the agency guard (now in B's resolve_story) drops it; on a neutral line it stays false
        assert.equal(byId.get(neg.id).score_raw.negative_ok, false);
        assert.equal(byId.get(neg.id).score.negative_ok, true);
        assert.equal(byId.get(neg.id).dropped[0].rule, 'question');
        assert.equal(byId.get(neutral.id).score.negative_ok, false);
        assert.equal(res.aggRaw.false_commitments, 2);
        assert.equal(res.agg.false_commitments, 1);
        assert.equal(res.agg.recall_pct, 100);
        assert.ok(res.agg.negative_precision_pct < 100);
        const summary = fs.readFileSync(path.join(out, 'summary.md'), 'utf8');
        assert.match(summary, /S4 GM-Tools/);
        assert.match(summary, /keine API-Keys/);
    } finally {
        fs.rmSync(out, { recursive: true, force: true });
    }
});

test('S4 --compare: side by side with an S1 run on the same cases', async () => {
    const out1 = tmp('s1c');
    const out4 = tmp('s4c');
    try {
        const kit = promptKit('v4');
        const p1 = await openProvider({ backend: 'mock', mock: s1MockResponder(corpus, scenes, kit.vocab, { user: kit.user }) });
        assert.equal(await s1main(['--out', out1, '--concurrency', '16', '--sample', '40', '--mode', 'plain'], { ...quiet, provider: p1, decision: null }), 0);
        const p4 = await openProvider({ backend: 'mock', mock: s4MockResponder(corpus, scenes, vocab, { wrong: [neutral.id] }) });
        assert.equal(await s4main(['--out', out4, '--concurrency', '16', '--sample', '40', '--compare', path.join(out1, 'results.json')], { ...quiet, provider: p4, vocab }), 0);
        const res = JSON.parse(fs.readFileSync(path.join(out4, 'results.json'), 'utf8'));
        assert.equal(res.compare.cases, 40);
        assert.deepEqual(res.compare.only_a.map((x) => x.id), [neutral.id], 'the case only the interpreter got right');
        assert.deepEqual(res.compare.only_b, []);
        assert.equal(res.compare.a.negative_precision_pct, 100);
        assert.ok(res.compare.b.negative_precision_pct < 100);
        assert.match(fs.readFileSync(path.join(out4, 'summary.md'), 'utf8'), /Gegen S1/);
    } finally {
        fs.rmSync(out1, { recursive: true, force: true });
        fs.rmSync(out4, { recursive: true, force: true });
    }
});

test('S4 through the SillyTavern backend: tools and tool_choice forwarded, the calls read back, no key sent', async () => {
    const seen = [];
    const server = http.createServer((req, res) => {
        let raw = '';
        req.on('data', (c) => { raw += c; });
        req.on('end', () => {
            const send = (obj, headers = {}) => { res.writeHead(200, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(obj)); };
            if (req.url === '/csrf-token') return send({ token: 't' }, { 'set-cookie': 's=1; Path=/' });
            if (req.url === '/api/settings/get') return send({ settings: JSON.stringify({ oai_settings: { chat_completion_source: 'custom', custom_url: 'https://provider.example/v1', custom_model: 'm', custom_include_body: '' } }) });
            const body = JSON.parse(raw || '{}');
            seen.push(body);
            return send({ choices: [{ message: { role: 'assistant', content: '', tool_calls: [{ id: 'call_x', type: 'function', function: { name: 'avereth_lookup', arguments: '{"kind":"scene"}' } }] }, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 9000, completion_tokens: 12, total_tokens: 9012 } });
        });
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    try {
        const p = await openProvider({ backend: 'st', stUrl: `http://127.0.0.1:${server.address().port}` });
        const r = await p.chat({ messages: [{ role: 'user', content: 'u' }], tools: gmTools(), toolChoice: 'auto' });
        assert.equal(r.ok, true);
        assert.deepEqual(r.tool_calls, [{ id: 'call_x', name: 'avereth_lookup', arguments: '{"kind":"scene"}' }]);
        assert.equal(seen[0].tools.length, 5);
        assert.equal(seen[0].tool_choice, 'auto');
        assert.ok(!JSON.stringify(seen[0]).includes('Bearer') && !('api_key' in seen[0]));
        // without tools nothing changes for S0–S2
        await p.chat({ messages: [{ role: 'user', content: 'u' }] });
        assert.ok(!('tools' in seen[1]) && !('tool_choice' in seen[1]));
    } finally {
        await new Promise((r) => server.close(r));
    }
});
