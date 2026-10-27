import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { SCENARIOS, scenarioGuide, scenarioMismatch } from '../../tools/st_live/live/scenarios.mjs';
import { runBatch, launchRun } from '../../tools/st_live/live/batch.mjs';
import { loadGuide } from '../../tools/st_live/live/guide.mjs';
import { playerSystemPrompt } from '../../tools/st_live/live/players.mjs';
import { options } from '../../tools/st_live/live/run_live.mjs';

function temporary(t) {
    const p = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-batch-test-'));
    t.after(() => fs.rmSync(p, { recursive: true, force: true }));
    return p;
}
const arg = (args, name) => args[args.indexOf(name) + 1];
function archive(args, { end = 'done', actualClass, protection = true, secretHits = 0 } = {}) {
    const scenario = SCENARIOS.find(s => s.id === arg(args, '--scenario'));
    const dir = path.join(arg(args, '--runs'), 'test-current_test');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify({ scenario, seed: Number(arg(args, '--seed')), end: { kind: end }, build: 'test-only', git: { commit: 'fixed' }, turns: [{}, {}], protection: { unchanged: protection }, secretHits, ignoredSecret: 'must-not-be-copied' }));
    fs.writeFileSync(path.join(dir, 'evaluation.json'), JSON.stringify({ character: { class: actualClass || scenario.baseClass.toLowerCase() }, progression: { currentLevel: 2 } }));
    fs.writeFileSync(path.join(dir, 'report.md'), '# Synthetic controller-test artifact');
}
const settings = root => ({ root, args: ['--guide', 'current_test'], seed: 40, maxHours: 1 });
const fixed = { revision: () => 'fixed' };

test('batch profiles cover Guild and exploration by all three current classes, with no separate Dungeon runs', () => {
    assert.equal(SCENARIOS.length, 6);
    assert.equal(new Set(SCENARIOS.map(s => s.id)).size, 6);
    assert.deepEqual(SCENARIOS.map(s => s.focus), ['guild', 'guild', 'guild', 'explore', 'explore', 'explore']);
    for (const focus of ['guild', 'explore']) assert.deepEqual(SCENARIOS.filter(s => s.focus === focus).map(s => s.baseClass), ['Warrior', 'Mage', 'Rogue']);
    const original = loadGuide('current_test'), saved = structuredClone(original);
    for (const s of SCENARIOS) {
        const g = scenarioGuide(original, s.id), prompt = playerSystemPrompt(g, { username: 'Alaric' });
        assert.ok(prompt.includes(`Base class for this run: ${s.baseClass}`));
        assert.ok(prompt.includes(s.goal));
        assert.ok(g.brief.includes('sell surplus loot'));
        assert.ok(g.brief.includes('choose your own two starter skills'));
        assert.deepEqual(g.openRun, original.openRun);
        assert.deepEqual(g.limits, original.limits);
        assert.deepEqual(g.milestones.map(m => m.id), original.milestones.map(m => m.id));
        assert.ok(g.brief.length < 2300);
    }
    assert.deepEqual(original, saved);
    assert.equal(scenarioGuide(original), original);
});

test('exploration prompts pursue travel and independent income rather than the ordinary Guild progression route', () => {
    const original = loadGuide('current_test');
    for (const s of SCENARIOS.filter(s => s.focus === 'explore')) {
        const g = scenarioGuide(original, s.id), prompt = playerSystemPrompt(g, { username: 'Alaric' });
        assert.match(prompt, /between cities, villages and wilderness/i);
        assert.match(prompt, /suitable wild.monster fights/i);
        assert.match(prompt, /outside the Guild/i);
        assert.match(prompt, /paid work/i);
        assert.match(prompt, /selling loot/i);
        assert.match(prompt, /trading/i);
        assert.match(prompt, /Guild registration and contracts are not your progression route/i);
        assert.ok(!g.brief.includes('Guild contracts and suitable fights may fund'));
        assert.ok(!g.brief.includes('Make becoming a capable Guild adventurer'));
        assert.ok(g.brief.includes('incidental help and detours remain welcome'));
    }
    for (const s of SCENARIOS.filter(s => s.focus === 'guild')) {
        assert.ok(scenarioGuide(original, s.id).brief.includes('Make official Guild contracts your main occupation'));
    }
    assert.ok(original.brief.includes('Make becoming a capable Guild adventurer'));
});

test('scenario options reject unsupported profiles/fixtures/scripts and keep an ordinary single run unchanged', () => {
    const base = ['--config', '/nonexistent/avereth-config.json'];
    assert.equal(options(base, {}).scenario, undefined);
    assert.equal(options([...base, '--scenario', 'explore-rogue'], {}).scenario, 'explore-rogue');
    assert.throws(() => options([...base, '--scenario', 'dungeon-rogue'], {}), /Unknown scenario/);
    assert.throws(() => options([...base, '--scenario', '../../x'], {}), /Unknown scenario/);
    assert.throws(() => options([...base, '--scenario', 'guild-mage', '--fixture', '9d-rare'], {}), /no fixture/);
    assert.throws(() => options([...base, '--scenario', 'guild-mage', '--player', 'scripted'], {}), /LLM player/);
    assert.throws(() => scenarioGuide(loadGuide('guild_dungeon_loop'), 'guild-mage'), /natural open-run/);
});

