/** Offline historical movement comparison. See HISTORISCHER_VERGLEICH.md for inputs. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [reference, candidate, user11, variant, output, user10log] = process.argv.slice(2);
if (![reference,candidate,user11,variant,output].every(Boolean)) throw new Error('reference-engine candidate-engine user11-original-dir A|B|C output.json');
const source = path.resolve(here,'../../testrun_10b');
const importAt = (root, file) => import(pathToFileURL(path.resolve(root,file)).href);
const {engineAt, canonicalJson} = await importAt(reference,'tools/replay/replay.mjs');
const {parseServerLog} = await importAt(reference,'tools/run_report.mjs');
const {parseExtraction} = await importAt(candidate,'src/v4/extract.js');
const E = await engineAt(path.resolve(candidate));
const {runtime: R, content, host} = E;
const jsonLines = file => fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse).slice(1);
const chats = {};
const sources = {};
const physical = {};
const gzipNames = { '186M':'batch186_mage_grotto','186W':'batch186_warrior_drift','188R':'batch188_rogue_tannery' };
for (const [label, file] of Object.entries(gzipNames)) {
    const fixture = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(reference,'tests/v4/fixtures',file+'.json.gz'))));
    chats[label] = fixture.chat; sources[label] = fixture.source;
    if(label==='188R') {
        for (const [id,numbers] of [[80,[121,122]],[82,[125,126]]]) {
            physical[label+'#'+id]=numbers.map(n=>({n,text:fixture.answers['n'+n]}));
        }
    }
}
for (const [label, dir] of [['U09','user-20261123-042623-207'],['U10','user-20261123-075443-207']]) {
    chats[label] = jsonLines(path.join(source,dir,'originals/chat.jsonl'));
}
chats.U11 = jsonLines(path.join(user11,'chat.jsonl'));
function addPhysical(label,file) {
    const bytes = fs.readFileSync(file);
    const buffer = file.endsWith('.gz') ? zlib.gunzipSync(bytes) : bytes;
    sources[label+'_st_sha256'] = crypto.createHash('sha256').update(buffer).digest('hex');
    if (label==='U10' && sources.U10_st_sha256!=='66b47ffadac7d5ceba4bffd52c243f7b173b1690f5212bdf4348e72464137b7e') throw new Error('unexpected User10 source');
    const {pairs} = parseServerLog(buffer.toString('utf16le'));
    for (const [k,p] of pairs.entries()) {
        const messages = p.req.messages;
        if (!messages[0]?.content.startsWith('You read one reply')) continue;
        const prompt = messages.map(m=>m.content).join('\n');
        const hits = chats[label].flatMap((m,i)=>{
            if(m.is_user) return [];
            // Console codepage sometimes mangles punctuation. Match a verbatim, sufficiently long narrative clause.
            const exact = (m.mes.match(/[ -~]{40,}/g)||[]).some(piece=>prompt.includes(piece.slice(0,110)));
            return exact ? [i] : [];
        });
        if(hits.length !== 1 || !p.resp?.choices?.[0]?.message?.content) throw new Error('unmatched physical '+label+' X #'+(k+1));
        (physical[label+'#'+hits[0]] ??= []).push({n:k+1,text:p.resp.choices[0].message.content});
    }
}
addPhysical('U11',path.join(user11,fs.existsSync(path.join(user11,'st.txt')) ? 'st.txt' : 'st.redacted.txt.gz'));
if(user10log) addPhysical('U10',user10log);
else {
    const subset=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(here,'user10-x-auszug.json.gz'))));
    sources.U10_st_sha256=subset.source_sha256;
    Object.assign(physical,subset.answers);
}
const golden = JSON.parse(fs.readFileSync(path.join(here,'absicht.json')));
const rawRec = m=>m?.extra?.avereth;
const digest = value => crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
const copy = m=>{ const c=structuredClone(m); if(c.extra) delete c.extra.avereth; return c; };
const moves = evs=>evs.filter(e=>e.t==='scene.moved').map(e=>e.d.at||e.d.place);
const rejects = evs=>evs.filter(e=>e.t==='delta.rejected').map(e=>({type:e.d.item?.type,rule:e.d.rule, reason:e.d.reason}));
function world(chat) {
    const fold = host.foldChat(chat);
    if(fold.errors?.length) throw new Error('fold errors '+JSON.stringify(fold.errors));
    const s = fold.state;
    return {at:s.scene.at, present:s.scene.present, people:Object.keys(s.entities).filter(id=>id.startsWith('npc.')), facts:Object.values(s.facts||{}).map(f=>({id:f.id,s:f.s,p:f.p,o:f.o})),threads:s.threads, hash:digest(s)};
}
function describe(label,i) {
    const chat=chats[label], old=rawRec(chat[i]), user=rawRec(chat[i-1]), raw=old.extraction?.raw;
    const evs=old.events||[];
    return {player:chat[i-1].mes, planner_answers:user?.plan?.raw||[], player_events:(user?.events||[]).map(e=>e.t), original_moves:moves(evs), original_rejected:rejects(evs), narrator_quote:chat[i].mes.slice(0,310),narrator_sha256:crypto.createHash('sha256').update(chat[i].mes).digest('hex'), extractor_expected:raw?.expected, extractor_arrivals:raw?.deltas?.filter(d=>d.type==='arrive'), original_status:old.extraction?.status};
}
async function reply(history,label,i) {
    const orig=chats[label][i],old=rawRec(orig);
    if(!old?.extraction?.raw && !physical[label+'#'+i]) return {unavailable:'no archived extractor answer'};
    history.push(copy(orig));
    const prep=R.processReplyAny(history,i,content);
    if(!prep.extract) return {unavailable:'no valid pending extraction', prep:prep.action, fold:prep.foldBlocked?.index??null};
    const req=R.extractionRequest(history,i,content);
    if(!req) return {unavailable:'extractionRequest blocked'};
    const answers=physical[label+'#'+i];
    let parsed,method;
    if(answers){
        let n=0;
        const missing=[];
        await R.runExtraction(history,i,content, async({purpose})=>{
            if(!answers[n]) { missing.push(purpose);throw new Error('unrecorded '+purpose); }
            return answers[n++].text;
        });
        method={source:'physical recorded X',requests:answers.map(a=>a.n),used:n,missing};
    } else {
        parsed=parseExtraction(JSON.stringify(old.extraction.raw),req.vocab,req.ids,req.expectedKeys,{sceneRequired:req.sceneRequired,startScene:req.startScene,state:req.state,content,reply:orig.mes});
        method={source:'stored normalized X',parser_valid:parsed.valid,complete:parsed.complete,issues:parsed.issues?.map(x=>x.why)||[],errors:parsed.errors||[]};
        if(!parsed.valid) return {unavailable:'stored normalized X fails .208 parser',method};
        R.applyExtraction(history,i,content,parsed,{hash:req.hash});
    }
    const rec=rawRec(history[i]), evs=rec.events, state=world(history);
    const reloaded=world(JSON.parse(JSON.stringify(history)));
    if(state.hash!==reloaded.hash) throw new Error('serialized refold diverged');
    return {method,status:rec.extraction.status,from:req.startScene,moved:moves(evs),rejected:rejects(evs),events:evs.map(e=>e.t),end:state.at,present:state.present,
        people:state.people,facts:state.facts,threads:state.threads,hash:state.hash,reloaded_equal:true};
}
async function player(history,label,i,override=null) {
    const m=copy(chats[label][i]); if(override!==null) m.mes=override;
    history.push(m); const queue=[...(rawRec(chats[label][i])?.plan?.raw||[])];
    const calls=[],missing=[];
    const action=await R.prepareGenerationAsync(history,content,{type:'normal',settings:{},llm:async({purpose})=>{
        calls.push(purpose); if(/^plan/.test(purpose)&&queue.length) return queue.shift();
        missing.push(purpose);throw new Error('no archived '+purpose);
    }});
    return {action:action.action,calls,missing,unused:queue.length,events:(rawRec(m)?.events||[]).map(e=>e.t)};
}
async function primary(label,i,override=null) {
    const chat=chats[label],hist=structuredClone(chat.slice(0,override===null?i:i-1));
    let input=null;
    if(override!==null) input=await player(hist,label,i-1,override);
    const primary=await reply(hist,label,i);
    const following=[];
    if(override===null && primary.status==='applied' && (golden.reported26[label]?.includes(i)||(label==='U11'&&i===18))){
        for(let j=i+2;j<=i+4 && j<chat.length;j+=2){
            if(!chat[j-1].is_user || chat[j].is_user) break;
            const p=await player(hist,label,j-1);
            if(p.action!=='context'||p.missing.length) {following.push({id:j,player:p,unavailable:'follow-up player requires unavailable answer or no narrator'});break;}
            const r=await reply(hist,label,j); following.push({id:j,player:p,reply:r});if(r.status!=='applied') break;
        }
    }
    return {input,primary,following};
}
// Additional accepted .186/.188 originals, rated before running these six cases.
// A stated walk toward the reeds or a visit to the smith never authorizes an automatic attack or purchase.
const acceptedControls=[
    ['186M',8,'Walk up the street looking for the guild; ask a local if encountered.'],
    ['186M',28,'Approach the reeds. An attack is conditional on the reedcat appearing.'],
    ['186W',8,'Follow directions and enter the specified green door.'],
    ['186W',48,'Look for the smith and ask for an offer; no sale or purchase.'],
    ['188R',22,'Walk to the vats and ask a worker about Ostrek.'],
    ['188R',82,'Follow Vessa to the rows; cutting the ewe is conditional on permission.'],
];
const revision=root=>execFileSync('git',['-C',path.resolve(root),'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const result={variant,engine_commit:revision(candidate),reference_commit:revision(reference),sources, intent_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(here,'absicht.json'))).digest('hex'),cases:{},controls:{}};
for(const [label,i] of golden.cases) result.cases[label+'#'+i]={...describe(label,i),...await primary(label,i)};
result.accepted={};
for (const [label,i,intent] of acceptedControls) result.accepted[label+'#'+i]={intent,...describe(label,i),...await primary(label,i)};
const controls={directions:'Which road leads to the cottage?',defer:'Let us go tomorrow. For now I stay here.',refuse:'No, I will not go with you. I stay on this road.',ignore:'How much flour is left in your cart?',unaccepted:'Bren, do you want me to come with you?',explicit:'I walk with Bren to the stone cottage by the ruined chapel.'};
for(const [test,text] of Object.entries(controls)) result.controls[test]={player:text,expected:test==='explicit'?'selected cottage':'no voluntary arrival presently authorized',...await primary('U11',18,text),};
const rows=[...Object.values(result.cases),...Object.values(result.accepted),...Object.values(result.controls)];
for(const row of rows) {
    for(const r of [row.primary,...row.following.map(step=>step.reply)]) {
        if(!r || r.status!=='applied' || r.method?.missing?.length || !r.reloaded_equal)
            throw new Error('unconfirmed historical outcome: '+JSON.stringify(r?.method||r?.unavailable));
    }
}
const data=JSON.stringify(result,null,2)+'\n';
fs.writeFileSync(output,output.endsWith('.gz') ? zlib.gzipSync(data) : data);
