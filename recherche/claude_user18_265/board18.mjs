// Board probe: parse the archived first board answer of M13 as it is, and with only habitat.place removed.
import fs from 'node:fs'; import {pathToFileURL} from 'node:url';
const R = process.argv[2];
const {engineAt} = await import(pathToFileURL(R + '/tools/replay/replay.mjs').href);
const {host, content} = await engineAt(R);
const {parseInitialBoard} = await import(pathToFileURL(R + '/src/v4/guild.js').href);
const {boardFor} = await import(pathToFileURL(R + '/src/v4/runtime.js').href);
const chat = fs.readFileSync(process.argv[3] || 'u18/chat.jsonl', 'utf8').trim().split('\n').slice(1).map(JSON.parse);
const st = host.foldChat(chat.slice(0, 13)).state;
const A = JSON.parse(fs.readFileSync(process.argv[4] || 'u18/answers.json', 'utf8')).answers[13];
const need = {branch: 'loc.alderwatch', rank: 'Novice', missing: 5, day: 0, have: [], c: true, profile: 'count', progression: true, minimum: 4};
const rec = host.rec(chat[13]); const stored = rec.board || {};
const realNeed = boardFor(st, content, [{seq:1, type:'board.read', rank:null, quote:'i look at the questboard'}], {c:true});
const first = A[1].content, stripped = JSON.stringify({...JSON.parse(first), listings: JSON.parse(first).listings.map(l => l.habitat ? {...l, habitat: Object.fromEntries(Object.entries(l.habitat).filter(([k]) => k !== 'place'))} : l)});
for (const [label, ans] of [['original', first], ['without habitat.place', stripped], ['archived repair', A[2].content]]) {
    const p = parseInitialBoard(ans, content, realNeed, st);
    console.log(label.padEnd(24), 'valid listings', p.listings?.length ?? 0, '| errors', (p.errors || []).slice(0, 2).join('; ').slice(0, 120), '| refused', (p.refused || []).map(r => r.title + ': ' + r.why).join(' / ').slice(0, 160));
}
console.log('need used', JSON.stringify(realNeed));
