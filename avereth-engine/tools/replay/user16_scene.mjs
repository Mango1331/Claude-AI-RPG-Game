// Offline product replay. Pass the User16 run directory from main, then optional output chat path.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {engineAt} from './replay.mjs';
import {statusOf} from '../../src/knowledge.js';
import {actionPrefix} from '../../src/action_input.js';

const [archive, output] = process.argv.slice(2);
const {host, runtime, content} = await engineAt(fileURLToPath(new URL('../../',import.meta.url)));
const original = fs.readFileSync(resolve(archive, 'originals/chat.jsonl'), 'utf8').trim().split('\n').slice(1).map(JSON.parse);
const answers = JSON.parse(execFileSync('python3', [resolve(archive, 'pruefung/st_antworten.py')], {encoding:'utf8'}));
const chat = structuredClone(original);
const state = () => host.foldChat(chat).state;
const events = i => host.rec(chat[i]).events;
const anchored = (d, at) => ({...d, scene:at});

function adapted(i, raw, at) {
    if (i === 15) return {commands:[]};
    const hall = 'loc.ashbridge.guild_hall';
    if (i === 20) {
        const request = raw.deltas.find(d => d.kind === 'promise');
        Object.assign(request,{kind:'request',who:['npc.dammar'],recall_at:hall});
        raw.deltas.find(d => d.kind === 'mystery').recall_at = 'loc.mossback_warrens';
    }
    if (i === 22) {
        const promise = raw.deltas.find(d => d.kind === 'promise' && !d.id);
        promise.text = 'Dammar accepted a good word with the Guild clerk if his information proves true. Alaric made no promise of forage rights.';
        promise.recall_at = hall;
        // Even an incomplete literal excerpt must not drop limits elsewhere in the same decision.
        promise.player_words = 'i can put a word in for you';
        raw.deltas.push({seq:9,type:'thread',id:'thread.t10.2',kind:'request',status:'resolved',who:['npc.dammar'],
            text:'Dammar’s original request for forage rights',resolution:'He accepted the narrower conditional offer of a good word.'});
    }
    if (i === 35 || i === 37) {
        const go = raw.commands[0];
        return {commands:[{...go, to:{scene:i === 35 ? 'the other voices' : 'the goblins'}}]};
    }
    if (i === 36 || i === 38) {
        const standpoint = i === 36 ? "worked his way along the hill's flank toward the burnt doorway and the voices above it" :
            "Alaric crossed the last stretch in a crouch, from slab shadow to the blackened jamb of the doorway";
        const observations = raw.deltas.filter(d => d.type === 'thread' && (i === 36 || !d.id));
        if (i === 38) {
            observations[0].text = 'Alaric overheard two goblins speaking of a rusted chain, Tolmag and new arrivals. The captive itself was out of sight.';
            observations.push({type:'thread',id:null,kind:'sign',status:'open',who:[],
                text:'From outside the doorway Alaric saw two goblins at a crate near the bend, one with a crooked knife and one with a stone maul.'});
        }
        if (i === 38) observations.push({type:'creature.new',ref:'lookouts',species:'goblin',anchor:'goblin',count:2,
            present:true,band:'SHORT',population:'independent',life_stage:'adult',
            across:'on a flattened crate, sat the two goblins',desc:['a crooked knife stuck in its belt','a stone maul between its feet']});
        return {scene:at, expected:{1:{standpoint}}, deltas:observations.map((d,n) => anchored({...d, seq:n+1},at))};
    }
    return raw;
}
const counts = {};
for (let i = 1; i < chat.length; i++) {
    const rec = host.rec(original[i]);
    if (!rec?.input_hash && !rec?.extraction) continue;
    const prefix = chat.slice(0,i+1);
    const current = chat[i];
    delete current.extra.avereth;
    if (current.extra.avereth_action_input) current.extra.avereth_action_input.base_revision = actionPrefix(prefix,i);
    const at = host.foldChat(prefix.slice(0,-1)).state.scene.at;
    const queue = structuredClone(answers[i] || []);
    const llm = async ({purpose}) => {
        const entry = queue.shift();
        assert.equal(entry?.purpose, purpose, 'unexpected mock call at M'+i);
        counts[purpose] = (counts[purpose] || 0) + 1;
        if (![15,20,22,35,36,37,38].includes(i)) return entry.content;
        const raw = JSON.parse(entry.content);
        return JSON.stringify(adapted(i,raw,at));
    };
    if (current.is_user) {
        if (current.is_system && rec.command) current.is_system = false;
        await runtime.prepareGenerationAsync(prefix, content,{type:'normal',llm});
    } else {
        assert.ok(runtime.processReplyAny(prefix,i,content,{}).extract, 'X expected M'+i);
        await runtime.runExtraction(prefix,i,content,llm);
        assert.equal(host.rec(current).extraction.status, 'applied', 'extraction M'+i+': '+JSON.stringify(host.rec(current).extraction));
    }
    assert.equal(queue.length,0,'unused mock at M'+i);
    if (i === 15) assert(!events(i).some(e=>e.t === 'check.recorded'));
    if (i === 28) assert(events(i).some(e=>e.t === 'entity.created' && e.d.entity?.kind === 'creature') || host.foldChat(prefix).state.scene.present.some(id=>id.includes('goblin')));
    if ([36,38].includes(i)) {
        const next = host.foldChat(prefix).state;
        assert(next.scene.at.includes('east_fold'),next.scene.at);
        assert(next.scene.focus,'no local standpoint M'+i+': '+JSON.stringify(events(i)));
        assert(events(i).some(e=>e.t === 'thread.set'));
        assert(!next.encounter);
        const visible = next.scene.present.filter(id=>next.entities[id]?.sight_at);
        assert.equal(visible.length,i === 38 ? 2 : 0,JSON.stringify(events(i)));
        if (i === 38) assert(events(i).some(e=>e.t === 'check.recorded'));
    }
}
assert.deepEqual(host.foldChat(chat).errors,[]);
console.log({counts,at:state().scene.at,standpoint:state().scene.focus});
if (output) fs.writeFileSync(output, JSON.stringify(chat));

