import test from 'node:test';import assert from 'node:assert/strict';
import {Journal,copy,digest,fault} from './journal.mjs';import {Scheduler} from './scheduler.mjs';
import {ST119Mock,HeldPublication} from './host.mjs';import {Prototype} from './orchestrator.mjs';
import {fixtures,forestOriginal} from './fixtures.mjs';import {harness,semantic} from './harness.mjs';
import {foldChat,rec,route,prepare,validateJoint,linked} from './engine.mjs';
const cases=fixtures(), fixture=name=>copy(cases.find(f=>f.name===name));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {resolve,reject,promise};};
const state=j=>semantic(foldChat(j.read().world.chat).state);
const messages=[{role:'system',content:'entire request'}];

for(const f of cases) test(`${f.name}: B/C1 same core, idempotent publication, full prompts measured`,async()=>{
    const results=[];
    for(const variant of ['B','C1']) {
        const h=harness(f,variant);await h.prototype.run('t1',f,h.transport);
        const db=h.journal.read();assert.equal(db.turns.t1.phase,'published');assert.equal(db.world.revision,1);assert.equal(h.host.dom.size,1);
        assert.ok(db.requests.every(r=>r.promptChars===r.messages.reduce((n,m)=>n+m.content.length,0)&&r.occupancy<=4));
        assert.ok(!db.requests.some(r=>variant==='C1'&&r.phase==='extract'));
        assert.equal(db.requests.filter(r=>r.phase==='plan').length,f.name==='known_move'?0:1);
        const before=state(h.journal),count=db.requests.length;
        await h.prototype.run('t1',f,()=>{throw Error('retry must not call model');});
        for(const mode of ['regenerate','swipe'])await h.publication.resume('t1',mode);
        h.host.reload();await h.publication.resume('t1');
        assert.deepEqual(state(h.journal),before);assert.equal(h.journal.read().requests.length,count);assert.equal(h.host.dom.size,1);
        if(f.name==='bound_trade') {
            const coins=db.turns.t1.prepared.chat.at(-1).extra.avereth.events.filter(e=>e.t==='coin.changed'&&e.d.id==='pc');
            assert.equal(coins.length,1);assert.equal(coins[0].d.delta,65);
        }
        if(['npc_promise','new_person'].includes(f.name))assert.ok(Object.values(before.threads).some(t=>t.kind==='promise'&&t.who.includes('pc')));
        if(f.name==='npc_personality')assert.ok(Object.values(before.facts).some(x=>x.s==='npc.wat'&&x.p==='voice'&&!x.until));
        if(f.name==='npc_return')assert.ok(before.scene.present.includes('npc.wat'));
        if(f.name==='new_person')assert.ok(Object.values(before.entities).some(x=>x.name==='Mira'));
        if(f.name==='pulse_information')assert.ok(Object.values(before.threads).some(x=>/gold/i.test(x.text)));
        results.push(before);
    }
    assert.deepEqual(results[0],results[1]);
});

test('router recognizes full exact known intent only; ambiguous, negated, unknown and compound fall back',()=>{
    const s=foldChat(fixture('known_move').base).state;
    assert.ok(route('I go to Alderwatch.',s));
    for(const text of ['I go to the forest.','I do not go to Alderwatch.','I go to Alderwatch and buy a sword.','If it is safe, I go to Alderwatch.',
        'He says "I go to Alderwatch."','I go there.',"I go to Adventurers' Guild hall.",'Ich gehe nach Alderwatch.','I go to Alderwatch. Then I wait.'])assert.equal(route(text,s),null,text);
    s.encounter={};assert.equal(route('I go to Alderwatch.',s),null);
});

