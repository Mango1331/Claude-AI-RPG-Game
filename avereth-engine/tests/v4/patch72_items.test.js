// Patch 7.2D (4.3.0-c.6.6.21): restorative consumables. A healing potion, a mana potion and a stamina tonic restore what
// their own profile says (content gear item_effects, fixed on the object when it is established: object.profile kind
// restore), never above Alaric's maximum, never what the story claims. Outside a fight the story command use books it;
// in a fight it is his main action on his Turn (src/combat.js itemAction), as a skill: the Turns before his resolve
// first, the foes act after, a second main action is not taken. Used up only once resolved; refused at no cost.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { foldChat, rec, turnBlock } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { itemTraits, itemProfile } from '../../src/v4/items.js';
import { turnPanel } from '../../src/display.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1020.json'), 'utf8'));
const BEETLE = (n) => `mon.crystal_beetle_swarm_${n}`;
const POTION = 'obj.test.healing_potion';
const MANA = 'obj.test.mana_potion';
const TONIC = 'obj.test.stamina_tonic';

/** Alaric of the live run (a level-1 Mage: HP 80, MP 72, STA 100 at most) at #37, with potions and his vitals set. */
function live({ hp = 40, mp = 20, sta = 50, potions = 3 } = {}) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, 37).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => {
        if (!req.purpose.startsWith('plan')) return ask(req);
        g.calls.push({ purpose: req.purpose });
        return g.plans.shift() ?? null;
    };
    const s = foldChat(g.chat).state;
    const thing = (id, name, qty = 1) => ({ t: 'object.created', d: { object: { id, name, kind: 'item', stack: qty > 1, qty, unit: null, ...itemTraits(content, { name }, s.clock.minute), holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: s.turn, how: 'bought' } } } });
    g.chat.at(-1).extra.avereth.events.splice(-1, 0,
        thing(POTION, 'healing potion', potions), thing(MANA, 'mana potion'), thing(TONIC, 'stamina tonic'),
        ...[['hp', hp], ['mp', mp], ['sta', sta]].map(([resource, value]) => ({ t: 'resource.changed', d: { id: 'pc', resource, value } })));
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    if (r.action === 'panels') g.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
    return r;
}
const drink = (object, quote = 'i drink the potion') => ({ type: 'use', object, qty: 1, quote });
const lastUser = (g) => rec(g.chat.findLast((m) => m.is_user));
const outcomeOf = (g) => lastUser(g).events.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
const vitals = (g) => { const sh = g.state().entities.pc.sheet; return { hp: sh.hp, mp: sh.mp, sta: sh.sta }; };
const qtyOf = (g, id) => { const o = g.state().objects[id]; return o && !o.holder?.consumed ? o.qty ?? 1 : 0; };
/** A fight with beetle A at his side: he strikes it, it bites back (the live seed). */
async function fight(g) {
    await say(g, '*i hit the beetle at my feet with my staff*', { type: 'use_skill', skill: 'mage.basic_attack', target: BEETLE(1), quote: 'i hit the beetle at my feet with my staff' });
    await g.reply('Staff meets shell; the beetle bites back.', { expected: {}, deltas: [] });
    assert.ok(g.state().encounter, 'a fight runs');
}

test('patch 7.2D: outside a fight a healing potion, a mana potion and a stamina tonic restore exactly their amount, once, and are used up one each', async () => {
    const g = live();
    assert.deepEqual(['healing potion', 'mana potion', 'stamina tonic'].map((n) => [itemProfile(content, { name: n }).resource, itemProfile(content, { name: n }).amount]), [['hp', 30], ['mp', 25], ['sta', 30]]);
    // quality and Rank scale the amount (fixed on the object when it is established)
    assert.deepEqual(['crude healing potion', 'fine healing potion', 'superior healing potion', '[E] healing potion'].map((n) => itemProfile(content, { name: n }).amount), [23, 38, 45, 53]);
    await say(g, '*i drink a healing potion, then the mana potion and the tonic*', drink(POTION, 'i drink a healing potion'), drink(MANA, 'the mana potion'), drink(TONIC, 'the tonic'));
    assert.deepEqual(vitals(g), { hp: 70, mp: 45, sta: 80 });
    assert.equal(qtyOf(g, POTION), 2, 'one of three drunk');
    assert.equal(qtyOf(g, MANA), 0);
    assert.equal(qtyOf(g, TONIC), 0);
    const lines = outcomeOf(g).actions.join('\n');
    assert.match(lines, /USES — healing potion: HP 40 → 70 \(\+30\); 2 left/);
    assert.match(lines, /USES — mana potion: MP 20 → 45 \(\+25\); it is used up/);
    assert.match(lines, /USES — stamina tonic: STA 50 → 80 \(\+30\); it is used up/);
    // the narrator hears the engine's numbers; the fold and a swipe hold the same and heal nothing twice
    const u = g.chat.findLastIndex((m) => m.is_user);
    assert.match(turnBlock(g.chat, u, content, {}).context.text, /HP 40 → 70/);
    assert.deepEqual(foldChat(g.chat).state.entities.pc.sheet.hp, 70);
    const events = JSON.stringify(lastUser(g).events);
    await prepareGenerationAsync(g.chat, content, { type: 'swipe', settings: { planner: true }, llm: g.llm });
    assert.equal(JSON.stringify(lastUser(g).events), events);
    assert.deepEqual(vitals(g), { hp: 70, mp: 45, sta: 80 });
});

