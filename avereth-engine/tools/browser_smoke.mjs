// Optional real-browser smoke test of the SillyTavern binding (index.js): serves this folder, loads index.js in
// Chromium with a minimal mock of SillyTavern.getContext() and plays two campaigns.
// Legacy page (B1, .130; formerly the V3 page): campaigns of retired protocols are refused at every host entry.
// Former V3 page (runtime set to V3): greeting -> creation (System panels) -> reply -> retcon edit -> #command -> Runtime V3
// (HUD under replies, tracker blocks removed, prompt-only history projection) -> a reply without a fact report, asked
// for separately (generateRaw) before the next message is resolved.
// V4 page (default settings): the greeting starts a V4 campaign (SillyTavern 1.19 sends MESSAGE_RECEIVED for it) ->
// creation -> three story turns of the V12 run (Guild hall, registration, fee and board) with the interpreter, the
// extractor and the Board generator answered by a mock of SillyTavern's Chat Completion endpoint (source "Custom"):
// PLAYER ACTIONS in the prompt, prose only, the reply read in the background, the commit barrier, the generateRaw
// path, and what the requests carry (no key: SillyTavern adds it).
// Requires Playwright (not a project dependency). Usage: node tools/browser_smoke.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadContent } from '../tests/helpers.js';
import { generatorListing } from '../tests/v4/harness.js';
import { V4_OUTPUT_LINE } from '../src/context.js';
import { slug } from '../src/util.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
let chromium;
try {
    ({ chromium } = require('playwright'));
} catch {
    const globalRoot = (await import('node:child_process')).execSync('npm root -g').toString().trim();
    ({ chromium } = require(path.join(globalRoot, 'playwright')));
}

