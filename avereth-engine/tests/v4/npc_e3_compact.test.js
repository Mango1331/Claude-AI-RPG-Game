import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { scenarios, measure as currentMeasure, render, cards, WAT, BRENNA, MANNER, INTEREST, VOICE, anchors, wat, fact, content, u1 } from './npc_e3_compact_lib.js';
import { npcCues, buildContext, playerActionsBlock } from '../../src/context.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { setFactEvents } from '../../src/knowledge.js';
import { applyEvent } from '../../src/state.js';
import { run191 } from './batch191_lib.js';

import { estimateTokens } from '../../src/util.js';
// .201 changes only the agency sentence. Preserve the .199 source fixture and compare every
// other byte/card; normalize that one documented sentence for this historical layout comparison.
function measure(x) {
    const ctx=render(x),old="PLAYER ACTIONS (the engine resolved Alaric's message; narrate exactly these, in this order; he decides nothing else):";
    const text=ctx.text.replace(/^PLAYER ACTIONS \(resolved choices in order; routine details here allowed, no extra decisions or mechanics\):/m,old);
    const block=text.split('\n\n').find(b=>b.startsWith('PLAYER ACTIONS'));
    const actual=playerActionsBlock(x.state.last.outcome),historical=actual.replace(/^PLAYER ACTIONS[^\n]+/,old);
    const delta=x.state.last.outcome.kind==='v4'?estimateTokens(historical)-estimateTokens(actual):0;
    return currentMeasure(x,{...ctx,text,tokens:text===ctx.text?ctx.tokens:estimateTokens(text),sections:ctx.sections.map(s=>s.name==='resolved'?{...s,tokens:block?estimateTokens(block):s.tokens+delta}:s)});
}

// Captured from the merged .199 commit before changing product code. Not replay originals or updated expectations.
const base = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/npc_e3_compact199.json.gz', import.meta.url)))).cases;
const cases = scenarios();
const head = (key, id = WAT) => cards(render(cases[key]))[id][0];
const whole = (key, k, value, id = WAT) => assert.ok(head(key, id).includes(`; ${k}: ${value}`), head(key, id));

