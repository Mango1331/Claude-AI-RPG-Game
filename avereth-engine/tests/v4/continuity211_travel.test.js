import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';
import { travelFrame } from '../../src/v4/travel_continuation.js';
import { parseExtraction, worldVocab } from '../../src/v4/extract.js';

const content = await loadProductContent();
const { b3, b19 } = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/continuity211_travel.json.gz', import.meta.url))));
const rise = 'loc.rise_above_the_main_track';
const dann = 'npc.dann';
const lane = b19.start.scene.at;
const choice = "would you mind walking me to the main track when I'm done";
const frame = { choice, to:'main track', with:dann, after:'the bowl' };
const evidence = 'leaving Alaric at the rise with the road below him';
const fulfilled = 'When the bowl was drained she took it';

function play(start, turn) {
    let p;
    if (turn.playerEvents && turn.input === (turn.i === b3.turn.i ? b3.turn : b19.turn).input) {
        const state = structuredClone(start);
        for (const event of turn.playerEvents) applyEvent(state,event);
        p = { state };
    } else {
        p = playerTurnV4(start, content, turn.input, { c:true, commands:turn.commands, msg:turn.i });
    }
    if (turn.frame != null) p.state.last.outcome.auth.continuation = travelFrame(turn.frame,turn.input,start.scene.present);
    const x = replyTurnV4(p.state, content, turn.report, { msg:turn.i + 1, prose:turn.prose });
    return { p, x, state:x.state };
}
function social(change = () => {}) {
    const turn = structuredClone(b3.turn);
    const d = turn.report.deltas.find(d => d.type === 'arrive');
    turn.frame = {...frame};
    d.evidence = evidence;
    d.after = fulfilled;
    change(turn, d);
    return play(b3.start, turn);
}

test('B3: actual P + N and evidence on the existing X arrival recover the meeting, memory and departure', () => {
    const { p, x, state } = social();
    assert.equal(p.state.last.outcome.auth.go, null);
    assert.equal(state.scene.at, rise);
    assert.equal(state.scene.present.includes(dann), false);
    assert.ok(x.events.some(e => e.t === 'memory.recorded' && e.d.memory.who.includes(dann) && /shook/i.test(e.d.memory.text)));
    assert.ok(!x.events.some(e => e.t === 'delta.rejected' && ['no_go','scene_context'].includes(e.d.rule)));
});

test('B19/20 original P/N/X: a local interruption stays at the lane, then the tollman can identify himself before the trip resumes', () => {
    const { p, x, state } = play(b19.start,b19.turn);
    assert.equal(p.state.last.outcome.auth.gos[0].mode, 'local');
    assert.equal(p.state.last.outcome.auth.pulse.open, true);
    assert.equal(state.scene.at,lane);
    assert.equal(x.events.some(e => e.t === 'scene.moved'),false);
    const tollman = state.scene.present.find(id => state.entities[id]?.descriptors?.some(t=>/apron/i.test(t)));
    assert.ok(tollman);
    const next = play(state,b19.next);
    assert.equal(next.state.entities[tollman].name,'Doss');
    assert.equal(next.state.scene.at,'loc.ashbridge.mother_wrens_house');
    assert.equal(next.state.entities[tollman].at,lane);
    assert.ok(!next.x.events.some(e => e.t === 'delta.rejected' && e.d.rule === 'scene_context'));
});

test('B3 archived X without quotes cannot by itself establish that the meal finished', () => {
    const { state,x } = play(b3.start,b3.turn);
    assert.equal(state.scene.at,b3.start.scene.at);
    assert.deepEqual(x.events.filter(e=>e.t==='delta.rejected').map(e=>e.d.rule),['no_go','scene_context','scene_context']);
});

const socialNegatives = {
    'stale choice from another input': t => { t.input = 'Dann, which way is the main track?'; },
    'explicit stay even after a proposal': t => { t.input += ' No, I stay in the kitchen.'; t.frame='stay'; },
    'asking only': t => { t.input += ' I am only asking.'; t.frame='stay'; },
    'later': t => { t.input += ' Another time, actually.'; t.frame='stay'; },
    'explicit veto after a valid quoted request overrides a mistaken positive P': t => { t.input+=' I stay here.'; },
    'explicit veto after a valid quoted request (negative verb)': t => { t.input+=" I don't go."; },
    'mere NPC invitation, no choice': t => { t.input = 'I finish my meal.'; delete t.frame; },
    'direction question': t => { t.input='How do I reach the main track?'; delete t.frame; },
    'NPC declines instead of joining': t => { t.prose='Dann declined to leave his family. Alaric remained at the table.'; },
    'only a future location in dialogue': (t,d) => { t.prose='Dann said: "Alaric will reach the rise with me."'; d.evidence='Alaric will reach the rise with me'; },
    'claimed condition never happened': (t,d) => { d.after = null; },
    'real earlier event about a different subject': (t,d) => { d.after='Lia hovered at the table'; },
    'wrong scene cited as arrival': (t,d) => { d.evidence='Lia hovered at the table while Alaric ate'; },
    'condition evidenced after departure': (t,d) => { t.prose += ' The bowl was drained at dusk.'; d.after = 'The bowl was drained at dusk'; },
    'NPC moves alone': (t,d) => { t.prose += ' Dann reached the rise alone. Alaric stayed behind.'; d.evidence='Dann reached the rise alone'; },
    'different companion': (t,d) => { d.with=['npc.lia_halloran']; },
    'different destination': (t,d) => { d.at.new.name='high ridge by the marsh'; },
    'no forged involuntary relocation': (t,d) => { d.forced_by='Dann imagined Alaric at the rise'; },
    'additional arrival': (t,d) => { t.report.deltas.push({...d,seq:10}); },
};
for (const [label,change] of Object.entries(socialNegatives)) test('B3 travel boundary: '+label, () => {
    const {state,x} = social(change);
    assert.equal(state.scene.at,b3.start.scene.at);
    assert.ok(x.events.some(e=>e.t==='delta.rejected' && ['no_go','passage'].includes(e.d.rule)));
});

