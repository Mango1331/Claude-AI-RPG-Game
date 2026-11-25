import { loadContentPack } from '../../../src/content.js';
import { validateState } from '../../../src/validate.js';
import { foldChat } from '../../../src/host.js';
import { makeClassFixture, CLASS_FIXTURES } from './class_fixture.mjs';
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
// --read-pause-ms <0..60000> (natural batch defaults to 5000; single runs default to 0)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ENGINE, stamp, pick, isInside, changedSince, treeStat, treeDiff, sha256, clip } from './lib.mjs';
import { importProfile, describeImport, routeOf, routeText, modelKeyOf } from './import_profile.mjs';
import { OPENROUTER_URL, OPENROUTER_MODEL, OPENROUTER_PROVIDER, OPENROUTER_REASONING_EFFORT, openRouterPlayerExtraBody, useOpenRouter } from './openrouter.mjs';
import { probeModels, probeRows, probeBlocks, probePlayer, playerRows } from './preflight.mjs';
import { createInstance, writeConfig, seedProfile, chatFiles, removeKey, removeInstance, WORLD_FILE } from './profile.mjs';
import { startServer, freePort } from './server.mjs';
import { loadPlaywright, launchBrowser, Driver } from './driver.mjs';
import { llmPlayer, scriptedPlayer, screenText, playerReasoning } from './players.mjs';
import { loadGuide } from './guide.mjs';
import { scenarioById, scenarioGuide, scenarioMismatch } from './scenarios.mjs';
import { evaluate, finished, nextMilestone, turnOutcome, turnFailure, softExtractionFailure, driverFailure, failureEnd, settled, openMilestones, startRecordProblem, assessFinalIntegrity } from './evaluator.mjs';
import { parseCalls } from './calls.mjs';
import { savedPrefixMatches } from '../../../src/v4/continuation.js';
import { readChatJsonl, eventsLog, jsonl, secretScan } from './export.mjs';
import { buildReport } from './report.mjs';
import { startStub, STUB_MODEL } from './stub_provider.mjs';
import { npcPulseExports, npcPulseFailed, withAnalysisReport } from './npc_pulse.mjs';

export const CONFIG_FILE = path.join(ENGINE, 'tools', 'st_live', 'live.config.json');

/** The terminal fixture check uses the same restored chat as the start, never a fresh welcome-screen campaign. */
export async function verifyFixtureReload(driver, chat) {
    const before = foldChat(chat).state;
    await driver.reload();
    const after = foldChat(await driver.chat()).state;
    return JSON.stringify(before.entities.pc.sheet) === JSON.stringify(after.entities.pc.sheet) && JSON.stringify(before.career) === JSON.stringify(after.career);
}
/** Double only the six BASE attributes in the isolated helper-runner's copied start file.
 * The normal product content, all NPCs, class favoured bonuses and level-up rules stay untouched.
 * Must be called after seedProfile and before opening the character/card in the browser.
 */
