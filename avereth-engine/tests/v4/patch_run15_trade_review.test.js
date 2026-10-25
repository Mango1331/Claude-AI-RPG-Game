import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { applyWorld } from '../../src/v4/world.js';
const content = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run15_trade.json', import.meta.url)));
const clone = structuredClone;
function run(state, commands) {
    const s = clone(state), events = [];
    resolveCommands(s, content, commands, e => { events.push(e); applyEvent(s, e); }, { c: true, msg: 193 });
    return { state: s, events };
}
const payments = r => r.events.filter(e => e.t === 'coin.changed');
const sale = () => { const s = clone(f.cases.wrongParty.state); s.offers['offer.t52.6'].price_cp = 4; return s; };
const accept = (quote, agreed_cp = null) => ({ seq: 1, type: 'offer.accept', offer: 'offer.t52.6', party_words: 'Doss', agreed_cp, quote });

test('review A: four plates at one copper each accept the four-copper bid', () => {
    for (const agreed of [null, 4]) {
        const r = run(sale(), [accept('Deal, Doss. All four at a copper a plate.', agreed)]);
        assert.equal(payments(r).length, 1); assert.equal(payments(r)[0].d.delta, 4);
    }
});
test('review A: a different unit rate still cannot accept that bid', () => {
    assert.equal(payments(run(sale(), [accept('Deal, Doss. All four at two copper a plate.', 8)])).length, 0);
});
test('review A: unit-price consent also works for purchase quantities and partial lots', () => {
    for (const qty of [4, 3]) {
        const s = clone(f.cases.duplicate.state), o = s.offers[f.cases.duplicate.commands[0].offer];
        o.lines = [{ ...o.lines[0], what: 'water flasks', qty: 4, price_cp: 4 }];
        const r = run(s, [{ seq: 1, type: 'offer.accept', offer: o.id, lines: ['l1'], qty, agreed_cp: qty,
            quote: `I'll take ${qty} water flasks at a copper each.` }]);
        assert.equal(payments(r).length, 1); assert.equal(payments(r)[0].d.delta, -qty);
    }
});
test('review A: an unconfirmed requested discount still books nothing', () => {
    const c = f.cases.duplicate; assert.equal(payments(run(c.state, c.commands)).length, 0);
});
test('review A: explicit acceptance of the already repriced discount books once', () => {
    const c = f.cases.duplicate, s = clone(c.state), a = clone(c.commands[0]);
    s.offers[a.offer].lines[0].price_cp = 74;
    s.offers[a.offer].lines[0].said = 'The agreed discount price is seventy-four copper.';
    a.agreed_cp = 74; a.quote = 'Deal. I accept the agreed discount price of seventy-four copper.';
    const r = run(s, [a, { ...c.commands[2], seq: 2, amount_cp: 74, quote: 'I pay for the pair.' }]);
    assert.equal(payments(r).length, 1); assert.equal(payments(r)[0].d.delta, -74);
});
function goods(said, prose = said) {
    const c = f.cases.advice, seller = 'npc.npcguild_keeper_glassmere';
    return applyWorld(clone(c.state), content, { scene: c.state.scene.at, expected: {}, deltas: [
        { seq: 1, type: 'offer', seller, lines: [{ what: 'iron sword', kind: 'goods', qty: 1, price_cp: 80, said }] },
    ] }, { msg: c.i, prose });
}
test('review B: named third-party goods advice cannot become the speaker’s offer', () => {
    const r = goods('Hessel sells an iron sword for eight silver.');
    assert.equal(r.events.filter(e => e.t === 'offer.created').length, 0);
});
test('review B: a named foreign seller in quoted dialogue is also advice', () => {
    const said = 'Hessel sells an iron sword for eight silver.';
    assert.equal(goods(said, `She says, "${said}"`).events.filter(e => e.t === 'offer.created').length, 0);
});
test('review B: the present seller can offer their own goods', () => {
    assert.equal(goods('I sell an iron sword for eight silver.').events.filter(e => e.t === 'offer.created').length, 1);
});
test('review B: explicit brokerage for those goods remains valid', () => {
    assert.equal(goods('I can arrange an iron sword from Hessel for eight silver.').events.filter(e => e.t === 'offer.created').length, 1);
});
test('review B: third-person narration about the actual seller remains valid', () => {
    const c = f.cases.price, said = 'Doss sells an iron sword for eight silver.';
    const r = applyWorld(clone(c.state), content, { scene: c.state.scene.at, expected: {}, deltas: [
        { seq: 1, type: 'offer', seller: 'npc.doss', lines: [{ what: 'iron sword', kind: 'goods', qty: 1, price_cp: 80, said }] },
    ] }, { msg: 52, prose: said });
    assert.equal(r.events.filter(e => e.t === 'offer.created').length, 1);
});
