// c.6.6.2: one delivery check (contractReady, read anew), Guild documents vs bought goods, the hand-over in gesture,
// the road between places with whoever travels along, local moves in the wilds, creatures that are no foe.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT, Game } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { firewall } from '../../src/v4/firewall.js';
import { seedPlaces } from '../../src/v4/domain.js';
import { contractReady, completeContract, slipMarks } from '../../src/v4/guild.js';
import { tacticalHere } from '../../src/v4/scene_handles.js';
import { plannerSystem, HANDOVER_RULES } from '../../src/v4/planner.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec } from '../../src/host.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const QID = 'quest.lighthouse_test';
const lighthouse = () => ({
    id: QID, title: 'Letters to the Lighthouse Keeper', kind: 'guild_contract',
    status: 'active', payout_cp: 60, notes: [], details: [], proof: [],
    desired_end_state: 'The sealed satchel and oil requisition are delivered.',
    objectives: [
        { id: 'o1', verb: 'DELIVER', what: 'sealed satchel of harbor letters', qty: 1, unit: 'satchel', status: 'open' },
        { id: 'o2', verb: 'GIVE', what: 'oil requisition slip', qty: 1, unit: 'slip', status: 'open' },
    ],
});
const object = (id, name, { holder = 'pc', qty = 1, quests = [QID], how = 'story' } = {}) => ({ t: 'object.created', d: { object: {
    id, name, kind: 'item', stack: qty > 1, qty, unit: null, holder: { entity: holder }, marks: [], for_quests: quests, source: { how },
} } });
const move = (id, to, extra = {}) => ({ t: 'object.moved', d: { id, to: { entity: to }, ...extra } });
/** Alaric (a Mage) with a contract, its Guild slip and the given objects; the last turn a C turn. */
function setup(quest = lighthouse(), objects = [object('obj.satchel', 'sealed satchel of harbor letters'), object('obj.oil', 'oil requisition slip')]) {
    const g = new Game(content);
    g.turn('Mage');
    g.turn('Flame Lance + Arcane Burst');
    const s = g.state;
    applyEvent(s, { t: 'quest.created', d: { quest } });
    applyEvent(s, object(`obj.slip.${quest.id.replace(/^quest\./, '')}`, `Guild contract slip: ${quest.title}`, { quests: [quest.id], how: 'guild' }));
    for (const e of objects) applyEvent(s, e);
    s.last = { input: '*I hand it over*', rejected: [], outcome: { kind: 'v4', auth: { c: true, gos: [], timeCap: 720, booked_min: 0 }, expected_keys: {} } };
    return s;
}
const ready = (s, id = QID) => applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'quest.ready', quest: id, note: 'delivered', alternative: null }] },
    { msg: 101, prose: 'The keeper thanks Alaric.' });
const check = (s, id = QID) => contractReady(s, content, s.quests[id], { c: true });

// ------------------------------------------------------------------------------------------------ A. identities
test('c.6.6.2 grants: Guild documents are identities, bought goods the same thing in any word order', () => {
    const kept = (grants, name) => firewall([{ seq: 1, type: 'object.new', name, kind: 'item', qty: 1, unit: null, holder: 'npc.clerk' }], { c: true, booked: { grants }, contracts: [] }).reject.length === 0;
    assert.ok(kept(['contract slip'], 'oil requisition slip'), 'the requisition is its own document (live 10.10.2026)');
    assert.ok(!kept(['contract slip'], 'Guild contract slip: Letters to the Lighthouse Keeper'));
    assert.ok(!kept(['grilled eel skewer'], 'skewer of grilled eel'), 'the bought skewer, said the other way round');
    assert.ok(!kept(['grilled eel skewer'], 'two skewers of grilled eel'));
    assert.ok(kept(['oil flask'], 'oil lamp'), 'a lamp is no flask');
    assert.ok(kept(['lamp oil'], 'oil requisition slip'));
    assert.ok(!kept(['Guild plate'], 'brass Guild plate'));
});

