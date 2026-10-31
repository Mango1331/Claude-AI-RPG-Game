// Patch 4 (group combat and encounter continuity; live run of 18.10.2026, tests/v4/live_1018_weald.json): the four
// quarry wolves of #40, replayed through the product's host path on the product content, then the group's fights.
// Confirmed and fixed: a group named again was made again (four more wolves); a hostile by the group ("the wolves", the
// pack's own ref) committed no wolf at all; a wolf that had fought him came back "unaware" and gave an Ambush; the
// narrator was not told who stands by outside the fight. The rest pins what already held (ids, letters, HP, Initiative,
// First Strike, flight, XP, loot, the contract count) for a group.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadProductContent, ROOT, cumulativeXp } from '../helpers.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec } from '../../src/host.js';
import { buildContext } from '../../src/context.js';
import { renderHud } from '../../src/hud.js';
import { sceneHandle } from '../../src/v4/scene_handles.js';
import { defeatTally } from '../../src/v4/guild.js';
import { Chat4 } from './harness.js';

const content = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1018_weald.json'), 'utf8'));
const W = ['mon.crequarry_pack_1', 'mon.crequarry_pack_2', 'mon.crequarry_pack_3', 'mon.crequarry_pack_4'];
const LANCE = (target) => ({ type: 'use_skill', skill: 'mage.flame_lance', target, quote: 'i flame lance it' });

/** The live run up to #39, then #40 (the four wolves) with its recorded extraction on this build. */
async function pack() {
    const g = new Chat4(content, { greeting: fx.messages[0].mes });
    g.chat = fx.messages.slice(0, 40).map((m) => ({ mes: m.mes, is_user: m.is_user, is_system: m.is_system, extra: structuredClone(m.extra || {}) }));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    await g.reply(fx.messages[40].mes, fx.messages[40].extra.avereth.extraction.raw);
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    if (r.action === 'panels') g.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
    return r;
}
const outcome = (g) => rec(g.chat.findLast((m) => m.is_user))?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
const wolves = (s) => Object.values(s.entities).filter((e) => e.kind === 'creature' && e.species === 'wolf');
const at = (band) => W.map((who) => ({ seq: 0, type: 'position', who, band, cover: 'none' }));
/** Append engine events to the last record (a state the story reached before). */
function inject(g, events) {
    g.chat.findLast((m) => m.extra?.avereth?.events).extra.avereth.events.push(...events);
}
/** A reply that has these wolves at these bands and commits `by` (each delta numbered in order). */
// Patch 7.2B: a group's ref in hostile commits all of it only with scope all (the third argument)
const rush = (bands, by, all = null) => ({ expected: {}, deltas: [...Object.entries(bands).map(([who, band]) => ({ type: 'position', who, band, cover: 'none' })), { type: 'hostile', by, ...(all ? { scope: 'all', evidence: all } : {}) }].map((d, i) => ({ seq: i + 1, ...d })) });

// ------------------------------------------------------------------------------------------------ A: a group comes in
test('patch 4 (1, 4): four visible wolves are four individuals with their letters; named again as a group of four they stay four; a fifth one is one more', async () => {
    const g = await pack();
    let s = g.state();
    assert.deepEqual(wolves(s).map((e) => e.id), W);
    assert.deepEqual(W.map((id) => sceneHandle(s, content, id)), ['Wolf A', 'Wolf B', 'Wolf C', 'Wolf D']);
    assert.ok(W.every((id) => s.entities[id].profile && s.entities[id].group === 'cre.quarry_pack'), 'each with its own profile and its group');
    // live #42 shape: the same pack named again (more: false, or its own ref; without either the engine does not guess)
    for (const [ref, more] of [['wolves', false], ['cre.quarry_pack', null], ['wolves', null]]) {
        await say(g, '*i wait and watch*');
        await g.reply('The four wolves pace along the quarry rim.', { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref, species: 'wolf', anchor: 'wolf', desc: ['the quarry wolves'], count: 4, present: true, band: 'LONG', stronger: null, threat: null, more }] });
        s = g.state();
        assert.deepEqual(wolves(s).map((e) => e.id), W, `no four more wolves (${ref}, ${more})`);
    }
    await say(g, '*i wait and watch*');
    await g.reply('Five wolves now: another lopes out of the trees to join them.', { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'wolves', species: 'wolf', anchor: 'wolf', desc: ['the quarry wolves'], count: 5, present: true, band: 'LONG', stronger: null, threat: null, more: false }] });
    s = g.state();
    assert.equal(wolves(s).length, 5, 'only the one beyond the four is new');
    assert.equal(sceneHandle(s, content, wolves(s)[4].id), 'Wolf E');
});

