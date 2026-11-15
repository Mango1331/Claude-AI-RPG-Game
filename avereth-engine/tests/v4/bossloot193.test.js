import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent, Game } from '../helpers.js';
import { lootEvents } from '../../src/v4/loot.js';
import { applyEvent } from '../../src/state.js';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { itemProfile, gearBases, profileOf, useOf, restoreOf, rankRefusal } from '../../src/v4/items.js';
import { finalizeGrowth, activationsOf, stoneActivation } from '../../src/v4/growth.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { playerTurn } from '../../src/engine.js';
import { foldChat, rec } from '../../src/host.js';
import { turnPanel } from '../../src/display.js';
import { buildContext } from '../../src/context.js';
import { firewall } from '../../src/v4/firewall.js';
import { loadRun } from '../../tools/replay/replay.mjs';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';

const content = await loadProductContent();
function battle(role = 'guard', seed = 7) {
    const s = new Game(content, {seed, ruleset: 2}).state;
    s.entities.pc.sheet.class = 'warrior';
    s.entities.pc.sheet.equipment = {};
    s.entities.pc.sheet.base_class = 'Warrior';
    s.entities.foe = { id: 'foe', kind: 'creature', name: 'Gallery Warden', species: 'armoured skeleton', status: 'dead',
        profile: { anchor: 'skeleton', rank: 'F', level: 7, type: 'elite' },
        ...(role ? {slot: { dungeon: 'dungeon.test', floor: 1, cycle: 1, id: role, role }} : {}) };
    const enc = {id: 'enc.t22', combatants: {pc: {id: 'pc', side: 'pc', current: {hp: 20}}, foe: {id: 'foe', side: 'hostile', current: {hp: 0}}}};
    return {s, enc};
}
test('193: first guardian gives one automatic special main reward; normal loot is retained', () => {
    const {s, enc} = battle();
    const r = lootEvents(s, content, enc);
    assert.equal(r.rewards.length, 1);
    assert.equal(r.rewards[0].first, true);
    assert.ok(r.lines.some(l => /Bone/.test(l)));
    assert.ok(r.rewardLines.some(l => l.startsWith('SPECIAL REWARD')));
    for (const e of r.events) applyEvent(s, e);
    assert.deepEqual(lootEvents(s, content, enc).events, []);
});

