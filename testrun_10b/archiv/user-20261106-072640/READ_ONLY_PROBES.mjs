// Read-only original-fold and focused mechanical probes. No model calls or repository writes.
// Usage: node READ_ONLY_PROBES.mjs /absolute/path/to/product-checkout/avereth-engine
// Reference product: 2089dccdb7fd3dc08c72c5737c6b111fb6512f56 (.159).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual as eq} from 'node:util';
const here=path.dirname(fileURLToPath(import.meta.url));
if(!process.argv[2]) throw new Error('Pass the avereth-engine directory of the product checkout as the only argument.');
const product=path.resolve(process.argv[2]);
const mod=p=>import(pathToFileURL(path.join(product,'src',p)).href);
const {loadContentPack}=await mod('content.js');
const {foldChat,rec,messageEvents}=await mod('host.js');
const {playerTurnV4,replyTurnV4}=await mod('v4/turn.js');
const {defeatTally,contractReady,readyText,acceptContract}=await mod('v4/guild.js');
const {scaleCreature}=await mod('npcgen.js');
const {sealRefusal,clearDone,floorAt}=await mod('v4/living.js');
const {guildParticipationEvidence}=await mod('v4/narration_evidence.js');
const {validateState}=await mod('validate.js');
const {applyEvent,emptyState}=await mod('state.js');
const {combatChronicle}=await mod('v4/combat_truth.js');
const {deriveCharacter}=await mod('derived.js');
const content=await loadContentPack(async name=>JSON.parse(fs.readFileSync(path.join(product,'content',name),'utf8')));
const chat=gunzipSync(fs.readFileSync(path.join(here,'originals/chat.jsonl.gz'))).toString('utf8').trim().split('\n').map(JSON.parse).slice(1);
const exported=JSON.parse(gunzipSync(fs.readFileSync(path.join(here,'originals/events.json.gz'))));
const pre=i=>foldChat(chat,i).state;
const final=pre(chat.length), q=final.quests['quest.slay_the_marsh_titan_of_hollowmere'];
const results={hunt:{tally:defeatTally(final,content,q),ready:contractReady(final,content,q,{c:true}),text:readyText(final,content,q,{c:true}),slip:final.objects['obj.slip.slay_the_marsh_titan_of_hollowmere'].marks},search:{}};
const orig=rec(chat[91]).events.find(e=>e.t==='cmd.interpreted').d.commands[0];
for(const [label,c] of [['original',orig],['area_only',{...orig,what:'the pool and lair of the Titan',quote:'I investigate the pool and lair of the Titan'}],['corpse_only',{...orig,what:'the Titan corpse',quote:'I loot the Titan corpse'}]]){
 const o=playerTurnV4(pre(91),content,c.quote,{msg:91,commands:[c],c:true});results.search[label]={resolutions:o.outcome.resolutions,checks:o.events.filter(e=>e.t==='check.recorded').map(e=>e.d),time:o.events.filter(e=>e.t==='time.advanced').map(e=>e.d),validation:validateState(o.state,content)};
}
const down=Object.values(pre(39).places).find(p=>p.id.includes('sloping_worn_passage'));
results.floors={down,refusal_before:sealRefusal(pre(39),down.id),refusal_after:sealRefusal(pre(59),down.id),after_kill_clear:clearDone(pre(59),pre(59).quests['quest.clear_the_old_crown_catacombs_level_1']),visited_floors:[...new Set(chat.flatMap((m,i)=>i%2===0?[floorAt(pre(i+1),pre(i+1).scene.at)]:[]).filter(x=>x!==null))]};
const command={seq:1,type:'go',to:down.id,quote:'I take the sloping worn passage down'};
const movement=playerTurnV4(pre(39),content,command.quote,{msg:39,commands:[command],c:true});results.floors.control_go_before=movement.outcome;
const orig64=rec(chat[64]).extraction.raw;const clerk=final.entities['npc.npcguild_clerks'];const labels=[clerk.name,...clerk.descriptors,clerk.traits].filter(Boolean);
results.guild={labels,original_evidence:guildParticipationEvidence(chat[64].mes,labels,{payoutCp:90,content}),missing_fact:!final.knowledge['npc.npcguild_clerks']['f.pc.completed.quest.clear_the_old_crown_catacombs_level_1'],original_delta_order:orig64.deltas.map(d=>({seq:d.seq,type:d.type,who:d.who})),i72_entered:rec(chat[72]).events.filter(e=>e.t==='scene.entered').map(e=>e.d)};
// Controlled positive participant sentence uses same clerk, price, scene and raw report.
const prose=chat[64].mes+' The clerk counted ninety copper from the ledger payout onto the counter.';
const positive=replyTurnV4(pre(64),content,orig64,{msg:64,prose,ms:rec(chat[64]).extraction.ms,repaired:false});results.guild.explicit_subject_control={evidence:guildParticipationEvidence(prose,labels,{payoutCp:90,content}),knowledge_events:positive.events.filter(e=>e.t==='knowledge.gained').map(e=>e.d),validation:validateState(positive.state,content)};
results.body_plans=['armored_beast','skeleton','wolf','feline'].filter(k=>content.anchors.has(k)).map(id=>{const p=scaleCreature(content.anchors.get(id),12,null,content);return {id,level:p.level,hp:p.max_hp,atk:p.atk,def:p.def,mdef:p.mdef,init:p.init}});
const newClear=final.quests['quest.clear_old_crown_catacombs_level_1'];const ctrl=structuredClone(final);ctrl.scene.at='loc.alderwatch.guild_hall';ctrl.scene.present=['pc'];const ev=[];const accepted=acceptContract(ctrl,content,ctrl.quests[newClear.id],e=>{ev.push(e);applyEvent(ctrl,e)});
results.relisted_clear={q:newClear.id,original_status:newClear.status,cycle_start:final.dungeons['loc.old_crown_catacombs'].cycle_start,reset_min:final.dungeons['loc.old_crown_catacombs'].reset_min,now:final.clock.minute,ready_while_listed:contractReady(final,content,newClear,{c:true}),control_accept:accepted,ready_after_control_accept:contractReady(ctrl,content,ctrl.quests[newClear.id],{c:true}),note:'Read-only clone, no real acceptance or payout executed.'};

