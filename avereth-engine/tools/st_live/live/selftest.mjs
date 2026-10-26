// The runner's own check (docs/LIVE_RUNNER.md §10), for the cloud and for any change to the runner. NOT A LIVE TEST:
// a stub provider answers (stub_provider.mjs), so nothing about the engine's or a model's behaviour is shown. It
// builds a fake player profile (settings with a custom source, the preset, an Avereth card with its own greeting, a
// personal chat, and a secrets.json and credential-like fields as bait), runs run_live.mjs --stub on a real
// SillyTavern checkout with the LLM player answered by the stub, and checks:
//   - the fake profile and the SillyTavern checkout are byte-for-byte untouched; secrets.json and the chat were not read;
//   - the bait never reaches the run folder; the stub key reached the provider through SillyTavern only;
//   - every export is there; calls carry roles, times and tokens; the player saw only the page's text;
//   - the evaluation and the report came out (creation is the one milestone a stub run can reach).
// Usage: AVERETH_ST_DIR=/path/to/SillyTavern node tools/st_live/live/selftest.mjs [--keep]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ENGINE, Guard, treeStat, treeDiff } from './lib.mjs';
import { cardPng, WORLD, WORLD_FILE, CONTRACT_FILE } from './profile.mjs';
import { PRESET_TO_SETTINGS } from './import_profile.mjs';
import { options, run } from './run_live.mjs';
import { EMPTY_MARK } from './stub_provider.mjs';

const ST = process.env.AVERETH_ST_DIR;
if (!ST || !fs.existsSync(path.join(ST, 'server.js'))) throw new Error('set AVERETH_ST_DIR to a SillyTavern checkout');
const BAIT_KEY = 'PERSONAL-KEY-must-never-be-read-7f3a9c';
const BAIT_PROXY = 'PERSONAL-PROXY-PASSWORD-2b8e41';
const GREETING = 'SYSTEM INITIALIZATION COMPLETE\n\n`Location: Public roadside verge outside Alderwatch, Valedorn Crown`\n\nCHARACTER CREATION — STEP 1/2: choose a Base Class (Warrior, Mage, Rogue).';

// ------------------------------------------------------------------------------------------------ the fake profile
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-selftest-'));
const g = new Guard([base]);
const data = path.join(base, 'st-data');
const user = path.join(data, 'default-user');
const settings = JSON.parse(fs.readFileSync(path.join(ST, 'default', 'content', 'settings.json'), 'utf8'));
settings.username = 'Alaric';
settings.main_api = 'openai';
// the values in play as SillyTavern keeps them once the preset is chosen, one changed without saving (temperature)
const preset = JSON.parse(fs.readFileSync(path.join(ENGINE, 'presets', 'Avereth Narrator V4.json'), 'utf8'));
Object.assign(settings.oai_settings, Object.fromEntries(Object.entries(preset).map(([k, v]) => [PRESET_TO_SETTINGS[k] || k, v])), { temp_openai: 0.85 });
Object.assign(settings.oai_settings, {
    chat_completion_source: 'custom', custom_url: 'http://127.0.0.1:9/v1', custom_model: 'personal-model', preset_settings_openai: 'Avereth Narrator V4',
    stream_openai: true, custom_include_headers: `Authorization: Bearer ${BAIT_KEY}`, proxy_password: BAIT_PROXY, reverse_proxy: 'http://127.0.0.1:9/proxy',
    // as the first live test's profile had it (GLM on Featherless): reasoning fields the game's requests carry
    custom_include_body: 'clear_thinking : true\nreasoning_effort : low',
});
settings.extension_settings = { ...(settings.extension_settings || {}), avereth: { enabled: true, runtime: 'v4', planner: true, hud: 'closed', historyTurns: 4 } };
g.write(path.join(user, 'settings.json'), JSON.stringify(settings, null, 4));
g.copy(path.join(ENGINE, 'presets', 'Avereth Narrator V4.json'), path.join(user, 'OpenAI Settings', 'Avereth Narrator V4.json'));
g.write(path.join(user, 'characters', 'Avereth V4.png'), cardPng({ name: 'Avereth V4', description: fs.readFileSync(CONTRACT_FILE, 'utf8'), first_mes: GREETING, world: WORLD }));
g.write(path.join(user, 'characters', 'Someone Else.png'), cardPng({ name: 'Someone Else', description: 'not an Avereth card', first_mes: 'hello', world: null }));
g.copy(WORLD_FILE, path.join(user, 'worlds', `${WORLD}.json`));
g.write(path.join(user, 'chats', 'Avereth V4', 'My long campaign.jsonl'), `${JSON.stringify({ user_name: 'Alaric', character_name: 'Avereth V4', chat_metadata: {} })}\n${JSON.stringify({ name: 'Alaric', is_user: true, mes: `personal chat ${BAIT_KEY}` })}\n`);
g.write(path.join(user, 'secrets.json'), JSON.stringify({ api_key_custom: [{ id: 'mine', value: BAIT_KEY, label: 'mine', active: true }], _migrated: [] }, null, 4));
// a second profile: the OpenAI source through a reverse proxy (a local proxy in front of the provider), its password bait
const data2 = path.join(base, 'st-data-proxy');
g.copyDir(data, data2);
const settings2 = structuredClone(settings);
// as SillyTavern 1.19 keeps a reverse proxy: a proxy preset at the top of settings.json, loaded over oai_settings
const feather = { name: 'Featherless', url: 'http://127.0.0.1:9/v1', password: BAIT_PROXY };
Object.assign(settings2, { proxies: [{ name: 'None', url: '', password: '' }, feather], selected_proxy: feather });
Object.assign(settings2.oai_settings, { chat_completion_source: 'openai', reverse_proxy: feather.url, openai_model: 'personal-model', proxy_password: BAIT_PROXY, custom_include_headers: '' });
g.write(path.join(data2, 'default-user', 'settings.json'), JSON.stringify(settings2, null, 4));
const profileBefore = treeStat(data);
const profile2Before = treeStat(data2);
const stBefore = treeStat(ST, { skip: ['node_modules', '.git'] });

