// K7 (pilot 01 B9, FACHPLAN_PILOT01_KORREKTUREN §8): a purchase he cannot pay for tells the narrator the price, his purse,
// what is missing and the coin canon (one purse, 10 copper = 1 silver). Original T27 (I53): the Primer of Guard for
// 80 cp with 70 cp in his purse came back as "NOT BOUGHT — not enough coin", and the story invented a money changer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { playerCase, events, valid } from './pilot01_lib.js';

const content = await loadProductContent();

test('K7 original T27: the refusal names 80 cp needed, 70 cp (7 Silver) in his purse, 10 cp short, one purse', async () => {
    const { chat, r } = await playerCase(content, 53);
    const out = events(r, 'outcome.recorded')[0].d.outcome;
    const line = out.actions.join('\n');
    assert.match(line, /NOT BOUGHT/);
    assert.match(line, /80 cp \(8 Silver\) needed; he has 70 cp \(7 Silver\), 10 cp \(1 Silver\) short/);
    assert.match(line, /one purse \(1 silver = 10 copper, 1 gold = 100 copper\): no coin needs changing/);
    assert.equal(valid(chat, content).entities.pc.sheet.coin_cp, 70, 'nothing changes hands');
    assert.equal(events(r, 'transaction.completed').length, 0);
});

test('K7 unchanged: a purchase he can pay for is booked as before (T42, the Primer for 30 cp)', async () => {
    const { r } = await playerCase(content, 83);
    assert.equal(events(r, 'transaction.completed').length, 1);
    assert.ok(!events(r, 'outcome.recorded')[0].d.outcome.actions.join(' ').includes('short'));
});
