// Hotfix .137 (natural batch 20261031-125921Z, all three classes stopped at turn 1 with CAMPAIGN START HIDDEN): SillyTavern
// 1.19 keeps a greeting raw ({{user}}, {{pick::…}}) until it writes the resolved text into chat[0].mes – when message 0 is
// rendered (script.js messageFormatting) and at the first Generate (`chat[0].mes = substituteParams(chat[0].mes)`, before
// the generate interceptor). Rebuilding an unplayed chat from the card (createOrEditCharacter, the runner's chat rename)
// announces the greeting (MESSAGE_RECEIVED 'first_message') before rendering it: the engine started the campaign on the
// raw text – hash 04f093fc, the start place from the seed (Ashbridge) as the {{pick}} line names none – while the player
// saw Alderwatch. The host now resolves the greeting with SillyTavern's own substituteParams right before the start, so the
// record holds the text SillyTavern keeps and the place it shows. These tests drive index.js in SillyTavern's order (the
// Generate step stands for both writers); tools/st_live/run_greeting.mjs checks it in a real SillyTavern.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { host, GLOBALS } from './host_lib.js';
import { rec, hasCampaign, hasStoredCampaign, foldChat, messageEvents } from '../../src/host.js';
import { campaignSupport } from '../../src/v4/runtime.js';
import { hash32 } from '../../src/util.js';

const content = await loadProductContent();
const ORIGINAL = fs.readFileSync(new URL('./fixtures/greeting_macros_b1259.txt', import.meta.url), 'utf8');
const PLACES = { 0: ['Alderwatch, Valedorn Crown', 'loc.alderwatch'], 1: ['Glassmere, Caelreth', 'loc.glassmere'], 2: ['Ashbridge, Duskreach', 'loc.ashbridge'] };
/** The test host's SillyTavern macro step for this greeting only (the real one is ST's substituteParams): {{user}} and a
 * {{pick::…}} whose choice ST seeds per chat – here given. */
const substitute = (pick, user = 'Alaric Red') => (text) => String(text).replace(/\{\{user\}\}/g, user)
    .replace(/\{\{pick::([^}]*)\}\}/g, (_, list) => list.split('::')[pick].trim());
const startOf = (chat) => rec(chat[0])?.events?.find((e) => e.t === 'campaign.started')?.d;
async function guarded(fn) {
    const previous = Object.fromEntries(GLOBALS.map((k) => [k, globalThis[k]]));
    try { await fn(); } finally { for (const k of GLOBALS) globalThis[k] = previous[k]; }
}
/** SillyTavern's order: a new chat with the raw greeting, MESSAGE_RECEIVED(0, 'first_message'), then the player's first
 * message, Generate's own substitution of chat[0].mes, the interceptor. */
async function firstTurn(tag, { greeting = ORIGINAL, pick = 0, input = 'Warrior', st = substitute(pick) } = {}) {
    const chat = [{ name: 'Avereth', mes: greeting, is_user: false, is_system: false, extra: {} }];
    const h = await host(chat, tag, { substituteParams: st });
    for (const fn of h.handlers.received) await fn(0, 'first_message');
    const afterGreeting = { record: structuredClone(rec(chat[0]) || null), mes: chat[0].mes };
    chat.push({ name: 'Alaric Red', mes: input, is_user: true, is_system: false, extra: {} });
    chat[0].mes = st(chat[0].mes); // script.js Generate
    await globalThis.averethInterceptor([], 8000, () => { h.calls.aborted++; }, 'normal');
    return { chat, ...h, afterGreeting };
}

