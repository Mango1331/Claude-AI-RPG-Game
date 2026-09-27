// Runtime V4, P0 spikes: shared helpers (arguments, JSON extraction, statistics, output files, secret scrubbing).
// Spike code, not product code: nothing in src/ imports this.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tolerantJson } from '../../../src/delta.js';
import { validateSchema } from '../../../src/validate.js';

export { validateSchema };

/** avereth-engine/ (the folder with package.json), wherever the tool is started from. */
export const ENGINE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const OUT_ROOT = path.join(ENGINE_ROOT, 'p0_out');

/** --key value / --flag / --key=value. Unknown keys are kept; the tool decides. */
export function parseArgs(argv) {
    const out = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) { out._.push(a); continue; }
        const eq = a.indexOf('=');
        if (eq > 0) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
        const key = a.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) { out[key] = next; i += 1; } else out[key] = true;
    }
    return out;
}

export function intArg(v, fallback) {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Remove anything that looks like a credential from text that may be printed or saved. */
export function scrub(text, secrets = []) {
    let s = String(text ?? '');
    for (const sec of secrets) if (sec && sec.length >= 6) s = s.split(sec).join('***');
    return s
        .replace(/(authorization["']?\s*[:=]\s*["']?)(bearer\s+)?[^\s"',}]+/gi, '$1***')
        .replace(/bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer ***')
        .replace(/\b(sk|pk|rk|key|api[_-]?key)[-_][A-Za-z0-9._-]{12,}/gi, '***')
        .replace(/([?&](?:api[_-]?key|key|token)=)[^&\s]+/gi, '$1***');
}

/** Inline #/$defs references the way SillyTavern's flattenSchema does before sending a schema to a provider. */
export function flattenRefs(schema) {
    if (!schema || typeof schema !== 'object') return schema;
    const defs = schema.$defs || {};
    const walk = (node, seen) => {
        if (Array.isArray(node)) return node.map((x) => walk(x, seen));
        if (!node || typeof node !== 'object') return node;
        if (typeof node.$ref === 'string' && node.$ref.startsWith('#/$defs/')) {
            const name = node.$ref.slice('#/$defs/'.length);
            if (seen.includes(name) || !defs[name]) return {};
            return walk(defs[name], [...seen, name]);
        }
        const out = {};
        for (const [k, v] of Object.entries(node)) if (k !== '$defs') out[k] = walk(v, seen);
        return out;
    };
    return walk(schema, []);
}

/** The first JSON object in a model answer: without reasoning tags and code fences, tolerant to small slips. */
export function extractJsonObject(text) {
    let s = String(text ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) s = fenced[1].trim();
    const direct = tolerantJson(s);
    if (direct.value) return { value: direct.value, error: null };
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a >= 0 && b > a) {
        const inner = tolerantJson(s.slice(a, b + 1));
        if (inner.value) return { value: inner.value, error: null };
    }
    return { value: null, error: direct.error || 'no JSON object in the answer' };
}

export function percentile(values, p) {
    const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
    if (!v.length) return null;
    const idx = Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1));
    return v[idx];
}

export const sum = (values) => values.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
export const mean = (values) => (values.length ? sum(values) / values.length : null);
export const round = (x, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
export const pct = (a, b) => (b ? round((100 * a) / b, 1) : null);
export const estimateTokens = (text) => Math.ceil(String(text ?? '').length / 4);

/** Run async tasks with at most n at a time; results keep their order. */
export async function pool(tasks, n) {
    const out = new Array(tasks.length);
    let i = 0;
    await Promise.all(Array.from({ length: Math.max(1, Math.min(n, tasks.length || 1)) }, async () => {
        while (i < tasks.length) {
            const k = i++;
            out[k] = await tasks[k]();
        }
    }));
    return out;
}

export function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

export function writeJson(file, value) {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`, 'utf8');
}

export function writeText(file, text) {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, text, 'utf8');
}

export function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function readJsonl(file) {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).map((l, i) => {
        try {
            return JSON.parse(l);
        } catch (err) {
            throw new Error(`${path.basename(file)} line ${i + 1}: ${err.message}`);
        }
    });
}

/** What S0 decided (structured output mode, reasoning override); later spikes use it unless flags say otherwise. */
export function readDecision() {
    const file = path.join(OUT_ROOT, 's0', 'decision.json');
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

export function nowIso() {
    return new Date().toISOString();
}

/** One progress line on stderr (keeps stdout for the summary). */
export function progress(text) {
    process.stderr.write(`${text}\n`);
}

/** Markdown table from rows of plain values. */
export function mdTable(header, rows) {
    const esc = (v) => String(v ?? '–').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    return [`| ${header.map(esc).join(' | ')} |`, `|${header.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`)].join('\n');
}

/** Guard for anything written to disk: a run must never persist a credential. Throws when it finds one. */
export function assertNoSecrets(text, secrets = []) {
    const s = String(text);
    for (const sec of secrets) if (sec && sec.length >= 6 && s.includes(sec)) throw new Error('refusing to write output: it contains the API key');
    if (/authorization["']?\s*:\s*["']?bearer\s+[A-Za-z0-9]/i.test(s)) throw new Error('refusing to write output: it contains an Authorization header');
}
