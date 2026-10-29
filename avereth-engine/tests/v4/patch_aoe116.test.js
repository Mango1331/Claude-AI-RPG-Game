import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { startCampaign, playerTurn } from '../../src/engine.js';
import { fold, applyEvent } from '../../src/state.js';
import { selectClass, selectSkills } from '../../src/creation.js';
import { scaleCreature } from '../../src/npcgen.js';
import { mapPlan, planContext } from '../../src/v4/planner.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { creationPanel } from '../../src/commands.js';
import { validateState } from '../../src/validate.js';
import { loadGuide } from '../../tools/st_live/live/guide.mjs';
import { scenarioGuide, scenarioMismatch } from '../../tools/st_live/live/scenarios.mjs';
import { playerSystemPrompt } from '../../tools/st_live/live/players.mjs';
const product = await loadProductContent();
const ids = { warrior: 'warrior.cleave', mage: 'mage.arcane_wave', rogue: 'rogue.fan_of_blades' };
function state(cls = 'mage', legacy = false) {
    const events = startCampaign(product, { runtime: 'v4', planner: true, ruleset: 2, seed: 71 });
    if (legacy) delete events[0].d.starter_aoe;
    const s = fold(events);
    selectClass(s, product, cls).events.forEach(e => applyEvent(s, e));
    selectSkills(s, product, cls === 'mage' ? ['mage.arcane_bolt', 'mage.arcane_ward'] : cls === 'warrior' ? ['warrior.heavy_slash', 'warrior.guard'] : ['rogue.razor_cut', 'rogue.evasive_step']).events.forEach(e => applyEvent(s, e));
    return s;
}
// A proposed band effect isolates engine behaviour even on the pre-content baseline.
function setup(shape = 'target_band', range = 'MEDIUM', bands = ['MEDIUM', 'MEDIUM', 'SHORT', 'LONG']) {
    const c = { ...product, skills: new Map(product.skills) };
    const sk = structuredClone(product.skills.get('mage.arcane_burst'));
    Object.assign(sk, { id: 'mage.test_area', name: 'Test Area', range: { band: range, extra_band: false, area: shape }, effects: [{ kind: 'area', shape, shared_rolls: true }] });
    c.skills.set(sk.id, sk);
    const s = state();s.entities.pc.sheet.skills[sk.id] = { prof: 1, pp: 0 };
    bands.forEach((band, i) => {
        const id = `mon.test${i}`;
        s.entities[id] = { id, kind: 'creature', species: 'wolf', anchor: 'wolf', status: 'alive', at: s.scene.at, threat: true,
            profile: { ...scaleCreature(c.anchors.get('wolf'), 1, 'normal', c), hp: 300, max_hp: 300, init: 0, atk: 1 } };
        s.scene.present.push(id);s.scene.positions[id] = { band, cover: 'none', cluster: `different-${i}` };s.scene.awareness[id] = 'aware';
    });
    return { s, c, sk };
}
const attack = (f, extra = {}) => playerTurn(f.s, f.c, 'I cast Test Area at Wolf A.', { c: true, intent: { kind: 'attack', skill: f.sk.id, target: 'mon.test0', ...extra } });
const strikes = r => r.outcome.records.find(x => x.actor === 'pc' && x.kind === 'attack')?.strikes || [];
for (const [cls, id] of Object.entries(ids)) {
    test(`${cls}: new creation offers AoE but still requires exactly two choices`, () => {
        const events = startCampaign(product, { runtime: 'v4', planner: true, ruleset: 2 });const s = fold(events);
        selectClass(s, product, cls).events.forEach(e => applyEvent(s, e));
        assert.ok(product.skills.has(id));assert.match(creationPanel(s, product, {}), new RegExp(product.skills.get(id).name));
        assert.equal(selectSkills(s, product, [id]).events.length, 0);
        const other = product.classes.get(cls).skill_pool[0];const r = selectSkills(s, product, [id, other]);assert.deepEqual(r.errors, undefined);
        r.events.forEach(e => applyEvent(s, e));assert.equal(Object.keys(s.entities.pc.sheet.skills).length, 3);assert.deepEqual(validateState(s, product), []);
    });
}
test('old Mage creation and learned Arcane Burst keep their old definition', () => {
    const s = state('mage', true);s.mode = 'creation';s.creation.step = 2;
    assert.equal(selectSkills(s, product, ['mage.arcane_burst', 'mage.arcane_bolt']).events.length, 1);
    const old = product.skills.get('mage.arcane_burst');assert.equal(old.range.band, 'ENGAGED');assert.equal(old.cost.amount, 14);assert.equal(old.effects[0].shape, 'caster_engaged');
});
for (const band of ['ENGAGED', 'SHORT', 'MEDIUM']) test(`band AoE selects exactly ${band}, independent of clusters`, () => {
    const f = setup('target_band', 'MEDIUM', [band, band, band === 'ENGAGED' ? 'SHORT' : 'ENGAGED', 'LONG']);
    const r = attack(f);assert.equal(r.outcome.illegal, null);assert.deepEqual(strikes(r).map(x => x.target).sort(), ['mon.test0', 'mon.test1']);
    assert.equal(f.s.entities.pc.sheet.mp - r.state.entities.pc.sheet.mp, 14);assert.deepEqual(validateState(r.state, f.c), []);
    const replay = structuredClone(f.s);r.events.forEach(e => applyEvent(replay, e));assert.deepEqual(replay, r.state);
});
test('out of range band costs nothing and starts no encounter', () => {
    const f = setup('target_band', 'SHORT', ['MEDIUM', 'MEDIUM']);const before = f.s.entities.pc.sheet.mp;const r = attack(f);
    assert.ok(r.outcome.illegal);assert.equal(r.state.encounter, null);assert.equal(r.state.entities.pc.sheet.mp, before);
});
test('insufficient MP drags no bystanders into a fight', () => {
    const f = setup();f.s.entities.pc.sheet.mp = 1;const r = attack(f);assert.ok(r.outcome.illegal);assert.equal(r.state.encounter, null);assert.equal(r.state.entities.pc.sheet.mp, 1);
});
test('same-band neutral actor is struck but a nearer neutral is not', () => {
    const f = setup();f.s.entities['mon.test1'].threat = false;f.s.entities['mon.test2'].threat = false;
    assert.deepEqual(strikes(attack(f)).map(x => x.target).sort(), ['mon.test0', 'mon.test1']);
});
test('movement selects the target band after the declared step', () => {
    const f = setup('target_band', 'MEDIUM', ['MEDIUM', 'SHORT', 'MEDIUM']);
    const r = attack(f, { move: 'closer', move_target: 'mon.test0' });
    assert.deepEqual(strikes(r).map(x => x.target).sort(), ['mon.test0', 'mon.test1']);
});
test('an active fight uses current combat bands and includes a same-band outsider', () => {
    const f = setup('target_band', 'MEDIUM', ['MEDIUM', 'MEDIUM', 'SHORT']);
    const opened = attack(f);assert.ok(opened.state.encounter);f.s = opened.state;
    const id = 'mon.outsider';f.s.entities[id] = structuredClone(f.s.entities['mon.test0']);f.s.entities[id].id = id;f.s.scene.present.push(id);f.s.scene.positions[id] = { band: 'SHORT', cover: 'none' };
    f.s.encounter.combatants['mon.test0'].current.band = 'SHORT';f.s.encounter.combatants['mon.test1'].current.band = 'MEDIUM';
    const r = attack(f);assert.ok(strikes(r).some(x => x.target === id));assert.ok(!strikes(r).some(x => x.target === 'mon.test1'));
});
test('legacy caster-engaged AoE still catches only engaged actors', () => {
    const f = setup('caster_engaged', 'ENGAGED', ['ENGAGED', 'ENGAGED', 'SHORT']);assert.equal(strikes(attack(f)).length, 2);
});
test('planner requires a target to identify a band, rather than choosing among different bands', () => {
    const f = setup();const ctx = planContext(f.s, f.c, buildCatalog(f.s, f.c));
    const mapped = mapPlan([{ seq: 1, type: 'use_skill', skill: f.sk.id, target: null, quote: 'I cast Test Area.' }], ctx, f.c, 'I cast Test Area.', f.s);
    assert.ok(mapped.route === 'panel' || ['no_target', 'ambiguous_target'].includes(mapped.intent?.kind));
});
test('unsupported precombat Ward is explicitly not executed and spends nothing', () => {
    const s = state();const r = playerTurn(s, product, 'I cast Arcane Ward.', { c: true, intent: { kind: 'skill', skill: 'mage.arcane_ward' } });
    assert.equal(r.outcome.kind, 'note');assert.match(r.outcome.text, /not executed/i);assert.equal(r.state.entities.pc.sheet.mp, s.entities.pc.sheet.mp);
});
test('in-combat protection continues to execute mechanically', () => {
    const f = setup();f.s = attack(f).state;
    const r = playerTurn(f.s, f.c, 'I cast Arcane Ward.', { c: true, intent: { kind: 'skill', skill: 'mage.arcane_ward' } });
    assert.equal(r.outcome.kind, 'combat');assert.ok(r.outcome.records.some(x => x.skill === 'mage.arcane_ward'));
});
for (const [cls, id] of Object.entries(ids)) test(`runner ${cls} requires its AoE as one skill and leaves tactics free`, () => {
    const g = scenarioGuide(loadGuide('current_test'), `guild-${cls}`);
    const p = playerSystemPrompt(g, { username: 'Alaric' });assert.ok(p.includes(id));assert.match(p, /only when tactically useful/i);
    const s = state(cls);assert.equal(scenarioMismatch(s, g.scenario)?.kind, 'scenario_mismatch');s.entities.pc.sheet.skills[id] = { prof: 1, pp: 0 };assert.equal(scenarioMismatch(s, g.scenario), null);
});