test('patch 4 (2, 4): "all four wolves rush at him" by the group as a whole, by its ref or its kind, puts each wolf into the fight once, with its own place in the order', async () => {
    for (const by of [['the wolves'], ['cre.quarry_pack'], ['the pack'], W, ['wolves', 'the wolves']]) {
        const g = await pack();
        await say(g, '*i wait and watch*');
        await g.reply('All four wolves rush at him, snapping and lunging.', rush({ [W[0]]: 'ENGAGED', [W[1]]: 'ENGAGED', [W[2]]: 'SHORT', [W[3]]: 'SHORT' }, by, 'All four wolves rush at him'));
        const enc = g.state().encounter;
        assert.ok(enc, JSON.stringify(by));
        assert.deepEqual(Object.keys(enc.combatants).filter((id) => id !== 'pc').sort(), W, JSON.stringify(by));
        assert.deepEqual(W.map((id) => enc.combatants[id].label), ['Wolf A', 'Wolf B', 'Wolf C', 'Wolf D']);
        assert.equal(new Set(enc.order).size, 5, 'each once in the order');
        assert.equal(wolves(g.state()).length, 4, 'no new wolf');
    }
});

test('patch 4 (3): presence or kinship is no attack: two of four charge, one holds and one runs; "two wolves" of four is no one in particular', async () => {
    let g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('Two wolves charge; the third holds its ground and the fourth breaks away.', rush({ [W[0]]: 'SHORT', [W[1]]: 'SHORT' }, [W[0], W[1]]));
    let enc = g.state().encounter;
    assert.deepEqual(Object.keys(enc.combatants).filter((id) => id !== 'pc').sort(), [W[0], W[1]]);
    // the group named as a whole, with one of it shown doing something else in the same reply
    g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('The wolves come at him, all but the fourth, which turns and lopes off.', { expected: {}, deltas: [
        { seq: 1, type: 'intent', who: W[3], intent: 'flee' }, { seq: 2, type: 'hostile', by: ['the wolves'], scope: 'all', evidence: null }] });
    enc = g.state().encounter;
    assert.deepEqual(Object.keys(enc.combatants).filter((id) => id !== 'pc').sort(), W.slice(0, 3));
    // a number that is not the group's: nobody fights, and the narrator is told
    g = await pack();
    await say(g, '*i wait and watch*');
    const r = await g.reply('Two wolves rush him.', { expected: {}, deltas: [{ seq: 1, type: 'hostile', by: ['two wolves'] }] });
    assert.equal(g.state().encounter, null);
    assert.equal(wolves(g.state()).length, 4);
    assert.match(r.record.corrections.join('\n'), /The attack of "two wolves" in the last reply was not booked/);
});

