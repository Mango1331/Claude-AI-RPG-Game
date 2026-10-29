import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { fold, applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { hallOf, hallOfSettlement, guildDestination, boardKey } from '../../src/v4/domain.js';
import { boardNeed, bookBoard } from '../../src/v4/guild.js';
import { validateState } from '../../src/validate.js';
import { parseExtraction } from '../../src/v4/extract.js';
const content = await loadProductContent();
const original = JSON.parse(fs.readFileSync(new URL('./fixtures/batch13_branch117.json', import.meta.url)));
const hallRef = original.answer.expected['1'].at;
const evidence = 'a front desk where a broad-shouldered clerk with spectacles pushed up into grey hair was sorting slips into a ledger';
const branch = (place = hallRef, quote = evidence, seq = 7) => ({seq, type:'guild.branch', place, evidence:quote});
const base = () => fold(original.events);
function plan(s, commands = original.commands, text = original.input) {
    const events = [], emit = e => {events.push(e); applyEvent(s, e);};
    const ctx = resolveCommands(s, content, structuredClone(commands), emit, {c:true, text});
    s.last.outcome = {auth:ctx.auth, conditionals:ctx.conditionals, expected_keys:ctx.expectedKeys, resolutions:ctx.resolutions, booked:ctx.booked};
    return {events, ctx};
}
function visit({mark = true, noArrival = false} = {}) {
    const s = base(); const before = structuredClone(s); const p = plan(s);
    const answer = structuredClone(original.answer);
    if(noArrival) { answer.deltas = answer.deltas.filter(d => d.type !== 'arrive'); answer.expected['1'].arrived = false; }
    if(mark) answer.deltas.push(branch());
    const r = applyWorld(s, content, answer, {prose:original.prose, msg:28});
    return {...r, before, planned:s, commandEvents:p.events};
}
test('117 original Stonebrook GO + READY handover pays only after established branch and arrival', () => {
    const r = visit(); const s = r.state; const qid = 'quest.slay_the_lamb_rending_wolf_of_stonebrook';
    assert.ok(hallOfSettlement(s,'loc.stonebrook')); assert.equal(hallOf(s,s.scene.at),hallOfSettlement(s,'loc.stonebrook'));
    assert.equal(s.quests[qid].status,'completed'); assert.equal(s.entities.pc.sheet.coin_cp,70);
    assert.equal(r.events.filter(e=>e.t==='transaction.completed'&&e.d.quest===qid).length,1);
    const tag = r.events.findIndex(e=>e.t==='place.updated'&&e.d.set?.tags?.includes('guild_hall'));
    assert.ok(tag >= 0); assert.ok(r.events.findIndex(e=>e.t==='transaction.completed'&&e.d.quest===qid)>tag);
    assert.deepEqual(validateState(s,content),[]);
    const replay = structuredClone(r.before); [...r.commandEvents,...r.events].forEach(e=>applyEvent(replay,JSON.parse(JSON.stringify(e))));
    // last.outcome is assembled by the harness, not an event; compare the persisted domains.
    for(const key of ['places','quests','guild','objects']) assert.deepEqual(replay[key],s[key]);
    assert.deepEqual(replay.entities.pc.sheet,s.entities.pc.sheet);
});
test('117 a new hall without operational evidence never pays',()=>{
    const r=visit({mark:false}); assert.notEqual(r.state.quests['quest.slay_the_lamb_rending_wolf_of_stonebrook'].status,'completed');
    assert.equal(r.state.entities.pc.sheet.coin_cp,30); assert.equal(hallOf(r.state,r.state.scene.at),null);
});
test('117 a remote operating branch creates no player arrival or payout',()=>{
    const r=visit({noArrival:true}); assert.ok(hallOfSettlement(r.state,'loc.stonebrook'));
    assert.equal(r.state.scene.at,r.before.scene.at); assert.equal(r.state.entities.pc.sheet.coin_cp,30);
});
for(const quote of ['A sign reads Guild hall.','The villager said, "A Guild clerk receives contracts at the counter."','A Guild clerk will receive contracts at the counter tomorrow.'])
 test('117 sign, hearsay and future service do not establish a branch: '+quote,()=>{
    const s=base();plan(s,[]); const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[branch(hallRef,quote,1)]},{prose:quote});
    assert.equal(hallOfSettlement(r.state,'loc.stonebrook'),null); assert.ok(r.rejected.some(x=>x.rule==='guild_branch'));
 });
