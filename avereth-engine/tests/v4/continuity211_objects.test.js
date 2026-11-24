import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';
import { planContext, parsePlan } from '../../src/v4/planner.js';
import { parseExtraction, worldVocab } from '../../src/v4/extract.js';
import { buildCatalog, extractorCatalog } from '../../src/v4/catalog.js';

const content = await loadProductContent();
const fixture = name => JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/' + name, import.meta.url))));
const archive = fixture('continuity210_objects.json.gz');
const bread = fixture('continuity211_bread.json.gz');
const satchel = 'obj.t40.mother_wrens_leather_satchel';
const wren = 'npc.mother_wren';
const empty = { scene:'here',expected:{},deltas:[] };
function play(start, commands, report=empty, input='I take it.', prose='The two talk.', msg=41) {
    const p=playerTurnV4(start,content,input,{c:true,commands,msg});
    const x=replyTurnV4(p.state,content,report,{msg:msg+1,prose});
    return {p,x,s:x.state};
}
const move=(seq,object,to,qty=1) => ({seq,type:'object.move',object,to,qty,scene:'here'});
const take = {seq:1,type:'take',object:satchel,qty:1,quote:'I take the bag by the sound end'};

test('natural C19 focus: present owner may lend; none of an offer, refusal or arrival alone moves the item', () => {
    const {start,turns} = archive.c19;
    const p=playerTurnV4(start,content,turns[0].input,{c:true,commands:[take,...turns[0].commands.slice(1)],msg:41});
    assert.equal(p.outcome.resolutions[0].reason,'awaiting handover');
    assert.deepEqual(p.state.objects[satchel].holder,{entity:wren});
    assert.equal(p.outcome.actions.some(s=>s.includes('CANNOT TAKE')),false);
    const original=replyTurnV4(p.state,content,turns[0].report,{msg:42,prose:turns[0].prose});
    assert.deepEqual(original.state.objects[satchel].holder,{entity:wren});
    assert.equal(Object.values(original.state.objects).filter(o=>o.name==='the bag').length,0);
    const report=structuredClone(turns[0].report);
    for (const delta of report.deltas) delta.seq++;
    report.deltas.unshift({...move(1,satchel,'pc'),scene:start.scene.at});
    const given=replyTurnV4(p.state,content,report,{msg:42,prose:turns[0].prose});
    assert.deepEqual(given.state.objects[satchel].holder,{entity:'pc'});
    const midway=play(given.state,turns[1].commands,turns[1].report,turns[1].input,turns[1].prose,43);
    const returned=structuredClone(turns[2].report);
    returned.deltas.push({...move(returned.deltas.length+1,satchel,wren),scene:'loc.halloran_steading.halloran_house'});
    const end=play(midway.s,turns[2].commands,returned,turns[2].input,turns[2].prose,45);
    assert.deepEqual(end.s.objects[satchel].holder,{entity:wren});
    assert.equal(Object.values(end.s.objects).filter(o=>o.name==='the bag').length,0);

    const refusal=play(start,[take],empty,turns[0].input,'Wren offers it for tomorrow and keeps it for the night.');
    assert.deepEqual(refusal.s.objects[satchel].holder,{entity:wren});
    for (const expected of [{},{1:{taken:false}}]) {
        const offerOnly=play(start,[take],{scene:'here',expected,deltas:[move(1,satchel,'pc')]},
            take.quote,'The healer offers to lend the satchel tomorrow and keeps it for now.');
        assert.deepEqual(offerOnly.s.objects[satchel].holder,{entity:wren});
        assert.ok(offerOnly.x.rejected.some(r=>r.rule==='handover_unconfirmed'));
    }
    const notReceived=play(start,[take],{scene:'here',expected:{1:{taken:true}},deltas:[]});
    assert.deepEqual(notReceived.s.objects[satchel].holder,{entity:wren});
    const dependent={seq:2,type:'give',object:satchel,to:wren,qty:1,needs:1,quote:'then I pass it back'};
    assert.equal(play(start,[take,dependent]).p.outcome.resolutions[1].reason,'needs step 1');
    const absent=structuredClone(start);
    absent.scene.present=absent.scene.present.filter(id=>id!==wren);
    const noOwner=play(absent,[take],{...empty,deltas:[move(1,satchel,'pc')]});
    assert.equal(noOwner.p.outcome.resolutions[0].status,'refused');
    assert.deepEqual(noOwner.s.objects[satchel].holder,{entity:wren});
    const sale=structuredClone(start);
    sale.offers['offer.now']={id:'offer.now',seller:wren,status:'open',at:start.scene.at,
        lines:[{kind:'goods',what:sale.objects[satchel].name,object:satchel,qty:1,price_cp:100}]};
    const unpaid=play(sale,[take],{...empty,deltas:[move(1,satchel,'pc')]});
    assert.equal(unpaid.p.outcome.resolutions[0].status,'refused');
    assert.deepEqual(unpaid.s.objects[satchel].holder,{entity:wren});
});

