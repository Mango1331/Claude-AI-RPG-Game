import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {loadProductContent} from '../helpers.js';
import {buildCatalog} from '../../src/v4/catalog.js';
import {planContext,withContentSkills,parsePlan,plannerRequest} from '../../src/v4/planner.js';
import {availableActions,reconcileHudPlan} from '../../src/action_input.js';
const content=await loadProductContent();
const fixture=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user05_202.json.gz',import.meta.url))));
function ctxFor(input,state=fixture.states[42]) {const ctx=withContentSkills(planContext(state,content,buildCatalog(state,content,{known:true,c:true})),content,state);return {...ctx,actionInput:input};}
for(const original of fixture.bindings)test(`User05 I${original.i}: original HUD binding reaches the existing validator`,()=>{
 const parsed=parsePlan(original.answer,content.commandVocab,ctxFor(original.input),original.input.text);
 assert.deepEqual(parsed.errors,[]);assert.equal(parsed.hud_conflict,undefined);
 assert.equal(reconcileHudPlan(original.input,parsed.commands,parsed.hud_binding).ok,true);
});
test('User05 precombat labels and inventory aliases use existing canonical identities',()=>{
 const a=availableActions(fixture.states[42],content);assert.ok(a.targets.length);
 const b=availableActions(fixture.states[14],content),items=b.actions.filter(a=>a.kind==='use');
 assert.equal(new Set(items.map(a=>a.object)).size,items.length);
 assert.equal(items.some(a=>/Guild plate|Small Pouch|contract slip/.test(a.label)),false);
});

import {validateActionSelection,actionBands,actionPrefix,normalizeHudBinding} from '../../src/action_input.js';
import {parseExtraction,resolveRepeatedScene} from '../../src/v4/extract.js';
import {actionStatusView} from '../../src/action_status.js';
import {createWorldJobs} from '../../src/v4/world_jobs.js';
import {hash32} from '../../src/util.js';
import {prepareGenerationAsync} from '../../src/v4/runtime.js';
import {foldChat,rec} from '../../src/host.js';
import {buildContext} from '../../src/context.js';

test('HUD normalization never resolves competing authority, duplicates, conditions or wrong targets',()=>{
 const original=fixture.bindings[0],valid=JSON.parse(original.answer),input=original.input;
 const check=v=>{const p=parsePlan(JSON.stringify(v),content.commandVocab,ctxFor(input),input.text);return !p.hud_conflict && !p.errors.length;};
 assert.equal(check(valid),true);
 for(const mutate of [
  v=>v.hud_binding={...v.commands[0].hud_binding,id:'different'},
  v=>v.commands[0].hud_binding.decision='conflict',
  v=>v.commands[0].hud_binding.id='different',
  v=>v.commands[0].target='another-foe',
  v=>v.commands.push({...structuredClone(v.commands[0]),seq:2}),
  v=>v.commands[0].needs=2,
  v=>v.commands[0].hud_binding.seqs=[1,1],
 ]){const v=structuredClone(valid);mutate(v);assert.equal(check(v),false,JSON.stringify(v));}
 assert.deepEqual(JSON.parse(original.answer),valid,'source response untouched');
 for(const fight of [true,false]){
  const req=plannerRequest(content.commandVocab,{...ctxFor(input),fight},input.text);
  assert.match(req.messages.at(-1).content,/sibling of commands at the ROOT/);
 }
});

test('User05 precombat handles and band AoE preserve existing target sets and state',()=>{
 const state=structuredClone(fixture.states[23]),before=structuredClone(state);
 const a=availableActions(state,content);assert.deepEqual(a.targets.map(t=>t.label),['Crystal Beetle A','Crystal Beetle B','Crystal Beetle C','Crystal Beetle D']);
 const selection={id:'band',kind:'attack',skill:'mage.arcane_wave',approach:false};
 const bands=actionBands(selection,state,content);assert.ok(bands.length);
 for(const b of bands){const check=validateActionSelection({...selection,target:b.target,band:b.band},state,content);assert.equal(check.ok,true);assert.deepEqual(check.preview.targets,b.targets);}
 assert.equal(validateActionSelection({...selection,target:a.targets[0].id,band:'LONG'},state,content).ok,false);
 assert.deepEqual(state,before);
 assert.equal(availableActions(fixture.states[13],content).tactical,false,'clerk is not a tactical foe');
});

