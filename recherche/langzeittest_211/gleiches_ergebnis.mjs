// Replay only the world stage on a fixed post-input history with the actual archived X replies.
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const [repo, directory, ...arms] = process.argv.slice(2);
const engine = path.resolve(repo, 'avereth-engine');
const {engineAt,canonicalJson} = await import(pathToFileURL(path.join(engine,'tools/replay/replay.mjs')));
const {content,runtime,host} = await engineAt(engine);
const sha = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
function lines(file) { return readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); }
const journal = lines(path.join(directory,'physical.jsonl'));
for (const arm of arms) {
    const base = path.join(directory,arm);
    for (const turn of lines(path.join(base,'turns.jsonl'))) {
        const n=turn.n;
        const messages=lines(path.join(base,'chat-'+n+'.jsonl')).slice(1);
        const id=turn.inputMessageIndex+1, reply=messages[id];
        if(!reply?.extra?.avereth?.extraction) continue;
        const original=reply.extra.avereth;
        delete reply.extra.avereth;
        const actual=journal.filter(r=>r.arm===arm && r.turn===n && r.role==='extractor' && r.kind==='end' && r.ok);
        let calls=0;
        const stage=runtime.processReplyAny(messages,id,content);
        let missing=false;
        const llm=async () => {
            const r=actual[calls++];
            if(!r){missing=true;throw Object.assign(Error('no recorded response'),{code:'LLM_CAPACITY_BLOCKED'});}
            const res=JSON.parse(gunzipSync(readFileSync(path.join(directory,r.rawFile))));
            return {content:res.choices[0].message.content,finish_reason:res.choices[0].finish_reason,usage:res.usage};
        };
        if(stage.extract)await runtime.runExtraction(messages,id,content,llm);
        const {state,errors}=host.foldChat(messages);
        assert.deepEqual(errors,[]);
        const actualWorld=JSON.parse(readFileSync(path.join(base,'world-'+n+'.json')));
        const worldEqual=sha(state)===sha(actualWorld);
        const changes=Object.keys(actualWorld).filter(k=>sha(state[k])!==sha(actualWorld[k]));
        const rec=reply.extra.avereth, rejected=rec?.rejected||[];
        const changedPeople = Object.keys({...actualWorld.knowledge,...state.knowledge})
            .filter(k=>sha(actualWorld.knowledge[k]??null)!==sha(state.knowledge[k]??null));
        const who = s=>Object.fromEntries(Object.entries(s.objects).map(([id,o])=>[id,[o.holder,o.qty]]));
        const liveObjects=who(actualWorld), replayObjects=who(state);
        const changedObjects=Object.keys({...liveObjects,...replayObjects}).filter(k=>sha(liveObjects[k]??null)!==sha(replayObjects[k]??null));
        const evidence=worldEqual?undefined:{recordedAt:actualWorld.scene.at,recordedPresent:actualWorld.scene.present,
            clock:[actualWorld.clock.minute,state.clock.minute],changedPeople,changedObjects,
            knowledgeKeys:Object.fromEntries(changedPeople.map(id=>[id,{
                onlyLive:Object.keys(actualWorld.knowledge[id]||{}).filter(k=>!state.knowledge[id]?.[k]),
                onlyReplay:Object.keys(state.knowledge[id]||{}).filter(k=>!actualWorld.knowledge[id]?.[k])
            }]))};
        console.log(JSON.stringify({arm,n,evidence,matchedCalls:!missing && calls===actual.length,worldEqual,changes,
            at:state.scene.at,present:state.scene.present,originalRules:(original.rejected||[]).map(r=>r.rule),
            replayedRules:rejected.map(r=>r.rule),status:rec?.extraction?.status,error:rec?.extraction?.error}));
    }
}
