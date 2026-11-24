// Visual comparison in the full ST interface. Start with an existing marked mock sandbox.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const [reference,candidate,sandbox,chatFile,out]=process.argv.slice(2);
const marker=JSON.parse(fs.readFileSync(path.join(sandbox,'.avereth-st-sandbox.json')));
assert.equal(marker.kind,'avereth-st-sandbox');
const st=path.join(sandbox,marker.st_dir);
assert.equal(execFileSync('git',['-C',st,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),'7e8663cd9c184a550b37238218bdd32c6efc68e9');
const chat=fs.readFileSync(chatFile,'utf8').trim().split('\n').map(JSON.parse).slice(1,26);
const card='Avereth V4.png';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.AVERETH_CHROMIUM_EXECUTABLE});
const results={st:marker.st_commit,chromium:browser.version(),source:'User11 before T13, full ST chat, fresh isolated data roots, default ST theme',rows:[]};
fs.mkdirSync(out,{recursive:true});
try{
    for(const [version,engine] of [['208',reference],['209',candidate]]){
        const dir=fs.mkdtempSync(path.join(os.tmpdir(),'avereth-ux209-'));
        const root=path.join(dir,'data'),user=path.join(root,'default-user'),ext=path.join(user,'extensions','avereth-engine');
        fs.mkdirSync(path.join(user,'characters'),{recursive:true});
        fs.copyFileSync(path.join(st,'data/default-user/characters',card),path.join(user,'characters',card));
        fs.mkdirSync(path.join(user,'worlds'),{recursive:true});
        fs.copyFileSync(path.join(engine,'lorebook/Avereth_World_Lore_v0.14.json'),path.join(user,'worlds/Avereth World Lore v0.14.json'));
        const settings=JSON.parse(fs.readFileSync(path.join(st,'default/content/settings.json')));
        Object.assign(settings,{firstRun:false,username:'Alaric',main_api:'openai'});
        settings.oai_settings={...settings.oai_settings,chat_completion_source:'custom',custom_url:'http://127.0.0.1:1/v1'};
        fs.writeFileSync(path.join(user,'settings.json'),JSON.stringify(settings));
        fs.mkdirSync(ext,{recursive:true});
        for(const f of ['src','content','regex','manifest.json','index.js','style.css'])fs.cpSync(path.join(engine,f),path.join(ext,f),{recursive:true});
        const config=path.join(dir,'config.yaml');
        fs.copyFileSync(path.join(st,'default/config.yaml'),config);
        const port=version==='208'?18328:18329,base='http://127.0.0.1:'+port;
        const log=fs.openSync(path.join(dir,'server.log'),'w');
        const server=spawn(process.execPath,['server.js','--port',String(port),'--dataRoot',root,'--configPath',config,'--listen','false','--browserLaunchEnabled','false'],{cwd:st,stdio:['ignore',log,log]});
        const ended=once(server,'exit');
        const page=await browser.newPage({viewport:{width:800,height:900}});
        let generations=0;
        try{
            for(let i=0;i<80;i++){
                if(server.exitCode!==null)throw Error('ST startup failed; see '+dir);
                if(await fetch(base+'/csrf-token').then(r=>r.ok).catch(()=>false))break;
                await delay(250);
            }
            await page.route('**/*',route=>{
                const url=new URL(route.request().url());
                if(url.origin!==base || url.pathname.startsWith('/api/horde/') || url.pathname.endsWith('/status'))return route.abort();
                if(url.pathname.endsWith('/generate')){generations++;return route.abort();}
                return route.continue();
            });
            await page.goto(base);
            await page.waitForFunction(()=>window.SillyTavern?.getContext?.() || document.querySelector('dialog[open]'));
            await page.evaluate(()=>{
                const d=document.querySelector('dialog[open]'),input=d?.querySelector('textarea,input[type=text]');
                if(input){input.value='Alaric';input.dispatchEvent(new Event('input',{bubbles:true}));}
                d?.querySelector('.popup-button-ok')?.click();
            });
            await page.waitForFunction(()=>window.SillyTavern?.getContext()?.characters?.some(c=>c.avatar==='Avereth V4.png'));
            await page.evaluate(async()=>{
                const c=SillyTavern.getContext();
                await c.selectCharacterById(String(c.characters.findIndex(x=>x.avatar==='Avereth V4.png')));
            });
            await page.waitForFunction(()=>SillyTavern.getContext().chat?.[0]?.extra?.avereth?.events?.length);
            await page.evaluate(async messages=>{
                const c=SillyTavern.getContext(),base='/scripts/extensions/third-party/avereth-engine/';
                const [{foldChat,showPanel},{renderHud},{loadContentPack}]=await Promise.all(['host','hud','content'].map(f=>import(base+'src/'+f+'.js')));
                const content=await loadContentPack(async n=>(await fetch(base+'content/'+n)).json());
                c.chat.splice(0,c.chat.length,...messages);
                showPanel(c.chat.at(-1),'',renderHud(foldChat(c.chat).state,content,'open'),{playerFacing:true});
                await c.saveChat();await c.reloadCurrentChat();
            },chat);
            const phase=page.locator('#avereth-order'),area=page.locator('.avereth-action-controls');
            await page.locator('[data-avereth-select-skill="mage.arcane_wave"]:not([disabled])').last().click();
            await page.locator('[data-avereth-band="ENGAGED"]').last().click();
            const geometry=()=>area.evaluate(el=>({
                height:Math.round(el.getBoundingClientRect().height),width:Math.round(el.getBoundingClientRect().width),
                overflow:el.scrollWidth>el.clientWidth+1,chip:el.querySelector('#avereth-action-chip span').innerText
            }));
            for(const width of [360,800]){
                await page.setViewportSize({width,height:900});
                await page.selectOption('#avereth-minor','');await area.scrollIntoViewIfNeeded();const solo=await geometry();
                await page.selectOption('#avereth-minor','sidestep');
                if(version==='208')await phase.selectOption('before');else await phase.click();
                const pair=await geometry();
                assert.match(pair.chip,/^Ausweichen.*Arcane Wave.*14 MP/s);
                assert.ok(!solo.overflow && !pair.overflow && solo.width>100);
                if(width===360)await area.screenshot({path:path.join(out,'mobil-'+version+'.png')});
                results.rows.push({version,width,solo,pair});
            }
            assert.equal(generations,0);
        } catch(error) {
            console.error(await page.evaluate(()=>({characters:window.SillyTavern?.getContext()?.characters?.map(c=>c.avatar),dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.innerText.slice(0,120))})));
            throw error;
        } finally {
            await page.close();server.kill('SIGTERM');await ended;fs.closeSync(log);
        }
    }
    fs.writeFileSync(path.join(out,'st-layout.json'),JSON.stringify(results,null,2)+'\n');
}finally{await browser.close();}
