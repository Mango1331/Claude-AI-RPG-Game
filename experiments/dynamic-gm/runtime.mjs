import {copy,digest,fault} from '../architecture201/journal.mjs';
import {prepare,validate,foldChat,rec,content} from '../architecture201/engine.mjs';
import {BoundPublication} from './publication.mjs';
import {obligations,requireCoverage,authored,assertClaims,continueCandidate} from './contract.mjs';
import {knowledgeOf,memoriesOf,entityLabel} from '../../avereth-engine/src/knowledge.js';
export function recall(state,who){
 if(!state.entities[who])throw fault('unknown identity');
 return {id:who,name:entityLabel(state,who),knowledge:knowledgeOf(state,who),memories:memoriesOf(state,who),
 promises:Object.values(state.threads).filter(t=>t.who?.includes(who)),
 traits:Object.values(state.facts).filter(f=>f.s===who&&!f.until&&['voice','manner','interest'].includes(f.p))};
}
const CORE=`You are Avereth's creative GM. Understand the entire player input, including negation and conditions. NPC motives, dialogue, ordinary reactions and new people/places are yours; voluntary PC choices are not. Engine owns dice, checks, HP, XP, inventory, money, time and PULSE. Never narrate an unresolved mechanical success. Distinguish truth, belief, rumor, perceived episodes and promises; report important continuity with narration, not every gesture. NPCs use only their own knowledge. Return ONE JSON operation:
{"op":"resolve","commands":[existing engine command objects with seq,type,quote]}: one complete player action batch per turn; no second turn.
{"op":"recall","who":"canonical NPC id"}: own perspective, not global secrets.
{"op":"world","narration":"unpublished draft","world":{"scene":...,"expected":{},"deltas":[]}}: validate and complete immediately. Add "continue":true ONLY when an engine result is needed for further creative narration.
{"op":"finish","narration":"story","world":{...}}: complete story+world in one request after engine validation; or {"op":"finish","use_result":true} for legacy reuse. Prefer {"op":"finish","continuation":true,"narration":"NEW appended prose","threads":[],"speech":[],"claims":{"at":"current place"}} after a continued world tool. Never replace its prefix or repeat mechanical deltas. Speech entries {id,speaker,text,to:[ids],promise:true} render and persist the SAME promise text. PC speech must exactly match quoted player speech; no invented consent. Claims.at must match engine location. Free prose consistency is not guaranteed by this structure.
Use {"op":"describe","domain":"commands|world","types":["exact type"]} to request a situational schema before unsupported arguments. Player commands include go, activity, take, give, use; world effects include hostile, object.new, object.move. Unsupported mechanics must remain unresolved, never substitute an unrelated check. Tool results are binding. No provider call or prose instruction grants authority.`;
const MEMORY=new Set(['fact','learn','believe','memory','thread','person.new','enter','leave','place.reported','attitude']);
export class DynamicGM{
 constructor(journal,scheduler,publication){Object.assign(this,{journal,scheduler,publication:new BoundPublication(journal,publication.host)});}
 begin(id,input){const db=this.journal.read(),originChatId=this.publication.host.chatId;if(db.originChatId&&db.originChatId!==originChatId)throw fault('journal belongs to another chat');if(db.turns[id]){if(db.turns[id].originChatId!==originChatId||db.turns[id].input!==input)throw fault('turn identity conflict');return;}
 this.journal.update(d=>{d.originChatId=originChatId;d.turns[id]={id,input,originChatId,baseRevision:d.world.revision,base:copy(d.world.chat),phase:'active',step:0,results:[]};});}
 prompt(t){const s=foldChat(t.candidate||t.prepared?.chat||t.base).state;
 const names=Object.values(s.entities).filter(e=>s.scene.present.includes(e.id)).map(e=>({id:e.id,name:e.name,kind:e.kind}));
 const schemas=(content.deltaVocab.deltas||[]).filter(x=>MEMORY.has(x.type)).map(x=>({type:x.type,fields:x.fields}));
 return [{role:'system',content:CORE},{role:'user',content:JSON.stringify({input:t.input,obligations:obligations(t.input,foldChat(t.base).state),scene:s.scene,actors:names,objects:Object.values(s.objects).filter(o=>o.holder?.entity==='pc'||names.some(e=>e.id===o.holder?.entity)||o.holder?.loc===s.scene.at).map(o=>({id:o.id,name:o.name,holder:o.holder,qty:o.qty,use:o.use})),recall:names.filter(e=>e.kind==='npc').map(e=>recall(s,e.id)),places:Object.values(s.places).map(p=>({id:p.id,name:p.name})),memorySchemas:schemas,results:t.results})}];}
 async prepared(t,commands=[]){if(t.prepared)throw fault('player batch already resolved');requireCoverage(t.input,foldChat(t.base).state,commands);let n=0;
 const p=await prepare(t.base,t.input,async req=>{if(req.purpose!=='plan'||n++)throw fault('additional generator unsupported');return JSON.stringify({commands});},{fast:false});requireCoverage(t.input,foldChat(t.base).state,(rec(p.chat.at(-1)).interp?.commands||[]).filter(c=>(foldChat(p.chat).state.last.outcome?.resolutions||[]).some(r=>r.seq===c.seq&&r.type===c.type)));return p;}
 async run(id,transport,options={}){try{return await this.execute(id,transport,options);}catch(error){this.journal.update(db=>{db.turns[id].lastError=error.message;});throw error;}}
 async execute(id,transport,{hook=()=>{},token=this.publication.host.token()}={}){
 const origin=this.journal.read().turns[id]?.originChatId;
 const current=()=>!!origin&&token.chatId===origin&&this.publication.host.current(token);
 if(!current())throw fault('origin chat mismatch or stale generation');
 for(;;){let t=this.journal.read().turns[id];if(['committed','published'].includes(t.phase))return this.publication.publish(id,token,hook);
 if(t.step>=6)throw fault('continuation budget exhausted');
 const raw=await this.scheduler.request(`${id}:gm:${t.step}`,this.prompt(t),transport,{phase:`gm:${t.step}`,current});
 await hook('after_response');if(!current())throw fault('stale turn');
 let a=typeof raw==='string'?JSON.parse(raw):raw;let prepared=t.prepared,result,chat;
 if(a.op==='describe'){const rows=a.domain==='commands'?content.commandVocab.commands:content.deltaVocab.deltas;result={op:'describe',schema:rows.filter(x=>(a.types||[]).includes(x.type))};}
 else if(a.op==='recall')result={op:'recall',data:recall(foldChat(t.candidate||prepared?.chat||t.base).state,a.who)};
 else if(a.op==='resolve'){
  if(!Array.isArray(a.commands))throw fault('commands required');
  prepared=await this.prepared(t,a.commands);result={op:'resolve',outcome:rec(prepared.chat.at(-1)).outcome||foldChat(prepared.chat).state.last.outcome};
 }else if(a.op==='world'||a.op==='finish'){
  if(!prepared)prepared=await this.prepared(t,[]);
  if(t.candidate){
   if(a.op!=='finish')throw fault('world already resolved');
   if(a.use_result){if(a.narration||a.world||a.speech||a.threads||a.claims)throw fault('use_result cannot alter result');chat=t.candidate;}
   else chat=continueCandidate(t,a);
  }else {
   if(a.use_result)throw fault('missing world result');
   a=authored(a,t,foldChat(prepared.chat).state);
   chat=validate(prepared.chat,a.narration,a.world);
   assertClaims(a,foldChat(chat).state);
  }
  if(a.op==='world'&&a.continue===true)result={op:'world',state:{scene:foldChat(chat).state.scene,encounter:foldChat(chat).state.encounter},events:rec(chat.at(-1)).events};
 }else throw fault('unsupported operation');
 if(a.op==='finish'||(a.op==='world'&&a.continue!==true)){
  await hook('before_commit');if(!current())throw fault('stale turn before commit');this.journal.update(db=>{if(db.world.revision!==t.baseRevision)throw fault('world revision conflict');
   db.world={revision:t.baseRevision+1,chat:copy(chat)};Object.assign(db.turns[id],{chat,prepared,phase:'committed'});});
  await hook('after_commit');return this.publication.publish(id,token,hook);
 }
 if(!current())throw fault('stale turn before checkpoint');
 this.journal.update(db=>{Object.assign(db.turns[id],{prepared,step:t.step+1,...(a.op==='world'?{candidate:chat}:{})});db.turns[id].results.push(result);});
 await hook('after_tool');
 }
 }
}
