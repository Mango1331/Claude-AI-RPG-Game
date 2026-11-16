// Runtime V4: one in-flight world extraction for the active ST chat.
// This is host lifecycle coordination only, not an alternative world authority.
import { rec, laterTurns } from '../host.js';
import { hash32 } from '../util.js';

/**
 * @param {{
 *   active: () => { chat: object[], chatId: string|null },
 *   run: (chat: object[], id: number, opts: {isCurrent: () => boolean, signal: AbortSignal}) => Promise<object>,
 *   applied: (job: object, result: object, isCurrent: () => boolean) => Promise<void>|void,
 *   failed?: (job: object, error: unknown, isCurrent: () => boolean) => Promise<object>|object,
 *   onError?: (err: unknown) => void
 * }} dependencies
 */
export function createWorldJobs({ active, run, applied, failed = null, onError = () => {} }) {
    let pending = null;

    // A chat switch (including away-and-back to the same ID) invalidates
    // the previous invocation. It cannot apply its result after cancellation.
    function invalidate() {
        const previous = pending;
        pending = null;
        if (previous && !previous.signal.aborted) previous.controller.abort();
    }

    // ST 1.19 initialises swipe zero AFTER MESSAGE_RECEIVED; absent/null is that same first swipe.
    function belongs(job) {
        const current = active();
        const msg = job.chat[job.id];
        return pending === job && !job.signal.aborted
            && current?.chatId === job.chatId && current?.chat === job.chat
            && msg === job.message && (msg?.swipe_id ?? 0) === (job.swipeId ?? 0)
            && rec(msg)?.text_hash === job.hash
            && hash32(msg?.mes ?? '') === job.hash && !laterTurns(job.chat, job.id);
    }

    function start(id) {
        const current = active();
        const chat = current?.chat;
        const msg = chat?.[id];
        const r = rec(msg);
        if (!Number.isInteger(id) || id < 0 || !current?.chatId || !msg
            || msg.is_user || msg.is_system
            || r?.extraction?.status !== 'pending'
            || r.text_hash !== hash32(msg.mes) || laterTurns(chat, id)) return null;

        if (pending && pending.chatId === current.chatId && pending.chat === chat
            && pending.id === id && pending.hash === r.text_hash
            && pending.message === msg && (pending.swipeId ?? 0) === (msg.swipe_id ?? 0)
            && belongs(pending)) return pending.job;

        // Different reply, changed swipe, or new chat: never let an old call
        // publish into a new host state. Custom endpoint calls can be aborted.
        invalidate();
        const controller = new AbortController();
        const job = {
            chatId: current.chatId, chat, id, message: msg,
            hash: r.text_hash, swipeId: msg.swipe_id,
            controller, signal: controller.signal, job: null,
        };
        pending = job;
        const isCurrent = () => belongs(job);
        let committed = null;
        job.job = Promise.resolve().then(async () => {
            if (!isCurrent()) return { changed: false, cancelled: true };
            const result = await run(chat, id, { isCurrent, signal: controller.signal });
            committed = result;
            if (isCurrent() && result?.changed) await applied(job, result, isCurrent);
            return result;
        }).catch(async (error) => {
            if (!isCurrent()) return {changed:false, cancelled:true};
            onError(error);
            if (committed?.changed) return {...committed, persistenceFailed:true, error};
            if (failed && rec(job.message)?.extraction?.status === 'pending') {
                const result = await failed(job, error, isCurrent);
                if (isCurrent() && result?.changed) {
                    try { await applied(job, result, isCurrent); }
                    catch (saveError) { onError(saveError); return {...result, persistenceFailed:true, error:saveError}; }
                }
                return result;
            }
            return { changed: false, error };
        }).finally(() => {
            if (pending === job) pending = null;
        });
        return job.job;
    }

    function currentJob() {
        return pending && belongs(pending) ? pending.job : null;
    }
    function currentId() {
        return pending && belongs(pending) ? pending.id : -1;
    }

    return { start, invalidate, currentJob, currentId };
}
