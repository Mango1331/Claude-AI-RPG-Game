// Prototype C, build 4.3.0-c.2 (docs/PROTOTYPE_C.md §11): the fixes of the live run of 03.10.2026 (tests/v4/live_1003.json:
// its player messages and raw planner answers verbatim). Contract abandonment and its slip, engine-owned time, natural
// recovery on rest and sleep, a whole-or-nothing #assign, the narrator's vocabulary rule. With the planner off, A is
// unchanged (tools/c_flag_off_diff.mjs; the last tests here show the same turns without the planner).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec, turnBlock } from '../../src/host.js';
import { worldPanel } from '../../src/display.js';
import { runCommands, parseAssign } from '../../src/commands.js';
import { recoveryEvents, engineMinutes } from '../../src/v4/commands.js';
import { CONTRACT_RULES, plannerSystem, announcedAbandon } from '../../src/v4/planner.js';
import { awardXp } from '../../src/progression.js';
import { applyEvent } from '../../src/state.js';
import { Game } from '../helpers.js';

const content = await loadContent();
const live = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1003.json'), 'utf8'));
const turn = (i) => live.turns.find((t) => t.i === i);
const GREETING = `SYSTEM INITIALIZATION COMPLETE\n${live.greeting.trim()}`;
const QUEST = 'quest.wolves_on_the_salt_road';
const SLIP = 'obj.slip.wolves_on_the_salt_road';
const HALL = 'loc.tidecross.guild_hall';

/** Chat4 with the planner; its answers are queued per message (the live raw answers or a scripted one). */
class ChatC extends Chat4 {
    constructor(...args) {
        super(...args);
        this.planner = true;
        this.plans = [];
        const base = this.llm;
        this.llm = async (req) => {
            if (req.purpose.startsWith('plan')) {
                this.calls.push({ purpose: req.purpose, messages: req.messages });
                const a = this.plans.shift();
                return a === undefined ? null : typeof a === 'string' ? a : JSON.stringify(a);
            }
            return base(req);
        };
    }

    async say(text, ...answers) {
        this.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
        this.plans = answers;
        const r = await prepareGenerationAsync(this.chat, this.content, { type: 'normal', settings: { planner: this.planner }, llm: this.llm });
        if (r.action === 'panels') this.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
        return r;
    }

    /** A live message with its live raw planner answer(s). */
    async live(i) {
        return this.say(turn(i).player, ...turn(i).raw);
    }

    last() {
        return rec(this.chat.findLast((m) => m.is_user));
    }

    planCalls() {
        return this.calls.filter((c) => c.purpose.startsWith('plan')).length;
    }

    narratorBlock() {
        const u = this.chat.findLastIndex((m) => m.is_user);
        return turnBlock(this.chat, u, this.content).context.text;
    }
}

const cmds = (...commands) => ({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) });
const outcomeOf = (r) => r?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome || null;
const clock = (g) => g.state().clock.minute;
const YARD = { new: { name: 'Eastgate Yard', kind: 'site', parent: 'loc.tidecross' } };
const arrived = (...places) => ({ expected: Object.fromEntries(places.map((p, k) => [k + 1, { arrived: true, at: p, with: null }])), deltas: [] });

/** The live run up to the escort contract: Mage, Tidecross, registration, board, the contract taken (live #6-#14). */
async function liveStart({ planner = true } = {}) {
    const g = new ChatC(content, { greeting: GREETING, listings: live.listings });
    g.planner = planner;
    await g.player('Mage');
    await g.player('Arcane Bolt + Arcane Burst');
    if (planner) await g.live(6); else await g.player(turn(6).player, JSON.parse(turn(6).raw[0]).commands);
    await g.reply('The road took him down into Tidecross, and on to the Guild hall.', { expected: { 1: { arrived: true, at: 'loc.tidecross', with: null }, 2: { arrived: true, at: HALL, with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 30 }] });
    for (const i of [8, 10, 12, 14]) {
        if (planner) await g.live(i); else await g.player(turn(i).player, JSON.parse(turn(i).raw[0]).commands);
        await g.reply('The clerk nodded.');
    }
    assert.equal(g.state().quests[QUEST].status, 'active', 'the contract is his');
    assert.equal(g.state().objects[SLIP].holder.entity, 'pc', 'with its slip');
    return g;
}