async function branch(prefix, text, commands, prose, extract) {
    const run = structuredClone(prefix);
    const respond = (role, value) => async req => {
        assert.equal(req.purpose,role);
        return JSON.stringify(value);
    };
    run.push({is_user:true,mes:text,extra:{}});
    const step = await runtime.prepareGenerationAsync(run,content,{settings:{budget:1400,rulesBudget:800,recentTurns:4,engineLore:false},llm:respond('plan',{commands})});
    if (prose) {
        assert.equal(step.action,'context',text);
        run.push({is_user:false,mes:prose,extra:{}});
        const i = run.length-1;
        runtime.processReplyAny(run,i,content,{});
        await runtime.runExtraction(run,i,content,respond('extract',extract));
        assert.equal(host.rec(run[i]).extraction.status,'applied');
    }
    const {state:next,errors} = host.foldChat(run);
    assert.deepEqual(errors,[]);
    return {run,next,events:host.rec(run.at(-1)).events,step};
}
const current = state();
assert.equal(current.threads['thread.t10.2'].kind,'request');
assert.equal(current.threads['thread.t10.2'].status,'resolved');
assert.match(current.threads['thread.t10.2'].text,/row about the mushroom beds$/);
assert.equal(current.threads['thread.t11.1'].player_words, original[21].mes);
assert.equal(current.threads['thread.t10.1'].status,'open');
assert.equal(current.threads['thread.t9.2'].status,'open');
const outside = current.scene.at;
const dungeon = 'loc.mossback_warrens';
const go = (to,quote,other={}) => [{seq:1,type:'go',to,quote,...other}];
const listen = await branch(chat,'I stay here and listen.',[],'Another laugh echoes from below.',
    {scene:'here',expected:{},deltas:[]});
assert.equal(listen.next.scene.focus,state().scene.focus);
const withdraw = 'I back away to the slab.';
const movement = 'Alaric steps back into the shadow of the slab.';
const away = await branch(chat,withdraw,go({scene:'the slab'},withdraw),movement,
    {scene:'here',expected:{1:{standpoint:movement}},deltas:[]});
