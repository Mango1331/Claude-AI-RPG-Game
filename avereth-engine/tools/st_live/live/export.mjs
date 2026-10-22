// The run folder's files (docs/LIVE_RUNNER.md §8) and the scan that keeps keys out of them. Everything is written
// through the guard (lib.mjs) into the run folder.
import fs from 'node:fs';
import path from 'node:path';

/** SillyTavern's chat file: its first line is the chat's metadata, every other line one message. */
export function readChatJsonl(text) {
    const lines = String(text).split(/\r?\n/).filter((l) => l.trim());
    const rows = lines.map((l) => JSON.parse(l));
    const header = rows[0] && !('mes' in rows[0]) ? rows.shift() : null;
    return { header, messages: rows };
}

/** The engine's event log as its "Export event log" button writes it (index.js exportLog). */
export function eventsLog(messages) {
    return messages.map((m, i) => ({ i, user: !!m.is_user, build: m.extra?.avereth?.build, events: m.extra?.avereth?.events || [] })).filter((x) => x.events.length);
}

export const jsonl = (rows) => rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '');

// what a credential looks like when it is not one of the known values (flagged and blanked as well)
export const CREDENTIAL_PATTERNS = [
    { kind: 'bearer', re: /\bBearer\s+(?!<)[A-Za-z0-9._~+/=-]{16,}/g },
    { kind: 'api_key_field', re: /"(?:api_key[a-z_]*|apiKey|proxy_password)"\s*:\s*"(?!")[^"]{8,}"/g },
    { kind: 'sk_key', re: /\bsk-[A-Za-z0-9_-]{20,}/g },
];
const TEXT_EXT = new Set(['.json', '.jsonl', '.md', '.log', '.txt', '.yaml', '.yml', '.html']);

/**
 * Scan every text file below dir for the given secret values and for credential patterns; blank what is found
 * (written through the guard). Returns {files, hits: [{file, what, count}]}: an empty hits list is a clean folder.
 */
export function secretScan(dir, secrets, guard, { redact = true } = {}) {
    const values = secrets.filter((s) => typeof s === 'string' && s.length >= 6);
    const hits = [];
    let files = 0;
    const walk = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) { walk(p); continue; }
            if (!TEXT_EXT.has(path.extname(e.name).toLowerCase())) continue;
            files += 1;
            let text = fs.readFileSync(p, 'utf8');
            let changed = false;
            for (const [k, v] of values.entries()) {
                const n = text.split(v).length - 1;
                if (n) { hits.push({ file: path.relative(dir, p), what: `secret #${k + 1}`, count: n }); if (redact) { text = text.split(v).join('<redacted>'); changed = true; } }
            }
            for (const { kind, re } of CREDENTIAL_PATTERNS) {
                const found = text.match(re);
                if (found?.length) { hits.push({ file: path.relative(dir, p), what: kind, count: found.length }); if (redact) { text = text.replace(re, `<redacted ${kind}>`); changed = true; } }
            }
            if (changed) guard.write(p, text);
        }
    };
    if (fs.existsSync(dir)) walk(dir);
    return { files, hits };
}
