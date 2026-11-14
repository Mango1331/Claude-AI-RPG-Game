// Location architecture (.190, stage 0): the incident report (tools/location_report.mjs) separates primary location
// refusals from their cascade, classifies every authorized GO by what its reply did, finds orphan places and duplicate
// candidates under the strict prefix rule, and reads cost from calls.json. Synthetic records, no engine run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeRun, duplicatePlaces, duplicateNpcs, recordsOfChat, total } from '../../tools/location_report.mjs';

const user = (i, ...events) => ({ i, user: true, events });
const reply = (i, ...events) => ({ i, user: false, events: [...events, { t: 'extract.applied', d: { deltas: 2 } }] });
const goAuth = (to = 'loc.b') => [{ t: 'cmd.interpreted', d: { commands: [{ seq: 1, type: 'go', to }] } }, { t: 'cmd.resolved', d: { seq: 1, type: 'go', status: 'authorized' } }];
const rej = (rule, type = 'fact') => ({ t: 'delta.rejected', d: { rule, item: { type } } });

test('location report: primary refusals and their cascade are counted apart; authorized GOs are classified by their reply', () => {
    const r = analyzeRun([
        user(1, ...goAuth()), reply(2, { t: 'scene.moved', d: { at: 'loc.b' } }),
        user(3, ...goAuth({ new: 'the cellar' })), reply(4, rej('passage', 'arrive'), rej('scene_context'), rej('scene_context')),
        user(5, ...goAuth()), reply(6),
        user(7), reply(8, rej('no_go', 'arrive'), rej('scene_context'), { t: 'place.created', d: { place: { id: 'loc.x', kind: 'site' } } }, { t: 'place.created', d: { place: { id: 'loc.told', kind: 'site', known: 'reported' } } }),
        user(9), reply(10, rej('offer')),
    ]);
    assert.equal(r.primary, 2);
    assert.equal(r.cascade, 3);
    assert.equal(r.rejected, 6);
    assert.deepEqual([r.go.turns, r.go.arrived, r.go.refused_by_engine, r.go.no_arrival], [3, 1, 1, 1]);
    assert.deepEqual(r.go.by_target, { id: 2, new: 1 });
    assert.equal(r.unauthorized_arrivals, 1);
    assert.deepEqual(r.episodes, [1, 1], 'two separate replies with a refused arrival');
    assert.deepEqual(r.orphans.map((o) => o.id), ['loc.x'], 'created in a refused reply, never stood in; a reported place is knowledge');
    assert.equal(r.lost.fact, 3);
});

test('location report: a place created where the arrival was refused but visited later is no orphan; consecutive refusals are one episode', () => {
    const r = analyzeRun([
        user(1), reply(2, rej('no_go', 'arrive'), { t: 'place.created', d: { place: { id: 'loc.y', kind: 'site' } } }),
        user(3), reply(4, rej('no_go', 'arrive')),
        user(5, ...goAuth('loc.y')), reply(6, { t: 'scene.moved', d: { at: 'loc.y' } }),
    ]);
    assert.deepEqual(r.orphans, []);
    assert.deepEqual(r.episodes, [2]);
});

test('location report: duplicate candidates follow the strict prefix rule inside one settlement; NPC names ending in the other', () => {
    const places = [
        { id: 'loc.a', name: 'Ashbridge', kind: 'settlement', realm: 'r', parent: 'r' },
        { id: 'loc.a.gate', name: 'Ashbridge city gate', kind: 'site', realm: 'r', parent: 'loc.a' },
        { id: 'loc.a.rows', name: 'the Tannery Rows', kind: 'site', realm: 'r', parent: 'loc.a' },
        { id: 'r.rows', name: 'the Tannery Rows behind the Ashbridge tanneries', kind: 'site', realm: 'r', parent: 'r' },
        { id: 'loc.a.carts', name: "the eel carts behind Brannic Vell's smokehouse", kind: 'site', realm: 'r', parent: 'loc.a' },
        { id: 'loc.a.smoke', name: "Brannic Vell's smokehouse", kind: 'site', realm: 'r', parent: 'loc.a' },
        { id: 'loc.b', name: 'Blackgate', kind: 'settlement', realm: 'r', parent: 'r' },
        { id: 'loc.a.hall', name: "Adventurers' Guild hall", kind: 'site', realm: 'r', parent: 'loc.a' },
        { id: 'loc.b.hall', name: "Adventurers' Guild hall", kind: 'site', realm: 'r', parent: 'loc.b' },
    ];
    assert.deepEqual(duplicatePlaces(places), [['loc.a.rows', 'r.rows']], 'no city/gate, no "behind" reference, no halls of two towns');
    assert.deepEqual(duplicateNpcs([{ id: 'npc.meister_ostrek', name: 'Meister Ostrek' }, { id: 'npc.ostrek', name: 'Ostrek' }, { id: 'npc.vessa', name: 'Vessa Crane' }]), [['npc.meister_ostrek', 'npc.ostrek']]);
});

test('location report: cost per turn from calls.json; a chat.jsonl metadata line is skipped; totals add up', () => {
    const calls = [{ turn: 1, ms: 1000, prompt_tokens: 100, completion_tokens: 10 }, { turn: 1, ms: 500, prompt_tokens: 50, completion_tokens: 5, repair: true }, { turn: 2, ms: 3000, prompt_tokens: 10, completion_tokens: 1, finish: 'length' }];
    const r = analyzeRun([], calls);
    assert.deepEqual([r.cost.calls, r.cost.repairs, r.cost.length_stops, r.cost.turns, r.cost.tokens_per_turn, r.cost.ms_p50, r.cost.ms_p95], [3, 1, 1, 2, 88, 1500, 1500]);
    const recs = recordsOfChat([{ chat_metadata: {} }, { is_user: true, mes: 'x', extra: { avereth: { events: [] } } }]);
    assert.equal(recs.length, 1);
    const t = total([analyzeRun([user(1), reply(2, rej('no_go', 'arrive'))]), analyzeRun([user(1), reply(2, rej('passage', 'arrive'))])]);
    assert.equal(t.primary, 2);
    assert.equal(t.unauthorized_arrivals, 1);
});
