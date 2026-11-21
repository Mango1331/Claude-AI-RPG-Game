import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../helpers.js';
import { campaign } from './patch8_lib.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';
import { applyEvent } from '../../src/state.js';

const content = await loadContent();
const base = (await campaign(content)).state();
const site = 'loc.forest_camp';
const view = 'I look around the camp for useful things.';
const bowl = {seq:1,type:'object.new',name:'clay bowl',kind:'resource',qty:2,unit:'bowls',holder:'here'};
const prose = 'Two unclaimed clay bowls lie by the fire.';
function location(name='Forest camp') {
    const s=structuredClone(base);
    s.meta.ruleset=2;
    s.places[site]={id:site,name,parent:s.scene.location,realm:s.scene.location,kind:'wilderness',tags:[]};
    s.scene={...s.scene,at:site,place:name,present:['pc']};
    return s;
}
const search = (quote=view, what=quote) => ({seq:1,type:'activity',kind:'search',what,quote});
const player = (s,text=view,commands=[search(text)]) => playerTurnV4(s,content,text,{c:true,commands});
const reply = (s,deltas=[],words=prose) => replyTurnV4(s,content,{scene:'here',expected:{},deltas},{prose:words});
const local = s => Object.values(s.objects).filter(o=>o.holder?.loc===site);
const money = s => s.entities.pc.sheet.coin_cp;
const take = (s, object,qty=null) => player(s,'I take the clay bowl.',[{seq:1,type:'take',object,qty,quote:'I take the clay bowl.'}]);

test('Camp inspection observes ordinary ground stock without PER, take, travel or automatic currency', () => {
    const s=location(), r=player(s);
    assert.deepEqual(r.outcome.search_checks,[]);
    assert.equal(r.outcome.auth.gather,false); assert.equal(r.outcome.auth.roam,false);
    const a=reply(r.state,[bowl,{...bowl,seq:2},{...bowl,seq:3,holder:'pc'}]);
    assert.equal(local(a.state).length,1); assert.equal(local(a.state)[0].qty,2);
    assert.deepEqual(a.state.places[site].camp_stock,[local(a.state)[0].id]);
    assert.equal(money(a.state),money(s)); assert.equal(a.rejected.length,2);
    assert.deepEqual(reply(r.state,[bowl]).state,reply(r.state,[bowl]).state);
    assert.equal(reply(r.state,[]).state.places[site].camp_stock,undefined);
    assert.equal(reply(r.state,[{...bowl,holder:'pc'}]).state.places[site].camp_stock,undefined);
});

test('Only the selected stack moves. Repeat, division, consumption, disposal and a return never replenish the recorded stock', () => {
    const s=reply(player(location()).state,[bowl]).state, id=local(s)[0].id;
    const part=take(s,id,1).state;
    assert.equal(part.objects[id].qty,1);
    const held=Object.values(part.objects).find(o=>o.name==='clay bowl' && o.holder.entity==='pc');
    assert.equal(held.qty,1);
    applyEvent(part,{t:'object.consumed',d:{id:held.id,by:'pc'}});
    const all=take(part,id).state;
    assert.equal(all.objects[id].holder.entity,'pc');
    applyEvent(all,{t:'object.moved',d:{id,to:{loc:base.scene.at}}});
    const back=player(JSON.parse(JSON.stringify(all)));
    const repeat=reply(back.state,[{...bowl,name:'earthenware pot'}],'An abandoned earthenware pot lies by the ashes.');
    assert.deepEqual(local(repeat.state),[]); assert.equal(repeat.rejected[0].rule,'camp_stock');
    for (const name of ['clay bowl','earthenware pot']) {
        const next=take(repeat.state,{new:name});
        assert.equal(next.outcome.resolutions[0].status,'refused');
        assert.equal(next.outcome.auth.take.length,0);
    }
});

