// 4.3.0-c.6.6.53 (docs/PATCH9C_COMPLETION.md §14): the two short live tests of .52, 23.10.2026 (GLM-5.3-Flash,
// tools/st_live/live, guide current_test). The second (tests/v4/live_1023b.json, 20:56): turn 10 entered the Mossback
// Warrens; the extractor's first answer used up its 4000 tokens deliberating (finish length, no content), its one repair
// was right in all but one field (person.new role as ["camp man"]) and was refused whole: extract.failed, the entry not
// booked, Alaric still at the Dungeon's root before its gate. Turn 11 booked three goblins the reply brought there as
// free creatures (Level 5, no slot of the Dungeon), the fight killed him. Both runs ended with "integrity: N problem(s)":
// facts about the Dungeon's own place, which the validator took for a missing entity.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadProductContent, loadContent, ROOT } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { deriveCharacter } from '../../src/derived.js';
import { floorAt } from '../../src/v4/living.js';
import { trueDungeonOf } from '../../src/v4/dungeon.js';
import { Chat4 } from './harness.js';
import { campaign } from './patch8_lib.js';

const content = await loadProductContent();
const legacy = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1023b.json'), 'utf8'));
const ROOT_ID = 'loc.mossback_warrens';

/** The live chat up to message n (exclusive), played on with a scripted planner. */
function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}

// ------------------------------------------------------------------------------------------------ the integrity line
test('.53 integrity: a fact about a place of the world (the Dungeon\'s root) is no fact about a missing entity; one about a missing creature still is', () => {
    const { state } = foldChat(fx.messages);
    assert.ok(state.places[ROOT_ID], 'the Dungeon is a place of the world');
    assert.deepEqual(validateState(state, content), [], 'the live run\'s two "problems"');
    const s = structuredClone(state);
    s.facts['f.test'] = { id: 'f.test', s: 'mon.nobody_here', p: 'wounded', o: 'yes', since: { turn: 1, minute: 0 }, until: null };
    assert.ok(validateState(s, content).some((p) => /about missing entity mon\.nobody_here/.test(p)));
});

// ------------------------------------------------------------------------------------------------ the extractor
test('.53 extractor (live #20): the repair\'s answer with person.new role as a list of words is read (joined), not refused; the entry onto level 1 and the engine\'s goblins are booked', async () => {
    const g = live(20);
    assert.equal(rec(fx.messages[20]).extraction.status, 'failed', 'live: refused');
    const r = await g.reply(fx.messages[20].mes, fx.extract_repair_answer);
    assert.equal(r.record.extraction.status, 'applied', JSON.stringify(r.record.extraction).slice(0, 300));
    const s = g.state();
    assert.equal(trueDungeonOf(s, s.scene.at), ROOT_ID);
    assert.ok(floorAt(s, s.scene.at) >= 1, `inside, on level 1 (at ${s.scene.at})`);
    const keeper = Object.values(s.entities).find((e) => e.kind === 'npc' && /camp man/.test(e.role || e.descriptors?.join(' ') || ''));
    assert.ok(keeper, 'the gatekeeper with his role');
    const goblins = Object.values(s.entities).filter((e) => e.kind === 'creature' && e.slot?.dungeon === ROOT_ID);
    assert.equal(goblins.length, 3, 'the scouts of the level, the engine\'s');
});

test('.53 extractor: a list of words is joined only for the free words of a person (role, armed); a list for a ref stays an error', async () => {
    const { parseExtraction } = await import('../../src/v4/extract.js');
    const { extractionRequest, processReplyAny } = await import('../../src/v4/runtime.js');
    const g = live(20);
    g.chat.push({ mes: fx.messages[20].mes, is_user: false, is_system: false, extra: {} });
    processReplyAny(g.chat, 20, content, {});
    const req = extractionRequest(g.chat, 20, content);
    const ok = parseExtraction(fx.extract_repair_answer, content.deltaVocab, req.ids, req.expectedKeys);
    assert.equal(ok.valid, true, ok.errors.join('; '));
    assert.equal(ok.value.deltas[0].role, 'camp man');
    const armed = JSON.parse(fx.extract_repair_answer);
    armed.deltas[0].armed = ['a ledger', 'a short club'];
    assert.equal(parseExtraction(JSON.stringify(armed), content.deltaVocab, req.ids, req.expectedKeys).value.deltas[0].armed, 'a ledger, a short club');
    const bad = JSON.parse(fx.extract_repair_answer);
    bad.deltas[0].ref = ['gatekeeper'];
    assert.equal(parseExtraction(JSON.stringify(bad), content.deltaVocab, req.ids, req.expectedKeys).valid, false);
});