// ------------------------------------------------------------------------------------------------ A. contract abandonment
test('live #22 "ill decline the quest myself" at the wagon yard: an announcement, no quest.abandon; the live raw plan is caught too', async () => {
    const g = await liveStart();
    await g.live(16);
    await g.reply('Tidecross lived up to its name on the walk east, down to the Eastgate Yard.', arrived(YARD));
    // the corrected plan: words about later are no act
    await g.say(turn(22).player, cmds());
    assert.equal(g.state().quests[QUEST].status, 'active');
    // the live raw plan (quest.abandon on these words): the planner path's own check removes it, visibly
    const h = await liveStart();
    await h.live(16);
    await h.reply('Down to the Eastgate Yard.', arrived(YARD));
    await h.live(22);
    assert.equal(h.state().quests[QUEST].status, 'active', 'live 03.10.: abandoned at once');
    assert.deepEqual(h.last().plan.dropped.map((x) => [x.type, x.rule]), [['quest.abandon', 'plan']]);
    assert.match(worldPanel(h.state(), content), /NOT A DECISION — "ill decline the quest myself\. no need to travel with someone like you" \(quest\.abandon: plan\)/);
    assert.equal(h.state().objects[SLIP].holder.entity, 'pc');
    // the planner is told the rule, with an announcement example
    assert.match(plannerSystem(content.commandVocab), /Saying he will do it later is no command: "I'll decline the quest myself"/);
    // what is an act and what is not
    const keep = (q) => announcedAbandon(q, [{ type: 'quest.abandon', quote: q }]).kept.length === 1;
    for (const q of ['I abandon the quest.', 'I give up this contract.', 'I cancel this job.']) assert.ok(keep(q), q);
    for (const q of ["I'll decline the quest myself.", "I'll go cancel it at the Guild.", "I'll hand the contract back.", "I'll return the slip."]) assert.ok(!keep(q), q);
});

test('live #24 "turn the slip back in": the live raw plans stay invalid (fail-closed) and the repair is told the quest id; the right plan gives the contract up at the desk', async () => {
    const g = await liveStart();
    await g.live(16);
    await g.reply('Down to the Eastgate Yard.', arrived(YARD));
    await g.say(turn(22).player, cmds());
    await g.reply('"Suit yourself," Hessa said to his back.');
    const coin = g.state().entities.pc.sheet.coin_cp;
    const xp = g.state().entities.pc.sheet.xp;
    // the live answers: the slip as the quest, twice; nothing booked, as before
    const r = await g.live(24);
    assert.equal(r.action, 'abort');
    assert.equal(g.last().interp.failed, true);
    assert.match(g.calls.filter((c) => c.purpose === 'plan_repair').at(-1).messages.at(-1).content,
        /obj\.slip\.wolves_on_the_salt_road is the contract slip \(an object\), not the contract; the contract is quest\.wolves_on_the_salt_road/);
    // Regenerate with the plan the rules ask for: go to the hall, give the contract up there
    g.plans = [cmds({ type: 'go', to: HALL, quote: 'i go back to the guild hall' }, { type: 'quest.abandon', quest: QUEST, quote: 'turn the slip back in' })];
    await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    const o = outcomeOf(g.last());
    assert.deepEqual(o.resolutions.map((x) => [x.type, x.status]), [['go', 'authorized'], ['quest.abandon', 'conditional']]);
    assert.match(o.actions[1], /GIVES UP, when he reaches the Guild hall — "Wolves on the Salt Road": .*No payout, no Quest XP, not completed/);
    assert.equal(g.state().quests[QUEST].status, 'active', 'not before he is there');
    // the reply brings him to the hall: given up there, the slip goes back, nothing is paid
    await g.reply('He walked back across Tidecross to the Guild hall and laid the slip on the counter.', arrived(HALL));
    const s = g.state();
    assert.equal(s.quests[QUEST].status, 'abandoned');
    assert.deepEqual(s.objects[SLIP].holder, { consumed: 'guild' });
    assert.equal(s.entities.pc.sheet.coin_cp, coin, 'no payout');
    assert.equal(s.entities.pc.sheet.xp, xp, 'no Quest XP');
    assert.ok(!Object.values(s.quests).some((q) => q.status === 'completed'));
});

