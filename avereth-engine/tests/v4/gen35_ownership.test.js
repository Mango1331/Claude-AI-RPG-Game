// Gen 3.5, Decision Ownership (docs/ARCHITECTURE_GEN35.md §2.2): every kind of canonical state has one owner domain,
// every extractor delta declares what it may write, and free text never keeps the engine's state as a second truth.
// The whole suite runs with the ownership assertion on (tests/helpers.js): here the table itself, the assertion's
// verdicts and the one free-text rule for notes, memories and readiness notes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { applyWorld } from '../../src/v4/world.js';
import {
    STATE_KINDS, DELTA_WRITES, AUDIT_EVENTS, eventKind, ownershipViolation, ownedClause, stripOwned, engineOwned,
} from '../../src/v4/ownership.js';
import { engineClause } from '../../src/v4/guild.js';
import { V4_EVENTS } from '../../src/v4/domain.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_0930c.json'), 'utf8'));
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));

async function created(cls = 'Warrior') {
    const g = new Chat4(content, { listings: gold.board_generator.listings });
    await g.player(cls);
    const c = content.classes.get(cls.toLowerCase());
    await g.player(c.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    return g;
}
const base = (await created()).state();
const HALL = 'loc.redmarch.guild_hall';
const boarListing = fx.listings.find((l) => /Gnaw-Hide/.test(l.title));
function contract(s, id, listing, status = 'active') {
    s.quests[id] = { id, title: listing.title, kind: 'guild_contract', status, rank: 'Novice', level: listing.level, qtype: listing.qtype, payout_cp: listing.payout_cp, client: listing.client,
        desired_end_state: listing.desired_end_state, details: [], notes: [], proof: listing.proof.map((p, i) => ({ id: `p${i + 1}`, ...p })),
        objectives: listing.objectives.map((o, i) => ({ id: `o${i + 1}`, ...o, status: 'open' })), history: status === 'active' ? [{ turn: s.turn, minute: 0, status: 'active' }] : [], source: { board: HALL, branch: 'loc.redmarch' } };
    s.guild.membership = { rank: 'Novice', since: { turn: 1, minute: 0 }, branch: 'loc.redmarch' };
    Object.assign(s.scene, { at: HALL, location: 'loc.redmarch', present: ['pc'] });
    return s;
}
function after(state) {
    const s = structuredClone(state);
    s.last = { ...s.last, input: 'x', outcome: { kind: 'v4', actions: [], extra: [], resolutions: [], expected_keys: {}, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] }, search_checks: [], check_die: null,
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120 } } };
    return s;
}
const world = (s, deltas) => applyWorld(after(s), content, { expected: {}, deltas }, { msg: 9 });
const rules = (r) => r.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule);

// ------------------------------------------------------------------------------------------------ the table
test('every delta type of the vocabulary declares what it may write; a gate only ever opens an engine-owned kind', () => {
    const types = content.deltaVocab.deltas.map((d) => d.type).sort();
    assert.deepEqual(Object.keys(DELTA_WRITES).sort(), types, 'the table and the extractor vocabulary name the same delta types');
    for (const [type, w] of Object.entries(DELTA_WRITES)) {
        for (const k of w.writes || []) {
            assert.ok(STATE_KINDS[k], `${type} writes an unknown kind ${k}`);
            assert.equal(engineOwned(k), false, `${type} writes the engine-owned ${k} without a gate`);
        }
        for (const [k, gate] of Object.entries(w.gates || {})) {
            assert.ok(STATE_KINDS[k], `${type} gates an unknown kind ${k}`);
            assert.equal(engineOwned(k), true, `${type}: a gate (${gate}) for ${k}, which the story may write anyway`);
        }
    }
    // each kind has exactly one owner domain; the engine owns coin, possessions, vitals, progress and the Guild
    for (const [k, v] of Object.entries(STATE_KINDS)) assert.equal(typeof v.owner, 'string', k);
    assert.deepEqual(Object.keys(STATE_KINDS).filter(engineOwned).sort(), ['combat', 'guild.board', 'guild.standing', 'pc.coin', 'pc.inventory', 'pc.progress', 'pc.vitals', 'quest.status']);
});

