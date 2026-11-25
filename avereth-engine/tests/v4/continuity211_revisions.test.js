import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk } from './patch8_lib.js';
import { foldChat, messageEvents, projectPromptHistory, rec, setRec } from '../../src/host.js';
import { onEditedV4, onSwipedV4, refreshRevisionDisplay, restoreEditedView, pendingExtraction, runExtraction, extractionRequest, prepareGenerationAsync, processReplyAny } from '../../src/v4/runtime.js';
import { savedPrefixMatches } from '../../src/v4/continuation.js';
import { hash32 } from '../../src/util.js';

const content = await loadProductContent();
const oldPlace = 'loc.alderwatch';
const oldStory = 'The blue quill hangs above the Alderwatch gate.';
const secondStory = 'The purple bell tolls inside the city.';
const altInput = 'I pick up no items and stay here.';
const projected = chat => {
    const copy = chat.map(m => ({...m}));
    projectPromptHistory(copy,{ keepTurns: 0 });
    return copy.map(m => m.mes).join('\n');
};

async function played() {
    const g = await campaign(content);
    const original = await walk(g, oldPlace, {text:'I walk to Alderwatch.', prose:oldStory});
    assert.equal(g.state().scene.at, oldPlace);
    await say(g, 'I listen to the purple bell.');
    await g.reply(secondStory);
    assert.equal(foldChat(g.chat).errors.length, 0);
    return {g, u: original.id - 1, n: original.id};
}

test('edit an older player input: the next input and P/N/X use only the surviving branch; restoring swaps the complete branches', async () => {
    const {g,u,n} = await played();
    const source = g.chat[u], original = source.mes;
    const before = structuredClone(g.state(u)), originalState = structuredClone(g.state());
    const originalEvents = structuredClone(rec(g.chat[n]).events);
    source.mes = altInput;
    onEditedV4(g.chat,u,content);
    assert.deepEqual(g.state(),before);
    assert.deepEqual(rec(g.chat[n]).events,originalEvents,'original record remains accessible in chat export');
    assert.deepEqual(messageEvents(g.chat[n]),[]);
    assert.match(g.chat[n].extra.display_text,/Inactive revision/);
    assert.doesNotMatch(projected(g.chat),/purple bell|blue quill|pick up no items/);
    g.chat = JSON.parse(JSON.stringify(g.chat));
    refreshRevisionDisplay(g.chat);
    const prompts = [];
    g.chat.push({is_user:true,mes:'I watch the daisies.'});
    const result = await prepareGenerationAsync(g.chat,content,{settings:{planner:true},llm:async req => {
        prompts.push(req.messages); return '{"commands":[]}';
    }});
    assert.equal(result.action,'context');
    assert.equal(prompts.length,1);
    assert.doesNotMatch(JSON.stringify([prompts,result.context.text]),/purple bell|blue quill|pick up no items/);
    const next = await g.reply('A daisy stirs.');
    assert.equal(rec(g.chat[next.id]).extraction.status,'applied');
    assert.doesNotMatch(JSON.stringify(g.calls.at(-1).messages),/purple bell|blue quill/);
    const alternateState = structuredClone(g.state());
    assert.equal(alternateState.turn,before.turn + 1);
    g.chat[u].mes = original;
    onEditedV4(g.chat,u,content);
    assert.deepEqual(g.state(),originalState);
    assert.match(projected(g.chat),/purple bell/);
    assert.doesNotMatch(projected(g.chat),/daisy|daisies/);
    g.chat[u].mes = altInput;
    onEditedV4(g.chat,u,content);
    assert.deepEqual(g.state(),alternateState);
    assert.deepEqual(g.state(),foldChat(JSON.parse(JSON.stringify(g.chat))).state);
});

