import { digest, copy } from './util.js';

// One global lease ledger for ALL Alpha chats in this ST profile. Caller holds the
// Web Lock for the complete execution, including all domain/tool continuations.
export class Scheduler {
    constructor(ledger, { timeout = 120000, status = () => {} } = {}) { Object.assign(this, { ledger, timeout, status }); }
    occupancy() { return Object.values(this.ledger.read().leases).filter(l => ['sent', 'remote_unknown'].includes(l.status)).reduce((n, l) => n + l.weight, 0); }
    async request(key, messages, transport, { current = () => true } = {}) {
        const all = Object.values(this.ledger.read().leases), old = all.filter(l => l.key === key);
        if (old.some(l => digest(l.messages) !== digest(messages))) throw Error('Request identity conflict');
        const receipt = old.find(l => l.status === 'completed');
        if (receipt) return copy(receipt.response);
        if (!current()) throw Error('Stopped or different chat');
        if (this.occupancy()) throw Error('Provider capacity locked: remote completion unknown or request running');
        if (old.length >= 2) throw Error('Two explicit attempts exhausted; no automatic retry');
        const id = `${key}:attempt:${old.length + 1}`;
        await this.ledger.update(db => { db.leases[id] = { id, key, weight: 4, status: 'sent', messages: copy(messages), sentAt: Date.now() }; });
        if (!current()) {
            await this.ledger.update(db => { db.leases[id].status = 'not_dispatched'; });
            throw Error('Stopped before dispatch');
        }
        this.status('Modellanfrage läuft · 4/4 Kapazitätseinheiten');
        let timer;
        const pending = (async () => {
            try {
                const response = await transport({ id, messages: copy(messages) });
                if (typeof response !== 'string' || !response.trim()) throw Object.assign(Error('Empty response'), { remoteFinished: true });
                await this.ledger.update(db => { Object.assign(db.leases[id], { status: 'completed', response, completedAt: Date.now() }); });
                return response;
            } catch (error) {
                // Unknown transport/abort stays occupied. HTTP errors explicitly acknowledged
                // by transport release only this request; no inference about other sessions.
                await this.ledger.update(db => { const l = db.leases[id]; if (l.status !== 'completed') Object.assign(l, {
                    status: error.remoteFinished ? 'remote_finished' : 'remote_unknown', error: error.message,
                }); }).catch(() => {}); // original write may have succeeded; reload reads authoritative disk
                throw error;
            }
        })();
        try {
            const response = await Promise.race([pending, new Promise((_, reject) => {
                timer = setTimeout(() => reject(Error('Provider timeout; remote completion unknown')), this.timeout);
            })]);
            if (!current()) throw Error('Stopped: received answer stored, publication withheld');
            return response;
        } catch (error) {
            // Do not mutate a concurrent late-response write. A persisted sent lease is
            // already blocked, including after browser reload or ST restart.
            throw error;
        } finally { clearTimeout(timer); }
    }
    async confirmRemoteFinished() {
        await this.ledger.update(db => { for (const l of Object.values(db.leases)) if (['sent','remote_unknown'].includes(l.status)) {
            l.status = 'remote_finished'; l.manualRemoteConfirmationAt = Date.now();
        } });
    }
    async settled(turnId) {
        // Publication is already durable. Old receipts can no longer be replayed by
        // that closed turn; keep aggregate counts, not ever-growing full prompt copies.
        await this.ledger.update(db=>{
            db.closedRequests ||= 0;
            for(const [id,l] of Object.entries(db.leases)) if(l.key.startsWith(turnId+':') && !['sent','remote_unknown'].includes(l.status)) {
                db.closedRequests++; delete db.leases[id];
            }
        });
    }
}