test('Ownership, locked containers, living guards and remote observation never make an accessible new item', () => {
    for (const invalid of ['An unclaimed silver clay bowl lies there.','The trader owns the clay bowl.','An unclaimed clay bowl is broken.','There is no unclaimed clay bowl.']) {
        assert.equal(local(reply(player(location()).state,[bowl],invalid).state).length,0);
    }
    const forest=location('rise above the forest camp');
    forest.facts.camp={s:site,p:'camp',o:'the camp below the rise sits empty'};
    for(const mode of ['far','door','living','no evidence','look only']){
        const state=structuredClone(forest);
        if(mode==='door')state.features.door={id:'door',at:site,kind:'obstacle',status:'active'};
        if(mode==='living'){state.entities.guard={id:'guard',kind:'creature',status:'alive'};state.scene.present.push('guard');}
        if(mode==='no evidence')delete state.facts.camp;
        if(mode==='far')state.facts.camp.o='an empty camp miles away';
        const r=player(state,mode==='look only'?'I look at the camp from here.':view);
        assert.equal(r.outcome.auth.gos.length,0,mode);
        assert.equal(local(reply(r.state,[bowl]).state).length,0,mode);
    }
    const owned=location(); owned.entities.keeper={id:'keeper',name:'Mara',kind:'npc',status:'alive'};owned.scene.present.push('keeper');
    const o=reply(player(owned).state,[{...bowl,holder:'keeper'}]).state;
    const id=Object.values(o.objects).find(v=>v.name==='clay bowl').id;
    assert.equal(take(o,id).outcome.resolutions[0].status,'refused');
    assert.equal(o.objects[id].holder.entity,'keeper');
    const shut=location(); shut.features.chest={id:'chest',name:'locked chest',at:site,kind:'obstacle',status:'active'};
    shut.objects.bowl={id:'bowl',name:'clay bowl',holder:{loc:site},in:'chest',qty:1,kind:'item'};
    assert.equal(take(shut,'bowl').outcome.resolutions[0].status,'refused');
    assert.equal(reply(player(shut).state).state.places[site].camp_stock,undefined);
});

test('Hidden and mixed searches still roll. Success and failure leave the visible stock available and confer no take', () => {
    const start=reply(player(location()).state,[bowl]).state, found=new Set();
    assert.equal(player(start,'I search the camp for a hidden stash.',[]).outcome.search_checks.length,1);
    for(let n=0;n<100 && found.size<2;n++){
        const s=structuredClone(start);s.rng.n+=n;
        const text='I inspect the camp and search under the peat for a hidden cache.';
        const r=player(s,text);
        assert.equal(r.outcome.search_checks.length,1);
        found.add(r.outcome.search_checks[0].success);
        assert.equal(r.outcome.auth.gather,false);
        assert.equal(r.outcome.auth.roam,false);
        assert.deepEqual(local(r.state),local(s));
    }
    assert.equal(found.size,2);
    const text='I look around the camp and gather berries.';
    const r=player(start,text,[search(view),{seq:2,type:'activity',kind:'gather',what:'berries',quote:'gather berries'}]);
    const combined=reply(r.state,[{...bowl,holder:'pc'},{...bowl,seq:2,name:'berries',holder:'pc'}]);
    assert.ok(combined.rejected.some(e=>e.type==='object.new'));
    assert.ok(Object.values(combined.state.objects).some(o=>o.name==='berries' && o.holder.entity==='pc'));
    assert.ok(local(combined.state).some(o=>o.name==='clay bowl'));
});

test('No approach for a hypothetical or a failed plan. No look from an unrelated site, camp discovery and corpse search retain their rules', () => {
    const s=location('rise above the forest camp');
    s.facts.camp={s:site,p:'camp',o:'the camp below the rise sits empty'};
    const blocked=playerTurnV4(s,content,view,{c:true,commands:[],interp:{failed:true}});
    assert.equal(blocked.outcome.camp,undefined); assert.equal(blocked.outcome.auth.gos.length,0);
    assert.equal(player(s,'If I inspect the camp, can I see the equipment?',[]).outcome.auth.gos.length,0);
    assert.equal(player(location('Pine forest'),'I search for another camp.').outcome.search_checks.length,1);
    s.entities.body={id:'body',name:'goblin',kind:'creature',status:'dead',looted:true};s.scene.present.push('body');
    assert.equal(player(s,'I search the bodies for loot.').outcome.resolutions[0].reason,'looted already');
    const mixed=player(s,'I inspect the bodies and the camp for loot.',[search('I inspect the bodies and the camp for loot.','bodies and the camp')]);
    assert.equal(mixed.outcome.search_checks.length,0);assert.ok(mixed.outcome.extra.some(x=>x.includes('REMAINS ALREADY LOOTED')));
});

test('An unseen or unrelated destination never makes stock at the lookout. Search for a lost person remains uncertain', () => {
    const s=location('rise above the forest camp');
    s.facts.camp={s:site,p:'camp',o:'the camp below the rise sits empty'};
    const input=player(s).state;
    assert.equal(reply(input,[bowl]).state.places[site].camp_stock,undefined);
    const other={new:{name:'unrelated quarry',kind:'site',parent:site}};
    const r=replyTurnV4(input,content,{scene:other,expected:{1:{arrived:true,at:other}},deltas:[
        {seq:1,type:'arrive',at:other},{...bowl,seq:2}]},{prose:'He walks into a different quarry. '+prose});
    assert.equal(r.state.scene.at,site);assert.equal(local(r.state).length,0);
    assert.ok(!Object.values(r.state.places).some(p=>p.name==='unrelated quarry'));
    assert.equal(player(location(),'I search the camp for a missing child.').outcome.search_checks.length,1);
    const legacy=location(); legacy.meta.ruleset=1;
    assert.equal(player(legacy,view,[]).outcome.search_checks.length,0);
});