const specials = r => r.events.filter(e => e.t === 'object.created' && e.d.object.source.how === 'special_reward').map(e => e.d.object);
const cfgContent = () => ({...content, monsters: structuredClone(content.monsters)});
const force = (type, tier = 'guardian') => {
    const c = cfgContent();
    for (const r of Object.values(c.monsters.loot.special.tiers[tier])) Object.assign(r, {chance: 1, stone: type === 'stone' ? 1 : 0, types: {[type]: 1}});
    return c;
};
test('193: all configured gear pools map to real usable bases on every rank; F profiles use balance:true', () => {
    const cfg = content.monsters.loot.special;
    for (const id of new Set([...Object.values(cfg.class_pool).flat(), ...Object.values(cfg.theme_pool).flat()])) {
        const base = gearBases(content).find(b => b.id === id); assert.ok(base, id);
        for (const rank of ['F','E','D','C','B','A','S']) for (const quality of ['fine','superior','exceptional']) {
            const p = itemProfile(content, {name: `${quality} ${rank}-Rank ${base.name}`, balance: true});
            assert.equal(p.kind, 'gear', id); assert.equal(p.rank, rank); assert.equal(p.quality, quality);
            if (rank === 'F' && p.slot === 'weapon') assert.equal(Math.max(p.atk,p.matk), {fine:14,superior:18,exceptional:22}[quality]);
        }
    }
});
test('193: normal/high-level/major/minion/NPC categories leave all ordinary loot byte-identical', () => {
    for (const variant of ['normal','major','minion','npc']) {
        const {s,enc} = battle(null);
        if (variant === 'npc') Object.assign(s.entities.foe,{kind:'npc'});
        else if (variant === 'minion') s.entities.foe.slot={dungeon:'x',floor:1,cycle:1,id:'x',role:'minion'};
        else Object.assign(s.entities.foe.profile,{type:'normal',level:99});
        s.entities.foe.qtype = 'major';
        const c=cfgContent(); delete c.monsters.loot.special;
        const a=lootEvents(s,content,enc), b=lootEvents(s,c,enc);
        assert.deepEqual(a,b,variant); assert.deepEqual(specials(a),[]);
    }
});
test('193: special draws never change ordinary materials, coin, salvage, Return Stone or RNG', () => {
    for (const role of ['guard','boss',null]) for (let seed=0;seed<20;seed++) {
        const {s,enc}=battle(role,seed), before=structuredClone(s.rng);
        const c=cfgContent(); delete c.monsters.loot.special;
        const a=lootEvents(s,content,enc), b=lootEvents(s,c,enc);
        const ev=a.events.filter(e=>e.d.object?.source.how!=='special_reward').map(e=> {
            const x=structuredClone(e); if(x.t==='entity.updated') delete x.d.set.reward; return x;
        });
        assert.deepEqual(ev,b.events); assert.deepEqual(a.lines,b.lines); assert.deepEqual(s.rng,before);
        assert.deepEqual(a,lootEvents(structuredClone(s),content,structuredClone(enc)));
    }
});
test('193: historical pre-metadata PC loot removes the guarantee across reset cycles; taken does not', () => {
    const {s,enc}=battle('boss');
    s.entities.old={...structuredClone(s.entities.foe),id:'old',looted:'enc.old'};
    s.entities.foe.slot.cycle=2;
    assert.equal(lootEvents(s,content,enc).rewards[0].first,false);
    delete s.entities.old.looted; s.entities.old.taken={party:'others'};
    assert.equal(lootEvents(s,content,enc).rewards[0].first,true);
    s.dungeons={'dungeon.test':{cycle:2,run:{floors:{1:{slots:[{id:'boss',taken:{party:'others'}}]}}}}};
    assert.deepEqual(specials(lootEvents(s,content,enc)),[]);
});
test('193: a repeat boss has no guaranteed trophy; repeat and elite rates/quality/stones follow U1–U11', () => {
    const counts={elite:0,repeat:0};
    for(let seed=0;seed<1000;seed++) {
        const {s,enc}=battle(null,seed); let r=lootEvents(s,content,enc);
        if(specials(r).length) counts.elite++;
        assert.ok(!specials(r).some(o=>o.profile?.quality==='exceptional'||o.profile?.kind==='skill_source'));
        s.entities.foe.slot={dungeon:'x',cycle:2,floor:1,id:'boss',role:'boss'};
        s.entities.old={...structuredClone(s.entities.foe),id:'old',looted:'enc.old',slot:{...s.entities.foe.slot,cycle:1}};
        r=lootEvents(s,content,enc); if(specials(r).length) counts.repeat++;
        assert.ok(!specials(r).some(o=>o.kind==='resource'));
    }
    assert.ok(counts.elite>200&&counts.elite<300,JSON.stringify(counts));
    assert.ok(counts.repeat>540&&counts.repeat<660,JSON.stringify(counts));
    const t=content.monsters.loot.special.tiers;
    assert.deepEqual([t.guardian.first.stone,t.guardian.repeat.stone,t.boss.first.stone,t.boss.repeat.stone],[.02,.01,.06,.03]);
    assert.deepEqual(t.boss.first.quality,{superior:90,exceptional:10});
    assert.deepEqual(t.guardian.first.quality,{fine:50,superior:48,exceptional:2});
});
for (const reason of ['pcDead','pcFled','foeFled','surrender','survives','looted']) test(`193: ${reason} grants no loot`,()=>{
    const {s,enc}=battle('boss');
    if(reason==='pcDead') enc.combatants.pc.current.hp=0;
    if(reason==='pcFled') enc.combatants.pc.current.escaped=true;
    if(reason==='foeFled') enc.combatants.foe.current.escaped=true;
    if(reason==='surrender') enc.combatants.foe.current.surrendered=true;
    if(reason==='survives') s.entities.foe.status='alive';
    if(reason==='looted') s.entities.foe.looted='enc.old';
    assert.deepEqual(lootEvents(s,content,enc).events,[]);
});
test('193: NPC ally participation does not reduce a guaranteed reward',()=>{
    const {s,enc}=battle('boss');
    enc.combatants.ally={id:'ally',side:'pc',current:{hp:10}};
    assert.equal(lootEvents(s,content,enc).rewards[0].first,true);
    assert.equal(specials(lootEvents(s,content,enc)).length,2);
});
test('193: generated equipment really equips and ranked gear refuses without consumption',()=>{
    for(const rank of ['F','E']) {
        const {s,enc}=battle(); s.entities.foe.profile.rank=rank;
        const c=force('gear'); const o=specials(lootEvents(s,c,enc))[0]; applyEvent(s,{t:'object.created',d:{object:o}});
        assert.equal(useOf(c,o),'equipment'); assert.equal(profileOf(c,o).rank,rank);
        const r=playerTurnV4(s,c,`I equip ${o.name}`,{c:true,commands:[{seq:1,type:'equip',object:o.id,quote:`I equip ${o.name}`}],msg:99});
        if(rank==='F') assert.ok(r.events.some(e=>e.t==='item.equipped'),JSON.stringify(r.outcome));
        else {assert.ok(rankRefusal(c,1,o.profile));assert.ok(!r.events.some(e=>e.t==='item.equipped'));}
    }
});
test('193: every generated restorative profile is consumed through the actual use path and restores its resource',()=>{
    const seen=new Set();
    for(let seed=0;seed<30;seed++) {
        const {s,enc}=battle('guard',seed),c=force('potions');
        for(const o of specials(lootEvents(s,c,enc))) {
            const p=restoreOf(c,o); assert.ok(p); seen.add(p.resource);
            const copy=structuredClone(s); copy.entities.pc.sheet[p.resource]=1; applyEvent(copy,{t:'object.created',d:{object:o}});
            const r=playerTurnV4(copy,c,'I drink the potion',{c:true,commands:[{seq:1,type:'use',object:o.id,qty:1,quote:'I drink the potion'}],msg:99});
            assert.ok(r.events.some(e=>e.t==='resource.changed'&&e.d.resource===p.resource),JSON.stringify(r.outcome));
            assert.ok(r.state.objects[o.id].qty===0||r.state.objects[o.id].holder?.entity!=='pc');
        }
    }
    assert.deepEqual([...seen].sort(),['hp','mp','sta']);
});
test('193: generated stones teach through activation, respect combat/rank/known checks, and remain one main find',()=>{
    const {s,enc}=battle(),c=force('stone');
    const o=specials(lootEvents(s,c,enc))[0]; applyEvent(s,{t:'object.created',d:{object:o}});
    assert.equal(profileOf(c,o).kind,'skill_source'); assert.ok(stoneActivation(s,c,o).target);
    const busy=structuredClone(s); busy.encounter=enc; assert.match(stoneActivation(busy,c,o).refuse,/fight/);
    const high=structuredClone(o); high.profile.rank='E'; assert.match(stoneActivation(s,c,high).refuse,/Rank/);
    const r=playerTurnV4(s,c,'I use the Skill Stone',{c:true,commands:[{seq:1,type:'use',object:o.id,qty:1,quote:'I use the Skill Stone'}],msg:99});
    const finalized=finalizeGrowth(r.state,c,{},activationsOf(r.outcome));
    assert.deepEqual(finalized.failed,[]);
    assert.ok(finalized.events.some(e=>e.t==='skill.learned'),JSON.stringify(finalized.events.map(e=>e.t)));
    for(const e of finalized.events) applyEvent(r.state,e);
    const again=structuredClone(o);again.id += '.known';again.qty=1;applyEvent(r.state,{t:'object.created',d:{object:again}});
    assert.match(stoneActivation(r.state,c,again).refuse,/already/);
});

