// Prototype C (src/v4/planner.js, docs/PROTOTYPE_C.md): the known failure classes of A's free-text reading, each
// played through the product's host path (src/v4/runtime.js) the way SillyTavern plays it, with the planner's answer
// scripted. Every case shows A's reading first (setting off) where A failed, then the planner path: the engine gets
// the right input, the validator blocks the dangerous wrong answers, nothing of the message disappears silently.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../helpers.js';
import { Chat4 } from './harness.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec, turnBlock } from '../../src/host.js';
import { worldPanel } from '../../src/display.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { planContext, withContentSkills, plannerRequest, parsePlan, mapPlan, plannerSystem } from '../../src/v4/planner.js';

const content = await loadContent();
const A = 'mon.barkscorpion_1';
const B = 'mon.barkscorpion_2';
const C = 'mon.barkscorpion_3';

/** Chat4 with the planner: the planner's answers are queued per message (first answer, then the repair's). */
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

    last() {
        return rec(this.chat.findLast((m) => m.is_user));
    }

    planCalls() {
        return this.calls.filter((c) => c.purpose.startsWith('plan')).length;
    }

    /** The engine block the narrator gets for the last player message (src/host.js turnBlock, as SillyTavern injects it). */
    narratorBlock() {
        const u = this.chat.findLastIndex((m) => m.is_user);
        return turnBlock(this.chat, u, this.content).context.text;
    }
}

const cmds = (...commands) => ({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) });
const outcomeOf = (r) => r?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome || null;
const pcSteps = (r) => (outcomeOf(r)?.records || []).filter((x) => x.actor === 'pc');

/** A Mage (Flame Lance, Arcane Burst) in a fight with Barkscorpion A, B and C; set up with the planner off. */
async function fight(band = 'SHORT') {
    const g = new ChatC(content);
    g.planner = false;
    await g.player('Mage');
    await g.player('Flame Lance and Arcane Burst');
    await g.player('I climb down into the old burrow.', [{ seq: 1, type: 'go', to: { new: 'the old burrow' }, quote: 'I climb down into the old burrow' }]);
    await g.reply('Three barkscorpions skitter out of the dark and rush at Alaric.', { expected: {}, deltas: [
        { seq: 1, type: 'creature.new', ref: 'barkscorpion', species: 'barkscorpion', anchor: 'arthropod', desc: ['bark-plated'], count: 3, present: true, band, stronger: null },
        { seq: 2, type: 'hostile', by: ['barkscorpion'] },
    ] });
    assert.ok(g.state().encounter, 'the fight is on');
    g.planner = true;
    return g;
}

/** The same Mage at the roadside outside Redmarch, no fight. */
async function story() {
    const g = new ChatC(content);
    g.planner = false;
    await g.player('Mage');
    await g.player('Flame Lance and Arcane Burst');
    g.planner = true;
    return g;
}

// ------------------------------------------------------------------------------------------------ the setting
test('planner off: A unchanged, no planner call; planner on: one call per free-text message, none for a # command', async () => {
    const g = await fight();
    g.planner = false;
    await g.say('I Flame Lance Barkscorpion C');
    assert.equal(g.planCalls(), 0);
    assert.equal(g.last().plan, undefined);
    g.planner = true;
    await g.say('#help');
    assert.equal(g.planCalls(), 0, 'a # command is a control channel');
});

// ------------------------------------------------------------------------------------------------ 1 alias / typo
test('"I Fire Lance Barkscorpion B": A books a silent Basic Attack; the planner path books Flame Lance on B', async () => {
    const a = await fight();
    a.planner = false;
    await a.say('I Fire Lance Barkscorpion B');
    assert.equal(pcSteps(a.last())[0].skill, 'mage.basic_attack', 'A as measured: the alias became Basic Attack');

    const g = await fight();
    const mp = g.state().entities.pc.sheet.mp;
    await g.say('I Fire Lance Barkscorpion B', cmds({ type: 'use_skill', skill: 'mage.flame_lance', target: B, quote: 'I Fire Lance Barkscorpion B' }));
    const step = pcSteps(g.last())[0];
    assert.equal(step.skill, 'mage.flame_lance');
    assert.equal(step.target, B);
    assert.equal(g.state().entities.pc.sheet.mp, mp - 16, 'the engine booked the cost');
    assert.equal(g.last().plan.version, 'plan-c0.1');
});

