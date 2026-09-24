// Live SillyTavern smoke, step 2 (optional, docs/RUNTIME_V3.md): a real SillyTavern (tested with 1.19.0) with this
// extension and a scripted, streaming mock narrator (OpenAI-compatible, port 5001). Plays a Warrior's creation (answered by
// System panels, including the Pre-Test-5 run's invented Skill pick and a story message sent too early), an incidental NPC,
// a recurring NPC, the quest board, registration and coin, an ambush fight, the report back, Kest again after his
// exchange has left the history window, travel to another realm, and two replies without a fact report (the separate
// report request: once answered, once not); it checks the Runtime V3 goals in the real host: prompt assembly, history
// window, NPC record, Lore Bridge, streaming, display, HUD, report requests. It judges no prose (scripted mock).
// Usage: AVERETH_ST_DIR=/path/to/SillyTavern node tools/st_live/run.mjs   (after setup.mjs; Playwright + Chromium)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }

const ST = process.env.AVERETH_ST_DIR;
if (!ST) throw new Error('set AVERETH_ST_DIR to a SillyTavern checkout');
const ENGINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const HERE = process.env.AVERETH_ST_OUT || path.join(ST, 'avereth_live_smoke');
fs.mkdirSync(HERE, { recursive: true });
const LOG = path.join(HERE, 'requests.jsonl');
fs.writeFileSync(LOG, '');
fs.rmSync(path.join(ST, 'data/default-user/chats/Avereth'), { recursive: true, force: true }); // a fresh campaign chat

