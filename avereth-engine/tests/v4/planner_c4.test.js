// Experimental c.6.5-gpt-notemp: the c.4 behavioural-category experiment is intentionally replaced on this branch.
// The comparison question here is whether Engine/Content can run from concrete state + explicit intent without a
// pre-assigned personality category.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, Game, scriptedDice, ROOT } from '../helpers.js';
import { scaleCreature, humanSheet } from '../../src/npcgen.js';
import { opensViolence } from '../../src/policy.js';
import { actorTraits, envelopeLines, mayOpenFight } from '../../src/v4/envelope.js';
import { initEncounter, npcDecide } from '../../src/combat.js';
import { applyEvent } from '../../src/state.js';

const content = await loadContent();

test('notemp source contract: no Engine/Content file exposes the removed category', () => {
    const files = [];
    const walk = (dir) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) walk(full);
            else if (/\.(?:js|json|txt)$/.test(ent.name)) files.push(full);
        }
    };
    walk(path.join(ROOT, 'src'));
    walk(path.join(ROOT, 'content'));
    const leaks = files.flatMap((file) => {
        const text = fs.readFileSync(file, 'utf8');
        return /\btemperament\b/i.test(text) ? [path.relative(ROOT, file)] : [];
    });
    assert.deepEqual(leaks, []);
});

test('notemp content and generated profiles carry no pre-assigned behaviour category', () => {
    for (const a of content.anchors.values()) assert.equal(Object.hasOwn(a, 'temperament'), false, a.id);
    for (const t of content.templates.values()) assert.equal(Object.hasOwn(t, 'temperament'), false, t.id);

    const p = scaleCreature(content.anchors.get('deer'), 1, 'normal', content);
    assert.equal(Object.hasOwn(p, 'temperament'), false);

    const h = humanSheet(content.templates.get('hunter'), {}, content);
    assert.equal(Object.hasOwn(h.generated || {}, 'temperament'), false);
});

test('notemp violence policy uses concrete sapience, hostility and harm only', () => {
    assert.deepEqual(opensViolence({ sapient: true, attitude: 0, harmed: false, band: 'MEDIUM' }), {
        ok: false, rule: 'provoked_only', why: 'not hostile toward Alaric and not harmed by him',
    });
    assert.equal(opensViolence({ sapient: true, attitude: -20, harmed: false }).ok, true);
    assert.equal(opensViolence({ sapient: true, attitude: 0, harmed: true }).ok, true);
    assert.equal(opensViolence({ sapient: false, attitude: 0, harmed: false, band: 'MEDIUM' }).ok, true);
});

function combatant(id, { side = 'hostile', sapient = false, band = 'MEDIUM', hp = 20, max = 20, cover = 'none' } = {}) {
    return {
        id, name: id, side, model: sapient ? 'character' : 'creature',
        fixed: sapient
            ? { max_hp: max, sapient: true, actions: {}, stats: {}, atk: 0, matk: 0, max_mp: 0, max_sta: 100, weapon_family: 'unarmed' }
            : { max_hp: max, sapient: false, attack: { range: 'ENGAGED' } },
        current: { hp, mp: 0, sta: 100, band: side === 'pc' ? null : band, cover, effects: [], defeated: false, escaped: false, surrendered: false, ammo: {} },
    };
}

test('notemp NPC decision: explicit intent wins; without it the fallback is tactical state, not a personality label', () => {
    const pc = combatant('pc', { side: 'pc', sapient: true, hp: 30, max: 30 });
    const npc = combatant('npc.x', { sapient: true, band: 'MEDIUM' });
    const beast = combatant('mon.x', { band: 'MEDIUM' });
    const enc = { combatants: { pc, 'npc.x': npc, 'mon.x': beast }, intents: {}, log: [], trigger: { actor: 'pc' } };
    const state = { relations: {} };
    const ctx = { enc, content, state, c: true };

    assert.equal(npcDecide(ctx, 'npc.x').kind, 'cover', 'unharmed neutral person seeks safety rather than opening violence');
    enc.intents['npc.x'] = 'attack';
    assert.equal(npcDecide(ctx, 'npc.x').kind, 'close_and_attack', 'explicit attack intent closes from MEDIUM');
    enc.intents['npc.x'] = 'flee';
    assert.deepEqual(npcDecide(ctx, 'npc.x'), { kind: 'flee', why: 'narrated intent' });

    assert.equal(npcDecide(ctx, 'mon.x').kind, 'close_and_attack', 'unclassified creature uses the tactical fallback');
    enc.intents['mon.x'] = 'hold';
    assert.deepEqual(npcDecide(ctx, 'mon.x'), { kind: 'hold', why: 'narrated intent (hold)' });
});

test('notemp world envelope restricts peaceful people but does not expose hidden animal archetypes', () => {
    const g = new Game(content).ranger();
    const s = g.state;
    s.meta = { ...s.meta, runtime: 'v4' };
    s.entities['npc.bren'] = { id: 'npc.bren', kind: 'npc', name: 'Bren', descriptors: ['barkeep'], traits: '', status: 'alive', location: s.scene.location, template: 'commoner' };
    s.entities['mon.deer'] = { id: 'mon.deer', kind: 'creature', name: null, descriptors: ['red deer'], traits: '', status: 'alive', location: s.scene.location, species: 'red deer', anchor: 'deer', profile: scaleCreature(content.anchors.get('deer'), 1, 'normal', content) };
    s.entities['mon.wolf'] = { id: 'mon.wolf', kind: 'creature', name: null, descriptors: ['grey wolf'], traits: '', status: 'alive', location: s.scene.location, species: 'grey wolf', anchor: 'wolf', profile: scaleCreature(content.anchors.get('wolf'), 1, 'normal', content) };
    for (const id of ['npc.bren', 'mon.deer', 'mon.wolf']) {
        s.scene.present.push(id);
        s.scene.positions[id] = { band: 'MEDIUM', cover: 'none' };
    }

    const lines = envelopeLines(s, content, { c: true });
    assert.equal(lines.length, 1, lines.join('\n'));
    assert.match(lines[0], /Violent only once the story gives them cause first .*Bren/);
    assert.equal(mayOpenFight(s, content, 'mon.deer', { c: true }).ok, true);
    assert.equal(mayOpenFight(s, content, 'mon.wolf', { c: true }).ok, true);
    assert.equal(Object.hasOwn(actorTraits(s, content, 'mon.deer'), 'temperament'), false);
});

test('notemp combat snapshot carries no removed category', () => {
    const g = new Game(content).ranger();
    const p = scaleCreature(content.anchors.get('deer'), 1, 'normal', content);
    applyEvent(g.state, { t: 'entity.created', d: { entity: { id: 'mon.deer', kind: 'creature', name: null, descriptors: ['red deer'], anchor: 'deer', species: 'red deer', status: 'alive', location: g.state.scene.location, profile: p } } });
    applyEvent(g.state, { t: 'scene.entered', d: { id: 'mon.deer', band: 'MEDIUM', cover: 'none' } });
    const enc = initEncounter(g.state, content, scriptedDice(), { actor: 'pc', target: 'mon.deer', engage: true }, [{ id: 'mon.deer', side: 'hostile' }], 'enc.notemp', { c: true });
    assert.equal(Object.hasOwn(enc.combatants['mon.deer'].fixed, 'temperament'), false);
});
