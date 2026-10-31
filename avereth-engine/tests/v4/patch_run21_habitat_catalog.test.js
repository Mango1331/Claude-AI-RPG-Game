import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';
import { materialise } from '../../src/engine.js';
import { Dice } from '../../src/rng.js';
import { setFactEvents } from '../../src/knowledge.js';
import { defeatTally } from '../../src/v4/guild.js';
import { buildCatalog, extractorCatalog } from '../../src/v4/catalog.js';
import { parseExtraction } from '../../src/v4/extract.js';
import { extractionRequest, processReplyAny, runExtraction } from '../../src/v4/runtime.js';
import { foldChat, rec } from '../../src/host.js';
import { hash32 } from '../../src/util.js';
import { campaign, inject, say } from './patch8_lib.js';
// Package C (.132): original answers predate the population contract; the documented conversion (tools/replay/contract_c.mjs)
import { contractValue } from '../../tools/replay/contract_c.mjs';

const content = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run21_habitat_catalog.json', import.meta.url)));
const site = 'realm.caelreth.the_mill_road_treeline_east_of_barrowford';
const quest = 'quest.thin_the_mill_road_wolves';
const copy = structuredClone;
const world = sample => applyWorld(copy(sample.state), content, contractValue(copy(sample.answer), copy(sample.state), content), { msg: sample.i, prose: sample.prose });
const on = (s, events = []) => e => { events.push(copy(e)); applyEvent(s, e); };

for (const sample of f.world) test(`Run21 i${sample.i}: original gray wolves inherit the outdoor habitat despite rooms:true`, () => {
    const r = world(sample);
    const ids = r.events.filter(e => e.t === 'entity.created' && e.d.entity.kind === 'creature').map(e => e.d.entity.id);
    assert.ok(ids.length);
    assert.equal(r.state.places[site].rooms, true, 'room navigation stays intact');
    for (const id of ids) {
        const e = r.state.entities[id];
        assert.ok(e.profile.level >= 4 && e.profile.level <= 7, `${id}: level ${e.profile.level}`);
        assert.equal(e.population_at, site);
    }
});

test('Run21 habitat kills count once through movement, replay and reload; fixed profiles stay fixed', () => {
    const sample = f.world[1], r = world(sample), s = r.state, events = [...r.events];
    const id = 'mon.monfeeding_gray_wolf', profile = copy(s.entities[id].profile), emit = on(s, events);
    assert.equal(s.entities[id].population_at, site);
    emit({ t: 'entity.updated', d: { id, set: { at: 'loc.barrowford', left: { at: 'loc.barrowford', turn: s.turn } } } });
    s.entities.pc.sheet.level = 14;
    materialise(s, content, Dice.from(s), emit, id);
    assert.deepEqual(s.entities[id].profile, profile);
    setFactEvents(s, { s: id, p: 'status', o: 'dead', source: { kind: 'engine' } }).forEach(emit);
    assert.equal(defeatTally(s, content, s.quests[quest])[0].killed, 1);
    const replay = copy(sample.state);
    for (const e of JSON.parse(JSON.stringify(events))) applyEvent(replay, e);
    assert.equal(defeatTally(replay, content, replay.quests[quest])[0].killed, 1);
    assert.deepEqual(replay.entities[id], s.entities[id]);
});

test('Run21 habitat guard preserves true Dungeons, foreign species, explicit weak levels and existing profiles', () => {
    const base = world(f.world[1]).state;
    for (const variant of ['true dungeon', 'foreign species', 'elsewhere', 'explicit weak', 'already fixed']) {
        // B1 (.130): a campaign without the F flags is no variant of its own any more (refused by its start build)
        const s = copy(base), id = 'mon.guard_probe';
        const e = { id, kind: 'creature', species: 'gray wolf', anchor: 'wolf', met_at: site, status: 'alive' };
        if (variant === 'true dungeon') s.places[site].dungeon = { real: true, rank: { min: 'F', max: 'F' }, levels: {}, hidden: [], heard: [] };
        if (variant === 'foreign species') { e.species = 'rat'; e.anchor = 'rat'; }
        if (variant === 'elsewhere') e.met_at = 'loc.barrowford';
        if (variant === 'explicit weak') e.level = 1;
        if (variant === 'already fixed') e.profile = copy(s.entities['mon.monfeeding_gray_wolf'].profile);
        s.entities[id] = e;
        const before = copy(e.profile);
        materialise(s, content, Dice.from(s), on(s), id);
        assert.equal(e.population_at, undefined, variant);
        if (before) assert.deepEqual(e.profile, before);
    }
});

test('Run21 T90: the active visited hunt site is a valid shared Planner/Extractor reference', () => {
    const s = copy(f.t90.state), planner = buildCatalog(s, content, { c: true }), extractor = extractorCatalog(s, content, { c: true });
    assert.ok(planner.places.some(p => p.id === site));
    assert.ok(extractor.places.includes(site));
    const p = parseExtraction(JSON.stringify(f.t90.answer263), content.deltaVocab, { places: extractor.places, quests: extractor.quests, objects: extractor.objects }, s.last.outcome.expected_keys, { startScene: s.scene.at, sceneRequired: true });
    assert.equal(p.valid, true, p.errors.join('; '));
    assert.equal(p.complete, true);
    const r = applyWorld(s, content, contractValue(p.value, s, content), { msg: 180, prose: f.t90.prose });
    assert.equal(r.state.scene.at, site);
    assert.equal(r.events.filter(e => e.t === 'scene.moved').length, 1);
    assert.equal(r.events.some(e => e.t === 'quest.ready' || e.t === 'coin.changed' || e.t === 'xp.changed'), false);
});

