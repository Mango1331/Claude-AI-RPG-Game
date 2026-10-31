// Hotfix .137: the campaign start in a real SillyTavern (1.19) with the original macro greeting of batch
// 20261031-125921Z ({{user}}, {{pick::Alderwatch…::Glassmere…::Ashbridge…}}; tests/v4/fixtures/greeting_macros_b1259.txt).
// Set up as tools/st_live/run_c.mjs (card, preset, lorebook, Chat Completion "Custom" before a mock provider on port 5001,
// dummy key). For several fresh chats (each its own {{pick}} seed) it checks: one campaign start on the greeting, its
// text hash the greeting SillyTavern keeps, its place the one the greeting shows (tools/st_live/live/evaluator.mjs
// startRecordProblem, the runner's own check), the same after the runner's chat rename (SillyTavern rebuilds an unplayed
// greeting from the card then, under the new chat id that seeds {{pick}}),
// Warrior, Mage and Rogue with their class and skill choice played without CAMPAIGN START HIDDEN, and the saved chat.
// A host smoke with a mock provider: creation needs no model; nothing about a model's play is shown.
// Usage: AVERETH_ST_DIR=/path/to/SillyTavern [AVERETH_ST_OUT=dir] [AVERETH_GREETING_CHATS=3] node tools/st_live/run_greeting.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { ENGINE_VERSION, hash32 } from '../../src/util.js';
import { loadContentPack } from '../../src/content.js';
import { foldChat, rec, messageEvents } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { Driver } from './live/driver.mjs';
import { startRecordProblem } from './live/evaluator.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }

const ST = process.env.AVERETH_ST_DIR;
if (!ST) throw new Error('set AVERETH_ST_DIR to a SillyTavern checkout');
const ENGINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const USER = path.join(ST, 'data/default-user');
const HERE = process.env.AVERETH_ST_OUT || path.join(ST, 'avereth_greeting_start');
const CHATS = Number(process.env.AVERETH_GREETING_CHATS || 3);
fs.mkdirSync(HERE, { recursive: true });
const CARD = 'Avereth Macro Greeting';
const WORLD = 'Avereth World Lore v0.14';
const PRESET = 'Avereth Narrator V4';
const USERNAME = 'Alaric Red';
const DUMMY_KEY = 'smoke-not-a-real-key';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.error(`[greeting ${new Date().toISOString().slice(11, 19)}]`, ...a);
const content = await loadContentPack(async (n) => JSON.parse(fs.readFileSync(path.join(ENGINE, 'content', n), 'utf8')));

// ------------------------------------------------------------------------------------------------ setup (as run_c.mjs)
const contract = fs.readFileSync(path.join(ENGINE, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
const first = fs.readFileSync(path.join(ENGINE, 'tests/v4/fixtures/greeting_macros_b1259.txt'), 'utf8');
const card = {
    spec: 'chara_card_v2', spec_version: '2.0', name: CARD, description: contract, personality: '', scenario: '', first_mes: first, mes_example: '',
    data: { name: CARD, description: contract, personality: '', scenario: '', first_mes: first, mes_example: '', creator_notes: 'Hotfix .137 greeting start', system_prompt: '', post_history_instructions: '', alternate_greetings: [], tags: [], creator: '', character_version: '', extensions: { world: WORLD } },
};
const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.writeFileSync(path.join(USER, `characters/${CARD}.png`), Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('tEXt', Buffer.concat([Buffer.from('chara\0', 'latin1'), Buffer.from(Buffer.from(JSON.stringify(card), 'utf8').toString('base64'), 'latin1')])),
    chunk('IDAT', zlib.deflateSync(Buffer.from([0, 60, 60, 90, 255]))), chunk('IEND', Buffer.alloc(0)),
]));
fs.rmSync(path.join(USER, 'chats', CARD), { recursive: true, force: true });
fs.copyFileSync(path.join(ENGINE, 'lorebook/Avereth_World_Lore_v0.14.json'), path.join(USER, 'worlds', `${WORLD}.json`));
fs.copyFileSync(path.join(ENGINE, `presets/${PRESET}.json`), path.join(USER, `OpenAI Settings/${PRESET}.json`));
const ext = path.join(USER, 'extensions/avereth-engine');
fs.rmSync(ext, { recursive: true, force: true });
fs.mkdirSync(ext, { recursive: true });
for (const f of ['index.js', 'manifest.json', 'style.css']) fs.copyFileSync(path.join(ENGINE, f), path.join(ext, f));
for (const d of ['src', 'content', 'regex']) fs.cpSync(path.join(ENGINE, d), path.join(ext, d), { recursive: true });
const settingsFile = path.join(USER, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
settings.firstRun = false;
settings.username = USERNAME;
if (settings.power_user) settings.power_user.personas = { ...(settings.power_user.personas || {}), 'user-default.png': USERNAME };
Object.assign(settings.oai_settings, { openai_max_context: 32000, openai_max_tokens: 1200, max_context_unlocked: true });
if (settings.extension_settings) delete settings.extension_settings.avereth;
fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 4));
const secretsFile = path.join(USER, 'secrets.json');
const secretsBefore = fs.existsSync(secretsFile) ? fs.readFileSync(secretsFile, 'utf8') : null;
fs.writeFileSync(secretsFile, JSON.stringify({ api_key_custom: [{ id: 'smoke', value: DUMMY_KEY, label: 'smoke', active: true }], _migrated: [] }, null, 4));

