// Runtime V4, the first live test (28.09.2026 04:27, SillyTavern 1.19, GLM-5.3-Flash; docs/LIVETEST_V4.md) replayed
// through the product's host path with the model's recorded answers (tests/v4/live_0928.json): the interpreter's, the
// Board generator's and the extractor's answers as the request log has them, the replies as the chat has them.
// The run showed four errors: the agency guard dropped a clear payment (no_evidence: the interpreter's quote left out
// "say and"), the clerk's "F-Rank to start, for everyone" became a world fact, "*i sign the card*" was read as
// overreach, and the clerk never learned his name. The recorded extractor answers of t3 and t4 answered PLAYER ACTIONS
// the engine no longer gives (NOTHING TO BOOK; REGISTERS — pending): there the test checks what the extractor is now
// given, and replays the reply with the answer that request asks for.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { prepareGenerationAsync, processReplyAny, runExtraction, runBoardAfterArrival, extractionRequest } from '../../src/v4/runtime.js';
import { knows, currentFacts, PC_NAME_FACT } from '../../src/knowledge.js';
import { validateState } from '../../src/validate.js';

const content = await loadContent();
const live = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_0928.json'), 'utf8'));
const T = (id) => live.turns.find((t) => t.id === id);

/** The live chat: every LLM call answers what the log recorded for it, in order; no call is left unanswered. */
class Live extends Chat4 {
    constructor() {
        super(content, { greeting: live.greeting });
        this.queue = { interpret: [], extract: [], board: [] };
        this.llm = async ({ messages, purpose }) => {
            this.calls.push({ purpose, messages });
            const kind = purpose.startsWith('interpret') ? 'interpret' : purpose.startsWith('extract') ? 'extract' : purpose === 'board' ? 'board' : null;
            assert.ok(kind && this.queue[kind].length, `a recorded answer for ${purpose}`);
            return this.queue[kind].shift();
        };
    }

    /** A player message of the run with the interpreter's recorded answer. */
    async turn(id) {
        const t = T(id);
        this.queue.interpret.push(t.interpreter);
        return this.player(t.player);
    }

    /** A reply with the extractor's answer (recorded or given) and, on arrival at a hall, the Board generator's. */
    async replyWith(prose, extractor, board = null) {
        this.queue.extract.push(typeof extractor === 'string' ? extractor : JSON.stringify(extractor));
        if (board) this.queue.board.push(board);
        return this.reply(prose);
    }

    /** A swipe of reply id: SillyTavern keeps extra, the text changes; its own extraction and board. */
    async swipe(id, { prose, extractor, board }) {
        this.chat[id].mes = prose;
        const again = await prepareGenerationAsync(this.chat.slice(0, id), content, { type: 'swipe', llm: this.llm });
        assert.equal(again.action, 'context');
        assert.equal(processReplyAny(this.chat, id, content, {}).extract, true);
        this.queue.extract.push(extractor);
        this.queue.board.push(board);
        const x = await runExtraction(this.chat, id, content, this.llm);
        if (x.boardNeeded) await runBoardAfterArrival(this.chat, id, content, this.llm);
        return this.record(id);
    }
}

const outcome = (g) => g.state().last.outcome;
const clerkOf = (s) => Object.values(s.entities).find((e) => e.kind === 'npc' && (e.descriptors || []).some((x) => /\bclerk\b/.test(x)))?.id;
const bowmanOf = (s) => Object.values(s.entities).find((e) => e.kind === 'npc' && (e.descriptors || []).some((x) => /\bdozing\b/.test(x)))?.id;
const factText = (s) => currentFacts(s, () => true).map((f) => `${f.s} ${f.p} ${f.o}`).join('\n');
const rules = (r) => (r.rejected || []).map((x) => `${x.seq}:${x.rule}`);

/** Creation as in the run, then t1 (both swipes), optionally t2 with its recorded reply and extraction. */
async function run({ upTo = 't1' } = {}) {
    const g = new Live();
    for (const m of live.creation) await g.player(m);
    await g.turn('t1');
    const [s0, s1] = T('t1').replies;
    const first = await g.replyWith(s0.prose, s0.extractor, s0.board);
    const swipe0 = { record: first.record, state: g.state() };
    const second = await g.swipe(first.id, s1);
    if (upTo === 't1') return { g, swipe0, second };
    await g.turn('t2');
    const t2 = await g.replyWith(T('t2').replies[0].prose, T('t2').replies[0].extractor);
    return { g, swipe0, second, t2 };
}

