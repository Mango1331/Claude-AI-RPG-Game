// Measure the actual edit entry point on two old chats. Edits need no provider to invalidate an active suffix.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

const [reference, candidate] = process.argv.slice(2);
assert(candidate, 'node revisionszeit.mjs REFERENCE CANDIDATE');
const arms = await Promise.all([reference, candidate].map(async path => {
    const root = resolve(path,'avereth-engine');
    const { engineAt } = await import(pathToFileURL(join(root,'tools/replay/replay.mjs')));
    const engine = await engineAt(root);
    const head = execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
    return {...engine, head};
}));
const results = [];
for (const name of ['b18-warrior','b19-mage']) {
    const { chat } = JSON.parse(gunzipSync(readFileSync(join(reference,'avereth-engine/tests/replay/corpus',name+'.json.gz'))));
    const index = chat.findIndex((m,i) => i>chat.length/3 && !m.is_user && m.extra?.avereth?.extraction?.status==='applied');
    assert(index>=0);
    const suffix = chat.slice(index+1).filter(m=>m.extra?.avereth).length;
    for(let round=0;round<8;round++) {
        for(const side of round%2?[1,0]:[0,1]) {
            const E=arms[side], rows=structuredClone(chat);
            E.runtime.refreshRevisionDisplay?.(rows);
            E.host.foldChat(rows);
            const old=E.host.rec(rows[index]).events.length;
            rows[index].mes='Alaric remains where he is and listens.';
            const start=performance.now();
            E.runtime.onEditedV4(rows,index,E.content,{hud:'closed'});
            const editMs=performance.now()-start;
            const folded=E.host.foldChat(rows);
            const foldMs=performance.now()-start-editMs;
            assert.equal(folded.errors.length,0);
            const inactive=rows.slice(index+1).filter(m=>m.avereth_inactive).length;
            const eventsAtEdit=E.host.rec(rows[index]).events.length;
            if(side===0) assert.equal(eventsAtEdit,old);
            if(side===1) { assert(inactive>=suffix); assert.equal(E.host.rec(rows[index]).extraction.status,'pending'); }
            if(round>=2) results.push({name, index, messages:rows.length, priorReplyEvents:old, eventsAtEdit,
                recordedSuffix:suffix, inactive, round, side, editMs, foldMs});
        }
    }
}
console.log(JSON.stringify({node:process.version, heads:arms.map(e=>e.head), scope:'Synchronous host edit + subsequent fold, without browser, I/O or extraction. Separate chat copies, two warm-up rounds excluded.',results},null,2));
