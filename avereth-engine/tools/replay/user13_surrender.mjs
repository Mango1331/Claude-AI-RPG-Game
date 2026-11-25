// Run against the unmodified User13 originals/chat.jsonl from main.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {engineAt} from './replay.mjs';
import {actionPrefix,availableActions,validateActionSelection} from '../../src/action_input.js';
import {characterCombatant} from '../../src/combat.js';
import {applyWorld} from '../../src/v4/world.js';
import {negotiationReaction} from '../../src/engine.js';
import {counterConsentError,reactionError,checkTerms,surrenderAssets} from '../../src/v4/surrender.js';

const {runtime,host,content}=await engineAt();
const original=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').slice(1).map(JSON.parse);
const start=()=>structuredClone(original.slice(0,19));
const state=chat=>{
    const fold=host.foldChat(chat);
    assert.deepEqual(fold.errors,[]);
    return fold.state;
};
const pc=chat=>state(chat).entities.pc.sheet;
const leader='npc.npctollcudgel', axe='npc.npctollaxe', knife='npc.npctollknife';
const evidence=['The cudgel man sets the terms.', 'The axeman nods his assent.', 'The knife wielder lets him pass.'];
const counter='Give us the three silver and your staff and you can go.';
const terms=[{object:'coin',qty:30,mode:'offer',quote:'the three silver'},{object:'worn.weapon',qty:1,mode:'offer',quote:'your staff'}];
const release={object:'coin',qty:30,mode:'drop',quote:'i throw the 3 silver out of my pouch towards them'};
const roles=[];
async function turn(chat,text,commands,selection=null,mode='hud_free'){
    const index=chat.length;
    const msg={is_user:true,mes:text,extra:{}};
    const plan={commands};
    if(selection){
        msg.extra.avereth_action_input={...original[17].extra.avereth_action_input,selection,text,mode,base_revision:actionPrefix(chat)};
        plan.hud_binding={id:selection.id,decision:'use',seqs:[1]};
    }
    chat.push(msg);
    return runtime.prepareGenerationAsync(chat,content,{llm:async({purpose,messages})=>{
        roles.push([purpose,messages.reduce((n,m)=>n+m.content.length,0)]);return JSON.stringify(plan);
    }});
}
function surrenderCmd(quote,items=[]){return {seq:1,type:'surrender',target:null,terms:items,quote};}
async function offer(chat=start(),mixed=true){
    const move={id:'ut13-retreat',kind:'move',dir:'away'};
    const cmd=surrenderCmd('i surrender',[release]);
    const result=await turn(chat,original[19].mes,mixed?[{seq:1,type:'move',dir:'away',target:null},{...cmd,seq:2}]:[cmd],mixed?move:null);
    assert.equal(state(chat).encounter?.negotiation?.stage,'offered',JSON.stringify({result:result.action,why:host.rec(chat.at(-1))?.action_error,plan:host.rec(chat.at(-1))?.plan?.error,intent:state(chat).last?.outcome?.note}));
    assert.equal(pc(chat).coin_cp,0);
    if(mixed)assert(state(chat).last.outcome.records.some(r=>r.kind==='move'));
    return chat;
}
async function reply(chat,prose,payload){
    const i=chat.length;
    chat.push({is_user:false,mes:prose,extra:{}});
    const got=runtime.processReplyAny(chat,i,content);
    assert.equal(got.extract,true);
    return runtime.runExtraction(chat,i,content,async({purpose,messages})=>{
        roles.push([purpose,messages.reduce((n,m)=>n+m.content.length,0)]);
        return JSON.stringify(payload);
    });
}
function response(chat,choice,members=[leader,axe,knife],items=[]){
    return {offer:state(chat).encounter.negotiation.id,choice,speaker:members[0],members:members.map(id=>({id,evidence:evidence[[leader,axe,knife].indexOf(id)]})),evidence:choice==='counter'?counter:choice==='accept'?'Agreed.':'No deal.',terms:items};
}
const prose=choice=>[...evidence,choice==='counter'?counter:choice==='accept'?'Agreed.':'No deal.'].join(' ');
async function answer(chat,accept=true){
    const text=accept?original[21].mes:'No deal.';
    return turn(chat,text,[{seq:1,type:'negotiation_answer',accept,quote:text}]);
}

