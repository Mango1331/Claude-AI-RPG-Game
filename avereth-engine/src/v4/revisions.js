// ST owns messages/swipes and their per-answer event records. Only a revised history needs a
// parent link: which preceding active message, swipe and text this message was actually played on.
// A suffix can be retained on disk for audit and become active again on exact restoration.
import { hash32 } from '../util.js';

const lastSeen = new WeakMap();

function identity(msg) {
    const previous = lastSeen.get(msg);
    const swipe = msg.swipe_id ?? 0;
    if (previous && previous.text === msg.mes && previous.swipe === swipe) return previous;
    return { text: msg.mes, hash: hash32(msg.mes || ''), swipe };
}

function key(index, revision) {
    return index + '/' + revision.swipe + '/' + revision.hash;
}

export function previousRevision(msg) {
    return lastSeen.get(msg);
}

export function rememberRevision(msg) {
    if (msg) lastSeen.set(msg, identity(msg));
}

export function activeMessage(msg) {
    return !!msg && !msg.avereth_inactive;
}

// Before a native edit/swipe, successors in old saves have no links yet. Pin these to the
// revision they were played on, then select the branch for the current text. On normal loads
// and appended inputs only the second pass is necessary. Never regenerate archived messages.
export function reconcileRevisions(chat, id = -1, old = null) {
    if (old && id >= 0) chat[id].avereth_fork = true;
    const first = chat.findIndex(m => m.avereth_fork || m.avereth_parent);
    if (first < 0) {
        for (const msg of chat) rememberRevision(msg);
        return [];
    }
    const changed = [];
    function walk(prior) {
        let parent = first > 0 ? key(first - 1, identity(chat[first - 1])) : null;
        for (let i = first; i < chat.length; i++) {
            const msg = chat[i];
            if (i > first && !msg.avereth_parent) msg.avereth_parent = parent;
            const active = !msg.avereth_parent || msg.avereth_parent === parent;
            if (!prior && active !== activeMessage(msg)) {
                if (active) delete msg.avereth_inactive;
                else msg.avereth_inactive = true;
                changed.push(i);
            }
            if (active) parent = key(i, prior && i === id ? old : identity(msg));
        }
    }
    if (old) walk(true);
    walk(false);
    for (const msg of chat) rememberRevision(msg);
    return changed;
}
