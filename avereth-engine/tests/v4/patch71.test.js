// Patch 7.1 (4.3.0-c.6.6.19): item power, Rank requirements and true AoE. A concrete item keeps the values it was
// established with (object.profile: an offer line, the purchase that carries it over, loot, the story), whatever the
// content says later; the price of an offer is the merchant's, checked against a guideline; ranked gear and attack items
// are used only up to Alaric's Power-Rank; an area attack strikes everyone in its area, however many: a thrown burst its
// whole close knot (a cluster the story established, at one distance from him), never everyone of a distance or a room.
// The live campaign of 20.10.2026 (tests/v4/live_1020.json) is the stage; formations it does not fix are injected.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { foldChat, rec, turnBlock } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { itemEffectOf } from '../../src/content.js';
import { deriveCharacter } from '../../src/derived.js';
import { playerTurn } from '../../src/engine.js';
import { turnPanel } from '../../src/display.js';
import { itemProfile, itemTraits, priceAudit, rankRefusal, rankInName } from '../../src/v4/items.js';
import { burstCaught, burstAim, clusterOf } from '../../src/v4/scene_handles.js';
import { initEncounter, attackAction } from '../../src/combat.js';
import { Dice } from '../../src/rng.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1020.json'), 'utf8'));
const SCROLL = 'obj.t21.scorchburst_scroll_first_circle_one_use';
const MARREC = 'npc.npcthessaly_shopkeeper';
const TEXT = fx.messages[37].mes;
const USE = (object = SCROLL) => ({ type: 'use', object, qty: 1, quote: 'i say Thornash and throw the scroll at them' });
const BEETLE = (n) => `mon.crystal_beetle_swarm_${n}`;
const ALIVE = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12];

function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    return prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
}
const lastUser = (g) => rec(g.chat.findLast((m) => m.is_user));
const outcomeOf = (g) => lastUser(g).events.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
const thrown = (g) => outcomeOf(g).records?.find((r) => r.actor === 'pc' && r.item);
function inject(g, events) {
    const m = g.chat.at(-1);
    m.extra.avereth.events.splice(-1, 0, ...events);
}
/** A thing the story established in his hands (object.created as the world applier makes it: its traits and profile). */
const held = (id, name, s) => ({ t: 'object.created', d: { object: { id, name, kind: 'item', stack: false, qty: 1, unit: null, ...itemTraits(content, { name }, s.clock.minute), holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: s.turn, how: 'story' } } } });
/** Where they stand: a band and the knot they are in (the position delta's cluster, as the reducer stores it). */
const at = (n, band, cluster) => ({ t: 'scene.position', d: { id: typeof n === 'string' ? n : BEETLE(n), band, cover: 'none', cluster } });

