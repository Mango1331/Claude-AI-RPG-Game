import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProductContent,Game} from '../helpers.js';
import {itemProfile,gearBases,gearOfferProfile,gearRetailPrice,itemTraits} from '../../src/v4/items.js';
import {deriveCharacter} from '../../src/derived.js';
import {applyEvent} from '../../src/state.js';
import {applyWorld} from '../../src/v4/world.js';
import {playerTurnV4} from '../../src/v4/turn.js';
import {lootEvents} from '../../src/v4/loot.js';
const c=await loadProductContent(),qualities=['crude','common','fine','superior','exceptional'];
const expected=[8,14,20,25,31];
const profile=(name,rank,q,balance=true)=>itemProfile(c,{name:`${q} ${rank}-Rank ${name}`,balance});
const weapons=gearBases(c).filter(b=>profile(b.name,'F','common').slot==='weapon');

test('196: all supported martial/bow/focus articles use the approved E values and existing price formula',()=>{
    const families=new Set();
    for(const b of weapons)for(const [i,q] of qualities.entries())for(const balance of [false,true]){
        const p=profile(b.name,'E',q,balance);families.add(p.family);
        assert.equal(Math.max(p.atk,p.matk),expected[i],`${b.name} ${q}`);
        assert.equal(p.rank,'E');assert.equal(p.quality,q);assert.equal(p.value_cp,gearRetailPrice(c,p));
        assert.equal(gearRetailPrice(c,p),[120,200,350,650,1200][i],'E guide by quality');
        assert.equal(p.def+p.mdef,0);
        assert.ok(expected[i]>[6,10,14,18,22][i]);
    }
    for(const family of ['melee','precision','bow','focus'])assert.ok(families.has(family));
});
test('196: F and D–S weapons/foci and all starter templates retain their actual values',()=>{
    const unchanged={F:[6,10,14,18,22],D:[10,15,21,25,29],C:[13,20,27,33,37],B:[16,24,33,40,46],A:[19,29,39,48,55],S:[22,34,45,55,63]};
    for(const b of weapons)for(const [rank,values] of Object.entries(unchanged))for(const [i,q] of qualities.entries())assert.equal(Math.max(profile(b.name,rank,q).atk,profile(b.name,rank,q).matk),values[i]);
    assert.equal(c.items.get('starter_longsword_r2').atk,10);assert.equal(c.items.get('starter_arcane_staff_r2').matk,10);assert.equal(c.items.get('starter_dagger_r2').atk,10);
    assert.equal(c.items.get('starter_longsword').atk,6);
});
test('196: F shop generation is unchanged; E offers store the shared profile rather than inventing stats or prices',()=>{
    for(const b of weapons)for(const [i,q] of qualities.entries())assert.equal(Math.max(gearOfferProfile(c,{base:b.id,quality:q}).atk,gearOfferProfile(c,{base:b.id,quality:q}).matk),[6,10,14,18,22][i]);
    for(const name of ['sword','staff'])for(const q of ['fine','superior','exceptional']){
        const s=new Game(c,{ruleset:2}).state;s.scene.at='loc.shop';s.places['loc.shop']={id:'loc.shop',name:'Shop',kind:'interior'};
        s.entities.seller={id:'seller',kind:'npc',name:'Alda',at:s.scene.at,status:'alive'};s.scene.present=['seller'];s.last.outcome={c:true};
        const what=`${q} E-Rank ${name}`,said='five hundred copper';
        const r=applyWorld(s,c,{scene:s.scene.at,expected:{},deltas:[{seq:1,type:'offer',seller:'seller',lines:[{what,kind:'goods',equipment:true,qty:1,price_cp:500,said,phase:'firm',pricing:{basis:'total',quote:said,currency_quote:null}}]}]},{msg:20,prose:`Alda offers the ${what} for ${said}.`});
        const line=r.events.find(e=>e.t==='offer.created'&&!e.d.offer.stock)?.d.offer.lines[0];assert.ok(line,JSON.stringify(r.rejected));
        assert.deepEqual(line.profile,profile(name,'E',q));assert.equal(line.price_cp,500,'guide does not overwrite negotiated E offer');
    }
});
test('196: actual item event equips on E, contributes to derived power and refuses on F without consumption',()=>{
    for(const name of ['sword','dagger','bow','staff'])for(const level of [14,15]){
        const s=new Game(c,{ruleset:2}).state;s.entities.pc.sheet.level=level;
        const p=profile(name,'E','exceptional'),o={id:'reward',name:`exceptional E-Rank ${name}`,kind:'item',qty:1,holder:{entity:'pc'},...itemTraits(c,{name:`exceptional E-Rank ${name}`},s.clock.minute,p)};
        applyEvent(s,{t:'object.created',d:{object:o}});
        const r=playerTurnV4(s,c,'I equip the reward',{c:true,commands:[{seq:1,type:'equip',object:o.id,quote:'I equip the reward'}],msg:21});
        if(level===14){assert.ok(!r.events.some(e=>e.t==='item.equipped'));assert.deepEqual(r.state.objects[o.id],s.objects[o.id]);}
        else{assert.ok(r.events.some(e=>e.t==='item.equipped'));const dv=deriveCharacter(r.state.entities.pc.sheet,c);assert.equal(name==='staff'?dv.matk:dv.atk,31);assert.equal(r.state.entities.pc.sheet.equipment.weapon.family,p.family);}
    }
});
test('196: E bossloot uses exactly the same weapon/focus profile and leaves deterministic booking intact',()=>{
    for(const base of ['sword','dagger','shortbow','staff'])for(const q of ['fine','superior','exceptional']){
        const cc=structuredClone(c),cfg=cc.monsters.loot.special;cfg.class_chance=1;cfg.class_pool.warrior=[base];Object.assign(cfg.tiers.boss.first,{stone:0,types:{gear:100},quality:{[q]:100}});
        const s=new Game(cc,{ruleset:2}).state;s.entities.pc.sheet.class='warrior';
        s.entities.foe={id:'foe',kind:'creature',name:'Warden',status:'dead',profile:{anchor:'goblin',rank:'E',level:20,type:'boss'},slot:{dungeon:'d',floor:1,cycle:1,id:'boss',role:'boss'}};
        const enc={id:'enc.test',combatants:{pc:{id:'pc',side:'pc',current:{hp:20}},foe:{id:'foe',side:'hostile',current:{hp:0}}}};
        const r=lootEvents(s,cc,enc),o=r.events.find(e=>e.t==='object.created'&&e.d.object.profile?.kind==='gear').d.object;
        assert.deepEqual(o.profile,profile(base,'E',q));assert.deepEqual(r,lootEvents(s,cc,enc));
        r.events.forEach(e=>applyEvent(s,e));assert.deepEqual(lootEvents(s,cc,enc).events,[]);
    }
});