// ------------------------------------------------------------------------------------------------ mock provider
const calls = [];
const mock = http.createServer(async (req, res) => {
    if (req.url.endsWith('/models')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ object: 'list', data: [{ id: 'mock-narrator', object: 'model' }] })); return; }
    let body = '';
    for await (const c of req) body += c;
    const j = JSON.parse(body || '{}');
    const system = String(j.messages?.[0]?.content || '');
    const purpose = system.startsWith('You are the intent planner') || system.startsWith('You are the command interpreter') ? 'plan' : system.startsWith('You read one reply') ? 'extract' : 'narrator';
    calls.push(purpose);
    const text = purpose === 'plan' ? JSON.stringify({ commands: [] }) : purpose === 'extract' ? JSON.stringify({ scene: 'here', expected: {}, deltas: [] }) : 'The world waits.';
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id: 'c', object: 'chat.completion', created: 0, model: 'mock-narrator', choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1 } }));
});
await new Promise((r) => mock.listen(5001, '127.0.0.1', r));
const st = spawn(process.execPath, ['server.js', '--port', '8123', '--browserLaunchEnabled', 'false'], { cwd: ST, stdio: ['ignore', 'pipe', 'pipe'] });
let stOut = '';
st.stdout.on('data', (d) => { stOut += d; });
st.stderr.on('data', (d) => { stOut += d; });
for (let i = 0; i < 120 && !/listening on/.test(stOut); i++) await sleep(500);

