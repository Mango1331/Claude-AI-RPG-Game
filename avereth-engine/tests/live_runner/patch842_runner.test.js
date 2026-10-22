// Patch 8.4.2, the runner (docs/PATCH8_4_2_FINAL_INTEGRATION.md Teil B), against the second real live test of
// 22.10.2026 07:49 (tests/v4/live_1022d.json, build .30): the player's "done" after 7 of 8 required milestones taken as
// done; after "#assign" the HUD of the reply before shown as the newest, and his own command without its "#"; and the
// guide of a full Living Dungeon expedition, each milestone from what the engine booked for the target Dungeon and level
// (the .28 run tests/v4/live_1022b.json and the .29 run tests/v4/live_1022c.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, finished, settled, openMilestones, CHECKS } from '../../tools/st_live/live/evaluator.mjs';
import { screenText } from '../../tools/st_live/live/players.mjs';
import { hudStale } from '../../tools/st_live/live/driver.mjs';
import { loadGuide, listGuides } from '../../tools/st_live/live/guide.mjs';
import { doneEnd, openText } from '../../tools/st_live/live/run_live.mjs';
import { buildReport } from '../../tools/st_live/live/report.mjs';
import { WORLD } from '../../tools/st_live/live/profile.mjs';
import { foldChat, rec } from '../../src/host.js';
import { loadProductContent } from '../helpers.js';
import { Chat4 } from '../v4/harness.js';
import { say } from '../v4/patch8_lib.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fixture = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4', `${f}.json`), 'utf8'));
const run2 = fixture('live_1022d');
const b28 = fixture('live_1022b');
const b29 = fixture('live_1022c');
const FULL = loadGuide('patch_8_dungeon_full');
const at = (ev, id) => ev.milestones.find((m) => m.id === id);

// ------------------------------------------------------------------------------------------------ B1: "done"
test('8.4.2 B1: the player\'s "done" of the second live test (7 of 8) is incomplete, open_group_attack named; "done" with every milestone is done', () => {
    const ev = evaluate(run2.messages, { guide: loadGuide('patch_8_4') });
    assert.equal(finished(ev), false);
    assert.deepEqual(openMilestones(ev), [{ id: 'open_group_attack', unavailable: null }]);
    assert.deepEqual(doneEnd(ev), { kind: 'incomplete', why: 'the player reported done; 7/8 required reached; open: open_group_attack' });
    // the .28 run reached every milestone of the base guide
    const all = evaluate(b28.messages, { guide: loadGuide('guild_dungeon_loop') });
    assert.equal(finished(all), true);
    assert.deepEqual(doneEnd(all), { kind: 'done', why: 'the player reported done; every required milestone is reached' });
});

test('8.4.2 B1: settled: the last milestone reached and the rest out of reach ends the run incomplete; a reachable open one does not', () => {
    const ms = (...xs) => ({ milestones: xs.map(([id, reached, unavailable]) => ({ id, required: true, reached, ...(unavailable ? { unavailable } : {}) })) });
    assert.equal(settled(ms(['a', true], ['b', false, 'no unaware group met'], ['c', true])), true);
    assert.equal(settled(ms(['a', true], ['b', false], ['c', true])), false, 'b could still be reached');
    assert.equal(settled(ms(['a', true], ['b', false, 'no unaware group met'], ['c', false])), false, 'the last milestone not yet');
    assert.equal(openText(ms(['a', true], ['b', false, 'no unaware group met'], ['c', true])), '2/3 required reached; open: b (not performed: no unaware group met)');
});

