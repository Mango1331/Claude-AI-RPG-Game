// node originalwege.mjs /path/to/avereth-engine ; offline, one independent prefix per input.
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const engine=resolve(process.argv[2]);
const {engineAt}=await import(pathToFileURL(resolve(engine,'tools/replay/replay.mjs')));
const {runtime,host,content}=await engineAt(engine);
for (const [run,turns,start] of [['lantern-244',[1,2,3,4],79],['hearth-243',[15,16,17],53]]) {
    const file=new URL('../../testrun_10b/openrouter-20261127-'+run+'/chat.jsonl.gz',import.meta.url);
    const rows=gunzipSync(fs.readFileSync(file)).toString().trimEnd().split('\n').slice(1).map(JSON.parse);
    for (const turn of turns) {
        const index=start+2*(turn-1),chat=structuredClone(rows.slice(0,index));
        const original=rows[index],reply=rows[index+1],record=host.rec(original);
        const before=host.foldChat(chat).state;
        chat.push({is_user:true,mes:original.mes,extra:{}});
        let n=0;
        const result=await runtime.prepareGenerationAsync(chat,content,{llm:async()=>record.plan.raw[Math.min(n++,record.plan.raw.length-1)]});
        const auth=host.foldChat(chat).state.last?.outcome?.auth;
        const extracted=host.rec(reply)?.extraction?.raw;
        if (result.action==='context' && extracted) {
            chat.push({is_user:false,mes:reply.mes,extra:{}});
            runtime.processReplyAny(chat,index+1,content);
            await runtime.runExtraction(chat,index+1,content,async()=>JSON.stringify(extracted));
        }
        const end=host.foldChat(chat);
        console.log(JSON.stringify({run,turn,from:before.scene.at,action:result.action,gos:auth?.gos?.map(g=>g.to),approach:auth?.approach?.text,extract:host.rec(chat[index+1])?.extraction?.status,at:end.state.scene.at,people:end.state.scene.present,coin:end.state.entities.pc.sheet.coin_cp-before.entities.pc.sheet.coin_cp,errors:end.errors}));
    }
}
