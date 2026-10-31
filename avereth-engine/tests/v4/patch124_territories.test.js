import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { emptyState, applyEvent, fold } from '../../src/state.js';
import { startCampaign, materialise } from '../../src/engine.js';
import { applyWorld } from '../../src/v4/world.js';
import { Dice } from '../../src/rng.js';
import { parseBoard, bookBoard } from '../../src/v4/guild.js';
import { parseExtraction, worldVocab } from '../../src/v4/extract.js';
import { validateState } from '../../src/validate.js';
import { boardKey, today, populationAt } from '../../src/v4/domain.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { buildContext } from '../../src/context.js';
import { extractorCatalog } from '../../src/v4/catalog.js';
const c = await loadProductContent(), clone = structuredClone;
test('population lookup rejects a giant boar among giant snapping turtles', () => {
 const s = state();
 s.places['loc.forest'].population = {species:'giant snapping turtles', anchor:'aquatic', levels:[4,7]};
 assert.equal(populationAt(s, 'loc.forest', {species:'giant boar', anchor:'boar'}, c, {matchAnchor:false}), null);
});
test('World keeps a foreign giant boar on its own body plan and area levels, including replay', () => {
 const s = area(state()).state;
 s.places['loc.forest'].population = {species:'giant snapping turtles', anchor:'aquatic', levels:[4,7]};
 const r = applyWorld(s, c, {scene:'here', expected:{}, deltas:[{seq:1,type:'creature.new',ref:'boar',species:'giant boar',anchor:'boar',desc:[],count:1,present:true,band:'MEDIUM',more:true}]}, {msg:105,prose:'A giant boar stands in the forest.'});
 const e = Object.values(r.state.entities).find(e => e.kind === 'creature');
 assert.equal(e.anchor, 'boar'); assert.equal(e.profile.anchor, 'boar');
 assert.equal(e.population_at, undefined); assert.ok(e.profile.level >= 8 && e.profile.level <= 11);
 const replay = clone(s); for (const event of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, event);
 assert.deepEqual(replay, r.state); assert.deepEqual(validateState(replay,c), []);
});
test('population species retain singular/plural and established kind synonyms', () => {
 const s = state(), p = s.places['loc.forest'];
 for (const [population,species] of [['giant snapping turtles','giant snapping turtle'],['giant snapping turtle','giant snapping turtles'],['dogs','feral hound']]) {
  p.population = {species:population,anchor:'aquatic',levels:[4,7]};
  assert.equal(populationAt(s,'loc.forest',{species,anchor:'rat'},c,{matchAnchor:false}),p);
 }
});
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/batch18_turtles.json',import.meta.url)));
const pop = 'realm.valedorn_crown.the_millpond_at_gristbeck_upstream_of_the_millrace_gates';
for (const sample of fixture.samples) test(`Batch18 original ${sample.i}: turtles retain the established aquatic population and L4-7`,()=>{
 const s=fold(sample.events_before),r=applyWorld(s,c,clone(sample.answer),{msg:sample.i,prose:sample.prose});
 const ids=r.events.filter(e=>e.t==='entity.created'&&e.d.entity.kind==='creature').map(e=>e.d.entity.id);
 assert.ok(ids.length>=2);
 for(const id of ids){const e=r.state.entities[id];assert.equal(e.anchor,'aquatic');assert.equal(e.profile.anchor,'aquatic');assert.equal(e.population_at,pop);assert.ok(e.profile.level>=4&&e.profile.level<=7);}
 assert.deepEqual(validateState(r.state,c),[]);
 const again=fold([...sample.events_before,...JSON.parse(JSON.stringify(r.events))]);assert.deepEqual(again,r.state);
});
function state(){const s=emptyState();for(const e of startCampaign(c,{runtime:'v4',ruleset:2,seed:7}))applyEvent(s,e);
 s.places['loc.forest']={id:'loc.forest',name:'Blackthorn Forest',kind:'wilderness',parent:'realm.valedorn_crown',realm:'realm.valedorn_crown'};
 s.scene.at='loc.forest';s.last.outcome={c:true,auth:{c:true,gos:[]},expected_keys:{}};return s;}
