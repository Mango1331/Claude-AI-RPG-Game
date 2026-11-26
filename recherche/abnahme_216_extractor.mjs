// Offline acceptance on primary sources. Argument: avereth-engine/ from the .215 or .216 checkout.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (!process.argv[2]) throw new Error('Expected a path to the product avereth-engine directory');
const engine = path.resolve(process.argv[2]);
const archive = fileURLToPath(new URL('../testrun_10b/', import.meta.url));
const mod = file => import(pathToFileURL(path.join(engine, file)));
const { engineAt } = await mod('tools/replay/replay.mjs');
const { parseServerLog } = await mod('tools/run_report.mjs');
const { parseExtraction } = await mod('src/v4/extract.js');
const { runtime, host, content, version, validate } = await engineAt(engine);
assert.match(version, /\.21[56]$/);
const early = version.endsWith('.216');
const normalizedText = t => t.replace(/\s+/g, ' ').trim();
const runs = [
    ['user-20261125-005145-211', [[16, 18, [19]], [68, 85, [86]], [148, 201, [202]]]],
    ['user-20261125-212154-213', [[14, 14, [15]]]],
    ['user-20261126-010332-215', [[14, 16, [17, 18, 19]]]],
];

// Restore the documented physical order, including failed and repeated X requests.
const unpack = [
    'import sys, pathlib, subprocess, zipfile, hashlib',
    'root, dest = map(pathlib.Path, sys.argv[1:])',
    'if (root / "restore_log.py").exists():',
    '    withLog = subprocess.check_output([sys.executable, str(root / "restore_log.py")], text=True)',
    '    restored = pathlib.Path(withLog.strip().split("Restored log: ")[-1])',
    '    raw = restored.read_bytes()',
    '    chat = (root / "originals/chat.jsonl").read_bytes()',
    '    restored.unlink()',
    '    restored.parent.rmdir()',
    'else:',
    '    source = root / "originals/User12_211_Quellenarchiv.zip"',
    '    assert hashlib.sha256(source.read_bytes()).hexdigest() == "2c9eff1e307950cfb7f39f7d6e56a5a25268c0161cab7ec3a7ea182ce89f4daa"',
    '    with zipfile.ZipFile(source) as z:',
    '        raw, chat = z.read("phase-b/st.redacted.txt"), z.read("phase-b/chat.jsonl")',
    'lines = []',
    'for line in raw.decode("utf-16").splitlines():',
    '    try: line = line.encode("cp850").decode("utf8")',
    '    except UnicodeError: pass',
    '    lines.append(line)',
    '(dest / "chat").write_bytes(chat)',
    '(dest / "log").write_text("\\n".join(lines), encoding="utf8")',
].join('\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth216-'));
let totalCalls = 0, totalInput = 0;
try {
    for (const [folder, groups] of runs) {
        execFileSync('python3', ['-c', unpack, path.join(archive, folder), tmp]);
        const chat = fs.readFileSync(path.join(tmp, 'chat'), 'utf8').trim().split('\n').slice(1).map(JSON.parse);
        const blocks = fs.readFileSync(path.join(tmp, 'log'), 'utf8').split(/^Chat Completion request: /m);
        const response = i => {
            const part = blocks[i].split(/^Chat Completion response: /m)[1];
            return parseServerLog('Chat Completion request: {}\nChat Completion response: ' + part).pairs[0].resp;
        };
        for (const [msg, n, physical] of groups) {
            assert.equal(normalizedText(chat[msg].mes), normalizedText(response(n).choices[0].message.content));
            const copy = structuredClone(chat.slice(0, msg + 1));
            delete copy[msg].extra.avereth;
            assert(runtime.processReplyAny(copy, msg, content).extract);
            const req = runtime.extractionRequest(copy, msg, content);
            const parse = text => parseExtraction(text, req.vocab, req.ids, req.expectedKeys, {
                sceneRequired: req.sceneRequired, startScene: req.startScene, state: req.state, content, reply: copy[msg].mes,
            });
            for (const i of physical) {
                const answer = response(i).choices[0].message.content;
                assert.throws(() => JSON.parse(answer));
                const original = JSON.parse(answer + '}');
                assert(!Object.hasOwn(original, 'deltas') && Array.isArray(original.expected.deltas));
                const { deltas, ...steps } = original.expected;
                const canonical = parse(JSON.stringify({ ...original, expected: steps, deltas }));
                assert(canonical.complete && canonical.valid && !canonical.issues.length);
                const actual = parse(answer);
                if (early) {
                    assert(actual.complete && !actual.issues.length);
                    assert.deepEqual(actual.value, canonical.value);
                } else assert(actual.errors.some(e => e.includes('$.deltas')));
                assert.equal(actual.valid, early);
                console.log(folder, 'X #' + i, 'valid', actual.valid, 'deltas', deltas.length);
            }
            let i = n, cost = 0;
            const next = async () => {
                assert.match(blocks[++i], /content: 'You read one reply/);
                const reply = response(i);
                cost += reply.usage.prompt_tokens;
                return reply.choices[0].message.content;
            };
            let result = await runtime.runExtraction(copy, msg, content, next);
            if (!early && physical.length === 3 && !result.applied) {
                assert.equal(i, 18);
                const r = host.rec(copy[msg]);
                host.setRec(copy[msg], { ...r, events: [], continuation: undefined, extraction: { ...r.extraction, status: 'pending' } });
                result = await runtime.runExtraction(copy, msg, content, next);
            }
            assert(result.applied);
            const fold = host.foldChat(copy);
            assert.deepEqual(fold.errors, []);
            assert.deepEqual(validate.validateState(fold.state, content), []);
            assert.equal(i - n, early ? 1 : (physical.length === 3 ? 4 : 2));
            console.log(folder, 'M' + msg, 'X calls', i - n, 'X input', cost,
                'rejections', host.rec(copy[msg]).rejected?.map(x => x.rule) ?? []);
            totalCalls += i - n;
            totalInput += cost;
        }
    }
    assert.deepEqual([totalCalls, totalInput], early ? [5, 75372] : [12, 183588]);
    console.log(version, totalCalls, 'X requests,', totalInput, 'input tokens');
} finally {
    fs.rmSync(tmp, { recursive: true, force: true });
}
