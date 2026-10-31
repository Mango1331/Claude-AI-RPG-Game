// Live SillyTavern smoke for prototype C (docs/PROTOTYPE_C.md): the planner path in a real SillyTavern (tested with
// 1.19.0), set up as tools/st_live/run_v4.mjs sets up Runtime V4 (card with the V4 contract, preset "Avereth Narrator V4",
// Lorebook v0.14, Chat Completion source "Custom" in front of a mock provider on port 5001, a dummy key in SillyTavern's
// secrets file). The run switches the planner on in the extension's settings panel, as a player does, and plays a Mage
// into a fight with three barkscorpions through the known failure classes: "I Fire Lance Barkscorpion B" (an alias A
// books as a silent Basic Attack), a misspelled skill the planner left without a skill (the safety catch asks), a skill
// on the floor (a world use), a swipe of that reply (no second planner call), a search during the fight (not taken,
// visibly). The mock answers the planner with scripted plans: this checks the host path (setting, call, record, panel,
// narrator block, swipe, key), never the planner's semantics, which only the real model shows (the live session).
// Usage: AVERETH_ST_DIR=/path/to/SillyTavern node tools/st_live/run_c.mjs   (SillyTavern started once before; Playwright)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { V4_OUTPUT_LINE } from '../../src/context.js';
import { ENGINE_VERSION } from '../../src/util.js';
import { Driver } from './live/driver.mjs';
import { screenText } from './live/players.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }

const ST = process.env.AVERETH_ST_DIR;
if (!ST) throw new Error('set AVERETH_ST_DIR to a SillyTavern checkout');
const ENGINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const USER = path.join(ST, 'data/default-user');
const HERE = process.env.AVERETH_ST_OUT || path.join(ST, 'avereth_live_smoke_c');
fs.mkdirSync(HERE, { recursive: true });
const CARD = 'Avereth V4';
const WORLD = 'Avereth World Lore v0.14';
const PRESET = 'Avereth Narrator V4';
const DUMMY_KEY = 'smoke-not-a-real-key';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const A = 'mon.barkscorpion_1';
const B = 'mon.barkscorpion_2';

// ------------------------------------------------------------------------------------------------ the turns
const plan = (...commands) => ({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) });
const TURNS = [
    { key: 'burrow', player: 'I climb down into the old burrow.', plan: plan({ type: 'go', to: { new: 'the old burrow' }, quote: 'I climb down into the old burrow' }),
        reply: 'Alaric lowers himself into the burrow. The burrow is a nearby low-danger wilderness. Three barkscorpions skitter out of the dark and rush at him, pincers raised.',
        answer: { expected: { 1: { arrived: true, at: { new: { name: 'the old burrow', kind: 'wilderness', parent: 'loc.alderwatch' } }, with: null } }, deltas: [
            { seq: 1, type: 'arrive', at: { new: { name: 'the old burrow', kind: 'wilderness', parent: 'loc.alderwatch' } }, with: null, forced_by: null },
            { seq: 2, type: 'area', place: null, min_level: 1, max_level: 3, how: 'seen', evidence: 'The burrow is a nearby low-danger wilderness.' },
            // Package C (.132): the mock extractor answers the current contract (the burrow holds no population)
            { seq: 3, type: 'creature.new', ref: 'barkscorpion', species: 'barkscorpion', anchor: 'arthropod', desc: ['bark-plated'], count: 3, present: true, band: 'SHORT', stronger: null, population: 'independent', life_stage: 'adult' },
            // Patch 7.2B (delta-0.98): the whole group attacks, said with scope all and the reply's own words
            { seq: 4, type: 'hostile', by: ['barkscorpion'], scope: 'all', evidence: 'Three barkscorpions skitter out of the dark and rush at him' },
        ] } },
    { key: 'alias', player: 'I Fire Lance Barkscorpion B', plan: plan({ type: 'use_skill', skill: 'mage.flame_lance', target: B, quote: 'I Fire Lance Barkscorpion B' }),
        reply: 'A lance of flame leaves Alaric\'s palm and bores into Barkscorpion B. Its bark plates blacken and split.' },
    { key: 'typo', player: 'I flame lnace the one that stung me', plan: plan({ type: 'use_skill', skill: null, target: A, quote: 'I flame lnace the one that stung me' }) },
    { key: 'world', player: 'I Flame Lance the cracked floor to drop them into the hollow', plan: plan({ type: 'ability_world', skill: 'mage.flame_lance', target: { new: 'the cracked floor' }, target_words: 'the cracked floor', goal: 'drop them into the hollow', quote: 'I Flame Lance the cracked floor to drop them into the hollow' }),
        reply: 'Fire pours into the cracked floor. Resin hisses in the seams, and the ground groans under the scorpions.', swipe: 'Alaric drives the lance into the floor. The cracks glow red and widen with a dry snap.' },
    { key: 'search', player: 'I look for a way out', plan: plan({ type: 'activity', kind: 'search', what: 'a way out', minutes: null, until: null, quote: 'I look for a way out' }),
        reply: 'Alaric keeps his eyes on the pincers in front of him.' },
    { key: 'area', player: 'I cast Arcane Wave at Barkscorpion A', plan: plan({ type: 'use_skill', skill: 'mage.arcane_wave', target: A, quote: 'I cast Arcane Wave at Barkscorpion A' }),
        reply: 'The wave strikes the barkscorpions in the chosen Range Band.' },
];
const turnOf = (text) => TURNS.find((t) => text.includes(`PLAYER MESSAGE:\n${t.player}`));

