// Runtime V4: the agency guard between interpreter and engine (src/v4/agency.js, docs/P0_BERICHT.md §5, plan §4.6).
// One test per error cluster of P0/S1, the measurement on the recorded answers of 27.09. and on the two held-out sets.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardCommands } from '../../src/v4/agency.js';
import { EXAMPLE_MESSAGES } from '../../src/v4/interpret.js';
import { loadScenes, guardContextFromScene } from '../../tools/p0/lib/interpreter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scenes = loadScenes();
const jsonl = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const ctx = (scene) => guardContextFromScene(scenes[scene]);
const kept = (text, cmds, scene) => guardCommands(text, cmds, ctx(scene)).kept.map((c) => c.type);
const why = (text, cmds, scene) => guardCommands(text, cmds, ctx(scene)).dropped.map((d) => d.rule);

test('purpose, not act: "I\'m here to register" at the gate books nothing; at the Guild desk it asks to register', () => {
    const t = 'Hello im Alaric and im here to register with the adventurer guild *i say smiling politely*';
    assert.deepEqual(kept(t, [{ seq: 1, type: 'guild.register', quote: 'im here to register with the adventurer guild' }], 'gate'), []);
    assert.deepEqual(why(t, [{ seq: 1, type: 'guild.register', quote: 'im here to register with the adventurer guild' }], 'gate'), ['purpose']);
    assert.deepEqual(kept('Hello im here to register', [{ seq: 1, type: 'guild.register', quote: 'Hello im here to register' }], 'hall_new'), ['guild.register']);
    assert.deepEqual(kept('Register me, please.', [{ seq: 1, type: 'guild.register', quote: 'Register me, please.' }], 'hall_new'), ['guild.register']);
    assert.deepEqual(kept('Register me, please?', [{ seq: 1, type: 'guild.register', quote: 'Register me, please?' }], 'hall_new'), ['guild.register'], 'a polite imperative is a request');
});

test('memory: "I came here from …" is no go, "I gave you …" is no give; a deed told in the past tense still counts', () => {
    assert.deepEqual(kept('I came here from the reedbeds this afternoon.', [{ seq: 1, type: 'go', to: { new: 'Grainmarket Row' }, quote: 'I came here from the reedbeds this afternoon.' }], 'street'), []);
    assert.deepEqual(kept('I gave you the heads an hour ago.', [{ seq: 1, type: 'give', object: 'obj.wolf_heads', qty: 3, to: 'npc.reeve_aldous', quote: 'I gave you the heads an hour ago.' }], 'village_reeve'), []);
    assert.deepEqual(kept('*I walked to the reedbeds and started gathering.*', [{ seq: 1, type: 'go', to: 'loc.redmarch.reedbeds', quote: 'I walked to the reedbeds' }], 'street'), ['go']);
    assert.deepEqual(kept('*I took the weasel contract and had the clerk log it under my name*', [{ seq: 1, type: 'quest.accept', quest: 'quest.weasel_fenwick', quote: 'I took the weasel contract and had the clerk log it under my name' }], 'hall_board'), ['quest.accept']);
});

test('another actor: the clerk taking the basket is no turn-in of Alaric\'s; quoted words of others commit nobody', () => {
    const t = '*the clerk takes the basket from me and marks the herb run complete*';
    assert.deepEqual(why(t, [{ seq: 1, type: 'quest.turn_in', quest: 'quest.herb_run_marshmint', quote: t.slice(1, -1) }], 'hall_turnin_ready'), ['npc_actor']);
    const s = '"I\'ll buy your pelts for twenty copper," *says the furrier*';
    assert.deepEqual(why(s, [{ seq: 1, type: 'sell', object: 'obj.wolf_pelts', qty: null, to: 'npc.furrier', min_cp: 20, quote: "I'll buy your pelts for twenty copper" }], 'market'), ['npc_speech']);
    // Alaric's own quoted words do commit him
    const own = '"Deal," *i say and slide four copper across*';
    assert.deepEqual(kept(own, [{ seq: 1, type: 'offer.accept', offer: 'offer.inn_services', lines: ['l1'], quote: 'Deal' }], 'inn_offer'), ['offer.accept']);
});

