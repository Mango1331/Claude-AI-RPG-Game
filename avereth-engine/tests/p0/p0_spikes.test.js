// Runtime V4, P0 spikes S0–S3 (docs/P0_SPIKES.md), offline with the mock backend: the data are consistent, the
// measurements count what they claim, the decisions follow their rules, and S3 holds on the V12 gold (and fails when
// the gold is broken).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openProvider } from '../../tools/p0/lib/provider.mjs';
import { readJsonl, readJson } from '../../tools/p0/lib/util.mjs';
import { strictProblems } from '../../tools/p0/lib/schema.mjs';
import { loadDeltaVocab, checkBlock, deltaSchema } from '../../tools/p0/lib/deltas.mjs';
import { loadVocabulary, loadScenes, interpreterSchema, interpreterSystem, sceneIds } from '../../tools/p0/lib/interpreter.mjs';
import { scoreCase, aggregate, matchCommand } from '../../tools/p0/lib/score.mjs';
import { CASES, s0MockResponder } from '../../tools/p0/s0_cases.mjs';
import { main as s0main, chooseModes, decide as s0decide } from '../../tools/p0/s0_structured.mjs';
import { main as s1main, CORPUS_FILE, s1MockResponder, goldAnswer as s1Gold, sampleCases } from '../../tools/p0/s1_interpreter.mjs';
import { main as s2main, DATA_FILE, REQUESTS_FILE, v4Messages, goldAnswer as s2Gold, s2MockResponder, decide as s2decide, scoreTurn } from '../../tools/p0/s2_deltas.mjs';
import { runChecks, CHECK_IDS, GOLD_FILE } from '../../tools/p0/s3_prototype.mjs';
import { validateSchema } from '../../src/validate.js';

const quiet = { log: () => {}, progress: () => {} };
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `p0-${name}-`));
const commandsVocab = loadVocabulary();
const scenes = loadScenes();
const corpus = readJsonl(CORPUS_FILE);
const deltaVocab = loadDeltaVocab();
const s2turns = readJsonl(DATA_FILE);
const s2requests = readJson(REQUESTS_FILE);

// ------------------------------------------------------------------ S0
test('S0: ten cases, strict schemas, gold answers valid and right; mode choice and decision rule', async () => {
    assert.equal(CASES.length, 10);
    for (const c of CASES) {
        assert.deepEqual(strictProblems(c.schema), [], c.id);
        assert.deepEqual(validateSchema(c.gold, c.schema), [], c.id);
        assert.equal(c.check(c.gold).ok, true, c.id);
    }
    assert.deepEqual(chooseModes({ schemaOk: true, offValue: 'none' }), ['schema_keep', 'schema_off', 'plain_off']);
    assert.deepEqual(chooseModes({ schemaOk: false, offValue: null }), ['plain_keep']);
    const st = (x) => ({ answered: 30, error_pct: 0, valid_first_pct: 100, semantic_pct: 100, p50_s: 4, reasoning_tok: 0, reasoning_chars: 0, ...x });
    assert.equal(s0decide({ schema_keep: st({ p50_s: 10 }), schema_off: st({ p50_s: 4 }), plain_off: st({}) }, { offValue: 'none', schemaOk: true }).structured_mode, 'json_schema');
    assert.equal(s0decide({ schema_keep: st({ valid_first_pct: 80 }), schema_off: st({ valid_first_pct: 80 }), plain_off: st({}) }, { offValue: 'none', schemaOk: true }).structured_mode, 'plain');
    assert.equal(s0decide({ schema_keep: st({ p50_s: 4 }), schema_off: st({ p50_s: 4 }), plain_off: st({}) }, { offValue: 'none', schemaOk: true }).reasoning, null, 'no gain → reasoning stays as configured');
});

test('S0 run with the mock: a provider that rejects json_schema and reasoning overrides ends in plain, reasoning kept', async () => {
    const out = tmp('s0');
    try {
        const provider = await openProvider({ backend: 'mock', mock: s0MockResponder({ failModes: ['json_schema', 'reasoning'] }) });
        assert.equal(await s0main(['--out', out, '--reps', '1', '--concurrency', '6'], { ...quiet, provider }), 0);
        const dec = JSON.parse(fs.readFileSync(path.join(out, 'decision.json'), 'utf8'));
        assert.equal(dec.structured_mode, 'plain');
        assert.equal(dec.reasoning, null);
        assert.deepEqual(dec.evidence.stats.plain_keep.planned, 10);
        const repaired = await openProvider({ backend: 'mock', mock: s0MockResponder({ invalidFirst: ['interp_go_guild'] }) });
        assert.equal(await s0main(['--out', out, '--reps', '1'], { ...quiet, provider: repaired }), 0);
        const res = JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8'));
        const r = res.records.find((x) => x.case === 'interp_go_guild' && x.mode === 'schema_keep');
        assert.equal(r.valid_first, false);
        assert.equal(r.valid_final, true);
    } finally {
        fs.rmSync(out, { recursive: true, force: true });
    }
});

