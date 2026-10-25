import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { parseExtraction, worldVocab } from '../../src/v4/extract.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { catalogText } from '../../src/v4/interpret.js';
import { buildContext } from '../../src/context.js';
import { deriveCharacter } from '../../src/derived.js';
import { itemProfile } from '../../src/v4/items.js';
const content = await loadProductContent(), clone = structuredClone;
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run15_gear.json', import.meta.url)));
const a = JSON.parse(fs.readFileSync(new URL('./fixtures/run15_trade.json', import.meta.url)));
const vocab = JSON.parse(fs.readFileSync(new URL('../../content/deltas.json', import.meta.url)));
const base = () => clone(f.cases[96].state), seller = 'npc.npcsmith_woman';
function answer(s, name, equipment = null) {
    return { scene: s.scene.at, expected: {}, deltas: [{ seq: 1, type: 'offer', seller,
        lines: [{ what: name, kind: 'goods', service: null, qty: 1, price_cp: 80, said: 'I sell it for eight silver.', equipment }] }] };
}
const publish = (s, name, equipment = null) => applyWorld(s, content, answer(s, name, equipment), { msg: 200, prose: 'I sell it for eight silver.' });
const offers = r => r.events.filter(e => e.t === 'offer.created').map(e => e.d.offer);
function run(s, cs, c = content) {
    const state = clone(s), events = [];
    const ctx = resolveCommands(state, c, cs.map((x, i) => ({ seq: i + 1, ...x })), e => { events.push(e); applyEvent(state, e); }, { c: true, msg: 201 });
    return { state, events, ctx };
}
const buy = o => ({ type: 'offer.accept', offer: o.id, lines: ['l1'], quote: "I'll take it." });
const equip = (id, slot = null) => ({ type: 'equip', object: id, slot, quote: 'I equip it.' });
const created = r => r.events.find(e => e.t === 'object.created')?.d.object;

