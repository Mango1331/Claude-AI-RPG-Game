// Architecture package C (.132, patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md §5): explicit population
// membership and life stage of creatures, hunt credit by membership, age and level window, and the reference lock for
// refused creatures. The originals of Batch18/19 are in patch124_territories and patch126_species_variants.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { emptyState, applyEvent } from '../../src/state.js';
import { startCampaign } from '../../src/engine.js';
import { applyWorld } from '../../src/v4/world.js';
import { parseExtraction } from '../../src/v4/extract.js';
import { extractorCatalog } from '../../src/v4/catalog.js';
import { defeatTally, parseBoard, bookBoard } from '../../src/v4/guild.js';
import { populationAt } from '../../src/v4/domain.js';
import { creatureContract, populationsAt } from '../../src/v4/population.js';
import { validateState } from '../../src/validate.js';
import { rec, foldChat } from '../../src/host.js';
import { runExtraction, processReplyAny } from '../../src/v4/runtime.js';
import { campaign, say, inject } from './patch8_lib.js';

const c = await loadProductContent();
const clone = structuredClone;
const REALM = 'realm.valedorn_crown';
function world() {
    const s = emptyState();
    for (const e of startCampaign(c, { runtime: 'v4', ruleset: 2, planner: true, seed: 7 })) applyEvent(s, e);
    const place = (id, name, kind, parent, population) => {
        s.places[id] = { id, name, kind, parent, realm: REALM, tags: [], ...(population ? { population } : {}) };
    };
    place('loc.wood', 'Hartwood', 'wilderness', REALM, { species: 'wild boar', anchor: 'boar', levels: [4, 7] });
    place('loc.wood.glade', 'Oak glade', 'site', 'loc.wood');
    place('loc.moor', 'Red moor', 'wilderness', REALM, { species: 'red deer', anchor: 'deer', levels: [4, 7] });
    place('loc.ridge', 'Wolf ridge', 'wilderness', REALM, { species: 'grey wolf', anchor: 'wolf', levels: [8, 11] });
    place('loc.pond', 'Mill pond', 'site', REALM, { species: 'giant snapping turtles', anchor: 'aquatic', levels: [4, 7] });
    s.scene.at = 'loc.wood.glade';
    s.last.outcome = { c: true, auth: { c: true, gos: [] }, expected_keys: {} };
    return s;
}
const beast = (ref, more = {}) => ({ type: 'creature.new', ref, species: 'wild boar', anchor: 'boar', desc: [], count: 1, present: true, band: 'MEDIUM', cluster: null,
    stronger: null, threat: null, more: true, population: 'loc.wood', life_stage: 'adult', ...more });
const apply = (s, deltas, prose = 'The story goes on.', expected = {}) => applyWorld(s, c, { scene: 'here', expected, deltas: deltas.map((d, i) => ({ seq: i + 1, ...d })) }, { msg: 50, prose });
const creatures = (s) => Object.values(s.entities).filter((e) => e.kind === 'creature');
const dead = (s, id) => applyEvent(s, { t: 'fact.asserted', d: { fact: { id: `f.test.${id}.dead`, s: id, p: 'status', o: 'dead', since: { turn: s.turn, minute: s.clock.minute }, until: null, visibility: 'public', importance: 0.9, hard: true, source: { kind: 'engine' } } } });
const replayed = (s, r) => { const x = clone(s); for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(x, e); return x; };

test('C1: stag, hind, alpha and tusker are members by the report, without any word list; the old name reading missed them', () => {
    for (const [species, anchor, at, levels] of [['old tusker', 'boar', 'loc.wood', [4, 7]], ['red stag', 'deer', 'loc.moor', [4, 7]], ['hind', 'deer', 'loc.moor', [4, 7]], ['alpha', 'wolf', 'loc.ridge', [8, 11]]]) {
        const s = world();
        s.scene.at = at;
        const r = apply(s, [beast('x', { species, anchor, population: at })]);
        const [e] = creatures(r.state);
        assert.ok(e, `${species}: ${JSON.stringify(r.rejected)}`);
        assert.deepEqual([e.population_at, e.life_stage, e.species, e.anchor], [at, 'adult', species, anchor], species);
        assert.ok(e.profile.level >= levels[0] && e.profile.level <= levels[1], `${species} L${e.profile.level}`);
        assert.deepEqual(validateState(r.state, c), []);
        assert.deepEqual(replayed(s, r), r.state);
        if (species !== 'red stag') assert.equal(populationAt(s, at, { species, anchor }, c, { matchAnchor: false }), null, `the .126 name reading did not bind ${species}`);
    }
});

