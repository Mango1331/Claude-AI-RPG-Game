// The player's SillyTavern program on the isolated instance (docs/LIVE_RUNNER.md §4): node server.js with the
// instance's config and data root, loopback only, no browser start. Its console goes to the run folder twice: as
// SillyTavern prints it (server.log, what tools/run_report.mjs parses) and with a time on every line
// (server.timed.log). The times of the "Chat Completion request/response" lines are kept as markers: calls.mjs pairs
// them with the logged bodies (the duration of every call, the narrator's too).
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { sleep } from './lib.mjs';

const ANSI = /\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07/g;
export const MARKER = /^Chat Completion (request|response):/;

/** A free TCP port on loopback, starting at `from`. */
export async function freePort(from = 8123) {
    for (let p = from; p < from + 200; p++) {
        const ok = await new Promise((r) => {
            const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true)));
            s.listen(p, '127.0.0.1');
        });
        if (ok) return p;
    }
    throw new Error(`no free port from ${from}`);
}

const get = (url) => new Promise((r) => {
    const req = http.get(url, (res) => { res.resume(); r(res.statusCode); });
    req.on('error', () => r(0));
    req.setTimeout(3000, () => { req.destroy(); r(0); });
});

/**
 * Start SillyTavern. Returns {url, markers, errors, stop(), output()}; rejects when it does not answer in time.
 * logFile/timedFile are written through the guard (run folder).
 */
export async function startServer({ stDir, inst, port, logFile, timedFile, timeoutMs = 240000 }) {
    const log = fs.createWriteStream(inst.guard.check(logFile));
    const timed = fs.createWriteStream(inst.guard.check(timedFile));
    const args = ['server.js', '--port', String(port), '--configPath', inst.config, '--dataRoot', inst.data, '--listen', 'false', '--browserLaunchEnabled', 'false', '--autorun', 'false'];
    // its own process group: a Ctrl+C in the terminal reaches the runner, which ends the run and then stops SillyTavern
    const child = spawn(process.execPath, args, { cwd: stDir, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }, windowsHide: true, detached: true });
    const markers = [];
    const errors = [];
    let tail = '';
    let partial = { out: '', err: '' };
    let exited = null;
    let inBody = false; // inside a logged request or reply (its words are no server error)
    const take = (which) => (d) => {
        const t = Date.now();
        const text = d.toString('utf8');
        log.write(text);
        tail = (tail + text).slice(-20000);
        const lines = (partial[which] + text).split(/\r?\n/);
        partial[which] = lines.pop();
        for (const raw of lines) {
            const line = raw.replace(ANSI, '');
            timed.write(`[${new Date(t).toISOString().slice(11, 23)}] ${line}\n`);
            const m = MARKER.exec(line);
            if (m) { markers.push({ kind: m[1], at: t }); inBody = !/}\s*$/.test(line); continue; }
            if (inBody) { if (/^}\s*$/.test(line)) inBody = false; continue; }
            if (/\b(error|exception|failed|ECONNREFUSED|ETIMEDOUT|ECONNRESET)\b/i.test(line)) errors.push({ at: t, which, line: line.slice(0, 400) });
        }
    };
    child.stdout.on('data', take('out'));
    child.stderr.on('data', take('err'));
    child.on('exit', (code, sig) => { exited = { code, sig, at: Date.now() }; });
    // the last resort: SillyTavern never outlives the runner (a crash, an exit from elsewhere)
    const reap = () => { if (!exited) { try { child.kill(); } catch { /* gone */ } } };
    process.on('exit', reap);
    const url = `http://127.0.0.1:${port}/`;
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
        if (exited) break;
        const code = await get(url);
        if (code >= 200 && code < 500) break;
        await sleep(500);
    }
    const stop = async () => {
        if (!exited) {
            child.kill();
            for (let i = 0; i < 40 && !exited; i++) await sleep(100);
            if (!exited) child.kill('SIGKILL');
        }
        process.off('exit', reap);
        await new Promise((r) => log.end(r));
        await new Promise((r) => timed.end(r));
    };
    if (exited || Date.now() - t0 >= timeoutMs) {
        await stop();
        throw new Error(`SillyTavern did not start (${exited ? `exit ${exited.code}` : 'timeout'}): ${tail.replace(ANSI, '').slice(-1500)}`);
    }
    return { url, port, markers, errors, child, stop, output: () => tail, exited: () => exited, startMs: Date.now() - t0 };
}
