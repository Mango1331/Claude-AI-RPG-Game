import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { applyEvent } from '../../src/state.js';
import { validateState } from '../../src/validate.js';
import { applyWorld } from '../../src/v4/world.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { processReplyAny, runExtraction, extractionRequest } from '../../src/v4/runtime.js';
import { parseExtraction } from '../../src/v4/extract.js';
import { parseBoard, bookBoard } from '../../src/v4/guild.js';
import { acceptanceWhy, heldUnits } from '../../src/v4/trade.js';
import { personLabel } from '../../src/v4/catalog.js';

const content = await loadProductContent();
const original = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/batch21_integration146.json.gz', import.meta.url))));
const source = t => structuredClone(original.turns[t]);
const tx = r => r.events.filter(e => e.t === 'transaction.completed');
function replay(before, r) {
    const state = structuredClone(before);
    for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(state, e);
    assert.deepEqual(state, r.state);
    assert.deepEqual(validateState(state, content), []);
}
function returnedSmith(answer) {
    const a = structuredClone(answer);
    a.deltas = a.deltas.map(d => ({ ...d, seq: d.seq + (d.seq > 1 ? 1 : 0) }));
    a.deltas.splice(1, 0, { seq: 2, type: 'enter', who: 'npc.npcalderwatchsmith', evidence: 'The smith finished his stroke, set the tongs down, and straightened.', scene: null });
    return a;
}
function pending40() {
    const chat = structuredClone(original.chat40);
    chat.push({ mes: source(40).prose, is_user: false, extra: {} });
    assert.equal(processReplyAny(chat, 80, content).extract, true);
    return chat;
}
function parsed(chat, a) {
    const req = extractionRequest(chat, 80, content);
    return parseExtraction(JSON.stringify(a), req.vocab, req.ids, req.expectedKeys, {
        sceneRequired: req.sceneRequired, startScene: req.startScene, state: req.state,
        content, explicitArrivals: req.sceneRequired, reply: chat[80].mes,
    });
}

test('.146 original T40: bounded extractor repair restores the known smith before his offer, host/reload/swipe', async () => {
    const chat = pending40(), before = foldChat(chat, 80).state;
    const calls = [];
    const r = await runExtraction(chat, 80, content, async ({ purpose, messages }) => {
        calls.push({ purpose, messages });
        return JSON.stringify(calls.length === 1 ? source(40).answer : returnedSmith(source(40).answer));
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].purpose, 'extract_repair');
    assert.match(JSON.stringify(calls[1].messages), /npc\.npcalderwatchsmith/);
    assert.equal(r.applied, true);
    const after = foldChat(chat);
    assert.deepEqual(after.errors, []);
    assert.ok(after.state.scene.present.includes('npc.npcalderwatchsmith'));
    assert.ok(Object.values(after.state.offers).some(o => o.seller === 'npc.npcalderwatchsmith' && o.turn === after.state.turn));
    assert.equal(after.state.entities.pc.sheet.coin_cp, before.entities.pc.sheet.coin_cp);
    assert.equal(rec(chat[80]).events.filter(e => e.t === 'scene.entered' && e.d.id === 'npc.npcalderwatchsmith').length, 1);
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(chat))).state, after.state);
    await runExtraction(chat, 80, content, () => { throw Error('already applied'); });
    assert.equal(calls.length, 2);
    const swipe = pending40();
    await runExtraction(swipe, 80, content, () => JSON.stringify(returnedSmith(source(40).answer)));
    const domain = c => rec(c[80]).events.filter(e => e.t !== 'extract.applied');
    assert.deepEqual(domain(swipe), domain(chat), 'same economic/world events; repair timing is telemetry');
});

test('.146 T40: already correct enter has no additional repair; a closed shop never auto-restores its owner', async () => {
    for (const [answer, meets] of [[returnedSmith(source(40).answer), true],
        [{ ...source(40).answer, deltas: source(40).answer.deltas.filter(d => d.type === 'arrive') }, false]]) {
        const chat = pending40();
        if (!meets) chat[80].mes = 'Alaric enters the smithy. The smith is away and the counter is empty.';
        processReplyAny(chat, 80, content);
        let calls = 0;
        await runExtraction(chat, 80, content, () => { calls++; return JSON.stringify(answer); });
        assert.equal(calls, 1);
        assert.equal(foldChat(chat).state.scene.present.includes('npc.npcalderwatchsmith'), meets);
    }
});

