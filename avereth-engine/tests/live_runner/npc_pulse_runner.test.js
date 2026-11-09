// The targeted NPC/PULSE batch of the live runner (guides/npc_pulse_test.json, scenarios NPC_SCENARIOS, batch.mjs
// --mode npc, npc_pulse.mjs): the guide and its two profiles, the player's prompt, the batch control beside the
// unchanged Guild series, and the evaluation of saved records. The evaluation is checked on chats the real engine
// produced through the host path (scripted planner/extractor answers, a forced PULSE draw only where a test needs an
// open window) and on deliberately broken copies of their records; none of this is a natural model test.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadProductContent } from '../helpers.js';
import { campaign, say, GO } from '../v4/patch8_lib.js';
import { rec } from '../../src/host.js';
import { processReplyAny, runExtraction } from '../../src/v4/runtime.js';
import { SCENARIOS, NPC_SCENARIOS, scenarioGuide } from '../../tools/st_live/live/scenarios.mjs';
import { runBatch, batchArgs, BATCH_MODES } from '../../tools/st_live/live/batch.mjs';
import { loadGuide, guideErrors } from '../../tools/st_live/live/guide.mjs';
import { playerSystemPrompt } from '../../tools/st_live/live/players.mjs';
import { npcPulseAnalysis, npcPulseMarkdown, npcPulseSection, analyseRunFolder, callsOf } from '../../tools/st_live/live/npc_pulse.mjs';

const content = await loadProductContent();
const BATCH = new URL('../../tools/st_live/live/batch.mjs', import.meta.url).pathname;
function temporary(t) {
    const p = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-npc-batch-'));
    t.after(() => fs.rmSync(p, { recursive: true, force: true }));
    return p;
}
const arg = (args, name) => args[args.indexOf(name) + 1];

