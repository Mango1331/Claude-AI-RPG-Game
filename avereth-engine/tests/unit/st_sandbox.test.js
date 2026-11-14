// The ST smoke sandbox guard (tools/st_live/sandbox.mjs, docs/ST_SMOKE_ISOLATED.md): the smoke scripts write into
// data/default-user and delete test chats, so they refuse every SillyTavern that is not the checkout of a marked
// sandbox, and only a marked sandbox is ever removed. No SillyTavern, browser or port is needed here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertSandbox, sandboxRoot, markRoot, readMarker, removableRoot, lockHolder, acquireLock, assertContained, outputDir, MARKER, ST_SUBDIR } from '../../tools/st_live/sandbox.mjs';

const ENGINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-sbx-test-'));
/** A personal SillyTavern: data/default-user with a chat and settings of its own. */
function personal() {
    const st = path.join(tmp(), 'SillyTavern');
    fs.mkdirSync(path.join(st, 'data', 'default-user', 'chats', 'Avereth V4'), { recursive: true });
    fs.writeFileSync(path.join(st, 'server.js'), '// not a real one');
    fs.writeFileSync(path.join(st, 'data', 'default-user', 'settings.json'), '{"username":"me"}');
    fs.writeFileSync(path.join(st, 'data', 'default-user', 'chats', 'Avereth V4', 'my campaign.jsonl'), 'my own chat');
    return st;
}
const snapshot = (dir) => fs.readdirSync(dir, { recursive: true }).sort().map((f) => { const p = path.join(dir, f); return fs.statSync(p).isFile() ? `${f}:${fs.readFileSync(p, 'utf8')}` : f; });

test('ST sandbox: a personal SillyTavern is refused by the guard of every smoke script, before any file is touched', () => {
    const st = personal();
    assert.throws(() => assertSandbox(st), /not the SillyTavern of an Avereth sandbox/);
    assert.throws(() => assertSandbox(undefined), /set AVERETH_ST_DIR/);
    const before = snapshot(path.dirname(st));
    for (const script of ['run_c.mjs', 'run_v4.mjs', 'run.mjs', 'setup.mjs', 'run_greeting.mjs']) {
        const r = spawnSync(process.execPath, [path.join(ENGINE, 'tools/st_live', script)], { env: { ...process.env, AVERETH_ST_DIR: st, AVERETH_ST_OUT: path.join(st, 'out') }, encoding: 'utf8', timeout: 60000 });
        assert.notEqual(r.status, 0, script);
        assert.match(r.stderr, /refusing AVERETH_ST_DIR=.*not the SillyTavern of an Avereth sandbox/, script);
    }
    assert.deepEqual(snapshot(path.dirname(st)), before, 'the personal chat, settings and files are unchanged');
});

test('ST sandbox: a marked root is accepted for its own SillyTavern only; a foreign or wrong marker is not ours', () => {
    const root = tmp();
    markRoot(root);
    const st = path.join(root, ST_SUBDIR);
    fs.mkdirSync(st);
    assert.equal(assertSandbox(st).root, fs.realpathSync(root));
    fs.mkdirSync(path.join(root, 'Other'));
    assert.throws(() => assertSandbox(path.join(root, 'Other')), /not the SillyTavern of an Avereth sandbox/);
    const fake = tmp();
    fs.writeFileSync(path.join(fake, MARKER), JSON.stringify({ kind: 'something-else', st_dir: ST_SUBDIR }));
    assert.equal(readMarker(fake), null);
    fs.mkdirSync(path.join(fake, ST_SUBDIR));
    assert.throws(() => assertSandbox(path.join(fake, ST_SUBDIR)));
});

