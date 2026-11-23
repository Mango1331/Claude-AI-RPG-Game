import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {loadProductContent} from '../helpers.js';
import {foldChat,projectPromptHistory,rec} from '../../src/host.js';
import {actionPrefix,validateActionSelection} from '../../src/action_input.js';
import {playerTurn} from '../../src/engine.js';
import {prepareGenerationAsync} from '../../src/v4/runtime.js';
import {initEncounter,orderedPhase,partialCoverAt} from '../../src/combat.js';
import {Dice} from '../../src/rng.js';
import {itemProfile} from '../../src/v4/items.js';
const content=await loadProductContent(),original=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/user10_207.json.gz',import.meta.url)))).chat;
const prefix=()=>structuredClone(original.slice(0,27));
const wave=original[27].extra.avereth_action_input.selection,retreat={id:'retreat',kind:'move',dir:'away',target:null};
const phase=(...steps)=>({id:'phase',kind:'phase',steps});
const sidestep={id:'dodge',kind:'sidestep'};
async function play(chat,input,answer) {
    const text=input.text, msg={is_user:true,mes:text,extra:{avereth_action_input:{...input,base_revision:actionPrefix(chat)}}};
    chat.push(msg);
    const calls=[];
    const run=(type='normal')=>prepareGenerationAsync(chat,content,{type,llm:async({purpose})=>{calls.push(purpose);assert.equal(purpose,'plan');return answer;}});
    const result=await run();
    return {msg,result,calls,run};
}
for(const before of [false,true]) test('User10 open First Strike with retreat '+(before?'before':'after')+' Wave',async()=>{
    const chat=prefix(), input={...original[27].extra.avereth_action_input,mode:'hud_roleplay',text:'My declared phase',selection:before?phase(retreat,wave):phase(wave,retreat)};
    const {calls,msg,result,run}=await play(chat,input);
    assert.equal(result.action,'context',result.notice);
    assert.deepEqual(calls,[]);
    const events=rec(msg).events, outcome=events.find(e=>e.t==='outcome.recorded').d.outcome, mine=outcome.records.filter(r=>r.actor==='pc');
    assert.deepEqual(mine.map(r=>r.kind),before?['move','attack']:['attack','move']);
    const a=mine.find(r=>r.kind==='attack');
    assert.ok(a.first_strike);assert.equal(a.strikes.length,8);assert.equal(a.cost.amount,14);
    assert.ok(mine.find(r=>r.kind==='move').change.includes('SHORT -> MEDIUM'));
    assert.equal(foldChat(chat).state.entities.pc.sheet.mp,58);
    const expected=structuredClone(events);
    for (const type of ['regenerate','swipe']) {
        await run(type);assert.deepEqual(calls,[]);assert.deepEqual(rec(msg).events,expected);
    }
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(chat))),foldChat(chat));
});
test('User10 original companion retreat has an explicit order; contradictory free text stays refused',async()=>{
    const input=original[27].extra.avereth_action_input,raw=original[27].extra.avereth.plan.raw[0];
    const ok=await play(prefix(),input,raw);
    assert.equal(ok.result.action,'context',ok.result.notice);assert.deepEqual(ok.calls,['plan']);
    assert.deepEqual(rec(ok.msg).events.find(e=>e.t==='outcome.recorded').d.outcome.records.filter(r=>r.actor==='pc').map(r=>r.kind),['attack','move']);
    const no=await play(prefix(),{...input,text:'Do not cast the spell. I jump backwards.'},raw);
    assert.equal(no.result.action,'not_executed');assert.deepEqual(rec(no.msg).events,[]);
});
test('original refused chat input and notice stay in audit and leave the narrator projection; single .207 attack still ends the campaign',async()=>{
    const chat=structuredClone(original.slice(0,29)),view=chat.slice();
    projectPromptHistory(view,{keepTurns:0});assert.ok(!view.some(m=>m.mes===chat[27].mes || m===chat[28]));
    assert.equal(chat[27].extra.avereth.events.length,0);
    const {msg}=await play(chat,original[29].extra.avereth_action_input);
    assert.equal(rec(msg).events.length,49);
    const pc=foldChat(chat).state.entities.pc.sheet;assert.equal(pc.hp,0);assert.equal(pc.mp,58);
});
function fight() {
    const s=foldChat(prefix()).state;
    const target=wave.target;
    const enc=initEncounter(s,content,Dice.from(s),{actor:'pc',target,engage:true},[{id:target,side:'hostile'}],'enc.test',{c:true});
    Object.assign(enc,{round:1,round_marker:1,trigger_done:true,current:'pc',order:['pc',target],turn_index:0});
    s.encounter=enc;
    s.entities.pc.sheet.skills['warrior.guard']={prof:1,pp:0};enc.combatants.pc.fixed.actions['warrior.guard']={prof:1};
    s.objects['obj.potion']={id:'obj.potion',qty:1,name:'minor healing potion',holder:{entity:'pc'},profile:itemProfile(content,{kind:'item',name:'minor healing potion'})};
    enc.combatants.pc.current.hp-=20;s.entities.pc.sheet.hp-=20;
    return s;
}
const potion={id:'pot',kind:'use',object:'obj.potion'},guard={id:'guard',kind:'skill',skill:'warrior.guard'};
for(const steps of [[potion,sidestep],[sidestep,potion],[guard,retreat]]) test('regular combat phase '+steps.map(s=>s.id).join(' then '),()=>{
    const s=fight(),v=validateActionSelection(phase(...steps),s,content);assert.ok(v.ok,v.reason);
    const turn=playerTurn(s,content,'Declared phase',{intent:v.mapped.intent,c:true});
    assert.ok(!turn.outcome.illegal);
    assert.deepEqual(turn.outcome.records.filter(r=>r.actor==='pc').map(r=>r.kind),steps.map(s=>s.kind==='use'?'item':s.kind));
    assert.equal(turn.events.filter(e=>e.t==='object.consumed').length,steps.includes(potion)?1:0);
});
test('invalid phases spend no resources; real ambush has one opening action',()=>{
    for(const steps of [[wave,wave],[retreat,sidestep],[{kind:'flee',id:'run'},retreat],[{...potion,object:'missing'},retreat],[wave,{...retreat,target:'unknown'}]]){
        const s=fight(),snapshot=structuredClone(s);
        assert.equal(validateActionSelection(phase(...steps),s,content).ok,false);
        assert.deepEqual(s,snapshot);
    }
    const s=fight(),ctx={state:s,enc:s.encounter,dice:Dice.from(s),content,c:true},enc=s.encounter;
    enc.combatants.pc.current.mp=0;
    const snapshot=structuredClone(enc),n=ctx.dice.n;
    assert.ok(orderedPhase(ctx,[{kind:'move',dir:'away'},{kind:'attack',skill:wave.skill,target:wave.target}]).illegal);
    assert.deepEqual(enc,snapshot);assert.equal(ctx.dice.n,n);
    const outside=foldChat(prefix()).state;outside.scene.awareness[wave.target]='unaware';
    assert.equal(validateActionSelection(phase(wave,retreat),outside,content).ok,false);
    assert.ok(validateActionSelection(wave,outside,content).ok);
});
test('sidestep has one ranged protection until the next own turn; preserves position and physical cover',()=>{
    const s=fight(),enc=s.encounter,c=enc.combatants.pc;
    assert.ok(!orderedPhase({enc,content,state:s,c:true},[{kind:'sidestep'}]).illegal);
    assert.equal(enc.combatants.pc.current.cover,c.current.cover);
    assert.equal(partialCoverAt(enc.combatants.pc,'MEDIUM'),true);assert.equal(partialCoverAt(enc.combatants.pc,'ENGAGED'),false);
});

