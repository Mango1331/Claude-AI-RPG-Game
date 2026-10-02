// P0 / S4b (docs/P0_S4B.md): the corpus is well-formed against its scenes, the scoring puts a wrong commit before a
// missing action before an unneeded question, the fast-path gate never lets A0 decide where A0 is wrong, and the JSON
// arm and the tool arm differ only in their interface (same system text up to the last line, same user message, same
// validator and repair lines).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openProvider } from '../../tools/p0/lib/provider.mjs';
import * as S from '../../tools/p0/lib/s4b.mjs';
import { main as s4bmain, s4bMockResponder, jsonPlan, toolPlan, evaluateA0 } from '../../tools/p0/s4b_intent.mjs';

const quiet = { log: () => {}, progress: () => {} };
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `p0-${name}-`));
const content = await S.loadContent();
const specs = S.loadSceneSpecs();
const scenes = S.buildScenes(specs, content);
const cases = S.loadCases();
const byId = new Map(cases.map((k) => [k.id, k]));
const FL = 'mage.flame_lance';
const MBA = 'mage.basic_attack';

test('S4b corpus: ids unique, every gold reference exists in its scene, every gold plan passes the validator', () => {
    assert.equal(new Set(cases.map((k) => k.id)).size, cases.length);
    assert.ok(cases.length >= 80);
    for (const k of cases) {
        const cat = scenes[k.scene]?.catalog;
        assert.ok(cat, `${k.id}: scene ${k.scene}`);
        assert.ok(k.rule, `${k.id}: the labelling rule is named`);
        const ids = new Set([...cat.skills.map((s) => s.id), ...cat.opponents.map((o) => o.id), ...cat.others.map((o) => o.id), ...cat.features.map((f) => f.id), ...cat.places.map((p) => p.id)]);
        const refs = (v) => (typeof v === 'string' && /^(?:mage|ranger|warrior|mon|npc|feat|loc)\./.test(v) ? [v] : Array.isArray(v) ? v.flatMap(refs) : []);
        for (const g of [...k.accept.flat(), ...(k.forbid || [])]) for (const f of ['skill', 'target', 'to']) for (const r of refs(g[f])) assert.ok(ids.has(r), `${k.id}: ${r} is not in scene ${k.scene}`);
        const v = S.validatePlan(S.goldPlan(k), cat);
        assert.deepEqual(v.errors, [], `${k.id}: the gold plan fits the plan schema`);
        assert.equal(S.classify(k, v.intents, cat).outcome, 'correct', `${k.id}: its own gold is correct`);
    }
    const counts = {};
    for (const k of cases) counts[k.cat] = (counts[k.cat] || 0) + 1;
    for (const c of ['K0', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8']) assert.ok(counts[c] >= 5, `${c} has cases`);
    assert.equal(cases.filter((k) => k.tags.includes('stab')).length, 30, 'the stability subset');
});

test('S4b scenes: built from the engine; the catalog shows labels, HP in words, bands; RECENT only with history', () => {
    const cat = scenes.burrow_fight.catalog;
    assert.deepEqual(cat.opponents.map((o) => [o.id, o.label, o.hp, o.band]), [
        ['mon.s1', 'Barkscorpion A', 'unhurt', 'ENGAGED'], ['mon.s2', 'Barkscorpion B', 'badly wounded', 'SHORT'], ['mon.s3', 'Barkscorpion C', 'unhurt', 'MEDIUM'],
    ]);
    assert.deepEqual(cat.skills.map((s) => s.id).sort(), [MBA, 'mage.arcane_burst', FL].sort());
    assert.equal(cat.skills.find((s) => s.id === 'mage.arcane_burst').area, true);
    assert.match(S.catalogText(cat), /RECENT \(the last narration\):\nBarkscorpion C skitters/);
    assert.doesNotMatch(S.catalogText(cat, { history: false }), /RECENT/);
    assert.deepEqual(scenes.burrow_dry.catalog.opponents.map((o) => o.label), ['Dry-Brown Barkscorpion A', 'Dry-Brown Barkscorpion B']);
    assert.equal(scenes.burrow_after.catalog.fight, false);
    assert.equal(scenes.burrow_after.state.entities['mon.s1'].status, 'dead');
});

test('S4b scoring: wrong commit before missed before unneeded question; the engine refuses an unknown skill', () => {
    const cls = (id, intents, opts) => {
        const k = byId.get(id);
        const o = S.classify(k, intents, scenes[k.scene].catalog, opts);
        return [o.outcome, o.subtype ?? null];
    };
    assert.deepEqual(cls('k1_01', [{ kind: 'attack', skill: FL, target: 'mon.s2', quote: 'x' }]), ['correct', null]);
    assert.deepEqual(cls('k1_01', [{ kind: 'attack', skill: MBA, target: 'mon.s2' }]), ['wrong_commit', 'substitution'], 'Basic Attack for a named skill');
    assert.deepEqual(cls('k1_01', [{ kind: 'attack', skill: { new: 'Fire Lance' }, target: 'mon.s2' }]), ['missed', null], 'refused by the engine, nothing substituted');
    assert.deepEqual(cls('k1_01', [{ kind: 'clarify', about: 'skill' }]), ['unneeded_clarify', null]);
    assert.deepEqual(cls('k6_01', [{ kind: 'attack', skill: MBA, target: 'mon.s1' }]), ['wrong_commit', 'guess']);
    assert.deepEqual(cls('k8_01', [{ kind: 'ability_world', skill: FL, target: 'feat.cracked_floor', goal: 'x' }]), ['wrong_commit', 'false_agency']);
    assert.deepEqual(cls('k3_02', [{ kind: 'attack', skill: FL, target: 'mon.s1' }]), ['wrong_commit', 'substitution'], 'the floor, not the scorpion');
    assert.deepEqual(cls('k7_01', [{ kind: 'attack', skill: { new: 'Fireball' }, target: 'mon.s2' }]), ['correct', null]);
    assert.deepEqual(cls('k4_02', [{ kind: 'attack', skill: FL, target: 'mon.s2' }]), ['missed', null], 'the second action is missing');
    assert.deepEqual(cls('k3_04', [{ kind: 'ability_world', skill: 'mage.arcane_burst', target: 'feat.hole', goal: 'breach it' }]), ['goal_mismatch', null], 'not a safety error');
    assert.deepEqual(cls('k0_07', [{ kind: 'attack', skill: 'mage.arcane_burst', target: null }]), ['correct', null], 'an area skill needs no target');
    assert.deepEqual(cls('k1_01', [{ kind: 'attack', skill: FL, target: null }]), ['unneeded_clarify', null], 'no target for a single-target skill: the engine asks');
    // without RECENT a case that needs it may ask; a guess is still a wrong commit
    assert.deepEqual(cls('k2_05', [{ kind: 'clarify', about: 'target' }], { history: false }), ['correct', null]);
    assert.deepEqual(cls('k2_05', [{ kind: 'clarify', about: 'target' }], { history: true }), ['unneeded_clarify', null]);
    assert.deepEqual(cls('k2_05', [{ kind: 'attack', skill: FL, target: 'mon.s1' }], { history: false }), ['wrong_commit', 'wrong_target']);
});

test('S4b validator: typed lines name the intent, the field and what is allowed', () => {
    const cat = scenes.burrow_fight.catalog;
    const v = S.validatePlan({ intents: [{ kind: 'attack', skill: 'mage.fire_lance', target: 'mon.s9' }, { kind: 'ability_world', skill: FL, target: 'the floor' }, { kind: 'hide' }] }, cat);
    assert.equal(v.intents, null);
    assert.match(v.errors.join('\n'), /intents\[0\] \(attack\): missing "quote"/);
    assert.match(v.errors.join('\n'), /intents\[0\] \(attack\): "skill" must be one of mage\.basic_attack, mage\.flame_lance, mage\.arcane_burst, or \{"new"/);
    assert.match(v.errors.join('\n'), /intents\[0\] \(attack\): "target" must be an id from OPPONENTS/);
    assert.match(v.errors.join('\n'), /intents\[1\] \(ability_world\): "target" must be an id from FEATURES \(feat\.cracked_floor/);
    assert.match(v.errors.join('\n'), /intents\[2\] \(hide\): "kind" must be one of/);
    assert.deepEqual(S.validatePlan({ intents: [] }, cat), { intents: [], errors: [] });
    assert.match(S.validatePlan([], cat).errors[0], /\{"intents": \[\.\.\.\]\}/);
});

test('S4b gate: A0 decides alone only when every word is an exact catalog match; on this corpus it never lets a wrong A0 through', () => {
    const a0 = evaluateA0(cases, scenes, content);
    const unsafe = cases.filter((k) => a0.get(k.id).gate.cls !== 'ESCALATE' && a0.get(k.id).outcome.outcome !== 'correct');
    assert.deepEqual(unsafe.map((k) => k.id), []);
    const g = (id) => a0.get(id).gate;
    assert.equal(g('k0_01').cls, 'FAST_COMMIT');
    assert.equal(g('k6_01').cls, 'FAST_CLARIFY', '"I attack" with three foes: the engine\'s own question');
    assert.equal(g('k7_02').cls, 'FAST_REJECT', 'an exactly named skill he did not learn');
    // the reported failure: A0 commits Basic Attack, the gate sends it to the planner
    assert.equal(a0.get('k1_01').outcome.outcome, 'wrong_commit');
    assert.equal(g('k1_01').cls, 'ESCALATE');
    assert.equal(g('k1_01').reason, 'skill not named exactly');
    // the only foe would be the target, but "cracked floor" is not accounted for
    assert.equal(g('k3_02').reason, 'words A0 did not account for');
    assert.ok(g('k3_02').residual.includes('floor'));
    assert.equal(g('k0_07').reason, 'area skill needs no target');
    // every A0 wrong commit is escalated
    for (const k of cases.filter((x) => a0.get(x.id).outcome.outcome === 'wrong_commit')) assert.equal(g(k.id).cls, 'ESCALATE', k.id);
});

test('S4b guard: questions and other people\'s deeds drop an intent; a quote not in the message drops a hard intent', () => {
    const cat = scenes.burrow_fight.catalog;
    const q = S.guardPlan('Can I Flame Lance the floor from here?', [{ kind: 'ability_world', skill: FL, target: 'feat.cracked_floor', goal: 'x', quote: 'Can I Flame Lance the floor from here?' }], cat);
    assert.deepEqual([q.kept.length, q.dropped[0].rule], [0, 'question']);
    const n = S.guardPlan('Barkscorpion C lunges at me', [{ kind: 'attack', skill: MBA, target: 'mon.s3', quote: 'Barkscorpion C lunges at me' }], cat);
    assert.deepEqual([n.kept.length, n.dropped[0].rule], [0, 'npc_actor']);
    const e = S.guardPlan('I attack', [{ kind: 'attack', skill: FL, target: 'mon.s3', quote: 'its stinger grazes Alaric\'s shoulder' }], cat);
    assert.deepEqual([e.kept.length, e.dropped[0].rule], [0, 'no_evidence'], 'taken from RECENT, not from the message');
    const t = S.guardPlan('I flame lnace Barkscorpion B', [{ kind: 'attack', skill: FL, target: 'mon.s2', quote: 'I flame lance Barkscorpion B' }], cat);
    assert.equal(t.kept.length, 1, 'a quote with its typo corrected still counts as evidence');
});

test('S4b arms: the JSON and the tool arm share everything but the last line of the system text', () => {
    const json = S.plannerSystem({ tool: false });
    const tool = S.plannerSystem({ tool: true });
    const cut = (s) => s.split('\n').slice(0, -1).join('\n');
    assert.equal(cut(json), cut(tool));
    assert.ok(json.endsWith(S.JSON_FORMAT) && tool.endsWith(S.TOOL_FORMAT));
    const gm = S.plannerSystem({ tool: true, gm: true, contract: 'CONTRACT {{user}}' });
    assert.ok(gm.startsWith('CONTRACT Alaric\n\nGM PLANNING STEP'));
    assert.ok(gm.includes(S.RULES) && gm.includes(S.EXAMPLES_TEXT) && !gm.includes(S.PLANNER_ROLE));
    // no example names a scene or a skill of the corpus
    for (const w of ['Barkscorpion', 'Flame Lance', 'Arcane Burst', 'Grey Wolf', 'Bandit', 'Brede', 'Hesta']) assert.ok(!S.EXAMPLES_TEXT.includes(w), w);
    const tools = S.planTool();
    assert.deepEqual(tools[0].function.parameters.properties.intents.items.properties.kind.enum, S.KINDS);
});

test('S4b repair: the same error lines reach the JSON arm as a user line and the tool arm as the tool result', async () => {
    const k = byId.get('k1_01');
    const cat = scenes[k.scene].catalog;
    const seen = [];
    const responder = s4bMockResponder(cases, scenes, { noQuoteFirst: [k.id], noToolFirst: [] });
    const provider = await openProvider({ backend: 'mock', mock: async (req) => { seen.push(req); return responder(req); } });
    const common = { temperature: 0.1, maxTokens: 500 };
    const user = S.plannerUser(cat, k.text);
    const j = await jsonPlan(provider, { system: S.plannerSystem({}), user, cat, common, retry: {} });
    assert.deepEqual([j.valid_first, j.valid_final, j.repaired], [false, true, true]);
    assert.match(seen[1].messages.at(-1).content, /That plan was not valid:\n- intents\[0\] \(attack\): missing "quote"/);
    const t = await toolPlan(provider, { system: S.plannerSystem({ tool: true }), user, cat, common, retry: {} });
    assert.deepEqual([t.valid_first, t.valid_final, t.repaired, t.tool_called_first], [false, true, true, true]);
    const toolMsg = seen[3].messages.at(-1);
    assert.equal(toolMsg.role, 'tool');
    assert.deepEqual(JSON.parse(toolMsg.content).errors, j.errors_first, 'identical error lines');
    const silent = await openProvider({ backend: 'mock', mock: s4bMockResponder(cases, scenes, { noToolFirst: [k.id] }) });
    const t2 = await toolPlan(silent, { system: S.plannerSystem({ tool: true }), user, cat, common, retry: {} });
    assert.deepEqual([t2.tool_called_first, t2.valid_final], [false, true], 'no call at first: one reminder, then the plan');
});

test('S4b runs with the mock: a0 offline, p1 and fc on gold answers, a wrong commit is counted; --report compares runs', async () => {
    const out = tmp('s4b');
    try {
        assert.equal(await s4bmain(['--arm', 'a0', '--out', path.join(out, 'a0')], quiet), 0);
        const a0 = JSON.parse(fs.readFileSync(path.join(out, 'a0', 'results.json'), 'utf8'));
        assert.equal(a0.gate.unsafe_fast, 0);
        assert.ok(a0.agg.a0.wrong_commit >= 10, 'A0 commits the wrong action on the problem class');
        assert.ok(a0.a0_traps.some((t) => t.id === 'k1_01'));
        const subset = ['--cases', 'k0_01,k1_01,k3_02,k6_01,k7_01,k8_01,k8_12,k2_05'];
        // a false attack on two negatives: the guard drops the one quoted from a question, not the other
        const p1 = await openProvider({ backend: 'mock', mock: s4bMockResponder(cases, scenes, { wrong: ['k8_01', 'k8_12'] }) });
        assert.equal(await s4bmain(['--arm', 'p1', '--out', path.join(out, 'p1'), ...subset], { ...quiet, provider: p1 }), 0);
        const r1 = JSON.parse(fs.readFileSync(path.join(out, 'p1', 'results.json'), 'utf8'));
        assert.equal(r1.meta.concurrency, 1, 'serial by default');
        assert.equal(r1.agg.guarded.correct, 7);
        assert.equal(r1.agg.guarded.wrong_commit, 1);
        assert.equal(r1.agg.raw.wrong_commit, 2);
        assert.equal(r1.records.find((r) => r.id === 'k8_01').dropped[0].rule, 'question');
        assert.equal(r1.records.find((r) => r.id === 'k8_12').outcome.subtype, 'false_agency');
        assert.equal(r1.records.find((r) => r.id === 'k1_01').cascade.source, 'llm', 'the gate sends the alias to the planner');
        assert.equal(r1.records.find((r) => r.id === 'k0_01').cascade.source, 'a0');
        assert.ok(r1.criteria.some((c) => c.id === 'K-S'));
        const fc = await openProvider({ backend: 'mock', mock: s4bMockResponder(cases, scenes) });
        assert.equal(await s4bmain(['--arm', 'fc', '--out', path.join(out, 'fc'), ...subset, '--reps', '2'], { ...quiet, provider: fc }), 0);
        const rf = JSON.parse(fs.readFileSync(path.join(out, 'fc', 'results.json'), 'utf8'));
        assert.equal(rf.meta.interface, 'tool');
        assert.equal(rf.stability.pass_k, 8);
        const summary = fs.readFileSync(path.join(out, 'fc', 'summary.md'), 'utf8');
        assert.match(summary, /stille falsche Festlegungen/);
        assert.match(summary, /Tool im 1\. Versuch aufgerufen/);
        assert.match(summary, /pass\^2/);
        assert.match(summary, /keine API-Keys/);
        const lines = [];
        assert.equal(await s4bmain(['--report', path.join(out, 'p1', 'results.json'), path.join(out, 'fc', 'results.json')], { log: (t) => lines.push(t), progress: () => {} }), 0);
        assert.match(lines.join('\n'), /p1 ↔ fc×2 \| 0 \/ 1 \|/);
    } finally {
        fs.rmSync(out, { recursive: true, force: true });
    }
});
