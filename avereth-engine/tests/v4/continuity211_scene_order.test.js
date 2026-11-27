import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';

const content = await loadProductContent();
const { start, prose, reports } = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/continuity211_wren_arrival.json.gz', import.meta.url))));
const farm = 'loc.halloran_steading';
const farmer = 'npc.marta_halloran';
const apply = (report, state = start) => applyWorld(state, content, report, { msg:48, prose });

test('C19 follow-up: an explicitly situated encounter survives a late arrival declaration, the original evidence and source order remain intact', () => {
    const original = structuredClone(reports[1]);
    const r = apply(original);
    assert.equal(r.state.scene.at, farm);
    assert.ok(r.state.scene.present.includes(farmer));
    assert.ok(r.events.some(e => e.t === 'fact.asserted' && e.d.fact.s === 'npc.tam' && e.d.fact.p === 'status' && e.d.fact.o.includes('lung-fever')));
    const arrival = r.events.findIndex(e => e.t === 'scene.moved' && e.d.at === farm);
    const entry = r.events.findIndex(e => e.t === 'scene.entered' && e.d.id === farmer);
    const track = r.events.findIndex(e => e.t.startsWith('thread.') && JSON.stringify(e.d).includes('Splayed prints'));
    assert.ok(track >= 0 && track < arrival && arrival < entry);
    assert.deepEqual(original, reports[1]);
    const persisted = structuredClone(start);
    JSON.parse(JSON.stringify(r.events)).forEach(e => applyEvent(persisted, e));
    assert.deepEqual(persisted, r.state);
});

test('earlier observations inherit their chronological scene, and no arrival means no encounter at the destination', () => {
    assert.equal(apply(reports[0]).state.scene.at,farm);
    const absent = structuredClone(reports[1]);
    absent.deltas = absent.deltas.filter(d => d.type !== 'arrive');
    absent.expected = {};
    const r = apply(absent);
    assert.ok(!r.state.scene.present.includes(farmer));
    assert.ok(r.rejected.some(e => e.rule === 'scene_context'));
});

test('an already visited scene and an intervening mechanical delta preserve the chronology reported by the extractor', () => {
    const enter = reports[1].deltas.find(d => d.type === 'enter');
    const arrival = reports[1].deltas.find(d => d.type === 'arrive');
    const altered = middle => ({scene:farm, expected:{}, deltas:[{...enter,seq:1}, ...middle, {...arrival,seq:5}]});
    assert.ok(apply(altered([{seq:2,type:'time',minutes:5}])).rejected.some(x => x.seq === 1 && x.rule === 'scene_context'));
    assert.ok(apply(altered([{...arrival,seq:2},{...arrival,seq:3,at:start.scene.at}])).rejected.some(x => x.seq === 1 && x.rule === 'scene_context'));
});

test('a report can describe two encounters before their respective arrivals without moving the origin or expenditure', () => {
    const road = start.scene.at;
    const destination = 'loc.ashbridge';
    const report = {scene:destination, deltas:[
        {seq:1,type:'fact',s:'npc.mother_wren',p:'manner',o:'speaks softly',scene:road},
        {seq:2,type:'enter',who:farmer,scene:farm,evidence:'Marta waited at the threshold.'},
        {seq:3,type:'arrive',at:farm},
        {seq:4,type:'fact',s:farmer,p:'occupation',o:'farmer',scene:farm},
        {seq:5,type:'enter',who:'npc.watchman',scene:destination,evidence:'The watchman greeted him.'},
        {seq:6,type:'arrive',at:destination},
    ]};
    assert.ok(!apply(report).rejected.some(x => x.seq === 2 && x.rule === 'scene_context'));
    const denied = structuredClone(start);
    denied.last.outcome = {c:true, auth:{c:true,gos:[],timeCap:5}, expected_keys:{}};
    denied.last.input = 'I stay here. I only want directions.';
    const refused = apply({...reports[1], expected:{}}, denied);
    assert.equal(refused.state.scene.at, road);
    assert.ok(!refused.state.scene.present.includes(farmer));
    assert.ok(!refused.events.some(e => e.t === 'fact.asserted' && e.d.fact.s === 'npc.tam'));
});
