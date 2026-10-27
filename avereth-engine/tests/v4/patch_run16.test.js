import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { fold, applyEvent } from '../../src/state.js';
import { rec, setRec, foldChat } from '../../src/host.js';
import { playerTurn } from '../../src/engine.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { planContext, mapPlan } from '../../src/v4/planner.js';
import { guardCommands } from '../../src/v4/agency.js';
import { applyWorld } from '../../src/v4/world.js';
import { parseExtraction } from '../../src/v4/extract.js';
import { extractionRequest, runExtraction } from '../../src/v4/runtime.js';

const content = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run16.json', import.meta.url)));
const before = i => fold(f.records.filter(r => r.i < i).flatMap(r => r.events));
const H = 'mon.monglasswing_topnet_glint', C = 'mon.glasswing_pair_2';
function target(text = f.t52.text, planned = H, state = before(f.t52.i)) {
    const commands = structuredClone(f.t52.commands);
    commands[0] = { ...commands[0], quote: text, target: planned };
    return mapPlan(commands, planContext(state, content, buildCatalog(state, content, { c: true })), content, text, state).intent;
}
const fight = (s, intent) => playerTurn(s, content, f.t52.text, { intent, c: true });
const created = r => r.events.filter(e => e.t === 'entity.created' && e.d.entity.kind === 'creature');
function pending() {
    const chat = Array.from({ length: 117 }, () => ({ mes: '', is_user: false, is_system: false, extra: {} }));
    for (const r of f.records) setRec(chat[r.i], { events: structuredClone(r.events) });
    chat[116].mes = f.t58.text;
    setRec(chat[116], { events: [], text_hash: f.t58.hash, extraction: { status: 'pending' } });
    return chat;
}
function parse(answer) {
    const req = extractionRequest(pending(), 116, content);
    return parseExtraction(JSON.stringify(answer), req.vocab, req.ids, req.expectedKeys,
        { sceneRequired: true, startScene: req.startScene });
}
function ordered() {
    const a = JSON.parse(f.t58.repair);
    a.deltas.find(d => d.type === 'quest.detail').scene = structuredClone(a.scene);
    const arrival = a.deltas.pop();
    a.deltas.splice(2, 0, arrival);
    a.deltas.forEach((d, i) => d.seq = i + 1);
    return a;
}

