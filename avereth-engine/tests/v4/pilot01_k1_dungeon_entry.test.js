// K1 (pilot 01 B1, FACHPLAN_PILOT01_KORREKTUREN §2): from the Dungeon's own place, a GO into an unseen part is DUNGEON
// AHEAD; the foes the engine binds there in this reply to the slot that turn reserved follow the Dungeon's slot and
// envelope rules (PULSE plan C.1, A2 (6)), never PULSE's refusal of new attackers. Original T65 (I129/I130): three goblin
// scouts of mossback_warrens_c1_l1_e1, the reply has the nearest one come at him.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { pilot, upTo, replyCase, rejected, events, valid } from './pilot01_lib.js';

const content = await loadProductContent();
const SCOUTS = ['mon.mossback_warrens_c1_l1_e1_1', 'mon.mossback_warrens_c1_l1_e1_2', 'mon.mossback_warrens_c1_l1_e1_3'];

test('K1 original T65: the slot foes DUNGEON AHEAD reserved for this turn are not refused by PULSE; the other rules still read their attack', async () => {
    const { chat, r } = await replyCase(content, 130);
    assert.equal(rejected(r, 'pulse').length, 0, rejected(r, 'pulse').map((e) => e.d.reason).join(' | '));
    assert.ok(!(r.corrections || []).some((c) => /no new attacker was authorized/.test(c)), 'no PULSE correction to the narrator');
    // still bound to their slot, present, and their attack decided by the envelope (attack commitment, group), not PULSE
    const s = valid(chat, content);
    for (const id of SCOUTS) assert.equal(s.entities[id]?.slot?.id, 'scouts', id);
    assert.ok(SCOUTS.every((id) => s.scene.present.includes(id)));
    const hostile = events(r, 'delta.rejected').filter((e) => ['hostile', 'intent'].includes(e.d.item?.type));
    assert.ok(hostile.every((e) => e.d.rule !== 'pulse'), hostile.map((e) => e.d.rule).join(','));
    assert.ok(s.encounter || (s.pending_combat || []).length || hostile.length, 'the attack is booked, or refused by an envelope rule of its own');
});

test('K1 the same entry with an attack the reply actually narrates: the slot foes open the fight (no PULSE veto, the envelope books it)', async () => {
    const chat = upTo(130);
    chat[130].mes += '\n\nThe nearest goblin scout lunged at Alaric, its spear driving for his ribs.';
    const raw = structuredClone(pilot[130].extra.avereth.extraction.raw);
    for (const d of raw.deltas) if (['hostile', 'intent'].includes(d.type)) d.evidence = 'The nearest goblin scout lunged at Alaric, its spear driving for his ribs';
    const { r } = await replyCase(content, 130, { chat, answer: JSON.stringify(raw) });
    assert.equal(rejected(r, 'pulse').length, 0);
    const s = valid(chat, content);
    assert.ok(s.encounter || (s.pending_combat || []).length, `no fight: ${rejected(r).map((e) => `${e.d.rule}: ${e.d.reason}`).join(' | ')}`);
});

test('K1 guard: a creature this reply brings in beside the slot foes is no slot foe; PULSE still refuses its attack', async () => {
    const raw = structuredClone(pilot[130].extra.avereth.extraction.raw);
    raw.deltas.push({ scene: null, seq: 8, type: 'creature.new', ref: 'creature.cave_wolf', species: 'wolf', anchor: 'wolf', desc: ['a grey wolf slinking in behind him through the warren mouth'], count: 1, present: true, band: 'SHORT', cluster: null, stronger: null, threat: true, more: null, population: 'independent', life_stage: 'adult' },
        { scene: null, seq: 9, type: 'hostile', by: ['creature.cave_wolf'], scope: null, evidence: 'the nearest one\'s weight shifted, and it came' });
    const { r } = await replyCase(content, 130, { answer: JSON.stringify(raw) });
    const wolf = rejected(r).filter((e) => JSON.stringify(e.d.item).includes('cave_wolf'));
    assert.ok(wolf.some((e) => ['pulse', 'dungeon_foe'].includes(e.d.rule)), wolf.map((e) => `${e.d.rule}: ${e.d.reason}`).join(' | ') || 'not refused');
    assert.equal(rejected(r, 'pulse').filter((e) => SCOUTS.some((id) => JSON.stringify(e.d).includes(id))).length, 0);
});

test('K1 guard: a slot foe already bound in an earlier turn gains nothing from K1 (its slot is no authorization of this turn)', async () => {
    // the next reply (I132, T66): the scouts are not born in it; nothing about them changes
    const { r } = await replyCase(content, 132);
    assert.equal(rejected(r, 'pulse').length, 0);
    assert.deepEqual(events(r, 'delta.rejected').map((e) => e.d.rule), pilot[132].extra.avereth.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule));
});

test('K1 guard: PULSE A outside a Dungeon is unchanged (original T19: the flanking dogs of a danger window stay refused)', async () => {
    const { r } = await replyCase(content, 38);
    assert.deepEqual(rejected(r, 'road').map((e) => e.d.reason), pilot[38].extra.avereth.events.filter((e) => e.t === 'delta.rejected' && e.d.rule === 'road').map((e) => e.d.reason));
    assert.ok(upTo(38).length === 39);
});
