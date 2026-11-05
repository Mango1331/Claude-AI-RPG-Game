import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, showPanel } from '../../src/host.js';
import { applyEvent } from '../../src/state.js';
import * as hud from '../../src/hud.js';
import { clearDone } from '../../src/v4/living.js';
import { parsePlan, mapPlan, planContext, withContentSkills } from '../../src/v4/planner.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { playerTurn } from '../../src/engine.js';
const content = await loadProductContent();
const u = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user01_stealth.json.gz', import.meta.url))));
const b = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/batch22_design148.json.gz', import.meta.url))));
const base = () => foldChat(structuredClone(u.prefix)).state;
const mage = () => structuredClone(b.mage.before);
const context = s => withContentSkills(planContext(s, content, buildCatalog(s, content, { known: true, c: true })), content, s);
function wave(s, extra = {}) {
 const text = 'I cast Arcane Wave.', c = context(s);
 return mapPlan([{seq:1,type:'use_skill',skill:'mage.arcane_wave',target:null,quote:text,...extra}], c, content, text, s);
}
const foes = s => s.scene.present.filter(id=>id.startsWith('mon.'));
test('157 unique visible enemy band executes Wave once and spares Brenna; fold is identical', () => {
 const s=mage(), m=wave(s); assert.equal(m.intent.kind,'attack');
 const r=playerTurn(s, content,'I cast Arcane Wave.',{c:true,intent:m.intent});
 const a=r.outcome.records.find(x=>x.actor==='pc'&&x.kind==='attack');
 assert.deepEqual(a.strikes.map(x=>x.target).sort(),foes(s).sort());
 assert.equal(s.entities.pc.sheet.mp-r.state.entities.pc.sheet.mp,14);
 assert.equal(r.state.encounter?.combatants?.['npc.brenna'],undefined);
 const reload=structuredClone(s);r.events.forEach(e=>applyEvent(reload,JSON.parse(JSON.stringify(e))));
 assert.deepEqual(JSON.parse(JSON.stringify(reload)),JSON.parse(JSON.stringify(r.state)));
});
test('157 more than one reachable band, full cover or all out of reach retains clarification at no mutation', () => {
 for(const variant of ['bands','cover','range']){
  const s=mage(), ids=foes(s); for(const id of ids) s.scene.positions[id]={...s.scene.positions[id],band:variant==='range'?'LONG':'SHORT',cover:variant==='cover'?'full':'none'};
  if(variant==='bands')s.scene.positions[ids[0]].band='ENGAGED';
  const snapshot=JSON.stringify(s); assert.equal(wave(s).intent.kind,'no_target');assert.equal(JSON.stringify(s),snapshot);
 }
});
test('157 explicit absent target never substitutes the unique band; deliberate NPC remains selectable',()=>{
 const s=mage();assert.equal(wave(s,{target:{new:'absent beetle'}}).intent.kind,'no_target');
 assert.equal(wave(s,{target:'npc.brenna'}).intent.target,'npc.brenna');
});
test('157 movement preview uses actual one-band step; no extra step to make Wave fit',()=>{
 const s=mage();for(const id of foes(s))s.scene.positions[id].band='LONG';
 const c=context(s), text='I move closer and cast Arcane Wave.';
 const m=mapPlan([{seq:1,type:'move',dir:'closer',target:null,quote:'I move closer'},{seq:2,type:'use_skill',skill:'mage.arcane_wave',target:null,quote:'cast Arcane Wave'}],c,content,text,s);
 assert.equal(m.intent.kind,'attack'); assert.equal(m.intent.move,'closer');
 const r=playerTurn(s,content,text,{c:true,intent:m.intent});assert.ok(r.outcome.records.some(x=>x.actor==='pc'&&x.kind==='attack'));
});
test('157 floor remains in collapsed World and active Combat, using gate/room fallback without invented state',()=>{
 const s=base(), root=s.places[Object.keys(s.dungeons)[0]];assert.ok(root);
 const room=Object.values(s.places).find(p=>p.parent===root.id);assert.ok(room);
 s.scene.at=room.id;s.scene.location=root.id;room.level=2;
 assert.match(hud.renderHud(s,content),/Dungeon level 2/);
 delete room.level;assert.match(hud.renderHud(s,content),/Dungeon level 1/);
 s.scene.at=root.id;assert.match(hud.renderHud(s,content),/Dungeon entrance/);
 const c=mage(), combat=playerTurn(c,content,'Wave',{c:true,intent:{kind:'attack',skill:'mage.arcane_wave',target:foes(c)[0]}}).state;
 combat.places[root.id]=structuredClone(root);combat.places[room.id]={...room,level:2};combat.scene.at=room.id;
 assert.match(hud.renderHud(combat,content),/Dungeon level 2/);
});
test('157 awareness distinguishes known levels and unknown without promising Ambush',()=>{
 const s=mage(),ids=foes(s);ids.forEach((id,i)=>s.scene.awareness[id]=['unaware','suspicious','aware'][i]);
 let present=Object.fromEntries(hud.worldRows(s,content)).Present;
 for(const v of ['unaware','suspicious','aware'])assert.match(present,new RegExp(`awareness: ${v}`));
 delete s.scene.awareness[ids[0]];present=Object.fromEntries(hud.worldRows(s,content)).Present;
 assert.match(present,/awareness: unknown/);assert.doesNotMatch(present,/guaranteed|Ambush bonus/i);
});
test('157 ground list exposes only reachable free objects and never takes them',()=>{
 const s=base(), at=s.scene.at;s.features.chest={id:'chest',name:'Shut chest',kind:'obstacle',status:'active',at};
 s.objects={
  free:{id:'free',name:'<Bone hook>',qty:2,unit:'pieces',holder:{loc:at}},
  same:{id:'same',name:'<Bone hook>',qty:1,holder:{loc:at}},
  npc:{id:'npc',name:'Private necklace',holder:{entity:'npc.hesk'}},
  pc:{id:'pc',name:'My staff',holder:{entity:'pc'}},
  away:{id:'away',name:'Distant gem',holder:{loc:'loc.alderwatch'}},
  shut:{id:'shut',name:'Hidden gold',holder:{loc:at},in:'chest'}
 };
 const before=JSON.stringify(s), rows=Object.fromEntries(hud.worldRows(s,content));
 assert.match(rows['On the ground'],/<Bone hook>.*×2/);assert.doesNotMatch(rows['On the ground'],/necklace|staff|gem|gold/);
 assert.match(hud.renderHud(s,content),/&lt;Bone hook&gt;/);assert.equal(JSON.stringify(s),before);
});
test('157 compact board preserves canonical danger/reward and escapes text, with details instead of five walls',()=>{
 const s=base(), q=Object.values(s.quests).find(q=>q.kind==='guild_contract');assert.ok(q);
 const snapshot=JSON.stringify(s), board={branch:q.branch,rank:q.rank,listings:[q.id]};
 const html=hud.renderBoardCards(s,content,board);
 assert.match(html,/avereth-board/);assert.match(html,/<details/);assert.ok(html.includes(q.title));assert.match(html,/reward/i);
 assert.equal(JSON.stringify(s),snapshot);
 q.title='<img onerror=bad>';assert.ok(!hud.renderBoardCards(s,content,board).includes('<img'));
});
test('157 old own clear does not fulfill newer contract or become credited to others',()=>{
 const s=base(),root=Object.keys(s.dungeons)[0];assert.ok(root);const x=s.dungeons[root];
 x.clears=[{floor:1,credit:'pc',turn:10}];x.run.floors[1].cleared=true;
 const q={kind:'guild_contract',clear:{dungeon:root,floor:1},history:[{status:'active',turn:11}]};
 const r=clearDone(s,q);assert.equal(r.ok,false);assert.match(r.text,/before this contract/);
 x.clears[0].credit='npc';assert.equal(clearDone(s,q).text,'cleared by others');
 x.clears.push({floor:1,credit:'pc',turn:12});assert.equal(clearDone(s,q).ok,true);
});
test('157 tactical display has one target snapshot and preserves action/refusal log',()=>{
 const s=mage(),r=playerTurn(s,content,'Wave',{c:true,intent:{kind:'attack',skill:'mage.arcane_wave',target:foes(s)[0]}}), msg={mes:'Story',extra:{}};
 showPanel(msg,'COMBAT TARGETS: old\nHP: old\nRange: old\nHit for 3 damage\nNOT TAKEN: search',hud.renderHud(r.state,content),{playerFacing:true});
 assert.equal((msg.extra.display_text.match(/avereth-combat-hud/g)||[]).length,1);assert.doesNotMatch(msg.extra.display_text,/COMBAT TARGETS: old/);assert.match(msg.extra.display_text,/Hit for 3 damage/);assert.match(msg.extra.display_text,/NOT TAKEN/);
});
test('157 active combat uses the same unique-band rule without replacing an explicit target',()=>{
 const s=mage(),r=playerTurn(s,content,'Wave',{c:true,intent:{kind:'attack',skill:'mage.arcane_wave',target:foes(s)[0]}}), state=r.state;
 assert.ok(state.encounter);const m=wave(state);assert.equal(m.intent.kind,'attack');
 assert.equal(m.intent.target_how,'unique area band');
 const ids=Object.values(state.encounter.combatants).filter(c=>c.side==='hostile'&&!c.current.defeated).map(c=>c.id);
 if(ids.length>1){state.encounter.combatants[ids[0]].current.band='ENGAGED';assert.equal(wave(state).intent.kind,'no_target');}
});
test('157 board rendering replaces only its canonical snapshot and keeps audit fallback untouched',()=>{
 const s=base(), q=Object.values(s.quests).find(q=>q.kind==='guild_contract'), board={rank:q.rank,listings:[q.id]};
 const raw=`SYSTEM — GUILD BOARD · ${q.rank} · town\nOld dense line\nPAYMENT: unchanged`,msg={mes:'Story',extra:{}};
 showPanel(msg,raw,hud.renderBoardCards(s,content,board),{playerFacing:true});
 assert.doesNotMatch(msg.extra.display_text,/Old dense line/);assert.match(msg.extra.display_text,/PAYMENT: unchanged/);
 showPanel(msg,raw,'',{playerFacing:true});assert.match(msg.extra.display_text,/Old dense line/);
});
test('157 current other-party clear is not attributed to an older own clear',()=>{
 const s=base(),root=Object.keys(s.dungeons)[0],x=s.dungeons[root];
 x.clears=[{floor:1,credit:'pc',turn:10}];x.run.floors[1].cleared={credit:'others',turn:20};
 assert.equal(clearDone(s,{kind:'guild_contract',clear:{dungeon:root,floor:1},history:[{status:'active',turn:30}]}).text,'cleared by others');
});

