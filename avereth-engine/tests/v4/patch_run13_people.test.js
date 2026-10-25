import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { buildContext } from '../../src/context.js';
import { extractorCatalog } from '../../src/v4/catalog.js';
import { truth } from '../../src/knowledge.js';
import { parseExtraction, worldVocab } from '../../src/v4/extract.js';
const content=await loadProductContent();
const f=JSON.parse(fs.readFileSync(new URL('./fixtures/run13_people.json',import.meta.url)));
const clone=structuredClone;
function pre(i) {
 const s=clone(f.state);
 for(const r of f.events)if(r.i<i)for(const e of r.events)applyEvent(s,e);
 return s;
}
function call(s,answer,prose='',msg=176){return applyWorld(s,content,clone(answer),{msg,prose});}
const reply=(s,deltas)=>({scene:s.scene.at,expected:{},deltas});
const person=(ref,name,more={})=>({seq:1,type:'person.new',ref,name,role:'traveller',desc:[],present:true,band:'SHORT',...more});

test('Run 13 people: original E140 rescue, accompaniment and departure remain canonical',()=>{
 const s=pre(140),r=call(s,f.replies[140].answer,f.replies[140].prose,140);
 assert.ok(r.state.entities['npc.brast']);assert.ok(r.state.scene.present.includes('npc.brast'));
 const later=pre(175);assert.ok(!later.scene.present.includes('npc.brast'));
 assert.match(truth(later,'npc.brast','bindings')[0].o,/freed/);
 assert.match(truth(later,'npc.brast','plans')[0].o,/heading home/);
});
test('Run 13 people: original E176 cannot recreate the departed rescuer subject or overwrite his established history',()=>{
 const s=pre(176),before=truth(s,'npc.brast','status')[0].o;
 const r=call(s,f.replies[176].answer,f.replies[176].prose);
 assert.ok(!r.state.scene.present.includes('npc.brast'));
 assert.equal(truth(r.state,'npc.brast','status')[0].o,before);
 assert.ok(r.events.some(e=>e.t==='delta.rejected'&&e.d.rule==='npc_continuity'));
 assert.ok(!r.events.some(e=>e.t==='memory.recorded'&&(e.d.memory.who||[]).includes('npc.brast')));
});
test('Run 13 people: original E196 full-name reintroduction does not create a duplicate',()=>{
 const r=call(pre(196),f.replies[196].answer,f.replies[196].prose,196);
 assert.ok(!r.state.entities['npc.brast_wenlock']);
 assert.ok(!r.events.some(e=>e.t==='fact.asserted'&&e.d.fact.s==='npc.brast_wenlock'));
 assert.ok(r.events.some(e=>e.t==='delta.rejected'&&e.d.rule==='npc_identity'));
});
test('Run 13 people: returning to the quarry recalls rescue history even without naming Brast',()=>{
 const s=pre(176),query='I examine the pale shape beyond the dead beast.';
 const c=buildContext(s,content,{input:query,lastReply:'',budget:1600,lore:false});
 assert.match(c.text,/npc\.brast/);assert.match(c.text,/freed/);assert.match(c.text,/heading home/);
 assert.match(c.text,/NOT PRESENT/);assert.match(c.text,/mill yard/);
 const cat=extractorCatalog(s,content,{c:true}).text;
 assert.match(cat,/npc\.brast/);assert.match(cat,/heading home/);
});
test('Run 13 people: a current independent return and new trouble use enter, without any player GO',()=>{
 const s=pre(176);s.last.outcome={c:true,auth:{c:true,gos:[]},expected_keys:{}};
 const r=call(s,reply(s,[{seq:1,type:'enter',who:'npc.brast'},
  {seq:2,type:'fact',s:'npc.brast',p:'status',o:'returned from Glassmere to fetch his wagon and freshly hurt his ankle'}]),
  'Brast returns from Glassmere for his wagon. He slipped just now and hurt his ankle.');
 assert.ok(r.state.scene.present.includes('npc.brast'));
 assert.match(truth(r.state,'npc.brast','status')[0].o,/freshly/);
 assert.equal(Object.values(r.state.entities).filter(e=>e.name==='Brast').length,1);
});
test('Run 13 people: an explicit full-name expansion retains identity, then ordinary enter brings him back',()=>{
 const s=pre(176),r=call(s,reply(s,[{seq:1,type:'person.named',who:'npc.brast',name:'Brast Wenlock'},
  {seq:2,type:'enter',who:'npc.brast'}]),'Brast arrives and introduces himself fully as Brast Wenlock.');
 assert.equal(r.state.entities['npc.brast'].name,'Brast Wenlock');
 assert.ok(r.state.scene.present.includes('npc.brast'));assert.ok(!r.state.entities['npc.brast_wenlock']);
});
test('Run 13 people: explicitly different person with the shared first name is not merged',()=>{
 const s=pre(176),a=reply(s,[person('npc.brast_wenlock','Brast Wenlock',{distinct_from:'npc.brast'})]);
 const p=parseExtraction(JSON.stringify(a),worldVocab(content.deltaVocab,s),{places:Object.keys(s.places)});
 assert.ok(p.value,JSON.stringify(p.errors));assert.deepEqual(p.errors,[]);
 const r=call(s,p.value,'Another man, Brast Wenlock, introduces himself; he is not the carter Brast.');
 assert.ok(r.state.entities['npc.brast_wenlock']);assert.equal(r.state.entities['npc.brast'].name,'Brast');
 assert.ok(!r.state.scene.present.includes('npc.brast'));
});
test('Run 13 people: current co-presence and an ordinary spontaneous stranger are unaffected',()=>{
 const s=pre(152),r=call(s,reply(s,[person('npc.brast','Brast'),person('npc.bran_wenlock','Bran Wenlock',{seq:2})]));
 assert.ok(r.state.scene.present.includes('npc.brast'));assert.ok(r.state.entities['npc.bran_wenlock']);
 assert.equal(Object.values(r.state.entities).filter(e=>e.name==='Brast').length,1);
});
test('Run 13 people: remote mention is existence only and identity ambiguity cannot be bypassed offscreen',()=>{
 const s=pre(176),r=call(s,reply(s,[person('npc.brast','Brast',{present:false}),
 person('npc.brast_wenlock','Brast Wenlock',{seq:2,present:false})]));
 assert.ok(!r.state.scene.present.includes('npc.brast'));assert.ok(!r.state.entities['npc.brast_wenlock']);
});
test('Run 13 people: replay, JSON reload and an alternative reply retain one stable identity',()=>{
 const s=pre(176),a=reply(s,[{seq:1,type:'person.named',who:'npc.brast',name:'Brast Wenlock'},{seq:2,type:'enter',who:'npc.brast'}]);
 const r=call(s,a,'Brast comes back for his wagon.'),replay=JSON.parse(JSON.stringify(s));
 for(const e of JSON.parse(JSON.stringify(r.events)))applyEvent(replay,e);
 assert.deepEqual(JSON.parse(JSON.stringify(replay)),JSON.parse(JSON.stringify(r.state)));
 const alternative=call(clone(s),a,'Brast Wenlock returns on foot.');
 assert.deepEqual(Object.keys(alternative.state.entities),Object.keys(r.state.entities));
});
test('Run 13 people: a rejected reset cannot survive as a PC-only memory or open thread',()=>{
 const s=pre(176),a=reply(s,[person('npc.brast','Brast'),
 {seq:2,type:'memory',who:['pc'],text:'Brast has been trapped here for three days and still needs the old rescue.',imp:8},
 {seq:3,type:'thread',id:null,kind:'problem',status:'open',text:'Brast remains trapped in the quarry.',resolution:null}]);
 const r=call(s,a,'Brast is still trapped.');
 assert.ok(!r.events.some(e=>e.t==='memory.recorded'&&e.d.memory.kind==='narrated'));
 assert.ok(!r.events.some(e=>e.t==='thread.set'));
});
test('Run 13 people: ordinary leave and autonomous re-entry at another canonical location keep the same identity',()=>{
 let s=pre(152);s.last.outcome={c:true,auth:{c:true,gos:[]},expected_keys:{}};
 const gone=call(s,reply(s,[{seq:1,type:'leave',who:'npc.brast'}]),'Brast leaves for home.');
 assert.ok(!gone.state.scene.present.includes('npc.brast'));
 s=gone.state;s.scene.at='loc.the_old_quarry';
 const r=call(s,reply(s,[{seq:1,type:'enter',who:'npc.brast'}]),'Brast arrives from town to retrieve his wagon.');
 assert.ok(r.state.scene.present.includes('npc.brast'));assert.equal(r.state.entities['npc.brast'].name,'Brast');
});
test('Run 13 people: an explicit actual enter after a redundant introduction also releases its name aliases',()=>{
 const s=pre(176),r=call(s,reply(s,[person('npc.brast','Brast'),{seq:2,type:'enter',who:'npc.brast'},
 {seq:3,type:'fact',s:'Brast',p:'plans',o:'retrieve his wagon'},
 {seq:4,type:'memory',who:['npc.brast'],text:'Brast returned from home for his wagon.',imp:7}]),
 'Brast arrives from home to retrieve his wagon.');
 assert.ok(r.state.scene.present.includes('npc.brast'));
 assert.ok(truth(r.state,'npc.brast','plans').some(f=>f.o==='retrieve his wagon'));
 assert.ok(r.events.some(e=>e.t==='memory.recorded'&&e.d.memory.kind==='narrated'));
});