test('ST sandbox: where a sandbox may be – new, empty or ours; never a non-empty foreign directory, a SillyTavern, home, the file system root or above the repository', () => {
    const fresh = path.join(tmp(), 'new-sandbox');
    assert.equal(sandboxRoot(fresh), path.resolve(fresh));
    assert.ok(sandboxRoot(tmp()), 'an empty directory');
    const foreign = tmp();
    fs.writeFileSync(path.join(foreign, 'notes.txt'), 'mine');
    assert.throws(() => sandboxRoot(foreign), /not empty and carries no/);
    assert.throws(() => sandboxRoot(path.dirname(personal())), /not empty and carries no/);
    assert.throws(() => sandboxRoot(os.homedir()), /refusing/);
    assert.throws(() => sandboxRoot('/'), /refusing/);
    assert.throws(() => sandboxRoot('relative/dir'), /absolute path/);
    assert.throws(() => sandboxRoot(path.dirname(ENGINE), path.dirname(ENGINE)), /refusing/);
    assert.throws(() => sandboxRoot(path.dirname(path.dirname(ENGINE)), path.dirname(ENGINE)), /refusing/, 'above the repository');
    assert.throws(() => markRoot(foreign), /not empty/);
});

test('ST sandbox: only a marked root not held by a run is removed; the lock names a live pid only', () => {
    const foreign = tmp();
    fs.writeFileSync(path.join(foreign, 'notes.txt'), 'mine');
    assert.throws(() => removableRoot(foreign), /refusing to remove .*no \.avereth-st-sandbox\.json/);
    assert.ok(fs.existsSync(path.join(foreign, 'notes.txt')));
    const root = tmp();
    markRoot(root);
    fs.writeFileSync(path.join(root, '.lock'), String(process.pid));
    assert.equal(lockHolder(root), process.pid);
    assert.throws(() => removableRoot(root), /a smoke run holds it/);
    fs.writeFileSync(path.join(root, '.lock'), '999999999');
    assert.equal(lockHolder(root), null, 'a stale lock');
    assert.equal(removableRoot(root), fs.realpathSync(root));
});

test('ST sandbox: smoke:st:clean refuses a foreign AVERETH_ST_SANDBOX and removes a marked one', () => {
    const foreign = tmp();
    fs.writeFileSync(path.join(foreign, 'notes.txt'), 'mine');
    const bad = spawnSync(process.execPath, [path.join(ENGINE, 'tools/st_live/isolated.mjs'), '--clean'], { env: { ...process.env, AVERETH_ST_SANDBOX: foreign }, encoding: 'utf8', timeout: 60000 });
    assert.equal(bad.status, 3);
    assert.match(bad.stderr, /STOPPED at preflight: refusing .*not empty and carries no/);
    assert.ok(fs.existsSync(path.join(foreign, 'notes.txt')));
    const root = tmp();
    markRoot(root);
    fs.mkdirSync(path.join(root, ST_SUBDIR, 'data'), { recursive: true });
    const ok = spawnSync(process.execPath, [path.join(ENGINE, 'tools/st_live/isolated.mjs'), '--clean'], { env: { ...process.env, AVERETH_ST_SANDBOX: root }, encoding: 'utf8', timeout: 60000 });
    assert.equal(ok.status, 0, ok.stderr);
    assert.ok(!fs.existsSync(root));
});

// ------------------------------------------------------------------------------------------------ GPT review 14.11.2026
test('ST sandbox S1: the lock is taken atomically – a second run stops before any change; a stale lock is taken over once; clean waits', () => {
    const root = tmp();
    markRoot(root);
    const release = acquireLock(root);
    assert.equal(fs.readFileSync(path.join(root, '.lock'), 'utf8'), String(process.pid));
    assert.throws(() => acquireLock(root), /another smoke run \(pid \d+\) holds/);
    assert.throws(() => removableRoot(root), /a smoke run holds it/);
    // a second process started at the same time: exactly one of both holds the lock
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `import { acquireLock } from ${JSON.stringify(path.join(ENGINE, 'tools/st_live/sandbox.mjs'))}; try { acquireLock(${JSON.stringify(root)}); console.log('took'); } catch (e) { console.log('refused'); }`], { encoding: 'utf8' });
    assert.equal(child.stdout.trim(), 'refused');
    release();
    assert.ok(!fs.existsSync(path.join(root, '.lock')));
    fs.writeFileSync(path.join(root, '.lock'), '999999999');
    const again = acquireLock(root);
    assert.equal(fs.readFileSync(path.join(root, '.lock'), 'utf8'), String(process.pid), 'a stale lock is replaced');
    again();
    fs.writeFileSync(path.join(root, '.lock'), '');
    assert.throws(() => acquireLock(root), /holds/, 'a lock just created by another run counts as held');
});

