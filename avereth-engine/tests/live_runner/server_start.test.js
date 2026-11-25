import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Guard } from '../../tools/st_live/live/lib.mjs';
import { freePort, startServer } from '../../tools/st_live/live/server.mjs';

test('the runner never opens another service that answered before its SillyTavern bound the port', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-st-start-'));
    const other = http.createServer((_req, res) => res.end('another service'));
    await new Promise((resolve) => other.listen(0, '127.0.0.1', resolve));
    fs.writeFileSync(path.join(root, 'server.js'), 'setTimeout(() => process.exit(17), 100);');
    let server;
    try {
        await assert.rejects(async () => {
            server = await startServer({ stDir: root, inst: { guard: new Guard([root]), config: root, data: root },
                port: other.address().port, logFile: path.join(root, 'server.log'), timedFile: path.join(root, 'timed.log'), timeoutMs: 5000 });
        }, /SillyTavern did not start \(exit 17\)/);
    } finally {
        await server?.stop();
        await new Promise((resolve) => other.close(resolve));
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('the runner recognizes the native ST listener line after its terminal title', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-st-start-'));
    const port = await freePort();
    fs.writeFileSync(path.join(root, 'server.js'), `require('node:http').createServer((_, res) => res.end('ready'))
        .listen(${port}, '127.0.0.1', () => console.log('\u001b]2;SillyTavern WebServer\u001b\\\\SillyTavern is listening on IPv4: 127.0.0.1:${port}'));`);
    let server;
    try {
        server = await startServer({ stDir: root, inst: { guard: new Guard([root]), config: root, data: root },
            port, logFile: path.join(root, 'server.log'), timedFile: path.join(root, 'timed.log'), timeoutMs: 5000 });
        assert.equal(server.port, port);
    } finally {
        await server?.stop();
        fs.rmSync(root, { recursive: true, force: true });
    }
});
