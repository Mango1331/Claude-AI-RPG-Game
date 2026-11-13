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
const ACCEPTED148 = JSON.parse(fs.readFileSync(new URL('./accepted_design148_vs_126.json', import.meta.url), 'utf8'));
const ACCEPTED149 = JSON.parse(fs.readFileSync(new URL('./accepted_design149_vs_126.json', import.meta.url), 'utf8'));
const ACCEPTED157 = JSON.parse(fs.readFileSync(new URL('./accepted_fix150_vs_126.json', import.meta.url), 'utf8'));
const ACCEPTED159 = JSON.parse(fs.readFileSync(new URL('./accepted_fix159_vs_126.json', import.meta.url), 'utf8'));
const ACCEPTED160 = JSON.parse(fs.readFileSync(new URL('./accepted_fix160_vs_126.json', import.meta.url), 'utf8'));
// PULSE package A (.162): every .160/.161 acceptance kept exactly or superseded only for the PULSE decision fields
const ACCEPTED162 = JSON.parse(fs.readFileSync(new URL('./accepted_pulse162_vs_126.json', import.meta.url), 'utf8'));
// .163 (review of .162 R2): six turtle searches now registered as sought contact, everything else as .162
const ACCEPTED163 = JSON.parse(fs.readFileSync(new URL('./accepted_pulse163_vs_126.json', import.meta.url), 'utf8'));
// PULSE package C (.164): the pause turns' draw before their booking, their safety; two rest-then-hunt-GO turns draw
const ACCEPTED164 = JSON.parse(fs.readFileSync(new URL('./accepted_pulse164_vs_126.json', import.meta.url), 'utf8'));
// PULSE package B (.167): the window inside a Living Dungeon; five Glimmerdeep records of b17-rogue
const ACCEPTED167 = JSON.parse(fs.readFileSync(new URL('./accepted_pulse167_vs_126.json', import.meta.url), 'utf8'));
// NPC E2-A (.169): known_at/desk in the player outcome; two group person.new refused as collective_person instead of ambient
const ACCEPTED169 = JSON.parse(fs.readFileSync(new URL('./accepted_e2a169_vs_126.json', import.meta.url), 'utf8'));
// NPC E2-B (.172): the null echo of thread.who in rejected thread items; one memory keeping its social part (R9)
const ACCEPTED172 = JSON.parse(fs.readFileSync(new URL('./accepted_e2b172_vs_126.json', import.meta.url), 'utf8'));
// Pilot 01 block C (.177): an NPC's "name = Alaric (Red)" refused (K8-1); the scene correction with the final place (K6a)
const ACCEPTED177 = JSON.parse(fs.readFileSync(new URL('./accepted_pilot177_vs_126.json', import.meta.url), 'utf8'));
// Batch 12./13.11. (.182): the status correction of a contract turned in this reply (P2-4); a form without meaning (P2-5)
const ACCEPTED182 = JSON.parse(fs.readFileSync(new URL('./accepted_batch182_vs_126.json', import.meta.url), 'utf8'));
// Monster A1 (.184): a creature's whole description as its look; no arthropod venom from the anchor attack alone
const ACCEPTED184 = JSON.parse(fs.readFileSync(new URL('./accepted_monster184_vs_126.json', import.meta.url), 'utf8'));
// Stabilization (.185): the conditional purchase line, the reasons of an unbooked purchase, the repair of priced:true
// without an offer, a purchase booked after the reply shown
const ACCEPTED185 = JSON.parse(fs.readFileSync(new URL('./accepted_stab185_vs_126.json', import.meta.url), 'utf8'));
// Monster A2 (.186): a humanoid creature fixed with its weapon; a refused creature.new echoing armed: null
const ACCEPTED = JSON.parse(fs.readFileSync(new URL('./accepted_monster186_vs_126.json', import.meta.url), 'utf8'));
const F144 = ['finance 144 payment card', 'finance 144 contract fields', 'finance 144 acceptance hint', 'finance 144 price open', 'finance 144 unit limit', 'finance 144 acceptance', 'finance 144 own coin'];
const SUB = { ...baseline, runs: Object.fromEntries(QUICK.map((l) => [l, baseline.runs[l]])) };
let quick = null; // the four quick runs, replayed once for this file
const quickRuns = async () => (quick ||= await replayCorpus(undefined, undefined, { labels: QUICK }));
test('A1/C: the four quick runs replay as on the start commit, from whole and valid states, apart from the accepted package C records with their exact output', async () => {
    const result = await quickRuns();
    const { compared, diffs } = compareToBaseline(SUB, result);
    assert.equal(compared, QUICK.reduce((n, l) => n + Object.keys(baseline.runs[l].cases).length, 0));
    assert.deepEqual(diffs.map((d) => d.id).sort(), Object.keys(ACCEPTED.cases).filter((id) => QUICK.includes(id.split('#')[0])).sort());
    assert.ok(diffs.every((d) => ['representation','D offer contract','finance 138','finance 142','finance 142 contract fields', 'batch21 integration 146', 'design148 danger', 'design148 area', 'design149 offensive growth', 'fix150 place fact', 'fix158 fact text', 'fix158 guild witness', 'fix159 board failure', 'fix160 board narration', 'pulse162 window', 'pulse162 road', 'pulse163 sought', 'pulse164 pause order', 'pulse164 early claim', 'pulse167 dungeon window', 'pulse167 dungeon diagnosis', 'e2a169 outcome fields', 'e2a169 group person', 'e2b172 thread who field', 'e2b172 memory social rest', 'pilot177 npc name subject', 'pilot177 scene correction place', 'batch182 status correction final', 'batch182 extractor form', 'monster184 creature look', 'monster184 no venom from the anchor attack', 'stab185 conditional purchase line', 'stab185 purchase reason', 'stab185 priced repair', 'stab185 bought after reply', 'monster186 humanoid loadout', 'monster186 armed field', ...F144].includes(ACCEPTED.cases[d.id].category)), 'in quick runs only the individually fingerprinted C/D/F/integration differences are allowed');
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
    const ACCEPTED = ACCEPTED148;
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

test('.149 keeps previous hashes except its 64 individually justified skill-growth records', () => {
    const ACCEPTED = ACCEPTED149;
    let changed=0;
    for(const [id, entry] of Object.entries(ACCEPTED.cases)) {
        const old=ACCEPTED148.cases[id];
        if(entry.category!=='design149 offensive growth'){assert.deepEqual(entry,old,id);continue;}
        changed++;assert.ok(entry.reason.startsWith(id+':'),id);assert.match(entry.supersedes_148,/^sha256:/);
        if(old)assert.deepEqual(entry.previous_acceptance,old,id);
    }
    assert.equal(changed,64);
});


test('.150 retains all .149 fingerprints and adds only the reviewed dangling-place fact', () => {
    const ACCEPTED=ACCEPTED157;
    for (const [id, entry] of Object.entries(ACCEPTED149.cases)) assert.deepEqual(ACCEPTED.cases[id], entry, id);
    const added = Object.keys(ACCEPTED.cases).filter(id => !ACCEPTED149.cases[id] && ACCEPTED.cases[id].category === 'fix150 place fact');
    assert.deepEqual(added, ['b19-warrior#354']);
    assert.equal(ACCEPTED.cases[added[0]].category, 'fix150 place fact');
    assert.ok(ACCEPTED.cases[added[0]].reason.startsWith(added[0] + ':'));
});


test('.157 adds only two original unique-band attacks and keeps all 479 earlier entries exactly', () => {
    const ACCEPTED=ACCEPTED157;
    const added = Object.entries(ACCEPTED.cases).filter(([, e]) => e.category === 'design157 unique area band');
    assert.deepEqual(added.map(([id]) => id).sort(), ['b17-rogue#183', 'b17-rogue#185']);
    const previous = Object.fromEntries(Object.entries(ACCEPTED.cases).filter(([, e]) => e.category !== 'design157 unique area band'));
    assert.equal(Object.keys(previous).length, 479);
    assert.equal(recordFingerprint(previous), 'sha256:ffb9fd900eb8357cf1cb3a10e9f99ae81aa93ce0c6eb8e31a074645d146d231a');
    for (const [id, entry] of added) { assert.ok(entry.reason.startsWith(id + ':')); assert.match(entry.fingerprint, /^sha256:[0-9a-f]{64}$/); }
});


test('.160 preserves 479 exact .159 acceptances and supersedes only 38 Board narrator instructions', () => {
    assert.deepEqual(Object.keys(ACCEPTED160.cases).sort(), Object.keys(ACCEPTED159.cases).sort());
    let changed = 0;
    for (const [id, old] of Object.entries(ACCEPTED159.cases)) {
        const now = ACCEPTED160.cases[id];
        if (now.category !== 'fix160 board narration') { assert.deepEqual(now, old, id); continue; }
        changed++;
        assert.deepEqual(now.previous_acceptance_159, old, id);
        assert.ok(now.reason.startsWith(id + ':'));
        assert.match(now.reason, /all other record fields are exactly the .159 output/);
        assert.match(now.fingerprint, /^sha256:[0-9a-f]{64}$/);
    }
    assert.equal(changed, 38);
});

test('.162 (PULSE A) keeps every .160 acceptance exactly or supersedes it only for the PULSE decision of its player record', () => {
    const counts = { kept: 0, superseded: 0, added: 0 };
    for (const [id, old] of Object.entries(ACCEPTED160.cases)) {
        const now = ACCEPTED162.cases[id];
        assert.ok(now, `${id} is still an accepted difference`);
        if (!now.category.startsWith('pulse162')) { assert.deepEqual(now, old, id); counts.kept++; continue; }
        counts.superseded++;
        assert.deepEqual(now.previous_acceptance_160, old, id);
    }
    for (const [id, now] of Object.entries(ACCEPTED162.cases)) {
        if (!now.category.startsWith('pulse162')) continue;
        if (!ACCEPTED160.cases[id]) counts.added++;
        assert.ok(['pulse162 window', 'pulse162 road'].includes(now.category), id);
        assert.ok(now.reason.startsWith(id + ': PULSE .162 adds this turn\'s one window'), id);
        assert.match(now.reason, /every other event, outcome field, rejection and correction is exactly the \.161 output/);
        assert.match(now.fingerprint, /^sha256:[0-9a-f]{64}$/);
        assert.ok(id.split('#')[0] && Number.isInteger(Number(id.split('#')[1])));
    }
    assert.deepEqual(counts, { kept: 351, superseded: 166, added: 523 });
    assert.equal(Object.keys(ACCEPTED162.cases).length, 1040);
    assert.deepEqual(ACCEPTED162.returned, ACCEPTED160.returned);
});

test('.163 keeps every .162 acceptance exactly except six turtle searches now read as sought contact', () => {
    assert.deepEqual(Object.keys(ACCEPTED163.cases).sort(), Object.keys(ACCEPTED162.cases).sort());
    const changed = [];
    for (const [id, old] of Object.entries(ACCEPTED162.cases)) {
        const now = ACCEPTED163.cases[id];
        if (now.category !== 'pulse163 sought') { assert.deepEqual(now, old, id); continue; }
        changed.push(id);
        assert.deepEqual(now.previous_acceptance_162, old, id);
        assert.ok(now.reason.startsWith(id + ':'));
        assert.match(now.reason, /every other event, outcome field, rejection and correction is exactly the \.162 output/);
    }
    assert.deepEqual(changed.sort(), ['b18-rogue#209', 'b18-rogue#243', 'b18-rogue#291', 'b18-rogue#295', 'b18-rogue#65', 'b18-rogue#71']);
});

test('.164 keeps every .163 acceptance exactly except the pause records of package C, each with its .163 acceptance', () => {
    assert.deepEqual(Object.keys(ACCEPTED164.cases).sort(), Object.keys(ACCEPTED163.cases).sort());
    const changed = { 'pulse164 pause order': [], 'pulse164 early claim': [] };
    for (const [id, old] of Object.entries(ACCEPTED163.cases)) {
        const now = ACCEPTED164.cases[id];
        if (!now.category.startsWith('pulse164')) { assert.deepEqual(now, old, id); continue; }
        changed[now.category].push(id);
        assert.deepEqual(now.previous_acceptance_163, old, id);
        assert.ok(now.reason.startsWith(`${id}: package C `), id);
        assert.match(now.reason, /every other event, outcome field, rejection and correction (is|are) exactly the \.163 output/);
        assert.doesNotMatch(now.reason, /cut short after/, 'no corpus record is cut short');
    }
    assert.equal(changed['pulse164 pause order'].length, 26);
    assert.deepEqual(changed['pulse164 early claim'].sort(), ['b16-rogue-sale#57', 'b18-warrior#391']);
    assert.deepEqual(ACCEPTED164.returned, ACCEPTED163.returned);
});

test('.167 keeps every .164/.166 acceptance exactly except five Glimmerdeep records of package B, each with its previous acceptance', () => {
    const ACCEPTED = ACCEPTED167;
    assert.deepEqual(Object.keys(ACCEPTED.cases).sort(), Object.keys(ACCEPTED164.cases).sort());
    const changed = [];
    for (const [id, old] of Object.entries(ACCEPTED164.cases)) {
        const now = ACCEPTED.cases[id];
        if (!now.category.startsWith('pulse167')) { assert.deepEqual(now, old, id); continue; }
        changed.push(`${id} ${now.category}`);
        assert.deepEqual(now.previous_acceptance_166, old, id);
        assert.ok(now.reason.startsWith(`${id}: package B `), id);
        assert.match(now.reason, /every other event, outcome field, rejection and correction is exactly the \.166 output/);
    }
    assert.deepEqual(changed.sort(), ['b17-rogue#191 pulse167 dungeon diagnosis', 'b17-rogue#193 pulse167 dungeon window', 'b17-rogue#195 pulse167 dungeon diagnosis', 'b17-rogue#199 pulse167 dungeon diagnosis', 'b17-rogue#217 pulse167 dungeon diagnosis']);
    assert.deepEqual(ACCEPTED.returned, ACCEPTED164.returned);
});

test('.169 (NPC E2-A) keeps every .167 acceptance exactly except records that change only in known_at/desk or a group person\'s rule name, each with its .167 acceptance', () => {
    const ACCEPTED = ACCEPTED169;
    const changed = { 'e2a169 outcome fields': [], 'e2a169 group person': [] };
    for (const [id, old] of Object.entries(ACCEPTED167.cases)) {
        const now = ACCEPTED.cases[id];
        if (!now.category.startsWith('e2a169')) { assert.deepEqual(now, old, id); continue; }
        changed[now.category].push(id);
        assert.deepEqual(now.previous_acceptance_167, old, id);
        assert.match(now.reason, /every other event, outcome field, rejection and correction is exactly the \.168 output/);
    }
    const added = Object.keys(ACCEPTED.cases).filter((id) => !ACCEPTED167.cases[id]);
    assert.deepEqual(added, ['b17-warrior#10']);
    assert.equal(ACCEPTED.cases['b17-warrior#10'].category, 'e2a169 group person');
    assert.deepEqual([changed['e2a169 outcome fields'].length, changed['e2a169 group person'].sort()], [123, ['b17-rogue#14']]);
    assert.deepEqual(ACCEPTED.returned, ACCEPTED167.returned);
});

test('.172 (NPC E2-B) keeps every .169 acceptance exactly except records that change only in the null echo of thread.who or keep one social memory rest, each with its .169 acceptance', () => {
    const ACCEPTED = ACCEPTED172;
    const changed = { 'e2b172 thread who field': [], 'e2b172 memory social rest': [] };
    for (const [id, old] of Object.entries(ACCEPTED169.cases)) {
        const now = ACCEPTED.cases[id];
        if (!now.category.startsWith('e2b172')) { assert.deepEqual(now, old, id); continue; }
        changed[now.category].push(id);
        assert.deepEqual(now.previous_acceptance_169, old, id);
    }
    for (const [id, now] of Object.entries(ACCEPTED.cases)) if (now.category.startsWith('e2b172')) {
        assert.ok(now.reason.startsWith(`${id}: NPC E2-B (`), id);
        assert.match(now.reason, /every other event, outcome field, rejection and correction is exactly the \.171 output/);
    }
    const added = Object.keys(ACCEPTED.cases).filter((id) => !ACCEPTED169.cases[id]).sort();
    assert.deepEqual(added, ['b17-mage#204', 'b17-rogue#278', 'b17-warrior#254', 'b18-rogue#90', 'b18-warrior#220', 'b18-warrior#30', 'b19-warrior#314']);
    assert.equal(ACCEPTED.cases['b17-warrior#254'].category, 'e2b172 memory social rest');
    assert.deepEqual(changed['e2b172 thread who field'].sort(), ['b17-rogue#84', 'b17-warrior#42', 'b19-warrior#294', 'b19-warrior#316']);
    assert.equal(changed['e2b172 memory social rest'].length, 0);
    assert.deepEqual(ACCEPTED.returned, ACCEPTED169.returned);
});

test('.177 (pilot 01 block C) keeps every .172 acceptance exactly except 14 records: an NPC\'s "name = Alaric (Red)" refused (K8-1) or the scene correction with the final place (K6a), each with its .172 acceptance', () => {
    const ACCEPTED = ACCEPTED177;
    const K8 = 'pilot177 npc name subject', K6 = 'pilot177 scene correction place';
    const changed = { [K8]: [], [K6]: [] };
    for (const [id, old] of Object.entries(ACCEPTED172.cases)) {
        const now = ACCEPTED.cases[id];
        if (!now.category.startsWith('pilot177')) { assert.deepEqual(now, old, id); continue; }
        assert.deepEqual(now.previous_acceptance_172, { category: old.category, fingerprint: old.fingerprint }, id);
    }
    for (const [id, now] of Object.entries(ACCEPTED.cases)) if (now.category.startsWith('pilot177')) {
        changed[now.category].push(id);
        assert.ok(now.reason.startsWith(`${id}: ${now.category === K8 ? 'K8-1' : 'K6a'}: `), id);
        assert.match(now.reason, now.category === K8 ? /identity_subject|is Alaric's name/ : /becomes "Part of the last reply took place in a scene the engine did not book/, id);
        assert.match(now.reason, /every other event, outcome field.* is exactly the \.176 output/, id);
    }
    assert.deepEqual(changed[K8].sort(), ['b17-rogue#10', 'b17-warrior#10', 'b17-warrior#18', 'b18-rogue#10', 'b18-rogue#380', 'b18-warrior#8', 'b19-mage#12']);
    assert.deepEqual(changed[K6].sort(), ['b17-warrior#270', 'b17-warrior#30', 'b17-warrior#64', 'b18-warrior#158', 'b19-mage#18', 'b19-mage#98', 'b19-warrior#252']);
    const added = Object.keys(ACCEPTED.cases).filter((id) => !ACCEPTED172.cases[id]).sort();
    assert.deepEqual(added, ['b17-rogue#10', 'b17-warrior#270', 'b17-warrior#30', 'b17-warrior#64', 'b18-rogue#380', 'b19-mage#12', 'b19-mage#18', 'b19-mage#98', 'b19-warrior#252']);
    assert.deepEqual(ACCEPTED.returned, ACCEPTED172.returned);
    assert.equal(ACCEPTED.engine, '4.3.0-c.6.6.177');
});

test('.182 (batch 12./13.11. P2-4, P2-5) keeps every .177 acceptance exactly except 18 records: the status correction of a contract turned in this reply, or a form without meaning read without a repair, each with its .177 acceptance', () => {
    const ACCEPTED = ACCEPTED182;
    const P4 = 'batch182 status correction final', P5 = 'batch182 extractor form';
    const changed = { [P4]: [], [P5]: [] };
    for (const [id, old] of Object.entries(ACCEPTED177.cases)) {
        const now = ACCEPTED.cases[id];
        if (!now.category.startsWith('batch182')) { assert.deepEqual(now, old, id); continue; }
        assert.deepEqual(now.previous_acceptance_177, { category: old.category, fingerprint: old.fingerprint }, id);
    }
    for (const [id, now] of Object.entries(ACCEPTED.cases)) if (now.category.startsWith('batch182')) {
        changed[now.category].push(id);
        assert.ok(now.reason.startsWith(`${id}: ${now.category === P4 ? 'P2-4' : 'P2-5'}: `), id);
        if (now.category === P4) assert.match(now.reason, /is ACTIVE: accepted, not yet turned in, nothing paid.* becomes .*is COMPLETED: turned in and paid once/, id);
        else assert.match(now.reason, /no repair call, unused_answers 1, extract\.applied repaired false/, id);
        assert.match(now.reason, /every (?:other )?event, outcome field, rejection and (?:other )?correction is exactly the \.181 output/i, id);
    }
    assert.deepEqual(changed[P4].sort(), ['b17-mage#138', 'b17-rogue#156', 'b17-rogue#22', 'b17-warrior#114', 'b17-warrior#158', 'b17-warrior#214', 'b18-rogue#26', 'b18-warrior#314', 'b19-mage#36', 'b19-rogue#32', 'b19-warrior#310']);
    assert.deepEqual(changed[P5].sort(), ['b17-mage#172', 'b17-mage#34', 'b17-rogue#106', 'b17-warrior#328', 'b18-mage#40', 'b18-rogue#52', 'b19-warrior#218']);
    const added = Object.keys(ACCEPTED.cases).filter((id) => !ACCEPTED177.cases[id]).sort();
    assert.deepEqual(added, ['b17-mage#138', 'b17-rogue#156', 'b17-rogue#22', 'b17-warrior#114', 'b17-warrior#158', 'b17-warrior#214', 'b17-warrior#328', 'b18-rogue#26', 'b18-warrior#314', 'b19-mage#36', 'b19-warrior#310']);
    assert.deepEqual(ACCEPTED.returned, ACCEPTED177.returned);
    assert.equal(ACCEPTED.engine, '4.3.0-c.6.6.182');
});

test('.184 (Monster A1) keeps every .182 acceptance exactly except 123 records: a creature\'s whole description as its look, or no arthropod venom gland from the anchor attack alone, each with its .182 acceptance', () => {
    const LOOK = 'monster184 creature look', VENOM = 'monster184 no venom from the anchor attack';
    const changed = { [LOOK]: [], [VENOM]: [] };
    for (const [id, old] of Object.entries(ACCEPTED182.cases)) {
        const now = ACCEPTED184.cases[id];
        if (!now.category.startsWith('monster184')) { assert.deepEqual(now, old, id); continue; }
        assert.deepEqual(now.previous_acceptance_182, { category: old.category, fingerprint: old.fingerprint }, id);
    }
    for (const [id, now] of Object.entries(ACCEPTED184.cases)) if (now.category.startsWith('monster184')) {
        changed[now.category].push(id);
        assert.ok(now.reason.startsWith(`${id}: Monster A1`), id);
        if (now.category === LOOK) assert.match(now.reason, /created with traits = the reported description .*stripped of that field the record is exactly the \.183 output/, id);
        else assert.match(now.reason, /no longer looted: the arthropod's kind, name and description carry no venom word, only its anchor attack "Bite\/Sting" did; stripped of that loot and of its creatures' traits the record is exactly the \.183 output/, id);
    }
    assert.equal(changed[LOOK].length, 114);
    assert.deepEqual(changed[VENOM].sort(), ['b17-rogue#135', 'b17-rogue#147', 'b17-rogue#183', 'b17-rogue#185', 'b17-rogue#187', 'b17-rogue#257', 'b17-rogue#263', 'b17-rogue#65', 'b17-rogue#85']);
    const added = Object.keys(ACCEPTED184.cases).filter((id) => !ACCEPTED182.cases[id]).sort();
    assert.deepEqual(added, ['b17-rogue#147', 'b17-rogue#187', 'b17-rogue#257', 'b17-rogue#263', 'b17-rogue#65', 'b17-rogue#85']);
    assert.deepEqual(ACCEPTED184.returned, ACCEPTED182.returned);
    assert.equal(ACCEPTED184.engine, '4.3.0-c.6.6.184');
});

test('.185 (stabilization) keeps every .184 acceptance exactly except 11 records of its four categories, each with its .184 acceptance where it had one', () => {
    const CATS = { 'stab185 conditional purchase line': ['b17-warrior#269', 'b17-warrior#65', 'b18-warrior#233', 'b19-mage#141'],
        'stab185 purchase reason': ['b16-rogue-sale#80', 'b17-warrior#66', 'b18-rogue#268', 'b18-warrior#234', 'b18-warrior#260'],
        'stab185 priced repair': ['b17-warrior#270'], 'stab185 bought after reply': ['b19-mage#142'] };
    const changed = Object.fromEntries(Object.keys(CATS).map((k) => [k, []]));
    for (const [id, old] of Object.entries(ACCEPTED184.cases)) {
        const now = ACCEPTED185.cases[id];
        if (!now.category.startsWith('stab185')) { assert.deepEqual(now, old, id); continue; }
        assert.deepEqual(now.previous_acceptance_184, { category: old.category, fingerprint: old.fingerprint }, id);
    }
    for (const [id, now] of Object.entries(ACCEPTED185.cases)) if (now.category.startsWith('stab185')) {
        changed[now.category].push(id);
        assert.match(now.reason, new RegExp(`^${id.replace(/[#.-]/g, '\\$&')}: Build \\.185: .*; checked field by field against the \\.184 output: only the fields of this category differ\\.$`), id);
        assert.match(now.fingerprint, /^sha256:[0-9a-f]{64}$/, id);
    }
    for (const k of Object.keys(CATS)) assert.deepEqual(changed[k].sort(), CATS[k], k);
    assert.deepEqual(Object.keys(ACCEPTED185.cases).filter((id) => !ACCEPTED184.cases[id]).sort(), ['b16-rogue-sale#80', 'b17-warrior#66', 'b18-warrior#234']);
    assert.deepEqual(ACCEPTED185.returned, ACCEPTED184.returned);
    assert.equal(ACCEPTED185.engine, '4.3.0-c.6.6.185');
});

test('.186 (PAID HERE, Monster A2) keeps every .185 acceptance exactly except 9 records, each with its .185 acceptance', () => {
    const CATS = { 'monster186 humanoid loadout': ['b17-mage#150', 'b17-mage#172', 'b17-mage#186'],
        'monster186 armed field': ['b17-rogue#200', 'b17-warrior#42', 'b18-warrior#202', 'b18-warrior#294', 'b18-warrior#334', 'b19-warrior#294'] };
    const changed = Object.fromEntries(Object.keys(CATS).map((k) => [k, []]));
    for (const [id, old] of Object.entries(ACCEPTED185.cases)) {
        const now = ACCEPTED.cases[id];
        if (!now.category.startsWith('monster186')) { assert.deepEqual(now, old, id); continue; }
        assert.deepEqual(now.previous_acceptance_185, { category: old.category, fingerprint: old.fingerprint }, id);
    }
    for (const [id, now] of Object.entries(ACCEPTED.cases)) if (now.category.startsWith('monster186')) {
        changed[now.category].push(id);
        assert.ok(now.reason.startsWith(`${id}: Build .186: `) && now.reason.endsWith('stripped of the fields of this category the record is exactly the .185 output.'), id);
        assert.match(now.fingerprint, /^sha256:[0-9a-f]{64}$/, id);
    }
    for (const k of Object.keys(CATS)) assert.deepEqual(changed[k].sort(), CATS[k], k);
    assert.deepEqual(Object.keys(ACCEPTED.cases).filter((id) => !ACCEPTED185.cases[id]), []);
    assert.deepEqual(ACCEPTED.returned, ACCEPTED185.returned);
    assert.equal(ACCEPTED.engine, '4.3.0-c.6.6.186');
});
