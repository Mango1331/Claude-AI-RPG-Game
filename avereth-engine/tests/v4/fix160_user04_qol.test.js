import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec, turnBlock } from '../../src/host.js';
import { playerTurn } from '../../src/engine.js';
import { deriveCharacter } from '../../src/derived.js';
import { buildContext } from '../../src/context.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';
import { sealRefusal } from '../../src/v4/living.js';
import { boardView } from '../../src/hud.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user04_qol159.json.gz', import.meta.url))));
const before = i => foldChat(f.chat, i).state;
const root = 'loc.old_crown_catacombs';
const lower = `${root}.sloping_worn_passage`;
const text = (s, input = 'I examine the passage.') => buildContext(s, content, { input, outcome: s.last.outcome, budget: 1400 }).text;
const sourceContext = i => turnBlock(f.chat, i - 1, content, { budget: 1400, rulesBudget: 800, recentTurns: 4, engineLore: false }).context;
const boardRead = () => playerTurnV4(before(71), content, f.chat[71].mes, { msg: 71, c: true,
    commands: rec(f.chat[71]).events.find(e => e.t === 'cmd.interpreted').d.commands, board: f.board });

test('160 original first fight control and new-base counterfactual retain the intended lethal difference', () => {
    for (const base of [7, 5]) {
        let s = before(19);
        if (base === 5) {
            for (const k of content.rules.stats) s.entities.pc.sheet.stats[k] -= 2;
            const d = deriveCharacter(s.entities.pc.sheet, content);
            Object.assign(s.entities.pc.sheet, { hp: d.maxHp, mp: d.maxMp, sta: d.maxSta });
        }
        const hp = [];
        for (const action of f.combat) {
            if (s.entities.pc.status === 'dead') break;
            const r = playerTurn(s, content, action.input, { c: true, msg: action.i, intent: action.intent });
            s = r.state; hp.push(s.entities.pc.sheet.hp);
            if (base === 7) assert.deepEqual(r.outcome.records, action.records);
            assert.deepEqual(validateState(s, content), []);
        }
        assert.deepEqual(hp, base === 7 ? [34, 17, 17] : [1, 0]);
        assert.equal(s.entities.pc.status, base === 7 ? 'alive' : 'dead');
    }
});

test('160 GO plus Board read assigns the catalogue to cards and preserves authoritative references', () => {
    const r = boardRead(), a = r.outcome.actions.join('\n');
    assert.match(a, /System cards/);
    assert.match(a, /REFERENCE ONLY/);
    assert.match(a, /individual contract/i);
    assert.doesNotMatch(a, /show exactly these|present the notices in the existing title-first/);
    for (const id of r.outcome.board.listings) {
        const q = r.state.quests[id]; assert.ok(a.includes(q.title)); assert.ok(a.includes(String(q.payout_cp)));
    }
    assert.equal(r.outcome.board.listings.length, 5);
    assert.ok(r.outcome.conditionals.some(c => c.kind === 'board'));
    assert.equal(boardView(r.state, content, r.outcome.board), '');
    assert.ok(!r.events.some(e => ['board.shown', 'quest.accepted', 'coin.changed'].includes(e.t)));
});
test('160 confirmed arrival keeps five canonical cards and all their detail/risk fields', () => {
    const r = boardRead();
    const done = replyTurnV4(r.state, content, f.extractions[72], { msg: 72, prose: f.chat[72].mes });
    const html = boardView(done.state, content, r.outcome.board);
    assert.equal((html.match(/class="avereth-board-card"/g) || []).length, 5);
    for (const id of r.outcome.board.listings) { const q = done.state.quests[id]; assert.ok(html.includes(q.title)); assert.ok(html.includes(q.id)); }
    assert.match(html, /Contract details/); assert.match(html, /reported minimum exceeds/);
    assert.equal(done.events.filter(e => e.t === 'board.shown').length, 1);
});
test('160 unconfirmed arrival shows no board and records no completed board read', () => {
    const r = boardRead(), done = replyTurnV4(r.state, content, JSON.stringify({ scene: 'here', expected: {}, deltas: [] }), { msg: 72, prose: 'Alaric paused outside the inn.' });
    assert.equal(boardView(done.state, content, r.outcome.board), '');
    assert.ok(!done.events.some(e => e.t === 'board.shown'));
});
test('160 same-day reread uses the same reference-only catalogue without fresh-board claims', () => {
    const s = before(73), input = 'I read the board again.';
    const r = playerTurnV4(s, content, input, { c: true, commands: [{ seq: 1, type: 'board.read', rank: null, quote: input }] });
    assert.match(r.outcome.actions.join('\n'), /REFERENCE ONLY/);
    assert.match(r.outcome.actions.join('\n'), /posted earlier today/);
    assert.doesNotMatch(r.outcome.actions.join('\n'), /JUST become available/);
    assert.equal((boardView(r.state, content, r.outcome.board).match(/avereth-board-card/g) || []).length, 5);
});
test('160 unavailable board keeps failure semantics and never promises cards', () => {
    const s = before(71); s.guild.boards = {}; s.quests = {};
    s.scene.at = 'loc.alderwatch.guild_hall';
    const r = playerTurnV4(s, content, 'I read the board.', { c: true, commands: [{ seq: 1, type: 'board.read', quote: 'I read the board.' }] });
    assert.match(r.outcome.actions.join('\n'), /UNCONFIRMED/); assert.equal(boardView(r.state, content, r.outcome.board), '');
});