// ================================================================================================ items, values, prices
test('patch 7.1 (1): two F-Rank swords of different quality keep their own ATK when worn, and go back to his pack with it; the starter staff stays a template', async () => {
    const g = live(37);
    const s0 = g.state();
    inject(g, [held('obj.test.iron_sword', 'iron sword', s0), held('obj.test.fine_sword', 'fine longsword', s0)]);
    const s = g.state();
    assert.deepEqual([s.objects['obj.test.iron_sword'].profile.atk, s.objects['obj.test.fine_sword'].profile.atk], [6, 8]);
    assert.equal(s.objects['obj.test.iron_sword'].profile.rank, 'F');
    assert.equal(s.objects['obj.test.iron_sword'].use, 'equipment');
    await say(g, '*i take the iron sword in hand*', { type: 'equip', object: 'obj.test.iron_sword', slot: null, quote: 'i take the iron sword in hand' });
    let w = g.state().entities.pc.sheet.equipment.weapon;
    assert.equal(w.atk, 6);
    assert.equal(w.object, 'obj.test.iron_sword');
    assert.equal(deriveCharacter(g.state().entities.pc.sheet, content).atk, 6, 'its own ATK, not a template\'s');
    assert.equal(g.state().entities.pc.sheet.inventory.starter_arcane_staff, 1, 'the staff back in his pack');
    await g.reply('He hefted the plain blade.', { expected: {}, deltas: [] });
    await say(g, '*i switch to the fine longsword*', { type: 'equip', object: 'obj.test.fine_sword', slot: null, quote: 'i switch to the fine longsword' });
    w = g.state().entities.pc.sheet.equipment.weapon;
    assert.equal(w.atk, 8);
    assert.match(outcomeOf(g).actions[0], /EQUIPS — fine longsword \(weapon; ATK 8\)/);
    const back = g.state().objects['obj.test.iron_sword'];
    assert.equal(back.holder.entity, 'pc', 'the iron sword back in his pack');
    assert.equal(back.profile.atk, 6, 'with its own ATK');
    // taken off: the fine longsword goes back to his pack with its own values
    await g.reply('The blade sat well.', { expected: {}, deltas: [] });
    await say(g, '*i put the fine longsword away*', { type: 'unequip', object: 'item.obj.test.fine_sword', quote: 'i put the fine longsword away' });
    assert.equal(g.state().entities.pc.sheet.equipment.weapon, undefined);
    assert.equal(g.state().objects['obj.test.fine_sword'].holder.entity, 'pc');
    assert.equal(g.state().objects['obj.test.fine_sword'].profile.atk, 8);
    // dropped while worn: taken off first, then it lies here, still with its own values
    await g.reply('He slid it home.', { expected: {}, deltas: [] });
    await say(g, '*i wield the iron sword*', { type: 'equip', object: 'obj.test.iron_sword', slot: null, quote: 'i wield the iron sword' });
    await g.reply('He took it up.', { expected: {}, deltas: [] });
    await say(g, '*i drop the iron sword*', { type: 'drop', object: 'item.obj.test.iron_sword', qty: null, quote: 'i drop the iron sword' });
    assert.match(outcomeOf(g).actions[0], /DROPS — iron sword \(taken off first/);
    assert.equal(g.state().objects['obj.test.iron_sword'].holder.loc, g.state().scene.at);
    assert.equal(g.state().objects['obj.test.iron_sword'].profile.atk, 6);
    // a piece whose established values differ from what its name would give (a looted "iron sword" of ATK 9): worn with 9
    const h = live(37);
    const s1 = h.state();
    const odd = held('obj.test.odd_sword', 'iron sword', s1);
    odd.d.object.profile = { ...odd.d.object.profile, atk: 9, quality: 'fine' };
    inject(h, [odd]);
    await say(h, '*i take the iron sword in hand*', { type: 'equip', object: 'obj.test.odd_sword', slot: null, quote: 'i take the iron sword in hand' });
    assert.equal(h.state().entities.pc.sheet.equipment.weapon.atk, 9, 'its own established ATK, not what its name gives');
});

test('patch 7.1 (2, 4, 5): Marrec offers a fine and a crude scorchburst scroll: each line carries its own power and guideline, a price far off the guideline is audited; the bought scroll is exactly the variant offered, and a sale and the fold keep it', async () => {
    const g = live(23);
    assert.ok(g.state().scene.present.includes(MARREC));
    await say(g, '*i ask what other scrolls he has*');
    await g.reply('"Two more," Marrec said. "A fine one, forty copper. A crude one, fifteen copper. And a superior one, but that\'s three copper, I want it gone."', { expected: {}, deltas: [
        { seq: 1, type: 'offer', seller: MARREC, lines: [
            { what: 'fine scorchburst scroll', kind: 'goods', service: null, qty: 1, price_cp: 40, said: 'forty copper' },
            { what: 'crude scorchburst scroll', kind: 'goods', service: null, qty: 1, price_cp: 15, said: 'fifteen copper' },
            { what: 'superior scorchburst scroll', kind: 'goods', service: null, qty: 1, price_cp: 3, said: 'three copper' },
        ] },
    ] });
    const offer = Object.values(g.state().offers).find((o) => o.status === 'open' && o.seller === MARREC);
    const [fine, crude, sup] = offer.lines;
    assert.deepEqual([fine.profile.power, crude.profile.power, sup.profile.power], [40, 24, 48], 'each variant its own power, fixed with the offer');
    assert.ok(fine.profile.value_cp > crude.profile.value_cp, 'the stronger worth more');
    assert.equal(fine.audit, undefined);
    assert.equal(crude.audit, undefined);
    assert.match(sup.audit, /far below the guideline/);
    assert.equal(priceAudit(content, fine.profile, 40), null);
    // the story cannot set an item's values: a profile in an offer line is no part of the extractor's vocabulary
    const k = live(23);
    await say(k, '*i ask what other scrolls he has*');
    const forged = await k.reply('"A fine one, forty copper."', { expected: {}, deltas: [{ seq: 1, type: 'offer', seller: MARREC, lines: [{ what: 'fine scorchburst scroll', kind: 'goods', service: null, qty: 1, price_cp: 40, said: 'forty copper', profile: { kind: 'attack', power: 999 } }] }] });
    assert.match(forged.record.extraction.error, /unexpected property "profile"/);
    assert.ok(!Object.values(k.state().offers).some((o) => o.status === 'open' && o.seller === MARREC && o.lines.some((l) => l.profile?.power === 999)));
    // bought (with coin he did not have in the live run): exactly the line's variant; no roll, the same on a regenerate
    inject(g, [{ t: 'coin.changed', d: { id: 'pc', value: 100, delta: 95, why: 'test purse' } }]);
    await say(g, 'i take the fine one *and pay*', { type: 'offer.accept', offer: offer.id, lines: [fine.id], qty: null, quote: 'i take the fine one' });
    const bought = Object.values(g.state().objects).find((o) => o.name === 'fine scorchburst scroll' && o.holder?.entity === 'pc');
    assert.deepEqual(bought.profile, fine.profile);
    const first = JSON.stringify(lastUser(g).events);
    await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm: async () => { throw new Error('no LLM call'); } });
    assert.equal(JSON.stringify(lastUser(g).events), first, 'a regenerate books the same purchase');
    assert.equal(itemEffectOf(content, bought).attack.base, 40);
    // the variant offered is the variant bought, even when the content's standard changed in between
    const h = live(23);
    await say(h, '*i ask what other scrolls he has*');
    await h.reply('"A fine one, forty copper."', { expected: {}, deltas: [{ seq: 1, type: 'offer', seller: MARREC, lines: [{ what: 'fine scorchburst scroll', kind: 'goods', service: null, qty: 1, price_cp: 40, said: 'forty copper' }] }] });
    inject(h, [{ t: 'coin.changed', d: { id: 'pc', value: 100, delta: 95, why: 'test purse' } }]);
    const o2 = Object.values(h.state().offers).find((o) => o.status === 'open' && o.seller === MARREC);
    const tpl = content.skills.get('item.scorchburst');
    const was = tpl.attack.base;
    try {
        tpl.attack.base = 99;
        await say(h, 'i take the fine one *and pay*', { type: 'offer.accept', offer: o2.id, lines: ['l1'], qty: null, quote: 'i take the fine one' });
    } finally { tpl.attack.base = was; }
    assert.equal(Object.values(h.state().objects).find((o) => o.name === 'fine scorchburst scroll' && o.holder?.entity === 'pc').profile.power, 40);
    // sold back to Marrec: it leaves with its own values
    await g.reply('Marrec counted the coins.', { expected: {}, deltas: [] });
    await say(g, '*i offer the fine scroll back to him*');
    await g.reply('"Thirty copper for it," he said.', { expected: {}, deltas: [{ seq: 1, type: 'bid', buyer: MARREC, lines: [{ object: bought.id, qty: 1 }], price_cp: 30, said: 'Thirty copper' }] });
    const bid = Object.values(g.state().offers).find((o) => o.status === 'open' && o.bid);
    await say(g, 'deal *i sell it*', { type: 'offer.accept', offer: bid.id, lines: null, qty: null, quote: 'deal' });
    const sold = g.state().objects[bought.id];
    assert.equal(sold.holder.entity, MARREC);
    assert.deepEqual(sold.profile, fine.profile);
    // the fold from the start: the same values
    assert.deepEqual(foldChat(g.chat, g.chat.length).state.objects[bought.id].profile, fine.profile);
});

