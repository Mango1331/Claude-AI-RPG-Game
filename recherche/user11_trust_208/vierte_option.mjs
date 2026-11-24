// Paired, deterministic planner substitutions on the same original prefixes, narrator texts and extractor reports.
// Paths: engine-A, User11-chat, natural-B-chat, natural-C-chat, output JSON.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const [root,u11,b,c,out]=process.argv.slice(2);
if (!out) throw new Error('usage: node vierte_option.mjs reference-engine User11.chat B.chat C.chat results.json');
const imported=async file=>import(pathToFileURL(path.resolve(root,file)).href);
const {engineAt,canonicalJson}=await imported('tools/replay/replay.mjs');
const {parseExtraction}=await imported('src/v4/extract.js');
const E=await engineAt(path.resolve(root));
const go=(seq,to,quote,needs)=>({seq,type:'go',to,quote,...(needs?{needs}:{})});
const brenQuote='lets go ill help you out for the part';
const wheatQuote="take my share of the hauling down to Ashbridge";
// Fixed from earlier public dialogue and the user's declared intent before inspecting that case's stored X.
// No historical location ID or place name is read from the tested narrator/extractor when constructing a new GO.
const sets=[
 {label:'Bren',file:u11,i:17,authorization:'One short joint segment toward the chapel cottage mentioned by Bren on the chosen chapel route. No independent journey to town or entry to the catacombs.',alternatives:{
    previous_cottage:()=>[go(1,{new:'the chapel cottage'},brenQuote)],
 }},
 {label:'B15',file:b,i:33,authorization:'Wait for Tam, help carry the wheat down the river road toward Ashbridge after loading. No immediate arrival in town; the toll men at the meadows were mentioned before the turn, not chosen as a separate goal.',alternatives:{
    carry_to_town:commands=>[...commands,go(3,'loc.ashbridge',wheatQuote,2)],
    carry_along_road:commands=>[...commands,go(3,{new:'the river road toward Ashbridge'},wheatQuote,2)],
 }},
 {label:'C9',file:c,i:21,authorization:'Promise help today; finish the food, ask about a passable bridge and listen here for directions. No immediate departure to Mother Wren.',alternatives:{
    eat_ask_without_go:commands=>commands.filter(x=>x.type!=='go'),
 }},
];
const [privateU11,journalFile]=process.argv.slice(7);
const record=m=>m?.extra?.avereth;
const clean=m=>{const v=structuredClone(m);delete v.extra.avereth;return v;};
const hash=v=>createHash('sha256').update(typeof v==='string'?v:canonicalJson(v)).digest('hex');
const records=journalFile ? fs.readFileSync(journalFile,'utf8').trim().split('\n').map(JSON.parse) : null;
const {parseServerLog}=await imported('tools/run_report.mjs');
const here=path.dirname(fileURLToPath(import.meta.url));
const u11log=privateU11 ? parseServerLog(fs.readFileSync(privateU11,'utf16le')).pairs : null;
const bundled=journalFile ? null : JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(here,'vierte_option_quellen.json.gz'))));
function physical(set) {
    if(bundled) return bundled[set.label];
    if(set.label==='Bren') return {planner:u11log[22].req.messages,answers:[{id:25,text:u11log[24].resp.choices[0].message.content}]};
    const [arm,turn] = set.label==='B15' ? ['B',15] : ['C',9];
    const lines=records.filter(r=>r.arm===arm&&r.turn===turn);
    return {planner:lines.find(r=>r.kind==='start'&&r.role==='planner').body.messages,
        answers:lines.filter(r=>r.kind==='end'&&r.role==='extractor').map(r=>({id:r.id,text:r.text}))};
}
function fold(chat) {
    const f=E.host.foldChat(chat); if(f.errors.length)throw Error('fold errors');
    const s=f.state;return {place:s.scene.at,minute:s.clock.minute,present:s.scene.present,people:Object.keys(s.entities).filter(id=>id.startsWith('npc.')),
        threads:Object.values(s.threads||{}).map(t=>t.text||t.id),world_sha:hash(s)};
}
function selectedEvents(msg) {
    return (record(msg)?.events||[]).map(e=>['pulse.rolled','pulse.outcome','time.advanced','cmd.resolved','intent.set','intent.updated','scene.moved','delta.rejected','action.reported'].includes(e.t)
        ? {type:e.t,data:e.t==='delta.rejected'?{type:e.d.item?.type,rule:e.d.rule,reason:e.d.reason}:e.d}:e.t);
}
const results={};
for(const set of sets){
    const chat=fs.readFileSync(set.file,'utf8').trim().split('\n').map(JSON.parse).filter(m=>typeof m.mes==='string');
    const {i}=set, j=i+1;const orig=JSON.parse(record(chat[i]).plan.raw[0]).commands;
    const {planner,answers}=physical(set);
    const actual=planner.at(-1).content;
    const matched=actual.split('\n').filter(x=>x.startsWith('PLACES:')||x.toLowerCase().includes('paused: reach the water meadows')||x.startsWith('…')||x.startsWith('...')).join('\n');
    const inCatalog=actual.split('\n').find(x=>x.startsWith('PLACES:'))||'';
    results[set.label]={auth_before:set.authorization,player:chat[i].mes,source:{i,narrator_hash:hash(chat[j].mes),planner_hash:hash(planner),x:answers.map(a=>[a.id,hash(a.text)])},
        before:fold(chat.slice(0,i)),prior_landmarks: ['chapel cottage','river road','toll men at the meadows','loc.the_water_meadows','loc.ashbridge','mother_wrens_house'].map(w=>({term:w,spoken_previously:chat[i-1].mes.toLowerCase().includes(w),in_original_planner:actual.toLowerCase().includes(w),in_catalog:inCatalog.toLowerCase().includes(w)})),
        prior_prompt_extracts:matched.split('\n').filter(x=>!x.startsWith('PLACES:')).map(x=>x.slice(0,820)),
        observed_events:selectedEvents(chat[i+1]),alternatives:{}};
    for(const [name,convert] of Object.entries({original:x=>x,...set.alternatives})){
        const history=structuredClone(chat.slice(0,i));
        history.push(clean(chat[i]));
        const cmd=convert(structuredClone(orig));
        const pcall=[];
        const p=await E.runtime.prepareGenerationAsync(history,E.content,{type:'normal',settings:{},llm:async({purpose})=>{
            pcall.push(purpose);if(purpose!=='plan')throw Error('unscripted '+purpose);return JSON.stringify({commands:cmd});
        }});
        const control=fold(history); const input=record(history[i]); const beforeReply=selectedEvents(history[i]);
        history.push(clean(chat[j]));const ready=E.runtime.processReplyAny(history,j,E.content);
        if(!ready.extract)throw Error('no pending reply');
        const req=E.runtime.extractionRequest(history,j,E.content);
        const parsings=answers.map(a=>{const p=parseExtraction(a.text,req.vocab,req.ids,req.expectedKeys,{sceneRequired:req.sceneRequired,startScene:req.startScene,state:req.state,content:E.content,reply:chat[j].mes});return {id:a.id,valid:p.valid,complete:p.complete,missing:p.missing,issues:p.issues,errors:p.errors};});
        const requests=[];let n=0,owned=true;
        const phys=structuredClone(history);
        await E.runtime.runExtraction(phys,j,E.content,async({purpose})=>{
            requests.push(purpose);
            if(n>=answers.length){owned=false;return null;}return answers[n++].text;
        },{isCurrent:()=>owned});
        const originalFinal=record(chat[j]).extraction.raw;
        const parsed=parseExtraction(JSON.stringify(originalFinal),req.vocab,req.ids,req.expectedKeys,{sceneRequired:req.sceneRequired,startScene:req.startScene,state:req.state,content:E.content,reply:chat[j].mes});
        // Separate post-parse diagnostic. Never synthesize values for newly missing expected keys.
        const res=E.runtime.applyExtraction(history,j,E.content,parsed,{hash:req.hash});
        results[set.label].alternatives[name]={commands:cmd,player_action:p.action,planner_calls:pcall,mapped:input?.interp?.commands,player_events:beforeReply,
            after_player:control,expected_keys:req.expectedKeys,physical_parse:parsings,protocol:{requests,archived_used:n,missing_request:!owned,status:record(phys[j]).extraction.status,end:fold(phys),events:selectedEvents(phys[j])},
            final_report_only:{valid:parsed.valid,complete:parsed.complete,missing:parsed.missing,applied:res.applied,end:fold(history),events:selectedEvents(history[j])}};
    }
}
const payload=JSON.stringify(results,null,2)+'\n';
fs.writeFileSync(out,out.endsWith('.gz')?zlib.gzipSync(payload):payload);
