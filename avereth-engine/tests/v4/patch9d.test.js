import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent, loadContent } from '../helpers.js';
import { classFixture, careerFixture, FIXTURE_SEEDS } from './patch9d_fixtures.js';
import { campaign, say, inject, lastUser, outcomeOf } from './patch8_lib.js';
import { classDrafts, classOffer, classOptions, acceptClass, classDefErrors, legacyValue, offerClass } from '../../src/v4/class_growth.js';
import { classQuality, fightFeats, developmentFeats } from '../../src/v4/feats.js';
import { definePassive, passiveTotals, passiveSnapshot, passiveSlots, skillCostAmount, combatPassive } from '../../src/passives.js';
import { deriveCharacter } from '../../src/derived.js';
import { defineSkill } from '../../src/skills.js';
import { developSkill } from '../../src/skill_composer.js';
import { applyEvent } from '../../src/state.js';
import { awardXp } from '../../src/progression.js';
import { completeContract } from '../../src/v4/guild.js';
import { engineEvidence } from '../../src/v4/passive_growth.js';
import { validateState } from '../../src/validate.js';
import { runCommands } from '../../src/commands.js';
import { foldChat } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { scaleCreature } from '../../src/npcgen.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { catalogText, catalogIds } from '../../src/v4/interpret.js';
import { npcTactic, skillAction, characterCombatant } from '../../src/combat.js';
import { classForgeRequest, parseClassForge } from '../../src/v4/forge.js';
import { characterRows } from '../../src/hud.js';

const c = await loadProductContent();
const rest = (g) => say(g, '*I rest for ten minutes*', { type: 'activity', kind: 'rest', what: null, minutes: 10, until: null, quote: 'I rest for ten minutes' });
const reply = (g) => g.reply('He rests.', { expected: {}, deltas: [] });
const sheet = (g) => g.state().entities.pc.sheet;
const panel = (g, text) => runCommands(g.state(), c, text).panels.join('\n');
const rankUp = (g, amount = 1) => inject(g, awardXp(sheet(g), amount, c, 'explicit test XP'));

test('9D matrix A-H: seeded histories produce Normal/Rare, different directions, hybrids, preserved extreme evidence and legacy isolation', async () => {
    for (const seed of FIXTURE_SEEDS) {
        assert.deepEqual(careerFixture('experienced', seed), careerFixture('experienced', seed));
        for (const [profile, quality] of [['normal','normal'], ['experienced','rare'], ['extreme','rare'], ['farming','normal']]) {
            const g = await classFixture(c, { profile, seed }); rankUp(g); await rest(g);
            assert.ok(classOptions(g.state()).length >= 2);
            assert.ok(classOptions(g.state()).every((o) => o.quality === quality));
            assert.ok(classOptions(g.state()).every((o) => classDefErrors(o,c).length === 0));
            if (profile === 'extreme') assert.ok(Object.values(g.state().career.feats).some((f) => f.facts.extreme));
            assert.deepEqual(validateState(g.state(), c), []);
        }
    }
    const offensive = await classFixture(c, {profile:'offense'}), defensive = await classFixture(c, {profile:'defense'}), hybrid = await classFixture(c, {profile:'hybrid'});
    for (const g of [offensive, defensive, hybrid]) { rankUp(g); await rest(g); }
    assert.equal(classOptions(offensive.state())[0].direction, 'offense');
    assert.equal(classOptions(defensive.state())[0].direction, 'defense');
    assert.ok(classOptions(hybrid.state()).some((o) => o.direction === 'hybrid'));
    const oldContent=await loadContent(), old=await classFixture(oldContent,{legacy:true});
    inject(old, awardXp(sheet(old),1,oldContent,'legacy')); await rest(old);
    assert.equal(old.state().career,undefined); assert.equal(classOffer(old.state()),null); assert.equal(sheet(old).evolution,undefined);
});

