// .173 (GPT product-diff review of .172, P2): a report without a thread id names only the thread whose kind, parties
// and words fit it unambiguously. A promise between Tam and Bess is not Alaric's promise with Tam because Tam is in
// both; a settlement nobody can tell apart closes neither; a debt is no promise of the same words. Every case runs the
// real path: extractor answer → replyTurnV4 → World (who) → delta.js → threads.js → thread.set → fold, and its #npc
// panel and narrator card. User02 (tests/v4/fixtures/user02_157.jsonl.gz) after I53, Tam at the Guild desk; Bess is a
// synthetic barmaid the reply introduces; every extractor answer here is SYNTHETIC.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat } from '../../src/host.js';
import { replyTurnV4 } from '../../src/v4/turn.js';
import { buildContext } from '../../src/context.js';
import { applyEvent } from '../../src/state.js';
import { runCommands } from '../../src/commands.js';
import { campaign, say, GO } from './patch8_lib.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';

const content = await loadProductContent();
const u2 = zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user02_157.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(JSON.parse).slice(1);
const TAM = 'npc.npcguild_clerk';
const start = foldChat(structuredClone(u2), 54).state; // after the player's I53: Tam at the desk
const reply = (state, deltas, prose, msg) => replyTurnV4(structuredClone(state), content, { scene: null, expected: {}, deltas }, { prose, msg });
const thread = (seq, text, who, more = {}) => ({ scene: null, seq, type: 'thread', id: null, text, kind: 'promise', status: 'open', resolution: null, who, ...more });
const bessNew = (seq) => ({ scene: null, seq, type: 'person.new', ref: 'bess', name: 'Bess', role: 'barmaid', desc: ['freckled barmaid with a tray of tankards'], armed: null, present: true, relevant: true, threat: false, at: 'loc.glassmere.guild_hall', band: 'SHORT', distinct_from: null });
const BESS_PROSE = 'Bess, a freckled barmaid with a tray of tankards, came over to the desk.';
const sets = (r) => r.events.filter((e) => e.t === 'thread.set').map((e) => e.d.thread);
const rejected = (r) => r.events.filter((e) => e.t === 'delta.rejected' && e.d.item?.type === 'thread');
const bessOf = (s) => Object.values(s.entities).find((e) => e.name === 'Bess').id;
const panel = (s, who) => runCommands(s, content, `#npc ${who}`).panels.join('\n');
/** The lines of the panel's "Open between you:" section (none without it). */
const openBetween = (text) => { const l = text.split('\n'); const i = l.indexOf('Open between you:'); if (i < 0) return []; const out = []; for (let k = i + 1; k < l.length && l[k].startsWith('- '); k++) out.push(l[k]); return out; };
const between = (s, input = 'Tam') => buildContext(s, content, { input, outcome: s.last.outcome, budget: 1400 }).text.split('\n').filter((l) => /between you/.test(l));
const DRINK = "Tam Ostler expects Alaric to buy him a drink with the first quest's pay";

/** Tam's promise with Alaric (bound {pc, Tam}), then Bess comes over. */
function tamAndBess() {
    const r = reply(start, [thread(1, DRINK, ['pc', TAM])], u2[54].mes, 54);
    const [mine] = sets(r);
    const b = reply(r.state, [bessNew(1)], BESS_PROSE, 55);
    return { s: b.state, mine, BESS: bessOf(b.state) };
}
/** Two open promises of the same words, one Tam's, one Bess's, both with Alaric. */
function twoAlike(text = 'promised to buy Alaric a drink tomorrow night') {
    const r = reply(start, [bessNew(1), thread(2, text, ['pc', TAM]), thread(3, text, ['pc', 'bess'])], `${u2[54].mes} ${BESS_PROSE} Tam and Bess both promised to buy him a drink tomorrow night.`, 54);
    return { r, s: r.state, ts: sets(r), BESS: bessOf(r.state) };
}

// ------------------------------------------------------------------------------------------------ the review's cases
test('.173 A: a Tam–Bess agreement in the same words as Alaric\'s promise with Tam is its own thread; Alaric is no party of it, #npc and the card show nothing new of his', () => {
    const { s, mine, BESS } = tamAndBess();
    const r = reply(s, [thread(1, DRINK, [TAM, BESS])], 'Tam told Bess she owed him the same, a drink from the first quest pay.', 56);
    const [t] = sets(r);
    assert.notEqual(t.id, mine.id, 'a new thread, not Alaric\'s');
    assert.deepEqual(t.who, [TAM, BESS]);
    assert.deepEqual(r.state.threads[mine.id].who, ['pc', TAM], 'Alaric\'s promise keeps its parties');
    assert.equal(Object.values(r.state.threads).filter((x) => (x.who || []).includes('pc') && x.status === 'open').length, 1);
    assert.ok(!/Open between you/.test(panel(r.state, 'Bess')), 'no agreement of Alaric with Bess');
    assert.deepEqual(openBetween(panel(r.state, 'Tam')), [`- ${DRINK}`], 'one open agreement with Tam: his own');
    assert.ok(between(r.state).every((l) => !l.includes(BESS)));
});

