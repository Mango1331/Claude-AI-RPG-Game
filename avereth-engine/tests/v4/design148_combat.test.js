import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent, scriptedDice } from '../helpers.js';
import { playerTurn } from '../../src/engine.js';
import { initEncounter, attackAction } from '../../src/combat.js';
import { applyEvent } from '../../src/state.js';
import { validateState } from '../../src/validate.js';
import { goalText } from '../../src/v4/guild.js';
import { worldPanel } from '../../src/display.js';
const content = await loadProductContent();
const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/batch22_design148.json.gz', import.meta.url))));
const target = f.mage.record.interp.commands[0].target;
const beetles = f.mage.before.scene.present.filter(id => id.startsWith('mon.'));
const act = (s, more = {}) => playerTurn(s, content, f.mage.text, { c: true, intent: { kind: 'attack', target, skill: 'mage.arcane_wave', ...more } });
const strikeIds = r => r.outcome.records.find(r => r.actor === 'pc' && r.kind === 'attack').strikes.map(s => s.target);

test('Batch22 original Wave strikes three SHORT beetles without materialising companion Brenna', () => {
    const s = structuredClone(f.mage.before), r = act(s);
    assert.deepEqual(strikeIds(r).sort(), [...beetles].sort());
    assert.equal(r.events.some(e => e.t === 'npc.materialised' && e.d.id === 'npc.brenna'), false);
    assert.equal(r.state.encounter?.combatants?.['npc.brenna'], undefined);
    assert.equal(r.state.entities['npc.brenna'].sheet, undefined);
    assert.equal(s.entities.pc.sheet.mp - r.state.entities.pc.sheet.mp, 14);
    const reload = structuredClone(s);r.events.forEach(e => applyEvent(reload, JSON.parse(JSON.stringify(e))));
    assert.deepEqual(reload, JSON.parse(JSON.stringify(r.state)));assert.deepEqual(validateState(reload, content), []);
});
for (const ally of [false, true]) test(`explicit attack on ${ally ? 'allied' : 'neutral'} Brenna remains effective and permits a reaction`, () => {
    const s = structuredClone(f.mage.before);
    if (ally) s.relations['rel.npc.brenna.attitude.pc'] = { value: 30 };
    const r = act(s, { target: 'npc.brenna' });
    assert.ok(strikeIds(r).includes('npc.brenna'));
    assert.ok(r.outcome.records.some(x => x.actor === 'npc.brenna'));
});
test('explicit crowd fields retain every intentionally attacked neutral person, but not other bystanders', () => {
    const s = structuredClone(f.mage.before);
    s.entities['npc.second'] = { ...structuredClone(s.entities['npc.brenna']), id: 'npc.second', name: 'Second' };
    s.scene.present.push('npc.second');s.scene.positions['npc.second'] = { band: 'SHORT', cover: 'none' };
    const r = act(s, { target: 'npc.brenna', field: ['npc.brenna', 'npc.second'], crowd: true });
    assert.ok(strikeIds(r).includes('npc.brenna'));assert.ok(strikeIds(r).includes('npc.second'));
});
test('ordinary NPC AoE hits PC and allies; spares its own side and neutral bystanders', () => {
    const s = structuredClone(f.mage.before), dice = scriptedDice({ variance: [1,1,1,1] });
    const enc = initEncounter(s, content, dice, { actor: 'pc', target, skill: 'mage.arcane_wave' }, beetles.map(id => ({ id, side: 'hostile' })), 'enc.parity', { c: true });
    const caster = structuredClone(enc.combatants.pc);caster.id = 'npc.caster';caster.side = 'hostile';caster.current.band = 'SHORT';enc.combatants[caster.id] = caster;
    const ally = structuredClone(enc.combatants.pc);ally.id = 'npc.ally';ally.side = 'ally';ally.current.band = 'ENGAGED';enc.combatants[ally.id] = ally;
    const neutral = structuredClone(ally);neutral.id = 'npc.neutral';neutral.side = 'neutral';enc.combatants[neutral.id] = neutral;
    const r = attackAction({ state: s, content, dice, enc, c: true }, caster.id, 'pc', 'mage.arcane_wave');
    assert.deepEqual(r.strikes.map(x => x.target).sort(), ['npc.ally','pc']);
});
test('full cover, another band, insufficient MP and active encounter do not drag neutral actors in', () => {
    const s = structuredClone(f.mage.before);
    s.scene.positions[beetles[1]].cover = 'full';s.scene.positions[beetles[2]].band = 'MEDIUM';
    const r = act(s);assert.deepEqual(strikeIds(r), [target]);
    const low = structuredClone(s);low.entities.pc.sheet.mp = 0;const no = act(low);
    assert.ok(no.outcome.illegal);assert.equal(no.state.encounter, null);
    if (r.state.encounter) assert.ok(!strikeIds(act(r.state)).includes('npc.brenna'));
});
test('reported hunt danger separates four total kills from the visible six-boar group', () => {
    const s = structuredClone(f.warrior.before), q = s.quests['quest.thin_the_boar_sounder_in_the_tallowwood'];
    const text = goalText(s, content, q, { board: true, danger: true });
    assert.match(text, /4 kills? total/i);assert.match(text, /reported.*L4[–-]7/i);assert.match(text, /group|encounter/i);assert.match(text, /level 2/i);
    const visible = worldPanel(s, content, { state: s, events: [] });
    assert.match(visible, /6 visible/i);assert.match(visible, /contract.*total|total.*contract/i);
    const hidden = structuredClone(s);hidden.scene.concealed.push('mon.boarbig');
    assert.match(worldPanel(hidden, content, { state: hidden, events: [] }), /5 visible/i);
});
test('unknown population levels are not inferred from secret combat profiles; display has no state effects', () => {
    const s = structuredClone(f.warrior.before), before = structuredClone(s);
    const q = { title: 'Unknown hunt', objectives: [{ verb: 'DEFEAT', what: 'boars', qty: 4 }], status: 'listed' };
    assert.doesNotMatch(goalText(s, content, q, { board: true, danger: true }), /reported.*L\d/);
    worldPanel(s, content, { state: s, events: [] });assert.deepEqual(s, before);
});

