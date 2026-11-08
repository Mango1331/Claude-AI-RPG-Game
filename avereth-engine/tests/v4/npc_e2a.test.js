// NPC package E2-A (patch_plans_10b/NPC_E2_E3_FACHPLAN.md §2 R1–R5, §12 A1–A7): who is actually in the scene again,
// who actually handled a Guild contract step, one person per person.new, keptHere without a group or an excluded
// identity, and an NPC's claim shown as theirs. Built on User04 (tests/v4/fixtures/user04_qol159.json.gz): the original
// player turns are run again with their recorded commands, the replies are the original prose; the extractor fields
// met / handled_by (and every answer except the original I72 one) are SYNTHETIC, written for these tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';
import { buildContext } from '../../src/context.js';
import { parseExtraction, deltaSchema } from '../../src/v4/extract.js';
import { applyEvent } from '../../src/state.js';

const content = await loadProductContent();
const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user04_qol159.json.gz', import.meta.url))));
const before = (i) => foldChat(structuredClone(f.chat), i).state;
const cmds = (i) => rec(f.chat[i]).events.find((e) => e.t === 'cmd.interpreted').d.commands;
const HALL = 'loc.alderwatch.guild_hall', OAR = 'loc.alderwatch.the_drowned_oar', VERGE = 'loc.alderwatch.verge';
const CLERKS = 'npc.npcguild_clerks', BOW = 'npc.npcbench_crossbowman', WIRY = 'npc.npcnpcwiry_woman', INN = 'npc.npcoar_innkeeper';
const CATA = 'quest.clear_the_old_crown_catacombs_level_1', TITAN = 'quest.slay_the_marsh_titan_of_hollowmere';
const play = (s, i, commands = cmds(i), text = f.chat[i].mes) => playerTurnV4(s, content, text, { msg: i, c: true, commands, board: f.board });
const reply = (p, answer, prose, msg) => replyTurnV4(structuredClone(p.state), content, answer, { prose, msg });
const entered = (r, id) => r.events.filter((e) => e.t === 'scene.entered' && e.d.id === id).length;
const learned = (r, who, about) => r.events.filter((e) => e.t === 'knowledge.gained' && e.d.who === who && e.d.about === about).length;
const ruled = (r, rule) => r.events.filter((e) => e.t === 'delta.rejected' && e.d.rule === rule).length;
const arrive = (at, seq = 1) => ({ scene: null, seq, type: 'arrive', at, forced_by: null, with: null });
const go = (k, at, met = null, arrived = true) => ({ [k]: { arrived, at: arrived ? at : null, with: null, met } });
const answer72 = (met) => { const a = structuredClone(f.extractions['72']); a.expected['1'].met = met; return a; };

