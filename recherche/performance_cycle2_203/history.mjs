// Read the historical ST console format with the same parser used for the original audit.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
const [repo, main, output, raw, metadata] = process.argv.slice(2);
const { parseServerLog } = await import(pathToFileURL(path.resolve(repo, 'avereth-engine/tools/run_report.mjs')));
const files = [
    ['User04', '20261106-072640', 'serverlog.txt.gz'],
    ...['completions', 'phase_b_completions', 'phase_c_completions'].map((name) => [
        'User05',
        '20261118-011503',
        name + '.txt',
    ]),
];
const rows = [];
for (const [corpus, run, name] of files) {
    const bytes = fs.readFileSync(path.join(main, 'testrun_10b', 'archiv', 'user-' + run, 'originals', name));
    const text = name.endsWith('.gz') ? gunzipSync(bytes).toString('utf16le') : bytes.toString('utf8');
    const { pairs, errors } = parseServerLog(text.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n'));
    assert.deepEqual(errors, []);
    for (const { req, resp } of pairs) {
        assert(resp?.usage && resp.created);
        const {
            messages,
            model,
            stream,
            temperature,
            top_p,
            top_k,
            max_tokens,
            seed,
            reasoning_effort,
            clear_thinking,
            frequency_penalty,
            presence_penalty,
        } = req;
        rows.push({
            corpus,
            messages,
            params: {
                model,
                stream,
                temperature,
                top_p,
                top_k,
                max_tokens,
                seed,
                reasoning_effort,
                clear_thinking,
                frequency_penalty,
                presence_penalty,
            },
            created: resp.created,
            fingerprint: resp.system_fingerprint,
            usage: resp.usage,
        });
    }
}
fs.writeFileSync(output, JSON.stringify(rows));

if (raw && metadata) {
    const ledger = fs.readFileSync(path.join(raw, 'physical.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const details = [];
    for (const arm of ['A', 'B']) {
        const { pairs, errors } = parseServerLog(fs.readFileSync(path.join(raw, arm + '-st.log'), 'utf8'));
        const starts = ledger.filter((r) => r.kind === 'start' && r.arm === arm);
        assert.deepEqual(errors, []);
        assert.equal(starts.length, pairs.length);
        for (const [i, { req, resp }] of pairs.entries()) {
            assert.equal(req.model, starts[i].params.model);
            const id = starts[i].id,
                end = ledger.find((r) => r.kind === 'end' && r.id === id);
            if (resp) assert.deepEqual(JSON.parse(JSON.stringify(resp.usage)), end.usage);
            details.push({ id, fingerprint: resp?.system_fingerprint ?? null });
        }
    }
    fs.writeFileSync(metadata, JSON.stringify(details));
}
