import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { applyWorld } from '../../src/v4/world.js';
import { openConditionNear } from '../../src/v4/finance_evidence.js';
import { parseExtraction, worldVocab } from '../../src/v4/extract.js';
import { loadProductContent } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { resolveCommands } from '../../src/v4/commands.js';

const originals = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/user12_bids.json.gz', import.meta.url))));
const content = await loadProductContent();

function extractBid(state, raw, prose) {
    const objects = raw.deltas.filter(d => d.type === 'bid').flatMap(d => d.lines.map(line => line.object));
    const ids = { places: Object.keys(state.places), quests: Object.keys(state.quests), objects };
    const parsed = parseExtraction(JSON.stringify(raw), worldVocab(content.deltaVocab, state), ids, state.last.outcome.expected_keys,
        { sceneRequired: true, startScene: state.scene.at, state, content, reply: prose });
    assert.equal(parsed.valid, true, parsed.errors.join('\n'));
    return parsed;
}

const run = (index, adjust = () => {}) => {
    const {state, prose, raw} = structuredClone(originals[index]);
    adjust(raw.deltas.find(d => d.type === 'bid'));
    if (index !== 104) assert.deepEqual(extractBid(state, raw, prose).issues, []);
    return applyWorld(state, content, raw, {msg:index,prose});
};

test('User12 first bids bind to the buyer’s own statement for the actual goods and can settle once', () => {
    for (const [index, price, adjust] of [[104,300], [120,4,bid => Object.assign(bid,{phase:'firm',condition:null})], [140,3]]) {
        const result = run(index, adjust);
        const offer = result.events.find(e => e.t === 'offer.created' && e.d.offer.bid)?.d.offer;
        assert.ok(offer, JSON.stringify(result.events.filter(e => e.t === 'delta.rejected')));
        assert.equal(offer.terms,'firm');
        assert.equal(offer.price_cp,price);
        assert.ok(!result.events.some(e => e.t === 'coin.changed'));
        const state = result.state;
        const events = [];
        const send = (quote, msg) => resolveCommands(state,content,[
            {seq:1,type:'offer.accept',offer:offer.id,lines:null,qty:null,agreed_cp:null,quote}
        ],e => {events.push(e); applyEvent(state,e);},{c:true,msg});
        send('Is that the price?', index + 1);
        assert.equal(events.filter(e => e.t === 'transaction.completed').length,0);
        send('I accept the bid.', index + 2);
        send('I accept the bid.', index + 3);
        assert.equal(events.filter(e => e.t === 'transaction.completed').length,1);
        assert.deepEqual(events.filter(e => e.t === 'coin.changed').map(e => e.d.delta),[price]);
    }
});

test('a price reason is distinct from an unfulfilled prerequisite', () => {
    const quote = 'Four copper';
    for (const text of ['Four copper, because I can hardly resell it.', 'Four copper. I mostly see them only when someone is desperate.'])
        assert.equal(openConditionNear(text,0,quote.length),null,text);
    for (const text of ['Four copper, if the clasp is intact.', 'Four copper. The appraiser must approve it first.', 'Four copper, only if the clasp is intact.'])
        assert.ok(openConditionNear(text,0,quote.length),text);
});

function robeBid(prose, said, { buyer = 'npc.marta', condition = null } = {}) {
    const { state, raw } = structuredClone(originals[120]);
    const tomas = originals[140].state.entities['npc.npcemporium_clerk'];
    state.entities[tomas.id] = { ...tomas, at: state.scene.at };
    state.scene.present.push(tomas.id);
    Object.assign(raw.deltas[0], { buyer, said, phase: condition ? 'conditional' : 'firm', condition });
    const parsed = extractBid(state, raw, prose);
    const result = applyWorld(state, content, parsed.value, { msg: 120, prose });
    const offer = result.events.find(e => e.t === 'offer.created' && e.d.offer.bid)?.d.offer;
    assert.ok(!result.events.some(e => e.t === 'coin.changed'));
    return { issues: parsed.issues, offer };
}

test('R1: the price and goods must come from the named buyer’s own commercial clause', () => {
    const prose = 'Marta said, “I can give you two copper for the robe.” Tomas said, “I can give you four copper for the robe.”';
    for (const said of ['I can give you two copper for the robe … I can give you four copper for the robe',
        'I can give you four copper for the robe']) {
        const { issues, offer } = robeBid(prose, said);
        assert.notEqual(offer?.terms, 'firm', said);
        assert.deepEqual(issues, [], said);
    }
    const { issues, offer } = robeBid(prose, 'I can give you four copper for the robe', { buyer: 'npc.npcemporium_clerk' });
    assert.deepEqual(issues, []);
    assert.deepEqual([offer?.seller, offer?.terms, offer?.price_cp, offer?.lines[0].object],
        ['npc.npcemporium_clerk', 'firm', 4, 'item.starter_light_robes']);
    const mixedGoods = robeBid('Marta said, “The robe looks sound. Four copper for the staff.”', 'The robe looks sound … Four copper for the staff');
    assert.notEqual(mixedGoods.offer?.terms, 'firm');
    assert.deepEqual(mixedGoods.issues, []);

    const incompatibleTotals = robeBid('“Two copper.” “Four copper for the robe.”', 'Two copper … Four copper for the robe');
    assert.notEqual(incompatibleTotals.offer?.terms, 'firm');
    assert.deepEqual(incompatibleTotals.issues, []);
});

test('R2: a required return defers the bid, a separate appointment leaves it firm', () => {
    const said = 'Four copper for the robe';
    for (const prose of [
        `Marta said, “${said}. Bring it back tomorrow.”`,
        `Marta said, “${said}. Come back tomorrow with the robe.”`,
        `${said}, bring it back tomorrow.`,
    ]) {
        const { issues, offer } = robeBid(prose, said);
        assert.notEqual(offer?.terms, 'firm', prose);
        assert.deepEqual(issues, [], prose);
    }
    const condition = 'bring the robe back tomorrow';
    const repaired = robeBid(`Marta said, “${said}. Bring it back tomorrow.”`, said, { condition });
    assert.deepEqual(repaired.issues, []);
    assert.deepEqual([repaired.offer?.terms, repaired.offer?.condition], ['conditional', condition]);
    for (const prose of [
        'Marta said, “Four copper for the robe. Tomorrow we can discuss the staff.”',
        '“Four copper for the robe,” said Marta, who was meeting Tomas tomorrow.',
        'Marta said, “Four copper for the robe. Bring the staff back tomorrow for a fitting.”',
    ]) {
        const { issues, offer } = robeBid(prose, said);
        assert.deepEqual(issues, [], prose);
        assert.equal(offer?.terms, 'firm', prose);
    }
});
