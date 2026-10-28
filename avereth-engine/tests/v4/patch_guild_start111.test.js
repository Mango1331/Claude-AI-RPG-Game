import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadProductContent} from '../helpers.js';
import {emptyState,applyEvent} from '../../src/state.js';
import {resolveCommands} from '../../src/v4/commands.js';
import {applyWorld} from '../../src/v4/world.js';
import {parsePlan,planContext,withContentSkills} from '../../src/v4/planner.js';
import {buildCatalog} from '../../src/v4/catalog.js';
import {buildContext} from '../../src/context.js';
const content=await loadProductContent();
const chat=JSON.parse(fs.readFileSync(new URL('./fixtures/batch6_guild_start.json',import.meta.url)));
function before(turn) {const s=emptyState();let t=0;for(const m of chat){if(m.is_user)t++;if(t===turn)return s;for(const e of m.events)applyEvent(s,e);}throw Error('turn');}
function run(s,cs,text){const events=[],emit=e=>{events.push(e);applyEvent(s,e);};const ctx=resolveCommands(s,content,cs,emit,{c:true,text});return {ctx,events};}
const fee={seq:1,type:'pay',to:'npc.npcglassmere_clerk',amount_cp:20,for:'registration',quote:'hand the clerk two silver to finish my registration'};
const reg={seq:2,type:'guild.register',quote:'register me'};
for(const cs of [[fee,reg],[reg,{...fee,seq:3}],[fee]])test('111 registration fee outside hall preserves coin '+cs.map(c=>c.type).join('/'),()=>{const s=before(14);run(s,cs);assert.equal(s.entities.pc.sheet.coin_cp,50);assert.equal(s.guild.membership,null);});
test('111 registration in hall books once; repeated fee cannot become an ordinary payment',()=>{const s=before(14),prior=structuredClone(s);s.scene.at='loc.glassmere.guild_hall';const initial=structuredClone(s);const r=run(s,[fee,reg,{...fee,seq:3}]);assert.equal(s.entities.pc.sheet.coin_cp,30);assert.ok(s.guild.membership);assert.equal(r.events.filter(e=>e.t==='guild.registered').length,1);const reload=structuredClone(initial);for(const e of JSON.parse(JSON.stringify(r.events)))applyEvent(reload,e);assert.deepEqual(reload,s);assert.equal(prior.entities.pc.sheet.coin_cp,50);});
for(const purpose of ['tip','repairs'])test('111 ordinary payment remains possible: '+purpose,()=>{const s=before(14);run(s,[{...fee,for:purpose,quote:'I pay the clerk twenty copper for '+purpose},reg]);assert.equal(s.entities.pc.sheet.coin_cp,30);});
test('111 original Turn 5 creation interface is rejected but normal training history stays',()=>{const s=before(5);const m=chat.find(m=>m.raw?.deltas?.some(d=>d.p==='interface'));const r=applyWorld(s,content,m.raw,{prose:m.mes,msg:10});assert.ok(r.rejected.some(x=>x.rule==='engine_owned_fact'));assert.ok(!r.events.some(e=>e.t==='fact.asserted'&&e.d.fact.p==='interface'));const ok=applyWorld(before(14),content,{scene:'here',expected:{},deltas:[{seq:1,type:'fact',s:'npc.npcglassmere_clerk',p:'history',o:'She trained as a Warrior and remembers learning Guard.'}]},{prose:'The clerk remembered her training.'});assert.ok(ok.events.some(e=>e.t==='fact.asserted'));});
test('111 creation complete remains explicit beyond the first story turn',()=>{const s=before(14);assert.match(buildContext(s,content,{input:'Warrior.'}).text,/CHARACTER CREATION is complete/);});
const question='I approach the front counter and ask the clerk how I can register with the Guild';
const parse=(s,cs,msg)=>parsePlan(JSON.stringify({commands:cs}),content.commandVocab,withContentSkills(planContext(s,content,buildCatalog(s,content,{known:true,c:true})),content,s),msg);
test('111 original T4 information question repairs instead of committing registration',()=>{const r=parse(before(4),[{seq:1,type:'guild.register',quote:question}],question);assert.equal(r.commands,null);assert.match(r.errors.join(' '),/question|information/);});
test('111 corrected approach is GO only, confirmed arrival reaches hall without registration',()=>{const s=before(4);const cs=[{seq:1,type:'go',to:'loc.glassmere.guild_hall',quote:'I approach the front counter'}];assert.ok(parse(s,cs,question).commands);const move=run(s,cs);s.last.outcome={auth:move.ctx.auth};const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[{seq:1,type:'arrive',at:'loc.glassmere.guild_hall',with:null,forced_by:null}]},{prose:'Alaric entered the hall.'});assert.equal(r.state.scene.at,'loc.glassmere.guild_hall');assert.equal(r.state.guild.membership,null);assert.equal(r.state.entities.pc.sheet.coin_cp,50);});
test('111 mere sign mention authorizes no arrival',()=>{const s=before(4);s.last.outcome={auth:{c:true}};const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[{seq:1,type:'arrive',at:'loc.glassmere.guild_hall',with:null,forced_by:null}]},{prose:'Alaric saw the Guild sign.'});assert.equal(r.state.scene.at,'loc.glassmere');});
test('111 original T3–14 bad-story chain keeps creation and money authoritative',()=>{
 const s=emptyState();let t=0;let blocked=false;
 for(const m of chat){
  if(m.is_user)t++;if(t>14)break;
  if(m.is_user&&t===14){
   applyEvent(s,m.events.find(e=>e.t==='turn.begun'));
   const r=run(s,JSON.parse(m.plan[0]).commands),old=m.events.find(e=>e.t==='outcome.recorded').d.outcome;
   applyEvent(s,{t:'outcome.recorded',d:{outcome:{...old,actions:r.ctx.actions,resolutions:r.ctx.resolutions,auth:r.ctx.auth,booked:r.ctx.booked}}});
  }else if(m.raw){
   const r=applyWorld(s,content,m.raw,{prose:m.mes,msg:t*2});
   if(t===5)blocked=r.rejected.some(e=>e.rule==='engine_owned_fact');
   for(const e of JSON.parse(JSON.stringify(r.events)))applyEvent(s,e);
  }else for(const e of m.events)applyEvent(s,e);
 }
 assert.ok(blocked);assert.equal(s.entities.pc.sheet.coin_cp,50);assert.equal(s.guild.membership,null);
 assert.equal(s.mode,'story');assert.equal(s.creation.step,3);assert.deepEqual(s.creation.skills,['warrior.heavy_slash','warrior.guard']);
 assert.ok(!Object.values(s.facts).some(f=>f.p==='interface'&&String(f.o).startsWith('CHARACTER CREATION')));
 assert.doesNotMatch(buildContext(s,content,{input:'Warrior.'}).text,/blocks everything/);
});
test('111 tip at the hall remains independent of registration, which charges its own fee',()=>{
 const s=before(14);s.scene.at='loc.glassmere.guild_hall';
 run(s,[reg]);const r=run(s,[{...fee,for:'tip',quote:'I give the clerk twenty copper as a tip'}, {...fee,seq:2}]);
 assert.equal(s.entities.pc.sheet.coin_cp,10);assert.ok(s.guild.membership);assert.equal(r.events.filter(e=>e.t==='guild.registered').length,1);
});
test('111 explicit commitment remains valid and ordinary interface fiction stays',()=>{
 const s=before(14);assert.ok(parse(s,[{seq:1,type:'guild.register',quote:'Register me now'}],'Register me now').commands);
 const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[{seq:1,type:'fact',s:'npc.npcglassmere_clerk',p:'interface',o:'She described the training college interface.'}]},{prose:'The clerk described a college.'});
 assert.ok(r.events.some(e=>e.t==='fact.asserted'&&e.d.fact.p==='interface'));
});
for(const shortened of [false,true])test('112 missing for cannot turn an explicit registration fee into free cash, shortened quote='+shortened,()=>{
 const s=before(14),text='I pay the clerk two silver for my registration.';
 const r=run(s,[{...fee,for:null,quote:shortened?'I pay the clerk two silver':text}],text);
 assert.equal(s.entities.pc.sheet.coin_cp,50);assert.equal(s.guild.membership,null);
 assert.ok(!r.events.some(e=>e.t==='transaction.completed'||e.t==='coin.changed'));
});
test('112 missing purpose at an actual hall uses the canonical service once',()=>{
 const s=before(14);s.scene.at='loc.glassmere.guild_hall';
 const text='I pay the clerk two silver to finish my registration.';
 const r=run(s,[{...fee,for:null,quote:'I pay the clerk two silver'}],text);
 assert.equal(s.entities.pc.sheet.coin_cp,30);assert.ok(s.guild.membership);
 assert.equal(r.events.filter(e=>e.t==='guild.registered').length,1);
});
test('112 a separate registration question does not change an ordinary payment',()=>{
 const s=before(14),text='I pay the clerk two silver for bread, then ask about registration.';
 run(s,[{...fee,for:null,quote:'I pay the clerk two silver for bread'}],text);
 assert.equal(s.entities.pc.sheet.coin_cp,30);assert.equal(s.guild.membership,null);
});
test('112 an explicit independent gift remains independent even when registration is mentioned',()=>{
 const s=before(14),text='I give the clerk two silver as a gift for helping with my registration.';
 run(s,[{...fee,for:null,quote:text}],text);
 assert.equal(s.entities.pc.sheet.coin_cp,30);assert.equal(s.guild.membership,null);
});
test('112 a full quote with a later how-to-register question does not repurpose bread money',()=>{
 const s=before(14),text='I pay the clerk two silver for bread, then ask how to register.';
 run(s,[{...fee,for:null,quote:text}],text);
 assert.equal(s.entities.pc.sheet.coin_cp,30);assert.equal(s.guild.membership,null);
});