test('.146 invented merchant IDs request correction, never become presence or money by themselves', () => {
    const chat = pending40(), a = source(40).answer;
    a.deltas.find(d => d.type === 'offer').seller = 'npc.alderwatch_smith';
    const p = parsed(chat, a);
    assert.ok(p.valid);
    assert.ok(p.issues.some(x => /counterparty|seller|merchant/i.test(x.why)));
    const f = source(40), r = applyWorld(f.before, content, a, { msg: 80, prose: f.prose });
    assert.equal(tx(r).length, 0);
    assert.equal(r.state.entities['npc.alderwatch_smith'], undefined);
});

for (const t of [49, 53]) test(`.146 original T${t}: spare starter armor is a held catalog item, a firm bid can be accepted once`, () => {
    const f = source(t);
    assert.equal(heldUnits(f.before, 'item.starter_heavy_armor'), 1);
    const reported = applyWorld(f.before, content, f.answer, { msg: 2 * t, prose: f.prose });
    assert.equal(reported.rejected.some(x => /not his/.test(x.why)), false);
    // T53's original report quotes the later "twenty-five" without currency. S2 correctly keeps it unbound.
    // Its actual preceding sentence supplies a complete total; a corrected model report uses those same words.
    if (t === 53) {
        assert.ok(reported.rejected.some(x => /currency_missing/.test(x.why)));
        const b = f.answer.deltas.find(d => d.type === 'bid');
        b.said = 'I can give you twenty-five copper for it.';
        b.pricing = { basis: 'total', quote: 'twenty-five copper', currency_quote: null };
    }
    const r = t === 53 ? applyWorld(f.before, content, f.answer, { msg: 2 * t, prose: f.prose }) : reported;
    const bid = r.events.find(e => e.t === 'offer.created' && e.d.offer.bid)?.d.offer;
    assert.ok(bid);
    assert.equal(bid.lines[0].object, 'item.starter_heavy_armor');
    assert.equal(bid.price_cp, t === 49 ? 30 : 25);
    assert.equal(Object.values(r.state.objects).filter(o => o.source?.item === 'starter_heavy_armor').length, 0, 'no artificial inventory object');
    replay(f.before, r);
    const accepted = playerTurnV4(r.state, content, 'I accept the armor offer.', { msg: 301, c: true,
        commands: [{ seq: 1, type: 'offer.accept', offer: bid.id, quote: 'I accept the armor offer.' }] });
    assert.equal(tx(accepted).length, 1);
    assert.equal(accepted.state.entities.pc.sheet.coin_cp, r.state.entities.pc.sheet.coin_cp + bid.price_cp);
    assert.equal(heldUnits(accepted.state, 'item.starter_heavy_armor'), 0);
    replay(r.state, accepted);
    const again = playerTurnV4(accepted.state, content, 'I accept the armor offer.', { msg: 303, c: true,
        commands: [{ seq: 1, type: 'offer.accept', offer: bid.id, quote: 'I accept the armor offer.' }] });
    assert.equal(tx(again).length, 0);
});

test('.146 no bid for nonexistent, over-quantity or merely equipped template items', () => {
    for (const [ref, qty] of [['item.unknown', 1], ['item.starter_longsword_r2', 1], ['item.starter_heavy_armor', 2]]) {
        const f = source(49), a = { ...f.answer, deltas: [f.answer.deltas.find(d => d.type === 'bid')] };
        a.deltas[0].lines = [{ object: ref, qty }];
        const r = applyWorld(f.before, content, a, { msg: 98, prose: f.prose });
        assert.equal(r.events.some(e => e.t === 'offer.created'), false);
        assert.equal(tx(r).length, 0);
    }
});

for (const t of [21, 25, 61]) test(`.146 original T${t}: established descriptive counterparty accepts the correct offer`, () => {
    const f = source(t), r = playerTurnV4(f.beforeInput, content, f.input, { msg: 2 * t - 1, c: true, commands: f.commands });
    assert.equal(tx(r).length, 1);
    assert.equal(tx(r)[0].d.cp, t === 61 ? 2 : 14);
    replay(f.beforeInput, r);
});

test('.146 descriptive party support never accepts an explicitly different named person', () => {
    const f = source(61), offer = f.beforeInput.offers['offer.t120.17'];
    for (const party_words of ['the landlady', 'landlady', 'the innkeeper'])
        assert.equal(acceptanceWhy({ party_words }, offer, personLabel(f.beforeInput, content, offer.seller)), null);
    for (const party_words of ['Malla', 'the furrier', 'the old woman'])
        assert.match(acceptanceWhy({ party_words }, offer, personLabel(f.beforeInput, content, offer.seller)), /counterparty/);
});

