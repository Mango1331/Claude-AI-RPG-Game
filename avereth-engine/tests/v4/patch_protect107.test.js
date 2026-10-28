// Build .107 protection patch (technical audit of .106): a forced relocation and a known person's arrival need a
// narrated, actual event of the reply; a rejected name expansion never blocks a present person's own record; the
// persistence block belongs to its chat; three confirmed price misreadings; a NOT EXECUTED notice names its cause.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { amountErrors } from '../../src/v4/interpret.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec } from '../../src/host.js';
import { campaign } from './patch8_lib.js';

const content = await loadProductContent();
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/batch2_trade_people.json', import.meta.url)));
// Blackwater Landing, no GO authorised this turn; Corr (npc.corr) present; the Ashbridge gate guard elsewhere
const base = () => structuredClone(fixtures['005_121'].state);
const world = (deltas, prose, state = base()) => applyWorld(state, content, { scene: 'here', expected: {}, deltas }, { prose, msg: 500 });
const moved = (r) => r.events.filter((e) => e.t === 'scene.moved').map((e) => e.d.at);
const entered = (r) => r.events.filter((e) => e.t === 'scene.entered').map((e) => e.d.id);
const rules = (r) => r.rejected.map((x) => `${x.seq}:${x.rule}`);
const GAP = 'loc.the_gap_in_the_rocks';
const GUARD = 'npc.npcgate_guard';
const arrive = (forced_by) => ({ seq: 1, type: 'arrive', at: GAP, with: null, forced_by });

// ------------------------------------------------------------------------------------------------ 1. forced_by
test('protect107: a forced_by label the reply never narrates moves nobody', () => {
    const r = world([arrive('Corr marched him to the gap')], 'Corr set the pen down and priced the tooth.');
    assert.deepEqual(moved(r), []);
    assert.deepEqual(rules(r), ['1:no_go']);
});

for (const [name, prose, quote] of [
    ['a threat in dialogue', '"Move, or I\'ll drag you to the gap myself," the boatman growled.', 'drag you to the gap myself'],
    ['a negated move', 'The current did not carry him downstream; he clung to the post until it passed.', 'The current did not carry him downstream'],
    ['a planned move', 'The smugglers would haul him to the gap in the rocks at nightfall.', 'The smugglers would haul him to the gap in the rocks'],
    ['a memory', 'He remembered how the flood had swept him to the gap in the rocks years ago.', 'how the flood had swept him to the gap in the rocks'],
]) test(`protect107: forced_by quoting ${name} is no relocation`, () => {
    const r = world([arrive(quote)], prose);
    assert.deepEqual(moved(r), [], name);
    assert.deepEqual(rules(r), ['1:no_go']);
});

for (const [name, prose, quote] of [
    ['a flood', 'A wall of brown water tore him from the landing and swept him downstream to the gap in the rocks.', 'swept him downstream to the gap in the rocks'],
    ['an abduction', 'Two men seized him from behind and dragged him through the reeds to the gap in the rocks.', 'Two men seized him from behind and dragged him'],
]) test(`protect107: a narrated involuntary relocation (${name}) still moves him`, () => {
    const r = world([arrive(quote)], prose);
    assert.deepEqual(moved(r), [GAP], name);
    assert.deepEqual(rules(r), []);
});

test('protect107: a leading clause of its own does not taint the narrated relocation; a paraphrase is no quote', () => {
    const prose = 'Before he could react, two men seized him and dragged him through the reeds to the gap in the rocks.';
    assert.deepEqual(moved(world([arrive('two men seized him and dragged him through the reeds')], prose)), [GAP]);
    const paraphrase = world([arrive('he was abducted to the gap by two men')], prose);
    assert.deepEqual(moved(paraphrase), [], 'the relocation stands on the reply\'s own words only');
    assert.deepEqual(rules(paraphrase), ['1:no_go']);
});

// ------------------------------------------------------------------------------------------------ 2. known people
const enter = (evidence, seq = 1) => ({ seq, type: 'enter', who: GUARD, evidence });