// ------------------------------------------------------------------------------------------------ after a failed extraction
test('.53 failed extraction (live #20): the correction names where he still is: at the Dungeon, before its gate, not inside', async () => {
    const g = live(20);
    const r = await g.reply(fx.messages[20].mes, 'not json');
    assert.equal(r.record.extraction.status, 'failed');
    assert.equal(g.state().scene.at, ROOT_ID);
    assert.ok(r.record.corrections.some((c) => /nothing of it changed the game state/.test(c)));
    assert.ok(r.record.corrections.some((c) => /Alaric is still at Mossback Warrens, before its gate: not inside it/.test(c)), r.record.corrections.join(' | '));
});

test('.53 the Dungeon\'s root (live #22): goblins of the Mossback Warrens the reply brings before its gate are no foes of the world (dungeon_foe); another creature there stays', async () => {
    const g = live(22);
    const raw = rec(fx.messages[22]).extraction.raw;
    assert.ok(raw.deltas.some((d) => d.type === 'creature.new' && d.anchor === 'goblin'), 'live: three goblins');
    const before = foldChat(fx.messages, 22).state;
    assert.equal(before.scene.at, ROOT_ID, 'at the root, the entry not booked');
    const r = await g.reply(fx.messages[22].mes, raw);
    const ev = r.record.events;
    assert.ok(ev.some((e) => e.t === 'delta.rejected' && e.d.rule === 'dungeon_foe'), ev.map((e) => e.t).join(', '));
    const s = g.state();
    assert.ok(!Object.values(s.entities).some((e) => e.kind === 'creature' && e.anchor === 'goblin' && !e.slot), 'no free goblin');
    assert.ok(!s.encounter && !ev.some((e) => e.t === 'encounter.started'), 'no fight');
    assert.ok(r.record.corrections.some((c) => /only the engine adds foes/.test(c)));
    // a creature that is none of the Dungeon's kinds (a crow on the palisade) is not refused
    const h = live(22);
    const crow = await h.reply('A crow watches from the palisade.', { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'crow', species: 'crow', anchor: 'crow', desc: ['on the palisade'], count: 1, present: true, band: 'MEDIUM', cluster: null, stronger: null, threat: null, more: null }] });
    assert.ok(!crow.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'dungeon_foe'));
});

// ------------------------------------------------------------------------------------------------ starter weapons
test('.53 starter weapons (ruleset 2): Warrior Longsword ATK 10, Mage Staff MATK 10, Rogue Dagger ATK 10, Rank F; the creation menu says so', async () => {
    // B1 (.130): the starter AoE pool is the current creation rule (Fan of Blades in Feint's slot)
    const cases = [['Warrior', 'Heavy Slash + Guard', 'atk', 10], ['Mage', 'Arcane Bolt + Arcane Ward', 'matk', 10], ['Rogue', 'Razor Cut + Fan of Blades', 'atk', 10]];
    for (const [cls, skills, stat, value] of cases) {
        const g = await campaign(content, { cls, skills });
        const sheet = g.state().entities.pc.sheet;
        const weapon = content.items.get(sheet.equipment.weapon);
        assert.deepEqual([weapon[stat], weapon.rank], [value, 'F'], cls);
        const plain = deriveCharacter({ ...sheet, equipment: { ...sheet.equipment, weapon: null } }, content);
        assert.equal(deriveCharacter(sheet, content)[stat] - plain[stat], value, `${cls}: the weapon adds ${value}`);
    }
    const g = new Chat4(content);
    await g.player('Warrior');
    assert.match(g.chat.at(-1).mes, /Starter Gear, equipped when Step 2 is complete: Starter Longsword \[F\] \(ATK 10\), Starter Heavy Armor/);
});

test('.53 starter weapons: a legacy campaign and a ruleset 2 campaign started before keep theirs (ATK 6); the people of the world are built as before', async () => {
    const pool = (c, id) => c.classes.get(id).skill_pool.slice(0, 2).map((s) => c.skills.get(s).name).join(' + ');
    const old = await campaign(legacy, { cls: 'Warrior', skills: pool(legacy, 'warrior') });
    const w = legacy.items.get(old.state().entities.pc.sheet.equipment.weapon);
    assert.deepEqual([w.id, w.atk], ['starter_longsword', 6]);
    const before = foldChat(fx.messages).state.entities.pc.sheet;
    assert.deepEqual([before.equipment.weapon, content.items.get(before.equipment.weapon).atk], ['starter_longsword', 6], 'a .52 Warrior');
    assert.deepEqual(content.kits.warrior, ['starter_longsword', 'starter_heavy_armor'], 'the kit the people of the world are built from');
});