assert.equal(away.next.scene.focus,movement);
const enter = 'I step inside the passage.';
const entry = 'Alaric steps through the doorway and enters the first tunnel of the Mossback Warrens.';
const room = {new:{name:'First tunnel',kind:'interior',parent:dungeon}};
const crossed = await branch(chat,enter,go(dungeon,enter),entry,{scene:room,expected:{1:{arrived:true,at:room,with:null,met:null}},deltas:[
    {seq:1,type:'arrive',at:room,evidence:entry,with:null}]});
assert.notEqual(crossed.next.scene.at,outside,JSON.stringify(crossed.events));
assert(!crossed.next.scene.focus && crossed.next.dungeons[dungeon]);
const more = 'I follow the passage around the bend.';
const around = {new:{name:'Bend beyond the adit',kind:'interior',parent:dungeon}};
const nextRoom = 'Alaric walks around the bend and enters the next passage.';
const first = crossed.next.dungeons[dungeon].run.floors[1].slots[0];
const population = {type:'creature.new',seq:2,ref:first.ref,species:first.species,count:first.count,anchor:first.anchor,
    desc:['one scout carries a knife, another a stone maul'],present:true,band:'SHORT',scene:around};
const further = await branch(crossed.run,more,go({new:'the passage around the bend'},more),nextRoom+' Two goblin lookouts crouch at a crate in this passage.',
    {scene:around,expected:{1:{arrived:true,at:around,with:null,met:null}},deltas:[{seq:1,type:'arrive',at:around,evidence:nextRoom,with:null},population]});
const scouts = further.next.dungeons[dungeon].run.floors[1].slots[0];
assert.equal(crossed.next.scene.at,dungeon+'.l1_s1');
assert.equal(further.next.scene.at,dungeon+'.l1_s2');
assert.deepEqual(scouts.levels,[3,4]);
assert.equal(scouts.entities.length,first.count);
assert.deepEqual(further.next.scene.present.filter(id => id !== 'pc').sort(),[...scouts.entities].sort());
assert.equal(further.events.filter(e => e.t === 'dungeon.slot').length,1);
assert.match(current.threads['thread.t16.2'].text,/crooked knife.*stone maul/);
const attack = 'I cast Flame Lance at the goblin with the knife.';
const visible = current.dungeons[dungeon].run.floors[1].slots[0].entities;
assert.deepEqual(scouts.entities,visible);
assert.match(current.entities[visible[0]].descriptors.join(' '),/crooked knife/);
assert(!away.next.scene.present.includes(visible[0]));
const targeted = await branch(chat,attack,[{seq:1,type:'use_skill',skill:'mage.flame_lance',target:visible[0],quote:attack}]);
const strike = targeted.next.last.outcome.records.find(r=>r.target===visible[0]);
assert(strike.strikes[0].hp_after < strike.strikes[0].hp_before && strike.cost.before > strike.cost.after);
assert.equal(statusOf(targeted.next,visible[0]),'dead');
const afterKill = await branch(targeted.run,enter,go(dungeon,enter),entry,{scene:room,expected:{1:{arrived:true,at:room,with:null,met:null}},deltas:[{seq:1,type:'arrive',at:room,evidence:entry,with:null}]});
const survivors = await branch(afterKill.run,more,go({new:'the passage around the bend'},more),nextRoom,
    {scene:around,expected:{1:{arrived:true,at:around,with:null,met:null}},deltas:[{seq:1,type:'arrive',at:around,evidence:nextRoom,with:null}]});
assert.deepEqual(survivors.next.dungeons[dungeon].run.floors[1].slots[0].entities,visible);
assert.equal(survivors.next.entities[visible[1]].level,4);
assert.equal(statusOf(survivors.next,visible[0]),'dead');
assert(!survivors.events.some(e=>['entity.created','coin.changed','xp.gained'].includes(e.t)));
const shield = await branch(chat,'I watch the lookout.',[],'The lookout ducks behind a thick stone pillar.',
    {scene:outside,expected:{},deltas:[{seq:1,type:'position',who:visible[0],band:'SHORT',cover:'full',scope:null,cluster:null,evidence:'The lookout ducks behind a thick stone pillar'}]});