// ------------------------------------------------------------------------------------------------ B. delivery
test('c.6.6.2 lighthouse: the story\'s READY stands while he still holds the requisition; handing it over makes the contract ready without another claim, and the Guild pays', () => {
    const s = setup();
    applyEvent(s, move('obj.satchel', 'npc.keeper'));
    const x = ready(s);
    assert.equal(x.state.quests[QID].ready, true, 'no receipt gate: the outcome the story established is kept');
    assert.ok(!(x.rejected || []).some((r) => r.rule === 'quest_delivery'));
    assert.ok(x.corrections.some((c) => /NOT READY.*oil requisition slip/.test(c)), x.corrections.join(' | '));
    assert.equal(check(x.state).mode, 'not_delivered');
    applyEvent(x.state, move('obj.oil', 'npc.keeper'));
    assert.equal(check(x.state).ok, true);
    const marks = [];
    slipMarks(x.state, content, (e) => marks.push(e));
    assert.ok(marks.some((e) => e.t === 'object.marked' && /READY/.test(e.d.mark)), 'its slip shows READY');
    const paid = [];
    const r = completeContract(x.state, content, x.state.quests[QID], (e) => paid.push(e), { step: 1, c: true });
    assert.equal(r.ok, true, r.reason);
    assert.ok(paid.some((e) => e.t === 'quest.status' && e.d.to === 'completed'));
});

test('c.6.6.2 lighthouse as played: the Guild contract slip handed to the keeper is no requisition', () => {
    const s = setup();
    applyEvent(s, move('obj.satchel', 'npc.keeper'));
    applyEvent(s, move('obj.slip.lighthouse_test', 'npc.keeper'));
    const x = ready(s);
    const r = check(x.state);
    assert.equal(r.mode, 'not_delivered');
    assert.match(r.reason, /oil requisition slip/);
});

test('c.6.6.2 delivery: a part handed over leaves the rest owed; all of it, done', () => {
    const quest = { ...lighthouse(), objectives: [{ id: 'o1', verb: 'DELIVER', what: 'crates of salt fish', qty: 5, unit: 'crate', status: 'open' }] };
    let s = setup(quest, [object('obj.crates', 'crates of salt fish', { qty: 5 })]);
    applyEvent(s, move('obj.crates', 'npc.factor', { qty: 3, split: 'obj.crates_3' }));
    s = ready(s).state;
    assert.equal(s.quests[QID].ready, true);
    assert.equal(check(s).mode, 'not_delivered', 'two crates are still in his hands');
    applyEvent(s, move('obj.crates', 'npc.factor'));
    assert.equal(check(s).ok, true);
});

test('c.6.6.2 delivery: his own satchel is no undelivered one once the contract\'s satchel was handed over; without a link, a satchel in his hands still is', () => {
    let s = setup(undefined, [object('obj.satchel', 'sealed satchel of harbor letters'), object('obj.oil', 'oil requisition slip'), object('obj.mine', 'leather satchel', { quests: [] })]);
    applyEvent(s, move('obj.satchel', 'npc.keeper'));
    applyEvent(s, move('obj.oil', 'npc.keeper'));
    s = ready(s).state;
    assert.equal(check(s).ok, true, check(s).reason);
    // the story never linked the letters to the contract: what his hands hold called so keeps it open
    const t = ready(setup(undefined, [object('obj.letters', 'satchel of letters', { quests: [] })])).state;
    assert.equal(check(t).mode, 'not_delivered');
});

test('c.6.6.2 delivery: a message given, cargo the companion carries and a slightly other name do not hold a contract back', () => {
    const word = { ...lighthouse(), objectives: [{ id: 'o1', verb: 'GIVE', what: 'warning of the flood to the reeve', qty: null, status: 'open' }] };
    const a = ready(setup(word, [])).state;
    assert.equal(check(a).ok, true, check(a).reason);
    const cargo = { ...lighthouse(), objectives: [{ id: 'o1', verb: 'DELIVER', what: 'barrels of lamp oil', qty: 3, status: 'open' }] };
    const b = ready(setup(cargo, [object('obj.barrels', 'barrels of lamp oil', { holder: 'npc.carter', qty: 3 })])).state;
    assert.equal(check(b).ok, true, check(b).reason);
    let c = setup(undefined, [object('obj.letters', 'harbor letters', {}), object('obj.oil', 'oil requisition slip')]);
    applyEvent(c, move('obj.oil', 'npc.keeper'));
    c = ready(c).state;
    assert.equal(check(c).mode, 'not_delivered', 'the linked "harbor letters" are the satchel\'s letters');
    applyEvent(c, move('obj.letters', 'npc.keeper'));
    assert.equal(check(c).ok, true);
});