test('NPC positioning spends one minor and expires at its next own turn; a ranged strike only gets one 25% reduction',async()=>{
    const {attackAction,runCombat}=await import('../../src/combat.js');
    const s=fight(),id=wave.target;
    s.encounter.current=id;s.encounter.turn_index=0;s.encounter.order=[id,'pc'];
    s.encounter.intents[id]='take_cover';
    const ctx={enc:s.encounter,state:s,content,c:true,dice:Dice.from(s)};
    const band=ctx.enc.combatants[id].current.band;
    const first=runCombat(ctx,null);
    assert.deepEqual(first.records.map(r=>r.kind),['sidestep']);
    assert.equal(ctx.enc.combatants[id].current.band,band);
    assert.equal(ctx.enc.combatants[id].current.cover,'none');
    for(const [distance,physical,wanted] of [['SHORT','none',true],['SHORT','partial',true],['ENGAGED','none',false]]){
        const duel=structuredClone(s.encounter),target=duel.combatants[id];
        target.current.band=distance;target.current.cover=physical;
        const r=attackAction({...ctx,enc:duel,dice:Dice.from(s)},'pc',id,wave.skill);
        assert.equal(r.strikes[0].steps.filter(line=>/(Partial Cover|Sidestep) -25%/.test(line)).length,wanted?1:0);
    }
    ctx.enc.intents[id]='hold';
    runCombat(ctx,{kind:'hold'});
    assert.equal(ctx.enc.combatants[id].current.effects.some(e=>e.kind==='sidestep'),false);
});

