import { materialise } from '../engine.js';
import { applyEvent } from '../state.js';
import { truth } from '../knowledge.js';
import { Dice } from '../rng.js';
import { agreementsOf, membersOf, partyDecision, bindPartyEquipment } from '../party.js';
import { vestQuest } from '../party_rewards.js';
import { contractReady } from './guild.js';
import { trueDungeonOf } from './dungeon.js';
import { hash32, normText } from '../util.js';

const standard = 'Travel and fight together; equal shares of shared quest work. Personal gear stays personal.';
const available = (s,id) => s.scene.present.includes(id) && s.entities[id]?.kind==='npc' && s.entities[id].status!=='dead';

export function partyControls(s) {
    const actions=[];
    for (const id of s.scene.present.filter(id=>available(s,id))) {
        const m=s.party?.members[id];
        const name=s.entities[id].name;
        const offers=agreementsOf(s).filter(a=>a.who===id && a.phase==='open' && a.proposer===id);
        for(const a of offers) actions.push({act:'accept',ref:a.id,label:'Annehmen · '+name+' · '+a.terms.text});
        if (!m || m.mode==='left') {
            if (!offers.length) actions.push({act:'invite',ref:id,label:'Einladen · '+name});
        } else actions.push(m.mode==='wait' ? {act:'follow',ref:id,label:'Mitkommen · '+name}
            : {act:'wait',ref:id,label:'Hier warten · '+name});
    }
    const members=membersOf(s).filter(m=>m.mode!=='left');
    for(const m of members) actions.push({act:'remove',ref:m.who,label:'Entfernen · '+s.entities[m.who].name});
    if(members.length) actions.push({act:'disband',ref:'',label:'Party auflösen'});
    return actions;
}