// ------------------------------------------------------------------------------------------------ setup (as run_v4.mjs)
const contract = fs.readFileSync(path.join(ENGINE, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
const first = 'SYSTEM INITIALIZATION COMPLETE\n\n`Location: Public roadside verge outside Alderwatch, Valedorn Crown`\n\nCHARACTER CREATION — STEP 1/2: choose a Base Class (Warrior, Mage, Rogue).';
const card = {
    spec: 'chara_card_v2', spec_version: '2.0',
    name: CARD, description: contract, personality: '', scenario: '', first_mes: first, mes_example: '',
    data: { name: CARD, description: contract, personality: '', scenario: '', first_mes: first, mes_example: '', creator_notes: 'Prototype C smoke', system_prompt: '', post_history_instructions: '', alternate_greetings: [], tags: [], creator: '', character_version: '', extensions: { world: WORLD } },
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
settings.username = 'Alaric';
Object.assign(settings.oai_settings, { openai_max_context: 32000, openai_max_tokens: 1200, max_context_unlocked: true });
if (settings.extension_settings) delete settings.extension_settings.avereth; // the defaults: V4 with the planner (V4-C, Patch 7.2)
fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 4));
const secretsFile = path.join(USER, 'secrets.json');
const secretsBefore = fs.existsSync(secretsFile) ? fs.readFileSync(secretsFile, 'utf8') : null;
fs.writeFileSync(secretsFile, JSON.stringify({ api_key_custom: [{ id: 'smoke', value: DUMMY_KEY, label: 'smoke', active: true }], _migrated: [] }, null, 4));

// ------------------------------------------------------------------------------------------------ mock provider
const calls = [];
let probeMode = false;
const narrated = new Map();
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
    // the planner: its own role in a fight, the interpreter's prompt with the planner's section outside one
    if (system.startsWith('You are the intent planner') || (system.startsWith('You are the command interpreter') && system.includes('Actions with skills, in fights and on things'))) {
        purpose = 'plan';
        const t = turnOf(users);
        text = JSON.stringify(t ? t.plan : { commands: [] });
    } else if (system.startsWith('You are the command interpreter')) {
        purpose = 'interpret';
        text = JSON.stringify({ commands: [] });
    } else if (system.startsWith('You read one reply')) {
        purpose = 'extract';
        const t = TURNS.find((x) => x.reply && users.includes(x.reply.slice(0, 60)));
        text = JSON.stringify({ scene: 'here', ...(t?.answer || { expected: {}, deltas: [] }) });
        delay = 300;
    } else {
        const t = TURNS.find((x) => lastUser.includes(x.player));
        const n = (narrated.get(t?.key) || 0) + 1;
        narrated.set(t?.key, n);
        text = t ? (n > 1 && t.swipe ? t.swipe : t.reply || 'The world waits.') : 'The world waits.';
    }
    if (process.env.AVERETH_SMOKE_EMPTY_NARRATOR === '1' && purpose === 'narrator' && lastUser.includes(TURNS[0].player) && narrated.get('burrow') === 1) text = '';
    const probe = probeMode;
    if (probe && ((purpose === 'plan' && users.includes('FAILSOFT_PLANNER')) || purpose === 'extract')) text='{bad';
    calls.push({ probe, empty: !text.trim(), purpose, at: Date.now(), auth: req.headers.authorization || null, stream: !!j.stream, temperature: j.temperature, maxTokens: j.max_tokens, model: j.model, messages: msgs, lastUser });
    if (process.env.AVERETH_SMOKE_PROVIDER_ERROR === '1' && purpose === 'narrator' && lastUser.includes(TURNS[0].player) && narrated.get('burrow') === 1) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'An unexpected error has occurred.', type: 'server_error', code: 'internal_server_error' } })); return;
    }
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
const injectedSaveErrors = [];
let injectingSaveFailure = false;
const keyInBrowser = [];
page.on('pageerror', (e) => pageErrors.push(`${e.message} ${String(e.stack || '').split('\n').slice(1, 4).join(' ')}`));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) (injectingSaveFailure ? injectedSaveErrors : pageErrors).push(`${m.text()} @ ${m.location()?.url?.split('/').pop()}:${m.location()?.lineNumber}`); });
page.on('request', (r) => { if (`${JSON.stringify(r.headers())}\n${r.postData() || ''}`.includes(DUMMY_KEY)) keyInBrowser.push(r.url()); });
page.on('response', async (r) => {
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
    await page.evaluate(() => {
        $('#main_api').val('openai').trigger('change');
        $('#chat_completion_source').val('custom').trigger('change');
        $('#custom_api_url_text').val('http://127.0.0.1:5001/v1').trigger('input');
        $('#custom_model_id').val('mock-narrator').trigger('input');
        SillyTavern.getContext().saveSettingsDebounced();
        $('#api_button_openai').trigger('click');
    });
    await page.waitForFunction(() => SillyTavern.getContext().onlineStatus && SillyTavern.getContext().onlineStatus !== 'no_connection', null, { timeout: 30000 });
    await page.evaluate((name) => {
        const opt = [...document.querySelectorAll('#settings_preset_openai option')].find((o) => o.textContent === name);
        if (!opt) throw new Error(`no Chat Completion preset "${name}"`);
        $('#settings_preset_openai').val(opt.value).trigger('change');
    }, PRESET);
    await page.waitForTimeout(1500);
    // Patch 7.2: the planner is on by default (V4-C, the product path); the panel shows it, nothing to switch
    const toggle = await page.evaluate(() => {
        const el = document.getElementById('avereth_planner');
        const before = { exists: !!el, checked: !!el?.checked, setting: SillyTavern.getContext().extensionSettings?.avereth?.planner ?? null };
        return { before, after: before };
    });
    await page.waitForTimeout(800);
    const chid = await page.evaluate((name) => SillyTavern.getContext().characters.findIndex((c) => c.name === name), CARD);
    await page.evaluate(async (id) => { await SillyTavern.getContext().selectCharacterById(String(id)); }, chid);
    await page.waitForFunction(() => SillyTavern.getContext().chat.length >= 1, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    const greeting = await page.evaluate(() => (SillyTavern.getContext().chat[0].extra?.avereth?.events || []).map((e) => ({ t: e.t, runtime: e.d?.runtime, path: e.d?.path })));

    const extraction = () => page.evaluate(() => {
        const chat = SillyTavern.getContext().chat;
        const i = chat.findLastIndex((m) => !m.is_user && !m.is_system);
        return chat[i]?.extra?.avereth?.extraction?.status || null;
    });
    const idle = async () => {
        let quiet = null;
        for (let i = 0; i < 600; i++) {
            const busy = await page.evaluate(() => getComputedStyle(document.querySelector('#mes_stop')).display !== 'none');
            if (busy || (await extraction()) === 'pending') quiet = null;
            else quiet ??= Date.now();
            // A bounded Narrator regenerate may start just after GENERATION_ENDED/saveChat.
            if (quiet !== null && Date.now() - quiet >= 1000) return;
            await page.waitForTimeout(100);
        }
        throw new Error('SillyTavern did not finish generation/extraction');
    };
    /** The player message (by its text) and the message after it: records, panel, display. */
    const look = (text) => page.evaluate((t) => {
        const ctx = SillyTavern.getContext();
        const u = ctx.chat.findLastIndex((m) => m.is_user && m.mes === t);
        const r = ctx.chat[u]?.extra?.avereth || null;
        const next = ctx.chat[u + 1] || null;
        const els = document.querySelectorAll('#chat .mes');
        const outcome = (r?.events || []).findLast((e) => e.t === 'outcome.recorded')?.d?.outcome || null;
        return {
            u, record: r ? { route: r.route, ir: r.ir ? { route: r.ir.route, reason: r.ir.reason } : null, plan: r.plan || null, events: r.events || [] } : null,
            pcSteps: (outcome?.records || []).filter((x) => x.actor === 'pc'), planNotes: outcome?.plan_notes || [], outcomeKind: outcome?.kind || null,
            next: next ? { system: !!next.is_system, mes: next.mes, display: next.extra?.display_text || '', swipes: next.swipes?.length || 0, shown: els[u + 1]?.querySelector('.mes_text')?.innerText || '' } : null,
            mp: null,
        };
    }, text);
    const fold = () => page.evaluate(async () => {
        const ctx = SillyTavern.getContext();
        const { foldChat } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js').catch(() => import('/extensions/avereth-engine/src/host.js')).catch(() => ({}));
        const s = foldChat ? foldChat(ctx.chat).state : null;
        return s ? { areaLevels: s.places[s.scene.at]?.encounter_levels || null, mp: s.entities.pc.sheet.mp, encounter: !!s.encounter, foes: s.encounter ? Object.values(s.encounter.combatants).filter((c) => c.side === 'hostile').map((c) => ({ id: c.id, hp: c.current.hp })) : [] } : null;
    });
    // Exercise the exact natural-run driver, including automatic Host recovery.
    const driver = new Driver(page, { turnTimeoutMs: 60000 });
    let delayedRecoverySave = false;
    if (process.env.AVERETH_SMOKE_EMPTY_NARRATOR === '1') {
        await page.route('**/api/chats/save', async route => {
            const j = route.request().postDataJSON(), chat = j?.chat || [];
            const user = chat.findLast(m => m.is_user), reply = chat.findLast(m => !m.is_user && !m.is_system);
            if (!delayedRecoverySave && user?.extra?.avereth?.narrator_recovery && reply?.extra?.avereth?.narration?.empty) {
                delayedRecoverySave = true;
                await page.waitForTimeout(2200); // longer than the natural Driver's quiet period
            }
            await route.continue();
        });
    }
    async function send(text) {
        const r = await driver.send(text);
        if (!r.ok) throw new Error(`Runner send failed: ${r.problem}`);
    }

    await send('Mage');
    await send('Flame Lance + Arcane Wave');
    const afterCreation = calls.filter((c) => c.purpose === 'plan').length;
    const steps = {};
    let failsoft=null;
    if (process.env.AVERETH_SMOKE_FAILSOFT === '1') {
        probeMode=true;
        const before=await fold();
        await send('FAILSOFT_PLANNER I consider my next action.');
        const state=await fold();
        const visible=await driver.view();
        const saved=await driver.verifySaved(await driver.chat());
        const noBooking=await page.evaluate(()=>{const c=SillyTavern.getContext(),u=c.chat.findLast(m=>m.is_user);return !u.is_system && u.extra.avereth.events.length===0 && u.extra.avereth.continuation?.kind==='planner_not_executed';});
        await send('FAILSOFT_WORLD I wait quietly.');
        const world=await page.evaluate(()=>{const c=SillyTavern.getContext(),m=c.chat.findLast(m=>!m.is_user&&!m.is_system);return m.extra.avereth.extraction.status==='failed' && m.extra.avereth.continuation?.kind==='world_not_applied';});
        // ST's real save API resolves even for this injected HTTP 500. The
        // fixture is a System note only; no Engine event or game value changes.
        injectingSaveFailure=true;
        await page.route('**/api/chats/save',route=>route.fulfill({status:500,contentType:'application/json',body:'{"error":"injected_smoke_save_failure"}'}));
        const saveFault=await page.evaluate(async()=>{
            const c=SillyTavern.getContext();
            const {verifySavedChat}=await import('/scripts/extensions/third-party/avereth-engine/src/v4/continuation.js');
            c.chat.push({mes:'Synthetic persistence probe',is_user:false,is_system:true,extra:{}});
            try {
                await c.saveChat();
                let rejected=false;
                try { await verifySavedChat(c,c.chat.length-1,()=>true); } catch { rejected=true; }
                return {resolved:true,rejected};
            } finally { c.chat.pop(); }
        });
        await page.unroute('**/api/chats/save');
        injectingSaveFailure=false;
        await page.evaluate(async()=>{await SillyTavern.getContext().saveChat();});
        probeMode=false;
        failsoft={saveFault,noBooking,saved,world,visible:JSON.stringify(visible).includes('NOT EXECUTED'),noDuplicateCombat:before.mp===state.mp};
    }
    for (const t of TURNS) {
        await send(t.player);
        const view = await driver.view();
        steps[t.key] = { look: await look(t.player), state: await fold(), plans: calls.filter((c) => c.purpose === 'plan').length,
            screen: screenText(view), visible: view.messages.at(-1) };
        if (t.key === 'world') {
            // swipe the world use's reply: the plan of the message is reused, nothing is planned or rolled again
            await page.evaluate(() => { document.querySelector('#chat .last_mes .swipe_right')?.click(); });
            await page.waitForTimeout(400);
            await idle();
            steps.swipe = { look: await look(t.player), state: await fold(), plans: calls.filter((c) => c.purpose === 'plan').length };
        }
    }
    const status = await page.evaluate(() => document.getElementById('avereth_status')?.textContent || '');
    await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); });
    await page.waitForTimeout(800);
    result = { toggle, greeting, afterCreation, steps, status, delayedRecoverySave, failsoft };
} finally {
    await browser.close();
    st.kill();
    mock.close();
    if (secretsBefore === null) fs.rmSync(secretsFile, { force: true }); else fs.writeFileSync(secretsFile, secretsBefore);
}

