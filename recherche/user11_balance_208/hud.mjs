/* node hud.mjs <cb1eb944/avereth-engine> <7e8663c/SillyTavern> <original User11 JSONL> <playwright package dir> <Chromium executable> */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const [engine, st, chatPath, pw, executablePath] = process.argv.slice(2);
assert.equal(
  execFileSync('git', ['-C', engine, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  'cb1eb944a041b26be9210199d780be9ff740f74d',
);
assert.equal(
  execFileSync('git', ['-C', st, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  '7e8663cd9c184a550b37238218bdd32c6efc68e9',
);
const { chromium } = createRequire(import.meta.url)(pw);
const browser = await chromium.launch({ executablePath });
const chat = fs.readFileSync(chatPath, 'utf8').trim().split('\n').map(JSON.parse).slice(1, 26);
const html =
  '<html><head><link rel="stylesheet" href="/st.css"><link rel="stylesheet" href="/engine/style.css"><style>body{display:block;height:auto;overflow:auto;font-family:Arial,sans-serif;font-size:16px;margin:0}#chat{width:100vw;max-width:100vw;overflow:visible;display:block;height:auto;max-height:none;position:static}#chat .mes,#chat .mes_text{box-sizing:border-box;display:block;width:100%;min-width:0;margin:0;padding:0}#send_form{display:block;width:100%;position:static;pointer-events:none}</style></head><body><div id="chat"><div class="mes"><div class="mes_text"></div></div></div><div id="send_form"><textarea id="send_textarea"></textarea><button id="send_but">Send</button></div></body></html>';
const rows = [];
try {
  for (const width of [360, 800])
    for (const variant of ['A', 'B', 'C']) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.route('**/*', async (route) => {
        const u = new URL(route.request().url());
        if (u.hostname !== 'localhost') return route.abort();
        if (u.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
        if (u.pathname === '/st.css')
          return route.fulfill({ contentType: 'text/css', path: path.join(st, 'public', 'style.css') });
        if (u.pathname.startsWith('/engine/')) {
          const f = path.resolve(engine, '.' + u.pathname.slice('/engine'.length));
          if (!f.startsWith(path.resolve(engine) + path.sep) || !fs.existsSync(f)) return route.abort();
          return route.fulfill({
            contentType: f.endsWith('.js')
              ? 'text/javascript'
              : f.endsWith('.json')
                ? 'application/json'
                : 'text/css',
            path: f,
          });
        }
        return route.abort();
      });
      await page.goto('http://localhost/');
      await page.evaluate(
        async ({ chat, variant }) => {
          const [{ foldChat }, { loadContentPack }, { installActionComposer }, { renderHud }] =
            await Promise.all(
              ['host', 'content', 'action_composer', 'hud'].map((n) => import('/engine/src/' + n + '.js')),
            );
          const c = await loadContentPack(async (n) => (await fetch('/engine/content/' + n)).json());
          const state = foldChat(chat).state,
            ctx = {
              getCurrentChatId: () => 'mock',
              characters: [{ avatar: 'test.png', name: 'Avereth' }],
              characterId: 0,
              chatMetadata: {},
              chat,
              eventTypes: {},
              eventSource: { on() {} },
            };
          document.querySelector('.mes_text').innerHTML = renderHud(state, c);
          const api = installActionComposer({
            context: () => ctx,
            state: () => state,
            content: () => c,
            enabled: () => true,
            settings: () => ({}),
            blocked: () => '',
            status: () => '',
            save() {},
            retry() {},
          });
          api.refresh();
          window.reviewSelection = api.selected;
          if (variant === 'A') return;
          const box = document.querySelector('#avereth-phase-controls'),
            minor = box.querySelector('#avereth-minor'),
            order = box.querySelector('#avereth-order');
          minor.setAttribute('aria-label', 'Nebenaktion');
          order.parentElement.hidden = true;
          const label = minor.parentElement;
          label.firstChild.textContent = '';
          const add = document.createElement('button');
          add.type = 'button';
          add.textContent = '+ Nebenaktion';
          add.setAttribute('aria-expanded', 'false');
          const swap = document.createElement('button');
          swap.type = 'button';
          swap.textContent = '⇄ Reihenfolge';
          swap.setAttribute('aria-label', 'Aktionen tauschen');
          box.prepend(add);
          box.append(swap);
          const draw = () => {
            const selected = !!minor.value;
            add.hidden = variant === 'C';
            label.hidden = variant === 'B' && add.getAttribute('aria-expanded') === 'false' && !selected;
            swap.hidden = !selected;
            for (const o of minor.options) {
              if (o.value === 'sidestep') o.textContent = 'Ausweichschritt · nur Distanz';
              if (!o.value) o.textContent = 'Nebenaktion: keine';
            }
          };
          add.onclick = () => {
            add.setAttribute(
              'aria-expanded',
              add.getAttribute('aria-expanded') === 'true' ? 'false' : 'true',
            );
            draw();
          };
          swap.onclick = () => {
            order.value = order.value === 'before' ? 'after' : 'before';
            order.dispatchEvent(new Event('change', { bubbles: true }));
            draw();
          };
          new MutationObserver(draw).observe(minor, { childList: true });
          draw();
        },
        { chat, variant },
      );
      await page.locator('[data-avereth-select-skill="mage.arcane_wave"]').last().click();
      await page.locator('[data-avereth-band="ENGAGED"]').last().click();
      const measure = () =>
        page.evaluate(() => {
          const area = document.querySelector('.avereth-action-controls'),
            rows = document.querySelector('#avereth-phase-controls');
          return {
            height: Math.round(area.getBoundingClientRect().height),
            minorHeight: Math.round(rows.getBoundingClientRect().height),
            width: Math.round(area.getBoundingClientRect().width),
            overflow: area.scrollWidth > area.clientWidth,
            chip: document.querySelector('#avereth-action-chip span').innerText,
          };
        });
      const solo = await measure();
      assert.ok(solo.width > width * 0.75, JSON.stringify(solo));
      if (variant === 'B') await page.getByRole('button', { name: '+ Nebenaktion', exact: true }).click();
      await page.selectOption('#avereth-minor', 'sidestep');
      if (variant === 'A') await page.selectOption('#avereth-order', 'before');
      else await page.getByRole('button', { name: 'Aktionen tauschen' }).click();
      const pair = await measure();
      const s = await page.evaluate(() => window.reviewSelection().selection);
      assert.deepEqual(
        s.steps.map((a) => a.kind),
        ['sidestep', 'attack'],
      );
      rows.push({ width, variant, solo, pair });
      await page.close();
    }
  console.log(
    JSON.stringify(
      {
        chromium: browser.version(),
        surface: 'Isolated component render, ST 1.19 stylesheet, User11 T13, Arial 16px; no live ST send',
        rows,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
