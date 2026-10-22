// The live runner's parts (docs/LIVE_RUNNER.md), without SillyTavern, a browser or a model: the evaluation against the
// live test of 22.10.2026 03:42 (tests/v4/live_1022b.json, build .28), the server log's calls, the key scan and the
// write guard, the read-only import from a fake profile, the players and the guides. The whole runner on a real
// SillyTavern with a stub provider: tools/st_live/live/selftest.mjs (npm run live:st:selftest).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, finished, nextMilestone, CHECKS } from '../../tools/st_live/live/evaluator.mjs';
import { parseCalls, roleOf, callStats } from '../../tools/st_live/live/calls.mjs';
import { secretScan, readChatJsonl, eventsLog } from '../../tools/st_live/live/export.mjs';
import { Guard, isInside, Reader, changedSince, treeStat, treeDiff, yamlTop } from '../../tools/st_live/live/lib.mjs';
import { importProfile, readCard, PRESET_TO_SETTINGS } from '../../tools/st_live/live/import_profile.mjs';
import { cardPng, CONTRACT_FILE, WORLD, WORLD_FILE } from '../../tools/st_live/live/profile.mjs';
import { parseDecision, screenText, scriptedPlayer, llmPlayer, playerSystemPrompt } from '../../tools/st_live/live/players.mjs';
import { loadGuide, listGuides, guideErrors } from '../../tools/st_live/live/guide.mjs';
import { options, runsDirFor } from '../../tools/st_live/live/run_live.mjs';
import { buildReport } from '../../tools/st_live/live/report.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1022b.json'), 'utf8'));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-lr-test-'));

// ------------------------------------------------------------------------------------------------ evaluation
test('evaluation of the .28 live run: the guide\'s milestones where the run reached them', () => {
    const guide = loadGuide('guild_dungeon_loop');
    const ev = evaluate(fx.messages, { guide });
    const at = Object.fromEntries(ev.milestones.map((m) => [m.id, m.reached ? m.at : null]));
    assert.deepEqual(at, {
        creation_complete: 3, guild_registered: 9, board_shown: 11, dungeon_quest_active: 13, inside_dungeon: 18,
        fight_won: 19, quest_ready: 28, guardian_defeated: null, floor_cleared: null, quest_completed: 34,
    });
    assert.equal(finished(ev), true);
    assert.equal(nextMilestone(ev), null);
    assert.equal(ev.defeat, null);
    assert.equal(ev.reached.inside_dungeon.floor, 1, 'the gallery is level 1, the gate level 0 (Patch 8.3)');
    assert.equal(ev.reached.returned_to_guild.at, 34);
    const q = ev.quests.find((x) => x.statuses.length);
    assert.equal(q.title, 'Cull the Crystal Beetles of the Outer Grottos');
    assert.deepEqual(q.statuses.map((s) => s.to), ['active', 'completed']);
    assert.equal(q.dungeon, 'loc.glimmerdeep_grotto');
});

test('evaluation of the .28 live run: the group that stayed out of four single fights (the Patch 8.4 failure)', () => {
    const ev = evaluate(fx.messages);
    assert.deepEqual(ev.encounters.map((e) => [e.foes.length, e.stayedOut.length, e.concealed]), [[1, 3, false], [1, 2, false], [1, 1, false], [1, 0, false]]);
    assert.equal(ev.issues.filter((i) => i.kind === 'group_stayed_out').length, 3);
    assert.ok(ev.encounters.every((e) => e.ended != null && !e.pcDead && e.defeated.length === 1));
    assert.equal(ev.reached.group_fight, undefined, 'no fight had two foes at once');
    assert.deepEqual(Object.values(ev.encounters[0].awareness), ['unaware', 'unaware', 'unaware']);
});

