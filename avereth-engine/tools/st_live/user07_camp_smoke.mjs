import {watchInput, inputTiming} from './safe_input_timing.mjs';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const origin = 'loc.rise_above_the_goblin_camp';
const target = {new:{name:'goblin camp',kind:'site',parent:origin}};
const inspect = 'I look around the camp for ordinary equipment.';
const take = 'I pick up the clay bowl.';
const again = 'I inspect the camp equipment once more.';
const bowl = {seq:2,type:'object.new',name:'clay bowl',kind:'item',qty:1,unit:null,holder:'here',for_quest:null};
export const campTurns = [
    {key:'u07campview',player:inspect,plan:{commands:[{seq:1,type:'activity',kind:'search',what:'camp equipment',quote:inspect}]},
        reply:'Alaric walks down to the goblin camp. An abandoned clay bowl lies beside the cold hearth.',
        answer:{scene:target,expected:{1:{arrived:true,at:target}},deltas:[{seq:1,type:'arrive',at:target},bowl]}},
    {key:'u07camptake',player:take,plan:{commands:[{seq:1,type:'take',object:{new:'clay bowl'},quote:take}]},
        reply:'Alaric lifts the clay bowl from beside the cold hearth and puts it in his pack.',
        answer:{expected:{},deltas:[]}},
    {key:'u07campagain',player:again,plan:{commands:[]},
        reply:'Alaric looks over the hearth. An abandoned earthenware bowl lies where he saw the clay bowl before.',
        answer:{expected:{},deltas:[{...bowl,seq:1,name:'earthenware bowl'}]}}
];

export async function campSmoke({page,send,onReload,calls,worldTimings,out}) {
    // Same immutable pre-I22 revision as the offline regression. Only installed in the marked sandbox.
    const archived = execFileSync('git',['show','fc9e17936dcc78ba21e86b910948f9669b1a1747:testrun_10b/user-20261121-171341-204/ORIGINAL_CHAT_PHASE2.jsonl'],{encoding:'utf8',maxBuffer:16<<20});
    const prefix = archived.trim().split('\n').slice(1,44).map(JSON.parse);
    await page.evaluate(async chat => {
        const c = SillyTavern.getContext(); c.chat.splice(0,c.chat.length,...chat);
        await c.saveChat(); await c.reloadCurrentChat();
    },prefix);
    onReload();
    const snapshot = () => page.evaluate(async () => {
        const {foldChat} = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const c = SillyTavern.getContext(), {state:s,errors} = foldChat(c.chat);
        const last=c.chat.at(-1).extra?.avereth;
        return {at:s.scene.at, stock:s.places[s.scene.at]?.camp_stock, bowls:Object.values(s.objects).filter(o=>o.name.includes('bowl')).map(o=>({id:o.id,holder:o.holder,qty:o.qty})),
            coin:s.entities.pc.sheet.coin_cp, checks:s.last.outcome?.search_checks, quests:s.quests, errors,
            rejected:(last?.rejected||[]).map(r=>r.rule), applied:last?.extraction?.status};
    });
    const start=await snapshot(), rows=[];
    for(const t of campTurns){
        const n=calls.length, w=worldTimings.length, at=Date.now();
        await watchInput(page);
        await send(t.player);
        rows.push({world:await snapshot(),ms:Date.now()-at,requests:calls.slice(n).map(c=>({role:c.purpose,mockMs:c.durationMs})),timing:await inputTiming(page,worldTimings.slice(w))});
    }
    await page.evaluate(()=>SillyTavern.getContext().reloadCurrentChat());
    onReload(); const loaded=await snapshot();
    const [look,picked,repeat]=rows.map(r=>r.world);
    const checks={
        originalRise:start.at===origin && start.coin===43,
        confirmedApproach:look.at!==origin && look.checks?.length===0 && look.bowls.length===1 && look.bowls[0].holder.loc===look.at,
        deliberateTake:picked.bowls.length===1 && picked.bowls[0].id===look.bowls[0]?.id && picked.bowls[0].holder.entity==='pc',
        noRenewal:repeat.bowls.length===1 && repeat.stock?.length===1 && repeat.rejected.includes('camp_stock'),
        settled:rows.every(r=>r.timing.verified && r.world.applied==='applied' && !r.world.errors.length && r.world.coin===start.coin && JSON.stringify(r.world.quests)===JSON.stringify(start.quests)),
        reloaded:JSON.stringify(repeat)===JSON.stringify(loaded),
    };
    fs.writeFileSync(out+'/user07-camp.json',JSON.stringify({checks,rows},null,2));
    return checks;
}