for (const t of [55, 96]) test(`Run15 T${t} original: unsupported shin-guards are not published as new mechanical gear`, () => {
    const c = f.cases[t], r = applyWorld(clone(c.state), content, clone(c.answer), { msg: c.i, prose: c.prose });
    assert.ok(r.rejected.some(x => x.rule === 'gear_offer'));
    assert.ok(!offers(r).some(o => o.lines.some(l => l.kind === 'goods' && /shin-guards/i.test(l.what))));
});
test('newly declared equipment needs a supported profile before an offer can be bought', () => {
    const r = publish(base(), 'moonshell battle suit', true);
    assert.equal(offers(r).length, 0); assert.ok(r.rejected.some(x => x.rule === 'gear_offer'));
});
test('ordinary tools remain available without any combat profile', () => {
    const r = publish(base(), 'a rope and a pouch', false), o = offers(r)[0]; assert.ok(o);
    const b = run(r.state, [buy(o)]); assert.equal(created(b).use, 'tool');
    assert.ok(!created(b).profile?.kind);
});
test('supported gear is fixed at publication and survives purchase/equip with its exact values', () => {
    const r = publish(base(), 'fine chainmail', true), o = offers(r)[0], profile = clone(o.lines[0].profile);
    assert.equal(profile.kind, 'gear'); assert.equal(profile.slot, 'armor');
    const changed = clone(content); changed.gear.f_rank_reference.heavy_armor_def = [99, 99];
    const b = run(r.state, [buy(o)], changed), item = created(b);
    assert.deepEqual(item.profile, profile);
    const before = deriveCharacter(b.state.entities.pc.sheet, content);
    const e = run(b.state, [equip(item.id)]), after = deriveCharacter(e.state.entities.pc.sheet, content);
    assert.equal(e.state.entities.pc.sheet.equipment.armor.object, item.id);
    assert.equal(e.state.entities.pc.sheet.equipment.armor.def, profile.def);
    assert.ok(after.def > before.def, 'real derived defense improves');
});
test('buy then equip the exact newly bought name works in one player turn', () => {
    const r = publish(base(), 'fine chainmail', true), o = offers(r)[0];
    const b = run(r.state, [buy(o), equip({ new: 'fine chainmail' })]);
    assert.ok(b.events.some(e => e.t === 'item.equipped' && e.d.slot === 'armor'));
    assert.equal(b.events.filter(e => e.t === 'coin.changed').length, 1);
});
test('new-name equip cannot use someone else’s possession or an ambiguous purchase', () => {
    const s = base(); s.objects.foreign = { id: 'foreign', name: 'fine chainmail', kind: 'item', qty: 1, holder: { entity: seller }, profile: itemProfile(content, { name: 'fine chainmail' }) };
    const r = run(s, [equip({ new: 'fine chainmail' })]); assert.ok(!r.events.some(e => e.t === 'item.equipped'));
    const published = publish(base(), 'fine chainmail', true), first = offers(published)[0];
    const second = clone(first); second.id = 'offer.independent'; published.state.offers[second.id] = second;
    const b = run(published.state, [buy(first), buy(second), equip({ new: 'fine chainmail' })]);
    assert.equal(b.events.filter(e => e.t === 'object.created').length, 2);
    assert.ok(!b.events.some(e => e.t === 'item.equipped'), 'two exact new names require an object ID');
});
for (const slot of ['leg', 'weapon']) test(`an armor item cannot create or overwrite slot ${slot}`, () => {
    const r = publish(base(), 'fine chainmail', true), o = offers(r)[0], b = run(r.state, [buy(o)]), item = created(b);
    const e = run(b.state, [equip(item.id, slot)]);
    assert.ok(!e.events.some(e => e.t === 'item.equipped' || e.t === 'object.consumed'));
    assert.equal(e.state.objects[item.id].holder.entity, 'pc');
    assert.deepEqual(e.state.entities.pc.sheet.equipment, b.state.entities.pc.sheet.equipment);
});
test('a malformed new equipment offer cannot charge coin through a command purchase', () => {
    const r = publish(base(), 'fine chainmail', true), o = offers(r)[0]; delete r.state.offers[o.id].lines[0].profile;
    const b = run(r.state, [buy(o)]); assert.ok(!b.events.some(e => e.t === 'coin.changed' || e.t === 'object.created'));
});
test('an unsupported equipment offer cannot fulfill a preauthorized conditional purchase', () => {
    const s = base(); s.decisions.push({ id: 'dec.test.gear', kind: 'purchase', what: 'moonshell battle suit', seller, at: s.scene.at, max_cp: 100, any_price: false, qty: 1, seq: 1 });
    const r = publish(s, 'moonshell battle suit', true);
    assert.ok(!r.events.some(e => e.t === 'coin.changed' || e.t === 'object.created'));
});
test('cosmetic merchandise cannot gain gear values later through equip name inference', () => {
    const r = publish(base(), 'ceremonial shield', false), o = offers(r)[0];
    assert.equal(o.lines[0].profile, null);
    const b = run(r.state, [buy(o)]), item = created(b); assert.equal(item.profile, null);
    const e = run(b.state, [equip(item.id)]); assert.ok(!e.events.some(e => e.t === 'item.equipped'));
});
test('canonical offer and inventory text expose slot and values before the equip decision', () => {
    const r = publish(base(), 'fine chainmail', true), o = offers(r)[0];
    const text = catalogText(buildCatalog(r.state, content, { c: true }));
    assert.match(text, /armor.*DEF|DEF.*armor/); assert.match(text, /GEAR MARKET/);
    const b = run(r.state, [buy(o)]);
    assert.match(catalogText(buildCatalog(b.state, content, { c: true })), /armor.*DEF|DEF.*armor/);
    assert.match(buildContext(r.state, content, { input: 'I shop for armor.', outcome: { auth: { c: true } } }).text, /GEAR MARKET/);
});
test('ordinary merchandise is explicitly shown as having no combat stats', () => {
    const r = publish(base(), 'ceremonial shield', false);
    assert.match(catalogText(buildCatalog(r.state, content, { c: true })), /no combat stats/i);
});
test('extractor schema accepts only the equipment intent flag, never supplied slot or stats', () => {
    const s = base(), wire = answer(s, 'fine chainmail', true), ids = { places: Object.keys(s.places), objects: Object.keys(s.objects) };
    let p = parseExtraction(JSON.stringify(wire), worldVocab(vocab, s), ids, {}); assert.equal(p.valid, true, p.errors?.join(';'));
    wire.deltas[0].lines[0].slot = 'leg'; wire.deltas[0].lines[0].def = 999;
    p = parseExtraction(JSON.stringify(wire), worldVocab(vocab, s), ids, {}); assert.equal(p.valid, false);
});
test('food and potions are unaffected by ordinary merchandise classification', () => {
    for (const [name, use] of [['bread', 'food'], ['healing potion', 'consumable']]) {
        const r = publish(base(), name, null), b = run(r.state, [buy(offers(r)[0])]); assert.equal(created(b).use, use);
    }
});
test('equipment rank limits remain enforced', () => {
    const r = publish(base(), '[D] chainmail', true), b = run(r.state, [buy(offers(r)[0])]);
    const e = run(b.state, [equip(created(b).id)]); assert.ok(!e.events.some(e => e.t === 'item.equipped'));
});
test('old unmarked offers remain usable and Ruleset 1 keeps its previous behavior', () => {
    const c = a.cases.duplicate, b = run(c.state, [{ ...c.commands[0], quote: "I'll take the pair." }]); assert.ok(created(b));
    const s = base(); s.meta.ruleset = 1;
    assert.ok(offers(publish(s, 'shin-guards cut for a man', null)).length);
});
test('gear acquisition and equipment survive event replay, JSON reload and alternative resolution', () => {
    const s = base(), r = publish(s, 'fine chainmail', true), o = offers(r)[0], b = run(r.state, [buy(o)]), e = run(b.state, [equip(created(b).id)]);
    const replay = clone(s); for (const ev of JSON.parse(JSON.stringify([...r.events, ...b.events, ...e.events]))) applyEvent(replay, ev);
    assert.deepEqual(JSON.parse(JSON.stringify(replay)), JSON.parse(JSON.stringify(e.state)));
    assert.deepEqual(run(b.state, [equip(created(b).id)]).events, e.events);
});

