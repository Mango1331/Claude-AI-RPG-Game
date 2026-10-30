import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { parseBoard } from '../../src/v4/guild.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';
import { validateState } from '../../src/validate.js';
import { acceptanceWhy } from '../../src/v4/trade.js';
import { Chat4 } from './harness.js';
import { rec } from '../../src/host.js';
import { processReplyAny, runExtraction } from '../../src/v4/runtime.js';
import * as recovery from '../../src/v4/narrator_recovery.js';
const c = await loadProductContent();
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/batch10_followup.json', import.meta.url)));

for (const answer of fixture.board.answers) {
    test(`original board C${answer.call}: a forbidden-floor warning is not a second target`, () => {
        const p = parseBoard(answer.text, c, fixture.board.need, fixture.board.state);
        // .120 rejects the independent dog notice: that counted population already has an active hunt.
        // The original Dungeon warning must still be accepted as a warning, not a second E-floor target.
        assert.equal(p.listings.length, 4, JSON.stringify(p.refused));
        assert.equal(p.refused.length, 1);
        assert.match(p.refused[0].why, /duplicate counted hunt targets: active hunt/);
        assert.ok(p.listings.some(l => l.title.includes('Mossback')));
    });
    test(`original board C${answer.call}: a real E objective stays forbidden`, () => {
        const value = JSON.parse(answer.text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
        value.listings.find(l => l.title.includes('Mossback')).objectives[0].where = 'Mossback Warrens, level 2';
        assert.ok(parseBoard(JSON.stringify(value), c, fixture.board.need, fixture.board.state).refused.some(x => /Rank E/.test(x.why)));
    });
}
for (const [i, f] of fixture.habitats.entries()) {
    test(`original habitat ${i}: authorized local scope keeps levels, identity and replay`, () => {
        const habitat = f.state.quests[f.quest].hunt.at;
        const before = structuredClone(f.state);
        const turn = playerTurnV4(before, c, f.input, { c: true, commands: [{ ...f.command, within: habitat }] });
        const r = applyWorld(turn.state, c, f.answer, { prose: f.prose, msg: 500 });
        const creatures = r.events.filter(e => e.t === 'entity.updated' && e.d.set?.profile);
        assert.ok(creatures.length >= 3);
        assert.ok(creatures.every(e => e.d.set.population_at === habitat));
        assert.ok(creatures.every(e => e.d.set.profile.level >= 4 && e.d.set.profile.level <= 7));
        const replay = structuredClone(before);
        for (const e of [...turn.events, ...r.events]) applyEvent(replay, JSON.parse(JSON.stringify(e)));
        assert.deepEqual(replay, r.state);
        assert.deepEqual(validateState(r.state, c), []);
    });
    test(`original habitat ${i}: unrelated departure is not assigned to the hunt`, () => {
        const turn = playerTurnV4(f.state, c, f.input, { c: true, commands: [f.command] });
        const r = applyWorld(turn.state, c, f.answer, { prose: f.prose, msg: 500 });
        assert.ok(r.events.filter(e => e.t === 'entity.updated' && e.d.set?.profile).every(e => !e.d.set.population_at));
    });
}
test('original purchase: cot plus box bed is not consent for box bed plus stew', () => {
    const f = fixture.purchase;
    const offer = f.state.offers[f.command.offer];
    assert.match(acceptanceWhy(f.command, offer, 'innkeeper', c.rules.currency), /select|goods|position|order/i);
    const turn = playerTurnV4(f.state, c, f.input, { c: true, commands: [f.command] });
    assert.equal(turn.events.some(e => e.t === 'coin.changed' || e.t === 'service.granted'), false);
});
test('original purchase: correct explicit selection and unqualified deal remain valid', () => {
    const f = fixture.purchase, offer = f.state.offers[f.command.offer];
    assert.equal(acceptanceWhy({ ...f.command, lines: ['l2', 'l4'] }, offer, 'innkeeper', c.rules.currency), null);
    assert.equal(acceptanceWhy({ ...f.command, quote: 'Deal.', agreed_cp: null }, offer, 'innkeeper', c.rules.currency), null);
});
test('ST200 server error status text gets exactly the existing narrator retry', async () => {
    let calls = 0;
    await recovery.narratorProviderResponse(async () => {
        calls++;
        return new Response(JSON.stringify(calls === 1 ? { error: { message: 'Internal Server Error' } } : { choices: [] }), { status: 200 });
    }, { isCurrent: () => true, mark() {}, async save() {} });
    assert.equal(calls, 2);
});
test('provider classifier preserves status and rejects auth/quota/unknown failures', () => {
    assert.equal(typeof recovery.providerResponseError, 'function');
    const e = recovery.providerResponseError(200, { error: { message: 'Internal Server Error' } });
    assert.equal(e.status, 200);
    assert.equal(e.retryable, true);
    for (const body of [{ error: { message: 'unknown failure' } }, { error: { code: 'invalid_api_key', message: 'Internal Server Error' } }, { quota_error: true, error: { message: 'Internal Server Error' } }])
        assert.equal(recovery.providerResponseError(200, body).retryable, false);
});
test('schema error then ST200 transient error uses the third existing extractor attempt once', async () => {
    const g = new Chat4(c);
    await g.player('Mage');
    await g.player('Flame Lance and Arcane Ward');
    await g.player('I wait.');
    const id = g.chat.push({ mes: 'The innkeeper nods.', is_user: false, extra: {} }) - 1;
    processReplyAny(g.chat, id, c);
    let calls = 0;
    await runExtraction(g.chat, id, c, async () => {
        calls++;
        if (calls === 1) return '{"scene":"here","expected":{"99":true},"deltas":[]}';
        if (calls === 2) throw Object.assign(Error('HTTP 200: Internal Server Error'), { code: 'LLM_PROVIDER', status: 200, retryable: true });
        return '{"scene":"here","expected":{},"deltas":[]}';
    });
    assert.equal(calls, 3);
    assert.equal(rec(g.chat[id]).extraction.status, 'applied');
    assert.equal(rec(g.chat[id]).events.filter(e => e.t === 'extract.applied').length, 1);
});

test('a contradictory E-level title cannot hide behind a floor-1 objective', () => {
    const value = JSON.parse(fixture.board.answers[0].text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
    value.listings.find(l => l.title.includes('Mossback')).title = 'Clear Mossback Warrens Level 2';
    assert.ok(parseBoard(JSON.stringify(value), c, fixture.board.need, fixture.board.state).refused.some(x => /Rank E/.test(x.why)));
});
test('local habitat scope cannot be supplied from another place or for a known outside destination', () => {
    const f = fixture.habitats[0], habitat = f.state.quests[f.quest].hunt.at;
    const outside = structuredClone(f.state);
    outside.scene.at = 'loc.ashbridge.guild_hall';
    for (const [s, to] of [[outside, f.command.to], [f.state, 'loc.ashbridge.guild_hall']]) {
        const r = playerTurnV4(s, c, f.input, { c: true, commands: [{ ...f.command, to, within: habitat }] });
        assert.equal(r.outcome.resolutions[0].status, 'refused');
        assert.equal(r.events.some(e => e.t === 'scene.moved'), false);
    }
});
test('scope does not fabricate an unconfirmed arrival or relocate a known creature', () => {
    const f = fixture.habitats[0], habitat = f.state.quests[f.quest].hunt.at;
    const turn = playerTurnV4(f.state, c, f.input, { c: true, commands: [{ ...f.command, within: habitat }] });
    const answer = structuredClone(f.answer);
    answer.expected['1'].arrived = false;
    answer.deltas = answer.deltas.filter(d => d.type !== 'arrive');
    const r = applyWorld(turn.state, c, answer, { prose: f.prose, msg: 500 });
    assert.equal(r.state.scene.at, turn.state.scene.at);
    assert.equal(r.events.some(e => e.t === 'entity.created' && e.d.entity.kind === 'creature'), false);
});
test('explicit independent parent is never silently reassigned by local scope', async () => {
    const { scopedPlaces } = await import('../../src/v4/place_refs.js');
    const f = fixture.habitats[0], habitat = f.state.quests[f.quest].hunt.at;
    const turn = playerTurnV4(f.state, c, f.input, { c: true, commands: [{ ...f.command, within: habitat }] });
    const answer = structuredClone(f.answer);
    answer.scene.new.parent = 'loc.ashbridge.guild_hall';
    assert.equal(scopedPlaces(answer, turn.state).scene.new.parent, 'loc.ashbridge.guild_hall');
    assert.deepEqual(f.answer, fixture.habitats[0].answer);
});
test('selected products that are explicitly excluded are refused; excluding another product is allowed', () => {
    const f = fixture.purchase, offer = f.state.offers[f.command.offer];
    assert.match(acceptanceWhy({ ...f.command, quote: 'I take the box bed, not the cot.', lines: ['l3'], agreed_cp: null }, offer, 'innkeeper', c.rules.currency), /excluded/);
    assert.equal(acceptanceWhy({ ...f.command, quote: 'I take the box bed, not the cot.', lines: ['l4'], agreed_cp: null }, offer, 'innkeeper', c.rules.currency), null);
});
test('separately priced selections still enforce individual prices', () => {
    const f = fixture.purchase, offer = f.state.offers[f.command.offer];
    assert.equal(acceptanceWhy({ ...f.command, quote: 'I take the box bed for four copper and stew for two copper.', lines: ['l2', 'l4'] }, offer, 'innkeeper', c.rules.currency), null);
    assert.ok(acceptanceWhy({ ...f.command, quote: 'I take the box bed for two copper and stew for four copper.', lines: ['l2', 'l4'] }, offer, 'innkeeper', c.rules.currency));
});
for (const status of [401, 403, 404]) test(`HTTP ${status} is not made transient by a misleading message`, () => {
    assert.equal(recovery.providerResponseError(status, { error: { message: 'Internal Server Error' } }).retryable, false);
});

test('correct original order books one bed and stew once, and survives event replay', () => {
    const f = fixture.purchase;
    const turn = playerTurnV4(f.state, c, f.input, { c: true, commands: [{ ...f.command, lines: ['l2', 'l4'] }] });
    assert.equal(turn.events.filter(e => e.t === 'coin.changed').reduce((n, e) => n + e.d.delta, 0), -6);
    assert.equal(turn.events.filter(e => e.t === 'service.granted' && e.d.service === 'lodging').length, 1);
    assert.ok(turn.events.some(e => e.t === 'object.created' && /stew/.test(e.d.object.name)));
    const replay = structuredClone(f.state);
    for (const e of JSON.parse(JSON.stringify(turn.events))) applyEvent(replay, e);
    assert.deepEqual(replay, turn.state);
    const repeated = playerTurnV4(turn.state, c, f.input, { c: true, commands: [{ ...f.command, lines: ['l2', 'l4'] }] });
    assert.equal(repeated.events.some(e => e.t === 'coin.changed'), false);
});

async function pendingReply() {
    const g = new Chat4(c);
    await g.player('Mage');
    await g.player('Flame Lance and Arcane Ward');
    await g.player('I wait.');
    const id = g.chat.push({ mes: 'The innkeeper nods.', is_user: false, extra: {} }) - 1;
    processReplyAny(g.chat, id, c);
    return { g, id };
}
test('transient exhaustion keeps the existing call limit and safe world continuation', async () => {
    const { g, id } = await pendingReply();
    const booked = structuredClone(rec(g.chat[id - 1]).events);
    let calls = 0;
    await runExtraction(g.chat, id, c, async () => {
        calls++;
        if (calls === 1) return '{"scene":"here","expected":{"99":true},"deltas":[]}';
        throw recovery.providerResponseError(200, { error: { message: 'Internal Server Error' } });
    });
    assert.equal(calls, 3);
    assert.equal(rec(g.chat[id]).extraction.status, 'failed');
    assert.equal(rec(g.chat[id]).continuation.kind, 'world_not_applied');
    assert.deepEqual(rec(g.chat[id - 1]).events, booked);
});
for (const error of [{ code: 'invalid_api_key', message: 'Internal Server Error' }, { code: 'insufficient_quota', message: 'quota exhausted' }])
    test(`permanent ${error.code} neither retries nor disguises itself as a model continuation`, async () => {
        const { g, id } = await pendingReply();
        let calls = 0;
        await runExtraction(g.chat, id, c, async () => {
            calls++;
            throw recovery.providerResponseError(200, { error });
        });
        assert.equal(calls, 1);
        assert.equal(rec(g.chat[id]).extraction.error_kind, 'provider');
        assert.equal(rec(g.chat[id]).continuation, undefined);
    });
