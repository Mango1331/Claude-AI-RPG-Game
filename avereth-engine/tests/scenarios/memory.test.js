// Long-campaign scenarios: reunion after a long absence, secret knowledge (NPC A vs NPC B), a destroyed city that
// must not reappear intact, relationships over time, and identity knowledge (who has seen / can name Alaric).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { statusOf, knowledgeOf } from '../../src/knowledge.js';

const content = await loadContent();

function cardOf(text, name) {
    const lines = text.split('\n');
    const i = lines.findIndex((l) => l.startsWith(`• ${name}`));
    if (i < 0) return '';
    const out = [lines[i]];
    for (let j = i + 1; j < lines.length && lines[j].startsWith('  '); j++) out.push(lines[j]);
    return out.join('\n');
}

/** Travel elsewhere and play many unrelated turns with other people (noise for retrieval). */
function wander(g, turns, location = 'Goldharbor') {
    g.turn('I take the coast road.', { time: 600, location });
    for (let i = 0; i < turns; i++) {
        g.turn(`I work the docks, day ${i}`, {
            time: 480, new: i % 10 === 0 ? [{ ref: `docker${i}`, name: `Docker ${i}`, kind: 'npc', desc: ['dockhand'] }] : undefined,
            memory: [{ text: `Alaric hauled crates at pier ${i % 7} and talked about tides with the dockhands`, who: ['pc'], imp: 3 }],
        });
    }
}