// ------------------------------------------------------------------------------------------------ continuity, Initiative
test('patch 4 (5, 8, 9): a wolf that joins mid-fight takes its own place in the order; every combatant acts at most once a Round; the First Strike is its maker\'s action of Round 1', async () => {
    const g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('Two wolves rush at him.', rush({ [W[0]]: 'SHORT', [W[1]]: 'SHORT' }, [W[0], W[1]]));
    const records = [];
    await say(g, '*i flame lance it*', LANCE(W[0]));
    records.push(...outcome(g).records);
    const first = outcome(g).records[0];
    assert.equal(first.first_strike, true);
    await g.reply('Another wolf comes down off the rim at him.', rush({ [W[2]]: 'MEDIUM' }, [W[2]]));
    let enc = g.state().encounter;
    assert.ok(enc.order.includes(W[2]), 'the joiner has its place');
    assert.equal(enc.combatants[W[2]].label, 'Wolf C');
    for (let n = 0; n < 3 && g.state().encounter; n++) {
        enc = g.state().encounter;
        const t = Object.values(enc.combatants).find((c) => c.id !== 'pc' && !c.current.defeated && !c.current.escaped);
        await say(g, '*i flame lance it*', LANCE(t.id));
        records.push(...outcome(g).records);
        await g.reply('The fight goes on.', { expected: {}, deltas: [] });
    }
    // at most one ordinary action per combatant per Round (the First Strike counts as Round 1)
    const seen = new Set();
    for (const r of records.filter((x) => !x.reaction)) {
        const round = r.first_strike ? 1 : r.round;
        const key = `${round}:${r.actor}`;
        assert.ok(!seen.has(key), `${key} acted twice`);
        seen.add(key);
    }
    assert.ok(!records.some((r) => r.actor === W[0] && r.round === 1 && !r.first_strike), 'Wolf A used its Round 1 for the First Strike');
});

test('patch 4 (6, 7, 19): Wolf A dies, Wolf B stays wounded, Wolf C flees, Wolf D fights on; ids, letters and HP hold over the Rounds; the one that fled is not dead and gives no XP', async () => {
    const g = await pack();
    const p = g.state().entities[W[1]].profile;
    inject(g, [{ t: 'entity.updated', d: { id: W[1], set: { profile: { ...p, hp: 9 } } } }]);
    await say(g, '*i wait and watch*');
    await g.reply('All four wolves rush him.', rush({ [W[0]]: 'ENGAGED', [W[1]]: 'SHORT', [W[2]]: 'LONG', [W[3]]: 'SHORT' }, W));
    assert.equal(g.state().encounter.combatants[W[1]].current.hp, 9, 'a wounded wolf comes in wounded');
    await say(g, '*i flame lance it*', LANCE(W[0]));
    await g.reply('Wolf A goes down; Wolf C turns tail for the trees.', { expected: {}, deltas: [{ seq: 1, type: 'intent', who: W[2], intent: 'flee' }] });
    for (let n = 0; n < 3 && g.state().encounter; n++) {
        await say(g, '*i back away*', { type: 'move', dir: 'away', target: null, quote: 'i back away' });
        await g.reply('He gives ground.', { expected: {}, deltas: [] });
        const enc = g.state().encounter;
        if (!enc) break;
        assert.deepEqual(W.map((id) => enc.combatants[id].label), ['Wolf A', 'Wolf B', 'Wolf C', 'Wolf D'], 'no relettering');
        assert.equal(enc.combatants[W[0]].current.defeated, true, 'the dead one stays dead');
        assert.ok(!(outcome(g).records || []).some((r) => r.actor === W[0]), 'a dead wolf does not act');
        assert.equal(enc.combatants[W[1]].current.hp, 9, 'the wounded one keeps its wound');
    }
    const s = g.state();
    const c = s.encounter?.combatants[W[2]];
    assert.ok(c ? c.current.escaped : s.entities[W[2]].fled, 'Wolf C got away');
    assert.notEqual(s.entities[W[2]].status, 'dead');
    assert.equal(s.entities[W[0]].status, 'dead');
    assert.notEqual(s.entities[W[3]].status, 'dead');
    if (s.encounter) assert.ok(!s.encounter.defeated.includes(W[2]), 'fled is no defeat');
});