test('c.6.6.2 mixed work: the delivery is checked before the goods; herbs gathered for the apothecary are hers, not the Guild\'s', () => {
    const mixed = { ...lighthouse(), objectives: [
        { id: 'o1', verb: 'GATHER', what: 'bundles of marsh mint', qty: 2, status: 'open' },
        { id: 'o2', verb: 'DELIVER', what: 'sealed letter to the warden', qty: 1, status: 'open' },
    ] };
    const s = ready(setup(mixed, [object('obj.mint', 'bundles of marsh mint', { qty: 2 }), object('obj.letter', 'sealed letter to the warden')])).state;
    assert.equal(check(s).mode, 'not_delivered', 'goods in hand do not skip the delivery');
    applyEvent(s, move('obj.letter', 'npc.warden'));
    assert.equal(check(s).ok, true);
    assert.equal(check(s).mode, 'goods');
    const herbs = { ...lighthouse(), objectives: [
        { id: 'o1', verb: 'GATHER', what: 'fever herbs', qty: 3, status: 'open' },
        { id: 'o2', verb: 'DELIVER', what: 'fever herbs', qty: 3, status: 'open' },
    ] };
    let t = setup(herbs, [object('obj.herbs', 'fever herbs', { qty: 3 })]);
    applyEvent(t, move('obj.herbs', 'npc.apothecary'));
    t = ready(t).state;
    assert.equal(check(t).ok, true, check(t).reason);
});

// ------------------------------------------------------------------------------------------------ C. hand-over
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1007.json'), 'utf8'));
/** The live chat of 07.10.2026 up to message `upto` (planner on); mutate edits the last message's events. */
function live(upto, mutate) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, upto + 1).map((m) => ({ mes: m.mes, is_user: m.user, is_system: !!m.system, extra: m.events ? { avereth: { v: 3, events: structuredClone(m.events) } } : {} }));
    if (mutate) mutate(g.chat.findLast((m) => m.extra?.avereth).extra.avereth.events, g.state());
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    return rec(g.chat.findLast((m) => m.is_user));
}
const outcomeOf = (r) => r.events.findLast((e) => e.t === 'outcome.recorded').d.outcome;

test('c.6.6.2 hand-over: the planner rules read an offered asked-for thing as give, never a substitute', () => {
    const sys = plannerSystem(content.commandVocab);
    assert.ok(sys.includes(HANDOVER_RULES));
    assert.match(HANDOVER_RULES, /never another object in its place/);
    assert.match(HANDOVER_RULES, /produces a different thing than the one asked for/);
});

