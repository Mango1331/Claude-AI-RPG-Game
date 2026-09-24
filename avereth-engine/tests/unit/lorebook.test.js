// The narrator card's lorebook (lorebook/, SillyTavern Character Lore) against the engine and the real testruns:
// structure, the names the engine's Lore Bridge sends, keys that fired on ordinary prose in the v0.10b review, and the
// World Info load per generation, replayed with SillyTavern's activation rules (tools/wi_sim.mjs; docs/LOREBOOK.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson, Game } from '../helpers.js';
import { lorebookEntries, activate, matchKey } from '../../tools/wi_sim.mjs';
import { scanWindows, LOREBOOK } from '../../tools/lorebook_audit.mjs';
import { loreKeys } from '../../src/context.js';

const content = await loadContent();
const book = await readJson(LOREBOOK);
const entries = lorebookEntries(book);
const SETTINGS = { depth: 2, budget: 1800 }; // the recommended SillyTavern settings (docs/LOREBOOK.md)

test('every entry is a complete World Info entry; nothing recurses (realm and city come from the Lore Bridge)', () => {
    for (const e of Object.values(book.entries)) {
        assert.ok(Array.isArray(e.key) && typeof e.content === 'string' && e.content.length > 50, e.comment);
        assert.equal(typeof e.order, 'number', e.comment);
        assert.equal(e.preventRecursion, true, e.comment);
        assert.ok(e.constant || e.key.length, e.comment);
    }
    assert.deepEqual(entries.filter((e) => e.constant).map((e) => e.comment), ['CORE — Avereth world identity', 'CORE — Canon, blank space, invention boundary']);
});

test('the Lore Bridge names match the lorebook: every realm and city of the engine has an entry keyed on its name', () => {
    const keyed = (name) => entries.some((e) => e.key.some((k) => k.toLowerCase() === name.toLowerCase()));
    for (const f of content.factions.values()) if (f.kind === 'realm') assert.ok(keyed(f.name), f.name);
    for (const l of content.locations.values()) assert.ok(keyed(l.name), l.name);
    const g = new Game(content, { firstMessage: 'Arrival.\n`Location: Public roadside verge outside Ashbridge, Duskreach`' }).ranger();
    assert.deepEqual(loreKeys(g.state, content), ['Duskreach', 'Ashbridge']);
    // descriptive lore comes from the lorebook: the engine block keeps mechanics and state only
    assert.match(g.context().text, /\nLORE:\n/);
    assert.doesNotMatch(g.context({ lore: false }).text, /\nLORE:\n/);
});

test('no key is an everyday word that fired on ordinary narration or tracker text in the v0.10b review', () => {
    const everyday = ['novice', 'proven', 'veteran', 'elite', 'master', 'grandmaster', 'legend', 'trade', 'market', 'death', 'order', 'rank', 'level', 'coin', 'domain'];
    for (const e of entries) for (const k of e.key) assert.ok(!everyday.includes(k.toLowerCase()), `${e.comment}: "${k}"`);
    // Testrun 2/3 prose and a Megumin NPC dossier that pulled the 1,000-token Guild entry into a forest and a rat fight
    const prose = 'every armed stranger as a poacher until proven otherwise ... **Role:** Master tanner, owner of the yard';
    assert.deepEqual(entries.filter((e) => !e.constant && e.key.some((k) => matchKey(prose, k))).map((e) => e.comment), []);
});

test('Testrun 2, 3 and 4 replayed: realm and city always present, no Guild rules in the forest, quest scaffolds at the quest board', async () => {
    const load = [];
    const has = (r, comment) => r.kept.some((x) => x.e.comment === comment);
    for (const [fixture, realm, city] of [['tests/testrun_v2/fixture.json', 'Solmere', 'Tidecross'], ['tests/testrun_v3/fixture.json', 'Duskreach', 'Ashbridge'], ['tests/testrun_v4/fixture.json', 'Ilyrion', 'Lumenford']]) {
        const windows = await scanWindows(content, fixture);
        const turns = windows.map((w) => activate(entries, w.messages, { ...SETTINGS, inject: w.keys }));
        for (const [i, r] of turns.entries()) {
            if (windows[i].system) continue; // character creation: a System panel, no generation and no World Info scan
            assert.ok(has(r, `REALM — ${realm}`) && has(r, `LOCATION SEED — ${city}`), `${fixture} turn ${i + 1}: current realm and city`);
            assert.ok(r.tokens < SETTINGS.budget);
            load.push(r.tokens);
        }
        if (realm === 'Solmere') for (const r of turns) assert.ok(!r.kept.some((x) => x.e.comment.startsWith('GUILD')), 'a forest hunt without any Guild');
        else if (realm === 'Ilyrion') {
            // Testrun 4 (the real prompts had the same entries in 14 of 15 turns; turn 7 fit one more by the real tokenizer)
            assert.ok(has(turns[6], 'QUEST — Complete quest body') && has(turns[6], 'GUILD — Contract boards'), 'turn 7 at the quest board');
            for (const n of [10, 11]) assert.deepEqual(turns[n - 1].kept.filter((x) => x.how !== 'constant').map((x) => x.e.comment), ['REALM — Ilyrion', 'LOCATION SEED — Lumenford'], `turn ${n}: the cellar fight`);
        } else {
            assert.ok(has(turns[7], 'QUEST — Complete quest body') && has(turns[7], 'QUEST — Causal generation rule'), 'turn 8 at the quest board');
            for (const n of [11, 12]) assert.ok(!has(turns[n - 1], 'GUILD — Promotion and placement') && !has(turns[n - 1], 'GUILD — Contract boards'), `turn ${n}: the rat fight`);
        }
    }
    assert.ok(load.reduce((a, b) => a + b, 0) / load.length < 1000, `average World Info load ${Math.round(load.reduce((a, b) => a + b, 0) / load.length)} tokens`);
});
