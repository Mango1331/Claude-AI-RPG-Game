// Build .182 – Patch 3 of the natural NPC/PULSE batch 12./13.11.2026 (testrun_10b/npc-20261112-220625Z/REVIEW.md on
// main: GPT §6, Fable §8.3 C and §8.4 P2-4/P2-5, GPT §9.3, GPT §10). Two separate corrections in one build:
//   P2-4  a status correction of a contract this very reply turned in tells its final status, not the one the firewall
//         saw before the turn-in (Mage T40 → T42: "ACTIVE … nothing paid" beside a booked payout);
//   P2-5  form without meaning (a string for a one-element list, evidence on a delta type that reads none, a seq as
//         digits, a time without seq at a place beyond doubt) no longer loses the answer or asks a repair; an extra aware
//         on person.new (Mage T3) is NOT among them: it decides a later stealth check, so it stays the repair's.
// The batch ZIP is not in the repository (SOURCE_MANIFEST.md): P2-4 runs on the original User04 turn I63/I64 (GO +
// conditional turn-in, its original prose) with a synthetic status claim of the kind Mage T40 had; P2-5 on the forms
// the review names and the corpus b16–b19 shows (eight first answers repaired for exactly these).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';
import { parseExtraction } from '../../src/v4/extract.js';
import { extractorCatalog } from '../../src/v4/catalog.js';
import { campaign, say } from './patch8_lib.js';
import { Chat4 } from './harness.js';
import { validateState } from '../../src/validate.js';
import { applyWorld } from '../../src/v4/world.js';

const content = await loadProductContent();

// ------------------------------------------------------------------------------------------------ P2-4
const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user04_qol159.json.gz', import.meta.url))));
const before = (i) => foldChat(structuredClone(f.chat), i).state;
const cmds = (i) => rec(f.chat[i]).events.find((e) => e.t === 'cmd.interpreted').d.commands;
const HALL = 'loc.alderwatch.guild_hall', CLERKS = 'npc.npcguild_clerks';
const CATA = 'quest.clear_the_old_crown_catacombs_level_1', VIPER = 'quest.the_millrace_viper';
const p63 = playerTurnV4(before(63), content, f.chat[63].mes, { msg: 63, c: true, commands: cmds(63), board: f.board });
const ARRIVE = { scene: null, seq: 1, type: 'arrive', at: HALL, forced_by: null, with: null };
const ENTER = { scene: null, seq: 2, type: 'enter', who: CLERKS, evidence: null };
const PAID = (seq = 3, s = CATA) => ({ scene: null, seq, type: 'fact', s, p: 'status', o: 'completed and paid' });
const i64 = (deltas, { arrived = true } = {}) => replyTurnV4(structuredClone(p63.state), content,
    { scene: arrived ? HALL : null, expected: { 1: { arrived, at: arrived ? HALL : null, with: null, met: null } }, deltas }, { prose: f.chat[64].mes, msg: 64 });
const title = (id) => p63.state.quests[id].title;
const ACTIVE = (id) => `"${title(id)}" is ACTIVE: accepted, not yet turned in, nothing paid (the engine's state; the story does not change it).`;
const COMPLETED = (id) => `"${title(id)}" is COMPLETED: turned in and paid once (the engine's state; the story does not change it).`;
const coins = (r) => r.events.filter((e) => e.t === 'coin.changed').map((e) => e.d.delta);

test('.182 P2-4 Mage T40 kind (User04 I64): the conditional turn-in is booked on arrival; the correction of the paid claim tells COMPLETED, not "ACTIVE … nothing paid" (.181)', () => {
    assert.equal(p63.state.quests[CATA].status, 'active');
    assert.equal(p63.state.last.outcome.resolutions.find((x) => x.type === 'quest.turn_in')?.status, 'conditional');
    const r = i64([ARRIVE, ENTER, PAID()]);
    assert.equal(r.state.quests[CATA].status, 'completed');
    assert.deepEqual(coins(r), [90]);
    assert.equal(r.events.filter((e) => e.t === 'quest.status' && e.d.id === CATA).length, 1, 'one turn-in');
    assert.equal(r.events.filter((e) => e.t === 'cmd.completed' && e.d.ok).length, 1);
    assert.ok(r.rejected.some((x) => x.rule === 'engine_owned_fact'), 'the free fact is still the engine\'s to refuse');
    assert.ok(!r.corrections.includes(ACTIVE(CATA)), JSON.stringify(r.corrections));
    assert.deepEqual(r.corrections.filter((c) => c.includes(title(CATA))), [COMPLETED(CATA)]);
});

