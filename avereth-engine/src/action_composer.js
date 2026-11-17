import {availableActions,validateActionSelection,actionPrefix,actionInputOf} from './action_input.js';
import {chatOrigin,originKey} from './v4/action_persistence.js';

// One ST textarea, one draft per origin. This module owns only input identity and presentation.
export function installActionComposer({context,state,content,enabled,settings,blocked,save,retry,status}) {
    const drafts=new Map();let capture=null,binding=null,armedUI=null;
    const uid=()=>crypto.randomUUID(),origin=()=>chatOrigin(context());
    const key=()=>originKey(origin()),draft=()=>drafts.get(key());
    const textarea=()=>document.getElementById('send_textarea');
    const escape=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const displayInput=(m,input)=>{m.extra.display_text=`${escape(m.mes)}\n\n<small class="avereth-action-sent">${escape(input.label)} · ${input.mode==='hud_roleplay'?'H · Begleittext':'F · Freitext mit Aktionen'}</small>`;};
    const tell=text=>{document.getElementById('avereth-action-status').textContent=text;};
    const box=document.createElement('div');box.id='avereth-action-composer';box.className='avereth-action-composer';
    box.innerHTML=`<details><summary>Aktion auswählen</summary><div class="avereth-action-options">
      <select id="avereth-action-kind" aria-label="Aktion"></select><select id="avereth-action-target" aria-label="Ziel"></select>
      <label><input id="avereth-action-approach" type="checkbox"> Ein Bandschritt näher + Angriff</label>
      <button id="avereth-action-select" type="button">Auswählen</button></div></details>
      <div id="avereth-action-chip" hidden><span></span><select id="avereth-action-mode" aria-label="Textmodus"><option value="hud_free">F · Freitext mit Aktionen</option><option value="hud_roleplay">H · HUD + Begleittext</option></select><button id="avereth-action-clear" type="button">Entfernen</button></div>
      <small id="avereth-action-help">H: Die Auswahl ist die ganze mechanische Aktion; Text ist Rollenspiel. F: Auswahl und weitere Handlungen werden gemeinsam geplant.</small>
      <button id="avereth-action-revise" type="button" hidden>Letzte ungebuchte Eingabe: nur diese Auswahl ausführen (H)</button>
      <div><span id="avereth-action-status" role="status"></span> <button id="avereth-action-retry" type="button">Abschluss prüfen / fortsetzen</button></div>`;
    const area=textarea();if(!area)return null;area.closest('#send_form')?.prepend(box);
    const kind=box.querySelector('#avereth-action-kind'),target=box.querySelector('#avereth-action-target'),chip=box.querySelector('#avereth-action-chip'),mode=box.querySelector('#avereth-action-mode');
    let options=[],controlsOrigin=null;
    const clearControls=()=>{kind.value='';target.value='';box.querySelector('#avereth-action-approach').checked=false;};
    function refresh(){
        box.hidden=!enabled();if(box.hidden)return;
        const owner=key();if(controlsOrigin!==owner){clearControls();controlsOrigin=owner;}
        const projected=availableActions(state(),content());options=projected.actions;
        const selected=kind.value,aim=target.value;
        kind.replaceChildren(new Option('— Aktion wählen —',''),...options.map(o=>new Option(o.label,o.key)));
        target.replaceChildren(new Option('— Ziel wählen —',''),...projected.targets.map(o=>new Option(o.label,o.id)));
        if(options.some(o=>o.key===selected))kind.value=selected;
        if(projected.targets.some(o=>o.id===aim))target.value=aim;
        const d=draft();chip.hidden=!d;
        if(d){chip.querySelector('span').textContent=d.label;mode.value=d.mode;}
        const c=context(),u=c.chat.findLastIndex(m=>m.is_user),r=c.chat[u]?.extra?.avereth;
        box.querySelector('#avereth-action-revise').hidden=!(d && r?.action_error && !r.events?.length);
        tell(blocked() || status());
    }
    box.querySelector('#avereth-action-select').onclick=()=>{
        const a=options.find(o=>o.key===kind.value);if(!a)return;
        const {kind:k,skill,object,dir}=a;
        const selection={id:uid(),kind:k,...(skill?{skill}:{}),...(object?{object}:{}),...(dir?{dir}:{}),...(a.needsTarget?{target:target.value}:{})};
        if(k==='attack')selection.approach=box.querySelector('#avereth-action-approach').checked;
        const check=validateActionSelection(selection,state(),content());
        if(!check.ok){tell(check.reason);return;}
        const affected=(check.preview?.targets || []).map(id=>projectedLabel(id));
        const label=a.label+(a.needsTarget?` → ${target.selectedOptions[0]?.text || target.value}`:'')+(selection.approach?' · ein Schritt näher':'')+(affected.length>1?` · trifft: ${affected.join(', ')}`:'');
        drafts.set(key(),{selection,label,mode:settings().actionTextMode || 'hud_free',base_revision:actionPrefix(context().chat)});refresh();
    };
    function projectedLabel(id){const s=state();return s.encounter?.combatants[id]?.label || s.entities[id]?.name || id;}
    mode.onchange=()=>{const d=draft();if(d){d.mode=mode.value;settings().actionTextMode=mode.value;context().saveSettingsDebounced();refresh();}};
    box.querySelector('#avereth-action-clear').onclick=()=>{drafts.delete(key());clearControls();refresh();};
    box.querySelector('#avereth-action-retry').onclick=async()=>{try{await retry();refresh();}catch(e){tell(e.message);}};
    box.querySelector('#avereth-action-revise').onclick=async()=>{
        try {
            const c=context(),d=draft(),u=c.chat.findLastIndex(m=>m.is_user),m=c.chat[u],r=m?.extra?.avereth,old=actionInputOf(m);
            if(!d || !old || !r?.action_error || r.events?.length || c.chat.slice(u+1).some(m=>m.extra?.avereth?.events?.length))throw new Error('Nur die letzte noch ungebuchte Auswahl kann hier ersetzt werden');
            const check=validateActionSelection(d.selection,state(),content());if(!check.ok)throw new Error(check.reason);
            // The labelled H button is the explicit local decision, not a model repair or inferred override.
            m.extra.avereth_action_input={...old,revision:old.revision+1,text:m.mes,mode:'hud_roleplay',selection:structuredClone(d.selection),label:d.label,base_revision:actionPrefix(c.chat,u)};
            displayInput(m,m.extra.avereth_action_input);
            const owner=key();
            while(c.chat.at(-1)?.extra?.avereth_notice_for===u)c.chat.pop();
            await save(c);drafts.delete(owner);
            if(key()!==owner)throw new Error('Ursprungschat hat gewechselt');
            await c.reloadCurrentChat();
            if(key()!==owner)throw new Error('Ursprungschat hat gewechselt');
            await context().generate('regenerate');
        }catch(e){tell(e.message);}
    };
    function refusal(){
        const block=blocked();if(block)return block;
        const d=draft();if(!d)return null;
        if(/^\s*[#/]/.test(textarea().value))return 'Systembefehl: Auswahl zuerst entfernen';
        if(d.base_revision!==actionPrefix(context().chat))return 'Die Welt hat sich geändert. Aktion erneut auswählen.';
        const valid=validateActionSelection(d.selection,state(),content());return valid.ok?null:valid.reason;
    }
    function intercept(e){
        if(!enabled())return;
        const send=e.type==='click'?e.target.closest?.('#send_but'):e.target===textarea() && e.key==='Enter' && !e.shiftKey && !e.isComposing;
        if(!send)return;
        const no=refusal();if(no){e.preventDefault();e.stopImmediatePropagation();tell(no);return;}
        // Before ST's first await (unshallowCharacter), not merely GENERATION_STARTED.
        armedUI={origin:origin(),type:'normal',blocked:null};
        const d=draft();if(d && !textarea().value.trim())textarea().value=d.label;
    }
    document.addEventListener('click',intercept,true);document.addEventListener('keydown',intercept,true);
    document.addEventListener('click',event=>{
        if(!enabled())return;
        const skill=event.target.closest?.('[data-avereth-select-skill]'),aim=event.target.closest?.('[data-avereth-select-target]');
        if(!skill && !aim)return;
        event.preventDefault();refresh();box.querySelector('details').open=true;
        if(skill){const value=`skill:${skill.dataset.averethSelectSkill}`;if(!options.some(o=>o.key===value)){tell('Fähigkeit ist nicht mehr verfügbar');return;}kind.value=value;}
        if(aim){const id=aim.dataset.averethSelectTarget;if(![...target.options].some(o=>o.value===id)){tell('Ziel ist nicht mehr aktiv');return;}target.value=id;}
        const a=options.find(o=>o.key===kind.value);
        if(a && (!a.needsTarget || target.value))box.querySelector('#avereth-action-select').click();
    });
    function started(type,params,dryRun){
        if(dryRun || !enabled())return;
        capture=armedUI || {origin:origin(),type:type || 'normal',blocked:null};armedUI=null;
    }
    function reserve(type,params,dryRun){
        if(dryRun || !enabled() || type && type!=='normal')return;
        if(!capture || originKey(capture.origin)!==key()){if(capture)capture.blocked='Ursprungschat hat gewechselt';return;}
        capture.blocked=refusal();if(capture.blocked){tell(capture.blocked);return;}
        const d=draft();if(!d)return;
        if(!textarea().value.trim())textarea().value=d.label;
        const c=context(),text=textarea().value;
        const input={v:1,id:uid(),revision:1,origin:{...origin(),campaign:c.chat[0]?.extra?.avereth?.events?.find(e=>e.t==='campaign.started')?.d?.seed},base_revision:d.base_revision,
            encounter:state().encounter?.id || null,mode:d.mode,selection:structuredClone(d.selection),text,label:d.label};
        c.chatMetadata.pending_action_input={index:c.chat.length,input,expectedText:text};capture.reserved=true;
    }
    async function bind(index){
        const c=context(),owner=capture,p=c.chatMetadata.pending_action_input;if(!p)return;
        if(index!==p.index || !c.chat[index]?.is_user || c.chat[index].mes!==p.expectedText || originKey(p.input.origin)!==key() || actionPrefix(c.chat,index)!==p.input.base_revision){
            if(capture)capture.blocked='HUD-Eingabe passt nicht zur gespeicherten Nachricht; nicht ausgeführt';
            tell('Eingabebindung offen – Auswahl und Text prüfen');return;
        }
        c.chat[index].extra ||= {};c.chat[index].extra.avereth_action_input=structuredClone(p.input);
        displayInput(c.chat[index],p.input);
        delete c.chatMetadata.pending_action_input;
        const job={key:originKey(p.input.origin)};
        job.promise=save(c).then(()=>{drafts.delete(job.key);if(capture===owner && owner)owner.bound=index;if(key()===job.key){clearControls();refresh();}})
            .catch(e=>{if(capture===owner && owner)owner.blocked=e.message;throw e;}).finally(()=>{if(binding===job)binding=null;});
        binding=job;await job.promise;
    }
    async function guard(){
        if(binding?.key===key())await binding.promise;
        if(capture && (capture.blocked || originKey(capture.origin)!==key()))return capture.blocked || 'Ursprungschat hat gewechselt';
        const c=context(),p=c.chatMetadata.pending_action_input;
        if(p){await bind(p.index);if(c.chatMetadata.pending_action_input)return 'Nicht eindeutig gebundene HUD-Auswahl';}
        if(capture?.reserved && capture.bound===undefined)return 'HUD-Bindung wurde nicht bestätigt';
        return null;
    }
    const c=context(),e=c.eventTypes;
    c.eventSource.on(e.GENERATION_STARTED,started);c.eventSource.on(e.GENERATION_AFTER_COMMANDS,reserve);c.eventSource.on(e.MESSAGE_SENT,bind);
    // Reload may finish only an exact persisted reservation. No draft is inferred from an arbitrary user message.
    async function resume(){try{if(context().chatMetadata.pending_action_input)await bind(context().chatMetadata.pending_action_input.index);refresh();}catch(e){tell(e.message);}}
    return {refresh,guard,resume,invalidate:reason=>{if(capture)capture.blocked=reason;if(armedUI)armedUI.blocked=reason;},inspect:()=>({capture,binding:!!binding}),selected:()=>draft()};
}
