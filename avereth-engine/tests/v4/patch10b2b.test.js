import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { campaign } from './patch8_lib.js';
import { applyEvent } from '../../src/state.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { applyWorld } from '../../src/v4/world.js';
import { contractReady, completeContract, parseBoard } from '../../src/v4/guild.js';
import { transferCargo } from '../../src/v4/delivery.js';

const content = await loadProductContent();
const base = (await campaign(content)).state();
const original = JSON.parse(fs.readFileSync(new URL('./fixtures/10b2b_run4_deliveries.json', import.meta.url)));
function scene() {
    const s = structuredClone(base);
    s.places.depot = { id: 'depot', name: 'Quarry Depot', kind: 'site', parent: s.scene.location };
    s.places.shed = { id: 'shed', name: 'Receiving Shed', kind: 'interior', parent: 'depot' };
    s.places.office = { id: 'office', name: 'Clerk Office', kind: 'interior', parent: 'depot' };
    s.scene.at = 'depot'; s.scene.present = ['pc', 'npc.clerk', 'npc.visitor'];
    s.entities['npc.clerk'] = { id: 'npc.clerk', kind: 'npc', name: 'Brenna', descriptors: ['clerk'], status: 'alive', at: 'depot' };
    s.entities['npc.visitor'] = { id: 'npc.visitor', kind: 'npc', name: 'Vera', descriptors: ['traveler'], status: 'alive', at: 'depot' };
    s.quests.q = { id: 'q', title: 'Tonic delivery', kind: 'guild_contract', status: 'active', task: 'Deliver tonic crates to the clerk at Quarry Depot.', desired_end_state: 'Tonic crates left with the clerk at Quarry Depot.', objectives: [{ id: 'o1', verb: 'DELIVER', what: 'tonic crates', qty: 2, where: 'Quarry Depot clerk' }], proof: [], notes: [], details: [], history: [], payout_cp: 40, level: 1, rank: 'Novice' };
    s.objects.cargo = { id: 'cargo', name: 'tonic crates', qty: 2, holder: { entity: 'pc' }, for_quests: ['q'], marks: [] };
    return s;
}
const receipts = s => s.quests.q.deliveries || [];
const total = s => receipts(s).reduce((n, r) => n + r.qty, 0);
function run(s, commands, msg = 90) {
    const events = [];
    const out = resolveCommands(s, content, commands, e => { events.push(e); applyEvent(s, e); }, { c: true, msg });
    return { out, events };
}
const give = (object = 'cargo', qty = 2) => ({ seq: 1, type: 'give', object, qty, to: 'npc.clerk', quote: 'I give the goods to Brenna.' });
function detail(s, note) {
    s.last = { ...s.last, rejected: [], outcome: { c: true, auth: { c: true } } };
    return applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'quest.detail', quest: 'q', note, schedule: null }] }, { msg: 91, prose: note });
}

test('F60-1 left with a clerk never authorises a floor drop anywhere inside the depot', () => {
    const s = scene(); s.scene.at = 'office';
    run(s, [{ ...give(), type: 'drop' }]);
    assert.equal(total(s), 0);
    s.quests.q.ready = true;
    assert.equal(contractReady(s, content, s.quests.q, { c: true }).ok, false);
    const coin = s.entities.pc.sheet.coin_cp;
    completeContract(s, content, s.quests.q, e => applyEvent(s, e), { c: true });
    assert.equal(s.entities.pc.sheet.coin_cp, coin);
});
test('F60-1 a named receiving place permits a drop only in that established place', () => {
    for (const [at, expected] of [['shed', 2], ['office', 0], ['depot', 0]]) {
        const s = scene(); s.scene.at = at;
        s.quests.q.objectives[0].where = 'Quarry Depot';
        s.quests.q.desired_end_state = 'Tonic crates deposited in the Receiving Shed at Quarry Depot.';
        run(s, [{ ...give(), type: 'drop' }]);
        assert.equal(total(s), expected, at);
    }
});
test('F60-1 a prose-only counter or passive placed wording grants no physical drop point', () => {
    for (const end of ['Tonic crates left with the clerk.', 'Tonic crates placed on the receiving counter at Quarry Depot.', 'Tonic crates placed at Quarry Depot.']) {
        const s = scene(); s.quests.q.desired_end_state = end;
        run(s, [{ ...give(), type: 'drop' }]); assert.equal(total(s), 0, end);
    }
});
test('F60-1 an explicit leave instruction at the exact established destination remains valid', () => {
    const s = scene(); s.quests.q.task = 'Leave the tonic crates at Quarry Depot.';
    s.quests.q.desired_end_state = 'Tonic crates are left at Quarry Depot.';
    s.quests.q.objectives[0].where = 'Quarry Depot';
    run(s, [{ ...give(), type: 'drop' }]); assert.equal(total(s), 2);
});
test('F60-2 wagon deadline and unrelated factual details survive intact', () => {
    const note = 'The wagon must be back by noon. Brenna works in the Receiving Shed.';
    const r = detail(scene(), note);
    assert.equal(r.state.quests.q.details.at(-1)?.note, note);
});
test('F60-2 only the added empty-crate return clause is removed', () => {
    const r = detail(scene(), 'Brenna works in the Receiving Shed. Return the empty crate to the shop is required. The road is muddy.');
    assert.equal(r.state.quests.q.details.at(-1)?.note, 'Brenna works in the Receiving Shed. The road is muddy.');
    assert.ok(!r.corrections.some(x => x.includes('hunt contract')));
});
test('F60-2 an original container return duty and independent empty-store/back-road details remain', () => {
    const s = scene(); s.quests.q.task += ' Return the empty crate to the shop.';
    const note = 'Return the empty crate to the shop is required. The road is muddy.';
    assert.equal(detail(s, note).state.quests.q.details.at(-1)?.note, note);
    const other = 'The store is empty. The wagon must be back by noon.';
    assert.equal(detail(scene(), other).state.quests.q.details.at(-1)?.note, other);
});
test('F60-2 a wagon deadline beside an empty crate in the same clause is not a crate return duty', () => {
    const note = 'The wagon must be back by noon with an empty crate beside the driver.';
    assert.equal(detail(scene(), note).state.quests.q.details.at(-1)?.note, note);
});

