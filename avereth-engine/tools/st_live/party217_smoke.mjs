import fs from 'node:fs';
import path from 'node:path';
let replies;
export const partyResponse = purpose => replies?.[purpose];
export async function partySmoke({page,calls,send,idle,out,onReload}) {
    const base='/scripts/extensions/third-party/avereth-engine/';
    const original=fs.readFileSync(process.env.AVERETH_USER14_CHAT,'utf8').trim().split('\n').slice(1).map(JSON.parse);
    const who='npc.ossen',quest='quest.clear_the_old_crown_catacombs_level_1';
    const checks={}, measures=[];
    const measure=(stage,from)=>measures.push({stage,requests:calls.slice(from).map(c=>({role:c.purpose,characters:c.messages.reduce((n,m)=>n+m.content.length,0),ms:c.durationMs}))});
    async function seed(chat) {
        await page.evaluate(async chat=>{
            const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...chat);
            delete c.chatMetadata.pending_action_input;await c.saveChat();await c.reloadCurrentChat();
        },chat);onReload();await idle();
    }
    const snap=()=>page.evaluate(async base=>{
        const c=SillyTavern.getContext(),{foldChat}=await import(base+'src/host.js'),fold=foldChat(c.chat);
        return {length:c.chat.length,state:fold.state,errors:fold.errors,events:c.chat.flatMap(m=>m.extra?.avereth?.events || []),last:c.chat.at(-1).extra?.avereth?.extraction};
    },base);
    const command=(commands,narrator,deltas=[])=>{replies={plan:JSON.stringify({commands}),narrator,extract:JSON.stringify({scene:'here',expected:{},deltas})};};
    async function panel(kind) {
        const before=await snap(),count=calls.length;
        if(kind==='hud') await page.locator('[data-avereth-party]').last().click();
        else {await page.fill('#send_textarea','#party');if(kind==='enter') await page.press('#send_textarea','Enter');else await page.click('#send_but');}
        await page.waitForSelector('#avereth-party-panel[open]');
        const text=await page.locator('#avereth-party-panel').innerText();
        await page.locator('#avereth-party-panel button').click();
        const after=await snap();
        return /Ossen/.test(text) && before.length===after.length && JSON.stringify(before.state)===JSON.stringify(after.state) && calls.length===count;
    }
    try {
        await seed(original.slice(0,15));
        let b=calls.length;
        const words='Let us fight together, half each.';
        command([],'Ossen says, "'+words+'"',[{type:'party',seq:1,act:'offer',who,quest,share:'half',combat:true,quote:words}]);
        await send('Ossen, how would we work together?');await idle();measure('proposal',b);
        let current=await snap();const id=Object.keys(current.state.party?.agreements || {})[0];
        if (!id) throw Error('Party offer failed: '+JSON.stringify(current.last).slice(0,900));
        const yes='Yes, I accept.';b=calls.length;
        command([{type:'party',seq:1,act:'accept',who,agreement:id,quote:yes}],
            'Ossen says, "I am a scout. Bows and traps are my trade."', [{seq:1,type:'fact',s:who,p:'occupation',o:'Scout — bows and traps'}]);
        await send(yes);await idle();measure('accept',b);
        current=await snap();checks.join=current.state.party?.members[who]?.combat===true && current.state.entities[who].sheet?.class==='rogue';
        checks.enter=await panel('enter');checks.send=await panel('send');checks.hud=await panel('hud');
        const membership=current.events.filter(e=>e.t.startsWith('party.') || e.t==='entity.sheet_set' && e.d.id===who);
        const combat=structuredClone(original.slice(0,23));combat.at(-1).extra.avereth.events.push(...membership);
        await seed(combat);b=calls.length;
        const target='mon.old_crown_catacombs_c1_l1_e1_1',text='I cast Flame Lance at Risen Bones A.';
        command([{seq:1,type:'use_skill',skill:'mage.flame_lance',target,quote:text}],'Fire strikes the bones. Ossen draws his bow.');
        await send(text);await idle();measure('first grouped attack',b);
        current=await snap();checks.groupCombat=!!current.state.encounter?.line;
        checks.realArrow=current.state.entities[who].sheet.inventory.standard_arrow<20;
        const second='Ossen, protect me. I hold my position.';b=calls.length;
        command([{seq:1,type:'party',act:'coordinate',who,priority:'protect',target:'pc',quote:'Ossen, protect me.'},{seq:2,type:'wait',quote:'I hold my position.'}],'Ossen covers Alaric.');
        await send(second);await idle();measure('coordination',b);
        current=await snap();checks.priority=current.state.party.members[who].priority?.kind==='protect';
        await page.evaluate(async()=>{const c=SillyTavern.getContext();await c.saveChat();await c.reloadCurrentChat();});onReload();await idle();
        const loaded=await snap();checks.reload=loaded.errors.length===0 && JSON.stringify(loaded.state)===JSON.stringify(current.state);
        const pending=structuredClone(original);pending.at(-1).extra.avereth.events.push(...membership);
        await seed(pending.slice(0,-1)); // insert original pending assistant locally, without launching a job
        await page.evaluate(msg=>SillyTavern.getContext().chat.push(msg),pending.at(-1));
        checks.pendingPanel=await panel('enter');
        return checks;
    } finally {replies=null;fs.writeFileSync(path.join(out,'party217.json'),JSON.stringify({checks,measures},null,2));}
}
