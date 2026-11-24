import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
const [checkout,doc,cross] = process.argv.slice(2);
if(!cross) throw Error('node take-herkunft.mjs <engine checkout> <docs checkout> <68-turn crossover.json.gz>');
const engine=path.resolve(checkout,'avereth-engine');
const importFrom=file=>import(pathToFileURL(path.join(engine,file)));
const {loadProductContent}=await importFrom('tests/helpers.js');
const {playerTurnV4,replyTurnV4}=await importFrom('src/v4/turn.js');
const content=await loadProductContent();
const inflate=file=>gunzipSync(fs.readFileSync(file)).toString('utf8');
const original=JSON.parse(inflate(path.join(engine,'tests/v4/fixtures/continuity210_objects.json.gz')));
const satchel='obj.t40.mother_wrens_leather_satchel';
const wren='npc.mother_wren';
function run(key,change) {
 const {start,turns}=original[key], {input,commands,report,prose,i}=structuredClone(turns[0]);
 const spec={input,commands,report,prose};
 if(change)change(spec);
 const p=playerTurnV4(start,content,spec.input,{c:true,commands:spec.commands,msg:i});
 const x=replyTurnV4(p.state,content,spec.report,{msg:i+1,prose:spec.prose});
 const newItems=x.events.filter(e=>e.t==='object.created'&&e.d.object.holder?.entity==='pc').map(e=>e.d.object.name);
 const presentNpcStock=Object.values(start.objects).filter(o=>o.holder?.entity!=='pc'&&start.scene.present.includes(o.holder?.entity)).map(o=>[o.name,o.holder.entity,o.source?.turn===start.turn]);
 return {createdForPlayer:newItems,holder:x.state.objects[satchel]?.holder,startingLocalNpcGoods:presentNpcStock,arrivedAt:x.state.scene.at};
}
const runs={archivedC19:run('c19'),archivedB8:run('b8')};
// A controlled identical prefix and identical P/X; only what the narrator says happened differs.
runs.sameRawOld=run('c19',spec=>{spec.prose="At the almshouse Wren hands Alaric her own leather satchel. He grips its sound end and carries it after her.";});
runs.sameRawSecond=run('c19',spec=>{spec.prose="At the almshouse Wren keeps her leather satchel. Beside the door is a second, empty bag left for anyone. Alaric picks up the second bag by its sound end and follows her.";});
assert.deepEqual(runs.sameRawOld,runs.sameRawSecond);
assert.deepEqual(runs.archivedC19.createdForPlayer,['the bag']);
assert.equal(runs.archivedC19.holder.entity,wren);
assert.ok(runs.archivedB8.createdForPlayer.some(name=>name.includes('boards')));
assert.equal(runs.archivedB8.startingLocalNpcGoods[0][1],'npc.marta');
runs.logicalIdOnly=run('c19',spec=>{spec.commands[0].object=satchel;});
runs.sourcedMove=run('c19',spec=>{
 spec.commands[0].object=satchel;
 for(const d of spec.report.deltas)d.seq++;
 spec.report.deltas.unshift({seq:1,scene:original.c19.start.scene.at,type:'object.move',object:satchel,to:'pc',qty:1});
});
runs.extractorIdentifiesSource=run('c19',spec=>{
 for(const d of spec.report.deltas)d.seq++;
 spec.report.deltas.unshift({seq:1,scene:original.c19.start.scene.at,type:'object.move',object:satchel,to:'pc',qty:1});
});
assert.deepEqual(runs.extractorIdentifiesSource.createdForPlayer,[]);
assert.deepEqual(runs.extractorIdentifiesSource.holder,{entity:'pc'});
assert.deepEqual(runs.logicalIdOnly.createdForPlayer,[]);
assert.deepEqual(runs.logicalIdOnly.holder,{entity:wren});
assert.deepEqual(runs.sourcedMove.createdForPlayer,[]);
assert.deepEqual(runs.sourcedMove.holder,{entity:'pc'});
const archived=JSON.parse(inflate(cross));
const summary={turns:0,turnsWithParsedPlanner:0,turnsWithoutPlannerOutput:[],missing:[],allTakes:[]};
for(const [tag,campaign] of Object.entries(archived.runs)){
 const dir=path.join(doc,'testrun_10b',campaign.source);
 const raw=new Map(inflate(path.join(dir,'provider-originalantworten.jsonl.gz')).trim().split('\n').map(JSON.parse).map(r=>[r.id,r]));
 for(const row of campaign.rows){
  const k=tag+'/'+row.n;
  summary.turns++;
  const d=row.independent.diagnostics[0],idx=d.prompts.findLastIndex(e=>e.purpose.startsWith('plan'));
  if(idx<0){summary.turnsWithoutPlannerOutput.push(k);continue;}
  const req=d.used[idx];
  try{
   const answer=JSON.parse(raw.get(req).body).choices[0].message.content.trim().replace(/^```(?:json)?\s*|\s*```$/g,'');
   const p=JSON.parse(answer);
   assert.ok(Array.isArray(p.commands));
   summary.turnsWithParsedPlanner++;
   for(const c of p.commands.filter(e=>e.type==='take'))summary.allTakes.push({case:k,object:c.object});
  }catch{summary.missing.push(k);}
 }
}
assert.equal(summary.turns,68);
console.log(JSON.stringify({crossover:archived.arm,controls:runs,archive:summary},null,2));
