// Run the original physical answers through both complete extraction paths, including their bounded repairs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
const [before, after, main, raw, out, variant = 'prompt'] = process.argv.slice(2);
assert(['prompt', 'object'].includes(variant));
const file = (n) => JSON.parse(fs.readFileSync(path.join(raw, n)));
const jsonl = (f) => fs.readFileSync(f, 'utf8').trim().split('\n').map(JSON.parse);
const mod = (repo, key) => import(pathToFileURL(path.resolve(repo, 'avereth-engine', key)));
const load = async (repo) => {
    const { loadContentPack } = await mod(repo, 'src/content.js');
    return {
        ...(await mod(repo, 'src/v4/runtime.js')),
        ...(await mod(repo, 'tools/bench_extract.mjs')),
        content: await loadContentPack((k) =>
            JSON.parse(fs.readFileSync(path.join(repo, 'avereth-engine/content', k))),
        ),
    };
};
const [base, next] = await Promise.all([load(before), load(after)]);
const ends = new Map(
    jsonl(path.join(raw, 'physical.jsonl'))
        .filter((r) => r.kind === 'end')
        .map((r) => [r.id, r]),
);
const chats = Object.fromEntries(
    ['A', 'B'].map((arm) => [arm, jsonl(path.join(raw, 'main-chat-' + arm + '.jsonl')).slice(1)]),
);
const dir = path.join(main, 'testrun_10b/user-20261119-010838/originals');
const historical = jsonl(
    path.join(
        dir,
        fs.readdirSync(dir).find((f) => f.endsWith('.jsonl')),
    ),
).slice(1);
const jobs = file('turns.json').map((r) => ({
    chat: chats[r.arm].slice(0, 11 + 2 * r.n),
    ids: r.requests,
    compact: false,
}));
for (const pair of file('optional.json'))
    for (const r of pair.rows) {
        const saved = file('AB-' + r.family + '-' + r.variant + '-' + r.turn + '.json');
        const chat = r.turn === 'U06-I21' ? historical.slice(0, 23) : chats.B.slice(0, 11 + 2 * r.turn);
        chat.splice(-2, 2, saved.player, saved.reply);
        jobs.push({ chat, ids: r.ids, compact: r.family === 'extractor' && r.variant === 1 });
    }
const obsolete = 'Answer with {"expected": {...}, "deltas": [...]}.\n\n';
const report = [],
    batches = [[], []];
