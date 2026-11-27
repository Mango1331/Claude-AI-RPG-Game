import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {engineAt} from './replay.mjs';
const {runtime, host, content} = await engineAt(new URL('../..', import.meta.url).pathname);
const messages = gunzipSync(fs.readFileSync(process.argv[2])).toString().trimEnd().split('\n').slice(1).map(JSON.parse);
const index = messages.findIndex(m => m.is_user && m.mes.includes('come with me again'));
assert.ok(index > 0);
for (const mode of ['follow','left']) {
    const chat = structuredClone(messages.slice(0,index));
    const input = mode === 'follow' ? messages[index].mes : 'I disband my party and I go to the ruined chapel.';
    const raw = JSON.parse(host.rec(messages[index]).plan.raw[0]);
    if (mode==='left') raw.commands[0].quote=input;
    chat.push({is_user:true,mes:input,extra:{}});
    const result = await runtime.prepareGenerationAsync(chat,content,{llm:async()=>JSON.stringify(raw)});
    const s=host.foldChat(chat).state;
    assert.equal(result.action,'context');
    assert.equal(s.party.members['npc.ossen'].mode,mode);
    assert.equal(s.last.outcome.auth.gos.length,1);
    console.log(mode,s.last.outcome.auth.gos[0].name);
}