// Architecture patch B1 (.130): the former V3 page. New campaigns start only on V4-C; a chat that holds a campaign of a
// retired protocol is refused at every host entry: one error notice per chat, no engine block, no record, no save, no
// model request (the request list of the V4 page below stays exact), also for a reply and an edit.
const PAGE = `<!doctype html><html><body><div id="extensions_settings2"></div><div id="chat"></div><script type="module">
const FIRST = 'Arrival.\\n\\\`Location: Public roadside verge outside Ashbridge, Duskreach\\\`';
const handlers = {};
window.__log = [];
window.toastr = { warning: (m) => window.__log.push('warn ' + m), error: (m) => window.__log.push('error ' + m), info: () => {} };
let chatId = 'none';
const ctx = {
  chat: [], extensionSettings: { avereth: {} }, saveSettingsDebounced() {}, saveChat: async () => { window.__saved = (window.__saved || 0) + 1; },
  updateMessageBlock() {}, setExtensionPrompt(key, value) { if (key === 'avereth_engine') window.__prompt = value; },
  characters: [{ name: 'Avereth', data: { extensions: { world: '' } } }], characterId: 0,
  addOneMessage(m) { window.__panels = (window.__panels || []).concat(m.mes); },
  async generateRaw() { window.__raw = (window.__raw || 0) + 1; return '{}'; },
  getCurrentChatId: () => chatId, eventTypes: { MESSAGE_RECEIVED: 'mr', MESSAGE_EDITED: 'me', CHAT_CHANGED: 'cc', MESSAGE_DELETED: 'md', MESSAGE_SWIPED: 'ms' },
  eventSource: { on(t, f) { handlers[t] = f; } },
};
window.SillyTavern = { getContext: () => ctx };
await import('/index.js');
for (let i = 0; i < 100 && !handlers.mr; i++) await new Promise((r) => setTimeout(r, 50));
const { loadContentPack } = await import('/src/content.js');
const { startCampaign } = await import('/src/engine.js');
const { rec } = await import('/src/host.js');
const content = await loadContentPack(async (n) => (await fetch('/content/' + n)).json());
const start = (opts, edit = (d) => d) => { const events = startCampaign(content, { seed: 7, firstMessage: FIRST, ...opts }); edit(events[0].d); return events; };
const VARIANTS = {
  v3: [start({ runtime: 'v3' }), 'it was started on Runtime V3'],
  pathA: [start({ runtime: 'v4', planner: false, ruleset: 2 }), 'it plays the retired path A (interpreter)'],
  olderF: [start({ runtime: 'v4', planner: true, ruleset: 2 }, (d) => { d.engine_version = '4.3.0-c.6.6.126'; }), 'it was started with an older F rule configuration'],
  unreadable: [start({ runtime: 'v4', planner: true, ruleset: 2 }, (d) => { d.engine_version = 'dev build'; }), 'its start build is missing or unreadable'],
};
const result = {};
for (const [name, [events, why]] of Object.entries(VARIANTS)) {
  chatId = 'legacy-' + name;
  const chat = [{ is_user: false, is_system: false, mes: FIRST, swipe_id: 0, swipes: [FIRST], swipe_info: [{ extra: {} }], extra: { avereth: { v: 2, events, text_hash: null } } }];
  const { hash32 } = await import('/src/util.js');
  chat[0].extra.avereth.text_hash = hash32(FIRST);
  ctx.chat = chat;
  const saved = window.__saved || 0;
  const logged = window.__log.length;
  window.__prompt = 'stale';
  chat.push({ is_user: true, is_system: false, mes: 'I walk to the Guild hall.', extra: {} });
  let aborted = false;
  await globalThis.averethInterceptor(chat, 8000, () => { aborted = true; }, 'normal');
  const turn = chat.at(-1);
  chat.push({ is_user: false, is_system: false, mes: 'A reply.', swipe_id: 0, swipes: ['A reply.'], swipe_info: [{ extra: {} }], extra: {} });
  await handlers.mr(chat.length - 1);
  chat[0].mes = FIRST + ' (edited)';
  await handlers.me(0);
  const notices = window.__log.slice(logged).filter((n) => n.startsWith('error '));
  const detail = { aborted, prompt: window.__prompt === '', noTurnRecord: !rec(turn), noReplyRecord: !rec(chat.at(-1)), notSaved: (window.__saved || 0) === saved,
    noModel: !window.__raw, oneNotice: notices.length === 1 && notices[0].startsWith('error UNSUPPORTED CAMPAIGN — ' + why) };
  result[name] = Object.values(detail).every(Boolean);
  if (!result[name]) result[name + 'Detail'] = detail;
}
result.log = window.__log.slice();
window.__result = result;
</script></body></html>`;


