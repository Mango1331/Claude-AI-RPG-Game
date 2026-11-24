// Offline: compare both runtimes one turn at a time on identical prior records,
// using each physical response in its original order, including failed attempts.
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';

const [archive, first, second, promptOutput, offsetArg = '0'] = process.argv.slice(2);
const turnOffset = Number(offsetArg);
assert.ok(Number.isSafeInteger(turnOffset));
if (!second) throw Error('Usage: node archivreplay.mjs run_dir reference_repo candidate_repo [local_prompt_pairs.json.gz] [journal_turn_offset]');
const read = name => readFileSync(join(archive, name));
const jsonl = name => gunzipSync(read(name)).toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
const chat = jsonl('original-chat.jsonl.gz').filter(m => typeof m.mes === 'string');
const timings = JSON.parse(read('browserzeiten.json'));
const journal = jsonl('provider-journal.jsonl.gz');
const ends = new Map(journal.filter(r => r.kind === 'end').map(r => [r.id,r]));
const outsideRevision = [];
const raw = new Map(jsonl('provider-originalantworten.jsonl.gz').map(r => [r.id,r]));
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const engines = await Promise.all([first,second].map(async repo => {
    const root = resolve(repo,'avereth-engine');
    const replay = await import(pathToFileURL(join(root,'tools/replay/replay.mjs')));
    return {...await replay.engineAt(root), recordOutput: replay.recordOutput};
}));
const role = purpose => ({ plan:'planner', extract:'extractor' }[purpose.split('_')[0]] ?? purpose.split('_')[0]);
const pairs = [];
const results = [];
for (const { n, inputMessageIndex:i } of timings) {
    // Browser uses message indices (without the JSONL metadata line).
    assert.equal(chat[i]?.is_user, true);
    assert.equal(chat[i+1]?.is_user, false);
    const turn = journal.filter(r => r.kind === 'start' && r.turn === n + turnOffset);
    for (const [m, isPlayer] of [[i,true],[i+1,false]]) {
        const seen = turn.filter(r => isPlayer ? !['narrator','extractor'].includes(r.role) : r.role === 'extractor').filter(r => {
            const ended = ends.get(r.id);
            assert.ok(ended, 'Missing terminal provider record ' + r.id);
            if (ended.ok) return true;
            // The rejected HTTP request produced no model output and a separately archived unprocessed input.
            // The canonical continuation restarted from the verified previous save. No replacement answer is invented.
            assert.ok(ended.status === 429 && ended.reason === 'upstream_http_error', 'Unexpected error ' + r.id);
            outsideRevision.push({id:r.id,turn:r.turn,status:429,reason:ended.reason});
            return false;
        });
        const responses = seen.map(r => {
            const archived = raw.get(r.id);
            assert.equal(archived?.format, 'json', 'Missing original nonstreaming body ' + r.id);
            const data = JSON.parse(archived.body);
            assert.ok(data.choices?.length, 'No model choice in original body ' + r.id);
            const choice = data.choices[0];
            return {content:choice.message.content,finish_reason:choice.finish_reason,usage:data.usage};
        });
        const arms = [];
        for (const engine of engines) {
            const {host,runtime,content,recordOutput} = engine;
            const copy = structuredClone(chat.slice(0,m+1));
            const msg = copy[m];
            delete msg.extra.avereth;
            if (isPlayer && msg.is_system && chat[m].extra.avereth.command) msg.is_system = false;
            const calls = [];
            const mismatches = [];
            const llm = async ({messages,purpose}) => {
                const request = seen[calls.length];
                calls.push({purpose,messages});
                if (!request || request.role !== role(purpose)) {
                    mismatches.push({asked:purpose, archived:request?.role ?? null});
                    throw Object.assign(Error('Unrecorded request'),{code:'LLM_CAPACITY_BLOCKED'});
                }
                return responses[calls.length - 1];
            };
            if (isPlayer) {
                await runtime.prepareGenerationAsync(copy,content,{type:'normal',settings:{},llm});
            } else {
                const stage = runtime.processReplyAny(copy,m,content);
                if (stage.extract) await runtime.runExtraction(copy,m,content,llm);
            }
            const fold = host.foldChat(copy);
            assert.deepEqual(fold.errors, []);
            // The original Host wrote JSONL. Match exactly the fields that survive serialization.
            const result = JSON.parse(JSON.stringify(recordOutput(host.rec(msg))));
            const observed = recordOutput(host.rec(chat[m]));
            arms.push({ calls, mismatches, result, state:fold.state,
                observedRecord:isDeepStrictEqual(result,observed),
                recordDifferences:Object.keys({...result,...observed}).filter(k=>!isDeepStrictEqual(result[k],observed[k])),
                eventDifferences:result.events.map((e,j)=> [e,observed.events[j]]).filter(([e,f])=>!isDeepStrictEqual(e,f))
                    .map(([e,f])=>[e.t,f?.t,Object.keys({...e.d,...f?.d}).filter(k=>!isDeepStrictEqual(e.d?.[k],f?.d?.[k]))]),
                observedWorld:isDeepStrictEqual(fold.state,host.foldChat(chat,m+1).state) });
        }
        const [a,b] = arms;
        const changedWorldKeys = [...new Set([...Object.keys(a.state),...Object.keys(b.state)])]
            .filter(key => !isDeepStrictEqual(a.state[key],b.state[key]));
        for (let k=0;k<Math.min(a.calls.length,b.calls.length,seen.length);k++) {
            if (a.calls[k].purpose === b.calls[k].purpose) pairs.push({n,id:seen[k].id,purpose:a.calls[k].purpose,
                a:a.calls[k].messages,b:b.calls[k].messages,archived:seen[k].body.messages});
        }
        results.push({turn:n, message:m, side:isPlayer?'player':'reply', archivedCalls:seen.length,
            calls:arms.map(x=>x.calls.map(c=>c.purpose)), mismatches:arms.map(x=>x.mismatches),
            recordedWorld:arms.map(x=>x.observedWorld), recordedOutput:arms.map(x=>x.observedRecord),
            sameOutput:isDeepStrictEqual(a.result,b.result), changedWorldKeys,
            ...(a.observedRecord ? {} : {referenceVsHistorical:{fields:a.recordDifferences, events:a.eventDifferences}}),
            ...(changedWorldKeys.length || !isDeepStrictEqual(a.result,b.result)
                ? {delta:[a,b].map(x=>({world:hash(x.state),events:x.result.events.map(e=>[e.t,e.d]),rejected:x.result.rejected}))} : {})});
    }
}
if (promptOutput) writeFileSync(promptOutput,gzipSync(JSON.stringify(pairs)));
const commits = [first,second].map(dir => execFileSync('git',['-C',dir,'rev-parse','HEAD'],{encoding:'utf8'}).trim());
console.log(JSON.stringify({commits,versions:engines.map(e=>e.version),sourceChat:hash(chat),outsideRevision,results},null,2));
