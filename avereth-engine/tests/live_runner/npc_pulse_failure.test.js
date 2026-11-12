// P2-B of the GPT review of 2449990 (patch_plans_10b/REVIEW_NPC_PULSE_RUNNER_2449990_GPT.md §4): a run whose guide asks
// for the npc_pulse evaluation and gets none – it failed, or its files are missing – says so in its own report and
// run.json, and the batch marks it and does not end as plainly completed. The original exports stay as they are.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runBatch, batchArgs } from '../../tools/st_live/live/batch.mjs';
import { NPC_SCENARIOS } from '../../tools/st_live/live/scenarios.mjs';

function temporary(t) {
    const p = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-npc-fail-'));
    t.after(() => fs.rmSync(p, { recursive: true, force: true }));
    return p;
}
const arg = (args, name) => args[args.indexOf(name) + 1];
/** An archived run as run_live leaves it: the exports, and the evaluation (ok, failed, or as 2449990 left a failure: absent). */
function archive(args, analysis) {
    const s = NPC_SCENARIOS.find((x) => x.id === arg(args, '--scenario'));
    const dir = path.join(arg(args, '--runs'), 'run-npc_pulse_test');
    fs.mkdirSync(dir, { recursive: true });
    const meta = { scenario: s, seed: Number(arg(args, '--seed')), end: { kind: 'done' }, turns: Array(70).fill({}), protection: { unchanged: true }, secretHits: 0 };
    if (analysis === 'ok') meta.analysis = { id: 'npc_pulse', ok: true, files: ['npc-pulse.json', 'npc-pulse.md'] };
    if (analysis === 'failed') meta.analysis = { id: 'npc_pulse', ok: false, error: 'boom in the evaluation' };
    fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify(meta));
    fs.writeFileSync(path.join(dir, 'evaluation.json'), JSON.stringify({ character: { class: s.baseClass.toLowerCase() }, progression: null }));
    fs.writeFileSync(path.join(dir, 'report.md'), '# synthetic');
    fs.writeFileSync(path.join(dir, 'chat.jsonl'), '{}\n');
    if (analysis === 'ok') { fs.writeFileSync(path.join(dir, 'npc-pulse.json'), '{}'); fs.writeFileSync(path.join(dir, 'npc-pulse.md'), '# npc-pulse'); }
}

test('P2-B: a batch run without a valid npc_pulse evaluation is marked in the batch report, and the batch is not "completed"', async (t) => {
    for (const [second, mark] of [['failed', /Auswertung fehlgeschlagen: boom in the evaluation/], ['absent', /Auswertung fehlt/]]) {
        const root = path.join(temporary(t), 'npc-batch');
        const kinds = ['ok', second, 'ok'];
        const result = await runBatch({ root, args: batchArgs(['--mode', 'npc']).args, seed: 3, maxHours: 1, mode: 'npc' }, { revision: () => 'fixed', launch: async (args) => { archive(args, kinds.shift()); return { code: 0 }; } });
        assert.equal(result.status, 'analysis_incomplete', second);
        assert.deepEqual(result.runs.map((r) => r.analysisOk), [true, false, true]);
        const report = fs.readFileSync(path.join(root, 'report.md'), 'utf8');
        assert.match(report, mark);
        assert.match(report, /1 von 3 Läufen ohne gültige NPC-\/PULSE-Auswertung/);
        assert.match(report, /\[npc-pulse\.md\]\(001-npc-sociable\//, 'the evaluated run keeps its link');
        assert.ok(fs.existsSync(path.join(root, '002-npc-wary', 'run-npc_pulse_test', 'chat.jsonl')), 'the exports stay');
        assert.ok(fs.existsSync(path.join(root, '003-npc-inquisitive', 'run-npc_pulse_test', 'npc-pulse.md')), 'an isolated third run still exports its own analysis');
    }
    // all evaluated: completed as before
    const root = path.join(temporary(t), 'npc-batch');
    const ok = await runBatch({ root, args: batchArgs(['--mode', 'npc']).args, seed: 3, maxHours: 1, mode: 'npc' }, { revision: () => 'fixed', launch: async (args) => { archive(args, 'ok'); return { code: 0 }; } });
    assert.equal(ok.status, 'completed');
    assert.doesNotMatch(fs.readFileSync(path.join(root, 'report.md'), 'utf8'), /ohne gültige/);
});

test('P2-B: the run\'s own evaluation step: a failure is recorded (run.json status, a notice under the report title), no npc-pulse file pretends a result', async () => {
    const { npcPulseExports, withAnalysisReport } = await import('../../tools/st_live/live/npc_pulse.mjs');
    const failed = npcPulseExports({ messages: [], calls: [], runId: 'r', analyse: () => { throw new Error('boom in the evaluation'); } });
    assert.deepEqual([failed.ok, failed.files, failed.status], [false, [], { id: 'npc_pulse', ok: false, error: 'boom in the evaluation' }]);
    const report = withAnalysisReport('# Avereth-Livetest r\n\n## Kurzfassung\n', failed);
    const lines = report.split('\n');
    assert.equal(lines[0], '# Avereth-Livetest r');
    assert.match(lines.slice(1, 4).join('\n'), /NPC\/PULSE-AUSWERTUNG FEHLGESCHLAGEN: boom in the evaluation/);
    assert.match(report, /Originalexporte .* vollständig/);
    assert.match(report, /npm run live:st:npc-eval/);
    const fine = npcPulseExports({ messages: [{ mes: 'x', is_user: false, extra: {} }], calls: [], runId: 'r' });
    assert.deepEqual([fine.ok, fine.files.map((f) => f[0]), fine.status.ok], [true, ['npc-pulse.json', 'npc-pulse.md'], true]);
    assert.match(withAnalysisReport('# T\n', fine), /## NPC\/PULSE-Auswertung/);
    assert.equal(withAnalysisReport('# T\n', null), '# T\n', 'a guide without the evaluation keeps its report');
});
