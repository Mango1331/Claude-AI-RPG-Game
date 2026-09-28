// Runtime V4: the domain/authority firewall between the world-delta extractor and the commit (src/v4/firewall.js,
// plan §5.7, docs/P0_BERICHT.md §11). One test per authority rule, each with the case it must let through, and the
// measurement on the recorded P0/S2 answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { firewall } from '../../src/v4/firewall.js';
import { firewallStats } from '../../tools/p0/rescore.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WOLF = { id: 'quest.wolf_problem', title: 'Wolf Problem — Millbrook Hamlet', payout_cp: 80, client: 'Reeve Aldous', status: 'active' };
const HERB = { id: 'quest.herb_run_marshmint', title: 'Herb Run — Marshmint', payout_cp: 40, client: null, status: 'active' };
const base = (over = {}) => ({
    isGuildPerson: (ref) => ['npc.marta', 'marta'].includes(String(ref).toLowerCase()),
    inGuildHall: false,
    contracts: [WOLF, HERB],
    booked: { registration: false, grants: [], turnIns: [], accepted: [] },
    auth: { go: false, take: false, gather: false, roam: false },
    heldByPc: (ref) => ['obj.guild_plate', 'obj.contract_slip'].includes(ref),
    ...over,
});
const verdict = (deltas, ctx) => {
    const r = firewall(deltas, ctx);
    return { accepted: r.accept.map((d) => d.type), rules: r.reject.map((x) => x.rule), corrections: r.corrections };
};

test('the Guild fee is no ordinary offer; the Guild hall\'s ale is', () => {
    const fee = { seq: 1, type: 'offer', seller: 'npc.guild_clerk', lines: [{ what: 'Guild registration (plate, first stamp)', kind: 'service', service: 'other', qty: 1, price_cp: 20 }] };
    assert.deepEqual(verdict([fee], base({ inGuildHall: true })).rules, ['guild_canon_price']);
    const byName = { ...fee, seller: 'Marta' };
    assert.deepEqual(verdict([byName], base()).rules, ['guild_canon_price'], 'a Guild official named by name, as the resolver knows her');
    const ale = { seq: 1, type: 'offer', seller: 'npc.counter_woman', lines: [{ what: 'mug of ale', kind: 'goods', service: null, qty: 1, price_cp: 2 }] };
    assert.deepEqual(verdict([ale], base({ inGuildHall: true, isGuildPerson: (r) => r === 'npc.counter_woman' })).accepted, ['offer']);
    const smith = { seq: 1, type: 'offer', seller: 'npc.smith', lines: [{ what: 'plate armour repair', kind: 'service', service: 'other', qty: 1, price_cp: 30 }] };
    assert.deepEqual(verdict([smith], base()).accepted, ['offer'], 'a smith who names a price for "plate" is not the Guild');
});

test('a payout is never a coin.gift: not from the Guild, not from the client of a Guild contract; a tip is a gift', () => {
    const guild = { seq: 1, type: 'coin.gift', from: 'npc.guild_clerk', cp: 40, why: 'payment for the herb run' };
    const r = verdict([guild], base({ inGuildHall: true }));
    assert.deepEqual(r.rules, ['guild_payout']);
    assert.equal(r.corrections.length, 1);
    // P0/S2 v11_11: the reeve pays the posted reward out of the hamlet's fund
    const reeve = { seq: 1, type: 'coin.gift', from: 'npc.reeve_aldous', cp: 80, why: 'hamlet payment for the Wolf Problem, counted from the hamlet\'s winter fund' };
    assert.deepEqual(verdict([reeve], base()).rules, ['guild_payout']);
    assert.match(verdict([reeve], base()).corrections[0], /paid only by the Guild/);
    const tip = { seq: 1, type: 'coin.gift', from: 'npc.tomas', cp: 5, why: 'thanks for walking him home' };
    assert.deepEqual(verdict([tip], base()).accepted, ['coin.gift']);
    // a clerk outside a Guild hall is not the Guild: the harbour office pays a day's wages
    const wages = { seq: 1, type: 'coin.gift', from: 'npc.harbour_clerk', cp: 12, why: 'wages for a day of unloading' };
    assert.deepEqual(verdict([wages], base()).accepted, ['coin.gift']);
});

