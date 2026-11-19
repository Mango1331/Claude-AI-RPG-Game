// Re-evaluate physical responses against the exact arm's engine and original revision. Offline only.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const [root,main,ref,suite]=process.argv.slice(2).map(p=>path.resolve(p));
const dir=path.join(main,'testrun_10b/user-20261119-010838/originals');
const prefix=fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(f=>f.endsWith('.jsonl'))),'utf8').trim().split('\n').slice(1,12).map(JSON.parse);
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f)));
const logs=fs.readFileSync(path.join(root,'physical.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const tools=async(repo,p)=>import(pathToFileURL(path.join(repo,'avereth-engine',p)));
const {pendingChat}=await tools(suite,'tools/bench_extract.mjs');
const all=[];
for(const [arm,repo] of Object.entries({A:ref,B:suite})){
    const chat=structuredClone(prefix);
    const {loadContentPack}=await tools(repo,'src/content.js');
    const content=await loadContentPack(k=>JSON.parse(fs.readFileSync(path.join(repo,'avereth-engine/content',k))));
    const {foldChat}=await tools(repo,'src/host.js');
    const {parsePlan,planContext,withContentSkills}=await tools(repo,'src/v4/planner.js');
    const {actionInputOf}=await tools(repo,'src/action_input.js');
    const {buildCatalog}=await tools(repo,'src/v4/catalog.js');
    const guild=await tools(repo,'src/v4/guild.js');
    const {boardFor,extractionRequest}=await tools(repo,'src/v4/runtime.js');
    const {parseExtraction}=await tools(repo,'src/v4/extract.js');
    function extract(answer,messages){
        const i=messages.length-1,req=extractionRequest(pendingChat(messages,i),i,content);
        const parsed=parseExtraction(answer,req.vocab,req.ids,req.expectedKeys,{sceneRequired:req.sceneRequired,startScene:req.startScene,state:req.state,
            content,explicitArrivals:req.sceneRequired,reply:messages[i].mes});
        return {valid:parsed.valid,errors:parsed.errors||[],issues:(parsed.issues||[]).map(x=>x.why||x),deltaCount:parsed.value?.deltas?.length};
    }
    for(const turn of read('turns.json').filter(r=>r.arm===arm)){
        const saved=read('turn-'+arm+turn.n+'.json'),before=foldChat(chat).state;
        chat.push(saved.player,saved.reply);
        const record=saved.player.extra.avereth;
        const ctx=withContentSkills(planContext(before,content,buildCatalog(before,content,{known:true,c:true})),content,before);
        const action=actionInputOf(saved.player);
        if(action)ctx.actionInput=action;
        let slot,need;
        for(const id of turn.requests){
            const r=logs.find(r=>r.kind==='end'&&r.id===id);
            let judged={valid:null};
            if(r.role==='planner'){
                const p=parsePlan(r.text,content.commandVocab,ctx,saved.player.mes);
                judged={valid:!!p.commands&&!p.hud_conflict,errors:p.errors||[],hudConflict:p.hud_conflict||null};
            }else if(r.role==='extractor'){
                judged=extract(r.text,chat);
            }else if(r.role==='board'){
                need ||= boardFor(before,content,record.interp.commands,{c:true});
                const initial=!all.some(x=>x.arm===arm&&x.turn===turn.n&&x.role==='board');
                const draft=initial&&guild.expandInitialBoard?guild.expandInitialBoard(r.text,before,need):r.text;
                const parsed=slot?guild.parseBoardSlot(draft,slot,content,need,before):guild.parseBoard(draft,content,need,before);
                judged={valid:parsed.listings?.length===need.missing,errors:parsed.errors||[],refused:parsed.refused||[],count:parsed.listings?.length||0};
                if(initial&&guild.boardSlotRepair)slot=guild.boardSlotRepair(draft,parsed,before,content,need);
            }else if(r.role==='narrator'){
                judged={valid:r.ok&&!!r.text.trim()&&saved.reply.extra.avereth.extraction.status==='applied',criterion:'completed nonempty prose with applied host revision'};
            }
            all.push({arm,turn:turn.n,stage:'main',id,role:r.role,...judged});
        }
    }
    if(arm==='B'&&fs.existsSync(path.join(root,'optional.json'))){
        for(const p of read('optional.json')){
            for(const row of p.rows||[]){
                const s=read('AB-'+row.family+'-'+row.variant+'-'+row.turn+'.json');
                const historical=row.turn==='U06-I21';
                const messages=historical?fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(f=>f.endsWith('.jsonl'))),'utf8').trim().split('\n').slice(1,24).map(JSON.parse):chat.slice(0,11+2*row.turn);
                if(historical)messages[messages.length-2]=s.player;
                messages[messages.length-1]=s.reply;
                for(const id of row.ids){
                    const r=logs.find(x=>x.kind==='end'&&x.id===id);
                    const j=r.role==='extractor'?extract(r.text,messages):{valid:r.ok&&!!r.text.trim()};
                    all.push({arm,turn:row.turn,stage:row.family+'-'+row.variant,id,role:r.role,...j});
                }
            }
        }
    }
}
assert.equal(new Set(all.map(r=>r.id)).size,all.length);
fs.writeFileSync(path.join(root,'parser.json'),JSON.stringify(all,null,2)+'\n');