test('protect107: enter of a known person from elsewhere without narrated evidence is no arrival', () => {
    const r = world([enter(null)], 'Corr set the pen down and priced the tooth.');
    assert.deepEqual(entered(r), []);
    assert.deepEqual(rules(r), ['1:npc_presence']);
});

for (const [name, prose, quote] of [
    ['a mere mention', 'He thought of the gate guard back in Ashbridge, waving people through.', 'He thought of the gate guard back in Ashbridge'],
    ['a denied arrival', 'The gate guard from Ashbridge was nowhere to be seen on the landing.', 'The gate guard from Ashbridge was nowhere to be seen'],
    ['hearsay', 'Corr said the gate guard from Ashbridge would come down to the landing tomorrow.', 'the gate guard from Ashbridge would come down to the landing'],
]) test(`protect107: enter evidenced only by ${name} is no arrival`, () => {
    const r = world([enter(quote)], prose);
    assert.deepEqual(entered(r), [], name);
    assert.deepEqual(rules(r), ['1:npc_presence']);
});

for (const [name, prose, quote] of [
    ['an arrival', 'The gate guard from Ashbridge pushed through the crowd and stopped beside him.', 'The gate guard from Ashbridge pushed through the crowd'],
    ['speech at the place, without the word enter', '"Fancy meeting you here," said the gate guard, leaning on the rail beside the ledger.', 'said the gate guard, leaning on the rail'],
]) test(`protect107: a known person travelling on their own arrives when the reply narrates it (${name})`, () => {
    const r = world([enter(quote)], prose);
    assert.deepEqual(entered(r), [GUARD], name);
    assert.deepEqual(rules(r), []);
});

test('protect107: an extractor that leaves enter.evidence out costs no legitimate return the reply narrates', () => {
    const r = world([enter(null)], 'Corr glanced up. The gate guard from Ashbridge came down the landing steps and nodded to him.');
    assert.deepEqual(entered(r), [GUARD]);
    assert.deepEqual(rules(r), []);
});

test('protect107: position and aware describe present people only; they bring no absent known person', () => {
    const prose = 'The gate guard from Ashbridge pushed through the crowd and stopped beside him.';
    const r = world([
        { seq: 1, type: 'position', who: GUARD, band: 'SHORT', cover: null, cluster: null, scope: null, evidence: null },
        { seq: 2, type: 'aware', who: GUARD, level: 'aware', scope: null, evidence: null },
        { seq: 3, type: 'position', who: 'npc.corr', band: 'ENGAGED', cover: null, cluster: null, scope: null, evidence: null },
    ], prose);
    assert.deepEqual(entered(r), []);
    assert.deepEqual(rules(r), ['1:npc_presence', '2:npc_presence']);
    assert.ok(r.events.some((e) => e.t === 'scene.positioned' || JSON.stringify(e).includes('"npc.corr"')), 'a present person is still placed');
});

test('protect107: creatures keep their presence rules (a returning beast is no person continuity case)', () => {
    const r = world([{ seq: 1, type: 'enter', who: 'mon.cat', evidence: null }], 'The cat slunk back onto the landing.');
    assert.deepEqual(entered(r), ['mon.cat']);
});

const reintroduce = { seq: 1, type: 'person.new', ref: GUARD, name: null, role: 'guard', desc: ['guard'], armed: null, present: true, relevant: true, threat: false, at: null, band: 'SHORT', distinct_from: null };
const fond = { seq: 3, type: 'attitude', who: GUARD, delta: 1, why: 'glad to see a familiar face' };

test('protect107: after a refused reintroduction an evidenced enter is still possible, an unevidenced one is not', () => {
    const prose = 'The gate guard from Ashbridge pushed through the crowd and stopped beside him.';
    const ok = world([reintroduce, enter('The gate guard from Ashbridge pushed through the crowd', 2), fond], prose);
    assert.deepEqual(entered(ok), [GUARD]);
    assert.deepEqual(rules(ok), ['1:npc_continuity']);
    const bypass = world([reintroduce, enter(null, 2), fond], 'Corr set the pen down and priced the tooth.');
    assert.deepEqual(entered(bypass), []);
    assert.deepEqual(rules(bypass), ['1:npc_continuity', '2:npc_presence', '3:npc_continuity']);
});

