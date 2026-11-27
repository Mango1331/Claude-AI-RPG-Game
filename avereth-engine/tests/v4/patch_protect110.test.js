import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';

const content = await loadProductContent();
const original = JSON.parse(fs.readFileSync(new URL('./fixtures/batch5_npc_presence.json', import.meta.url)));
const base = JSON.parse(fs.readFileSync(new URL('./fixtures/batch2_trade_people.json', import.meta.url)))['005_121'].state;
const GUARD = 'npc.npcgate_guard';

function enter(prose, name, evidence = null) {
    const state = structuredClone(base);
    state.entities[GUARD].name = name;
    state.entities[GUARD].descriptors = [];
    const input = { scene: 'here', expected: {}, deltas: [{ seq: 1, type: 'enter', who: GUARD, evidence }] };
    const r = applyWorld(state, content, input, { prose, msg: 500 });
    const replay = structuredClone(state);
    for (const event of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, event);
    assert.deepEqual(replay, r.state, 'serialized events reproduce the exact state');
    // A regenerated/swiped reply starts from its prior state, not an already advanced state.
    assert.deepEqual(applyWorld(state, content, input, { prose, msg: 500 }).events, r.events);
    return r;
}
const arrived = r => r.events.filter(e => e.t === 'scene.entered' && e.d.id === GUARD).length;

// Original prose with an established elsewhere NPC in a small existing test state. The separate original-state
// replay is recorded in the patchnote; no whole campaign fixture is needed to test these evidence rules.
test('protect110: original Warrior T51 — an unbroken rhythm does not negate Marta behind the bar', () => {
    const r = enter(original['001-guild-warrior-T51'].prose, 'Marta');
    assert.equal(arrived(r), 1);
    assert.deepEqual(r.rejected, []);
});

test('protect110: original Mage T79 — Osser\'s audible voice identifies the known person', () => {
    const r = enter(original['002-guild-mage-T79'].prose, 'Osser');
    assert.equal(arrived(r), 1);
    assert.deepEqual(r.rejected, []);
});

test('protect110: an overlong quote does not taint a separate actual presence clause', () => {
    const prose = 'Marta stood beside Alaric, her hands never leaving the dough.';
    assert.equal(arrived(enter(prose, 'Marta', prose.slice(0, -1))), 1);
});

for (const apostrophe of ["'", '’']) test(`protect110: a present voice with ${apostrophe} identifies its owner`, () => {
    assert.equal(arrived(enter(`Osser${apostrophe}s voice rang out beside Alaric, low and steady.`, 'Osser')), 1);
});

test('words without an enter claim do not establish the known person', () => {
    const r = applyWorld(base, content, {scene:'here', expected:{}, deltas:[]},
        {prose:'Osser stood beside the road.'});
    assert.equal(arrived(r), 0);
});