// ---------------------------------------------------------------------------------------------- guide and profiles
test('npc_pulse_test: a natural open run of about 70 inputs (cap 80), creation and the duration required, no level goal, fixture or script', () => {
    const g = loadGuide('npc_pulse_test');
    assert.deepEqual(guideErrors(g), []);
    assert.equal(g.analysis, 'npc_pulse');
    assert.deepEqual([g.openRun.minTurns, g.openRun.targetLevel, g.limits.maxTurns], [70, undefined, 80]);
    assert.deepEqual(g.milestones.filter((m) => m.required !== false).map((m) => m.id), ['creation_complete', 'open_run_duration']);
    assert.ok(!g.fixture && !g.scripted?.length);
    assert.equal(g.personas.length, 2);
    // goals, never prescribed lines, people, contract order or events
    assert.ok(!/["“]/.test(g.brief), 'no prescribed dialogue');
    assert.ok(!/\b(?:Tam|Brenna|Marda|Bess|Glassmere|Alderwatch)\b/.test(g.brief), 'no prescribed people or places');
    assert.match(g.brief, /You decide only your own actions and words/);
    assert.match(g.brief, /never ask the story for an event/);
    assert.match(g.brief, /party forms only if they credibly agree/);
    // an unknown analysis is refused
    assert.match(guideErrors({ ...g, analysis: 'x' }).join(' '), /analysis "x" unknown/);
});

test('NPC profiles: two runs with their own class and style; the six Guild/explore profiles and their seed order stay as they were', () => {
    assert.deepEqual(SCENARIOS.map((s) => s.id), ['guild-warrior', 'guild-mage', 'guild-rogue', 'explore-warrior', 'explore-mage', 'explore-rogue']);
    assert.deepEqual(NPC_SCENARIOS.map((s) => [s.id, s.baseClass]), [['npc-sociable', 'Warrior'], ['npc-wary', 'Rogue']]);
    const guide = loadGuide('npc_pulse_test');
    const prompts = NPC_SCENARIOS.map((s) => { const g = scenarioGuide(guide, s.id); return { s, g, p: playerSystemPrompt(g, { username: 'Alaric', persona: g.personas[0] }) }; });
    for (const { s, g, p } of prompts) {
        assert.deepEqual(g.personas, [s.style]);
        assert.ok(p.includes(`Base class for this run: ${s.baseClass};`));
        assert.ok(p.includes(s.style));
        assert.ok(!/Level 15|open_run_level|class_accepted/.test(p), 'no level target, also not in the example');
        assert.match(p, /"milestone":"open_run_duration"/);
        assert.match(g.milestones[0].goal, new RegExp(`Level-1 ${s.baseClass}`));
    }
    assert.notEqual(prompts[0].p, prompts[1].p);
    // the Guild scenario on current_test is untouched; the profiles do not cross
    const guild = scenarioGuide(loadGuide('current_test'), 'guild-warrior');
    assert.match(guild.brief, /Continue to Engine-confirmed Level 15/);
    assert.throws(() => scenarioGuide(loadGuide('current_test'), 'npc-wary'), /belongs to the npc_pulse guide/);
    assert.throws(() => scenarioGuide(guide, 'guild-mage'), /takes only its own profiles/);
});

// --------------------------------------------------------------------------------------------------- batch control
test('batch --mode npc: two sequential runs (npc-sociable, npc-wary) with the batch seed and the next, the npc guide; the default stays the Guild series', async (t) => {
    const npc = batchArgs(['--mode', 'npc', '--headed']); // main() strips --seed and --runs before the runs get their own
    assert.deepEqual([npc.mode, npc.maxHours, arg(npc.args, '--guide'), npc.args.includes('--mode')], ['npc', 24, 'npc_pulse_test', false]);
    const guild = batchArgs(['--max-hours', '12']);
    assert.deepEqual([guild.mode, guild.maxHours, arg(guild.args, '--guide')], ['guild', 12, 'current_test']);
    assert.throws(() => batchArgs(['--mode', 'x']), /unknown batch mode/);
    const root = path.join(temporary(t), 'npc-batch');
    const seen = [];
    const result = await runBatch({ root, args: npc.args, seed: 7, maxHours: 1, mode: 'npc' }, { revision: () => 'fixed', launch: async (args) => {
        seen.push([arg(args, '--scenario'), Number(arg(args, '--seed')), arg(args, '--guide')]);
        const s = NPC_SCENARIOS.find((x) => x.id === arg(args, '--scenario'));
        const dir = path.join(arg(args, '--runs'), 'run-npc_pulse_test');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify({ scenario: s, seed: Number(arg(args, '--seed')), end: { kind: 'done' }, turns: Array(70).fill({}), protection: { unchanged: true }, secretHits: 0 }));
        fs.writeFileSync(path.join(dir, 'evaluation.json'), JSON.stringify({ character: { class: s.baseClass.toLowerCase() }, progression: null }));
        fs.writeFileSync(path.join(dir, 'report.md'), '# synthetic');
        fs.writeFileSync(path.join(dir, 'npc-pulse.md'), '# synthetic npc-pulse');
        return { code: 0 };
    } });
    assert.deepEqual(seen, [['npc-sociable', 7, 'npc_pulse_test'], ['npc-wary', 8, 'npc_pulse_test']]);
    assert.deepEqual([result.status, result.mode, result.runs.map((r) => r.end.kind)], ['completed', 'npc', ['done', 'done']]);
    const report = fs.readFileSync(path.join(root, 'report.md'), 'utf8');
    assert.match(report, /2 natürliche NPC-\/PULSE-Testläufe/);
    assert.match(report, /keine bestandene NPC- oder PULSE-Abnahme/);
    assert.match(report, /\[npc-pulse\.md\]\(001-npc-sociable\/run-npc_pulse_test\/npc-pulse\.md\)/);
    assert.deepEqual(BATCH_MODES.guild.profiles.map((s) => s.id), ['guild-warrior', 'guild-mage', 'guild-rogue']);
    // the listing needs no SillyTavern
    assert.equal(execFileSync(process.execPath, [BATCH, '--mode', 'npc', '--list']).toString().trim(), '1. npc-sociable\n2. npc-wary');
    assert.equal(execFileSync(process.execPath, [BATCH, '--list']).toString().trim(), '1. guild-warrior\n2. guild-mage\n3. guild-rogue');
});

// ------------------------------------------------------------------------------------------------------ evaluation
const HALL = 'loc.alderwatch.guild_hall';
const arrive = (at, more = {}) => ({ seq: 1, type: 'arrive', at, forced_by: null, with: null, ...more });
const clerk = { seq: 2, type: 'person.new', ref: 'hall_clerk', name: 'Hessa', role: 'clerk', desc: ['grey-haired woman with spectacles at the long counter'], armed: null, present: true, relevant: true, threat: false, at: HALL, band: 'SHORT', distinct_from: null };
const PROMISE = 'Hessa promised to keep a copy of the road map for Alaric until dusk';
/** A reply as the host processes it: the narrator context of the player's turn on the record, then the extraction. */
async function replyWith(g, prose, answer, said) {
    g.chat.push({ mes: prose, is_user: false, is_system: false, extra: {} });
    const id = g.chat.length - 1;
    const p = processReplyAny(g.chat, id, g.content, said?.context ? { narratorContext: said.context.diagnostics } : {});
    g.answer = answer;
    if (p.extract) await runExtraction(g.chat, id, g.content, g.llm);
    return rec(g.chat[id]);
}
/** A short real career: Hessa met, a promise, an NPC-only promise, a walk together, a return, an anchor, the settlement. */
async function career() {
    const g = await campaign(content);
    const start = g.state().scene.at;
    const calls = [];
    const turn = async (text, ...commands) => {
        const r = await say(g, text, ...commands);
        const n = g.chat.filter((m) => m.is_user).length;
        if (r.context) calls.push({ role: 'narrator', turn: n, request: { messages: [{ role: 'system', content: r.context.text }] } });
        return r;
    };
    let r = await turn('*I walk to the Guild hall*', GO(HALL, 'I walk to the Guild hall'));
    await replyWith(g, 'He walked into the Guild hall. Hessa, a grey-haired woman with spectacles at the long counter, promised to keep a copy of the road map for him until dusk; she hummed an old marching tune.',
        { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: null } }, deltas: [arrive(HALL), clerk, { seq: 3, type: 'thread', id: null, text: PROMISE, kind: 'promise', status: 'open', resolution: null, who: ['pc', 'hall_clerk'] }, { seq: 4, type: 'fact', s: 'hall_clerk', p: 'interest', o: 'old marching tunes' }] }, r);
    const id = Object.values(g.state().entities).find((e) => e.name === 'Hessa').id;
    r = await turn('*I wait while Hessa talks to a porter*');
    await replyWith(g, 'Hob, a broad porter with a rope over his shoulder, asked Hessa for a map; she promised him a copy as well.',
        { scene: HALL, expected: {}, deltas: [{ seq: 1, type: 'person.new', ref: 'porter', name: 'Hob', role: 'porter', desc: ['broad porter with a rope over his shoulder'], armed: null, present: true, relevant: true, threat: false, at: HALL, band: 'SHORT', distinct_from: null },
            { seq: 2, type: 'thread', id: null, text: 'Hessa promised Hob a copy of the road map', kind: 'promise', status: 'open', resolution: null, who: [id, 'porter'] }] }, r);
    r = await turn('*I ask Hessa to walk with me to the verge*', GO(start, 'I ask Hessa to walk with me to the verge'));
    await replyWith(g, 'He walked back out to the verge, Hessa at his side.', { scene: start, expected: { 1: { arrived: true, at: start, with: [id], met: null } }, deltas: [arrive(start, { with: [id] })] }, r);
    r = await turn('*I say goodbye to Hessa and walk back to the Guild hall alone*', GO(HALL, 'I walk back to the Guild hall alone'));
    await replyWith(g, 'Hessa took the road home. He walked back to the Guild hall alone.', { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: null } }, deltas: [arrive(HALL)] }, r);
    r = await turn('*I wait at the counter*');
    await replyWith(g, 'Hessa came back through the side door, brisk with the idlers and patient with him.', { scene: HALL, expected: {}, deltas: [{ seq: 1, type: 'enter', who: id, evidence: 'Hessa came back through the side door' }, { seq: 2, type: 'fact', s: id, p: 'manner', o: 'brisk with idlers, patient with newcomers' }] }, r);
    r = await turn('*I ask Hessa about the map*');
    await replyWith(g, 'Hessa handed him the folded map, as she had promised; she was furious tonight with the late post.', { scene: HALL, expected: {}, deltas: [{ seq: 1, type: 'thread', id: null, text: PROMISE, kind: 'promise', status: 'resolved', resolution: 'she handed him the folded map', who: null }, { seq: 2, type: 'fact', s: id, p: 'manner', o: 'furious tonight' }] }, r);
    r = await turn('*I thank Hessa for the map*');
    await replyWith(g, 'Hessa nodded, already back at her ledger.', { scene: HALL, expected: {}, deltas: [] }, r);
    return { g, id, calls };
}