test('question: "Could I take …?" is no acceptance; a request to buy may be a question', () => {
    assert.deepEqual(why('Could I take the escort job too?', [{ seq: 1, type: 'quest.accept', quest: 'quest.millers_run_escort', quote: 'Could I take the escort job too?' }], 'hall_board'), ['question']);
    assert.deepEqual(kept('Can I get a room for the night?', [{ seq: 1, type: 'buy', what: 'a room', from: null, qty: null, max_cp: null, any_price: false, quote: 'Can I get a room for the night?' }], 'inn_no_offer'), ['buy']);
    // the question in one sentence does not touch the payment in another (real_v3_03)
    const t = '*i put the bow on my back and give him one silver waiting for my change back* Can you point me to the adventurer guild?';
    assert.deepEqual(kept(t, [{ seq: 1, type: 'pay', to: 'npc.gate_guard', amount_cp: 10, for: null, quote: 'give him one silver waiting for my change back' }], 'gate'), ['pay']);
});

test('same message: "take the slip and register it" is one acceptance, never a turn-in of the contract just taken', () => {
    const t = '*i take the Millers Run Escort Quest and go to the front desk and register it*';
    const r = guardCommands(t, [
        { seq: 1, type: 'quest.accept', quest: 'quest.millers_run_escort', quote: 'i take the Millers Run Escort Quest' },
        { seq: 2, type: 'quest.turn_in', quest: 'quest.millers_run_escort', quote: 'go to the front desk and register it' },
    ], ctx('hall_board'));
    assert.deepEqual(r.kept.map((c) => c.type), ['quest.accept']);
    assert.deepEqual(r.dropped.map((d) => d.rule), ['same_message']);
});

test('state: leaving the dead rats where they are is no drop (he does not hold them); what he takes first he can hand on', () => {
    assert.deepEqual(why('*i leave the dead rats where they are*', [{ seq: 1, type: 'drop', object: 'obj.rat_corpses', qty: 5, quote: 'i leave the dead rats where they are' }], 'cellar_after'), ['not_held']);
    assert.deepEqual(kept('*i leave the heads on the floor*', [{ seq: 1, type: 'drop', object: 'obj.wolf_heads', qty: null, quote: 'i leave the heads on the floor' }], 'village_reeve'), ['drop']);
    const t = '*i get the corpse and drag it with up. I then leave it with him and go back to the guild to turn the quest in*';
    assert.deepEqual(kept(t, [
        { seq: 1, type: 'take', object: 'obj.vermin_corpse', qty: 1, quote: 'i get the corpse' },
        { seq: 2, type: 'give', object: 'obj.vermin_corpse', qty: 1, to: 'npc.maltster', quote: 'I then leave it with him' },
        { seq: 3, type: 'go', to: 'loc.redmarch.guild_hall', quote: 'go back to the guild' },
        { seq: 4, type: 'quest.turn_in', quest: 'quest.vermin_malthouse', quote: 'to turn the quest in' },
    ], 'malthouse_cellar'), ['take', 'give', 'go', 'quest.turn_in']);
    // coin is no object he holds: "give him one silver" stays a payment
    assert.deepEqual(kept('*i throw a silver coin to him*', [{ seq: 1, type: 'give', object: { new: 'silver coin' }, qty: 1, to: 'npc.stranger', quote: 'i throw a silver coin to him' }], 'river_stranger'), ['give']);
});

