// ST 1.19's active-chat save wrapper swallows errors. Pin identity before any await.
export function chatOrigin(c) {
    const card = c.characters?.[c.characterId], file = c.getCurrentChatId();
    if (!card?.avatar || !file || c.groupId) throw new Error('Action HUD requires an identified single-character chat');
    return { avatar_url: card.avatar, file_name: file, ch_name: card.name };
}
export const originKey = o => JSON.stringify([o.avatar_url, o.file_name]);
const canonical = value => JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
// ST persists the complete message objects, including names, generation times and future fields.
// A gameplay-only projection cannot prove that a native snapshot or its read-back is current.
export const recordSignature = chat => canonical(chat);

export async function decodeSave(options) {
    let body = options.body;
    if (new Headers(options.headers).get('Content-Encoding') === 'gzip') {
        body = await new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    } else if (typeof body !== 'string') body = await new Response(body).text();
    const data = JSON.parse(body);
    if (!data.avatar_url || !data.file_name || !Array.isArray(data.chat)) throw new Error('Unidentified ST save');
    return data;
}

export function createChatPersistence({ request, headers, active, locks, changed = () => {}, settled = () => {} }) {
    const queues = new Map();
    const matching = o => { try { return originKey(chatOrigin(active())) === originKey(o); } catch { return false; } };
    async function queue(key, fn) {
        const previous = queues.get(key) || Promise.resolve();
        const pending = previous.catch(() => {}).then(() => locks ? locks.request(`avereth.save:${key}`, fn) : fn());
        queues.set(key, pending);
        try { return await pending; } finally { if (queues.get(key) === pending) queues.delete(key); settled(); }
    }
    async function verify(origin, snapshot, frozenSignature) {
        const response = await request('/api/chats/get', {method:'POST',headers:headers(),body:JSON.stringify(origin)});
        if (!response.ok) throw new Error('Chat read-back failed');
        const saved = await response.json();
        if (!Array.isArray(saved) || recordSignature(saved.slice(1)) !== (frozenSignature ?? recordSignature(snapshot.slice(1)))
            || canonical(saved[0]?.chat_metadata) !== canonical(snapshot[0]?.chat_metadata))
            throw new Error('Chat read-back differs from the saved revision');
        return true;
    }
    async function write(data, isCurrent = () => true) {
        const frozen = structuredClone(data), key = originKey(frozen);
        if (!matching(frozen) || !isCurrent()) throw new Error('Stale origin chat save');
        const meta = frozen.chat[0]?.chat_metadata;
        if (!meta) throw new Error('Missing chat metadata');
        // frozen is a private structured clone. Only its header revision changes during this write.
        const frozenSignature = recordSignature(frozen.chat.slice(1));
        const origin = {avatar_url:frozen.avatar_url, file_name:frozen.file_name, ch_name:frozen.ch_name};
        let baseRevision = Number(meta.avereth_save_revision || 0);
        const activeRevision = Number(active().chatMetadata?.avereth_save_revision || 0);
        if (baseRevision < activeRevision) {
            // ST can serialize the same current content twice before its gzip fetch is dispatched.
            // Rebase only an entirely identical snapshot. It still goes through a real write/read-back;
            // no rejected or merely 'superseded' payload is ever acknowledged here.
            if (frozenSignature !== recordSignature(active().chat)
                || canonical({...meta,avereth_save_revision:0}) !== canonical({...active().chatMetadata,avereth_save_revision:0}))
                throw new Error('Older native save revision');
            baseRevision = activeRevision;
        }
        const saveRevision = baseRevision + 1;
        meta.avereth_save_revision = saveRevision;
        active().chatMetadata.avereth_save_revision = saveRevision;
        changed('saving', key);
        return queue(key, async () => {
            if (!matching(frozen) || !isCurrent()) throw new Error('Stale origin chat save');
            // Reject a delayed native snapshot after in-memory game/input changes.
            if (frozenSignature !== recordSignature(active().chat)) throw new Error('Stale chat snapshot');
            const priorResponse = await request('/api/chats/get', {method:'POST',headers:headers(),body:JSON.stringify(origin)});
            if (!priorResponse.ok) throw new Error('Cannot check prior chat revision');
            const prior = await priorResponse.json();
            if (Number(prior?.[0]?.chat_metadata?.avereth_save_revision || 0) > baseRevision)
                throw new Error('Another writer advanced this chat; reload before continuing');
            if (!matching(frozen) || !isCurrent() || frozenSignature !== recordSignature(active().chat)
                || canonical({...meta,avereth_save_revision:0}) !== canonical({...active().chatMetadata,avereth_save_revision:0}))
                throw new Error('Stale origin or records before write');
            const response = await request('/api/chats/save', {method:'POST',headers:headers(),body:JSON.stringify({...frozen,force:false})});
            if (!response.ok) throw new Error(`Chat save failed (${response.status})`);
            await verify(origin, frozen.chat, frozenSignature);
            if (matching(frozen) && isCurrent() && active().chatMetadata.avereth_save_revision === saveRevision
                && recordSignature(active().chat)===frozenSignature
                && canonical(active().chatMetadata)===canonical(meta)) changed('saved', key);
            return response;
        }).catch(e => { changed('error', key, e); throw e; });
    }
    async function save(c, isCurrent = () => true) {
        const origin = chatOrigin(c);
        const snapshot = structuredClone([{chat_metadata:c.chatMetadata || {},user_name:'unused',character_name:'unused'},...c.chat]);
        return write({...origin,chat:snapshot}, isCurrent);
    }
    return { save, write, verify: (origin, snapshot) => verify(origin, snapshot), matching, pending: () => queues.size > 0 };
}