test('C1: a population of another place, an unknown id, a missing or unclear statement are refused; independent stands', () => {
    for (const [population, life_stage, why] of [['loc.pond', 'adult', /no population of Oak glade/], ['loc.nowhere', 'adult', /no population of/], [null, 'adult', /population is required/],
        ['loc.wood', 'juvenile', /life_stage must be/], ['loc.wood', null, /life_stage must be/]]) {
        const s = world(), r = apply(s, [beast('boar', { population, life_stage })]);
        assert.equal(creatures(r.state).length, 0, String(population));
        assert.match(r.rejected.find((x) => x.rule === 'population').why, why);
        assert.ok(r.record?.corrections?.some?.((t) => /not booked/.test(t)) ?? true);
    }
    const s = world(), r = apply(s, [beast('boar', { population: 'independent' })]);
    const [e] = creatures(r.state);
    assert.equal(e.population_at, undefined, 'independent is no membership');
    assert.equal(e.life_stage, 'adult');
    assert.ok(e.profile.level >= 1 && e.profile.level <= 3, 'the wilderness window, not the population\'s');
});

test('C1: a remote sighting is validated at the place its scene names, never at Alaric\'s; membership is no presence', () => {
    const s = world();
    const seen = { species: 'giant snapping turtle', anchor: 'aquatic', present: false, band: null, scene: 'loc.pond', population: 'loc.pond' };
    const r = apply(s, [beast('turtle', seen)]);
    const [e] = creatures(r.state);
    assert.deepEqual([e.population_at, e.profile, r.state.scene.present.includes(e.id)], ['loc.pond', undefined, false]);
    const blind = apply(world(), [beast('turtle', { ...seen, scene: null })]);
    assert.match(blind.rejected.find((x) => x.rule === 'population').why, /no population of an established sighting place/);
    assert.equal(creatures(apply(world(), [beast('turtle', { ...seen, scene: null, population: 'independent' })]).state).length, 1);
    // the PC's own place is no evidence for a sighting elsewhere: the glade's boar population is not the pond's
    assert.match(apply(world(), [beast('turtle', { ...seen, population: 'loc.wood', anchor: 'boar', species: 'wild boar' })]).rejected[0].why, /no population of Mill pond/);
});

test('C1: GiantBoar ≠ Turtle: a body plan the population does not hold is no member', () => {
    const s = world();
    s.scene.at = 'loc.pond';
    const r = apply(s, [beast('boar', { species: 'giant boar', population: 'loc.pond' })]);
    assert.match(r.rejected[0].why, /holds giant snapping turtles \(body plan aquatic\); giant boar \(body plan boar\) is no member/);
});

test('C1: inside a true Dungeon no outdoor membership, also not through the Dungeon\'s outer ancestors', () => {
    const s = world();
    s.places['loc.wood.barrow'] = { id: 'loc.wood.barrow', name: 'Old barrow', kind: 'site', parent: 'loc.wood', realm: REALM, tags: [], dungeon: { real: true, rank: { min: 'F', max: 'F' }, levels: {}, hidden: [], heard: [] } };
    s.scene.at = 'loc.wood.barrow';
    assert.deepEqual(populationsAt(s, 'loc.wood.barrow'), [], 'the boar wood above it does not reach inside');
    const bat = { species: 'cave bat', anchor: 'raptor', threat: false };
    const outer = apply(s, [beast('bat', { ...bat, population: 'loc.wood' })]);
    assert.match(outer.rejected.find((x) => x.rule === 'population').why, /outdoor population; a creature inside the Dungeon Old barrow belongs to none/);
    for (const population of ['independent', null]) {
        const r = apply(s, [beast('bat', { ...bat, population, life_stage: null })]);
        assert.ok(!r.rejected.some((x) => x.rule === 'population'), String(population));
        for (const e of creatures(r.state)) assert.equal(e.population_at, undefined);
    }
});