// ------------------------------------------------------------------------------------------- R1: met (A1–A1h, A7)
const p71 = play(before(71), 71);
const prose72 = f.chat[72].mes;
test('E2-A A1: the GO step offers its KNOWN AT people in the player outcome (known_at[seq])', () => {
    assert.deepEqual([...(p71.state.last.outcome.known_at?.['1'] || [])].sort(), [CLERKS, BOW].sort());
});
test('E2-A A1: User04 I72 – the narrated crossbowman is met (original answer + a synthetic met), nothing else changes', () => {
    const r = reply(p71, answer72([{ who: BOW, evidence: 'the stocky man with the crossbow sat over fresh maps again' }]), prose72, 72);
    assert.equal(entered(r, BOW), 1);
    assert.ok(r.state.scene.present.includes(BOW));
    const plain = reply(p71, answer72(null), prose72, 72);
    assert.equal(entered(plain, BOW), 0, 'the original answer without met still leaves him out (status quo)');
    // A7: met adds only the person's entry (no money, quest, XP, combat, relation)
    // the id tags of later V3 calls of the same reply move by one (the met is one more call): compared without them
    const norm = (e) => JSON.stringify(e).replace(/(\.d\d+)_\d+/g, '$1');
    const extra = r.events.filter((e) => !plain.events.some((x) => norm(x) === norm(e)));
    assert.ok(extra.every((e) => ['scene.entered', 'entity.updated', 'knowledge.gained', 'memory.recorded', 'extract.applied'].includes(e.t)), extra.map((e) => e.t).join(','));
    assert.equal(r.state.entities.pc.sheet.coin, plain.state.entities.pc.sheet.coin);
});
test('E2-A A1c: "both clerks at work" brings the historical group entity, unchanged (no migration)', () => {
    const r = reply(p71, answer72([{ who: CLERKS, evidence: 'The long counter at the back had both clerks at work this time' }]), prose72, 72);
    assert.equal(entered(r, CLERKS), 1);
    assert.equal(r.state.entities[CLERKS].traits, p71.state.entities[CLERKS].traits);
});
test('E2-A A1a/A1b/A1h: an empty counter, a hope, a memory, a picture or a left ledger bring no one', () => {
    const cases = [
        ['He came into the Guild hall. The counter stood empty and the benches were bare.', 'The counter stood empty and the benches were bare'],
        ['He came into the Guild hall. He hoped the clerk would be at the counter.', 'He hoped the clerk would be at the counter'],
        ['He came into the Guild hall. He remembered the clerk at the counter the night before.', 'He remembered the clerk at the counter the night before'],
        ['He came into the Guild hall. A painted sign depicted the clerk at work, but the counter stood empty.', 'A painted sign depicted the clerk at work'],
        ["He came into the Guild hall. The clerk's ledger lay open on the counter.", "The clerk's ledger lay open on the counter"],
        ['He came into the Guild hall. A note from the clerk was pinned to the counter.', 'A note from the clerk was pinned to the counter'],
    ];
    for (const [prose, evidence] of cases) {
        const r = reply(p71, { scene: HALL, expected: go(1, HALL, [{ who: CLERKS, evidence }]), deltas: [arrive(HALL)] }, prose, 72);
        assert.equal(entered(r, CLERKS), 0, evidence);
        assert.equal(ruled(r, 'met_evidence'), 1, evidence);
    }
    // the positive control of A1h: the same clerk, present and acting
    const ok = reply(p71, { scene: HALL, expected: go(1, HALL, [{ who: CLERKS, evidence: 'The clerk stood behind the counter and waved' }]), deltas: [arrive(HALL)] },
        'He came into the Guild hall. The clerk stood behind the counter and waved.', 72);
    assert.equal(entered(ok, CLERKS), 1);
});
test('E2-A A1d: an arrival that did not happen meets no one', () => {
    const r = reply(p71, { scene: null, expected: go(1, HALL, [{ who: BOW, evidence: 'the stocky man with the crossbow sat over fresh maps again' }], false), deltas: [] }, prose72, 72);
    assert.equal(entered(r, BOW), 0);
    assert.equal(ruled(r, 'met_without_arrival'), 1);
});
test('E2-A A1e/A1f: people not offered for this step, the dead, a wrong identity and someone already here are refused', () => {
    for (const who of ['npc.harl_vess', INN, 'npc.mira_the_clerk']) {
        const r = reply(p71, answer72([{ who, evidence: 'the stocky man with the crossbow sat over fresh maps again' }]), prose72, 72);
        assert.equal(ruled(r, 'met_not_known_here'), 1, who);
        assert.equal(r.events.filter((e) => e.t === 'scene.entered' && e.d.id === who).length, 0, who);
        assert.ok(!r.state.entities['npc.mira_the_clerk'], 'no new person from a met');
    }
    const wrong = reply(p71, answer72([{ who: CLERKS, evidence: 'the stocky man with the crossbow sat over fresh maps again' }]), prose72, 72);
    assert.equal(entered(wrong, CLERKS), 0);
    assert.equal(ruled(wrong, 'met_evidence'), 1);
    const dead = structuredClone(p71); dead.state.entities[BOW].status = 'dead';
    const r2 = reply(dead, answer72([{ who: BOW, evidence: 'the stocky man with the crossbow sat over fresh maps again' }]), prose72, 72);
    assert.equal(entered(r2, BOW), 0);
    // met and an enter for the same person: one entry
    const both = structuredClone(f.extractions['72']);
    both.expected['1'].met = [{ who: BOW, evidence: 'the stocky man with the crossbow sat over fresh maps again' }];
    both.deltas.push({ scene: null, seq: 6, type: 'enter', who: BOW, evidence: null });
    assert.equal(entered(reply(p71, both, prose72, 72), BOW), 1);
});
test('E2-A A1g: two GO steps in one message – each met against its own step and place', () => {
    const s = before(71); s.entities[BOW].at = VERGE;
    const p = play(s, 71, [{ seq: 1, type: 'go', to: HALL, quote: 'walk to the hall', within: null }, { seq: 2, type: 'go', to: VERGE, quote: 'then out to the verge', within: null }], 'I walk to the hall and then out to the verge');
    assert.deepEqual(p.state.last.outcome.known_at, { 1: [CLERKS], 2: [BOW] });
    const prose = 'He stopped at the Guild hall, where the clerk stood behind the counter and waved. Then he walked out to the verge, where the stocky man with the crossbow sat over his maps.';
    const ans = (met1, met2) => ({ scene: VERGE, expected: { ...go(1, HALL, met1), ...go(2, VERGE, met2) }, deltas: [arrive(HALL, 1), arrive(VERGE, 2)] });
    const r = reply(p, ans([{ who: CLERKS, evidence: 'the clerk stood behind the counter and waved' }], [{ who: BOW, evidence: 'the stocky man with the crossbow sat over his maps' }]), prose, 72);
    assert.equal(entered(r, CLERKS), 1);
    assert.equal(entered(r, BOW), 1);
    assert.deepEqual(r.state.scene.present.sort(), ['pc', BOW].sort(), 'the hall step entry is reset by the second arrival');
    const x = reply(p, ans([{ who: BOW, evidence: 'the stocky man with the crossbow sat over his maps' }], null), prose, 72);
    assert.equal(entered(x, BOW), 0);
    assert.equal(ruled(x, 'met_not_known_here'), 1);
});
test('E2-A: met / desk fields never cost a repair – missing or malformed ones are null', () => {
    const vocab = JSON.parse(fs.readFileSync(new URL('../../content/deltas.json', import.meta.url), 'utf8'));
    const keys = { 1: 'go', 2: 'desk' };
    for (const exp of [{ 1: { arrived: true, at: HALL, with: null } }, { 1: { arrived: true, at: HALL, with: null, met: 'the clerk' }, 2: { handled_by: 'npc.x' } }, { 1: { arrived: true, at: HALL, with: null, met: [{ who: 1 }] } }]) {
        const r = parseExtraction(JSON.stringify({ scene: HALL, expected: exp, deltas: [arrive(HALL)] }), vocab, { places: [HALL] }, keys);
        assert.deepEqual([r.valid, r.complete, r.errors, r.missing], [true, true, [], []], JSON.stringify(exp));
    }
    assert.ok(deltaSchema(vocab, { places: [HALL] }, keys).properties.expected.properties['2']);
});