test('9D real combat end reaches E once, offers alternatives without a trait, explicit choice changes derived stats and the next combat snapshot, replay/HUD/panels agree', async () => {
    const g=await classFixture(c,{profile:'experienced'});
    const p=scaleCreature(c.anchors.get('wolf'),1,'normal',c);
    inject(g,[{t:'entity.created',d:{entity:{id:'mon.wolf',kind:'creature',anchor:'wolf',species:'wolf',profile:p,status:'alive',location:g.state().scene.location}}},{t:'scene.entered',d:{id:'mon.wolf',band:'ENGAGED',cover:'none'}},{t:'scene.awareness',d:{id:'mon.wolf',level:'aware'}}]);
    await say(g,'*I heavy slash the wolf*',{type:'use_skill',skill:'warrior.heavy_slash',target:'mon.wolf',quote:'I heavy slash the wolf'});
    assert.equal(sheet(g).level,15); assert.equal(g.state().encounter,null);
    assert.equal(lastUser(g).events.find((e)=>e.t==='career.recorded').d.stats.foes_defeated,1,'actual HP contribution is retained by the combat path');
    assert.equal(lastUser(g).events.filter((e)=>e.t==='decision.opened'&&e.d.decision.kind==='class').length,1);
    assert.equal(sheet(g).evolution,undefined);
    const choice=classOptions(g.state()).find((o)=>o.direction==='offense');
    const before=deriveCharacter(sheet(g),c), passives=structuredClone(sheet(g).passives), skills=structuredClone(sheet(g).skills), stats=structuredClone(sheet(g).stats);
    assert.match(panel(g,'#class'),/CLASS CHOICE/);
    const cat=buildCatalog(g.state(),c,{known:true,c:true});
    assert.match(catalogText(cat),/CLASS CHOICE/);assert.ok(catalogIds(cat).development_offer.includes(choice.id));
    await reply(g);
    await say(g,'I choose this class now.',{type:'development.accept',offer:choice.id,replace:null,quote:'I choose this class now'});
    assert.equal(sheet(g).evolution.id,choice.id);assert.equal(sheet(g).class,'warrior');
    assert.deepEqual(sheet(g).stats,stats);assert.deepEqual(sheet(g).passives,passives);assert.deepEqual(sheet(g).skills,skills);
    assert.equal(classOffer(g.state()),null);assert.equal(sheet(g).class_history.length,1);
    assert.equal(lastUser(g).events.filter((e)=>e.t==='passive.gained').length,0);
    assert.equal(deriveCharacter(sheet(g),c).atk,before.atk+6);
    assert.match(outcomeOf(g).booked.classes[0].text,/Rare/);
    assert.match(panel(g,'#class'),/Class legacy: 2/);assert.match(panel(g,'#feats'),/Extraordinary Survival/);
    assert.ok(JSON.stringify(characterRows(g.state(),c)).includes(choice.name));
    assert.deepEqual(foldChat(structuredClone(g.chat)).state,g.state());
    assert.deepEqual(validateState(g.state(),c),[]);
    await reply(g);
    // A durable, surviving target leaves a combat snapshot in which the trait is already included.
    inject(g,[{t:'entity.created',d:{entity:{id:'mon.next',kind:'creature',anchor:'wolf',species:'wolf',profile:{...p,max_hp:250,hp:250},status:'alive',location:g.state().scene.location}}},{t:'scene.entered',d:{id:'mon.next',band:'ENGAGED',cover:'none'}},{t:'scene.awareness',d:{id:'mon.next',level:'aware'}}]);
    await say(g,'*I heavy slash it*',{type:'use_skill',skill:'warrior.heavy_slash',target:'mon.next',quote:'I heavy slash it'});
    assert.equal(g.state().encounter.combatants.pc.fixed.atk,before.atk+6);
    assert.ok(outcomeOf(g).records.some((r)=>r.actor==='pc'&&r.cost&&r.cost.amount<7),'class cost reduction is executed');
});

