import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { foldChat } from '../../src/host.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { planContext, parsePlan, plannerUser } from '../../src/v4/planner.js';
import { interpreterSchema } from '../../src/v4/interpret.js';
import { validate } from '../../src/v4/schema.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { trueDungeonOf } from '../../src/v4/dungeon.js';
import { validateState } from '../../src/validate.js';
import { findQuote, priceEvidence } from '../../src/v4/finance_evidence.js';
import { Chat4 } from './harness.js';
import { say, walk, delve, inject, living, slotDelta } from './patch8_lib.js';
import { resolved } from '../../src/v4/living.js';

const c = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/batch23_fix150.json', import.meta.url)));
const ROOT = 'loc.mossback_warrens', INN = 'loc.duskreach.painted_boar_inn';
const state = who => foldChat(structuredClone(fx[who].chat)).state;
const apply = (s, a = fx.warrior.reply.answer, prose = fx.warrior.reply.text) => applyWorld(s, c, structuredClone(a), { msg: 74, prose });
function command(s, commands, text) {
    const events = [];
    const ctx = resolveCommands(s, c, commands, e => { applyEvent(s, e); events.push(e); }, { c: true, text, msg: 75 });
    s.last.outcome = { kind: 'v4', ...ctx };
    return { ctx, events };
}

test('150 original I73: every advertised return destination is accepted by the same catalog schema; remote dungeon returns use its root', () => {
    const s = foldChat(fx.warrior.chat, 73).state;
    const catalog = buildCatalog(s, c), ctx = planContext(s, c, catalog);
    assert.ok(ctx.route.some(p => p.id === ROOT), 'advertise the visited Dungeon, not a remote room');
    for (const p of ctx.route) {
        const text = `I return to ${p.name}.`;
        const answer = { commands: [{ seq: 1, type: 'go', to: p.id, quote: text, within: null }] };
        assert.deepEqual(validate(interpreterSchema(c.commandVocab, catalog), answer), [], p.id);
        assert.deepEqual(parsePlan(JSON.stringify(answer), c.commandVocab, ctx, text).errors, [], p.id);
    }
    assert.match(plannerUser(ctx, 'I return to the warrens.'), /loc\.mossback_warrens:/);
    assert.ok(!catalog.places.some(p => p.id === 'loc.mossback_warrens.mossback_warrens_entrance_gallery'));
});

test('150 original repaired GO + I74: a parentless confirmed gallery stays in the original Dungeon; never classify the inn', () => {
    const s = state('warrior'), r = apply(s);
    assert.equal(trueDungeonOf(r.state, r.state.scene.at), ROOT);
    assert.equal(r.state.places[INN].dungeon, undefined);
    assert.ok(!r.events.some(e => e.t === 'dungeon.established'), 'no replacement population');
    assert.ok(!r.state.scene.at.startsWith(INN + '.'));
    assert.deepEqual(validateState(r.state, c), []);
    assert.deepEqual(r.events, apply(s).events, 'same reply/replay produces the same events');
});

test('150 fixed known-root GO + original I74, return and second visit retain identity', () => {
    const s = foldChat(fx.warrior.chat, 73).state;
    command(s, [{ seq: 1, type: 'go', to: ROOT, quote: 'I return to Mossback Warrens.' }], 'I return to Mossback Warrens.');
    const r = apply(s);
    assert.equal(trueDungeonOf(r.state, r.state.scene.at), ROOT);
    assert.equal(r.state.places[INN].dungeon, undefined);
    const room = r.state.scene.at;
    const back = structuredClone(r.state);
    command(back, [{ seq: 1, type: 'go', to: INN, quote: 'I return to the inn.' }], 'I return to the inn.');
    const outside = applyWorld(back, c, { expected: { 1: { arrived: true, at: INN } }, deltas: [] }, { prose: 'Alaric reaches the inn.' }).state;
    command(outside, [{ seq: 1, type: 'go', to: ROOT, quote: 'I return to Mossback Warrens.' }], 'I return to Mossback Warrens.');
    const again = apply(outside);
    assert.equal(again.state.scene.at, room);
    assert.ok(!again.events.some(e => ['place.created', 'dungeon.established'].includes(e.t)));
});

