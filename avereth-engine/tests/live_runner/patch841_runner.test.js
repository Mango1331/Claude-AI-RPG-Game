// Patch 8.4.1, the runner (docs/PATCH8_4_1_LIVETEST_STABILIZATION.md Teil B), against the first real live test of
// 22.10.2026 05:43 (tests/v4/live_1022c.json, build .29, GLM on Featherless): the player as the player character (short
// actions, speech, commands), his reasoning fields as the game's requests carry them, a reasoning loop answered with a
// shorter request instead of the same one, the turn's outcome (an empty narrator reply is no story turn, a command's
// System answer is no empty reply), the new evaluator checks and findings, the runner's own notices kept from the
// player, and the report. The whole runner on a real SillyTavern with the stub: tools/st_live/live/selftest.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, turnOutcome } from '../../tools/st_live/live/evaluator.mjs';
import { llmPlayer, playerSystemPrompt, screenText, notesText, parseIncludeBody, playerReasoning, PLAYER_ROLE, PLAYER_COMMANDS, LONG_MESSAGE } from '../../tools/st_live/live/players.mjs';
import { loadGuide } from '../../tools/st_live/live/guide.mjs';
import { buildReport } from '../../tools/st_live/live/report.mjs';
import { toastOrigin } from '../../tools/st_live/live/driver.mjs';
import { startStub, EMPTY_MARK } from '../../tools/st_live/live/stub_provider.mjs';
import { roleOf } from '../../tools/st_live/live/calls.mjs';
import { WORLD } from '../../tools/st_live/live/profile.mjs';
import { loadProductContent } from '../helpers.js';
import { Chat4 } from '../v4/harness.js';
import { say } from '../v4/patch8_lib.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fixture = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4', `${f}.json`), 'utf8'));
const run1 = fixture('live_1022c');
const b28 = fixture('live_1022b');
const VIEW = {
    messages: [
        { mesid: 0, user: false, system: false, name: 'Avereth V4', text: 'The ghoul turns its head.' },
        { mesid: 1, user: true, system: false, name: 'Alaric', text: 'I cast Flame Lance at it.' },
        { mesid: 2, user: false, system: false, name: 'Avereth V4', text: 'The lance takes it mid-sit.' },
    ],
    hud: 'Alaric — L2 Mage · HP 61/90 · MP 30/84\nStats: STR 5 · VIT 5 · AGI 5 · INT 7 · PER 5 · WIL 7 · Free Stat Points 5',
    toasts: [],
};
// the game's profile as the importer gives it: custom source, the preset's reasoning_effort, GLM's include body
const IMP = {
    source: 'custom', generation: { reasoning_effort: 'low' },
    connection: { custom_include_body: 'clear_thinking : true\nreasoning_effort : low\ntop_k: 40\nprovider:\n  order: featherless' },
    route: { runner: { source: 'custom', via: 'custom_url', url: 'http://127.0.0.1:5005/v1', model: 'zai-org/GLM-4.6' } },
};
const answer = (content, finish = 'stop', reasoning = null) => ({ ok: true, status: 200, json: async () => ({ model: 'glm-x', choices: [{ message: { content, ...(reasoning ? { reasoning_content: reasoning } : {}) }, finish_reason: finish }], usage: { prompt_tokens: 10, completion_tokens: 3000 } }) });
const decision = (message, extra = {}) => JSON.stringify({ message, milestone: 'fight_won', intent: 'fight', stop: false, stop_reason: null, observations: '', ...extra });