test('purpose with a trip: "carry it back to the guild to turn it in" stays a conditional turn-in; without the trip it is a need', () => {
    const t = '*i start carrying it all back to the guild to turn it in and the Quest with it*';
    assert.deepEqual(kept(t, [
        { seq: 1, type: 'take', object: 'obj.marshmint_pile', qty: null, quote: 'carrying it all' },
        { seq: 2, type: 'go', to: 'loc.redmarch.guild_hall', quote: 'back to the guild' },
        { seq: 3, type: 'quest.turn_in', quest: 'quest.herb_run_marshmint', quote: 'to turn it in and the Quest with it' },
    ], 'reedbeds_pile'), ['take', 'go', 'quest.turn_in']);
    const need = 'Proof *i say dryly and put them on the floor* ill need a signature so i can get my silver at the guild';
    assert.deepEqual(kept(need, [
        { seq: 1, type: 'drop', object: 'obj.wolf_heads', qty: 3, quote: 'put them on the floor' },
        { seq: 2, type: 'quest.turn_in', quest: 'quest.wolf_problem', quote: 'ill need a signature so i can get my silver at the guild' },
    ], 'village_reeve'), ['drop']);
});

test('plan and negation bind to the command\'s own verb: "Deal, I\'ll clear it tomorrow" accepts, "Tomorrow I\'ll take it" does not', () => {
    assert.deepEqual(kept("Deal. I'll clear your well tomorrow morning.", [{ seq: 1, type: 'quest.accept', quest: 'quest.old_well', quote: "Deal. I'll clear your well tomorrow morning." }], 'village_reeve'), ['quest.accept']);
    assert.deepEqual(why("Tomorrow I'll take the Fence Repair job.", [{ seq: 1, type: 'quest.accept', quest: 'quest.fence_repair', quote: "Tomorrow I'll take the Fence Repair job." }], 'hall_board'), ['plan']);
    const live = "thank you im sure we will get to a drink back at Ashwater but ill have to return today so lets get together next time *i say politely and then travel back to Ashwater*";
    assert.deepEqual(kept(live, [{ seq: 1, type: 'go', to: 'loc.ashbridge', quote: "ill have to return today so lets get together next time *i say politely and then travel back to Ashwater" }], 'street'), ['go'], 'an unrelated next-time phrase does not turn the later explicit current travel into a plan');
    assert.deepEqual(why("I'm not paying four copper for that.", [{ seq: 1, type: 'pay', to: 'npc.innkeeper', amount_cp: 4, for: null, quote: "I'm not paying four copper for that." }], 'inn_offer'), ['negation']);
    // the typo "i not and pay" (for "nod") is no negation of the payment
    const t = '*i not and pay the 2 Silver. I then put my hand on the Stone*';
    assert.deepEqual(kept(t, [{ seq: 1, type: 'offer.accept', offer: 'offer.registration', lines: null, quote: 'i not and pay the 2 Silver' }], 'hall_fee'), ['offer.accept']);
    assert.deepEqual(kept("I don't care what it costs, I'll take the room.", [{ seq: 1, type: 'buy', what: 'a room', from: null, qty: null, max_cp: null, any_price: true, quote: "I don't care what it costs, I'll take the room." }], 'inn_no_offer'), ['buy']);
});

test('c.6.6: a plan binds to the clause span of each act, not to the first or last verb of the quote', () => {
    const go = (quote, to = { new: 'Ashbridge' }) => [{ seq: 1, type: 'go', to, quote }];
    const one = "I'll walk to Ashbridge tomorrow.";
    assert.deepEqual(why(one, go(one), 'street'), ['plan'], 'one verb, future');
    const both = 'Tomorrow I\'ll walk to Ashbridge and then go to the market.';
    assert.deepEqual(why(both, go(both), 'street'), ['plan'], 'several verbs, all of them in the planned span');
    const nowThenLater = 'I travel back to Ashwater now, and next time I will return with friends.';
    assert.deepEqual(kept(nowThenLater, go(nowThenLater, { new: 'Ashwater' }), 'street'), ['go'], 'a current act and a later one: the current one stands');
    const laterThenNow = 'Next time we can share a drink, I will return someday. *I walk back to Ashwater*';
    assert.deepEqual(kept(laterThenNow, go(laterThenNow, { new: 'Ashwater' }), 'street'), ['go'], 'an earlier future phrase does not reach the current act');
    const live = "thank you im sure we will get to a drink back at Ashwater but ill have to return today so lets get together next time *i say politely and then travel back to Ashwater*";
    assert.deepEqual(kept(live, go(live, { new: 'Ashwater' }), 'street'), ['go'], 'the live message of 07.10., quoted in full');
    const lead = 'Next time, I will walk to Ashbridge.';
    assert.deepEqual(why(lead, go(lead), 'street'), ['plan'], 'a leading time phrase belongs to the act it opens');
    const neg = "I won't walk to Ashbridge tomorrow.";
    assert.deepEqual(why(neg, go(neg), 'street'), ['negation'], 'negation still binds');
    const negNow = "I don't wait for tomorrow, I walk to Ashbridge.";
    assert.deepEqual(kept(negNow, go(negNow), 'street'), ['go'], 'a negated wait is no negated walk, and tomorrow there names no act');
});

