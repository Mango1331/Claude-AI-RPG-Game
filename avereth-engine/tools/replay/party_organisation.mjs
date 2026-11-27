import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import assert from 'node:assert/strict';
const base=new URL('../..',import.meta.url).pathname,docs=process.argv[2]+'/openrouter-20261127-';
const {engineAt}=await import(base+'/tools/replay/replay.mjs');const {runtime,host,content}=await engineAt(base);
const read=a=>gunzipSync(fs.readFileSync(docs+a+'/chat.jsonl.gz')).toString().trim().split('\n').slice(1).map(JSON.parse);
const ak=read('ak-235'),c=ak.slice(0,70),who='npc.ossen',state=()=>host.foldChat(c).state;
const initial=state(),hall=initial.scene.at;
async function local(input){
 c.push({mes:input,is_user:true,extra:{}});
 const res=await runtime.prepareGenerationAsync(c,content,{llm:()=>assert.fail('unexpected call '+input)});
 assert.equal(res.action,'panels',res.notice);
}
async function step(n){
 c.push({mes:ak[n].mes,is_user:true,extra:{}});
 const pl=host.rec(ak[n]).plan;
 const r=await runtime.prepareGenerationAsync(c,content,{llm:async()=>pl.raw.at(-1)});
 assert.equal(r.action,'context',JSON.stringify([r.action,r.notice]));
 const reply={mes:ak[n+1].mes,is_user:false,extra:{}};
 c.push(reply);runtime.processReplyAny(c,c.length-1,content);
 await runtime.runExtraction(c,c.length-1,content,async()=>JSON.stringify(host.rec(ak[n+1]).extraction.raw));
 console.log(n,state().scene.at,state().scene.present.includes(who),state().party.members[who].mode);
}
await local('#party wait '+who);assert.equal(state().party.members[who].mode,'wait');
await step(72);assert.notEqual(state().scene.at,hall);assert.ok(!state().scene.present.includes(who));
await local('#party follow '+who);assert.equal(state().party.members[who].mode,'wait');
await step(74);assert.equal(state().scene.at,hall);assert.ok(state().scene.present.includes(who));
await local('#party follow '+who);assert.equal(state().party.members[who].mode,'follow');
await local('#party disband');assert.equal(state().party.members[who].mode,'left');
assert.equal(state().entities[who].sheet.hp,initial.entities[who].sheet.hp);
console.log('AK wait, solo market, absent resume refused, actual return, resume, disband.');

// AA1 replay on Y's complete terminal checkpoint, including its last reply.
const {createHash}=await import('node:crypto');
const parent=read('y-234'),aa=read('aa-234');
const expected=JSON.parse(gunzipSync(fs.readFileSync(docs+'y-234/last-verified-world.json.gz')));
assert.deepEqual(host.foldChat(parent).state,expected);
const turns=gunzipSync(fs.readFileSync(docs+'y-234/turns.jsonl.gz')).toString().trim().split('\n').map(JSON.parse);
assert.equal(parent.length,turns.at(-1).checked.messages);
assert.equal(parent.at(-1).is_user,false);
assert.equal(createHash('sha256').update(JSON.stringify(expected)).digest('hex'),turns.at(-1).checked.world);
for(const enter of [true,false]){
 const ch=structuredClone(parent), msg=structuredClone(aa[42]), reply=structuredClone(aa[43]);
 const plan=JSON.parse(host.rec(msg).plan.raw[0]), raw=host.rec(reply).extraction.raw;
 if(!enter) {const old=plan.commands[0].quote;plan.commands[0].quote='I go to the doorway of the Mossback Warrens';msg.mes=msg.mes.replace(old,plan.commands[0].quote);}
 delete msg.extra.avereth;delete reply.extra.avereth;ch.push(msg);
 const r=await runtime.prepareGenerationAsync(ch,content,{llm:async()=>JSON.stringify(plan)});
 const roster=/mon\.mossback_warrens_c1_l1_e1_1[^\n]+dead · 0 HP[^\n]+mon\.mossback_warrens_c1_l1_e1_2[^\n]+alive/;
 assert.match(r.context.text,roster);
 ch.push(reply);const at=ch.length-1;runtime.processReplyAny(ch,at,content);
 await runtime.runExtraction(ch,at,content,async req=>{assert.match(req.messages.map(m=>m.content).join('\n'),roster);return JSON.stringify(raw);});
 assert.equal(host.foldChat(ch).state.scene.at,'loc.mossback_warrens'+(enter?'.l1_s1':''));
}
console.log('AA1 on complete Y checkpoint: N block and X request carry individual roster; entry and threshold have distinct end locations.');

// Slate's real X identified the dungeon root as the room even though the reply crossed the threshold.
const slate=read('slate-242'), branch=structuredClone(parent);
const msg={mes:slate.at(-2).mes,is_user:true,extra:{}}, reply={mes:slate.at(-1).mes,is_user:false,extra:{}};
branch.push(msg);
const prepared=await runtime.prepareGenerationAsync(branch,content,{llm:async()=>host.rec(slate.at(-2)).plan.raw[0]});
assert.match(prepared.context.text,/part 1 of level 1 of Mossback Warrens/i);
branch.push(reply);runtime.processReplyAny(branch,branch.length-1,content);
const wrong=host.rec(slate.at(-1)).extraction.raw;
const room='loc.mossback_warrens.l1_s1';
let attempts=0;
await runtime.runExtraction(branch,branch.length-1,content,async req=>{
 const delivered=req.messages.map(m=>m.content).join('\n');
 if(!attempts++){assert.ok(delivered.includes(room));return JSON.stringify(wrong);}
 assert.match(delivered,/departure room/i);
 return JSON.stringify({scene:room,expected:{1:{arrived:true,at:room,with:null,met:null}},deltas:[{...wrong.deltas[0],at:room}]});
});
assert.equal(attempts,2);
const reached=host.foldChat(branch).state;
assert.equal(reached.scene.at,room);
assert.ok(reached.scene.present.includes('mon.mossback_warrens_c1_l1_e1_2'));
console.log('Slate: misleading root triggers repair, confirmed first room contains the surviving individual.');
