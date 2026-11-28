// The isolated runner supplies real ST, mock model roles and commit/read-back telemetry.
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {watchInput,inputTiming} from './safe_input_timing.mjs';

const f = JSON.parse(gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user08_205_trade.json.gz',import.meta.url))));
const bid = 'offer.t60.3', seller = 'npc.npchide_buyer', fixed = 'offer.smoke.fixed';
export const tradeTurns = [
    {key:'hud207sale',player:'I sell 3 × F-Rank Risen Bones Bone',reply:f.reply,answer:f.report},
    {key:'hud207ask',player:'Who buys Skill Stones nearby?',reply:'The buyer studies the materials. She has not paid Alaric, and he keeps hold of the Skill Stone.',answer:{expected:{1:{sold:false,price_cp:null},2:{sold:false,price_cp:null}},deltas:[]}},
    {key:'hud207buy',player:'I buy 2 × Rations, 3 × Bandages',reply:'The merchant counts the rations and bandages into Alaric’s bag and receives the agreed payment.'},
];
export async function tradeHudSmoke({page,calls,worldTimings,idle,onReload,out}) {
    const checks={},timings=[];
    const panel=page.locator('#avereth-trade'),source=panel.getByRole('combobox',{name:'Waren und Gebote'});
    const seed=async(length=f.chat.length, campaign=f.chat)=>{
        const chat=structuredClone(campaign.slice(0,length)),m=chat.at(-1);
        if(campaign===f.chat && length===f.chat.length) m.extra.avereth.events.push({t:'offer.created',d:{offer:{id:fixed,status:'open',seller,at:'loc.alderwatch.alderwatch_market_district',lines:[
            {id:'ration',kind:'goods',what:'Rations',qty:5,price_cp:15},{id:'bandage',kind:'goods',what:'Bandages',qty:5,price_cp:25},
        ]}}});
        await page.evaluate(async msgs=>{
            const c=SillyTavern.getContext();
            c.chat.splice(0,c.chat.length,...msgs.map(m=>({...m,name:m.is_user?c.name1:c.name2,send_date:'2026-11-22',is_system:!!m.is_system})));
            await c.saveChat(); await c.reloadCurrentChat();
        },chat);
        onReload(); await idle();
        if (length!==27 && await panel.isVisible() && !await panel.evaluate(e=>e.open)) await panel.locator('summary').click();
    };
    const world=()=>page.evaluate(async()=>{
        const {foldChat}=await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const c=SillyTavern.getContext(), {state:s,errors}=foldChat(c.chat), u=c.chat.findLast(m=>m.is_user);
        return {clock:s.clock.minute, services:s.services,coin:s.entities.pc.sheet.coin_cp,offers:s.offers,objects:s.objects,errors,events:u.extra.avereth?.events,
            stats:s.entities.pc.sheet.stats,points:s.entities.pc.sheet.free_points,
            input:u.extra.avereth_action_input,applied:c.chat.at(-1).extra?.avereth?.extraction?.status};
    });
    async function turn(button, doubleClick=false) {
        const n=calls.length,w=worldTimings.length;
        await watchInput(page);
        if (doubleClick) await button.evaluate(b=>{b.click();b.click();});
        else await button.click();
        await idle();
        const timing=await inputTiming(page,worldTimings.slice(w)), before=await world();
        await page.evaluate(()=>SillyTavern.getContext().reloadCurrentChat());onReload();await idle();
        const after=await world(),roles=calls.slice(n).map(c=>c.purpose);
        timings.push({roles,timing,reloaded:JSON.stringify(before)===JSON.stringify(after)});
        return {s:after,roles};
    }
    await seed();
    const start=await world(),n=calls.length;
    await source.selectOption(fixed);
    await panel.locator('[data-row="ration"]').fill('2');await panel.locator('[data-row="bandage"]').fill('3');
    checks.preview21=(await panel.locator('output').innerText()).includes('21 cp');
    checks.previewFree=JSON.stringify(await world())===JSON.stringify(start) && calls.length===n;
    await page.setViewportSize({width:390,height:844});
    const first=panel.locator('[data-row="ration"]');
    await first.focus();await page.keyboard.press('Tab');
    checks.narrowAndKeyboard=await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+2 && document.activeElement.dataset.row==='bandage');
    checks.quantityContrast=await first.evaluate(e=>{
        const css=getComputedStyle(e);
        return css.color==='rgb(255, 255, 255)' && css.backgroundColor==='rgb(23, 23, 23)';
    });
    await panel.screenshot({path:out+'/trade-cart-narrow.png'});
    await page.setViewportSize({width:1280,height:900});
    const stats=page.locator('#avereth-assign');
    if (!await stats.evaluate(e=>e.open)) await stats.locator('summary').click();
    checks.independentSelectors=await first.inputValue()==='2';
    await stats.locator('summary').click();
    await page.fill('#send_textarea','Only if the bandages are clean.');
    const buy=panel.getByRole('button',{name:'Kaufen · 21 cp',exact:true});
    await buy.click();
    checks.conditionalTextProtected=calls.length===n && JSON.stringify(await world())===JSON.stringify(start)
        && await page.inputValue('#send_textarea')==='Only if the bandages are clean.';
    await panel.getByRole('button',{name:'Als freien Text vorbereiten',exact:true}).click();
    const freeText=await page.inputValue('#send_textarea');
    checks.freeDraft=freeText.includes('21 cp') && freeText.endsWith('Only if the bandages are clean.') && calls.length===n;
    await page.fill('#send_textarea','');
    const bought=await turn(buy,true);
    const sheet = page.locator('#chat details.avereth-hud, #chat details.custom-avereth-hud');
    checks.persistedSkillOverview = (await sheet.allTextContents()).some(text =>
        /P[1-5] \(\d+\/\d+ PP\).*Rank F.*Raw Power/.test(text));
    const readCount = calls.length;
    const skillRow = page.locator('#chat .mes').last().locator('details.avereth-skill-detail,details.custom-avereth-skill-detail').first();
    const skillGroup = skillRow.locator('xpath=ancestor::details[1]');
    if (!await skillGroup.evaluate(e => e.open)) await skillGroup.locator(':scope > summary').click();
    await skillRow.locator('summary').click();
    checks.skillDetailsReadOnly = await skillRow.locator('pre').isVisible()
        && /P[1-5]/.test(await skillRow.innerText()) && calls.length === readCount
        && JSON.stringify(await world()) === JSON.stringify(bought.s);
    await skillRow.locator('summary').click();
    // Exercise the host click on the rendered candidates of a prepared clarification.
    const clarification = await page.evaluate(async () => {
        const c = SillyTavern.getContext(), path = '/scripts/extensions/third-party/avereth-engine/';
        const {foldChat} = await import(path+'src/host.js');
        const {targetChoices} = await import(path+'src/hud.js');
        const {loadContentPack} = await import(path+'src/content.js');
        const content = await loadContentPack(async name => (await fetch(path+'content/'+name)).json());
        const state = foldChat(c.chat).state, idx = c.chat.length-2;
        const candidates = state.scene.present.filter(id=>id!=='pc');
        const box = document.createElement('div');
        box.id='rank263-clarification';
        box.innerHTML=targetChoices(state,content,candidates,idx);
        document.querySelector('#chat').append(box);
        return {text:c.chat[idx].mes, id:candidates[0]};
    });
    const choice = page.locator('#rank263-clarification button').first();
    await choice.click();
    const selected = await page.inputValue('#send_textarea');
    checks.targetChoicePreparesOnly = selected.startsWith(clarification.text) && selected.includes(clarification.id)
        && calls.length===readCount && JSON.stringify(await world())===JSON.stringify(bought.s);
    await page.fill('#send_textarea','');
    await page.locator('#rank263-clarification').evaluate(el=>el.remove());
    checks.onePurchase=bought.roles.join(',')==='narrator,extract' && bought.s.coin===99
        && bought.s.events.filter(e=>e.t==='transaction.completed').length===1 && bought.s.offers[fixed].status==='accepted'
        && ['Rations','Bandages'].every((name,i)=>Object.values(bought.s.objects).some(o=>o.name===name && o.holder?.entity==='pc' && o.qty===i+2));
    await seed();await source.selectOption('inventory');
    const lot=start.offers[bid].lines;
    await panel.locator('[data-row="'+lot[0].object+'"]').fill('2');
    await panel.locator('[data-row="'+lot[2].object+'"]').fill('1');
    await page.fill('#send_textarea','Who buys Skill Stones nearby?');
    const asked=await turn(panel.getByRole('button',{name:'Gebot erfragen',exact:true}));
    checks.quoteOnly=asked.roles.join(',')==='plan,narrator,extract' && asked.s.coin===120
        && asked.s.offers[bid].status==='open' && JSON.stringify(asked.s.objects)===JSON.stringify(start.objects)
        && asked.s.events.filter(e=>e.t==='decision.opened').length===2;
    await seed();await source.selectOption(bid);
    const sold=await turn(panel.getByRole('button',{name:'Verkaufen · 352 cp',exact:true}));
    checks.originalSale=sold.roles.join(',')==='narrator,extract' && sold.s.coin===472
        && sold.s.events.filter(e=>e.t==='object.moved').length===5 && sold.s.offers[bid].status==='accepted'
        && Object.values(sold.s.objects).some(o=>/skill stone/i.test(o.name) && o.holder?.entity==='pc');
    checks.savedAndReloaded=timings.every(t=>t.timing.verified && t.reloaded)
        && [asked,bought,sold].every(t=>t.s.errors.length===0 && t.s.applied==='applied');
    const afterTrade=calls.length;
    await seed(13);
    const primers=panel.locator('input[data-row]');
    checks.guildSameView=await primers.count()===5 && (await source.inputValue()).includes('manuals')
        && (await panel.innerText()).includes('Primer of Strike') && (await panel.innerText()).includes('1 for 80 cp');
    await seed(27);
    if (!await stats.evaluate(e=>e.open)) await stats.locator('summary').click();
    const before=await world(), assign=stats.getByRole('button',{name:'Verteilung vorbereiten'});
    await stats.locator('[data-row="INT"]').fill('3');await stats.locator('[data-row="WIL"]').fill('2');
    await page.fill('#send_textarea','Keep my draft.');await assign.click();
    checks.keepExistingDraft=(await page.inputValue('#send_textarea'))==='Keep my draft.';
    await page.fill('#send_textarea','');await assign.click();
    checks.assignDraft=await page.inputValue('#send_textarea')==='#assign INT 3 WIL 2'
        && calls.length===afterTrade && JSON.stringify(await world())===JSON.stringify(before);
    await page.click('#send_but');await idle();
    await page.evaluate(()=>SillyTavern.getContext().reloadCurrentChat());onReload();await idle();
    const assigned=await world();
    checks.assignReload=assigned.points===0 && assigned.stats.INT===before.stats.INT+3
        && assigned.stats.WIL===before.stats.WIL+2 && !assigned.errors.length && calls.length===afterTrade;
    if (process.env.AVERETH_USER15_CHAT) {
        const original = fs.readFileSync(process.env.AVERETH_USER15_CHAT, 'utf8').trim().split('\n').slice(1).map(JSON.parse);
        await seed(73,original);
        await source.selectOption('offer.t72.3');
        const old = await world();
        await panel.locator('[data-row="l1"]').fill('1');
        await panel.locator('[data-row="l2"]').fill('1');
        const inn = await turn(panel.getByRole('button',{name:'Kaufen · 5 cp',exact:true}),true);
        checks.user15Inn = inn.roles.join(',') === 'narrator,extract' && inn.s.coin === old.coin-5
            && inn.s.events.filter(e => e.t === 'transaction.completed').length === 1
            && inn.s.events.filter(e => e.t === 'service.granted').map(e=>e.d.service).join(',') === 'lodging,meal'
            && inn.s.clock === old.clock;
        await seed(29,original);
        const rest = page.locator('#avereth-rest'), prior = await world(), count = calls.length;
        await rest.locator('summary').click();
        await rest.getByLabel('Rastdauer',{exact:true}).selectOption('120');
        await rest.getByRole('button',{name:'Rast beginnen'}).click();
        await idle();
        await page.evaluate(()=>SillyTavern.getContext().reloadCurrentChat());onReload();await idle();
        const rested = await world();
        checks.user15Rest = calls.length === count && rested.clock === prior.clock+120
            && rested.events.filter(e=>e.t==='pulse.rolled').length===1;
        await seed(125,original);
        const reads = calls.length;
        await page.fill('#send_textarea','#item superior F-Rank sceptre');
        await page.click('#send_but');await idle();
        checks.user15Item = calls.length === reads && /MATK 18/.test(await page.locator('#chat .mes').last().innerText());
    }
    fs.writeFileSync(out+'/trade-hud.json',JSON.stringify({checks,timings},null,2));
    return checks;
}
