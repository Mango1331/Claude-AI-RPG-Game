import test from 'node:test';
import assert from 'node:assert/strict';
import { campaign } from './patch8_lib.js';
import { loadProductContent } from '../helpers.js';
import { travelManaEvent, recoveryEvents } from '../../src/v4/commands.js';
import { applyEvent } from '../../src/state.js';

const content = await loadProductContent();

test('travel MP is split invariant across reloads, personal and capped without credit at full', async () => {
    const game = await campaign(content);
    const base = game.state();
    const pc = base.entities.pc.sheet;
    Object.assign(pc.stats,{INT:30,WIL:4});
    pc.mp = 0;
    const travel = (parts, initial=base) => {
        let s = structuredClone(initial);
        for (const n of parts) {
            const e = travelManaEvent(s,content,n,'pc');
            if (e) applyEvent(s,JSON.parse(JSON.stringify(e)));
            s = JSON.parse(JSON.stringify(s));
        }
        return s.entities.pc.sheet;
    };
    for (const [min,amount] of [[15,3],[60,12],[120,25]]) {
        const once = travel([min]), split = travel(Array(min).fill(1));
        assert.equal(once.mp,amount);
        assert.deepEqual(split,once);
        assert.equal(once.hp,pc.hp);
        assert.equal(once.sta,pc.sta);
    }
    pc.mp = 255;
    assert.equal(travel([120]).travel_mp_fraction,undefined);
    const one = travel([1]);
    assert.ok(one.travel_mp_fraction);
    const s = structuredClone(base);
    s.entities.pc.sheet = one;
    for (const e of recoveryEvents(s,content,60,'rest').events) applyEvent(s,e);
    assert.equal(one.mp,256);
    assert.equal(one.travel_mp_fraction,undefined);
});