// ------------------------------------------------------------------------------------------------ scripted narrator
const MEGUMIN_BLOCKS = '\n\n<Blocks>\n<World_State>\n**Time:** Day 9 | **Loc:** Somewhere else\n</World_State>\n<Character_Sheet>\nHP: 12/80 | Coin: 99 Gold | Quests: none\n</Character_Sheet>\n<New_NPC name="Gate Guard">\n**Background:** an invented biography\n</New_NPC>\n</Blocks>';
const SCRIPT = [
    // a trap: creation must never reach the narrator (the Pre-Test-5 narrator answered "Warrior" with an invented pool)
    ['Warrior', 'BASE CLASS: WARRIOR — CONFIRMED. Choose 2: Cleave, Iron Guard, War Step, Shield Bash, Battle Cry.'],
    ['city gate', 'The south gate of Tidecross stands open to the morning carts. A gate guard with a bored face and a boar-spear waves the traffic through, then looks you over once.\n\n"Pass\'s free on foot," he says, already watching the next cart.\n<avereth>{"time":20,"place":"Tidecross south gate","new":[{"ref":"gate guard","kind":"npc","desc":["gate guard","bored"],"band":"SHORT"}],"aware":[{"who":"gate guard","level":"aware"}]}</avereth>' + MEGUMIN_BLOCKS],
    ['rats are done', '"Heard." Kest glances at the ear pail, then back at you. "Start there. Keep starting there."\n<avereth>{"time":2,"attitude":[{"who":"Kest","delta":10,"why":"the Novice took the rat job first, as told"}]}</avereth>'],
    ['long road east', 'Three days of road dust later, a walled city of black stone rises over the river crossing. The guards at the east gate wave carts through without a glance.\n<avereth>{"time":4320,"location":"Ashbridge","place":"east gate"}</avereth>'],
    // no fact report (Test 5 runs 1 and 2: 5 of 15 replies had one): the engine asks for it separately (REPORTS)
    ['look around the market', 'Beyond the gate the market smells of smoke and tar; a tinker sharpens knives under a grey awning.'],
    ['grilled eel', 'The eel seller wraps a skewer in a leaf and takes a copper without a word.'],
    ['back to the Guild', 'Serah takes the ear with two fingers and drops it in a pail. "Cellar\'s clear, then." She counts out five silver. At the board, Kest watches you without a word.\n<avereth>{"time":35,"place":"Guild hall, counter","enter":["Serah","Kest"],"quests":[{"title":"Rats in the Salt Cellar","status":"completed"}],"coin":[{"cp":50,"why":"quest reward"}],"learn":[{"who":"Serah","s":"pc","p":"cleared","o":"the salt cellar rats","how":"told","from":"pc"}]}</avereth>'],
    ['Guild hall', 'The Guild hall smells of wet wool and ink. At the Novice board a one-eyed man with a grey braid leans on the wall; behind the counter a clerk with pale eyes and an ink-smudged jaw sorts slips.\n\n"New face," the one-eyed man rasps. "Board\'s there."\n<avereth>{"time":25,"place":"Guild hall, Novice board","leave":["gate guard"],"new":[{"ref":"Kest","name":"Kest","kind":"npc","desc":["veteran adventurer"],"traits":"one-eyed, grey braid, gruff","band":"SHORT"},{"ref":"Serah","name":"Serah","kind":"npc","desc":["guild clerk"],"traits":"pale eyes, ink-smudged jaw","band":"MEDIUM"}],"facts":[{"s":"Kest","p":"occupation","o":"veteran adventurer"},{"s":"Kest","p":"voice","o":"low rasp, clipped sentences"},{"s":"Serah","p":"occupation","o":"Guild clerk"}],"quests":[{"title":"Rats in the Salt Cellar","status":"offered","giver":"Serah","level":1,"type":"minor","rank":"Novice"}]}</avereth>'],
    ['Greyhowl', '"Greyhowl." Kest\'s one eye narrows. "Took two Wardens last spring. You leave that bill alone, Novice." He taps the lower slip instead. "Rats. Start there."\n<avereth>{"time":5,"memory":[{"text":"Kest warned Alaric that Greyhowl killed two Wardens and told him to leave the posting alone","who":["Kest","pc"],"imp":7}],"attitude":[{"who":"Kest","delta":-15,"why":"a green Novice eyeing the Greyhowl bill"}],"facts":[{"s":"Kest","p":"agenda","o":"get the Greyhowl posting taken down"}]}</avereth>'],
    ['register', 'Serah takes the two silver, stamps a lead tag and slides it across. "Rats in the Salt Cellar. Under the fish docks. Bring an ear."\n<avereth>{"time":10,"coin":[{"cp":-20,"why":"Guild registration"}],"facts":[{"s":"pc","p":"guild_rank","o":"Novice"}],"items":[{"item":"Guild registration tag","qty":1,"from":"Serah","to":"pc","why":"registration"}],"quests":[{"title":"Rats in the Salt Cellar","status":"active"}]}</avereth>'],
    ['salt cellar', 'The salt cellar under the fish docks is cold and briny. Past the stacked barrels a rat the size of a cat gnaws at a sack, its back to the stairs, unaware of you.\n<avereth>{"time":30,"place":"salt cellar under the fish docks","new":[{"ref":"rat","kind":"creature","species":"rat","desc":["big rat"],"band":"SHORT"}],"aware":[{"who":"rat","level":"unaware"}]}</avereth>'],
    ['Heavy Slash the rat', 'Two quiet steps, then the blade comes down behind the rat\'s shoulder and pins it to the sack; it kicks twice and is still. Brine drips somewhere in the dark.\n<avereth>{"time":1}</avereth>'],
];
const replyFor = (input) => (SCRIPT.find(([k]) => input.includes(k)) || [null, 'The world waits.\n<avereth>{}</avereth>'])[1];
// answers to the engine's report requests (host.js reportRequest), by the player's message they quote
const REPORTS = [
    // "place" is refused like in a narrator report: looking around moves nobody
    ['look around the market', '<avereth>{"time":10,"place":"Ashbridge market","new":[{"ref":"tinker","kind":"npc","desc":["tinker","knife-grinder"],"band":"MEDIUM"}]}</avereth>'],
    ['grilled eel', 'The eel is good, hot and salty.'], // no report in the answer: the reply keeps NO FACT REPORT
];
const isReportRequest = (msgs) => String(msgs[0]?.content || '').startsWith('[AVERETH ENGINE — FACT REPORT REQUEST]');

const mock = http.createServer(async (req, res) => {
    if (req.url.endsWith('/models')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ object: 'list', data: [{ id: 'mock-narrator', object: 'model' }] })); return; }
    let body = '';
    for await (const c of req) body += c;
    const j = JSON.parse(body || '{}');
    const msgs = j.messages || [];
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')?.content || '';
    const text = isReportRequest(msgs) ? (REPORTS.find(([k]) => String(lastUser).includes(k)) || [null, '{}'])[1] : replyFor(String(lastUser));
    fs.appendFileSync(LOG, `${JSON.stringify({ stream: !!j.stream, messages: msgs, lastUser, reply: text })}\n`);
    const promptChars = msgs.reduce((a, m) => a + String(m.content).length, 0);
    if (j.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
        for (let i = 0; i < text.length; i += 12) {
            res.write(`data: ${JSON.stringify({ id: 'c', object: 'chat.completion.chunk', created: 0, model: 'mock-narrator', choices: [{ index: 0, delta: { content: text.slice(i, i + 12) }, finish_reason: null }] })}\n\n`);
            await new Promise((r) => setTimeout(r, 15));
        }
        res.write(`data: ${JSON.stringify({ id: 'c', object: 'chat.completion.chunk', created: 0, model: 'mock-narrator', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`);
        res.end('data: [DONE]\n\n');
    } else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: 'c', object: 'chat.completion', created: 0, model: 'mock-narrator', choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage: { prompt_tokens: Math.round(promptChars / 4), completion_tokens: Math.round(text.length / 4) } }));
    }
});
await new Promise((r) => mock.listen(5001, '127.0.0.1', r));