test('two separately reported portions never overwrite each other; excess X units do not transfer the remainder', () => {
    const start=structuredClone(archive.c19.start);
    start.objects[satchel].qty=5;
    const transfers=[move(1,satchel,'pc',1),move(2,satchel,'pc',2),move(3,satchel,'pc',3)];
    const {s,x}=play(start,[],{...empty,deltas:transfers});
    const pieces=Object.values(s.objects).filter(o=>o.name===start.objects[satchel].name);
    assert.equal(pieces.reduce((n,o)=>n+o.qty,0),5);
    assert.deepEqual(pieces.filter(o=>o.holder.entity==='pc').map(o=>o.qty),[1,2]);
    assert.equal(s.objects[satchel].qty,2);
    assert.ok(x.rejected.some(r=>r.rule==='object_quantity'));
});

test('whole quantities of ordinary bread at B15: never give away the whole last wedge then narrate eating the same unit', () => {
    const id=bread.commands[0].object;
    const original=play(bread.start,bread.commands,bread.report,bread.input,bread.prose,bread.i);
    assert.deepEqual(original.p.outcome.resolutions.slice(0,2).map(r=>r.reason),['insufficient whole units','insufficient whole units']);
    assert.deepEqual(original.s.objects[id].holder,{entity:'pc'});
    assert.equal(original.p.outcome.resolutions[2].status,'resolved');
    const shared={...bread.commands[1],seq:1,quote:'I eat my half'};
    const together=play(bread.start,[shared,bread.commands[2]],bread.report,bread.input,bread.prose,bread.i);
    assert.deepEqual(together.s.objects[id].holder,{consumed:'pc'});
    const portions=structuredClone(bread.start);
    portions.objects[id].qty=2;
    const measured=play(portions,bread.commands,bread.report,bread.input,bread.prose,bread.i);
    const split=Object.values(measured.s.objects).filter(o=>o.name===portions.objects[id].name);
    assert.equal(split.filter(o=>o.holder.entity===bread.commands[0].to).reduce((n,o)=>n+o.qty,0),1);
    assert.equal(split.filter(o=>o.holder.consumed==='pc').reduce((n,o)=>n+o.qty,0),1);
});

test('B8/B9 original: repaired table alone does not deduct an unidentified material or tool; a metered fit does', () => {
    const [gather,craft] = archive.b8.turns;
    const original=play(archive.b8.start,gather.commands,gather.report,gather.input,gather.prose,gather.i);
    const bundle=Object.values(original.s.objects).find(o=>o.name.includes('boards from Marta'));
    const without=play(original.s,craft.commands,craft.report,craft.input,craft.prose,craft.i);
    assert.deepEqual(without.s.objects[bundle.id].holder,{entity:'pc'});
    const state=structuredClone(original.s);
    const stock=state.objects[bundle.id];
    Object.assign(stock,{name:'sawn boards',kind:'resource',use:'consumable',unit:'board',qty:3});
    const command={...craft.commands[0],material:stock.id,qty:2};
    const ctx=planContext(state,content,buildCatalog(state,content,{c:true}));
    const parsed=parsePlan(JSON.stringify({commands:[command]}),content.commandVocab,ctx,craft.input);
    assert.deepEqual(parsed.errors,[]);
    const result=play(state,parsed.commands,craft.report,craft.input,craft.prose,craft.i);
    assert.equal(result.s.objects[stock.id].qty,1);
    const incomplete = structuredClone(craft.report);
    incomplete.expected['1'].done=false;
    assert.equal(play(state,[command],incomplete,craft.input,craft.prose,craft.i).s.objects[stock.id].qty,3);
    for (const variant of [{kind:'item',use:'tool'}, {holder:{entity:'npc.otty'}}, {for_quests:['quest.old']}]) {
        const guarded=structuredClone(state);
        Object.assign(guarded.objects[stock.id],variant);
        const tried=play(guarded,[command],craft.report,craft.input,craft.prose,craft.i);
        assert.equal(tried.p.outcome.resolutions[0].reason,'unavailable craft material');
        assert.deepEqual(tried.s.objects[stock.id],guarded.objects[stock.id]);
    }
    for (const size of [1,3]) {
        const noQuantity=structuredClone(state);
        noQuantity.objects[stock.id].qty=size;
        const tried=play(noQuantity,[{...command,qty:null}],craft.report,craft.input,craft.prose,craft.i);
        assert.deepEqual(tried.s.objects[stock.id],noQuantity.objects[stock.id]);
    }
    const oversized=play(state,[{...command,qty:4}],craft.report,craft.input,craft.prose,craft.i);
    assert.deepEqual(oversized.s.objects[stock.id],stock);
});