// ------------------------------------------------------------------------------------------------ 3. identity
test('protect107: a refused name expansion of a present person blocks only the new reference, never the person', () => {
    const expansion = { seq: 1, type: 'person.new', ref: 'corr_full', name: 'Corr Hallam', role: 'guild clerk', desc: ['clerk'], armed: null, present: true, relevant: true, threat: false, at: null, band: 'SHORT', distinct_from: null };
    const r = world([
        expansion,
        { seq: 2, type: 'attitude', who: 'npc.corr', delta: 1, why: 'Alaric was honest about the hide' },
        { seq: 3, type: 'memory', text: 'Corr re-priced the tooth and hide item by item for Alaric', who: ['npc.corr'], imp: 6 },
        { seq: 4, type: 'attitude', who: 'Corr Hallam', delta: 1, why: 'claimed by the refused name' },
    ], 'Corr set the pen down and priced the tooth, item by item.');
    assert.deepEqual(rules(r), ['1:npc_identity', '4:npc_continuity']);
    assert.ok(r.events.some((e) => e.t === 'memory.recorded'), 'the present person keeps the memory of this reply');
});

test('protect107: a refused reintroduction of an absent person still blocks claims that treat them as here', () => {
    const r = world([reintroduce, fond], 'Corr set the pen down and priced the tooth.');
    assert.deepEqual(rules(r), ['1:npc_continuity', '3:npc_continuity']);
});

// ------------------------------------------------------------------------------------------------ 4. persistence block
test('protect107: a persistence block stays with its chat (A fails -> B unaffected -> A reloaded from disk)', async () => {
    const g = await campaign(content);
    const A0 = structuredClone(g.chat);
    let chatId = 'A', fail = true, initialized, calls = 0;
    const disk = { A: structuredClone(A0) };
    const c = {
        chat: g.chat, characters: [{ name: 'test', avatar: 'test.png' }], characterId: 0, extensionSettings: {}, getCurrentChatId: () => chatId, getRequestHeaders: () => ({}),
        eventTypes: { MESSAGE_RECEIVED: 'received', GENERATION_ENDED: 'ended', CHAT_COMPLETION_SETTINGS_READY: 'ready', GENERATION_STOPPED: 'stop', MESSAGE_EDITED: 'edited', CHAT_CHANGED: 'chat', MESSAGE_DELETED: 'deleted', MESSAGE_SWIPED: 'swiped' },
        eventSource: { on(type) { if (type === 'swiped') initialized(); } },
        saveChat: async () => { if (fail) throw Error('save failed'); disk[chatId] = structuredClone(c.chat); },
        saveSettingsDebounced() {}, setExtensionPrompt() {}, addOneMessage() {},
        generateRaw: async () => { calls++; return '{bad'; },
    };
    // SillyTavern 1.19 keeps ONE chat array and refills it in place when the chat changes
    const open = (id, messages) => { chatId = id; c.chat.splice(0, c.chat.length, ...structuredClone(messages)); };
    const send = async (text) => { c.chat.push({ mes: text, is_user: true, extra: {} }); await c.saveChat().catch(() => {}); await globalThis.averethInterceptor([], 8000, () => {}, 'normal'); };
    const keys = ['fetch', 'document', 'SillyTavern', 'toastr', 'averethInterceptor'], previous = Object.fromEntries(keys.map((k) => [k, globalThis[k]]));
    try {
        globalThis.fetch = async (url, options) => String(url).startsWith('file:')
            ? { ok: true, json: async () => JSON.parse(await readFile(url, 'utf8')) }
            : { ok: true, json: async () => [{}, ...structuredClone(disk[JSON.parse(options.body).file_name] || [])] };
        globalThis.document = { getElementById: () => null, querySelector: () => null };
        globalThis.SillyTavern = { getContext: () => c };
        globalThis.toastr = { error() {}, warning() {} };
        const ready = new Promise((r) => { initialized = r; });
        await import('../../index.js?protect107-chat-block');
        await ready;
        await send('I sell the pelts.');
        const failedInA = calls;
        assert.ok(failedInA > 0, 'chat A planned once; its NOT EXECUTED record could not be saved');
        fail = false;
        open('B', A0);
        await send('I wait by the road.');
        assert.ok(calls > failedInA, 'the block of chat A never stops chat B');
        const inB = calls;
        open('A', disk.A); // A reloaded from disk: its unsaved records are gone from memory too
        await send('I look around.');
        assert.ok(calls > inB, 'chat A, now exactly its disk state, plans again');
    } finally { for (const key of keys) globalThis[key] = previous[key]; }
});

