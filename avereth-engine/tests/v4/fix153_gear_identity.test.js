import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync, processReplyAny, runExtraction, onEditedV4 } from '../../src/v4/runtime.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { tradeObject, heldUnits, saleUnits, bookSale } from '../../src/v4/trade.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { applyEvent } from '../../src/state.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/batch26_gear_alias.json.gz', import.meta.url))));
const OLD = 'obj.t143.fine_f_rank_chain_mail', ALIAS = `item.${OLD}`;
const SELLER = 'npc.npcalderwatch_smith';
const before = () => foldChat(structuredClone(f.prefix)).state;
const assertValid = chat => { const f = foldChat(chat); assert.deepEqual(f.errors, []); assert.deepEqual(validateState(f.state, content), []); return f.state; };
const coin = s => s.entities.pc.sheet.coin_cp;
function commands(s, list) {
    const events = [];
    const result = resolveCommands(s, content, list.map((c, i) => ({ seq: i + 1, ...c })), e => { events.push(e); applyEvent(s, e); }, { c: true, msg: 479, text: f.player });
    return { ...result, events };
}
async function start() {
    const chat = structuredClone(f.prefix); assert.equal(chat.length, 479); assertValid(chat);
    assert.ok(buildCatalog(before(), content).objects.some(o => o.id === ALIAS), 'the original equipped alias must remain an accepted Planner reference');
    chat.push({ mes: f.player, is_user: true, extra: {} });
    const result = await prepareGenerationAsync(chat, content, { settings: { planner: true }, llm: async req => {
        assert.equal(req.purpose, 'plan'); return JSON.stringify(f.plan);
    } });
    assert.equal(result.action, 'context');
    return chat;
}
test('153 original I479→I481: accepted catalog alias preserves one coat through equip/give, persisted reply and refused resale', async () => {
    const chat = await start(), s = assertValid(chat), cp = coin(before());
    assert.equal(s.objects[OLD].holder.entity, SELLER);
    assert.deepEqual(s.objects[OLD].profile, before().objects[OLD].profile);
    assert.equal(s.entities.pc.sheet.inventory[OLD], undefined);
    assert.equal(rec(chat[479]).events.some(e => e.t === 'object.created'), false);
    assert.equal(s.entities.pc.sheet.equipment.armor.object, 'obj.t251.superior_f_rank_chain_mail');
    assert.equal(s.objects['obj.t475.superior_f_rank_chain_mail'].holder.entity, 'pc', 'the separately bought second Superior coat remains a real spare');
    assert.equal(coin(s), cp);
    chat.push({ mes: f.reply, is_user: false, extra: {} }); processReplyAny(chat, 480, content);
    await runExtraction(chat, 480, content, async () => JSON.stringify(f.answer));
    assert.equal(rec(chat[480]).extraction.status, 'applied');
    assertValid(chat);
    chat.push({ mes: f.sale_player, is_user: true, extra: {} });
    await prepareGenerationAsync(chat, content, { settings: { planner: true }, llm: async () => JSON.stringify(f.sale_plan) });
    const final = assertValid(chat);
    assert.equal(coin(final), cp, 'no sale of the already transferred coat');
    assert.equal(Object.values(final.objects).filter(o => o.id === OLD || o.source?.item === OLD).length, 1);
    assert.deepEqual(assertValid(JSON.parse(JSON.stringify(chat))), final);
});
test('153 separate equip/alias give and equip/alias drop preserve the existing physical object and profile', () => {
    for (const type of ['give', 'drop']) {
        const s = before(), profile = structuredClone(s.objects[OLD].profile);
        commands(s, [{ type: 'equip', object: 'obj.t251.superior_f_rank_chain_mail', slot: 'armor' }]);
        const r = commands(s, [{ type, object: ALIAS, qty: 1, to: SELLER }]);
        assert.deepEqual(validateState(s, content), []);
        assert.equal(r.events.some(e => e.t === 'object.created'), false);
        assert.deepEqual(s.objects[OLD].profile, profile);
        assert.deepEqual(s.objects[OLD].holder, type === 'give' ? { entity: SELLER } : { loc: s.scene.at });
    }
    const s = before();
    const r = commands(s, [{ type: 'unequip', object: ALIAS }, { type: 'give', object: ALIAS, qty: 1, to: SELLER }]);
    assert.ok(r.resolutions.every(r => r.status === 'resolved'));
    assert.deepEqual(s.objects[OLD].holder, { entity: SELLER });
    assert.equal(r.events.some(e => e.t === 'object.created'), false);
    assert.deepEqual(validateState(s, content), []);
});
test('153 worn aliases grant no transferable units; intentional DROP still performs its existing unequip first', () => {
    const s = before();
    assert.equal(heldUnits(s, ALIAS), 0);
    assert.equal(commands(s, [{ type: 'give', object: ALIAS, qty: 1, to: SELLER }]).resolutions[0].status, 'refused');
    const events = [];
    assert.ok(bookSale(s, e => events.push(e), { ref: ALIAS, units: 1, buyer: SELLER, cp: 4, what: 'mail' }).error);
    assert.equal(events.length, 0);
    const dropped = commands(s, [{ type: 'drop', object: ALIAS, qty: 1 }]);
    assert.equal(dropped.resolutions[0].status, 'resolved');
    assert.equal(s.entities.pc.sheet.equipment.armor, undefined);
    assert.deepEqual(s.objects[OLD].holder, { loc: s.scene.at });
    assert.deepEqual(validateState(s, content), []);
});
test('153 missing and foreign physical aliases are not synthesized from sheet counters', () => {
    const s = before();
    s.entities.pc.sheet.inventory['obj.missing'] = 3;
    assert.equal(tradeObject(s, content, 'item.obj.missing'), null);
    assert.equal(heldUnits(s, 'item.obj.missing'), 0);
    commands(s, [{ type: 'equip', object: 'obj.t251.superior_f_rank_chain_mail', slot: 'armor' }, { type: 'give', object: ALIAS, qty: 1, to: SELLER }]);
    s.entities.pc.sheet.inventory[OLD] = 7; // misleading counter never overrides the actual NPC holder
    assert.equal(tradeObject(s, content, ALIAS).holder.entity, SELLER);
    assert.equal(heldUnits(s, ALIAS), 0);
});
test('153 physical alias stack sales keep quantities/profile and reject alias+raw duplicates atomically', () => {
    const s = before();
    const id = 'obj.test.coats', o = { ...structuredClone(s.objects[OLD]), id, stack: true, qty: 3, holder: { entity: 'pc' } };
    applyEvent(s, { t: 'object.created', d: { object: o } });
    assert.deepEqual(saleUnits(s, `item.${id}`), { units: 3 });
    let events = [];
    const emit = e => { events.push(e); applyEvent(s, e); };
    const cp = coin(s);
    assert.ok(bookSale(s, emit, { items: [{ ref: id, units: 1 }, { ref: `item.${id}`, units: 1 }], buyer: SELLER, cp: 8, what: 'two coats' }).error);
    assert.equal(events.length, 0);
    assert.equal(bookSale(s, emit, { ref: `item.${id}`, units: 1, splitId: `${id}_sold`, buyer: SELLER, cp: 4, what: 'one coat' }).ok, true);
    assert.equal(coin(s), cp + 4); assert.equal(s.objects[id].qty, 2);
    assert.equal(s.objects[`${id}_sold`].holder.entity, SELLER);
    assert.deepEqual(s.objects[`${id}_sold`].profile, o.profile);
    assert.deepEqual(validateState(s, content), []);
    // Stored bids and current commands may use either spelling of the same physical ID.
    const offer = { id: 'offer.test.alias', seller: SELLER, at: s.scene.at, status: 'open', bid: true,
        price_cp: 8, lines: [{ id: 'l1', object: `item.${id}`, what: 'coats', qty: 2, price_cp: 8 }] };
    s.offers[offer.id] = offer;
    assert.equal(bookSale(s, emit, { ref: id, units: 2, buyer: SELLER, cp: 8, what: 'remaining coats', offer }).ok, true);
    assert.deepEqual(s.objects[id].holder, { entity: SELLER });
    assert.equal(coin(s), cp + 12);
    assert.equal(bookSale(s, emit, { ref: `item.${id}`, units: 2, buyer: SELLER, cp: 8, what: 'resale', offer }).ok, undefined);
    assert.equal(coin(s), cp + 12);
    assert.deepEqual(validateState(s, content), []);
});
test('153 ordinary item templates still materialize only the explicitly transferred units', () => {
    const s = before(), template = 'arrows';
    applyEvent(s, { t: 'item.changed', d: { id: 'pc', item: template, qty: 3, why: 'test stock' } });
    const qty = s.entities.pc.sheet.inventory[template];
    const r = commands(s, [{ type: 'give', object: `item.${template}`, qty: 2, to: SELLER }]);
    assert.equal(r.resolutions[0].status, 'resolved');
    assert.equal(r.events.filter(e => e.t === 'object.created').length, 1);
    assert.equal(s.entities.pc.sheet.inventory[template], qty - 2);
    assert.deepEqual(validateState(s, content), []);
});
test('153 source edits do not duplicate transfers on restore/regenerate or another reply text', async () => {
    const chat = await start(); const original = chat[479].mes, recorded = JSON.stringify(rec(chat[479]).events);
    chat[479].mes = 'I wait instead.'; onEditedV4(chat, 479);
    chat[479].mes = original; onEditedV4(chat, 479);
    await prepareGenerationAsync(chat, content, { settings: { planner: true }, llm: async () => JSON.stringify(f.plan) });
    assertValid(chat);
    assert.equal(JSON.stringify(rec(chat[479]).events), recorded);
    chat.push({ mes: f.reply, is_user: false, extra: {} }); processReplyAny(chat, 480, content);
    await runExtraction(chat, 480, content, async () => JSON.stringify(f.answer));
    chat[480].mes = 'Another account of the smith receiving the one coat.'; chat[480].swipe_id = 1;
    const s = assertValid(chat);
    assert.equal(Object.values(s.objects).filter(o => o.id === OLD || o.source?.item === OLD).length, 1);
});