test('same-band actors behind full cover remain unhit', () => {
    const f = setup();f.s.scene.positions['mon.test1'].cover = 'full';
    assert.deepEqual(strikes(attack(f)).map(x => x.target), ['mon.test0']);
});
test('a hidden nominal target does not authorize a ranged area attack', () => {
    const f = setup();f.s.scene.positions['mon.test0'].cover = 'full';const r = attack(f);
    assert.ok(r.outcome.illegal);assert.equal(r.state.entities.pc.sheet.mp, f.s.entities.pc.sheet.mp);assert.equal(r.state.encounter, null);
});
test('active-fight movement recomputes the band before adding a neutral outsider', () => {
    const f = setup();f.s = attack(f).state;
    f.s.encounter.combatants['mon.test0'].current.band = 'MEDIUM';
    const id = 'mon.new_neutral';f.s.entities[id] = structuredClone(f.s.entities['mon.test0']);Object.assign(f.s.entities[id], { id, threat: false });
    f.s.scene.present.push(id);f.s.scene.positions[id] = { band: 'SHORT', cover: 'none' };
    const r = attack(f, { move: 'closer', move_target: 'mon.test0' });assert.ok(strikes(r).some(x => x.target === id));
});
test('new skill menus describe a chosen band rather than an area around the caster', async () => {
    const { skillSummary } = await import('../../src/context.js');
    const text = skillSummary(product.skills.get('mage.arcane_wave'));assert.match(text, /chosen band/i);assert.doesNotMatch(text, /AREA around caster/);
});
test('dynamic validation and evolution retain the new area shape', async () => {
    const { composeSkill, developSkill } = await import('../../src/skill_composer.js');
    const { skillDefErrors } = await import('../../src/skills.js');
    const s = state();const { def } = composeSkill(s, product, { fn: 'bolt', tags: ['Arcane'], origin: { kind: 'teacher' } });
    def.effects = [{ kind: 'area', shape: 'target_band', shared_rolls: true }];def.attack.base = 6;def.attack.scaling[0].coef = 1;
    assert.deepEqual(skillDefErrors(def, product, s), []);
    def.effects[0].shape = 'all_bands';assert.ok(skillDefErrors(def, product, s).length);
    const evolved = developSkill(s, product, product.skills.get('mage.arcane_wave'), 'reach', { origin: { kind: 'evolution' } });
    assert.deepEqual(evolved.errors, []);assert.equal(evolved.def.effects[0].shape, 'target_band');assert.equal(evolved.def.range.band, 'LONG');
});
test('single current_test run detects a missing required AoE without rewriting the character', () => {
    const g = loadGuide('current_test'), s = state('mage');const before = structuredClone(s);
    assert.equal(scenarioMismatch(s, null, g.starterAoe)?.kind, 'scenario_mismatch');assert.deepEqual(s, before);
});
test('complete current Mage creation, planned AoE, extraction and saved-chat reload', async () => {
    const { Chat4 } = await import('./harness.js');
    const { prepareGenerationAsync } = await import('../../src/v4/runtime.js');
    const { rec, foldChat } = await import('../../src/host.js');
    const g = new Chat4(product, { starterAoe: true });await g.player('Mage');await g.player('Arcane Wave + Arcane Bolt');
    assert.ok(g.state().entities.pc.sheet.skills['mage.arcane_wave']);
    const f = setup();const row = rec(g.chat.findLast(m => rec(m)?.events));
    for (const id of ['mon.test0','mon.test1','mon.test2']) {
        row.events.push({ t: 'entity.created', d: { entity: f.s.entities[id] } },{ t: 'scene.entered', d: { id, band: f.s.scene.positions[id].band } });
    }
    const before = g.state().entities.pc.sheet.mp;
    g.chat.push({ mes: 'I cast Arcane Wave at Wolf A.', is_user: true, extra: {} });
    const llm = async req => req.purpose.startsWith('plan') ? JSON.stringify({ commands: [{ seq: 1, type: 'use_skill', skill: 'mage.arcane_wave', target: 'mon.test0', quote: 'I cast Arcane Wave at Wolf A.' }] }) : null;
    await prepareGenerationAsync(g.chat, product, { llm, settings: { planner: true } });
    const user = rec(g.chat.findLast(m => m.is_user));const outcome = user.events.find(e => e.t === 'outcome.recorded').d.outcome;
    assert.equal(outcome.records.find(x => x.actor === 'pc').strikes.length, 2);assert.equal(before - g.state().entities.pc.sheet.mp, 14);
    await g.reply('The wave strikes the two wolves in that band.', { expected: {}, deltas: [] });
    const saved = JSON.parse(JSON.stringify(g.chat));const reload = foldChat(saved);assert.deepEqual(reload.errors, []);assert.deepEqual(reload.state, g.state());assert.deepEqual(validateState(reload.state, product), []);
    // A swipe changes world narration, not the already booked user action.
    saved[saved.length - 1].mes = 'The same resolved wave is seen differently.';
    assert.equal(foldChat(saved).state.entities.pc.sheet.mp, g.state().entities.pc.sheet.mp);
});