// ------------------------------------------------------------------------------------------------ A1/A2: the player
test('8.4.1 A1/A2: the player is the player character: short actions, speech, combined actions and commands, never story, thoughts or other characters', () => {
    const p = playerSystemPrompt(loadGuide('patch_8_4'), { username: 'Alaric', persona: 'direct and brief' });
    assert.ok(p.startsWith('You are a test player of "Avereth"'));
    assert.match(p, /You are Alaric, the player character: never the narrator, never the game master/);
    assert.match(p, /WHAT YOU KNOW: only what the screen shows you: the narrator's replies, the System panels, the HUD and the notices/);
    // the user's own examples, as they are
    assert.ok(p.includes('I cast Flame Lance at the closest skeleton.'));
    assert.ok(p.includes('"I\'m looking for a dungeon contract suitable for a novice mage. What do you have available?"'));
    assert.ok(p.includes('I examine the doorway for traps. If I find nothing suspicious, I carefully open it.'));
    assert.match(p, /never holds: inner thoughts, reflections or feelings; descriptions of the place, the mood or the scene; what an action does or will do; what other characters say, do or decide; things, skills or successes the screen has not confirmed; out-of-character requests/);
    assert.match(p, /LENGTH: usually one short sentence or one short line of speech/);
    assert.match(p, /Write in English, in the first person\. If an action fails, read the reason and fix the missing condition/);
    assert.match(p, /Not like this: I steady my breathing/);
    // A4: the commands
    assert.match(p, /A command is a message of its own: only the command, nothing else in it/);
    assert.match(p, /spent only with #assign, several stats in one command: #assign WIL 2 INT 2 VIT 1\. Words like "I put two points into INT" change nothing\. Look at the System answer or the HUD afterwards/);
    assert.match(p, /#bag, #equipment[\s\S]*#status[\s\S]*not before every small step\. Use confirmed possessions/);
    // A3: decide quickly; short notes
    assert.match(p, /DECIDE QUICKLY/);
    assert.match(p, /at most two short sentences; \\?"\\?" when nothing new; no thoughts, no repetition/);
    assert.match(p, /YOUR STYLE THIS RUN \(a player's style, never a writer's\): direct and brief/);
    assert.ok(p.includes(PLAYER_ROLE.replace(/\{name\}/g, 'Alaric')) && p.includes(PLAYER_COMMANDS));
    // the four styles of the base guide
    assert.deepEqual(loadGuide('guild_dungeon_loop').personas.map((x) => x.split(':')[0]), ['direct and brief', 'dialogue-oriented', 'tactical and experimental', 'now and then a combined action']);
});

test('8.4.1 A5: the screen gives the newest HUD once, as its own section; earlier turns are notes in short', () => {
    const s = screenText(VIEW);
    assert.match(s, /\[NARRATOR \(Avereth V4\)\]\nThe lance takes it mid-sit\.\n\n\[YOUR CHARACTER AND THE WORLD — the HUD under the newest reply\]\nAlaric — L2 Mage · HP 61\/90[\s\S]*Free Stat Points 5$/);
    assert.equal(s.split('HP 61/90').length, 2, 'once');
    assert.doesNotMatch(screenText({ ...VIEW, hud: null }), /YOUR CHARACTER AND THE WORLD/);
    const notes = Array.from({ length: 9 }, (_, i) => ({ turn: i + 1, message: `step ${i + 1}`, milestone: i < 2 ? 'creation_complete' : i < 5 ? 'guild_registered' : 'board_shown', intent: 'go on', observations: i === 8 ? 'the board shows no numeric cull' : '' }));
    const t = notesText(notes);
    assert.match(t, /^earlier: creation_complete \(turns 1–2\), guild_registered \(turn 3\)\n4\. you wrote: "step 4"/);
    assert.match(t, /9\. you wrote: "step 9" — board_shown: go on — noted: the board shows no numeric cull$/);
    assert.equal(t.split('\n').length, 7);
});

// ------------------------------------------------------------------------------------------------ A3: reasoning
test('8.4.1 A3: the include body read as SillyTavern keeps it; only the reasoning fields of it, only for the game\'s endpoint and model', () => {
    assert.deepEqual(parseIncludeBody('clear_thinking : true\nreasoning_effort : low'), { clear_thinking: true, reasoning_effort: 'low' });
    assert.deepEqual(parseIncludeBody('# note\nthinking:\n  type: disabled\ntop_k: 40\nname: "x y"'), { thinking: { type: 'disabled' }, top_k: 40, name: 'x y' });
    assert.deepEqual(parseIncludeBody(''), {});
    const r = playerReasoning(IMP, {});
    assert.deepEqual(r.body, { reasoning_effort: 'low', clear_thinking: true }, 'top_k and provider are no reasoning fields');
    assert.equal(r.source, 'profile');
    assert.deepEqual(playerReasoning(IMP, { url: IMP.route.runner.url, model: IMP.route.runner.model }).body, r.body, 'the same endpoint named again');
    // another endpoint or model: nothing sent blind
    for (const other of [{ model: 'meta-llama/Llama-3.3-70B' }, { url: 'https://api.other.test/v1' }]) {
        const x = playerReasoning(IMP, other);
        assert.deepEqual([x.body, x.source], [{}, 'none']);
        assert.match(x.note, /another endpoint or model/);
    }
    assert.deepEqual(playerReasoning(IMP, { reasoning: 'none' }).body, {});
    assert.deepEqual(playerReasoning(IMP, { reasoning: { thinking: { type: 'disabled' } } }), { body: { thinking: { type: 'disabled' } }, source: 'config', keys: ['thinking'], note: 'player.reasoning in live.config.json' });
    // the preset's reasoning_effort is what the custom source sends; another source or "auto" sends none of it
    assert.deepEqual(playerReasoning({ ...IMP, source: 'openai', connection: {} }, {}).body, {});
    assert.deepEqual(playerReasoning({ ...IMP, generation: { reasoning_effort: 'auto' }, connection: {} }, {}).body, {});
    assert.ok(!JSON.stringify(playerReasoning({ ...IMP, connection: { custom_include_body: 'api_key: SECRET\nreasoning_effort: low' } }, {})).includes('SECRET'));
});

test('8.4.1 A3: the player\'s requests carry the reasoning fields and its 3,000 tokens; a reasoning loop gets a shorter, cooler request, never the same one again', async () => {
    const sent = [];
    const answers = [answer('', 'length', 'x'.repeat(11000)), answer('', 'length', 'y'.repeat(9000)), answer(`Here:\n${decision('I cast Flame Lance at the ghoul.')}`)];
    const log = [];
    const p = llmPlayer({ guide: loadGuide('patch_8_4'), username: 'Alaric', url: 'http://127.0.0.1:5005/v1', model: 'zai-org/GLM-4.6', key: 'K', body: { reasoning_effort: 'low', clear_thinking: true }, record: (e) => log.push(e), fetchImpl: async (u, init) => { sent.push(JSON.parse(init.body)); return answers.shift(); } });
    // a screen as long as a fight's: six replies of story before the newest
    const long = { ...VIEW, messages: [...Array.from({ length: 6 }, (_, i) => ({ mesid: i, user: i % 2 === 1, system: false, name: 'x', text: `${'The catacomb air is cold. '.repeat(40)}${i}` })), ...VIEW.messages] };
    const d = await p.decide(long, { turn: 18, maxTurns: 40 });
    assert.equal(d.message, 'I cast Flame Lance at the ghoul.');
    assert.equal(sent.length, 3);
    assert.ok(sent.every((b) => b.reasoning_effort === 'low' && b.clear_thinking === true && b.max_tokens === 3000 && b.stream === false));
    assert.deepEqual(log.map((e) => [e.strategy, e.cause]), [['full', 'reasoning_exhausted'], ['short', 'reasoning_exhausted'], ['minimal', null]]);
    assert.deepEqual(sent.map((b) => b.temperature), [0.8, 0.4, 0.2]);
    const userText = sent.map((b) => b.messages.at(-1).content);
    assert.equal(new Set(userText).size, 3, 'three different requests');
    assert.ok(userText[1].length < userText[0].length && userText[2].length < userText[1].length);
    assert.match(userText[1], /Answer at once with the JSON object: no deliberation[\s\S]*YOUR MILESTONE NOW: creation_complete/);
    assert.match(userText[2], /HP 61\/90/, 'the HUD stays in the smallest prompt');
    assert.deepEqual(log.map((e) => e.reasoning_chars), [11000, 9000, 0]);
    // in all three: a harness stop with its cause, no fourth request
    const loop = [];
    const q = llmPlayer({ guide: loadGuide('patch_8_4'), username: 'Alaric', url: 'http://x/v1', model: 'm', key: 'k', fetchImpl: async (u, init) => { loop.push(init.body); return answer('', 'length', 'z'.repeat(12000)); } });
    const stop = await q.decide(VIEW, { turn: 5, maxTurns: 40 });
    assert.equal(loop.length, 3);
    assert.equal(new Set(loop).size, 3);
    assert.deepEqual([stop.stop, stop.harness, stop.causes], [true, true, ['reasoning_exhausted', 'reasoning_exhausted', 'reasoning_exhausted']]);
    assert.match(stop.stop_reason, /player failure: the model spent its whole budget \(3000 tokens\) on reasoning in all 3 attempts/);
});

test('8.4.1 A2: a story instead of a turn is asked for once in short; a long command is no story', async () => {
    const story = `I steady my breathing, remembering everything. ${'My fingers tighten around my staff as the dark presses in. '.repeat(12)}`;
    assert.ok(story.length > LONG_MESSAGE);
    const sent = [];
    const answers = [answer(decision(story)), answer(decision('I cast Flame Lance at the ghoul.'))];
    const log = [];
    const p = llmPlayer({ guide: loadGuide('patch_8_4'), username: 'Alaric', url: 'http://x/v1', model: 'm', key: 'k', record: (e) => log.push(e), fetchImpl: async (u, init) => { sent.push(JSON.parse(init.body)); return answers.shift(); } });
    assert.equal((await p.decide(VIEW, { turn: 3, maxTurns: 40 })).message, 'I cast Flame Lance at the ghoul.');
    assert.deepEqual(log.map((e) => [e.strategy, e.cause]), [['full', 'long_message'], ['shorten', null]]);
    assert.match(sent[1].messages.at(-1).content, /characters of story, not a player's turn\. Write only what Alaric does or says now, usually one short sentence/);
    assert.equal(p.notes.at(-1).message, 'I cast Flame Lance at the ghoul.');
    const cmd = `#assign ${'INT 1 '.repeat(120)}`.trim();
    const q = llmPlayer({ guide: loadGuide('patch_8_4'), username: 'Alaric', url: 'http://x/v1', model: 'm', key: 'k', fetchImpl: async () => answer(decision(cmd)) });
    assert.equal((await q.decide(VIEW, { turn: 4, maxTurns: 40 })).message, cmd);
});

// ------------------------------------------------------------------------------------------------ B1: the outcome
test('8.4.1 B1: the turns of the live test: creation is the engine\'s, turns 17 and 18 had an empty narrator reply; a #assign is a System turn', () => {
    const kinds = (chat) => chat.map((m, i) => (m.is_user ? turnOutcome(chat, i).kind : null)).filter(Boolean);
    const k = kinds(run1.messages);
    assert.deepEqual(k.slice(0, 2), ['engine', 'engine']);
    assert.deepEqual(k.map((x, i) => (x === 'narrator_empty' ? i + 1 : null)).filter(Boolean), [17, 18]);
    assert.ok(k.slice(2).every((x) => x === 'story' || x === 'narrator_empty'));
    assert.equal(turnOutcome(run1.messages, 33).at, 34);
    const kb = kinds(b28.messages);
    assert.equal(kb[14], 'system', '#assign int 5');
    assert.equal(b28.messages[29].mes, '#assign int 5');
    assert.equal(kb[12], 'engine', 'the planner asked back');
    assert.ok(!kb.includes('narrator_empty'));
    // a reply without text is empty whatever its record says; no reply at all is missing
    const chat = [{ is_user: true, mes: '*I look around*' }, { is_user: false, mes: '   ' }];
    assert.equal(turnOutcome(chat, 0).kind, 'narrator_empty');
    assert.equal(turnOutcome([{ is_user: true, mes: '*I look around*' }], 0).kind, 'missing');
    assert.deepEqual(turnOutcome([{ is_user: true, mes: '#status' }, { is_user: false, is_system: true, mes: '[SYSTEM // STATUS]' }], 0), { kind: 'system', at: 1, reason: null });
});

test('8.4.1 B1: the stub gives an empty narrator reply where the player\'s message carries the marker, and keeps what steered each call', async () => {
    const stub = await startStub({ key: 'K', delayMs: 0 });
    try {
        const post = async (body) => (await fetch(`${stub.url}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer K' }, body: JSON.stringify(body) })).json();
        const narrator = (text) => ({ model: 'stub-model', messages: [{ role: 'system', content: 'contract' }, { role: 'system', content: '[AVERETH ENGINE — TURN]' }, { role: 'user', content: text }], reasoning_effort: 'low', clear_thinking: true });
        const empty = await post(narrator(`*I look around* ${EMPTY_MARK}`));
        assert.deepEqual([empty.choices[0].message.content, empty.choices[0].finish_reason], ['', 'length']);
        assert.ok(empty.choices[0].message.reasoning_content);
        const told = await post(narrator('*I look around*'));
        assert.match(told.choices[0].message.content, /Stub narrator/);
        assert.equal(roleOf(narrator('x')), 'narrator');
        assert.deepEqual(stub.calls.map((c) => [c.role, c.auth, c.steer]), [['narrator', 'key', { reasoning_effort: 'low', clear_thinking: true }], ['narrator', 'key', { reasoning_effort: 'low', clear_thinking: true }]]);
    } finally { await stub.close(); }
});

// ------------------------------------------------------------------------------------------------ B2: notices
test('8.4.1 B2: a notice inside the runner\'s own action (the chat rename and its tail) is the runner\'s, every other one the game\'s', () => {
    const spans = [{ what: 'chat rename', from: 1000, to: 2500 }, { what: 'open', from: 9000, to: null }];
    assert.equal(toastOrigin({ at: 1200, text: 'Chat renamed' }, spans), 'runner');
    assert.equal(toastOrigin({ at: 2500, text: 'Chat renamed' }, spans), 'runner');
    assert.equal(toastOrigin({ at: 2600, text: 'the narrator contract is outdated' }, spans), 'game', 'a real warning after the span stays');
    assert.equal(toastOrigin({ at: 9500 }, spans, 10000), 'runner', 'an open span runs to now');
    assert.equal(toastOrigin({ at: 500 }, []), 'game');
});

// ------------------------------------------------------------------------------------------------ B5, D: the evaluation
test('8.4.1 B5: the live test\'s findings for review: the unslotted robed thing (#32) and the stat points in words (#37); no numeric cull, no open group attack reached', () => {
    const ev = evaluate(run1.messages, { guide: loadGuide('patch_8_4') });
    const found = ev.issues.filter((i) => ['stat_words', 'unslotted_dungeon_creature', 'dungeon_foe_refused', 'cull_count'].includes(i.kind)).map((i) => [i.at, i.turn, i.kind]);
    assert.deepEqual(found, [[32, 16, 'unslotted_dungeon_creature'], [37, 19, 'stat_words']]);
    assert.match(ev.issues.find((i) => i.kind === 'unslotted_dungeon_creature').text, /robed waiting thing .* came into Old Crown Catacombs without an encounter of the engine/);
    assert.ok(ev.issues.filter((i) => i.kind === 'empty_reply').map((i) => i.turn).every((t) => [17, 18].includes(t)));
    assert.equal(ev.reached.numeric_cull_active, undefined, 'its contract named no count (a clear contract)');
    assert.equal(ev.reached.open_group_attack, undefined);
    assert.deepEqual(ev.milestones.filter((m) => m.reached).map((m) => m.id), ['creation_complete', 'guild_registered', 'board_shown', 'inside_dungeon', 'fight_won']);
    // a #assign after the level-up is no finding
    const assigned = structuredClone(run1.messages.slice(0, 37));
    assigned.push({ ...structuredClone(run1.messages[37]), mes: '#assign WIL 2 INT 2 VIT 1' });
    assert.ok(!evaluate(assigned).issues.some((i) => i.kind === 'stat_words'));
});

test('8.4.1 D: the .28 run: its numeric cull (4) reached at #13 with the count its texts disagree on; its group stayed out, so no open group attack', () => {
    const ev = evaluate(b28.messages, { guide: loadGuide('patch_8_4') });
    assert.deepEqual(ev.reached.numeric_cull_active, { at: 13, turn: 7, quest: 'quest.cull_the_crystal_beetles_of_the_outer_grottos', title: 'Cull the Crystal Beetles of the Outer Grottos', count: 4, dungeon: 'loc.glimmerdeep_grotto' });
    assert.deepEqual(ev.issues.filter((i) => i.kind === 'cull_count').map((i) => i.text), ['Cull the Crystal Beetles of the Outer Grottos: its objective counts 4, its texts say 4, 6 (for review)']);
    assert.equal(ev.reached.open_group_attack, undefined);
    assert.equal(ev.issues.filter((i) => i.kind === 'group_stayed_out').length, 3);
});

test('8.4.1 D: the same open Flame Lance at an unaware beetle on this build: the whole group fights, the open group attack is reached', async () => {
    const content = await loadProductContent();
    const g = new Chat4(content);
    g.chat = b28.messages.slice(0, 19).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    const D = 'mon.glimmerdeep_grotto_c1_l1_e1_4';
    await say(g, '*i flame Lance Beetle D', { type: 'use_skill', skill: 'mage.flame_lance', target: D, quote: 'i flame Lance Beetle D' });
    const ev = evaluate(g.chat, { guide: loadGuide('patch_8_4') });
    assert.deepEqual(ev.reached.open_group_attack, { at: 19, turn: 10, foes: 4, unaware: 4 });
    assert.deepEqual(ev.encounters.at(-1).stayedOut, []);
    assert.ok(!ev.issues.some((i) => i.kind === 'group_stayed_out' && i.at === 19));
});

// ------------------------------------------------------------------------------------------------ the report
test('8.4.1 the report: the player\'s effective reasoning fields, each turn\'s answer, observations about the turn before, the empty-narrator end, the player\'s causes, runner notices apart', () => {
    const guide = loadGuide('patch_8_4');
    const ev = evaluate(run1.messages.slice(0, 35), { guide });
    const turnsLog = [[1, 'engine'], [2, 'engine'], [3, 'story'], [16, 'story'], [17, 'narrator_empty']].map(([turn, outcome]) => ({ turn, text: `turn ${turn}`, ok: true, ms: 1000, outcome, decision: { milestone: 'fight_won', intent: 'x' } }));
    const playerLog = [
        { turn: 1, about_turn: 0, strategy: 'full', cause: null, decision: { observations: 'the greeting shows the creation menu' } },
        { turn: 3, about_turn: 2, strategy: 'full', cause: 'reasoning_exhausted', decision: null },
        { turn: 3, about_turn: 2, strategy: 'short', cause: null, decision: { observations: 'the skills are in the HUD' } },
        { turn: 17, about_turn: 16, strategy: 'full', cause: 'reasoning_exhausted', decision: null },
        { turn: 17, about_turn: 16, strategy: 'short', cause: null, decision: { observations: 'a robed thing came that no DUNGEON line named' } },
    ];
    const r = buildReport({
        runId: 'r', stub: false, guide, player: { type: 'llm', model: 'zai-org/GLM-4.6', endpoint: '127.0.0.1:5005', temperature: 0.8, persona: 'direct and brief' },
        end: { kind: 'narrator_empty', why: 'turn 17: the narrator\'s reply has no story text (message 34) — the narrator call ended with finish_reason "length" after 4096 completion tokens (max 4096), 17000 characters of reasoning, 0 of text', turn: 17 },
        ev, calls: [], setup: { source: 'custom', card: 'Avereth V4', world: WORLD, greeting: 'profile', model: 'zai-org/GLM-4.6', host: '127.0.0.1:5005' },
        imp: { preset: { name: 'P', mode: 'profile', unsaved: [], vsRepo: [] }, generation: {}, streaming: false, card: null, world: null, engineSettings: null, dropped: [], warnings: [], read: [] },
        git: { commit: 'abc', branch: 'b', dirty: [] }, build: '4.3.0-c.6.6.30', st: { version: '1.19.0', dir: '/st', port: 8123, startMs: 1000 }, browser: { name: 'chrome', version: '1', headless: true },
        turnsLog, playerLog, driverNotes: [], pageErrors: [], serverErrors: [], scan: { files: 3, hits: [] }, files: [], startedAt: 0, endedAt: 60000,
        toasts: [{ kind: 'success', text: 'Chat renamed', origin: 'runner' }, { kind: 'warning', text: 'the narrator contract is outdated', origin: 'game' }],
        protection: { unchanged: true, changedRead: [], tree: { same: true, added: [], removed: [], changed: [] }, files: 10 },
        playerSetup: { reasoning: { body: { reasoning_effort: 'low', clear_thinking: true }, keys: ['reasoning_effort', 'clear_thinking'], source: 'profile', note: 'as the game\'s own requests carry them' }, probe: { ok: true, finish: 'stop', reasoningChars: 120 }, dropped: null }, playerMaxTokens: 3000,
    });
    assert.match(r, /- \*\*Ergebnis:\*\* abgebrochen: leere Erzählerantwort in einem Story-Zug \(kein Swipe, kein Regenerieren\) — turn 17: .*finish_reason "length" after 4096 completion tokens/);
    assert.match(r, /\| Spieler-Reasoning \(wirksam\) \| `reasoning_effort`="low", `clear_thinking`=true — as the game's own requests carry them · Probe: angenommen \(finish stop, Reasoning 120 Zeichen\) · max\. 3000 Tokens \|/);
    assert.match(r, /\| 1 \| turn 1 \| Engine \(Menü\/Rückfrage\) \|/);
    assert.match(r, /\| 3 \| turn 3 \| Erzähler \|/);
    assert.match(r, /\| 17 \| turn 17 \| \*\*leer\*\* \|/);
    assert.match(r, /- zum Start \(notiert vor Zug 1\): the greeting shows the creation menu/);
    assert.match(r, /- zu Zug 2 \(notiert vor Zug 3\): the skills are in the HUD/);
    assert.match(r, /- zu Zug 16 \(notiert vor Zug 17\): a robed thing came that no DUNGEON line named/);
    assert.match(r, /Spieler: 2× Reasoning verbrauchte das ganze Tokenbudget ohne Antwort \(finish_reason length\) \(Züge 3, 17\)/);
    assert.match(r, /Hinweis \(warning\): the narrator contract is outdated/);
    assert.match(r, /Runner-Hinweis \(dem Spieler nicht gezeigt\): Chat renamed/);
    assert.doesNotMatch(r, /Hinweis \(success\): Chat renamed/);
    assert.match(r, /\(unslotted_dungeon_creature\): robed waiting thing/);
});

test('8.4.1 the patch 8.4 guide: a numeric cull (a clear contract does not count, the board read again after its renewal), the open attack on an unaware group, the stat points by #assign nowhere in its goals', () => {
    const g = loadGuide('patch_8_4');
    const cull = g.milestones.find((m) => m.id === 'numeric_cull_active');
    assert.match(cull.goal, /names how many foes to defeat[\s\S]*A contract that only says to clear a level does not count[\s\S]*rest until the next morning/);
    assert.match(g.milestones.find((m) => m.id === 'open_group_attack').goal, /has not noticed you and attack one of them openly, without sneaking or hiding first/);
    assert.ok(!g.milestones.some((m) => /#\w+/.test(m.goal)), 'the guide names goals, never commands');
    assert.match(g.title, /4\.3\.0-c\.6\.6\.30/);
});
