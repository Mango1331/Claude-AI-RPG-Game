import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {engineAt, normalizeEvent} from '../../tools/replay/replay.mjs';
import {actionPrefix} from '../../src/action_input.js';
import {newPlaceScope} from '../../src/v4/movement.js';

const root = fileURLToPath(new URL('../../',import.meta.url));
const fixture = JSON.parse(gunzipSync(fs.readFileSync(new URL('./location/user17.json.gz',import.meta.url))));
const {host,runtime,content} = await engineAt(root);
const dungeon = 'loc.old_crown_catacombs';
const gateReport = JSON.parse(fixture.answers[18][0].content);
const roadside = 'loc.roadside_west_of_alderwatch';
const estate = {new:{name:'Roadside shrine-chapel by the ford road',kind:'site',parent:'realm.valedorn_crown'}};

test('User16: both sides of the observed doorway, the original scouts, Guild recall and revision',()=>{
    execFileSync(process.execPath,[root+'tools/replay/user16_scene.mjs'],{stdio:'pipe'});
});

async function run(prefix, index, replies, delay = 0) {
    const msg = structuredClone(fixture.messages[index]);
    const saved = host.rec(msg);
    delete msg.extra.avereth;
    const chat = [...prefix,msg];
    if (msg.extra.avereth_action_input) msg.extra.avereth_action_input.base_revision = actionPrefix(chat,index);
    const asked = [];
    const llm = async ({purpose}) => {
        const entry = replies[asked.length];
        asked.push(purpose);
        assert.equal(entry?.purpose,purpose,'unexpected request at M'+index);
        if (delay) await new Promise(resolve=>setTimeout(resolve,delay));
        return entry.content;
    };
    if (saved?.input_hash || saved?.extraction) {
        if (msg.is_user) {
            if (msg.is_system && saved.command) msg.is_system = false;
            await runtime.prepareGenerationAsync(chat,content,{type:'normal',llm});
        } else {
            assert.ok(runtime.processReplyAny(chat,index,content,{}).extract);
            await runtime.runExtraction(chat,index,content,llm);
        }
    }
    assert.ok(asked.length<=replies.length,'unmatched model request at M'+index);
    const folded = host.foldChat(chat);
    assert.deepEqual(folded.errors,[]);
    return {chat,state:folded.state,asked,events:host.rec(msg)?.events || []};
}

test('User17: interrupted journey, the same gate, the closed threshold and actual entry',async()=>{
    let chat = [structuredClone(fixture.messages[0])];
    for (let i=1;i<fixture.messages.length;i++) {
        const replies = [...(fixture.answers[i] || [])];
        // The archived M20 references a phantom parent that a corrected M18 never created.
        // Supply the current contract's repair for the original prose stopping BEFORE the closed door.
        if (i===20) replies.push({purpose:'extract_repair',content:JSON.stringify({
            expected:{1:{arrived:false}},deltas:[{seq:1,type:'arrive',at:dungeon}]
        })});
        const result=await run(chat,i,replies);
        chat=result.chat;
        const {state,events}=result;
        if (i===16) {
            assert.equal(state.scene.at,roadside);
            assert.equal(state.scene.approaching,dungeon);
        }
        if (i===18 || i===20) {
            assert.equal(state.scene.at,dungeon);
            assert(!Object.keys(state.places).some(id=>id.includes('ruined_chapel_above') || id.startsWith(dungeon+'.')));
            assert(!Object.values(state.links || {}).some(l=>l.a.startsWith(dungeon+'.') || l.b.startsWith(dungeon+'.')));
        }
        if (i===18) {
            assert.deepEqual(result.asked,['extract']);
            assert(state.scene.present.includes('npc.ossler'));
            assert(state.entities['npc.ossler']);
            const repeated=await run(JSON.parse(JSON.stringify(chat.slice(0,-1))),i,replies,35);
            assert.deepEqual(repeated.events.map(normalizeEvent),events.map(normalizeEvent));
            assert.deepEqual(repeated.state,state);
            const initialNo = structuredClone(gateReport);
            initialNo.expected[1].arrived = false;
            const alternate = await run(chat.slice(0,-1),i,[{purpose:'extract',content:JSON.stringify(initialNo)}]);
            assert.equal(alternate.state.scene.at,dungeon);
            assert(alternate.state.scene.present.includes('npc.ossler'));
            assert(!alternate.state.dungeons[dungeon].run?.floors?.[1]?.slots?.[0]?.entities?.length);
            assert(!Object.keys(alternate.state.places).some(id=>id.includes('ruined_chapel_above')));
        }
        if (i===22) {
            assert.equal(state.scene.at,dungeon+'.l1_s1');
            assert.equal(state.places[state.scene.at].parent,dungeon);
            assert.equal(state.places[state.scene.at].section,1);
            const first=state.dungeons[dungeon].run.floors[1].slots[0];
            assert(first.entities.length>0 && first.entities.every(id=>state.scene.present.includes(id)));
            assert.equal(JSON.stringify(host.foldChat(JSON.parse(JSON.stringify(chat))).state),JSON.stringify(state));
        }
    }
});

