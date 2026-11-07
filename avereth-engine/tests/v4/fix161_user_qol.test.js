import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { renderBoardCards, renderHud, worldRows } from '../../src/hud.js';
import { parsePlan, mapPlan, planContext, withContentSkills, plannerSystem } from '../../src/v4/planner.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { playerTurn } from '../../src/engine.js';
import { groundAccess } from '../../src/v4/features.js';
const content = await loadProductContent();
const read = n => JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(`./fixtures/${n}`, import.meta.url))));
const f = read('user_qol161.json.gz'), u4 = read('user04_qol159.json.gz');
const u2 = zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user02_157.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(JSON.parse).slice(1);
const before = i => foldChat(u4.chat, i).state;
const context = s => withContentSkills(planContext(s, content, buildCatalog(s, content, { known: true, c: true })), content, s);
const plain = h => h.replace(/<[^>]*>/g, ' ');
const board = s => ({ rank: 'Novice', branch: 'loc.alderwatch', listings: Object.values(s.quests).filter(q => q.status === 'listed').map(q => q.id) });

test('161 board retains unique job terms without repeated rank/reward or routine technical IDs in details', () => {
    const s = before(73), b = board(s), saved = structuredClone(s), h = renderBoardCards(s, content, b);
    for (const id of b.listings) {
        const q = s.quests[id]; assert.ok(h.includes(q.title)); assert.ok(h.includes(q.task));
        assert.ok(!plain(h).includes(q.id));
    }
    const details = [...h.matchAll(/<details[^>]*>([\s\S]*?)<\/details>/g)].map(x => plain(x[1]));
    assert.ok(details.every(x => !/reward:|quest level|Contract:/.test(x)));
    assert.deepEqual(s, saved);
});
test('161 board drafts are escaped, editable requests; equal titles retain useful distinct references', () => {
    const s = before(73), b = board(s), ids = b.listings.slice(0, 2);
    s.quests[ids[0]].title = s.quests[ids[1]].title = 'Rats "red" <img src=x onerror=alert(1)>';
    const h = renderBoardCards(s, content, { ...b, listings: ids });
    assert.equal((h.match(/data-avereth-draft=/g) || []).length, 2);
    assert.ok(h.includes('&quot;')); assert.ok(!h.includes('<img'));
    for (const id of ids) assert.ok(h.includes(id));
    assert.doesNotMatch(h, /onclick=|onsubmit=/);
});
test('161 ground lists quantities and distinct names individually, with draft-only take controls', () => {
    const s = before(38), o = Object.values(s.objects).find(o => groundAccess(s, o).ok);
    assert.ok(o); o.qty = 3; s.objects['obj.other'] = { ...structuredClone(o), id: 'obj.other', qty: 2 };
    const saved = structuredClone(s), h = renderHud(s, content, 'open');
    assert.equal((h.match(/class="avereth-ground-item"/g) || []).length, 2);
    assert.match(h, /×3/); assert.match(h, /×2/);
    assert.ok(h.includes(o.id) && h.includes('obj.other'));
    assert.equal((h.match(/data-avereth-draft=/g) || []).length, 2);
    assert.deepEqual(s, saved);
    o.holder = { entity: 'pc' }; s.objects['obj.other'].holder = { entity: 'npc.foreign' };
    assert.doesNotMatch(renderHud(s, content, 'open'), /avereth-ground-item|data-avereth-draft/);
});
test('161 First Strike help appears at its actual start and distinguishes the spent round-one action from ambush', () => {
    assert.match(renderHud(before(20), content), /First Strike explained/);
    assert.match(renderHud(before(20), content), /action of round 1/);
    assert.match(renderHud(before(20), content), /faster.*twice/i);
    assert.doesNotMatch(renderHud(before(22), content), /First Strike explained/);
    assert.doesNotMatch(renderHud(before(82), content), /First Strike explained/);
});
test('161 dungeon floor and existing cycle information precede long room/exit descriptions', () => {
    const rows = worldRows(before(52), content), labels = rows.map(r => r[0]);
    assert.ok(labels.indexOf('Dungeon level') < labels.indexOf('Dungeon'));
    assert.ok(labels.indexOf('Dungeon cycle') < labels.indexOf('Exits'));
    assert.ok(rows.find(r => r[0] === 'Dungeon cycle')[1].includes('inside:'));
});

