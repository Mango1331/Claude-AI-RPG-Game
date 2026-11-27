import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {engineAt} from './replay.mjs';

const {runtime,host,content}=await engineAt(new URL('../..',import.meta.url).pathname);
for (const [arm,build,turn,start] of [['lantern',244,1,79],['lantern',244,2,79],['hearth',243,15,53],['hearth',243,16,53]]) {
    const file=path.join(process.argv[2], 'openrouter-20261127-'+arm+'-'+build, 'chat.jsonl.gz');
    const messages=gunzipSync(fs.readFileSync(file)).toString().trim().split('\n').slice(1).map(JSON.parse);
    const index=start+2*(turn-1), original=messages[index];
    const dest=turn===16?'loc.alderwatch.market_square':'loc.alderwatch.the_slaked_lime';
    for (const native of [false,true]) {
        const chat=structuredClone(messages.slice(0,index));
        chat.push({mes:native?'#go '+dest:original.mes,is_user:true,extra:{}});
        let calls=0;
        const result=await runtime.prepareGenerationAsync(chat,content,{llm:async()=>{
            assert.ok(!native,'native route invoked planner');
            return host.rec(original).plan.raw[calls++];
        }});
        assert.equal(result.action,'context');
        assert.ok(host.foldChat(chat).state.last.outcome.auth.gos.some(go=>go.to===dest));
        console.log(arm,turn,native?'native':'original planner',dest);
    }
}
