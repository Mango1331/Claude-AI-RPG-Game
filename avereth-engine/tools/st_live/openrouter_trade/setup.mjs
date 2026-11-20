import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {Driver,loadPlaywright} from '../live/driver.mjs';
import {startServer} from '../live/server.mjs';

const root=process.env.AVERETH_AB_DIR, main=process.env.AVERETH_MAIN, st=process.env.AVERETH_ST_DIR;
const repos={A:process.env.AVERETH_REF,B:process.env.AVERETH_SUITE};
const pins={A:'6d9770f9b31e78d37567719bf1c06d8a4942288c', B:'25c46bc9d342c9ed6cf87f8ac59e11c85ab4de18'};
const model='z-ai/glm-5.3-flash', presetName='Avereth Narrator V4';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const save=(f,v)=>{fs.writeFileSync(path.join(root,f+'.tmp'),JSON.stringify(v,null,2)+'\n');fs.renameSync(path.join(root,f+'.tmp'),path.join(root,f));};
const gate=(arm,stage,turn=0)=>save('gate.json',{arm,stage,turn});
const readRecords=()=>!fs.existsSync(path.join(root,'physical.jsonl'))?[]:fs.readFileSync(path.join(root,'physical.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const archive=path.join(main,'testrun_10b/user-20261119-010838/originals');
const prefix=fs.readFileSync(path.join(archive,fs.readdirSync(archive).find(f=>f.endsWith('.jsonl'))),'utf8').trim().split('\n').slice(1,12).map(JSON.parse);
const card=prefix[0].name;
const hosts={},closers=[];
assert(!process.env.OPENROUTER_API_KEY && !process.env.FEATHERLESS_API_KEY,'Only the transport may inherit the credential');
assert.equal(execFileSync('git',['-C',st,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),'7e8663cd9c184a550b37238218bdd32c6efc68e9');
for(const [arm,dir] of Object.entries(repos)){
    assert.equal(execFileSync('git',['-C',dir,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),pins[arm]);
    assert.equal(execFileSync('git',['-C',dir,'status','--porcelain','--','avereth-engine'],{encoding:'utf8'}).trim(),'');
}
const engine=(arm,file)=>import(pathToFileURL(path.join(repos[arm],'avereth-engine',file)));
const browser=await loadPlaywright().chromium.launch({executablePath:process.env.AVERETH_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
    const sources={};
    gate(null,'setup');
    for(const [arm,repo] of Object.entries(repos)){
        const dir=path.join(repo,'avereth-engine');
        const {foldChat}=await engine(arm,'src/host.js');
        const {createInstance,writeConfig,seedProfile}=await engine(arm,'tools/st_live/live/profile.mjs');
        const {PRESET_TO_SETTINGS}=await engine(arm,'tools/st_live/live/import_profile.mjs');
        const inst=createInstance({runId:arm,base:root,runDir:root});
        const port=arm==='A'?18541:18542, url='http://127.0.0.1:'+(arm==='A'?18551:18552)+'/v1';
        writeConfig(inst,port);
        const start=tag=>startServer({stDir:st,inst,port,logFile:path.join(root,arm+'-'+tag+'.log'),timedFile:path.join(root,arm+'-'+tag+'-timed.log')});
        const bootstrap=await start('boot'); await bootstrap.stop();
        const raw=fs.readFileSync(path.join(dir,'presets',presetName+'.json'),'utf8');
        const preset=JSON.parse(raw);
        const generation=Object.fromEntries(Object.entries(preset).map(([k,v])=>[PRESET_TO_SETTINGS[k]||k,v]));
        const connection={chat_completion_source:'custom',custom_url:url,custom_model:model,custom_include_body:'reasoning:\n  effort: low',custom_include_headers:'',custom_exclude_body:'',custom_prompt_post_processing:''};
        seedProfile(inst,{username:prefix.find(x=>x.is_user).name,card:{name:card,first_mes:prefix[0].mes},preset:{name:presetName,text:raw},generation,connection,source:'custom'});
        const settingsPath=path.join(inst.user,'settings.json'), settings=JSON.parse(fs.readFileSync(settingsPath));
        settings.oai_settings.stream_openai=true;
        settings.power_user.smooth_streaming=false;
        fs.writeFileSync(settingsPath,JSON.stringify(settings));
        const server=await start('st');closers.push(server.stop);
        const driver=await Driver.create(browser,{turnTimeoutMs:900000,quietMs:800});
        const conn=await driver.open(server.url);assert(conn.connected);
        await driver.openCard(card);
        await driver.page.evaluate(async p=>{const c=SillyTavern.getContext();c.chat.splice(0,c.chat.length,...p);await c.saveChat();await c.reloadCurrentChat();},prefix);
        driver.testChat=await driver.identity();
        assert(await driver.verifySaved(await driver.chat(),{complete:true}));
        const chat=await driver.chat(),fold=foldChat(chat);
        assert.deepEqual(fold.errors,[]);
        assert.deepEqual(fold.state,foldChat(prefix).state);
        const config=await driver.page.evaluate(()=>{const c=SillyTavern.getContext(),o=c.chatCompletionSettings;return {model:o.custom_model,source:o.chat_completion_source,stream:o.stream_openai,smooth:c.powerUserSettings.smooth_streaming,compact:c.extensionSettings.avereth?.compactOutput===true,preset:o.preset_settings_openai,context:o.openai_max_context,max:o.openai_max_tokens,temp:o.temp_openai,topP:o.top_p_openai,body:o.custom_include_body,order:o.prompt_order};});
        assert.equal(config.model,model);assert.equal(config.max,4096);assert.equal(config.stream,true);assert.equal(config.temp,0.9);assert.equal(config.topP,0.95);assert.equal(config.smooth,false);assert.equal(config.compact,false);
        const listing=await fetch(url+'/models').then(r=>r.json());assert.deepEqual(listing.data.map(x=>x.id),[model]);
        sources[arm]={pin:pins[arm],params:config,world:hash(fold.state),events:hash(chat.map(m=>m.extra?.avereth?.events||[])),description:hash(fs.readFileSync(path.join(dir,'content/narrator/Avereth_Narrator_Contract_v4.txt'),'utf8')),lore:hash(fs.readFileSync(path.join(dir,'lorebook/Avereth_World_Lore_v0.14.json'),'utf8')),preset:hash(raw),messages:chat.length,port,url};
        hosts[arm]={driver,page:driver.page,foldChat,inst,server,repo,card};
        console.log(arm,'ST ready and start world verified');
    }
    for (const key of ['world','events','description','lore','preset','messages'])assert.deepEqual(sources.A[key],sources.B[key]);
    assert.deepEqual({...sources.A.params,stream:true},sources.B.params);
    save('configuration.json',sources);
    const {play}=await import('./play.mjs');
    const resume=fs.existsSync(path.join(root,'reviewed-rate-limit.json'));
    if(resume){
        const [canary]=JSON.parse(fs.readFileSync(path.join(root,'canary.json')));
        assert(canary.readback && canary.measured.world.persisted && canary.measured.marks.ready);
        assert(fs.existsSync(path.join(root,'canary-complete.json')));
    }else await play({hosts,gate,readRecords,save,root,hash,delay,canary:true});
    await play({hosts,gate,readRecords,save,root,hash,engine,delay,resume});
}catch(err){
    save('interruption.json',{message:err.message,stack:String(err.stack).split('\n').slice(0,5)});
    console.log('Test stopped:',err.message);process.exitCode=1;
}finally{
    gate(null,'closed');
    // Keep the downstream browser and ST hosts alive until the transport classifies any active generation.
    for(;;){
        const rows=readRecords();
        const ended=new Set(rows.filter(r=>r.kind==='end').map(r=>r.id));
        if(!rows.some(r=>r.kind==='start'&&!ended.has(r.id)))break;
        await delay(250);
    }
    await browser.close();for(const close of closers.reverse())await close();
}