test('t1: the entry toll the first swipe invented changes no coin; the fee it invented is refused and corrected; the swipe that counts reaches the hall', async () => {
    const { g, swipe0, second } = await run();
    // swipe 0: "The coins left the pouch" for a toll Alaric never decided; the extractor reported only the toll itself
    assert.equal(swipe0.state.entities.pc.sheet.coin_cp, 50, 'coin is the engine\'s: a narrated payment changes nothing');
    assert.match(factText(swipe0.state), /^loc\.lumenford charges_strangers_an_entry_toll 2 copper at the gate$/m, 'the toll is a fact of the town');
    assert.deepEqual(rules(swipe0.record).filter((x) => x.endsWith('guild_canon')), ['6:guild_canon', '7:guild_canon'], '"a silver and a thumbprint", "the rank stamp after the assessor"');
    assert.ok(swipe0.record.corrections.includes('The Guild\'s registration fee is 2 silver (20 cp), one-time, the same at every branch.'));
    assert.doesNotMatch(factText(swipe0.state), /thumbprint|rank stamp/);
    // swipe 1 replaces it: no toll, the hall with its clerk and the dozing bowman
    const s = g.state();
    assert.equal(second.extraction.status, 'applied');
    assert.equal(s.scene.at, 'loc.lumenford.guild_hall');
    assert.equal(s.entities.pc.sheet.coin_cp, 50);
    assert.doesNotMatch(factText(s), /toll|thumbprint/, 'what a swiped-away reply established is gone');
    assert.ok(clerkOf(s) && s.scene.present.includes(clerkOf(s)));
    assert.ok(bowmanOf(s) && s.scene.present.includes(bowmanOf(s)));
    assert.ok(Object.values(s.quests).some((q) => q.kind === 'guild_contract' && q.status === 'listed'), 'the board was generated');
    assert.deepEqual(validateState(s, content), []);
});