test('.182 P2-4: a quest note told before the arrival (its own step still saw ACTIVE) is told as the reply ends too', () => {
    // told where he set out from, before he walks over (its own step sees the contract ACTIVE)
    const paid = { scene: p63.state.scene.at, seq: 1, type: 'quest.detail', quest: CATA, note: 'Contract completed; payout 90 cp paid.', schedule: null };
    const r = i64([paid, { ...ARRIVE, seq: 2 }, { ...ENTER, seq: 3 }]);
    assert.ok(!r.rejected.some((x) => x.seq === 1 && x.rule === 'scene_context'), JSON.stringify(r.rejected));
    assert.equal(r.state.quests[CATA].status, 'completed');
    assert.ok(!r.corrections.includes(ACTIVE(CATA)), JSON.stringify(r.corrections));
    assert.deepEqual(r.corrections.filter((c) => c.includes(title(CATA)) && /is (?:ACTIVE|COMPLETED)/.test(c)), [COMPLETED(CATA)], JSON.stringify(r.corrections));
});

test('.182 P2-4 against: the turn-in does not happen (no arrival): the correction stays ACTIVE; nothing paid', () => {
    const r = i64([PAID(1)], { arrived: false });
    assert.equal(r.state.quests[CATA].status, 'active');
    assert.deepEqual(coins(r), []);
    assert.ok(r.corrections.includes(ACTIVE(CATA)), JSON.stringify(r.corrections));
    assert.ok(!r.corrections.includes(COMPLETED(CATA)));
});

test('.182 P2-4 against: another contract whose status did not change keeps its correction beside the updated one', () => {
    const other = p63.state.quests[VIPER];
    assert.equal(other.status, 'listed', 'a contract on the board the reply does not touch');
    const r = i64([ARRIVE, ENTER, PAID(), { ...PAID(4, VIPER), o: 'accepted and active' }]);
    assert.equal(r.state.quests[VIPER].status, 'listed');
    assert.deepEqual(r.corrections.filter((c) => c.includes(other.title)),
        [`"${other.title}" is still LISTED on the Guild board: Alaric has not accepted it and nothing is logged for him (the engine's state; the story does not change it).`], JSON.stringify(r.corrections));
    assert.deepEqual(r.corrections.filter((c) => c.includes(title(CATA))), [COMPLETED(CATA)]);
});

