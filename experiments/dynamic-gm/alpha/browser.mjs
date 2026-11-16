import fs from 'node:fs';import http from 'node:http';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {fixtures} from '../../architecture201/fixtures.mjs';import {foldChat,rec} from '../../architecture201/engine.mjs';
import {courseBase,courseSteps,potion} from './course-fixtures.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root='/workspace/avereth-setup/gm-alpha2-host',out=new URL(process.env.GM_COURSE_CHECK?'./results/course/':'./results/',import.meta.url);fs.mkdirSync(out,{recursive:true});
let answers=[],mode='ok',calls=0,release=null;const wire=[];
async function respond(body,res) {
 calls++;wire.push({model:body.model,stream:body.stream,messages:body.messages,prompt:body.prompt});
 if(mode==='delay')await new Promise(r=>release=r);
 if(mode==='429'){res.writeHead(429,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'concurrency_limit_exceeded'}}));return;}
 const next=answers.shift();const answer=typeof next==='string'?next:JSON.stringify(next??{});
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{index:0,message:{role:'assistant',content:answer},text:answer,finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:20}}));
}
const mock=http.createServer(async(req,res)=>{let b='';for await(const x of req)b+=x;if(req.url.includes('completions'))await respond(JSON.parse(b),res);else{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:[{id:'zai-org/GLM-5.3-Flash'}]}));}});await new Promise(r=>mock.listen(5143,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),browserContext=await browser.newContext(),page=await browserContext.newPage();page.setDefaultTimeout(20000);
const errors=[],checks=[],trace=[],course=[];let avatar;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')trace.push(m.text());});
await page.route('**/*',r=>{const u=new URL(r.request().url());if(!['127.0.0.1','localhost'].includes(u.hostname)&&u.protocol!=='data:')return r.abort();return r.continue();});
await page.route('**/api/backends/text-completions/status',r=>r.fulfill({status:200,contentType:'application/json',body:'{"result":"mock-featherless"}'}));
await page.route('**/api/horde/**',r=>r.fulfill({status:200,contentType:'application/json',body:r.request().url().includes('text-models')?'[]':'{}'}));
const f=n=>structuredClone(fixtures().find(x=>x.name===n)),finish=x=>({op:'finish',narration:x.narration,world:x.world});
async function ready(){await page.waitForFunction(()=>window.AverethGMAlpha&&window.SillyTavern?.getContext());}
async function select(){await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]')){const n=d.querySelector('textarea');if(n)n.value='Alaric';const b=[...d.querySelectorAll('div,button')].find(x=>x.textContent.trim()==='Save'&&x.children.length===0);b?.click();}});await page.waitForFunction(avatar=>SillyTavern.getContext().characters.some(c=>c.avatar===avatar),avatar);await page.evaluate(async avatar=>{const c=SillyTavern.getContext();await c.selectCharacterById(String(c.characters.findIndex(x=>x.avatar===avatar)));},avatar);}
async function setup(x) {
 await select();const name='alpha-case-'+crypto.randomUUID();
 await page.evaluate(async({name,base})=>{
  await SillyTavern.getContext().openCharacterChat(name);const c=SillyTavern.getContext();
  const mod='/scripts/extensions/third-party/avereth-gm-alpha';
  const {FileStore,Journal}=await import(mod+'/gm/storage.js'),{Host}=await import(mod+'/gm/host.js');
  const store=new FileStore(()=>SillyTavern.getContext()),host=new Host(()=>SillyTavern.getContext(),store),id=crypto.randomUUID(),file=`avereth-gm-alpha-${id}.json`;
  const header={user_name:'unused',character_name:'unused',chat_metadata:{...c.chatMetadata,averethGMAlpha:{version:'4.3.0-gm.alpha.2',id,journal:file}}};
  const target=host.target(),originChatId=host.id();
  await Journal.open(store,file,{version:'4.3.0-gm.alpha.2',revision:0,originChatId,target,header,world:{revision:0,chat:base},turns:{}});
  await host.save(target,header,base);host.render(base,header,host.token());
 },{name,base:x.base});return name;
}
async function send(x,list){answers=structuredClone(list);const before=calls;await page.evaluate(input=>AverethGMAlpha.send(input),x.input);return calls-before;}
async function state(){return page.evaluate(()=>AverethGMAlpha.state());}
async function check(name,fn){if(process.env.GM_COURSE_ONLY&&!/^(Course:|Importable|Installed)/.test(name))return;const before=calls;try{await fn();checks.push({name,pass:true,requests:calls-before});console.log('PASS',name);}catch(e){checks.push({name,pass:false,requests:calls-before,error:e.stack});console.log('FAIL',name,e.message);await page.screenshot({path:new URL(`failure-${checks.length}.png`,out).pathname});mode='ok';release?.();release=null;}}
try{
 await page.goto('http://127.0.0.1:8139/',{waitUntil:'networkidle'});
 await page.waitForTimeout(1000);await page.evaluate(()=>{const n=document.querySelector('dialog[open] input[type=text]');if(n){n.value='Alaric';n.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelectorAll('dialog[open] .popup-button-ok').forEach(b=>b.click());});await ready();
 const character=JSON.parse(fs.readFileSync(new URL('../../../avereth-gm-alpha/presets/Avereth GM Alpha.character.json',import.meta.url)));
 avatar=await page.evaluate(async card=>{const c=SillyTavern.getContext(),body=new FormData();body.append('avatar',new Blob([JSON.stringify(card)],{type:'application/json'}),'alpha.json');body.append('file_type','json');const headers=c.getRequestHeaders();delete headers['Content-Type'];const r=await fetch('/api/characters/import',{method:'POST',headers,body});if(!r.ok)throw Error('Card import '+r.status);const data=await r.json();return data.file_name.endsWith('.png')?data.file_name:data.file_name+'.png';},character);
 await page.reload({waitUntil:'networkidle'});await ready();await select();
 await page.evaluate(()=>{$('#main_api').val('openai').trigger('change');$('#chat_completion_source').val('custom').trigger('change');$('#custom_api_url_text').val('http://127.0.0.1:5143/v1').trigger('input');$('#custom_model_id').val('zai-org/GLM-5.3-Flash').trigger('input');Object.assign(SillyTavern.getContext().chatCompletionSettings,{custom_include_body:'chat_template_kwargs:\n  reasoning_effort: low\n  clear_thinking: true',custom_exclude_body:'',custom_include_headers:'',custom_prompt_post_processing:'none'});SillyTavern.getContext().saveSettingsDebounced();});
 await page.evaluate(async()=>{const {FileStore,Journal}=await import('/scripts/extensions/third-party/avereth-gm-alpha/gm/storage.js');const j=await Journal.open(new FileStore(()=>SillyTavern.getContext()),'avereth-gm-alpha-capacity.json',{revision:0,leases:{}});await j.update(d=>{for(const l of Object.values(d.leases))if(['sent','remote_unknown'].includes(l.status)){l.status='remote_finished';l.testObservation='Prior loopback mock process exited; confirmed before next test series';}});});
 await check('Importable Chat Completion preset through actual ST file import',async()=>{await page.setInputFiles('#openai_preset_import_file',{name:'alpha2-gameplay-'+Date.now()+'.json',mimeType:'application/json',buffer:fs.readFileSync(new URL('../../../avereth-gm-alpha/presets/Avereth GM Alpha 2.json',import.meta.url))});await page.waitForFunction(()=>SillyTavern.getContext().chatCompletionSettings.openai_max_tokens===4096&&SillyTavern.getContext().chatCompletionSettings.temp_openai===0.8);});
 await check('Installed extension: real imported card, creation, HUD, #status, native send capture; zero model calls',async()=>{
  await page.evaluate(()=>AverethGMAlpha.start());
  for(const input of ['Warrior','Heavy Slash and Guard','#status']){
   await page.fill('#send_textarea',input);await page.click('#gm-alpha-send');
   await page.waitForFunction(()=>!AverethGMAlpha.inspect().busy);assert.match(await page.locator('#gm-alpha-status').innerText(),/abgeschlossen/);
  }
  const s=await state();assert.equal(s.mode,'story');assert.equal(s.entities.pc.sheet.class,'warrior');assert.ok(await page.locator('.avereth-hud').count());assert.equal(calls,0);
 });
 await check('Normal NPC talk + memory, confirmed DOM, reload and recall without original dialogue',async()=>{
  const x=f('npc_promise'),name=await setup(x);assert.equal(await send(x,[finish(x)]),1);assert.match(await page.locator('#chat').innerText(),/old ford/);
  assert.ok(Object.values((await state()).threads).some(t=>t.text.includes('old ford')));
  await page.reload({waitUntil:'networkidle'});await ready();await select();await page.evaluate(n=>SillyTavern.getContext().openCharacterChat(n),name);await page.evaluate(()=>AverethGMAlpha.resume());
  assert.ok(Object.values((await state()).threads).some(t=>t.text.includes('old ford')));
 });
 for(const name of ['known_move','forest200'])await check('Travel '+name+' via two actual ST backend requests',async()=>{
  const x=f(name);await setup(x);assert.equal(await send(x,[{op:'resolve',commands:JSON.parse(x.plans[0]).commands},finish(x)]),2);assert.notEqual((await state()).scene.at,foldChat(x.base).state.scene.at);
 });
 await check('Not reached: actual arrival remains original place',async()=>{
  const x=f('forest200');await setup(x);await send(x,[{op:'resolve',commands:JSON.parse(x.plans[0]).commands},{op:'finish',narration:'Alaric remained at the roadside verge.',world:{scene:foldChat(x.base).state.scene.at,expected:{1:{arrived:false,at:null,with:null,met:null}},deltas:[]}}]);assert.equal((await state()).scene.at,foldChat(x.base).state.scene.at);
 });
 for(const held of [false,true])await check('Compound take then needs-go; NPC retains key='+held,async()=>{
  const x=f('forest200'),s=foldChat(x.base).state;x.input='I take the wooden key and go to Alderwatch.';
  const inject=e=>rec(x.base.findLast(m=>rec(m)?.events)).events.push(e);
  inject({t:'object.created',d:{object:{id:'obj.key',name:'wooden key',kind:'item',qty:1,holder:held?{entity:'npc.guard'}:{loc:s.scene.at},marks:[]}}});
  if(held){inject({t:'entity.created',d:{entity:{id:'npc.guard',name:'Guard',kind:'npc',status:'alive',at:s.scene.at,location:s.scene.location,descriptors:['guard']}}});inject({t:'scene.entered',d:{id:'npc.guard'}});}
  await setup(x);await send(x,[{op:'resolve',commands:[{seq:1,type:'take',object:'obj.key',qty:1,quote:'I take the wooden key'},{seq:2,type:'go',to:'loc.alderwatch',needs:1,quote:'go to Alderwatch'}]},{op:'finish',narration:held?'The guard kept the key. Alaric remained at the verge.':'Alaric took the wooden key and arrived in Alderwatch.',world:held?{scene:s.scene.at,expected:{},deltas:[]}:{scene:'loc.alderwatch',expected:{2:{arrived:true,at:'loc.alderwatch',with:null,met:null}},deltas:[{seq:1,type:'arrive',at:'loc.alderwatch',forced_by:null,with:null}]}}]);
  assert.equal((await state()).objects['obj.key'].holder.entity,held?'npc.guard':'pc');assert.equal((await state()).scene.at,held?s.scene.at:'loc.alderwatch');
 });
 await check('NPC gift + genuine continuation, one transfer, new promise, reload no duplicates',async()=>{
  const x=f('npc_promise');await setup(x);await send(x,[{op:'world',continue:true,narration:'Wat handed Alaric a plain wooden token as a gift.',world:{scene:foldChat(x.base).state.scene.at,expected:{},deltas:[{seq:1,type:'object.new',name:'plain wooden token',kind:'item',qty:1,holder:'npc.wat',effect:null,unit:null,for_quest:null,in:null,teaches:null},{seq:2,type:'object.move',object:{new:'plain wooden token'},qty:1,to:'pc'}]}},{op:'finish',continuation:true,narration:'Wat looked toward the reeds.',speech:[{id:'promise',speaker:'npc.wat',text:'I will show you the old ford tomorrow.',to:['pc'],promise:true}]}]);
  const before=await state();await page.evaluate(()=>AverethGMAlpha.resume());assert.deepEqual(await state(),before);assert.equal(Object.values(before.objects).filter(o=>o.name==='plain wooden token'&&o.holder.entity==='pc').length,1);assert.match(await page.locator('#chat').innerText(),/looked toward the reeds/);
 });
 await check('Stop during pending request: no early story; late receipt permits explicit resume',async()=>{
  const x=f('npc_promise');await setup(x);answers=[finish(x)];mode='delay';
  const pending=page.evaluate(input=>AverethGMAlpha.send(input).then(()=>null,e=>e.message),x.input);
  await page.waitForFunction(()=>AverethGMAlpha.inspect().capacity===4);for(let i=0;!release&&i<1000;i++)await new Promise(r=>setTimeout(r,10));assert.ok(release,'mock request dispatched');
  assert.doesNotMatch(await page.locator('#chat').innerText(),/old ford tomorrow/);await page.click('#gm-alpha-stop');mode='ok';release();release=null;
  assert.match(await pending,/Stopped/);assert.equal((await page.evaluate(()=>AverethGMAlpha.inspect())).journal.world.revision,0);
  await page.evaluate(()=>AverethGMAlpha.resume());assert.equal((await page.evaluate(()=>AverethGMAlpha.inspect())).journal.world.revision,1);
 });
 for(const fail of ['http','silent'])await check('Chat save failure '+fail+' cannot publish; receipt resumes',async()=>{
  const x=f('npc_promise');await setup(x);
  await page.route('**/api/chats/save',r=>r.fulfill({status:fail==='http'?500:200,contentType:'application/json',body:'{"ok":true}'}));
  await assert.rejects(send(x,[finish(x)]),/save|HTTP/);assert.doesNotMatch(await page.locator('#chat').innerText(),/old ford tomorrow/);
  await page.unroute('**/api/chats/save');await page.evaluate(()=>AverethGMAlpha.resume());assert.ok(Object.values((await state()).threads).some(t=>t.text.includes('old ford')));
 });
 await check('Chat switch during model request never writes/displays in another chat',async()=>{
  const x=f('npc_promise'),origin=await setup(x);answers=[finish(x)];mode='delay';
  const pending=page.evaluate(input=>AverethGMAlpha.send(input).catch(e=>e.message),x.input);
  for(let i=0;!release&&i<1000;i++)await new Promise(r=>setTimeout(r,10));assert.ok(release,'mock request dispatched');await page.evaluate(()=>SillyTavern.getContext().openCharacterChat('alpha-other-'+Date.now()));mode='ok';release();release=null;assert.match(await pending,/Stopped/);
  assert.doesNotMatch(await page.locator('#chat').innerText(),/old ford/);
  await page.evaluate(n=>SillyTavern.getContext().openCharacterChat(n),origin);await page.evaluate(()=>AverethGMAlpha.resume());assert.ok(Object.values((await state()).threads).some(t=>t.text.includes('old ford')));
 });
 await check('ST masks 429: one request, unknown capacity blocks, explicit confirmed retry only',async()=>{
  const x=f('npc_promise');await setup(x);mode='429';const before=calls;await assert.rejects(send(x,[finish(x)]),/remote completion/);mode='ok';assert.equal(calls-before,1);assert.equal((await page.evaluate(()=>AverethGMAlpha.inspect())).capacity,4);await assert.rejects(page.evaluate(()=>AverethGMAlpha.resume()),/capacity/);page.once('dialog',d=>d.accept());await page.locator('#gm-alpha-remote').evaluate(el=>el.click());await page.waitForFunction(()=>!AverethGMAlpha.inspect().busy);assert.equal((await page.evaluate(()=>AverethGMAlpha.inspect())).journal.world.revision,0);
  answers=[finish(x)];await page.evaluate(()=>AverethGMAlpha.resume());assert.equal(calls-before,2);
 });
 await check('Malformed JSON cannot advance state or appear as narration',async()=>{
  const x=f('npc_promise');await setup(x);await assert.rejects(send(x,['{broken']));assert.equal((await page.evaluate(()=>AverethGMAlpha.inspect())).journal.world.revision,0);assert.doesNotMatch(await page.locator('#chat').innerText(),/\{broken/);
 });
 await check('Swipe / regenerate refused by actual controls and interceptor',async()=>{
  await page.evaluate(()=>document.querySelector('#option_regenerate').click());assert.match(await page.locator('#gm-alpha-status').innerText(),/gesperrt/);
  assert.equal(await page.evaluate(async()=>{let blocked=false;await averethGMAlphaInterceptor([],0,()=>blocked=true,'swipe');return blocked;}),true);
 });
 await check('Unbudgeted Text Completion is refused before dispatch',async()=>{
  const x=f('npc_promise');await setup(x);const before=calls;
  await page.evaluate(()=>$('#main_api').val('textgenerationwebui').trigger('change'));
  await assert.rejects(send(x,[finish(x)]),/Chat-Completion/);assert.equal(calls,before);
  await page.evaluate(()=>$('#main_api').val('openai').trigger('change'));
 });
 await check('Combat: recorded w191 #65 Heavy Slash resolved by .200 engine; receipt cannot reroll',async()=>{
  const d=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../../avereth-engine/tests/replay/corpus191/w191.json.gz',import.meta.url))));
  const x={base:d.chat.slice(0,65),input:d.chat[65].mes};await setup(x);
  const before=foldChat(x.base).state;
  await send(x,[{op:'resolve',commands:JSON.parse(d.answers[65][0].content).commands},{op:'finish',narration:'Alaric struck the old boar with Heavy Slash.',world:{scene:before.scene.at,expected:{},deltas:[]}}]);
  const after=await state();assert.ok(after.rng.n>before.rng.n);assert.notDeepEqual(after.entities.pc.sheet,before.entities.pc.sheet);
  await page.evaluate(()=>AverethGMAlpha.resume());assert.deepEqual(await state(),after);
 });
 await check('Local timeout with unknown remote holds 4 units; late completion needs explicit resume',async()=>{
  const x=f('npc_promise');await setup(x);answers=[finish(x)];mode='delay';
  // Fault injection only: shorten the browser scheduler's 120s deadline, not transport.
  await page.evaluate(()=>{window.realSetTimeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>realSetTimeout(fn,ms===120000?50:ms,...args);});
  await assert.rejects(page.evaluate(input=>AverethGMAlpha.send(input),x.input),/timeout/);
  await page.evaluate(()=>{window.setTimeout=window.realSetTimeout;});
  assert.equal((await page.evaluate(()=>AverethGMAlpha.inspect())).capacity,4);
  await assert.rejects(page.evaluate(()=>AverethGMAlpha.resume()),/capacity/);
  mode='ok';release();release=null;await page.waitForFunction(async()=>{const {FileStore}=await import('/scripts/extensions/third-party/avereth-gm-alpha/gm/storage.js');const d=await new FileStore(()=>SillyTavern.getContext()).read('avereth-gm-alpha-capacity.json');return Object.values(d.leases).every(l=>!['sent','remote_unknown'].includes(l.status));});
  assert.equal((await page.evaluate(()=>AverethGMAlpha.inspect())).journal.world.revision,0);
  await page.evaluate(()=>AverethGMAlpha.resume());assert.equal((await page.evaluate(()=>AverethGMAlpha.inspect())).journal.world.revision,1);
 });
 await check('Reload after world commit before host save: durable ST file recovery, no model repeat',async()=>{
  const x=f('npc_promise'),name=await setup(x);const before=calls;
  await page.route('**/api/chats/save',r=>r.fulfill({status:500,body:'save failed'}));
  await assert.rejects(send(x,[finish(x)]),/HTTP/);await page.unroute('**/api/chats/save');
  assert.equal((await page.evaluate(()=>AverethGMAlpha.inspect())).journal.world.revision,1);
  await page.reload({waitUntil:'networkidle'});await ready();await select();await page.evaluate(n=>SillyTavern.getContext().openCharacterChat(n),name);
  await page.evaluate(()=>AverethGMAlpha.resume());assert.equal(calls-before,1);assert.ok(Object.values((await state()).threads).some(t=>t.text.includes('old ford')));
 });
 await check('Journal save fails before commit: no visible world; acknowledged answer reused',async()=>{
  const x=f('npc_promise');await setup(x);let blocked=false;
  await page.route('**/api/files/upload',async r=>{const body=r.request().postDataJSON();const value=JSON.parse(Buffer.from(body.data,'base64').toString());if(!blocked&&body.name!=='avereth-gm-alpha-capacity.json'&&value.world?.revision===1){blocked=true;return r.fulfill({status:500,body:'journal failed'});}return r.continue();});
  const before=calls;await assert.rejects(send(x,[finish(x)]),/HTTP/);assert.equal((await page.evaluate(()=>AverethGMAlpha.inspect())).journal.world.revision,0);
  await page.unroute('**/api/files/upload');await page.evaluate(()=>AverethGMAlpha.resume());assert.equal(calls-before,1);
 });
 await check('Same-origin second tab cannot execute while first owns global Web Lock',async()=>{
  const x=f('npc_promise');await setup(x);answers=[finish(x)];mode='delay';
  const pending=page.evaluate(input=>AverethGMAlpha.send(input),x.input);for(let i=0;!release&&i<1000;i++)await new Promise(r=>setTimeout(r,10));assert.ok(release);
  const second=await page.context().newPage();await second.goto('http://127.0.0.1:8139/',{waitUntil:'networkidle'});
  const got=await second.evaluate(()=>navigator.locks.request('avereth-gm-alpha-global',{ifAvailable:true},lock=>!!lock));assert.equal(got,false);await second.close();mode='ok';release();release=null;await pending;
 });
 if(process.env.GM_COURSE_CHECK) {
 await check('Course: original guild input → promise → gift/use → return without original dialogue',async()=>{
  await setup({base:courseBase()});
  for(const step of courseSteps()) {
   const before=await state(),offset=wire.length;
   const count=await send(step,step.answers(before));
   const after=await state();
   const sent=wire.slice(offset);
   const diagnostics=await page.evaluate(n=>JSON.parse(document.querySelector('#gm-alpha-diagnostics').textContent).requests.slice(-n),count);
   const budgets=await page.evaluate(async messages=>{const {measureBudget}=await import('/scripts/extensions/third-party/avereth-gm-alpha/gm/budget.js');return Promise.all(messages.map(m=>measureBudget(m)));},sent.map(x=>x.messages));
   assert.deepEqual(diagnostics.map(d=>d.budget.localInputTokens),budgets.map(b=>b.localInputTokens),'UI diagnostics must belong to these wire requests, not older failed attempts');
   course.push({name:step.name,origin:step.origin,input:step.input,physicalRequests:count,fullPromptCharacters:sent.map(x=>JSON.stringify(x.messages).length),diagnostics});
   if(step.name==='use'){assert.ok(after.entities.pc.sheet.hp>before.entities.pc.sheet.hp);assert.ok(!potion(after));}
   if(step.name==='recall'){
    const p=JSON.parse(sent[0].messages[1].content);assert.ok(p.recentDialogue.every(m=>!m.text.includes('Next time you return')));assert.match(p.engineContext,/safer path/);
    assert.equal(Object.values(after.threads).find(t=>t.text.includes('safer path')).status,'resolved');
   }
  }
  assert.deepEqual(course.map(x=>x.physicalRequests),[2,1,1,2,2,1,2,1]);
  const saved=await state(),name=await page.evaluate(()=>SillyTavern.getContext().chatId);await page.reload({waitUntil:'networkidle'});await ready();await select();await page.evaluate(n=>SillyTavern.getContext().openCharacterChat(n),name);assert.deepEqual(await state(),saved);
 });
 await check('Course: bad world corrected once; rejected draft never published',async()=>{
  const x=f('npc_promise');await setup(x);const a=structuredClone(finish(x));a.world.scene='unknown.place';a.narration='REJECTED DRAFT';
  assert.equal(await send(x,[a,finish(x)]),2);assert.doesNotMatch(await page.locator('#chat').innerText(),/REJECTED DRAFT/);
  assert.equal((await page.evaluate(()=>AverethGMAlpha.inspect())).journal.world.revision,1);
 });
 await check('Course: #system uses one private answer, not the internal context',async()=>{
  await setup({base:courseBase()});const before=await state();
  assert.equal(await send({input:'#system Explain Basic Attack.'},[{op:'answer',text:'SYSTEM ANSWER: Basic Attack follows the supplied weapon and class formula.'}]),1);
  assert.match(await page.locator('#chat').innerText(),/SYSTEM ANSWER/);const after=await state();assert.deepEqual(after.rng,before.rng);assert.deepEqual(after.clock,before.clock);
 });
 }
 await check('Known semantic gap: omitted promise and invented consent still pass free prose (NOT a protection success)',async()=>{
  const x=f('npc_promise');await setup(x);x.narration='Wat promised to bring a silver bell tomorrow. Alaric agreed to pay for it.';x.world.deltas=[];
  await send(x,[finish(x)]);assert.match(await page.locator('#chat').innerText(),/silver bell/);assert.ok(!Object.values((await state()).threads).some(t=>t.text.includes('silver bell')));
 });
 await page.screenshot({path:new URL('alpha-installed.png',out).pathname,fullPage:true});
 fs.writeFileSync(root+'/restart-checkpoint.json',JSON.stringify({avatar,chatId:await page.evaluate(()=>SillyTavern.getContext().chatId),stateHash:createHash('sha256').update(JSON.stringify(await state())).digest('hex')}));
}catch(e){checks.push({name:'setup',pass:false,error:e.stack});console.log('SETUP FAIL',e.stack);await page.screenshot({path:new URL('setup-failure.png',out).pathname});}
finally{fs.writeFileSync(new URL(process.env.GM_COURSE_ONLY?'browser-course.json':'browser.json',out),JSON.stringify({checks,course,pageErrors:errors,physicalMockRequests:calls,browser:browser.version(),nativeFeatherless:'unbudgeted Text Completion rejected before dispatch',allOtherTransport:'actual ST backend -> loopback mock',trace},null,2));await browser.close();mock.close();console.log(JSON.stringify({pass:checks.filter(x=>x.pass).length,total:checks.length,pageErrors:errors}));if(checks.some(x=>!x.pass)||errors.length)process.exitCode=1;}
