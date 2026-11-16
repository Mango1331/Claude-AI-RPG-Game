import {copy,fault} from '../../architecture201/journal.mjs';
import {Prototype} from '../../architecture201/orchestrator.mjs';
import {recentText} from '../../../avereth-engine/src/v4/planner.js';
import {DynamicGM} from '../runtime.mjs';
// Memory-loss probe: delete the original dialogue from *all outgoing prompt phases*, not from authoritative history.
export function withoutDialogue(messages,hidden=[],phase=''){
 return messages.map(m=>{
  if(hidden.includes(m.content))return {...m,content:'[original N1 dialogue withheld; use persisted memory]'};
  // Planner RECENT is normalized and truncated. Remove its precise derived excerpt as well.
  if(phase.startsWith('plan'))return {...m,content:hidden.reduce((text,old)=>old?text.split(recentText(old)).join('[N1 recent excerpt withheld]'):text,m.content)};
  return {...m}; // Structured facts/threads/knowledge remain available; do not erase memory just for matching words.
 });
}
export async function armRun({arm,id,input,base,journal,scheduler,publication,transport,hidden=[]}){
 let bPlans=0;
 const provider=req=>{if(arm==='B'&&req.phase.startsWith('plan')&&bPlans++>0)throw fault('automatic B planner repair disabled for frozen pilot');return transport({...req,messages:withoutDialogue(req.messages,hidden,req.phase)});};
 const begin=performance.now();
 if(arm==='GM'){
  const gm=new DynamicGM(journal,scheduler,publication);gm.publication=publication;gm.begin(id,input);await gm.run(id,provider);
 }else{
  // Prototype B is deliberately reused unchanged; all P/N/X callbacks go to the natural transport.
  const b=new Prototype(journal,scheduler,publication);b.begin(id,{input},'B');
  journal.update(db=>{db.turns[id].originChatId=publication.host.chatId;});
  await b.run(id,{input},provider,{fast:true});
 }
 const t=journal.read().turns[id];if(t.phase!=='published')throw fault('turn not published');
 return {phase:t.phase,confirmedDisplayMs:performance.now()-begin,chat:copy(journal.read().world.chat)};
}
