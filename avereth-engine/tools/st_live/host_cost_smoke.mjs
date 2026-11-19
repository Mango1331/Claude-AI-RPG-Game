// Isolated host only. Extend a real campaign using the same deterministic turn/event reducers.
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { foldChat } from '../../src/host.js';
import { hash32 } from '../../src/util.js';
import { loadContentPack } from '../../src/content.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';

export async function hostCostSmoke({page,out,calls}) {
    const pilot = JSON.parse(gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/pilot01_npc_pulse.json.gz',import.meta.url))));
    const content = await loadContentPack(k=>JSON.parse(fs.readFileSync(new URL('../../content/'+k,import.meta.url))));
    const long = structuredClone(pilot);
    while (foldChat(long).state.encounter && long.length>5) long.splice(-2);
    let state = foldChat(long).state;
    while(long.length<401) {
        const input = 'I listen to the sounds around me.';
        const turn = playerTurnV4(state, content, input, {msg:long.length, commands:[], c:true});
        long.push({name:'Alaric',is_user:true,mes:input,extra:{avereth:{v:3,input_hash:hash32(input),events:turn.events}}});
        const prose='A minute passes. The wind stirs the grass beside the road.';
        const reply=replyTurnV4(turn.state, content, {scene:'here',expected:{},deltas:[{seq:1,type:'time',minutes:1}]},{msg:long.length,prose});
        long.push({name:'Avereth V4',is_user:false,mes:prose,swipe_id:0,swipes:[prose],extra:{avereth:{
            v:3,text_hash:hash32(prose),extraction:{status:'applied'},events:reply.events}}});
        state=reply.state;
    }
    assert.deepEqual(foldChat(long).state,state);
    const start=calls.length, rows=[];
    for(const [kind,chat] of [['pilot',pilot],['extended',long]]) {
        const row=await page.evaluate(async ({kind,chat})=>{
            const c=SillyTavern.getContext();
            const base='/scripts/extensions/third-party/avereth-engine/src/';
            const {foldChat,projectPromptHistory}=await import(base+'host.js');
            const {recordSignature}=await import(base+'v4/action_persistence.js');
            const {getTokenCountAsync}=await import('/scripts/tokenizers.js');
            const result={kind,messages:chat.length,bytes:new Blob([JSON.stringify(chat)]).size,ms:{}};
            const measure=async(name,fn)=>{
                const start=performance.now();
                const value=await fn();
                (result.ms[name]??=[]).push(Math.round((performance.now()-start)*10)/10);
                return value;
            };
            c.chat.splice(0,c.chat.length,...chat);
            const expected=foldChat(c.chat);
            if(expected.errors.length)throw Error('Invalid load fixture');
            for(let i=0;i<3;i++) {
                await measure('fold',()=>foldChat(c.chat));
                await measure('signature',()=>recordSignature(c.chat));
                await measure('json',()=>JSON.stringify(c.chat));
                await measure('history',()=>projectPromptHistory([...c.chat]));
                await measure('saveWithReadback',()=>c.saveChat());
            }
            await measure('reloadAndFrame',async()=>{
                await c.reloadCurrentChat();
                await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            });
            const hud = document.querySelector('#avereth-action-choices button[data-avereth-action]')
                || [...document.querySelectorAll('#chat :is(.avereth-hud,.custom-avereth-hud) summary')].at(-1);
            if(!hud)throw Error('Missing rendered HUD');
            await measure('hudClickAndFrame',async()=>{
                hud.click();
                await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            });
            const sample=c.chat.slice(-8).map(m=>m.mes).join('\n');
            for(let i=0;i<3;i++) await measure('stCount',()=>getTokenCountAsync(sample));
            if(recordSignature(foldChat(c.chat).state)!==recordSignature(expected.state))throw Error('Changed world after reload');
            return result;
        },{kind,chat});
        rows.push(row);
        fs.writeFileSync(path.join(out,'host-cost.json'),JSON.stringify(rows,null,2));
    }
    assert.equal(calls.length,start);
    return {measuredBoth:true,noModelCalls:true};
}
