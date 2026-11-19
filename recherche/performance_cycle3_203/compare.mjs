// Run the original physical answers through both complete extraction paths, including their bounded repairs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
const [before, after, main, raw, out] = process.argv.slice(2);

const file = (n) => JSON.parse(fs.readFileSync(path.join(raw, n)));
const jsonl = (f) => fs.readFileSync(f, 'utf8').trim().split('\n').map(JSON.parse);
const mod = (repo, key) => import(pathToFileURL(path.resolve(repo, 'avereth-engine', key)));
const load = async (repo) => {
    const { loadContentPack } = await mod(repo, 'src/content.js');
    return {
        ...(await mod(repo, 'src/v4/runtime.js')),
        ...(await mod(repo, 'src/v4/items.js')),
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
const market = [base, next].map((engine) => engine.gearMarketText(engine.content, false, 'catalog'));
assert.notEqual(...market);
assert.equal(base.gearMarketText(base.content, true), next.gearMarketText(next.content, true));
const results = [];
for (const { chat, ids, compact } of jobs) {
    const records = ids.map((id) => ends.get(id)).filter((r) => r.role === 'extractor');
    const id = chat.length - 1;
    const trials = [];
    for (const engine of [base, next]) {
        const copy = engine.pendingChat(chat, id);
        const before = engine.worldEvidence(copy, id);
        const request = engine.extractionRequest(copy, id, engine.content);
        const messages = [];
        await engine.runExtraction(
            copy,
            id,
            engine.content,
            (req) => {
                const answer = records[messages.length].text;
                messages.push(req.messages);
                return answer;
            },
            { compactOutput: compact },
        );
        assert.equal(copy[id].extra.avereth.extraction.status, 'applied');
        const saved = engine.worldEvidence(copy, id);
        assert.deepEqual(saved, engine.worldEvidence(JSON.parse(JSON.stringify(copy)), id));
        assert.deepEqual(saved.state, engine.worldEvidence(chat, id).state);
        trials.push({ messages, saved, before, request });
    }
    const [original, candidate] = trials;
    assert.deepEqual(original.saved, candidate.saved);
    assert.equal(original.messages.length, records.length - Number(records[0].id === 30));
    const projected = original.messages.map((attempt) =>
        attempt.map((message) => ({
            ...message,
            content: message.content.replace(market[0], market[1]),
        })),
    );
    assert.deepEqual(projected, candidate.messages);
    assert(original.messages.every((messages) => messages[1].content.includes(market[0])));
    const emptyExpected = !Object.keys(original.request.expectedKeys).length;
    const deltaEvents = original.saved.events.filter((e) => !e.t.startsWith('extract.')).map((e) => e.t);
    results.push({
        first: records[0].id,
        calls: original.messages.length,
        emptyExpected,
        lostEventsIfSkipped: emptyExpected ? deltaEvents : [],
        skippedStateEqual: isDeepStrictEqual(original.before.state, original.saved.state),
    });
}
fs.writeFileSync(out, JSON.stringify({ market, jobs: results }, null, 2) + '\n');
