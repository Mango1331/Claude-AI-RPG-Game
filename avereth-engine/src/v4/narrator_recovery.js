// One shared retry budget for a transient provider error or an empty story.
// The existing user record is reused; no player input or Engine turn is resent.
import { rec, setRec } from '../host.js';

// ST 1.19 may return HTTP 200 with only an upstream HTTP status phrase in error.message.
// Keep the wire status; recognize only explicit transient codes or standard status phrases.
export function providerResponseError(status, body) {
    const error = body?.error;
    const type = error?.type;
    const code = error?.code;
    const message = String(error?.message || (typeof error === 'string' ? error : body?.message) || 'invalid provider response').slice(0, 200);
    const kinds = [type, code];
    const permanent = body?.quota_error === true || kinds.some(k => ['invalid_api_key', 'authentication_error', 'permission_error', 'permission_denied', 'invalid_request_error', 'context_length_exceeded', 'model_not_found', 'insufficient_quota'].includes(k));
    const transientBody = kinds.some(k => ['server_error', 'internal_server_error', 'temporarily_unavailable', 'rate_limit_error'].includes(k))
        || ['internal server error', 'bad gateway', 'service unavailable', 'gateway timeout', 'too many requests', 'request timeout'].includes(message.trim().toLowerCase());
    const retryable = !permanent && ([408, 429].includes(status) || status >= 500 || (status === 200 && !!error && transientBody));
    return Object.assign(new Error(`the LLM call failed (HTTP ${status}: ${message})`), {
        code: 'LLM_PROVIDER', status, retryable,
        ...(typeof type === 'string' ? { provider_type: type } : {}),
        ...(typeof code === 'string' ? { provider_code: code } : {}),
    });
}

/** Retry one explicit transient server response inside the existing ST generation.
 * The host owns identity checks and the shared one-attempt marker. No input is resent to the Engine.
 */
export async function narratorProviderResponse(send, { signal, isCurrent, mark, save }) {
    const first = await send();
    if (signal?.aborted || !isCurrent()) return first;
    const body = await first.clone().json().catch(() => null);
    const transient = (!first.ok || !!body?.error) && providerResponseError(first.status, body).retryable;
    if (!transient || signal?.aborted || !isCurrent()) return first;
    mark({ attempts: 1, reason: 'provider', status: first.status });
    await save();
    if (signal?.aborted || !isCurrent()) return first;
    return send();
}
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
