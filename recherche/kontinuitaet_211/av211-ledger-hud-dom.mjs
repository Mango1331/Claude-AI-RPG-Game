// node av211-ledger-hud-dom.mjs ENGINE_CHECKOUT ST_CHECKOUT USER08_JSONL [ledger-revisions.mjs]
// Four locally imported branches, each sampled after native save/read-back and again after browser reload.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const [repo,st,original,helper=fileURLToPath(new URL('./av211-ledger-revisions.mjs',import.meta.url))]=process.argv.slice(2);
const sha = repo => String(execFileSync('git',['-C',repo,'rev-parse','HEAD'])).trim();
const engine = path.resolve(repo,'avereth-engine');
assert.equal(sha(st),'7e8663cd9c184a550b37238218bdd32c6efc68e9');
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'avereth-ledger-hud-'));
const worldCases = JSON.parse(execFileSync(process.execPath,[helper,engine,original,dir]));
assert.equal(worldCases.source_sha256,'d1353f4cfa29fac9b2e9ab3e4c769d5ff19d4722e82ba6d3052e4ea116c3f497');
const load = x=>import(pathToFileURL(path.join(engine,x)));
const live = x=>load('tools/st_live/live/'+x+'.mjs');
const {loadPlaywright,Driver} = await live('driver');
const {seedProfile,writeConfig,createInstance} = await live('profile');
const {startServer} = await live('server');
const {startStub,STUB_MODEL} = await live('stub_provider');
const {foldChat,messageEvents} = await load('src/host.js');
const {characterRows,worldRows} = await load('src/hud.js');
const {loadProductContent} = await load('tests/helpers.js');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const content = await loadProductContent(), badge = 'Avereth Ledger DOM';
const probe = net.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const inst = createInstance({runId:'ledgerdom',base:dir,runDir:dir});writeConfig(inst,port);
const start = tag=>startServer({stDir:st,inst,port,logFile:path.join(dir,tag+'.log'),timedFile:path.join(dir,tag+'-timed.log')});
const stub = await startStub();let server,browser;
const result = {engine:sha(repo),st:sha(st),source_sha256:worldCases.source_sha256,loopbackPort:port,level:'Native ST 1.19.0, imported response branches, DOM / backend read-back / full browser reload',originalCase:'User08 M0–56; positive receipt on original, scripted negative X stored in alternative by offline helper',views:{}};
const labels=['Location','Coin','Resources','Quests','Active quests'];
console.log('Artifacts:',dir);
try {
 const bootstrap=await start('bootstrap'); await bootstrap.stop();
 seedProfile(inst,{username:'Alaric',card:{name:badge,first_mes:'Isolated saved state.'},preset:{name:'Avereth Narrator V4',text:fs.readFileSync(path.join(engine,'presets/Avereth Narrator V4.json'),'utf8')},generation:{openai_max_tokens:4096,openai_max_context:32000,stream_openai:false},connection:{chat_completion_source:'custom',custom_url:stub.url,custom_model:STUB_MODEL},source:'custom'});
 server=await start('st');
 browser=await loadPlaywright().chromium.launch({executablePath:process.env.AVERETH_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const driver=await Driver.create(browser,{turnTimeoutMs:30000,quietMs:300});const page=driver.page;
 assert((await driver.open(server.url)).connected);await driver.openCard(badge);
 const served=await page.evaluate(async()=>await(await fetch('/scripts/extensions/third-party/avereth-engine/src/v4/revisions.js')).text());
 assert.equal(hash(served),hash(fs.readFileSync(path.join(engine,'src/v4/revisions.js'))));
 for (const name of ['alternate-22','restored-22','alternate-56','restored-56']) {
  const history=fs.readFileSync(path.join(dir,name+'.jsonl'),'utf8').trimEnd().split('\n').map(x=>JSON.parse(x));
  const {state,failures}=foldChat(history);assert.deepEqual(failures,[]);
  const want={...Object.fromEntries(characterRows(state,content)),...Object.fromEntries(worldRows(state,content))};
  const expectedEvents=history.map(m=>messageEvents(m));
  const wantedMessage = history.findLastIndex(m=>!m.is_user && !m.is_system && !m.avereth_inactive);
  await page.evaluate(async chat=>{const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...chat);delete c.chatMetadata.pending_action_input;await c.saveChat();await c.reloadCurrentChat();},history);
  driver.testChat=await driver.identity();
  async function sample() {
   // In M22's alternate the physical tail (M23..M56) is deliberately still visible as audit.
   // Scroll the selected message into view if ST's initial view shows only the newer suffix.
   const max=history.length;
   for(let i=0;i<max;i++){
    if(await page.locator('#chat .mes[mesid="'+wantedMessage+'"]').count())break;
    const more=page.locator('#show_more_messages');if(!await more.count()) break;await more.click();
   }
   await page.waitForFunction(id=>document.querySelector('#chat .mes[mesid="'+id+'"] :is(details.avereth-hud,details.custom-avereth-hud)'),wantedMessage,{timeout:12000});
   const got=await page.evaluate(async id=>{
    const c=SillyTavern.getContext(),card=c.characters[c.characterId];
    const sel='details.avereth-hud,details.custom-avereth-hud';
    const target=document.querySelector('#chat .mes[mesid="'+id+'"]');
    const panels=[...target.querySelectorAll(sel)];for(const p of panels) if(!p.open)p.querySelector('summary').click();
    const dom=Object.fromEntries(panels.flatMap(p=>[...p.querySelectorAll('.avereth-hud-body > b,.custom-avereth-hud-body > b')].map(b=>[b.innerText,b.nextSibling?.textContent?.replace(/^:\s*/,'').trim()])));
    const q=await fetch('/api/chats/get',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({ch_name:card.name,avatar_url:card.avatar,file_name:c.getCurrentChatId()})});if(!q.ok)throw Error('ST backend '+q.status);
    const disk=(await q.json()).slice(1);
    const {foldChat,messageEvents}=await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
    const a=foldChat(c.chat),b=foldChat(disk);
    const ids=xs=>xs.map(m=>[m.swipe_id??0,m.avereth_parent??null,!!m.avereth_inactive]);
    const events=xs=>xs.map(m=>messageEvents(m));
    const inactivePanels=[...document.querySelectorAll('#chat .mes')].filter(el=>c.chat[Number(el.getAttribute('mesid'))]?.avereth_inactive && el.querySelector(sel)).length;
    return {dom,live:a.state,disk:b.state,failures:[...a.failures,...b.failures],message:id,swipe:c.chat[id].swipe_id,selectedActive:!c.chat[id].avereth_inactive,events:events(disk),sameLineage:JSON.stringify(ids(c.chat))===JSON.stringify(ids(disk)),sameEvents:JSON.stringify(events(c.chat))===JSON.stringify(events(disk)),inactivePanels};
   },wantedMessage);
   assert.deepEqual(got.failures,[]);assert.deepEqual(got.live,state);assert.deepEqual(got.disk,state);assert.deepEqual(got.events,expectedEvents);
   assert(got.sameLineage && got.sameEvents && got.selectedActive);assert.equal(got.inactivePanels,0);
   for(const label of labels)assert.equal(got.dom[label],want[label],name+' '+label);
   const q=got.disk.quests['quest.clear_the_old_crown_catacombs_level_1'];
   return {message:got.message,swipe:got.swipe,ui:Object.fromEntries(labels.map(l=>[l,got.dom[l]??null])),storedQuest:{status:q.status,ready:!!q.ready},worldSHA256:hash(JSON.stringify(got.disk)),eventsSHA256:hash(JSON.stringify(got.events)),noInactiveHud:got.inactivePanels===0,activeStoredLineageMatches:got.sameLineage};
  }
  const before=await sample();await driver.reload();const after=await sample();
  assert.deepEqual(after,before);
  result.views[name]={...before,identicalAfterFullReload:true};
  console.log(name,JSON.stringify(result.views[name]));
 }
 assert.equal(stub.calls.length,0);result.stubGenerationCalls=stub.calls.length;
 fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(result,null,2)+'\n');
 console.log('PASS',dir);
}finally{if(browser)await browser.close();if(server)await server.stop();await stub.close();}