test('F60-3 Run 4 original E23 physical ledger handover to the present priory brother is valid', () => {
    const f = original.find(x => x.i === 23), s = structuredClone(f.state);
    // E23 actually booked this transfer before the reply. Isolate that original physical handover,
    // rather than pretending E24 contained an object.move (it did not).
    const c = { ...f.commands[1], seq: 1 }; delete c.needs;
    run(s, [c], 23);
    const q = Object.values(s.quests).find(q => q.status === 'active' && q.title.includes('Sealed Ledger'));
    assert.equal(q.deliveries?.length, 1);
    assert.equal(contractReady(s, content, q, { c: true }).ok, true);
    const before = s.entities.pc.sheet.coin_cp;
    run(s, [{ seq: 1, type: 'go', to: 'loc.alderwatch.guild_hall', quote: 'I return to the Guild.' }], 40);
    s.scene.at = 'loc.alderwatch.guild_hall';
    completeContract(s, content, q, e => applyEvent(s, e), { c: true });
    assert.equal(s.entities.pc.sheet.coin_cp - before, 40);
    assert.equal(q.status, 'completed');
});
test('F60-3 Run 4 E49 medicine remains deliverable and pays only once', () => {
    const f = original.find(x => x.i === 49), s = structuredClone(f.state);
    run(s, f.commands, 49);
    const q = Object.values(s.quests).find(q => q.status === 'active' && q.title.includes('Medicine'));
    assert.equal(q.deliveries?.length, 1);
    assert.equal(contractReady(s, content, q, { c: true }).ok, true);
    s.scene.at = 'loc.alderwatch.guild_hall';
    const coin = s.entities.pc.sheet.coin_cp;
    const turnIn = { seq: 1, type: 'quest.turn_in', quest: q.id, quote: 'I turn in the medicine contract.' };
    run(s, [turnIn], 54);
    run(s, [turnIn], 55);
    assert.equal(s.entities.pc.sheet.coin_cp - coin, 40);
});
test('F60-3 institution representatives require a fitting role; named recipients stay exclusive', () => {
    for (const kind of ['visitor', 'named', 'absent', 'dead']) {
        const f = original.find(x => x.i === 23), s = structuredClone(f.state);
        const target = s.entities['npc.npcpriory_brother_herbs'];
        if (kind === 'visitor') { target.descriptors = ['traveler']; target.traits = 'a visiting traveler'; s.facts = {}; }
        if (kind === 'named') {
            s.entities['npc.named'] = { id: 'npc.named', kind: 'npc', name: 'Warden Otto', descriptors: ['warden'], status: 'alive' };
            Object.values(s.quests).find(q => q.status === 'active').desired_end_state = 'The sealed ledger reaches Warden Otto at the priory at Chapel Hollow.';
        }
        if (kind === 'absent') s.scene.present = ['pc'];
        if (kind === 'dead') target.status = 'dead';
        const c = { ...f.commands[1], seq: 1 }; delete c.needs;
        run(s, [c]);
        assert.equal(Object.values(s.quests).flatMap(q => q.deliveries || []).length, 0, kind);
    }
});
test('F60-3 an explicit recipient role is not replaced by another institutional employee', () => {
    const f = original.find(x => x.i === 23), s = structuredClone(f.state);
    const q = Object.values(s.quests).find(q => q.status === 'active');
    q.objectives.find(o => o.verb === 'DELIVER').where = 'clerk at the priory at Chapel Hollow';
    const c = { ...f.commands[1], seq: 1 }; delete c.needs;
    run(s, [c]); assert.equal(q.deliveries?.length || 0, 0);
});