// --------------------------------------------------------------------------------------- R2: handled_by (A2–A3e)
const p73 = play(before(73), 73);
const prose74 = f.chat[74].mes;
const older = { scene: null, seq: 1, type: 'person.new', ref: 'older_clerk', name: null, role: 'clerk', desc: ['older man with ink-stained fingers weighing something on a small brass scale'], armed: null, present: true, relevant: true, threat: false, at: HALL, band: 'SHORT', distinct_from: null };
const accepted = (id) => `f.pc.accepted.${id}`;
const newId = (r, ref = 'older_clerk') => r.events.find((e) => e.t === 'entity.created' && e.d.entity.descriptors?.some((x) => /older man/.test(x)))?.d.entity.id;
test('E2-A A2: User04 I73/I74 – the older clerk who takes and stamps the posting knows the acceptance; the bystander stays a bystander', () => {
    assert.deepEqual(p73.state.last.outcome.desk, { 1: { quest: TITAN, kind: 'accept' } });
    assert.equal(p73.state.last.outcome.expected_keys['1'], 'desk');
    assert.equal(learned({ events: p73.events }, WIRY, accepted(TITAN)), 1, 'witnessEvents unchanged: the present wiry woman witnessed the acceptance');
    const r = reply(p73, { scene: HALL, expected: { 1: { handled_by: { who: 'older_clerk', evidence: 'The older clerk took it, read the client line, then looked up at Alaric over the top of the slip' } } }, deltas: [older] }, prose74, 74);
    const id = newId(r);
    assert.ok(id && id !== CLERKS, 'a new individual, not the historical group (R4)');
    assert.equal(learned(r, id, accepted(TITAN)), 1);
    assert.equal(r.events.filter((e) => e.t === 'knowledge.gained' && e.d.about === accepted(TITAN)).length, 1, 'no second acceptance knowledge for anyone else');
    assert.equal(r.events.filter((e) => ['quest.status', 'coin.changed', 'xp.changed', 'transaction.completed'].includes(e.t)).length, 0, 'no booking');
});
test('E2-A A2a/A2c: a watching bystander, Alaric\'s pronoun and a non-Guild handler earn no knowledge', () => {
    const cases = [
        [WIRY, 'The wiry woman had stopped by the door with her rolled maps, watching'],
        ['older_clerk', 'He stamped the slip, blotted it and held it out'],
    ];
    for (const [who, evidence] of cases) {
        const r = reply(p73, { scene: HALL, expected: { 1: { handled_by: { who, evidence } } }, deltas: [older] }, prose74, 74);
        assert.equal(r.events.filter((e) => e.t === 'knowledge.gained' && e.d.about === accepted(TITAN)).length, 0, evidence);
        assert.equal(ruled(r, 'desk_handler'), 1, evidence);
    }
    const bow = structuredClone(p73); bow.state.scene.present.push(BOW);
    const r = reply(bow, { scene: HALL, expected: { 1: { handled_by: { who: BOW, evidence: 'The stocky man with the crossbow took the slip and stamped it' } } }, deltas: [] },
        'The stocky man with the crossbow took the slip and stamped it, grinning.', 74);
    assert.equal(learned(r, BOW, accepted(TITAN)), 0);
    assert.equal(ruled(r, 'desk_handler'), 1);
});
test('E2-A A2b: two clerks of the same role – "the clerk" is ambiguous, "the older clerk" names one', () => {
    const woman = { ...older, seq: 2, ref: 'clerk_woman', desc: ['grey-haired woman with spectacles pushed up into her hair'] };
    const prose = 'The grey-haired clerk sorted slips at one end of the counter. The older clerk took the posting from Alaric. The clerk stamped the slip. The older clerk stamped the slip.';
    const run = (evidence) => reply(p73, { scene: HALL, expected: { 1: { handled_by: { who: 'older_clerk', evidence } } }, deltas: [older, woman] }, prose, 74);
    const amb = run('The clerk stamped the slip');
    assert.equal(amb.events.filter((e) => e.t === 'knowledge.gained' && e.d.about === accepted(TITAN)).length, 0);
    const one = run('The older clerk stamped the slip');
    assert.equal(learned(one, newId(one), accepted(TITAN)), 1);
    assert.equal(one.events.filter((e) => e.t === 'knowledge.gained' && e.d.about === accepted(TITAN)).length, 1);
});
const p63 = play(before(63), 63);
const prose64 = f.chat[64].mes;
const ans64 = (handled, { arrived = true } = {}) => ({ scene: arrived ? HALL : null, expected: { ...go(1, HALL, null, arrived), 2: { handled_by: handled } },
    deltas: arrived ? [arrive(HALL), { scene: null, seq: 2, type: 'enter', who: CLERKS, evidence: null }] : [] });
