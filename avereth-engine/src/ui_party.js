import {partyControls,tacticOptions} from './v4/party_actions.js';
import {partyView,membersOf} from './party.js';

// Selections belong to this chat revision. Opening or reading the panel never sends input.
export function installPartyPanel(box,{state,content,revision,blocked,send,tell}) {
    const el=(tag,parent,text)=>{
        const node=document.createElement(tag);
        if (text) node.textContent=text;
        parent.append(node);
        return node;
    };
    const panel=el('details',box);
    panel.className='avereth-shop'; panel.id='avereth-party-panel';
    const summary=el('summary',panel,'Party');
    summary.dataset.averethParty='open';
    const reason=el('div',panel);
    reason.setAttribute('role','status');
    const body=el('div',panel);
    let drawn=null;
    function draw(s=state()) {
        const members=membersOf(s), active=members.filter(m=>m.mode!=='left');
        panel.hidden=!s.party && !(s.mode==='story' && s.meta?.ruleset>=2);
        const waiting=active.filter(m=>m.mode==='wait').length;
        summary.textContent='Party · '+active.length+(waiting?' · wartend '+waiting:'');
        if (!panel.open) return;
        const stamp=revision(), why=blocked();
        const organisation=s.encounter?'Partyverwaltung nach der Begegnung.':'';
        reason.textContent=why || organisation;
        const lockControls=()=>body.querySelectorAll('button,input,select').forEach(b=>{
            b.disabled=!!why || !!organisation && !b.closest('[data-party-tactics]');
        });
        if (stamp===drawn) {
            lockControls();
            return;
        }
        drawn=stamp;
        body.replaceChildren();
        const button=(parent,label,act,ref)=>{
            const b=el('button',parent,label);
            b.type='button'; b.dataset.partyAction=act;
            if (typeof ref==='string') b.dataset.ref=ref;
            b.onclick=()=>{
                if (revision()!==stamp) {draw();tell('Die Welt hat sich geändert. Auswahl prüfen.');return;}
                const message=blocked() || (act!=='tactic' && organisation);
                if (message) {reason.textContent=message;return;}
                const value=typeof ref==='function'?ref():ref;
                if (value===null) {reason.textContent='Bitte zuerst eine Auswahl treffen.';return;}
                panel.open=false;
                send(['#party',act,value].filter(Boolean).join(' '));
            };
            return b;
        };
        for (const m of members) {
            const detail=el('details',body), lines=partyView(s,content(),false,m.who);
            el('summary',detail,lines.shift() || m.who);
            for (const line of lines) el('div',detail,line);
            const options=tacticOptions(s,m.who);
            if (!options.length) continue;
            const tactics=el('details',detail);tactics.dataset.partyTactics='';
            el('summary',tactics,'Taktik anfragen');
            const select=el('select',tactics);
            select.setAttribute('aria-label','Taktik für '+s.entities[m.who].name);
            for(const o of options) el('option',select,o.label).value=[m.who,o.kind,o.target].filter(Boolean).join(' ');
            button(tactics,s.encounter?'Fragen und eigenen Zug abwarten':'Gefährten fragen','tactic',()=>select.value);
        }
        const actions=partyControls(s);
        if (!actions.length && !members.length) el('div',body,'Keine Gefährten oder verfügbaren Einladungen.');
        const candidates=actions.filter(a=>a.act==='invite');
        if(candidates.length) {
            const group=el('fieldset',body);
            el('legend',group,'Anwesende einladen');
            for (const a of candidates) {
                const label=el('label',group);
                const check=el('input',label); check.type='checkbox';check.value=a.ref;
                label.append(s.entities[a.ref].name);
            }
            button(group,'Auswahl einladen','invite',()=>[...group.querySelectorAll('input:checked')].map(i=>i.value).join(',') || null);
        }
        for(const a of actions.filter(a=>a.act!=='invite')) button(body,a.label,a.act,a.ref);
        lockControls();
    }
    panel.ontoggle=()=>{ if (panel.open) draw(); else drawn=null; };
    return {draw,update(){if(panel.open) draw();},open(){panel.hidden=false;panel.open=true;draw();}};
}