// ------------------------------------------------------------------------------------------------ P2-5: parse
const ASHBRIDGE = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Ashbridge, Duskreach`';
const AHALL = 'loc.ashbridge.guild_hall';
const base = await campaign(content, { greeting: ASHBRIDGE });
await say(base, '*I walk into the Guild hall*', { type: 'go', to: AHALL, quote: 'I walk into the Guild hall' });
const S0 = base.state();
const parse = (answer, s = S0) => {
    const cat = extractorCatalog(s, content, { c: true });
    return parseExtraction(JSON.stringify(answer), content.deltaVocab, { places: cat.places, objects: cat.objects, quests: cat.quests }, s.last.outcome.expected_keys,
        { sceneRequired: true, explicitArrivals: true, startScene: s.scene.at, state: s, content });
};
const GO1 = { 1: { arrived: true, at: AHALL, with: null } };
const CLERK = { type: 'person.new', ref: 'clerk', name: null, role: 'Guild clerk', desc: ['clerk with ink-stained cuffs'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' };
const RAT = { type: 'creature.new', ref: 'rat', species: 'cellar rat', anchor: 'rat', desc: ['a fat cellar rat'], count: 1, present: true, band: 'SHORT', cluster: null, stronger: null, threat: true, more: null, population: 'independent', life_stage: 'adult' };
const answer = (...deltas) => ({ scene: AHALL, expected: GO1, deltas: [{ seq: 1, type: 'arrive', at: AHALL, forced_by: null, with: null }, ...deltas] });
const errorsOf = (a) => parse(a).errors;

test('.182 P2-5 forms without meaning are valid: a one-string desc, evidence on leave, a seq as digits, desc null', () => {
    for (const [why, a] of [
        ['desc as its one string (corpus: 8 repairs)', answer({ seq: 2, ...RAT, desc: 'a fat cellar rat' })],
        ['leave with evidence (corpus: 1 repair)', answer({ seq: 2, ...CLERK }, { seq: 3, type: 'leave', who: 'clerk', evidence: 'the clerk went back to the ledger room' })],
        ['seq "2" as digits', answer({ seq: '2', ...CLERK })],
        ['desc null is an empty description', answer({ seq: 2, ...CLERK, desc: null })],
    ]) {
        const p = parse(a);
        assert.deepEqual(p.errors, [], why);
        assert.equal(p.valid, true, why);
    }
    const p = parse(answer({ seq: 2, ...RAT, desc: 'a fat cellar rat' }, { seq: '3', ...CLERK }, { seq: 4, type: 'leave', who: 'clerk', evidence: 'he went out' }));
    assert.deepEqual(p.value.deltas.map((d) => d.seq), [1, 2, 3, 4]);
    assert.deepEqual(p.value.deltas[1].desc, ['a fat cellar rat']);
    assert.ok(!('evidence' in p.value.deltas[3]));
});

test('.182 P2-5 Rogue T38: a time without seq takes the free number at its written place; nothing is guessed otherwise', () => {
    const t = { type: 'time', minutes: 30 };
    const ok = parse({ ...answer({ seq: 2, ...CLERK }), deltas: [{ seq: 1, type: 'arrive', at: AHALL, forced_by: null, with: null }, { seq: 2, ...CLERK }, t, { seq: 4, type: 'leave', who: 'clerk' }] });
    assert.deepEqual(ok.errors, []);
    assert.deepEqual(ok.value.deltas.map((d) => d.seq), [1, 2, 3, 4]);
    const last = parse({ ...answer(), deltas: [{ seq: 1, type: 'arrive', at: AHALL, forced_by: null, with: null }, t] });
    assert.deepEqual(last.value.deltas.map((d) => d.seq), [1, 2]);
    for (const [why, deltas] of [
        ['no free number', [{ seq: 1, type: 'arrive', at: AHALL, forced_by: null, with: null }, { seq: 2, ...CLERK }, t, { seq: 3, type: 'leave', who: 'clerk' }]],
        ['written out of order', [{ seq: 2, ...CLERK }, { seq: 1, type: 'arrive', at: AHALL, forced_by: null, with: null }, t, { seq: 5, type: 'leave', who: 'clerk' }]],
        ['another delta without seq too', [{ seq: 1, type: 'arrive', at: AHALL, forced_by: null, with: null }, { ...CLERK }, t]],
        ['not a time', [{ seq: 1, type: 'arrive', at: AHALL, forced_by: null, with: null }, { ...CLERK }]],
    ]) assert.ok(errorsOf({ ...answer(), deltas }).some((e) => /seq/.test(e)), why);
});

test('.182 P2-5 against: what may mean something stays an error for the repair', () => {
    for (const [why, a, re] of [
        ['Mage T3: person.new aware "aware" (an aware delta of its own: a later stealth check reads it)', answer({ seq: 2, ...CLERK, aware: 'aware' }), /aware/],
        ['aware true', answer({ seq: 2, ...CLERK, aware: true }), /aware/],
        ['aware "unaware" (an ambush is the engine\'s)', answer({ seq: 2, ...CLERK, aware: 'unaware' }), /aware/],
        ['another extra field (remote)', answer({ seq: 2, ...CLERK, remote: true }), /remote/],
        ['evidence on a delta that reads none, as a number', answer({ seq: 2, ...CLERK }, { seq: 3, type: 'leave', who: 'clerk', evidence: 4 }), /evidence/],
        ['null where a value is needed (role)', answer({ seq: 2, ...CLERK, role: null }), /role/],
        ['count null (how many is not known)', answer({ seq: 2, ...RAT, count: null }), /count/],
        ['a seq as digits that another delta has', answer({ seq: '1', ...CLERK }), /seq/],
        ['an empty string for a list', answer({ seq: 2, ...RAT, desc: '' }), /desc/],
        ['a place as {"new": "name"}', { ...answer(), deltas: [{ seq: 1, type: 'arrive', at: { new: 'the back room' }, forced_by: null, with: null }] }, /at|new/],
    ]) {
        const e = errorsOf(a);
        assert.ok(e.length && e.some((x) => re.test(x)), `${why}: ${JSON.stringify(e)}`);
    }
});

// ------------------------------------------------------------------------------------------------ P2-5: host path
test('.182 P2-5 corpus kind (b18-mage #40): an arrival beside a creature.new whose desc is one string, answered so twice, is recorded without a repair (.181: WORLD NOT RECORDED, the arrival lost)', async () => {
    const g = await campaign(content, { greeting: ASHBRIDGE });
    const from = g.state().scene.at;
    await say(g, '*I walk into the Guild hall*', { type: 'go', to: AHALL, quote: 'I walk into the Guild hall' });
    const calls = g.calls.length;
    const r = await g.reply('He steps into the Guild hall. A fat cellar rat scuttles along the wainscot.',
        { scene: AHALL, expected: GO1, deltas: [{ seq: 1, type: 'arrive', at: AHALL, forced_by: null, with: null }, { seq: 2, ...RAT, desc: 'a fat cellar rat' }, { seq: 3, type: 'time', minutes: 5 }] });
    assert.equal(r.record.extraction.status, 'applied', JSON.stringify(r.record.extraction));
    assert.deepEqual(g.calls.slice(calls).map((c) => c.purpose), ['extract'], 'no repair call');
    assert.notEqual(from, AHALL);
    assert.equal(g.state().scene.at, AHALL);
    const rat = g.state().scene.present.find((id) => g.state().entities[id]?.kind === 'creature');
    assert.ok(rat && g.state().entities[rat].descriptors.includes('a fat cellar rat'));
});

test('.182 P2-5 Rogue T38 kind: a time without seq beside the arrival no longer loses the answer', async () => {
    const g = await campaign(content, { greeting: ASHBRIDGE });
    await say(g, '*I walk into the Guild hall*', { type: 'go', to: AHALL, quote: 'I walk into the Guild hall' });
    const r = await g.reply('He walks in out of the rain and waits his turn at the counter.',
        { scene: AHALL, expected: GO1, deltas: [{ seq: 1, type: 'arrive', at: AHALL, forced_by: null, with: null }, { type: 'time', minutes: 20 }] });
    assert.equal(r.record.extraction.status, 'applied', JSON.stringify(r.record.extraction));
    assert.equal(g.state().scene.at, AHALL);
    assert.ok(r.record.events.some((e) => e.t === 'time.advanced' && e.d.minutes === 20));
});

test('.182 P2-5 against (host, Mage T3 kind): person.new with aware, answered so twice, still fails visibly and books nothing', async () => {
    const g = await campaign(content, { greeting: ASHBRIDGE });
    const from = g.state().scene.at;
    await say(g, '*I walk into the Guild hall*', { type: 'go', to: AHALL, quote: 'I walk into the Guild hall' });
    const r = await g.reply('He steps into the Guild hall. The clerk looks up at him.',
        { scene: AHALL, expected: GO1, deltas: [{ seq: 1, type: 'arrive', at: AHALL, forced_by: null, with: null }, { seq: 2, ...CLERK, aware: 'aware' }] });
    assert.equal(r.record.extraction.status, 'failed');
    assert.equal(g.state().scene.at, from);
});

// ------------------------------------------------------------------------------------------------ Patch 3, full brief
// The mandatory cases of the complete Patch 3 brief beyond the ones above: several contracts changing in one reply,
// Save/Reload and determinism on the host path, linked deltas behind an invalid one (no partial acceptance), no
// authority gained by a normalized form, and the place of what is booked.
const STALKER = 'quest.break_the_ashfen_stalker';
const LISTED = (id) => `"${title(id)}" is still LISTED on the Guild board: Alaric has not accepted it and nothing is logged for him (the engine's state; the story does not change it).`;

test('.182 P2-4 several contracts in one reply: a turn-in and an acceptance on arrival both tell their final status; a third, untouched, keeps its own', () => {
    const s = before(63);
    const cs = [...cmds(63), { seq: 3, type: 'quest.accept', quest: VIPER, quote: 'and take the Millrace Viper', needs: 1 }];
    const p = playerTurnV4(s, content, `${f.chat[63].mes} And I take the Millrace Viper.`, { msg: 63, c: true, commands: cs, board: f.board });
    const r = replyTurnV4(structuredClone(p.state), content, { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: null } }, deltas: [
        ARRIVE, ENTER, PAID(3, CATA), { ...PAID(4, VIPER), o: 'accepted and active' }, { ...PAID(5, STALKER), o: 'completed and paid' }] }, { prose: f.chat[64].mes, msg: 64 });
    assert.deepEqual([r.state.quests[CATA].status, r.state.quests[VIPER].status, r.state.quests[STALKER].status], ['completed', 'active', 'listed']);
    assert.deepEqual(coins(r), [90], 'one payout');
    assert.deepEqual(r.events.filter((e) => e.t === 'quest.status').map((e) => `${e.d.id} ${e.d.from}>${e.d.to}`).sort(), [`${CATA} active>completed`, `${VIPER} listed>active`].sort());
    // the firewall saw CATA ACTIVE and VIPER LISTED; both changed, both are told as they end; STALKER did not change
    assert.deepEqual(r.corrections.filter((c) => /\(the engine's state; the story does not change it\)/.test(c)).sort(), [COMPLETED(CATA), ACTIVE(VIPER), LISTED(STALKER)].sort(), JSON.stringify(r.corrections));
});

test('.182 P2-4 host path: the reply record holds the final correction; a reload folds the same valid state; the same reply again gives the same record', async () => {
    const run = async () => {
        const g = new Chat4(content);
        g.chat = f.chat.slice(0, 64).map((m) => structuredClone(m));
        return { g, r: await g.reply(f.chat[64].mes, { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: null } }, deltas: [ARRIVE, ENTER, PAID()] }) };
    };
    const { g, r } = await run();
    assert.equal(r.record.extraction.status, 'applied', JSON.stringify(r.record.extraction));
    assert.equal(g.state().quests[CATA].status, 'completed');
    assert.ok(r.record.corrections.includes(COMPLETED(CATA)), JSON.stringify(r.record.corrections));
    assert.ok(!r.record.corrections.includes(ACTIVE(CATA)));
    assert.equal(r.record.events.filter((e) => e.t === 'coin.changed' && e.d.delta === 90).length, 1);
    const folded = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(folded, g.state());
    assert.deepEqual(validateState(folded, content), []);
    const again = (await run()).r.record;
    const strip = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === 'ms' ? undefined : v)));
    assert.deepEqual(strip(again.events), strip(r.record.events));
    assert.deepEqual(again.corrections, r.record.corrections);
});

