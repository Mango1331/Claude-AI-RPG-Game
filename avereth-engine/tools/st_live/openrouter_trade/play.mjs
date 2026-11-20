import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

import {observeTurn} from '../natural_ab/observe.mjs';

export async function play({hosts,gate,readRecords,save,root,hash,delay,pairCount=6,canary=false}){
    const turns=[];
    for(let n=1;n<=(canary?1:pairCount);n++)for(const arm of (canary?['A']:n%2 ? ['A','B']:['B','A'])){
        const {driver,page,foldChat,inst,card}=hosts[arm];
        const scenario=Math.ceil(n/2);
        const seed=fs.readFileSync(path.join(root,scenario===3?'combat-seed.jsonl':'guild-seed.jsonl'),'utf8');
        const stage=canary?'canary':'trade';
        const name='natural-'+stage+'-'+arm+'-'+n;
        fs.writeFileSync(path.join(inst.user,'chats',card,name+'.jsonl'),seed,{flag:'wx'});
        await page.evaluate(n=>SillyTavern.getContext().openCharacterChat(n),name);
        driver.testChat=await driver.identity();
        const before=await driver.chat(), state=foldChat(before).state;
        const original=seed.trim().split('\n').slice(1).map(JSON.parse);
        assert.deepEqual(state,foldChat(original).state);
        assert.deepEqual(before.map(m=>m.extra?.avereth), original.map(m=>m.extra?.avereth));
        const texts=[
          'Nessa, can you offer me one fine hand-axe for sale right now? What is your firm price for it? I only ask for the offer and keep my purse closed.',
          'Nessa, would you offer me a fine tower shield only on condition that the Guild first seals my permit? I do not have the seal yet. What price would apply once I have it? I am only asking about terms.',
          'Keeping my staff ready, I ask Nessa what firm price she can offer for a fine kite shield right now. May I have a strip of red cloth as a gift? Will you promise to carry a warning to the Guild when we are safe? I keep my coins and stay where I am.'
        ];
        if(state.entities.pc.status==='dead')throw Error(arm+' character dead');
        assert(await driver.verifySaved(before,{complete:true}));assert(!(await driver.probe()).busy);
        const action=texts[scenario-1];
        await page.fill('#send_textarea',action);
        await page.evaluate(observeTurn,{index:before.length+1});
        gate(arm,stage,n);
        await page.click('#send_but');
        let terminal=false;
        for(let i=0;i<1800;i++){
            const issue=readRecords().find(r=>r.kind==='end'&&!r.ok);
            if(issue)throw Error('physical gate stopped at request '+issue.id);
            const result=await page.evaluate(()=>({ready:!!window.abTurn?.marks.ready,status:document.querySelector('#avereth-action-status')?.textContent}));
            if(result.ready){terminal=true;break;}
            // The running stream is deliberately marked incomplete before its first token.
            // Only the pinned host's final player-facing panel denotes a rejected revision.
            const failed=await page.evaluate(i=>{
                const record=SillyTavern.getContext().chat[i]?.extra?.avereth;
                return record?.extraction?.status==='incomplete' &&
                    record?.panel==='Erzählung unvollständig – per Swipe oder Regenerate neu erzählen' &&
                    !document.querySelector('#mes_stop')?.checkVisibility();
            },before.length+1);
            if(failed) throw Error('ST rejected the completed narrator revision');
            const xFailed=await page.evaluate(i=>SillyTavern.getContext().chat[i]?.extra?.avereth?.extraction?.status==='failed',before.length+1);
            if(xFailed) throw Error('ST recorded an extractor failure');
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
        const physical=readRecords().filter(r=>r.stage===stage&&r.turn===n&&r.arm===arm);
        const end=physical.filter(r=>r.kind==='end');assert.equal(end.length,physical.filter(r=>r.kind==='start').length);
        const durable={world:fold.state,player:after.at(-2),reply,eventsHash:hash(reloaded.map(m=>m.extra?.avereth?.events||[]))};
        save((canary?'canary-turn-':'turn-')+arm+n+'.json',durable);
        fs.copyFileSync(path.join(inst.user,'chats',card,name+'.jsonl'),path.join(root,name+'.jsonl'));
        const item={arm,n,scenario,startWorld:hash(state),startEvents:hash(before.map(m=>m.extra?.avereth?.events||[])),action:after.at(-2).mes,worldHash:hash(fold.state),readback:true,requests:end.map(x=>x.id),measured};
        if(canary){
            const roles=end.map(r=>r.role);
            assert(/^(planner,)+narrator,(extractor,)*extractor$/.test(roles.join(',')));
            assert(physical.some(r=>r.kind==='start' && r.role==='narrator' && r.params.stream));
            assert(end.every(r=>r.ok) && measured.world.persisted && measured.world.record_changed);
            assert(!(await driver.probe()).busy);
            assert(await page.evaluate(()=>document.querySelector('#send_but')?.checkVisibility() &&
                !document.querySelector('#mes_stop')?.checkVisibility() &&
                !document.querySelector('#send_textarea')?.disabled));
        }
        turns.push(item);save(canary?'canary.json':'turns.json',turns);
        console.log('saved',arm,n,scenario,end.length,Math.round(measured.marks.ready-measured.marks.click));
    }
    save(canary?'canary-complete.json':'main-complete.json',{turns:turns.length});
}
