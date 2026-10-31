import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent, fold } from '../../src/state.js';
import { foldChat, setRec } from '../../src/host.js';
import { hash32 } from '../../src/util.js';
import { establishEvents, floorAt } from '../../src/v4/living.js';
// Package C (.132): original answers predate the population contract; the documented conversion (tools/replay/contract_c.mjs)
import { contractValue } from '../../tools/replay/contract_c.mjs';

const content = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run18_entry.json', import.meta.url)));
const ROOT = 'loc.old_crown_catacombs';
const copy = x => structuredClone(x);
const created = r => r.events.filter(e => e.t === 'entity.created' && e.d.entity.kind === 'creature');
const rejected = r => r.events.filter(e => e.t === 'delta.rejected' && e.d.rule === 'dungeon_foe');

function step(s, n, answer = f.steps[n].answer) {
    s = copy(s);
    for (const e of f.steps[n].events) applyEvent(s, e);
    return applyWorld(s, content, contractValue(copy(answer), s, content), { msg: f.steps[n].i + 1, prose: f.steps[n].text });
}
function beforeEntry() { return step(fold(f.before), 0).state; }
function entry(change = () => {}) {
    const answer = copy(f.steps[1].answer);
    change(answer);
    return step(beforeEntry(), 1, answer);
}

test('Run18 original T56/T57: refused arrival stays refused; first root entry creates no unbound Level-28 skeleton', () => {
    const s = beforeEntry();
    assert.equal(s.scene.at, 'loc.old_chapel_of_saint_corrins_fold');
    assert.equal(s.dungeons?.[ROOT], undefined);
    const r = step(s, 1);
    assert.equal(r.state.scene.at, ROOT);
    assert.equal(floorAt(r.state, ROOT), 0, 'the entrance is not a first-floor room');
    assert.equal(created(r).length, 0);
    assert.equal(r.state.entities['mon.crerisen_skeleton_1'], undefined);
    assert.equal(rejected(r).length, 1);
    assert.equal(r.state.dungeons[ROOT].run.floors[1].slots.some(sl => sl.entities.length || sl.met_turn), false);
});

test('Run18 first-contact ordering: population exists before the creature is checked, without inventing a slot', () => {
    const r = entry();
    const established = r.events.findIndex(e => e.t === 'dungeon.established');
    const refusal = r.events.findIndex(e => e.t === 'delta.rejected' && e.d.rule === 'dungeon_foe');
    assert.equal(r.events.filter(e => e.t === 'dungeon.established').length, 1);
    assert.ok(established >= 0 && established < refusal);
    assert.equal(r.events.some(e => e.t === 'dungeon.slot'), false);
    assert.deepEqual(r.state.dungeons[ROOT].floors[1].spans.minion, [1, 5]);
    assert.deepEqual(r.state.dungeons[ROOT].floors[2].rank, { min: 'E', max: 'E' });
});

test('Run18 first root registration: neither extra groups nor remote dungeon foes bypass the same population rule', () => {
    for (const present of [true, false]) {
        const r = entry(a => { const d = a.deltas.find(d => d.type === 'creature.new'); d.count = 3; d.present = present; });
        assert.equal(created(r).length, 0, String(present));
        assert.equal(rejected(r).length, 1);
        assert.equal(r.events.some(e => e.t === 'scene.entered' && e.d.id.startsWith('mon.')), false);
    }
});

test('Run18 an ordinary ruin outside the Dungeon still permits freely introduced creatures', () => {
    const s = beforeEntry();
    const d = copy(f.steps[1].answer.deltas.find(d => d.type === 'creature.new'));
    const r = applyWorld(s, content, contractValue({ scene: 'here', expected: {}, deltas: [d] }, s, content), { msg: 114, prose: f.steps[1].text });
    assert.equal(r.state.scene.at, s.scene.at);
    assert.equal(created(r).length, 1);
    assert.equal(rejected(r).length, 0);
    assert.equal(r.state.dungeons?.[ROOT], undefined);
});

