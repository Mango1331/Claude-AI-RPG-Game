// Location architecture .190, stage 1 (docs/LOCATION_ARCHITECTURE_190.md): one place book. A known place is a valid
// reference wherever the catalog does not show it; the player's or a reply's words for a known place resolve to it by
// its own name, a closer name inside the same settlement (only when the rest says where it lies) or a known Dungeon's
// way in; two candidates are a question; a settlement is never its own site; hidden rooms stay unknown. A refused
// arrival is shown to the player in plain words (NOT ARRIVED). Original states of the natural batches .188 (Rogue,
// Tannery Rows #79–#82) and .186 (Mage, Glimmerdeep #63).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, playerFacingLines } from '../../src/host.js';
import { extractorCatalog } from '../../src/v4/catalog.js';
import { resolvePlaceRef, knownPlaceIds, usualPersonNamed } from '../../src/v4/place_book.js';
import { validateState } from '../../src/validate.js';
import { Chat4 } from './harness.js';
import { say, linesOf, campaign, walk } from './patch8_lib.js';

const content = await loadProductContent();
const load = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(`./fixtures/${f}`, import.meta.url))));
const rogue = load('batch188_rogue_tannery.json.gz');
const mage = load('batch186_mage_grotto.json.gz');
const ROWS = 'realm.duskreach.the_tannery_rows_behind_the_ashbridge_tanneries';
function chatAt(fx, n) {
    const g = new Chat4(content);
    g.chat = fx.chat.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
const ostreks = (s) => Object.values(s.entities).filter((e) => /ostrek/i.test(e.name || '')).map((e) => e.id);

test('.190 place book .188 Rogue #80 (original answer): a visited hunting site of a completed contract is a valid reference; the report is applied (.189: extract.failed)', async () => {
    const s = foldChat(structuredClone(rogue.chat), 79).state;
    assert.equal(s.quests['quest.cull_the_stray_hound_at_the_tannery_rows'].status, 'completed');
    assert.ok(extractorCatalog(s, content, { c: true }).places.includes(ROWS), 'the extractor may name it');
    const g = chatAt(rogue, 80);
    const r = await g.reply(rogue.chat[80].mes, JSON.parse(rogue.answers.n122));
    assert.equal(r.record.extraction.status, 'applied', JSON.stringify(r.record.extraction));
    assert.deepEqual(ostreks(g.state()), ['npc.meister_ostrek'], 'Ostrek is the master of the rendering shed, no second person');
    assert.deepEqual(validateState(foldChat(structuredClone(g.chat)).state, content), []);
});

test('.190 place book .188 Rogue #81/#82 (original plan and report): "the tannery rows" is the known Tannery Rows; no second place, Meister Ostrek one person and named on the card', async () => {
    const g = chatAt(rogue, 81);
    await say(g, rogue.chat[81].mes, JSON.parse(rogue.answers.n123_plan).commands[0]);
    const outcome = JSON.stringify(g.chat.at(-1).extra.avereth.events.find((e) => e.t === 'outcome.recorded'));
    assert.match(outcome, /KNOWN AT the Tannery Rows behind the Ashbridge tanneries/);
    assert.match(outcome, /Meister Ostrek[^·]*usually in rendering shed \(npc\.meister_ostrek\)/, 'a person of a known part: named, not present');
    const before = Object.keys(g.state().places).length;
    const r = await g.reply(rogue.chat[82].mes, JSON.parse(rogue.answers.n126));
    const s = g.state();
    assert.equal(s.scene.at, ROWS, 'arrived at the known place');
    assert.equal(Object.keys(s.places).length, before, 'no new place (.189: loc.ashbridge.the_tannery_rows)');
    assert.ok(!s.places['loc.ashbridge.the_tannery_rows']);
    assert.deepEqual(ostreks(s), ['npc.meister_ostrek']);
    assert.ok(!s.scene.present.includes('npc.meister_ostrek') || r.record.events.some((e) => e.t === 'scene.entered' && e.d.id === 'npc.meister_ostrek'), 'presence only by a booked entry');
    assert.ok(!r.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'scene_context'), 'the report about the Rows is about the reached place');
    assert.deepEqual(validateState(foldChat(structuredClone(g.chat)).state, content), []);
});

