// Offline acceptance against the original User07 files on main.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {engineAt} from './replay/replay.mjs';
import {parseServerLog} from './run_report.mjs';
import {parseBoard} from '../src/v4/guild.js';

const folder = process.argv[2];
const read = file => fs.readFileSync(path.join(folder,file),'utf8');
const chat = read('ORIGINAL_CHAT.jsonl').trim().split('\n').map(JSON.parse).slice(1);
const {pairs,errors} = parseServerLog(read('ORIGINAL_CHAT_COMPLETION_LOG.txt'));
assert.deepEqual(errors, []);
const E = await engineAt();
const prefix = chat.slice(0,12);
const original = prefix.at(-1).extra.avereth;
const before = E.host.foldChat(prefix.slice(0,-1)).state;
const need = E.runtime.boardFor(before,E.content,original.interp.commands,{c:true});
const board = pairs[11].resp.choices[0].message.content;
const singles = JSON.parse(board).listings.map(item => parseBoard(JSON.stringify({listings:[item]}),E.content,need,before).listings[0]);
delete prefix.at(-1).extra.avereth;
const roles = [];
await E.runtime.prepareGenerationAsync(prefix,E.content,{llm:async ({purpose}) => {
    roles.push(purpose);
    return purpose === 'plan' ? pairs[10].resp.choices[0].message.content : board;
}});
assert.deepEqual(roles,['plan','board']);
assert.deepEqual(prefix.at(-1).extra.avereth.board.listings,5);
const published = Object.values(E.host.foldChat(prefix).state.quests);
assert.equal(published.length,5);
for (const [i,q] of published.entries()) {
    const listing=singles[i];
    for (const field of ['title','level','qtype','payout_cp','client']) assert.deepEqual(q[field],listing[field]);
}
assert.ok(published.some(q=>q.title==='Cull the Quarry Track Wolves' && q.objectives[0].qty===3));
console.log('I6: five individually valid listings, one board request, original wolf hunt published.');
