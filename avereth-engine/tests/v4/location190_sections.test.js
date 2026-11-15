// Location architecture .190, stage 3 (docs/LOCATION_ARCHITECTURE_190.md; D1 = B5, D1a–D1d): a true Living Dungeon is a
// fixed, finite, linear run of engine sections per level, previewed by the GO and made only by the confirmed arrival,
// named once by it; the way down is at the end of a level (behind its seal); nothing after the track; no room, passage,
// stair or level the story invents. Outside true Dungeons a building is no longer made a place explored room by room
// (D1b): its rooms stay rooms, a blocked way still keeps him out, an unknown way is no refusal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { trackOf, sectionsOf, sectionStep, sectionExits } from '../../src/v4/sections.js';
import { campaign, walk, say, linesOf, hero, delve, fightAll, living, ahead, inject, slotDelta, way, GO, CATA, GROTTO, WARRENS } from './patch8_lib.js';

const content = await loadProductContent();
const GLASSMERE = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Glassmere, Caelreth`';
const room = (name, parent = null) => ({ new: { name, kind: 'interior', parent } });
const placesNamed = (g, name) => Object.values(g.state().places).filter((p) => p.name === name);
async function grotto() {
    const g = await campaign(content, { greeting: GLASSMERE });
    hero(g);
    inject(g, [{ t: 'guild.registered', d: { rank: 'Novice', branch: 'loc.glassmere', power_rank: 'F' } }]);
    await walk(g, GROTTO, { text: '*I go to the Glimmerdeep Grotto*', prose: 'The cleft in the hills.' });
    const fee = Object.values(g.state().offers).find((o) => o.gate === GROTTO && o.status === 'open');
    if (fee) {
        await say(g, '*I pay the fee*', { type: 'offer.accept', offer: fee.id, lines: ['l1'], qty: null, quote: 'I pay the fee' });
        await g.reply('He pays.', { expected: {}, deltas: [] });
    }
    return g;
}

test('.190 B5 preview/commit: a GO into a part names the engine\'s next section; nothing is made before the story; the confirmed arrival makes it once, named by it, swipe- and fold-stable', async () => {
    const g = await grotto();
    await say(g, '*I go in*', GO({ new: 'into the grotto' }, 'I go in'));
    assert.match(linesOf(g), /GOES — on into part 1 of level 1 of Glimmerdeep Grotto \(the engine's next part/);
    assert.ok(!g.state().places[`${GROTTO}.l1_s1`], 'previewed, not made');
    const a = ahead(g, GROTTO);
    const answer = { expected: { 1: { arrived: true, at: room('Glittering mouth tunnel'), with: null } }, deltas: [slotDelta(a.slot)] };
    await g.reply('He goes into a glittering mouth tunnel; beetles click.', answer);
    const made = g.state().places[`${GROTTO}.l1_s1`];
    assert.deepEqual([made.name, made.level, made.section, made.by, g.state().scene.at], ['Glittering mouth tunnel', 1, 1, 'dungeon', made.id]);
    const once = JSON.stringify(g.state().places);
    // the swipe: the same reply regenerated makes the same section, once
    g.chat.pop();
    await g.reply('He goes into a glittering mouth tunnel; the beetles click and turn.', answer);
    assert.equal(JSON.stringify(g.state().places), once);
    assert.equal(JSON.stringify(foldChat(g.chat).state.places), once, 'the fold agrees');
});

test('.190 B5 .186 Mage: Glimmerdeep has one level: its track ends, nothing further, no way down; a room or a stair the story tells is none', async () => {
    const g = await grotto();
    const length = trackOf(living(g, GROTTO), 1).length;
    for (let i = 1; i <= length; i++) { await delve(g, `Grotto part ${i}`, { root: GROTTO }); await fightAll(g); }
    const s = g.state();
    assert.equal(sectionsOf(s, GROTTO, 1).length, length);
    assert.deepEqual(sectionExits(s), ['nothing further: the end of level 1']);
    await say(g, '*I go on deeper*', GO({ new: 'deeper' }, 'I go on deeper'));
    assert.match(linesOf(g), /nothing further on level 1 of Glimmerdeep Grotto: this is the end of its way and it has no level below/);
    await say(g, '*I take the stairs down*', GO({ new: 'the stairs down' }, 'I take the stairs down'));
    assert.match(linesOf(g), /Glimmerdeep Grotto has no level below level 1/);
    // a slope down is a way on (B1, R-B6): at the end of the track, nothing further
    assert.match(sectionStep(g.state(), 'down the sloping passage').refuse, /nothing further on level 1 of Glimmerdeep Grotto/);
    // the story's crystal cave and its stair: refused, nothing made, he stays
    const r = await g.reply('He finds a crystal cave below and a stair.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: room('Crystal cave'), forced_by: null, with: null }, way(room('Crystal cave'), { dir: 'down', name: 'stair' }, 2),
        { seq: 3, type: 'place.reported', place: { new: { name: 'Deep gallery', kind: 'interior', parent: GROTTO } }, by: null, how: 'told', where: 'below' }] });
    assert.equal(g.state().scene.at, s.scene.at);
    assert.ok(!placesNamed(g, 'Crystal cave').length && !placesNamed(g, 'Deep gallery').length);
    assert.ok(r.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'dungeon_way'));
    assert.ok(!Object.values(g.state().places).some((p) => p.level === 2));
});

test('.190 B5 .188 Mage: the Queen is met in her own section of level 1; a reported "deep gallery" is no place', async () => {
    const g = await grotto();
    const track = trackOf(living(g, GROTTO), 1);
    let queen = null;
    for (let i = 1; i <= track.length && !queen; i++) {
        await say(g, '*I go on*', GO({ new: 'on' }, 'I go on'));
        const a = ahead(g, GROTTO);
        const sl = a && a.turn === g.state().turn ? a.slot : null;
        if (sl?.id === 'queen') queen = { k: i, a };
        await g.reply(`Part ${i}.`, { expected: { 1: { arrived: true, at: room(`Part ${i}`), with: null } }, deltas: sl ? [slotDelta(sl)] : [] });
        if (!queen) await fightAll(g);
    }
    assert.ok(queen, 'the Queen is placed ahead');
    assert.equal(queen.k, track.positions.at(-1), 'in the section of her slot, the last of the level');
    assert.equal(queen.a.floor, 1);
    assert.equal(g.state().places[g.state().scene.at].level, 1, 'on level 1, the only one');
});

test('.190 B5 Mossback: two levels; the way down is at the end of level 1 (unsealed), level 2 is the engine\'s; back up and out by the sections he knows', async () => {
    const g = await campaign(content);
    hero(g);
    inject(g, [{ t: 'guild.registered', d: { rank: 'Novice', branch: 'loc.ashbridge', power_rank: 'F' } }]);
    await walk(g, WARRENS, { text: '*I go to the Mossback Warrens*', prose: 'The moss-grown hill.' });
    const length = trackOf(living(g, WARRENS), 1).length;
    for (let i = 1; i <= length; i++) { await delve(g, `Tunnel ${i}`, { root: WARRENS }); await fightAll(g); }
    assert.ok(sectionExits(g.state()).some((x) => /^down to level 2/.test(x)));
    await delve(g, 'Lower burrows', { root: WARRENS, text: '*I go down*' });
    const lower = g.state().scene.at;
    assert.equal(lower, `${WARRENS}.l2_s1`);
    assert.equal(g.state().places[lower].name, 'Lower burrows');
    await fightAll(g);
    // back up: the last part of level 1, by the way down it was made by
    assert.deepEqual(sectionStep(g.state(), 'back up'), { to: `${WARRENS}.l1_s${length}` });
    // out: the gate, through the parts he knows
    await walk(g, WARRENS, { text: '*I walk back out*', prose: 'Out to the hill.' });
    assert.equal(g.state().scene.at, WARRENS);
    // in again: the first part he knows, never a new one beside it
    assert.deepEqual(sectionStep(g.state(), 'in'), { to: `${WARRENS}.l1_s1` });
});

test('.190 B5 reset and revisit: after the Dungeon renews, the same sections; its encounters are met where they always are; the slain stay dead', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel.' });
    await delve(g, 'First burial gallery');
    await fightAll(g);
    const first = g.state().scene.at;
    const slain = living(g).run.floors[1].slots[0].entities;
    await walk(g, CATA, { text: '*I go back out*', prose: 'The chapel.' });
    await walk(g, 'loc.alderwatch', { text: '*I go back to Alderwatch*', prose: 'Alderwatch.' });
    inject(g, [{ t: 'time.advanced', d: { minutes: 6 * 1440, why: 'test' } }]);
    await walk(g, CATA, { text: '*I go to the catacombs again*', prose: 'The chapel again.' });
    assert.ok(living(g).cycle >= 2, 'renewed');
    await say(g, '*I go in*', GO(first, 'I go in'));
    const a = ahead(g);
    const sl = a && a.turn === g.state().turn ? a.slot : null;
    const taken = living(g).run.floors[1].slots[0].taken;
    if (!taken) assert.ok(sl, `the first encounter of the new cycle, in the first section (${linesOf(g)})`);
    await g.reply('Back in the first burial gallery.', { expected: { 1: { arrived: true, at: room('The first burial gallery again'), with: null } }, deltas: sl ? [slotDelta(sl)] : [] });
    const s = g.state();
    assert.equal(s.scene.at, first, 'the same section, by its id');
    assert.equal(s.places[first].name, 'First burial gallery', 'named once, never renamed');
    assert.equal(placesNamed(g, 'The first burial gallery again').length, 0);
    for (const id of slain) assert.equal(s.entities[id].status, 'dead', 'the slain of the old cycle stay dead');
});

test('.190 B5 other adventurers: an encounter a company took leaves its section quiet; the track does not move', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel.' });
    const x = living(g);
    inject(g, [{ t: 'dungeon.slot', d: { id: CATA, cycle: x.cycle, floor: 1, slot: x.run.floors[1].slots[0].id, set: { taken: { party: 'party.test', turn: g.state().turn } } } }]);
    await say(g, '*I go in*', GO({ new: 'in' }, 'I go in'));
    assert.match(linesOf(g), /holds no foe/, 'its section is quiet');
    const r = await g.reply('An empty gallery, picked clean.', { expected: { 1: { arrived: true, at: room('Picked gallery'), with: null } }, deltas: [] });
    assert.equal(g.state().scene.at, `${CATA}.l1_s1`);
    assert.ok(!rec(g.chat.at(-1)).corrections?.some((c) => /ENGINE ENCOUNTER/.test(c)), r.record.corrections?.join(' | '));
    assert.equal(trackOf(living(g), 1).positions[1], trackOf(x, 1).positions[1], 'the next encounter stays in its own section');
});

test('.190 D1b: a building out in the land is no longer made a place explored room by room; its rooms stay rooms, a locked way keeps him out, an unknown way is no refusal', async () => {
    const g = await campaign(content);
    await walk(g, { new: 'the old mill' }, { text: '*I walk to the old mill*', at: { new: { name: 'Old mill', kind: 'site', parent: 'realm.valedorn_crown' } }, prose: 'The old mill: a door to the grain loft, locked; a back room.',
        deltas: [{ seq: 1, type: 'feature', feature: 'locked loft door', name: 'locked loft door', kind: 'obstacle', hidden: null, status: null, trigger: null, on: null, stat: 'STR', difficulty: 'hard', harm: null },
            way(room('Grain loft'), { name: 'loft door', feature: 'locked loft door' }, 2), way(room('Back room'), { name: 'side door' }, 3)] });
    const s = g.state();
    const mill = s.scene.at;
    assert.equal(s.places[mill].rooms, undefined, 'not made a place explored room by room');
    const loft = placesNamed(g, 'Grain loft')[0].id;
    const back = placesNamed(g, 'Back room')[0].id;
    // the locked loft: he does not get in
    await say(g, '*I go up into the grain loft*', GO(loft, 'I go up into the grain loft'));
    const r = await g.reply('He climbs into the grain loft.', { expected: { 1: { arrived: true, at: loft, with: null } }, deltas: [] });
    assert.equal(g.state().scene.at, mill);
    assert.ok(r.record.rejected.some((x) => x.rule === 'passage' && /barred by/.test(x.why)));
    // the back room: no way check beyond what blocks it
    await walk(g, back, { text: '*I go into the back room*', prose: 'The back room.' });
    assert.equal(g.state().scene.at, back);
});
