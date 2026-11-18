// User05 originals on a marked ST 1.19 sandbox; all model responses here are scripted.
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
const fixture=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user05_202.json.gz',import.meta.url))));
const control={active:false,binding:null};
export function user05Response(purpose,request){
 if(!control.active)return undefined;
 if(purpose==='plan'){
  const text=request.messages.map(m=>m.content).join('\n');
  const selection=JSON.parse(/HOST HUD SELECTION \(typed player input, not story\): ([^\n]+)/.exec(text)[1]);
  const result=JSON.parse(control.binding);(result.hud_binding || result.commands[0].hud_binding).id=selection.id;
  return JSON.stringify(result);
 }
 if(purpose==='extract')return JSON.stringify({scene:'here',expected:{},deltas:[]});
 return 'Alaric held his position. The result of his chosen action unfolded before him.';
}
export async function user05Smoke({page,idle,calls,onReload,out,saveFailure,worldTimings=[]}){
 const checks={},measurements=[],layouts={};
 const bounded=async(p,label)=>{let timer;try{return await Promise.race([p,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error(`User05 timeout: ${label}`)),20000))]);}finally{clearTimeout(timer);}};
 const base='/scripts/extensions/third-party/avereth-engine/';
 const snapshot=()=>page.evaluate(async base=>{
  const {foldChat}=await import(base+'src/host.js'),c=SillyTavern.getContext(),s=foldChat(c.chat).state,u=c.chat.findLastIndex(m=>m.is_user);
  return {state:s,record:c.chat[u]?.extra?.avereth,input:c.chat[u]?.extra?.avereth_action_input,chat:structuredClone(c.chat),status:document.getElementById('avereth-action-status')?.textContent};
 },base);
 const seed=async (index,supplement=false)=>{
  await page.evaluate(async({prefix,base,supplement})=>{
   const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...structuredClone(prefix));delete c.chatMetadata.pending_action_input;
   const [h,ui,cm]=await Promise.all([import(base+'src/host.js'),import(base+'src/hud.js'),import(base+'src/content.js')]);
   const content=await cm.loadContentPack(async n=>(await fetch(base+'content/'+n)).json());
   if(supplement){
    // Explicit synthetic supplement on a copy: a learned defensive action and an owned consumable.
    const {itemProfile}=await import(base+'src/v4/items.js'),s=h.foldChat(c.chat).state;
    s.encounter.combatants.pc.fixed.actions['warrior.guard']={prof:1,pp:0};
    c.chat.at(-1).extra.avereth.events.push(
     {t:'skill.learned',d:{id:'pc',skill:'warrior.guard',prof:1}},
     {t:'encounter.updated',d:{encounter:s.encounter}},
     {t:'object.created',d:{object:{id:'obj.user05_potion',name:'minor mana potion',kind:'item',use:'consumable',qty:1,holder:{entity:'pc'},marks:[],for_quests:[],profile:itemProfile(content,{name:'minor mana potion',kind:'item'})}}});
   }
   const s=h.foldChat(c.chat).state;
   h.showPanel(c.chat.at(-1),'',s.last.outcome?.board?ui.renderBoardCards(s,content,s.last.outcome.board)+ui.renderHud(s,content,'open'):ui.renderHud(s,content,'open'),{playerFacing:true});
   await c.saveChat();await c.reloadCurrentChat();
  },{prefix:fixture.prefixes[index],base,supplement});onReload();await idle();
  await page.fill('#send_textarea','');
  if(await page.locator('#avereth-action-chip').isVisible())await page.click('#avereth-action-clear');
 };
 const checkpoint=()=>fs.writeFileSync(path.join(out,'user05_checks.json'),JSON.stringify({checks,measurements,layouts},null,2));
 const measure=(key,start,time)=>{
  const list=calls.slice(start);measurements.push({key,scripted:true,elapsed_ms:Date.now()-time,world_jobs:worldTimings.filter(t=>t.at>=time),requests:list.map(c=>({phase:c.purpose,prompt_characters:JSON.stringify(c.messages).length,max_output:c.maxTokens,stream:c.stream}))});checkpoint();
 };
 control.active=true;
 try{
  await seed(13);
  checks.guildNoTacticalButtons=await page.locator('[data-avereth-action^="skill:"]:visible').count()===0;
  checks.guildNoResourceUse=!(await page.locator('#avereth-action-choices').innerText()).match(/Guild plate|Small Pouch|contract slip/i);
  const q=Object.values((await snapshot()).state.quests).find(q=>q.title.includes('Outer Grottos'));
  const button=page.locator(`[data-avereth-quest="${q.id}"]`).last();
  await page.fill('#send_textarea','Ask Tam about the route.');const b=calls.length;
  await button.click();await button.click();
  checks.questKeepsDraft=await page.inputValue('#send_textarea')==='Ask Tam about the route.' && calls.length===b && (await snapshot()).state.quests[q.id].status==='listed';
  await page.click('#avereth-action-clear');await page.fill('#send_textarea','');
  const q0=calls.length,t0=Date.now();await button.click();await idle();const accepted=await snapshot();
  checks.directQuestNoPlanner=calls.slice(q0).filter(c=>c.purpose==='plan').length===0;
  checks.directQuestCommonInput=accepted.input?.selection.kind==='quest.accept' && accepted.input.mode==='hud_roleplay' && accepted.state.quests[q.id].status==='active';
  checks.questCanonicalDestination=calls.slice(q0).find(c=>c.purpose==='narrator')?.messages.some(m=>m.content.includes("morning's walk north of Glassmere"));
  const narratorPrompt=calls.slice(q0).find(c=>c.purpose==='narrator')?.messages.map(m=>m.content).join('\n') || '';
  checks.currentBoardContractSentOnce=narratorPrompt.includes('Contract revision: 4.3.0-c.6.6.203') && narratorPrompt.split('Engine-rendered catalogues are the exception:').length===2;
  const qn=calls.length;await button.click();await page.waitForTimeout(200);
  checks.questSecondClickNoRequests=calls.length===qn;
  measure('direct_quest',q0,t0);
  await seed(23);const state=await snapshot();
  checks.precombatReadableNames=!(await page.locator('#avereth-action-targets').innerText()).includes('mon.') && (await page.locator('#avereth-action-targets').innerText()).includes('Crystal Beetle A');
  await page.locator('[data-avereth-action="skill:mage.arcane_wave"]').click();
  checks.areaChoosesBand=await page.locator('[data-avereth-band]').count()>0;
  await page.locator('[data-avereth-band]').first().click();
  checks.areaPreviewNoBooking=JSON.stringify((await snapshot()).state)===JSON.stringify(state.state) && /trifft:/.test(await page.locator('#avereth-action-chip').innerText());
  await page.setViewportSize({width:390,height:844});
  checks.bandSelectionFitsNarrow=await page.locator('.avereth-action-controls').evaluate(el=>el.scrollWidth<=el.clientWidth+2);
  await page.screenshot({path:path.join(out,'user05-band-selection.png')});
  await page.setViewportSize({width:1280,height:900});
  await seed(42);
  const enemy='mon.glimmerdeep_grotto_c1_l1_e3';
  const choose=async mode=>{
   await page.locator('[data-avereth-select-skill="mage.flame_lance"]:not([disabled])').last().click();
   await page.locator(`[data-avereth-select-target="${enemy}"]:not([disabled])`).last().click();
   if(mode)await page.selectOption('#avereth-action-mode',mode);
  };
  await page.locator(`[data-avereth-select-target="${enemy}"]:not([disabled])`).last().click();
  checks.targetAloneNoAction=await page.locator('#avereth-action-chip').isHidden();
  await choose();
  checks.controlsInsideCombat=await page.locator('#avereth-action-send').evaluate(el=>!!el.closest('.avereth-combat-hud,.custom-avereth-combat-hud'));
  checks.noDuplicateTargetControls=await page.locator('[data-avereth-aim]:visible').count()===0;
  checks.noDuplicateSkillControls=await page.locator('[data-avereth-action^="skill:"]:visible').count()===0;
  await page.setViewportSize({width:390,height:844});
  await page.locator('.avereth-action-controls').scrollIntoViewIfNeeded();
  layouts.combat=await page.locator('.avereth-action-controls').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,children:[...el.querySelectorAll('*')].filter(c=>c.scrollWidth>c.clientWidth+2).map(c=>({tag:c.tagName,id:c.id,width:c.clientWidth,scroll:c.scrollWidth}))}));
  checks.combatSelectionFitsNarrow=layouts.combat.scroll<=layouts.combat.width+2;
  checks.approachCheckboxVisible=await page.locator('#avereth-action-approach').evaluate(el=>el.getBoundingClientRect().width>=12 && el.getBoundingClientRect().height>=12);
  await page.locator('.avereth-action-controls').screenshot({path:path.join(out,'user05-selected-combat.png')});
  await page.setViewportSize({width:1280,height:900});
  // A delayed real ST extractor response plus a native intermediate save must not show completion.
  let release,entered,handled;const arrived=new Promise(r=>entered=r),gate=new Promise(r=>release=r),done=new Promise(r=>handled=r);
  const route=async r=>{
   const request=r.request().postDataJSON();
   if(request.messages?.[0]?.content?.startsWith('You read one reply')){entered();await gate;await r.continue();handled();}else await r.continue();
  };
  await page.route('**/api/backends/chat-completions/generate',route);
  const h0=calls.length,ht=Date.now();await page.click('#avereth-action-send');await bounded(arrived,'extractor request');
  await page.evaluate(async()=>{await SillyTavern.getContext().saveChat();});
  checks.worldStatusNotSaved=(await snapshot()).status?.includes('Weltabgleich läuft');
  await page.fill('#send_textarea','My next free roleplay draft.');const awaiting=(await snapshot()).chat.length;
  await page.click('#send_but');
  checks.nextTextEditableButNotSent=await page.inputValue('#send_textarea')==='My next free roleplay draft.' && (await snapshot()).chat.length===awaiting;
  release();await bounded(done,'route completion');await page.unroute('**/api/backends/chat-completions/generate',route);await idle();
  await page.waitForFunction(()=>document.getElementById('avereth-action-status')?.textContent==='Gespeichert');
  checks.statusSettlesWithoutClick=true;
  checks.pureHudRequestPath=calls.slice(h0).map(c=>c.purpose).join(',')==='narrator,extract';
  checks.draftSurvivesWorldCompletion=await page.inputValue('#send_textarea')==='My next free roleplay draft.';
  measure('pure_hud_delayed_extractor',h0,ht);
  // Hold/fail the verification GET after a real world save, not the prior revision check.
  for(const fail of [false,true]){
   await seed(42);await choose();
   let written=false,held=false,notify,unhold,finished;
   const waiting=new Promise(r=>notify=r),gate=new Promise(r=>unhold=r),done=new Promise(r=>finished=r);
   const observe=r=>{if(r.url().endsWith('/api/chats/save') && r.method()==='POST'){
    try{const d=r.postDataJSON();if(d.chat?.at(-1)?.extra?.avereth?.extraction?.status==='applied')written=true;}catch{}
   }};
   const verify=async r=>{
    if(written && !held){held=true;notify();await gate;
     if(fail)await r.fulfill({status:200,contentType:'application/json',body:'[]'});else await r.continue();finished();
    }else await r.continue();
   };
   page.on('request',observe);await page.route('**/api/chats/get',verify);
   const beforeCalls=calls.length;
   const work=async()=>{
    await page.click('#avereth-action-send');await bounded(waiting,'post-save readback');
    checks[fail?'failedReadbackWaits':'slowReadbackWaits']=(await snapshot()).status!=='Gespeichert' && await page.locator('#avereth-action-retry').isHidden();
    unhold();await bounded(done,'route completion');await page.unroute('**/api/chats/get',verify);page.off('request',observe);await idle();
   };
   if(fail)await saveFailure(work);else await work();
   if(fail){
    checks.failedReadbackBlocks=await page.locator('#avereth-action-retry').isVisible() && (await snapshot()).status!=='Gespeichert';
    const events=JSON.stringify((await snapshot()).record.events),n=calls.length;
    await page.click('#avereth-action-retry');await idle();
    checks.readbackRetryNoModelOrMechanics=calls.length===n && JSON.stringify((await snapshot()).record.events)===events;
   }
   await page.waitForFunction(()=>document.getElementById('avereth-action-status')?.textContent==='Gespeichert');
   checks[fail?'readbackRecoveryAutomaticStatus':'readbackSuccessAutomaticStatus']=true;
   checks[fail?'failedReadbackTwoRequests':'slowReadbackTwoRequests']=calls.slice(beforeCalls).length===2;
   checkpoint();
  }
  await seed(42);
  let failNative=true;
  const nativeFailure=async r=>{if(failNative){failNative=false;await r.fulfill({status:500,body:'simulated isolated save failure'});}else await r.continue();};
  await page.route('**/api/chats/save',nativeFailure);
  await saveFailure(async()=>{await page.evaluate(async()=>{try{await SillyTavern.getContext().saveChat();}catch{}});});
  checks.nativeSaveFailureStatus=await page.locator('#avereth-action-retry').isVisible() && (await snapshot()).status.includes('Speichern offen');
  await page.unroute('**/api/chats/save',nativeFailure);
  const nativeCalls=calls.length;await page.click('#avereth-action-retry');await idle();
  checks.nativeSaveRecoveryNoModel=calls.length===nativeCalls && (await snapshot()).status==='Gespeichert';
  checkpoint();
  for(const action of ['move','defense','potion']){
   await seed(42,true);
   if(action==='move'){
    await page.locator('[data-avereth-action="move:away"]').click();
    await page.locator(`[data-avereth-select-target="${enemy}"]:not([disabled])`).last().click();
   }else if(action==='defense')await page.locator('[data-avereth-select-skill="warrior.guard"]:not([disabled])').last().click();
   else{
    await page.locator('#avereth-action-choices summary').filter({hasText:'Gegenstände'}).click();
    await page.locator('[data-avereth-action="use:obj.user05_potion"]').click();
   }
   const n=calls.length;await page.click('#avereth-action-send');await idle();const result=await snapshot();
   checks[`${action}CommonTwoRequestPath`]=!result.record?.action_error && calls.slice(n).map(c=>c.purpose).join(',')==='narrator,extract' && result.record.events.some(e=>e.t==='outcome.recorded');
   if(action==='potion')checks.potionConsumedOnce=result.record.events.filter(e=>e.t==='object.consumed').length===1;
   checkpoint();
  }
  // Six actual responses, only their per-send selection ID is rebound to the fresh host input.
  for(const original of fixture.bindings){
   await seed(42);await choose('hud_free');control.binding=original.answer;
   await page.fill('#send_textarea',original.input.text);
   const n=calls.length,t=Date.now();await page.click('#avereth-action-send');await idle();
   const snap=await snapshot();
   checks[`originalI${original.i}BookedOnce`]=!snap.record?.action_error && !!snap.record?.events?.some(e=>e.t==='outcome.recorded') && calls.slice(n).map(c=>c.purpose).join(',')==='plan,narrator,extract';
   measure(`original_I${original.i}`,n,t);
  }
  await page.screenshot({path:path.join(out,'user05-combat.png')});
  const final=await snapshot();await page.evaluate(async()=>{await SillyTavern.getContext().reloadCurrentChat();});onReload();await idle();
  checks.finalReadbackIdentical=JSON.stringify((await snapshot()).record.events)===JSON.stringify(final.record.events);
  checkpoint();return checks;
 }finally{control.active=false;}
}
