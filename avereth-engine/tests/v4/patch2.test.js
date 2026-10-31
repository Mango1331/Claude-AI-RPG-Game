// Patch 2 (persistent intent, known places, thread lifecycle; live run of 18.10.2026): the chartmaker's old Dungeon is
// a place known by report with a stable id, his decision to go there is his goal through a camp, a fight, a cave and a
// change of place, "I continue my journey" means it, and arriving there under other words is the same place. Played
// through the product's host path (planner on, the extension's own content, Ashbridge), the LLM calls scripted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec } from '../../src/host.js';
import { buildContext } from '../../src/context.js';
import { renderHud, worldRows } from '../../src/hud.js';
import { runCommands } from '../../src/commands.js';
import { extractorCatalog, buildCatalog } from '../../src/v4/catalog.js';
import { continueOptions } from '../../src/v4/intents.js';
import { threadCurrent } from '../../src/threads.js';
import { foldChat } from '../../src/host.js';
import { estimateTokens } from '../../src/util.js';
import { Game, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import fs from 'node:fs';
import path from 'node:path';

const content = await loadProductContent();
const GREETING = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Ashbridge, Duskreach`';

/** A campaign in Ashbridge with a Mage, played on the planner path. */
async function campaign() {
    const g = new Chat4(content, { greeting: GREETING });
    await g.player('Mage');
    await g.player('Flame Lance + Arcane Wave');
    const ask = g.llm;
    g.purposes = [];
    g.llm = async (req) => {
        g.purposes.push(req.purpose);
        return req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req);
    };
    return g;
}
/** A player message the planner reads as these commands. */
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    if (r.action === 'panels') g.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
    return r;
}
const outcome = (g) => rec(g.chat.findLast((m) => m.is_user))?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
const dungeonOf = (s) => Object.values(s.places).find((p) => /old dungeon/i.test(p.name));
const goals = (s) => Object.values(s.intents || {});

/** #1-#3: the chartmaker's map in Ashbridge; the old Dungeon is reported, not seen. */
async function atTheMap() {
    const g = await campaign();
    await say(g, '*I walk into the city and look for a chartmaker*', { type: 'go', to: 'loc.ashbridge', quote: 'I walk into the city' });
    await g.reply('Ashbridge\'s market lane. A grey-bearded chartmaker unrolls a map for Alaric: "Wolves a day south in the Weald, and past them an old Dungeon, two days in by a track that dies in the hills. Nobody works it."', {
        expected: { 1: { arrived: true, at: 'loc.ashbridge', with: null } },
        deltas: [
            { seq: 1, type: 'person.new', ref: 'chartmaker', name: null, role: 'chartmaker', desc: ['grey-bearded'], present: true, relevant: true },
            { seq: 2, type: 'place.reported', place: { new: { name: 'the old Dungeon', kind: 'site', parent: 'realm.duskreach' } }, by: 'chartmaker', how: 'map', where: 'two days south into the Weald, past the wolves, by a track that dies in the hills' },
            { seq: 3, type: 'thread', text: 'An old Dungeon is supposed to sit in the Weald south of Ashbridge; nobody works it', kind: 'rumor', status: 'open' },
        ],
    });
    return g;
}

test('1-2: a Dungeon on the chartmaker\'s map is a place known by report: stable id, source, rough location; nothing of it becomes a world fact', async () => {
    const g = await atTheMap();
    const s = g.state();
    const d = dungeonOf(s);
    assert.ok(d, 'the old Dungeon has a place id');
    assert.equal(d.known, 'reported');
    assert.equal(d.reports.length, 1);
    assert.equal(d.reports[0].how, 'map');
    assert.match(d.reports[0].where, /two days south into the Weald/);
    assert.ok(d.reports[0].by && /chartmaker/.test(s.entities[d.reports[0].by].descriptors.join(' ')));
    // the report's details are not facts about the world; the place is no seen place
    assert.ok(!Object.values(s.facts).some((f) => /dungeon/i.test(`${f.s} ${f.p} ${f.o}`)));
    const thread = Object.values(s.threads)[0];
    assert.match(thread.id, /^thread\.t\d+\.\d+$/, 'an engine id, not the words');
    // the planner sees it as a destination, said to be by report
    const cat = buildCatalog(s, content, { c: true });
    assert.ok(cat.places.some((p) => p.id === d.id && /known only by report \(on a map, chartmaker/.test(p.name)), JSON.stringify(cat.places));
    // a second report of the same place under the same name in the realm is the same place
    await say(g, '*I ask the chartmaker again about the Dungeon*');
    await g.reply('"Aye, the old Dungeon. Past the ridge."', { expected: {}, deltas: [{ seq: 1, type: 'place.reported', place: { new: { name: 'The Old Dungeon', kind: 'site', parent: 'realm.duskreach' } }, by: 'chartmaker', how: 'told', where: 'past the ridge' }] });
    const s2 = g.state();
    assert.equal(Object.values(s2.places).filter((p) => /old dungeon/i.test(p.name)).length, 1);
    assert.equal(dungeonOf(s2).reports.length, 2);
});

/** #3 on: he decides to go there and sets off; he ends the day at a stream crossing in the Weald. */
async function setOff() {
    const g = await atTheMap();
    const d = dungeonOf(g.state());
    await say(g, '*I thank him and leave the city to start my travels towards the dungeon*', { type: 'go', to: d.id, quote: 'leave the city to start my travels towards the dungeon' });
    await g.reply('By dusk Alaric reaches a stream crossing deep in the Weald.', {
        expected: { 1: { arrived: false, at: null, with: null } },
        deltas: [{ seq: 1, type: 'arrive', at: { new: { name: 'Weald stream crossing', kind: 'wilderness', parent: 'realm.duskreach' } }, forced_by: null, with: null }, { seq: 2, type: 'time', minutes: 480 }],
    });
    return { g, d };
}

test('3-5: setting off for the reported Dungeon is his goal; a camp, a cave, a fight and new places keep it; "I continue my journey" means it', async () => {
    const { g, d } = await setOff();
    let s = g.state();
    assert.equal(goals(s).length, 1);
    assert.deepEqual([goals(s)[0].status, goals(s)[0].place], ['active', d.id]);
    assert.match(s.scene.place, /stream crossing/);
    // a rest, a cave with a fresh sign, a fight
    await say(g, '*I make camp and sleep for 8 hours*', { type: 'activity', kind: 'sleep', what: null, minutes: 480, until: null, quote: 'sleep for 8 hours' });
    await g.reply('He sleeps by the stream.', { expected: { 1: { minutes: 480, done: true } }, deltas: [] });
    await say(g, '*I climb into the cave by the stream*', { type: 'go', to: { new: 'the cave by the stream' }, quote: 'I climb into the cave by the stream' });
    await g.reply('A low cave. Fresh wolf tracks lead deeper; a wolf growls in the dark.', {
        expected: { 1: { arrived: true, at: { new: { name: 'Cave by the stream', kind: 'site', parent: null } }, with: null } },
        deltas: [
            { seq: 1, type: 'thread', text: 'Fresh wolf tracks lead deeper into the cave', kind: 'sign', status: 'open' },
            { seq: 2, type: 'creature.new', ref: 'wolf', species: 'grey wolf', anchor: 'wolf', desc: ['grey'], count: 1, present: true, band: 'SHORT', stronger: null, threat: true },
        ],
    });
    s = g.state();
    const wolf = Object.values(s.entities).find((e) => e.kind === 'creature');
    await say(g, '*i flame lance the wolf*', { type: 'use_skill', skill: 'mage.flame_lance', target: wolf.id, quote: 'i flame lance the wolf' });
    const fight = outcome(g);
    assert.equal(fight.kind, 'combat', 'the fight runs');
    assert.ok(fight.records.some((r) => r.skill === 'mage.flame_lance'));
    s = g.state();
    assert.equal(goals(s)[0].status, 'active', 'a fight does not end his goal');
    await g.reply('The flame lance burns through the wolf; it lies still.', { expected: {}, deltas: [] });
    s = g.state();
    assert.ok(!s.encounter, 'the one-strike fight is over');
    assert.equal(goals(s)[0].status, 'active');
    // he walks back out to the crossing: a step in the wild, no new goal
    await say(g, '*I walk back out to the stream*', { type: 'go', to: s.places[s.scene.at].parent, quote: 'I walk back out to the stream' });
    await g.reply('He is back at the crossing.', { expected: { 1: { arrived: true, at: null, with: null } }, deltas: [] });
    s = g.state();
    assert.equal(goals(s).length, 1);
    // the engine block and the HUD know where he is headed; the narrator is told not to act on it
    const ctx = buildContext(s, content, { input: 'I continue my journey', lastReply: '' });
    assert.match(ctx.text, /ALARIC'S GOALS \(his own decisions: remember them; never act, decide or move him toward them for him\)/);
    assert.match(ctx.text, /- reach the old Dungeon \(loc\.[^,]+, by report, not seen: two days south into the Weald/);
    assert.match(worldRows(s, content).map(([k, v]) => `${k}: ${v}`).join('\n'), /Goals: reach the old Dungeon \(by report, not seen: two days south/);
    // "I continue my journey": JOURNEY READY names his goal; the engine sets off toward it, nothing more
    assert.match(extractorCatalog(s, content, { c: true }).text, /JOURNEY READY: intent\.1 — his goal "reach the old Dungeon"/);
    await say(g, '*I continue my journey*', { type: 'journey.continue', quote: 'I continue my journey' });
    const o = outcome(g);
    assert.equal(o.auth.go.to, d.id);
    assert.match(o.actions.join('\n'), /CONTINUES — toward the old Dungeon, his own goal/);
    assert.equal(o.expected_keys[1], 'go');
    s = g.state();
    assert.notEqual(s.scene.at, d.id, 'setting off moves him nowhere: the story decides how far he gets');
});

test('7: arrival names the reported Dungeon id despite different prose; the goal is done; nothing of the report is checked off as true', async () => {
    const { g, d } = await setOff();
    await say(g, '*I continue my journey*', { type: 'journey.continue', quote: 'I continue my journey' });
    await g.reply('A bowl-shaped valley opens, its grass unnaturally green; a dark cleft breathes cold air.', {
        expected: { 1: { arrived: true, at: d.id, with: null } },
        deltas: [{ seq: 1, type: 'arrive', at: d.id, forced_by: null, with: null }],
    });
    const s = g.state();
    assert.equal(s.scene.at, d.id, 'the same place id');
    assert.ok(!Object.values(s.places).some((p) => /dark cleft/i.test(p.name)), 'no second identity');
    assert.equal(s.places[d.id].known, 'visited');
    assert.equal(goals(s)[0].status, 'done');
    // later the story names the cleft inside it: a place in the Dungeon, not a second Dungeon
    await say(g, '*i walk into the dungeon staff ready*', { type: 'go', to: { new: 'the dark cleft' }, quote: 'i walk into the dungeon' });
    await g.reply('The cleft swallows the light.', { expected: { 1: { arrived: true, at: { new: { name: 'The dark cleft', kind: 'interior', parent: d.id } }, with: null } }, deltas: [] });
    const s2 = g.state();
    assert.equal(s2.places[s2.scene.at].parent, d.id);
});

test('6: a new destination pauses the old goal; giving it up drops it; a vague "continue" with two goals asks', async () => {
    const { g, d } = await setOff();
    // he changes his mind: back to Ashbridge (another destination: the Dungeon goal pauses, nothing is given up)
    await say(g, '*I turn around and head back to Ashbridge*', { type: 'go', to: 'loc.ashbridge', quote: 'head back to Ashbridge' });
    let s = g.state();
    assert.deepEqual(goals(s).map((i) => [i.place, i.status]), [[d.id, 'paused'], ['loc.ashbridge', 'active']]);
    // a firm plan for later, without leaving now: a goal; two active goals with places, "I continue": a question
    await g.reply('He walks north.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [] });
    await say(g, '*after Ashbridge I will go back to the Dungeon, that is decided*', { type: 'intent.set', goal: 'return to the old Dungeon', to: d.id, quote: 'after Ashbridge I will go back to the Dungeon' });
    s = g.state();
    assert.equal(goals(s).find((i) => i.place === d.id).status, 'active');
    await g.reply('He walks on.', { expected: {}, deltas: [] });
    // a goal named by words: the known place by its name; an unknown name stays words (his goal makes no place)
    const places = Object.keys(g.state().places).length;
    await say(g, '*one day I will find the Sunken Library, I swear it*', { type: 'intent.set', goal: 'find the Sunken Library', to: { new: 'the Sunken Library' }, quote: 'one day I will find the Sunken Library' });
    s = g.state();
    assert.equal(Object.keys(s.places).length, places);
    assert.deepEqual(goals(s).filter((i) => i.goal === 'find the Sunken Library').map((i) => [i.place, i.status]), [[null, 'active']]);
    await g.reply('He walks on.', { expected: {}, deltas: [] });
    // only one goal with a place stays active (the new one paused Ashbridge); no arbitrary pick happens with two options
    s = g.state();
    const active = goals(s).filter((i) => i.status === 'active' && i.place);
    assert.deepEqual(active.map((i) => i.place), [d.id]);
    // he drops it outright: no active goal with that place is left
    await say(g, '*Forget the Dungeon. I am not going there anymore.*', { type: 'intent.drop', intent: active[0].id, achieved: false, quote: 'Forget the Dungeon' });
    s = g.state();
    assert.equal(s.intents[active[0].id].status, 'dropped');
    assert.ok(!goals(s).some((i) => i.place === d.id && i.status === 'active'));
    // "I continue" with nothing active but the paused Ashbridge goal: not a guess about the Dungeon
    await g.reply('He stands at the crossing.', { expected: {}, deltas: [] });
    s = g.state();
    assert.ok(!/old Dungeon/.test(buildCatalog(s, content, { c: true }).journey_ready || ''));
});

test('6: two goals with places both active: "I continue" is answered with a question, never a pick', async () => {
    const { g, d } = await setOff();
    // two goals, both active (an explicit goal set for a second place without setting off for it pauses nothing it is not)
    const s0 = g.state();
    const crossing = s0.scene.at;
    g.chat.findLast((m) => m.extra?.avereth?.events).extra.avereth.events.push({ t: 'intent.set', d: { intent: { id: 'intent.9', goal: 'reach Blackgate', place: 'loc.blackgate', status: 'active', since: { turn: 1, minute: 0 }, updated: { turn: 1, minute: 0 }, quote: null, why: 'test' } } });
    const r = await say(g, '*I continue my journey*', { type: 'journey.continue', quote: 'I continue my journey' });
    assert.equal(r.action, 'panels', 'a question, not a turn');
    assert.match(r.panels.join('\n'), /CLARIFY\]\ncontinue which: reach the old Dungeon \(the old Dungeon\) or reach Blackgate \(Blackgate\)\?/);
    assert.equal(g.state().scene.at, crossing);
    assert.ok(!outcome(g)?.auth?.go, 'nothing was booked');
    void d;
});

/** From the stream crossing into the cave: a fresh sign there, a mystery that will outlast it. */
async function intoCave() {
    const { g, d } = await setOff();
    await say(g, '*I climb into the cave by the stream*', { type: 'go', to: { new: 'the cave by the stream' }, quote: 'I climb into the cave by the stream' });
    await g.reply('A low cave. Fresh wolf tracks lead deeper. On the wall, runes nobody in Ashbridge spoke of; far off a wolf howls.', {
        expected: { 1: { arrived: true, at: { new: { name: 'Cave by the stream', kind: 'site', parent: null } }, with: null } },
        deltas: [
            { seq: 1, type: 'thread', id: null, text: 'Fresh wolf tracks lead deeper into the cave', kind: 'sign', status: 'open', resolution: null },
            { seq: 2, type: 'thread', id: null, text: 'Runes cut into the cave wall that nobody in Ashbridge mentioned', kind: 'mystery', status: 'open', resolution: null },
            { seq: 3, type: 'thread', id: null, text: 'A wolf howls far off beyond the cave', kind: 'sign', status: 'open', resolution: null },
        ],
    });
    const s = g.state();
    const th = (re) => Object.values(g.state().threads).find((t) => re.test(t.text));
    return { g, d, s, th };
}

test('8: threads have engine ids; a rewording is the same thread; a sign is settled by id with evidence; a mystery outlasts the place; nothing is deleted', async () => {
    const { g, s, th } = await intoCave();
    const tracks = th(/wolf tracks/);
    const runes = th(/Runes/);
    const howl = th(/howls/);
    assert.equal(Object.keys(s.threads).length, 4, 'the map rumour and three from the cave');
    for (const t of [tracks, runes, howl]) assert.match(t.id, /^thread\.t\d+\.\d+$/);
    assert.equal(tracks.at, s.scene.at, 'a thread knows where it was seen');
    // the extractor sees the open threads by id
    const xc = extractorCatalog(s, content, { c: true }).text;
    assert.match(xc, /THREADS \(open; update or resolve by id\):/);
    for (const t of [tracks, runes, howl]) assert.ok(xc.includes(t.id), `${t.id} in the extractor catalog`);
    // a new wording without an id is the same matter, not a new thread
    await g.reply('The tracks are still wet.', { expected: {}, deltas: [{ seq: 1, type: 'thread', id: null, text: 'Fresh wolf tracks lead deeper into the cave, still wet', kind: 'sign', status: 'open', resolution: null }] });
    assert.equal(Object.keys(g.state().threads).length, 4);
    // an unknown id is refused (no thread is made from it); resolving a matter the record does not hold is refused
    const r = await g.reply('Nothing more.', { expected: {}, deltas: [
        { seq: 1, type: 'thread', id: 'thread.t99.1', text: 'whatever', kind: 'sign', status: 'resolved', resolution: 'gone' },
        { seq: 2, type: 'thread', id: null, text: 'A troll under the bridge', kind: 'threat', status: 'resolved', resolution: 'gone' },
    ] });
    assert.equal(Object.keys(g.state().threads).length, 4);
    assert.equal(r.record.events.filter((e) => e.t === 'delta.rejected').length, 2);
    // the wolf that made the tracks is found dead: the sign is settled by its id, with how it ended
    await g.reply('Deeper in, the wolf lies dead in a snare; the tracks were its own.', { expected: {}, deltas: [{ seq: 1, type: 'thread', id: tracks.id, text: 'The tracks were the snared wolf\'s', kind: 'sign', status: 'resolved', resolution: 'the wolf that made them lies dead in a snare' }] });
    let s2 = g.state();
    // (the rewording said it better and is kept; the resolution keeps the matter's words and adds how it ended)
    assert.deepEqual([s2.threads[tracks.id].status, s2.threads[tracks.id].text, s2.threads[tracks.id].resolution], ['resolved', 'Fresh wolf tracks lead deeper into the cave, still wet', 'the wolf that made them lies dead in a snare']);
    // he goes on toward the Dungeon and walks into the hills for most of a day: no evidence about the runes or the howl,
    // so nothing is closed; the howl (a sign of the cave's hour) is no longer current, the runes are
    await say(g, '*I continue my journey*', { type: 'journey.continue', quote: 'I continue my journey' });
    await g.reply('He climbs out of the valley; by evening he is on a bare hill track.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [{ seq: 1, type: 'arrive', at: { new: { name: 'Bare hill track', kind: 'wilderness', parent: 'realm.duskreach' } }, forced_by: null, with: null }, { seq: 2, type: 'time', minutes: 420 }] });
    s2 = g.state();
    assert.equal(s2.threads[howl.id].status, 'open', 'a change of place ends nothing');
    assert.equal(s2.threads[runes.id].status, 'open');
    assert.equal(threadCurrent(s2, s2.threads[howl.id]), false, 'a sign of a place he left hours ago has faded');
    assert.equal(threadCurrent(s2, s2.threads[runes.id]), true, 'a mystery stays until it is settled');
    // the extractor is offered only what still matters; the journal keeps everything
    const xc2 = extractorCatalog(s2, content, { c: true }).text;
    assert.ok(xc2.includes(runes.id) && !xc2.includes(howl.id) && !xc2.includes(tracks.id));
    const journal = runCommands(s2, content, '#journal').panels.join('\n');
    assert.match(journal, /OPEN THREADS:[\s\S]*Runes cut into the cave wall/);
    assert.match(journal, /NO LONGER CURRENT[^\n]*\n[\s\S]*A wolf howls far off/);
    assert.match(journal, /SETTLED:\n {2}\(sign\) Fresh wolf tracks lead deeper into the cave, still wet — the wolf that made them lies dead in a snare/);
    // the retrieval still finds the faded sign, marked as no longer current
    const ctx = buildContext(s2, content, { input: 'that wolf howl from the cave', lastReply: '' });
    assert.ok(!/Open thread \(sign\): A wolf howls/.test(ctx.text));
    // back at the cave the howl is current there again (fading is a view, never an event)
    await say(g, '*I go back into the cave*', { type: 'go', to: howl.at, quote: 'I go back into the cave' });
    await g.reply('The cave again.', { expected: { 1: { arrived: true, at: null, with: null } }, deltas: [] });
    assert.equal(threadCurrent(g.state(), g.state().threads[howl.id]), true);
});

test('9: a reported place can prove false; the world\'s facts stay; no goal or journey points at it any more', async () => {
    const g = await atTheMap();
    const d = dungeonOf(g.state());
    await say(g, '*I set off for the Dungeon*', { type: 'go', to: d.id, quote: 'I set off for the Dungeon' });
    await g.reply('He walks south.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [] });
    const facts = JSON.stringify(g.state().facts);
    // a rumour of a second place: by rumour, no source person
    await g.reply('A carter swears there is a shrine on the ridge.', { expected: {}, deltas: [{ seq: 1, type: 'place.reported', place: { new: { name: 'the ridge shrine', kind: 'site', parent: 'realm.duskreach' } }, by: null, how: 'rumor', where: 'on the ridge', false: null }] });
    const shrine = Object.values(g.state().places).find((p) => /ridge shrine/.test(p.name));
    assert.equal(shrine.known, 'reported');
    assert.match(buildCatalog(g.state(), content, { c: true }).places.find((p) => p.id === shrine.id).name, /known only by report \(by rumour: on the ridge\); not seen yet/);
    // the story shows the chartmaker's map wrong: the place is marked false, nothing else changes
    await g.reply('At the marked spot there is only an old flooded quarry; the chartmaker\'s ring was a copying error.', { expected: {}, deltas: [{ seq: 1, type: 'place.reported', place: d.id, by: null, how: 'told', where: null, false: true }] });
    const s = g.state();
    assert.equal(s.places[d.id].known, 'false');
    assert.equal(JSON.stringify(s.facts), facts, 'the world\'s facts are untouched');
    assert.ok(s.places[d.id], 'the place keeps its id (the journal and the goal still name it)');
    assert.ok(!continueOptions(s, { c: true }).some((o) => o.place === d.id), '"I continue" no longer leads to it');
    assert.match(runCommands(s, content, '#journal').panels.join('\n'), /the old Dungeon — reported, but the report proved false/);
    // a place he has seen cannot be "proved false" by a report
    await say(g, '*I walk to the ridge shrine*', { type: 'go', to: shrine.id, quote: 'I walk to the ridge shrine' });
    await g.reply('A small shrine of piled stones.', { expected: { 1: { arrived: true, at: null, with: null } }, deltas: [] });
    await g.reply('A shepherd scoffs that there is no shrine up here.', { expected: {}, deltas: [{ seq: 1, type: 'place.reported', place: shrine.id, by: null, how: 'told', where: null, false: true }] });
    assert.equal(g.state().places[shrine.id].known, 'visited');
});

test('11: the HUD and the journal show what Alaric knows: his goals, local hints, leads; not an NPC\'s private knowledge, not ids', async () => {
    const { g } = await intoCave();
    // the chartmaker knows something Alaric does not: it stays the chartmaker's
    const chartmaker = Object.values(g.state().entities).find((e) => (e.descriptors || []).includes('chartmaker'));
    const hidden = g.chat.findLast((m) => m.extra?.avereth?.events);
    hidden.extra.avereth.events.push({ t: 'belief.set', d: { who: chartmaker.id, fact: { s: 'the old Dungeon', p: 'holds', o: 'the bones of his drowned brother', how: 'witnessed' } } });
    const s = g.state();
    const rows = worldRows(s, content).map(([k, v]) => `${k}: ${v}`).join('\n');
    assert.match(rows, /Goals: reach the old Dungeon \(by report, not seen: two days south/);
    assert.match(rows, /Here: [^\n]*Fresh wolf tracks lead deeper into the cave \(sign\)/);
    // what belongs to this place (its signs and its mystery) is "here"; the lasting matters of elsewhere are leads
    assert.match(rows, /Here: [^\n]*Runes cut into the cave wall/);
    assert.match(rows, /Leads: [^\n]*An old Dungeon is supposed to sit in the Weald/);
    assert.ok(!/Open threads/.test(rows), 'no global list of the latest threads');
    assert.ok(!/loc\.|thread\.t|intent\./.test(rows), 'no engine ids for the player');
    const hud = renderHud(s, content);
    const journal = runCommands(s, content, '#journal').panels.join('\n');
    for (const view of [rows, hud, journal]) assert.ok(!/drowned brother/.test(view));
    assert.match(journal, /GOALS:\n {2}\[active\] reach the old Dungeon → the old Dungeon/);
    assert.match(journal, /PLACES KNOWN BY REPORT:\n {2}the old Dungeon — known only by report \(on a map, [^:]*chartmaker: two days south/);
    assert.match(journal, /\(sign\) Fresh wolf tracks lead deeper into the cave \[here\]/);
    assert.ok(!/thread\.t|intent\.\d/.test(journal));
});

test('12: the cost: no new LLM call, a few lines of goals, the engine block within its budget, the record small', async () => {
    const { g } = await intoCave();
    // one turn: the planner and the extractor, nothing else
    g.purposes.length = 0;
    await say(g, '*I continue my journey*', { type: 'journey.continue', quote: 'I continue my journey' });
    await g.reply('He leaves the cave and walks on.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 60 }] });
    assert.deepEqual(g.purposes.map((p) => p.replace(/[:.].*$/, '')), ['plan', 'extract']);
    const s = g.state();
    const ctx = buildContext(s, content, { input: 'I continue my journey', lastReply: '' });
    const goalsSection = ctx.sections.find((x) => x.name === 'goals');
    assert.ok(goalsSection && goalsSection.tokens <= 60, `goals: ${goalsSection?.tokens} tokens`);
    // the extractor's THREADS line and the planner's GOALS and JOURNEY READY lines: a few short lines
    const xc = extractorCatalog(s, content, { c: true }).text;
    const threadsPart = xc.slice(xc.indexOf('\nTHREADS'));
    assert.ok(estimateTokens(threadsPart) <= 160, `THREADS: ${estimateTokens(threadsPart)} tokens`);
    const goalPart = xc.split('\n').filter((l) => /^(GOALS|JOURNEY READY)/.test(l)).join('\n');
    assert.ok(goalPart && estimateTokens(goalPart) <= 120, `GOALS + JOURNEY READY: ${estimateTokens(goalPart)} tokens`);
    // the state Patch 2 adds is small: a goal, a reported place's reports, a thread's place
    assert.ok(JSON.stringify(s.intents).length < 600, JSON.stringify(s.intents));
    // the live run of 18.10.2026 folds and builds its engine block as fast as before (64 messages)
    const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1018_weald.json'), 'utf8'));
    const t0 = performance.now();
    const { state, errors } = foldChat(fx.messages);
    const big = buildContext(state, content, { input: fx.messages.at(-1).mes, lastReply: '' });
    const ms = performance.now() - t0;
    assert.deepEqual(errors, []);
    assert.ok(ms < 3000, `${ms.toFixed(0)} ms`);
    // its ten open threads no longer reach the HUD as a list of the latest: only leads and hints that matter now
    const hudRows = worldRows(state, content);
    const threadLines = hudRows.filter(([k]) => ['Here', 'Leads', 'Deadlines'].includes(k)).flatMap(([, v]) => v.split(/;\s*/));
    assert.ok(threadLines.length <= 6, JSON.stringify(hudRows));
    assert.ok(hudRows.some(([k, v]) => k === 'Journal' && /more \(older or settled\)/.test(v)) || Object.keys(state.threads).length <= threadLines.length);
    void big;
});

test('V3 path: the narrator\'s threads get engine ids; a rewording updates, a resolution by id or words settles; nothing is deleted', () => {
    const g = new Game(content, { firstMessage: 'Arrival.\n`Location: Public roadside verge outside Ashbridge, Duskreach`' }).ranger();
    g.turn('I listen at the cellar door', { threads: [{ text: 'Someone is scratching behind the cellar door', kind: 'sign', status: 'open' }] });
    const [t] = Object.values(g.state.threads);
    assert.match(t.id, /^thread\.t\d+\.\d+$/);
    assert.equal(t.at, 'loc.ashbridge');
    g.turn('I wait', { threads: [{ text: 'Someone keeps scratching behind the cellar door', kind: 'sign', status: 'open' }] });
    assert.equal(Object.keys(g.state.threads).length, 1, 'a rewording is the same thread');
    g.turn('I open the door', { threads: [{ text: 'Someone is scratching behind the cellar door', kind: 'sign', status: 'resolved' }] }, 'A cat bolts out.');
    assert.equal(g.state.threads[t.id].status, 'resolved');
    g.turn('I ask the innkeeper', { threads: [{ text: 'The innkeeper owes the miller ten silver', kind: 'debt', status: 'open' }, { id: 'thread.t99.9', text: 'nothing', kind: 'other', status: 'resolved' }] });
    assert.equal(Object.keys(g.state.threads).length, 2, 'an unknown id makes no thread');
    assert.deepEqual(g.refold().threads, g.state.threads);
});

test('10: a delivery under way to the town he set off for is one journey, not two options; a goal elsewhere beside it asks', async () => {
    const { g, d } = await setOff();
    const s = structuredClone(g.state());
    delete s.meta.private_quests; // this regression models the original pre-.83 private delivery
    s.quests['quest.parcel'] = { id: 'quest.parcel', title: 'Carry a sealed parcel to Blackgate', status: 'active', objectives: [{ id: 'o1', verb: 'DELIVER', what: 'sealed parcel', qty: 1, unit: null, where: 'Blackgate', status: 'open' }], journey: { since: 1, at: s.scene.at } };
    s.intents['intent.2'] = { id: 'intent.2', goal: 'reach Blackgate', place: 'loc.blackgate', status: 'active', since: { turn: 1, minute: 0 }, updated: { turn: 1, minute: 0 }, quote: null, why: 'he set off for it' };
    s.intents['intent.1'].status = 'paused';
    assert.deepEqual(continueOptions(s, { c: true }).map((o) => [o.kind, o.id]), [['quest', 'quest.parcel']], 'the delivery is the journey to Blackgate');
    // his own goal elsewhere beside the delivery: "I continue" cannot mean both
    s.intents['intent.1'].status = 'active';
    assert.deepEqual(continueOptions(s, { c: true }).map((o) => [o.kind, o.id]), [['intent', 'intent.1'], ['quest', 'quest.parcel']]);
    assert.ok(s.places[d.id]);
});
