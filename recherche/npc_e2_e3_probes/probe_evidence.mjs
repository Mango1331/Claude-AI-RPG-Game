import fs from 'node:fs'; import zlib from 'node:zlib';
const E = process.env.ENG, M = process.env.MAIN;
const { foldChat } = await import(`${E}/src/host.js`);
const { presenceInReply, guildParticipationEvidence } = await import(`${E}/src/v4/narration_evidence.js`);
const { loadProductContent } = await import(`${E}/tests/helpers.js`);
const content = await loadProductContent();
const lines = zlib.gunzipSync(fs.readFileSync(`${M}/testrun_10b/user-20261106-072640/originals/chat.jsonl.gz`)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const chat = lines.slice(1);
const labels = (s, id) => { const e = s.entities[id]; return [e.name, e.known_name, ...(e.descriptors || [])].filter((x) => typeof x === 'string' && x.trim()); };
// I72: arrival at the hall; who of the known people left there does the reply actually show?
const s72 = foldChat(chat, 72).state; // state before the reply (after the player turn)
for (const id of ['npc.npcguild_clerks', 'npc.npcbench_crossbowman']) console.log('I72', id, 'at', s72.entities[id].at, JSON.stringify(labels(s72, id)), '->', JSON.stringify(presenceInReply(chat[72].mes, null, labels(s72, id))));
// I64: the personal witness of the turn-in
const s64 = foldChat(chat, 64).state;
const lab = labels(s64, 'npc.npcguild_clerks');
console.log('I64 labels', JSON.stringify(lab), '->', guildParticipationEvidence(chat[64].mes, lab, { payoutCp: 90, content }));
const sent = chat[64].mes.split(/(?<=[.!?])\s+/).filter((x) => /count|took|slid|paid|stamp|ledger|copper|silver/i.test(x));
console.log('I64 sentences:', JSON.stringify(sent).slice(0, 900));
console.log('control "the clerk counted out ninety copper"', guildParticipationEvidence('The clerk counted out ninety copper onto the counter for the contract.', lab, { payoutCp: 90, content }));
// I74: who handles the acceptance in the prose
console.log('I74 present after reply:', JSON.stringify(foldChat(chat, 75).state.scene.present));
console.log('I6 person.new of the clerks:', JSON.stringify((chat[6].extra?.avereth?.events || []).find((e) => e.t === 'entity.created')?.d.entity).slice(0, 500));
