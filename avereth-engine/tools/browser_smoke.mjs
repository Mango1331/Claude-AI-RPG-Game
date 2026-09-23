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
  chat, extensionSettings: {}, saveSettingsDebounced() {}, saveChat: async () => {}, updateMessageBlock() {},
  setExtensionPrompt(key, value) { window.__prompt = value; },
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
await handlers.mr(2);
result.stripped = chat[2].mes === 'Step 2 shown.';
chat[2].mes = 'Step 2 shown, retold.\\n<avereth>{}</avereth>';
await handlers.me(2);
result.retcon = chat[2].mes === 'Step 2 shown, retold.' && chat[2].extra.avereth.retcon === true;
chat.push({ is_user: true, is_system: false, mes: '#status', extra: {} });
await globalThis.averethInterceptor(chat, 8000, () => { aborted = true; }, 'normal');
result.command = aborted && /SYSTEM \\/\\/ STATUS/.test((window.__panels || []).join('')) && chat[3].is_system === true;
result.settingsUi = !!document.getElementById('avereth_enabled');
result.log = window.__log;
window.__result = result;
</script></body></html>`;

const server = http.createServer(async (req, res) => {
    try {
        if (req.url === '/' || req.url === '/smoke.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); return; }
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
const ok = result.campaign && result.step2 && result.stripped && result.retcon && result.command && result.settingsUi && !errors.length;
console.log(ok ? 'BROWSER SMOKE: OK' : 'BROWSER SMOKE: FAILED');
process.exit(ok ? 0 : 1);
