import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { campaign, inject, say } from './patch8_lib.js';
import { transferCargo, deliveryStatus, additionalContainerReturn } from '../../src/v4/delivery.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { boardFor } from '../../src/v4/runtime.js';
import { buildContext } from '../../src/context.js';
const content = await loadProductContent();
const base = (await campaign(content)).state();
const original = JSON.parse(fs.readFileSync(new URL('./fixtures/run7_delivery.json', import.meta.url)));
function delivery() {
    const s = structuredClone(base), f = structuredClone(original);
    Object.assign(s.places, f.places); s.scene = f.scene; s.entities[f.recipient.id] = f.recipient;
    s.quests = { [f.quest.id]: f.quest }; s.objects = { [f.object.id]: f.object };
    return s;
}
function give(s, mutate = () => {}) {
    const x = Object.values(s.objects)[0]; mutate(x, s); const events = [];
    transferCargo(s, content, e => { events.push(e); applyEvent(s, e); }, x, { entity: 'npc.garrett' }, 1, 2);
    return events.filter(e => e.t === 'quest.delivered');
}
test('3B Run 7 original cargo and actual present recipient produce one receipt despite wording', () => {
    const s = delivery(); assert.equal(give(s).length, 1);
    assert.equal(deliveryStatus(Object.values(s.quests)[0]), null);
    assert.equal(give(s).length, 0, 'same origin cannot count twice');
});
for (const [label, change] of [
    ['cloth bound to same quest', x => x.name = 'oiled cloth'],
    ['supporting document', x => { x.kind = 'document'; x.name = 'signed letter about the locked case'; }],
    ['foreign quest', x => x.for_quests = ['quest.other']],
    ['absent recipient', (x,s) => s.scene.present = ['pc']],
    ['wrong place', (x,s) => s.scene.at = 'loc.ashbridge'],
    ['contract slip', (x,s) => { delete s.objects[x.id]; x.id = 'obj.slip.some_contract'; s.objects[x.id] = x; }],
]) test(`3B delivery rejects ${label}`, () => assert.equal(give(delivery(), change).length, 0));
function stall() {
    const s = structuredClone(base); s.entities['npc.tam'] = { id: 'npc.tam', kind: 'npc', name: 'Tam', status: 'alive', descriptors: ['fishmonger'], location: s.scene.location, at: s.scene.at };
    s.scene.present.push('npc.tam'); s.last = { input: 'I ask about work.', outcome: { c: true, auth: { c: true } } }; return s;
}
const line = (what, service='other') => ({ what, kind: 'service', service, qty: 1, price_cp: 1, said: 'one copper' });
test('3B employer offer becomes private paid work, never a service purchase', () => {
    const s = stall(); const r = applyWorld(s, content, {expected:{},deltas:[{seq:1,type:'offer',seller:'npc.tam',lines:[line('keeping gulls off his stall for the morning')]}]}, {msg:200,prose:'One copper for the morning, and you keep the gulls off my tables. You stand there and start now.'});
    assert.equal(Object.values(r.state.offers).filter(o=>o.seller==='npc.tam').length, 0);
    const q = Object.values(r.state.quests).find(q=>q.kind==='private'); assert.ok(q); assert.equal(q.payout_cp, 1);
    assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp);
});
test('3B buying legitimate lodging stays a purchase offer', () => {
    const s=stall();const r=applyWorld(s,content,{expected:{},deltas:[{seq:1,type:'offer',seller:'npc.tam',lines:[line('a bed for tonight','lodging')]}]},{msg:200,prose:'You can rent a bed for one copper.'});
    assert.ok(Object.values(r.state.offers).some(o=>o.seller==='npc.tam'));
});
test('3B old misclassified service cannot charge an explicit employee acceptance', () => {
    const s=stall(); s.offers.work={id:'work',seller:'npc.tam',status:'open',lines:[{id:'l1',...line('guarding the stall')}]};
    const before=s.entities.pc.sheet.coin_cp, events=[];
    resolveCommands(s,content,[{seq:1,type:'offer.accept',offer:'work',quote:"I'll work the morning shift."}],e=>{events.push(e);applyEvent(s,e);},{c:true,msg:200});
    assert.equal(s.entities.pc.sheet.coin_cp,before); assert.ok(!events.some(e=>e.t==='service.granted'));
});
function hall() {const s=stall();s.places.hall={id:'hall',name:'Guild hall',kind:'guild_hall',parent:s.scene.location,tags:['guild_hall']};s.scene.at='hall';return s;}
test('3B asking for jobs in a hall can generate the real board even if planner returned other', () => {
    assert.ok(boardFor(hall(),content,[{seq:1,type:'other',quote:'Are there any available jobs?'}],{c:true}));
});
test('3B ordinary conversation never generates a board',()=>assert.equal(boardFor(hall(),content,[{seq:1,type:'other',quote:'How is your family?'}],{c:true}),null));
test('3B narrator always has an authoritative board boundary, even before first board generation',()=>{
    const s=hall();assert.match(buildContext(s,content,{input:'Hello',outcome:{c:true},budget:4000}).text,/OFFICIAL GUILD OFFERS/);
});
test('3B additional container returns are clause-specific',()=>{
    const q={task:'Deliver the crate.',desired_end_state:'It reaches the healer.'};
    assert.equal(additionalContainerReturn(q,'You must bring back the empty crate to the shop'),true);
    assert.equal(additionalContainerReturn(q,'The crate must go back to the shop'),true);
    assert.equal(additionalContainerReturn(q,'The wagon must be back by noon'),false);
});
test('3B NPC providing guard service remains a normal sale, not employment',()=>{
    const s=stall();const r=applyWorld(s,content,{expected:{},deltas:[{seq:1,type:'offer',seller:'npc.tam',lines:[line('guarding your stall')]}]},{msg:200,prose:"For one copper I will guard your stall. You stand here while I protect it."});
    assert.ok(Object.values(r.state.offers).some(o=>o.seller==='npc.tam')); assert.equal(Object.values(r.state.quests).filter(q=>q.kind==='private').length,0);
});
test('3B private unpaid help is still possible',()=>{
    const s=stall();const r=applyWorld(s,content,{expected:{},deltas:[{seq:1,type:'quest.offer',giver:'npc.tam',title:'Help mend the net',reward_cp:0,objectives:['Mend the net'],proof:[]}]},{msg:200,prose:'Tam asks for voluntary help with his net.'});
    assert.ok(Object.values(r.state.quests).some(q=>q.kind==='private'&&q.payout_cp===0));
});
test('3B a phantom official notice cannot be persisted as a private quest',()=>{
    const s=hall();const r=applyWorld(s,content,{expected:{},deltas:[{seq:1,type:'quest.offer',giver:'npc.tam',title:'Lost Lamb',reward_cp:10,objectives:['Find lamb'],proof:[]}]},{msg:200,prose:'On the Guild board: Lost Lamb, a new official Guild contract.'});
    assert.ok(!Object.values(r.state.quests).some(q=>q.title==='Lost Lamb'));
    assert.ok(r.events.some(e=>e.t==='overreach.noted'&&e.d.kind==='guild_listing'));
});
test('3B old-day listings are not presented as selectable offers',()=>{
    const s=hall();s.clock.minute=3000;s.quests.old={id:'old',kind:'guild_contract',status:'listed',title:'Stale notice',source:{branch:s.scene.location,listed:{day:1}}};
    const block=buildContext(s,content,{input:'Hello',outcome:{c:true},budget:4000}).text;
    assert.ok(!block.includes('- old: Stale notice [listed]'));
});
test('3B accepted private work settles through actual employer payment, not a reversed purchase',()=>{
    const s=stall(), before=s.entities.pc.sheet.coin_cp;
    const offered=applyWorld(s,content,{expected:{},deltas:[{seq:1,type:'quest.offer',giver:'npc.tam',title:'Morning watch',reward_cp:1,objectives:['Watch the stall until noon'],proof:[]}]},{msg:201,prose:'Tam offers one copper to watch his stall until noon.'});
    const q=Object.values(offered.state.quests).find(q=>q.title==='Morning watch');
    resolveCommands(offered.state,content,[{seq:1,type:'quest.accept',quest:q.id,quote:'I accept the morning watch.'}],e=>applyEvent(offered.state,e),{c:true,msg:202});
    const paid=applyWorld(offered.state,content,{expected:{},deltas:[{seq:1,type:'quest.close',quest:q.id,status:'completed',by:'npc.tam'},{seq:2,type:'coin.gift',from:'npc.tam',cp:1,said:'one copper',why:'wage for completed morning watch'}]},{msg:203,prose:'At noon Tam confirms the watch is finished and hands him one copper for his work.'});
    assert.equal(paid.state.quests[q.id].status,'completed');assert.equal(paid.state.entities.pc.sheet.coin_cp,before+1);
    assert.equal(paid.events.filter(e=>e.t==='coin.changed').length,1);assert.ok(!paid.events.some(e=>e.t==='service.granted'));
});
test('3B separate unbound lookalike cannot replace original bound cargo',()=>{
    const s=delivery(), originalObject=Object.values(s.objects)[0];
    const fake={...structuredClone(originalObject),id:'obj.fake',name:'locked case of instruments and bandages',for_quests:[]};
    s.objects={ [fake.id]:fake,[originalObject.id]:originalObject };assert.equal(give(s).length,0);
});
test('3B partial original cargo preserves capacity and replayed receipts',()=>{
    const s=delivery(),x=Object.values(s.objects)[0],q=Object.values(s.quests)[0];x.qty=2;q.objectives[0].qty=2;
    assert.equal(give(s).length,1);assert.equal(deliveryStatus(q)?.ok,false);
    assert.equal(give(s).length,1);assert.equal(deliveryStatus(q),null);assert.equal(give(s).length,0);
    assert.equal(q.deliveries.reduce((n,r)=>n+r.qty,0),2);
    const replay=structuredClone(s);for(const receipt of q.deliveries)applyEvent(replay,{t:'quest.delivered',d:{id:q.id,receipt}});
    assert.deepEqual(replay.quests[q.id].deliveries,q.deliveries);
});
test('3B ambiguous agreement to old work offer asks rather than charging; explicit hiring still buys',()=>{
    for(const [quote,buy] of [["Deal, I'm in.",false],['I hire you to guard the stall for one copper.',true]]) {
        const s=stall();s.offers.work={id:'work',seller:'npc.tam',status:'open',lines:[{id:'l1',...line('guarding the stall')}]};
        const before=s.entities.pc.sheet.coin_cp;
        resolveCommands(s,content,[{seq:1,type:'offer.accept',offer:'work',quote}],e=>applyEvent(s,e),{c:true,msg:200});
        assert.equal(s.entities.pc.sheet.coin_cp,before-(buy?1:0));
    }
});
test('3B natural job inquiry books real listings once through the product planner path',async()=>{
    const g=await campaign(content); inject(g,[{t:'place.created',d:{place:{id:'loc.alderwatch.test_hall',name:'Guild hall',kind:'interior',parent:g.state().scene.location,tags:['guild_hall']}}},{t:'scene.moved',d:{at:'loc.alderwatch.test_hall',place:'Guild hall'}}]);
    g.listings=Array.from({length:5},(_,i)=>({title:`Cull the wolves at Farm ${i}`,client:`Farmer ${i}`,rank:'Novice',level:1,qtype:'minor',payout_cp:50,task:`Cull one wolf at Farm ${i}.`,desired_end_state:`The wolf at Farm ${i} is defeated.`,objectives:[{verb:'DEFEAT',what:'wolf',qty:1,where:`Farm ${i}`}],proof:[]}));
    for (const i of [2, 3]) g.listings[i] = { ...g.listings[i], title: `Medicine delivery ${i}`, objectives: [{ verb: 'DELIVER', what: 'sealed medicine parcel', qty: 1, unit: null, where: `Healer at Farm ${i}` }] };
    g.listings[4] = { ...g.listings[4], title: 'Clear Old Crown Catacombs', task: 'Clear level 1. Danger: a group may overwhelm a solo beginner.', objectives: [{ verb: 'DEFEAT', what: 'restless skeletons', qty: null, unit: null, where: 'Old Crown Catacombs, level 1' }] };
    await say(g,'Are there any available jobs?');
    assert.equal(Object.values(g.state().quests).filter(q=>q.kind==='guild_contract'&&q.status==='listed').length,5);
    const calls=g.calls.filter(c=>c.purpose==='board').length;assert.equal(calls,1);
    await g.reply('The clerk describes the five listed contracts.');
    await say(g,'What jobs are available?',{type:'other',what:'Ask about available jobs'});
    assert.equal(g.calls.filter(c=>c.purpose==='board').length,calls,'same-day list is reused');
});
