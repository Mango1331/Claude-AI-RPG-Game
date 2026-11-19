// Physical transport leases, not game state. A local abort never proves remote completion.
export const capacityError = (message = 'Remote completion is unknown. No automatic retry was sent.') =>
    Object.assign(new Error(message), { code: 'LLM_CAPACITY_BLOCKED', retryable: false });

export function createRequestControl({ storage, locks, capacity = 4, changed = () => {} } = {}) {
    const memory = new Map(), running = new Map();
    const read = key => {
        const text = storage?.getItem(`avereth.requests.v1:${key}`);
        return text ? JSON.parse(text) : memory.get(key) || { leases: [], retryUsed: false };
    };
    const write = (key, value) => {
        // Fail closed if the durable lease cannot be written.
        storage?.setItem(`avereth.requests.v1:${key}`, JSON.stringify(value));
        memory.set(key, value); changed(key, value);
    };
    const blocked = key => read(key).leases.some(x => x.status === 'unknown' || !running.has(x.id));
    async function serial(key, fn, signal) {
        if (locks) return locks.request(`avereth.request:${key}`, { ...(signal ? { signal } : {}) }, fn);
        // Node tests / hosts without Web Locks: one instance, no claimed cross-tab protection.
        const previous = running.get(`queue:${key}`) || Promise.resolve();
        const next = previous.catch(() => {}).then(fn);
        running.set(`queue:${key}`, next);
        try { return await next; } finally { if (running.get(`queue:${key}`) === next) running.delete(`queue:${key}`); }
    }
    async function allowOne(key) {
        const release = () => {
            const s = read(key);
            if (!s.leases.length || s.retryUsed || s.leases.some(x => running.has(x.id))) return false;
            write(key, { ...s, leases: [], retryUsed: true });
            return true;
        };
        // An active request in another tab must not be mistaken for an abandoned lease.
        return locks ? locks.request(`avereth.request:${key}`, {ifAvailable:true}, lock => lock ? release() : false) : release();
    }
    async function fetchRequest(key, send, { weight = 4, signal, meta = {}, stream = false, inspectStream } = {}) {
        if (!Number.isInteger(weight) || weight < 1 || weight > capacity) throw capacityError('Invalid provider capacity weight');
        if (blocked(key)) throw capacityError();
        // The lock spans response consumption, not merely response headers.
        let answer, deliver;
        const delivered = new Promise((resolve, reject) => { deliver = { resolve, reject }; });
        const work = serial(key, async () => {
            if (signal?.aborted) throw Object.assign(new Error('Cancelled before dispatch'), { name: 'AbortError' });
            if (read(key).leases.length) throw capacityError();
            const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
            const previousAttempt = (read(key).attempts || []).findLast(a => a.origin_chat === meta.origin_chat && a.input_id === meta.input_id && a.revision === meta.revision && a.phase === meta.phase);
            const lease = { ...meta, id, request_id:id, capacity_key:key, attempt:(previousAttempt?.attempt || 0)+1, weight, status: 'active' };
            write(key, { ...read(key), leases: [lease], attempts:[...(read(key).attempts || []).slice(-31),{...lease,started:Date.now()}] });
            running.set(id, true);
            let terminal = false, rejectedCapacity = false;
            try {
                answer = await send();
                const copy = answer.clone();
                if (stream && answer.ok) {
                    deliver.resolve(answer);
                    if (inspectStream) terminal = await inspectStream(copy);
                    else {
                        const reader = copy.body.getReader(), decoder = new TextDecoder();
                        let pending = '';
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            pending += decoder.decode(value, { stream: true });
                            const lines = pending.split('\n'); pending = lines.pop();
                            for (const line of lines) if (line.trim() === 'data: [DONE]') terminal = true;
                        }
                    }
                } else {
                    const body = await copy.json().catch(() => null);
                    const error = body?.error;
                    rejectedCapacity = answer.status === 429 || /concurrency|too many requests/i.test(JSON.stringify(error || ''));
                    // A generic ST error body (including HTTP 200/500) does not establish whether the
                    // upstream generation stopped. Only a definite request rejection or completed choices do.
                    terminal = !rejectedCapacity && ((!answer.ok && answer.status >= 400 && answer.status < 500)
                        || Array.isArray(body?.choices) && body.choices.length > 0 && body.choices.every(x => x.finish_reason != null));
                    // Return only after classification, so an immediate retry cannot outrun the lease.
                }
            } catch (error) { deliver.reject(error); throw error; }
            finally {
                running.delete(id);
                const s = read(key);
                const attempts=(s.attempts || []).map(a=>a.id===id?{...a,status:terminal?'terminal':'unknown',ended:Date.now()}:a);
                write(key, terminal ? { ...s, attempts, leases: [], retryUsed: false } : {
                    ...s, attempts, leases: [{ ...lease, status: 'unknown', reason: rejectedCapacity ? 'provider_capacity' : 'remote_completion_unknown' }],
                });
            }
            if (!stream || !answer.ok) deliver.resolve(answer);
        }, signal);
        work.catch(error => deliver.reject(error));
        return delivered;
    }
    return { fetchRequest, blocked, allowOne, inspect: read };
}