test('evidence is anchored, not matched letter for letter: an elided quote of a clear payment stands (live run 28.09.); invented or scattered words, and elisions over a question, a negation, a plan or someone else\'s words, do not', () => {
    const live = 'My name is Alaric Red *i say and push 2 silver over the counter as i pay the fee*';
    const pay = (quote) => [{ seq: 1, type: 'offer.accept', offer: 'offer.registration', lines: null, quote }];
    assert.deepEqual(kept(live, pay('i push 2 silver over the counter as i pay the fee'), 'hall_fee'), ['offer.accept'], 'the live case: "i say and push" quoted as "i push"');
    assert.deepEqual(why(live, pay('i hand her three gold crowns'), 'hall_fee'), ['no_evidence'], 'words the message does not have');
    assert.deepEqual(why('I pay attention to the man by the door, then I look over the counter and the list of fees', pay('i pay the fee'), 'hall_fee'), ['no_evidence'], 'words scattered over the message');
    assert.deepEqual(why('*i do not pay the fee yet*', pay('i pay the fee'), 'hall_fee'), ['negation']);
    assert.deepEqual(why('Could I pay the fee later?', pay('I pay the fee'), 'hall_fee'), ['question']);
    assert.deepEqual(why('Tomorrow I will probably pay the fee', pay('I will pay the fee'), 'hall_fee'), ['plan']);
    assert.deepEqual(why('"You pay the fee now, boy," says the clerk.', pay('you pay the fee boy'), 'hall_fee'), ['npc_speech']);
    assert.deepEqual(kept('Im here to Register', [{ seq: 1, type: 'guild.register', quote: "I'm here to register" }], 'hall_new'), ['guild.register'], '"Im" and "I\'m" are one word');
});

test('a member registers no second time: "*i sign the card*" read as guild.register after he paid is redundant (live run 28.09.); before he paid it goes to the engine', () => {
    const sign = [{ seq: 1, type: 'guild.register', quote: 'i sign the card' }];
    assert.deepEqual(why('*i sign the card*', sign, 'hall_plate'), ['redundant']);
    assert.deepEqual(kept('*i sign the card*', sign, 'hall_fee'), ['guild.register'], 'the fee still open: the engine keeps the registration pending');
    assert.deepEqual(kept('*i sign the card*', sign, 'hall_new'), ['guild.register']);
});

test('evidence: a commitment whose quote is not in the message is dropped; board.read is never dropped for reading', () => {
    assert.deepEqual(why('*i look around the hall*', [{ seq: 1, type: 'pay', to: 'npc.guild_clerk', amount_cp: 20, for: null, quote: 'i pay the fee' }], 'hall_fee'), ['no_evidence']);
    assert.deepEqual(kept('*i walk over to the Novice Rank Quest Board and look at the Quests there*', [{ seq: 1, type: 'board.read', rank: 'Novice', quote: 'i walk over to the Novice Rank Quest Board and look at the Quests there' }], 'hall_board'), ['board.read']);
    // a registration already under way: paying its fee completes it, a second guild.register is redundant
    const t = 'Alaric Red 18 Warrior no other Guild memberships elsewhere Valedorn yes first armed work *i say calmly and push 1 silver over the counter to pay the fee*';
    assert.deepEqual(kept(t, [
        { seq: 1, type: 'guild.register', quote: 'Alaric Red 18 Warrior no other Guild memberships elsewhere Valedorn yes first armed work' },
        { seq: 2, type: 'offer.accept', offer: 'offer.registration', lines: null, quote: 'i say calmly and push 1 silver over the counter to pay the fee' },
    ], 'hall_fee'), ['offer.accept']);
});