test('the safety catch: a planner that writes skill:null (Basic Attack) for "Fire Lance" or a typo gets a question, never a silent Basic Attack', async () => {
    for (const text of ['I Fire Lance Barkscorpion B', 'I flame lnace Barkscorpion B', 'I blast Barkscorpion B', 'I use my fire spear on Barkscorpion B']) {
        const g = await fight();
        const mp = g.state().entities.pc.sheet.mp;
        const r = await g.say(text, cmds({ type: 'use_skill', skill: null, target: B, quote: text }));
        assert.equal(r.action, 'panels', text);
        assert.match(r.panels[0], /CLARIFY/);
        assert.match(r.panels[0], /Options: Basic Attack · Flame Lance · Arcane Burst\n/, 'his skills in sheet order: the question chooses none');
        assert.deepEqual(g.last().events, [], `${text}: nothing booked`);
        assert.ok(g.last().plan.hint, text);
        assert.equal(g.state().entities.pc.sheet.mp, mp);
    }
    // the Basic Attack id without the words is the same as null; with them it is Basic Attack
    const g = await fight();
    await g.say('I Fire Lance Barkscorpion B', cmds({ type: 'use_skill', skill: 'mage.basic_attack', target: B, quote: 'I Fire Lance Barkscorpion B' }));
    assert.match(g.chat.at(-1).mes, /CLARIFY/);
    const h = await fight();
    await h.say('I basic attack Barkscorpion B', cmds({ type: 'use_skill', skill: 'mage.basic_attack', target: B, quote: 'I basic attack Barkscorpion B' }));
    assert.equal(pcSteps(h.last())[0].skill, 'mage.basic_attack');
    // an attack that names no skill and hints at none is Basic Attack
    const k = await fight();
    await k.say('I hit Barkscorpion A with my staff', cmds({ type: 'use_skill', skill: null, target: A, quote: 'I hit Barkscorpion A with my staff' }));
    assert.equal(pcSteps(k.last())[0].skill, 'mage.basic_attack');
    assert.equal(pcSteps(k.last())[0].target, A);
});

// ------------------------------------------------------------------------------------------------ 2 free target references
test('free target references: the planner resolves "the wounded one"; a target that is not here is refused, never replaced', async () => {
    const g = await fight();
    await g.say('I hit Barkscorpion A with my staff', cmds({ type: 'use_skill', skill: null, target: A, quote: 'I hit Barkscorpion A with my staff' }));
    await g.reply('The staff cracks against Barkscorpion A.');
    // what the planner gets to resolve "the wounded one" with: the engine's own HP words per opponent
    const s = g.state();
    const user = plannerRequest(content.commandVocab, withContentSkills(planContext(s, content, buildCatalog(s, content)), content), 'I Flame Lance the wounded one').user;
    assert.match(user, /- mon\.barkscorpion_1: Barkscorpion A — badly wounded · ENGAGED/);
    assert.match(user, /- mon\.barkscorpion_2: Barkscorpion B — unhurt · ENGAGED/);
    await g.say('I Flame Lance the wounded one', cmds({ type: 'use_skill', skill: 'mage.flame_lance', target: A, quote: 'I Flame Lance the wounded one' }));
    assert.equal(pcSteps(g.last())[0].skill, 'mage.flame_lance');
    assert.equal(pcSteps(g.last())[0].target, A, 'the planner\'s id goes to the engine unchanged');
    // an id that is no one here: the validator rejects it, the one repair brings the right one
    const h = await fight();
    await h.say('I Flame Lance the one by the wall',
        cmds({ type: 'use_skill', skill: 'mage.flame_lance', target: 'mon.wolf_9', quote: 'I Flame Lance the one by the wall' }),
        cmds({ type: 'use_skill', skill: 'mage.flame_lance', target: C, quote: 'I Flame Lance the one by the wall' }));
    assert.equal(h.last().plan.repaired, true);
    assert.equal(pcSteps(h.last())[0].target, C);
    // {"new"}: someone who is not in the fight; the engine says so and books nothing
    const k = await fight();
    const r = await k.say('I Flame Lance the troll', cmds({ type: 'use_skill', skill: 'mage.flame_lance', target: { new: 'the troll' }, quote: 'I Flame Lance the troll' }));
    assert.equal(r.action, 'panels');
    assert.match(r.panels[0], /"the troll" is not a target in this fight/);
    // the planner asks: its question, the options by name, nothing spent; never A's attack question (it names a skill)
    const q = await fight();
    const qmp = q.state().entities.pc.sheet.mp;
    const ask = await q.say('I attack', cmds({ type: 'clarify', about: 'target', question: 'Which one?', options: [A, B, C] }));
    assert.equal(ask.action, 'panels');
    assert.match(ask.panels[0], /^\[SYSTEM \/\/ CLARIFY\]\nWhich one\?\nOptions: Barkscorpion A · Barkscorpion B · Barkscorpion C\n/);
    assert.doesNotMatch(ask.panels[0], /Basic Attack|TARGET NEEDED/);
    assert.deepEqual(q.last().events, []);
    assert.equal(q.state().entities.pc.sheet.mp, qmp);
});