test('scheduler weight2+2, capacity blocks4, persistent unknown lease and late answer never reused',async()=>{
    const h=harness(fixture('known_move'),'B'), a=deferred(),b=deferred();
    const p=h.scheduler.request('a',messages,()=>a.promise,{weight:2}),q=h.scheduler.request('b',messages,()=>b.promise,{weight:2});
    assert.equal(h.scheduler.occupancy(),4);
    await assert.rejects(h.scheduler.request('c',messages,()=>{throw Error('must not dispatch');}),/capacity/);
    h.scheduler.abort('a:attempt:1');assert.equal(h.scheduler.occupancy(),4);
    const recovered=new Scheduler(new Journal(h.journal.file));recovered.recoverAfterCrash();assert.equal(recovered.occupancy(),4);
    a.resolve('late');b.resolve('late');await assert.rejects(p,/late/);await assert.rejects(q,/late/);
    assert.equal(recovered.occupancy(),0);
    assert.ok(Object.values(h.journal.read().leases).every(l=>!Object.hasOwn(l,'response')));
});

test('bounded attempts, persistent backoff and explicit remote release; no uncontrolled retry loop',async()=>{
    const h=harness(fixture('known_move'),'B');const fail=()=>{throw Object.assign(Error('429 concurrency'),{remoteFinished:true});};
    await assert.rejects(h.scheduler.request('x',messages,fail),/429/);
    await assert.rejects(h.scheduler.request('x',messages,fail),/backoff/);h.advance(11);
    await assert.rejects(h.scheduler.request('x',messages,fail),/429/);h.advance(11);
    await assert.rejects(h.scheduler.request('x',messages,fail),/attempt limit/);
    assert.equal(h.journal.read().requests.length,2);
});

test('forest original timeout: draft hidden, 4 units retained, follow-up blocked; resume only world phase after ACK',async()=>{
    const f=fixture('forest200'),h=harness(f,'B');const originalState=state(h.journal);
    assert.equal(forestOriginal.chat[6].extra.avereth.extraction.llm[0].error_kind,'timeout');
    assert.equal(forestOriginal.chat[7].extra.avereth.perf.wait_ms,29225);
    await assert.rejects(h.prototype.run('t1',f,async req=>{if(req.phase==='extract')throw Error('simulated 120967 ms timeout: remote status unknown');return h.transport(req);}),/timeout/);
    assert.equal(h.host.dom.size,0);assert.deepEqual(state(h.journal),originalState);assert.equal(h.scheduler.occupancy(),4);
    const count=h.journal.read().requests.length;
    const f2={...f,input:'I go deeper into the forest.'};h.prototype.begin('t2',f2,'B');
    await assert.rejects(h.prototype.run('t2',f2,h.transport),/preparation/);
    assert.equal(h.journal.read().requests.length,count);
    await assert.rejects(h.prototype.run('t1',f,h.transport),/capacity|backoff/);
    h.scheduler.remoteComplete('t1:extract:attempt:1');h.advance(11);
    await h.prototype.run('t1',f,h.transport);
    assert.equal(h.journal.read().requests.length,4);assert.equal(h.host.dom.size,1);assert.equal(h.journal.read().world.revision,1);
    assert.notEqual(state(h.journal).scene.at,originalState.scene.at);
});

const points=['after_response','after_prepare','before_commit','save_during','save_after','after_commit','host_save','after_host_save','after_display'];
for(const variant of ['B','C1'])for(const name of ['bound_trade','npc_promise'])for(const point of points)
 test(`${variant}/${name}: crash ${point}, durable resume preserves money XP loot RNG promises`,async()=>{
    const f=fixture(name), reference=harness(f,variant);await reference.prototype.run('t1',f,reference.transport);const expected=state(reference.journal);
    const h=harness(f,variant);let fired=false;
    const hook=where=>{
        if(fired)return;
        if(point==='save_during'&&where==='before_commit'){fired=true;h.journal.fail='during';}
        else if(point==='save_after'&&where==='before_commit'){fired=true;h.journal.fail='after';}
        else if(point==='host_save'&&where==='after_commit'){fired=true;h.host.saveMode='silent';}
        else if(point===where){fired=true;throw Error(`crash ${point}`);}
    };
    await assert.rejects(h.prototype.run('t1',f,h.transport,{hook}));assert.ok(fired);
    if(!['after_display'].includes(point))assert.equal(h.host.dom.size,0);
    // Reconstruct every coordinator object from disk, not merely retry the same closure.
    const j=new Journal(h.journal.file),scheduler=new Scheduler(j),host=new ST119Mock(h.host.store.file);
    host.reload();const pub=new HeldPublication(j,host),p=new Prototype(j,scheduler,pub);
    await p.run('t1',f,h.transport);
    assert.deepEqual(state(j),expected);assert.equal(j.read().world.revision,1);assert.equal(host.dom.size,1);
    const keys=j.read().requests.map(x=>x.key);assert.equal(new Set(keys).size,keys.length,'received phases not redispatched');
 });

