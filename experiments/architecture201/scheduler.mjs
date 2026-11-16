import { digest, fault } from './journal.mjs';

// No network: caller supplies the transport. All physical dispatches/receipts are journalled.
export class Scheduler {
    constructor(journal, { capacity = 4, maxAttempts = 2, backoff = 10, now = () => 0 } = {}) {
        this.journal = journal; this.capacity = capacity; this.maxAttempts = maxAttempts;
        this.backoff = backoff; this.now = now;
    }
    occupancy() { return Object.values(this.journal.read().leases).filter(x => ['sent', 'remote_unknown'].includes(x.status)).reduce((n, x) => n + x.weight, 0); }
    abort(id) {
        this.journal.update(db => { const l = db.leases[id]; if (l?.status === 'sent') { l.status = 'remote_unknown'; l.abortedAt = this.now(); } });
    }
    remoteComplete(id) {
        this.journal.update(db => { const l = db.leases[id]; if (!l) throw fault('unknown lease'); if (['sent','remote_unknown'].includes(l.status)) { l.status = 'remote_finished'; l.retryAt = this.now() + this.backoff; } });
    }
    recoverAfterCrash() {
        this.journal.update(db => { for (const l of Object.values(db.leases)) if (l.status === 'sent') l.status = 'remote_unknown'; });
    }
    async request(key, messages, transport, { weight = 4, phase = key, current = () => true } = {}) {
        if (!Number.isInteger(weight) || weight < 1 || weight > this.capacity) throw fault('invalid capacity weight');
        if (!current()) throw fault('stale request');
        const hash = digest(messages), old = Object.values(this.journal.read().leases).filter(l => l.key === key);
        if (old.some(l => l.promptHash !== hash)) throw fault('request identity reused with another prompt');
        const receipt = old.find(l => l.status === 'completed');
        if (receipt) return structuredClone(receipt.response);
        if (!current()) throw fault('stale request');
        const last = old.at(-1);
        if (last?.retryAt > this.now()) throw fault('backoff');
        if (old.length >= this.maxAttempts) throw fault('attempt limit');
        const id = `${key}:attempt:${old.length + 1}`;
        this.journal.update(db => {
            const used = Object.values(db.leases).filter(l => ['sent','remote_unknown'].includes(l.status)).reduce((n,l) => n+l.weight, 0);
            if (used + weight > this.capacity) throw fault('capacity blocked; remote completion unknown or busy');
            const lease = { id, key, phase, weight, promptHash: hash, status: 'sent', attempt: old.length + 1, sentAt: this.now() };
            db.leases[id] = lease;
            db.requests.push({ id, key, phase, weight, occupancy: used + weight,
                promptChars: messages.reduce((n,m) => n + m.content.length, 0), wireBytes: Buffer.byteLength(JSON.stringify(messages)),
                // Store the FULL request: measurements do not omit system, history, schema or catalog.
                messages });
        });
        try {
            const response = await transport({ id, messages, phase });
            if (response === undefined) throw Object.assign(fault('transport returned no answer'), {remoteFinished:true});
            const lease = this.journal.read().leases[id];
            if (!current() || lease.status !== 'sent') { this.remoteComplete(id); throw fault('late response discarded'); }
            this.journal.update(db => { Object.assign(db.leases[id], { status: 'completed', response, completedAt: this.now() }); });
            return structuredClone(response);
        } catch (error) {
            // A failed acknowledgement may have persisted a valid receipt. Never overwrite it or resend blindly.
            const lease = this.journal.read().leases[id];
            if (lease.status === 'completed') throw error;
            if (lease.status === 'sent') this.journal.update(db => Object.assign(db.leases[id], {
                status: error.remoteFinished === true ? 'remote_finished' : 'remote_unknown',
                retryAt: this.now() + this.backoff, error: String(error.message),
            }));
            throw error;
        }
    }
}
