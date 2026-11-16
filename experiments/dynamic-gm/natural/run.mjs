// Provider access is opt-in only after the user separately approves this frozen series.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
import {hashes} from './prepare.mjs';import {cases} from './cases.mjs';import {armRun} from './adapter.mjs';import {gateway,approvalCheck} from './gateway.mjs';
import {Journal,digest,copy} from '../../architecture201/journal.mjs';import {Scheduler} from '../../architecture201/scheduler.mjs';import {BrowserHost,BrowserPublication,install} from '../st-host.mjs';import {foldChat} from '../../architecture201/engine.mjs';
if(process.argv[2]!=='--live'||!process.env.GM_APPROVAL_FILE)throw Error('Preparation only. Live execution requires separate explicit user approval and GM_APPROVAL_FILE.');
const config=JSON.parse(fs.readFileSync(process.env.GM_APPROVAL_FILE,'utf8'));approvalCheck(config,hashes());
const root=path.join('/workspace/avereth-setup/natural-comparison',config.series);
if(fs.existsSync(root))throw Error('Series directory exists. No automatic series replay/reset; inspect prior request ledger.');
const gw=await gateway(config,root,hashes()); // Validates credential + actual tokenizer before opening any provider request.
const summary={status:'running',scope:'isolated prototype B vs dynamic GM, not full .200 product benchmark',cases:[],pageErrors:[],series:config.series};
let browser;
try{
 const {chromium}=createRequire(import.meta.url)('playwright');browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>summary.pageErrors.push(e.message));
 await page.goto('http://127.0.0.1:8137/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.SillyTavern?.getContext()?.characters?.length);await page.evaluate(async()=>SillyTavern.getContext().selectCharacterById('0'));await install(page);
 const histories={};
 for(const c of cases()){
  if(c.depends&&!c.order.every(arm=>histories[arm])){summary.cases.push({id:c.id,status:'not run',reason:'both N1 predecessors must publish'});continue;}
  for(const arm of c.order){
   const base=c.depends?histories[arm]:c.base,id=`${c.id}-${arm}`,host=new BrowserHost(page);await host.bind(`${config.series}-${id}`);
   const journal=new Journal(path.join(root,id+'.json'),base),scheduler=new Scheduler(journal,{maxAttempts:1}),publication=new BrowserPublication(journal,host);
   const countBefore=gw.ledger.journal.read().calls.length;
   const evidence={id,arm,case:c.id,input:c.input,baseHash:digest(base),status:'running'};summary.cases.push(evidence);
   // Same two initial state/input pairs; later N1 branches legitimately reflect their own confirmed world.
   const hidden=c.depends?[cases()[0].input,...Object.values(histories).map(chat=>chat.at(-1)?.mes)]:[];
   try{
    const result=await armRun({arm,id,input:c.input,base,journal,scheduler,publication,hidden,
     transport:async req=>{
      gw.setLabel(id+':'+req.phase);
      const response=await page.evaluate(async({messages,model,max,temperature})=>{
       const c=SillyTavern.getContext(),r=await fetch('/api/backends/chat-completions/generate',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({chat_completion_source:'custom',custom_url:'http://127.0.0.1:5141/v1',custom_model:model,model,messages,max_tokens:max,temperature,stream:false})});
       if(!r.ok)throw Error('isolated ST generation failed: '+r.status);return r.json();
      },{messages:req.messages,model:config.model,max:config.maxOutput||2000,temperature:config.temperature??0.7});
      if(response.error)throw Error('ST/provider generation rejected');const text=response.choices?.[0]?.message?.content;if(typeof text!=='string')throw Error('no model content');return text;
     }});
    Object.assign(evidence,{status:'published',confirmedDisplayMs:result.confirmedDisplayMs,stateHash:digest(foldChat(result.chat).state),narration:result.chat.at(-1).mes});
    if(c.id==='N1-first')histories[arm]=result.chat;
   }catch(e){evidence.status='failed';evidence.error=String(e.message);}
   evidence.physicalRequests=gw.ledger.journal.read().calls.length-countBefore;
   evidence.turnRecord=journal.read().turns[id]||null;fs.writeFileSync(path.join(root,'summary.json'),JSON.stringify(summary,null,2));
   const ledger=gw.ledger.journal.read();if(ledger.blocked||ledger.calls.length>=24||summary.pageErrors.length)throw Error('controlled series stop; inspect evidence');
  }
 }
 summary.status='completed; human semantic/narrative evaluation pending';
}catch(error){summary.status='stopped';summary.error=String(error.message);}finally{
 fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,'summary.json'),JSON.stringify(summary,null,2));await browser?.close();await gw.close();
}
