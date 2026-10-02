// P0 evaluation (docs/ARCHITECTURE_REVIEW_GM_TOOLS.md §16): the conditional figures leave a case without a valid answer
// out of the denominators; the end-to-end figures count it as an empty plan. The offline comparison of recorded runs
// separates a missing "quote" from a wrong reading with the product's validator, and tests discordant cases.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openProvider } from '../../tools/p0/lib/provider.mjs';
import { readJsonl } from '../../tools/p0/lib/util.mjs';
import { loadVocabulary, loadScenes } from '../../tools/p0/lib/interpreter.mjs';
import { scoreCase, aggregate, signTestP, fmtP } from '../../tools/p0/lib/score.mjs';
import * as v4 from '../../src/v4/interpret.js';
import { main as s1main, CORPUS_FILE, PRODUCT_VOCAB_FILE, s1MockResponder, goldAnswer, promptKit } from '../../tools/p0/s1_interpreter.mjs';
import { main as s4amain } from '../../tools/p0/s4a_gm_semantics.mjs';
import { compareRuns, main as compareMain } from '../../tools/p0/compare.mjs';

const quiet = { log: () => {}, progress: () => {} };
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `p0-${name}-`));
const vocab = loadVocabulary(PRODUCT_VOCAB_FILE);
const scenes = loadScenes();
const corpus = readJsonl(CORPUS_FILE);

test('end to end: a case without a valid answer is an empty plan; the conditional figures leave it out', () => {
    const kase = { expect: [{ type: 'go', to: 'loc.x' }] };
    const right = scoreCase(kase, [{ seq: 1, type: 'go', to: 'loc.x' }]);
    const neg = scoreCase({ expect: [] }, []);
    const agg = aggregate([
        { score: right, predicted_count: 1, gold: 1 },
        { score: null, predicted_count: 0, gold: 2 },
        { score: neg, predicted_count: 0, gold: 0 },
        { score: null, predicted_count: 0, gold: 0 },
    ]);
    assert.equal(agg.recall_pct, 100, 'conditional: 1 of the 1 gold command of the answered cases');
    assert.equal(agg.exact_cases_pct, 100);
    assert.deepEqual(
        { failed: agg.end_to_end.failed, failed_gold: agg.end_to_end.failed_gold, gold: agg.end_to_end.gold_commands, recall: agg.end_to_end.recall_pct, exact: agg.end_to_end.exact_cases_pct },
        { failed: 2, failed_gold: 2, gold: 3, recall: 33.3, exact: 50 },
    );
    assert.equal(agg.end_to_end.negative_precision_pct, 100, 'a negative case without an answer commits nothing');
    assert.equal(aggregate([{ score: null, predicted_count: 0 }]).end_to_end, null, 'without the gold count of a failed case: unknown');
});

test('sign test: exact two-sided binomial on the discordant cases', () => {
    assert.equal(fmtP(signTestP(11, 2)), '0.022');
    assert.equal(fmtP(signTestP(4, 1)), '0.375');
    assert.equal(fmtP(signTestP(3, 1)), '0.625');
    assert.equal(signTestP(0, 0), 1);
    assert.equal(signTestP(5, 5), 1);
    assert.equal(fmtP(signTestP(35, 2)), '< 0.001');
});

test('S1 and S4a report both readings; the comparison tells a missing quote from a wrong reading', async () => {
    const out1 = tmp('cmp-s1');
    const out4 = tmp('cmp-s4a');
    try {
        const target = corpus.find((c) => c.id === 'real_v2_05');
        const ids = ['real_v2_05', 'real_v2_03', ...corpus.filter((c) => c.expect.length).slice(0, 3).map((c) => c.id), ...corpus.filter((c) => !c.expect.length).slice(0, 2).map((c) => c.id)];
        const cases = ['--cases', [...new Set(ids)].join(',')];
        const kit = promptKit('v4');
        const p1 = await openProvider({ backend: 'mock', mock: s1MockResponder(corpus, scenes, kit.vocab, { user: kit.user }) });
        assert.equal(await s1main(['--out', out1, '--concurrency', '4', '--mode', 'plain', ...cases], { ...quiet, provider: p1, decision: null }), 0);
        assert.match(fs.readFileSync(path.join(out1, 'summary.md'), 'utf8'), /Recall Ende-zu-Ende/);
        // S4a: the right reading of real_v2_05 without its "quote", in both attempts
        const base = s1MockResponder(corpus, scenes, vocab, { user: v4.interpreterUser });
        const noQuote = JSON.stringify({ commands: goldAnswer(vocab, target).commands.map(({ quote, ...c }) => c) });
        const mock = async (req) => (req.messages.find((m) => m.role === 'user')?.content === v4.interpreterUser(scenes[target.scene], target.text) ? { content: noQuote } : base(req));
        const p4 = await openProvider({ backend: 'mock', mock });
        assert.equal(await s4amain(['--out', out4, '--compare', path.join(out1, 'results.json'), ...cases], { ...quiet, provider: p4, vocab }), 0);
        const s1res = JSON.parse(fs.readFileSync(path.join(out1, 'results.json'), 'utf8'));
        const s4res = JSON.parse(fs.readFileSync(path.join(out4, 'results.json'), 'utf8'));
        assert.equal(s4res.agg.failed, 1);
        assert.equal(s4res.agg.recall_pct, 100, 'conditional: the failed case is out of the denominator');
        assert.equal(s4res.agg.end_to_end.failed_gold, 1);
        assert.ok(s4res.agg.end_to_end.recall_pct < 100, 'end to end: its gold command is missed');
        assert.deepEqual(s4res.compare.only_a.map((x) => x.id), ['real_v2_05']);
        const summary = fs.readFileSync(path.join(out4, 'summary.md'), 'utf8');
        assert.match(summary, /Recall Ende-zu-Ende \(ungültig = verpasst\)/);
        assert.match(summary, /Vorzeichentest .*p = 1/);

        const res = compareRuns([{ label: 'S1', run: s1res }, { label: 'S4a', run: s4res }], { vocab, scenes });
        assert.equal(res.cases, s1res.records.length);
        const [d] = res.runs[1].invalid;
        assert.equal(d.kind, 'quote_only');
        assert.equal(d.exact_with_quote, true, 'with the message as its quote the reading is exact');
        assert.match(d.errors[0], /\(activity\).*missing required "quote"/, 'the product validator names the command and the field');
        assert.deepEqual(res.pairs[0].end_to_end.only_a, ['real_v2_05']);
        assert.deepEqual(res.pairs[0].lenient.only_a, [], 'a format failure, not a wrong reading');
        const lines = [];
        assert.equal(await compareMain([path.join(out1, 'results.json'), path.join(out4, 'results.json')], { log: (t) => lines.push(t), vocab, scenes }), 0);
        assert.match(lines.join('\n'), /nur "quote" fehlt → mit Quote exakt/);
        assert.equal(await compareMain([path.join(out1, 'results.json')], { log: () => {} }), 1, 'needs two runs');
    } finally {
        fs.rmSync(out1, { recursive: true, force: true });
        fs.rmSync(out4, { recursive: true, force: true });
    }
});
