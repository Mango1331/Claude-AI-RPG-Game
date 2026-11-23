import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { actionPrefix, validateActionSelection, hudCommands } from '../../src/action_input.js';
import { tradeDraft, localOffers, saleStock, tradePartners } from '../../src/trade_input.js';
import { saleOfferLines, purchaseQuantityLimit } from '../../src/v4/trade.js';
import { prepareGenerationAsync, processReplyAny, runExtraction } from '../../src/v4/runtime.js';

const f = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/user08_205_trade.json.gz',import.meta.url))));
const content = await loadProductContent(), party = 'npc.npchide_buyer', offer = 'offer.t60.3';
const original = structuredClone(f.chat);
const state = chat => {
    const {state,errors} = foldChat(chat);
    assert.deepEqual(errors,[]);
    return state;
};
const lot = state(original).offers[offer].lines;
const rows = lot.map(l=>({id:l.id,units:l.qty}));
const items = lot.map(l=>({id:l.object,units:l.qty}));
const accept = {kind:'trade.accept',party,offer,rows};
const ask = {kind:'trade.ask',party,rows:items};
function append(chat, spec, text, mode = 'hud_roleplay') {
    const prefix = actionPrefix(chat);
    const draft = tradeDraft(state(chat),content,spec);
    assert.ok(draft.ok,draft.reason);
    const selection = {id:'verified-user08-choice',...draft.selection};
    const input = {v:1,id:'input',revision:1,base_revision:prefix,mode,selection,text,label:draft.label};
    chat.push({is_user:true,mes:text,extra:{avereth_action_input:input}});
    return input;
}
const money = e => ['coin.changed','object.moved','item.changed','transaction.completed','offer.closed'].includes(e.t);
const noPlanner = async()=>{throw Error('unexpected model request');};

test('User08 Guild primers use the same panel and prices as local merchant goods',()=>{
    const hall=state(f.chat.slice(0,13)), clerk=tradePartners(hall)[0];
    const manuals=localOffers(hall,clerk).find(o=>o.stock==='manuals');
    assert.equal(manuals.lines.length,5);
    const line=manuals.lines[0], spec={kind:'trade.accept',party:clerk,offer:manuals.id,rows:[{id:line.id,units:1}]};
    hall.entities.pc.sheet.coin_cp=line.price_cp;
    assert.equal(tradeDraft(hall,content,spec).selection.total_cp,line.price_cp);
    assert.deepEqual(localOffers(state(original),clerk),[]);
    const s=state(original);
    const stock=saleStock(s,content);
    assert.ok(stock.some(o=>o.id==='item.small_pouch'));
    assert.ok(!stock.some(o=>o.id==='obj.guild_plate'));
    assert.equal(purchaseQuantityLimit(s,{},{qty:2,price_cp:10,evidence:{basis:'unit'}}),2);
});

test('an inventory price enquiry cannot turn the same carried template into goods offered for purchase',async()=>{
    const chat=structuredClone(original);
    append(chat,{kind:'trade.ask',party,rows:[{id:'item.small_pouch',units:1}]},'What is the pouch worth?');
    await prepareGenerationAsync(chat,content,{llm:noPlanner});
    const s=state(chat), lines=[{kind:'goods',what:'Small Pouch'}];
    assert.equal(s.decisions.at(-1).object,'item.small_pouch');
    assert.deepEqual(saleOfferLines(s,party,lines),lines);
    assert.equal(s.entities.pc.sheet.inventory.small_pouch,1);
});

