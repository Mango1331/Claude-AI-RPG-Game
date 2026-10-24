import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, inject, lastUser } from './patch8_lib.js';
import { setFactEvents, truth } from '../../src/knowledge.js';
import { applyEvent } from '../../src/state.js';
import { materialise } from '../../src/engine.js';
import { Dice } from '../../src/rng.js';
import { guardCommands } from '../../src/v4/agency.js';
import { resolveCommands } from '../../src/v4/commands.js';

const content = await loadProductContent();
const base = (await campaign(content)).state();
function facts(s, subject, p, o, id) {
    const events = setFactEvents(s, { s: subject, p, o, id, source: { kind: 'engine' } });
    events.forEach(e => applyEvent(s, e));
    return events;
}
test('10B-1 four long NPC identities retain armed facts and real bow sheets', () => {
    const s = structuredClone(base), log = [], initial = structuredClone(s);
    const emit = e => { log.push(e); applyEvent(s, e); };
    for (let n = 1; n <= 4; n++) {
        const id = `npc.npcford_robber_archer_${n}`;
        emit({ t: 'entity.created', d: { entity: { id, kind: 'npc', template: 'bandit', descriptors: ['bandit'], status: 'alive', location: s.scene.location } } });
        setFactEvents(s, { s: id, p: 'armed', o: 'bow', source: { kind: 'engine' } }).forEach(emit);
    }
    for (let n = 1; n <= 4; n++) {
        const id = `npc.npcford_robber_archer_${n}`;
        assert.equal(truth(s, id, 'armed')[0]?.o, 'bow');
        materialise(s, content, new Dice(7), emit, id);
        assert.equal(s.entities[id].sheet.equipment.weapon.family, 'bow');
    }
    JSON.parse(JSON.stringify(log)).forEach(e => applyEvent(initial, e));
    assert.deepEqual(initial.facts, s.facts);
});
test('10B-1 nonfunctional values and predicate identities do not overwrite', () => {
    const s = structuredClone(base);
    facts(s, 'pc', 'likes', 'rain'); facts(s, 'pc', 'likes', 'sun');
    assert.equal(truth(s, 'pc', 'likes').length, 2);
    assert.deepEqual(facts(s, 'pc', 'likes', 'rain'), []);
    facts(s, 'pc', 'a_very_long_shared_predicate_one', 'one');
    facts(s, 'pc', 'a_very_long_shared_predicate_two', 'two');
    assert.equal(truth(s, 'pc', 'a_very_long_shared_predicate_one')[0]?.o, 'one');
});
test('10B-1 functional A-B-A history in one turn, explicit IDs and references survive replay', () => {
    const s = structuredClone(base), initial = structuredClone(s), events = [];
    for (const value of ['A', 'B', 'A']) events.push(...facts(s, 'npc.test', 'occupation', value));
    const all = Object.values(s.facts).filter(f => f.s === 'npc.test');
    assert.equal(all.length, 3); assert.equal(all.filter(f => f.until).length, 2);
    assert.equal(truth(s, 'npc.test', 'occupation')[0].o, 'A');
    events.push(...facts(s, 'npc.test', 'likes', 'tea', 'f.explicit'));
    const k = { t: 'knowledge.gained', d: { who: 'pc', about: 'f.explicit', stance: 'knows', source: 'witnessed' } };
    events.push(k); applyEvent(s, k);
    JSON.parse(JSON.stringify(events)).forEach(e => applyEvent(initial, e));
    assert.deepEqual(initial.facts, s.facts); assert.deepEqual(initial.knowledge, s.knowledge);
});

