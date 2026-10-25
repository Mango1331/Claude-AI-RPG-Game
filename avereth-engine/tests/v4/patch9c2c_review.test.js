// 4.3.0-c.6.6.50 (review of 9C-2c, docs/PATCH9C2C_PASSIVE_ACQUISITION.md §7): three findings of the Git review of .49,
// played through the product's host path (tests/v4/patch8_lib.js): an exchange left HP, MP or STA above the new
// maxima; a cost reduction that adds nothing to the capped total took a slot; with all four slots held, a Rare or
// Legendary candidate was checked only against all four (no offer, or its effects cut, although an exchange would let
// them act).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, inject, outcomeOf, lastUser } from './patch8_lib.js';
import { deriveCharacter } from '../../src/derived.js';
import { validateState } from '../../src/validate.js';
import { runCommands } from '../../src/commands.js';
import { definePassive, gainPassive, passiveGain, effectiveStats } from '../../src/passives.js';
import { engineEvidence, passiveOffers, evidenceOf } from '../../src/v4/passive_growth.js';

const content = await loadProductContent();

const ACT = (kind, more = {}) => ({ type: 'activity', kind, what: null, minutes: null, until: null, learn: null, teacher: null, tags: null, aspects: null, material: null, ...more });
const reply = (g, prose = 'Time passes.') => g.reply(prose, { expected: {}, deltas: [] });
const sheetOf = (g) => g.state().entities.pc.sheet;
const dv = (g) => deriveCharacter(sheetOf(g), content);
const panel = (g, text) => runCommands(g.state(), content, text).panels.join('\n');
const ORIGIN = { kind: 'training', note: 'a test precondition' };
const P = (id, name, effects, quality) => ({ id, name, description: 'A test Passive.', origin: ORIGIN, rank: 'F', scope: 'always', effects, ...(quality ? { quality } : {}) });
const SOURCE = (key, effects) => ({ key, quality: 'legendary', why: 'an engine fixture of the review', effects });

async function hero() {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    const base = g.llm;
    g.llm = async (q) => (q.purpose.startsWith('forge') ? 'not json' : base(q)); // the engine's own names
    return g;
}
function grant(g, ...defs) {
    for (const def of defs) {
        const d = definePassive(g.state(), content, def);
        assert.deepEqual(d.errors, [], def.id);
        inject(g, d.events);
        inject(g, gainPassive(g.state(), content, 'pc', def.id, 'test').events);
    }
}
/** An authorized engine source, offered at the next safe turn. */
async function offered(g, source) {
    const r = engineEvidence(g.state(), content, source);
    assert.deepEqual(r.errors, [], source.key);
    inject(g, r.events);
    await say(g, '*i rest for ten minutes*', ACT('rest', { minutes: 10, quote: 'i rest for ten minutes' }));
    await reply(g, 'He rests.');
    return passiveOffers(g.state()).find((d) => d.evidence === `engine:${source.key}`) || null;
}
const accept = (g, offer, replace) => say(g, 'I give it up for this. I accept it.', { type: 'passive.accept', offer, replace, quote: 'I accept it' });