// ------------------------------------------------------------------------------------------------ SillyTavern
const st = spawn(process.execPath, ['server.js', '--port', '8123', '--browserLaunchEnabled', 'false'], { cwd: ST, stdio: ['ignore', 'pipe', 'pipe'] });
let stOut = '';
st.stdout.on('data', (d) => { stOut += d; });
st.stderr.on('data', (d) => { stOut += d; });
for (let i = 0; i < 120 && !/listening on/.test(stOut); i++) await new Promise((r) => setTimeout(r, 500));

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) pageErrors.push(m.text()); });
await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
// first run: SillyTavern asks for a persona name
await page.waitForSelector('dialog[open]', { timeout: 30000 }).catch(() => {});
await page.evaluate(() => {
    const d = document.querySelector('dialog[open]');
    if (!d) return;
    const ta = d.querySelector('textarea, input[type="text"]');
    if (ta) { ta.value = 'Alaric'; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    d.querySelector('.popup-button-ok')?.click();
});
await page.waitForFunction(() => window.SillyTavern?.getContext?.()?.characters?.length > 0, null, { timeout: 60000 });
await page.waitForTimeout(1500);
// close first-run popups if any
await page.evaluate(() => document.querySelectorAll('dialog[open] .popup-button-ok, dialog[open] .popup-button-cancel').forEach((b) => b.click()));
const regexScripts = ['avereth_hide_fact_report.json', 'avereth_hide_tracker_blocks.json'].map((f) => JSON.parse(fs.readFileSync(path.join(ENGINE, 'regex', f), 'utf8')));
await page.evaluate(async (scripts) => {
    const ctx = SillyTavern.getContext();
    $('#main_api').val('openai').trigger('change');
    $('#chat_completion_source').val('custom').trigger('change');
    $('#custom_api_url_text').val('http://127.0.0.1:5001/v1').trigger('input');
    $('#custom_model_id').val('mock-narrator').trigger('input');
    $('#stream_toggle').prop('checked', true).trigger('change');
    ctx.extensionSettings.regex = [...(ctx.extensionSettings.regex || []).filter((s) => !String(s.id).startsWith('avereth')), ...scripts];
    ctx.saveSettingsDebounced();
    $('#api_button_openai').trigger('click');
}, regexScripts);
await page.waitForFunction(() => SillyTavern.getContext().onlineStatus && SillyTavern.getContext().onlineStatus !== 'no_connection', null, { timeout: 30000 });
const chid = await page.evaluate(() => SillyTavern.getContext().characters.findIndex((c) => c.name === 'Avereth'));
await page.evaluate(async (id) => { await SillyTavern.getContext().selectCharacterById(String(id)); }, chid);
await page.waitForFunction(() => SillyTavern.getContext().chat.length >= 1, null, { timeout: 30000 });
await page.waitForTimeout(1000);

/** Send one player message, watch the streaming DOM, wait for the engine to finish processing the reply. */
async function send(text) {
    const before = await page.evaluate(() => SillyTavern.getContext().chat.length);
    await page.evaluate((t) => { $('#send_textarea').val(t).trigger('input'); $('#send_but').trigger('click'); }, text);
    const seen = [];
    const start = Date.now();
    while (Date.now() - start < 30000) {
        const s = await page.evaluate(() => {
            const els = document.querySelectorAll('#chat .mes');
            const last = els[els.length - 1];
            return { txt: last?.querySelector('.mes_text')?.innerText || '', html: last?.querySelector('.mes_text')?.innerHTML || '', streaming: !!document.querySelector('#mes_stop:not([style*="none"])') && getComputedStyle(document.querySelector('#mes_stop')).display !== 'none', n: SillyTavern.getContext().chat.length };
        });
        seen.push(s.txt);
        if (s.n >= before + 2 && !s.streaming) break;
        await page.waitForTimeout(25);
    }
    // a reply without a fact report: the engine's separate request settles before anything is read
    for (let i = 0; i < 150; i++) {
        if (await page.evaluate(() => SillyTavern.getContext().chat.at(-1)?.extra?.avereth?.recovery !== 'pending')) break;
        await page.waitForTimeout(100);
    }
    await page.waitForTimeout(700); // MESSAGE_RECEIVED processing + save + re-render
    const state = await page.evaluate(() => {
        const ctx = SillyTavern.getContext();
        const m = ctx.chat[ctx.chat.length - 1];
        const els = document.querySelectorAll('#chat .mes');
        const last = els[els.length - 1];
        return {
            system: !!m.is_system, panelText: m.is_system ? m.mes : '',
            mes: m.mes, display: m.extra?.display_text || '', rec: !!m.extra?.avereth, rejected: (m.extra?.avereth?.rejected || []).map((r) => r.reason),
            accepted: m.extra?.avereth?.accepted || [], corrections: m.extra?.avereth?.corrections || [],
            huds: last?.querySelectorAll('details.custom-avereth-hud, details.avereth-hud').length || 0, hudText: [...(last?.querySelectorAll('details.custom-avereth-hud, details.avereth-hud') || [])].map((d) => d.textContent).join('\n'),
            shown: last?.querySelector('.mes_text')?.innerText || '', hudStyled: last?.querySelector('details.custom-avereth-hud') ? getComputedStyle(last.querySelector('details.custom-avereth-hud')).borderTopStyle : null,
            panelShown: /COMBAT|CHECK|COIN|QUEST|ITEM/.test(last?.querySelector('.mes_text')?.innerText || ''),
        };
    });
    const leaked = seen.some((t) => /<avereth|avereth>\{|"time":|World_State|Character_Sheet|New_NPC/.test(t));
    return { text, streamedFrames: seen.length, leakedWhileStreaming: leaked, ...state };
}

const turns = [];
for (const input of [
    // character creation, answered by System panels: the real pool, the invented pick rejected with its reason, a story
    // message sent before creation is done (the Pre-Test-5 run), then a real choice and the player's #equipment check
    'Warrior', 'Cleave + Iron Guard', '*i Walk towards the gate of the city*', 'Heavy Slash + Guard', '#equipment',
    '*I walk up to the city gate and nod to the guard.*',
    '*I walk into town and look for the Guild hall.*',
    '"What about the Greyhowl posting?" *I ask Kest.*',
    '*I register with Serah, pay the 2 silver fee and take the Rats in the Salt Cellar job.*',
    '*I head to the salt cellar under the fish docks.*',
    '*I creep up and Heavy Slash the rat.*',
    '*I cut an ear off the rat and walk back to the Guild hall to report to Serah.*',
    // Kest again: his Greyhowl exchange (turn 5) is outside the history window now, his record is not
    '"Kest. The rats are done, like you said."',
    // travel to another realm; the next request's World Info must follow the Lore Bridge, not the chat text
    '*I travel the long road east to Ashbridge.*',
    '*I look around the market.*',
    '*I buy a skewer of grilled eel.*',
]) turns.push(await send(input));

// # command: answered by the engine, no LLM request
const reqsBefore = fs.readFileSync(LOG, 'utf8').trim().split('\n').length;
await page.evaluate(() => { $('#send_textarea').val('#status').trigger('input'); $('#send_but').trigger('click'); });
await page.waitForTimeout(2500);
const statusPanel = await page.evaluate(() => [...document.querySelectorAll('#chat .mes .mes_text')].map((e) => e.innerText).filter((t) => /SYSTEM \/\/ STATUS/.test(t)).join('\n'));
const reqsAfter = fs.readFileSync(LOG, 'utf8').trim().split('\n').length;

const requests = fs.readFileSync(LOG, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const out = { turns, requests: requests.map((r) => ({ lastUser: r.lastUser.slice(0, 60), stream: r.stream, n: r.messages.length, chars: r.messages.reduce((a, m) => a + String(m.content).length, 0), engine: r.messages.some((m) => String(m.content).includes('[AVERETH ENGINE')), trackers: r.messages.some((m) => /<World_State>|<Character_Sheet>|<New_NPC|<NPC_Update/.test(String(m.content))), hud: r.messages.some((m) => /avereth-hud/.test(String(m.content))), historyUsers: r.messages.filter((m) => m.role === 'user').length })), status: { panel: statusPanel.slice(0, 400), llmCalls: reqsAfter - reqsBefore }, pageErrors };
fs.writeFileSync(path.join(HERE, 'result.json'), JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(HERE, 'last_prompt.json'), JSON.stringify(requests.at(-1).messages, null, 1));
// the last reply with both HUD panels unfolded
await page.evaluate(() => { const els = document.querySelectorAll('#chat .mes'); const m = [...els].reverse().find((e) => e.querySelector('details.custom-avereth-hud')); m?.querySelectorAll('details.custom-avereth-hud').forEach((d) => { d.open = true; }); m?.scrollIntoView(); });
await page.waitForTimeout(300);
const shot = await page.evaluate(() => { const els = document.querySelectorAll('#chat .mes'); return [...els].reverse().findIndex((e) => e.querySelector('details.custom-avereth-hud')); });
if (shot >= 0) await page.locator('#chat .mes').nth(-1 - shot).screenshot({ path: path.join(HERE, 'hud.png') });
await browser.close();
st.kill();
mock.close();
const checks = {
    noLeakWhileStreaming: turns.every((t) => !t.leakedWhileStreaming),
    hudUnderEveryReply: turns.filter((t) => !t.system).every((t) => t.huds === 2 && t.hudStyled === 'solid'),
    noTrackerTextStored: turns.every((t) => !/<World_State>|<Character_Sheet>|<New_NPC>|<NPC_Update>/.test(t.mes)),
    engineBlockEveryRequest: out.requests.every((q) => q.engine),
    noTrackersOrHudInPrompts: out.requests.every((q) => !q.trackers && !q.hud),
    historyWindow: out.requests.every((q) => q.historyUsers <= 4),
    ambushCrit: /AMBUSH CRIT ×1\.5/.test(turns.find((t) => /Heavy Slash the rat/.test(t.text))?.shown || ''),
    commandWithoutLlm: out.status.llmCalls === 0 && /SYSTEM \/\/ STATUS/.test(out.status.panel),
    noPageErrors: pageErrors.length === 0,
};
// Runtime V3 in a longer run: the NPC record, the history window, travel and the Lore Bridge
const reqFor = (needle) => requests.find((r) => String(r.lastUser).includes(needle));
const engineOf = (r) => String((r?.messages || []).find((m) => String(m.content).startsWith('[AVERETH ENGINE'))?.content || '');
// character creation by the System (Pre-Test-5): the real pool, visible rejections, the Warrior's kit, no narrator call
const T = (needle) => turns.find((t) => t.text.includes(needle)) || {};
const CREATION = ['Warrior', 'Cleave + Iron Guard', '*i Walk towards the gate of the city*', 'Heavy Slash + Guard', '#equipment'];
checks.creationBySystem = CREATION.every((c) => T(c).system)
    && /CLASS SELECTED: WARRIOR[\s\S]*- Heavy Slash \[[\s\S]*- Deflect \[/.test(T('Warrior').panelText) && !/Cleave|Iron Guard|War Step/.test(T('Warrior').panelText)
    && /Starter Longsword \[F\] \(ATK 6\), Starter Heavy Armor \[F\] \(DEF 6, MDEF 2\)/.test(T('Warrior').panelText)
    && /Not a valid Skill choice: Select exactly 2 distinct Skills\. Recognized: Guard\./.test(T('Cleave + Iron Guard').panelText)
    && /Not a valid Skill choice: no Skill from the pool named\./.test(T('Walk towards the gate').panelText)
    && /CHARACTER CREATION COMPLETE[\s\S]*HP 85\/85 \| MP 60\/60 \| STA 100\/100/.test(T('Heavy Slash + Guard').panelText)
    && /Starter Longsword \[F\] — ATK 6[\s\S]*Starter Heavy Armor \[F\] — DEF 6, MDEF 2/.test(T('#equipment').panelText);
checks.noLlmForCreation = !requests.some((r) => CREATION.includes(String(r.lastUser)))
    && /mode: story/.test(engineOf(requests[0])) && /CHARACTER CREATION is complete/.test(engineOf(requests[0]));
// replies without a fact report (Test 5 runs 1 and 2): the engine asks for it separately with the turn's engine block;
// an answered request counts as the narrator's report, an unanswered one leaves NO FACT REPORT above the reply
const reportReqs = requests.filter((r) => isReportRequest(r.messages));
const marketReq = reportReqs.find((r) => String(r.lastUser).includes('look around the market'));
checks.reportRecovered = reportReqs.length === 2 && /REPORT RECOVERED: the reply had no fact report, a separate request supplied it \(\d+\.\d s\)\./.test(T('look around the market').shown || '')
    && /Present: the tinker \(MEDIUM\)/.test(T('look around the market').hudText || '')
    // validated like the narrator's own report: "look around" moves nobody, so its "place" is refused (PLAYER OWNERSHIP)
    && /Location: Ashbridge, Duskreach — east gate/.test(T('look around the market').hudText || '') && (T('look around the market').rejected || []).some((r) => /PLAYER OWNERSHIP: moving Alaric/.test(r))
    && /\[AVERETH ENGINE — authoritative game state, turn \d+\./.test(String(marketReq?.messages?.[0]?.content || '')) && /NARRATOR'S REPLY:\nBeyond the gate the market smells/.test(String(marketReq?.lastUser || ''))
    && !/NO FACT REPORT/.test(T('city gate').shown || '') && /End EVERY reply with <avereth>\{…\}<\/avereth>, \{\} if nothing new\.$/.test(engineOf(requests[0]));
checks.reportRequestFailed = /NO FACT REPORT, and the separate request brought none \(\d+\.\d s\): nothing this reply established was recorded/.test(T('grilled eel').shown || '');
checks.warriorHud = /HP 85\/85 \(unhurt\)/.test(T('city gate').hudText || '') && /Starter Longsword · Starter Heavy Armor/.test(T('city gate').hudText || '')
    && /ATK 6 · MATK 0 · DEF 7 · MDEF 3/.test(T('city gate').hudText || '');
const chatOf = (r) => (r?.messages || []).filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => String(m.content));
const kestReq = reqFor('rats are done');
const kestCard = (engineOf(kestReq).split('PRESENT (each NPC knows ONLY what its card lists):\n')[1] || '').split('\n\n')[0];
checks.recurringNpcCard = /• Kest — person, veteran adventurer; one-eyed, grey braid, gruff; voice: low rasp, clipped sentences/.test(kestCard)
    && /\(-15\) \(last change: a green Novice eyeing the Greyhowl bill\)/.test(kestCard) && /agenda: get the Greyhowl posting taken down/.test(kestCard)
    && /last meaningful: [^\n]*warned/.test(kestCard);
checks.recallBeyondWindow = !chatOf(kestReq).some((c) => /Took two Wardens/.test(c)) && /Greyhowl killed two Wardens/.test(engineOf(kestReq));
const travelTurn = turns.find((t) => /long road east/.test(t.text));
const lookReq = reqFor('look around the market');
checks.travel = /Location: Ashbridge, Duskreach — east gate/.test(travelTurn?.hudText || '') && /Present: nobody besides Alaric/.test(travelTurn?.hudText || '')
    && /Ashbridge, Duskreach — east gate/.test(engineOf(lookReq));
// World Info scans the last two messages (Scan Depth 2): neither names the new realm, only the Lore Bridge does
checks.loreBridgeTravel = (lookReq?.messages || []).some((m) => /DUSKREACH \[CANON/.test(String(m.content)))
    && !chatOf(lookReq).slice(-2).some((c) => /Ashbridge|Duskreach|Blackgate/i.test(c));
out.v3 = { kestCard, travelHud: travelTurn?.hudText || '', lookEngineHead: engineOf(lookReq).split('\n').slice(0, 3).join('\n'), creation: CREATION.map((c) => ({ input: c, panel: T(c).panelText })), firstRequestEngine: engineOf(requests[0]).split('\n').slice(0, 12).join('\n'), firstHud: T('city gate').hudText };
fs.writeFileSync(path.join(HERE, 'result.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(checks, null, 1));
console.log(Object.values(checks).every(Boolean) ? 'LIVE SILLYTAVERN SMOKE: OK' : 'LIVE SILLYTAVERN SMOKE: FAILED');
console.log(JSON.stringify({ turns: turns.map((t) => ({ text: t.text.slice(0, 40), leaked: t.leakedWhileStreaming, frames: t.streamedFrames, huds: t.huds, styled: t.hudStyled, rejected: t.rejected, mes: t.mes.slice(0, 60) })), requests: out.requests, status: out.status, pageErrors }, null, 1));
