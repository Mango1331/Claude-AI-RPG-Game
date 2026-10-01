// Gen 3.5, the Unified Intent IR (docs/ARCHITECTURE_GEN35.md §2.1): a player message is read once; the names in it are
// linked to what the engine knows; the route follows from the acts; the V3 engine resolves the parsed act without a
// second parse; the record of the message keeps one IR form for both paths.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { replayRun } from './replay_lib.js';
import { readTurn, MECHANICAL, IR_VERSION } from '../../src/ir.js';
import { parseIntent, linkEntities, maskNames } from '../../src/intent.js';
import { routeTurn } from '../../src/v4/turn.js';
import { playerTurn } from '../../src/engine.js';

const content = await loadContent();
const RUNS = ['live_0930.json', 'live_0930b.json', 'live_0930c.json'].map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4', f), 'utf8')));
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));
const corpus = ['commands.jsonl', 'commands_holdout.jsonl', 'commands_holdout2.jsonl']
    .flatMap((f) => fs.readFileSync(path.join(ROOT, 'tests/eval', f), 'utf8').trim().split('\n').map((l) => JSON.parse(l).text));

// the masking as it was (4.1.5, src/intent.js maskNames): the reference the links must reproduce exactly
const DEED_LEAD = String.raw`(?:^|[.!?;:,*(]\s*|\b(?:i|we|and|then|but|so|or|to)\s+)(?:\w+ly\s+)?`;
const AT_DEED = new RegExp(`${DEED_LEAD}$`, 'i');
function maskNames415(text, state) {
    const names = [
        ...Object.values(state.quests || {}).map((q) => q.title),
        ...Object.values(state.places || {}).map((p) => p.name),
        ...Object.values(state.entities || {}).map((e) => e.name),
        ...Object.values(state.objects || {}).map((o) => o.name),
    ].map((n) => String(n || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)).filter((w) => w.length >= 2);
    let out = String(text);
    for (const words of names.sort((a, b) => b.join(' ').length - a.join(' ').length)) {
        out = out.replace(new RegExp(String.raw`\b${words.join(String.raw`[^a-z0-9*]+`)}\b`, 'gi'), (name, at, all) => (AT_DEED.test(all.slice(0, at)) ? name : ' '));
    }
    return out;
}
// the router as it was (4.1.5, src/v4/turn.js routeTurn)
const V3_KINDS = new Set(['command', 'creation.class', 'creation.skills', 'creation.invalid', 'attack', 'engage', 'ambiguous_target', 'no_target', 'unknown_skill', 'stealth']);
function route415(state, text) {
    if (state.meta?.runtime !== 'v4') return 'v3';
    if (state.mode === 'creation' || state.entities.pc?.status === 'dead' || state.encounter || (state.pending_combat || []).length) return 'v3';
    return V3_KINDS.has(parseIntent(String(text ?? ''), state, content).kind) ? 'v3' : 'v4';
}

// every state of the three recorded runs, with every message of the runs, the gold and the interpreter corpora
const states = [];
for (const fx of RUNS) {
    const { steps } = await replayRun(content, fx);
    for (const x of steps.filter((y) => y.kind === 'player')) states.push(x.before);
}
const messages = [...new Set([...RUNS.flatMap((fx) => fx.turns.filter((t) => t.player !== undefined).map((t) => t.player)), ...gold.turns.map((t) => t.player), ...corpus])];

test('the links reproduce the 4.1.5 masking exactly: every recorded state against every recorded and corpus message', () => {
    assert.ok(states.length >= 50 && messages.length >= 300, `${states.length} states, ${messages.length} messages`);
    let n = 0;
    for (const s of states.filter((_, i) => i % 3 === 0)) {
        for (const m of messages) {
            assert.equal(linkEntities(m, s).masked, maskNames415(m, s), m);
            assert.equal(maskNames(m, s), maskNames415(m, s));
            n += 1;
        }
    }
    assert.ok(n > 5000, `${n} pairs`);
});