// ------------------------------------------------------------------------------------------------ R1
test('.50 R1: an exchange brings HP, MP and STA down to the new maxima in the same booking, directly or through a core stat; nothing is filled up', async () => {
    const g = await hero();
    grant(g,
        P('dyn.passive_thick_blood', 'Thick Blood', [{ kind: 'max_bonus', resource: 'hp', value: 10 }]),
        P('dyn.passive_conditioned_body', 'Conditioned Body', [{ kind: 'core_stat_bonus', stat: 'VIT', value: 2 }], 'ordinary'),
        P('dyn.passive_deep_wells', 'Deep Wells', [{ kind: 'max_bonus', resource: 'mp', value: 10 }]),
        P('dyn.passive_keen_edge', 'Keen Edge', [{ kind: 'stat_bonus', stat: 'MATK', value: 2 }]));
    const full = dv(g);
    inject(g, [{ t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: full.maxHp } }, { t: 'resource.changed', d: { id: 'pc', resource: 'mp', value: full.maxMp } }]);
    assert.deepEqual([sheetOf(g).hp, sheetOf(g).mp], [full.maxHp, full.maxMp]);
    const steps = [
        ['dyn.passive_thick_blood', 'a', 'DEF', { hp: full.maxHp - 10, mp: full.maxMp }, new RegExp(`Thick Blood is given up for good \\(its effects end: HP ${full.maxHp} → ${full.maxHp - 10}\\)`)],
        ['dyn.passive_conditioned_body', 'b', 'MDEF', { hp: full.maxHp - 20, mp: full.maxMp }, new RegExp(`Conditioned Body is given up for good \\(its effects end: HP ${full.maxHp - 10} → ${full.maxHp - 20}\\)`)],
        ['dyn.passive_deep_wells', 'c', 'ATK', { hp: full.maxHp - 20, mp: full.maxMp - 10 }, new RegExp(`Deep Wells is given up for good \\(its effects end: MP ${full.maxMp} → ${full.maxMp - 10}\\)`)],
    ];
    for (const [old, key, stat, after, line] of steps) {
        const offer = await offered(g, SOURCE(`review.r1_${key}`, [{ kind: 'stat_bonus', stat, value: 6 }]));
        await accept(g, offer.id, old);
        assert.match(outcomeOf(g).actions[0], line);
        const types = lastUser(g).events.map((e) => e.t).filter((t) => /^(passive|resource|growth|decision)\./.test(t));
        assert.deepEqual(types.slice(0, 4), ['passive.defined', 'passive.lost', 'passive.gained', 'resource.changed'], 'one booking');
        assert.deepEqual({ hp: sheetOf(g).hp, mp: sheetOf(g).mp }, after);
        assert.ok(sheetOf(g).hp <= dv(g).maxHp && sheetOf(g).mp <= dv(g).maxMp && sheetOf(g).sta <= dv(g).maxSta);
        assert.deepEqual(validateState(g.state(), content), []);
        await reply(g, 'It settles.');
    }
    // below the maximum: nothing changes, and nothing is filled up
    const offer = await offered(g, SOURCE('review.r1_d', [{ kind: 'max_bonus', resource: 'hp', value: 50 }]));
    inject(g, [{ t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: 30 } }]);
    await accept(g, offer.id, 'dyn.passive_keen_edge');
    assert.ok(!lastUser(g).events.some((e) => e.t === 'resource.changed'));
    assert.deepEqual([sheetOf(g).hp, dv(g).maxHp], [30, full.maxHp + 30]);
    assert.deepEqual(validateState(g.state(), content), []);
});

// ------------------------------------------------------------------------------------------------ R2
test('.50 R2: a cost reduction counts with every other one of its resource, general and of its tag, as the cost does; none of no use is offered or takes a slot', async () => {
    const g = await hero();
    const thrift = (n) => P(`dyn.passive_mana_thrift_${n}`, `Mana Thrift ${'I'.repeat(n)}`, [{ kind: 'cost_reduction', resource: 'mp', pct: 10 }]);
    grant(g, thrift(1), thrift(2), thrift(3));
    const fx = (effects) => ({ id: 'dyn.passive_probe', scope: 'always', effects });
    assert.deepEqual(passiveGain(sheetOf(g), content, fx([{ kind: 'cost_reduction', resource: 'mp', tag: 'Arcane', pct: 15 }])), [0], 'MP at its 30% for every MP Skill already');
    assert.deepEqual(passiveGain(sheetOf(g), content, fx([{ kind: 'cost_reduction', resource: 'mp', pct: 15 }])), [0]);
    assert.deepEqual(passiveGain(sheetOf(g), content, fx([{ kind: 'cost_reduction', resource: 'sta', tag: 'Arcane', pct: 15 }])), [15], 'another resource');
    // offered: only what adds something; an offer of nothing but it does not come
    const none = await offered(g, SOURCE('review.r2_a', [{ kind: 'cost_reduction', resource: 'mp', tag: 'Arcane', pct: 15 }]));
    assert.equal(none, null);
    assert.equal(evidenceOf(g.state())['engine:review.r2_a'].status, 'pending');
    const mixed = await offered(g, SOURCE('review.r2_b', [{ kind: 'cost_reduction', resource: 'mp', tag: 'Arcane', pct: 15 }, { kind: 'stat_bonus', stat: 'DEF', value: 6 }]));
    assert.deepEqual(mixed.passive.effects, [{ kind: 'stat_bonus', stat: 'DEF', value: 6 }]);
    assert.equal(Object.keys(sheetOf(g).passives).length, 3, 'no slot taken by an offer');
    assert.match(panel(g, '#skill Arcane Bolt'), /Cost: 7 MP \(base 10\)/, '30% capped, as before');
});

