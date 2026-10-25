import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { startCampaign } from '../../src/engine.js';
import { selectClass, selectSkills } from '../../src/creation.js';
import { applyEvent, fold } from '../../src/state.js';
import { awardXp, assignStat } from '../../src/progression.js';
import { deriveCharacter } from '../../src/derived.js';
import { humanSheet } from '../../src/npcgen.js';
const content = await loadProductContent();
const stats = value => Object.fromEntries(content.rules.stats.map(k => [k, value]));
function hero(cls) {
    const events = startCampaign(content, { seed: 7, runtime: 'v4' }), s = fold(events);
    const add = es => { events.push(...es); es.forEach(e => applyEvent(s, e)); };
    add(selectClass(s, content, cls).events);
    add(selectSkills(s, content, content.classes.get(cls).skill_pool.slice(0, 2)).events);
    return { s, events, add };
}
test('new PC has seven in every base stat; normal class bonus and full creation resources remain', () => {
    for (const runtime of ['v3', 'v4']) for (const ruleset of [1, 2]) {
        const s = fold(startCampaign(content, { seed: 7, runtime, ruleset }));
        assert.deepEqual(s.entities.pc.sheet.stats, stats(7));
    }
    for (const cls of ['warrior', 'mage', 'rogue']) {
        const { s } = hero(cls), sheet = s.entities.pc.sheet, favored = content.classes.get(cls).favored;
        assert.deepEqual(sheet.stats, Object.fromEntries(content.rules.stats.map(k => [k, favored.includes(k) ? 8 : 7])));
        const d = deriveCharacter(sheet, content);
        assert.deepEqual([sheet.hp, sheet.mp, sheet.sta], [d.maxHp, d.maxMp, d.maxSta]);
        assert.equal(sheet.level, 1); assert.equal(sheet.free_points, 0); assert.equal(sheet.xp, 0);
    }
});
test('level-up retains normal XP threshold, five free points, favored growth and no refill', () => {
    const { s, add } = hero('mage'), sheet = s.entities.pc.sheet, before = structuredClone(sheet);
    sheet.hp -= 3; sheet.mp -= 4; sheet.sta -= 5;
    const resources = [sheet.hp, sheet.mp, sheet.sta];
    add(awardXp(sheet, 125, content, 'regression'));
    assert.equal(sheet.level, 2); assert.equal(sheet.xp, 25); assert.equal(sheet.free_points, 5);
    for (const k of content.rules.stats) assert.equal(sheet.stats[k], before.stats[k] + (['INT', 'WIL'].includes(k) ? 1 : 0));
    assert.deepEqual([sheet.hp, sheet.mp, sheet.sta], resources);
    add(assignStat(sheet, 'VIT', 2, content).events);
    assert.equal(sheet.stats.VIT, before.stats.VIT + 2); assert.equal(sheet.free_points, 3);
});
test('recorded older campaign stats survive replay and JSON reload without migration', () => {
    const events = startCampaign(content, { seed: 7, runtime: 'v4' });
    events[0].d.entities.find(e => e.id === 'pc').sheet.stats = stats(5);
    const s = fold(events); events.push(...selectClass(s, content, 'mage').events);
    const old = fold(JSON.parse(JSON.stringify(events)));
    assert.deepEqual(old.entities.pc.sheet.stats, { ...stats(5), INT: 6, WIL: 6 });
    assert.deepEqual(fold(events), old);
});
test('human NPC baseline stays five and the existing level-one class growth remains unchanged', () => {
    const baseline = { ...content.rules.human_baseline }; delete baseline.src;
    assert.deepEqual(baseline, stats(5));
    const template = content.npcTemplates[2].get('guard'), npc = humanSheet(template, { level: 1 }, content);
    const favored = content.classes.get(npc.class)?.favored || template.stat_basis || [];
    assert.deepEqual(npc.stats, Object.fromEntries(content.rules.stats.map(k => [k, favored.includes(k) ? 6 : 5])));
});