const browser = await chromium.launch();
const results = [];
let pageErrors = [];
try {
    const driver = await Driver.create(browser, { turnTimeoutMs: 60000 });
    const page = driver.page;
    await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.SillyTavern?.getContext?.()?.characters?.length > 0, null, { timeout: 120000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelectorAll('dialog[open] .popup-button-ok, dialog[open] .popup-button-cancel').forEach((b) => b.click()));
    // the Chat Completion source "Custom" before the mock (as a player connects)
    const connect = async () => {
        await page.evaluate(() => {
            $('#main_api').val('openai').trigger('change');
            $('#chat_completion_source').val('custom').trigger('change');
            $('#custom_api_url_text').val('http://127.0.0.1:5001/v1').trigger('input');
            $('#custom_model_id').val('mock-narrator').trigger('input');
            SillyTavern.getContext().saveSettingsDebounced();
            $('#api_button_openai').trigger('click');
        });
        await page.waitForFunction(() => SillyTavern.getContext().onlineStatus && SillyTavern.getContext().onlineStatus !== 'no_connection', null, { timeout: 30000 });
        await page.evaluate((name) => { const o = [...document.querySelectorAll('#settings_preset_openai option')].find((x) => x.textContent === name); if (o) $('#settings_preset_openai').val(o.value).trigger('change'); }, PRESET);
        await page.waitForTimeout(1000);
    };
    await connect();
    const look = async () => page.evaluate(() => {
        const c = SillyTavern.getContext();
        return { chatId: c.getCurrentChatId(), chat: JSON.parse(JSON.stringify(c.chat)), shown: document.querySelector('#chat .mes[mesid="0"] .mes_text')?.innerText || '', user: c.name1 };
    });
    for (let n = 0; n < CHATS; n++) {
        const opened = n === 0 ? await driver.openCard(CARD) : await (async () => {
            await page.evaluate(async () => { await SillyTavern.getContext().executeSlashCommandsWithOptions('/newchat'); });
            await page.waitForFunction(() => (SillyTavern.getContext().chat[0]?.extra?.avereth?.events || []).some((e) => e.t === 'campaign.started'), null, { timeout: 60000 }).catch(() => {});
            await page.waitForTimeout(1200);
            return { started: true, chatId: await page.evaluate(() => SillyTavern.getContext().getCurrentChatId()) };
        })();
        log(`chat ${n + 1} opened`, opened.chatId);
        const greet = await look();
        const g0 = greet.chat[0];
        const start = (rec(g0)?.events || []).find((e) => e.t === 'campaign.started')?.d || null;
        const line = /Location: [^`\n]*/.exec(g0.mes)?.[0] || null;
        const r = {
            chat: opened.chatId, user: greet.user, started: opened.started, line, startLocation: start?.location || null,
            noMacroLeft: !/\{\{/.test(g0.mes), hashIsText: rec(g0)?.text_hash === hash32(g0.mes), oneStart: (rec(g0)?.events || []).filter((e) => e.t === 'campaign.started').length === 1,
            shownMatches: !!line && greet.shown.includes(line.replace(/^Location: /, '')), problemAtGreeting: startRecordProblem(greet.chat, content),
        };
        // the runner renames the chat (Driver.openCard; the {{pick}} seed is the chat id): the stored greeting must not change
        const renamed = await page.evaluate(async ({ from, to }) => { const c = SillyTavern.getContext(); try { await c.renameChat(from, to); return c.getCurrentChatId(); } catch (e) { return `error ${e?.message || e}`; } }, { from: opened.chatId, to: `Macro greeting ${n + 1} ${Date.now()}` });
        await page.waitForTimeout(1500);
        driver.testChat = await driver.identity(); // the chat the runner plays is the renamed one
        const after = await look();
        r.renamed = renamed;
        // SillyTavern rebuilds a chat nobody has played yet from the card when it is renamed (createOrEditCharacter:
        // shouldRegenerateMessage) and announces the new greeting again: the engine starts on that new message 0. What
        // must hold is one consistent start on the text SillyTavern now keeps and shows (under the new chat id)
        const a0 = after.chat[0];
        r.afterRename = { restartedBySt: (rec(a0)?.events?.[0]?.d?.seed ?? null) !== (rec(g0)?.events?.[0]?.d?.seed ?? null), line: /Location: [^`\n]*/.exec(a0.mes)?.[0] || null,
            startLocation: (rec(a0)?.events || []).find((e) => e.t === 'campaign.started')?.d?.location || null };
        r.consistentAfterRename = !/\{\{/.test(a0.mes) && rec(a0)?.text_hash === hash32(a0.mes) && (rec(a0)?.events || []).filter((e) => e.t === 'campaign.started').length === 1
            && startRecordProblem(after.chat, content) === null && after.shown.includes((r.afterRename.line || '').replace(/^Location: /, '') || '\u0000');
        log('renamed', renamed, JSON.stringify(r.afterRename));
        const toastsBefore = (await driver.toasts()).length;
        const sent = await driver.send(['Warrior', 'Mage', 'Rogue'][n % 3]);
        log('first turn sent', JSON.stringify(sent).slice(0, 200));
        const turn = await look();
        const toasts = (await driver.toasts()).slice(toastsBefore).map((t) => `${t.kind}: ${t.text.slice(0, 80)}`);
        const fold = foldChat(turn.chat);
        r.firstTurn = { ok: sent.ok, problem: sent.problem || null, toasts, hidden: toasts.some((t) => /CAMPAIGN START HIDDEN/.test(t)), playerEvents: messageEvents(turn.chat.findLast((m) => m.is_user)).length,
            cls: fold.state.entities.pc?.sheet?.class || null, location: fold.state.scene?.location || null, problemAfterTurn: startRecordProblem(turn.chat, content),
            foldErrors: fold.errors.length, problems: validateState(fold.state, content).length };
        // the skill choice completes the creation (the current starter pools of the three classes)
        const skills = { warrior: 'Heavy Slash + Guard', mage: 'Flame Lance + Arcane Wave', rogue: 'Razor Cut + Evasive Step' }[r.firstTurn.cls] || 'Heavy Slash + Guard';
        const second = await driver.send(skills);
        const done = await look();
        const toasts2 = (await driver.toasts()).slice(toastsBefore).map((t) => `${t.kind}: ${t.text.slice(0, 80)}`);
        const end = foldChat(done.chat);
        const sheet = end.state.entities.pc?.sheet || {};
        r.skillTurn = { ok: second.ok, problem: second.problem || null, skills, mode: end.state.mode, known: Object.keys(sheet.skills || {}), hidden: toasts2.some((t) => /CAMPAIGN START HIDDEN/.test(t)),
            problem2: startRecordProblem(done.chat, content), foldErrors: end.errors.length, problems: validateState(end.state, content).length,
            status: await page.evaluate(() => document.getElementById('avereth_status')?.textContent || '') };
        // the chat SillyTavern saved on disk holds the same consistent start
        await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); });
        await page.waitForTimeout(800);
        const dir = path.join(USER, 'chats', CARD);
        const file = fs.readdirSync(dir).map((f) => path.join(dir, f)).find((f) => f.includes(renamed)) || null;
        const saved = file ? fs.readFileSync(file, 'utf8').trim().split('\n').slice(1).map((l) => JSON.parse(l)) : null;
        r.saved = saved ? { file: path.basename(file), problem: startRecordProblem(saved, content), foldErrors: foldChat(saved).errors.length } : null;
        log('creation', JSON.stringify(r.skillTurn).slice(0, 240));
        results.push(r);
    }
    pageErrors = driver.pageErrors.map((e) => e.text);
} finally {
    await browser.close();
    st.kill();
    mock.close();
    if (secretsBefore === null) fs.rmSync(secretsFile, { force: true }); else fs.writeFileSync(secretsFile, secretsBefore);
}