test('User05 typed quest acceptance uses original handler, no planner, one booking across regenerate',async()=>{
 const chat=structuredClone(fixture.prefix),state=foldChat(chat).state,q=Object.values(state.quests).find(q=>q.title.includes('Outer Grottos'));
 const selection={id:'quest-choice',kind:'quest.accept',quest:q.id},before=structuredClone(state);
 assert.equal(validateActionSelection(selection,state,content).ok,true);assert.deepEqual(state,before);
 const input={v:1,id:'quest-input',revision:1,selection,text:`Annehmen: ${q.title}`,mode:'hud_roleplay',base_revision:actionPrefix(chat)};
 chat.push({is_user:true,mes:input.text,extra:{avereth_action_input:input}});let calls=0;
 const options={settings:{planner:true},llm:async()=>{calls++;throw Error('unexpected model call');}};
 const result=await prepareGenerationAsync(chat,content,options);assert.equal(result.action,'context');assert.equal(calls,0);
 assert.equal(foldChat(chat).state.quests[q.id].status,'active');
 const events=structuredClone(rec(chat.at(-1)).events);await prepareGenerationAsync(chat,content,{...options,type:'regenerate'});
 assert.deepEqual(rec(chat.at(-1)).events,events);assert.equal(calls,0);
 assert.equal(validateActionSelection(selection,foldChat(chat).state,content).ok,false);
 const away=structuredClone(before);away.scene.at='loc.glassmere';assert.equal(validateActionSelection(selection,away,content).ok,false);
 const expired=structuredClone(before);expired.clock.minute+=1440;assert.equal(validateActionSelection(selection,expired,content).ok,false);
 const ctx=buildContext(foldChat(chat).state,content,{outcome:foldChat(chat).state.last.outcome});
 assert.match(ctx.text,/morning's walk north of Glassmere/);
});

test('User05 I34 only reuses an identical fully supplied scene reference',()=>{
 const value=JSON.parse(fixture.extraction.answer),ids={places:Object.keys(fixture.states[33].places)},expected=fixture.extraction.expected;
 const fixed=resolveRepeatedScene(value,ids,expected);assert.deepEqual(fixed.scene,value.expected['1'].at);
 const parsed=parseExtraction(fixture.extraction.answer,content.deltaVocab,ids,expected,{sceneRequired:true,startScene:fixture.states[33].scene.at,state:fixture.states[33],content,reply:fixture.extraction.reply});
 assert.equal(parsed.valid,true,parsed.errors.join('; '));
 for(const mutate of [v=>v.expected['1'].arrived=false,v=>v.expected['1'].at.new.parent='elsewhere',v=>v.deltas.push({seq:4,type:'arrive',at:'loc.glassmere'}),v=>delete v.deltas[0].at.new.parent,v=>v.scene.new='some other room']){
  const v=structuredClone(value);mutate(v);assert.equal(resolveRepeatedScene(v,ids,expected),v);
 }
 assert.equal(resolveRepeatedScene(value,ids,{'1':'go','2':'go'}),value);
 for(const deltas of [null,{},'bad',[null]]){const v={...value,deltas};assert.equal(resolveRepeatedScene(v,ids,expected),v);}
 const negative={...value,expected:{'1':{...value.expected['1'],arrived:false}},deltas:[]};
 assert.equal(resolveRepeatedScene(negative,ids,expected),negative,'denied arrival never becomes a positive world change');
});

test('status always prefers active world/readback over saved, and exposes only actionable recovery',()=>{
 for(const v of [{worldRunning:true},{saving:true},{worldPending:true},{worldFailed:true},{saveFailed:true},{unknown:true}]){
  const s=actionStatusView({...v,phase:'Gespeichert'});assert.notEqual(s.text,'Gespeichert');assert.equal(s.blocked,true);
 }
 assert.equal(actionStatusView({worldRunning:true}).retry,false);
 assert.equal(actionStatusView({worldFailed:true}).retry,true);
 assert.equal(actionStatusView({phase:'Gespeichert'}).text,'Gespeichert');
});

test('world job notifies UI after asynchronous readback and after clearing current job',async()=>{
 const m={mes:'Wat nods.',is_user:false,extra:{avereth:{text_hash:hash32('Wat nods.'),events:[],extraction:{status:'pending'}}}},chat=[m];
 const seen=[];let release,entered;const saved=new Promise(r=>release=r),applying=new Promise(r=>entered=r);
 const jobs=createWorldJobs({active:()=>({chat,chatId:'A'}),run:async()=>{m.extra.avereth.extraction.status='applied';return {changed:true};},applied:async()=>{entered();await saved;},changed:()=>seen.push(!!jobs.currentJob())});
 const work=jobs.start(0);await applying;assert.equal(!!jobs.currentJob(),true);release();await work;
 assert.equal(jobs.currentJob(),null);assert.equal(seen.at(-1),false);
});

test('User05 I34 original first extraction closes the real world job without a form repair',async()=>{
 const {processReplyAny,runExtraction}=await import('../../src/v4/runtime.js');
 const chat=structuredClone([...fixture.prefixes[33],...fixture.extraction.frame]);
 chat[34].extra={};processReplyAny(chat,34,content);let calls=0;
 const result=await runExtraction(chat,34,content,async()=>{calls++;return fixture.extraction.answer;});
 assert.equal(calls,1);assert.equal(result.changed,true);assert.equal(rec(chat[34]).extraction.status,'applied');
 assert.equal(foldChat(chat).state.places[foldChat(chat).state.scene.at].name,'the low hollow');
});

test('world completion waits for native save/readback and rechecks Stop before mutation',async()=>{
 const {processReplyAny,runExtraction}=await import('../../src/v4/runtime.js');
 const {createChatPersistence}=await import('../../src/v4/action_persistence.js');
 for(const stop of [false,true]){
  const chat=structuredClone([...fixture.prefixes[33],...fixture.extraction.frame]);chat[34].extra={};processReplyAny(chat,34,content);
  const c={characters:[{avatar:'isolated.png',name:'Isolated'}],characterId:0,getCurrentChatId:()=> 'native-save',chatMetadata:{integrity:'test'},chat};
  let release,entered,current=true,saved=[],calls=0;
  const gate=new Promise(r=>release=r),inRead=new Promise(r=>entered=r);
  const adapter=createChatPersistence({active:()=>c,headers:()=>({}),request:async(url,opts)=>{
   if(url.endsWith('/save')){saved=JSON.parse(opts.body).chat;return Response.json({ok:true});}
   if(!saved.length){entered();await gate;}return Response.json(saved);
  }});
  const native=adapter.save(c);const observed=native.then(()=>null,e=>e.message);await inRead;
  const world=runExtraction(chat,34,content,async()=>{calls++;return fixture.extraction.answer;},{isCurrent:()=>current,commit:async apply=>{await native;return apply();}});
  await new Promise(r=>setTimeout(r,5));
  const during=rec(chat[34]).extraction.status;if(stop)current=false;release();
  const error=await observed;const result=await world;
  assert.equal(error,null);assert.equal(during,'pending');assert.equal(calls,1);
  assert.equal(rec(chat[34]).extraction.status,stop?'pending':'applied');assert.equal(!!result.changed,!stop);
 }
});
