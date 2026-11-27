// Actual market reunion before Hearth's unsuccessful first payment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {engineAt} from './replay.mjs';
const {host, runtime, content} = await engineAt(new URL('../..', import.meta.url).pathname);
const messages = gunzipSync(fs.readFileSync(process.argv[2])).toString().trim().split('\n').slice(1).map(JSON.parse);
const chat = messages.slice(0,61);
const state = () => host.foldChat(chat).state;
const [id] = Object.keys(state().party.claims);
const initial = state().entities['npc.ossen'].sheet.coin_cp;
async function submit(text, llm = () => assert.fail('local action made a request')) {
    chat.push({mes:text,is_user:true,extra:{}});
    return runtime.prepareGenerationAsync(chat, content, {llm});
}
const original = JSON.parse(host.rec(messages[61]).plan.raw.at(-1));
const paid = await submit(messages[61].mes, async req => {
    assert.ok(req.messages.some(m=>m.content.includes('claim='+id)));
    const plan = structuredClone(original);
    plan.commands[0].claim = id;
    return JSON.stringify(plan);
});
assert.equal(state().party.claims[id].paid,20,paid.notice);
for (const [ref, amount, expected] of [['wrong',25,20],[id,26,20],[id,25,45],[id,25,45]]) {
    await submit('#party pay '+ref+' '+amount);
    assert.equal(state().party.claims[id].paid,expected);
    assert.equal(state().entities['npc.ossen'].sheet.coin_cp,initial+expected);
}
console.log('Original Hearth reunion: bound party payment, invalid IDs and overpayment refused, native remainder paid exactly once.');