test('earlier initiative stands on later refusal or PC death; no PC movement or MP is spent',async()=>{
    const {runCombat}=await import('../../src/combat.js');
    for(const lethal of [false,true]){
        const s=fight(),enc=s.encounter,id=wave.target,pc=enc.combatants.pc;
        enc.order=[id,'pc'];enc.current=id;enc.turn_index=0;enc.intents[id]='attack';
        enc.combatants[id].current.band='ENGAGED';
        pc.current.hp=lethal?1:pc.fixed.max_hp;pc.current.mp=0;
        const before=pc.current.hp,ctx={state:s,content,enc,c:true,dice:Dice.from(s)};
        const run=runCombat(ctx,{phase:[retreat,{kind:'attack',skill:wave.skill,target:id}]});
        assert.ok(run.records.some(r=>r.actor===id && r.kind==='attack'));
        assert.ok(!run.records.some(r=>r.actor==='pc'));assert.equal(pc.current.mp,0);
        assert.ok(pc.current.hp<before);assert.equal(enc.combatants[id].current.band,'ENGAGED');
        assert.equal(run.stopped,lethal?'terminal':'illegal');
    }
});
test('ordered Guard keeps defensive proficiency through the following minor, insufficient STA rejects both',async()=>{
    const s=fight(),enc=s.encounter,pc=enc.combatants.pc,id=wave.target;
    enc.combatants[id].current.band='ENGAGED';enc.intents[id]='attack';
    const v=validateActionSelection(phase(guard,sidestep),s,content);assert.ok(v.ok,v.reason);
    const {runCombat}=await import('../../src/combat.js');
    const run=runCombat({state:s,content,c:true,enc,dice:Dice.from(s)},v.mapped.intent);
    assert.equal(run.enc.pp.used['warrior.guard'],'a defense under attack');
    const after=fight();after.encounter.combatants.pc.current.sta=0;
    const before=structuredClone(after);
    assert.equal(validateActionSelection(phase(retreat,guard),after,content).ok,false);
    assert.deepEqual(after,before);
});
test('first strike stops on victory, and an actual concealed opening retains its single critical strike',()=>{
    const s=foldChat(prefix()).state,id=wave.target;
    for(const e of Object.values(s.entities).filter(e=>e.kind==='creature' && e.profile))e.profile.hp=1;
    const v=validateActionSelection(phase(wave,retreat),s,content);assert.ok(v.ok,v.reason);
    const r=playerTurn(s,content,'Attack, then step back',{intent:v.mapped.intent,c:true});
    const me=r.outcome.records.filter(r=>r.actor==='pc');assert.deepEqual(me.map(r=>r.kind),['attack']);
    assert.ok(me[0].first_strike);
    s.scene.awareness[id]='unaware';
    const opening=playerTurn(s,content,'Attack from concealment',{intent:validateActionSelection(wave,s,content).mapped.intent,c:true});
    const attack=opening.outcome.records.find(r=>r.actor==='pc');
    assert.ok(attack.opening);assert.ok(!attack.first_strike);
    assert.ok(attack.strikes.every(s=>s.steps.some(line=>line.includes('1.5'))));
});

test('a changed target band after initiative cannot silently redirect the selected HUD area',()=>{
    const s=fight(),target=s.encounter.combatants[wave.target],check=validateActionSelection(phase(wave,retreat),s,content);
    assert.ok(check.ok,check.reason);assert.equal(check.mapped.intent.phase[0].expected_band,'SHORT');
    target.current.band='MEDIUM';
    const before=structuredClone(s),dice=Dice.from(s),oldN=dice.n;
    const result=orderedPhase({enc:s.encounter,state:s,content,c:true,dice},check.mapped.intent.phase);
    assert.ok(result.illegal);assert.deepEqual(s,before);assert.equal(dice.n,oldN);
});

