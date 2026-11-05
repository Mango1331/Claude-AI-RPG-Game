import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { applyEvent } from '../../src/state.js';
import { parsePlan, mapPlan, planContext, withContentSkills } from '../../src/v4/planner.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { applyWorld } from '../../src/v4/world.js';
import { prepareGenerationAsync, processReplyAny, runExtraction, onEditedV4 } from '../../src/v4/runtime.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user01_stealth.json.gz', import.meta.url))));
const base = () => foldChat(structuredClone(f.prefix)).state;
const TARGET = 'realm.caelreth.the_old_cairn_field_on_the_eastern_moors';
const START = 'loc.shepherds_shelter_on_the_eastern_road';
const manner = scope => ({ kind: 'stealth', scope });
const context = s => withContentSkills(planContext(s, content, buildCatalog(s, content, { known: true, c: true })), content, s);
const modern = (scope = 'destination') => [{ seq: 1, type: 'journey.continue', quote: f.player, manner: manner(scope) }];
function begin(s = base(), commands = modern(), text = f.player) {
    const parsed = parsePlan(JSON.stringify({ commands }), content.commandVocab, context(s), text);
    assert.deepEqual(parsed.errors, []);
    const m = mapPlan(parsed.commands, context(s), content, text, s);
    assert.equal(m.route, 'v4');
    return playerTurnV4(s, content, text, { commands: m.commands, c: true });
}
const arrived = at => ({ seq: 1, type: 'arrive', at, with: null, forced_by: null, scene: at });
const observers = at => [0, 1].flatMap((_, i) => [
    { seq: i * 2 + 2, type: 'person.new', ref: `npc.sentry${i}`, name: `Sentry ${i}`, role: 'guard', desc: [], present: true, scene: at },
    { seq: i * 2 + 3, type: 'aware', who: `npc.sentry${i}`, level: 'unaware', scene: at },
]);
function finish(p, at = TARGET, deltas = []) {
    const r = applyWorld(p.state, content, { scene: at, expected: { 1: { arrived: at === TARGET, at, with: null } }, deltas: [arrived(at), ...deltas] }, { prose: 'Alaric reaches the field quietly. Sentry 0 and Sentry 1 wait there.' });
    assert.deepEqual(validateState(r.state, content), []);
    return r;
}

