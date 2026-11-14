// Location architecture .190, stage 2 (docs/LOCATION_ARCHITECTURE_190.md): the movement proof. The GO handler decides a
// step once (mode, the Dungeon it goes into, the scope of a new place) and stores it with the step; the World allows an
// arrival only where that step may end (src/v4/movement.js allowedArrival) and makes a reported place only once the
// arrival is allowed. A scope is no destination; a step named for a Dungeon's way in ends at its gate; a stop short of
// the target stays a stop; a local hunt exploration stays in its habitat. B1: a way down leads to a level the Dungeon has.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat } from '../../src/host.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';
import { applyWorld } from '../../src/v4/world.js';
import { stepOf, allowedArrival } from '../../src/v4/movement.js';
import { levelVia } from '../../src/v4/dungeon.js';
import { sealRefusal } from '../../src/v4/living.js';
import { contractValue } from '../../tools/replay/contract_c.mjs';
import { campaign, walk, say, linesOf, hero, delve, living, CATA, GO } from './patch8_lib.js';

const content = await loadProductContent();
const load = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(`./fixtures/${f}`, import.meta.url))));
const mage = load('batch186_mage_grotto.json.gz');
const GROTTO = 'loc.glimmerdeep_grotto';
const outside = () => foldChat(structuredClone(mage.chat), 63).state; // .186 Mage on the Grotto road, before its mouth
const turn = (s, text, commands) => playerTurnV4(s, content, text, { c: true, commands });
const gosOf = (t) => t.events.find((e) => e.t === 'outcome.recorded').d.outcome.auth.gos;
const room = (name) => ({ new: { name, kind: 'interior', parent: GROTTO } });
const arriveAt = (at, arrived = true) => ({ scene: at, expected: { 1: { arrived, at, with: null } }, deltas: [{ seq: 1, type: 'arrive', at, with: null, forced_by: null, scene: at }] });

test('.190 movement: a step stores what the GO decided (mode, Dungeon, scope); a record from before .190 gets the same from the same rules', () => {
    const s = outside();
    const t = turn(s, 'I walk the last quarter mile to the Grotto mouth', [{ seq: 1, type: 'go', to: { new: 'the Grotto mouth' }, quote: 'I walk the last quarter mile to the Grotto mouth' }]);
    const [g] = gosOf(t);
    assert.equal(g.to, GROTTO);
    assert.deepEqual([g.mode, g.enter, g.scope, g.way_in], ['dungeon', { dungeon: GROTTO, root: GROTTO, gate: true }, GROTTO, true]);
    const { mode, enter, scope, way_in, ...old } = g;
    assert.deepEqual(stepOf(s, old), { ...old, mode, enter: { ...enter, gate: false }, scope }, 'an older step names no way in: the Dungeon itself');
});

test('.190 movement .186 Mage #76: a room of the Grotto told from the road, his step not set out for it, is refused and never made (no orphan)', () => {
    const s = outside();
    const t = turn(s, 'I edge toward the cold blue-green glow', [{ seq: 1, type: 'go', to: { new: 'toward the cold blue-green glow' }, quote: 'I edge toward the cold blue-green glow' }]);
    const r = replyTurnV4(t.state, content, arriveAt(room('hollow of the coiled glow')), { prose: 'He finds himself in a hollow of coiled glow.' });
    assert.equal(r.state.scene.at, s.scene.at);
    assert.ok(r.rejected.some((x) => x.rule === 'passage' && /lies in Glimmerdeep Grotto, where he did not set out for/.test(x.why)));
    assert.ok(!r.events.some((e) => e.t === 'place.created'), 'no room left behind');
});

test('.190 movement .186 Mage #63/#64: a step to the Grotto mouth ends at the gate; a room told past it is not entered (gate arrival is not being inside)', () => {
    const s = outside();
    const t = turn(s, 'I walk the last quarter mile to the Grotto mouth and look inside', [{ seq: 1, type: 'go', to: { new: 'the Grotto mouth' }, quote: 'I walk the last quarter mile to the Grotto mouth and look inside' }]);
    const r = replyTurnV4(t.state, content, arriveAt(room('mouth tunnel')), { prose: 'He walks into the mouth tunnel.' });
    assert.equal(r.state.scene.at, GROTTO, 'at the gate he did reach');
    assert.ok(!Object.values(r.state.places).some((p) => p.name === 'mouth tunnel'));
    assert.ok(r.corrections.some((x) => /Alaric is at Glimmerdeep Grotto: he set out for the gate of Glimmerdeep Grotto; going in is his next step; he did not go in\./.test(x)));
});

