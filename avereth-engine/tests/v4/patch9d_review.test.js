import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { classFixture } from './patch9d_fixtures.js';
import { skillOf } from '../../src/content.js';
import { developSkill } from '../../src/skill_composer.js';
import { defineSkill } from '../../src/skills.js';
import { applyEvent } from '../../src/state.js';
import { classQuality, developmentFeats, fightFeats } from '../../src/v4/feats.js';
import { classDrafts, offerClass, acceptClass, classLines } from '../../src/v4/class_growth.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();

test('9D review: repeated accepted Skill evolutions remain visible but give at most one rarity point, including old records', async () => {
    const g = await classFixture(content), s = g.state();
    let base = 'warrior.heavy_slash';
    for (const [step, from] of [['crowd', base], ['riposte', null], ['layered', 'warrior.guard']]) {
        const def = developSkill(s, content, skillOf(content, from || base, s), step, { origin: { kind: 'evolution' } }).def;
        assert.ok(def);
        const defined = defineSkill(s, content, def); assert.deepEqual(defined.errors, []);
        defined.events.forEach((e) => applyEvent(s, e));
        const event = { t: 'skill.evolved', d: { id: 'pc', from: from || base, to: def.id, prof: 5, pp: 0 } };
        applyEvent(s, event);
        developmentFeats(s, content, [event]).forEach((e) => applyEvent(s, e));
        base = def.id;
    }
    assert.equal(Object.values(s.career.feats).filter((f) => f.kind === 'development').length, 3);
    assert.equal(classQuality(s, content), 'normal');
    // Existing .55 contexts must also collapse for rarity, without rewriting their visible deeds.
    const saved = structuredClone(s);
    assert.equal(classQuality(saved, content), 'normal');
    for (const [kind, context] of [['survival', 'wolf@field'], ['odds', 'boar@wood']]) {
        applyEvent(s, { t: 'career.recorded', d: { source: context, feats: [{ key: context, kind, context, facts: {} }] } });
    }
    assert.equal(classQuality(s, content), 'rare', 'development still contributes alongside exceptional fights');
});

test('9D review: a wounded returning foe uses this encounter damage, requiring a positive substantial personal share', async () => {
    const g = await classFixture(content), s = g.state();
    const enc = { id: 'enc.returning', defeated: ['wolf'], career: { damage: { wolf: 40 }, personal: { wolf: 40 } },
        combatants: { pc: { fixed: { level: 14 }, current: { hp: 100 } },
            wolf: { side: 'hostile', fixed: { max_hp: 100, level: 14 }, current: { hp: 0 } } } };
    const result = () => fightFeats(s, content, enc)[0].d.stats;
    assert.equal(result().foes_defeated, 1);
    assert.equal(result().fights_won, 1);
    enc.career.personal.wolf = 19; assert.equal(result().foes_defeated, 0, 'ally damage does not become personal');
    enc.career.personal.wolf = 20; assert.equal(result().foes_defeated, 1, 'half of actual damage qualifies');
    enc.career.personal.wolf = 0; enc.career.damage.wolf = 0;
    assert.equal(result().foes_defeated, 0, 'no credit for an untracked death');
});

test('9D review: booking, validation and class panels follow content thresholds rather than baked-in Level 15/30', async () => {
    const c = structuredClone(content); c.rules.class_growth.level = 14;
    const g = await classFixture(c), s = g.state();
    const offered = offerClass(s, c, classDrafts(s, c));
    offered.events.forEach((e) => applyEvent(s, e));
    assert.deepEqual(validateState(s, c), [], 'pending choice uses the configured threshold');
    const accepted = acceptClass(s, c, offered.offers[0].id);
    assert.equal(accepted.refuse, undefined);
    accepted.events.forEach((e) => applyEvent(s, e));
    assert.deepEqual(validateState(s, c), []);
    c.rules.class_growth.level = 16;
    const pending = await classFixture(c);
    assert.match(classLines(pending.state(), c).join('\n'), /Next class evolution: Level 16 \/ E/);
    c.rules.ranks.bands.find((b) => b.rank === 'D').min = 40;
    s.entities.pc.sheet.level = 30;
    assert.doesNotMatch(classLines(s, c).join('\n'), /Higher class evolutions/);
    s.entities.pc.sheet.level = 40;
    assert.match(classLines(s, c).join('\n'), /Higher class evolutions/);
});
