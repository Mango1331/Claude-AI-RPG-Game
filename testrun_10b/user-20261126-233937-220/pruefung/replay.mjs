// Aufruf mit dem Verzeichnis avereth-engine der Produktreferenz.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] || '.');
const { engineAt, recordOutput } = await import(pathToFileURL(resolve(root, 'tools/replay/replay.mjs')));
const { actionPrefix } = await import(pathToFileURL(resolve(root, 'src/action_input.js')));
const { host, runtime, content, version } = await engineAt(root);
assert.equal(version, '4.3.0-c.6.6.220');
const read = file => fs.readFileSync(new URL('../originals/' + file, import.meta.url), 'utf8');
const messages = read('chat.jsonl').trim().split('\n').slice(1).map(JSON.parse);
const exported = JSON.parse(read('avereth-events.json'));
const json = value => JSON.parse(JSON.stringify(value));
const answers = JSON.parse(execFileSync('python3', [fileURLToPath(new URL('st_antworten.py', import.meta.url))], {encoding:'utf8'}));

const recorded = messages.flatMap((m, i) => m.extra?.avereth?.events?.length ? [i] : []);
assert.deepEqual(exported.map(r => r.i), recorded);
for (const r of exported) assert.deepEqual(r.events, host.rec(messages[r.i]).events);
const greeting = structuredClone(messages[0]);
delete greeting.extra.avereth;
assert.equal(host.ensureCampaign([greeting], content, {seed:526138360, runtime:'v4', planner:true, ruleset:2}), 'created');
assert.deepEqual(json(host.rec(greeting).events), host.rec(messages[0]).events);

for (const chained of [false, true]) {
    let inputs = 0, extractions = 0;
    const roles = {};
    const chain = structuredClone(messages);
    chain[0].extra.avereth = host.rec(greeting);
    const queues = structuredClone(answers);
    for (const [i, original] of messages.entries()) {
        const expected = host.rec(original);
        if (!expected?.input_hash && !expected?.extraction) continue;
        const prefix = structuredClone((chained ? chain : messages).slice(0, i + 1));
        const current = prefix[i];
        delete current.extra.avereth;
        // A real HUD click signs its current prefix, which includes runtime timing and host metadata.
        if (chained && current.extra.avereth_action_input) {
            current.extra.avereth_action_input.base_revision = actionPrefix(prefix, i);
            chain[i].extra.avereth_action_input = structuredClone(current.extra.avereth_action_input);
        }
        const queue = queues[i] || [];
        const llm = async ({purpose}) => {
            const answer = queue.shift();
            assert.equal(answer?.purpose, purpose, 'Modellschritt M' + i);
            roles[purpose] = (roles[purpose] || 0) + 1;
            return answer.content;
        };
        if (current.is_user) {
            if (current.is_system && expected.command) current.is_system = false;
            await runtime.prepareGenerationAsync(prefix, content, {type:'normal', llm});
            inputs++;
        } else {
            const next = runtime.processReplyAny(prefix, i, content, {});
            assert.ok(next.extract, 'Antwort M' + i + ': ' + JSON.stringify(next));
            await runtime.runExtraction(prefix, i, content, llm);
            extractions++;
        }
        chain[i].extra.avereth = host.rec(current);
        assert.equal(queue.length, 0);
        assert.deepEqual(json(recordOutput(host.rec(current))), recordOutput(expected), 'Produktrecord M' + i);
    }
    assert.equal(inputs, 19);
    assert.equal(extractions, 14);
    const {state, errors} = host.foldChat(chain);
    assert.deepEqual(errors, []);
    assert.deepEqual(json(state), json(host.foldChat(messages).state));
    console.log({version, chained, greeting:true, inputs, extractions, roles, exportRecords:exported.length,
        events:exported.reduce((n,r) => n + r.events.length, 0), scene:state.scene.at, minute:state.clock.minute});
}