const checks = {};
results.forEach((r, i) => {
    const k = `chat${i + 1}`;
    Object.assign(checks, {
        [`${k}StartedAtGreeting`]: r.started && r.oneStart,
        [`${k}GreetingResolved`]: r.noMacroLeft && /^Location: Public roadside verge outside (Alderwatch, Valedorn Crown|Glassmere, Caelreth|Ashbridge, Duskreach)$/.test(r.line || ''),
        [`${k}HashIsShownText`]: r.hashIsText && r.shownMatches,
        [`${k}PlaceAsShown`]: r.problemAtGreeting === null,
        [`${k}ConsistentAfterRename`]: r.consistentAfterRename,
        [`${k}FirstTurnPlayed`]: r.firstTurn.ok && !r.firstTurn.hidden && r.firstTurn.playerEvents > 0 && !!r.firstTurn.cls && r.firstTurn.problemAfterTurn === null && r.firstTurn.foldErrors === 0 && r.firstTurn.problems === 0,
        [`${k}SkillsChosen`]: r.skillTurn.ok && !r.skillTurn.hidden && r.skillTurn.mode === 'story' && r.skillTurn.known.length === 3 && r.skillTurn.problem2 === null && r.skillTurn.foldErrors === 0 && r.skillTurn.problems === 0,
        [`${k}Saved`]: !!r.saved && r.saved.problem === null && r.saved.foldErrors === 0,
    });
});
checks.statusLine = results.every((r) => r.skillTurn.status.includes(`Avereth Engine ${ENGINE_VERSION}`) && /integrity: OK/.test(r.skillTurn.status));
checks.noPageErrors = pageErrors.length === 0;
fs.writeFileSync(path.join(HERE, 'result.json'), JSON.stringify({ checks, results, calls, pageErrors }, null, 1));
console.log(JSON.stringify({ checks, results: results.map((r) => ({ line: r.afterRename.line, start: r.afterRename.startLocation, cls: r.firstTurn.cls, skills: r.skillTurn.known, mode: r.skillTurn.mode, toasts: r.firstTurn.toasts })), calls, pageErrors }, null, 1));
const ok = Object.values(checks).every(Boolean);
console.log(ok ? 'LIVE SILLYTAVERN GREETING START: OK' : `LIVE SILLYTAVERN GREETING START: FAILED (${Object.entries(checks).filter(([, v]) => !v).map(([k]) => k).join(', ')})`);
process.exit(ok ? 0 : 1);