test('157 User01 original four MEDIUM beetles accept a targetless Wave without altering the field',()=>{
 const s=foldChat(structuredClone(u.prefix.slice(0,19))).state, ids=foes(s);
 assert.equal(ids.length,4);assert.ok(ids.every(id=>s.scene.positions[id].band==='MEDIUM'));
 const m=wave(s);assert.equal(m.intent.kind,'attack');const r=playerTurn(s,content,'I cast Arcane Wave.',{c:true,intent:m.intent});
 const a=r.outcome.records.find(x=>x.actor==='pc'&&x.kind==='attack');assert.deepEqual(a.strikes.map(x=>x.target).sort(),ids.sort());
 assert.equal(s.entities.pc.sheet.mp-r.state.entities.pc.sheet.mp,14);
});
test('157 displayed free stack supports ordinary partial TAKE then disappears exactly when collected',()=>{
 const s=base(),at=s.scene.at;s.objects.free={id:'free',name:'Bone hooks',qty:2,stack:true,holder:{loc:at}};
 const r=playerTurnV4(s,content,'I take one bone hook.',{c:true,commands:[{seq:1,type:'take',object:'free',qty:1,quote:'I take one bone hook.'}]});
 assert.equal(r.state.objects.free.qty,1);assert.equal(r.state.objects.free.holder.loc,at);
 const next=playerTurnV4(r.state,content,'I take the other bone hook.',{c:true,commands:[{seq:1,type:'take',object:'free',qty:null,quote:'I take the other bone hook.'}]});
 assert.equal(next.state.objects.free.holder.entity,'pc');
 assert.ok(!Object.fromEntries(hud.worldRows(next.state,content))['On the ground']?.includes('Bone hooks'));
 const again=playerTurnV4(next.state,content,'I take the bone hook.',{c:true,commands:[{seq:1,type:'take',object:'free',qty:null,quote:'I take the bone hook.'}]});
 assert.ok(!again.events.some(e=>e.t==='object.moved'));assert.deepEqual(again.state.objects,next.state.objects);
});