test('160 actual Titan context distinguishes entry unawareness from current awareness despite concealment', () => {
    const c = sourceContext(82), s = before(82);
    assert.ok(s.scene.concealed.includes('pc'));
    assert.match(c.text, /ENTRY.*BEFORE/);
    const now = c.text.split('\n').find(l => l.startsWith('STATE NOW'));
    assert.match(now, /aware of Alaric/);
    assert.match(now, /not.*visual/i);
    assert.match(c.text, /concealment.*combat awareness/);
});
test('160 mandatory state awareness survives omission of the optional present card', () => {
    const s = before(82), c = buildContext(s, content, { input: f.chat[81].mes, outcome: s.last.outcome, budget: 0 });
    assert.ok(c.dropped.includes('present'));
    assert.match(c.text.split('\n').find(l => l.startsWith('STATE NOW')), /aware of Alaric/);
});
test('160 genuine noncombat unawareness stays available and context cannot mutate observer state', () => {
    const s = before(81), saved = structuredClone(s), c = text(s, 'I watch the Titan from hiding.');
    assert.match(c, /awareness of Alaric: unaware/);
    assert.match(c, /UNSEEN/); assert.deepEqual(s, saved);
});

for (const i of [52, 60, 66]) test(`160 I${i} receives the current guardian access without moving or granting NPC knowledge`, () => {
    const s = before(i), saved = structuredClone(s), c = sourceContext(i);
    assert.equal(sealRefusal(s, lower), null);
    assert.match(c.text, /DUNGEON ACCESS NOW[^\n]*RELEASED/);
    assert.match(c.text, /no movement/);
    assert.match(c.text, /not.*NPC knowledge/);
    assert.deepEqual(s, saved);
});
test('160 the known pre-guardian route is still narrated as sealed', () => {
    const s = before(49); assert.match(sealRefusal(s, lower), /sealed/);
    assert.match(text(s), /DUNGEON ACCESS NOW[^\n]*SEALED/);
});
test('160 visited lower room is reachable without falsely releasing the guardian seal', () => {
    const s = before(49); s.places[lower].visited = { turn: 1, minute: 1 };
    assert.equal(sealRefusal(s, lower), null);
    assert.doesNotMatch(text(s), /DUNGEON ACCESS NOW[^\n]*RELEASED/);
});
test('160 never-sealed transition has no invented fallen-seal history', () => {
    const s = before(52); s.dungeons[root].floors[1].sealed = false;
    assert.equal(sealRefusal(s, lower), null);
    assert.doesNotMatch(text(s), /DUNGEON ACCESS NOW/);
});
test('160 new cycle with no clear restores the seal status without rewriting static spec', () => {
    const s = before(52); s.dungeons[root].cycle++; s.dungeons[root].run.floors[1].cleared = null;
    assert.equal(s.dungeons[root].floors[1].sealed, true);
    assert.match(text(s), /DUNGEON ACCESS NOW[^\n]*SEALED/);
    assert.doesNotMatch(text(s), /DUNGEON ACCESS NOW[^\n]*RELEASED/);
});
test('160 hidden or invalid lower access never leaks a released-seal route', () => {
    const hidden = before(52); Object.values(hidden.links).filter(l => l.a === lower || l.b === lower).forEach(l => { l.hidden = true; });
    assert.doesNotMatch(text(hidden), /DUNGEON ACCESS NOW/);
    const invalid = before(52); delete invalid.dungeons[root].floors[2];
    assert.doesNotMatch(text(invalid), /DUNGEON ACCESS NOW/);
});
test('160 released guardian seal does not remove a separate feature blocker', () => {
    const s = before(52), l = Object.values(s.links).find(l => l.a === lower || l.b === lower);
    l.feature = 'feat.test_door'; s.features[l.feature] = { id: l.feature, name: 'iron gate', status: 'active' };
    const saved = structuredClone(s), c = text(s);
    assert.match(c, /DUNGEON ACCESS NOW[^\n]*RELEASED/); assert.match(c, /iron gate/);
    assert.deepEqual(s, saved);
});
test('160 unrelated outside conversation adds no remote dungeon access block', () => {
    const s = before(66); assert.doesNotMatch(text(s, 'How much is a meal?'), /DUNGEON ACCESS NOW/);
});
