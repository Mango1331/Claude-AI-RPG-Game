import { loadContentPack } from './src/content.js';
import { ensureCampaign, hasStoredCampaign } from './src/host.js';
import { creationPanel } from './src/commands.js';
import { renderHud } from './src/hud.js';
import { installDraftActions } from './src/ui_actions.js';
import { configure, content, foldChat } from './gm/engine.js';
import { VERSION, copy, digest } from './gm/util.js';
import { FileStore, Journal } from './gm/storage.js';
import { Scheduler } from './gm/scheduler.js';
import { Host, Publication, sameTranscript } from './gm/host.js';
import { DynamicGM } from './gm/runtime.js';
import { createTransport } from './gm/transport.js';

const context = () => SillyTavern.getContext();
const store = new FileStore(context), host = new Host(context,store);
let busy=false, journal=null, scheduler=null, lastError=null;
const meta = () => context().chatMetadata?.averethGMAlpha;
const active = () => !!meta();
const card = () => context().characters?.[context().characterId]?.data?.extensions?.avereth_gm_alpha === 1;
const relevant = () => active() || card();
function status(text) { const el=document.querySelector('#gm-alpha-status'); if(el)el.textContent=text; const d=document.querySelector('#gm-alpha-diagnostics');if(d&&scheduler){const l=scheduler.ledger.read();d.textContent=JSON.stringify({physicalRequests:(l.closedRequests||0)+Object.values(l.leases).filter(x=>x.status!=='not_dispatched').length,requests:[...(l.diagnostics||[]),...Object.values(l.leases).map(x=>x.diagnostic||{id:x.id,status:x.status,sentAt:x.sentAt})].slice(-20)},null,2);} }
function failed(error) { lastError=error.message; status(`Angehalten: ${error.message}`); console.warn('[Avereth GM Alpha]',error.message); }
function compatible() {
    if (!navigator.locks) throw Error('Web Locks unavailable: use localhost or HTTPS in a current browser');
    if (typeof globalThis.averethInterceptor==='function') throw Error('Old Avereth extension still loaded. Disable it in Extensions, then reload ST.');
    host.target();
}
async function locked(fn) {
    if(busy)throw Error('A GM operation is already running');
    compatible();busy=true;
    try { return await navigator.locks.request('avereth-gm-alpha-global',{ifAvailable:true},async lock=>{
        if(!lock)throw Error('Another ST tab is using Avereth GM; close it or finish that turn');
        return fn();
    }); } finally { busy=false; }
}
async function load() {
    if(!active())throw Error('Start a new GM Alpha test chat first');
    const marker=copy(meta());
    if(marker.version!==VERSION)throw Error('Unknown Alpha save version');
    const j=await Journal.open(store,marker.journal);
    if(j.read().originChatId!==host.id())throw Error('This journal is bound to a different chat; duplicated/imported chats cannot resume it');
    journal=j;
    scheduler=new Scheduler(await Journal.open(store,'avereth-gm-alpha-capacity.json',{revision:0,leases:{}}),{status});
    return new DynamicGM(journal,scheduler,new Publication(journal,host));
}
async function start() { return locked(async()=>{
    const c=context(),token=host.token();
    if(active())throw Error('Campaign already started');
    if(!card())throw Error('Import and select the Avereth GM Alpha character card');
    if(hasStoredCampaign(c.chat)||c.chat.some(m=>m.is_user)||c.chat.length>1)throw Error('Use a NEW empty test chat. Existing campaigns are never migrated');
    const id=crypto.randomUUID(),target=host.target(),chat=copy(c.chat);
    if(!chat.length)throw Error('Character greeting missing');
    chat[0].mes=c.substituteParams(chat[0].mes);
    const seed=crypto.getRandomValues(new Uint32Array(1))[0];
    if(ensureCampaign(chat,content,{seed,runtime:'v4',planner:true,ruleset:2})!=='created')throw Error('Campaign could not be created');
    const state=foldChat(chat).state;
    chat[0].extra.display_text=chat[0].mes+'\n\n'+renderHud(state,content,'closed');
    const name=`avereth-gm-alpha-${id}.json`;
    const header={user_name:'unused',character_name:'unused',chat_metadata:{...copy(c.chatMetadata),averethGMAlpha:{version:VERSION,id,journal:name}}};
    await Journal.open(store,name,{version:VERSION,revision:0,originChatId:host.id(),target,header,world:{revision:0,chat},turns:{}});
    if(!host.current(token))throw Error('Chat changed during start; original chat left unchanged');
    await host.save(target,header,chat);host.render(chat,header,token);
    status('GM Alpha bereit. Wähle Warrior, Mage oder Rogue im Eingabefeld.');
}); }
async function send(input) { return locked(async()=>{
    const g=await load(),db=journal.read();
    if(!sameTranscript(context().chat,db.world.chat))throw Error('Chat changed outside Alpha; resume the pending commit or restore the confirmed transcript');
    if(!input?.trim())throw Error('Enter a player action');
    if(scheduler.occupancy())throw Error('Provider capacity blocked; resume after confirmed remote completion');
    const id=`${meta().id}:${db.world.revision+1}:${crypto.randomUUID()}`;
    await g.begin(id,input.trim());
    document.querySelector('#send_textarea').value='';
    status('Spielzug gespeichert · Erzählung noch nicht veröffentlicht');
    await g.run(id,createTransport(context,status));
    await g.scheduler.settled(id);
    status('Welt gespeichert und bestätigt · Spielzug abgeschlossen');
}); }
async function resume() { return locked(async()=>{
    const g=await load(),t=Object.values(journal.read().turns).at(-1);
    if(!t) { status('Kein offener Spielzug');return; }
    await g.run(t.id,createTransport(context,status));
    await g.scheduler.settled(t.id);
    status('Wiederaufnahme abgeschlossen · keine erneute Buchung');
}); }
async function discard() { return locked(async()=>{
    await load();const t=Object.values(journal.read().turns).at(-1);
    if(!t||t.phase!=='active')throw Error('Only an uncommitted turn can be discarded');
    if(scheduler.occupancy())throw Error('Remote request still unknown; do not discard while it may be running');
    if(!confirm('Diesen unveröffentlichten Zug verwerfen? Bereits bestätigte Spielzüge bleiben erhalten.'))return;
    await journal.update(d=>{d.turns[t.id].phase='cancelled';});
    document.querySelector('#send_textarea').value=t.input;
    status('Unbestätigten Zug verworfen; Eingabe wiederhergestellt');
}); }
async function remoteFinished() { return locked(async()=>{
    await load();
    if(!confirm('Nur bestätigen, wenn die entfernte Anfrage beim Anbieter nachweislich beendet ist. Stop oder eine abgelaufene Wartezeit genügen NICHT. Ist der Remoteabschluss bestätigt?'))return;
    await scheduler.confirmRemoteFinished();status('Remoteabschluss ausdrücklich bestätigt. Wiederaufnahme separat starten.');
}); }
function stop() { host.stop();status('Gestoppt. Laufende Provideranfrage bleibt bis zum bestätigten Abschluss gesperrt.'); }
function reject(event) { event.preventDefault();event.stopImmediatePropagation();status('Alpha 2: Swipe, Regenerate, Continue, Edit und Löschen sind für bestätigte GM-Chats gesperrt.'); }