test('reunion: after 200 unrelated turns Mara still remembers Alaric, her promise and her attitude', () => {
    const g = new Game(content).ranger();
    g.turn('I walk to the inn "The Salt Lantern" in Tidecross and greet the innkeeper. "My name is Alaric."', {
        place: 'The Salt Lantern inn', new: [{ ref: 'innkeeper', name: 'Mara', kind: 'npc', desc: ['innkeeper', 'woman'], traits: 'broad-shouldered, flour on her apron' }],
    });
    g.turn('I help her carry the barrels and ask about a room.', {
        memory: [{ text: 'Alaric carried Mara\'s ale barrels; she promised to keep the attic room free for him', who: ['Mara', 'pc'], imp: 7 }],
        attitude: [{ who: 'Mara', delta: 30, why: 'he helped with the barrels unasked' }],
        threads: [{ text: 'Mara keeps the attic room free for Alaric', kind: 'promise' }],
    });
    wander(g, 200);
    assert.ok(!g.state.scene.present.includes('npc.mara'));
    g.turn('I travel back to Tidecross.', { time: 900, location: 'Tidecross', place: 'The Salt Lantern inn', enter: ['Mara'] });
    g.input('"Mara! Is the attic room still free?"');
    const ctx = g.context();
    const card = cardOf(ctx.text, 'Mara');
    assert.match(card, /knows him by name/);
    assert.match(card, /friendly \(\+30\)/);
    assert.match(card, /Alaric carried Mara's ale barrels; she promised to keep the attic room free for him/);
    assert.match(ctx.text, /Open thread \(promise\): Mara keeps the attic room free/);
    assert.ok(ctx.tokens < 2400, `context stays small after 200+ turns: ${ctx.tokens} tokens`);
});

test('secret knowledge: Brom keeps his secret, Mara does not know it until told, Alaric only by witnessing', () => {
    const g = new Game(content).ranger();
    g.turn('I enter the smithy.', {
        new: [{ ref: 'Brom', name: 'Brom', kind: 'npc', desc: ['smith'] }, { ref: 'Mara', name: 'Mara', kind: 'npc', desc: ['innkeeper'] }],
        facts: [{ s: 'Brom', p: 'member_of', o: 'the Black Hand smugglers', vis: 'secret' }],
    });
    g.input('I ask them both about the harbour.');
    let ctx = g.context();
    assert.match(cardOf(ctx.text, 'Brom'), /keeps secret: Brom member of the Black Hand smugglers \[self\]/);
    assert.doesNotMatch(cardOf(ctx.text, 'Mara'), /Black Hand/);
    assert.doesNotMatch(ctx.text.split('PRESENT')[0] + (ctx.text.split('RELEVANT')[1] || ''), /Black Hand/, 'secrets are never retrieved as general facts');
    g.reply({ learn: [{ who: 'Mara', s: 'Brom', p: 'member_of', o: 'the Black Hand smugglers', how: 'rumor' }] });
    assert.equal(knowledgeOf(g.state, 'npc.mara').filter((r) => /Black Hand/.test(r.o)).length, 0, 'a secret does not spread by rumor');
    g.turn('I leave; later Brom whispers to Mara.', { learn: [{ who: 'Mara', s: 'Brom', p: 'member_of', o: 'the Black Hand smugglers', how: 'told', from: 'Brom' }] });
    g.input('I come back and talk to Mara about Brom.');
    ctx = g.context();
    assert.match(cardOf(ctx.text, 'Mara'), /keeps secret: Brom member of the Black Hand smugglers \[told:npc\.brom\]/);
    assert.ok(!knowledgeOf(g.state, 'pc').some((r) => /Black Hand/.test(r.o)), 'Alaric still does not know');
});

test('a destroyed city stays destroyed: hard fact, status in the header, outdated NPC knowledge flagged', () => {
    const g = new Game(content).ranger();
    g.turn('I chat with the carter.', {
        new: [{ ref: 'carter', name: 'Old Pell', kind: 'npc', desc: ['carter'] }],
        facts: [{ s: 'Ashbridge', p: 'status', o: 'prosperous' }],
        learn: [{ who: 'Old Pell', s: 'Ashbridge', p: 'status', o: 'prosperous', how: 'witnessed' }],
    });
    g.turn('I travel on.', { time: 2000, location: 'Glassmere', facts: [{ s: 'Ashbridge', p: 'status', o: 'destroyed', because: 'the Ashen Scale Dominion burned it in a night raid' }] });
    assert.equal(statusOf(g.state, 'loc.ashbridge'), 'destroyed');
    const r = g.reply({ facts: [{ s: 'Ashbridge', p: 'status', o: 'bustling market town' }] });
    assert.match(r.corrections.join(' '), /contradicts established fact/);
    g.turn('I journey to Ashbridge.', { time: 3000, location: 'Ashbridge', place: 'the burned bridge gate', enter: [] });
    g.input('I look for the market.');
    const ctx = g.context();
    assert.match(ctx.text, /LOCATION STATUS: DESTROYED/);
    assert.match(ctx.text, /ESTABLISHED FACTS[\s\S]*Ashbridge status destroyed[\s\S]*cause: the Ashen Scale Dominion burned it/);
    g.turn('Later I meet Old Pell again on the road.', { time: 600, location: 'Glassmere', enter: ['Old Pell'] });
    g.input('"Pell, have you heard about Ashbridge?"');
    assert.match(cardOf(g.context().text, 'Old Pell'), /Ashbridge status prosperous \(OUTDATED: the world changed since\)/);
});

test('relationships accumulate with their reasons; attitudes stay within bounds', () => {
    const g = new Game(content).ranger();
    g.turn('I meet the guard captain.', { new: [{ ref: 'captain', name: 'Captain Sera', kind: 'npc', desc: ['guard captain', 'guard'] }] });
    const deltas = [[20, 'returned her lost dagger'], [-40, 'lied about the smuggling'], [15, 'saved a recruit'], [-100, 'insulted her before her men'], [-80, 'robbed the armory']];
    for (const [delta, why] of deltas) g.turn('Time passes.', { time: 1440, attitude: [{ who: 'Captain Sera', delta, why }] });
    const rel = g.state.relations['rel.npc.captain_sera.attitude.pc'];
    assert.equal(rel.history.length, 5);
    assert.deepEqual(rel.history.map((h) => h.delta), [20, -40, 15, -50, -50], 'single changes are clamped to ±50');
    assert.equal(rel.value, -100);
    g.turn('I return to the barracks.', { enter: ['Captain Sera'] });
    g.input('"Captain, can we talk?"');
    assert.match(cardOf(g.context().text, 'Captain Sera'), /hostile \(-100\) \(last change: robbed the armory\)/);
});

test('identity knowledge: an NPC who never saw Alaric cannot name or describe him', () => {
    const g = new Game(content).ranger();
    g.input('I sneak toward the clearing');
    g.reply({ new: [{ ref: 'trapper', kind: 'npc', desc: ['trapper'], band: 'MEDIUM' }], aware: [{ who: 'trapper', level: 'suspicious' }], concealed: ['pc'] });
    g.input('I watch him quietly');
    let card = cardOf(g.context().text, 'the trapper');
    assert.match(card, /has never seen him/);
    assert.match(card, /Alaric is currently UNSEEN/);
    g.reply({ concealed: [] }, 'Alaric steps out of the hazel.');
    g.input('"Easy, I mean no harm."');
    card = cardOf(g.context().text, 'the trapper');
    assert.match(card, /has seen him, does NOT know his name/);
    assert.match(card, /first saw the stranger/);
    g.reply({});
    g.input('"I\'m Alaric."');
    assert.match(cardOf(g.context().text, 'the trapper'), /does NOT know his name/, 'he hears the name during this reply');
    g.reply({});
    g.input('"So, about those snares."');
    assert.match(cardOf(g.context().text, 'the trapper'), /knows him by name/);
});
