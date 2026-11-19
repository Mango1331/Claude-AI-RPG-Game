import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {observeTurn} from './observe.mjs';

export async function optional({hosts,gate,readRecords,save,root,hash,engine,delay}){
    save('clocks.json',Object.fromEntries(await Promise.all(Object.entries(hosts).map(async ([arm,h])=>[arm,await h.page.evaluate(()=>({origin:performance.timeOrigin,epoch:Date.now(),monotonic:performance.now()}))]))));
    const {page,driver,foldChat,inst,card,repo}=hosts.B;
    const {pendingChat}=await engine('B','tools/bench_extract.mjs');
    const {parseServerLog}=await engine('B','tools/run_report.mjs');
    const finalChat=await driver.chat(), identity=await driver.identity();
    const mainFile=path.join(inst.user,'chats',card,identity.chatId+'.jsonl');
    const source=fs.readFileSync(mainFile,'utf8');
    const header=JSON.parse(source.split('\n')[0]);
    const presetDir=path.join(repo,'avereth-engine/presets');
    const orders=['Avereth Narrator V4','Avereth Narrator V4 - Card before Lore'].map(n=>JSON.parse(fs.readFileSync(path.join(presetDir,n+'.json'))).prompt_order);
    const results=[];
    const starts=()=>readRecords().filter(r=>r.kind==='start');
    function wire(id){
        const all=starts().filter(r=>r.arm==='B');
        const i=all.findIndex(r=>r.id===id);
        const {pairs,errors}=parseServerLog(fs.readFileSync(path.join(root,'B-st.log'),'utf8'));
        assert.deepEqual(errors,[]);
        assert(i>=0 && pairs[i]?.req?.messages);
        return JSON.parse(JSON.stringify(pairs[i].req.messages));
    }
    async function waitFor(fn){
        for(let i=0;i<1800;i++){
            const issue=readRecords().find(r=>r.kind==='end'&&!r.ok);
            if(issue)throw Error('upstream stop '+issue.id);
            if(await fn())return;
            await delay(500);
        }
        throw Error('Optional host did not reach a verified terminal state');
    }
    async function setup(name,messages,stage,turn,compact,order){
        const file=path.join(inst.user,'chats',card,name+'.jsonl');
        fs.writeFileSync(file,[header,...messages].map(j=>JSON.stringify(j)).join('\n')+'\n',{flag:'wx'});
        await page.evaluate(({compact,order})=>{const c=SillyTavern.getContext();c.extensionSettings.avereth.compactOutput=compact;c.chatCompletionSettings.prompt_order=order;}, {compact,order});
        gate('B',stage,turn);
        await page.evaluate(name=>SillyTavern.getContext().openCharacterChat(name),name);
        driver.testChat=await driver.identity();
        assert.equal(driver.testChat.chatId,name);
    }
    const archive=path.join(process.env.AVERETH_MAIN,'testrun_10b/user-20261119-010838/originals');
    const historical=fs.readFileSync(path.join(archive,fs.readdirSync(archive).find(f=>f.endsWith('.jsonl'))),'utf8').trim().split('\n').map(JSON.parse).slice(1);
    const optionalTurns={extractor:[3,4,7],preset:[1,4,'U06-I21']};
    for(const [family,selected] of Object.entries(optionalTurns))for(const [pair,turn] of selected.entries()){
        const combat=turn==='U06-I21';
        const reserve=family==='extractor'?6:combat?14:8;
        if(120-starts().length<reserve){results.push({family,turn,status:'NOT RUN',reason:'budget'});save('optional.json',results);continue;}
        const id=combat?22:11+turn*2-1,baseline=combat?historical.slice(0,21):finalChat.slice(0,id+1);
        assert(!baseline.at(-1).is_user && baseline.at(-1).extra.avereth.extraction.status==='applied');
        const messages=family==='extractor'?pendingChat(baseline,id):baseline;
        const pairRows=[], wires={};
        for(const variant of (pair%2?[1,0]:[0,1])){
            const stage=family+'-'+variant,name='AB-'+stage+'-'+turn,from=starts().length;
            await setup(name,messages,stage,turn,family==='extractor'&&!!variant,orders[family==='preset'?variant:0]);
            if(family==='preset'){
                assert.deepEqual(foldChat(await driver.chat()).state,foldChat(messages).state);
                if(combat){
                    const skill=page.locator('[data-avereth-select-skill="mage.arcane_wave"]:not([disabled]),[data-avereth-action="skill:mage.arcane_wave"]:not([disabled])').last();
                    await skill.evaluate(button=>{for(let p=button.parentElement;p;p=p.parentElement)if(p.matches('details'))p.open=true;});
                    await skill.click();
                    await page.locator('[data-avereth-band="ENGAGED"]').click();
                    await page.fill('#send_textarea','');
                    await page.evaluate(observeTurn,{index:id});
                    await page.click('#send_but');
                }else{
                    await page.evaluate(observeTurn,{index:id,regenerate:true});
                    await page.evaluate(()=>SillyTavern.getContext().generate('regenerate'));
                }
            }
            await waitFor(async()=> {
                const ends=readRecords().filter(r=>r.kind==='end'&&r.id>from);
                if(!ends.some(r=>r.role==='extractor'))return false;
                return page.evaluate(id=>{const c=SillyTavern.getContext();return c.chat[id]?.extra?.avereth?.extraction?.status==='applied'&&
                    document.querySelector('#avereth-action-status')?.textContent==='Gespeichert'&&!document.querySelector('#mes_stop')?.checkVisibility();},id);
            });
            const after=await driver.chat();
            const measured=family==='preset' ? await page.evaluate(()=>{const s=window.abTurn;s.stop();return {marks:s.marks,firstSentence:s.firstSentence,finalRendered:s.finalRendered};}):null;
            assert(await driver.verifySaved(after,{complete:true}));gate(null,'closed');
            await page.evaluate(()=>SillyTavern.getContext().reloadCurrentChat());
            const reloaded=await driver.chat();
            assert(await driver.verifySaved(reloaded,{complete:true}));
            const state=foldChat(reloaded);assert.deepEqual(state.errors,[]);assert.deepEqual(state.state,foldChat(after).state);
            const calls=readRecords().filter(r=>r.kind==='start'&&r.id>from);
            const main=calls.find(r=>r.role===(family==='preset'?'narrator':'extractor'));
            assert(main && calls.filter(r=>r.id>main.id).every(r=>r.role==='extractor'));
            if(combat)assert.equal(reloaded[id-1].extra?.avereth_action_input?.selection?.skill,'mage.arcane_wave');
            wires[variant]=wire(main.id);
            const row={family,turn,variant,sourceProseHash:hash(messages.at(-1).mes),sourceWorld:hash(foldChat(messages).state),readback:true,measured,
                ids:calls.map(r=>r.id),stateHash:hash(state.state),events:reloaded[id].extra.avereth.events,prose:reloaded[id].mes};
            save(name+'.json',{...row,world:state.state,player:reloaded[id-1],reply:reloaded[id]});pairRows.push(row);
        }
        const a=structuredClone(wires[0]),b=wires[1];
        if(family==='extractor'){
            assert(b[0].content.startsWith(a[0].content+'\nWrite compact single-line JSON.'));
            a[0].content=b[0].content;
        }else{
            const i=a.findIndex(m=>m.content.startsWith('AVERETH RPG'));
            assert(i>0);[a[i-1],a[i]]=[a[i],a[i-1]];
        }
        const sameLogicalInput=JSON.stringify(a)===JSON.stringify(b);
        results.push({family,turn,sameLogicalInput,rows:pairRows});save('optional.json',results);
        console.log('optional',family,turn,'comparable',sameLogicalInput);
    }
    assert.equal(fs.readFileSync(mainFile,'utf8'),source);
    gate(null,'closed');
}
