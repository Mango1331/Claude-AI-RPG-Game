// Patch 8.4.3, the runner's report (docs/PATCH8_4_3_FINAL_DUNGEON_CONSISTENCY.md Teil B), against the automated Living
// Dungeon live test of 22.10.2026 09:00 (tests/v4/live_1022e.json, build .31): the guardian's id took the milestone's
// ("mon.glimmerdeep_grotto_c1_l1_e3" in the milestone table, no budget), and the open attack's "not performed" said every
// group knew of him, where the engine had booked none as unaware (the beetles' awareness was never booked at all).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, settled } from '../../tools/st_live/live/evaluator.mjs';
import { loadGuide } from '../../tools/st_live/live/guide.mjs';
import { openText } from '../../tools/st_live/live/run_live.mjs';
import { buildReport } from '../../tools/st_live/live/report.mjs';
import { WORLD } from '../../tools/st_live/live/profile.mjs';
import { foldChat } from '../../src/host.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1022e.json'), 'utf8'));
const FULL = loadGuide('patch_8_dungeon_full');
const QUEEN = 'mon.glimmerdeep_grotto_c1_l1_e3';

test('8.4.3 B1: the guardian milestone keeps its id; the guardian is its entityId; so does the older guardian_defeated', () => {
    const ev = evaluate(fx.messages, { guide: FULL });
    assert.deepEqual(ev.milestones.map((m) => m.id), FULL.milestones.map((m) => m.id), 'every milestone under its own id');
    const g = ev.milestones.find((m) => m.check === 'dungeon_guardian');
    assert.deepEqual([g.id, g.reached, g.at, g.turn, g.entityId, g.role, g.floor], ['dungeon_guardian', true, 53, 27, QUEEN, 'boss', 1]);
    const old = evaluate(fx.messages, { guide: loadGuide('guild_dungeon_loop') }).milestones.find((m) => m.check === 'guardian_defeated');
    assert.deepEqual([old.id, old.reached, old.entityId], ['guardian_defeated', true, QUEEN]);
    // the report: its name, reached, its budget
    const r = buildReport({
        runId: 'r', stub: false, guide: FULL, player: { type: 'scripted', steps: 3 }, end: { kind: 'incomplete', why: `the last milestone is reached; ${openText(ev)}` }, ev, calls: [],
        setup: { source: 'custom', card: 'Avereth V4', world: WORLD, greeting: 'profile', model: 'm', host: 'h' },
        imp: { preset: { name: 'P', mode: 'profile', unsaved: [], vsRepo: [] }, generation: {}, streaming: false, card: null, world: null, engineSettings: null, dropped: [], warnings: [], read: [] },
        git: { commit: 'abc', branch: 'b', dirty: [] }, build: '4.3.0-c.6.6.32', st: { version: '1.19.0', dir: '/st', port: 8123, startMs: 1000 }, browser: { name: 'chrome', version: '1', headless: true },
        turnsLog: [], playerLog: [], driverNotes: [], toasts: [], pageErrors: [], serverErrors: [], scan: { files: 3, hits: [] }, files: [], startedAt: 0, endedAt: 60000,
        protection: { unchanged: true, changedRead: [], tree: { same: true, added: [], removed: [], changed: [] }, files: 10 },
    });
    assert.match(r, /\| dungeon_guardian \| ja \| ✔ \| 27 \| 53 \| 15 \|/);
    assert.doesNotMatch(r, /\| mon\.glimmerdeep_grotto_c1_l1_e3 \|/);
});

test('8.4.3 B2: the open attack not performed says what the engine booked: no group with two members booked as unaware (the beetles: no awareness booked, the ooze aware, the queen alone); the run settled incomplete, 10/11', () => {
    const at18 = foldChat(fx.messages, 19).state.scene.awareness;
    assert.equal(at18['mon.glimmerdeep_grotto_c1_l1_e1_1'], undefined, 'the beetles: no awareness booked (the extractor\'s quote was refused)');
    const ev = evaluate(fx.messages, { guide: FULL });
    const m = ev.milestones.find((x) => x.id === 'dungeon_open_group_attack');
    assert.equal(m.reached, false);
    assert.equal(m.unavailable, 'no group of foes with at least two members booked as unaware was met on level 1 of loc.glimmerdeep_grotto');
    assert.doesNotMatch(m.unavailable, /knew of him/);
    assert.equal(settled(ev), true);
    assert.equal(openText(ev), `10/11 required reached; open: dungeon_open_group_attack (not performed: ${m.unavailable})`);
});