test('what the engine handed over is not handed over twice: plate after registration, contract slip after acceptance', () => {
    const plate = { seq: 1, type: 'object.new', name: 'brass Guild plate (ALARIC RED — WARRIOR — NOVICE)', kind: 'item', qty: 1, unit: null, holder: 'pc', for_quest: null };
    const reg = base({ booked: { registration: true, grants: ['brass Guild plate'], turnIns: [], accepted: [] } });
    assert.deepEqual(verdict([plate], reg).rules, ['engine_booked']);
    const badge = { ...plate, name: 'pewter Novice badge' };
    assert.deepEqual(verdict([badge], base({ booked: { registration: true, grants: ['pewter Novice badge'] } })).rules, ['engine_booked']);
    const slip = { seq: 1, type: 'object.new', name: 'Quest slip for Rats in the Salt Cellar', kind: 'document', qty: 1, unit: null, holder: 'pc', for_quest: 'quest.herb_run_marshmint' };
    assert.deepEqual(verdict([slip], base({ booked: { accepted: ['quest.herb_run_marshmint'], grants: ['contract slip'] } })).rules, ['engine_booked']);
    const again = { seq: 1, type: 'object.move', object: 'obj.guild_plate', qty: null, to: 'pc' };
    assert.deepEqual(verdict([again], base()).rules, ['engine_booked'], 'P0/S2 v10_04: the badge "moved" to Alaric although he holds it');
});

test('Alaric holds a new thing only after his own take or gather; a hand-over is a move to him', () => {
    const heads = { seq: 1, type: 'object.new', name: 'two wolf heads', kind: 'trophy', qty: 2, unit: null, holder: 'pc', for_quest: null };
    assert.deepEqual(verdict([heads], base()).rules, ['pc_inventory']);
    assert.deepEqual(verdict([heads], base({ auth: { take: true } })).accepted, ['object.new']);
    const mint = { seq: 1, type: 'object.new', name: 'marshmint', kind: 'resource', qty: 1, unit: 'basket', holder: 'pc', for_quest: 'quest.herb_run_marshmint' };
    assert.deepEqual(verdict([mint], base({ auth: { gather: true } })).accepted, ['object.new']);
    const gift = [
        { seq: 1, type: 'object.new', name: 'pouch of dried meat', kind: 'item', qty: 1, unit: null, holder: 'npc.tomas', for_quest: null },
        { seq: 2, type: 'object.move', object: { new: 'pouch of dried meat' }, qty: null, to: 'pc' },
    ];
    assert.deepEqual(verdict(gift, base()).accepted, ['object.new', 'object.move']);
    const away = { seq: 1, type: 'object.move', object: 'obj.contract_slip', qty: null, to: 'npc.reeve_aldous' };
    assert.deepEqual(verdict([away], base()).rules, ['pc_inventory']);
});

test('official contracts come only from the board; private work may come from the story', () => {
    const official = { seq: 1, type: 'quest.offer', title: 'Cellar Rats', giver: 'Guild board', reward_cp: 30, objectives: ['clear the rats'], proof: ['tails'] };
    assert.deepEqual(verdict([official], base()).rules, ['guild_listing']);
    const clerk = { ...official, giver: 'npc.desk_clerk' };
    assert.deepEqual(verdict([clerk], base({ inGuildHall: true })).rules, ['guild_listing']);
    const private_ = { seq: 1, type: 'quest.offer', title: 'Mend the fence', giver: 'npc.widow_marsh', reward_cp: 15, objectives: ['mend the fence'], proof: [] };
    assert.deepEqual(verdict([private_], base()).accepted, ['quest.offer']);
});

test('a Guild contract closes as completed only at the desk; failure and private work close in the story', () => {
    const done = { seq: 1, type: 'quest.close', quest: 'quest.wolf_problem', status: 'completed', by: 'npc.reeve_aldous' };
    const r = verdict([done], base());
    assert.deepEqual(r.rules, ['guild_completion']);
    assert.match(r.corrections[0], /still open/);
    assert.deepEqual(verdict([{ ...done, status: 'failed' }], base()).accepted, ['quest.close']);
    assert.deepEqual(verdict([{ ...done, quest: 'quest.mend_fence' }], base()).accepted, ['quest.close'], 'private work is closed by its giver');
    const byTitle = { ...done, quest: { new: 'Herb Run — Marshmint' } };
    assert.deepEqual(verdict([byTitle], base()).rules, ['guild_completion'], 'a known contract named by its title is that contract');
    const deliver = { seq: 1, type: 'quest.progress', quest: 'quest.herb_run_marshmint', objective: 'deliver 1 basket of marshmint to the Guild', status: 'done' };
    assert.deepEqual(verdict([deliver], base()).rules, ['guild_completion']);
    const kill = { seq: 1, type: 'quest.progress', quest: 'quest.wolf_problem', objective: 'kill the two wolves', status: 'done' };
    assert.deepEqual(verdict([kill], base()).accepted, ['quest.progress']);
    const seal = { seq: 1, type: 'quest.progress', quest: 'quest.wolf_problem', objective: 'deliver two wolf heads verified by the reeve', status: 'done' };
    assert.deepEqual(verdict([seal], base()).accepted, ['quest.progress'], 'a step at the client is progress, not the turn-in');
});