// ------------------------------------------------------------------------------------------------ R3
test('.50 R3: all four slots held, a Rare or Legendary candidate is weighed against every single exchange: offered, its effects kept, the worthwhile exchanges named; the chosen one checked again', async () => {
    const mind = (n) => P(`dyn.passive_mind_${n}`, `Mind ${'I'.repeat(n)}`, [{ kind: 'core_stat_bonus', stat: 'INT', value: 2 }], 'ordinary');
    const iron = P('dyn.passive_iron_hide', 'Iron Hide', [{ kind: 'stat_bonus', stat: 'DEF', value: 2 }]);
    // INT at its +6 total: the INT of a Legendary source acts once one of the INT Passives makes room; its MP anyway
    const g = await hero();
    grant(g, mind(1), mind(2), mind(3), iron);
    const both = await offered(g, SOURCE('review.r3_a', [{ kind: 'core_stat_bonus', stat: 'INT', value: 4 }, { kind: 'max_bonus', resource: 'mp', value: 50 }]));
    assert.deepEqual(both.passive.effects, [{ kind: 'core_stat_bonus', stat: 'INT', value: 4 }, { kind: 'max_bonus', resource: 'mp', value: 50 }], 'nothing cut that an exchange lets act');
    const lines = panel(g, '#passives');
    assert.match(lines, /in the place of Mind I it adds INT \+2, Max MP \+50 \(Mind I's INT \+2 ends\); of Mind II it adds INT \+2, Max MP \+50/);
    assert.match(lines, /of Iron Hide it adds Max MP \+50 \(Iron Hide's DEF \+2 ends\)/);
    // a source that only raises INT: offered (before .50 it was not), the exchanges that give nothing are not named
    const h = await hero();
    grant(h, mind(1), mind(2), mind(3), iron);
    const only = await offered(h, SOURCE('review.r3_b', [{ kind: 'core_stat_bonus', stat: 'INT', value: 4 }]));
    assert.ok(only, 'offered');
    const text = panel(h, '#passives');
    assert.match(text, /in the place of Mind I it adds INT \+2/);
    assert.doesNotMatch(text, /of Iron Hide it adds/);
    // the exchange he names is checked again: in the place of Iron Hide it adds nothing; in the place of Mind I it does
    await accept(h, only.id, 'dyn.passive_iron_hide');
    assert.match(outcomeOf(h).actions[0], /NO NEW PASSIVE — .* would add nothing to what his Passives give him now/);
    assert.equal(Object.keys(sheetOf(h).passives).length, 4);
    assert.ok(sheetOf(h).passives['dyn.passive_iron_hide']);
    await reply(h, 'Nothing.');
    await accept(h, only.id, 'dyn.passive_mind_1');
    assert.match(outcomeOf(h).actions[0], /NEW PASSIVE — .* \(Legendary\)/);
    assert.ok(!sheetOf(h).passives['dyn.passive_mind_1']);
    assert.equal(effectiveStats(sheetOf(h), content).INT, sheetOf(h).stats.INT + 6, 'still at the total');
    assert.deepEqual(validateState(h.state(), content), []);
    // an Ordinary candidate with all slots held: still none
    const k = await hero();
    grant(k, mind(1), mind(2), mind(3), iron);
    inject(k, [{ t: 'growth.evidence', d: { evidence: { key: 'train:learn.9', kind: 'training', quality: 'ordinary', focus: 'WIL', goal: 'learn.9', why: 'long practice of his will', turn: 1, minute: 0 } } }]);
    await say(k, '*i rest for ten minutes*', ACT('rest', { minutes: 10, quote: 'i rest for ten minutes' }));
    assert.deepEqual(passiveOffers(k.state()), []);
});