const base=state(start());
assert(availableActions(base,content).actions.some(a=>a.kind==='surrender'));
const monsters=structuredClone(base);
for(const id of [leader,axe,knife])monsters.entities[id].kind='creature';
assert(!availableActions(monsters,content).actions.some(a=>a.kind==='surrender'));
assert(!validateActionSelection({kind:'surrender',id:'s',target:null,terms:[]},monsters,content).ok);
for(const choice of ['accept','refuse']){
    const chat=start();await turn(chat,'I surrender.',[surrenderCmd('I surrender')]);
    assert.equal(state(chat).encounter.negotiation.stage,'offered');
    assert((await reply(chat,prose(choice),response(chat,choice))).applied);
    if(choice==='accept'){
        assert.equal(state(chat).encounter,null);
        assert.equal(pc(chat).coin_cp,30);
        assert.equal(state(chat).last.outcome.ended.reason,'negotiated');
    }else assert(state(chat).last.outcome.records.some(r=>r.actor!=='pc'));
}
const merely=start(),offerText='I offer three silver for mercy.';
await turn(merely,offerText,[surrenderCmd(offerText,[{object:'coin',qty:30,mode:'offer',quote:'three silver'}])]);
assert.equal(state(merely).encounter.negotiation.stage,'offered');
assert.equal(pc(merely).coin_cp,30);
const chat=await offer();
const released=state(chat).encounter.negotiation.released[0];
assert.equal(state(chat).objects[released.pile].holder.loc,base.scene.at);
assert(checkTerms(base,content,[{...release,quote:'offer three silver'}],{text:offerText}));
assert(checkTerms(base,content,[{...release,qty:20}],{text:original[19].mes}));
const opened=JSON.parse(JSON.stringify(chat));
assert.deepEqual(state(opened),state(chat));
await runtime.prepareGenerationAsync(chat,content,{llm:()=>assert.fail('duplicate planner')});
assert.equal(pc(chat).coin_cp,0);
const invalid=response(chat,'accept');invalid.members[1].evidence=evidence[0];
assert(reactionError(state(chat),content,invalid,prose('accept')));
const bad=structuredClone(chat);
assert.equal((await reply(bad,'He studies the offer.',{choice:'unclear'})).applied,false);
assert.equal(state(bad).encounter.negotiation.stage,'offered');
assert.deepEqual(state(bad).encounter,state(chat).encounter);
await answer(bad,false);
assert(!state(bad).encounter?.negotiation);
const resp=response(chat,'counter',undefined,terms);
assert((await reply(chat,prose('counter'),resp)).applied);
assert.equal(state(chat).encounter.negotiation.stage,'counter');
const pending=structuredClone(chat);
await answer(chat);
assert.equal(state(chat).encounter,null);
assert(!pc(chat).equipment.weapon);
assert.equal(pc(chat).coin_cp,0);
assert.equal(state(chat).objects[released.pile].holder.entity,leader);
assert.deepEqual(surrenderAssets(state(chat),content).filter(a=>a.name.includes('Pouch')),surrenderAssets(base,content).filter(a=>a.name.includes('Pouch')));
const allEvents=chat.slice(19).flatMap(host.messageEvents);
assert.equal(allEvents.filter(e=>e.t==='coin.changed').length,1);
assert(!allEvents.some(e=>/loot|quest\.completed|dungeon\.cleared/.test(e.t)));
assert.deepEqual(state(JSON.parse(JSON.stringify(chat))),state(chat));
await answer(pending,false);
assert(!state(pending).encounter?.negotiation);
assert(pc(pending).equipment.weapon);
const partial=await offer();
assert((await reply(partial,prose('counter'),response(partial,'counter',[leader],terms))).applied);
await answer(partial);
assert(!state(partial).encounter?.negotiation);
assert(!pc(partial).equipment.weapon);
assert(state(partial).last.outcome.records.some(r=>[axe,knife].includes(r.actor)));
const survivor=await offer();
await reply(survivor,prose('counter'),response(survivor,'counter',[leader,knife],terms));
await answer(survivor);
const alive=state(survivor);
assert(alive.encounter);
assert(!alive.encounter.negotiation);
assert.equal(alive.encounter.combatants[axe].side,'hostile');
assert.equal(alive.encounter.combatants[knife].current.peace,true);
const unarmed=characterCombatant(alive,'pc',content,alive.encounter.combatants.pc.side);
assert.deepEqual(alive.encounter.combatants.pc.fixed,unarmed.fixed);
assert.notEqual(unarmed.fixed.matk,base.encounter.combatants.pc.fixed.matk);
const blocked=start();
await turn(blocked,'Instead I charge them.',[{seq:1,type:'move',dir:'closer',target:axe}],{id:'away',kind:'move',dir:'away'});
assert.deepEqual(state(blocked),base);
const roleplay=start();
await turn(roleplay,original[19].mes,[],{id:'away',kind:'move',dir:'away'},'hud_roleplay');
assert.equal(pc(roleplay).coin_cp,30);
assert(!state(roleplay).encounter?.negotiation);
assert(state(roleplay).last.outcome.records.some(r=>r.kind==='move'));
const sourcePouch={object:'item.small_pouch',qty:1,mode:'drop',quote:release.quote};
assert(checkTerms(base,content,[release,sourcePouch],{text:original[19].mes}));
assert(checkTerms(base,content,[],{text:original[19].mes}));
const bag=state(opened);
bag.encounter.negotiation.reply={terms:[...terms,{object:'item.small_pouch',qty:1,mode:'offer'}]};
assert(counterConsentError(bag,content,original[21].mes));
assert(!counterConsentError(bag,content,'I accept.'));
const actualDemand=structuredClone(opened);
const r=response(actualDemand,'counter',[leader],[{object:'item.small_pouch',qty:1,mode:'offer',quote:'The whole pouch'},{object:'worn.weapon',qty:1,mode:'offer',quote:'Staff too'}]);
r.evidence='Pouch. The whole pouch. Staff too';
r.members[0].evidence=r.evidence;
assert((await reply(actualDemand,original[20].mes,r)).applied);
await answer(actualDemand);
assert.equal(state(actualDemand).encounter.negotiation.stage,'counter');
assert(pc(actualDemand).equipment.weapon);
assert.equal(pc(actualDemand).inventory.small_pouch,1);
const omitted=start();
await turn(omitted,original[19].mes,[{seq:1,type:'move',dir:'away',target:null}],{id:'away',kind:'move',dir:'away'});
assert.deepEqual(state(omitted),base);
const diverted=structuredClone(opened);
await reply(diverted,prose('counter'),response(diverted,'counter',undefined,terms));
await turn(diverted,'I try offering them a new deal.',[surrenderCmd('offering them a new deal')]);
assert(!state(diverted).encounter?.negotiation);
assert(state(diverted).last.outcome.records.some(r=>r.actor!=='pc'));
const forced=structuredClone(opened);
const force=await turn(forced,'#equip item.small_pouch',[]);
assert.equal(force.action,'not_executed');
assert.deepEqual(state(forced),state(opened));
const smaller=structuredClone(opened);
const smallDemand='Give us two silver.';
const reduced=response(smaller,'counter',undefined,[{object:'coin',qty:20,mode:'offer',quote:'two silver'}]);
reduced.evidence=smallDemand;
await reply(smaller,prose('counter')+' '+smallDemand,reduced);
await turn(smaller,'I agree.',[{seq:1,type:'negotiation_answer',accept:true,quote:'I agree.'}]);
const left=state(smaller).objects[released.pile];
assert.equal(left.holder.loc,base.scene.at);
assert.equal(left.qty,10);
assert(Object.values(state(smaller).objects).some(o=>o.holder?.entity===leader && o.qty===20 && o.source?.surrender_cp));
const held=state(opened);
const illicit=applyWorld(held,content,{expected:{},deltas:[{type:'fact',s:axe,p:'armed',o:'longbow'}]},{msg:20,prose:'The axeman draws a longbow.'});
assert(illicit.events.some(e=>e.t==='delta.rejected' && e.d.rule==='engine_owned_fact'));
const earned=structuredClone(held);
earned.encounter.pending_xp=12;
const booked=negotiationReaction(earned,content,response(opened,'accept'));
assert.equal(booked.outcome.ended.xp_awarded,12);
assert.equal(booked.outcome.ended.defeated.length,0);
assert(!booked.events.some(e=>e.t==='loot.generated'));
assert(!booked.outcome.ended.pp?.some(p=>earned.encounter.pp.offense?.[p.skill]));
const old=structuredClone(chat), expected=state(old);
runtime.refreshRevisionDisplay(old);
const decision=old[20].mes;
old[20].mes='The cudgel man refuses.';
runtime.onEditedV4(old,20,content);
assert.equal(state(old).encounter.negotiation.stage,'offered');
assert.equal(pc(old).coin_cp,0);
assert(pc(old).equipment.weapon);
old[20].mes=decision;
runtime.onEditedV4(old,20,content);
assert.deepEqual(state(old),expected);
old[20].swipe_id=1;
old[20].mes='The road stays silent.';
old[20].extra={};
runtime.onSwipedV4(old,20);
assert.equal(state(old).encounter.negotiation.stage,'offered');
assert(pc(old).equipment.weapon);
old[20]=structuredClone(chat[20]);
runtime.onSwipedV4(old,20);
assert.deepEqual(state(old),expected);
const edited=structuredClone(opened);
edited[19].mes='I offer the silver.';
runtime.onEditedV4(edited,19,content);
assert(host.foldChat(edited).errors.length);
assert.equal(host.foldChat(edited).state.entities.pc.sheet.coin_cp,30);
console.log('User13 source, mercy, offer vs throw, counter, consent, partial settlement, pending recovery, refusal, replay and custody passed.');
