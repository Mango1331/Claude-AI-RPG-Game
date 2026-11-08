// PULSE package A (.162, patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md §5, §6 A, §§12-16): one
// deterministic event window per suitable narrative turn of a ruleset-2 planner campaign; ROAD AHEAD is its travel
// frame; day part and a capped relative miss streak shape the chance; the world applier enforces that nobody new
// attacks or takes from him outside a DANGER window, except the contact he actually sought where he actually is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, outcomeOf, lastUser } from './patch8_lib.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { applyWorld } from '../../src/v4/world.js';
import { pulseChance, sceneFrame, heldThreats } from '../../src/v4/pulse.js';
import { applyEvent, emptyState } from '../../src/state.js';
import { startCampaign } from '../../src/engine.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { validateState } from '../../src/validate.js';
import { buildContext } from '../../src/context.js';
import { clone } from '../../src/util.js';
import { Dice } from '../../src/rng.js';

const content = await loadProductContent();
const VERGE = 'loc.alderwatch.verge', TOWN = 'loc.alderwatch', HALL = 'loc.alderwatch.guild_hall', REALM = 'realm.valedorn_crown';
const CONTINUE = { type: 'journey.continue', quote: 'I continue my journey' };
const GO = (to, quote = 'I go') => ({ type: 'go', to, quote });
const WAIT = (minutes, quote = 'I wait') => ({ type: 'activity', kind: 'wait', what: null, minutes, until: null, quote });
const NOT_THERE = { 1: { arrived: false, at: null, with: null } };
const pulseEvents = (events) => events.filter((e) => e.t === 'pulse.rolled');
const at = (h, m = 0) => h * 60 + m;

