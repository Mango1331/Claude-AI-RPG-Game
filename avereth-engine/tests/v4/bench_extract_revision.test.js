import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import http from 'node:http';
import {loadProductContent} from '../helpers.js';
import {hash32} from '../../src/util.js';
import {extractionRequest} from '../../src/v4/runtime.js';
import {pendingChat,judge,extractorRequests,callApi} from '../../tools/bench_extract.mjs';

const chat = zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user02_157.jsonl.gz',import.meta.url))).toString().trim().split('\n').map(JSON.parse).slice(1);
const id=54, content=await loadProductContent(), tam='npc.npcguild_clerk';
const promise={seq:1,type:'thread',kind:'promise',id:null,text:"Tam expects Alaric to buy him a drink with his first quest pay",who:['pc',tam],status:'open',resolution:null};
const item={id,hash:hash32(chat[id].mes),swipe:chat[id].swipe_id};
const check=deltas=>judge(item,JSON.stringify({scene:'here',expected:{},deltas}),content,chat,[
    {name:'drink owed to Tam',test:({events})=>events.some(e=>e.t==='thread.set' && e.d.thread.kind==='promise' &&
        e.d.thread.who?.includes(tam) && e.d.thread.who.includes('pc') && /drink/.test(e.d.thread.text))},
    {name:'stay at the Guild counter',test:({state})=>state.scene.at==='loc.glassmere.guild_hall'},
    {name:'no invented land grant',test:({state})=>!Object.values(state.facts).some(f=>f.o==='owner of the western fields')},
]);
test('the judge distinguishes the actual party and a missing promise even on parser-valid replies',()=>{
    assert.equal(check([promise]).semanticComplete,true);
    for(const deltas of [[],[{...promise,who:['pc','npc.other_clerk']}],[{...promise,who:['pc']}]]){
        const result=check(deltas);assert(result.valid);assert.deepEqual(result.missingRequirements,['drink owed to Tam']);
    }
});
test('an invented additional fact is visible even if schema and firewall accept it',()=>{
    const result=check([promise,{seq:2,type:'fact',s:tam,p:'occupation',o:'owner of the western fields'}]);
    assert(result.valid);assert(result.missingRequirements.includes('no invented land grant'));assert(!result.eventsEqual);
});
test('a superseded swipe cannot contribute its events; the physical request remains visible',()=>{
    const copy=structuredClone(chat), pending=pendingChat(copy,id);
    const req=extractionRequest(pending,id,content), old=copy[id].mes, msg=copy[id];
    msg.mes='Alaric stays silent.';msg.swipes=[old,msg.mes];msg.swipe_id=1;
    assert.equal(judge(item,'{}',content,copy).valid,false);
    const [mapped]=extractorRequests([{req}],copy,content);
    assert.equal(mapped.id,null);assert.match(mapped.mapping,/swipe/);
    assert.equal(chat[id].mes,old);
});
test('total latency includes the delayed response body',async()=>{
    const server=http.createServer((_,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.flushHeaders();
        setTimeout(()=>res.end('{"choices":[]}'),100);});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    try { const result=await callApi({}, {base:'http://127.0.0.1:'+server.address().port,key:'mock'});assert(result.json);assert(result.ms>=90); }
    finally {await new Promise(r=>server.close(r));}
});