test('pre-response transport failure has no mechanical booking; resume with one bounded attempt',async()=>{
    const f=fixture('forest200'),h=harness(f,'B');const before=state(h.journal);
    await assert.rejects(h.prototype.run('t1',f,()=>{throw Object.assign(Error('before model answer'),{remoteFinished:true});}),/preparation/);
    assert.deepEqual(state(h.journal),before);assert.equal(h.host.dom.size,0);h.advance(11);
    await h.prototype.run('t1',f,h.transport);assert.equal(h.journal.read().requests.filter(x=>x.phase==='plan').length,2);
});

test('response saved but receipt ACK lost: recovery uses receipt, no second dispatch',async()=>{
    const h=harness(fixture('known_move'),'B');let calls=0;
    await assert.rejects(h.scheduler.request('x',messages,()=>{calls++;h.journal.fail='after';return 'answer';}),/acknowledgement/);
    const scheduler=new Scheduler(new Journal(h.journal.file));assert.equal(await scheduler.request('x',messages,()=>{calls++;return 'wrong';}),'answer');assert.equal(calls,1);
});

test('C1 rejects broken text links and partial invalid world, correction counts as real additional request',async()=>{
    const f=fixture('new_person'),h=harness(f,'C1');const invalid=copy(f.joint);invalid.links[0].quote='not in the story';
    await h.prototype.run('t1',f,req=>req.phase==='joint'?JSON.stringify(invalid):h.transport(req));
    assert.deepEqual(h.journal.read().requests.map(x=>x.phase),['plan','joint','joint_correction']);assert.equal(h.host.dom.size,1);
    const f2=fixture('new_person'),h2=harness(f2,'C1');const bad=copy(f2.joint);bad.world.deltas.push({seq:99,type:'coin.gift',from:'mira',cp:999,why:'magic'});Object.assign(bad,linked(bad.narration,bad.world));
    await assert.rejects(h2.prototype.run('t1',f2,req=>req.phase.startsWith('joint')?JSON.stringify(bad):h2.transport(req)),/schema|rejected/);
    assert.equal(h2.host.dom.size,0);assert.equal(h2.journal.read().world.revision,0);assert.ok(!Object.values(state(h2.journal).entities).some(x=>x.name==='Mira'));
    assert.equal(h2.journal.read().requests.filter(x=>x.phase==='joint_correction').length,1);
});

test('COUNTEREXAMPLES (not acceptance): valid C1 arrival contradiction and omitted promise pass current semantic guards',async()=>{
    const f=fixture('known_move'),h=harness(f,'C1');const no='Alaric did not go to Alderwatch. He stayed at the roadside verge.';
    await h.prototype.run('t1',f,req=>req.phase.startsWith('joint')?JSON.stringify(linked(no,f.world)):h.transport(req));
    assert.equal(state(h.journal).scene.at,'loc.alderwatch');
    assert.ok([...h.host.dom.values()][0].includes('did not go to Alderwatch'), 'demonstrated contradiction: C1 semantic acceptance gate NOT met');
    const g=fixture('npc_promise');const p=await prepare(g.base,g.input,async()=>g.plans[0]);
    const forgotten={...g.world,deltas:[]};
    const accepted=validateJoint(p.chat,linked(g.narration,forgotten));
    const s=foldChat(accepted).state;
    assert.ok(!Object.values(s.threads).some(t=>t.text==='Wat promised Alaric to show him the old ford tomorrow'), 'counterexample: linked valid JSON does NOT ensure complete world interpretation');
});

