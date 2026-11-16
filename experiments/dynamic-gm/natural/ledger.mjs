import fs from 'node:fs';import path from 'node:path';
import {Journal,copy,digest,fault} from '../../architecture201/journal.mjs';
export const LIMIT=24;
export function redact(value,key=''){
 const exact=new Set(['authorization','api_key','apikey','password','access_token','refresh_token']);
 return JSON.parse(JSON.stringify(value,(k,v)=>exact.has(k.toLowerCase())?'[REDACTED]':typeof v==='string'&&key?v.split(key).join('[REDACTED]'):v));
}
// Shared across both arms, fsynced BEFORE physical dispatch. No transport retry is implemented here.
export class RequestLedger{
 constructor(root,{series,model,contextWindow,maxOutput=2000,temperature=0.7,tokenizerId,hashes,limit=LIMIT,offline=false},tokenCount){
  if(!model||!series||!Number.isInteger(contextWindow)||contextWindow<1||maxOutput<1||maxOutput>=contextWindow||!tokenizerId||typeof tokenCount!=='function')throw fault('explicit model/context/tokenizer required');
  if(!Number.isInteger(limit)||limit<1||limit>LIMIT)throw fault('limit must be <=24');
  this.root=root;this.tokenCount=tokenCount;this.config={series,model,contextWindow,maxOutput,temperature,tokenizerId,hashes,limit,offline};
  fs.mkdirSync(root,{recursive:true});this.journal=new Journal(path.join(root,'request-ledger.json'));
  const old=this.journal.read();if(old.series&&digest(old.series)!==digest(this.config))throw fault('series configuration or prompts changed');
  if(!old.series)this.journal.update(db=>{db.series=this.config;db.calls=[];db.blocked=null;});
  // A persisted sent call is unresolved after process loss. Never infer remote release from a local restart.
  if(this.journal.read().calls.some(c=>c.status==='sent'))this.journal.update(db=>{db.blocked='remote completion unknown after restart';});
  this.busy=false;
 }
 async request(body,dispatch,{secret='',label='unspecified'}={}){
  if(this.busy)throw fault('single provider request already active');
  if(body.model!==this.config.model||body.max_tokens!==this.config.maxOutput||body.temperature!==this.config.temperature||body.stream!==false)throw fault('generation configuration differs');
  const tokens=await this.tokenCount(body);if(!Number.isInteger(tokens)||tokens<0)throw fault('tokenizer must return full request input tokens');
  if(tokens+this.config.maxOutput>this.config.contextWindow)throw fault('context window exceeded before dispatch');
  // Re-check busy after awaited counting: simultaneous callers must not both dispatch.
  if(this.busy)throw fault('single provider request already active');this.busy=true;
  let id;
  try{
   this.journal.update(db=>{if(db.blocked)throw fault('series blocked: '+db.blocked);if(db.calls.length>=this.config.limit)throw fault('24-request budget exhausted');id=db.calls.length+1;
    db.calls.push({id,label,capacityUnits:4,status:'sent',at:new Date().toISOString(),inputTokensPreflight:tokens,request:redact(body,secret),hash:digest(redact(body,secret))});});
   const start=performance.now();
   try{
    const response=await dispatch(copy(body));
    this.journal.update(db=>{const c=db.calls[id-1];Object.assign(c,{status:'completed',durationMs:performance.now()-start,response:redact(response,secret),usage:redact(response.usage||null,secret)});
     if(response.error||!Array.isArray(response.choices)||typeof response.choices[0]?.message?.content!=='string'||response.choices[0].finish_reason!=='stop')db.blocked='provider error, incomplete or truncated response';});
    if(this.journal.read().blocked)throw fault(this.journal.read().blocked);
    return redact(response,secret);
   }catch(error){
    const c=this.journal.read().calls[id-1];if(c.status==='sent')this.journal.update(db=>{db.calls[id-1].status='remote_unknown';db.calls[id-1].error=redact(String(error.message),secret);db.blocked='remote completion unknown; controlled stop';});
    throw error;
   }
  }finally{this.busy=false;}
 }
}
