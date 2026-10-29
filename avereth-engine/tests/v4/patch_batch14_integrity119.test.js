import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { fold, applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { extractorCatalog, guardContext } from '../../src/v4/catalog.js';
import { guardCommands } from '../../src/v4/agency.js';
import { hallOf, hallOfSettlement } from '../../src/v4/domain.js';
import { coinFromWords } from '../../src/economy.js';
import { validateState } from '../../src/validate.js';
import { contractReady } from '../../src/v4/guild.js';
const content = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/batch14_integrity119.json', import.meta.url)));
const states = Object.fromEntries(Object.entries(fx).filter(([, v]) => v.events).flatMap(([profile, data]) =>
    Object.entries(data.cases).map(([name, c]) => [name, fold(data.events.slice(0, c.before))])));
const source = name => Object.values(fx).find(x => x.cases?.[name]).cases[name];
function plan(s, commands, text) {
    const events = [], emit = e => { events.push(e); applyEvent(s, e); };
    const ctx = resolveCommands(s, content, structuredClone(commands), emit, { c: true, text });
    s.last.outcome = { auth: ctx.auth, conditionals: ctx.conditionals, expected_keys: ctx.expectedKeys, resolutions: ctx.resolutions, booked: ctx.booked };
    return { ctx, events };
}
function original(name, mutate = () => {}) {
    const c = source(name), s = structuredClone(states[name]), a = structuredClone(c.answer);
    const p = plan(s, c.commands, c.input); mutate(s, a);
    return { ...applyWorld(s, content, a, { prose: c.prose, msg: c.msg }), planned: s, p };
}
function gift(s, { cp = 5, said = 'Hemm handed him five copper as a gift.', why = 'a separate gift', repeat_of = null, from = 'npc.salter_hemm' } = {}) {
    plan(s, []);
    return applyWorld(s, content, { scene: 'here', expected: {}, deltas: [{ seq: 1, type: 'coin.gift', from, cp, said, why, repeat_of }] }, { prose: said, msg: 106 });
}
test('119 original Mage T51 sale is credited once; T52 pocketing the same proceeds never pays another 100', () => {
    const r = original('recount');
    assert.equal(r.planned.entities.pc.sheet.coin_cp, 432);
    assert.equal(r.state.entities.pc.sheet.coin_cp, 432);
    assert.ok(r.rejected.some(x => x.type === 'coin.gift' && ['engine_booked', 'coin_evidence'].includes(x.rule)));
});
test('119 a fully quantified later recount is blocked by its recorded sale, independently of amount validation', () => {
    const s = structuredClone(states.recount), r = gift(s, { cp: 163,
        said: 'Hemm handed him a gold and six silver and three copper for the plates and glands.',
        why: 'payment for the bog strider plates and venom glands' });
    assert.equal(r.state.entities.pc.sheet.coin_cp, 432);
    assert.ok(r.rejected.some(x => x.rule === 'engine_booked'));
});
test('119 original sale event retains counterparty, goods and offer on replay and reaches extractor context', () => {
    const s = states.recount, credit = s.credits.find(x => x.cp === 163);
    assert.equal(credit.from, 'npc.salter_hemm'); assert.match(credit.for, /Chitin Plate/);
    assert.equal(credit.offer, 'offer.t98.6'); assert.ok(credit.id);
    const text = extractorCatalog(s, content, { c: true }).text;
    assert.ok(text.includes(credit.id)); assert.match(text, /163 cp.*Chitin Plate/);
});
test('119 independent later gifts from the same merchant, even the same amount, remain valid', () => {
    const s = structuredClone(states.recount), before = s.entities.pc.sheet.coin_cp;
    const first = gift(s, { cp: 163, said: 'Hemm handed him a gold and six silver and three copper as a separate gift.', why: 'thanks for helping his family' });
    assert.equal(first.state.entities.pc.sheet.coin_cp, before + 163);
    const later = gift(first.state, { cp: 163, said: 'Hemm gave him a new gift of a gold and six silver and three copper.', why: 'a new gift' });
    assert.equal(later.state.entities.pc.sheet.coin_cp, before + 326);
});
test('119 an explicitly additional bonus for sold goods remains distinct from their paid price', () => {
    const s = structuredClone(states.recount), before = s.entities.pc.sheet.coin_cp;
    const r = gift(s, { said: 'Hemm handed him five copper as an extra bonus.', why: 'additional payment for the bog strider plates and venom glands' });
    assert.equal(r.state.entities.pc.sheet.coin_cp, before + 5);
});
test('119 another present NPC may give the same amount after a sale; explicit sale repeat_of never pays', () => {
    const s = structuredClone(states.recount), id = 'npc.other_donor';
    s.entities[id] = { ...structuredClone(s.entities['npc.salter_hemm']), id, name: 'Iris' }; s.scene.present.push(id);
    const r = gift(s, { from: id, cp: 163, said: 'Iris gave him a gold and six silver and three copper.', why: 'payment for her errands' });
    assert.equal(r.state.entities.pc.sheet.coin_cp, 595);
    const repeat = gift(structuredClone(states.recount), { repeat_of: 'offer.t98.6' });
    assert.equal(repeat.state.entities.pc.sheet.coin_cp, 432);
});
test('119 gift replay/reload cannot create another credit and historical sparse credit records remain loadable', () => {
    const s = structuredClone(states.recount), r = gift(s);
    const replay = fold(JSON.parse(JSON.stringify(r.events)), s);
    assert.deepEqual(replay, r.state); assert.deepEqual(validateState(replay, content), []);
    const id = r.state.credits.at(-1).gift.id;
    assert.equal(gift(replay, { repeat_of: id }).state.entities.pc.sheet.coin_cp, r.state.entities.pc.sheet.coin_cp);
    const old = structuredClone(states.recount); old.credits = [{ cp: 163, at: old.scene.at, day: 1 }];
    assert.equal(gift(old).state.entities.pc.sheet.coin_cp, 437);
});
test('119 Warrior T18 partial eight-copper-and-the-silver quote never silently pays only eight', () => {
    const r = original('partial');
    assert.equal(r.state.entities.pc.sheet.coin_cp, r.planned.entities.pc.sheet.coin_cp);
    assert.ok(r.rejected.some(x => x.type === 'coin.gift' && x.rule === 'coin_evidence'));
    assert.ok(!r.events.some(e => e.t === 'note' && e.d.kind === 'amount.corrected'));
});
test('119 full mixed-currency evidence, including a single silver, deterministically pays eighteen', () => {
    assert.equal(coinFromWords('eight copper and a single silver piece', content), 18);
    const s = structuredClone(states.partial), r = gift(s, { from: 'npc.marda', cp: 18, said: 'Marda handed him eight copper and a single silver piece.', why: 'thanks for his help' });
    assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp + 18);
});
test('119 a gold and an unspecified handful of silver cannot be truncated to one gold', () => {
    const s = structuredClone(states.recount), r = gift(s, { cp: 163, said: 'Hemm handed him a gold and a handful of silver.', why: 'a gift' });
    assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp);
    assert.ok(r.rejected.some(x => x.rule === 'coin_evidence'));
});
test('119 original Marsh Hollow plan keeps the handover conditional even when GO names the settlement', () => {
    const c = source('branch'), s = structuredClone(states.branch);
    const guarded = guardCommands(c.input, c.commands, guardContext(s, content));
    assert.ok(guarded.kept.some(x => x.type === 'quest.turn_in'));
    const p = plan(s, guarded.kept, c.input);
    assert.equal(p.ctx.resolutions.find(x => x.type === 'quest.turn_in').status, 'conditional');
});
test('119 untouched Marsh Hollow T117 recognizes the staffed hall but correctly refuses only three of six kills', () => {
    const r = original('branch'), qid = source('branch').commands.at(-1).quest;
    assert.equal(r.state.scene.at, 'loc.marsh_hollow.marsh_hollow_guild_hall');
    assert.equal(hallOf(r.state, r.state.scene.at), r.state.scene.at);
    assert.equal(r.state.quests[qid].status, 'active');
    assert.match(contractReady(r.state, content, r.state.quests[qid], { c: true }).reason, /3 of 6/);
    assert.equal(r.state.entities.pc.sheet.coin_cp, r.planned.entities.pc.sheet.coin_cp);
    assert.ok(r.events.some(e => e.t === 'cmd.completed' && e.d.seq === 4 && !e.d.ok));
});
test('119 a READY control on the exact Marsh Hollow chain pays once after branch and arrival', () => {
    // Explicit positive control: three kills already exist; change the contract requirement, never fabricate kills.
    const r = original('branch', s => { s.quests[source('branch').commands.at(-1).quest].objectives[0].qty = 3; });
    const qid = source('branch').commands.at(-1).quest;
    assert.equal(r.state.quests[qid].status, 'completed');
    assert.equal(r.state.entities.pc.sheet.coin_cp, r.planned.entities.pc.sheet.coin_cp + 140);
    assert.equal(r.events.filter(e => e.t === 'transaction.completed' && e.d.quest === qid).length, 1);
    assert.deepEqual(validateState(r.state, content), []);
    const replay = fold(JSON.parse(JSON.stringify(r.events)), r.planned);
    assert.deepEqual(replay, r.state);
    const again = plan(replay, [source('branch').commands.at(-1)], 'I turn in the strider cull.');
    assert.equal(again.events.filter(e => e.t === 'transaction.completed').length, 0);
});
for (const prose of [
    'A sign outside reads Guild hall. The villager said, "A Guild clerk works behind the counter."',
    'A Guild clerk will staff the counter tomorrow.',
    'No clerk worked at the Guild counter.',
]) test('119 even a misreported local clerk cannot establish a branch from hearsay, future or negation: ' + prose, () => {
    const c = source('branch'), s = structuredClone(states.branch); plan(s, c.commands, c.input);
    const r = applyWorld(s, content, c.answer, { prose, msg: c.msg });
    assert.equal(hallOfSettlement(r.state, 'loc.marsh_hollow'), null);
});
test('119 a clerk in an ordinary shop grants no Guild services', () => {
    const r = original('branch', (s, a) => {
        const hall = a.deltas.find(d => d.type === 'arrive' && typeof d.at === 'object').at;
        hall.new.name = 'Marsh Hollow cloth shop'; a.scene = hall; a.expected['3'].at = hall;
    });
    assert.equal(hallOfSettlement(r.state, 'loc.marsh_hollow'), null);
});
test('119 original sale command consumes its offer and goods once, with an auditable credit', () => {
    const c = source('sale'), s = structuredClone(states.sale), p = plan(s, c.commands, c.input);
    assert.equal(s.entities.pc.sheet.coin_cp, 432);
    assert.equal(p.events.filter(e => e.t === 'transaction.completed').length, 1);
    plan(s, c.commands, c.input); assert.equal(s.entities.pc.sheet.coin_cp, 432);
});
test('119 original plan and extraction through Runtime, JSON reload and swipe preserve branch and single payment', async () => {
    const { prepareGenerationAsync, processReplyAny, runExtraction } = await import('../../src/v4/runtime.js');
    const { foldChat, rec } = await import('../../src/host.js');
    const c = source('branch'), events = structuredClone(fx.mage.events.slice(0, c.before));
    events.find(e => e.t === 'quest.created' && e.d.quest.id === c.commands.at(-1).quest).d.quest.objectives[0].qty = 3;
    const chat = [{ mes: 'Recorded earlier campaign', is_user: false, extra: { avereth: { v: 3, events } } },
        { mes: c.input, is_user: true, is_system: false, extra: {} }];
    const calls = [], llm = async req => {
        calls.push(req.purpose);
        if (req.purpose === 'plan') return JSON.stringify({ commands: c.commands });
        if (req.purpose === 'extract') return JSON.stringify(c.answer);
        throw Error(req.purpose);
    };
    await prepareGenerationAsync(chat, content, { llm, settings: { planner: true } });
    assert.ok(rec(chat[1]).events.some(e => e.t === 'cmd.resolved' && e.d.type === 'quest.turn_in' && e.d.status === 'conditional'));
    const before = foldChat(chat).state.entities.pc.sheet.coin_cp;
    chat.push({ mes: c.prose, is_user: false, is_system: false, extra: {} });
    processReplyAny(chat, 2, content); await runExtraction(chat, 2, content, llm);
    assert.equal(rec(chat[2]).extraction.status, 'applied');
    const reload = JSON.parse(JSON.stringify(chat)), state = foldChat(reload);
    assert.deepEqual(state.errors, []); assert.equal(state.state.entities.pc.sheet.coin_cp, before + 140);
    assert.deepEqual(validateState(state.state, content), []);
    await runExtraction(chat, 2, content, llm); assert.equal(calls.filter(x => x === 'extract').length, 1);
    reload[2].mes = 'Alaric has not reached Marsh Hollow yet.';
    assert.equal(foldChat(reload).state.entities.pc.sheet.coin_cp, before);
    reload[2].mes = c.prose;
    assert.equal(foldChat(reload).state.entities.pc.sheet.coin_cp, before + 140);
});
test('119 a sign and no local clerk cannot establish a functional branch or pay', () => {
    const r = original('branch', (s, a) => { a.deltas = a.deltas.filter(d => !['person.new', 'aware', 'fact'].includes(d.type)); });
    assert.equal(hallOfSettlement(r.state, 'loc.marsh_hollow'), null);
    assert.equal(r.state.entities.pc.sheet.coin_cp, r.planned.entities.pc.sheet.coin_cp);
});
test('119 absent staff and unconfirmed travel cannot lend the destination functional status or pay', () => {
    const r = original('branch', (s, a) => {
        a.expected['3'].arrived = false; a.deltas = a.deltas.filter(d => d.type !== 'arrive');
        const d = a.deltas.find(x => x.type === 'person.new'); d.present = false;
    });
    assert.equal(r.state.scene.at, r.planned.scene.at); assert.equal(hallOfSettlement(r.state, 'loc.marsh_hollow'), null);
    assert.equal(r.state.entities.pc.sheet.coin_cp, r.planned.entities.pc.sheet.coin_cp);
});
test('119 a visit to a settlement without an explicit Guild destination creates no handover conditional', () => {
    const c = source('branch'), s = structuredClone(states.branch);
    const commands = c.commands.map(d => d.type === 'go' ? { ...d, quote: 'I travel to Marsh Hollow.' } : d);
    const p = plan(s, commands, 'I travel to Marsh Hollow.');
    assert.equal(p.ctx.resolutions.find(x => x.type === 'quest.turn_in').status, 'refused');
});
test('119 a town-id GO with explicit Guild destination also works when already in that town', () => {
    const c = source('branch'), s = structuredClone(states.branch);
    s.scene.at = 'loc.marsh_hollow'; s.scene.location = 'loc.marsh_hollow'; s.scene.present = ['pc'];
    const p = plan(s, c.commands.filter(d => ['go', 'quest.turn_in'].includes(d.type)), c.input);
    assert.equal(p.ctx.resolutions.find(x => x.type === 'go').status, 'authorized');
    assert.equal(p.ctx.resolutions.find(x => x.type === 'quest.turn_in').status, 'conditional');
});
test('119 without player GO, a false arrival and staff introduction never grant local presence or payment', () => {
    const c = source('branch'), s = structuredClone(states.branch); plan(s, [c.commands.at(-1)], 'I turn in my contract.');
    const r = applyWorld(s, content, c.answer, { prose: c.prose, msg: c.msg });
    assert.equal(r.state.scene.at, s.scene.at);
    assert.equal(hallOfSettlement(r.state, 'loc.marsh_hollow'), null);
    assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp);
});
test('119 old Ruleset 1 does not infer functional branches from local clerks', () => {
    const r = original('branch', s => { s.meta.ruleset = 1; });
    assert.equal(hallOfSettlement(r.state, 'loc.marsh_hollow'), null);
});
