// Runtime V4, P0: one structured LLM call the way V4 would make it (plan §3.4, §4.3):
//   json_schema  the schema goes to the provider as response_format (through SillyTavern: json_schema → response_format)
//   plain        the schema is written into the prompt; the answer is parsed tolerantly
// The answer is always validated locally (validate.js). An invalid answer gets at most one repair call: plain, with the
// error list (in json_schema mode the second try goes without the schema, as planned). Rate limits and server errors
// get up to two transport retries with a pause; they do not count as answers.
import { extractJsonObject, validateSchema } from './util.mjs';

const RETRYABLE = /\b(?:429|500|502|503|504)\b|too many requests|rate.?limit|overloaded|service unavailable|bad gateway|gateway time-?out|internal server error|timeout|ECONNRESET|socket hang up|unknown error occurred/i;

export function isRetryable(r) {
    return r.status === 'timeout' || r.status === 'network' || RETRYABLE.test(String(r.error || ''));
}

export function schemaInstruction(schema) {
    return `Return only one JSON object that matches this JSON schema. No prose before or after it, no code fences.\n${JSON.stringify(schema)}`;
}

const pause = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/** provider.chat with transport retries (429, 5xx, timeouts); the result carries transport_retries. */
export async function chatWithRetry(provider, req, opts = {}) {
    const max = opts.transportRetries ?? 2;
    const waits = opts.backoffMs ?? [4000, 12000];
    const sleep = opts.sleep ?? pause;
    let tries = 0;
    let r;
    for (;;) {
        r = await provider.chat(req);
        if (r.ok || tries >= max || !isRetryable(r)) break;
        await sleep(waits[Math.min(tries, waits.length - 1)]);
        tries += 1;
    }
    return { ...r, transport_retries: tries };
}

/** Parse and validate one answer. rawJson: the answer was plain JSON without any cleanup. */
export function checkAnswer(content, schema) {
    const raw = String(content ?? '').trim();
    let rawJson = false;
    try {
        JSON.parse(raw);
        rawJson = true;
    } catch { /* needs cleanup or is not JSON */ }
    const { value, error } = extractJsonObject(raw);
    if (!value) return { value: null, valid: false, rawJson, errors: [error || 'no JSON object in the answer'] };
    const errors = validateSchema(value, schema);
    return { value, valid: errors.length === 0, rawJson, errors };
}

function attemptInfo(r) {
    return {
        status: r.status,
        ms: r.ms ?? null,
        usage: r.usage ?? null,
        finish: r.finish ?? null,
        content_chars: typeof r.content === 'string' ? r.content.length : 0,
        reasoning_chars: typeof r.reasoning === 'string' ? r.reasoning.length : 0,
        transport_retries: r.transport_retries ?? 0,
        ...(r.override ? { override: r.override } : {}),
        ...(r.ok ? {} : { error: r.error }),
    };
}

/**
 * @param {object} provider  from openProvider
 * @param {{name: string, schema: object, system: string, user: string, mode: 'json_schema'|'plain',
 *          reasoning?: string|null, maxTokens?: number, temperature?: number, repair?: boolean, plainInstruction?: string,
 *          transportRetries?: number, backoffMs?: number[], sleep?: Function}} o
 *   reasoning: undefined = as configured; a string = override reasoning_effort for this call.
 *   plainInstruction: the format instruction in plain mode and in the repair call (default: the schema as text).
 * @returns {Promise<{ok: boolean, value: any, valid_first: boolean, valid_final: boolean, repaired: boolean,
 *          errors_first: string[], errors_final: string[], attempts: object[], content: string, content_first: string,
 *          status?: string, error?: string}>}
 */
export async function structuredCall(provider, o) {
    const plainSystem = `${o.system}\n\n${o.plainInstruction ?? schemaInstruction(o.schema)}`;
    const common = {
        maxTokens: o.maxTokens,
        temperature: o.temperature,
        ...(o.reasoning !== undefined ? { reasoning: o.reasoning } : {}),
        timeoutMs: o.timeoutMs,
    };
    const firstReq = o.mode === 'json_schema'
        ? { ...common, messages: [{ role: 'system', content: o.system }, { role: 'user', content: o.user }], jsonSchema: { name: o.name, schema: o.schema } }
        : { ...common, messages: [{ role: 'system', content: plainSystem }, { role: 'user', content: o.user }] };
    const first = await chatWithRetry(provider, firstReq, o);
    const attempts = [attemptInfo(first)];
    if (!first.ok) {
        return { ok: false, status: first.status, error: first.error, value: null, valid_first: false, valid_final: false, repaired: false, errors_first: [], errors_final: [], attempts, content: '', content_first: '' };
    }
    const c1 = checkAnswer(first.content, o.schema);
    Object.assign(attempts[0], { raw_json: c1.rawJson, valid: c1.valid });
    const base = { ok: true, content_first: first.content, errors_first: c1.errors.slice(0, 8), valid_first: c1.valid, attempts };
    if (c1.valid || o.repair === false) {
        return { ...base, value: c1.value, valid_final: c1.valid, repaired: false, errors_final: c1.errors.slice(0, 8), content: first.content };
    }
    const repairReq = {
        ...common,
        messages: [
            { role: 'system', content: plainSystem },
            { role: 'user', content: o.user },
            { role: 'assistant', content: String(first.content || '').slice(0, 2000) || '(empty answer)' },
            { role: 'user', content: `That answer was not valid:\n- ${c1.errors.slice(0, 8).join('\n- ')}\nAnswer again with only the corrected JSON object.` },
        ],
    };
    const second = await chatWithRetry(provider, repairReq, o);
    attempts.push(attemptInfo(second));
    if (!second.ok) {
        return { ...base, value: c1.value, valid_final: false, repaired: true, errors_final: c1.errors.slice(0, 8), content: first.content, status: second.status, error: second.error };
    }
    const c2 = checkAnswer(second.content, o.schema);
    Object.assign(attempts[1], { raw_json: c2.rawJson, valid: c2.valid });
    return { ...base, value: c2.value ?? c1.value, valid_final: c2.valid, repaired: true, errors_final: c2.errors.slice(0, 8), content: second.content };
}

/** Sum of tokens over all attempts of one structured call (prompt, completion, reasoning). */
export function callTokens(result) {
    const t = { prompt: 0, completion: 0, reasoning: 0, reported: false };
    for (const a of result.attempts || []) {
        if (!a.usage) continue;
        t.reported = true;
        t.prompt += a.usage.prompt_tokens ?? 0;
        t.completion += a.usage.completion_tokens ?? 0;
        t.reasoning += a.usage.reasoning_tokens ?? 0;
    }
    return t;
}
