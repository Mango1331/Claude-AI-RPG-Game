// Player intent: combat gate (Core #23), PC action scope, sole-hostile default, ambiguity, creation, commands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { authorization, parseIntent, takesQuest } from '../../src/intent.js';

const content = await loadContent();

function scene(extra = []) {
    const g = new Game(content).ranger();
    g.reply({ new: [{ ref: 'wolf', kind: 'creature', species: 'wolf', band: 'MEDIUM' }, ...extra] });
    return g;
}

test('danger alone does not start combat: tracking, watching, aiming, readying a bow stay narrative (Core #23)', () => {
    const g = scene();
    for (const t of ['*i get my bow ready and track the sound*', 'I aim at the wolf and wait', 'I watch the wolf carefully',
        'I draw my bow', 'I follow its tracks into the brush', 'I take a look at the wolf', 'I hit the road again',
        'what does Power Shot do?', 'I strike a bargain with the merchant']) {
        const i = parseIntent(t, g.state, content);
        assert.ok(['narrative', 'stealth'].includes(i.kind), `${t} -> ${i.kind}`);
    }
});

test('declared attacks are recognised, with the named Skill or the class Basic Attack', () => {
    const g = scene();
    const cases = {
        '*i aim the bow and i Power Shot at him*': 'ranger.power_shot',
        'I loose an arrow at the wolf': 'ranger.basic_attack',
        'Aimed Shot on the wolf!': 'ranger.aimed_shot',
        'I shoot it': 'ranger.basic_attack',
        'I let an arrow fly': 'ranger.basic_attack',
    };
    for (const [t, skill] of Object.entries(cases)) {
        const i = parseIntent(t, g.state, content);
        assert.equal(i.kind, 'attack', t);
        assert.equal(i.skill, skill, t);
        assert.equal(i.target, 'mon.wolf', t);
    }
});

test('one valid target is chosen automatically; two require the player to choose (no cost, no roll)', () => {
    const g = scene([{ ref: 'second wolf', kind: 'creature', species: 'wolf', desc: ['grey wolf'], band: 'SHORT' }]);
    const i = parseIntent('I shoot at it', g.state, content);
    assert.equal(i.kind, 'ambiguous_target');
    assert.equal(i.candidates.length, 2);
    const t = g.input('I shoot at it');
    assert.equal(t.outcome.kind, 'note');
    assert.equal(g.state.mode, 'story');
    assert.equal(g.state.entities.pc.sheet.inventory.standard_arrow, 20);
});

test('unknown Skills and missing targets are reported, never resolved', () => {
    const g = new Game(content).ranger();
    assert.equal(parseIntent('I use Twin Shot on the tree', g.state, content).kind, 'unknown_skill');
    assert.equal(parseIntent('I attack!', g.state, content).kind, 'no_target');
});

test('character creation accepts only valid choices; commands start with #', () => {
    const g = new Game(content);
    assert.deepEqual(parseIntent('Ranger', g.state, content), { kind: 'creation.class', class: 'ranger' });
    assert.equal(parseIntent('I look around', g.state, content).kind, 'creation.invalid');
    assert.equal(parseIntent('Warrior or Mage?', g.state, content).kind, 'creation.invalid');
    g.turn('Ranger');
    assert.deepEqual(parseIntent('Aimed Shot + Power Shot', g.state, content).skills, ['ranger.aimed_shot', 'ranger.power_shot']);
    const bad = g.input('Aimed Shot, Power Shot and Twin Shot');
    assert.equal(bad.outcome.kind, 'creation.invalid');
    assert.equal(parseIntent('  #skill Power Shot', g.state, content).kind, 'command');
    assert.equal(parseIntent('I scratch #1 into the wall', g.state, content).kind, 'creation.invalid');
});

