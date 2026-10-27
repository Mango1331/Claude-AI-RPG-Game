import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent, loadContent } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { validateState } from '../../src/validate.js';
import { parseExtraction, extractorRequest } from '../../src/v4/extract.js';
import { runExtraction, processReplyAny } from '../../src/v4/runtime.js';
import { Chat4 } from './harness.js';
import { rec } from '../../src/host.js';
import { applyWorld } from '../../src/v4/world.js';
const c=await loadProductContent(),f=JSON.parse(fs.readFileSync(new URL('./fixtures/run20_technical.json',import.meta.url)));
const run=(commands,state=f.state203)=>{const s=structuredClone(state),events=[];const result=resolveCommands(s,c,structuredClone(commands),e=>{events.push(e);applyEvent(s,e);},{c:true,msg:406});return {s,events,...result};};
test('Run20 T203: explicit preceding Wethervord GO cannot authorize Alderwatch or a payout',()=>{
 const r=run(f.commands203);assert.equal(r.auth.gos.some(g=>g.to==='loc.alderwatch.guild_hall'),false);
 assert.equal(r.events.some(e=>e.t==='coin.changed'),false);assert.ok(r.resolutions.some(x=>x.status==='refused'));
});
test('Run20 local entry without town repetition remains local, while an unqualified wilderness return works',()=>{
 const r=run([{seq:1,type:'go',to:{new:'the Guild hall'},quote:'I enter the Guild hall.'}]);assert.equal(r.auth.gos.length,0);
 const s=structuredClone(f.state203);s.scene.at=Object.values(s.places).find(p=>p.kind==='wilderness').id;
 const back=run([{seq:1,type:'go',to:{new:'the Guild hall'},quote:'I go back to the Guild hall.'}],s);assert.equal(back.auth.gos[0].to,'loc.alderwatch.guild_hall');
});
test('Run20 planned city chooses its own hall but does not book arrival',()=>{
 const r=run([{seq:1,type:'go',to:'loc.alderwatch',quote:'I travel to Alderwatch.'},{seq:2,type:'go',to:{new:'the Guild hall'},quote:'I enter the Guild hall.'}]);
 assert.equal(r.auth.gos.at(-1).to,'loc.alderwatch.guild_hall');assert.equal(r.events.some(e=>e.t==='scene.moved'),false);
});
test('Run20 repriced is terminal and replay-valid, unknown statuses still fail',()=>{
 const s=structuredClone(f.state203),base=structuredClone(s),events=[{t:'offer.created',d:{offer:{id:'offer.test',status:'open',seller:'npc.test',lines:[]}}},{t:'offer.closed',d:{id:'offer.test',status:'repriced'}}];
 for(const e of events)applyEvent(s,e);assert.equal(validateState(s,c).some(x=>/status repriced$/.test(x)),false);
 for(const e of JSON.parse(JSON.stringify(events)))applyEvent(base,e);assert.deepEqual(base.offers,s.offers);
 assert.equal(run([{seq:1,type:'offer.accept',offer:'offer.test',lines:null,quote:'I accept.'}],s).events.some(e=>e.t==='transaction.completed'),false);
 s.offers['offer.test'].status='repriced_again';assert.ok(validateState(s,c).some(x=>/repriced_again/.test(x)));
});
test('Run20 original five-delta response needs the earlier thread scene; repair names the starting place',()=>{
 const q=f.extraction,p=parseExtraction(JSON.stringify(f.answer726),q.vocab,q.ids,q.expectedKeys,q);
 assert.equal(p.valid,true);assert.ok(p.issues.some(e=>e.why.startsWith('$.deltas[1].scene')));
 const bad=applyWorld(structuredClone(f.state252),c,p.value,{msg:505,prose:f.prose252});assert.ok(bad.rejected.some(x=>x.type==='thread'&&x.rule==='scene_context'));
 const rep=extractorRequest(q.vocab,{catalog:'',actions:'',expectedKeys:q.expectedKeys,reply:'The earlier event happens before arrival.',startScene:q.startScene},{previous:JSON.stringify(f.answer726),errors:p.issues.map(x=>x.why)});
 assert.ok(rep.messages.at(-1).content.includes(q.startScene));
 const fixed=structuredClone(f.answer726);fixed.deltas[1].scene=q.startScene;
 assert.equal(parseExtraction(JSON.stringify(fixed),q.vocab,q.ids,q.expectedKeys,q).valid,true);
});
test('Run20 schema error followed by repair timeout retries once, then stops after three calls, with typed failure and no world commit',async()=>{
 const legacy=await loadContent(),g=new Chat4(legacy);await g.player('Mage');await g.player('Flame Lance and Arcane Ward');await g.player('I wait.');
 const id=g.chat.push({mes:'The innkeeper nods.',is_user:false,is_system:false,extra:{}})-1;processReplyAny(g.chat,id,legacy);
 let calls=0;await runExtraction(g.chat,id,legacy,async()=>{if(++calls===1)return 'invalid JSON';throw Object.assign(new Error('LLM request timed out after 120000 ms'),{code:'LLM_TIMEOUT'});});
 const r=rec(g.chat[id]);assert.equal(calls,3);assert.equal(r.extraction.status,'failed');assert.equal(r.extraction.llm[1].error_kind,'timeout');assert.equal(r.extraction.llm[2].error_kind,'timeout');assert.equal(r.events.some(e=>e.t==='extract.applied'),false);
});
test('Run20 T252 corrected annotation permits arrival but still refuses the invented fourth kill',()=>{
 const a=structuredClone(f.answer726);a.deltas[1].scene=f.extraction.startScene;
 const r=applyWorld(structuredClone(f.state252),c,a,{msg:505,prose:f.prose252});
 assert.equal(r.state.scene.at,a.scene);assert.notEqual(r.state.quests[a.deltas[4].quest].ready,true);
 assert.equal(r.events.some(e=>e.t==='coin.changed'||e.t==='xp.changed'),false);
 assert.ok(r.rejected.some(x=>x.rule==='quest_count'));
});
test('Run20 actual repricing closes the old offer; accepting the new price pays only once',()=>{
 let s=structuredClone(f.state203);s.last.outcome={c:true,auth:{c:true,gos:[]},expected_keys:{}};
 s.entities['npc.vendor']={id:'npc.vendor',kind:'npc',name:'Alda',descriptors:['merchant'],status:'alive',location:s.scene.location};s.scene.present.push('npc.vendor');
 const initial=structuredClone(s),events=[];
 const offer=price=>({scene:'here',expected:{},deltas:[{seq:1,type:'offer',seller:'npc.vendor',lines:[{what:'rope',kind:'goods',qty:1,price_cp:price,said:`${price} copper`,equipment:false}]}]});
 for(const price of [10,12,12]){const r=applyWorld(s,c,offer(price),{msg:600+price,prose:`Alda says, "Rope, ${price} copper."`});events.push(...r.events);s=r.state;}
 const old=Object.values(s.offers).find(o=>o.seller==='npc.vendor'&&o.status==='repriced'),fresh=Object.values(s.offers).find(o=>o.seller==='npc.vendor'&&o.status==='open');assert.ok(old&&fresh);
 assert.equal(events.filter(e=>e.t==='offer.created').length,2);assert.deepEqual(validateState(s,c),[]);
 const cp=s.entities.pc.sheet.coin_cp;
 let r=run([{seq:1,type:'offer.accept',offer:fresh.id,lines:null,quote:'I buy the rope for 12 copper.'}],s);events.push(...r.events);assert.equal(r.s.entities.pc.sheet.coin_cp,cp-12);
 const again=run([{seq:1,type:'offer.accept',offer:fresh.id,lines:null,quote:'I buy it again.'}],r.s);assert.equal(again.events.some(e=>e.t==='transaction.completed'),false);
 for(const e of JSON.parse(JSON.stringify(events)))applyEvent(initial,e);assert.deepEqual(initial.offers,r.s.offers);assert.deepEqual(initial.entities.pc.sheet,r.s.entities.pc.sheet);
});
function hostLlm(fetch,fireTimeout=()=>{}) {
 const index=fs.readFileSync(new URL('../../index.js',import.meta.url),'utf8'),start=index.indexOf('async function v4Llm('),end=index.indexOf('\n}',start)+2;
 const make=new Function('ctx','fetch','setTimeout','clearTimeout','LLM_TIMEOUT_MS',`let llmPath;${index.slice(start,end)};return v4Llm;`);
 return make(()=>({mainApi:'openai',chatCompletionSettings:{chat_completion_source:'custom'},getRequestHeaders:()=>({})}),fetch,(fn,ms)=>{fireTimeout(fn,ms);return 1;},()=>{},120000);
}
test('Run20 host timeout keeps 120s limit and identifies its own abort',async()=>{
 let timeout;const llm=hostLlm(async()=>{timeout();throw new DOMException('aborted','AbortError');},(fn,ms)=>{timeout=fn;assert.equal(ms,120000);});
 await assert.rejects(llm({messages:[]}),e=>e.code==='LLM_TIMEOUT');
});
test('Run20 host distinguishes caller cancellation and HTTP provider failure from timeout',async()=>{
 const ctl=new AbortController();ctl.abort();
 await assert.rejects(hostLlm(async()=>{throw new DOMException('aborted','AbortError');})({messages:[],signal:ctl.signal}),e=>e.code==='LLM_CANCELLED');
 await assert.rejects(hostLlm(async()=>({ok:false,status:503,json:async()=>({error:{message:'unavailable'}})}))({messages:[]}),e=>e.code==='LLM_PROVIDER');
});
