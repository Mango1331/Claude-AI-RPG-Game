// Automated live test in a real SillyTavern (docs/LIVE_RUNNER.md): the player's own SillyTavern program on an
// isolated instance, the configuration taken read-only from the player's profile, the real provider, a player that
// plays by a test guide, and a run folder with the chat, the engine's events, every Chat Completion call and a report.
//
//   node tools/st_live/live/run_live.mjs --check                 prerequisites (nothing is started)
//   node tools/st_live/live/run_live.mjs --inspect               what the import would take from the profile
//   node tools/st_live/live/run_live.mjs [--guide patch_8_4]     a live run (key in the environment variable)
//   node tools/st_live/live/run_live.mjs --stub                  the runner against a stub provider: no live test
//
// Options (also in tools/st_live/live.config.json, see live.config.example.json): --st <SillyTavern dir> --user
// <handle> --card <name> --preset profile|repo --guide <id|file> --player llm|scripted --seed <n> --max-turns <n>
// --headed --browser auto|chromium|msedge|chrome --port <n> --runs <dir> --keep-profile --st-data <data root>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ENGINE, stamp, pick, isInside, changedSince, treeStat, treeDiff, sha256, clip } from './lib.mjs';
import { importProfile, describeImport, routeOf, routeText, modelKeyOf } from './import_profile.mjs';
import { probeModels, probeRows, probeBlocks } from './preflight.mjs';
import { createInstance, writeConfig, seedProfile, chatFiles, removeKey, removeInstance, WORLD_FILE } from './profile.mjs';
import { startServer, freePort } from './server.mjs';
import { loadPlaywright, launchBrowser, Driver } from './driver.mjs';
import { llmPlayer, scriptedPlayer, screenText } from './players.mjs';
import { loadGuide } from './guide.mjs';
import { evaluate, finished, nextMilestone } from './evaluator.mjs';
import { parseCalls } from './calls.mjs';
import { readChatJsonl, eventsLog, jsonl, secretScan } from './export.mjs';
import { buildReport } from './report.mjs';
import { startStub, STUB_MODEL } from './stub_provider.mjs';

export const CONFIG_FILE = path.join(ENGINE, 'tools', 'st_live', 'live.config.json');
export const DEFAULT_RUNS = path.join(ENGINE, 'tools', 'st_live', 'runs');
export const STUB_KEY = 'stub-key-not-a-real-key-0000';
export const DEFAULTS = {
    stDir: null, stUser: 'default-user', stData: null, card: null, preset: 'profile', port: 8123, browser: 'auto', headless: true,
    keyEnv: 'AVERETH_LIVE_API_KEY', guide: 'guild_dungeon_loop', seed: null, maxTurns: null, turnTimeoutSec: 900, runsDir: null, keepProfile: false,
    player: { type: 'llm', url: null, model: null, keyEnv: null, temperature: 0.8, maxTokens: 3000, extraBody: null },
};

/** Options: defaults, then the config file, then the command line. */
export function options(argv = process.argv.slice(2), env = process.env) {
    const flag = (k) => argv.includes(k);
    const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
    const cfgFile = arg('--config') || CONFIG_FILE;
    const file = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, 'utf8')) : {};
    const o = { ...DEFAULTS, ...file, player: { ...DEFAULTS.player, ...(file.player || {}) }, configFile: fs.existsSync(cfgFile) ? cfgFile : null };
    o.stDir = arg('--st') || o.stDir || env.AVERETH_ST_DIR || null;
    for (const [k, f] of [['stUser', '--user'], ['card', '--card'], ['preset', '--preset'], ['guide', '--guide'], ['browser', '--browser'], ['runsDir', '--runs'], ['stData', '--st-data']]) if (arg(f)) o[k] = arg(f);
    if (arg('--player')) o.player.type = arg('--player');
    if (arg('--seed')) o.seed = Number(arg('--seed'));
    if (arg('--max-turns')) o.maxTurns = Number(arg('--max-turns'));
    if (arg('--port')) o.port = Number(arg('--port'));
    if (flag('--headed')) o.headless = false;
    if (flag('--keep-profile')) o.keepProfile = true;
    o.stub = flag('--stub');
    o.check = flag('--check');
    o.inspect = flag('--inspect');
    o.ping = flag('--ping');
    return o;
}

