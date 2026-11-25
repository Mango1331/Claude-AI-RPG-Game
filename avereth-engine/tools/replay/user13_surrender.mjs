// Run against the unmodified User13 originals/chat.jsonl from main.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {engineAt} from './replay.mjs';
import {actionPrefix,availableActions,validateActionSelection} from '../../src/action_input.js';
import {reactionError,checkTerms,surrenderAssets} from '../../src/v4/surrender.js';

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
console.log('User13 source, mercy, offer vs throw, counter, consent, partial settlement, pending recovery, refusal, replay and custody passed.');