test('evaluation: the turns carry the player\'s input, the place and the record\'s times', () => {
    const ev = evaluate(fx.messages);
    assert.equal(ev.turns.length, fx.messages.filter((m) => m.is_user).length);
    const t = ev.turns.find((x) => x.input === '*i enter the gate*');
    assert.equal(t.place, 'loc.glimmerdeep_grotto.crystal_gallery');
    assert.match(t.placeName, /Crystal Gallery/);
    assert.ok(Number.isFinite(t.perf.plan) && Number.isFinite(t.perf.narrator) && Number.isFinite(t.perf.extract));
    assert.equal(ev.counts.rejected.engine_owned_fact, 2);
});

test('evaluation: a death ends a run as a defeat', () => {
    const chat = structuredClone(fx.messages.slice(0, 20));
    const ended = chat[19].extra.avereth.events.find((e) => e.t === 'encounter.ended');
    ended.d.summary.pc_dead = true;
    const ev = evaluate(chat);
    assert.equal(ev.defeat.at, 19);
    assert.equal(ev.reached.fight_won, undefined);
});

test('every evaluator check has its text, and every shipped guide is valid', () => {
    assert.ok(Object.values(CHECKS).every((t) => typeof t === 'string' && t.length > 10));
    assert.deepEqual(listGuides().sort(), ['current_test', 'guild_dungeon_loop', 'patch_8_4', 'patch_8_dungeon_full']);
    for (const id of listGuides()) assert.doesNotThrow(() => loadGuide(id), id);
});

// ------------------------------------------------------------------------------------------------ guides
test('guides: a patch guide extends the base one; a wrong check is refused', () => {
    const g = loadGuide('patch_8_4');
    const base = loadGuide('guild_dungeon_loop');
    assert.deepEqual(g.chain, ['guild_dungeon_loop', 'patch_8_4']);
    // Patch 8.4.1: its own milestones, the numeric cull and the open attack on an unaware group among them
    assert.deepEqual(g.milestones.map((m) => [m.id, m.required !== false]), [['creation_complete', true], ['guild_registered', true], ['board_shown', true], ['numeric_cull_active', true], ['inside_dungeon', false], ['open_group_attack', true], ['fight_won', true], ['quest_ready', true], ['quest_completed', true]]);
    assert.notDeepEqual(g.milestones, base.milestones);
    assert.equal(g.focus.length, base.focus.length + 3);
    assert.ok(g.brief.includes('see whether the whole group fights') && g.brief.endsWith('does not count for this test.'));
    assert.deepEqual(g.scripted, base.scripted);
    assert.deepEqual(g.personas, base.personas);
    assert.match(guideErrors({ id: 'x', brief: 'b', milestones: [{ id: 'y', goal: 'g', check: 'teleported' }] }).join(), /no evaluator check "teleported"/);
    assert.match(guideErrors({ id: 'x', brief: 'b', milestones: [{ id: 'board_shown', goal: 'g', required: false }] }).join(), /no required milestone/);
    const dir = tmp();
    fs.writeFileSync(path.join(dir, 'loop.json'), JSON.stringify({ id: 'loop', extends: 'loop', brief: 'b', milestones: [{ id: 'board_shown', goal: 'g' }] }));
    assert.throws(() => loadGuide('loop', { dir }), /extends itself/);
});

