// P0 / S4a: the GM-context semantics test differs from S1 only in its system context. The interface (command list,
// answer line, plain format, user message, schema, guard, scorer) is S1's, word for word; the gm arm leaves out the
// interpreter's rules and examples, the gm_rules arm keeps them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openProvider } from '../../tools/p0/lib/provider.mjs';
import { readJsonl } from '../../tools/p0/lib/util.mjs';
import { loadVocabulary, loadScenes } from '../../tools/p0/lib/interpreter.mjs';
import * as v4 from '../../src/v4/interpret.js';
import { main as s1main, CORPUS_FILE, PRODUCT_VOCAB_FILE, s1MockResponder, promptKit } from '../../tools/p0/s1_interpreter.mjs';
import { main as s4amain, s4aSystem, GM_PLANNING_STEP } from '../../tools/p0/s4a_gm_semantics.mjs';

const quiet = { log: () => {}, progress: () => {} };
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `p0-${name}-`));
const vocab = loadVocabulary(PRODUCT_VOCAB_FILE);
const scenes = loadScenes();
const corpus = readJsonl(CORPUS_FILE);

test('S4a prompt: Narrator contract + planning step + the interpreter\'s own interface; rules and examples only in gm_rules', () => {
    const interp = v4.interpreterSystem(vocab, { examples: true });
    const gm = s4aSystem(vocab, 'gm');
    const gmRules = s4aSystem(vocab, 'gm_rules');
    for (const sys of [gm, gmRules]) {
        assert.match(sys, /SANDBOX NARRATOR CONTRACT/);
        assert.ok(sys.includes(GM_PLANNING_STEP));
        assert.ok(sys.includes(v4.vocabularyText(vocab)), 'the command list is the interpreter\'s');
        assert.ok(sys.trimEnd().endsWith('Answer with {"commands": [...]}; an empty list when the message contains no such action.'));
        assert.ok(!sys.includes('You are the command interpreter'), 'not the interpreter\'s role');
        assert.ok(!/avereth_resolve_story|function tool/i.test(sys.split(GM_PLANNING_STEP)[1]), 'no tool in the planning part');
    }
    const firstRule = interp.split('Rules:\n')[1].split('\n')[0];
    const firstExample = v4.EXAMPLE_MESSAGES[0];
    assert.ok(!gm.includes(firstRule) && !gm.includes(firstExample), 'gm: no interpreter rules or examples');
    assert.ok(gmRules.includes(firstRule) && gmRules.includes(firstExample), 'gm_rules: both');
    assert.throws(() => s4aSystem(vocab, 'tools'), /--arm/);
});

test('S4a with the mock: perfect answers score like S1; --compare lines up with an S1 run on the same sample', async () => {
    const out1 = tmp('s1a');
    const out4 = tmp('s4a');
    try {
        const kit = promptKit('v4');
        const neutral = corpus.find((c) => c.id === 'real_v2_03');
        const p1 = await openProvider({ backend: 'mock', mock: s1MockResponder(corpus, scenes, kit.vocab, { user: kit.user }) });
        assert.equal(await s1main(['--out', out1, '--concurrency', '16', '--sample', '40', '--mode', 'plain'], { ...quiet, provider: p1, decision: null }), 0);
        // S4a sends S1's user message: S1's mock answers it, with one false payment on a neutral line
        const p4 = await openProvider({ backend: 'mock', mock: s1MockResponder(corpus, scenes, vocab, { user: v4.interpreterUser, wrong: [neutral.id] }) });
        assert.equal(await s4amain(['--out', out4, '--sample', '40', '--compare', path.join(out1, 'results.json')], { ...quiet, provider: p4, vocab }), 0);
        const res = JSON.parse(fs.readFileSync(path.join(out4, 'results.json'), 'utf8'));
        assert.equal(res.meta.concurrency, 1, 'serial by default');
        assert.equal(res.meta.temperature, 0.1);
        assert.equal(res.compare.cases, 40);
        // the mock's false payment carries no evidence ("x"): the guard drops it, as in S1
        assert.equal(res.aggRaw.false_commitments, 1);
        assert.equal(res.agg.false_commitments, 0);
        assert.equal(res.records.find((r) => r.id === neutral.id).dropped[0].rule, 'no_evidence');
        assert.deepEqual(res.compare.only_a, []);
        assert.equal(res.agg.recall_pct, 100);
        const summary = fs.readFileSync(path.join(out4, 'summary.md'), 'utf8');
        assert.match(summary, /S4a GM-Semantik ohne Tools \(Arm gm\)/);
        assert.match(summary, /Gegen S1/);
        assert.match(summary, /keine API-Keys/);
    } finally {
        fs.rmSync(out1, { recursive: true, force: true });
        fs.rmSync(out4, { recursive: true, force: true });
    }
});
