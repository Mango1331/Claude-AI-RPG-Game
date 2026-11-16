// Failure metadata is not game state or a save receipt. Read back only on the rare
// failure-continuation path: ST 1.19 can resolve saveChat after a failed write.
import { rec, messageEvents } from '../host.js';
const signature = chat => JSON.stringify(chat.map(m => ({mes:m.mes, user:!!m.is_user, system:!!m.is_system,
    events:messageEvents(m), status:rec(m)?.extraction?.status ?? null,
    continuation:rec(m)?.continuation ?? null, failed:!!(rec(m)?.plan?.failed || rec(m)?.interp?.failed)})));
export function savedPrefixMatches(chat, saved, end) {
    return Array.isArray(saved) && saved.length > end
        && signature(chat.slice(0,end+1)) === signature(saved.slice(0,end+1));
}
export async function verifySavedChat(c, end, isCurrent, request = globalThis.fetch) {
    if (!isCurrent()) throw new Error('Stale persistence verification');
    const card=c.characters[c.characterId], chatId=c.getCurrentChatId();
    if (!card || !chatId || c.groupId) throw new Error('Cannot verify this chat');
    const snapshot=structuredClone(c.chat.slice(0,end+1));
    const message=c.chat[end], swipe=message?.swipe_id ?? 0, length=c.chat.length;
    const response=await request('/api/chats/get',{method:'POST',headers:c.getRequestHeaders(),
        body:JSON.stringify({ch_name:card.name,file_name:chatId,avatar_url:card.avatar})});
    if (!isCurrent()) throw new Error('Stale persistence verification');
    if (!response.ok) throw new Error('Saved chat readback failed');
    const data=await response.json();
    if (!isCurrent() || c.chat.length !== length || c.chat[end] !== message
        || (message?.swipe_id ?? 0) !== swipe || !savedPrefixMatches(snapshot,c.chat,end)
        || !savedPrefixMatches(snapshot,data.slice(1),end)) throw new Error('Saved chat does not match the completed records');
    return true;
}
