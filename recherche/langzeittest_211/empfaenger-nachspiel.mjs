import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const [repo, dir, kind]=process.argv.slice(2), engine=path.resolve(repo,'avereth-engine');
const {engineAt}=await import(pathToFileURL(path.join(engine,'tools/replay/replay.mjs')));
const {content,runtime,host}=await engineAt(engine);
const lines=p=>readFileSync(path.join(dir,p),'utf8').trim().split('\n').map(JSON.parse);
const loan=kind==='loan', first=loan?7201:7101;
const saved=lines(loan?'GA/chat-8.jsonl':'YA/chat-7.jsonl').slice(1), idx=saved.length-1;
const move=loan?{id:'obj.t22.old_iron_key',to:{entity:'pc'}}:saved[idx-1].extra.avereth.events.find(e=>e.t==='object.moved').d;
const journal=lines('physical.jsonl');
for(const r of journal.filter(r=>r.arm==='K3' && r.turn>=first && r.turn<first+4 && r.kind==='end')){
    const reply=JSON.parse(gunzipSync(readFileSync(path.join(dir,r.rawFile))));
    const ch=structuredClone(saved);
    delete ch[idx].extra.avereth;
    const before=host.foldChat(ch.slice(0,idx)).state;
    const stage=runtime.processReplyAny(ch,idx,content); assert(stage.extract);
    let calls=0,repairReason=null;
    await runtime.runExtraction(ch,idx,content,async spec=>{
        if(calls++>0){repairReason=spec.messages.at(-1).content.split('Answer again')[0];throw Object.assign(Error('no additional physical repair authorized for this subtest'),{code:'LLM_CAPACITY_BLOCKED'});}
        return {content:reply.choices[0].message.content,finish_reason:reply.choices[0].finish_reason,usage:reply.usage};
    });
    const after=host.foldChat(ch);assert.deepEqual(after.errors,[]);
    const x=ch[idx].extra.avereth;
    console.log(JSON.stringify({id:r.id,variant:[first+1,first+2].includes(r.turn)?'IDs':'original',calls,status:x.extraction.status,
        holder:after.state.objects[move.id].holder,
        error:x.extraction.error,repairReason,target:move.to.entity,newObjects:Object.keys(after.state.objects).filter(k=>!before.objects[k]),newPeople:Object.keys(after.state.entities).filter(k=>k.startsWith('npc.')&&!before.entities[k]),
        relevantFacts:(x.extraction.raw?.deltas||[]).filter(q=>['fact','person.new','person.named','learn'].includes(q.type)),
        refused:x.rejected||[],cost:r.usage?.cost}));
}
