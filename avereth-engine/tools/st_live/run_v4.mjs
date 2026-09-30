// Live SillyTavern smoke for Runtime V4 (optional, docs/LIVETEST_V4.md): a real SillyTavern (tested with 1.19.0) with this
// extension, a narrator card whose description is the V4 contract, the preset "Avereth Narrator V4", Lorebook v0.13 as
// Character Lore, and a mock provider (OpenAI-compatible, port 5001) behind the Chat Completion source "Custom". The mock
// answers the narrator with the recorded prose of the V12 run and the engine's three structured calls (interpreter,
// extractor, Board generator) with the gold of P0/S3. The run plays the greeting (the campaign must start in V4), the
// Warrior's creation (System panels) and three story turns: into the Guild hall, "Im here to Register", the fee and the
// board. It checks, in the real host: the runtime; PLAYER ACTIONS and prose only in every narrator request; the reply read
// in the background through SillyTavern's own endpoint; the commit barrier (the next message is sent at once and waits for
// the reply's world); the HUD; the world after the replies; the engine's requests (temperatures, no streaming); and the
// key: SillyTavern adds it on its server, no request from the browser carries it. The key is a dummy
// ("smoke-not-a-real-key") written to this SillyTavern's secrets file before it starts, like its settings UI stores one,
// and removed afterwards. It judges no prose (scripted mock).
// Usage: AVERETH_ST_DIR=/path/to/SillyTavern node tools/st_live/run_v4.mjs   (SillyTavern started once before; Playwright)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadContent } from '../../tests/helpers.js';
import { generatorListing } from '../../tests/v4/harness.js';
import { V4_OUTPUT_LINE } from '../../src/context.js';
import { slug } from '../../src/util.js';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }

const ST = process.env.AVERETH_ST_DIR;
if (!ST) throw new Error('set AVERETH_ST_DIR to a SillyTavern checkout');
const ENGINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const USER = path.join(ST, 'data/default-user');
const HERE = process.env.AVERETH_ST_OUT || path.join(ST, 'avereth_live_smoke_v4');
fs.mkdirSync(HERE, { recursive: true });
const CARD = 'Avereth V4';
const WORLD = 'Avereth World Lore v0.13';
const PRESET = 'Avereth Narrator V4';
const DUMMY_KEY = 'smoke-not-a-real-key';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------------------------------------ the V12 turns
const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ENGINE, 'tests/testrun_v12/gold_v4.json'), 'utf8'));
const v12 = fs.readFileSync(path.join(ENGINE, 'tests/eval/deltas.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((t) => t.run === 'V12');
const booked = new Map(gold.board_generator.listings.map((l) => [l.id, `quest.${slug(l.title)}`]));
const asBooked = (text) => [...booked].reduce((t, [a, b]) => t.split(a).join(b), text);
function toProduct(answer) {
    const a = structuredClone(answer);
    for (const d of a.deltas || []) {
        const spec = content.deltaVocab.deltas.find((x) => x.type === d.type);
        for (const [k, f] of Object.entries(spec?.fields || {})) if (d[k] === undefined) d[k] = f.nullable ? null : k === 'count' ? 1 : d[k];
    }
    return a;
}
const TURNS = gold.turns.slice(0, 3).map((t, i) => ({ player: t.player, commands: t.commands, reply: v12[i].reply, answer: toProduct(t.recovery) }));
const warrior = content.classes.get('warrior');
const SKILLS = warrior.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' + ');

// ------------------------------------------------------------------------------------------------ setup
const contract = fs.readFileSync(path.join(ENGINE, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
const first = 'SYSTEM INITIALIZATION COMPLETE\n\n`Location: Public roadside verge outside Redmarch, Veyrhold`\n\nCHARACTER CREATION — STEP 1/2: choose a Base Class (Warrior, Mage, Guardian, Duelist, Ranger).';
const card = {
    spec: 'chara_card_v2', spec_version: '2.0',
    name: CARD, description: contract, personality: '', scenario: '', first_mes: first, mes_example: '',
    data: { name: CARD, description: contract, personality: '', scenario: '', first_mes: first, mes_example: '', creator_notes: 'Runtime V4 smoke', system_prompt: '', post_history_instructions: '', alternate_greetings: [], tags: [], creator: '', character_version: '', extensions: { world: WORLD } },
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
fs.rmSync(path.join(USER, 'chats', CARD), { recursive: true, force: true }); // a fresh campaign chat
fs.copyFileSync(path.join(ENGINE, 'lorebook/Avereth_World_Lore_v0.13.json'), path.join(USER, 'worlds', `${WORLD}.json`));
fs.copyFileSync(path.join(ENGINE, `presets/${PRESET}.json`), path.join(USER, `OpenAI Settings/${PRESET}.json`));
const ext = path.join(USER, 'extensions/avereth-engine');
fs.rmSync(ext, { recursive: true, force: true });
fs.mkdirSync(ext, { recursive: true });
for (const f of ['index.js', 'manifest.json', 'style.css']) fs.copyFileSync(path.join(ENGINE, f), path.join(ext, f));
for (const d of ['src', 'content', 'regex']) fs.cpSync(path.join(ENGINE, d), path.join(ext, d), { recursive: true });
const settingsFile = path.join(USER, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
settings.firstRun = false;
settings.username = 'Alaric';
Object.assign(settings.oai_settings, { openai_max_context: 32000, openai_max_tokens: 1200, max_context_unlocked: true });
if (settings.extension_settings) delete settings.extension_settings.avereth; // the defaults: new campaigns run V4
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
    const msgs = j.messages || [];
    const system = String(msgs[0]?.content || '');
    const users = msgs.filter((m) => m.role === 'user').map((m) => String(m.content)).join('\n');
    const lastUser = String([...msgs].reverse().find((m) => m.role === 'user')?.content || '');
    let purpose = 'narrator';
    let text;
    let delay = 0;
    if (system.startsWith('You are the command interpreter')) {
        purpose = 'interpret';
        const t = TURNS.find((x) => users.includes(`PLAYER MESSAGE:\n${x.player}`));
        text = JSON.stringify({ commands: t ? t.commands : [] });
    } else if (system.startsWith('You read one reply')) {
        purpose = 'extract';
        const t = TURNS.find((x) => users.includes(x.reply.slice(0, 60)));
        text = asBooked(JSON.stringify(t ? t.answer : { expected: {}, deltas: [] }));
        delay = 1500; // the extractor takes a while: the next message is sent before it answers (the barrier)
    } else if (system.startsWith('You write the official contracts')) {
        purpose = 'board';
        text = JSON.stringify({ listings: gold.board_generator.listings.map(generatorListing) });
        delay = 300;
    } else {
        const t = TURNS.find((x) => lastUser.includes(x.player));
        text = t ? t.reply : 'The world waits.';
    }
    calls.push({ purpose, at: Date.now(), auth: req.headers.authorization || null, stream: !!j.stream, temperature: j.temperature, model: j.model, messages: msgs, lastUser });
    if (delay) await sleep(delay);
    if (j.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
        for (let i = 0; i < text.length; i += 24) {
            res.write(`data: ${JSON.stringify({ id: 'c', object: 'chat.completion.chunk', created: 0, model: 'mock-narrator', choices: [{ index: 0, delta: { content: text.slice(i, i + 24) }, finish_reason: null }] })}\n\n`);
            await sleep(5);
        }
        res.write(`data: ${JSON.stringify({ id: 'c', object: 'chat.completion.chunk', created: 0, model: 'mock-narrator', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`);
        res.end('data: [DONE]\n\n');
    } else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 'c', object: 'chat.completion', created: 0, model: 'mock-narrator', choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1 } }));
    }
});
await new Promise((r) => mock.listen(5001, '127.0.0.1', r));