const user04=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user04_qol159.json.gz',import.meta.url))));
for(const [label,chat,i] of [['Warden User04 enc.t22',user04.chat,51],['Queen b17-rogue #213',loadRun('b17-rogue').chat,213]]) test(`193 original ${label}: booking, panel, narrator, firewall, reload and regenerate`,()=>{
    const s=foldChat(chat,i).state;
    const old=rec(chat[i]).events.find(e=>e.t==='outcome.recorded').d.outcome;
    const attack=old.records.find(e=>e.actor==='pc'&&e.kind==='attack');
    const intent={kind:'attack',skill:attack.skill,target:attack.target};
    const r=playerTurn(s,content,chat[i].mes,{c:true,msg:i,intent});
    assert.ok(r.outcome.ended); assert.ok(r.outcome.rewardLines?.length);
    assert.ok(specials(r).length); assert.equal(r.outcome.rewards[0].first,true);
    assert.deepEqual(r.events,playerTurn(s,content,chat[i].mes,{c:true,msg:i,intent}).events,'regenerate uses identical hashes');
    const replay=structuredClone(s);for(const e of r.events) applyEvent(replay,e);
    assert.deepEqual(replay.objects,r.state.objects,'reload folds identical inventory');
    assert.deepEqual(lootEvents(replay,content,{...s.encounter,combatants:{...s.encounter.combatants,pc:{...s.encounter.combatants.pc,current:{hp:20}}}}).events,[],'no second booking');
    const panel=turnPanel(r.state,content); assert.match(panel,/SPECIAL REWARD/); assert.match(panel,/value guide/);
    const ctx=buildContext(r.state,content,{outcome:r.outcome,input:chat[i].mes,budget:1400}).text;
    assert.match(ctx,/hoard is a narrative frame/); assert.match(ctx,/no extra item/);
    const names=r.outcome.booked.grants; assert.ok(!names.some(n=>/SPECIAL REWARD|value guide|cp$/.test(n)));
    for(const o of specials(r)) {
        assert.ok(names.includes(o.name));
        const f=firewall([{seq:1,type:'object.new',name:o.name,kind:'item',qty:1,holder:'pc'}],{c:true,booked:r.outcome.booked});
        assert.equal(f.reject[0]?.rule,'engine_booked');
    }
});
test('193: first boss has exactly one main reward plus an inert trophy', () => {
    const {s, enc} = battle('boss');
    const r = lootEvents(s, content, enc);
    const special = r.events.filter(e => e.t === 'object.created' && e.d.object.source.how === 'special_reward').map(e => e.d.object);
    assert.equal(special.length, 2);
    assert.equal(special.find(o => o.kind === 'resource').value_cp, 60);
    assert.ok(r.grantNames.every(n => !n.includes('SPECIAL REWARD')));
});

