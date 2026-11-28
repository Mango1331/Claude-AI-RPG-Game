// Synthetic world sizes on the Heron end state; no shortened or fabricated provider replies.
// N includes recorded ST history, plus the newly generated authoritative engine context.
import fs from 'node:fs';
import os from 'node:os';
import {gunzipSync} from 'node:zlib';
import {foldChat, messageEvents} from '../../src/host.js';
import {buildContext} from '../../src/context.js';
import {buildCatalog, extractorCatalog} from '../../src/v4/catalog.js';
import {catalogText, interpreterRequest} from '../../src/v4/interpret.js';
import {worldVocab, extractorRequest} from '../../src/v4/extract.js';
import {loadProductContent} from '../../tests/helpers.js';
import assert from 'node:assert/strict';
const load = name=>JSON.parse(gunzipSync(fs.readFileSync(new URL('../../tests/replay/modern/'+name+'.json.gz',import.meta.url))));
const pool = load('messages'), run = load('openrouter-20261127-heron-250');
const chat = run.messages.map(k=>pool[k]);
const base = foldChat(chat).state, content = await loadProductContent();
const exemplar = Object.values(base.quests).find(q=>q.status==='active');
const npc = Object.values(base.entities).find(e=>e.kind==='npc');
const envelope = Object.values(run.narrators).at(-1);
const size = v => Buffer.byteLength(typeof v==='string' ? v : JSON.stringify(v));
const records = [];
const scenarios = {original:[0,0,0,0], typical:[25,50,20,5], bag:[200,0,0,0],
    sites:[0,1000,0,0], people:[0,0,150,0], jobs:[0,0,0,30], large:[200,1000,150,30]};
function measure(fn) {
    for(let i=0;i<4;i++) fn();
    const samples=[];
    for(let i=0;i<25;i++){const t=performance.now();fn();samples.push(performance.now()-t);}
    samples.sort((a,b)=>a-b);
    return {median_ms:+samples[12].toFixed(3),p90_ms:+samples[22].toFixed(3)};
}
for(const [scenario,[items, places, people, quests]] of Object.entries(scenarios)){
    const s=structuredClone(base),at=s.scene.at,parent=s.places[at]?.parent || at;
    for(let i=0;i<items;i++){
        const id='obj.synthetic_'+i;
        s.objects[id]={id,name:'Synthetic trinket '+i,qty:1,holder:{entity:'pc'}};
    }
    for(let i=0;i<places;i++){
        const id='loc.synthetic_'+i;
        s.places[id]={id,name:'Synthetic meadow '+i,kind:'site',parent,known:true,by:'reply'};
    }
    for(let i=0;i<people;i++){
        const id='npc.synthetic_'+i;
        s.entities[id]={...structuredClone(npc),id,name:'Synthetic traveller '+i,at};
        s.scene.present.push(id);
    }
    for(let i=0;i<quests;i++){
        const id='quest.synthetic_'+i;
        s.quests[id]={...structuredClone(exemplar),id,title:'Synthetic contract '+i,status:'active'};
    }
    const player='I look around the hunting site.';
    function build(){
        const pc=buildCatalog(s,content,{c:true,known:true}),xc=extractorCatalog(s,content,{c:true});
        const p=interpreterRequest(content.commandVocab,pc,player).messages;
        const n=buildContext(s,content,{input:player,outcome:s.last?.outcome}).text;
        const x=extractorRequest(worldVocab(content.deltaVocab,s),{catalog:xc.text,actions:'none',expectedKeys:{},player,reply:'The road is quiet.',startScene:at}).messages;
        return {p,n:envelope.map(m=>m.content.startsWith('[AVERETH ENGINE —') ? {...m,content:n}:m),x,pCatalog:catalogText(pc),xCatalog:xc.text,nContext:n};
    }
    const req=build();
    records.push({scenario,added:{items,places,people,quests},stateBytes:size(s),bytes:Object.fromEntries(Object.entries(req).map(([k,v])=>[k,size(v)])),build:measure(build)});
}
const folds=[];
for(const extra of [0,250,1000]){
    const messages=chat.concat(Array.from({length:extra},(_,i)=>({mes:'Synthetic quiet interval '+i,extra:{avereth:{events:[{t:'time.advanced',d:{minutes:1}}]}}})));
    const result=foldChat(messages);
    assert.deepEqual(result.errors,[]);
    assert.equal(result.state.clock.minute,base.clock.minute+extra);
    folds.push({extra,messages:messages.length,events:messages.reduce((sum,m)=>sum+messageEvents(m).length,0),chatBytes:size(messages),...measure(()=>foldChat(messages))});
}
console.log(JSON.stringify({node:process.version,cpu:os.cpus()[0].model,source:'Heron final chat',records,folds},null,2));