// ------------------------------------------------------------------------------------------------ First Strike, Ambush
test('patch 4 (12): a wolf that fought him comes back and the story calls it unaware: no Ambush, the narrator is told; after a long while, or by his stealth, a real surprise stays possible', async () => {
    const g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('A wolf rushes at him.', rush({ [W[0]]: 'MEDIUM' }, [W[0]]));
    await say(g, '*i run away*', { type: 'flee', quote: 'i run away' });
    assert.equal(outcome(g).ended?.pc_escaped, true);
    await g.reply('He runs.', { expected: {}, deltas: [] });
    let s = g.state();
    assert.ok(s.entities[W[0]].wary, 'the wolf he fought stays wary of him');
    assert.ok(W.slice(1).every((id) => s.entities[id].wary), 'and so do those that watched the fight');
    assert.equal(s.entities[W[0]].profile.hp, s.entities[W[0]].profile.max_hp, 'not killed, not removed');
    await say(g, '*i creep back to the quarry*');
    const back = { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'wolf', species: 'wolf', anchor: 'wolf', desc: ['lean grey-brown wolf'], count: 1, present: true, band: 'MEDIUM', stronger: null, threat: null }, { seq: 2, type: 'aware', who: 'wolf', level: 'unaware' }] };
    const r = await g.reply('The wolf is back at the quarry mouth, nose down, unaware of him.', back);
    s = g.state();
    assert.ok(s.scene.present.includes(W[0]), 'the same wolf comes back, not a new one');
    assert.notEqual(s.scene.awareness[W[0]], 'unaware');
    assert.match(r.record.corrections.join('\n'), /did not lose track of Alaric/);
    await say(g, '*i flame lance it*', LANCE(W[0]));
    let o = outcome(g);
    assert.doesNotMatch(o.started?.reason || '', /true Ambush/);
    assert.ok(!o.records.some((x) => x.opening), 'no Opening Action');
    // a new surprise after a long while is the story's again
    const h = await pack();
    await say(h, '*i wait and watch*');
    await h.reply('A wolf rushes at him.', rush({ [W[0]]: 'MEDIUM' }, [W[0]]));
    await say(h, '*i run away*', { type: 'flee', quote: 'i run away' });
    await h.reply('He runs.', { expected: {}, deltas: [] });
    inject(h, [{ t: 'time.advanced', d: { minutes: (content.rules.combat.wary_min ?? 360) + 60 } }]);
    await say(h, '*i creep back to the quarry*');
    await h.reply('The wolf is back at the quarry mouth, nose down, unaware of him.', back);
    assert.equal(h.state().scene.awareness[W[0]], 'unaware');
    await say(h, '*i flame lance it*', LANCE(W[0]));
    o = outcome(h);
    assert.ok(o.records[0].opening, 'a true Ambush again');
});

// ------------------------------------------------------------------------------------------------ flight
test('patch 4 (16, 17, 18): his flight from two wolves in melee is one escape roll against both; failed, the fight goes on; made, both stay as they are, alive and in the world', async () => {
    const g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('Two wolves are on him.', rush({ [W[0]]: 'ENGAGED', [W[1]]: 'ENGAGED' }, [W[0], W[1]]));
    const enc = g.state().encounter;
    await say(g, '*i run*', { type: 'flee', quote: 'i run' });
    const o = outcome(g);
    const flee = o.records.find((r) => r.actor === 'pc' && r.kind === 'flee');
    assert.ok(flee.escape, 'held in melee: a roll');
    const pcInit = enc.combatants.pc.fixed.init;
    const best = Math.max(enc.combatants[W[0]].fixed.init, enc.combatants[W[1]].fixed.init);
    assert.equal(flee.escape.chance, Math.max(15, Math.min(85, 50 + 5 * (pcInit - best) - 10)), 'the fastest holder, -10 for the second');
    await g.reply('He tries to break away.', { expected: {}, deltas: [] });
    const s = g.state();
    if (flee.escaped) {
        assert.equal(s.encounter, null);
        for (const id of [W[0], W[1]]) assert.ok(s.entities[id].status !== 'dead' && s.entities[id].profile.hp > 0 && !s.scene.present.includes(id));
    } else {
        assert.ok(s.encounter, 'a failed flight leaves the fight running');
        assert.match(flee.why, /does not get away/);
    }
});