// ------------------------------------------------------------------------------------------------ the run
const runJson = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8'));
const o = options(['--stub', '--st', ST, '--st-data', data, '--runs', path.join(base, 'runs'), '--guide', 'guild_dungeon_loop', '--seed', '7', '--max-turns', '8', ...(process.argv.includes('--keep') ? ['--keep-profile'] : [])], { ...process.env, AVERETH_LIVE_API_KEY: '' });
o.configFile = null;
const r = await run(o);
// the rule-based player on the same profile: three turns, then the turn limit
const o2 = options(['--stub', '--st', ST, '--st-data', data, '--runs', path.join(base, 'runs'), '--player', 'scripted', '--max-turns', '3'], { ...process.env, AVERETH_LIVE_API_KEY: '' });
o2.configFile = null;
const r2 = await run(o2);
// the reverse proxy route: the stub stands where the proxy is
const o3 = options(['--stub', '--st', ST, '--st-data', data2, '--runs', path.join(base, 'runs'), '--seed', '3', '--max-turns', '8'], { ...process.env, AVERETH_LIVE_API_KEY: '' });
o3.configFile = null;
const r3 = await run(o3);
const run3 = runJson(r3.runDir);
const text3 = fs.readdirSync(r3.runDir, { recursive: true }).map(String).filter((f) => /\.(json|jsonl|md|log)$/.test(f)).map((f) => fs.readFileSync(path.join(r3.runDir, f), 'utf8')).join('\n');
const report3 = fs.readFileSync(path.join(r3.runDir, 'report.md'), 'utf8');
// Patch 8.4.1: a command's System answer, then a story turn the narrator answers without text (the stub's marker): the
// run ends there with its reason, no swipe, no regeneration
const guide4 = path.join(base, 'guide-empty-narrator.json');
g.write(guide4, JSON.stringify({ id: 'selftest_empty_narrator', extends: 'guild_dungeon_loop', brief: 'selftest: an empty narrator reply', scripted: [{ say: 'Mage' }, { say: 'Flame Lance + Blink' }, { say: '*i look around the roadside*' }, { say: '#status' }, { say: `*i walk on along the road* ${EMPTY_MARK}` }, { say: '*i walk on*' }] }, null, 1));
const o4 = options(['--stub', '--st', ST, '--st-data', data, '--runs', path.join(base, 'runs'), '--player', 'scripted', '--guide', guide4, '--max-turns', '8'], { ...process.env, AVERETH_LIVE_API_KEY: '' });
o4.configFile = null;
const r4 = await run(o4);
const run4 = runJson(r4.runDir);
const report4 = fs.readFileSync(path.join(r4.runDir, 'report.md'), 'utf8');
const calls4 = JSON.parse(fs.readFileSync(path.join(r4.runDir, 'calls.json'), 'utf8'));
const players4 = fs.readFileSync(path.join(r4.runDir, 'player.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

// The natural level guide: a deliberate four-input cap must be a limit, never Level-15 success.
const guide5 = path.join(base, 'guide-level-cap.json');
g.write(guide5, JSON.stringify({ id: 'selftest_level_cap', extends: 'current_test', openRun: { targetLevel: 15, checkpointTurns: 4 },
    scripted: [{ say: 'Mage' }, { say: 'Flame Lance + Blink' }, { say: 'I look around the roadside.' }, { say: '#status' }] }));
const o5 = options(['--stub', '--st', ST, '--st-data', data, '--runs', path.join(base, 'runs'), '--player', 'scripted', '--guide', guide5, '--max-turns', '4'], { ...process.env, AVERETH_LIVE_API_KEY: '' });
o5.configFile = null;
const r5 = await run(o5);
const evaluation5 = JSON.parse(fs.readFileSync(path.join(r5.runDir, 'evaluation.json'), 'utf8'));
const report5 = fs.readFileSync(path.join(r5.runDir, 'report.md'), 'utf8');

// ------------------------------------------------------------------------------------------------ checks
const has = (f) => fs.existsSync(path.join(r.runDir, f));
const read = (f) => (has(f) ? fs.readFileSync(path.join(r.runDir, f), 'utf8') : '');
const allText = fs.readdirSync(r.runDir, { recursive: true }).map(String).filter((f) => /\.(json|jsonl|md|log)$/.test(f)).map((f) => read(f)).join('\n');
const calls = JSON.parse(read('calls.json') || '[]');
const imp = JSON.parse(read('import.json') || '{}');
const players = read('player.jsonl').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const evaluation = JSON.parse(read('evaluation.json') || '{}');
const report = read('report.md');
const run1 = runJson(r.runDir);
const game = r.stub.calls.filter((c) => c.role !== 'player');
const steerOf = (c) => JSON.stringify(c.steer || {});
const roles = new Set(calls.map((c) => c.role));
const checks = {
    levelGuideStopsAtExplicitCap: r5.end.kind === 'limit' && r5.turnsLog.length === 4 && evaluation5.progression?.currentLevel === 1 && !evaluation5.reached.open_run_level,
    levelGuideCheckpointAndReport: evaluation5.progression?.checkpoint?.turn === 4 && /Progressionsziel:\*\* Level 15; tatsächlich Level 1/.test(report5) && /Vergleich nach 4 Eingaben/.test(report5),
    levelGuideProfileUntouched: r5.protection.unchanged && r5.scan.hits.length === 0,
    profileUntouched: treeDiff(profileBefore, treeStat(data)).same && r.protection.unchanged,
    stCheckoutUntouched: treeDiff(stBefore, treeStat(ST, { skip: ['node_modules', '.git'] })).same,
    secretsNotRead: !imp.read?.some((x) => /secrets\.json$/.test(x.file)) && !imp.read?.some((x) => /[\\/]chats[\\/]/.test(x.file)),
    onlyAverethCardRead: !imp.read?.some((x) => /Someone Else\.png$/.test(x.file)),
    baitNeverExported: !allText.includes(BAIT_KEY) && !allText.includes(BAIT_PROXY),
    credentialFieldsDropped: (imp.dropped || []).some((d) => d.key === 'custom_include_headers') && (imp.dropped || []).some((d) => d.key === 'proxy_password'),
    stubKeyThroughSillyTavern: game.length > 0 && game.every((c) => c.auth === 'key'),
    stubKeyNotExported: !allText.includes('stub-key-not-a-real-key-0000'),
    secretScanClean: r.scan.hits.length === 0,
    instanceRemoved: process.argv.includes('--keep') || !fs.existsSync(r.inst.root),
    exports: ['chat.jsonl', 'avereth-events.json', 'chat-completions.jsonl', 'calls.json', 'player.jsonl', 'evaluation.json', 'run.json', 'import.json', 'report.md', 'server.log', 'server.timed.log', 'screens/final.png'].every(has),
    callsHaveRolesTimesTokens: ['plan', 'narrator', 'extract'].every((x) => roles.has(x)) && calls.every((c) => Number.isFinite(c.ms) && c.model === 'stub-model' && Number.isFinite(c.prompt_tokens) && c.stream === false),
    narratorWithoutStreaming: game.filter((c) => c.role === 'narrator').length >= 2 && game.filter((c) => c.role === 'narrator').every((c) => !c.stream),
    everyCallHasItsRole: !calls.some((c) => c.role === 'other'),
    unsavedPresetValueSeen: (imp.preset?.unsaved || []).includes('temp_openai') && /ungespeicherte Werte in Gebrauch: temp_openai/.test(report),
    narratorGetsEngineBlockAndContract: (() => { const n = read('chat-completions.jsonl').split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((c) => c.role === 'narrator'); const t = JSON.stringify(n?.request?.messages || []); return t.includes('[AVERETH ENGINE') && t.includes('SANDBOX NARRATOR CONTRACT') && n.request.max_tokens === preset.openai_max_tokens; })(),
    greetingFromProfile: /outside Alderwatch/.test(read('chat.jsonl')),
    playerSawOnlyThePage: players.length >= 4 && players.every((p) => typeof p.screen === 'string' && !/"events"|campaign\.started|extra\.avereth|text_hash/.test(p.screen)) && /CHARACTER CREATION/.test(players[0].screen),
    // Patch 8.4.2: the stub player's "done" with only creation reached is incomplete, the open milestones named
    playerDoneChecked: r.end.kind === 'incomplete' && /^the player reported done; 1\/\d+ required reached; open: guild_registered, /.test(r.end.why) && /\*\*unvollständig\*\*/.test(report) && /- \*\*Offen:\*\* guild_registered \(nicht erreicht\)/.test(report),
    creationMilestone: evaluation.milestones?.find((m) => m.id === 'creation_complete')?.reached === true,
    // Patch 9A: a new campaign plays by ruleset 2; the Mage of the guide (Flame Lance + Blink) is still a valid choice
    newRulesetMage: evaluation.character?.ruleset === 2 && evaluation.character?.class === 'mage' && /\*\*Charakter:\*\* mage \(mage\.flame_lance, mage\.blink\) · Regelstand 2 \(Warrior, Mage, Rogue\)/.test(report),
    reportMarksStub: /STUB-SELBSTTEST — kein echter Livetest/.test(report) && /Profil unverändert:\*\* ja/.test(report) && /Geheimnis-Scan:\*\* sauber/.test(report),
    noPageErrors: runJson(r.runDir).pageErrors.length === 0,
    noServerErrors: runJson(r.runDir).serverErrors.length === 0,
    scriptedPlayerRuns: r2.end.kind === 'limit' && r2.turnsLog.length === 3 && r2.turnsLog[0].text === 'Mage' && r2.playerLog.every((p) => p.decision && typeof p.screen === 'string'),
    profileUntouchedAfterBoth: treeDiff(profileBefore, treeStat(data)).same && r2.protection.unchanged,
    customRouteNamesTheStrayProxy: run1.route?.profile?.via === 'custom_url' && (imp.dropped || []).some((d) => d.key === 'reverse_proxy'),
    preflightInReport: /\| Preflight \(GET \/models\) \| http:\/\/127\.0\.0\.1:\d+\/v1\/models: 1 Modell\(e\) \(stub-model\), Modell enthalten \|/.test(report),
    runtimeMeasured: /## Laufzeit \(gemessen\)/.test(report) && /Hochrechnung bei diesem Tempo \| 40 Züge ≈/.test(report) && Number.isFinite(run1.timing?.totalMs) && run1.timing.turns === 4,
    proxyRouteTaken: run3.route?.profile?.via === 'reverse_proxy' && run3.route?.runner?.via === 'reverse_proxy' && run3.route?.reverseProxy?.preset === 'Featherless' && /Verbindung des Laufs \| Quelle "openai" → reverse_proxy http:\/\/127\.0\.0\.1:\d+\/v1/.test(report3),
    proxyWarningConfirmed: run3.notes.some((n) => /reverse proxy warning of SillyTavern confirmed/.test(n)),
    proxyRunPlays: r3.end.kind === 'incomplete' && r3.stub.calls.filter((c) => c.role === 'narrator').length >= 2 && r3.stub.calls.filter((c) => c.role !== 'player').every((c) => c.auth === 'key'),
    proxyPasswordNeverExported: !text3.includes(BAIT_PROXY) && !text3.includes(BAIT_KEY) && !text3.includes('stub-key-not-a-real-key-0000') && r3.scan.hits.length === 0,
    proxyProfileUntouched: treeDiff(profile2Before, treeStat(data2)).same && r3.protection.unchanged,
    // every run's chat: the card's greeting with the campaign first, no message of SillyTavern's welcome screen in it
    // Patch 8.4.1: the player's requests carry the reasoning fields the game's own requests carry (same endpoint and
    // model), as the report states; a player on the proxy route (source openai) gets none
    playerReasoningAsTheGame: r.stub.calls.filter((c) => c.role === 'player').length >= 4 && r.stub.calls.filter((c) => c.role === 'player').every((c) => c.steer?.reasoning_effort === 'low' && c.steer?.clear_thinking === true) && game.filter((c) => c.role === 'narrator').every((c) => steerOf(c) === steerOf(r.stub.calls.find((x) => x.role === 'player'))),
    playerReasoningInReport: run1.player?.reasoning?.source === 'profile' && run1.player?.probe?.ok === true && /\| Spieler-Reasoning \(wirksam\) \| `reasoning_effort`="low", `clear_thinking`=true — [^|]*Probe: angenommen[^|]*max\. 3000 Tokens \|/.test(report),
    proxyPlayerWithoutReasoning: r3.stub.calls.filter((c) => c.role === 'player').length >= 2 && r3.stub.calls.filter((c) => c.role === 'player').every((c) => steerOf(c) === '{}'),
    // what the player sees: the HUD of the newest reply as its own section, no runner notice
    playerSeesTheHud: players.slice(3).length >= 1 && players.slice(3).every((p) => {
        const [msgs, hud = ''] = p.screen.split('[YOUR CHARACTER AND THE WORLD');
        const hp = evaluation.turns.find((t) => t.turn === p.about_turn)?.hp;
        return Number.isFinite(hp) && hud.includes(`HP ${hp}/${hp}`) && /World — Day 1/.test(hud) && !/World — Day 1/.test(msgs);
    }),
    runnerToastsNotForThePlayer: (run1.toasts || []).every((t) => t.origin === 'runner' || t.origin === 'game') && (run1.toasts || []).filter((t) => t.origin === 'runner').every((t) => !players.some((p) => p.screen.includes(String(t.text || '').slice(0, 40)))),
    observationsMapped: players.every((p) => p.about_turn === p.turn - 1),
    // the empty narrator reply
    systemTurnIsNoEmptyReply: r4.turnsLog[3]?.text === '#status' && r4.turnsLog[3]?.outcome === 'system' && r4.turnsLog[2]?.outcome === 'story' && r4.turnsLog[0]?.outcome === 'engine',
    // Patch 8.4.2: after #status he sees his command as he wrote it and the HUD of the reply before as not updated;
    // after a story reply the HUD is the newest
    ownCommandAndOlderHud: (() => { const p = players4.find((x) => x.turn === 5)?.screen || ''; return /\[YOU\]\n#status\n/.test(p) && /the HUD of an EARLIER reply, NOT updated since: the System answer above is newer/.test(p); })()
        && /the HUD under the newest reply/.test(players4.find((x) => x.turn === 4)?.screen || ''),
    emptyNarratorStops: r4.end.kind === 'narrator_empty' && r4.end.turn === 5 && r4.turnsLog.length === 5 && /finish_reason "length"/.test(r4.end.why) && /characters of reasoning, 0 of text/.test(r4.end.why),
    emptyNarratorNoSwipe: calls4.filter((c) => c.role === 'narrator' && c.turn === 5).length === 1 && r4.stub.calls.filter((c) => c.role === 'narrator').length === calls4.filter((c) => c.role === 'narrator').length,
    emptyNarratorReported: /Ergebnis:\*\* abgebrochen: leere Erzählerantwort in einem Story-Zug \(kein Swipe, kein Regenerieren\)/.test(report4) && fs.existsSync(path.join(r4.runDir, 'screens', 'turn-005-narrator_empty.png')) && run4.turns[4]?.outcome === 'narrator_empty',
    emptyNarratorDataKept: ['chat.jsonl', 'calls.json', 'chat-completions.jsonl', 'evaluation.json'].every((f) => fs.existsSync(path.join(r4.runDir, f))) && r4.scan.hits.length === 0 && r4.protection.unchanged,
    cleanCampaignChats: [r, r2, r3, r4].every((x) => {
        const msgs = fs.readFileSync(path.join(x.runDir, 'chat.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((m) => 'mes' in m);
        return msgs[0]?.name === 'Avereth V4' && (msgs[0].extra?.avereth?.events || []).some((e) => e.t === 'campaign.started') && msgs.every((m) => m.is_user || ['Avereth V4', 'Avereth System'].includes(m.name)) && !runJson(x.runDir).notes.some((n) => /no campaign at the greeting/.test(n));
    }),
    eventsExported: JSON.parse(read('avereth-events.json') || '[]').some((x) => x.events.some((e) => e.t === 'campaign.started')),
};
console.log(JSON.stringify(checks, null, 1));
console.log(`run folder: ${r.runDir}`);
const okAll = Object.values(checks).every(Boolean);
if (okAll && !process.argv.includes('--keep')) fs.rmSync(base, { recursive: true, force: true });
console.log(okAll ? 'LIVE RUNNER SELFTEST (STUB, NO LIVE TEST): OK' : 'LIVE RUNNER SELFTEST (STUB, NO LIVE TEST): FAILED');
process.exit(okAll ? 0 : 1);
