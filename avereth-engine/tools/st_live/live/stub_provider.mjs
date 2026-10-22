// A stub OpenAI-compatible provider for the runner's own check (docs/LIVE_RUNNER.md §10: selftest.mjs, run_live.mjs
// --stub). It is no model and no live test: the planner gets an empty plan, the extractor no deltas, the board an
// answer it rejects, the narrator a fixed sentence about the player's message, and the player (players.mjs llm) the
// next of a few fixed decisions. It checks the plumbing: the isolated instance, the key's way through SillyTavern, the
// calls in the log, the exports, the report. It keeps what it was sent (never the key: only whether it came).
import http from 'node:http';
import { roleOf } from './calls.mjs';

export const STUB_MODEL = 'stub-model';
export const PLAYER_SCRIPT = [
    { message: 'Mage', milestone: 'creation_complete', intent: 'pick the Base Class Mage' },
    { message: 'Flame Lance + Blink', milestone: 'creation_complete', intent: 'pick the two skills' },
    { message: '*i walk into the city ahead and look for the adventurers guild*', milestone: 'guild_registered', intent: 'find the Guild', observations: 'stub run: the narrator only echoes' },
    { message: '*i look around for the front desk*', milestone: 'guild_registered', intent: 'find the front desk' },
];

export async function startStub({ port = 0, key = null, delayMs = 50 } = {}) {
    const calls = [];
    let playerTurn = 0;
    const server = http.createServer(async (req, res) => {
        if (req.method === 'GET' && /\/models\/?$/.test(req.url)) {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ object: 'list', data: [{ id: STUB_MODEL, object: 'model' }] }));
            return;
        }
        let body = '';
        for await (const c of req) body += c;
        let j = {};
        try { j = JSON.parse(body || '{}'); } catch { /* answered below */ }
        const role = roleOf(j);
        const msgs = j.messages || [];
        const lastUser = String([...msgs].reverse().find((m) => m.role === 'user')?.content || '');
        let text;
        if (role === 'plan' || role === 'interpret') text = JSON.stringify({ commands: [] });
        else if (role === 'extract') text = JSON.stringify({ expected: {}, deltas: [] });
        else if (role === 'board') text = JSON.stringify({ listings: [] });
        else if (role === 'player') {
            const d = PLAYER_SCRIPT[playerTurn] || { message: '', stop: true, stop_reason: 'done', milestone: null, intent: null };
            playerTurn += 1;
            text = `Here is my move:\n\`\`\`json\n${JSON.stringify({ stop: false, stop_reason: null, observations: '', ...d })}\n\`\`\``;
        } else {
            const said = lastUser.split('\n').filter(Boolean).at(-1) || '';
            text = `The world answers quietly. (Stub narrator: no model behind this reply; the player wrote: ${said.slice(0, 120)})`;
        }
        calls.push({ role, at: Date.now(), auth: req.headers.authorization ? (key && req.headers.authorization === `Bearer ${key}` ? 'key' : 'other') : 'none', model: j.model ?? null, stream: !!j.stream, max_tokens: j.max_tokens ?? null });
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: `stub-${calls.length}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: STUB_MODEL, choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage: { prompt_tokens: Math.ceil(body.length / 4), completion_tokens: Math.ceil(text.length / 4), total_tokens: Math.ceil((body.length + text.length) / 4) } }));
    });
    await new Promise((r) => server.listen(port, '127.0.0.1', r));
    const url = `http://127.0.0.1:${server.address().port}/v1`;
    return { url, calls, close: () => new Promise((r) => server.close(r)) };
}