test('given up earlier, the slip handed back later never pays: a turn-in is refused, the slip alone goes back', async () => {
    const g = await liveStart();
    await g.live(16);
    await g.reply('Down to the Eastgate Yard.', arrived(YARD));
    // a clear act now, away from the desk: given up at once, the slip stays with him
    await g.say('I give up this contract.', cmds({ type: 'quest.abandon', quest: QUEST, quote: 'I give up this contract.' }));
    assert.equal(g.state().quests[QUEST].status, 'abandoned');
    assert.equal(g.state().objects[SLIP].holder.entity, 'pc');
    await g.reply('Hessa shrugged.');
    await g.say('*i walk back to the guild hall*', cmds({ type: 'go', to: HALL, quote: 'i walk back to the guild hall' }));
    await g.reply('Back at the Guild hall; the clerk with the ink-stained apron looked up.', { ...arrived(HALL), deltas: [
        { seq: 1, type: 'person.new', ref: 'clerk', name: null, role: 'Guild counter clerk', desc: ['ink-stained apron'], present: true, at: null },
    ] });
    const clerk = g.state().scene.present.find((id) => id !== 'pc');
    assert.ok(clerk);
    const coin = g.state().entities.pc.sheet.coin_cp;
    const xp = g.state().entities.pc.sheet.xp;
    // a planner that still writes a turn-in: refused, nothing paid
    await g.say('*i turn the slip in*', cmds({ type: 'quest.turn_in', quest: null, quote: 'i turn the slip in' }));
    assert.notEqual(outcomeOf(g.last()).resolutions[0].status, 'resolved');
    await g.reply('The clerk looked at the slip.');
    // the slip of the contract given up, as the rules ask: give it to the clerk; no payout, no XP, no quest change
    await g.say('*i hand the slip back*', cmds({ type: 'give', object: SLIP, qty: null, to: clerk, quote: 'i hand the slip back' }));
    assert.equal(outcomeOf(g.last()).resolutions[0].status, 'resolved');
    const s = g.state();
    assert.equal(s.objects[SLIP].holder.entity, clerk);
    assert.equal(s.quests[QUEST].status, 'abandoned');
    assert.equal(s.entities.pc.sheet.coin_cp, coin);
    assert.equal(s.entities.pc.sheet.xp, xp);
    assert.match(CONTRACT_RULES, /give \{object: the slip, to: who takes it\}; never a quest command/);
});

// ------------------------------------------------------------------------------------------------ B. time
test('a walk across the same city is never 0 minutes (live #16): without the story\'s own minutes the engine books a small fixed time', async () => {
    const g = await liveStart();
    const before = clock(g);
    await g.live(16);
    const r = await g.reply('Tidecross lived up to its name on the walk east.', arrived(YARD));
    assert.match(g.state().scene.at, /eastgate_yard/);
    assert.equal(clock(g) - before, content.rules.time.engine_clock.go_min_same_settlement, 'live 03.10.: 0 minutes');
    assert.ok(r.record.events.some((e) => e.t === 'time.advanced' && e.d.why === 'travel'));
    // the story's own minutes, when they are enough, are the time: no top-up
    const h = await liveStart();
    const b2 = clock(h);
    await h.live(16);
    await h.reply('A long walk east.', { ...arrived(YARD), deltas: [{ seq: 1, type: 'time', minutes: 40 }] });
    assert.equal(clock(h) - b2, 40);
});

