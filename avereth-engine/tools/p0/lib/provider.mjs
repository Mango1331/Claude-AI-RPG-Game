// Runtime V4, P0 spikes: one way to reach the LLM, three backends.
//
//   st     (default) through the user's running SillyTavern. The request goes to SillyTavern's own endpoint
//          /api/backends/chat-completions/generate, exactly like generateRaw: SillyTavern adds the API key from its
//          secrets store on the server side. This script never sees the key. Model, URL and the Custom source's
//          "Include Body Parameters" come from SillyTavern's current settings (or a Connection Profile, --profile).
//   direct straight to an OpenAI-compatible endpoint; needs AVERETH_AB_API_BASE, AVERETH_AB_API_KEY, AVERETH_AB_MODEL
//          (and optionally AVERETH_AB_EXTRA_BODY) in the environment of the current terminal only.
//   mock   deterministic answers for the offline self-tests (tests/p0).
//
// A call returns {ok, status, content, reasoning, usage, ms, error}. Errors are scrubbed of anything that looks like a
// credential; nothing here ever writes the key anywhere.
import { scrub, flattenRefs, estimateTokens } from './util.mjs';

export const DEFAULT_ST_URL = 'http://127.0.0.1:8000';
export const ENV = {
    base: 'AVERETH_AB_API_BASE',
    key: 'AVERETH_AB_API_KEY',
    model: 'AVERETH_AB_MODEL',
    extra: 'AVERETH_AB_EXTRA_BODY',
    st: 'AVERETH_ST_URL',
};

const SIMPLE_KEY = /^[A-Za-z_][\w-]*$/;

function yamlScalar(v) {
    if (typeof v === 'string' && /^[A-Za-z0-9_.-]+$/.test(v)) return v;
    return JSON.stringify(v);
}

/**
 * Set or remove one top-level key in SillyTavern's "Include Body Parameters" text (YAML or JSON).
 * SillyTavern drops the whole text when it does not parse (a duplicated key is enough), so the key is replaced in
 * place, never appended twice. value === null removes it.
 * @returns {{text: string, applied: boolean, note?: string}}
 */
export function setIncludeBodyKey(text, key, value) {
    const src = String(text ?? '');
    if (!SIMPLE_KEY.test(key)) return { text: src, applied: false, note: `invalid key ${key}` };
    const trimmed = src.trim();
    if (!trimmed) return { text: value === null ? '' : `${key}: ${yamlScalar(value)}`, applied: true };
    if (trimmed.startsWith('{')) {
        try {
            const obj = JSON.parse(trimmed);
            if (value === null) delete obj[key]; else obj[key] = value;
            return { text: JSON.stringify(obj), applied: true };
        } catch {
            return { text: src, applied: false, note: 'Include Body Parameters are neither flat YAML nor JSON; override skipped' };
        }
    }
    const lines = src.split(/\r?\n/);
    const flat = lines.every((l) => !l.trim() || l.trim().startsWith('#') || /^[A-Za-z_][\w-]*\s*:\s*\S/.test(l));
    if (!flat) return { text: src, applied: false, note: 'Include Body Parameters are not flat YAML; override skipped' };
    const re = new RegExp(`^${key}\\s*:`);
    const idx = lines.findIndex((l) => re.test(l));
    if (idx >= 0) {
        if (value === null) lines.splice(idx, 1); else lines[idx] = `${key}: ${yamlScalar(value)}`;
    } else if (value !== null) {
        lines.push(`${key}: ${yamlScalar(value)}`);
    }
    return { text: lines.filter((l, i, a) => l.trim() || i < a.length - 1).join('\n'), applied: true };
}

/** Top-level key names of the Include Body Parameters (values are not shown: they could hold anything). */
export function includeBodyKeys(text) {
    const t = String(text ?? '').trim();
    if (!t) return [];
    if (t.startsWith('{')) {
        try { return Object.keys(JSON.parse(t)); } catch { return ['(unparsed)']; }
    }
    return t.split(/\r?\n/).map((l) => l.match(/^([A-Za-z_][\w-]*)\s*:/)?.[1]).filter(Boolean);
}

