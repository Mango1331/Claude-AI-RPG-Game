import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';
import { buildContext } from '../../src/context.js';
import { sealRefusal } from '../../src/v4/living.js';
const content = await loadProductContent();
const chat = zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user02_157.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(JSON.parse).slice(1);
const before = i => foldChat(structuredClone(chat), i).state;
const root = 'loc.glimmerdeep_grotto';
test('158 I28 rejects phantom floor before creating room or link',()=>{
 const s=before(28), raw=structuredClone(rec(chat[28]).extraction.raw);
 const r=replyTurnV4(s,content,raw,{msg:28,prose:chat[28].mes});
 assert.ok(!Object.values(r.state.places).some(p=>p.parent===root&&p.level===2));
 assert.ok(!r.events.some(e=>e.t==='place.created'&&e.d.place.level===2));
});
test('158 preexisting invalid floor cannot be visited; root remains a valid exit',()=>{
 const s=before(49), to='loc.glimmerdeep_grotto.glimmerdeep_grotto_level_1_sloping_left_passage';
 assert.match(sealRefusal(s,to),/exist|canonical|conflict/i);
 const r=playerTurnV4(s,content,'I take the sloping passage',{c:true,commands:[{seq:1,type:'go',to,quote:'I take the sloping passage'}]});
 assert.equal(r.outcome.resolutions[0].status,'refused');
 s.scene.at=to;assert.equal(sealRefusal(s,root),null);
});
test('158 I46 does not save a room explicitly on level 2 as level 1',()=>{
 const r=replyTurnV4(before(46),content,rec(chat[46]).extraction.raw,{msg:46,prose:chat[46].mes});
 assert.ok(!Object.values(r.state.places).some(p=>/level 2/i.test(p.name)&&p.parent===root));
});
test('158 I43 area loot search rolls; real corpse search stays looted already',()=>{
 const s=before(43), c=rec(chat[43]).events.find(e=>e.t==='cmd.interpreted').d.commands[0];
 const r=playerTurnV4(s,content,chat[43].mes,{msg:43,c:true,commands:[c]});
 assert.ok(r.events.some(e=>e.t==='check.recorded'));
 const corpse=playerTurnV4(s,content,'I loot the Queen remains',{c:true,commands:[{...c,what:'the Queen remains',quote:'I loot the Queen remains'}]});
 assert.equal(corpse.outcome.resolutions[0].reason,'looted already');
});
test('158 free fact beginning with Tam is text through both adapters, not a rename',()=>{
 const s=before(56), id=Object.values(s.entities).find(e=>e.name==='Tam Ostler').id;
 s.entities[id].name='Brenna';
 const sentence='Brenna promised useful tips after a drink';
 const r=replyTurnV4(s,content,{scene:'here',expected:{},deltas:[{seq:1,type:'fact',s:id,p:'conversation',o:sentence}]},{msg:56,prose:sentence});
 assert.ok(Object.values(r.state.facts).some(f=>f.o===sentence));
 assert.equal(r.state.entities[id].name,'Brenna');
});
test('158 E0 diagnostics and E1 interlocutor survive severe budget pressure',()=>{
 const s=before(58), id=Object.values(s.entities).find(e=>e.name==='Tam Ostler').id;
 const r=buildContext(s,content,{input:'Tam, tell me about that drink.',budget:500,lastReply:chat[56].mes});
 assert.ok(r.diagnostics);assert.ok(r.diagnostics.delivered.some(x=>x.npcIds.includes(id)));
 assert.match(r.text,/knows him by name|has seen him/);
 assert.ok(r.diagnostics.focusNpcIds.length<=2);
});
test('158 original unaccepted I56/I68 scene switches remain rejected',()=>{
 for(const i of [56,68]){const s=before(i),r=replyTurnV4(s,content,rec(chat[i]).extraction.raw,{msg:i,prose:chat[i].mes});assert.equal(r.state.scene.at,s.scene.at);assert.ok(r.rejected.some(x=>x.rule==='no_go'));}
});

