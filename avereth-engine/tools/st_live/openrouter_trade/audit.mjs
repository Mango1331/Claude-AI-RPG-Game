// Offline. Cross-check the actual provider request arrays and read back trade evidence from durable chats.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const [root,ref,suite]=process.argv.slice(2);
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const json=name=>JSON.parse(read(name));
const records=read('physical.jsonl').trim().split('\n').map(JSON.parse);
const turns=fs.existsSync(path.join(root,'turns.json'))?json('turns.json'):[];
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const metrics=[], machines=[], intervals=[], catalogs=[];
let lastEnd=0, totalCost=0;
for(const start of records.filter(r=>r.kind==='start')){
    const end=records.find(r=>r.kind==='end'&&r.id===start.id);
    assert(end && start.at>=lastEnd);
    lastEnd=end.at;
    totalCost+=end.usage?.cost||0;
    intervals.push({id:start.id,arm:start.arm,stage:start.stage,turn:start.turn,role:start.role,elapsedMs:end.elapsedMs,
        input:end.usage?.prompt_tokens,output:end.usage?.completion_tokens,cache:end.usage?.prompt_tokens_details?.cached_tokens,
        reasoning:end.usage?.completion_tokens_details?.reasoning_tokens,cost:end.usage?.cost,finish:end.finish,complete:end.ok,
        jsonValid:['planner','extractor'].includes(start.role)?(()=>{try{JSON.parse(end.text);return true;}catch{return false;}})():null});
}
for(const [arm,repo] of Object.entries({A:ref,B:suite})){
    const dir=path.join(repo,'avereth-engine');
    const mod=p=>import(pathToFileURL(path.join(dir,p)));
    const {loadContentPack}=await mod('src/content.js');
    const content=await loadContentPack(k=>JSON.parse(fs.readFileSync(path.join(dir,'content',k))));
    const {foldChat}=await mod('src/host.js');
    const {gearMarketText,gearOfferProfile,gearRetailPrice}=await mod('src/v4/items.js');
    const {resolveCommands}=await mod('src/v4/commands.js');
    const {applyEvent}=await mod('src/state.js');
    const market=gearMarketText(content,false,'catalog');
    catalogs.push(market);
    for(const start of records.filter(r=>r.kind==='start'&&r.arm===arm&&['planner','extractor'].includes(r.role))){
        const messages=structuredClone(start.body.messages);
        const hits=messages.reduce((n,m)=>n+m.content.split(market).length-1,0);
        for(const m of messages)m.content=m.content.replace(market,'[GEAR CATALOG]');
        machines.push({id:start.id,arm,role:start.role,stage:start.stage,pair:start.turn,hits,normalizedHash:digest(messages)});
    }
    for(const turn of turns.filter(t=>t.arm===arm)){
        const {world,reply,player}=json('turn-'+arm+turn.n+'.json');
        const chat=read('natural-trade-'+arm+'-'+turn.n+'.jsonl').trim().split('\n').slice(1).map(JSON.parse);
        const seed=read(turn.scenario===3?'combat-seed.jsonl':'guild-seed.jsonl').trim().split('\n').slice(1).map(JSON.parse);
        const old=foldChat(seed).state, fold=foldChat(chat);
        assert.deepEqual(fold.errors,[]);assert.deepEqual(fold.state,world);
        const lines=[];
        for(const offer of Object.values(world.offers).filter(o=>JSON.stringify(o)!==JSON.stringify(old.offers[o.id]))){
            for(const l of offer.lines){
                const p=gearOfferProfile(content,l);
                const trial=structuredClone(world),ev=[];
                const text='I buy the '+l.what+' now.';
                const receipt=resolveCommands(trial,content,[{seq:1,type:'offer.accept',offer:offer.id,lines:[l.id],qty:1,quote:text}],
                    e=>{ev.push(e);applyEvent(trial,e);},{c:true,msg:chat.length,text});
                lines.push({seller:world.entities[offer.seller]?.name,id:offer.id,base:l.base,quality:l.quality,what:l.what,title:l.profile?.title,
                    said:l.said,stored:l.price_cp,terms:l.terms,condition:l.condition,slot:l.profile?.slot,atk:l.profile?.atk,
                    def:l.profile?.def,mdef:l.profile?.mdef,profileExact:p?JSON.stringify(l.profile)===JSON.stringify(p):null,
                    canonical:p?gearRetailPrice(content,p):null,acceptanceProbe:{actions:receipt.actions,events:ev.map(x=>x.t)}});
            }
        }
        const ph=intervals.filter(i=>turn.requests.includes(i.id));
        const sum=k=>ph.every(x=>typeof x[k]==='number')?ph.reduce((a,x)=>a+x[k],0):null;
        const marks=turn.measured.marks;
        const ms=key=>typeof marks[key]==='number'?Math.round(marks[key]-marks.click):null;
        const events=[...(player.extra.avereth?.events||[]),...(reply.extra.avereth?.events||[])];
        const changes=key=>Object.values(world[key]).filter(x=>JSON.stringify(x)!==JSON.stringify(old[key][x.id]));
        const extraction=reply.extra.avereth.extraction, applied=events.find(e=>e.t==='extract.applied');
        const firstSentence=turn.measured.firstSentence||null;
        const normalized=s=>s.replace(/[*_]/g,'').replace(/\s+/g,' ').trim();
        const firstMatches=firstSentence?normalized(reply.mes).includes(normalized(firstSentence)):null;
        metrics.push({firstSentence,firstMatches,deltaCount:applied?.d?.deltas,rejected:applied?.d?.rejected,
            extractorStatus:extraction.status,stGenerationMs:Date.parse(reply.gen_finished)-Date.parse(reply.gen_started),arm,status:turn.status||'applied',pair:turn.n,scenario:turn.scenario,source:turn.startWorld,sourceEvents:turn.startEvents,requests:ph.length,
            repairs:ph.filter(r=>r.role==='extractor').length-1+Math.max(0,ph.filter(r=>r.role==='planner').length-1),
            input:sum('input'),output:sum('output'),reasoning:sum('reasoning'),cache:sum('cache'),cost:sum('cost'),
            firstMs:ms('firstProse'),narrationMs:ms('lastRenderedChange'),safeMs:ms('ready'),saveMs:ms('confirmedSave'),commitMs:ms('worldCommit'),
            physical:ph.map(x=>x.id),lines,coinBefore:old.entities.pc.sheet.coin_cp,coinAfter:world.entities.pc.sheet.coin_cp,
            eventTypes:events.map(e=>e.t),objects:changes('objects'),threads:changes('threads'),position:[old.scene.at,world.scene.at],
            hp:[old.entities.pc.sheet.hp,world.entities.pc.sheet.hp],reload:true,measured:turn.measured.world});
    }
}
fs.writeFileSync(path.join(root,'markets.json'),JSON.stringify(catalogs));
const output={confirmedCostUSD:totalCost,reservedOrChargedUSD:records.filter(r=>r.kind==='end').at(-1)?.spentOrReservedUSD,intervals,machines,metrics:metrics.sort((a,b)=>a.pair-b.pair||a.arm.localeCompare(b.arm)),maximumConcurrent:intervals.length?1:0};
fs.writeFileSync(path.join(root,'audit.json'),JSON.stringify(output,null,2)+'\n');