test('explicit WAIT and REST: the named duration is booked by the engine with the turn; the extractor\'s same minutes are not added again', async () => {
    const g = await liveStart();
    let before = clock(g);
    await g.say('I wait two hours', cmds({ type: 'activity', kind: 'wait', what: null, minutes: 120, until: null, quote: 'I wait two hours' }));
    assert.equal(clock(g) - before, 120, 'booked with the turn');
    assert.match(g.narratorBlock(), /WAITS for 120 minutes — resolved by the engine: 120 minutes pass; it is now Day 1, 1[12]:\d\d/);
    await g.reply('Two hours crawled by.', { expected: { 1: { minutes: 120 } }, deltas: [{ seq: 1, type: 'time', minutes: 120 }] });
    assert.equal(clock(g) - before, 120, 'not twice');
    before = clock(g);
    await g.say('I rest 30 minutes', cmds({ type: 'activity', kind: 'rest', what: null, minutes: 30, until: null, quote: 'I rest 30 minutes' }));
    await g.reply('He sat on a bench and rested; half an hour, then a little more as he watched the gulls.', { expected: {}, deltas: [{ seq: 1, type: 'time', minutes: 45 }] });
    assert.equal(clock(g) - before, 45, 'only what the story adds beyond the booked 30');
});

test('sleep until morning runs over midnight to the fixed morning time; bare sleep is a night\'s sleep, not a 120-minute activity', async () => {
    const g = await liveStart();
    await g.say('I wait until night', cmds({ type: 'activity', kind: 'wait', what: null, minutes: null, until: 'night', quote: 'I wait until night' }));
    await g.reply('Night fell.');
    assert.equal(clock(g) % 1440, content.rules.time.until.night);
    const day = Math.floor(clock(g) / 1440);
    await g.say('I sleep until morning', cmds({ type: 'activity', kind: 'sleep', what: null, minutes: null, until: 'morning', quote: 'I sleep until morning' }));
    assert.equal(Math.floor(clock(g) / 1440), day + 1, 'the next day');
    assert.equal(clock(g) % 1440, content.rules.time.until.morning, '08:00, the documented morning');
    await g.reply('He slept through the night.', { expected: {}, deltas: [{ seq: 1, type: 'time', minutes: 600 }] });
    assert.equal(clock(g) % 1440, content.rules.time.until.morning, 'the narrated night is not booked again');
    const h = await liveStart();
    const before = clock(h);
    await h.say('I go to sleep', cmds({ type: 'activity', kind: 'sleep', what: null, minutes: null, until: null, quote: 'I go to sleep' }));
    assert.equal(clock(h) - before, content.rules.time.engine_clock.sleep_min);
    assert.equal(engineMinutes(content, h.state(), { kind: 'sleep', minutes: 480 }), 480, 'a named duration wins');
});

test('swipe and regenerate reuse the booked time and recovery: no second advance, no second recovery', async () => {
    const g = await liveStart();
    await g.say('I cast Arcane Bolt at the old fence post to test it', cmds({ type: 'ability_world', skill: 'mage.arcane_bolt', target: { new: 'the old fence post' }, target_words: 'the old fence post', goal: 'to test it', quote: 'I cast Arcane Bolt at the old fence post to test it' }));
    await g.reply('The post cracked.');
    const before = g.state();
    await g.say('I rest for an hour', cmds({ type: 'activity', kind: 'rest', what: null, minutes: 60, until: null, quote: 'I rest for an hour' }));
    await g.reply('He rested.');
    const after = g.state();
    assert.equal(after.clock.minute - before.clock.minute, 60);
    assert.ok(after.entities.pc.sheet.mp > before.entities.pc.sheet.mp);
    const events = structuredClone(g.last().events);
    const calls = g.planCalls();
    for (const type of ['swipe', 'regenerate']) {
        g.plans = [cmds({ type: 'activity', kind: 'rest', what: null, minutes: 600, until: null, quote: 'I rest for an hour' })];
        await prepareGenerationAsync(g.chat, content, { type, settings: { planner: true }, llm: g.llm });
        assert.equal(g.planCalls(), calls, type);
        assert.deepEqual(g.last().events, events, type);
        assert.equal(g.state().clock.minute, after.clock.minute, type);
        assert.equal(g.state().entities.pc.sheet.mp, after.entities.pc.sheet.mp, type);
    }
});