test('a question back to the player names no skill and no attack: "which guard?" stays a question about a person', () => {
    const ctx = {
        fight: false, known: [], basic: 'mage.basic_attack', cls: 'mage', skills: [], opponents: [],
        catalog: { present: [{ id: 'npc.g1', handle: 'Gate Guard A', label: 'gate guard' }, { id: 'npc.g2', handle: 'Gate Guard B', label: 'gate guard' }], objects: [] },
    };
    const m = mapPlan([{ type: 'clarify', about: 'target', question: 'Which guard do you ask?', options: ['npc.g1', 'npc.g2'] }], ctx, content, 'I ask the guard about the road', { scene: { present: [] }, entities: {} });
    assert.equal(m.route, 'panel');
    assert.match(m.panel, /Which guard do you ask\?\nOptions: Gate Guard A · Gate Guard B\n/);
    assert.doesNotMatch(m.panel, /Attack|TARGET NEEDED/);
});

test('a reference of his own is never overwritten by the only foe (D2 only when he names no target at all)', () => {
    const s = { encounter: null, pending_combat: [], scene: { present: [] }, entities: {} };
    const ctx = {
        fight: true, known: ['mage.flame_lance'], basic: 'mage.basic_attack', cls: 'mage', skills: [{ id: 'mage.flame_lance', name: 'Flame Lance' }],
        opponents: [{ id: A, label: 'Barkscorpion A', engaged: true }], catalog: { present: [], objects: [] },
    };
    const take = (quote, target = null) => mapPlan([{ type: 'use_skill', skill: 'mage.flame_lance', target, quote }], ctx, content, quote, s);
    assert.deepEqual(take('I Flame Lance the other one').intent, { kind: 'no_target', skill: 'mage.flame_lance', ref: 'the other one' });
    assert.equal(take('I Flame Lance it').intent.target, A, 'a pronoun with one foe: that foe');
    assert.equal(take('I Flame Lance').intent.target, A, 'no reference at all: the only foe');
});