for (const { chat, ids, compact } of jobs) {
    const records = ids.map((id) => ends.get(id)).filter((r) => r.role === 'extractor');
    const id = chat.length - 1;
    const trials = [];
    for (const arm of [base, next]) {
        const copy = arm.pendingChat(chat, id),
            calls = [];
        const req = arm.extractionRequest(copy, id, arm.content);
        batches[arm === base ? 0 : 1].push(
            ...records.map((r) => () => arm.readPhysical(r.text, req, arm.content, copy[id].mes)),
        );
        await arm.runExtraction(
            copy,
            id,
            arm.content,
            (request) => {
                assert(calls.length < records.length);
                const answer = records[calls.length].text;
                calls.push(request.messages);
                return answer;
            },
            { compactOutput: compact },
        );
        const savesRepair = variant === 'object' && arm === next && records[0].id === 30;
        assert.equal(calls.length, records.length - Number(savesRepair));
        assert.equal(copy[id].extra.avereth.extraction.status, 'applied');
        const evidence = arm.worldEvidence(copy, id);
        assert.deepEqual(evidence, arm.worldEvidence(JSON.parse(JSON.stringify(copy)), id));
        trials.push({ evidence, calls });
    }
    assert.deepEqual(trials[0].evidence.state, trials[1].evidence.state);
    const [oldEvents, newEvents] = trials.map((t) => structuredClone(t.evidence.events));
    if (variant === 'object' && records[0].id === 30) {
        const flags = [oldEvents, newEvents].map((events) => events.find((e) => e.t === 'extract.applied').d);
        assert.deepEqual(
            flags.map((f) => f.repaired),
            [true, false],
        );
        flags[0].repaired = false;
    }
    assert.deepEqual(oldEvents, newEvents);
    for (const [i] of trials[1].calls.entries()) {
        const old = trials[0].calls[i];
        if (variant === 'object') {
            assert.deepEqual(old, trials[1].calls[i]);
            continue;
        }
        const stripped = structuredClone(old);
        assert(stripped[0].content.includes(obsolete));
        stripped[0].content = stripped[0].content.replace(obsolete, '');
        assert.deepEqual(stripped, trials[1].calls[i]);
    }
    const result = {
        ids: records.map((r) => r.id),
        calls: trials.map((t) => t.calls.length),
        equal: true,
        reload: true,
        originalState: isDeepStrictEqual(base.worldEvidence(chat, id).state, trials[0].evidence.state),
    };
    assert.equal(result.originalState, true);
    if (records.some((r) => r.id === 30)) {
        const broken = JSON.parse(records[0].text);
        const outer = broken.deltas[0];
        assert.equal(outer.type, 'object.new');
        broken.deltas[0] = { seq: outer.seq, type: outer.type, ...outer.object };
        const j = base.judge({ id }, JSON.stringify(broken), base.content, chat);
        result.unwrap = {
            valid: j.valid,
            errors: j.errors,
            worldEqual: j.worldEqual,
            diff: j.diff,
            accepted: j.acceptedDeltas?.map((d) => d.type),
        };
    }
    if (records[0].id === 23 || records[0].id === 40) {
        let alternatives;
        if (records[0].id === 23) {
            const broken = records[0].text;
            const comma = broken.lastIndexOf(',', broken.indexOf('"deltas"'));
            alternatives = {
                endBrace: broken + '}',
                beforeDeltas: broken.slice(0, comma) + '}' + broken.slice(comma),
            };
        } else {
            const roleAnswer = (role) => {
                const answer = JSON.parse(records[0].text);
                answer.deltas[0].role = role;
                return JSON.stringify(answer);
            };
            alternatives = { villager: roleAnswer('villager'), guildOfficial: roleAnswer('Guild official') };
        }
        result.counterexamples = {};
        for (const [label, text] of Object.entries(alternatives)) {
            const parsed = base.judge({ id }, text, base.content, chat);
            result.counterexamples[label] = {
                valid: parsed.valid,
                worldEqual: parsed.worldEqual ?? null,
                diff: parsed.diff?.slice(0, 5),
            };
        }
    }
    report.push(result);
}
const { archived } = await mod(before, 'tools/bench_extract_archive.mjs');
const previousRuns = [];
for (const pack of await archived(main)) {
    const a = await base.replayJobs(pack),
        b = await next.replayJobs(pack);
    assert.equal(a.length, b.length);
    for (const [i, v] of a.entries()) {
        assert.deepEqual(v.evidence, b[i].evidence);
        assert.deepEqual(v.rejected, b[i].rejected);
        assert.equal(v.calls.length, b[i].calls.length);
        assert(v.reloadEqual && b[i].reloadEqual && !v.gap && !b[i].gap);
    }
    previousRuns.push({
        corpus: pack.name,
        physical: pack.items.length,
        jobs: a.length,
        used: a.reduce((n, r) => n + r.calls.length, 0),
    });
}
const timing = [[], []];
for (let round = 0; round < 22; round++) {
    for (const i of round % 2 ? [1, 0] : [0, 1]) {
        const start = performance.now();
        for (const parse of batches[i]) parse();
        if (round >= 2) timing[i].push(performance.now() - start);
    }
}
fs.writeFileSync(
    out,
    JSON.stringify({ natural: report, historical: previousRuns, parseBatchMs: timing }, null, 2) + '\n',
);