test('editing assistant prose selects the prefix and re-extracts only the new text, even after later turns', async () => {
    const {g,n} = await played();
    const original = structuredClone(g.state());
    g.chat[n].mes = 'The gate remains on the horizon.';
    onEditedV4(g.chat,n,content);
    assert.equal(pendingExtraction(g.chat),n);
    assert.equal(g.state().scene.at,'loc.alderwatch.verge');
    assert.equal(messageEvents(g.chat[n+1]).length,0);
    const req = extractionRequest(g.chat,n,content);
    assert.equal(req.state.scene.at,'loc.alderwatch.verge');
    assert.match(JSON.stringify(req.messages),/gate remains on the horizon/);
    assert.doesNotMatch(JSON.stringify(req.messages),/purple bell|blue quill/);
    g.answer = {expected:{1:{arrived:false,at:null,with:null}},deltas:[]};
    await runExtraction(g.chat,n,content,g.llm);
    assert.equal(pendingExtraction(g.chat),-1);
    assert.equal(g.state().scene.at,'loc.alderwatch.verge');
    const candidate = JSON.parse(JSON.stringify(g.chat));
    assert.ok(savedPrefixMatches(g.chat,candidate,candidate.length-1));
    delete candidate[n+1].avereth_parent;
    assert.equal(savedPrefixMatches(g.chat,candidate,candidate.length-1),false);
    g.chat[n].mes = oldStory;
    onEditedV4(g.chat,n,content);
    assert.equal(pendingExtraction(g.chat),-1);
    assert.deepEqual(g.state(),original);
});

test('native swipe identity distinguishes equal text and read-back restores the old suffix without rolling twice', async () => {
    const {g,n} = await played();
    const baseline = structuredClone(g.state());
    g.chat[n].swipe_id = 1;
    const changed = onSwipedV4(g.chat,n);
    assert.ok(changed.includes(n+1));
    assert.equal(g.state().turn,baseline.turn-1);
    const loaded = JSON.parse(JSON.stringify(g.chat));
    refreshRevisionDisplay(loaded);
    loaded[n].swipe_id = 0;
    onSwipedV4(loaded,n);
    assert.deepEqual(foldChat(loaded).state,baseline);
});

test('an edited incomplete native stream stays blocked; an X answer after the origin was detached cannot commit', async () => {
    const {g,u,n} = await played();
    g.chat.splice(n+1);
    g.chat[n].mes = 'A fresh but not yet read answer.';
    onEditedV4(g.chat,n,content);
    let resolve;
    const delayed = new Promise(done=>{resolve=done;});
    const job=runExtraction(g.chat,n,content,()=>delayed);
    g.chat[u].mes=altInput;
    onEditedV4(g.chat,u,content);
    resolve(JSON.stringify({scene:'here',expected:{},deltas:[]}));
    const late=await job;
    assert.equal(late.changed,false);
    assert.deepEqual(messageEvents(g.chat[n]),[]);
    const msg=g.chat[n];
    delete msg.avereth_inactive;
    msg.mes='Only a sentence.';
    setRec(msg,{text_hash:hash32(msg.mes),events:[],extraction:{status:'incomplete'}});
    refreshRevisionDisplay(g.chat);
    msg.mes='Only a sentence, edited.';
    onEditedV4(g.chat,n,content);
    assert.equal(rec(msg).extraction.status,'incomplete');
    assert.equal(pendingExtraction(g.chat),-1);
});

test('restoring a loaded historical suffix supports system rows without extras and preserves foreign display text', async () => {
    const {g,u} = await played();
    const original = g.chat[u].mes;
    g.chat.push({is_system:true,mes:'Legacy notice'}, {is_system:true,mes:'Other notice',extra:{display_text:'Third-party presentation'}});
    g.chat[u].mes = altInput;
    onEditedV4(g.chat,u,content);
    assert.match(g.chat[u].extra.display_text,/avereth-hud/);
    delete g.chat[u].extra.display_text; // actual ST 1.19 Translate handler, auto_mode NONE
    restoreEditedView(g.chat,u,content);
    assert.match(g.chat[u].extra.display_text,/avereth-hud/);
    const loaded = JSON.parse(JSON.stringify(g.chat));
    delete loaded.at(-2).extra;
    refreshRevisionDisplay(loaded);
    loaded[u].mes = original;
    onEditedV4(loaded,u,content);
    assert.equal(loaded.at(-2).avereth_inactive,undefined);
    assert.equal(loaded.at(-1).extra.display_text,'Third-party presentation');
    assert.doesNotMatch(loaded[u].extra.display_text || '',/Geänderte Eingabe/);
});

