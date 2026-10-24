import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, inject, say } from './patch8_lib.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { parsePlan, planContext, withContentSkills, mapPlan } from '../../src/v4/planner.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { Dice } from '../../src/rng.js';
import { applyEvent } from '../../src/state.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
const content=await loadProductContent();const base=(await campaign(content)).state();
const INPUT='I take the bone slab and try it in the lock.';
const take=(seq=1)=>({seq,type:'take',object:'obj.slab',qty:null,quote:'take the bone slab'});
const attempt=(seq=2)=>({seq,type:'attempt',feature:'feat.lock',aim:'pass',tool:'obj.slab',stat:'INT',possible:null,approach:null,quote:'try it in the lock'});
function setup(){const s=structuredClone(base);s.objects['obj.slab']={id:'obj.slab',name:'bone slab',kind:'item',qty:1,use:'tool',holder:{loc:s.scene.at},for_quests:[]};s.features['feat.lock']={id:'feat.lock',name:'iron door lock',kind:'obstacle',status:'active',at:s.scene.at,hidden:false,difficulty:'hard',stat:'INT',history:[]};return s;}
function parse(s,commands){const ctx=withContentSkills(planContext(s,content,buildCatalog(s,content,{c:true})),content);return {ctx,...parsePlan(JSON.stringify({commands}),content.commandVocab,ctx,INPUT)};}
test('69: take then attempt validates and executes one take before the normal tool check',()=>{
 const s=setup(),p=parse(s,[take(),attempt()]);assert.deepEqual(p.errors,[]);const events=[];
 const mapped=mapPlan(p.commands,p.ctx,content,INPUT,s);resolveCommands(s,content,mapped.commands,e=>{events.push(e);applyEvent(s,e);},{c:true,msg:200,dice:new Dice(7)});
 assert.equal(s.objects['obj.slab'].holder.entity,'pc');assert.equal(events.filter(e=>e.t==='object.moved').length,1);assert.equal(events.filter(e=>e.t==='check.recorded').length,1);
});
test('69: seq order, not JSON array order, determines prior acquisition',()=>assert.deepEqual(parse(setup(),[attempt(),take()]).errors,[]));
test('69: attempt before take remains invalid',()=>assert.ok(parse(setup(),[attempt(1),take(2)]).errors.some(e=>e.includes('tool must'))));
test('69: unheld tool without take remains invalid',()=>assert.ok(parse(setup(),[attempt()]).errors.some(e=>e.includes('tool must'))));
test('69: unknown tool cannot be legitimised by an invalid take',()=>{const t=take();t.object='obj.unknown';const a=attempt();a.tool=t.object;assert.ok(parse(setup(),[t,a]).errors.length);});
test('69: a tool taken then dropped is not forecast as held',()=>assert.ok(parse(setup(),[take(),{seq:2,type:'drop',object:'obj.slab',qty:null,quote:'take the bone slab'},attempt(3)]).errors.some(e=>e.includes('tool must'))));
for(const mode of ['foreign','elsewhere','shut'])test(`69: failed ${mode} take permits neither tool use nor roll`,()=>{
 const s=setup();if(mode==='foreign'){s.entities.npc={id:'npc',kind:'npc',name:'Keeper',status:'alive'};s.objects['obj.slab'].holder={entity:'npc'};}
 if(mode==='elsewhere')s.objects['obj.slab'].holder={loc:'loc.other'};
 if(mode==='shut')s.objects['obj.slab'].in='feat.lock';
 const events=[];resolveCommands(s,content,[take(),attempt()],e=>{events.push(e);applyEvent(s,e);},{c:true,msg:200,dice:new Dice(7)});
 assert.ok(!events.some(e=>e.t==='check.recorded'));assert.notEqual(s.objects['obj.slab'].holder.entity,'pc');assert.equal(s.features['feat.lock'].status,'active');
});
test('69: existing held tools continue to validate',()=>{const s=setup();s.objects['obj.slab'].holder={entity:'pc'};assert.deepEqual(parse(s,[attempt()]).errors,[]);});
test('69: product turn and regenerate reuse one acquisition and roll; JSON replay is identical',async()=>{
 const g=await campaign(content),s=setup();inject(g,[{t:'object.created',d:{object:s.objects['obj.slab']}},{t:'feature.set',d:{feature:s.features['feat.lock']}}]);
 const r=await say(g,INPUT,take(),attempt());assert.ok(!r.failed);const user=g.chat.findLast(m=>m.is_user),events=rec(user).events;
 assert.equal(events.filter(e=>e.t==='object.moved').length,1);assert.equal(events.filter(e=>e.t==='check.recorded').length,1);
 await g.reply('He tries the slab in the lock; the engine decides the outcome.');
 const before=JSON.stringify(rec(user).events);for(const type of ['regenerate','swipe']) { const reused=await prepareGenerationAsync(g.chat,content,{type,settings:{planner:true},llm:async()=>{throw new Error('must reuse the booked turn');}});assert.equal(reused.action,'context');assert.equal(JSON.stringify(rec(user).events),before); }
 assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state,g.state());
});
test('69: exact Run 8 repair passes the real planner/agency/command path',async()=>{
 const {readFileSync}=await import('node:fs');const f=JSON.parse(readFileSync(new URL('./fixtures/run8_take_attempt.json',import.meta.url)));
 const g=await campaign(content),s=setup(),id=f.plan.commands[0].object;
 const object={...s.objects['obj.slab'],id};const feature={...s.features['feat.lock'],id:'feat.3'};
 inject(g,[{t:'object.created',d:{object}},{t:'feature.set',d:{feature}}]);
 await say(g,f.input,...f.plan.commands);
 const events=rec(g.chat.findLast(m=>m.is_user)).events;
 assert.equal(events.filter(e=>e.t==='object.moved').length,1);
 assert.equal(events.filter(e=>e.t==='check.recorded').length,1);
 assert.equal(g.state().objects[id].holder.entity,'pc');
});