test('Run16 T52: circling does not replace the present H with the absent C', () => {
    const s = before(f.t52.i), intent = target();
    assert.equal(intent.target, H);
    const r = fight(s, intent);
    const enc = r.events.find(e => e.t === 'encounter.started')?.d.encounter;
    assert.ok(enc?.combatants[H]);
    assert.ok(!enc.combatants[C]);
    assert.equal(r.state.entities[C].status, s.entities[C].status);
});
test('Run16 target wording and explicit live handles preserve the chosen target', () => {
    for (const text of [f.t52.text.replace('circling', 'hovering'), 'I cast Flame Lance at Glasswing Moth H.'])
        assert.equal(target(text).target, H);
});
test('Run16 an explicit absent peer is refused, never silently replaced or rewarded', () => {
    const s = before(f.t52.i), intent = target('I cast Flame Lance at Glasswing Moth C.');
    assert.equal(intent.kind, 'no_target');
    const r = fight(s, intent);
    assert.equal(r.state.entities.pc.sheet.mp, s.entities.pc.sheet.mp);
    assert.deepEqual(r.state.quests, s.quests);
    assert.ok(!r.events.some(e => ['encounter.started', 'xp.gained'].includes(e.t)));
});
test('Run16 explicit present peer still corrects a mistaken planner target', () => {
    const s = before(f.t52.i);
    s.scene.present.push(C);
    assert.equal(target('I cast Flame Lance at Glasswing Moth C.', H, s).target, C);
});
test('Run16 combat boundary rejects a direct attack on an absent known entity', () => {
    const s = before(f.t52.i);
    const r = fight(s, { kind: 'attack', skill: 'mage.flame_lance', target: C });
    assert.ok(!r.events.some(e => e.t === 'encounter.started'));
    assert.equal(r.state.entities.pc.sheet.mp, s.entities.pc.sheet.mp);
    assert.deepEqual(r.state.quests, s.quests);
});
test('Run16 T35 arrival and local scene share the canonical parent', () => {
    const s = before(70), r = applyWorld(s, content, structuredClone(f.t35.answer), { msg: 70, prose: f.t35.text });
    assert.equal(r.rejected.filter(x => x.rule === 'scene_context').length, 0);
    assert.equal(r.state.places[r.state.scene.at].parent, 'realm.caelreth');
    assert.equal(created(r).length, 12); // existing crowd cap; no balance change
    assert.equal(Object.values(r.state.places).filter(p => p.name === f.t35.answer.scene.new.name).length, 1);
});
test('Run16 canonical scene comparison does not create places or authorize travel', () => {
    const s = before(70), a = structuredClone(f.t35.answer);
    s.last.outcome = { c: true, auth: { c: true, gos: [] }, expected_keys: {} };
    a.expected = {};
    const r = applyWorld(s, content, a, { msg: 70, prose: f.t35.text });
    assert.equal(r.state.scene.at, s.scene.at);
    assert.deepEqual(r.state.places, s.places);
    assert.equal(created(r).length, 0);
});
test('Run16 same name under a different valid parent is not the current scene', () => {
    const s = before(70), a = structuredClone(f.t35.answer);
    const arrived = applyWorld(s, content, a, { msg: 70, prose: f.t35.text }).state;
    arrived.places['realm.other'] = { id: 'realm.other', name: 'Other', kind: 'realm', parent: null };
    a.scene.new.parent = 'realm.other';
    a.deltas = a.deltas.filter(d => d.type === 'person.new');
    const r = applyWorld(arrived, content, a, { msg: 72 });
    assert.ok(r.rejected.every(x => x.rule === 'scene_context'));
    assert.ok(!r.events.some(e => e.t === 'scene.entered'));
});
test('Run16 T58 original and annotation-only repair report the premature local introductions', () => {
    for (const a of [JSON.parse(f.t58.original), JSON.parse(f.t58.repair)]) {
        a.deltas.find(d => d.type === 'quest.detail').scene = structuredClone(a.scene);
        for (const d of a.deltas) if (d.type === 'creature.new') d.scene = structuredClone(a.scene);
        const p = parse(a);
        assert.equal(p.valid, true);
        assert.match(p.issues.map(x => x.why).join(' '), /arrival.*before|before.*arrival/i);
        const r = applyWorld(before(116), content, p.value, { msg: 116, prose: f.t58.text });
        assert.equal(created(r).length, 0, 'premature introductions remain rejected');
    }
});
test('Run16 correctly ordered T58 introduces three creatures exactly once, with replay and reload', () => {
    const a = ordered(), p = parse(a);
    assert.equal(p.valid, true, p.errors.join('; '));
    const s = before(116), r = applyWorld(s, content, p.value, { msg: 116, prose: f.t58.text });
    assert.equal(created(r).length, 3);
    assert.equal(r.rejected.filter(x => x.rule === 'scene_context' && x.type === 'creature.new').length, 0);
    const replay = structuredClone(s);
    for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, e);
    assert.deepEqual(replay, r.state);
    assert.deepEqual(applyWorld(s, content, a, { msg: 116, prose: f.t58.text }).state, r.state);
});
test('Run16 repair uses the existing second call, then commits once and never retries an applied reply', async () => {
    const chat = pending(), requests = [];
    const annotated = JSON.parse(f.t58.repair);
    annotated.deltas.find(d => d.type === 'quest.detail').scene = structuredClone(annotated.scene);
    await runExtraction(chat, 116, content, async req => {
        requests.push(req);
        return JSON.stringify(requests.length === 1 ? annotated : ordered());
    });
    assert.equal(requests.length, 2);
    assert.match(requests[1].messages.at(-1).content, /arrival.*before|before.*arrival/i);
    assert.equal(rec(chat[116]).extraction.status, 'applied');
    assert.equal(created(rec(chat[116])).length, 3);
    assert.equal(rec(chat[116]).events.filter(e => e.t === 'extract.applied').length, 1);
    assert.equal(foldChat(chat).errors.length, 0);
    const again = await runExtraction(chat, 116, content, () => { throw Error('already applied'); });
    assert.equal(again.changed, false);
});
test('Run16 failed arrival never grants local destination creatures', () => {
    const s = before(116), a = ordered();
    s.last.outcome = { c: true, auth: { c: true, gos: [] }, expected_keys: {} };
    a.expected = {};
    const r = applyWorld(s, content, a, { msg: 116, prose: f.t58.text });
    assert.equal(r.state.scene.at, s.scene.at);
    assert.equal(created(r).length, 0);
});
test('Run16 a remote sighting remains valid before arrival and legacy parsing is unchanged', () => {
    const a = ordered(), arrival = a.deltas.find(d => d.type === 'arrive'), creature = a.deltas.find(d => d.type === 'creature.new');
    a.deltas = [{ ...creature, seq: 1, present: false }, { ...arrival, seq: 2 }];
    assert.equal(parse(a).valid, true);
    const b = JSON.parse(f.t58.repair);
    const req = extractionRequest(pending(), 116, content);
    assert.equal(parseExtraction(JSON.stringify(b), req.vocab, req.ids, req.expectedKeys).valid, true);
});
test('Run16 repeated visits keep introductions at an already reached scene valid', () => {
    const a = ordered(), arrival = a.deltas.find(d => d.type === 'arrive'), creature = a.deltas.find(d => d.type === 'creature.new');
    a.deltas = [{ ...arrival, seq: 1 }, { ...creature, seq: 2 }, { ...arrival, seq: 3 }];
    assert.equal(parse(a).valid, true);
});
test('Run16 malformed local deltas remain validation failures, never parser exceptions', () => {
    const a = ordered();
    a.deltas = [null];
    assert.equal(parse(a).valid, false);
});
test('Run16 T29 independent travel survives the following price question', () => {
    const r = guardCommands(f.t29.text, f.t29.commands, {}, { state: false });
    assert.equal(r.kept.length, 1);
    assert.equal(r.kept[0].type, 'go');
    assert.ok(!r.kept.some(c => ['buy', 'pay'].includes(c.type)));
});
test('Run16 questions and conditional travel remain non-actions across an em dash', () => {
    for (const text of ['Should I head to the Wren — for a bed and a meal?', 'If I head to the Wren — can I get dinner?', 'I do not head to the Wren — what is the price?']) {
        const c = { seq: 1, type: 'go', to: { new: 'the Wren' }, quote: 'head to the Wren' };
        assert.equal(guardCommands(text, [c], {}, { state: false }).kept.length, 0, text);
    }
});
