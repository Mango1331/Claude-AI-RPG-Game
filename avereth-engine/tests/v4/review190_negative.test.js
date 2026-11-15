// Control review of build .190 (patch_plans_10b/REVIEW_BUILD190_GESAMTARCHITEKTUR_OPUS.md on main; the GPT control
// review's G1–G4): negative and positive regressions at the boundaries of the new location architecture.
//   G1 the end of a Dungeon level: going on is no descent; "up" where there is no way up moves him nowhere
//   G2 a building: an open way into a room from a place he cannot reach does not undo the locked door from here
//   G3 D3: rest booked and a room held do not move him there when he stays where he is
//   G4 a place whose report proved false is no known place, no reference and no destination by name
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { sectionStep, trackOf, sectionExits } from '../../src/v4/sections.js';
import { knownPlaceIds, resolvePlaceRef } from '../../src/v4/place_book.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { campaign, walk, say, linesOf, hero, delve, fightAll, living, inject, way, GO, CATA, WARRENS } from './patch8_lib.js';

const content = await loadProductContent();
const room = (name, parent = null) => ({ new: { name, kind: 'interior', parent } });
const named = (g, name) => Object.values(g.state().places).find((p) => p.name === name)?.id;
const lock = (name, seq = 1) => ({ seq, type: 'feature', feature: name, name, kind: 'obstacle', hidden: null, status: null, trigger: null, on: null, stat: 'STR', difficulty: 'hard', harm: null });

async function endOfLevelOne() {
    const g = await campaign(content);
    hero(g);
    inject(g, [{ t: 'guild.registered', d: { rank: 'Novice', branch: 'loc.ashbridge', power_rank: 'F' } }]);
    await walk(g, WARRENS, { text: '*I go to the Mossback Warrens*', prose: 'The moss-grown hill.' });
    const length = trackOf(living(g, WARRENS), 1).length;
    for (let i = 1; i <= length; i++) { await delve(g, `Tunnel ${i}`, { root: WARRENS }); await fightAll(g); }
    return { g, length };
}

test('G1 the end of Mossback level 1 (open way down): "on" and "deeper" are no descent – he is asked; "down" and a stair go down', async () => {
    const { g, length } = await endOfLevelOne();
    const s = g.state();
    assert.equal(s.places[s.scene.at].section, length, 'at the last part of level 1');
    for (const w of ['on', 'I go on', 'deeper', 'onward into the dark']) {
        const r = sectionStep(s, w);
        assert.ok(!r?.preview && !r?.to, `${w}: no move (${JSON.stringify(r)})`);
        assert.match(r.clarify || '', /end of level 1/, w);
    }
    for (const w of ['down', 'down the ramp', 'the stairs down', 'descend to level 2']) assert.equal(sectionStep(s, w).preview?.level, 2, w);
    assert.deepEqual(sectionExits(s), ['down to level 2 (go {"new": "down"})']);
    // the host path: "I go on" is a question back, nothing is booked
    const r = await say(g, '*I go on*', GO({ new: 'on' }, 'I go on'));
    assert.equal(r.action, 'panels');
    assert.match(r.panels.join('\n'), /CLARIFY[\s\S]*end of level 1 of Mossback Warrens/);
});

test('G1 a sealed level: "down" stays refused at its end; "on" is no way past the seal either', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel.' });
    await delve(g, 'Upper gallery');
    await fightAll(g);
    const end = structuredClone(g.state());
    const length = trackOf(living(g), 1).length;
    for (let k = 2; k <= length; k++) end.places[`${CATA}.l1_s${k}`] = { id: `${CATA}.l1_s${k}`, name: `Part ${k}`, kind: 'interior', parent: CATA, level: 1, section: k, visited: { turn: end.turn, minute: 0 }, tags: [] };
    end.scene.at = `${CATA}.l1_s${length}`;
    assert.match(sectionStep(end, 'down').refuse, /sealed until the guardian of level 1 falls/);
    assert.ok(!sectionStep(end, 'on')?.preview && !sectionStep(end, 'on')?.to);
});

