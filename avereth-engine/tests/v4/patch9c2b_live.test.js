// 4.3.0-c.6.6.48 (docs/PATCH9C2B_STONES_MATERIALS.md §7): the live test of 23.10.2026 (.47) bought no Skill Stone. The
// shopkeeper met without a name (stored by the story's handle "npc.drossell_shopkeeper") offered his stones as
// "Drossell": refused, "not present". A later reply handed the stone over in the story and booked the purchase on top:
// two "Lesser Spark Stone", neither with its profile, and their use was told as a power waking. The same event sequence,
// played through the host path with scripted planner, extractor and Forge answers (tests/v4/patch8_lib.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, inject, outcomeOf } from './patch8_lib.js';
import { scaleCreature } from '../../src/npcgen.js';
import { itemProfile, itemTraits } from '../../src/v4/items.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();

const SPARK = 'Lesser Spark Stone (minor arcana Skill, a small step up from a Mage\'s basic bolt)';
const TEACHES = { source: 'stone', fn: 'bolt', tags: ['Arcane'], aspects: ['Lightning'] };
const KEEPER = 'npc.npcdrossell_shopkeeper';
const CABINET = 'Drossell opens the cabinet. "The Lesser Spark Stone, four silver. The Stone of Steady Hands, five silver. The Lesser Warding Stone, six silver."';
const LINE = (what, price_cp, said, teaches) => ({ what, kind: 'goods', service: null, qty: 1, price_cp, said, effect: null, teaches });
const STONES = [
    LINE(SPARK, 400, 'four silver', TEACHES),
    LINE('Stone of Steady Hands', 500, 'five silver', { source: 'stone', fn: null, tags: null, aspects: null }),
    LINE('Lesser Warding Stone', 600, 'six silver', { source: 'stone', fn: 'ward', tags: ['Arcane', 'Defense'], aspects: null }),
];
const OFFER = (seq = 1, seller = 'Drossell', lines = STONES) => ({ seq, type: 'offer', seller, lines });
// the extractor's hand-over of msg 33 (live): the stone named on the seller, then moved to Alaric
const HANDED = (seq, holder = 'drossell', name = 'Lesser Spark Stone', qty = 1) => [
    { seq, type: 'object.new', name, kind: 'item', qty, holder, for_quest: null, in: null, teaches: null, effect: null, unit: null },
    { seq: seq + 1, type: 'object.move', object: { new: name }, qty, to: 'pc' },
];
const words = (t) => t.replace(/\*/g, '').trim();
const reply = (g, prose, deltas = []) => g.reply(prose, { expected: {}, deltas });
const coin = (g) => g.state().entities.pc.sheet.coin_cp;
const dyn = (g) => Object.keys(g.state().entities.pc.sheet.skills).filter((k) => k.startsWith('dyn.'));
const held = (g, word) => Object.values(g.state().objects).filter((o) => o.holder?.entity === 'pc' && o.name.includes(word));
const rules = (y) => (y.record.rejected || []).map((r) => [r.seq, r.rule]);
const use = (g, text, object) => say(g, text, { type: 'use', object, qty: null, quote: words(text) });
const buy = (g, text, more = {}) => say(g, text, { type: 'buy', what: 'Lesser Spark Stone', from: null, qty: null, max_cp: null, any_price: false, quote: words(text), ...more });

