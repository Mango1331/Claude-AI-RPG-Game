import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {digest} from '../../architecture201/journal.mjs';import {caseManifest} from './cases.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
export const files=['experiments/dynamic-gm/runtime.mjs','experiments/dynamic-gm/contract.mjs','experiments/dynamic-gm/st-host.mjs','experiments/architecture201/orchestrator.mjs','experiments/architecture201/engine.mjs','experiments/architecture201/fixtures.mjs','experiments/dynamic-gm/natural/adapter.mjs','experiments/dynamic-gm/natural/cases.mjs','experiments/dynamic-gm/natural/ledger.mjs','experiments/dynamic-gm/natural/gateway.mjs','experiments/dynamic-gm/natural/run.mjs'];
export function hashes(){return Object.fromEntries(files.map(p=>[p,digest(fs.readFileSync(path.join(root,p),'utf8'))]));}
export function manifest(){return {status:'PREPARATION_ONLY_NO_NATURAL_CALLS',requestLimit:24,concurrency:1,automaticRetries:0,model:null,provider:null,tokenizer:null,contextWindow:null,temperature:0.7,maxOutput:2000,scenarioOrder:caseManifest(),hashes:hashes()};}
if(process.argv[1]===fileURLToPath(import.meta.url))fs.writeFileSync(new URL('./prepared.json',import.meta.url),JSON.stringify(manifest(),null,2)+'\n');
