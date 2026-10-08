// Prototype C, build 4.3.0-c.6.6: the live run of 07.10.2026 18:10 (tests/v4/live_1007.json: messages 0-48 with their
// texts and events, the recorded planner commands and raw extractor answers of the turns replayed here).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec, turnBlock } from '../../src/host.js';
import { buildCatalog, extractorCatalog, journeyReady } from '../../src/v4/catalog.js';
import { settlementOf, sameSettlement } from '../../src/v4/domain.js';
import { MECH_RULES } from '../../src/v4/planner.js';
import { extractorSystem } from '../../src/v4/extract.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1007.json'), 'utf8'));
const MED = 'quest.carry_a_medicine_bundle_to_thornwick_chapel';

function planner(g) {
    const ask = g.llm;
    g.llm = async (req) => {
        if (!req.purpose.startsWith('plan')) return ask(req);
        g.planRequest = req;
        const a = g.plans.shift();
        return a === undefined ? null : typeof a === 'string' ? a : JSON.stringify(a);
    };
    return g;
}
/** The live chat up to message `upto`, the planner on. */
function live(upto) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, upto + 1).map((m) => ({ mes: m.mes, is_user: m.user, is_system: !!m.system, extra: m.events ? { avereth: { v: 3, events: structuredClone(m.events) } } : {} }));
    return planner(g);
}
async function say(g, text, plans) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [...plans];
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    g.learnIds();
    return r;
}
/** A recorded turn of the live run replayed on this build: player message, planner answer, reply, extractor answer. */
async function replay(g, t, extract = t.extract) {
    await say(g, t.player, t.plan);
    return g.reply(t.reply, extract);
}
const last = (g) => rec(g.chat.findLast((m) => m.is_user));
const outcomeOf = (g) => last(g).events.findLast((e) => e.t === 'outcome.recorded').d.outcome;
const block = (g) => turnBlock(g.chat, g.chat.findLastIndex((m) => m.is_user), content).context.text;
const withParent = (extract, parent) => JSON.parse(JSON.stringify(extract).replaceAll('"parent":"loc.ashbridge"', `"parent":"${parent}"`));
const timeRejected = (x) => (x.record.rejected || []).filter((r) => r.rule === 'time_cap');

