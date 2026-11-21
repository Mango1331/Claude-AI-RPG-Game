import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const [archive,...roots] = process.argv.slice(2);
assert.equal(roots.length,2);
const seed = fs.readFileSync(archive,'utf8').trim().split('\n').slice(1,44).map(JSON.parse);
const hash = x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const target='loc.ashbridge',rise='loc.rise_above_the_goblin_camp';
const obj = name=>({type:'object.new',name,kind:'item',qty:1,holder:'here',unit:null,for_quest:null});
const cases=[
 {key:'mixed',input:'I inspect the camp and then travel back to Ashbridge.',look:'I inspect the camp',go:'travel back to Ashbridge',name:'printed market notice',prose:'After inspecting the camp Alaric returns to Ashbridge. At the village gate a courier drops a printed market notice beside the milestone and rides on.'},
 {key:'lookout',input:'I look at the camp from here.',look:'I look at the camp from here',name:'dropped survey marker',prose:'Alaric stays on the rise, looking down at the camp. Right beside him on the rise, a dropped survey marker lies in the grass.'},
 {key:'remote',input:'I look at the camp from here.',look:'I look at the camp from here',name:'clay bowl',prose:'Far below him at the camp, a clay bowl rests by the fire. Alaric stays on the rise.'},
 {key:'travel-control',input:'I travel back to Ashbridge.',go:'I travel back to Ashbridge',name:'printed market notice',prose:'Alaric returns to Ashbridge. At the village gate a courier drops a printed market notice beside the milestone and rides on.'}
];
// One additional controlled continuation with the original physical planner answer of natural turn 6.
const zipped = name => gunzipSync(fs.readFileSync(new URL(name, import.meta.url))).toString().trim().split('\n').map(JSON.parse);
const village = zipped('camp-chat.jsonl.gz').slice(1,-2);
const plan6 = zipped('provider.jsonl.gz').find(r=>r.turn===6 && r.kind==='end' && r.role==='planner');
const actual6=JSON.parse(plan6.text);
cases.push({...cases[0],key:'actual-planner',input:zipped('camp-chat.jsonl.gz').at(-2).mes,plan:actual6.commands,prefix:village});
const results=[];
for(const [index,root] of roots.entries()){
 const {engineAt}=await import(pathToFileURL(path.resolve(root,'tools/replay/replay.mjs')));
 const E=await engineAt(path.resolve(root));
 for(const t of cases){
  const chat=structuredClone(t.prefix || seed), indexOfInput=chat.length;
  let commands=[];
  if(t.look)commands.push({seq:1,type:'activity',kind:'search',what:'the camp',quote:t.look});
  if(t.go)commands.push({seq:commands.length+1,type:'go',to:target,quote:t.go});
  if(t.plan) commands=t.plan;
  chat.push({mes:t.input,is_user:true,extra:{}});
  await E.runtime.prepareGenerationAsync(chat,E.content,{llm:async()=>JSON.stringify({commands})});
  const out=E.host.foldChat(chat).state.last.outcome;
  const expected=Object.fromEntries(Object.entries(out.expected_keys).map(([k,v])=>[k,v==='go'?{arrived:true,at:target,with:null}:{minutes:0,done:true}]));
  const deltas=t.go?[{seq:1,type:'arrive',at:target,with:null,forced_by:null}]:[];
  deltas.push({...obj(t.name),seq:deltas.length+1});
  const report={scene:t.go?target:'here',expected,deltas};const i=chat.length;
  chat.push({mes:t.prose,is_user:false,extra:{}});
  assert.ok(E.runtime.processReplyAny(chat,i,E.content,{}).extract);
  let asks=0;await E.runtime.runExtraction(chat,i,E.content,async()=>{asks++;return JSON.stringify(report)});
  const rec=chat[i].extra.avereth, folded=E.host.foldChat(JSON.parse(JSON.stringify(chat)));
  assert.deepEqual(folded.errors,[]);assert.equal(rec.extraction.status,'applied');assert.equal(asks,1);
  const state=folded.state, objects=Object.values(state.objects).filter(o=>o.name===t.name);
  results.push({engine:index?'C':'reference',case:t.key,prefixHash:hash(chat.slice(0,indexOfInput)),input:t.input,commands,prose:t.prose,report,
   camp:out.camp??null,authorized:out.auth.gos,at:state.scene.at,objects,rejected:rec.rejected??[],events:rec.events.map(e=>e.t),stateHash:hash(state)});
  assert.equal(state.scene.at,t.go?target:rise);
  assert.equal(objects.length, index && t.key !== 'travel-control' ? 0 : 1);
  if(t.key==='remote' && index){
   chat.push({is_user:true,mes:'I take the clay bowl from the camp below.',extra:{}});
   await E.runtime.prepareGenerationAsync(chat,E.content,{llm:async()=>JSON.stringify({commands:[{seq:1,type:'take',object:{new:'clay bowl'},quote:'I take the clay bowl from the camp below'}]})});
   const follow=E.host.foldChat(chat).state.last.outcome;
   assert.deepEqual(follow.auth.take,[]);
   assert.equal(follow.resolutions[0].status,'refused');
   results.at(-1).remoteTake=follow.resolutions;
  }
 }
}
console.log(JSON.stringify(results,null,2));