test('.182 P2-5 no partial acceptance (deferred): an arrive of the wrong form with a person after it, answered so twice, books neither; dropping only the arrive would put the person at the place he left', async () => {
    const shorthand = { seq: 1, type: 'arrive', at: { new: 'the back room' }, forced_by: null, with: null };
    const bad = { scene: AHALL, expected: GO1, deltas: [shorthand, { seq: 2, ...CLERK }] };
    assert.ok(parse(bad).errors.some((e) => /deltas\[0\]/.test(e)), 'the place form is not repaired by the engine');
    const g = await campaign(content, { greeting: ASHBRIDGE });
    const from = g.state().scene.at;
    await say(g, '*I walk into the Guild hall*', { type: 'go', to: AHALL, quote: 'I walk into the Guild hall' });
    const people = Object.keys(g.state().entities).length;
    const r = await g.reply('He steps into the back room of the Guild hall, where a clerk with ink-stained cuffs looks up.', bad);
    assert.equal(r.record.extraction.status, 'failed');
    assert.equal(g.state().scene.at, from);
    assert.equal(Object.keys(g.state().entities).length, people, 'nobody booked');
    // why the whole answer stays refused: without its arrive, the same person.new is booked where he set out from
    const s = structuredClone(g.state());
    const partial = applyWorld(s, content, { scene: 'here', expected: { 1: { arrived: false, at: null, with: null } }, deltas: [{ seq: 2, ...CLERK }] }, { msg: 99, prose: 'A clerk looks up.' });
    const clerk = partial.events.find((e) => e.t === 'entity.created')?.d.entity.id;
    assert.ok(clerk && partial.state.scene.present.includes(clerk) && partial.state.scene.at === from, 'a dropped arrive would place him at the verge');
});