test('ST sandbox S2: a SillyTavern or data/default-user linked out of the sandbox stops the guard, the setup and the clean before any write', () => {
    const outside = personal();
    const before = snapshot(path.dirname(outside));
    const a = tmp();
    markRoot(a);
    fs.symlinkSync(outside, path.join(a, ST_SUBDIR));
    assert.throws(() => assertSandbox(path.join(a, ST_SUBDIR)), /not the SillyTavern of an Avereth sandbox/);
    assert.throws(() => assertContained(a), /leads out of the sandbox/);
    const b = tmp();
    markRoot(b);
    fs.mkdirSync(path.join(b, ST_SUBDIR, 'data'), { recursive: true });
    fs.symlinkSync(path.join(outside, 'data', 'default-user'), path.join(b, ST_SUBDIR, 'data', 'default-user'));
    assert.throws(() => assertSandbox(path.join(b, ST_SUBDIR)), /data\/default-user: it leads out of the sandbox/);
    const r = spawnSync(process.execPath, [path.join(ENGINE, 'tools/st_live/run_c.mjs')], { env: { ...process.env, AVERETH_ST_DIR: path.join(b, ST_SUBDIR) }, encoding: 'utf8', timeout: 60000 });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /leads out of the sandbox/);
    const iso = spawnSync(process.execPath, [path.join(ENGINE, 'tools/st_live/isolated.mjs'), '--clean'], { env: { ...process.env, AVERETH_ST_SANDBOX: b }, encoding: 'utf8', timeout: 60000 });
    assert.equal(iso.status, 3);
    assert.match(iso.stderr, /leads out of the sandbox/);
    assert.deepEqual(snapshot(path.dirname(outside)), before, 'the linked personal data are unchanged');
    assert.ok(fs.existsSync(b), 'nothing removed');
});

test('ST sandbox S3: no sandbox inside the repository; results only inside the sandbox', () => {
    const inRepo = path.join(ENGINE, 'tmp-sandbox-test-never-created');
    assert.throws(() => sandboxRoot(inRepo), /inside the repository/);
    assert.ok(!fs.existsSync(inRepo));
    const root = tmp();
    markRoot(root);
    const st = path.join(root, ST_SUBDIR);
    fs.mkdirSync(st);
    assert.equal(outputDir(st, undefined, path.join(st, 'avereth_live_smoke_c')), path.join(fs.realpathSync(st), 'avereth_live_smoke_c'));
    assert.equal(outputDir(st, path.join(root, 'out', 'x', 'standard')), path.join(fs.realpathSync(root), 'out', 'x', 'standard'));
    const elsewhere = tmp();
    assert.throws(() => outputDir(st, path.join(elsewhere, 'results')), /results are written only inside the sandbox/);
    fs.symlinkSync(elsewhere, path.join(root, 'linked'));
    assert.throws(() => outputDir(st, path.join(root, 'linked', 'results')), /only inside the sandbox/);
    const r = spawnSync(process.execPath, [path.join(ENGINE, 'tools/st_live/run_c.mjs')], { env: { ...process.env, AVERETH_ST_DIR: st, AVERETH_ST_OUT: path.join(elsewhere, 'results') }, encoding: 'utf8', timeout: 60000 });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /refusing AVERETH_ST_OUT=/);
    assert.deepEqual(fs.readdirSync(elsewhere), [], 'nothing written outside');
});
