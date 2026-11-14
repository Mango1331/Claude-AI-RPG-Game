// Build .187 stage 1 (P1) – work is no purchase (testrun_10b/npc-20261114-094810Z/GEGENREVIEW_OPUS.md §3.1, REVIEW.md
// §3/§9; natural batch 14.11.2026 on .186, Rogue #116/#117): the cooper's crowd held out 14 coppers "for the village" for
// killing the gander; the extractor reported Alaric's own work as the cooper's offer (n174/n175: "kill the gander on
// the west road, for the village; the bird's remains stay Alaric's", service other, 14 cp), the planner accepted it and
// the engine booked −14 cp. Rebuilt on the host path with the original reply words and the original extractor and
// planner answers (the seller's id is this campaign's). Fix: the extractor contract says so, and the engine refuses a
// service line that is a task of removing a threat done for the seller's side (src/v4/trade.js paidWorkLine) – at the
// offer (work_not_purchase) and at its acceptance (an offer stored before). A task alone, with no direction, is asked
// about unless his own words buy or hire it. Coin he is handed is coin.gift, as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk, outcomeOf, lastUser, linesOf } from './patch8_lib.js';
import { foldChat, rec } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { paidWorkLine } from '../../src/v4/trade.js';

const content = await loadProductContent();
const PROSE = 'The cooper looked around the well crowd, and the crowd looked back, and a few hands went to belts and apron strings. Coppers found their way to him in a loose little stream—two here, three there, the fishwife pressing one in last with a look that dared anyone to count cheaper. He held the result out for all to see.\n\n"Fourteen coppers," he said. "That\'s the goose and the gander both, for the village. Bird\'s yours too—feathers, meat, whatever you keep. And my missus\'s loaf, that stands either way."';
const SAID = '"Fourteen coppers," he said. "That\'s the goose and the gander both, for the village. Bird\'s yours too—feathers, meat, whatever you keep."';
const COOPER = { seq: 1, type: 'person.new', ref: 'cooper', name: null, role: 'cooper', desc: ['broad cooper with a leather apron'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' };
const LINE = (what, price_cp, said, more = {}) => ({ what, kind: 'service', service: 'other', qty: 1, price_cp, said, effect: null, teaches: null, equipment: null, base: null, quality: null,
    phase: 'firm', condition: null, pricing: { basis: 'total', quote: said, currency_quote: null }, ...more });
// the original extractor line of n175 (only the seller id is this campaign's)
const HUNT = LINE("kill the gander on the west road, for the village; the bird's remains stay Alaric's", 14, SAID, { pricing: { basis: 'total', quote: 'Fourteen coppers', currency_quote: null } });
const coin = (g) => g.state().entities.pc.sheet.coin_cp;
const cooper = (g) => Object.keys(g.state().entities).find((id) => /cooper/.test(id));
const open = (g) => Object.values(g.state().offers).filter((o) => o.status === 'open' && !o.canon);
function reloaded(g) {
    const again = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(again, g.state());
    assert.deepEqual(validateState(again, content), []);
    return again;
}
async function village(lines = [], prose = 'He goes to the well. The cooper is there.') {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    await walk(g, 'loc.alderwatch', { text: '*i walk into town to the well*', at: { new: { name: 'The well', kind: 'site', parent: 'loc.alderwatch' } },
        deltas: [COOPER, ...(lines.length ? [{ seq: 2, type: 'offer', seller: 'cooper', lines }] : [])], prose });
    return g;
}
const ACCEPT = (offer, quote = 'I accept the fourteen coppers') => ({ type: 'offer.accept', offer, lines: ['l1'], qty: null, party_words: null, agreed_cp: 14,
    price_evidence: { basis: 'total', quote: 'fourteen coppers', currency_quote: 'coppers' }, quote });

test('.187 P1 Rogue #116 (original line): Alaric\'s hunt for the village is no offer of the cooper; the narrator is told; nothing to accept (.186: stored, −14 cp)', async () => {
    const g = await village();
    await say(g, '"If it\'s worth coin, I\'d rather take him now than have him waiting on the west road."');
    const r = await g.reply(PROSE, { expected: {}, deltas: [{ seq: 1, type: 'offer', seller: cooper(g), lines: [HUNT] }] });
    assert.deepEqual(open(g), [], 'no offer stored');
    assert.ok((r.record.rejected || []).some((x) => x.rule === 'work_not_purchase'), JSON.stringify(r.record.rejected));
    assert.ok((r.record.corrections || []).some((c) => /offers Alaric pay for work \(kill the gander.*\); it is nothing he buys, and accepting it costs him nothing/.test(c)));
    const before = coin(g);
    await say(g, 'I accept the fourteen coppers, fetch the barrow and head down the west lane.', ACCEPT('offer.t116.6'));
    assert.equal(coin(g), before, 'no coin');
    assert.ok(!lastUser(g).events.some((e) => e.t === 'coin.changed' || e.t === 'transaction.completed'));
    reloaded(g);
});

test('.187 P1 Rogue #117: an offer of that kind stored before (an older chat) is refused at its acceptance – no coin', async () => {
    const g = await village();
    // the offer as .186 stored it, injected as the engine's own event
    const id = cooper(g);
    const offer = { id: 'offer.t116.6', seller: id, at: g.state().scene.at, status: 'open', canon: false, turn: g.state().turn, lines: [{ id: 'l1', ...HUNT, terms: 'firm' }] };
    const r = rec(g.chat.at(-1)); r.events.push({ t: 'offer.created', d: { offer } });
    const before = coin(g);
    await say(g, 'I accept the fourteen coppers, fetch the barrow and head down the west lane.', ACCEPT('offer.t116.6'));
    assert.equal(coin(g), before);
    assert.match(linesOf(g), /NOT BOUGHT — kill the gander on the west road, for the village; the bird's remains stay Alaric's: this is work Alaric would do for [^,]+, who would pay him; accepting it pays nobody and no coin changes hands now/);
    assert.deepEqual(outcomeOf(g).resolutions.map((x) => [x.type, x.status]), [['offer.accept', 'refused']]);
});

test('.187 P1 against: his pay handed to him stays coin.gift (Rogue #114: +8 "the cooper\'s thanks")', async () => {
    const g = await village();
    await say(g, '"whatever the cooper thinks fair."');
    const before = coin(g);
    await g.reply('The cooper counted into his palm and held it out. "Eight coppers." Eight coppers went into Alaric\'s palm.', { expected: {}, deltas: [{ seq: 1, type: 'coin.gift', from: cooper(g), cp: 8, why: "the cooper's thanks", said: 'Eight coppers went into Alaric\'s palm.', phase: 'transferred', relation: 'independent', money: { quote: 'Eight coppers', currency_quote: null }, repeat_of: null }] });
    assert.equal(coin(g), before + 8);
});

test('.187 P1 against: services he buys stay purchases – a bath, a healer, a guide, a room and supper', async () => {
    for (const [what, kind, service, price, said] of [
        ['a hot bath', 'service', 'other', 2, 'two copper'], ['bind and heal your wounds', 'service', 'healing', 5, 'five copper'],
        ['guide you across the marsh to the ford', 'service', 'other', 6, 'six copper'], ['a room for the night and supper', 'service', 'lodging', 3, 'three copper'],
    ]) {
        const g = await village([LINE(what, price, said, { kind, service })], `He goes to the well. The cooper is there. "${what}, ${said}."`);
        const o = open(g)[0];
        assert.ok(o, `${what}: stored`);
        const before = coin(g);
        await say(g, `I take it, ${said}.`, { type: 'offer.accept', offer: o.id, lines: ['l1'], qty: null, party_words: null, agreed_cp: price, price_evidence: { basis: 'total', quote: said, currency_quote: null }, quote: `I take it, ${said}.` });
        assert.equal(coin(g), before - price, what);
    }
});

test('.187 P1 against: a task with no direction is asked about, unless his own words hire it (no own decision of the engine)', async () => {
    const g = await village([LINE('clear the rats from your cellar', 4, 'four copper')], 'He goes to the well. The ratcatcher-cooper is there. "clear the rats from your cellar, four copper."');
    const o = open(g)[0];
    assert.ok(o, 'a task alone is stored (it may be bought)');
    const before = coin(g);
    await say(g, 'Agreed, four copper.', { type: 'offer.accept', offer: o.id, lines: ['l1'], qty: null, party_words: null, agreed_cp: 4, price_evidence: { basis: 'total', quote: 'four copper', currency_quote: null }, quote: 'Agreed, four copper.' });
    assert.equal(coin(g), before, 'asked, not booked');
    assert.equal(lastUser(g).command?.panels?.[0]?.startsWith('[SYSTEM // CLARIFY]'), true, JSON.stringify(lastUser(g).command));
    const h = await village([LINE('clear the rats from your cellar', 4, 'four copper')], 'He goes to the well. The ratcatcher-cooper is there. "clear the rats from your cellar, four copper."');
    const hb = coin(h);
    await say(h, 'I hire you to clear the rats, four copper.', { type: 'offer.accept', offer: open(h)[0].id, lines: ['l1'], qty: null, party_words: null, agreed_cp: 4, price_evidence: { basis: 'total', quote: 'four copper', currency_quote: null }, quote: 'I hire you to clear the rats, four copper.' });
    assert.equal(coin(h), hb - 4, 'his own words hire it');
});

test('.187 P1 paidWorkLine: both signs make work; the deed alone is unclear; a bought service or goods are nothing', () => {
    const t = (what, more = {}) => paidWorkLine({ kind: 'service', service: 'other', what, said: null, ...more });
    assert.equal(t("kill the gander on the west road, for the village; the bird's remains stay Alaric's"), 'work');
    assert.equal(t('hunt the wolf that takes our sheep', { said: 'There is a bounty of ten copper' }), 'work');
    assert.equal(t('drive off the boars for the farm'), 'work');
    assert.equal(t('get rid of the rats for us'), 'work');
    assert.equal(t('clear the rats from your cellar'), 'unclear');
    assert.equal(t('kill a chicken for supper'), 'unclear', '"for supper" is no one\'s side');
    for (const x of ['a hot bath', 'guide you across the marsh', 'mend your cloak', 'deliver your letter to Glassmere for you', 'escort you to the ford'])
        assert.equal(t(x), null, x);
    assert.equal(paidWorkLine({ kind: 'goods', service: null, what: 'kill the gander for the village' }), null, 'goods are never work');
    assert.equal(paidWorkLine({ kind: 'service', service: 'lodging', what: 'clear a bed for the village guest' }), null, 'only service other');
});
