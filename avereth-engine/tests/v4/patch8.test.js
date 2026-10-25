// Patch 8 (Living Dungeons, docs/PATCH8_LIVING_DUNGEONS.md): the ten end-to-end scenarios of the order, played through
// the product's host path (planner on, scripted planner and extractor answers; src/v4/living.js does the rest).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadProductContent, ROOT } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { worldRows } from '../../src/hud.js';
import { buildContext } from '../../src/context.js';
import { extractorCatalog } from '../../src/v4/catalog.js';
import { applyWorld } from '../../src/v4/world.js';
import { contractReady, goalText, parseBoard, bookBoard } from '../../src/v4/guild.js';
import { applyEvent } from '../../src/state.js';
import { resolved, occupancy, spansFor, establishEvents } from '../../src/v4/living.js';
import { Chat4 } from './harness.js';
import {
    campaign, say, walk, inject, living, ahead, slotDelta, delve, hero, fightAll, linesOf, outcomeOf, lastUser, way, room, GO,
    CATA, GROTTO, WARRENS,
} from './patch8_lib.js';

const content = await loadProductContent();
const rows = (g) => Object.fromEntries(worldRows(g.state(), content));
const register = (g, branch = 'loc.alderwatch') => inject(g, [{ t: 'guild.registered', d: { rank: 'Novice', branch, power_rank: 'F' } }]);
const days = (g, n) => inject(g, [{ t: 'time.advanced', d: { minutes: n * 1440, why: 'test' } }]);
/** Delve on until the level's encounters are met and fought (the engine's encounters; quiet parts between). */
async function clearLevel(g, floor, { root = CATA, names = 'Part', max = 8 } = {}) {
    for (let i = 0; i < max; i++) {
        if (living(g, root).run.floors[floor].cleared) return;
        await delve(g, `${names} ${floor}.${i + 1}`, { root });
        await fightAll(g);
    }
    assert.fail(`level ${floor} not cleared`);
}

// ------------------------------------------------------------------------------------------------ 1. a whole seed Dungeon
test('patch 8 (1): Old Crown Catacombs from gate to boss: level 1 by its encounters and guardian, the seal, level 2 and its boss, loot, out, renewed and visited again', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The ruined chapel; a stair goes down.' });
    let s = g.state();
    const x = living(g);
    assert.ok(x, 'established at the first contact');
    assert.equal(s.scene.at, CATA, 'at its gate');
    assert.equal(x.gate.text, 'the stair beneath the ruined chapel, watched by the temple wardens');
    assert.deepEqual(Object.keys(x.floors), ['1', '2']);
    assert.equal(x.floors[1].slots.at(-1).role, 'guard');
    assert.equal(x.floors[2].slots.at(-1).name, 'the Ossuary Lord');
    // levels within each level's Rank band, never Alaric's (level 40 now)
    for (const [n, f] of Object.entries(x.run.floors)) for (const sl of f.slots) for (const lv of sl.levels) {
        const band = content.rules.ranks.bands.find((b) => b.rank === x.floors[n].rank.min);
        assert.ok(lv >= band.min && lv <= band.max, `level ${n} ${sl.id}: ${lv} in ${band.rank}`);
    }
    // the first part he goes into holds the engine's first encounter, and the story's creatures are its individuals
    const first = await delve(g, 'First Burial Gallery');
    s = g.state();
    assert.ok(first.slot, 'an encounter placed ahead');
    assert.match(linesOf(g), /DUNGEON AHEAD \(the engine's\) — going on into a part of level 1/);
    const ids = s.dungeons[CATA].run.floors[1].slots[0].entities;
    assert.equal(ids.length, first.slot.count);
    for (const [i, id] of ids.entries()) {
        assert.equal(s.entities[id].slot.id, first.slot.id);
        assert.equal(s.entities[id].profile.level, first.slot.levels[i], 'its level is the slot\'s');
    }
    await fightAll(g);
    await clearLevel(g, 1);
    s = g.state();
    const c1 = s.dungeons[CATA].clears.find((c) => c.floor === 1);
    assert.equal(c1.credit, 'pc');
    assert.equal(s.entities[s.dungeons[CATA].run.floors[1].slots.at(-1).entities[0]].profile.type, 'elite', 'the guardian is an elite');
    // the level shows cleared, and the narrator shows it in the world
    assert.match(rows(g).Levels, /level 1 \(F\): CLEARED this cycle \(by him\)/);
    // the way down: shown, then taken; level 2 by the seal that broke
    await say(g, '*I look around*');
    await g.reply('Behind the warden\'s alcove a stair goes down.', { expected: {}, deltas: [way(room('Lower Ossuary'), { name: 'stair down', dir: 'down' })] });
    const lower = Object.values(g.state().places).find((p) => p.name === 'Lower Ossuary').id;
    await say(g, '*I go down the stair*', GO(lower, 'I go down the stair'));
    const a = ahead(g);
    assert.equal(a.floor, 2);
    await g.reply('A ghoul turns in the ossuary.', { expected: { 1: { arrived: true, at: lower, with: null } }, deltas: [slotDelta(a.slot)] });
    assert.equal(g.state().scene.at, lower);
    assert.equal(g.state().places[lower].level, 2);
    await fightAll(g);
    await clearLevel(g, 2, { names: 'Ossuary' });
    s = g.state();
    const lord = s.dungeons[CATA].run.floors[2].slots.find((y) => y.role === 'boss');
    const boss = s.entities[lord.entities[0]];
    assert.equal(boss.name, 'Ossuary Lord');
    assert.equal(boss.profile.type, 'boss');
    assert.equal(boss.status, 'dead');
    assert.ok(boss.looted, 'its loot credited once');
    // no boss again this cycle: the story's "Ossuary Lord" again is refused
    await say(g, '*I look around*');
    const back = await g.reply('The Ossuary Lord rises again!', { expected: {}, deltas: [{ ...slotDelta(lord), seq: 1 }] });
    assert.ok(back.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'dungeon_slot'));
    assert.equal(Object.values(g.state().entities).filter((e) => e.slot?.id === 'lord').length, 1);
    // out to the gate, away, and back after its reset: the same Dungeon, a new cycle, new individuals; the dead stay dead
    await walk(g, CATA, { text: '*I walk back out to the chapel*', prose: 'Back up to the chapel.' });
    await walk(g, 'loc.alderwatch', { text: '*I go back to Alderwatch*', prose: 'Alderwatch.' });
    days(g, 4);
    await walk(g, CATA, { text: '*I go to the catacombs again*', prose: 'The chapel again.' });
    s = g.state();
    const y = s.dungeons[CATA];
    assert.ok(y.cycle >= 2, 'renewed');
    assert.equal(y.floors[2].slots.at(-1).name, 'the Ossuary Lord', 'the boss role keeps its identity');
    assert.equal(s.entities[boss.id].status, 'dead', 'the slain individual is not brought back');
    assert.ok(y.run.floors[2].slots.at(-1).ref.includes(`_c${y.cycle}_`), 'a new individual for the new cycle');
    assert.equal(y.run.floors[1].cleared, null);
    const next = await delve(g, 'Renewed gallery');
    assert.ok(next.slot || /holds no foe/.test(linesOf(g)), 'the renewed level holds encounters again (or a quiet part before one)');
});

