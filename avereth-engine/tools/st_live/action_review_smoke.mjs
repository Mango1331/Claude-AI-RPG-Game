// .202: reproduce R1/R2 through real ST saves, chat switches and HUD clicks.
export async function actionReviewSmoke({page,idle,calls,saveFailure}) {
 const checks={},beforeCalls=calls.length;
 const original=await page.evaluate(()=>{const c=SillyTavern.getContext();return structuredClone(c.chat);});
 const reset=async()=>{await page.evaluate(async original=>{
  const c=SillyTavern.getContext(),u=original.findIndex(m=>m.is_user && m.mes==='I Fire Lance Barkscorpion B');
  c.chat.splice(0,c.chat.length,...structuredClone(original.slice(0,u)));await c.saveChat();await c.reloadCurrentChat();
 },original);await idle();};
 await reset();
 const enemy=page.locator('[data-avereth-select-target="mon.barkscorpion_1"]').last();
 await enemy.click();
 checks.targetAloneNoAction=await page.locator('#avereth-action-chip').isHidden();
 await page.locator('[data-avereth-select-skill="mage.flame_lance"]').last().click();
 checks.explicitSkillAndTarget=await page.locator('#avereth-action-chip').isVisible() && /Flame Lance/.test(await page.locator('#avereth-action-chip').innerText());
 await page.click('#avereth-action-clear');await enemy.click();
 checks.targetAfterClearNoAction=await page.locator('#avereth-action-chip').isHidden();
 // Capture an actual ST save after compression, before Avereth's transport sees it.
 const startSave=()=>page.evaluate(async()=>{
  const c=SillyTavern.getContext(),{saveChat}=await import('/script.js'),fetch=window.fetch;
  window.reviewSave={origin:c.getCurrentChatId(),ready:false};
  window.fetch=async(url,options)=>{
   if(String(url).endsWith('/api/chats/save')){
    window.fetch=fetch;window.reviewSave.ready=true;
    await new Promise(resolve=>window.reviewSave.release=resolve);
    try{const r=await fetch(url,options);window.reviewSave.response={ok:r.ok,status:r.status,body:await r.clone().text()};return r;}
    catch(e){window.reviewSave.response={ok:false,error:e.message};throw e;}
   }
   return fetch(url,options);
  };
  window.reviewSave.done=saveChat();
 });
 const finishSave=async()=>saveFailure(async()=>page.evaluate(async()=>{window.reviewSave.release();await window.reviewSave.done;return window.reviewSave.response;}));
 await startSave();await page.waitForFunction(()=>window.reviewSave?.ready);
 await page.evaluate(()=>{const m=SillyTavern.getContext().chat.at(-1);m.name='R1 newer name';m.gen_finished='R1 newer timestamp';m.review_future_field={kept:true};});
 const staleFields=await finishSave();checks.newMessageFieldsRejectOldSave=!staleFields.ok;
 await page.evaluate(async()=>{await SillyTavern.getContext().saveChat();});
 checks.completeMessageFieldsReadBack=await page.evaluate(async()=>{
  const c=SillyTavern.getContext(),a=c.characters[c.characterId];const r=await fetch('/api/chats/get',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({avatar_url:a.avatar,file_name:c.getCurrentChatId()})});
  const m=(await r.json()).at(-1);return m.name==='R1 newer name' && m.gen_finished==='R1 newer timestamp' && m.review_future_field?.kept===true;
 });
 // Identical delayed snapshots are legal only through a real new save plus read-back.
 let duplicateWrites=0;const observeWrite=r=>{if(r.method()==='POST' && r.url().endsWith('/api/chats/save'))duplicateWrites++;};
 page.on('request',observeWrite);
 await startSave();await page.waitForFunction(()=>window.reviewSave?.ready);
 await page.evaluate(async()=>{await SillyTavern.getContext().saveChat();});
 const writesBeforeRelease=duplicateWrites,duplicate=await finishSave();
 page.off('request',observeWrite);
 checks.identicalDuplicateReallyWritten=duplicate.ok && duplicateWrites===writesBeforeRelease+1 && !/superseded/.test(duplicate.body || '');
 await reset();
 // The still-active native call belongs to A; ST's bare saveChat can overlap a real chat switch.
 await page.evaluate(()=>SillyTavern.getContext().chat.at(-1).review_late_origin_value='not-yet-persisted-A');
 await startSave();await page.waitForFunction(()=>window.reviewSave?.ready);
 const a=await page.evaluate(()=>SillyTavern.getContext().getCurrentChatId());
 await page.evaluate(async()=>{await SillyTavern.getContext().openCharacterChat(`action-review-B-${Date.now()}`);});await idle();
 // B must be a campaign too: this is precisely the .201 false-success branch.
 checks.destinationIsCampaign=await page.evaluate(async()=>{const {hasStoredCampaign}=await import('/scripts/extensions/third-party/avereth-engine/src/host.js');return hasStoredCampaign(SillyTavern.getContext().chat);});
 const beforeB=await page.evaluate(()=>JSON.stringify(SillyTavern.getContext().chat));
 const staleChat=await finishSave();checks.crossChatNativeSaveRejected=!staleChat.ok && !/superseded/.test(staleChat.body || '');
 checks.destinationUnchanged=await page.evaluate(before=>JSON.stringify(SillyTavern.getContext().chat)===before,beforeB);
 await page.evaluate(async file=>{await SillyTavern.getContext().openCharacterChat(file);},a);await idle();
 checks.unwrittenOriginChangeReported=await page.evaluate(()=>!SillyTavern.getContext().chat.at(-1).review_late_origin_value) && !staleChat.ok;
 console.log('ACTION REVIEW SAVE RECEIPTS',JSON.stringify({staleFields,staleChat}));
 await enemy.click();checks.targetAfterChatSwitchNoAction=await page.locator('#avereth-action-chip').isHidden();
 if(await page.locator('#avereth-action-chip').isVisible())await page.click('#avereth-action-clear');
 // Actual native save (including ST's isChatSaving) overlaps the next Generate before its first save.
 let releaseGet,seenGet;const heldGet=new Promise(resolve=>releaseGet=resolve),enteredGet=new Promise(resolve=>seenGet=resolve);let firstGet=true;
 const holdPriorRead=async route=>{if(firstGet){firstGet=false;seenGet();await heldGet;}await route.continue();};
 await page.route('**/api/chats/get',holdPriorRead);
 await page.evaluate(()=>{window.reviewNativeSave=SillyTavern.getContext().saveChat();});await enteredGet;
 const beforeGeneration=await page.evaluate(()=>JSON.stringify(SillyTavern.getContext().chat));
 await page.evaluate(()=>{document.getElementById('send_textarea').value='#status';window.reviewGeneration=SillyTavern.getContext().generate('normal');});
 await page.waitForTimeout(100);
 checks.generationWaitsForNativeSave=await page.evaluate(before=>JSON.stringify(SillyTavern.getContext().chat)===before,beforeGeneration);
 releaseGet();await page.evaluate(async()=>{await window.reviewNativeSave;await window.reviewGeneration;});
 await page.unroute('**/api/chats/get',holdPriorRead);await idle();
 // A slash command which cancels Generate must not discard an already scheduled native edit save.
 const slashSave=page.waitForResponse(r=>r.url().endsWith('/api/chats/save') && r.request().method()==='POST',{timeout:10000});
 await page.evaluate(async()=>{
  const c=SillyTavern.getContext(),{saveChatDebounced}=await import('/script.js');
  c.chat.at(-1).review_slash_edit='pending native edit';saveChatDebounced();
  document.getElementById('send_textarea').value='/echo Action save probe';await c.generate('normal');
 });
 await slashSave;await idle();
 checks.slashCommandKeepsPendingEditSave=await page.evaluate(async()=>{
  const c=SillyTavern.getContext(),a=c.characters[c.characterId];
  const r=await fetch('/api/chats/get',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({avatar_url:a.avatar,file_name:c.getCurrentChatId()})});
  return (await r.json()).at(-1).review_slash_edit==='pending native edit';
 });
 checks.onlyDraftsNoModelRequests=calls.length===beforeCalls;
 await page.evaluate(async original=>{const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...original);await c.saveChat();await c.reloadCurrentChat();},original);await idle();
 return checks;
}