test('User08 M61 direct acceptance reproduces the physical sale, purse and original reply without a Planner',async()=>{
    const reference=structuredClone(original);
    reference.push({mes:f.accept,is_user:true,extra:{}});
    const used=[];
    await prepareGenerationAsync(reference,content,{llm:async({purpose})=>{used.push(purpose);return f.plans[used.length-1];}});
    assert.deepEqual(used,['plan','plan_repair']);
    const chat=structuredClone(original), before=state(chat);
    append(chat,accept,f.accept);
    const result=await prepareGenerationAsync(chat,content,{llm:noPlanner});assert.equal(result.action,'context');
    const ref=rec(reference.at(-1)).events.filter(money);
    assert.deepEqual(ref,f.expectedEvents.filter(money));
    assert.deepEqual(rec(chat.at(-1)).events.filter(money),ref);
    const after=state(chat);
    assert.equal(after.entities.pc.sheet.coin_cp,472);
    assert.equal(before.entities.pc.sheet.coin_cp,120);
    assert.equal(after.offers[offer].status,'accepted');
    assert.deepEqual(after.objects,state(reference).objects);
    assert.deepEqual(after.rng,state(reference).rng);
    const stone=Object.values(after.objects).find(o=>/skill stone/i.test(o.name));
    assert.equal(stone.holder.entity,'pc');
    for(const log of [chat,reference]){
        log.push({is_user:false,mes:f.reply,extra:{}});
        const i=log.length-1;
        assert.ok(processReplyAny(log,i,content,{}).extract);
        await runExtraction(log,i,content,async()=>JSON.stringify(f.report));
        assert.equal(rec(log[i]).extraction.status,'applied');
    }
    assert.deepEqual(state(chat).objects,state(reference).objects);
    assert.deepEqual(state(chat).threads,state(reference).threads);
    assert.deepEqual(state(JSON.parse(JSON.stringify(chat))),state(chat));
    const booked=structuredClone(rec(chat[61]).events);
    await prepareGenerationAsync(chat,content,{llm:noPlanner,type:'regenerate'});
    assert.deepEqual(rec(chat[61]).events,booked);
});

test('M59 mixed price request with the Skill Stone question preserves the actual bid and locations',async()=>{
    const chat=structuredClone(original.slice(0,59));
    const input=append(chat,ask,original[59].mes,'hud_free');
    const cmds=hudCommands(input.selection),plan={commands:cmds,hud_binding:{id:input.selection.id,decision:'use',seqs:cmds.map(c=>c.seq)}};
    const seen=[];
    await prepareGenerationAsync(chat,content,{llm:async req=>{seen.push(req.purpose);return JSON.stringify(plan);}});
    assert.deepEqual(seen,['plan']);assert.equal(rec(chat[59]).action_error,undefined);
    assert.equal(rec(chat[59]).events.filter(e=>e.t==='decision.opened').length,5);
    assert.deepEqual(rec(chat[59]).events.filter(money),[]);
    chat.push({mes:original[60].mes,is_user:false,extra:{}});
    assert.ok(processReplyAny(chat,60,content,{}).extract);
    await runExtraction(chat,60,content,async()=>JSON.stringify(f.bidReport));
    assert.equal(rec(chat[60]).extraction.status,'applied');
    const after=state(chat),reference=state(original);
    assert.deepEqual(after.offers[offer],reference.offers[offer]);
    assert.deepEqual(after.places,reference.places);
    assert.equal(after.entities.pc.sheet.coin_cp,120);
});
test('a pure enquiry against the existing 352 cp bid never accepts it, including an Extractor sale claim',async()=>{
    const chat=structuredClone(original);append(chat,ask,'What would you pay for these materials?');
    await prepareGenerationAsync(chat,content,{llm:noPlanner});
    assert.deepEqual(rec(chat[61]).events.filter(money),[]);
    chat.push({mes:'The buyer offers to take the materials for the same price.',is_user:false,extra:{}});
    processReplyAny(chat,62,content,{});
    const expected=Object.fromEntries(items.map((_,i)=>[i+1,{sold:true,price_cp:352}]));
    await runExtraction(chat,62,content,async()=>JSON.stringify({scene:'here',expected,deltas:[]}));
    assert.equal(rec(chat[62]).extraction.status,'applied');
    assert.equal(state(chat).entities.pc.sheet.coin_cp,120);
    assert.deepEqual(state(chat).objects,state(original).objects);
    assert.equal(state(chat).offers[offer].status,'open');
});
test('a settlement disguised as a gift does not pay for the retained stock; an independent tip can coexist',async()=>{
    const chat=structuredClone(original);append(chat,ask,'Please give me a quote on these.');
    await prepareGenerationAsync(chat,content,{llm:noPlanner});
    const settlement='The buyer hands him six copper for the risen bones', tip='and adds one copper as a tip for his directions';
    chat.push({mes:settlement+', '+tip+'.',is_user:false,extra:{}});
    processReplyAny(chat,62,content,{});
    const expected=Object.fromEntries(items.map((_,i)=>[i+1,{sold:false,price_cp:null}]));
    const deltas=[[settlement,6,'six copper','sale price of F-Rank Risen Bones Bone'],[tip,1,'one copper','thanks for directions']].map(([said,cp,quote,why],i)=>({
        seq:i+1,type:'coin.gift',from:party,cp,why,said,repeat_of:null,phase:'transferred',relation:'independent',money:{quote,currency_quote:null},
    }));
    await runExtraction(chat,62,content,async()=>JSON.stringify({scene:'here',expected,deltas}));
    assert.equal(rec(chat[62]).extraction.status,'applied');
    assert.equal(state(chat).entities.pc.sheet.coin_cp,121);
    assert.deepEqual(state(chat).objects,state(original).objects);
    assert.equal(state(chat).offers[offer].status,'open');
});