const listing = what => ({ title: 'Courier test', client: 'Brenna', rank: 'Novice', level: 1, qtype: 'minor', payout_cp: 40, task: `Deliver ${what} to Quarry Depot.`, desired_end_state: `${what} reaches Quarry Depot.`, objectives: [{ verb: 'DELIVER', what, qty: 1, unit: null, where: 'Quarry Depot' }], proof: [] });
const board = (s, what) => parseBoard(JSON.stringify({ listings: [listing(what)] }), content, { c: true, rank: 'Novice', missing: 1, branch: s.scene.location, have: [] }, s);
test('F60-4 unsupported spoken warning is refused at board validation; a written warning is physical', () => {
    const s = scene();
    assert.equal(board(s, 'a spoken warning about the flood').listings?.length, 0);
    assert.equal(board(s, 'a sealed letter containing a warning').listings?.length, 1);
});
test('F60-4 no physical cargo always means no physical delivery, even for old abstract objectives', () => {
    for (const what of ['sealed ledger', 'a spoken warning about the flood']) {
        const s = scene(); s.objects = {}; s.quests.q.objectives[0].what = what; s.quests.q.ready = true;
        assert.equal(contractReady(s, content, s.quests.q, { c: true }).ok, false, what);
    }
});
test('F60-4 physical fantasy objects and ordinary TALK messages keep their existing board semantics', () => {
    const s = scene();
    for (const what of ['a message crystal', 'a warning stone', 'a written warning']) {
        assert.equal(board(s, what).listings?.length, 1, what);
    }
    const l = listing('a spoken warning about the flood'); l.objectives[0].verb = 'TALK';
    assert.equal(parseBoard(JSON.stringify({ listings: [l] }), content, { c: true, rank: 'Novice', missing: 1, branch: s.scene.location, have: [] }, s).listings?.length, 1);
    s.meta.ruleset = 1;
    assert.equal(board(s, 'a spoken warning about the flood').listings?.length, 1);
});
test('F60-5 an unbound herb crate cannot satisfy a generic crate contract', () => {
    const s = scene(); s.objects.cargo.name = 'herb crate'; s.objects.cargo.for_quests = [];
    s.quests.q.objectives[0].what = 'crate';
    run(s, [give()]); assert.equal(total(s), 0);
});
test('F60-5 explicit quest binding supports a generic cargo label, foreign binding never does', () => {
    for (const [binding, expected] of [[['q'], 2], [['foreign'], 0]]) {
        const s = scene(); s.objects.cargo.name = 'herb crate'; s.objects.cargo.for_quests = binding;
        s.quests.q.objectives[0].what = 'crate'; run(s, [give()]); assert.equal(total(s), expected);
    }
});
test('F60-5 identified quest cargo excludes an unbound exact-name lookalike', () => {
    const s = scene();
    s.objects.other = { ...structuredClone(s.objects.cargo), id: 'other', for_quests: [] };
    run(s, [give('other')]); assert.equal(total(s), 0);
});