test('.190 movement: a scope is no destination – "reached" at another place of the town is refused; a stop short of the target stays a stop', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    await walk(g, 'loc.ashbridge', { text: '*i walk to ashbridge*', prose: 'Ashbridge.' });
    const s = g.state();
    const hall = Object.values(s.places).find((p) => p.parent === 'loc.ashbridge' && /Guild hall/.test(p.name)).id;
    const lane = { new: { name: 'the cooper lane', kind: 'site', parent: 'loc.ashbridge' } };
    const t = turn(s, 'I go to the Guild hall', [{ seq: 1, type: 'go', to: hall, quote: 'I go to the Guild hall' }]);
    const claimed = replyTurnV4(t.state, content, arriveAt(lane, true), { prose: 'He reaches the cooper lane.' });
    assert.equal(claimed.state.scene.at, 'loc.ashbridge');
    assert.ok(claimed.rejected.some((x) => x.rule === 'passage' && /is not where his step goes/.test(x.why)));
    assert.ok(!Object.values(claimed.state.places).some((p) => p.name === 'the cooper lane'), 'not made');
    const stop = replyTurnV4(t.state, content, { scene: lane, expected: { 1: { arrived: false, at: null, with: null } }, deltas: [{ seq: 1, type: 'arrive', at: lane, with: null, forced_by: null, scene: lane }] }, { prose: 'Halfway, a cart blocks the cooper lane.' });
    assert.equal(stop.state.places[stop.state.scene.at].name, 'the cooper lane', 'a stop on the way (.181 P2-2)');
});

test('.190 movement: back to where he set out from after a step elsewhere is a leg of its own (RETURNS), not a free arrival', () => {
    const s = outside();
    const start = s.scene.at;
    const t = turn(s, 'I walk to the Grotto mouth, then back to the pack frame', [
        { seq: 1, type: 'go', to: GROTTO, quote: 'I walk to the Grotto mouth' },
        { seq: 2, type: 'go', to: start, quote: 'then back to the pack frame' }]);
    const gos = gosOf(t);
    assert.deepEqual(gos.map((g) => g.to), [GROTTO, start]);
    assert.equal(gos[1].back, true);
    assert.match(t.events.find((e) => e.t === 'outcome.recorded').d.outcome.actions.join('\n'), /2\. RETURNS — to /);
    // alone, it is still nothing to do
    const alone = turn(s, 'I go back to the pack frame', [{ seq: 1, type: 'go', to: start, quote: 'I go back to the pack frame' }]);
    assert.deepEqual(gosOf(alone), []);
});

test('.190 movement: a local hunt exploration ends in its habitat or a part of it, never at a known place beside it', () => {
    const steps = [{ seq: 1, to: null, newName: 'the far reeds', mode: 'within', enter: null, scope: 'h' }];
    const s = { scene: { at: 'h.edge' }, places: {
        r: { id: 'r', kind: 'realm', parent: null }, h: { id: 'h', kind: 'wilderness', parent: 'r', population: {} },
        'h.edge': { id: 'h.edge', kind: 'wilderness', parent: 'h' }, 'h.reeds': { id: 'h.reeds', kind: 'wilderness', parent: 'h' },
        mill: { id: 'mill', kind: 'site', parent: 'r' } } };
    assert.equal(allowedArrival(s, steps, 'h', {}), null, 'the habitat itself');
    assert.equal(allowedArrival(s, steps, 'h.reeds', { fresh: true }), null, 'a part of it');
    assert.match(allowedArrival(s, steps, 'mill', {}).why, /not where his step goes/);
    assert.match(allowedArrival(s, steps, 'mill', { fresh: true }).why, /not where his step goes/);
});

test('.190 B1: a way down leads to a level the Dungeon has: Glimmerdeep\'s slope stays level 1; the Catacombs\' stair leads to level 2 and its seal still holds', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The ruined chapel; a stair goes down.' });
    await delve(g, 'First Burial Gallery');
    const s = g.state();
    const part = s.scene.at;
    assert.equal(s.places[part].level, 1);
    assert.equal(levelVia(s, part, { a: part, dir: 'down' }), 2, 'the Catacombs have a level 2');
    const below = structuredClone(s);
    below.places[`${CATA}.stair_foot`] = { id: `${CATA}.stair_foot`, name: 'stair foot', kind: 'interior', parent: CATA, realm: s.places[CATA].realm, tags: [] };
    assert.match(sealRefusal(below, `${CATA}.stair_foot`, 2) || '', /sealed until the guardian of level 1 falls/, 'its seal still holds');
    assert.ok(living(g).floors[2]);
});

test('.190 movement: a reply applied twice gives the same events (the step is read from the record, never from the reply)', () => {
    const s = outside();
    const t = turn(s, 'I walk the last quarter mile to the Grotto mouth', [{ seq: 1, type: 'go', to: { new: 'the Grotto mouth' }, quote: 'I walk the last quarter mile to the Grotto mouth' }]);
    const a = applyWorld(t.state, content, contractValue(arriveAt(GROTTO), t.state, content), { prose: 'He reaches the Grotto mouth.', msg: 64 });
    const b = applyWorld(t.state, content, contractValue(arriveAt(GROTTO), t.state, content), { prose: 'He reaches the Grotto mouth.', msg: 64 });
    assert.equal(a.state.scene.at, GROTTO);
    assert.deepEqual(a.events, b.events);
});
