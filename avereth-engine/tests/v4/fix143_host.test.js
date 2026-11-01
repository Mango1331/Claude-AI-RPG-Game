// .143: product-host payment/registration boundaries, including stored records and reload.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk, outcomeOf, lastUser, inject } from './patch8_lib.js';
import { foldChat, rec } from '../../src/host.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const KEEPER = { seq: 1, type: 'person.new', ref: 'keeper', name: 'Odo', role: 'shopkeeper', desc: ['lean shopkeeper'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' };
const LINE = (what, price_cp, said, more = {}) => ({ what, kind: 'goods', service: null, qty: 1, price_cp, said, effect: null, teaches: null, equipment: false,
    phase: 'firm', condition: null, pricing: { basis: 'total', quote: said, currency_quote: null }, ...more });
const coin = (g) => g.state().entities.pc.sheet.coin_cp;
const ODO = (g) => Object.keys(g.state().entities).find((id) => g.state().entities[id].name === 'Odo');
const statuses = (g) => outcomeOf(g).resolutions.map((r) => [r.type, r.status]);
const open = (g, pred = () => true) => Object.values(g.state().offers).filter((o) => o.status === 'open' && pred(o));
/** Alaric at Odo's shop; the reply offers `lines` (none: no offer). */
async function shop(lines = []) {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    const prose = `He goes in. Odo looks up from the counter. ${lines.map((l) => `"${l.what}, ${l.said}."`).join(' ')}`;
    await walk(g, 'loc.alderwatch', { text: '*i walk into town to the shop*', at: { new: { name: "Odo's Sundries", kind: 'site', parent: 'loc.alderwatch' } },
        deltas: [KEEPER, ...(lines.length ? [{ seq: 2, type: 'offer', seller: 'keeper', lines }] : [])], prose });
    return g;
}
/** The chat reloaded from its stored records: the same state, valid. */
function reloaded(g) {
    const again = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(again, g.state());
    assert.deepEqual(validateState(again, content), []);
    return again;
}


// Build .144 (S1): a "yes" in words pays nothing; only his own "#pay <id>" message does, once, and the reload agrees
test('.143 host proposal (.144): words lapse the card, #pay pays it once; reload is financially exact',async()=>{
 for(const [reply,cp] of [['No, keep it.',0],['Yes.',0],['#pay',5]]){
 const g=await shop();g.contract=false;const before=coin(g),to=ODO(g),m='I leave five copper on the crate for Odo.';
 await say(g,m,{type:'pay',to,amount_cp:5,for:null,quote:m,money:{quote:'five copper',currency_quote:null},recipient_quote:'Odo'});
 const dec=g.state().decisions.find(d=>d.state==='needs_confirmation');assert.ok(dec);assert.equal(coin(g),before);
 await g.reply('Odo waits.',{expected:{},deltas:[]});
 if(reply==='#pay'){await say(g,`#pay ${dec.id}`);await say(g,`#pay ${dec.id}`);}
 else await say(g,reply,{type:'pay',to,amount_cp:5,for:null,quote:reply,money:null,recipient_quote:null});
 assert.equal(coin(g),before-cp,reply);reloaded(g);
 }
});
test('.143 host registration outside the hall creates no cash proposal',async()=>{
 const g=await shop();g.contract=false;const before=coin(g),m='I offer Odo twenty copper for Guild registration.';
 await say(g,m,{type:'pay',to:ODO(g),amount_cp:20,for:'Guild registration',quote:m,money:{quote:'twenty copper',currency_quote:null},recipient_quote:'Odo'});
 assert.equal(coin(g),before);assert.equal(g.state().guild.membership,null);assert.equal(g.state().decisions.some(d=>d.kind==='payment'),false);reloaded(g);
});