// ------------------------------------------------------------------------------------------------ 5, 6. places
test('c.6.6 places: the land outside a town has an id for the extractor; a waystation on the road lies in the realm, and the walk from it to Ashbridge is travel, not a stroll in town', async () => {
    const g = live(32);
    const s0 = g.state();
    const cat = extractorCatalog(s0, content, { c: true });
    assert.ok(cat.places.includes('realm.duskreach'), 'C: the realm is a place the extractor may name');
    assert.match(cat.text, /realm\.duskreach \(Duskreach \(the realm itself/);
    assert.ok(!extractorCatalog(s0, content, {}).places.includes('realm.duskreach'), 'A unchanged');
    const rules = extractorSystem(content.deltaVocab);
    assert.match(rules, /parent is where the place actually lies, never simply where Alaric came from/);
    assert.match(rules, /A place that only comes into view, that he sees from a distance, passes, skirts or avoids on the way is no arrival/);

    // the live departure (#33/#34) with the parent the rule asks for
    const t0 = s0.clock.minute;
    const x = await replay(g, fx.depart, withParent(fx.depart.extract, 'realm.duskreach'));
    let s = g.state();
    const way = s.places[s.scene.at];
    assert.deepEqual([way.name, way.kind, way.parent], ['Half-way waystation', 'site', 'realm.duskreach']);
    assert.equal(settlementOf(s, way.id), null, 'out on the road, in no town');
    assert.deepEqual(timeRejected(x), []);
    assert.ok(s.clock.minute - t0 >= 360, 'the six hours on the road');
    // the way on from there to Ashbridge (#45/#46): his own GO to a known town elsewhere allows the story's hours
    assert.equal(sameSettlement(s, way.id, 'loc.ashbridge'), false);
    const t1 = s.clock.minute;
    await say(g, fx.ashbridge.player, [JSON.stringify({ commands: [{ seq: 1, type: 'go', to: 'loc.ashbridge', quote: 'i continue walking trying to reach ashbridge' }] })]);
    const y = await g.reply(fx.ashbridge.reply, fx.ashbridge.extract);
    s = g.state();
    assert.equal(s.scene.at, 'loc.ashbridge');
    assert.deepEqual(timeRejected(y), [], 'no 120-minute cap: the 360 minutes were in the earlier build only because the waystation was stored inside Ashbridge');
    assert.ok(s.clock.minute - t1 >= 360);
});

test('c.6.6 places: after this reply took him out of Ashbridge to Thornwick, the chapel he then enters lies in Thornwick, not in the town he left (the live answer as recorded)', async () => {
    const g = live(34);
    const x = await replay(g, fx.thornwick);
    assert.ok(!(x.record.rejected || []).some((r) => r.rule === 'place'), JSON.stringify(x.record.rejected));
    const s = g.state();
    const infirmary = s.places[s.scene.at];
    const chapel = s.places[infirmary.parent];
    assert.deepEqual([infirmary.name, chapel.name, chapel.parent], ['Thornwick chapel infirmary', 'Thornwick chapel', 'loc.thornwick']);
    assert.equal(settlementOf(s, s.scene.at), 'loc.thornwick');
    assert.equal(s.scene.location, 'loc.thornwick');
    assert.equal(s.places['loc.thornwick'].parent, 'realm.duskreach');
});

// ------------------------------------------------------------------------------------------------ 7, 8. journeys
test('c.6.6 journeys: whoever handed over the parcel is no travel companion; an escort\'s charge still is (A unchanged)', async () => {
    const g = live(32);
    const s = g.state();
    assert.ok(s.scene.present.includes('npc.aldric'));
    const c = journeyReady(s, { c: true });
    assert.equal(c.contact, 'npc.aldric', 'Aldric here is why the delivery can set off from the alms hall');
    assert.equal(c.companion, null, 'but he does not come along');
    assert.ok(!buildCatalog(s, content, { c: true }).journey_ready.includes(' with '));
    assert.equal(journeyReady(s).companion, 'npc.aldric', 'A keeps its line');
    await say(g, fx.depart.player, fx.depart.plan);
    assert.ok(!outcomeOf(g).actions.join('\n').includes('with Aldric'), outcomeOf(g).actions.join('\n'));
    assert.match(block(g), /DEPARTS\/CONTINUES — the already-established journey of "Carry a Medicine Bundle to Thornwick Chapel"; carry/);
    const e = structuredClone(s);
    e.quests[MED].objectives = [{ id: 'o1', verb: 'ESCORT', what: 'Brother Aldric', qty: 1, unit: null, where: 'Thornwick', status: 'open' }];
    assert.equal(journeyReady(e, { c: true }).companion, 'npc.aldric', 'an escort travels with his charge');
});

test('c.6.6 journeys: a delivery that is READY has reached its destination; the way back is a new GO, not its journey', async () => {
    const g = live(42);
    const s = g.state();
    assert.ok(s.quests[MED].ready, 'delivered at the chapel (#38)');
    assert.equal(journeyReady(s, { c: true }), null);
    await say(g, fx.back.player, fx.back.plan);
    assert.ok(!g.planRequest.messages.at(-1).content.includes('JOURNEY READY'));
    // the live planner answer named the ended journey beside the go and made the go build on it: the go stands
    assert.deepEqual(outcomeOf(g).resolutions.map((r) => [r.type, r.status]), [['journey.continue', 'refused'], ['go', 'authorized']]);
    assert.ok(!/DEPARTS|NOTHING TO DEPART/.test(outcomeOf(g).actions.join('\n')));
});

// ------------------------------------------------------------------------------------------------ 9, 10. route, sight
test('c.6.6 route and sight: the planner keeps the destination and leaves the route to the story; the extractor reports no arrival for a place he only sees', () => {
    assert.match(MECH_RULES, /7b\. go\.to is the destination, never the way there\./);
    assert.match(MECH_RULES, /A route is never a place of its own\./);
    const go = content.deltaVocab.expected.go.summary;
    assert.match(go, /arrived is true only when the reply ends with him at the place \(seeing it ahead or passing it is false\)/);
});

// ------------------------------------------------------------------------------------------------ 11-14. before a fight
const plan = (...commands) => JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) });
const bandit = (seq, ref, role, band, relevant = true) => ({ seq, type: 'person.new', ref, name: null, role, desc: [role], present: true, relevant, at: null, band });
/** Alaric in Ashbridge (#46 of the live run), and a reply that shows four bandits, a passer-by and only tracks of a dog. */
async function bandits(bands = ['SHORT', 'MEDIUM', 'MEDIUM', 'MEDIUM']) {
    const g = live(46);
    await say(g, '*i look at the men by the cart*', [plan()]);
    const x = await g.reply('Four bandits loiter by the cart; a woman hurries past; paw prints of a big dog cross the mud.', {
        expected: {},
        deltas: [
            bandit(1, 'leader', 'bandit leader', bands[0]), bandit(2, 'crossbow', 'crossbow bandit', bands[1]),
            bandit(3, 'young1', 'young bandit', bands[2]), bandit(4, 'young2', 'young bandit', bands[3]),
            { seq: 5, type: 'person.new', ref: 'woman', name: 'Hesk', role: 'passer-by', desc: ['a woman with a basket'], present: true, relevant: false, at: null, band: 'MEDIUM' },
            { seq: 6, type: 'fact', s: 'the cart', p: 'tracks', o: 'paw prints of a big dog cross the mud' },
            ...['leader', 'crossbow', 'young1', 'young2'].map((who, i) => ({ seq: 7 + i, type: 'aware', who, level: 'unaware' })),
        ],
    });
    return { g, x };
}
const byRole = (s, role) => s.scene.present.filter((id) => (s.entities[id]?.descriptors || []).includes(role));

