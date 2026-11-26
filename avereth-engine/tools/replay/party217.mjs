import assert from 'node:assert/strict';
import fs from 'node:fs';
import {engineAt} from './replay.mjs';
import {applyWorld} from '../../src/v4/world.js';
import {playerTurnV4} from '../../src/v4/turn.js';
import {partyDecision,following} from '../../src/party.js';

const {host,content}=await engineAt();
const chat=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').slice(1).map(JSON.parse);
const fold=i=>host.foldChat(chat,i+1).state;
const who='npc.ossen', quest=Object.values(fold(14).quests).find(q=>q.status==='active').id;
const quote="two of us, half each, and I know where the stairs are.";
const proposal={type:'party',seq:1,act:'offer',who,quest,combat:true,share:'half',quote};
const x=(s,deltas,prose,msg)=>applyWorld(s,content,{scene:'here',expected:{},deltas},{prose,msg});
let s=fold(14);
assert(!s.party);
const offered=x(s,[proposal],chat[14].mes,14);
assert.equal(offered.rejected.length,0,JSON.stringify(offered.rejected));
const offer=Object.values(offered.state.party.agreements)[0];
assert.equal(offer.phase,'open');
assert(!s.party);
const accepted=playerTurnV4(offered.state,content,chat[15].mes,{c:true,msg:15,commands:[{seq:1,type:'party',act:'accept',who,agreement:offer.id,quote:'And Sure its always good to have someone to have ones back.'}]});
s=accepted.state;
assert.equal(following(s)[0].who,who);
assert(!s.entities[who].sheet);
const profile=x(s,[{type:'fact',seq:1,s:who,p:'occupation',o:'Scout — bows, traps, reading corridors'}],chat[16].mes,16);
s=profile.state;
assert.equal(s.entities[who].sheet.class,'rogue');
assert.equal(s.entities[who].sheet.equipment.weapon.family,'bow');
assert.equal(s.entities[who].sheet.inventory.standard_arrow,20);
assert(!following(fold(22)).length);
const refused=partyDecision(s,content,{...proposal,who:'npc.garrick'},chat[14].mes,'npc.garrick',()=>assert.fail('wrong speaker'));
assert(!refused.done);
const memberStep = (state, act, quote) => playerTurnV4(state,content,quote,{c:true,commands:[{seq:1,type:'party',act,who,quote}]}).state;
const waited = memberStep(s,'wait','Please wait here.');
assert.equal(following(waited).length,0);
const resumed = memberStep(waited,'follow','Come with me again.');
assert.equal(following(resumed).length,1);
assert.deepEqual(resumed.entities[who].sheet,s.entities[who].sheet);
assert.equal(memberStep(resumed,'leave','We part ways.').party.members[who].mode,'left');
console.log('User14 original decision, single scout profile and finite ammunition passed.');

const {playerTurn,materialise}=await import('../../src/engine.js');
const {attackAction,moveAction,initEncounter,runCombat}=await import('../../src/combat.js');
const {Dice}=await import('../../src/rng.js');
const {applyEvent}=await import('../../src/state.js');
const {validateActionSelection}=await import('../../src/action_input.js');
const {lineBand,projectedStep}=await import('../../src/party_line.js');
// Isolate the first archived combat setup. Only add the newly joined person and their established profile.
const camp=fold(22);
camp.party=structuredClone(s.party);
camp.entities[who].sheet=structuredClone(s.entities[who].sheet);
const foes=camp.scene.present.filter(id=>camp.entities[id].kind==='creature');
const chosen=validateActionSelection(chat[23].extra.avereth_action_input.selection,camp,content);
assert(chosen.ok,chosen.reason);
const first=playerTurn(camp,content,chat[23].mes,{c:true,msg:23,intent:chosen.mapped.intent});
assert(first.state.encounter?.line || first.outcome.ended,JSON.stringify(first.outcome));
const scoutRecord=first.outcome.records.find(r=>r.actor===who);
let battle=first.state;
for(let i=0;i<6 && battle.encounter;i++) {
    const next=playerTurn(battle,content,'I defend.',{c:true,intent:{kind:'sidestep'}});
    battle=next.state;
    if(next.outcome.records.some(r=>r.actor===who && r.strikes?.length)) break;
}
assert(battle.entities[who].sheet.inventory.standard_arrow < 20 || scoutRecord?.strikes?.length,'scout uses a real attack and arrow');
const dice=Dice.from(camp);
for(const id of foes) materialise(camp,content,dice,e=>applyEvent(camp,e),id);
const setup=()=>initEncounter(camp,content,Dice.from(camp),{actor:'pc',target:foes[0],engage:true},foes.map(id=>({id,side:'hostile'})),'probe',{c:true});
const trial=setup();
const ctx={enc:trial,content,state:camp,dice:Dice.from(camp),c:true};
trial.line.x[who]=2;
const strike=attackAction(ctx,foes[0],who,null);
assert.equal(strike.strikes[0].target,who);
const from=trial.line.x[foes[1]];
const move=moveAction(ctx,foes[1],'closer','pc');
assert(!move.illegal);
assert.equal(trial.line.x[foes[1]],from-1);
assert.equal(lineBand(trial.line,foes[0],who),'ENGAGED');
trial.line.x.pc=trial.line.lo;
assert(projectedStep(trial,'pc','away',foes[0]).illegal);
console.log('User14 original attack, independent ally, finite arrows and two actor-relative targets passed.');

