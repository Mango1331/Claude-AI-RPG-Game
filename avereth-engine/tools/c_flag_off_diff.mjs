// Prototype C, planner off (docs/PROTOTYPE_C.md §8): is A unchanged? Two engine trees, e.g. the base commit 90bd450 in a
// git worktree and this tree, play (1) the three recorded live runs and (2) a Mage fight with inputs the live runs lack
// (hold, wait, flee, hide, an unknown skill, an alias, a skill on the floor, a search …), both with the planner off. Every
// engine block, message record and folded state must be byte-identical; only the build stamps are set aside.
// Offline, no provider, deterministic.
//
//   git worktree add --detach /tmp/base 90bd450
//   node tools/c_flag_off_diff.mjs /tmp/base/avereth-engine .
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [rootA, rootB = '.'] = process.argv.slice(2);
if (!rootA) {
    console.error('usage: node tools/c_flag_off_diff.mjs <engine root A (base)> [engine root B, default .]');
    process.exit(2);
}
async function tree(root) {
    const imp = (rel) => import(pathToFileURL(path.resolve(root, rel)).href);
    const { loadContent } = await imp('tests/helpers.js');
    const { Chat4 } = await imp('tests/v4/harness.js');
    const { turnBlock, rec } = await imp('src/host.js');
    return { content: await loadContent(), Chat4, turnBlock, rec };
}
const T = [await tree(rootA), await tree(rootB)];
const { replayRun } = await import(pathToFileURL(path.resolve(rootB, 'tests/v4/replay_lib.js')).href);
const STAMPS = new Set(['build', 'ms', 'engine_version', 'content_version']);
const strip = (o) => JSON.stringify(o ?? null, (k, v) => (STAMPS.has(k) ? undefined : v));
const out = { runs: 0, same: 0, diffs: [] };

// (1) the recorded live runs
for (const f of ['live_0930.json', 'live_0930b.json', 'live_0930c.json']) {
    const fx = JSON.parse(fs.readFileSync(path.resolve(rootB, 'tests/v4', f), 'utf8'));
    const [sa, sb] = [await replayRun(T[0].content, fx, { Chat: T[0].Chat4, block: T[0].turnBlock }), await replayRun(T[1].content, fx, { Chat: T[1].Chat4, block: T[1].turnBlock })].map((r) => r.steps);
    if (sa.length !== sb.length) out.diffs.push(`${f}: step count ${sa.length} vs ${sb.length}`);
    for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
        out.runs++;
        const d = ['kind', 'action', 'block'].filter((k) => (sa[i][k] ?? '') !== (sb[i][k] ?? '')).concat(['record', 'state'].filter((k) => strip(sa[i][k]) !== strip(sb[i][k])));
        if (d.length) out.diffs.push(`${f} #${sa[i].i}: ${d.join(', ')}`); else out.same++;
    }
}

// (2) a Mage fight with inputs the live runs lack
async function fight(t) {
    const g = new t.Chat4(t.content);
    await g.player('Mage');
    await g.player('Flame Lance and Arcane Burst');
    await g.player('I climb down into the old burrow.', [{ seq: 1, type: 'go', to: { new: 'the old burrow' }, quote: 'I climb down into the old burrow' }]);
    await g.reply('Three barkscorpions skitter out of the dark and rush at Alaric.', { expected: {}, deltas: [
        { seq: 1, type: 'creature.new', ref: 'barkscorpion', species: 'barkscorpion', anchor: 'arthropod', desc: ['bark-plated'], count: 3, present: true, band: 'SHORT', stronger: null },
        { seq: 2, type: 'hostile', by: ['barkscorpion'] },
    ] });
    return g;
}
const SEQUENCES = [
    ['I hold my ground'], ['I wait'], ['I Flame Lance Barkscorpion B', 'I hold my ground', 'I Arcane Burst'],
    ['I step back from Barkscorpion A and Flame Lance Barkscorpion C'], ['I flee'], ['I run for the exit'], ['I hide behind the rocks'],
    ['I cast Fireball at Barkscorpion B'], ['I attack'], ['I Flame Lance the cracked floor'], ['I look for a way out'], ['I walk back to Redmarch'],
    ['Can I Flame Lance Barkscorpion B from here?'], ['I hit Barkscorpion A with my staff', 'I hit it again'], ['I Fire Lance Barkscorpion B'],
];
let inputs = 0;
let inputsSame = 0;
for (const seq of SEQUENCES) {
    const gs = [await fight(T[0]), await fight(T[1])];
    for (const text of seq) {
        const rs = [];
        for (let k = 0; k < 2; k++) {
            const r = await gs[k].player(text, []);
            const u = gs[k].chat.findLastIndex((m) => m.is_user);
            rs.push({ action: r.action, panels: JSON.stringify(r.panels ?? null), record: strip(T[k].rec(gs[k].chat[u])), block: r.action === 'context' ? T[k].turnBlock(gs[k].chat, u, T[k].content).context.text : '', state: strip(gs[k].state()) });
            if (r.action === 'context') await gs[k].reply('The fight goes on.');
        }
        inputs++;
        const d = Object.keys(rs[0]).filter((k) => rs[0][k] !== rs[1][k]);
        if (d.length) out.diffs.push(`"${text}": ${d.join(', ')}`); else inputsSame++;
    }
}
console.log(`live runs: ${out.same}/${out.runs} steps identical (engine block, record, state)`);
console.log(`fight inputs: ${inputsSame}/${inputs} identical (action, panel, record, engine block, state)`);
for (const d of out.diffs) console.log(`  DIFF ${d}`);
console.log(out.diffs.length ? 'PLANNER OFF: A CHANGED' : 'PLANNER OFF: A UNCHANGED');
process.exit(out.diffs.length ? 1 : 0);