// ------------------------------------------------------------------------------------------------ calls
const LOG = [
    'SillyTavern 1.19.0',
    "Chat Completion request: {",
    "  messages: [",
    "    { role: 'system', content: 'You are the intent planner of the Avereth engine. You read one PLAYER MESSAGE' },",
    "    { role: 'user', content: 'PLAYER MESSAGE:\\nI cast Flame Lance' }",
    '  ],',
    "  model: 'glm-x',",
    '  temperature: 0.1,',
    '  max_tokens: 900,',
    '  stream: false',
    '}',
    "Chat Completion response: {",
    "  id: 'r1',",
    "  model: 'glm-x',",
    "  choices: [ { index: 0, message: { role: 'assistant', content: '{\"commands\":[]}' }, finish_reason: 'stop' } ],",
    '  usage: { prompt_tokens: 1200, completion_tokens: 40, prompt_tokens_details: { cached_tokens: 1000 }, completion_tokens_details: { reasoning_tokens: 12 } }',
    '}',
    "Chat Completion request: {",
    "  messages: [",
    "    { role: 'system', content: 'You are the intent planner of the Avereth engine.' },",
    "    { role: 'user', content: 'PLAYER MESSAGE:\\nI cast Flame Lance' },",
    "    { role: 'assistant', content: 'not json' },",
    "    { role: 'user', content: 'That answer was not valid' }",
    '  ],',
    "  model: 'glm-x', max_tokens: 900, stream: false",
    '}',
    "Chat Completion response: {",
    "  id: 'r1',",
    "  choices: [ { index: 0, message: { role: 'assistant', content: '{}' }, finish_reason: 'stop' } ]",
    '}',
    "Chat Completion request: {",
    "  messages: [ { role: 'system', content: 'contract' }, { role: 'system', content: '[AVERETH ENGINE — TURN]\\nthe block' }, { role: 'user', content: 'I cast Flame Lance' } ],",
    "  model: 'glm-x', max_tokens: 4096, stream: false, reasoning_effort: 'low'",
    '}',
    "Chat Completion response: {",
    "  id: 'r3',",
    "  choices: [ { index: 0, message: { role: 'assistant', content: '', reasoning_content: 'thinking a lot' }, finish_reason: 'length' } ],",
    '  usage: { prompt_tokens: 30000, completion_tokens: 4096 }',
    '}',
].join('\n');

test('calls: the server log\'s requests with their replies, roles, times, tokens and repairs', () => {
    const markers = [{ kind: 'request', at: 1000 }, { kind: 'response', at: 3500 }, { kind: 'request', at: 3600 }, { kind: 'response', at: 4000 }, { kind: 'request', at: 4100 }, { kind: 'response', at: 64100 }];
    const { calls, errors } = parseCalls(LOG, markers, [{ turn: 1, at: 900 }, { turn: 2, at: 4050 }]);
    assert.deepEqual(errors, []);
    assert.deepEqual(calls.map((c) => [c.role, c.repair, c.ms, c.turn]), [['plan', false, 2500, 1], ['plan', true, 400, 1], ['narrator', false, 60000, 2]]);
    assert.deepEqual([calls[0].prompt_tokens, calls[0].cached_tokens, calls[0].completion_tokens, calls[0].reasoning_tokens, calls[0].finish], [1200, 1000, 40, 12, 'stop']);
    assert.equal(calls[1].repeatOf, 1, 'the same reply id handed back again');
    assert.equal(calls[2].empty, true);
    assert.equal(calls[2].finish, 'length');
    assert.equal(calls[2].reasoning_chars, 'thinking a lot'.length);
    assert.equal(calls[2].reasoning_effort, 'low');
    const st = callStats(calls);
    assert.equal(st.plan.n, 2);
    assert.equal(st.plan.repairs, 1);
    assert.equal(st.narrator.empty, 1);
    // without markers: the same calls, no times
    assert.deepEqual(parseCalls(LOG).calls.map((c) => c.ms), [null, null, null]);
});

test('calls: the role of every engine prompt', () => {
    const sys = (content, extra = {}) => ({ messages: [{ role: 'system', content }], ...extra });
    assert.equal(roleOf(sys('You are the command interpreter of a text RPG engine.')), 'interpret');
    assert.equal(roleOf(sys('You are the command interpreter … Actions with skills, in fights and on things …')), 'plan');
    assert.equal(roleOf(sys('You read one reply of a text RPG narrator')), 'extract');
    assert.equal(roleOf(sys("You write the official contracts on an Adventurers' Guild board in a sandbox")), 'board');
    assert.equal(roleOf(sys('Write the next reply.')), 'other');
    assert.equal(roleOf(sys('Write the next reply.', { max_tokens: 2500 })), 'extract');
});

