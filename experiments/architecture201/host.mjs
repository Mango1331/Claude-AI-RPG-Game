import { copy, digest, fault, Journal } from './journal.mjs';

// Explicit ST1.19 behavioral mock: saveChat may resolve although no write succeeded;
// normal streaming renders before MESSAGE_RECEIVED. Controlled transport never uses stock Generate.
export class ST119Mock {
    constructor(file) { this.store = new Journal(file); this.chatId = 'fixture'; this.epoch = 0; this.dom = new Map(); this.chat = []; this.saveMode = null; this.log = []; }
    token() { return { chatId: this.chatId, epoch: this.epoch }; }
    current(t) { return t.chatId === this.chatId && t.epoch === this.epoch; }
    stop() { this.epoch++; }
    switchChat(id) { this.chatId = id; this.epoch++; this.dom.clear(); this.chat = []; }
    async stockGenerate(text, { stream = false } = {}) {
        this.chat.push({ mes: '', extra: {} });
        if (stream) { this.dom.set('stock', text.slice(0, 12)); this.log.push('stream-visible-before-received'); }
        this.chat.at(-1).mes = text; this.log.push('MESSAGE_RECEIVED');
        this.dom.set('stock', text); this.log.push('addOneMessage');
    }
    async saveChat({chatData: chat}) {
        if (this.saveMode === 'silent') { this.saveMode = null; return; }
        if (this.saveMode === 'throw') { this.saveMode = null; throw fault('ST save failed'); }
        this.store.update(db => { db.hostChats ||= {}; db.hostChats[this.chatId] = copy(chat); });
    }
    readChat() { return copy(this.store.read().hostChats?.[this.chatId] || []); }
    render(id, message) { if (!this.chat.some(m=>m.extra?.prototypeCommit===id)) throw fault('ST requires chat insertion before render'); this.dom.set(id, message.mes); this.log.push(`render:${id}`); }
    reload() { this.epoch++; this.chat = this.readChat(); this.dom.clear(); for (const m of this.chat) if (m.extra?.prototypeCommit) this.render(m.extra.prototypeCommit, m); }
}

export class HeldPublication {
    constructor(journal, host) { this.journal = journal; this.host = host; }
    async publish(id, token, hook = () => {}) {
        const db = this.journal.read(), t = db.turns[id];
        if (!['committed','published'].includes(t?.phase)) throw fault('world is not committed');
        if (db.world.revision !== t.baseRevision + 1 || digest(db.world.chat) !== digest(t.chat)) throw fault('publication revision conflict');
        if (!this.host.current(token)) throw fault('stale host');
        const key = `${id}@${t.baseRevision + 1}`;
        const chat = copy(t.chat); chat.at(-1).extra.prototypeCommit = key;
        if (digest(this.host.readChat()) !== digest(chat)) await this.host.saveChat({chatData: chat});
        if (digest(this.host.readChat()) !== digest(chat)) throw fault('ST save acknowledgement not confirmed');
        await hook('after_host_save');
        if (!this.host.current(token)) throw fault('chat changed while saving');
        this.host.chat = chat;
        if (!this.host.dom.has(key)) this.host.render(key, chat.at(-1));
        await hook('after_display');
        this.journal.update(db => { db.turns[id].phase = 'published'; });
    }
    // A committed retry/regen/swipe re-shows the SAME result. Alternative narrative branches deliberately unsupported.
    async resume(id, mode = 'reload') { if (!['reload','regenerate','swipe'].includes(mode)) throw fault('unsupported host mode'); return this.publish(id, this.host.token()); }
}