test('9D quest XP and a large XP award keep the E entitlement, higher class ranks remain unsupported', async () => {
    const g=await classFixture(c);const s=g.state(),ev=[];
    const q={id:'quest.fixture',title:'Fixture delivery',kind:'guild_contract',status:'active',level:1,qtype:'minor',ready:true,payout_cp:0,objectives:[],proof:[],details:[],history:[],notes:[]};
    applyEvent(s,{t:'quest.created',d:{quest:q}});
    assert.equal(completeContract(s,c,q,(e)=>{applyEvent(s,e);ev.push(e);},{c:true}).ok,true);
    assert.ok(ev.some((e)=>e.t==='level.up'&&e.d.rank==='E'));
    assert.ok(classDrafts(s,c).length);
    const big=await classFixture(c); rankUp(big,200000); await rest(big);
    assert.equal(classOffer(big.state()).rank,'E');assert.match(panel(big,'#class'),/Higher class evolutions D–S and Domains are not implemented/);
    assert.ok(classOptions(big.state()).every((o)=>o.rank==='E'));
});

test('9D class choice is not blocked by three Passive offers, postpones unchanged and ambiguity never chooses for the player', async () => {
    const g=await classFixture(c);rankUp(g);
    for(const [i,stat] of ['ATK','DEF','MDEF'].entries()) inject(g,engineEvidence(g.state(),c,{key:`fixture.offer${i}`,quality:'rare',effects:[{kind:'stat_bonus',stat,value:4}]}).events);
    await rest(g);assert.equal(g.state().decisions.filter((d)=>d.kind==='passive').length,3);assert.ok(classOffer(g.state()));
    const before=structuredClone(classOffer(g.state()));await reply(g);
    await say(g,'I will consider the class later.',{type:'development.decline',offer:'dec.class.e',quote:'I will consider the class later'});
    assert.deepEqual(classOffer(g.state()),before);assert.equal(sheet(g).evolution,undefined);await reply(g);
    await say(g,'I accept it.',{type:'development.accept',offer:null,replace:null,quote:'I accept it'});
    assert.equal(sheet(g).evolution,undefined);assert.match(outcomeOf(g).actions.join(' '),/which of the offered developments/);
    assert.equal(acceptClass({...g.state(),encounter:{id:'fight'}},c,before.options[0].id).events,undefined);
    assert.equal(acceptClass({...g.state(),pending_combat:['npc.foe']},c,before.options[0].id).events,undefined);
    assert.deepEqual(validateState(g.state(),c),[]);
});

test('9D class offer survives regenerate without new Forge calls, malformed cosmetics fall back and a removed acceptance restores alternatives', async () => {
    const g=await classFixture(c);rankUp(g);let calls=0;const base=g.llm;g.llm=async(q)=>{if(q.purpose.startsWith('forge')) calls++;return base(q);};
    await rest(g);const before=structuredClone(classOffer(g.state()));assert.ok(calls>0);const n=calls;
    await prepareGenerationAsync(g.chat,c,{type:'regenerate',settings:{planner:true},llm:g.llm});
    assert.deepEqual(classOffer(g.state()),before);assert.equal(calls,n);
    const chatBefore=structuredClone(g.chat);await reply(g);
    await say(g,'I choose this class.',{type:'development.accept',offer:before.options[0].id,replace:null,quote:'I choose this class'});
    assert.ok(sheet(g).evolution);assert.equal(acceptClass(g.state(),c,before.options[0].id).events,undefined);
    assert.deepEqual(foldChat(chatBefore).state.decisions,[before]);
    assert.equal(foldChat(chatBefore).state.entities.pc.sheet.evolution,undefined);
    assert.deepEqual(classOffer(foldChat(chatBefore).state),before);
});