test('measured on the recorded answers of 27.09. (256 cases): 87/87 negatives clean, recall unchanged, no false commitment left', async () => {
    const file = path.join(ROOT, 'p0_out', 's1', 'results.json');
    if (!fs.existsSync(file)) return; // the P0 results are not in this checkout
    const { scoreCase, aggregate } = await import('../../tools/p0/lib/score.mjs');
    const corpus = new Map(jsonl('tests/eval/commands.jsonl').map((c) => [c.id, c]));
    const run = JSON.parse(fs.readFileSync(file, 'utf8'));
    const rec = run.records.filter((r) => r.predicted).map((r) => {
        const k = corpus.get(r.id);
        const g = guardCommands(k.text, r.predicted, ctx(k.scene));
        return { score: scoreCase(k, g.kept), predicted_count: g.kept.length };
    });
    const agg = aggregate(rec);
    assert.equal(agg.negative_precision_pct, 100);
    assert.equal(agg.recall_pct, 94.2, 'recall of the interpreter as measured: nothing right was dropped');
    assert.equal(agg.false_commitments, 0);
    assert.equal(agg.order_ok_pct, 100);
    assert.equal(agg.reference_ok_pct, 99.3);
});

test('held-out sets (written after the guard\'s first design; each changed it once, see the first-run numbers): tempting false commands caught, true commands kept', () => {
    const concrete = (v) => (typeof v === 'string' ? (v.match(/^\/(.*)\/[a-z]*$/s)?.[1].split('|')[0] ?? v) : v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, concrete(x)])) : v);
    const result = {};
    for (const f of ['tests/eval/commands_holdout.jsonl', 'tests/eval/commands_holdout2.jsonl']) {
        const r = { neg: 0, caught: 0, pos: 0, keptPos: 0 };
        for (const c of jsonl(f)) {
            if (!c.expect.length) {
                if (c.tags.includes('outside_guard')) continue;
                r.neg += 1;
                if (!guardCommands(c.text, c.tempting, ctx(c.scene)).kept.length) r.caught += 1;
            } else {
                const preds = c.expect.map((g, i) => ({ seq: i + 1, ...concrete(g.anyOf ? g.anyOf[0] : g), quote: c.quotes[i] }));
                for (const q of c.quotes) assert.ok(c.text.includes(q), `${c.id}: quote "${q}" is in the message`);
                r.pos += preds.length;
                r.keptPos += guardCommands(c.text, preds, ctx(c.scene)).kept.length;
            }
        }
        result[path.basename(f)] = r;
    }
    // first runs, before any change the sets prompted: 32/36 & 39/41 (set 1), 25/28 & 33/34 (set 2); docs/P0_BERICHT.md §10
    assert.deepEqual(result['commands_holdout.jsonl'], { neg: 36, caught: 35, pos: 41, keptPos: 40 });
    assert.deepEqual(result['commands_holdout2.jsonl'], { neg: 28, caught: 27, pos: 34, keptPos: 34 });
});

test('no prompt example of the interpreter is a case of the evaluation corpora (no contamination)', () => {
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    const cases = ['tests/eval/commands.jsonl', 'tests/eval/commands_holdout.jsonl', 'tests/eval/commands_holdout2.jsonl'].flatMap((f) => jsonl(f).map((c) => norm(c.text)));
    const seen = new Set(cases);
    assert.ok(EXAMPLE_MESSAGES.length >= 9);
    for (const e of EXAMPLE_MESSAGES) assert.ok(!seen.has(norm(e)), `example "${e}" is a corpus case`);
    const vocab = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'commands.json'), 'utf8'));
    for (const r of vocab.rules) for (const c of cases) assert.ok(!(c.length > 25 && norm(r).includes(c)), `rule text quotes the corpus case "${c}"`);
});