export function applyIsolatedHelperStartStats(inst, enabled = false) {
    if (!enabled) return null;
    const file = path.join(inst.user, 'extensions', 'avereth-engine', 'content', 'campaign_start.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const before = data.pc?.stats;
    const names = ['STR', 'VIT', 'AGI', 'INT', 'PER', 'WIL'];
    if (!before || Object.keys(before).length !== names.length ||
        names.some(name => !Number.isInteger(before[name]) || before[name] < 1))
        throw new Error('Runner test bonus: unexpected campaign starting stats; no changes made');
    const after = Object.fromEntries(names.map(name => [name, before[name] * 2]));
    data.pc.stats = after;
    inst.guard.write(file, JSON.stringify(data, null, 2) + '\n');
    return { kind: 'isolated_runner_start_stats', multiplier: 2, before, after };
}

export const DEFAULT_RUNS = path.join(ENGINE, 'tools', 'st_live', 'runs');
/** A failed X record still blocks the native ST Action HUD; another player message cannot resume it. */
export function nativeCompletionBlocksContinuation(fault, chat) {
    if (fault?.kind !== 'extractor_failed') return false;
    const status = chat?.[fault.at]?.extra?.avereth?.extraction?.status;
    return status === 'failed' || status === 'pending';
}

export const STUB_KEY = 'stub-key-not-a-real-key-0000';
export const DEFAULTS = {
    stDir: null, stUser: 'default-user', stData: null, card: null, preset: 'profile', port: 8123, browser: 'auto', headless: true,
    keyEnv: 'AVERETH_LIVE_API_KEY', guide: 'guild_dungeon_loop', seed: null, maxTurns: null, turnTimeoutSec: 900, runsDir: null, keepProfile: false, readPauseMs: 0,
    openrouter: false, openrouterModel: null,
    player: { type: 'llm', url: null, model: null, keyEnv: null, temperature: 0.8, maxTokens: 3000, reasoning: 'profile', extraBody: null },
};

/** The open required milestones in a line: "10/11 required reached; open: x (not performed: why), y". */
export function openText(ev) {
    const req = ev.milestones.filter((m) => m.required);
    const open = openMilestones(ev);
    return `${req.length - open.length}/${req.length} required reached; open: ${open.map((m) => (m.unavailable ? `${m.id} (not performed: ${m.unavailable})` : m.id)).join(', ')}`;
}

/** The end of a run the player reported done: done when the engine booked every required milestone, else incomplete. */
export function doneEnd(ev) {
    return finished(ev) ? { kind: 'done', why: 'the player reported done; every required milestone is reached' } : { kind: 'incomplete', why: `the player reported done; ${openText(ev)}` };
}

/** Options: defaults, then the config file, then the command line. */
export function options(argv = process.argv.slice(2), env = process.env) {
    const flag = (k) => argv.includes(k);
    const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
    const cfgFile = arg('--config') || CONFIG_FILE;
    const file = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, 'utf8')) : {};
    const o = { ...DEFAULTS, ...file, player: { ...DEFAULTS.player, ...(file.player || {}) }, configFile: fs.existsSync(cfgFile) ? cfgFile : null };
    o.stDir = arg('--st') || o.stDir || env.AVERETH_ST_DIR || null;
    for (const [k, f] of [['stUser', '--user'], ['card', '--card'], ['preset', '--preset'], ['guide', '--guide'], ['browser', '--browser'], ['runsDir', '--runs'], ['stData', '--st-data']]) if (arg(f)) o[k] = arg(f);
    if (arg('--fixture')) o.fixture = arg('--fixture');
    if (o.fixture && !CLASS_FIXTURES.includes(o.fixture)) throw new Error(`Unknown fixture ${o.fixture}`);
    if (arg('--player')) o.player.type = arg('--player');
    if (arg('--scenario')) o.scenario = arg('--scenario');
    if (o.scenario) { scenarioById(o.scenario); if (o.fixture || o.player.type !== 'llm') throw new Error('scenarios require the LLM player and no fixture'); }
    if (arg('--seed')) o.seed = Number(arg('--seed'));
    // A configured default must not silently shorten a guide's explicit open-world observation window.
    // Only the --max-turns CLI flag is a deliberate per-run override of that guide's horizon.
    o.maxTurnsExplicit = arg('--max-turns') !== null;
    if (o.maxTurnsExplicit) o.maxTurns = Number(arg('--max-turns'));
    if (arg('--port')) o.port = Number(arg('--port'));
    const pauseIndex = argv.indexOf('--read-pause-ms');
    if (pauseIndex >= 0) o.readPauseMs = Number(argv[pauseIndex + 1]);
    if (flag('--headed')) o.headless = false;
    if (flag('--keep-profile')) o.keepProfile = true;
    if (arg('--key-env')) o.keyEnv = arg('--key-env');
    o.openrouter = flag('--openrouter') || o.openrouter === true || o.provider === 'openrouter';
    if (o.openrouter) {
        // The isolated single runner must never inherit a stale Featherless player endpoint,
        // model, provider-specific request body or key name from an older local config.
        o.openrouterModel = arg('--model') || o.openrouterModel || OPENROUTER_MODEL;
        o.guide = arg('--guide') || 'natural_helper_progression';
        o.preset = arg('--preset') || 'repo';
        o.keyEnv = arg('--key-env') || 'AVERETH_LIVE_API_KEY';
        o.player = { ...o.player, type: 'llm', url: OPENROUTER_URL, model: o.openrouterModel,
            keyEnv: null, reasoning: 'profile', extraBody: openRouterPlayerExtraBody() };
    } else if (arg('--model')) {
        throw new Error('--model requires --openrouter (other runs use the SillyTavern profile)');
    }
    if (o.openrouter && o.guide === 'natural_helper_progression' && pauseIndex < 0 && file.readPauseMs == null)
        o.readPauseMs = 5000;
    if (!Number.isInteger(o.readPauseMs) || o.readPauseMs < 0 || o.readPauseMs > 60000)
        throw new Error('--read-pause-ms must be an integer from 0 to 60000');
    o.stub = flag('--stub');
    o.check = flag('--check');
    o.inspect = flag('--inspect');
    o.ping = flag('--ping');
    return o;
}

/**
 * A reading pause before the next live LLM player request. It does not slow the Planner/Narrator/Extractor requests inside one ST turn.
 * Inject wait/stopped for quick regression tests without real sleeping.
 */
