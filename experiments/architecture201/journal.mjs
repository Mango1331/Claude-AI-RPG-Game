import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export const copy = x => structuredClone(x);
export const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
export const fault = (message, code = 'PROTOTYPE_BLOCKED') => Object.assign(new Error(message), { code });

// Single-process durable journal, NOT a distributed database. Each instance re-reads before synchronous mutation.
export class Journal {
    constructor(file, chat = []) {
        this.file = file;
        this.fail = null;
        fs.mkdirSync(path.dirname(file), { recursive: true });
        if (!fs.existsSync(file)) this.write({ version: 1, revision: 0, world: { revision: 0, chat }, turns: {}, leases: {}, requests: [] });
    }
    read() { return JSON.parse(fs.readFileSync(this.file, 'utf8')); }
    write(value) {
        const stage = this.fail; this.fail = null;
        if (stage === 'before') throw fault('save before write');
        const temp = this.file + '.tmp';
        const fd = fs.openSync(temp, 'w', 0o600);
        try { fs.writeFileSync(fd, JSON.stringify(value)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        if (stage === 'during') throw fault('save before atomic rename');
        fs.renameSync(temp, this.file);
        const dir = fs.openSync(path.dirname(this.file), 'r');
        try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
        if (stage === 'after') throw fault('save acknowledgement lost');
    }
    update(fn) {
        const next = this.read(); fn(next); next.revision++;
        this.write(next);
        if (digest(this.read()) !== digest(next)) throw fault('readback mismatch');
        return next;
    }
}