test('B8/B9 chained receipts: two individual boards identified at pickup become two spent units on successful installation', () => {
    const [gather, craft] = archive.b8.turns;
    const report = structuredClone(gather.report);
    for (const delta of report.deltas) delta.seq++;
    report.deltas.unshift({seq:1,scene:archive.b8.start.scene.at,type:'object.new',name:'sawn boards',kind:'resource',
        unit:'board',qty:2,holder:'pc'});
    const gathered = play(archive.b8.start,gather.commands,report,gather.input,gather.prose,gather.i);
    const stock = Object.values(gathered.s.objects).find(o=>o.name==='sawn boards');
    assert.equal(stock?.qty,2);
    const fitted = play(gathered.s,[{...craft.commands[0],material:stock.id,qty:2}],craft.report,craft.input,craft.prose,craft.i);
    assert.deepEqual(fitted.s.objects[stock.id].holder,{consumed:'craft'});
    assert.equal(fitted.x.events.filter(e=>e.t==='object.consumed' && e.d.id===stock.id).length,1);
    assert.equal(Object.values(fitted.s.objects).filter(o=>o.name==='sawn boards').length,1);
});

test('receiving a local find cannot bring back a consumed lot or a tool left at a different site', () => {
    for (const holder of [{consumed:'craft'},{consumed:'pc'},{loc:'loc.halloran_steading'}]) {
        const start=structuredClone(archive.c19.start);
        start.objects[satchel].holder=holder;
        const cmd={seq:1,type:'take',object:{new:'fallen apple'},qty:1,quote:'I take the apple'};
        const result=play(start,[cmd],{scene:'here',expected:{1:{taken:true}},deltas:[move(1,satchel,'pc')]},cmd.quote);
        assert.deepEqual(result.s.objects[satchel].holder,holder);
        assert.ok(result.x.rejected.some(r=>r.rule==='object_source'));
        assert.ok(Object.values(result.s.objects).some(o=>o.name==='fallen apple' && o.holder.entity==='pc'));
    }
});

test('A3: drink the broth first, then return the vessel only if a separate empty bowl exists', () => {
    const original = fixture('continuity211_broth.json.gz');
    const id = original.commands[0].object;
    const first = play(original.start,original.commands,original.report,original.input,original.prose,original.i);
    assert.deepEqual(first.s.objects[id].holder,{consumed:'pc'});
    assert.equal(first.p.events.filter(e=>e.t==='object.consumed' && e.d.id===id).length,1);
    assert.equal(first.p.outcome.resolutions[1].reason,'he does not hold it');
    const start = structuredClone(original.start);
    const bowl = 'obj.empty_earthenware_bowl';
    start.objects[bowl] = { ...start.objects[id],id:bowl,name:'empty earthenware bowl',use:'tool',qty:1,holder:{entity:'pc'} };
    const separate=structuredClone(original.commands);
    separate[1].object=bowl;
    const two=play(start,separate,original.report,original.input,original.prose,original.i);
    assert.deepEqual(two.s.objects[id].holder,{consumed:'pc'});
    assert.deepEqual(two.s.objects[bowl].holder,{entity:'npc.meg'});
});

test('B5 conditional delivery rejects a physical receipt larger than the entire keg stock', () => {
    const turn=archive.b5.turns[0];
    const id='obj.t12.keg_of_salted_herring';
    const command={seq:3,type:'give',object:id,qty:1,to:{new:'Bren'},needs:2,quote:"take it to Bren's stall on the west side of the market"};
    const report=structuredClone(turn.report);
    report.deltas.push({seq:report.deltas.length+1,type:'object.move',object:id,qty:3,to:'npc.bren'});
    const caught=play(archive.b5.start,[...turn.commands,command],report,turn.input,turn.prose,turn.i);
    assert.deepEqual(caught.s.objects[id].holder,{entity:'pc'});
    assert.ok(caught.x.rejected.some(r=>r.rule==='object_quantity'));
});

test('an omitted voluntary receipt closes as false without repair or loss of an independent fact; the GO still must be answered', () => {
    const turn=archive.c19.turns[0];
    const p=playerTurnV4(archive.c19.start,content,turn.input,{c:true,commands:[take,turn.commands[1]],msg:41});
    const ids=extractorCatalog(p.state,content,{c:true});
    const report=structuredClone(turn.report);
    delete report.expected['1'];
    const parse=r=>parseExtraction(JSON.stringify(r),worldVocab(content.deltaVocab,p.state),ids,p.outcome.expected_keys,{
        sceneRequired:true,state:p.state,content,startScene:p.state.scene.at,reply:turn.prose});
    const ok=parse(report);
    assert.ok(ok.valid && ok.complete);
    assert.deepEqual(ok.value.expected['1'],{taken:false});
    assert.equal(ok.value.deltas.length,turn.report.deltas.length);
    const applied=replyTurnV4(p.state,content,ok.value,{msg:42,prose:turn.prose});
    assert.notEqual(applied.state.scene.at,p.state.scene.at);
    assert.deepEqual(applied.state.objects[satchel].holder,{entity:wren});
    delete report.expected['2'];
    const missing=parse(report);
    assert.equal(missing.complete,false);
    assert.deepEqual(missing.missing,['2']);
});