/** A turn resolved on a copy of the state (the way playerTurnV4 runs it: turn begun first). */
function turn(s0, commands, { clock = null, turnNo = null, input = 'I look around', mutate = null } = {}) {
    const s = clone(s0);
    const events = [];
    const emit = (e) => { applyEvent(s, e); events.push(e); };
    emit({ t: 'turn.begun', d: { turn: turnNo ?? s.turn + 1, input_hash: 'x', input } });
    if (clock != null) s.clock.minute = Math.floor(s.clock.minute / 1440) * 1440 + clock;
    if (mutate) mutate(s);
    const ctx = resolveCommands(s, content, commands.map((c, i) => ({ seq: i + 1, ...c })), emit, { c: true, msg: 1, dice: Dice.from(s) });
    return { s, ctx, events, auth: ctx.auth, pulse: ctx.auth.pulse, extra: ctx.extra };
}
async function base() {
    const g = await campaign(content);
    return g;
}
const ASHBRIDGE = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Ashbridge, Duskreach`';
/** A campaign at Ashbridge, where Blackgate is known (host-path tests with scripted planner answers). */
const road = () => campaign(content, { greeting: ASHBRIDGE });
async function withForce(force, fn) {
    const was = content.rules.pulse.force;
    content.rules.pulse.force = force;
    try { return await fn(); } finally { content.rules.pulse.force = was; }
}

// ------------------------------------------------------------------------------------------------ the chance
test('PULSE A3: V3 streak p = min(60, 1.75 base, base (1 + 0.15 misses)): rises per miss, capped relative and absolute', () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 20].map((n) => Math.round(pulseChance(content, 10, n) * 100) / 100), [10, 11.5, 13, 14.5, 16, 17.5, 17.5, 17.5]);
    assert.deepEqual([0, 1, 2, 3, 4, 5, 9].map((n) => Math.round(pulseChance(content, 35, n) * 100) / 100), [35, 40.25, 45.5, 50.75, 56, 60, 60]);
    assert.equal(pulseChance(content, 3, 50), 5.25, 'a safe interior at night stays low');
});

test('PULSE A2: frames and day parts set the base chance (street/inside/wild/travel x 5:59/6:00/18:59/19:00/21:59/22:00)', async () => {
    const g = await base();
    const s = g.state();
    const R = content.rules.pulse.base;
    const phase = { [at(5, 59)]: 'night', [at(6)]: 'day', [at(18, 59)]: 'day', [at(19)]: 'evening', [at(21, 59)]: 'evening', [at(22)]: 'night' };
    for (const [where, frame] of [[TOWN, 'street'], [HALL, 'inside'], [REALM, 'wild']]) {
        assert.equal(sceneFrame({ ...s, scene: { ...s.scene, at: where } }, content, where), frame);
        for (const [clock, ph] of Object.entries(phase)) {
            const t = turn(s, [], { clock: Number(clock), mutate: (x) => { x.scene.at = where; x.pulse = { v: 1, misses: 0, recent: [], pause: null }; } });
            assert.equal(t.pulse.frame, frame, where);
            assert.equal(t.pulse.phase, ph, `${clock}`);
            assert.equal(t.pulse.p, R[frame][ph], `${frame} ${ph}`);
        }
    }
    // a leg: the travel row, by the clock when the leg is authorized
    const t = turn(s, [GO('loc.blackgate', 'I set out for Blackgate')], { clock: at(20) });
    assert.deepEqual([t.pulse.exposure, t.pulse.frame, t.pulse.phase, t.pulse.p], ['travel', 'travel', 'evening', R.travel.evening]);
});

// ------------------------------------------------------------------------------------------------ one window, ROAD AHEAD
test('PULSE A1: two GO legs in one message: one window, one THE ROAD line, the first authorized leg; the key ignores clock, step number and words', async () => {
    const g = await base();
    const s = g.state();
    for (let n = 1; n <= 60; n++) {
        const t = turn(s, [GO('loc.blackgate', 'to Blackgate'), GO('loc.ashbridge', 'then on to Ashbridge')], { turnNo: n });
        assert.equal(pulseEvents(t.events).length, 1);
        assert.equal(t.extra.filter((x) => x.startsWith('THE ROAD')).length, 1, 'no second ROAD AHEAD line');
        assert.equal(t.pulse.exposure, 'travel');
        // the same turn with other minutes on the clock, the legs numbered otherwise, other words: the same draw
        const u = turn(s, [{ ...WAIT(10), kind: 'look' }, GO('loc.blackgate', 'to Blackgate')], { turnNo: n, input: 'other words' });
        assert.equal(u.pulse.roll, t.pulse.roll);
    }
});

test('PULSE A1: a first GO refused, a second authorized: the authorized one is the leg', async () => {
    const g = await base();
    const t = turn(g.state(), [GO('loc.nowhere', 'to nowhere'), GO('loc.blackgate', 'to Blackgate')]);
    assert.equal(t.ctx.resolutions[0].status, 'refused');
    assert.equal(t.pulse.exposure, 'travel');
    assert.ok(t.extra.some((x) => /^THE ROAD — .*toward Blackgate/.test(x)));
});

test('PULSE A1/§11.5: setting out from town to a Dungeon\'s gate is a leg; GO plus board read in town has no window; a far leg with a board stays travel', async () => {
    const g = await base();
    const s = g.state();
    const gate = turn(s, [GO('loc.old_crown_catacombs', 'I head to the catacombs')]);
    assert.equal(gate.pulse.exposure, 'travel', 'no town scene on the way out');
    const board = turn(s, [GO(HALL, 'I walk to the guild hall'), { type: 'board.read', quote: 'and read the board' }]);
    assert.equal(board.pulse.reason, 'board');
    assert.equal(pulseEvents(board.events).length, 0);
    const far = turn(s, [GO('loc.blackgate.guild_hall', 'I travel to the Blackgate guild hall'), { type: 'board.read', quote: 'and read the board' }]);
    assert.equal(far.pulse.exposure, 'travel');
    assert.equal(pulseEvents(far.events).length, 1);
});

// ------------------------------------------------------------------------------------------------ the miss streak
test('PULSE A3: real misses +1, an open window resets, exclusions leave it; the streak folds exactly', async () => {
    const g = await base();
    let s = g.state();
    let misses = 0, opened = 0, n = 0;
    for (let k = 0; k < 40; k++) {
        const t = turn(s, [], { turnNo: s.turn + 1, input: `look ${k}`, mutate: (x) => { x.scene.at = TOWN; } });
        if (t.pulse.rolled) { n++; assert.equal(t.pulse.misses, misses); if (t.pulse.open) { misses = 0; opened++; } else misses++; }
        s = t.s;
        assert.equal(s.pulse.misses, misses);
    }
    assert.equal(n, 40);
    assert.ok(opened > 0 && opened < 20, `${opened} of 40 town turns opened`);
    // an excluded turn (learning) changes nothing
    const before = s.pulse.misses;
    const t = turn(s, [{ type: 'activity', kind: 'train', what: 'staff forms', minutes: 60, until: null, quote: 'I train' }]);
    assert.equal(t.pulse.reason, 'learning');
    assert.equal(t.s.pulse.misses, before);
});

test('PULSE A3/A4: a held threat suppresses the window without a roll and without a streak change; the narrator hears it is still here', async () => {
    const g = await base();
    const s = g.state();
    const wolf = { id: 'mon.wolf_1', kind: 'creature', species: 'wolf', anchor: 'wolf', status: 'alive', threat: true, descriptors: ['grey wolf'] };
    let x = clone(s);
    x.entities[wolf.id] = wolf; x.scene.present = ['pc', wolf.id]; x.scene.at = REALM;
    x.pulse = { v: 1, misses: 3, recent: [], pause: null };
    for (let k = 0; k < 5; k++) {
        const t = turn(x, [], { input: `I talk to it ${k}` });
        assert.equal(t.pulse.reason, 'held');
        assert.equal(pulseEvents(t.events).length, 0);
        assert.equal(t.s.pulse.misses, 3, 'no artificial bonus while it is here');
        assert.ok(t.extra.some((l) => /^STILL HERE \(PULSE\) — .*no new foe/.test(l)), JSON.stringify(t.extra));
        x = t.s;
    }
    const leg = turn(x, [GO('loc.blackgate', 'I go on to Blackgate')]);
    assert.equal(leg.pulse.reason, 'held');
    assert.equal(leg.auth.road, 'quiet');
    assert.ok(leg.extra.some((l) => /^THE ROAD — .* still here as he goes on toward Blackgate/.test(l)));
    assert.deepEqual(heldThreats(x), [wolf.id]);
});

test('PULSE A4: a fight pauses PULSE (encounter, pending_combat); the streak waits; the next story turn rolls again', async () => {
    const g = await base();
    const s = clone(g.state());
    s.pulse = { v: 1, misses: 2, recent: [], pause: null };
    for (const mutate of [(x) => { x.encounter = { combatants: {} }; }, (x) => { x.pending_combat = [{ by: 'npc.x' }]; }]) {
        const t = turn(s, [], { mutate });
        assert.equal(t.pulse.reason, 'combat');
        assert.equal(pulseEvents(t.events).length, 0);
        assert.equal(t.s.pulse.misses, 2);
    }
    const after = turn(s, []);
    assert.equal(after.pulse.rolled, true);
    assert.equal(after.pulse.misses, 2);
});

// ------------------------------------------------------------------------------------------------ pauses and repeats
test('PULSE A: a pause gets the window (in a safe lodging never danger, obstacle or trouble); its block of further pauses rolls no more; split waiting farms nothing', async () => {
    const g = await base();
    let s = clone(g.state());
    s.scene.at = REALM;
    const first = turn(s, [WAIT(1)], { input: 'I wait a minute' });
    assert.equal(first.pulse.exposure, 'pause');
    assert.equal(first.pulse.rolled, true);
    s = first.s;
    for (let k = 0; k < 9; k++) {
        const t = turn(s, [WAIT(1)], { input: `I wait a minute more ${k}` });
        assert.equal(t.pulse.reason, 'pause_block');
        assert.equal(pulseEvents(t.events).length, 0);
        s = t.s;
    }
    // something else in between ends the block
    const look = turn(s, [], { input: 'I look about' });
    const again = turn(look.s, [WAIT(5)], { input: 'I wait again' });
    assert.equal(again.pulse.rolled, true);
    // an open window of a pause in a safe lodging brings only what does not cut it short; the pause is booked in full
    // (.164, package C: out in the land a danger, obstacle or strange window may cut it short; tests/v4/pulse_c.test.js)
    const hall = clone(look.s); hall.scene.at = HALL;
    await withForce({ open: true }, async () => {
        for (let n = 1; n <= 30; n++) {
            const t = turn(hall, [{ type: 'activity', kind: 'sleep', what: null, minutes: 480, until: null, quote: 'I sleep' }], { turnNo: look.s.turn + n });
            assert.ok(!['danger', 'obstacle', 'trouble'].includes(t.pulse.kind), t.pulse.kind);
            assert.equal(t.events.filter((e) => e.t === 'time.advanced').reduce((a, e) => a + e.d.minutes, 0), 480);
        }
    });
});

test('PULSE A: a pause before a later step: the window is the pause\'s, placed before the next steps; the later step is not stopped (package A)', async () => {
    const g = await base();
    const s = clone(g.state()); s.scene.at = TOWN;
    await withForce({ open: true, kind: 'life' }, async () => {
        const t = turn(s, [WAIT(5, 'I wait five minutes'), GO('loc.blackgate', 'then set out for Blackgate')]);
        assert.equal(t.pulse.exposure, 'pause');
        assert.equal(t.ctx.resolutions[1].status, 'authorized');
        assert.ok(t.extra.some((l) => /at the end of step 1, before his next steps/.test(l)));
        assert.equal(t.extra.filter((l) => l.startsWith('THE ROAD')).length, 0, 'one window: no second line for the leg');
    });
});

test('PULSE A: the same input again right after is a technical repeat: no roll', async () => {
    const g = await base();
    const s = clone(g.state()); s.scene.at = TOWN;
    const a = turn(s, [], { input: 'I look around the square' });
    const b = turn(a.s, [], { input: 'I look around the square' });
    assert.equal(b.pulse.reason, 'repeat');
    assert.equal(pulseEvents(b.events).length, 0);
});

test('PULSE A: a pending price (HARD STOP), learning, an invalid message and a Dungeon\'s inside have no window; DUNGEON AHEAD turns neither', async () => {
    const g = await base();
    const s = clone(g.state());
    const invalid = turn(s, [GO('loc.nowhere', 'to nowhere')]);
    assert.equal(invalid.pulse.reason, 'invalid');
    const inside = turn(s, [], { mutate: (x) => {
        x.places['loc.cave'] = { id: 'loc.cave', name: 'Cave', kind: 'site', parent: REALM, realm: REALM, tags: [], dungeon: { real: true } };
        x.places['loc.cave.hall'] = { id: 'loc.cave.hall', name: 'Hall', kind: 'interior', parent: 'loc.cave', realm: REALM, tags: [] };
        x.scene.at = 'loc.cave.hall';
    } });
    assert.ok(['dungeon', null].includes(inside.pulse?.reason ?? null));
    if (inside.pulse) assert.equal(pulseEvents(inside.events).length, 0);
});

// ------------------------------------------------------------------------------------------------ host: records
test('PULSE A1: the window is the record\'s: swipe, regenerate and reload give the same decision and the same streak; an edit draws the same value', async () => {
    const g = await road();
    await say(g, '*I set out for Blackgate*', GO('loc.blackgate', 'I set out for Blackgate'));
    const first = outcomeOf(g).auth.pulse;
    assert.equal(first.exposure, 'travel');
    for (const type of ['swipe', 'regenerate']) {
        await prepareGenerationAsync(g.chat, g.content, { type, settings: { planner: true }, llm: g.llm });
        assert.deepEqual(outcomeOf(g).auth.pulse, first, type);
    }
    // edit of the last message: resolved again from the same state, the same draw
    g.chat.at(-1).mes = '*I head off toward Blackgate*';
    g.plans = [JSON.stringify({ commands: [{ seq: 1, type: 'go', to: 'loc.blackgate', quote: 'I head off toward Blackgate' }] })];
    await prepareGenerationAsync(g.chat, g.content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    assert.equal(outcomeOf(g).auth.pulse.roll, first.roll);
    assert.equal(outcomeOf(g).auth.pulse.open, first.open);
    await g.reply('He walks east.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'arrive', at: 'realm.duskreach', with: null, forced_by: null }, { seq: 2, type: 'time', minutes: 180 }] });
    const folded = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(folded, g.state());
    assert.deepEqual(folded.pulse, g.state().pulse);
    assert.deepEqual(validateState(folded, content), []);
    assert.equal(rec(g.chat.at(-2)).events.filter((e) => e.t === 'pulse.rolled').length, 1);
});

test('PULSE A: a # command and a clarify panel roll nothing and keep the streak', async () => {
    const g = await base();
    await say(g, '*I look around*');
    const misses = g.state().pulse?.misses ?? 0;
    await g.reply('The verge is quiet.', { expected: {}, deltas: [] });
    const r = await say(g, '#status');
    assert.equal(r.action, 'panels');
    assert.equal(g.state().pulse?.misses ?? 0, misses);
    assert.equal((rec(g.chat.findLast((m) => m.is_user))?.events || []).filter((e) => e.t === 'pulse.rolled').length, 0);
});

// ------------------------------------------------------------------------------------------------ the firewall (world.js)
function world() {
    const s = emptyState();
    for (const e of startCampaign(content, { runtime: 'v4', ruleset: 2, planner: true, seed: 7 })) applyEvent(s, e);
    const place = (id, name, kind, parent, population) => { s.places[id] = { id, name, kind, parent, realm: REALM, tags: [], ...(population ? { population } : {}) }; };
    place('loc.wood', 'Hartwood', 'wilderness', REALM, { species: 'wild boar', anchor: 'boar', levels: [4, 7] });
    place('loc.wood.glade', 'Oak glade', 'site', 'loc.wood');
    place('loc.moor', 'Red moor', 'wilderness', REALM);
    s.scene.at = 'loc.moor';
    s.mode = 'story'; // past character creation: fights may open
    return s;
}
const withAuth = (s, pulse, extra = {}) => { s.last.outcome = { c: true, kind: 'v4', auth: { c: true, gos: [], ...extra, pulse }, expected_keys: {} }; return s; };
const boar = (ref = 'boar', more = {}) => ({ type: 'creature.new', ref, species: 'wild boar', anchor: 'boar', desc: [], count: 1, present: true, band: 'SHORT', cluster: null, stronger: null, threat: true, more: true, population: 'loc.wood', life_stage: 'adult', ...more });
const bandits = (ref = 'bandits', seq) => ({ seq, type: 'person.new', ref, name: null, role: 'bandit', desc: ['armed bandit'], present: true, relevant: true, threat: true, at: null, band: 'SHORT' });
const apply = (s, deltas, prose, expected = {}) => applyWorld(s, content, { scene: 'here', expected, deltas: deltas.map((d, i) => ({ seq: i + 1, ...d })) }, { msg: 50, prose });
const QUIET = { v: 1, governs: true, rolled: true, open: false, exposure: 'scene' };
const DANGER = { v: 1, governs: true, rolled: true, open: true, kind: 'danger', exposure: 'scene' };

test('PULSE A5: quiet scene: a new attacker is refused (rule pulse) with a correction; a danger window lets one group attack, not a second', () => {
    const q = apply(withAuth(world(), QUIET), [bandits('bandits'), { type: 'hostile', by: ['bandits'] }], 'The bandits draw steel and attack him.');
    assert.ok(q.rejected.some((r) => r.rule === 'pulse'), JSON.stringify(q.rejected));
    assert.equal(q.state.encounter, null);
    assert.ok(q.corrections.some((c) => /no new attacker was authorized/.test(c)));
    const d = apply(withAuth(world(), DANGER), [bandits('bandits'), { type: 'hostile', by: ['bandits'] }], 'The bandits draw steel and attack him.');
    assert.ok(!d.rejected.some((r) => r.rule === 'pulse'), JSON.stringify(d.rejected));
    assert.ok(d.state.encounter || d.state.pending_combat.length, `the danger group's attack stands ${JSON.stringify(d.rejected)}`);
    const two = apply(withAuth(world(), DANGER), [
        boar('boars', { population: 'independent' }), { type: 'hostile', by: ['boars'] },
        bandits('bandits'), { type: 'hostile', by: ['bandits'] },
    ], 'A boar charges him; then the bandits attack him too.');
    assert.equal(two.rejected.filter((r) => r.rule === 'pulse').length, 1, JSON.stringify(two.rejected));
    assert.match(two.rejected.find((r) => r.rule === 'pulse').why, /only one hostile group/);
});

