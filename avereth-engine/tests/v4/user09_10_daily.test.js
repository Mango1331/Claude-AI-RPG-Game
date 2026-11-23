// Original records at main 2254989f. Message indices exclude the JSONL header.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {loadProductContent} from '../helpers.js';
import {foldChat, playerFacingLines} from '../../src/host.js';
import {worldPanel} from '../../src/display.js';
import {prepareGenerationAsync,boardFor,generateBoard} from '../../src/v4/runtime.js';
import {playerTurnV4} from '../../src/v4/turn.js';
const content=await loadProductContent();
const fixture=n=>JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/user'+n+'_207.json.gz',import.meta.url))));
const u9=fixture('09'), u10=fixture('10');
const clone=structuredClone;
const fold=chat=>{const r=foldChat(chat);assert.deepEqual(r.errors,[]);return r.state;};
async function play(chat,i,answers){
    const original=chat[i].extra.avereth;
    delete chat[i].extra.avereth;
    const calls=[];
    await prepareGenerationAsync(chat,content,{llm:async({purpose})=>{
        calls.push(purpose);
        if(purpose==='plan')return original.plan.raw[0];
        assert.equal(purpose,'board');
        assert.ok(answers.length,'unrequested repair');
        return JSON.stringify(answers.shift());
    }});
    return calls;
}
const read=u10.chat[11].extra.avereth.interp.commands;
test('User10 publishes the first four immediately; the next day rotates unaccepted contracts',async()=>{
    const chat=clone(u10.chat.slice(0,12));
    assert.deepEqual(await play(chat,11,[u10.boards[13]]),['plan','board']);
    const state=fold(JSON.parse(JSON.stringify(chat)));
    const listed=Object.values(state.quests).filter(q=>q.status==='listed');
    assert.equal(listed.length,4);
    assert.ok(listed.every(q=>!q.title.includes('Snappers')));
    assert.equal(boardFor(state,content,read,{c:true}),null);
    const take={seq:1,type:'quest.accept',quest:listed[0].id,quote:'I accept '+listed[0].title};
    const next=playerTurnV4(state,content,take.quote,{c:true,commands:[take]}).state;
    assert.equal(next.quests[take.quest].status,'active');
    next.clock.minute+=1440;
    const need=boardFor(next,content,read,{c:true});
    assert.equal(need.missing,5);
    assert.deepEqual(need.have,[]);
    const gen=await generateBoard(async()=>JSON.stringify(u10.boards[18]),next,content,need);
    const renewed=playerTurnV4(next,content,'I read the board',{c:true,commands:read,board:gen}).state;
    assert.deepEqual(renewed.quests[take.quest],next.quests[take.quest]);
    assert.equal(Object.values(renewed.quests).filter(q=>q.status==='listed').length,5);
    assert.ok(listed.slice(1).every(q=>renewed.quests[q.id].status==='expired'));
});
test('short readable board needs a new input; structural repair is bounded and can use the anchor correction',async()=>{
    const s=fold(u10.chat.slice(0,11)),need=boardFor(s,content,read,{c:true});
    async function check(answers,count,wanted){
        let n=0;
        const r=await generateBoard(async()=>{assert.ok(n<answers.length);return answers[n++];},s,content,need);
        assert.equal(n,count);assert.equal(r.listings.length,wanted);return r;
    }
    const short=JSON.stringify({listings:u10.boards[18].listings.slice(0,3)});
    const failed=await check([short],1,0);
    const turn=playerTurnV4(s,content,'I read the board',{c:true,commands:read,board:failed});
    assert.ok(boardFor(turn.state,content,read,{c:true}));
    assert.match(turn.outcome.engine_lines.join('\n'),/erneut lesen/i);
    await check(['garbage',JSON.stringify(u10.boards[14])],2,5);
    await check(['garbage','garbage'],2,0);
    await check([JSON.stringify(u10.boards[18])],1,5);
    for(const idx of [0,4]){
        const board=clone(u10.boards[18]);board.listings[1]=clone(board.listings[idx]);
        board.listings[1].title+=' II';
        await check([JSON.stringify(board),'invalid'],2,0);
    }
});
for(const [i,before,after] of [[17,80,66],[21,66,58]])test('User09 booked hazard displayed once at M'+i,async()=>{
    const chat=clone(u9.chat.slice(0,i+1));
    await play(chat,i,[]);
    const s=fold(chat);assert.equal(s.entities.pc.sheet.hp,after);
    const lines=playerFacingLines(worldPanel(s,content));
    assert.equal(lines.filter(l=>l.includes('−'+(before-after)+' HP')&&l.includes(before+' → '+after)).length,1);
    const saved=fold(JSON.parse(JSON.stringify(chat)));
    assert.deepEqual(playerFacingLines(worldPanel(saved,content)),lines);
    const post=fold([...chat,u9.chat[i+1]]);
    assert.equal(post.scene.at,i===17?s.scene.at:'loc.mossback_warrens');
});
test('save, reload and regenerating/swiping the same failed or published .208 input cannot spend another board call',async()=>{
    for(const answers of [[u10.boards[13]],[{listings:[]}]]) {
        let chat=clone(u10.chat.slice(0,12));
        await play(chat,11,answers);
        const original=clone(chat[11].extra.avereth.events);
        for(const type of ['regenerate','swipe']) {
            chat=JSON.parse(JSON.stringify(chat));
            let calls=0;
            await prepareGenerationAsync(chat,content,{type,llm:async()=>{calls++;return null;}});
            assert.equal(calls,0);
            assert.deepEqual(chat[11].extra.avereth.events,original);
        }
    }
});
test('hazard card shows the clipped resource event, including STA and the HP floor',()=>{
    const msg=u9.chat[17], commands=msg.extra.avereth.interp.commands;
    for(const [resource,before,after] of [['sta',3,0],['hp',2,1],['hp',1,1]]){
        const s=fold(u9.chat.slice(0,17));
        s.features['feat.1'].harm=resource;
        s.entities.pc.sheet[resource]=before;
        const t=playerTurnV4(s,content,msg.mes,{c:true,commands});
        const lines=t.outcome.engine_lines.filter(l=>l.startsWith('HINDERNIS'));
        assert.deepEqual(lines,before===after?[]:[`HINDERNIS — −${before-after} ${resource.toUpperCase()} · ${before} → ${after}`]);
    }
});
