// Patch 1 (memory retrieval, live run of 18.10.2026): the player's own words lead the retrieval query, Alaric is no focus
// entity, the lexical score flattens instead of capping, and identical lines take one line with a count. A: #45 and
// B: #63 of the run (tests/v4/live_1018_weald.json) through the real engine block; C: other retrieval situations;
// D: duplicates and cost.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, loadProductContent, Game, ROOT } from '../helpers.js';
import { foldChat } from '../../src/host.js';
import { buildContext, retrieveRelevant, DEFAULT_BUDGET } from '../../src/context.js';
import { rank } from '../../src/retrieval.js';
import { applyEvent } from '../../src/state.js';

const product = await loadProductContent();
const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1018_weald.json'), 'utf8'));

/** The engine block the narrator got before player message #n, and its RELEVANT lines. */
function at(n) {
    const { state, errors } = foldChat(fx.messages, n);
    assert.deepEqual(errors, []);
    const input = fx.messages[n].mes;
    const lastReply = fx.messages[n - 1].mes;
    const ctx = buildContext(state, product, { input, lastReply, lore: false, envelope: false });
    const section = ctx.sections.find((s) => s.name === 'relevant');
    const lines = (ctx.text.split('RELEVANT (retrieved from the campaign record):\n')[1] || '').split('\n\n')[0].split('\n').filter(Boolean);
    return { state, input, lastReply, ctx, section, lines };
}

// what the chartmaker's map established (#8-#12) and the extractor stored as memory, facts and an open thread
const MAP_MEMORY = /studied the chartmaker's map: wolves' country a day south in the Weald, the old Dungeon two days in/;
const DUNGEON_LOCATION = /the old Dungeon location marked by a faded double ring deeper in the Weald/;
const MAP_MARKS = /regional map of Ashbridge surroundings marks .*old Dungeon mark/;
const DUNGEON_THREAD = /Open thread \(mystery\): An old Dungeon is supposed to sit somewhere in the Weald/;

test('A: #45 "continue my travels towards the dungeon territory": the map, the Dungeon location and the Dungeon thread reach the narrator', () => {
    const { lines, section, input } = at(45);
    assert.match(input, /continue my travels towards the dungeon territory/);
    for (const re of [MAP_MEMORY, DUNGEON_LOCATION, DUNGEON_THREAD]) assert.ok(lines.some((l) => re.test(l)), `${re} in RELEVANT:\n${lines.join('\n')}`);
    // within the unchanged allowance of the section (a quarter of the default budget)
    assert.ok(section.tokens <= Math.floor(DEFAULT_BUDGET * 0.25) + 30, `${section.tokens} tokens`);
});

test('B: #63 "towards the Dungeon location from the map i saw": the map and the Dungeon lead the record, not the last fights', () => {
    const { lines, section, ctx, state, input, lastReply } = at(63);
    for (const re of [MAP_MEMORY, DUNGEON_LOCATION, MAP_MARKS, DUNGEON_THREAD]) assert.ok(lines.some((l) => re.test(l)), `${re} in RELEVANT:\n${lines.join('\n')}`);
    // the ranking, not only the packing: the map memory and the Dungeon location are in the top five
    const { ranked } = retrieveRelevant(state, product, { input, lastReply, pinnedIds: new Set() });
    const place = (re) => ranked.findIndex((s) => re.test(s.item.label)) + 1;
    assert.ok(place(MAP_MEMORY) <= 5 && place(DUNGEON_LOCATION) <= 8, `map memory #${place(MAP_MEMORY)}, Dungeon location #${place(DUNGEON_LOCATION)}`);
    // the old wolf and boar fights no longer fill the section: at most one fight line, no line twice
    assert.ok(lines.filter((l) => /\] Fight at /.test(l)).length <= 1, lines.join('\n'));
    assert.equal(new Set(lines).size, lines.length);
    assert.ok(section.tokens <= Math.floor(DEFAULT_BUDGET * 0.25) + 30 && ctx.sections.filter((s) => !s.own).reduce((a, s) => a + s.tokens, 0) <= DEFAULT_BUDGET);
});