function ended(g,{id='enc.test',level=1,foeLevel=4,count=1,area=null,share=1,low=30}={}){
    const s=g.state();if(area)s.scene.location=area;
    const combatants={pc:{fixed:{level,max_hp:100},current:{hp:low,defeated:false,escaped:false}}},personal={},damage={},defeated=[];
    for(let i=0;i<count;i++){const key=`foe.${i}`;s.entities[key]={id:key,kind:'creature',anchor:'wolf'};combatants[key]={id:key,side:'hostile',fixed:{level:foeLevel,max_hp:100},current:{hp:0,defeated:true,surrendered:false}};personal[key]=100*share;damage[key]=100;defeated.push(key);}
    const enc={id,combatants,defeated,career:{personal,damage},pp:{used:{'warrior.heavy_slash':'meaningful use'},trial:{start:100,low,foes:defeated,taken:{physical:100-low,magical:0}}}};
    return {s,enc,events:fightFeats(s,c,enc)};
}
test('9D feats use locked levels and substantial HP share, preserve extreme evidence and ignore death, escape, surrender and absent credit', async()=>{
    const g=await classFixture(c),a=ended(g,{foeLevel:15,count:5});
    assert.deepEqual(a.events[0].d.feats.map((f)=>f.kind),['giant','odds','survival']);assert.ok(a.events[0].d.feats[0].facts.extreme);
    assert.equal(a.events[0].d.feats[0].facts.level,1,'current Level 14 does not rewrite encounter start');
    assert.equal(ended(g,{foeLevel:15,share:0.1}).events[0].d.feats.length,0,'a last hit is not enough');
    for(const flag of ['defeated','escaped']) {const {s,enc}=ended(g);enc.combatants.pc.current[flag]=true;const ev=fightFeats(s,c,enc)[0];assert.equal(ev.d.stats.fights_won,0);assert.equal(ev.d.feats.length,0);}
    const {s,enc}=ended(g);delete enc.career;assert.deepEqual(fightFeats(s,c,enc),[],'old logs are not invented');
    const b=ended(g,{foeLevel:15});b.enc.combatants['foe.0'].current.surrendered=true;assert.equal(fightFeats(b.s,c,b.enc)[0].d.feats.length,0);
});

test('9D repeated events and identical farm contexts do not inflate rarity; two meaningful contexts qualify, unrelated Passive outcome is immaterial',async()=>{
    const g=await classFixture(c);const {s}=ended(g);delete s.career;
    for(let i=0;i<12;i++) {const a=ended(g,{id:`enc.${i}`,foeLevel:4,count:5});for(const e of a.events)applyEvent(s,e);}
    assert.equal(Object.keys(s.career.feats).length,2);assert.equal(classQuality(s,c),'normal');
    const first=ended(g,{id:'enc.0',count:5}).events;const before=structuredClone(s.career);first.forEach((e)=>applyEvent(s,e));assert.deepEqual(s.career,before);
    const other=ended(g,{id:'enc.other',area:'loc.other',foeLevel:4,count:5});other.events.forEach((e)=>applyEvent(s,e));
    assert.equal(classQuality(s,c),'rare');assert.ok(s.career.feats[Object.keys(s.career.feats)[0]],'no dependence on a Passive offer');
});

test('9D trait validation, Normal/Rare budgets, shared caps, zero extra Passive slots and conditional combat effects',async()=>{
    const g=await classFixture(c);rankUp(g);const drafts=classDrafts(g.state(),c),normal=drafts.find((d)=>d.def.direction==='offense').def;
    assert.equal(classDefErrors({...normal,rank:'D'},c).length>0,true);
    assert.equal(classDefErrors({...normal,quality:'legendary'},c).length>0,true);
    assert.ok(classDefErrors({...normal,trait:{scope:'always',effects:[{kind:'stat_bonus',stat:'ATK',value:999}]}},c).length);
    assert.ok(classDefErrors({...normal,trait:{scope:'always',effects:[{kind:'script',value:1}]}},c).length);
    const s=g.state(),sh=s.entities.pc.sheet;
    for(let i=0;i<4;i++){
        const d={id:`dyn.passive_test_${i}`,name:['First Guard','Second Guard','Third Guard','Fourth Guard'][i],description:'test',origin:{kind:'engine'},rank:'F',quality:'rare',scope:'always',effects:[{kind:'stat_bonus',stat:'ATK',value:4}]};
        const p=definePassive(s,c,d);assert.deepEqual(p.errors,[]);p.events.forEach((e)=>applyEvent(s,e));applyEvent(s,{t:'passive.gained',d:{id:'pc',passive:d.id}});
    }
    sh.evolution=normal;assert.equal(passiveTotals(sh,c).stat.ATK,10);assert.equal(Object.keys(sh.passives).length,passiveSlots(c));
    const trait=structuredClone(normal);trait.trait={scope:'combat',condition:{kind:'foe_engaged'},effects:[{kind:'stat_bonus',stat:'DEF',value:4},{kind:'resist',damage_type:'physical',pct:8}]};sh.evolution=trait;
    const snap=passiveSnapshot(sh,c),combatant={fixed:{passive:snap,max_hp:100},current:{hp:100}};
    assert.equal(combatPassive(c,combatant,()=>false).stat.DEF,0);assert.equal(combatPassive(c,combatant,()=>true).stat.DEF,4);
    const rare=await classFixture(c,{profile:'experienced'});rankUp(rare);const rd=classDrafts(rare.state(),c).find((d)=>d.def.direction==='offense').def;
    assert.ok(rd.trait.effects.length>normal.trait.effects.length);assert.ok(rd.trait.effects[0].value>normal.trait.effects[0].value);
});

