// .143: source identity, complete currency arguments and guarded free-payment confirmation.
// Negative model reports run through Agency/Commands or World up to actual booking events.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { applyEvent, fold } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { guardCommands } from '../../src/v4/agency.js';
import { guardContext, buildCatalog } from '../../src/v4/catalog.js';
import { validateState } from '../../src/validate.js';
import { openCards, payCard } from './pay_card.js';

const content = await loadProductContent();
const gz = (name) => JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url))));
const R = gz('batch20_finance138.json.gz').records; // batch 20 (build .137): #52 #58 #64 #99 #106 #110 #116 #123 #218 #382
const B = gz('batch20_finance142.json.gz').records; // batch 20: the chain #380 → #381 → #382 and #438
const clone = structuredClone;
const coins = (events) => events.filter((e) => e.t === 'coin.changed').map((e) => e.d.delta);
const offersOf = (res) => res.events.filter((e) => e.t === 'offer.created').map((e) => e.d.offer);

// ------------------------------------------------------------------------------------------------ the player's coin
const T50 = R[99]; // the Guild hall after the nest contract: Tam the crateman present, the planner's wrong pay of 50 cp
const TAM = T50.commands[0].to;
const PORTER = 'npc.test_porter';
function hall(coin = 200) {
    const s = clone(T50.state);
    s.entities.pc.sheet.coin_cp = coin;
    s.entities[PORTER] = { ...clone(s.entities[TAM]), id: PORTER, name: 'Wim', descriptors: ['porter'] };
    s.scene.present.push(PORTER);
    return s;
}
/** A pay command as cmd-1.9 has it (no confirmation: only #pay pays a card). */
const PAY = (to, cp, quote, money = null, more = {}) => ({ seq: 1, type: 'pay', to, amount_cp: cp, for: null, quote,
    money: money ? { quote: money, currency_quote: null } : null, recipient_quote: null, ...more });
/** One player message through the product's order: the agency guard, then the commands. */
function turn(s, message, commands, msg = 600) {
    const g = guardCommands(message, commands, guardContext(s, content, buildCatalog(s, content, { known: true, c: true })));
    const events = [];
    const ctx = resolveCommands(s, content, g.kept, (e) => { events.push(e); applyEvent(s, e); }, { c: true, msg, text: message });
    s.last = { ...(s.last || {}), outcome: { auth: ctx.auth, conditionals: ctx.conditionals, expected_keys: ctx.expectedKeys, resolutions: ctx.resolutions, booked: ctx.booked, c: true } };
    return { events, ctx, dropped: g.dropped, state: s };
}
/** The next message: a new turn of the same scene. */
const next = (s) => { s.turn += 1; return s; };


