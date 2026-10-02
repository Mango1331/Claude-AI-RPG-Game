// Live SillyTavern smoke for the GM-tools experiment (Prototype B, 4.3.0-alpha): a real SillyTavern (tested with 1.19.0)
// with this extension (setting gmTools on), the V4 narrator card and preset, SillyTavern's own function calling switched
// on, and a mock provider (OpenAI-compatible, port 5001) that answers with OpenAI tool_calls. Scripted, it judges no prose.
// It checks, in the real host (docs/ARCHITECTURE_REVIEW_GM_TOOLS.md §5):
//  - the tools are registered for the first request (the interceptor ran before SillyTavern asked shouldRegister);
//  - a tool stages and the recursion sees its result: no tool answers no_active_gm_turn, the intermediate tool messages
//    carry no events, the final reply carries the whole turn and the HUD;
//  - a journey resolved through resolve_story ends through commit_world arrive;
//  - Swipe (new decision, old swipe selected again), a swipe that calls tools, Regenerate, delete + retry, save/reload:
//    each starts from the state before the player message and keeps no other branch's result.
// AVERETH_GM_STREAM=1 streams; AVERETH_GM_REUSE_IDS=1 repeats the tool-call ids across branches (some OpenAI-compatible
// backends do). The key is a dummy written to this SillyTavern's secrets file for the run and removed afterwards.
// Usage: AVERETH_ST_DIR=/path/to/SillyTavern [AVERETH_ST_OUT=dir] node tools/st_live/run_gm.mjs   (after tools/st_live/setup.mjs)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadContent } from '../../tests/helpers.js';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }

const ST = process.env.AVERETH_ST_DIR;
if (!ST) throw new Error('set AVERETH_ST_DIR to a SillyTavern checkout');
const ENGINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const USER = path.join(ST, 'data/default-user');
const HERE = process.env.AVERETH_ST_OUT || path.join(ST, 'avereth_live_smoke_gm');
const STREAM = process.env.AVERETH_GM_STREAM === '1';
fs.mkdirSync(HERE, { recursive: true });
const CARD = 'Avereth V4';
const WORLD = 'Avereth World Lore v0.13';
const PRESET = 'Avereth Narrator V4';
const DUMMY_KEY = 'smoke-not-a-real-key';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------------------------------------ content
const content = await loadContent();
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
settings.extension_settings = settings.extension_settings || {};
settings.extension_settings.avereth = { gmTools: true };
fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 4));
const secretsFile = path.join(USER, 'secrets.json');
const secretsBefore = fs.existsSync(secretsFile) ? fs.readFileSync(secretsFile, 'utf8') : null;
fs.writeFileSync(secretsFile, JSON.stringify({ api_key_custom: [{ id: 'smoke', value: DUMMY_KEY, label: 'smoke', active: true }], _migrated: [] }, null, 4));