test('G1 "up" with no way up here moves him nowhere (never on); "out" alone is no way to the gate; leaving the Dungeon is', async () => {
    const { g, length } = await endOfLevelOne();
    // level 2's first two parts, as the arrivals would have made them (a test state; no fight on level 2 needed)
    const s = structuredClone(g.state());
    const last = `${WARRENS}.l1_s${length}`;
    for (const k of [1, 2]) s.places[`${WARRENS}.l2_s${k}`] = { id: `${WARRENS}.l2_s${k}`, name: `Burrow ${k}`, kind: 'interior', parent: WARRENS, realm: s.places[WARRENS].realm, level: 2, section: k, by: 'dungeon', visited: { turn: s.turn, minute: 0 }, tags: [] };
    s.links['link.t_down'] = { id: 'link.t_down', a: last, b: `${WARRENS}.l2_s1`, both: true, by: 'dungeon', dir: 'down' };
    s.links['link.t_on'] = { id: 'link.t_on', a: `${WARRENS}.l2_s1`, b: `${WARRENS}.l2_s2`, both: true, by: 'dungeon' };
    s.scene.at = `${WARRENS}.l2_s2`;
    for (const w of ['up', 'up the ramp', 'climb up']) {
        const r = sectionStep(s, w);
        assert.ok(!r?.preview && r?.to !== `${WARRENS}.l2_s3`, `${w}: never on (${JSON.stringify(r)})`);
        assert.ok(r?.clarify, w);
    }
    // from the first part of level 2, up is the way he came down
    const first = { ...s, scene: { ...s.scene, at: `${WARRENS}.l2_s1` } };
    assert.equal(sectionStep(first, 'up').to, last);
    // "out" in other words is no way to the gate; leaving the Dungeon is
    for (const w of ['step out into the next hall', 'out of the burrow']) assert.notEqual(sectionStep(s, w)?.to, WARRENS, w);
    for (const w of ['out of the warrens', 'leave the dungeon', 'back to the gate', 'out to the surface']) assert.equal(sectionStep(s, w)?.to, WARRENS, w);
});

test('G2 a building: the locked door from the hall keeps him out of the chamber, though the chamber has an open way to a storeroom he cannot reach; an open way round from here still goes', async () => {
    const g = await campaign(content);
    await walk(g, { new: 'the old mill' }, { text: '*I walk to the old mill*', at: { new: { name: 'Old mill', kind: 'site', parent: 'realm.valedorn_crown' } }, prose: 'The mill hall: a locked door to the miller\'s chamber, a barred storeroom.',
        deltas: [lock('locked chamber door'), way(room('Miller\'s chamber'), { name: 'chamber door', feature: 'locked chamber door' }, 2),
            lock('barred storeroom door', 3), way(room('Storeroom'), { name: 'storeroom door', feature: 'barred storeroom door' }, 4)] });
    const hall = g.state().scene.at;
    const chamber = named(g, 'Miller\'s chamber');
    const store = named(g, 'Storeroom');
    // the chamber's other way, open, leads to the storeroom he cannot get into
    inject(g, [{ t: 'link.set', d: { link: { id: 'link.test_inner', a: store, b: chamber, name: 'inner hatch', both: true, hidden: false, feature: null, dir: null, since: { turn: 1, minute: 0 }, found: { turn: 1, minute: 0, how: 'seen' }, by: 'reply' } } }]);
    await say(g, '*I go into the miller\'s chamber*', GO(chamber, 'I go into the miller\'s chamber'));
    let r = await g.reply('He goes into the chamber.', { expected: { 1: { arrived: true, at: chamber, with: null } }, deltas: [] });
    assert.equal(g.state().scene.at, hall, 'the locked door holds');
    assert.ok(r.record.rejected.some((x) => x.rule === 'passage' && /barred by locked chamber door/.test(x.why)));
    // an open way round from where he is: hall → side passage → chamber
    inject(g, [{ t: 'link.set', d: { link: { id: 'link.test_round_a', a: hall, b: store, name: 'x', both: true, hidden: false, feature: null, dir: null, since: { turn: 1, minute: 0 }, found: { turn: 1, minute: 0, how: 'seen' }, by: 'reply' } } }]);
    // (still barred: the storeroom door is locked) – a real open way round:
    const s = g.state();
    const side = 'loc.test_side_passage';
    inject(g, [{ t: 'place.created', d: { place: { id: side, name: 'side passage', kind: 'interior', parent: hall, realm: s.places[hall].realm, tags: [], by: 'reply' } } },
        { t: 'link.set', d: { link: { id: 'link.test_side_a', a: hall, b: side, name: 'archway', both: true, hidden: false, feature: null, dir: null, since: { turn: 1, minute: 0 }, found: { turn: 1, minute: 0, how: 'seen' }, by: 'reply' } } },
        { t: 'link.set', d: { link: { id: 'link.test_side_b', a: side, b: chamber, name: 'back door', both: true, hidden: false, feature: null, dir: null, since: { turn: 1, minute: 0 }, found: { turn: 1, minute: 0, how: 'seen' }, by: 'reply' } } }]);
    await say(g, '*I go round into the miller\'s chamber*', GO(chamber, 'I go round into the miller\'s chamber'));
    r = await g.reply('He goes round by the side passage into the chamber.', { expected: { 1: { arrived: true, at: chamber, with: null } }, deltas: [] });
    assert.equal(g.state().scene.at, chamber, 'an open way from here goes');
});