test('.190 place book .186 Mage #63: "the Grotto mouth" is the known Glimmerdeep gate; standing at the gate is not yet being inside', async () => {
    const s = foldChat(structuredClone(mage.chat), 63).state;
    assert.deepEqual(resolvePlaceRef(s, { new: 'the Grotto mouth' }), { existing: 'loc.glimmerdeep_grotto' });
    for (const words of ['into the grotto mouth', 'inside the Grotto', 'the Grotto road toward the hills'])
        assert.ok(!resolvePlaceRef(s, { new: words }).existing, `${words}: no gate (going in, or a road named after it)`);
    const g = chatAt(mage, 63);
    await say(g, mage.chat[63].mes, { type: 'go', to: { new: 'the Grotto mouth' }, quote: 'walk the last quarter mile to the Grotto mouth' });
    assert.match(linesOf(g), /GOES — to Glimmerdeep Grotto/);
});

test('.190 place book: closer names only with a locative rest; places of another settlement, a settlement and its own site, a landmark reference, two candidates', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    await walk(g, 'loc.ashbridge', { text: '*i walk to ashbridge*', prose: 'Ashbridge.' });
    const s = structuredClone(g.state());
    const add = (id, name, kind, parent) => { s.places[id] = { id, name, kind, parent, realm: s.places[parent]?.realm ?? parent, tags: [] }; };
    const realm = s.places['loc.ashbridge'].realm;
    add('realm.x.rows', 'the Tannery Rows behind the Ashbridge tanneries', 'site', realm);
    add('loc.ashbridge.ford', "Dunmarrow's Ford Guildhall", 'site', 'loc.ashbridge');
    add('loc.ashbridge.carts', "the eel carts behind Brannic Vell's smokehouse", 'site', 'loc.ashbridge');
    add('realm.x.quarry_track', 'old quarry track east of Ashbridge', 'site', realm);
    add('loc.ashbridge.lane_a', 'the cooper lane by the river', 'site', 'loc.ashbridge');
    add('loc.ashbridge.lane_b', 'the cooper lane by the market', 'site', 'loc.ashbridge');
    const r = (words) => resolvePlaceRef(s, { new: words }, { from: 'loc.ashbridge' });
    assert.deepEqual(r('the tannery rows'), { existing: 'realm.x.rows' });
    assert.ok(r("Dunmarrow's Ford").new, 'a guildhall is a part, not the ford');
    assert.ok(r("Brannic Vell's smokehouse").new, 'a place behind the smokehouse is not the smokehouse');
    assert.ok(r('old quarry').new, 'the track to the quarry is not the quarry');
    assert.ok(r('the Ashbridge city gate').new && !r('the Ashbridge city gate').existing, 'never the settlement for its gate');
    assert.deepEqual(r('the cooper lane').ambiguous?.sort(), ['loc.ashbridge.lane_a', 'loc.ashbridge.lane_b']);
    // the GO handler turns two candidates into a question, never a third place
    const h = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    await walk(h, 'loc.ashbridge', { text: '*i walk to ashbridge*', prose: 'Ashbridge.', deltas: [
        { seq: 1, type: 'place.reported', place: { new: { name: 'the cooper lane by the river', kind: 'site', parent: 'loc.ashbridge' } }, how: 'told', where: 'by the river' },
        { seq: 2, type: 'place.reported', place: { new: { name: 'the cooper lane by the market', kind: 'site', parent: 'loc.ashbridge' } }, how: 'told', where: 'by the market' }] });
    const places = Object.keys(h.state().places).length;
    const asked = await say(h, '*I go to the cooper lane*', { type: 'go', to: { new: 'the cooper lane' }, quote: 'I go to the cooper lane' });
    assert.equal(asked.action, 'panels', 'a question, no generation');
    assert.match(asked.panels.join('\n'), /CLARIFY\]\nwhich place does he mean: the cooper lane by the (river|market) or the cooper lane by the (river|market)\?\nNothing was booked/);
    assert.equal(Object.keys(h.state().places).length, places);
});

