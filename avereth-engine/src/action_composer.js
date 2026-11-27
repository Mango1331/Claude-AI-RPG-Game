import { knownRoutes } from './v4/known_routes.js';
import { partyControls } from './v4/party_actions.js';
import { partyView } from './party.js';
import {availableActions,validateActionSelection,actionPrefix,actionInputOf,actionLabel,actionBands} from './action_input.js';
import {surrenderAssets,negotiators,describeTerms} from './v4/surrender.js';
import {skillOf} from './content.js';
import {combatSlot} from './combat.js';
import {installTradePanel} from './ui_trade.js';
import {chatOrigin,originKey} from './v4/action_persistence.js';

// A single typed draft and ST send path; the current combat panel is its input surface.
export function installActionComposer({context,state,content,enabled,settings,blocked,save,retry,status}) {
    const drafts=new Map();let capture=null,binding=null,armedUI=null,generating=false;
    const uid=()=>crypto.randomUUID(),origin=()=>chatOrigin(context());
    const key=()=>originKey(origin()),draft=()=>drafts.get(key());
    const textarea=()=>document.getElementById('send_textarea');
    const escape=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const displayInput=(m,input)=>{
        const included = m.mes === input.label || m.mes.startsWith(input.label + '\n');
        const mode = input.mode === 'hud_roleplay' ? 'Auswahl + Rollenspiel' : 'Auswahl und Text gemeinsam geplant';
        m.extra.display_text = escape(m.mes) + '\n\n<small class="avereth-action-sent">'
            + (included ? '' : escape(input.label) + ' · ') + mode + '</small>';
    };
    const box=document.createElement('div');box.id='avereth-action-composer';box.className='avereth-action-composer';
    box.innerHTML=`<div id="avereth-action-home"></div><div><span id="avereth-action-status" role="status"></span> <button id="avereth-action-retry" type="button" hidden>Abschluss prüfen / fortsetzen</button></div>`;
    const area=textarea();if(!area)return null;area.closest('#send_form')?.prepend(box);
    const controls=document.createElement('section');controls.className='avereth-action-controls';
    controls.innerHTML=`<div id="avereth-action-choices"></div><div id="avereth-action-targets"></div>
      <div id="avereth-negotiation-status" role="status"></div><fieldset id="avereth-surrender-terms" hidden><legend>Angebot</legend></fieldset>
      <label id="avereth-mobility-label" hidden>Bewegungsrichtung <select id="avereth-mobility-dir"><option value="away">Zurück</option><option value="closer">Näher</option></select></label>
      <div id="avereth-phase-controls" hidden><select id="avereth-minor" aria-label="Nebenaktion"></select>
        <button type="button" id="avereth-order" aria-label="Reihenfolge umkehren" hidden>⇄ Tauschen</button></div>
      <div id="avereth-action-chip" hidden><span role="status"></span><button id="avereth-action-clear" type="button">Entfernen</button></div>
      <div id="avereth-action-send-row" hidden><label>Optionaler Text im ST-Eingabefeld: <select id="avereth-action-mode" aria-label="Bedeutung des Begleittexts"><option value="hud_free">Auch Handlungen im Text berücksichtigen</option><option value="hud_roleplay">Text ist nur Rollenspiel</option></select></label><button id="avereth-action-send" type="button">Aktion senden</button></div>
      <button id="avereth-action-revise" type="button" hidden>Ungebuchte Eingabe: nur Auswahl mit Rollenspiel ausführen</button>`;
    box.querySelector('#avereth-action-home').append(controls);
    const chip=controls.querySelector('#avereth-action-chip'),mode=controls.querySelector('#avereth-action-mode');
    const tell=text=>{box.querySelector('#avereth-action-status').textContent=text;};
    let options=[],targets=[],choice={},controlsOrigin=null,activePanel=null;
    const minor = controls.querySelector('#avereth-minor'), order = controls.querySelector('#avereth-order');
    const clearControls=()=>{choice={};minor.value='';direction.value='away';};
    const direction = controls.querySelector('#avereth-mobility-dir');
    function minorChoices() {
        return options.filter(a=>combatSlot(a,content(),state())==='minor').flatMap(a=>a.skill
            ? ['away','closer'].map(dir=>({...a,key:a.key+':'+dir,dir,label:a.label+(dir==='away'?' · zurück':' · näher')})) : [a]);
    }
    function compose(s) {
        const m=minorChoices().find(a=>a.key===minor.value);
        if (s.kind==='negotiation_answer' || !m || combatSlot(s,content(),state())!=='major') return s;
        const step={kind:m.kind,id:uid(),...(m.skill?{skill:m.skill}:{}),
            ...(m.kind==='move' || m.skill ? {dir:m.dir || 'away',target:m.dir==='closer'?s.target || choice.target:null} : {})};
        if (m.dir==='closer' && !step.target) return null;
        return {id:s.id,kind:'phase',steps:choice.minorFirst?[step,s]:[s,step]};
    }
    function bands(s) {
        if (!minor.value) return actionBands(s,state(),content());
        const rows=[];
        for (const t of targets.filter(t=>t.hostile)) {
            if (rows.some(r=>r.band===t.band)) continue;
            const phase=compose({...s,target:t.id,band:t.band});
            const v=phase && validateActionSelection(phase,state(),content());
            if (v?.ok) rows.push({band:t.band,at:v.preview.band,target:t.id,targets:v.preview.targets || [t.id]});
        }
        return rows;
    }
    const tradeRevision = () => key() + '|' + actionPrefix(context().chat);
    const rest = document.createElement('details');
    rest.id = 'avereth-rest'; rest.className = 'avereth-shop';
    rest.innerHTML = '<summary>Rasten</summary><select aria-label="Rastdauer"><option value="30">30 Minuten</option><option value="60">1 Stunde</option><option value="120">2 Stunden</option><option value="">Eigene Dauer</option></select> <input aria-label="Rastdauer in Minuten" type="number" min="1" max="1440" value="30" hidden> <button type="button" aria-describedby="avereth-rest-reason">Rast beginnen</button> <span id="avereth-rest-reason" role="status"></span>';
    box.append(rest);
    const routes=document.createElement('details');
    routes.innerHTML='<summary>Bekannte Wege</summary>';
    box.append(routes);
    function drawRoutes(s) {
        routes.querySelectorAll('button').forEach(b=>b.remove());
        const ids=knownRoutes(s);
        routes.hidden=!ids.length || !canRestHere(s);
        const stamp=actionPrefix(context().chat), owner=key();
        for (const id of ids) {
            const b=document.createElement('button');
            b.type='button';b.textContent=s.places[id].name;
            b.onclick=()=>{
                if (owner!==key() || stamp!==actionPrefix(context().chat) || blocked() || generating || draft() || textarea().value.trim() || textarea().disabled || textarea().readOnly) return tell('Ort oder Eingabe prüfen.');
                textarea().value='#go '+id;
                textarea().dispatchEvent(new Event('input',{bubbles:true}));
                document.getElementById('send_but')?.click();
            };
            routes.append(b);
        }
    }
    const duration = rest.querySelector('select'), minutes = rest.querySelector('input');
    const startRest = rest.querySelector('button');
    const restReason = rest.querySelector('#avereth-rest-reason');
    const restMinutes = () => duration.value ? Number(duration.value) : minutes.valueAsNumber;
    const canRestHere = s => !!s.entities.pc?.sheet && s.entities.pc.status !== 'dead'
        && s.mode !== 'creation' && !s.encounter && !s.pending_combat?.length;
    function updateRest() {
        const field = textarea(), selected = draft(), n = restMinutes();
        const reason = blocked() || (generating && 'Erzählung läuft.')
            || (selected && 'Vorbereitete Aktion zuerst senden oder entfernen: ' + selected.label)
            || ((field.disabled || field.readOnly) && 'Das Eingabefeld ist gesperrt.')
            || (field.value.trim() && 'Eingabetext zuerst senden oder leeren.')
            || ((!Number.isInteger(n) || n < 1 || n > 1440) && 'Eine Rastdauer von 1 bis 1440 Minuten wählen.') || '';
        startRest.disabled = !!reason;
        restReason.textContent = reason;
        return reason;
    }
    duration.onchange = () => { minutes.hidden = !!duration.value; updateRest(); };
    minutes.oninput = updateRest;
    area.addEventListener('input', updateRest);
    new MutationObserver(updateRest).observe(area, {attributes:true, attributeFilter:['disabled','readonly']});
    startRest.onclick = () => {
        if (!canRestHere(state()) || updateRest()) return;
        const field = textarea();
        field.value = '#rest ' + restMinutes();
        field.dispatchEvent(new Event('input', {bubbles:true}));
        document.getElementById('send_but')?.click();
    };
    const refreshTrade = installTradePanel(box, {
        revision: tradeRevision, live: state, notice: tell,
        draftText(text, system = false) {
            const field = textarea();
            if (draft() || field.disabled || field.readOnly || (system && field.value.trim()) || /^\s*[#/]/.test(field.value)) {
                tell('Vorhandene Eingabe oder Auswahl zuerst abschließen.'); return;
            }
            field.value = [text, field.value.trim()].filter(Boolean).join('\n');
            field.dispatchEvent(new Event('input',{bubbles:true})); field.focus();
        },
        submit(result, stamp, companion) {
            const field = textarea(), extra = field.value.trim();
            if (draft() || field.disabled || field.readOnly || generating || blocked() || stamp !== tradeRevision() || /^\s*[#/]/.test(extra)) {
                tell(blocked() || 'Zug läuft oder die Auswahl muss erneuert werden.'); return;
            }
            const settling = result.selection.kind === 'trade.accept';
            if (settling && extra && !companion) {
                tell('Bedingungen als freien Text vorbereiten. Für einen festen Abschluss den Zusatz als Begleitrede bestätigen.'); return;
            }
            const text = [result.label, extra].filter(Boolean).join('\n');
            const selection = {...result.selection, id:uid()};
            drafts.set(key(), {selection, label:result.label, expectedText:text, base_revision:actionPrefix(context().chat),
                mode:!extra || companion ? 'hud_roleplay' : 'hud_free'});
            field.value = text;
            field.dispatchEvent(new Event('input',{bubbles:true}));
            refresh(); document.getElementById('send_but')?.click();
        },
    });
    function updateStatus(){
        updateRest();
        const v=status(),text=typeof v==='string'?v:v.text;
        tell(blocked() || text);
        box.querySelector('#avereth-action-retry').hidden=typeof v==='string' || !v.retry;
        controls.querySelector('#avereth-action-send').disabled=generating || !!blocked();
    }
    function refresh(){
        box.hidden=!enabled();controls.hidden=box.hidden;if(box.hidden)return;
        const owner=key();if(controlsOrigin!==owner){clearControls();controlsOrigin=owner;}
        const s=state(),projected=availableActions(s,content());options=projected.actions;targets=projected.targets;
        drawRoutes(s);
        rest.hidden = !canRestHere(s);
        refreshTrade(s,content());
        const panels=[...document.querySelectorAll('#chat :is(.avereth-combat-hud,.custom-avereth-combat-hud)')];
        activePanel=s.encounter?panels.at(-1):null;
        // Historical panels remain history, never additional input surfaces.
        for(const p of panels)p.querySelectorAll('[data-avereth-select-skill],[data-avereth-select-target]').forEach(b=>b.disabled=p!==activePanel);
        const home=activePanel || box.querySelector('#avereth-action-home');if(controls.parentNode!==home)home.append(controls);
        const button=(a)=>`<button type="button" data-avereth-action="${escape(a.key)}" aria-pressed="${choice.action===a.key}">${escape(a.label)}</button>`;
        const items=options.filter(a=>a.kind==='use');
        const actions=options.filter(a=>a.kind!=='use' && (s.encounter || a.kind==='attack') && (!activePanel || ['move','flee','sidestep','surrender','negotiation_answer'].includes(a.kind)));
        controls.querySelector('#avereth-action-choices').innerHTML=`${projected.tactical?`<div class="avereth-action-buttons">${actions.map(button).join('')}</div>`:''}${items.length?`<details><summary>Gegenstände</summary><div class="avereth-action-buttons">${items.map(button).join('')}</div></details>`:''}${!projected.tactical && targets.length?`<details><summary>Weitere Aktionen / Ziele</summary><div class="avereth-action-buttons">${actions.map(button).join('')}</div></details>`:''}`;
        const a=options.find(a=>a.key===choice.action);
        const offer=controls.querySelector('#avereth-surrender-terms');
        offer.hidden=a?.kind!=='surrender';
        if (!offer.hidden) {
            const recipients=negotiators(s).map(n=>new Option(n.label || n.name,n.id));
            const who=document.createElement('select');
            who.setAttribute('aria-label','Verhandlungspartner');
            who.replaceChildren(new Option('Anwesende ansprechen',''),...recipients);
            who.value=choice.recipient || '';
            who.onchange=()=>{choice.recipient=who.value;selectChoice();};
            offer.replaceChildren(Object.assign(document.createElement('legend'),{textContent:'Angebot'}),who);
            for (const asset of surrenderAssets(s,content())) {
                const label=document.createElement('label');
                label.append(asset.name+(asset.slot?' (ausgerüstet)':'')+' · verfügbar '+asset.qty+' ');
                const qty=document.createElement('input');
                Object.assign(qty,{type:'number',min:'0',step:'1',max:String(asset.qty),value:String(choice.quantities?.[asset.object] ?? 0)});
                qty.dataset.averethAsset=asset.object;
                qty.onchange=()=>{(choice.quantities ||= {})[asset.object]=qty.valueAsNumber;selectChoice();};
                label.append(qty);offer.append(label);
            }
        }
        const negotiation=s.encounter?.negotiation;
        let statusText=negotiation?'Antwort auf das Angebot steht aus.':'';
        if (negotiation?.reply) {
            const reply=negotiation.reply, assets=surrenderAssets(s,content());
            const terms=reply.terms.map(l=>({...l,name:[...assets,...negotiation.released].find(a=>a.object===l.object)?.name}));
            statusText=actionLabel(s,content(),reply.speaker)+' · '+reply.evidence+
                ' · Forderung '+(terms.length?describeTerms(terms):'ohne Gegenleistung');
            if (negotiation.released.length) statusText+=' · Bereits herausgegeben '+describeTerms(negotiation.released);
        }
        controls.querySelector('#avereth-negotiation-status').textContent=statusText;
        const mobility=a?.kind==='skill' && combatSlot(a,content(),s)==='minor';
        controls.querySelector('#avereth-mobility-label').hidden=!mobility;
        const allowMinor=projected.tactical && a && a.kind!=='negotiation_answer' && (s.encounter || a.kind==='attack' || a.kind==='use' && a.needsTarget) && combatSlot(a,content(),s)==='major';
        controls.querySelector('#avereth-phase-controls').hidden=!allowMinor;
        const prior=minor.value;
        minor.replaceChildren(new Option('Keine Nebenaktion',''));
        if (allowMinor) for (const m of minorChoices()) minor.add(new Option(m.kind==='sidestep'?'Ausweichen · Distanzschutz':m.label,m.key));
        minor.value=[...minor.options].some(o=>o.value===prior)?prior:'';
        order.hidden=!minor.value;
        if (!minor.value) choice.minorFirst=false;
        order.setAttribute('aria-pressed',String(!!choice.minorFirst));
        let aims='';
        if(a?.area){
            const choices=bands({id:'preview',kind:a.kind,skill:a.skill,approach:false});
            aims=choices.map(b=>`<button type="button" data-avereth-band="${b.band}" aria-pressed="${choice.band===b.band}">${b.band}${b.at && b.at!==b.band?' → '+b.at:''} · ${b.targets.map(id=>escape(actionLabel(s,content(),id))).join(', ')}</button>`).join('');
        } else if(!activePanel && (a?.needsTarget || projected.tactical)){
            aims=targets.filter(t=>projected.tactical?t.hostile || t.id===choice.target:true).map(t=>`<button type="button" data-avereth-aim="${escape(t.id)}" aria-pressed="${choice.target===t.id}">${escape(t.label)} · ${escape(t.band || '')}</button>`).join('');
        }
        controls.querySelector('#avereth-action-targets').innerHTML=aims;
        const d=draft();chip.hidden=!d && !choice.hint;controls.querySelector('#avereth-action-send-row').hidden=!d;
        chip.querySelector('span').textContent=d?.label || choice.hint || '';
        if(d)mode.value=d.mode;
        const c=context(),u=c.chat.findLastIndex(m=>m.is_user),r=c.chat[u]?.extra?.avereth;
        controls.querySelector('#avereth-action-revise').hidden=!(d && r?.action_error && !r.events?.length);
        activePanel?.querySelectorAll('[data-avereth-select-skill]').forEach(b=>b.setAttribute('aria-pressed',String(choice.action===`skill:${b.dataset.averethSelectSkill}`)));
        activePanel?.querySelectorAll('[data-avereth-select-target]').forEach(b=>b.setAttribute('aria-pressed',String(choice.target===b.dataset.averethSelectTarget)));
        updateStatus();
    }
    function selectChoice(){
        drafts.delete(key());
        choice.hint='';
        function explain(message) {
            choice.hint=message;
            refresh();
        }
        const a=options.find(a=>a.key===choice.action);if(!a){refresh();return;}
        const {kind,skill,object,dir}=a;
        let selection={id:uid(),kind,...(skill?{skill}:{}),...(object?{object}:{}),...(dir?{dir}:{})};
        if(a.together) selection.together=true;
        if(kind==='surrender') {
            if(a.group) selection.group=true;
            selection.target=choice.recipient || null;
            selection.terms=Object.entries(choice.quantities || {}).filter(([,qty])=>qty!==0).map(([object,qty])=>({object,qty,mode:'offer'}));
        }
        if(kind==='negotiation_answer')selection.accept=a.accept;
        if(kind==='attack')selection.approach=false;
        if(kind==='skill' && combatSlot(a,content(),state())==='minor') {
            selection.dir=direction.value;
            if(choice.target)selection.target=choice.target;
        }
        if(a.area){
            const available=bands(selection);
            const band=available.find(b=>b.band===choice.band);
            if (!band) {
                const anchor=targets.find(t=>t.hostile && t.band===choice.band) || (!available.length && targets.find(t=>t.hostile));
                const attempted=anchor && compose({...selection, target:anchor.id, band:anchor.band});
                const reason=attempted && validateActionSelection(attempted,state(),content()).reason;
                return explain(reason || (available.length?'Angriffsband wählen.':'Kein erreichbares Angriffsband.'));
            }
            selection.target=band.target;selection.band=band.band;
        }else if(a.needsTarget){if(!choice.target)return explain('Aktionsziel wählen.');selection.target=choice.target;}
        const main=selection;
        selection=compose(main);
        if (!selection) return explain('Ziel für die Annäherung wählen.');
        const check=validateActionSelection(selection,state(),content());
        if(!check.ok)return explain(check.reason);
        const affected=check.preview?.targets || [];
        let label=a.label+(main.band?` → ${main.band}`:main.target?` → ${actionLabel(state(),content(),main.target)}`:'')+(affected.length>1?` · trifft: ${affected.map(id=>actionLabel(state(),content(),id)).join(', ')}`:'');
        if(a.kind==='surrender'){
            const assets=surrenderAssets(state(),content());
            label+=' · '+(main.terms.map(l=>l.qty+' × '+assets.find(a=>a.object===l.object).name).join(' + ') || 'ohne Gegenleistung');
        }
        if(a.kind==='skill' && main.dir)label+=main.dir==='away'?' · zurück':' · näher';
        if(selection.kind==='phase') {
            const m=minorChoices().find(o=>o.key===minor.value);
            const second=m.label+(m.dir==='closer' && !main.target?' → '+actionLabel(state(),content(),choice.target):'');
            if (check.preview.band && main.band && check.preview.band!==main.band) label+=' · Angriffsband '+check.preview.band;
            label=choice.minorFirst?second+' → '+label:label+' → '+second;
            if(check.preview.costs.length) label+=' · '+check.preview.costs.map(c=>c.amount+' '+c.resource.toUpperCase()).join(' + ');
        } else if(check.preview.cost && a.skill) {
            const resource=skillOf(content(),a.skill,state())?.cost?.resource;
            if(resource)label+=' · '+check.preview.cost+' '+resource.toUpperCase();
        }
        drafts.set(key(),{selection,label,mode:settings().actionTextMode || 'hud_free',base_revision:actionPrefix(context().chat)});refresh();
    }
    mode.onchange=()=>{const d=draft();if(d){d.mode=mode.value;settings().actionTextMode=mode.value;context().saveSettingsDebounced();refresh();}};
    direction.onchange=selectChoice;
    minor.onchange=()=>{if(!minor.value)choice.minorFirst=false;selectChoice();};
    order.onclick=()=>{choice.minorFirst=!choice.minorFirst;selectChoice();};
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
    function openParty() {
        let panel = document.getElementById('avereth-party-panel');
        if (!panel) {
            panel = document.createElement('dialog');
            panel.id = 'avereth-party-panel';
            const details = document.createElement('pre');
            const close = document.createElement('button');
            close.type = 'button'; close.textContent = 'Schließen';
            close.onclick = () => panel.close();
            const controls=document.createElement('div');
            controls.className='avereth-party-controls';
            panel.append(details,controls,close); document.body.append(panel);
        }
        const lines = partyView(state(),content());
        panel.querySelector('pre').textContent = ['[PARTY]',...lines.length ? lines : ['Keine Gefährten oder offenen Abreden.']].join('\n');
        const owner=key(), revision=actionPrefix(context().chat), controls=panel.querySelector('.avereth-party-controls');
        controls.replaceChildren();
        for(const action of partyControls(state())){
            const button=document.createElement('button');
            button.type='button';button.textContent=action.label;button.dataset.partyAction=action.act;button.dataset.ref=action.ref;
            const unavailable=()=>blocked() || (generating?'Erzählung läuft':null) ||
                (state().encounter || state().pending_combat?.length?'Begegnung zuerst abschließen':null) ||
                (draft() || textarea().value.trim()?'Vorbereitete Eingabe zuerst senden oder entfernen':null);
            const reason=unavailable();
            if(reason){button.disabled=true;button.title=reason;}
            button.onclick=()=>{
                if(owner!==key() || actionPrefix(context().chat)!==revision){panel.close();tell('Die Welt hat sich geändert. Party erneut öffnen.');return;}
                const why=unavailable();if(why){tell(why);return;}
                panel.close();
                textarea().value=['#party',action.act,action.ref].filter(Boolean).join(' ');
                textarea().dispatchEvent(new Event('input',{bubbles:true}));
                document.getElementById('send_but')?.click();
            };
            controls.append(button);
        }
        if (!panel.open) panel.showModal();
    }
    function refusal(){
        const block=blocked();if(block)return block;
        const d=draft();if(!d)return choice.hint || null;
        if(/^\s*[#/]/.test(textarea().value))return 'Systembefehl: Auswahl zuerst entfernen';
        if(d.expectedText !== undefined && d.expectedText !== textarea().value)return 'Handelstext geändert. Bitte Auswahl entfernen und neu bestätigen.';
        if(d.base_revision!==actionPrefix(context().chat))return 'Die Welt hat sich geändert. Aktion erneut auswählen.';
        const valid=validateActionSelection(d.selection,state(),content());return valid.ok?null:valid.reason;
    }
    function intercept(e){
        if(!enabled())return;
        if (e.type==='click' && e.target.closest?.('[data-avereth-party]')?.closest('#chat')) {
            e.preventDefault();e.stopImmediatePropagation();openParty();return;
        }
        const send=e.type==='click'?e.target.closest?.('#send_but'):e.target===textarea() && e.key==='Enter' && !e.shiftKey && !e.isComposing;
        if(!send)return;
        if (textarea().value.trim().toLowerCase()==='#party') {
            e.preventDefault(); e.stopImmediatePropagation();
            textarea().value='';
            openParty();
            return;
        }
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
        if(skill || action){
            const next=skill?`skill:${skill.dataset.averethSelectSkill}`:action.dataset.averethAction;
            if(next!==choice.action){delete choice.quantities;delete choice.recipient;minor.value='';choice.minorFirst=false;direction.value='away';}
            choice.action=next;choice.band=null;
        }
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
