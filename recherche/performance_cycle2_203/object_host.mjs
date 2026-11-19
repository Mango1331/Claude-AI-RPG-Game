// Replay the actual failed X and its actual repair on isolated ST 1.19 hosts. All model traffic stays on loopback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const [before, after, raw, st, out] = process.argv.slice(2);
assert.equal(
    execFileSync('git', ['-C', st, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    '7e8663cd9c184a550b37238218bdd32c6efc68e9',
);
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-cycle2-host-'));
const lines = (f) => fs.readFileSync(path.join(raw, f), 'utf8').trim().split('\n').map(JSON.parse);
const [header, ...chat] = lines('main-chat-B.jsonl');
const calls = lines('physical.jsonl').filter((r) => r.kind === 'end' && [30, 31].includes(r.id));
const id = 18,
    card = chat[0].name,
    result = [];
const mod = (dir, p) => import(pathToFileURL(path.resolve(dir, 'avereth-engine', p)));
for (const [i, repo] of [before, after].entries()) {
    const { createInstance, writeConfig, seedProfile } = await mod(repo, 'tools/st_live/live/profile.mjs');
    const { startServer, freePort } = await mod(repo, 'tools/st_live/live/server.mjs');
    const { Driver, loadPlaywright } = await mod(repo, 'tools/st_live/live/driver.mjs');
    const { pendingChat, worldEvidence } = await mod(repo, 'tools/bench_extract.mjs');
    const seen = [],
        mock = http.createServer(async (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if (req.method === 'GET' && req.url === '/v1/models')
                return res.end(JSON.stringify({ object: 'list', data: [{ id: 'mock-cycle2', object: 'model' }] }));
            if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
                res.statusCode = 404;
                return res.end('{}');
            }
            const chunks = [];
            for await (const c of req) chunks.push(c);
            const body = JSON.parse(Buffer.concat(chunks)),
                n = seen.length;
            seen.push(body.messages);
            if (!body.messages[0].content.startsWith('You read one reply') || n >= calls.length) {
                res.statusCode = 400;
                return res.end('{}');
            }
            res.end(
                JSON.stringify({
                    id: 'local-' + n,
                    model: 'mock-cycle2',
                    choices: [
                        {
                            index: 0,
                            message: { role: 'assistant', content: calls[n].text },
                            finish_reason: 'stop',
                        },
                    ],
                }),
            );
        });
    await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
    let browser, server;
    try {
        const inst = createInstance({ runId: 'object-' + i, base: root, runDir: root });
        const port = await freePort(18742);
        writeConfig(inst, port);
        const start = (tag) =>
            startServer({
                stDir: st,
                inst,
                port,
                logFile: path.join(root, i + tag + '.log'),
                timedFile: path.join(root, i + tag + '-timed.log'),
            });
        const boot = await start('boot');
        await boot.stop();
        const preset = fs.readFileSync(path.join(repo, 'avereth-engine/presets/Avereth Narrator V4.json'), 'utf8');
        seedProfile(inst, {
            username: chat.find((m) => m.is_user).name,
            card: { name: card, first_mes: chat[0].mes },
            preset: { name: 'Avereth Narrator V4', text: preset },
            generation: {},
            source: 'custom',
            connection: {
                chat_completion_source: 'custom',
                custom_url: 'http://127.0.0.1:' + mock.address().port + '/v1',
                custom_model: 'mock-cycle2',
            },
        });
        const name = 'Cycle2-Note';
        const folder = path.join(inst.user, 'chats', card);
        fs.mkdirSync(folder, { recursive: true });
        fs.writeFileSync(
            path.join(folder, name + '.jsonl'),
            [header, ...pendingChat(chat, id)].map((m) => JSON.stringify(m)).join('\n') + '\n',
            { flag: 'wx' },
        );
        server = await start('st');
        browser = await loadPlaywright().chromium.launch({
            executablePath: process.env.AVERETH_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
            args: ['--no-sandbox', '--disable-dev-shm-usage'],
        });
        const d = await Driver.create(browser, {});
        assert((await d.open(server.url)).connected);
        await d.openCard(card);
        await d.page.evaluate((n) => SillyTavern.getContext().openCharacterChat(n), name);
        d.testChat = await d.identity();
        await d.page.waitForFunction(
            (id) =>
                SillyTavern.getContext().chat[id]?.extra?.avereth?.extraction?.status === 'applied' &&
                document.querySelector('#avereth-action-status')?.textContent === 'Gespeichert',
            id,
            { timeout: 90000 },
        );
        const saved = await d.chat();
        assert(await d.verifySaved(saved, { complete: true }));
        await d.page.evaluate(() => SillyTavern.getContext().reloadCurrentChat());
        const reloaded = await d.chat();
        assert(await d.verifySaved(reloaded, { complete: true }));
        const ev = worldEvidence(reloaded, id);
        assert.deepEqual(ev, worldEvidence(saved, id));
        assert.deepEqual(ev.state, worldEvidence(chat, id).state);
        const last = ev.events.find((e) => e.t === 'extract.applied');
        assert.equal(last.d.repaired, i === 0);
        delete last.d.repaired;
        assert.equal(seen.length, i === 0 ? 2 : 1);
        const hash = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
        result.push({
            requests: seen.length,
            state: hash(ev.state),
            eventsWithoutRepairFlag: hash(ev.events),
            readback: true,
        });
    } finally {
        await browser?.close();
        await server?.stop();
        await new Promise((resolve) => mock.close(resolve));
    }
}
assert.equal(result[0].state, result[1].state);
assert.equal(result[0].eventsWithoutRepairFlag, result[1].eventsWithoutRepairFlag);
fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
