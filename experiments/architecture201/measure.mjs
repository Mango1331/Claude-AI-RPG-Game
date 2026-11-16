// Offline measurement. No token estimator, provider latency or natural quality score is invented.
import fs from 'node:fs';import {fixtures} from './fixtures.mjs';import {harness,semantic} from './harness.mjs';
import {foldChat,rec} from './engine.mjs';import {digest,copy} from './journal.mjs';
const rows=[];
for(const f of fixtures())for(const variant of ['B','C1']) {
    const h=harness(f,variant);await h.prototype.run('t1',f,h.transport);const db=h.journal.read(),turn=db.turns.t1;
    rows.push({case:f.name,variant,origin:f.origin,C1response:variant==='C1'?'derived from original/synthetic B prose and world answer; NOT naturally generated':null,
        calls:db.requests.length,prompts:db.requests.map(({phase,promptChars,wireBytes,promptHash})=>({phase,utf16Characters:promptChars,messagesJsonUtf8Bytes:wireBytes,promptHash})),
        summedPromptCharacters:db.requests.reduce((n,r)=>n+r.promptChars,0),peakCapacity:Math.max(...db.requests.map(r=>r.occupancy)),
        phases:turn.trace,final:turn.phase,worldRevision:db.world.revision,publishedMessages:h.host.dom.size,
        semanticStateHash:digest(semantic(foldChat(db.world.chat).state)),
        playerEvents:rec(turn.prepared.chat.at(-1)).events.map(e=>e.t),worldEvents:rec(db.world.chat.at(-1)).events.map(e=>e.t),
        bindingSpans:variant==='C1'?f.joint.links.map(l=>({target:l.target,start:l.start,end:l.end})):undefined});
}
const f=fixtures().find(f=>f.name==='new_person'),h=harness(f,'C1'),bad=copy(f.joint);bad.links[0].quote='invalid evidence';
await h.prototype.run('t1',f,req=>req.phase==='joint'?JSON.stringify(bad):h.transport(req));
const correction=h.journal.read().requests.map(({phase,promptChars,wireBytes})=>({phase,utf16Characters:promptChars,messagesJsonUtf8Bytes:wireBytes}));
const report={product:'4.3.0-c.6.6.200',base:'0cd14806cd0c7fe2ab0d54b8463c486ee572714b',measurement:'complete messages actually passed to the offline scheduler; UTF-16 string length and serialized UTF-8 bytes; NOT provider tokens or full production ST injections',
    rows,correction:{case:'new_person',variant:'C1',calls:correction.length,prompts:correction},
    semanticAcceptance:{passed:false,counterexamples:['contradictory authorized arrival is accepted','narrated promise omitted from world is not discovered'],note:'Observed limits, not successful quality tests. B with an equally incorrect extractor answer shares the underlying guard limitation.'}};
fs.mkdirSync(new URL('./results/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./results/measurements.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
for(const r of rows)console.log(r.case,r.variant,r.calls,r.summedPromptCharacters,r.semanticStateHash.slice(0,10));
console.log('C1 correction:',JSON.stringify(report.correction));
