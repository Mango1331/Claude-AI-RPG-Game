// tools/narrator_ab.mjs and presets/Avereth Narrator.json (docs/NARRATOR_AB.md): the logged request is split into
// Megumin's share and the Avereth layers; B and C keep every Avereth layer and parameter byte-identical, carry the
// output contract last, and hold no Megumin text. The engine judges each reply against the state the run recorded in
// its chat file. The request below has the shape of the Test 5 logs; its Megumin parts are stand-ins around the short
// wrapper labels the tool splits at (no Megumin text in this public repository).
import test from 'node:test';
import assert from 'node:assert/strict';
import util from 'node:util';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { loadContent, readJson, ROOT } from '../helpers.js';
import { splitMegumin, buildVariants, diffVariants, loadNarrator, replyMetrics, blindExport, selectTurns, summarize, stateFor, PRESET_FILE } from '../../tools/narrator_ab.mjs';
import { parseServerLog } from '../../tools/run_report.mjs';
import { prepareGeneration, processReply } from '../../src/host.js';

const content = await loadContent();
const narrator = loadNarrator();
const CONTRACT = content.narrator.contract_text.replace(/\{\{user\}\}/g, 'Alaric').replace(/\n$/, '');
const INPUT = '*i walk to the Gate of the City in front of me*'; // a turn of Test 5 run 1 (fixture.json)
const sys = (content) => ({ role: 'system', content });
const ENGINE = '[AVERETH ENGINE — authoritative game state, turn 4. Numbers, rolls, positions and knowledge below are binding; narrate, never recalculate.]\nDay 1, 09:00 (morning) | Alderwatch\n\nFACT REPORT: …\nEnd EVERY reply with <avereth>{…}</avereth>, {} if nothing new.';
const request = (engine = ENGINE) => ({
    messages: [
        sys(`STAND-IN NARRATOR STYLE\n<banlist>\n- word\n</banlist>\n\n<character_sheet>\nhere is the lore and character's, Avereth Engine Test:\nALDERWATCH [CANON SEED]\nA walled city.\n${CONTRACT}\n</character_sheet>\n<user_persona>\nhere the PC/Reader Alaric persona:\n\nAlaric is a young man.\n</user_persona>\n<history>\n\n`),
        sys('[Start a new Chat]'),
        { role: 'assistant', content: 'Arrival on the verge.' },
        sys('## your thinking steps:\n<think>stand-in</think>'),
        { role: 'user', content: INPUT },
        sys(`${engine}\n</history>\n\nStand-in closing line (never stop or refuse).`),
    ],
    model: 'zai-org/GLM-5.3-Flash', temperature: 0.9, max_tokens: 4096, stream: false, presence_penalty: 0, frequency_penalty: 0, top_p: 0.95, clear_thinking: true, reasoning_effort: 'low',
});
const ai = (mes) => ({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} });
/** Run 1 as the extension records it in the chat file, up to the player's message `input`, and that turn's engine block. */
async function recorded(input) {
    const fx = await readJson('tests/testrun_v5/fixture.json');
    const chat = [ai(fx.greeting)];
    processReply(chat, 0, content, { seed: fx.seed });
    for (const x of fx.creation) {
        chat.push({ is_user: true, is_system: false, mes: x, extra: {} });
        prepareGeneration(chat, content, { type: 'normal' });
        chat.at(-1).is_system = true;
    }
    for (const t of fx.turns) {
        chat.push({ is_user: true, is_system: false, mes: t.input, extra: {} });
        const gen = prepareGeneration(chat, content, { type: 'normal', settings: { recentTurns: 4, engineLore: false } });
        if (t.input === input) return { chat, engine: gen.context.text };
        chat.push(ai(t.reply));
        processReply(chat, chat.length - 1, content);
    }
    throw new Error(`${input} is not in the fixture`);
}
const gate = await recorded(INPUT);