for(const action of ['stop','switch'])test(`host ${action} during request: stale answer cannot commit/display; remote capacity retained until finish`,async()=>{
    const f=fixture('known_move'),h=harness(f,'B'),d=deferred();const pending=h.prototype.run('t1',f,()=>d.promise);
    // local route is async; let it reach the first physical request
    for(let i=0;i<30&&!h.journal.read().requests.length;i++)await new Promise(r=>setImmediate(r));
    assert.equal(h.scheduler.occupancy(),4);
    if(action==='stop')h.host.stop();else h.host.switchChat('elsewhere');
    assert.equal(h.scheduler.occupancy(),4);d.resolve(f.narration);
    await assert.rejects(pending,/late|stale/);assert.equal(h.journal.read().world.revision,0);assert.equal(h.host.dom.size,0);
});

test('revision conflict prevents competing commit and older publication rollback',async()=>{
    const f=fixture('known_move'),h=harness(f,'B');h.prototype.begin('t2',f,'B');
    await h.prototype.run('t1',f,h.transport);
    await assert.rejects(h.prototype.run('t2',f,h.transport),/revision conflict/);
    assert.equal(h.journal.read().world.revision,1);
    h.journal.update(db=>{db.world.revision=2;});await assert.rejects(h.publication.resume('t1'),/revision conflict/);
    assert.equal(h.host.dom.size,1);
});

for(const variant of ['B','C1'])test(`ST1.19 ${variant}: stock stream already visible; held stream saves before render`,async()=>{
    const f=fixture('known_move'),h=harness(f,variant);await h.host.stockGenerate('Alaric is in the forest.',{stream:true});
    assert.equal(h.host.log[0],'stream-visible-before-received');assert.equal(h.journal.read().world.revision,0);
    h.host.dom.clear();h.host.chat=[];
    const streaming=async req=>{if(!['narrator','joint'].includes(req.phase))return h.transport(req);const raw=req.phase==='joint'?JSON.stringify(f.joint):f.narration;let buffered='';for(const chunk of [raw.slice(0,10),raw.slice(10)]){buffered+=chunk;assert.equal(h.host.dom.size,0);}return buffered;};
    await h.prototype.run('t1',f,streaming);assert.equal(h.host.dom.size,1);assert.equal(h.journal.read().world.revision,1);
    assert.ok(h.host.readChat().at(-1).extra.prototypeCommit);
});

test('known exact routing versus actual planner request: same mechanics, exactly one physical call saved',async()=>{
    const f=fixture('known_move'),a=harness(f,'B'),b=harness(f,'B');
    await a.prototype.run('t1',f,a.transport);await b.prototype.run('t1',f,b.transport,{fast:false});
    assert.deepEqual(state(a.journal),state(b.journal));
    assert.equal(a.journal.read().requests.length,2);assert.equal(b.journal.read().requests.length,3);
});
for(const action of ['stop','switch'])test(`host ${action} after confirmed save prevents stale display and reload recovers once`,async()=>{
    const f=fixture('known_move'),h=harness(f,'B');
    await assert.rejects(h.prototype.run('t1',f,h.transport,{hook:where=>{if(where==='after_host_save'){if(action==='stop')h.host.stop();else h.host.switchChat('elsewhere');}}}),/changed/);
    assert.equal(h.host.dom.size,0);assert.equal(h.journal.read().world.revision,1);
    h.host.switchChat('fixture');h.host.reload();await h.publication.resume('t1');assert.equal(h.host.dom.size,1);
});

test('pending alternative swipe is explicitly refused, not a hidden reroll or early display',async()=>{
    const h=harness(fixture('known_move'),'B');await assert.rejects(h.publication.resume('t1','swipe'),/not committed/);
    assert.equal(h.host.dom.size,0);assert.equal(h.journal.read().world.revision,0);
});