// ------------------------------------------------------------------------------------------------ B2: the HUD after a command
test('8.4.2 B2 (live #59–#62): after #assign the player sees his command with its "#", the System answer, and the HUD of the reply before marked as not updated', () => {
    const m = run2.messages;
    assert.equal(m[61].mes, '#assign VIT 2 WIL 2 INT 1');
    assert.deepEqual(rec(m[61]).events.filter((e) => e.t === 'stat.assigned').map((e) => [e.d.stat, e.d.amount]), [['VIT', 2], ['WIL', 2], ['INT', 1]]);
    assert.deepEqual(foldChat(m, 63).state.entities.pc.sheet.stats, { STR: 5, VIT: 7, AGI: 5, INT: 8, PER: 5, WIL: 9 }, 'booked');
    // the view as driver.mjs gives it: his own messages from their mes, the others as the page shows them
    const messages = [59, 60, 61, 62].map((i) => ({ mesid: i + 1, user: m[i].is_user, system: m[i].is_system && !m[i].is_user, name: m[i].is_user ? 'Alaric Red' : 'Avereth', text: m[i].is_user ? m[i].mes : m[i].mes.replace(/<details[\s\S]*$/, '').replace(/```/g, '').trim() }));
    const hudMesid = 61; // the narrator reply of turn 30
    assert.equal(hudStale(messages, hudMesid), true);
    assert.equal(hudStale(messages.slice(0, 2), hudMesid), false, 'under the newest reply');
    assert.equal(hudStale(messages, null), false);
    const view = { messages, hud: 'Alaric — L2 Mage · HP 5/85\nStats: STR 5 · VIT 5 · AGI 5 · INT 7 · PER 5 · WIL 7 · Free Stat Points 5', hudStale: true, toasts: [] };
    const s = screenText(view);
    assert.match(s, /\[YOU\]\n#assign VIT 2 WIL 2 INT 1\n\n\[SYSTEM \(Avereth\)\]\n\[SYSTEM \/\/ ASSIGN\]\nVIT \+2 -> 7\nWIL \+2 -> 9\nINT \+1 -> 8/);
    assert.match(s, /\[YOUR CHARACTER AND THE WORLD — the HUD of an EARLIER reply, NOT updated since: the System answer above is newer and what it says counts\]\nAlaric — L2 Mage/);
    assert.doesNotMatch(s, /the HUD under the newest reply/);
    assert.match(screenText({ ...view, hudStale: false }), /\[YOUR CHARACTER AND THE WORLD — the HUD under the newest reply\]/);
});

// ------------------------------------------------------------------------------------------------ C: the dungeon guide
test('8.4.2 C: the guide patch_8_dungeon_full: eleven required milestones of a Living Dungeon expedition, 60 turns; patch_8_4 kept', () => {
    assert.deepEqual(listGuides().sort(), ['current_test', 'guild_dungeon_loop', 'patch_8_4', 'patch_8_dungeon_full']);
    assert.deepEqual(FULL.chain, ['guild_dungeon_loop', 'patch_8_dungeon_full']);
    assert.deepEqual(FULL.milestones.map((m) => [m.id, m.required !== false]), [
        ['creation_complete', true], ['guild_registered_fee', true], ['dungeon_quest_active', true], ['dungeon_gate', true], ['dungeon_population', true], ['dungeon_group_fight', true],
        ['dungeon_open_group_attack', true], ['dungeon_guardian', true], ['dungeon_floor_cleared', true], ['dungeon_quest_ready', true], ['dungeon_quest_completed', true],
    ]);
    assert.ok(FULL.milestones.every((m) => CHECKS[m.check || m.id]));
    assert.equal(FULL.limits.maxTurns, 60);
    assert.ok(!FULL.milestones.some((m) => /#\w+/.test(m.goal)), 'goals, never commands');
    assert.match(FULL.brief, /without sneaking or hiding first/);
    assert.match(FULL.brief, /A contract outside any dungeon does not count for it/);
    assert.deepEqual(FULL.personas, loadGuide('guild_dungeon_loop').personas);
    assert.equal(loadGuide('patch_8_4').milestones.length, 9);
});

test('8.4.2 C: the second live test against the dungeon guide: registration paid twice (30 cp) is no registration milestone; a field cull counts for nothing of the dungeon', () => {
    const ev = evaluate(run2.messages, { guide: FULL });
    assert.equal(ev.dungeon, null, 'he never went into a Dungeon');
    assert.deepEqual(ev.milestones.filter((m) => m.reached).map((m) => m.id), ['creation_complete']);
    assert.match(ev.issues.find((i) => i.kind === 'registration_fee').text, /^registered for 30 cp in 2 payment\(s\) \(10 cp: paid the guild registration clerk for Guild registration; 20 cp: Guild registration fee\); the fee is 20 cp$/);
    assert.equal(at(ev, 'dungeon_quest_active').unavailable, undefined, 'the board had a Dungeon contract (the Upper Galleries clearance)');
    assert.equal(at(ev, 'dungeon_quest_ready').reached, false, 'the cull of the Reed Flats was READY, but outside any Dungeon');
    assert.equal(at(ev, 'dungeon_quest_completed').reached, false);
});

test('8.4.2 C: the .28 run (Glimmerdeep): contract, gate, population, READY and turn-in of its Dungeon contract; no group fight (four single fights), the open attack open (an unaware group was there)', () => {
    const ev = evaluate(b28.messages, { guide: FULL });
    assert.deepEqual(ev.dungeon, { root: 'loc.glimmerdeep_grotto', name: 'Glimmerdeep Grotto', floor: 1, quest: 'quest.cull_the_crystal_beetles_of_the_outer_grottos' });
    const m = Object.fromEntries(ev.milestones.map((x) => [x.id, x.reached ? x.at : x.unavailable ? 'n/a' : null]));
    assert.deepEqual(m, {
        creation_complete: 3, guild_registered_fee: 9, dungeon_quest_active: 13, dungeon_gate: 18, dungeon_population: 18, dungeon_group_fight: null,
        dungeon_open_group_attack: null, dungeon_guardian: null, dungeon_floor_cleared: null, dungeon_quest_ready: 28, dungeon_quest_completed: 34,
    });
    assert.deepEqual([at(ev, 'dungeon_gate').fee, at(ev, 'dungeon_gate').paid], [0, 0], 'contract-free entry');
    assert.equal(at(ev, 'dungeon_population').creatures, 4);
    assert.equal(at(ev, 'dungeon_quest_completed').payout, 60);
    assert.equal(settled(ev), false, 'the open attack could have been made: not out of reach');
});

test('8.4.2 C: the .29 run (Old Crown Catacombs): the three skeletons of one encounter fight together; the open attack not performed (they knew of him at entry); the robed thing is no population', () => {
    const ev = evaluate(b29.messages, { guide: FULL });
    assert.equal(ev.dungeon.root, 'loc.old_crown_catacombs');
    assert.deepEqual([at(ev, 'dungeon_population').at, at(ev, 'dungeon_population').slot, at(ev, 'dungeon_population').creatures], [20, 'bones', 3]);
    assert.deepEqual([at(ev, 'dungeon_group_fight').at, at(ev, 'dungeon_group_fight').foes], [20, 3]);
    assert.equal(at(ev, 'dungeon_open_group_attack').reached, false);
    assert.match(at(ev, 'dungeon_open_group_attack').unavailable, /no group of foes with at least two members booked as unaware was met on level 1/);
    assert.equal(at(ev, 'dungeon_guardian').reached, false, 'the robed thing killed at #36 was no slot of the engine');
});

test('8.4.2 C: the open Flame Lance at an unaware beetle replayed on this build: all four in the fight, one opening, A, B and C act on their own turns: the open group attack of the target level', async () => {
    const content = await loadProductContent();
    const g = new Chat4(content);
    g.chat = b28.messages.slice(0, 19).map((x) => structuredClone(x));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    await say(g, '*i flame Lance Beetle D', { type: 'use_skill', skill: 'mage.flame_lance', target: 'mon.glimmerdeep_grotto_c1_l1_e1_4', quote: 'i flame Lance Beetle D' });
    const ev = evaluate(g.chat, { guide: FULL });
    assert.deepEqual(at(ev, 'dungeon_open_group_attack').reached, true);
    assert.deepEqual([at(ev, 'dungeon_open_group_attack').at, at(ev, 'dungeon_open_group_attack').foes, at(ev, 'dungeon_open_group_attack').unaware, at(ev, 'dungeon_open_group_attack').acted], [19, 4, 4, 3]);
    assert.equal(at(ev, 'dungeon_group_fight').at, 19);
    // the same in the .28 run: four single fights, the others stayed out
    assert.equal(at(evaluate(b28.messages, { guide: FULL }), 'dungeon_open_group_attack').reached, false);
});

test('8.4.2 C: the report: an incomplete run names what is open and why, and its target Dungeon', () => {
    const ev = evaluate(b29.messages, { guide: FULL });
    const r = buildReport({
        runId: 'r', stub: false, guide: FULL, player: { type: 'scripted', steps: 3 }, end: { kind: 'incomplete', why: `the player reported done; ${openText(ev)}` }, ev, calls: [],
        setup: { source: 'custom', card: 'Avereth V4', world: WORLD, greeting: 'profile', model: 'm', host: 'h' },
        imp: { preset: { name: 'P', mode: 'profile', unsaved: [], vsRepo: [] }, generation: {}, streaming: false, card: null, world: null, engineSettings: null, dropped: [], warnings: [], read: [] },
        git: { commit: 'abc', branch: 'b', dirty: [] }, build: '4.3.0-c.6.6.31', st: { version: '1.19.0', dir: '/st', port: 8123, startMs: 1000 }, browser: { name: 'chrome', version: '1', headless: true },
        turnsLog: [], playerLog: [], driverNotes: [], toasts: [], pageErrors: [], serverErrors: [], scan: { files: 3, hits: [] }, files: [], startedAt: 0, endedAt: 60000,
        protection: { unchanged: true, changedRead: [], tree: { same: true, added: [], removed: [], changed: [] }, files: 10 },
    });
    assert.match(r, /- \*\*Ergebnis:\*\* \*\*unvollständig\*\*: nicht alle Pflicht-Etappen von der Engine nachgewiesen — the player reported done; 6\/11 required reached; open: dungeon_open_group_attack \(not performed: /);
    assert.match(r, /- \*\*Offen:\*\* dungeon_open_group_attack \(\*\*nicht durchgeführt\*\*: no group of foes with at least two members booked as unaware was met on level 1 of loc\.old_crown_catacombs\) · dungeon_guardian \(nicht erreicht\)/);
    assert.match(r, /- \*\*Ziel-Dungeon:\*\* Old Crown Catacombs, Ebene 1 \(Vertrag quest\.cull_the_burial_gallery_skeletons\)/);
    assert.match(r, /\| dungeon_open_group_attack \| ja \| – nicht durchgeführt: no group of foes with at least two members booked as unaware/);
});