// Build .144 (S1): words make a payment card; only "#pay <id>" pays. These .143 cases now check that no source pays
// from words, that one act is one card, and that the card pays exactly once.
const cards = (s) => openCards(s).map((d) => d.amount_cp);
test('.143 Q3/Q4: one payment source is one card and pays once; a second act to him waits for its own message',()=>{
 for(const [text,quotes,want] of [
 ['I pay Tam five copper. Then I inspect my bag.',['I pay Tam five copper.','Then I inspect my bag.'],[5]],
 ['I pay Tam five copper.',['I pay Tam five copper.','I pay Tam five copper.'],[5]],
 ['I pay Tam five copper. Then I pay Tam another five copper.',['I pay Tam five copper.','Then I pay Tam another five copper.'],[5]],
 ]) {const s=hall(),r=turn(s,text,quotes.map((q,i)=>({...PAY(TAM,5,q,i?'another five copper':'five copper'),money:{quote:i&&text.includes('another')?'another five copper':'five copper',currency_quote:null},seq:i+1})));
  assert.deepEqual(coins(r.events),[],text);assert.deepEqual(cards(s),want,text);
  const id=openCards(s)[0].id;assert.equal(payCard(s,content,id).paid,true);assert.equal(s.entities.pc.sheet.coin_cp,195,text);
  assert.equal(payCard(s,content,id).paid,false,'a card pays once');}
 // the second act to the same person: its own message, its own card, its own #pay
 const s=hall();turn(s,'I pay Tam five copper.',[PAY(TAM,5,'I pay Tam five copper.','five copper')]);payCard(s,content,openCards(s)[0].id);
 turn(next(s),'Then I pay Tam another five copper.',[PAY(TAM,5,'Then I pay Tam another five copper.','another five copper')]);payCard(s,content,openCards(s)[0].id);
 assert.equal(s.entities.pc.sheet.coin_cp,190);
});
test('.143 G1-G3: goods and cut money groups pay nothing; whole groups are one card that pays once',()=>{
 for(const [text,money,currency,cp] of [
 ['I have five copper—I give Tam two plates.','two','copper',2],
 ['I hand Tam two silver plates.','two silver',null,20],
 ['I hand Tam three copper nails.','three copper',null,3],
 ['I hand Tam two silver and five copper.','two silver',null,20],
 ['I hand Tam two silver and five copper.','five copper',null,5],
 ])assert.deepEqual(coins(turn(hall(),text,[PAY(TAM,cp,text,money,{money:{quote:money,currency_quote:currency}})]).events),[],text+money);
 for(const money of ['two silver','five copper'])assert.deepEqual(cards((()=>{const s=hall();turn(s,'I hand Tam two silver and five copper.',[PAY(TAM,money==='two silver'?20:5,'I hand Tam two silver and five copper.',money)]);return s;})()),[],'a cut group makes no card either');
 const s=hall(),text='I hand Tam two silver and five copper.';
 assert.deepEqual(coins(turn(s,text,[PAY(TAM,25,text,'two silver and five copper')]).events),[]);assert.deepEqual(cards(s),[25]);
 payCard(s,content,openCards(s)[0].id);assert.equal(s.entities.pc.sheet.coin_cp,175);
});
function proposal(s){const m='I leave five copper on the crate for Tam.';return turn(s,m,[PAY(TAM,5,m,'five copper')]).events.find(e=>e.t==='decision.opened').d.decision.id;}
test('.143 Z1 (.144): no words pay a card – a "yes" neither; the card lapses with his next acting message',()=>{
 for(const text of ['No, keep it.','Maybe later.','I inspect the payment proposal.','Yes.','Yes, I pay him.']){const s=hall(),id=proposal(s);
  assert.deepEqual(coins(turn(next(s),text,[PAY(TAM,5,text,null,{confirmation:id})]).events),[],text);
  assert.equal(payCard(s,content,id).paid,false,`${text}: the old card lapsed`);}
});
test('.143 Q5 (.144): confirmation words plus a direct pay, either order and any purpose, book nothing; one card, one #pay, one debit',()=>{
 for(const reverse of [false,true]) for(const purpose of [null,'his trouble']){const s=hall(),id=proposal(s);next(s);const m=`Yes. I pay Tam five copper${purpose?' for his trouble':''}.`;
  let c=[PAY(TAM,5,'Yes.',null,{confirmation:id}),PAY(TAM,5,m.slice(5),'five copper',{for:purpose})];if(reverse)c.reverse();c=c.map((x,i)=>({...x,seq:i+1}));
  assert.deepEqual(coins(turn(s,m,c).events),[],m);assert.equal(openCards(s).length,1,m);
  assert.equal(payCard(s,content,id).paid,false,'the old card is gone');
  const now=openCards(s)[0].id;assert.equal(payCard(s,content,now).paid,true);assert.equal(payCard(s,content,now).paid,false);
  assert.equal(s.entities.pc.sheet.coin_cp,195,m);}
});
test('.143 Z2: registration purpose never creates a free payment proposal',()=>{
 const s=hall();s.guild.membership=null;const m='I offer Tam twenty copper for Guild registration.';const r=turn(s,m,[PAY(TAM,20,m,'twenty copper',{for:'Guild registration'})]);assert.deepEqual(coins(r.events),[]);assert.equal(r.events.some(e=>e.t==='decision.opened'&&e.d.decision.kind==='payment'),false);
});
test('.143 Q1/Q2: money outside the stated act cannot be a price or gift',()=>{
 const p=R[116],s=clone(p.state),raw=clone(p.raw),d=raw.deltas.find(d=>d.type==='bid');
 Object.assign(d,{said:'I have not named a price for your plates.',price_cp:56,phase:'firm',condition:null,pricing:{basis:'total',quote:'fifty-six copper',currency_quote:null}});raw.deltas=[d];raw.expected={};
 const prose='The smith says, "I have fifty-six copper in my purse." He adds, "I have not named a price for your plates."';
 const r=applyWorld(s,content,raw,{msg:116,prose});assert.equal(offersOf(r).some(o=>o.terms==='firm'),false);assert.deepEqual(coins(r.events),[]);
 const text='Tam mentions fifty copper in his purse. He hands Alaric a pouch without stating how much is inside.';
 const g={seq:1,type:'coin.gift',from:TAM,cp:50,why:'thanks',said:'He hands Alaric a pouch without stating how much is inside.',repeat_of:null,phase:'transferred',relation:'independent',money:{quote:'fifty copper',currency_quote:null}};
 assert.deepEqual(coins(applyWorld(hall(),content,{scene:'here',expected:{},deltas:[g]},{msg:700,prose:text}).events),[]);
});

test('.143 (.144) a paid card does not suppress a later independent payment',()=>{
 const s=hall(),id=proposal(s);payCard(s,content,id);next(s);const text='I pay Tam another five copper.';
 turn(s,text,[PAY(TAM,5,text,'another five copper')]);assert.equal(payCard(s,content,openCards(s)[0].id).paid,true);assert.equal(s.entities.pc.sheet.coin_cp,190);
});
test('.143 G3 split commands never book a partial mixed payment',()=>{const m='I hand Tam two silver and five copper.',s=hall();assert.deepEqual(coins(turn(s,m,[PAY(TAM,20,m,'two silver'),{...PAY(TAM,5,m,'five copper'),seq:2}]).events),[]);assert.deepEqual(openCards(s),[],'and no card');});