export async function partyControl(before,content,{act,ref='',source,revision,proposal},ask) {
    const s=structuredClone(before),events=[],dice=Dice.from(s);
    const emit=e=>{applyEvent(s,e);events.push(e);};
    let call;
    const result=text=>({events,command:{panels:['[SYSTEM // PARTY]\n'+text],llm:null},...(call?{party_call:call}:{})});
    if(s.encounter || s.pending_combat?.length) return result('Finish the encounter first.');
    const active=membersOf(s).filter(m=>m.mode!=='left');
    const memberEvent=(who,mode,extra={})=>{
        const m=s.party?.members[who];
        if(mode==='left' && m) {
            const quests=Object.values(s.quests).filter(q=>q.status==='active' && q.party_work);
            for(const q of quests) if(contractReady(s,content,q,{c:true}).ok) vestQuest(s,emit,q);
        }
        emit({t:'party.member',d:{...m,who,mode,at:available(s,who)?s.scene.at:m?.at,request:null,
            previous:m?.revision || 0,source:{actor:'pc',quote:source,turn:s.turn,at:s.scene.at},...extra}});
    };
    if(act==='disband' && !ref){
        for(const m of active) memberEvent(m.who,'left');
        return result(active.length?'The party has disbanded.':'No active companions.');
    }
    const a=s.party?.agreements[ref];
    const ids=act==='accept' && a ? [a.who] : Object.keys(s.entities).filter(id=>
        (available(s,id) || active.some(m=>m.who===id)) && (id===ref || normText(s.entities[id].name)===normText(ref)));
    if(ids.length!==1) return result('Select one identified companion or current offer.');
    const [who]=ids, person=s.entities[who], member=active.find(m=>m.who===who);
    const open=agreementsOf(s).filter(a=>a.who===who && a.phase==='open');
    if(act==='remove' && member){memberEvent(who,'left');return result(person.name+' left the party.');}
    if(!available(s,who)) return result('The companion is not present.');
    if(act==='wait' || act==='follow'){
        if(!member) return result('This person is not in the party.');
        if(act==='wait' && (trueDungeonOf(s,s.scene.at) || s.scene.threats?.length))
            return result('Choose a safe place to wait.');
        if(member.mode!==act)memberEvent(who,act,{lastContact:null});
        return result(person.name+(act==='wait'?' waits here.':' travels with you.'));
    }
    const equip=()=>{
        materialise(s,content,dice,emit,who);
        bindPartyEquipment(s,who,emit);
        if(events.length && dice.n!==before.rng.n)events.at(-1).rng_to=dice.n;
    };
    if(act==='accept'){
        if(a?.phase!=='open' || a.proposer!==who) return result('Select a current offer from this person.');
        const r=partyDecision(s,content,{act:'accept',who,agreement:a.id,quote:source},source,'pc',emit,contractReady,true);
        if(r.done) equip();
        return result(r.line);
    }
    if(act!=='invite' || member) return result('No available party action.');
    if(open.length) return result('An offer is already pending: '+open.map(a=>a.terms.text).join(' / '));
    const situation=JSON.stringify([s.scene.at,person.status,person.sheet?.level,Object.values(s.quests).filter(q=>q.status==='active').map(q=>q.id).sort()]);
    if(agreementsOf(s).some(a=>a.who===who && a.phase==='declined' && a.situation===situation))
        return result(person.name+' has already declined this invitation.');
    let offered;
    if(proposal){
        const checked=partyDecision(s,content,{...proposal,act:'offer'},source,'pc',e=>{
            if(e.t==='party.agreement' && e.d.phase==='open') e={...e,d:{...e.d,standard:true}};
            emit(e);
        },contractReady);
        if(!checked.done) return result(checked.line);
        offered=agreementsOf(s).find(a=>a.who===who && a.phase==='open');
    }
    const id=offered?.id || 'party.'+who+'.'+hash32(revision+'|'+source);
    const quests=Object.values(s.quests).filter(q=>q.status==='active' && q.payout_cp>0).map(q=>({id:q.id,title:q.title,cp:q.payout_cp}));
    const messages=[{role:'system',content:'Decide for the named NPC alone, using the supplied situation. Return one JSON object with invitation, who, decision (accept, decline or counter). Accept means exactly the supplied terms and ordinary party membership. For a counter only, add quest (one listed ID) and cp (positive fixed fee from that quest reward). Never promise equipment or act for another speaker. If the character needs an unsupported condition, decline.'},
        {role:'user',content:JSON.stringify({invitation:id,who,name:person.name,traits:person.descriptors,occupation:truth(s,who,'occupation').map(f=>f.o),role:person.sheet?.class || person.role,temperament:person.sheet?.generated?.temperament,place:s.places[s.scene.at]?.name,terms:offered?.terms || standard,source,quests})}];
    const answer=await ask(messages);call=answer.call;
    let d;
    try {d=JSON.parse(answer.content);} catch {}
    if(!d || d.invitation!==id || d.who!==who || !['accept','decline','counter'].includes(d.decision) ||
        Object.keys(d).some(k=>!['invitation','who','decision',...(d.decision==='counter'?['quest','cp']:[])].includes(k)))
        {events.length=0;return result('The partner’s decision could not be recorded. The invitation can be tried again.');}
    const counter=d.decision==='counter';
    const quest=counter && quests.find(q=>q.id===d.quest);
    if(counter && (!quest || !Number.isSafeInteger(d.cp) || d.cp<1 || d.cp>quest.cp))
        {events.length=0;return result('The proposed condition could not be booked.');}
    if(offered && d.decision==='accept'){
        const resultOfAnswer=partyDecision(s,content,{act:'accept',who,agreement:id,quote:offered.terms.text},
            offered.terms.text,who,emit,contractReady,true);
        if(!resultOfAnswer.done){events.length=0;return result(resultOfAnswer.line);}
        equip();
        return result(person.name+' joined the party. '+offered.terms.text);
    }
    const terms=counter ? {combat:true,quest:quest.id,cp:d.cp,text:person.name+' requests '+d.cp+' cp from '+quest.title+'.'} :
        offered?.terms || {combat:true,quest:null,text:standard};
    emit({t:'party.agreement',d:{id,who,phase:counter?'open':d.decision==='accept'?'accepted':'declined',
        standard:true,terms,situation,proposer:counter?who:'pc',source:{actor:'pc',quote:source,at:s.scene.at,turn:s.turn},
        answer:{actor:who,decision:d.decision},previous:offered?.revision || 0}});
    if(d.decision==='accept'){memberEvent(who,'follow',{agreement:id,standard:true,combat:true,priority:null,watch:false,formation:null});equip();}
    return result(counter?terms.text+' Offer open.':person.name+(d.decision==='accept'?' joined the party.':' declined the invitation.'));
}