test('c.6.6.2 hand-over: "you mean this? *I hold out the requisition slip*" gives that slip; "I show it but don\'t hand it over" gives nothing', async () => {
    const g = live(46, (events, s) => events.push(object('obj.t46.oil_requisition_slip', 'oil requisition slip', { quests: [] })));
    await say(g, '*i look at the keeper*');
    await g.reply('The lighthouse keeper holds out her hand. "The oil requisition, if the Guild sent one."', { expected: {}, deltas: [
        { seq: 1, type: 'person.new', ref: 'keeper', name: null, role: 'lighthouse keeper', desc: ['weathered woman'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' },
    ] });
    const keeper = g.state().scene.present.find((id) => (g.state().entities[id]?.descriptors || []).includes('lighthouse keeper'));
    assert.ok(keeper);
    const shown = await say(g, 'I show her the slip, but don\'t hand it over.', { type: 'give', object: 'obj.t46.oil_requisition_slip', to: keeper, quote: 'I show her the slip, but don\'t hand it over.' });
    assert.ok(!outcomeOf(shown).actions.some((a) => /GIVES/.test(a)), JSON.stringify(outcomeOf(shown).actions));
    await g.reply('She frowns at the slip still in his hand.', { expected: {}, deltas: [] });
    const given = await say(g, 'you mean this? *i hold out the requisition slip to her*', { type: 'give', object: 'obj.t46.oil_requisition_slip', to: keeper, quote: 'i hold out the requisition slip to her' });
    assert.ok(outcomeOf(given).actions.some((a) => /GIVES/.test(a)), JSON.stringify(outcomeOf(given).actions));
    await g.reply('She takes the requisition and tucks it away.', { expected: {}, deltas: [] });
    assert.equal(g.state().objects['obj.t46.oil_requisition_slip'].holder.entity, keeper);
});

// ------------------------------------------------------------------------------------------------ D, E. the road
const MED = 'quest.carry_a_medicine_bundle_to_thornwick_chapel';
test('c.6.6.2 road: an escort interrupted on the way keeps its charge; the journey stays underway', async () => {
    const g = live(32, (events, s) => events.push({ t: 'quest.set', d: { quest: { ...s.quests[MED], objectives: [{ id: 'o1', verb: 'ESCORT', what: 'Brother Aldric', qty: 1, status: 'open' }] } } }));
    await say(g, '*we set off together*', { type: 'journey.continue', quote: 'we set off together' });
    await g.reply('They walked north for four hours with Aldric beside him until a washed-out bridge forced a choice.', { expected: {}, deltas: [{ seq: 1, type: 'time', minutes: 240 }] });
    const s = g.state();
    assert.equal(s.scene.at, 'realm.duskreach');
    assert.match(s.scene.place, /On the way to Carry a Medicine Bundle/);
    assert.ok(s.scene.present.includes('npc.aldric'), 'Aldric travels with him');
    assert.ok(s.quests[MED].journey, 'the journey has begun');
});

test('c.6.6.2 road: an hour spent looking for an inn in town leaves the hall, not the town', async () => {
    const g = live(32);
    await say(g, '*i go look for an inn to spend the night*', { type: 'go', to: { new: 'an inn' }, quote: 'i go look for an inn' });
    await g.reply('He spent more than an hour in the lanes of Ashbridge; two inns were full. He stood outside, deciding.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 75 }] });
    const s = g.state();
    assert.equal(s.scene.at, 'loc.ashbridge');
    assert.ok(!/On the way/.test(s.scene.place));
});

test('c.6.6.2 road: 210 minutes on the coast path toward the lighthouse put him on the realm\'s road, not at the lighthouse', () => {
    const s = setup(lighthouse(), []);
    for (const place of seedPlaces(content, content.locations.get('loc.tidecross'), 'public roadside verge outside Tidecross').places) applyEvent(s, { t: 'place.created', d: { place } });
    applyEvent(s, { t: 'scene.moved', d: { at: 'loc.tidecross.guild_hall', location: 'loc.tidecross', place: "Adventurers' Guild hall, Tidecross", reset_present: true } });
    s.last.outcome.auth.gos = [{ seq: 1, to: null, name: 'Gullspire Point lighthouse', newName: 'Gullspire Point lighthouse' }];
    const x = applyWorld(s, content, { expected: { 1: { arrived: false } }, deltas: [{ seq: 1, type: 'time', minutes: 210 }] },
        { msg: 102, prose: 'After three and a half hours on the coast path the lighthouse comes into view.' });
    assert.equal(x.state.scene.at, 'realm.solmere');
    assert.match(x.state.scene.place, /On the way to Gullspire Point lighthouse/);
    assert.ok(!x.events.some((e) => e.t === 'quest.journey'), 'no journey is continued or begun by the road alone');
});

test('c.6.6.2 time: a short move within the wilds is local (live 10.10.2026 #34: 60 minutes for the next bend of a wolf trail)', () => {
    const s = setup(lighthouse(), []);
    for (const place of [
        { id: 'realm.test', name: 'Test realm', kind: 'realm', parent: null, realm: 'realm.test', tags: [] },
        { id: 'loc.test_town', name: 'Test town', kind: 'settlement', parent: 'realm.test', realm: 'realm.test', tags: [] },
        { id: 'loc.gully', name: 'Scrub gully', kind: 'wilderness', parent: 'realm.test', realm: 'realm.test', tags: [] },
        { id: 'loc.hollow', name: 'Wolf den hollow', kind: 'wilderness', parent: 'realm.test', realm: 'realm.test', tags: [] },
    ]) applyEvent(s, { t: 'place.created', d: { place } });
    const go = (from, to) => {
        const t = structuredClone(s);
        applyEvent(t, { t: 'scene.moved', d: { at: from, location: 'realm.test', place: from, reset_present: true } });
        t.last.outcome.auth.gos = [{ seq: 1, to, name: to, newName: null }];
        t.last.outcome.expected_keys = { 1: 'go' };
        const x = applyWorld(t, content, { expected: { 1: { arrived: true, at: to } }, deltas: [] }, { msg: 103, prose: 'He follows the trail.' });
        return x.events.filter((e) => e.t === 'time.advanced').reduce((n, e) => n + e.d.minutes, 0);
    };
    assert.equal(go('loc.gully', 'loc.hollow'), content.rules.time.engine_clock.go_min_same_settlement);
    assert.equal(go('loc.test_town', 'loc.gully'), content.rules.time.engine_clock.go_min_elsewhere, 'leaving a town is travel');
});

// ------------------------------------------------------------------------------------------------ F. no foe
test('c.6.6.2 before a fight: a packhorse the story shows as no foe is no part of an area attack\'s field; wolves still are', async () => {
    const g = live(46);
    await say(g, '*i look around*');
    await g.reply('A wolf circles a tethered packhorse at the edge of the yard.', { expected: {}, deltas: [
        { seq: 1, type: 'creature.new', ref: 'wolf', species: 'grey wolf', anchor: 'wolf', desc: ['lean grey wolf'], count: 1, present: true, band: 'SHORT', stronger: null, threat: null },
        { seq: 2, type: 'creature.new', ref: 'horse', species: 'packhorse', anchor: 'horse', desc: ['tethered packhorse'], count: 1, present: true, band: 'SHORT', stronger: null, threat: false },
    ] });
    const s = g.state();
    const of = (word) => s.scene.present.find((id) => (s.entities[id]?.descriptors || []).some((d) => d.includes(word)));
    const wolf = of('wolf');
    const horse = of('packhorse');
    assert.ok(wolf && horse);
    const field = tacticalHere(s, { friendly: false });
    assert.ok(field.includes(wolf));
    assert.ok(!field.includes(horse));
    assert.ok(tacticalHere(s).includes(horse), 'still part of the scene');
    const r = await say(g, '*i step in and unleash arcane burst*',
        { type: 'move', dir: 'closer', target: null, quote: 'i step in' },
        { type: 'use_skill', skill: 'mage.arcane_burst', target: null, quote: 'unleash arcane burst' });
    const enc = r.events.find((e) => e.t === 'encounter.started')?.d.encounter;
    assert.ok(enc?.combatants[wolf], 'the wolf is in the fight');
    assert.ok(!enc.combatants[horse], 'the packhorse is not');
});

// ------------------------------------------------------------------------------------------------ the live lighthouse
const lt = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1010.json'), 'utf8'));
const LQ = 'quest.letters_to_the_lighthouse_keeper';
const OIL = (s) => Object.values(s.objects).find((o) => o.name === 'oil requisition slip');
/** Live 10.10.2026 #13-#23 on this build; `turn21` replaces the turn at the keeper's request. */
async function lighthouseRun(turn21 = lt.turns['21']) {
    const g = new Chat4(content);
    g.chat = lt.messages.map((m) => ({ mes: m.mes, is_user: m.user, is_system: !!m.system, extra: m.events ? { avereth: { v: 3, events: structuredClone(m.events) } } : {} }));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    const seen = {};
    for (const k of ['13', '15', '17', '19', '21', '23']) {
        const t = k === '21' ? turn21(g) ?? lt.turns['21'] : lt.turns[k];
        g.chat.push({ mes: t.player, is_user: true, is_system: false, extra: {} });
        g.plans = [t.plan];
        await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
        const x = await g.reply(t.reply, t.extract);
        seen[k] = { state: g.state(), record: x.record };
    }
    return seen;
}

test('c.6.6.2 live lighthouse as played: the requisition exists, the road leaves the hall, READY is kept and the desk names what is still owed (no dead end)', async () => {
    const seen = await lighthouseRun(() => null);
    assert.ok(OIL(seen['13'].state), 'the clerk\'s oil requisition slip is created beside the contract slip');
    assert.equal(seen['15'].state.scene.at, 'realm.solmere');
    assert.equal(seen['21'].state.quests[LQ].ready, true);
    assert.ok(seen['21'].record.corrections.some((c) => /NOT READY.*oil requisition slip/.test(c)));
    const s = seen['23'].state;
    assert.equal(s.quests[LQ].status, 'active');
    assert.match(s.last.outcome.actions.join(' '), /refuse it: he still carries oil requisition slip/);
});

test('c.6.6.2 live lighthouse corrected: he holds out the requisition the keeper asked for, it changes hands, and the Guild pays at Tidecross', async () => {
    const seen = await lighthouseRun((g) => {
        const oil = OIL(g.state());
        return {
            ...lt.turns['21'],
            player: 'you mean this? *i ask and hold out the oil requisition slip*',
            plan: JSON.stringify({ commands: [{ seq: 1, type: 'give', object: oil.id, to: 'npc.npcgullspire_keeper', quote: 'i ask and hold out the oil requisition slip' }] }),
            extract: { ...lt.turns['21'].extract, deltas: lt.turns['21'].extract.deltas.filter((d) => d.type !== 'object.move') },
        };
    });
    assert.equal(OIL(seen['21'].state).holder.entity, 'npc.npcgullspire_keeper');
    assert.equal(seen['21'].state.quests[LQ].ready, true);
    assert.ok(!seen['21'].record.corrections.some((c) => /NOT READY/.test(c)));
    const s = seen['23'].state;
    assert.equal(s.quests[LQ].status, 'completed');
    assert.ok(s.entities.pc.sheet.coin_cp > seen['21'].state.entities.pc.sheet.coin_cp, 'paid out');
});