// ------------------------------------------------------------------------------------------------ SillyTavern
const st = spawn(process.execPath, ['server.js', '--port', '8123', '--browserLaunchEnabled', 'false'], { cwd: ST, stdio: ['ignore', 'pipe', 'pipe'] });
let stOut = '';
st.stdout.on('data', (d) => { stOut += d; });
st.stderr.on('data', (d) => { stOut += d; });
for (let i = 0; i < 120 && !/listening on/.test(stOut); i++) await sleep(500);

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
const keyInBrowser = [];
page.on('pageerror', (e) => pageErrors.push(`${e.message} ${String(e.stack || '').split('\n').slice(1, 4).join(' ')}`));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) pageErrors.push(`${m.text()} @ ${m.location()?.url?.split('/').pop()}:${m.location()?.lineNumber}`); });
// every request the browser sends (the extension's included): none may carry the key, in headers or body
page.on('request', (r) => { if (`${JSON.stringify(r.headers())}\n${r.postData() || ''}`.includes(DUMMY_KEY)) keyInBrowser.push(r.url()); });
page.on('response', async (r) => {
    // nor may SillyTavern hand it to the page (the secrets state says only whether a key exists)
    try { if (/\/api\//.test(r.url()) && (await r.text()).includes(DUMMY_KEY)) keyInBrowser.push(`response ${r.url()}`); } catch { /* bodies of redirects and aborted requests */ }
});
let result = null;
try {
    await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('dialog[open]', { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => {
        const d = document.querySelector('dialog[open]');
        if (!d) return;
        const ta = d.querySelector('textarea, input[type="text"]');
        if (ta) { ta.value = 'Alaric'; ta.dispatchEvent(new Event('input', { bubbles: true })); }
        d.querySelector('.popup-button-ok')?.click();
    });
    await page.waitForFunction(() => window.SillyTavern?.getContext?.()?.characters?.length > 0, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelectorAll('dialog[open] .popup-button-ok, dialog[open] .popup-button-cancel').forEach((b) => b.click()));
    // the connection as a player sets it: Chat Completion, source Custom, the mock's URL and model; the key is already
    // in SillyTavern's secrets (never typed into the page here)
    await page.evaluate(() => {
        $('#main_api').val('openai').trigger('change');
        $('#chat_completion_source').val('custom').trigger('change');
        $('#custom_api_url_text').val('http://127.0.0.1:5001/v1').trigger('input');
        $('#custom_model_id').val('mock-narrator').trigger('input');
        SillyTavern.getContext().saveSettingsDebounced();
        $('#api_button_openai').trigger('click');
    });
    await page.waitForFunction(() => SillyTavern.getContext().onlineStatus && SillyTavern.getContext().onlineStatus !== 'no_connection', null, { timeout: 30000 });
    // the preset, chosen in the UI: its prompts and settings apply (streaming off), the connection stays
    await page.evaluate((name) => {
        const opt = [...document.querySelectorAll('#settings_preset_openai option')].find((o) => o.textContent === name);
        if (!opt) throw new Error(`no Chat Completion preset "${name}"`);
        $('#settings_preset_openai').val(opt.value).trigger('change');
    }, PRESET);
    await page.waitForTimeout(1500);
    const chid = await page.evaluate((name) => SillyTavern.getContext().characters.findIndex((c) => c.name === name), CARD);
    await page.evaluate(async (id) => { await SillyTavern.getContext().selectCharacterById(String(id)); }, chid);
    await page.waitForFunction(() => SillyTavern.getContext().chat.length >= 1, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    const greeting = await page.evaluate(() => {
        const m = SillyTavern.getContext().chat[0];
        return { events: (m.extra?.avereth?.events || []).map((e) => ({ t: e.t, runtime: e.d?.runtime })), status: document.getElementById('avereth_status')?.textContent || '' };
    });

    const extraction = () => page.evaluate(() => {
        const chat = SillyTavern.getContext().chat;
        const i = chat.findLastIndex((m) => !m.is_user && !m.is_system);
        return { i, x: chat[i]?.extra?.avereth?.extraction || null };
    });
    /** Send one player message; wait for the reply (or the System panel); optionally for the reply's world. */
    async function send(text, { world = true } = {}) {
        const before = await page.evaluate(() => SillyTavern.getContext().chat.length);
        const t0 = Date.now();
        await page.evaluate((t) => { $('#send_textarea').val(t).trigger('input'); $('#send_but').trigger('click'); }, text);
        for (let i = 0; i < 600; i++) {
            const s = await page.evaluate(() => ({ n: SillyTavern.getContext().chat.length, busy: getComputedStyle(document.querySelector('#mes_stop')).display !== 'none' }));
            if (s.n >= before + 2 && !s.busy) break;
            await page.waitForTimeout(50);
        }
        const replied = Date.now() - t0;
        await page.waitForTimeout(300); // MESSAGE_RECEIVED: the reply's record (pending) and its first display
        const pending = await extraction();
        if (world) {
            for (let i = 0; i < 300; i++) {
                const e = await extraction();
                if (!e.x || (e.x.status !== 'pending' && e.x.board !== 'pending')) break;
                await page.waitForTimeout(100);
            }
            await page.waitForTimeout(500); // re-render and save after the extraction
        }
        const view = await page.evaluate(() => {
            const ctx = SillyTavern.getContext();
            const m = ctx.chat[ctx.chat.length - 1];
            const els = document.querySelectorAll('#chat .mes');
            const last = els[els.length - 1];
            return {
                system: !!m.is_system, panelText: m.is_system ? m.mes : '', mes: m.mes, display: m.extra?.display_text || '',
                extraction: m.extra?.avereth?.extraction ? { status: m.extra.avereth.extraction.status, board: m.extra.avereth.extraction.board || null } : null,
                rejected: m.extra?.avereth?.rejected || [], corrections: m.extra?.avereth?.corrections || [],
                huds: last?.querySelectorAll('details.avereth-hud, details.custom-avereth-hud').length || 0,
                hudText: [...(last?.querySelectorAll('details.avereth-hud, details.custom-avereth-hud') || [])].map((d) => d.textContent).join('\n'),
                shown: last?.querySelector('.mes_text')?.innerText || '',
            };
        });
        return { text, replied, pendingAfterReply: pending.x?.status || null, ...view };
    }

    const turns = [];
    turns.push(await send('Warrior'));
    turns.push(await send(SKILLS));
    // t1, then t2 at once: the barrier holds t2 until t1's world is committed (the board waits for t3, when he reads it)
    turns.push(await send(TURNS[0].player, { world: false }));
    const t1Index = await page.evaluate(() => SillyTavern.getContext().chat.findLastIndex((m) => !m.is_user && !m.is_system));
    turns.push(await send(TURNS[1].player));
    turns.push(await send(TURNS[2].player));
    const end = await page.evaluate(async (i1) => {
        const ctx = SillyTavern.getContext();
        const { foldChat } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js').catch(() => import('/extensions/avereth-engine/src/host.js')).catch(() => ({}));
        const s = foldChat ? foldChat(ctx.chat).state : null;
        return {
            t1: ctx.chat[i1]?.extra?.avereth?.extraction ? { status: ctx.chat[i1].extra.avereth.extraction.status, board: ctx.chat[i1].extra.avereth.extraction.board || null } : null,
            state: s ? { at: s.scene.at, coin: s.entities.pc.sheet.coin_cp, member: s.guild.membership?.rank || null, quests: Object.fromEntries(Object.values(s.quests).map((q) => [q.title, q.status])) } : null,
            status: document.getElementById('avereth_status')?.textContent || '',
            chatFile: ctx.getCurrentChatId(),
        };
    }, t1Index);
    result = { greeting, turns, end };
} finally {
    await browser.close();
    st.kill();
    mock.close();
    if (secretsBefore === null) fs.rmSync(secretsFile, { force: true }); else fs.writeFileSync(secretsFile, secretsBefore);
}

// the saved chat never holds the key
const chatDir = path.join(USER, 'chats', CARD);
const chatText = fs.existsSync(chatDir) ? fs.readdirSync(chatDir).map((f) => fs.readFileSync(path.join(chatDir, f), 'utf8')).join('\n') : '';
const { greeting, turns, end } = result;
const T = (needle) => turns.find((t) => t.text.includes(needle)) || {};
const narr = calls.filter((c) => c.purpose === 'narrator');
const engineOf = (c) => String(c?.messages?.find((m) => String(m.content).startsWith('[AVERETH ENGINE'))?.content || '');
const byTurn = (i) => narr.find((c) => c.lastUser.includes(TURNS[i].player));
const idx = (c) => calls.indexOf(c);
const presetFile = JSON.parse(fs.readFileSync(path.join(ENGINE, `presets/${PRESET}.json`), 'utf8'));
const jailbreak = presetFile.prompts.find((p) => p.identifier === 'jailbreak')?.content;
// the one refusal of the V12 gold (as tests/v4/golden_v12.test.js): the clerk's "Novices may take only Novice contracts
// without a desk-clerk waiver" (gold t2, seq 1) invents a contract rule; the Guild's ranks and rules are the engine's
// canon since the live run of 28.09.2026 (guild_canon); the recorded t3 reply has the Weasel contract taken in the very
// reply that shows the board, refused since 4.0.9 (board_first_display)
const EXPECTED_REJECTED = { 1: ['1:fact:guild_canon'], 2: ['3:listing.gone:board_first_display'] };
const checks = {
    campaignV4AtGreeting: greeting.events.some((e) => e.t === 'campaign.started' && e.runtime === 'v4'),
    creationBySystem: T('Warrior').system && /CLASS SELECTED: WARRIOR/.test(T('Warrior').panelText) && T(SKILLS).system && /CHARACTER CREATION COMPLETE/.test(T(SKILLS).panelText)
        && !calls.some((c) => c.lastUser === 'Warrior' || c.lastUser === SKILLS),
    // the Board generator runs when Alaric reads the board (t3, 4.0.7), not on the arrival at the hall
    engineCalls: JSON.stringify(calls.filter((c) => c.purpose !== 'narrator').map((c) => c.purpose)) === JSON.stringify(['interpret', 'extract', 'interpret', 'extract', 'interpret', 'board', 'extract']),
    engineCallParams: calls.filter((c) => c.purpose !== 'narrator').every((c) => !c.stream && c.model === 'mock-narrator' && c.temperature === (c.purpose === 'board' ? 0.6 : 0.1)),
    keyAddedBySillyTavern: calls.length > 0 && calls.every((c) => c.auth === `Bearer ${DUMMY_KEY}`),
    keyNeverInBrowser: keyInBrowser.length === 0,
    keyNotInChatFile: chatText.length > 0 && !chatText.includes(DUMMY_KEY),
    playerActionsProseOnly: narr.length === 3 && narr.every((c) => {
        const e = engineOf(c);
        return /PLAYER ACTIONS \(the engine resolved Alaric's message/.test(e) && e.trimEnd().endsWith(V4_OUTPUT_LINE) && !/FACT REPORT|End EVERY reply with <avereth>/.test(e)
            && c.messages.at(-1).content === jailbreak && c.messages.some((m) => String(m.content).startsWith('AVERETH RPG — SANDBOX NARRATOR CONTRACT') && String(m.content).includes('Write only the story. No <avereth> block'));
    }),
    actionsPerTurn: engineOf(byTurn(0)).includes("GOES — to Adventurers' Guild hall") && engineOf(byTurn(1)).includes('REGISTERS — pending') && engineOf(byTurn(1)).includes('20 cp')
        && engineOf(byTurn(2)).includes('PAYS — the Guild registration fee, 20 cp') && engineOf(byTurn(2)).includes("**Miller's Run Escort** — client: Harrow's mill · reward: 80 cp"),
    readInBackground: T(TURNS[0].player).pendingAfterReply === 'pending',
    barrier: end.t1?.status === 'applied' && idx(byTurn(1)) > idx(calls.find((c) => c.purpose === 'extract')) && idx(calls.find((c) => c.purpose === 'board')) > idx(byTurn(1)),
    world: end.state?.member === 'Novice' && end.state?.coin === 30 && end.state?.at === 'loc.redmarch.guild_hall' && end.state?.quests["Weasel Sign at Fenwick's Coop"] === 'listed'
        && Object.values(end.state?.quests || {}).filter((x) => x === 'listed').length === 5,
    everyReplyApplied: [1, 2].every((i) => T(TURNS[i].player).extraction?.status === 'applied'
        && JSON.stringify(T(TURNS[i].player).rejected.map((x) => `${x.seq}:${x.type}:${x.rule}`)) === JSON.stringify(EXPECTED_REJECTED[i])),
    hudUnderReplies: [0, 1, 2].every((i) => T(TURNS[i].player).huds === 2) && /Guild hall/.test(T(TURNS[2].player).hudText),
    proseShown: [0, 1, 2].every((i) => !/<avereth|"deltas"|PLAYER ACTIONS/.test(T(TURNS[i].player).shown)),
    statusLine: /runtime v4 \(LLM: custom endpoint\)/.test(end.status) && /integrity: OK/.test(end.status),
    noPageErrors: pageErrors.length === 0,
};
fs.writeFileSync(path.join(HERE, 'result.json'), JSON.stringify({ checks, greeting, end, turns: turns.map((t) => ({ ...t, display: t.display.slice(0, 400) })), calls: calls.map((c) => ({ purpose: c.purpose, stream: c.stream, temperature: c.temperature, auth: c.auth ? 'Bearer <dummy>' : null, n: c.messages.length, lastUser: c.lastUser.slice(0, 80) })), keyInBrowser, pageErrors }, null, 1));
fs.writeFileSync(path.join(HERE, 'narrator_t2_request.json'), JSON.stringify(byTurn(1)?.messages || [], null, 1));
console.log(JSON.stringify(checks, null, 1));
console.log(JSON.stringify({ calls: calls.map((c) => `${c.purpose}${c.purpose === 'narrator' ? '' : ` t=${c.temperature}`}`), t1: end.t1, state: end.state, status: end.status, keyInBrowser, pageErrors: pageErrors.slice(0, 5) }, null, 1));
console.log(Object.values(checks).every(Boolean) ? 'LIVE SILLYTAVERN SMOKE V4: OK' : 'LIVE SILLYTAVERN SMOKE V4: FAILED');
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
