import {watchInput, inputTiming} from './safe_input_timing.mjs';
// Original User03 Board failure through a real ST host; scripted provider, no natural-model claim.
import {createHash} from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';import zlib from 'node:zlib';
const f=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user03_board158.json.gz',import.meta.url))));
const user09 = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user09_207.json.gz',import.meta.url)))).chat;
const hazardTurns = [17,21].map(i=>({key:'hazard208_'+i,player:user09[i].mes,plan:JSON.parse(user09[i].extra.avereth.plan.raw[0]),reply:user09[i+1].mes,answer:user09[i+1].extra.avereth.extraction.raw}));
const user10 = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user10_207.json.gz',import.meta.url))));
const journeyBoard=user10.boards[13];
const acceptText='Annehmen: Clear Mossback Warrens, Level 1';
const finalText='I watch the scouts and steady my staff.';
const journeyTurns=[11,13,15,19,23,25].map(i=>({
 key:'journey208_'+i, player:i===13?acceptText:i===25?finalText:user09[i].mes,
 plan:{commands:user09[i].extra.avereth.interp?.commands || []},
 reply:user09[i+1].mes,answer:user09[i+1].extra.avereth.extraction.raw,
}));
const projection208={key:'projection208',player:'I stay still and watch the wasps.',plan:{commands:[]},reply:'The wasps hover beside the wall.',answer:{scene:'here',expected:{},deltas:[]}};
const success='I read the official board and study the notices.';
const failure='I try reading the official quest board again.';
const comparison='I spend three minutes comparing the official notices on the Guild board.';
export const board159Turns=[projection208,...journeyTurns,...hazardTurns,
 {key:'board203comparison',player:comparison,plan:{commands:[{seq:1,type:'board.read',rank:null,quote:comparison}]},
  reply:'Three minutes passed as Alaric compared the official contracts at the Guild board.',answer:{scene:'here',expected:{},deltas:[{seq:1,type:'time',minutes:3}]}},

 {key:'board159success',player:success,plan:{commands:[{seq:1,type:'board.read',rank:null,quote:success}]},reply:'Alaric read the five official contracts and considered his options.',answer:{scene:'here',expected:{},deltas:[]}},
 {key:'board159failure',player:failure,plan:{commands:[{seq:1,type:'board.read',rank:null,quote:failure}]},reply:f.reply,answer:f.extraction},
];
let mode=null,n=0;
export function board159Response(system){
 if(mode==='journey')return JSON.stringify(journeyBoard);
 n++;const pair=f.attempts[mode==='success'?0:1];
 if(mode==='full' && n===1)return 'unreadable initial board';
 if(mode==='failure') return JSON.stringify({listings:JSON.parse(pair[0]).listings.slice(0,3)});
 if(mode==='success') return pair[0]; // valid group hunt on the archived first board
 const raw=JSON.parse(pair[1]),l=raw.listings.find(l=>l.level===1);
 for(const k of ['title','task','desired_end_state'])if(l[k])l[k]=l[k].replace(/boars?/gi,'giant rat');
 l.objectives[0].what='giant rat';l.objectives[0].qty=1;l.habitat={...l.habitat,species:'giant rat',anchor:'rat',min_level:1,max_level:1};if(mode==='slot'){
  const pos=raw.listings.indexOf(l)+1;
  if(n===1)l.habitat.max_level=3;
  else if(system.includes('"slot":'+pos+',"listing":'))return JSON.stringify({slot:pos,listing:l});
 }
 return JSON.stringify(raw);
}
export async function board159Smoke({page,send,idle,calls,worldTimings,driver,onReload,out}){
 const seed=async(messages=f.prefix)=>{await page.evaluate(async prefix=>{const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...prefix);await c.saveChat();await c.reloadCurrentChat();},structuredClone(messages));onReload();};
 const snapshot=()=>page.evaluate(async()=>{const{foldChat}=await import('/scripts/extensions/third-party/avereth-engine/src/host.js');const c=SillyTavern.getContext(),r=foldChat(c.chat),s=r.state;return{errors:r.errors,quests:Object.values(s.quests).filter(q=>q.kind==='guild_contract').length,coin:s.entities.pc.sheet.coin_cp,facts:Object.values(s.facts),rejected:c.chat.at(-1)?.extra?.avereth?.rejected,status:c.chat.at(-1)?.extra?.avereth?.extraction?.status};});
 mode='success';n=0;await seed();const start=calls.length;await send(success);await idle();const good=await snapshot();
 const checks={originalGroupHuntBooksFive:good.quests===5&&n===1&&good.coin===30&&!good.errors.length &&
   calls.slice(start).filter(c=>c.purpose==='board').length===1};
 mode='failure';n=0;await seed();await send(failure);await idle();const bad=await snapshot();
 checks.invalidBoardRemainsUnbooked=bad.quests===0&&n===1&&bad.coin===30&&!bad.errors.length;
 checks.noInventedSchedule=!bad.facts.some(f=>f.p==='post_schedule')&&bad.rejected?.some(x=>x.rule==='board_availability');
 checks.extractionCompleted=bad.status==='applied';
 checks.saved=await driver().verifySaved(await driver().chat(),{complete:true});
 const publication=()=>page.evaluate(async()=>{
  const c=SillyTavern.getContext(), {foldChat,rec}=await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
  return {world:foldChat(c.chat).state,events:c.chat.slice(-2).map(m=>rec(m)?.events),status:rec(c.chat.at(-1))?.extraction?.status};
 });
 const originalSettings=await page.evaluate(()=>{
  const c=SillyTavern.getContext();
  return {order:c.chatCompletionSettings.prompt_order,compact:c.extensionSettings.avereth.compactOutput,stream:c.chatCompletionSettings.stream_openai,smooth:c.powerUserSettings.smooth_streaming};
 });
 const configure=({stream,smooth,compact,order})=>page.evaluate(({stream,smooth,compact,order})=>{
  const c=SillyTavern.getContext();
  c.chatCompletionSettings.prompt_order=order;
  c.extensionSettings.avereth.compactOutput=compact;
  c.chatCompletionSettings.stream_openai=stream;
  c.powerUserSettings.smooth_streaming=smooth;
 },{stream,smooth,compact,order});
 const standard=JSON.parse(fs.readFileSync(new URL('../../presets/Avereth Narrator V4.json',import.meta.url))).prompt_order;
 const alternate=JSON.parse(fs.readFileSync(new URL('../../presets/Avereth Narrator V4 - Card before Lore.json',import.meta.url))).prompt_order;
 const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
 const fingerprint={};
 let reference;
 try{
  for(const arm of (process.env.AVERETH_SMOKE_BOARD_REFERENCE ? ['reference','full'] : ['reference','full','slot'])){
   mode=arm;n=0;await seed();await configure({stream:arm==='slot',smooth:false,compact:arm==='slot',order:arm==='slot'?alternate:standard});
   const fromJob=worldTimings.length;
   await watchInput(page);
   const start=calls.length;await send(comparison);await idle();
   const turn=calls.slice(start),saved=await driver().verifySaved(await driver().chat(),{complete:true});
   const timing=await inputTiming(page,worldTimings.slice(fromJob));
   checks[arm+'ReadyAfterReadback']=saved && timing.verified;
   const before=await publication();
   await page.evaluate(()=>SillyTavern.getContext().reloadCurrentChat());onReload();
   const after=await publication();
   checks[arm+'Saved']=saved&&after.status==='applied'&&JSON.stringify(before)===JSON.stringify(after);
   checks[arm+'WorldBooking']=after.events[1].filter(e=>e.t==='time.advanced' && e.d.minutes===3).length===1;
   // Independently timed calls. Reload above must preserve even the elapsed times exactly.
   for(const events of after.events)for(const event of events)
    if(['cmd.interpreted','extract.applied'].includes(event.t))delete event.d.ms;
   fingerprint[arm]={timing,world:digest(after.world),events:digest(after.events),
       requests:turn.map(c=>({role:c.purpose,mockMs:c.durationMs,finished:c.finished}))};
   const narrator=turn.find(c=>c.purpose==='narrator').messages;
   const card=narrator.findIndex(m=>m.content.startsWith('AVERETH RPG'));
   checks[arm+'CardOrder']=card === (arm==='slot'?1:2);
   if(arm==='reference')reference=after;
   else if(arm==='slot'){
    const offered=Object.values(after.world.quests).filter(q=>q.status==='listed');
    checks.partialDayHasFourOriginals=offered.length===4&&offered.every(q=>JSON.stringify(q)===JSON.stringify(reference.world.quests[q.id]));
   }else checks[arm+'SameWorld']=JSON.stringify(after)===JSON.stringify(reference);
   const expected=arm!=='full'?['plan','board','narrator','extract']:['plan','board','board','narrator','extract'];
   checks[arm+'ExtractorFormat']=turn.find(c=>c.purpose==='extract')?.messages[0].content.includes('Write compact single-line JSON.') === (arm==='slot');
   checks[arm+'Calls']=JSON.stringify(turn.map(c=>c.purpose))===JSON.stringify(expected) &&
    turn.every(c=>c.stream===(arm==='slot' && c.purpose==='narrator'));
  }
 }finally{await configure(originalSettings);}
 fs.writeFileSync(path.join(out,'board-world.json'),JSON.stringify(fingerprint,null,2));
 for (const [j,i] of [17,21].entries()){
  await seed(user09.slice(0,i));
  await send(hazardTurns[j].player);await idle();
  const observed=await page.evaluate(()=>{const c=SillyTavern.getContext();const m=c.chat.at(-1),u=c.chat.findLast(x=>x.is_user);return {player:u?.mes,plan:u?.extra?.avereth?.plan?.raw,charged:u?.extra?.avereth?.events?.filter(e=>e.t==='resource.changed'||e.t==='check.recorded'),panel:m?.extra?.avereth?.panel,visible:document.querySelector('#chat .mes:last-child .mes_text')?.innerText};});
  fs.writeFileSync(path.join(out,'hazard-'+i+'.json'),JSON.stringify(observed,null,2));
  const line='−'+(i===17?14:8)+' HP';
  const visible=async()=> (await page.locator('#chat .mes').last().locator('.mes_text').innerText()).split('\n').filter(row=>row.startsWith('HINDERNIS') && row.includes(line)).length;
  checks['hazard'+i+'Visible']=await visible()===1;
  checks['hazard'+i+'Saved']=await driver().verifySaved(await driver().chat(),{complete:true});
  await page.evaluate(()=>SillyTavern.getContext().reloadCurrentChat());onReload();await idle();
  checks['hazard'+i+'Reload']=await visible()===1;
 }
 if(process.env.AVERETH_SMOKE_JOURNEY208==='1'){
  mode='journey';await seed(user09.slice(0,11));
  const log=[];
  for(const i of [11,13,15,17,19,21,23,25]){
   const pos=calls.length;
   if(i===13)await page.locator('#chat [data-avereth-quest="quest.clear_mossback_warrens_level_1"]').last().click();
   else if(i===25){
    await page.click('[data-avereth-action="skill:mage.arcane_wave"]');
    await page.selectOption('#avereth-minor','move:away');
    await page.selectOption('#avereth-order','before');
    await page.locator('[data-avereth-band="SHORT"]').last().click();
    await page.selectOption('#avereth-action-mode','hud_roleplay');
    await send(finalText);
   } else await send(user09[i].mes);
   await idle();
   const data=await page.evaluate(async()=>{
    const c=SillyTavern.getContext(),{foldChat,rec}=await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
    const user=rec(c.chat.findLast(m=>m.is_user)), fold=foldChat(c.chat);
    return {errors:fold.errors,where:fold.state.scene.at,hp:fold.state.entities.pc.sheet.hp,quests:Object.values(fold.state.quests).map(q=>[q.id,q.status]),
     acts:(fold.state.last?.outcome?.records || []).filter(r=>r.actor==='pc').map(r=>r.kind),notice:user?.action_error,
     hazards:(user?.events || []).filter(e=>e.t==='resource.changed'), world:rec(c.chat.at(-1))?.extraction?.status};
   });
   data.calls=calls.slice(pos).map(c=>c.purpose);log.push(data);
   fs.writeFileSync(path.join(out,'journey208.json'),JSON.stringify(log,null,2));
   checks['journeySaved'+i]=!data.errors.length && data.world==='applied' && await driver().verifySaved(await driver().chat(),{complete:true});
   if(i===11)checks.journeyFour=data.quests.filter(q=>q[1]==='listed').length===4 && data.calls.filter(p=>p==='board').length===1;
   if(i===13)checks.journeyAccepted=data.quests.some(q=>q[0]==='quest.clear_mossback_warrens_level_1' && q[1]==='active') && !data.calls.includes('plan');
   if(i===17 || i===21)checks['journeyHazard'+i]=data.hazards.some(e=>e.d.resource==='hp');
   if(i===25)checks.journeyOrder=data.acts.join(',')==='move,attack' && !data.calls.includes('plan');
  }
  const end=await publication();await page.evaluate(()=>SillyTavern.getContext().reloadCurrentChat());onReload();await idle();
  checks.journeyReload=JSON.stringify(end)===JSON.stringify(await publication());
  await seed(user10.chat.slice(0,29));const index=calls.length;
  await send(projection208.player);await idle();
  const later=calls.slice(index),rejected=user10.chat[27].mes;
  for(const role of ['plan','narrator','extract']){
   const records=later.filter(c=>c.purpose===role);
   checks['projection208_'+role]=records.length===1 && !records.some(c=>c.messages.some(m=>String(m.content).toLowerCase().includes('after the spell i jump backwards')));
  }
  checks.projection208Audit=(await driver().chat()).some(m=>m.mes===rejected);

 }
 mode=null;return checks;
}
