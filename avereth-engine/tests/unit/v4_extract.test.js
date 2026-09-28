// Runtime V4: the world-delta extractor (src/v4/extract.js, content/deltas.json; D2 = A). Prompt contract, schema,
// parsing (valid / incomplete / invalid) and the one repair.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deltaSchema, extractorSystem, extractorRequest, parseExtraction, FORMAT_RULES, EXTRACT_PLAIN_FORMAT } from '../../src/v4/extract.js';
import { strictProblems } from '../../src/v4/schema.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const vocab = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'deltas.json'), 'utf8'));
const ids = { places: ['loc.redmarch', 'loc.redmarch.guild_hall'], quests: ['quest.herb_run_marshmint'], objects: ['obj.guild_plate'] };

test('the extractor prompt states every rule and every constraint the validator checks, and no <avereth> block', () => {
    const sys = extractorSystem(vocab);
    for (const r of vocab.rules) assert.ok(sys.includes(r), r.slice(0, 40));
    for (const r of FORMAT_RULES) assert.ok(sys.includes(r), r.slice(0, 40));
    for (const d of vocab.deltas) assert.ok(sys.includes(`- ${d.type} {`), d.type);
    assert.ok(!/<avereth>/.test(sys));
    const { messages } = extractorRequest(vocab, { catalog: 'CATALOG\nHERE: x', actions: '1. GOES — to the Guild hall.', expectedKeys: { 1: 'go' }, reply: 'He walks in.' });
    assert.equal(messages.length, 2);
    assert.ok(messages[0].content.endsWith(EXTRACT_PLAIN_FORMAT));
    assert.match(messages[1].content, /PLAYER ACTIONS \(already booked\):\n1\. GOES/);
    assert.match(messages[1].content, /"1" \(go: did he arrive, and where\)/);
});

test('the schema is strict (every property required, no extra keys) and knows the catalog ids', () => {
    const schema = deltaSchema(vocab, ids, { 1: 'go', 2: 'buy' });
    assert.deepEqual(strictProblems(schema), []);
    const ok = parseExtraction(JSON.stringify({
        expected: { 1: { arrived: true, at: 'loc.redmarch.guild_hall' }, 2: { priced: true, taken_anyway: false } },
        deltas: [
            { seq: 1, type: 'time', minutes: 20 },
            { seq: 2, type: 'arrive', at: 'loc.redmarch.guild_hall' },
            { seq: 3, type: 'offer', seller: 'innkeeper', lines: [{ what: 'room', kind: 'service', service: 'lodging', qty: 1, price_cp: 4 }] },
        ],
    }), vocab, ids, { 1: 'go', 2: 'buy' });
    assert.equal(ok.valid, true, ok.errors.join('; '));
    assert.equal(ok.complete, true);
});

test('a missing expected key makes an answer incomplete, not invalid; a wrong id makes it invalid, naming the field', () => {
    const incomplete = parseExtraction('{"expected": {}, "deltas": [{"seq": 1, "type": "time", "minutes": 5}]}', vocab, ids, { 1: 'go' });
    assert.equal(incomplete.valid, true);
    assert.equal(incomplete.complete, false);
    assert.deepEqual(incomplete.missing, ['1']);
    assert.match(incomplete.errors.join('; '), /expected key "1" not answered/);
    const wrongId = parseExtraction('{"expected": {}, "deltas": [{"seq": 1, "type": "arrive", "at": "loc.redmarch.guildhall"}]}', vocab, ids, {});
    assert.equal(wrongId.valid, false);
    assert.match(wrongId.errors.join('; '), /deltas\[0\]/);
    const prose = parseExtraction('Sure! Here are the deltas.', vocab, ids, {});
    assert.equal(prose.valid, false);
    assert.equal(prose.value, null);
});

test('the one repair carries the invalid answer and the errors', () => {
    const { messages } = extractorRequest(vocab, { catalog: 'CATALOG', actions: 'none', expectedKeys: {}, reply: 'x' }, { previous: '{"deltas": 3}', errors: ['$.deltas: not an array'] });
    assert.equal(messages.length, 4);
    assert.equal(messages[2].role, 'assistant');
    assert.equal(messages[2].content, '{"deltas": 3}');
    assert.match(messages[3].content, /not valid: \$\.deltas: not an array/);
});

test('delta-0.2 keeps the P0 lessons: the payout and the fee are facts only, buy/pay ask for taken_anyway', () => {
    assert.ok(vocab.rules.some((r) => /registration fee are the engine's; report the story's words about them only as facts/.test(r)));
    assert.ok(vocab.rules.some((r) => /A price someone merely mentions is a fact/.test(r)));
    assert.deepEqual(Object.keys(vocab.expected.buy.shape), ['priced', 'taken_anyway']);
    assert.match(vocab.deltas.find((d) => d.type === 'coin.gift').summary, /never the Guild's payout/);
    assert.match(vocab.deltas.find((d) => d.type === 'object.new').summary, /only after his TAKES or GATHERS/);
});

test('delta-0.4: the extractor reads the player\'s message; his own words and gestures are never overreach, a booking the engine did not make still is; a name he gives is learned (live run 28.09.)', () => {
    const player = '*i sign the card*';
    const { messages } = extractorRequest(vocab, { catalog: 'CATALOG', actions: 'NOTHING TO BOOK — Alaric decides nothing the engine resolves.', player, expectedKeys: {}, reply: 'He signs the card.' });
    const user = messages[1].content;
    assert.match(user, /PLAYER MESSAGE \(what the player wrote Alaric saying and doing\):\n\*i sign the card\*\n\nPLAYER ACTIONS \(already booked\):\nNOTHING TO BOOK/);
    const sys = messages[0].content;
    assert.match(sys, /neither PLAYER ACTIONS nor the PLAYER MESSAGE contain, report it only as overreach/);
    assert.match(sys, /What the PLAYER MESSAGE has him say or do himself \(his words, a gesture, signing, sitting down\) is his own, never overreach/);
    assert.match(sys, /a payment, purchase, pick-up, acceptance, turn-in, registration or journey that the reply shows, that PLAYER ACTIONS do not book and the CATALOG does not show as done already, is overreach, even when the PLAYER MESSAGE has him do it/);
    assert.match(sys, /A name Alaric gives \(in the PLAYER MESSAGE or the reply\) is learned by those the reply shows hearing it: learn \{"who": <person>, "s": "pc", "p": "name"/);
    // no message (a caller without one): no empty section
    const none = extractorRequest(vocab, { catalog: 'CATALOG', actions: 'none', expectedKeys: {}, reply: 'x' }).messages[1].content;
    assert.doesNotMatch(none, /PLAYER MESSAGE/);
    // the repair keeps it
    const rep = extractorRequest(vocab, { catalog: 'CATALOG', actions: 'none', player, expectedKeys: {}, reply: 'x' }, { previous: '{}', errors: ['$.deltas: missing'] });
    assert.match(rep.messages[1].content, /PLAYER MESSAGE[^]*\*i sign the card\*/);
});