/** Where the run folders go: tools/st_live/runs, unless that lies in the SillyTavern installation (the extension cloned there). */
export function runsDirFor(o, imp) {
    const want = path.resolve(o.runsDir || DEFAULT_RUNS);
    const inside = [imp.st.dir, imp.st.dataRoot].some((p) => isInside(p, want));
    if (!inside) return want;
    if (o.runsDir) throw new Error(`the runs folder ${want} lies inside the SillyTavern installation; choose another one`);
    return path.join(os.homedir(), 'avereth-live-runs');
}

export function gitInfo() {
    const run = (c) => execSync(c, { cwd: ENGINE, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    try {
        return { commit: run('git rev-parse --short=12 HEAD'), branch: run('git rev-parse --abbrev-ref HEAD'), dirty: run('git status --porcelain').split('\n').filter(Boolean).map((l) => l.slice(3)).filter((f) => !/^tools\/st_live\/(runs|live\.config\.json)/.test(f.replace(/^avereth-engine\//, ''))) };
    } catch { return null; }
}

const buildOf = () => { const m = /ENGINE_VERSION\s*=\s*'([^']+)'/.exec(fs.readFileSync(path.join(ENGINE, 'src', 'util.js'), 'utf8')); return m ? m[1] : '?'; };

// ------------------------------------------------------------------------------------------------ --check
export async function check(o) {
    const rows = [];
    const ok = (good, what, detail = '') => rows.push({ good, what, detail });
    ok(Number(process.versions.node.split('.')[0]) >= 20, 'Node.js ≥ 20', process.version);
    const pw = loadPlaywright();
    ok(!!pw, 'Playwright (playwright oder playwright-core)', pw ? 'gefunden' : 'npm install -g playwright-core  (oder im Repo: npm install --no-save playwright-core)');
    if (pw) {
        try { const b = await launchBrowser(pw, { browser: o.browser, headless: true }); ok(true, 'Browser', `${b.name} ${b.version}`); await b.browser.close(); } catch (e) { ok(false, 'Browser', `${e.message} — Chrome von google.com/chrome installieren (Standardort), oder: npx playwright-core install chromium und "browser": "chromium"`); }
    }
    let imp = null;
    ok(!!o.stDir && fs.existsSync(path.join(o.stDir, 'server.js')), 'SillyTavern-Installation', o.stDir || 'nicht gesetzt: "stDir" in live.config.json, --st oder AVERETH_ST_DIR');
    if (o.stDir && fs.existsSync(path.join(o.stDir, 'node_modules'))) ok(true, 'SillyTavern-Abhängigkeiten', 'node_modules vorhanden');
    else if (o.stDir) ok(false, 'SillyTavern-Abhängigkeiten', 'node_modules fehlt: SillyTavern einmal normal starten (Start.bat)');
    try { imp = importProfile({ stDir: o.stDir, user: o.stUser, card: o.card, preset: o.preset, dataRoot: o.stData }); ok(true, 'Profil lesbar (nur lesend)', `${imp.st.userDir}, SillyTavern ${imp.st.version}`); } catch (e) { ok(false, 'Profil lesbar', String(e.message)); }
    if (imp) {
        ok(imp.route.same, 'Dieselbe Verbindung wie dein SillyTavern', imp.route.same ? routeText(imp.route.runner, { keyFrom: o.keyEnv }) : imp.route.differences.join('; '));
        if (imp.source !== 'custom') ok(true, 'Hinweis', `Quelle "${imp.source}" statt "custom": die Engine-Aufrufe laufen über generateRaw, ohne Metadaten in den Records${o.player.type === 'llm' && !imp.route.runner.url && !o.player.url ? '; der LLM-Spieler braucht player.url und player.model' : ''}`);
        ok(!!imp.card, 'Avereth-Karte im Profil', imp.card ? `${imp.card.name} (Vertrag ${imp.card.contract})` : 'keine: der Runner nimmt seine eigene Karte und Begrüßung');
        for (const w of imp.warnings) ok(true, 'Hinweis', w);
        for (const d of imp.dropped) ok(true, 'nicht übernommen', `${d.key}: ${d.why}`);
    }
    const key = process.env[o.keyEnv];
    ok(!!key, `API-Schlüssel in ${o.keyEnv}`, key ? `gesetzt (${key.length} Zeichen)` : `nicht gesetzt: PowerShell  $env:${o.keyEnv}="…"`);
    if (o.player.type === 'llm' && o.player.keyEnv && o.player.keyEnv !== o.keyEnv) ok(!!process.env[o.player.keyEnv], `Spieler-Schlüssel in ${o.player.keyEnv}`, process.env[o.player.keyEnv] ? 'gesetzt' : 'nicht gesetzt');
    try { const g = loadGuide(o.guide); ok(true, 'Leitfaden', `${g.chain.join(' → ')} (${g.milestones.length} Etappen)`); } catch (e) { ok(false, 'Leitfaden', e.message); }
    try { const p = await freePort(o.port); ok(true, 'Port', p === o.port ? `${p} frei` : `${o.port} belegt, nehme ${p}`); } catch (e) { ok(false, 'Port', String(e.message)); }
    if (imp) { try { const d = runsDirFor(o, imp); ok(true, 'Laufordner', d); } catch (e) { ok(false, 'Laufordner', e.message); } }
    if (o.ping && imp) for (const r of await preflight(o, imp, key)) ok(r.good, r.what, r.detail);
    for (const r of rows) console.log(`${r.good ? '✔' : '✖'} ${r.what}${r.detail ? ` — ${r.detail}` : ''}`);
    const bad = rows.filter((r) => !r.good);
    console.log(bad.length ? `\n${bad.length} Voraussetzung(en) fehlen.` : '\nAlles bereit für einen Live-Lauf.');
    return bad.length ? 1 : 0;
}

/** --ping: the endpoint's model list against the profile's model (and the player's, when it has its own). */
export async function preflight(o, imp, key, { fetchImpl = fetch } = {}) {
    const r = imp.route.runner;
    if (!r.url) return [{ good: true, what: 'Endpoint (GET /models)', detail: `Quelle "${r.source}" ohne eigene URL im Profil (die API der Quelle): nicht geprüft` }];
    const p = await probeModels({ url: r.url, key, model: r.model, fetchImpl });
    const rows = probeRows(p, { model: r.model, who: 'SillyTavern' });
    if (o.player.type === 'llm' && (o.player.model && o.player.model !== r.model || o.player.url && o.player.url !== r.url)) {
        const pk = o.player.keyEnv ? process.env[o.player.keyEnv] : key;
        const q = await probeModels({ url: o.player.url || r.url, key: pk, model: o.player.model || r.model, fetchImpl });
        rows.push(...probeRows(q, { model: o.player.model || r.model, who: 'Spieler' }).map((x) => ({ ...x, what: `${x.what} [Spieler]` })));
    }
    return rows;
}

// ------------------------------------------------------------------------------------------------ a run
export async function run(o) {
    const startedAt = Date.now();
    const log = (s) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
    const imp = importProfile({ stDir: o.stDir, user: o.stUser, card: o.card, preset: o.preset, dataRoot: o.stData });
    const guide = loadGuide(o.guide);
    if (o.maxTurns) guide.limits.maxTurns = o.maxTurns;
    const seed = Number.isFinite(o.seed) ? o.seed : Math.floor(Math.random() * 2 ** 31);
    const persona = o.player.type === 'llm' ? pick(guide.personas, seed) : null;
    let runId = `${stamp()}-${guide.id}${o.stub ? '-stub' : ''}`;
    const runsDir = runsDirFor(o, imp);
    for (let k = 2; fs.existsSync(path.join(runsDir, runId)); k++) runId = `${runId.replace(/-\d+$/, '')}-${k}`;
    const runDir = path.join(runsDir, runId);
    const profileBefore = treeStat(imp.st.userDir);

    let stub = null;
    let key;
    if (o.stub) {
        stub = await startStub({ key: STUB_KEY });
        key = STUB_KEY;
        // the profile's route, its URL the stub's: a reverse proxy stays a reverse proxy
        if (imp.route.runner.via === 'reverse_proxy') imp.connection = { ...imp.connection, reverse_proxy: stub.url, [modelKeyOf(imp.source)]: STUB_MODEL, bypass_status_check: false };
        else { imp.source = 'custom'; imp.connection = { chat_completion_source: 'custom', custom_url: stub.url, custom_model: STUB_MODEL, bypass_status_check: false }; }
        imp.route = { ...imp.route, runner: routeOf(imp.connection), same: false, differences: ['Stub-Provider statt des Endpoints deines Profils'] };
    } else {
        key = process.env[o.keyEnv];
        if (!key) throw new Error(`no API key: set the environment variable ${o.keyEnv} (it is never read from the profile)`);
    }
    // the provider before anything starts: the model the profile names must be on offer (a proxy's narrowed list)
    let preflightResult = null;
    if (imp.route.runner.url) {
        const p = await probeModels({ url: imp.route.runner.url, key, model: imp.route.runner.model });
        preflightResult = { endpoint: p.endpoint, reachable: p.reachable, status: p.status, models: p.ids, found: p.found, error: p.error };
        const block = probeBlocks(p);
        if (block) { await stub?.close(); throw new Error(`Preflight, nichts gestartet: ${probeRows(p, { model: imp.route.runner.model }).filter((x) => !x.good).map((x) => `${x.what}: ${x.detail}`).join(' ') || block}`); }
        log(`preflight: ${p.endpoint} ${p.ids ? `offers ${p.ids.length} model(s), "${imp.route.runner.model}" among them` : `(${p.error}; model not checkable)`}`);
    }
    const playerKey = o.stub ? STUB_KEY : o.player.keyEnv ? process.env[o.player.keyEnv] : key;
    const inst = createInstance({ runId, protect: [imp.st.dir, imp.st.dataRoot, imp.st.userDir], runDir });
    const g = inst.guard;
    g.mkdir(runDir);
    g.mkdir(path.join(runDir, 'screens'));
    log(`run ${runId}${o.stub ? ' (STUB: no live test)' : ''}`);
    log(`guide ${guide.chain.join(' → ')}, player ${o.player.type}${persona ? ` (${persona.split(':')[0]})` : ''}, seed ${seed}`);
    log(`isolated instance ${inst.root}`);

    const playerLog = [];
    const turnsLog = [];
    const sends = [];
    let server = null;
    let br = null;
    let driver = null;
    let setup = null;
    let conn = null;
    let opened = null;
    let end = null;
    let chat = null;
    let slow = [];
    let statusLine = '';
    let toasts = [];
    let firstTurnAt = null;
    const port = await freePort(o.port);
    // Ctrl+C: the first ends the run after the current wait (the run folder is still written), the second at once
    let interrupted = 0;
    const onInt = async () => {
        interrupted += 1;
        if (driver) driver.aborted = true;
        if (interrupted === 1) { log('interrupted: ending the run (Ctrl+C again to stop at once)'); return; }
        try { await server?.stop(); } catch { /* stopped */ }
        try { removeKey(inst); if (!o.keepProfile) removeInstance(inst); } catch { /* best effort */ }
        process.exit(130);
    };
    process.on('SIGINT', onInt);
    try {
        writeConfig(inst, port);
        server = await startServer({ stDir: imp.st.dir, inst, port, logFile: path.join(runDir, 'server.log'), timedFile: path.join(runDir, 'server.timed.log') });
        log(`SillyTavern ${imp.st.version} on ${server.url} (${(server.startMs / 1000).toFixed(1)} s)`);
        setup = seedProfile(inst, imp, { key });
        setup.host = (() => { try { return new URL(imp.route.runner.url || '').host; } catch { return null; } })();
        const pw = loadPlaywright();
        if (!pw) throw new Error('Playwright is not installed (npm install -g playwright-core)');
        br = await launchBrowser(pw, { browser: o.browser, headless: o.headless });
        driver = await Driver.create(br.browser, { turnTimeoutMs: o.turnTimeoutSec * 1000 });
        conn = await driver.open(server.url);
        log(`page open: ${conn.source} ${conn.model || ''}, ${conn.connected ? 'connected' : `NOT connected (${conn.status})`}`);
        if (!conn.connected) { end = { kind: 'ui', why: `no connection to the provider (status "${conn.status}"); a provider without /models needs "Bypass status check" in the profile` }; throw new Error('stop'); }
        if (conn.source !== imp.source || conn.stream) driver.setupNotes.push(`the page shows source ${conn.source}, streaming ${conn.stream}`);
        opened = await driver.openCard(setup.card, { chatName: `Avereth Live ${runId}` });
        if (!opened.started) {
            await driver.screenshot(g.check(path.join(runDir, 'screens', 'greeting-no-campaign.png')));
            log('no campaign at the greeting: noted; the engine starts it with the first message');
        } else log(`campaign started in chat "${opened.chatId}"`);

        const player = o.player.type === 'scripted'
            ? scriptedPlayer({ steps: guide.scripted || [] })
            : llmPlayer({
                guide, username: imp.username, persona,
                url: o.player.url || imp.route.runner.url, model: o.player.model || imp.route.runner.model, key: playerKey,
                temperature: o.player.temperature, maxTokens: o.player.maxTokens, extraBody: o.player.extraBody, record: (e) => playerLog.push({ at: new Date().toISOString(), ...e }),
            });
        if (o.player.type === 'llm' && !(o.player.url || imp.route.runner.url)) throw new Error('the LLM player needs an OpenAI-compatible URL: player.url in live.config.json');
        const maxTurns = guide.limits.maxTurns;
        const t0 = Date.now();
        let since = 0;
        let lastReached = 0;
        for (let turn = 1; ; turn++) {
            if (interrupted) { end = { kind: 'harness', why: 'interrupted (Ctrl+C)' }; break; }
            if (turn > maxTurns) { end = { kind: 'limit', why: `${maxTurns} turns` }; break; }
            if (Date.now() - t0 > guide.limits.maxMinutes * 60000) { end = { kind: 'limit', why: `${guide.limits.maxMinutes} minutes` }; break; }
            const view = await driver.view();
            const td = Date.now();
            const d = await player.decide(view, { turn, maxTurns });
            const decideMs = Date.now() - td;
            if (!firstTurnAt) firstTurnAt = td;
            if (o.player.type === 'scripted') playerLog.push({ at: new Date().toISOString(), turn, decision: d });
            if (playerLog.length) playerLog.at(-1).screen = screenText(view);
            if (d.stop) { end = { kind: d.harness ? 'harness' : d.stop_reason === 'done' ? 'player_done' : 'player_stop', why: d.stop_reason }; log(`player stops: ${d.stop_reason}`); break; }
            log(`turn ${turn}: ${clip(d.message, 100)}`);
            sends.push({ turn, at: Date.now() });
            const r = await driver.send(d.message);
            turnsLog.push({ turn, text: d.message, decision: d, decideMs, ...r });
            if (!r.ok && interrupted) { end = { kind: 'harness', why: `interrupted (Ctrl+C) in turn ${turn}` }; break; }
            if (!r.ok) {
                await driver.screenshot(g.check(path.join(runDir, 'screens', `turn-${String(turn).padStart(3, '0')}-problem.png`)));
                end = { kind: 'ui', why: `turn ${turn}: ${r.problem}` };
                log(`stopped: ${r.problem}`);
                break;
            }
            chat = await driver.chat();
            if (!(chat[0]?.extra?.avereth?.events || []).some((e) => e.t === 'campaign.started')) { end = { kind: 'ui', why: `the engine started no campaign, neither at the greeting nor with the message of turn ${turn}` }; break; }
            const ev = evaluate(chat, { guide });
            if (ev.defeat) { await driver.screenshot(g.check(path.join(runDir, 'screens', `turn-${String(turn).padStart(3, '0')}-defeat.png`))); end = { kind: 'defeat', why: `turn ${ev.defeat.turn}: ${ev.defeat.why}` }; break; }
            if (finished(ev)) { end = { kind: 'done', why: null }; log('all required milestones reached'); break; }
            // a milestone that takes far too long: marked slow past its budget, the run stops at three times it
            const reachedNow = ev.milestones.filter((m) => m.required && m.reached).length;
            if (reachedNow > lastReached) { lastReached = reachedNow; since = turn; }
            const nx = nextMilestone(ev);
            if (nx) {
                const budget = guide.milestones.find((m) => m.id === nx.id)?.maxTurns;
                if (budget && turn - since > budget && !slow.includes(nx.id)) slow.push(nx.id);
                if (budget && turn - since > 3 * budget) { end = { kind: 'stuck', why: `${nx.id} not reached in ${turn - since} turns (budget ${budget})` }; break; }
            }
        }
    } catch (e) {
        if (e.message !== 'stop') { end = end || { kind: 'harness', why: String(e.message || e).slice(0, 500) }; log(`error: ${e.stack || e}`); }
    } finally {
        try { if (driver) { await driver.save(); chat = await driver.chat(); statusLine = await driver.status(); toasts = await driver.toasts(); await driver.screenshot(g.check(path.join(runDir, 'screens', 'final.png'))); } } catch (e) { log(`could not read the page at the end: ${e.message}`); }
        try { await br?.browser.close(); } catch { /* closed */ }
        try { await server?.stop(); } catch { /* stopped */ }
        try { await stub?.close(); } catch { /* closed */ }
        // the key is needed only while SillyTavern runs
        try { removeKey(inst); } catch (e) { log(`could not remove the instance's key file: ${e.message}`); }
        process.off('SIGINT', onInt);
    }
    end = end || { kind: 'harness', why: 'the run ended without a reason' };
    const endedAt = Date.now();
    const total = (xs) => xs.filter(Number.isFinite).reduce((a, b) => a + b, 0);
    const timing = { totalMs: endedAt - startedAt, stStartMs: server?.startMs ?? null, setupMs: firstTurnAt ? firstTurnAt - startedAt : null, turns: turnsLog.length, gameMs: total(turnsLog.map((t) => t.ms)), decideMs: total(turnsLog.map((t) => t.decideMs)) };

    try {
        // ---------------------------------------------------------------------------------------------- the run folder
        const files = [];
        const put = (name, data, what) => { g.write(path.join(runDir, name), data); files.push([name, what]); };
        const cf = setup ? chatFiles(inst, setup.card) : [];
        const chatFile = cf.find((f) => opened?.chatId && path.basename(f, '.jsonl') === opened.chatId) || cf.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
        let messages = chat || [];
        if (chatFile) {
            const text = fs.readFileSync(chatFile, 'utf8');
            put('chat.jsonl', text, 'der vollständige Chat, wie SillyTavern ihn speichert');
            messages = readChatJsonl(text).messages;
        }
        put('avereth-events.json', JSON.stringify(eventsLog(messages), null, 1), 'die Ereignisse der Engine (Format des Buttons „Export event log“)');
        const logText = fs.existsSync(path.join(runDir, 'server.log')) ? fs.readFileSync(path.join(runDir, 'server.log'), 'utf8') : '';
        files.push(['server.log', 'die Konsole der isolierten SillyTavern-Instanz (alle Requests und Antworten)'], ['server.timed.log', 'dieselbe Konsole mit Uhrzeit je Zeile']);
        const { calls, errors: callErrors } = parseCalls(logText, server?.markers || [], sends);
        put('chat-completions.jsonl', jsonl(calls.map((c) => ({ n: c.n, role: c.role, repair: c.repair, turn: c.turn, at: c.at, ms: c.ms, ...c.full }))), 'jeder Chat-Completion-Request mit seiner Antwort');
        put('calls.json', JSON.stringify(calls.map(({ full, ...c }) => c), null, 1), 'je Aufruf: Rolle, Modell, Zeit, Tokens, finish_reason, Reparatur');
        put('player.jsonl', jsonl(playerLog), 'jede Entscheidung des Spielers mit dem Bildschirmtext, den er sah');
        const ev = evaluate(messages, { guide });
        put('evaluation.json', JSON.stringify({ end, ...ev }, null, 1), 'die Auswertung (Etappen, Kämpfe, Quests, Auffälligkeiten)');
        const driverNotes = [...(driver?.setupNotes || []), ...callErrors.slice(0, 5).map((e) => `server log: ${e}`)];
        put('run.json', JSON.stringify({ runId, stub: !!stub, seed, persona, guide: { id: guide.id, chain: guide.chain, files: guide.files.map((f) => path.relative(ENGINE, f)) }, end, timing, preflight: preflightResult, route: imp.route, setup, conn, chatId: opened?.chatId || null, turns: turnsLog.map(({ decision, ...t }) => ({ ...t, milestone: decision?.milestone || null })), status: statusLine, toasts, pageErrors: driver?.pageErrors || [], serverErrors: server?.errors || [], notes: driverNotes, stubCalls: stub ? stub.calls : undefined }, null, 1), 'Ablauf des Laufs: Züge, Zeiten, Hinweise, Seitenfehler, Statuszeile');
        put('import.json', JSON.stringify({ ...imp, preset: { ...imp.preset, text: undefined, sha256: imp.preset.text ? sha256(Buffer.from(imp.preset.text)) : null } }, null, 1), 'was aus dem Profil übernommen wurde (ohne Schlüssel)');

        const changedRead = changedSince(imp.read);
        const tree = treeDiff(profileBefore, treeStat(imp.st.userDir));
        const protection = { unchanged: !changedRead.length && tree.same, changedRead, tree, files: profileBefore.size };
        // the key scan over every file written so far, then the report with its result, then the report itself scanned
        const secrets = [...new Set([key, playerKey, process.env[o.keyEnv]].filter(Boolean))];
        const scan = secretScan(runDir, secrets, g);
        const report = buildReport({
            runId, stub: !!stub, guide, player: o.player.type === 'llm' ? { type: 'llm', model: o.player.model || imp.route.runner.model, endpoint: (() => { try { return new URL(o.player.url || imp.route.runner.url).host; } catch { return '?'; } })(), temperature: o.player.temperature, persona } : { type: 'scripted', steps: (guide.scripted || []).length },
            end, ev, calls, setup: setup || { source: imp.source, card: '?', world: '?', greeting: '?' }, imp, git: gitInfo(), build: buildOf(), st: { version: imp.st.version, dir: imp.st.dir, port, startMs: server?.startMs },
            browser: { name: br?.name || '?', version: br?.version || '?', headless: o.headless }, turnsLog, playerLog, driverNotes, toasts, pageErrors: driver?.pageErrors || [], serverErrors: server?.errors || [],
            protection, scan, files: [...files, ['report.md', 'dieser Bericht'], ['screens/', 'Bildschirmfotos (Ende, Probleme)']], startedAt, endedAt, instanceKept: o.keepProfile ? inst.root : null,
            chatId: opened?.chatId, seed, slow, timing, preflight: preflightResult, keyEnv: o.keyEnv, worldSame: imp.world ? imp.world.sha256 === sha256(fs.readFileSync(WORLD_FILE)) : null,
        });
        put('report.md', report, 'dieser Bericht');
        const again = secretScan(runDir, secrets, g);
        scan.hits.push(...again.hits);
        if (scan.hits.length) log(`SECRET SCAN: ${scan.hits.length} hit(s) blanked (${scan.hits.map((h) => h.file).join(', ')})`);
        log(`time: ${Math.round(timing.totalMs / 60000)} min in all, ${timing.turns} turns, ${timing.turns ? `${Math.round((timing.gameMs + timing.decideMs) / timing.turns / 1000)} s per turn (game ${Math.round(timing.gameMs / Math.max(1, timing.turns) / 1000)} s, player ${Math.round(timing.decideMs / Math.max(1, timing.turns) / 1000)} s)` : 'no turn'}`);
        log(`result: ${end.kind}${end.why ? ` (${end.why})` : ''}; milestones ${ev.milestones.filter((m) => m.required && m.reached).length}/${ev.milestones.filter((m) => m.required).length}; profile unchanged: ${protection.unchanged}; secret scan: ${scan.hits.length ? 'HITS' : 'clean'}`);
        log(`run folder: ${runDir}`);
        return { runDir, end, ev, protection, scan, calls, stub, inst, playerLog, turnsLog };
    } finally {
        if (!o.keepProfile) { try { removeInstance(inst); } catch (e) { log(`could not remove the isolated instance ${inst.root}: ${e.message}`); } }
    }
}

async function main() {
    const o = options();
    if (o.check) process.exit(await check(o));
    try {
        if (o.inspect) {
            const imp = importProfile({ stDir: o.stDir, user: o.stUser, card: o.card, preset: o.preset, dataRoot: o.stData });
            console.log(describeImport(imp, { keyEnv: o.keyEnv }));
            if (o.ping) for (const r of await preflight(o, imp, process.env[o.keyEnv])) console.log(`${r.good ? '✔' : '✖'} ${r.what}${r.detail ? ` — ${r.detail}` : ''}`);
            return;
        }
        const r = await run(o);
        process.exit(r.end.kind === 'done' ? 0 : r.end.kind === 'harness' ? 1 : 2);
    } catch (e) {
        console.error(`Fehler: ${e.message}\n(Voraussetzungen prüfen: npm run live:st:check)`);
        process.exit(1);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
