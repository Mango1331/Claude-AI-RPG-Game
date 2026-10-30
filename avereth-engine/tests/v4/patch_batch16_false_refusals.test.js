import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { offerAdvice } from '../../src/v4/trade.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { applyEvent } from '../../src/state.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const original = JSON.parse(fs.readFileSync(new URL('./fixtures/batch16_false_refusals.json', import.meta.url)));
const MARLA = 'npc.marla_otterwell';
const tx = r => r.events.filter(e => e.t === 'transaction.completed');
const entered = r => r.events.some(e => e.t === 'scene.entered' && e.d.id === MARLA);

function replay(before, result) {
    const state = structuredClone(before);
    for (const event of JSON.parse(JSON.stringify(result.events))) applyEvent(state, event);
    assert.deepEqual(state, result.state, 'serialized event replay reproduces the result');
    assert.deepEqual(validateState(state, content), []);
}

test('batch16: original own 17-cp bid, same recorded acceptance: one payment and one transfer per lot', () => {
    const f = original.sale;
    const r = applyWorld(f.state, content, f.answer, { prose: f.prose, msg: 78 });
    const bid = r.events.find(e => e.t === 'offer.created' && e.d.offer.bid)?.d.offer;
    assert.ok(bid, 'the buyer herself offers seventeen copper, not third-party advice');
    assert.equal(bid.price_cp, 17);
    assert.equal(bid.lines.length, 2);
    replay(f.state, r);
    const accepted = playerTurnV4(r.state, content, f.accept, { msg: 79, c: true, commands: f.commands });
    assert.equal(tx(accepted).length, 1);
    assert.equal(tx(accepted)[0].d.cp, 17);
    assert.equal(accepted.state.entities.pc.sheet.coin_cp, r.state.entities.pc.sheet.coin_cp + 17);
    for (const line of bid.lines) assert.deepEqual(accepted.state.objects[line.object].holder, { entity: bid.seller });
    replay(r.state, accepted);
    const repeat = playerTurnV4(accepted.state, content, 'I accept the same bid again.', { msg: 800, c: true,
        commands: [{ seq: 1, type: 'offer.accept', offer: bid.id, quote: 'I accept the same bid again.' }] });
    assert.equal(tx(repeat).length, 0);
    assert.deepEqual(applyWorld(f.state, content, f.answer, { prose: f.prose, msg: 78 }).events, r.events, 'swipe from the same prior state is deterministic');
});

for (const said of ["I'd pay seventeen copper.", "I'll pay seventeen copper.", "We'd pay seventeen copper.", "We'll pay seventeen copper.", 'I’d pay seventeen copper.']) {
    test(`batch16: first-person bid is not another person's price: ${said}`, () => {
        assert.equal(offerAdvice('', said, 'Guild clerk', [], 'loc.glassmere.guild_hall'), false);
    });
}
for (const said of ['He will pay seventeen copper.', "He'd pay seventeen copper.", 'Halvard pays seventeen copper.', "I'd pay seventeen copper, but Halvard pays twenty."]) {
    test(`batch16: real third-party price advice remains advice: ${said}`, () => {
        assert.equal(offerAdvice('', said, 'Guild clerk', [], 'loc.glassmere.guild_hall'), true);
    });
}

function go(name, state = original.fork.state) {
    const input = `I follow ${name}.`;
    return playerTurnV4(state, content, input, { msg: 999, c: true,
        commands: [{ seq: 1, type: 'go', to: { new: name }, quote: input }] });
}
const blocked = r => r.outcome.resolutions.some(x => x.reason === 'blocked');

test('batch16: original left passage is not barred by the fitted slab in the right passage', () => {
    const f = original.fork;
    const r = playerTurnV4(f.state, content, f.input, { msg: 297, c: true, commands: f.commands });
    assert.equal(blocked(r), false);
    assert.equal(r.outcome.resolutions[0].status, 'authorized');
    assert.equal(r.state.scene.at, f.state.scene.at, 'GO authorization alone is not an arrival');
    replay(f.state, r);
});

for (const name of ['the right passage', 'the right-hand sloping passage', 'down the right-hand sloping passage, following the cold draught', 'the fitted slab']) {
    test(`batch16: the actual blocked route stays blocked as ${name}`, () => {
        const r = go(name);
        assert.equal(blocked(r), true);
        assert.equal(r.state.scene.at, original.fork.state.scene.at);
    });
}

test('batch16: a different new route does not inherit a blocker from one shared word', () => {
    assert.equal(blocked(go('the narrow upper passage')), false);
    assert.equal(blocked(go('the left-hand corridor')), false);
});

test('batch16: canonical passage identity and its blocker prevail over free route wording', () => {
    const s = structuredClone(original.fork.state);
    const from = s.scene.at;
    const to = 'loc.test_right_gallery';
    s.places[to] = { id: to, name: 'Right gallery', kind: 'interior', parent: s.places[from].parent, known: 'seen', level: 2 };
    s.links['link.test_right'] = { id: 'link.test_right', a: from, b: to, name: 'narrow upper passage', both: true, hidden: false, feature: 'feat.4', dir: null };
    assert.equal(blocked(go('the narrow upper passage', s)), true);
    assert.equal(blocked(go('Right gallery', s)), true);
});

test('batch16: original Marla short name permits her arrival and dependent memory, replay and swipe', () => {
    const f = original.marla;
    const r = applyWorld(f.state, content, f.answer, { prose: f.prose, msg: 142 });
    assert.equal(entered(r), true);
    assert.ok(r.events.some(e => e.t === 'memory.recorded' && e.d.memory.who?.includes(MARLA)));
    assert.ok(!r.rejected.some(x => x.rule === 'npc_presence' || x.rule === 'npc_continuity'));
    replay(f.state, r);
    assert.deepEqual(applyWorld(f.state, content, f.answer, { prose: f.prose, msg: 142 }).events, r.events);
});

function marla(prose, state = original.marla.state) {
    return applyWorld(state, content, { scene: 'here', expected: {}, deltas: [{ seq: 1, type: 'enter', who: MARLA, evidence: prose }] }, { prose, msg: 900 });
}

test('batch16: two known Marlas make a short name ambiguous without merging either person', () => {
    const state = structuredClone(original.marla.state);
    state.entities['npc.marla_other'] = { ...structuredClone(state.entities[MARLA]), id: 'npc.marla_other', name: 'Marla Reed', known_name: 'Marla Reed', descriptors: [] };
    const r = marla('Marla stood beside the gate, holding a fork.', state);
    assert.equal(entered(r), false);
    assert.equal(r.state.entities[MARLA].name, 'Marla Otterwell');
    assert.equal(r.state.entities['npc.marla_other'].name, 'Marla Reed');
    assert.equal(entered(marla('Marla Otterwell stood beside the gate, holding a fork.', state)), true);
});

test('batch16: an NPC sharing the player name cannot borrow the player presence', () => {
    const state = structuredClone(original.marla.state);
    state.entities[MARLA].name = 'Alaric Otterwell';
    state.entities[MARLA].known_name = 'Alaric Otterwell';
    state.entities[MARLA].descriptors = [];
    assert.equal(entered(marla('Alaric stood beside the gate, holding a fork.', state)), false);
});

for (const prose of ['Marla was not beside the gate.', 'He remembered Marla standing beside the gate.', 'If Marla stood beside the gate, she would see him.', 'Doss stood beside the gate, holding a fork.']) {
    test(`batch16: a short name does not waive actual presence: ${prose}`, () => {
        assert.equal(entered(marla(prose)), false);
    });
}