for (const [pick, [line, place]] of Object.entries(PLACES)) {
    test(`hotfix .137: the original macro greeting with {{pick}} → ${line}: one valid start record on the text ST keeps, at the place it shows; the class choice is played`, async () => {
        await guarded(async () => {
            const { chat, calls, afterGreeting } = await firstTurn(`pick-${pick}`, { pick: Number(pick) });
            const shown = substitute(Number(pick))(ORIGINAL);
            assert.ok(shown.includes(`outside ${line}\``));
            assert.equal(afterGreeting.mes, shown, 'resolved before the start, as ST shows it');
            assert.equal(afterGreeting.record.text_hash, hash32(shown));
            assert.notEqual(afterGreeting.record.text_hash, '04f093fc', 'not the raw card text');
            assert.equal(chat[0].mes, shown);
            assert.equal(rec(chat[0]).events.filter((e) => e.t === 'campaign.started').length, 1, 'exactly one start');
            assert.deepEqual(rec(chat[0]), afterGreeting.record, 'the first turn starts nothing again');
            assert.equal(hasCampaign(chat), true);
            assert.equal(startOf(chat).location, place);
            assert.equal(campaignSupport(chat), null);
            // the class choice is answered by the System panel (the narrator's generation is stopped for it, on any build)
            assert.deepEqual([calls.errors, calls.warnings], [[], []]);
            assert.ok(messageEvents(chat[1]).length > 0, 'the class choice is booked on the player message');
            const state = foldChat(chat).state;
            assert.equal(state.entities.pc.sheet.class, 'warrior');
            assert.equal(state.scene.location, place);
        });
    });
}

test('hotfix .137: a static greeting (no macro) starts exactly as before', async () => {
    await guarded(async () => {
        const fixed = substitute(1)(ORIGINAL);
        const { chat, calls, afterGreeting } = await firstTurn('static', { greeting: fixed, st: (t) => t });
        assert.equal(afterGreeting.record.text_hash, hash32(fixed));
        assert.equal(startOf(chat).location, 'loc.glassmere');
        assert.deepEqual(calls.errors, []);
        assert.equal(foldChat(chat).state.entities.pc.sheet.class, 'warrior');
    });
});

test('hotfix .137: {{user}} alone (no place macro) and a host without substituteParams', async () => {
    await guarded(async () => {
        const user = ORIGINAL.replace(/\{\{pick::[^}]*\}\}/, 'Glassmere, Caelreth');
        const a = await firstTurn('user-only', { greeting: user });
        assert.equal(rec(a.chat[0]).text_hash, hash32(user.replace(/\{\{user\}\}/g, 'Alaric Red')));
        assert.equal(startOf(a.chat).location, 'loc.glassmere');
        assert.deepEqual(a.calls.errors, []);
    });
    await guarded(async () => {
        // a host without the macro step leaves the text as it is: the start stays on that text and is not hidden
        const fixed = substitute(0)(ORIGINAL);
        const chat = [{ mes: fixed, is_user: false, is_system: false, extra: {} }];
        const h = await host(chat, 'no-substitute');
        for (const fn of h.handlers.received) await fn(0, 'first_message');
        assert.equal(startOf(chat).location, 'loc.alderwatch');
        assert.equal(hasCampaign(chat), true);
    });
});

test('hotfix .137: save/reload and a swipe of the first reply book the campaign start and the class once', async () => {
    await guarded(async () => {
        const { chat } = await firstTurn('reload', { pick: 2 });
        const reloaded = JSON.parse(JSON.stringify(chat));
        assert.deepEqual(foldChat(reloaded).state, foldChat(chat).state);
        assert.equal(reloaded.flatMap((m) => messageEvents(m)).filter((e) => e.t === 'campaign.started').length, 1);
        // the player's message is answered by a System panel; a regenerate/swipe of that turn reuses its record
        const before = structuredClone(rec(chat[1]));
        await globalThis.averethInterceptor([], 8000, () => {}, 'swipe');
        assert.deepEqual(rec(chat[1]), before);
        assert.equal(rec(chat[0]).events.filter((e) => e.t === 'campaign.started').length, 1);
    });
});

test('hotfix .137: the protection stays: a later real change of the greeting without the edit is hidden; an edit SillyTavern reports is read; no second start', async () => {
    await guarded(async () => {
        const { chat, calls, handlers } = await firstTurn('later-change', { pick: 0 });
        const record = structuredClone(rec(chat[0]));
        chat[0].mes = `${chat[0].mes}\n*Someone rewrote this line outside the engine.*`;
        chat.push({ mes: 'Heavy Slash + Guard', is_user: true, is_system: false, extra: {} });
        const aborted = calls.aborted;
        await globalThis.averethInterceptor([], 8000, () => { calls.aborted++; }, 'normal');
        assert.equal(calls.aborted, aborted + 1);
        assert.match(calls.errors.at(-1), /^CAMPAIGN START HIDDEN/);
        assert.deepEqual(rec(chat[0]), record, 'not resolved again, not restarted');
        assert.equal(hasStoredCampaign(chat), true);
        // the same change made through SillyTavern's edit (MESSAGE_EDITED) is read and play goes on
        for (const fn of handlers.edited) await fn(0);
        assert.equal(hasCampaign(chat), true);
        assert.equal(rec(chat[0]).events.find((e) => e.t === 'campaign.started').d.seed, record.events.find((e) => e.t === 'campaign.started').d.seed);
    });
});

