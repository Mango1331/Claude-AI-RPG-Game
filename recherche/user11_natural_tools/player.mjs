import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const arm=process.argv[2], eng=path.resolve(process.env.TRUST_ENGINE), stDir=process.env.AVERETH_ST_DIR;
const shared=process.env.AVERETH_AB_DIR, root=path.join(shared,arm);
assert(['B','C'].includes(arm));
assert(!process.env.OPENROUTER_API_KEY && !process.env.FEATHERLESS_API_KEY);
const load=f=>import(path.join(eng,f));
const {Driver,loadPlaywright}=await load('tools/st_live/live/driver.mjs');
const {startServer}=await load('tools/st_live/live/server.mjs');
const {createInstance,writeConfig,seedProfile,chatFiles}=await load('tools/st_live/live/profile.mjs');
const {PRESET_TO_SETTINGS}=await load('tools/st_live/live/import_profile.mjs');
const {observeTurn}=await import(path.resolve(process.env.AVERETH_TRADE_TOOLS,'../natural_ab/observe.mjs'));
const {foldChat}=await load('src/host.js');
const file=k=>path.join(root,k), read=k=>JSON.parse(fs.readFileSync(file(k)));
const write=(p,v)=>{fs.writeFileSync(p+'.tmp',JSON.stringify(v,null,2)+'\n');fs.renameSync(p+'.tmp',p);};
const save=(k,v)=>write(file(k),v), gate=v=>write(path.join(shared,'gate.json'),v);
const journal=(k,obj)=>fs.appendFileSync(file(k),JSON.stringify(obj)+'\n'), wait=ms=>new Promise(r=>setTimeout(r,ms));
const git=(repo,...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const head=git(eng,'rev-parse','HEAD');
assert.equal(git(eng,'status','--porcelain','.'),'');
assert.equal(git(stDir,'rev-parse','HEAD'),'7e8663cd9c184a550b37238218bdd32c6efc68e9');
const baseline='cb1eb944a041b26be9210199d780be9ff740f74d';
assert.equal(git(eng,'rev-parse',head+'^'),baseline);
assert.equal(head,process.env.TRUST_PIN);
const statsFile=path.join(shared,'physical.jsonl');
function observeRequests() {
    let offset=fs.existsSync(statsFile)?fs.statSync(statsFile).size:0, pending='';
    const ended=[];
    const started=new Set();
    return () => {
        if (!fs.existsSync(statsFile)) return {ended,open:started.size};
        const size=fs.statSync(statsFile).size;
        if(size===offset)return {ended,open:started.size};
        const fd=fs.openSync(statsFile,'r'), chunk=Buffer.alloc(size-offset);
        try {fs.readSync(fd,chunk,0,chunk.length,offset);}finally{fs.closeSync(fd);}
        offset=size;
        const lines=(pending+chunk.toString('utf8')).split('\n');pending=lines.pop();
        for(const line of lines){const e=JSON.parse(line);if(e.arm!==arm || e.turn!==n)continue;if(e.kind==='start')started.add(e.id);if(e.kind==='end'){started.delete(e.id);ended.push(e);}}
        return {ended,open:started.size};
    };
}
const originalPath=path.join(process.env.AVERETH_MAIN,'testrun_10b/user-20261123-042623-207/originals/chat.jsonl');
const original=fs.readFileSync(originalPath,'utf8').trim().split('\n').slice(1,6).map(JSON.parse);
const card=original[0].name;
const inst=createInstance({runId:arm,base:root,runDir:root});
const port=arm==='B'?18541:18542, proxyPort=arm==='B'?18551:18552;
writeConfig(inst,port);
const start=tag=>startServer({stDir,inst,port,logFile:file(tag+'.log'),timedFile:file(tag+'-timed.log')});
const boot=await start('boot');await boot.stop();
const preset='Avereth Narrator V4',raw=fs.readFileSync(path.join(eng,'presets',preset+'.json'),'utf8');
const generation=Object.fromEntries(Object.entries(JSON.parse(raw)).map(([k,v])=>[PRESET_TO_SETTINGS[k]||k,v]));
const seeded=seedProfile(inst,{username:'Alaric',card:{name:card,first_mes:original[0].mes},preset:{name:preset,text:raw},generation,
    connection:{chat_completion_source:'custom',custom_url:'http://127.0.0.1:'+proxyPort+'/v1',custom_model:'z-ai/glm-5.3-flash',custom_include_body:'reasoning:\n  effort: low',custom_include_headers:'',custom_exclude_body:'',custom_prompt_post_processing:''},source:'custom'});
const sf=path.join(inst.user,'settings.json'), settings=JSON.parse(fs.readFileSync(sf));
settings.oai_settings.stream_openai=true;settings.power_user.smooth_streaming=false;fs.writeFileSync(sf,JSON.stringify(settings));
const server=await start('st');
const browser=await loadPlaywright().chromium.launch({executablePath:process.env.AVERETH_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const dr=await Driver.create(browser,{turnTimeoutMs:900000}), p=dr.page;
let n=0, seen=0, blocked=false;
async function capture(n) {
    const ch=await dr.chat(); assert(await dr.verifySaved(ch,{complete:true})); const before=foldChat(ch);assert.deepEqual(before.errors,[]);
    const ev=ch.map(m=>m.extra?.avereth?.events||[]);
    await p.evaluate(async()=>{await SillyTavern.getContext().reloadCurrentChat();});
    await p.waitForFunction(len=>SillyTavern.getContext().chat.length===len,ch.length);
    const fresh=await dr.chat();assert(await dr.verifySaved(fresh,{complete:true}));
    const f=foldChat(fresh);assert.deepEqual(f.errors,[]);assert.deepEqual(f.state,before.state);assert.deepEqual(ev,fresh.map(m=>m.extra?.avereth?.events||[]));
    const actual=chatFiles(inst,card).find(f=>path.basename(f,'.jsonl')===dr.testChat.chatId);
    assert(actual);fs.copyFileSync(actual,file('chat.jsonl'));save('world-'+n+'.json',f.state);save('events.json',ev);
    return {world:digest(f.state),events:digest(ev),messages:fresh.length};
}
async function visible() {
    const v=await dr.view({back:n===0?4:0});
    const controls=await p.evaluate(()=>[...document.querySelectorAll('#chat .mes:last-child button,#avereth-action-choices button,#avereth-action-targets button,#avereth-action-send')].filter(e=>e.checkVisibility()&&!e.disabled).map(e=>e.innerText || e.title));
    save('visible.json',{messages:v.messages,hud:v.hud,controls,toasts:v.toasts});
}
try {
    assert((await dr.open(server.url)).connected);
    await dr.openCard(card);
    const runtimeFiles=git(eng,'diff','--name-only',baseline,head,'--','src','index.js','manifest.json').split('\n')
        .filter(Boolean).map(f=>f.replace(/^avereth-engine\//,''));
    assert(runtimeFiles.length>0,'Expected an independently modified playable engine');
    const loaded={};
    for(const f of ['manifest.json',...runtimeFiles.filter(f=>f!=='manifest.json')]){
        const response=await p.request.get(server.url+'scripts/extensions/third-party/avereth-engine/'+f);
        assert(response.ok(),f);
        const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
        loaded[f]=hash(await response.body());assert.equal(loaded[f],hash(fs.readFileSync(path.join(eng,f))),f);
    }
    await p.evaluate(async prefix=>{const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...prefix);await c.saveChat();await c.reloadCurrentChat();},original);
    dr.testChat=await dr.identity();
    const cfg=await p.evaluate(()=>{const c=SillyTavern.getContext(),o=c.chatCompletionSettings;return {description:c.characters[c.characterId].description,model:o.custom_model,stream:o.stream_openai,smooth:c.powerUserSettings.smooth_streaming,compact:c.extensionSettings.avereth?.compactOutput===true,preset:o.preset_settings_openai,context:o.openai_max_context,max:o.openai_max_tokens,temp:o.temp_openai,topP:o.top_p_openai};});
    assert.equal(cfg.description.trim(),fs.readFileSync(path.join(eng,'content/narrator/Avereth_Narrator_Contract_v4.txt'),'utf8').trim());
    assert(cfg.model==='z-ai/glm-5.3-flash' && cfg.stream&&!cfg.smooth&&!cfg.compact&&cfg.preset===preset&&cfg.max===4096&&cfg.temp===0.9&&cfg.topP===0.95);
    const initial=await capture(0);
    save('profile.json',{...cfg,descriptionHash:digest(cfg.description),head,loaded,seeded,initial,lore:digest(fs.readFileSync(path.join(eng,'lorebook/Avereth_World_Lore_v0.14.json'),'utf8')),presetHash:digest(raw)});
    assert.equal(initial.world,digest(foldChat(original).state));
    await visible();save('response.json',{ready:true});
    while(true){
        if(!fs.existsSync(file('command.json'))){await wait(180);continue;}
        const cmd=read('command.json');
        if(cmd.seq<=seen){await wait(180);continue;}
        seen=cmd.seq;
        if(cmd.op==='end'){save('response.json',{seq:seen,closed:true});break;}
        try{
            assert(!blocked && cmd.op==='play' && typeof cmd.text==='string' && cmd.text.trim().length>0 && n<25);
            assert(fs.existsSync(path.join(shared,'historical-go')),'historical gate not yet cleared');
            assert(!(await dr.probe()).busy); const prev=await dr.chat();assert(await dr.verifySaved(prev,{complete:true}));
            await p.fill('#send_textarea',cmd.text);const button=p.locator('#send_but');assert(await button.isVisible());
            await p.evaluate(observeTurn,{index:prev.length+1});
            n++;journal('actions.jsonl',{n,...cmd,at:new Date().toISOString()});gate({arm,turn:n});
            const endsForTurn=observeRequests();
            const t0=Date.now();await button.click({timeout:5000});
            let ready=false;
            for(let i=0;i<3000;i++){
                const x=await p.evaluate(len=>{const c=SillyTavern.getContext(),m=c.chat.at(-1);return {answered:c.chat.length>=len+2&&!m?.is_user,ext:m?.extra?.avereth?.extraction?.status,status:document.querySelector('#avereth-action-status')?.textContent,world:window.abTurn?.world,system:m?.is_system||m?.extra?.avereth_panel,busy:!!document.querySelector('#mes_stop')?.checkVisibility(),panel:m?.extra?.avereth?.panel,viewReady:window.abTurn?.marks?.ready!=null};},prev.length);
                const {ended:ends,open}=endsForTurn();
                if(ends.some(r=>!r.ok))throw Error('Provider gate stopped: '+ends.filter(r=>!r.ok).map(r=>r.id+' '+(r.reason||r.status)).join(', '));
                if(x.ext==='failed'||(!x.busy&&x.panel?.includes('Erzählung unvollständig'))||/Remoteabschluss unbekannt|Speichern fehlgeschlagen/.test(x.status||''))throw Error('Host stopped: '+JSON.stringify(x));
                const stored=x.world?.persisted && x.ext==='applied' && x.status==='Gespeichert' && x.viewReady;
                const local=x.system && !ends.some(r=>r.role==='narrator') && Date.now()-t0>1500;
                if(x.answered && !x.busy && !open && (stored||local) && !dr.pendingSaves.size && await dr.verifySaved(await dr.chat(),{complete:true})){ready=true;break;}
                await wait(350);
            }
            if(!ready)throw Error('Host/read-back timeout');
            gate({arm:null});
            const timing=await p.evaluate(()=>{const s=window.abTurn;s.stop();return {marks:s.marks,world:s.world,firstSentence:s.firstSentence};});
            const checked=await capture(n);await visible();
            journal('turns.jsonl',{n,inputMessageIndex:prev.length,timing,checked,elapsedIncludingReloadMs:Date.now()-t0});
            save('response.json',{seq:seen,n,complete:true});
        }catch(err){
            gate({arm:null});blocked=true;
            const live=await dr.chat().catch(()=>null);
            if(live)save('interrupted-browser-chat.json',live);
            const disk=chatFiles(inst,card).find(f=>path.basename(f,'.jsonl')===dr.testChat.chatId);
            if(disk)fs.copyFileSync(disk,file('interrupted-disk-chat.jsonl'));
            await visible().catch(()=>{});
            save('response.json',{seq:seen,n,error:err.message,blocked:true});
        }
    }
}finally {
    gate({arm:null});await browser.close();await server.stop();
}
