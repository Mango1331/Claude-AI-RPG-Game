// K3 (pilot 01 B2, FACHPLAN_PILOT01_KORREKTUREN §4, GPT review §2 A): the GEAR MARKET rules (priority 0, ~500 tokens)
// come where equipment is traded this turn, including the first talk with a smith before any offer exists, and no
// longer because the last reply said "armor" or the player's "shield-sense" at a warren mouth. Original T19 (I37, the
// cart road) and T65 (I129, the Dungeon mouth) had them on .174 and lost NPC cards to them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { rec, turnBlock } from '../../src/host.js';
import { pilot, chainCase, playerCase } from './pilot01_lib.js';

const content = await loadProductContent();
const block = (chat, i) => turnBlock(structuredClone(chat.slice(0, i + 1)), i, content, { budget: 1400, rulesBudget: 800 }).context;
const sections = (ctx) => ctx.diagnostics.delivered.map((x) => x.name);

test('K3 original T19 (cart road) and T65 (Dungeon mouth): no equipment catalog; at T19 the carter with him keeps more room', () => {
    for (const i of [37, 129]) assert.ok(!sections(block(pilot, i)).includes('gear_market'), `I${i}`);
    const t19 = block(pilot, 37);
    assert.ok(t19.diagnostics.budgetedTokens < 1500, String(t19.diagnostics.budgetedTokens));
});

test('K3 original trade turns keep it: the bookshop T41/T42 (he buys from a seller with an offer)', () => {
    for (const i of [81, 83]) assert.ok(sections(block(pilot, i)).includes('gear_market'), `I${i}`);
});

/** Ashbridge market row after T29 (I58), with a smith standing there; optionally his open shield offer. */
async function atSmith(input, { offer = false } = {}) {
    const chat = structuredClone(pilot.slice(0, 59));
    const at = 'loc.ashbridge.money_changers_stall_on_market_row';
    const r = rec(chat[58]);
    r.events.push({ t: 'entity.created', d: { entity: { id: 'npc.test.smith', kind: 'npc', name: null, descriptors: ['blacksmith', 'big man in a scorched leather apron'], traits: 'big man in a scorched leather apron', status: 'alive', location: 'loc.ashbridge', at, created: { turn: 28, minute: 900 }, source: { kind: 'narration', msg: 58 }, card: {}, template: 'commoner' } } },
        { t: 'scene.entered', d: { id: 'npc.test.smith', band: 'SHORT' } },
        { t: 'fact.asserted', d: { fact: { id: 'f.test.smith.occ', s: 'npc.test.smith', p: 'occupation', o: 'blacksmith', since: { turn: 28, minute: 900 }, until: null, visibility: 'public', importance: 0.5, hard: false, source: { kind: 'narration', msg: 58 } } } });
    if (offer) r.events.push({ t: 'offer.created', d: { offer: { id: 'offer.test.shield', seller: 'npc.test.smith', at, status: 'open', canon: false, turn: 28, lines: [{ id: 'l1', what: 'common F-Rank buckler', base: 'buckler', quality: 'common', appearance: 'buckler', kind: 'goods', service: null, qty: 1, price_cp: 60, terms: 'firm', condition: null, equipment: true, profile: { kind: 'gear', base: 'buckler', quality: 'common', slot: 'offhand', rank: 'F' } }] } } });
    chat.push({ mes: input, is_user: true, is_system: false, extra: {} });
    const { res } = await playerCase(content, 59, { chat, answers: [JSON.stringify({ commands: [] })] });
    return res.context;
}

test('K3 first talk with a smith, before any offer: the equipment catalog comes (he speaks of buying a shield, a blacksmith is here)', async () => {
    const ctx = await atSmith('"Morning. Have you a shield I could buy?" I ask the smith.');
    assert.ok(sections(ctx).includes('gear_market'));
});

test('K3 the same smith with his open equipment offer: the catalog comes with the recorded goods', async () => {
    const ctx = await atSmith('I look over the bucklers on his bench.', { offer: true });
    assert.ok(sections(ctx).includes('gear_market'));
    assert.match(ctx.text, /RECORDED GOODS: common F-Rank buckler/);
});

test('K3 gear words without a seller or a shop (a dog on the road, his own sword) bring no catalog', async () => {
    const chat = await chainCase(content, 37, 37);
    chat.push({ mes: 'I draw my sword and keep my shield arm up while the dogs circle.', is_user: true, is_system: false, extra: {} });
    const { res } = await playerCase(content, 38, { chat, answers: [JSON.stringify({ commands: [] })] });
    assert.ok(!sections(res.context).includes('gear_market'));
});