const completed = `f.pc.completed.${CATA}`;
test('E2-A A3: User04 I64 – GO + conditional turn-in; the clerk the original prose shows by pronoun learns the completion after cmd.completed', () => {
    assert.deepEqual(p63.state.last.outcome.desk, { 2: { quest: CATA, kind: 'turn_in' } });
    for (const evidence of ['she said, and took the slip', 'She counted the coins out onto the counter from a locked drawer']) {
        const r = reply(p63, ans64({ who: CLERKS, evidence }), prose64, 64);
        assert.ok(r.events.some((e) => e.t === 'cmd.completed' && e.d.seq === 2 && e.d.ok));
        assert.equal(learned(r, CLERKS, completed), 1, evidence);
        const i = r.events.findIndex((e) => e.t === 'cmd.completed' && e.d.seq === 2), k = r.events.findIndex((e) => e.t === 'knowledge.gained' && e.d.about === completed);
        assert.ok(k > i, 'knowledge only after the completion');
    }
    const plain = reply(p63, ans64(null), prose64, 64);
    assert.equal(learned(plain, CLERKS, completed), 0, 'without handled_by the .158 literal check stays as it was (false on this prose)');
});
test('E2-A A3a/A3d/A3e: not reached, refused, and the .158 literal fallback', () => {
    const away = reply(p63, ans64({ who: CLERKS, evidence: 'she said, and took the slip' }, { arrived: false }), prose64, 64);
    assert.ok(!away.events.some((e) => e.t === 'cmd.completed' && e.d.seq === 2 && e.d.ok));
    assert.equal(learned(away, CLERKS, completed), 0);
    // a refused step has no desk key
    const done = before(73);
    const refused = play(done, 73, [{ seq: 1, type: 'quest.turn_in', quest: CATA, quote: 'turn it in' }], 'I turn in the catacombs contract');
    assert.ok(!refused.state.last.outcome.desk?.['1']);
    // the .158 literal fallback, with and without handled_by: one knowledge row
    const literal = prose64.replace('She counted the coins', 'The clerk counted out ninety copper onto the counter for the contract. She counted the coins');
    for (const h of [null, { who: CLERKS, evidence: 'she said, and took the slip' }]) assert.equal(learned(reply(p63, ans64(h), literal, 64), CLERKS, completed), 1);
});
test('E2-A A3c: GO + conditional acceptance – the clerk who logs it knows, only once it was accepted on arrival', () => {
    const s = before(73); s.scene.at = OAR; s.scene.present = ['pc'];
    const cs = [{ seq: 1, type: 'go', to: HALL, quote: 'walk to the hall', within: null }, { seq: 2, type: 'quest.accept', quest: TITAN, quote: 'take the titan job', needs: 1 }];
    const p = play(s, 73, cs, 'I walk to the hall and take the titan job');
    assert.equal(p.state.last.outcome.resolutions.find((x) => x.seq === 2).status, 'conditional');
    assert.deepEqual(p.state.last.outcome.desk, { 2: { quest: TITAN, kind: 'accept' } });
    const prose = 'He walked to the Guild hall. The older clerk took the posting, inked the roll and stamped the slip.';
    const a = (arrived) => ({ scene: arrived ? HALL : null, expected: { ...go(1, HALL, null, arrived), 2: { handled_by: { who: 'older_clerk', evidence: 'The older clerk took the posting, inked the roll and stamped the slip' } } },
        deltas: arrived ? [arrive(HALL), { ...older, seq: 2 }] : [] });
    const r = reply(p, a(true), prose, 74);
    assert.equal(learned(r, newId(r), accepted(TITAN)), 1);
    assert.equal(r.events.filter((e) => e.t === 'knowledge.gained' && e.d.about === accepted(TITAN)).length, 1);
    const no = reply(p, a(false), prose, 74);
    assert.equal(no.events.filter((e) => e.t === 'knowledge.gained' && e.d.about === accepted(TITAN)).length, 0);
    const gone = structuredClone(p); gone.state.quests[TITAN].status = 'expired';
    const g = reply(gone, a(true), prose, 74);
    assert.ok(g.events.some((e) => e.t === 'cmd.completed' && e.d.seq === 2 && e.d.ok === false));
    assert.equal(g.events.filter((e) => e.t === 'knowledge.gained' && e.d.about === accepted(TITAN)).length, 0);
});