test('G3 D3: a rest booked where he stays, and a room he holds, do not take him into the room; going there is his go', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    await walk(g, 'loc.ashbridge', { text: '*i walk to ashbridge*', prose: 'Ashbridge.' });
    await walk(g, { new: 'the Sow\'s Rest' }, { text: '*I go into the Sow\'s Rest*', at: { new: { name: 'the Sow\'s Rest', kind: 'site', parent: 'loc.ashbridge' } }, prose: 'The inn.' });
    const inn = g.state().scene.at;
    const upstairs = { new: { name: 'small room upstairs', kind: 'interior', parent: null } };
    inject(g, [{ t: 'service.granted', d: { service: 'lodging', by: null, at: inn, turn: g.state().turn } }]);
    // "I rest downstairs; I stay here": the story takes him up anyway
    await say(g, '*I rest at the downstairs table for an hour; I stay here*', { type: 'activity', kind: 'rest', minutes: 60, quote: 'I rest at the downstairs table for an hour; I stay here' });
    let r = await g.reply('He climbs to his small room upstairs and rests.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: upstairs, forced_by: null, with: null }] });
    assert.equal(g.state().scene.at, inn, 'he stays downstairs');
    assert.ok(r.record.rejected.some((x) => x.type === 'arrive' && x.rule === 'no_go'));
    // booking a room only: no move
    await say(g, '*I pay for a room*');
    r = await g.reply('She hands him the key; he goes up.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: upstairs, forced_by: null, with: null }] });
    assert.equal(g.state().scene.at, inn);
    // "I go upstairs to my paid room and sleep": his go and his sleep
    await say(g, '*I go upstairs to my paid room and sleep for eight hours*', { type: 'go', to: { new: 'my paid room upstairs' }, quote: 'I go upstairs to my paid room' }, { type: 'activity', kind: 'sleep', minutes: 480, quote: 'sleep for eight hours' });
    r = await g.reply('He goes up to the small room and sleeps.', { expected: { 1: { arrived: true, at: upstairs, with: null } }, deltas: [{ seq: 1, type: 'arrive', at: upstairs, forced_by: null, with: null }] });
    assert.equal(g.state().places[g.state().scene.at].name, 'small room upstairs');
});

test('G3 a locked private room stays shut also on a go: the lock keeps him out', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    await walk(g, 'loc.ashbridge', { text: '*i walk to ashbridge*', prose: 'Ashbridge.' });
    await walk(g, { new: 'the Sow\'s Rest' }, { text: '*I go into the Sow\'s Rest*', at: { new: { name: 'the Sow\'s Rest', kind: 'site', parent: 'loc.ashbridge' } }, prose: 'The inn; a locked door to the back office.',
        deltas: [lock('locked office door'), way(room('Back office'), { name: 'office door', feature: 'locked office door' }, 2)] });
    const inn = g.state().scene.at;
    await say(g, '*I go into the back office*', GO(named(g, 'Back office'), 'I go into the back office'));
    await g.reply('He slips into the office.', { expected: { 1: { arrived: true, at: named(g, 'Back office'), with: null } }, deltas: [] });
    assert.equal(g.state().scene.at, inn);
});

