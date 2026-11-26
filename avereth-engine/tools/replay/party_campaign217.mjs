// Original User14 inputs to the first bones. Subsequent N/X and planner choices are offline fixtures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {engineAt} from './replay.mjs';
import {playerTurnV4,replyTurnV4} from '../../src/v4/turn.js';
import {playerTurn} from '../../src/engine.js';
import {validateActionSelection,availableActions} from '../../src/action_input.js';
const {host,content}=await engineAt();
const chat=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').slice(1).map(JSON.parse);
let state=host.foldChat(chat,13).state;
const who='npc.ossen', quest=Object.values(state.quests).find(q=>q.title.includes('Old Crown') && q.clear)?.id;
const baseAt=state.scene.at, root='loc.old_crown_catacombs';
const turn=(text,commands,i)=> {
    const r=playerTurnV4(state,content,text,{commands,c:true,msg:i});state=r.state;
    assert(r.outcome,JSON.stringify(r.command));return r;
};
const reply=(prose,raw,i)=>{const r=replyTurnV4(state,content,raw,{msg:i,prose});state=r.state;return r;};
for(let i=13;i<=21;i+=2) {
    const a=chat[i].extra.avereth;
    const commands=structuredClone(a.events.find(e=>e.t==='cmd.interpreted').d.commands);
    if(i===15) commands.push({type:'party',seq:1,act:'accept',who,agreement:Object.keys(state.party.agreements)[0],quote:'And Sure its always good to have someone to have ones back.'});
    turn(chat[i].mes,commands,i);
    const next=chat[i+1], raw=structuredClone(next.extra.avereth.extraction.raw);
    if(i===13) raw.deltas.push({seq:8,type:'party',act:'offer',who,quest,combat:true,share:'half',quote:'two of us, half each, and I know where the stairs are.'});
    const x=reply(next.mes,raw,i+1);
    if(i===13) assert(state.party,JSON.stringify(x.rejected));
}
assert.equal(state.entities[who].sheet.class,'rogue');
assert(state.scene.present.includes(who));
const act=(intent,text)=>{const r=playerTurn(state,content,text,{c:true,intent});state=r.state;return r;};
const first=validateActionSelection(chat[23].extra.avereth_action_input.selection,state,content);
assert(first.ok,first.reason);
let battle=act(first.mapped.intent,chat[23].mes);
const promptCount={combat:0};
function resolveReply(r) {
    const line=(r.outcome.records || []).map(x=>(state.entities[x.actor]?.name || x.actor)+' '+x.kind).join('. ') || 'They look around.';
    reply(line,{scene:'here',expected:{},deltas:[]});
}
resolveReply(battle);
const fight=()=>{
    for(let n=0;state.encounter && n<70;n++){
        const enc=state.encounter,foe=enc.order.find(id=>enc.combatants[id].side==='hostile' && !enc.combatants[id].current.defeated && !enc.combatants[id].current.escaped && !enc.combatants[id].current.surrendered);
        const menu=availableActions(state,content);
        const pick=menu.actions.filter(a=>a.kind==='attack' || a.kind==='use' && a.needsTarget).map(a=>({a,v:validateActionSelection({id:'campaign',kind:a.kind,skill:a.skill,target:foe},state,content)})).filter(x=>x.v.ok).sort((u,v)=>Number(v.a.skill===first.mapped.intent.skill)-Number(u.a.skill===first.mapped.intent.skill))[0];
        const r=pick?act(pick.v.mapped.intent,'I attack.'):act({kind:'move',dir:'closer',target:foe},'I close on the enemy.');
        assert(r.events.length && !r.outcome.illegal,JSON.stringify([r.outcome,menu.actions]).slice(0,2200));resolveReply(r);promptCount.combat++;
    }
    assert(!state.encounter,'Combat failed to terminate.');assert(state.entities.pc.sheet.hp>0,'PC died.');
};
fight();
console.log('First slot',state.scene.at,state.quests[quest].party_work);
const recover=()=> {
    const text='We rest here together for one hour.';
    const r=turn(text,[{seq:1,type:'activity',kind:'rest',minutes:60,what:'one hour',quote:text}]);
    reply('They rest in the cleared room.',{scene:'here',expected:{},deltas:[]});
    return r;
};
const travel=(to,place,title,slot=null)=>{
    const text='We go '+(typeof to==='string'?state.places[to].name:to.new)+'.';
    const r=turn(text,[{seq:1,type:'go',to,quote:text}]);
    const dest=place || to;
    const prose='Alaric and Ossen arrive at '+title+'.'+(slot?' Ahead they see '+slot.count+' '+slot.species+'.':'');
    const deltas=[{type:'arrive',seq:1,at:dest,with:[who]}];
    if (slot) deltas.push({type:'creature.new',seq:2,ref:slot.ref,species:slot.species,anchor:slot.anchor,
        desc:[slot.name || slot.species],count:slot.count,present:true,band:'MEDIUM',population:'independent',life_stage:'adult'});
    const x=reply(prose,{scene:dest,expected:{1:{arrived:true,at:dest,with:[who]}},deltas});
    assert(state.scene.present.includes(who),JSON.stringify([r.outcome.actions,x.rejected]));
    return x;
};
for(let section=2;section<=4;section++){
    if(state.entities.pc.sheet.mp<28) recover();
    const floor=state.dungeons[root].run.floors[1];
    const slot=section===2?floor.slots[1]:section===4?floor.slots[2]:null;
    const title=['','','Rib Vault','Candle Niche','Warden Chamber'][section];
    const moved=travel({new:'on'},{new:{name:title,kind:'interior',parent:root}},title,slot);
    assert.equal(state.places[state.scene.at].section,section,JSON.stringify(moved.rejected));
    if(!slot) continue;
    const foe=state.scene.present.find(id=>state.entities[id].kind==='creature' && state.entities[id].status!=='dead');
    assert(foe,JSON.stringify([slot,moved.rejected]));
    const opened=act({kind:'attack',target:foe,skill:first.mapped.intent.skill},'I cast Flame Lance.');
    assert(opened.outcome.kind==='combat',JSON.stringify(opened.outcome));resolveReply(opened);fight();
}
assert(state.dungeons[root].run.floors[1].cleared?.credit==='pc');
assert(Object.keys(state.quests[quest].party_work).length===3);
console.log('Cleared by party',state.entities.pc.sheet.hp,state.entities[who].sheet.hp,promptCount);
for(const dest of [root,baseAt]) travel(dest,dest,state.places[dest].name);
assert.equal(state.scene.at,baseAt);
const q=state.quests[quest], cash=state.entities.pc.sheet.coin_cp, before=state.entities[who].sheet.coin_cp;
const done=turn('We turn in the completed contract.',[{seq:1,type:'quest.turn_in',quest,quote:'We turn in the completed contract.'}]);
assert.equal(state.quests[quest].status,'completed',JSON.stringify(done.outcome));
assert.equal(state.entities.pc.sheet.coin_cp-cash,45);
assert.equal(state.entities[who].sheet.coin_cp-before,45);
assert.deepEqual(done.events.filter(e=>e.t==='xp.changed').map(e=>e.d.amount),[225,225]);
reply('The clerk closes the contract.',{scene:'here',expected:{},deltas:[]});
turn('We part ways.',[{seq:1,type:'party',who,act:'leave',quote:'We part ways.'}]);
assert.equal(state.party.members[who].mode,'left');
console.log('Original seed',state.rng.seed,'turn',state.turn,'45/45 cp, 225/225 XP; registered contract closed, Ossen parted.');
