// Original User08 .205, M11 board and M19/M21 entry. The fixture keeps the message/event prefix,
// the two physical board answers, the original plans and M22's extraction (main: user-20261122-161817-205).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { speciesAnchor, speciesMatches } from '../../src/content.js';
import { parseBoard } from '../../src/v4/guild.js';
import { foldChat } from '../../src/host.js';
import { boardFor, generateBoard, prepareGenerationAsync, processReplyAny, runExtraction } from '../../src/v4/runtime.js';
import { playerTurnV4 } from '../../src/v4/turn.js';

const content = await loadProductContent();
const f = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/user08_205_entry_board.json.gz', import.meta.url))));
const root = 'loc.old_crown_catacombs';
const first = root + '.l1_s1';
function folded(chat) {
    const result = foldChat(chat);
    assert.deepEqual(result.errors, []);
    return result.state;
}
async function play(index, boards = []) {
    const chat = structuredClone(f.chat.slice(0, index + 1));
    delete chat[index].extra.avereth;
    const calls = [];
    await prepareGenerationAsync(chat, content, { llm: async ({purpose}) => {
        calls.push(purpose);
        if (purpose === 'plan') return f.plans[index];
        assert.equal(purpose, 'board');
        assert.ok(boards.length, 'unexpected extra board request');
        return boards.shift();
    }});
    return {chat, calls};
}

for (const index of [19, 21]) test('User08 original entry at M' + index + ' needs reply-bound arrival', async () => {
    const {chat, calls} = await play(index);
    assert.deepEqual(calls, ['plan']);
    const before = folded(chat);
    assert.equal(before.last.outcome.resolutions[0].status, 'authorized');
    assert.equal(before.scene.at, root);
    assert.equal(before.places[first], undefined);
    assert.equal(before.last.outcome.auth.gos[0].within, undefined);
    chat.push({is_user:false, mes:f.chat[22].mes, extra:{}});
    assert.ok(processReplyAny(chat, index + 1, content, {}).extract);
    await runExtraction(chat, index + 1, content, async () => JSON.stringify(f.entryReport));
    assert.equal(chat.at(-1).extra.avereth.extraction.status, 'applied');
    const state = folded(chat);
    assert.equal(state.scene.at, first);
    assert.deepEqual(state.scene.present, folded(f.chat).scene.present);
});

function step(state, changes = {}) {
    const cmd = {...JSON.parse(f.plans[19]).commands[0], ...changes};
    return playerTurnV4(state, content, cmd.quote, {c:true, commands:[cmd], msg:19});
}
test('an unconfirmed entry cannot book the room or the two foes', async () => {
    const {chat} = await play(19);
    chat.push({is_user:false, mes:'Alaric pauses at the threshold.', extra:{}});
    assert.ok(processReplyAny(chat, 20, content, {}).extract);
    const report = {scene:'here', expected:{1:{arrived:false, at:null, with:null, met:null}}, deltas:[]};
    await runExtraction(chat, 20, content, async () => JSON.stringify(report));
    const state = folded(chat);
    assert.equal(chat[20].extra.avereth.extraction.status, 'applied');
    assert.equal(state.scene.at, root);
    assert.equal(state.places[first], undefined);
    assert.deepEqual(state.scene.present, folded(f.chat.slice(0,19)).scene.present);
});
test('entry rejects remote scopes, a different destination, and ordinary exploration at the gate', () => {
    const gate = folded(f.chat.slice(0, 19));
    for (const changes of [
        {within:'loc.alderwatch'},
        {to:'loc.alderwatch'},
        {quote:'I go on to the herb garden', to:{new:'the herb garden'}},
        {quote:'I enter the watch house', to:{new:'the watch house'}},
    ]) {
        const r = step(gate, changes);
        assert.equal(r.outcome.resolutions[0].status, 'refused');
        assert.equal(r.outcome.auth.gos.length, 0);
    }
    const away = folded(f.chat.slice(0, 17));
    assert.notEqual(away.scene.at, root);
    assert.equal(step(away).outcome.auth.gos.length, 0);
    const twoSteps = [{seq:1, type:'go', to:'loc.alderwatch', quote:'I return to Alderwatch'},
        {...JSON.parse(f.plans[19]).commands[0], seq:2}];
    const route = playerTurnV4(gate, content, 'I return to Alderwatch and then I enter the dungeon', {c:true, commands:twoSteps});
    assert.equal(route.outcome.auth.gos.length, 1);
    assert.equal(route.outcome.auth.gos[0].to, 'loc.alderwatch');
    assert.equal(route.outcome.resolutions[1].reason, 'invalid local habitat scope');
});
test('entry still requires a free place and consent to a nonwaived fee', () => {
    for (const obstacle of ['fee', 'capacity']) {
        const s = folded(f.chat.slice(0, 19));
        if (obstacle === 'fee') {
            s.dungeons[root].gate.contract_free = false;
            s.dungeons[root].gate.fee_cp = 25;
        } else s.dungeons[root].capacity = 0;
        const r = step(s);
        assert.equal(r.outcome.resolutions[0].reason, obstacle === 'fee' ? 'fee' : 'gate');
        assert.equal(r.outcome.auth.gos.length, 0);
        assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp);
        assert.equal(r.state.scene.at, root);
    }
});