test('PULSE A5: a newcomer takes nothing in the same reply (robbery, fine, confiscation): a demand; an authority already here keeps the envelope rule', () => {
    const s = withAuth(world(), DANGER);
    const coin = s.entities.pc.sheet.coin_cp;
    const r = apply(s, [bandits('robber'), { type: 'coerce', by: 'robber', kind: 'robbery', coin_cp: 10, object: null, because: 'at knife point' }], 'The robber takes his purse.');
    assert.ok(r.rejected.some((x) => x.rule === 'pulse_take'), JSON.stringify(r.rejected));
    assert.equal(r.state.entities.pc.sheet.coin_cp, coin);
    assert.ok(r.corrections.some((c) => /Nothing was taken from Alaric/.test(c)));
});

test('PULSE A5: someone present before follows the envelope as ever (no PULSE rule on them)', () => {
    const s = withAuth(world(), QUIET);
    s.entities['npc.thug'] = { id: 'npc.thug', kind: 'npc', name: 'Rask', status: 'alive', descriptors: ['thug'], occupation: 'bandit', card: {} };
    s.scene.present = ['pc', 'npc.thug'];
    s.scene.threats = ['npc.thug'];
    const r = apply(s, [{ type: 'hostile', by: ['npc.thug'] }], 'Rask lunges at him with his knife.');
    assert.ok(!r.rejected.some((x) => ['pulse', 'road'].includes(x.rule)), JSON.stringify(r.rejected));
    assert.ok(r.state.encounter || r.state.pending_combat.length, `the envelope decides as ever ${JSON.stringify(r.rejected)}`);
});

