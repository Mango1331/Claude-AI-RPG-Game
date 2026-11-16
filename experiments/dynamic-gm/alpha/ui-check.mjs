import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright'),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),page=await browser.newPage();
page.setDefaultTimeout(20000);const errors=[];let requests=0;page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/backends/**/generate',r=>{requests++;return r.abort();});
await page.route('**/api/horde/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
try{
 await page.goto('http://127.0.0.1:8139/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.AverethGMAlpha&&SillyTavern.getContext().characters.length);
 await page.evaluate(async()=>{const c=SillyTavern.getContext();await c.selectCharacterById(String(c.characters.findIndex(ch=>ch.data?.extensions?.avereth_gm_alpha===1)));await SillyTavern.getContext().openCharacterChat('alpha-ui-'+crypto.randomUUID());});
 await page.click('#gm-alpha-start');await page.waitForFunction(()=>!AverethGMAlpha.inspect().busy&&!!SillyTavern.getContext().chatMetadata.averethGMAlpha);
 await page.evaluate(async()=>{(await import('/script.js')).setOnlineStatus('mock-alpha connected');});
 await page.fill('#send_textarea','Warrior');await page.click('#send_but');await page.waitForFunction(()=>!AverethGMAlpha.inspect().busy&&AverethGMAlpha.state().creation.step===2);
 await page.fill('#send_textarea','Heavy Slash and Guard');await page.press('#send_textarea','Enter');await page.waitForFunction(()=>!AverethGMAlpha.inspect().busy&&AverethGMAlpha.state().mode==='story');
 await page.fill('#send_textarea','#status');await page.click('#gm-alpha-send');await page.waitForFunction(()=>!AverethGMAlpha.inspect().busy);
 assert.match(await page.locator('#gm-alpha-status').innerText(),/abgeschlossen/);assert.ok(await page.locator('#gm-alpha-hud .avereth-hud').count());assert.equal(requests,0);assert.deepEqual(errors,[]);
 const before=await page.evaluate(()=>JSON.stringify(AverethGMAlpha.state()));await page.locator('#mes_continue').evaluate(el=>el.click());assert.match(await page.locator('#gm-alpha-status').innerText(),/gesperrt/);assert.equal(await page.evaluate(()=>JSON.stringify(AverethGMAlpha.state())),before);assert.equal(requests,0);
 await page.screenshot({path:new URL('./results/alpha-new-game.png',import.meta.url).pathname});
 fs.writeFileSync(new URL('./results/ui.json',import.meta.url),JSON.stringify({pass:true,workflow:['real Start button','native Send button -> class','Enter -> skills','GM send -> #status','engine HUD','native Continue refused'],requests,pageErrors:errors},null,2));console.log('PASS native Send + Enter + local creation + HUD; zero model calls');
}finally{await browser.close();}