// ------------------------------------------------------------------------------------------------ keys and the guard
test('the key scan finds and blanks a key, a bearer token and an api_key field; a clean folder stays as it is', () => {
    const dir = tmp();
    const g = new Guard([dir]);
    g.write(path.join(dir, 'a.json'), JSON.stringify({ note: 'sent with my-very-secret-key-123', api_key_custom: 'abcdefghijkl' }));
    g.write(path.join(dir, 'sub', 'b.log'), 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123\nok');
    g.write(path.join(dir, 'c.md'), 'nothing here');
    g.write(path.join(dir, 'd.png'), 'my-very-secret-key-123'); // not a text file: not scanned
    const scan = secretScan(dir, ['my-very-secret-key-123'], g);
    assert.equal(scan.files, 3);
    assert.deepEqual(scan.hits.map((h) => [h.file.replace(/\\/g, '/'), h.what]).sort(), [['a.json', 'api_key_field'], ['a.json', 'secret #1'], ['sub/b.log', 'bearer']]);
    assert.ok(!fs.readFileSync(path.join(dir, 'a.json'), 'utf8').includes('my-very-secret-key-123'));
    assert.ok(!fs.readFileSync(path.join(dir, 'sub', 'b.log'), 'utf8').includes('abcdefghijklmnop'));
    assert.deepEqual(secretScan(dir, ['my-very-secret-key-123'], g).hits, []);
});

test('the write guard: nothing outside its roots, nothing in a protected folder', () => {
    const dir = tmp();
    const g = new Guard([path.join(dir, 'run')], { forbidden: [path.join(dir, 'SillyTavern')] });
    assert.throws(() => g.write(path.join(dir, 'elsewhere.txt'), 'x'), /outside the runner's folders/);
    assert.throws(() => g.write(path.join(dir, 'run', '..', 'escape.txt'), 'x'), /outside/);
    assert.ok(fs.existsSync(g.write(path.join(dir, 'run', 'ok.txt'), 'x')));
    assert.throws(() => new Guard([path.join(dir, 'SillyTavern', 'data', 'runs')], { forbidden: [path.join(dir, 'SillyTavern')] }), /overlaps a protected folder/);
    assert.ok(isInside(dir, path.join(dir, 'a', 'b')) && !isInside(path.join(dir, 'a'), dir));
    assert.equal(yamlTop('port: 8000\ndataRoot: ./data # where\n', 'dataRoot'), './data');
});

// ------------------------------------------------------------------------------------------------ the import
function fakeProfile({ source = 'custom', url = 'https://api.example.test/v1', headers = '', cards = true, temp = 0.9 } = {}) {
    const st = tmp();
    fs.writeFileSync(path.join(st, 'server.js'), '// not SillyTavern');
    fs.writeFileSync(path.join(st, 'package.json'), JSON.stringify({ version: '1.19.0' }));
    fs.writeFileSync(path.join(st, 'config.yaml'), 'dataRoot: ./mydata\nport: 8000\n');
    const user = path.join(st, 'mydata', 'default-user');
    for (const d of ['characters', 'worlds', 'OpenAI Settings', 'chats/Avereth V4']) fs.mkdirSync(path.join(user, d), { recursive: true });
    const preset = JSON.parse(fs.readFileSync(path.join(ROOT, 'presets', 'Avereth Narrator V4.json'), 'utf8'));
    const oai = { ...Object.fromEntries(Object.entries(preset).map(([k, v]) => [PRESET_TO_SETTINGS[k] || k, v])), temp_openai: temp, chat_completion_source: source, custom_url: url, custom_model: 'glm-x', custom_include_headers: headers, preset_settings_openai: 'Avereth Narrator V4', proxy_password: 'hunter2-proxy', zai_model: 'glm-z' };
    fs.writeFileSync(path.join(user, 'settings.json'), JSON.stringify({ username: 'Alaric', main_api: 'openai', oai_settings: oai, extension_settings: { avereth: { hud: 'open' } } }));
    fs.copyFileSync(path.join(ROOT, 'presets', 'Avereth Narrator V4.json'), path.join(user, 'OpenAI Settings', 'Avereth Narrator V4.json'));
    if (cards) {
        const contract = fs.readFileSync(CONTRACT_FILE, 'utf8');
        fs.writeFileSync(path.join(user, 'characters', 'Avereth V4.png'), cardPng({ name: 'Avereth V4', description: contract, first_mes: 'Location: Public roadside verge outside Ashbridge, Somewhere', world: WORLD }));
        fs.writeFileSync(path.join(user, 'characters', 'Avereth Old.png'), cardPng({ name: 'Avereth Old', description: 'AVERETH RPG — SANDBOX NARRATOR CONTRACT\nContract revision: 3.3.0\n', first_mes: 'old', world: null }));
        fs.writeFileSync(path.join(user, 'characters', 'Other.png'), cardPng({ name: 'Other', description: 'x', first_mes: 'y', world: null }));
    }
    fs.copyFileSync(WORLD_FILE, path.join(user, 'worlds', `${WORLD}.json`));
    fs.writeFileSync(path.join(user, 'secrets.json'), JSON.stringify({ api_key_custom: [{ value: 'PERSONAL-KEY' }] }));
    fs.writeFileSync(path.join(user, 'chats', 'Avereth V4', 'mine.jsonl'), '{}\n');
    return { st, user };
}

test('the import reads selectively and only reads: no secrets, no chats, no other card; the profile stays as it was', () => {
    const { st, user } = fakeProfile({ headers: 'Authorization: Bearer PERSONAL-KEY', temp: 0.7 });
    const before = treeStat(st);
    const imp = importProfile({ stDir: st });
    assert.equal(imp.st.dataRoot, path.join(st, 'mydata'), 'config.yaml\'s dataRoot');
    assert.equal(imp.source, 'custom');
    assert.equal(imp.connection.custom_url, 'https://api.example.test/v1');
    assert.equal(imp.connection.custom_model, 'glm-x');
    assert.equal(imp.connection.zai_model, undefined, 'another source\'s fields are not taken');
    assert.equal(imp.connection.custom_include_headers, undefined);
    assert.deepEqual(imp.dropped.map((d) => d.key).sort(), ['custom_include_headers', 'proxy_password']);
    assert.equal(imp.generation.temp_openai, 0.7, 'the value in play');
    assert.deepEqual(imp.preset.unsaved, ['temp_openai']);
    assert.deepEqual(imp.preset.vsRepo, ['temp_openai']);
    assert.equal(imp.card.name, 'Avereth V4', 'the V4 card, not the V3 one');
    assert.match(imp.card.first_mes, /outside Ashbridge/);
    assert.equal(imp.engineSettings.hud, 'open');
    const read = imp.read.map((r) => path.relative(st, r.file).replace(/\\/g, '/'));
    assert.ok(!read.some((f) => /secrets\.json|chats\/|Other\.png/.test(f)), read.join(', '));
    assert.ok(JSON.stringify(imp).indexOf('PERSONAL-KEY') < 0 && JSON.stringify(imp).indexOf('hunter2') < 0);
    assert.deepEqual(changedSince(imp.read), []);
    assert.ok(treeDiff(before, treeStat(st)).same);
    assert.ok(fs.existsSync(path.join(user, 'secrets.json')));
});

test('the import refuses a URL with credentials and says what a non-custom source costs', () => {
    assert.throws(() => importProfile({ stDir: fakeProfile({ url: 'https://api.example.test/v1?key=abc' }).st }), /carries credentials/);
    assert.throws(() => importProfile({ stDir: fakeProfile({ url: 'https://me:pw@api.example.test/v1' }).st }), /carries credentials/);
    const imp = importProfile({ stDir: fakeProfile({ source: 'zai' }).st });
    assert.equal(imp.connection.zai_model, 'glm-z');
    assert.ok(imp.warnings.some((w) => /generateRaw/.test(w)));
    const none = importProfile({ stDir: fakeProfile({ cards: false }).st });
    assert.equal(none.card, null);
    assert.ok(none.warnings.some((w) => /no Avereth narrator card/.test(w)));
    const repo = importProfile({ stDir: fakeProfile({ temp: 0.3 }).st, preset: 'repo' });
    assert.equal(repo.generation.temp_openai, 0.9, 'the build\'s preset');
});

test('a card written by the runner reads back', () => {
    const card = readCard(cardPng({ name: 'N', description: 'D', first_mes: 'F', world: 'W' }));
    assert.equal(card.data.name, 'N');
    assert.equal(card.data.extensions.world, 'W');
    assert.equal(readCard(Buffer.from('not a png')), null);
    const r = new Reader();
    const f = path.join(tmp(), 'x.txt');
    fs.writeFileSync(f, 'a');
    r.file(f);
    fs.writeFileSync(f, 'b');
    assert.equal(changedSince(r.read)[0].why, 'content changed');
});

// ------------------------------------------------------------------------------------------------ players
const VIEW = {
    messages: [
        { mesid: 0, user: false, system: false, name: 'Avereth V4', text: 'CHARACTER CREATION — STEP 1/2' },
        { mesid: 1, user: true, system: false, name: 'Alaric', text: 'Mage' },
        { mesid: 2, user: false, system: true, name: 'Avereth System', text: 'STEP 2/2: choose two skills' },
    ],
    toasts: [{ kind: 'warning', text: 'the narrator contract is outdated' }],
};

test('players: the decision in a model\'s answer, and what is refused', () => {
    assert.deepEqual(parseDecision('Sure!\n```json\n{"message":"Mage","milestone":"creation_complete","intent":"x","stop":false}\n```').decision.message, 'Mage');
    assert.equal(parseDecision('{"message": "a {brace} \\"quoted\\"", "stop": false} trailing').decision.message, 'a {brace} "quoted"');
    assert.match(parseDecision('no json').error, /no JSON/);
    assert.match(parseDecision('{"message": ""}').error, /"message" must be/);
    assert.match(parseDecision('{"stop": true}').error, /"stop_reason"/);
    assert.deepEqual(parseDecision('{"stop": true, "stop_reason": "done"}').decision, { message: '', milestone: null, intent: null, stop: true, stop_reason: 'done', observations: null });
});

test('players: the screen as the player gets it, the system prompt with the guide', () => {
    const s = screenText(VIEW);
    assert.match(s, /^\[NARRATOR \(Avereth V4\)\]\nCHARACTER CREATION/);
    assert.match(s, /\[YOU\]\nMage/);
    assert.match(s, /\[SYSTEM \(Avereth System\)\]\nSTEP 2\/2/);
    assert.match(s, /\[NOTICES ON SCREEN\]\n- \(warning\) the narrator contract is outdated$/);
    const p = playerSystemPrompt(loadGuide('patch_8_4'), { username: 'Alaric', persona: 'direct' });
    assert.match(p, /1\. creation_complete: Create the character/);
    assert.match(p, /5\. inside_dungeon: .*\(if it comes within reach\)/);
    assert.match(p, /Patch 8\.4: when you attack one member of an unaware group openly/);
    assert.match(p, /YOUR STYLE THIS RUN \(a player's style, never a writer's\): direct/);
    assert.match(p, /the same failure 3 times/);
});

test('players: the scripted player goes step by step and stops when a step never comes', async () => {
    const p = scriptedPlayer({ steps: [{ say: 'Mage' }, { say: ['go', 'go again'], until: 'arrived', max: 2 }, { say: 'last' }] });
    const v = (text) => ({ messages: [{ user: false, text }], toasts: [] });
    assert.equal((await p.decide(v('start'), { turn: 1 })).message, 'Mage');
    assert.equal((await p.decide(v('ok'), { turn: 2 })).message, 'go');
    assert.equal((await p.decide(v('walking'), { turn: 3 })).message, 'go again');
    const stuck = await p.decide(v('walking'), { turn: 4 });
    assert.equal(stuck.stop, true);
    assert.match(stuck.stop_reason, /blocked: step 2/);
    const q = scriptedPlayer({ steps: [{ say: 'go', until: 'arrived' }, { say: 'last' }] });
    await q.decide(v(''), { turn: 1 });
    assert.equal((await q.decide(v('you arrived'), { turn: 2 })).message, 'last');
    assert.equal((await q.decide(v(''), { turn: 3 })).stop_reason, 'done');
});

test('players: the LLM player repairs a bad answer, keeps its notes, and never logs the key', async () => {
    const sent = [];
    const answers = ['I think I will pick Mage.', '{"message":"Mage","milestone":"creation_complete","intent":"class","stop":false,"observations":"a warning about the contract"}'];
    const fetchImpl = async (url, init) => {
        sent.push({ url, auth: init.headers.authorization, body: JSON.parse(init.body) });
        return { ok: true, status: 200, json: async () => ({ model: 'glm-x', choices: [{ message: { content: answers.shift() }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5 } }) };
    };
    const log = [];
    const p = llmPlayer({ guide: loadGuide('guild_dungeon_loop'), username: 'Alaric', persona: 'cautious', url: 'https://api.example.test/v1/', model: 'glm-x', key: 'SECRET-KEY-1', fetchImpl, record: (e) => log.push(e), extraBody: { thinking: { type: 'disabled' } } });
    const d = await p.decide(VIEW, { turn: 1, maxTurns: 80 });
    assert.equal(d.message, 'Mage');
    assert.equal(sent.length, 2);
    assert.equal(sent[0].url, 'https://api.example.test/v1/chat/completions');
    assert.equal(sent[0].auth, 'Bearer SECRET-KEY-1');
    assert.deepEqual(sent[0].body.thinking, { type: 'disabled' });
    assert.equal(sent[1].body.messages.length, 4, 'the repair carries the earlier answer and the error');
    assert.match(sent[0].body.messages[1].content, /TURN 1 of at most 80[\s\S]*\[NOTICES ON SCREEN\]/);
    assert.deepEqual(log.map((e) => !!e.error), [true, false]);
    assert.ok(!JSON.stringify(log).includes('SECRET-KEY-1'));
    assert.equal(p.notes.length, 1);
    await p.decide(VIEW, { turn: 2, maxTurns: 80 }).catch(() => {});
    assert.match(sent.at(-1).body.messages[1].content, /1\. you wrote: "Mage" — creation_complete: class — noted: a warning about the contract/);
    const dead = llmPlayer({ guide: loadGuide('guild_dungeon_loop'), username: 'Alaric', url: 'http://x/v1', model: 'm', key: 'k', fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ error: { message: 'down' } }) }) });
    const t0 = Date.now();
    const stop = await dead.decide(VIEW, { turn: 1, maxTurns: 1 });
    assert.equal(stop.stop, true);
    assert.equal(stop.harness, true);
    assert.ok(Date.now() - t0 >= 9000, 'it waits between attempts');
});

