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
const originalBow=s.entities[who].sheet.equipment.weapon.object;
assert.equal(s.objects[originalBow].holder.entity,who);
assert.equal(s.objects[originalBow].profile.family,'bow');
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
const {partyView}=await import('../../src/party.js');
const {renderHud}=await import('../../src/hud.js');
assert.match(renderHud(s,content),/data-avereth-party/);
assert.match(partyView(s,content).join(' '),/Ossen.*Shortbow.*Arrow/i);
const wounded=structuredClone(s);
wounded.entities[who].sheet.hp-=20;
const rest=st=>playerTurnV4(st,content,'We rest for one hour.',{c:true,commands:[{seq:1,type:'activity',kind:'rest',minutes:60,quote:'We rest for one hour.'}]}).state;
assert(rest(wounded).entities[who].sheet.hp>wounded.entities[who].sheet.hp);
wounded.party.members[who].watch=true;
assert.equal(rest(wounded).entities[who].sheet.hp,wounded.entities[who].sheet.hp);
console.log('Local party HUD, personal recovery and watch passed.');

const {lootEvents}=await import('../../src/v4/loot.js');
const {bookSale}=await import('../../src/v4/trade.js');
const {gateCheck,occupancy}=await import('../../src/v4/living.js');
const {assertOwnership}=await import('../../src/v4/world.js');
assertOwnership(true);
const rawState=structuredClone(s);
const emit=e=>applyEvent(rawState,e);
const item='obj.party217_draught';
emit({t:'object.created',d:{object:{id:item,name:'Red Draught',kind:'item',holder:{entity:who},qty:1,
    profile:{kind:'restore',rank:'F',resource:'hp',amount:5}}}});
rawState.entities[who].sheet.hp-=6;
const personal=x(rawState,[{seq:1,type:'party',act:'use',who,object:item,quote:'I drink the Red Draught.'}],
    'Ossen says, "I drink the Red Draught."',101);
assert.equal(personal.state.entities[who].sheet.hp,rawState.entities[who].sheet.hp+5);
assert.equal(personal.state.objects[item].holder.consumed,who);
const armour='obj.party217_armour';
emit({t:'object.created',d:{object:{id:armour,name:'Iron Mail',kind:'item',holder:{entity:who},qty:1,
    profile:{kind:'gear',rank:'F',slot:'armor',def:4,mdef:2}}}});
const armed=x(rawState,[{seq:1,type:'party',act:'equip',who,object:armour,quote:'I wear the Iron Mail.'}],
    'Ossen says, "I wear the Iron Mail."',102);
assert.equal(armed.state.entities[who].sheet.equipment.armor.object,armour);
const given=x(armed.state,[{seq:1,type:'party',act:'give',who,object:'worn.armor',target:'pc',qty:1,quote:'I give you the Iron Mail.'}],
    'Ossen says, "I give you the Iron Mail."',103);
assert.equal(given.state.objects[armour].holder.entity,'pc');
assert(!given.state.entities[who].sheet.equipment.armor);
const refusedMail=x(armed.state,[{seq:1,type:'party',act:'give',who,object:'worn.armor',target:'pc',qty:1,quote:'I give you the Iron Mail.'}],
    'Garrick says, "I give you the Iron Mail."',103);
assert.equal(refusedMail.state.objects[armour].holder.entity,who);
// A template moves from bag to slot and onward once, just as it does for the PC.
const [template,gear]=[...content.items].find(([,item])=>item.slot==='armor' && (!item.rank || item.rank==='F'));
const templateState=structuredClone(s);
applyEvent(templateState,{t:'item.changed',d:{id:who,item:template,qty:1}});
const wear='I wear the '+gear.name+'.';
const equipped=x(templateState,[{seq:1,type:'party',act:'equip',who,object:'item.'+template,quote:wear}],
    'Ossen says, "'+wear+'"',104).state;
assert.equal(equipped.entities[who].sheet.equipment.armor,template);
assert.equal(equipped.entities[who].sheet.inventory[template] || 0,0);
const hand='I give you the '+gear.name+'.', beforeGear=equipped.entities.pc.sheet.inventory[template] || 0;
const handed=x(equipped,[{seq:1,type:'party',act:'give',who,object:'worn.armor',target:'pc',quote:hand}],
    'Ossen says, "'+hand+'"',105).state;