test('C2: adult and young members: own levels, separate credit by the hunt\'s stated age; death before acceptance never counts', () => {
    const s = world();
    const r = apply(s, [beast('sow'), beast('piglet', { species: 'wild boar piglet', life_stage: 'young' })]);
    const [sow, piglet] = ['sow', 'piglet'].map((k) => creatures(r.state).find((e) => e.id.includes(k)));
    assert.deepEqual([sow.population_at, piglet.population_at, sow.life_stage, piglet.life_stage], ['loc.wood', 'loc.wood', 'adult', 'young']);
    assert.ok(sow.profile.level >= 4 && sow.profile.level <= 7);
    assert.ok(piglet.profile.level <= 3, 'the young never take the adults\' window');
    const hunt = (age, turn = r.state.turn) => ({ id: `quest.${age}`, status: 'active', history: [{ status: 'active', turn }], hunt: { at: 'loc.wood', age }, objectives: [{ verb: 'DEFEAT', what: 'wild boar', qty: 5 }] });
    const t = r.state;
    dead(t, sow.id); dead(t, piglet.id);
    assert.equal(defeatTally(t, c, hunt('adult'))[0].done, 1);
    assert.equal(defeatTally(t, c, hunt('young'))[0].done, 1);
    assert.equal(defeatTally(t, c, hunt('adult', t.turn + 1))[0].done, 0, 'killed before the contract was taken');
});

test('C2: an explicitly weaker grown member stays a member but earns no credit; its own name decides nothing', () => {
    const s = world(), r = apply(s, [beast('runt', { species: 'scrawny old hog' })]);
    const [e] = creatures(r.state);
    const t = r.state;
    applyEvent(t, { t: 'entity.updated', d: { id: e.id, set: { profile: { ...e.profile, level: 2 } } } }); // an explicitly weaker individual (precondition)
    dead(t, e.id);
    const q = { status: 'active', history: [{ status: 'active', turn: 0 }], hunt: { at: 'loc.wood', age: 'adult' }, objectives: [{ verb: 'DEFEAT', what: 'wild boar', qty: 2 }] };
    assert.equal(t.entities[e.id].population_at, 'loc.wood');
    assert.equal(defeatTally(t, c, q)[0].done, 0);
    applyEvent(t, { t: 'entity.updated', d: { id: e.id, set: { profile: { ...e.profile, level: 5 } } } });
    assert.equal(defeatTally(t, c, q)[0].done, 1, 'inside the window it counts, though it is no "wild boar" by name');
});

test('C2: a hunt states its age at publication; a hunt of the young needs young in its objective, an adult one none', () => {
    const s = world(), branch = REALM;
    const need = { branch, rank: 'Novice', day: 1, have: [], missing: 1, c: true, profile: 'hunt_clear', progression: true };
    const listing = (what, life_stage) => ({ title: `Cull ${what}`, client: 'farmers', rank: 'Novice', level: 5, qtype: 'standard', payout_cp: 120, task: `Cull ${what}.`, desired_end_state: `The ${what} are culled.`,
        objectives: [{ verb: 'DEFEAT', what, qty: 2, unit: null, where: 'Hartwood' }], proof: [], habitat: { species: 'wild boar', anchor: 'boar', min_level: 4, max_level: 7, ...(life_stage !== undefined ? { life_stage } : {}) } });
    const refused = (l) => parseBoard(JSON.stringify({ listings: [l] }), c, need, s).refused.map((x) => x.why).join(' ');
    assert.match(refused(listing('wild boar piglets', null)), /a hunt of the young states life_stage "young"/);
    assert.match(refused(listing('wild boars', 'young')), /needs a DEFEAT objective that names the young/);
    assert.doesNotMatch(refused(listing('lamb-rending boars', null)), /life_stage/, '"lamb-rending" names no young hunt');
    for (const [what, life_stage, age] of [['wild boars', undefined, 'adult'], ['wild boar piglets', 'young', 'young']]) {
        const t = clone(s), r = parseBoard(JSON.stringify({ listings: [listing(what, life_stage)] }), c, { ...need, profile: undefined }, t);
        const events = [];
        bookBoard(t, c, need, r.listings.length ? r.listings : [listing(what, life_stage)], (e) => { events.push(e); applyEvent(t, e); });
        const q = Object.values(t.quests).find((x) => x.hunt);
        assert.equal(q?.hunt.age, age, `${what}: ${JSON.stringify(r)}`);
    }
});

