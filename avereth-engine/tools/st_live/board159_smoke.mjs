// Original User03 Board failure through a real ST host; scripted provider, no natural-model claim.
import fs from 'node:fs';import zlib from 'node:zlib';
const f=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user03_board158.json.gz',import.meta.url))));
const success='I read the official board and study the notices.';
const failure='I try reading the official quest board again.';
const comparison='I spend three minutes comparing the official notices on the Guild board.';
export const board159Turns=[
 {key:'board203comparison',player:comparison,plan:{commands:[{seq:1,type:'board.read',rank:null,quote:comparison}]},
  reply:'Three minutes passed as Alaric compared the official contracts at the Guild board.',answer:{scene:'here',expected:{},deltas:[{seq:1,type:'time',minutes:3}]}},

 {key:'board159success',player:success,plan:{commands:[{seq:1,type:'board.read',rank:null,quote:success}]},reply:'Alaric read the five official contracts and considered his options.',answer:{scene:'here',expected:{},deltas:[]}},
 {key:'board159failure',player:failure,plan:{commands:[{seq:1,type:'board.read',rank:null,quote:failure}]},reply:f.reply,answer:f.extraction},
];
let mode=null,n=0;
export function board159Response(system){
 n++;const pair=f.attempts[mode==='success'?0:1];
 if(mode==='full' && n===1)return 'unreadable initial board';
 if(!['slot','reference','full'].includes(mode) && (mode!=='success'||n===1))return pair[(n-1)%2];
 const raw=JSON.parse(pair[1]),l=raw.listings.find(l=>l.level===1);
 for(const k of ['title','task','desired_end_state'])if(l[k])l[k]=l[k].replace(/boars?/gi,'giant rat');
 l.objectives[0].what='giant rat';l.objectives[0].qty=1;l.habitat={...l.habitat,species:'giant rat',anchor:'rat',min_level:1,max_level:1};if(mode==='slot'){
  const pos=raw.listings.indexOf(l)+1;
  if(n===1)l.habitat.max_level=3;
  else if(system.includes('"slot":'+pos+',"listing":'))return JSON.stringify({slot:pos,listing:l});
 }
 return JSON.stringify(raw);
}
export async function board159Smoke({page,send,idle,calls,driver,onReload}){
 const seed=async()=>{await page.evaluate(async prefix=>{const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...prefix);await c.saveChat();await c.reloadCurrentChat();},structuredClone(f.prefix));onReload();};
 const snapshot=()=>page.evaluate(async()=>{const{foldChat}=await import('/scripts/extensions/third-party/avereth-engine/src/host.js');const c=SillyTavern.getContext(),r=foldChat(c.chat),s=r.state;return{errors:r.errors,quests:Object.values(s.quests).filter(q=>q.kind==='guild_contract').length,coin:s.entities.pc.sheet.coin_cp,facts:Object.values(s.facts),rejected:c.chat.at(-1)?.extra?.avereth?.rejected,status:c.chat.at(-1)?.extra?.avereth?.extraction?.status};});
 mode='success';n=0;await seed();const start=calls.length;await send(success);await idle();const good=await snapshot();
 const boardCalls=calls.slice(start).filter(c=>c.purpose==='board'),repair=boardCalls[1]?.lastUser || '';
 const checks={originalRepairBooksFive:good.quests===5&&n===2&&good.coin===30&&!good.errors.length,repairShowsConstraints:/rat/.test(repair)&&/HP.*35/.test(repair)&&/41/.test(repair)&&/11/.test(repair)};
 mode='failure';n=0;await seed();await send(failure);await idle();const bad=await snapshot();
 checks.invalidBoardRemainsUnbooked=bad.quests===0&&n===2&&bad.coin===30&&!bad.errors.length;
 checks.noInventedSchedule=!bad.facts.some(f=>f.p==='post_schedule')&&bad.rejected?.some(x=>x.rule==='board_availability');
 checks.extractionCompleted=bad.status==='applied';
 checks.saved=await driver().verifySaved(await driver().chat(),{complete:true});
 const publication=()=>page.evaluate(async()=>{
  const c=SillyTavern.getContext(), {foldChat,rec}=await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
  return {world:foldChat(c.chat).state,events:c.chat.slice(-2).map(m=>rec(m)?.events),status:rec(c.chat.at(-1))?.extraction?.status};
 });
 const originalSettings=await page.evaluate(()=>{
  const c=SillyTavern.getContext();
  return {compact:c.extensionSettings.avereth.compactOutput,stream:c.chatCompletionSettings.stream_openai,smooth:c.powerUserSettings.smooth_streaming};
 });
 const setStream=({stream,smooth,compact})=>page.evaluate(({stream,smooth,compact})=>{
  const c=SillyTavern.getContext();
  c.extensionSettings.avereth.compactOutput=compact;
  c.chatCompletionSettings.stream_openai=stream;
  c.powerUserSettings.smooth_streaming=smooth;
 },{stream,smooth,compact});
 let reference;
 try{
  for(const arm of ['reference','full','slot']){
   mode=arm;n=0;await seed();await setStream({stream:arm==='slot',smooth:false,compact:arm==='slot'});
   const start=calls.length;await send(comparison);await idle();
   const turn=calls.slice(start),saved=await driver().verifySaved(await driver().chat(),{complete:true});
   const before=await publication();
   await page.evaluate(()=>SillyTavern.getContext().reloadCurrentChat());onReload();
   const after=await publication();
   checks[arm+'Saved']=saved&&after.status==='applied'&&JSON.stringify(before)===JSON.stringify(after);
   checks[arm+'WorldBooking']=after.events[1].filter(e=>e.t==='time.advanced' && e.d.minutes===3).length===1;
   // Independently timed calls. Reload above must preserve even the elapsed times exactly.
   for(const events of after.events)for(const event of events)
    if(['cmd.interpreted','extract.applied'].includes(event.t))delete event.d.ms;
   if(arm==='reference')reference=after;
   else checks[arm+'SameWorld']=JSON.stringify(after)===JSON.stringify(reference);
   const expected=arm==='reference'?['plan','board','narrator','extract']:['plan','board','board','narrator','extract'];
   checks[arm+'ExtractorFormat']=turn.find(c=>c.purpose==='extract')?.messages[0].content.includes('Write compact single-line JSON.') === (arm==='slot');
   checks[arm+'Calls']=JSON.stringify(turn.map(c=>c.purpose))===JSON.stringify(expected) &&
    turn.every(c=>c.stream===(arm==='slot' && c.purpose==='narrator'));
  }
 }finally{await setStream(originalSettings);}
 mode=null;return checks;
}