function area(s,levels=[8,11],how='seen',place='loc.forest'){
 return applyWorld(s,c,{scene:s.scene.at,expected:{},deltas:[{seq:1,type:'area',place,min_level:levels[0],max_level:levels[1],how,evidence:'Blackthorn Forest is a deep dangerous wilderness.'}]},{msg:100,prose:'Blackthorn Forest is a deep dangerous wilderness.'});
}
function beast(s,{id='mon.probe',anchor='wolf',species='wolf',at='loc.forest',level,threat}={}){
 s.entities[id]={id,kind:'creature',status:'alive',species,anchor,at,...(level?{level}:{}),...(threat===false?{threat}:{}),descriptors:[]};
 materialise(s,c,Dice.from(s),e=>applyEvent(s,e),id);return s.entities[id];
}
test('area delta fixes a validated span through existing place events without arrival/spawn',()=>{
 const s=state(),r=area(s);assert.deepEqual(r.state.places['loc.forest'].encounter_levels,[8,11]);
 assert.equal(r.state.scene.at,s.scene.at);assert.equal(Object.keys(r.state.entities).length,Object.keys(s.entities).length);
 assert.ok(r.events.some(e=>e.t==='place.updated'));
 const replay=clone(s);for(const e of JSON.parse(JSON.stringify(r.events)))applyEvent(replay,e);assert.deepEqual(replay,r.state);
 const schema=parseExtraction(JSON.stringify({scene:'here',expected:{},deltas:[{seq:1,type:'area',place:'loc.forest',min_level:8,max_level:11,how:'seen',evidence:'Blackthorn Forest is a deep dangerous wilderness.'}]}),worldVocab(c.deltaVocab,s),{places:Object.keys(s.places),objects:[],quests:[]},{},{state:s});assert.equal(schema.valid,true,schema.errors?.join(';'));
});
test('nearest area ancestor supplies new outdoor levels independent of PC level; explicit population takes priority',()=>{
 const s=area(state()).state;s.places['loc.den']={id:'loc.den',name:'A hollow',kind:'site',parent:'loc.forest'};
 const first=beast(s,{at:'loc.den'});assert.ok(first.profile.level>=8&&first.profile.level<=11);
 s.entities.pc.sheet.level=14;const fixed=clone(first.profile);materialise(s,c,Dice.from(s),e=>applyEvent(s,e),first.id);assert.deepEqual(first.profile,fixed);
 s.places['loc.den'].population={species:'wolf',anchor:'wolf',levels:[4,7]};const local=beast(s,{id:'mon.local',at:'loc.den'});assert.ok(local.profile.level>=4&&local.profile.level<=7);assert.equal(local.population_at,'loc.den');
 const other=beast(s,{id:'mon.rat',at:'loc.den',anchor:'rat',species:'rat'});assert.ok(other.profile.level>=8&&other.profile.level<=11);assert.equal(other.population_at,undefined);
});
test('existing area is immutable; child override applies only to new creatures',()=>{
 const s=area(state()).state;const e=beast(s),saved=clone(e.profile);
 const r=area(s,[1,3]);assert.deepEqual(r.state.places['loc.forest'].encounter_levels,[8,11]);assert.ok(r.rejected.length);
 s.places['loc.den']={id:'loc.den',name:'Low hollow',kind:'site',parent:'loc.forest'};s.scene.at='loc.den';const child=area(s,[1,3],'seen','loc.den').state;
 assert.ok(beast(child,{id:'mon.child',at:'loc.den'}).profile.level<=3);assert.deepEqual(child.entities[e.id].profile,saved);
});
test('rumours, unquoted evidence, invalid ranges, towns and true Dungeons establish no outdoor profile',()=>{
 for(const mode of ['rumor','evidence','range','town','dungeon']){
  const s=state();if(mode==='town')s.places['loc.forest'].kind='settlement';if(mode==='dungeon')s.places['loc.forest'].dungeon={real:true,rank:{min:'F',max:'F'},levels:{}};
  const r=mode==='evidence'?applyWorld(s,c,{scene:'here',expected:{},deltas:[{seq:1,type:'area',place:'loc.forest',min_level:8,max_level:11,how:'seen',evidence:'invented quote'}]},{msg:101,prose:'Nothing about this forest.'}):area(s,mode==='range'?[7,99]:[8,11],mode==='rumor'?'rumor':'seen');
  assert.equal(r.state.places['loc.forest'].encounter_levels,undefined,mode);
 }
});
test('explicit individuals and harmless fauna keep their own levels (B1: no historical campaign variant)',()=>{
 const s=area(state()).state;assert.equal(beast(s,{level:1}).profile.level,1);
 assert.ok(beast(s,{id:'mon.pet',threat:false}).profile.level<=3);
 // B1 (.130): the area span is the current rule; a state without the old flag is no exception
 const old=clone(s);delete old.meta.f_progression;assert.deepEqual(beast(old,{id:'mon.old'}).profile.level,beast(clone(s),{id:'mon.old'}).profile.level);
});
test('population span appears on the actual board card, distinct from quest XP level',()=>{
 const s=state(),hall=Object.values(s.places).find(p=>p.tags?.includes('guild_hall'));s.scene.at=hall.id;
 const branch=hall.parent;s.guild.membership={rank:'Novice'};
 s.places['loc.forest'].population={species:'wolf',anchor:'wolf',levels:[4,7]};
 const q={id:'quest.example',kind:'guild_contract',title:'Forest wolves',status:'listed',rank:'Novice',level:4,payout_cp:50,qtype:'standard',task:'Kill four wolves.',hunt:{at:'loc.forest'},objectives:[{id:'o1',verb:'DEFEAT',what:'wolf',where:'Blackthorn Forest',qty:4}],source:{branch},history:[],proof:[]};
 s.quests[q.id]=q;s.guild.boards[boardKey(branch,'Novice')]={rank:'Novice',branch,day:today(s),listings:[q.id]};
 const out=resolveCommands(s,c,[{seq:1,type:'board.read',rank:'Novice',quote:'I read the board.'}],e=>applyEvent(s,e),{c:true});
 assert.match(JSON.stringify(out),/enemy levels 4.7/);assert.doesNotMatch(JSON.stringify(out),/recommended level 4/);
});
test('narrator and extractor receive the same inherited area span',()=>{
 const s=area(state()).state;s.places['loc.den']={id:'loc.den',name:'A hollow',kind:'site',parent:'loc.forest'};s.scene.at='loc.den';
 assert.match(buildContext(s,c,{input:'I look around.',outcome:{c:true,auth:{c:true,gos:[]}}}).text,/AREA.*8.11/);
 assert.match(extractorCatalog(s,c,{c:true}).text,/area levels.*8.11/);
});
const oldBoard=JSON.parse(fs.readFileSync(new URL('./fixtures/run13_boards.json',import.meta.url)));
function board(species,anchor){const s=clone(oldBoard.states[8]);s.guild.boards={};s.meta.f_progression=true;for(const p of Object.values(s.places))delete p.dungeon;
 const ranges=[[1,1],[4,7],[8,11],[12,14],[1,3]];
 const listings=ranges.map(([min,max],i)=>({title:`Hunt ${i}`,client:'herders',rank:'Novice',level:min,qtype:i?'standard':'minor',payout_cp:50,task:'Cull.',desired_end_state:'Targets killed.',proof:[],objectives:[{verb:'DEFEAT',what:i?species:'wolf',qty:i?4:1,unit:null,where:`Site ${i}`}],habitat:{species:i?species:'wolf',anchor:i?anchor:'wolf',min_level:min,max_level:max}}));
 return parseBoard(JSON.stringify({listings}),c,{branch:'loc.glassmere',rank:'Novice',day:1,have:[],missing:5,c:true,profile:'count_hunt_clear',progression:true},s);
}
for(const species of ['giant snapping turtle','giant snapping turtles'])test(`new ${species} board rejects aquatic consistently`,()=>{assert.ok(board(species,'aquatic').refused.some(x=>/anchor|body plan/i.test(x.why)));assert.equal(board(species,'armored_beast').listings?.length,5);});
test('classifying an existing area never changes its old individuals or local population',()=>{
 const s=state(),old=beast(s),fixed=clone(old.profile);s.places['loc.forest'].population={species:'rat',anchor:'rat',levels:[1,1]};
 const r=area(s);assert.deepEqual(r.state.entities[old.id].profile,fixed);assert.deepEqual(r.state.places['loc.forest'].population,s.places['loc.forest'].population);
 assert.ok(beast(r.state,{id:'mon.next'}).profile.level>=8);
 const rat=beast(r.state,{id:'mon.localrat',species:'rat',anchor:'rat'});assert.equal(rat.profile.level,1);assert.equal(rat.population_at,'loc.forest');
});
test('Dungeon slot levels take priority over an outside area and cannot be reclassified',()=>{
 const s=area(state()).state;s.places['loc.dungeon']={id:'loc.dungeon',name:'Warrens',kind:'site',parent:'loc.forest',dungeon:{real:true,rank:{min:'F',max:'F'},levels:{1:{min:'F',max:'F'}}}};
 const e=beast(s,{at:'loc.dungeon',species:'goblin',anchor:'goblin',level:2});assert.equal(e.profile.level,2);assert.equal(e.population_at,undefined);
 const r=area(s,[12,14],'guild','loc.dungeon');assert.equal(r.state.places['loc.dungeon'].encounter_levels,undefined);
});
test('remote areas use their own ancestry, not the player’s present territory',()=>{
 const s=area(state()).state;s.places['loc.remote']={id:'loc.remote',name:'Far fields',kind:'wilderness',parent:'realm.valedorn_crown',encounter_levels:[1,3]};
 assert.ok(beast(s,{at:'loc.remote'}).profile.level<=3);
});
test('an unreached area can be established by actual Guild knowledge, never by seen or another place’s quote',()=>{
 const s=state();s.scene.at='loc.alderwatch';
 const seen=area(s);assert.equal(seen.state.places['loc.forest'].encounter_levels,undefined);assert.equal(seen.state.scene.at,s.scene.at);
 const reported=area(s,[8,11],'guild');assert.deepEqual(reported.state.places['loc.forest'].encounter_levels,[8,11]);assert.equal(reported.state.scene.at,s.scene.at);
 s.places['loc.other']={id:'loc.other',name:'Other Woods',kind:'wilderness',parent:'realm.valedorn_crown'};
 assert.equal(area(s,[8,11],'guild','loc.other').state.places['loc.other'].encounter_levels,undefined);
});
test('area and population remain separate, both visible to narrator and player',async()=>{
 const s=area(state()).state;s.places['loc.forest'].population={species:'wolf',anchor:'wolf',levels:[4,7]};
 const text=buildContext(s,c,{input:'I look around.',outcome:{c:true,auth:{c:true,gos:[]}}}).text;
 assert.match(text,/AREA LEVELS.*8–11/);assert.match(text,/ESTABLISHED WORLD POPULATIONS/);assert.match(text,/individual levels 4-7/);
 const {worldPanel}=await import('../../src/display.js');assert.match(worldPanel(s,c,{state:s,events:[]}),/AREA LEVELS.*8–11/);
});
test('invalid persisted spans are detected; the extractor vocabulary always holds the area classification (B1)',()=>{
 const s=state();s.places['loc.forest'].encounter_levels=[99,1];assert.ok(validateState(s,c).some(x=>x.includes('area levels')));
 delete s.meta.f_progression;assert.ok(worldVocab(c.deltaVocab,s).deltas.some(d=>d.type==='area'));
});
test('accepted creature species and new board validation agree for singular/plural away from populations',()=>{
 for(const species of ['giant snapping turtle','giant snapping turtles']){
  const s=state(),r=applyWorld(s,c,{scene:'here',expected:{},deltas:[{seq:1,type:'creature.new',ref:'cre.turtle',species,anchor:'aquatic',desc:[],count:1,present:true,band:'MEDIUM',more:true}]},{msg:103,prose:'A giant snapping turtle rests by the water.'});
  const e=Object.values(r.state.entities).find(x=>x.kind==='creature');assert.equal(e.anchor,'armored_beast');
 }
});
