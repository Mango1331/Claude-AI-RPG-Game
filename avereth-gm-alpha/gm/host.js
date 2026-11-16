import { copy, digest } from './util.js';
import { content, foldChat } from './engine.js';
import { renderHud } from '../src/hud.js';

// ST decorates its in-memory messages with swipe caches and rendering metadata.
// They are not world truth. Compare all text, roles and authoritative engine records;
// exact full-byte readback remains mandatory for our own server saves.
export const sameTranscript = (a,b) => digest(a.map(m=>({mes:m.mes,name:m.name,user:!!m.is_user,system:!!m.is_system,record:m.extra?.avereth})))
    === digest(b.map(m=>({mes:m.mes,name:m.name,user:!!m.is_user,system:!!m.is_system,record:m.extra?.avereth})));

export class Host {
    constructor(context, store) { Object.assign(this, { context, store, epoch: 0 }); }
    target() {
        const c = this.context(), ch = c.characters[c.characterId];
        if (c.groupId || !ch || !c.chatId) throw Error('Open a single-character test chat');
        return { avatar_url: ch.avatar, ch_name: ch.name, file_name: c.chatId };
    }
    id() { const t = this.target(); return JSON.stringify([t.avatar_url,t.file_name]); }
    token() { return { id: this.id(), epoch: this.epoch }; }
    current(t) { try { return t.id === this.id() && t.epoch === this.epoch; } catch { return false; } }
    stop() { this.epoch++; }
    async read(target) {
        const rows = await this.store.rpc('/api/chats/get', target);
        return Array.isArray(rows) ? { header: rows[0], chat: rows.slice(1) } : null;
    }
    async save(target, header, chat) {
        await this.store.rpc('/api/chats/save', { ...target, chat: [header, ...chat] });
        const back = await this.read(target);
        if (!back || digest(back.chat) !== digest(chat) || digest(back.header.chat_metadata) !== digest(header.chat_metadata)) throw Error('ST save not confirmed by read-back');
    }
    render(chat, header, token) {
        if (!this.current(token)) throw Error('Chat switched before display');
        const c = this.context();
        c.chat.splice(0,c.chat.length,...copy(chat));
        Object.assign(c.chatMetadata,copy(header.chat_metadata));
        document.querySelector('#chat').replaceChildren();
        for (let i = 0; i < c.chat.length; i++) c.addOneMessage(c.chat[i],{forceId:i,scroll:false});
        const hud=document.querySelector('#gm-alpha-hud');
        if(hud)hud.innerHTML=renderHud(foldChat(chat).state,content,'closed');
        const area=document.querySelector('#chat');area.scrollTop=area.scrollHeight;
    }
}
export class Publication {
    constructor(journal,host) { Object.assign(this,{journal,host}); }
    async publish(id,token,hook=async()=>{}) {
        const db=this.journal.read(),t=db.turns[id],h=this.host;
        if (!h.current(token) || db.originChatId!==token.id || JSON.stringify([db.target.avatar_url,db.target.file_name])!==token.id) throw Error('Wrong publication chat');
        if (!['committed','published'].includes(t.phase) || db.world.revision!==t.baseRevision+1 || digest(db.world.chat)!==digest(t.chat)) throw Error('Publication revision conflict');
        const current=await h.read(db.target), desired=t.chat;
        if (!current) throw Error('Origin chat missing');
        // A save after commit may already have succeeded before a crash. Otherwise only
        // the exact original confirmed chat may be replaced; never overwrite user edits.
        if (!sameTranscript(current.chat,desired)) {
            if (!sameTranscript(current.chat,t.base)) throw Error('Chat edited outside Alpha; restore its original transcript before resume');
            if (!h.current(token)) throw Error('Stopped before chat save');
            await h.save(db.target,current.header,desired);
        }
        await hook('after_host_save');
        if (!h.current(token)) throw Error('Stopped after save; resume in origin chat');
        h.render(desired,current.header,token);
        await hook('after_display');
        if (!h.current(token)) throw Error('Stopped after display');
        if (t.phase!=='published') await this.journal.update(d=>{d.turns[id].phase='published';});
    }
}
