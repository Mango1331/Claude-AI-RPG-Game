// Patch 9C-2c (docs/PATCH9C2C_PASSIVE_ACQUISITION.md): Ordinary, Rare and Legendary Passives on one path: evidence the
// engine established, an offer at the next safe turn, his own acceptance (into one of four slots, or in exchange for one
// he gives up), booked all or nothing. Campaigns are played through the product's host path with scripted planner,
// extractor and Forge answers (tests/v4/patch8_lib.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, loadProductContent } from '../helpers.js';
import { campaign, say, inject, outcomeOf, lastUser } from './patch8_lib.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { scaleCreature } from '../../src/npcgen.js';
import { deriveCharacter } from '../../src/derived.js';
import { validateState } from '../../src/validate.js';
import { runCommands } from '../../src/commands.js';
import { turnPanel } from '../../src/display.js';
import { renderHud } from '../../src/hud.js';
import { definePassive, gainPassive, passiveDefErrors, passiveTotals, effectiveStats } from '../../src/passives.js';
import { itemProfile } from '../../src/v4/items.js';
import { engineEvidence, passiveOffers, evidenceOf, trialEvidence, acceptPassive } from '../../src/v4/passive_growth.js';
import { eventKind, ownershipViolation } from '../../src/v4/ownership.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { catalogText } from '../../src/v4/interpret.js';

const content = await loadProductContent();
const legacy = await loadContent();

const ACT = (kind, more = {}) => ({ type: 'activity', kind, what: null, minutes: null, until: null, learn: null, teacher: null, tags: null, aspects: null, material: null, ...more });
const words = (t) => t.replace(/\*/g, '').trim();
const reply = (g, prose = 'Time passes.', deltas = []) => g.reply(prose, { expected: {}, deltas });
const sheetOf = (g) => g.state().entities.pc.sheet;
const dv = (g) => deriveCharacter(sheetOf(g), content);
const panel = (g, text) => runCommands(g.state(), content, text).panels.join('\n');
const accept = (g, offer, replace = null, text = 'I accept it. Let it settle in me.') => say(g, text, { type: 'passive.accept', offer, replace, quote: 'I accept it' });
const decline = (g, offer, text = 'No. I let it pass.') => say(g, text, { type: 'passive.decline', offer, quote: 'I let it pass' });
const ORIGIN = { kind: 'training', note: 'a test precondition' };
const unrated = (id, name, effects, more = {}) => ({ id, name, description: 'A test Passive.', origin: ORIGIN, rank: 'F', scope: 'always', effects, ...more });

function forge(g, answer) {
    const base = g.llm;
    const calls = [];
    g.llm = async (q) => (q.purpose.startsWith('forge') ? (calls.push(q), answer(q, calls.length)) : base(q));
    return calls;
}
const named = (q, name, flavor = 'A stillness settles behind his eyes.') => JSON.stringify({ skills: JSON.parse(q.messages[1].content).drafts.map((d) => ({ key: d.key, name, flavor })) });
async function sleepTillMorning(g) {
    await say(g, '*i sleep until morning*', ACT('sleep', { until: 'morning', quote: 'i sleep until morning' }));
    await reply(g, 'Night passes.');
}
/** His own Passives, given by the engine (a test's precondition). */
function grant(g, ...defs) {
    for (const def of defs) {
        const d = definePassive(g.state(), content, def);
        assert.deepEqual(d.errors, [], def.id);
        inject(g, d.events);
        const gain = gainPassive(g.state(), content, 'pc', def.id, 'test');
        assert.deepEqual(gain.errors, [], def.id);
        inject(g, gain.events);
    }
}
/** Train his mind on his own, two hours a day, until the goal is complete (ten game days at 20 LP a day). */
async function trainMind(g, { days = 10, stat = 'INT' } = {}) {
    let r = null;
    for (let d = 0; d < days; d++) {
        const text = '*i spend two hours in meditation, drilling my concentration*';
        r = await say(g, text, ACT('train', { learn: stat, minutes: 120, quote: words(text) }));
        if (d < days - 1) { await reply(g, 'He sits and breathes and counts.'); await sleepTillMorning(g); }
    }
    return r;
}

