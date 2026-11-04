import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync, processReplyAny, runExtraction, onEditedV4 } from '../../src/v4/runtime.js';
import { mapPlan, planContext, withContentSkills } from '../../src/v4/planner.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { applyWorld } from '../../src/v4/world.js';
import { playerTurn } from '../../src/engine.js';
import { applyEvent } from '../../src/state.js';
import { validateState } from '../../src/validate.js';
import { worldPanel } from '../../src/display.js';

const content = await loadProductContent();
const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/manual154_stealth.json.gz', import.meta.url))));
const TARGET = f.plan.commands[1].to;
const before = () => foldChat(structuredClone(f.prefix)).state;
const arrival = at => ({ seq: 1, type: 'arrive', at, with: null, forced_by: null, scene: at });
const valid = s => assert.deepEqual(validateState(s, content), []);
function mapped(s, commands = f.plan.commands, text = f.player) {
    return mapPlan(commands, withContentSkills(planContext(s, content, buildCatalog(s, content, { known: true, c: true })), content, s), content, text, s);
}
function turn(s, commands = f.plan.commands, text = f.player) {
    const m = mapped(s, commands, text);
    assert.equal(m.route, 'v4', 'sneaking GO must use the existing travel path, not resolve hiding in the source room');
    return playerTurnV4(s, content, text, { commands: m.commands, c: true });
}
function plain() {
    const s = before();
    applyEvent(s, { t: 'scene.moved', d: { at: 'loc.ashbridge.guild_hall', reset_present: true } });
    applyEvent(s, { t: 'place.created', d: { place: { id: 'loc.sneak.room', name: 'Next chamber', kind: 'interior', parent: 'loc.ashbridge', realm: 'realm.duskreach' } } });
    return s;
}
const destination = 'loc.sneak.room';
const plan = (at = destination) => [{ seq: 1, type: 'stealth', quote: 'I sneak' }, { seq: 2, type: 'go', to: at, needs: 1, quote: 'through the doorway' }];
function observers(s, levels = ['unaware', 'unaware']) {
    return levels.flatMap((level, i) => {
        const id = `npc.watch${i}`;
        return [{ seq: i * 2 + 2, type: 'person.new', ref: id, name: `Watch ${i}`, role: 'guard', desc: [], present: true, scene: destination },
            { seq: i * 2 + 3, type: 'aware', who: id, level, scene: destination }];
    });
}
function arrivePlain(seed, levels = []) {
    const s = plain(); s.rng.seed = seed; s.rng.n = 0;
    const p = turn(s, plan());
    const r = applyWorld(p.state, content, { scene: destination, expected: {}, deltas: [arrival(destination), ...observers(s, levels)] }, { prose: 'Alaric slips into the next chamber. Watch 0 and Watch 1 stand there.' });
    valid(r.state); return { s, p, r };
}