// ------------------------------------------------------------------------------------------------ rewards
test('patch 4 (21, 22, 23): a group fight pays each kill once, loots each body once, and the contract counts the kills, not the one that ran', async () => {
    const g = await pack();
    inject(g, [{ t: 'quest.set', d: { quest: { id: 'quest.wolves', title: 'Wolves at the Quarry', kind: 'guild_contract', status: 'active', rank: 'Novice', level: 1, payout_cp: 120, objectives: [{ id: 'o1', verb: 'DEFEAT', what: 'wolves', qty: 4, status: 'open' }], proof: [], details: [], notes: [], history: [{ turn: 1, minute: 0, status: 'active' }], source: {} } } }]);
    const xp0 = cumulativeXp(g.state().entities.pc.sheet, content);
    await say(g, '*i wait and watch*');
    await g.reply('Three wolves come at him; the fourth hangs back.', rush({ [W[0]]: 'ENGAGED', [W[1]]: 'SHORT', [W[2]]: 'LONG' }, [W[0], W[1], W[2]]));
    await say(g, '*i flame lance it*', LANCE(W[0]));
    // B1 (.130): the historical run is evaluated under the current rules (its wolves take the quarry's area levels);
    // the Defeat XP each wolf locked at the fight's start is what a kill pays
    const locked = Object.fromEntries(W.map((id) => [id, g.state().encounter?.combatants[id]?.fixed.defeat_xp]));
    await g.reply('Wolf C breaks and runs.', { expected: {}, deltas: [{ seq: 1, type: 'intent', who: W[2], intent: 'flee' }] });
    let ended = null;
    for (let n = 0; n < 6 && g.state().encounter; n++) {
        const b = g.state().encounter.combatants[W[1]];
        if (!b.current.defeated) await say(g, '*i flame lance it*', LANCE(W[1]));
        else await say(g, '*i back away*', { type: 'move', dir: 'away', target: null, quote: 'i back away' });
        ended = outcome(g).ended || ended;
        await g.reply('The fight goes on.', { expected: {}, deltas: [] });
    }
    const s = g.state();
    const dead = W.filter((id) => s.entities[id].status === 'dead');
    const xp = cumulativeXp(s.entities.pc.sheet, content) - xp0;
    assert.ok(ended, 'the fight is over');
    assert.deepEqual(ended.defeated.slice().sort(), dead.slice().sort(), 'XP for the kills only');
    assert.deepEqual(ended.escaped, [W[2]], 'the one that ran escaped');
    assert.equal(s.entities[W[2]].fled?.encounter !== undefined, true, 'driven off, not dead');
    assert.equal(xp, ended.xp_awarded, 'once');
    assert.deepEqual(dead.slice().sort(), [W[0], W[1]], 'A and B killed');
    assert.ok(locked[W[0]] > 0 && locked[W[1]] > 0 && locked[W[2]] > 0, JSON.stringify(locked));
    assert.equal(ended.xp_awarded, locked[W[0]] + locked[W[1]], 'each kill its locked configured Defeat XP, the runner none');
    const pelts = Object.values(s.objects).filter((o) => o.holder?.entity === 'pc' && /wolf pelt/i.test(o.name)).reduce((a, o) => a + (o.qty ?? 1), 0);
    assert.equal(pelts, dead.length, 'one pelt per body, no doubles');
    const tally = defeatTally(s, content, s.quests['quest.wolves'])[0];
    assert.equal(tally.killed, dead.length);
    assert.ok(tally.done < 4, 'a pack partly beaten is no culled pack');
    assert.ok(!dead.includes(W[3]), 'the one that hung back is no kill');
});

