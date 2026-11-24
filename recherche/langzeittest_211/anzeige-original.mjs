import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [checkout, root] = process.argv.slice(2);
const base=path.resolve(checkout,'avereth-engine');
const {engineAt}=await import(pathToFileURL(path.join(base,'tools/replay/replay.mjs')));
const {content,host,runtime}=await engineAt(base);
const readLines=f=>readFileSync(f,'utf8').trim().split('\n').map(JSON.parse);
const chat=readLines(path.join(root,'HB','chat-13.jsonl')).slice(1);
const ends=readLines(path.join(root,'physical.jsonl')).filter(e=>e.arm==='HB' && e.turn===13 && e.kind==='end' && ['planner','extractor'].includes(e.role));
let i=0;
async function original({purpose}){
    const r=ends[i++];assert.equal(r.role,purpose.startsWith('plan')?'planner':'extractor');
    const response=JSON.parse(gunzipSync(readFileSync(path.join(root,r.rawFile))));
    return {content:response.choices[0].message.content,finish_reason:response.choices[0].finish_reason,usage:response.usage};
}
const assistant=chat.pop();
delete chat.at(-1).extra.avereth;
delete assistant.extra.avereth;
await runtime.prepareGenerationAsync(chat,content,{type:'normal',settings:{},llm:original});
chat.push(assistant);
const stage=runtime.processReplyAny(chat,chat.length-1,content);assert(stage.extract);
await runtime.runExtraction(chat,chat.length-1,content,original);
assert.equal(i,ends.length);
const {state,errors}=host.foldChat(chat);assert.deepEqual(errors,[]);
const reread=host.foldChat(JSON.parse(JSON.stringify(chat))).state;
assert.deepEqual(reread,state);
console.log(JSON.stringify({at:state.scene.at,object:state.objects['obj.t22.hooded_oilcloth'],drop:chat.at(-2).extra.avereth.plan.dropped,rejected:assistant.extra.avereth.rejected||[],calls:i}));
