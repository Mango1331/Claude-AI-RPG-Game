// Usage: node replay.mjs /path/to/the/product/avereth-engine
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';

const engine = path.resolve(process.argv[2]);
const {engineAt} = await import(pathToFileURL(path.join(engine, 'tools/replay/replay.mjs')));
const {host, runtime, content} = await engineAt(engine);
const runs = fileURLToPath(new URL('../../testrun_10b/', import.meta.url));
function source(run, file) {
    return gunzipSync(fs.readFileSync(path.join(runs, 'openrouter-20261127-' + run, file))).toString();
}
function messages(run) {
    return source(run,'chat.jsonl.gz').trim().split('\n').slice(1).map(JSON.parse);
}
async function extract(chat, answer) {
    const i = chat.length-1;
    delete chat[i].extra.avereth;
    runtime.processReplyAny(chat,i,content);
    await runtime.runExtraction(chat,i,content,async()=>answer);
    const {state,errors} = host.foldChat(chat);
    assert.deepEqual(errors,[]);
    return state;
}

const original = messages('h-226');
const reply = original.at(-1);
const answer = JSON.stringify(host.rec(reply).extraction.raw);
for (const [prose,accepted] of [
    [reply.mes,true],
    [reply.mes.replace('Name’s Ossen','Name’s Garrick'),false],
    [reply.mes.replace('Fair enough.','Fair enough, if you give me your staff.'),false],
]) {
    const chat = structuredClone(original);
    chat.at(-1).mes = prose;
    const s = await extract(chat,answer);
    assert.equal(!!s.party?.members?.['npc.ossen'],accepted);
}
const m = messages('m-230');
const firstResponse = JSON.parse(source('m-230','raw-187.gz')).choices[0].message.content;
const next = await extract(m,firstResponse);
assert.equal(next.scene.at,'loc.old_crown_catacombs.l1_s3');
assert.ok(next.scene.present.includes('npc.ossen'));

const i = messages('i-227');
const early = i.findIndex(m => host.rec(m)?.events?.some(e => e.t==='quest.ready' && e.d.id==='quest.clear_the_old_crown_catacombs_level_1'));
assert.ok(early>=0);
const r = host.rec(i[early]);
const after = await extract(i.slice(0,early+1),JSON.stringify(r.extraction.raw));
assert.ok(!after.quests['quest.clear_the_old_crown_catacombs_level_1'].ready);
assert.equal(after.entities.pc.sheet.xp,90);
assert.equal(after.entities['npc.ossen'].sheet.xp,90);
console.log('H membership and two negative controls, I partial floor, M canonical arrival verified.');

for (const run of ['q-232','r-232']) {
    const prefix = messages(run).slice(0,39);
    const report = host.rec(prefix.at(-1)).extraction.raw;
    const state = await extract(prefix,JSON.stringify(report));
    const slot = state.dungeons['loc.mossback_warrens'].run.floors[1].slots[0];
    assert.equal(new Set(slot.entities).size,2,run);
    assert.equal(state.scene.at,'loc.east_fold_below_the_moss_grown_hill',run);
}
for (const [run,mode] of [['ac-234','left'],['z-234','left'],['x-233','follow']]) {
    const chat = messages(run);
    const requests = source(run,'requests.jsonl.gz').trim().split('\n').map(JSON.parse);
    const planner = requests.find(r => r.kind === 'end' && r.turn === 1 && r.role === 'planner');
    const first = requests.find(r => r.kind === 'start' && r.id === planner.id);
    const actions = source(run,'actions.jsonl.gz').trim().split('\n').map(JSON.parse);
    const playerText = actions[0].text;
    const i = chat.findLastIndex(m => m.is_user && m.mes === playerText);
    assert.ok(i>=0 && first,run);
    const prefix = chat.slice(0,i+1);
    prefix[i] = {is_user:true, mes:playerText, extra:{}};
    const answer = JSON.parse(source(run,path.basename(planner.rawFile))).choices[0].message.content;
    await runtime.prepareGenerationAsync(prefix,content,{llm: async () => answer});
    assert.equal(host.foldChat(prefix).state.party.members['npc.ossen'].mode,mode,run);
}
console.log('Q/R original visual reports and AC/Z/X original departure decisions verified.');

// Baseline of the open attribution finding for the independent review.
for (const [run,length] of [['ai-235',17],['aj-235',21]]) {
    const chat = messages(run);
    const answerAt = chat.findIndex((m,i) => i>=length-1 && host.rec(m)?.rejected?.some(x =>
        x.rule==='party_decision' && x.why==='The decision needs words from the identified speaker.'));
    assert.ok(answerAt>=0,run);
    const prefix = chat.slice(0,answerAt+1);
    const report = host.rec(prefix.at(-1)).extraction.raw;
    const state = await extract(prefix,JSON.stringify(report));
    assert.ok(!state.party.members['npc.ossen'],run);
    assert.ok(Object.values(state.party.agreements).some(a=>a.phase==='open' && a.who==='npc.ossen'),run);
}
console.log('AI/AJ: spoken consent remains an open proposal on .235.');

// Optional: apply the identical paid Q report on the unmodified .221 and compare the slot.
if (process.argv[3]) {
    const basePath = path.resolve(process.argv[3]);
    const loader = await import(pathToFileURL(path.join(basePath,'tools/replay/replay.mjs')));
    const base = await loader.engineAt(basePath);
    const prefix = messages('q-232').slice(0,39);
    const i = prefix.length-1;
    const report = host.rec(prefix[i]).extraction.raw;
    delete prefix[i].extra.avereth;
    base.runtime.processReplyAny(prefix,i,base.content);
    await base.runtime.runExtraction(prefix,i,base.content,async()=>JSON.stringify(report));
    const {state,errors} = base.host.foldChat(prefix);
    assert.deepEqual(errors,[]);
    const ids = state.dungeons['loc.mossback_warrens'].run.floors[1].slots[0].entities;
    assert.equal(ids?.length || 0,0);
    console.log('Identical Q report: zero canonical slot targets on .221, two on .235.');
}
