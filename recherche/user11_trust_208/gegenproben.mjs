// Minimal competing user intents / narrator evidence on the same User11 T9 pre-turn.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [chatFile,...repos]=process.argv.slice(2);
if (repos.length!==3) throw Error('Usage: node gegenproben.mjs user11-chat.jsonl repoA repoB repoC');
const chat=fs.readFileSync(chatFile,'utf8').trim().split(/\r?\n/).map(JSON.parse).filter(m=>typeof m.mes==='string');
const bren=chat[17].mes, raw=chat[18].extra.avereth.extraction.raw;
const arrivalOnly=()=>({scene:raw.scene,expected:{},deltas:raw.deltas.filter(d=>d.type==='arrive').map(d=>({...d,seq:1}))});
const journey='Bren walked beside Alaric for a quarter mile. Alaric and Bren reached the stone cottage. His daughter welcomed Alaric at the door.';
const cases=[
    ['original','getragen',bren,chat[18].mes,raw],
    ['lokale-zusage','getragen','I will walk with you to the cottage, Bren.',journey],
    ['wegfrage','ohne Zustimmung','Where is the cottage?',journey],
    ['nur-aufrichten','örtlicher Handgriff','I help you lift the cart.',journey],
    ['ohne-mich','ausdrücklich abgelehnt','Go ahead without me, Bren. I am staying on this road.',journey],
    ['verneint','ausdrücklich abgelehnt',"I will not go with you to the cottage.",journey],
    ['aufschub','auf später verschoben',"I will go tomorrow. Today I mend the wheel.",journey],
    ['unterwegs-anderer','keine vollzogene PC-Ankunft',bren,'Alaric watched from the road. Bren and his daughter reached the stone cottage. Alaric stayed beside the overturned cart.'],
    ['fernsicht','keine vollzogene PC-Ankunft',bren,'The stone cottage stood beyond the bend. A passing carter greeted Alaric on the road beside the overturned cart.'],
    ['echter-dialog','keine vollzogene PC-Ankunft',bren,'Bren said, “Alaric and I reached the stone cottage yesterday.” The cart was still on its side.'],
    ['anderes-ziel','anderer vom Spieler gewählter Endpunkt','I walk with Bren to the wooden footbridge, then head home.',journey],
    ['nur-npc','keine vollzogene PC-Ankunft',bren,'Bren went ahead alone. He reached the stone cottage. Alaric stayed by the overturned cart on the road.'],
    ['ausdrueckliche-grenze','Zusage nur bis zum Tor',"I walk with you as far as the gate. You will have to do the rest without me.",journey],
];
const results=cases.map(([id,intent,input,prose])=>({id,intent,input,prose}));
for(const [i,root] of repos.entries()){
    const dir=path.resolve(root,'avereth-engine');
    const load=name=>import(pathToFileURL(path.join(dir,name)));
    const {loadContentPack}=await load('src/content.js');
    const content=await loadContentPack(async name=>JSON.parse(fs.readFileSync(path.join(dir,'content',name),'utf8')));
    const {prepareGenerationAsync,processReplyAny,extractionRequest,applyExtraction}=await load('src/v4/runtime.js');
    const {rec,foldChat}=await load('src/host.js');
    const {parseExtraction}=await load('src/v4/extract.js');
    for (const [j,[id,,input,prose,answer]] of cases.entries()) {
        const clone=structuredClone(chat.slice(0,19));
        if(id!=='original'){
            clone[17].mes=input;delete clone[17].extra.avereth;
            const r=await prepareGenerationAsync(clone.slice(0,18),content,{type:'normal',llm:async({purpose})=>{
                if(purpose!=='plan') throw Error('Unexpected request '+purpose);
                return JSON.stringify({commands:[]});
            }});
            if(r.action!=='context') throw Error('Control failed to open player action '+id+': '+r.action);
        }
        clone[18].mes=prose;delete clone[18].extra.avereth;
        const received=processReplyAny(clone,18,content);if(!received.extract)throw Error(id);
        const req=extractionRequest(clone,18,content);
        const validated=parseExtraction(JSON.stringify(answer??arrivalOnly()),req.vocab,req.ids,req.expectedKeys,
            {sceneRequired:req.sceneRequired,startScene:req.startScene,state:req.state,content,explicitArrivals:true,reply:prose});
        if(!validated.valid || !validated.complete || validated.issues?.length)throw Error(id+JSON.stringify([validated.errors,validated.issues]));
        const r=applyExtraction(clone,18,content,validated,{hash:req.hash});
        const fold=foldChat(clone);if(!r.applied || fold.errors.length)throw Error(id);
        results[j]['ABC'[i]]={arrival:rec(clone[18]).events.some(e=>e.t==='scene.moved'),end:fold.state.scene.at,
            refusals:(rec(clone[18]).rejected??[]).map(r=>r.rule)};
    }
}
console.log(JSON.stringify(results,null,2));