const {terminal}=await import('../../src/combat.js');
const {canFight}=await import('../../src/party_line.js');
const retreat=setup();
retreat.round=1;retreat.order=['pc',who,...foes];retreat.current='pc';retreat.turn_index=0;
const withdrawal=runCombat({...ctx,enc:retreat},{kind:'flee',together:true});
assert(terminal(retreat));
assert(retreat.combatants.pc.current.escaped);
assert(retreat.combatants[who].current.escaped);
assert.equal(withdrawal.records.filter(r=>r.kind==='flee').length,2);
const split=setup();
split.round=1;split.order=['pc',who,...foes];split.current='pc';split.turn_index=0;
split.combatants[who].current.priority={kind:'independent'};
runCombat({...ctx,enc:split},{kind:'flee',together:true});
assert(split.combatants.pc.current.escaped && !split.combatants[who].current.escaped && terminal(split));
const partial=setup();
partial.agreements=[{pairs:foes.map(id=>[id,'pc'])}];
assert(!terminal(partial));
assert(!canFight(partial,'pc',foes[0]) && canFight(partial,who,foes[0]));
partial.agreements[0].pairs.push(...foes.map(id=>[id,who]));
assert(terminal(partial));
console.log('Group retreat, separation and bilateral peace passed.');

const {endEncounterEvents}=await import('../../src/combat.js');
const {completeContract}=await import('../../src/v4/guild.js');
const {recordWork,vestQuest,payClaim}=await import('../../src/party_rewards.js');
const {awardXp,splitPool}=await import('../../src/progression.js');
for (const [entry, dead, pcDead, expected] of [
    [{from:0},false,false,{pc:90,[who]:90}],
    [{from:0,to:0},false,false,{pc:180}],
    [{from:0,to:12},false,false,{pc:90,[who]:90}],
    [{from:180},false,false,{pc:180}],
    [{from:0},true,false,{pc:180}],
    [{from:0},false,true,{[who]:180}],
]) {
    const enc=setup();enc.pending_xp=180;enc.participation[who]=entry;
    enc.combatants[who].current.defeated=dead;enc.combatants.pc.current.defeated=pcDead;
    assert.deepEqual(endEncounterEvents(camp,content,enc).summary.xp_shares,expected);
}
assert.deepEqual(splitPool(181,['pc','first','last']),{pc:61,first:60,last:60});
const levels=awardXp(camp.entities[who].sheet,1500,content,'test',who);
assert.equal(levels.filter(e=>e.t==='level.up').length*5,levels.filter(e=>e.t==='stat.assigned').reduce((a,e)=>a+e.d.amount,0));
assert(levels.some(e=>e.t==='stat.assigned'));
for (const mode of ['present','absent','left-early','dead']) {
    const state=structuredClone(s), q=state.quests[quest], emit=e=>applyEvent(state,e);
    recordWork(state,emit,q,'original-slot',['pc',who]);
    if(mode==='left-early') state.party.members[who].mode='left';
    vestQuest(state,emit,q);
    if(mode==='absent') {state.scene.present=[];state.party.members[who].mode='left';}
    if(mode==='dead') state.entities[who].status='dead';
    // Isolate the real turn-in reducer at its existing authoritative clear gate.
    state.dungeons=structuredClone(camp.dungeons);
    state.dungeons[q.clear.dungeon].clears.push({floor:q.clear.floor,credit:'pc',turn:state.turn});
    const before=state.entities.pc.sheet.coin_cp;
    const events=[];
    const result=completeContract(state,content,q,e=>{events.push(e);emit(e);},{c:true});
    assert(result.ok,result.reason);
    assert.equal(state.entities.pc.sheet.coin_cp-before,mode==='present'?45:90);
    const claims=Object.values(state.party.claims);
    assert.equal(claims.length,mode==='left-early'?0:1);
    if(claims.length) assert.equal(claims[0].paid,mode==='present'?45:0);
    const xp=events.filter(e=>e.t==='xp.changed').map(e=>e.d.amount);
    assert.deepEqual(xp,mode==='dead'?[450]:[225,225]);
    if(mode==='absent'){
        state.scene.present.push(who);
        assert(payClaim(state,emit,claims[0],20));
        assert(payClaim(state,emit,state.party.claims[claims[0].id],25));
        assert(!payClaim(state,emit,state.party.claims[claims[0].id],1));
    }
    assert(!completeContract(state,content,q,emit,{c:true}).ok);
}
console.log('D10 encounter intervals, D11 work, money, absence, death and settled claims passed.');
