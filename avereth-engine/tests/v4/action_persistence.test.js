import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatPersistence, decodeSave, chatOrigin } from '../../src/v4/action_persistence.js';
function fixture() {
    const c={characters:[{avatar:'a.png',name:'A'}],characterId:0,getCurrentChatId:()=> 'origin',chatMetadata:{integrity:'i',other:{kept:true}},chat:[{mes:'hello',extra:{avereth:{events:[],action_input:{id:'one'}}}}]};
    let saved=[]; const writes=[];
    const request=async(url,opts)=>{ const data=JSON.parse(opts.body); if(url.endsWith('/save')){writes.push(data);saved=data.chat;return Response.json({ok:true});}return Response.json(saved); };
    return {c,writes,adapter:createChatPersistence({request,headers:()=>({}),active:()=>c}),request};
}
test('target-bound save reads back HUD identity, all swipe data and foreign metadata', async()=>{
    const {c,adapter,writes}=fixture(); await adapter.save(c);
    assert.deepEqual(writes[0].chat[0].chat_metadata,c.chatMetadata); assert.equal(writes[0].file_name,'origin');
    c.chat[0].extra.avereth.action_input.id='two';
    await assert.rejects(adapter.verify(chatOrigin(c),[{},...c.chat]),/differs/);
});
test('chat switch before dispatch rejects even when ST reused the same array', async()=>{
    const {c,adapter,writes}=fixture(); const promise=adapter.save(c); c.getCurrentChatId=()=> 'other';
    await assert.rejects(promise,/Stale/); assert.equal(writes.length,0);
});
test('HTTP success without persistence never reports saved', async()=>{
    const {c}=fixture(), status=[];
    const adapter=createChatPersistence({request:async u=>Response.json(u.endsWith('/get')?[{}, {mes:'wrong'}]:{ok:true}),headers:()=>({}),active:()=>c,changed:s=>status.push(s)});
    await assert.rejects(adapter.save(c),/differs/); assert.equal(status.includes('saved'),false);
});
test('actual gzip save payload decodes without discarding other metadata',async()=>{
    const data={avatar_url:'a.png',file_name:'f',chat:[{chat_metadata:{foreign:1}}]};
    const body=await new Response(new Blob([JSON.stringify(data)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    assert.deepEqual(await decodeSave({body,headers:{'Content-Encoding':'gzip'}}),data);
});
test('stop during pre-write read-back cannot dispatch the pending save',async()=>{
 const {c}=fixture();let current=true,writes=0;
 const adapter=createChatPersistence({active:()=>c,headers:()=>({}),request:async url=>{
  if(url.endsWith('/get')){current=false;return Response.json([]);}writes++;return Response.json({ok:true});
 }});
 await assert.rejects(adapter.save(c,()=>current),/Stale/);assert.equal(writes,0);
});
test('a saved later revision cannot be overwritten by an older native compressed snapshot',async()=>{
 const {c,adapter,writes}=fixture(),old={...chatOrigin(c),chat:structuredClone([{chat_metadata:c.chatMetadata},...c.chat])};
 c.chat[0].name='newer persisted name';
 await adapter.save(c);await assert.rejects(adapter.write(old),/Older native/);assert.equal(writes.length,1);
});
test('another writer advancing the remote revision stops before any overwrite',async()=>{
 const {c}=fixture();let writes=0;
 const adapter=createChatPersistence({active:()=>c,headers:()=>({}),request:async url=>{
  if(url.endsWith('/save'))writes++;return Response.json([{chat_metadata:{avereth_save_revision:9}}]);
 }});
 await assert.rejects(adapter.save(c),/Another writer/);assert.equal(writes,0);
});
test('a reservation added during the prior read cannot be overwritten by older metadata',async()=>{
 const {c}=fixture();let writes=0;
 const adapter=createChatPersistence({active:()=>c,headers:()=>({}),request:async url=>{
  if(url.endsWith('/get')){c.chatMetadata.pending_action_input={id:'new'};return Response.json([]);}
  writes++;return Response.json({ok:true});
 }});
 await assert.rejects(adapter.save(c),/Stale/);assert.equal(writes,0);
});

test('R1: delayed snapshot cannot overwrite newer ST fields outside Engine records',async()=>{
 for(const [field,value] of Object.entries({name:'Renamed',send_date:'new date',gen_finished:'later',future_st_field:{value:2}})){
  const {c,adapter,writes}=fixture(),old={...chatOrigin(c),chat:structuredClone([{chat_metadata:c.chatMetadata},...c.chat])};
  c.chat[0][field]=value;
  await assert.rejects(adapter.write(old),/Stale/,field);assert.equal(writes.length,0,field);
 }
});
test('R1: read-back must detect dropped ST message fields, not only Engine events',async()=>{
 const {c}=fixture();c.chat[0].name='Alaric';c.chat[0].gen_finished='complete';let saved;
 const adapter=createChatPersistence({active:()=>c,headers:()=>({}),request:async(url,options)=>{
  if(url.endsWith('/save')){saved=JSON.parse(options.body).chat;delete saved[1].gen_finished;return Response.json({ok:true});}
  return Response.json(saved || []);
 }});
 await assert.rejects(adapter.save(c),/differs/);
});
test('R1: newer ST fields arriving during the prior read cannot be overwritten',async()=>{
 const {c}=fixture();let writes=0;
 const adapter=createChatPersistence({active:()=>c,headers:()=>({}),request:async url=>{
  if(url.endsWith('/get')){c.chat[0].name='new name';return Response.json([]);}writes++;return Response.json({ok:true});
 }});
 await assert.rejects(adapter.save(c),/Stale/);assert.equal(writes,0);
});

test('R1: an identical delayed native snapshot is really saved/read back, never merely acknowledged',async()=>{
 const {c,adapter,writes}=fixture(),old={...chatOrigin(c),chat:structuredClone([{chat_metadata:c.chatMetadata},...c.chat])};
 await adapter.save(c);const first=c.chatMetadata.avereth_save_revision;
 const response=await adapter.write(old);
 assert.equal(response.ok,true);assert.equal(writes.length,2,'success requires a second real write');
 assert.equal(c.chatMetadata.avereth_save_revision,first+1);assert.deepEqual(writes[1].chat.slice(1),c.chat);
 await adapter.verify(chatOrigin(c),writes[1].chat);
 c.chatMetadata.pending_action_input={id:'new reservation'};
 await assert.rejects(adapter.write(old),/Older native/);assert.equal(writes.length,2);
});
