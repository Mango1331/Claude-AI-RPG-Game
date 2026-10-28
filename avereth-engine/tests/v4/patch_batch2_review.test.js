import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';
import { parseExtraction, worldVocab } from '../../src/v4/extract.js';
import { extractorCatalog, buildCatalog } from '../../src/v4/catalog.js';
import { planContext, parsePlan } from '../../src/v4/planner.js';
import { planMessage } from '../../src/v4/runtime.js';
import { narratorProviderResponse } from '../../src/v4/narrator_recovery.js';

const content = await loadProductContent();
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/batch2_trade_people.json', import.meta.url)));
const run = x => applyWorld(structuredClone(x.state), content, structuredClone(x.answer), { prose: x.prose, msg: 501 });
function parsed(x) {
    return parseExtraction(JSON.stringify(x.answer), worldVocab(content.deltaVocab, x.state), extractorCatalog(x.state, content, { c: true }),
        x.state.last.outcome.expected_keys, { sceneRequired: true, startScene: x.state.scene.at, state: x.state, content });
}
function openSale() {
    const x = structuredClone(fixtures['005_121']);
    x.state.decisions.filter(d => d.kind === 'sale').forEach(d => { d.seller = null; });
    x.answer.deltas = x.answer.deltas.filter(d => d.type === 'offer');
    return x;
}

test('Batch2 review A: sale without a named buyer rejects a reversed offer for the held object', () => {
    const x = openSale();
    assert.equal(parsed(x).valid, true);
    assert.ok(parsed(x).issues.length);
    const r = run(x);
    assert.ok(r.rejected.some(d => d.rule === 'trade_direction'));
    assert.ok(!r.events.some(e => e.t === 'offer.created'));
    assert.equal(r.state.entities.pc.sheet.coin_cp, x.state.entities.pc.sheet.coin_cp);
    assert.deepEqual(r.state.objects, x.state.objects);
});

test('Batch2 review A: an unnamed sale does not suppress unrelated goods or an explicit purchase', () => {
    const x = openSale();
    x.answer.deltas[0].lines[0].what = 'a whetstone';
    x.answer.deltas[0].lines = [x.answer.deltas[0].lines[0]];
    assert.ok(run(x).events.some(e => e.t === 'offer.created'));
    x.answer.deltas[0].lines[0].what = 'needle tooth';
    x.state.decisions.push({ id: 'dec.purchase', kind: 'purchase', turn: x.state.turn, at: x.state.scene.at,
        seller: 'npc.corr', what: 'needle tooth', seq: 9 });
    assert.ok(run(x).events.some(e => e.t === 'offer.created'));
});

test('Batch2 review A: different present buyers retain their own bids for the same object; replay agrees', () => {
    const x = openSale(), other = 'npc.other_buyer', object = 'obj.t230.needle_tooth';
    x.state.entities[other] = { ...structuredClone(x.state.entities['npc.corr']), id: other, name: 'Other buyer' };
    x.state.scene.present.push(other);
    x.answer.expected = {};
    x.answer.deltas = ['npc.corr', other].map((buyer, i) => ({ seq: i + 1, type: 'bid', buyer,
        lines: [{ object, qty: 1 }], price_cp: 20 + i, said: `${20 + i} copper for the tooth.` }));
    x.prose = 'Corr offers 20 copper for the tooth. Other buyer offers 21 copper for the tooth.';
    const r = run(x);
    assert.ok(Object.values(r.state.offers).some(o => o.bid && o.status === 'open' && o.seller === 'npc.corr'));
    assert.ok(Object.values(r.state.offers).some(o => o.bid && o.status === 'open' && o.seller === other));
    const replay = structuredClone(x.state);
    for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, e);
    assert.deepEqual(replay, r.state);
});