test('evaluation of a real host career: meetings, a return, shared travel, agreements (his and the NPCs\'), anchors and refusals; what the later cards showed', async () => {
    const { g, id, calls } = await career();
    const a = npcPulseAnalysis(g.chat, { calls });
    const cov = Object.fromEntries(a.coverage.map((c) => [c.id, c.count]));
    assert.equal(cov.npc_first_meetings, 2);
    assert.ok(cov.npc_returns >= 1, 'Hessa back in a later presence');
    assert.equal(cov.shared_travel, 1);
    assert.deepEqual(a.npc.companions[0].who, [id]);
    assert.deepEqual([cov.agreement_personal, cov.agreement_npc_only, cov.agreement_settled, cov.agreement_taken_up], [1, 1, 1, 1]);
    assert.equal(cov.agreement_on_card, 1, 'his open promise was on a later narrator card');
    assert.equal(cov.anchor_stored, 1);
    assert.deepEqual([a.npc.anchors[0].p, a.npc.anchors[0].o], ['manner', 'brisk with idlers, patient with newcomers']);
    assert.equal(cov.anchor_refused_first_contact, 1);
    assert.equal(cov.anchor_refused_mood, 1);
    assert.equal(cov.anchor_on_card, 1, 'the next card showed the stored manner');
    assert.ok(a.review.some((x) => x.kind === 'anchor_use' && /does the story fit it/.test(x.why) && x.passage.includes('Hessa')));
    assert.deepEqual(a.violations, []);
    // without the requests the card checks say unknown, nothing else changes
    const bare = npcPulseAnalysis(g.chat);
    assert.equal(bare.npc.anchors[0].later.inPrompt, 'unknown');
    assert.deepEqual(bare.coverage.filter((c) => !/_on_card$/.test(c.id)), a.coverage.filter((c) => !/_on_card$/.test(c.id)));
    // the reports
    const md = npcPulseMarkdown(a, { runId: 'host' });
    assert.match(md, /## Abdeckung/);
    assert.match(md, /\*\*nicht abgedeckt\*\*/);
    assert.match(md, /fehlende Abdeckung/);
    assert.match(md, /brisk with idlers/);
    assert.match(npcPulseSection(a), /nicht abgedeckt:\*\* .*desk_handler/);
});

test('evaluation: invariants the records carry are reported, semantic doubts are only passages for review (broken copies of real records)', async () => {
    const { g, id } = await career();
    // an anchor stored at the first contact (as no engine of .174 writes it)
    const bad = structuredClone(g.chat);
    const first = bad.findIndex((m) => !m.is_user && (rec(m)?.events || []).some((e) => e.t === 'entity.created' && e.d.entity.name === 'Hessa'));
    rec(bad[first]).events.push({ t: 'fact.asserted', d: { fact: { id: 'f.test.voice', s: id, p: 'voice', o: 'clipped and dry', since: { turn: 1, minute: 0 }, until: null, visibility: 'public', importance: 0.5, hard: false, source: { kind: 'narration' } } } });
    const a = npcPulseAnalysis(bad);
    assert.ok(a.violations.some((v) => v.kind === 'anchor_without_earlier_encounter' && v.why.includes('clipped and dry')));
    // the same trait twice in one presence
    const twice = structuredClone(g.chat);
    const later = twice.findLastIndex((m) => !m.is_user && (rec(m)?.events || []).some((e) => e.t === 'fact.asserted' && e.d.fact.p === 'manner'));
    rec(twice[later]).events.push({ t: 'fact.asserted', d: { fact: { id: 'f.test.manner2', s: id, p: 'manner', o: 'cold with everyone', since: { turn: 9, minute: 0 }, until: null, visibility: 'public', importance: 0.5, hard: false, source: { kind: 'narration' } } } });
    assert.ok(npcPulseAnalysis(twice).violations.some((v) => v.kind === 'anchor_changed_twice_in_presence'));
    // Alaric bound to an agreement while nobody of it was present
    const away = structuredClone(g.chat);
    const verge = away.findIndex((m) => !m.is_user && /Hessa took the road home/.test(m.mes));
    rec(away[verge]).events.push({ t: 'thread.set', d: { thread: { id: 'thread.test.1', text: 'Hob owes Alaric a favour', kind: 'debt', status: 'open', since: { turn: 4, minute: 0 }, updated: { turn: 4, minute: 0 }, source: { kind: 'narration' }, at: HALL, who: ['pc', Object.values(g.state().entities).find((e) => e.name === 'Hob').id] } } });
    assert.ok(npcPulseAnalysis(away).violations.some((v) => v.kind === 'agreement_pc_without_presence'));
    // an arrival card for Hessa whose story names her, though she does not enter: a passage to review, no verdict
    const card = structuredClone(g.chat);
    const k = card.findIndex((m) => !m.is_user && /Hessa took the road home/.test(m.mes));
    rec(card[k]).narration = { context: { arrivalNpcIds: [id] } };
    card[k].mes = 'He walked back to the Guild hall alone; Hessa was laughing with the porters at the counter.';
    const c = npcPulseAnalysis(card);
    assert.ok(c.review.some((x) => x.kind === 'arrival_named_not_present' && x.passage.includes('Hessa was laughing')));
    assert.ok(!c.violations.some((v) => v.kind === 'arrival_named_not_present'));
});

test('evaluation of PULSE: draws by exposure, open windows and what the reply did with them; a forced draw is a violation of a natural run', async () => {
    const g = await campaign(content);
    const was = content.rules.pulse.force;
    // a natural (closed or open) draw in town, then one forced open window on the road (as only tests may force)
    await say(g, '*I look around the verge*');
    await replyWith(g, 'The verge lay quiet in the morning light.', { scene: 'here', expected: {}, deltas: [] });
    content.rules.pulse.force = { open: true, kind: 'life' };
    try {
        await say(g, '*I walk to the Guild hall*', GO(HALL, 'I walk to the Guild hall'));
        await replyWith(g, 'He walked into the Guild hall.', { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: null } }, deltas: [arrive(HALL)] });
    } finally { content.rules.pulse.force = was; }
    const a = npcPulseAnalysis(g.chat);
    assert.ok(a.pulse.draws >= 1);
    const forced = a.pulse.windows.find((w) => w.forced);
    assert.ok(forced && forced.open && forced.kind === 'life');
    assert.deepEqual(forced.outcome?.narrated, 'none');
    assert.ok(a.violations.some((v) => v.kind === 'pulse_forced_in_natural_run'));
    assert.ok(a.review.some((x) => x.kind === 'open_window_not_narrated' && x.passage.includes('Guild hall')));
    assert.equal(a.coverage.find((c) => c.id === 'pulse_open').status, 'observed');
    assert.ok(Object.keys(a.pulse.byExposure).length >= 1);
    assert.equal(a.pulse.density.inputs, g.chat.filter((m) => m.is_user).length);
});

test('evaluation of a run folder (chat.jsonl, chat-completions.jsonl): npc-pulse.json and npc-pulse.md written next to them', async (t) => {
    const { g, calls } = await career();
    const dir = temporary(t);
    fs.writeFileSync(path.join(dir, 'chat.jsonl'), [JSON.stringify({ user_name: 'Alaric', character_name: 'Avereth' }), ...g.chat.map((m) => JSON.stringify(m))].join('\n') + '\n');
    fs.writeFileSync(path.join(dir, 'chat-completions.jsonl'), calls.map((c, n) => JSON.stringify({ n: n + 1, role: c.role, turn: c.turn, request: c.request, response: { choices: [] } })).join('\n') + '\n');
    assert.equal(callsOf(fs.readFileSync(path.join(dir, 'chat-completions.jsonl'), 'utf8')).length, calls.length);
    const a = analyseRunFolder(dir);
    assert.ok(fs.existsSync(path.join(dir, 'npc-pulse.json')) && fs.existsSync(path.join(dir, 'npc-pulse.md')));
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'npc-pulse.json'), 'utf8')).coverage.length, a.coverage.length);
    assert.equal(a.coverage.find((c) => c.id === 'anchor_on_card').count, 1);
});
