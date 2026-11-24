// Compare the accepted extractor result from one real turn on three checkouts.
// The observed chat prefix is restored for each row, including the active swipe.
// Usage: node replay_crossover.mjs chat.jsonl repoA repoB repoC > comparison.json
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const [chatFile, ...roots] = process.argv.slice(2);
if (roots.length !== 3) throw new Error('Expected a chat JSONL and three repository roots');
const bytes = readFileSync(chatFile);
const decoded = (chatFile.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8');
const rows = decoded.trim().split(/\r?\n/).map(JSON.parse);
const chat = rows.filter(row => typeof row.mes === 'string');
const digest = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const arms = await Promise.all(roots.map(async root => {
    const dir = resolve(root,'avereth-engine');
    const load = name => import(pathToFileURL(join(dir, name)));
    const {loadContentPack} = await load('src/content.js');
    const content = await loadContentPack(async name => JSON.parse(readFileSync(join(dir,'content',name),'utf8')));
    return {content, runtime:await load('src/v4/runtime.js'), host:await load('src/host.js'),
        extractor:await load('src/v4/extract.js'), commit:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim()};
}));
function summary(record, state) {
    const events = record.events ?? [];
    const moved = events.filter(e=>e.t==='scene.moved').map(e=>e.d.at);
    const count = events.reduce((result, e) => { result[e.t]=(result[e.t]??0)+1; return result; },{});
    return {at:state.scene.at, present:[...(state.scene.present??[])].sort(), arrived:moved,
        rejected:(record.rejected??[]).map(r=>[r.seq??null,r.type,r.rule]), events:count, stateHash:digest(state)};
}
const turns = [];
for (const [index,msg] of chat.entries()) {
    const saved = msg.extra?.avereth;
    if (saved?.extraction?.status !== 'applied' || !saved.extraction.raw) continue;
    const input = chat.slice(0,index).findLast(m=>m.is_user);
    const turn = {index,input:input?.mes,reported:saved.extraction.raw.deltas?.filter(d=>d.type==='arrive').map(d=>d.at)??[]};
    for (const [i, arm] of arms.entries()) {
        const prefix = structuredClone(chat.slice(0,index+1));
        delete prefix[index].extra.avereth;
        const {runtime, host, extractor, content} = arm;
        const received = runtime.processReplyAny(prefix,index,content);
        if (!received.extract) throw Error('Replay failed to open turn '+index);
        const req = runtime.extractionRequest(prefix,index,content);
        const parse = extractor.parseExtraction(JSON.stringify(saved.extraction.raw), req.vocab, req.ids, req.expectedKeys,
            {sceneRequired:req.sceneRequired,startScene:req.startScene,state:req.state,content,explicitArrivals:req.sceneRequired,reply:msg.mes});
        // Deliberately apply exactly the value that won the original attempt/repair selection.
        // Reparsing the saved normal form above is a diagnostic, not a substitute generation.
        const result=runtime.applyExtraction(prefix,index,content,{valid:true,complete:!saved.extraction.missing?.length,
            missing:saved.extraction.missing??[],value:structuredClone(saved.extraction.raw)},
            {hash:req.hash,ms:saved.extraction.ms,repaired:saved.extraction.repaired});
        const fold=host.foldChat(prefix);
        if(!result.applied || fold.errors.length) throw Error('World application failed at '+index);
        turn['ABC'[i]]={...summary(host.rec(prefix[index]),fold.state),
            normalizedParser:{valid:parse.valid,complete:parse.complete,issues:(parse.issues||[]).length}};
        if(i===0) turn.observed=summary(saved,host.foldChat(chat,index+1).state);
    }
    turns.push(turn);
}
console.log(JSON.stringify({sourceHash:createHash('sha256').update(bytes).digest('hex'),branches:arms.map(a=>a.commit),turns},null,2));