// ------------------------------------------------------------------------------------------------ options, exports, report
test('options: defaults, then the config file, then the command line; run folders never inside SillyTavern', () => {
    const dir = tmp();
    const cfg = path.join(dir, 'c.json');
    fs.writeFileSync(cfg, JSON.stringify({ stDir: '/st', guide: 'patch_8_4', player: { model: 'm1' } }));
    const o = options(['--config', cfg, '--guide', 'guild_dungeon_loop', '--headed', '--player', 'scripted'], {});
    assert.deepEqual([o.stDir, o.guide, o.headless, o.player.type, o.player.model, o.player.temperature, o.keyEnv], ['/st', 'guild_dungeon_loop', false, 'scripted', 'm1', 0.8, 'AVERETH_LIVE_API_KEY']);
    assert.equal(options(['--config', path.join(dir, 'none.json')], { AVERETH_ST_DIR: '/env/st' }).stDir, '/env/st');
    const imp = { st: { dir: path.join(dir, 'ST'), dataRoot: path.join(dir, 'ST', 'data') } };
    assert.equal(runsDirFor({ runsDir: path.join(dir, 'runs') }, imp), path.join(dir, 'runs'));
    assert.throws(() => runsDirFor({ runsDir: path.join(dir, 'ST', 'data', 'default-user', 'extensions', 'avereth-engine', 'runs') }, imp), /inside the SillyTavern installation/);
});