test('the logged Megumin request splits into its layers; B and C keep the Avereth layers byte-identical, output contract last', () => {
    const req = request();
    const p = splitMegumin(req.messages);
    assert.equal(p.contract, CONTRACT);
    assert.equal(p.loreBefore, 'ALDERWATCH [CANON SEED]\nA walled city.');
    assert.equal(p.loreAfter, '');
    assert.equal(p.persona, 'Alaric is a young man.');
    assert.equal(p.engine, ENGINE);
    assert.deepEqual(p.history.map((m) => m.role), ['system', 'assistant', 'user'], '"[Start a new Chat]", the greeting, the player message; no thinking prompt');
    const v = buildVariants(req, narrator);
    assert.equal(v.A.messages, req.messages, 'A is the logged request');
    assert.deepEqual(v.B.messages.map((m) => m.content), [narrator.style, p.loreBefore, CONTRACT, p.persona, '[Start a new Chat]', 'Arrival on the verge.', INPUT, ENGINE, narrator.output]);
    assert.deepEqual(v.C.messages, v.B.messages.slice(1));
    for (const k of ['B', 'C']) assert.deepEqual({ ...v[k], messages: null }, { ...req, stream: false, messages: null }, `${k}: every parameter as logged`);
    const d = diffVariants(v, narrator);
    assert.ok(d.ok, JSON.stringify(d.checks));
    assert.match(d.shape.A.join(' '), /^megumin\+lore\+contract\+persona\(\d+\) system\(18\) assistant\(\d+\) megumin-thinking\(\d+\) user\(\d+\) engine\+megumin-tail\(\d+\)$/);
    assert.match(d.shape.B.join(' '), /^style\(\d+\) lore\(\d+\) contract\(\d+\) persona\(\d+\) system\(18\) assistant\(\d+\) user\(\d+\) engine\(\d+\) output-contract\(\d+\)$/);
});

test('a request of another shape is refused, not guessed; a tampered variant fails the checks', () => {
    const v = buildVariants(request(), narrator);
    assert.throws(() => splitMegumin(v.B.messages), /not a Megumin request as logged in Test 5: no <character_sheet> wrapper/);
    const noThink = request();
    noThink.messages.splice(3, 1);
    assert.throws(() => splitMegumin(noThink.messages), /thinking prompt found 0 times/);
    v.C.messages.at(-2).content += ' changed';
    const d = diffVariants(v, narrator);
    assert.equal(d.ok, false);
    assert.equal(d.checks['B and C differ only in the style message'], false);
});

