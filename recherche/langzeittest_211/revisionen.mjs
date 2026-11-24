// Inserted into the live player's command loop for separately imported campaign saves.
if (cmd.op === 'revision') {
    const prior = await dr.chat(), index = cmd.index ?? prior.length-1, old = prior[index];
    assert(prior.length && old && !blocked && await dr.verifySaved(prior,{complete:true}));
    const method = cmd.method;
    assert(['newSwipe','left','right','regenerate','edit','inflight'].includes(method));
    const saves = path.join(root,'revisions');
    fs.mkdirSync(saves,{recursive:true});
    n++;
    journal('revision-intents.jsonl',{n,cmd,at:new Date().toISOString(),before:digest(foldChat(prior).state)});
    gate({arm,turn:n});
    const requestState = observeRequests();
    const beforeText=old.mes, beforeSlot=old.swipe_id??0;
    const t0=Date.now();
    await p.evaluate(observeTurn,{index,regenerate:true});
    if(method==='edit'){
        const mes=p.locator('#chat .mes[mesid="'+index+'"]');await mes.hover();
        await mes.locator('.mes_edit').click({force:true});await mes.locator('textarea.edit_textarea').fill(cmd.text);await mes.locator('.mes_edit_done').click({force:true});
    } else if(method==='regenerate'){
        await p.evaluate(()=>{void SillyTavern.getContext().generate('regenerate');});
    } else {
        if(method==='newSwipe')assert(beforeSlot+1 >= (old.swipes?.length||1));
        if(method==='right')assert(beforeSlot+1 < old.swipes.length);
        if(method==='left')assert(beforeSlot>0);
        await p.locator('#chat .last_mes .swipe_'+(method==='left'?'left':'right')).last().click();
    }
    let intervened=null;
    let settled=false; const deadline=t0+600000;
    while(Date.now()<deadline){
        const signals=await p.evaluate(({index})=>{const m=SillyTavern.getContext().chat[index];return {mes:m?.mes,slot:m?.swipe_id??0,x:m?.extra?.avereth?.extraction?.status,global:document.querySelector('#avereth-action-status')?.textContent,stop:!!document.querySelector('#mes_stop')?.checkVisibility()};},{index});
        const {ended,open}=requestState();if(ended.some(q=>!q.ok))throw Error('Revision provider stop');
        if(method==='inflight' && !intervened && open && ended.at(-1)?.role==='narrator'){
            // No injected delay. Only use an actually offered native selection of an already saved reply.
            const arrow=p.locator('#chat .last_mes .swipe_left').last();
            const visible=await arrow.isVisible();
            intervened={at:Date.now(),visible,requested:false,slot:signals.slot,x:signals.x};
            if(visible && signals.slot>beforeSlot){
                try{await arrow.click({timeout:350});intervened.requested=true;}
                catch(err){intervened.clickError=err.name;}
            }
        }
        if(/Remoteabschluss unbekannt|Speichern fehlgeschlagen/.test(signals.global||''))throw Error('Revision host stop');
        const changed=method==='inflight'?ended.some(r=>r.role==='extractor') && !!signals.mes:method==='edit'?signals.mes===cmd.text:method==='regenerate'?signals.mes && signals.mes!==beforeText:signals.slot!==beforeSlot;
        const allowedEnd=method==='inflight' && (signals.slot===beforeSlot || signals.x==='applied')||method==='left'||method==='right'||method==='edit'&&old.is_user||signals.x==='applied';
        if(changed && !signals.stop && !open && allowedEnd && !dr.pendingSaves.size && Date.now()-t0>1400 && await dr.verifySaved(await dr.chat(),{complete:true})){settled=true;break;}
        await wait(250);
    }
    assert(settled,'Native revision failed to settle');gate({arm:null});
    const observation=await p.evaluate(()=>{const t=window.abTurn;t.stop();return {marks:t.marks,world:t.world};});
    const chk=await capture(n);await visible();const active=await dr.chat();
    journal('revision-results.jsonl',{n,method,index,intervened,beforeSlot,afterSlot:active[index].swipe_id??0,beforeText,afterText:active[index].mes,observation,chk,elapsedMs:Date.now()-t0});
    save('response.json',{seq:seen,n,complete:true});continue;
}