// ------------------------------------------------------------------------------------------------ 2. a new Dungeon
test('patch 8 (2): a Dungeon play discovers (a D-Rank crypt) gets its own structure from its classification: levels, encounters of its theme, a boss, its Rank\'s windows, capacity and cycle', async () => {
    const g = await campaign(content);
    await say(g, '*I go to the sunken crypt*', GO({ new: 'the sunken crypt' }, 'I go to the sunken crypt'));
    await g.reply('A sunken crypt, marked D-Rank by the Guild; ghouls and skeletons, something worse below.', {
        expected: { 1: { arrived: true, at: { new: { name: 'Sunken crypt', kind: 'site', parent: 'realm.valedorn_crown' } }, with: null } },
        deltas: [
            { seq: 1, type: 'dungeon', place: null, theme: 'flooded crypt: restless skeletons, ghouls deeper down', rank_min: 'D', rank_max: 'D', level: null, control: null, how: 'seen' },
            { seq: 2, type: 'dungeon', place: null, theme: null, rank_min: 'D', rank_max: 'D', level: 2, control: null, how: 'seen' },
        ],
    });
    await say(g, '*I look around*');
    await g.reply('The crypt.', { expected: {}, deltas: [] });
    const s = g.state();
    const root = Object.values(s.places).find((p) => p.name === 'Sunken crypt').id;
    const x = s.dungeons[root];
    assert.ok(x, 'established');
    assert.equal(x.capacity, content.rules.living.capacity_by_rank.D);
    assert.equal(x.reset_min, content.rules.living.reset_days_by_rank.D * 1440);
    const D = content.rules.ranks.bands.find((b) => b.rank === 'D');
    assert.deepEqual(x.floors[2].spans, spansFor(content, { min: 'D', max: 'D' }));
    for (const f of Object.values(x.run.floors)) for (const sl of f.slots) for (const lv of sl.levels) assert.ok(lv >= D.min && lv <= D.max);
    const anchors = new Set(Object.values(x.floors).flatMap((f) => f.slots.map((sl) => sl.anchor)));
    assert.ok(anchors.has('skeleton') && anchors.has('ghoul'), `its theme's creatures (${[...anchors]})`);
    const last = Object.keys(x.floors).at(-1);
    assert.equal(x.floors[last].slots.at(-1).role, 'boss');
    assert.match(x.floors[last].slots.at(-1).name, /^the Ghoul /);
    assert.equal(x.parties.length, content.rules.living.parties);
    // fixed once: a later telling does not draw it again
    const before = JSON.stringify(x.floors);
    await say(g, '*I look around*');
    await g.reply('Still the crypt.', { expected: {}, deltas: [] });
    assert.equal(JSON.stringify(living(g, root).floors), before);
});