test('review P2: equip one of two bought armor units, unequip and re-equip without losing the spare', () => {
    const s = base(), wire = answer(s, 'fine chainmail', true);
    Object.assign(wire.deltas[0].lines[0], { qty: 2, price_cp: 160, said: 'Both for sixteen silver.' });
    const r = applyWorld(s, content, wire, { msg: 200, prose: 'Both for sixteen silver.' });
    const b = run(r.state, [buy(offers(r)[0])]), pile = created(b);
    assert.equal(pile.qty, 2);
    const e = run(b.state, [equip(pile.id)]), worn = e.state.entities.pc.sheet.equipment.armor.object;
    assert.equal(e.state.objects[pile.id].holder.entity, 'pc');
    assert.equal(e.state.objects[pile.id].qty, 1);
    assert.notEqual(worn, pile.id);
    assert.equal(e.state.objects[worn].qty, 1);
    assert.deepEqual(e.state.objects[worn].profile, pile.profile);
    const u = run(e.state, [{ type: 'unequip', object: worn, quote: 'I remove the chainmail.' }]);
    const bagUnits = state => Object.values(state.objects).filter(o => o.name === pile.name && o.holder?.entity === 'pc').reduce((n, o) => n + o.qty, 0);
    assert.equal(bagUnits(u.state), 2);
    const again = run(JSON.parse(JSON.stringify(u.state)), [equip(worn)]);
    assert.equal(bagUnits(again.state), 1);
    assert.equal(again.state.entities.pc.sheet.equipment.armor.object, worn);
    const replay = clone(s);
    for (const ev of JSON.parse(JSON.stringify([...r.events, ...b.events, ...e.events, ...u.events, ...again.events]))) applyEvent(replay, ev);
    assert.deepEqual(JSON.parse(JSON.stringify(replay)), JSON.parse(JSON.stringify(again.state)));
    assert.deepEqual(run(b.state, [equip(pile.id)]).events, e.events, 'alternative resolution creates the same unit once');
});
test('review P2: an existing stack splits a unit with a collision-free ID and returns it when replaced', () => {
    const s = base(), profile = itemProfile(content, { name: 'fine chainmail' });
    s.objects.pile = { id: 'pile', name: 'fine chainmail', kind: 'item', stack: true, qty: 3, profile, holder: { entity: 'pc' } };
    s.objects.pile_equipped = { id: 'pile_equipped', name: 'previous item', kind: 'item', qty: 1, holder: { consumed: 'used' } };
    const e = run(s, [equip('pile')]), first = e.state.entities.pc.sheet.equipment.armor.object;
    assert.equal(e.state.objects.pile.holder.entity, 'pc'); assert.equal(e.state.objects.pile.qty, 2);
    assert.notEqual(first, 'pile_equipped'); assert.equal(e.state.objects.pile_equipped.name, 'previous item');
    const next = run(e.state, [equip('pile')]);
    assert.equal(next.state.objects.pile.qty, 1);
    assert.equal(next.state.objects[first].holder.entity, 'pc');
    assert.notEqual(next.state.entities.pc.sheet.equipment.armor.object, first);
    assert.equal(Object.values(next.state.objects).filter(o => o.name === 'fine chainmail').reduce((n, o) => n + o.qty, 0), 3);
});
test('review P2: slot and rank refusals do not split or consume stacked gear', () => {
    for (const [name, slot] of [['fine chainmail', 'leg'], ['[D] chainmail', null]]) {
        const s = base(); s.objects.pile = { id: 'pile', name, kind: 'item', stack: true, qty: 2, profile: itemProfile(content, { name }), holder: { entity: 'pc' } };
        const r = run(s, [equip('pile', slot)]);
        assert.ok(!r.events.some(e => ['object.moved', 'object.consumed', 'item.equipped'].includes(e.t)));
        assert.deepEqual(r.state.objects, s.objects);
    }
});