test('deleting a revision pivot cannot resurrect its orphaned archived suffix, even after reload', async () => {
    const {g,u} = await played();
    const before = structuredClone(g.state(u));
    g.chat[u].mes = altInput;
    onEditedV4(g.chat,u,content);
    g.chat.splice(u,1);
    refreshRevisionDisplay(g.chat);
    assert.deepEqual(g.state(),before);
    assert.deepEqual(g.state(),foldChat(JSON.parse(JSON.stringify(g.chat))).state);
    assert.doesNotMatch(projected(g.chat),/purple bell|blue quill/);
});

test('ST shallow prompt copy taken before explicit regeneration carries the newly booked edited player text', async () => {
    const {g,u} = await played();
    g.chat[u].mes = altInput;
    onEditedV4(g.chat,u,content);
    const coreChat = g.chat.filter(m=>!m.is_system).map(m=>({...m}));
    const result=await prepareGenerationAsync(g.chat,content,{type:'regenerate',settings:{planner:true},llm:async ()=>'{"commands":[]}'});
    assert.equal(result.action,'context');
    assert.equal(rec(g.chat[u]).input_hash,hash32(altInput));
    projectPromptHistory(coreChat,{keepTurns:0,currentInput:g.chat[u]});
    assert.ok(coreChat.some(m=>m.mes===altInput));
    assert.doesNotMatch(JSON.stringify(coreChat.map(m=>m.mes)),/purple bell|blue quill/);
});

test('a generated native swipe belongs to the edited input even if ST carries the old extras forward', async () => {
    const {g,u,n} = await played();
    g.chat.splice(n+1);
    const user = g.chat[u], reply = g.chat[n], originalInput = user.mes;
    const original = structuredClone(g.state());
    const oldExtra = structuredClone(reply.extra);
    user.mes = altInput;
    onEditedV4(g.chat,u,content);
    await prepareGenerationAsync(g.chat,content,{type:'swipe',settings:{planner:true},llm:async ()=>'{"commands":[]}'});
    assert.deepEqual(messageEvents(reply), []);
    reply.swipe_id = 1;
    reply.swipes = [oldStory, oldStory]; // even identical prose must be read under the new input
    reply.swipe_info = [{extra:oldExtra}, {extra:structuredClone(oldExtra)}];
    const result = processReplyAny(g.chat,n,content,{generatedFrom:{index:u, message:user, key:u+'/0/'+hash32(user.mes)}});
    assert.equal(result.extract,true);
    assert.equal(rec(reply).extraction.status,'pending');
    assert.deepEqual(messageEvents(reply), []);
    await runExtraction(g.chat,n,content,async ()=>'{"scene":"here","expected":{},"deltas":[]}');
    assert.equal(rec(reply).extraction.status,'applied');
    const latest = structuredClone(g.state());
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state,latest);

    reply.swipe_id = 0;
    reply.extra = structuredClone(reply.swipe_info[0].extra);
    onSwipedV4(g.chat,n);
    assert.deepEqual(messageEvents(reply), []);
    user.mes = originalInput;
    onEditedV4(g.chat,u,content);
    assert.deepEqual(g.state(),original);
    reply.swipe_id = 1;
    reply.extra = structuredClone(reply.swipe_info[1].extra);
    onSwipedV4(g.chat,n);
    assert.deepEqual(messageEvents(reply), []);
});