// ------------------------------------------------------------------------------------------------ narrator, HUD
test('patch 4 (24): the narrator\'s combat block and the HUD carry every fighter, and the wolves outside the fight as outside it', async () => {
    const g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('Two wolves rush at him; the others watch from the rim.', rush({ [W[0]]: 'SHORT', [W[1]]: 'SHORT' }, [W[0], W[1]]));
    const s = g.state();
    const text = buildContext(s, content, { input: '*i flame lance Wolf A*', lastReply: '' }).text;
    const block = text.slice(text.indexOf('COMBAT'));
    assert.match(block, /Wolf A[^\n]*: L\d/);
    assert.match(block, /Wolf B[^\n]*: L\d/);
    assert.match(block, /Here but NOT in the fight: Wolf C \(LONG\), Wolf D \(LONG\): no attack and no damage from them this turn/);
    const hud = renderHud(s, content, 'open');
    for (const w of ['Wolf A', 'Wolf B', 'Wolf C', 'Wolf D']) assert.match(hud, new RegExp(w));
    assert.match(hud, /Visible · not in the fight yet/);
});

// ------------------------------------------------------------------------------------------------ review of c.6.6.12
const wolfNew = (ref, count, more, band = 'LONG') => ({ seq: 1, type: 'creature.new', ref, species: 'wolf', anchor: 'wolf', desc: ['lean grey wolves'], count, present: true, band, stronger: null, threat: null, more });

test('review 1: a fifth wolf that joins the quarry pack under another ref is one of the pack; the pack\'s ref later means all five', async () => {
    const g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('A fifth wolf lopes out of the trees and joins the four.', { expected: {}, deltas: [wolfNew('wolves', 5, false)] });
    let s = g.state();
    assert.equal(wolves(s).length, 5);
    assert.deepEqual(wolves(s).map((e) => e.group), Array(5).fill('cre.quarry_pack'), 'the newcomer joins the pack it came to');
    for (const by of [['cre.quarry_pack'], ['the pack']]) {
        const h = await pack();
        await say(h, '*i wait and watch*');
        await h.reply('A fifth wolf lopes out of the trees and joins the four.', { expected: {}, deltas: [wolfNew('wolves', 5, false)] });
        await say(h, '*i wait and watch*');
        await h.reply('The whole pack rushes him.', { expected: {}, deltas: [{ seq: 1, type: 'hostile', by, scope: 'all', evidence: 'The whole pack rushes him' }] });
        s = h.state();
        assert.equal(Object.keys(s.encounter?.combatants || {}).filter((id) => id !== 'pc').length, 5, JSON.stringify(by));
    }
});

test('review 2: a second, separate pair of wolves beside the four stays two more; they are told apart; with nothing to tell them apart the engine asks the story instead of guessing', async () => {
    const g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('Two more wolves, a pair from the eastern ridge, come down apart from the quarry pack.', { expected: {}, deltas: [wolfNew('east pair', 2, true, 'MEDIUM')] });
    let s = g.state();
    assert.equal(wolves(s).length, 6, 'four and two, none merged');
    const pair = wolves(s).filter((e) => e.group === 'east pair').map((e) => e.id);
    assert.equal(pair.length, 2);
    assert.ok(pair.every((id) => !W.includes(id)));
    assert.deepEqual(wolves(s).map((e) => sceneHandle(s, content, e.id)), ['Wolf A', 'Wolf B', 'Wolf C', 'Wolf D', 'Wolf E', 'Wolf F']);
    assert.ok(buildContext(s, content, { input: 'x', lastReply: '' }).text.length, 'the context builds');
    // the pair by its ref: only the pair; "the wolves" over two packs: no one in particular, the narrator is told
    await say(g, '*i wait and watch*');
    await g.reply('The eastern pair rushes him.', { expected: {}, deltas: [{ seq: 1, type: 'hostile', by: ['east pair'], scope: 'all', evidence: 'The eastern pair rushes him' }] });
    s = g.state();
    assert.deepEqual(Object.keys(s.encounter.combatants).filter((id) => id !== 'pc').sort(), pair.slice().sort());
    const h = await pack();
    await say(h, '*i wait and watch*');
    await h.reply('Two more wolves come down from the eastern ridge.', { expected: {}, deltas: [wolfNew('east pair', 2, true, 'MEDIUM')] });
    await say(h, '*i wait and watch*');
    let r = await h.reply('The wolves rush him.', { expected: {}, deltas: [{ seq: 1, type: 'hostile', by: ['the wolves'], scope: 'all', evidence: 'The wolves rush him' }] });
    assert.equal(h.state().encounter, null);
    assert.match(r.record.corrections.join('\n'), /The attack of "the wolves" in the last reply was not booked/);
    // the extractor says neither "others" nor "the same": nothing is merged and nothing doubled; the narrator is told
    const k = await pack();
    await say(k, '*i wait and watch*');
    r = await k.reply('Two wolves come down from the ridge.', { expected: {}, deltas: [wolfNew('wolves', 2, null, 'MEDIUM')] });
    s = k.state();
    assert.equal(wolves(s).length, 4);
    assert.ok(r.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'group_unclear'));
    assert.match(r.record.corrections.join('\n'), /could not tell whether they are those already here or others/);
});