test('.173 A2: a reworded Tam–Bess agreement (most words alike) is no update of Alaric\'s promise with Tam', () => {
    const { s, mine, BESS } = tamAndBess();
    const r = reply(s, [thread(1, "Tam Ostler expects Bess to buy him a drink with the first quest's pay", [TAM, BESS])], 'Tam told Bess she owed him a drink from the first quest pay as well.', 56);
    const [t] = sets(r);
    assert.notEqual(t.id, mine.id);
    assert.deepEqual([t.who, r.state.threads[mine.id].who, r.state.threads[mine.id].text], [[TAM, BESS], ['pc', TAM], DRINK]);
    assert.ok(!/Open between you/.test(panel(r.state, 'Bess')));
});

test('.173 B: a settlement without id and without parties that fits two alike promises closes neither', () => {
    const { s, ts } = twoAlike();
    assert.equal(new Set(ts.map((t) => t.id)).size, 2, 'two promises of the same words stay two');
    const r = reply(s, [thread(1, 'promised to buy Alaric a drink tomorrow night', null, { status: 'resolved', resolution: 'the round was bought' })], 'The round was bought.', 55);
    assert.equal(sets(r).length, 0, 'no thread closed by chance');
    assert.equal(rejected(r).length, 1);
    assert.match(rejected(r)[0].d.reason, /ambiguous/);
    for (const t of ts) assert.equal(r.state.threads[t.id].status, 'open');
});

test('.173 C: a debt in the same words and with the same parties is not Alaric\'s promise', () => {
    const { s, BESS } = tamAndBess();
    const text = 'Bess will owe Alaric a favour for carrying the kegs';
    const p = reply(s, [thread(1, text, ['pc', BESS])], 'Bess said she would owe him a favour for carrying the kegs.', 56);
    const [promise] = sets(p);
    const d = reply(p.state, [thread(1, text, ['pc', BESS], { kind: 'debt' })], 'Bess said again she owed him a favour.', 57);
    const [debt] = sets(d);
    assert.notEqual(debt.id, promise.id);
    assert.deepEqual([debt.kind, d.state.threads[promise.id].kind], ['debt', 'promise']);
});

// -------------------------------------------------------------------------------------------------- positive controls
test('.173 positive: a settlement by id without parties keeps them; a settlement by words with the whole party set closes only that one', () => {
    const { s, mine } = tamAndBess();
    const byId = reply(s, [thread(1, DRINK, null, { id: mine.id, status: 'resolved', resolution: 'Alaric bought the round' })], 'He bought the round.', 56);
    assert.deepEqual(sets(byId).map((t) => [t.id, t.status, t.who]), [[mine.id, 'resolved', ['pc', TAM]]]);
    const { s: s2, ts, BESS } = twoAlike();
    const r = reply(s2, [thread(1, 'promised to buy Alaric a drink tomorrow night', ['pc', BESS], { status: 'resolved', resolution: 'Bess bought the round' })], 'Bess bought the round.', 55);
    assert.deepEqual(sets(r).map((t) => [t.id, t.status, t.who]), [[ts.find((t) => t.who.includes(BESS)).id, 'resolved', ['pc', BESS]]]);
    assert.equal(r.state.threads[ts.find((t) => t.who.includes(TAM)).id].status, 'open');
});

test('.173 positive: one fitting thread is updated by its words – the same parties, or only the NPC when Alaric is not here', () => {
    const { s, mine } = tamAndBess();
    const same = reply(s, [thread(1, DRINK, ['pc', TAM])], 'Tam reminded him of the drink.', 56);
    assert.deepEqual(sets(same).map((t) => [t.id, t.who]), [[mine.id, ['pc', TAM]]]);
    // Tam not in the scene: World keeps only Tam as party; still his promise with Alaric (a part of its parties)
    const away = structuredClone(s);
    away.scene.present = away.scene.present.filter((id) => id !== TAM);
    const r = reply(away, [thread(1, DRINK, ['pc', TAM], { status: 'resolved', resolution: 'Alaric left the coin for the drink with Bess' })], 'He left the coin for Tam\'s drink with Bess.', 56);
    assert.deepEqual(sets(r).map((t) => [t.id, t.status, t.who]), [[mine.id, 'resolved', ['pc', TAM]]]);
});

test('.173 positive: an old thread without parties is bound only by its exact words and kind; a debt of its words is a new thread', () => {
    const s = foldChat(structuredClone(u2), 56).state; // the original I54 thread (no who) is open here
    const old = Object.values(s.threads).find((t) => /buy him a drink/.test(t.text));
    assert.ok(old && !old.who);
    const exact = reply(s, [thread(1, old.text, ['pc', TAM])], 'Tam reminded him of the drink.', 56);
    assert.deepEqual(sets(exact).map((t) => [t.id, t.who]), [[old.id, ['pc', TAM]]]);
    const debt = reply(s, [thread(1, old.text, ['pc', TAM], { kind: 'debt' })], 'Tam reminded him of the drink.', 56);
    assert.notEqual(sets(debt)[0].id, old.id);
    assert.equal(debt.state.threads[old.id].who, undefined, 'the old thread is not changed');
});

