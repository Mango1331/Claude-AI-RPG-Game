import {OriginHost as ST119Mock} from './publication.mjs';
import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Journal,copy,digest} from '../architecture201/journal.mjs';import {Scheduler} from '../architecture201/scheduler.mjs';import {HeldPublication} from '../architecture201/host.mjs';import {fixtures} from '../architecture201/fixtures.mjs';import {foldChat,rec} from '../architecture201/engine.mjs';import {DynamicGM} from './runtime.mjs';
const get=n=>copy(fixtures().find(f=>f.name===n));const wat=get('npc_promise'),forest=get('forest200'),gift=get('npc_promise'),compound=get('npc_promise');
gift.narration='Wat handed Alaric a plain wooden token as a gift.';gift.world={scene:foldChat(gift.base).state.scene.at,expected:{},deltas:[{seq:1,type:'object.new',name:'plain wooden token',kind:'item',qty:1,holder:'npc.wat',effect:null,unit:null,for_quest:null,in:null,teaches:null},{seq:2,type:'object.move',object:{new:'plain wooden token'},qty:1,to:'pc'}]};
compound.input='I distract Wat and take the key only if he looks away.';
const end=f=>({op:'finish',narration:f.narration,world:f.world});
const cases=[['G1',wat,[end(wat)]],['G2',forest,[{op:'resolve',commands:JSON.parse(forest.plans[0]).commands},{...end(forest),op:'world'},{op:'finish',use_result:true}]],['G3',compound,[{op:'resolve',commands:[{seq:1,type:'distract',who:'npc.wat',quote:compound.input},{seq:2,type:'steal',needs:1,object:'key',quote:compound.input}]}]],['G4',gift,[{...end(gift),op:'world'},{op:'finish',use_result:true}]]];
for(const held of [false,true]){
 const x=get('forest200'),s=foldChat(x.base).state;x.input='I take the wooden key and go to Alderwatch.';
 const events=rec(x.base.findLast(m=>rec(m))).events;
 events.push({t:'object.created',d:{object:{id:'obj.key',name:'wooden key',kind:'item',qty:1,holder:held?{entity:'npc.guard'}:{loc:s.scene.at},marks:[]}}});
 if(held)events.push({t:'entity.created',d:{entity:{id:'npc.guard',name:'Guard',kind:'npc',status:'alive',at:s.scene.at,location:s.scene.location,descriptors:['guard']}}},{t:'scene.entered',d:{id:'npc.guard'}});
 const commands=[{seq:1,type:'take',object:'obj.key',qty:1,quote:'I take the wooden key'},{seq:2,type:'go',to:'loc.alderwatch',needs:1,quote:'go to Alderwatch'}];
 const world=held?{scene:s.scene.at,expected:{},deltas:[]}:{scene:'loc.alderwatch',expected:{2:{arrived:true,at:'loc.alderwatch',with:null,met:null}},deltas:[{seq:1,type:'arrive',at:'loc.alderwatch',forced_by:null,with:null}]};
 cases.push([held?'G3-supported-refused':'G3-supported-success',x,[{op:'resolve',commands},{op:held?'finish':'world',narration:held?'The guard kept the key. Alaric remained at the verge.':'Alaric took the wooden key and arrived in Alderwatch.',world},...(!held?[{op:'finish',use_result:true}]:[])]]);
}
const baseline='c7622605419855233a305b9c1c5c2b039c28ddf8';
const original=execFileSync('git',['show',`${baseline}:experiments/dynamic-gm/runtime.mjs`],{cwd:new URL('../../',import.meta.url),encoding:'utf8'});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gm-baseline-'));const baselineFile=path.join(tmp,'runtime.mjs');
fs.writeFileSync(baselineFile,original.replace(/from '([^']+)'/g,(all,p)=>`from '${new URL(p,new URL('./runtime.mjs',import.meta.url)).href}'`));
const {DynamicGM:Baseline}=await import(pathToFileURL(baselineFile));
const semantic=s=>JSON.parse(JSON.stringify(s,(k,v)=>['ms','perf','llm'].includes(k)?undefined:v));
const out={baseline,provenance:'Offline scripted answers; G2 original .200 input/plan/prose with synthetic successful world data. G1/G4 synthetic on recorded .191 state. No natural quality or provider tokens measured.',cases:[]};
for(const [id,f,answers] of cases)for(const [version,Implementation] of [['baseline',Baseline],['current',DynamicGM]]){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dynamic-measure-')),j=new Journal(path.join(dir,'journal.json'),f.base),s=new Scheduler(j),h=new ST119Mock(path.join(dir,'host.json')),g=new Implementation(j,s,new HeldPublication(j,h));g.begin(id,f.input);let error=null;
 try{await g.run(id,async r=>JSON.stringify(answers[Number(r.phase.split(':')[1])]));}catch(e){error=e.message;}
 const db=j.read();out.cases.push({id,version,stateHash:digest(semantic(foldChat(db.world.chat).state)),error,calls:db.requests.length,published:h.dom.size,worldRevision:db.world.revision,peak:Math.max(...db.requests.map(r=>r.occupancy)),requests:db.requests.map(r=>({phase:r.phase,promptChars:r.promptChars,wireBytes:r.wireBytes,promptHash:digest(r.messages)}))});}
fs.writeFileSync(new URL('./comparison.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