test('patch 7.1 (3): a bought or established item keeps its own power after the content\'s standard profile changes; only a thing without a snapshot (the live scroll of c.6.6.17) follows the content', async () => {
    const g = live(37);
    inject(g, [held('obj.test.fine_scroll', 'fine scorchburst scroll', g.state())]);
    const s = g.state();
    const tpl = content.skills.get('item.scorchburst');
    const was = tpl.attack.base;
    try {
        tpl.attack.base = 99;
        assert.equal(itemEffectOf(content, s.objects['obj.test.fine_scroll']).attack.base, 40, 'its snapshot');
        assert.equal(itemEffectOf(content, s.objects[SCROLL]).attack.base, 99, 'the old scroll: the standard profile');
    } finally { tpl.attack.base = was; }
    assert.equal(itemEffectOf(content, s.objects[SCROLL]).attack.base, 32);
});

test('patch 7.1 (6): the same scroll does the same damage whoever throws it: INT, MATK and level of the thrower change nothing', async () => {
    const base = live(37).state();
    const intent = { kind: 'attack', skill: 'item.scorchburst', target: BEETLE(2), target_how: 'area', move: null, move_target: null, item: SCROLL };
    const weak = playerTurn(base, content, TEXT, { msg: 37, c: true, intent });
    const strong = structuredClone(base);
    Object.assign(strong.entities.pc.sheet, { level: 12, stats: { ...strong.entities.pc.sheet.stats, INT: 30, WIL: 20 } });
    strong.entities.pc.sheet.equipment.weapon = { id: 'x', name: 'archmage staff', slot: 'weapon', family: 'focus', matk: 40 };
    const sharp = playerTurn(strong, content, TEXT, { msg: 37, c: true, intent });
    const hits = (t) => t.outcome.records.find((r) => r.item).strikes.map((x) => [x.target, x.final]);
    assert.deepEqual(hits(sharp), hits(weak));
    assert.equal(sharp.outcome.records.find((r) => r.item).raw, 32);
});