test('C3: two sows of one population stay two; a wounded sow coming back keeps her id and HP despite another description', () => {
    const s = world();
    const r = apply(s, [beast('sow_a', { species: 'wild boar sow', desc: ['a sow rooting in the mire'] }), beast('sow_b', { species: 'wild boar sow', desc: ['a second sow'] })]);
    const sows = creatures(r.state);
    assert.equal(sows.length, 2);
    assert.ok(sows.every((e) => e.population_at === 'loc.wood'));
    const t = r.state, [a, b] = sows;
    applyEvent(t, { t: 'entity.updated', d: { id: a.id, set: { profile: { ...a.profile, hp: 7 } } } }); // she was hurt in a fight
    for (const id of [a.id, b.id]) {
        applyEvent(t, { t: 'scene.left', d: { id } });
        applyEvent(t, { t: 'entity.updated', d: { id, set: { left: { at: t.scene.at, minute: t.clock.minute, turn: t.turn, leg: false } } } });
    }
    applyEvent(t, { t: 'fact.asserted', d: { fact: { id: 'f.test.b.dead', s: b.id, p: 'status', o: 'dead', since: { turn: t.turn, minute: t.clock.minute }, until: null, visibility: 'public', importance: 0.9, hard: true, source: { kind: 'engine' } } } });
    t.last.outcome = { c: true, auth: { c: true, gos: [] }, expected_keys: {} };
    const back = apply(t, [beast('limping sow', { species: 'wild boar sow', desc: ['limping, blood dried on her flank'], more: null })]);
    assert.equal(creatures(back.state).length, 2, 'no third sow');
    assert.ok(back.state.scene.present.includes(a.id));
    assert.equal(back.state.entities[a.id].profile.hp, 7);
});

test('C3: a group grows by its own ref; every newcomer is a member of the population', () => {
    const s = world();
    const r = apply(s, [beast('sounder', { count: 2 })]);
    const t = r.state;
    t.last.outcome = { c: true, auth: { c: true, gos: [] }, expected_keys: {} };
    const group = creatures(t)[0].group;
    const more = apply(t, [beast(group, { more: true })]);
    const all = creatures(more.state);
    assert.equal(all.length, 3);
    assert.ok(all.every((e) => e.group === group && e.population_at === 'loc.wood'));
});

test('C3: a refused tusker takes its hostile with it; the boar already here is not turned on Alaric through the resolver', () => {
    const s = world();
    const first = apply(s, [beast('boar')]);
    const t = first.state;
    t.last.outcome = { c: true, auth: { c: true, gos: [] }, expected_keys: {} };
    const r = apply(t, [beast('tusker', { species: 'old tusker', population: 'loc.pond' }), { type: 'hostile', by: ['tusker'], scope: null, evidence: 'The tusker charges.' },
        { type: 'aware', who: 'tusker', level: 'aware', scope: null, evidence: 'The tusker sees him.' }], 'The tusker charges. The tusker sees him.');
    assert.equal(creatures(r.state).length, 1);
    assert.deepEqual(r.rejected.map((x) => x.rule), ['population', 'creature_continuity', 'creature_continuity']);
    assert.equal(r.state.encounter, null);
    assert.equal(r.state.scene.awareness[creatures(r.state)[0].id], t.scene.awareness[creatures(t)[0].id]);
});

test('C1: a refused creature leaves the report\'s arrival and other facts standing', () => {
    const s = world();
    s.scene.at = 'loc.moor';
    s.last.outcome = { c: true, auth: { c: true, go: { seq: 1, to: 'loc.wood' }, gos: [{ seq: 1, to: 'loc.wood' }], timeCap: 180 }, expected_keys: { 1: 'go' } };
    const r = applyWorld(s, c, { scene: 'loc.wood', expected: { 1: { arrived: true, at: 'loc.wood', with: null } }, deltas: [
        { seq: 1, type: 'arrive', at: 'loc.wood', with: null, forced_by: null },
        { seq: 2, ...beast('stray', { species: 'stray dog', anchor: 'wolf', population: 'loc.wood' }), scene: 'loc.wood' },
        { seq: 3, type: 'fact', s: 'loc.wood', p: 'weather', o: 'light rain', scene: 'loc.wood' },
    ] }, { msg: 51, prose: 'Alaric reaches the wood in light rain. A stray dog slinks between the trees.' });
    assert.equal(r.state.scene.at, 'loc.wood');
    assert.equal(creatures(r.state).length, 0);
    assert.ok(r.events.some((e) => e.t === 'fact.asserted' && e.d.fact.p === 'weather'));
    assert.deepEqual(r.rejected.map((x) => x.rule), ['population']);
});