test('the IR routes exactly as the 4.1.5 router, and the V3 path is the mechanical acts', () => {
    for (const s of states.filter((_, i) => i % 2 === 0)) {
        for (const m of messages.filter((_, i) => i % 2 === 0)) {
            const ir = readTurn(m, s, content);
            assert.equal(ir.route, route415(s, m), m);
            assert.equal(routeTurn(s, content, m), ir.route);
            if (ir.route === 'v3' && !['fight', 'committed', 'creation', 'dead', 'campaign'].includes(ir.reason)) assert.ok(MECHANICAL.has(ir.acts[0].act), m);
            if (ir.route === 'v4') assert.deepEqual(ir.acts, [], 'story acts are the interpreter\'s');
        }
    }
});

test('Gnaw-Hide is a linked contract title, not a special case: no stealth act, the story path; a title in the verb\'s place is his deed', async () => {
    const fx = RUNS[2];
    const { steps } = await replayRun(content, fx);
    const s = steps.find((x) => x.kind === 'player' && Object.values(x.before.quests).some((q) => /Gnaw-Hide/.test(q.title))).before;
    const q = Object.values(s.quests).find((x) => /Gnaw-Hide/.test(x.title));
    const ir = readTurn('*i take the Cull the Gnaw Hide Boars at the Mill Road Turnips Quest and register it at the front desk*', s, content);
    assert.equal(ir.route, 'v4');
    assert.deepEqual(ir.acts, []);
    assert.deepEqual(ir.links.filter((l) => l.kind === 'quest'), [{ kind: 'quest', id: q.id, deed: false }]);
    // the same mechanism for any name: a contract "Kill the Rats" named where his own verb stands is what he does
    const rats = structuredClone(s);
    rats.quests['quest.rats'] = { ...q, id: 'quest.rats', title: 'Kill the Rats' };
    const kill = readTurn('I kill the rats', rats, content);
    assert.deepEqual(kill.links.filter((l) => l.id === 'quest.rats'), [{ kind: 'quest', id: 'quest.rats', deed: true }]);
    assert.notEqual(kill.intent.kind, 'narrative');
});

test('the record of every player message keeps one IR form: the parser\'s act on the V3 path, the interpreter\'s acts on the story path', async () => {
    const g = new Chat4(content, { listings: gold.board_generator.listings });
    await g.player('Warrior');
    const c = content.classes.get('warrior');
    await g.player(c.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    // the story path: what the interpreter answered, and what the agency guard removed, in the IR's form
    await g.player('*I walk to the guild. Tomorrow I\'ll pay the clerk.*', [
        { seq: 1, type: 'go', to: { new: 'the guild' }, quote: 'I walk to the guild' },
        { seq: 2, type: 'pay', to: { new: 'the clerk' }, amount_cp: null, for: null, quote: 'Tomorrow I\'ll pay the clerk' },
    ]);
    const story = g.record(g.chat.length - 1).ir;
    assert.equal(story.v, IR_VERSION);
    assert.equal(story.route, 'v4');
    assert.deepEqual(story.acts.map((a) => [a.act, a.source, a.dropped ?? null]), [['go', 'interpreter', null], ['pay', 'interpreter', 'plan']]);
    // the V3 path: the parser's act, which the engine resolved without reading the message again
    await g.reply('He walks to the guild.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [] });
    await g.player('#status');
    const cmd = g.record(g.chat.length - 2).ir;
    assert.equal(cmd.route, 'v3');
    assert.deepEqual(cmd.acts, [{ act: 'command', name: 'status', arg: '', source: 'parser' }]);
});

test('the V3 engine resolves the act it is given: one parse per message', () => {
    const g = new Chat4(content);
    const s = g.state();
    // creation: the parsed act decides, not a second reading of the text
    const given = parseIntent('Ranger', s, content);
    const t = playerTurn(s, content, 'Warrior', { intent: given });
    assert.equal(t.intent, given);
    assert.equal(t.state.entities.pc.sheet.class, 'ranger');
});
