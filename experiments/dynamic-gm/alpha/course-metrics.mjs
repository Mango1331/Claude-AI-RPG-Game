// Offline request accounting with the actual pinned GLM tokenizer. No transport/network.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
import {loadProductContent} from '../../../avereth-engine/tests/helpers.js';
import {configure,foldChat} from '../../../avereth-gm-alpha/gm/engine.js';
import {DynamicGM} from '../../../avereth-gm-alpha/gm/runtime.js';
import {Scheduler} from '../../../avereth-gm-alpha/gm/scheduler.js';
import {Journal} from '../../../avereth-gm-alpha/gm/storage.js';
import {formatGLM,checkBudget} from '../../../avereth-gm-alpha/gm/budget.js';
import {courseBase,courseSteps,guildInput} from './course-fixtures.mjs';
configure(await loadProductContent());
class Store {data={};async read(n){return structuredClone(this.data[n]||null);}async write(n,v){this.data[n]=structuredClone(v);}}
const store=new Store(),journal=await Journal.open(store,'j',{revision:0,originChatId:'origin',world:{revision:0,chat:courseBase()},turns:{}}),ledger=await Journal.open(store,'l',{revision:0,leases:{}});
const host={id:()=> 'origin',token:()=>({id:'origin'}),current:()=>true};
const publication={host,async publish(id){await journal.update(d=>{d.turns[id].phase='published';});}};
const gm=new DynamicGM(journal,new Scheduler(ledger),publication);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'avereth-course-tokenizer-'));
try {
 const file=path.join(temp,'tokenizer.cjs');fs.copyFileSync(new URL('../../../avereth-gm-alpha/tokenizer/web-tokenizers.js',import.meta.url),file);
 const {Tokenizer}=createRequire(import.meta.url)(file),bytes=fs.readFileSync(new URL('../../../avereth-gm-alpha/tokenizer/tokenizer.json',import.meta.url));
 const tokenizer=await Tokenizer.fromJSON(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const measure=messages=>({characters:JSON.stringify(messages).length,...checkBudget(tokenizer.encode(formatGLM(messages)).length)});
 const steps=[];
 for(const step of courseSteps()) {
  const s=foldChat(journal.read().world.chat).state,answers=step.answers(s),requests=[];await gm.begin(step.name,step.input);
  await gm.run(step.name,async r=>{requests.push({id:r.id,...measure(r.messages)});if(!answers.length)throw Error('Unexpected extra request');return JSON.stringify(answers.shift());});
  steps.push({name:step.name,requests,revision:journal.read().world.revision,scene:foldChat(journal.read().world.chat).state.scene.at});
 }
 const oldFile=name=>execFileSync('git',['show',`815461e:avereth-gm-alpha/gm/${name}`],{cwd:new URL('../../../',import.meta.url),encoding:'utf8'});
 const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
 const oldEngineURL=url(oldFile('engine.js').replaceAll("from '../src/",`from '${new URL('../../../avereth-gm-alpha/src/',import.meta.url).href}`).replaceAll("from './",`from '${new URL('../../../avereth-gm-alpha/gm/',import.meta.url).href}`));
 (await import(oldEngineURL)).configure(await loadProductContent());
 const oldSource=oldFile('runtime.js').replace("from './engine.js'",`from '${oldEngineURL}'`)
  .replaceAll("from './",`from '${new URL('../../../avereth-gm-alpha/gm/',import.meta.url).href}`)
  .replaceAll("from '../src/",`from '${new URL('../../../avereth-gm-alpha/src/',import.meta.url).href}`);
 const {DynamicGM:OldGM}=await import(url(oldSource));
 const old=new OldGM(journal,null,publication),t={input:guildInput,base:courseBase(),results:[]};
 const current=gm.prompt(t),data=JSON.parse(current[1].content);
 const expanded=x=>{if(!x||typeof x!=='object')return x;if(x.$defs){const defs=x.$defs;const walk=v=>Array.isArray(v)?v.map(walk):v&&typeof v==='object'?v.$ref?walk(defs[v.$ref.split('/').at(-1)]):Object.fromEntries(Object.entries(v).filter(([k])=>k!=='$defs').map(([k,y])=>[k,walk(y)])):v;return walk(x);}return Array.isArray(x)?x.map(expanded):Object.fromEntries(Object.entries(x).map(([k,v])=>[k,expanded(v)]));};
 const unfactored=[current[0],{role:'user',content:JSON.stringify(expanded(data))}];
 const out={note:'Synthetic model answers; exact local GLM counts, not provider usage/latency or natural quality. Baseline is first prompt only: its actual recorded GO fails there.',baselineCommit:'815461e',firstGuildPrompt:{baseline:measure(old.prompt(t)),candidate:measure(current),candidateWithoutSchemaFactoring:measure(unfactored)},steps,totalRequests:steps.reduce((n,s)=>n+s.requests.length,0),totalLocalInputTokens:steps.flatMap(s=>s.requests).reduce((n,r)=>n+r.localInputTokens,0)};
 fs.mkdirSync(new URL('./results/course/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./results/course/prompts.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify(out,null,2));tokenizer.dispose();
}finally{fs.rmSync(temp,{recursive:true,force:true});}