const norm=x=>JSON.parse(JSON.stringify(x));
const prefixes=chat.map((m,i)=>{const f=foldChat(chat,i+1);return {i,errors:f.errors,failures:f.failures,validation:validateState(f.state,content)};});
const flat=emptyState();exported.flatMap(g=>g.events).forEach(e=>applyEvent(flat,e));
results.fold={messages:chat.length,users:chat.filter(m=>m.is_user).length,turn:final.turn,event_groups:exported.length,events:exported.flatMap(g=>g.events).length,prefixes:prefixes.length,prefix_issues:prefixes.filter(p=>p.errors.length||p.failures.length||p.validation.length),export_mismatches:exported.filter(g=>!eq(g.events,rec(chat[g.i])?.events)).map(g=>g.i),flat_equals_host:eq(flat,final),json_reload_equals:eq(final,foldChat(norm(chat)).state)};
results.derived_end=deriveCharacter(final.entities.pc.sheet,content);
results.extractions=[];
for(let i=0;i<chat.length;i++){
 const r=rec(chat[i]);if(r?.extraction?.status!=='applied')continue;
 const state=pre(i),chronicle=state.encounter||state.last?.outcome?.kind==='combat'?combatChronicle(chat.slice(0,i),messageEvents):null;
 const out=replyTurnV4(state,content,r.extraction.raw,{msg:i,prose:chat[i].mes,ms:r.extraction.ms,repaired:r.extraction.repaired,chronicle});
 results.extractions.push({i,events_exact:eq(norm(out.events),r.events),state_exact:eq(norm(out.state),norm(pre(i+1))),validation:validateState(out.state,content)});
}
console.log(JSON.stringify(results,null,2));
if(results.fold.prefix_issues.length||results.fold.export_mismatches.length||!results.fold.flat_equals_host||!results.fold.json_reload_equals||results.extractions.some(r=>!r.events_exact||!r.state_exact||r.validation.length))process.exitCode=1;
