// Offline corpus. The log is physical evidence, the chat selects a revision, the .203 runtime selects the applied attempt.
import assert from 'node:assert/strict';
import path from 'node:path';
import { expectations } from './bench_extract_expectations.mjs';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { prepare, dryRun, replayJobs, judge } from './bench_extract.mjs';

export async function archived(main) {
    const out = [];
    for (const [name,run,prefix] of [['U5A','20261118-011503',''],['U5B','20261118-011503','phase_b_'],
        ['U5C','20261118-011503','phase_c_'],['U6','20261119-010838',null]]) {
        const dir = path.join(main,'testrun_10b','user-'+run,'originals');
        const files = fs.readdirSync(dir);
        const log = prefix === null ? files.find(f=>f.startsWith('Chat Completion request')) : prefix+'completions.txt';
        const chat = prefix === null ? files.find(f=>f.endsWith('.jsonl')) : prefix+'chat.jsonl';
        out.push({name,...await prepare({log:path.join(dir,log),chat:path.join(dir,chat)})});
    }
    return out;
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    for (const prep of await archived(process.argv[2])) {
        const rows = dryRun({...prep,requirements:id=>expectations(prep.name,id)});
        const jobs = await replayJobs(prep);
        assert(rows.every(r=>r.mapping==='active' && r.logged && r.judged && !r.judged.errors?.includes('no extraction request')));
        assert(jobs.every(j=>!j.gap && j.reloadEqual));
        // Explicitly exercise a wrong arrival in an otherwise parseable first arrival report.
        if(prep.name==='U6'){
            const first=prep.items.find(i=>i.id===6);
            const wrong=JSON.parse(first.resp.choices[0].message.content);
            const goal=wrong.expected['1'];
            goal.arrived=false;goal.at=null;wrong.scene='here';
            wrong.deltas=wrong.deltas.filter(d=>d.type!=='arrive');
            const result=judge(first,JSON.stringify(wrong),prep.content,prep.chat,expectations('U6',6));
            assert(result.valid && result.semanticComplete===false && !result.worldEqual);
        }
        const missing=prep.chat.flatMap((m,id)=>prep.name==='U6' && m.extra?.avereth?.extraction?.llm?.length &&
            !prep.items.some(item=>item.id===id) ? [id] : []);
        console.log(JSON.stringify({name:prep.name,missingChatJobs:missing,rows:rows.map(r=>({request:r.n+1,id:r.id,attempt:r.attempt,identical:r.identical,
            valid:r.judged.valid,complete:r.judged.complete,issues:r.judged.issues?.map(x=>x.why),errors:r.judged.errors,
            accepted:r.judged.acceptedDeltas?.length,rejections:r.judged.rejections,worldEqual:r.judged.worldEqual,
            eventsEqual:r.judged.eventsEqual,semanticComplete:r.judged.semanticComplete,missingRequirements:r.judged.missingRequirements})),jobs:jobs.map(({evidence,...result})=>result)}));
    }
}
