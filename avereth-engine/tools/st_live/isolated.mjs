// One command for the SillyTavern smokes in a fresh environment (docs/ST_SMOKE_ISOLATED.md):
//   npm run smoke:st:isolated            prepare the sandbox if needed, then the standard and the failsoft smoke
//   npm run smoke:st:check               only check what is needed (no install, no run)
//   npm run smoke:st:clean               remove the sandbox (only a marked one, never while a run holds it)
//   node tools/st_live/isolated.mjs --mode standard|failsoft|base
// The sandbox (tools/st_live/sandbox.mjs) is a marked directory of its own (default: <tmp>/avereth-st-sandbox,
// AVERETH_ST_SANDBOX for another new or marked one) with SillyTavern 1.19.0 checked out and installed by npm. The
// smoke itself is the existing tools/st_live/run_c.mjs with its mock provider (no API key); the engine is this checkout.
// Nothing outside the sandbox is written, no process but our own is stopped, a busy port stops the run.
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { ENGINE_VERSION } from '../../src/util.js';
import { ST_VERSION, ST_COMMIT, ST_REPO, ST_NODE_MAJOR, PORTS, PLAYWRIGHT_VERSION, ST_SUBDIR, SandboxError, sandboxRoot, markRoot, readMarker, removableRoot, lockHolder } from './sandbox.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ENGINE = path.resolve(HERE, '..', '..');
const REPO = path.resolve(ENGINE, '..');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

// the module smokes of run_c.mjs: "standard" is all of them, "failsoft" the same with the failsoft probes
const MODULES = ['FINANCE', 'SAVE_RECOVERY', 'FETCH', 'STEALTH', 'UI', 'CONTINUITY', 'BOARD159', 'QOL160', 'UI161', 'PULSE162', 'PULSE164', 'PULSE167', 'NPC169', 'NPC172', 'PILOT01'];
const MODES = {
    base: {},
    standard: Object.fromEntries(MODULES.map((m) => [`AVERETH_SMOKE_${m}`, '1'])),
    failsoft: { ...Object.fromEntries(MODULES.map((m) => [`AVERETH_SMOKE_${m}`, '1'])), AVERETH_SMOKE_FAILSOFT: '1' },
};
const log = (...a) => console.log('[st-isolated]', ...a);
const run = (cmd, argv, o = {}) => spawnSync(cmd, argv, { encoding: 'utf8', ...o });

// ------------------------------------------------------------------------------------------------ checks
const portFree = (port) => new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '127.0.0.1');
});
function playwright(nodePath) {
    const req = createRequire(path.join(HERE, 'run_c.mjs'));
    const tries = [() => req('playwright'), () => req(path.join(run('npm', ['root', '-g']).stdout.trim(), 'playwright')), ...(nodePath ? [() => req(path.join(nodePath, 'playwright'))] : [])];
    for (const t of tries) { try { const pw = t(); if (pw?.chromium) return pw; } catch { /* next */ } }
    return null;
}
async function preflight(root, { online = false } = {}) {
    const items = [];
    const add = (name, ok, detail, fix = null) => items.push({ name, ok, detail, ...(ok ? {} : { fix }) });
    const major = Number(process.versions.node.split('.')[0]);
    add('node', major >= ST_NODE_MAJOR, `Node ${process.versions.node} (SillyTavern ${ST_VERSION} asks >= ${ST_NODE_MAJOR})`, `install Node ${ST_NODE_MAJOR} or newer`);
    const git = run('git', ['--version']);
    add('git', git.status === 0, git.stdout?.trim() || 'not found', 'install git');
    const npm = run('npm', ['--version']);
    add('npm', npm.status === 0, npm.status === 0 ? `npm ${npm.stdout.trim()}` : 'not found', 'install npm (comes with Node)');
    for (const [what, port] of Object.entries(PORTS)) {
        const free = await portFree(port);
        add(`port ${port}`, free, free ? `free (${what === 'st' ? 'SillyTavern' : 'mock provider'})` : 'in use by another process', `free port ${port}; nothing is stopped by this tool (a running SillyTavern or natural batch is left alone)`);
    }
    const pw = playwright(path.join(root, 'tools', 'node_modules'));
    let exe = null;
    try { exe = pw?.chromium.executablePath(); } catch { exe = null; }
    add('playwright', !!pw, pw ? 'found' : `not found (the run installs playwright@${PLAYWRIGHT_VERSION} into the sandbox)`, null);
    if (pw) add('chromium', !!exe && fs.existsSync(exe), exe && fs.existsSync(exe) ? exe : 'no browser binary', 'the run installs Chromium with "playwright install chromium" (network); system libraries need "npx playwright install-deps chromium" (root)');
    const marker = readMarker(root);
    const st = path.join(root, ST_SUBDIR);
    add('sandbox', true, marker ? `${root} (marked; SillyTavern ${fs.existsSync(path.join(st, 'node_modules')) ? 'installed' : 'not installed yet'})` : `${root} (will be created)`);
    if (online) {
        const r = run('git', ['ls-remote', '--tags', ST_REPO, ST_VERSION], { timeout: 30000 });
        add('network', r.status === 0 && r.stdout.includes(ST_COMMIT), r.status === 0 ? `${ST_REPO} ${ST_VERSION} reachable` : `not reachable: ${(r.stderr || r.error?.message || '').trim().slice(0, 160)}`, 'allow github.com and the npm registry (a sandbox installed before needs neither)');
    }
    return items;
}
const blocking = (items, installed) => items.filter((x) => !x.ok && !['playwright', 'chromium', 'sandbox'].includes(x.name) && !(installed && x.name === 'network'));

