// Compare the POSTs received by the loopback provider after ST and Avereth have built the prompt.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');

export async function prefixSmoke({page, send, idle, calls, out, contract}) {
    const setup = await page.evaluate(() => {
        const c = SillyTavern.getContext();
        return { chat: c.chat.slice(0,5), order: c.chatCompletionSettings.prompt_order,
            postprocessing:c.chatCompletionSettings.custom_prompt_post_processing };
    });
    const original = setup.order;
    const reordered = structuredClone(original);
    for (const {order} of reordered) {
        const lore = order.findIndex(p => p.identifier === 'worldInfoBefore');
        const card = order.findIndex(p => p.identifier === 'charDescription');
        assert.equal(card,lore+1);
        [order[lore],order[card]]=[order[card],order[lore]];
    }
    const preset = name => JSON.parse(fs.readFileSync(new URL('../../presets/'+name+'.json',import.meta.url)));
    const standard = preset('Avereth Narrator V4');
    const alternative = preset('Avereth Narrator V4 - Card before Lore');
    assert.deepEqual(alternative,{...standard,prompt_order:reordered});
    const report = {postprocessing:setup.postprocessing, groups:[]};
    for (const long of [false,true]) {
        const arms = [];
        for (const order of [original,reordered]) {
            const requests = [];
            for (const topic of ['the clouds','Dungeon Rank and monster ecology']) {
                await page.evaluate(async ({prefix,order})=>{
                    const c=SillyTavern.getContext();
                    c.chat.splice(0,c.chat.length,...prefix);
                    Object.assign(c.chatCompletionSettings,{prompt_order:order,openai_max_context:32768,openai_max_tokens:4096});
                    await c.saveChat();
                    await c.reloadCurrentChat();
                },{prefix:setup.chat,order});
                const from=calls.length;
                const player='I ask about '+topic+'.'+(long?' I read the following marks aloud:'+' a'.repeat(16400)+'.':'');
                await send(player);
                await idle();
                const physical=calls.slice(from).filter(c=>c.purpose==='narrator');
                assert.equal(physical.length,1);
                assert.equal(physical[0].maxTokens,4096);
                assert(physical[0].messages.some(m=>m.role==='user' && m.content.includes(player)));
                requests.push(physical[0].messages);
            }
            arms.push(requests);
        }
        const hashes=[];
        for (let i=0;i<2;i++) {
            const a=arms[0][i],b=arms[1][i];
            const card=a.findIndex(m=>m.content.includes(contract.trim().slice(0,100)));
            assert(card>0,'character contract missing');
            const check=structuredClone(a);
            [check[card-1],check[card]]=[check[card],check[card-1]];
            assert.deepEqual(check.map(digest),b.map(digest),'final messages changed beyond card and lore');
            assert(a.some(m=>/ENGINE (?:STATE|OUTCOME)|\[AVERETH ENGINE|AVERETH ENGINE/i.test(m.content)), 'engine injection missing');
            hashes.push({length:a.length,card:digest(a[card]),lore:digest(a[card-1]),rest:digest(a.filter((_,n)=>n!==card && n!==card-1))});
        }
        const tokenReport=JSON.parse(execFileSync(process.env.AVERETH_TOKEN_PYTHON || 'python3',
            [new URL('./prefix_tokens.py',import.meta.url).pathname],{input:JSON.stringify(arms),encoding:'utf8'}));
        report.groups.push({long,hashes,...tokenReport});
        fs.writeFileSync(path.join(out,'prefix.json'),JSON.stringify(report,null,2));
        assert.notEqual(hashes[0].lore,hashes[1].lore,'topic failed to vary active lore');
        assert(tokenReport.prefix[1]>tokenReport.prefix[0]);
        if(long) assert(tokenReport.tokens.flat().every(n=>n>=24000 && n+4096<=32768),'outside planned 32K pressure range');
    }
    return {finalRequests:true,longContext:true};
}
