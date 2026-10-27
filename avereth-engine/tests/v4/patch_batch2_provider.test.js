import test from 'node:test';
import assert from 'node:assert/strict';
import * as recovery from '../../src/v4/narrator_recovery.js';
import { rec, setRec } from '../../src/host.js';
const response=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
function setup(first,second=response(200,{choices:[{message:{content:'A story.'}}]})) {
 const chat=[{is_user:true,mes:'I go.',extra:{}},{mes:'',extra:{}}];setRec(chat[0],{events:[{t:'turn.begun',d:{turn:1}}]});setRec(chat[1],{narration:{empty:true},events:[]});
 let calls=0,current=true,saves=0;const ctl=new AbortController();
 const opts={signal:ctl.signal,isCurrent:()=>current,mark:data=>setRec(chat[0],{...rec(chat[0]),narrator_recovery:data}),save:async()=>{saves++;}};
 return {chat,opts,ctl,send:async()=>++calls===1?first:second,calls:()=>calls,saves:()=>saves,stale:()=>{current=false;}};
}
for(const [name,first] of [['HTTP503',response(503,{error:{code:'server_error'}})],['original Run2 C285',response(200,{error:{message:'An unexpected error has occurred.',type:'server_error',code:'internal_server_error'}})]])
 test(`Batch2 narrator: ${name} retries the same request once, without replaying Engine events`,async()=>{
  const x=setup(first),before=structuredClone(rec(x.chat[0]).events);
  const r=await recovery.narratorProviderResponse(x.send,x.opts);assert.equal(r.status,200);assert.equal(x.calls(),2);assert.equal(x.saves(),1);
  assert.deepEqual(rec(x.chat[0]).events,before);assert.equal(rec(x.chat[0]).narrator_recovery.reason,'provider');
  const h=recovery.createNarratorRecovery({active:()=>({chat:x.chat}),save:async()=>{},generate:async()=>assert.fail('shared retry budget exceeded')});assert.equal(h.queue(1),false);
 });
for(const status of [400,401,403,404,422])test(`Batch2 narrator: permanent HTTP${status} is never retried`,async()=>{
 const x=setup(response(status,{error:{code:'invalid_request_error'}}));await recovery.narratorProviderResponse(x.send,x.opts);assert.equal(x.calls(),1);assert.equal(x.saves(),0);
});
test('Batch2 narrator: a second server failure is returned, no third attempt',async()=>{
 const x=setup(response(500,{}),response(500,{}));assert.equal((await recovery.narratorProviderResponse(x.send,x.opts)).status,500);assert.equal(x.calls(),2);
});
for(const why of ['stop','chat/edit/swipe'])test(`Batch2 narrator: ${why} prevents a retry`,async()=>{
 const x=setup(response(503,{}));if(why==='stop')x.ctl.abort();else x.stale();await recovery.narratorProviderResponse(x.send,x.opts);assert.equal(x.calls(),1);assert.equal(x.saves(),0);
});
test('Batch2 narrator: invalidation while saving cannot publish a new request',async()=>{
 const x=setup(response(503,{}));x.opts.save=async()=>x.stale();await recovery.narratorProviderResponse(x.send,x.opts);assert.equal(x.calls(),1);
});
test('Batch2 narrator: a valid reply is untouched and produces no retry marker',async()=>{
 const first=response(200,{choices:[{message:{content:'A normal reply.'}}]});const x=setup(first);
 assert.equal(await recovery.narratorProviderResponse(x.send,x.opts),first);assert.equal(x.calls(),1);assert.equal(rec(x.chat[0]).narrator_recovery,undefined);
});