test('the scenario class is checked against Engine state, never changed to fit the requested label', () => {
    const s = { creation: { step: 2 }, entities: { pc: { sheet: { class: 'mage' } } } };
    const profile = { baseClass: 'Warrior' };
    assert.equal(scenarioMismatch(s, profile), null);
    s.creation.step = 3;
    assert.equal(scenarioMismatch(s, profile).kind, 'scenario_mismatch');
    assert.equal(s.entities.pc.sheet.class, 'mage');
    assert.equal(scenarioMismatch(s, { baseClass: 'Mage' }), null);
    assert.equal(scenarioMismatch(s, null), null);
});

test('six independent runs execute sequentially after game failures and retain separate numbered archives', async t => {
    const root = path.join(temporary(t), 'batch'), starts = [];
    let running = 0, max = 0;
    const result = await runBatch({ ...settings(root), args: ['--guide', 'current_test', '--stub'] }, { ...fixed, launch: async args => {
        starts.push(args); max = Math.max(max, ++running);
        const end = ['extractor_failed', 'defeat', 'done', 'limit'][starts.length % 4];
        archive(args, { end });
        await Promise.resolve(); running--;
        return { code: end === 'done' ? 0 : 2, signal: null };
    } });
    assert.equal(result.status, 'completed'); assert.equal(starts.length, 6); assert.equal(max, 1);
    assert.deepEqual(result.runs.map(r => r.seed), [40, 43, 41, 44, 42, 45]);
    assert.ok(result.runs.every(r => r.status === 'finished' && r.inputs === 2 && r.level === 2));
    for (const [i, r] of result.runs.entries()) {
        assert.ok(r.folder.startsWith(String(i + 1).padStart(3, '0') + '-'));
        assert.ok(fs.existsSync(path.join(root, r.folder, r.runDir, 'report.md')));
        assert.equal(arg(starts[i], '--scenario'), r.id);
    }
    const summary = fs.readFileSync(path.join(root, 'batch.json'), 'utf8');
    assert.equal(JSON.parse(summary).runs.length, 6); assert.ok(!summary.includes('must-not-be-copied'));
    assert.equal(result.stub, true);
    assert.match(fs.readFileSync(path.join(root, 'report.md'), 'utf8'), /nicht 6 bestandene/);
    assert.match(fs.readFileSync(path.join(root, 'report.md'), 'utf8'), /STUB-SELBSTTEST/);
    await assert.rejects(runBatch(settings(root), fixed), /already exists/);
});

test('three infrastructure failures stop the series instead of endlessly restarting', async t => {
    let calls = 0;
    const result = await runBatch(settings(path.join(temporary(t), 'batch')), { ...fixed, launch: async () => { calls++; return { code: 1 }; } });
    assert.equal(calls, 3); assert.equal(result.status, 'infrastructure_stop');
    assert.equal(result.runs.filter(r => r.status === 'pending').length, 3);
});

test('profile changes and secret-scan findings stop before another campaign starts', async t => {
    for (const bad of [{ protection: false }, { secretHits: 1 }]) {
        let calls = 0;
        const result = await runBatch(settings(path.join(temporary(t), 'batch')), { ...fixed, launch: async args => { calls++; archive(args, bad); return { code: 0 }; } });
        assert.equal(calls, 1); assert.equal(result.status, 'export_safety_stop');
    }
});

test('manual batch cancellation still archives the active result and leaves the remaining profiles unstarted', async t => {
    const ctl = new AbortController(), root = path.join(temporary(t), 'batch'); let calls = 0;
    const result = await runBatch(settings(root), { ...fixed, signal: ctl.signal, launch: async args => { calls++; archive(args); ctl.abort(); return { code: 2 }; } });
    assert.equal(result.status, 'interrupted'); assert.equal(calls, 1);
    assert.equal(result.runs[0].status, 'finished'); assert.equal(result.runs[1].status, 'pending');
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'batch.json'))).status, 'interrupted');
});

test('the total time limit asks the active child to stop and waits for its export', async t => {
    const result = await runBatch({ ...settings(path.join(temporary(t), 'batch')), maxHours: 0.000001 }, { ...fixed, launch: async (args, { signal }) => {
        await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
        archive(args); return { code: 2 };
    } });
    assert.equal(result.status, 'time_limit'); assert.equal(result.runs[0].status, 'finished'); assert.equal(result.runs[1].status, 'pending');
});

