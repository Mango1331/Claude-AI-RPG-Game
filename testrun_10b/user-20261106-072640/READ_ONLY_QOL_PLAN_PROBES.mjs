// Planning only: no model calls, repository writes or content migration.
// Reference product: 2089dccdb7fd3dc08c72c5737c6b111fb6512f56 (.159).
// node READ_ONLY_QOL_PLAN_PROBES.mjs /path/to/avereth-engine /path/to/user-20261106-072640
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual as eq} from 'node:util';
import assert from 'node:assert/strict';
const [engine, run] = process.argv.slice(2);
if (!engine || !run) throw Error('Pass avereth-engine and User04 directories');
const mod = name => import(pathToFileURL(path.resolve(engine, 'src', name)));
const {loadContentPack, startClasses, starterPool} = await mod('content.js');
const {startCampaign, playerTurn} = await mod('engine.js');
const {selectClass, selectSkills} = await mod('creation.js');
const {deriveCharacter, rawPower} = await mod('derived.js');
const {applyEvent, emptyState} = await mod('state.js');
const {foldChat, rec, turnBlock} = await mod('host.js');
const {boardView} = await mod('hud.js');
const {sealRefusal, floorAt} = await mod('v4/living.js');
const {validateState} = await mod('validate.js');
const {ENGINE_VERSION} = await mod('util.js');
assert.equal(ENGINE_VERSION,'4.3.0-c.6.6.159','Run this archived planning probe against the reference product checkout');
const content = await loadContentPack(async name => JSON.parse(fs.readFileSync(path.join(engine,'content',name),'utf8')));
assert.ok(content.rules.stats.every(k=>content.start.pc.stats[k]===7));
const five = {...content, start: {...content.start, pc: {...content.start.pc, stats:Object.fromEntries(content.rules.stats.map(k=>[k,5]))}}};
const chat = gunzipSync(fs.readFileSync(path.join(run,'originals/chat.jsonl.gz'))).toString('utf8').trim().split('\n').map(JSON.parse).slice(1);
const result = {scope:'Read-only planning; fixed actions, no model calls', starters:[], fight:[], old_event_fold_equal:null};
for (const pack of [content,five]) for (const cls of startClasses(pack,2)) {
  const s=emptyState(); startCampaign(pack,{seed:123,runtime:'v4',planner:true}).forEach(e=>applyEvent(s,e));
  const before=deriveCharacter(s.entities.pc.sheet,pack);
  selectClass(s,pack,cls.id).events.forEach(e=>applyEvent(s,e));
  const pool=starterPool(pack,cls.id,s);
  selectSkills(s,pack,pool.slice(0,2)).events.forEach(e=>applyEvent(s,e));
  const sh=s.entities.pc.sheet,d=deriveCharacter(sh,pack);
  result.starters.push({base:pack.start.pc.stats.STR,class:cls.id,stats:sh.stats,before_class:{hp:before.maxHp,mp:before.maxMp,init:before.init},hp:sh.hp,mp:sh.mp,init:d.init,def:d.def,mdef:d.mdef,atk:d.atk,matk:d.matk,offensive_raw:[cls.basic_attack,...pool].filter(id=>pack.skills.get(id)?.attack).map(id=>({id,raw:rawPower(pack.skills.get(id),sh.stats,d)})),validation:validateState(s,pack)});
}
for (const base of [7,5]) {
  let s=structuredClone(foldChat(chat,19).state);
  if(base===5) {for(const k of content.rules.stats)s.entities.pc.sheet.stats[k]-=2; const d=deriveCharacter(s.entities.pc.sheet,content); Object.assign(s.entities.pc.sheet,{hp:d.maxHp,mp:d.maxMp,sta:d.maxSta});}
  const row={base,initial: {stats:s.entities.pc.sheet.stats,hp:s.entities.pc.sheet.hp,mp:s.entities.pc.sheet.mp,rng:s.rng},steps:[]};
  for(const i of [19,21,23]) {
    if(s.entities.pc.status==='dead')break;
    const r=playerTurn(s,content,chat[i].mes,{msg:i,intent:rec(chat[i]).plan.mapped,c:true}); s=r.state;
    const originalOutcome=rec(chat[i]).events.find(e=>e.t==='outcome.recorded')?.d.outcome;
    row.steps.push({i,hp:s.entities.pc.sheet.hp,mp:s.entities.pc.sheet.mp,status:s.entities.pc.status,round:s.encounter?.round,order:s.encounter?.order,records:r.outcome?.records,ended:r.outcome?.ended,control_records_exact:base===7?eq(r.outcome?.records,originalOutcome?.records):undefined,validation:validateState(s,content)});
  }
  result.fight.push(row);
}
const old=foldChat(chat,5).state;
// applyEvent is content-independent; folding the recorded events cannot consult five.start.
const ref=emptyState();for(const m of chat.slice(0,5))for(const e of rec(m)?.events||[])applyEvent(ref,e);
result.old_event_fold_equal=eq(old,ref);
const inProgress=foldChat(chat,1).state;
selectClass(inProgress,five,'mage').events.forEach(e=>applyEvent(inProgress,e));
selectSkills(inProgress,five,['mage.flame_lance','mage.arcane_wave']).events.forEach(e=>applyEvent(inProgress,e));
result.old_in_progress_creation={stats:inProgress.entities.pc.sheet.stats,hp:inProgress.entities.pc.sheet.hp,mp:inProgress.entities.pc.sheet.mp};
result.original_turns=[];
for(const i of [52,60,66,72,82]) {
  const pre=foldChat(chat,i).state,post=foldChat(chat,i+1).state;
  const ctx=turnBlock(chat,i-1,content,{budget:1400,rulesBudget:800,recentTurns:4,engineLore:false}).context;
  const root=Object.keys(pre.dungeons||{})[0];
  const next=Object.values(pre.places).filter(p=>p.level===2&&p.id.includes('old_crown'));
  const x=pre.dungeons[root];
  const o=pre.last.outcome;
  const card=o.board?.listings?boardView(post,content,o.board):'';
  const relevant=ctx.text.split('\n').filter(l=>/awareness of Alaric|UNSEEN|ARRIVAL STEALTH|STATE NOW|READS the Novice|CLEARED NOW|^LEVEL|seal|Warden guards/i.test(l));
  result.original_turns.push({i,context_dropped:ctx.dropped,context_lines:relevant,scene:pre.scene.at,awareness:pre.scene.awareness,concealed:pre.scene.concealed,corrections:pre.last.corrections,clear:x?.run.floors[1]?.cleared,sealed_spec:x?.floors[1]?.sealed,lower_places:next.map(p=>({id:p.id,known:p.known,visited:p.visited,refusal:sealRefusal(pre,p.id),level:floorAt(pre,p.id)})),seal_features:Object.values(pre.features||{}).filter(f=>/seal|slab|archway/i.test(f.name||'')).map(f=>({id:f.id,name:f.name,status:f.status})),board:o.kind==='v4'&&o.board?{listing_count:o.board.listings.length,conditional:o.conditionals,engine_lines:o.engine_lines||[],post_shown_events:rec(chat[i]).events.filter(e=>e.t==='board.shown'),cards:(card.match(/class="avereth-board-card"/g)||[]).length,html_chars:card.length,action_chars:o.actions.find(l=>l.includes('READS the'))?.length}:null});
}
const prose=chat[72].mes, titles=foldChat(chat,72).state.last.outcome.board.listings.map(id=>foldChat(chat,73).state.quests[id].title);
const first=prose.indexOf(`**${titles[0]}**`),last=prose.indexOf(`**${titles.at(-1)}**`),end=prose.indexOf('\n\n',last);
assert.ok(first>=0&&last>=first&&end>last);
result.board_output={catalogue_chars:prose.slice(first,end).length,catalogue_words:prose.slice(first,end).trim().split(/\s+/).length,prose_chars:prose.length,archived_display_cards:(chat[72].extra.display_text.match(/class="avereth-board-card"/g)||[]).length,archived_hud_cards:(rec(chat[72]).hud.match(/class="avereth-board-card"/g)||[]).length};
assert.equal(result.starters.length,6);
assert.ok(result.starters.every(x=>x.validation.length===0));
assert.deepEqual(result.fight[0].steps.map(x=>x.hp),[34,17,17]);
assert.ok(result.fight[0].steps.every(x=>x.control_records_exact));
assert.deepEqual(result.fight[1].steps.map(x=>x.hp),[1,0]);
assert.equal(result.fight[1].steps.at(-1).status,'dead');
assert.ok(result.fight.every(x=>x.steps.every(y=>y.validation.length===0)));
assert.equal(result.old_event_fold_equal,true);
assert.deepEqual([result.old_in_progress_creation.hp,result.old_in_progress_creation.mp],[90,96]);
assert.equal(result.original_turns.find(x=>x.i===72).board.cards,5);
assert.deepEqual([result.board_output.archived_display_cards,result.board_output.archived_hud_cards],[5,5]);
assert.equal(result.original_turns.find(x=>x.i===82).concealed.includes('pc'),true);
assert.ok([52,60,66].every(i=>result.original_turns.find(x=>x.i===i).lower_places.every(p=>p.refusal===null)));
result.assertions='passed';
console.log(JSON.stringify(result,null,2));
