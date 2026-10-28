import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { parseExtraction,worldVocab } from '../../src/v4/extract.js';
import { extractorCatalog } from '../../src/v4/catalog.js';
import { applyWorld } from '../../src/v4/world.js';
import { buildContext } from '../../src/context.js';
import { setRec,rec } from '../../src/host.js';
import { hash32 } from '../../src/util.js';
import { createWorldJobs } from '../../src/v4/world_jobs.js';
const content=await loadProductContent();
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/batch2_trade_people.json',import.meta.url)));
for(const key of ['004_24','005_26','005_121'])test(`failsoft: local semantics ${key} preserve valid independent events`,()=>{
 const x=structuredClone(fixtures[key]), cat=extractorCatalog(x.state,content,{c:true});
 const p=parseExtraction(JSON.stringify(x.answer),worldVocab(content.deltaVocab,x.state),cat,x.state.last.outcome.expected_keys,{sceneRequired:true,startScene:x.state.scene.at,state:x.state,content});
 assert.equal(p.valid,true);assert.ok(p.issues.length);
 const r=applyWorld(x.state,content,p.value,{prose:x.prose,msg:500});
 assert.ok(r.rejected.some(v=>['npc_continuity','trade_direction'].includes(v.rule)));
 if(key!=='005_121')assert.ok(r.events.some(e=>e.t==='scene.moved'));
 else assert.ok(!r.events.some(e=>e.t==='offer.created'));
});
test('failsoft: corrections survive exhausted context budget',()=>{
 const state=structuredClone(fixtures['004_24'].state);
 const c=buildContext(state,content,{budget:1,corrections:['PREVIOUS REPLY: no lodging was bought; no sleep occurred.']});
 assert.match(c.text,/no lodging was bought/);assert.ok(!c.dropped.includes('corrections'));
});
function rig(after=false){const message={mes:'A nod.',extra:{}};setRec(message,{events:[],text_hash:hash32(message.mes),extraction:{status:'pending'}});const chat=[message];let failed=0;
 const jobs=createWorldJobs({active:()=>({chat,chatId:'a'}),run:async()=>{if(!after)throw Error('engine');setRec(message,{...rec(message),extraction:{status:'applied'}});return {changed:true,applied:true};},failed:async()=>{failed++;setRec(message,{...rec(message),extraction:{status:'failed',error_kind:'engine'}});return {changed:true,failed:'engine'};},applied:async()=>{if(after)throw Error('save');}});return {jobs,message,failed:()=>failed};}
test('failsoft: unexpected precommit exception closes pending, is not soft',async()=>{const x=rig();await x.jobs.start(0);assert.equal(rec(x.message).extraction.status,'failed');assert.equal(rec(x.message).continuation,undefined);assert.equal(x.failed(),1);});
test('failsoft: postcommit save exception preserves applied result',async()=>{const x=rig(true);const r=await x.jobs.start(0);assert.equal(r.changed,true);assert.equal(r.persistenceFailed,true);assert.equal(rec(x.message).extraction.status,'applied');assert.equal(x.failed(),0);assert.equal(x.jobs.start(0),null);});