test('B: a long last reply adds its names, not its prose: the narration of #62 alone does not outrank what the player named', () => {
    const { state, input, lastReply } = at(63);
    const ranked = retrieveRelevant(state, product, { input, lastReply }).ranked;
    const narrationOnly = retrieveRelevant(state, product, { input: '', lastReply }).ranked;
    const top = (r) => r.slice(0, 6).map((s) => s.item.label);
    assert.ok(top(ranked).some((l) => MAP_MEMORY.test(l)));
    assert.ok(!top(narrationOnly).some((l) => MAP_MEMORY.test(l)), 'without the player\'s words the map is not this turn\'s topic');
});

/** Noise for retrieval: fights and camp scenes about Alaric alone, newer than the record the player will name. */
function fights(g, n) {
    for (let i = 0; i < n; i++) {
        g.turn(`I fight the wolf on the ridge, round ${i}`, {
            time: 30,
            memory: [{ text: `Alaric fought a grey wolf on the ridge at dusk and was bitten on the arm (fight ${i})`, who: ['pc'], imp: 6 }],
            facts: [{ s: 'pc', p: 'wounded', o: `bite on the arm from fight ${i}` }],
        });
    }
}

test('C: a known NPC named again after many fights: her old words come back (a conversation, not a recent fight)', () => {
    const g = new Game(content).ranger();
    g.turn('I enter the herb shop and greet the herbalist.', { place: 'herb shop', new: [{ ref: 'Mara', name: 'Mara', kind: 'npc', desc: ['herbalist'] }] });
    g.turn('I ask Mara about the ferry.', {
        memory: [{ text: 'Mara told Alaric the reeve doubled the ferry toll after the flood', who: ['Mara', 'pc'], imp: 6 }],
        leave: ['Mara'],
    });
    g.turn('I leave town.', { time: 300, location: 'Alderwatch' });
    fights(g, 20);
    g.input('I think back on what Mara said about the ferry toll.');
    const r = retrieveRelevant(g.state, content, { input: g.lastInput, lastReply: g.lastReply });
    assert.match(r.ranked[0].item.label, /Mara told Alaric the reeve doubled the ferry toll/);
    assert.ok(r.items.some((s) => /ferry toll/.test(s.item.label)));
});

test('C: present NPCs and a current fight keep their entity signal; Alaric alone does not', () => {
    const g = new Game(content).ranger();
    g.turn('I look around.', { new: [{ ref: 'Hesta', name: 'Hesta', kind: 'npc', desc: ['ranger'] }] });
    g.turn('I talk to Hesta.', { memory: [{ text: 'Hesta shared her bread with Alaric at the river camp', who: ['Hesta', 'pc'], imp: 5 }] });
    g.turn('I walk on.', { memory: [{ text: 'Alaric shared his bread with a beggar at the river camp', who: ['pc'], imp: 5 }] });
    for (let i = 0; i < 5; i++) g.turn('I wait.', { time: 10 });
    g.input('I nod.');
    const r = retrieveRelevant(g.state, content, { input: 'I nod.', lastReply: '' });
    const place = (re) => r.ranked.findIndex((s) => re.test(s.item.label));
    assert.ok(place(/Hesta shared her bread/) < place(/shared his bread with a beggar/), 'the person in the scene first');
    assert.equal(r.ranked.find((s) => /beggar/.test(s.item.label)).parts.entity, 0, 'Alaric in a memory is no focus match');
});

test('C: an active Quest named by the player, and a fact about the current place, are retrieved', () => {
    const g = new Game(content).ranger();
    g.turn('I walk into town.', { facts: [{ s: 'loc.tidecross', p: 'curfew', o: 'the gates close at the eighth bell' }] });
    applyEvent(g.state, { t: 'quest.set', d: { quest: { id: 'quest.mill_rats', title: 'Rats in the Millhouse', status: 'active', notes: ['the miller pays per tail'], history: [{ turn: g.state.turn }], objectives: [] } } });
    fights(g, 15);
    g.input('Back to the rats in the millhouse.');
    const r = retrieveRelevant(g.state, content, { input: g.lastInput, lastReply: '' });
    assert.ok(r.items.some((s) => s.item.kind === 'quest' && /Rats in the Millhouse/.test(s.item.label)), 'the Quest');
    assert.ok(r.items.some((s) => /gates close at the eighth bell/.test(s.item.label)), 'the local fact, by place');
});

