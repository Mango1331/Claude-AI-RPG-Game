// 4.3.0-c.6.6.24: the live test of 21.10.2026 00:53 in the Old Crown Catacombs (tests/v4/live_1021b.json, build c.6.6.23).
// 1. the restless skeletons were materialised on the rat body plan (Bite, rat numbers, pelt and tail as loot) and, as
//    "skittish", gave ground and hid turn after turn while Alaric closed in;
// 2. a surrender (#45) booked the skeleton's full Defeat XP, and its kill one turn later (#47) booked it again;
// 3. "*i Basic Attack D*" (#45) with D already dead was planned as an attack on C;
// 4. "the restless skeleton in the First Burial Gallery was destroyed" (#24) was read as a gallery killed: the narrator
//    was told the engine's fights had killed none.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { combatTruth } from '../../src/v4/combat_truth.js';
import { lootEvents } from '../../src/v4/loot.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1021b.json'), 'utf8'));
const C = 'mon.skel_worker_1';
const D = 'mon.skel_worker_2';

/** The live chat before message n, played on with a scripted planner (the campaign's path, C). */
function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    return rec(g.chat.findLast((m) => m.is_user));
}
const outcomeOf = (r) => r.events.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
const xpOf = (records) => records.flatMap((r) => r.events).filter((e) => e.t === 'xp.changed').reduce((n, e) => n + e.d.amount, 0);

test('combat 21.10: a restless skeleton is a skeleton, not a rat, even where the extractor chose "rat"; its strike and its loot fit it', async () => {
    const g = live(20);
    const { record } = await g.reply(fx.messages[20].mes, fx.extract20);
    const id = 'mon.skeleton_wallhand';
    const p = g.state().entities[id].profile;
    assert.equal(p.anchor, 'skeleton');
    assert.equal(p.attack.name, 'Bony strike');
    assert.ok(record.events.some((e) => e.t === 'entity.updated' && e.d.id === id && e.d.set.profile?.anchor === 'skeleton'));
    // what a slain one leaves: bones and grave dust, never a pelt or a tail
    const s = { turn: 12, entities: { pc: { id: 'pc', kind: 'pc', sheet: { coin_cp: 0, inventory: {}, equipment: {} } }, [id]: { id, status: 'dead', kind: 'creature', species: 'restless skeleton', descriptors: [], profile: { ...p } } }, objects: {}, scene: { present: ['pc'] } };
    const loot = lootEvents(s, content, { id: 'enc.t11', combatants: { pc: { id: 'pc', current: { hp: 80 } }, [id]: { id, current: { hp: 0 } } } }).lines.join(' ');
    assert.match(loot, /Restless Skeleton Bone/);
    assert.doesNotMatch(loot, /Pelt|Tail/);
    // a species the given anchor's own words name keeps it ("crystal beetle" as arthropod)
    const h = live(20);
    const beetle = structuredClone(fx.extract20);
    beetle.deltas[1] = { ...beetle.deltas[1], species: 'bone beetle', anchor: 'arthropod' };
    await h.reply(fx.messages[20].mes, beetle);
    assert.equal(h.state().entities[id].profile.anchor, 'arthropod');
});

test('combat 21.10: no temperament on the planner path: the skeleton Alaric strikes does not give ground and hide (the live #37 loop)', async () => {
    const g = live(37);
    const r = await say(g, fx.messages[37].mes, { type: 'use_skill', skill: 'mage.basic_attack', target: D, quote: 'i basic attack D' });
    const enc = r.events.find((e) => e.t === 'encounter.started')?.d.encounter;
    const mine = enc.log.filter((x) => x.actor === D);
    assert.ok(mine.length > 0);
    assert.ok(!mine.some((x) => x.dir === 'away' || x.kind === 'cover'), JSON.stringify(mine.map((x) => [x.kind, x.dir, x.why])));
    assert.ok(!mine.some((x) => /skittish/.test(x.why || '')));
});

test('combat 21.10: "*i Basic Attack D*" with D dead attacks no one: not C in its place; nothing spent, no XP', async () => {
    const g = live(45);
    assert.equal(g.state().entities[D].status, 'dead');
    const r = await say(g, fx.messages[45].mes, { type: 'use_skill', skill: 'mage.basic_attack', target: C, quote: 'i Basic Attack D' });
    assert.ok(!r.events.some((e) => e.t === 'encounter.started'), 'no fight opened on C');
    assert.equal(xpOf([r]), 0);
    assert.equal(r.plan.mapped.kind, 'no_target');
    assert.match((r.command?.panels || []).join(' '), /Restless Skeleton D is already dead; no one else is attacked in its place/);
    // naming C itself still attacks C
    const h = live(45);
    const rc = await say(h, '*i Basic Attack C*', { type: 'use_skill', skill: 'mage.basic_attack', target: C, quote: 'i Basic Attack C' });
    assert.ok(rc.events.some((e) => e.t === 'encounter.started'));
});

test('combat 21.10: a surrender gives no XP; the same skeleton killed afterwards gives its Defeat XP once (156, not 312)', async () => {
    const g = live(45);
    const xpBefore = g.state().entities.pc.sheet.xp;
    const surrender = await say(g, '*i Basic Attack C*', { type: 'use_skill', skill: 'mage.basic_attack', target: C, quote: 'i Basic Attack C' });
    const ended = surrender.events.find((e) => e.t === 'encounter.ended')?.d.summary;
    assert.ok(ended, 'the fight ends with its surrender');
    assert.deepEqual(ended.defeated, [C]);
    assert.equal(ended.xp_awarded, 0, 'a surrender is no defeat: 0 XP');
    assert.equal(xpOf([surrender]), 0);
    assert.equal(g.state().entities.pc.sheet.xp, xpBefore);
    await g.reply('The skeleton stays on its knees among the bones.', { expected: {}, deltas: [] });
    const kill = await say(g, fx.messages[47].mes, { type: 'use_skill', skill: 'mage.flame_lance', target: C, quote: 'i finish it off with a flame lance' });
    assert.equal(g.state().entities[C].status, 'dead');
    assert.equal(xpOf([kill]), 156, 'its Defeat XP, once');
    assert.equal(xpOf([surrender, kill]), 156);
});

test('combat 21.10: combat truth reads the skeleton\'s death in the gallery as the skeleton\'s (dead in the engine), not as a gallery killed', () => {
    const g = live(24);
    const s = g.state();
    assert.equal(s.entities['mon.skeleton_wallhand'].status, 'dead');
    const check = combatTruth(s, content);
    const item = fx.messages[24].extra.avereth.events.find((e) => e.t === 'delta.rejected' && e.d.rule === 'engine_owned_fact').d.item;
    assert.equal(check(`${item.s} ${item.p} ${item.o}`), null);
    assert.equal(check('the skeleton in the first burial gallery was destroyed'), null);
    // a count the engine contradicts is still refused
    assert.ok(check('Alaric destroyed four skeletons in the first burial gallery'));
    assert.ok(check('four restless skeletons were destroyed'));
});