export async function pauseBeforePlayer(o, { wait = ms => new Promise(resolve => setTimeout(resolve, ms)), stopped = () => false } = {}) {
    if (stopped()) return false;
    if (o.player?.type === 'llm' && !o.stub && o.readPauseMs > 0) await wait(o.readPauseMs);
    return !stopped();
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
    try { imp = useOpenRouter(importProfile({ stDir: o.stDir, user: o.stUser, card: o.card, preset: o.preset, dataRoot: o.stData }), o); ok(true, 'Profil lesbar (nur lesend)', `${imp.st.userDir}, SillyTavern ${imp.st.version}`); } catch (e) { ok(false, 'Profil lesbar', String(e.message)); }
    if (imp) {
        if (o.openrouter) ok(true, 'OpenRouter nur in der isolierten Instanz', routeText(imp.route.runner, { keyFrom: o.keyEnv }));
        else ok(imp.route.same, 'Dieselbe Verbindung wie dein SillyTavern', imp.route.same ? routeText(imp.route.runner, { keyFrom: o.keyEnv }) : imp.route.differences.join('; '));
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
    // Patch 8.4.1: the player's reasoning fields, and whether the endpoint takes them
    if (o.player.type === 'llm') {
        const reasoning = playerReasoning(imp, o.player);
        const pk = o.player.keyEnv ? process.env[o.player.keyEnv] : key;
        rows.push(...playerRows(await probePlayer({ url: o.player.url || r.url, key: pk, model: o.player.model || r.model, body: { ...reasoning.body, ...(o.player.extraBody || {}) }, fetchImpl }), reasoning));
    }
    return rows;
}

/** Config maxTurns is the old default for milestone guides, not a limit on a longer open run.
 * An explicit CLI override is respected but must leave the entire observation window possible. */
export function resolveTurnLimit(guide, o) {
    const explicit = o.maxTurnsExplicit === true;
    if (explicit || (!guide.openRun && o.maxTurns != null)) {
        if (!Number.isInteger(o.maxTurns) || o.maxTurns < 1) throw new Error('--max-turns must be a positive integer');
        guide.limits.maxTurns = o.maxTurns;
    }
    if (guide.openRun && guide.limits.maxTurns < guide.openRun.minTurns) {
        throw new Error(`open-run requires at least ${guide.openRun.minTurns} turns; --max-turns cannot be shorter`);
    }
    return guide.limits.maxTurns;
}

// ------------------------------------------------------------------------------------------------ a run
export async function run(o) {
    const startedAt = Date.now();
    const log = (s) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
    const imp = useOpenRouter(importProfile({ stDir: o.stDir, user: o.stUser, card: o.card, preset: o.preset, dataRoot: o.stData }), o);
    const guide = scenarioGuide(loadGuide(o.guide), o.scenario);
    if (guide.fixture && !o.fixture) throw new Error(`This explicit fixture guide requires --fixture ${guide.fixture}`);
    if (guide.openRun && o.fixture) throw new Error('current_test is a natural campaign: do not pass --fixture');
    resolveTurnLimit(guide, o);
    const seed = Number.isFinite(o.seed) ? o.seed : Math.floor(Math.random() * 2 ** 31);
    const persona = o.player.type === 'llm' ? pick(guide.personas, seed) : null;
    let runId = `${stamp()}-${guide.id}${o.stub ? '-stub' : ''}`;
    const runsDir = runsDirFor(o, imp);
    for (let k = 2; fs.existsSync(path.join(runsDir, runId)); k++) runId = `${runId.replace(/-\d+$/, '')}-${k}`;
    const runDir = path.join(runsDir, runId);
    const profileBefore = treeStat(imp.st.userDir);
    const readPauseMs = o.player.type === 'llm' && !o.stub ? o.readPauseMs : 0;

    let stub = null;
    let key;
    if (o.stub) {
        stub = await startStub({ key: STUB_KEY });
        key = STUB_KEY;
        // the profile's route, its URL the stub's: a reverse proxy stays a reverse proxy
        if (imp.route.runner.via === 'reverse_proxy') imp.connection = { ...imp.connection, reverse_proxy: stub.url, [modelKeyOf(imp.source)]: STUB_MODEL, bypass_status_check: false };
        else if (imp.source === 'custom') imp.connection = { ...imp.connection, custom_url: stub.url, custom_model: STUB_MODEL, bypass_status_check: false };
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
    const playerUrl = stub?.url || o.player.url || imp.route.runner.url;
    const playerModel = stub ? STUB_MODEL : o.player.model || imp.route.runner.model;
    const playerKey = o.stub ? STUB_KEY : o.player.keyEnv ? process.env[o.player.keyEnv] : key;
    // Patch 8.4.1 (live 22.10.2026 05:43: the game's requests carried reasoning_effort low and clear_thinking, the
    // player's none; 8 of its 27 calls spent their 3,000 tokens on reasoning): the player's reasoning fields, the
    // profile's own for the game's endpoint and model, asked once whether the endpoint takes them
    const playerSetup = { reasoning: o.player.type === 'llm' ? playerReasoning(imp, o.player) : null, probe: null, dropped: null };
    if (playerSetup.reasoning?.keys.length) {
        const purl = playerUrl;
        const pmodel = playerModel;
        const p = purl ? await probePlayer({ url: purl, key: playerKey, model: pmodel, body: { ...playerSetup.reasoning.body, ...(o.player.extraBody || {}) } }) : null;
        playerSetup.probe = p;
        if (o.openrouter && (!p || !p.ok)) {
            // This run deliberately requires a fixed Wafer provider and low reasoning.
            // Never silently remove either parameter following a 400/422; that would
            // reintroduce the uncontrolled extractor budgets of the observed failed run.
            throw new Error(`OpenRouter fixed-route preflight failed (${p?.error || 'no result'}). No fallback or degraded reasoning was enabled.`);
        }
        if (p && !p.ok && (p.status === 400 || p.status === 422)) {
            playerSetup.dropped = `the endpoint refused the player's reasoning fields (${p.error}): the player sends none`;
            playerSetup.reasoning = { ...playerSetup.reasoning, body: {}, keys: [], source: 'none', note: playerSetup.dropped };
        }
        log(`player reasoning: ${playerSetup.reasoning.keys.length ? playerSetup.reasoning.keys.map((k) => `${k}=${JSON.stringify(playerSetup.reasoning.body[k])}`).join(', ') : 'none'} (${playerSetup.reasoning.note})`);
    }
    if (o.stopRequested?.()) { await stub?.close(); throw new Error('batch stopped before campaign start'); }
    const inst = createInstance({ runId, protect: [imp.st.dir, imp.st.dataRoot, imp.st.userDir], runDir });
    const g = inst.guard;
    g.mkdir(runDir);
    g.mkdir(path.join(runDir, 'screens'));
    log(`run ${runId}${o.stub ? ' (STUB: no live test)' : ''}`);
    log(`guide ${guide.chain.join(' → ')}, player ${o.player.type}${persona ? ` (${persona.split(':')[0]})` : ''}, seed ${seed}`);
    if (o.openrouter) {
        log(`OpenRouter fixed routing: provider ${OPENROUTER_PROVIDER}, fallbacks off; reasoning ${OPENROUTER_REASONING_EFFORT} on player + game roles`);
    }
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
    let fixtureReload = null;
    let slow = [];
    let modelStalls = 0;
    let validationContent = null;
    let statusLine = '';
    let toasts = [];
    let firstTurnAt = null;
    const port = await freePort(o.port);
    // Ctrl+C: the first ends the run after the current wait (the run folder is still written), the second at once
    let interrupted = o.stopRequested?.() ? 1 : 0;
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
        // Only this natural LLM helper test gets the doubled starting attributes.
        // Existing stub/batch runs and all regular player campaigns retain the product stats.
        setup.startStatsBonus = applyIsolatedHelperStartStats(
            inst, o.openrouter && guide.id === 'natural_helper_progression' && o.player.type === 'llm' && !o.stub
        );
        if (setup.startStatsBonus) log('ISOLATED TEST BONUS: six Level-1 base stats doubled (5 → 10); normal product and NPC stats unchanged');
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
        // hotfix .137: a hidden or inconsistent start record stops the run before the first player turn (it would stop
        // every turn: CAMPAIGN START HIDDEN), with the greeting and its record exported
        if (opened.started && !o.fixture) {
            validationContent ||= await loadContentPack(async name => JSON.parse(fs.readFileSync(path.join(ENGINE,'content',name),'utf8')));
            const problem = startRecordProblem(await driver.chat(), validationContent);
            if (problem) { end = { kind: 'integrity_failed', why: `campaign start before turn 1: ${problem}`, turn: 0 }; log(`stopped: ${end.why}`); throw new Error('stop'); }
        }

        if (o.fixture) {
            await driver.installFixture(await makeClassFixture(o.fixture, seed, setup.card));
            log(`EXPLICIT LEVEL-14 FIXTURE ${o.fixture}, seed ${seed}; historical feats are synthetic test data`);
            opened.started = true;
        }
        const player = o.player.type === 'scripted'
            ? scriptedPlayer({ steps: guide.scripted || [] })
            : llmPlayer({
                guide, username: imp.username, persona,
                url: playerUrl, model: playerModel, key: playerKey,
                temperature: o.player.temperature, maxTokens: o.player.maxTokens, body: playerSetup.reasoning?.body, extraBody: o.player.extraBody, record: (e) => playerLog.push({ at: new Date().toISOString(), ...e }),
            });
        if (o.player.type === 'llm' && !playerUrl) throw new Error('the LLM player needs an OpenAI-compatible URL: player.url in live.config.json');
        if (o.player.type === 'llm' && !o.stub && o.readPauseMs) log(`LLM player reading pause: ${o.readPauseMs} ms before each player decision after the first`);
        const maxTurns = guide.limits.maxTurns;
        const t0 = Date.now();
        let since = 0;
        let lastReached = 0;
        let playerMilestone = null;
        for (let turn = 1; ; turn++) {
            if (interrupted) { end = { kind: 'harness', why: 'interrupted (Ctrl+C)' }; break; }
            if (turn > maxTurns) { end = { kind: 'limit', why: `${maxTurns} turns` }; break; }
            if (Date.now() - t0 > guide.limits.maxMinutes * 60000) { end = { kind: 'limit', why: `${guide.limits.maxMinutes} minutes` }; break; }
            if (turn > 1 && !(await pauseBeforePlayer(o, { stopped: () => !!interrupted || !!o.stopRequested?.() }))) {
                end = { kind: 'harness', why: `interrupted before player request ${turn} (reading pause)` };
                break;
            }
            const ready = await driver.probe();
            if (ready.busy || ready.engineBlocked || driver.persistenceBlocked) {
                end = {kind:'engine_blocked', why:ready.engineStatus || 'engine busy or save unconfirmed', turn};
                log(`stopped before player request: ${end.why}`);
                break;
            }
            const view = await driver.view();
            const td = Date.now();
            const d = await player.decide(view, { turn, maxTurns, milestone: playerMilestone });
            const decideMs = Date.now() - td;
            if (!firstTurnAt) firstTurnAt = td;
            if (o.player.type === 'scripted') playerLog.push({ at: new Date().toISOString(), turn, decision: d });
            // Patch 8.4.1: what he saw is the result of the turn before (0: the start); his notes are about that turn
            for (const e of playerLog.filter((x) => x.turn === turn)) e.about_turn = turn - 1;
            if (playerLog.length) playerLog.at(-1).screen = screenText(view);
            if (d.stop) {
                // Patch 8.4.2 (live 22.10.2026 07:49: "done" after 7 of 8 required milestones was taken as done): his "done"
                // is checked against what the engine booked, after his decision; he is never told
                if (!d.harness && d.stop_reason === 'done') end = doneEnd(evaluate(await driver.chat(), { guide }));
                else end = { kind: d.harness ? 'harness' : 'player_stop', why: d.stop_reason };
                log(`player stops: ${d.stop_reason}`);
                break;
            }
            if (interrupted || o.stopRequested?.()) {
                end = {kind:'harness', why:`interrupted before sending turn ${turn}`};
                break;
            }
            log(`turn ${turn}: ${clip(d.message, 100)}`);
            sends.push({ turn, at: Date.now() });
            const r = await driver.send(d.message,{requireReady:true});
            turnsLog.push({ turn, text: d.message, decision: d, decideMs, ...r });
            if (!r.ok && interrupted) { end = { kind: 'harness', why: `interrupted (Ctrl+C) in turn ${turn}` }; break; }
            if (!r.ok) {
                // The browser may time out with a Planner abort (no assistant
                // reply), or with a visible reply whose Extractor stayed pending.
                // Diagnose from the saved engine record, never the timeout text alone.
                let fault = null;
                let failedChat = null;
                if (r.problem === 'no reply after the message' || String(r.problem).startsWith('the turn did not end within ')) {
                    try {
                        failedChat = await driver.chat();
                        fault = driverFailure(failedChat, r.problem, r.extraction);
                    } catch (error) {
                        log(`could not inspect the timeout's engine record: ${String(error?.message || error).slice(0, 160)}`);
                    }
                }
                await driver.screenshot(g.check(path.join(runDir, 'screens', `turn-${String(turn).padStart(3, '0')}-${fault?.kind || 'problem'}.png`)));
                if (fault) {
                    end = failureEnd(fault, turn);
                    turnsLog.at(-1).outcome = fault.kind;
                    chat = failedChat; // preserve the terminal reply or player record in the export
                } else {
                    end = { kind: 'ui', why: `turn ${turn}: ${r.problem}` };
                }
                log(`stopped: ${end.why}`);
                break;
            }
            const priorChat = chat;
            chat = await driver.chat();
            if (!(chat[0]?.extra?.avereth?.events || []).some((e) => e.t === 'campaign.started')) { end = { kind: 'ui', why: `the engine started no campaign, neither at the greeting nor with the message of turn ${turn}` }; break; }
            if (turn === 1) {
                validationContent ||= await loadContentPack(async name => JSON.parse(fs.readFileSync(path.join(ENGINE,'content',name),'utf8')));
                const problem = startRecordProblem(chat, validationContent);
                if (problem) { end = { kind: 'integrity_failed', why: `campaign start after turn 1: ${problem}`, turn }; break; }
            }
            // Patch 8.4.1: a story turn needs the narrator's story; a command's System answer or the engine's own one is
            // a turn of its own kind. The Driver has waited for Host recovery;
            // the runner itself starts no swipe/regenerate and preserves terminal failures.
            const userAt = chat.findLastIndex((m) => m.is_user);
            const outcome = turnOutcome(chat, userAt);
            const fault = turnFailure(chat, userAt);
            let soft = softExtractionFailure(chat, userAt, fault);
            if (soft && nativeCompletionBlocksContinuation(fault, chat)) {
                // The previous reply's world job is terminal, but ST itself still requires
                // "Abschluss prüfen / fortsetzen". Do not send another player input into
                // the blocked host and misclassify the next turn as a UI/no-reply failure.
                log(`turn ${turn}: failed Extractor remains blocked in ST; stopping without another game input`);
                soft = false;
            }
            if (soft) {
                validationContent ||= await loadContentPack(async name => JSON.parse(fs.readFileSync(path.join(ENGINE,'content',name),'utf8')));
                // .127: a fold with events that no longer apply is no basis for a continuation either
                const folded = foldChat(chat);
                if (folded.errors.length || validateState(folded.state,validationContent).length) {
                    end={kind:'integrity_failed',why:`turn ${turn}: failed state validation before continuation`,turn}; break;
                }
                let saved=false;
                try { saved=await driver.verifySaved(chat); } catch { /* unverified is a hard stop */ }
                if (!saved) { end={kind:'persistence_failed',why:`turn ${turn}: completed records were not confirmed on disk`,turn}; break; }
            }
            turnsLog.at(-1).outcome = soft ? 'soft_continued' : fault?.kind || outcome.kind;
            if (soft) {
                // A purely conversational turn had nothing mechanical to apply.
                // Its failure is preserved in chat/evaluation; the runner can
                // continue observing real play instead of truncating 100 turns.
                turnsLog.at(-1).softFailure = fault.reason || 'Extractor failed without expected mechanical effects';
                const meaningful = c => { const s=foldChat(c || []).state; return JSON.stringify([s.scene,s.entities?.pc?.sheet,s.quests,s.objects]); };
                modelStalls = meaningful(priorChat) === meaningful(chat) ? modelStalls+1 : 0;
                turnsLog.at(-1).unresolvedActions=Object.keys(foldChat(chat).state.last?.outcome?.expected_keys || {});
                if (fault.kind === 'planner_failed') turnsLog.at(-1).unresolvedActions=null;
                log(`turn ${turn}: safe continuation after ${fault.kind}; original failure retained`);
                if (modelStalls >= 3) { end={kind:'repeated_model_failure',why:'three model failures without mechanical progress',turn}; break; }
            }
            // Continue only on a sealed failure with verified saved records; never replay an action.
            if (!fault && outcome.kind === 'story') modelStalls=0;
            if (fault && !soft) {
                await driver.screenshot(g.check(path.join(runDir, 'screens', `turn-${String(turn).padStart(3, '0')}-${fault.kind}.png`)));
                end = failureEnd(fault, turn);
                log(`stopped: ${end.why}`);
                break;
            }
            // Level-goal runs need only current creation/life/level here. The full historical
            // evaluation, including the comparison checkpoint, is exported when the run ends.
            if (guide.openRun?.targetLevel) {
                const state = foldChat(chat).state;
                const pc = state.entities?.pc;
                const mismatch = scenarioMismatch(state, guide.scenario, guide.starterAoe);
                if (mismatch) { end = mismatch; log(`stopped: ${end.why}`); break; }
                if (state.creation?.step >= 3 && pc?.status === 'alive' && pc.sheet.hp > 0 && pc.sheet.level < guide.openRun.targetLevel) continue;
            }
            const ev = evaluate(chat, { guide });
            // Only the public, Engine-confirmed level goal is fed back, never hidden feats or class requirements.
            playerMilestone = ev.milestones.some(m => m.id === 'open_run_level' && m.reached)
                && nextMilestone(ev)?.id === 'class_accepted' ? 'class_accepted' : null;
            if (ev.defeat) { await driver.screenshot(g.check(path.join(runDir, 'screens', `turn-${String(turn).padStart(3, '0')}-defeat.png`))); end = { kind: 'defeat', why: `turn ${ev.defeat.turn}: ${ev.defeat.why}` }; break; }
            if (finished(ev)) {
                if (o.fixture) {
                    try { fixtureReload = await verifyFixtureReload(driver, chat); }
                    catch (e) { fixtureReload = false; end = { kind: 'fixture_reload_failed', why: `all mechanic milestones reached; ${e.message}` }; log(`stopped: ${end.why}`); break; }
                    if (!fixtureReload) { end = {kind:'fixture_reload_failed',why:'saved/reloaded class or feats changed'}; break; }
                } end = { kind: 'done', why: null }; log('all required milestones reached'); break; }
            // Patch 8.4.2: the last milestone reached, the rest out of this run's reach: no turns played on for nothing
            if (settled(ev)) { end = { kind: 'incomplete', why: `the last milestone is reached; ${openText(ev)}` }; log(`stopped: ${end.why}`); break; }
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
        try {
            if (driver) {
                chat = await driver.chat();
                if (!driver.persistenceBlocked) await driver.save();
                statusLine = await driver.status();
                toasts = await driver.toasts();
                await driver.screenshot(g.check(path.join(runDir, 'screens', 'final.png')));
            }
        } catch (e) { log(`could not read the page at the end: ${e.message}`); }
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
            if (chat && !savedPrefixMatches(chat, messages, chat.length - 1))
                put('chat.browser.jsonl', jsonl(chat), 'letzter Browserstand bei abweichendem Save');
        }
        put('avereth-events.json', JSON.stringify(eventsLog(messages), null, 1), 'die Ereignisse der Engine (Format des Buttons „Export event log“)');
        const logText = fs.existsSync(path.join(runDir, 'server.log')) ? fs.readFileSync(path.join(runDir, 'server.log'), 'utf8') : '';
        files.push(['server.log', 'die Konsole der isolierten SillyTavern-Instanz (alle Requests und Antworten)'], ['server.timed.log', 'dieselbe Konsole mit Uhrzeit je Zeile']);
        const { calls, errors: callErrors } = parseCalls(logText, server?.markers || [], sends);
        if (end.kind === 'narrator_empty') {
            const c = calls.filter((x) => x.role === 'narrator' && x.turn === end.turn).at(-1);
            if (c) end.why += ` — the narrator call ended with finish_reason "${c.finish}" after ${c.completion_tokens ?? '?'} completion tokens (max ${c.max_tokens}), ${c.reasoning_chars} characters of reasoning, ${c.content_chars} of text`;
        }
        put('chat-completions.jsonl', jsonl(calls.map((c) => ({ n: c.n, role: c.role, repair: c.repair, turn: c.turn, at: c.at, ms: c.ms, ...c.full }))), 'jeder Chat-Completion-Request mit seiner Antwort');
        put('calls.json', JSON.stringify(calls.map(({ full, ...c }) => c), null, 1), 'je Aufruf: Rolle, Modell, Zeit, Tokens, finish_reason, Reparatur');
        put('player.jsonl', jsonl(playerLog), 'jede Entscheidung des Spielers mit dem Bildschirmtext, den er sah');
        validationContent ||= await loadContentPack(async name => JSON.parse(fs.readFileSync(path.join(ENGINE, 'content', name), 'utf8')));
        const finalCheck = assessFinalIntegrity(messages, validationContent, end);
        end = finalCheck.end;
        const ev = evaluate(messages, { guide });
        put('evaluation.json', JSON.stringify({ end, integrity: finalCheck.integrity, ...ev }, null, 1), 'die Auswertung (Etappen, Kämpfe, Quests, Auffälligkeiten)');
        // the targeted NPC/PULSE run (guides/npc_pulse_test.json): its own evaluation from the saved records and requests;
        // a failure (P2-B) is kept in run.json (analysis) and under the report's title, the exports above stay as they are
        let npcPulse = null;
        if (guide.analysis === 'npc_pulse') {
            npcPulse = npcPulseExports({ messages, calls: calls.map((c) => ({ role: c.role, turn: c.turn, request: c.full?.request })), runId });
            for (const [name, data, what] of npcPulse.files) {
                try { put(name, data, what); } catch (e) { npcPulse = npcPulseFailed(new Error(`${name} not written: ${e.message}`)); break; }
            }
            if (!npcPulse.ok) log(`NPC/PULSE EVALUATION FAILED: ${npcPulse.status.error} (the exports are kept; afterwards: npm run live:st:npc-eval -- ${runDir})`);
        }
        const driverNotes = [...(driver?.setupNotes || []), ...callErrors.slice(0, 5).map((e) => `server log: ${e}`)];
        driverNotes.push(`Final saved-state integrity: ${finalCheck.integrity.ok ? 'OK' : 'FAILED'} (${finalCheck.integrity.foldErrors.length} fold errors, ${finalCheck.integrity.problems.length} validation problems).`);
        put('run.json', JSON.stringify({ runId, build: buildOf(), git: gitInfo(), scenario: guide.scenario || null, stub: !!stub, seed, fixture: o.fixture || null, fixtureReload, persona, guide: { id: guide.id, chain: guide.chain, files: guide.files.map((f) => path.relative(ENGINE, f)) }, end, analysis: npcPulse?.status, timing, preflight: preflightResult, route: imp.route, player: { type: o.player.type, readPauseMs, ...playerSetup }, setup, conn, chatId: opened?.chatId || null, safeContinuations: turnsLog.filter(t=>t.outcome === 'soft_continued').length, turns: turnsLog.map(({ decision, ...t }) => ({ ...t, milestone: decision?.milestone || null })), status: statusLine, toasts, pageErrors: driver?.pageErrors || [], serverErrors: server?.errors || [], notes: driverNotes, stubCalls: stub ? stub.calls : undefined }, null, 1), 'Ablauf des Laufs: Züge, Zeiten, Hinweise, Seitenfehler, Statuszeile');
        put('import.json', JSON.stringify({ ...imp, preset: { ...imp.preset, text: undefined, sha256: imp.preset.text ? sha256(Buffer.from(imp.preset.text)) : null } }, null, 1), 'was aus dem Profil übernommen wurde (ohne Schlüssel)');

        const changedRead = changedSince(imp.read);
        const tree = treeDiff(profileBefore, treeStat(imp.st.userDir));
        const protection = { unchanged: !changedRead.length && tree.same, changedRead, tree, files: profileBefore.size };
        // the key scan over every file written so far, then the report with its result, then the report itself scanned
        const secrets = [...new Set([key, playerKey, process.env[o.keyEnv]].filter(Boolean))];
        const scan = secretScan(runDir, secrets, g);
        const report = buildReport({
            runId, stub: !!stub, guide, player: o.player.type === 'llm' ? { type: 'llm', model: playerModel, endpoint: (() => { try { return new URL(playerUrl).host; } catch { return '?'; } })(), temperature: o.player.temperature, persona } : { type: 'scripted', steps: (guide.scripted || []).length },
            end, ev, calls, setup: setup || { source: imp.source, card: '?', world: '?', greeting: '?' }, imp, git: gitInfo(), build: buildOf(), st: { version: imp.st.version, dir: imp.st.dir, port, startMs: server?.startMs },
            browser: { name: br?.name || '?', version: br?.version || '?', headless: o.headless }, turnsLog, playerLog, driverNotes, toasts, pageErrors: driver?.pageErrors || [], serverErrors: server?.errors || [],
            protection, scan, files: [...files, ['report.md', 'dieser Bericht'], ['screens/', 'Bildschirmfotos (Ende, Probleme)']], startedAt, endedAt, instanceKept: o.keepProfile ? inst.root : null,
            chatId: opened?.chatId, seed, fixture: o.fixture || null, fixtureReload, slow, timing, preflight: preflightResult, keyEnv: o.keyEnv, playerSetup, playerMaxTokens: o.player.maxTokens, worldSame: imp.world ? imp.world.sha256 === sha256(fs.readFileSync(WORLD_FILE)) : null,
        });
        put('report.md', withAnalysisReport(report, npcPulse), 'dieser Bericht');
        const again = secretScan(runDir, secrets, g);
        scan.hits.push(...again.hits);
        const metaFile = path.join(runDir, 'run.json');
        const metadata = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
        g.write(metaFile, JSON.stringify({ ...metadata, protection: { unchanged: protection.unchanged }, secretHits: scan.hits.length }, null, 1));
        if (scan.hits.length) log(`SECRET SCAN: ${scan.hits.length} hit(s) blanked (${scan.hits.map((h) => h.file).join(', ')})`);
        log(`time: ${Math.round(timing.totalMs / 60000)} min in all, ${timing.turns} turns, ${timing.turns ? `${Math.round((timing.gameMs + timing.decideMs) / timing.turns / 1000)} s per turn (game ${Math.round(timing.gameMs / Math.max(1, timing.turns) / 1000)} s, player ${Math.round(timing.decideMs / Math.max(1, timing.turns) / 1000)} s)` : 'no turn'}`);
        log(`result: ${end.kind}${end.why ? ` (${end.why})` : ''}; milestones ${ev.milestones.filter((m) => m.required && m.reached).length}/${ev.milestones.filter((m) => m.required).length}; profile unchanged: ${protection.unchanged}; secret scan: ${scan.hits.length ? 'HITS' : 'clean'}${npcPulse ? `; NPC/PULSE evaluation: ${npcPulse.ok ? 'written' : `FAILED (${npcPulse.status.error})`}` : ''}`);
        log(`run folder: ${runDir}`);
        return { runDir, end, ev, protection, scan, calls, stub, inst, playerLog, turnsLog, analysis: npcPulse?.status || null };
    } finally {
        if (!o.keepProfile) { try { removeInstance(inst); } catch (e) { log(`could not remove the isolated instance ${inst.root}: ${e.message}`); } }
    }
}

async function main() {
    const o = options();
    if (o.check) process.exit(await check(o));
    try {
        if (o.inspect) {
            const imp = useOpenRouter(importProfile({ stDir: o.stDir, user: o.stUser, card: o.card, preset: o.preset, dataRoot: o.stData }), o);
            console.log(describeImport(imp, { keyEnv: o.keyEnv }));
            if (o.ping) for (const r of await preflight(o, imp, process.env[o.keyEnv])) console.log(`${r.good ? '✔' : '✖'} ${r.what}${r.detail ? ` — ${r.detail}` : ''}`);
            return;
        }
        let stopped = false;
        const stopMessage = m => { if (m?.type === 'batch.stop') { stopped = true; process.emit('SIGINT'); } };
        const disconnected = () => stopMessage({ type: 'batch.stop' });
        if (process.send) {
            process.on('message', stopMessage); process.on('disconnect', disconnected);
            process.send({ type: 'batch.ready' });
        }
        const r = await run({ ...o, stopRequested: () => stopped });
        process.exit(r.end.kind === 'done' ? 0 : r.end.kind === 'harness' ? 1 : 2);
    } catch (e) {
        console.error(`Fehler: ${e.message}\n(Voraussetzungen prüfen: npm run live:st:check)`);
        process.exit(1);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
