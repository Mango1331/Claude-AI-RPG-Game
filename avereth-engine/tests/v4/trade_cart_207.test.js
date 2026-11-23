import assert from 'node:assert/strict';
import test from 'node:test';
import { applyEvent } from '../../src/state.js';
import { pricePositions, bookPurchase, bidSale, bookSale } from '../../src/v4/trade.js';

const lines = [
    { id:'r', what:'Rations', kind:'goods', qty:5, price_cp:15, object:'obj.r' },
    { id:'b', what:'Bandages', kind:'goods', qty:5, price_cp:25, object:'obj.b' },
];
const rows = [{id:'r', units:2}, {id:'b', units:3}];
function market(bid = false) {
    const owner = bid ? 'pc' : 'npc.seller';
    const offer = {id:'offer.market', seller:'npc.seller', at:'loc.market', status:'open', bid, lines:structuredClone(lines)};
    return {turn:3, scene:{at:offer.at, present:[offer.seller]}, entities:{pc:{sheet:{coin_cp:50,inventory:{}}}, [offer.seller]:{status:'alive'}},
        offers:{[offer.id]:offer}, services:[], objects:Object.fromEntries(lines.map(l=>[l.object,{id:l.object,name:l.what,qty:5,holder:{entity:owner},for_quests:[]}]))};
}
function buy(s, picks, cp) {
    const events=[];
    const result=bookPurchase(s,e=>{events.push(e);applyEvent(s,e);},{offer:s.offers['offer.market'],picks,cp,objectId:what=>what});
    return {result,events};
}
test('two quantities, one 21 cp purchase, exact physical stacks',()=>{
    const s=market(), quote=pricePositions(s.offers['offer.market'],rows);
    assert.equal(quote.cp,21);
    const {events,result}=buy(s,quote.picks,21); assert.equal(result.error,undefined,result.error);
    assert.deepEqual(events.map(e=>e.t),['transaction.completed','coin.changed','object.moved','object.moved','offer.closed']);
    assert.equal(s.entities.pc.sheet.coin_cp,29);
    assert.deepEqual(events.filter(e=>e.t==='object.moved').map(e=>[e.d.id,e.d.qty]),[['obj.r',2],['obj.b',3]]);
    assert.equal(s.objects['obj.r'].qty,3);assert.equal(s.objects['obj.b'].qty,2);
    assert.equal(buy(s,quote.picks,21).events.length,0);
});
test('changes to an individual price, stock, terms or funds refuse before the first event',()=>{
    for(const change of ['same total','short stock','missing','wrong holder','low funds','conditional','duplicate object']) {
        const s=market(),o=s.offers['offer.market'],q=pricePositions(o,rows);
        if(change==='same total'){o.lines[0].price_cp=30;o.lines[1].price_cp=15;}
        if(change==='short stock')s.objects['obj.b'].qty=2;
        if(change==='missing')delete s.objects['obj.b'];
        if(change==='wrong holder')s.objects['obj.b'].holder={entity:'pc'};
        if(change==='low funds')s.entities.pc.sheet.coin_cp=20;
        if(change==='conditional')o.lines[1].terms='conditional';
        if(change==='duplicate object')o.lines[1].object='obj.r';
        const before=structuredClone(s),r=buy(s,q.picks,q.cp);
        assert.ok(r.result.error,change);assert.deepEqual(r.events,[]);assert.deepEqual(s,before);
    }
});
test('no empty, duplicate, unknown, fractional, overflowing or indivisible selections',()=>{
    const o=market().offers['offer.market'];
    for(const r of [[],[rows[0],rows[0]],[{id:'no',units:1}],...[0,-1,1.5,'2',Number.MAX_SAFE_INTEGER].map(units=>[{id:'r',units}])])
        assert.ok(pricePositions(o,r).error,JSON.stringify(r));
    o.lines[0].price_cp=7;
    assert.ok(pricePositions(o,[rows[0]]).error);
});
test('separately priced bids allow mixed quantities up to demand, a package requires its whole lot',()=>{
    const s=market(true),o=s.offers['offer.market'];
    assert.ok(bidSale(s,o,null,[{id:'r',units:6}]).error);
    const q=bidSale(s,o,null,rows);assert.equal(q.cp,21);assert.deepEqual(q.lines.map(l=>l.qty),[2,3]);
    const items=q.lines.map(l=>({ref:l.object,units:l.qty,splitId:l.object+'_sold'}));
    const events=[],r=bookSale(s,e=>{events.push(e);applyEvent(s,e);},{offer:o,items,buyer:o.seller,cp:q.cp,what:'selected materials'});
    assert.ok(r.ok);assert.equal(s.entities.pc.sheet.coin_cp,71);
    const p=market(true),lot=p.offers[o.id];lot.price_cp=352;lot.lines.forEach(l=>{l.price_cp=null;});
    assert.ok(bidSale(p,lot,null,rows).error);
    assert.equal(bidSale(p,lot,null,lot.lines.map(l=>({id:l.id,units:l.qty}))).cp,352);
});