test('9D class effects cover resource maxima/resistance and cost calculations, replacement never stacks traits or refills pools',async()=>{
    const g=await classFixture(c,{profile:'experienced'});rankUp(g);await rest(g);await reply(g);
    const option=classOptions(g.state()).find((o)=>o.direction==='defense'),before=deriveCharacter(sheet(g),c),hp=sheet(g).hp;
    await say(g,'I choose this class.',{type:'development.accept',offer:option.id,replace:null,quote:'I choose this class'});
    assert.equal(deriveCharacter(sheet(g),c).maxHp,before.maxHp+35);assert.equal(sheet(g).hp,hp);
    assert.equal(passiveSnapshot(sheet(g),c).resist.physical,15);
    const alt=structuredClone(sheet(g));alt.evolution={...option,trait:{scope:'always',condition:null,effects:[{kind:'stat_bonus',stat:'MATK',value:6}]}};
    assert.equal(deriveCharacter(alt,c).maxHp,before.maxHp,'old trait is not read from history');
    assert.equal(deriveCharacter(alt,c).matk,deriveCharacter({...alt,evolution:null},c).matk+6);
});

test('9D remarkable development is an accepted mechanical evolution, ordinary skill progress is not a feat; legacy histories retain weighted potential',async()=>{
    const g=await classFixture(c),s=g.state(),def=developSkill(s,c,c.skills.get('warrior.heavy_slash'),'crowd',{origin:{kind:'evolution'}}).def;
    defineSkill(s,c,def).events.forEach((e)=>applyEvent(s,e));
    const ev={t:'skill.evolved',d:{id:'pc',from:'warrior.heavy_slash',to:def.id,prof:5,pp:0}};applyEvent(s,ev);
    assert.equal(developmentFeats(s,c,[ev])[0].d.feats[0].kind,'development');
    assert.deepEqual(developmentFeats(s,c,[{t:'skill.progress',d:{id:'pc',skill:def.id}}]),[]);
    assert.equal(legacyValue([{quality:'legendary'},{quality:'legendary'},{quality:'legendary'},{quality:'legendary'}],c),16);
    assert.equal(legacyValue([{quality:'rare'},{quality:'rare'},{quality:'rare'},{quality:'legendary'}],c),10);
});

test('9D narrator claims are not feats, no class/feat event is an extractor capability',async()=>{
    const g=await classFixture(c),before=structuredClone(g.state().career);
    await rest(g);await g.reply('He has slain a divine dragon and becomes a Legendary King.',{expected:{},deltas:[]});
    assert.deepEqual(g.state().career,before);assert.equal(sheet(g).evolution,undefined);
});

test('9D Forge accepts cosmetic class names only; a valid batch stays fixed across retry',async()=>{
    const g=await classFixture(c);rankUp(g);const drafts=classDrafts(g.state(),c);
    const response={skills:drafts.map((d,i)=>({key:d.key,name:['Iron Vanguard','Steadfast Warden','Enduring Sentinel'][i],flavor:'A quiet poise settles into his stance.'}))};
    const parsed=parseClassForge(JSON.stringify(response),drafts,c,g.state());assert.deepEqual(parsed.errors,[]);
    const offered=offerClass(g.state(),c,drafts,parsed.entries);assert.equal(offered.offers[0].name,'Iron Vanguard');
    assert.deepEqual(offered.events[0].d.decision.options[0].trait,drafts[0].def.trait);
    response.skills[0].effects=[{kind:'win_every_fight'}];assert.ok(parseClassForge(JSON.stringify(response),drafts,c,g.state()).errors.length);
    assert.match(classForgeRequest(drafts)[0].content,/evolved Classes/);
    const colliding = offerClass(g.state(),c,drafts,{[drafts[0].key]:{name:drafts[1].def.name}}).events[0].d.decision.options;
    assert.equal(new Set(colliding.map((o)=>o.name)).size,colliding.length,'a Forge name cannot take another option fallback twice');
});