test('review 3: a group shown as no foe can still turn on him as a group once the story gives it cause; the envelope decides each, and presence alone starts nothing', async () => {
    const g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('Three farm dogs nose around the quarry track, wagging.', { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'farm dogs', species: 'farm dog', anchor: 'wolf', desc: ['shaggy farm dogs'], count: 3, present: true, band: 'SHORT', stronger: null, threat: false, more: true }] });
    let s = g.state();
    const dogs = Object.values(s.entities).filter((e) => e.species === 'farm dog').map((e) => e.id);
    assert.equal(dogs.length, 3);
    assert.ok(dogs.every((id) => s.entities[id].threat === false));
    // presence: nothing
    await say(g, '*i wait and watch*');
    await g.reply('The dogs sniff at his boots.', { expected: {}, deltas: [] });
    assert.equal(g.state().encounter, null);
    // he gives them cause; the story has the group turn on him
    await say(g, '*i throw a stone at the dogs*');
    await g.reply('The stone cracks off a flank; all three farm dogs turn on him, snarling, and lunge at Alaric.', { expected: {}, deltas: [{ seq: 1, type: 'hostile', by: ['farm dogs'], scope: 'all', evidence: 'all three farm dogs turn on him' }] });
    s = g.state();
    assert.deepEqual(Object.keys(s.encounter?.combatants || {}).filter((id) => id !== 'pc').sort(), dogs.slice().sort());
    assert.ok(W.every((id) => !s.encounter.combatants[id]), 'the wolves are no part of it');
});

// ------------------------------------------------------------------------------------------------ last review: more
/** The quarry pack (four, group cre.quarry_pack) and the eastern pair (two, group east pair), side by side. */
async function twoPacks() {
    const g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('Two more wolves, a pair from the eastern ridge, come down apart from the quarry pack.', { expected: {}, deltas: [wolfNew('east pair', 2, true, 'MEDIUM')] });
    const s = g.state();
    const pair = wolves(s).filter((e) => e.group === 'east pair').map((e) => e.id);
    return { g, pair };
}
const groupsOf = (s) => Object.fromEntries(wolves(s).map((e) => [e.id, e.group ?? null]));

