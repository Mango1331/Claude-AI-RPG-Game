import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { Driver } from '../../tools/st_live/live/driver.mjs';

// Execute the real browser callbacks. Model ST 1.19's welcome screen after a page reload, not an auto-opened chat.
function browser({missing=false,disconnected=false,wrong=false,messages=null}={}) {
    let chat=messages || [{mes:'fixture',extra:{avereth:{events:[{t:'campaign.started',d:{seed:7}}]}}}],disk=structuredClone(chat),chatId='test-chat',characterId='0',online='connected';
    const calls=[];
    const c={characters:[{name:'Test Narrator',avatar:'test.png',chat:'test-chat'}],get chat(){return chat;},get characterId(){return characterId;},groupId:null,get onlineStatus(){return online;},mainApi:'openai',chatCompletionSettings:{chat_completion_source:'custom',custom_url:'http://localhost:5050/v1',custom_model:'test'},
        getCurrentChatId:()=>chatId,getRequestHeaders:()=>({}),saveChat:async()=>{assert.equal(chatId,'test-chat','never save welcome/foreign chat');disk=structuredClone(chat);calls.push('save');},
        selectCharacterById:async(id)=>{calls.push('select');characterId=id;assert.equal(c.characters[id].chat,'test-chat');chatId=wrong?'foreign-chat':c.characters[id].chat;chat=structuredClone(disk);},
        openCharacterChat:async(id)=>{calls.push('open');chatId=wrong?'foreign-chat':id;chat=structuredClone(disk);}};
    const sandbox={SillyTavern:{getContext:()=>c},window:{},document:{querySelectorAll:()=>[],getElementById:()=>({textContent:'test'})},
        $:()=>({trigger:()=>{calls.push('connect');if(!disconnected)online='connected';}}),
        fetch:async()=>({ok:true,json:async()=>missing?[]:[{chat_metadata:{}},...structuredClone(disk)]}),arg:null};
    sandbox.window.SillyTavern=sandbox.SillyTavern;
    const invoke=async(fn,arg)=>{sandbox.arg=arg;return vm.runInNewContext(`(${fn.toString()})(arg)`,sandbox);};
    const page={on:()=>{},evaluate:invoke,waitForTimeout:async()=>{},waitForFunction:async(fn,arg)=>{if(!await invoke(fn,arg))throw Error('browser condition not met');},
        reload:async()=>{calls.push('reload');chatId=null;characterId=undefined;chat=[{mes:'welcome'}];online='no_connection';}};
    const driver=new Driver(page,{connectTimeoutMs:1});driver.welcomeDone=async()=>true;
    return {driver,calls,get chat(){return chat;},get id(){return chatId;},get online(){return online;}};
}

test('9D live: fixture installation reopens the saved test identity and reconnects after ST opens its welcome screen',async()=>{
    const b=browser();const fixture=[{mes:'Level14',extra:{avereth:{events:[{t:'campaign.started',d:{seed:19}}]}}}];
    await b.driver.installFixture(fixture);
    assert.equal(b.id,'test-chat');assert.equal(b.online,'connected');
    assert.deepEqual(JSON.parse(JSON.stringify(b.chat)),fixture);
    assert.ok(b.calls.includes('select'));assert.ok(b.calls.includes('connect'));
});

test('9D live: final reload keeps the actual saved campaign and rejects missing files, wrong chats and failed reconnection',async()=>{
    const b=browser(),before=JSON.stringify(b.chat);await b.driver.reload();assert.equal(JSON.stringify(b.chat),before);
    for(const [flags,error] of [[{missing:true},/saved test (?:chat|campaign)/i],[{wrong:true},/test chat|identity/i],[{disconnected:true},/connect|API/i]]) {
        const b=browser(flags);await assert.rejects(b.driver.reload(),error);
        assert.equal(b.calls.filter(x=>x==='save').length,1,'only the original test chat was saved');
    }
});

test('9D live: send refuses a disconnected or wrong chat before entering the player message',async()=>{
    const b=browser();await b.driver.reload();
    b.driver.probe=async()=>({busy:false,online:'no_connection',chatId:'test-chat',avatar:'test.png'});
    const result=await b.driver.send('#status');assert.equal(result.ok,false);assert.match(result.problem,/connect|API/i);
    b.driver.probe=async()=>({busy:false,online:'connected',chatId:'foreign-chat',avatar:'test.png'});
    assert.match((await b.driver.send('#status')).problem,/test chat/);
});

test('9D live: completion reload compares the actual fixture sheet and career after restoring the saved chat',async()=>{
    const {makeClassFixture}=await import('../../tools/st_live/live/class_fixture.mjs');
    const {verifyFixtureReload}=await import('../../tools/st_live/live/run_live.mjs');
    const messages=await makeClassFixture('9d-rare',7,'Test Narrator'),b=browser({messages});
    assert.equal(await verifyFixtureReload(b.driver,messages),true);
    const changed=structuredClone(messages);
    changed.findLast(m=>m.extra?.avereth?.events).extra.avereth.events.push({t:'resource.changed',d:{id:'pc',resource:'hp',value:1}});
    assert.equal(await verifyFixtureReload({reload:async()=>{},chat:async()=>changed},messages),false);
});

test('9D live: existing player, game and provider timings identify the real run outliers without changing model settings',async()=>{
    const {timingOutliers}=await import('../../tools/st_live/live/report.mjs');
    const turns=[{turn:1,ms:2000,decideMs:6000},{turn:2,ms:4000,decideMs:7000},{turn:3,ms:11366,decideMs:10367},{turn:17,ms:22432,decideMs:92726},{turn:24,ms:251860,decideMs:16964}];
    const calls=[{n:1,role:'narrator',turn:1,ms:10000},{n:2,role:'narrator',turn:2,ms:15000},{n:32,role:'narrator',turn:24,ms:229768}];
    const rows=timingOutliers(turns,calls);
    assert.ok(rows.some(x=>x.kind==='Spieler'&&x.turn===17&&x.ms===92726));
    assert.ok(rows.some(x=>x.kind==='Spiel'&&x.turn===24&&x.ms===251860));
    assert.ok(rows.some(x=>x.kind==='Provider narrator'&&x.call===32&&x.ms===229768));
    assert.deepEqual(timingOutliers([],[]),[]);
});