// ------------------------------------------------------------------------------------------------ checks
const chatDir = path.join(USER, 'chats', CARD);
const chatText = fs.existsSync(chatDir) ? fs.readdirSync(chatDir).map((f) => fs.readFileSync(path.join(chatDir, f), 'utf8')).join('\n') : '';
const { toggle, greeting, afterCreation, steps, status } = result;
const S = (k) => steps[k] || {};
const normalCalls=calls.filter(c=>!c.probe);
const plans = normalCalls.filter((c) => c.purpose === 'plan');
const narr = normalCalls.filter((c) => c.purpose === 'narrator');
const engineOf = (c) => String(c?.messages?.find((m) => String(m.content).startsWith('[AVERETH ENGINE'))?.content || '');
const narratorFor = (key) => narr.filter((c) => c.lastUser.includes(TURNS.find((t) => t.key === key).player));
const checks = {
    ...(process.env.AVERETH_SMOKE_FAILSOFT === '1' ? {failsoftPlannerVisible:result.failsoft?.visible && result.failsoft?.noBooking,failsoftSaved:result.failsoft?.saved,failsoftWorldTerminal:result.failsoft?.world,failsoftNoDuplicateCombat:result.failsoft?.noDuplicateCombat,failsoftDetectsSwallowedSave:result.failsoft?.saveFault?.resolved && result.failsoft?.saveFault?.rejected} : {}),
    ...(process.env.AVERETH_SMOKE_PROVIDER_ERROR === '1' ? {
        transientProviderRecoveredOnce: narratorFor('burrow').length === 2 && S('burrow').look.record?.events?.filter(e => e.t === 'turn.begun').length === 1,
    } : {}),
    ...(process.env.AVERETH_SMOKE_EMPTY_NARRATOR === '1' ? {
        emptyNarratorRecoveredOnce: narratorFor('burrow').length === 2 && narratorFor('burrow').filter(c => c.empty).length === 1,
        runnerWaitsForDelayedRecoverySave: result.delayedRecoverySave && !!S('burrow').state.encounter,
    } : {}),
    campaignV4AtGreeting: greeting.some((e) => e.t === 'campaign.started' && e.runtime === 'v4'),
    plannerOnByDefault: toggle.before.exists && toggle.before.checked && toggle.before.setting === true,
    campaignPinnedToC: greeting.some((e) => e.t === 'campaign.started' && e.path === 'c'),
    creationWithoutPlanner: afterCreation === 0,
    runnerSeparatesVisibleEngine: !!S('burrow').visible.engine && !S('burrow').visible.text.includes(S('burrow').visible.engine)
        && S('burrow').screen.includes('[ENGINE RESULT]') && S('burrow').screen.includes('[NARRATOR'),
    // one planner call per free-text message, none for the question back and none for the swipe
    onePlanPerMessage: plans.length === TURNS.length && !calls.some((c) => c.purpose === 'interpret'),
    // every reply read once (the swiped one too): the barrier and the extractor as in Runtime V4
    extractPerReply: normalCalls.filter((c) => c.purpose === 'extract').length === narr.filter(c => !c.empty).length - (process.env.AVERETH_SMOKE_PROVIDER_ERROR === '1' ? 1 : 0),
    planCallParams: plans.every((c) => !c.stream && c.model === 'mock-narrator' && c.temperature === 0.1 && c.maxTokens === 2000),
    fightPromptInFight: plans.slice(1).every((c) => String(c.messages[0].content).startsWith('You are the intent planner')) && String(plans[0].messages[0].content).startsWith('You are the command interpreter'),
    keyAddedBySillyTavern: calls.length > 0 && calls.every((c) => c.auth === `Bearer ${DUMMY_KEY}`),
    keyNeverInBrowser: keyInBrowser.length === 0,
    keyNotInChatFile: chatText.length > 0 && !chatText.includes(DUMMY_KEY),
    areaWindowCommitted: JSON.stringify(S('burrow').state?.areaLevels) === '[1,3]' && /AREA LEVELS.*1–3/.test(S('burrow').look.next?.display || ''),
    fightOpened: S('burrow').state?.encounter === true && S('burrow').state.foes.length === 3,
    // 1 alias: Flame Lance on B, booked by the engine; A's own reading (kept in the record) was a Basic Attack
    aliasBooksFlameLance: S('alias').look.pcSteps[0]?.skill === 'mage.flame_lance' && S('alias').look.pcSteps[0]?.target === B && S('alias').state.mp === S('burrow').state.mp - 16
        && S('alias').look.record?.plan?.version === 'plan-c0.1' && S('alias').look.record?.ir?.reason === 'planner'
        && /Alaric: Flame Lance → Barkscorpion B|Flame Lance/.test(engineOf(narratorFor('alias')[0])) && !/Alaric[^\n]*Basic Attack/.test(engineOf(narratorFor('alias')[0])),
    aliasA0WasBasicAttack: S('alias').look.record?.plan?.a0?.skill === 'mage.basic_attack',
    // 2 the safety catch: a question in a System panel, nothing spent, no narrator call
    typoAsks: S('typo').look.next?.system === true && /CLARIFY/.test(S('typo').look.next.mes) && /Options: Basic Attack · Flame Lance · Arcane Wave/.test(S('typo').look.next.mes)
        && S('typo').state.mp === S('alias').state.mp && narratorFor('typo').length === 0 && S('typo').look.record?.events?.length === 0,
    // 3 a skill on a thing: cost and check die, the narrator told it is an attempt with no effect on any combatant
    worldUseBooked: S('world').look.pcSteps[0]?.kind === 'ability_world' && S('world').look.pcSteps[0]?.goal === 'drop them into the hollow' && S('world').state.mp === S('typo').state.mp - 16
        && /an attempt on a thing, his action this Turn\. CHECK DIE d100 = \d+/.test(engineOf(narratorFor('world')[0])),
    // 4 the swipe: a new reply, the same plan, events and MP; no second planner call
    swipeReusesPlan: S('swipe').plans === S('world').plans && JSON.stringify(S('swipe').look.record?.events) === JSON.stringify(S('world').look.record?.events)
        && S('swipe').state.mp === S('world').state.mp && narratorFor('world').length === 2 && engineOf(narratorFor('world')[1]) === engineOf(narratorFor('world')[0])
        && S('swipe').look.next?.swipes === 2,
    // 5 search in a fight: what he meant, visibly not taken (narrator block and the System lines under the reply)
    searchNotTaken: S('search').look.pcSteps.length === 0 && /searching is not possible during a fight/.test(S('search').look.planNotes[0] || '')
        && /- NOT TAKEN THIS TURN \(it does not happen; do not narrate it as done\): searching is not possible during a fight/.test(engineOf(narratorFor('search')[0]))
        && /NOT TAKEN — searching is not possible during a fight/.test(`${S('search').look.next?.display}\n${S('search').look.next?.shown}`),
    bandAreaOnce: S('area').look.pcSteps[0]?.skill === 'mage.arcane_wave' && S('area').look.pcSteps[0]?.strikes?.length === 2
        && S('area').state.mp === S('search').state.mp - 14,
    proseOnlyRequests: narr.every((c) => engineOf(c).trimEnd().endsWith(V4_OUTPUT_LINE)),
    statusLine: status.includes(`Avereth Engine ${ENGINE_VERSION}`) && /runtime v4 \(LLM: custom endpoint\)/.test(status) && /integrity: OK/.test(status),
    noPageErrors: pageErrors.length === 0,
};
fs.writeFileSync(path.join(HERE, 'result.json'), JSON.stringify({ checks, toggle, steps, status, calls: calls.map((c) => ({ purpose: c.purpose, stream: c.stream, temperature: c.temperature, max_tokens: c.maxTokens, auth: c.auth ? 'Bearer <dummy>' : null, n: c.messages.length, lastUser: c.lastUser.slice(-80) })), keyInBrowser, pageErrors, injectedSaveErrors }, null, 1));
fs.writeFileSync(path.join(HERE, 'planner_alias_request.json'), JSON.stringify(plans[1]?.messages || [], null, 1));
fs.writeFileSync(path.join(HERE, 'narrator_world_request.json'), JSON.stringify(narratorFor('world')[0]?.messages || [], null, 1));
console.log(JSON.stringify(checks, null, 1));
console.log(JSON.stringify({ calls: calls.map((c) => `${c.purpose}${c.purpose === 'narrator' ? '' : ` t=${c.temperature}`}`), status, keyInBrowser, pageErrors: pageErrors.slice(0, 5) }, null, 1));
console.log(Object.values(checks).every(Boolean) ? 'LIVE SILLYTAVERN SMOKE C: OK' : 'LIVE SILLYTAVERN SMOKE C: FAILED');
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