test('150 no GO or unconfirmed arrival grants no Dungeon return scope', () => {
    for (const arrived of [false, true]) {
        const s = state('warrior');
        if (arrived) { s.last.outcome.auth.gos = []; s.last.outcome.auth.go = null; }
        const a = structuredClone(fx.warrior.reply.answer);
        a.expected[1].arrived = arrived;
        if (!arrived) a.deltas = a.deltas.filter(d => d.type !== 'arrive');
        const r = apply(s, a);
        assert.equal(r.state.places[INN].dungeon, undefined);
        assert.equal(r.state.scene.at, INN);
        assert.ok(!r.events.some(e => e.t === 'dungeon.established'));
    }
});

test('150 independent explicit cave parent is preserved; ordinary inn rooms stay possible', () => {
    const s = state('warrior');
    const at = { new: { name: 'A new crystal cave', kind: 'site', parent: 'realm.duskreach' } };
    command(s, [{ seq: 1, type: 'go', to: { new: 'A new crystal cave' }, quote: 'I travel to a new crystal cave.' }], 'I travel to a new crystal cave.');
    const r = apply(s, { expected: { 1: { arrived: true, at } }, deltas: [{ seq: 1, type: 'arrive', at }, { seq: 2, type: 'dungeon', place: null, theme: 'crystal caves', how: 'seen' }] }, 'Alaric reaches a new crystal cave, a true Dungeon.');
    assert.notEqual(trueDungeonOf(r.state, r.state.scene.at), ROOT);
    assert.equal(r.state.places[r.state.scene.at].parent, 'realm.duskreach');
    assert.equal(r.state.places[INN].dungeon, undefined);
    const bed = { new: { name: 'The upstairs guest room', kind: 'interior', parent: INN } };
    const inn = state('warrior');
    command(inn, [{ seq: 1, type: 'go', to: { new: 'The upstairs guest room' }, quote: 'I go upstairs to my room.' }], 'I go upstairs to my room.');
    const room = apply(inn, { expected: { 1: { arrived: true, at: bed } }, deltas: [{ seq: 1, type: 'arrive', at: bed }] }, 'Alaric reaches his guest room.');
    assert.equal(room.state.places[room.state.scene.at].parent, INN);
    assert.equal(room.state.places[INN].dungeon, undefined);
});

test('150 original I72 firm 60-cp lot creates a bid; explicit acceptance transfers both items exactly once', () => {
    const s = state('mage'), f = fx.mage.reply;
    const r = applyWorld(s, c, f.answer, { msg: f.index, prose: f.text });
    const bid = Object.values(r.state.offers).find(o => o.bid && o.status === 'open' && o.price_cp === 60);
    assert.ok(bid, JSON.stringify(r.rejected));
    const before = r.state.entities.pc.sheet.coin_cp;
    const text = 'I accept the six silver for the pair and sell both to him.';
    const buy = command(r.state, [{ seq: 1, type: 'offer.accept', offer: bid.id, lines: null, qty: null, quote: text }], text);
    assert.equal(r.state.entities.pc.sheet.coin_cp, before + 60);
    assert.equal(buy.events.filter(e => e.t === 'transaction.completed').length, 1);
    for (const l of bid.lines) assert.notEqual(r.state.objects[l.object]?.holder?.entity, 'pc');
    const twice = command(r.state, [{ seq: 1, type: 'offer.accept', offer: bid.id, lines: null, qty: null, quote: text }], text);
    assert.equal(r.state.entities.pc.sheet.coin_cp, before + 60);
    assert.ok(!twice.events.some(e => e.t === 'coin.changed'));
    assert.deepEqual(validateState(r.state, c), []);
});

for (const [quote, source, expected] of [
    ['six silver the pair', 'Six silver the pair, the fang and the sac both, paid now.', true],
    ['six silver', 'Six silver the pair, the fang and the sac both, paid now.', true],
    ['Six silver the pair, the fang and the sac both, paid now', 'Six silver the pair, the fang and the sac both, paid now.', true],
    ['six silver the fang', 'Six silver the fang.', false],
    ['six silver', 'Six silver the fang.', false],
    ['six silver each', 'Six silver each.', false],
]) test(`150 quote span is not money span: ${quote} / ${expected}`, () => {
    const ev = priceEvidence({ basis: 'total', quote }, { source, content: c, within: findQuote(source, source), units: 2, goods: ['fang', 'sac'], reported: 60, ownCurrency: true });
    assert.equal(ev.state === 'verified', expected, JSON.stringify(ev));
});

