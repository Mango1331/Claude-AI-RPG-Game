import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

import {observeTurn} from './observe.mjs';

function intention(n,state){
    const quests=Object.values(state.quests).filter(q=>q.kind==='guild_contract').sort((a,b)=>a.level-b.level);
    const q=quests.find(q=>q.status==='active')||quests.find(q=>q.status==='listed');
    const site=q?.objectives?.[0]?.where;
    const present=state.scene.present.filter(id=>id!=='pc'&&state.entities[id]?.kind!=='monster');
    const npc=present.map(id=>state.entities[id]?.name).filter(Boolean)[0]||'the guild clerk';
    const actions=[
        ['membership','I show my guild plate to the clerk. Please confirm that my Novice membership is active, and tell me your name.'],
        ['board','I read the official Novice quest board and look through the available contracts.'],
        ['accept',q?'I accept the official guild contract "'+q.title+'".':'I ask the clerk whether there is a beginner contract available today.'],
        ['agreement','I ask '+npc+' to promise to keep my blue route note at the desk until I come back. Will you do that?'],
        ['combined','I step aside, check the condition of my staff, and look around the hall for the safest way out.'],
        ['recall','I return to the desk and ask what we agreed about my blue route note.'],
        ['travel',site?'I leave the guild and travel to '+site+' for the contract "'+q.title+'".':'I leave the guild and walk to the city gate to scout the road.'],
        ['track',q?'I scout the marked site for the quarry from the contract "'+q.title+'", keeping my staff ready.':'I look for tracks and listen for movement ahead.'],
        ['approach',q?'I follow the tracks into sight of the quarry, ready to confront it without approaching bystanders.':'I advance along the trail and listen carefully.'],
        ['finish','I inspect the evidence around me and check my equipment before deciding whether to return to the guild.'],
    ];
    return actions[n-1];
}

async function pickHud(page){
    const choice=page.locator('[data-avereth-action="skill:mage.arcane_wave"]:visible:not([disabled])').first();
    if(!await choice.count())return false;
    await choice.click();
    const band=page.locator('[data-avereth-band]:visible:not([disabled])').first();
    if(await band.count())await band.click();
    return true;
}

export async function play({hosts,gate,readRecords,save,root,hash,engine,delay}){
    const turns=[];
    for(let n=1;n<=10;n++)for(const arm of ['A','B']){
        const {driver,page,foldChat}=hosts[arm], before=await driver.chat(),state=foldChat(before).state;
        if(state.entities.pc.status==='dead')throw Error(arm+' character dead');
        assert(await driver.verifySaved(before,{complete:true}));assert(!(await driver.probe()).busy);
        const [intent,base]=intention(n,state);
        const hud=!!state.encounter && await pickHud(page);
        const action=hud ? '' : base;
        await page.fill('#send_textarea',action);
        await page.evaluate(observeTurn,{index:before.length+1});
        gate(arm,'main',n);
        await page.click('#send_but');
        let terminal=false;
        for(let i=0;i<1800;i++){
            const issue=readRecords().find(r=>r.kind==='end'&&!r.ok);
            if(issue)throw Error('physical gate stopped at request '+issue.id);
            const result=await page.evaluate(()=>({ready:!!window.abTurn?.marks.ready,status:document.querySelector('#avereth-action-status')?.textContent}));
            if(result.ready){terminal=true;break;}
            if(/Remoteabschluss unbekannt|Speichern fehlgeschlagen/.test(result.status||''))throw Error('host gate: '+result.status);
            await delay(500);
        }
        if(!terminal)throw Error('turn did not reach verified read-back and UI readiness');
        const after=await driver.chat(),reply=after.at(-1);
        const record=reply.extra?.avereth;
        assert(after.length===before.length+2 && !reply.is_user && record?.extraction?.status==='applied');
        assert(await driver.verifySaved(after,{complete:true}));
        const measured=await page.evaluate(()=>{const s=window.abTurn;s.stop();return {marks:s.marks,firstSentence:s.firstSentence,finalRendered:s.finalRendered,world:s.world};});
        assert(measured.marks.ready && measured.marks.confirmedSave);
        gate(null,'closed');
        await page.evaluate(()=>SillyTavern.getContext().reloadCurrentChat());
        const reloaded=await driver.chat(),fold=foldChat(reloaded);
        assert.deepEqual(fold.errors,[]);assert.deepEqual(fold.state,foldChat(after).state);
        assert.equal(hash(reloaded.map(m=>m.extra?.avereth?.events||[])),hash(after.map(m=>m.extra?.avereth?.events||[])));
        assert(await driver.verifySaved(reloaded,{complete:true}));
        const physical=readRecords().filter(r=>r.stage==='main'&&r.turn===n&&r.arm===arm);
        const end=physical.filter(r=>r.kind==='end');assert.equal(end.length,physical.filter(r=>r.kind==='start').length);
        const durable={world:fold.state,player:after.at(-2),reply,eventsHash:hash(reloaded.map(m=>m.extra?.avereth?.events||[]))};
        save('turn-'+arm+n+'.json',durable);
        const item={arm,n,intent:hud?'hud-skill':intent,action:after.at(-2).mes,worldHash:hash(fold.state),readback:true,requests:end.map(x=>x.id),measured};
        turns.push(item);save('turns.json',turns);
        console.log('saved',arm,n,item.intent,end.length,Math.round(measured.marks.ready-measured.marks.click));
    }
    save('main-complete.json',{turns:turns.length});
    while(!fs.existsSync(path.join(root,'optional.ready')))await delay(500);
    const {optional}=await import('./optional.mjs');
    await optional({hosts,gate,readRecords,save,root,hash,engine,delay,turns});
}
