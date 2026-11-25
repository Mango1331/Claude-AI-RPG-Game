import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { applyWorld } from '../../src/v4/world.js';
import { openConditionNear } from '../../src/v4/finance_evidence.js';
import { loadProductContent } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { resolveCommands } from '../../src/v4/commands.js';

const originals = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/user12_bids.json.gz', import.meta.url))));
const content = await loadProductContent();

const run = (index, adjust = () => {}) => {
    const {state, prose, raw} = structuredClone(originals[index]);
    adjust(raw.deltas.find(d => d.type === 'bid'));
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