test('renegotiating an existing bid leaves both sides free until a separate explicit acceptance',async()=>{
    const chat=structuredClone(original);
    append(chat,{kind:'trade.ask',party,offer},'Can you offer better terms?');
    await prepareGenerationAsync(chat,content,{llm:noPlanner});
    assert.deepEqual(rec(chat[61]).events.filter(money),[]);
    const said='I offer thirty-six silver for the whole lot.';
    chat.push({is_user:false,mes:'The hide buyer looks up. “'+said+'”',extra:{}});
    processReplyAny(chat,62,content,{});
    const bid={...f.bidReport.deltas[0],seq:1,said,price_cp:360,pricing:{basis:'total',quote:'thirty-six silver',currency_quote:null}};
    await runExtraction(chat,62,content,async()=>JSON.stringify({scene:'here',expected:{},deltas:[bid]}));
    assert.equal(rec(chat[62]).extraction.status,'applied');
    const s=state(chat),counter=localOffers(s,party).find(o=>o.bid && o.price_cp===360);
    assert.ok(counter);
    assert.equal(s.offers[offer].status,'expired');
    assert.equal(s.entities.pc.sheet.coin_cp,120);assert.deepEqual(s.objects,state(original).objects);
    append(chat,{kind:'trade.accept',party,offer:counter.id,rows:counter.lines.map(l=>({id:l.id,units:l.qty}))},'I accept her new bid.');
    await prepareGenerationAsync(chat,content,{llm:noPlanner});
    assert.equal(state(chat).entities.pc.sheet.coin_cp,480);
    assert.equal(state(chat).offers[counter.id].status,'accepted');
});

test('an extra acceptance from a mixed enquiry planner is refused before any action',async()=>{
    const chat=structuredClone(original),input=append(chat,ask,'What about another price?','hud_free');
    const cmds=hudCommands(input.selection);
    const plan={commands:[...cmds,{seq:6,type:'offer.accept',offer,quote:'another price'}],hud_binding:{id:input.selection.id,decision:'use',seqs:cmds.map(c=>c.seq)}};
    await prepareGenerationAsync(chat,content,{llm:async()=>JSON.stringify(plan)});
    assert.ok(rec(chat[61]).action_error);assert.deepEqual(rec(chat[61]).events,[]);
});
test('stale, ill-priced, wrong-location and incomplete HUD terms have no authority',async()=>{
    const s=state(original),draft=tradeDraft(s,content,accept),sel={id:'a',...draft.selection};
    for(const change of [{total_cp:351},{direction:'buy'},{party:'pc'},{at:'elsewhere'},{rows:rows.slice(1)},{terms:[]}]) {
        assert.equal(validateActionSelection({...sel,...change},s,content).ok,false);
    }
    const other=structuredClone(s);other.scene.at='elsewhere';
    assert.deepEqual(localOffers(other,party),[]);
    s.offers[offer].terms='conditional';
    assert.equal(validateActionSelection(sel,s,content).ok,false);
    const chat=structuredClone(original);
    const input=append(chat,accept,'I might accept, for a different amount.','hud_free');
    await prepareGenerationAsync(chat,content,{llm:noPlanner});assert.deepEqual(rec(chat[61]).events,[]);
    input.mode='hud_roleplay';input.base_revision='outdated';delete chat[61].extra.avereth;
    await prepareGenerationAsync(chat,content,{llm:noPlanner});assert.deepEqual(rec(chat[61]).events,[]);
});
