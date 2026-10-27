import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { parseBoard, bookBoard, contractReady, defeatTally } from '../../src/v4/guild.js';
import { validateState } from '../../src/validate.js';
import { applyEvent } from '../../src/state.js';
import { setFactEvents } from '../../src/knowledge.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { applyWorld } from '../../src/v4/world.js';
const c = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run13_boards.json', import.meta.url)));
const state = () => { const s = structuredClone(f.states[8]); s.guild.boards = {}; return s; };
const need = s => ({ branch: 'loc.glassmere', rank: 'Novice', day: 1, have: [], missing: 5, c: true, profile: 'count_hunt_clear' });
const hunt = i => ({ title: `Pasture wolf ${i}`, client: 'farmer', rank: 'Novice', level: 1, qtype: 'minor', payout_cp: 30,
    task: 'Make the boats sail again.', desired_end_state: 'Boats sail again.', proof: [],
    objectives: [{ verb: 'DEFEAT', what: 'wolf', qty: 1, unit: null, where: `West pasture ${i}` }] });
function board(s) { for (const p of Object.values(s.places)) delete p.dungeon; return Array.from({ length: 5 }, (_, i) => hunt(i)); }
function published(profile = 'count_hunt_clear') {
    const s = state(), n = { ...need(s), profile }, ls = board(s), r = parseBoard(JSON.stringify({ listings: ls }), c, n, s);
    assert.equal(r.listings?.length, 5, JSON.stringify(r));
    const events = [], emit = e => { events.push(e); applyEvent(s, e); };
    const ids = bookBoard(s, c, n, r.listings, emit); return { s, q: s.quests[ids[0]], emit, events };
}
test('101 Guild: publication fixes a single numeric contract and its text', () => {
    const { q } = published(); assert.equal(q.count_rule, 'killed'); assert.equal(q.objectives.length, 1);
    assert.doesNotMatch(q.task + q.desired_end_state, /boats/i); assert.match(q.task, /1.*wolf/);
});
test('101 Guild: new profile refuses additional FIND duties; cached old profile retains them', () => {
    const s = state(), ls = board(s); ls[0].objectives.push({ verb: 'FIND', what: 'silver idol', qty: 1, unit: null, where: 'West pasture 0' });
    const r = parseBoard(JSON.stringify({ listings: ls }), c, need(s), s); assert.ok(r.refused.some(x => /exactly one/.test(x.why)));
    const legacy = parseBoard(JSON.stringify({ listings: ls }), c, { ...need(s), profile: 'hunt_clear' }, s); assert.equal(legacy.listings?.length, 5);
});
test('101 Guild: count alone authorizes turn-in, never automatic payout; replay and repeat are stable', () => {
    const { s, q, emit } = published();
    resolveCommands(s, c, [{ seq: 1, type: 'quest.accept', quest: q.id }], emit, { c: true });
    const id = 'mon.count_wolf'; s.entities[id] = { id, kind: 'creature', species: 'wolf', anchor: 'wolf', name: 'Wolf', at: s.scene.at };
    for (const e of setFactEvents(s, { s: id, p: 'status', o: 'dead', by: 'engine' })) emit(e);
    const before = structuredClone(s); const money = s.entities.pc.sheet.coin_cp;
    assert.equal(q.ready, undefined); assert.equal(defeatTally(s, c, q)[0].done, 1); assert.equal(contractReady(s, c, q, { c: true }).ok, true);
    const booked = []; resolveCommands(s, c, [{ seq: 2, type: 'quest.turn_in', quest: q.id }], e => { booked.push(e); applyEvent(s, e); }, { c: true });
    assert.equal(q.status, 'completed'); assert.equal(s.entities.pc.sheet.coin_cp, money + 30);
    const replay = structuredClone(before); for (const e of JSON.parse(JSON.stringify(booked))) applyEvent(replay, e); assert.deepEqual(replay, s);
    resolveCommands(s, c, [{ seq: 3, type: 'quest.turn_in', quest: q.id }], emit, { c: true }); assert.equal(s.entities.pc.sheet.coin_cp, money + 30);
});
test('101 Guild: narrative alternatives and text changes cannot bypass the published kill rule', () => {
    const { s, q } = published(); q.status = 'active'; q.ready = true; q.ready_alternative = 'The wolves were scared off';
    q.task = q.desired_end_state = 'Drive off the wolves';
    s.entities['mon.fled'] = { id: 'mon.fled', kind: 'creature', species: 'wolf', anchor: 'wolf', fled: { turn: s.turn }, at: s.scene.at };
    assert.equal(contractReady(s, c, q, { c: true }).ok, false); assert.equal(defeatTally(s, c, q)[0].driven, 0);
    const legacy = { ...q }; delete legacy.count_rule; assert.equal(contractReady(s, c, legacy, { c: true }).ok, true);
});
test('101 Guild: an authorized arrival turn-in waits for deferred legacy READY', () => {
    const { s, q } = published('hunt_clear'); delete q.count_rule; q.objectives = [{ verb: 'FIND', what: 'lost marker', qty: null, where: 'pasture' }]; q.status = 'active'; q.taker = 'pc';
    s.scene.at = 'loc.glassmere'; s.scene.present = ['pc'];
    const t = playerTurnV4(s, c, 'I return to the Guild and turn in my contract.', { c: true, commands: [{ seq: 1, type: 'go', to: 'loc.glassmere.guild_hall' }, { seq: 2, type: 'quest.turn_in', quest: q.id }] }).state;
    const a = { scene: 'loc.glassmere.guild_hall', expected: { 1: { arrived: true, at: 'loc.glassmere.guild_hall', with: [] } }, deltas: [
        { seq: 1, type: 'arrive', at: 'loc.glassmere.guild_hall', with: [], forced_by: null },
        { seq: 2, type: 'quest.ready', quest: q.id, note: 'The marker has been found.', alternative: null, scene: 'loc.glassmere.guild_hall' }
    ] };
    const r = applyWorld(t, c, a); assert.equal(r.state.quests[q.id].status, 'completed');
    assert.equal(r.state.entities.pc.sheet.coin_cp, t.entities.pc.sheet.coin_cp + 30);
});

