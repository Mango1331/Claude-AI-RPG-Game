// Patch 8.4.1 (docs/PATCH8_4_1_LIVETEST_STABILIZATION.md): the first automated live test, 22.10.2026 05:43
// (tests/v4/live_1022c.json, build .29, GLM-5.3-Flash via Featherless, tools/st_live/live): turn 19 spent the five free
// Stat Points in words ("other"), the narrator was told to tell it as it happens and did, nothing was assigned; turn 16
// searched level 1 of the Old Crown Catacombs, its SUCCESS line asked for an encounter while the level line said only
// the engine adds foes, and the "robed waiting thing" the reply brought, no encounter of the level, was booked, fought,
// and gave 13 XP and level 2; the board titled its level 1 clearance "Cull the Burial Gallery Skeletons".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadProductContent, ROOT } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { spendsStatPoints } from '../../src/commands.js';
import { parseBoard, boardRequest, BOARD_VERSION } from '../../src/v4/guild.js';
import { trueDungeonOf } from '../../src/v4/dungeon.js';
import { Chat4 } from './harness.js';
import { say, outcomeOf, linesOf, slotDelta, ahead } from './patch8_lib.js';

const content = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1022c.json'), 'utf8'));
const CATA = 'loc.old_crown_catacombs';
const ROBED = 'mon.robed_waiter';

