// NPC package E2-B (patch_plans_10b/NPC_E2_E3_FACHPLAN.md §2 R6–R9, §12 B1–B5; decisions D1/D4/D6 of §13): arrival
// cards for the people known where an authorized GO goes (NOT YET SHOWN, never presence), personal agreements bound to
// their parties through the whole thread path, the compact card keeping knows beside an agreement, the social part of
// a memory surviving the engine's part, and #npc showing only Alaric's own open agreements.
// Original chats: User01 (tests/v4/fixtures/user01_e2b172.json.gz, Brenna), User02 (user02_157, Tam). Player turns are
// run again with their recorded commands; every extractor answer here is SYNTHETIC unless it says otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec, turnBlock } from '../../src/host.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';
import { buildContext } from '../../src/context.js';
import { applyEvent } from '../../src/state.js';
import { runCommands } from '../../src/commands.js';
import { stripOwned } from '../../src/v4/ownership.js';

const content = await loadProductContent();
const u1 = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user01_e2b172.json.gz', import.meta.url)))).chat;
const u2 = zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user02_157.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(JSON.parse).slice(1);
const at = (chat, i) => foldChat(structuredClone(chat), i).state;
const cmds = (chat, i) => rec(chat[i]).events.find((e) => e.t === 'cmd.interpreted').d.commands;
const play = (chat, i, { s = at(chat, i), commands = cmds(chat, i), text = chat[i].mes } = {}) => playerTurnV4(s, content, text, { msg: i, c: true, commands });
const reply = (state, answer, prose, msg) => replyTurnV4(structuredClone(state), content, { scene: null, expected: {}, ...answer }, { prose, msg });
/** The narrator block the host builds for this player message, with the player record run again on this build. */
const hostContext = (chat, i, p, text = chat[i].mes) => {
    const c = structuredClone(chat).slice(0, i + 1);
    c[i].mes = text;
    c[i].extra.avereth.events = p.events;
    return turnBlock(c, i, content, { budget: 1400, rulesBudget: 800 }).context;
};
const section = (ctx, name) => ctx.diagnostics.delivered.find((d) => d.name === name);
const BRENNA = 'npc.npcglassmere_clerk', DORAN = 'npc.npchearth_fighter', MARDA = 'npc.marda', TAM = 'npc.npcguild_clerk';
const HALL = 'loc.glassmere.guild_hall';
const thread = (seq, text, who, more = {}) => ({ scene: null, seq, type: 'thread', id: null, text, kind: 'promise', status: 'open', resolution: null, who, ...more });
const sets = (r) => r.events.filter((e) => e.t === 'thread.set').map((e) => e.d.thread);
/** Bess (synthetic): a barmaid the reply introduces, here with Alaric or elsewhere. */
const bessNew = (seq, present) => ({ scene: null, seq, type: 'person.new', ref: 'bess', name: 'Bess', role: 'barmaid', desc: ['freckled barmaid with a tray of tankards'], armed: null, present, relevant: true, threat: false, at: present ? HALL : null, band: present ? 'SHORT' : null, distinct_from: null });
const bessOf = (state) => Object.values(state.entities).find((e) => e.name === 'Bess').id;
const compactOf = (ctx, id) => {
    const lines = ctx.text.split('\n');
    const i = lines.findIndex((l) => l.startsWith('• ') && l.includes(`[${id}]`));
    if (i < 0) return null;
    const out = [lines[i]];
    for (let k = i + 1; k < lines.length && lines[k].startsWith('  '); k++) out.push(lines[k]);
    return out;
};

