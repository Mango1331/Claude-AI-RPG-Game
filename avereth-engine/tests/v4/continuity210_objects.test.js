import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';

const content = await loadProductContent();
const corpus = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/continuity210_objects.json.gz', import.meta.url))));
const satchel = 'obj.t40.mother_wrens_leather_satchel';
const keeper = 'npc.mother_wren';

function play(state, turn, { commands = turn.commands, report = turn.report } = {}) {
    const p = playerTurnV4(state, content, turn.input, { c: true, commands, msg: turn.i });
    const x = replyTurnV4(p.state, content, report, { msg: turn.i + 1, prose: turn.prose });
    return { p, x, state: x.state };
}
function newBag(s) {
    return Object.values(s.objects).filter(o => o.name === 'the bag');
}

test('C19 and C21 unchanged model answers contain no transfer authority for the satchel ID', () => {
    let s = corpus.c19.start;
    for (const turn of corpus.c19.turns) s = play(s, turn).state;
    // The original model introduced an unlisted alias and supplied only taken:true. A different name
    // cannot be identified from custody alone. Carrying the real bag requires an ID-bearing move below.
    assert.deepEqual(s.objects[satchel].holder, { entity: keeper });
});

test('C19 and C21 controlled existing-ID moves transfer the same bag; C21 without receipt retains custody', () => {
    const { start, turns } = corpus.c19;
    const take = structuredClone(turns[0]);
    // Controlled X: the previously offered physical object changes hands at the preceding scene, before departure.
    take.report.deltas.forEach(delta => delta.seq++);
    take.report.deltas.unshift({ seq: 1, scene: start.scene.at, type: 'object.move', object: satchel, qty: 1, to: 'pc' });
    let s = play(start, take).state;
    assert.deepEqual(s.objects[satchel].holder, { entity:'pc' });
    assert.deepEqual(newBag(s), []);
    s = play(s, turns[1]).state;
    assert.deepEqual(s.objects[satchel].holder, { entity:'pc' });
    assert.deepEqual(play(s, turns[2]).state.objects[satchel].holder, { entity:'pc' });
    const returned = structuredClone(turns[2]);
    returned.report.deltas.push({ seq: returned.report.deltas.length + 1, scene: 'loc.halloran_steading.halloran_house',
        type: 'object.move', object: satchel, qty: 1, to: keeper });
    s = play(s, returned).state;
    assert.deepEqual(s.objects[satchel].holder, { entity: keeper });
    assert.deepEqual(newBag(s), []);
});

test('B5/6 cargo is not auto-delivered at arrival; explicitly given dill transfers once', () => {
    let s = corpus.b5.start;
    for (const turn of corpus.b5.turns) s = play(s, turn).state;
    assert.deepEqual(s.objects['obj.t12.keg_of_salted_herring'].holder, { entity:'pc' });
    assert.deepEqual(s.objects['obj.t14.paper_twist_of_dried_dill'].holder, { entity:'npc.marta' });
});

test('B8/9 evidenced new boards remain possible; craft without a booked material does not discard inventory', () => {
    let s = corpus.b8.start;
    for (const turn of corpus.b8.turns) s = play(s, turn).state;
    assert.deepEqual(s.objects['obj.t20.a_couple_of_boards_from_martas_woodpile'].holder, { entity:'pc' });
});

test('named TAKE moves the actual ground ID on receipt; a boolean alone cannot identify one of two objects', () => {
    const s = structuredClone(corpus.c19.start);
    s.objects[satchel].holder = { loc:s.scene.at };
    const target = s.objects[satchel].name;
    const turn = {i:41, input:'I take the satchel.', commands:[{seq:1,type:'take',object:{new:target},qty:1,quote:'I take the satchel'}],
        prose:'Alaric picks up the satchel.',report:{scene:'here',expected:{1:{taken:true}},deltas:[]}};
    const used = play(s,turn,{report:{...turn.report,deltas:[
        {seq:1,type:'object.move',object:satchel,to:'pc',qty:1},
    ]}}).state;
    assert.deepEqual(used.objects[satchel].holder,{ entity:'pc' });
    assert.equal(Object.keys(used.objects).length,Object.keys(s.objects).length);
    s.objects['obj.second']={...s.objects[satchel],id:'obj.second'};
    const ambiguous=play(s,turn).state;
    assert.deepEqual(ambiguous.objects,s.objects);
});

