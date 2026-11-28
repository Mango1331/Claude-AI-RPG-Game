import test from 'node:test';
import assert from 'node:assert/strict';
import {engineAt,loadCorpus} from '../../tools/replay/replay.mjs';
import {checkEvents} from '../../tools/replay/mechanical_invariants.mjs';
import {ownershipViolation} from '../../src/v4/ownership.js';
const E=await engineAt();
test('original historical event transitions satisfy mechanical accounting',()=>{
    for(const run of loadCorpus()){
        let s=E.state.emptyState();
        for(const [i,m] of run.chat.entries()){
            const events=E.host.messageEvents(m);
            checkEvents(E,s,events,run.source.label+'#'+i);
            for(const e of events)E.state.applyEvent(s,e);
        }
    }
});
test('corrupted receipts, ownership and revisions are detected',()=>{
    const run=loadCorpus()[0], s=E.host.foldChat(run.chat).state;
    const id='pc', sh=s.entities.pc.sheet, who='npc.test';
    s.objects.test={qty:1}; s.entities[who]={status:'dead'};s.quests.test={status:'completed'};
    for(const [t,d] of [
        ['coin.changed',{id,delta:1,value:sh.coin_cp+10}],
        ['xp.changed',{id,amount:1,xp:sh.xp+10}],
        ['level.up',{id,level:sh.level+2,xp_after:0}],
        ['xp.changed',{id,amount:20,xp:sh.xp+20,quest:'test'}],
        ['transaction.completed',{from:'guild',cp:20,quest:'test'}],
        ['object.moved',{id:'test',qty:1,split:'test'}],
        ['object.moved',{id:'test',qty:2}],['quest.status',{id:'test',to:'completed'}],
        ['party.claim',{who,id:'test',paid:20}],['party.member',{who,mode:'wait',at:'absent'}],
        ['scene.moved',{at:'unknown'}],
    ])assert.throws(()=>checkEvents(E,s,[{t,d}],'mutated'),/mutated/);
    assert.throws(()=>checkEvents(E,s,[{t:'rng',d:{},rng_to:-1}],'mutated'),/RNG/);
    assert.ok(ownershipViolation({kind:'delta',type:'fact'}, {t:'coin.changed',d:{id}},s));
    assert.ok(E.host.inputRecordError({is_user:true,mes:'edited',extra:{avereth:{input_hash:'original',events:[{t:'party.member'}]}}},1));
});
