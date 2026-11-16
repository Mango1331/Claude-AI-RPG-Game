import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const checkpoint=JSON.parse(fs.readFileSync('/workspace/avereth-setup/gm-alpha2-host/restart-checkpoint.json'));
const {chromium}=createRequire(import.meta.url)('playwright'),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),page=await browser.newPage();
page.setDefaultTimeout(20000);const errors=[];let requests=0;
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/backends/**/generate',r=>{requests++;return r.abort();});
await page.route('**/api/horde/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
try{
 await page.goto('http://127.0.0.1:8139/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.AverethGMAlpha&&SillyTavern.getContext().characters.length);
 await page.evaluate(async({avatar,chatId})=>{const c=SillyTavern.getContext();await c.selectCharacterById(String(c.characters.findIndex(ch=>ch.avatar===avatar)));await SillyTavern.getContext().openCharacterChat(chatId);await AverethGMAlpha.resume();},checkpoint);
 const state=await page.evaluate(()=>AverethGMAlpha.state());assert.equal(createHash('sha256').update(JSON.stringify(state)).digest('hex'),checkpoint.stateHash);assert.equal(requests,0);assert.deepEqual(errors,[]);
 fs.writeFileSync(new URL('./results/restart.json',import.meta.url),JSON.stringify({pass:true,serverRestart:'ST server stopped and restarted with same isolated data root',requests,pageErrors:errors,stateHash:checkpoint.stateHash},null,2));console.log('PASS server restart: same world, zero model requests');
}finally{await browser.close();}