import { runExtraction, processReplyAny } from '../../src/v4/runtime.js';
import { movementEvidence, guildParticipationEvidence } from '../../src/v4/narration_evidence.js';
import { floorRefusal, levelVia } from '../../src/v4/dungeon.js';
import { makeResolver } from '../../src/delta.js';
import { validateState } from '../../src/validate.js';
import { assertOwnership } from '../../src/v4/world.js';
test('158 I50 empty recovery rechecks contradictory scene once and books only confirmed arrival',async()=>{
 const c=structuredClone(chat.slice(0,50));c.push({mes:chat[50].mes,is_user:false,extra:{}});
 processReplyAny(c,50,content);
 const good={scene:root,expected:{1:{arrived:true,at:root,with:null}},deltas:[{seq:1,type:'arrive',at:root,with:null,forced_by:null,scene:root}]};
 const answers=[null,JSON.stringify(rec(chat[50]).extraction.raw),JSON.stringify(good)],calls=[];
 await runExtraction(c,50,content,async req=>{calls.push(req);return answers.shift();});
 assert.equal(calls.length,3);assert.equal(foldChat(c).state.scene.at,root);
 assert.equal(rec(c[50]).events.filter(e=>e.t==='scene.moved'&&e.d.at===root).length,1);
});
test('158 false arrival without narrative/scene contradiction does not spend another recovery call',async()=>{
 const c=structuredClone(chat.slice(0,50));c.push({mes:'He waited by the pool.',is_user:false,extra:{}});processReplyAny(c,50,content);
 const raw=structuredClone(rec(chat[50]).extraction.raw);raw.scene=before(50).scene.at;
 let n=0;await runExtraction(c,50,content,async()=>++n===1?null:JSON.stringify(raw));assert.equal(n,2);assert.equal(foldChat(c).state.scene.at,before(50).scene.at);
});
test('158 E0 belongs to received assistant and survives extraction/save without engine facts',async()=>{
 const c=structuredClone(chat.slice(0,56));c.push({mes:'Tam nodded.',is_user:false,extra:{}});
 const context=buildContext(before(56),content,{input:'Tam?',budget:800}).diagnostics;
 processReplyAny(c,56,content,{narratorContext:context});assert.deepEqual(rec(c[56]).narration.context,context);
 await runExtraction(c,56,content,async()=>JSON.stringify({scene:'here',expected:{},deltas:[]}));
 assert.deepEqual(JSON.parse(JSON.stringify(rec(c[56]))).narration.context,context);
 assert.ok(!rec(c[56]).events.some(e=>e.t==='fact.asserted'));
});
test('158 actual accepted following uses existing arrival+companion path, without buying drink',()=>{
 const s=before(56),text='I follow Tam into the back room';
 const go=playerTurnV4(s,content,text,{c:true,commands:[{seq:1,type:'go',to:{new:'Guild back room'},quote:text}]});
 const r=replyTurnV4(go.state,content,rec(chat[56]).extraction.raw,{msg:56,prose:chat[56].mes});
 assert.match(r.state.scene.at,/guild_back_room$/);assert.ok(r.state.scene.present.some(id=>r.state.entities[id]?.name==='Tam Ostler'));
 assert.equal(r.state.entities.pc.sheet.coin_cp,s.entities.pc.sheet.coin_cp);assert.deepEqual(validateState(r.state,content),[]);
});
test('158 real multifloor, canonical root, seals and ordinary caves retain their separate rules',()=>{
 const s=before(49),room=Object.values(s.places).find(p=>p.parent===root&&p.level===1),id='loc.testfloor2';
 s.dungeons[root].floors[2]=structuredClone(s.dungeons[root].floors[1]);s.dungeons[root].run.floors[2]=structuredClone(s.dungeons[root].run.floors[1]);
 s.places[id]={id,name:'Second landing',kind:'interior',parent:root,level:2};
 assert.equal(floorRefusal(s,root,2),null);s.dungeons[root].floors[1].sealed=true;delete s.dungeons[root].run.floors[1].cleared;
 assert.match(sealRefusal(s,id),/sealed/);s.dungeons[root].run.floors[1].cleared={credit:'pc'};assert.equal(sealRefusal(s,id),null);
 assert.equal(levelVia(s,root,{a:root,dir:'down'}),1);assert.equal(levelVia(s,room.id,{a:room.id,dir:'down'}),2);
 assert.equal(floorRefusal(s,'ordinary.cave',0),null);
});
test('158 exact fact resolver preserves IDs/new refs/full names but never expands prose',()=>{
 const s=before(56),id=Object.values(s.entities).find(e=>e.name==='Tam Ostler').id,resolve=makeResolver(s,new Map([['clerk_ref',id]]),content);
 for(const ref of [id,'clerk_ref','Tam Ostler'])assert.equal(resolve(ref,{exact:true}),id);
 s.entities[id].name='Brenna';assert.equal(resolve('Brenna delayed dinner until tomorrow',{exact:true}),null);assert.equal(resolve.fullNames.size,0);
 assert.equal(resolve('Brenna Corren'),id);assert.equal(resolve.fullNames.get(id),'Brenna Corren');
});
test('158 compact selection is stable under reordered present list and excludes absent/dead NPCs',()=>{
 const s=before(58),id=Object.values(s.entities).find(e=>e.name==='Tam Ostler').id;
 for(let i=0;i<4;i++){const n=`npc.extra${i}`;s.entities[n]={...structuredClone(s.entities[id]),id:n,name:`Visitor ${i}`};s.scene.present.push(n);}
 const a=buildContext(s,content,{input:'Tam Ostler, that drink?',budget:400});s.scene.present.reverse();const b=buildContext(s,content,{input:'Tam Ostler, that drink?',budget:400});
 assert.deepEqual(a.diagnostics.focusNpcIds,b.diagnostics.focusNpcIds);assert.equal(a.diagnostics.focusNpcIds[0],id);assert.ok(a.diagnostics.focusNpcIds.length<=2);
 s.scene.present=s.scene.present.filter(x=>x!==id);assert.ok(!buildContext(s,content,{input:'Tam Ostler?',budget:400}).diagnostics.focusNpcIds.includes(id));
});
test('158 evidence rejects remembered/hypothetical/dialogue actions and mere clerk presence',()=>{
 assert.equal(movementEvidence('"I will walk out," he said.'),false);assert.equal(movementEvidence('He remembered how he walked outside.'),false);
 assert.equal(guildParticipationEvidence('Tam was behind the counter.',['Tam']),false);
 assert.equal(guildParticipationEvidence('Tam counted ninety copper onto the counter.',['Tam']),true);
 assert.equal(guildParticipationEvidence('"Tam paid me yesterday," he said.',['Tam']),false);
});
test('158 new arrival clerk learns own booked turn-in, bystander/next visit does not',()=>{
 const s=before(51),hall='loc.glassmere.guild_hall',qid='quest.clear_glimmerdeep_grotto_level_1',id=Object.values(s.entities).find(e=>e.name==='Tam Ostler').id;
 const text='I go to the Guild and turn in the quest';
 const go=playerTurnV4(s,content,text,{c:true,commands:[{seq:1,type:'go',to:hall,quote:text},{seq:2,type:'quest.turn_in',quest:qid,quote:text}]});
 const raw={scene:hall,expected:{1:{arrived:true,at:hall,with:null}},deltas:[{seq:1,type:'arrive',at:hall,with:null,forced_by:null,scene:hall},{seq:2,type:'enter',who:id,evidence:'Tam counted ninety copper onto the counter.',scene:hall}]};
 for(const participates of [true,false]){
  const prose=participates?'He entered the Guild hall. Tam counted ninety copper onto the counter.':'He entered the Guild hall. Tam stood behind the counter.';
  const r=replyTurnV4(go.state,content,raw,{prose});assert.equal(r.state.quests[qid].status,'completed');
  assert.equal(r.events.some(e=>e.t==='knowledge.gained'&&e.d.who===id&&e.d.about===`f.pc.completed.${qid}`),participates);
 }
});

