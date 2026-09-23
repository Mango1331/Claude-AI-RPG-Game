// Replays the Testrun-v1 chat (tests/testrun_v1/fixture.json) through the engine and prints a Markdown table that
// compares the Avereth-owned prompt share of the original run (CD v2.3 + WorldInfo + NPC patch) with the engine
// architecture (Narrator Contract v3 + engine block). Host (Megumin preset) and chat history are unchanged and left out.
// Usage: node tools/testrun_compare.js
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContentPack } from '../src/content.js';
import { prepareGeneration, processReply } from '../src/host.js';
import { estimateTokens } from '../src/util.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const json = async (rel) => JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
const content = await loadContentPack((name) => json(`content/${name}`));
const fx = await json('tests/testrun_v1/fixture.json');

// Avereth-owned share of each Testrun request (tokens, GLM ~4.3 chars/token), from the logger analysis:
// CD v2.3 ~3.6k + WI kernel #0 ~0.95k + NPC patch ~1.0k, plus the engines that fired in that turn.
const OLD = [
    { cd: 3600, wi: 950 + 2300, npc: 1000, note: 'kernel + Creation #54' },
    { cd: 3600, wi: 950 + 2300 + 900, npc: 1000, note: 'kernel + #54 + false positives #3/#4' },
    { cd: 3600, wi: 950, npc: 1000, note: 'kernel' },
    { cd: 3600, wi: 950 + 450, npc: 1000, note: 'kernel + #11 tracking' },
    { cd: 3600, wi: 950 + 3400, npc: 1000, note: 'kernel + START (15 anchors, 30 actions)' },
];
const REPORTS = { 6: { time: 55 }, 8: { time: 25, new: [{ ref: 'trapper', kind: 'npc', desc: ['trapper'], band: 'MEDIUM' }], aware: [{ who: 'trapper', level: 'suspicious' }], concealed: ['pc'] } };
const msg = (m) => (m.is_user ? { is_user: true, mes: m.mes, extra: {} } : { is_user: false, mes: m.mes, swipe_id: 0, swipes: [m.mes], swipe_info: [{ extra: {} }], extra: {} });

const contract = estimateTokens(content.narrator.contract_text);
const chat = [msg(fx.messages[0])];
processReply(chat, 0, content, { seed: 20260923 });
const rows = [];
for (let i = 1, turn = 0; i < fx.messages.length; i += 2, turn += 1) {
    chat.push(msg(fx.messages[i]));
    const gen = prepareGeneration(chat, content, { type: 'normal' });
    const reply = msg(fx.messages[i + 1]);
    reply.mes += `\n<avereth>${JSON.stringify(REPORTS[i + 1] || {})}</avereth>`;
    chat.push(reply);
    processReply(chat, chat.length - 1, content);
    const o = OLD[turn];
    const oldTotal = o.cd + o.wi + o.npc;
    const newTotal = contract + gen.context.tokens;
    rows.push(`| ${turn + 1} | ${fx.messages[i].mes.slice(0, 42).replace(/\|/g, '/')} | ${fx.usage[turn].prompt_tokens} | ${oldTotal} (${o.note}) | ${newTotal} (contract ${contract} + engine ${gen.context.tokens}: ${gen.context.sections.map((s) => s.name).join(', ')}) | ${Math.round((1 - newTotal / oldTotal) * 100)} % |`);
}
console.log('| Turn | Input | Testrun prompt total | Avereth share before | Avereth share with engine | change |');
console.log('|---|---|---|---|---|---|');
console.log(rows.join('\n'));
