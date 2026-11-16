import { copy, digest } from './util.js';

// ST 1.19 writes uploaded files atomically. The journal lives in this user's ST data root,
// not in a Node service, browser cache, or the active chat's mutable metadata.
export class FileStore {
    constructor(context) { this.context = context; }
    async rpc(url, body) {
        const r = await fetch(url, { method: 'POST', headers: this.context().getRequestHeaders(), body: JSON.stringify(body) });
        if (!r.ok) throw Error(`ST ${url}: HTTP ${r.status}`);
        return r.json();
    }
    async read(name) {
        const url = `user/files/${name}`;
        const exists = await this.rpc('/api/files/verify', { urls: [url] });
        if (!exists[url]) return null;
        const r = await fetch(`/${url}?gm=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) throw Error(`Journal read: HTTP ${r.status}`);
        return r.json();
    }
    async write(name, value) {
        const bytes = new TextEncoder().encode(JSON.stringify(value));
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        await this.rpc('/api/files/upload', { name, data: btoa(binary) });
        if (digest(await this.read(name)) !== digest(value)) throw Error('Journal save not confirmed by read-back');
    }
}

export class Journal {
    constructor(store, name, value) { Object.assign(this, { store, name, value }); }
    static async open(store, name, initial) {
        let value = await store.read(name);
        if (!value) {
            if (!initial) throw Error('Journal missing: restore the ST data backup; no automatic campaign recreation');
            value = copy(initial); await store.write(name, value);
        }
        return new Journal(store, name, value);
    }
    read() { return copy(this.value); }
    async update(fn) {
        const disk = await this.store.read(this.name);
        if (digest(disk) !== digest(this.value)) throw Error('Journal changed externally; reload required');
        const next = copy(disk); fn(next); next.revision = (next.revision || 0) + 1;
        await this.store.write(this.name, next);
        this.value = next;
        return copy(next);
    }
}
