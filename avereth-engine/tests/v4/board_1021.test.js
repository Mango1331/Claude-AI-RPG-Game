// Livetest 21.10.2026 00:16 (tests/v4/live_1021.json, Build c.6.6.22): the first board read at the Alderwatch hall failed.
// The generator wrote the Old Crown Catacombs job (Rank F–E; level 1: F, level 2: E) for "the upper galleries", the
// check reads only "level N", so the job was refused; the retry wrote "upper galleries (Rank F)" and was refused again,
// and the whole board failed. The request asked for "the part (a level, a gallery)", and the refusal never said which
// level would do. Now both name it ("level 1"); the check itself is unchanged: a gallery, "upper" or a Rank letter alone
// is still no level, and a level above the board's Rank is still refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { boardRequest, parseBoard } from '../../src/v4/guild.js';
import { loreKeys } from '../../src/context.js';
import { loadLorebook, activate } from '../../tools/wi_sim.mjs';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1021.json'), 'utf8'));
const NEED = { branch: 'loc.alderwatch', rank: 'Novice', missing: 5, day: 1, have: [], c: true };
const state = () => foldChat(fx.messages.map((m) => structuredClone(m))).state;
const answer = (v) => JSON.stringify(v);
const SKELETONS = /Skeletons/;

test('board 21.10: the request names the level a mixed-Rank Dungeon allows ("level 1" of the Old Crown Catacombs)', () => {
    const { user } = boardRequest(state(), content, NEED);
    assert.match(user, /Old Crown Catacombs.*level 1: F, level 2: E/);
    assert.match(user, /In Old Crown Catacombs that part is "level 1": write it with its number/);
    assert.doesNotMatch(user, /that part is "level 2"/, 'the E-Rank level is not offered');
});

test('board 21.10: the live answers: "upper galleries" and "upper galleries (Rank F)" are still refused, and the refusal now names "level 1"; the swipe\'s answer is taken whole', () => {
    const s = state();
    for (const a of [fx.board.first, fx.board.retry]) {
        const p = parseBoard(answer(a), content, NEED, s);
        const r = p.refused.find((x) => SKELETONS.test(x.title));
        assert.ok(r, 'still refused: no level named');
        assert.match(r.why, /names no part of Old Crown Catacombs.*write "level 1"/);
        assert.equal(p.listings.length, 4);
    }
    const ok = parseBoard(answer(fx.board.swipe), content, NEED, s);
    assert.equal(ok.listings.length, 5);
    assert.deepEqual(ok.refused, []);
    // the rule is not loosened: the same job at level 2 (Rank E) is refused
    const deeper = structuredClone(fx.board.swipe);
    deeper.listings[0].objectives[1].where = 'Old Crown Catacombs, level 2';
    assert.match(parseBoard(answer(deeper), content, NEED, s).refused[0].why, /level 2 of Old Crown Catacombs is Rank E: not Novice work/);
});

test('board 21.10: the live read through the host: the first answer refused, the retry is told "level 1", and a corrected answer books the board', async () => {
    const chat = fx.messages.map((m) => structuredClone(m));
    chat.push({ mes: '*i nod and then walk over to the quest board and look at it*', is_user: true, is_system: false, extra: {} });
    const asked = [];
    const corrected = structuredClone(fx.board.first);
    corrected.listings[0].objectives[1].where = 'Old Crown Catacombs, level 1';
    const boards = [answer(fx.board.first), answer(corrected)];
    const llm = async ({ purpose, messages }) => {
        if (purpose.startsWith('plan')) return JSON.stringify({ commands: [{ seq: 1, type: 'board.read', rank: null, quote: 'i nod and then walk over to the quest board and look at it' }] });
        if (purpose === 'board') { asked.push(messages); return boards.shift(); }
        return null;
    };
    await prepareGenerationAsync(chat, content, { type: 'normal', settings: { planner: true }, llm });
    assert.equal(asked.length, 2);
    assert.match(asked[1].at(-1).content, /That answer was not valid:.*Skeletons in the Upper Galleries.*write "level 1"/);
    const events = rec(chat.at(-1)).events;
    assert.equal(events.filter((e) => e.t === 'board.failed').length, 0);
    assert.equal(events.filter((e) => e.t === 'quest.created').length, 5);
});

test('World Info 21.10: in the Guild hall the Lore Bridge names realm, town and hall, so the town\'s entries activate there as well; at the board the Guild and board entries stay in the budget', () => {
    const s = state();
    assert.equal(s.scene.at, 'loc.alderwatch.guild_hall');
    const keys = loreKeys(s, content);
    assert.deepEqual(keys, ['Valedorn Crown', 'Alderwatch', "Adventurers' Guild hall"]);
    // the board turn as SillyTavern scans it (depth 2, cap 1,800, the recommended settings in docs/LOREBOOK.md)
    const book = loadLorebook(path.join(ROOT, 'lorebook/Avereth_World_Lore_v0.14.json'));
    const msgs = [...fx.messages.map((m) => m.mes), '*i nod and then walk over to the quest board and look at it*'];
    const r = activate(book, msgs, { depth: 2, budget: 1800, inject: keys });
    const kept = r.kept.map((x) => x.e.comment);
    for (const c of ['REALM — Valedorn Crown', 'LOCATION SEED — Alderwatch', "GUILD — Adventurers' Guild and rank systems", 'GUILD — Contract boards and Quest Ranks']) assert.ok(kept.includes(c), c);
});