assert.equal(handed.entities.pc.sheet.inventory[template],beforeGear+1);
assert(!handed.entities[who].sheet.equipment.armor);
assert.equal(handed.entities[who].sheet.inventory[template] || 0,0);
const bow=s.objects[originalBow], giveBow='I give you the '+bow.name+'.';
const passedBow=x(s,[{seq:1,type:'party',act:'give',who,object:'worn.weapon',target:'pc',quote:giveBow}],
    'Ossen says, "'+giveBow+'"',106).state;
assert.equal(passedBow.objects[originalBow].holder.entity,'pc');
assert.equal(passedBow.objects[originalBow].profile.atk,bow.profile.atk);
assert(!passedBow.entities[who].sheet.equipment.weapon);
const three=setup(), third='npc.garrick', team=structuredClone(camp);
three.combatants[third]={...structuredClone(three.combatants[who]),id:third};
three.participation[third]={from:0};team.entities[third].sheet=structuredClone(team.entities[who].sheet);
three.pending_xp=180;
assert.deepEqual(endEncounterEvents(team,content,three).summary.xp_shares,{pc:60,[who]:60,[third]:60});

const stock=structuredClone(camp), enc=setup();
for (const id of foes) {stock.entities[id].status='dead';enc.combatants[id].current.defeated=true;enc.combatants[id].current.hp=0;}
const draw=lootEvents(stock,content,enc);const material=draw.events.find(e=>e.t==='object.created').d.object;
const agreement=stock.party.agreements[stock.party.members[who].agreement];
agreement.terms.loot={kind:'item',goods:material.name.toLowerCase()};
let loot=lootEvents(stock,content,enc);
assert(loot.events.some(e=>e.d.object?.name===material.name && e.d.object.holder.entity===who));
agreement.terms.loot.kind='proceeds';loot=lootEvents(stock,content,enc);
loot.events.forEach(e=>applyEvent(stock,e));
assert.equal(lootEvents(stock,content,enc).events.length,0);
const lot=Object.values(stock.objects).find(o=>o.source?.proceeds===agreement.id);
assert(lot);
stock.scene.present.push(third);
const account=stock.entities[who].sheet.coin_cp;
assert(bookSale(stock,e=>applyEvent(stock,e),{ref:lot.id,units:1,splitId:'obj.part',buyer:third,cp:12,what:lot.name}).ok);
assert.equal(stock.entities[who].sheet.coin_cp-account,6);
const fallen=structuredClone(camp),lost=setup();
fallen.entities[who].status='dead';lost.combatants[who].current.defeated=true;lost.combatants[who].current.hp=0;
assert(!lootEvents(fallen,content,lost).events.some(e=>e.d.id===who || e.d.object));
const root=camp.quests[quest].clear.dungeon,gate=structuredClone(camp);
gate.party.members[who].mode='wait';gate.party.members[who].at=camp.scene.at;
gate.scene.at=root;gate.scene.present=['pc'];const dungeon=gate.dungeons[root];dungeon.capacity=1;
assert.equal(occupancy(gate,dungeon).pc,1);
assert.match(gateCheck(gate,content,root,{group:1}).refuse,/full/);
console.log('Three-person pool, personal equipment and recovery, physical loot, sale and gate occupancy passed.');

// Ordinary skill areas and a physically established throwing cluster have separate target rules.
const area=setup(), areaState=structuredClone(camp);
for (const id of [who,...foes]) area.line.x[id]=0;
areaState.scene.positions.pc={band:'ENGAGED',cluster:'near'};
for(const id of [who,...foes]) areaState.scene.positions[id]={band:'ENGAGED',cluster:'near'};
area.agreements=[{pairs:[[foes[0],'pc']]}];
areaState.entities.pc.sheet.skills['mage.arcane_burst']={prof:1,pp:0};
area.combatants.pc.fixed.actions['mage.arcane_burst']=1;
const areaHit=attackAction({...ctx,enc:area,state:areaState},'pc',foes[1],'mage.arcane_burst');
assert(!areaHit.illegal,areaHit.illegal);
assert.deepEqual(areaHit.strikes.map(k=>k.target),[foes[1]]);
const {burstCaught}=await import('../../src/v4/scene_handles.js');
const knot={...areaState,encounter:area};
assert(burstCaught(knot,foes[0],who).includes('pc'));
assert(!burstCaught(knot,foes[0],who).includes(who));
area.line.x.pc=-1;
assert(!burstCaught(knot,foes[0],who).includes('pc'));
area.line.x.pc=0;delete areaState.scene.positions.pc.cluster;
assert(!burstCaught(knot,foes[0],who).includes('pc'));

