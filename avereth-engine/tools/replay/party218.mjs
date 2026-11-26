// User14 prefix; deliberately wrong P/X outputs exercise both runtime authority boundaries.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {engineAt} from './replay.mjs';
const {runtime,host,content}=await engineAt();
const original=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').slice(1).map(JSON.parse);
const prefix=original.slice(0,15), who='npc.ossen', quest='quest.clear_the_old_crown_catacombs_level_1';
const state=ch=>host.foldChat(ch).state;
async function player(ch,text,act) {
    ch.push({is_user:true,mes:text,extra:{}});
    await runtime.prepareGenerationAsync(ch,content,{llm:async()=>JSON.stringify({commands:act?[{seq:1,type:'party',who,...act}]:[]})});
}
async function reply(ch,text,deltas) {
    ch.push({is_user:false,mes:text,extra:{}});
    const i=ch.length-1;
    runtime.processReplyAny(ch,i,content);
    await runtime.runExtraction(ch,i,content,async()=>JSON.stringify({scene:'here',expected:{},deltas}));
}
const ask='Let us fight together, half each.';
const offer={seq:1,type:'party',who,act:'offer',quest,share:'half',combat:true,quote:ask};
await player(prefix,'Ossen, how would we work together?');
await reply(prefix,'Ossen says, "'+ask+'"',[offer]);
const id=Object.keys(state(prefix).party.agreements)[0];
const failed=[];
function check(label,condition) { console.log(condition?'PASS':'FAIL',label); if(!condition) failed.push(label); }
for (const [message,quote,accept] of [
    ['Sure, half each.','Sure',true],['Sure, but only 30 copper for you.','Sure',false],
    ['Sure, 30 copper for you.','Sure',false],["Sure, I don't agree to half.",'Sure',false],
    ['Sure?','Sure',false],['Garrick, sure.','sure',false],['Sure, if I get your bow.','Sure',false],
]) {
    const ch=structuredClone(prefix);
    await player(ch,message,{act:'accept',agreement:id,quote});
    check('R1 '+message,Boolean(state(ch).party.members[who])===accept);
}
const refusal=structuredClone(prefix);
await player(refusal,'No deal.',{act:'decline',agreement:id,quote:'No deal.'});
check('R1 definite refusal',state(refusal).party.agreements[id].phase==='declined');
const revised=structuredClone(prefix);
await player(revised,'Can we consider different terms?');
const revisedText='Let us fight together for thirty copper.';
await reply(revised,'Ossen says, "'+revisedText+'"',[{...offer,share:undefined,amount:30,money:'thirty copper',quote:revisedText}]);
check('R1 new proposal supersedes earlier proposal',state(revised).party.agreements[id].phase==='superseded');
await player(revised,'Yes, I accept.',{act:'accept',agreement:id,quote:'Yes, I accept.'});
check('R1 stale planner ID',!state(revised).party.members[who]);
const joined=structuredClone(prefix);
await player(joined,'Yes, I accept.',{act:'accept',agreement:id,quote:'Yes, I accept.'});
await reply(joined,original[16].mes,[{type:'fact',seq:1,s:who,p:'occupation',o:'Scout — bows and traps'}]);
const bow=state(joined).entities[who].sheet.equipment.weapon.object;
const name=state(joined).objects[bow].name;
for (const [speech,paid] of [
    ['I will give you the '+name+' tomorrow.',false],
    ['If we both come back, I give you the '+name+'.',false],
    ['Garrick, I give you the '+name+'.',false],
    ['I give you the '+name+'.',true],
]) {
    const ch=structuredClone(joined);
    await player(ch,'What about your bow?');
    await reply(ch,'Ossen says, "'+speech+'"',[{seq:1,type:'party',who,act:'give',target:'pc',object:'worn.weapon',quote:speech}]);
    check('R3 '+speech,state(ch).objects[bow].holder.entity===(paid?'pc':who));
}
for (const [prose,quote,paid] of [
    ['Ossen hands Alaric the '+name+'.','Ossen hands Alaric the '+name,true],
    ['Ossen tells Garrick, "I give you the '+name+'."','I give you the '+name,false],
    ['Ossen says, "I give Garrick the '+name+' because you asked."','I give Garrick the '+name,false],
]) {
    const ch=structuredClone(joined);
    await player(ch,'What happens to the bow?');
    await reply(ch,prose,[{type:'party',seq:1,who,act:'give',target:'pc',object:'worn.weapon',quote}]);
    check('R3 recipient '+prose,state(ch).objects[bow].holder.entity===(paid?'pc':who));
}
const priority={act:'coordinate',priority:'protect',target:'pc'};
for(const text of [original[17].mes,'Keep the skeletons off me.']) {
    const ch=structuredClone(joined);
    await player(ch,text,{...priority,quote:text});
    check('R5 request '+text,state(ch).party.members[who].request?.kind==='protect');
    const quote='I will keep the skeletons off you.';
    await reply(ch,'Ossen says, "'+quote+'"',[{type:'party',seq:1,who,...priority,quote}]);
    check('R5 answer '+text,state(ch).party.members[who].priority?.target==='pc');
}
// Reuse actual membership events on the original pre-combat prefix, as in the isolated host run.
const fight=structuredClone(original.slice(0,23));
const membership=joined.flatMap(m=>m.extra?.avereth?.events || []).filter(e=>e.t.startsWith('party.') ||
    e.d.id===who && ['entity.sheet_set','item.equipped'].includes(e.t) || e.d.object?.source?.how==='equipped' && e.d.object.holder.entity===who);
fight.at(-1).extra.avereth.events.push(...membership,{t:'scene.position',d:{id:who,band:'ENGAGED',cover:'none'}});
async function combatTurn(ch,text,commands) {
    ch.push({is_user:true,mes:text,extra:{}});
    await runtime.prepareGenerationAsync(ch,content,{llm:async()=>JSON.stringify({commands})});
}
const opening='I use Basic Attack on Risen Bones A.';
await combatTurn(fight,opening,[{seq:1,type:'use_skill',skill:'mage.basic_attack',target:'mon.old_crown_catacombs_c1_l1_e1_1',quote:opening}]);
await reply(fight,'Ossen draws his bow.',[]);
assert(state(fight).encounter?.line);
const combined=structuredClone(fight);
await combatTurn(combined,'I sidestep. Ossen, protect me.',[{type:'sidestep',seq:1,quote:'I sidestep.'},
    {type:'party',seq:2,who,...priority,quote:'Ossen, protect me.'}]);
const combatState=state(combined);
check('R5 simultaneous PC action',combatState.last_outcome?.records?.some(r=>r.actor==='pc' && r.kind==='sidestep') ||
    combined.at(-1).extra.avereth.events.some(e=>e.d.outcome?.records?.some(r=>r.actor==='pc' && r.kind==='sidestep')));
check('R5 simultaneous pending request',combatState.party.members[who].request?.target==='pc');
const pledged='I will protect you.';
await reply(combined,'Ossen says, "'+pledged+'"',[{type:'party',seq:1,who,...priority,quote:pledged}]);
check('R5 accepted in combat',state(combined).party.members[who].priority?.target==='pc');
assert.deepEqual(failed,[]);