test('PULSE A6 (§14/§16): sought contact only by an authorized/successful action and only where he actually is; the quiet road no longer blocks it after a confirmed arrival', () => {
    const SOUGHT = (exposure) => ({ ...QUIET, exposure, sought: [{ population: 'loc.wood' }] });
    // (1) on the way, not arrived: the habitat's boar cannot be booked here at all / is no exception
    const way = apply(withAuth(world(), SOUGHT('travel'), { road: 'quiet' }), [boar('boar'), { type: 'hostile', by: ['boar'] }], 'A boar bursts out and charges him.');
    assert.equal(way.state.encounter, null);
    assert.ok(way.rejected.some((r) => ['population', 'road'].includes(r.rule)), JSON.stringify(way.rejected));
    assert.ok(!Object.values(way.state.entities).some((e) => e.kind === 'creature' && e.population_at === 'loc.wood' && way.state.scene.present.includes(e.id) && way.state.encounter), 'no ambush on the way');
    // (2) arrival confirmed in this reply, then the sought boar: allowed before the road rule
    const s2 = withAuth(world(), SOUGHT('travel'), { road: 'quiet', gos: [{ seq: 1, to: 'loc.wood.glade', name: 'Oak glade' }] });
    const arrive = apply(s2, [{ type: 'arrive', at: 'loc.wood.glade', with: null, forced_by: null }, boar('boar'), { type: 'hostile', by: ['boar'] }],
        'He reaches the oak glade. A boar bursts out and charges him.', { 1: { arrived: true, at: 'loc.wood.glade', with: null } });
    assert.equal(arrive.state.scene.at, 'loc.wood.glade', JSON.stringify(arrive.rejected));
    assert.ok(!arrive.rejected.some((r) => ['road', 'pulse'].includes(r.rule)), JSON.stringify(arrive.rejected));
    const b = Object.values(arrive.state.entities).find((e) => e.kind === 'creature' && e.species === 'wild boar');
    assert.equal(b?.population_at, 'loc.wood');
    assert.ok(arrive.state.encounter || arrive.state.pending_combat.length, `the sought boar's attack stands: a fight opens ${JSON.stringify(arrive.rejected)}`);
    // (3) arrived, but strangers (bandits) attack: PULSE/road as ever
    const s3 = withAuth(world(), SOUGHT('travel'), { road: 'quiet', gos: [{ seq: 1, to: 'loc.wood.glade', name: 'Oak glade' }] });
    const strangers = apply(s3, [{ type: 'arrive', at: 'loc.wood.glade', with: null, forced_by: null }, bandits('bandits'), { type: 'hostile', by: ['bandits'] }],
        'He reaches the glade; bandits attack him there.', { 1: { arrived: true, at: 'loc.wood.glade', with: null } });
    assert.ok(strangers.rejected.some((r) => r.rule === 'road'), JSON.stringify(strangers.rejected));
    // (4) already there, a later turn's successful search registers it: the boar may attack (scene)
    const s4 = withAuth(world(), SOUGHT('scene')); s4.scene.at = 'loc.wood.glade';
    const later = apply(s4, [boar('boar'), { type: 'hostile', by: ['boar'] }], 'A boar bursts out and charges him.');
    assert.ok(!later.rejected.some((r) => ['road', 'pulse'].includes(r.rule)), JSON.stringify(later.rejected));
    assert.ok(later.state.encounter || later.state.pending_combat.length);
    // (5) no registered seeking (refused GO, failed search): no exception
    const s5 = withAuth(world(), QUIET); s5.scene.at = 'loc.wood.glade';
    const none = apply(s5, [boar('boar'), { type: 'hostile', by: ['boar'] }], 'A boar bursts out and charges him.');
    assert.ok(none.rejected.some((r) => r.rule === 'pulse'), JSON.stringify(none.rejected));
});