test('patch 7.2D: never above the maximum; at the maximum it is refused and stays his; two drunk at once stop where he is full; an unknown draught heals nothing', async () => {
    const g = live({ hp: 70 });
    await say(g, '*i drink two healing potions*', { type: 'use', object: POTION, qty: 2, quote: 'i drink two healing potions' });
    assert.equal(vitals(g).hp, 80, 'max 80');
    assert.equal(qtyOf(g, POTION), 2, 'only the first was needed: one used');
    assert.match(outcomeOf(g).actions[0], /USES — healing potion: HP 70 → 80 \(\+10; 20 beyond his maximum of 80 is lost\); 2 left/);
    await say(g, '*i drink another healing potion*', drink(POTION, 'i drink another healing potion'));
    assert.match(outcomeOf(g).actions[0], /CANNOT USE — his HP is full \(80\/80\).*nothing was drunk or used up, it stays his/);
    assert.equal(qtyOf(g, POTION), 2);
    assert.ok(!lastUser(g).events.some((e) => e.t === 'object.consumed' || e.t === 'resource.changed'));
    // a draught the engine knows no effect of: used up as before, no HP
    const h = live();
    const s = h.state();
    h.chat.at(-1).extra.avereth.events.splice(-1, 0, { t: 'object.created', d: { object: { id: 'obj.test.murky', name: 'murky green draught', kind: 'item', stack: false, qty: 1, unit: null, ...itemTraits(content, { name: 'murky green draught' }, s.clock.minute), holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: s.turn, how: 'story' } } } });
    await say(h, '*i drink the murky draught*', drink('obj.test.murky', 'i drink the murky draught'));
    assert.equal(vitals(h).hp, 40, 'no HP from a draught the engine knows nothing of');
    // the story establishing one with a known effect (object.new effect, checked: a consumable at all)
    assert.equal(itemProfile(content, { name: 'murky green draught', effect: 'heal' }).amount, 30);
    assert.equal(itemProfile(content, { name: 'coil of rope', effect: 'heal' }), null, 'no rope heals');
    // the story cannot heal him: his HP is the engine's
    await h.reply('The draught burns going down, and he feels whole again.', { expected: {}, deltas: [{ seq: 1, type: 'fact', s: 'pc', p: 'hp', o: '80' }] });
    assert.equal(vitals(h).hp, 40);
    assert.ok(rec(h.chat.at(-1)).rejected.some((x) => x.rule === 'engine_owned_fact'));
});

test('patch 7.2D: in a fight a healing potion is his main action on his Turn: the Turn order holds, the foe acts after, the record and the narrator carry it; a second main action is not taken', async () => {
    const g = live({ hp: 60 });
    await fight(g);
    const before = vitals(g).hp;
    const order = g.state().encounter.order;
    await say(g, '*i drink a healing potion and then hit the beetle*', drink(POTION, 'i drink a healing potion'), { type: 'use_skill', skill: 'mage.basic_attack', target: BEETLE(1), quote: 'then hit the beetle' });
    const o = outcomeOf(g);
    assert.equal(o.kind, 'combat');
    const mine = o.records.filter((r) => r.actor === 'pc');
    assert.equal(mine.length, 1, 'one main action');
    assert.equal(mine[0].kind, 'item');
    assert.deepEqual([mine[0].restore.before, mine[0].restore.after], [before, Math.min(80, before + 30)]);
    assert.equal(mine[0].used_up, 'one used, 2 left');
    assert.ok(o.plan_notes.some((n) => /not taken this turn \(one main action per turn\): "then hit the beetle"/.test(n)), o.plan_notes.join('\n'));
    assert.ok(o.records.some((r) => r.actor === BEETLE(1) && r.kind === 'attack'), 'the beetle acts in its place in the order');
    assert.deepEqual(g.state().encounter.order, order, 'the Turn order is unchanged');
    assert.equal(qtyOf(g, POTION), 2);
    // the HP the next round sees: after the potion, then the bite
    const bite = o.records.filter((r) => r.actor === BEETLE(1)).flatMap((r) => r.strikes || []).reduce((a, x) => a + x.final - (x.absorbed || 0), 0);
    assert.equal(vitals(g).hp, Math.min(80, before + 30) - bite);
    assert.equal(g.state().encounter.combatants.pc.current.hp, vitals(g).hp);
    const u = g.chat.findLastIndex((m) => m.is_user);
    assert.match(turnBlock(g.chat, u, content, {}).context.text, new RegExp(`Alaric: drinks healing potion \\(his main action this Turn; one used, 2 left\\): HP ${before}->${Math.min(80, before + 30)}`));
    assert.match(String(turnPanel(g.state(), content)), /Alaric: drinks healing potion → HP \d+ \+ \d+ = \d+/);
    // the fold has the same; a swipe drinks nothing twice
    assert.equal(foldChat(g.chat).state.entities.pc.sheet.hp, vitals(g).hp);
    const events = JSON.stringify(lastUser(g).events);
    await prepareGenerationAsync(g.chat, content, { type: 'swipe', settings: { planner: true }, llm: g.llm });
    assert.equal(JSON.stringify(lastUser(g).events), events);
    assert.equal(qtyOf(g, POTION), 2);
});