test('C1: the parser reports the same issues as a repairable semantic issue, never as a schema error; the catalog names the populations', () => {
    const s = world();
    const ids = extractorCatalog(s, c, { c: true });
    assert.match(ids.text, /loc\.wood \[wilderness[^\]]*population:wild boar, boar, levels 4-7/);
    const parse = (d) => parseExtraction(JSON.stringify({ scene: 'here', expected: {}, deltas: [{ seq: 1, ...d }] }), c.deltaVocab, { places: [...ids.places, 'loc.pond'], quests: ids.quests, objects: ids.objects }, {}, { sceneRequired: true, startScene: s.scene.at, state: s, content: c });
    const ok = parse(beast('boar'));
    assert.deepEqual([ok.valid, ok.issues], [true, []]);
    for (const [d, why] of [[{ population: undefined, life_stage: undefined }, /life_stage must be/], [{ population: undefined }, /population is required/], [{ population: 'loc.pond' }, /no population of Oak glade/]]) {
        const delta = { ...beast('boar'), ...d };
        for (const k of Object.keys(d)) if (d[k] === undefined) delete delta[k];
        const p = parse(delta);
        assert.equal(p.valid, true, 'optional transport fields: no schema error');
        assert.match(p.issues.map((x) => x.why).join(' '), why);
    }
    assert.equal(creatureContract(s, c, 'loc.wood.glade', beast('boar')).population, 'loc.wood');
});

test('C1 runtime: a missing membership is repaired through the existing second call and booked once; replay, reload and swipe agree', async () => {
    const g = await campaign(c);
    const at = g.state().scene.at;
    inject(g, [{ t: 'place.created', d: { place: { id: 'loc.test_wood', name: 'Test wood', kind: 'wilderness', parent: at, realm: REALM, tags: [], population: { species: 'wild boar', anchor: 'boar', levels: [4, 7] } } } },
        { t: 'scene.moved', d: { at: 'loc.test_wood', location: REALM, place: 'Test wood' } }]);
    await say(g, '*I look around the wood.*', { type: 'other', what: 'look around', quote: 'I look around the wood.' });
    const bare = { scene: 'here', expected: {}, deltas: [{ seq: 1, ...beast('boar', { population: undefined }) }] };
    delete bare.deltas[0].population;
    const fixed = { scene: 'here', expected: {}, deltas: [{ seq: 1, ...beast('boar', { population: 'loc.test_wood' }) }] };
    const answers = [bare, fixed], asked = [];
    g.chat.push({ mes: 'A wild boar roots between the trees.', is_user: false, is_system: false, extra: {} });
    const id = g.chat.length - 1;
    processReplyAny(g.chat, id, c, {});
    await runExtraction(g.chat, id, c, async (req) => { asked.push(req.purpose); return JSON.stringify(answers.shift()); });
    assert.deepEqual(asked, ['extract', 'extract_repair']);
    assert.match(asked.length && JSON.stringify(rec(g.chat[id]).extraction), /"repaired":true/);
    const state = foldChat(g.chat).state;
    const boars = Object.values(state.entities).filter((e) => e.kind === 'creature');
    assert.deepEqual(boars.map((e) => e.population_at), ['loc.test_wood']);
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state, state, 'reload');
    assert.equal((await runExtraction(g.chat, id, c, () => { throw Error('asked again'); })).changed, false, 'an applied reply is never asked again');
    // a swipe of the reply is a new text: its own extraction; the first swipe's creature is not doubled
    g.chat[id] = { ...g.chat[id], mes: 'A boar snorts in the wood.', extra: {} };
    processReplyAny(g.chat, id, c, {});
    await runExtraction(g.chat, id, c, async () => JSON.stringify(fixed));
    assert.equal(Object.values(foldChat(g.chat).state.entities).filter((e) => e.kind === 'creature').length, 1);
});
