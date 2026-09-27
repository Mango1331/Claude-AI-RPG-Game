// Test helper for the P0 tools: a local OpenAI-compatible endpoint (POST …/chat/completions) that records every
// request and answers with a responder. Used by the offline tests (backend direct) and by the manual SillyTavern
// end-to-end check (SillyTavern's Custom source pointed at it).
import http from 'node:http';

/** Adapt an OpenAI request body to the req shape the P0 mock responders use. */
export function toReq(body) {
    const js = body?.response_format?.json_schema;
    return {
        messages: body.messages || [],
        maxTokens: body.max_tokens,
        temperature: body.temperature,
        ...(js ? { jsonSchema: { name: js.name, schema: js.schema } } : {}),
        ...(body.reasoning_effort !== undefined ? { reasoning: body.reasoning_effort } : {}),
    };
}

/**
 * @param {{respond: (req: object, body: object) => Promise<{content?: string, error?: string, status?: number}>|object,
 *          key?: string, delayMs?: number}} opts  key: when set, requests without "Authorization: Bearer <key>" get 401
 */
export function startMockOpenAI({ respond, key = null, delayMs = 0 } = {}) {
    const requests = [];
    const server = http.createServer((req, res) => {
        let raw = '';
        req.on('data', (c) => { raw += c; });
        req.on('end', async () => {
            let body = null;
            try { body = JSON.parse(raw || '{}'); } catch { /* keep null */ }
            const auth = req.headers.authorization || null;
            requests.push({ method: req.method, url: req.url, auth, body });
            const send = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
            if (!/\/chat\/completions$/.test(req.url || '')) return send(404, { error: { message: 'not found' } });
            if (key && auth !== `Bearer ${key}`) return send(401, { error: { message: 'invalid api key' } });
            if (delayMs) await new Promise((r) => { setTimeout(r, delayMs); });
            let out;
            try {
                out = await respond(toReq(body), body);
            } catch (err) {
                return send(500, { error: { message: String(err.message || err) } });
            }
            if (out?.error) return send(out.status || 400, { error: { message: out.error } });
            const content = String(out?.content ?? '');
            const prompt = JSON.stringify(body?.messages || []).length;
            send(200, {
                id: `mock-${requests.length}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: body?.model || 'mock',
                choices: [{ index: 0, message: { role: 'assistant', content, ...(out?.reasoning ? { reasoning_content: out.reasoning } : {}) }, finish_reason: 'stop' }],
                usage: { prompt_tokens: Math.ceil(prompt / 4), completion_tokens: Math.ceil(content.length / 4), total_tokens: Math.ceil(prompt / 4) + Math.ceil(content.length / 4), ...(out?.reasoning ? { completion_tokens_details: { reasoning_tokens: Math.ceil(out.reasoning.length / 4) } } : {}) },
            });
        });
    });
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({ url: `http://127.0.0.1:${port}/v1`, port, requests, close: () => new Promise((r) => { server.close(() => r()); }) });
        });
    });
}
