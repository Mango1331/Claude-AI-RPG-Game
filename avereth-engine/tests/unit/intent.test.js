// Player intent: combat gate (Core #23), PC action scope, sole-hostile default, ambiguity, creation, commands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { authorization, parseIntent } from '../../src/intent.js';

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
