// Nine independent, sequential campaigns. Each child finishes its existing export/cleanup before the next starts.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { options, runsDirFor, gitInfo, check } from './run_live.mjs';
import { importProfile } from './import_profile.mjs';
import { Guard, stamp } from './lib.mjs';
import { loadGuide } from './guide.mjs';
import { SCENARIOS, scenarioGuide } from './scenarios.mjs';

const RUNNER = fileURLToPath(new URL('./run_live.mjs', import.meta.url));
const INFRA = new Set(['harness', 'ui', 'missing', 'no_result', 'process_error', 'scenario_metadata_mismatch']);

/** IPC permits graceful Ctrl+C on Windows too; child.kill(SIGINT) would terminate there without export. */
export function launchRun(args, { signal, entry = RUNNER } = {}) {
    if (signal?.aborted) return Promise.resolve({ code: null, signal: 'cancelled' });
    return new Promise(resolve => {
        const child = spawn(process.execPath, [entry, ...args], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'], detached: true, windowsHide: true });
        let ready = false, sent = false;
        const stop = () => {
            if (ready && !sent && child.connected) { sent = true; child.send({ type: 'batch.stop' }, () => {}); }
        };
        child.on('message', m => { if (m?.type === 'batch.ready') { ready = true; if (signal?.aborted) stop(); } });
        signal?.addEventListener('abort', stop, { once: true });
        child.once('error', () => { signal?.removeEventListener('abort', stop); resolve({ code: 1, signal: 'spawn_error' }); });
        child.once('close', (code, sig) => { signal?.removeEventListener('abort', stop); resolve({ code, signal: sig }); });
    });
}

function readResult(parent, job, exit) {
    const dirs = fs.readdirSync(parent, { withFileTypes: true }).filter(e => e.isDirectory() && fs.existsSync(path.join(parent, e.name, 'run.json')));
    if (dirs.length !== 1) return { end: { kind: 'no_result', why: `expected one archived run, found ${dirs.length}` }, exit };
    const dir = path.join(parent, dirs[0].name);
    try {
        const r = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8'));
        const ev = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation.json'), 'utf8'));
        const valid = r.scenario?.id === job.id && r.seed === job.seed;
        const wrongClass = ev.character?.class && ev.character.class !== job.baseClass.toLowerCase();
        return {
            end: !valid ? { kind: 'scenario_metadata_mismatch' } : wrongClass ? { kind: 'scenario_mismatch' } : exit.signal || ![0, 2].includes(exit.code) ? { kind: 'process_error' } : r.end,
            recordedEnd: r.end, exit, runDir: dirs[0].name, seed: r.seed, build: r.build, git: r.git, stub: r.stub === true,
            inputs: r.turns?.length || 0, level: ev.progression?.currentLevel ?? null, actualClass: ev.character?.class ?? null,
            profileUnchanged: r.protection?.unchanged ?? null, secretHits: r.secretHits ?? null,
        };
    } catch { return { end: { kind: 'no_result', why: 'run metadata could not be read' }, exit }; }
}

const cell = v => String(v ?? '–').replace(/[|\r\n]/g, ' ');
function persist(g, root, batch) {
    const temp = path.join(root, 'batch.json.tmp');
    g.write(temp, JSON.stringify(batch, null, 2));
    fs.renameSync(g.check(temp), g.check(path.join(root, 'batch.json')));
    g.write(path.join(root, 'report.md'), [
        '# Avereth – neun natürliche Testkampagnen', '',
        ...(batch.stub ? ['> STUB-SELBSTTEST mit Mockprovider, kein natürlicher Livetest.', ''] : []),
        `Status: **${batch.status}**. Serie abgeschlossen bedeutet, dass die Läufe beendet sind; es bedeutet nicht neun bestandene Level-15-Abnahmen.`, '',
        '| Nr. | Profil | Seed | Eingaben | Level | Ende | Originalbericht |', '|---|---|---:|---:|---:|---|---|',
        ...batch.runs.map(r => `| ${r.index} | ${r.id} | ${r.seed} | ${r.inputs ?? '–'} | ${r.level ?? '–'} | ${cell(r.end?.kind || r.status)} | ${r.runDir ? `[report.md](${r.folder}/${r.runDir}/report.md)` : '–'} |`), '',
    ].join('\n'));
}

export async function runBatch({ root, args = [], seed = Math.floor(Math.random() * 2 ** 31), maxHours = 24, forbidden = [] }, { launch = launchRun, signal, revision = () => gitInfo()?.commit } = {}) {
    if (!Number.isFinite(maxHours) || maxHours <= 0) throw new Error('--max-hours must be positive');
    if (!Number.isInteger(seed) || seed < 0 || seed > 0x7fffffff) throw new Error('batch seed must be an integer from 0 to 2147483647');
    const g = new Guard([root], { forbidden });
    if (fs.existsSync(root)) throw new Error(`batch folder already exists: ${root}`);
    g.mkdir(root);
    const startRevision = revision();
    const batch = { startedAt: new Date().toISOString(), status: 'running', git: startRevision, stub: args.includes('--stub'), maxHours, runs: SCENARIOS.map((s, i) => ({ index: i + 1, id: s.id, baseClass: s.baseClass, focus: s.focus, seed: (seed + i) % 0x80000000, folder: `${String(i + 1).padStart(3, '0')}-${s.id}`, status: 'pending' })) };
    const ctl = new AbortController();
    const cancel = () => ctl.abort('interrupted');
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    const timer = setTimeout(() => ctl.abort('time_limit'), Math.min(maxHours * 3600000, 0x7fffffff));
    let infra = 0;
    persist(g, root, batch);
    try {
        for (const job of batch.runs) {
            if (ctl.signal.aborted) break;
            if (revision() !== startRevision) { batch.status = 'revision_changed'; break; }
            const parent = path.join(root, job.folder);
            g.mkdir(parent); job.status = 'running'; persist(g, root, batch);
            console.log(`\nBatch ${job.index}/9: ${job.id}, seed ${job.seed}`);
            const exit = await launch([...args, '--scenario', job.id, '--seed', String(job.seed), '--runs', parent], { signal: ctl.signal });
            Object.assign(job, readResult(parent, job, exit), { status: 'finished' });
            if (job.profileUnchanged === false || job.secretHits > 0) { batch.status = 'export_safety_stop'; persist(g, root, batch); break; }
            infra = INFRA.has(job.end.kind) ? infra + 1 : 0;
            persist(g, root, batch);
            if (infra >= 3) { batch.status = 'infrastructure_stop'; break; }
        }
        if (ctl.signal.aborted) batch.status = ctl.signal.reason;
        else if (batch.status === 'running') batch.status = 'completed';
        return batch;
    } finally {
        clearTimeout(timer); signal?.removeEventListener('abort', cancel);
        if (batch.status === 'running') batch.status = 'controller_failed';
        batch.endedAt = new Date().toISOString(); persist(g, root, batch);
    }
}

async function main() {
    const argv = process.argv.slice(2);
    if (argv.includes('--list')) { console.log(SCENARIOS.map((s, i) => `${i + 1}. ${s.id}`).join('\n')); return; }
    const j = argv.indexOf('--max-hours');
    const maxHours = j < 0 ? 24 : Number(argv[j + 1]);
    const args = argv.filter((_v, i) => j < 0 || (i !== j && i !== j + 1));
    if (!args.includes('--guide')) args.push('--guide', 'current_test');
    const o = options(args);
    if (o.fixture || o.scenario || o.player.type !== 'llm' || o.inspect) throw new Error('batch requires the LLM player, a natural guide, no fixture or individual scenario');
    scenarioGuide(loadGuide(o.guide), SCENARIOS[0].id);
    if (o.check) { process.exitCode = await check(o); return; }
    if (!Number.isFinite(maxHours) || maxHours <= 0) throw new Error('--max-hours must be positive');
    const imp = importProfile({ stDir: o.stDir, user: o.stUser, card: o.card, preset: o.preset, dataRoot: o.stData });
    const base = runsDirFor(o, imp), name = `batch-${stamp()}`;
    let root = path.join(base, name);
    for (let n = 2; fs.existsSync(root); n++) root = path.join(base, `${name}-${n}`);
    // Per-run destinations/seeds below override config defaults. Remove their CLI occurrences first.
    const pass = args.filter((_v, i) => !['--runs', '--seed'].includes(args[i]) && !['--runs', '--seed'].includes(args[i - 1]));
    const ctl = new AbortController(), stop = () => { console.log('Stopping the batch; waiting for the active run to export and clean up.'); ctl.abort(); };
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
    try {
        const result = await runBatch({ root, args: pass, seed: o.seed ?? undefined, maxHours, forbidden: [imp.st.dir, imp.st.dataRoot] }, { signal: ctl.signal });
        console.log(`Batch ${result.status}: ${root}`);
        process.exitCode = result.status === 'completed' ? 0 : 2;
    } finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });
