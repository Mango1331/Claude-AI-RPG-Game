// The ST smoke sandbox guard (tools/st_live/sandbox.mjs, docs/ST_SMOKE_ISOLATED.md): the smoke scripts write into
// data/default-user and delete test chats, so they refuse every SillyTavern that is not the checkout of a marked
// sandbox, and only a marked sandbox is ever removed. No SillyTavern, browser or port is needed here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertSandbox, sandboxRoot, markRoot, readMarker, removableRoot, lockHolder, MARKER, ST_SUBDIR } from '../../tools/st_live/sandbox.mjs';

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