test('facts: Alaric\'s possessions and standing are the engine\'s; a place that "has" three cellars is a fact', () => {
    const f = (s, p, o) => ({ seq: 1, type: 'fact', s, p, o });
    assert.deepEqual(verdict([f('Alaric Red', 'registered as Guild Novice', 'Adventurers\' Guild, Redmarch')], base()).rules, ['engine_owned_fact']);
    assert.deepEqual(verdict([f('pc', 'has', '40 cp')], base()).rules, ['engine_owned_fact']);
    assert.deepEqual(verdict([f('npc.tomas', 'located', 'the mill')], base()).rules, ['domain_fact']);
    assert.deepEqual(verdict([f('association granary', 'has', 'three cellars under the ground floor')], base()).accepted, ['fact']);
    assert.deepEqual(verdict([f('Guild registration', 'takes', 'about a quarter hour')], base()).accepted, ['fact']);
    assert.deepEqual(verdict([f('Guild registration', 'costs', '2 silver')], base()).accepted, ['fact'], 'the story\'s words about the fee are a fact; the engine owns the price');
});

test('Alaric arrives only after his own go, a forced move or an activity that moves him', () => {
    const arrive = { seq: 1, type: 'arrive', at: { new: { name: 'Blue Ox Tavern', kind: 'site', parent: 'loc.redmarch' } } };
    const r = verdict([arrive], base());
    assert.deepEqual(r.rules, ['no_go']);
    assert.match(r.corrections[0], /did not travel/);
    assert.deepEqual(verdict([arrive], base({ auth: { go: true } })).accepted, ['arrive']);
    assert.deepEqual(verdict([arrive], base({ auth: { roam: true } })).accepted, ['arrive'], 'P0/S2 v11_07: tracking a trail leads him to the den');
    assert.deepEqual(verdict([arrive], base({ auth: { forced: true } })).accepted, ['arrive']);
});

test('world deltas outside the engine\'s domains pass untouched', () => {
    const world = [
        { seq: 1, type: 'time', minutes: 20 },
        { seq: 2, type: 'person.new', ref: 'innkeeper', name: null, role: 'innkeeper', desc: ['stout'], present: true, at: null, band: null },
        { seq: 3, type: 'offer', seller: 'innkeeper', lines: [{ what: 'room for the night', kind: 'service', service: 'lodging', qty: 1, price_cp: 4 }] },
        { seq: 4, type: 'hostile', by: ['mon.wolf_leader'] },
        { seq: 5, type: 'overreach', kind: 'payment', what: 'paid for the room' },
    ];
    assert.deepEqual(verdict(world, base()).accepted, ['time', 'person.new', 'offer', 'hostile', 'overreach']);
});

test('P0/S2 offline: the firewall refuses 6 of the 7 forbidden deltas of variant A and loses no critical delta', async () => {
    const aFile = path.join(ROOT, 'p0_out', 's2', 'a.json');
    if (!fs.existsSync(aFile)) return;
    const turns = fs.readFileSync(path.join(ROOT, 'tests', 'eval', 'deltas.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    const a = JSON.parse(fs.readFileSync(aFile, 'utf8'));
    const s = await firewallStats(a.records.map((r) => ({ id: r.id, value: r.valid_final ? r.value : null })), turns);
    assert.equal(s.answers, 41);
    assert.equal(s.forbidden_before, 7);
    assert.equal(s.forbidden_after, 1);
    assert.deepEqual(s.remaining.map((x) => x.id), ['v11_05'], 'a plan read as private work: the extractor\'s error, no authority question');
    assert.equal(s.critical_after, s.critical_before);
    assert.equal(s.refused.filter((x) => x.gold === 'critical').length, 0);
    assert.deepEqual(s.refused.filter((x) => x.gold === 'neither').map((x) => `${x.id}:${x.rule}`), ['v8_04:engine_booked', 'v10_03:engine_owned_fact', 'v10_03:engine_owned_fact']);
});
