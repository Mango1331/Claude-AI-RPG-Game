import {hash32} from '../src/util.js';
import {copy,fault} from './util.js';
import {content,foldChat,rec} from './engine.js';
import {readTurn} from '../src/ir.js';
import {authorization,deedsOf,declarative} from '../src/intent.js';
import {combatTruth,stripFalseDeaths} from '../src/v4/combat_truth.js';
import {threadEvents} from '../src/threads.js';
import {applyEvent} from '../src/state.js';

// Omission detector, not a natural-language planner. Existing recognizers plus one narrow held-item use pattern.
export function obligations(input,state){
 const ir=readTurn(input,state,content),text=declarative(deedsOf(input)),auth=authorization(text),out=[];
 if(ir.acts.length)out.push({kind:'mechanical',intent:ir.intent.kind});
 if(auth.travel)out.push({kind:'travel'});
 if(auth.pay)out.push({kind:'finance'});
 if(auth.rest&&!auth.travel)out.push({kind:'activity'});
 const use=/\bI\s+(?:drink|consume|use)\s+(?:my\s+|the\s+|a\s+)?([^.!?]+)[.!?]?$/i.exec(text.trim());
 if(use){const name=use[1].toLowerCase();const items=Object.values(state.objects).filter(o=>o.holder?.entity==='pc'&&(name.includes(o.name.toLowerCase())||o.name.toLowerCase().includes(name)));
  if(items.length===1)out.push({kind:'use',object:items[0].id});else out.push({kind:'unclear_use'});}
 return out;
}
export function requireCoverage(input,state,commands){
 for(const o of obligations(input,state)){
 const covered=o.kind==='use'?commands.some(c=>c.type==='use'&&c.object===o.object)
 :o.kind==='travel'?commands.some(c=>['go','journey.continue'].includes(c.type))
 :o.kind==='finance'?commands.some(c=>['pay','buy','sell','give','offer.accept'].includes(c.type))
 :o.kind==='activity'?commands.some(c=>['activity','use'].includes(c.type))
 :o.kind==='mechanical'?commands.length>0:false;
 if(!covered)throw fault(`unresolved player action: ${JSON.stringify(o)}`);
 }
}
// Declared speech acts use the same text for display and persistent promise. Free prose remains semantically open.
export function authored(a,t,state){
 const out=copy(a);out.narration=String(a.narration||'');out.world=copy(a.world);
 const deltas=[];const seen=new Set();
 for(const s of a.speech||[]){
  if(!s.id||seen.has(s.id)||typeof s.text!=='string'||!s.text.trim())throw fault('invalid speech identity');seen.add(s.id);
  if(!state.entities[s.speaker]||state.entities[s.speaker].status==='dead'||!state.scene.present.includes(s.speaker))throw fault('speech speaker not present');
  if((s.knowledgeRefs||[]).some(ref=>!state.knowledge[s.speaker]?.[ref]))throw fault('speaker lacks referenced knowledge');
  if(s.speaker==='pc'){
   // Only exact, already quoted player speech. Not a general consent parser.
   const quotes=[...t.input.matchAll(/"([^"\n]+)"|“([^”\n]+)”/g)].map(m=>m[1]||m[2]);
   if(!quotes.includes(s.text)||s.promise)throw fault('unauthorized PC speech or promise');
  }
  out.narration+=`\n${state.entities[s.speaker].name}: “${s.text}”`;
  if(s.promise){if(s.speaker==='pc'||!Array.isArray(s.to)||s.to.some(id=>!state.entities[id]||!state.scene.present.includes(id)))throw fault('invalid promise participants');
   deltas.push({type:'thread',id:null,kind:'promise',status:'open',resolution:null,text:`${state.entities[s.speaker].name}: ${s.text}`,who:[s.speaker,...s.to]});}
 }
 if(out.world)out.world.deltas=[...(out.world.deltas||[]),...deltas].map((d,i)=>({...d,seq:i+1}));
 return {...out,promiseDeltas:deltas};
}
export function assertClaims(a,state){
 if(a.claims&&Object.keys(a.claims).some(k=>k!=='at'))throw fault('unsupported mechanical claim');
 if(a.claims?.at!==undefined&&a.claims.at!==state.scene.at)throw fault('contradictory structured arrival');
}
export function continueCandidate(t,a){
 if(!a.continuation||a.world||a.use_result)throw fault('continuation must append, never replace world');
 const chat=copy(t.candidate),s=foldChat(chat).state;
 assertClaims(a,s);
 const authoredReply=authored(a,t,s);const events=[];
 // Deliberately narrow continuation memory seam: existing thread lifecycle; no applyWorld/turn/dice rerun.
 const updates=[...(a.threads||[]),...authoredReply.promiseDeltas];
 for(const th of updates){
  if(!['promise','debt','rumor'].includes(th.kind))throw fault('unsupported continuation thread kind');
  if(!Array.isArray(th.who)||th.who.some(id=>!s.entities[id]||s.entities[id].status==='dead'||(id!=='pc'&&s.entities[id].kind!=='npc')))throw fault('unknown thread participant');
  if(th.kind!=='rumor'&&[th.text,th.resolution].filter(Boolean).some(text=>stripFalseDeaths(combatTruth(s,content),text).refused.length))throw fault('engine-owned death in continuation');
  if(th.who.includes('pc')&&!th.who.some(id=>id!=='pc'&&s.scene.present.includes(id)))throw fault('promise requires present NPC');
  const r=threadEvents(s,th,{at:{turn:s.turn,minute:s.clock.minute},src:{turn:s.turn,how:'dynamic-gm-continuation'},place:s.scene.at});
  if(r.reject)throw fault(r.reject);for(const e of r.events){applyEvent(s,e);events.push(e);}
 }
 const msg=chat.at(-1);msg.mes+='\n'+authoredReply.narration;rec(msg).events.push(...events);rec(msg).text_hash=hash32(msg.mes);
 // Full state except the selected memory container must be byte-identical, including RNG, clock, PULSE and last outcome.
 const before=foldChat(t.candidate).state,after=foldChat(chat).state;
 const omit=x=>JSON.stringify({...x,threads:null});if(omit(before)!==omit(after))throw fault('continuation modified protected state');
 return chat;
}
