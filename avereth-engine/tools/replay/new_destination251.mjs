import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {engineAt} from './replay.mjs';
import {explicitJourneyClause} from '../../src/v4/known_routes.js';
const {runtime,host,content}=await engineAt(new URL('../..',import.meta.url).pathname);
const rows=gunzipSync(fs.readFileSync(process.argv[2])).toString().trimEnd().split('\n').slice(1).map(JSON.parse);
for (const opening of ['I skirt the main road','I return to the market the way I came']) {
    const index=rows.findIndex(m=>m.is_user && m.mes.startsWith(opening));
    assert.ok(index>0);
    const chat=structuredClone(rows.slice(0,index)),source=rows[index];
    chat.push({is_user:true,mes:source.mes,extra:{}});
    const calls=[];
    await runtime.prepareGenerationAsync(chat,content,{llm:async req=>{
        calls.push(req.purpose);
        return calls.length===1 ? host.rec(source).plan.raw[0] : JSON.stringify({commands:[{seq:1,type:'go',to:{new:'market of Alderwatch'},quote:source.mes.split('.')[0]}]});
    }});
    assert.deepEqual(calls,['plan','plan_repair']);
    assert.equal(host.foldChat(chat).state.last.outcome.auth.gos.length,1);
}
for (const input of ['I walk to the counter.',"I walk to the town's market?","I don't go to the town’s market.",'I ask if we can go back the way we came.','I want to go to the town’s market tomorrow.'])
    assert.equal(explicitJourneyClause(input),false,input);
console.log('Two original omissions/mistyped targets, bounded P repair with synthetic corrected plan; five negative controls.');
