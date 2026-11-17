import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../helpers.js';
import {Chat4} from './harness.js';
import {rec,foldChat} from '../../src/host.js';
import {actionPrefix,validateActionSelection,hudCommands,reconcileHudPlan} from '../../src/action_input.js';
import {playerTurn} from '../../src/engine.js';
import {run191,before191,player191} from './batch191_lib.js';
import {itemProfile} from '../../src/v4/items.js';
import {buildContext} from '../../src/context.js';
const {prepareGenerationAsync}=await import(process.env.AVERETH_ACTION_BASELINE || '../../src/v4/runtime.js');
const content=await loadContent();
const A='mon.barkscorpion_1';
async function fixture(){
 const g=new Chat4(content);await g.player('Mage');await g.player('Flame Lance and Arcane Burst');
 await g.player('I climb down into the old burrow.',[{seq:1,type:'go',to:{new:'the old burrow'},quote:'I climb down into the old burrow'}]);
 await g.reply('Three barkscorpions skitter out of the dark and rush at Alaric.',{expected:{},deltas:[
  {seq:1,type:'creature.new',ref:'barkscorpion',species:'barkscorpion',anchor:'arthropod',desc:['bark-plated'],count:3,present:true,band:'SHORT',stronger:null},
  {seq:2,type:'hostile',by:['barkscorpion'],scope:'all',evidence:'rush at Alaric'},
 ]});return g;
}
const selection={id:'choice',kind:'attack',skill:'mage.flame_lance',target:A};
function input(g,sel=selection,text='I shout to my party members to take the left flank!',mode='hud_roleplay'){
 const base_revision=actionPrefix(g.chat),before=g.state();
 const value={v:1,id:'input-1',revision:1,origin:{avatar:'test',file:'test'},base_revision,encounter:before.encounter?.id || null,mode,selection:sel,text};
 const msg={mes:text,is_user:true,extra:{avereth_action_input:value}};g.chat.push(msg);return {before,msg,value};
}
test('A01/A11: HUD with companion speech bypasses Planner; same mechanics as the existing typed Engine intent',async()=>{
 const g=await fixture(),{before,msg}=input(g);let calls=0;
 const expected=playerTurn(before,content,msg.mes,{msg:g.chat.length-1,intent:{kind:'attack',skill:selection.skill,target:A,target_how:'hud',move:null,move_target:null},c:true});
 const out=await prepareGenerationAsync(g.chat,content,{settings:{planner:true},llm:async()=>{calls++;return '{"commands":[]}';}});
 assert.equal(calls,0);assert.equal(out.action,'context');
 assert.match(out.context.text,/Combat roleplay/);assert.doesNotMatch(out.context.text,/nobody talks|no dialogue \(combat silence/);
 assert.ok(rec(msg).action_input_hash);assert.deepEqual(rec(msg).events,expected.events);
 assert.equal(g.state().rng.n,expected.state.rng.n);
});
test('A02/A03/A07: stale target, MP and impossible range refuse without mutation or calls',async()=>{
 const g=await fixture(),state=g.state(),original=structuredClone(state);
 assert.equal(validateActionSelection({...selection,target:'missing'},state,content).ok,false);
 state.encounter.combatants.pc.current.mp=0;
 assert.equal(validateActionSelection(selection,state,content).ok,false);
 state.encounter.combatants.pc.current.mp=original.encounter.combatants.pc.current.mp;
 const before=structuredClone(state);validateActionSelection(selection,state,content);assert.deepEqual(state,before);
 const {msg}=input(g,{...selection,target:'missing'});let calls=0;
 await prepareGenerationAsync(g.chat,content,{settings:{planner:true},llm:async()=>{calls++;return '{"commands":[]}';}});
 assert.equal(calls,0);assert.deepEqual(rec(msg).events,[]);assert.match(rec(msg).action_error,/Ziel/);
});
test('A16: regenerate/reload reuses action; changing booked choice cannot roll again',async()=>{
 const g=await fixture();input(g);const opts={settings:{planner:true},llm:async()=>'{"commands":[]}'};
 await prepareGenerationAsync(g.chat,content,opts);const first=structuredClone(rec(g.chat.at(-1)));
 const reloaded=structuredClone(g.chat);await prepareGenerationAsync(reloaded,content,{...opts,type:'regenerate'});
 assert.deepEqual(rec(reloaded.at(-1)).events,first.events);
 reloaded.at(-1).extra.avereth_action_input.selection.target='mon.barkscorpion_2';
 const blocked=await prepareGenerationAsync(reloaded,content,opts);assert.equal(blocked.action,'abort');assert.deepEqual(rec(reloaded.at(-1)).events,first.events);
});
test('A12/A14: full-plan binding rejects changed IDs, duplicates, missing anchors and conflicting decisions',()=>{
 const i={selection},commands=hudCommands(selection),bind={id:'choice',decision:'use',seqs:[1]};
 assert.equal(reconcileHudPlan(i,commands,bind).ok,true);
 for(const b of [null,{...bind,decision:'conflict'},{...bind,id:'forged'}])assert.equal(reconcileHudPlan(i,commands,b).ok,false);
 assert.equal(reconcileHudPlan(i,[{...commands[0],target:'other'}],bind).ok,false);
 assert.equal(reconcileHudPlan(i,[...commands,{...commands[0],seq:2}],bind).ok,false);
 assert.equal(reconcileHudPlan(i,[{...commands[0],needs:3}],bind).ok,false);
});
test('A12: F plans once with actual anchor and executes it without a fabricated quote',async()=>{
 const g=await fixture();const {msg}=input(g,selection,'I shout to my friends!','hud_free');let calls=0;
 await prepareGenerationAsync(g.chat,content,{settings:{planner:true},llm:async req=>{
  calls++;assert.ok(req.messages.some(m=>m.content.includes('HOST HUD SELECTION')));
  return JSON.stringify({commands:hudCommands(selection),hud_binding:{id:'choice',decision:'use',seqs:[1]}});
 }});
 assert.equal(calls,1);assert.ok(rec(msg).events.some(e=>e.t==='outcome.recorded'));assert.equal(rec(msg).action_error,undefined);
});
test('A06/A07: original .191 W #29 approaches once; #127/#129 never perform a partial move',async()=>{
 for(const i of [29,127,129]){
  const source=run191('w191').chat,original=source[i],mapped=original.extra.avereth.plan.mapped;
  const s=before191('w191',i),sel={id:'original',kind:'attack',skill:mapped.skill,target:mapped.target,approach:true};
  const check=validateActionSelection(sel,s,content);
  assert.equal(check.ok,i===29,`W #${i}: ${check.reason}`);
  const chat=structuredClone(source.slice(0,i)),base_revision=actionPrefix(chat);
  chat.push({mes:original.mes,is_user:true,extra:{avereth_action_input:{id:`w-${i}`,revision:1,mode:'hud_roleplay',base_revision,selection:sel,text:original.mes}}});
  await prepareGenerationAsync(chat,content,{settings:{planner:true},llm:async()=>{throw Error('unexpected model request');}});
  if(i===29){const expected=await player191('w191',i);assert.deepEqual(rec(chat.at(-1)).events,expected.record.events);}
  else {assert.deepEqual(rec(chat.at(-1)).events,[]);assert.deepEqual(foldChat(chat).state,s);}
 }
});
test('A04/A05: defensive skill and focused movement retain ordinary combat consequences',async()=>{
 const g=await fixture(),s=g.state();s.entities.pc.sheet.skills['warrior.guard']={prof:1,pp:0};s.encounter.combatants.pc.fixed.actions['warrior.guard']={prof:1,pp:0};
 for(const selection of [{id:'guard',kind:'skill',skill:'warrior.guard'},{id:'move',kind:'move',dir:'away',target:A}]) {
  const check=validateActionSelection(selection,s,content);assert.equal(check.ok,true,check.reason);
  const before=structuredClone(s);assert.deepEqual(s,before);
  const old=playerTurn(s,content,'',{intent:check.mapped.intent,c:true});
  assert.ok(old.events.some(e=>e.t==='outcome.recorded'));assert.ok(old.state.turn>s.turn);
 }
});
function addObject(g,object){rec(g.chat.findLast(m=>rec(m))).events.push({t:'object.created',d:{object:{kind:'item',qty:1,holder:{entity:'pc'},marks:[],for_quests:[],...object}}});}
test('A08: potion is one combat action; full resource and excessive rank consume nothing',async()=>{
 const g=await fixture();addObject(g,{id:'obj.potion',name:'minor mana potion',use:'consumable',profile:itemProfile(content,{name:'minor mana potion',kind:'item'})});
 // Existing combat fixture has spent MP during creation? Explicitly damage a copied state for the pure check.
 const s=g.state();s.encounter.combatants.pc.current.mp-=10;
 const sel={id:'potion',kind:'use',object:'obj.potion'};
 assert.equal(validateActionSelection(sel,s,content).ok,true);
 const out=playerTurn(s,content,'',{intent:{kind:'item',item:'obj.potion'},c:true});
 assert.equal(out.events.filter(e=>e.t==='object.consumed').length,1);
 s.encounter.combatants.pc.current.mp=s.encounter.combatants.pc.fixed.max_mp;
 assert.equal(validateActionSelection(sel,s,content).ok,false);
 s.encounter.combatants.pc.current.mp-=10;s.objects['obj.potion'].profile.requires_rank='S';
 assert.equal(validateActionSelection(sel,s,content).ok,false);
});
test('A09: quiet food/tool use shares the ordinary V4 booking path and requires actual ownership',async()=>{
 for(const [name,use,spent] of [['heel of bread','food',true],['flint and steel','tool',false]]){
  const g=new Chat4(content);await g.player('Mage');await g.player('Flame Lance and Arcane Burst');
  addObject(g,{id:'obj.use',name,use});
  const sel={id:'use',kind:'use',object:'obj.use'},s=g.state();
  assert.equal(validateActionSelection(sel,s,content).ok,true);
  const {msg}=input(g,sel,'I use my selected item.');
  await prepareGenerationAsync(g.chat,content,{settings:{planner:true},llm:async()=>{throw Error('unexpected Planner');}});
  assert.equal(rec(msg).events.some(e=>e.t==='object.consumed'),spent);
  s.objects['obj.use'].holder={entity:'npc.other'};assert.equal(validateActionSelection(sel,s,content).ok,false);
 }
});
test('A10: AoE preview is pure and uses the actual band, cover and neutral rules',async()=>{
 const g=await fixture(),s=g.state();for(const c of Object.values(s.encounter.combatants))if(c.id!=='pc')c.current.band='ENGAGED';
 const a={...selection,skill:'mage.arcane_burst'},before=structuredClone(s);
 const check=validateActionSelection(a,s,content);assert.equal(check.ok,true,check.reason);assert.equal(check.preview.targets.length,3);assert.deepEqual(s,before);
 s.encounter.combatants['mon.barkscorpion_2'].side='ally';
 assert.equal(validateActionSelection(a,s,content).preview.targets.includes('mon.barkscorpion_2'),false);
});
test('A26: ordinary Extractor after HUD keeps a new NPC promise for later context',async()=>{
 const g=await fixture();input(g);
 await prepareGenerationAsync(g.chat,content,{settings:{planner:true},llm:async()=>{throw Error('unexpected Planner');}});
 const text='Wat, a porter, stood beside Alaric. Wat promised Alaric to show him the old ford after the fight.';
 await g.reply(text,{scene:'here',expected:{},deltas:[
  {seq:1,type:'person.new',ref:'wat',name:'Wat',role:'porter',desc:['weathered coat'],present:true,relevant:true,threat:null,at:null,band:'SHORT'},
  {seq:2,type:'thread',id:null,text:'Wat promised Alaric to show him the old ford after the fight',kind:'promise',status:'open',resolution:null,who:['pc','wat'],scene:null},
 ]});
 const s=g.state();assert.ok(Object.values(s.threads || {}).some(t=>t.kind==='promise' && /old ford/.test(t.text)));
 assert.equal(rec(g.chat.at(-1)).extraction.status,'applied');
 const context=buildContext(s,content,{budget:2600,input:'I ask Wat about his promise.',lastReply:'',recentTurns:0});
 assert.match(context.text,/old ford/);
});
test('A14: HUD attack depending on an unresolved free action cannot lose its condition in combat mapping',async()=>{
 const g=await fixture(),{before,msg}=input(g,selection,'I signal Wat; only if he responds, I use the selected attack.','hud_free');
 await prepareGenerationAsync(g.chat,content,{settings:{planner:true},llm:async()=>JSON.stringify({commands:[
  {seq:1,type:'other',what:'signal Wat',quote:'I signal Wat'},
  {...hudCommands(selection)[0],seq:2,needs:1},
 ],hud_binding:{id:'choice',decision:'use',seqs:[2]}})});
 assert.equal(rec(msg).events.length,0);assert.ok(rec(msg).action_error);assert.deepEqual(g.state(),before);
});
test('A09: original offensive scroll retains its explicit target in both H and F; no second consumption after reload',async()=>{
 const {readFile}=await import('node:fs/promises');
 const original=JSON.parse(await readFile(new URL('./live_1020.json',import.meta.url),'utf8')).messages;
 const events=[];
 for(const mode of ['hud_roleplay','hud_free']) {
  const g=new Chat4(content);g.chat=structuredClone(original.slice(0,37));
  const sel={id:'scroll',kind:'use',object:'obj.t21.scorchburst_scroll_first_circle_one_use',target:'mon.crystal_beetle_swarm_2'};
  const {before,msg}=input(g,sel,'I use the selected scroll.',mode);
  const opts={settings:{planner:true},llm:async()=>JSON.stringify({commands:hudCommands(sel),hud_binding:{id:'scroll',decision:'use',seqs:[1]}})};
  await prepareGenerationAsync(g.chat,content,opts);
  assert.equal(rec(msg).action_error,undefined);assert.equal(rec(msg).events.filter(e=>e.t==='object.consumed').length,1);
  const expected=playerTurn(before,content,msg.mes,{msg:g.chat.length-1,intent:validateActionSelection(sel,before,content).mapped.intent,c:true});
  assert.deepEqual(rec(msg).events,expected.events);events.push(rec(msg).events);
  const after=structuredClone(g.state());await prepareGenerationAsync(g.chat,content,{...opts,type:'regenerate'});assert.deepEqual(g.state(),after);
 }
 assert.deepEqual(events[0],events[1]);
});
test('A13/A17: same companion prose never adds its own potion action and distinct typed choices have distinct identity',async()=>{
 const records=[];
 for(const target of [A,'mon.barkscorpion_2']) {
  const g=await fixture(),{msg}=input(g,{...selection,target},'I attack and drink my potion.');
  await prepareGenerationAsync(g.chat,content,{settings:{planner:true},llm:async()=>{throw Error('H must not plan prose');}});
  assert.equal(rec(msg).events.filter(e=>e.t==='object.consumed').length,0);records.push(rec(msg));
 }
 assert.notEqual(records[0].action_input_hash,records[1].action_input_hash);
});
test('A20: a late F plan cannot book after Stop or a changed input revision',async()=>{
 for(const change of ['stop','revision']) {
  const g=await fixture(),{msg}=input(g,selection,'I use the selected action.','hud_free');let current=true,release;
  const wait=new Promise(resolve=>release=resolve);
  const pending=prepareGenerationAsync(g.chat,content,{settings:{planner:true},isCurrent:()=>current,llm:async()=>{await wait;return JSON.stringify({commands:hudCommands(selection),hud_binding:{id:'choice',decision:'use',seqs:[1]}});}});
  if(change==='stop')current=false;else msg.extra.avereth_action_input.revision++;
  release();const result=await pending;assert.equal(result.stale,true);assert.equal(rec(msg),undefined);
 }
});
test('A17/A19: editing unbooked text without revising its input identity refuses before planning',async()=>{
 const g=await fixture(),{msg}=input(g);msg.mes='Instead I drink a potion.';let calls=0;
 await prepareGenerationAsync(g.chat,content,{settings:{planner:true},llm:async()=>{calls++;return '{}';}});
 assert.equal(calls,0);assert.equal(rec(msg).events.length,0);assert.match(rec(msg).action_error,/Eingaberevision/);
});
test('A24: classified unknown remote completion makes exactly one Planner attempt and no booking',async()=>{
 const g=await fixture(),{msg}=input(g,selection,'I use the selected action.','hud_free');let calls=0;
 await prepareGenerationAsync(g.chat,content,{settings:{planner:true},llm:async()=>{calls++;throw Object.assign(new Error('remote unknown'),{code:'LLM_CAPACITY_BLOCKED'});}});
 assert.equal(calls,1);assert.equal(rec(msg).events.length,0);assert.equal(rec(msg).plan.llm[0].error_kind,'remote_unknown');assert.equal(rec(msg).plan.llm[0].unclassified,undefined);
});
test('A02/A10: a present actor outside the current initiative can be selected without a preview crash or mutation',async()=>{
 const g=await fixture(),s=g.state(),target='mon.barkscorpion_2';
 // Controlled countercase: a known present actor with profile has not joined the existing initiative yet.
 delete s.encounter.combatants[target];s.encounter.order=s.encounter.order.filter(id=>id!==target);
 const before=structuredClone(s),sel={...selection,target};
 const check=validateActionSelection(sel,s,content);
 assert.equal(check.ok,true,check.reason);assert.deepEqual(s,before);
 const real=playerTurn(s,content,'',{intent:check.mapped.intent,c:true});
 assert.ok(real.events.some(e=>e.t==='outcome.recorded'));
});
