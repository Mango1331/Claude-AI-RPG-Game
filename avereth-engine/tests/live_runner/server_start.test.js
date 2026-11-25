import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Guard } from '../../tools/st_live/live/lib.mjs';
import { startServer } from '../../tools/st_live/live/server.mjs';

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
