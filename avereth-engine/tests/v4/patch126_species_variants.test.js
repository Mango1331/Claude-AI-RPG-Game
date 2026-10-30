import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';
import { materialise } from '../../src/engine.js';
import { Dice } from '../../src/rng.js';
import { populationAt, namesYoung } from '../../src/v4/domain.js';
import { defeatTally } from '../../src/v4/guild.js';
import { validateState } from '../../src/validate.js';
const c = await loadProductContent();
const samples = JSON.parse(fs.readFileSync(new URL('./fixtures/batch19_boar_variants.json', import.meta.url))).samples;
const sample = i => structuredClone(samples.find(x => x.i === i));
for (const i of [214, 218, 272]) test(`Batch19 original ${i}: species identity survives individual suffixes`, () => {
    const x = sample(i), r = applyWorld(x.state, c, x.answer, { msg: i, prose: x.prose });
    const id = r.events.find(e => e.t === 'entity.created' && e.d.entity.kind === 'creature').d.entity.id;
    const e = r.state.entities[id];
    const pop = populationAt(r.state, r.state.scene.at, e, c, { matchAnchor: false });
    assert.ok(pop, 'same boar species, irrespective of its age/sex');
    if (i === 214) { assert.equal(e.profile.level, 1); assert.ok(namesYoung(c, e.species)); }
    else { assert.equal(e.population_at, pop.id); assert.equal(e.profile.level, i === 272 ? 5 : 6); }
    assert.deepEqual(validateState(r.state, c), []);
    const replay = structuredClone(x.state);
    for (const event of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, event);
    assert.deepEqual(replay, r.state);
    const fixed = structuredClone(e.profile);
    materialise(r.state, c, Dice.from(r.state), event => applyEvent(r.state, event), id);
    assert.deepEqual(e.profile, fixed);
});
test('adult sow contributes a real dead-status kill; young boar counts only for an explicit young objective', () => {
    const x = sample(272), r = applyWorld(x.state, c, x.answer, { msg: 272, prose: x.prose });
    const id = r.events.find(e => e.t === 'entity.created' && e.d.entity.kind === 'creature').d.entity.id;
    const e = r.state.entities[id];
    const q = { history: [{status:'active', turn:r.state.turn}], hunt:{at: populationAt(r.state, r.state.scene.at, e, c, {matchAnchor:false})?.id}, objectives:[{verb:'DEFEAT',what:'wild boar',qty:99}] };
    const before = defeatTally(r.state, c, q)[0].done;
    applyEvent(r.state, {t:'fact.asserted',d:{fact:{id:'f.review.death',s:id,p:'status',o:'dead',since:{turn:r.state.turn,minute:r.state.clock.minute},until:null,visibility:'public',hard:true,source:{kind:'engine'}}}});
    assert.equal(defeatTally(r.state, c, q)[0].done, before + 1);
    e.species = 'wild boar yearling'; // retain a fully valid population binding: the age gate itself must reject it
    assert.equal(defeatTally(r.state, c, q)[0].done, before);
    const young = structuredClone(q); young.objectives[0].what = 'wild boar yearlings';
    assert.equal(defeatTally(r.state, c, young)[0].done, 1);
});
test('ordinary 3/4 rejection in original126 remains correct', () => {
    const x = sample(126), r = applyWorld(x.state, c, x.answer, {msg:126,prose:x.prose});
    assert.ok(r.rejected.some(x => x.rule === 'quest_count' && /3 of 4/.test(x.why)));
});
test('young identification preserves existing vocabulary and does not include sow', () => {
    for (const name of ['wolf cubs','boar piglets','wild boar yearling','wild boar yearlings']) assert.ok(namesYoung(c,name), name);
    assert.equal(namesYoung(c,'wild boar sow'), false);
});
test('suffix handling preserves foreign species, synonyms and actual-location constraints', () => {
    const s = sample(272).state, at = s.scene.at;
    const lookup = species => populationAt(s, at, {species,anchor:'boar'}, c, {matchAnchor:false});
    for (const species of ['wild boar sow','wild boar female','wild boar yearling','wild hog male']) assert.ok(lookup(species), species);
    for (const species of ['giant snapping turtle sow','giant wolf yearling','sow']) assert.equal(lookup(species), null, species);
    assert.equal(populationAt(s, 'loc.alderwatch', {species:'wild boar sow',anchor:'boar'}, c,{matchAnchor:false}),null);
});

test('an explicitly young animal does not inherit an adult area window', () => {
    const x = sample(214);
    x.state.places[x.state.scene.at].encounter_levels = [12,14];
    const r = applyWorld(x.state,c,x.answer,{msg:214,prose:x.prose});
    const id = r.events.find(e => e.t === 'entity.created' && e.d.entity.kind === 'creature').d.entity.id;
    assert.equal(r.state.entities[id].profile.level,1);
    assert.equal(r.state.entities[id].population_at,undefined);
});
test('an explicitly established juvenile population keeps its own fixed window', () => {
    const x = sample(214);
    const p = Object.values(x.state.places).find(p => p.population?.species === 'wild boar');
    p.population.species = 'wild boar yearling';
    const r = applyWorld(x.state,c,x.answer,{msg:214,prose:x.prose});
    const id = r.events.find(e => e.t === 'entity.created' && e.d.entity.kind === 'creature').d.entity.id;
    assert.equal(r.state.entities[id].profile.level,6);
    assert.equal(r.state.entities[id].population_at,p.id);
});
