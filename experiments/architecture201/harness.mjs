import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Journal,copy,fault} from './journal.mjs';import {Scheduler} from './scheduler.mjs';
import {ST119Mock,HeldPublication} from './host.mjs';import {Prototype} from './orchestrator.mjs';
export function harness(f,variant,dir=fs.mkdtempSync(path.join(os.tmpdir(),'avereth201-'))) {
    let time=0;
    const journal=new Journal(path.join(dir,'journal.json'),f.base), scheduler=new Scheduler(journal,{now:()=>time});
    const host=new ST119Mock(path.join(dir,'host.json')), publication=new HeldPublication(journal,host), prototype=new Prototype(journal,scheduler,publication);
    prototype.begin('t1',f,variant);
    let plan=0;
    const transport=async({phase})=>{
        if(phase.startsWith('plan')) {const answer=f.plans[plan++];if(answer===undefined)throw fault(`fixture has no recorded answer for ${phase}`);return answer;}
        if(phase==='narrator')return f.narration;
        if(phase==='extract')return JSON.stringify(f.world);
        if(['joint','joint_correction'].includes(phase))return JSON.stringify(f.joint);
        throw fault(`unexpected provider phase ${phase}`);
    };
    return {dir,journal,scheduler,host,publication,prototype,transport,advance:n=>{time+=n;}};
}
// Diagnostic timing is deliberately not part of semantic equality.
export function semantic(state) {return JSON.parse(JSON.stringify(state,(k,v)=>['ms','perf','llm'].includes(k)?undefined:v));}