test('.182 P2-5 no authority by normalizing: a companion named as one string is still checked; a time without seq is still capped; booked people stand where he arrived', async () => {
    const g = await campaign(content, { greeting: ASHBRIDGE });
    await say(g, '*I walk into the Guild hall*', { type: 'go', to: AHALL, quote: 'I walk into the Guild hall' });
    const r = await g.reply('He walks into the Guild hall with Bren, and a clerk looks up; he waits a long while.', { scene: AHALL, expected: { 1: { arrived: true, at: AHALL, with: null } }, deltas: [
        { seq: 1, type: 'arrive', at: AHALL, forced_by: null, with: 'Bren' }, { seq: 2, ...CLERK }, { type: 'time', minutes: 900 }] });
    assert.equal(r.record.extraction.status, 'applied', JSON.stringify(r.record.extraction));
    const s = g.state();
    assert.equal(s.scene.at, AHALL);
    assert.ok(r.record.rejected.some((x) => x.rule === 'world_rule' && /arrive\.with: unknown person Bren/.test(x.why)), JSON.stringify(r.record.rejected));
    assert.ok(!Object.values(s.entities).some((e) => e.name === 'Bren'), 'nobody made of the companion string');
    assert.ok(r.record.rejected.some((x) => x.rule === 'time_cap'), 'the cap holds for the normalized time');
    const clerk = r.record.events.find((e) => e.t === 'entity.created')?.d.entity.id;
    assert.ok(clerk && s.scene.present.includes(clerk), 'the clerk is at the hall he reached');
});