test('.190 place book: a hidden room is neither a known place nor a reference; another ruin\'s room is no reference from here', () => {
    const s = { scene: { at: 'loc.ruin.hall' }, links: { 'link.1': { id: 'link.1', a: 'loc.ruin.hall', b: 'loc.ruin.vault', both: true, hidden: true } }, places: {
        'realm.r': { id: 'realm.r', name: 'R', kind: 'realm', parent: null },
        'loc.ruin': { id: 'loc.ruin', name: 'old ruin', kind: 'site', parent: 'realm.r', realm: 'realm.r', rooms: true },
        'loc.ruin.hall': { id: 'loc.ruin.hall', name: 'hall', kind: 'interior', parent: 'loc.ruin', realm: 'realm.r', visited: { turn: 1 } },
        'loc.ruin.vault': { id: 'loc.ruin.vault', name: 'hidden vault', kind: 'interior', parent: 'loc.ruin', realm: 'realm.r' },
        'loc.keep': { id: 'loc.keep', name: 'keep', kind: 'site', parent: 'realm.r', realm: 'realm.r', rooms: true },
        'loc.keep.guard': { id: 'loc.keep.guard', name: 'guard room', kind: 'interior', parent: 'loc.keep', realm: 'realm.r', visited: { turn: 1 } },
    } };
    const ids = knownPlaceIds(s);
    assert.ok(!ids.includes('loc.ruin.vault'), 'the hidden vault');
    assert.ok(!ids.includes('loc.keep.guard'), 'the other ruin\'s room');
    assert.ok(ids.includes('loc.keep') && ids.includes('loc.ruin.hall'));
    assert.deepEqual(resolvePlaceRef(s, 'loc.ruin.vault'), { invalid: 'loc.ruin.vault is not known to Alaric' });
});

test('.190 N2: a refused arrival is shown to the player as NOT ARRIVED with where he remains and the claimed place; the bookkeeping line stays hidden', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    await walk(g, 'loc.ashbridge', { text: '*i walk to ashbridge*', prose: 'Ashbridge.' });
    await say(g, '*I talk to the gatekeeper*');
    const r = await g.reply('He walked on to the smithy by the well.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: { new: { name: 'the smithy by the well', kind: 'site', parent: 'loc.ashbridge' } }, forced_by: null, with: null }] });
    assert.ok(r.record.rejected.some((x) => x.rule === 'no_go' && x.to?.name === 'the smithy by the well'));
    assert.match(r.record.panel, /NOT ARRIVED — Alaric remains at Ashbridge; the smithy by the well was not reached\./);
    const seen = playerFacingLines(r.record.panel).join('\n');
    assert.match(seen, /NOT ARRIVED — Alaric remains at Ashbridge/);
    assert.doesNotMatch(seen, /ENGINE REFUSED/);
});

test('.190 place book: a shorter name is the known person of that place only – never of another place, never one of two', () => {
    const s = { places: {
        'r': { id: 'r', kind: 'realm', parent: null }, 'rows': { id: 'rows', kind: 'site', parent: 'r' }, 'shed': { id: 'shed', kind: 'interior', parent: 'rows' },
        'mill': { id: 'mill', kind: 'site', parent: 'r' } }, entities: {
        a: { id: 'a', kind: 'npc', name: 'Meister Ostrek', at: 'shed', status: 'alive' },
        b: { id: 'b', kind: 'npc', name: 'Hanne Vell', at: 'mill', status: 'alive' },
        c: { id: 'c', kind: 'npc', name: 'Tomas Vell', at: 'mill', status: 'alive' } } };
    assert.equal(usualPersonNamed(s, 'Ostrek', 'rows'), 'a', 'a part of the Rows is the Rows');
    assert.equal(usualPersonNamed(s, 'Ostrek', 'mill'), null, 'not the people of another place');
    assert.equal(usualPersonNamed(s, 'Vell', 'mill'), null, 'two candidates: a new person or a question, never a guess');
    assert.equal(usualPersonNamed(s, 'Meister Ostrek', 'rows'), null, 'the full name is the resolver\'s case');
});