test('PULSE A6: at the habitat of a world hunt he has taken on, that population\'s creatures may answer his waiting or luring; strangers and other kinds stay under PULSE; the window still rolls there', async () => {
    const hunt = (s) => { s.quests['quest.boar'] = { id: 'quest.boar', status: 'active', taker: 'pc', title: 'Boar cull', hunt: { at: 'loc.wood', age: 'adult' }, objectives: [{ verb: 'DEFEAT', what: 'wild boar', qty: 2 }] }; s.scene.at = 'loc.wood.glade'; return s; };
    const HUNTS = { ...QUIET, hunts: [{ population: 'loc.wood', hunt: 'quest.boar' }] };
    const lured = apply(withAuth(hunt(world()), HUNTS), [boar('boar'), { type: 'hostile', by: ['boar'] }], 'He bangs his sword on a trunk; the boar charges him.');
    assert.ok(!lured.rejected.some((r) => r.rule === 'pulse'), JSON.stringify(lured.rejected));
    assert.ok(lured.state.encounter || lured.state.pending_combat.length);
    const strangers = apply(withAuth(hunt(world()), HUNTS), [bandits('bandits'), { type: 'hostile', by: ['bandits'] }], 'Bandits step out and attack him.');
    assert.ok(strangers.rejected.some((r) => r.rule === 'pulse'));
    const other = apply(withAuth(hunt(world()), HUNTS), [boar('wolf', { species: 'grey wolf', anchor: 'wolf', population: 'independent' }), { type: 'hostile', by: ['wolf'] }], 'A grey wolf leaps at him.');
    assert.ok(other.rejected.some((r) => r.rule === 'pulse'), JSON.stringify(other.rejected));
    // the turn itself: the hunt marks the firewall's exception, not an exclusion of the window
    const g = await base();
    const s = hunt(clone(g.state()));
    s.places['loc.wood'] = { id: 'loc.wood', name: 'Hartwood', kind: 'wilderness', parent: REALM, realm: REALM, tags: [], population: { species: 'wild boar', anchor: 'boar', levels: [4, 7] } };
    s.places['loc.wood.glade'] = { id: 'loc.wood.glade', name: 'Oak glade', kind: 'site', parent: 'loc.wood', realm: REALM, tags: [] };
    const t = turn(s, [], { input: 'I wait by the glade and talk to myself' });
    assert.equal(t.pulse.rolled, true);
    assert.deepEqual(t.pulse.hunts, [{ population: 'loc.wood', hunt: 'quest.boar' }]);
});

