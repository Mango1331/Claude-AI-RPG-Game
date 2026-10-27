// One host regenerate for an empty story, after ST releases its generation lock.
// The existing user record is reused; no player input or Engine turn is resent.
import { rec, setRec } from '../host.js';
export function createNarratorRecovery({ active, save, generate, schedule = fn => setTimeout(fn, 0), failed = () => {} }) {
    let pending = null;
    function current(job) {
        const a = active();
        return a.enabled !== false && a.chat === job.chat && a.chatId === job.chatId && a.epoch === job.epoch
            && a.chat[job.id] === job.reply && job.reply.mes === job.text
            && a.chat[job.u] === job.user && job.user.mes === job.input && rec(job.user) === job.record
            && !a.chat.slice(job.u + 1).some(m => m.is_user);
    }
    return {
        queue(id) {
            const a = active(), reply = a.chat[id];
            const u = a.chat.findLastIndex((m, i) => i < id && m.is_user);
            const user = a.chat[u], record = rec(user);
            if (a.enabled === false || a.group || !rec(reply)?.narration?.empty || !record?.events?.length || record.narrator_recovery) return false;
            pending = { ...a, id, reply, text: reply.mes, u, user, input: user.mes, record };
            return true;
        },
        finish() {
            const job = pending;
            if (!job) return;
            schedule(async () => {
                if (pending !== job || !current(job)) { if (pending === job) pending = null; return; }
                if (active().busy) return; // next GENERATION_ENDED will try again
                pending = null;
                setRec(job.user, { ...job.record, narrator_recovery: { attempts: 1 } });
                job.record = rec(job.user);
                try {
                    await save();
                    if (current(job) && !active().busy) await generate('regenerate');
                } catch (error) { failed(error); }
            });
        },
        invalidate() { pending = null; },
    };
}
