// Build .180 – Patch 1 of the natural NPC/PULSE batch 12./13.11.2026 (testrun_10b/npc-20261112-220625Z/REVIEW.md on
// main, Fable §8 P2-1 and P2-3, GPT §9). Two separate corrections in one build:
//   P2-1  registration with the canon fee in the same message (Warrior T5, Rogue T5): the coin he lays down or hands
//         over at the Guild desk is his payment of the fee, also when the same money words stand twice in his act;
//   P2-3  a planner answer that is nothing but [] is the empty command list (Mage T24, T46–T48); the repair names
//         {"commands":[...]}. Neither invents an action: no payment from a question, no GO from an empty list.
// The original ZIP is not in the repository (SOURCE_MANIFEST.md); the player texts are the ones the review quotes, the
// planner answers are rebuilt from its description of them (pay 20 cp with "two silver" plus guild.register; [] ).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, loadProductContent, ROOT } from '../helpers.js';
import { rec } from '../../src/host.js';
import { payArgument } from '../../src/v4/finance_evidence.js';
import { emptyState, applyEvent } from '../../src/state.js';
import { rulesetOf } from '../../src/content.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { guardCommands } from '../../src/v4/agency.js';
import { buildCatalog, guardContext } from '../../src/v4/catalog.js';
import * as planner from '../../src/v4/planner.js';
import { planMessage, prepareGenerationAsync } from '../../src/v4/runtime.js';
import { Chat4 } from './harness.js';
import { say, linesOf } from './patch8_lib.js';

const { planContext, withContentSkills, parsePlan } = planner;

const content = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1022d.json'), 'utf8'));
const CLERK = 'npc.w_guild_clerk';

// ------------------------------------------------------------------------------------------------ P2-1 registration
/** The Guild hall of the live chat 22.10.2026 before the registration (50 cp, not a member), with a scripted planner. */
function hall() {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, 9).map((m) => structuredClone(m));
    const ask = g.llm;
    g.requests = [];
    g.llm = async (req) => {
        g.requests.push(req.purpose);
        if (req.purpose === 'plan_repair') return g.repair ?? null;
        return req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req);
    };
    return g;
}
const coin = (g) => g.state().entities.pc.sheet.coin_cp;
const member = (g) => !!g.state().guild.membership;
const debits = (g) => g.chat.flatMap((m) => rec(m)?.events || []).filter((e) => e.t === 'coin.changed' && e.d.delta < 0).map((e) => e.d.delta);
const registered = (g) => g.chat.flatMap((m) => rec(m)?.events || []).filter((e) => e.t === 'guild.registered').length;
const PAY = (quote, money, amount_cp = 20, more = {}) => ({ type: 'pay', to: CLERK, amount_cp, for: 'Guild registration fee', quote,
    money: money ? { quote: money, currency_quote: null } : null, recipient_quote: null, ...more });
const REGISTER = (quote) => ({ type: 'guild.register', quote });

const WARRIOR_T5 = 'I slide two silver across the counter. "Here\'s the two silver — let\'s do the roll and the stone."';
const ROGUE_T5 = '"I\'ll register. Two silver, was it?" I count out two silver and slide them across the counter.';

test('.180 P2-1 Warrior T5: two silver slid across and named again in the same act register him once, without a repair (.179: money_ambiguous, repair to null, NOT REGISTERED)', async () => {
    const g = hall();
    // the repair of .179 dropped the money: if it is asked again, it would answer as it did then
    g.repair = JSON.stringify({ commands: [{ seq: 1, ...PAY(WARRIOR_T5.split(' — ')[0], null) }, { seq: 2, ...REGISTER("let's do the roll and the stone") }] });
    await say(g, WARRIOR_T5, PAY(WARRIOR_T5.split(' — ')[0], 'two silver'), REGISTER("let's do the roll and the stone"));
    assert.deepEqual(g.requests, ['plan'], 'no repair for the twice-said two silver');
    assert.equal(member(g), true);
    assert.equal(coin(g), 30);
    assert.deepEqual(debits(g), [-20]);
    assert.equal(registered(g), 1);
    const lines = linesOf(g);
    assert.match(lines, /^1\. PAYS — the Guild registration fee, 20 cp: registered at Guild Rank Novice/m);
    assert.match(lines, /^2\. REGISTERS — done: the fee he paid above registered him\./m);
    assert.doesNotMatch(lines, /NOT REGISTERED|has not agreed to pay/);
});

