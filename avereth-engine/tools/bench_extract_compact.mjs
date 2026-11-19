// Retrospective A/B over identical revisions and controlled answers, with no inference.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { buildContext } from '../src/context.js';
import { playerTurnV4 } from '../src/v4/turn.js';
import { rec,foldChat } from '../src/host.js';
import { extractionRequest,runExtraction } from '../src/v4/runtime.js';
import { archived } from './bench_extract_archive.mjs';
import { expectations } from './bench_extract_expectations.mjs';
import { pendingChat,readPhysical,judge,replayJobs,measures,COMPACT } from './bench_extract.mjs';

function compact(text,vocab) {
    let obj;
    try { obj=JSON.parse(text); } catch { return text; } // a broken original remains broken
    if (!Array.isArray(obj?.deltas)) return text;
    for (const d of obj.deltas) {
        const fields=vocab.deltas.find(spec=>spec.type===d?.type)?.fields;
        if (!fields) continue;
        for (const [k,v] of Object.entries(d))
            if (v===null && (k==='scene' || fields[k]?.nullable)) delete d[k];
    }
    return JSON.stringify(obj);
}
function normalized(parsed) {
    const {raw,...result}=parsed; // raw denotes lexical form only
    return result;
}
const middle=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const sizes=[], results=[];
const corpus=await archived(process.argv[2]);
for (const prep of corpus) {
    const answers=new Map(),pa=[],pb=[];
    for (const item of prep.items) {
        const req=extractionRequest(pendingChat(prep.chat,item.id),item.id,prep.content);
        const a=measures(item.resp,null).text,b=compact(a,req.vocab),prose=prep.chat[item.id].mes;
        const read=text=>readPhysical(text,req,prep.content,prose);
        assert.deepEqual(normalized(read(b)),normalized(read(a)));
        const criteria=expectations(prep.name,item.id);
        assert.deepEqual(judge(item,b,prep.content,prep.chat,criteria),judge(item,a,prep.content,prep.chat,criteria));
        // Warm both forms above. Alternate order, five timed parses per form and physical record.
        for(let i=0;i<5;i++) for(const [text,times] of (i%2 ? [[b,pb],[a,pa]] : [[a,pa],[b,pb]])){
            const start=performance.now();read(text);times.push(performance.now()-start);
        }
        answers.set(item.n,b);
        sizes.push({name:prep.name,id:item.id,n:item.n+1,a,b,reportedCompletion:item.resp.usage.completion_tokens});
    }
    const a=await replayJobs(prep),b=await replayJobs(prep,(_,item,sent)=>{
        assert(sent.messages[0].content.endsWith(COMPACT));
        return answers.get(item.n);
    },{variant:'B'});
    for(const [i,row] of b.entries()) {
        assert.deepEqual(row.evidence,a[i].evidence);
        assert.deepEqual(row.rejected,a[i].rejected);
        assert.deepEqual(row.calls.map(c=>c.purpose),a[i].calls.map(c=>c.purpose));
        assert(row.reloadEqual && a[i].reloadEqual && !row.gap && row.status==='applied');
    }
    results.push({name:prep.name,physical:prep.items.length,jobs:a.length,used:a.reduce((n,j)=>n+j.calls.length,0),
        repairs:a.reduce((n,j)=>n+j.calls.length-1,0),medianParseMs:{a:middle(pa),b:middle(pb)}});
}

// A real reunion scene, with a controlled structured answer. Advance beyond short prose history.
// The late context receives the folded saved world and a fresh player line only.
const content=corpus[0].content,id=54;
const chat=zlib.gunzipSync(fs.readFileSync(new URL('../tests/v4/fixtures/user02_157.jsonl.gz',import.meta.url))).toString().trim().split('\n').map(JSON.parse).slice(1);
const promise="Tam Ostler expects Alaric to buy him a drink with the first quest's pay";
const raw=JSON.stringify({scene:'here',expected:{},deltas:[{seq:1,type:'thread',kind:'promise',id:null,text:promise,
    who:['pc','npc.npcguild_clerk'],status:'open',resolution:null,scene:null}]},null,2);
// The reply is at the counter. An invented voluntary departure must not move the player.
const invented=JSON.parse(raw);
invented.deltas.push({seq:2,type:'arrive',at:'loc.glassmere',with:null,forced_by:null,scene:null});
const source=JSON.stringify(invented), pre=extractionRequest(pendingChat(chat,id),id,content);
for (const answer of [source,compact(source,pre.vocab)]) {
    const result=judge({id},answer,content,chat,[{name:'remain at the counter',test:({state,events})=>
        state.scene.at===pre.startScene && !events.some(e=>e.t==='scene.moved')}]);
    assert(result.valid && result.semanticComplete && result.rejections.some(d=>d.type==='arrive'));
}
let reference;
for(const mode of ['A','B']){
    const c=pendingChat(chat,id),req=extractionRequest(c,id,content);
    await runExtraction(c,id,content,()=>mode==='A'?raw:compact(raw,req.vocab));
    assert.equal(rec(c[id]).extraction.status,'applied');
    let state=foldChat(JSON.parse(JSON.stringify(c))).state;
    const startTurn=state.turn;
    for(let i=0;i<16;i++)
        state=playerTurnV4(state,content,'I listen.',{c:true,commands:[],msg:id+1+i*2}).state;
    assert.equal(state.turn,startTurn+16);
    const text=buildContext(state,content,{input:'I speak to Tam.',outcome:state.last.outcome,budget:1400}).text;
    assert(text.includes(promise));
    assert(Object.values(state.threads).some(t=>t.kind==='promise' && t.text===promise &&
        t.who?.includes('pc') && t.who.includes('npc.npcguild_clerk')));
    if(reference) assert.deepEqual(state,reference);
    reference=state;
}
console.log(JSON.stringify(process.argv.includes('--token-samples') ? sizes : {results,lateRecallTurns:16}));