test('150 actual typo fact is refused, known place and free narrative fact remain allowed', () => {
    const s = state('warrior');
    const good = 'loc.otterhound_holt_under_the_leaning_alder', bad = good.replace('leaning', 'leading');
    s.places[good] = { id: good, name: 'Otterhound holt under the leaning alder', kind: 'site', parent: 'realm.duskreach', realm: 'realm.duskreach' };
    const deltas = [bad, good, 'a quiet stretch of river'].map((id, i) => ({ seq: i + 1, type: 'fact', s: id, p: 'quiet', o: 'the holt mouth stays black and quiet under the water; nothing else stirs in the reeds' }));
    const r = apply(s, { expected: {}, deltas }, 'The holt mouth stays black and quiet under the water; nothing else stirs in the reeds.');
    assert.ok(r.rejected.some(d => d.seq === 1));
    assert.ok(Object.values(r.state.facts).some(f => f.s === good));
    assert.ok(Object.values(r.state.facts).some(f => f.s === 'a quiet stretch of river'));
    assert.deepEqual(validateState(r.state, c), []);
});

test('150 original return continues the same slot population through combat, floor clear, reload and one Guild payout', async () => {
    const g = new Chat4(c, { planner: true });
    g.chat = structuredClone(fx.warrior.chat);
    const ask = g.llm;
    g.llm = req => req.purpose.startsWith('plan') ? Promise.resolve(g.plans.shift() ?? null) : ask(req);
    await g.reply(fx.warrior.reply.text, fx.warrior.reply.answer);
    assert.equal(trueDungeonOf(g.state(), g.state().scene.at), ROOT);
    // Combat strength is a test precondition, not a product balance change. Kills and clear credit use real combat.
    inject(g, [{ t: 'level.up', d: { id: 'pc', level: 40, free_points: 120, favored: [], xp_after: 0 } },
        { t: 'stat.assigned', d: { id: 'pc', stat: 'STR', amount: 60 } },
        { t: 'stat.assigned', d: { id: 'pc', stat: 'VIT', amount: 60 } },
        { t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: 400 } }]);
    for (let n = 0; n < 10 && !living(g, ROOT).run.floors[1].cleared; n++) {
        const s = g.state(), slot = living(g, ROOT).run.floors[1].slots.find(sl => !resolved(s, sl));
        if (slot?.at) {
            await walk(g, slot.at, { prose: 'Alaric returns to the scouts in the known gallery.', deltas: [slotDelta(slot)] });
        } else await delve(g, `Next level-one gallery ${n}`, { root: ROOT });
        // Start this navigation/credit control at melee distance; range tactics have their own regression suites.
        inject(g, g.state().scene.present.filter(id => g.state().entities[id]?.kind === 'creature')
            .map(id => ({ t: 'scene.position', d: { id, band: 'ENGAGED', cover: 'none' } })));
        for (let k = 0; k < 40; k++) {
            const now = g.state();
            const target = now.encounter ? Object.values(now.encounter.combatants).find(x => x.side === 'hostile' && !x.current.defeated && !x.current.escaped)?.id
                : now.scene.present.find(id => now.entities[id]?.kind === 'creature' && now.entities[id].status !== 'dead');
            if (!target) break;
            await say(g, 'I use Heavy Slash on the goblin.', { type: 'use_skill', skill: 'warrior.heavy_slash', target });
            await g.reply('The fight goes on.', { expected: {}, deltas: [] });
        }
    }
    assert.ok(living(g, ROOT).run.floors[1].cleared);
    assert.ok(!g.state().dungeons[INN]);
    const q = 'quest.clear_mossback_warrens_level_1';
    await walk(g, 'loc.ashbridge.guild_hall', { prose: 'Alaric reaches the Guild hall.' });
    const before = g.state().entities.pc.sheet.coin_cp;
    await say(g, 'I turn in the Mossback Warrens contract.', { type: 'quest.turn_in', quest: q });
    assert.equal(g.state().quests[q].status, 'completed');
    assert.equal(g.state().entities.pc.sheet.coin_cp, before + 60);
    await g.reply('The clerk pays the completed contract.', { expected: {}, deltas: [] });
    g.chat = JSON.parse(JSON.stringify(g.chat));
    await say(g, 'I turn in the Mossback Warrens contract again.', { type: 'quest.turn_in', quest: q });
    assert.equal(g.state().entities.pc.sheet.coin_cp, before + 60);
    assert.deepEqual(validateState(g.state(), c), []);
});