/** reasoning_effort as configured (string), if the Include Body Parameters are readable. */
export function configuredReasoning(text) {
    const t = String(text ?? '').trim();
    if (!t) return null;
    if (t.startsWith('{')) {
        try { const v = JSON.parse(t).reasoning_effort; return v === undefined ? null : String(v); } catch { return null; }
    }
    const m = t.match(/^reasoning_effort\s*:\s*["']?([^"'\s#]+)/m);
    return m ? m[1] : null;
}

function parseChoice(json) {
    const msg = json?.choices?.[0]?.message || {};
    const content = typeof msg.content === 'string' ? msg.content : Array.isArray(msg.content) ? msg.content.map((p) => p?.text || '').join('') : '';
    const reasoning = String(msg.reasoning_content ?? msg.reasoning ?? '');
    const u = json?.usage || null;
    const usage = u ? {
        prompt_tokens: u.prompt_tokens ?? null,
        completion_tokens: u.completion_tokens ?? null,
        total_tokens: u.total_tokens ?? null,
        reasoning_tokens: u.completion_tokens_details?.reasoning_tokens ?? u.reasoning_tokens ?? null,
    } : null;
    return { content, reasoning, usage, finish: json?.choices?.[0]?.finish_reason ?? null };
}

async function timedFetch(url, init, timeoutMs) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    const started = Date.now();
    try {
        const res = await fetch(url, { ...init, signal: ctl.signal });
        const text = await res.text();
        return { res, text, ms: Date.now() - started };
    } catch (err) {
        const ms = Date.now() - started;
        if (ctl.signal.aborted) return { error: `timeout after ${Math.round(timeoutMs / 1000)} s`, status: 'timeout', ms };
        return { error: String(err?.cause?.code || err?.message || err), status: 'network', ms };
    } finally {
        clearTimeout(timer);
    }
}

// ------------------------------------------------------------------------------------------------ SillyTavern
async function stProvider({ stUrl, profile, timeoutMs = 180000 } = {}) {
    const base = String(stUrl || process.env[ENV.st] || DEFAULT_ST_URL).replace(/\/+$/, '');
    let res;
    try {
        res = await fetch(`${base}/csrf-token`);
    } catch (err) {
        throw new Error(`SillyTavern ist unter ${base} nicht erreichbar (${err?.cause?.code || err?.message}). Starte SillyTavern (Start.bat) und lass das Fenster offen; läuft es unter einer anderen Adresse, gib sie mit --st-url an.`);
    }
    if (res.status === 401) throw new Error('SillyTavern verlangt Benutzername und Passwort (basicAuthMode). Das Werkzeug unterstützt das nicht: nutze --backend direct (docs/P0_SPIKES.md).');
    if (!res.ok) throw new Error(`SillyTavern antwortet auf /csrf-token mit HTTP ${res.status}.`);
    const token = (await res.json())?.token;
    const cookie = (typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []).map((c) => c.split(';')[0]).join('; ');
    const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': String(token || ''), ...(cookie ? { Cookie: cookie } : {}) };

    const sres = await fetch(`${base}/api/settings/get`, { method: 'POST', headers, body: '{}' });
    if (sres.status === 401 || sres.status === 403) throw new Error('SillyTavern verlangt eine Anmeldung (Benutzerkonten aktiv). Das Werkzeug unterstützt das nicht: nutze --backend direct (docs/P0_SPIKES.md).');
    if (!sres.ok) throw new Error(`SillyTavern antwortet auf /api/settings/get mit HTTP ${sres.status}.`);
    let settings;
    try {
        settings = JSON.parse((await sres.json()).settings);
    } catch {
        throw new Error('Die SillyTavern-Einstellungen ließen sich nicht lesen (settings.json).');
    }
    const oai = settings?.oai_settings || {};
    if (oai.chat_completion_source !== 'custom') {
        throw new Error(`In SillyTavern ist als Chat-Completion-Quelle "${oai.chat_completion_source || '?'}" aktiv. Die P0-Werkzeuge nutzen die Quelle "Custom (OpenAI-compatible)", wie in den Läufen. Wähle sie in SillyTavern (API Connections) und speichere, oder nutze --backend direct.`);
    }
    let url = oai.custom_url;
    let model = oai.custom_model;
    let secretId;
    let profileName = null;
    if (profile) {
        const list = settings?.extension_settings?.connectionManager?.profiles || [];
        const p = list.find((x) => String(x?.name || '').toLowerCase() === String(profile).toLowerCase());
        if (!p) throw new Error(`Kein Connection Profile "${profile}" gefunden. Vorhanden: ${list.map((x) => x.name).join(', ') || 'keine'}.`);
        if (p.api && p.api !== 'custom') throw new Error(`Das Profil "${p.name}" nutzt die Quelle "${p.api}", nicht "custom".`);
        url = p['api-url'] || url;
        model = p.model || model;
        secretId = p['secret-id'] || undefined;
        profileName = p.name;
    }
    if (!url || !model) throw new Error('In SillyTavern fehlt für die Custom-Quelle die Endpoint-URL oder der Modellname.');
    const include = String(oai.custom_include_body || '');
    return {
        backend: 'st',
        model,
        describe: () => ({ backend: 'SillyTavern', source: 'custom', model, profile: profileName, include_body_keys: includeBodyKeys(include), reasoning_effort: configuredReasoning(include) }),
        configuredReasoning: configuredReasoning(include),
        async chat(req) {
            let includeBody = include;
            let override = null;
            if (req.reasoning !== undefined) {
                const r = setIncludeBodyKey(include, 'reasoning_effort', req.reasoning);
                includeBody = r.text;
                override = r.applied ? { reasoning_effort: req.reasoning } : { skipped: r.note };
            }
            const body = {
                chat_completion_source: 'custom',
                custom_url: url,
                model,
                messages: req.messages,
                max_tokens: req.maxTokens ?? 800,
                temperature: req.temperature ?? 0.2,
                ...(req.topP !== undefined ? { top_p: req.topP } : {}),
                stream: false,
                custom_include_body: includeBody,
                custom_exclude_body: String(oai.custom_exclude_body || ''),
                custom_include_headers: String(oai.custom_include_headers || ''),
                custom_prompt_post_processing: oai.custom_prompt_post_processing || '',
                ...(secretId ? { secret_id: secretId } : {}),
                ...(req.jsonSchema ? { json_schema: { name: req.jsonSchema.name, value: req.jsonSchema.schema, strict: true } } : {}),
            };
            const r = await timedFetch(`${base}/api/backends/chat-completions/generate`, { method: 'POST', headers, body: JSON.stringify(body) }, req.timeoutMs ?? timeoutMs);
            if (r.error) return { ok: false, status: r.status, error: r.error, ms: r.ms, override };
            let json = null;
            try { json = JSON.parse(r.text); } catch { /* not JSON */ }
            if (!r.res.ok || !json) return { ok: false, status: 'http_error', error: scrub(`HTTP ${r.res.status}: ${r.text.slice(0, 300)}`), ms: r.ms, override };
            if (json.error) return { ok: false, status: 'provider_error', error: scrub(`${json.error.message || 'provider error'} (Details im SillyTavern-Konsolenfenster)`), ms: r.ms, override };
            if (!json.choices) return { ok: false, status: 'provider_error', error: 'answer without choices', ms: r.ms, override };
            return { ok: true, status: 'ok', ...parseChoice(json), ms: r.ms, error: null, override };
        },
    };
}

// ------------------------------------------------------------------------------------------------ direct
function directProvider({ timeoutMs = 180000 } = {}) {
    const base = process.env[ENV.base];
    const key = process.env[ENV.key];
    const model = process.env[ENV.model];
    const missing = [[ENV.base, base], [ENV.key, key], [ENV.model, model]].filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) throw new Error(`Für --backend direct fehlen in dieser PowerShell: ${missing.join(', ')} (docs/P0_SPIKES.md).`);
    let extra = {};
    if (process.env[ENV.extra]) {
        try {
            extra = JSON.parse(process.env[ENV.extra]);
            if (!extra || typeof extra !== 'object' || Array.isArray(extra)) throw new Error('not an object');
        } catch (err) {
            throw new Error(`${ENV.extra} ist kein JSON-Objekt (${err.message}). Beispiel: {"reasoning_effort":"low"}`);
        }
    }
    const url = new URL('chat/completions', base.endsWith('/') ? base : `${base}/`);
    return {
        backend: 'direct',
        model,
        describe: () => ({ backend: 'direct', model, extra_body_keys: Object.keys(extra), reasoning_effort: extra.reasoning_effort ?? null }),
        configuredReasoning: extra.reasoning_effort ?? null,
        async chat(req) {
            const body = { model, messages: req.messages, max_tokens: req.maxTokens ?? 800, temperature: req.temperature ?? 0.2, ...(req.topP !== undefined ? { top_p: req.topP } : {}), stream: false, ...extra };
            let override = null;
            if (req.reasoning !== undefined) {
                if (req.reasoning === null) delete body.reasoning_effort; else body.reasoning_effort = req.reasoning;
                override = { reasoning_effort: req.reasoning };
            }
            if (req.jsonSchema) body.response_format = { type: 'json_schema', json_schema: { name: req.jsonSchema.name, strict: true, schema: flattenRefs(req.jsonSchema.schema) } };
            const r = await timedFetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify(body) }, req.timeoutMs ?? timeoutMs);
            if (r.error) return { ok: false, status: r.status, error: scrub(r.error, [key]), ms: r.ms, override };
            let json = null;
            try { json = JSON.parse(r.text); } catch { /* not JSON */ }
            if (!r.res.ok || !json?.choices) return { ok: false, status: r.res.ok ? 'provider_error' : 'http_error', error: scrub(`HTTP ${r.res.status}: ${r.text.slice(0, 300)}`, [key]), ms: r.ms, override };
            return { ok: true, status: 'ok', ...parseChoice(json), ms: r.ms, error: null, override };
        },
        secrets: [key],
    };
}