test('101 Guild: persisted count policy is validated, legacy contracts need no marker', () => {
    const {s, q} = published();
    assert.ok(!validateState(s, c).some(x => x.includes('fixed count')));
    q.count_rule = 'narrated'; assert.ok(validateState(s, c).some(x => x.includes('fixed count')));
    delete q.count_rule; assert.ok(!validateState(s, c).some(x => x.includes('fixed count')));
});
for (const leave of [false, true]) test(`101 Guild: deferred turn-in cannot pay at a wrong desk or after leaving, leave=${leave}`, () => {
    const {s, q} = published('hunt_clear'); q.objectives = [{verb:'FIND', what:'marker', qty:null, where:'pasture'}]; q.status='active'; q.taker='pc';
    s.scene.at='loc.glassmere'; s.scene.present=['pc'];
    const t=playerTurnV4(s,c,'I return to the Guild and turn in my contract.',{c:true,commands:[{seq:1,type:'go',to:'loc.glassmere.guild_hall'},{seq:2,type:'quest.turn_in',quest:q.id},...(leave?[{seq:3,type:'go',to:'loc.glassmere'}]:[])]}).state;
    const at=leave?'loc.glassmere.guild_hall':'loc.alderwatch.guild_hall';
    const deltas=[{seq:1,type:'arrive',at,with:[],forced_by:null},...(leave?[{seq:2,type:'arrive',at:'loc.glassmere',with:[],forced_by:null}]:[]),{seq:3,type:'quest.ready',quest:q.id,note:'The marker was found.',alternative:null,scene:leave?'loc.glassmere':at}];
    const r=applyWorld(t,c,{scene:leave?'loc.glassmere':at,expected:{},deltas});
    assert.equal(r.state.quests[q.id].status,'active'); assert.ok(!r.events.some(e=>e.t==='coin.changed'||e.t==='xp.changed'));
});
