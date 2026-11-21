// Run with the User07 archive directory from main. No provider or rewritten originals.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { engineAt } from './replay/replay.mjs';
import { parseServerLog } from './run_report.mjs';

const E = await engineAt(), dir = process.argv[2];
const file = name => fs.readFileSync(path.join(dir, name), 'utf8');
const chat = file('ORIGINAL_CHAT_PHASE2.jsonl').trim().split('\n').map(JSON.parse).slice(1);
const { pairs, errors } = parseServerLog(file('ORIGINAL_CHAT_COMPLETION_LOG_PHASE2.txt'));
assert.deepEqual(errors, []);
const fold = rows => E.host.foldChat(rows).state;
const prefix = chat.slice(0, 43), before = fold(prefix), rise = before.scene.at;
assert.match(rise, /rise_above/);
assert.equal(before.entities.pc.sheet.coin_cp, 43);
assert.equal(Object.values(before.objects).filter(o => o.holder?.loc === rise).length, 0);
assert.equal(fold(chat.slice(0, 34)).last.outcome.search_checks[0].success, true);
const kills = before.scene.present.filter(id => before.entities[id]?.looted);
assert.equal(kills.length, 3);
const originalSearch = fold(chat.slice(0, 44)).last.outcome.search_checks[0];
assert.equal(originalSearch.roll, 77);
const plan = pairs[37].resp.choices[0].message.content;
for (const answer of [plan, '{"commands":[]}']) {
    const messages = structuredClone(chat.slice(0, 44));
    delete messages[43].extra.avereth;
    let calls = 0;
    await E.runtime.prepareGenerationAsync(messages, E.content, {llm: async () => { calls++; return answer; }});
    assert.equal(calls, 1);
    const input = fold(messages);
    assert.equal(input.last.outcome.search_checks.length, 0, 'I22: looking over visible camp stock is no PER roll');
    assert.equal(input.scene.at, rise, 'approach still needs a confirmed arrival');
    assert.equal(input.last.outcome.auth.roam, false);
    assert.equal(input.last.outcome.auth.gather, false);
    assert.equal(input.last.outcome.expected_keys['1'], 'go');
    assert.equal(input.last.outcome.auth.gos[0].newName, 'goblin camp');
    const target = {new:{name:'goblin camp',kind:'site',parent:rise}};
    const prose = 'Alaric walks down to the goblin camp. An abandoned clay bowl lies beside the cold hearth.';
    messages.push({is_user:false,mes:prose,extra:{}});
    assert.ok(E.runtime.processReplyAny(messages,44,E.content,{}).extract);
    const report = {scene:target, expected:{1:{arrived:true,at:target}},deltas:[
        {seq:1,type:'arrive',at:target},{seq:2,type:'object.new',name:'clay bowl',kind:'item',qty:1,unit:null,holder:'here',for_quest:null}]};
    let extractions = 0;
    await E.runtime.runExtraction(messages,44,E.content,async()=>{extractions++; return JSON.stringify(report);});
    assert.equal(extractions, 1);
    assert.equal(messages[44].extra.avereth.extraction.status, 'applied');
    const saved = fold(JSON.parse(JSON.stringify(messages)));
    assert.notEqual(saved.scene.at,rise);
    assert.equal(saved.places[saved.scene.at].parent,rise);
    const bowl = Object.values(saved.objects).find(o => o.name === 'clay bowl');
    assert.equal(bowl?.holder.loc,saved.scene.at);
    assert.equal(saved.entities.pc.sheet.coin_cp,43);
    assert.deepEqual(saved.quests,before.quests);
}
const last = fold(chat.slice(0,63));
assert.ok(Object.values(last.objects).some(o => /wax-stoppered clay pot/.test(o.name) && o.holder.loc === 'loc.mossback_warrens.l1_s3'));
console.log('User07 I17/I21/I22/I31 passed. Both planner paths used one controlled arrival and one extraction.');