test('every event the reducers know belongs to exactly one declared kind (no game state hides as "audit")', () => {
    const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
    const types = new Set([...src('src/state.js').matchAll(/case '([a-z_.]+)'/g)].map((m) => m[1]).concat([...V4_EVENTS]));
    for (const t of types) {
        const kind = eventKind({ t, d: {} }, null);
        assert.ok(kind && STATE_KINDS[kind], `${t} has no kind`);
        if (kind === 'audit') assert.ok(AUDIT_EVENTS.has(t), `${t} falls into audit without being listed as a record`);
    }
    // data decides where one type serves several kinds
    assert.equal(eventKind({ t: 'coin.changed', d: { id: 'pc' } }), 'pc.coin');
    assert.equal(eventKind({ t: 'object.created', d: { object: { holder: { entity: 'pc' } } } }), 'pc.inventory');
    assert.equal(eventKind({ t: 'object.created', d: { object: { holder: { entity: 'npc.bren' } } } }), 'objects');
    const s = { objects: { 'obj.x': { holder: { entity: 'pc' } } }, quests: { 'quest.g': { kind: 'guild_contract' }, 'quest.p': { kind: 'private' } } };
    assert.equal(eventKind({ t: 'object.moved', d: { id: 'obj.x', to: { entity: 'npc.bren' } } }, s), 'pc.inventory', 'what leaves his hands is his inventory');
    assert.equal(eventKind({ t: 'quest.status', d: { id: 'quest.g' } }, s), 'quest.status');
    assert.equal(eventKind({ t: 'quest.status', d: { id: 'quest.p' } }, s), 'quests');
});

test('the assertion: a delta that writes what it does not own is named; the declared gates pass', () => {
    const coin = { t: 'coin.changed', d: { id: 'pc', value: 50, delta: 10 } };
    assert.match(ownershipViolation({ kind: 'delta', type: 'memory' }, coin, base), /memory wrote pc\.coin \(coin\.changed\)/);
    assert.match(ownershipViolation({ kind: 'delta', type: 'fact' }, { t: 'quest.status', d: { id: 'quest.g' } }, { quests: { 'quest.g': { kind: 'guild_contract' } } }), /fact wrote quest\.status/);
    assert.equal(ownershipViolation({ kind: 'delta', type: 'coin.gift' }, coin, base), null, 'a gift to him is the gift gate');
    assert.equal(ownershipViolation({ kind: 'delta', type: 'coerce' }, coin, base), null, 'a robbery or a fine is the take gate');
    assert.equal(ownershipViolation({ kind: 'expected' }, coin, base), null, 'the engine answering its own questions writes by the player\'s commands');
    assert.match(ownershipViolation({ kind: 'delta', type: 'time' }, { t: 'no.such.event', d: {} }, base), /no declared kind/);
});

// ------------------------------------------------------------------------------------------------ free text
test('one clause rule for every store: a quest note keeps the old verdicts exactly (the rule moved, it did not change)', () => {
    const OLD_STATUS = /\b(?:registered|logged|turned\s+in|handed\s+in|(?:contract|quest|job|slip)\b[^.;]{0,40}\b(?:active|accepted|listed|complete|completed|closed|failed|finished))\b|^\W*(?:active|accepted|completed|closed|failed)\b/i;
    const OLD_MONEY = /\b(?:payouts?|rewards?|pays?\s+out|paid\s+out|xp|experience\s+points|guild\s+rank|promot\w*)\b/i;
    const OLD_AMOUNT = /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|a\s+hundred)\s*(?:cp|coppers?|silvers?|golds?)\b/i;
    const OLD_TOPIC = /\b(?:pay\w*|reward\w*|fees?|contract|bount(?:y|ies)|drawer|posted)\b/i;
    const OLD_CLIENT = /\b(?:bonus|own\s+purse|from\s+(?:his|her|their)\s+own)\b/i;
    const old = (x) => OLD_STATUS.test(x) || (!OLD_CLIENT.test(x) && (OLD_MONEY.test(x) || (OLD_AMOUNT.test(x) && OLD_TOPIC.test(x))));
    // every quest note and memory text of the recorded runs and of the gold, clause by clause
    const texts = [];
    for (const f of ['tests/v4/live_0930.json', 'tests/v4/live_0930b.json', 'tests/v4/live_0930c.json', 'tests/testrun_v12/gold_v4.json']) {
        const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { if (['quest.detail', 'memory', 'quest.ready'].includes(v.type)) texts.push(String(v.note || v.text || '')); Object.values(v).forEach(walk); } };
        walk(JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    }
    const clauses = texts.flatMap((t) => t.split(/(?<=[.;])\s+/)).filter((c) => c.trim());
    assert.ok(clauses.length > 40, `${clauses.length} clauses`);
    for (const c of clauses) assert.equal(engineClause(c), old(c), c);
});

