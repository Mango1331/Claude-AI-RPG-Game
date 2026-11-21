// Original User07 chat revisions and physical answers from the main checkout, no transport.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {engineAt} from './replay/replay.mjs';
import {parseServerLog} from './run_report.mjs';
import {buildContext} from '../src/context.js';
import {truth} from '../src/knowledge.js';

const E=await engineAt(), folder=process.argv[2];
function archive(suffix) {
    const read=name=>fs.readFileSync(path.join(folder,name+suffix+(name==='ORIGINAL_CHAT'?'.jsonl':'.txt')),'utf8');
    const chat=read('ORIGINAL_CHAT').trim().split('\n').map(JSON.parse).slice(1);
    const {pairs,errors}=parseServerLog(read('ORIGINAL_CHAT_COMPLETION_LOG'));
    assert.deepEqual(errors,[]);
    return {chat,answer:n=>pairs[n-1].resp.choices[0].message.content};
}
const one=archive(''), two=archive('_PHASE2');
async function player(source,i,ids){
    const chat=structuredClone(source.chat.slice(0,i+1)), m=chat[i];
    delete m.extra.avereth;
    let n=0;
    const generated=await E.runtime.prepareGenerationAsync(chat,E.content,{llm:async()=>source.answer(ids[n++])});
    if (i===9) assert.match(generated.context.text,/one service inside the Guild hall/);
    if ([51,53,61].includes(i)) {
        assert.match(generated.context.text,/Stop in this section/);
        assert.doesNotMatch(generated.context.text,/real choice of way|a room, a find, a fork/);
    }
    assert.equal(n,ids.length);
    return chat;
}
async function reply(prefix,source,i,answers){
    const chat=structuredClone(prefix);
    chat.push(structuredClone(source.chat[i]));
    delete chat[i].extra.avereth;
    assert.ok(E.runtime.processReplyAny(chat,i,E.content,{}).extract);
    const req=E.runtime.extractionRequest(chat,i,E.content);
    let n=0;
    await E.runtime.runExtraction(chat,i,E.content,async()=>{
        assert.ok(n<answers.length);
        const item=answers[n++];
        return typeof item==='number'?source.answer(item):JSON.stringify(item);
    });
    assert.equal(n,answers.length);
    const record=chat[i].extra.avereth;
    assert.equal(record.extraction.status,'applied');
    const folded=E.host.foldChat(JSON.parse(JSON.stringify(chat)));
    assert.deepEqual(folded.errors,[]);
    return {state:folded.state,record,req,chat};
}
const reg=await player(one,9,[7,8]);
const hall='loc.ashbridge.guild_hall', clerk='npc.npcashbridge_clerk';
const old=await reply(reg,one,10,[10]);
assert.match(old.req.actions,/one service inside the Guild hall/);
assert.deepEqual(old.record.rejected.map(r=>r.rule),['no_go','no_go','scene_context','scene_context']);
const report=JSON.parse(one.answer(10));
report.deltas=[report.deltas[1]];
const routine=await reply(reg,one,10,[report]);
assert.equal(routine.state.scene.at,hall);
assert.equal(routine.record.rejected?.length||0,0);
assert.ok(truth(routine.state,clerk,'measured').length);
assert.equal(routine.state.entities.pc.sheet.coin_cp,old.state.entities.pc.sheet.coin_cp);
const mixed=structuredClone(one.chat.slice(0,10)), user=mixed[9];
delete user.extra.avereth;
user.mes+=' *I go outside into Ashbridge.*';
const mixedPlan=JSON.parse(one.answer(8));
mixedPlan.commands.push({seq:2,type:'go',to:'loc.ashbridge',quote:'I go outside into Ashbridge'});
await E.runtime.prepareGenerationAsync(mixed,E.content,{llm:async()=>JSON.stringify(mixedPlan)});
const mixedState=E.host.foldChat(mixed).state;
assert.ok(mixedState.last.outcome.booked.registration);
assert.ok(mixedState.last.outcome.auth.gos.some(g=>g.seq===2 && g.to==='loc.ashbridge'));
assert.equal(mixedState.entities.pc.sheet.coin_cp,routine.state.entities.pc.sheet.coin_cp);
const trail=await player(two,33,[26]);
const camp=await reply(trail,two,34,[28,29]);
assert.ok(camp.req.user.includes('Search began at loc.wrecked_cart_hollow'));
const corrected=JSON.parse(two.answer(28));
corrected.deltas[0].scene='loc.wrecked_cart_hollow';
corrected.deltas[3].population='independent';
assert.deepEqual((await reply(trail,two,34,[corrected])).state,camp.state);
for (const [i,p,ids,k] of [[51,47,[49,50],1],[53,51,[53],2],[61,58,[60,61],3]]) {
    const prefix=await player(two,i,[p]), archived=await reply(prefix,two,i+1,ids);
    const id='loc.mossback_warrens.l1_s'+k;
    const original=E.host.foldChat(two.chat.slice(0,i+2)).state;
    for(const key of ['scene','places','entities','objects','quests','knowledge','encounter','clock','facts'])
        assert.deepEqual(archived.state[key],original[key],`message ${i+1}: archived ${key}`);
    assert.equal(archived.state.scene.at,id);
    assert.doesNotMatch(archived.req.actions,/a room, a find, a fork|real choice of way/);
    assert.match(archived.req.actions,/Stop in this section/);
    if (k!==3) continue;
    // Controlled T3 alternative: report known canonical subject and descriptive predicate.
    assert.equal(truth(archived.state,id,'tracks').length,0);
    const typed=JSON.parse(two.answer(61));
    for(const d of typed.deltas.filter(d=>d.type==='fact')) {
        d.s=id;
        if (d.p==='state') d.p='description';
    }
    const canonical=await reply(prefix,two,i+1,[typed]);
    assert.match(truth(canonical.state,id,'tracks')[0].o,/one set broader/);
    assert.match(truth(canonical.state,id,'description')[0].o,/cold firepit/);
    const revisit=JSON.parse(JSON.stringify(canonical.chat));
    const input='I look closely at the goblin tracks and the cold firepit.';
    revisit.push({is_user:true,mes:input,extra:{}});
    await E.runtime.prepareGenerationAsync(revisit,E.content,{llm:async()=>JSON.stringify({commands:[]})});
    const next=E.host.foldChat(revisit).state;
    const recalled=buildContext(next,E.content,{input}).text;
    console.log('Synthetic next inspection: tracks in default-budget narrator block:',recalled.includes('one set broader'));
    assert.ok(Object.values(canonical.state.objects).some(o=>o.holder?.loc===id && /clay pot/.test(o.name)));
    assert.equal(canonical.record.rejected.filter(r=>r.rule==='dungeon_way').length,2);
    assert.deepEqual(canonical.state.quests,archived.state.quests);
    assert.deepEqual(canonical.state.scene,archived.state.scene);
}
console.log('I5/I17/I26/I27/I31 passed, including saved room facts, pot, quests and rejected side passages.');