// ------------------------------------------------------------------------------------------------ 3 search vs travel
test('search vs travel: in a fight both stay what he meant and are reported as not possible; outside they go to the V4 handlers', async () => {
    const g = await fight();
    const mp = g.state().entities.pc.sheet.mp;
    await g.say('I look for a way out', cmds({ type: 'activity', kind: 'search', what: 'a way out', minutes: null, until: null, quote: 'I look for a way out' }));
    const o = outcomeOf(g.last());
    assert.deepEqual(pcSteps(g.last()), [], 'no action resolved: the fight waits');
    assert.match(o.plan_notes[0], /searching is not possible during a fight/);
    assert.equal(g.state().entities.pc.sheet.mp, mp);
    assert.match(g.narratorBlock(), /- NOT TAKEN THIS TURN \(it does not happen; do not narrate it as done\): searching is not possible during a fight/);
    // travel in a fight is not turned into flight; getting away is
    const h = await fight();
    await h.say('I walk back to Redmarch', cmds({ type: 'go', to: 'loc.redmarch', quote: 'I walk back to Redmarch' }));
    assert.deepEqual(pcSteps(h.last()), []);
    assert.match(outcomeOf(h.last()).plan_notes[0], /travel is not possible during a fight; to get away, flee/);
    const k = await fight();
    await k.say('I run for the exit', cmds({ type: 'flee', quote: 'I run for the exit' }));
    assert.equal(pcSteps(k.last())[0].kind, 'flee');
    // outside a fight: search and go are the V4 commands, resolved by A's handlers
    const s = await story();
    await s.say('I search the verge for tracks', cmds({ type: 'activity', kind: 'search', what: 'tracks', minutes: null, until: null, quote: 'I search the verge for tracks' }));
    assert.equal(s.last().route, 'v4');
    assert.equal(outcomeOf(s.last()).resolutions[0].type, 'activity');
    const t = await story();
    await t.say('I walk back to Redmarch', cmds({ type: 'go', to: 'loc.redmarch', quote: 'I walk back to Redmarch' }));
    assert.equal(outcomeOf(t.last()).resolutions[0].type, 'go');
});

// ------------------------------------------------------------------------------------------------ 4 skills on things
test('"I Flame Lance the cracked floor": A asks which scorpion; the planner path books a world use (cost, check die, no damage)', async () => {
    const a = await fight();
    a.planner = false;
    await a.say('I Flame Lance the cracked floor');
    assert.match(a.chat.at(-1).mes, /which target/i, 'A as measured: a target question about the scorpions');

    const g = await fight();
    const before = g.state();
    const hp = Object.fromEntries([A, B, C].map((id) => [id, before.encounter.combatants[id].current.hp]));
    await g.say('I Flame Lance the cracked floor to drop them into the hollow', cmds({ type: 'ability_world', skill: 'mage.flame_lance', target: { new: 'the cracked floor' }, target_words: 'the cracked floor', goal: 'drop them into the hollow', quote: 'I Flame Lance the cracked floor to drop them into the hollow' }));
    const step = pcSteps(g.last())[0];
    assert.equal(step.kind, 'ability_world');
    assert.equal(step.target_text, 'the cracked floor');
    assert.equal(step.goal, 'drop them into the hollow', 'his whole aim is kept');
    assert.ok(step.check_die >= 1 && step.check_die <= 100);
    const after = g.state();
    assert.equal(after.entities.pc.sheet.mp, before.entities.pc.sheet.mp - 16);
    for (const id of [A, B, C]) assert.ok(after.encounter.combatants[id].current.hp <= hp[id], 'no damage from the world use itself');
    assert.ok(!outcomeOf(g.last()).records.some((r) => r.actor === 'pc' && r.strikes), 'no strike of his');
    // the target words must be his own words for the thing
    const h = await fight();
    await h.say('I Flame Lance the ceiling above the hole',
        cmds({ type: 'ability_world', skill: 'mage.flame_lance', target: { new: 'the hole' }, target_words: 'the pit', goal: null, quote: 'I Flame Lance the ceiling above the hole' }),
        cmds({ type: 'ability_world', skill: 'mage.flame_lance', target: { new: 'the ceiling' }, target_words: 'the ceiling', goal: null, quote: 'I Flame Lance the ceiling above the hole' }));
    assert.equal(h.last().plan.repaired, true);
    assert.equal(pcSteps(h.last())[0].target_text, 'the ceiling');
    // a creature is no thing
    const k = await fight();
    const bad = await k.say('I Flame Lance Barkscorpion B',
        cmds({ type: 'ability_world', skill: 'mage.flame_lance', target: B, target_words: 'Barkscorpion B', goal: null, quote: 'I Flame Lance Barkscorpion B' }),
        cmds({ type: 'ability_world', skill: 'mage.flame_lance', target: B, target_words: 'Barkscorpion B', goal: null, quote: 'I Flame Lance Barkscorpion B' }));
    assert.equal(bad.action, 'abort', 'invalid twice: the planner failed, nothing was booked');
    assert.equal(k.last().interp.failed, true);
});

