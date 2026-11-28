// Replay each original action on its own saved prefix. No historical schema converters.
// Snapshot only on the immutable reference; classifications never waive comparison failures.
import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {checkEvents} from './mechanical_invariants.mjs';
import {engineAt,recordOutput} from './replay.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const dir=path.join(root,'tests/replay/modern');
const sha='4b637c981459e1e5ff9f4bd480bc071723fe5bce';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const gz=name=>JSON.parse(gunzipSync(fs.readFileSync(path.join(dir,name+'.json.gz'))));
const sources=JSON.parse(fs.readFileSync(path.join(dir,'sources.json')));
const reference=path.join(dir,'baseline.json');
const record=process.argv.includes('--reference');
const engine=path.resolve(process.env.AVERETH_COMPARE_ENGINE || root);
if(record) {
    assert.equal(execFileSync('git',['-C',engine,'rev-parse','HEAD']).toString().trim(),sha);
    assert.equal(execFileSync('git',['-C',engine,'diff','HEAD','--','src','content','index.js']).length,0);
}
const E=await engineAt(engine);
const {assertOwnership}=await import(pathToFileURL(path.join(engine,'src/v4/world.js')));
assertOwnership(true);
const pool=gz('messages'), results={}, issues=[];
const lengths=[];
for(const arm of Object.keys(sources)){
    const run=gz(arm), chat=run.messages.map(k=>pool[k]);
    for(const [index,answers] of Object.entries(run.cases)){
        const i=Number(index), id=arm.split('20261127-')[1]+'#'+i;
        const copy=structuredClone(chat.slice(0,i+1)), msg=copy[i];
        delete msg.extra.avereth;
        const prompts=[], calls=[], unexpected=[];
        const llm=async req=>{
            const a=answers[calls.length];
            prompts.push([req.purpose,hash(req.messages)]);
            lengths.push([id,req.purpose,JSON.stringify(req.messages).length]);
            calls.push(req.purpose);
            if(!a || req.purpose!==a.purpose){
                unexpected.push(req.purpose);
                throw Object.assign(new Error('No matching physical response'),{code:'LLM_CANCELLED'});
            }
            return a.content;
        };
        let action=null;
        if(msg.is_user){
            if(chat[i].extra.avereth.command)msg.is_system=false;
            const result=await E.runtime.prepareGenerationAsync(copy,E.content,{llm});
            action=result.action;
            if(result.context && run.narrators[index]){
                const messages=run.narrators[index].map(m=>m.content.startsWith('[AVERETH ENGINE —')?{...m,content:result.context.text}:m);
                prompts.push(['narrator',hash(messages)]);
                lengths.push([id,'narrator',JSON.stringify(messages).length]);
            }
        }else if(E.runtime.processReplyAny(copy,i,E.content).extract){
            await E.runtime.runExtraction(copy,i,E.content,llm);
        }
        const r=E.host.rec(msg);
        const before=E.host.foldChat(copy,i), after=E.host.foldChat(copy);
        assert.equal(after.errors.length,0,id+' fold');
        const problems=E.validate.validateState(after.state,E.content).filter(p=>!E.validate.validateState(before.state,E.content).includes(p));
        assert.deepEqual(problems,[],id);
        const reloaded=E.host.foldChat(JSON.parse(JSON.stringify(copy)));
        assert.equal(hash(reloaded.state),hash(after.state),id+' persisted JSON state');
        const output=recordOutput(r,{action});
        // Stored HUD receipts bind input revisions. Mechanical events must survive the same fold from disk.
        if(r) assert.equal(E.host.inputRecordError(msg,i),null,id);
        await checkEvents(E,before.state,r?.events || [],id);
        const entry={output:hash(output),world:hash(after.state),prompts,unused:Math.max(0,answers.length-calls.length),unexpected};
        if (process.env.AVERETH_REPLAY_AUDIT)
            fs.appendFileSync(process.env.AVERETH_REPLAY_AUDIT, JSON.stringify({id, entry, output, events:r?.events || []})+'\n');
        results[id]=entry;
    }
}
const classes={'reed-251#22':'fachlich_bestätigt','vale-242#24':'bekannter_fehler_akzeptiert','vale-242#34':'bekannter_fehler_akzeptiert'};
if(record) fs.writeFileSync(reference,JSON.stringify({sha,default_class:'beobachtet',classes,cases:results},null,1)+'\n');
else{
    const base=JSON.parse(fs.readFileSync(reference));
    const knownChanges=[];
    for(const id of new Set([...Object.keys(results),...Object.keys(base.cases)])){
        if(JSON.stringify(results[id])===JSON.stringify(base.cases[id])) continue;
        if(results[id] && base.cases[id] && base.classes[id]==='bekannter_fehler_akzeptiert') knownChanges.push(id);
        else issues.push(id);
    }
    console.log('Known-error cases changed (review required):',JSON.stringify(knownChanges));
    console.log('Changed cases:',JSON.stringify(issues));
}
if(process.env.AVERETH_MEASURES) fs.writeFileSync(process.env.AVERETH_MEASURES,JSON.stringify(lengths));
console.log('Cases',Object.keys(results).length,'incomplete physical paths',Object.entries(results).filter(([,v])=>v.unexpected.length).map(([id])=>id),'unused recorded follow-ups',Object.values(results).reduce((sum,v)=>sum+v.unused,0));
if(issues.length)process.exitCode=1;