// ------------------------------------------------------------------------------------------------ 5. prices
const cur = content.rules.currency;
const held = { objects: [{ id: 'obj.pelts', qty: 4 }, { id: 'obj.fangs', qty: 9 }, { id: 'obj.sword', qty: 1 }] };
const price = (type, c) => amountErrors([{ seq: 1, type, ...c }], cur, held);

test('protect107: the three confirmed price misreadings', () => {
    assert.deepEqual(price('sell', { object: 'obj.sword', min_cp: 50, quote: 'five silver and not a copper less' }), []);
    assert.deepEqual(price('buy', { qty: 1, max_cp: 15, quote: 'a room at one silver five a night' }), []);
    assert.deepEqual(price('sell', { object: 'obj.pelts', min_cp: 20, quote: 'the pelts for two silver a fair deal' }), []);
});

test('protect107: price controls keep their meaning', () => {
    assert.deepEqual(price('sell', { object: 'obj.pelts', min_cp: 8, quote: 'two copper a pelt' }), []);
    assert.equal(price('sell', { object: 'obj.pelts', min_cp: 2, quote: 'two copper a pelt' }).length, 1);
    assert.deepEqual(price('sell', { object: 'obj.fangs', min_cp: 9, quote: 'a copper apiece for the fangs' }), []);
    assert.match(price('sell', { object: 'obj.fangs', min_cp: 9, quote: 'two copper a pelt and a copper apiece for the fangs' })[0], /ambiguous/);
    assert.deepEqual(price('buy', { max_cp: 2, quote: 'a healing potion at two copper each' }), [], 'one unit stays a normal purchase');
    assert.equal(price('sell', { object: 'obj.sword', min_cp: 40, quote: 'five silver and not a copper less' }).length, 1, 'the amount itself is still checked');
});

test('protect107: a unit-rate mismatch without qty asks for the total and the quantity, never asserts one unit', () => {
    const [e] = price('buy', { max_cp: 6, quote: 'three torches at two copper each' });
    assert.ok(e, 'the mismatch is still reported to the one repair');
    assert.doesNotMatch(e, /for qty 1\b/);
    assert.match(e, /TOTAL/);
    assert.match(e, /set qty/);
    assert.deepEqual(price('buy', { qty: 3, max_cp: 6, quote: 'three torches at two copper each' }), []);
});

// ------------------------------------------------------------------------------------------------ 6. NOT EXECUTED
test('protect107: NOT EXECUTED names the cause the planner validation actually found, and nothing it did not', async () => {
    const g = await campaign(content);
    g.chat.push({ mes: 'I wait.', is_user: true, extra: {} });
    const plan = JSON.stringify({ commands: [{ seq: 1, type: 'activity', kind: 'wait', quote: 'I juggle three apples', what: null, minutes: null, until: null, learn: null, teacher: null, tags: null, aspects: null, material: null }] });
    const r = await prepareGenerationAsync(g.chat, content, { llm: async () => plan, settings: { planner: true } });
    assert.equal(r.action, 'not_executed');
    assert.match(r.notice, /NOT EXECUTED/);
    assert.match(r.notice, /could not be matched to the exact words/);
    assert.deepEqual(rec(g.chat.at(-1)).events, []);
    const h = await campaign(content);
    h.chat.push({ mes: 'I wait.', is_user: true, extra: {} });
    const bad = await prepareGenerationAsync(h.chat, content, { llm: async () => '{bad', settings: { planner: true } });
    assert.equal(bad.action, 'not_executed');
    assert.doesNotMatch(bad.notice, /price|exact words|target/, 'an unparseable answer gets no invented cause');
});
