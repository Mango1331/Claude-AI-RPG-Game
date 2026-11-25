import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { applyWorld } from '../../src/v4/world.js';
import { loadProductContent } from '../helpers.js';

const cases = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/user12_travel.json.gz',import.meta.url))));
const content = await loadProductContent();
const play = ({state,raw,prose,index}) => applyWorld(state,content,raw,{prose,msg:index});

test('User12 takes the established route to the Dungeon entrance with no duplicate section', () => {
    const {state,events} = play(cases.exit);
    assert.equal(state.scene.at,'loc.mossback_warrens');
    assert.ok(!events.some(e=>e.t==='place.created' && /entry tunnel/i.test(e.d.place.name)));
});

test('User12 reaches the explicitly selected, paid loft without buying it again', () => {
    const {state,events} = play(cases.loft);
    assert.match(state.places[state.scene.at].name,/loft/i);
    assert.ok(!events.some(e=>e.t==='coin.changed'||e.t==='resource.changed'));
    for (const input of ['I only want to pay. I stay here.','I equip my robe.','Where is the loft?']) {
        const copy = structuredClone(cases.loft);
        copy.state.last.input = input;
        assert.equal(play(copy).state.scene.at,copy.state.scene.at,input);
    }
});