test('.180 P2-1 Rogue T5: "I count out two silver and slide them across the counter" beside "I\'ll register" registers him once (.179: NOT REGISTERED)', async () => {
    for (const quote of ['I count out two silver and slide them across the counter', ROGUE_T5]) {
        // the second: the planner quotes the whole message, so "two silver" stands twice (the question and the act)
        const g = hall();
        await say(g, ROGUE_T5, REGISTER("I'll register."), PAY(quote, 'two silver'));
        assert.deepEqual(g.requests, ['plan'], quote);
        assert.equal(member(g), true, quote);
        assert.deepEqual(debits(g), [-20], quote);
        assert.equal(registered(g), 1, quote);
        const lines = linesOf(g);
        assert.match(lines, /^1\. REGISTERS — he asks to be registered and pays the fee at once \(below\)\./m, quote);
        assert.match(lines, /^2\. PAYS — the Guild registration fee, 20 cp/m, quote);
    }
});

test('.180 P2-1 against: a question about the fee pays nothing, also beside an explicit registration', async () => {
    for (const [text, cmds] of [
        ['"I\'ll register. Two silver, was it?"', [REGISTER("I'll register."), PAY('Two silver, was it?', 'Two silver')]],
        ['"Two silver, was it? Two silver for the registration?"', [PAY('Two silver, was it? Two silver for the registration?', 'Two silver')]],
    ]) {
        const g = hall();
        await say(g, text, ...cmds);
        assert.equal(member(g), false, text);
        assert.equal(coin(g), 50, text);
        assert.deepEqual(debits(g), [], text);
        assert.doesNotMatch(linesOf(g), /^\d+\. PAYS/m, text);
    }
});

test('.180 P2-1 against: unclear consent pays nothing – coin counted out but not laid down, or only shown', async () => {
    for (const [text, quote] of [['"I\'ll register." I count out two silver.', 'I count out two silver'],
        ['"I\'ll register." I have two silver in my purse.', 'I have two silver in my purse'],
        ['"I\'ll register." I count out two silver and keep them in my hand.', 'I count out two silver and keep them in my hand']]) {
        const g = hall();
        await say(g, text, REGISTER("I'll register."), PAY(quote, 'two silver'));
        assert.equal(member(g), false, text);
        assert.equal(coin(g), 50, text);
        assert.deepEqual(debits(g), [], text);
        assert.match(linesOf(g), /NOT REGISTERED|REGISTERS — pending/, text);
    }
});

