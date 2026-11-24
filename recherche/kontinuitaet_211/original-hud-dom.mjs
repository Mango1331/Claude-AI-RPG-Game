// Reproduce: node original-hud-dom.mjs <pinned .211 checkout> <docs checkout> <pinned ST 1.19 checkout>
// Reuses the archival step() and the existing ST live runner. Three saved views, no model generation.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const [repo,doc,st]=process.argv.slice(2);
assert.equal(execFileSync('git',['-C',repo,'rev-parse','HEAD']).toString().trim(),'10de728d4260e07ebf791cd2585ed93dc944bc7a');
assert.equal(execFileSync('git',['-C',st,'rev-parse','HEAD']).toString().trim(),'7e8663cd9c184a550b37238218bdd32c6efc68e9');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'avereth-original-dom-')); console.log('Artifacts',dir);
const engine=path.resolve(repo,'avereth-engine'),source=path.join(doc,'recherche/kontinuitaet_211/crossover.mjs');
const importFile=f=>import(pathToFileURL(path.join(engine,f)));
const live=f=>importFile('tools/st_live/live/'+f+'.mjs');
const {loadPlaywright,Driver}=await live('driver'),{seedProfile,writeConfig,createInstance}=await live('profile'),{startServer}=await live('server'),{startStub,STUB_MODEL}=await live('stub_provider');
execFileSync(process.execPath,[source,'--hud-chats',repo,dir]);
const {worldRows,characterRows}=await importFile('src/hud.js'),{engineAt}=await importFile('tools/replay/replay.mjs'),{host,content}=await engineAt(engine);
const badge='Avereth Original DOM',inst=createInstance({runId:'originalDOM',base:dir,runDir:dir});const port=18428;writeConfig(inst,port);
const start=tag=>startServer({stDir:st,inst,port,logFile:path.join(dir,tag+'.log'),timedFile:path.join(dir,tag+'-time.log')});
const stub=await startStub();let browser,server;
const result={engine:'10de728d4260e07ebf791cd2585ed93dc944bc7a',st:'7e8663cd9c184a550b37238218bdd32c6efc68e9',port,sourceHash:createHash('sha256').update(fs.readFileSync(source)).digest('hex'),measurements:{}};
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
try{
 const boot=await start('bootstrap');await boot.stop();
 seedProfile(inst,{username:'Alaric',card:{name:badge,first_mes:'Archive inspection.'},preset:{name:'Avereth Narrator V4',text:fs.readFileSync(path.join(engine,'presets/Avereth Narrator V4.json'),'utf8')},generation:{openai_max_tokens:4096,openai_max_context:32000,stream_openai:false},connection:{chat_completion_source:'custom',custom_url:stub.url,custom_model:STUB_MODEL},source:'custom'});
 server=await start('st');browser=await loadPlaywright().chromium.launch({executablePath:process.env.AVERETH_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const driver=await Driver.create(browser,{turnTimeoutMs:30000,quietMs:500}),page=driver.page;
 assert((await driver.open(server.url)).connected);await driver.openCard(badge);
 for(const tag of ['B19','B20','C19']){
  const {history,row}=JSON.parse(fs.readFileSync(path.join(dir,tag+'.json')));
  const {state,errors}=host.foldChat(history);assert.deepEqual(errors,[]);
  const expected=Object.fromEntries([...characterRows(state,content),...worldRows(state,content)]);
  await page.evaluate(async chat=>{const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...chat);delete c.chatMetadata.pending_action_input;await c.saveChat(); await c.reloadCurrentChat();},history);
  driver.testChat=await driver.identity();
  async function sample(){
   await page.waitForFunction(()=>document.querySelector('#chat .last_mes :is(details.avereth-hud,details.custom-avereth-hud)'),undefined,{timeout:12000});
   const got=await page.evaluate(async()=>{
    const c=SillyTavern.getContext(),card=c.characters[c.characterId],m=document.querySelector('#chat .last_mes');
    const panels=[...m.querySelectorAll('details.avereth-hud,details.custom-avereth-hud')];for(const p of panels) if(!p.open)p.querySelector('summary').click();
    const dom=Object.fromEntries(panels.flatMap(p=>[...p.querySelectorAll('.avereth-hud-body > b,.custom-avereth-hud-body > b')].map(b=>[b.innerText,b.nextSibling?.textContent?.replace(/^:\s*/,'').trim()])));
    const res=await fetch('/api/chats/get',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({ch_name:card.name,avatar_url:card.avatar,file_name:c.getCurrentChatId()})});if(!res.ok)throw Error('Readback HTTP '+res.status);
    const saved=(await res.json()).slice(1),{foldChat}=await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
    const a=foldChat(c.chat),b=foldChat(saved);
    const events=chat=>chat.map(v=>v.extra?.avereth?.events||[]);
    return {dom,live:a.state,disk:b.state,errors:[...a.errors,...b.errors],events:events(saved),sameEvents:JSON.stringify(events(saved))===JSON.stringify(events(c.chat)),message:Number(m.getAttribute('mesid'))};
   });
   assert.deepEqual(got.errors,[]);assert.equal(got.message,history.length-1);
   assert.deepEqual(got.live,state);assert.deepEqual(got.disk,state);assert(got.sameEvents);assert.deepEqual(got.events,history.map(m=>m.extra?.avereth?.events||[]));
   for(const label of ['Location','Present','Carried','Resources'])assert.equal(got.dom[label],expected[label]);
   return {Location:got.dom.Location,Present:got.dom.Present,Carried:got.dom.Carried,Resources:got.dom.Resources,message:got.message,place:got.disk.scene.at,npcs:got.disk.scene.present,bagId:'obj.t40.mother_wrens_leather_satchel',bagHolder:got.disk.objects['obj.t40.mother_wrens_leather_satchel']?.holder,extraBag:Object.values(got.disk.objects).filter(o=>o.name==='the bag').map(o=>[o.id,o.holder]),worldHash:hash(got.disk),eventsHash:hash(got.events)};
  }
  const before=await sample();await driver.reload();const after=await sample();assert.deepEqual(after,before);
  result.measurements[tag]={...before,identicalAfterFullReload:true,localArchiveAnswers:row.diagnostics.map(d=>d.used),criteria:row.criteria};
  console.log(tag,JSON.stringify(result.measurements[tag]));fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(result,null,2));
 }
 assert.equal(stub.calls.length,0);result.modelCalls=stub.calls.length;fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(result,null,2));
 console.log('PASS',dir);
}finally{if(browser)await browser.close();if(server)await server.stop();await stub.close();}