test('re-entry uses the established first room and its actual passage', () => {
    const s = folded(f.chat.slice(0,19));
    const visited = folded(f.chat);
    s.places[first] = visited.places[first];
    s.links = visited.links;
    const open = step(s, {to:first});
    assert.equal(open.outcome.auth.gos[0].to, first);
    assert.equal(open.state.scene.at, root);
    const link = Object.values(s.links).find(l => l.a === root && l.b === first);
    s.features['feature.door'] = {id:'feature.door', name:'locked door', kind:'obstacle', status:'active', at:root};
    link.feature = 'feature.door';
    const blocked = step(s, {to:first});
    assert.equal(blocked.outcome.resolutions[0].reason, 'blocked');
    assert.equal(blocked.outcome.auth.gos.length, 0);
});

const boardEvents = chat => chat[11].extra.avereth.events.filter(e =>
    ['place.created','quest.created','board.refreshed'].includes(e.t));
test('User08 first board answer books the original five contracts and ten events in one board call', async () => {
    const replay = await play(11, [...f.boards]);
    assert.deepEqual(replay.calls, ['plan','board']);
    const original = f.chat.slice(0,12);
    assert.equal(boardEvents(original).length, 10);
    assert.deepEqual(boardEvents(replay.chat), boardEvents(original));
    assert.equal(Object.keys(folded(replay.chat).quests).length, 5);
    assert.deepEqual(folded(replay.chat).quests, folded(original).quests);
});

test('an ambiguous species is never auto-corrected; publish only independently valid notices', async () => {
    for (const problem of ['hybrid', 'pike-heron', 'wrong unit', 'second fault', 'duplicate title', 'population', 'quota']) {
        const s = folded(f.chat.slice(0,11));
        const need = boardFor(s, content, JSON.parse(f.plans[11]).commands, {c:true});
        const {listings} = JSON.parse(f.boards[0]);
        const hunt = listings[0];
        if (problem === 'hybrid') {
            hunt.habitat.species = 'wolf turtle';
            hunt.objectives[0].what = 'wolf turtles';
        }
        if (problem === 'pike-heron') {
            hunt.habitat.species = 'marsh pike-heron';
            hunt.habitat.anchor = 'raptor';
            Object.assign(hunt.objectives[0], {what:'marsh pike-herons', unit:'birds'});
        }
        if (problem === 'wrong unit') hunt.objectives[0].unit = 'wolves';
        if (problem === 'second fault') listings[1].level = 100;
        if (problem === 'duplicate title') listings[1].title = hunt.title;
        if (problem === 'population') {
            s.places['loc.test_pond'] = {id:'loc.test_pond', name:hunt.objectives[0].where, kind:'site',
                realm:s.places[need.branch].realm, parent:need.branch, population:{species:'boar', anchor:'boar', levels:[4,7]}};
        }
        if (problem === 'quota') {
            const extra = structuredClone(hunt);
            extra.title = 'Cull the Creek Vipers';
            extra.habitat.species = 'viper';
            extra.habitat.anchor = speciesAnchor(content, 'viper').id;
            extra.objectives[0] = {...hunt.objectives[0], what:'vipers', unit:'vipers', where:'the north creek'};
            listings[4] = extra;
            const corrected = structuredClone(listings);
            corrected[0].habitat.anchor = 'armored_beast';
            const check = parseBoard(JSON.stringify({listings:corrected}), content, need, s);
            assert.deepEqual(check.refused, []);
            assert.match(check.errors[0], /requires 4 hunts/);
        }
        let attempts = 0;
        const result = await generateBoard(async () => ++attempts === 1 ? JSON.stringify({listings}) : 'invalid', s, content, need);
        const ambiguousBoard = problem === 'duplicate title';
        assert.equal(attempts, ambiguousBoard || problem === 'second fault' ? 2 : 1, problem);
        const expected = ambiguousBoard || problem === 'second fault' ? 0 : 4;
        assert.equal(result.listings.length, expected, problem);
        assert.ok(result.listings.every(l => l.title !== hunt.title),problem);
    }
});

test('an unlisted species can retain its supplied anchor without providing catalog evidence for a repair', () => {
    assert.equal(speciesAnchor(content, 'moon burrower', 'aquatic').id, 'aquatic');
    assert.deepEqual(speciesMatches(content, 'moon burrower'), []);
});