test('.173 fold: the threads of every case fold to the same state', () => {
    const { s, BESS } = tamAndBess();
    const a = reply(s, [thread(1, DRINK, [TAM, BESS])], 'Tam told Bess she owed him the same.', 56);
    const { s: s2 } = twoAlike();
    const b = reply(s2, [thread(1, 'promised to buy Alaric a drink tomorrow night', null, { status: 'resolved', resolution: 'bought' })], 'The round was bought.', 55);
    for (const [from, x] of [[s, a], [s2, b]]) {
        const f = structuredClone(from);
        for (const e of x.events) applyEvent(f, e);
        assert.deepEqual(f, x.state);
    }
});

// ------------------------------------------------------------------------------------------------------------- host
const HALL = 'loc.alderwatch.guild_hall';
const clerk = { seq: 2, type: 'person.new', ref: 'hall_clerk', name: null, role: 'clerk', desc: ['grey-haired woman with spectacles at the long counter'], armed: null, present: true, relevant: true, threat: false, at: HALL, band: 'SHORT', distinct_from: null };
const porter = { seq: 1, type: 'person.new', ref: 'porter', name: 'Hob', role: 'porter', desc: ['broad porter with a rope over his shoulder'], armed: null, present: true, relevant: true, threat: false, at: HALL, band: 'SHORT', distinct_from: null };
const KEEP = 'The clerk promised to keep a copy of the Alderwatch road map until dusk';
const evs = (r, t) => (r?.record?.events || []).filter((e) => e.t === t);

test('.173 host: the clerk\'s promise to a porter in Alaric\'s words stays theirs through the parser, regenerate, swipe, edit and reload', async () => {
    const g = await campaign(content);
    await say(g, '*I walk to the Guild hall*', GO(HALL, 'I walk to the Guild hall'));
    await g.reply('He walked into the Guild hall. A grey-haired woman with spectacles at the long counter promised to keep a copy of the road map for him until dusk.',
        { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: null } }, deltas: [{ seq: 1, type: 'arrive', at: HALL, forced_by: null, with: null }, clerk, { seq: 3, type: 'thread', id: null, text: KEEP, kind: 'promise', status: 'open', resolution: null, who: ['pc', 'hall_clerk'] }] });
    const id = Object.values(g.state().entities).find((e) => /grey-haired woman/.test(e.traits || '')).id;
    await say(g, '*I wait while she talks to the porter*');
    const answer = { scene: HALL, expected: {}, deltas: [porter, { seq: 2, type: 'thread', id: null, text: KEEP, kind: 'promise', status: 'open', resolution: null, who: ['hall_clerk', 'porter'] }] };
    const PROSE = 'Hob, a broad porter with a rope over his shoulder, asked the clerk for a map; she promised to keep a copy for him until dusk too.';
    const check = (what) => {
        const s = g.state();
        const ts = Object.values(s.threads).filter((t) => t.text === KEEP);
        const hob = Object.values(s.entities).find((e) => e.name === 'Hob').id;
        assert.deepEqual(ts.map((t) => t.who).sort(), [['pc', id], [id, hob]].sort(), what);
        assert.ok(!/Open between you/.test(runCommands(s, content, '#npc Hob').panels.join('\n')), what);
        assert.deepEqual(openBetween(runCommands(s, content, '#npc clerk').panels.join('\n')), [`- ${KEEP}`], what);
    };
    await g.reply(PROSE, answer);
    check('reply');
    // regenerate the reply: one new thread again
    g.chat.pop();
    await prepareGenerationAsync(g.chat, g.content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    const again = await g.reply(PROSE, answer);
    assert.equal(evs(again, 'thread.set').length, 1);
    check('regenerate');
    // a swipe of the reply, then an edit of the player message: each reply is read again the same way
    g.chat.pop();
    await prepareGenerationAsync(g.chat, g.content, { type: 'swipe', settings: { planner: true }, llm: g.llm });
    await g.reply(PROSE, answer);
    check('swipe');
    g.chat.pop();
    g.chat.at(-1).mes = '*I wait while the clerk talks with the porter*';
    g.plans = [JSON.stringify({ commands: [] })];
    await prepareGenerationAsync(g.chat, g.content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    const edited = await g.reply(PROSE, answer);
    assert.equal(evs(edited, 'thread.set').length, 1);
    check('edit');
    // reload (save as JSON, fold from scratch)
    const reloaded = foldChat(JSON.parse(JSON.stringify(g.chat))).state;
    assert.deepEqual(reloaded, g.state());
    // the next turn's card for the clerk names only Alaric's own agreement
    const next = await say(g, '*I ask the clerk about the map*');
    const rows = next.context.text.split('\n').filter((l) => l.includes('between you'));
    assert.ok(rows.length && rows.every((l) => l.includes(KEEP.slice(0, 40))), rows.join('\n'));
    assert.equal(Object.values(g.state().threads).filter((t) => t.text === KEEP && (t.who || []).includes('pc')).length, 1);
});