// ------------------------------------------------------------------------------------------------ Runtime V4 page
const content = await loadContent();
// run V12 was played in Redmarch, Veyrhold, which Lorebook v0.14 removed: the smoke plays it in Alderwatch, Valedorn Crown
const toAlderwatch = (text) => text.replace(/loc\.redmarch/g, 'loc.alderwatch').replace(/realm\.veyrhold/g, 'realm.valedorn_crown').replace(/Redmarch/g, 'Alderwatch').replace(/Veyrhold/g, 'Valedorn Crown');
const gold = JSON.parse(toAlderwatch(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8')));
const v12 = toAlderwatch(fs.readFileSync(path.join(ROOT, 'tests/eval/deltas.jsonl'), 'utf8')).trim().split('\n').map((l) => JSON.parse(l)).filter((t) => t.run === 'V12');
// the Board generator writes no ids: a listing is booked as quest.<title> (src/v4/guild.js bookBoard)
const booked = new Map(gold.board_generator.listings.map((l) => [l.id, `quest.${slug(l.title)}`]));
const asBooked = (text) => [...booked].reduce((t, [a, b]) => t.split(a).join(b), text);
/** A gold answer (delta-0.1 draft) in the product's vocabulary: fields delta-0.2 added are null (count 1). */
function toProduct(answer) {
    const a = structuredClone(answer);
    for (const d of a.deltas || []) {
        const spec = content.deltaVocab.deltas.find((x) => x.type === d.type);
        for (const [k, f] of Object.entries(spec?.fields || {})) if (d[k] === undefined) d[k] = f.nullable ? null : k === 'count' ? 1 : d[k];
    }
    return a;
}
const TURNS = gold.turns.slice(0, 3).map((t, i) => ({ player: t.player, commands: t.commands, reply: v12[i].reply, answer: toProduct(t.recovery) }));
// B1 (.130): the page plays V4-C. The historical V12 board of turn 3 does not meet the current board profile (4 hunts +
// clearance, F level recommendations); its board turn is covered by the processing corpus (tools/replay). Turn 3 keeps
// the fee payment through generateRaw, without the board read and the board's listing of the reply.
TURNS[2] = { ...TURNS[2], commands: TURNS[2].commands.filter((c) => c.type !== 'board.read'),
    answer: { ...TURNS[2].answer, deltas: TURNS[2].answer.deltas.filter((d) => d.type !== 'listing.gone') } };
const warrior = content.classes.get('warrior');
const EXTRACT_DELAY_MS = 1200;
const V4 = {
    first: 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Alderwatch, Valedorn Crown`',
    skills: warrior.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '),
    turns: TURNS.map(({ player, reply }) => ({ player, reply })),
    outputLine: V4_OUTPUT_LINE,
    extractDelay: EXTRACT_DELAY_MS,
    weasel: booked.get('quest.weasel_fenwick'),
    customUrl: 'http://127.0.0.1:1/v1', model: 'smoke-model', includeBody: 'reasoning:\n  enabled: false',
};

/** The V4 page's script: runs in the browser (stringified into the page), never in Node. */
async function v4Page(DATA) {
    // the card holds this build's V4 narrator contract, as in SillyTavern (the status line checks its revision)
    const contract = await (await fetch('/content/narrator/Avereth_Narrator_Contract_v4.txt')).text();
    const chat = [{ is_user: false, is_system: false, mes: DATA.first, swipe_id: 0, swipes: [DATA.first], swipe_info: [{ extra: {} }], extra: {} }];
    const handlers = {};
    window.__log = [];
    window.toastr = { warning: (m) => window.__log.push('warn ' + m), error: (m) => window.__log.push('error ' + m), info: () => {} };
    let rawCalls = 0;
    const ctx = {
        // new campaigns run V4; Patch 7.2: this page plays the historical V4-A path (planner off), chosen as a player would
        chat, extensionSettings: { avereth: { planner: false, settingsRev: 2 } },
        saveSettingsDebounced() {}, saveChat: async () => { window.__saved = (window.__saved || 0) + 1; },
        updateMessageBlock(id) { window.__rerendered = (window.__rerendered || []).concat(id); },
        setExtensionPrompt(key, value) { if (key === 'avereth_engine') window.__prompt = value; },
        characters: [{ name: 'Avereth', description: contract, data: { description: contract, extensions: { world: '' } } }], characterId: 0,
        addOneMessage(m) { window.__panels = (window.__panels || []).concat(m.mes); },
        async generateRaw({ systemPrompt, prompt, responseLength }) {
            rawCalls += 1;
            const res = await fetch('/__raw', { method: 'POST', body: JSON.stringify({ systemPrompt, prompt, responseLength }) });
            return res.text();
        },
        getCurrentChatId: () => 'smoke4',
        eventTypes: { MESSAGE_RECEIVED: 'mr', MESSAGE_EDITED: 'me', CHAT_CHANGED: 'cc', MESSAGE_DELETED: 'md', MESSAGE_SWIPED: 'ms' },
        eventSource: { on(t, f) { handlers[t] = f; } },
        // SillyTavern 1.19 getContext(): Chat Completion with the source "Custom (OpenAI-compatible)"; the key stays there
        mainApi: 'openai',
        chatCompletionSettings: { chat_completion_source: 'custom', custom_url: DATA.customUrl, custom_model: DATA.model, custom_include_body: DATA.includeBody, custom_exclude_body: '', custom_include_headers: '', custom_prompt_post_processing: '' },
        getRequestHeaders: () => ({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'smoke-token' }),
    };
    window.SillyTavern = { getContext: () => ctx };
    await import('/index.js');
    const { foldChat, rec } = await import('/src/host.js');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 100 && !handlers.mr; i++) await sleep(50);
    const until = async (f, ms = 10000) => { for (const end = Date.now() + ms; !f() && Date.now() < end;) await sleep(25); return f(); };
    const state = () => foldChat(chat).state;
    const result = {};
    let aborted = false;
    // like SillyTavern: the message is in the chat, the interceptor gets a copy of the chat without hidden lines
    const send = async (input) => {
        chat.push({ is_user: true, is_system: false, mes: input, extra: {} });
        aborted = false;
        const core = chat.filter((m) => !m.is_system).map((m) => ({ ...m }));
        const t0 = Date.now();
        await globalThis.averethInterceptor(core, 8000, () => { aborted = true; }, 'normal');
        return Date.now() - t0;
    };
    const reply = async (mes) => {
        chat.push({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} });
        const id = chat.length - 1;
        document.getElementById('chat').insertAdjacentHTML('beforeend', '<div class="mes" mesid="' + id + '"><div class="mes_text"></div></div>');
        await handlers.mr(id);
        return id;
    };
    const status = () => document.getElementById('avereth_status')?.textContent || '';

    // SillyTavern 1.19 sends MESSAGE_RECEIVED ('first_message') for the greeting of a new chat: the campaign starts there
    await handlers.mr(0, 'first_message');
    result.v4Campaign = (chat[0].extra.avereth?.events || []).some((e) => e.t === 'campaign.started' && e.d.runtime === 'v4');
    // character creation stays with the V3 engine: System panels, no narrator and no LLM call
    await send('Warrior');
    const first = aborted;
    await send(DATA.skills);
    result.creation = first && aborted && (window.__panels || []).join('\n').includes('CHARACTER CREATION COMPLETE');
    // t1: the interpreter (custom endpoint) -> PLAYER ACTIONS; the narrator is asked for prose only
    await send(DATA.turns[0].player);
    const p1 = window.__prompt || '';
    result.playerActions = !aborted && p1.includes("PLAYER ACTIONS (the engine resolved Alaric's message") && p1.includes("GOES — to Adventurers' Guild hall")
        && p1.endsWith(DATA.outputLine) && !p1.includes('FACT REPORT') && !p1.includes('End EVERY reply with <avereth>');
    // the reply is shown at once, as it came (4.0.5: no waiting line over the prose), and read in the background
    const r1 = await reply(DATA.turns[0].reply);
    result.pendingShown = rec(chat[r1]).extraction?.status === 'pending' && chat[r1].mes === DATA.turns[0].reply;
    // the player answers at once: the barrier holds the next turn until the reply's world is in (the board is generated
    // only when Alaric reads it, 4.0.7)
    const waited = await send(DATA.turns[1].player);
    const x1 = rec(chat[r1]).extraction || {};
    result.barrier = waited >= DATA.extractDelay && x1.status === 'applied' && state().scene.at === 'loc.alderwatch.guild_hall'
        && !Object.keys(state().quests).length;
    const probe = document.createElement('div');
    probe.innerHTML = chat[r1].extra.display_text || '';
    result.worldShown = (window.__rerendered || []).includes(r1) && probe.querySelectorAll('details.avereth-hud').length === 2 && probe.textContent.includes('Guild hall');
    const p2 = window.__prompt || '';
    result.registerPending = p2.includes('REGISTERS — pending') && p2.includes('20 cp') && p2.includes('stop there');
    const r2 = await reply(DATA.turns[1].reply);
    await until(() => rec(chat[r2]).extraction?.status !== 'pending');
    // t3 with another API (no custom source): the same interpreter, and the Board generator of the board he reads now,
    // through generateRaw, one prompt each
    ctx.mainApi = 'textgenerationwebui';
    const coin = state().entities.pc.sheet.coin_cp;
    await send(DATA.turns[2].player);
    const p3 = window.__prompt || '';
    result.generateRawPath = rawCalls === 1 && status().includes('LLM: generateRaw') && p3.includes('PAYS — the Guild registration fee, 20 cp');
    ctx.mainApi = 'openai';
    const r3 = await reply(DATA.turns[2].reply);
    await until(() => rec(chat[r3]).extraction?.status !== 'pending');
    const s = state();
    const x3 = rec(chat[r3]);
    // the recorded reply has the Weasel contract taken in the reply that shows the board: refused since 4.0.9, it stays listed
    result.world = rec(chat[r2]).extraction?.status === 'applied' && x3.extraction?.status === 'applied'
        && s.guild.membership?.rank === 'Novice' && s.entities.pc.sheet.coin_cp === coin - 20;
    result.statusLine = status().includes('runtime v4 (LLM: custom endpoint)') && status().includes('integrity: OK') && status().includes('narrator contract: current');
    result.settingsUi = document.getElementById('avereth_runtime')?.value === 'v4';
    result.log = window.__log.slice();
    // a card with the contract of an older build (no revision line): the status line says so, the warning comes once
    // per chat (4.1.5; the live run of 30.09. 22:41 played with a card from before 4.1.2)
    const older = contract.replace(/^Contract revision: .*\n/m, '');
    ctx.characters[0].description = older;
    ctx.characters[0].data.description = older;
    handlers.ms();
    handlers.ms();
    const warned = window.__log.filter((m) => m.startsWith('warn ') && m.includes('narrator contract on this character card is outdated'));
    result.contractOutdated = older !== contract && status().includes('narrator contract: OUTDATED') && warned.length === 1;
    // Architecture patch A (.127): an earlier record that no longer folds (an event of a deleted message) stops the next
    // turn and the next reply in the host: an error notice, no model request (the request list below stays exact), no
    // save, no record on the new message, no engine block
    chat[r1].extra.avereth.events.push({ t: 'entity.updated', d: { id: 'npc.ghost_of_a_deleted_message', set: { note: 'x' } } });
    const saved = window.__saved || 0;
    const logged = window.__log.length;
    window.__prompt = 'stale';
    await send('I read the board again.');
    const blockedTurn = chat.at(-1);
    const r4 = await reply('A reply arriving after the broken record.');
    const notices = window.__log.slice(logged);
    result.foldBlocked = aborted && window.__prompt === '' && !rec(blockedTurn) && !rec(chat[r4]) && (window.__saved || 0) === saved
        && notices.length === 1 && notices[0].startsWith(`error BLOCKED — the campaign record could not be rebuilt: message ${r1} (entity.updated)`)
        && status().includes('integrity: 1 problem(s)');
    window.__result = result;
}

const PAGE4 = `<!doctype html><html><body><div id="extensions_settings2"></div><div id="chat"></div><script type="module">
(${v4Page.toString()})(${JSON.stringify(V4)});
</script></body></html>`;

// ---------------------------------------------------------------- mock of SillyTavern's Chat Completion endpoint
const llmCalls = [];
function mockAnswer(system, user) {
    if (system.startsWith('You are the command interpreter')) {
        const t = TURNS.find((x) => user.includes(`PLAYER MESSAGE:\n${x.player}`));
        return { purpose: 'interpret', content: JSON.stringify({ commands: t ? t.commands : [] }) };
    }
    if (system.startsWith('You read one reply')) {
        const t = TURNS.find((x) => user.includes(x.reply.slice(0, 60)));
        // B1 (.130): new campaigns play V4-C / Ruleset 2, whose extractor names the reply's scene ('here': no move)
        return { purpose: 'extract', content: asBooked(JSON.stringify({ scene: 'here', ...(t ? t.answer : { expected: {}, deltas: [] }) })), delay: EXTRACT_DELAY_MS };
    }
    if (system.startsWith('You write the official contracts')) {
        return { purpose: 'board', content: JSON.stringify({ listings: gold.board_generator.listings.map(generatorListing) }), delay: 400 };
    }
    return { purpose: 'unknown', content: 'no' };
}

async function llmRoute(req, res) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const raw = req.url === '/__raw';
    const system = raw ? body.systemPrompt : body.messages?.find((m) => m.role === 'system')?.content || '';
    const user = raw ? body.prompt : (body.messages || []).filter((m) => m.role === 'user').map((m) => m.content).join('\n');
    const a = mockAnswer(system, user);
    llmCalls.push({
        path: raw ? 'generateRaw' : 'custom', purpose: a.purpose, source: body.chat_completion_source, url: body.custom_url, model: body.model,
        temperature: body.temperature, stream: body.stream, includeBody: body.custom_include_body, csrf: req.headers['x-csrf-token'] || null,
        authHeader: !!req.headers.authorization, keyField: Object.keys(body).filter((k) => /(^|_)(api_?key|key|secret|password|authorization|bearer)(_|$)/i.test(k)),
    });
    if (a.delay) await new Promise((r) => setTimeout(r, a.delay));
    if (raw) { res.writeHead(200, { 'content-type': 'text/plain' }); res.end(a.content); return; }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ index: 0, message: { role: 'assistant', content: a.content }, finish_reason: 'stop' }] }));
}

const server = http.createServer(async (req, res) => {
    try {
        if (req.url === '/' || req.url === '/smoke.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE); return; }
        if (req.url === '/smoke4.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE4); return; }
        if (req.method === 'POST' && (req.url === '/api/backends/chat-completions/generate' || req.url === '/__raw')) { await llmRoute(req, res); return; }
        const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
        if (!file.startsWith(ROOT)) throw new Error('outside root');
        const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.json') ? 'application/json' : 'text/plain';
        res.writeHead(200, { 'content-type': type });
        res.end(await readFile(file));
    } catch {
        if (!res.headersSent) res.writeHead(404);
        res.end();
    }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch();

async function run(url) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:${port}/${url}`);
    await page.waitForFunction(() => window.__result, null, { timeout: 30000 }).catch((e) => { console.log(url, 'page errors:', errors); throw e; });
    const result = await page.evaluate(() => window.__result);
    await page.close();
    return { ...result, errors };
}

const v3 = await run('smoke.html');
const v4 = await run('smoke4.html');
await browser.close();
server.close();

// what the V4 page asked for, in order, and how: SillyTavern's endpoint with the custom source, the settings' URL and
// model, the P0 temperatures, no streaming, the CSRF header SillyTavern's getRequestHeaders() gives, and no key
const want = [['interpret', 'custom'], ['extract', 'custom'], ['interpret', 'custom'], ['extract', 'custom'], ['interpret', 'generateRaw'], ['extract', 'custom']];
v4.llmCalls = llmCalls.map((c) => `${c.purpose}/${c.path}${c.path === 'custom' ? ` t=${c.temperature}` : ''}`);
v4.requests = JSON.stringify(llmCalls.map((c) => [c.purpose, c.path])) === JSON.stringify(want)
    && llmCalls.filter((c) => c.path === 'custom').every((c) => c.source === 'custom' && c.url === V4.customUrl && c.model === V4.model && c.stream === false
        && c.includeBody === V4.includeBody && c.csrf === 'smoke-token' && !c.authHeader && !c.keyField.length && c.temperature === (c.purpose === 'board' ? 0.6 : 0.1));

console.log(JSON.stringify({ v3, v4 }, null, 1));
if (!v4.requests) console.log('V4 requests:', JSON.stringify(llmCalls, null, 1));
const okV3 = v3.v3 && v3.pathA && v3.olderF && v3.unreadable && !v3.errors.length;
const okV4 = v4.v4Campaign && v4.creation && v4.playerActions && v4.pendingShown && v4.barrier && v4.worldShown && v4.registerPending && v4.generateRawPath
    && v4.world && v4.statusLine && v4.contractOutdated && v4.settingsUi && v4.requests && v4.foldBlocked && !v4.errors.length && !v4.log.length;
console.log(`Legacy page: ${okV3 ? 'OK' : 'FAILED'} | V4 page: ${okV4 ? 'OK' : 'FAILED'}`);
console.log(okV3 && okV4 ? 'BROWSER SMOKE: OK' : 'BROWSER SMOKE: FAILED');
process.exit(okV3 && okV4 ? 0 : 1);