test('a catalog TAKE cannot strip an owner: only an actual NPC handover moves the original object', () => {
    const start = structuredClone(corpus.c19.start);
    const empty = {scene:'here',expected:{},deltas:[]};
    const move = {seq:1,type:'object.move',object:satchel,to:'pc',qty:1};
    const turn = {i:41,input:'I take the bag if she hands it to me.',commands:[{seq:1,type:'take',object:satchel,qty:1,quote:'I take the bag'}],
        prose:'The healer offers to lend it when the other attendant returns.',report:empty};
    assert.deepEqual(play(start,turn).state.objects[satchel].holder,{entity:keeper});
    turn.prose='The healer takes her satchel from the peg and hands the strap to Alaric. He takes it.';
    turn.report={...empty,deltas:[move]};
    const handed=play(start,turn);
    assert.deepEqual(handed.state.objects[satchel].holder,{entity:'pc'});
    assert.equal(handed.x.events.filter(e=>e.t==='object.moved').length,1);

    const absent=structuredClone(start);
    absent.scene.present=absent.scene.present.filter(id=>id!==keeper);
    assert.deepEqual(play(absent,turn).state.objects[satchel].holder,{entity:keeper});
    start.offers['offer.case']={id:'offer.case',status:'open',seller:keeper,at:start.scene.at,
        lines:[{kind:'goods',what:start.objects[satchel].name,object:satchel,qty:1,price_cp:50}]};
    assert.deepEqual(play(start,turn).state.objects[satchel].holder,{entity:keeper});
});

test('a failed direct-to-PC CREATE naming local property cannot reappear as a boolean TAKE fallback', () => {
    const s=corpus.c19.start, turn=structuredClone(corpus.c19.turns[0]);
    turn.commands=turn.commands.slice(0,1);
    turn.commands[0].object={new:s.objects[satchel].name};
    turn.report={scene:'here',expected:{1:{taken:true}},deltas:[
        {seq:1,type:'object.new',name:s.objects[satchel].name,kind:'item',qty:1,holder:'pc'},
    ]};
    const {state,x}=play(s,turn);
    assert.deepEqual(state.objects,s.objects);
    assert.deepEqual(x.rejected.map(r=>r.rule),['object_identity']);
});

test('an unrelated local holder cannot suppress a genuinely new apple', () => {
    const start=corpus.c19.start;
    const turn={i:41,input:'I pick up the apple.',commands:[{seq:1,type:'take',object:{new:'the apple'},quote:'I pick up the apple'}],
        prose:'Alaric picks up the fallen apple from the ground.',report:{scene:'here',expected:{1:{taken:true}},deltas:[]}};
    assert.ok(Object.values(play(start,turn).state.objects).some(o=>o.name==='the apple' && o.holder.entity==='pc'));
});

test('accepted delivery with real GIVE and a matching receipt books the known keg only at the recipient', () => {
    const {start,turns}=corpus.b5;
    const turn=structuredClone(turns[0]);
    const id='obj.t12.keg_of_salted_herring';
    turn.commands.push({seq:3,type:'give',object:id,qty:1,to:{new:'Bren'},needs:2,quote:"take it to Bren's stall on the west side of the market"});
    const noReceipt=play(start,turn);
    assert.deepEqual(noReceipt.state.objects[id].holder,{entity:'pc'});
    turn.report.deltas.push({seq:turn.report.deltas.length+1,type:'object.move',object:id,qty:1,to:'npc.bren'});
    const receipt=play(start,turn);
    assert.deepEqual(receipt.state.objects[id].holder,{entity:'npc.bren'});
    assert.equal(receipt.x.events.filter(e=>e.t==='object.moved'&&e.d.id===id).length,1);
    assert.deepEqual(receipt.state.entities.pc.sheet.coin_cp,noReceipt.state.entities.pc.sheet.coin_cp);
});

