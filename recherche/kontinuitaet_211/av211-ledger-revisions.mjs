import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

const [engine,source,outputDir] = process.argv.slice(2);
const load = file => import(pathToFileURL(path.resolve(engine,file)));
const {foldChat,messageEvents} = await load('src/host.js');
const {loadProductContent} = await load('tests/helpers.js');
const {refreshRevisionDisplay,onSwipedV4,processReplyAny,runExtraction} = await load('src/v4/runtime.js');
const content = await loadProductContent();
const bytes = await readFile(source);
const rows = bytes.toString().trimEnd().split(/\r?\n/).map(s=>JSON.parse(s)).slice(1,58);
assert.equal(rows.length,57);  // through the .205 User08 M56 payout, ST message indices start with the greeting at 0
const quest='quest.clear_the_old_crown_catacombs_level_1';
const dir = outputDir || await mkdtemp(path.join(tmpdir(),'av211-ledger-readback-'));
function fold(chat){
 const result = foldChat(chat);
 assert.deepEqual(result.failures, []);
 return result.state;
}
function parts(s){
 const pc=s.entities.pc.sheet,q=s.quests[quest];
 return {turn:s.turn,place:s.scene.at,coin:pc.coin_cp,hp:pc.hp,mp:pc.mp,sta:pc.sta,quest:q.status,
     ready:!!q.ready,xp:pc.xp,level:pc.level};
}
async function roundTrip(chat,name){
 const disk=path.join(dir,name+'.jsonl');
 await writeFile(disk,chat.map(m=>JSON.stringify(m)).join('\n')+'\n');
 const loaded=(await readFile(disk,'utf8')).trimEnd().split('\n').map(s=>JSON.parse(s));
 refreshRevisionDisplay(loaded);
 assert.deepEqual(fold(loaded),JSON.parse(JSON.stringify(fold(chat))));
 return loaded;
}
function select(chat,index,slot){
 const m=chat[index];
 m.swipe_id=slot; m.mes=m.swipes[slot];m.extra=structuredClone(m.swipe_info[slot].extra);
 onSwipedV4(chat,index);
}
const out={source_sha256:createHash('sha256').update(bytes).digest('hex'),mock_cases:[]};
for(const n of [22,56]){
 let chat=structuredClone(rows);
 refreshRevisionDisplay(chat);
 const world0=JSON.parse(JSON.stringify(fold(chat)));
 const m=chat[n], a=structuredClone(m.extra.avereth.events);
 assert.equal(m.swipe_id,0);
 const snapshot=rows.slice(0,n);
 const start=parts(fold(snapshot));
 const expected={};
 for(const [key,kind] of Object.entries(fold(snapshot).last.outcome.expected_keys)){
  if(kind==='go') expected[key]={arrived:false,at:null,with:null,met:null};
  else if (kind==='desk') expected[key]={handled_by:null};
  else assert.fail(kind);
 }
 m.swipes.push(n===22?'A fallen slab blocks the stair. Alaric has not entered the first gallery.':'The return route is blocked. Alaric has not reached the counter or received the reward.');
 m.swipe_info.push({extra:{}});
 select(chat,n,1);
 assert.equal(processReplyAny(chat,n,content).extract,true);
 const calls=[];
 const result=await runExtraction(chat,n,content,async req=>{
   calls.push(req.purpose);
   return JSON.stringify({scene:'here',expected,deltas:[]});
 });
 assert.equal(result.applied,true);
 assert.deepEqual(calls,['extract']);
 const alt=parts(fold(chat));
 assert.deepEqual(alt,start);
 assert.equal(alt.coin,30);
 assert.equal(alt.quest,'active');
 assert.equal(world0.entities.pc.sheet.coin_cp,120);
 assert.equal(world0.quests[quest].status,'completed');
 if(n===22){
   assert.notEqual(alt.hp,world0.entities.pc.sheet.hp);
   assert.notEqual(alt.mp,world0.entities.pc.sheet.mp);
   for(const row of chat.slice(n+1))assert.equal(row.avereth_inactive,true);
 }else assert.ok(a.some(e=>e.t==='coin.changed' && e.d.delta===90));
 chat=await roundTrip(chat,'alternate-'+n);
 const forArchive=chat.slice(n+1).flatMap(m=>m.extra?.avereth?.events||[]);
 assert.deepEqual(forArchive,rows.slice(n+1).flatMap(m=>m.extra?.avereth?.events||[]));
 assert.deepEqual(chat[n].swipe_info[0].extra.avereth.events,a);
 select(chat,n,0);
 chat=await roundTrip(chat,'restored-'+n);
 assert.deepEqual(JSON.parse(JSON.stringify(fold(chat))),world0);
 assert.equal(chat.flatMap(messageEvents).filter(e=>e.t==='coin.changed' && e.d.delta===90).length,1);
 const restored=parts(fold(chat));
 select(chat,n,1);
 chat=await roundTrip(chat,'alternate-again-'+n);
 assert.deepEqual(parts(fold(chat)),alt);
 assert.equal(chat.flatMap(messageEvents).filter(e=>e.t==='coin.changed' && e.d.delta===90).length,0);
 out.mock_cases.push({original_player_index:n-1,swipe_message:n,through_message:56,alternative:'local scripted arrival false; no deltas',active_original:parts(world0),active_alternative:alt,restored_original:restored,second_alternative:parts(fold(chat)),suffix_messages:rows.length-1-n,suffix_events_preserved:forArchive.length,mock_roles:calls,model_generations:0,roundtrips:3,full_world_original_restored:true});
}
console.log(JSON.stringify(out,null,2));