// A group counteroffer involving another person's weapon requires that actual owner's pledge.
if (process.argv[3]) {
    const banditChat=fs.readFileSync(process.argv[3],'utf8').trim().split('\n').slice(1,20).map(JSON.parse);
    const group=host.foldChat(banditChat).state;
    group.entities[who]=structuredClone(s.entities[who]);group.party=structuredClone(s.party);
    for (const o of Object.values(s.objects).filter(o=>o.holder?.entity===who)) group.objects[o.id]=structuredClone(o);
    group.scene.present.push(who);group.scene.positions[who]={band:'SHORT'};
    const opponents=Object.values(group.encounter.combatants).filter(c=>c.side==='hostile');
    const speaker=opponents[0].id;
    const ge=initEncounter(group,content,Dice.from(group),{actor:'pc',target:speaker,engage:true},opponents.map(c=>({id:c.id,side:'hostile'})),'group-owner',{c:true});
    group.encounter=ge;
    ge.order=['pc',...ge.order.filter(id=>id!=='pc')];ge.current='pc';ge.turn_index=0;ge.round=1;ge.trigger_done=true;
    const offered=playerTurn(group,content,'We all surrender.',{c:true,intent:{kind:'surrender',group:true,terms:[]}}).state;
    const label=ge.combatants[speaker].label, weapon=s.objects[originalBow].name;
    const demand="Give us Ossen's "+weapon+'.', assent='Ossen accepts the offer.', gift='I give my '+weapon+'.';
    const prose=label+' says, "'+demand+'" '+assent+' Ossen says, "'+gift+'"';
    const reply={offer:offered.encounter.negotiation.id,choice:'counter',speaker,members:[{id:speaker,evidence:demand}],evidence:demand,terms:[],
        allies:[{id:who,evidence:assent,pledges:[{object:'worn.weapon',qty:1,quote:gift}]}]};
    const {reactionError}=await import('../../src/v4/surrender.js');
    const {negotiationReaction}=await import('../../src/engine.js');
    assert(reactionError(offered,content,{...reply,allies:[]},prose));
    assert.equal(reactionError(offered,content,reply,prose),null);
    const pending=negotiationReaction(offered,content,reply).state;
    assert.equal(pending.encounter.negotiation.reply.allies[0].pledges[0].instance,originalBow);
    assert.equal(pending.objects[originalBow].holder.entity,who);
    const stale=structuredClone(pending);
    stale.objects[originalBow].holder={entity:'pc'};
    const {allyReceiptEvents}=await import('../../src/v4/surrender.js');
    assert.throws(()=>allyReceiptEvents(stale,content,stale.encounter.negotiation.reply),/available/);
    const settled=playerTurn(pending,content,'I accept.',{c:true,intent:{kind:'negotiation_answer',accept:true}}).state;
    assert.equal(settled.objects[originalBow].holder.entity,speaker);
    assert(!settled.entities[who].sheet.equipment.weapon);
    const deal=settled.encounter.agreements.at(-1);
    assert(deal.pairs.some(pair=>pair.includes(who) && pair.includes(speaker)));
    assert.equal(deal.receipts.find(r=>r.owner===who).instance,originalBow);
    console.log('Group counteroffer, independent owner assent, exact bow handed over once and named peace pairs passed.');
}

const requestText='Ossen, protect me.';
const priority={seq:1,type:'party',act:'coordinate',who,priority:'protect',target:'pc'};
const requested=playerTurnV4(s,content,requestText,{c:true,commands:[{...priority,quote:requestText}]}).state;
assert.equal(requested.party.members[who].request.kind,'protect');
assert(!requested.party.members[who].priority);
const agrees='Yes, I will protect Alaric.';
const promised=x(requested,[{...priority,quote:agrees}],'Ossen says, "'+agrees+'"',100);
assert.equal(promised.state.party.members[who].priority?.target,'pc',JSON.stringify(promised.rejected));
assert.equal(promised.state.party.members[who].request,null);
const declined=x(requested,[{...priority,quote:'No.'}],'Ossen says, "No."',100).state;
assert.equal(declined.party.members[who].request,null);
assert(!declined.party.members[who].priority);
const delegated=structuredClone(s);
delegated.party.agreements[delegated.party.members[who].agreement].terms.tactics=true;
const permitted=playerTurnV4(delegated,content,requestText,{c:true,commands:[{...priority,quote:requestText}]}).state;
assert.equal(permitted.party.members[who].priority.target,'pc');
console.log('Tactical request, attributed acceptance or refusal and prior delegation passed.');