test('158 later clerk arrival is not personal participation; no knowledge leak from another actor',()=>{
 assert.equal(guildParticipationEvidence('Before Brenna arrived, the clerk counted sixty copper.',['Brenna']),false);
 assert.equal(guildParticipationEvidence('Brenna remembered how she paid sixty copper.',['Brenna']),false);
});
test('158 unlabeled downward arrival cannot leave a phantom room before passage rejection',()=>{
 const s=before(49),name='Uncharted lower landing',at={new:{name,kind:'interior',parent:root}};
 const text='I go down';const go=playerTurnV4(s,content,text,{c:true,commands:[{seq:1,type:'go',to:{new:name},quote:text}]});
 const raw={scene:at,expected:{1:{arrived:true,at,with:null}},deltas:[{seq:1,type:'arrive',at,with:null,forced_by:null,scene:at},{seq:2,type:'passage',from:null,to:at,dir:'down',name:'Stair',hidden:false,one_way:false,feature:null,scene:s.scene.at}]};
 const r=replyTurnV4(go.state,content,raw,{prose:'He walked down the stair to the lower landing.'});
 assert.equal(r.state.scene.at,s.scene.at);assert.ok(!Object.values(r.state.places).some(p=>p.name===name));
});
test('158 compact NPC and critical Dungeon information both survive a constrained budget',()=>{
 const s=before(43);s.scene.present.push('npc.test');s.entities['npc.test']={id:'npc.test',kind:'npc',name:'Brenna',status:'alive',descriptors:['clerk'],at:s.scene.at};
 const r=buildContext(s,content,{input:'Brenna, what is this place?',budget:300});
 assert.ok(r.diagnostics.delivered.some(x=>x.name==='dungeon'));assert.ok(r.diagnostics.delivered.some(x=>x.name==='npc_compact'));assert.ok(r.diagnostics.overflow>0);
});