test('9D NPC uses existing Blink, heal and resource conversion only for a concrete need; caps, payment and no-repeat gates remain',async()=>{
    const g=await classFixture(c),s=g.state();
    const healing={id:'dyn.npc_mend',name:'Quiet Mend',description:'Restores HP.',origin:{kind:'teacher'},rank:'F',complexity:1,tags:['Arcane'],category:'Defensive',activation:'action',target:'self',cost:{resource:'mp',amount:8},effects:[{kind:'heal',base:6,stat:'WIL',coef:1,floor:true}]};
    const restore={id:'dyn.npc_refresh',name:'Measured Breath',description:'Converts STA to MP.',origin:{kind:'teacher'},rank:'F',complexity:1,tags:['Arcane'],category:'Utility',activation:'action',target:'self',cost:{resource:'sta',amount:10},effects:[{kind:'restore',resource:'mp',amount:10}]};
    for(const def of [healing,restore]){const d=defineSkill(s,c,def);assert.deepEqual(d.errors,[]);d.events.forEach(e=>applyEvent(s,e));}
    const build=(skills)=>{
        s.entities.npc={id:'npc',kind:'npc',name:'Test Mage',sheet:{...structuredClone(s.entities.pc.sheet),class:'mage',skills:Object.fromEntries(skills.map(id=>[id,{prof:1,pp:0}]))}};
        const me=characterCombatant(s,'npc',c,'hostile'),pc=characterCombatant(s,'pc',c,'pc');me.current.band='ENGAGED';me.current.hp=Math.floor(me.fixed.max_hp*.65);
        return {state:s,content:c,c:true,enc:{round:1,combatants:{npc:me,pc},log:[{actor:'pc',kind:'attack',skill:'warrior.heavy_slash',strikes:[{target:'npc',final:25}]}]},me};
    };
    let ctx=build(['mage.arcane_bolt','mage.blink']);
    assert.equal(npcTactic(ctx,ctx.me,{kind:'attack'}).skill,'mage.blink');const paid=ctx.me.current.mp;
    const blink=skillAction(ctx,'npc','mage.blink',{dir:'away'});assert.equal(blink.illegal,undefined);assert.equal(ctx.me.current.band,'SHORT');assert.ok(ctx.me.current.mp<paid);
    ctx.enc.log.push(blink);assert.equal(npcTactic(ctx,ctx.me,{kind:'attack'}),null,'no consecutive tactics');
    ctx=build(['mage.arcane_bolt',healing.id]);ctx.me.current.hp=Math.floor(ctx.me.fixed.max_hp*.4);
    assert.equal(npcTactic(ctx,ctx.me,{kind:'attack'}).skill,healing.id);const hp=ctx.me.current.hp;
    skillAction(ctx,'npc',healing.id);assert.ok(ctx.me.current.hp>hp);
    ctx=build(['mage.arcane_bolt',restore.id]);ctx.me.current.mp=0;
    assert.equal(npcTactic(ctx,ctx.me,{kind:'attack'}).skill,restore.id);skillAction(ctx,'npc',restore.id);assert.equal(ctx.me.current.mp,10);
    ctx.me.current.tactics=3;assert.equal(npcTactic(ctx,ctx.me,{kind:'attack'}),null);
    ctx.me.current.tactics=0;ctx.me.current.sta=0;ctx.me.current.mp=0;assert.equal(npcTactic(ctx,ctx.me,{kind:'attack'}),null);
    assert.equal(npcTactic(ctx,ctx.me,{kind:'flee'}),null);assert.equal(npcTactic(ctx,ctx.me,{kind:'surrender'}),null);
});
