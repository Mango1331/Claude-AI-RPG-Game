// Architecture patch A (.127), A1: the offline processing corpus and its baseline (tools/replay/replay.mjs). The full
// corpus (Batch17–19 and the Batch16 sale, ~75 s) is checked by `npm run replay:check`; this suite replays four small
// runs on every `npm test`: Batch19 Mage (the current integration chain), Batch19 Rogue, Batch18 Mage (with a failed
// extraction) and the Batch16 Rogue sale (record 78, a money case).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadCorpus, replayCorpus, compareToBaseline, firstDifference, normalizeEvent, IGNORED, DEFAULT_BASELINE } from '../../tools/replay/replay.mjs';

const baseline = JSON.parse(zlib.gunzipSync(fs.readFileSync(DEFAULT_BASELINE)).toString('utf8'));
const QUICK = ['b16-rogue-sale', 'b18-mage', 'b19-mage', 'b19-rogue'];

test('A1: the corpus holds every recorded engine call and the baseline names its start commit', () => {
    const runs = loadCorpus();
    assert.deepEqual(runs.map((r) => r.source.label).sort(), ['b16-rogue-sale', 'b17-mage', 'b17-rogue', 'b17-warrior', 'b18-mage', 'b18-rogue', 'b18-warrior', 'b19-mage', 'b19-rogue', 'b19-warrior']);
    for (const r of runs) {
        const answers = Object.values(r.answers).flat();
        assert.ok(answers.length > 0, r.source.label);
        assert.equal(answers.filter((a) => a.missing).length, 0, `${r.source.label}: answer missing from the completion log`);
        assert.match(r.source.chat_sha256, /^[0-9a-f]{64}$/);
    }
    assert.equal(baseline.sha, 'b8d2af4b76cd0bc52ac178b8c500e5733878ecee');
    assert.equal(baseline.engine, '4.3.0-c.6.6.126');
    assert.deepEqual(baseline.ignored, IGNORED);
    assert.equal(Object.values(baseline.runs).reduce((n, r) => n + Object.keys(r.cases).length, 0), 2235);
});

test('A1: the four quick runs replay exactly as on the start commit, from whole and valid states', async () => {
    const result = await replayCorpus(undefined, undefined, { labels: QUICK });
    const sub = { ...baseline, runs: Object.fromEntries(QUICK.map((l) => [l, baseline.runs[l]])) };
    const { compared, diffs } = compareToBaseline(sub, result);
    assert.equal(compared, QUICK.reduce((n, l) => n + Object.keys(baseline.runs[l].cases).length, 0));
    assert.deepEqual(diffs, []);
    for (const [label, run] of Object.entries(result.runs)) {
        assert.equal(Object.values(run.cases).filter((c) => c.error).length, 0, label);
        assert.equal(run.fold.fold_errors, 0, label);
        assert.equal(run.fold.problem_count, 0, label);
        assert.ok(run.coverage.player > 0 && run.coverage.reply > 0, label);
    }
    // what the corpus covers beyond plain turns
    assert.equal(result.runs['b18-mage'].coverage.reply_failed, 1);
    assert.ok(result.runs['b19-mage'].coverage.player_board > 0 && result.runs['b19-mage'].coverage.player_control > 0);
});

test('A1: the Batch16 sale (record 78) is part of the baseline as the current engine books it', () => {
    const out = baseline.runs['b16-rogue-sale'].cases['b16-rogue-sale#78'];
    const bid = out.events.find((e) => e.t === 'offer.created' && e.d.offer.bid);
    assert.ok(bid, 'the buyer\'s 17 cp bid for four pelts and nine fangs is an offer');
    assert.equal(bid.d.offer.price_cp, 17);
    assert.deepEqual(bid.d.offer.lines.map((l) => l.qty), [4, 9]);
});

test('A1: only the named diagnostic fields are ignored; every other difference is reported', () => {
    const a = { kind: 'reply', events: [{ t: 'extract.applied', d: { version: 'x', ms: 1, deltas: 2 } }, { t: 'coin.changed', d: { id: 'pc', delta: 5, ms: 3 } }], corrections: ['c'] };
    const same = structuredClone(a);
    same.events[0].d.ms = 999;
    same.events[0].d.version = 'y';
    assert.equal(firstDifference({ ...a, events: a.events.map(normalizeEvent) }, { ...same, events: same.events.map(normalizeEvent) }), null);
    const coin = structuredClone(a);
    coin.events[1].d.ms = 4; // not a named diagnostic field of this event type
    assert.deepEqual(firstDifference({ ...a, events: a.events.map(normalizeEvent) }, { ...coin, events: coin.events.map(normalizeEvent) }), { event: 1, baseline: 'coin.changed', now: 'coin.changed' });
    assert.deepEqual(firstDifference(a, { ...a, corrections: [] }), { field: 'corrections' });
    assert.deepEqual(firstDifference(a, { ...a, continuation: { kind: 'world_not_applied' } }), { field: 'continuation' });
    assert.deepEqual(firstDifference(a, { ...a, events: [...a.events, { t: 'xp.changed', d: {} }] }), { event: 2, baseline: null, now: 'xp.changed' });
});
