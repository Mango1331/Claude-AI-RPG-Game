import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadProductContent} from '../helpers.js';
import {applyWorld} from '../../src/v4/world.js';
import {applyEvent} from '../../src/state.js';
const content=await loadProductContent(), f=JSON.parse(fs.readFileSync(new URL('./fixtures/batch2_trade_people.json',import.meta.url)));
function run(prose,name='the gap in the rocks') {
 const state=structuredClone(f['005_121'].state),at='loc.test_destination';
 state.places[at]={id:at,name,kind:'site',parent:state.scene.location,realm:state.places[state.scene.at]?.realm};
 const r=applyWorld(state,content,{scene:'here',expected:{},deltas:[{seq:1,type:'arrive',at,with:null,forced_by:prose}]},{prose,msg:500});
 const replay=structuredClone(state);for(const e of JSON.parse(JSON.stringify(r.events)))applyEvent(replay,e);assert.deepEqual(replay,r.state);
 return {state,r,at};
}
for(const [text,name] of [
 ['Alaric watched guards drag the cart to the gap in the rocks.'],
 ['Alaric helped drag the merchant to the gap in the rocks.'],
 ['Alaric dragged the cart to the gap in the rocks.'],
 ['The guards dragged Alaric to the south gate.','North Gate'],
 ['The guards dragged Alaric to the north tower.','North Gate'],
 ['The guards dragged Alaric to the old mill.','Old Mill Gate'],
])test(`protect109 refuses: ${text}`,()=>{const {state,r}=run(text,name);assert.equal(r.state.scene.at,state.scene.at);assert.ok(r.rejected.some(x=>x.rule==='no_go'));});
for(const [text,name] of [
 ['The guards dragged Alaric to the north gate.','North Gate'],
 ['Alaric was dragged to the gap in the rocks.'],
 ['He was forcibly carried to the gap in the rocks.'],
 ['He fell into the gap in the rocks.'],
 ['The flood swept him to the gap in the rocks.'],
 ['The guards pushed him down into the gap in the rocks.'],
])test(`protect109 allows: ${text}`,()=>{const {r,at}=run(text,name);assert.equal(r.state.scene.at,at);});