test('156 original journey + stealth is repaired as one approach before any source-room check', async () => {
    const chat = structuredClone(f.prefix); chat.push({ mes: f.player, is_user: true, extra: {} });
    let n = 0;
    await prepareGenerationAsync(chat, content, { settings: { planner: true }, llm: async () => JSON.stringify(n++ ? { commands: modern() } : f.plan) });
    assert.equal(rec(chat[73]).route, 'v4'); assert.equal(rec(chat[73]).plan.repaired, true);
    const before = foldChat(chat).state;
    assert.equal(before.scene.at, START); assert.equal(before.scene.concealed.includes('pc'), false);
    assert.equal(before.last.outcome.auth.gos[0].to, TARGET);
    assert.deepEqual(before.last.outcome.auth.gos[0].manner, manner('destination'));
    const answer = { ...f.answer, expected: { 1: { arrived: true, at: TARGET, with: null } } };
    chat.push({ mes: f.reply, is_user: false, swipe_id: 0, extra: {} });
    processReplyAny(chat, 74, content); await runExtraction(chat, 74, content, async () => JSON.stringify(answer));
    assert.equal(rec(chat[74]).extraction.status, 'applied');
    const folded = foldChat(chat); assert.deepEqual(folded.errors, []);
    assert.equal(folded.state.scene.at, TARGET); assert.equal(folded.state.last.check.at, TARGET);
    assert.equal(folded.state.last.check.automatic, true, 'snoring alone did not establish a visible/canonical observer');
    assert.equal(n, 2);
});
test('156 destination check sees real target observers and uses one die, both success and failure', () => {
    const outcomes = new Set();
    for (let seed = 1; seed <= 12; seed++) {
        const s = base(); s.rng = { seed, n: 0 };
        const p = begin(s), r = finish(p, TARGET, observers(TARGET));
        const check = r.state.last.check; outcomes.add(check.success);
        assert.equal(check.automatic, undefined); assert.equal(check.at, TARGET);
        assert.equal(r.state.rng.n, p.state.rng.n + 1);
        assert.equal(r.state.scene.concealed.includes('pc'), check.success);
        assert.equal(r.state.encounter, null);
    }
    assert.deepEqual([...outcomes].sort(), [false, true]);
});
test('156 destination scope waits at an intermediate stop; action scope checks that actual stop', () => {
    for (const scope of ['destination', 'action']) {
        const s = base(), at = 'loc.wayside_stop';
        applyEvent(s, { t: 'place.created', d: { place: { id: at, name: 'Wayside stop', kind: 'site', parent: 'realm.caelreth' } } });
        const p = begin(s, modern(scope)), r = finish(p, at, observers(at));
        assert.equal(r.state.scene.at, at);
        assert.equal(r.events.some(e => e.t === 'check.recorded' && e.d.what === 'arrival stealth'), scope === 'action');
        if (scope === 'destination') assert.equal(r.state.scene.concealed.includes('pc'), false);
    }
});
test('156 no confirmed arrival and forced relocation get no approach result', () => {
    const p = begin();
    const none = applyWorld(p.state, content, { scene: START, expected: { 1: { arrived: false } }, deltas: [] });
    assert.equal(none.state.scene.at, START); assert.equal(none.state.scene.concealed.includes('pc'), false);
    assert.ok(!none.events.some(e => e.t === 'check.recorded'));
    const forced = applyWorld(p.state, content, { scene: TARGET, expected: {}, deltas: [{ ...arrived(TARGET), forced_by: 'The guards dragged Alaric to the Old Cairn Field on the eastern moors.' }] }, { prose: 'The guards dragged Alaric to the Old Cairn Field on the eastern moors.' });
    assert.ok(!forced.events.some(e => e.t === 'check.recorded' && e.d.what === 'arrival stealth'));
});
test('156 GO also carries the shared manner without a second hide action', () => {
    const p = begin(base(), [{ seq: 1, type: 'go', to: TARGET, quote: f.player, manner: manner('action') }]);
    const r = finish(p, TARGET, observers(TARGET)); assert.equal(r.state.scene.at, TARGET);
    assert.equal(r.state.last.check.what, 'arrival stealth');
    assert.equal(p.state.scene.concealed.includes('pc'), false);
});
test('156 local movement is one actual band step followed by existing Stealth against local observers', () => {
    const s = base(); s.scene.positions['npc.hesk'] = { band: 'MEDIUM', cover: 'none' };
    const text = 'I creep one step closer to Hesk.';
    const p = begin(s, [{ seq: 1, type: 'move', dir: 'closer', target: 'npc.hesk', quote: text, manner: manner('action') }], text);
    assert.equal(p.state.scene.at, START); assert.equal(p.state.scene.positions['npc.hesk'].band, 'SHORT');
    assert.equal(p.state.last.check.what, 'movement stealth'); assert.equal(p.state.last.check.at, START);
    assert.equal(p.events.filter(e => e.t === 'scene.position').length, 1);
    assert.equal(p.events.filter(e => e.t === 'check.recorded').length, 1);
});
test('156 no actual local step grants no free hide or extra die', () => {
    const s = base(); s.scene.positions['npc.hesk'] = { band: 'ENGAGED', cover: 'none' };
    const text = 'I creep closer to Hesk.';
    const p = begin(s, [{ seq: 1, type: 'move', dir: 'closer', target: 'npc.hesk', quote: text, manner: manner('action') }], text);
    assert.equal(p.state.rng.n, s.rng.n); assert.equal(p.state.scene.concealed.includes('pc'), false);
});
test('156 manner is strict optional metadata; no attack, unsupported action or combat bypass', () => {
    const text = 'I act quietly.';
    const cases = [
        { type: 'go', to: TARGET, manner: { kind: 'stealth', scope: 'future' } },
        { type: 'go', to: TARGET, manner: { ...manner('action'), success: true } },
        { type: 'move', dir: 'closer', target: 'npc.hesk', manner: manner('destination') },
        { type: 'activity', kind: 'search', what: 'here', manner: manner('action') },
        { type: 'use_skill', skill: 'mage.flame_lance', target: 'npc.hesk', manner: manner('action') },
    ];
    for (const c of cases) assert.ok(parsePlan(JSON.stringify({ commands: [{ seq: 1, quote: text, ...c }] }), content.commandVocab, context(base()), text).errors.length);
    const s = base(); s.pending_combat = [{ by: 'npc.hesk' }];
    assert.ok(parsePlan(JSON.stringify({ commands: modern() }), content.commandVocab, context(s), f.player).errors.length);
});
test('156 absent or ambiguous continue target gets no source concealment or check', () => {
    for (const more of [false, true]) {
        const s = base();
        if (more) applyEvent(s, { t: 'intent.set', d: { intent: { id: 'intent.second', goal: 'reach Glassmere', place: 'loc.glassmere', status: 'active', since: { turn: s.turn, minute: s.clock.minute } } } });
        else s.intents = {};
        const p = begin(s); assert.equal(p.state.scene.at, START);
        assert.equal(p.state.scene.concealed.includes('pc'), false);
        assert.ok(!p.events.some(e => e.t === 'check.recorded'));
    }
});
test('156 separate attack and multiple travel legs cannot silently eat an approach or add a free action', () => {
    const s = base();
    for (const extra of [
        { seq: 2, type: 'use_skill', skill: 'mage.flame_lance', target: 'npc.hesk', quote: f.player },
        { seq: 2, type: 'go', to: 'loc.glassmere', quote: f.player },
    ]) assert.ok(parsePlan(JSON.stringify({ commands: [...modern(), extra] }), content.commandVocab, context(s), f.player).errors.length);
    const plain = modern().map(({ manner, ...c }) => c);
    assert.deepEqual(parsePlan(JSON.stringify({ commands: [...plain, { seq: 2, type: 'go', to: 'loc.glassmere', quote: f.player }] }), content.commandVocab, context(s), f.player).errors, []);
});
test('156 continuing toward a locked Dungeon way still refuses actual arrival and grants no Stealth', () => {
    const x = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/manual154_stealth.json.gz', import.meta.url))));
    const s = foldChat(x.prefix).state, at = x.plan.commands[1].to;
    const link = Object.values(s.links).find(l => l.b === at);
    s.features['feat.lock'] = { id: 'feat.lock', name: 'locked iron door', kind: 'obstacle', at: s.scene.at, status: 'active' };
    link.feature = 'feat.lock';
    s.intents = { 'intent.locked': { id: 'intent.locked', goal: 'reach chamber', place: at, status: 'active', since: { turn: s.turn, minute: s.clock.minute } } };
    const p = begin(s);
    const r = applyWorld(p.state, content, { scene: at, expected: { 1: { arrived: true, at, with: null } }, deltas: [arrived(at)] });
    assert.equal(r.state.scene.at, s.scene.at);
    assert.ok(!r.events.some(e => e.t === 'check.recorded' && e.d.what === 'arrival stealth'));
});
test('156 actual host swipe/reload persists one target check; later plain continue inherits no stealth', async () => {
    const chat = structuredClone(f.prefix);chat.push({ mes: f.player, is_user: true, extra: {} });
    let plans = 0;
    await prepareGenerationAsync(chat, content, { settings: { planner: true }, llm: async () => { plans++;return JSON.stringify({ commands: modern() }); } });
    chat.push({ mes: f.reply, is_user: false, swipe_id: 0, extra: {} });
    const answer = { scene: TARGET, expected: { 1: { arrived: true, at: TARGET, with: null } }, deltas: [arrived(TARGET), ...observers(TARGET)] };
    const extract = async () => JSON.stringify(answer);
    processReplyAny(chat, 74, content);await runExtraction(chat, 74, content, extract);
    const first = foldChat(chat).state;assert.equal(first.scene.at, TARGET);
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(chat))).state, first);
    chat[74].swipe_id = 1;chat[74].mes = f.reply + '\nHe stays there.';onEditedV4(chat, 74);
    processReplyAny(chat, 74, content);await runExtraction(chat, 74, content, extract);
    assert.deepEqual(foldChat(chat).state, first);assert.equal(plans, 1);
    const p = playerTurnV4(base(), content, 'I continue.', { commands: [{ seq: 1, type: 'journey.continue', quote: 'I continue.' }], c: true });
    const plain = finish(p);assert.ok(!plain.events.some(e => e.t === 'check.recorded' && e.d.what === 'arrival stealth'));
});