test('117 player assertion with no narrator evidence establishes nothing',()=>{
    const s=base();plan(s); const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[branch(hallRef,evidence,1)]},{prose:'Alaric claims there is a branch here.'});
    assert.equal(hallOfSettlement(r.state,'loc.stonebrook'),null);
});
test('117 existing place id and later reception rooms preserve one functional branch',()=>{
    const r=visit();const s=r.state;const hall=hallOfSettlement(s,'loc.stonebrook');
    plan(s,[]);const prose='A Guild clerk receives adventurers at the reception counter.';
    const room={new:{name:'Guild reception room',kind:'interior',parent:'loc.stonebrook'}};
    const again=applyWorld(s,content,{scene:'here',expected:{},deltas:[branch(hall,prose,1),branch(room,prose,2)]},{prose});
    assert.equal(hallOfSettlement(again.state,'loc.stonebrook'),hall);
    assert.equal(Object.values(again.state.places).filter(p=>p.tags?.includes('guild_hall')&&p.parent==='loc.stonebrook').length,1);
    assert.equal(again.events.filter(e=>e.t==='place.created'&&e.d.place.tags?.includes('guild_hall')).length,0);
    const paid=again.state.entities.pc.sheet.coin_cp; const p=plan(again.state,[{seq:1,type:'quest.turn_in',quest:'quest.slay_the_lamb_rending_wolf_of_stonebrook',quote:'I turn in the wolf contract'}]);
    assert.equal(again.state.entities.pc.sheet.coin_cp,paid);assert.ok(!p.events.some(e=>e.t==='transaction.completed'));
});
test('117 a pre-existing untagged hall is promoted in place, not replaced',()=>{
    const r=visit({mark:false});const id=r.state.scene.at;plan(r.state,[]);
    const p=applyWorld(r.state,content,{scene:'here',expected:{},deltas:[branch(id,evidence,1)]},{prose:original.prose});
    assert.equal(hallOfSettlement(p.state,'loc.stonebrook'),id); assert.equal(p.events.filter(e=>e.t==='place.created').length,0);
});
test('117 a confirmed arrival without a player GO cannot collect the payout',()=>{
    const s=base();plan(s,[original.commands[1]]);const a=structuredClone(original.answer);a.deltas.push(branch());
    const r=applyWorld(s,content,a,{prose:original.prose});assert.equal(r.state.scene.at,s.scene.at);assert.equal(r.state.entities.pc.sheet.coin_cp,30);
});
test('117 canonical Glassmere and Ruleset-1 semantics remain intact',()=>{
    const s=base();assert.equal(guildDestination(s,'Glassmere Guild hall').id,'loc.glassmere.guild_hall');
    s.meta.ruleset=1;plan(s,[]);const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[branch(hallRef,evidence,1)]},{prose:original.prose});
    assert.equal(hallOfSettlement(r.state,'loc.stonebrook'),null);
});
test('117 founding a branch generates no board; explicit requests share settlement/rank/day',()=>{
    const r=visit();const s=r.state;assert.ok(hallOfSettlement(s,'loc.stonebrook'));
    assert.ok(!r.events.some(e=>['board.generated','quest.created'].includes(e.t)));
    const need=boardNeed(s,content);assert.equal(need.branch,'loc.stonebrook');
    // Existing Board publisher and existing contract values, not another generator.
    const listings=Object.values(base().quests).filter(q=>q.source?.branch==='loc.glassmere').map(q=>({...q,proof:[]}));
    const events=[];bookBoard(s,content,need,listings,e=>{events.push(e);applyEvent(s,e);});
    for(const e of events.filter(e=>e.t==='quest.created'))assert.equal(e.d.quest.source.board,hallOfSettlement(s,'loc.stonebrook'));
    assert.equal(boardKey('loc.stonebrook','Novice'),boardKey(need.branch,need.rank));
    assert.equal(boardNeed(s,content),null);
});
test('117 original plan preserves the explicit handover as a conditional, not a refusal',()=>{
    const s=base();const {ctx}=plan(s);assert.equal(ctx.resolutions.find(r=>r.type==='quest.turn_in').status,'conditional');
    assert.ok(ctx.conditionals.some(k=>k.kind==='turn_in'&&k.guild_candidate&&k.go_seq===1));
});
test('117 extractor schema accepts explicit branch evidence, never an arbitrary tag field',()=>{
    const s=base(),ids={places:Object.keys(s.places),quests:Object.keys(s.quests),objects:Object.keys(s.objects)};
    const a={scene:'here',expected:{},deltas:[branch(hallRef,evidence,1)]};
    assert.equal(parseExtraction(JSON.stringify(a),content.deltaVocab,ids,{}).valid,true);
    a.deltas[0].tags=['guild_hall'];assert.equal(parseExtraction(JSON.stringify(a),content.deltaVocab,ids,{}).valid,false);
});
test('117 a different reached Guild branch cannot satisfy a Stonebrook-specific conditional',()=>{
    const s=base();plan(s);const a={scene:'loc.glassmere.guild_hall',expected:{1:{arrived:true,at:'loc.glassmere.guild_hall',with:null}},deltas:[{seq:1,type:'arrive',at:'loc.glassmere.guild_hall',with:null,forced_by:null}]};
    const r=applyWorld(s,content,a,{prose:'Alaric entered the Glassmere Guild hall.'});
    assert.equal(r.state.entities.pc.sheet.coin_cp,30);assert.notEqual(r.state.quests['quest.slay_the_lamb_rending_wolf_of_stonebrook'].status,'completed');
});
test('117 an older differently named reception keeps its id under the canonical branch',()=>{
    const r=visit();const s=r.state;const hall=hallOfSettlement(s,'loc.stonebrook');
    applyEvent(s,{t:'place.created',d:{place:{id:'loc.stonebrook.old_counter',name:'Old reception',kind:'interior',parent:'loc.stonebrook',realm:'realm.caelreth',tags:[]}}});
    plan(s,[]);const prose='A Guild clerk receives adventurers at the old counter.';
    const p=applyWorld(s,content,{scene:'here',expected:{},deltas:[branch('loc.stonebrook.old_counter',prose,1)]},{prose});
    assert.equal(p.state.places['loc.stonebrook.old_counter'].parent,hall);assert.equal(hallOf(p.state,'loc.stonebrook.old_counter'),hall);
    assert.equal(p.events.filter(e=>e.t==='place.created').length,0);
});
test('117 return to an established branch reuses the same id and cannot repay a completed contract',()=>{
    const r=visit(),s=r.state,hall=hallOfSettlement(r.state,'loc.stonebrook');
    s.scene.at='loc.stonebrook';s.scene.present=[];
    plan(s,[{seq:1,type:'go',to:{new:'Stonebrook Guild branch hall'},quote:'I return to Stonebrook Guild branch hall'},{seq:2,type:'quest.turn_in',quest:'quest.slay_the_lamb_rending_wolf_of_stonebrook',quote:'I turn in the wolf contract'}]);
    const a={scene:hall,expected:{1:{arrived:true,at:hall,with:null}},deltas:[{seq:1,type:'arrive',at:hall,with:null,forced_by:null}]};
    const p=applyWorld(s,content,a,{prose:'Alaric returned to the Guild counter.'});assert.equal(p.state.scene.at,hall);
    assert.equal(p.state.entities.pc.sheet.coin_cp,70);assert.equal(p.events.filter(e=>e.t==='place.created').length,0);
});
test('117 original input through Planner, guard, World extraction, saved record and swipe books once',async()=>{
    const {prepareGenerationAsync,processReplyAny,runExtraction}=await import('../../src/v4/runtime.js');
    const {foldChat,rec}=await import('../../src/host.js');
    const chat=[{mes:'Earlier recorded campaign',is_user:false,extra:{avereth:{v:3,events:original.events}}},
        {mes:original.input,is_user:true,is_system:false,extra:{}}];
    const calls=[];const llm=async req=>{calls.push(req.purpose);if(req.purpose==='plan')return JSON.stringify({commands:original.commands});throw Error(req.purpose);};
    const prepared=await prepareGenerationAsync(chat,content,{llm,settings:{planner:true}});
    assert.equal(prepared.action,'context');assert.equal(rec(chat[1]).plan.failed,false);
    assert.ok(rec(chat[1]).events.some(e=>e.t==='cmd.resolved'&&e.d.type==='quest.turn_in'&&e.d.status==='conditional'));
    chat.push({mes:original.prose,is_user:false,is_system:false,extra:{}});processReplyAny(chat,2,content);
    const answer=structuredClone(original.answer);answer.deltas.push(branch());
    const extract=async req=>{calls.push(req.purpose);return JSON.stringify(answer);};
    await runExtraction(chat,2,content,extract);
    assert.equal(rec(chat[2]).extraction.status,'applied');
    const reload=JSON.parse(JSON.stringify(chat)),state=foldChat(reload);
    assert.deepEqual(state.errors,[]);assert.equal(state.state.entities.pc.sheet.coin_cp,70);
    assert.equal(state.state.quests['quest.slay_the_lamb_rending_wolf_of_stonebrook'].status,'completed');
    assert.deepEqual(validateState(state.state,content),[]);
    await runExtraction(chat,2,content,extract);assert.equal(calls.filter(x=>x==='extract').length,1);
    // An alternative unextracted swipe cannot retain the old payout. Returning restores exactly one.
    reload[2].mes='An alternative reply without confirmed arrival.';
    assert.equal(foldChat(reload).state.entities.pc.sheet.coin_cp,30);
    reload[2].mes=original.prose;assert.equal(foldChat(reload).state.entities.pc.sheet.coin_cp,70);
});
