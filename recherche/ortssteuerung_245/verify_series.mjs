// node verify_series.mjs /path/to/avereth-engine (product .248 or later). No provider access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=fileURLToPath(new URL('../../testrun_10b/',import.meta.url));
const {foldChat}=await import(pathToFileURL(path.resolve(process.argv[2],'src/host.js')));
const digest=b=>createHash('sha256').update(b).digest('hex');
const gz=(dir,file)=>gunzipSync(fs.readFileSync(path.join(dir,file+'.gz'))).toString();
const rows=(dir,file)=>gz(dir,file).trim().split('\n').filter(Boolean).map(JSON.parse);
const runs=['ember-241','vale-242','moss-242','slate-242','flint-243','hearth-243','rowan-244','lantern-244','quill-244','ash-244', ...fs.readdirSync(root).filter(f=>/^openrouter-20261127-[a-z]+-\d+$/.test(f) && Number(f.split('-').at(-1))>=245).map(f=>f.replace('openrouter-20261127-',''))];
const ids=new Set();
let nanoDollars=0,files=0;
for(const run of runs){
    const dir=path.join(root,'openrouter-20261127-'+run);
    const manifest=JSON.parse(fs.readFileSync(path.join(dir,'SOURCE_MANIFEST.json')));
    for(const [name,expected] of Object.entries(manifest.sha256)){
        assert.equal(digest(fs.readFileSync(path.join(dir,name))),expected,name);
        files++;
    }
    const start=JSON.parse(gz(dir,'parent-check.json'));
    const profile=JSON.parse(gz(dir,'profile.json'));
    const parent=path.join(root,start.parent.split(' ')[0]);
    const source=rows(parent,'chat.jsonl').slice(1,1+start.count);
    const initial=rows(dir,'chat-0.jsonl').slice(1);
    assert.equal(initial.length,start.count);
    assert.deepEqual(initial.map(m=>[m.is_user,m.mes]),source.map(m=>[m.is_user,m.mes]));
    assert.equal(source.at(-1).is_user,start.lastUser);
    assert.equal(digest(JSON.stringify(source.at(-1).mes)),start.last);
    const original=foldChat(source), seeded=foldChat(initial);
    assert.deepEqual(original.errors,[]);assert.deepEqual(seeded.errors,[]);
    assert.deepEqual(original.state,seeded.state);
    assert.deepEqual(seeded.state,JSON.parse(gz(dir,'world-0.json')));
    assert.equal(digest(JSON.stringify(seeded.state)),profile.initial.world);
    if(start.parent.includes('verified turn')){
        const n=Number(start.parent.split(' ').at(-1));
        const target=rows(parent,'turns.jsonl').find(x=>x.n===n).checked;
        assert.equal(initial.length,target.messages);
        assert.equal(profile.initial.world,target.world);
    }else if(!start.parent.includes('before input')){
        assert.deepEqual(original.state,JSON.parse(gz(parent,'last-verified-world.json')));
    }
    const requests=rows(dir,'requests.jsonl'), done=requests.filter(r=>r.kind==='end');
    assert.equal(done.length,manifest.requests);assert.equal(requests.length,2*done.length);
    let cost=0;
    for(let i=0;i<requests.length;i+=2){
        const [a,b]=requests.slice(i,i+2);
        assert.equal(a.kind,'start');assert.equal(b.kind,'end');assert.equal(a.id,b.id);
        assert.ok(!ids.has(a.id));ids.add(a.id);assert.ok(b.cost!=null);
        cost+=Math.round(Number(b.cost)*1e9);
    }
    assert.equal(cost,Math.round(Number(manifest.costUSD)*1e9));
    nanoDollars+=cost;
    const final=foldChat(rows(dir,'chat.jsonl').slice(1));
    assert.deepEqual(final.errors,[]);assert.deepEqual(final.state,JSON.parse(gz(dir,'last-verified-world.json')));
    console.log(run,initial.length,done.length,(cost/1e9).toFixed(9));
}
assert.ok(nanoDollars<=1e9);
console.log(files+' verified files, '+ids.size+' requests, USD '+(nanoDollars/1e9).toFixed(9));
