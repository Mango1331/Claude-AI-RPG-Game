// Restore actual final wire arrays from ST's local debug logs, joined in per-arm send order.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseServerLog} from '../../run_report.mjs';
const [root,ref,suite]=process.argv.slice(2).map(p=>path.resolve(p));
const mod=(dir,p)=>import(pathToFileURL(path.join(dir,'avereth-engine',p)));
const {loadContentPack}=await mod(suite,'src/content.js');
const content=await loadContentPack(k=>JSON.parse(fs.readFileSync(path.join(suite,'avereth-engine/content',k))));
const old=(await mod(ref,'src/v4/items.js')).gearMarketText(content),short=(await mod(suite,'src/v4/items.js')).gearMarketText(content,false,'catalog');
const logs=fs.readFileSync(path.join(root,'physical.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const rows=[];
for(const arm of ['A','B']){
    const {pairs,errors}=parseServerLog(fs.readFileSync(path.join(root,arm+'-st.log'),'utf8'));
    assert.deepEqual(errors,[]);
    const starts=logs.filter(r=>r.kind==='start'&&r.arm===arm);
    assert.equal(pairs.length,starts.length);
    for(const [i,p] of pairs.entries()){
        const r=starts[i];
        const b=p.req;
        for(const [k,v] of Object.entries(r.params))if(b[k]!==undefined)assert.deepEqual(JSON.parse(JSON.stringify(b[k])),v);
        rows.push({id:r.id,arm,stage:r.stage,turn:r.turn,role:r.role,messages:b.messages,hash:r.messagesHash,
            reasoning_effort:b.reasoning_effort,clear_thinking:b.clear_thinking,
            boardFormat:r.role==='board'?(/"slot":\d+,"listing"/.test(b.messages[0].content)?'slot':b.messages.length>2?'full-repair':b.messages[0].content.includes('omit task and desired_end_state')?'short-initial':'full-initial'):null});
    }
}
fs.writeFileSync(path.join(root,'wire.json'),JSON.stringify({old,short,rows}));