assert.equal(shield.next.scene.positions[visible[0]].cover,'full');
const blocked = await branch(shield.run,attack,[{seq:1,type:'use_skill',skill:'mage.flame_lance',target:visible[0],quote:attack}]);
assert(!blocked.next.last.outcome.records?.some(r=>r.strikes?.length));
assert.equal(statusOf(blocked.next,visible[0]),'alive');
assert.deepEqual(host.foldChat(JSON.parse(JSON.stringify(targeted.run))).state,targeted.next);
assert.deepEqual(host.foldChat(targeted.run.slice(0,chat.length)).state,current);
assert(!host.foldChat(chat.slice(0,38)).state.entities[visible[0]]);
assert.equal(targeted.next.scene.at,outside);
const hide = 'I sneak up to the slab under the lookout.';
const sneak = 'Alaric crouches behind the slab at the foot of the hill.';
const close = await branch(chat.slice(0,29),hide,go({scene:'the slab'},hide,{manner:{kind:'stealth',scope:'action'}}),sneak,
    {scene:'here',expected:{1:{standpoint:sneak}},deltas:[]});
assert(close.events.some(e=>e.t==='check.recorded'),JSON.stringify(close.events));
// A bad global attribution cannot invalidate separately grounded observations at the observer's real site.
const mixed = await branch(chat,withdraw,go({scene:'the slab'},withdraw),movement+' A pale light shines out through the crack.',
    {scene:room,expected:{1:{standpoint:null}},deltas:[
        {seq:1,type:'arrive',at:room,evidence:'A pale light shines out through the crack.',with:null},
        {seq:2,type:'thread',id:null,kind:'sign',status:'open',who:[],scene:outside,text:'A pale light shines through the crack.'}]});
assert.equal(mixed.next.scene.at,outside);
assert(mixed.events.some(e=>e.t==='thread.set') && mixed.events.some(e=>e.t==='delta.rejected'));
console.log('Separate continuations: listening, backing away, Dungeon entry, target check, opposed local stealth, independent observation.');

const hall = 'loc.ashbridge.guild_hall', clerk = 'npc.npcguild_clerk';
let returning = structuredClone(chat);
for (const text of ['I listen to the wind.','I check the sky.','I brush dust from my sleeve.',
    'I study the leaves by my boots.','I stretch my fingers.','I adjust my cloak.']) {
    const turn = await branch(returning,text,[],'The wind stirs the grass along the path.',
        {scene:'here',expected:{},deltas:[]});
    returning = turn.run;
}
const back = "I head back along the quarry road to the Adventurers' Guild hall in Ashbridge.";
const arrived = 'Alaric follows the quarry road to Ashbridge and arrives in the Guild hall.';
const seen = 'The familiar thin Guild Clerk with ink-stained fingers and low spectacles is at the counter in front of him.';
const guild = await branch(returning,back,go(hall,back),arrived+' '+seen,{scene:hall,expected:{1:{arrived:true,at:hall,with:null,met:null}},
    deltas:[{seq:1,type:'arrive',at:hall,evidence:arrived,with:null},{seq:2,type:'enter',who:clerk,evidence:seen,scene:hall}]});
assert.equal(guild.next.scene.at,hall);
assert(guild.next.scene.present.includes(clerk));
const casual = await branch(guild.run,'I greet the clerk and ask what is new in town.',[],'The clerk sets down her quill.',{scene:hall,expected:{},deltas:[]});
assert.match(casual.step.context.text,/if your information is true/);
assert.match(casual.step.context.text,/Wenna banned him two years back/);
assert.deepEqual(casual.next.knowledge[clerk],current.knowledge[clerk]);
const told = await branch(casual.run,"I tell the clerk that Dammar warned me about the lookout, which I saw.",[],
    'Alaric tells the clerk that Dammar warned him about the lookout and that he saw it himself. The clerk listens.',
    {scene:hall,expected:{},deltas:[{seq:1,type:'learn',who:clerk,s:'npc.dammar',p:'reported',o:'warned Alaric about the lookout he later saw',how:'told'}]});