test('Run21 catalog adds only active typed destinations and does not reveal hidden Dungeon rooms', () => {
    const s = copy(f.t90.state), baseline = buildCatalog(s, content, { c: true }).places.map(p => p.id);
    assert.ok(baseline.includes(site));
    s.quests[quest].status = 'completed';
    assert.equal(buildCatalog(s, content, { c: true }).places.some(p => p.id === site), false);
    s.quests[quest].status = 'active';
    s.places['loc.hidden_hunt_room'] = { id: 'loc.hidden_hunt_room', name: 'hidden room', kind: 'interior', parent: site, realm: 'realm.caelreth' };
    s.quests[quest].hunt.at = 'loc.hidden_hunt_room';
    assert.equal(extractorCatalog(s, content, { c: true }).places.includes('loc.hidden_hunt_room'), false);
    delete s.quests[quest].hunt;
    assert.equal(buildCatalog(s, content, { c: true }).places.some(p => p.id === site), false, 'legacy free text adds no invented destination');
});

test('Run21 known target in the catalog does not authorize travel or relax malformed fact subjects', () => {
    const s = copy(f.t90.state), cat = extractorCatalog(s, content, { c: true });
    const opts = { places: cat.places, quests: cat.quests, objects: cat.objects };
    const invalid = copy(f.t90.answer263); invalid.scene = 'loc.invented';
    assert.equal(parseExtraction(JSON.stringify(invalid), content.deltaVocab, opts, s.last.outcome.expected_keys, { startScene: s.scene.at, sceneRequired: true }).valid, false);
    const repair = parseExtraction(JSON.stringify(f.t90.answer264), content.deltaVocab, opts, s.last.outcome.expected_keys, { startScene: s.scene.at, sceneRequired: true });
    assert.ok(repair.errors.some(e => e.includes('.s: expected string')));
    const before = s.scene.at;
    s.last.outcome.auth = { c: true, gos: [] }; s.last.outcome.expected_keys = {};
    const r = applyWorld(s, content, contractValue({ scene: site, expected: {}, deltas: [{ seq: 1, type: 'arrive', at: site, with: null, forced_by: null }] }, s, content), { msg: 180, prose: f.t90.prose });
    assert.equal(r.state.scene.at, before);
    assert.ok(r.rejected.some(e => e.rule === 'no_go'));
});

test('Run21 T90 original response applies once through runtime, reload and a new swipe', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Blink', fProgression: true });
    inject(g, [
        // .127: places the product campaign already has (realm.caelreth) are not created twice (Paket A fold integrity)
        ...['realm.caelreth', 'loc.barrowford', 'loc.barrowford.the_shepherds_house', site].filter(id => !g.state().places[id]).map(id => ({ t: 'place.created', d: { place: copy(f.t90.state.places[id]) } })),
        { t: 'quest.created', d: { quest: copy(f.t90.state.quests[quest]) } },
        { t: 'scene.moved', d: { at: f.t90.state.scene.at, location: 'realm.caelreth', place: 'the shepherds house', reset_present: true } },
    ]);
    await say(g, f.t90.input, ...JSON.parse(f.t90.commands).commands);
    const id = g.chat.push({ mes: f.t90.prose, is_user: false, is_system: false, extra: {}, swipe_id: 0, swipes: [f.t90.prose], swipe_info: [{ extra: {} }] }) - 1;
    processReplyAny(g.chat, id, content);
    const req = extractionRequest(g.chat, id, content);
    assert.ok(req.ids.places.includes(site));
    let calls = 0;
    // The new GO barrier does not ask for an outcome for the unperformed search.
    const answer = copy(f.t90.answer263);
    answer.expected = Object.fromEntries(Object.entries(answer.expected).filter(([k]) => req.expectedKeys[k]));
    const llm = async () => { calls++; return JSON.stringify(answer); };
    assert.equal((await runExtraction(g.chat, id, content, llm)).applied, true);
    assert.equal(calls, 1, 'the original first response needs no repair');
    assert.equal(rec(g.chat[id]).events.filter(e => e.t === 'extract.applied').length, 1);
    assert.equal(g.state().scene.at, site);
    assert.deepEqual(g.chat[id].swipe_info[0].extra.avereth.events, rec(g.chat[id]).events);
    const reload = JSON.parse(JSON.stringify(g.chat));
    assert.equal(foldChat(reload).state.scene.at, site);
    assert.equal((await runExtraction(reload, id, content, llm)).changed, false);
    assert.equal(calls, 1);
    const original = copy(reload[id].extra);
    reload[id].swipe_id = 1; reload[id].mes = 'Alaric remains at the house.';
    reload[id].extra = {};
    assert.equal(foldChat(reload).state.scene.at, f.t90.state.scene.at, 'old swipe arrival is absent');
    processReplyAny(reload, id, content);
    const other = await runExtraction(reload, id, content, async () => JSON.stringify({ scene: 'here', expected: { 1: { done: false, minutes: 0 }, 2: { arrived: false, at: null, with: null } }, deltas: [] }));
    assert.equal(other.applied, true);
    assert.equal(foldChat(reload).state.scene.at, f.t90.state.scene.at);
    reload[id].swipe_id = 0; reload[id].mes = f.t90.prose; reload[id].extra = original;
    assert.equal(rec(reload[id]).text_hash, hash32(f.t90.prose));
    assert.equal(foldChat(reload).state.scene.at, site);
    assert.equal(rec(reload[id]).events.filter(e => e.t === 'extract.applied').length, 1);
});
