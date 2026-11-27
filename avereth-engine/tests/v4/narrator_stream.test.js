import test from 'node:test';
import assert from 'node:assert/strict';
import { readNarratorFrames, streamReply } from '../../src/v4/narrator_stream.js';

const choice = reason => JSON.stringify({choices:[{index:0,delta:{},finish_reason:reason}]});
const stop = choice('stop'), done = '[DONE]';
for (const [name, data, wire, revision] of [
    ['regular completion', [choice(null),stop,done],true,true],
    ['error with terminal transport', ['{"error":true}',stop,done],true,false],
    ['malformed with terminal transport', ['{',stop,done],true,false],
    ['early EOF', [stop],false,false],
    ['DONE without choice completion', [choice(null),done],true,false],
    ['truncated output', [choice('length'),done],true,false],
    ['only another swipe finished', ['{"choices":[{"index":1,"finish_reason":"stop"}]}',done],true,false],
]) {
    test('stream receipt: '+name, async () => {
        const frames = new ReadableStream({start(c){for(const value of data)c.enqueue({data:value}); c.close();}});
        const receipts = [];
        assert.equal(await readNarratorFrames(frames, value => receipts.push(value)),wire);
        assert.deepEqual(receipts,[revision]);
    });
}
test('stream receipt only authorizes its original processor, user, chat, epoch, message and swipe', () => {
    const user={is_user:true,mes:'Go',extra:{avereth_action_input:{id:'action',revision:2}}};
    const reply={mes:'Prose',swipe_id:0}, chat=[user,reply], processor={messageId:1};
    const ctx={chat,streamingProcessor:processor,characterId:0,getCurrentChatId:()=>'chat'};
    const owner={processor,chat,characterId:0,chatId:'chat',epoch:9,index:0,user,input:'Go',inputId:'action',revision:2,reply,swipe:0};
    assert.equal(streamReply(owner,ctx,9),reply);
    for (const change of [{processor:{}},{chat:[...chat]},{chatId:'other'},{characterId:1},{epoch:8},{user:{...user}},{input:'Stop'},{inputId:'new'},{revision:3},{reply:{...reply}},{swipe:1}]) {
        assert.equal(streamReply({...owner,...change},ctx,9),null);
    }
});

test('empty metering stop for the same generation preserves a completed narration',async()=>{
    const chunk={id:'generation',model:'model',provider:'provider',choices:[{index:0,delta:{content:'',role:'assistant'},finish_reason:'stop',native_finish_reason:'stop'}]};
    for (const [change,valid] of [[{},true],[{id:'other'},false],[{usage:null},false],[{choices:[{...chunk.choices[0],delta:{content:'more'}}]},false]]) {
        const frames=new ReadableStream({start(c){
            for(const data of [JSON.stringify(chunk),JSON.stringify({...chunk,usage:{total_tokens:45},...change}),done]) c.enqueue({data});
            c.close();
        }});
        const receipts=[];
        await readNarratorFrames(frames,v=>receipts.push(v));
        assert.deepEqual(receipts,[valid]);
    }
});
