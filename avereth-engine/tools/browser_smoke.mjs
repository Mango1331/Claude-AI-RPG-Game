// Optional real-browser smoke test of the SillyTavern binding (index.js): serves this folder, loads index.js in
// Chromium with a minimal mock of SillyTavern.getContext(), and plays greeting -> creation (System panels) -> reply -> retcon edit -> #command
// -> Runtime V3 (HUD under replies, tracker blocks removed, prompt-only history projection) -> a reply without a fact
// report, asked for separately (generateRaw) before the next message is resolved.
// Requires Playwright (not a project dependency). Usage: node tools/browser_smoke.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

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
  chat, extensionSettings: {}, saveSettingsDebounced() {}, saveChat: async () => { window.__saved = (window.__saved || 0) + 1; },
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
result.campaign = !!chat[0].extra.avereth;
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
ctx.characters[0].data.extensions.world = 'Avereth World Lore v0.11'; // linked as Character Lore: descriptive lore comes from it
await turn('I Power Shot the boar', 'The arrow flies.\\n<avereth>{}</avereth>');
result.loreBridge = result.loreBridge && !/\\nLORE:\\n/.test(window.__prompt) && window.__ext.avereth_lore_keys.value === 'Solmere\\nTidecross';
const last = chat.at(-1);
result.combatShown = /^\`COMBAT START\`\\n\`Initiative: /.test(last.extra.display_text || '') && last.mes === 'The arrow flies.' && /\`HP: /.test(last.extra.display_text);
chat.push({ is_user: true, is_system: false, mes: '#status', extra: {} });
await globalThis.averethInterceptor(chat, 8000, () => { aborted = true; }, 'normal');
result.command = aborted && /SYSTEM \\/\\/ STATUS/.test((window.__panels || []).join('')) && chat.at(-1).is_system === true;
// an NPC's attack reported by the reply: the fight is fixed at once and shown above that reply (Testrun 3)
await turn('I look around again.', 'A wolf lunges out of the brush.\\n<avereth>{"new":[{"ref":"wolf","kind":"creature","species":"wolf","band":"SHORT"}],"combat":{"by":"wolf"}}</avereth>');
result.commitShown = /\`COMBAT( START)? — the wolf (attacks|joins)/.test(chat.at(-1).extra.display_text || '') && /\`Next: /.test(chat.at(-1).extra.display_text || '');
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

const server = http.createServer(async (req, res) => {
    try {
        if (req.url === '/' || req.url === '/smoke.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE); return; }
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
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://127.0.0.1:${port}/smoke.html`);
await page.waitForFunction(() => window.__result, null, { timeout: 15000 }).catch((e) => { console.log('page errors:', errors); throw e; });
const result = await page.evaluate(() => window.__result);
await browser.close();
server.close();
console.log(JSON.stringify({ ...result, errors }, null, 1));
const ok = result.campaign && result.step2 && result.creation && result.firstStory && result.stripped && result.retcon && result.combatShown && result.command && result.commitShown && result.loreBridge && result.wordSwap && result.settingsUi
    && result.hud && result.trackersRemoved && result.hudNotInPrompt && result.historyWindow && result.reportRequest && !errors.length;
console.log(ok ? 'BROWSER SMOKE: OK' : 'BROWSER SMOKE: FAILED');
process.exit(ok ? 0 : 1);