test('t2: "I\'m here to register" at the counter is pending: 2 silver named, nothing paid, Guild Rank and Power Rank told apart; the clerk\'s "F-Rank to start" never becomes a fact', async () => {
    const g = (await run()).g;
    const p = await g.turn('t2');
    const s = g.state();
    assert.deepEqual(outcome(g).resolutions.map((r) => r.status), ['pending']);
    assert.equal(s.offers['offer.registration'].lines[0].price_cp, 20);
    assert.equal(s.entities.pc.sheet.coin_cp, 50);
    assert.equal(s.guild.membership, null);
    const actions = outcome(g).actions.join('\n');
    assert.match(actions, /registration fee is 2 silver \(20 cp\), one-time; a new member starts at Guild Rank Novice/);
    assert.match(actions, /Power Rank \(F to S\) is a person's measured strength, a separate scale the Guild reads but never grants/);
    assert.match(p.context.text, /he has not agreed to pay/);
    // the recorded reply ("F-Rank to start, for everyone") and the recorded extractor answer
    const r = await g.replyWith(T('t2').replies[0].prose, T('t2').replies[0].extractor);
    assert.deepEqual(rules(r.record), ['2:guild_canon', '3:guild_canon', '5:guild_canon'], 'the fee, the starting rank, the registration\'s requirements');
    const after = g.state();
    assert.doesNotMatch(factText(after), /F-Rank|registration costs|lifetime membership/);
    assert.match(factText(after), /carrying arms inside without surrendering them/, 'the hall\'s custom stays a fact');
    assert.deepEqual(r.record.corrections, ['The Guild\'s ranks are the engine\'s: a new member starts at Guild Rank Novice (Novice, Proven, Veteran, Elite, Master, Grandmaster, Legend); Power Rank (F to S) is a person\'s measured strength, a separate scale the Guild never grants.']);
    assert.equal(r.record.system, undefined, 'nothing is NOT APPLIED');
    // the next engine block brings the correction, and no fact of an F-Rank start
    g.queue.interpret.push(T('t3').interpreter);
    const next = await g.player(T('t3').player);
    assert.match(next.context.text, /CORRECTIONS[^]*a new member starts at Guild Rank Novice/);
    assert.doesNotMatch(next.context.text, /F-Rank/);
});

test('t3: the elided quote of a clear payment stands: 20 cp once, Guild Rank Novice with Power Rank F, the clerk knows his name; the extractor reads the message and the booked payment', async () => {
    const { g } = await run({ upTo: 't2' });
    await g.turn('t3');
    const o = outcome(g);
    assert.deepEqual(o.dropped || [], [], 'the guard keeps it: "i push 2 silver …" stands in "i say and push 2 silver …"');
    assert.deepEqual(o.resolutions.map((r) => [r.type, r.status]), [['offer.accept', 'resolved']]);
    const s = g.state();
    assert.equal(s.entities.pc.sheet.coin_cp, 30, 'exactly the canon fee, once');
    assert.equal(s.guild.membership.rank, 'Novice');
    assert.equal(s.offers['offer.registration'].status, 'accepted');
    assert.deepEqual(s.decisions, []);
    assert.match(o.actions.join('\n'), /PAYS — the Guild registration fee, 20 cp: registered at Guild Rank Novice; the crystal reads his Power Rank: F \(his measured strength, a separate scale from the Guild's ranks\)/);
    // "My name is Alaric Red" at the counter: the desk that registers him writes his name down; the bowman dozes on
    assert.equal(knows(s, clerkOf(s), PC_NAME_FACT), true);
    assert.equal(knows(s, bowmanOf(s), PC_NAME_FACT), false);
    // the reply: the extractor is given the player's words and the payment the engine booked
    g.chat.push({ mes: T('t3').replies[0].prose, is_user: false, is_system: false, extra: {} });
    const id = g.chat.length - 1;
    processReplyAny(g.chat, id, content, {});
    const req = extractionRequest(g.chat, id, content);
    const user = req.messages[1].content;
    assert.match(user, /PLAYER MESSAGE \(what the player wrote Alaric saying and doing\):\nMy name is Alaric Red \*i say and push 2 silver over the counter as i pay the fee\*/);
    assert.match(user, /PLAYER ACTIONS \(already booked\):\n1\. PAYS — the Guild registration fee, 20 cp/);
    assert.ok(user.indexOf('PLAYER MESSAGE') < user.indexOf('PLAYER ACTIONS'));
    // what a faithful reader of that request reports: the clerk heard his name; the card "F-Rank, Lumenford branch"
    g.queue.extract.push(JSON.stringify({ expected: {}, deltas: [
        { seq: 1, type: 'learn', who: clerkOf(s), s: 'pc', p: 'name', o: 'Alaric Red', how: 'told' },
        { seq: 2, type: 'fact', s: 'Alaric\'s Guild card', p: 'reads', o: 'F-Rank, Lumenford branch' },
    ] }));
    await runExtraction(g.chat, id, content, g.llm);
    const r = g.record(id);
    assert.equal(r.extraction.status, 'applied');
    assert.deepEqual(rules(r), ['2:guild_canon'], 'his rank on his card is the engine\'s');
    assert.equal(r.system, undefined, 'no NOT APPLIED');
    const after = g.state();
    assert.equal(after.entities.pc.sheet.coin_cp, 30, 'no second payment');
    assert.equal(after.guild.membership.rank, 'Novice');
    assert.doesNotMatch(factText(after), /F-Rank/);
    assert.deepEqual(validateState(after, content), []);
});

test('t4: "*i sign the card*" after he paid books nothing and refuses nothing; the extractor is told his own acts are never overreach', async () => {
    const { g } = await run({ upTo: 't2' });
    await g.turn('t3');
    await g.replyWith(T('t3').replies[0].prose, { expected: {}, deltas: [] });
    const p = await g.turn('t4');
    const o = outcome(g);
    // the interpreter read the signature as guild.register (recorded); a member registers no second time
    assert.deepEqual((o.dropped || []).map((d) => [d.type, d.rule, d.quote]), [['guild.register', 'redundant', 'i sign the card']]);
    assert.deepEqual(o.resolutions, []);
    assert.match(o.actions[0], /^NOTHING TO BOOK — .*narrate what he says and does/);
    assert.doesNotMatch(p.context.text, /NOTHING TO DO — he is already a member|REGISTERS — pending|has not agreed to pay/);
    assert.equal(g.state().entities.pc.sheet.coin_cp, 30);
    g.chat.push({ mes: 'He signs the card; she stamps it and slides it back to him.', is_user: false, is_system: false, extra: {} });
    const id = g.chat.length - 1;
    processReplyAny(g.chat, id, content, {});
    const req = extractionRequest(g.chat, id, content);
    assert.match(req.messages[1].content, /PLAYER MESSAGE \(what the player wrote Alaric saying and doing\):\n\*i sign the card\*/);
    assert.match(req.messages[0].content, /What the PLAYER MESSAGE has him say or do himself \(his words, a gesture, signing, sitting down\) is his own, never overreach/);
    assert.match(req.messages[1].content, /ALARIC: Guild member, Novice · 30 cp/, 'the CATALOG shows the registration done');
});

test('counter-case: a reply that has him sign and register while the fee is still open is overreach: not applied, no member, coin unchanged', async () => {
    const { g } = await run({ upTo: 't2' });
    await g.player('*i wait while she writes*', []);
    assert.match(outcome(g).actions[0], /^NOTHING TO BOOK/);
    g.chat.push({ mes: 'Alaric signs the register and pushes two silver across; she stamps his card. "Welcome to the Guild."', is_user: false, is_system: false, extra: {} });
    const id = g.chat.length - 1;
    processReplyAny(g.chat, id, content, {});
    const req = extractionRequest(g.chat, id, content);
    assert.match(req.messages[1].content, /PLAYER MESSAGE \(what the player wrote Alaric saying and doing\):\n\*i wait while she writes\*/);
    assert.match(req.messages[0].content, /a payment, purchase, pick-up, acceptance, turn-in, registration or journey that the reply shows, that PLAYER ACTIONS do not book and the CATALOG does not show as done already, is overreach, even when the PLAYER MESSAGE has him do it/);
    // what a faithful reader reports: he registered and paid without deciding it
    g.queue.extract.push(JSON.stringify({ expected: {}, deltas: [
        { seq: 1, type: 'overreach', kind: 'register', what: 'Alaric signed the register and was registered' },
        { seq: 2, type: 'overreach', kind: 'payment', what: 'Alaric paid the 2 silver fee' },
    ] }));
    await runExtraction(g.chat, id, content, g.llm);
    const r = g.record(id);
    assert.equal(r.system.length, 2);
    assert.match(r.system[0], /^NOT APPLIED — Alaric signed the register/);
    const s = g.state();
    assert.equal(s.guild.membership, null);
    assert.equal(s.entities.pc.sheet.coin_cp, 50);
    assert.equal(s.offers['offer.registration'].status, 'open');
});
