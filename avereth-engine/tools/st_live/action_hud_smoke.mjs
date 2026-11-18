// Browser proof through the real composer and ST Generate. Scripted provider, never natural inference.
export const actionHudTurns=[
 {key:'hudH',player:'I shout to my party members to take the left flank!',reply:'Alaric called to his companions as the selected attack resolved. The creatures shifted around him.'},
 {key:'hudF',player:'I call out while using my selected action.',reply:'His selected action resolved while his call echoed through the burrow.'},
 {key:'hudConflict',player:'Instead, do not attack anyone.',reply:'No attack was chosen.'},
];
export function actionHudPlan(users){
 const m=/HOST HUD SELECTION \(typed player input, not story\): ([^\n]+)/.exec(users);if(!m)return null;
 const s=JSON.parse(m[1]);
 const command=s.kind==='move'?{seq:1,type:'move',dir:s.dir,target:s.target}:s.kind==='use'?{seq:1,type:'use',object:s.object,qty:1}:{seq:1,type:'use_skill',skill:s.skill,target:s.target || null};
 return {commands:[command],hud_binding:{id:s.id,decision:users.includes(actionHudTurns[2].player)?'conflict':'use',seqs:[1]}};
}
export async function actionHudSmoke({page,send,idle,calls,onReload,reconnect}){
 const base='/scripts/extensions/third-party/avereth-engine/';
 const priorStream=await page.evaluate(()=>{const o=SillyTavern.getContext().chatCompletionSettings,prior=o.stream_openai;o.stream_openai=false;return prior;});
 const seed=await page.evaluate(()=>{
  const c=SillyTavern.getContext();const u=c.chat.findIndex(m=>m.is_user && m.mes==='I Fire Lance Barkscorpion B');
  if(u<0)throw new Error('Action fixture not found');return structuredClone(c.chat.slice(0,u));
 });
 const reset=async()=>{
  await page.evaluate(async seed=>{const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...structuredClone(seed));delete c.chatMetadata.pending_action_input;await c.saveChat();await c.reloadCurrentChat();},seed);onReload();await idle();
 };
 const choose=async(mode='hud_roleplay',skill='mage.flame_lance')=>{
  await page.locator(`[data-avereth-select-skill="${skill}"]:not([disabled])`).last().click();
  await page.locator('[data-avereth-aim="mon.barkscorpion_1"], [data-avereth-select-target="mon.barkscorpion_1"]:not([disabled])').last().click();
  await page.selectOption('#avereth-action-mode',mode);
 };
 const snapshot=()=>page.evaluate(async base=>{
  const {foldChat,rec}=await import(base+'src/host.js');const c=SillyTavern.getContext(),u=c.chat.findLastIndex(m=>m.is_user),r=rec(c.chat[u]);
  return {state:foldChat(c.chat).state,input:c.chat[u]?.extra?.avereth_action_input,record:r,extraction:rec(c.chat.at(-1))?.extraction,narration:rec(c.chat.at(-1))?.narration,
   status:document.getElementById('avereth-action-status')?.textContent,chat:structuredClone(c.chat),card:c.characters[c.characterId].description};
 },base);
 const checks={};
 await reset();await choose();const before=await snapshot(),n=calls.length;
 await page.fill('#send_textarea',actionHudTurns[0].player);
 checks.selectionIsDraftOnly=calls.length===n && JSON.stringify((await snapshot()).state)===JSON.stringify(before.state);
 // Real click; the reservation and MESSAGE_SENT binding must survive ST's first save.
 await page.click('#send_but');await idle();const h=await snapshot(),hc=calls.slice(n);
 checks.hNoPlanner=hc.filter(c=>c.purpose==='plan').length===0;
 checks.hNarratorAndExtractor=hc.filter(c=>c.purpose==='narrator').length===1 && hc.filter(c=>c.purpose==='extract').length===1;
 checks.hTypedInputBooked=h.input?.mode==='hud_roleplay' && h.record?.action_input_hash!=null && h.record.events.some(e=>e.t==='outcome.recorded');
 checks.hWorldApplied=h.extraction?.status==='applied';
 const attempts=await page.evaluate(id=>Object.keys(localStorage).filter(k=>k.startsWith('avereth.requests.v1:')).flatMap(k=>JSON.parse(localStorage.getItem(k)).attempts || []).filter(a=>a.input_id===id),h.input?.id);
 checks.physicalInputProvenance=attempts.length===2 && attempts.every(a=>a.request_id && a.capacity_key && a.origin_chat && a.revision===1 && a.attempt===1 && a.weight===4 && a.status==='terminal') && new Set(attempts.map(a=>a.phase)).size===2;
 checks.nonstreamContextRecorded=!!h.narration?.context;
 checks.sentModeVisible=await page.evaluate(()=>{const c=SillyTavern.getContext(),u=c.chat.findLastIndex(m=>m.is_user);return document.querySelector(`#chat [mesid="${u}"] .mes_text`)?.innerText.includes('Auswahl + Rollenspiel');});
 await page.setViewportSize({width:390,height:844});
 checks.composerFitsNarrow=await page.locator('#avereth-action-composer').evaluate(el=>el.scrollWidth<=el.clientWidth+2);
 await page.setViewportSize({width:1280,height:900});
 const nr=hc.find(c=>c.purpose==='narrator');
 checks.activeAgency=!!nr?.messages.some(m=>String(m.content).includes('ordinary, low-consequence gestures')) && !!h.card?.includes('HUD roleplay mode');
 checks.noConflictingCombatSilence=!!nr?.messages.some(m=>String(m.content).includes('Combat roleplay')) && !nr?.messages.some(m=>String(m.content).includes('Combat silence: nobody talks'));
 checks.modeInActualNarratorPrompt=!!nr?.messages.some(m=>String(m.content).includes('HUD + ROLEPLAY'));
 await page.evaluate(async()=>{await SillyTavern.getContext().reloadCurrentChat();});onReload();await idle();
 checks.reloadPreservesMechanics=JSON.stringify((await snapshot()).record.events)===JSON.stringify(h.record.events);
 const rc=calls.length;
 await page.evaluate(async()=>{await SillyTavern.getContext().generate('regenerate');});await idle();
 const regen=await snapshot();
 checks.regenerateNoSecondAction=JSON.stringify(regen.record.events)===JSON.stringify(h.record.events) && calls.slice(rc).every(c=>c.purpose!=='plan');
 const swipeCalls=calls.length;await page.locator('#chat .last_mes .swipe_right').click();await page.waitForTimeout(400);await idle();
 checks.hudSwipeNoSecondAction=JSON.stringify((await snapshot()).record.events)===JSON.stringify(h.record.events) && calls.slice(swipeCalls).every(c=>c.purpose!=='plan');

 await reset();await choose('hud_free');const f0=calls.length;await send(actionHudTurns[1].player);await idle();const f=await snapshot();
 checks.fOnePlanner=calls.slice(f0).filter(c=>c.purpose==='plan').length===1;
 checks.fKeepsAnchor=f.record?.action_input_hash!=null && !f.record.action_error && f.record.events.some(e=>e.t==='outcome.recorded');
 await reset();await choose('hud_free');const c0=calls.length,cs=await snapshot();await send(actionHudTurns[2].player);await idle();const conflict=await snapshot();
 checks.conflictNoMechanics=conflict.record?.events.length===0 && !!conflict.record.action_error && JSON.stringify(cs.state)===JSON.stringify(conflict.state);
 checks.conflictNoRepairOrNarrator=calls.slice(c0).length===1 && calls[c0]?.purpose==='plan';
 await choose();const correctionCalls=calls.length;
 await page.click('#avereth-action-revise');await idle();const corrected=await snapshot();
 checks.localCorrectionNoPlanner=corrected.input?.revision===2 && corrected.input?.mode==='hud_roleplay' && !corrected.record?.action_error
  && corrected.record?.events.some(e=>e.t==='outcome.recorded') && calls.slice(correctionCalls).filter(c=>c.purpose==='plan').length===0;

 await reset();await choose();
 await page.fill('#send_textarea','#status');await page.click('#send_but');
 checks.systemInputNotCombined=await page.inputValue('#send_textarea')==='#status';
 await page.click('#avereth-action-clear');await page.fill('#send_textarea','');
 // Real native SSE transport, not a mocked Response object.
 await choose();await page.evaluate(()=>SillyTavern.getContext().chatCompletionSettings.stream_openai=true);
 const s0=calls.length;await send(actionHudTurns[0].player);await idle();
 checks.nativeStreaming=calls.slice(s0).some(c=>c.purpose==='narrator' && c.stream) && (await snapshot()).extraction?.status==='applied';
 await page.evaluate(()=>SillyTavern.getContext().chatCompletionSettings.stream_openai=false);
 // Unknown physical completion must survive a full browser reload, not just a chat reload.
 const q0=calls.length;
 await page.evaluate(async()=>{
  const c=SillyTavern.getContext(),o=c.chatCompletionSettings,ctl=new AbortController();
  const p=fetch('/api/backends/chat-completions/generate',{method:'POST',headers:c.getRequestHeaders(),signal:ctl.signal,
   body:JSON.stringify({chat_completion_source:'custom',custom_url:o.custom_url,model:o.custom_model,stream:false,max_tokens:32,messages:[{role:'user',content:'REQUEST_CONTROL_DELAY'}]})});
  setTimeout(()=>ctl.abort(),100);await p.catch(()=>{});
  await fetch('/api/backends/chat-completions/generate',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({stream:false,messages:[]})}).catch(()=>{});
 });
 checks.unknownNoAutomaticDispatch=calls.length===q0+1;
 const originChat=await page.evaluate(()=>SillyTavern.getContext().getCurrentChatId());
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.SillyTavern?.getContext()?.characters?.length);
 await page.evaluate(async file=>{let c=SillyTavern.getContext();await c.selectCharacterById(String(c.characters.findIndex(c=>c.name==='Avereth V4')));c=SillyTavern.getContext();if(c.getCurrentChatId()!==file)await c.openCharacterChat(file);},originChat);
 await page.waitForSelector('#avereth-action-composer');onReload();await reconnect();await idle();
 checks.unknownSurvivesReload=(await page.locator('#avereth-action-status').innerText()).includes('Remoteabschluss unbekannt');
 // The user's explicit single retry is represented by an accepted real browser confirmation.
 await page.waitForTimeout(800);page.once('dialog',d=>d.accept());await page.click('#avereth-action-retry');await idle();
 const prior=await snapshot();await page.evaluate(async()=>{await SillyTavern.getContext().generate('regenerate');});await idle();
 checks.explicitRetryReusesMechanics=JSON.stringify((await snapshot()).record.events)===JSON.stringify(prior.record.events);
 // A real ST response with a generic error is not proof of a completed upstream job.
 let genericReplies=0;const genericRoute=async route=>{genericReplies++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({error:true})});};
 await page.route('**/api/backends/chat-completions/generate',genericRoute);
 const genericBlocked=await page.evaluate(async()=>{const c=SillyTavern.getContext(),send=()=>fetch('/api/backends/chat-completions/generate',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({stream:false,messages:[]})});await send();try{await send();return false;}catch(e){return e.code==='LLM_CAPACITY_BLOCKED';}});
 await page.unroute('**/api/backends/chat-completions/generate',genericRoute);
 checks.genericHostErrorKeepsUnknown=genericBlocked && genericReplies===1;
 page.once('dialog',d=>d.accept());await page.click('#avereth-action-retry');await idle();
 await page.evaluate(async()=>{await SillyTavern.getContext().generate('regenerate');});await idle();
 checks.genericErrorRecoveryNoSecondAction=JSON.stringify((await snapshot()).record.events)===JSON.stringify(prior.record.events);
 // Persist exactly the native pre-MESSAGE_SENT crash window, then let the installed reload path recover it.
 await reset();
 await page.evaluate(async ({base,input,text})=>{
  const {actionPrefix}=await import(base+'src/action_input.js');const c=SillyTavern.getContext();
  const bound={...input,id:'crash-before-message-sent',base_revision:actionPrefix(c.chat),text};
  const index=c.chat.length;c.chatMetadata.pending_action_input={index,input:bound,expectedText:text};
  c.chat.push({mes:text,is_user:true,extra:{}});await c.saveChat();await c.reloadCurrentChat();
 },{base,input:h.input,text:actionHudTurns[0].player});onReload();await idle();
 const recovered=await snapshot();
 checks.crashReservationBoundWithoutExecution=recovered.input?.id==='crash-before-message-sent' && !recovered.record?.events?.length;
 await page.evaluate(async()=>{await SillyTavern.getContext().generate('regenerate');});await idle();
 checks.crashResumeExecutesOnce=(await snapshot()).record?.events.some(e=>e.t==='outcome.recorded');

 await reset();await choose();const enterCalls=calls.length;
 await page.fill('#send_textarea','');
 await page.evaluate(()=>document.querySelector('#send_textarea').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,isComposing:true,bubbles:true,cancelable:true})));
 checks.compositionEnterDoesNotSend=calls.length===enterCalls && await page.inputValue('#send_textarea')==='';
 await page.locator('#send_textarea').press('Enter');await idle();
 const only=await snapshot();checks.emptyComposerEnterOneInput=only.input?.text===only.input?.label && only.record?.events.filter(e=>e.t==='turn.begun').length===1 && calls.slice(enterCalls).length===2;

 await reset();await choose();const doubleCalls=calls.length;
 const userCount=await page.evaluate(()=>SillyTavern.getContext().chat.filter(m=>m.is_user).length);
 await page.fill('#send_textarea',actionHudTurns[0].player);await page.dblclick('#send_but');await idle();
 checks.doubleClickOneInput=await page.evaluate(n=>SillyTavern.getContext().chat.filter(m=>m.is_user).length===n+1,userCount) && calls.length===doubleCalls+2;
 // Hold the actual X request at the browser transport. The next text stays a draft and cannot start a turn.
 await reset();await choose();let releaseX;const holdX=new Promise(resolve=>releaseX=resolve);
 const delayedX=async route=>{
  const b=route.request().postDataJSON();if(String(b?.messages?.[0]?.content || '').startsWith('You read one reply'))await holdX;
  await route.continue();
 };
 await page.route('**/api/backends/chat-completions/generate',delayedX);
 try {
  await page.fill('#send_textarea',actionHudTurns[0].player);await page.click('#send_but');
  await page.waitForFunction(()=>document.querySelector('#avereth-action-status')?.textContent.includes('Weltabgleich'));
  const worldCalls=calls.length,users=await page.evaluate(()=>SillyTavern.getContext().chat.filter(m=>m.is_user).length);
  await page.fill('#send_textarea','My next free reply stays here.');await page.click('#send_but');
  checks.draftDuringWorldRead=await page.inputValue('#send_textarea')==='My next free reply stays here.' && calls.length===worldCalls
   && await page.evaluate(n=>SillyTavern.getContext().chat.filter(m=>m.is_user).length===n,users);
 }finally {releaseX();await idle();await page.unroute('**/api/backends/chat-completions/generate',delayedX);await page.fill('#send_textarea','');}
 // Actual ST chat switch inside MESSAGE_SENT, after origin binding and before the interceptor.
 await reset();await choose();const switchCalls=calls.length;
 const switchedOrigin=await page.evaluate(()=>{
  const c=SillyTavern.getContext(),original=c.getCurrentChatId(),other=`action-switch-${Date.now()}`;
  window.actionSwitchOther=other;
  const once=async()=>{c.eventSource.removeListener(c.eventTypes.MESSAGE_SENT,once);await SillyTavern.getContext().openCharacterChat(other);};
  c.eventSource.on(c.eventTypes.MESSAGE_SENT,once);return original;
 });
 await page.fill('#send_textarea',actionHudTurns[0].player);await page.click('#send_but');await page.waitForTimeout(500);await idle();
 checks.chatSwitchNoForeignBinding=await page.evaluate(()=>{
  const c=SillyTavern.getContext();return c.getCurrentChatId()===window.actionSwitchOther && !c.chat.some(m=>m.extra?.avereth_action_input || m.is_user);
 }) && calls.length===switchCalls;
 await page.evaluate(async file=>{await SillyTavern.getContext().openCharacterChat(file);},switchedOrigin);onReload();await idle();
 checks.chatSwitchOriginNotExecuted=!(await snapshot()).record?.events?.length;
 await reset();await choose();const stopCalls=calls.length;
 await page.evaluate(()=>{const c=SillyTavern.getContext();const once=()=>{c.eventSource.removeListener(c.eventTypes.MESSAGE_SENT,once);c.stopGeneration();};c.eventSource.on(c.eventTypes.MESSAGE_SENT,once);});
 await page.fill('#send_textarea',actionHudTurns[0].player);await page.click('#send_but');await idle();
 const stopped=await snapshot();checks.stopAfterBindingNoMechanics=!stopped.record?.events?.length && calls.length===stopCalls;
 await reset();
 await page.evaluate(prior=>SillyTavern.getContext().chatCompletionSettings.stream_openai=prior,priorStream);
 return checks;
}