test('planner preserves explicit multi-person area targets and rejects non-area/absent target lists', async () => {
    const { parsePlan, planContext, mapPlan, withContentSkills } = await import('../../src/v4/planner.js');
    const { buildCatalog } = await import('../../src/v4/catalog.js');
    const s = structuredClone(f.mage.before);
    s.entities['npc.second'] = { ...structuredClone(s.entities['npc.brenna']), id: 'npc.second', name: 'Second' };
    s.scene.present.push('npc.second');s.scene.positions['npc.second'] = { band: 'SHORT', cover: 'none' };
    const text = 'I cast Arcane Wave at Brenna and Second.';
    const c = { seq: 1, type: 'use_skill', skill: 'mage.arcane_wave', target: 'npc.brenna', targets: ['npc.brenna','npc.second'], quote: text };
    const ctx = planContext(s, content, buildCatalog(s, content));
    const parsed = parsePlan(JSON.stringify({ commands: [c] }), content.commandVocab, withContentSkills(ctx, content, s), text);
    assert.deepEqual(parsed.errors, []);
    const mapped = mapPlan(parsed.commands, ctx, content, text, s);
    assert.ok(strikeIds(playerTurn(s, content, text, { c: true, intent: mapped.intent })).includes('npc.second'));
    for (const bad of [{ ...c, skill: 'mage.arcane_bolt' }, { ...c, targets: ['npc.absent'] }]) {
        assert.ok(parsePlan(JSON.stringify({ commands: [bad] }), content.commandVocab, withContentSkills(ctx, content, s), text).errors.length);
    }
});
test('thrown burst keeps physical friendly fire without changing ordinary skill eligibility', () => {
    const s = structuredClone(f.mage.before), dice = scriptedDice({ variance: [1,1,1,1] });
    const enc = initEncounter(s, content, dice, { actor: 'pc', target, skill: 'mage.arcane_wave' }, beetles.map(id => ({ id, side: 'hostile' })), 'enc.burst', { c: true });
    const neutral = structuredClone(enc.combatants.pc);neutral.id = 'npc.neutral';neutral.side = 'neutral';neutral.current.band = 'SHORT';enc.combatants[neutral.id] = neutral;
    const r = attackAction({ state: s, content, dice, enc, c: true }, 'pc', target, 'item.scorchburst', { item: 'obj.test', burst: ['npc.neutral'] });
    assert.equal(r.illegal, undefined);assert.ok(r.strikes.some(x => x.target === 'npc.neutral'));
});

test('untargeted ordinary area never chooses a neutral companion or creates an incidental crowd attack', async () => {
    const { mapPlan, planContext } = await import('../../src/v4/planner.js');
    const { buildCatalog } = await import('../../src/v4/catalog.js');
    const { crowdIntent } = await import('../../src/v4/runtime.js');
    const s=structuredClone(f.mage.before);s.scene.present=['pc','npc.brenna'];s.scene.positions['npc.brenna'].band='ENGAGED';
    const ctx=planContext(s,content,buildCatalog(s,content));
    const mapped=mapPlan([{seq:1,type:'use_skill',skill:'mage.arcane_burst',target:null,quote:'I cast Arcane Burst.'}],ctx,content,'I cast Arcane Burst.',s);
    assert.notEqual(mapped.intent?.target,'npc.brenna');
    s.scene.at='loc.glassmere';s.clock.minute=600;
    assert.equal(crowdIntent(s,content,{kind:'no_target',skill:'mage.arcane_burst'},'I cast Arcane Burst.'),null);
});
