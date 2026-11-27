// Original excerpts and planner outputs from the named 27 November archives on main.
// Presence is tested with a known, initially absent NPC and the original narrator text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {loadProductContent} from '../helpers.js';
import {emptyState, applyEvent} from '../../src/state.js';
import {startCampaign} from '../../src/engine.js';
import {applyWorld} from '../../src/v4/world.js';
import {playerTurnV4} from '../../src/v4/turn.js';
import {parseExtraction} from '../../src/v4/extract.js';
import {findQuote,priceEvidence} from '../../src/v4/finance_evidence.js';

const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./claim_state252.json.gz',import.meta.url))));
const content=await loadProductContent();
function campaign(){
    const s=emptyState();
    for(const e of startCampaign(content,{runtime:'v4',ruleset:2,planner:true,seed:7}))applyEvent(s,e);
    s.mode='story';
    s.last.outcome={kind:'v4',c:true,auth:{c:true,gos:[]},expected_keys:{}};
    return s;
}
function encounter(s,row,type='enter'){
    const d={seq:1,type,who:row.who,...(type==='enter'?{evidence:row.quote}:type==='position'?{band:'SHORT'}:{level:'aware'})};
    return applyWorld(s,content,{scene:'here',expected:{},deltas:[d]},{prose:row.prose});
}
for(const row of fixture.presence){
    test('archived presence claim '+[row.arm,row.i,row.who,row.label].join(' '),()=>{
        const s=campaign();
        s.entities[row.who]={...row.entity,at:'loc.elsewhere'};
        for(const type of ['enter','position','aware']){
            const r=encounter(s,row,type);
            assert.ok(r.state.scene.present.includes(row.who),type+' '+JSON.stringify(r.rejected));
            assert.equal(r.state.entities[row.who].at,r.state.scene.at);
        }
    });
}
for(const variant of ['dead','waiting','elsewhere in combat','unknown']){
    test('presence excludes '+variant,()=>{
        const s=campaign(),row=fixture.presence[0],id=row.who;
        if(variant!=='unknown')s.entities[id]={...row.entity,at:'loc.elsewhere',status:variant==='dead'?'dead':'alive'};
        if(variant==='waiting')s.party={members:{[id]:{who:id,mode:'wait',at:'loc.elsewhere'}},agreements:{},claims:{}};
        if(variant==='elsewhere in combat')s.encounter={at:'loc.elsewhere',combatants:{[id]:{id,current:{}}},order:[id]};
        for(const type of ['enter','position','aware'])assert.ok(!encounter(s,row,type).state.scene.present.includes(id),type);
    });
}
for(const row of fixture.routes){
    test('Lantern M'+row.i+' books the known inn',()=>{
        const s=Object.assign(campaign(),{places:row.places,scene:row.scene});
        const r=playerTurnV4(s,content,row.input,{commands:row.commands,c:true});
        assert.equal(r.outcome?.auth.gos[0]?.to,'loc.alderwatch.the_slaked_lime');
    });
}
test('Martin M11 currency ellipse and ambiguity',()=>{
    const {prose,line}=fixture.price;
    const run=(text,currency_quote)=>priceEvidence({...line.pricing,currency_quote},{
        source:text,content,within:findQuote(text,line.said),reported:120,ownCurrency:true});
    assert.equal(run(prose,'eight silver').cp,120);
    assert.equal(run('One copper or eight silver. '+prose,'One copper or eight silver').cp,null);
});
test('valid independent information survives an invalid fact',()=>{
    const p=parseExtraction(JSON.stringify({scene:'here',expected:{},deltas:[
        {seq:1,type:'fact',s:'pc',o:'incomplete'},
        {seq:2,type:'memory',text:'The held lantern is blue.',imp:6,who:['pc']},
    ]}),content.deltaVocab,{},{});
    assert.ok(p.valid);
    assert.deepEqual(p.value.deltas.map(d=>d.seq),[2]);
});
for(const [input,target] of [
    ['Back down to The Slaked Lime.','The Slaked Lime'],
    ['Ossen and I head back to the market square.','market square'],
    ['I make my way back to the market square.','market square'],
    ['I walk over to the market square.','market square'],
]){
    for(const key of ['scene','new']){
        test('planner destination '+key+' in '+input,()=>{
            const s=campaign(), row=fixture.routes[0];
            Object.assign(s,{places:row.places,scene:row.scene});
            const r=playerTurnV4(s,content,input,{commands:[{seq:1,type:'go',to:{[key]:target},quote:input}],c:true});
            const id=Object.values(s.places).find(p=>p.name.toLowerCase().includes(target.toLowerCase()) && row.scene.history.includes(p.id) && p.id!==s.scene.at)?.id;
            assert.ok(id);
            assert.equal(r.outcome?.auth.gos[0]?.to,id);
        });
    }
}

test('rejected declarations retain their dependencies and audit at commit',()=>{
    const s=campaign(), ids={places:Object.keys(s.places)};
    s.objects.old={id:'old',name:'Bronze cup',qty:1,holder:{loc:s.scene.at}};
    const p=parseExtraction(JSON.stringify({expected:{},deltas:[
        {seq:1,type:'object.new',name:'Bronze cup',kind:'unsupported',holder:'here'},
        {seq:2,type:'object.move',object:{new:'Bronze cup'},to:'pc'},
        {seq:3,type:'fact',s:'pc',p:'observation',o:'A faded red sign hangs here.'},
    ]}),content.deltaVocab,ids,{});
    assert.equal(p.valid,true);
    const r=applyWorld(s,content,p.value,{invalid:p.rejected});
    assert.equal(r.rejected.find(x=>x.seq===1)?.rule,'schema');
    assert.ok(r.rejected.find(x=>x.seq===2));
    assert.ok(r.events.some(e=>e.t==='fact.asserted'));
    assert.deepEqual(r.state.objects.old.holder,{loc:s.scene.at});
});

test('a malformed purchase receipt leaves that action open and preserves independent facts',()=>{
    const p=parseExtraction(JSON.stringify({expected:{1:{priced:'yes',taken_anyway:false}},deltas:[
        {seq:1,type:'fact',s:'pc',p:'observation',o:'The shop has a red door.'}
    ]}),content.deltaVocab,{}, {1:'buy'});
    assert.equal(p.valid,true);
    assert.equal(p.complete,false);
    assert.deepEqual(p.missing,['1']);
    assert.equal(p.value.deltas.length,1);
    assert.deepEqual(p.value.expected,{});
});