test('Open equipment never mints excess amounts, gear, or a second payout. A real gift by a present owner still transfers', () => {
    const s=location();
    for(const [d, words] of [
        [{...bowl,qty:300},prose],
        [{...bowl,name:'sword with rope grip',qty:1},'An unclaimed sword with rope grip lies here.'],
        [{...bowl,name:'gold coins',qty:1},'An unclaimed pile of gold coins lies here.'],
    ]) {
        const r=reply(player(s).state,[d],words);
        assert.equal(local(r.state).length,0); assert.equal(money(r.state),money(s));
    }
    const owner='npc.regression_keeper';
    s.entities[owner]={id:owner,name:'Mara',kind:'npc',status:'alive',at:site}; s.scene.present.push(owner);
    s.objects.keepsake={id:'keepsake',name:'clay bowl',holder:{entity:owner},qty:1,kind:'item'};
    const hand=reply(player(s).state,[{seq:1,type:'object.move',object:'keepsake',to:'pc'}],
        'Mara hands Alaric her clay bowl as a gift.');
    assert.equal(hand.state.objects.keepsake.holder.entity,'pc');
    assert.equal(money(hand.state),money(s));
});

test('A remote TAKE cannot create stock; an empty local look works before any IDs exist, and rabbit meat is usable after collection', () => {
    const hill=location('rise above the forest camp');
    const remote=take(hill,{new:'clay bowl'});
    assert.equal(remote.outcome.auth.take.length,0); assert.equal(remote.outcome.resolutions[0].status,'refused');
    const here=player(location(),'I look around.',[]).state;
    const meat={...bowl,name:'roast rabbit meat',qty:1,unit:'portion'};
    const dinner=reply(here,[meat],'A portion of unclaimed roast rabbit meat lies beside the ashes.').state;
    const id=local(dinner)[0].id; assert.equal(dinner.objects[id].use,'food');
    const picked=take(dinner,id).state;
    const use=player(picked,'I eat the roast rabbit meat.',[{seq:1,type:'use',object:id,quote:'I eat the roast rabbit meat.'}]);
    assert.equal(use.state.objects[id].holder.consumed,'pc');
    assert.equal(local(reply(player(use.state).state,[meat],'Unclaimed roast rabbit meat lies by the ashes.').state).length,0);
});

test('Local place facts can establish a camp; an explicitly ordinary tool may have a new name. A distant report cannot do this', () => {
    const clearing=location('Green clearing');
    clearing.facts.here={s:site,p:'camp',o:'This clearing holds an abandoned camp.'};
    const d={...bowl,qty:1,name:'beechwood shuttle'};
    const r=reply(player(clearing).state,[d],'An unclaimed plain beechwood shuttle lies on the ground.');
    const o=local(r.state)[0];
    assert.ok(o && r.state.places[site].camp_stock.includes(o.id));
    assert.equal(take(r.state,{new:'beechwood shuttle'}).state.objects[o.id].holder.entity,'pc');
    clearing.facts.here.o='A camp lies miles away across the river.';
    assert.equal(player(clearing).outcome.camp,undefined);
});

test('A separate TAKE in the inspection cannot mint an unknown item from expected alone or transfer property from a distance', () => {
    const s=location(), text='I inspect the camp and pick up the clay bowl.';
    const x=player(s,text,[search(view),{seq:2,type:'take',object:{new:'clay bowl'},quote:'pick up the clay bowl'}]);
    const claimed={scene:'here',expected:{2:{taken:true}},deltas:[{...bowl,holder:'pc'}]};
    const denied=replyTurnV4(x.state,content,claimed,{prose:'The trader keeps her clay bowl.'});
    assert.equal(Object.values(denied.state.objects).filter(o=>o.name==='clay bowl').length,0);
    const legal=replyTurnV4(x.state,content,{...claimed,deltas:[bowl,{seq:2,type:'object.move',object:{new:'clay bowl'},to:'pc'}]},{prose});
    const held=Object.values(legal.state.objects).filter(o=>o.name==='clay bowl');
    assert.equal(held.length,1); assert.equal(held[0].holder.entity,'pc');
    assert.deepEqual(legal.state.places[site].camp_stock,[held[0].id]);
});
