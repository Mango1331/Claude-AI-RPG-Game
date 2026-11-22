// Usage: node offline.mjs MAIN SUITE REFERENCE ; TOKEN_PYTHON, AVERETH_GLM_TOKENIZER and AVERETH_GLM_TEMPLATE as in the report.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const [main,suite,ref]=process.argv.slice(2).map(p=>path.resolve(p));
const moduleAt=(root,p)=>import(pathToFileURL(path.join(root,'avereth-engine',p)));
const {archived}=await moduleAt(suite,'tools/bench_extract_archive.mjs');
const {pendingChat,judge,variantBody}=await moduleAt(suite,'tools/bench_extract.mjs');
const {extractionRequest}=await moduleAt(suite,'src/v4/runtime.js');
const {expectations}=await moduleAt(suite,'tools/bench_extract_expectations.mjs');
const {extractJsonObject}=await moduleAt(suite,'src/v4/json.js');
const {turnBlock,foldChat}=await moduleAt(suite,'src/host.js');
const {boardFor}=await moduleAt(suite,'src/v4/runtime.js');
const {boardRequest}=await moduleAt(suite,'src/v4/guild.js');
const reference=await moduleAt(ref,'src/host.js');
const {parseServerLog}=await moduleAt(suite,'tools/run_report.mjs');
const {gearMarketText}=await moduleAt(suite,'src/v4/items.js');
const firstMarket=(await moduleAt(ref,'src/v4/items.js')).gearMarketText;
const preps=await archived(main),content=preps[0].content;
const full=firstMarket(content),short=gearMarketText(content,false,'catalog');
assert.equal(gearMarketText(content),full);
const input={market:[],systems:{},x:[],context:[],boards:[]}, ablations=[];
// Hypothetical lexical routing arm. All outcomes below are controlled scenarios, not inference.
const gearClue=/\b(?:trade|buy|sell|price|offer|gear|armou?r|sword|staff|shield|gift|pay|cost|fee|service)s?\b/i;
const situations=[
    ['trade while fighting','While the scout lunges I buy the shield.','The shield costs four silver.',true],
    ['gift','I listen.','She presses the moon-etched buckler into his palms.',true],
    ['conditional purchase','Only if it comes to less than three.','She nods and hands him the fine willow wand.',true],
    ['binding price','I accept your offer.','The smith repeats the agreed price.',true],
    ['genuine quality','Is there a better one?','The smith sets down a superior ash wand.',true],
    ['guild dues','I pay the Guild fee.','The clerk counts the coins.',false],
    ['service','Can you see to him?','The healer quotes a fee.',false],
    ['promise in combat','I guard the door.','The lookout promises to return the buckler at dawn.',false],
    ['free dialogue','I ask how the river runs.','She watches the river.',false],
];
const routing=situations.map(([scene,input,reply,needsGear])=>({scene,needsGear,planner:gearClue.test(input),extractor:gearClue.test(input+' '+reply)}));
assert(routing.some(r=>r.needsGear && !r.extractor));
const omitted={};
for(const p of preps){
    const replies=new Set(p.items.map(i=>i.id));
    for(const id of replies){
        const u=p.chat.slice(0,id).findLastIndex(m=>m.is_user);
        const block=(fn,budget)=>fn(p.chat,u,content,{budget,rulesBudget:800,recentTurns:4,engineLore:false});
        const a=block(reference.turnBlock,1400),b=block(turnBlock,1400);
        assert.deepEqual(a.errors,[]);
        assert.deepEqual(b.context,a.context);
        const key=p.name.startsWith('U5')?'User05':'User06';
        for(const name of b.context.dropped)omitted[key+'/'+name]=(omitted[key+'/'+name]||0)+1;
        input.context.push({key,full:b.context.text,lower:block(turnBlock,900).context.text});
    }
    for(const i of p.items){
        input.x.push({name:p.name,req:i.body,b:variantBody(i.body,'B').messages});
        const req=extractionRequest(pendingChat(p.chat,i.id),i.id,content);
        const raw=i.resp.choices[0].message.content;
        let obj;try{obj=JSON.parse(raw);}catch{continue;}
        if(!Array.isArray(obj?.deltas))continue;
        const keep=req.state.encounter ? /^(?:time|hostile|position|aware|intent|creature\.new|recover|overreach)$/ : /^(?!(?:hostile|position|aware|intent)$)/;
        const deltas=obj.deltas.filter(d=>keep.test(d.type));
        if(deltas.length===obj.deltas.length)continue;
        const read=text=>judge(i,text,content,p.chat,expectations(p.name,i.id));
        const a=read(raw),b=read(JSON.stringify({...obj,deltas}));
        ablations.push({case:p.name+'/'+i.id,request:i.n+1,lost:obj.deltas.filter(d=>!keep.test(d.type)).map(d=>d.type),
            valid:[a.valid,b.valid],world:[a.worldEqual,b.worldEqual],semantic:[a.semanticComplete,b.semanticComplete]});
    }
}
for(const part of ['','phase_b_','phase_c_']){
    const log=path.join(main,'testrun_10b/archiv/user-20261118-011503/originals',part+'completions.txt');
    const {pairs,errors}=parseServerLog(fs.readFileSync(log,'utf8').replaceAll('\r\n','\n'));
    assert.deepEqual(errors,[]);
    for(const {req,resp} of pairs){
        const sys=req.messages[0].content;
        const role=sys.startsWith('You read one reply')?'X':sys.startsWith('You are the command interpreter')?'P story':sys.startsWith('You are the intent planner')?'P combat':null;
        if(!role)continue;
        input.systems[role]=sys;
        assert.equal(req.messages.filter(m=>m.content.includes(full)).length,1);
        input.market.push({req,prompt:resp.usage.prompt_tokens});
    }
}
const bench=(file)=>JSON.parse(execFileSync(process.execPath,[path.join(suite,'avereth-engine/tools',file),main,'--token-samples'],{encoding:'utf8',maxBuffer:16_000_000}));
input.sizes=bench('bench_extract_compact.mjs');
for(const s of bench('board_slot_offline.mjs')){
    const chat=s.name==='User04' ? gunzipSync(fs.readFileSync(path.join(main,'testrun_10b/archiv/user-20261106-072640/originals/chat.jsonl.gz'))).toString().trim().split('\n').map(JSON.parse).slice(1)
        : preps.find(p=>p.name===(s.name==='User05'?'U5A':'U6')).chat;
    const idx=11;
    const state=foldChat(chat,idx).state;
    const need=boardFor(state,content,JSON.parse(chat[idx].extra.avereth.plan.raw[0]).commands,{c:true});
    const oldRequest=boardRequest(state,content,need).messages;
    const proposed=boardRequest(state,content,need,null,true).messages;
    for(const [kind,wire] of [['initial',s.fullMessages[2].content],['valid',s.compact]]){
        const complete=extractJsonObject(wire).value;
        const reduced=structuredClone(complete);
        for(const l of reduced.listings)if(l.habitat){delete l.task;delete l.desired_end_state;}
        input.boards.push({name:s.name,kind,full:JSON.stringify(complete),short:JSON.stringify(reduced),oldRequest,proposed,reasoning_effort:s.reasoning_effort});
    }
}
const tokens=JSON.parse(execFileSync(process.env.AVERETH_TOKEN_PYTHON || 'python3',[fileURLToPath(new URL('tokens.py',import.meta.url))],
    {input:JSON.stringify({...input,full,short}),encoding:'utf8',maxBuffer:16_000_000}));
console.log(JSON.stringify({tokens,ablations,routing,dropped:omitted},null,2));
