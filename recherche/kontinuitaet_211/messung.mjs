// Local work only. Feed the archived model replies to each runtime; never open a network connection.
import { strict as assert } from 'node:assert';
import { readFileSync,writeFileSync,mkdtempSync,rmSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { gzipSync,gunzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { isDeepStrictEqual } from 'node:util';

const [base,candidate,output] = process.argv.slice(2);
if (!output) throw Error('Usage: node messung.mjs REFERENCE_CHECKOUT CANDIDATE_CHECKOUT OUTPUT_DIR');
const root = resolve(import.meta.dirname,'../..');
const prefix = join(root,'testrun_10b/openrouter-20261124-kontinuitaet-');
const samples = [['b-210',700],['zusatz-wren-210',900]];
const parseRows = file => gunzipSync(readFileSync(file)).toString().trim().split('\n').map(JSON.parse);
const engines = await Promise.all([base,candidate].map(async c => {
    const engine = resolve(c,'avereth-engine');
    const load = file => import(pathToFileURL(join(engine,file)));
    const {foldChat,turnBlock} = await load('src/host.js');
    const {extractionRequest} = await load('src/v4/runtime.js');
    const {loadProductContent} = await load('tests/helpers.js');
    const content = await loadProductContent();
    const card = readFileSync(join(engine,'content/narrator/Avereth_Narrator_Contract_v4.txt'),'utf8').replaceAll('{{user}}','Alaric').trim();
    return {foldChat,turnBlock,extractionRequest,content,card};
}));
const pairs=[], trials=[], roles=[];
for (const [name,offset] of samples) {
    const dir = prefix + name;
    const path = mkdtempSync(join(tmpdir(),'avereth211-pairs-'));
    let replay;
    try {
        const msgs=join(path,'paired.gz');
        replay=JSON.parse(execFileSync(process.execPath,[join(root,'recherche/kontinuitaet_210/archivreplay.mjs'),
            dir,base,candidate,msgs,String(offset)],{maxBuffer:40*1024*1024}));
        pairs.push(...JSON.parse(gunzipSync(readFileSync(msgs))));
    } finally {
        rmSync(path,{recursive:true});
    }
    for (const rev of replay.results) roles.push({source:name,turn:rev.turn,side:rev.side,calls:rev.calls,mismatches:rev.mismatches});
    const chat = parseRows(join(dir,'original-chat.jsonl.gz')).filter(m=>typeof m.mes==='string');
    const turns = JSON.parse(readFileSync(join(dir,'browserzeiten.json')));
    const journal = parseRows(join(dir,'provider-journal.jsonl.gz'));
    for (const {n,inputMessageIndex:i} of turns) {
        const req = journal.find(r=>r.kind==='start' && r.turn===n+offset && r.role==='narrator');
        if(!req) continue;
        const getBlock = engine => engine.turnBlock(chat,i,engine.content,{budget:1400,rulesBudget:800,engineLore:false}).context.text;
        const messages=req.body.messages;
        const slot=messages.findIndex(m=>m.role==='system' && m.content.startsWith('[AVERETH ENGINE'));
        const card=messages.findIndex(m=>m.role==='system' && m.content.startsWith('AVERETH RPG — SANDBOX NARRATOR CONTRACT'));
        assert.ok(slot>=0 && card>=0);
        const [a,b]=engines.map(e=>{
            const copy=structuredClone(messages);
            copy[slot].content=getBlock(e);
            copy[card].content=e.card;
            return copy;
        });
        assert.ok(isDeepStrictEqual(a,messages), 'Archived Narrator slots differ at '+name+' / '+n);
        pairs.push({purpose:'narrator',n,id:req.id,a,b,archived:messages});
        trials.push(engines.map(e=>()=> {
            e.foldChat(chat,i+1);
            getBlock(e);
            // Rebuild the X request on its original reply before any extraction or later chat entry.
            const pending=chat.slice(0,i+2);
            const msg=pending[i+1]=structuredClone(pending[i+1]);
            const record=msg.extra.avereth;
            record.events=[];
            record.extraction={status:'pending'};
            assert.ok(e.extractionRequest(pending,i+1,e.content));
        }));
    }
}
writeFileSync(join(output,'promptpaare.json.gz'),gzipSync(JSON.stringify(pairs)));
writeFileSync(join(output,'aufrufe.json'),JSON.stringify(roles,null,2)+'\n');
const timings=[];
for(let round=0;round<8;round++){
    for(const arm of round%2?[1,0]:[0,1]){
        const t=performance.now();
        for(const pair of trials) pair[arm]();
        if(round>=2) timings.push({round,arm,ms:performance.now()-t});
    }
}
writeFileSync(join(output,'laufzeit.json'),JSON.stringify({node:process.version,source:samples,turns:trials.length,
    statistic:'wall ms for one complete pass of fold + narrator block + extractor request, paired order alternates; first two rounds discarded as warmup',timings},null,2)+'\n');
