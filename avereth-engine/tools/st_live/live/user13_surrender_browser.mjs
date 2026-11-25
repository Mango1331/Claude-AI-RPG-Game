import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Driver,loadPlaywright} from './driver.mjs';
import {createInstance,writeConfig,seedProfile} from './profile.mjs';
import {freePort,startServer} from './server.mjs';
import {startStub,STUB_MODEL} from './stub_provider.mjs';
import {foldChat} from '../../../src/host.js';
// Arguments: original User13 chat.jsonl and an installed SillyTavern 1.19 tree.
const [archive,st]=process.argv.slice(2);
assert.equal(JSON.parse(fs.readFileSync(path.join(st,'package.json'))).version,'1.19.0');
const src=fileURLToPath(new URL('../../../',import.meta.url));
const original=fs.readFileSync(archive,'utf8').trim().split('\n').slice(1).map(JSON.parse);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'avereth214-wire-'));
console.log(temp);
const inst=createInstance({runId:'ut13browser',runDir:temp,base:temp});
const port=await freePort(18338);
const start=()=>startServer({stDir:st,inst,port,logFile:path.join(temp,'st.log'),timedFile:path.join(temp,'timed.log')});
writeConfig(inst,port);
let phase='pulse', selection;
const roles=[];
const lines=['The cudgel man demands three silver and your staff.', 'The axeman nods his assent.', 'The knife wielder lowers his blade.'];
const ids=['npc.npctollcudgel','npc.npctollaxe','npc.npctollknife'];
const mock=await startStub({respond:({role,messages,fallback})=>{
    const block=messages.find(m=>m.content.startsWith('[AVERETH ENGINE'))?.content;
    roles.push({phase,role,chars:messages.reduce((n,m)=>n+m.content.length,0),block:block?.length});
    fs.writeFileSync(path.join(temp,phase+'-'+role+'.json'),JSON.stringify(messages));
    if(role==='narrator' && phase==='pulse') {
        assert.match(block,/Show visible numbers, weapons, bearing/);
        assert.match(block,/keep exact levels and HP hidden/);
    }
    if(phase==='identities'){
        if(role==='narrator') {
            for(const [label,weapon,distance] of [['A','Wood axe','SHORT'],['B','Cudgel','SHORT'],['C','Long knife','ENGAGED']]){
                const line=block.split('\n').find(l=>l.includes('Bandit '+label) && l.includes('locked DefeatXP'));
                assert(line && line.toLowerCase().includes(weapon.toLowerCase()) && line.includes(distance),label+' '+line);
            }
            assert.match(block,/Bandit B.*(?:Cudgel|cudgel)/);
            return original[18].mes;
        }
        return role==='extract'?JSON.stringify(original[18].extra.avereth.extraction.raw):original[17].extra.avereth.plan?.raw[0] || fallback;
    }
    if(phase==='hud'){
        if(role==='narrator') return 'The cudgel man agrees. All three bandits nod in agreement.';
        const q=JSON.parse(messages[1].content);
        return JSON.stringify({offer:q.offer,choice:'accept',speaker:ids[0],members:ids.map(id=>({id,evidence:'All three bandits nod in agreement.'})),evidence:'The cudgel man agrees.',terms:[]});
    }
    if(phase==='pulse')return role==='plan'?original[15].extra.avereth.plan.raw[0]:role==='narrator'?original[16].mes:JSON.stringify(original[16].extra.avereth.extraction.raw);
    if(phase==='offer'){
        if(role==='plan')return JSON.stringify({hud_binding:{id:selection.id,decision:'use',seqs:[1]},commands:[{seq:1,type:'move',dir:'away',target:null},{seq:2,type:'surrender',target:null,quote:'i surrender',terms:[{object:'coin',qty:30,mode:'drop',quote:'i throw the 3 silver out of my pouch towards them'}]}]});
        if(role==='narrator')return lines.join(' ');
        const q=JSON.parse(messages[1].content);
        return JSON.stringify({offer:q.offer,choice:'counter',speaker:ids[0],members:ids.map((id,i)=>({id,evidence:lines[i]})),evidence:lines[0],terms:[{object:'coin',qty:30,mode:'offer',quote:'three silver'},{object:'worn.weapon',qty:1,mode:'offer',quote:'your staff'}]});
    }
    if(phase==='accept' && role==='plan')return JSON.stringify({commands:[{seq:1,type:'negotiation_answer',accept:true,quote:original[21].mes}]});
    if(phase==='walk' && role==='plan')return JSON.stringify({commands:[]});
    if(role==='narrator')return phase==='accept'?'The cudgel man gathers the silver and staff. All three let Alaric pass.':'The bend in the road hides the toll party behind Alaric. A lark calls from the reeds.';
    return fallback;
}});
let server,browser;
try {
    server = await start();
    await server.stop();
    const preset='Avereth Narrator V4',card='User13 Surrender';
    seedProfile(inst,{username:'Alaric',card:{name:card,first_mes:original[0].mes},
        preset:{name:preset,text:fs.readFileSync(path.join(src,'presets/Avereth Narrator V4.json'),'utf8')},
        generation:{openai_max_tokens:4096,openai_max_context:32000,stream_openai:false},
        connection:{chat_completion_source:'custom',custom_url:mock.url,custom_model:STUB_MODEL},source:'custom'});
    server = await start();
    browser = await loadPlaywright().chromium.launch({executablePath:process.env.CHROME_PATH,args:['--no-sandbox']});
    const driver=await Driver.create(browser,{turnTimeoutMs:45000,quietMs:650});
    assert((await driver.open(server.url)).connected);
    await driver.openCard(card);
    const restore=async n=>{
        await driver.page.evaluate(async chat=>{
            const c=SillyTavern.getContext();
            c.chat.splice(0,c.chat.length,...chat);
            delete c.chatMetadata.pending_action_input;
            await c.saveChat();await c.reloadCurrentChat();
        },structuredClone(original.slice(0,n)));
        driver.testChat=await driver.identity();
    };
    await restore(15);
    assert((await driver.send(original[15].mes)).ok);
    await restore(19);
    phase='identities';
    await driver.page.evaluate(async()=>{await SillyTavern.getContext().generate('regenerate');});
    await driver.page.waitForFunction(()=>SillyTavern.getContext().chat.at(-1)?.extra?.avereth?.extraction?.status==='applied');
    assert(roles.some(c=>c.phase==='identities' && c.role==='narrator'));
    await restore(19);
    phase='offer';
    const page=driver.page;
    await page.locator('[data-avereth-action="surrender"]').last().click();
    await page.locator('[data-avereth-asset="coin"]').fill('20');
    await page.locator('[data-avereth-asset="coin"]').press('Tab');
    assert((await page.locator('#avereth-action-chip').textContent()).includes('20'));
    assert.equal((await driver.chat()).length,19);
    await page.locator('#avereth-action-clear').click();
    await page.locator('[data-avereth-action="move:away"]').last().click();
    await page.locator('#avereth-action-mode').selectOption('hud_free');
    await page.locator('#send_textarea').fill(original[19].mes);
    await page.route('**/api/backends/chat-completions/generate',async route=>{
        if(phase==='offer' && !selection)selection=await page.evaluate(()=>SillyTavern.getContext().chat.findLast(m=>m.is_user)?.extra?.avereth_action_input?.selection);
        await route.continue();
    });
    await page.locator('#avereth-action-send').click();
    await page.locator('[data-avereth-action="negotiation:accept"]').last().waitFor({timeout:35000});
    let f=foldChat(await driver.chat());assert.deepEqual(f.errors,[]);assert.equal(f.state.entities.pc.sheet.coin_cp,0);
    assert.equal(f.state.encounter.negotiation.stage,'counter');
    await driver.save();await driver.reload();
    await page.locator('[data-avereth-action="negotiation:accept"]').last().waitFor();
    phase='accept';assert((await driver.send(original[21].mes)).ok);
    f=foldChat(await driver.chat());assert.deepEqual(f.errors,[]);assert.equal(f.state.encounter,null);assert(!f.state.entities.pc.sheet.equipment.weapon);
    phase='walk';assert((await driver.send('I look down the road and listen.')).ok);
    const after=await driver.chat();assert.equal(after.at(-1).extra.avereth.extraction.status,'applied');
    await driver.save();assert(await driver.verifySaved(after,{complete:true}));await driver.reload();
    assert.deepEqual(foldChat(await driver.chat()).state,foldChat(after).state);
    await restore(19);
    phase='hud';
    await page.locator('[data-avereth-action="surrender"]').last().click();
    await page.locator('[data-avereth-asset="coin"]').fill('10');
    await page.locator('[data-avereth-asset="coin"]').press('Tab');
    await page.locator('[data-avereth-asset="worn.armor"]').fill('1');
    await page.locator('[data-avereth-asset="worn.armor"]').press('Tab');
    await page.locator('#avereth-action-send').click();
    await page.waitForFunction(()=>SillyTavern.getContext().chat.length>20 && SillyTavern.getContext().chat.at(-1)?.extra?.avereth?.extraction?.status==='applied');
    const direct=foldChat(await driver.chat());
    assert.deepEqual(direct.errors,[]);assert.equal(direct.state.encounter,null);
    assert.equal(direct.state.entities.pc.sheet.coin_cp,20);assert(!direct.state.entities.pc.sheet.equipment.armor);
    assert.deepEqual(roles.filter(r=>r.phase==='hud').map(r=>r.role),['narrator','extract']);
    fs.writeFileSync(path.join(temp,'result.json'),JSON.stringify(roles,null,2));console.log(JSON.stringify(roles));
} finally {
    await browser?.close();await server?.stop();await mock.close();
}