test('a skill on a thing outside a fight: the cost is booked, a check die drawn, no fight starts', async () => {
    const g = await story();
    const mp = g.state().entities.pc.sheet.mp;
    await g.say('I burn the dead stump with Flame Lance to clear the path', cmds({ type: 'ability_world', skill: 'mage.flame_lance', target: { new: 'the dead stump' }, target_words: 'the dead stump', goal: 'clear the path', quote: 'I burn the dead stump with Flame Lance to clear the path' }));
    const o = outcomeOf(g.last());
    assert.equal(o.kind, 'ability_world');
    assert.equal(o.cost.amount, 16);
    assert.ok(o.check_die >= 1);
    assert.equal(g.state().entities.pc.sheet.mp, mp - 16);
    assert.equal(g.state().encounter, null);
    // the narrator gets the attempt, the cost and the die, and no outcome; the player sees it in the System block
    assert.match(g.narratorBlock(), /Alaric uses Flame Lance on the dead stump \(his aim: clear the path\) \[MP 72->56\]\. The engine booked the cost; it resolves no effect on any creature/);
    assert.match(worldPanel(g.state(), content), /Alaric: Flame Lance on the dead stump · MP 72 - 16 = 56 — check die d100 \d+/);
    // a Ranger's shot at a thing: stamina and an arrow from the quiver, as in a fight
    const r = new ChatC(content);
    r.planner = false;
    await r.player('Ranger');
    await r.player('Aimed Shot and Power Shot');
    r.planner = true;
    const sheet = () => r.state().entities.pc.sheet;
    const [sta, arrows] = [sheet().sta, sheet().inventory.standard_arrow];
    await r.say('I shoot through the rope with Aimed Shot to drop the sign', cmds({ type: 'ability_world', skill: 'ranger.aimed_shot', target: { new: 'the rope' }, target_words: 'the rope', goal: 'drop the sign', quote: 'I shoot through the rope with Aimed Shot to drop the sign' }));
    assert.equal(outcomeOf(r.last()).kind, 'ability_world');
    assert.equal(sheet().sta, sta - 7);
    assert.equal(sheet().inventory.standard_arrow, arrows - 1);
    assert.equal(r.state().encounter, null);
});

// ------------------------------------------------------------------------------------------------ 5 unknown skills
test('unknown skills are refused, never replaced: an invented name, a skill of the class he did not learn, a made-up id', async () => {
    const g = await fight();
    const mp = g.state().entities.pc.sheet.mp;
    await g.say('I cast Fireball at Barkscorpion B', cmds({ type: 'use_skill', skill: { new: 'Fireball' }, target: B, quote: 'I cast Fireball at Barkscorpion B' }));
    assert.match(outcomeOf(g.last()).note, /does not know Fireball/);
    assert.deepEqual(pcSteps(g.last()), []);
    assert.equal(g.state().entities.pc.sheet.mp, mp);
    const h = await fight();
    await h.say('I cast Arcane Bolt at Barkscorpion B', cmds({ type: 'use_skill', skill: 'mage.arcane_bolt', target: B, quote: 'I cast Arcane Bolt at Barkscorpion B' }));
    assert.match(outcomeOf(h.last()).note, /does not know Arcane Bolt/);
    const k = await fight();
    const r = await k.say('I cast Fireball at Barkscorpion B',
        cmds({ type: 'use_skill', skill: 'mage.fireball', target: B, quote: 'I cast Fireball at Barkscorpion B' }),
        cmds({ type: 'use_skill', skill: 'mage.fireball', target: B, quote: 'I cast Fireball at Barkscorpion B' }));
    assert.equal(r.action, 'abort');
    assert.match(k.calls.filter((c) => c.purpose === 'plan_repair')[0].messages.at(-1).content, /skill must be an id from KNOWN SKILLS/);
});