for (const variant of ['initial', 'repair']) test(`161 User02 breakfast ${variant} is an ordinary deed without rest clarification; GO survives`, () => {
    const s = foldChat(u2, 63).state, r = rec(u2[63]), raw = r.plan.raw[variant === 'initial' ? 0 : 1];
    const p = parsePlan(raw, content.commandVocab, context(s), u2[63].mes);
    assert.deepEqual(p.errors, []);
    assert.equal(p.commands[0].type, 'other'); assert.equal(p.commands[1].type, 'go');
    const m = mapPlan(p.commands, context(s), content, u2[63].mes, s);
    assert.notEqual(m.route, 'panel');
    const t = playerTurnV4(s, content, u2[63].mes, { c: true, commands: m.commands });
    assert.ok(!t.outcome.resolutions.some(x => x.reason === 'how long?'));
    assert.ok(!t.events.some(e => e.t === 'resource.changed'));
});
test('161 genuine rest and genuinely ambiguous trade retain short clarification', () => {
    const s = foldChat(u2, 63).state, input = 'I rest.';
    const p = parsePlan(JSON.stringify({ commands: [{ seq: 1, type: 'activity', kind: 'rest', what: null, minutes: null, until: null, quote: input }] }), content.commandVocab, context(s), input);
    assert.deepEqual(p.errors, []); assert.equal(p.commands[0].kind, 'rest');
    const t = playerTurnV4(s, content, input, { c: true, commands: p.commands });
    assert.equal(t.outcome, null); assert.match(t.command.panels[0], /How long/);
    const m = mapPlan([{ seq: 1, type: 'clarify', about: 'action', question: 'Which items?', options: ['one', 'all'] }], context(s), content, 'I want to sell some loot.', s);
    assert.equal(m.route, 'panel'); assert.match(m.panel, /Which items/);
});
test('161 sale-help and meal distinctions reach the actual planner contract without removing trade commands', () => {
    const request = plannerSystem(content.commandVocab, { privateQuests: false });
    assert.match(request, /eat breakfast/); assert.match(request, /help.*sell|selling.*help/i);
    assert.match(request, /sell/); assert.match(request, /clarify/);
});
test('161 original User01 explicit LONG is mapped away from its known MEDIUM target, not closer', () => {
    const s = structuredClone(f.retreat.state), saved = structuredClone(s), m = mapPlan(f.retreat.commands, context(s), content, f.retreat.input, s);
    assert.equal(m.intent.move, 'away'); assert.deepEqual(s, saved);
    const t = playerTurn(s, content, f.retreat.input, { c: true, intent: m.intent });
    assert.ok(!t.outcome.records.some(r => r.actor === 'pc' && r.move?.dir === 'closer'));
    assert.deepEqual(t.outcome.records.find(r => r.actor === 'pc').after_move, { dir: 'away', change: 'Glimmer Queen MEDIUM -> LONG' });
    assert.ok(t.outcome.records.filter(r => r.actor === 'pc').length <= 2);
});
test('161 an unnamed or unknown target keeps ordinary direction/clarification without fabricated range', () => {
    const s = structuredClone(f.retreat.state), c = context(s), cmds = structuredClone(f.retreat.commands);
    cmds[0].target = null;
    const m = mapPlan(cmds, c, content, f.retreat.input, s);
    assert.notEqual(m.intent?.move, 'away');
});
test('161 mixed corpse/pool/lair search preserves its environment check and protects automatic corpse loot', () => {
    const s = structuredClone(f.mixed.state), inv = structuredClone(s.entities.pc.sheet.inventory);
    const r = playerTurnV4(s, content, f.mixed.input, { c: true, commands: f.mixed.commands });
    assert.ok(r.events.some(e => e.t === 'check.recorded'));
    assert.ok(r.outcome.auth.timeCap > 0, 'existing search time allowance remains; time is confirmed by the normal reply path');
    assert.match(r.outcome.extra.join('\n'), /remains.*already|already.*remains/i);
    assert.deepEqual(r.state.entities.pc.sheet.inventory, inv);
    assert.ok(!r.events.some(e => /loot|xp|coin/.test(e.t)));
    const cmd = { ...f.mixed.commands[0], what: 'the corpse', quote: 'I search the corpse.' };
    const body = playerTurnV4(s, content, cmd.quote, { c: true, commands: [cmd] });
    assert.equal(body.outcome.resolutions[0].reason, 'looted already');
    assert.ok(!body.events.some(e => ['check.recorded', 'time.advanced'].includes(e.t)));
});
test('161 two corpse descriptions stay protected and repeated mixed environment search gains no extra roll', () => {
    const s = structuredClone(f.mixed.state), cmd = { ...f.mixed.commands[0], what: 'the corpse and its remains', quote: 'I search the corpse and its remains.' };
    assert.equal(playerTurnV4(s, content, cmd.quote, { c: true, commands: [cmd] }).outcome.resolutions[0].reason, 'looted already');
    const first = playerTurnV4(s, content, f.mixed.input, { c: true, commands: f.mixed.commands });
    const again = playerTurnV4(first.state, content, f.mixed.input, { c: true, commands: f.mixed.commands });
    assert.equal(again.outcome.resolutions[0].reason, 'searched already');
    assert.ok(!again.events.some(e => e.t === 'check.recorded'));
});