// ------------------------------------------------------------------------------------------- R3/R4: identity (A4/A5)
test('E2-A A4: "two clerks" is no person; the clerk who acts is one; single and named people stay as they were', () => {
    const group = { ...older, ref: 'clerks', role: 'clerk', desc: ['Two clerks working the long counter at the back of the Guild entrance hall'] };
    const nearer = { ...older, seq: 2, ref: 'nearer_clerk', desc: ['grey-haired woman with spectacles pushed up into her hair'] };
    const r = reply(p71, { scene: HALL, expected: go(1, HALL), deltas: [arrive(HALL), { ...group, seq: 2 }, { ...nearer, seq: 3 }, { scene: null, seq: 4, type: 'fact', s: 'clerks', p: 'remark', o: 'said the board is fresh' }] }, prose72, 72);
    assert.equal(ruled(r, 'collective_person'), 1);
    const made = r.events.filter((e) => e.t === 'entity.created').map((e) => e.d.entity);
    assert.equal(made.filter((e) => /two clerks/i.test(e.traits || '')).length, 0);
    assert.equal(made.filter((e) => /grey-haired woman/.test(e.traits || e.descriptors.join(' '))).length, 1);
    for (const [role, name, desc] of [['clerk', null, ['a clerk with a quill behind his ear']], ['guard', 'Tam Ostler', ['heavyset man']], ['boss', null, ['the dock boss in a leather apron']]]) {
        const x = reply(p71, { scene: HALL, expected: go(1, HALL), deltas: [arrive(HALL), { ...older, seq: 2, ref: 'x', role, name, desc }] }, prose72, 72);
        assert.equal(ruled(x, 'collective_person'), 0, desc[0]);
    }
    const named = reply(p71, { scene: HALL, expected: go(1, HALL), deltas: [arrive(HALL), { ...older, seq: 2, ref: 'x', name: 'the Brannock brothers', role: 'brothers', desc: ['two brothers'] }] }, prose72, 72);
    assert.equal(ruled(named, 'collective_person'), 1);
});
test('E2-A A5: keptHere never maps onto the historical group or a person distinct_from excludes; a single fitting service person is reused', () => {
    const r = reply(p71, { scene: HALL, expected: go(1, HALL), deltas: [arrive(HALL), { ...older, seq: 2 }] }, prose72, 72);
    assert.equal(entered(r, CLERKS), 0);
    assert.ok(newId(r));
    // a single individual clerk left at the hall (not the group)
    const s = before(71); s.entities[CLERKS].traits = 'grey-haired woman with spectacles at the long counter'; s.entities[CLERKS].descriptors = ['clerk', 'grey-haired woman with spectacles', CLERKS];
    const p = play(s, 71);
    const same = reply(p, { scene: HALL, expected: go(1, HALL), deltas: [arrive(HALL), { ...older, seq: 2, desc: ['the clerk'] }] }, prose72, 72);
    assert.equal(entered(same, CLERKS), 1, 'the single individual clerk left here is still reused');
    const distinct = reply(p, { scene: HALL, expected: go(1, HALL), deltas: [arrive(HALL), { ...older, seq: 2, distinct_from: CLERKS }] }, prose72, 72);
    assert.equal(entered(distinct, CLERKS), 0);
    assert.ok(newId(distinct));
});