test('last review 1: "more:false" with the eastern pair\'s own ref means the pair, never two of the quarry pack; a hostile in the same reply strikes the pair; without a ref that names one group, more:false over two groups picks no one', async () => {
    const { g, pair } = await twoPacks();
    const before = groupsOf(g.state());
    await say(g, '*i wait and watch*');
    const r = await g.reply('The eastern pair circles closer and rushes him.', { expected: {}, deltas: [
        { ...wolfNew('east pair', 2, false, 'SHORT'), seq: 1 }, { seq: 2, type: 'position', who: 'east pair', band: 'SHORT', cover: 'none', scope: 'all' }, { seq: 3, type: 'hostile', by: ['east pair'], scope: 'all' }] });
    let s = g.state();
    // the pair's ref in the same reply is the pair: the quarry wolves stay where they were and out of the fight
    assert.deepEqual(W.map((id) => s.scene.positions[id]?.band), ['LONG', 'LONG', 'LONG', 'LONG'], 'no quarry wolf was moved as one of the pair');
    assert.deepEqual(groupsOf(s), before, 'the same six ids in the same groups');
    assert.deepEqual(Object.keys(s.encounter?.combatants || {}).filter((id) => id !== 'pc').sort(), pair.slice().sort(), 'the hostile strikes the pair');
    assert.ok(!r.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'group_unclear'));
    // the same words without the pair's ref: two groups of wolves here, "the same ones" is no one in particular
    const h = await twoPacks();
    const b2 = groupsOf(h.g.state());
    await say(h.g, '*i wait and watch*');
    const r2 = await h.g.reply('Two wolves pace the rim.', { expected: {}, deltas: [wolfNew('wolves', 2, false, 'MEDIUM')] });
    s = h.g.state();
    assert.deepEqual(groupsOf(s), b2, 'nothing chosen, nothing made');
    assert.ok(r2.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'group_unclear'));
    assert.match(r2.record.corrections.join('\n'), /could not tell which of the groups here they are/);
});

test('last review 2: one wolf that joins the quarry pack (its ref, more:true) is a new individual of the pack; the pack\'s ref then means all five; a lone newcomer joins no pack', async () => {
    let g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('A fifth wolf appears and joins the existing quarry pack.', { expected: {}, deltas: [wolfNew('cre.quarry_pack', 1, true)] });
    let s = g.state();
    const fifth = wolves(s).map((e) => e.id).filter((id) => !W.includes(id));
    assert.deepEqual(fifth, ['mon.crequarry_pack_5'], 'one new individual, numbered after the pack');
    assert.deepEqual(groupsOf(s), Object.fromEntries([...W, ...fifth].map((id) => [id, 'cre.quarry_pack'])), 'of the quarry pack');
    await say(g, '*i wait and watch*');
    const rr = await g.reply('The whole pack rushes him.', { expected: {}, deltas: [{ seq: 1, type: 'hostile', by: ['cre.quarry_pack'], scope: 'all', evidence: 'The whole pack rushes him' }] });
    assert.ok(!rr.record.events.some((e) => e.t === 'delta.rejected'), 'nobody refused as "a group held as one creature"');
    assert.deepEqual(Object.keys(g.state().encounter.combatants).filter((id) => id !== 'pc').sort(), [...W, ...fifth].sort());
    // the joiner and the pack's attack in one reply: the pack's ref is the whole pack, the newcomer included
    g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('A fifth wolf bursts from the brush to join the pack, and all five rush him.', { expected: {}, deltas: [
        { ...wolfNew('cre.quarry_pack', 1, true, 'SHORT'), seq: 1 }, { seq: 2, type: 'hostile', by: ['cre.quarry_pack'], scope: 'all' }] });
    s = g.state();
    assert.equal(Object.keys(s.encounter.combatants).filter((id) => id !== 'pc').length, 5);
    // a newcomer under a ref of its own joins no pack: the pack's ref still means the four
    g = await pack();
    await say(g, '*i wait and watch*');
    await g.reply('A lone grey wolf watches from the far rocks, no part of the pack.', { expected: {}, deltas: [wolfNew('lone wolf', 1, true)] });
    s = g.state();
    const lone = wolves(s).map((e) => e.id).filter((id) => !W.includes(id));
    assert.equal(lone.length, 1);
    assert.notEqual(s.entities[lone[0]].group, 'cre.quarry_pack');
    await say(g, '*i wait and watch*');
    await g.reply('The pack rushes him.', { expected: {}, deltas: [{ seq: 1, type: 'hostile', by: ['cre.quarry_pack'], scope: 'all', evidence: 'The pack rushes him' }] });
    assert.deepEqual(Object.keys(g.state().encounter.combatants).filter((id) => id !== 'pc').sort(), W);
});