test('same unmodified arrive protocol, local room reached without a positive P marker, including non-English actions', () => {
    const room = {new:{name:'storeroom',kind:'interior',parent:b3.start.scene.at}};
    for (const input of ["I'm right behind you.",'Ich schließe mich an.']) {
        const turn={input,frame:'local',commands:[],i:23,prose:'Alaric and Dann stood together in the storeroom.',
            report:{scene:room,expected:{},deltas:[{seq:1,type:'arrive',at:room,with:[dann],forced_by:null}]}};
        assert.notEqual(play(b3.start,turn).state.scene.at,b3.start.scene.at);
        // A guide's solitary arrival or a place described only in dialogue leaves the PC here.
        for (const prose of ['Dann reached the storeroom alone. Alaric stayed at the table.','Dann said, "Alaric could come with me to the storeroom."']) {
            assert.equal(play(b3.start,{...turn,prose}).state.scene.at,b3.start.scene.at);
        }
        assert.equal(play(b3.start,{...turn,frame:'stay'}).state.scene.at,b3.start.scene.at);
        for (const input of ['Where is the storeroom?','I stay here.','I refuse.','Ich bleibe hier.','I just want directions.','I am only asking, without leaving.']) {
            assert.equal(play(b3.start,{...turn,frame:undefined,input}).state.scene.at,b3.start.scene.at);
            if (!input.includes('?')) assert.equal(play(b3.start,{...turn,frame:'local',input}).state.scene.at,b3.start.scene.at);
        }
        assert.equal(play(b3.start,{...turn,prose:'Alaric studied a map of the storeroom.'}).state.scene.at,b3.start.scene.at);
        const otherSite = {new:{name:'storeroom',kind:'site',parent:'realm.duskreach'}};
        assert.equal(play(b3.start,{...turn,report:{scene:otherSite,expected:{},deltas:[{seq:1,type:'arrive',at:otherSite,with:[dann]}]}}).state.scene.at,b3.start.scene.at);
    }
});

test('reconstructed helper 5 T40: an explicit request to be carried establishes an actual ordinary arrival', () => {
    const from = b3.start.scene.at;
    for (const [input, name] of [['Would you carry me to the drying shed bunk?', 'drying shed bunk'], ['Trag mich bitte zur Liege.', 'Liege']]) {
        const room = {new:{name,kind:'interior',parent:from}};
        const turn = {input, frame:'stay', commands:[], i:23, prose:`Dann carried Alaric to the ${name}.`,
            report:{scene:room,expected:{},deltas:[{seq:1,type:'arrive',at:room,with:[dann],forced_by:null}]}};
        const reached = play(b3.start,turn).state;
        assert.equal(reached.places[reached.scene.at].name,name);
        assert.ok(reached.scene.present.includes(dann));
        for (const prose of [`Dann said, "I can carry Alaric to the ${name}."`, `Dann went to the ${name} alone.`])
            assert.equal(play(b3.start,{...turn,prose}).state.scene.at,from);
        assert.equal(play(b3.start,{...turn,input:`${input} I stay here.`}).state.scene.at,from);
        assert.equal(play(b3.start,{...turn,report:{...turn.report,deltas:[{...turn.report.deltas[0],with:['npc.absent']}]}}).state.scene.at,from);
    }
});

test('unusual polite requests including German use the same bounded P intent and original arrival', () => {
    for (const input of ['Could I tag along to the main track?', 'Would you mind showing me the way to the main track in person?', 'Darf ich bis zum main track bei dir bleiben?']) {
        const {state} = social((t,d)=>{t.input=input;t.frame={choice:input,to:'main track',with:dann};delete d.after;});
        assert.equal(state.scene.at,rise);
    }
});

