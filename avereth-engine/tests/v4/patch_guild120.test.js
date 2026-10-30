import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { fold, applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { guildDestination, hallOfSettlement, today } from '../../src/v4/domain.js';
import { acceptContract, parseBoard, boardRequest, goalText, defeatTally, contractReady, COUNT_BOARD_PROFILE } from '../../src/v4/guild.js';
import { validateState } from '../../src/validate.js';
const content = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/batch15_guild120.json', import.meta.url)));
const bases = Object.fromEntries(Object.entries(fx.cases).map(([k, c]) => [k, fold(fx.events.slice(0, c.before))]));
const A = 'quest.cull_bog_striders_at_the_reed_flats_eel_weirs_2';
const B = 'quest.thin_the_bog_striders_at_the_reed_flats_eel_weirs';
const VIPER = 'quest.cull_the_mud_viper_at_the_mill_wheel_shallows_2';
const TOWN = 'loc.stilt_village_on_the_reed_flats';
const HALL = TOWN + '.stilt_village_guild_hall';
function plan(s, commands, text = '') {
    const events = [], emit = e => { events.push(e); applyEvent(s, e); };
    const ctx = resolveCommands(s, content, structuredClone(commands), emit, { c: true, text });
    s.last.outcome = { auth: ctx.auth, conditionals: ctx.conditionals, expected_keys: ctx.expectedKeys, resolutions: ctx.resolutions, booked: ctx.booked };
    return { events, ctx };
}
function visit(name, mutate = () => {}) {
    const c = fx.cases[name], s = structuredClone(bases[name]), answer = structuredClone(c.answer);
    mutate(s, answer); const p = plan(s, c.commands, c.input);
    return { ...applyWorld(s, content, answer, { prose: c.prose, msg: c.msg }), planned: s, commandEvents: p.events };
}
function accept(s, q) {
    const events = [], result = acceptContract(s, content, q, e => { events.push(e); applyEvent(s, e); }, { step: 1 });
    return { result, events };
}
const need = s => ({ branch: 'loc.glassmere', rank: 'Novice', missing: 5, have: [], day: today(s), c: true, profile: COUNT_BOARD_PROFILE, progression: true });
const parse = (s, ls = fx.cases.board.listings, n = need(s)) => parseBoard(JSON.stringify({ listings: ls }), content, n, s);

test('120 original T141 completed Viper handover pays 40 once at the established foreign Guild', () => {
    const r = visit('turnin');
    assert.equal(contractReady(r.planned, content, r.planned.quests[VIPER], { c: true }).ok, true);
    assert.equal(r.state.scene.at, HALL); assert.equal(r.state.quests[VIPER].status, 'completed');
    assert.equal(r.state.entities.pc.sheet.coin_cp, 749);
    assert.equal(r.events.filter(e => e.t === 'transaction.completed' && e.d.quest === VIPER).length, 1);
    assert.deepEqual(validateState(r.state, content), []);
    assert.deepEqual(fold(JSON.parse(JSON.stringify(r.events)), r.planned), r.state);
    const repeat = plan(r.state, [{ seq: 1, type: 'quest.turn_in', quest: VIPER, quote: 'I turn in the viper contract.' }]);
    assert.ok(!repeat.events.some(e => e.t === 'coin.changed' || e.t === 'xp.changed'));
});
for (const name of ["the stilt village Guild hall", "the stilt village's Guild hall"])
    test('120 an established premises resolves before a descriptive town qualifier: ' + name, () => {
        assert.equal(guildDestination(bases.turnin, name, TOWN, { allowNew: true })?.id, HALL);
    });
test('120 original T127 first founding reaches the desk check and explicitly refuses 5/6, rather than expiring', () => {
    const r = visit('founding');
    assert.equal(hallOfSettlement(r.state, TOWN), HALL);
    assert.equal(r.state.entities.pc.sheet.coin_cp, 414);
    assert.equal(r.events.filter(e => e.t === 'cmd.completed' && e.d.ok === false && /5 of 6/.test(e.d.reason)).length, 2);
    assert.ok(!r.events.some(e => e.t === 'cmd.expired'));
});
test('120 a READY control on the first founding can complete at the same canonical desk', () => {
    const r = visit('founding', s => { s.quests[A].objectives[0].qty = 5; s.quests[B].objectives[0].qty = 5; });
    assert.equal(r.state.entities.pc.sheet.coin_cp, 714);
    assert.equal(r.state.quests[A].status, 'completed'); assert.equal(r.state.quests[B].status, 'completed');
});
test('120 an explicit canonical town mismatch still blocks conditional payout', () => {
    const c = fx.cases.founding, s = structuredClone(bases.founding); plan(s, c.commands, c.input);
    s.last.outcome.auth.gos[0].guild_settlement = 'loc.glassmere';
    const r = applyWorld(s, content, c.answer, { prose: c.prose, msg: c.msg });
    assert.equal(r.state.entities.pc.sheet.coin_cp, 414); assert.equal(r.state.quests[A].status, 'active');
});
test('120 a false arrival and no functional hall never pay', () => {
    const r = visit('turnin', (s, a) => {
        for (const v of Object.values(a.expected)) if ('arrived' in v) v.arrived = false;
        a.deltas = a.deltas.filter(d => !['arrive', 'guild.branch', 'enter', 'person.new'].includes(d.type));
    });
    assert.equal(r.state.entities.pc.sheet.coin_cp, 709); assert.equal(r.state.quests[VIPER].status, 'active');
});
test('120 ambiguous equally named premises in different settlements are not arbitrarily selected', () => {
    const s = structuredClone(bases.turnin), other = 'loc.other_village';
    s.places[other] = { id: other, name: 'Other Village', kind: 'settlement', parent: s.places[TOWN].parent };
    s.places[other + '.hall'] = { ...s.places[HALL], id: other + '.hall', parent: other };
    assert.ok(!guildDestination(s, 'the stilt village Guild hall', null, { allowNew: true })?.id);
});
test('120 original second Strider acceptance cannot stack its counted population', () => {
    const s = structuredClone(bases.accept), before = structuredClone(s), c = fx.cases.accept;
    const p = plan(s, c.commands, c.input);
    assert.equal(s.quests[A].status, 'active'); assert.equal(s.quests[B].status, 'listed');
    assert.match(p.ctx.resolutions[0].reason, /already|active|hunt/i);
    assert.ok(!p.events.some(e => e.t === 'object.created' && e.d.object.for_quests?.includes(B)));
    assert.deepEqual(s.entities.pc.sheet, before.entities.pc.sheet);
    assert.match(goalText(s, content, s.quests[B], { board: true }), /already.*active/i);
});
test('120 title, quantity, client, listing day and issuing branch cannot disguise the same population', () => {
    const s = structuredClone(bases.accept), q = s.quests[B];
    q.title = 'A completely different bounty'; q.client = 'Another client'; q.objectives[0].qty = 2;
    q.source.branch = TOWN; q.source.listed.day += 1;
    assert.equal(accept(s, q).result.ok, false);
});
test('120 two acceptances in one input reserve the target for only the first', () => {
    const s = structuredClone(bases.accept); s.quests[A].status = 'listed';
    s.quests[A].source.listed.day = today(s);
    const p = plan(s, [A, B].map((quest, i) => ({ seq: i + 1, type: 'quest.accept', quest, quote: 'I accept both contracts.' })));
    assert.equal(s.quests[A].status, 'active'); assert.equal(s.quests[B].status, 'listed');
    assert.equal(p.events.filter(e => e.t === 'quest.status' && e.d.to === 'active').length, 1);
});
test('120 conditional acceptance checks the active hunt again after actual Guild arrival', () => {
    const s = structuredClone(bases.accept); s.scene.at = 'loc.glassmere'; s.scene.present = ['pc'];
    plan(s, [{ seq: 1, type: 'go', to: 'loc.glassmere.guild_hall', quote: 'I go to the Guild hall.' },
        { seq: 2, type: 'quest.accept', quest: B, quote: 'I accept the Strider contract.' }]);
    const r = applyWorld(s, content, { scene: 'loc.glassmere.guild_hall', expected: { 1: { arrived: true, at: 'loc.glassmere.guild_hall', with: null } },
        deltas: [{ seq: 1, type: 'arrive', at: 'loc.glassmere.guild_hall', with: null, forced_by: null }] }, { prose: 'Alaric entered the Guild hall.' });
    assert.equal(r.state.quests[B].status, 'listed');
    assert.ok(r.events.some(e => e.t === 'cmd.completed' && e.d.seq === 2 && !e.d.ok));
    assert.deepEqual(fold(JSON.parse(JSON.stringify(r.events)), s), r.state);
});
test('120 original next-day Board response refuses the active Strider duplicate', () => {
    const r = parse(structuredClone(bases.board));
    assert.ok(r.refused.some(x => /Thin the Bog Striders/.test(x.title) && /duplicate|active.*hunt/i.test(x.why)));
});
test('120 Board prompt gives active counted hunts to the generator and Repair uses the same validator', () => {
    const s = structuredClone(bases.board), text = boardRequest(s, content, need(s));
    assert.match(text.system + JSON.stringify(text.messages), /ACTIVE HUNTS/);
    assert.ok((text.system + JSON.stringify(text.messages)).includes(A));
    const fixed = structuredClone(fx.cases.board.listings), l = fixed.find(l => /Thin the Bog Striders/.test(l.title));
    l.title = 'Cull Bog Striders at the Eastern Reed Ponds'; l.objectives[0].where = 'Eastern Reed Ponds';
    const r = parse(s, fixed); assert.equal(r.listings?.length, 5, JSON.stringify(r.refused));
});
test('120 two renamed notices for the same target on a new Board cannot coexist', () => {
    const s = structuredClone(bases.board); s.quests[A].status = 'completed';
    const ls = structuredClone(fx.cases.board.listings), source = ls.find(l => /Thin the Bog Striders/.test(l.title));
    const i = ls.findIndex(l => l !== source && l.habitat && l.level > 1);
    ls[i] = { ...structuredClone(source), title: 'Another Strider bounty' }; ls[i].objectives[0].qty = 4;
    assert.ok(parse(s, ls).refused.some(x => /duplicate.*hunt/i.test(x.why)));
});
test('120 a retained listing is also protected against a duplicate during a partial refill', () => {
    const s = structuredClone(bases.accept); s.quests[A].status = 'completed';
    const ls = structuredClone(fx.cases.board.listings), old = ls.find(l => /Thin the Bog Striders/.test(l.title));
    const rest = ls.filter(l => l !== old), i = rest.findIndex(l => l.habitat && l.level > 1);
    rest[i] = { ...structuredClone(old), title: 'A fresh-looking Strider notice' };
    const n = { ...need(s), missing: 4, have: [s.quests[B].title] };
    assert.ok(parse(s, rest, n).refused.some(x => /duplicate.*hunt/i.test(x.why)));
});
test('120 actual Board Repair replaces the duplicate while preserving all five slots and leaves no partial state', async () => {
    const { generateBoard } = await import('../../src/v4/runtime.js');
    const s = structuredClone(bases.board), before = structuredClone(s), fixed = structuredClone(fx.cases.board.listings);
    const l = fixed.find(l => /Thin the Bog Striders/.test(l.title));
    l.title = 'Cull Bog Striders at the Eastern Reed Ponds'; l.objectives[0].where = 'Eastern Reed Ponds';
    const requests = [];
    const r = await generateBoard(async req => {
        requests.push(req);
        return JSON.stringify({ listings: requests.length === 1 ? fx.cases.board.listings : fixed });
    }, s, content, need(s));
    assert.equal(requests.length, 2); assert.equal(r.listings.length, 5);
    assert.match(JSON.stringify(requests[1]), /duplicate counted hunt targets/);
    assert.deepEqual(s, before);
});
test('120 original T141 through Planner, Runtime, extraction, Reload and Swipe pays the READY contract once', async () => {
    const { prepareGenerationAsync, processReplyAny, runExtraction } = await import('../../src/v4/runtime.js');
    const { foldChat, rec } = await import('../../src/host.js');
    const c = fx.cases.turnin, chat = [
        { mes: 'Recorded earlier campaign', is_user: false, extra: { avereth: { v: 3, events: structuredClone(fx.events.slice(0, c.before)) } } },
        { mes: c.input, is_user: true, is_system: false, extra: {} },
    ];
    const calls = [], llm = async req => {
        calls.push(req.purpose);
        if (req.purpose === 'plan') return JSON.stringify({ commands: c.commands });
        if (req.purpose === 'extract') return JSON.stringify(c.answer);
        throw Error(req.purpose);
    };
    await prepareGenerationAsync(chat, content, { llm, settings: { planner: true } });
    chat.push({ mes: c.prose, is_user: false, is_system: false, extra: {} });
    processReplyAny(chat, 2, content); await runExtraction(chat, 2, content, llm);
    assert.equal(rec(chat[2]).extraction.status, 'applied');
    const reload = JSON.parse(JSON.stringify(chat)), saved = foldChat(reload);
    assert.deepEqual(saved.errors, []); assert.equal(saved.state.entities.pc.sheet.coin_cp, 749);
    assert.equal(saved.state.quests[VIPER].status, 'completed'); assert.deepEqual(validateState(saved.state, content), []);
    await runExtraction(chat, 2, content, llm); assert.equal(calls.filter(x => x === 'extract').length, 1);
    reload[2].mes = 'Alaric has not arrived at the Guild hall yet.';
    assert.equal(foldChat(reload).state.entities.pc.sheet.coin_cp, 709);
    reload[2].mes = c.prose; assert.equal(foldChat(reload).state.entities.pc.sheet.coin_cp, 749);
});
for (const status of ['completed', 'abandoned']) test('120 a ' + status + ' hunt allows fresh work, without reusing its old kills', () => {
    const s = fold(fx.events), q = { ...structuredClone(s.quests[B]), id: 'quest.new_hunt', status: 'listed', history: [], taker: null };
    for (const old of Object.values(s.quests)) if (old.hunt?.at === q.hunt.at) old.status = status;
    s.turn += 1; s.quests[q.id] = q;
    assert.equal(accept(s, q).result.ok, true); assert.equal(defeatTally(s, content, q)[0].done, 0);
});
test('120 another world population remains independent', () => {
    const s = structuredClone(bases.accept), q = s.quests[B];
    q.hunt.at = 'loc.different_hunting_population'; assert.equal(accept(s, q).result.ok, true);
});
function dungeonContracts(s) {
    const q = structuredClone(s.quests[B]); delete q.hunt;
    return ['crystal beetles', 'the Glimmer Queen'].map((what, i) => ({ ...structuredClone(q), id: 'quest.dungeon_test' + i,
        status: i ? 'listed' : 'active', taker: i ? null : 'pc', dungeon: 'loc.glimmerdeep_grotto', floor: 1,
        objectives: [{ id: 'o1', verb: 'DEFEAT', what, qty: i ? 1 : 2, unit: null, where: 'Glimmerdeep Grotto' }] }));
}
test('120 distinct regular Dungeon foes and its named boss remain separate targets', () => {
    const s = structuredClone(bases.accept), [regular, boss] = dungeonContracts(s);
    s.quests[regular.id] = regular; s.quests[boss.id] = boss;
    assert.equal(accept(s, boss).result.ok, true);
});
test('120 duplicated Dungeon culls of the same encounter targets are refused', () => {
    const s = structuredClone(bases.accept), [regular] = dungeonContracts(s);
    const other = { ...structuredClone(regular), id: 'quest.another_beetle_cull', status: 'listed', taker: null };
    s.quests[regular.id] = regular; s.quests[other.id] = other;
    assert.equal(accept(s, other).result.ok, false);
});
test('120 already active historical duplicates keep their original completed payments during replay', () => {
    const s = fold(JSON.parse(JSON.stringify(fx.events)));
    assert.equal(s.quests[A].status, 'completed'); assert.equal(s.quests[B].status, 'completed');
    for (const id of [A, B]) assert.equal(fx.events.filter(e => e.t === 'transaction.completed' && e.d.quest === id).length, 1);
    assert.deepEqual(validateState(s, content), []);
});
test('120 Ruleset 1 keeps its previous acceptance semantics', () => {
    const s = structuredClone(bases.accept); s.meta.ruleset = 1;
    assert.equal(accept(s, s.quests[B]).result.ok, true);
});
