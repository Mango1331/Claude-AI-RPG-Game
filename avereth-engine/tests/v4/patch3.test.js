// Patch 3 (mechanical consistency and player agency; live run of 18.10.2026, tests/v4/live_1018_weald.json): the run's
// own recorded planner and extractor answers replayed through the product's host path (#8 the chartmaker's "two
// silver", #20 the wood pigeons, #42 the wolf stored dead, #51 the flint and steel), and the general rules on the
// product content (Ashbridge, planner on): tools, food in portions, several steps and one question, gear taken off and
// left behind, the engine's mechanical state against the story's facts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadProductContent, ROOT } from '../helpers.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec, foldChat } from '../../src/host.js';
import { buildContext, playerActionsBlock } from '../../src/context.js';
import { characterRows } from '../../src/hud.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { parsePlan, planContext, withContentSkills } from '../../src/v4/planner.js';
import { deriveCharacter } from '../../src/derived.js';
import { currentFacts } from '../../src/knowledge.js';
import { coinFromWords } from '../../src/economy.js';
import { Chat4 } from './harness.js';

const content = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1018_weald.json'), 'utf8'));
const GREETING = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Ashbridge, Duskreach`';

/** The planner's answers come from g.plans (one per message). */
function plannerOn(g) {
    const ask = g.llm;
    g.purposes = [];
    g.llm = async (req) => {
        g.purposes.push(req.purpose);
        return req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req);
    };
    return g;
}
/** The live run up to message `upto` (its recorded records), the planner on. */
function live(upto) {
    const g = plannerOn(new Chat4(content, { greeting: fx.messages[0].mes }));
    g.chat = fx.messages.slice(0, upto + 1).map((m) => ({ mes: m.mes, is_user: m.is_user, is_system: m.is_system, extra: structuredClone(m.extra || {}) }));
    return g;
}
/** A player message with the planner's answer (raw text or commands). */
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [typeof commands[0] === 'string' ? commands[0] : JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    if (r.action === 'panels') g.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
    return r;
}
const outcome = (g) => rec(g.chat.findLast((m) => m.is_user))?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
const recorded = (i) => fx.messages[i].extra.avereth;
const pcHeld = (s, re) => Object.values(s.objects).filter((o) => o.holder?.entity === 'pc' && re.test(o.name));
async function campaign() {
    const g = plannerOn(new Chat4(content, { greeting: GREETING }));
    await g.player('Mage');
    await g.player('Flame Lance + Arcane Burst');
    return g;
}

// ------------------------------------------------------------------------------------------------ the live run
test('#51 live: "I use the flint and steel to make a small light and continue" is the tool used, not an unknown skill; it stays his, and he goes on', async () => {
    const g = live(50);
    const r = await say(g, fx.messages[51].mes, recorded(51).plan.raw[0]);
    assert.equal(r.action, 'context', 'a story turn, no refusal "Alaric does not know flint and steel"');
    const o = outcome(g);
    assert.deepEqual(o.resolutions.map((x) => [x.type, x.status]), [['use', 'resolved'], ['go', 'authorized']]);
    assert.match(o.actions[0], /USES — flint and steel in a tin with char cloth \(a tool: it stays with him, not used up/);
    assert.ok(!(o.plan_notes || []).length, 'nothing of the message is dropped');
    assert.equal(pcHeld(g.state(), /flint and steel/).length, 1, 'still his');
});

test('#8/#9 live: the chartmaker\'s "two silver" is 20 cp although the extractor wrote 200; Alaric can pay it, and the price is the story\'s own', async () => {
    const g = live(7);
    await g.reply(fx.messages[8].mes, recorded(8).extraction.raw);
    let s = g.state();
    const map = Object.values(s.offers).flatMap((x) => x.lines).find((l) => /regional map/.test(l.what));
    assert.equal(map.price_cp, 20, 'read from the reply: "two silver to take it"');
    assert.equal(Object.values(s.offers).flatMap((x) => x.lines).find((l) => /looking at the map/.test(l.what)).price_cp, 12, 'the twelve coppers stay twelve');
    assert.ok(g.record(g.chat.length - 1).events.some((e) => e.t === 'note' && e.d.kind === 'amount.corrected' && e.d.reported_cp === 200 && e.d.cp === 20));
    // his own answer of the run: he pays to take the map
    await say(g, fx.messages[9].mes, recorded(9).plan.raw[0]);
    s = g.state();
    assert.equal(outcome(g).resolutions[0].status, 'resolved');
    assert.equal(s.entities.pc.sheet.coin_cp, 30, '50 cp - 20 cp');
    // with the words the extractor gives since Patch 3 (said), the words are the number
    assert.equal(coinFromWords('two silver', content), 20);
});

test('#42 live: the wolf the engine holds alive is not stored dead because the story said so; the death that happened is not stored twice', async () => {
    const g = live(41);
    const r = await g.reply(fx.messages[42].mes, recorded(42).extraction.raw);
    const s = g.state();
    assert.equal(s.entities['mon.crequarry_pack_2'].status, 'alive');
    assert.ok(!currentFacts(s, (f) => f.s === 'mon.crequarry_pack_2' && f.p === 'status').length, 'no fact "dead" beside the engine\'s alive');
    assert.ok(r.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'engine_owned_fact' && /mon\.crequarry_pack_2/.test(e.d.reason)));
    assert.match(r.record.corrections.join('\n'), /is alive, as the engine has it/);
});

test('#20 live: on the road the narrator had him hunt and eat wood pigeons; that is no fact of his, and the next block says he did not', async () => {
    const g = live(19);
    const r = await g.reply(fx.messages[20].mes, recorded(20).extraction.raw);
    const s = g.state();
    assert.ok(!currentFacts(s, (f) => f.s === 'pc' && /hunted|ate/.test(f.p)).length);
    assert.ok(r.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'pc_decision'));
    assert.match(r.record.corrections.join('\n'), /Alaric did not hunted or ate anything|Alaric did not hunted/);
    // the next GO's engine block tells the narrator his things are his decision
    await say(g, fx.messages[21].mes, { type: 'go', to: { new: 'the ring of stones' }, quote: 'i settle on the ring of stones' });
    assert.match(playerActionsBlock(outcome(g)), /HIS THINGS change only by PLAYER ACTIONS: on the road or in camp he hunts, eats, buys, uses up or leaves nothing he did not choose here/);
    // a turn where no time passes and he goes nowhere carries no such line (the block grows only where it matters)
    assert.ok(!/HIS THINGS/.test(playerActionsBlock({ actions: ['1. SAYS — hello'], resolutions: [], auth: { gos: [] } })));
});

// ------------------------------------------------------------------------------------------------ the general rules
test('food in portions: cut meat (taken in the same message) is eaten only once he has it, one portion; the rest stays his, eaten later, then gone; spoiled food says so', async () => {
    const g = await campaign();
    // live #31: "cut some parts of its meat out ... cook the meat and eat it. After i ... sleep until the next morning"
    await say(g, '*i cut some parts of its meat out and make a fire and cook the meat and eat it. After i sleep until the next morning*',
        { type: 'take', object: { new: 'boar meat' }, qty: null, quote: 'i cut some parts of its meat out' },
        { type: 'activity', kind: 'craft', what: 'make a fire and cook the meat', minutes: null, until: null, quote: 'make a fire and cook the meat' },
        { type: 'use', object: { new: 'boar meat' }, qty: null, quote: 'eat it' },
        { type: 'activity', kind: 'sleep', what: null, minutes: null, until: 'morning', quote: 'sleep until the next morning' });
    const o = outcome(g);
    assert.deepEqual(o.resolutions.map((x) => [x.type, x.status]), [['take', 'authorized'], ['activity', 'authorized'], ['use', 'conditional'], ['activity', 'resolved']]);
    assert.match(o.actions[2], /USES, once he has it — boar meat/);
    await g.reply('He cuts three good portions from the haunch, roasts one over the fire and eats it, then sleeps.', {
        expected: { 1: { taken: true }, 2: { minutes: 60, done: true } },
        deltas: [{ seq: 1, type: 'object.new', name: 'boar meat', kind: 'item', qty: 3, unit: 'portion', holder: 'pc', for_quest: null }],
    });
    let s = g.state();
    let meat = pcHeld(s, /boar meat/)[0];
    assert.deepEqual([meat.use, meat.qty, meat.unit], ['food', 2, 'portion'], 'one portion eaten, two left');
    // the next evening: one portion
    await say(g, '*i cook the meat and eat it*', { type: 'use', object: meat.id, qty: null, quote: 'eat it' });
    assert.match(outcome(g).actions[0], /EATS — 1 portion of boar meat; 1 portion left/);
    await g.reply('He eats.', { expected: {}, deltas: [] });
    // three days later the last portion has gone off: he may still eat it (his choice), the line says it spoiled
    s = g.state();
    meat = pcHeld(s, /boar meat/)[0];
    assert.match(buildCatalog(s, content, { c: true }).objects.find((x) => x.id === meat.id).state, /^food$/);
    await say(g, '*i rest for 3 days*', { type: 'activity', kind: 'rest', what: null, minutes: 4320, until: null, quote: 'i rest for 3 days' });
    await g.reply('Three days pass.', { expected: { 1: { minutes: 4320, done: true } }, deltas: [] });
    s = g.state();
    assert.match(buildCatalog(s, content, { c: true }).objects.find((x) => x.id === meat.id).state, /spoiled/);
    await say(g, '*i eat the rest of the meat*', { type: 'use', object: meat.id, qty: 3, quote: 'i eat the rest of the meat' });
    assert.match(outcome(g).actions[0], /EATS — 1 portion of boar meat; none left\. It has spoiled/);
    await g.reply('He eats it.', { expected: {}, deltas: [] });
    // eaten food cannot be eaten again
    assert.ok(!buildCatalog(g.state(), content, { c: true }).objects.some((x) => x.id === meat.id), 'eaten: no longer a thing he can name');
    await say(g, '*i eat the boar meat*', { type: 'use', object: meat.id, qty: null, quote: 'i eat the boar meat' });
    assert.ok(!(outcome(g)?.actions || []).some((x) => /EATS/.test(x)), 'nothing is eaten twice');
    assert.ok(!pcHeld(g.state(), /boar meat/).length);
});

test('a consumable is used up, a tool is not; the take of nothing uses nothing', async () => {
    const g = await campaign();
    await say(g, '*i walk into the city*', { type: 'go', to: 'loc.ashbridge', quote: 'i walk into the city' });
    await g.reply('Ashbridge. A chandler sells oil flasks and a coil of rope: "A flask is three copper, the rope two silver."', {
        expected: { 1: { arrived: true, at: 'loc.ashbridge', with: null } },
        deltas: [
            { seq: 1, type: 'person.new', ref: 'chandler', name: null, role: 'chandler', desc: [], present: true, relevant: true },
            { seq: 2, type: 'offer', seller: 'chandler', lines: [{ what: 'oil flask', kind: 'goods', service: null, qty: 1, price_cp: 3, said: 'three copper' }, { what: 'coil of rope', kind: 'goods', service: null, qty: 1, price_cp: 200, said: 'two silver' }] },
        ],
    });
    let s = g.state();
    const offer = Object.values(s.offers).find((x) => x.status === 'open' && !x.canon);
    assert.deepEqual(offer.lines.map((l) => l.price_cp), [3, 20], 'the words, not the number: two silver is 20 cp');
    await say(g, '*i buy two flasks and the rope*', { type: 'offer.accept', offer: offer.id, lines: ['l1', 'l2'], qty: null, quote: 'i buy two flasks and the rope' });
    await g.reply('He pays.', { expected: {}, deltas: [] });
    s = g.state();
    const rope = pcHeld(s, /rope/)[0];
    const oil = pcHeld(s, /\boil\b/)[0];
    assert.deepEqual([rope.use, oil.use], ['tool', 'consumable']);
    await say(g, '*i use the rope to climb down and burn an oil flask for light*', { type: 'use', object: rope.id, qty: null, quote: 'i use the rope to climb down' }, { type: 'use', object: oil.id, qty: null, quote: 'burn an oil flask for light' });
    assert.match(outcome(g).actions.join('\n'), /USES — coil of rope \(a tool[\s\S]*USES — oil flask/);
    await g.reply('He climbs down by lamplight.', { expected: {}, deltas: [] });
    s = g.state();
    assert.ok(pcHeld(s, /rope/).length, 'the rope stays');
    assert.equal(pcHeld(s, /\boil\b/).length, 0, 'the one flask is burned');
    assert.equal(s.objects[oil.id].holder.consumed, 'pc');
    // a thing he means to take and use, which the story does not give him: nothing taken, nothing used
    await say(g, '*i pick up a stone and throw it*', { type: 'take', object: { new: 'a stone' }, qty: null, quote: 'i pick up a stone' }, { type: 'use', object: { new: 'stone' }, qty: null, quote: 'throw it' });
    await g.reply('There is no loose stone on the swept street.', { expected: { 1: { taken: false } }, deltas: [] });
    assert.ok(g.record(g.chat.length - 1).events.some((e) => e.t === 'cmd.expired'));
});

test('several steps and one question: the camp\'s length is asked, the hunt is taken (live #21); a question all other steps rest on still stops the message', async () => {
    const g = await campaign();
    const r = await say(g, '*i settle on the ring of stones for my camp this night and go looking for any animals to hunt for real meat*',
        { type: 'activity', kind: 'rest', what: 'make camp at the ring of stones', minutes: null, until: null, quote: 'i settle on the ring of stones for my camp this night' },
        { type: 'activity', kind: 'search', what: 'animals to hunt', minutes: null, until: null, quote: 'go looking for any animals to hunt for real meat' });
    assert.equal(r.action, 'context', 'a story turn, no System panel');
    const o = outcome(g);
    assert.deepEqual(o.resolutions.map((x) => x.status), ['clarify', 'authorized']);
    assert.match(o.actions[0], /^1\. OPEN QUESTION — "i settle on the ring of stones for my camp this night": How long does he want to rest\?[\s\S]*nothing is booked for this step/);
    assert.match(o.actions[1], /^2\. SEARCHES animals to hunt/);
    assert.match(o.engine_lines.join('\n'), /QUESTION — How long does he want to rest/);
    assert.equal(o.search_checks.length, 1, 'the hunt is rolled');
    await g.reply('He hunts at dusk.', { expected: { 2: { minutes: 60, done: true } }, deltas: [] });
    // a question the rest of the message builds on: the System asks and nothing is booked
    const s0 = g.state();
    const r2 = await say(g, '*i sleep and then walk to the city*',
        { type: 'activity', kind: 'sleep', what: null, minutes: null, until: null, quote: 'i sleep' },
        { type: 'go', to: 'loc.ashbridge', needs: 1, quote: 'then walk to the city' });
    assert.equal(r2.action, 'panels');
    assert.match(r2.panels[0], /CLARIFY/);
    assert.equal(g.state().clock.minute, s0.clock.minute);
});

test('gear: "I take off everything I\'m wearing" takes off what he wears; the staff he leaves here gives him nothing; taken back and readied it is his gear again (live #73)', async () => {
    const g = await campaign();
    let s = g.state();
    const matk = deriveCharacter(s.entities.pc.sheet, content).matk;
    const def = deriveCharacter(s.entities.pc.sheet, content).def;
    await say(g, '*i take off everything im wearing and leave my staff with my clothes on the stone, then i walk into the pool*',
        { type: 'unequip', object: null, quote: 'i take off everything im wearing' },
        { type: 'drop', object: 'item.starter_arcane_staff', qty: null, quote: 'leave my staff with my clothes on the stone' },
        { type: 'go', to: { new: 'the pool' }, quote: 'i walk into the pool' });
    const o = outcome(g);
    assert.deepEqual(o.resolutions.map((x) => [x.type, x.status]), [['unequip', 'resolved'], ['drop', 'resolved'], ['go', 'authorized']]);
    assert.match(o.actions[0], /UNEQUIPS — .*Simple Traveler's Clothes.*: all he wore/);
    s = g.state();
    assert.deepEqual(Object.values(s.entities.pc.sheet.equipment).filter(Boolean), [], 'nothing equipped');
    const staff = Object.values(s.objects).find((x) => /arcane staff/i.test(x.name));
    assert.equal(staff.holder.loc, s.scene.at, 'the staff lies here');
    assert.ok(deriveCharacter(s.entities.pc.sheet, content).matk < matk, 'no MATK from a staff on the stone');
    assert.ok(deriveCharacter(s.entities.pc.sheet, content).def < def);
    // the HUD shows what he actually wears: nothing; the clothes and robes are carried
    const hud = Object.fromEntries(characterRows(s, content));
    assert.equal(hud.Equipped, '—');
    assert.match(hud.Carried, /Simple Traveler's Clothes/);
    await g.reply('He wades in.', { expected: { 3: { arrived: false, at: null, with: null } }, deltas: [] });
    // he comes back, takes the staff and readies it, puts his robes back on
    await say(g, '*i pick up my staff and ready it and put my robes back on*',
        { type: 'take', object: staff.id, qty: null, quote: 'i pick up my staff' },
        { type: 'equip', object: staff.id, slot: null, quote: 'ready it' },
        { type: 'equip', object: 'item.starter_light_robes', slot: null, quote: 'put my robes back on' });
    s = g.state();
    assert.deepEqual(outcome(g).resolutions.map((x) => x.status), ['resolved', 'resolved', 'resolved']);
    assert.equal(s.entities.pc.sheet.equipment.weapon, 'starter_arcane_staff');
    assert.equal(deriveCharacter(s.entities.pc.sheet, content).matk, matk);
});

test('mechanical facts: Alaric\'s HP and gear are no free facts; a wound at full health is refused, a wound while hurt lives until he is healed; a scar stays', async () => {
    const g = await campaign();
    await say(g, '*i walk into the city*', { type: 'go', to: 'loc.ashbridge', quote: 'i walk into the city' });
    let r = await g.reply('He walks in, unhurt.', { expected: { 1: { arrived: true, at: 'loc.ashbridge', with: null } }, deltas: [
        { seq: 1, type: 'fact', s: 'pc', p: 'wounded', o: 'claw raked deep across his ribs' },
        { seq: 2, type: 'fact', s: 'pc', p: 'hp', o: '40 of 80' },
        { seq: 3, type: 'fact', s: 'pc', p: 'wielding', o: 'a borrowed spear' },
        { seq: 4, type: 'fact', s: 'pc', p: 'has_scar', o: 'an old scar across his chin' },
    ] });
    let s = g.state();
    assert.deepEqual(r.record.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.item.seq), [1, 2, 3]);
    assert.ok(currentFacts(s, (f) => f.s === 'pc' && /scar/.test(f.p)).length, 'a scar stays');
    // hurt: the wound is a fact while he is hurt, and healed with his HP
    const sheet = g.chat.findLast((m) => m.extra?.avereth?.events).extra.avereth.events;
    sheet.push({ t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: 50 } });
    await say(g, '*i look around*');
    r = await g.reply('His side burns where the claws raked him.', { expected: {}, deltas: [{ seq: 1, type: 'fact', s: 'pc', p: 'wounded', o: 'claw raked deep across his left ribs' }] });
    s = g.state();
    assert.equal(currentFacts(s, (f) => f.s === 'pc' && f.p === 'wounded').length, 1);
    await say(g, '*i rest for 8 hours*', { type: 'activity', kind: 'rest', what: null, minutes: 480, until: null, quote: 'i rest for 8 hours' });
    await g.reply('He rests.', { expected: { 1: { minutes: 480, done: true } }, deltas: [] });
    s = g.state();
    assert.equal(s.entities.pc.sheet.hp, deriveCharacter(s.entities.pc.sheet, content).maxHp);
    assert.equal(currentFacts(s, (f) => f.s === 'pc' && f.p === 'wounded').length, 0, 'healed: no longer a current fact');
    assert.ok(!/claw raked/.test(buildContext(s, content, { input: 'my ribs', lastReply: '' }).text.split('RELEVANT')[1]?.split('\n\n')[0] || ''));
});

test('amounts in his own words: a pay whose number differs from "two silver" goes back to the planner\'s repair; the right number passes', () => {
    const s = foldChat(fx.messages, 18).state;
    const ctx = withContentSkills(planContext(s, content, buildCatalog(s, content, { c: true })), content);
    const msg = '*i pay her two silver*';
    const bad = parsePlan(JSON.stringify({ commands: [{ seq: 1, type: 'pay', to: 'npc.npcfletcher', amount_cp: 200, for: null, quote: 'i pay her two silver' }] }), content.commandVocab, ctx, msg);
    assert.equal(bad.commands, null);
    assert.match(bad.errors.join('\n'), /amount_cp 200 is not what his words "i pay her two silver" say: 20 cp/);
    const ok = parsePlan(JSON.stringify({ commands: [{ seq: 1, type: 'pay', to: 'npc.npcfletcher', amount_cp: 20, for: null, quote: 'i pay her two silver' }] }), content.commandVocab, ctx, msg);
    assert.equal(ok.errors.length, 0, ok.errors.join('; '));
});

test('a gift of coin in words is the words\' amount; words not in the reply prove nothing', async () => {
    const g = await campaign();
    await say(g, '*i walk into the city*', { type: 'go', to: 'loc.ashbridge', quote: 'i walk into the city' });
    await g.reply('A grateful carter presses two silver into his hand.', { expected: { 1: { arrived: true, at: 'loc.ashbridge', with: null } }, deltas: [
        { seq: 1, type: 'person.new', ref: 'carter', name: null, role: 'carter', desc: [], present: true, relevant: true },
        { seq: 2, type: 'coin.gift', from: 'carter', cp: 200, why: 'thanks', said: 'two silver' },
        { seq: 3, type: 'coin.gift', from: 'carter', cp: 7, why: 'thanks', said: 'nine gold' },
    ] });
    assert.equal(g.state().entities.pc.sheet.coin_cp, 50 + 20 + 7);
});

test('cost: no new LLM call; the engine block grows by one short line only where time passes', async () => {
    const g = await campaign();
    g.purposes.length = 0;
    await say(g, '*i walk into the city*', { type: 'go', to: 'loc.ashbridge', quote: 'i walk into the city' });
    await g.reply('Ashbridge.', { expected: { 1: { arrived: true, at: 'loc.ashbridge', with: null } }, deltas: [] });
    assert.deepEqual(g.purposes.map((p) => p.replace(/[:.].*$/, '')), ['plan', 'extract']);
    const u = g.chat.findLastIndex((m) => m.is_user);
    const block = rec(g.chat[u]).events.findLast((e) => e.t === 'outcome.recorded').d.outcome;
    assert.ok(block.auth.gos.length);
});