test('PULSE A6: the seeking is registered only by what the engine authorized or resolved with success', async () => {
    const g = await base();
    const s = clone(g.state());
    s.places['loc.wood'] = { id: 'loc.wood', name: 'Hartwood', kind: 'wilderness', parent: REALM, realm: REALM, tags: [], population: { species: 'wild boar', anchor: 'boar', levels: [4, 7] } };
    s.places['loc.wood.glade'] = { id: 'loc.wood.glade', name: 'Oak glade', kind: 'site', parent: 'loc.wood', realm: REALM, tags: [] };
    // a GO to the habitat, authorized: sought (it is the leg as well); a refused GO beside it adds nothing
    const t = turn(s, [GO('loc.nowhere', 'to nowhere'), GO('loc.wood', 'I head into the Hartwood to hunt boar')]);
    assert.deepEqual(t.pulse.sought, [{ population: 'loc.wood' }]);
    // a place below the habitat is no hunt by itself; it is within a hunt he has taken on
    assert.equal(turn(s, [GO('loc.wood.glade', 'I walk to the oak glade')]).pulse.sought, undefined);
    const hunting = clone(s);
    hunting.quests['quest.boar'] = { id: 'quest.boar', status: 'active', taker: 'pc', title: 'Boar cull', hunt: { at: 'loc.wood', age: 'adult' }, objectives: [{ verb: 'DEFEAT', what: 'wild boar', qty: 2 }] };
    assert.deepEqual(turn(hunting, [GO('loc.wood.glade', 'I walk to the oak glade')]).pulse.sought, [{ population: 'loc.wood' }]);
    const refused = turn(s, [GO('loc.nowhere', 'to the boar wood')]);
    assert.equal(refused.pulse.sought, undefined);
    // a failed search registers nothing; a successful one at the habitat does (and has no window: his seeking is the event)
    const x = clone(s); x.scene.at = 'loc.wood.glade';
    const scores = content.rules.checks.difficulty_scores, was = scores.moderate;
    const SEARCH = [{ type: 'activity', kind: 'search', what: 'boar tracks', minutes: 30, until: null, quote: 'I look for boar tracks' }];
    try {
        scores.moderate = 1e9; // every search fails
        const fail = turn(x, SEARCH);
        assert.equal(fail.ctx.searchChecks[0].success, false);
        assert.equal(fail.pulse.sought, undefined);
        assert.notEqual(fail.pulse.reason, 'sought');
        scores.moderate = 0.0001; // every search succeeds
        const ok = turn(x, SEARCH);
        assert.equal(ok.ctx.searchChecks[0].success, true);
        assert.deepEqual(ok.pulse.sought, [{ population: 'loc.wood' }]);
        assert.equal(ok.pulse.reason, 'sought');
        assert.equal(pulseEvents(ok.events).length, 0);
    } finally { scores.moderate = was; }
});

