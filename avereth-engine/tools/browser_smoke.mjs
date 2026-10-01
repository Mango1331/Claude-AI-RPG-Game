// Optional real-browser smoke test of the SillyTavern binding (index.js): serves this folder, loads index.js in
// Chromium with a minimal mock of SillyTavern.getContext() and plays two campaigns.
// V3 page (runtime set to V3): greeting -> creation (System panels) -> reply -> retcon edit -> #command -> Runtime V3
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

const PAGE = `<!doctype html><html><body><div id="extensions_settings2"></div><div id="chat"></div><script type="module">
const FIRST = 'Arrival.\\n\\\`Location: Public roadside verge outside Tidecross, Solmere\\\`';
const chat = [{ is_user: false, is_system: false, mes: FIRST, swipe_id: 0, swipes: [FIRST], swipe_info: [{ extra: {} }], extra: {} }];
const handlers = {};
window.__log = [];
window.toastr = { warning: (m) => window.__log.push('warn ' + m), error: (m) => window.__log.push('error ' + m), info: () => {} };
const ctx = {
  chat, extensionSettings: { avereth: { runtime: 'v3' } }, saveSettingsDebounced() {}, saveChat: async () => { window.__saved = (window.__saved || 0) + 1; },
  // like SillyTavern: updateMessageBlock on a message that is not rendered yet throws inside its reasoning UI
  updateMessageBlock(id) { const el = document.querySelector('#chat [mesid="' + id + '"]'); el.getAttribute('mesid'); window.__rerendered = (window.__rerendered || []).concat(id); },
  setExtensionPrompt(key, value, position, depth, scan) { (window.__ext ||= {})[key] = { value, position, scan }; if (key === 'avereth_engine') window.__prompt = value; },
  characters: [{ name: 'Avereth', data: { extensions: { world: '' } } }], characterId: 0,
  addOneMessage(m) { window.__panels = (window.__panels || []).concat(m.mes); },
  // the separate request for a missing fact report (Test 5 run 2); answered after a delay, like a real model
  async generateRaw({ systemPrompt, prompt }) { window.__raw = { systemPrompt, prompt }; window.__rawCount = (window.__rawCount || 0) + 1; await new Promise((r) => setTimeout(r, 300)); return '<avereth>{"time":5,"place":"the old mill"}</avereth>'; },
  getCurrentChatId: () => 'smoke', eventTypes: { MESSAGE_RECEIVED: 'mr', MESSAGE_EDITED: 'me', CHAT_CHANGED: 'cc', MESSAGE_DELETED: 'md', MESSAGE_SWIPED: 'ms' },
  eventSource: { on(t, f) { handlers[t] = f; } },
};
window.SillyTavern = { getContext: () => ctx };
await import('/index.js');
for (let i = 0; i < 100 && !handlers.mr; i++) await new Promise((r) => setTimeout(r, 50));
const result = {};
await handlers.mr(0);
result.campaign = (chat[0].extra.avereth?.events || []).some((e) => e.t === 'campaign.started' && (e.d.runtime || 'v3') === 'v3');
chat.push({ is_user: true, is_system: false, mes: 'Ranger', extra: {} });
let aborted = false;
await globalThis.averethInterceptor(chat, 8000, () => { aborted = true; }, 'normal');
// character creation is answered by the engine's System panel without a narrator call (Pre-Test-5); the line is hidden
const panelText = () => (window.__panels || []).join('\\n');
result.step2 = aborted && /CLASS SELECTED: RANGER[\\s\\S]*Initiative 9[\\s\\S]*- Aimed Shot \\[/.test(panelText()) && chat[1].is_system === true;
aborted = false;
chat.push({ is_user: true, is_system: false, mes: 'Aimed Shot + Power Shot', extra: {} });
await globalThis.averethInterceptor(chat, 8000, () => { aborted = true; }, 'normal');
result.creation = aborted && /CHARACTER CREATION COMPLETE[\\s\\S]*Starter Shortbow/.test(panelText());
// like SillyTavern, the interceptor gets coreChat: a new array of shallow copies without hidden lines (the saved chat stays untouched)
let core = null;
const ask = async (input) => {
  chat.push({ is_user: true, is_system: false, mes: input, extra: {} });
  core = chat.filter((m) => !m.is_system).map((m) => ({ ...m }));
  await globalThis.averethInterceptor(core, 8000, () => {}, 'normal');
};
await ask('I walk along the road.');
result.firstStory = /mode: story/.test(window.__prompt) && /CHARACTER CREATION is complete/.test(window.__prompt) && core.every((m) => !/^(Ranger|Aimed Shot \\+ Power Shot)$/.test(m.mes));
// without streaming SillyTavern emits MESSAGE_RECEIVED before it renders the message (Testrun 2)
const r1 = chat.length;
chat.push({ is_user: false, is_system: false, mes: 'A quiet road.\\n<avereth>{}</avereth>', swipe_id: 0, swipes: ['x'], swipe_info: [{ extra: {} }], extra: {} });
const savedBefore = window.__saved || 0;
await handlers.mr(r1);
result.stripped = chat[r1].mes === 'A quiet road.' && (window.__saved || 0) > savedBefore && !(window.__rerendered || []).includes(r1);
document.getElementById('chat').insertAdjacentHTML('beforeend', '<div class="mes" mesid="' + r1 + '"><div class="mes_text"></div></div>');
chat[r1].mes = 'A quiet road, retold.\\n<avereth>{}</avereth>';
await handlers.me(r1);
await new Promise((r) => setTimeout(r, 0)); // SillyTavern redraws from mes after MESSAGE_EDITED; the engine redraws after that
result.retcon = chat[r1].mes === 'A quiet road, retold.' && chat[r1].extra.avereth.retcon === true && (window.__rerendered || []).includes(r1);
// a combat turn: the reply shows the engine's System block (display_text), the prompt text stays plain
const turn = async (input, reply) => {
  await ask(input);
  chat.push({ is_user: false, is_system: false, mes: reply, swipe_id: 0, swipes: [reply], swipe_info: [{ extra: {} }], extra: {} });
  await handlers.mr(chat.length - 1);
};
await turn('I look around.', 'A boar. A hunter writes in his ledger.\\n<avereth>{"new":[{"ref":"boar","kind":"creature","species":"boar","band":"MEDIUM"}]}</avereth>');
// Word replacements (default ledger=register): the reply text in the chat, and so in the next prompt, no longer has it
result.wordSwap = chat.at(-1).mes === 'A boar. A hunter writes in his register.';
// Lore Bridge: realm and city as World Info scan text, never inserted (position NONE); engine lore until a lorebook is linked
const bridge = window.__ext.avereth_lore_keys;
result.loreBridge = bridge && bridge.value === 'Solmere\\nTidecross' && bridge.position === -1 && bridge.scan === true && /\\nLORE:\\n/.test(window.__prompt);
ctx.characters[0].data.extensions.world = 'Avereth World Lore v0.13'; // linked as Character Lore: descriptive lore comes from it
await turn('I Power Shot the boar', 'The arrow flies.\\n<avereth>{}</avereth>');
result.loreBridge = result.loreBridge && !/\\nLORE:\\n/.test(window.__prompt) && window.__ext.avereth_lore_keys.value === 'Solmere\\nTidecross';
const last = chat.at(-1);
result.combatShown = /^\`COMBAT START\`\\n\`Initiative: /.test(last.extra.display_text || '') && last.mes === 'The arrow flies.' && /\`HP: /.test(last.extra.display_text);
chat.push({ is_user: true, is_system: false, mes: '#status', extra: {} });
await globalThis.averethInterceptor(chat, 8000, () => { aborted = true; }, 'normal');
result.command = aborted && /SYSTEM \\/\\/ STATUS/.test((window.__panels || []).join('')) && chat.at(-1).is_system === true;
// an NPC's attack reported by the reply: the fight is fixed at once and shown above that reply (Testrun 3)
await turn('I look around again.', 'A wolf lunges out of the brush.\\n<avereth>{"new":[{"ref":"wolf","kind":"creature","species":"wolf","band":"SHORT"}],"combat":{"by":"wolf"}}</avereth>');
// the wolf by its target label for the fight (live run 25.09.: "Wolf A"), listed among the targets
result.commitShown = /\`COMBAT( START)? — Wolf A (attacks|joins)/.test(chat.at(-1).extra.display_text || '') && /\`COMBAT TARGETS — [^\`]*Wolf A \\[/.test(chat.at(-1).extra.display_text || '') && /\`Next: /.test(chat.at(-1).extra.display_text || '');
// Runtime V3: a reply that still writes Megumin tracker blocks — removed from the text, the engine HUD below it
const BLOCKS = '\\n<Blocks>\\n<World_State>**Loc:** nowhere</World_State>\\n<Character_Sheet>HP: 1/80 | Coin: 99 Gold</Character_Sheet>\\n<New_NPC name="Brom">**Background:** invented</New_NPC>\\n</Blocks>';
await turn('I wait.', 'The wind turns.\\n<avereth>{}</avereth>' + BLOCKS);
const v3 = chat.at(-1);
const probe = document.createElement('div');
probe.innerHTML = v3.extra.display_text || '';
result.hud = probe.querySelectorAll('details.avereth-hud').length === 2 && /Alaric/.test(probe.querySelector('details.avereth-hud summary').textContent)
  && /HP \\d+\\/80/.test(probe.textContent) && !/99 Gold|1\\/80|nowhere/.test(probe.textContent);
result.trackersRemoved = v3.mes === 'The wind turns.' && !chat.some((m) => /<World_State>|<Character_Sheet>|<New_NPC>/.test(m.mes));
// the prompt never carries the HUD; the next interceptor call trims its coreChat copy to the history window
await turn('I walk on.', 'The road bends.\\n<avereth>{}</avereth>');
result.hudNotInPrompt = !/avereth-hud/.test(window.__prompt) && core.every((m) => !/avereth-hud/.test(m.mes));
result.historyWindow = core.filter((m) => m.is_user).length === 4 && chat.filter((m) => m.is_user && !m.is_system).length > 4;
// a reply without a report: asked for separately while the player reads; a message sent at once waits for its facts
await turn('I walk to the old mill.', 'The mill wheel creaks in the stream.');
const millId = chat.length - 1;
const pending = /NO FACT REPORT: asking for it separately/.test(chat[millId].extra.display_text || '') && chat[millId].extra.avereth.recovery === 'pending';
await ask('I look around the mill.');
result.reportRequest = pending && (window.__raw?.systemPrompt || '').startsWith('[AVERETH ENGINE — FACT REPORT REQUEST]') && (window.__raw?.prompt || '').includes("NARRATOR'S REPLY:" + String.fromCharCode(10) + 'The mill wheel creaks')
  && (chat[millId].extra.display_text || '').includes('REPORT RECOVERED') && window.__prompt.includes('— the old mill | mode: ') && chat[millId].extra.avereth.recovery.from === 'no <avereth> report';
// a swipe while the request still runs: the new text is asked for again; the answer for the old text is refused
await turn('I cross the bridge.', 'The bridge sways.');
const bridgeId = chat.length - 1;
const asked = window.__rawCount;
const swiped = 'The bridge holds, barely.';
Object.assign(chat[bridgeId], { mes: swiped, swipes: [...chat[bridgeId].swipes, swiped], swipe_id: 1, swipe_info: [...chat[bridgeId].swipe_info, { extra: {} }] });
await handlers.mr(bridgeId);
await new Promise((r) => setTimeout(r, 800));
result.reportRequest = result.reportRequest && window.__rawCount === asked + 1 && chat[bridgeId].mes === swiped && (chat[bridgeId].extra.display_text || '').includes('REPORT RECOVERED');
result.settingsUi = !!document.getElementById('avereth_enabled') && document.getElementById('avereth_swaps')?.value === 'ledger=register'
  && document.getElementById('avereth_hud')?.value === 'closed' && document.getElementById('avereth_history')?.value === '4' && document.getElementById('avereth_strip')?.checked === true
  && document.getElementById('avereth_recover')?.checked === true;
result.log = window.__log;
window.__result = result;
</script></body></html>`;