test('patch 7.1 (7): an E-Rank scroll and an E-Rank sword can be his but not used by an F-Rank Alaric; once he is E-Rank both work; nothing is used up by the refusal', async () => {
    const g = live(37);
    const s0 = g.state();
    inject(g, [held('obj.test.e_scroll', 'E-Rank scorchburst scroll', s0), held('obj.test.e_sword', 'E-Rank longsword', s0)]);
    assert.equal(g.state().objects['obj.test.e_scroll'].profile.rank, 'E');
    assert.match(rankRefusal(content, 1, g.state().objects['obj.test.e_scroll'].profile), /Power Rank is F: he may carry, keep or sell it, but not activate it/);
    // activating: refused before anything starts, nothing used up
    await say(g, TEXT, USE('obj.test.e_scroll'));
    let r = lastUser(g);
    assert.ok(!r.events.some((e) => ['object.consumed', 'encounter.started'].includes(e.t)));
    assert.match(outcomeOf(g).text, /E-Rank item; Alaric's Power Rank is F: .*not activate it\. Nothing was used up/);
    assert.equal(g.state().objects['obj.test.e_scroll'].holder.entity, 'pc');
    // and the combat path refuses it too (a second guard, src/combat.js attackAction), with no cost
    const forced = playerTurn(g.state(), content, TEXT, { msg: 38, c: true, intent: { kind: 'attack', skill: 'item.scorchburst', target: BEETLE(2), target_how: 'area', move: null, move_target: null, item: 'obj.test.e_scroll' } });
    assert.ok(!forced.events.some((e) => e.t === 'object.consumed'));
    const s1 = g.state();
    const enc = initEncounter(s1, content, Dice.from(s1), { actor: 'pc', target: BEETLE(2) }, [{ id: BEETLE(2), side: 'hostile' }], 'enc.test', { c: true });
    assert.match(attackAction({ enc, content, dice: Dice.from(s1), state: s1, c: true }, 'pc', BEETLE(2), 'item.scorchburst', { item: 'obj.test.e_scroll', burst: [BEETLE(2)] }).illegal, /E-Rank item; Alaric's Power Rank is F/);
    // wearing: refused, the sword stays in his pack
    const h = live(37);
    inject(h, [held('obj.test.e_sword', 'E-Rank longsword', s0)]);
    await say(h, '*i draw the new longsword and wield it*', { type: 'equip', object: 'obj.test.e_sword', slot: null, quote: 'wield it' });
    assert.match(outcomeOf(h).actions[0], /CANNOT EQUIP — .*E-Rank item; Alaric's Power Rank is F/);
    assert.equal(h.state().objects['obj.test.e_sword'].holder.entity, 'pc');
    // Power Rank E (level 15): both work
    const k = live(37);
    inject(k, [held('obj.test.e_scroll', 'E-Rank scorchburst scroll', s0), held('obj.test.e_sword', 'E-Rank longsword', s0), { t: 'level.up', d: { id: 'pc', level: 15, free_points: 0, favored: [], xp_after: 0 } }]);
    await say(k, '*i draw the new longsword and wield it*', { type: 'equip', object: 'obj.test.e_sword', slot: null, quote: 'wield it' });
    assert.match(outcomeOf(k).actions[0], /EQUIPS — E-Rank longsword \(weapon; ATK 11\)/);
    await k.reply('He settled the blade.', { expected: {}, deltas: [] });
    await say(k, TEXT, USE('obj.test.e_scroll'));
    r = lastUser(k);
    assert.equal(r.events.filter((e) => e.t === 'object.consumed').length, 1);
    assert.equal(thrown(k).raw, 56, 'the E-Rank scroll\'s own power');
});

// ================================================================================================ AoE without a cap
test('patch 7.1 (8, 12): three beetles in one knot at SHORT: all three are struck; those at SHORT but apart, and the one at his side, are not', async () => {
    const g = live(37);
    inject(g, [at(2, 'SHORT', 'vein'), at(3, 'SHORT', 'vein'), at(4, 'SHORT', 'vein'), ...[6, 7, 8, 9, 10, 11, 12].map((n) => at(n, 'SHORT', null))]);
    const s = g.state();
    assert.deepEqual(burstCaught(s, BEETLE(2)), [2, 3, 4].map(BEETLE));
    assert.deepEqual(burstCaught(s, BEETLE(6)), [BEETLE(6)], 'one standing apart is struck alone');
    await say(g, TEXT, USE());
    assert.deepEqual(thrown(g).strikes.map((x) => x.target).sort(), [2, 3, 4].map(BEETLE).sort());
});

test('patch 7.1 (9, 18): eleven beetles in one close knot: all eleven are struck, not three; the record, the narrator block and the panel carry all eleven', async () => {
    const g = live(37);
    inject(g, ALIVE.map((n) => at(n, 'SHORT', 'vein')));
    await say(g, TEXT, USE());
    const hit = thrown(g);
    assert.equal(hit.strikes.length, 11);
    assert.deepEqual(hit.strikes.map((x) => x.target).sort(), ALIVE.map(BEETLE).sort());
    const block = turnBlock(g.chat, g.chat.length - 1, content, {}).context.text;
    assert.match(block, /its burst strikes exactly the 11 below[^\n]*strike 11: lands: \d+ damage -> Crystal Beetle [A-L]/);
    const panel = String(turnPanel(g.state(), content));
    assert.equal((panel.match(/\d+ damage → Crystal Beetle [A-L] HP/g) || []).length, 11, panel);
});

test('patch 7.1 (10, 12): eleven beetles at SHORT in two knots (six at the vein, five on the ledge): the scroll is thrown at the larger knot and strikes those six only', async () => {
    const g = live(37);
    const vein = [1, 2, 3, 4, 6, 7];
    const ledge = [8, 9, 10, 11, 12];
    inject(g, [...vein.map((n) => at(n, 'SHORT', 'vein')), ...ledge.map((n) => at(n, 'SHORT', 'ledge'))]);
    const s = g.state();
    assert.equal(clusterOf(s, BEETLE(8)), 'ledge');
    assert.ok(vein.map(BEETLE).includes(burstAim(s, 'SHORT')));
    await say(g, TEXT, USE());
    assert.deepEqual(thrown(g).strikes.map((x) => x.target).sort(), vein.map(BEETLE).sort());
    for (const n of ledge) assert.ok(!thrown(g).strikes.some((x) => x.target === BEETLE(n)), `${n} on the ledge is not struck`);
});

test('patch 7.1 (11): a person standing in the knot is struck by the fire too (no foe, still caught); she enters the fight on her own side', async () => {
    const g = live(37);
    const s0 = g.state();
    const SURVEYOR = 'npc.test_surveyor';
    inject(g, [
        { t: 'entity.created', d: { entity: { id: SURVEYOR, kind: 'npc', name: null, descriptors: ['academy surveyor', 'woman with a chalk-line'], traits: '', status: 'alive', location: s0.scene.location, created: { turn: s0.turn, minute: s0.clock.minute }, source: { kind: 'narration', msg: 36 }, card: {}, template: 'commoner' } } },
        { t: 'scene.entered', d: { id: SURVEYOR, band: 'SHORT' } },
        at(SURVEYOR, 'SHORT', 'vein'), at(2, 'SHORT', 'vein'), at(3, 'SHORT', 'vein'), ...[4, 6, 7, 8, 9, 10, 11, 12].map((n) => at(n, 'SHORT', null)),
    ]);
    await say(g, TEXT, USE());
    const struck = thrown(g).strikes.map((x) => x.target);
    assert.ok(struck.includes(SURVEYOR), struck.join());
    assert.deepEqual(struck.filter((id) => id !== SURVEYOR).sort(), [2, 3].map(BEETLE).sort());
    const enc = lastUser(g).events.find((e) => e.t === 'encounter.started').d.encounter;
    assert.notEqual(enc.combatants[SURVEYOR].side, 'hostile', 'caught, not a foe');
});

test('patch 7.1 (13, 14): in the running first fight the burst strikes Beetle H and the two of its knot beside him, not one of them set apart at his side; each by its own HP, MDEF and XP', async () => {
    const H = BEETLE(5);
    const g = live(33);
    // final review: beetles of one swarm at his side are no knot by being one swarm
    inject(g, [at(1, 'ENGAGED', undefined), at(2, 'ENGAGED', undefined), at(3, 'ENGAGED', undefined)]);
    assert.deepEqual(burstCaught(g.state(), H), [H], 'one swarm at one distance: H alone');
    // the story packs H, 1 and 2 together at his boots; 3 stands apart
    inject(g, [at(5, 'ENGAGED', 'boots'), at(1, 'ENGAGED', 'boots'), at(2, 'ENGAGED', 'boots'), at(3, 'ENGAGED', null)]);
    const s = g.state();
    assert.deepEqual(burstCaught(s, H).sort(), [H, BEETLE(1), BEETLE(2)].sort(), 'the knot the story established; 3 is apart');
    await say(g, TEXT, USE());
    const hit = thrown(g);
    assert.deepEqual(hit.strikes.map((x) => x.target).sort(), [H, BEETLE(1), BEETLE(2)].sort());
    const enc = g.state().encounter || lastUser(g).events.findLast((e) => e.t.startsWith('encounter.') && e.d.encounter)?.d.encounter;
    for (const x of hit.strikes) {
        const p = s.entities[x.target].profile;
        assert.equal(x.defense, p.mdef, `${x.target} against its own MDEF`);
        if (x.target !== H) assert.equal(x.hp_before, p.max_hp, `${x.target} from its own HP`);
    }
    if (enc) assert.notEqual(enc.combatants[BEETLE(1)].fixed.defeat_xp, enc.combatants[BEETLE(2)].fixed.defeat_xp, 'XP by its own level (13 vs 5)');
});

test('patch 7.1 (15, 17): a burst that fells a whole knot of four gives XP and loot once per fallen beetle; a swipe of the turn doubles nothing', async () => {
    const g = live(37);
    const knot = [2, 3, 4, 6];
    inject(g, [...knot.map((n) => at(n, 'SHORT', 'vein')), ...[7, 8, 9, 10, 11, 12].map((n) => at(n, 'MEDIUM', null)),
        ...knot.map((n) => ({ t: 'entity.updated', d: { id: BEETLE(n), set: { profile: { ...g.state().entities[BEETLE(n)].profile, hp: 4 } } } })),
        // Patch 8.1: the swarm's others would enter the fight with the knot it strikes (src/v4/group_combat.js); here only
        // the knot is left at the vein (a scene the live run did not have)
        ...[1, 7, 8, 9, 10, 11, 12].map((n) => ({ t: 'scene.left', d: { id: BEETLE(n) } }))]);
    await say(g, TEXT, USE());
    const r = lastUser(g);
    const o = outcomeOf(g);
    assert.deepEqual(o.ended.defeated.sort(), knot.map(BEETLE).sort());
    const enc = r.events.find((e) => e.t === 'encounter.started').d.encounter;
    assert.equal(o.ended.xp_awarded, knot.reduce((n, k) => n + enc.combatants[BEETLE(k)].fixed.defeat_xp, 0), 'each fallen beetle\'s XP once');
    assert.equal(r.events.filter((e) => e.t === 'xp.changed').length, 1);
    assert.deepEqual(r.events.filter((e) => e.t === 'entity.updated' && e.d.set?.looted).map((e) => e.d.id).sort(), knot.map(BEETLE).sort(), 'each looted once');
    const first = JSON.stringify(r.events);
    const xp = g.state().entities.pc.sheet.xp;
    await prepareGenerationAsync(g.chat, content, { type: 'swipe', settings: { planner: true }, llm: async () => { throw new Error('no LLM call'); } });
    assert.equal(JSON.stringify(lastUser(g).events), first);
    assert.equal(g.state().entities.pc.sheet.xp, xp);
    assert.equal(g.chat.flatMap((m) => rec(m)?.events || []).filter((e) => e.t === 'object.consumed' && e.d.id === SCROLL).length, 1);
});

test('patch 7.1 (16): with no foe in reach, thrown at one beyond it, or of too high a Rank, the scroll stays his (see also hotfix scroll 6)', async () => {
    const g = live(37);
    inject(g, ALIVE.map((n) => at(n, 'MEDIUM', 'vein')));
    const prep = await say(g, TEXT, USE());
    assert.equal(prep.action, 'panels');
    assert.equal(g.state().objects[SCROLL].holder.entity, 'pc');
    const far = playerTurn(live(37).state(), content, TEXT, { msg: 37, c: true, intent: { kind: 'attack', skill: 'item.scorchburst', target: BEETLE(2), target_how: 'planner', move: null, move_target: null, item: SCROLL } });
    assert.ok(far.events.some((e) => e.t === 'object.consumed'), 'in reach: thrown');
    const s = live(37).state();
    s.scene.positions[BEETLE(2)] = { band: 'LONG', cover: 'none' };
    const refused = playerTurn(s, content, TEXT, { msg: 37, c: true, intent: { kind: 'attack', skill: 'item.scorchburst', target: BEETLE(2), target_how: 'planner', move: null, move_target: null, item: SCROLL } });
    assert.equal(refused.outcome.not_started, true);
    assert.ok(!refused.events.some((e) => e.t === 'object.consumed'));
});

test('patch 7.1: the guideline grows with quality and Rank; ordinary things get no profile; a story establishing an "E-Rank" thing gives it that Rank', () => {
    const p = (n) => itemProfile(content, { name: n });
    assert.deepEqual(['rusty sword', 'iron sword', 'fine longsword', 'masterwork longsword', 'enchanted longsword'].map((n) => p(n).atk), [4, 6, 8, 10, 12]);
    assert.deepEqual(['crude scorchburst scroll', 'scorchburst scroll', 'fine scorchburst scroll', 'superior scorchburst scroll', 'enchanted scorchburst scroll'].map((n) => p(n).power), [24, 32, 40, 48, 59]);
    const values = ['crude scorchburst scroll', 'scorchburst scroll', 'fine scorchburst scroll'].map((n) => p(n).value_cp);
    assert.ok(values[0] < values[1] && values[1] < values[2], values.join());
    assert.equal(p('E-Rank longsword').rank, 'E');
    assert.ok(p('E-Rank longsword').value_cp > p('fine longsword').value_cp);
    for (const n of ['heel of bread', 'flint and steel', 'Guild plate']) assert.equal(p(n), null, n);
    assert.equal(p('minor healing potion').kind, 'restore', 'Patch 7.2: a healing potion restores HP');
    assert.equal(p('Starter Arcane Staff').matk, 6, 'a content template keeps its values');
});

test('patch 7.1: the story establishes the knots through the position delta (cluster), "apart" sets one alone; the engine reads the strikes from that stored state, and a later report cannot widen a burst already thrown', async () => {
    const g = live(37);
    await say(g, '*i watch how they gather*');
    await g.reply('Four of them crowd onto the thickest knot of the vein; the one with the notched shell keeps apart.', { expected: {}, deltas: [
        ...[2, 3, 4, 6].map((n, i) => ({ seq: i + 1, type: 'position', who: BEETLE(n), band: 'SHORT', cover: null, cluster: 'knot' })),
        { seq: 5, type: 'position', who: BEETLE(7), band: 'SHORT', cover: null, cluster: 'apart' },
    ] });
    const s = g.state();
    assert.deepEqual([2, 3, 4, 6].map((n) => clusterOf(s, BEETLE(n))), ['knot', 'knot', 'knot', 'knot']);
    assert.equal(clusterOf(s, BEETLE(7)), null);
    assert.equal(clusterOf(s, BEETLE(8)), null, 'the rest of the swarm: one group, no knot (final review of Patch 7.1)');
    assert.deepEqual(burstCaught(s, BEETLE(2)), [2, 3, 4, 6].map(BEETLE));
    assert.deepEqual(burstCaught(s, BEETLE(7)), [BEETLE(7)]);
    // an engine step moves them all one band nearer and keeps the knot (the reducer keeps the cluster when only the band changes)
    await say(g, '*i step toward the vein*', { type: 'move', dir: 'closer', target: null, quote: 'i step toward the vein' });
    const moved = g.state();
    assert.equal(moved.scene.positions[BEETLE(2)].band, 'ENGAGED');
    assert.deepEqual([2, 3, 4, 6].map((n) => clusterOf(moved, BEETLE(n))), ['knot', 'knot', 'knot', 'knot']);
    await g.reply('He closed in.', { expected: {}, deltas: [] });
    await say(g, TEXT, USE());
    const struck = thrown(g).strikes.map((x) => x.target);
    // a report after the throw that puts everyone into the knot changes nothing of what was struck
    await g.reply('All of them were caught, the story claims.', { expected: {}, deltas: ALIVE.map((n, i) => ({ seq: i + 1, type: 'position', who: BEETLE(n), band: 'SHORT', cover: null, cluster: 'knot' })) });
    assert.deepEqual(rec(g.chat.findLast((m) => m.is_user)).events.findLast((e) => e.t === 'outcome.recorded').d.outcome.records.find((r) => r.item).strikes.map((x) => x.target), struck);
});

// ------------------------------------------------------------------------------------------- final review of Patch 7.1
const GOBLIN = (n) => `mon.tunnel_goblins_${n}`;
const TWELVE = Array.from({ length: 12 }, (_, i) => i + 1);
/** Twelve tunnel goblins come in as one group at SHORT (creature.new count 12), packed close only when `cluster` says so. */
/**
 * Patch 8.4.1: the grotto as a cave of the sandbox, not a Living Dungeon. There only the engine adds foes (a creature the
 * story brings in fills an encounter of the engine or is no foe, src/v4/world.js); these cases are about a group the
 * story brings, wherever it is.
 */
function sandboxCave(g) {
    const p = g.state().places['loc.glimmerdeep_grotto'];
    inject(g, [{ t: 'place.updated', d: { id: p.id, set: { dungeon: { ...p.dungeon, real: false } } } }]);
}
async function goblins(cluster = null) {
    const g = live(37);
    sandboxCave(g);
    await say(g, '*i watch the side passage*');
    await g.reply('Twelve tunnel goblins spill out of the side passage and spread across the chamber floor.', { expected: {}, deltas: [
        { seq: 1, type: 'creature.new', ref: 'tunnel goblins', species: 'tunnel goblin', anchor: 'goblin', desc: ['grey-skinned'], count: 12, present: true, band: 'SHORT', cluster, stronger: null, threat: null, more: null },
    ] });
    return g;
}

test('patch 7.1 final review (1): a group of twelve at one distance is no knot; four of it packed close are struck, the other eight are not', async () => {
    const g = await goblins();
    let s = g.state();
    assert.deepEqual(TWELVE.map((n) => s.scene.positions[GOBLIN(n)]?.band), TWELVE.map(() => 'SHORT'), 'all twelve at SHORT');
    assert.equal(new Set(TWELVE.map((n) => s.entities[GOBLIN(n)].group)).size, 1, 'one group');
    assert.deepEqual(TWELVE.map((n) => clusterOf(s, GOBLIN(n))), TWELVE.map(() => null), 'one group is who they are, not where they stand');
    assert.deepEqual(burstCaught(s, GOBLIN(1)), [GOBLIN(1)]);
    // the story packs four of them together
    await say(g, '*i wait*');
    await g.reply('Four of them crowd shoulder to shoulder around a dropped crust; the rest hang back along the walls.', { expected: {}, deltas: [1, 2, 3, 4].map((n, i) => ({ seq: i + 1, type: 'position', who: GOBLIN(n), band: 'SHORT', cover: null, cluster: 'crust' })) });
    s = g.state();
    assert.deepEqual(burstCaught(s, GOBLIN(1)), [1, 2, 3, 4].map(GOBLIN));
    for (const n of [5, 6, 12]) assert.deepEqual(burstCaught(s, GOBLIN(n)), [GOBLIN(n)], `goblin ${n} stands alone`);
    await say(g, TEXT, USE());
    const struck = thrown(g).strikes.map((x) => x.target);
    assert.deepEqual([...struck].sort(), [1, 2, 3, 4].map(GOBLIN).sort(), 'the knot of four, the largest within reach');
    for (const n of [5, 6, 7, 8, 9, 10, 11, 12]) assert.ok(!struck.includes(GOBLIN(n)), `goblin ${n} is not struck`);
    assert.equal(lastUser(g).events.filter((e) => e.t === 'object.consumed').length, 1);
});

test('patch 7.1 final review (1): a reply that shows a group packed close stores the knot as it brings them in (creature.new cluster) or later (position by the group\'s ref); "apart" takes one out', async () => {
    const g = await goblins('passage mouth');
    let s = g.state();
    assert.deepEqual(TWELVE.map((n) => clusterOf(s, GOBLIN(n))), TWELVE.map(() => 'passage mouth'));
    assert.equal(burstCaught(s, GOBLIN(1)).length, 12, 'no cap: the whole knot');
    await say(g, '*i wait*');
    await g.reply('One of them slinks off from the others toward the vein.', { expected: {}, deltas: [{ seq: 1, type: 'position', who: GOBLIN(12), band: 'SHORT', cover: null, cluster: 'apart' }] });
    s = g.state();
    assert.equal(clusterOf(s, GOBLIN(12)), null);
    assert.deepEqual(burstCaught(s, GOBLIN(1)), TWELVE.slice(0, 11).map(GOBLIN));
    // "apart" for a group brought in is no knot of that name
    const a = await goblins('apart');
    assert.deepEqual(TWELVE.map((n) => clusterOf(a.state(), GOBLIN(n))), TWELVE.map(() => null));
    // spread out, then crowded together again: the group's ref moves each of them into the knot
    const h = await goblins();
    await say(h, '*i wait*');
    await h.reply('The goblins bunch together at the passage mouth, jostling.', { expected: {}, deltas: [{ seq: 1, type: 'position', who: 'tunnel goblins', band: 'SHORT', cover: null, cluster: 'passage mouth', scope: 'all', evidence: 'The goblins bunch together' }] });
    assert.deepEqual(TWELVE.map((n) => clusterOf(h.state(), GOBLIN(n))), TWELVE.map(() => 'passage mouth'));
});

test('patch 7.1 final review (2): a Rank in brackets, before or after the word Rank is read for F, E, D, C, B, A and S; never stored as F', () => {
    const forms = ['[X] wand', '[X-Rank] wand', 'X-Rank wand', 'X rank wand', 'Rank X wand', 'rank-x wand', 'a fine [X] longsword'];
    for (const r of ['F', 'E', 'D', 'C', 'B', 'A', 'S']) {
        for (const f of forms) {
            const name = f.replace('X', r).replace('x', r.toLowerCase());
            assert.equal(rankInName(name), r, name);
            const p = itemProfile(content, { name });
            assert.equal(p?.rank, r, `${name}: profile rank`);
        }
        const scroll = itemProfile(content, { name: `[${r}] scorchburst scroll` });
        assert.equal(scroll.kind, 'attack');
        assert.equal(scroll.rank, r);
    }
    // the higher Rank scales the piece and is kept on the object
    assert.ok(itemProfile(content, { name: '[D] wand' }).matk > itemProfile(content, { name: 'wand' }).matk);
    assert.equal(itemTraits(content, { name: '[D] wand' }, 0).profile.rank, 'D');
    // and an F-Rank Alaric may not use it
    assert.match(rankRefusal(content, 1, itemProfile(content, { name: '[D] wand' })), /D-Rank item; Alaric's Power Rank is F/);
    // no Rank where none is stated: the adjective, words that merely contain the letters
    for (const name of ['a rank, rotting hide', 'iron sword', 'frank\'s dagger', 'ranks of spears', 'cranky old wand', 'rank and file shield']) assert.equal(rankInName(name), null, name);
});