assert.notDeepEqual(told.next.knowledge[clerk],casual.next.knowledge[clerk]);
assert.equal(told.next.threads['thread.t10.1'].status,'open');
assert.equal(told.next.threads['thread.t15.1'].status,'open');
if (process.argv[4]) fs.writeFileSync(process.argv[4],JSON.stringify(guild.run));
console.log('Turn 24: private terms delivered at Guild hall; later explicit disclosure reaches clerk separately.');

const road = 'realm.duskreach.old_quarry_track_east_of_ashbridge';
const seek = 'I head back to the old quarry track.';
const arrivedRoad = 'Alaric follows the road east and reaches the old quarry track.';
const familiar = 'Dammar, the familiar fisherman with his reed creel, is sitting on the bank in front of Alaric.';
const reunited = await branch(casual.run,seek,go(road,seek),arrivedRoad+' '+familiar,
    {scene:road,expected:{1:{arrived:true,at:road,with:null,met:null}},deltas:[
        {seq:1,type:'arrive',at:road,evidence:arrivedRoad,with:null},
        {seq:2,type:'enter',who:'npc.dammar',evidence:familiar,scene:road}]});
assert(reunited.next.scene.present.includes('npc.dammar'));
const chatAgain = await branch(reunited.run,'I greet the fisherman.',[]);
assert.match(chatAgain.step.context.text,/Wenna banned him/);
assert.match(chatAgain.step.context.text,/strider/i);
const offsite = 'I leave the hall and return to the verge.';
const verge = 'loc.ashbridge.verge', walk = 'Alaric leaves the hall and walks back to the verge of Ashbridge.';
const out = await branch(casual.run,offsite,go(verge,offsite),walk,{scene:verge,expected:{1:{arrived:true,at:verge,with:null,met:null}},
    deltas:[{seq:1,type:'arrive',at:verge,evidence:walk,with:null}]});
assert.equal(out.next.scene.at,verge);
const ordinary = await branch(out.run,'I straighten my collar.',[]);
assert(!ordinary.step.context.sections.some(s=>s.name==='private_recall'));
const scouting = await branch(chat,'I study the hill.',[]);
assert.match(scouting.step.context.text,/sinkhole/i);
const two = 'I walk to the slab and then approach the doorway.';
const pair = await branch(chat,two,[...go({scene:'the slab'},'I walk to the slab'),
    {seq:2,type:'go',to:{scene:'the doorway'},quote:'then approach the doorway'}],
    entry.replace('steps through the doorway and enters the first tunnel of the Mossback Warrens','reaches the outside of the doorway'),
    {scene:'here',expected:{2:{standpoint:'Alaric reaches the outside of the doorway'}},deltas:[]});
assert.equal(pair.next.scene.at,outside);
assert.equal(pair.next.scene.focus,'Alaric reaches the outside of the doorway');
console.log('Reunion retrieves prior encounter and Wenna, unrelated stop has no private recall; two local approaches share one final standpoint.');

const revised = JSON.parse(JSON.stringify(chat));
assert.deepEqual(host.foldChat(revised).state,current);
revised[38].mes = 'Alaric pauses in the shadow. He hears nothing more.';
runtime.onEditedV4(revised,38,content);
assert.equal(runtime.pendingExtraction(revised),38);
assert.equal(host.foldChat(revised).state.scene.focus,host.foldChat(chat.slice(0,37)).state.scene.focus);
await runtime.runExtraction(revised,38,content,async()=>JSON.stringify({scene:'here',expected:{1:{standpoint:null}},deltas:[]}));
assert(!host.foldChat(revised).state.threads['thread.t16.1']);
revised[38].mes = chat[38].mes;
runtime.onEditedV4(revised,38,content);
assert.deepEqual(host.foldChat(revised).state,current);
console.log('Reload and revision restore the original standpoint and hearsay once.');

for (const words of ['Is anyone here looking for company?', 'I glance around the room for someone on their own.']) {
    const social = await branch(chat.slice(0,15),words,[],'Everyone at the tables is already in company.',
        {scene:'here',expected:{},deltas:[]});
    const inputEvents = host.rec(social.run.at(-2)).events;
    assert(inputEvents.some(e=>e.t==='pulse.rolled') && !inputEvents.some(e=>e.t==='check.recorded'));
    assert(!social.next.party && !social.events.some(e=>e.t==='entity.created'));
}