// ----------------------------------------------------------------------------------------------------- R6: B1–B1b
test('E2-B B1: User01 I61 – the GO back to the Guild hall (authorized) brings Brenna\'s card NOT YET SHOWN before the reply; no entry; full KNOWN AT for the extractor', () => {
    const p = play(u1, 61);
    const o = p.state.last.outcome;
    assert.equal(o.resolutions.find((r) => r.type === 'go').status, 'authorized');
    assert.deepEqual(o.known_at['2'].sort(), [BRENNA, DORAN].sort());
    const ctx = hostContext(u1, 61, p);
    const arrival = section(ctx, 'npc_arrival');
    assert.ok(arrival && arrival.npcIds.includes(BRENNA), 'E0 names the arrival card ids');
    assert.match(ctx.text, /ARRIVING AT Adventurers' Guild hall, Glassmere — people known there; NOT YET SHOWN/);
    const card = compactOf(ctx, BRENNA);
    assert.ok(card[0].includes('NOT YET SHOWN') && !card[0].includes('NOT PRESENT'));
    assert.ok(card.some((l) => /knows him by name/.test(l)), 'her identity level');
    assert.ok(card.some((l) => /last meaningful:/.test(l)), 'their shared history');
    assert.ok(!section(ctx, 'npc_compact')?.npcIds.includes(MARDA), 'Marda, not addressed, keeps no compact slot');
    assert.ok(o.extra.some((l) => l.startsWith('KNOWN AT') && l.includes(BRENNA) && l.includes(DORAN)), 'the extractor keeps the whole KNOWN AT list');
    assert.ok(!p.events.some((e) => e.t === 'scene.entered'), 'no entry from the card');
    // the reply that does not show her: she stays out
    const r = reply(p.state, { scene: HALL, expected: { 2: { arrived: true, at: HALL, with: null, met: null }, 1: { minutes: 480, done: true } }, deltas: [{ scene: null, seq: 1, type: 'arrive', at: HALL, forced_by: null, with: null }] },
        'He slept and walked back to the Guild hall in the morning.', 62);
    assert.ok(!r.state.scene.present.includes(BRENNA));
});

test('E2-B B1a: a person addressed before leaving keeps a slot (Marda named), the arrival card fills the other', () => {
    const text = '*I thank Marda for the room. the next morning i go back to the guild hall*';
    const p = play(u1, 61, { text });
    const ctx = hostContext(u1, 61, p, text);
    assert.ok(section(ctx, 'npc_compact').npcIds.includes(MARDA));
    const arrival = section(ctx, 'npc_arrival');
    assert.equal(arrival.npcIds.filter((id) => [BRENNA, DORAN].includes(id)).length, 1, 'two slots in all');
});

test('E2-B B1a2: one arrival card leaves the other slot to the person here (Marda, not addressed)', () => {
    const p = play(u1, 61);
    const one = structuredClone(p);
    one.events.find((e) => e.t === 'outcome.recorded').d.outcome.known_at['2'] = [BRENNA];
    const ctx = hostContext(u1, 61, one);
    assert.deepEqual(section(ctx, 'npc_arrival').npcIds.filter((id) => [BRENNA, DORAN].includes(id)), [BRENNA]);
    assert.ok(section(ctx, 'npc_compact').npcIds.includes(MARDA), 'the free slot stays with her');
    assert.deepEqual(ctx.diagnostics.focusNpcIds, [MARDA]);
});

test('E2-B B1b: no arrival card for a GO with a stop on the way, a GO on elsewhere after it, a refused GO, or a place nobody is known at', () => {
    const p = play(u1, 61);
    const stop = structuredClone(p); stop.state.last.outcome.auth.gos[0].stop = 'loc.glassmere';
    stop.events.find((e) => e.t === 'outcome.recorded').d.outcome.auth.gos[0].stop = 'loc.glassmere';
    assert.ok(!section(hostContext(u1, 61, stop), 'npc_arrival'));
    const on = play(u1, 61, { commands: [...cmds(u1, 61), { seq: 3, type: 'go', to: 'loc.glassmere.the_drowned_lantern', quote: 'and back to the inn', within: null }], text: `${u1[61].mes} and back to the inn` });
    assert.ok(!section(hostContext(u1, 61, on, `${u1[61].mes} and back to the inn`), 'npc_arrival'), 'the last GO is not the hall');
    const nowhere = play(u1, 61, { commands: [{ seq: 1, type: 'go', to: 'loc.nowhere_known', quote: 'i go to nowhere', within: null }], text: '*i go to nowhere*' });
    assert.ok(!section(hostContext(u1, 61, nowhere, '*i go to nowhere*'), 'npc_arrival'));
});

// --------------------------------------------------------------------------------------------- R7: B2–B2e, D4, D6
const p53 = { state: at(u2, 54) }; // after the player's I53 (turn-in, "so about that deal we had?")
const DRINK = "Tam Ostler expects Alaric to buy him a drink with the first quest's pay";
test('E2-B B2/D4: Tam\'s drink promise is bound to {pc, Tam} through thread.set, kept on resolution without who, shown open then settled', () => {
    const r = reply(p53.state, { deltas: [thread(1, DRINK, ['pc', TAM])] }, u2[54].mes, 54);
    const [t] = sets(r);
    assert.deepEqual(t.who, ['pc', TAM]);
    let ctx = buildContext(r.state, content, { input: 'so about that drink?', outcome: r.state.last.outcome, budget: 1400 });
    let card = compactOf(ctx, TAM);
    assert.match(card[1], /^ {2}toward Alaric: .*; between you: Tam Ostler expects Alaric to buy him a drink/);
    // the resolution (I58) without who keeps the parties
    const done = reply(r.state, { deltas: [thread(1, DRINK, null, { id: t.id, status: 'resolved', resolution: 'Alaric bought the round of dark ale; Tam drank and called the debt honored' })] }, u2[58].mes, 58);
    const [t2] = sets(done);
    assert.deepEqual([t2.id, t2.status, t2.who], [t.id, 'resolved', ['pc', TAM]]);
    ctx = buildContext(done.state, content, { input: 'Tam', outcome: done.state.last.outcome, budget: 1400 });
    card = compactOf(ctx, TAM);
    assert.match(card[1], /between you: settled — /);
    const lm = card.find((l) => /last meaningful:/.test(l));
    assert.ok(!lm || /settled since/.test(lm), 'the old promise memory is not shown as an open obligation');
    // D4: a newer meaningful shared memory ends the settled line on the card; the thread stays settled
    const next = structuredClone(done.state); next.turn += 1; // the next turn
    const later = reply(next, { deltas: [{ scene: null, seq: 1, type: 'memory', text: 'Tam Ostler shared veteran tips with Alaric about the Pale Ridge direwolf over the counter', who: [TAM, 'pc'], imp: 7 }] }, 'Tam Ostler leaned on the counter and shared veteran tips about the Pale Ridge direwolf.', 59);
    card = compactOf(buildContext(later.state, content, { input: 'Tam', outcome: later.state.last.outcome, budget: 1400 }), TAM);
    assert.ok(!card.join('\n').includes('settled'), 'no settled line after a newer meaningful memory');
    assert.equal(later.state.threads[t.id].status, 'resolved');
    assert.ok(!later.events.some((e) => e.t === 'thread.set'), 'no reopening');
});

test('E2-B B2a: two people promising alike keep two threads; a resolution by words with its parties closes only that one', () => {
    const r = reply(p53.state, { deltas: [bessNew(1, true),
        thread(2, 'Tam promises to buy Alaric a drink tomorrow night', ['pc', TAM]), thread(3, 'Bess promises to buy Alaric a drink tomorrow night', ['pc', 'bess'])] },
    `${u2[54].mes} Bess, a freckled barmaid with a tray of tankards, came over and promised the same.`, 54);
    const BESS = bessOf(r.state);
    const ts = sets(r);
    assert.equal(new Set(ts.map((t) => t.id)).size, 2);
    const close = reply(r.state, { deltas: [thread(1, 'Bess promises to buy Alaric a drink tomorrow night', ['pc', BESS], { status: 'resolved', resolution: 'Bess bought the round' })] }, 'Bess bought the round.', 55);
    const closed = sets(close);
    assert.equal(closed.length, 1);
    assert.deepEqual(closed[0].who, ['pc', BESS]);
    assert.equal(close.state.threads[ts.find((t) => t.who.includes(TAM)).id].status, 'open');
});

test('E2-B B2c/B2d/B5: a promise between two NPCs is no "between you"; pc only with a party here; #npc shows only Alaric\'s open agreements', () => {
    const r = reply(p53.state, { deltas: [bessNew(1, false), thread(2, 'Tam promised Bess to cover her shift at the taproom', [TAM, 'bess']), thread(3, 'Bess will save Alaric a seat at the taproom', ['pc', 'bess'])] },
        `${u2[54].mes} Tam mentioned that Bess, the freckled barmaid at the taproom, would save Alaric a seat; he had promised to cover her shift.`, 54);
    const BESS = bessOf(r.state);
    const [npcOnly, absent] = sets(r);
    assert.deepEqual(npcOnly.who, [TAM, BESS]);
    assert.deepEqual(absent.who, [BESS], 'Bess is not here: Alaric is no party of it');
    const card = compactOf(buildContext(r.state, content, { input: 'Tam', outcome: r.state.last.outcome, budget: 1400 }), TAM);
    assert.ok(!card.join('\n').includes('between you'));
    const mine = reply(r.state, { deltas: [thread(1, DRINK, ['pc', TAM])] }, u2[54].mes, 55);
    const panel = runCommands(mine.state, content, '#npc Tam').panels.join('\n');
    assert.match(panel, /Open between you:\n- Tam Ostler expects Alaric to buy him a drink/);
    assert.ok(!panel.includes('cover her shift') && !panel.includes('save Alaric a seat'));
    const id = sets(mine)[0].id;
    const done = reply(mine.state, { deltas: [thread(1, DRINK, null, { id, status: 'resolved', resolution: 'bought' })] }, 'He bought the round.', 56);
    assert.ok(!runCommands(done.state, content, '#npc Tam').panels.join('\n').includes('Open between you'));
});

test('E2-B B2e: an old thread without parties gets them only for its exact words; a rewording with parties is a new thread', () => {
    const s = at(u2, 56); // the original I54 thread (no who) is open here
    const old = Object.values(s.threads).find((t) => /buy him a drink/.test(t.text));
    assert.ok(old && !old.who && old.status === 'open');
    const exact = reply(s, { deltas: [thread(1, old.text, ['pc', TAM])] }, 'Tam reminded him of the drink.', 56);
    assert.deepEqual(sets(exact).map((t) => [t.id, t.who]), [[old.id, ['pc', TAM]]]);
    const reworded = reply(s, { deltas: [thread(1, 'Tam Ostler expects Alaric to buy him a drink with the pay of his first quest', ['pc', TAM])] }, 'Tam reminded him of the drink.', 56);
    const [n] = sets(reworded);
    assert.notEqual(n.id, old.id);
    assert.equal(reworded.state.threads[old.id].who, undefined, 'the old thread is not changed');
});

test('E2-B D6: Brenna\'s explicitly deferred invitation is an open thread of asking again – no acceptance, no attitude, no booking', () => {
    const s = at(u1, 66);
    const ask = 'Brenna told Alaric he may ask her about dinner again once he has more lines in her ledger';
    const r = reply(s, { deltas: [thread(1, ask, ['pc', BRENNA])] }, u1[66].mes, 66);
    const [t] = sets(r);
    assert.deepEqual([t.kind, t.status, t.who], ['promise', 'open', ['pc', BRENNA]]);
    assert.ok(!r.events.some((e) => ['relation.changed', 'relation.set', 'quest.status', 'coin.changed', 'decision.opened'].includes(e.t)));
    // a declined invitation: no thread unless the answer reports one (the extractor rule says so)
    const none = reply(s, { deltas: [] }, u1[66].mes, 66);
    assert.equal(sets(none).length, 0);
    const vocab = JSON.parse(fs.readFileSync(new URL('../../content/deltas.json', import.meta.url), 'utf8'));
    const summary = vocab.deltas.find((d) => d.type === 'thread').summary;
    assert.match(summary, /deferred/);
    assert.match(summary, /declined|refused/);
});

test('E2-B B2b: the bound and the settled agreement fold to the same state', () => {
    const r = reply(p53.state, { deltas: [thread(1, DRINK, ['pc', TAM])] }, u2[54].mes, 54);
    const done = reply(r.state, { deltas: [thread(1, DRINK, null, { id: sets(r)[0].id, status: 'resolved', resolution: 'bought' })] }, 'He bought it.', 58);
    for (const [from, x] of [[p53.state, r], [r.state, done]]) {
        const s = structuredClone(from);
        for (const e of x.events) applyEvent(s, e);
        assert.deepEqual(s, x.state);
    }
});

// --------------------------------------------------------------------------------------------------------- R8: B3
test('E2-B B3: attitude + open agreement + meaningful memory + knows – all four on the compact card, each line ≤ 170', () => {
    const s = at(u1, 69);
    applyEvent(s, { t: 'thread.set', d: { thread: { id: 'thread.t30.9', text: 'Brenna said Alaric may ask her about dinner again once he has more lines in her ledger', kind: 'promise', status: 'open', since: { turn: s.turn, minute: s.clock.minute }, updated: { turn: s.turn, minute: s.clock.minute }, source: { kind: 'narration', msg: 66 }, at: HALL, who: ['pc', BRENNA] } } });
    const card = compactOf(buildContext(s, content, { input: u1[69].mes, outcome: s.last.outcome, budget: 1400 }), BRENNA);
    assert.ok(card.length <= 4);
    assert.match(card[1], /toward Alaric: .*knows him by name; between you: Brenna said Alaric may ask her about dinner again/);
    assert.ok(card.some((l) => /^ {2}last meaningful:/.test(l)));
    assert.ok(card.some((l) => /^ {2}knows:/.test(l)), 'knows is not displaced');
    assert.ok(card.every((l) => l.length <= 170), card.map((l) => l.length).join(','));
});

// --------------------------------------------------------------------------------------------------------- R9: B4
test('E2-B B4: Tam\'s farewell survives its stamp (User02 I14 memory), the stamp does not', () => {
    const m = "Tam Ostler stamped the Glimmerdeep contract active and wished Alaric luck: 'Come back with your skin on and we'll settle that drink.'";
    const cut = stripOwned(m, { store: 'memory' });
    assert.deepEqual(cut.kept, ["Tam Ostler wished Alaric luck: 'Come back with your skin on and we'll settle that drink.'"]);
    assert.equal(cut.owned.length, 1);
    const r = reply(at(u2, 14), { deltas: [{ scene: null, seq: 1, type: 'memory', text: m, who: [TAM, 'pc'], imp: 6 }] }, u2[14].mes, 14);
    const rec14 = r.events.find((e) => e.t === 'memory.recorded' && (e.d.memory.who || []).includes(TAM) && e.d.memory.importance === 6);
    assert.ok(rec14, 'the social part is kept');
    assert.ok(!/stamped|active/.test(rec14.d.memory.text));
});

test('E2-B B4a–B4d: a short rest, a quote, a choice he did not make and an unbooked death are never kept', () => {
    // B4a: nothing social worth keeping beside the payout
    assert.deepEqual(stripOwned('Tam paid out the sixty copper reward and nodded.', { store: 'memory' }).kept, []);
    // B4b: a quote is not split; its engine words keep the whole clause out
    assert.deepEqual(stripOwned("Tam said 'your contract is active now, and the pay is yours'.", { store: 'memory' }).kept, []);
    // B4c: the rest is a purchase he did not choose (World's pc_decision check on every part)
    const s = at(u2, 14);
    const r = reply(s, { deltas: [{ scene: null, seq: 1, type: 'memory', text: 'Tam Ostler stamped the Glimmerdeep contract active and Alaric bought him a round of dark ale at the taproom', who: [TAM, 'pc'], imp: 6 }] }, u2[14].mes, 14);
    assert.ok(!r.events.some((e) => e.t === 'memory.recorded' && /bought/.test(e.d.memory.text)));
    // B4d: an unbooked death never comes back through a split
    const d = reply(s, { deltas: [{ scene: null, seq: 1, type: 'memory', text: 'Tam Ostler stamped the Glimmerdeep contract active and the Glimmer Queen was killed by Alaric on the spot', who: [TAM, 'pc'], imp: 6 }] }, u2[14].mes, 14);
    assert.ok(!d.events.some((e) => e.t === 'memory.recorded' && /killed/.test(e.d.memory.text)));
    // other stores split nothing
    assert.equal(stripOwned("Tam stamped the contract active and wished Alaric luck: 'Come back.'", { store: 'note' }).kept.length, 0);
});

test('E2-B B4e: the replay corpus memories – engine words keep a part out, a noun pair is no split, a pronoun part has no subject; the clerk\'s own advice is kept', () => {
    const kept = (t) => stripOwned(t, { store: 'memory' }).kept;
    // b17-rogue#218: "slip READY" alone is the engine's (no stamp or status kept from a split)
    assert.deepEqual(kept('The grey-haired Guild clerk in Glassmere stamped his Glimmerdeep slip READY and paid out the posted sixty coppers, calling it fast work for a Novice.'), []);
    // b19-mage#12: the registration and the plate; "he stamped …" has no subject of its own once split
    assert.deepEqual(kept('The clerk registered Alaric Red at the Ashbridge Guild hall: the stone read Power Rank F, and he stamped a NOVICE plate, warning that replacing it costs coin and that contract payouts go against it.'), []);
    // b17-rogue#94: "the fisherwoman and the fishers" is one subject; the bounty part stays out, the next clause stays
    assert.deepEqual(kept("The brokerage clerk logged Alaric's strider report free of charge and explained the road to a bounty: the fisherwoman and the fishers must pool a deposit; then the contract comes back to her desk for the Novice board"),
        ['then the contract comes back to her desk for the Novice board']);
    // b19-mage#130 / b17-warrior#220: a contract closed or sealed, an infinitive or participle fragment: nothing kept
    assert.deepEqual(kept("The Blackgate duty clerk checked the READY-sealed slip against the ledger, paid out the cull and closed the Reed Flat contract, noting the blood and advising the apothecary on Chandler's Row."), []);
    assert.deepEqual(kept("The clerk sealed the Thornhollow boar contract slip and told Alaric to bring it back to settle up — three silver — and to ask for Ossler at the near charcoal-burners' camp."), []);
    // b17-warrior#254: the payout falls, the clerk's own words to him stay
    assert.deepEqual(kept('The Alderwatch desk clerk checked the READY seal on the boar hunt slip, paid out three silver, and told him not to spend it on drink before noon'),
        ['The Alderwatch desk clerk told him not to spend it on drink before noon.']);
});
