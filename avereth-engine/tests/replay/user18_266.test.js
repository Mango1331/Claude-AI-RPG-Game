// Real, per-message prefixes from user-20261128-163231-265. Only the two newly
// requested NPC decisions have no physical historical answer.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {engineAt} from '../../tools/replay/replay.mjs';
import {actionPrefix} from '../../src/action_input.js';
import {parseInitialBoard} from '../../src/v4/guild.js';
import {boardFor} from '../../src/v4/runtime.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const {messages,answers}=JSON.parse(gunzipSync(fs.readFileSync(new URL('user18/original.json.gz',import.meta.url))));
const {host,runtime,content}=await engineAt(root);
async function player(i,{decide=()=>'accept',plan}={}) {
    const chat=structuredClone(messages.slice(0,i+1)),m=chat[i];
    delete m.extra.avereth; m.is_system=false;
    if(m.extra.avereth_action_input) m.extra.avereth_action_input.base_revision=actionPrefix(chat,i);
    const calls=[];
    const llm=async req=>{
        calls.push(req.purpose);
        if(req.purpose==='plan') return plan?JSON.stringify(plan):answers[i][0].content;
        if(req.purpose==='party_decision') {
            const {invitation,who,quests}=JSON.parse(req.messages.at(-1).content);
            return JSON.stringify({invitation,who,decision:decide(who,quests)});
        }
        throw Error('Unexpected request '+req.purpose);
    };
    const result=await runtime.prepareGenerationAsync(chat,content,{llm});
    const fold=host.foldChat(chat);
    assert.deepEqual(fold.errors,[]);
    assert.deepEqual(host.foldChat(JSON.parse(JSON.stringify(chat))).state,fold.state);
    return {state:fold.state,result,calls,record:host.rec(m),chat};
}
test('User18 M15: HUD contract then two individually decided invitations',async()=>{
    const {state,calls,record,chat}=await player(15,{decide:(who,quests)=>{
        assert.ok(quests.some(q=>q.id==='quest.cull_the_millpond_gnashers'));
        return who==='npc.sera'?'decline':'accept';
    }});
    assert.deepEqual(calls,['plan','party_decision','party_decision']);
    assert.equal(state.party.members['npc.npcwiry_adventurer'].mode,'follow');
    assert.equal(state.party.members['npc.sera'],undefined);
    assert.ok(record.events.findLast(e=>e.t==='outcome.recorded').d.outcome.actions.some(l=>l.includes('Sera declined')));
    await runtime.prepareGenerationAsync(chat,content,{llm:()=>assert.fail('duplicate decision')});
    assert.deepEqual(host.foldChat(chat).state,state);
});
test('User18 mixed action: neither dependent invitation runs after an unmet condition',async()=>{
    const plan=JSON.parse(answers[15][0].content);
    plan.commands.splice(1,0,{seq:2,type:'party',act:'coordinate',priority:'unsupported',who:null,quote:'team up'});
    for(const [index,c] of plan.commands.slice(2).entries()){c.seq=index+3;c.needs=2;}
    const {state,calls}=await player(15,{plan});
    assert.deepEqual(calls,['plan']);assert.equal(state.party?.members['npc.sera'],undefined);
});
test('User18 M21/M23/M29/M32: original tactical conversations reach narration, only the movement is booked',async()=>{
    for (const i of [21,23,29,32]) {
        const {record,calls,result}=await player(i);
        assert.deepEqual(calls,['plan'],String(i));
        assert.equal(result.action,'context',String(i));
        assert.ok(!record.events.some(e=>/^(?:party\.|coin\.|item\.|encounter\.|object\.moved)/.test(e.t)));
        const actions=record.events.at(-1).d.outcome.actions.join('\n');
        if (i===21) assert.match(actions,/LOCAL APPROACH.*east gate/);
        if (i===23) assert.match(actions,/No change to terms/);
    }
});
test('User18: only redundant locations pass the original board schema',()=>{
    const state=host.foldChat(messages,13).state;
    const need=boardFor(state,content,[{seq:1,type:'board.read',rank:null}],{c:true});
    const first=JSON.parse(answers[13][1].content);
    assert.equal(parseInitialBoard(JSON.stringify(first),content,need,state).listings.length,4);
    for(const l of first.listings) if(l.habitat) l.habitat.place='Elsewhere';
    assert.ok(!(parseInitialBoard(JSON.stringify(first),content,need,state).listings?.length>=4));
});
test('User18 T10 and T11: four actual identities, no duplicate after observing and reloading',async()=>{
    const chat=structuredClone(messages.slice(0,29));
    delete chat[28].extra.avereth;
    runtime.processReplyAny(chat,28,content,{});
    await runtime.runExtraction(chat,28,content,async()=>answers[28][0].content);
    const ids=arr=>host.foldChat(arr).state.scene.present.filter(id=>id.startsWith('mon.'));
    assert.equal(ids(chat).length,4);
    const expected=ids(chat);
    const s=host.foldChat(chat).state;
    assert.ok(Object.values(s.places).some(p=>p.dungeon?.real));
    for (const id of expected) {
        assert.equal(s.entities[id].population_at,s.scene.at);
        assert.equal(s.scene.positions[id].band,'SHORT');
        assert.ok(s.entities[id].profile.level>=1 && s.entities[id].profile.level<=3);
    }
    const observation=structuredClone(messages.slice(34,36));
    chat.push(...observation);
    delete observation[1].extra.avereth;
    runtime.processReplyAny(chat,30,content,{});
    await runtime.runExtraction(chat,30,content,async()=>answers[35][0].content);
    assert.deepEqual(ids(JSON.parse(JSON.stringify(chat))),expected);
    assert.deepEqual(host.foldChat(chat).errors,[]);
});
test('A failed quest step cannot authorize a later invitation with a fee',async()=>{
    const plan=JSON.parse(answers[15][0].content);
    plan.hud_binding.seqs=[2];
    plan.commands[0]={...plan.commands[0],seq:2,needs:1};
    plan.commands.unshift({seq:1,type:'party',act:'coordinate',who:null,priority:'unsupported',quote:'team up'});
    for (const [index,c] of plan.commands.slice(2).entries()) {
        c.seq=index+3;c.needs=2;c.act='offer';c.amount=20;
    }
    const {calls,state,record}=await player(15,{plan});
    assert.deepEqual(calls,['plan']);
    assert.equal(state.quests['quest.cull_the_millpond_gnashers'].status,'listed');
    assert.ok(!record.events.some(e=>e.t.startsWith('party.')));
});
test('Original failed M21 and its receipt stay out of the delivered history after reload',()=>{
    const visible=JSON.parse(JSON.stringify(messages));
    const history=visible.map(m=>({...m}));
    host.projectPromptHistory(history,{keepTurns:0});
    assert.ok(visible.some(m=>m.mes===messages[21].mes));
    assert.ok(!history.some(m=>m.mes===messages[21].mes || m===messages[22] || m.mes===messages[22].mes));
    assert.ok(history.some(m=>m.mes===messages[27].mes));
});
