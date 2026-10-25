import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec, setRec } from '../../src/host.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { extractionRequest, runExtraction } from '../../src/v4/runtime.js';
import { parseExtraction } from '../../src/v4/extract.js';
const content = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run14_world.json', import.meta.url)));
const clone = structuredClone, npc = 'npc.marda', hall = 'loc.ashbridge.guild_hall';
const before = () => foldChat(clone(f.messages), 44).state;
function pending() {
 const chat=clone(f.messages);setRec(chat[44],{...rec(chat[44]),events:[],extraction:{status:'pending'}});return chat;
}
const request = () => extractionRequest(pending(),44,content);
const parse = (answer, req=request()) => parseExtraction(typeof answer==='string'?answer:JSON.stringify(answer),req.vocab,req.ids,req.expectedKeys,{sceneRequired:true,startScene:before().scene.at});
function corrected() {
 const a=JSON.parse(f.answers['58']);a.deltas[3].object={new:a.deltas[2].name};
 for(const d of a.deltas)if(d.seq<7)d.scene=before().scene.at;
 a.deltas[1]={seq:2,type:'enter',who:npc,scene:before().scene.at};
 return a;
}
function scene(present=true) {
 const s=before();s.last.outcome={c:true,auth:{c:true,gos:[]},expected_keys:{}};
 s.scene.present=s.scene.present.filter(id=>id!==npc);if(present)s.scene.present.push(npc);
 return s;
}
const item=(seq,name='gift bread')=>({seq,type:'object.new',name,kind:'item',qty:1,holder:npc});
const move=(seq,name='gift bread')=>({seq,type:'object.move',object:{new:name},to:'pc'});
const call=(s,deltas)=>applyWorld(s,content,{scene:s.scene.at,expected:{},deltas},{msg:44,prose:'Marda hands him the bread.'});
const gifts=r=>Object.values(r.state.objects).filter(o=>o.name==='gift bread'&&o.holder?.entity==='pc');
for(const n of ['58','59'])test(`Run14 original ${n}: strict rejection explains the actual new-object link`,()=>{
 const p=parse(f.answers[n]);assert.equal(p.valid,false);
 assert.match(p.errors.join(' '),/object\.new has no ref/);
 assert.match(p.errors.join(' '),/heel of bread and hard cheese/);
});
test('Run14: unchanged new-name reference is sufficient for the complete original sequence',()=>{
 const a=corrected(),p=parse(a);assert.equal(p.valid,true,JSON.stringify(p.errors));
 const s=before(),r=applyWorld(s,content,p.value,{msg:44,prose:f.messages[44].mes});
 assert.equal(r.state.scene.at,hall);assert.equal(r.state.entities.pc.sheet.coin_cp,70);
 assert.ok(Object.values(r.state.quests).some(q=>q.status==='completed'));
 assert.equal(Object.values(r.state.objects).filter(o=>o.name==='heel of bread and hard cheese'&&o.holder?.entity==='pc').length,1);
 assert.equal(r.events.filter(e=>e.t==='coin.changed'&&e.d.delta===40).length,1);
});
test('Run14: prefix events cannot silently inherit the final scene in a multi-place reply',()=>{
 const a=corrected();for(const d of a.deltas)delete d.scene;
 const p=parse(a);assert.equal(p.valid,false);assert.match(p.errors.join(' '),/earlier scene/);
});
test('Run14: actual repair request provides precise linking and chronological-scene guidance',async()=>{
 const chat=pending(),calls=[];await runExtraction(chat,44,content,async req=>{
  calls.push(req);return calls.length===1?f.answers['58']:JSON.stringify(corrected());
 });
 assert.equal(calls.length,2);const repair=calls[1].messages.at(-1).content;
 assert.match(repair,/object\.new has no ref/);assert.match(repair,/earlier scene/);
 assert.equal(rec(chat[44]).extraction.status,'applied');
 const events=rec(chat[44]).events;assert.equal(events.filter(e=>e.t==='coin.changed'&&e.d.delta===40).length,1);
 const again=await runExtraction(chat,44,content,async()=>{throw Error('must not retry an applied reply');});assert.equal(again.changed,false);
});
test('Run14: invented IDs and unsupported local ref declarations remain invalid',()=>{
 for(const a of [JSON.parse(f.answers['58']),JSON.parse(f.answers['59'])])assert.equal(parse(a).valid,false);
 const a=corrected();a.deltas[3].object='obj.unknown';assert.equal(parse(a).valid,false);
 assert.equal(parseExtraction(JSON.stringify(a),request().vocab).valid,false, 'unknown IDs are rejected even without a supplied catalog');
});
test('Run14: an unknown or forward new-name reference transfers nothing',()=>{
 for(const ds of [[move(1)],[move(1),item(2)]])assert.equal(gifts(call(scene(),ds)).length,0);
});
test('Run14: two same-name declarations cannot select the last object by accident',()=>{
 const r=call(scene(),[item(1),item(2),move(3)]);assert.equal(gifts(r).length,0);
 assert.ok(r.rejected.some(x=>x.rule==='object'&&/ambiguous/i.test(x.why)));
});
test('Run14: an ordinary present giver can hand over a new or already known item',()=>{
 let r=call(scene(),[item(1),move(2)]);assert.equal(gifts(r).length,1);
 const s=scene();s.objects.known={id:'known',name:'gift bread',qty:1,holder:{entity:npc},kind:'item'};
 r=call(s,[{seq:1,type:'object.move',object:'known',to:'pc'}]);assert.equal(gifts(r).length,1);
});
test('Run14: an absent giver may hold property but cannot hand it to Alaric',()=>{
 const r=call(scene(false),[item(1),move(2)]);assert.equal(gifts(r).length,0);
 assert.ok(Object.values(r.state.objects).some(o=>o.name==='gift bread'&&o.holder?.entity===npc));
 assert.ok(r.rejected.some(x=>x.rule==='npc_presence'));
});
test('Run14: a refused reintroduction cannot be bypassed through holder or an existing object',()=>{
 const s=scene(false);s.objects.known={id:'known',name:'gift bread',qty:1,holder:{entity:npc},kind:'item'};
 const r=call(s,[{seq:1,type:'person.new',ref:npc,name:'Marda',role:'villager',desc:[],present:true},
 item(2),move(3),{seq:4,type:'object.move',object:'known',to:'pc'}]);
 assert.equal(gifts(r).length,0);assert.ok(!r.events.some(e=>e.t==='object.created'&&e.d.object.name==='gift bread'));
});
test('Run14: autonomous enter releases holder references and permits the actual gift without player GO',()=>{
 const r=call(scene(false),[{seq:1,type:'enter',who:npc},item(2),move(3)]);assert.equal(gifts(r).length,1);
});
test('Run14: repeated object.move cannot book the same gift twice',()=>{
 const r=call(scene(),[item(1),move(2),move(3)]);assert.equal(gifts(r).length,1);
 assert.equal(r.events.filter(e=>e.t==='object.moved'&&e.d.to?.entity==='pc').length,1);
});
test('Run14: false scene cannot authorize a journey or a gift',()=>{
 const s=scene();const a={scene:hall,expected:{},deltas:[{seq:1,type:'arrive',at:hall,with:[]},item(2),move(3)]};
 const r=applyWorld(s,content,a,{msg:44});assert.equal(r.state.scene.at,s.scene.at);assert.equal(gifts(r).length,0);
 assert.equal(r.state.entities.pc.sheet.coin_cp,30);
});
test('Run14: event replay/JSON reload and alternate reply do not duplicate payout, loot or identity',()=>{
 const s=before(),r=applyWorld(s,content,corrected(),{msg:44,prose:f.messages[44].mes}),replay=clone(s);
 for(const e of JSON.parse(JSON.stringify(r.events)))applyEvent(replay,e);
 assert.deepEqual(JSON.parse(JSON.stringify(replay)),JSON.parse(JSON.stringify(r.state)));
 const alternate=applyWorld(clone(s),content,corrected(),{msg:44,prose:f.messages[44].mes});
 assert.deepEqual(alternate.state,r.state);assert.equal(Object.values(r.state.objects).filter(o=>/Scale Plate|Turtle Claw/.test(o.name)&&o.holder?.entity==='pc').reduce((n,o)=>n+o.qty,0),7);
});
test('Run14: legacy extraction still accepts its historical unannotated shape',()=>{
 const a=corrected();for(const d of a.deltas)delete d.scene;
 const req=request(),p=parseExtraction(JSON.stringify(a),req.vocab,req.ids,req.expectedKeys);
 assert.equal(p.valid,true,JSON.stringify(p.errors));
 const s=scene(false);s.meta.ruleset=1;assert.equal(gifts(call(s,[item(1),move(2)])).length,1);
});