test('patch 7.2D: in a fight MP and STA potions work the same; a step and a potion in one Turn; a tonic at full STA is refused at no cost; a committed attack still comes first', async () => {
    const g = live({ hp: 80, mp: 10, sta: 40 });
    await fight(g);
    await say(g, '*i drink the mana potion*', drink(MANA, 'i drink the mana potion'));
    assert.deepEqual(outcomeOf(g).records.find((r) => r.actor === 'pc').restore, { resource: 'mp', amount: 25, of: 25, before: 10, after: 35, max: 72 });
    await g.reply('He gulps it down.', { expected: {}, deltas: [] });
    // a step back and the tonic: one move, one main action
    await say(g, '*i step back and drink the tonic*', { type: 'move', dir: 'away', target: null, quote: 'i step back' }, drink(TONIC, 'drink the tonic'));
    const t = outcomeOf(g).records.find((r) => r.actor === 'pc');
    assert.equal(t.kind, 'item');
    assert.ok(t.step, 'the step came first');
    assert.deepEqual([t.restore.before, t.restore.after], [40, 70]);
    await g.reply('He backs off and drinks.', { expected: {}, deltas: [] });
    // at full STA the tonic does nothing: refused at no cost (nothing drunk, nothing used up, no Turn of the foes)
    const h = live({ hp: 80, sta: 100 });
    await fight(h);
    const turns = h.state().encounter.log.length;
    await say(h, '*i drink the stamina tonic*', drink(TONIC, 'i drink the stamina tonic'));
    assert.match(String(outcomeOf(h).illegal), /STA is full \(100\/100\).*nothing was drunk or used up/);
    assert.equal(qtyOf(h, TONIC), 1);
    assert.ok(!lastUser(h).events.some((e) => e.t === 'object.consumed'));
    assert.equal(h.state().encounter.log.length, turns, 'no Turn was spent');
    // with a step: refused before the step, he stays where he stood
    const band = h.state().encounter.combatants.pc.current.band;
    await say(h, '*i step back and drink the stamina tonic*', { type: 'move', dir: 'away', target: null, quote: 'i step back' }, drink(TONIC, 'drink the stamina tonic'));
    assert.match(String(outcomeOf(h).illegal), /STA is full/);
    assert.equal(h.state().encounter.combatants.pc.current.band, band, 'no step taken');
    // the story command use in a fight (V4-A: no planner) drinks nothing outside the Turn order
    const a = playerTurnV4(h.state(), content, '*i drink a healing potion*', { msg: h.chat.length, commands: [{ seq: 1, ...drink(POTION, 'i drink a healing potion') }], interp: { version: 'test', ms: 0, source: 'json', failed: false, error: null } });
    assert.match(a.events.findLast((e) => e.t === 'outcome.recorded').d.outcome.actions[0], /CANNOT USE — in a fight healing potion is his main action on his Turn/);
    assert.ok(!a.events.some((e) => e.t === 'object.consumed' || e.t === 'resource.changed'));
    // an attack the story committed before his Turn (Core #23) resolves first, then his potion
    const k = live({ hp: 50 });
    await say(k, '*i watch the beetle at my feet*', { type: 'activity', kind: 'wait', what: 'watching', minutes: 1, until: null, quote: 'i watch the beetle at my feet' });
    await k.reply('The beetle at his feet lunges.', { expected: {}, deltas: [{ seq: 1, type: 'hostile', by: [BEETLE(1)], scope: null, evidence: null }] });
    // the commitment opens the fight at once: the beetle's Turn before his (Core #23) is resolved and shown first
    assert.ok(rec(k.chat.at(-1)).events.some((e) => e.t === 'combat.pending' && e.d.by === BEETLE(1)));
    assert.ok(k.state().encounter, 'the fight is open');
    const bitten = vitals(k).hp;
    assert.ok(bitten < 50, 'bitten before his Turn');
    await say(k, '*i drink a healing potion*', drink(POTION, 'i drink a healing potion'));
    const rs = outcomeOf(k).records;
    const mine = rs.find((r) => r.actor === 'pc' && r.kind === 'item');
    assert.equal(mine.restore.before, bitten, 'his potion on the HP the bite left');
    assert.equal(mine.restore.after, Math.min(80, bitten + 30));
});
