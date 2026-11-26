import {estimateTokens} from '../../src/util.js';
import fs from 'node:fs';
import path from 'node:path';
let replies;
export const partyResponse = (purpose,request) => typeof replies?.[purpose]==='function' ? replies[purpose](request) : replies?.[purpose];
export async function partySmoke({page,calls,send,idle,out,onReload}) {
    const base='/scripts/extensions/third-party/avereth-engine/';
    const original=fs.readFileSync(process.env.AVERETH_USER14_CHAT,'utf8').trim().split('\n').slice(1).map(JSON.parse);
    const who='npc.ossen',quest='quest.clear_the_old_crown_catacombs_level_1';
    const checks={}, measures=[];
    const measure=(stage,from)=>measures.push({stage,requests:calls.slice(from).map(c=>({role:c.purpose,characters:c.messages.reduce((n,m)=>n+m.content.length,0),estimatedTokens:c.messages.reduce((n,m)=>n+estimateTokens(m.content),0),ms:c.durationMs}))});
    async function seed(chat) {
        await page.evaluate(async chat=>{
            const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...chat);
            delete c.chatMetadata.pending_action_input;await c.saveChat();await c.reloadCurrentChat();
        },chat);onReload();await idle();
    }
    const snap=()=>page.evaluate(async base=>{
        const c=SillyTavern.getContext(),{foldChat}=await import(base+'src/host.js'),fold=foldChat(c.chat);
        return {length:c.chat.length,state:fold.state,errors:fold.errors,events:c.chat.flatMap(m=>m.extra?.avereth?.events || []),last:c.chat.at(-1).extra?.avereth?.extraction,perf:c.chat.findLast(m=>m.is_user)?.extra?.avereth?.perf,context:c.chat.at(-1).extra?.avereth?.narration?.context};
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
        const originalMember=JSON.stringify(current.state.party.members);
        b=calls.length;
        await page.locator('#chat .last_mes .swipe_right').click();await idle();measure('swipe',b);
        checks.swipe=JSON.stringify((await snap()).state.party.members)===originalMember;
        checks.enter=await panel('enter');checks.send=await panel('send');checks.hud=await panel('hud');
        const membership=current.events.filter(e=>e.t.startsWith('party.') || e.t==='entity.sheet_set' && e.d.id===who);
        const combat=structuredClone(original.slice(0,23));combat.at(-1).extra.avereth.events.push(...membership,
            {t:'scene.position',d:{id:who,band:'ENGAGED',cover:'none'}});
        // The scout is at Alaric’s shoulder for this variant. The original pre-combat scene put him by the skeletons.
        await seed(combat);b=calls.length;
        const target='mon.old_crown_catacombs_c1_l1_e1_1',text='I use Basic Attack on Risen Bones A.';
        command([{seq:1,type:'use_skill',skill:'mage.basic_attack',target,quote:text}],'Fire strikes the bones. Ossen draws his bow.');
        await send(text);await idle();measure('first grouped attack',b);
        current=await snap();measures.at(-1).perf=current.perf;measures.at(-1).context=current.context;checks.groupCombat=current.events.some(e=>e.t==='encounter.started' && !!e.d.encounter.line);
        checks.realArrow=current.state.entities[who].sheet.inventory.standard_arrow<20;
        const second='Ossen, protect me.';b=calls.length;
        command([{seq:1,type:'party',act:'coordinate',who,priority:'protect',target:'pc',quote:'Ossen, protect me.'}],'Ossen covers Alaric.');
        await send(second);await idle();measure('coordination',b);
        current=await snap();checks.priority=current.state.party.members[who].priority?.kind==='protect';
        await page.evaluate(async()=>{const c=SillyTavern.getContext();await c.saveChat();await c.reloadCurrentChat();});onReload();await idle();
        const loaded=await snap();checks.reload=loaded.errors.length===0 && JSON.stringify(loaded.state)===JSON.stringify(current.state);
        // User13 continuation with an explicitly synthetic combat-ready Ossen, same hostile identities and sheets.
        const bandits=fs.readFileSync(process.env.AVERETH_USER13_CHAT,'utf8').trim().split('\n').slice(1,20).map(JSON.parse);
        await seed(bandits);
        const events=await page.evaluate(async({base,membership,person,who})=>{
            const [{foldChat},{applyEvent},{initEncounter},{Dice},cm]=await Promise.all(
                ['host','state','combat','rng','content'].map(f=>import(base+'src/'+f+'.js')));
            const content=await cm.loadContentPack(async n=>(await fetch(base+'content/'+n)).json());
            const s=foldChat(SillyTavern.getContext().chat).state, original=s.encounter;
            const events=[{t:'entity.created',d:{entity:person}},{t:'scene.entered',d:{id:who,band:'SHORT'}},...membership];
            events.forEach(e=>applyEvent(s,e));
            const foes=Object.values(original.combatants).filter(c=>c.side==='hostile');
            const enc=initEncounter(s,content,Dice.from(s),{actor:'pc',target:foes[0].id,engage:true},
                foes.map(c=>({id:c.id,side:'hostile'})),'st-party-surrender',{c:true});
            enc.order=['pc',...enc.order.filter(id=>id!=='pc')];enc.current='pc';enc.turn_index=0;enc.round=1;enc.trigger_done=true;
            return [...events,{t:'encounter.updated',d:{encounter:enc}}];
        },{base,membership,person:current.state.entities[who],who});
        bandits.at(-1).extra.avereth.events.push(...events);
        await seed(bandits);
        const nb=(await snap()).state.encounter;
        const leader='npc.npctollcudgel',label=nb.combatants[leader].label;
        const statement=label+' accepts the offer.',surrender='I surrender.';
        command([{seq:1,type:'surrender',target:null,terms:[],quote:surrender}],statement);
        replies.extract=req=>{const input=JSON.parse(req.messages.at(-1).content);
            return JSON.stringify({offer:input.offer,choice:'accept',speaker:leader,members:[{id:leader,evidence:statement}],evidence:statement,terms:[]});};
        b=calls.length;await send(surrender);await idle();measure('individual settlement in party',b);
        const agreed=(await snap()).state.encounter;checks.partialPeace=!!agreed?.agreements?.some(a=>
            a.pairs?.some(([x,y])=>x===leader && y==='pc') && !a.pairs.some(pair=>pair.includes(who)));
        const secondId='npc.garrick', trio=structuredClone(combat);
        // Synthetic accepted invitation for the third participant, in an isolated copy of the same encounter entrance.
        const threeEvents=[{t:'scene.entered',d:{id:secondId,band:'SHORT'}},
            {t:'party.agreement',d:{id:'variant.garrick',who:secondId,phase:'accepted',proposer:secondId,terms:{combat:true,text:'I will fight alongside you.'},previous:0}},
            {t:'party.member',d:{who:secondId,mode:'follow',at:'loc.old_crown_catacombs.l1_s1',agreement:'variant.garrick',combat:true,previous:0}}];
        const profile=await page.evaluate(async({base,chat,events,secondId})=>{
            const [{foldChat},{Dice},{materialise},{applyEvent},cm]=await Promise.all(['host','rng','engine','state','content'].map(f=>import(base+'src/'+f+'.js')));
            const content=await cm.loadContentPack(async n=>(await fetch(base+'content/'+n)).json());
            const s=foldChat(chat).state;events.forEach(e=>applyEvent(s,e));
            const out=[];materialise(s,content,Dice.from(s),e=>{applyEvent(s,e);out.push(e);},secondId);return out;
        },{base,chat:trio,events:threeEvents,secondId});
        trio.at(-1).extra.avereth.events.push(...threeEvents,...profile);
        for (const [k,prefix] of [[0,original.slice(0,23)],[2,trio]]) {
            await seed(prefix);command([{seq:1,type:'use_skill',skill:'mage.basic_attack',target,quote:text}],'The attack strikes the bones.');
            b=calls.length;await send(text);await idle();measure('same attack, '+k+' companions',b);
            const actual=await snap();measures.at(-1).perf=actual.perf;measures.at(-1).context=actual.context;
            checks['composition'+k]=actual.events.some(e=>e.t==='encounter.started' &&
                (e.d.encounter.participation ? Object.keys(e.d.encounter.participation).length-1 : 0)===k);
        }
        const pending=structuredClone(original);pending.at(-1).extra.avereth.events.push(...membership);
        await seed(pending.slice(0,-1)); // insert original pending assistant locally, without launching a job
        await page.evaluate(msg=>SillyTavern.getContext().chat.push(msg),pending.at(-1));
        checks.pendingPanel=await panel('enter');
        return checks;
    } finally {replies=null;fs.writeFileSync(path.join(out,'party217.json'),JSON.stringify({checks,measures},null,2));}
}