// This stops native Generate calls (including slash commands/extensions) before the
// stock request. The capture handlers additionally stop native transcript mutations.
globalThis.averethGMAlphaInterceptor=async(_chat,_size,abort)=>{if(relevant()){abort(true);status('Für diesen Chat „GM senden“ verwenden; native Generierung ist gesperrt.');}};
async function init() {
    const base=new URL('.',import.meta.url);
    configure(await loadContentPack(async file=>{const r=await fetch(new URL(`content/${file}`,base));if(!r.ok)throw Error(`Missing content ${file}`);return r.json();}));
    const panel=document.createElement('section');panel.id='gm-alpha-panel';
    panel.innerHTML=`<details open><summary>Avereth GM Alpha 2 · ${VERSION}</summary><div class="gm-alpha-buttons"><button id="gm-alpha-start">Neues Testspiel starten</button><button id="gm-alpha-send">GM senden</button><button id="gm-alpha-stop">Stop</button><button id="gm-alpha-resume">Wiederaufnehmen</button><button id="gm-alpha-discard">Offenen Zug verwerfen</button></div><div id="gm-alpha-status" role="status">Neue GM-Charakterkarte öffnen und Testspiel starten.</div><details><summary>Wiederherstellung und Hilfe</summary><p>Systembefehle wie #help, #status, #inventory im Eingabefeld senden. HUD unter den bestätigten Antworten. Keine Swipes/Regenerates in Alpha 2.</p><details><summary>Requestdiagnose (lokal, keine Keys)</summary><pre id="gm-alpha-diagnostics"></pre></details><button id="gm-alpha-remote">Remoteabschluss bestätigen…</button><a target="_blank" rel="noopener" href="${new URL('INSTALLATION_DE.md',base)}">Installation / Grenzen</a></details></details>`;
    document.querySelector('#form_sheld')?.before(panel);
    if(!panel.isConnected)document.querySelector('#sheld').append(panel);
    const hud=document.createElement('div');hud.id='gm-alpha-hud';panel.querySelector('details').append(hud);
    const refreshHud=()=>{hud.innerHTML=active()?renderHud(foldChat(context().chat).state,content,'closed'):'';};
    const actions={start,send:()=>send(document.querySelector('#send_textarea').value),stop,resume,discard,remote:remoteFinished};
    for(const [name,fn] of Object.entries(actions))document.querySelector(`#gm-alpha-${name}`).onclick=()=>Promise.resolve().then(fn).catch(failed);
    document.addEventListener('click',e=>{
        if(!relevant())return;
        if(e.target.closest('#send_but')){e.preventDefault();e.stopImmediatePropagation();send(document.querySelector('#send_textarea').value).catch(failed);return;}
        if(e.target.closest('#mes_stop')){e.preventDefault();e.stopImmediatePropagation();stop();return;}
        if(e.target.closest('#option_regenerate,#option_continue,#mes_continue,#mes_impersonate,#option_impersonate,.swipe_left,.swipe_right,.mes_edit,.mes_edit_done,.mes_delete,#option_delete_mes'))reject(e);
    },true);
    document.addEventListener('keydown',e=>{
        if(!relevant())return;
        if(e.target.id==='send_textarea'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.stopImmediatePropagation();send(e.target.value).catch(failed);}
        else if((e.ctrlKey&&e.key==='Enter')||(['ArrowLeft','ArrowRight'].includes(e.key)&&!['TEXTAREA','INPUT'].includes(e.target.tagName)))reject(e);
    },true);
    installDraftActions(document);
    const c=context();
    c.eventSource.on(c.eventTypes.GENERATION_STOPPED,stop);
    c.eventSource.on(c.eventTypes.CHAT_CHANGED,()=>{host.stop();journal=null;scheduler=null;refreshHud();status(active()?'GM Alpha geladen. Bei offenem Zug „Wiederaufnehmen“.':'Neuen GM-Testchat öffnen.');});
    for(const name of ['MESSAGE_EDITED','MESSAGE_DELETED','MESSAGE_SWIPED'])c.eventSource.on(c.eventTypes[name],()=>{if(active()){host.stop();status('Externe Chatänderung erkannt; keine weitere Buchung bis zur Wiederherstellung.');}});
    status(active()?'GM Alpha geladen. Offene Züge ausdrücklich wiederaufnehmen.':'GM Alpha bereit · erst neues Testspiel starten');
    refreshHud();
    // Diagnostic API has no fixture injection, no network override and no remote unlock.
    globalThis.AverethGMAlpha={version:VERSION,start,send,resume,stop,inspect:()=>({busy,lastError,journal:journal?.read(),capacity:scheduler?.occupancy()}),state:()=>foldChat(context().chat).state};
}
init().catch(failed);
