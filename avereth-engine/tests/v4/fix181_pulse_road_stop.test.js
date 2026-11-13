// Build .181 – Patch 2 of the natural NPC/PULSE batch 12./13.11.2026 (testrun_10b/npc-20261112-220625Z/REVIEW.md on
// main: GPT §§3–4, Fable §8.3 H and §8.4 P2-2, GPT §9.3). An OPEN PULSE window on an authorized leg tells the story
// "It is a real stop short of <there>"; when the reply then reports no arrive and no arrival, the engine books him on
// the road of the land he set out in (its realm) before the reply's deltas. .101's rule stays: a missing arrive alone
// moves nobody (closed window, scene window, no GO, a reported arrive: .180's handling).
// The original ZIP is not in the repository (SOURCE_MANIFEST.md): the turns are rebuilt from the review's account of
// them (the GO, the open window and its kind, expected.1.arrived=false, no arrive, scene here, the people/creatures).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk, outcomeOf } from './patch8_lib.js';
import { applyEvent } from '../../src/state.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { applyWorld } from '../../src/v4/world.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { foldChat, rec } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { Dice } from '../../src/rng.js';

const content = await loadProductContent();
const ASHBRIDGE = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Ashbridge, Duskreach`';
const DUSK = 'realm.duskreach', AHALL = 'loc.ashbridge.guild_hall', WARRENS = 'loc.mossback_warrens';
const VC = 'realm.valedorn_crown', HALL = 'loc.alderwatch.guild_hall', ALLOT = 'loc.millbrook_allotments';
const NOT_THERE = { 1: { arrived: false, at: null, with: null } };
const OPEN = (kind, when) => ({ open: true, kind, when });
const CLOSED = (when) => ({ open: false, when });
async function withForce(force, fn) {
    const was = content.rules.pulse.force;
    content.rules.pulse.force = force;
    try { return await fn(); } finally { content.rules.pulse.force = was; }
}
const moves = (events) => events.filter((e) => e.t === 'scene.moved' && e.d.at !== undefined).map((e) => e.d.at);
const labels = (events) => events.filter((e) => e.t === 'scene.moved' && e.d.at === undefined).map((e) => e.d.place);
const minutes = (events) => events.filter((e) => e.t === 'time.advanced').map((e) => `${e.d.minutes} ${e.d.why}`);
const created = (events, kind) => events.filter((e) => e.t === 'entity.created' && e.d.entity.kind === kind).map((e) => e.d.entity.id);

// ------------------------------------------------------------------------------------------------ host path: Mage T44
const LEADER = { type: 'person.new', ref: 'leader', name: null, role: 'bandit leader', desc: ['armed man with a notched axe'], present: true, relevant: true, threat: true, at: null, band: 'SHORT' };
const T44_PROSE = 'Half a day out, five armed men step out of the bracken ahead of the Warrens track and bar his way. Their leader rests a notched axe on his shoulder.';
async function mageT44(force = OPEN('danger', 'Mossback')) {
    const g = await campaign(content, { greeting: ASHBRIDGE });
    await walk(g, AHALL, { text: '*I go into the Guild hall*' });
    assert.equal(g.state().scene.at, AHALL);
    await withForce(force, () => say(g, '*I set out for the Mossback Warrens*', { type: 'go', to: WARRENS, quote: 'I set out for the Mossback Warrens' }));
    const r = await g.reply(T44_PROSE, { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 180 }, { seq: 2, ...LEADER }] });
    return { g, r, events: r.record.events };
}

test('.181 P2-2 Mage T44: the open danger window on the leg to the Warrens stops him on the Duskreach road; the armed men are there, not in the Ashbridge Guild hall (.180: leader at the hall)', async () => {
    const { g, events } = await mageT44();
    const pulse = outcomeOf(g).auth.pulse;
    assert.deepEqual([pulse.exposure, pulse.open, pulse.kind], ['travel', true, 'danger']);
    assert.equal(rec(g.chat.findLast((m) => m.is_user)).events.filter((e) => e.t === 'pulse.rolled').length, 1, 'one decision, in the player turn');
    assert.ok(!events.some((e) => e.t === 'pulse.rolled'), 'none in the reply');
    const s = g.state();
    assert.equal(s.scene.at, DUSK);
    assert.equal(s.scene.place, 'On the way to Mossback Warrens');
    const [leader] = created(events, 'npc');
    assert.ok(leader && s.scene.present.includes(leader), 'the leader is with him on the road');
    assert.deepEqual(moves(events), [DUSK], 'one move, before the deltas');
    assert.deepEqual(labels(events), ['On the way to Mossback Warrens']);
    assert.ok(events.findIndex((e) => e.t === 'scene.moved') < events.findIndex((e) => e.t === 'entity.created'), 'the stop is booked before the people of the reply');
    assert.ok(events.some((e) => e.t === 'memory.recorded' && /first saw \{pc\} at On the way to Mossback Warrens/.test(e.d.memory.text)));
    assert.ok(!events.some((e) => e.t === 'memory.recorded' && /Guild hall/.test(e.d.memory.text)));
    assert.deepEqual(minutes(events), ['180 narration'], 'the narrated time only: no travel floor, no second booking');
    assert.notEqual(s.scene.at, WARRENS, 'never the destination');
    assert.deepEqual(buildCatalog(s, content).here, { id: DUSK, path: 'Duskreach' }, 'the planner of the next turn reads the road');
    // save/reload: the folded chat is the same state, valid
    const folded = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(folded, s);
    assert.deepEqual(validateState(folded, content), []);
});

test('.181 P2-2 Mage T44 → on: from the stop he goes on to the Warrens; the men he leaves stay on the road; going back to the hall is possible too', async () => {
    const { g, events } = await mageT44();
    const [leader] = created(events, 'npc');
    await withForce(CLOSED('Warrens'), () => say(g, '*I walk on to the Warrens*', { type: 'go', to: WARRENS, quote: 'I walk on to the Warrens' }));
    const o = outcomeOf(g);
    assert.equal(o.resolutions.find((x) => x.type === 'go')?.status, 'authorized', 'not "already here", the way on is open');
    await g.reply('He leaves them on the track and reaches the mouth of the Warrens.', { expected: { 1: { arrived: true, at: WARRENS, with: null } }, deltas: [] });
    const s = g.state();
    assert.equal(s.scene.at, WARRENS);
    assert.ok(!s.scene.present.includes(leader));
    assert.equal(s.entities[leader].at, DUSK, 'left where he was met');
    // and from a fresh stop: back to the hall he came from
    const h = (await mageT44()).g;
    await withForce(CLOSED('back'), () => say(h, '*I turn back to the Guild hall*', { type: 'go', to: AHALL, quote: 'I turn back to the Guild hall' }));
    assert.equal(outcomeOf(h).resolutions.find((x) => x.type === 'go')?.status, 'authorized');
});

test('.181 P2-2 against: a closed window on the same leg keeps .180 – no arrive, no move; the newcomer stays where he is', async () => {
    const { g, events } = await mageT44(CLOSED('Mossback'));
    assert.equal(outcomeOf(g).auth.pulse.open, false);
    assert.equal(g.state().scene.at, AHALL);
    assert.deepEqual(moves(events), []);
    assert.deepEqual(labels(events), []);
});

test('.181 P2-2 Warrior T27 against: an intermediate place the extractor reports wins; one move there, no engine stop beside it', async () => {
    const g = await campaign(content, { greeting: ASHBRIDGE });
    await walk(g, AHALL, { text: '*I go into the Guild hall*' });
    await withForce(OPEN('meeting', 'Mossback'), () => say(g, '*I set out for the Mossback Warrens*', { type: 'go', to: WARRENS, quote: 'I set out for the Mossback Warrens' }));
    const dip = { new: { name: 'Alder dip on the Bricklane road', kind: 'site', parent: DUSK } };
    const r = await g.reply('At the Alder dip on the Bricklane road a carter waves him down.', { expected: NOT_THERE, deltas: [
        { seq: 1, type: 'arrive', at: dip, with: null, forced_by: null },
        { seq: 2, type: 'person.new', ref: 'carter', name: null, role: 'carter', desc: ['carter with a mule'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' }] });
    const s = g.state();
    assert.equal(s.places[s.scene.at].name, 'Alder dip on the Bricklane road');
    assert.deepEqual(moves(r.record.events).length, 1);
    assert.deepEqual(labels(r.record.events), []);
    assert.ok(created(r.record.events, 'npc').every((id) => s.scene.present.includes(id)));
});

// ------------------------------------------------------------------------------------------------ product steps: Rogue
// The planner's commands through the command handlers and PULSE (resolveCommands), the extractor's answer through the
// world applier (applyWorld): the two steps the host runs for a player turn and its reply.
async function alderwatch() {
    const s = structuredClone((await campaign(content)).state());
    s.places[ALLOT] = { id: ALLOT, name: 'Millbrook allotments', kind: 'wilderness', parent: VC, realm: VC, tags: [], population: { species: 'feral tomcat', anchor: 'feline', levels: [1, 3] } };
    s.quests['quest.tomcat'] = { id: 'quest.tomcat', status: 'active', taker: 'pc', title: 'Cull the feral tomcat of Millbrook', hunt: { at: ALLOT }, objectives: [{ verb: 'DEFEAT', what: 'feral tomcat', qty: 1 }] };
    s.scene.at = HALL; s.scene.present = ['pc'];
    return s;
}
function playerTurn(s, commands, input) {
    const events = [], emit = (e) => { applyEvent(s, e); events.push(e); };
    emit({ t: 'turn.begun', d: { turn: s.turn + 1, input_hash: `r181.${s.turn}`, input } });
    const ctx = resolveCommands(s, content, commands.map((c, i) => ({ seq: i + 1, ...c })), emit, { c: true, msg: s.turn * 2, dice: Dice.from(s) });
    s.last.outcome = { c: true, kind: 'v4', actions: ctx.actions, extra: ctx.extra, resolutions: ctx.resolutions, auth: ctx.auth, expected_keys: ctx.expectedKeys };
    return { ctx, events, pulse: ctx.auth.pulse };
}
function reply(s, deltas, prose, expected = NOT_THERE) {
    const r = applyWorld(s, content, { scene: 'here', expected, deltas: deltas.map((d, i) => ({ seq: i + 1, ...d })) }, { msg: s.turn * 2 + 1, prose });
    for (const e of r.events) applyEvent(s, e);
    return r;
}
const DOGS = { type: 'creature.new', ref: 'dogs', species: 'feral dog', anchor: 'wolf', desc: ['lean feral dog'], count: 2, present: true, band: 'SHORT', cluster: null, stronger: null, threat: true, more: true, population: 'independent', life_stage: 'adult' };
const TOMCAT = { type: 'creature.new', ref: 'tomcat', species: 'feral tomcat', anchor: 'feline', desc: ['scarred tomcat'], count: 1, present: true, band: 'SHORT', cluster: null, stronger: null, threat: true, more: true, population: ALLOT, life_stage: 'adult' };
const GO_ALLOT = { type: 'go', to: ALLOT, quote: 'I head out to the Millbrook allotments' };

test('.181 P2-2 Rogue T36: two feral dogs of the open danger window meet him on the Valedorn road, not in the Alderwatch Guild hall; the hunt and its population stay as they are', async () => {
    const s = await alderwatch();
    const t = await withForce(OPEN('danger', 'allotments'), () => playerTurn(s, [GO_ALLOT], 'I head out to the Millbrook allotments.'));
    assert.deepEqual([t.pulse.exposure, t.pulse.open, t.pulse.kind], ['travel', true, 'danger']);
    assert.ok(t.ctx.extra.some((x) => /It is a real stop short of Millbrook allotments/.test(x)));
    const r = reply(s, [DOGS, { type: 'hostile', by: ['dogs'], scope: 'all', evidence: 'two lean feral dogs slink from the hedge and come at him' }, { type: 'time', minutes: 40 }], 'On the lane out of Alderwatch two lean feral dogs slink from the hedge and come at him.');
    assert.equal(s.scene.at, VC);
    const dogs = created(r.events, 'creature');
    assert.equal(dogs.length, 2, JSON.stringify(r.rejected));
    assert.ok(dogs.every((id) => s.scene.present.includes(id)), JSON.stringify(r.rejected));
    assert.ok(dogs.every((id) => !s.entities[id].population_at), 'no population of the habitat on the road');
    assert.ok(s.encounter || (s.pending_combat || []).length, `the danger group may attack, where he is: ${s.mode} ${JSON.stringify(r.rejected)} ${JSON.stringify(r.corrections)}`);
    assert.deepEqual(moves(r.events), [VC]);
    assert.equal(s.quests['quest.tomcat'].status, 'active');
});

test('.181 P2-2 Rogue T36 → T44/T47: on the road a tomcat claiming the habitat is no member of it; once he reaches the allotments it is', async () => {
    const s = await alderwatch();
    await withForce(OPEN('meeting', 'allotments'), () => playerTurn(s, [GO_ALLOT], 'I head out to the Millbrook allotments.'));
    reply(s, [TOMCAT], 'By a gate on the lane a scarred tomcat watches him.');
    assert.equal(s.scene.at, VC);
    assert.ok(!Object.values(s.entities).some((e) => e.population_at === ALLOT), 'credit stays with the habitat (populationAt by where he is)');
    // .180 T48 "already at the Guild hall": he goes on from the road
    const on = await withForce(CLOSED('allotments'), () => playerTurn(s, [{ ...GO_ALLOT, quote: 'I go on to the allotments' }], 'I go on to the allotments.'));
    assert.equal(on.ctx.resolutions[0].status, 'authorized');
    const r = reply(s, [{ type: 'arrive', at: ALLOT, with: null, forced_by: null }, { ...TOMCAT, ref: 'tomcat2', desc: ['big ginger tomcat'] }], 'Among the bean rows a big ginger tomcat hisses at him.', { 1: { arrived: true, at: ALLOT, with: null } });
    assert.equal(s.scene.at, ALLOT);
    const cat = created(r.events, 'creature').at(-1);
    assert.equal(s.entities[cat].population_at, ALLOT, JSON.stringify(r.rejected));
});

test('.181 P2-2 Rogue T32: the person of an open meeting window on the way to Ashbridge is met on the road, not at the hall; arriving later leaves them there', async () => {
    const s = await alderwatch();
    const t = await withForce(OPEN('meeting', 'Ashbridge'), () => playerTurn(s, [{ type: 'go', to: 'loc.ashbridge', quote: 'I set out for Ashbridge' }], 'I set out for Ashbridge.'));
    assert.deepEqual([t.pulse.exposure, t.pulse.open], ['travel', true]);
    const r = reply(s, [{ type: 'person.new', ref: 'drover', name: 'Hob', role: 'drover', desc: ['drover with three goats'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' }],
        'A drover with three goats falls in beside him on the road and asks for news.');
    const [hob] = created(r.events, 'npc');
    assert.equal(s.scene.at, VC);
    assert.ok(s.scene.present.includes(hob));
    assert.equal(s.scene.place, 'On the way to Ashbridge');
    await withForce(CLOSED('Ashbridge'), () => playerTurn(s, [{ type: 'go', to: 'loc.ashbridge', quote: 'I walk on to Ashbridge' }], 'I walk on to Ashbridge.'));
    reply(s, [{ type: 'arrive', at: 'loc.ashbridge', with: null, forced_by: null }], 'He reaches Ashbridge.', { 1: { arrived: true, at: 'loc.ashbridge', with: null } });
    assert.equal(s.scene.at, 'loc.ashbridge');
    assert.equal(s.entities[hob].at, VC);
    assert.ok(!s.scene.present.includes(hob));
});

test('.181 P2-2 companions: whoever the extractor says travels with him comes along to the stop; whoever stays keeps the hall', async () => {
    const s = await alderwatch();
    playerTurn(s, [], 'I look around the hall.');
    const intro = reply(s, [
        { type: 'person.new', ref: 'bren', name: 'Bren', role: 'porter', desc: ['porter with a pack frame'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' },
        { type: 'person.new', ref: 'ilse', name: 'Ilse', role: 'clerk', desc: ['clerk at the long counter'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' }],
        'Bren the porter shoulders his frame; Ilse the clerk stays at the long counter.', {});
    const [bren, ilse] = created(intro.events, 'npc');
    await withForce(OPEN('obstacle', 'allotments'), () => playerTurn(s, [GO_ALLOT], 'I head out to the Millbrook allotments with Bren.'));
    const r = reply(s, [{ type: 'time', minutes: 30 }], 'A fallen elm blocks the lane; Bren sets down his frame beside him.', { 1: { arrived: false, at: null, with: ['Bren'] } });
    assert.equal(s.scene.at, VC);
    assert.ok(s.scene.present.includes(bren), JSON.stringify(r.rejected));
    assert.ok(!s.scene.present.includes(ilse));
    assert.equal(s.entities[ilse].at, HALL);
    assert.ok(r.events.some((e) => e.t === 'scene.entered' && e.d.id === bren));
});

test('.181 P2-2 held threats: with the dogs still around him there is no new window, so no second stop; he stays where the first one put him', async () => {
    const s = await alderwatch();
    await withForce(OPEN('danger', 'allotments'), () => playerTurn(s, [GO_ALLOT], 'I head out to the Millbrook allotments.'));
    reply(s, [{ ...DOGS, threat: true }], 'Two feral dogs circle him on the lane.');
    assert.equal(s.scene.at, VC);
    s.encounter = null; s.pending_combat = [];
    const t = await withForce(OPEN('danger', 'back'), () => playerTurn(s, [{ type: 'go', to: HALL, quote: 'I back away toward the Guild hall' }], 'I back away toward the Guild hall, back to town.'));
    assert.deepEqual([t.pulse.exposure, t.pulse.reason], ['travel', 'held']);
    const r = reply(s, [], 'The dogs follow at a distance.');
    assert.deepEqual(moves(r.events), []);
    assert.equal(s.scene.at, VC);
});

// ------------------------------------------------------------------------------------------------ the exception's bounds
// The world applier with the outcome as the engine would have recorded it: only the travel window that opened on an
// authorized leg moves him, and only with no arrive and no arrival reported
function bound(auth, { at = HALL, expected = NOT_THERE, deltas = [], keys = { 1: 'go' } } = {}) {
    return alderwatch().then((s) => {
        s.scene.at = at;
        s.last.outcome = { c: true, kind: 'v4', actions: [], extra: [], resolutions: [], auth: { c: true, timeCap: 480, gos: [], ...auth }, expected_keys: keys };
        const r = applyWorld(s, content, { scene: 'here', expected, deltas }, { msg: 90, prose: 'He walks on.' });
        return r;
    });
}
const GO1 = { seq: 1, to: ALLOT, name: 'Millbrook allotments', hall: false, newName: null };
const TRAVEL = { v: 1, governs: true, rolled: true, eligible: true, exposure: 'travel', frame: 'travel', open: true, kind: 'danger' };

test('.181 P2-2 bounds: the open travel window of an authorized GO, with no arrive and no arrival reported, is the stop', async () => {
    const stop = await bound({ gos: [GO1], pulse: TRAVEL });
    assert.equal(stop.state.scene.at, VC);
    assert.deepEqual(moves(stop.events), [VC]);
});

test('.181 P2-2 bounds against: nothing else moves him (.101) – no GO, closed, scene or pause window, no decision, the realm as goal, already on the road', async () => {
    for (const [why, auth, more] of [
        ['no authorized GO', { gos: [], pulse: TRAVEL }, { keys: {} }],
        ['closed travel window', { gos: [GO1], pulse: { ...TRAVEL, open: false, kind: null } }],
        ['an open scene window', { gos: [GO1], pulse: { ...TRAVEL, exposure: 'scene', frame: 'street' } }],
        ['an open pause window', { gos: [GO1], pulse: { ...TRAVEL, exposure: 'pause', frame: 'street' } }],
        ['no PULSE decision', { gos: [GO1] }],
        ['the realm is his destination', { gos: [{ ...GO1, to: VC, name: 'Valedorn Crown' }], pulse: TRAVEL }],
        ['already on the realm\'s road', { gos: [GO1], pulse: TRAVEL }, { at: VC }],
    ]) {
        const r = await bound(auth, more);
        assert.equal(r.state.scene.at, more?.at ?? HALL, why);
        assert.deepEqual(moves(r.events), [], why);
    }
});

test('.181 P2-2 bounds: a reported arrival keeps its own rules – an arrive moves him as reported; an arrival without its arrive is refused and books no stop', async () => {
    const reported = await bound({ gos: [GO1], pulse: TRAVEL }, { expected: { 1: { arrived: true, at: ALLOT, with: null } }, deltas: [{ seq: 1, type: 'arrive', at: ALLOT, with: null, forced_by: null }] });
    assert.equal(reported.state.scene.at, ALLOT);
    assert.deepEqual(moves(reported.events), [ALLOT]);
    const bare = await bound({ gos: [GO1], pulse: TRAVEL }, { expected: { 1: { arrived: true, at: ALLOT, with: null } } });
    assert.equal(bare.state.scene.at, HALL);
    assert.ok(bare.rejected.some((x) => x.rule === 'arrival_evidence'));
    const refused = await bound({ gos: [GO1], pulse: TRAVEL }, { deltas: [{ seq: 1, type: 'arrive', at: 'loc.nowhere_known', with: null, forced_by: null }] });
    assert.deepEqual(moves(refused.events).filter((x) => x === VC), [], 'a reported arrive, even a refused one, is the extractor\'s report: no engine stop beside it');
});

// ------------------------------------------------------------------------------------------------ story order
// The .101 fixture (run 22, Alderwatch Guild hall → Glassmere) whose own PULSE draw opens a travel window ("strange"):
// what the reply puts expressly at the place he set out from happened before he left; the stop follows it
const F22 = JSON.parse(fs.readFileSync(new URL('./fixtures/run22_prebatch.json', import.meta.url)));
const run22 = () => playerTurnV4(applyWorld(structuredClone(F22.purchase.state), content, structuredClone(F22.purchase.answers[0]), { msg: F22.purchase.i, prose: F22.purchase.prose }).state,
    content, 'I go there.', { c: true, msg: 500, commands: [{ seq: 1, type: 'go', to: 'loc.glassmere', quote: 'I go there.' }] }).state;

test('.181 P2-2 story order: a gift the reply puts expressly at the hall he leaves is booked there; the engine stop follows it', () => {
    const s = run22(), at = s.scene.at;
    assert.deepEqual([s.last.outcome.auth.pulse.exposure, s.last.outcome.auth.pulse.open, s.last.outcome.auth.pulse.kind], ['travel', true, 'strange'], 'the fixture\'s own draw');
    const gift = [
        { seq: 1, type: 'object.new', name: 'Fresh travel apple', kind: 'item', qty: 1, holder: 'npc.npclodging_clerk', scene: at },
        { seq: 2, type: 'object.move', object: { new: 'Fresh travel apple' }, to: 'pc', qty: 1, scene: at },
        { seq: 3, type: 'time', minutes: 60 }];
    const r = applyWorld(s, content, { scene: at, expected: { 1: { arrived: false, at: null, with: [] } }, deltas: gift }, { msg: 501, prose: 'The clerk hands him an apple for the road; an hour out a pale light hangs over the ditch.' });
    assert.ok(Object.values(r.state.objects).some((o) => o.name === 'Fresh travel apple' && o.holder?.entity === 'pc'), JSON.stringify(r.rejected));
    assert.equal(r.state.scene.at, VC);
    assert.deepEqual(moves(r.events), [VC]);
    assert.ok(r.events.findIndex((e) => e.t === 'scene.moved') > r.events.findIndex((e) => e.t === 'object.moved'), 'after the gift at the hall');
    // the same gift told as "here" is on the road: the clerk he left is not there to hand it over
    const t = run22();
    const here = applyWorld(t, content, { scene: 'here', expected: { 1: { arrived: false, at: null, with: [] } }, deltas: gift.map((d) => ({ ...d, scene: d.type === 'time' ? undefined : 'here' })) }, { msg: 501, prose: 'On the road the clerk hands him an apple.' });
    assert.equal(here.state.scene.at, VC);
    assert.ok(!Object.values(here.state.objects).some((o) => o.name === 'Fresh travel apple' && o.holder?.entity === 'pc'), 'no hand-over by someone left at the hall');
});