test('a malformed optional evidence property never fails an otherwise valid report', () => {
    const vocab=worldVocab(content.deltaVocab,b3.start);
    const ids={places:Object.keys(b3.start.places),objects:Object.keys(b3.start.objects),quests:Object.keys(b3.start.quests)};
    const report={scene:'here',expected:{},deltas:[{seq:1,type:'arrive',at:b3.start.scene.at,with:null,forced_by:null,evidence:{typo:1}},{seq:2,type:'time',minutes:1}]};
    const parsed=parseExtraction(JSON.stringify(report),vocab,ids,{});
    assert.equal(parsed.valid,true,JSON.stringify(parsed.errors));
    assert.equal(parsed.value.deltas[0].evidence,undefined);
    assert.equal(parsed.value.deltas[1].minutes,1);
});

test('B3 through the host: selected P response, saved authority, X projection, active occurrence and refold', async () => {
    const { prepareGenerationAsync, processReplyAny, extractionRequest, applyExtraction } = await import('../../src/v4/runtime.js');
    const { rec, foldChat } = await import('../../src/host.js');
    const u = b3.turn.i, n=u+1;
    const chat = [...structuredClone(b3.prefix),{is_user:true,mes:b3.turn.input,extra:{}},{is_user:false,mes:b3.turn.prose,extra:{}}];
    const result=await prepareGenerationAsync(chat.slice(0,n),content,{type:'normal',llm:async req=>{
        assert.equal(req.purpose,'plan');
        return JSON.stringify({...b3.planner,travel_frame:frame});
    }});
    assert.deepEqual(rec(chat[u]).plan.travel_frame,frame);
    assert.deepEqual(foldChat(chat,n).state.last.outcome.auth.continuation,frame);
    assert.match(result.context.text,/chosen continuation/);
    assert.equal(processReplyAny(chat,n,content).extract,true);
    const req=extractionRequest(chat,n,content);
    assert.ok(req.messages.some(m=>m.content.includes(choice) && m.content.includes('Chosen possible continuation')));
    const report=structuredClone(b3.turn.report);
    Object.assign(report.deltas.find(d=>d.type==='arrive'),{evidence,after:fulfilled});
    const parsed=parseExtraction(JSON.stringify(report),req.vocab,req.ids,req.expectedKeys,{sceneRequired:true,startScene:req.startScene,state:req.state,content,reply:chat[n].mes});
    assert.equal(parsed.valid,true);
    assert.equal(applyExtraction(chat,n,content,parsed,{hash:req.hash,ms:0,repaired:false,calls:[]}).applied,true);
    assert.equal(foldChat(JSON.parse(JSON.stringify(chat))).state.scene.at,rise);
});

test('a narrated continuation never opens a Living Dungeon, unpaid entry or a locked ordinary room', () => {
    const copy=structuredClone(b3.start);
    const from=copy.scene.at, locked='loc.sealed_side_room';
    copy.places[locked]={id:locked,name:'side room',kind:'interior',parent:from,realm:'realm.duskreach'};
    copy.features.lock={id:'lock',at:from,name:'sealed gate',status:'active'};
    copy.links.l={id:'l',a:from,b:locked,feature:'lock'};
    for (const [to,name] of [[locked,'side room'],['loc.mossback_warrens','Mossback Warrens'],['loc.glimmerdeep_grotto','Glimmerdeep Grotto']]) {
        const input="I'd like company to "+name+'.';
        const turn={i:23,input,commands:[],frame:{choice:input,to:name,with:dann,after:null},prose:'Alaric reached '+name+' with Dann.',
            report:{scene:to,expected:{},deltas:[{seq:1,type:'arrive',at:to,with:[dann]}]}};
        const {state,x}=play(copy,turn);
        assert.equal(state.scene.at,from);
        assert.ok(x.events.some(e=>e.t==='delta.rejected' && e.d.rule==='passage'));
        assert.equal(x.events.some(e=>e.t==='coin.spent'),false);
    }
});

test('an explicit hold until the ferry returns requires the named condition and its actual fulfillment', () => {
    const room={new:{name:'storeroom',kind:'interior',parent:b3.start.scene.at}};
    const input='I stay here until the ferry returns. Then Dann can walk me to the storeroom.';
    const after='The ferry returned to the landing';
    const evidence='Alaric reached the storeroom with Dann';
    const frame={choice:'Dann can walk me to the storeroom',to:'storeroom',with:dann,after:'the ferry'};
    const turn={i:23,commands:[],input,frame,prose:after+'. '+evidence+'.',
        report:{scene:room,expected:{},deltas:[{seq:1,type:'arrive',at:room,with:[dann],after,evidence}]}};
    assert.notEqual(play(b3.start,turn).state.scene.at,b3.start.scene.at);
    for(const alternate of ['local',undefined,{...frame,after:'the storeroom'},{...frame,after:null}])
        assert.equal(play(b3.start,{...turn,frame:alternate}).state.scene.at,b3.start.scene.at);
    assert.equal(play(b3.start,{...turn,prose:'The ferry had not returned to the landing. '+evidence+'.'}).state.scene.at,b3.start.scene.at);
    assert.equal(play(b3.start,{...turn,report:{...turn.report,deltas:[{seq:1,type:'arrive',at:room,with:[dann],evidence}]}}).state.scene.at,b3.start.scene.at);
});