async function registration() {
    const g = await campaign(content);
    const s = g.state(), at = 'loc.ashbridge.guild_hall';
    inject(g, [
        { t: 'place.created', d: { place: { id: at, name: 'Guild hall', kind: 'guild_hall', parent: s.scene.location, realm: 'realm.valedorn_crown', tags: ['guild'] } } },
        { t: 'scene.moved', d: { at, location: s.scene.location, place: 'Guild hall', reset_present: true } },
        { t: 'offer.created', d: { offer: { id: 'offer.registration', seller: 'guild', at, status: 'open', canon: true, lines: [{ id: 'l1', what: 'Guild registration fee', kind: 'service', service: 'guild_registration', qty: 1, price_cp: 20 }] } } },
    ]);
    return g;
}
const register = { seq: 1, type: 'guild.register', quote: 'I register as Alaric Red' };
const accept = { seq: 2, type: 'offer.accept', offer: 'offer.registration', lines: ['l1'], qty: null, needs: 1, quote: 'I pay the fee' };
test('10B-1 original pending registration executes dependent payment once through planner and guard', async () => {
    const g = await registration();
    await say(g, 'I register as Alaric Red. I pay the fee.', register, accept);
    assert.equal(g.state().entities.pc.sheet.coin_cp, 30);
    assert.equal(g.state().guild.membership?.rank, 'Novice');
    assert.equal(lastUser(g).events.filter(e => e.t === 'guild.registered').length, 1);
    await say(g, 'I pay the fee.', { ...accept, seq: 1, needs: undefined });
    assert.equal(g.state().entities.pc.sheet.coin_cp, 30);
});
test('10B-1 genuine guard refusals never fulfill dependencies, even for a member', async () => {
    for (const rule of ['no_evidence', 'npc_actor', 'negation', 'plan']) {
        const g = await registration(), s = g.state();
        s.guild.membership = { rank: 'Novice' };
        const events = []; const emit = e => { events.push(e); applyEvent(s, e); };
        resolveCommands(s, content, [accept], emit, { c: true, dropped: [{ command: register, rule }] });
        assert.equal(events.find(e => e.t === 'cmd.resolved')?.d.reason, 'needs step 1');
        assert.equal(events.filter(e => e.t === 'coin.changed').length, 0);
    }
});
test('10B-1 pending, failed and absent predecessors stay blocked; closed offer is never paid', async () => {
    const g = await registration();
    for (const closed of [false, true]) {
        const s = g.state(), events = []; if (closed) s.offers['offer.registration'].status = 'closed';
        resolveCommands(s, content, [accept], e => { events.push(e); applyEvent(s, e); }, { c: true });
        assert.equal(events.find(e => e.t === 'cmd.resolved')?.d.reason, 'needs step 1');
        assert.equal(s.entities.pc.sheet.coin_cp, 50);
    }
});
test('10B-1 guard still removes only the redundant registration', () => {
    const r = guardCommands('I register as Alaric Red. I pay the fee.', [register, accept], { registrationPending: true, registrationOffer: 'offer.registration' });
    assert.deepEqual(r.kept, [accept]); assert.equal(r.dropped[0].rule, 'redundant');
});

test('10B-1 explicit legacy event IDs and knowledge are not renamed during reload', () => {
    const s = structuredClone(base);
    const event = { t: 'fact.asserted', d: { fact: { id: 'f.old_24_character_prefix.armed.t1', s: 'npc.old', p: 'armed', o: 'bow', since: { turn: 1, minute: 540 }, until: null } } };
    applyEvent(s, JSON.parse(JSON.stringify(event)));
    assert.deepEqual(s.facts[event.d.fact.id], event.d.fact);
    facts(s, 'npc.new', 'armed', 'knife');
    assert.deepEqual(s.facts[event.d.fact.id], event.d.fact);
});
test('10B-1 occupied automatic IDs, including a hash collision, never overwrite history', () => {
    const s = structuredClone(base);
    const first = setFactEvents(s, { s: 'npc.test', p: 'likes', o: 'tea' })[0];
    s.facts[first.d.fact.id] = { ...first.d.fact, s: 'npc.other', until: { turn: 1, minute: 540 } };
    const added = facts(s, 'npc.test', 'likes', 'tea');
    assert.notEqual(added[0].d.fact.id, first.d.fact.id);
    assert.equal(s.facts[first.d.fact.id].s, 'npc.other');
});
test('10B-1 paid membership satisfies only a truly redundant registration', async () => {
    const s = (await registration()).state();
    s.guild.membership = { rank: 'Novice' };
    const events = [];
    resolveCommands(s, content, [{ seq: 2, type: 'drop', object: 'absent', needs: 1, quote: 'I drop it' }], e => { events.push(e); applyEvent(s, e); },
        { c: true, dropped: [{ command: register, rule: 'redundant' }] });
    assert.equal(events.find(e => e.t === 'cmd.resolved')?.d.reason, 'he does not hold it');
});
test('10B-1 replacement cannot pay a closed offer or spend missing funds; V4-A does not gain dependency bypass', async () => {
    const g = await registration();
    for (const mode of ['closed', 'poor', 'a']) {
        const s = g.state(), events = []; if (mode === 'closed') s.offers[accept.offer].status = 'closed';
        if (mode === 'poor') s.entities.pc.sheet.coin_cp = 0;
        resolveCommands(s, content, [accept], e => { events.push(e); applyEvent(s, e); }, { c: mode !== 'a', dropped: [{ command: register, rule: 'redundant' }] });
        if (mode !== 'a') { assert.equal(events.filter(e => e.t === 'coin.changed').length, 0); assert.ok(!s.guild.membership); }
        else assert.equal(s.entities.pc.sheet.coin_cp, 30, 'A keeps its existing no-needs semantics');
    }
});