// ------------------------------------------------------------------------------------------------ 1. ordinary
test('9C-2c (1): long training of his mind ends in an offered Ordinary Passive; only his acceptance gives INT +2, for every value that reads INT', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    const before = { int: sheetOf(g).stats.INT, mp: dv(g).maxMp, matk: dv(g).matk };
    const calls = forge(g, (q) => named(q, 'Lantern Mind'));
    // a single session is progress, never a Passive
    const first = '*i spend two hours in meditation, drilling my concentration*';
    await say(g, first, ACT('train', { learn: 'INT', minutes: 120, quote: words(first) }));
    assert.match(outcomeOf(g).actions[0], /TRAINS — his mind \(INT\) for 120 minutes on his own, booked by the engine: Learning Progress 20\/200 toward an Ordinary Passive\. Nothing about him changes yet/);
    assert.equal(outcomeOf(g).passive_offers, undefined);
    await reply(g, 'He sits and breathes.');
    // the same day again: its claim is spent
    await say(g, first, ACT('train', { learn: 'INT', minutes: 120, quote: words(first) }));
    assert.match(outcomeOf(g).actions[0], /Learning Progress 20\/200/);
    await reply(g, 'He sits and breathes.');
    await sleepTillMorning(g);
    const r = await trainMind(g, { days: 9 });
    const o = outcomeOf(g);
    assert.match(o.actions[0], /Learning Progress 200\/200 toward an Ordinary Passive\. The training is complete; what came of it is offered only if the engine names it below \(POSSIBLE PASSIVE\)/);
    assert.equal(calls.length, 1, 'one Forge request for the offer');
    assert.equal(calls[0].messages[0].content.includes('Passives'), true, 'its own Passive prompt');
    assert.deepEqual(o.passive_offers.map((x) => [x.name, x.quality, x.text]), [['Lantern Mind', 'ordinary', 'Lantern Mind [Ordinary] (always): INT +2']]);
    // offered, not his: no value changed
    assert.equal(sheetOf(g).passives, undefined);
    assert.deepEqual([sheetOf(g).stats.INT, dv(g).maxMp, dv(g).matk], [before.int, before.mp, before.matk]);
    const offer = passiveOffers(g.state())[0];
    assert.match(r.context.text, /POSSIBLE PASSIVE — the engine offers Alaric a development, NOT his yet: Lantern Mind \[Ordinary\] \(always\): INT \+2 \(trained for long on his own \(learn\.1\)\)\. He alone accepts or declines it/);
    assert.match(String(turnPanel(g.state(), content)), /POSSIBLE PASSIVE — Lantern Mind \[Ordinary\] \(always\): INT \+2 · not his yet/);
    assert.match(panel(g, '#passives'), new RegExp(`PASSIVES — 0/4\\n- none\\nPOSSIBLE PASSIVE — Lantern Mind \\[Ordinary\\] \\(always\\): INT \\+2 · trained for long on his own \\(learn\\.1\\) · not his yet: accept it into a free slot, or decline it \\(${offer.id.replace(/\./g, '\\.')}\\)`));
    assert.match(catalogText(buildCatalog(g.state(), content, { known: true, c: true })), /POSSIBLE PASSIVE \(offered by the engine; his only if he accepts\): dec\.passive\.train_learn_1 \(Lantern Mind \[Ordinary\] \(always\): INT \+2; not his yet\)/);
    assert.deepEqual(validateState(g.state(), content), []);
    await reply(g, 'Something quiet settles in him.');
    // his acceptance
    await accept(g, offer.id);
    const a = outcomeOf(g);
    assert.match(a.actions[0], /NEW PASSIVE — Lantern Mind \(Ordinary\), booked by the engine: always, INT \+2\. Passive slots 1\/4\./);
    const types = lastUser(g).events.map((e) => e.t);
    assert.deepEqual(types.filter((t) => /^(passive|growth|decision)\./.test(t)), ['passive.defined', 'passive.gained', 'growth.decided', 'decision.closed']);
    const s = sheetOf(g);
    assert.equal(s.stats.INT, before.int, 'the stat he assigned stays');
    assert.equal(effectiveStats(s, content).INT, before.int + 2);
    assert.equal(dv(g).maxMp, before.mp + 2 * content.rules.derived.max_mp.per_int, 'Max MP from INT');
    assert.match(panel(g, '#status'), new RegExp(`INT ${before.int + 2} \\(${before.int} \\+2\\)`));
    assert.match(panel(g, '#skill Arcane Bolt'), new RegExp(`Current Raw Power: 10 \\+ INT ${before.int + 2}×1\\.875`));
    assert.match(panel(g, '#passives'), /PASSIVES — 1\/4\n- Lantern Mind \[Ordinary\] \(always\): INT \+2/);
    assert.match(renderHud(g.state(), content), /Passives[^\n]*1\/4 · Lantern Mind \(Ordinary\)/);
    assert.equal(passiveOffers(g.state()).length, 0);
    assert.equal(evidenceOf(g.state())['train:learn.1'].status, 'accepted');
    assert.deepEqual(validateState(g.state(), content), []);
    // a fight's snapshot and its Skill scaling read the raised INT
    await reply(g, 'It settles.');
    const p = scaleCreature(content.anchors.get('wolf'), 1, 'normal', content);
    inject(g, [
        { t: 'entity.created', d: { entity: { id: 'mon.wolf', kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', status: 'alive', location: g.state().scene.location, profile: { ...p, max_hp: 300, hp: 300 } } } },
        { t: 'scene.entered', d: { id: 'mon.wolf', band: 'MEDIUM', cover: 'none' } },
        { t: 'scene.awareness', d: { id: 'mon.wolf', level: 'aware' } },
    ]);
    await say(g, '*i cast Arcane Bolt at the wolf*', { type: 'use_skill', skill: 'mage.arcane_bolt', target: 'mon.wolf', quote: 'i cast Arcane Bolt at the wolf' });
    const bolt = outcomeOf(g).records.find((x) => x.actor === 'pc');
    assert.match(bolt.raw_text, new RegExp(`INT ${before.int + 2}×1\\.875`));
    assert.equal(g.state().encounter.combatants.pc.fixed.stats.INT, before.int + 2);
    // reload: the same values
    const again = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(deriveCharacter(again.entities.pc.sheet, content), dv(g));
    assert.deepEqual(again.entities.pc.sheet.passives, sheetOf(g).passives);
});

// ------------------------------------------------------------------------------------------------ 2./3. rare
/** A fight against a wolf of this Level that he starts at `start` HP: bolts until it is over; the records of each turn. */
async function wolfFight(g, { level = 6, start = Math.ceil(dv(g).maxHp * 0.55), hp = 80, id = 'mon.wolf' } = {}) {
    const p = scaleCreature(content.anchors.get('wolf'), level, 'normal', content);
    inject(g, [
        { t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: start } },
        { t: 'entity.created', d: { entity: { id, kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', status: 'alive', location: g.state().scene.location, profile: { ...p, max_hp: hp, hp } } } },
        { t: 'scene.entered', d: { id, band: 'MEDIUM', cover: 'none' } },
        { t: 'scene.awareness', d: { id, level: 'aware' } },
    ]);
    const turns = [];
    for (let i = 0; i < 10; i++) {
        await say(g, '*i cast Arcane Bolt at the wolf*', { type: 'use_skill', skill: 'mage.arcane_bolt', target: id, quote: 'i cast Arcane Bolt at the wolf' });
        turns.push({ fight: !!g.state().encounter, outcome: outcomeOf(g), events: lastUser(g).events });
        if (!g.state().encounter) break;
        await reply(g, 'The wolf circles.');
    }
    return turns;
}

test('9C-2c (2): an outstanding fight he won leaves its evidence at the fight\'s end and exactly one Rare offer outside the fight; accepted, it acts under its condition', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    const calls = forge(g, (q) => named(q, 'Ashen Resolve', 'His stance hardens when the blood runs thin.'));
    const turns = await wolfFight(g);
    // during the fight: neither evidence nor offer
    for (const t of turns.filter((x) => x.fight)) {
        assert.ok(!t.events.some((e) => /^growth\.(evidence|offered)$/.test(e.t) || (e.t === 'decision.opened' && e.d.decision.kind === 'passive')));
        assert.equal(t.outcome?.passive_offers, undefined);
    }
    const last = turns.at(-1);
    assert.equal(last.fight, false);
    const ended = last.events.find((e) => e.t === 'encounter.ended');
    assert.deepEqual(ended.d.summary.trial, { key: `trial:${ended.d.id}`, sure: true, passed: true });
    const ev = evidenceOf(g.state())[`trial:${ended.d.id}`];
    assert.deepEqual([ev.quality, ev.facts.gap, ev.facts.low <= 25, ev.facts.start >= 50, ev.status], ['rare', 5, true, true, 'offered']);
    // the offer comes after the fight ended, in the same engine step, once
    const types = last.events.map((e) => e.t);
    assert.ok(types.indexOf('encounter.ended') < types.indexOf('growth.offered'));
    assert.equal(types.filter((t) => t === 'growth.offered').length, 1);
    assert.equal(calls.length, 1);
    assert.deepEqual(last.outcome.passive_offers.map((o) => [o.name, o.quality, o.text]), [['Ashen Resolve', 'rare', 'Ashen Resolve [Rare] (in a fight at 50% HP or less): DEF +4, physical damage taken -10%']]);
    assert.equal(sheetOf(g).passives, undefined, 'offered is not his');
    assert.deepEqual(validateState(g.state(), content), []);
    await reply(g, 'The wolf lies still.');
    // nothing new from it on later turns
    await say(g, '*i rest for ten minutes*', ACT('rest', { minutes: 10, quote: 'i rest for ten minutes' }));
    assert.equal(outcomeOf(g).passive_offers, undefined);
    assert.equal(passiveOffers(g.state()).length, 1);
    await reply(g, 'He rests.');
    await accept(g, passiveOffers(g.state())[0].id);
    assert.match(outcomeOf(g).actions[0], /NEW PASSIVE — Ashen Resolve \(Rare\), booked by the engine: in a fight at 50% HP or less, DEF \+4, physical damage taken -10%\. Passive slots 1\/4\./);
    const p = sheetOf(g).passives[passiveOffers(g.state()).length ? null : Object.keys(sheetOf(g).passives)[0]];
    assert.deepEqual([p.quality, p.scope, p.condition, p.effects.length], ['rare', 'combat', { kind: 'hp_at_most_pct', pct: 50 }, 2]);
    assert.equal(g.state().passive_defs[p.id].flavor, 'His stance hardens when the blood runs thin.');
    assert.equal(dv(g).def, deriveCharacter({ ...sheetOf(g), passives: {} }, content).def, 'a combat Passive is no lasting bonus');
    await reply(g, 'It settles.');
    // in the next fight it acts once he is down to half his HP, not before
    const p2 = scaleCreature(content.anchors.get('wolf'), 1, 'normal', content);
    inject(g, [
        { t: 'entity.created', d: { entity: { id: 'mon.wolf2', kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', status: 'alive', location: g.state().scene.location, profile: { ...p2, max_hp: 300, hp: 300 } } } },
        { t: 'scene.entered', d: { id: 'mon.wolf2', band: 'ENGAGED', cover: 'none' } },
        { t: 'scene.awareness', d: { id: 'mon.wolf2', level: 'aware' } },
    ]);
    await say(g, '*i cast Arcane Bolt at the wolf*', { type: 'use_skill', skill: 'mage.arcane_bolt', target: 'mon.wolf2', quote: 'i cast Arcane Bolt at the wolf' });
    const bite = (o) => o.records.find((r) => r.actor === 'mon.wolf2' && r.strikes?.length);
    const b1 = bite(outcomeOf(g));
    const half = b1.strikes[0].hp_before * 100 <= 50 * g.state().encounter.combatants.pc.fixed.max_hp;
    assert.ok(b1.strikes[0].steps.some((x) => (half ? /physical resistance -10%/ : /^Raw/).test(x)), b1.strikes[0].steps.join(' | '));
    // reload: the same
    const again = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(again.entities.pc.sheet.passives, sheetOf(g).passives);
    assert.deepEqual(again.growth.evidence, g.state().growth.evidence);
});

test('9C-2c (3): a near case is decided once by its own die, kept with the evidence; replay, regenerate and the same fight never roll again', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    forge(g, (q) => named(q, 'Ashen Resolve'));
    const turns = await wolfFight(g, { level: 4 });
    const ended = turns.at(-1).events.find((e) => e.t === 'encounter.ended');
    const ev = evidenceOf(g.state())[`trial:${ended.d.id}`];
    assert.deepEqual([ev.sure, ev.facts.gap, ev.chance, Number.isInteger(ev.roll)], [false, 3, 40, true]);
    assert.equal(ev.status, ev.roll <= 40 ? 'offered' : 'failed');
    assert.deepEqual(ended.d.summary.trial, { key: ev.key, sure: false, roll: ev.roll, chance: 40, passed: ev.roll <= 40 });
    // the record holds the result: a reload and a regenerate of that turn give the same evidence
    assert.deepEqual(foldChat(structuredClone(g.chat)).state.growth.evidence, g.state().growth.evidence);
    await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    assert.deepEqual(g.state().growth.evidence, foldChat(structuredClone(g.chat)).state.growth.evidence);
    assert.equal(Object.keys(g.state().growth.evidence).length, 1);
    // the die is the evidence's own: the same fight is never rolled again, another fight has its own (both possible)
    const enc = { id: 'enc.x', combatants: { pc: { fixed: { level: 1, max_hp: 80 }, current: {} }, w: { side: 'hostile', name: 'Wolf', fixed: { level: 4 }, current: {} } }, defeated: ['w'], pp: { used: { 'mage.arcane_bolt': 'x' }, trial: { start: 60, low: 20, foes: ['w'], taken: { physical: 30, magical: 0 } } } };
    const state = g.state();
    const outcomes = Array.from({ length: 40 }, (_, i) => trialEvidence(state, content, { ...enc, id: `enc.n${i}` })[0].d.evidence);
    assert.ok(outcomes.some((x) => x.status === 'failed') && outcomes.some((x) => x.status !== 'failed'), 'the chance decides per fight');
    assert.deepEqual(trialEvidence(state, content, { ...enc, id: 'enc.n3' }), trialEvidence(state, content, { ...enc, id: 'enc.n3' }), 'the same fight, the same result');
    assert.deepEqual(trialEvidence(state, content, { ...enc, id: ended.d.id }), [], 'evidence of a fight is kept once');
    // and no fight below the bar is evidence: an easy foe, a good start lost before, a fight he fled or did not win
    assert.deepEqual(trialEvidence(state, content, { ...enc, id: 'enc.e1', combatants: { ...enc.combatants, w: { ...enc.combatants.w, fixed: { level: 2 } } } }), []);
    assert.deepEqual(trialEvidence(state, content, { ...enc, id: 'enc.e2', pp: { ...enc.pp, trial: { ...enc.pp.trial, start: 30 } } }), [], 'he went in hurt already');
    assert.deepEqual(trialEvidence(state, content, { ...enc, id: 'enc.e3', pp: { ...enc.pp, trial: { ...enc.pp.trial, low: 60 } } }), []);
    assert.deepEqual(trialEvidence(state, content, { ...enc, id: 'enc.e4', defeated: [] }), [], 'not won');
    assert.deepEqual(trialEvidence(state, content, { ...enc, id: 'enc.e5', pp: { ...enc.pp, used: {} } }), [], 'no Skill of his own');
    assert.deepEqual(trialEvidence(state, content, { ...enc, id: 'enc.e6', combatants: { ...enc.combatants, pc: { ...enc.combatants.pc, current: { escaped: true } } } }), []);
    assert.deepEqual(trialEvidence(state, content, { ...enc, id: 'enc.e7', pp: { ...enc.pp, trial: { ...enc.pp.trial, foes: [] } } }), [], 'the foe never struck him');
});

// ------------------------------------------------------------------------------------------------ 4. his decision
test('9C-2c (4): an ignored offer stays open and visible; a declined one is gone for good; an invalid answer changes nothing', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    forge(g, (q) => named(q, 'Ashen Resolve'));
    await wolfFight(g);
    await reply(g, 'The wolf lies still.');
    const offer = passiveOffers(g.state())[0];
    const before = JSON.stringify([sheetOf(g).passives ?? null, dv(g)]);
    // ignored: kept over turns and places, no silent end, nothing booked
    for (let i = 0; i < 3; i++) {
        await say(g, '*i rest for an hour*', ACT('rest', { minutes: 60, quote: 'i rest for an hour' }));
        await reply(g, 'He rests.');
    }
    await say(g, '*i walk into Alderwatch*', { type: 'go', to: 'loc.alderwatch', quote: 'i walk into Alderwatch' });
    await g.reply('He walks into town.', { expected: { 1: { arrived: true, at: 'loc.alderwatch', with: null } }, deltas: [] });
    assert.deepEqual(passiveOffers(g.state()).map((d) => d.id), [offer.id]);
    assert.match(panel(g, '#passives'), /POSSIBLE PASSIVE — Ashen Resolve \[Rare\]/);
    assert.match(panel(g, '#class'), /Passive slots: 0\/4 · 1 development offered \(#passives\)/);
    assert.match(renderHud(g.state(), content), /Passives[^\n]*0\/4 · offered: Ashen Resolve \(#passives\)/);
    assert.equal(JSON.stringify([sheetOf(g).passives ?? null, dv(g)]), before);
    // invalid answers (the planner's schema allows only the catalog's ids; the engine refuses the rest): nothing changes
    for (const [ref, replace, why] of [['dec.passive.none', null, /which of the offered developments: Ashen Resolve/], [offer.id, 'dyn.passive_iron', /a slot is free \(0\/4\)/]]) {
        const r = acceptPassive(g.state(), content, ref, replace);
        assert.match(r.line, why);
        assert.match(r.line, /Nothing changes: his Passives, their slots and his values stay as they are/);
        assert.equal(r.events, undefined);
    }
    assert.match(acceptPassive({ ...g.state(), encounter: { id: 'enc.y' } }, content, offer.id).line, /not in a fight: he decides on it once the fight is over/);
    // a question or a wish is no decision (the agency guard)
    await say(g, 'Should I accept the awakening?', { type: 'passive.accept', offer: offer.id, replace: null, quote: 'Should I accept the awakening?' });
    assert.equal(sheetOf(g).passives, undefined);
    assert.equal(passiveOffers(g.state()).length, 1);
    await reply(g, 'He wonders.');
    // declined: decided for good
    await decline(g, offer.id);
    assert.match(outcomeOf(g).actions[0], /DECLINES — Ashen Resolve \(Rare\): he lets this development pass; it does not come back/);
    assert.deepEqual(passiveOffers(g.state()), []);
    assert.equal(evidenceOf(g.state())[offer.evidence].status, 'declined');
    assert.equal(JSON.stringify([sheetOf(g).passives ?? null, dv(g)]), before);
    await reply(g, 'It fades.');
    for (let i = 0; i < 2; i++) {
        await say(g, '*i rest for an hour*', ACT('rest', { minutes: 60, quote: 'i rest for an hour' }));
        assert.equal(outcomeOf(g).passive_offers, undefined, 'never offered again');
        await reply(g, 'He rests.');
    }
    assert.match(acceptPassive(g.state(), content, offer.id).line, /no development is offered to him/);
    assert.deepEqual(validateState(g.state(), content), []);
});

// ------------------------------------------------------------------------------------------------ 5./6. four slots
const FOUR = [
    unrated('dyn.passive_iron_hide', 'Iron Hide', [{ kind: 'stat_bonus', stat: 'DEF', value: 2 }]),
    unrated('dyn.passive_deep_wells', 'Deep Wells', [{ kind: 'max_bonus', resource: 'mp', value: 10 }]),
    unrated('dyn.passive_keen_edge', 'Keen Edge', [{ kind: 'stat_bonus', stat: 'MATK', value: 2 }]),
    { ...unrated('dyn.passive_quiet_mind', 'Quiet Mind', [{ kind: 'core_stat_bonus', stat: 'WIL', value: 2 }]), quality: 'ordinary' },
];
const CROWN = { key: 'test.crown_relic', quality: 'legendary', why: 'the crown relic of a test fixture, opened by the engine', effects: [{ kind: 'core_stat_bonus', stat: 'INT', value: 4 }, { kind: 'max_bonus', resource: 'mp', value: 50 }, { kind: 'resist', damage_type: 'magical', pct: 15 }] };

test('9C-2c (5, 6): four slots held: no Ordinary goal; a Rare or Legendary Passive only for one he names, given up for good and booked all or nothing', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    grant(g, ...FOUR);
    assert.match(panel(g, '#passives'), /PASSIVES — 4\/4/);
    // an Ordinary goal is refused from the start
    const text = '*i spend two hours in meditation, drilling my concentration*';
    await say(g, text, ACT('train', { learn: 'INT', minutes: 120, quote: words(text) }));
    assert.match(outcomeOf(g).actions[0], /NOT TRAINING — all 4 of his Passive slots are held or awaited \(4 held\); an Ordinary Passive never takes another's place/);
    assert.deepEqual(g.state().growth?.goals || {}, {});
    await reply(g, 'He sits.');
    // a legendary development from an authorized engine source: offered at the next safe turn
    inject(g, engineEvidence(g.state(), content, CROWN).events);
    forge(g, (q) => named(q, 'Crown of Embers', 'Light gathers at his temples.'));
    await say(g, '*i rest for ten minutes*', ACT('rest', { minutes: 10, quote: 'i rest for ten minutes' }));
    const offer = passiveOffers(g.state())[0];
    assert.deepEqual([offer.quality, offer.passive.name, offer.passive.effects.length], ['legendary', 'Crown of Embers', 3]);
    assert.match(panel(g, '#passives'), /all slots are held: accept it by naming the Passive he gives up for good; in the place of Iron Hide it adds INT \+4, Max MP \+50, magical damage taken -15% \(Iron Hide's DEF \+2 ends\); of Deep Wells it adds .*; of Keen Edge .*; of Quiet Mind .*; or decline it/);
    await reply(g, 'He rests.');
    const before = { int: effectiveStats(sheetOf(g), content).INT, mp: dv(g).maxMp, def: dv(g).def };
    // without naming one, or naming one he does not hold: nothing
    await accept(g, offer.id);
    assert.match(outcomeOf(g).actions[0], /all 4 Passive slots are held \(4\/4\): he names the Passive he gives up for good for Crown of Embers/);
    await reply(g, 'Nothing.');
    assert.match(acceptPassive(g.state(), content, offer.id, 'dyn.passive_none').line, /he holds no Passive "dyn\.passive_none"/);
    assert.deepEqual(Object.keys(sheetOf(g).passives).length, 4);
    // named: Iron Hide goes, the Crown comes, in one booking
    await accept(g, offer.id, 'dyn.passive_iron_hide', 'I give up my Iron Hide for it. I accept it.');
    const line = outcomeOf(g).actions[0];
    assert.match(line, /NEW PASSIVE — Crown of Embers \(Legendary\), booked by the engine: always, INT \+4, Max MP \+50, magical damage taken -15%; Iron Hide is given up for good \(its effects end\)\. Passive slots 4\/4\./);
    const types = lastUser(g).events.map((e) => e.t).filter((t) => /^(passive|growth|decision)\./.test(t));
    assert.deepEqual(types, ['passive.defined', 'passive.lost', 'passive.gained', 'growth.decided', 'decision.closed']);
    const s = sheetOf(g);
    // its id is the engine's (from the fixed name it was composed with), the Forge's name is what it is called
    assert.deepEqual(Object.keys(s.passives).sort(), [offer.passive.id, 'dyn.passive_deep_wells', 'dyn.passive_keen_edge', 'dyn.passive_quiet_mind'].sort());
    assert.equal(s.passives[offer.passive.id].name, 'Crown of Embers');
    assert.deepEqual(s.passive_history.map((h) => [h.id, h.replaced_by]), [['dyn.passive_iron_hide', offer.passive.id]]);
    assert.ok(g.state().passive_defs['dyn.passive_iron_hide'], 'its definition stays');
    assert.equal(effectiveStats(s, content).INT, before.int + 4);
    assert.equal(dv(g).maxMp, before.mp + 4 * content.rules.derived.max_mp.per_int + 50);
    assert.equal(dv(g).def, before.def - 2, 'Iron Hide no longer counts: no double effect');
    assert.match(panel(g, '#passives'), /PASSIVES — 4\/4[\s\S]*- given up: Iron Hide \(for Crown of Embers\)/);
    // given up for good: not his to take back
    assert.match(gainPassive(g.state(), content, 'pc', 'dyn.passive_iron_hide').errors.join(), /holds 4 Passives already|gave up Iron Hide for good/);
    assert.deepEqual(validateState(g.state(), content), []);
    const again = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual([again.entities.pc.sheet.passives, again.entities.pc.sheet.passive_history], [s.passives, s.passive_history]);
});

test('9C-2c (6): an exchange whose grant cannot be booked loses nothing: the old Passive and the stone stay', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    grant(g, ...FOUR);
    inject(g, [{ t: 'object.created', d: { object: { id: 'obj.relic', name: 'Ember Relic', kind: 'item', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: 1, how: 'loot' } } } }]);
    inject(g, engineEvidence(g.state(), content, { ...CROWN, object: 'obj.relic' }).events);
    forge(g, (q) => named(q, 'Crown of Embers'));
    await say(g, '*i rest for ten minutes*', ACT('rest', { minutes: 10, quote: 'i rest for ten minutes' }));
    await reply(g, 'He rests.');
    const offer = passiveOffers(g.state())[0];
    assert.equal(offer.object, 'obj.relic');
    // meanwhile its id is taken (the definition cannot be booked): the exchange is refused whole
    const clash = definePassive(g.state(), content, { ...unrated(offer.passive.id, 'Other Crown', [{ kind: 'stat_bonus', stat: 'DEF', value: 1 }]) });
    inject(g, clash.events);
    const held = JSON.stringify(sheetOf(g).passives);
    await accept(g, offer.id, 'dyn.passive_iron_hide');
    assert.match(outcomeOf(g).actions[0], /NO NEW PASSIVE — Crown of Embers cannot be booked/);
    assert.equal(JSON.stringify(sheetOf(g).passives), held, 'Iron Hide stays');
    assert.equal(g.state().objects['obj.relic'].holder.entity, 'pc', 'the stone stays');
    assert.equal(passiveOffers(g.state()).length, 1);
    assert.deepEqual(validateState(g.state(), content), []);
});

// ------------------------------------------------------------------------------------------------ 7./8. legendary and stones
test('9C-2c (7, 8): a Legendary Passive only from an authorized engine source within its budget; a stone the story calls a Passive Stone is none, and an engine stone is spent only by acceptance', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    // the engine source's bounds
    const bad = [
        [{ ...CROWN, quality: 'ordinary' }, /rare or legendary/],
        [{ ...CROWN, effects: [...CROWN.effects, { kind: 'stat_bonus', stat: 'DEF', value: 1 }] }, /effects: 1-3 for a legendary Passive/],
        [{ ...CROWN, effects: [{ kind: 'core_stat_bonus', stat: 'INT', value: 5 }] }, /core_stat_bonus\.value: 1-4/],
        [{ ...CROWN, quality: 'rare', effects: [{ kind: 'max_bonus', resource: 'mp', value: 30 }] }, /max_bonus\.value: 1-25/],
        [{ ...CROWN, key: 'X Y' }, /key/],
    ];
    for (const [src, why] of bad) assert.match(engineEvidence(g.state(), content, src).errors.join(' | '), why, JSON.stringify(src));
    assert.match(engineEvidence(foldChat(structuredClone(g.chat)).state, content, CROWN).errors.join(), /^$/);
    // the budgets of the three qualities
    const def = (quality, effects) => ({ id: 'dyn.passive_probe', name: 'Probe', description: 'probe', origin: ORIGIN, rank: 'F', quality, scope: 'always', effects });
    assert.deepEqual(passiveDefErrors(def('ordinary', [{ kind: 'core_stat_bonus', stat: 'INT', value: 2 }]), content), []);
    assert.match(passiveDefErrors(def('ordinary', [{ kind: 'core_stat_bonus', stat: 'INT', value: 3 }]), content).join(), /1-2/);
    assert.match(passiveDefErrors(def('ordinary', [{ kind: 'core_stat_bonus', stat: 'INT', value: 2 }, { kind: 'max_bonus', resource: 'hp', value: 5 }]), content).join(), /effects: 1-1 for a ordinary Passive/);
    assert.match(passiveDefErrors(def('ordinary', [{ kind: 'resist', damage_type: 'physical', pct: 10 }]), content).join(), /resist\.pct: 1-5/);
    assert.deepEqual(passiveDefErrors(def('rare', [{ kind: 'stat_bonus', stat: 'DEF', value: 4 }, { kind: 'resist', damage_type: 'physical', pct: 10 }]), content), []);
    assert.match(passiveDefErrors(def('epic', [{ kind: 'stat_bonus', stat: 'DEF', value: 1 }]), content).join(), /quality: one of ordinary, rare, legendary/);
    assert.match(passiveDefErrors({ ...def(undefined, [{ kind: 'core_stat_bonus', stat: 'INT', value: 1 }]), quality: undefined }, content).join(), /core_stat_bonus: only on a Passive of a quality that allows it/);
    // a stone the story names a Passive Stone: no profile, no use, no evidence
    for (const name of ['Rare Passive Stone', 'Passive Skill Stone of Iron Will', 'Legendary passive stones']) {
        assert.equal(itemProfile(content, { name, kind: 'item', teaches: { source: 'stone', fn: 'guard', tags: ['Defense'], aspects: null } }), null, name);
    }
    const npc = 'npc.trader';
    inject(g, [
        { t: 'entity.created', d: { entity: { id: npc, kind: 'npc', name: 'Velka', descriptors: ['merchant'], status: 'alive', location: g.state().scene.location, at: g.state().scene.at, template: 'commoner' } } },
        { t: 'scene.entered', d: { id: npc, band: 'SHORT', cover: 'none' } },
    ]);
    await say(g, '*i ask Velka what the glowing stone is*');
    await reply(g, '"A Passive Stone, the real thing," Velka says. "Three silver."', [{ seq: 1, type: 'offer', seller: npc, lines: [{ what: 'Passive Stone of Iron Will', kind: 'goods', service: null, qty: 1, price_cp: 30, said: 'Three silver', effect: null, teaches: { source: 'stone', fn: 'guard', tags: ['Defense'], aspects: null } }] }]);
    const o = Object.values(g.state().offers).find((x) => x.status === 'open');
    assert.equal(o.lines[0].profile ?? null, null, 'the offer fixes no source');
    await say(g, '*i buy the stone*', { type: 'offer.accept', offer: o.id, lines: null, qty: null, quote: 'i buy the stone' });
    await reply(g, 'She hands it over.');
    const stone = Object.values(g.state().objects).find((x) => x.name === 'Passive Stone of Iron Will');
    await say(g, '*i press the passive stone to my brow*', { type: 'use', object: stone.id, qty: null, quote: 'i press the passive stone to my brow' });
    assert.match(outcomeOf(g).actions[0], /CANNOT USE — Passive Stone of Iron Will: no power of it was ever established by the engine, so it awakens nothing/);
    assert.deepEqual([g.state().growth?.evidence ?? {}, passiveOffers(g.state()), sheetOf(g).passives ?? null], [{}, [], null]);
    assert.equal(g.state().objects[stone.id].holder.entity, 'pc');
    await reply(g, 'Nothing happens.');
    // an engine stone (an authorized source bound to the thing): declined, it stays his and unspent; never offered again
    inject(g, [{ t: 'object.created', d: { object: { id: 'obj.relic', name: 'Ember Relic', kind: 'item', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: 1, how: 'loot' } } } }]);
    inject(g, engineEvidence(g.state(), content, { ...CROWN, key: 'test.relic_a', object: 'obj.relic' }).events);
    forge(g, (q) => named(q, 'Crown of Embers'));
    await say(g, '*i rest for ten minutes*', ACT('rest', { minutes: 10, quote: 'i rest for ten minutes' }));
    await reply(g, 'He rests.');
    await decline(g, passiveOffers(g.state())[0].id);
    assert.match(outcomeOf(g).actions[0], /and the stone stays his, unspent/);
    assert.equal(g.state().objects['obj.relic'].holder.entity, 'pc');
    assert.match(engineEvidence(g.state(), content, { ...CROWN, key: 'test.relic_a', object: 'obj.relic' }).errors.join(), /gave its evidence already/);
    await reply(g, 'It dims.');
    // another engine source of the same relic, accepted: the stone is spent exactly once, with the grant
    inject(g, engineEvidence(g.state(), content, { ...CROWN, key: 'test.relic_b', object: 'obj.relic' }).events);
    await say(g, '*i rest for ten minutes*', ACT('rest', { minutes: 10, quote: 'i rest for ten minutes' }));
    await reply(g, 'He rests.');
    await accept(g, passiveOffers(g.state())[0].id);
    const ev = lastUser(g).events.map((e) => e.t).filter((t) => /^(passive|object|growth|decision)\./.test(t));
    assert.deepEqual(ev, ['passive.defined', 'passive.gained', 'object.consumed', 'growth.decided', 'decision.closed']);
    assert.deepEqual(g.state().objects['obj.relic'].holder, { consumed: 'pc' });
    assert.equal(Object.values(sheetOf(g).passives)[0].quality, 'legendary');
    assert.deepEqual(validateState(g.state(), content), []);
});

// ------------------------------------------------------------------------------------------------ 9. totals, NPCs, legacy
test('9C-2c (9): shared totals and no candidate of no effect; four slots for an NPC too; nothing of it in a legacy campaign', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    // INT already raised to the total (+6) by his Passives: no INT goal, and a stat still free is fine
    const ord = (n, stat) => ({ ...unrated(`dyn.passive_mind_${n}`, `Mind ${'I'.repeat(n)}`, [{ kind: 'core_stat_bonus', stat, value: 2 }]), quality: 'ordinary' });
    grant(g, ord(1, 'INT'), ord(2, 'INT'), ord(3, 'INT'));
    assert.equal(passiveTotals(sheetOf(g), content).core.INT, 6);
    const text = '*i spend two hours in meditation, drilling my concentration*';
    await say(g, text, ACT('train', { learn: 'INT', minutes: 120, quote: words(text) }));
    assert.match(outcomeOf(g).actions[0], /NOT TRAINING — his Passives raise his mind \(INT\) as far as they can/);
    await reply(g, 'He sits.');
    const w = '*i spend two hours drilling my will*';
    await say(g, w, ACT('train', { learn: 'WIL', minutes: 120, quote: words(w) }));
    assert.match(outcomeOf(g).actions[0], /TRAINS — his will \(WIL\) for 120 minutes on his own/);
    await reply(g, 'He sits.');
    // a legendary source whose every effect the totals leave no room for: no offer of a no-op
    inject(g, engineEvidence(g.state(), content, { key: 'test.noop', quality: 'legendary', why: 'a test', effects: [{ kind: 'core_stat_bonus', stat: 'INT', value: 4 }] }).events);
    await say(g, '*i rest for ten minutes*', ACT('rest', { minutes: 10, quote: 'i rest for ten minutes' }));
    assert.equal(outcomeOf(g).passive_offers, undefined);
    assert.equal(evidenceOf(g.state())['engine:test.noop'].status, 'pending', 'kept, not offered');
    await reply(g, 'He rests.');
    // a rare trial candidate leaves out what would add nothing and keeps the rest
    const h = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    grant(h, unrated('dyn.passive_hide_a', 'Hide A', [{ kind: 'resist', damage_type: 'physical', pct: 10 }]), unrated('dyn.passive_hide_b', 'Hide B', [{ kind: 'resist', damage_type: 'physical', pct: 10 }]), unrated('dyn.passive_hide_c', 'Hide C', [{ kind: 'resist', damage_type: 'physical', pct: 10 }]));
    forge(h, (q) => named(q, 'Ashen Resolve'));
    await wolfFight(h, { start: dv(h).maxHp / 2 });
    assert.deepEqual(passiveOffers(h.state())[0].passive.effects, [{ kind: 'stat_bonus', stat: 'DEF', value: 4 }], 'physical resistance is at its 30% total');
    // an NPC holds four at most as well
    const npc = { ...g.state().entities.pc.sheet, passives: {} };
    inject(g, [{ t: 'entity.created', d: { entity: { id: 'npc.duelist', kind: 'npc', name: 'Rhet', descriptors: ['duelist'], status: 'alive', location: g.state().scene.location, sheet: npc } } }]);
    for (const [i, p] of FOUR.entries()) {
        const d = definePassive(g.state(), content, { ...p, id: `${p.id}_npc`, name: `${p.name} N` });
        inject(g, d.events);
        inject(g, gainPassive(g.state(), content, 'npc.duelist', d.passive.id, 'test').events);
        assert.equal(Object.keys(g.state().entities['npc.duelist'].sheet.passives).length, i + 1);
    }
    const fifth = definePassive(g.state(), content, unrated('dyn.passive_fifth', 'Fifth', [{ kind: 'stat_bonus', stat: 'ATK', value: 1 }]));
    inject(g, fifth.events);
    assert.match(gainPassive(g.state(), content, 'npc.duelist', 'dyn.passive_fifth').errors.join(), /holds 4 Passives already \(4\/4\)/);
    const over = structuredClone(g.state());
    over.entities['npc.duelist'].sheet.passives['dyn.passive_fifth'] = { ...over.passive_defs['dyn.passive_fifth'] };
    assert.ok(validateState(over, content).some((x) => /5 Passives, more than the 4 slots/.test(x)));
    // the engine's events alone: no extractor delta writes evidence, an offer's decision or a loss
    for (const e of [{ t: 'growth.evidence', d: { evidence: { key: 'x' } } }, { t: 'growth.decided', d: { key: 'x' } }, { t: 'passive.lost', d: { id: 'pc', passive: 'x' } }]) {
        assert.equal(eventKind(e), 'pc.progress');
        assert.ok(ownershipViolation({ kind: 'delta', type: 'fact' }, e, null));
    }
    // a legacy campaign: no Passive goal, no evidence, no Passive
    const old = await campaign(legacy, { cls: 'Ranger', skills: 'Aimed Shot + Power Shot' });
    await say(old, text, ACT('train', { learn: 'INT', minutes: 120, quote: words(text) }));
    assert.equal(old.state().growth, undefined);
    assert.match(engineEvidence(old.state(), legacy, CROWN).errors.join(), /ruleset 2/);
    assert.equal(effectiveStats(old.state().entities.pc.sheet, legacy).INT, old.state().entities.pc.sheet.stats.INT);
});

// ------------------------------------------------------------------------------------------------ 10. host path
test('9C-2c (10): the offer\'s Forge name survives a regenerate without a second call; a repair or a fallback names it; a stale turn books nothing', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    let calls = forge(g, (q) => named(q, 'Ashen Resolve'));
    await wolfFight(g);
    assert.equal(calls.length, 1);
    const offer = passiveOffers(g.state())[0];
    await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    assert.equal(calls.length, 1, 'the recorded name is reused');
    assert.deepEqual(passiveOffers(g.state()), [offer]);
    // repair: the first answer invalid, the second fine
    const h = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    calls = forge(h, (q, n) => (n === 1 ? JSON.stringify({ skills: [{ key: 'wrong', name: '12' }] }) : named(q, 'Ashen Resolve')));
    await wolfFight(h);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].purpose, 'forge_repair');
    assert.equal(passiveOffers(h.state())[0].passive.name, 'Ashen Resolve');
    // fallback: two invalid answers keep the engine's own name
    const k = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    forge(k, () => 'not json');
    await wolfFight(k);
    assert.equal(passiveOffers(k.state())[0].passive.name, 'Unbroken Stance');
    assert.equal(lastUser(k).forge.entries[`passive:${passiveOffers(k.state())[0].evidence}`].fallback, true);
    // a turn that went stale while the Forge named the offer: nothing is written
    const m = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    const p = scaleCreature(content.anchors.get('wolf'), 6, 'normal', content);
    inject(m, [
        { t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: Math.ceil(dv(m).maxHp * 0.55) } },
        { t: 'entity.created', d: { entity: { id: 'mon.wolf', kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', status: 'alive', location: m.state().scene.location, profile: { ...p, max_hp: 80, hp: 80 } } } },
        { t: 'scene.entered', d: { id: 'mon.wolf', band: 'MEDIUM', cover: 'none' } },
        { t: 'scene.awareness', d: { id: 'mon.wolf', level: 'aware' } },
    ]);
    for (let i = 0; i < 2; i++) {
        await say(m, '*i cast Arcane Bolt at the wolf*', { type: 'use_skill', skill: 'mage.arcane_bolt', target: 'mon.wolf', quote: 'i cast Arcane Bolt at the wolf' });
        await reply(m, 'The wolf circles.');
    }
    m.chat.push({ mes: '*i cast Arcane Bolt at the wolf*', is_user: true, is_system: false, extra: {} });
    const msg = m.chat.at(-1);
    let current = true;
    const llm = async (q) => {
        if (q.purpose === 'plan') return JSON.stringify({ commands: [{ seq: 1, type: 'use_skill', skill: 'mage.arcane_bolt', target: 'mon.wolf', quote: 'i cast Arcane Bolt at the wolf' }] });
        if (q.purpose.startsWith('forge')) { current = false; return named(q, 'Ashen Resolve'); }
        return m.llm(q);
    };
    const r = await prepareGenerationAsync(m.chat, content, { settings: { planner: true }, llm, isCurrent: () => current });
    assert.deepEqual(r, { action: 'abort', dirty: false, stale: true });
    assert.equal(rec(msg), undefined, 'no record of the turn: no fight end, no evidence, no offer');
});