test('C: an ambiguous word ranks by the rarer word next to it, and two records on one topic keep their order', () => {
    const items = [
        { kind: 'fact', text: 'the tavern map on the wall shows the town wards', label: 'a', entities: [], turn: 10, importance: 0.5 },
        { kind: 'fact', text: 'the chartmaker map marks the Weald ford and the old Dungeon', label: 'b', entities: [], turn: 2, importance: 0.5 },
        { kind: 'fact', text: 'the Weald ford floods in spring', label: 'c', entities: [], turn: 3, importance: 0.5 },
        ...Array.from({ length: 30 }, (_, i) => ({ kind: 'memory', text: `Alaric walked the town road and saw carts ${i}`, label: `n${i}`, entities: ['pc'], turn: 20 + i, importance: 0.5 })),
    ];
    const r = rank(items, { entities: ['pc'], turn: 50, query: 'I follow the map to the Weald ford' });
    assert.deepEqual(r.slice(0, 3).map((s) => s.item.label), ['b', 'c', 'a']);
    // no hard cap: the record matching more of the player's words scores higher than one matching fewer
    assert.ok(r[0].parts.lexical > r[1].parts.lexical && r[0].parts.lexical < 1);
    // the same item scores the same whether or not Alaric is listed in the focus
    assert.equal(rank(items, { entities: [], turn: 50, query: 'x' })[0].score, rank(items, { entities: ['pc'], turn: 50, query: 'x' })[0].score);
});

test('D: identical lines take one line with a count; different fights stay apart; the record keeps every event', () => {
    const g = new Game(content).ranger();
    for (const who of ['Wolf A', 'Wolf A', 'Wolf B']) g.turn('I strike.', { memory: [{ text: `Alaric killed ${who} at the ridge`, who: ['pc'], imp: 6 }] });
    // the two "Wolf A" memories share their minute only if no time passed: give them the same minute
    const ridge = g.state.memories.filter((m) => /killed Wolf A/.test(m.text));
    ridge[1].minute = ridge[0].minute;
    for (let i = 0; i < 5; i++) g.turn('I wait.', { time: 10 });
    g.input('I think about the wolves I killed at the ridge.');
    const r = retrieveRelevant(g.state, content, { input: g.lastInput, lastReply: '' });
    const labels = r.items.map((s) => s.item.label);
    assert.equal(labels.filter((l) => /killed Wolf A at the ridge \(×2\)/.test(l)).length, 1, labels.join('\n'));
    assert.equal(labels.filter((l) => /killed Wolf B at the ridge/.test(l)).length, 1);
    assert.equal(g.state.memories.filter((m) => /killed Wolf A/.test(m.text)).length, 2, 'state untouched');
});

test('D: #63 of the live run: the two identical wolf lines are one; ranking a campaign of 5,000 records stays cheap', () => {
    const { state, input, lastReply } = at(63);
    const all = retrieveRelevant(state, product, { input, lastReply, budget: 40000 }).items.map((s) => s.item.label);
    assert.equal(new Set(all).size, all.length, 'no line twice, even with an unlimited allowance');
    assert.ok(all.some((l) => /\(×2\)$/.test(l)));
    const items = Array.from({ length: 5000 }, (_, i) => ({ kind: 'memory', text: `Alaric walked the road ${i % 97} and met trader ${i % 31} near the ford ${i % 13}`, entities: ['pc', `npc.t${i % 31}`], turn: i, importance: 0.5 }));
    const t0 = performance.now();
    rank(items, { entities: ['pc', 'npc.t3'], turn: 5000, query: 'I ask the trader about the ford', context: 'Ashbridge' });
    const ms = performance.now() - t0;
    assert.ok(ms < 2000, `${Math.round(ms)} ms for 5,000 records`);
});
