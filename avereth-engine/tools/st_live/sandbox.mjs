// The isolated SillyTavern test installation of the ST smokes (docs/ST_SMOKE_ISOLATED.md). The smoke scripts write into
// data/default-user (card, preset, lorebook, extension, settings, a dummy secrets file) and delete their test chats, so
// they run only in a directory this module marked as an Avereth sandbox: never in a personal SillyTavern.
//
// A sandbox is a root directory with a marker file (MARKER) and the SillyTavern checkout below it (<root>/SillyTavern).
// Nothing here deletes anything but a marked root, and only after the checks of removableRoot.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** The SillyTavern the ST smokes were run and accepted with (tag and its commit; ST 1.19.0 asks Node >= 20). */
export const ST_VERSION = '1.19.0';
export const ST_COMMIT = '7e8663cd9c184a550b37238218bdd32c6efc68e9';
export const ST_REPO = 'https://github.com/SillyTavern/SillyTavern.git';
export const ST_NODE_MAJOR = 20;
/** The ports run_c.mjs uses: SillyTavern and the mock provider in front of it. */
export const PORTS = { st: 8123, mock: 5001 };
/** Playwright installed into the sandbox when none is found (an old, fixed version). */
export const PLAYWRIGHT_VERSION = '1.49.1';
export const MARKER = '.avereth-st-sandbox.json';
export const ST_SUBDIR = 'SillyTavern';
const KIND = 'avereth-st-sandbox';

export const defaultRoot = () => path.join(os.tmpdir(), 'avereth-st-sandbox');
// the repository this module belongs to: a sandbox is never inside it, nor above it (GPT review 14.11.2026 S3)
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };

/** The marker of a root, or null when there is none or it is not ours. */
export function readMarker(root) {
    try {
        const m = JSON.parse(fs.readFileSync(path.join(root, MARKER), 'utf8'));
        return m && m.kind === KIND && m.st_dir === ST_SUBDIR ? m : null;
    } catch { return null; }
}

/**
 * Where a sandbox may be: a new or empty directory, or one that already carries our marker; never the file system
 * root, the home directory, a directory above the home or this repository, nor an existing SillyTavern.
 * @returns {string} the resolved root
 */
export function sandboxRoot(requested = process.env.AVERETH_ST_SANDBOX || defaultRoot(), repo = REPO) {
    if (!path.isAbsolute(requested)) throw new SandboxError('preflight', `AVERETH_ST_SANDBOX must be an absolute path (got "${requested}")`);
    const root = real(requested);
    const home = real(os.homedir());
    const forbidden = [path.parse(root).root, home, ...(repo ? [real(repo)] : [])];
    if (forbidden.includes(root) || (repo && real(repo).startsWith(root + path.sep)) || home.startsWith(root + path.sep))
        throw new SandboxError('preflight', `refusing ${root}: not a directory a sandbox may be in (file system root, home, or above this repository)`);
    if (repo && root.startsWith(real(repo) + path.sep)) throw new SandboxError('preflight', `refusing ${root}: inside the repository (a sandbox is always outside it)`);
    if (fs.existsSync(root)) {
        if (!fs.statSync(root).isDirectory()) throw new SandboxError('preflight', `refusing ${root}: it is a file`);
        const entries = fs.readdirSync(root);
        if (entries.length && !readMarker(root))
            throw new SandboxError('preflight', `refusing ${root}: it exists, is not empty and carries no ${MARKER} (a personal or foreign directory is never used)`);
        if (fs.existsSync(path.join(root, 'data', 'default-user')) || fs.existsSync(path.join(root, 'server.js')))
            throw new SandboxError('preflight', `refusing ${root}: it is a SillyTavern installation itself, not a sandbox root`);
    }
    return root;
}

/** Mark a new root as ours (before anything is installed into it). */
export function markRoot(root) {
    fs.mkdirSync(root, { recursive: true });
    if (fs.readdirSync(root).length && !readMarker(root)) throw new SandboxError('preflight', `refusing to mark ${root}: not empty`);
    if (!readMarker(root)) fs.writeFileSync(path.join(root, MARKER), JSON.stringify({ kind: KIND, st_dir: ST_SUBDIR, st_version: ST_VERSION, st_commit: ST_COMMIT, created: new Date().toISOString() }, null, 1));
    return readMarker(root);
}

/**
 * The guard of every ST smoke script: AVERETH_ST_DIR must be the SillyTavern checkout of a marked sandbox
 * (<root>/SillyTavern with <root>/MARKER). Throws before the script touches any file.
 */
