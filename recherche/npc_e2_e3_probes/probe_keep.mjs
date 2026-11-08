// read-only local reproduction (User04, state after the player's I71 GO): what the .168 firewall does with
// (a) a newly described unnamed clerk and (b) an enter for the known people left at the hall. Synthetic extractor
// answers on the original I72 prose; no product file written, no model call.
import fs from 'node:fs'; import zlib from 'node:zlib';
const E = process.env.ENG, M = process.env.MAIN;
const { foldChat } = await import(`${E}/src/host.js`);
const { replyTurnV4 } = await import(`${E}/src/v4/turn.js`);
const { loadProductContent } = await import(`${E}/tests/helpers.js`);
const content = await loadProductContent();
const lines = zlib.gunzipSync(fs.readFileSync(`${M}/testrun_10b/user-20261106-072640/originals/chat.jsonl.gz`)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const chat = lines.slice(1);
const s = foldChat(structuredClone(chat), 72).state; // after the player's I71, before the reply I72
const hall = 'loc.alderwatch.guild_hall';
const k = Object.entries(s.last?.outcome?.expected_keys || {}).find(([, t]) => t === 'go')?.[0] || '1';
const prose = chat[72].mes;
const run = (label, deltas) => {
  const raw = { scene: hall, expected: { [k]: { arrived: true, at: hall, with: null } }, deltas: [{ seq: 1, type: 'arrive', at: hall, with: null, forced_by: null, scene: hall }, ...deltas] };
  const r = replyTurnV4(structuredClone(s), content, raw, { prose });
  const ev = r.events.filter((e) => ['entity.created', 'scene.entered', 'delta.rejected'].includes(e.t)).map((e) => e.t === 'entity.created' ? `created(${e.d.entity.id})` : e.t === 'scene.entered' ? `entered(${e.d.id})` : `rejected(${e.d.rule})`);
  console.log(label, '->', ev.join(', '), '| at', r.state.scene.at, '| present', JSON.stringify(r.state.scene.present));
};
console.log('expected keys', JSON.stringify(s.last?.outcome?.expected_keys), '| go key', k, '| clerks at', s.entities['npc.npcguild_clerks'].at, '| scene before', s.scene.at);
run('(a) new unnamed clerk "older man with ink-stained fingers"', [{ seq: 2, type: 'person.new', ref: 'older_clerk', name: null, role: 'clerk', desc: ['older man with ink-stained fingers weighing something on a small brass scale'], present: true, relevant: true, scene: hall }]);
run('(b) enter known clerks + crossbowman, no evidence', [{ seq: 2, type: 'enter', who: 'npc.npcguild_clerks', evidence: null, scene: hall }, { seq: 3, type: 'enter', who: 'npc.npcbench_crossbowman', evidence: null, scene: hall }]);