test('F60-6 two separately acquired template units deliver twice; returning one never earns a third', () => {
    const s = scene(), item = [...content.items.values()].find(x => x.slot === 'ammo');
    s.quests.q.objectives[0] = { ...s.quests.q.objectives[0], what: item.name, qty: 3 }; s.objects = {};
    const events = [], emit = e => { events.push(e); applyEvent(s, e); }, initial = structuredClone(s);
    for (const msg of [91, 93]) {
        emit({ t: 'item.changed', d: { id: 'pc', item: item.id, qty: 1, why: 'purchased' } });
        s.turn++;
        const r = run(s, [give(`item.${item.id}`, 1)], msg); events.push(...r.events);
    }
    assert.equal(total(s), 2);
    const first = receipts(s)[0].object;
    emit({ t: 'object.moved', d: { id: first, to: { entity: 'pc' } } });
    s.turn++;
    const r = run(s, [give(first, 1)], 95); events.push(...r.events);
    assert.equal(total(s), 2);
    JSON.parse(JSON.stringify(events)).forEach(e => applyEvent(initial, e));
    assert.deepEqual(receipts(initial), receipts(s));
});
test('F60-6 new object.added units increase a partly delivered stack capacity without recounting returns', () => {
    const s = scene(); s.quests.q.objectives[0].qty = 4;
    run(s, [give('cargo', 1)]);
    applyEvent(s, { t: 'object.added', d: { id: 'cargo', qty: 1 } });
    s.turn++;
    run(s, [give('cargo', 2)], 92);
    assert.equal(total(s), 3);
    const first = receipts(s)[0].object;
    applyEvent(s, { t: 'object.moved', d: { id: first, to: { entity: 'pc' } } });
    run(s, [give(first, 1)], 93); assert.equal(total(s), 3);
});
test('F60-6 separate sheet GIVE steps in one message retain distinct materialised identities', () => {
    const s = scene(), item = [...content.items.values()].find(x => x.slot === 'ammo');
    s.quests.q.objectives[0].what = item.name; s.objects = {};
    s.entities.pc.sheet.inventory[item.id] = 2;
    run(s, [give(`item.${item.id}`, 1), { ...give(`item.${item.id}`, 1), seq: 2 }]);
    assert.equal(total(s), 2);
    assert.equal(new Set(receipts(s).map(r => r.origin)).size, 2);
});

function marenReport(mode) {
    const f = original.find(x => x.i === 111), s = structuredClone(f.state), report = structuredClone(f.report);
    const { out } = run(s, f.commands, 111);
    s.last = { ...s.last, input: f.input, rejected: [], outcome: { ...out, c: true } };
    const arrival = { seq: -1, type: 'arrive', at: 'loc.alderwatch.guild_hall', with: null, forced_by: null };
    if (mode === 'present') report.deltas.unshift(arrival, { seq: 0, type: 'enter', who: 'npc.npcguild_clerk_alderwatch', band: 'ENGAGED' });
    if (mode === 'refused') report.deltas = [arrival, { seq: 0, type: 'enter', who: 'npc.npcguild_clerk_alderwatch', band: 'ENGAGED' }];
    if (mode === 'wrong') {
        const id = 'npc.wrong'; s.entities[id] = { id, kind: 'npc', name: 'Other Clerk', descriptors: ['clerk'], status: 'alive' };
        report.deltas = [arrival, { seq: 0, type: 'enter', who: id, band: 'ENGAGED' }, { seq: 1, type: 'object.move', object: f.commands[1].object, to: id, qty: null }];
    }
    return { f, ...applyWorld(s, content, report, { msg: 112, prose: mode === 'refused' ? 'Maren refuses the book.' : f.reply }) };
}
test('F60-7 exact E111/E112 preserves PC custody without an extracted presence; no NPC is spawned', () => {
    const r = marenReport('original');
    assert.equal(r.state.objects[r.f.commands[1].object].holder.entity, 'pc');
    assert.ok(!r.state.scene.present.includes('npc.npcguild_clerk_alderwatch'));
});
test('F60-7 original Maren identity plus real presence completes exactly one handover', () => {
    const r = marenReport('present');
    assert.equal(r.state.objects[r.f.commands[1].object].holder.entity, 'npc.npcguild_clerk_alderwatch');
    assert.equal(r.events.filter(e => e.t === 'object.moved' && e.d.id === r.f.commands[1].object).length, 1);
    assert.equal(r.events.filter(e => e.t === 'cmd.completed' && e.d.seq === 2).length, 1);
});
test('F60-7 a refusal or another clerk never completes Maren handover', () => {
    for (const mode of ['refused', 'wrong']) {
        const r = marenReport(mode); assert.equal(r.state.objects[r.f.commands[1].object].holder.entity, 'pc', mode);
    }
});
test('F60-10 ruleset 1 full and partial transfers retain semantic quantities and replay', () => {
    for (const qty of [1, 2]) {
        const s = scene(); s.meta.ruleset = 1; const initial = structuredClone(s);
        const events = [], emit = e => { events.push(e); applyEvent(s, e); };
        transferCargo(s, content, emit, s.objects.cargo, { entity: 'npc.clerk' }, qty, 1);
        assert.equal(Object.values(s.objects).filter(x => x.holder.entity === 'npc.clerk').reduce((n, x) => n + x.qty, 0), qty);
        assert.equal(total(s), 0);
        JSON.parse(JSON.stringify(events)).forEach(e => applyEvent(initial, e));
        assert.deepEqual(initial.objects, s.objects);
    }
});