// ------------------------------------------------------------------------------------------------ C. recovery
test('recovery: rest and sleep share one formula; partial resources recover, never above the maximum, full ones not at all, 0 minutes nothing', async () => {
    const g = await liveStart();
    const s = structuredClone(g.state());
    const sheet = s.entities.pc.sheet;
    Object.assign(sheet, { hp: 40, mp: 10, sta: 50 });
    const gain = (m) => Object.fromEntries(recoveryEvents(s, content, m, 'rest').events.map((e) => [e.d.resource, e.d.value]));
    const short = gain(30);
    const long = gain(120);
    for (const r of ['hp', 'mp', 'sta']) assert.ok(long[r] > short[r], `${r}: longer rests recover more`);
    assert.deepEqual(gain(0), {}, '0 minutes, nothing');
    const night = gain(480 * 4);
    assert.deepEqual(night, { hp: 80, mp: 72, sta: 100 }, 'never above the maximum');
    // the formula, at the one central place (rules.recovery): floor(max x pct x minutes / 60 / 100)
    const pct = content.rules.recovery.per_hour_pct;
    assert.equal(short.mp, 10 + Math.floor((72 * pct.mp * 30) / 6000));
    const full = structuredClone(g.state());
    assert.deepEqual(recoveryEvents(full, content, 240, 'sleep').events, [], 'full: no change');
});

test('REST and SLEEP recover through the engine with the turn; WAIT and travel do not; the extractor\'s recover is not booked on top', async () => {
    const g = await liveStart();
    await g.say('I cast Arcane Bolt at the old fence post to test it', cmds({ type: 'ability_world', skill: 'mage.arcane_bolt', target: { new: 'the old fence post' }, target_words: 'the old fence post', goal: 'to test it', quote: 'I cast Arcane Bolt at the old fence post to test it' }));
    await g.reply('The post cracked.');
    const spent = g.state().entities.pc.sheet.mp;
    assert.ok(spent < 72);
    await g.say('I wait two hours', cmds({ type: 'activity', kind: 'wait', what: null, minutes: 120, until: null, quote: 'I wait two hours' }));
    await g.reply('He waited.');
    assert.equal(g.state().entities.pc.sheet.mp, spent, 'waiting is no rest');
    await g.say('*I make my way over to the Eastgate Yard*', cmds({ type: 'go', to: { new: 'Eastgate Yard' }, quote: '*I make my way over to the Eastgate Yard*' }));
    await g.reply('Down to the Eastgate Yard.', arrived(YARD));
    assert.equal(g.state().entities.pc.sheet.mp, spent, 'travel is no rest');
    await g.say('I rest 30 minutes', cmds({ type: 'activity', kind: 'rest', what: null, minutes: 30, until: null, quote: 'I rest 30 minutes' }));
    const rested = g.state().entities.pc.sheet.mp;
    assert.ok(rested > spent, 'the engine booked it with the turn');
    assert.match(g.narratorBlock(), /Recovery booked: MP \d+→\d+\/72/);
    assert.match(worldPanel(g.state(), content), /RECOVERY — MP \d+→\d+\/72/);
    const r = await g.reply('He rested and felt the mana settle back.', { expected: {}, deltas: [{ seq: 1, type: 'recover', who: 'pc', hp: 20, sta: 20 }] });
    assert.ok(r.record.rejected.some((x) => x.rule === 'engine_recovery'));
    assert.equal(g.state().entities.pc.sheet.mp, rested);
    await g.say('I sleep until morning', cmds({ type: 'activity', kind: 'sleep', what: null, minutes: null, until: 'morning', quote: 'I sleep until morning' }));
    assert.equal(g.state().entities.pc.sheet.mp, 72, 'a night\'s sleep: the same formula, up to the maximum');
});

