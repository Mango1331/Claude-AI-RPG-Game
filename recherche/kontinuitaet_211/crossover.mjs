// Offline original-response replay, plus preserved source-prefix and carry-forward views.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {gzipSync, gunzipSync} from 'node:zlib';

const args = process.argv.slice(2);
const hudChats = args[0] === '--hud-chats';
const [repoArg, output] = hudChats ? args.slice(1) : args;
assert.ok(repoArg && output && args.length === (hudChats ? 3 : 2),
    'node crossover.mjs checkout replay-output.json.gz | --hud-chats checkout output-directory');
const repo=path.resolve(repoArg), engine=path.join(repo,'avereth-engine');
const here=path.dirname(fileURLToPath(import.meta.url)), doc=path.resolve(here,'../..');
const source=path.join(doc,'testrun_10b');
const moduleAt=file=>import(pathToFileURL(path.join(engine,file)));
const {engineAt,canonicalJson,recordOutput}=await moduleAt('tools/replay/replay.mjs');
const {host,content,runtime,version}=await engineAt(engine);
const {renderHud}=await moduleAt('src/hud.js');
const hash=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');
const jsonLines=file=>gunzipSync(readFileSync(file)).toString().trim().split('\n').map(JSON.parse);
const rec=m=>m?.extra?.avereth;
const arm=execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const changed=execFileSync('git',['-C',repo,'status','--porcelain','--','avereth-engine/src','avereth-engine/content'],{encoding:'utf8'}).trim();
assert.ok(!changed,'Commit the runtime before recording an evidence run');
const hereId=s=>s.scene.at;
const bagList=s=>Object.values(s.objects).filter(o=>/satchel|the_bag$/.test(o.id));
const bread=s=>s.objects['obj.t24.wedge_of_dark_loaf_wrapped_in_cloth'];
const known=(s,n)=>s.knowledge[n]?.['f.pc.name']?.stance==='knows';
const isPresent=(s,id)=>s.scene.present.includes(id);
const hasDoss=s=>s.entities['npc.npctollman']?.name==='Doss';
const at=s=>s.scene.at;
const sameBag=(s,owner)=>bagList(s).length===1 && bagList(s)[0].id==='obj.t40.mother_wrens_leather_satchel' && bagList(s)[0].holder?.entity===owner;
const facts=(s,subject)=>Object.values(s.facts).filter(f=>f.s===subject);
const marta='npc.marta_halloran', wren='npc.mother_wren', mill='loc.the_mill_at_weirbridge', lane='loc.ashbridge.flooded_lane_behind_the_tithe_barn';
const atWren=s=>at(s)==='loc.ashbridge.mother_wrens_house';
const remaining=o=>!!o && o.qty>0 && !['consumed','destroyed'].includes(o.holder?.void) && (o.holder?.entity || o.holder?.loc || o.holder?.container);
const archivePrefix='openrouter-20261124-';
const focus='kontinuitaet-fokus/';
const runs=[
 ['B','kontinuitaet-b-210',700,1,22],['W','kontinuitaet-zusatz-wren-210',900,1,3],
 ['C','trust-c-208',0,18,21],['HB','trust-b-208',0,5,20],
 ['A','kontinuitaet-a-209',0,1,8],['Pilot','kontinuitaet-pilot-210',0,5,7],
 ...['bren','wagen','wren','gruene-tuer','tasche','namenswissen'].flatMap((f,i)=>['A','B'].map(a=>[f+'/'+a,focus+f+'/'+a,(i+1)*100,1,1]))
];
function criteria(tag,n,s,pre) {
 const k=tag+n, c={};
 if(k==='B2'||k==='B3'||k==='B21')c['Lia kennt Alarics persönlich genannten Namen']=known(s,'npc.lia_halloran');
 if(k==='B3'){
   c['Anhöhe erreicht']=/rise|main_track/.test(at(s));
   c['Dann ist bereits umgekehrt']=!isPresent(s,'npc.dann');
   c['Danns eigener Abschied an der Anhöhe gesichert']=s.memories.some(m=>m.who?.includes('npc.dann')&&/handshake|shook|farewell|parting|parted/i.test(m.text));
   c['Lias Wegbrot mitgegeben']=bread(s)?.holder.entity==='pc';
 }
 if(k==='B4')c['Fuhrfrau am zweiten Brückenhalt']=/second_stone_bridge/.test(at(s))&&isPresent(s,'npc.npccarter_woman');
 if(k==='B15'){
    c['Beide essen, kein unversehrter Proviantkeil bei Birta oder PC']=!remaining(bread(s));
    c['Kein ganzer Proviantkeil für Birta bei Teilgabe']=!(remaining(bread(s)) && bread(s)?.holder.entity==='npc.npccarter_woman');
 }
 if(k==='B16'||k==='B18')c['Birta behält ihre eigene ID']=s.entities['npc.npccarter_woman']?.name==='Birta';
 if(k==='B18')c['Zweiter Fuhrmann ist eine andere Person']=isPresent(s,'npc.npccarter')&&!isPresent(s,'npc.npccarter_woman');
 if(k==='B19')c['Halt bleibt an der überfluteten Gasse']=at(s)===lane;
 if(k==='B20'){
    c['Wren an der grünen Tür']=atWren(s)&&isPresent(s,'npc.npcwren');
    c['Doss bleibt benannter Zollmann']=hasDoss(s);
    c['Neu erzählter Knüppelfakt aus B20 erhalten']=facts(s,'npc.npctollman').some(f=>f.p==='armed'&&/stick swinging/i.test(f.o));
    c['Zollgeschichte erhalten']=Object.values(s.threads).some(t=>/Doss/.test(t.text));
    c['Kein neuer Geldabgang ohne vollzogene Zahlung']=s.entities.pc.sheet.coin_cp===pre.entities.pc.sheet.coin_cp;
 }
 if(k==='B21')c['Wren kennt den ihr genannten Namen']=known(s,'npc.npcwren');
 if(tag==='W'){
    c['Wren behält eine Originaltasche']=sameBag(s,wren);
    c['Wren anwesend']=isPresent(s,wren);
    if(n<3)c['Beide bleiben am Einschnitt']=at(s)==='loc.ridge_road_cutting';
    if(n===3){
       c['Hof nach gescheiterter Klettermethode erreicht']=at(s)==='loc.halloran_steading'&&s.entities.pc.sheet.hp===pre.entities.pc.sheet.hp;
       c['Sprechende Marta unter bekannter ID anwesend']=isPresent(s,marta);
       c['Martas berichteter Verlauf am Hof belegt']=facts(s,'npc.tam').some(f=>/wors|midday|noon|sister/i.test(String(f.o)));
    }
 }
 if(k==='C18')c['Eindeutige Originaltasche vor Leihe']=sameBag(s,wren);
 if(k==='C19'||k==='C20'||k==='C21')c['Eine physische Taschenidentität während des ganzen Auftrags']=bagList(s).length===1;
 if(k==='C19'||k==='C20')c['Träger der geliehenen Tasche ist Alaric']=sameBag(s,'pc');
 if(k==='C20'||k==='C21')c['Rückkehr zur bereits bekannten Marta']=isPresent(s,marta)&&!isPresent(s,'npc.marta');
 if(k==='C21'){
    c['Dieselbe Tasche zurück, keine Phantomtasche']=sameBag(s,wren);
    c['Tam am Bett präsent']=isPresent(s,'npc.tam');
 }
 if(k==='HB5'||k==='HB20')c['Abgeliefertes Heringsfass aus PC-Besitz']=!Object.values(s.objects).some(o=>/keg|cask|barrel/.test(o.id)&&remaining(o)&&o.holder.entity==='pc');
 if(k==='HB9'||k==='HB20')c['Verbaute Bretter aus PC-Bestand']=!Object.values(s.objects).some(o=>/boards/.test(o.id)&&remaining(o)&&o.holder.entity==='pc');
 if(k==='HB15'||tag==='wagen/B')c['Wiesenhalt nach Wartezeit erreicht']=at(s)!==mill && /meadow/.test(at(s));
 if(k==='HB20')c['Weary Ox mit bekannter Marta erreicht']=at(s)==='loc.ashbridge.the_weary_ox'&&isPresent(s,'npc.marta');
 if(tag.startsWith('bren/'))c['Begleitung bis zum bewohnten Ziel']=isPresent(s,'npc.bren')&&/chapel|cottage/.test(at(s))&&s.scene.present.filter(id=>id.startsWith('npc.')).length>=2;
 if(tag.startsWith('gruene-tuer/')||k==='A5')c['Haus und Heilerin erreicht']=atWren(s)&&isPresent(s,wren);
 if(k==='A3'||k==='A8')c['Getrunkene ganze Brühe bleibt verbraucht']=s.objects['obj.t22.bowl_of_hot_broth']?.holder?.consumed==='pc';
 if(k==='A4')c['Reine Torwegfrage schützt vor eigenmächtiger Ankunft']=!atWren(s);
 if(tag.startsWith('tasche/'))c['Wren behält Tasche wie erzählt']=sameBag(s,wren);
 if(tag.startsWith('wren/'))c['Hof-Rückgabe lässt keine Phantomtasche']=sameBag(s,wren);
 if(tag==='wren/A')c['Sichtbarer Tam am Bett wird erkannt']=isPresent(s,'npc.tam');
 if(k==='Pilot7')c['Hofhunde bleiben zurück']=!s.scene.present.some(id=>/dog/.test(id));
 if(tag.startsWith('namenswissen/'))c['Dann erinnert sich an den Namen']=known(s,'npc.dann');
 return c;
}
function snapshot(s) {
 const relevant=/^npc\.(dann|.*marta|.*wren|.*carter|tam|lia_halloran|npctollman)|^mon\..*dog/;
 return {hash:hash(s),at:hereId(s),place:s.scene.place,present:s.scene.present,clock:s.clock,
  people:Object.fromEntries(Object.entries(s.entities).filter(([id])=>relevant.test(id)).map(([id,e])=>[id,{name:e.name,location:e.location,knowsName:known(s,id)}])),
  supplies:Object.fromEntries(Object.entries(s.objects).filter(([id])=>/bag|satchel|bread|loaf|keg|cask|barrel|boards|broth/.test(id)).map(([id,o])=>[id,{holder:o.holder,qty:o.qty}])),
  resources:Object.fromEntries(['hp','mp','sta','coin_cp'].map(key=>[key,s.entities.pc.sheet[key]])),
  hud:hash(renderHud(s,content))};
}
function fold(chat) {const {state,errors}=host.foldChat(chat);assert.deepEqual(errors,[]);return state}
function load(name) {
 const d=path.join(source,archivePrefix+name);
 const chat=jsonLines(path.join(d,'original-chat.jsonl.gz')).filter(m=>typeof m.mes==='string');
 const times=JSON.parse(readFileSync(path.join(d,'browserzeiten.json')));
 const journal=jsonLines(path.join(d,'provider-journal.jsonl.gz'));
 const end=new Map(journal.filter(r=>r.kind==='end').map(r=>[r.id,r]));
 const raw=new Map(jsonLines(path.join(d,'provider-originalantworten.jsonl.gz')).map(r=>[r.id,r]));
 const saved=new Map(jsonLines(path.join(d,'reload-welten.jsonl.gz')).map(r=>[r.after,hash(r.state)]));
 return {chat,times,end,raw,journal,saved};
}
function scripted(starts,data) {
 const used=[],missing=[],prompts=[];
 const llm=async({purpose,messages})=>{
  prompts.push({purpose,sha256:hash(messages)});
  const role={plan:'planner',extract:'extractor'}[purpose.split('_')[0]]||purpose.split('_')[0];
  const r=starts[used.length];
  if(!r||r.role!==role){
    missing.push(purpose);throw Object.assign(Error('Unrecorded archived response'),{code:'LLM_CAPACITY_BLOCKED'});
  }
  used.push(r.id);
  const row=data.raw.get(r.id);assert.equal(row.format,'json');
  const answer=JSON.parse(row.body);const c=answer.choices[0];
  return {content:c.message.content,finish_reason:c.finish_reason,usage:answer.usage};
 };
 return {llm,stats:()=>({used,unused:starts.slice(used.length).map(r=>r.id),missing,prompts})};
}
async function step(tag,offset,n,history,data){
 const i=data.times.find(t=>t.n===n).inputMessageIndex;
 assert.equal(i,history.length);
 const pre=fold(history), diagnostics=[];
 const reservations=data.journal.filter(r=>r.kind==='start'&&r.turn===offset+n);
 const active=reservations.filter(r=>data.end.get(r.id)?.ok===true);
 const failures=reservations.filter(r=>!active.includes(r)).map(r=>({id:r.id,status:data.end.get(r.id)?.status}));
 for(const j of [i,i+1]){
  const original=data.chat[j],m=structuredClone(original);
  delete m.extra.avereth;
  if(j===i && m.is_system && rec(original)?.command)m.is_system=false;
  history.push(m);
  const relevant=active.filter(r=>j===i?!['extractor','narrator'].includes(r.role):r.role==='extractor');
  const script=scripted(relevant,data);
  let stage;
  if(j===i)stage=await runtime.prepareGenerationAsync(history,content,{type:'normal',settings:{},llm:script.llm});
  else{
   stage=runtime.processReplyAny(history,j,content);
   if(stage.extract)await runtime.runExtraction(history,j,content,script.llm);
  }
  const out=recordOutput(rec(m));
  diagnostics.push({action:stage.action, ...script.stats(),recordHash:hash(out),originalRecordHash:hash(recordOutput(rec(original))),events:out.events.map(e=>e.t),
    rejected:out.events.filter(e=>e.t==='delta.rejected').map(e=>({rule:e.d.rule,type:e.d.item?.type,reason:e.d.reason})),
    corrections:out.corrections,extraction:out.extraction,plan:rec(m)?.ir?.commands,
    report:rec(m)?.extraction?.raw && {scene:rec(m).extraction.raw.scene,order:rec(m).extraction.raw.deltas?.map(d=>[d.seq,d.type,d.scene])}});
 }
 const s=fold(history);const reloaded=fold(JSON.parse(JSON.stringify(history)));
 assert.equal(hash(s),hash(reloaded)); assert.equal(renderHud(s,content),renderHud(reloaded,content));
 const storedHud=rec(history[i+1])?.hud;
 const recordedNarration=!!rec(data.chat[i+1])?.extraction;
 const routeCovered=(diagnostics[0].action==='context')===recordedNarration;
 return {n,routeCovered,storedHud:typeof storedHud==='string'?{sha256:hash(storedHud),matchesRendered:storedHud===renderHud(reloaded,content)}:null,input:data.chat[i].mes,replyHash:hash(data.chat[i+1].mes),before:pre.scene.at,state:snapshot(s),failures,diagnostics,criteria:criteria(tag,n,s,pre),
   originalWorld:data.saved.get(n),archivedChatFold:hash(fold(data.chat.slice(0,i+2))),reload:true};
}
if (hudChats) {
    // B20 continues from the recomputed B19. C19 starts on its own source prefix.
    for (const [tag, turns] of [['B', [19, 20]], ['C', [19]]]) {
        const [, name, offset] = runs.find(run => run[0] === tag);
        const data = load(name);
        const start = data.times.find(t => t.n === turns[0]).inputMessageIndex;
        const history = structuredClone(data.chat.slice(0, start));
        for (const turn of turns) {
            const row = await step(tag, offset, turn, history, data);
            assert.ok(row.routeCovered && row.diagnostics.every(d => !d.missing.length && !d.unused.length),
                'Incomplete archive coverage for ' + tag + turn);
            writeFileSync(path.join(output, tag + turn + '.json'), JSON.stringify({row, history}));
        }
    }
    process.exit(0);
}
const result={arm,version,runs:{},historical:{}};
for(const [tag,name,offset,first,last] of runs){
 const data=load(name), start=data.times.find(t=>t.n===first).inputMessageIndex;
 let carried=structuredClone(data.chat.slice(0,start));const rows=[];
 for(let n=first;n<=last;n++){
  const i=data.times.find(t=>t.n===n).inputMessageIndex;
  const independent=await step(tag,offset,n,structuredClone(data.chat.slice(0,i)),data);
  let chain=null;
  if(carried){
    chain=await step(tag,offset,n,carried,data);
    // No reinterpretation as a newly generated reply if the archived responses no longer cover this turn.
    if(!chain.routeCovered || chain.diagnostics.some(d=>d.missing.length))carried=null;
  }
  rows.push({n,independent,chain});
 }
 result.runs[tag]={source:archivePrefix+name,sourceHash:hash(data.chat),rows};
}
const scratch=mkdtempSync(path.join(tmpdir(),'avereth-historic-'));
try{
 const file=path.join(scratch,'old.json.gz');
 execFileSync(process.execPath,[path.resolve(here,'../user11_trust_208/vergleich.mjs'),engine,engine,path.join(source,'user-20261124-014928-208/originals'),'offline',file]);
 result.historical=JSON.parse(gunzipSync(readFileSync(file)));
}finally{rmSync(scratch,{recursive:true,force:true})}
// M12 has three independent narrative write channels referring to one engine-owned board.
const user11=path.join(source,'user-20261124-014928-208/originals');
const uchat=readFileSync(path.join(user11,'chat.jsonl'),'utf8').trim().split('\n').map(JSON.parse).filter(m=>typeof m.mes==='string');
const {parseServerLog}=await moduleAt('tools/run_report.mjs');
const {actionPrefix}=await moduleAt('src/action_input.js');
const {pairs}=parseServerLog(gunzipSync(readFileSync(path.join(user11,'st.redacted.txt.gz'))).toString('utf16le'));
const boardHistory=structuredClone(uchat.slice(0,12));
const board=[];
for (const j of [12,13,14]) {
 const m=structuredClone(uchat[j]);delete m.extra.avereth;boardHistory.push(m);
 if(j===13){
   // Re-select the same button on the replayed board; even extraction timing changes the old UI revision.
   m.extra.avereth_action_input.base_revision=actionPrefix(boardHistory,j);
   const p=await runtime.prepareGenerationAsync(boardHistory,content,{type:'normal',settings:{},llm:async()=>{throw Error('Unexpected planner for the original bound board button')}});
   assert.equal(p.action,'context');
 }else{
   const pieces=m.mes.match(/[ -~]{40,}/g)||[];
   const fixed=pairs.filter(p=>p.req.messages[0]?.content.startsWith('You read one reply')&&pieces.some(t=>p.req.messages.some(msg=>msg.content.includes(t.slice(0,110)))));
   assert.ok(fixed.length);
   assert.ok(runtime.processReplyAny(boardHistory,j,content).extract);
   const requested=[],missing=[];
   await runtime.runExtraction(boardHistory,j,content,async({purpose})=>{
    const p=fixed[requested.length];requested.push(purpose);
    if(!p){missing.push(purpose);throw Object.assign(Error('No further archived extraction'),{code:'LLM_CAPACITY_BLOCKED'})}
    return p.resp.choices[0].message.content;
   });
   const s=fold(boardHistory),reload=fold(JSON.parse(JSON.stringify(boardHistory)));assert.equal(hash(s),hash(reload));
   const offered=Object.entries(s.quests).map(([id,q])=>[id,q.status]);
   const textClaimsTake=t=>/took.{0,28}(contract|slip)|claim(?:ed|ing).{0,24}adders/i.test(t??'');
   const e=s.entities['npc.adventurer'];
   const criteria={
    'Schlangenvertrag bleibt verfügbar':s.quests['quest.adders_in_the_ferry_stones']?.status==='listed',
    'NPC-Beschreibung ohne Entnahme':!textClaimsTake([e?.traits,...(e?.descriptors||[])].join(' ')),
    'Keine konkurrierende Vertragsbehauptung im Faktenregister':!Object.values(s.facts).some(f=>/took_contract|claimed_contract/.test(f.p)&&/adder/i.test(f.o)),
    'Keine Erinnerung an entzogenen Schlangenzettel':!s.memories.some(m=>textClaimsTake(m.text)&&/adder/i.test(m.text)),
   };
   board.push({message:j,criteria,offered,requested,missing,unused:fixed.length-requested.length,world:hash(s),reload:true});
 }
}
result.board=board;
assert.equal(execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),arm,'Checkout changed during replay');
assert.equal(execFileSync('git',['-C',repo,'status','--porcelain','--','avereth-engine/src','avereth-engine/content'],{encoding:'utf8'}).trim(),'','Engine sources changed during replay');
writeFileSync(output,gzipSync(JSON.stringify(result)));
