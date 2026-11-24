// node vergleich.mjs <.208 engine> <.209 engine> <ST tree> <User11/chat.jsonl> <output dir>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const [old, next, st, original, out] = process.argv.slice(2);
const {chromium} = createRequire(import.meta.url)('playwright');
const bytes=fs.readFileSync(original);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'534059d2e42c13148f35dcd58559047c4f1636e55ee5a71a0b5e6612ac991e8c');
const chat=bytes.toString('utf8').trim().split('\n').map(JSON.parse).slice(1);
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.AVERETH_CHROMIUM_EXECUTABLE});
const results={chromium:browser.version(),source:'User11 T13; isolated real Composer + ST CSS; rounded CSS pixels',rows:[],controls:[]};
const html=`<!doctype html><link rel="stylesheet" href="/st.css"><link rel="stylesheet" href="/engine/style.css"><style>body{display:block;height:auto;overflow:auto;font-family:Arial,sans-serif;font-size:16px;margin:0}#chat{width:100vw;max-width:100vw;overflow:visible;display:block;height:auto;max-height:none;position:static}#chat .mes,#chat .mes_text{box-sizing:border-box;display:block;width:100%;min-width:0;margin:0;padding:0}#send_form{display:block;width:100%;position:static}</style><div id="chat"><div class="mes"><div class="mes_text"></div></div></div><div id="send_form"><textarea id="send_textarea"></textarea><button id="send_but">Send</button></div>`;
async function mount(engine,width,scenario='original') {
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.route('**/*',route=>{
        const u=new URL(route.request().url());
        if(u.hostname!=='localhost')return route.abort();
        if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
        if(u.pathname==='/st.css')return route.fulfill({contentType:'text/css',path:path.join(st,'public/style.css')});
        const file=path.resolve(engine,u.pathname.slice('/engine/'.length));
        if(!u.pathname.startsWith('/engine/') || !file.startsWith(path.resolve(engine)+path.sep) || !fs.existsSync(file))return route.abort();
        return route.fulfill({path:file,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'text/css'});
    });
    await page.goto('http://localhost/');
    await page.evaluate(async({messages,scenario})=>{
        const load=name=>import('/engine/src/'+name+'.js');
        const [{foldChat},{loadContentPack},{installActionComposer},{renderHud}]=await Promise.all(['host','content','action_composer','hud'].map(load));
        const c=await loadContentPack(async name=>(await fetch('/engine/content/'+name)).json());
        const s=foldChat(messages).state;
        if(scenario==='mobility')for(const id of ['mage.blink','rogue.evasive_step','ranger.quickstep']){
            s.entities.pc.sheet.skills[id]={prof:1,pp:0};
            s.encounter.combatants.pc.fixed.actions[id]={prof:1};
        }
        if(scenario==='range')for(const enemy of Object.values(s.encounter.combatants).filter(e=>e.side==='hostile'))enemy.current.band='MEDIUM';
        if(scenario==='split'){
            const foes=Object.values(s.encounter.combatants).filter(e=>e.side==='hostile');
            foes[0].current.band='SHORT';foes[1].current.band='SHORT';
        }
        if(scenario==='resource')s.encounter.combatants.pc.current.mp=0;
        const ctx={getCurrentChatId:()=>'probe',characters:[{avatar:'user11.png'}],characterId:0,chatMetadata:{},chat:messages,eventTypes:{},eventSource:{on(){}},saveSettingsDebounced(){}};
        document.querySelector('.mes_text').innerHTML=renderHud(s,c);
        const api=installActionComposer({context:()=>ctx,state:()=>s,content:()=>c,enabled:()=>true,settings:()=>({}),blocked:()=>'',status:()=>'',save:async()=>{},retry:async()=>{}});
        api.refresh();
        window.selection=()=>api.selected()?.selection ?? null;
    },{messages:chat.slice(0,scenario==='opening'?23:25),scenario});
    return page;
}
const selectWave=page=>page.locator('[data-avereth-select-skill="mage.arcane_wave"]:visible,[data-avereth-action="skill:mage.arcane_wave"]:visible').last().click();
const band=(page,b)=>page.locator('[data-avereth-band="'+b+'"]').click();
const choose=(page,name)=>page.selectOption('#avereth-minor',name);
const swap=page=>page.getByRole('button',{name:'Reihenfolge umkehren'}).press('Enter');
const selection=page=>page.evaluate(()=>window.selection());
const label=page=>page.locator('#avereth-action-chip span').innerText();
async function measure(page){
    return page.locator('.avereth-action-controls').evaluate(el=>({
        height:Math.round(el.getBoundingClientRect().height), width:Math.round(el.getBoundingClientRect().width),
        phaseHeight:Math.round(el.querySelector('#avereth-phase-controls').getBoundingClientRect().height),
        overflow:el.scrollWidth>el.clientWidth, chip:el.querySelector('#avereth-action-chip span').innerText
    }));
}
try {
    for(const width of [360,800])for(const [version,engine] of [['208',old],['209',next]]){
        const page=await mount(engine,width);
        await selectWave(page);await band(page,'ENGAGED');
        assert.equal((await selection(page)).kind,'attack');
        assert.equal(await page.inputValue('#avereth-minor'),'');
        if(version==='209')assert.ok(await page.locator('#avereth-order').isHidden());
        const solo=await measure(page);
        await choose(page,'sidestep');
        assert.deepEqual((await selection(page)).steps.map(s=>s.kind),['attack','sidestep']);
        if(version==='208')await page.selectOption('#avereth-order','before');else await swap(page);
        assert.deepEqual((await selection(page)).steps.map(s=>s.kind),['sidestep','attack']);
        const pair=await measure(page);
        assert.ok(pair.width>width*.75 && !pair.overflow && !solo.overflow);
        await choose(page,'move:away');assert.equal((await selection(page)).steps[0].dir,'away');
        await choose(page,'');assert.equal((await selection(page)).kind,'attack');
        await choose(page,'move:closer');
        const readded=(await selection(page)).steps;
        assert.equal(readded[version==='208'?0:1].dir,'closer');
        results.rows.push({version,width,solo,pair,afterReadding:readded.map(s=>s.kind)});
        await page.close();
    }
    for(const scenario of ['opening','mobility','range','split','resource']){
        const page=await mount(next,360,scenario);
        if(scenario==='opening'){
            await selectWave(page);await choose(page,'move:away');await swap(page);await band(page,'SHORT');
            assert.deepEqual((await selection(page)).steps.map(s=>s.kind),['move','attack']);
            assert.match(await label(page),/Angriffsband MEDIUM/);
        }
        if(scenario==='mobility'){
            await page.locator('[data-avereth-action="sidestep"]').click();
            assert.match(await label(page),/Distanzschaden/);
            for(const id of ['mage.blink','rogue.evasive_step','ranger.quickstep']){
                await selectWave(page);await band(page,'ENGAGED');await choose(page,'skill:'+id+':away');
                assert.ok(await selection(page),id+' '+await label(page));
                assert.equal((await selection(page)).steps[1].skill,id);
                await choose(page,'skill:'+id+':closer');assert.ok((await selection(page)).steps[1].target);
                await page.locator('[data-avereth-select-skill="'+id+'"]').last().click();
                assert.equal((await selection(page)).kind,'skill');assert.match(await label(page),/zurück/);
            }
            await page.selectOption('#avereth-mobility-dir','closer');
            assert.equal((await selection(page)).dir,'closer');
            assert.equal((await selection(page)).target,undefined);
            const focus=page.locator('[data-avereth-select-target]:visible').first();
            await focus.click();await page.selectOption('#avereth-mobility-dir','away');
            assert.equal((await selection(page)).target,await focus.getAttribute('data-avereth-select-target'));
        }
        if(scenario==='range'){
            await selectWave(page);await band(page,'MEDIUM');await choose(page,'move:away');
            assert.equal((await selection(page)).steps[0].kind,'attack');
            await swap(page);assert.equal(await selection(page),null);assert.ok(await page.locator('#avereth-action-send').isHidden());
            assert.match(await label(page),/range|reach|LONG/i);
            await swap(page);assert.equal((await selection(page)).steps[0].kind,'attack');
        }
        if(scenario==='split'){
            await selectWave(page);await band(page,'SHORT');await choose(page,'move:closer');
            const before=await label(page);
            assert.match(before,/trifft: Restless Skeleton A, Restless Skeleton B/);
            await swap(page);
            const after=await label(page);
            assert.match(after,/Angriffsband ENGAGED/);
            assert.match(after,/trifft: Restless Skeleton A, Restless Skeleton C/);
        }
        if(scenario==='resource'){
            await selectWave(page);assert.equal(await selection(page),null);assert.match(await label(page),/MP/);
            await page.locator('#send_textarea').fill('Stand back!');
            assert.equal(await page.locator('#send_but').evaluate(b=>b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))),false);
            await page.click('#avereth-action-clear');assert.equal(await page.inputValue('#send_textarea'),'Stand back!');
            assert.equal(await page.locator('#send_but').evaluate(b=>b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))),true);
        }
        results.controls.push(scenario);await page.close();
    }
    fs.writeFileSync(path.join(out,'messung.json'),JSON.stringify(results,null,2)+'\n');
}finally{await browser.close();}
