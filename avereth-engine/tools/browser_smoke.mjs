// Optional real-browser smoke test of the SillyTavern binding (index.js): serves this folder, loads index.js in
// Chromium with a minimal mock of SillyTavern.getContext(), and plays greeting -> creation -> reply -> retcon edit -> #command.
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
result.step2 = /CLASS SELECTED: RANGER/.test(window.__prompt) && /Init 9/.test(window.__prompt);
chat.push({ is_user: false, is_system: false, mes: 'Step 2 shown.\\n<avereth>{}</avereth>', swipe_id: 0, swipes: ['x'], swipe_info: [{ extra: {} }], extra: {} });
// without streaming SillyTavern emits MESSAGE_RECEIVED before it renders the message (Testrun 2)
const savedBefore = window.__saved || 0;
await handlers.mr(2);
result.stripped = chat[2].mes === 'Step 2 shown.' && (window.__saved || 0) > savedBefore && !(window.__rerendered || []).includes(2);
document.getElementById('chat').insertAdjacentHTML('beforeend', '<div class="mes" mesid="2"><div class="mes_text"></div></div>');
chat[2].mes = 'Step 2 shown, retold.\\n<avereth>{}</avereth>';
await handlers.me(2);
await new Promise((r) => setTimeout(r, 0)); // SillyTavern redraws from mes after MESSAGE_EDITED; the engine redraws after that
result.retcon = chat[2].mes === 'Step 2 shown, retold.' && chat[2].extra.avereth.retcon === true && (window.__rerendered || []).includes(2);
// a combat turn: the reply shows the engine's System block (display_text), the prompt text stays plain
const turn = async (input, reply) => {
  chat.push({ is_user: true, is_system: false, mes: input, extra: {} });
  await globalThis.averethInterceptor(chat, 8000, () => {}, 'normal');
  chat.push({ is_user: false, is_system: false, mes: reply, swipe_id: 0, swipes: [reply], swipe_info: [{ extra: {} }], extra: {} });
  await handlers.mr(chat.length - 1);
};
await turn('Aimed Shot + Power Shot', 'Creation complete.\\n<avereth>{}</avereth>');
await turn('I look around.', 'A boar.\\n<avereth>{"new":[{"ref":"boar","kind":"creature","species":"boar","band":"MEDIUM"}]}</avereth>');
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
result.settingsUi = !!document.getElementById('avereth_enabled');
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
await page.waitForFunction(() => window.__result, null, { timeout: 15000 });
const result = await page.evaluate(() => window.__result);
await browser.close();
server.close();
console.log(JSON.stringify({ ...result, errors }, null, 1));
const ok = result.campaign && result.step2 && result.stripped && result.retcon && result.combatShown && result.command && result.commitShown && result.loreBridge && result.settingsUi && !errors.length;
console.log(ok ? 'BROWSER SMOKE: OK' : 'BROWSER SMOKE: FAILED');
process.exit(ok ? 0 : 1);
