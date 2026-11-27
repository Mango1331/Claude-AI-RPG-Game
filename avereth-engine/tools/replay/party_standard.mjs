// Offline host probes using the original AI start immediately before Alaric's invitation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {engineAt} from './replay.mjs';
const {host,runtime,content}=await engineAt(new URL('../..',import.meta.url).pathname);
const records=gunzipSync(fs.readFileSync(process.argv[2])).toString().trimEnd().split('\n').map(JSON.parse);
const prefix=records.slice(1,16),who='npc.ossen';
assert.equal(prefix.length,15);
assert.ok(host.foldChat(prefix).state.scene.present.includes(who));
async function run(outcome,natural=false){
    const chat=structuredClone(prefix),calls=[];
    const play=async(text,decision=outcome)=>{
        chat.push({is_user:true,mes:text,extra:{}});
        const result=await runtime.prepareGenerationAsync(chat,content,{llm:async req=>{
            calls.push(req.purpose);
            if(req.purpose==='party_decision'){
                const {who,invitation,quests}=JSON.parse(req.messages.at(-1).content);
                return JSON.stringify({who,invitation,decision,...(decision==='counter'?{quest:quests[0].id,cp:20}:{})});
            }
            if(req.purpose.startsWith('plan'))return JSON.stringify({travel_frame:'local',commands:[{type:'party',seq:1,act:'invite',who,quote:text}]});
            throw Error('Unexpected model call '+req.purpose);
        }});
        assert.equal(result.action,'panels',JSON.stringify([result.action,result.notice,host.rec(chat.at(-1))?.plan?.error]));
        return host.foldChat(chat).state;
    };
    const action=natural?'Ossen, join my party.':'#party invite Ossen';
    let s=await play(action);
    assert.deepEqual(calls,natural?['plan','party_decision']:['party_decision']);
    if(outcome==='decline'){
        s=await play(action);assert.equal(calls.length,1);assert.ok(!s.party.members[who]);return;
    }
    if(outcome==='counter'){
        assert.ok(!s.party.members[who]);const a=Object.values(s.party.agreements).find(a=>a.phase==='open');
        assert.equal(a.terms.cp,20);s=await play('#party accept '+a.id);
    }
    assert.equal(s.party.members[who].mode,'follow');
    assert.ok(s.entities[who].sheet);
    const sheet=structuredClone(s.entities[who].sheet),at=s.scene.at,time=s.clock.minute;
    s=await play('#party wait '+who);assert.equal(s.party.members[who].mode,'wait');
    s=await play('#party follow '+who);assert.equal(s.party.members[who].mode,'follow');
    s=await play('#party disband');assert.equal(s.party.members[who].mode,'left');
    assert.equal(s.scene.at,at);assert.equal(s.clock.minute,time);assert.deepEqual(s.entities[who].sheet,sheet);
    assert.deepEqual(host.foldChat(JSON.parse(JSON.stringify(chat))).state,s);
    assert.equal(calls.length,natural?2:1);
}
for(const decision of ['accept','decline','counter']) await run(decision);
await run('accept',true);
console.log('Original AI prefix: admission, refusal cache, counter, local organisation, reload and free-text admission passed.');

const {applyEvent}=await import('../../src/state.js');
const {recordWork,settleQuest,payClaim}=await import('../../src/party_rewards.js');
const state=host.foldChat(structuredClone(prefix)).state;
const helper=state.scene.present.find(id=>id!==who && state.entities[id]?.kind==='npc');
const emit=e=>applyEvent(state,e);
for(const id of [who,helper]){
    state.entities[id].sheet=structuredClone(state.entities.pc.sheet);
    emit({t:'party.member',d:{who:id,mode:'follow',at:state.scene.at,standard:true,combat:true,previous:0}});
}
const q=Object.values(state.quests).find(q=>q.status==='active');
q.payout_cp=91;
recordWork(state,emit,q,'first',['pc',who,helper]);
emit({t:'party.member',d:{...state.party.members[who],mode:'left',previous:1}});
state.scene.present=state.scene.present.filter(id=>id!==who);
settleQuest(state,emit,q);
const outstanding=state.party.claims[q.id+'/'+who];
assert.equal(outstanding.amount,30);
assert.equal(outstanding.paid,0);
assert.equal(state.party.claims[q.id+'/'+helper].paid,30);
state.scene.present.push(who);state.entities.pc.sheet.coin_cp+=91;
assert.ok(payClaim(state,emit,outstanding,20));
settleQuest(state,emit,q);
assert.equal(state.party.claims[outstanding.id].paid,30);
const checkpoint=structuredClone(state);
settleQuest(state,emit,q);
assert.deepEqual(state,checkpoint);
console.log('Three-person odd payout, vested absence, partial payment and idempotent settlement passed.');