test('lethal attack cannot authorize a second skill whose cost cannot be paid',()=>{
    const s=fight(),enc=s.encounter,pc=enc.combatants.pc;
    enc.combatants[wave.target].current.hp=1;pc.current.mp=14;
    pc.fixed.actions['mage.blink']={prof:1};
    const before=structuredClone(enc),dice=Dice.from(s),n=dice.n;
    const r=orderedPhase({state:s,enc,content,c:true,dice},[{kind:'attack',target:wave.target,skill:wave.skill},{kind:'skill',skill:'mage.blink',dir:'away'}]);
    assert.match(r.illegal,/lacks MP/);
    assert.deepEqual(enc,before);assert.equal(dice.n,n);
});

test('free-text turn uses the same ordered phase, and two unauthorised majors spend nothing',async()=>{
    async function tryPlan(commands,text) {
        const chat=prefix(),msg={mes:text,is_user:true,extra:{}},roles=[];
        chat.push(msg);
        const res=await prepareGenerationAsync(chat,content,{llm:async({purpose})=>{
            roles.push(purpose);return JSON.stringify({commands});
        }});
        assert.deepEqual(roles,['plan']);return {res,msg};
    }
    const step={seq:1,type:'move',dir:'away',target:null,quote:'I step back'};
    const cast={seq:2,type:'use_skill',skill:wave.skill,target:wave.target,quote:'cast Arcane Wave'};
    const ok=await tryPlan([step,cast],'I step back, then cast Arcane Wave.');
    assert.equal(ok.res.action,'context',ok.res.notice);
    const mine=rec(ok.msg).events.find(e=>e.t==='outcome.recorded').d.outcome.records.filter(r=>r.actor==='pc');
    assert.deepEqual(mine.map(r=>r.kind),['move','attack']);assert.equal(mine[1].area_band,'MEDIUM');
    const bad=await tryPlan([{...cast,seq:1},{...cast,quote:'cast Arcane Wave again'}],'I cast Arcane Wave, then cast Arcane Wave again.');
    assert.equal(bad.res.action,'not_executed');assert.deepEqual(rec(bad.msg).events,[]);
});
test('a refused player phase keeps the recorded enemy turn in audit and out of the projected player declaration',()=>{
    const msg={is_user:true,mes:'I jump through the locked gate.',extra:{avereth:{own_phase_refused:true,events:[{t:'resource.changed',d:{id:'pc',resource:'hp',value:18}}]}}};
    const prompt=[msg];projectPromptHistory(prompt);
    assert.doesNotMatch(prompt[0].mes,/locked gate/);
    assert.match(msg.mes,/locked gate/);assert.deepEqual(prompt[0].extra.avereth.events,msg.extra.avereth.events);
});

test('archived Queen is unaware: an ordered retreat and Flame Lance cannot spend a second ambush action', async () => {
    const frame = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/user_qol161.json.gz', import.meta.url)))).retreat;
    const chat = structuredClone(frame.prefix), before = foldChat(chat);
    const target = frame.commands[1].target;
    assert.equal(before.state.scene.awareness[target], 'unaware');
    const msg = {is_user:true, mes:frame.input, extra:{}};
    chat.push(msg);
    const calls = [];
    const result = await prepareGenerationAsync(chat, content, {type:'normal', llm:async ({purpose}) => {
        calls.push(purpose);
        return JSON.stringify({commands:frame.commands});
    }});
    assert.equal(result.action, 'not_executed');
    assert.match(result.notice, /Hinterhalt/);
    assert.deepEqual(calls, ['plan']);
    assert.deepEqual(rec(msg).events, []);
    assert.deepEqual(foldChat(chat).state, before.state);
});

test('a restorative held in the sheet shares the existing inventory debit for an ordered combat turn', () => {
    const s = fight();
    s.entities.pc.sheet.inventory.minor_healing_potion = 2;
    s.item_names = {...s.item_names, minor_healing_potion:'Minor healing potion'};
    const sel = {...potion,object:'item.minor_healing_potion'};
    const choice = validateActionSelection(phase(sel,sidestep),s,content);
    assert.ok(choice.ok,choice.reason);
    const turn = playerTurn(s,content,'Use one potion and sidestep',{intent:choice.mapped.intent,c:true});
    assert.ok(!turn.outcome.illegal,turn.outcome.illegal);
    assert.equal(turn.state.entities.pc.sheet.inventory.minor_healing_potion,1);
    assert.deepEqual(turn.events.filter(e=>e.t==='item.changed' && e.d.item==='minor_healing_potion').map(e=>e.d.qty),[-1]);
    assert.ok(!turn.events.some(e=>e.t==='object.consumed'));
    delete s.entities.pc.sheet.inventory.minor_healing_potion;
    assert.equal(validateActionSelection(phase(sel,sidestep),s,content).ok,false);
});