// ------------------------------------------------------------------ S1
test('S1 corpus: ≥ 150 cases, every command type, every negative category, gold refs exist in their scene', () => {
    assert.ok(corpus.length >= 150, `${corpus.length} cases`);
    assert.equal(new Set(corpus.map((c) => c.id)).size, corpus.length, 'ids are unique');
    const neg = corpus.filter((c) => !c.expect.length);
    assert.ok(neg.length >= 60, `${neg.length} negative cases`);
    for (const cat of ['question', 'thought', 'hypothetical', 'plan', 'memory', 'negation', 'npc_action', 'quoted_speech']) assert.ok(neg.some((c) => c.tags.includes(cat)), cat);
    const types = new Set(corpus.flatMap((c) => c.expect.flatMap((g) => (g.anyOf ? g.anyOf.map((x) => x.type) : [g.type]))));
    for (const t of commandsVocab.commands.map((c) => c.type)) assert.ok(types.has(t), `no positive case for ${t}`);
    assert.ok(corpus.filter((c) => c.tags.includes('real')).length >= 80, 'real player messages from the runs');
    for (const c of corpus) {
        const scene = scenes[c.scene];
        assert.ok(scene, `${c.id}: scene ${c.scene}`);
        const ids = sceneIds(scene);
        const all = new Set([...ids.place, ...ids.person, ...ids.object, ...ids.quest, ...ids.offer]);
        const walk = (v) => (typeof v === 'string' && /^(loc|npc|obj|quest|offer)\./.test(v) ? [v] : Array.isArray(v) ? v.flatMap(walk) : v && typeof v === 'object' ? Object.entries(v).filter(([k]) => k !== 'type').flatMap(([, x]) => walk(x)) : []);
        for (const ref of walk([c.expect, c.allow || []])) assert.ok(all.has(ref), `${c.id}: ${ref} is not in scene ${c.scene}`);
        const answer = s1Gold(commandsVocab, c);
        assert.deepEqual(validateSchema(answer, interpreterSchema(commandsVocab, scene)), [], `${c.id}: the gold answer fits the schema`);
    }
    assert.ok(interpreterSystem(commandsVocab).length < 7000, 'the interpreter prompt stays near the planned 1.2–2.0k tokens');
    assert.equal(sampleCases(corpus, 60).length, 60);
});

test('S1 scoring: anyOf, allow, wrong argument, false command, order', () => {
    const kase = { expect: [{ type: 'quest.accept', quest: 'q.a' }, { type: 'go', to: ['loc.x', { new: '/inn/i' }] }], allow: [{ type: 'equip' }] };
    const good = scoreCase(kase, [{ seq: 1, type: 'quest.accept', quest: 'q.a' }, { seq: 2, type: 'go', to: { new: 'an inn' } }, { seq: 3, type: 'equip', object: 'x' }]);
    assert.equal(good.exact, true);
    assert.equal(good.tolerated, 1);
    const bad = scoreCase(kase, [{ seq: 1, type: 'go', to: 'loc.y' }, { seq: 2, type: 'quest.accept', quest: 'q.a' }, { seq: 3, type: 'pay', to: 'x' }]);
    assert.equal(bad.full, 1);
    assert.equal(bad.type_only, 1);
    assert.equal(bad.false_commands.length, 1);
    assert.equal(bad.order_ok, false);
    assert.equal(matchCommand({ anyOf: [{ type: 'pay', amount_cp: 20 }, { type: 'offer.accept', offer: 'o.r' }] }, { type: 'offer.accept', offer: 'o.r' }).full, true);
    const neg = scoreCase({ expect: [] }, [{ seq: 1, type: 'buy', what: 'x' }]);
    assert.equal(neg.negative_ok, false);
    const agg = aggregate([{ score: good, predicted_count: 3 }, { score: neg, predicted_count: 1 }]);
    assert.equal(agg.negative_precision_pct, 0);
    assert.equal(agg.false_commitments, 1);
});

test('S1 run with the mock: a perfect interpreter meets the gates; one that books a payment on negatives fails them', async () => {
    const out = tmp('s1');
    try {
        const provider = await openProvider({ backend: 'mock', mock: s1MockResponder(corpus, scenes, commandsVocab) });
        assert.equal(await s1main(['--out', out, '--concurrency', '16'], { ...quiet, provider, decision: null }), 0);
        let res = JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8'));
        assert.equal(res.agg.negative_precision_pct, 100);
        assert.equal(res.agg.recall_pct, 100);
        assert.deepEqual(res.gates, { negative: true, recall: true, p50: true });
        const wrong = corpus.filter((c) => !c.expect.length).slice(0, 5).map((c) => c.id);
        const bad = await openProvider({ backend: 'mock', mock: s1MockResponder(corpus, scenes, commandsVocab, { wrong }) });
        assert.equal(await s1main(['--out', out, '--concurrency', '16'], { ...quiet, provider: bad, decision: null }), 0);
        res = JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8'));
        assert.equal(res.agg.false_commitments, 5);
        assert.equal(res.gates.negative, false);
        assert.match(fs.readFileSync(path.join(out, 'summary.md'), 'utf8'), /NEIN/);
    } finally {
        fs.rmSync(out, { recursive: true, force: true });
    }
});