// ------------------------------------------------------------------------------------------------ mock
function mockProvider(respond) {
    if (typeof respond !== 'function') throw new Error('mock backend needs a responder');
    return {
        backend: 'mock',
        model: 'mock',
        describe: () => ({ backend: 'mock', model: 'mock' }),
        configuredReasoning: null,
        async chat(req) {
            const out = await respond(req);
            if (out && out.error) return { ok: false, status: out.status || 'http_error', error: out.error, ms: out.ms ?? 0 };
            const content = String(out?.content ?? '');
            const prompt = req.messages.map((m) => m.content).join('\n');
            return {
                ok: true, status: 'ok', content, reasoning: '', finish: 'stop', ms: out?.ms ?? 0, error: null,
                usage: { prompt_tokens: estimateTokens(prompt), completion_tokens: estimateTokens(content), total_tokens: estimateTokens(prompt) + estimateTokens(content), reasoning_tokens: null },
            };
        },
    };
}

/**
 * Open the backend a spike uses: 'st' (default), 'direct' or 'mock'.
 * @param {{backend?: string, stUrl?: string, profile?: string, mock?: Function, timeoutMs?: number}} opts
 */
export async function openProvider(opts = {}) {
    const backend = opts.backend || 'st';
    if (backend === 'st') return stProvider(opts);
    if (backend === 'direct') return directProvider(opts);
    if (backend === 'mock') return mockProvider(opts.mock);
    throw new Error(`unbekanntes --backend "${backend}" (st | direct | mock)`);
}