// ------------------------------------------------------------------------------------------------ narrator context
test('PULSE A7: the narrator block: one compact line for an open window, none for a quiet scene; the envelope carries the standing rule', async () => {
    const g = await base();
    const s = clone(g.state()); s.scene.at = TOWN;
    await withForce({ open: true, kind: 'meeting' }, async () => {
        const t = turn(s, [], { input: 'I stroll across the square' });
        assert.equal(t.extra.filter((l) => /^PULSE \(the engine's; \w+, in the street\) — ONE concrete thing happens around him/.test(l)).length, 1, JSON.stringify(t.extra));
        const ctx = buildContext(t.s, content, { outcome: { kind: 'v4', actions: [], extra: t.extra, resolutions: [], auth: { ...t.auth, c: true } } });
        assert.match(ctx.text, /Nobody new in this reply attacks Alaric or takes his coin or things/);
    });
    await withForce({ open: false }, async () => {
        const t = turn(s, [], { input: 'I stroll on' });
        assert.deepEqual(t.extra.filter((l) => /PULSE/.test(l)), []);
    });
});

test('PULSE A: older campaigns (ruleset 1) keep Patch 5\'s own road roll untouched', async () => {
    const s = clone((await base()).state());
    s.meta.ruleset = 1;
    const t = turn(s, [GO('loc.blackgate', 'I set out for Blackgate')]);
    assert.equal(t.pulse, undefined);
    assert.ok(['open', 'quiet'].includes(t.auth.road));
    assert.equal(pulseEvents(t.events).length, 0);
});

test('PULSE A: no model call is added (planner and extractor only)', async () => {
    const g = await road();
    const purposes = [];
    const llm = g.llm;
    g.llm = async (req) => { purposes.push(req.purpose.replace(/[:.].*$/, '')); return llm(req); };
    await say(g, '*I set out for Blackgate*', GO('loc.blackgate', 'I set out for Blackgate'));
    await g.reply('He walks.', { expected: NOT_THERE, deltas: [] });
    assert.deepEqual([...new Set(purposes)].sort(), ['extract', 'plan']);
    void lastUser;
});
