// Read the two offline outputs of tools/replay/user16_scene.mjs. Only the isolated host uses them.
import fs from 'node:fs';
import {join} from 'node:path';

const campaign = JSON.parse(fs.readFileSync(process.env.AVERETH_USER16_CHAIN, 'utf8'));
const returned = JSON.parse(fs.readFileSync(process.env.AVERETH_USER16_RETURN, 'utf8'));
export const tradeTurns = [{key:'user16Standpoint', player:campaign[37].mes,
    plan:JSON.parse(campaign[37].extra.avereth.plan.raw[0]), reply:campaign[38].mes,
    answer:campaign[38].extra.avereth.extraction.raw}];

export async function tradeHudSmoke({page,calls,idle,onReload,out}) {
    async function seed(messages) {
        await page.evaluate(async rows => {
            const ctx = SillyTavern.getContext();
            ctx.chat.splice(0,ctx.chat.length,...rows.map(row => ({...row,
                name:row.is_user ? ctx.name1 : ctx.name2, is_system:!!row.is_system})));
            await ctx.saveChat();
            await ctx.reloadCurrentChat();
        },messages);
        onReload();
        await idle();
    }
    const rest = page.locator('#avereth-rest');
    const button = rest.locator('button');
    const reason = rest.locator('#avereth-rest-reason');
    const input = page.locator('#send_textarea');
    const open = async () => {
        if (!(await rest.evaluate(el => el.open))) await rest.locator('summary').click();
    };
    async function send(text) {
        const start = calls.length;
        await input.fill(text);
        await page.locator('#send_but').click();
        await idle();
        return calls.slice(start);
    }
    await seed(campaign.slice(0,37));
    await open();
    const approach = await send(campaign[37].mes);
    const settled = await page.evaluate(()=>SillyTavern.getContext().chat.at(-1).extra.avereth);
    const released = !(await button.isDisabled());
    await input.fill('A draft');
    const protectedDraft = await button.isDisabled() && (await reason.textContent()).includes('Eingabetext');
    await input.fill('');
    await rest.getByLabel('Rastdauer',{exact:true}).selectOption('');
    await rest.locator('input').fill('0');
    const invalidDuration = await button.isDisabled();
    await rest.getByLabel('Rastdauer',{exact:true}).selectOption('30');
    await seed(returned);
    await open();
    const greeting = await send('I greet the clerk and ask what is new in town.');
    const wire = greeting.find(req=>req.purpose==='narrator').messages;
    const privateBlock = wire.map(m=>m.content).find(text=>text?.includes('Private recall for Alaric.'));
    const summary = reqs => reqs.map(({purpose,messages})=>({purpose,characters:messages.reduce((n,m)=>n+Array.from(m.content).length,0)}));
    fs.writeFileSync(join(out,'user16_scene_wire_sizes.json'),JSON.stringify({approach:summary(approach),greeting:summary(greeting)},null,2));
    const ready = !(await button.isDisabled());
    await rest.getByLabel('Rastdauer',{exact:true}).selectOption('30');
    const count = calls.length;
    await button.click();
    await idle();
    const restEvents = await page.evaluate(()=>SillyTavern.getContext().chat.findLast(m=>m.is_user).extra.avereth.events);
    return {
        originalInputAndProse:settled.extraction.status==='applied' && settled.events.some(e=>e.t==='scene.focus') &&
            settled.events.some(e=>e.t==='thread.set' && e.d.thread.text.includes('Tolmag')) && !settled.events.some(e=>e.t==='scene.moved'),
        sceneCallCount:approach.filter(req=>['plan','narrator','extract'].includes(req.purpose)).length===3 && approach.length===3,
        restoredAfterWorldSave:released && ready, protectedDraft, invalidDuration,
        recallInDeliveredNarration:!!privateBlock?.includes('if your information is true') && privateBlock.includes('Wenna banned him two years back'),
        restClosedPulse:calls.length===count && restEvents.filter(e=>e.t==='time.advanced' && e.d.minutes===30).length===1,
    };
}
