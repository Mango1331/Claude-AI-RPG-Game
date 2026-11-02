import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { assessFinalIntegrity } from '../../tools/st_live/live/evaluator.mjs';
const c = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(new URL('../v4/fixtures/batch23_fix150.json', import.meta.url)));

test('150 runner final check folds the saved chat; valid completion remains done', () => {
    const check = assessFinalIntegrity(fx.mage.chat, c, { kind: 'done', why: null });
    assert.equal(check.end.kind, 'done');
    assert.deepEqual(check.integrity, { foldErrors: [], problems: [], ok: true });
});

test('150 an original dangling loc-fact cannot be reported as a clean completion; provider/manual ends stay distinct', () => {
    const chat = structuredClone(fx.warrior.chat);
    chat.push({ is_user: false, mes: 'The holt is quiet.', extra: { avereth: { events: [fx.invalidFact] } } });
    const check = assessFinalIntegrity(chat, c, { kind: 'done', why: null });
    assert.equal(check.end.kind, 'integrity_failed');
    assert.equal(check.end.original_kind, 'done');
    assert.equal(check.integrity.ok, false);
    assert.equal(check.integrity.problems.length, 1);
    for (const kind of ['repeated_model_failure', 'harness', 'defeat']) {
        const r = assessFinalIntegrity(chat, c, { kind, why: 'original cause' });
        assert.deepEqual(r.end, { kind, why: 'original cause' });
        assert.equal(r.integrity.ok, false);
    }
});