test('an arrival-pending TAKE cannot collect an origin object or an unconfirmed find at the destination', () => {
    const start = structuredClone(corpus.c19.start);
    const turn = structuredClone(corpus.c19.turns[0]);
    start.objects[satchel].name = 'travel blanket';
    start.objects[satchel].holder = { loc: start.scene.at };
    turn.input = 'I set out for the Halloran steading and pick up a dry cover if one lies there.';
    turn.commands = [
        {seq:1,type:'go',to:'loc.halloran_steading',quote:'I set out for the Halloran steading'},
        {seq:2,type:'take',object:{new:'a dry cover'},qty:1,quote:'pick up a dry cover'},
    ];
    turn.report.expected = {1:turn.report.expected[2],2:{taken:true}};
    turn.report.deltas.push({seq:4,type:'object.new',scene:turn.report.scene,name:'travel blanket',kind:'item',qty:1,holder:'pc'});
    turn.prose += '\nAlaric picks up the dry travel blanket at the flooded hollow.';
    const result = play(start, turn);
    const s = result.state;
    assert.notEqual(s.scene.at,start.scene.at);
    assert.deepEqual(s.objects[satchel].holder,{loc:start.scene.at});
    assert.equal(result.p.outcome.resolutions[1].reason, 'arrival pending');
    assert.equal(Object.values(s.objects).filter(o=>o.name==='travel blanket' && o.holder.entity==='pc').length,0);
});

test('separately sourced hammers are not prebound to a namesake on a person or the local floor', () => {
    for (const oldHolder of [{entity:keeper},{entity:'pc'},{loc:corpus.c19.start.scene.at}]) {
        for (const sourceFirst of [true,false]) {
            const start = structuredClone(corpus.c19.start);
            const existing = start.objects[satchel];
            existing.name = 'hammer';
            existing.holder = oldHolder;
            const create = {seq:1,type:'object.new',name:'hammer',kind:'item',qty:1,in:'open chest',holder:sourceFirst?'here':'pc'};
            const deltas = [create];
            if (sourceFirst) deltas.push({seq:2,type:'object.move',object:{new:'hammer'},to:'pc',qty:1});
            const turn = {i:41,input:'I take the hammer from the open chest.',prose:'Alaric takes the second hammer from the chest.',
                commands:[{seq:1,type:'take',object:{new:'hammer'},quote:'I take the hammer'}],
                report:{scene:'here',expected:{1:{taken:true}},deltas}};
            const result = play(start,turn);
            assert.deepEqual(result.state.objects[satchel],existing);
            const copy = Object.values(result.state.objects).filter(o=>o.id!==satchel && o.name==='hammer');
            assert.equal(copy.length,1);
            assert.deepEqual(copy[0].holder,{entity:'pc'});
            assert.deepEqual(result.x.rejected,[]);
        }
    }
});

test('a rejected hammer duplication does not consume an independent apple TAKE, in either order', () => {
    const start = structuredClone(corpus.c19.start);
    start.objects[satchel].name='hammer';
    for (const names of [['apple'],['hammer','apple'],['apple','hammer']]) {
        const commands=names.map((name,i)=>({seq:i+1,type:'take',object:{new:name},quote:'I pick up the '+name}));
        const expected=Object.fromEntries(commands.map(c=>[c.seq,{taken:true}]));
        const turn={i:41,input:'I pick up the apple. I also ask about the hammer.',
            prose:'Alaric collects the apple. Wren still holds the hammer.',commands,
            report:{scene:'here',expected,deltas:[{seq:1,type:'object.new',name:'hammer',kind:'item',holder:'pc',qty:1}]}};
        const {state}=play(start,turn);
        assert.equal(Object.values(state.objects).filter(o=>o.name==='hammer').length,1);
        assert.deepEqual(state.objects[satchel].holder,{entity:keeper});
        assert.equal(Object.values(state.objects).filter(o=>o.name==='apple' && o.holder.entity==='pc').length,1);
    }
});

test('the same ground container does not establish another namesake tool', () => {
    const start=structuredClone(corpus.c19.start);
    start.objects[satchel].name='hammer';
    start.objects[satchel].holder={loc:start.scene.at};
    start.objects[satchel].in_name='open chest';
    const turn={i:41,input:'I take a hammer.',commands:[{seq:1,type:'take',object:{new:'hammer'},quote:'I take a hammer'}],
        prose:'Alaric checks the chest.',report:{scene:'here',expected:{1:{taken:true}},deltas:[
            {seq:1,type:'object.new',name:'hammer',kind:'item',holder:'pc',in:'open chest',qty:1}]}};
    assert.deepEqual(play(start,turn).state.objects,start.objects);
});
