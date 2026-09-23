// Progression over many real engine fights, and a large campaign history (10k+ events): the event log alone must
// reproduce the state, XP/Level/stat growth must stay consistent, and retrieval must still find an old memory.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { deriveCharacter } from '../../src/derived.js';
import { fold } from '../../src/state.js';
import { buildContext } from '../../src/context.js';
import { validateState } from '../../src/validate.js';

const content = await loadContent();

test('35 hunts: XP, Levels, free points, favored growth and resources stay consistent; the log reproduces the state', () => {
    const g = new Game(content, { seed: 20260923 }).ranger();
    let defeatedXp = 0;
    let fights = 0;
    let turns = 0;
    for (let i = 0; i < 35; i++) {
        g.turn('I stalk through the woods, hunting.', { time: 60, new: [{ ref: `boar ${i}`, kind: 'creature', species: 'boar', band: 'MEDIUM' }], aware: [{ who: `boar ${i}`, level: 'unaware' }] });
        for (let k = 0; k < 12 && (g.state.mode === 'combat' || k === 0); k++) {
            const t = g.input(k === 0 ? 'I Aimed Shot the boar' : 'I Power Shot the boar');
            turns += 1;
            assert.notEqual(t.outcome.kind, 'note', t.outcome.text);
            if (t.outcome.ended) {
                defeatedXp += t.outcome.ended.xp_awarded;
                fights += t.outcome.ended.defeated.length;
            }
            g.reply({});
        }
        assert.equal(g.state.mode, 'story', `fight ${i} ended`);
        assert.equal(g.state.entities.pc.status, 'alive');
        g.reply({ recover: [{ hp: 999, sta: 999, why: 'a night of rest by the fire' }], items: [{ to: 'pc', item: 'standard_arrow', qty: 20 - g.state.entities.pc.sheet.inventory.standard_arrow || 1, why: 'recovered and fletched arrows' }] });
    }
    const s = g.state.entities.pc.sheet;
    const totalXp = g.log.filter((e) => e.t === 'xp.changed').reduce((a, e) => a + e.d.amount, 0);
    assert.equal(totalXp, defeatedXp, 'XP is awarded exactly once per fight');
    assert.equal(totalXp, fights * 10, 'each Level-1 boar was locked at DefeatXP 10');
    let spent = 0;
    for (let l = 1; l < s.level; l++) spent += l * 100;
    assert.equal(spent + s.xp, totalXp, 'Level and XP account for every point earned');
    assert.ok(s.level >= 3, `reached Level ${s.level}`);
    assert.equal(s.free_points, (s.level - 1) * 5);
    assert.equal(s.stats.AGI, 6 + s.level - 1);
    assert.equal(s.stats.PER, 6 + s.level - 1);
    assert.equal(deriveCharacter(s, content).maxHp, 50 + s.level * 5 + 25);
    assert.equal(g.log.filter((e) => e.t === 'encounter.started').length, 35);
    assert.deepEqual(g.refold(), g.state, 'fold(event log) === live state');
    assert.deepEqual(validateState(g.refold(), content), []);
    assert.ok(turns >= 35);
});

test('large history: 12,000 events fold fast and retrieval still finds the one relevant old memory', () => {
    const g = new Game(content, { seed: 99 }).ranger();
    g.turn('I meet an old sailor.', { new: [{ ref: 'Old Tam', name: 'Old Tam', kind: 'npc', desc: ['sailor', 'old man'] }] });
    g.turn('I buy his compass.', { memory: [{ text: 'Old Tam sold Alaric a tarnished silver compass that always points to the drowned bell tower', who: ['Old Tam', 'pc'], imp: 8 }] });
    const base = g.log.slice();
    const topics = ['grain prices', 'the harbour tax', 'a lost goat', 'rain on the pass', 'guild notices', 'a quarrel at the well', 'fishing nets', 'a wedding feast'];
    const events = [];
    for (let i = 0; i < 12000; i++) {
        const turn = 10 + Math.floor(i / 3);
        if (i % 3 === 0) events.push({ t: 'turn.begun', d: { turn, input: `day ${i}` } });
        events.push({ t: 'memory.recorded', d: { memory: { id: `m.bulk.${i}`, turn, minute: 600 + turn * 30, text: `{pc} listened to villagers complain about ${topics[i % topics.length]} (#${i})`, who: ['pc'], witnesses: ['pc'], seen: ['pc'], location: 'loc.tidecross', place: 'market', importance: 2 + (i % 4), kind: 'narrated' } } });
    }
    const t0 = performance.now();
    const state = fold([...base, ...events, { t: 'scene.entered', d: { id: 'npc.old_tam' } }]);
    const foldMs = performance.now() - t0;
    assert.equal(state.memories.length > 12000, true);
    const t1 = performance.now();
    const ctx = buildContext(state, content, { input: '"Tam! The silver compass you sold me points somewhere strange."', budget: 1400 });
    const ctxMs = performance.now() - t1;
    assert.match(ctx.text, /tarnished silver compass/);
    assert.ok(ctx.tokens < 2200, `${ctx.tokens} tokens`);
    assert.ok(foldMs < 2000, `fold took ${foldMs.toFixed(0)} ms`);
    assert.ok(ctxMs < 1500, `context took ${ctxMs.toFixed(0)} ms`);
});