test('exports: the chat file and the event log in the button\'s format', () => {
    const text = `${JSON.stringify({ user_name: 'Alaric', character_name: 'Avereth V4', chat_metadata: {} })}\n${fx.messages.slice(0, 4).map((m) => JSON.stringify(m)).join('\n')}\n`;
    const { header, messages } = readChatJsonl(text);
    assert.equal(header.character_name, 'Avereth V4');
    assert.equal(messages.length, 4);
    const log = eventsLog(messages);
    assert.deepEqual(log.map((x) => x.i), [0, 1, 3]);
    assert.equal(log[0].events[0].t, 'campaign.started');
});

test('the report: a stub run says it is no live test; a changed profile and a key hit are spelt out', () => {
    const guide = loadGuide('guild_dungeon_loop');
    const ev = evaluate(fx.messages, { guide });
    const base = {
        runId: 'r', stub: true, guide, player: { type: 'scripted', steps: 3 }, end: { kind: 'done', why: null }, ev, calls: [], setup: { source: 'custom', card: 'Avereth V4', world: WORLD, greeting: 'profile', model: 'm', host: 'h' },
        imp: { preset: { name: 'P', mode: 'profile', unsaved: [], vsRepo: [] }, generation: {}, streaming: false, card: null, world: null, engineSettings: null, dropped: [], warnings: [], read: [] },
        git: { commit: 'abc', branch: 'b', dirty: [] }, build: '4.3.0', st: { version: '1.19.0', dir: '/st', port: 8123, startMs: 1000 }, browser: { name: 'chromium', version: '1', headless: true },
        turnsLog: [], playerLog: [], driverNotes: [], toasts: [], pageErrors: [], serverErrors: [], scan: { files: 3, hits: [] }, files: [], startedAt: 0, endedAt: 60000,
        protection: { unchanged: true, changedRead: [], tree: { same: true, added: [], removed: [], changed: [] }, files: 10 },
    };
    const r = buildReport(base);
    assert.match(r, /STUB-SELBSTTEST — kein echter Livetest/);
    assert.match(r, /\| quest_completed \| ja \| ✔ \| 17 \| 34 \| 8 \|/);
    assert.match(r, /\| enc\.t10 \| 10 \| 1 \| 3 \(1: unaware, 2: unaware, 3: unaware\) \| nein \| 1 \| gewonnen, 12 XP \|/);
    assert.match(r, /group_stayed_out/);
    const bad = buildReport({ ...base, stub: false, protection: { unchanged: false, changedRead: [{ file: 'settings.json', why: 'time changed' }], tree: { same: false, added: ['x'], removed: [], changed: [] }, files: 10 }, scan: { files: 3, hits: [{ file: 'a.json', what: 'secret #1', count: 2 }] } });
    assert.doesNotMatch(bad, /STUB/);
    assert.match(bad, /Profil unverändert:\*\* \*\*nein\*\*/);
    assert.match(bad, /verändert: settings\.json \(time changed\)/);
    assert.match(bad, /a\.json: secret #1 ×2 — geschwärzt/);
});
