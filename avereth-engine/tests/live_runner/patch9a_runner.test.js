// Patch 9A, the runner (docs/PATCH9A_STARTING_CLASSES.md): the report names the campaign's ruleset and the character it
// made. A recorded run of before (no ruleset: 1, legacy) and a new campaign (ruleset 2) with the guide's Mage.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate } from '../../tools/st_live/live/evaluator.mjs';
import { loadGuide } from '../../tools/st_live/live/guide.mjs';
import { buildReport } from '../../tools/st_live/live/report.mjs';
import { FALLBACK_GREETING, WORLD } from '../../tools/st_live/live/profile.mjs';
import { loadProductContent } from '../helpers.js';
import { campaign } from '../v4/patch8_lib.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GUIDE = loadGuide('patch_8_dungeon_full');
const report = (ev) => buildReport({
    runId: 'r', stub: false, guide: GUIDE, player: { type: 'scripted', steps: 2 }, end: { kind: 'limit', why: 'x' }, ev, calls: [],
    setup: { source: 'custom', card: 'Avereth V4', world: WORLD, greeting: 'profile', model: 'm', host: 'h' },
    imp: { preset: { name: 'P', mode: 'profile', unsaved: [], vsRepo: [] }, generation: {}, streaming: false, card: null, world: null, engineSettings: null, dropped: [], warnings: [], read: [] },
    git: { commit: 'abc', branch: 'b', dirty: [] }, build: '4.3.0-c.6.6.33', st: { version: '1.19.0', dir: '/st', port: 8123, startMs: 1000 }, browser: { name: 'chrome', version: '1', headless: true },
    turnsLog: [], playerLog: [], driverNotes: [], toasts: [], pageErrors: [], serverErrors: [], scan: { files: 3, hits: [] }, files: [], startedAt: 0, endedAt: 60000,
    protection: { unchanged: true, changedRead: [], tree: { same: true, added: [], removed: [], changed: [] }, files: 10 },
});

test('9A runner: a new campaign is ruleset 2 and its Mage with Flame Lance + Blink is reported as such; the fallback greeting names the three classes', async () => {
    const g = await campaign(await loadProductContent(), { cls: 'Mage', skills: 'Flame Lance + Blink' });
    const ev = evaluate(g.chat, { guide: GUIDE });
    assert.deepEqual(ev.character, { ruleset: 2, class: 'mage', skills: ['mage.flame_lance', 'mage.blink'] });
    assert.equal(ev.milestones.find((m) => m.id === 'creation_complete').reached, true);
    assert.match(report(ev), /- \*\*Charakter:\*\* mage \(mage\.flame_lance, mage\.blink\) · Regelstand 2 \(Warrior, Mage, Rogue\)/);
    assert.match(FALLBACK_GREETING, /choose a Base Class \(Warrior, Mage, Rogue\)\./);
});

test('9A runner: a run recorded before Patch 9A is ruleset 1 (legacy) in the report', () => {
    const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1022e.json'), 'utf8'));
    const ev = evaluate(fx.messages, { guide: GUIDE });
    assert.equal(ev.character.ruleset, 1);
    assert.equal(ev.character.class, 'mage');
    assert.match(report(ev), /· Regelstand 1 \(Legacy, fünf Klassen\)/);
});
