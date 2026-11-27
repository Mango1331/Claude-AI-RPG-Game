import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {engineAt} from './replay.mjs';
const {runtime,host,content}=await engineAt(new URL('../..',import.meta.url).pathname);
const prefix=gunzipSync(fs.readFileSync(process.argv[2])).toString().trim().split('\n').slice(1,16).map(JSON.parse);
for(const decision of ['accept','decline','counter']){
    for(const conditional of [true,false]){
        const chat=structuredClone(prefix);
        const invite='Ossen, join my party',go=conditional?"let's go to the chapel together":"I go to the chapel";
        chat.push({is_user:true,mes:invite+' and '+go+'.',extra:{}});
        const result=await runtime.prepareGenerationAsync(chat,content,{llm:async req=>{
            if(req.purpose==='party_decision'){
                const {who,invitation,quests}=JSON.parse(req.messages.at(-1).content);
                return JSON.stringify({who,invitation,decision,...(decision==='counter'?{quest:quests[0].id,cp:10}:{})});
            }
            return JSON.stringify({commands:[{type:'party',seq:1,act:'invite',who:'npc.ossen',quote:invite},{type:'go',seq:2,to:{new:'chapel'},quote:go}]});
        }});
        const s=host.foldChat(chat).state;
        assert.equal(s.party?.members['npc.ossen']?.mode==='follow',decision==='accept');
        assert.equal(result.action==='context',decision==='accept'||!conditional);
        console.log(decision,conditional?'joint':'independent',result.action);
    }
}
