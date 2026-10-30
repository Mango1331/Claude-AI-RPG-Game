// Architecture patch A (.127), A1: build the offline processing corpus from extracted original batch runs (main:
// testrun_10b/ARCHIV_BATCHES.md, testrun_10b/verify_batch_archive.py --extract). One gzip file per run: the chat as the
// engine reads it (text, roles, the Avereth record; no rendered HTML, swipes or other host fields) and the model answers
// of every recorded engine call, taken from the runner's completion log. A record's call (purpose + provider token
// counts) is matched to the log in order, so a repeated identical player text never decides the assignment.
//
//   node tools/replay/build_corpus.mjs <out-dir> <label>=<run dir>[:<last message index>] ...
//
// The archives stay the evidence; this corpus is test data derived from them and is rebuilt, never edited by hand.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const ROLE = (purpose) => purpose.replace(/_(?:repair|recovery)$/, '').replace(/^interpret$/, 'plan');
const KEEP = ['plan', 'board', 'forge', 'extraction'];

function readJsonl(file) {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

/** The record's engine calls in the order they were made (player record: plan, board, forge; reply: extraction). */
function recordCalls(r) {
    return KEEP.flatMap((k) => (Array.isArray(r?.[k]?.llm) ? r[k].llm : []));
}

function contentOf(row) {
    const m = row.response?.choices?.[0]?.message;
    if (!m) return null;
    return typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.map((x) => x?.text || '').join('') : '';
}

export function buildRun(dir, { last = null } = {}) {
    const raw = readJsonl(path.join(dir, 'chat.jsonl')).filter((m) => m && m.mes !== undefined);
    const chat = (last === null ? raw : raw.slice(0, last + 1)).map((m) => {
        const r = m.extra?.avereth;
        const record = r ? Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'hud' && k !== 'panel')) : undefined;
        return { mes: m.mes, is_user: !!m.is_user, is_system: !!m.is_system, ...(m.swipe_id !== undefined ? { swipe_id: m.swipe_id } : {}), extra: record ? { avereth: record } : {} };
    });
    const log = readJsonl(path.join(dir, 'chat-completions.jsonl'));
    const byRole = {};
    for (const row of log) (byRole[row.role] ||= []).push(row);
    const pointer = {};
    const answers = {};
    const stats = { calls: 0, matched: 0, errors: 0, unmatched: 0 };
    chat.forEach((m, i) => {
        const calls = recordCalls(m.extra.avereth);
        if (!calls.length) return;
        answers[i] = calls.map((c) => {
            stats.calls += 1;
            const role = ROLE(c.purpose);
            if (c.error) {
                stats.errors += 1;
                return { purpose: c.purpose, error: { kind: c.error_kind || 'transport', status: c.status ?? null, retryable: c.provider_retryable ?? null } };
            }
            const rows = byRole[role] || [];
            const from = pointer[role] || 0;
            const at = rows.findIndex((row, k) => k >= from && row.response?.usage?.prompt_tokens === c.prompt && row.response?.usage?.completion_tokens === c.completion);
            if (at < 0) { stats.unmatched += 1; return { purpose: c.purpose, missing: true }; }
            pointer[role] = at + 1;
            stats.matched += 1;
            return { purpose: c.purpose, content: contentOf(rows[at]) };
        });
    });
    return { chat, answers, stats };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
    const [out, ...specs] = process.argv.slice(2);
    if (!out || !specs.length) {
        console.error('usage: build_corpus.mjs <out-dir> <label>=<run dir>[:<last index>] ...');
        process.exit(2);
    }
    fs.mkdirSync(out, { recursive: true });
    for (const spec of specs) {
        const [label, rest] = spec.split('=');
        const m = rest.match(/^(.*?)(?::(\d+))?$/);
        const dir = m[1];
        const last = m[2] === undefined ? null : Number(m[2]);
        const run = buildRun(dir, { last });
        const source = { label, run: path.basename(path.resolve(dir)), last, chat_sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, 'chat.jsonl'))).digest('hex') };
        const body = JSON.stringify({ format: 'avereth-replay-corpus-1', source, chat: run.chat, answers: run.answers });
        fs.writeFileSync(path.join(out, `${label}.json.gz`), zlib.gzipSync(body, { level: 9 }));
        console.log(label, `${run.chat.length} messages`, JSON.stringify(run.stats), `${(body.length / 1e6).toFixed(1)} MB raw`);
    }
}