// ------------------------------------------------------------------------------------------------ 3. other adventurers
test('patch 8 (3): companies use the Glimmerdeep Grotto on their own days: they fill its places (a full Dungeon turns him back), deal with its encounters, its queen too, and leave him nothing of it; his contract for the level is withdrawn', async () => {
    const g = await campaign(content, { greeting: 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Glassmere, Caelreth`' });
    register(g, 'loc.glassmere');
    await walk(g, GROTTO, { text: '*I go to the Glimmerdeep Grotto*', prose: 'The cleft in the hills.' });
    let x = living(g, GROTTO);
    assert.ok(x.parties.length >= 1);
    // a contract to clear its level, taken before (an ordinary Guild contract of the board)
    const q = { id: 'quest.glimmer', title: 'Clear the Outer Grottos', kind: 'guild_contract', status: 'active', rank: 'Novice', level: 1, qtype: 'minor', payout_cp: 60, objectives: [{ id: 'o1', verb: 'DEFEAT', what: 'crystal beetles', qty: null, unit: null, where: 'Glimmerdeep Grotto, level 1', status: 'open' }], proof: [], history: [{ turn: 1, minute: 0, status: 'active' }], source: { branch: 'loc.glassmere' }, taker: 'pc', details: [], notes: [] };
    inject(g, [{ t: 'quest.created', d: { quest: q } }]);
    // he waits nearby, day after day, while the companies come and go
    await walk(g, 'loc.glassmere', { text: '*I go back to Glassmere*', prose: 'Glassmere.' });
    let full = null;
    for (let d = 0; d < 30 && !living(g, GROTTO).run.floors[1].slots.find((sl) => sl.role === 'boss').taken; d++) {
        days(g, 1);
        await say(g, '*I wait*');
        await g.reply('A day passes.', { expected: {}, deltas: [] });
        x = living(g, GROTTO);
        if (!full && Object.keys(x.inside).length) full = structuredClone(x.inside);
    }
    x = living(g, GROTTO);
    const queen = x.run.floors[1].slots.find((sl) => sl.role === 'boss');
    assert.ok(queen.taken, 'a company dealt with the Glimmer Queen');
    assert.equal(queen.entities.length, 0, 'never an individual of his story: no XP or loot of it is his');
    assert.ok(x.parties.some((p) => p.id === queen.taken.party));
    const cleared = x.clears.find((c) => c.floor === 1 && c.cycle === x.cycle);
    assert.equal(cleared.credit, 'others', 'the level cleared by the companies');
    assert.equal(g.state().quests['quest.glimmer'].status, 'failed', 'the Guild withdraws a contract others fulfilled first');
    assert.equal(contractReady(g.state(), content, g.state().quests['quest.glimmer'], { c: true }).ok, false, 'never paid to him');
    assert.equal(Object.values(g.state().entities).filter((e) => /queen/i.test(e.species || '')).length, 0);
    // a full Dungeon turns him back at the gate
    const s = g.state();
    const crowd = { t: 'dungeon.party', d: { id: GROTTO, party: x.parties[0].id, kind: 'enter', until: s.clock.minute + 600 } };
    inject(g, [crowd, { t: 'dungeon.booked', d: { id: GROTTO, to: s.clock.minute } }]);
    const cap = { ...living(g, GROTTO), capacity: x.parties[0].size };
    inject(g, [{ t: 'dungeon.established', d: { dungeon: cap } }]);
    await walk(g, GROTTO, { text: '*I go to the grotto*', prose: 'The cleft.' });
    await say(g, '*I go in*', GO(GROTTO, 'I go in'));
    assert.match(linesOf(g), /CANNOT ENTER — Glimmerdeep Grotto is full/);
    assert.ok(occupancy(g.state(), living(g, GROTTO)).parties >= cap.capacity);
});

// ------------------------------------------------------------------------------------------------ 4. a cull with its number
test('patch 8 (4): a cull shows its number on the board ("(4)"), counts "2/4 defeated" for his kills in its land after he took it, never before, never elsewhere', async () => {
    const g = await campaign(content);
    register(g);
    const need = { branch: 'loc.alderwatch', rank: 'Novice', missing: 1, day: 1, have: [], c: true };
    const answer = JSON.stringify({ listings: [{ title: 'Cull the Wolves', client: 'Hollin farmstead', rank: 'Novice', level: 1, qtype: 'minor', payout_cp: 50, task: 'Cull the wolves taking sheep at Hollin.', desired_end_state: 'The wolves at Hollin are culled.', objectives: [{ verb: 'DEFEAT', what: 'grey wolves', qty: null, unit: null, where: 'Hollin farmstead' }], proof: [] }] });
    const s0 = g.state();
    // A historical listing with no quantity still uses the original booking defaults.
    const p = { listings: JSON.parse(answer).listings };
    const ev = [];
    bookBoard(s0, content, need, p.listings, (e) => { applyEvent(s0, e); ev.push(e); });
    const q = Object.values(s0.quests).find((x) => x.title === 'Cull the Wolves');
    const n = q.objectives[0].qty;
    assert.ok(n >= 3 && n <= 5, `the engine fixed its number (${n})`);
    assert.equal(goalText(s0, content, q, { board: true }), ` (${n})`);
    // a wolf killed before he took it, and one in another realm: neither counts
    const wolf = (id, at, turn) => [
        { t: 'entity.created', d: { entity: { id, kind: 'creature', species: 'grey wolf', anchor: 'wolf', descriptors: ['grey wolf'], status: 'alive', location: at, met_at: at, created: { turn, minute: 0 } } } },
        { t: 'entity.status', d: { id, status: 'dead' } },
        { t: 'fact.asserted', d: { fact: { id: `f.${id}.status`, s: id, p: 'status', o: 'dead', since: { turn, minute: 0 }, until: null, visibility: 'public', importance: 0.9, hard: true, source: { kind: 'engine', encounter: 'enc.x' } } } },
    ];
    const s = structuredClone(s0);
    for (const e of wolf('mon.early', 'loc.alderwatch', 0)) applyEvent(s, e);
    applyEvent(s, { t: 'quest.status', d: { id: q.id, from: 'listed', to: 'active', taker: 'pc' } });
    s.turn += 1;
    for (const e of [...wolf('mon.w1', 'loc.alderwatch', s.turn), ...wolf('mon.w2', 'realm.valedorn_crown', s.turn), ...wolf('mon.far', 'loc.ashbridge', s.turn)]) applyEvent(s, e);
    assert.equal(goalText(s, content, s.quests[q.id]), ` — 2/${n} defeated`);
    assert.equal(contractReady(s, content, s.quests[q.id], { c: true }).ok, false, 'not before the number is reached');
});

// ------------------------------------------------------------------------------------------------ 5. a Dungeon clear
test('patch 8 (5): "Clear Old Crown Catacombs — level 1": the level\'s state decides, his own clearing makes it ready, the desk pays once', async () => {
    const g = await campaign(content);
    register(g);
    hero(g);
    const need = { branch: 'loc.alderwatch', rank: 'Novice', missing: 1, day: 1, have: [], c: true };
    const answer = JSON.stringify({ listings: [{ title: 'Skeletons in the Upper Galleries', client: 'Temple Wardens of Alderwatch', rank: 'Novice', level: 1, qtype: 'minor', payout_cp: 60, task: 'Clear level 1 of the Old Crown Catacombs.', desired_end_state: 'Level 1 of the Old Crown Catacombs is clear.', objectives: [{ verb: 'DEFEAT', what: 'restless skeletons', qty: null, unit: null, where: 'Old Crown Catacombs, level 1' }], proof: [] }] });
    inject(g, []);
    const s0 = g.state();
    const p = parseBoard(answer, content, need, s0);
    const booked = [];
    bookBoard(s0, content, need, p.listings, (e) => booked.push(e));
    const q = booked.find((e) => e.t === 'quest.created').d.quest;
    assert.deepEqual(q.clear, { dungeon: CATA, floor: 1 });
    inject(g, [...booked, { t: 'quest.status', d: { id: q.id, from: 'listed', to: 'active', taker: 'pc' } }]);
    assert.equal(goalText(g.state(), content, g.state().quests[q.id], { board: true }), ' — Clear Old Crown Catacombs, level 1');
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel.' });
    assert.equal(contractReady(g.state(), content, g.state().quests[q.id], { c: true }).ok, false);
    assert.match(goalText(g.state(), content, g.state().quests[q.id]), /level 1: not cleared yet/);
    await clearLevel(g, 1);
    const s = g.state();
    assert.equal(contractReady(s, content, s.quests[q.id], { c: true }).mode, 'dungeon_clear');
    assert.match(goalText(s, content, s.quests[q.id]), /level 1: cleared by him/);
    assert.match(extractorCatalog(s, content, { c: true }).text, /goal: Clear Old Crown Catacombs, level 1: cleared by him/);
    // turned in at the Guild desk: paid once, by the level he cleared (no trophy, no count)
    await walk(g, CATA, { text: '*I go back up to the chapel*', prose: 'The chapel.' });
    await walk(g, 'loc.alderwatch.guild_hall', { text: '*I go back to the Guild hall*', prose: 'The Guild hall.' });
    const coin = g.state().entities.pc.sheet.coin_cp;
    await say(g, '*I turn in the contract*', { type: 'quest.turn_in', quest: q.id, quote: 'I turn in the contract' });
    const done = g.state();
    assert.equal(done.quests[q.id].status, 'completed');
    assert.equal(done.entities.pc.sheet.coin_cp, coin + 60);
    assert.equal(lastUser(g).events.find((e) => e.t === 'proof.checked').d.mode, 'dungeon_clear');
});

// ------------------------------------------------------------------------------------------------ 6. the .24 regressions
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1021c.json'), 'utf8'));
function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
const raw = (n) => fx.messages[n].extra.avereth.extraction.raw;
test('patch 8 (6): the .24 run: the chapel above the catacombs is its gate (no "passage" refusal); the corridor beyond the stair lies on level 2; the ghoul is a ghoul of its level\'s window', async () => {
    // #16: arrival at "Ruined chapel above the Old Crown Catacombs" (refused in .24: "where he did not set out for")
    const a = live(16);
    const r16 = await a.reply(fx.messages[16].mes, raw(16));
    assert.equal(a.state().scene.at, CATA, 'at the Dungeon\'s gate');
    assert.ok(!r16.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'passage'));
    // #32: "I walk down the stairs" to the stairway room (level 2), the story went on into a new corridor: through it.
    // Level 1 of this campaign counts as cleared here: under this build its sealed stair opens only then (the .24 run
    // went down before any seal existed)
    const b = live(32);
    const pre = b.state();
    const est = establishEvents(pre, content, CATA);
    inject(b, [...est, { t: 'dungeon.cleared', d: { id: CATA, cycle: 1, floor: 1, credit: 'pc', pc: 3, others: 0, total: 3, turn: pre.turn, minute: pre.clock.minute } }]);
    await b.reply(fx.messages[32].mes, raw(32));
    const s = b.state();
    const corridor = 'loc.old_crown_catacombs.black_corridor_below_the_bier_chamber';
    assert.equal(s.scene.at, corridor);
    assert.equal(s.places[corridor].level, 2, 'the level the stair leads to (.24: 1)');
    assert.ok(Object.values(s.links).some((l) => l.a === 'loc.old_crown_catacombs.stairway_down_from_the_bier_chamber' && l.b === corridor), 'joined to the stair, not the bier chamber');
    // #34: the ghoul the extractor put on the skeleton body plan
    const c = live(34);
    await c.reply(fx.messages[34].mes, raw(34));
    const ghoul = c.state().entities['mon.ghoul_hollow'];
    assert.equal(ghoul.profile.anchor, 'ghoul');
    assert.equal(ghoul.profile.attack.name, 'Rending claws');
    assert.ok(ghoul.profile.level <= 5, `the minion window of its (stored) level 1, never the band's top (${ghoul.profile.level}; .24: 14)`);
    // the content audit: the seed Dungeons' creatures have their body plans
    for (const [species, anchor] of [['mineral slime', 'slime'], ['goblin shaman', 'goblin_shaman'], ['crystal beetle', 'arthropod'], ['restless skeleton', 'skeleton'], ['goblin warrior', 'goblin']]) {
        const { anchorFor } = await import('../../src/content.js');
        assert.equal(anchorFor(content, species)?.id, anchor, species);
    }
});

// ------------------------------------------------------------------------------------------------ 7. an older campaign
test('patch 8 (7): the .24 campaign, half explored before this build: its rooms, its dead skeleton and the living ghoul stay as they were; the Dungeon is established on the next turn and its encounters still come', async () => {
    const g = live(36);
    const before = g.state();
    assert.equal(before.dungeons, undefined, 'no living structure in the old record');
    const ghoulHp = before.entities['mon.ghoul_hollow'].profile.max_hp;
    await say(g, '*I look around*');
    await g.reply('The hollow.', { expected: {}, deltas: [] });
    const s = g.state();
    assert.ok(s.dungeons[CATA], 'established on the next turn');
    assert.equal(s.entities['mon.creatureskeleton_alcove_1'].status, 'dead', 'the dead stay dead');
    assert.equal(s.entities['mon.ghoul_hollow'].profile.max_hp, ghoulHp, 'a creature met before keeps its profile');
    assert.equal(s.entities['mon.ghoul_hollow'].slot, undefined, 'and belongs to no slot');
    for (const id of Object.keys(before.places)) assert.ok(s.places[id], `room ${id} kept`);
    assert.equal(Object.keys(s.places).length, Object.keys(before.places).length, 'no room made again');
});

// ------------------------------------------------------------------------------------------------ 8. swipe and replay
test('patch 8 (8): a swipe of a reply that meets the engine\'s encounter, and the fold of the whole run, give the same Dungeon: same individuals, same cycle, same companies', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel.' });
    days(g, 1);
    await say(g, '*I go in*', GO({ new: 'the first gallery' }, 'I go in'));
    const a = ahead(g);
    const answer = { expected: { 1: { arrived: true, at: { new: { name: 'First gallery', kind: 'interior', parent: CATA } }, with: null } }, deltas: [slotDelta(a.slot)] };
    const one = await g.reply('He goes in; bones stir.', answer);
    const first = JSON.stringify(g.state().dungeons);
    // the swipe: the same reply regenerated
    g.chat.pop();
    const two = await g.reply('He goes in; the bones stir and rise.', answer);
    assert.equal(JSON.stringify(g.state().dungeons), first);
    assert.deepEqual(two.record.events.filter((e) => e.t.startsWith('dungeon.')), one.record.events.filter((e) => e.t.startsWith('dungeon.')));
    // the fold of the chat agrees with the state step by step
    assert.equal(JSON.stringify(foldChat(g.chat).state.dungeons), first);
});

// ------------------------------------------------------------------------------------------------ 9. a long delve without stops
test('patch 8 (9): delving on: every GO into a new part is told where it ends (an encounter or one quiet part), never more than one quiet part in a row, and every way is carried to its end', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel.' });
    let quiet = 0;
    let most = 0;
    for (let i = 0; i < 6; i++) {
        const r = await delve(g, `Passage ${i + 1}`);
        const lines = linesOf(g);
        assert.match(lines, /never a stop\./, 'the way is carried to its end');
        assert.match(lines, /DUNGEON AHEAD \(the engine's\)/);
        if (r.slot) { quiet = 0; await fightAll(g); } else { quiet += 1; most = Math.max(most, quiet); }
        if (living(g).run.floors[1].cleared) break;
    }
    assert.ok(most <= 1, `at most one quiet part in a row (${most})`);
    // the narrator reads the level as the engine holds it
    const ctx = buildContext(g.state(), content, { input: 'I go on' }).text;
    assert.match(ctx, /LEVEL 1 \(the engine's, cycle 1\)/);
});

// ------------------------------------------------------------------------------------------------ 10. outside a Dungeon
test('patch 8 (10): ordinary travel is carried to its end in one reply: the GO line says so (no "continue" loop); nothing of a Dungeon is told on the road', async () => {
    const g = await campaign(content);
    await say(g, '*I travel to the wolf den near Hollin*', GO({ new: 'the wolf den near Hollin' }, 'I travel to the wolf den near Hollin'));
    const lines = linesOf(g);
    assert.match(lines, /GOES — to the wolf den near Hollin .*Carry the way forward in this reply until he arrives, something acts on him, or a real choice of way appears; a sound, a shadow or a track without consequence is passed in a clause, never a stop\./);
    assert.doesNotMatch(lines, /DUNGEON AHEAD/);
    assert.equal(g.state().dungeons, undefined, 'no Dungeon established on the road');
});

// ------------------------------------------------------------------------------------------------ gate, fee, return stone
test('patch 8 (gate): the Glimmerdeep cleft asks its fee: entry waits for his consent, the accepted offer pays it once and lets him pass until he is out again; unregistered he is turned back', async () => {
    const g = await campaign(content, { greeting: 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Glassmere, Caelreth`' });
    await walk(g, GROTTO, { text: '*I go to the Glimmerdeep Grotto*', prose: 'The cleft.' });
    await say(g, '*I go in*', GO(GROTTO, 'I go in'));
    assert.match(linesOf(g), /CANNOT ENTER — the academy's gate-warden lets only registered Guild members into Glimmerdeep Grotto/);
    register(g, 'loc.glassmere');
    await say(g, '*I go in*', GO(GROTTO, 'I go in'));
    assert.match(linesOf(g), /ENTRY FEE — the academy's gate-warden asks 10 cp/);
    const coin = g.state().entities.pc.sheet.coin_cp;
    const offer = Object.values(g.state().offers).find((o) => o.gate === GROTTO && o.status === 'open');
    assert.ok(offer);
    // the story walking him in anyway is refused: the fee is not paid
    const r = await g.reply('He slips past the warden.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: { new: { name: 'Outer grotto', kind: 'interior', parent: GROTTO } }, forced_by: null, with: null }] });
    assert.equal(g.state().scene.at, GROTTO, 'he is still at the gate');
    assert.ok(r.record.events.some((e) => e.t === 'delta.rejected' && e.d.item?.type === 'arrive'));
    await say(g, '*I pay the fee*', { type: 'offer.accept', offer: offer.id, lines: ['l1'], qty: null, quote: 'I pay the fee' });
    assert.match(linesOf(g), /PAYS — the entry fee of Glimmerdeep Grotto, 10 cp/);
    assert.equal(g.state().entities.pc.sheet.coin_cp, coin - 10);
    assert.ok(living(g, GROTTO).pass);
    await g.reply('He pays.', { expected: {}, deltas: [] });
    const into = await delve(g, 'Outer grotto', { root: GROTTO });
    assert.equal(g.state().places[g.state().scene.at].name, 'Outer grotto');
    assert.ok(into.slot, 'past the gate, the grotto\'s first encounter');
});

test('patch 8 (return stone): a guardian\'s or boss\'s Return Stone, crushed inside, takes him to the gate in the same step and is spent; not in a fight, not outside a Dungeon', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel.' });
    await delve(g, 'First gallery');
    const stone = { id: 'obj.loot.return_stone.test', name: 'Return Stone', kind: 'item', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: 1, how: 'loot' }, return_stone: true, use: 'consumable', value_cp: 60 };
    inject(g, [{ t: 'object.created', d: { object: stone } }]);
    if (g.state().scene.present.some((id) => g.state().entities[id]?.kind === 'creature')) await fightAll(g);
    await say(g, '*I crush the return stone*', { type: 'use', object: stone.id, qty: null, quote: 'I crush the return stone' });
    assert.match(linesOf(g), /USES — Return Stone: crushed in his hand, it carries him out to the gate of Old Crown Catacombs/);
    const s = g.state();
    assert.equal(s.scene.at, CATA);
    assert.equal(s.objects[stone.id].holder.consumed, 'pc');
    // outside a Dungeon it does nothing and stays his
    inject(g, [{ t: 'object.created', d: { object: { ...stone, id: 'obj.loot.return_stone.two' } } }]);
    await say(g, '*I crush the return stone*', { type: 'use', object: 'obj.loot.return_stone.two', qty: null, quote: 'I crush the return stone' });
    assert.match(linesOf(g), /CANNOT USE — Return Stone: he stands at the gate of Old Crown Catacombs already/);
    assert.equal(g.state().objects['obj.loot.return_stone.two'].holder.entity, 'pc');
});

// ------------------------------------------------------------------------------------------------ resets
test('patch 8 (reset): never before his eyes: the level he is on keeps its cycle while he stays, the others renew; it renews once he leaves it; what he set down stays, what nobody took of the old cycle is gone', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel.' });
    await delve(g, 'Side vault');
    await fightAll(g);
    const vault = g.state().scene.at;
    // a find of the old cycle nobody took, and a thing of his he set down here
    inject(g, [
        { t: 'object.created', d: { object: { id: 'obj.test.urn', name: 'grave urn', kind: 'item', stack: false, qty: 1, unit: null, holder: { loc: vault }, marks: [], for_quests: [], source: { turn: 1, how: 'story' } } } },
        { t: 'object.created', d: { object: { id: 'obj.test.cloak', name: 'his old cloak', kind: 'item', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: 1, how: 'story' } } } },
        { t: 'object.moved', d: { id: 'obj.test.cloak', to: { loc: vault } } },
    ]);
    const met = living(g).run.floors[1].slots[0].ref;
    days(g, 4);
    await say(g, '*I wait*');
    await g.reply('He waits.', { expected: {}, deltas: [] });
    let x = living(g);
    assert.ok(x.cycle >= 2, 'the Dungeon renewed');
    assert.deepEqual(x.deferred, [1], 'his level kept for him');
    assert.equal(x.run.floors[1].slots[0].ref, met, 'nothing on his level changed before his eyes');
    assert.ok(x.run.floors[2].slots[0].ref.includes(`_c${x.cycle}_`), 'the level below renewed');
    assert.equal(g.state().objects['obj.test.urn'].holder.loc, vault, 'nothing vanishes before his eyes');
    // out, and the kept level renews as well
    await walk(g, CATA, { text: '*I walk back to the chapel*', prose: 'Back at the chapel.' });
    x = living(g);
    assert.deepEqual(x.deferred, []);
    assert.ok(x.run.floors[1].slots[0].ref.includes(`_c${x.cycle}_`));
    const s = g.state();
    assert.equal(s.objects['obj.test.urn'].holder.consumed, 'dungeon_reset', 'untaken loot of the old cycle is gone');
    assert.equal(s.objects['obj.test.cloak'].holder.loc, vault, 'his own cloak stays where he left it');
});

test('patch 8 (resources): the crystal vein of Glimmerdeep yields its shards once a cycle; spent, it waits for the renewal', async () => {
    const g = await campaign(content, { greeting: 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Glassmere, Caelreth`' });
    register(g, 'loc.glassmere');
    hero(g);
    await walk(g, GROTTO, { text: '*I go to the Glimmerdeep Grotto*', prose: 'The cleft.' });
    inject(g, [{ t: 'dungeon.pass', d: { id: GROTTO, pass: { turn: g.state().turn, cp: 0 } } }]);
    await delve(g, 'Crystal hall', { root: GROTTO });
    if (g.state().scene.present.some((id) => g.state().entities[id]?.kind === 'creature')) await fightAll(g);
    const gather = { type: 'activity', kind: 'gather', what: 'crystal shards', minutes: 30, until: null, quote: 'I chip crystal shards from the vein' };
    await say(g, '*I chip crystal shards from the vein*', gather);
    assert.match(linesOf(g), /GATHERS — 3 Glimmer Crystal Shard from the glimmer crystal vein/);
    const shards = Object.values(g.state().objects).find((o) => o.name === 'Glimmer Crystal Shard');
    assert.equal(shards.qty, 3);
    assert.equal(living(g, GROTTO).run.resources.vein, 0);
    await g.reply('He chips the shards loose.', { expected: {}, deltas: [] });
    await say(g, '*I chip more crystal shards*', gather);
    assert.match(linesOf(g), /the glimmer crystal vein is spent this cycle/);
    assert.equal(Object.values(g.state().objects).find((o) => o.name === 'Glimmer Crystal Shard').qty, 3);
});

test('patch 8 (companies): a company inside on his level is one set of people: its leader is the same person each time, known to the narrator and the extractor by id', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel.' });
    await delve(g, 'Gallery');
    await fightAll(g);
    const x = living(g);
    const p = x.parties[0];
    inject(g, [{ t: 'dungeon.party', d: { id: CATA, party: p.id, kind: 'enter', until: g.state().clock.minute + 300 } }, { t: 'dungeon.party', d: { id: CATA, party: p.id, kind: 'floor', floor: 1 } }]);
    await say(g, '*I listen*');
    await g.reply('Voices ahead.', { expected: {}, deltas: [] });
    const s = g.state();
    const id = `npc.${p.id.replace(/^party\./, 'party_')}`;
    assert.equal(s.entities[id]?.name, p.leader);
    assert.match(buildContext(s, content, { input: 'I listen' }).text, new RegExp(`OTHER ADVENTURERS on level 1 now .*led by ${p.leader} \\(${id.replace('.', '\\.')}`));
    assert.match(extractorCatalog(s, content, { c: true }).text, new RegExp(`${id.replace('.', '\\.')} leads ${p.name}`));
    await say(g, '*I listen*');
    await g.reply('Voices again.', { expected: {}, deltas: [] });
    assert.equal(Object.values(g.state().entities).filter((e) => e.party === p.id).length, 1, 'never a second leader');
});

test('patch 8 (13B, one reply): a stair down and the arrival below it in the same answer: the new room lies on the next level, and a sealed stair holds; the engine\'s encounter is there even where the story leaves it out', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel.' });
    await delve(g, 'Upper gallery');
    await fightAll(g);
    const upper = g.state().scene.at;
    // sealed: level 1 is not cleared
    await say(g, '*I take the stair down*', GO({ new: 'the stair down' }, 'I take the stair down'));
    const down = { expected: { 1: { arrived: true, at: { new: { name: 'Deep ossuary', kind: 'interior', parent: CATA } }, with: null } }, deltas: [way({ new: { name: 'Deep ossuary', kind: 'interior', parent: CATA } }, { dir: 'down', name: 'stair down' })] };
    const r = await g.reply('He goes down the stair into the deep ossuary.', down);
    assert.equal(g.state().scene.at, upper, 'the seal holds');
    assert.ok(r.record.events.some((e) => e.t === 'delta.rejected' && /sealed until the guardian of level 1 falls/.test(e.d.reason)));
    // the refused answer still showed the stair (the way is known now, on level 2); with level 1 cleared it is open
    const deep = Object.values(g.state().places).find((p) => p.name === 'Deep ossuary');
    assert.equal(deep.level, 2);
    assert.ok(!deep.visited, 'not entered');
    inject(g, [{ t: 'dungeon.cleared', d: { id: CATA, cycle: living(g).cycle, floor: 1, credit: 'pc', pc: 3, others: 0, total: 3, turn: g.state().turn, minute: g.state().clock.minute } }]);
    await say(g, '*I take the stair down*', GO({ new: 'the stair down' }, 'I take the stair down'));
    assert.equal(ahead(g).floor, 2, 'the engine places level 2\'s first encounter ahead');
    await g.reply('He goes down the stair into the deep ossuary.', { expected: { 1: { arrived: true, at: deep.id, with: null } }, deltas: [] });
    const s = g.state();
    assert.equal(s.scene.at, deep.id);
    assert.equal(s.places[s.scene.at].level, 2);
    // a new room shown below in the same answer as the arrival lies on the next level too (13B in one reply)
    const fresh = await campaign(content);
    hero(fresh);
    await walk(fresh, CATA, { text: '*I go*', prose: 'The chapel.' });
    await delve(fresh, 'Upper gallery');
    await fightAll(fresh);
    inject(fresh, [{ t: 'dungeon.cleared', d: { id: CATA, cycle: living(fresh).cycle, floor: 1, credit: 'pc', pc: 3, others: 0, total: 3, turn: fresh.state().turn, minute: fresh.state().clock.minute } }]);
    await say(fresh, '*I take the stair down*', GO({ new: 'the stair down' }, 'I take the stair down'));
    await fresh.reply('He goes down the stair into the lower ossuary.', { expected: { 1: { arrived: true, at: { new: { name: 'Lower ossuary', kind: 'interior', parent: CATA } }, with: null } }, deltas: [way({ new: { name: 'Lower ossuary', kind: 'interior', parent: CATA } }, { dir: 'down', name: 'stair down' })] });
    assert.equal(fresh.state().places[fresh.state().scene.at].name, 'Lower ossuary');
    assert.equal(fresh.state().places[fresh.state().scene.at].level, 2);
    // the story left the engine's encounter out: it is there all the same, and the next reply is told
    const placed = s.dungeons[CATA].run.floors[2].slots[0];
    assert.equal(placed.at, s.scene.at);
    assert.ok(placed.entities.every((id) => s.scene.present.includes(id)));
    assert.ok(rec(g.chat.at(-1)).corrections.some((c) => /ENGINE ENCOUNTER/.test(c)));
});
