// The narrator card's lorebook (lorebook/, SillyTavern Character Lore) against the engine and the real testruns:
// structure, the names the engine's Lore Bridge sends, keys that fired on ordinary prose in the v0.10b review, and the
// World Info load per generation, replayed with SillyTavern's activation rules (tools/wi_sim.mjs; docs/LOREBOOK.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson, Game } from '../helpers.js';
import { lorebookEntries, activate, matchKey } from '../../tools/wi_sim.mjs';
import { scanWindows, LOREBOOK } from '../../tools/lorebook_audit.mjs';
import { loreKeys } from '../../src/context.js';
import { seedPlaces } from '../../src/v4/domain.js';

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
    for (const f of content.factions.values()) if (f.kind === 'realm' && !f.retired) assert.ok(keyed(f.name), f.name);
    for (const l of content.locations.values()) if (!l.retired) assert.ok(keyed(l.name), l.name);
    const g = new Game(content, { firstMessage: 'Arrival.\n`Location: Public roadside verge outside Ashbridge, Duskreach`' }).ranger();
    assert.deepEqual(loreKeys(g.state, content), ['Duskreach', 'Ashbridge']);
    // descriptive lore comes from the lorebook: the engine block keeps mechanics and state only
    assert.match(g.context().text, /\nLORE:\n/);
    assert.doesNotMatch(g.context({ lore: false }).text, /\nLORE:\n/);
});

test('v0.14: five great powers and three start cities; the realms and cities before v0.14 stay resolvable but have no lore', () => {
    const realms = [...content.factions.values()].filter((f) => f.kind === 'realm');
    assert.deepEqual(realms.filter((f) => !f.retired).map((f) => f.name), ['Valedorn Crown', 'Caelreth', 'Duskreach', 'Ashen Scale Dominion', 'Verdant Fang Court']);
    assert.deepEqual(content.start.start_locations.map((id) => content.locations.get(id).name), ['Alderwatch', 'Glassmere', 'Ashbridge']);
    const keyed = (name) => entries.some((e) => e.key.some((k) => k.toLowerCase() === name.toLowerCase()));
    for (const x of [...realms, ...content.locations.values()].filter((x) => x.retired)) assert.ok(!keyed(x.name), `${x.name} is retired`);
    for (const l of content.locations.values()) assert.ok(!l.realm || !content.factions.get(l.realm).retired || l.retired, `${l.name} lies in a retired realm`);
    // a new campaign starts in the world of five powers; one whose First Message names a retired city keeps the older world
    const names = (loc) => seedPlaces(content, loc, 'start').places.filter((p) => p.kind === 'realm').map((p) => p.name);
    assert.deepEqual(names(content.locations.get('loc.ashbridge')), realms.filter((f) => !f.retired).map((f) => f.name));
    assert.equal(names(content.locations.get('loc.tidecross')).length, realms.length);
    // the dungeon canon: persistent shared places; only real Dungeons have levels, an ordinary cave stays a cave
    const dungeons = entries.find((e) => e.comment === 'WORLD — Dungeons').content;
    for (const phrase of ['physical, persistent places', 'never private instances', 'without levels, bosses or regeneration', 'rare return stones']) assert.ok(dungeons.includes(phrase), phrase);
    assert.ok(entries.length <= 55, `${entries.length} entries`);
});

test('no key is an everyday word that fired on ordinary narration or tracker text in the v0.10b review', () => {
    const everyday = ['novice', 'proven', 'veteran', 'elite', 'master', 'grandmaster', 'legend', 'trade', 'market', 'death', 'order', 'rank', 'level', 'coin', 'domain'];
    for (const e of entries) for (const k of e.key) assert.ok(!everyday.includes(k.toLowerCase()), `${e.comment}: "${k}"`);
    // Testrun 2/3 prose and a Megumin NPC dossier that pulled the 1,000-token Guild entry into a forest and a rat fight
    const prose = 'every armed stranger as a poacher until proven otherwise ... **Role:** Master tanner, owner of the yard';
    assert.deepEqual(entries.filter((e) => !e.constant && e.key.some((k) => matchKey(prose, k))).map((e) => e.comment), []);
});

test('Testrun 2, 3 and 4 replayed: realm and city present in Ashbridge, no Guild rules in the forest, quest scaffolds at the quest board', async () => {
    // Testrun 2 (Solmere, Tidecross) and 4 (Ilyrion, Lumenford) were played in realms retired in v0.14: no entry for them
    const load = [];
    const has = (r, comment) => r.kept.some((x) => x.e.comment === comment);
    for (const fixture of ['tests/testrun_v2/fixture.json', 'tests/testrun_v3/fixture.json', 'tests/testrun_v4/fixture.json']) {
        const windows = await scanWindows(content, fixture);
        const turns = windows.map((w) => activate(entries, w.messages, { ...SETTINGS, inject: w.keys }));
        for (const [i, r] of turns.entries()) {
            if (windows[i].system) continue; // character creation: a System panel, no generation and no World Info scan
            if (fixture.includes('v3')) assert.ok(has(r, 'REALM — Duskreach') && has(r, 'LOCATION SEED — Ashbridge'), `${fixture} turn ${i + 1}: current realm and city`);
            assert.ok(r.tokens < SETTINGS.budget);
            load.push(r.tokens);
        }
        if (fixture.includes('v2')) for (const r of turns) assert.ok(!r.kept.some((x) => x.e.comment.startsWith('GUILD')), 'a forest hunt without any Guild');
        else if (fixture.includes('v4')) {
            assert.ok(has(turns[6], 'QUEST — Generation: cause, body, friction') && has(turns[6], 'GUILD — Contract boards and Quest Ranks'), 'turn 7 at the quest board');
            for (const n of [10, 11]) assert.deepEqual(turns[n - 1].kept.filter((x) => x.how !== 'constant').map((x) => x.e.comment), [], `turn ${n}: the cellar fight`);
        } else {
            assert.ok(has(turns[7], 'QUEST — Generation: cause, body, friction') && has(turns[7], 'GUILD — Contract boards and Quest Ranks'), 'turn 8 at the quest board');
            for (const n of [11, 12]) assert.ok(!has(turns[n - 1], 'GUILD — Promotion and placement') && !has(turns[n - 1], 'GUILD — Contract boards and Quest Ranks'), `turn ${n}: the rat fight`);
        }
    }
    assert.ok(load.reduce((a, b) => a + b, 0) / load.length < 1000, `average World Info load ${Math.round(load.reduce((a, b) => a + b, 0) / load.length)} tokens`);
});
