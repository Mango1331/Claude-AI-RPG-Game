import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { acceptanceWhy } from '../../src/v4/trade.js';
import { applyEvent } from '../../src/state.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/batch22_fix147.json.gz', import.meta.url))));
const accept = (quote, lines = ['l4']) => ({ seq: 1, type: 'offer.accept', offer: f.offer.id, lines, quote, agreed_cp: 80 });
const economic = r => r.events.filter(e => ['transaction.completed', 'coin.changed', 'object.created'].includes(e.t));

for (const input of f.inputs) test(`.147 original T${input.turn} wording buys the common dagger once`, () => {
    // Isolate article selection: the independently reported "Smith B" party alias is outside this fix.
    const command = { ...input.command, party_words: null };
    const r = playerTurnV4(f.before, content, input.text, { commands: [command], c: true, msg: 149 });
    assert.equal(r.events.filter(e => e.t === 'transaction.completed').length, 1);
    assert.equal(r.state.entities.pc.sheet.coin_cp, f.before.entities.pc.sheet.coin_cp - 80);
    const goods = r.events.filter(e => e.t === 'object.created');
    assert.equal(goods.length, 1);
    assert.match(goods[0].d.object.name, /common.*dagger/i);
    const reloaded = structuredClone(f.before);
    r.events.forEach(e => applyEvent(reloaded, JSON.parse(JSON.stringify(e))));
    assert.deepEqual(reloaded, r.state);
    assert.deepEqual(validateState(reloaded, content), []);
    const again = playerTurnV4(reloaded, content, input.text, { commands: [command], c: true, msg: 151 });
    assert.equal(economic(again).length, 0);
});

test('.147 quoted offer prose cannot become another article order', () => {
    const offer = structuredClone(f.offer);
    offer.lines[2].said = 'Hand me the coins and take it; good work, I say.';
    assert.equal(acceptanceWhy(accept("I'll buy the common dagger and hand over the coins."), offer, 'smith'), null);
});

test('.147 shared article names retain their explicit quality', () => {
    assert.ok(acceptanceWhy(accept('I buy the fine dagger.'), f.offer, 'smith'));
    assert.equal(acceptanceWhy({ ...accept('I buy the fine dagger.', ['l5']), agreed_cp: 140 }, f.offer, 'smith'), null);
});

test('.147 real compound article and complete pair remain selectable; incomplete pair books nothing', () => {
    for (const quote of ['I buy the common dagger and the common hand-axe.', 'I buy the common dagger. Please add the hand axe.']) {
        const partial = playerTurnV4(f.before, content, quote, { commands: [accept(quote)], c: true, msg: 149 });
        assert.equal(economic(partial).length, 0);
        const full = { ...accept(quote, ['l3', 'l4']), agreed_cp: 160 };
        // Original purse is too small for the pair: test the real booking boundary with sufficient funds.
        const s = structuredClone(f.before); s.entities.pc.sheet.coin_cp = 200;
        const r = playerTurnV4(s, content, quote, { commands: [full], c: true, msg: 149 });
        assert.equal(r.events.filter(e => e.t === 'transaction.completed').length, 1);
        assert.equal(r.events.filter(e => e.t === 'object.created').length, 2);
        assert.equal(r.state.entities.pc.sheet.coin_cp, 40);
    }
});

test('.147 comments and explicit exclusions cannot authorize additional goods', () => {
    const quote = "I'll buy the common dagger. The hand-axe is too expensive.";
    assert.equal(acceptanceWhy(accept(quote), f.offer, 'smith'), null);
    assert.ok(acceptanceWhy(accept(quote, ['l3', 'l4']), f.offer, 'smith'));
    assert.ok(acceptanceWhy(accept('I buy the common dagger, not the hand-axe.', ['l3', 'l4']), f.offer, 'smith'));
});
