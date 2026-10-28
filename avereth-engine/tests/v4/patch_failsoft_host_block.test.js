import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadProductContent} from '../helpers.js';
import {campaign} from './patch8_lib.js';
for (const mode of ['readback','save']) test(`review: failed Planner ${mode} blocks subsequent planning until disk catches up`,async()=>{
 const g=await campaign(await loadProductContent());let initialized,calls=0;
 const c={chat:g.chat,characters:[{name:'test',avatar:'test.png'}],characterId:0,extensionSettings:{},getCurrentChatId:()=> 'block-test',getRequestHeaders:()=>({}),
 eventTypes:{MESSAGE_RECEIVED:'received',GENERATION_ENDED:'ended',CHAT_COMPLETION_SETTINGS_READY:'ready',GENERATION_STOPPED:'stop',MESSAGE_EDITED:'edited',CHAT_CHANGED:'chat',MESSAGE_DELETED:'deleted',MESSAGE_SWIPED:'swiped'},
 eventSource:{on(type){if(type==='swiped')initialized();}},saveChat:async()=>{if(mode==='save')throw Error('save failed');},saveSettingsDebounced(){},setExtensionPrompt(){},addOneMessage(){},
 generateRaw:async()=>{calls++;return '{bad';}};
 const keys=['fetch','document','SillyTavern','toastr','averethInterceptor'],previous=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 try{
 globalThis.fetch=async url=>String(url).startsWith('file:')?{ok:true,json:async()=>JSON.parse(await readFile(url,'utf8'))}:{ok:true,json:async()=>[{}]};
 globalThis.document={getElementById:()=>null,querySelector:()=>null};globalThis.SillyTavern={getContext:()=>c};globalThis.toastr={error(){},warning(){}};
 const ready=new Promise(r=>{initialized=r;});await import(`../../index.js?failsoft-block-review-${mode}`);await ready;
 c.chat.push({mes:'I sell the pelts.',is_user:true,extra:{}});await globalThis.averethInterceptor([],8000,()=>{},'normal');
 assert.ok(calls>0);const used=calls;
 c.chat.push({mes:'I wait.',is_user:true,extra:{}});await globalThis.averethInterceptor([],8000,()=>{},'normal');
 assert.equal(calls,used,'an unconfirmed Planner save must be checked before another provider call');
 const disk=structuredClone(c.chat);
 globalThis.fetch=async url=>String(url).startsWith('file:')?{ok:true,json:async()=>JSON.parse(await readFile(url,'utf8'))}:{ok:true,json:async()=>[{},...disk]};
 await globalThis.averethInterceptor([],8000,()=>{},'normal');
 assert.ok(calls>used,'verified persisted records release the block');
 }finally{for(const key of keys)globalThis[key]=previous[key];}
});