test('c.6.6 before a fight: a targetless step in and Arcane Burst among visible bandits opens the fight with the field, moves him once and hits only who is ENGAGED then; impossible, it costs nothing', async () => {
    const { g, x } = await bandits();
    let s = g.state();
    const [leader] = byRole(s, 'bandit leader');
    const field = [...byRole(s, 'bandit leader'), ...byRole(s, 'crossbow bandit'), ...byRole(s, 'young bandit')];
    assert.equal(field.length, 4);
    assert.ok(field.every((id) => s.entities[id].relevant === true), 'the story marked them relevant; the engine keeps it');
    // the ACTIVE SCENE names the four, not the passer-by, and nothing for the paw prints
    const scene = x.record.panel.split('\n').filter((l) => l.includes('ACTIVE SCENE'));
    assert.equal(scene.length, 4, x.record.panel);
    assert.ok(!scene.some((l) => /Hesk|dog/i.test(l)));
    assert.ok(!Object.values(s.entities).some((e) => /dog/.test(JSON.stringify(e.descriptors || []))), 'tracks are no creature');

    await say(g, '*i dash forward and unleash arcane burst*', [plan(
        { type: 'move', dir: 'closer', target: null, quote: 'i dash forward' },
        { type: 'use_skill', skill: 'mage.arcane_burst', target: null, quote: 'unleash arcane burst' },
    )]);
    const panels = last(g).command?.panels || [];
    assert.ok(!panels.some((p) => /TARGET NEEDED/.test(p)), panels.join('\n'));
    const opened = last(g).events.find((e) => e.t === 'encounter.started')?.d.encounter;
    assert.ok(opened, 'the burst opened the fight');
    assert.deepEqual(Object.keys(opened.combatants).filter((id) => id !== 'pc').sort(), [...field].sort(), 'the visible field, not the passer-by');
    assert.equal(opened.ambush, true, 'they had not noticed him: his burst is the opening action');
    const burst = outcomeOf(g).records.find((r) => r.actor === 'pc' && r.kind === 'attack');
    assert.match(burst.move.change, /Bandit Leader SHORT -> ENGAGED/);
    assert.deepEqual(burst.strikes.map((k) => k.target), [leader], 'only the leader was ENGAGED after the one-band step');
    assert.equal(burst.cost.amount, 14);

    // all at MEDIUM: the step leaves everyone at SHORT, the burst has no one ENGAGED; nothing starts, nothing is spent
    const { g: h } = await bandits(['MEDIUM', 'MEDIUM', 'MEDIUM', 'LONG']);
    const before = structuredClone(h.state());
    await say(h, '*i dash forward and unleash arcane burst*', [plan(
        { type: 'move', dir: 'closer', target: null, quote: 'i dash forward' },
        { type: 'use_skill', skill: 'mage.arcane_burst', target: null, quote: 'unleash arcane burst' },
    )]);
    const after = h.state();
    assert.ok(!after.encounter);
    assert.deepEqual(after.entities.pc.sheet, before.entities.pc.sheet, 'no MP spent');
    assert.deepEqual(after.scene.positions, before.scene.positions, 'no partial movement');
    assert.match(JSON.stringify(outcomeOf(h)), /needs a valid target ENGAGED/);
});

test('c.6.6 group awareness: "unaware" on a group ref reaches each of its creatures (live #18: three kobolds, only two got it); seeing stays its own thing', async () => {
    const g = live(16);
    await say(g, '*i crouch down and sneak closer my staff ready*', [plan({ type: 'stealth', quote: 'i crouch down and sneak closer' })]);
    await g.reply('Two small kobolds root in a torn sack; a bigger one scrapes at the kiln dome. None of them looks up.', {
        expected: {},
        deltas: [
            { seq: 1, type: 'creature.new', ref: 'kobold_small_a', species: 'gnaw-tooth kobold', anchor: 'goblin', desc: ['waist-high, hunched'], count: 2, present: true, band: 'MEDIUM', stronger: null },
            { seq: 2, type: 'creature.new', ref: 'kobold_big', species: 'gnaw-tooth kobold', anchor: 'goblin', desc: ['half again the size of the small ones'], count: 1, present: true, band: 'MEDIUM', stronger: true },
            { seq: 3, type: 'aware', who: 'kobold_small_a', level: 'unaware' },
            { seq: 4, type: 'aware', who: 'kobold_big', level: 'unaware' },
        ],
    });
    const s = g.state();
    const kobolds = s.scene.present.filter((id) => s.entities[id]?.kind === 'creature');
    assert.equal(kobolds.length, 3);
    assert.deepEqual(kobolds.map((id) => s.scene.awareness[id]), ['unaware', 'unaware', 'unaware']);
});
