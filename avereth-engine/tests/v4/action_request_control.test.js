import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestControl } from '../../src/v4/request_control.js';
const result = () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'ok' } }] });
const store = () => { const m = new Map(); return { getItem: k => m.get(k), setItem: (k,v) => m.set(k,v) }; };
test('4/4 requests serialize through body completion; physical attempts remain distinct', async () => {
    const gate = createRequestControl(), calls = [];
    let release; const wait = new Promise(r => release = r);
    const a = gate.fetchRequest('p', async () => { calls.push('a'); await wait; return result(); });
    const b = gate.fetchRequest('p', async () => { calls.push('b'); return result(); });
    await new Promise(r => setImmediate(r)); assert.deepEqual(calls, ['a']);
    release(); await Promise.all([a,b]); assert.deepEqual(calls, ['a','b']);
    assert.equal(gate.blocked('p'), false);
});
test('abort after dispatch survives reload, permits only one warned attempt, no automatic retry', async () => {
    const storage = store(), a = createRequestControl({storage});
    await assert.rejects(a.fetchRequest('p', async () => { throw new Error('socket lost'); }));
    const b = createRequestControl({storage}); let calls = 0;
    await assert.rejects(b.fetchRequest('p', async () => { calls++; return result(); }), /unknown/);
    assert.equal(calls, 0); assert.equal(await b.allowOne('p'), true);
    await b.fetchRequest('p', async () => { calls++; return Response.json({error:{message:'Too Many Requests'}}); });
    assert.equal(calls, 1); assert.equal(await b.allowOne('p'), false); assert.equal(b.blocked('p'), true);
});
test('valid length response is terminal; incomplete SSE is not', async () => {
    const gate = createRequestControl();
    await gate.fetchRequest('p', async () => Response.json({choices:[{finish_reason:'length'}]}));
    assert.equal(gate.blocked('p'), false);
    const r = await gate.fetchRequest('p', async () => new Response('data: {"choices":[]}\n\n'), {stream:true});
    await r.text(); await new Promise(r => setImmediate(r));
    assert.equal(gate.blocked('p'), true);
});
test('terminal SSE preserves native streaming bytes', async () => {
    const gate = createRequestControl(); const body = 'data: {"choices":[]}\n\ndata: [DONE]\n\n';
    const r = await gate.fetchRequest('p', async () => new Response(body), {stream:true});
    assert.equal(await r.text(), body); await new Promise(r => setImmediate(r));
    assert.equal(gate.blocked('p'), false);
});
test('cancel before dispatch consumes no remote capacity', async () => {
    const gate = createRequestControl(), ctl = new AbortController(); ctl.abort(); let calls = 0;
    await assert.rejects(gate.fetchRequest('p', async () => { calls++; return result(); }, {signal:ctl.signal}));
    assert.equal(calls, 0); assert.equal(gate.blocked('p'), false);
});
test('an explicit retry cannot steal capacity from a live owner in another tab',async()=>{
 const storage=store(),locks={request:async(_name,_options,fn)=>fn(null)},gate=createRequestControl({storage,locks});
 storage.setItem('avereth.requests.v1:p',JSON.stringify({leases:[{id:'other-tab',status:'active',weight:4}],retryUsed:false}));
 assert.equal(await gate.allowOne('p'),false);assert.equal(gate.inspect('p').leases[0].id,'other-tab');
});

test('physical request provenance retains input revision and distinct bounded attempts without prompts',async()=>{
 const gate=createRequestControl(),meta={origin_chat:'chat',input_id:'hud-one',revision:2,phase:'planner_repair'};
 await gate.fetchRequest('provider',async()=>result(),{meta});
 await gate.fetchRequest('provider',async()=>result(),{meta});
 const [a,b]=gate.inspect('provider').attempts;
 assert.equal(a.input_id,'hud-one');assert.equal(a.revision,2);assert.equal(a.capacity_key,'provider');
 assert.equal(a.attempt,1);assert.equal(b.attempt,2);assert.notEqual(a.request_id,b.request_id);
 assert.equal(b.status,'terminal');assert.equal('messages' in b,false);
});

test('generic ST error and empty choices retain unknown capacity; a definite 400 rejection releases it',async()=>{
 for(const [body,status] of [[{error:true},200],[{error:{message:'upstream unavailable'}},500],[{choices:[]},200]]){
  const gate=createRequestControl();await gate.fetchRequest('p',async()=>Response.json(body,{status}));
  assert.equal(gate.blocked('p'),true);
  await assert.rejects(gate.fetchRequest('p',async()=>result()),/unknown/);
 }
 const gate=createRequestControl();await gate.fetchRequest('p',async()=>Response.json({error:'bad request'},{status:400}));
 assert.equal(gate.blocked('p'),false);
});
