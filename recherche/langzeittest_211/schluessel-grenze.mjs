// Offline sensitivity check. Only the temporary catalog variant exposes the absent owner's item.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [checkout, data]=process.argv.slice(2);
const root=path.resolve(checkout,'avereth-engine');
const {engineAt}=await import(pathToFileURL(path.join(root,'tools/replay/replay.mjs')));
const {content,runtime,host}=await engineAt(root);
const original=readFileSync(path.join(data,'GA/chat-8.jsonl'),'utf8').trim().split('\n').map(JSON.parse).slice(1);
const id='obj.t22.old_iron_key';
for (const target of ['pc','npc.merrin','here']) {
    const ch=structuredClone(original),i=ch.length-1;
    delete ch[i].extra.avereth;
    ch[i].mes="Merrin rested beside the locked chain. Serra was still at her hut uphill. No one was coming down the path.";
    const stage=runtime.processReplyAny(ch,i,content); assert(stage.extract);
    const before=host.foldChat(ch.slice(0,i)).state;
    assert.equal(before.objects[id].holder.entity,'npc.serra');
    assert(!before.scene.present.includes('npc.serra'));
    assert(before.scene.present.includes('npc.merrin'));
    let calls=0,reason=null;
    await runtime.runExtraction(ch,i,content,async spec=>{
        if(calls++>0){reason=spec.messages.at(-1).content.split('Answer again')[0];throw Object.assign(Error('offline probe ends'),{code:'LLM_CAPACITY_BLOCKED'});}
        const d={seq:1,type:'object.move',object:id,to:target==='here'?before.scene.at:target};
        return {content:JSON.stringify({scene:'here',expected:{},deltas:[d]}),finish_reason:'stop'};
    });
    const result=host.foldChat(ch);assert.deepEqual(result.errors,[]);
    const x=ch[i].extra.avereth;
    console.log(JSON.stringify({target,before:before.objects[id].holder,after:result.state.objects[id].holder,calls,status:x.extraction.status,rejected:x.rejected,reason}));
}