test('G4 a place whose report proved false is no known place: no reference, no name match, no destination; a report still standing is', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    await walk(g, 'loc.ashbridge', { text: '*i walk to ashbridge*', prose: 'Ashbridge.' });
    await say(g, '*I listen to the gossip*');
    await g.reply('A drover tells of a hermit\'s cave on the ridge, and of a ford mill upriver.', { expected: {}, deltas: [
        { seq: 1, type: 'place.reported', place: { new: { name: 'the hermit\'s cave', kind: 'site', parent: 'realm.duskreach' } }, by: null, how: 'told', where: 'on the ridge' },
        { seq: 2, type: 'place.reported', place: { new: { name: 'the ford mill upriver', kind: 'site', parent: 'realm.duskreach' } }, by: null, how: 'told', where: 'upriver' }] });
    const cave = named(g, 'the hermit\'s cave');
    const mill = named(g, 'the ford mill upriver');
    inject(g, [{ t: 'place.updated', d: { id: cave, set: { known: 'false' }, report: { by: null, how: 'disproved', turn: g.state().turn } } }]);
    const s = g.state();
    assert.ok(!knownPlaceIds(s).includes(cave), 'disproved: not known');
    assert.ok(knownPlaceIds(s).includes(mill), 'a report still standing is known');
    assert.ok(!(buildCatalog(s, content, { c: true }).valid_places || []).includes(cave), 'not among the valid references of the place book');
    // advertised as before .190, with its note: a memory, not a place he knows (the GPT review's allowance)
    assert.ok(!buildCatalog(s, content, { c: true }).places.some((p) => p.id === cave) || JSON.stringify(buildCatalog(s, content, { c: true }).places.find((p) => p.id === cave)).includes('proved false'));
    assert.ok(!resolvePlaceRef(s, { new: 'the hermit\'s cave' }, { from: s.scene.at }).existing, 'no name match');
    await say(g, '*I go to the hermit\'s cave*', GO(cave, 'I go to the hermit\'s cave'));
    assert.match(linesOf(g), /CANNOT GO — [^\n]*proved false/);
});

test('probe: a GO into a part whose reply is never read leaves no section; the next GO previews the same id (no orphan, stable identity)', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel.' });
    await say(g, '*I go in*', GO({ new: 'in' }, 'I go in'));
    const first = g.chat.findLast((m) => m.is_user).extra.avereth.events.find((e) => e.t === 'outcome.recorded').d.outcome.auth.gos[0].section.id;
    // the reply's extraction fails: nothing of it is booked
    const { processReplyAny, runExtraction } = await import('../../src/v4/runtime.js');
    g.chat.push({ mes: 'He goes down into a gallery.', is_user: false, extra: {} });
    const id = g.chat.length - 1;
    processReplyAny(g.chat, id, content, {});
    await runExtraction(g.chat, id, content, async () => 'not json at all');
    assert.ok(!g.state().places[first], 'no section without a confirmed arrival');
    assert.equal(g.state().scene.at, CATA);
    await say(g, '*I go in*', GO({ new: 'in' }, 'I go in'));
    assert.equal(g.chat.findLast((m) => m.is_user).extra.avereth.events.find((e) => e.t === 'outcome.recorded').d.outcome.auth.gos[0].section.id, first, 'the same part, the same id');
});

test('R5 (own finding) a stop short of a known target lies on the way: never in a third town; a stop in his town or out in the land stays', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    await walk(g, 'loc.ashbridge', { text: '*i walk to ashbridge*', prose: 'Ashbridge.' });
    await say(g, '*I go to the Guild hall*', GO('loc.ashbridge.guild_hall', 'I go to the Guild hall'));
    const stop = (at) => ({ expected: { 1: { arrived: false, at: null, with: null } }, deltas: [{ seq: 1, type: 'arrive', at, forced_by: null, with: null }] });
    let r = await g.reply('On his way he ends up somewhere else entirely.', stop('loc.glassmere'));
    assert.equal(g.state().scene.at, 'loc.ashbridge', 'no stop in Glassmere on the way to the hall of Ashbridge');
    assert.ok(r.record.rejected.some((x) => x.type === 'arrive' && x.rule === 'passage'));
    g.chat.pop();
    r = await g.reply('Halfway, a cart blocks the cooper lane.', stop({ new: { name: 'the cooper lane', kind: 'site', parent: 'loc.ashbridge' } }));
    assert.equal(g.state().places[g.state().scene.at].name, 'the cooper lane', 'a stop in his town stays (.181 P2-2)');
});