test('P2 and P4b: the reported access connection, not the yes/no receipt or PULSE, identifies the gate',()=>{
    const state=host.foldChat(fixture.messages.slice(0,18)).state;
    const normalize=r=>newPlaceScope(r,state,[],content);
    for(const arrived of [false,true]) for(const open of [false,true]) {
        state.last.outcome.auth.pulse.open=open;
        const r=structuredClone(gateReport);
        r.expected[1].arrived=arrived;
        assert.equal(normalize(r).deltas[0].at,dungeon);
        const elsewhere={expected:r.expected,deltas:[{seq:1,type:'arrive',at:estate}]};
        assert.deepEqual(normalize(elsewhere).deltas[0].at,estate);
    }
    const short=structuredClone(gateReport);
    const arrival=short.deltas.find(d=>d.type==='arrive');
    const npc=short.deltas.find(d=>d.type==='person.new');
    [arrival.at,npc.at]=[npc.at,arrival.at];
    assert.equal(normalize(short).deltas[0].at,dungeon);
    const unrelated=structuredClone(gateReport);
    unrelated.deltas.push({seq:9,type:'enter',who:{new:gateReport.deltas[0].at.new.name}});
    assert.deepEqual(normalize(unrelated).deltas.at(-1).who,unrelated.deltas.at(-1).who);
    state.last.outcome.auth.gos.push({...state.last.outcome.auth.go,seq:2,to:'loc.alderwatch'});
    assert.deepEqual(normalize(gateReport).deltas[0].at,gateReport.deltas[0].at);
});

