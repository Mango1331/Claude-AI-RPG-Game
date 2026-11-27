// Node, offline. Optionales zweites Argument schreibt den synthetischen ST-Präfix für den Hosttest.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] || '.');
const file = name => pathToFileURL(resolve(root, name));
const { engineAt } = await import(file('tools/replay/replay.mjs'));
const { retrieveRelevant } = await import(file('src/context.js'));
const { host, runtime, content, version } = await engineAt(root);
assert.equal(version, '4.3.0-c.6.6.220');
const archive = new URL('../originals/chat.jsonl', import.meta.url);
const chat = fs.readFileSync(archive, 'utf8').trim().split('\n').slice(1).map(JSON.parse);
const settings = {budget:1400, rulesBudget:800, recentTurns:4, engineLore:false};
const hall = 'loc.ashbridge.guild_hall', clerk = 'npc.npcguild_clerk';
const response = (role, answer) => async ({purpose}) => {
    assert.equal(purpose, role);
    return JSON.stringify(answer);
};
async function input(text, commands = []) {
    chat.push({mes:text, name:'Alaric', is_user:true, is_system:false, extra:{}});
    const step = await runtime.prepareGenerationAsync(chat, content, {settings, llm:response('plan', {commands})});
    assert.equal(step.action, 'context');
    return step;
}
async function reply(text, answer) {
    chat.push({mes:text, name:'Avereth', is_user:false, is_system:false, extra:{}});
    const i = chat.length - 1;
    assert.ok(runtime.processReplyAny(chat, i, content, {}).extract);
    await runtime.runExtraction(chat, i, content, response('extract', answer));
    const record = host.rec(chat[i]);
    assert.equal(record.extraction.status, 'applied');
    assert.ok(record.events.every(e => e.t !== 'delta.rejected'));
    return record;
}

for (const text of ['I listen to the wind.', 'I check the sky.', 'I brush the dust from my sleeve.',
    'I study the leaves by my boots.', 'I stretch my fingers.', 'I adjust my cloak.']) {
    await input(text);
    const meeting = host.rec(chat.at(-1)).events.some(e => e.t === 'pulse.rolled' && e.d.open && e.d.kind === 'meeting');
    await reply(meeting ? 'Two passing charcoal burners lift their hands in greeting and continue down the road.'
        : 'The breeze stirs the dry grass at the edge of the slope.', {scene:'here', expected:{}, deltas:[]});
}
const outside = structuredClone(chat);
const go = "I head back along the quarry road to the Adventurers' Guild hall in Ashbridge.";
await input(go, [{seq:1, type:'go', to:hall, quote:go}]);
const arrival = 'Alaric follows the quarry road to Ashbridge and arrives in the Guild hall.';
const met = 'The familiar thin Guild Clerk with ink-stained fingers and low spectacles is at the counter in front of him.';
const returned = await reply(arrival + ' ' + met, {scene:hall,
    expected:{1:{arrived:true, at:hall, with:null, met:null}}, deltas:[
        {scene:null, seq:1, type:'arrive', at:hall, evidence:arrival, with:null, forced_by:null},
        {scene:hall, seq:2, type:'enter', who:clerk, evidence:met}
    ]});
assert.ok(returned.events.some(e => e.t === 'scene.moved' && e.d.at === hall));
assert.ok(returned.events.some(e => e.t === 'scene.entered' && e.d.id === clerk));
assert.ok(returned.events.some(e => e.t === 'time.advanced' && e.d.minutes === 60));
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(chat));

for (const [place, prefix, question] of [
    ['Gilde', structuredClone(chat), 'I greet the clerk and ask what is new in town.'],
    ['Ostfalte', outside, 'I look around from where I am standing.']
]) {
    chat.splice(0, chat.length, ...prefix);
    const priorReply = chat.at(-1).mes;
    const step = await input(question);
    const {state, errors} = host.foldChat(chat);
    assert.deepEqual(errors, []);
    const retrieved = retrieveRelevant(state, content, {input:question, lastReply:priorReply, budget:1400, recentTurns:4});
    const promise = retrieved.items.findIndex(row => row.item.label.includes('promised Dammar a good word'));
    const nameInEngine = step.context.text.includes('Dammar');
    if (place === 'Gilde') {
        assert.ok(promise >= 0);
        assert.ok(step.context.dropped.includes('relevant'));
        assert.equal(nameInEngine, false);
        assert.deepEqual(state.scene.present, ['pc',clerk]);
        assert.deepEqual(state.knowledge[clerk], host.foldChat(outside).state.knowledge[clerk]);
    }
    console.log({place, turn:state.turn, at:state.scene.at, question,
        promiseRank:promise >= 0 ? promise + 1 : null, nameInEngine, dropped:step.context.dropped});
}