// --------------------------------------------------------------------------------------------- R5: claims (A6)
test('E2-A A6: the crossbowman\'s remark is his claim in the narrator record; other free facts and the board stay as they are', () => {
    const s = foldChat(structuredClone(f.chat), 82).state;
    const text = buildContext(s, content, { input: "Did Vess's crew take the catacombs posting?", outcome: s.last.outcome, budget: 6000, recentTurns: 0 }).text;
    const line = text.split('\n').find((l) => /Vess's crew took the catacombs posting/.test(l));
    assert.ok(line, 'retrieved');
    assert.match(line, /said \(their claim, not engine state\)/);
    const advice = text.split('\n').find((l) => /adder job is easy coin/.test(l));
    if (advice) assert.doesNotMatch(advice, /their claim/);
    assert.deepEqual(Object.values(s.quests).map((q) => [q.id, q.status]), Object.values(foldChat(structuredClone(f.chat), 82).state.quests).map((q) => [q.id, q.status]));
});

// ----------------------------------------------------------------------------------------- persistence / fold (A7)
test('E2-A: the events of met and handled_by fold to the same state (save/reload)', () => {
    for (const [p, r] of [
        [p71, reply(p71, answer72([{ who: BOW, evidence: 'the stocky man with the crossbow sat over fresh maps again' }]), prose72, 72)],
        [p63, reply(p63, ans64({ who: CLERKS, evidence: 'she said, and took the slip' }), prose64, 64)],
    ]) {
        const s = structuredClone(p.state);
        for (const e of r.events) applyEvent(s, e);
        assert.deepEqual(s, r.state);
    }
});