test('a local stop before crossing and a direct entry from the original roadside use different authorities',async()=>{
    const {resolveCommands}=await import('../../src/v4/commands.js');
    const {applyEvent}=await import('../../src/state.js');
    const {applyWorld}=await import('../../src/v4/world.js');
    function choose(s,text,to) {
        const ctx=resolveCommands(s,content,[{type:'go',seq:1,to,quote:text}],e=>applyEvent(s,e),{c:true,text,msg:17});
        s.last.outcome={kind:'v4',...ctx};
        return ctx;
    }
    function world(s,arrived,at) {
        return applyWorld(s,content,{expected:{1:{arrived}},deltas:[{type:'arrive',seq:1,at}]},{prose:'Alaric reaches the reported stop.'});
    }
    const room={new:{kind:'interior',parent:dungeon,name:'The first burial hall'}};
    const road=host.foldChat(fixture.messages.slice(0,17)).state;
    for (const restriction of ['fee','full','unregistered',null]) {
        const s=structuredClone(road);
        if(restriction==='fee') { s.quests={}; s.dungeons[dungeon].gate.fee_cp=20; }
        if(restriction==='full') s.dungeons[dungeon].capacity=0;
        if(restriction==='unregistered') { s.guild.membership=null; s.dungeons[dungeon].gate.requires='guild'; }
        const c=choose(s,'I enter the dungeon',dungeon);
        const r=world(s,true,room);
        if(restriction) {
            assert(c.auth.go.way_in);
            assert(!Object.keys(r.state.places).some(p=>p.startsWith(dungeon+'.')));
            assert(!r.events.some(e=>['dungeon.part','coin.changed'].includes(e.t)));
        } else {
            assert.equal(r.state.scene.at,dungeon+'.l1_s1');
            assert(r.state.dungeons[dungeon].run.floors[1].slots[0].entities.length);
        }
    }
    const s=structuredClone(road);
    // A known objective can be reached at its access or just inside it, in the same journey.
    choose(s,'I travel to the catacombs',dungeon);
    const sectionId=dungeon+'.l1_s1';
    const physical={expected:{1:{arrived:true}},deltas:[{type:'arrive',seq:1,at:sectionId}]};
    const {parseExtraction}=await import('../../src/v4/extract.js');
    const {extractorCatalog}=await import('../../src/v4/catalog.js');
    const claim=parseExtraction(JSON.stringify(physical),content.deltaVocab,extractorCatalog(s,content),{1:'go'},
        {sceneRequired:true,state:s,content});
    assert.deepEqual(claim.rejected,[]);
    assert.deepEqual(claim.issues,[]);
    for (const barrier of ['unpaid','full']) {
        const blocked=structuredClone(s);
        if (barrier==='unpaid') { blocked.quests={}; blocked.dungeons[dungeon].gate.fee_cp=20; }
        else blocked.dungeons[dungeon].capacity=0;
        const stopped=world(blocked,true,sectionId);
        assert(!stopped.state.places[sectionId]);
        assert(!stopped.events.some(e=>['dungeon.part','coin.changed'].includes(e.t)));
    }
    const entered=world(s,true,sectionId).state;
    assert.equal(entered.scene.at,sectionId);
    assert(entered.dungeons[dungeon].run.floors[1].slots[0].entities.length);
    choose(s,'I go to the catacombs entrance',dungeon);
    const atGate=world(s,true,dungeon).state;
    const local=choose(atGate,'I head down the steps to the door',{scene:'the door'});
    assert(local.auth.approach && !local.auth.gos.length);
    assert.equal(atGate.scene.at,dungeon);
});

test('a different wayside shrine can be a real halt, including after a corrected objective receipt',async()=>{
    const {applyWorld}=await import('../../src/v4/world.js');
    const {parseExtraction}=await import('../../src/v4/extract.js');
    const {extractorCatalog}=await import('../../src/v4/catalog.js');
    const state=host.foldChat(fixture.messages.slice(0,18)).state;
    const prose='Alaric stopped there to drink. The catacombs were still a good way off.';
    for (const open of [false,true]) {
        state.last.outcome.auth.pulse.open=open;
        const ids=extractorCatalog(state,content);
        const answer={expected:{1:{arrived:true}},deltas:[{seq:1,type:'arrive',at:estate,evidence:'Alaric stopped there to drink'}]};
        const check=arrived=>{
            answer.expected[1].arrived=arrived;
            return parseExtraction(JSON.stringify(answer),content.deltaVocab,ids,{1:'go'},
                {sceneRequired:true,state,content,reply:prose,startScene:roadside});
        };
        const wrong=check(true);
        assert(wrong.issues.some(issue=>issue.why.includes('corresponding arrive')));
        const refused=applyWorld(state,content,answer,{prose});
        assert.notEqual(refused.state.scene.at,dungeon);
        assert(!Object.values(refused.state.places).some(p=>p.name===estate.new.name));
        assert.deepEqual(check(false).issues,[]);
        const halt=applyWorld(state,content,answer,{prose}).state;
        assert.equal(halt.places[halt.scene.at].name,estate.new.name);
        assert.equal(halt.places[halt.scene.at].parent,estate.new.parent);
        assert.equal(halt.scene.approaching,dungeon);
        assert(!Object.values(halt.places).some(p=>p.section));
    }
});