// ------------------------------------------------------------------------------------------------ planner off: A
test('planner off: A is unchanged (no engine time for a walk or a rest, no slip handling, the abandon as before)', async () => {
    const g = await liveStart({ planner: false });
    const before = clock(g);
    await g.player(turn(16).player, JSON.parse(turn(16).raw[0]).commands);
    await g.reply('Down to the Eastgate Yard.', arrived(YARD));
    assert.equal(clock(g), before, 'A: the story books the time');
    await g.player('I rest 30 minutes', [{ seq: 1, type: 'activity', kind: 'rest', what: null, minutes: 30, until: null, quote: 'I rest 30 minutes' }]);
    assert.equal(clock(g), before);
    assert.equal(outcomeOf(rec(g.chat.findLast((m) => m.is_user))).auth.c, undefined);
    await g.reply('He rested.');
    await g.player('I give up this contract.', [{ seq: 1, type: 'quest.abandon', quest: QUEST, quote: 'I give up this contract.' }]);
    assert.equal(g.state().quests[QUEST].status, 'abandoned');
    assert.equal(g.state().objects[SLIP].holder.entity, 'pc');
});

// ------------------------------------------------------------------------------------------------ D. #assign
test('#assign: one pair as before, several pairs whole, nothing at all when any part is wrong; a stat named twice is refused', () => {
    const g = new Game(content).ranger();
    for (const e of awardXp(g.state.entities.pc.sheet, 1000, content, 'test')) applyEvent(g.state, e);
    const free = g.state.entities.pc.sheet.free_points;
    assert.ok(free >= 6, `free points ${free}`);
    const stats = { ...g.state.entities.pc.sheet.stats };
    let r = runCommands(g.state, content, '#assign INT 3');
    assert.deepEqual(r.events.map((e) => [e.d.stat, e.d.amount]), [['INT', 3]]);
    r = runCommands(g.state, content, '#assign INT 3 WIL 1 AGI 1');
    assert.deepEqual(r.events.map((e) => [e.d.stat, e.d.amount]), [['INT', 3], ['WIL', 1], ['AGI', 1]], 'in his order, exactly 5 points');
    assert.match(r.panels[0], /INT \+3 -> \d+\nWIL \+1 -> \d+\nAGI \+1 -> \d+\nFree Stat Points left: \d+/);
    for (const [cmd, why] of [
        [`#assign INT ${free} WIL 1`, /points asked, only \d+ free Stat Points available/],
        ['#assign INT 3 LUK 1', /unknown stat "LUK"/],
        ['#assign INT 3 WIL', /is not a list of <STAT> <n> pairs/],
        ['#assign INT three', /"three" is not a positive whole number/],
        ['#assign INT 0', /"0" is not a positive whole number/],
        ['#assign INT 2 INT 1', /INT is named twice/],
        ['#assign', /no stat given/],
    ]) {
        r = runCommands(g.state, content, cmd);
        assert.equal(r.events.length, 0, cmd);
        assert.match(r.panels[0], /NOT APPLIED — /, cmd);
        assert.match(r.panels[0], why, cmd);
        assert.match(r.panels[0], /Nothing was assigned/, cmd);
    }
    assert.deepEqual(g.state.entities.pc.sheet.stats, stats, 'the input state is never changed');
    assert.deepEqual(parseAssign('int +3, wil 1', content), { pairs: [{ stat: 'INT', amount: 3 }, { stat: 'WIL', amount: 1 }], error: null });
});

// ------------------------------------------------------------------------------------------------ E. vocabulary
test('the narrator preset asks for familiar modern words for ordinary medieval things; the contract is unchanged', () => {
    const preset = JSON.parse(fs.readFileSync(path.join(ROOT, 'presets/Avereth Narrator V4.json'), 'utf8'));
    const style = preset.prompts.find((p) => p.identifier === 'main').content;
    assert.match(style, /Prefer familiar, modern English words for ordinary medieval things\. Avoid rare or archaic historical terms used only for atmosphere; when a period term is genuinely useful, make its meaning clear from context the first time it appears\. Modern wording is fine; modern technology is not\./);
    const contract = fs.readFileSync(path.join(ROOT, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
    assert.match(contract, /^AVERETH RPG — SANDBOX NARRATOR CONTRACT\nContract revision: 4\.2\.0\n/);
});
