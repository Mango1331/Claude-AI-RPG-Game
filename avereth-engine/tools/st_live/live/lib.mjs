// Shared helpers of the live runner (docs/LIVE_RUNNER.md): the write guard, file fingerprints, small text tools.
//
// The write guard is the runner's one way to write a file. Every write names the roots it may land in (the isolated
// SillyTavern instance, the run folder); a path outside them throws before anything is written. The player's own
// SillyTavern installation and profile are never among them: the importer only reads (import_profile.mjs).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const LIVE = path.dirname(fileURLToPath(import.meta.url));

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Is p inside root (or root itself)? Both resolved; on Windows case-insensitively. */
export function isInside(root, p) {
    const norm = (x) => (process.platform === 'win32' ? path.resolve(x).toLowerCase() : path.resolve(x));
    const rel = path.relative(norm(root), norm(p));
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** A writer that may only write inside its roots. */
export class Guard {
    constructor(roots, { forbidden = [] } = {}) {
        this.roots = roots.map((r) => path.resolve(r));
        this.forbidden = forbidden.filter(Boolean).map((r) => path.resolve(r));
        for (const f of this.forbidden) {
            for (const r of this.roots) if (isInside(f, r) || isInside(r, f)) throw new Error(`write root ${r} overlaps a protected folder (${f})`);
        }
    }
    check(p) {
        const abs = path.resolve(p);
        if (this.forbidden.some((f) => isInside(f, abs))) throw new Error(`refused to write into a protected folder: ${abs}`);
        if (!this.roots.some((r) => isInside(r, abs))) throw new Error(`refused to write outside the runner's folders: ${abs}`);
        return abs;
    }
    mkdir(p) { fs.mkdirSync(this.check(p), { recursive: true }); return p; }
    write(p, data) { const abs = this.check(p); fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, data); return abs; }
    copy(from, to) { const abs = this.check(to); fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.copyFileSync(from, abs); return abs; }
    copyDir(from, to) { const abs = this.check(to); fs.cpSync(from, abs, { recursive: true }); return abs; }
    remove(p) { fs.rmSync(this.check(p), { recursive: true, force: true }); }
}

/** One read of a file kept with its fingerprint (the importer's list of what it read, checked again at the end). */
export class Reader {
    constructor() { this.read = []; }
    file(p, enc = null) {
        const st = fs.statSync(p);
        const buf = fs.readFileSync(p);
        this.read.push({ file: path.resolve(p), sha256: sha256(buf), size: st.size, mtimeMs: st.mtimeMs });
        return enc ? buf.toString(enc) : buf;
    }
}

/** Files read before: the ones whose content or time changed since (none for an untouched profile). */
export function changedSince(read) {
    const out = [];
    for (const r of read) {
        if (!fs.existsSync(r.file)) { out.push({ file: r.file, why: 'gone' }); continue; }
        const st = fs.statSync(r.file);
        const h = sha256(fs.readFileSync(r.file));
        if (h !== r.sha256) out.push({ file: r.file, why: 'content changed' });
        else if (st.mtimeMs !== r.mtimeMs) out.push({ file: r.file, why: 'time changed' });
    }
    return out;
}

/** Size and time of every file below dir (no content read): the before/after picture of a whole profile. */
export function treeStat(dir, { limit = 200000, skip = [] } = {}) {
    const out = new Map();
    const walk = (d) => {
        let entries = [];
        try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
            if (out.size >= limit) return;
            const p = path.join(d, e.name);
            if (e.isDirectory()) { if (!skip.includes(e.name)) walk(p); }
            else if (e.isFile()) { try { const st = fs.statSync(p); out.set(p, `${st.size}:${st.mtimeMs}`); } catch { /* vanished */ } }
        }
    };
    if (fs.existsSync(dir)) walk(dir);
    return out;
}

/** What differs between two treeStat pictures. */
export function treeDiff(before, after) {
    const added = [];
    const removed = [];
    const changed = [];
    for (const [p, v] of after) if (!before.has(p)) added.push(p); else if (before.get(p) !== v) changed.push(p);
    for (const p of before.keys()) if (!after.has(p)) removed.push(p);
    return { added, removed, changed, same: !added.length && !removed.length && !changed.length };
}

/** The value of a top-level key of a small YAML file (SillyTavern's config.yaml), or null. No YAML parser needed. */
export function yamlTop(text, key) {
    const m = new RegExp(`^${key}:\\s*(.*?)\\s*(#.*)?$`, 'm').exec(String(text));
    if (!m) return null;
    return m[1].replace(/^["']|["']$/g, '') || null;
}

export const median = (xs) => {
    const a = xs.filter(Number.isFinite).sort((x, y) => x - y);
    if (!a.length) return null;
    return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
};
export const quantile = (xs, q) => {
    const a = xs.filter(Number.isFinite).sort((x, y) => x - y);
    return a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : null;
};
export const clip = (s, n) => { const t = String(s ?? ''); return t.length > n ? `${t.slice(0, n)}…` : t; };
export const stamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z').replace('T', '-');

/** A fixed seed's pseudo-random choice (player persona, nothing of the game). */
export function pick(list, seed) {
    if (!list?.length) return null;
    let x = (Number(seed) >>> 0) || 1;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return list[(x >>> 0) % list.length];
}