// ------------------------------------------------------------------------------------------------ setup
function step(stage, cmd, argv, o, logFile) {
    log(`${stage}: ${cmd} ${argv.join(' ')}`);
    const r = run(cmd, argv, { ...o, maxBuffer: 64 << 20 });
    fs.appendFileSync(logFile, `\n$ ${cmd} ${argv.join(' ')}\n${r.stdout || ''}${r.stderr || ''}`);
    if (r.status !== 0) throw new SandboxError(stage, `${cmd} ${argv.join(' ')} failed (exit ${r.status ?? r.error?.code}); see ${logFile}`);
    return r;
}
function installSillyTavern(root, logFile) {
    const st = path.join(root, ST_SUBDIR);
    if (!fs.existsSync(path.join(st, 'server.js'))) {
        fs.rmSync(st, { recursive: true, force: true }); // inside the marked root only
        step('install', 'git', ['-c', 'advice.detachedHead=false', 'clone', '--quiet', '--depth', '1', '--branch', ST_VERSION, ST_REPO, st], { timeout: 300000 }, logFile);
    }
    const head = run('git', ['rev-parse', 'HEAD'], { cwd: st }).stdout.trim();
    if (head !== ST_COMMIT) throw new SandboxError('install', `SillyTavern in ${st} is at ${head}, not ${ST_VERSION} (${ST_COMMIT}); run npm run smoke:st:clean and start again`);
    if (!fs.existsSync(path.join(st, 'node_modules', '.package-lock.json')))
        step('install', 'npm', ['ci', '--no-audit', '--no-fund', '--loglevel', 'error'], { cwd: st, timeout: 900000 }, logFile);
    return st;
}
async function initSillyTavern(st, logFile) {
    if (fs.existsSync(path.join(st, 'data', 'default-user', 'settings.json')) && fs.existsSync(path.join(st, 'data', 'default-user', 'OpenAI Settings', 'Default.json'))) return;
    log(`init: first start of SillyTavern on port ${PORTS.st} (creates data/default-user)`);
    const child = spawn(process.execPath, ['server.js', '--port', String(PORTS.st), '--browserLaunchEnabled', 'false'], { cwd: st, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const ready = () => /Go to: http/.test(out) && fs.existsSync(path.join(st, 'data', 'default-user', 'settings.json'));
    const t0 = Date.now();
    while (!ready() && child.exitCode === null && Date.now() - t0 < 180000) await new Promise((r) => setTimeout(r, 500));
    const ok = ready();
    child.kill('SIGTERM'); // our own child only
    await new Promise((r) => { if (child.exitCode !== null) r(); else { child.once('exit', r); setTimeout(() => { child.kill('SIGKILL'); r(); }, 10000); } });
    fs.appendFileSync(logFile, `\n$ node server.js (first start)\n${out}`);
    if (!ok) throw new SandboxError('st-start', `SillyTavern did not start within 180 s${child.exitCode !== null ? ` (exit ${child.exitCode})` : ''}; see ${logFile}`);
}
function ensureBrowser(root, logFile) {
    const nodePath = path.join(root, 'tools', 'node_modules');
    let pw = playwright(nodePath);
    if (!pw) {
        fs.mkdirSync(path.join(root, 'tools'), { recursive: true });
        step('browser', 'npm', ['install', '--prefix', path.join(root, 'tools'), '--no-audit', '--no-fund', '--loglevel', 'error', `playwright@${PLAYWRIGHT_VERSION}`], { timeout: 600000 }, logFile);
        pw = playwright(nodePath);
        if (!pw) throw new SandboxError('browser', `playwright could not be loaded after installing it into ${nodePath}; see ${logFile}`);
    }
    let exe = null;
    try { exe = pw.chromium.executablePath(); } catch { exe = null; }
    if (!exe || !fs.existsSync(exe)) {
        const req = createRequire(path.join(HERE, 'run_c.mjs'));
        let dir = null;
        for (const p of [HERE, nodePath, run('npm', ['root', '-g']).stdout.trim()]) { try { dir = path.dirname(req.resolve('playwright/package.json', { paths: [p] })); break; } catch { /* next */ } }
        if (!dir) throw new SandboxError('browser', 'playwright found but its package directory not; install Chromium with "npx playwright install chromium"');
        step('browser', process.execPath, [path.join(dir, 'cli.js'), 'install', 'chromium'], { timeout: 900000 }, logFile);
    }
    return nodePath;
}
async function launchProbe(nodePath) {
    const pw = playwright(nodePath);
    try { const b = await pw.chromium.launch(); await b.close(); return null; } catch (e) { return String(e.message).split('\n').slice(0, 4).join(' '); }
}

// ------------------------------------------------------------------------------------------------ the smoke
function smoke(st, nodePath, mode, outDir) {
    const out = path.join(outDir, mode);
    fs.mkdirSync(out, { recursive: true });
    const logFile = path.join(out, 'run.log');
    const env = { ...process.env, ...MODES[mode], AVERETH_ST_DIR: st, AVERETH_ST_OUT: out, NODE_PATH: [nodePath, process.env.NODE_PATH].filter(Boolean).join(path.delimiter) };
    for (const k of Object.keys(env)) if (k.startsWith('AVERETH_SMOKE_') && !(k in MODES[mode])) delete env[k];
    log(`smoke ${mode}: node tools/st_live/run_c.mjs (${Object.keys(MODES[mode]).length} switches) → ${out}`);
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [path.join(HERE, 'run_c.mjs')], { cwd: ENGINE, env, encoding: 'utf8', maxBuffer: 256 << 20, timeout: 45 * 60000 });
    fs.writeFileSync(logFile, `${r.stdout || ''}${r.stderr || ''}`);
    let result = null;
    try { result = JSON.parse(fs.readFileSync(path.join(out, 'result.json'), 'utf8')); } catch { result = null; }
    const checks = result ? Object.entries(result.checks) : [];
    const line = (r.stdout || '').trim().split('\n').filter((l) => /LIVE SILLYTAVERN SMOKE C:/.test(l)).at(-1) || null;
    const error = r.status === 0 ? null : ((r.stderr || '').trim().split('\n').filter(Boolean).slice(-3).join(' ').slice(0, 400) || r.error?.message || `exit ${r.status}`);
    return { mode, ok: r.status === 0 && line === 'LIVE SILLYTAVERN SMOKE C: OK', exit: r.status, line, seconds: Math.round((Date.now() - t0) / 1000),
        checks: checks.length, passed: checks.filter(([, v]) => v).length, failed: checks.filter(([, v]) => !v).map(([k]) => k), page_errors: result?.pageErrors?.length ?? null, calls: result?.calls?.length ?? null,
        ...(error ? { error } : {}), out, log: logFile };
}

function writeReport(root, outDir, report) {
    const json = path.join(outDir, 'report.json');
    fs.writeFileSync(json, JSON.stringify(report, null, 1));
    const md = [`# ST smoke (isolated) – ${report.finished}`, '', `- SillyTavern ${report.st.version} (${report.st.commit.slice(0, 7)}), Node ${report.node}, Chromium ${report.chromium || 'n/a'}`,
        `- Engine ${report.engine.version}, checkout ${report.engine.commit}${report.engine.dirty ? ' (uncommitted changes)' : ''}`, `- Sandbox ${root}`, '',
        '| Mode | Result | Checks | Failed | Page errors | Seconds |', '|---|---|---|---|---|---|',
        ...report.runs.map((r) => `| ${r.mode} | ${r.ok ? 'OK' : 'FAILED'} | ${r.passed}/${r.checks} | ${r.failed.join(', ') || '–'} | ${r.page_errors ?? '–'} | ${r.seconds} |`),
        ...(report.error ? ['', `**Stopped at ${report.error.stage}:** ${report.error.message}`] : []), '', '**Not checked here:** ' + report.open.join('; ') + '.', ''].join('\n');
    fs.writeFileSync(path.join(outDir, 'report.md'), md);
    return json;
}

// ------------------------------------------------------------------------------------------------ main
async function main() {
    const root = sandboxRoot(undefined, REPO);
    if (flag('--clean')) {
        if (!fs.existsSync(root)) { log(`nothing to clean: ${root} does not exist`); return 0; }
        const r = removableRoot(root, REPO);
        fs.rmSync(r, { recursive: true, force: true });
        log(`removed the sandbox ${r}`);
        return 0;
    }
    if (flag('--check')) {
        const items = await preflight(root, { online: true });
        for (const x of items) log(`${x.ok ? 'ok  ' : 'MISSING'} ${x.name}: ${x.detail}${x.ok || !x.fix ? '' : ` → ${x.fix}`}`);
        const installed = fs.existsSync(path.join(root, ST_SUBDIR, 'node_modules'));
        const stop = blocking(items, installed);
        log(stop.length ? `not ready: ${stop.map((x) => x.name).join(', ')}` : 'ready: npm run smoke:st:isolated');
        return stop.length ? 2 : 0;
    }
    const modes = (opt('--mode', 'both') === 'both' ? ['standard', 'failsoft'] : [opt('--mode')]);
    for (const m of modes) if (!MODES[m]) throw new SandboxError('preflight', `unknown --mode ${m} (standard, failsoft, base, both)`);
    const installedBefore = fs.existsSync(path.join(root, ST_SUBDIR, 'node_modules'));
    const items = await preflight(root, { online: !installedBefore });
    const stop = blocking(items, installedBefore);
    if (stop.length) throw new SandboxError('preflight', stop.map((x) => `${x.name}: ${x.detail}${x.fix ? ` → ${x.fix}` : ''}`).join('; '));
    markRoot(root);
    const holder = lockHolder(root);
    if (holder) throw new SandboxError('preflight', `another smoke run (pid ${holder}) uses ${root}`);
    fs.writeFileSync(path.join(root, '.lock'), String(process.pid));
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.join(root, 'out', stamp);
    fs.mkdirSync(outDir, { recursive: true });
    const setupLog = path.join(outDir, 'setup.log');
    const git = (a) => run('git', a, { cwd: REPO }).stdout.trim();
    const report = { kind: 'avereth-st-smoke-isolated', started: new Date().toISOString(), sandbox: root,
        st: { version: ST_VERSION, commit: ST_COMMIT }, node: process.versions.node, chromium: null,
        engine: { version: ENGINE_VERSION, commit: git(['rev-parse', '--short', 'HEAD']), branch: git(['rev-parse', '--abbrev-ref', 'HEAD']), dirty: git(['status', '--porcelain']).length > 0 },
        runs: [], open: ['natural model behaviour (the mock provider answers scripted plans and reports)', 'personal SillyTavern profiles (never used)', 'other SillyTavern versions than ' + ST_VERSION] };
    let code = 0;
    try {
        const st = installSillyTavern(root, setupLog);
        await initSillyTavern(st, setupLog);
        const nodePath = ensureBrowser(root, setupLog);
        const launch = await launchProbe(nodePath);
        if (launch) throw new SandboxError('browser', `Chromium does not start: ${launch} → system libraries: "npx playwright install-deps chromium" (root), see ${setupLog}`);
        try { const pw = playwright(nodePath); const b = await pw.chromium.launch(); report.chromium = b.version(); await b.close(); } catch { /* reported above */ }
        for (const m of modes) {
            for (const [what, port] of Object.entries(PORTS)) if (!(await portFree(port))) throw new SandboxError('preflight', `port ${port} (${what}) became busy; nothing was stopped`);
            const r = smoke(st, nodePath, m, outDir);
            report.runs.push(r);
            log(`${m}: ${r.ok ? 'OK' : 'FAILED'} ${r.passed}/${r.checks}${r.failed.length ? ` (failed: ${r.failed.join(', ')})` : ''}${r.error ? ` – ${r.error}` : ''} – ${r.log}`);
            if (!r.ok) code = 1;
        }
    } catch (e) {
        report.error = { stage: e.stage || 'smoke', message: e.message };
        code = 3;
    } finally {
        report.finished = new Date().toISOString();
        const file = writeReport(root, outDir, report);
        try { fs.rmSync(path.join(root, '.lock'), { force: true }); } catch { /* ours */ }
        log(`report: ${file} (and report.md)`);
        if (report.error) log(`STOPPED at ${report.error.stage}: ${report.error.message}`);
    }
    log(code === 0 ? `ST SMOKE ISOLATED: OK (${report.runs.map((r) => `${r.mode} ${r.passed}/${r.checks}`).join(', ')})` : 'ST SMOKE ISOLATED: FAILED');
    return code;
}

main().then((c) => process.exit(c), (e) => {
    console.error(`[st-isolated] STOPPED at ${e.stage || 'error'}: ${e.message}`);
    process.exit(e instanceof SandboxError ? 3 : 4);
});