test('the importable preset: style first, output contract last, no squash, Test 5 samplers, overrides locked, no Megumin text', () => {
    const { preset } = loadNarrator();
    for (const o of preset.prompt_order) {
        const on = o.order.filter((x) => x.enabled).map((x) => x.identifier);
        assert.equal(on[0], 'main');
        assert.deepEqual(on.slice(-2), ['chatHistory', 'jailbreak'], `character ${o.character_id}: the output contract follows the chat history (the engine block is injected at its end)`);
    }
    assert.equal(preset.squash_system_messages, false);
    assert.deepEqual([preset.temperature, preset.top_p, preset.openai_max_tokens, preset.reasoning_effort], [0.9, 0.95, 4096, 'low']);
    for (const id of ['main', 'jailbreak']) assert.equal(preset.prompts.find((p) => p.identifier === id).forbid_overrides, true, `${id}: a card cannot replace it`);
    const text = JSON.stringify(preset);
    assert.doesNotMatch(text, /\[\[|<character_sheet>|<history>|<banlist>|never stop or refuse/);
    assert.match(narrator.output, /exactly one <avereth>\{…\}<\/avereth>.*Nothing after <\/avereth>\.$/);
    assert.ok(narrator.style.length / 4.3 < 500, 'the style layer stays under ~500 tokens');
});

test('reply metrics: one report, its form, text after it; the engine judges the report against the turn\'s state', async () => {
    const reply = (content) => ({ choices: [{ message: { content, reasoning: 'Plan.' }, finish_reason: 'stop' }], usage: { prompt_tokens: 7000, completion_tokens: 300 } });
    const good = replyMetrics(reply('The gate stands open.\n<avereth>{"time":10}</avereth>'));
    assert.deepEqual([good.report, good.reports, good.parsed, good.strictJson, good.trailing, good.words], [true, 1, true, true, false, 4]);
    assert.equal(replyMetrics(reply('A.\n<avereth>{"time":1}</avereth>\nB.\n<avereth>{}</avereth>')).reports, 2);
    assert.equal(replyMetrics(reply('A.\n<avereth>{}</avereth>\nWhat will you do?')).trailing, true);
    const fenced = replyMetrics(reply('A.\n<avereth>```json\n{“time”: 5,}\n```</avereth>'));
    assert.deepEqual([fenced.parsed, fenced.strictJson], [true, false], 'repaired, not strict');
    assert.deepEqual([replyMetrics(reply('Only prose.')).report, replyMetrics(reply('Only prose.')).parsed], [false, false]);
    // the engine's verdict at the gate turn of run 1: coin spent without the player's decision, a subject nobody knows,
    // a new named NPC
    const snapshot = gate.chat;
    const r = JSON.stringify({ time: 10, coin: [{ cp: -10, why: 'bribe' }], new: [{ ref: 'Hobb', name: 'Hobb', kind: 'npc', desc: ['gate sergeant'], band: 'SHORT' }], facts: [{ s: 'gate_warden_x', p: 'occupation', o: 'warden' }] });
    const m = replyMetrics(reply(`The sergeant looks up.\n<avereth>${r}</avereth>`), { snapshot, content });
    assert.equal(m.engine.ownership, 1, m.engine.reasons.join(' | '));
    assert.deepEqual(m.engine.newNamedNpcs, ['Hobb']);
    assert.deepEqual(m.engine.unresolvedSubjects, ['gate_warden_x']);
    assert.equal(snapshot.at(-1).mes, INPUT, 'the snapshot itself is untouched');
});

test('the engine state of a turn comes from the recorded chat and must open like the logged engine block', () => {
    const chats = [{ file: '/x/run1.jsonl', messages: [...gate.chat, ai('The reply the run kept.')] }];
    const s = stateFor(INPUT, gate.engine, chats, content);
    assert.deepEqual([s.source, s.matches, s.identical, s.changed], ['run1.jsonl#4', true, true, []]);
    assert.equal(s.chat.at(-1).mes, INPUT, 'up to the player\'s message');
    // an older engine printed the same state differently: still the state the narrator saw
    const older = gate.engine.replace('End EVERY reply', 'Close with');
    assert.deepEqual([stateFor(INPUT, older, chats, content).matches, stateFor(INPUT, older, chats, content).changed.length], [true, 2]);
    // another turn or another run: never judged against it
    assert.equal(stateFor(INPUT, ENGINE, chats, content).matches, false);
    assert.equal(stateFor('*i go somewhere else*', gate.engine, chats, content), null);
});

test('blind export: per turn and repetition the variants under X/Y/Z in seeded random order; the key maps them back', () => {
    const turns = [{ kind: 'arrival', input: INPUT, pair: { req: request() }, engineBlock: ENGINE }];
    const results = ['A', 'B', 'C'].map((variant) => ({ turn: 0, rep: 0, variant, content: `Reply of ${variant}.\n<avereth>{}</avereth>`, metrics: {} }));
    const a = blindExport(results, turns, 7);
    const b = blindExport(results, turns, 7);
    assert.deepEqual(a.key, b.key, 'same seed, same order');
    assert.deepEqual(Object.keys(a.key['T1-R1']), ['X', 'Y', 'Z']);
    assert.deepEqual(Object.values(a.key['T1-R1']).sort(), ['A', 'B', 'C']);
    for (const [label, variant] of Object.entries(a.key['T1-R1'])) assert.match(a.html, new RegExp(`<h3>${label}</h3><p>Reply of ${variant}\\.</p>`));
    assert.doesNotMatch(a.html, /(?:Variante|variant)\s+[ABC]\b/i, 'no label names its variant');
    const rows = summarize(results.map((r) => ({ ...r, metrics: replyMetrics({ choices: [{ message: { content: r.content } }] }) })));
    assert.deepEqual(rows.map((x) => [x.variant, x.report, x.exactlyOne]), [['A', '100 %', '100 %'], ['B', '100 %', '100 %'], ['C', '100 %', '100 %']]);
});

test('live mode against a local OpenAI-compatible mock: A/B/C sent as built, results, summary, blind export; the key is never written', async () => {
    const seen = [];
    const server = http.createServer(async (req, res) => {
        let body = '';
        for await (const c of req) body += c;
        const j = JSON.parse(body);
        const first = String(j.messages[0].content);
        const variant = first.startsWith('AVERETH NARRATOR') ? 'B' : first.includes('<character_sheet>') ? 'A' : 'C';
        seen.push({ variant, auth: req.headers.authorization, j });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: `Prose of ${variant}.\n<avereth>{"time":5}</avereth>` }, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 20 } }));
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'narrator-ab-'));
    const logOf = (req) => `Chat Completion request: ${util.inspect(req, { depth: 6, maxStringLength: null, maxArrayLength: null })}\nChat Completion response: ${util.inspect({ id: 'x', choices: [{ message: { content: 'old' }, finish_reason: 'stop' }], usage: { prompt_tokens: 12000, completion_tokens: 500 } }, { depth: 6 })}\n`;
    const log = path.join(dir, 'server.log');
    const wrong = path.join(dir, 'other.log');
    const chat = path.join(dir, 'chat.jsonl');
    fs.writeFileSync(log, logOf(request(gate.engine)));
    fs.writeFileSync(wrong, logOf(request(ENGINE)));
    fs.writeFileSync(chat, [{ chat_metadata: {} }, ...gate.chat].map((m) => JSON.stringify(m)).join('\n'));
    assert.equal(selectTurns(parseServerLog(fs.readFileSync(log, 'utf8')).pairs).length, 1);
    const run = (args, env = {}) => new Promise((resolve) => {
        const p = spawn(process.execPath, [path.join(ROOT, 'tools/narrator_ab.mjs'), ...args], { env: { ...process.env, ...env } });
        let text = '';
        p.stdout.on('data', (d) => { text += d; });
        p.stderr.on('data', (d) => { text += d; });
        p.on('exit', (code) => resolve({ code, text }));
    });
    const dry = await run(['--log', log, '--chat', chat, '--dry-run']);
    assert.equal(dry.code, 0, dry.text);
    assert.match(dry.text, /✓ Engine-Zustand aus chat\.jsonl#4: Zug, Zeit und Ort wie im geloggten Block; Block byte-gleich/);
    const bad = await run(['--log', wrong, '--chat', chat, '--dry-run']);
    assert.equal(bad.code, 1, 'a turn whose recorded state does not fit the logged block stops the run');
    assert.match(bad.text, /✗ Engine-Zustand aus chat\.jsonl#4[\s\S]*DRY RUN: FAILED/);
    assert.match((await run(['--log', log, '--dry-run'])).text, /keine Chat-Datei mit diesem Zug \(--chat\), nur Textmetriken[\s\S]*DRY RUN: OK/);
    const out = path.join(dir, 'out');
    const live = await run(['--log', log, '--chat', chat, '--reps', '2', '--out', out, '--seed', '3'], { AVERETH_AB_API_BASE: `http://127.0.0.1:${server.address().port}/v1`, AVERETH_AB_API_KEY: 'secret-test-key-123' });
    server.close();
    assert.equal(live.code, 0, live.text);
    assert.equal(seen.length, 6, '1 turn × 2 repetitions × 3 variants');
    assert.ok(seen.every((s) => s.auth === 'Bearer secret-test-key-123'));
    const params = (j) => JSON.stringify({ ...j, messages: null });
    assert.ok(seen.every((s) => params(s.j) === params(seen[0].j)), 'identical parameters for A, B and C');
    assert.deepEqual(seen.find((s) => s.variant === 'A').j.messages, request(gate.engine).messages, 'A exactly as logged');
    const results = JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8'));
    assert.equal(results.results.length, 6);
    assert.equal(results.turns[0].state, 'chat.jsonl#4');
    assert.ok(results.results.every((r) => r.metrics.report && r.metrics.parsed && r.metrics.engine && r.metrics.engine.accepted >= 1));
    assert.match(fs.readFileSync(path.join(out, 'summary.md'), 'utf8'), /\| A \| 2 \| 0 \| 100 % \| 100 % \|/);
    const key = JSON.parse(fs.readFileSync(path.join(out, 'blind_key.json'), 'utf8'));
    assert.deepEqual(Object.keys(key.key), ['T1-R1', 'T1-R2']);
    for (const f of fs.readdirSync(out)) assert.doesNotMatch(fs.readFileSync(path.join(out, f), 'utf8'), /secret-test-key-123/, `${f} holds no key`);
    fs.rmSync(dir, { recursive: true, force: true });
});

test('the preset file the tool reads is the one in presets/', () => {
    assert.equal(PRESET_FILE, path.join(ROOT, 'presets', 'Avereth Narrator.json'));
});
