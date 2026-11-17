// Early Action-HUD host feasibility test. Real ST APIs, existing marked sandbox only.
export async function actionHostSmoke({page, send, idle}) {
    const checks = await page.evaluate(async () => {
        const {createChatPersistence, chatOrigin, decodeSave} = await import('/scripts/extensions/third-party/avereth-engine/src/v4/action_persistence.js');
        const c = SillyTavern.getContext();
        const origin=chatOrigin(c), originalMetadata=structuredClone(c.chatMetadata);
        // Use the installed transport adapter once, never recursively acquire its save lock.
        const save = async () => {
            const r=await fetch('/api/chats/save',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({...origin,chat:[{chat_metadata:c.chatMetadata,user_name:'unused',character_name:'unused'},...c.chat]})});
            if(!r.ok)throw new Error('Host probe save failed');
        };
        c.chatMetadata.action_host_probe={id:'early-host-input',mode:'hud_roleplay'};
        await save();
        const get=async()=> (await fetch('/api/chats/get',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify(origin)})).json();
        const saved=await get();
        const checks={targetSaveReadBack:saved[0].chat_metadata.action_host_probe.id==='early-host-input',settingsInDrawer:!!document.querySelector('#extensions_settings2 .avereth-settings .inline-drawer')};
        const body=await new Response(new Blob([JSON.stringify({...origin,chat:saved})]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
        checks.gzipPayloadRoundtrip=(await decodeSave({body,headers:{'Content-Encoding':'gzip'}})).file_name===origin.file_name;
        let writes=0;
        const stale=createChatPersistence({request:async(...args)=>{writes++;return fetch(...args);},headers:c.getRequestHeaders,active:()=>SillyTavern.getContext()});
        await stale.save(c,()=>false).then(()=>checks.stopBeforeSave=false,()=>checks.stopBeforeSave=writes===0);
        const lost=createChatPersistence({request:async(url,options)=>url.endsWith('/save')?Response.json({ok:true}):fetch(url,options),headers:c.getRequestHeaders,active:()=>SillyTavern.getContext()});
        c.chatMetadata.action_host_probe.id='not-written';
        await lost.save(c).then(()=>checks.falseSaveDetected=false,()=>checks.falseSaveDetected=true);
        const revision=c.chatMetadata.avereth_save_revision;
        Object.keys(c.chatMetadata).forEach(k=>delete c.chatMetadata[k]); Object.assign(c.chatMetadata,originalMetadata,{avereth_save_revision:revision});
        await save();
        // Observe the actual first native save and MESSAGE_SENT ordering, without replacing ST Generate.
        const ev=c.eventTypes, originalFetch=window.fetch;
        window.actionHostProbe={order:[],firstSaveHasReservation:false,bound:false};
        window.fetch=async function(url,options){
            if(String(url).endsWith('/api/chats/save')){
                const data=await decodeSave(options);
                const p=window.actionHostProbe;
                if(data.chat.at(-1)?.is_user && data.chat.at(-1).mes==='#status') {
                    p.order.push('save');p.firstSaveHasReservation ||= data.chat[0].chat_metadata.pending_action_probe?.id==='native-send';
                }
            }
            return originalFetch(url,options);
        };
        const reserve=()=>{SillyTavern.getContext().chatMetadata.pending_action_probe={id:'native-send'};};
        const bind=id=>{const a=SillyTavern.getContext(); if(a.chat[id]?.mes!=='#status')return;window.actionHostProbe.order.push('message_sent');window.actionHostProbe.bound=a.chatMetadata.pending_action_probe?.id==='native-send';delete a.chatMetadata.pending_action_probe;};
        c.eventSource.on(ev.GENERATION_AFTER_COMMANDS,reserve);c.eventSource.on(ev.MESSAGE_SENT,bind);
        window.cleanupActionHostProbe=()=>{window.fetch=originalFetch;c.eventSource.removeListener(ev.GENERATION_AFTER_COMMANDS,reserve);c.eventSource.removeListener(ev.MESSAGE_SENT,bind);};
        return checks;
    });
    try {
        await send('#status'); await idle();
        const p=await page.evaluate(()=>window.actionHostProbe);
        checks.nativeReservationBeforeMessageSent=p.firstSaveHasReservation && p.bound && p.order.indexOf('save')<p.order.indexOf('message_sent');
    } finally {await page.evaluate(()=>window.cleanupActionHostProbe());}
    return checks;
}