test('Run18 non-hostile creatures and unrelated wildlife remain possible at the entrance', () => {
    for (const d of [
        { species: 'grey wolf', anchor: 'wolf', threat: true },
        { species: 'risen skeleton', anchor: 'skeleton', threat: false },
    ]) {
        const r = entry(a => Object.assign(a.deltas.find(x => x.type === 'creature.new'), d));
        assert.equal(created(r).length, 1);
        assert.equal(rejected(r).length, 0);
        assert.equal(r.events.some(e => e.t === 'dungeon.slot'), false);
    }
});

test('Run18 valid canonical slots on actual F and E floors retain identity, rank and level windows', () => {
    for (const floor of [1, 2]) {
        const s = beforeEntry();
        // A previously recorded room; this tests materialisation, not authorization to cross a seal.
        const at = `loc.recorded_floor_${floor}`;
        s.places[at] = { id: at, name: `Recorded room ${floor}`, kind: 'interior', parent: ROOT, level: floor, visited: true };
        s.scene.at = at;
        const preview = establishEvents(s, content, ROOT).find(e => e.t === 'dungeon.established').d.dungeon;
        const sl = preview.run.floors[floor].slots.find(x => x.role === 'minion');
        const d = { ...copy(f.steps[1].answer.deltas.find(d => d.type === 'creature.new')), ref: sl.ref, species: sl.species, anchor: sl.anchor, count: sl.count };
        const answer = { scene: 'here', expected: {}, deltas: [d] };
        const r = applyWorld(s, content, contractValue(answer, s, content), { msg: 114 });
        const foes = created(r).map(e => r.state.entities[e.d.entity.id]);
        assert.equal(foes.length, sl.count);
        for (const e of foes) {
            assert.equal(e.slot.floor, floor);
            assert.equal(e.profile.rank, floor === 1 ? 'F' : 'E');
            assert.ok(e.profile.level >= (floor === 1 ? 1 : 15));
            assert.ok(e.profile.level <= (floor === 1 ? 5 : 19));
        }
        const again = applyWorld(r.state, content, contractValue(answer, r.state, content), { msg: 115 });
        assert.equal(created(again).length, 0, 'the same reference reuses the slot population');
        assert.deepEqual(again.state.dungeons[ROOT].run.floors[floor].slots.find(x => x.id === sl.id).entities, foes.map(e => e.id));
    }
});

test('Run18 original chain replays and reloads exactly; changing the arrival swipe invalidates its events', () => {
    let s = fold(f.before);
    const chat = [{ is_user: false, mes: 'Original history', extra: { avereth: { events: copy(f.before) } } }];
    for (let n = 0; n < f.steps.length; n++) {
        const c = f.steps[n], r = step(s, n);
        chat.push({ is_user: true, mes: c.input, extra: { avereth: { events: copy(c.events) } } });
        const msg = { is_user: false, mes: c.text, swipes: [c.text], swipe_id: 0, swipe_info: [{ extra: {} }] };
        setRec(msg, { events: r.events, text_hash: hash32(c.text) });
        chat.push(msg);
        s = r.state;
    }
    assert.deepEqual(foldChat(chat).state, s);
    assert.deepEqual(JSON.parse(JSON.stringify(foldChat(JSON.parse(JSON.stringify(chat))).state)), JSON.parse(JSON.stringify(s)));
    chat.at(-1).mes = 'An alternate reply without arrival.';
    assert.equal(foldChat(chat).state.scene.at, 'loc.old_chapel_of_saint_corrins_fold');
    chat.at(-1).mes = f.steps[1].text;
    assert.deepEqual(foldChat(chat).state, s);
});

test('Run18 historical .93 profiles remain loadable and are not retroactively changed', () => {
    const s = beforeEntry();
    for (const e of [...f.steps[1].events, ...f.recordedEntryEvents]) applyEvent(s, e);
    const id = 'mon.crerisen_skeleton_1';
    const old = copy(s.entities[id].profile);
    assert.equal(old.level, 28);
    const r = applyWorld(s, content, contractValue({ scene: 'here', expected: {}, deltas: [] }, s, content), { msg: 116 });
    assert.deepEqual(r.state.entities[id].profile, old);
    assert.equal(created(r).length, 0);
});