// ------------------------------------------------------------------ S2
test('S2 data: 41 recorded turns, every request present and cleanly turned into a V4 prompt, gold satisfiable', () => {
    assert.equal(s2turns.length, 41);
    assert.deepEqual([...new Set(s2turns.map((t) => t.run))], ['V8', 'V9', 'V10', 'V11', 'V12']);
    const text = JSON.stringify(s2requests);
    const personas = Object.values(s2requests.blocks).filter((b) => /^Alaric is (a|an) /.test(b));
    assert.deepEqual([...new Set(personas)], ['Alaric is an 18-year-old human male.'], 'only the neutral persona line');
    assert.ok(!/megumin/i.test(text), 'no Megumin text');
    for (const t of s2turns) {
        const { messages, notes } = v4Messages(s2requests, t, deltaVocab);
        assert.deepEqual(notes, [], t.id);
        const all = messages.map((m) => m.content).join('\n');
        assert.ok(all.includes('WORLD DELTAS') && all.includes('PLAYER ACTIONS'), t.id);
        assert.ok(!/fact report|FACT REPORT|taken_by/.test(all), `${t.id}: the 3.1 report is gone`);
        assert.ok(!all.includes('RESOLVED THIS TURN'), t.id);
        const schema = deltaSchema(deltaVocab, t.catalog, t.expected_keys);
        assert.deepEqual(strictProblems(schema), [], t.id);
        const chk = checkBlock(JSON.stringify(s2Gold(t, deltaVocab)), schema, t.expected_keys);
        assert.ok(chk.valid && chk.complete, `${t.id}: ${chk.errors.join('; ')}`);
        assert.equal(scoreTurn(t, chk.value).semantic, 1, `${t.id}: the gold answer scores 100 %`);
        assert.ok(t.reply.length > 200 && !t.reply.includes('<avereth>'), `${t.id}: recorded prose without the old report`);
    }
});

test('S2 run with the mock: B wins with good blocks; with too many missing blocks the rule picks A', async () => {
    const out = tmp('s2');
    try {
        const provider = await openProvider({ backend: 'mock', mock: s2MockResponder(s2turns, deltaVocab) });
        assert.equal(await s2main(['--out', out, '--concurrency', '8'], { ...quiet, provider, decision: null }), 0);
        let dec = JSON.parse(fs.readFileSync(path.join(out, 'decision.json'), 'utf8'));
        assert.equal(dec.d2, 'B');
        assert.equal(dec.block_ok_pct, 100);
        const missing = s2turns.slice(0, 12).map((t) => t.id);
        const weak = await openProvider({ backend: 'mock', mock: s2MockResponder(s2turns, deltaVocab, { noBlock: missing }) });
        assert.equal(await s2main(['--out', out, '--variant', 'b', '--concurrency', '8'], { ...quiet, provider: weak, decision: null }), 0);
        dec = JSON.parse(fs.readFileSync(path.join(out, 'decision.json'), 'utf8'));
        assert.equal(dec.d2, 'A', 'blocks valid and complete in only 71 % → A');
        const b = JSON.parse(fs.readFileSync(path.join(out, 'b.json'), 'utf8'));
        assert.equal(b.gen.filter((r) => r.recovery_reason === 'missing').length, 12);
        assert.equal(b.gen.filter((r) => r.recovery?.valid_final).length, 12, 'the recovery extractor steps in for every missing block');
        assert.equal(s2decide(null, b), null);
    } finally {
        fs.rmSync(out, { recursive: true, force: true });
    }
});

// ------------------------------------------------------------------ S3
test('S3: the V12 gold passes all checks in both paths; broken gold fails them', () => {
    const gold = JSON.parse(fs.readFileSync(GOLD_FILE, 'utf8'));
    const { checks } = runChecks(gold, deltaVocab);
    const failed = checks.filter((c) => !c.ok);
    assert.deepEqual(failed.map((c) => `${c.id}: ${c.detail}`), []);
    for (const id of CHECK_IDS) assert.ok(checks.some((c) => c.id === id), id);
    const broken = structuredClone(gold);
    broken.turns[5].block.deltas[0].minutes = 600;
    broken.turns[5].recovery.deltas[0].minutes = 600;
    const b = runChecks(broken, deltaVocab).checks.filter((c) => !c.ok).map((c) => c.id);
    assert.ok(b.includes('E7') && b.includes('END'), 'a time delta beyond the activity cap is rejected');
    const noTake = structuredClone(gold);
    noTake.turns[6].commands = noTake.turns[6].commands.filter((c) => c.type !== 'take');
    assert.ok(runChecks(noTake, deltaVocab).checks.filter((c) => !c.ok).map((c) => c.id).includes('E10'), 'no marshmint held → no payout');
});
