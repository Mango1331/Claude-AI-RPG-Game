// Architecture patch A (.127), A1: the offline processing corpus and its baseline (tools/replay/replay.mjs). The full
// corpus (Batch17–19 and the Batch16 sale, ~75 s) is checked by `npm run replay:check`; this suite replays four small
// runs on every `npm test`: Batch19 Mage (the current integration chain), Batch19 Rogue, Batch18 Mage (with a failed
// extraction) and the Batch16 Rogue sale (record 78, a money case).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadCorpus, replayCorpus, compareToBaseline, firstDifference, normalizeEvent, IGNORED, DEFAULT_BASELINE, acceptedDiffs, recordFingerprint } from '../../tools/replay/replay.mjs';

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
    assert.equal(ACCEPTED.baseline_sha, baseline.sha);
    assert.equal(Object.values(baseline.runs).reduce((n, r) => n + Object.keys(r.cases).length, 0), 2235);
});

// Package C (.132): the intended differences to the .126 baseline, record by record with their reason
// (tools/replay/replay.mjs --accepted; docs/PATCH_ARCH_C132_POPULATION_AGE.md)
// Finance patch F (.138): the D list plus six individually reasoned records (docs/FIX138_FINANCE.md)
const ACCEPTED_F138 = JSON.parse(fs.readFileSync(new URL('./accepted_f138_vs_126.json', import.meta.url), 'utf8'));
// Finance consolidation (.142): the F list checked against the .141 replay record by record – unchanged entries kept,
// additive contract fields named, every other change reasoned (docs/FIX142_FINANCE_CONSOLIDATION.md)
const ACCEPTED142 = JSON.parse(fs.readFileSync(new URL('./accepted_f142_vs_126.json', import.meta.url), 'utf8'));
const ACCEPTED143 = JSON.parse(fs.readFileSync(new URL('./accepted_f143_vs_126.json', import.meta.url), 'utf8'));
// Finance simplification (.144, S1+S2): the .143 list checked against the full .143 replay record by record; unchanged
// entries kept, every changed record in one of six reasoned categories with the .143 entry it supersedes
const ACCEPTED144 = JSON.parse(fs.readFileSync(new URL('./accepted_f144_vs_126.json', import.meta.url), 'utf8'));
const ACCEPTED146 = JSON.parse(fs.readFileSync(new URL('./accepted_f146_vs_126.json', import.meta.url), 'utf8'));
const ACCEPTED = JSON.parse(fs.readFileSync(new URL('./accepted_design148_vs_126.json', import.meta.url), 'utf8'));
const F144 = ['finance 144 payment card', 'finance 144 contract fields', 'finance 144 acceptance hint', 'finance 144 price open', 'finance 144 unit limit', 'finance 144 acceptance', 'finance 144 own coin'];
const SUB = { ...baseline, runs: Object.fromEntries(QUICK.map((l) => [l, baseline.runs[l]])) };
let quick = null; // the four quick runs, replayed once for this file
const quickRuns = async () => (quick ||= await replayCorpus(undefined, undefined, { labels: QUICK }));
test('A1/C: the four quick runs replay as on the start commit, from whole and valid states, apart from the accepted package C records with their exact output', async () => {
    const result = await quickRuns();
    const { compared, diffs } = compareToBaseline(SUB, result);
    assert.equal(compared, QUICK.reduce((n, l) => n + Object.keys(baseline.runs[l].cases).length, 0));
    assert.deepEqual(diffs.map((d) => d.id).sort(), Object.keys(ACCEPTED.cases).filter((id) => QUICK.includes(id.split('#')[0])).sort());
    assert.ok(diffs.every((d) => ['representation','D offer contract','finance 138','finance 142','finance 142 contract fields', 'batch21 integration 146', 'design148 danger', 'design148 area', ...F144].includes(ACCEPTED.cases[d.id].category)), 'in quick runs only the individually fingerprinted C/D/F/integration differences are allowed');
    const { open, accepted, stale } = acceptedDiffs(diffs, ACCEPTED.cases, result);
    assert.deepEqual([open, stale, accepted.length], [[], [], diffs.length], 'every accepted record has exactly the fingerprinted output');
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

test('A1 review: the check itself fails on a missing run and on replay, fold or validation errors', () => {
    const run = (cases, fold = { fold_errors: 0, problem_count: 0 }) => ({ cases, fold });
    const base = { runs: { a: { cases: { 'a#1': { kind: 'player', events: [] } } }, b: { cases: { 'b#1': { kind: 'reply', events: [] } } } } };
    const whole = { runs: { a: run({ 'a#1': { kind: 'player', events: [] } }), b: run({ 'b#1': { kind: 'reply', events: [] } }) } };
    assert.deepEqual(compareToBaseline(base, whole).diffs, []);
    assert.deepEqual(compareToBaseline(base, { runs: { a: whole.runs.a } }).diffs, [{ id: 'b', missing: 'baseline run not replayed' }]);
    assert.deepEqual(compareToBaseline(base, { runs: { ...whole.runs, c: run({}) } }).diffs, [{ id: 'c', missing: 'run not in baseline' }]);
    const broken = { runs: { a: run({ 'a#1': { kind: 'player', events: [] } }, { fold_errors: 2, problem_count: 1 }), b: run({ 'b#1': { kind: 'reply', error: 'boom' } }) } };
    assert.deepEqual(compareToBaseline(base, broken).diffs.map((d) => d.integrity || d.field || d.missing), ['2 fold error(s)', '1 validation problem(s)', '1 replay error(s)', 'error']);
});

// Review of package C: acceptance is bound to the exact output of .132 (fingerprint), not to the record id. An extra,
// unexpected change inside an accepted record (money, a quest, an event) is an open difference again.
test('C review: an unexpected change of money, quest or events inside an already accepted record is detected', async () => {
    const result = await quickRuns();
    const { diffs } = compareToBaseline(SUB, result);
    const ids = ['b19-mage#13', 'b16-rogue-sale#5', 'b19-mage#20'];
    for (const id of ids) assert.ok(ACCEPTED.cases[id] && diffs.some((d) => d.id === id), `${id} is an accepted difference`);
    assert.equal(recordFingerprint(result.runs['b19-mage'].cases['b19-mage#13']), ACCEPTED.cases['b19-mage#13'].fingerprint);
    const changed = (id, change) => {
        const r = structuredClone(result);
        change(r.runs[id.split('#')[0]].cases[id]);
        return acceptedDiffs(compareToBaseline(SUB, r).diffs, ACCEPTED.cases, r).open;
    };
    const mutations = {
        money: ['b19-mage#20', (c) => c.events.push({ t: 'coin.changed', d: { id: 'pc', value: 999, delta: 5 } })],
        quest: ['b19-mage#13', (c) => { c.events.find((e) => e.t === 'quest.created').d.quest.payout_cp += 1; }],
        'quest age': ['b16-rogue-sale#5', (c) => { const q = c.events.find((e) => e.t === 'quest.created').d.quest; if (q.hunt) q.hunt.age = 'young'; else q.reward = 'other'; }],
        'event dropped': ['b19-mage#20', (c) => { c.events.splice(1, 1); }],
        'event reordered': ['b19-mage#20', (c) => { c.events.reverse(); }],
        correction: ['b19-mage#13', (c) => { c.corrections = [...(c.corrections || []), 'an unexpected correction']; }],
    };
    for (const [what, [id, change]] of Object.entries(mutations)) {
        const open = changed(id, change);
        assert.equal(open.length, 1, what);
        assert.equal(open[0].id, id, what);
        assert.match(open[0].accepted_record_changed.now, /^sha256:[0-9a-f]{64}$/, what);
        assert.notEqual(open[0].accepted_record_changed.now, open[0].accepted_record_changed.expected, what);
    }
    // an output equal to the accepted one in another key order is the same output
    const reordered = structuredClone(result), c = reordered.runs['b19-mage'].cases['b19-mage#13'];
    reordered.runs['b19-mage'].cases['b19-mage#13'] = Object.fromEntries(Object.entries(c).reverse());
    assert.deepEqual(acceptedDiffs(compareToBaseline(SUB, reordered).diffs, ACCEPTED.cases, reordered).open, []);
    // a listed record without a fingerprint accepts nothing
    const bare = structuredClone(ACCEPTED.cases);
    delete bare['b19-mage#13'].fingerprint;
    assert.deepEqual(acceptedDiffs(diffs, bare, result).open.map((d) => d.id), ['b19-mage#13']);
});

test('D retains every original C fingerprint and reason unchanged',()=>{
 const c=JSON.parse(fs.readFileSync(new URL('./accepted_c132_vs_126.json',import.meta.url)));
 for(const [id,entry] of Object.entries(c.cases)) assert.deepEqual(ACCEPTED_F138.cases[id],entry,id);
});

test('F retains every D fingerprint and reason unchanged (one reasoned supersession) and adds exactly the eight reasoned .138–.140 records', () => {
    const d = JSON.parse(fs.readFileSync(new URL('./accepted_d133_vs_126.json', import.meta.url)));
    const ACCEPTED = ACCEPTED_F138;
    const superseded = Object.entries(ACCEPTED.cases).filter(([, e]) => e.supersedes).map(([id]) => id);
    // review of .138: the one D record whose output the addressee-choice condition rule changes, with its old fingerprint
    assert.deepEqual(superseded, ['b19-warrior#82']);
    assert.equal(ACCEPTED.cases['b19-warrior#82'].supersedes, d.cases['b19-warrior#82'].fingerprint);
    for (const [id, entry] of Object.entries(d.cases)) if (!superseded.includes(id)) assert.deepEqual(ACCEPTED.cases[id], entry, id);
    const added = Object.keys(ACCEPTED.cases).filter((id) => !d.cases[id]).sort();
    assert.deepEqual(added, ['b17-rogue#19', 'b17-warrior#134', 'b17-warrior#73', 'b18-rogue#196', 'b18-warrior#44', 'b18-warrior#54', 'b19-mage#132', 'b19-mage#152']);
    for (const id of added) assert.equal(ACCEPTED.cases[id].category, 'finance 138', id);
});

test('F .142 keeps every F entry or supersedes it with its old fingerprint and a named cause; every new record is named or reasoned', () => {
    for (const [id, entry] of Object.entries(ACCEPTED_F138.cases)) {
        const now = ACCEPTED142.cases[id];
        // a record whose output is the .126 baseline again is no accepted difference any more; it is named with its reason
        if (!now) { assert.ok(ACCEPTED142.returned?.[id]?.reason, `${id} returned to the baseline with a reason`); continue; }
        if (now.fingerprint === entry.fingerprint) { assert.deepEqual(now, entry, id); continue; }
        assert.equal(now.supersedes, entry.fingerprint, id);
        assert.ok(now.finance_142 || (now.category === 'finance 142' && now.reason), id);
    }
    for (const [id, entry] of Object.entries(ACCEPTED142.cases)) {
        if (ACCEPTED_F138.cases[id]) continue;
        assert.ok(['finance 142', 'finance 142 contract fields'].includes(entry.category), id);
        if (entry.category === 'finance 142') assert.ok(entry.reason && entry.reason.length > 40, id);
        assert.match(entry.fingerprint, /^sha256:[0-9a-f]{64}$/, id);
    }
});

test('F .143 pins only the individually reviewed boundary changes',()=>{
 const changed=[];
 const ACCEPTED=ACCEPTED143;
 for(const[id,entry]of Object.entries(ACCEPTED142.cases)){
  const now=ACCEPTED.cases[id];
  if(!now){assert.ok(ACCEPTED.returned[id]?.reason);changed.push(id);continue;}
  if(now.fingerprint===entry.fingerprint)assert.deepEqual(now,entry,id);
  else{assert.equal(now.supersedes_142,entry.fingerprint,id);assert.ok(now.finance_143?.length>40,id);changed.push(id);}
 }
 assert.deepEqual(changed.sort(),['b16-rogue-sale#78','b17-rogue#138','b17-rogue#170','b18-rogue#341','b18-warrior#52','b18-warrior#160','b18-warrior#166','b18-warrior#260','b19-rogue#32','b19-warrior#328'].sort());
});

test('F .144 keeps every .143 entry or supersedes it in a reasoned .144 category; the five new records are reasoned', () => {
    const ACCEPTED = ACCEPTED144;
    const changed = [], added = [];
    for (const [id, entry] of Object.entries(ACCEPTED143.cases)) {
        const now = ACCEPTED.cases[id];
        assert.ok(now, `${id} still differs from the baseline`);
        if (now.fingerprint === entry.fingerprint) assert.deepEqual(now, entry, id);
        else { assert.ok(F144.includes(now.category), id); assert.deepEqual(now.supersedes_143, { category: entry.category, fingerprint: entry.fingerprint }, id); assert.ok(now.reason?.length > 80, id); changed.push(id); }
    }
    for (const [id, entry] of Object.entries(ACCEPTED.cases)) if (!ACCEPTED143.cases[id]) { assert.ok(F144.includes(entry.category), id); added.push(id); }
    assert.equal(changed.length, 35);
    assert.deepEqual(added.sort(), ['b17-warrior#185', 'b17-warrior#69', 'b18-rogue#335', 'b18-rogue#341', 'b19-warrior#163'].sort());
    assert.deepEqual(ACCEPTED.returned, ACCEPTED143.returned);
    // money moves in a .144 record only where the player's explicit acceptance of stored positions is booked
    for (const [id, e] of Object.entries(ACCEPTED.cases)) if (e.category === 'finance 144 acceptance') assert.ok(['b17-warrior#69', 'b17-warrior#185', 'b19-warrior#163'].includes(id));
});

test('.146 changes only the seven reviewed integration records; all other exact fingerprints stay unchanged', () => {
    const ACCEPTED = ACCEPTED146;
    const changed = [];
    assert.deepEqual(ACCEPTED.returned, ACCEPTED144.returned);
    assert.deepEqual(Object.keys(ACCEPTED.cases).sort(), Object.keys(ACCEPTED144.cases).sort());
    for (const [id, old] of Object.entries(ACCEPTED144.cases)) {
        const now = ACCEPTED.cases[id];
        if (old.fingerprint === now.fingerprint) assert.deepEqual(now, old, id);
        else {
            changed.push(id);
            assert.equal(now.category, 'batch21 integration 146');
            assert.deepEqual(now.supersedes_145, { category: old.category, fingerprint: old.fingerprint });
            assert.ok(now.reason.length > 100);
        }
    }
    assert.deepEqual(changed.sort(), ['b17-warrior#126', 'b18-rogue#328', 'b18-warrior#42',
        'b18-warrior#44', 'b18-warrior#52', 'b19-mage#140', 'b19-mage#151'].sort());
});

// .148 is a deliberate design release; old accepted outputs remain immutable.
test('.148 supersedes only the 40 individually reviewed display/AoE records', () => {
    const changed = [];
    for (const [id, entry] of Object.entries(ACCEPTED.cases)) {
        const old = ACCEPTED146.cases[id];
        if (!entry.category.startsWith('design148 ')) { assert.deepEqual(entry, old, id); continue; }
        changed.push(id);assert.match(entry.reason, new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.match(entry.supersedes_147.fingerprint, /^sha256:/);
        if (old) assert.deepEqual(entry.previous_acceptance, old, id);
    }
    assert.equal(changed.length, 40);
});