test('.180 P2-1 against: another amount counted out for the registration stays NOT PAID (8.4.2)', async () => {
    const g = hall();
    const text = '"I\'ll register." I count out one silver and slide it across the counter.';
    await say(g, text, REGISTER("I'll register."), PAY('I count out one silver and slide it across the counter', 'one silver', 10));
    assert.equal(member(g), false);
    assert.equal(coin(g), 50);
    assert.match(linesOf(g), /NOT PAID — 10 cp \(1 Silver\) is not the Guild's registration fee \(2 silver \(20 cp\), one-time\)/);
});

test('.180 P2-1 against: no second fee – one pay per place of the same two silver books the fee once (ruleset 1 live chat: the second stays a card)', async () => {
    const g = hall();
    await say(g, WARRIOR_T5, PAY('I slide two silver across the counter', 'two silver'), PAY("Here's the two silver", 'two silver'), REGISTER("let's do the roll and the stone"));
    assert.equal(member(g), true);
    assert.deepEqual(debits(g), [-20]);
    assert.equal(registered(g), 1);
    assert.match(linesOf(g), /^2\. NOT PAID — payment card/m, 'the legacy ruleset of this chat (unchanged): no coin moves');
});

test('.180 P2-1 against: a tip beside the counted-out fee stays its own payment card, never the fee (B15)', async () => {
    const g = hall();
    const text = '"I\'ll register." I count out two silver and slide them across the counter, and leave her five copper as a tip for her trouble.';
    await say(g, text, REGISTER("I'll register."), PAY('I count out two silver and slide them across the counter', 'two silver'),
        { type: 'pay', to: CLERK, amount_cp: 5, for: 'a tip for her trouble', quote: 'leave her five copper as a tip for her trouble', money: { quote: 'five copper', currency_quote: null }, recipient_quote: null });
    assert.equal(member(g), true);
    assert.deepEqual(debits(g), [-20]);
    const opened = rec(g.chat.findLast((m) => m.is_user)).events.filter((e) => e.t === 'decision.opened' && e.d.decision.kind === 'payment');
    assert.deepEqual(opened.map((e) => e.d.decision.amount_cp), [5]);
});

test('.180 P2-1 against: counted-out coin with no registration asked and no fee open is no registration', async () => {
    const g = hall();
    await say(g, 'I count out two silver and slide them across the counter.', { ...PAY('I count out two silver and slide them across the counter', 'two silver'), for: null });
    assert.equal(member(g), false);
    assert.equal(registered(g), 0);
    assert.deepEqual(debits(g), [], 'a free payment is only ever a card');
});

// payArgument directly: the repeated money words of one act (S1 for pay.money) – the same coin only where every place
// reads the same amount and none asks for his own money or pays someone else
const P = (quote, money, amount_cp = 20) => ({ type: 'pay', to: 'npc.clerk', amount_cp, quote, money: { quote: money, currency_quote: null }, recipient_quote: null });
const present = [{ id: 'npc.clerk', names: ['the clerk', 'Mira'] }, { id: 'npc.tam', names: ['Tam'] }];
const arg = (text, c) => payArgument(text, c, { content, present });

test('.180 P2-1 payArgument: the same two silver twice in one act is that coin once; a question beside his act does not make it two', () => {
    const r = arg(WARRIOR_T5, P(WARRIOR_T5, 'two silver'));
    assert.equal(r.state, 'verified');
    assert.equal(r.act, 'outgoing');
    assert.equal(r.cp, 20);
    assert.equal(r.places.length, 2);
    const q = arg(ROGUE_T5, P(ROGUE_T5, 'two silver'));
    assert.deepEqual([q.state, q.act, q.cp], ['verified', 'outgoing', 20]);
    // only the question, twice: an amount, no act of paying
    const ask = '"Two silver, was it? Two silver?"';
    assert.deepEqual([arg(ask, P(ask, 'Two silver')).state, arg(ask, P(ask, 'Two silver')).act], ['verified', 'unclear']);
});

test('.180 P2-1 payArgument against: repeated money words of a claim, of another payee or of another amount stay ambiguous or contradicted', () => {
    for (const text of ['I slide two silver across the counter. "You owe me two silver anyway."',
        'I hand Tam two silver. I slide two silver across the counter.']) {
        const r = arg(text, P(text, 'two silver'));
        assert.equal(r.state, 'missing', text);
        assert.equal(r.reason, 'money_ambiguous', text);
    }
    const r = arg(WARRIOR_T5, P(WARRIOR_T5, 'two silver', 30));
    assert.equal(r.state, 'contradicted');
    assert.equal(r.reason, 'amount_differs');
    assert.equal(r.cp, 20);
});

test('.180 P2-1 payArgument: counted out and laid down is his outgoing coin; counted out alone, kept or claimed is not', () => {
    for (const text of ['I count out two silver and slide them across the counter.', 'I count out two silver onto the desk.',
        'I count out two silver, then push them across the counter.']) {
        const r = arg(text, P(text, 'two silver'));
        assert.deepEqual([r.state, r.act], ['verified', 'outgoing'], text);
    }
    for (const text of ['I count out two silver.', 'I count out two silver and keep them in my hand.', 'I count out two silver and slide them into my purse.',
        'I take out two silver and look at them.', 'I ask her to count out two silver and slide them across the counter.']) {
        const r = arg(text, P(text, 'two silver'));
        assert.notEqual(r.act, 'outgoing', text);
    }
});

// The same cases on ruleset 2 (the batch campaigns): the Glassmere Guild hall of batch 6 before the registration, through
// the planner's check, the agency guard and the command handlers
const B6 = JSON.parse(fs.readFileSync(new URL('./fixtures/batch6_guild_start.json', import.meta.url)));
const GCLERK = 'npc.npcglassmere_clerk';
function r2hall() {
    const s = emptyState();
    let t = 0;
    for (const m of B6) { if (m.is_user) t++; if (t === 14) break; for (const e of m.events) applyEvent(s, e); }
    s.scene.at = 'loc.glassmere.guild_hall';
    assert.equal(rulesetOf(s), 2);
    return s;
}
const planOf = (s, text, cs) => parsePlan(JSON.stringify({ commands: cs.map((c, i) => ({ seq: i + 1, ...c })) }), content.commandVocab,
    withContentSkills(planContext(s, content, buildCatalog(s, content, { known: true, c: true })), content, s), text);
function r2turn(s, text, cs) {
    const p = planOf(s, text, cs);
    assert.ok(p.commands, `plan valid: ${p.errors.join('; ')}`);
    const g = guardCommands(text, p.commands, guardContext(s, content, buildCatalog(s, content, { known: true, c: true })));
    const events = [];
    const ctx = resolveCommands(s, content, g.kept, (e) => { events.push(e); applyEvent(s, e); }, { c: true, msg: 30, text });
    return { events, lines: ctx.actions.join('\n') };
}
const R2PAY = (quote, money, amount_cp = 20) => ({ ...PAY(quote, money, amount_cp), to: GCLERK });

test('.180 P2-1 ruleset 2: Warrior T5 and Rogue T5 pass the planner check without a repair and register him once', () => {
    for (const [text, cs] of [[WARRIOR_T5, [R2PAY(WARRIOR_T5.split(' — ')[0], 'two silver'), REGISTER("let's do the roll and the stone")]],
        [ROGUE_T5, [REGISTER("I'll register."), R2PAY('I count out two silver and slide them across the counter', 'two silver')]],
        [ROGUE_T5, [REGISTER("I'll register."), R2PAY(ROGUE_T5, 'two silver')]]]) {
        const s = r2hall();
        const r = r2turn(s, text, cs);
        assert.equal(s.entities.pc.sheet.coin_cp, 30, text);
        assert.ok(s.guild.membership, text);
        assert.equal(r.events.filter((e) => e.t === 'guild.registered').length, 1, text);
        assert.match(r.lines, /PAYS — the Guild registration fee, 20 cp/, text);
        assert.doesNotMatch(r.lines, /NOT REGISTERED|has not agreed to pay/, text);
    }
});

test('.180 P2-1 ruleset 2 against: one pay per place of the two silver – the second is refused as a second fee; a question or an unclear act pays nothing', () => {
    const s = r2hall();
    const r = r2turn(s, WARRIOR_T5, [R2PAY('I slide two silver across the counter', 'two silver'), R2PAY("Here's the two silver", 'two silver'), REGISTER("let's do the roll and the stone")]);
    assert.equal(s.entities.pc.sheet.coin_cp, 30);
    assert.deepEqual(r.events.filter((e) => e.t === 'coin.changed').map((e) => e.d.delta), [-20]);
    assert.match(r.lines, /^2\. NOT PAID — already registered; no second registration fee\./m);
    for (const [text, cs] of [['"I\'ll register. Two silver, was it?"', [REGISTER("I'll register."), R2PAY('Two silver, was it?', 'Two silver')]],
        ['"I\'ll register." I count out two silver.', [REGISTER("I'll register."), R2PAY('I count out two silver', 'two silver')]],
        ['"I\'ll register." I count out one silver and slide it across the counter.', [REGISTER("I'll register."), R2PAY('I count out one silver and slide it across the counter', 'one silver', 10)]]]) {
        const t = r2hall();
        const x = r2turn(t, text, cs);
        assert.equal(t.entities.pc.sheet.coin_cp, 50, text);
        assert.equal(t.guild.membership, null, text);
        assert.ok(!x.events.some((e) => e.t === 'coin.changed'), text);
    }
});

// ------------------------------------------------------------------------------------------------ P2-3 planner format
const pcontent = await loadContent();
const stop = (text) => ({ content: text, finish_reason: 'stop' });
const EMPTY = { content: '', finish_reason: 'length', usage: { completion_tokens: 2000 } };
const PROSE = 'Alaric agrees to the plan with the Warrens men. He is not doing a mechanical action now, so the list is empty.';
async function mage() {
    const g = new Chat4(pcontent);
    await g.player('Mage');
    await g.player('Flame Lance and Arcane Ward');
    return g;
}
async function plan(answers, text) {
    const g = await mage();
    const state = g.state();
    const ctx = withContentSkills(planContext(state, pcontent, buildCatalog(state, pcontent)), pcontent);
    const calls = [];
    const llm = async (req) => { calls.push(req); return answers.shift() ?? null; };
    return { result: await planMessage(llm, pcontent, ctx, text), calls, ctx };
}
const T46 = '"If you two hold the mouth of the warren, I will take the big one when it comes. Half the bounty each if you hold."';
const T47 = '"Agreed. You hold the mouth, I go in first, you follow on my word."';
const T48 = '"Done — I go in first now, and draw the big one."';

test('.180 P2-3 Mage T46: a bare [] is the empty command list at once; no repair, nothing booked (.179: two [] answers, planner_not_executed)', async () => {
    const { result, calls } = await plan([stop('[]'), stop('[]')], T46);
    assert.equal(result.failed, false);
    assert.deepEqual(result.commands, []);
    assert.equal(result.repaired, false);
    assert.deepEqual(calls.map((x) => x.purpose), ['plan']);
});

test('.180 P2-3 Mage T47/T48: prose first, then [] in the repair: the repair names {"commands":[...]}; [] is read as the empty list, no GO is made of it', async () => {
    for (const text of [T47, T48]) {
        const { result, calls } = await plan([stop(PROSE), stop('[]')], text);
        assert.equal(result.failed, false, text);
        assert.deepEqual(result.commands, [], text);
        assert.deepEqual(calls.map((x) => x.purpose), ['plan', 'plan_repair'], text);
        const repair = calls[1].messages.at(-1).content;
        assert.match(repair, /\{"commands":\[\.\.\.\]\}, never a bare array/, text);
        assert.match(repair, /\{"commands":\[\]\} only when he takes no mechanical action in this message/, text);
        assert.match(repair, /every mechanical action he takes in this message is planned as its command/, text);
    }
});

test('.180 P2-3 Mage T24: [] in a code fence or after a think block is the empty list too', async () => {
    for (const answer of ['```json\n[ ]\n```', '<think>conditional talk with Hessa, nothing done</think>\n[]', '  []  ']) {
        const p = parsePlan(answer, pcontent.commandVocab, (await plan([stop('{"commands":[]}')], 'x')).ctx, T46);
        assert.deepEqual(p, { commands: [], errors: [], hints: [] }, answer);
    }
});

test('.180 P2-3 against (b): T48 with a GO the planner does plan is executed as planned; the format fix only reads [] as no action', async () => {
    const go = JSON.stringify({ commands: [{ seq: 1, type: 'go', to: { new: 'the warren mouth' }, quote: 'I go in first now' }] });
    const { result } = await plan([stop(go)], T48);
    assert.equal(result.failed, false);
    assert.deepEqual(result.commands.map((c) => c.type), ['go']);
});

test('.180 P2-3 against (c): a non-empty bare array, an array beside prose, or an array with an invalid command stays invalid; the repair names the form', async () => {
    const vocab = pcontent.commandVocab;
    const { ctx } = await plan([stop('{"commands":[]}')], 'x');
    for (const answer of ['[{"seq":1,"type":"go","to":{"new":"the warren mouth"},"quote":"I go in first now"}]', `${PROSE}\n[]`, '[{"seq":1,"type":"fly"}]', '[[]]', '[null]']) {
        const p = parsePlan(answer, vocab, ctx, T48);
        assert.equal(p.commands, null, answer);
        assert.ok(p.errors.length, answer);
    }
    assert.match(parsePlan('[{"seq":1,"type":"go","to":{"new":"x"},"quote":"I go"}]', vocab, ctx, T48).errors[0], /\{"commands":\[\.\.\.\]\}, never a bare array/);
    // both attempts non-empty arrays: no third call, no GO
    const { result, calls } = await plan([stop('[{"seq":1,"type":"go","to":{"new":"x"},"quote":"I go in first now"}]'), stop('[{"seq":1,"type":"go","to":{"new":"x"},"quote":"I go in first now"}]')], T48);
    assert.equal(result.failed, true);
    assert.equal(result.commands, null);
    assert.equal(calls.length, 2);
    // prose without any JSON stays a failure after its one repair
    const prose = await plan([stop(PROSE), stop(PROSE)], T48);
    assert.equal(prose.result.failed, true);
    assert.equal(prose.calls.length, 2);
});

test('.180 P2-3 against (d): truly empty provider answers keep their own bounded recovery (10B-4a); [] does not change it', async () => {
    const { result, calls } = await plan([EMPTY, EMPTY, stop('[]')], T46);
    assert.deepEqual(calls.map((x) => x.purpose), ['plan', 'plan_repair', 'plan_recovery']);
    assert.equal(result.failed, false);
    assert.deepEqual(result.commands, []);
    const none = await plan([EMPTY, EMPTY, EMPTY], T46);
    assert.equal(none.result.failed, true);
    assert.equal(none.calls.length, 3);
});

test('.180 P2-3 host: three Mage turns answered [] are three ordinary conversation turns – no planner_not_executed, no GO, no booked step', async () => {
    const g = await mage();
    const before = g.state().scene.at;
    for (const text of [T46, T47, T48]) {
        g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
        const answers = text === T46 ? [stop('[]')] : [stop(PROSE), stop('[]')];
        const r = await prepareGenerationAsync(g.chat, pcontent, { type: 'normal', settings: { planner: true }, llm: async () => answers.shift() ?? null });
        assert.equal(r.action, 'context', text);
        const last = rec(g.chat.at(-1));
        assert.equal(last.interp.failed, false, text);
        assert.notEqual(last.continuation?.kind, 'planner_not_executed', text);
        assert.ok(!last.events.some((e) => e.t === 'cmd.resolved' || e.t === 'scene.moved' || e.t === 'travel.started'), text);
        g.chat.push({ mes: 'They agree.', is_user: false, is_system: false, extra: {} });
    }
    assert.equal(g.state().scene.at, before);
});

test('.180 P2-3: the planner repair message names the form; the interpreter keeps its own', async () => {
    assert.equal(typeof planner.planRepairMessage, 'function');
    assert.match(planner.planRepairMessage(['report is not a JSON object']), /^Your answer was not valid: report is not a JSON object\. Answer again with only the corrected JSON object: one JSON object \{"commands":\[\.\.\.\]\}/);
});

test('.180 P2-3 failsoft: invalid planner answers (the ST smoke probe "{bad", a non-empty bare array) stay a visible nonexecution without booking', async () => {
    for (const bad of ['{bad', '[{"seq":1,"type":"go","to":{"new":"the warren mouth"},"quote":"I go in first now"}]']) {
        const g = await mage();
        const before = g.state();
        g.chat.push({ mes: T48, is_user: true, is_system: false, extra: {} });
        const r = await prepareGenerationAsync(g.chat, pcontent, { type: 'normal', settings: { planner: true }, llm: async () => stop(bad) });
        assert.equal(r.action, 'not_executed', bad);
        assert.deepEqual(rec(g.chat.at(-1)).events, [], bad);
        assert.equal(rec(g.chat.at(-1)).continuation?.kind, 'planner_not_executed', bad);
        assert.deepEqual(g.state().rng, before.rng, bad);
        assert.equal(g.state().scene.at, before.scene.at, bad);
    }
});
