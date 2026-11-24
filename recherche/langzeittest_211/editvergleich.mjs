// Compare the same saved, genuinely edited ST histories against their original prefix on both folds.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [repo, data, ...arms]=process.argv.slice(2);
const engine=path.resolve(repo,'avereth-engine');
const {engineAt,canonicalJson}=await import(pathToFileURL(path.join(engine,'tools/replay/replay.mjs')));
const {host}=await engineAt(engine);
const sha=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');
for(const arm of arms){
    const dir=path.join(data,arm);
    const chat=n=>readFileSync(path.join(dir,'chat-'+n+'.jsonl'),'utf8').trim().split('\n').slice(1).map(JSON.parse);
    const rev=readFileSync(path.join(dir,'revision-results.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    const edit=rev.find(r=>r.method==='edit');
    const expected=host.foldChat(chat(0).slice(0,edit.index)).state;
    const folded=host.foldChat(chat(edit.n));
    const saved=JSON.parse(readFileSync(path.join(dir,'world-'+edit.n+'.json'),'utf8'));
    console.log(JSON.stringify({arm,edit:edit.index,expected:sha(expected),fold:sha(folded.state),saved:sha(saved),
        matchesExpected:sha(expected)===sha(folded.state),matchesActualReload:sha(saved)===sha(folded.state),
        differentSections:Object.keys(expected).filter(k=>sha(expected[k])!==sha(folded.state[k])),errors:folded.errors,
        scene:folded.state.scene.at,minute:folded.state.clock.minute}));
}