for (const n of [48, 49, 178]) test(`.146 original Board Call${n}: grammatical species number preserves the established population`, () => {
    const f = structuredClone(original.boards[n]);
    const before = JSON.stringify(f.state);
    const r = parseBoard(f.text, content, f.need, f.state);
    assert.equal(r.listings?.length, 5);
    assert.deepEqual(r.refused, []);
    assert.deepEqual(r.errors, []);
    assert.equal(JSON.stringify(f.state), before, 'validation does not alter existing world state');
    const boar = r.listings.find(l => l.habitat?.anchor === 'boar');
    assert.equal(boar.habitat.species, 'boars', 'stored species remains canonical');
    const s = structuredClone(f.state), events = [];
    bookBoard(s, content, f.need, r.listings, e => { events.push(e); applyEvent(s, e); });
    assert.equal(events.filter(e => e.t === 'quest.created').length, 5);
    assert.deepEqual(validateState(s, content), []);
});

test('.146 original Call179 still refuses missing habitats; real species, anchor, age and level conflicts stay refused', () => {
    const broken = structuredClone(original.boards[179]);
    assert.equal(parseBoard(broken.text, content, broken.need, broken.state).listings.length, 2);
    for (const change of [h => h.species = 'red boars', h => h.anchor = 'wolf', h => h.min_level = 1,
        h => h.max_level = 3, h => h.life_stage = 'young']) {
        const f = structuredClone(original.boards[48]), a = JSON.parse(f.text.replace(/^```json\s*/, '').replace(/```\s*$/, ''));
        change(a.listings.find(l => l.habitat?.anchor === 'boar').habitat);
        assert.ok(parseBoard(JSON.stringify(a), content, f.need, f.state).refused.length);
    }
});

test('.146 board duplicate targets do not become legal through singular/plural in one answer', () => {
    const f = structuredClone(original.boards[48]), a = JSON.parse(f.text.replace(/^```json\s*/, '').replace(/```\s*$/, ''));
    const boar = a.listings.find(l => l.habitat?.anchor === 'boar');
    a.listings[2] = structuredClone(boar);
    a.listings[2].title = 'Another boar contract'; a.listings[2].habitat.species = 'boars';
    const r = parseBoard(JSON.stringify(a), content, f.need, f.state);
    assert.ok(r.refused.some(x => /duplicate counted hunt/.test(x.why)));
});

test('.146 integration: return to smith, sell spare armor, buy/equip 260-cp sword once; exact event replay', () => {
    const f = source(40);
    let r = applyWorld(f.before, content, returnedSmith(f.answer), { msg: 80, prose: f.prose });
    replay(f.before, r);
    const offer = r.events.find(e => e.t === 'offer.created')?.d.offer;
    assert.ok(offer);
    const sword = offer.lines.find(l => l.profile?.quality === 'superior' && l.profile?.base === 'longsword')
        || offer.lines.find(l => /superior/.test(l.what));
    assert.equal(sword.price_cp, 260);
    const input = 'I sell my spare starter armor to the smith for thirty copper.';
    const sale = playerTurnV4(r.state, content, input, { msg: 201, c: true, commands: [{ seq: 1, type: 'sell',
        object: 'item.starter_heavy_armor', qty: 1, to: 'npc.npcalderwatchsmith', min_cp: 30,
        price_evidence: { basis: 'total', quote: 'thirty copper', currency_quote: null }, quote: input }] });
    replay(r.state, sale);
    const a = source(49).answer;
    a.deltas = a.deltas.filter(d => d.type === 'bid').map(d => ({ ...d, buyer: 'npc.npcalderwatchsmith' }));
    r = applyWorld(sale.state, content, a, { msg: 202, prose: source(49).prose });
    assert.equal(tx(r).length, 1);
    assert.equal(r.state.entities.pc.sheet.coin_cp, 271);
    replay(sale.state, r);
    const buy = 'I buy the superior longsword for 260 copper.';
    const bought = playerTurnV4(r.state, content, buy, { msg: 203, c: true, commands: [{ seq: 1, type: 'offer.accept',
        offer: offer.id, lines: [sword.id], agreed_cp: 260, quote: buy }] });
    assert.equal(tx(bought).length, 1);
    assert.equal(bought.state.entities.pc.sheet.coin_cp, 11);
    replay(r.state, bought);
    const object = Object.values(bought.state.objects).find(o => /superior/.test(o.name) && o.holder?.entity === 'pc');
    assert.ok(object);
    const worn = playerTurnV4(bought.state, content, 'I equip the sword.', { msg: 205, c: true,
        commands: [{ seq: 1, type: 'equip', object: object.id, slot: 'weapon', quote: 'I equip the sword.' }] });
    replay(bought.state, worn);
    assert.equal(worn.state.entities.pc.sheet.equipment.weapon.object, object.id);
    const repeat = playerTurnV4(worn.state, content, buy, { msg: 207, c: true,
        commands: [{ seq: 1, type: 'offer.accept', offer: offer.id, lines: [sword.id], quote: buy }] });
    assert.equal(tx(repeat).length, 0);
});