// ------------------------------------------------------------------------------------------------ Runtime V4 page
const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));
const v12 = fs.readFileSync(path.join(ROOT, 'tests/eval/deltas.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((t) => t.run === 'V12');
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
const warrior = content.classes.get('warrior');
const EXTRACT_DELAY_MS = 1200;
const V4 = {
    first: 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Redmarch, Veyrhold`',
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
        chat, extensionSettings: {}, // the defaults: new campaigns run V4
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
    result.barrier = waited >= DATA.extractDelay && x1.status === 'applied' && state().scene.at === 'loc.redmarch.guild_hall'
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
    result.generateRawPath = rawCalls === 2 && status().includes('LLM: generateRaw') && p3.includes('PAYS — the Guild registration fee, 20 cp')
        && p3.includes("**Miller's Run Escort** — client: Harrow's mill · reward: 80 cp");
    ctx.mainApi = 'openai';
    const r3 = await reply(DATA.turns[2].reply);
    await until(() => rec(chat[r3]).extraction?.status !== 'pending');
    const s = state();
    const x3 = rec(chat[r3]);
    // the recorded reply has the Weasel contract taken in the reply that shows the board: refused since 4.0.9, it stays listed
    result.world = rec(chat[r2]).extraction?.status === 'applied' && x3.extraction?.status === 'applied'
        && JSON.stringify((x3.rejected || []).map((x) => x.rule)) === '["board_first_display"]'
        && s.guild.membership?.rank === 'Novice' && s.entities.pc.sheet.coin_cp === coin - 20 && s.quests[DATA.weasel]?.status === 'listed';
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
        return { purpose: 'extract', content: asBooked(JSON.stringify(t ? t.answer : { expected: {}, deltas: [] })), delay: EXTRACT_DELAY_MS };
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
        res.writeHead(404); res.end();
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
const want = [['interpret', 'custom'], ['extract', 'custom'], ['interpret', 'custom'], ['extract', 'custom'], ['interpret', 'generateRaw'], ['board', 'generateRaw'], ['extract', 'custom']];
v4.llmCalls = llmCalls.map((c) => `${c.purpose}/${c.path}${c.path === 'custom' ? ` t=${c.temperature}` : ''}`);
v4.requests = JSON.stringify(llmCalls.map((c) => [c.purpose, c.path])) === JSON.stringify(want)
    && llmCalls.filter((c) => c.path === 'custom').every((c) => c.source === 'custom' && c.url === V4.customUrl && c.model === V4.model && c.stream === false
        && c.includeBody === V4.includeBody && c.csrf === 'smoke-token' && !c.authHeader && !c.keyField.length && c.temperature === (c.purpose === 'board' ? 0.6 : 0.1));

console.log(JSON.stringify({ v3, v4 }, null, 1));
if (!v4.requests) console.log('V4 requests:', JSON.stringify(llmCalls, null, 1));
const okV3 = v3.campaign && v3.step2 && v3.creation && v3.firstStory && v3.stripped && v3.retcon && v3.combatShown && v3.command && v3.commitShown && v3.loreBridge && v3.wordSwap && v3.settingsUi
    && v3.hud && v3.trackersRemoved && v3.hudNotInPrompt && v3.historyWindow && v3.reportRequest && !v3.errors.length && !v3.log.length;
const okV4 = v4.v4Campaign && v4.creation && v4.playerActions && v4.pendingShown && v4.barrier && v4.worldShown && v4.registerPending && v4.generateRawPath
    && v4.world && v4.statusLine && v4.contractOutdated && v4.settingsUi && v4.requests && !v4.errors.length && !v4.log.length;
console.log(`V3 page: ${okV3 ? 'OK' : 'FAILED'} | V4 page: ${okV4 ? 'OK' : 'FAILED'}`);
console.log(okV3 && okV4 ? 'BROWSER SMOKE: OK' : 'BROWSER SMOKE: FAILED');
process.exit(okV3 && okV4 ? 0 : 1);