test('hotfix .137: a stored start record is never re-resolved or replaced, however its greeting reads now', async () => {
    await guarded(async () => {
        // the batch's own broken chat (record on the raw text, ST's resolved text shown): refused as hidden, not repaired
        const chat = [{ mes: ORIGINAL, is_user: false, is_system: false, extra: {} }];
        const h = await host(chat, 'broken-batch', { substituteParams: substitute(0) });
        const { ensureCampaign } = await import('../../src/host.js');
        ensureCampaign(chat, content, { seed: 466297664, runtime: 'v4', planner: true });
        assert.equal(rec(chat[0]).text_hash, '04f093fc');
        const record = structuredClone(rec(chat[0]));
        chat.push({ mes: 'Warrior', is_user: true, is_system: false, extra: {} });
        chat[0].mes = substitute(0)(chat[0].mes);
        await globalThis.averethInterceptor([], 8000, () => { h.calls.aborted++; }, 'normal');
        assert.equal(h.calls.aborted, 1);
        assert.match(h.calls.errors[0], /^CAMPAIGN START HIDDEN/);
        assert.deepEqual(rec(chat[0]), record);
    });
});

// ------------------------------------------------------------------------------------------------ runner start check
import { startRecordProblem } from '../../tools/st_live/live/evaluator.mjs';
import { ensureCampaign as startOn } from '../../src/host.js';
const seeded = (text, seed) => { const chat = [{ mes: text, is_user: false, is_system: false, extra: {} }]; startOn(chat, content, { seed, runtime: 'v4', planner: true }); return chat; };

test('hotfix .137 runner: a hidden or inconsistent start record is found before the first player turn; a consistent one passes', () => {
    // the batch: started on the raw card text with its seed (466297664 % 3 → Ashbridge), then ST resolved the greeting
    const batch = seeded(ORIGINAL, 466297664);
    assert.equal(rec(batch[0]).events[0].d.location, 'loc.ashbridge');
    assert.match(startRecordProblem(batch, content), /holds the greeting with the unresolved SillyTavern macro \{\{user\}\}/, 'found before the first turn, while the raw record is still readable');
    batch[0].mes = substitute(0)(batch[0].mes);
    assert.match(startRecordProblem(batch, content), /campaign start record is hidden: its text hash 04f093fc/);
    // readable, but at another place than the greeting shows (a record written to match the text afterwards)
    const moved = seeded(substitute(0)(ORIGINAL), 1);
    rec(moved[0]).events[0].d.location = 'loc.ashbridge';
    assert.match(startRecordProblem(moved, content), /the greeting shows loc\.alderwatch, the campaign started at loc\.ashbridge/);
    const twice = seeded(substitute(1)(ORIGINAL), 1);
    rec(twice[0]).events.push(structuredClone(rec(twice[0]).events[0]));
    assert.match(startRecordProblem(twice, content), /holds 2 campaign starts/);
    for (const pick of [0, 1, 2]) assert.equal(startRecordProblem(seeded(substitute(pick)(ORIGINAL), 7), content), null, String(pick));
    assert.equal(startRecordProblem([{ mes: ORIGINAL, is_user: false, extra: {} }], content), null, 'no record yet: the engine starts with the first message');
    // the runner applies it before turn 1 and after the turn that started the campaign
    const runner = fs.readFileSync(new URL('../../tools/st_live/live/run_live.mjs', import.meta.url), 'utf8');
    assert.match(runner, /startRecordProblem\(await driver\.chat\(\), validationContent\)/);
    assert.match(runner, /campaign start before turn 1: \$\{problem\}/);
    assert.match(runner, /if \(turn === 1\) \{[\s\S]{0,300}startRecordProblem\(chat, validationContent\)/);
});
