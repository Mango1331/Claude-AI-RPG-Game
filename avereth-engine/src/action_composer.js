import {availableActions,validateActionSelection,actionPrefix,actionInputOf,actionLabel,actionBands} from './action_input.js';
import {chatOrigin,originKey} from './v4/action_persistence.js';

// A single typed draft and ST send path; the current combat panel is its input surface.
export function installActionComposer({context,state,content,enabled,settings,blocked,save,retry,status}) {
    const drafts=new Map();let capture=null,binding=null,armedUI=null,generating=false;
    const uid=()=>crypto.randomUUID(),origin=()=>chatOrigin(context());
    const key=()=>originKey(origin()),draft=()=>drafts.get(key());
    const textarea=()=>document.getElementById('send_textarea');
    const escape=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const displayInput=(m,input)=>{m.extra.display_text=`${escape(m.mes)}\n\n<small class="avereth-action-sent">${escape(input.label)} · ${input.mode==='hud_roleplay'?'Auswahl + Rollenspiel':'Auswahl und Text gemeinsam geplant'}</small>`;};
    const box=document.createElement('div');box.id='avereth-action-composer';box.className='avereth-action-composer';
    box.innerHTML=`<div id="avereth-action-home"></div><div><span id="avereth-action-status" role="status"></span> <button id="avereth-action-retry" type="button" hidden>Abschluss prüfen / fortsetzen</button></div>`;
    const area=textarea();if(!area)return null;area.closest('#send_form')?.prepend(box);
    const controls=document.createElement('section');controls.className='avereth-action-controls';
    controls.innerHTML=`<div id="avereth-action-choices"></div><div id="avereth-action-targets"></div>
      <label id="avereth-action-approach-label" hidden><input id="avereth-action-approach" type="checkbox"> Ein Bandschritt näher + Angriff</label>
      <div id="avereth-action-chip" hidden><span></span><button id="avereth-action-clear" type="button">Entfernen</button></div>
      <div id="avereth-action-send-row" hidden><label>Optionaler Text im ST-Eingabefeld: <select id="avereth-action-mode" aria-label="Bedeutung des Begleittexts"><option value="hud_free">Auch Handlungen im Text berücksichtigen</option><option value="hud_roleplay">Text ist nur Rollenspiel</option></select></label><button id="avereth-action-send" type="button">Aktion senden</button></div>
      <button id="avereth-action-revise" type="button" hidden>Ungebuchte Eingabe: nur Auswahl mit Rollenspiel ausführen</button>`;
    box.querySelector('#avereth-action-home').append(controls);
    const chip=controls.querySelector('#avereth-action-chip'),mode=controls.querySelector('#avereth-action-mode'),approach=controls.querySelector('#avereth-action-approach');
    const tell=text=>{box.querySelector('#avereth-action-status').textContent=text;};
    let options=[],targets=[],choice={},controlsOrigin=null,activePanel=null;
    const clearControls=()=>{choice={};approach.checked=false;};
    function updateStatus(){
        const v=status(),text=typeof v==='string'?v:v.text;
        tell(blocked() || text);
        box.querySelector('#avereth-action-retry').hidden=typeof v==='string' || !v.retry;
        controls.querySelector('#avereth-action-send').disabled=generating || !!blocked();
    }
    function refresh(){
        box.hidden=!enabled();controls.hidden=box.hidden;if(box.hidden)return;
        const owner=key();if(controlsOrigin!==owner){clearControls();controlsOrigin=owner;}
        const s=state(),projected=availableActions(s,content());options=projected.actions;targets=projected.targets;
        const panels=[...document.querySelectorAll('#chat :is(.avereth-combat-hud,.custom-avereth-combat-hud)')];
        activePanel=s.encounter?panels.at(-1):null;
        // Historical panels remain history, never additional input surfaces.
        for(const p of panels)p.querySelectorAll('[data-avereth-select-skill],[data-avereth-select-target]').forEach(b=>b.disabled=p!==activePanel);
        const home=activePanel || box.querySelector('#avereth-action-home');if(controls.parentNode!==home)home.append(controls);
        const button=(a)=>`<button type="button" data-avereth-action="${escape(a.key)}" aria-pressed="${choice.action===a.key}">${escape(a.label)}</button>`;
        const items=options.filter(a=>a.kind==='use');
        const actions=options.filter(a=>a.kind!=='use' && (!activePanel || a.kind==='move'));
        controls.querySelector('#avereth-action-choices').innerHTML=`${projected.tactical?`<div class="avereth-action-buttons">${actions.map(button).join('')}</div>`:''}${items.length?`<details><summary>Gegenstände</summary><div class="avereth-action-buttons">${items.map(button).join('')}</div></details>`:''}${!projected.tactical && targets.length?`<details><summary>Weitere Aktionen / Ziele</summary><div class="avereth-action-buttons">${actions.map(button).join('')}</div></details>`:''}`;
        const a=options.find(a=>a.key===choice.action);
        controls.querySelector('#avereth-action-approach-label').hidden=a?.kind!=='attack';
        let aims='';
        if(a?.area){
            const bands=actionBands({id:'preview',kind:a.kind,skill:a.skill,approach:approach.checked},s,content());
            aims=bands.map(b=>`<button type="button" data-avereth-band="${b.band}" aria-pressed="${choice.band===b.band}">${b.band} · ${b.targets.map(id=>escape(actionLabel(s,content(),id))).join(', ')}</button>`).join('');
        } else if(!activePanel && (a?.needsTarget || projected.tactical)){
            aims=targets.filter(t=>projected.tactical?t.hostile || t.id===choice.target:true).map(t=>`<button type="button" data-avereth-aim="${escape(t.id)}" aria-pressed="${choice.target===t.id}">${escape(t.label)} · ${escape(t.band || '')}</button>`).join('');
        }
        controls.querySelector('#avereth-action-targets').innerHTML=aims;
        const d=draft();chip.hidden=!d;controls.querySelector('#avereth-action-send-row').hidden=!d;
        if(d){chip.querySelector('span').textContent=d.label;mode.value=d.mode;}
        const c=context(),u=c.chat.findLastIndex(m=>m.is_user),r=c.chat[u]?.extra?.avereth;
        controls.querySelector('#avereth-action-revise').hidden=!(d && r?.action_error && !r.events?.length);
        activePanel?.querySelectorAll('[data-avereth-select-skill]').forEach(b=>b.setAttribute('aria-pressed',String(choice.action===`skill:${b.dataset.averethSelectSkill}`)));
        activePanel?.querySelectorAll('[data-avereth-select-target]').forEach(b=>b.setAttribute('aria-pressed',String(choice.target===b.dataset.averethSelectTarget)));
        updateStatus();
    }
    function selectChoice(){
        drafts.delete(key());
        const a=options.find(a=>a.key===choice.action);if(!a){refresh();return;}
        const {kind,skill,object,dir}=a;
        const selection={id:uid(),kind,...(skill?{skill}:{}),...(object?{object}:{}),...(dir?{dir}:{})};
        if(kind==='attack')selection.approach=approach.checked;
        if(a.area){
            const band=actionBands(selection,state(),content()).find(b=>b.band===choice.band);
            if(!band){refresh();return;}selection.target=band.target;selection.band=band.band;
        }else if(a.needsTarget){if(!choice.target){refresh();return;}selection.target=choice.target;}
        const check=validateActionSelection(selection,state(),content());
        if(!check.ok){refresh();tell(check.reason);return;}
        const affected=check.preview?.targets || [];
        const label=a.label+(selection.band?` → ${selection.band}`:selection.target?` → ${actionLabel(state(),content(),selection.target)}`:'')+(selection.approach?' · ein Schritt näher':'')+(affected.length>1?` · trifft: ${affected.map(id=>actionLabel(state(),content(),id)).join(', ')}`:'');
        drafts.set(key(),{selection,label,mode:settings().actionTextMode || 'hud_free',base_revision:actionPrefix(context().chat)});refresh();
    }
    mode.onchange=()=>{const d=draft();if(d){d.mode=mode.value;settings().actionTextMode=mode.value;context().saveSettingsDebounced();refresh();}};
    approach.onchange=selectChoice;
    controls.querySelector('#avereth-action-clear').onclick=()=>{drafts.delete(key());clearControls();refresh();};
    controls.querySelector('#avereth-action-send').onclick=()=>{if(draft() && !generating && !blocked())document.getElementById('send_but')?.click();};
    box.querySelector('#avereth-action-retry').onclick=async()=>{try{await retry();refresh();}catch(e){tell(e.message);}};
    controls.querySelector('#avereth-action-revise').onclick=async()=>{
        try {
            const c=context(),d=draft(),u=c.chat.findLastIndex(m=>m.is_user),m=c.chat[u],r=m?.extra?.avereth,old=actionInputOf(m);
            if(!d || !old || !r?.action_error || r.events?.length || c.chat.slice(u+1).some(m=>m.extra?.avereth?.events?.length))throw new Error('Nur die letzte noch ungebuchte Auswahl kann hier ersetzt werden');
            const check=validateActionSelection(d.selection,state(),content());if(!check.ok)throw new Error(check.reason);
            m.extra.avereth_action_input={...old,revision:old.revision+1,text:m.mes,mode:'hud_roleplay',selection:structuredClone(d.selection),label:d.label,base_revision:actionPrefix(c.chat,u)};
            displayInput(m,m.extra.avereth_action_input);
            const owner=key();while(c.chat.at(-1)?.extra?.avereth_notice_for===u)c.chat.pop();
            await save(c);drafts.delete(owner);
            if(key()!==owner)throw new Error('Ursprungschat hat gewechselt');
            await c.reloadCurrentChat();if(key()!==owner)throw new Error('Ursprungschat hat gewechselt');
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
        armedUI={origin:origin(),type:'normal',blocked:null};
        const d=draft();if(d && !textarea().value.trim()){textarea().value=d.label;armedUI.generatedLabel=d.label;}
    }
    document.addEventListener('click',intercept,true);document.addEventListener('keydown',intercept,true);
    document.addEventListener('click',event=>{
        if(!enabled())return;
        const quest=event.target.closest?.('[data-avereth-quest]');
        if(quest && quest.closest('#chat')){
            event.preventDefault();
            if(blocked() || generating){tell(blocked() || 'Erzählung läuft');return;}
            if(draft()){tell('Eine Aktion ist bereits gewählt. Erst senden oder entfernen.');return;}
            const selection={id:uid(),kind:'quest.accept',quest:quest.dataset.averethQuest},check=validateActionSelection(selection,state(),content());
            if(!check.ok){tell(check.reason);return;}
            drafts.set(key(),{selection,label:`Annehmen: ${state().quests[selection.quest].title}`,mode:settings().actionTextMode || 'hud_free',base_revision:actionPrefix(context().chat)});
            refresh();if(!textarea().value.trim())document.getElementById('send_but')?.click();return;
        }
        const skill=event.target.closest?.('[data-avereth-select-skill]'),aim=event.target.closest?.('[data-avereth-select-target]'),action=event.target.closest?.('[data-avereth-action]'),target=event.target.closest?.('[data-avereth-aim]'),band=event.target.closest?.('[data-avereth-band]');
        if(!skill && !aim && !action && !target && !band)return;
        if((skill || aim) && (!activePanel || !(skill || aim).closest(':is(.avereth-combat-hud,.custom-avereth-combat-hud)')?.isSameNode(activePanel)))return;
        if((action || target || band) && !controls.contains(action || target || band))return;
        event.preventDefault();
        if(skill || action){choice.action=skill?`skill:${skill.dataset.averethSelectSkill}`:action.dataset.averethAction;choice.band=null;}
        if(aim || target){choice.target=aim?aim.dataset.averethSelectTarget:target.dataset.averethAim;}
        if(band)choice.band=band.dataset.averethBand;
        selectChoice();
    });
    function started(type,params,dryRun){
        if(dryRun || !enabled())return;
        generating=true;capture=armedUI || {origin:origin(),type:type || 'normal',blocked:null};armedUI=null;updateStatus();
    }
    function reserve(type,params,dryRun){
        if(dryRun || !enabled() || type && type!=='normal')return;
        if(!capture || originKey(capture.origin)!==key()){if(capture)capture.blocked='Ursprungschat hat gewechselt';return;}
        capture.blocked=refusal();if(capture.blocked){tell(capture.blocked);return;}
        const d=draft();if(!d)return;
        if(!textarea().value.trim()){textarea().value=d.label;capture.generatedLabel=d.label;}
        const c=context(),text=textarea().value;
        const input={v:1,id:uid(),revision:1,origin:{...origin(),campaign:c.chat[0]?.extra?.avereth?.events?.find(e=>e.t==='campaign.started')?.d?.seed},base_revision:d.base_revision,
            encounter:state().encounter?.id || null,mode:capture.generatedLabel===text?'hud_roleplay':d.mode,selection:structuredClone(d.selection),text,label:d.label};
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
    c.eventSource.on(e.GENERATION_ENDED,()=>{generating=false;updateStatus();});
    c.eventSource.on(e.GENERATION_STARTED,started);c.eventSource.on(e.GENERATION_AFTER_COMMANDS,reserve);c.eventSource.on(e.MESSAGE_SENT,bind);
    // Reload may finish only an exact persisted reservation. No draft is inferred from an arbitrary user message.
    async function resume(){try{if(context().chatMetadata.pending_action_input)await bind(context().chatMetadata.pending_action_input.index);refresh();}catch(e){tell(e.message);}}
    return {refresh,updateStatus,guard,resume,invalidate:reason=>{if(capture)capture.blocked=reason;if(armedUI)armedUI.blocked=reason;},inspect:()=>({capture,binding:!!binding}),selected:()=>draft()};
}