export function assertSandbox(stDir) {
    if (!stDir) throw new SandboxError('preflight', 'set AVERETH_ST_DIR to the SillyTavern of an Avereth sandbox (npm run smoke:st:isolated makes one)');
    const st = real(stDir);
    const root = path.dirname(st);
    const marker = readMarker(root);
    if (!marker || path.basename(st) !== ST_SUBDIR || real(path.join(root, ST_SUBDIR)) !== st)
        throw new SandboxError('preflight', `refusing AVERETH_ST_DIR=${st}: not the SillyTavern of an Avereth sandbox (no ${MARKER} in ${root}). The ST smokes write into data/default-user and delete test chats; they never run in a personal SillyTavern. Use npm run smoke:st:isolated`);
    assertContained(root);
    return { st, root, marker };
}

// what the setup and the smokes write: none of it may lead out of the sandbox (a symlink to another directory)
const WRITTEN = ['', ST_SUBDIR, `${ST_SUBDIR}/data`, `${ST_SUBDIR}/data/default-user`, ...['characters', 'chats', 'worlds', 'OpenAI Settings', 'extensions', 'settings.json', 'secrets.json'].map((x) => `${ST_SUBDIR}/data/default-user/${x}`), `${ST_SUBDIR}/node_modules`, 'tools', 'out'];
const inside = (root, p) => p === root || p.startsWith(root + path.sep);
/**
 * GPT review 14.11.2026 S2: every path the setup or a smoke writes in the sandbox, as far as it exists, resolves inside
 * the sandbox's real root; a symlink out of it stops everything before a write.
 */
export function assertContained(root) {
    const r = real(root);
    for (const rel of WRITTEN) {
        const p = path.join(r, rel);
        if (!fs.existsSync(p) && !isLink(p)) continue;
        if (isLink(p) || !inside(r, real(p))) throw new SandboxError('preflight', `refusing ${p}: it leads out of the sandbox ${r} (a symlink); nothing was written`);
    }
    return r;
}
const isLink = (p) => { try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; } };

/** GPT review 14.11.2026 S3: where a smoke writes its results – inside the sandbox only (its nearest existing ancestor). */
export function outputDir(stDir, requested, fallback) {
    const { root } = assertSandbox(stDir);
    const want = path.resolve(requested || fallback);
    let probe = want;
    while (!fs.existsSync(probe) && path.dirname(probe) !== probe) probe = path.dirname(probe);
    const resolved = path.join(real(probe), path.relative(probe, want));
    if (!inside(real(root), resolved)) throw new SandboxError('preflight', `refusing AVERETH_ST_OUT=${want}: results are written only inside the sandbox ${root}`);
    if (fs.existsSync(want) && isLink(want)) throw new SandboxError('preflight', `refusing AVERETH_ST_OUT=${want}: a symlink`);
    return resolved;
}

/**
 * GPT review 14.11.2026 S1: take the sandbox's lock atomically (exclusive create); a lock of a live process stops this
 * run, a stale one (its pid gone) is replaced once, again exclusively. Returns the release function.
 */
export function acquireLock(root) {
    const file = path.join(root, '.lock');
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const fd = fs.openSync(file, 'wx');
            fs.writeSync(fd, String(process.pid));
            fs.closeSync(fd);
            return () => { try { if (fs.readFileSync(file, 'utf8') === String(process.pid)) fs.rmSync(file); } catch { /* gone */ } };
        } catch (e) {
            if (e.code !== 'EEXIST') throw e;
            const holder = lockHolder(root);
            if (holder) throw new SandboxError('preflight', `another smoke run (pid ${holder}) holds ${root}`);
            // a stale lock: remove it only if it is still the same stale content, then try once more exclusively
            let stale = null;
            try { stale = fs.readFileSync(file, 'utf8'); } catch { continue; }
            if (attempt === 0 && !lockHolder(root) && fs.readFileSync(file, 'utf8') === stale) fs.rmSync(file, { force: true });
        }
    }
    throw new SandboxError('preflight', `the lock of ${root} could not be taken`);
}

/** May this root be removed: ours, not in use (lock), not the home or the file system root. */
export function removableRoot(root, repo = undefined) {
    const r = real(root);
    if (!readMarker(r)) throw new SandboxError('clean', `refusing to remove ${r}: no ${MARKER} (only a marked sandbox is ever removed)`);
    sandboxRoot(r, repo);
    assertContained(r);
    const lock = lockHolder(r);
    if (lock) throw new SandboxError('clean', `refusing to remove ${r}: a smoke run holds it (pid ${lock})`);
    return r;
}

/** The live pid holding the root's lock, or null. */
export function lockHolder(root) {
    try {
        const file = path.join(root, '.lock');
        const text = fs.readFileSync(file, 'utf8');
        // a lock just created and not yet written is held (its owner writes the pid next)
        if (!text && Date.now() - fs.statSync(file).mtimeMs < 5000) return -1;
        const pid = Number(text);
        if (!Number.isInteger(pid) || pid <= 0) return null;
        try { process.kill(pid, 0); } catch (e) { return e.code === 'EPERM' ? pid : null; }
        return pid;
    } catch { return null; }
}

export class SandboxError extends Error {
    constructor(stage, message) { super(message); this.stage = stage; }
}