/** Someone here as the live test stored them: no name, the story's handle among their descriptors. */
function npc(g, id, { name = null, descriptors = ['merchant', 'lean man in his fifties, grey at the tem', 'npc.drossell_shopkeeper'] } = {}) {
    const s = g.state();
    inject(g, [
        { t: 'entity.created', d: { entity: { id, kind: 'npc', name, descriptors, traits: '', status: 'alive', location: s.scene.location, at: s.scene.at, template: 'commoner' } } },
        { t: 'scene.entered', d: { id, band: 'ENGAGED', cover: 'none' } },
    ]);
}
async function shop({ purse = 50 } = {}) {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    npc(g, KEEPER);
    inject(g, [{ t: 'coin.changed', d: { id: 'pc', value: purse, delta: purse - coin(g), why: 'test precondition' } }]);
    return g;
}
function forge(g, name = 'Spark Seed') {
    const base = g.llm;
    const calls = [];
    g.llm = async (q) => {
        if (!q.purpose.startsWith('forge')) return base(q);
        calls.push(q);
        return JSON.stringify({ skills: JSON.parse(q.messages[1].content).drafts.map((d) => ({ key: d.key, name, flavor: 'A crackle runs along the fingers.' })) });
    };
    return calls;
}
function wolf(g, id = 'mon.wolf') {
    const p = scaleCreature(content.anchors.get('wolf'), 1, 'normal', content);
    inject(g, [
        { t: 'entity.created', d: { entity: { id, kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', status: 'alive', location: g.state().scene.location, profile: { ...p, max_hp: 300, hp: 300 } } } },
        { t: 'scene.entered', d: { id, band: 'MEDIUM', cover: 'none' } },
        { t: 'scene.awareness', d: { id, level: 'aware' } },
    ]);
}
/** The one bought stone: activated, it gives exactly one Skill and is spent once; the Skill is then his to use. */
async function activateAndCast(g, stone) {
    const calls = forge(g);
    await use(g, '*i sit down, close my hand round the spark stone and wake it*', stone.id);
    const o = outcomeOf(g);
    assert.equal(calls.length, 1);
    assert.deepEqual(o.learned.map((l) => [l.name, l.source]), [['Spark Seed', 'stone']]);
    const s = g.state();
    assert.deepEqual(s.objects[stone.id].holder, { consumed: 'pc' }, 'spent');
    assert.equal(dyn(g).length, 1, 'exactly one new Skill');
    const def = s.skill_defs[dyn(g)[0]];
    assert.deepEqual([def.origin.kind, def.tags, def.aspects, def.category], ['stone', ['Arcane'], ['Lightning'], 'Offensive']);
    assert.deepEqual(validateState(s, content), []);
    await reply(g, 'A crackle runs along his fingers and the stone crumbles to grit.');
    // spent once: nothing of it is left to wake again
    await use(g, '*i try the spark stone again*', stone.id);
    assert.equal(dyn(g).length, 1);
    assert.equal(outcomeOf(g)?.learned, undefined);
    await reply(g, 'Nothing.');
    wolf(g);
    await say(g, `*i cast ${def.name} at the wolf*`, { type: 'use_skill', skill: def.id, target: 'mon.wolf', quote: `i cast ${def.name} at the wolf` });
    const mine = outcomeOf(g).records.filter((x) => x.actor === 'pc');
    assert.deepEqual(mine.map((x) => [x.kind, x.skill]), [['attack', def.id]]);
    assert.ok(mine[0].strikes[0].hp_after < mine[0].strikes[0].hp_before);
}

// ------------------------------------------------------------------------------------------------ the live sequence
test('.48 live sequence (his command): the unnamed shopkeeper offers as "Drossell"; one bought Lesser Spark Stone with its profile for 40 cp; the story\'s hand-over and the name do not make a second stone or a second Drossell', async () => {
    const g = await shop();
    await say(g, '*i ask the shopkeeper what the stones in the cabinet are*');
    await reply(g, CABINET, [OFFER()]);
    const offer = Object.values(g.state().offers).find((o) => o.status === 'open');
    assert.ok(offer, 'the offer of "Drossell" is the shopkeeper\'s');
    assert.equal(offer.seller, KEEPER);
    assert.deepEqual(offer.lines.map((l) => [l.price_cp, l.profile?.fn ?? null]), [[40, 'bolt'], [50, null], [60, 'ward']]);
    assert.deepEqual(offer.lines[0].profile, { kind: 'skill_source', source: 'stone', title: 'Skill Stone', rank: 'F', fn: 'bolt', tags: ['Arcane'], aspects: ['Lightning'], value_cp: 400 });
    // "i buy the spark stone": that line, not every stone of the cabinet
    await buy(g, '*i buy the spark stone*');
    assert.match(outcomeOf(g).actions[0], /ACCEPTS the offer — Lesser Spark Stone .* for 40 cp/);
    assert.equal(coin(g), 10);
    // msg 33 (live): the extractor introduces him by name and hands the stone over in the story
    const y = await reply(g, 'Drossell pressed the stone into Alaric\'s hand and folded his fingers over it.', [
        { seq: 1, type: 'person.new', ref: 'drossell', name: 'Drossell', role: 'merchant', desc: ['shopkeeper of Drossell\'s Components & Arcana'], armed: null, present: true, relevant: true, threat: false, at: null, band: 'ENGAGED' },
        ...HANDED(2),
    ]);
    assert.deepEqual(rules(y), [[2, 'engine_booked'], [3, 'engine_booked']]);
    const s = g.state();
    assert.equal(s.entities[KEEPER].name, 'Drossell', 'named now, the same person');
    assert.deepEqual(Object.values(s.entities).filter((e) => e.kind === 'npc' && /drossell/i.test(e.name || '')).map((e) => e.id), [KEEPER]);
    const stones = held(g, 'Spark');
    assert.equal(stones.length, 1, 'exactly the one he paid for');
    assert.deepEqual([stones[0].qty, stones[0].profile, stones[0].source.how], [1, offer.lines[0].profile, 'bought']);
    assert.equal(coin(g), 10);
    await activateAndCast(g, stones[0]);
});

test('.48 live sequence (his purchase decision): the hand-over told before the offer it pays is that purchase; told after it, too', async () => {
    for (const order of ['hand-over first', 'offer first']) {
        const g = await shop();
        await buy(g, '*if the spark stone is no more than five silver i buy it*', { max_cp: 50 });
        assert.equal(outcomeOf(g).resolutions[0].status, 'conditional', order);
        const deltas = order === 'hand-over first' ? [...HANDED(1, 'Drossell'), OFFER(3)] : [OFFER(1), ...HANDED(2, 'Drossell')];
        const y = await reply(g, `${CABINET} He pressed the Spark into Alaric's hand.`, deltas);
        assert.deepEqual(rules(y).map(([, r]) => r), ['engine_booked', 'engine_booked'], order);
        const stones = held(g, 'Spark');
        assert.equal(stones.length, 1, order);
        assert.deepEqual([stones[0].profile?.fn, stones[0].source.how, stones[0].source.from], ['bolt', 'bought', KEEPER], order);
        assert.equal(coin(g), 10, order);
        assert.ok(!Object.values(g.state().objects).some((o) => o.holder?.entity === KEEPER), `${order}: no stone left behind with him either`);
        if (order === 'offer first') await activateAndCast(g, stones[0]);
    }
});

// ------------------------------------------------------------------------------------------------ the seller
test('.48 seller: a name maps to the one person here whose own name or handle holds it; never by default to the only merchant or person here, never with two', async () => {
    const offered = async (setup) => {
        const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
        setup(g);
        await say(g, '*i ask Drossell about the stones*');
        const y = await reply(g, CABINET, [OFFER()]);
        return { g, open: Object.values(g.state().offers).filter((o) => o.status === 'open'), rules: rules(y) };
    };
    // two people here whose handles hold the name: no one
    const two = await offered((g) => { npc(g, KEEPER); npc(g, 'npc.npcdrossell_apprentice', { descriptors: ['apprentice', 'npc.drossell_apprentice'] }); });
    assert.deepEqual([two.open.length, two.rules], [0, [[1, 'offer']]]);
    // the only merchant here, whose identity holds no such name
    const merchant = await offered((g) => npc(g, 'npc.shopkeeper', { descriptors: ['merchant', 'lean man in his fifties'] }));
    assert.deepEqual([merchant.open.length, merchant.rules], [0, [[1, 'offer']]]);
    // the only person here, named otherwise
    const other = await offered((g) => npc(g, 'npc.mira', { name: 'Mira', descriptors: ['merchant', 'npc.mira_trader'] }));
    assert.deepEqual([other.open.length, other.rules], [0, [[1, 'offer']]]);
    // a handle holding it, but its owner not here
    const away = await offered((g) => { npc(g, KEEPER); inject(g, [{ t: 'scene.left', d: { id: KEEPER } }]); });
    assert.equal(away.open.length, 0);
    // the one: also when a second, unrelated merchant is here
    const one = await offered((g) => { npc(g, KEEPER); npc(g, 'npc.porter', { descriptors: ['merchant', 'npc.porter_merchant'] }); });
    assert.deepEqual(one.open.map((o) => o.seller), [KEEPER]);
});

// ------------------------------------------------------------------------------------------------ ordinary stones
test('.48 stones: a stone whose teaching the story established is a Skill Stone by any name calling it a stone; no stone without it; using an ordinary thing gives no Skill, LP or power', async () => {
    const p = (name, teaches) => itemProfile(content, { name, kind: 'item', teaches });
    assert.equal(p(SPARK, TEACHES).fn, 'bolt');
    assert.equal(p('Lesser Spark Stone', TEACHES).source, 'stone');
    assert.equal(p('Lesser Spark Stone', null), null, 'no teaching established, no source');
    assert.equal(p('smooth river stone', null), null);
    assert.equal(p('glowing pebble', TEACHES), null, 'not called a stone');
    assert.equal(p('Lesser Spark Stone', { source: 'manual', fn: 'bolt' }), null, 'a stone is no manual');
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    const thing = (id, name, teaches = null) => inject(g, [{ t: 'object.created', d: { object: { id, name, kind: 'item', stack: false, qty: 1, unit: null, ...itemTraits(content, { name, kind: 'item', teaches }, 0), holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: 1, how: 'story' } } } }]);
    thing('obj.river', 'smooth river stone');
    thing('obj.spark', 'Lesser Spark Stone');
    thing('obj.skill', 'Skill Stone');
    for (const [id, text] of [['obj.river', '*i rub the river stone*'], ['obj.spark', '*i squeeze the spark stone and wait*']]) {
        await use(g, text, id);
        const line = outcomeOf(g).actions[0];
        assert.match(line, /USES — .*no Skill, no Learning Progress and no new ability or power/, `${id}: used, never refused for its name`);
        assert.equal(outcomeOf(g).learned, undefined);
        assert.equal(g.state().objects[id].holder.entity, 'pc', 'not used up');
        await reply(g, 'Nothing happens.');
    }
    // a thing called a Skill Stone that teaches nothing established is still refused (R1 of .47)
    await use(g, '*i wake the skill stone*', 'obj.skill');
    assert.match(outcomeOf(g).actions[0], /CANNOT USE — Skill Stone: what it holds was never established/);
    assert.deepEqual(dyn(g), []);
});

// ------------------------------------------------------------------------------------------------ what else changes hands
test('.48 purchase: a gift, another giver, a part of the goods and units beyond the paid ones stand as the story tells them; each purchase is its own', async () => {
    const g = await shop({ purse: 200 });
    npc(g, 'npc.mira', { name: 'Mira', descriptors: ['apprentice'] });
    await say(g, '*i ask Drossell about the stones*');
    await reply(g, CABINET, [OFFER()]);
    await buy(g, '*i buy the spark stone*');
    const y = await reply(g, 'He hands over the stone and a charm for luck; Mira gives him one of her own spark stones, and Drossell a second one for free.', [
        ...HANDED(1),
        ...HANDED(3, 'drossell', 'lucky charm'),
        ...HANDED(5, 'Mira'),
        ...HANDED(7),
    ]);
    assert.deepEqual(rules(y), [[1, 'engine_booked'], [2, 'engine_booked']], 'only the paid stone');
    assert.equal(held(g, 'charm').length, 1, 'his gift');
    const stones = held(g, 'Spark');
    assert.deepEqual(stones.map((o) => [o.source.how, o.profile?.fn ?? null]).sort(), [['bought', 'bolt'], ['story', null], ['story', null]], 'the bought one, Mira\'s, his free second');
    // goods of three units: a hand-over of one of them is no hand-over of the purchase; one of all three is
    for (const [qty, extra] of [[1, 1], [3, 0]]) {
        const h = await shop({ purse: 200 });
        await say(h, '*i ask about arrows*');
        await reply(h, 'Drossell shows the arrows. "Three iron arrows, three copper."', [OFFER(1, 'Drossell', [{ ...LINE('iron arrows', 3, 'three copper', null), qty: 3 }])]);
        await say(h, '*i buy the arrows*', { type: 'buy', what: 'iron arrows', from: null, qty: null, max_cp: null, any_price: false, quote: 'i buy the arrows' });
        const z = await reply(h, 'He hands over the arrows.', HANDED(1, 'drossell', 'iron arrows', qty));
        assert.deepEqual(rules(z).length, extra ? 0 : 2, `story qty ${qty}`);
        assert.equal(held(h, 'arrow').reduce((n, o) => n + (o.qty ?? 1), 0), 3 + extra, `story qty ${qty}`);
    }
    // a second purchase of the same goods is a purchase of its own
    await say(g, '*i ask whether he has another*');
    await reply(g, 'Drossell takes another Spark from the back. "Four silver again."', [OFFER(1, 'Drossell', [STONES[0]])]);
    await buy(g, '*i buy that one too*');
    await reply(g, 'He hands it over.', HANDED(1));
    const bought = held(g, 'Spark').filter((o) => o.source.how === 'bought');
    assert.equal(bought.length, 2);
    assert.ok(bought.every((o) => o.profile?.fn === 'bolt'));
    assert.equal(coin(g), 200 - 80);
});
