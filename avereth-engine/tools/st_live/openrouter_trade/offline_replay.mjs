// Browser-only runner regression, using the recorded A prose and a scripted extractor. No upstream connection.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

import {play} from './play.mjs';
import {Driver,loadPlaywright} from '../live/driver.mjs';
import {startServer,freePort} from '../live/server.mjs';

assert(!process.env.OPENROUTER_API_KEY && !process.env.FEATHERLESS_API_KEY);
const [archive,ref,suite,st]=process.argv.slice(2);
const root=fs.mkdtempSync(path.join(os.tmpdir(),'avereth-ortrade-offline-'));
const read=file=>fs.readFileSync(path.join(archive,file),'utf8');
const events=read('physical.jsonl').trim().split('\n').map(JSON.parse);
const narration=events.find(r=>r.kind==='end'&&r.id===4).text;
fs.writeFileSync(path.join(root,'guild-seed.jsonl'),read('guild-seed.jsonl'));
const seed=read('guild-seed.jsonl').trim().split('\n').slice(1).map(JSON.parse);
const card=seed[0].name;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const save=(file,value)=>fs.writeFileSync(path.join(root,file),JSON.stringify(value,null,2));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const hosts={}, rows=[], stop=[];
let active={};
const gate=(arm,stage,turn)=>{active={arm,stage,turn};};
const browser=await loadPlaywright().chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
    for(const [arm,repo] of Object.entries({A:ref,B:suite})){
        const mod=p=>import(pathToFileURL(path.join(repo,'avereth-engine',p)));
        const {foldChat}=await mod('src/host.js');
        const state=foldChat(seed).state;
        const seller=Object.values(state.entities).find(x=>x.name==='Nessa').id;
        const mock=http.createServer(async(req,res)=>{
            const reply=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
            if(req.url==='/v1/models')return reply({data:[{id:'local-replay'}]});
            if(req.url!=='/v1/chat/completions'||active.arm!==arm){res.writeHead(409);res.end();return;}
            const chunks=[];for await(const c of req)chunks.push(c);
            const body=JSON.parse(Buffer.concat(chunks));
            const role=body.stream?'narrator':body.messages[0].content.startsWith('You read one reply')?'extractor':'planner';
            const id=rows.filter(r=>r.kind==='start').length+1;
            rows.push({kind:'start',...active,id,role});
            if(body.stream){
                res.setHeader('Content-Type','text/event-stream');res.flushHeaders();
                await delay(1100);
                for(const text of narration.match(/.{1,70}|\n/g)){
                    res.write('data: '+JSON.stringify({choices:[{index:0,delta:{content:text}}]})+'\n\n');
                    await delay(40);
                }
                res.end('data: {"choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":"stop"}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":1}}\n\ndata: [DONE]\n\n');
            }else{
                const output=role==='planner'?{commands:[]}:{scene:state.scene.at,expected:{},deltas:[{seq:1,type:'offer',seller,lines:[
                    {what:'fine hand-axe',kind:'goods',service:null,teaches:null,effect:null,qty:1,price_cp:14,said:'Fourteen copper.',phase:'firm',condition:null,pricing:{basis:'total',quote:'Fourteen copper'},equipment:true,base:'hand_axe',quality:'fine'}]}]};
                reply({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(output)}}]});
            }
            rows.push({kind:'end',...active,id,role,ok:true});
        });
        await new Promise(r=>mock.listen(0,'127.0.0.1',r));stop.push(()=>mock.close());
        const {createInstance,writeConfig,seedProfile}=await mod('tools/st_live/live/profile.mjs');
        const inst=createInstance({base:root,runDir:root,runId:arm});
        const port=await freePort(18841), start=tag=>startServer({stDir:st,inst,port,logFile:path.join(root,arm+tag+'.log'),timedFile:path.join(root,arm+tag+'-timed.log')});
        writeConfig(inst,port);
        const boot=await start('boot');await boot.stop();
        const preset=fs.readFileSync(path.join(repo,'avereth-engine/presets/Avereth Narrator V4.json'),'utf8');
        const {PRESET_TO_SETTINGS}=await mod('tools/st_live/live/import_profile.mjs');
        const generation=Object.fromEntries(Object.entries(JSON.parse(preset)).map(([k,v])=>[PRESET_TO_SETTINGS[k]||k,v]));
        seedProfile(inst,{username:seed.find(m=>m.is_user).name,card:{name:card,first_mes:seed[0].mes},preset:{name:'Avereth Narrator V4',text:preset},generation,source:'custom',
            connection:{chat_completion_source:'custom',custom_model:'local-replay',custom_url:'http://127.0.0.1:'+mock.address().port+'/v1'}});
        const file=path.join(inst.user,'settings.json'),s=JSON.parse(fs.readFileSync(file));
        s.oai_settings.stream_openai=true;s.power_user.smooth_streaming=false;fs.writeFileSync(file,JSON.stringify(s));
        const server=await start('st');stop.push(server.stop);
        const driver=await Driver.create(browser,{turnTimeoutMs:90000});assert((await driver.open(server.url)).connected);
        await driver.openCard(card);hosts[arm]={driver,page:driver.page,foldChat,inst,card};
    }
    await play({hosts,gate,readRecords:()=>rows,root,save,hash,delay,pairCount:1});
    const result=JSON.parse(fs.readFileSync(path.join(root,'turns.json')));
    assert(result.length===2&&result.every(r=>r.readback));assert.equal(result[0].worldHash,result[1].worldHash);
    assert.equal(result[0].startWorld,result[1].startWorld);
    save('offline-result.json',{kind:'local scripted extractor / replayed prose',turns:result.map(r=>({arm:r.arm,readback:r.readback,world:r.worldHash,requests:r.requests})),rows});
    console.log(root);
}finally{await browser.close();for(const close of stop.reverse())await close();}