test('declared stealth is resolved by an opposed check (or automatically with nobody around)', () => {
    const g = new Game(content).ranger();
    const alone = g.input('I sneak along the hedge');
    assert.equal(alone.outcome.check.automatic, true);
    assert.ok(g.state.scene.concealed.includes('pc'));
    g.reply({ concealed: [], new: [{ ref: 'guard', kind: 'npc', desc: ['guard'], band: 'MEDIUM' }] });
    const t = g.input('I creep past the guard');
    assert.equal(t.outcome.kind, 'check');
    assert.match(t.outcome.check.label, /Stealth \(AGI 6\) vs Detection .* \(PER/);
    assert.equal(g.state.scene.concealed.includes('pc'), t.outcome.check.success);
});

test('player authorization: voluntary PC changes are licensed by what the player declares or says, not by questions', () => {
    const yes = (t, k) => assert.equal(authorization(t)[k], true, `${k}: ${t}`);
    const no = (t, k) => assert.equal(authorization(t)[k], false, `${k}: ${t}`);
    yes('I take the coast road.', 'travel');
    yes('I take the coast road.', 'move');
    no('I look at the notice board.', 'travel');
    no('Where does the north road lead?', 'travel');
    yes('"Here, thirty copper for the room."', 'pay');
    yes('I buy a loaf of bread.', 'pay');
    no('Would you sell me a room?', 'pay');
    no('How much is a room?', 'pay');
    yes('"Deal, I\'ll do it."', 'accept');
    yes('I take the caravan job.', 'accept');
    no('What does the job pay?', 'accept');
    yes('I hand her the letter.', 'give');
    no('I read the letter.', 'give');
    yes('I duck behind the barrels.', 'conceal');
    no('I watch the barrels.', 'conceal');
    yes('I rest by the fire until dawn.', 'rest');
});

test('"the nearest one" picks the closest Range Band; equally close targets stay the player\'s choice (Core #23)', () => {
    const g = new Game(content).ranger();
    g.input('I look around.');
    g.reply({ new: [{ ref: 'grey wolf', kind: 'creature', species: 'wolf', band: 'SHORT' }, { ref: 'black wolf', kind: 'creature', species: 'wolf', band: 'MEDIUM' }] });
    const i = parseIntent('I shoot the nearest wolf', g.state, content);
    assert.deepEqual([i.kind, i.target, i.target_how], ['attack', 'mon.grey_wolf', 'nearest']);
    g.reply({ position: [{ who: 'black wolf', band: 'SHORT' }] });
    assert.deepEqual(parseIntent('I shoot the closest wolf', g.state, content).candidates.sort(), ['mon.black_wolf', 'mon.grey_wolf']);
    // in a fight "the nearest one" means the nearest hostile
    g.reply({ new: [{ ref: 'Mara', name: 'Mara', kind: 'npc', desc: ['guide'], band: 'ENGAGED' }], position: [{ who: 'black wolf', band: 'MEDIUM' }] });
    g.input('I shoot the grey wolf');
    const f = parseIntent('I shoot the nearest one', g.state, content);
    assert.deepEqual([f.kind, f.target], ['attack', g.state.encounter.combatants['mon.grey_wolf'].current.defeated ? 'mon.black_wolf' : 'mon.grey_wolf']);
});

test('taking a quest by name (Testrun 4); a look, a question or a single shared word takes nothing', () => {
    const vermin = 'Vermin in the Malthouse Cellar';
    assert.ok(takesQuest('*I take the Vermin in the Malthouse Cellar Quest and register it with by the desk*', vermin));
    assert.ok(takesQuest("I'll pick the malthouse vermin bill", vermin));
    assert.ok(authorization('I take the Vermin in the Malthouse Cellar Quest').accept, 'a long title between "take the" and "quest"');
    for (const t of ['I take a look at the malthouse cellar', 'Should I take the vermin in the malthouse cellar job?',
        'I take the cellar stairs down', '*i get the corpse and go back to the guild to turn the quest in*']) assert.ok(!takesQuest(t, vermin), t);
    assert.ok(!takesQuest('I take the Vermin in the Malthouse Cellar Quest', 'Wolves Near the Ashbridge Ford'));
});

test('a step back with the attack is the Turn\'s one-band move away (Core #12/#24)', () => {
    const g = scene();
    for (const t of ['*i kite backwards and Power Shot again at it*', 'I jump back and shoot the wolf', 'I step back and loose an arrow at the wolf']) {
        assert.equal(parseIntent(t, g.state, content).move, 'away', t);
    }
    assert.equal(parseIntent('I Power Shot the wolf', g.state, content).move, null);
});

test('a target the player tells apart ("the second one") is never the sole-hostile default: nothing spent, nothing rolled', () => {
    const g = scene();
    for (const t of ['I shoot the second one', 'I Power Shot the other one', 'I shoot at another one', 'I aim at the left one and shoot']) {
        const i = parseIntent(t, g.state, content);
        assert.equal(i.kind, 'no_target', t);
        assert.match(i.ref, /^the (?:second|other|left) one$|^another one$/, t);
    }
    // pronouns, no target words, "the last one" and a second arrow still take the only valid target
    for (const t of ['I shoot it', 'I Power Shot', 'I shoot the last one', 'I nock another one and shoot']) assert.equal(parseIntent(t, g.state, content).target, 'mon.wolf', t);
    // in a running fight (Testrun 4, turn 13): Alaric keeps his Turn, STA and arrows (a Basic Attack, 16-19 damage,
    // leaves the 23-HP wolf standing now that every legal shot lands)
    g.input('I shoot the wolf');
    g.reply({});
    const [sta, arrows] = [g.state.entities.pc.sheet.sta, g.state.entities.pc.sheet.inventory.standard_arrow];
    g.input('fuck *i curse and jump backwards as i aimed shot at the second one*');
    const o = g.state.last.outcome;
    assert.equal(o.notice, 'Alaric\'s attack needs a target: "the second one" is not in the fight (nothing spent, nothing rolled)');
    assert.deepEqual([o.records.length, g.state.encounter.current, g.state.entities.pc.sheet.sta, g.state.entities.pc.sheet.inventory.standard_arrow], [0, 'pc', sta, arrows]);
});