test('revision changes stop before the next campaign, and a wrong class is never reported as a matching sample', async t => {
    let rev = 'a';
    const result = await runBatch(settings(path.join(temporary(t), 'batch')), { revision: () => rev, launch: async args => { archive(args, { actualClass: 'mage' }); rev = 'b'; return { code: 0 }; } });
    assert.equal(result.status, 'revision_changed'); assert.equal(result.runs[0].end.kind, 'scenario_mismatch');
    assert.equal(result.runs[1].status, 'pending');
});

test('a real child process receives graceful IPC cancellation and finishes writing before launchRun returns', { timeout: 5000 }, async t => {
    const dir = temporary(t), entry = path.join(dir, 'child.mjs'), saved = path.join(dir, 'archived');
    fs.writeFileSync(entry, `import fs from 'node:fs'; process.on('message', m => { if(m.type==='batch.stop'){ fs.writeFileSync(process.argv[2], 'saved'); process.exit(0); } }); process.send({type:'batch.ready'});`);
    const ctl = new AbortController();
    const p = launchRun([saved], { signal: ctl.signal, entry }); ctl.abort();
    assert.equal((await p).code, 0); assert.equal(fs.readFileSync(saved, 'utf8'), 'saved');
});

test('batch children use pipes instead of inherited Windows console handles and still forward both output streams', { timeout: 5000 }, async t => {
    const entry = path.join(temporary(t), 'console.mjs');
    fs.writeFileSync(entry, `console.log('child stdout'); console.error('child stderr');`);
    const stdout = new PassThrough(), stderr = new PassThrough();
    let out = '', err = '', spawned;
    stdout.on('data', d => { out += d; }); stderr.on('data', d => { err += d; });
    const exit = await launchRun([], { entry, stdout, stderr, spawnImpl: (exe, args, options) => {
        spawned = options;
        return spawn(exe, args, options);
    } });
    assert.equal(exit.code, 0);
    assert.deepEqual(spawned?.stdio, ['ignore', 'pipe', 'pipe', 'ipc']);
    assert.equal(spawned.detached, true); // keep Ctrl+C away from the child; IPC asks it to export
    assert.match(out, /child stdout/); assert.match(err, /child stderr/);
    assert.equal(stdout.writableEnded, false); assert.equal(stderr.writableEnded, false);
});

test('an early child failure preserves bounded, redacted stderr in the batch archive without claiming a game result', { timeout: 5000 }, async t => {
    const dir = temporary(t), entry = path.join(dir, 'fail.mjs'), root = path.join(dir, 'batch');
    const secret = 'synthetic-test-secret-123456789';
    fs.writeFileSync(entry, `process.stderr.write('x'.repeat(12000)); process.stderr.write('\\nSTART FAILURE ' + ${JSON.stringify(secret.slice(0, 12))}); setTimeout(() => { process.stderr.write(${JSON.stringify(secret.slice(12))} + ' Bearer abcdefghijklmnopqrstuvwxyz\\n'); process.exitCode = 1; }, 5);`);
    const result = await runBatch({ ...settings(root), secrets: [secret] }, { ...fixed, launch: (args, options) =>
        launchRun(args, { ...options, entry, stdout: new PassThrough(), stderr: new PassThrough() }) });
    assert.equal(result.status, 'infrastructure_stop');
    assert.equal(result.runs.filter(r => r.status === 'finished').length, 3);
    for (const r of result.runs.slice(0, 3)) {
        assert.equal(r.end.kind, 'no_result'); assert.equal(r.exit.code, 1);
        assert.match(r.exit.stderr, /START FAILURE <redacted>/);
        assert.ok(r.exit.stderr.length <= 4000);
        assert.match(r.end.why, /exit 1/); assert.match(r.end.why, /START FAILURE/);
    }
    const saved = fs.readFileSync(path.join(root, 'batch.json'), 'utf8');
    assert.ok(!saved.includes(secret)); assert.ok(!saved.includes('abcdefghijklmnopqrstuvwxyz'));
});

test('native child spawn errors retain their cause instead of disappearing behind no_result', { timeout: 5000 }, async t => {
    const exit = await launchRun([], { spawnImpl: (_exe, args, options) =>
        spawn(path.join(temporary(t), 'missing-node-executable'), args, options) });
    assert.equal(exit.signal, 'spawn_error'); assert.equal(exit.code, 1);
    assert.match(exit.error, /ENOENT/);
});

test('the uploaded Windows fail-fast code remains visible when no run.json could be written', async t => {
    const root = path.join(temporary(t), 'batch');
    const result = await runBatch(settings(root), { ...fixed,
        launch: async () => ({ code: 3221226505, signal: null }) });
    assert.equal(result.status, 'infrastructure_stop');
    assert.match(result.runs[0].end.why, /3221226505.*0xc0000409/i);
    assert.match(fs.readFileSync(path.join(root, 'report.md'), 'utf8'), /0xc0000409/i);
});
