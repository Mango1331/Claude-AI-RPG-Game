// Patch 10A: read-only HUD changes; no world or combat state changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadContent, Game } from '../helpers.js';
import { renderHud, worldRows } from '../../src/hud.js';

const content = await loadContent();
const rows = (state) => Object.fromEntries(worldRows(state, content));

test('10A: location omits repeated realm and spot in expanded and collapsed HUD', () => {
    const g = new Game(content).ranger();
    const original = content.locations.get(g.state.scene.location);
    const realm = content.factions.get(original.realm).name;
    const id = 'hud10a.test_realm';
    g.state.places[id] = { id, name: realm, kind: 'realm', realm: original.realm, parent: null };
    g.state.scene.location = id;
    g.state.scene.at = id;
    g.state.scene.place = realm;
    assert.equal(rows(g.state).Location, realm);
    assert.doesNotMatch(renderHud(g.state, content), new RegExp(realm + ', ' + realm));
    assert.doesNotMatch(renderHud(g.state, content), new RegExp(realm + ' — ' + realm));
    g.state.scene.place = 'Cave below the falls';
    assert.equal(rows(g.state).Location, realm + ' — Cave below the falls');
    assert.match(renderHud(g.state, content), /Cave below the falls/);
    assert.match(rows(new Game(content).ranger().state).Location, /Tidecross, Solmere/);
});

test('10A: long quest and goal lists stay concise and point to their full commands', () => {
    const g = new Game(content).ranger();
    for (let i = 1; i <= 5; i++) {
        g.state.quests['quest.test_' + i] = { id: 'quest.test_' + i, title: 'Quest ' + i, status: 'active' };
        g.state.intents['intent.' + i] = { id: 'intent.' + i, goal: 'Find clue ' + i, status: 'active', place: null, since: { turn: i, minute: i }, updated: { turn: i, minute: i } };
    }
    const w = rows(g.state);
    assert.match(w['Active quests'], /Quest 1 · Quest 2 · Quest 3 · \+2 more \(#quests\)/);
    assert.doesNotMatch(w['Active quests'], /Quest 4/);
    assert.match(w.Goals, /\+2 more \(#journal\)/);
});

test('10A: existing non-hostile combatant has tactical row, not a spectator row', () => {
    const g = new Game(content).ranger();
    g.reply({ new: [{ ref: 'rat_a', kind: 'creature', species: 'rat', desc: ['cellar rat'], band: 'SHORT' }] });
    g.input('I wait.');
    g.reply({ combat: { by: 'rat_a' } });
    assert.ok(g.state.encounter);
    const enc = g.state.encounter;
    const enemy = Object.values(enc.combatants).find((x) => x.side === 'hostile');
    const ally = structuredClone(enemy);
    ally.id = 'npc.scout';
    ally.side = 'ally';
    ally.label = 'Helpful Scout';
    enc.combatants[ally.id] = ally;
    enc.order.push(ally.id);
    g.state.entities[ally.id] = { id: ally.id, kind: 'npc', name: 'Helpful Scout', known_name: 'Helpful Scout', descriptors: [], status: 'alive' };
    const html = renderHud(g.state, content);
    assert.match(html, /Other combatants · not hostile/);
    assert.match(html, /avereth-combat-other-row/);
    assert.match(html, /Helpful Scout/);
    assert.match(html, /Cellar Rat/);
    assert.equal((html.match(/<details /g) || []).length, 1);
});

test('10A: narrow-screen combat rows label HP/range/cover; existing System styling remains', () => {
    const css = fs.readFileSync(new URL('../../style.css', import.meta.url), 'utf8');
    assert.match(css, /@media \(max-width: 480px\)/);
    assert.match(css, /content: "HP "/);
    assert.match(css, /content: "Range "/);
    assert.match(css, /content: "Cover "/);
    assert.match(css, /avereth-system-panel/);
});
