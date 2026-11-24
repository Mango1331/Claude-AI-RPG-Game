import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';

const source = JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/continuity210_creature_b7.json.gz', import.meta.url))));
const content = await loadProductContent();
const dogs = [1, 2, 3].map(i => 'mon.group_cot_dogs_' + i);
const cot = 'loc.shepherds_cot';
const town = 'loc.ashbridge';

function play(f) {
    const player = playerTurnV4(f.start, content, f.input, { c: true, commands: f.planner.commands, msg: f.inputMessageIndex });
    return replyTurnV4(player.state, content, f.report, { msg: f.inputMessageIndex + 1, prose: f.prose });
}

test('B7 passing creatures on the way between independent places leaves them at the cot', () => {
    for (const sharedKind of ['realm', 'region']) {
        const f = structuredClone(source);
        if (sharedKind === 'region') {
            f.start.places['loc.lowlands'] = {id:'loc.lowlands', kind:'region', name:'Lowlands', parent:'realm.duskreach'};
            f.start.places[cot].parent = f.start.places[town].parent = 'loc.lowlands';
        }
        const r = play(f);
        assert.equal(r.state.scene.at, town);
        assert.deepEqual(r.events.filter(e => e.t === 'scene.entered' && dogs.includes(e.d.id)), []);
        assert.deepEqual(dogs.filter(id => r.state.scene.present.includes(id)), []);
        assert.ok(dogs.every(id => r.state.entities[id].left.at === cot));
    }
});

test('B7 a reported companion arrives, the other two creatures stay at the cot', () => {
    const f = structuredClone(source);
    f.prose = 'The brindle trots alongside Alaric into Ashbridge. The other two dogs stay at the cot. The gate opens.';
    f.report.expected[1].with = [dogs[0]];
    f.report.deltas.find(d => d.type === 'arrive').with = [dogs[0]];
    const r = play(f);
    assert.equal(r.state.scene.at, town);
    assert.deepEqual(dogs.filter(id => r.state.scene.present.includes(id)), [dogs[0]]);
});

test('looking for the creatures in a sibling room of the same site retains the local group', () => {
    const f = structuredClone(source);
    const barn = 'loc.farm.barn', pen = 'loc.farm.pen', yard = 'loc.farm';
    f.start.places[yard] = {id:yard, kind:'site', name:'Sheep farm', parent:'realm.duskreach'};
    f.start.places[barn] = {id:barn, kind:'interior', name:'Barn', parent:yard};
    f.start.places[pen] = {id:pen, kind:'interior', name:'Pen', parent:yard};
    f.start.scene.at = barn;
    f.input = 'I look for the dogs in the pen.';
    f.planner.commands = [{seq:1, type:'go', to:pen, quote:f.input}];
    f.prose = 'He finds the dogs in the pen next to the barn.';
    f.report = {scene:pen, expected:{1:{arrived:true, at:pen, with:null, met:null}},
        deltas:[{seq:1, type:'arrive', at:pen, with:null, forced_by:null}]};
    const r = play(f);
    assert.equal(r.state.scene.at, pen);
    assert.deepEqual(dogs.filter(id => r.state.scene.present.includes(id)), dogs);
});
