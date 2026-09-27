// Runtime V4, P0: the two real backends of tools/p0/lib/provider.mjs, offline.
//   direct       against a local OpenAI-compatible mock: the key goes only into the Authorization header, never into
//                a result, an error text or an output file; response_format and the reasoning override reach the body.
//   SillyTavern  against a stand-in of SillyTavern 1.19's HTTP API (csrf-token + cookie, settings/get,
//                chat-completions/generate): the tool sends no key, only the Custom source's settings; the reasoning
//                override edits the Include Body Parameters in place; json_schema is forwarded; clear errors for the
//                cases the tool cannot handle (not running, basic auth, accounts, another source).
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openProvider, ENV } from '../../tools/p0/lib/provider.mjs';
import { structuredCall } from '../../tools/p0/lib/structured.mjs';
import { O, B } from '../../tools/p0/lib/schema.mjs';
import { main as s0main } from '../../tools/p0/s0_structured.mjs';
import { s0MockResponder } from '../../tools/p0/s0_cases.mjs';
import { startMockOpenAI } from './mock_openai.mjs';

const KEY = 'sk-p0-test-key-0123456789abcdef';
const quiet = { log: () => {}, progress: () => {} };

function withEnv(vars, fn) {
    const old = {};
    for (const [k, v] of Object.entries(vars)) { old[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    return Promise.resolve(fn()).finally(() => { for (const [k, v] of Object.entries(old)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });
}

test('direct backend: key only in the Authorization header; schema and reasoning override in the body; errors scrubbed', async () => {
    const mock = await startMockOpenAI({ key: KEY, respond: async (req) => (req.messages.at(-1).content.includes('FAIL') ? { error: `bad key ${KEY} rejected`, status: 400 } : { content: '{"ok": true}' }) });
    try {
        await withEnv({ [ENV.base]: mock.url, [ENV.key]: KEY, [ENV.model]: 'test-model', [ENV.extra]: '{"reasoning_effort":"low","clear_thinking":true}' }, async () => {
            const p = await openProvider({ backend: 'direct' });
            assert.deepEqual(p.describe().extra_body_keys, ['reasoning_effort', 'clear_thinking']);
            assert.ok(!JSON.stringify(p.describe()).includes(KEY));
            const r = await structuredCall(p, { name: 'probe', schema: O({ ok: B() }), system: 's', user: 'u', mode: 'json_schema', reasoning: 'none', maxTokens: 20 });
            assert.equal(r.valid_first, true);
            const req = mock.requests[0];
            assert.equal(req.auth, `Bearer ${KEY}`);
            assert.equal(req.body.model, 'test-model');
            assert.equal(req.body.reasoning_effort, 'none', 'override replaces the configured low');
            assert.equal(req.body.clear_thinking, true);
            assert.equal(req.body.response_format.type, 'json_schema');
            assert.equal(req.body.response_format.json_schema.strict, true);
            const bad = await p.chat({ messages: [{ role: 'user', content: 'FAIL' }] });
            assert.equal(bad.ok, false);
            assert.ok(!bad.error.includes(KEY), 'the key never appears in an error text');
        });
    } finally {
        await mock.close();
    }
});

test('direct backend: a missing variable is named, its value never printed', async () => {
    await withEnv({ [ENV.base]: undefined, [ENV.key]: KEY, [ENV.model]: undefined }, async () => {
        await assert.rejects(openProvider({ backend: 'direct' }), (err) => err.message.includes(ENV.base) && err.message.includes(ENV.model) && !err.message.includes(KEY));
    });
});

test('S0 end to end through the direct backend: results carry no key and no Authorization header', async () => {
    const mock = await startMockOpenAI({ key: KEY, respond: s0MockResponder() });
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'p0-s0-direct-'));
    try {
        await withEnv({ [ENV.base]: mock.url, [ENV.key]: KEY, [ENV.model]: 'test-model', [ENV.extra]: undefined }, async () => {
            const code = await s0main(['--backend', 'direct', '--out', out, '--reps', '1', '--concurrency', '6'], quiet);
            assert.equal(code, 0);
        });
        for (const f of fs.readdirSync(out)) {
            const text = fs.readFileSync(path.join(out, f), 'utf8');
            assert.ok(!text.includes(KEY), `${f} contains the key`);
            assert.ok(!/authorization/i.test(text), `${f} mentions an Authorization header`);
        }
        const dec = JSON.parse(fs.readFileSync(path.join(out, 'decision.json'), 'utf8'));
        assert.equal(dec.structured_mode, 'json_schema');
        assert.equal(mock.requests.filter((r) => r.body?.response_format).length > 0, true);
    } finally {
        await mock.close();
        fs.rmSync(out, { recursive: true, force: true });
    }
});

// ------------------------------------------------------------------ SillyTavern stand-in
function startFakeST({ oai, profiles = [], respond, mode = 'ok' }) {
    const calls = [];
    const server = http.createServer((req, res) => {
        let raw = '';
        req.on('data', (c) => { raw += c; });
        req.on('end', async () => {
            const send = (status, obj, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(obj)); };
            if (mode === 'basic') return send(401, { error: 'Unauthorized' });
            if (req.url === '/csrf-token') return send(200, { token: 'tok-123' }, { 'set-cookie': 'session-abc=xyz; Path=/; HttpOnly' });
            const csrfOk = req.headers['x-csrf-token'] === 'tok-123' && String(req.headers.cookie || '').includes('session-abc=xyz');
            if (!csrfOk) return send(403, { error: 'Invalid CSRF token' });
            const body = raw ? JSON.parse(raw) : {};
            calls.push({ url: req.url, body });
            if (req.url === '/api/settings/get') {
                if (mode === 'accounts') return send(403, { error: 'login' });
                return send(200, { settings: JSON.stringify({ oai_settings: oai, extension_settings: { connectionManager: { profiles } } }) });
            }
            if (req.url === '/api/backends/chat-completions/generate') {
                const out = await respond(body);
                if (out.error) return send(200, { error: { message: out.error } });
                return send(200, { choices: [{ message: { role: 'assistant', content: out.content } }], usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 } });
            }
            return send(404, {});
        });
    });
    return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}`, calls, close: () => new Promise((r) => server.close(r)) })));
}

const OAI = { chat_completion_source: 'custom', custom_url: 'https://provider.example/v1', custom_model: 'zai-org/GLM-5.3-Flash', custom_include_body: 'clear_thinking: true\nreasoning_effort: low', custom_exclude_body: '', custom_include_headers: '', custom_prompt_post_processing: '' };

test('SillyTavern backend: no key sent, Custom settings used, reasoning override in place, json_schema forwarded', async () => {
    const st = await startFakeST({ oai: OAI, respond: async () => ({ content: '{"ok": true}' }) });
    try {
        const p = await openProvider({ backend: 'st', stUrl: st.url });
        const d = p.describe();
        assert.equal(d.model, 'zai-org/GLM-5.3-Flash');
        assert.equal(d.reasoning_effort, 'low');
        assert.ok(!JSON.stringify(d).includes('provider.example'), 'describe() shows no endpoint URL');
        const r = await structuredCall(p, { name: 'probe', schema: O({ ok: B() }), system: 's', user: 'u', mode: 'json_schema', reasoning: 'none', maxTokens: 20 });
        assert.equal(r.valid_first, true);
        const gen = st.calls.find((c) => c.url === '/api/backends/chat-completions/generate').body;
        assert.equal(gen.chat_completion_source, 'custom');
        assert.equal(gen.custom_url, 'https://provider.example/v1');
        assert.equal(gen.custom_include_body, 'clear_thinking: true\nreasoning_effort: none');
        assert.deepEqual(gen.json_schema.value, O({ ok: B() }));
        assert.equal(gen.json_schema.strict, true);
        assert.ok(!('api_key' in gen) && !JSON.stringify(gen).includes('Bearer'), 'the tool never sends a key');
    } finally {
        await st.close();
    }
});

test('SillyTavern backend: a Connection Profile picks URL, model and secret-id; provider errors come back readable', async () => {
    const profiles = [{ name: 'Spike', api: 'custom', 'api-url': 'https://other.example/v1', model: 'small-model', 'secret-id': 'sec-7' }];
    const st = await startFakeST({ oai: OAI, profiles, respond: async () => ({ error: 'Bad Request' }) });
    try {
        const p = await openProvider({ backend: 'st', stUrl: st.url, profile: 'spike' });
        assert.equal(p.describe().model, 'small-model');
        const r = await p.chat({ messages: [{ role: 'user', content: 'x' }] });
        assert.equal(r.ok, false);
        assert.match(r.error, /Bad Request/);
        const gen = st.calls.find((c) => c.url === '/api/backends/chat-completions/generate').body;
        assert.equal(gen.custom_url, 'https://other.example/v1');
        assert.equal(gen.secret_id, 'sec-7');
        await assert.rejects(openProvider({ backend: 'st', stUrl: st.url, profile: 'Nope' }), /Kein Connection Profile "Nope"/);
    } finally {
        await st.close();
    }
});

test('SillyTavern backend: clear messages when it cannot work (not running, basic auth, accounts, another source)', async () => {
    await assert.rejects(openProvider({ backend: 'st', stUrl: 'http://127.0.0.1:9' }), /nicht erreichbar/);
    const basic = await startFakeST({ oai: OAI, mode: 'basic', respond: async () => ({}) });
    await assert.rejects(openProvider({ backend: 'st', stUrl: basic.url }), /Benutzername und Passwort/);
    await basic.close();
    const acc = await startFakeST({ oai: OAI, mode: 'accounts', respond: async () => ({}) });
    await assert.rejects(openProvider({ backend: 'st', stUrl: acc.url }), /Anmeldung/);
    await acc.close();
    const other = await startFakeST({ oai: { ...OAI, chat_completion_source: 'openrouter' }, respond: async () => ({}) });
    await assert.rejects(openProvider({ backend: 'st', stUrl: other.url }), /"openrouter"/);
    await other.close();
});