/** The live chat up to message n (exclusive), played on with a scripted planner. */
function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
/** The player message n as the live planner read it (its commands). */
const planned = (n) => (rec(fx.messages[n]).interp?.commands || []).map(({ seq, ...c }) => c);
const playerPanel = (g, id) => String(g.chat[id].extra?.display_text || '').replace(/<[^>]+>/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const sheet = (g) => g.state().entities.pc.sheet;

// ------------------------------------------------------------------------------------------------ C1. Stat Points
test('8.4.1 stats 1 (live #37, turn 19): words that spend the five free points are NOT DONE, with #assign for the player; the walk of the same message still goes; nothing is assigned or told', async () => {
    const g = live(37);
    assert.equal(sheet(g).free_points, 5);
    await say(g, fx.messages[37].mes, ...planned(37));
    const lines = linesOf(g);
    assert.match(lines, /^1\. NOT DONE — "I put two of the five free points into WIL, two into INT, and the last one into VIT": his Free Stat Points are spent only by the System command #assign, never by words; nothing is assigned, his stats and his 5 Free Stat Points stay as they are\. Tell no change in him/m);
    assert.doesNotMatch(lines, /tell it as it happens/, 'the .29 line: "his own action; tell it as it happens"');
    assert.match(lines, /^2\. GOES — to the crack in the back wall/m, 'the step that does not build on it is taken');
    const step = outcomeOf(g).steps?.find((x) => x.seq === 1) || rec(g.chat.at(-1)).events.filter((e) => e.t === 'cmd.resolved').map((e) => e.d)[0];
    assert.equal(step.status, 'refused');
    const r = await g.reply('He walks on toward the crack, the points still his to spend.', { expected: {}, deltas: [] });
    assert.match(playerPanel(g, r.id), /ACTION NOT POSSIBLE — .*Stat Points are spent only with the command #assign <STAT> <n>, e\.g\. #assign WIL 2 INT 2 VIT 1; Free Stat Points: 5/);
    assert.equal(sheet(g).free_points, 5);
    assert.deepEqual(sheet(g).stats, { STR: 5, VIT: 5, AGI: 5, INT: 7, PER: 5, WIL: 7 });
});

test('8.4.1 stats 2: #assign after the level-up spends them, as the System command it is', async () => {
    const g = live(37);
    const r = await say(g, '#assign WIL 2 INT 2 VIT 1');
    assert.equal(r.action, 'panels');
    assert.match(r.panels.join('\n'), /ASSIGN/);
    assert.equal(sheet(g).free_points, 0);
    assert.deepEqual(sheet(g).stats, { STR: 5, VIT: 6, AGI: 5, INT: 9, PER: 5, WIL: 9 });
});

test('8.4.1 stats 3: in a fight the words are not taken either, and the note points to #assign', async () => {
    const g = live(35);
    assert.ok(g.state().encounter, 'the fight with the robed thing runs (live #33)');
    await say(g, '*I put two points into INT before I strike*', { type: 'other', what: 'puts two points into INT', quote: 'I put two points into INT' });
    const notes = outcomeOf(g).plan_notes || [];
    assert.ok(notes.some((x) => /Stat Points are spent only with the command #assign <STAT> <n>/.test(x)), JSON.stringify(notes));
    assert.equal(sheet(g).free_points, 0, 'nothing is spent (level 1 then, no free points yet)');
});

test('8.4.1 stats 4: the level-up of a fight\'s end names #assign (live #35, the robed thing killed: level 2)', async () => {
    const g = live(35);
    await say(g, fx.messages[35].mes, ...planned(35));
    assert.ok(rec(g.chat.at(-1)).events.some((e) => e.t === 'level.up'));
    const r = await g.reply('The thing falls.', { expected: {}, deltas: [] });
    assert.match(playerPanel(g, r.id), /LEVEL UP → Level 2 \(\+5 free Stat Points\) · spend them with #assign <STAT> <n>, e\.g\. #assign INT 3 WIL 2/);
});

test('8.4.1 stats 5: what counts as spending Stat Points, and what does not', () => {
    for (const t of ['I put two of the five free points into WIL, two into INT, and the last one into VIT', 'assigns stat points: 2 WIL, 2 INT, 1 VIT', 'I spend my free points on intelligence', 'I invest 3 into Willpower and 2 into VIT', 'allocate attribute points']) assert.ok(spendsStatPoints(t, content), t);
    for (const t of ['I put my staff into the crack', 'I spend a moment catching my breath', 'I add two logs to the fire', 'two per side, I put them into the bag', 'I will put the torch on the wall', 'I point at the arch']) assert.ok(!spendsStatPoints(t, content), t);
});

test('8.4.1 stats 6: a deed no command fits is still told, and says that his stats do not change by it', async () => {
    const g = live(37);
    await say(g, '*I tighten the strap of my satchel*', { type: 'other', what: 'tightens the strap of his satchel', quote: 'I tighten the strap of my satchel' });
    assert.match(linesOf(g), /DOES — "I tighten the strap of my satchel": his own action; tell it as it happens\. It books nothing: no HP, MP, STA, stats or Stat Points, Skills, coin or possessions change by it\./);
});

// ------------------------------------------------------------------------------------------------ C2. the Dungeon's foes
test('8.4.1 dungeon 1 (live #31, turn 16): a search\'s SUCCESS in the Living Dungeon asks for a find or a lead, never a foe (the .29 line asked for an "encounter")', async () => {
    const g = live(31);
    await say(g, fx.messages[31].mes, ...planned(31));
    const lines = linesOf(g);
    assert.match(lines, /SEARCH CHECK \(PER 5 vs 6\): 45\.45% \(d100 25\) → SUCCESS — reveal a concrete discovery or an actionable lead \(a thing, a hidden mark, tracks or a sound that lead on into the level\); it brings no foe: the foes of this level come only as the engine adds them/);
    assert.doesNotMatch(lines, /encounter or actionable lead/);
    assert.match(String(rec(g.chat.at(-1)).events.find((e) => e.t === 'outcome.recorded')?.d.outcome?.actions || ''), /SEARCH/);
});

test('8.4.1 dungeon 2 (live #32): the robed waiting thing the reply brought is no foe of the world: rejected (dungeon_foe), no entity, a correction for the next turn; the passage, the drag-mark and the facts stand', async () => {
    const g = live(32);
    const r = await g.reply(fx.messages[32].mes, rec(fx.messages[32]).extraction.raw);
    const ev = r.record.events;
    const rej = ev.find((e) => e.t === 'delta.rejected' && e.d.rule === 'dungeon_foe');
    assert.ok(rej, ev.map((e) => e.t).join(', '));
    assert.equal(rej.d.item.ref, 'robed_waiter');
    assert.match(rej.d.reason, /only the engine adds the foes of Old Crown Catacombs/);
    assert.equal(g.state().entities[ROBED], undefined);
    assert.ok(!ev.some((e) => e.t === 'entity.created' && e.d.entity.kind === 'creature'));
    assert.ok(r.record.corrections.some((c) => /robed waiting thing in winding-cloth of the last reply is no foe here: in Old Crown Catacombs only the engine adds foes/.test(c)));
    assert.ok(ev.some((e) => e.t === 'link.set'), 'the side passage');
    assert.ok(ev.some((e) => e.t === 'thread.set'), 'the drag-mark toward the crack');
    // the next turn: the narrator is told, and the Lance at it opens no fight and gives no XP
    await say(g, fx.messages[33].mes, ...planned(33));
    const u = rec(g.chat.at(-1));
    assert.ok(!u.events.some((e) => e.t === 'encounter.started'));
    assert.ok(!u.events.some((e) => e.t === 'xp.changed'));
    assert.equal(sheet(g).level, 1);
});

test('8.4.1 dungeon 3: the engine\'s own encounter still comes (live #37: the skeletal gravekeeper ahead), and a creature the story shows as no foe stays', async () => {
    const g = live(37);
    await say(g, fx.messages[37].mes, ...planned(37));
    const a = ahead(g, CATA);
    assert.equal(a.slot.species, 'skeletal gravekeeper');
    const r = await g.reply('A skeleton in a warden\'s tabard steps out of the crack; a rat skitters off over the bones.', { expected: {}, deltas: [
        slotDelta(a.slot, 1),
        { seq: 2, type: 'creature.new', ref: 'rat', species: 'rat', anchor: 'rat', desc: ['skittering over the bones'], count: 1, present: true, band: 'SHORT', cluster: null, stronger: null, threat: false, more: null },
    ] });
    const s = g.state();
    const keeper = Object.values(s.entities).find((e) => e.slot?.id === a.slot.id);
    assert.ok(keeper, 'the encounter of the engine is there');
    assert.ok(Object.values(s.entities).some((e) => e.kind === 'creature' && e.species === 'rat'), 'no foe, not refused');
    assert.ok(!r.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'dungeon_foe'));
});

test('8.4.1 dungeon 4: outside a Living Dungeon the story still brings creatures (the road to the catacombs)', async () => {
    const g = live(17);
    const at = g.state().scene.at;
    assert.equal(trueDungeonOf(g.state(), at), null, `on the way, at ${at}`);
    const r = await g.reply('On the road a lean grey wolf watches him from the ditch.', { expected: {}, deltas: [
        { seq: 1, type: 'creature.new', ref: 'grey wolf', species: 'grey wolf', anchor: 'wolf', desc: ['lean'], count: 1, present: true, band: 'MEDIUM', cluster: null, stronger: null, threat: null, more: null },
    ] });
    assert.ok(!r.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'dungeon_foe'));
    assert.ok(Object.values(g.state().entities).some((e) => e.kind === 'creature' && e.species === 'grey wolf'));
});

// ------------------------------------------------------------------------------------------------ D. the board's words
test('8.4.1 board: a clearance of a level is titled by clearing, never "Cull"; a numbered cull and other work keep their titles', () => {
    const NEED = { branch: 'loc.alderwatch', rank: 'Novice', missing: 5, day: 1, have: [], c: true };
    const listings = rec(fx.messages[9]).events.filter((e) => e.t === 'quest.created').map((e) => e.d.quest).map((q) => ({
        title: q.title, client: q.client, rank: q.rank, level: q.level, qtype: q.qtype, payout_cp: q.payout_cp, task: q.task, desired_end_state: q.desired_end_state,
        objectives: q.objectives.map(({ id, status, ...o }) => o), proof: q.proof.map(({ id, ...p }) => p),
    }));
    assert.equal(listings[0].title, 'Cull the Burial Gallery Skeletons', 'as the live board wrote it');
    const p = parseBoard(JSON.stringify({ listings }), content, NEED, structuredClone(foldChat(fx.messages, 9).state));
    assert.deepEqual(p.listings.map((l) => l.title), ['Clear the Burial Gallery Skeletons', 'Thin the Millpond Snappers', 'Shepherd the Dyers\' Cart', 'Medicine for the Quarry Camp', 'Drive Off the Coop Raiders']);
    assert.equal(p.listings[0].dungeon, CATA);
    // a numbered cull in the Dungeon keeps "Cull"
    const cull = { ...listings[0], task: 'Cull four restless skeletons on level 1 of the Old Crown Catacombs.', desired_end_state: 'Four restless skeletons of level 1 of the Old Crown Catacombs are defeated.', objectives: listings[0].objectives.map((o) => (o.verb === 'DEFEAT' ? { ...o, qty: 4, unit: 'skeletons' } : o)) };
    const q = parseBoard(JSON.stringify({ listings: [cull] }), content, { ...NEED, missing: 1 }, structuredClone(foldChat(fx.messages, 9).state));
    assert.equal(q.listings[0]?.title ?? q.refused?.[0]?.title, 'Cull the Burial Gallery Skeletons');
    const req = boardRequest(foldChat(fx.messages, 9).state, content, NEED);
    assert.match(req.messages[0].content, /a clearance is titled by what is cleared \("Clear …", "Purge …", "Secure …"\), never "Cull" or "Thin"/);
    assert.equal(BOARD_VERSION, 'board-4.8');
});