test('155 original T11: Planner keeps the recorded stealth + dependent GO, actual arrival checks newly populated Dungeon room', async () => {
    const chat = structuredClone(f.prefix); valid(before());
    chat.push({ mes: f.player, is_user: true, extra: {} });
    const u = chat.length - 1;
    const r = await prepareGenerationAsync(chat, content, { settings: { planner: true }, llm: async () => JSON.stringify(f.plan) });
    assert.equal(r.action, 'context');
    const s = foldChat(chat).state;
    assert.ok(s.last.outcome.auth?.gos?.some(g => g.to === TARGET), 'the original GO is authorized');
    assert.equal(s.scene.concealed.includes('pc'), false, 'no automatic source-room success');
    assert.doesNotMatch(JSON.stringify(rec(chat[u]).plan.notes), /one kind of action/);
    chat.push({ mes: 'Alaric slips through the hide curtain into the chamber ahead.', is_user: false, extra: {} });
    const id = chat.length - 1; processReplyAny(chat, id, content);
    await runExtraction(chat, id, content, async () => JSON.stringify({ scene: TARGET, expected: { 2: { arrived: true, at: TARGET, with: null } }, deltas: [arrival(TARGET)] }));
    assert.equal(rec(chat[id]).extraction.status, 'applied');
    const final = foldChat(chat); assert.deepEqual(final.errors, []); valid(final.state);
    assert.equal(final.state.scene.at, TARGET);
    assert.equal(final.state.last.check.what, 'arrival stealth');
    assert.equal(final.state.last.check.automatic, undefined, 'the engine-populated Dungeon foes are observers');
    assert.ok(final.state.scene.present.length > 1);
});
test('155 empty destination: move first, automatic check consumes no Detection die and is shown', () => {
    const { p, r } = arrivePlain(1);
    assert.equal(r.state.scene.at, destination); assert.ok(r.state.scene.concealed.includes('pc'));
    assert.equal(r.state.last.check.automatic, true); assert.equal(r.state.rng.n, p.state.rng.n);
    assert.match(worldPanel(p.state, content, r), /Stealth.*success/i);
});
test('155 destination observers: successes and failures use one real destination roll, not source automatic success', () => {
    const outcomes = new Set();
    for (let seed = 1; seed <= 12; seed++) {
        const { p, r } = arrivePlain(seed, ['unaware', 'unaware']); const c = r.state.last.check;
        outcomes.add(c.success); assert.equal(c.automatic, undefined);
        assert.equal(r.state.rng.n, p.state.rng.n + 1);
        assert.equal(r.state.scene.concealed.includes('pc'), c.success);
        const levels = Object.values(r.state.scene.awareness);
        assert.ok(c.success ? levels.every(x => x === 'unaware') : levels.includes('aware'));
        assert.equal(r.state.encounter, null, 'detection alone never attacks');
    }
    assert.deepEqual([...outcomes].sort(), [false, true]);
});
test('155 successful destination Stealth prevents a narrated discovery from opening combat; a failed check alone never opens it', () => {
    let success;
    for (let seed = 1; seed <= 20; seed++) {
        const s = before(); s.rng.seed = seed;
        const p = turn(s), x = p.state.dungeons['loc.mossback_warrens'], a = x.ahead;
        const slot = x.run.floors[a.floor].slots.find(sl => sl.id === a.slot);
        const prose = 'Alaric slips through the hide curtain into the chamber. Three goblin warriors rush at Alaric, spears thrusting.';
        const deltas = [arrival(TARGET), { seq: 2, type: 'creature.new', ref: slot.ref, species: slot.species, anchor: slot.anchor, count: slot.count, desc: [], present: true, band: 'MEDIUM', threat: true, population: 'independent', life_stage: 'adult', scene: TARGET },
            { seq: 3, type: 'hostile', by: [slot.ref], scope: 'all', evidence: 'Three goblin warriors rush at Alaric, spears thrusting', scene: TARGET }];
        const r = applyWorld(p.state, content, { scene: TARGET, expected: {}, deltas }, { prose });
        if (r.state.last.check?.success) { success = r; break; }
    }
    assert.ok(success); assert.equal(success.state.encounter, null);
    assert.deepEqual(success.state.pending_combat, []);
    assert.ok(success.events.some(e => e.t === 'combat.pending'), 'this tests an actually accepted pending commitment, not only an already rejected report');
    valid(success.state);
});
test('155 mixed awareness: existing aware observer becomes suspicious on success, never a free true Ambush', () => {
    let result;
    for (let seed = 1; seed <= 30; seed++) { const x = arrivePlain(seed, ['aware', 'unaware']); if (x.r.state.last.check.success) { result = x; break; } }
    assert.ok(result); const s = result.r.state;
    const ids = s.scene.present.filter(x => x !== 'pc');
    assert.equal(s.scene.awareness[ids[0]], 'suspicious'); assert.equal(s.scene.awareness[ids[1]], 'unaware');
    const attack = playerTurn(s, content, 'I attack the first guard.', { c: true, intent: { kind: 'attack', skill: 'mage.flame_lance', target: ids[0] } });
    assert.equal(attack.outcome.started.ambush, false);
});
test('155 no automatic first-sighting knowledge before a successful arrival check', () => {
    let s;
    for (let seed = 1; seed <= 30; seed++) { const x = arrivePlain(seed, ['unaware']); if (x.r.state.last.check.success) { s = x.r.state; break; } }
    assert.ok(s); const id = s.scene.present.find(id => id !== 'pc');
    assert.equal(s.knowledge[id]?.['f.pc.appearance'], undefined);
});
test('155 failed detection overrides an unaware report also for first-sighting knowledge', () => {
    let s;
    for (let seed = 1; seed <= 30; seed++) { const x = arrivePlain(seed, ['unaware']); if (!x.r.state.last.check.success) { s = x.r.state; break; } }
    assert.ok(s); const id = s.scene.present.find(id => id !== 'pc');
    assert.equal(s.scene.awareness[id], 'aware');
    assert.ok(s.knowledge[id]?.['f.pc.appearance']);
});
test('155 true unaware target grants the existing Ambush; the next ordinary GO resets this room result', () => {
    let s;
    for (let seed = 1; seed <= 30; seed++) { const x = arrivePlain(seed, ['unaware']); if (x.r.state.last.check.success) { s = x.r.state; break; } }
    const id = s.scene.present.find(id => id !== 'pc');
    const attack = playerTurn(s, content, 'I Flame Lance the guard.', { c: true, intent: { kind: 'attack', skill: 'mage.flame_lance', target: id } });
    assert.equal(attack.outcome.started.ambush, true);
    const go = playerTurnV4(s, content, 'I return to the hall.', { c: true, commands: [{ seq: 1, type: 'go', to: 'loc.ashbridge.guild_hall', quote: 'I return to the hall' }] });
    const next = applyWorld(go.state, content, { expected: {}, deltas: [arrival('loc.ashbridge.guild_hall')] });
    assert.equal(next.state.scene.concealed.includes('pc'), false);
    assert.notEqual(next.state.last.check?.what, 'arrival stealth');
});
test('155 blocked Dungeon doorway: no arrival, no fictional destination check or concealment grant', () => {
    const s = before();
    const link = Object.values(s.links).find(l => l.b === TARGET);
    link.hidden = true; link.found = null;
    const p = turn(s);
    const r = applyWorld(p.state, content, { scene: TARGET, expected: {}, deltas: [arrival(TARGET)] }, { prose: 'The way is blocked.' });
    assert.equal(r.state.scene.at, s.scene.at); assert.equal(r.state.last.check?.what === 'arrival stealth', false);
    assert.equal(r.state.scene.concealed.includes('pc'), false);
});
test('155 unknown destination ID never authorizes arrival or stealth result', () => {
    const s = plain(), p = turn(s, plan('loc.not_known'));
    const r = applyWorld(p.state, content, { expected: {}, deltas: [arrival('loc.not_known')] });
    assert.equal(r.state.scene.at, s.scene.at); assert.notEqual(r.state.last.check?.what, 'arrival stealth');
});
test('155 active locked doorway and Dungeon gate requirements cannot be bypassed by stealth', () => {
    const s = before(), link = Object.values(s.links).find(l => l.b === TARGET);
    s.features['feat.lock'] = { id: 'feat.lock', name: 'locked iron door', kind: 'obstacle', at: s.scene.at, status: 'active' };
    link.feature = 'feat.lock';
    const p = turn(s), r = applyWorld(p.state, content, { expected: {}, deltas: [arrival(TARGET)] });
    assert.equal(r.state.scene.at, s.scene.at); assert.notEqual(r.state.last.check?.what, 'arrival stealth');
    const gate = before(); applyEvent(gate, { t: 'scene.moved', d: { at: 'loc.mossback_warrens', reset_present: true } });
    gate.guild = null;
    const q = turn(gate), denied = applyWorld(q.state, content, { expected: {}, deltas: [arrival(TARGET)] });
    assert.equal(denied.state.scene.at, gate.scene.at); assert.notEqual(denied.state.last.check?.what, 'arrival stealth');
});
test('155 forced relocation during an attempted sneak gets no free concealment', () => {
    const s = plain(), p = turn(s, plan());
    const r = applyWorld(p.state, content, { scene: destination, expected: {}, deltas: [{ ...arrival(destination), forced_by: 'The guards dragged Alaric into the Next chamber.' }] }, { prose: 'The guards dragged Alaric into the Next chamber.' });
    assert.equal(r.state.scene.at, destination); assert.equal(r.state.scene.concealed.includes('pc'), false);
    assert.notEqual(r.state.last.check?.what, 'arrival stealth');
});
test('155 arrival not confirmed: authorized stealth GO alone is not movement or concealment', () => {
    const s = plain(), p = turn(s, plan());
    const r = applyWorld(p.state, content, { scene: s.scene.at, expected: { 2: { arrived: false } }, deltas: [] });
    assert.equal(r.state.scene.at, s.scene.at); assert.equal(r.state.scene.concealed.includes('pc'), false);
    assert.notEqual(r.state.last.check?.what, 'arrival stealth');
});
test('155 normal hiding without GO still uses the original current-scene Stealth check', () => {
    const s = plain(), m = mapped(s, [{ seq: 1, type: 'stealth', quote: 'I hide here' }], 'I hide here');
    assert.equal(m.route, 'v3'); assert.equal(m.intent.kind, 'stealth');
    const p = playerTurn(s, content, 'I hide here', { intent: m.intent, c: true });
    assert.equal(p.state.scene.at, s.scene.at); assert.equal(p.outcome.check.automatic, true);
});
test('155 ordinary GO still resets concealment without a destination stealth roll', () => {
    const s = plain(); applyEvent(s, { t: 'scene.concealed', d: { ids: ['pc'] } });
    const p = playerTurnV4(s, content, 'I enter', { c: true, commands: [{ seq: 1, type: 'go', to: destination, quote: 'I enter' }] });
    const r = applyWorld(p.state, content, { scene: destination, expected: {}, deltas: [arrival(destination)] });
    assert.equal(r.state.scene.at, destination); assert.equal(r.state.scene.concealed.includes('pc'), false);
    assert.notEqual(r.state.last.check?.what, 'arrival stealth');
});
test('155 active combat does not gain a travel or stealth bypass', () => {
    const s = plain(); s.pending_combat = [{ by: 'npc.blocker' }];
    s.entities['npc.blocker'] = { id: 'npc.blocker', kind: 'npc', name: 'Blocker', status: 'alive' };
    s.scene.present.push('npc.blocker'); s.scene.positions['npc.blocker'] = { band: 'ENGAGED', cover: 'none' };
    const m = mapped(s, plan()); assert.notEqual(m.route, 'v4'); assert.notEqual(m.intent.kind, 'stealth');
    assert.match(m.notes.join(' '), /hiding is not possible during a fight/);
});
test('155 interpretation is structured and independent of wording/order, without adding another attack', () => {
    for (const text of ['I sneak through the doorway.', 'I crouch and quietly move into the next chamber.', 'I creep down the corridor.', 'I stay low and slip into the room ahead.']) {
        const cs = [{ seq: 1, type: 'go', to: destination, quote: text }, { seq: 2, type: 'stealth', quote: text }];
        const m = mapped(plain(), cs, text); assert.equal(m.route, 'v4');
        assert.equal(m.commands.length, 1); assert.equal(m.commands[0].sneak, true);
    }
    const cs = [...plan(), { seq: 3, type: 'use_skill', skill: 'mage.flame_lance', target: null, quote: 'I attack' }];
    assert.notEqual(mapped(plain(), cs).commands?.[0]?.sneak, true, 'no free hide/move/attack combo');
    const independent = mapped(plain(), [{ seq: 1, type: 'go', to: destination, quote: 'I walk into the room' }, { seq: 2, type: 'stealth', quote: 'then I hide under the bed' }]);
    assert.notEqual(independent.commands?.[0]?.sneak, true, 'independent later hiding is not a stealth approach to this GO');
});
test('155 persisted arrival result folds and reloads identically; replaying the original prefix does not reroll', () => {
    const { s, p, r } = arrivePlain(3, ['unaware', 'unaware']);
    const initial = structuredClone(s); for (const e of [...p.events, ...r.events]) applyEvent(initial, e);
    assert.deepEqual(initial, r.state); assert.deepEqual(JSON.parse(JSON.stringify(initial)), r.state);
    const repeated = applyWorld(p.state, content, { scene: destination, expected: {}, deltas: [arrival(destination), ...observers(s, ['unaware', 'unaware'])] }, { prose: 'Alaric slips into the next chamber. Watch 0 and Watch 1 stand there.' });
    assert.deepEqual(repeated.events, r.events); assert.deepEqual(repeated.state, r.state);
});
test('155 actual host reload/swipe/edit reuses the input and recomputes the same arrival, without a second planner turn', async () => {
    const chat = structuredClone(f.prefix); let plans = 0;
    chat.push({ mes: f.player, is_user: true, extra: {} });
    const u = chat.length - 1;
    const llm = async () => { plans++; return JSON.stringify(f.plan); };
    await prepareGenerationAsync(chat, content, { settings: { planner: true }, llm });
    const reply = { mes: 'Alaric slips through the hide curtain into the chamber ahead.', is_user: false, swipe_id: 0, extra: {} };
    chat.push(reply); const id = chat.length - 1;
    const extract = async () => JSON.stringify({ scene: TARGET, expected: { 2: { arrived: true, at: TARGET, with: null } }, deltas: [arrival(TARGET)] });
    processReplyAny(chat, id, content); await runExtraction(chat, id, content, extract);
    const first = foldChat(chat).state; assert.ok(first.last.check); valid(first);
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(chat))).state, first);
    processReplyAny(chat, id, content); await runExtraction(chat, id, content, extract);
    assert.deepEqual(foldChat(chat).state, first, 'duplicate completion is inert');
    reply.mes = 'Quietly, Alaric passes the curtain into the chamber ahead.'; reply.swipe_id = 1;
    onEditedV4(chat, id); processReplyAny(chat, id, content); await runExtraction(chat, id, content, extract);
    assert.deepEqual(foldChat(chat).state, first); assert.equal(plans, 1);
    chat[u].mes = 'I enter the room openly.'; onEditedV4(chat, u); chat.splice(u + 1);
    await prepareGenerationAsync(chat, content, { settings: { planner: true }, llm: async () => JSON.stringify({ commands: [{ seq: 1, type: 'go', to: TARGET, quote: 'I enter the room openly' }] }) });
    chat.push({ mes: 'Alaric enters openly.', is_user: false, extra: {} }); processReplyAny(chat, u + 1, content);
    await runExtraction(chat, u + 1, content, extract);
    const edited = foldChat(chat); assert.deepEqual(edited.errors, []); valid(edited.state);
    assert.equal(edited.state.scene.concealed.includes('pc'), false); assert.notEqual(edited.state.last.check?.what, 'arrival stealth');
});