test('158 a rechecked negative arrival stays put and records the limit',async()=>{
 const c=structuredClone(chat.slice(0,50));c.push({mes:chat[50].mes,is_user:false,extra:{}});processReplyAny(c,50,content);
 const raw=JSON.stringify(rec(chat[50]).extraction.raw);let n=0;
 await runExtraction(c,50,content,async()=>++n===1?null:raw);
 assert.equal(n,3);assert.equal(foldChat(c).state.scene.at,before(50).scene.at);
 assert.equal(rec(c[50]).extraction.movement_reviewed,true);assert.ok(rec(c[50]).corrections.some(x=>x.includes('no arrival was confirmed')));
});
test('158 I48 retains canonical population and rejects the invented lower passage before mutation',()=>{
 const s=before(48),r=replyTurnV4(s,content,rec(chat[48]).extraction.raw,{msg:48,prose:chat[48].mes});
 assert.ok(!r.events.some(e=>e.t==='place.created'&&e.d.place.level===2));assert.deepEqual(Object.keys(r.state.dungeons[root].floors),['1']);
 assert.ok(r.rejected.some(x=>x.rule==='dungeon_foe'));
});

test('158 unrelated coin handling is not evidence of the booked payout',()=>{
 assert.equal(guildParticipationEvidence('Tam counted four copper onto the counter.',['Tam'],{payoutCp:90,content}),false);
 assert.equal(guildParticipationEvidence('Tam counted ninety copper onto the counter.',['Tam'],{payoutCp:90,content}),true);
});

test('158 identical regenerated prose refreshes actual context without repeating committed events',async()=>{
 const c=structuredClone(chat.slice(0,56));c.push({mes:'Tam nodded.',is_user:false,extra:{}});
 processReplyAny(c,56,content,{narratorContext:{budget:400}});await runExtraction(c,56,content,async()=>JSON.stringify({scene:'here',expected:{},deltas:[]}));
 const events=structuredClone(rec(c[56]).events);const next={budget:900};
 assert.equal(processReplyAny(c,56,content,{narratorContext:next}).changed,true);
 assert.deepEqual(rec(c[56]).narration.context,next);assert.deepEqual(rec(c[56]).events,events);assert.equal(rec(c[56]).extraction.status,'applied');
});
