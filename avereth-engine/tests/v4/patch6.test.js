// Patch 6 (exploration, discovery, environmental hazards): the obstacles and dangers of a place are kept with it
// (src/v4/features.js); the story establishes them with how hard they are, the engine rolls every attempt on them before
// the story is written, books the harm, and keeps what he got past or made harmless. A search remembers what it looked
// for where; a successful one finds what is hidden there; the same search again is no new roll. Played through the
// product's host path (planner on, the extension's own content, Ashbridge), the LLM calls scripted.
// Confirmed and fixed: SEARCH rolled again for the identical search as often as he asked, and a failure could be told as
// a false lead; nothing kept an obstacle or a trap (a collapsed bridge was a free fact); a skill on a thing gave the
// narrator a die with which it chose the difficulty after seeing the roll; creature.new more:true for one animal where
// one of its kind was left returned that one (the Patch 5 edge).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec, foldChat } from '../../src/host.js';
import { buildContext } from '../../src/context.js';
import { buildCatalog, extractorCatalog } from '../../src/v4/catalog.js';
import { parsePlan } from '../../src/v4/planner.js';
import { Chat4 } from './harness.js';

const content = await loadProductContent();
const GREETING = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Ashbridge, Duskreach`';

async function campaign(cls = 'Mage', skills = 'Flame Lance + Arcane Burst') {
    const g = new Chat4(content, { greeting: GREETING });
    await g.player(cls);
    await g.player(skills);
    const ask = g.llm;
    g.purposes = [];
    g.llm = async (req) => {
        g.purposes.push(req.purpose);
        return req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req);
    };
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    const own = (q) => (q && text.includes(q) ? q : text.replace(/\*/g, '').trim());
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c, ...('quote' in c ? { quote: own(c.quote) } : {}) })) })];
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    if (r.action === 'panels') g.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
    return r;
}
const lastRec = (g) => rec(g.chat.findLast((m) => m.is_user));
const outcome = (g) => lastRec(g)?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
const checksOf = (r) => (r?.events || []).filter((e) => e.t === 'check.recorded').map((e) => e.d);
const inject = (g, events) => g.chat.findLast((m) => m.extra?.avereth?.events).extra.avereth.events.push(...events);
const rejectedRules = (r) => r.record.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule);
const feats = (s) => Object.values(s.features || {});
const featNamed = (s, re) => feats(s).find((f) => re.test(f.name));
const hp = (s) => s.entities.pc.sheet.hp;

/** A feature as the extractor reports it. */
const feature = (name, kind, more = {}, seq = 1) => ({ seq, type: 'feature', feature: name, name, kind, hidden: null, status: null, trigger: null, stat: null, difficulty: null, harm: null, ...more });
/** For one test: every check of this difficulty is (nearly) sure to succeed or to fail. */
async function scores(set, fn) {
    const was = { ...content.rules.checks.difficulty_scores };
    Object.assign(content.rules.checks.difficulty_scores, set);
    try { return await fn(); } finally { Object.assign(content.rules.checks.difficulty_scores, was); }
}
const SURE = 0.0001;
const NEVER = 1e9;

/** Alaric climbs into the old watchtower; the story shows what is there. */
async function tower(deltas = []) {
    const g = await campaign();
    await say(g, '*I climb into the old watchtower*', { type: 'go', to: { new: 'the old watchtower' }, quote: 'I climb into the old watchtower' });
    const r = await g.reply('The old watchtower: the wooden stairs have collapsed halfway up; a narrow passage leads into the dark.', {
        expected: { 1: { arrived: true, at: { new: { name: 'Old watchtower', kind: 'site', parent: 'realm.duskreach' } }, with: null } },
        deltas,
    });
    return { g, r, at: g.state().scene.at };
}
const STAIRS = feature('collapsed wooden stairs', 'obstacle', { stat: 'STR', difficulty: 'hard', harm: 'hp' });
async function out(g) {
    await say(g, '*I step back outside onto the road*', { type: 'go', to: 'realm.duskreach', quote: 'I step back outside onto the road' });
    await g.reply('He is outside on the road again.', { expected: { 1: { arrived: true, at: 'realm.duskreach', with: null } }, deltas: [] });
}
async function back(g, at) {
    await say(g, '*I go back into the watchtower*', { type: 'go', to: at, quote: 'I go back into the watchtower' });
    return g.reply('The watchtower again.', { expected: { 1: { arrived: true, at, with: null } }, deltas: [] });
}
const attempt = (feature, aim, more = {}) => ({ type: 'attempt', feature, aim, approach: more.approach ?? null, stat: more.stat ?? null, tool: more.tool ?? null, possible: more.possible ?? null, quote: more.quote || 'x' });

// ------------------------------------------------------------------------------------------------ A. discoveries (1-8)
test('patch 6 (1, 9): an obvious collapsed bridge needs no roll; it stays where it is, as it is, when he comes back; named again it is the same one', async () => {
    const { g, r, at } = await tower([feature('collapsed rope bridge', 'obstacle', { status: 'destroyed', difficulty: 'impossible' })]);
    assert.deepEqual(checksOf(r.record), [], 'no PER check for what is in plain sight');
    let s = g.state();
    const bridge = featNamed(s, /bridge/);
    assert.deepEqual([bridge.at, bridge.status, bridge.hidden], [at, 'destroyed', false]);
    await out(g);
    await back(g, at);
    // named again by its id (the extractor's FEATURES), or by some of its own words: the same one, no copy
    await say(g, '*I look at the bridge*');
    await g.reply('The broken bridge still hangs in tatters over the drop.', { expected: {}, deltas: [{ ...feature('the broken bridge', 'obstacle'), feature: bridge.id }, feature('the collapsed bridge', 'obstacle', {}, 2)] });
    s = g.state();
    assert.equal(feats(s).filter((f) => /bridge/.test(f.name)).length, 1, 'no copy');
    assert.equal(s.features[bridge.id].status, 'destroyed', 'still destroyed');
    assert.match(buildCatalog(s, content, { c: true }).features.map((f) => f.text).join(' '), /collapsed rope bridge, obstacle, destroyed/);
});

test('patch 6 (2, 3, 7): a hidden pressure plate is found by a search for it: the engine names it, and it stays found after he leaves and comes back', async () => {
    await scores({ moderate: SURE }, async () => {
        const { g, at } = await tower([feature('pressure plate under the dust', 'hazard', { hidden: true, trigger: 'touch', stat: 'AGI', difficulty: 'moderate' })]);
        let s = g.state();
        const plate = featNamed(s, /pressure plate/);
        assert.equal(plate.hidden, true);
        assert.ok(!buildCatalog(s, content, { c: true }).features.length, 'the player\'s side does not see it');
        assert.match(extractorCatalog(s, content, { c: true }).text, /pressure plate under the dust.*HIDDEN: Alaric has not found it/);
        assert.match(buildContext(s, content, { input: 'x', lastReply: '' }).text, /HIDDEN HERE \(he has not found them/);
        await say(g, '*I inspect the floor for pressure plates*', { type: 'activity', kind: 'search', what: 'the floor for pressure plates', minutes: null, until: null, quote: 'I inspect the floor for pressure plates' });
        const o = outcome(g);
        assert.match(o.actions.join('\n'), /SUCCESS — he finds pressure plate under the dust \(feat\.\d+, a hazard that springs on touch\)/);
        s = g.state();
        assert.equal(s.features[plate.id].hidden, false);
        await g.reply('He brushes the dust aside: a stone plate, slightly raised.', { expected: { 1: { minutes: 20, done: true } }, deltas: [] });
        await out(g);
        await back(g, at);
        s = g.state();
        assert.equal(s.features[plate.id].hidden, false, 'found stays found');
        assert.match(buildCatalog(s, content, { c: true }).features.map((f) => f.text).join(' '), /pressure plate under the dust, hazard, dangerous/);
    });
});

test('patch 6 (4): a failed search is no success: nothing found, the plate stays hidden, the story is told to say so plainly, and the story cannot reveal it itself', async () => {
    await scores({ moderate: NEVER }, async () => {
        const { g } = await tower([feature('pressure plate under the dust', 'hazard', { hidden: true, trigger: 'touch', stat: 'AGI' })]);
        await say(g, '*I search the floor for traps*', { type: 'activity', kind: 'search', what: 'the floor for traps', minutes: null, until: null, quote: 'I search the floor for traps' });
        const o = outcome(g);
        assert.match(o.actions.join('\n'), /FAILURE — he finds nothing new this way: say so plainly \(no false lead, nothing he wrongly believes/);
        assert.equal(checksOf(lastRec(g))[0].success, false);
        const r = await g.reply('He finds a pressure plate after all.', { expected: { 1: { minutes: 20, done: true } }, deltas: [feature('pressure plate under the dust', 'hazard', { hidden: false })] });
        assert.ok(rejectedRules(r).includes('engine_owned'));
        assert.equal(featNamed(g.state(), /pressure/).hidden, true);
    });
});

test('patch 6 (5, 6): the identical search again is no new roll; another focus is; so is the same search once something there has changed', async () => {
    await scores({ moderate: NEVER }, async () => {
        const { g } = await tower([feature('loose stone in the wall', 'obstacle', { hidden: true })]);
        const search = (what) => ({ type: 'activity', kind: 'search', what, minutes: null, until: null, quote: `I search ${what}` });
        await say(g, '*I search the floor for traps*', search('the floor for traps'));
        await g.reply('Nothing.', { expected: { 1: { minutes: 20, done: true } }, deltas: [] });
        await say(g, '*I search the floor for traps again*', search('the floor for traps'));
        let o = outcome(g);
        assert.match(o.actions.join('\n'), /SEARCHED ALREADY — he searched the floor for traps here before .*no roll/);
        assert.deepEqual(checksOf(lastRec(g)), [], 'no second roll');
        await g.reply('He has already been over that floor.', { expected: {}, deltas: [] });
        await say(g, '*I search the walls for a lever*', search('the walls for a lever'));
        assert.equal(checksOf(lastRec(g)).length, 1, 'another focus is another search');
        await g.reply('Nothing on the walls.', { expected: { 1: { minutes: 20, done: true } }, deltas: [] });
        // something changes there: the floor search is worth doing again
        await say(g, '*I look around*');
        await g.reply('Part of the ceiling comes down in the corner.', { expected: {}, deltas: [feature('cracked ceiling beam', 'hazard', { trigger: 'enter', stat: 'AGI' })] });
        await say(g, '*I search the floor for traps*', search('the floor for traps'));
        assert.equal(checksOf(lastRec(g)).length, 1, 'the place changed since');
        o = outcome(g);
        assert.doesNotMatch(o.actions.join('\n'), /SEARCHED ALREADY/);
    });
});

test('patch 6 (8, 14): a cellar the story only mentions is no place he has been; going down makes it one, the same one when he comes back', async () => {
    const { g, at } = await tower();
    const places = Object.keys(g.state().places).length;
    await say(g, '*I look around*');
    await g.reply('Behind a sack, a narrow stair leads down to a cellar.', { expected: {}, deltas: [] });
    let s = g.state();
    assert.equal(Object.keys(s.places).length, places);
    assert.equal(s.scene.at, at);
    await say(g, '*I go down the stair into the cellar*', { type: 'go', to: { new: 'the cellar' }, quote: 'I go down the stair into the cellar' });
    await g.reply('A low cellar of old barrels.', { expected: { 1: { arrived: true, at: { new: { name: 'Watchtower cellar', kind: 'interior', parent: at } }, with: null } }, deltas: [] });
    s = g.state();
    const cellar = s.scene.at;
    assert.equal(s.places[cellar].parent, at);
    await say(g, '*I climb back up*', { type: 'go', to: at, quote: 'I climb back up' });
    await g.reply('Up again.', { expected: { 1: { arrived: true, at, with: null } }, deltas: [] });
    await say(g, '*I go down into the cellar again*', { type: 'go', to: cellar, quote: 'I go down into the cellar again' });
    await g.reply('The cellar again.', { expected: { 1: { arrived: true, at: cellar, with: null } }, deltas: [] });
    assert.equal(g.state().scene.at, cellar);
    assert.equal(Object.values(g.state().places).filter((p) => /cellar/i.test(p.name)).length, 1);
});

// ------------------------------------------------------------------------------------------------ B. hazards (9-18)
test('patch 6 (10, 11): what he got past stays behind him; a trap he disarmed does not spring or need disarming again; no roll for either', async () => {
    await scores({ hard: SURE, moderate: SURE }, async () => {
        const { g } = await tower([STAIRS, feature('tripwire across the passage', 'hazard', { trigger: 'cross', stat: 'PER', difficulty: 'moderate' }, 2)]);
        let s = g.state();
        const stairs = featNamed(s, /stairs/);
        const wire = featNamed(s, /tripwire/);
        await say(g, '*I climb up the broken stairs*', attempt(stairs.id, 'pass', { stat: 'STR', approach: 'climb up the broken stairs' }));
        assert.match(outcome(g).actions.join('\n'), /GETS PAST — collapsed wooden stairs .*SUCCESS/);
        await g.reply('He hauls himself up.', { expected: {}, deltas: [] });
        await say(g, '*I climb the stairs again*', attempt(stairs.id, 'pass', { stat: 'STR' }));
        assert.match(outcome(g).actions.join('\n'), /PASSES — collapsed wooden stairs .*already behind him.*no check/);
        assert.deepEqual(checksOf(lastRec(g)), []);
        await g.reply('Up again.', { expected: {}, deltas: [] });
        await say(g, '*I cut the tripwire*', attempt(wire.id, 'disable', { stat: 'AGI', approach: 'cut the tripwire' }));
        await g.reply('Snip.', { expected: {}, deltas: [] });
        s = g.state();
        assert.equal(s.features[wire.id].status, 'disabled');
        const hpBefore = hp(s);
        await say(g, '*I walk through the passage*', attempt(wire.id, 'pass'));
        assert.match(outcome(g).actions.join('\n'), /harmless already; no check, no new risk, no new reward/);
        assert.deepEqual(checksOf(lastRec(g)), []);
        assert.equal(hp(g.state()), hpBefore);
    });
});

test('patch 6 (12, 13, 17): a hidden trap at the door springs when he goes back in: the engine rolls before the story, books the harm once he is in, and a swipe or a replay books nothing again', async () => {
    await scores({ moderate: NEVER }, async () => {
        const { g, at } = await tower([feature('tripwire at the doorway', 'hazard', { hidden: true, trigger: 'enter', stat: 'AGI', difficulty: 'moderate' })]);
        await out(g);
        const before = hp(g.state());
        await say(g, '*I go back into the watchtower*', { type: 'go', to: at, quote: 'I go back into the watchtower' });
        const line = outcome(g).extra.join('\n');
        assert.match(line, /HIDDEN DANGER, IF HE GETS IN — tripwire at the doorway \(feat\.\d+\), which he has not found, springs as he enters: his reaction AGI \d+ vs moderate .* → FAILURE; it catches him \(HP -\d+\)/);
        assert.equal(hp(g.state()), before, 'rolled before the story, booked only once he is in');
        await g.reply('A wire snaps across his shins as he steps in.', { expected: { 1: { arrived: true, at, with: null } }, deltas: [] });
        let s = g.state();
        const harm = content.rules.exploration.harm.moderate;
        assert.equal(hp(s), before - harm, 'booked by the engine, its number');
        const wire = featNamed(s, /tripwire/);
        assert.deepEqual([wire.hidden, wire.status], [false, 'disabled']);
        assert.equal(g.chat.flatMap((m) => m.extra?.avereth?.events || []).filter((e) => e.t === 'check.recorded' && e.d.feature === wire.id).length, 1);
        // a swipe of the reply: the same roll told again, the old booking replaced, no second harm
        await prepareGenerationAsync(g.chat, content, { type: 'swipe', settings: { planner: true }, llm: g.llm });
        assert.equal(outcome(g).extra.join('\n'), line, 'the same dice');
        await g.reply('A wire snaps across his shins.', { expected: { 1: { arrived: true, at, with: null } }, deltas: [] });
        assert.equal(hp(g.state()), before - harm);
        assert.equal(foldChat(g.chat).state.entities.pc.sheet.hp, before - harm, 'the fold books it once');
        // a spent trap springs no more
        await out(g);
        await back(g, at);
        assert.equal(hp(g.state()), before - harm);
        assert.doesNotMatch(outcome(g).extra.join('\n'), /HIDDEN DANGER/);
    });
});

test('patch 6 (14, 15, 16): the story cannot change the roll or the difficulty; a success spares him the harm; a failure on a danger costs exactly the rules\' harm, on a harmless obstacle nothing', async () => {
    await scores({ hard: SURE }, async () => {
        const { g } = await tower([feature('rotten beam over the drop', 'hazard', { stat: 'AGI', difficulty: 'hard', trigger: 'cross' })]);
        const beam = featNamed(g.state(), /beam/);
        const before = hp(g.state());
        await say(g, '*I balance across the rotten beam*', attempt(beam.id, 'pass', { stat: 'AGI', approach: 'balance across' }));
        assert.match(outcome(g).actions.join('\n'), /GETS PAST — rotten beam .*AGI \d+ vs hard .*SUCCESS/);
        const r = await g.reply('The beam groans, cracks, and he falls; the beam was very hard after all.', { expected: {}, deltas: [feature('rotten beam over the drop', 'hazard', { difficulty: 'very_hard' })] });
        assert.ok(rejectedRules(r).includes('engine_owned'), 'the difficulty stays as established');
        assert.equal(hp(g.state()), before, 'the success spared him; the story\'s fall books nothing');
        assert.equal(g.state().features[beam.id].status, 'passed');
    });
    await scores({ hard: NEVER }, async () => {
        const { g } = await tower([feature('rotten beam over the drop', 'hazard', { stat: 'AGI', difficulty: 'hard', trigger: 'cross' }), { ...STAIRS, seq: 2, harm: null }]);
        const beam = featNamed(g.state(), /beam/);
        const stairs = featNamed(g.state(), /stairs/);
        const before = hp(g.state());
        await say(g, '*I balance across the rotten beam*', attempt(beam.id, 'pass', { stat: 'AGI' }));
        assert.match(outcome(g).actions.join('\n'), /FAILS — rotten beam .*He does not get past it; it hurts him: HP \d+->\d+/);
        assert.equal(hp(g.state()), before - content.rules.exploration.harm.hard);
        assert.equal(g.state().features[beam.id].status, 'active', 'still in the way');
        await g.reply('He slips and catches himself, bruised.', { expected: {}, deltas: [] });
        const mid = hp(g.state());
        await say(g, '*I climb the broken stairs*', attempt(stairs.id, 'pass', { stat: 'STR' }));
        assert.match(outcome(g).actions.join('\n'), /FAILS — collapsed wooden stairs .*no harm/);
        assert.equal(hp(g.state()), mid);
    });
});

test('patch 6 (18): a dramatic telling of danger changes no HP: a beam crashing down on him in the story, or a wound claimed, books nothing', async () => {
    const { g } = await tower();
    const before = hp(g.state());
    await say(g, '*I look around*');
    const r = await g.reply('A beam crashes down across his shoulder; blood runs down his arm.', { expected: {}, deltas: [
        feature('fallen ceiling beam', 'hazard', { status: 'destroyed' }),
        { seq: 2, type: 'fact', s: 'Alaric', p: 'wound', o: 'deep gash on the shoulder' },
    ] });
    assert.equal(hp(g.state()), before);
    assert.ok(rejectedRules(r).length >= 1);
});

// ------------------------------------------------------------------------------------------------ C. solutions (19-25)
const ROPE = { t: 'object.created', d: { object: { id: 'obj.rope', name: 'coil of rope', kind: 'item', stack: false, qty: 1, unit: null, use: 'tool', holder: { entity: 'pc' }, marks: [], for_quests: [], source: { how: 'bought' } } } };
const OIL = { t: 'object.created', d: { object: { id: 'obj.oil', name: 'flask of lamp oil', kind: 'item', stack: true, qty: 2, unit: 'flask', use: 'consumable', holder: { entity: 'pc' }, marks: [], for_quests: [], source: { how: 'bought' } } } };

test('patch 6 (19, 20, 21): a rope he holds makes the climb one step easier and stays his; lamp oil is used up when he uses it; a tool he does not hold is no help and no roll', async () => {
    await scores({ moderate: SURE }, async () => {
        const { g } = await tower([STAIRS, feature('barred cellar hatch', 'obstacle', { stat: 'STR', difficulty: 'moderate' }, 2)]);
        inject(g, [ROPE, OIL]);
        const stairs = featNamed(g.state(), /stairs/);
        const hatch = featNamed(g.state(), /hatch/);
        await say(g, '*I tie my rope to the beam and climb up*', attempt(stairs.id, 'pass', { stat: 'STR', tool: 'obj.rope' }));
        const c = checksOf(lastRec(g))[0];
        assert.equal(c.difficulty, 'moderate', 'hard, one step easier with the rope');
        assert.match(outcome(g).actions.join('\n'), /With coil of rope \(it stays his\): one step easier/);
        assert.equal(g.state().objects['obj.rope'].holder.entity, 'pc');
        await g.reply('He climbs the rope.', { expected: {}, deltas: [] });
        await say(g, '*I pour lamp oil on the rusted hinges and force the hatch*', attempt(hatch.id, 'disable', { stat: 'STR', tool: 'obj.oil' }));
        assert.equal(g.state().objects['obj.oil'].qty, 1, 'one flask used up, one left');
        await g.reply('The hinges give.', { expected: {}, deltas: [] });
        const plan = parsePlan(JSON.stringify({ commands: [{ seq: 1, ...attempt(hatch.id, 'pass', { tool: 'obj.lantern', quote: 'with my lantern' }) }] }), content.commandVocab,
            { catalog: buildCatalog(g.state(), content, { c: true }), opponents: [], contentSkills: new Set(), currency: content.rules.currency }, 'with my lantern');
        assert.match(plan.errors.join('\n'), /tool must be the id of a thing Alaric holds/);
    });
});

test('patch 6 (22, 23, 24): a known skill on a barrier is the engine\'s check: MP once, the barrier made harmless for good; the same skill again is nothing to do, nothing spent', async () => {
    await scores({ moderate: SURE }, async () => {
        const { g } = await tower([feature('rotten wooden barrier', 'obstacle', { difficulty: 'moderate' })]);
        const bar = featNamed(g.state(), /barrier/);
        const mp0 = g.state().entities.pc.sheet.mp;
        await say(g, '*I burn through the rotten barrier with Flame Lance*', { type: 'ability_world', skill: 'mage.flame_lance', target: bar.id, target_words: 'the rotten barrier', goal: 'burn through', quote: 'I burn through the rotten barrier with Flame Lance' });
        const o = outcome(g);
        assert.equal(o.kind, 'ability_world');
        assert.match(o.feature.text, /INT \d+ vs moderate .* SUCCESS/);
        assert.equal(o.check_die, undefined, 'no die for the story to judge with');
        let s = g.state();
        const spent = mp0 - s.entities.pc.sheet.mp;
        assert.ok(spent > 0);
        assert.equal(s.features[bar.id].status, 'disabled');
        await g.reply('The barrier burns away.', { expected: {}, deltas: [] });
        await say(g, '*I Flame Lance the barrier again*', { type: 'ability_world', skill: 'mage.flame_lance', target: bar.id, target_words: 'the barrier', goal: null, quote: 'I Flame Lance the barrier again' });
        s = g.state();
        assert.equal(mp0 - s.entities.pc.sheet.mp, spent, 'nothing spent twice');
        assert.match(outcome(g).text || JSON.stringify(outcome(g)), /harmless already/);
    });
});

test('patch 6 (25): two plausible ways past the same kind of obstacle both work: climbing one stair, burning another\'s barricade; neither way is the "one solution"', async () => {
    await scores({ hard: SURE, moderate: SURE }, async () => {
        const { g } = await tower([STAIRS, feature('barricaded side door', 'obstacle', { difficulty: 'moderate' }, 2)]);
        const stairs = featNamed(g.state(), /stairs/);
        const door = featNamed(g.state(), /door/);
        await say(g, '*I scramble up the broken stairs*', attempt(stairs.id, 'pass', { stat: 'AGI', approach: 'scramble up' }));
        await g.reply('Up.', { expected: {}, deltas: [] });
        await say(g, '*I burn the barricade on the side door with Flame Lance*', { type: 'ability_world', skill: 'mage.flame_lance', target: door.id, target_words: 'the barricade on the side door', goal: 'burn it', quote: 'I burn the barricade on the side door with Flame Lance' });
        await g.reply('It burns.', { expected: {}, deltas: [] });
        const s = g.state();
        assert.deepEqual([s.features[stairs.id].status, s.features[door.id].status], ['passed', 'disabled']);
    });
});

test('patch 6 (10): a way that plainly cannot work gets no roll and costs nothing; a trivial one succeeds without one', async () => {
    const { g } = await tower([feature('gorge behind the tower', 'obstacle', { difficulty: 'very_hard' }), feature('low fence', 'obstacle', { difficulty: 'trivial' }, 2)]);
    const gorge = featNamed(g.state(), /gorge/);
    const fence = featNamed(g.state(), /fence/);
    await say(g, '*I jump across the gorge*', attempt(gorge.id, 'pass', { stat: 'AGI', possible: false }));
    assert.match(outcome(g).actions.join('\n'), /CANNOT — "I jump across the gorge" cannot work on gorge behind the tower as it is: no roll/);
    assert.deepEqual(checksOf(lastRec(g)), []);
    await g.reply('He looks at the gorge and thinks better of it.', { expected: {}, deltas: [] });
    await say(g, '*I step over the low fence*', attempt(fence.id, 'pass'));
    assert.match(outcome(g).actions.join('\n'), /GETS PAST — low fence .*trivial: no roll/);
    assert.deepEqual(checksOf(lastRec(g)), []);
});

// ------------------------------------------------------------------------------------------------ D. creatures (26-30)
test('patch 6 (26, 27, 28): wolf tracks are a thread, no wolf; the wolf the story later shows is one creature, the same one with its HP when named again', async () => {
    const { g } = await tower();
    await say(g, '*I look around*');
    await g.reply('Fresh wolf tracks in the dust, and gnawed bones.', { expected: {}, deltas: [{ seq: 1, type: 'thread', id: null, text: 'Fresh wolf tracks and gnawed bones in the watchtower', kind: 'sign', status: 'open', resolution: null }] });
    let s = g.state();
    assert.ok(!Object.values(s.entities).some((e) => e.kind === 'creature'), 'tracks are no wolf');
    await say(g, '*I wait and watch*');
    await g.reply('A grey wolf slinks in from the passage.', { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'wolf', species: 'wolf', anchor: 'wolf', desc: ['grey'], count: 1, present: true, band: 'MEDIUM', stronger: null, threat: null, more: null }] });
    s = g.state();
    const wolf = Object.values(s.entities).find((e) => e.kind === 'creature');
    inject(g, [{ t: 'entity.updated', d: { id: wolf.id, set: { profile: { ...wolf.profile, hp: 5 } } } }]);
    await say(g, '*I wait and watch*');
    await g.reply('The wolf circles.', { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'wolf', species: 'wolf', anchor: 'wolf', desc: ['grey'], count: 1, present: true, band: 'SHORT', stronger: null, threat: null, more: false }] });
    s = g.state();
    assert.equal(Object.values(s.entities).filter((e) => e.kind === 'creature').length, 1);
    assert.equal(s.entities[wolf.id].profile.hp, 5);
});

test('patch 6 (29): the Patch 5 edge: one wolf left in the cave, he comes back, the story shows "another" wolf (more:true): a new wolf, and the one he left is not it; without more:true it is that wolf', async () => {
    const cave = async () => {
        const g = await campaign();
        await say(g, '*I climb into the cave*', { type: 'go', to: { new: 'the cave' }, quote: 'I climb into the cave' });
        await g.reply('A single wolf growls in the cave.', { expected: { 1: { arrived: true, at: { new: { name: 'Wolf cave', kind: 'site', parent: 'realm.duskreach' } }, with: null } }, deltas: [{ seq: 1, type: 'creature.new', ref: 'cave wolf', species: 'wolf', anchor: 'wolf', desc: ['grey'], count: 1, present: true, band: 'MEDIUM', stronger: null, threat: null, more: null }] });
        const s = g.state();
        const at = s.scene.at;
        const first = Object.values(s.entities).find((e) => e.kind === 'creature').id;
        await say(g, '*I back out to the road*', { type: 'go', to: 'realm.duskreach', quote: 'I back out to the road' });
        await g.reply('Out.', { expected: { 1: { arrived: true, at: 'realm.duskreach', with: null } }, deltas: [] });
        await say(g, '*I go back into the cave*', { type: 'go', to: at, quote: 'I go back into the cave' });
        return { g, at, first };
    };
    let { g, at, first } = await cave();
    await g.reply('A second, bigger-eared wolf is in the cave now, another one.', { expected: { 1: { arrived: true, at, with: null } }, deltas: [{ seq: 1, type: 'creature.new', ref: 'other wolf', species: 'wolf', anchor: 'wolf', desc: ['grey'], count: 1, present: true, band: 'MEDIUM', stronger: null, threat: null, more: true }] });
    let s = g.state();
    const wolves = Object.values(s.entities).filter((e) => e.kind === 'creature');
    assert.equal(wolves.length, 2, 'a new wolf');
    assert.ok(!s.scene.present.includes(first), 'the one he left is not made the newcomer');
    ({ g, at, first } = await cave());
    await g.reply('The wolf is still there.', { expected: { 1: { arrived: true, at, with: null } }, deltas: [{ seq: 1, type: 'creature.new', ref: 'wolf', species: 'wolf', anchor: 'wolf', desc: ['grey'], count: 1, present: true, band: 'MEDIUM', stronger: null, threat: null, more: null }] });
    s = g.state();
    assert.deepEqual(s.scene.present.filter((id) => s.entities[id]?.kind === 'creature'), [first]);
});

// ------------------------------------------------------------------------------------------------ E. integration (31-37)
test('patch 6 (31, 33): a stopover at the watchtower on the way to Blackgate keeps the goal; exploring there changes nothing of it; "I continue" goes on', async () => {
    const g = await campaign();
    await say(g, '*I set out for Blackgate*', { type: 'go', to: 'loc.blackgate', quote: 'I set out for Blackgate' });
    await g.reply('Hours on the road.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 240 }] });
    await say(g, '*I climb into the old watchtower by the road*', { type: 'go', to: { new: 'the old watchtower' }, quote: 'I climb into the old watchtower by the road' });
    await g.reply('The old watchtower.', { expected: { 1: { arrived: true, at: { new: { name: 'Old watchtower', kind: 'site', parent: 'realm.duskreach' } }, with: null } }, deltas: [STAIRS] });
    await say(g, '*I examine the stairs*', attempt(featNamed(g.state(), /stairs/).id, 'examine'));
    assert.match(outcome(g).actions.join('\n'), /EXAMINES — collapsed wooden stairs .*no roll/);
    await g.reply('Rotten treads, a gap of two steps.', { expected: {}, deltas: [] });
    const goal = Object.values(g.state().intents).find((i) => i.place === 'loc.blackgate');
    assert.equal(goal.status, 'active');
    await say(g, '*I continue my journey*', { type: 'journey.continue', quote: 'I continue my journey' });
    assert.equal(outcome(g).auth.go.to, 'loc.blackgate');
});

test('patch 6 (32, 35, 36): what a search turns up is one real object by the existing rules, never again for the same search; no XP, no quest step; a thing merely seen is not his', async () => {
    await scores({ moderate: SURE }, async () => {
        const { g } = await tower([feature('hidden niche behind a loose stone', 'obstacle', { hidden: true })]);
        const before = g.state();
        const ring = { seq: 1, type: 'object.new', name: 'silver ring', kind: 'item', qty: 1, unit: null, holder: 'pc', for_quest: null };
        const rings = (s) => Object.values(s.objects).filter((o) => o.name === 'silver ring' && o.holder?.entity === 'pc').length;
        await say(g, '*I search the walls for hidden niches*', { type: 'activity', kind: 'search', what: 'the walls for hidden niches', minutes: null, until: null, quote: 'I search the walls for hidden niches' });
        await g.reply('Behind the stone, a niche; inside, a silver ring, which he pockets.', { expected: { 1: { minutes: 20, done: true } }, deltas: [ring] });
        assert.equal(rings(g.state()), 1, 'his search found it (GATHER): one canonical object');
        await say(g, '*I search the walls for hidden niches again*', { type: 'activity', kind: 'search', what: 'the walls for hidden niches', minutes: null, until: null, quote: 'I search the walls for hidden niches' });
        const r = await g.reply('Another silver ring in the niche, which he pockets.', { expected: {}, deltas: [ring] });
        assert.equal(rings(g.state()), 1, 'the same search again finds no second ring');
        assert.ok(rejectedRules(r).length);
        // a thing he only looks at is not his
        await say(g, '*I look around*');
        await g.reply('A brass key lies on the windowsill; he pockets it.', { expected: {}, deltas: [{ ...ring, name: 'brass key' }] });
        const s = g.state();
        assert.ok(!Object.values(s.objects).some((o) => o.name === 'brass key' && o.holder?.entity === 'pc'), 'nothing in his pack he did not take');
        assert.equal(s.entities.pc.sheet.xp, before.entities.pc.sheet.xp, 'no XP for searching or finding');
        assert.equal(Object.values(s.quests).filter((q) => q.status === 'completed').length, Object.values(before.quests).filter((q) => q.status === 'completed').length);
    });
});

test('patch 6 (37): in a fight an attempt on a feature is not taken; the planner refuses an unknown feature id', async () => {
    const { g } = await tower([STAIRS]);
    const s = g.state();
    const plan = parsePlan(JSON.stringify({ commands: [{ seq: 1, ...attempt('feat.99', 'pass', { quote: 'climb' }) }] }), content.commandVocab,
        { catalog: buildCatalog(s, content, { c: true }), opponents: [], contentSkills: new Set(), currency: content.rules.currency }, 'climb');
    assert.match(plan.errors.join('\n'), /feature must be an id from FEATURES/);
    await say(g, '*I wait*');
    await g.reply('A wolf rushes him from the passage.', { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'wolf', species: 'wolf', anchor: 'wolf', desc: ['grey'], count: 1, present: true, band: 'SHORT', stronger: null, threat: true, more: null }, { seq: 2, type: 'hostile', by: ['wolf'] }] });
    assert.ok(g.state().encounter);
    const stairs = featNamed(g.state(), /stairs/);
    await say(g, '*I climb the stairs to get away*', attempt(stairs.id, 'pass', { stat: 'STR' }));
    assert.equal(g.state().features[stairs.id].status, 'active', 'not resolved in a fight');
});

// ------------------------------------------------------------------------------------------------ review of 32c7d2c
test('patch 6 review 1: a hidden trap at a place he sets off for does not spring when the story stops him on the way: no roll booked, no harm, the trap as it was; when he does get in, it springs, once', async () => {
    await scores({ moderate: NEVER }, async () => {
        const { g, at } = await tower([feature('tripwire at the doorway', 'hazard', { hidden: true, trigger: 'enter', stat: 'AGI', difficulty: 'moderate' })]);
        await say(g, '*I walk off down the road*', { type: 'go', to: 'loc.ashbridge', quote: 'I walk off down the road' });
        await g.reply('He walks back toward Ashbridge for an hour, then stops on the road.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [{ seq: 1, type: 'arrive', at: 'realm.duskreach', with: null, forced_by: null }, { seq: 2, type: 'time', minutes: 60 }] });
        const before = g.state();
        const wire = featNamed(before, /tripwire/);
        await say(g, '*I head back to the watchtower*', { type: 'go', to: at, quote: 'I head back to the watchtower' });
        await g.reply('Halfway back, a cart blocks the track; he waits by the roadside.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 30 }] });
        let s = g.state();
        assert.notEqual(s.scene.at, at);
        assert.equal(hp(s), hp(before), 'no harm without arriving');
        assert.deepEqual([s.features[wire.id].hidden, s.features[wire.id].status, s.features[wire.id].found], [true, 'active', null], 'the trap as it was');
        assert.ok(!g.chat.flatMap((m) => m.extra?.avereth?.events || []).some((e) => e.t === 'check.recorded' && e.d.feature === wire.id), 'no roll booked for it');
        // he gets in: it springs as he enters, once; a swipe of the reply books it again only in place of the old one
        await say(g, '*I go into the watchtower*', { type: 'go', to: at, quote: 'I go into the watchtower' });
        assert.match(outcome(g).extra.join('\n'), /IF HE GETS IN — tripwire at the doorway .*FAILURE/);
        const r = await g.reply('He steps through the doorway.', { expected: { 1: { arrived: true, at, with: null } }, deltas: [] });
        s = g.state();
        assert.equal(hp(s), hp(before) - content.rules.exploration.harm.moderate);
        assert.deepEqual([s.features[wire.id].hidden, s.features[wire.id].status], [false, 'disabled']);
        assert.equal(r.record.events.filter((e) => e.t === 'check.recorded' && e.d.feature === wire.id).length, 1);
        assert.equal(foldChat(g.chat).state.entities.pc.sheet.hp, hp(before) - content.rules.exploration.harm.moderate, 'the fold books it once');
    });
});

test('patch 6 review 2: a hidden tripwire elsewhere in the room does not spring because he opens the chest; one that is part of the chest does', async () => {
    await scores({ moderate: NEVER }, async () => {
        const { g } = await tower([
            feature('locked iron chest', 'obstacle', { stat: 'INT', difficulty: 'moderate' }),
            feature('tripwire by the far window', 'hazard', { hidden: true, trigger: 'cross', stat: 'AGI' }, 2),
            feature('loose stone over the hearth', 'hazard', { hidden: true, trigger: 'touch', stat: 'AGI' }, 3),
            feature('heap of rubble', 'obstacle', { stat: 'STR' }, 4),
        ]);
        const chest = featNamed(g.state(), /chest/);
        const wire = featNamed(g.state(), /tripwire/);
        const stone = featNamed(g.state(), /loose stone/);
        const rubble = featNamed(g.state(), /rubble/);
        const before = hp(g.state());
        await say(g, '*I pick the lock of the chest*', attempt(chest.id, 'disable', { stat: 'INT' }));
        assert.doesNotMatch(outcome(g).actions.join('\n'), /HIDDEN DANGER/, 'nothing elsewhere in the room springs');
        await g.reply('The lock resists.', { expected: {}, deltas: [] });
        await say(g, '*I climb over the rubble*', attempt(rubble.id, 'pass', { stat: 'STR' }));
        assert.doesNotMatch(outcome(g).actions.join('\n'), /HIDDEN DANGER/);
        await g.reply('The rubble shifts under him.', { expected: {}, deltas: [] });
        let s = g.state();
        for (const f of [wire, stone]) assert.deepEqual([s.features[f.id].hidden, s.features[f.id].status, s.features[f.id].found], [true, 'active', null], f.name);
        assert.equal(hp(s), before - 0, 'no harm from either (the chest and the rubble do not hurt)');
        // a needle that is part of the chest's lock (on: the chest) springs when he handles the chest
        await say(g, '*I look closer*');
        await g.reply('He does not see the needle hidden in the second chest\'s lock.', { expected: {}, deltas: [
            feature('banded oak chest', 'obstacle', { stat: 'INT' }),
            { ...feature('poison needle in the lock', 'hazard', { hidden: true, trigger: 'touch', stat: 'AGI' }, 2), on: 'banded oak chest' },
        ] });
        s = g.state();
        const oak = featNamed(s, /oak chest/);
        const needle = featNamed(s, /needle/);
        assert.equal(needle.on, oak.id);
        await say(g, '*I try to open the oak chest*', attempt(oak.id, 'disable', { stat: 'INT' }));
        assert.match(outcome(g).actions.join('\n'), /HIDDEN DANGER — poison needle in the lock/);
        s = g.state();
        assert.deepEqual([s.features[needle.id].hidden, s.features[needle.id].status], [false, 'disabled']);
        assert.deepEqual([s.features[wire.id].hidden, s.features[wire.id].status], [true, 'active'], 'the tripwire still untouched');
    });
});

test('patch 6 review 3: looking a visible stair over is no change at the place: the same failed search for traps is still no new roll; a real change, another focus or a found thing still is', async () => {
    await scores({ moderate: NEVER }, async () => {
        const { g } = await tower([STAIRS, feature('loose flagstone', 'obstacle', { hidden: true }, 2)]);
        const search = (what) => ({ type: 'activity', kind: 'search', what, minutes: null, until: null, quote: `I search ${what}` });
        const stairs = featNamed(g.state(), /stairs/);
        await say(g, '*I search the floor for traps*', search('the floor for traps'));
        await g.reply('Nothing.', { expected: { 1: { minutes: 20, done: true } }, deltas: [] });
        await say(g, '*I examine the stairs*', attempt(stairs.id, 'examine'));
        await g.reply('Rotten treads.', { expected: {}, deltas: [] });
        await say(g, '*I fail to climb the stairs*', attempt(stairs.id, 'pass', { stat: 'STR' }));
        await g.reply('He slips back down.', { expected: {}, deltas: [] });
        await say(g, '*I search the floor for traps*', search('the floor for traps'));
        assert.match(outcome(g).actions.join('\n'), /SEARCHED ALREADY/, 'looking at or failing on the stairs changed nothing there');
        assert.deepEqual(checksOf(lastRec(g)), []);
        await g.reply('He has been over that floor.', { expected: {}, deltas: [] });
        // another focus is its own search
        await say(g, '*I search the ceiling for a hatch*', search('the ceiling for a hatch'));
        assert.equal(checksOf(lastRec(g)).length, 1);
        await g.reply('Nothing up there.', { expected: { 1: { minutes: 20, done: true } }, deltas: [] });
    });
    // a real change: a feature found (here by another search) makes the floor worth searching again
    await scores({ moderate: SURE }, async () => {
        const { g } = await tower([feature('loose flagstone', 'obstacle', { hidden: true })]);
        const search = (what) => ({ type: 'activity', kind: 'search', what, minutes: null, until: null, quote: `I search ${what}` });
        await scores({ moderate: NEVER }, async () => {
            await say(g, '*I search the floor for traps*', search('the floor for traps'));
            await g.reply('Nothing.', { expected: { 1: { minutes: 20, done: true } }, deltas: [] });
        });
        await say(g, '*I search the walls for loose stones*', search('the walls for loose stones'));
        await g.reply('A flagstone is loose.', { expected: { 1: { minutes: 20, done: true } }, deltas: [] });
        assert.equal(featNamed(g.state(), /flagstone/).hidden, false);
        await say(g, '*I search the floor for traps*', search('the floor for traps'));
        assert.equal(checksOf(lastRec(g)).length, 1, 'something there changed since');
    });
});
