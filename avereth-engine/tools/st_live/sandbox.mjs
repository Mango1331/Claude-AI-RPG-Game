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
export function sandboxRoot(requested = process.env.AVERETH_ST_SANDBOX || defaultRoot(), repo = null) {
    if (!path.isAbsolute(requested)) throw new SandboxError('preflight', `AVERETH_ST_SANDBOX must be an absolute path (got "${requested}")`);
    const root = real(requested);
    const home = real(os.homedir());
    const forbidden = [path.parse(root).root, home, ...(repo ? [real(repo)] : [])];
    if (forbidden.includes(root) || (repo && real(repo).startsWith(root + path.sep)) || home.startsWith(root + path.sep))
        throw new SandboxError('preflight', `refusing ${root}: not a directory a sandbox may be in (file system root, home, or above this repository)`);
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
    if (!marker || path.basename(st) !== ST_SUBDIR)
        throw new SandboxError('preflight', `refusing AVERETH_ST_DIR=${st}: not the SillyTavern of an Avereth sandbox (no ${MARKER} in ${root}). The ST smokes write into data/default-user and delete test chats; they never run in a personal SillyTavern. Use npm run smoke:st:isolated`);
    return { st, root, marker };
}

/** May this root be removed: ours, not in use (lock), not the home or the file system root. */
export function removableRoot(root, repo = null) {
    const r = real(root);
    if (!readMarker(r)) throw new SandboxError('clean', `refusing to remove ${r}: no ${MARKER} (only a marked sandbox is ever removed)`);
    sandboxRoot(r, repo);
    const lock = lockHolder(r);
    if (lock) throw new SandboxError('clean', `refusing to remove ${r}: a smoke run holds it (pid ${lock})`);
    return r;
}

/** The live pid holding the root's lock, or null. */
export function lockHolder(root) {
    try {
        const pid = Number(fs.readFileSync(path.join(root, '.lock'), 'utf8'));
        if (!Number.isInteger(pid) || pid <= 0) return null;
        try { process.kill(pid, 0); } catch (e) { return e.code === 'EPERM' ? pid : null; }
        return pid;
    } catch { return null; }
}

export class SandboxError extends Error {
    constructor(stage, message) { super(message); this.stage = stage; }
}
