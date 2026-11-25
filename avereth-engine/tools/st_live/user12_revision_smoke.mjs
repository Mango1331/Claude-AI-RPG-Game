// Original User12 Phase A history with a mock reply provider, on the pinned native ST host.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {Driver,loadPlaywright} from './live/driver.mjs';
import {createInstance,writeConfig,seedProfile} from './live/profile.mjs';
import {startServer} from './live/server.mjs';
import {startStub,STUB_MODEL} from './live/stub_provider.mjs';
import {ST_COMMIT} from './sandbox.mjs';
import {foldChat,rec,messageEvents} from '../../src/host.js';

const st = process.env.AVERETH_ST_DIR;
assert(st,'Set AVERETH_ST_DIR to the pinned SillyTavern checkout.');
assert.equal(execFileSync('git',['-C',st,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),ST_COMMIT);
const cases = JSON.parse(gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user12_edit_swipe.json.gz',import.meta.url))));
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'avereth-user12-revision-'));
console.log('Artifacts:',dir);
const file = name => path.join(dir,name);
const instance = createInstance({runId:'user12-revision',runDir:dir,base:dir});
const port = Number(process.env.AVERETH_USER12_ST_PORT || 18326);
writeConfig(instance,port);
const replies = [];
const mock = await startStub({respond: async ({role,messages}) => {
    replies.push({role,messages});
    if (role === 'plan') return JSON.stringify({commands:cases.plan});
    if (role === 'narrator') return cases.narration;
    assert.equal(role,'extract');
    return JSON.stringify({scene:'here',expected:{1:{minutes:620,done:true}},deltas:[]});
}});
let server, browser;
try {
    const boot = await startServer({stDir:st,inst:instance,port,logFile:file('boot.log'),timedFile:file('boot-timed.log')});
    await boot.stop();
    const preset = 'Avereth Narrator V4';
    const card = 'User12 Revision Mock';
    seedProfile(instance,{
        username:'Alaric',card:{name:card,first_mes:cases.chat[0].mes},
        preset:{name:preset,text:fs.readFileSync(new URL('../../presets/Avereth Narrator V4.json',import.meta.url),'utf8')},
        generation:{openai_max_tokens:4096,openai_max_context:32000,stream_openai:false},
        connection:{chat_completion_source:'custom',custom_url:mock.url,custom_model:STUB_MODEL},source:'custom',
    });
    server = await startServer({stDir:st,inst:instance,port,logFile:file('st.log'),timedFile:file('st-timed.log')});
    browser = await loadPlaywright().chromium.launch({
        executablePath:process.env.AVERETH_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',args:['--no-sandbox'],
    });
    const driver = await Driver.create(browser,{turnTimeoutMs:45000,quietMs:700});
    assert((await driver.open(server.url)).connected);
    await driver.openCard(card);
    const page = driver.page;
    await page.evaluate(async chat => {
        const c = SillyTavern.getContext();
        c.chat.splice(0,c.chat.length,...chat);
        delete c.chatMetadata.pending_action_input;
        await c.saveChat();
        await c.reloadCurrentChat();
    },cases.chat);
    driver.testChat = await driver.identity();

    const input = page.locator('#chat .mes[mesid="59"]');
    await input.hover();
    await input.locator('.mes_edit').click({force:true});
    await input.locator('textarea.edit_textarea').fill(cases.edit);
    await input.locator('.mes_edit_done').click({force:true});
    await page.waitForFunction(() => SillyTavern.getContext().chat[60].avereth_inactive);
    const edited = await driver.chat();
    assert.equal(edited[60].avereth_parent,'59/0/a73f0f9f');
    assert.deepEqual(messageEvents(edited[60]),[]);

    await page.locator('#chat .last_mes .swipe_right').last().click();
    await page.waitForFunction(() => {
        const row = SillyTavern.getContext().chat[60];
        return row.swipe_id === 1 && !row.avereth_inactive && row.extra?.avereth?.extraction?.status === 'applied';
    },null,{timeout:30000});
    await driver.save();
    const complete = await driver.chat();
    const state = foldChat(complete);
    assert.deepEqual(state.errors,[]);
    assert.equal(complete[60].extra.avereth_reply_parent,'59/0/862615fd');
    assert.equal(complete[60].swipe_info[0].extra.avereth_reply_parent,undefined);
    assert.equal(rec(complete[60]).extraction.status,'applied');
    assert.deepEqual(state.state.clock.minute - foldChat(edited).state.clock.minute,620);
    assert.equal(messageEvents(complete[59]).filter(e=>e.t==='time.advanced').length,1);
    assert.equal(replies.filter(r=>r.role === 'extract').length,1);
    const prompts = JSON.stringify(replies);
    assert.doesNotMatch(prompts,/i turn around and walk the way back to the dungeon exit/i);
    assert(await driver.verifySaved(complete,{complete:true}));

    await driver.reload();
    assert.deepEqual(foldChat(await driver.chat()).state,state.state);
    await page.locator('#chat .last_mes .swipe_left').last().click();
    await page.waitForFunction(() => {
        const row = SillyTavern.getContext().chat[60];
        return row.swipe_id === 0 && row.avereth_inactive;
    });
    assert.deepEqual(messageEvents((await driver.chat())[60]),[]);
    assert.equal(replies.filter(r=>r.role === 'extract').length,1);
    fs.writeFileSync(file('result.json'),JSON.stringify({source:'User12 Phase A M59/M60',sleepMinutes:620,roles:replies.map(r=>r.role),reload:true}));
    console.log('PASS User12 M59 edit → M60 native swipe → extraction → save → reload → inactive original swipe');
} finally {
    await browser?.close();
    await server?.stop();
    await mock.close();
}
