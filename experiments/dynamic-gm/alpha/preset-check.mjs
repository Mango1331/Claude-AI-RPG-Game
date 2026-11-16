import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright'),b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),page=await b.newPage();
page.setDefaultTimeout(20000);const errors=[];let requests=0;page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/backends/**/generate',r=>{requests++;return r.abort();});
await page.route('**/api/horde/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
try{
 await page.goto('http://127.0.0.1:8139/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.AverethGMAlpha&&SillyTavern.getContext().characters.length);
 const source=await page.evaluate(()=>({source:SillyTavern.getContext().chatCompletionSettings.chat_completion_source,url:SillyTavern.getContext().chatCompletionSettings.custom_url}));
 await page.setInputFiles('#openai_preset_import_file',fileURLToPath(new URL('../../../avereth-gm-alpha/presets/Avereth GM Alpha 1.json',import.meta.url)));
 await page.waitForFunction(()=>SillyTavern.getContext().chatCompletionSettings.openai_max_tokens===4096&&SillyTavern.getContext().chatCompletionSettings.temp_openai===0.8);
 assert.deepEqual(await page.evaluate(()=>({source:SillyTavern.getContext().chatCompletionSettings.chat_completion_source,url:SillyTavern.getContext().chatCompletionSettings.custom_url})),source);
 await page.setInputFiles('[data-preset-manager-file="textgenerationwebui"]',fileURLToPath(new URL('../../../avereth-gm-alpha/presets/Avereth GM Alpha 1 Text Completion.json',import.meta.url)));
 await page.waitForFunction(()=>SillyTavern.getContext().textCompletionSettings.temp===0.8&&SillyTavern.getContext().textCompletionSettings.rep_pen===1.05);
 assert.equal(requests,0);assert.deepEqual(errors,[]);
 fs.writeFileSync(new URL('./results/presets.json',import.meta.url),JSON.stringify({checks:[{name:'Chat Completion preset actual file import; connection preserved',pass:true},{name:'Text Completion preset actual file import',pass:true}],requests,pageErrors:errors},null,2));console.log('PASS both preset imports; connection unchanged; no model requests');
}finally{await b.close();}