for (const repair of ['', '{invalid json', null]) test(`Batch2 review B: pure initial trade conflict survives ${repair === null ? 'failed' : repair ? 'malformed' : 'empty'} repair`, async () => {
    const x = fixtures['005_123'];
    const ctx = planContext(x.state, content, buildCatalog(x.state, content, { c: true }));
    const first = x.plan[1];
    assert.equal(parsePlan(first, content.commandVocab, ctx, x.player).tradeConflict, true);
    let calls = 0;
    const p = await planMessage(async () => {
        if (++calls === 1) return first;
        if (repair === null) throw new Error('HTTP 401');
        return repair;
    }, content, ctx, x.player);
    assert.equal(calls, 2);
    assert.equal(p.failed, false);
    assert.deepEqual(p.commands.map(c => c.type), ['clarify']);
});

test('Batch2 review B: malformed/mixed first plans do not become a harmless trade conflict', async () => {
    const x = fixtures['005_123'];
    const ctx = planContext(x.state, content, buildCatalog(x.state, content, { c: true }));
    const bad = JSON.parse(x.plan[1]); bad.commands[0].unexpected = true;
    let calls = 0;
    const p = await planMessage(async () => ++calls === 1 ? JSON.stringify(bad) : '{invalid json', content, ctx, x.player);
    assert.equal(p.failed, true);
    assert.equal(p.commands, null);
});

for (const reverse of [false, true]) test(`Batch2 review C: arrival then enter then known introduction follows seq${reverse ? ', not array order' : ''}`, () => {
    const x = structuredClone(fixtures['005_26']);
    const intro = x.answer.deltas.find(d => d.type === 'person.new' && d.name === 'Corlin');
    const known = 'npc.npcraftcamp_aproned';
    const arrival = x.answer.deltas.find(d => d.type === 'arrive');
    assert.ok(intro && arrival);
    x.answer.deltas = [{ ...arrival, seq: 1 }, { seq: 2, type: 'enter', who: known, scene: intro.scene }, { ...intro, seq: 3 }];
    if (reverse) x.answer.deltas.reverse();
    const p = parsed(x);
    assert.equal(p.valid, true, p.issues.map(x=>x.why).join(';'));
    const r = run(x);
    assert.ok(r.state.scene.present.includes(known));
    assert.equal(r.state.entities[known].at, r.state.scene.at);
    assert.equal(Object.values(r.state.entities).filter(e => e.name === 'Corlin').length, 1);
    const replay = structuredClone(x.state);
    for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, e);
    assert.deepEqual(replay, r.state);
});

test('Batch2 review C: a later enter cannot justify an earlier contradictory introduction', () => {
    const x = structuredClone(fixtures['005_26']);
    const intro = x.answer.deltas.find(d => d.type === 'person.new' && d.name === 'Corlin');
    const arrival = x.answer.deltas.find(d => d.type === 'arrive');
    x.answer.deltas = [{ ...arrival, seq: 1 }, { ...intro, seq: 2 }, { seq: 3, type: 'enter', who: 'npc.npcraftcamp_aproned', scene: intro.scene }];
    assert.equal(parsed(x).valid, true);
    assert.ok(parsed(x).issues.length);
});

for (const [name, status, error, count] of [
    ['HTTP 200 type is not hidden by a different code', 200, { type: 'server_error', code: 'provider_overloaded' }, 2],
    ['permanent 401 overrides server_error body', 401, { type: 'server_error' }, 1],
    ['permanent 200 error', 200, { type: 'invalid_request_error', code: 'invalid_api_key' }, 1],
    ['permanent 200 code overrides generic server_error', 200, { type: 'server_error', code: 'invalid_api_key' }, 1],
    ['context limit is not transient', 200, { type: 'server_error', code: 'context_length_exceeded' }, 1],
    ['429 quota exhaustion is not a rate-limit retry', 429, { type: 'server_error', code: 'insufficient_quota' }, 1],
    ...[429, 502, 503, 504].map(status => [`HTTP ${status}`, status, {}, 2]),
]) test(`Batch2 review D: ${name}`, async () => {
    let calls = 0;
    await narratorProviderResponse(async () => {
        calls++;
        return new Response(JSON.stringify(calls === 1 ? { error } : { choices: [{ message: { content: 'Story.' } }] }), { status: calls === 1 ? status : 200 });
    }, { isCurrent: () => true, mark() {}, save: async () => {} });
    assert.equal(calls, count);
});