import { campaign,say } from './patch8_lib.js';
import { prepareGenerationAsync,processReplyAny,runExtraction } from '../../src/v4/runtime.js';
import { foldChat } from '../../src/host.js';
import { savedPrefixMatches,verifySavedChat } from '../../src/v4/continuation.js';
import { softExtractionFailure,turnFailure } from '../../tools/st_live/live/evaluator.mjs';
test('failsoft: failed Planner is visible nonexecution, original input and RNG retained; retry works',async()=>{
 const g=await campaign(content),before=g.state();g.chat.push({mes:'I sell the pelts.',is_user:true,extra:{}});
 const r=await prepareGenerationAsync(g.chat,content,{llm:async()=>'{bad',settings:{planner:true}});
 assert.equal(r.action,'not_executed');assert.equal(g.chat.at(-1).is_user,true);assert.deepEqual(rec(g.chat.at(-1)).events,[]);
 assert.deepEqual(g.state().rng,before.rng);assert.equal(g.state().clock.minute,before.clock.minute);
 assert.equal(softExtractionFailure(g.chat,g.chat.length-1,turnFailure(g.chat,g.chat.length-1)),true);
 const valid=await prepareGenerationAsync(g.chat,content,{llm:async()=>'{"commands":[]}',settings:{planner:true}});
 assert.equal(valid.action,'context');assert.equal(rec(g.chat.at(-1)).continuation,undefined);
});
test('failsoft: rejected Extractor preserves player booking; failed record replays and never re-extracts',async()=>{
 const g=await campaign(content);await say(g,'I rest for one minute.',{type:'activity',kind:'rest',minutes:1});
 const before=g.state();g.chat.push({mes:'A passerby waves.',is_user:false,extra:{}});const id=g.chat.length-1;
 processReplyAny(g.chat,id,content);await runExtraction(g.chat,id,content,async()=>'{bad');
 const r=rec(g.chat[id]);assert.equal(r.extraction.status,'failed');assert.equal(r.continuation.kind,'world_not_applied');
 assert.equal(g.state().clock.minute,before.clock.minute);assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state,g.state());
 let calls=0;await runExtraction(g.chat,id,content,async()=>{calls++;return '{}';});assert.equal(calls,0);
});
test('failsoft: authentication and unknown provider exception do not authorise continuation',async()=>{
 for(const error of [Object.assign(Error('unauthorised'),{code:'LLM_PROVIDER',status:401}),Error('program error')]){
  const g=await campaign(content);g.chat.push({mes:'I wait.',is_user:true,extra:{}});
  const r=await prepareGenerationAsync(g.chat,content,{llm:async()=>{throw error;},settings:{planner:true}});
  assert.equal(r.action,'abort');assert.equal(rec(g.chat.at(-1)).continuation,undefined);
 }
});
test('failsoft: readback checks actual saved records, not a fulfilled save promise',async()=>{
 const chat=[{mes:'I sell.',is_user:true,extra:{avereth:{events:[],continuation:{kind:'planner_not_executed'}}}}];
 const c={chat,characterId:0,characters:[{name:'test',avatar:'test.png'}],getCurrentChatId:()=> 'test',getRequestHeaders:()=>({})};
 const response=data=>async()=>({ok:true,json:async()=>data});
 assert.equal(await verifySavedChat(c,0,()=>true,response([{},...chat])),true);
 await assert.rejects(verifySavedChat(c,0,()=>true,response([{}, {...chat[0],mes:'other'}])),/does not match/);
 await assert.rejects(verifySavedChat(c,0,()=>true,async()=>({ok:false})),/readback failed/);
 assert.equal(savedPrefixMatches(chat,[],0),false);
 await assert.rejects(verifySavedChat(c,0,()=>false,response([{},...chat])),/Stale/);
});
test('failsoft: engine exception never uses conversational legacy continuation',async()=>{
 const g=await campaign(content);await say(g,'I listen.');g.chat.push({mes:'A nod.',is_user:false,extra:{}});const i=g.chat.length-1;
 processReplyAny(g.chat,i,content);const {applyExtraction}=await import('../../src/v4/runtime.js');
 applyExtraction(g.chat,i,content,null,{hash:hash32('A nod.'),errorKind:'engine',error:'engine error'});
 assert.equal(softExtractionFailure(g.chat,i-1,{kind:'extractor_failed',at:i}),false);
});
test('failsoft: next narrator receives previous input nonexecution, while a new action remains valid',async()=>{
 const g=await campaign(content);g.chat.push({mes:'I buy an invented sword.',is_user:true,extra:{}});
 await prepareGenerationAsync(g.chat,content,{llm:async()=>'{bad',settings:{planner:true}});
 const r=await say(g,'I rest for one minute.',{type:'activity',kind:'rest',minutes:1});
 assert.equal(r.action,'context');assert.match(r.context.text,/PREVIOUS INPUT NOT EXECUTED/);assert.match(r.context.text,/invented sword/);
});
test('failsoft: edit or real swipe during readback cannot confirm the former reply',async()=>{
 for(const change of [m=>{m.mes='edited';},m=>{m.swipe_id=1;}]){
  const chat=[{mes:'same',swipe_id:0,extra:{}}], c={chat,characters:[{name:'t',avatar:'t.png'}],characterId:0,getCurrentChatId:()=> 't',getRequestHeaders:()=>({})};
  const saved=structuredClone(chat);
  await assert.rejects(verifySavedChat(c,0,()=>true,async()=>({ok:true,json:async()=>{change(chat[0]);return [{},...saved];}})),/does not match/);
 }
});
