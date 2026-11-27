// Offline product replay. Pass the User16 run directory from main, then optional output chat path.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {engineAt} from './replay.mjs';
import {statusOf} from '../../src/knowledge.js';
import {actionPrefix} from '../../src/action_input.js';

const [archive, output] = process.argv.slice(2);
const {host, runtime, content} = await engineAt(resolve(import.meta.dirname, '../..'));
const original = fs.readFileSync(resolve(archive, 'originals/chat.jsonl'), 'utf8').trim().split('\n').slice(1).map(JSON.parse);
const answers = JSON.parse(execFileSync('python3', [resolve(archive, 'pruefung/st_antworten.py')], {encoding:'utf8'}));
const chat = structuredClone(original);
const state = () => host.foldChat(chat).state;
const events = i => host.rec(chat[i]).events;
const anchored = (d, at) => ({...d, scene:at});

function adapted(i, raw, at) {
    if (i === 15) return {commands:[]};
    if (i === 35 || i === 37) {
        const go = raw.commands[0];
        return {commands:[{...go, to:{scene:i === 35 ? 'the other voices' : 'the goblins'}}]};
    }
    if (i === 36 || i === 38) {
        const standpoint = i === 36 ? "worked his way along the hill's flank toward the burnt doorway and the voices above it" :
            "Alaric crossed the last stretch in a crouch, from slab shadow to the blackened jamb of the doorway";
        const observations = raw.deltas.filter(d => d.type === 'thread' && (i === 36 || !d.id));
        if (i === 38) observations[0].text = 'Alaric overheard two goblins speaking of a rusted chain, Tolmag and new arrivals. The captive itself was out of sight.';
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
        assert(!next.encounter && !next.scene.present.some(id=>id.includes('goblin') && statusOf(next,id) !== 'dead'));
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
    const step = await runtime.prepareGenerationAsync(run,content,{llm:respond('plan',{commands})});
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
    return {next,events:host.rec(run.at(-1)).events,step};
}
const outside = state().scene.at;
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
const attack = 'I cast Flame Lance at the goblin with the knife.';
const shot = await branch(chat,attack,[{seq:1,type:'use_skill',skill:'mage.flame_lance',target:{new:'goblin with the knife'},quote:attack}]);
assert(!shot.next.encounter && shot.next.scene.at===outside);
assert(!shot.events.some(e=>e.t==='combat.attack' || e.t==='vitals.changed'));
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