// ------------------------------------------------------------------------------------------------ mock provider
const P1 = '*I walk into the city ahead of me and make my way to the Adventurers Guild*';
const P2 = '*I look around the hall and listen to the clerks*';
const P3 = '*I carve a small mark into the bench by the door*';
const P5 = '*I ask the nearest clerk whether there is work for a newcomer*';
const calls = [];
let p3Count = 0;
let p2Count = 0;
let p5Count = 0;
// real providers give every call a fresh id; AVERETH_GM_REUSE_IDS=1 repeats them (some OpenAI-compatible backends do)
const REUSE_IDS = process.env.AVERETH_GM_REUSE_IDS === '1';
let callSeq = 0;
const toolCall = (id, name, args) => ({ id: REUSE_IDS ? id : `${id}_${++callSeq}`, type: 'function', function: { name, arguments: JSON.stringify(args) } });
function plan(msgs) {
    const lastU = msgs.map((m) => m.role).lastIndexOf('user');
    const lastUser = String(msgs[lastU]?.content || '');
    const after = msgs.slice(lastU + 1);
    const toolResults = after.filter((m) => m.role === 'tool');
    if (lastUser.includes(P1)) {
        if (!toolResults.length) return { tools: [toolCall('call_go_1', 'avereth_resolve_story', { commands: [{ type: 'go', to: 'loc.redmarch.guild_hall', quote: 'make my way to the Adventurers Guild' }] })] };
        // the prose takes him all the way there: the journey ends through commit_world arrive
        if (toolResults.length === 1) return { tools: [toolCall('call_arrive_1', 'avereth_commit_world', { changes: [{ type: 'arrive', at: 'loc.redmarch.guild_hall' }] })] };
        return { text: 'He walks through the gate and down the wide street until the Guild hall rises ahead, its doors open to the morning.' };
    }
    if (lastUser.includes(P2)) {
        if (p2Count++ === 0 || toolResults.length) return { text: 'The hall hums with low talk; a clerk stamps a ledger while another argues quietly about a bounty.' };
        // the swipe of P2 decides differently: it persists a fact through a tool
        // the swipe of that turn persists a different fact: the first swipe's fact must not survive it
        const p = p2Count > 2 ? 'noise_swipe' : 'noise';
        return { tools: [toolCall('call_fact_p2', 'avereth_commit_world', { changes: [{ type: 'fact', s: 'loc.redmarch.guild_hall', p, o: p2Count > 2 ? 'clerks arguing loudly over a ledger' : 'a constant low murmur of clerks' }] })] };
    }
    if (lastUser.includes(P3)) {
        if (toolResults.length === 0 && p3Count === 0) { p3Count++; return { tools: [toolCall('call_lookup_3', 'avereth_lookup', { kind: 'scene' })] }; }
        if (toolResults.length === 1 && p3Count === 1) { p3Count++; return { tools: [toolCall('call_commit_3', 'avereth_commit_world', { changes: [{ type: 'fact', s: 'loc.redmarch.guild_hall', p: 'bench_mark', o: 'a small carved A on the bench by the door' }] })] }; }
        if (toolResults.length >= 2) return { text: 'He scratches a small A into the soft wood of the bench by the door; nobody seems to notice.' };
        p3Count++;
        return { text: 'He thinks better of it and leaves the bench alone.', staleSeen: toolResults.length };
    }
    if (lastUser.includes(P5)) {
        // first answer and the retry after a delete persist a fact through a tool; the regenerate in between does not
        if (toolResults.length) return { text: 'The clerk points at the board: rat work in the cellars, nothing grander for a newcomer.' };
        if (p5Count++ === 1) return { text: 'The clerk shrugs and waves him on toward the board.' };
        return { tools: [toolCall('call_work_5', 'avereth_commit_world', { changes: [{ type: 'fact', s: 'loc.redmarch.guild_hall', p: 'asked_work', o: 'a newcomer asked the clerks for work' }] })] };
    }
    return { text: 'The world waits.' };
}
const mock = http.createServer(async (req, res) => {
    if (req.url.endsWith('/models')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ object: 'list', data: [{ id: 'mock-narrator', object: 'model' }] })); return; }
    let body = '';
    for await (const c of req) body += c;
    const j = JSON.parse(body || '{}');
    const msgs = j.messages || [];
    const lastU = msgs.map((m) => m.role).lastIndexOf('user');
    const p = plan(msgs);
    calls.push({ allRoles: msgs.map((m) => m.role + (m.tool_calls ? '(calls)' : m.tool_call_id ? '(result)' : '')).join(' '), stream: !!j.stream, tools: (j.tools || []).map((t) => t.function?.name), lastUser: String(msgs[lastU]?.content || '').slice(0, 80), roles: msgs.slice(lastU + 1).map((m) => m.role + (m.tool_calls ? `(${m.tool_calls.map((t) => t.id).join(',')})` : m.tool_call_id ? `(${m.tool_call_id})` : '')), toolResults: msgs.slice(lastU + 1).filter((m) => m.role === 'tool').map((m) => String(m.content).slice(0, 300)), answer: p.tools ? p.tools.map((t) => t.function.name) : 'text' });
    if (j.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
        const chunk = (delta, fin = null) => res.write(`data: ${JSON.stringify({ id: 'c', object: 'chat.completion.chunk', created: 0, model: 'mock-narrator', choices: [{ index: 0, delta, finish_reason: fin }] })}\n\n`);
        if (p.tools) {
            p.tools.forEach((t, i) => chunk({ tool_calls: [{ index: i, id: t.id, type: 'function', function: { name: t.function.name, arguments: t.function.arguments } }] }));
            chunk({}, 'tool_calls');
        } else {
            for (let i = 0; i < p.text.length; i += 24) { chunk({ content: p.text.slice(i, i + 24) }); await sleep(5); }
            chunk({}, 'stop');
        }
        res.end('data: [DONE]\n\n');
    } else {
        res.writeHead(200, { 'content-type': 'application/json' });
        const message = p.tools ? { role: 'assistant', content: '', tool_calls: p.tools } : { role: 'assistant', content: p.text };
        res.end(JSON.stringify({ id: 'c', object: 'chat.completion', created: 0, model: 'mock-narrator', choices: [{ index: 0, message, finish_reason: p.tools ? 'tool_calls' : 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1 } }));
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
const consoleLog = [];
page.on('pageerror', (e) => pageErrors.push(`${e.message} ${String(e.stack || '').split('\n').slice(1, 3).join(' ')}`));
page.on('console', (m) => { const t = m.text(); if (/Avereth|ToolManager|tool/i.test(t)) consoleLog.push(`${m.type()}: ${t.slice(0, 200)}`); if (m.type() === 'error' && !/favicon|Failed to load resource/.test(t)) pageErrors.push(t.slice(0, 300)); });
let result = null;
const snap = () => page.evaluate(() => {
    const ctx = SillyTavern.getContext();
    return ctx.chat.map((m, i) => ({ i, user: !!m.is_user, system: !!m.is_system, tool: !!m.extra?.tool_invocations, toolIds: (m.extra?.tool_invocations || []).map((x) => x.id), toolOk: (m.extra?.tool_invocations || []).map((x) => { try { return JSON.parse(x.result).ok ?? null; } catch { return String(x.result).slice(0, 80); } }), toolRes: (m.extra?.tool_invocations || []).map((x) => String(x.result).slice(0, 160)), mes: String(m.mes).slice(0, 70), swipes: m.swipes?.length || 0, swipe_id: m.swipe_id ?? null, gm: m.extra?.avereth?.gm_tools || null, events: (m.extra?.avereth?.events || []).map((e) => e.t), hud: !!m.extra?.avereth?.hud }));
});
const fold = () => page.evaluate(async () => {
    const ctx = SillyTavern.getContext();
    const { foldChat } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js').catch(() => import('/extensions/avereth-engine/src/host.js'));
    const s = foldChat(ctx.chat).state;
    return { turn: s.turn, at: s.scene.at, facts: Object.values(s.facts).filter((f) => ['bench_mark', 'noise', 'noise_swipe', 'asked_work'].includes(f.p)).map((f) => `${f.p}:${f.o}`), status: document.getElementById('avereth_status')?.textContent || '' };
});
async function idle() {
    for (let i = 0; i < 600; i++) {
        const busy = await page.evaluate(() => getComputedStyle(document.querySelector('#mes_stop')).display !== 'none');
        if (!busy) break;
        await page.waitForTimeout(50);
    }
    await page.waitForTimeout(800);
}
async function send(text) {
    await page.evaluate((t) => { $('#send_textarea').val(t).trigger('input'); $('#send_but').trigger('click'); }, text);
    await page.waitForTimeout(400);
    await idle();
}
try {
    await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('dialog[open]', { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => { const d = document.querySelector('dialog[open]'); if (!d) return; const ta = d.querySelector('textarea, input[type="text"]'); if (ta) { ta.value = 'Alaric'; ta.dispatchEvent(new Event('input', { bubbles: true })); } d.querySelector('.popup-button-ok')?.click(); });
    await page.waitForFunction(() => window.SillyTavern?.getContext?.()?.characters?.length > 0, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelectorAll('dialog[open] .popup-button-ok, dialog[open] .popup-button-cancel').forEach((b) => b.click()));
    await page.evaluate(() => {
        $('#main_api').val('openai').trigger('change');
        $('#chat_completion_source').val('custom').trigger('change');
        $('#custom_api_url_text').val('http://127.0.0.1:5001/v1').trigger('input');
        $('#custom_model_id').val('mock-narrator').trigger('input');
        SillyTavern.getContext().saveSettingsDebounced();
        $('#api_button_openai').trigger('click');
    });
    await page.waitForFunction(() => SillyTavern.getContext().onlineStatus && SillyTavern.getContext().onlineStatus !== 'no_connection', null, { timeout: 30000 });
    await page.evaluate((name) => { const opt = [...document.querySelectorAll('#settings_preset_openai option')].find((o) => o.textContent === name); $('#settings_preset_openai').val(opt.value).trigger('change'); }, PRESET);
    await page.waitForTimeout(1500);
    // function calling on (the player's checkbox), streaming as the run asks
    await page.evaluate((stream) => {
        $('#openai_function_calling').prop('checked', true).trigger('input');
        $('#stream_toggle').prop('checked', stream).trigger('input');
        SillyTavern.getContext().saveSettingsDebounced();
    }, STREAM);
    await page.waitForTimeout(800);
    const support = await page.evaluate(() => ({ fc: SillyTavern.getContext().isToolCallingSupported?.() ?? null, gm: !!SillyTavern.getContext().extensionSettings?.avereth?.gmTools }));
    const chid = await page.evaluate((name) => SillyTavern.getContext().characters.findIndex((c) => c.name === name), CARD);
    await page.evaluate(async (id) => { await SillyTavern.getContext().selectCharacterById(String(id)); }, chid);
    await page.waitForFunction(() => SillyTavern.getContext().chat.length >= 1, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await send('Warrior');
    await send(SKILLS);
    const steps = {};
    await send(P1); steps.p1 = { chat: await snap(), state: await fold() };
    await send(P2); steps.p2 = { chat: await snap(), state: await fold() };
    await send(P3); steps.p3 = { chat: await snap(), state: await fold() };
    // swipe the P3 reply: the mock answers without tools this time
    await page.evaluate(() => { document.querySelector('#chat .last_mes .swipe_right')?.click(); });
    await page.waitForTimeout(400); await idle();
    steps.p3swipe = { chat: await snap(), state: await fold() };
    // back to the first swipe (the carved mark): its events count again
    await page.evaluate(() => { document.querySelector('#chat .last_mes .swipe_left')?.click(); });
    await page.waitForTimeout(600); await idle();
    steps.p3old = { chat: await snap(), state: await fold() };
    // a new turn whose reply persists a fact through a tool, then a swipe of it that calls the tool again
    await send(P2); steps.p4 = { chat: await snap(), state: await fold() };
    await page.evaluate(() => { document.querySelector('#chat .last_mes .swipe_right')?.click(); });
    await page.waitForTimeout(400); await idle();
    steps.p4swipe = { chat: await snap(), state: await fold() };
    // a fresh turn whose reply persists a fact; then Regenerate (no tool), then delete the reply and retry (tool again)
    await send(P5); steps.p5 = { chat: await snap(), state: await fold() };
    await page.evaluate(() => { document.querySelector('#option_regenerate')?.click(); });
    await page.waitForTimeout(400); await idle();
    steps.p5regen = { chat: await snap(), state: await fold() };
    await page.evaluate(async () => { await SillyTavern.getContext().deleteLastMessage(); });
    await page.waitForTimeout(300);
    await send('');
    steps.p5retry = { chat: await snap(), state: await fold() };
    // save, reload, reopen: the folded state must be the same
    const beforeReload = await fold();
    const chatFile = await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); return SillyTavern.getContext().getCurrentChatId(); });
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.SillyTavern?.getContext?.()?.characters?.length > 0, null, { timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.evaluate(() => document.querySelectorAll('dialog[open] .popup-button-ok, dialog[open] .popup-button-cancel').forEach((b) => b.click()));
    await page.evaluate(async (id) => { await SillyTavern.getContext().selectCharacterById(String(id)); }, chid);
    await page.waitForTimeout(1500);
    const reopened = await page.evaluate(() => ({ id: SillyTavern.getContext().getCurrentChatId(), n: SillyTavern.getContext().chat.length }));
    if (reopened.id !== chatFile) await page.evaluate(async (f) => { await SillyTavern.getContext().openCharacterChat?.(f); }, chatFile);
    await page.waitForFunction(() => SillyTavern.getContext().chat.length > 10, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const afterReload = await fold();
    steps.reload = { chatFile, reopened, chat: await snap(), state: afterReload, same: JSON.stringify({ ...afterReload, status: '' }) === JSON.stringify({ ...beforeReload, status: '' }) };
    result = { support, steps };
} finally {
    await browser.close();
    st.kill();
    mock.close();
    if (secretsBefore === null) fs.rmSync(secretsFile, { force: true }); else fs.writeFileSync(secretsFile, secretsBefore);
}
fs.writeFileSync(path.join(HERE, `result_${STREAM ? 'stream' : 'nostream'}${REUSE_IDS ? '_reuse' : ''}.json`), JSON.stringify({ ...result, calls, pageErrors, consoleLog: consoleLog.slice(-60) }, null, 1));
console.log(JSON.stringify({ stream: STREAM, support: result.support, calls: calls.map((c) => `${c.lastUser.slice(0, 30)} | after: [${c.roles.join(' ')}] -> ${c.answer} | tools offered ${c.tools.length}`), pageErrors: pageErrors.slice(0, 5) }, null, 1));
// the verdicts (facts of the folded state per step; the chat structure is printed below)
const steps = result.steps;
const has = (k, p) => steps[k].state.facts.some((f) => f.startsWith(`${p}:`));
const finalOf = (k, re) => steps[k].chat.filter((m) => !m.user && !m.system && re.test(m.mes)).at(-1);
const checks = {
    tools_offered_on_every_request: calls.every((c) => c.tools.length === 5),
    no_tool_lost_its_turn: Object.values(steps).every((v) => v.chat.every((m) => m.toolRes.every((r) => !/no_active_gm_turn/.test(r)))),
    recursion_sees_the_tool_results: calls.filter((c) => c.answer === 'text' && c.toolResults.length).length >= 5,
    tool_messages_carry_no_events: Object.values(steps).every((v) => v.chat.filter((m) => m.tool).every((m) => !m.events.length)),
    final_reply_carries_turn_and_hud: (() => { const m = finalOf('p1', /^He walks through the gate/); return !!m && m.gm?.calls?.includes('avereth_resolve_story') && m.events.length > 0 && m.hud; })(),
    journey_ends_with_arrive: steps.p1.state.at === 'loc.redmarch.guild_hall',
    swipe_drops_first_swipe: has('p3', 'bench_mark') && !has('p3swipe', 'bench_mark') && steps.p3swipe.state.turn === steps.p3.state.turn,
    old_swipe_selected_again: has('p3old', 'bench_mark'),
    tool_swipe_replaces_fact: has('p4', 'noise') && has('p4swipe', 'noise_swipe') && !has('p4swipe', 'noise'),
    regenerate_drops_fact: has('p5', 'asked_work') && !has('p5regen', 'asked_work'),
    delete_retry_books_once: has('p5retry', 'asked_work') && steps.p5retry.state.turn === steps.p5.state.turn,
    reload_same_state: steps.reload.same === true,
    no_page_errors: pageErrors.length === 0,
};
console.log(JSON.stringify({ checks }, null, 1));
for (const [k, v] of Object.entries(result.steps)) {
    if (!v?.chat) { console.log(`--- ${k}: ${JSON.stringify(v)}`); continue; }
    console.log(`--- ${k}: state ${JSON.stringify(v.state.facts)} turn ${v.state.turn} at ${v.state.at}`);
    for (const m of v.chat.slice(5)) console.log(`   ${m.i} ${m.user ? 'U' : m.system ? 'S' : 'A'}${m.tool ? ' TOOL ' + JSON.stringify(m.toolIds) + ' ok=' + JSON.stringify(m.toolOk) : ''} sw=${m.swipes}/${m.swipe_id} gm=${JSON.stringify(m.gm)} ev=${m.events.length} hud=${m.hud} "${m.mes}"`);
}
if (Object.values(checks).some((x) => !x)) process.exitCode = 1;