test('B01: original Wat copy, birds selects the entire interest, never a manner fragment', () => {
    whole('birds', 'interest', INTEREST);
    assert.ok(!head('birds').includes('; manner:'));
    assert.match(head('birds'), /^• Wat \[npc.wat\] — person, villager/);
    whole('last_reply', 'interest', INTEREST);
});
test('B02: cuffs selects whole manner; no lexical hit retains voice first', () => {
    whole('cuffs', 'manner', MANNER); whole('no_hits', 'voice', VOICE);
});
test('B03: equal hits, empty focus and repeated calls preserve stable voice precedence', () => {
    for (const key of ['tie', 'empty_focus', 'no_hits']) {
        whole(key, 'voice', VOICE);
        assert.deepEqual(render(cases[key]), render(cases[key]));
    }
});
test('B04: all fitting anchors keep byte-identical cards and full context', () => {
    assert.deepEqual(measure(cases.all_fit), base.all_fit);
    assert.match(head('all_fit'), /; voice: soft; manner: nods; interest: birds;/);
});
test('B05: oversized high-priority interest does not block shorter whole fields', () => {
    assert.ok(!head('skip_long').includes('; interest:'));
    whole('skip_long', 'voice', VOICE);
    assert.ok(!head('skip_long').includes('; manner:') || head('skip_long').includes('; manner: nods'));
});
test('B06: no fitting field, long identity, long canonical ID; no new identity truncation', () => {
    assert.doesNotMatch(head('none_fit'), /; (voice|manner|interest):/);
    assert.equal(head('long_identity'), base.long_identity.cards[WAT].rows[0]);
    const id = 'npc.wat_of_the_old_millpond_weather_gate';
    assert.ok(head('long_id', id).includes(`[${id}]`));
});
test('B07: punctuation and terminal negations remain intact, never half an anchor', () => {
    whole('negation', 'manner', 'nods; waits, but never agrees before reading every clause');
    for (const [key, x] of Object.entries(cases)) {
        for (const [id, rows] of Object.entries(cards(render(x)))) {
            const cues = npcCues(x.state, content, id);
            for (const k of ['voice', 'manner', 'interest']) if (rows[0].includes(`; ${k}:`))
                assert.ok(rows[0].includes(`; ${k}: ${cues[k]}`), `${key}: ${rows[0]}`);
        }
    }
});
test('B08: no/none anchors and naturally fitting single anchors remain byte-identical', () => {
    for (const key of ['no_anchors', 'wat_original', 'hedwin_original', 'marren_original', 'clerk_original'])
        assert.deepEqual(measure(cases[key]), base[key], key);
});
test('B09: current functional value replaces history without reactivating it', () => {
    whole('replaced', 'interest', 'likes wooden boats, never birds');
    assert.ok(!head('replaced').includes(INTEREST));
});
test('B10: arrival reserves NOT YET SHOWN and identity; card never enters the NPC', () => {
    whole('arrival', 'interest', INTEREST);
    assert.match(head('arrival'), /^• Wat \[npc.wat\] — person, keeper of the millpond gates/);
    assert.ok(head('arrival').endsWith('; NOT YET SHOWN'));
    assert.ok(!cases.arrival.state.scene.present.includes(WAT));
});
test('B11: current plus arrival and two current interlocutors keep exactly the old slots', () => {
    for (const key of ['mixed_slots', 'two_current']) {
        const m = measure(cases[key]);
        assert.deepEqual(m.focus, base[key].focus); assert.deepEqual(m.arrival, base[key].arrival);
        assert.equal(Object.keys(m.cards).length, 2);
    }
});
test('B12: Brenna and original Clerk preserve agreements, knowledge, real memory and detail fallback', () => {
    for (const key of ['brenna', 'clerk_original', 'agreement_fallback']) {
        const m = measure(cases[key]);
        for (const [id, c] of Object.entries(m.cards)) assert.deepEqual(c.rows.slice(1), base[key].cards[id].rows.slice(1));
        assert.deepEqual(m, base[key]);
    }
    const brenna = cards(render(cases.brenna))[BRENNA].join('\n');
    assert.match(brenna, /between you:/); assert.match(brenna, /last meaningful:/); assert.match(brenna, /knows:/);
    assert.match(render(cases.clerk_original).text, /between you:/);
    assert.match(render(cases.agreement_fallback).text, /open between you:/);
});
test('B13: routine memory below significance threshold creates no meaningful moment', () => {
    assert.doesNotMatch(cards(render(cases.routine))[WAT].join('\n'), /last meaningful:/);
});
test('B14: private facts and absent people retain existing knowledge and absence boundaries', () => {
    assert.deepEqual(measure(cases.absent), base.absent);
    assert.deepEqual(cards(render(cases.private))[WAT], cards(render(cases.birds))[WAT]);
    assert.ok(!cards(render(cases.private))[WAT].join('\n').includes('buried emerald cipher'));
    assert.match(render(cases.absent).text, /NOT PRESENT/);
});
test('B15: combat, legacy and full detail unchanged; #system only existing compact heads differ', () => {
    for (const key of ['combat', 'legacy', 'absent']) assert.deepEqual(measure(cases[key]), base[key], key);
    const m = measure(cases.system);
    assert.deepEqual(m.focus, base.system.focus); assert.deepEqual(m.arrival, base.system.arrival);
    const withoutCompact = x => x.blocks.filter(b => !/^(CURRENT INTERLOCUTORS|ARRIVING AT)/.test(b.first));
    assert.deepEqual(withoutCompact(m), withoutCompact(base.system));
});
test('B16: every card <= old length, <= 4 rows of 170; unchanged body, slots and no new sections', () => {
    for (const [key, x] of Object.entries(cases)) {
        const m = measure(x);
        assert.deepEqual(m.focus, base[key].focus, key); assert.deepEqual(m.arrival, base[key].arrival, key);
        assert.ok(Object.keys(m.cards).length <= 2);
        for (const [id, c] of Object.entries(m.cards)) {
            assert.ok(c.rows.length <= 4 && c.rows.every(r => r.length <= 170), key);
            assert.ok(c.chars <= base[key].cards[id].chars, key);
            assert.deepEqual(c.rows.slice(1), base[key].cards[id].rows.slice(1), `${key} body`);
        }
        assert.ok(m.sections.every(s => [...base[key].sections.map(s => s.name), ...base[key].dropped].includes(s.name)), key);
    }
});
test('B17: same context after JSON reload, with no change to facts/events/RNG/state', () => {
    for (const x of Object.values(cases)) {
        const before = structuredClone(x.state), first = render(x);
        assert.deepEqual(render(x), first);
        assert.deepEqual(render({ ...x, state: JSON.parse(JSON.stringify(x.state)) }), first);
        assert.deepEqual(x.state, before);
    }
});