test('a memory keeps the moment, not the engine\'s state: a payout, a contract\'s status, XP and rank go; a payment for a room stays', () => {
    const s = contract(structuredClone(base), 'quest.boars', boarListing, 'active');
    s.entities['npc.clerk'] = { id: 'npc.clerk', kind: 'npc', name: 'Wenna', descriptors: ['guild clerk'], traits: '', status: 'alive', location: 'loc.redmarch', at: HALL, card: {}, template: 'commoner' };
    s.scene.present.push('npc.clerk');
    const mem = (text) => ({ seq: 1, type: 'memory', text, who: ['npc.clerk'], imp: 6 });
    const stored = (r) => Object.values(r.state.memories || {}).filter((m) => m.kind === 'narrated').map((m) => m.text);
    // a moment and a payout in one memory: the moment stays
    const r = world(s, [mem('Wenna stamped the boar slip with a heavy hand. The contract is completed and the 60 cp reward was paid out.')]);
    assert.deepEqual(rules(r), []);
    assert.deepEqual(stored(r), ['Wenna stamped the boar slip with a heavy hand.']);
    // nothing but the engine's state: refused, the engine keeps its own record
    const only = world(s, [mem('Alaric turned in the boar contract; payout 60 cp; 15 Quest XP.')]);
    assert.deepEqual(rules(only), ['engine_owned_memory']);
    assert.deepEqual(stored(only), []);
    // ordinary moments with money stay whole: a payment for goods or a service is no payout
    for (const keep of ['Alaric paid Wenna 2 silver for a bed in the dormitory and thanked her.', 'Wenna laughed when Alaric dropped his copper on the floor.']) {
        assert.deepEqual(stored(world(s, [mem(keep)])), [keep.replace('Alaric', '{pc}')], keep);
    }
    assert.equal(ownedClause('Alaric made his payment of 2 copper for the crossing.', { store: 'memory' }), null);
    assert.equal(ownedClause('Alaric made his payment of 2 copper for the crossing.', { store: 'note' }), 'pc.coin', 'in a contract note every sum with a payment word is the contract\'s (unchanged)');
    assert.equal(ownedClause('The bounty was 20 cp.', { store: 'memory' }), 'pc.coin', 'the Guild\'s money stays the engine\'s in a memory too');
});

test('the readiness note keeps the story; the contract\'s status and payout stay the engine\'s', () => {
    const s = contract(structuredClone(base), 'quest.boars', { ...boarListing, objectives: [{ verb: 'FIND', what: 'the boars\' wallow', qty: null, unit: null, where: null }] }, 'active');
    const r = world(s, [{ seq: 1, type: 'quest.ready', quest: 'quest.boars', note: 'The wallow is found and fenced off. Contract complete, 60 cp payout due at the desk.', alternative: null }]);
    assert.deepEqual(rules(r), []);
    assert.equal(r.state.quests['quest.boars'].ready_note, 'The wallow is found and fenced off.');
    const bare = world(s, [{ seq: 1, type: 'quest.ready', quest: 'quest.boars', note: 'Contract complete; payout 60 cp.', alternative: null }]);
    assert.equal(bare.state.quests['quest.boars'].ready_note, s.quests['quest.boars'].desired_end_state, 'nothing of the note was story: the contract\'s own desired outcome');
});

test('stripOwned reports what it took and why', () => {
    const cut = stripOwned('The boars den in the beech copse. Contract active; payout 60 cp. Cotter adds a bonus of 10 cp from his own purse.', { store: 'note' });
    assert.deepEqual(cut.kept, ['The boars den in the beech copse.', 'Cotter adds a bonus of 10 cp from his own purse.']);
    assert.deepEqual(cut.owned, ['Contract active; payout 60 cp.'].flatMap((x) => x.split(/(?<=;)\s+/)));
    assert.deepEqual(cut.claims, ['active']);
    assert.ok(cut.kinds.includes('quest.status') && cut.kinds.includes('pc.coin'));
});