test('193: every configured stone function is a valid activatable source, without invented tags or aspects', () => {
    const c=force('stone');
    for(const fn of new Set(Object.values(c.monsters.loot.special.stone_fn_by_anchor).flat())) {
        const {s,enc}=battle(); c.monsters.loot.special.stone_fn_by_anchor.skeleton=[fn];
        const o=specials(lootEvents(s,c,enc))[0]; applyEvent(s,{t:'object.created',d:{object:o}});
        assert.equal(o.profile.fn,fn); assert.deepEqual(o.profile.tags,[]); assert.deepEqual(o.profile.aspects,[]);
        const chk=stoneActivation(s,c,o); assert.ok(chk.target,JSON.stringify(chk));
        const learned=finalizeGrowth(s,c,{},[{key:`stone:${fn}`,object:o.id,seq:1}]);
        assert.deepEqual(learned.failed,[]); assert.equal(learned.learned.length,1);
        assert.ok(learned.events.some(e=>e.t==='object.consumed'&&e.d.id===o.id));
    }
});

test('193 original Warden host path: swipe and regenerate reuse the booked player record without another model or reward', async () => {
    const chat=structuredClone(user04.chat.slice(0,51));
    chat.push({mes:'I finish the Gallery Warden with Flame Lance.',is_user:true,extra:{}});
    let calls=0;
    const llm=async()=>{calls++;return JSON.stringify({commands:[{seq:1,type:'use_skill',skill:'mage.flame_lance',target:'mon.old_crown_catacombs_c1_l1_e3',quote:chat[51].mes}]});};
    const first=await prepareGenerationAsync(chat,content,{type:'normal',settings:{},llm});
    assert.notEqual(first.action,'fold_blocked');
    const record=structuredClone(rec(chat[51]));
    assert.ok(record.events.some(e=>e.t==='object.created'&&e.d.object.source?.how==='special_reward'));
    const before=calls;
    for(const type of ['swipe','regenerate']) {
        await prepareGenerationAsync(chat,content,{type,settings:{},llm});
        assert.deepEqual(rec(chat[51]).events,record.events,type);
        assert.equal(calls,before,type);
    }
    const folded=foldChat(chat); assert.deepEqual(folded.errors,[]);
    const objects=Object.values(folded.state.objects).filter(o=>o.source?.how==='special_reward');
    assert.equal(objects.length,new Set(objects.map(o=>o.id)).size);
});