test('B03/B07 boundary: distinct lexical hits, not word frequency; exact-fit anchor stays whole', () => {
    const s = anchors(wat(), WAT, { voice: 'birds birds birds birds birds birds birds birds birds', manner: 'cuffs birds with deliberate gestures and formal courtesy', interest: INTEREST });
    const ctx = buildContext(s, content, { input: 'Wat birds cuffs' });
    assert.ok(cards(ctx)[WAT][0].includes('; manner: cuffs birds with deliberate gestures and formal courtesy'));
    const exact = anchors(wat(), WAT, { voice: 'never speaks' });
    const identity = '• Wat [npc.wat] — person, ';
    fact(exact, WAT, 'occupation', 'x'.repeat(170 - identity.length - '; voice: never speaks'.length));
    assert.ok(cards(buildContext(exact, content, { input: 'Wat' }))[WAT][0].endsWith('; voice: never speaks'));
});

test('B10/B17 offline host: current/arrival E3 choice survives save, swipe and regenerate without extra calls', async () => {
    for (const arriving of [false, true]) {
        const id = arriving ? BRENNA : WAT;
        const chat = structuredClone(arriving ? u1.slice(0, 61) : run191('w191').chat.slice(0, 93));
        const s = foldChat(chat).state;
        // Explicit synthetic transport facts in a copied record, not changes to an original fixture.
        for (const [p, o] of Object.entries({ voice: VOICE, manner: MANNER, interest: INTEREST })) {
            const events = setFactEvents(s, { s: id, p, o });
            rec(chat.at(-1)).events.push(...events);
            for (const e of events) applyEvent(s, e);
        }
        assert.equal(npcCues(foldChat(chat).state, content, id).interest, INTEREST);
        const input = arriving ? `${u1[61].mes} I ask Brenna about local marsh birds, feathers and the wooden box.` : 'I ask Wat about local marsh birds, feathers and the wooden box.';
        const commands = arriving ? rec(u1[61]).events.find(e => e.t === 'cmd.interpreted').d.commands : [];
        chat.push({ is_user: true, mes: input, name: 'Alaric', extra: {} });
        const calls = [];
        const llm = async ({ purpose }) => { calls.push(purpose); assert.match(purpose, /^plan/); return JSON.stringify({ commands }); };
        const opts = { type: 'normal', settings: { planner: true }, llm };
        const first = await prepareGenerationAsync(chat, content, opts);
        const head = cards(first.context)[id]?.[0];
        assert.ok(head?.includes(`; interest: ${INTEREST}`), head);
        if (arriving) assert.ok(head.endsWith('; NOT YET SHOWN'));
        const saved = JSON.parse(JSON.stringify(chat)), before = foldChat(saved).state, count = calls.length;
        assert.equal(count, 1, 'one scripted planner call, no extractor/narrator/provider');
        for (const type of ['swipe', 'regenerate']) {
            const again = await prepareGenerationAsync(saved, content, { ...opts, type });
            assert.deepEqual(again.context, first.context, type);
            assert.deepEqual(foldChat(saved).state, before, type);
        }
        assert.equal(calls.length, count, 'same saved command, no extra model call');
        if (arriving) assert.ok(!before.scene.present.includes(id));
    }
});