// ------------------------------------------------------------------------------------------------ 6 questions, no action
test('a question or a message without an action of his: nothing is resolved; a question the planner misread is dropped by the agency guard', async () => {
    const g = await fight();
    const mp = g.state().entities.pc.sheet.mp;
    await g.say('Would Flame Lance even hurt them?', cmds());
    assert.deepEqual(pcSteps(g.last()), []);
    assert.equal(g.state().entities.pc.sheet.mp, mp);
    const h = await fight();
    await h.say('Can I Flame Lance Barkscorpion B from here?', cmds({ type: 'use_skill', skill: 'mage.flame_lance', target: B, quote: 'Can I Flame Lance Barkscorpion B from here?' }));
    assert.deepEqual(pcSteps(h.last()), []);
    assert.equal(h.last().plan.dropped[0].rule, 'question');
    assert.equal(h.state().entities.pc.sheet.mp, mp);
    const k = await story();
    await k.say('Where is the inn?', cmds());
    assert.equal(k.last().route, 'v4');
    assert.match(outcomeOf(k.last()).actions[0], /NOTHING TO BOOK/);
});

// ------------------------------------------------------------------------------------------------ 7 several actions
test('several actions: a step and a skill in one turn; a second main action is reported as not taken, never silently dropped', async () => {
    const g = await fight();
    await g.say('I step back from Barkscorpion A and Flame Lance Barkscorpion C',
        cmds({ type: 'move', dir: 'away', target: A, quote: 'I step back from Barkscorpion A' }, { type: 'use_skill', skill: 'mage.flame_lance', target: C, quote: 'Flame Lance Barkscorpion C' }));
    const step = pcSteps(g.last())[0];
    assert.equal(step.skill, 'mage.flame_lance');
    assert.equal(step.target, C);
    assert.ok(step.after_move, 'A\'s engine takes the step back after the attack (engine migration E11, documented)');

    const h = await fight();
    await h.say('I Flame Lance Barkscorpion A, then burn the rope ladder with a second Flame Lance',
        cmds({ type: 'use_skill', skill: 'mage.flame_lance', target: A, quote: 'I Flame Lance Barkscorpion A' },
            { type: 'ability_world', skill: 'mage.flame_lance', target: { new: 'the rope ladder' }, target_words: 'the rope ladder', goal: null, quote: 'then burn the rope ladder with a second Flame Lance' }));
    const o = outcomeOf(h.last());
    assert.equal(pcSteps(h.last()).length, 1);
    assert.equal(pcSteps(h.last())[0].target, A);
    assert.match(o.plan_notes[0], /not taken this turn \(one main action per turn\): "then burn the rope ladder/);
    // the narrator is told it did not happen; the player sees it in the System block
    assert.match(h.narratorBlock(), /- NOT TAKEN THIS TURN \(it does not happen; do not narrate it as done\): not taken this turn \(one main action per turn\): "then burn the rope ladder/);
    assert.match(worldPanel(h.state(), content), /NOT TAKEN — not taken this turn \(one main action per turn\)/);

    const k = await fight();
    await k.say('I hold my ground and wait', cmds({ type: 'activity', kind: 'wait', what: null, minutes: null, until: null, quote: 'I hold my ground and wait' }));
    assert.equal(pcSteps(k.last())[0].kind, 'hold', 'the same hold A books for "I hold my ground"');
    assert.ok(!outcomeOf(k.last()).plan_notes);
});

test('a step the engine does not take with the main action is visible in a fight; outside one a deed without a command stays story fiction, as in A', async () => {
    // a step and a flight: the flight is his turn, the step is reported
    const g = await fight();
    await g.say('I step back and run for the exit', cmds({ type: 'move', dir: 'away', target: null, quote: 'I step back' }, { type: 'flee', quote: 'run for the exit' }));
    assert.equal(pcSteps(g.last())[0].kind, 'flee');
    assert.match(outcomeOf(g.last()).plan_notes[0], /not taken this turn \(fleeing is his whole turn\): "I step back"/);
    // a step and a skill on a thing: the world use is booked, the step is reported
    const h = await fight();
    await h.say('I step back and Flame Lance the ceiling', cmds({ type: 'move', dir: 'away', target: null, quote: 'I step back' },
        { type: 'ability_world', skill: 'mage.flame_lance', target: { new: 'the ceiling' }, target_words: 'the ceiling', goal: null, quote: 'Flame Lance the ceiling' }));
    assert.equal(pcSteps(h.last())[0].kind, 'ability_world');
    assert.match(outcomeOf(h.last()).plan_notes[0], /a step with a skill on a thing is not resolved by the engine yet\): "I step back"/);
    assert.match(h.narratorBlock(), /NOT TAKEN THIS TURN .*"I step back"/);
    // outside a fight: running off and sitting down are the narrator's story fiction (A's V4 turn), kept in the record
    const s = await story();
    await s.say('I run off down the road', cmds({ type: 'flee', quote: 'I run off down the road' }));
    assert.equal(s.last().route, 'v4');
    assert.match(outcomeOf(s.last()).actions[0], /NOTHING TO BOOK — Alaric decides nothing the engine resolves in this message; narrate what he says and does/);
    assert.deepEqual(s.last().plan.free, ['flee: "I run off down the road"']);
    const t = await story();
    await t.say('I burn the dead stump with Flame Lance and sit down on the warm ashes', cmds(
        { type: 'ability_world', skill: 'mage.flame_lance', target: { new: 'the dead stump' }, target_words: 'the dead stump', goal: null, quote: 'I burn the dead stump with Flame Lance' },
        { type: 'other', what: 'sits down on the ashes', quote: 'sit down on the warm ashes' }));
    assert.equal(outcomeOf(t.last()).kind, 'ability_world');
    assert.equal(outcomeOf(t.last()).plan_notes, undefined, 'no "do not narrate it" for his story fiction');
    assert.deepEqual(t.last().plan.free, ['other: "sit down on the warm ashes"']);
});

// ------------------------------------------------------------------------------------------------ swipe, failure, prompt
test('swipe and regenerate reuse the plan of the message: no second planner call, the same events and dice', async () => {
    const g = await fight();
    await g.say('I Flame Lance Barkscorpion C', cmds({ type: 'use_skill', skill: 'mage.flame_lance', target: C, quote: 'I Flame Lance Barkscorpion C' }));
    const first = structuredClone(g.last().events);
    const calls = g.planCalls();
    for (const type of ['swipe', 'regenerate']) {
        g.plans = [cmds({ type: 'use_skill', skill: 'mage.arcane_burst', target: null, quote: 'I Flame Lance Barkscorpion C' })];
        await prepareGenerationAsync(g.chat, content, { type, settings: { planner: true }, llm: g.llm });
        assert.equal(g.planCalls(), calls, type);
        assert.deepEqual(g.last().events, first, type);
    }
});

test('a failed planner is not cached: the turn aborts with a notice, Regenerate plans again', async () => {
    const g = await fight();
    const r = await g.say('I Flame Lance Barkscorpion C', 'no json here', 'still none');
    assert.equal(r.action, 'abort');
    assert.match(r.notice, /planner failed/);
    assert.deepEqual(g.last().events, []);
    g.plans = [cmds({ type: 'use_skill', skill: 'mage.flame_lance', target: C, quote: 'I Flame Lance Barkscorpion C' })];
    await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    assert.equal(pcSteps(g.last())[0].target, C);
});

test('the planner sees the scene: skills, opponents with their labels, engine facts, a short RECENT; the fight prompt has no shop commands', async () => {
    const g = await fight();
    const s = g.state();
    const ctx = withContentSkills(planContext(s, content, buildCatalog(s, content)), content);
    const req = plannerRequest(content.commandVocab, ctx, 'I Flame Lance the one that stung me', { recent: 'Barkscorpion B stung Alaric and scuttled back.' });
    assert.match(req.user, /- mage\.flame_lance: Flame Lance — attack · single target · reaches LONG · 16 MP/);
    assert.match(req.user, /- mon\.barkscorpion_2: Barkscorpion B — unhurt · ENGAGED/);
    assert.match(req.user, /ENGINE FACTS/);
    assert.match(req.user, /RECENT .*\nBarkscorpion B stung Alaric/);
    assert.doesNotMatch(req.system, /- go \{/, 'no go in a fight (4.3.0-c.6.2): a step within it is move, getting away is flee');
    assert.match(req.system, /- activity \{/);
    assert.doesNotMatch(req.system, /- pay \{/);
    assert.equal(plannerRequest(content.commandVocab, ctx, 'x').system, req.system, 'the same state gives the same prompt');
    const t = await story();
    const st = t.state();
    const sctx = withContentSkills(planContext(st, content, buildCatalog(st, content)), content);
    const sreq = plannerRequest(content.commandVocab, sctx, 'I pay the toll');
    assert.match(sreq.system, /You are the command interpreter/, 'story mode: the interpreter\'s measured prompt');
    assert.match(sreq.system, /- use_skill \{skill, target\}/);
    // unknown fields (an outcome, a number) are rejected: the engine decides outcomes
    const p = parsePlan(JSON.stringify(cmds({ type: 'use_skill', skill: 'mage.flame_lance', target: B, damage: 20, quote: 'I Flame Lance B' })), content.commandVocab, ctx, 'I Flame Lance B');
    assert.equal(p.commands, null);
    assert.match(p.errors[0], /unknown field damage/);
});

// ------------------------------------------------------------------------------------------------ c.6.2 a step in a fight
test('c.6.2: in a fight, walking toward the beasts is move closer by the Range Bands, its purpose no other; move + area attack, flee and go outside a fight unchanged', async () => {
    const fightPrompt = plannerSystem(content.commandVocab, { fight: true });
    assert.ok(!/\n- go \{/.test(fightPrompt), 'the fight prompt offers no go');
    assert.match(fightPrompt, /Every step within the fight is move, by the Range Bands: toward opponents is "closer", back from them is "away"\. target: the one opponent he heads for, or null when he names none or several/);
    assert.match(fightPrompt, /There is no go in a fight; getting away from the fight, out of it, is flee\./);
    assert.match(fightPrompt, /belongs to that command and is no command of its own: no other for it/);
    assert.match(fightPrompt, /"I walk over to the rats so they crowd around me for one big blast" → \{"commands":\[\{"seq":1,"type":"move","dir":"closer","target":null,"quote":"I walk over to the rats"\}\]\}/);
    const storyPrompt = plannerSystem(content.commandVocab);
    assert.match(storyPrompt, /\n- go \{/, 'outside a fight go stays');
    assert.ok(!storyPrompt.includes('In a fight (these come before'));
    // the live message (04.10.2026) as the fight prompt asks for it: every foe one band closer, nothing left untaken
    const g = await fight('LONG');
    await g.say('i walk towards the next beasts as i try to gather them all around me for one big action', cmds({ type: 'move', dir: 'closer', target: null, quote: 'i walk towards the next beasts' }));
    assert.match(g.calls.at(-1).messages[0].content, /There is no go in a fight/);
    assert.deepEqual(pcSteps(g.last()).map((r) => [r.kind, r.dir, r.change]), [['move', 'closer', 'Barkscorpion A MEDIUM -> SHORT; Barkscorpion B MEDIUM -> SHORT; Barkscorpion C MEDIUM -> SHORT']]);
    assert.equal(outcomeOf(g.last()).plan_notes, undefined, 'nothing not taken');
    // a step in and an area attack: Arcane Burst on every engaged foe (unchanged)
    const h = await fight();
    await h.say('I step in close and unleash Arcane Burst', cmds({ type: 'move', dir: 'closer', target: null, quote: 'I step in close' }, { type: 'use_skill', skill: 'mage.arcane_burst', target: null, quote: 'unleash Arcane Burst' }));
    const burst = pcSteps(h.last())[0];
    assert.deepEqual([burst.kind, burst.skill, burst.strikes.map((x) => x.target)], ['attack', 'mage.arcane_burst', [A, B, C]]);
    // getting away is flee; outside a fight go is the V4 go (unchanged)
    const k = await fight();
    await k.say('I run for the exit', cmds({ type: 'flee', quote: 'I run for the exit' }));
    assert.equal(pcSteps(k.last())[0].kind, 'flee');
    const t = await story();
    await t.say('I walk back to Redmarch', cmds({ type: 'go', to: 'loc.redmarch', quote: 'I walk back to Redmarch' }));
    assert.equal(outcomeOf(t.last()).resolutions[0].type, 'go');
});
