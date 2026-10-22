// The provider check before a run (docs/LIVE_RUNNER.md §2, §3): GET <url>/models the way SillyTavern's own status
// check asks it (src/endpoints/backends/chat-completions.js: urlJoin(url, '/models'), the key as a bearer token), and
// whether the model the profile names is one of the models the endpoint offers. A local proxy that narrows the list
// (Featherless) answers with its own list; the runner never starts or stops it, it only asks.

/** The model ids of a /models answer (OpenAI {data: [{id}]}, {models: [...]}, or a plain list). */
export function modelIds(json) {
    const list = Array.isArray(json?.data) ? json.data : Array.isArray(json?.models) ? json.models : Array.isArray(json) ? json : null;
    if (!list) return null;
    return list.map((x) => (typeof x === 'string' ? x : x?.id ?? x?.name ?? null)).filter((x) => typeof x === 'string');
}

/**
 * Ask the endpoint for its models. Returns {reachable, status, ids, found, near, error}: reachable false when nothing
 * answered (no proxy running, wrong port); ids null when the answer was no model list.
 */
export async function probeModels({ url, key = null, model, fetchImpl = fetch, timeoutMs = 15000 }) {
    const endpoint = `${String(url).replace(/\/+$/, '')}/models`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
        const res = await fetchImpl(endpoint, { headers: key ? { authorization: `Bearer ${key}` } : {}, signal: ctl.signal });
        const json = await res.json().catch(() => null);
        if (!res.ok) return { endpoint, reachable: true, status: res.status, ids: null, found: false, near: [], error: `HTTP ${res.status}${json?.error?.message ? `: ${String(json.error.message).slice(0, 160)}` : ''}` };
        const ids = modelIds(json);
        if (!ids) return { endpoint, reachable: true, status: res.status, ids: null, found: false, near: [], error: 'the answer is no model list' };
        const m = String(model ?? '');
        const tail = (x) => x.toLowerCase().split('/').pop();
        const near = ids.filter((id) => id !== m && (id.toLowerCase() === m.toLowerCase() || (m && (tail(id).includes(tail(m)) || tail(m).includes(tail(id))))));
        return { endpoint, reachable: true, status: res.status, ids, found: ids.includes(m), near, error: null };
    } catch (e) {
        return { endpoint, reachable: false, status: 0, ids: null, found: false, near: [], error: e?.name === 'AbortError' ? `keine Antwort in ${timeoutMs / 1000} s` : String(e?.cause?.code || e?.cause?.errors?.[0]?.code || e?.cause?.message || e?.message || e) };
    } finally { clearTimeout(timer); }
}

/** The probe as the check's rows [{good, what, detail}] (German, like --check). */
export function probeRows(p, { model, who = 'SillyTavern' }) {
    if (!p.reachable) return [{ good: false, what: 'Endpoint erreichbar (GET /models)', detail: `${p.endpoint}: ${p.error}. Läuft dein Proxy (z. B. der Featherless-Proxy)? Der Runner startet ihn nicht.` }];
    if (p.status === 401 || p.status === 403) return [{ good: false, what: 'Endpoint erreichbar (GET /models)', detail: `${p.endpoint}: ${p.error} — der Schlüssel aus der Umgebungsvariable wurde abgelehnt (fehlt er, oder ist es ein anderer als in deinem SillyTavern?)` }];
    if (p.error) return [{ good: true, what: 'Endpoint erreichbar (GET /models)', detail: `${p.endpoint}: ${p.error}; die Modell-ID ist so nicht prüfbar (ohne /models braucht SillyTavern „Bypass status check“)` }];
    const rows = [{ good: true, what: 'Endpoint erreichbar (GET /models)', detail: `${p.endpoint}: ${p.ids.length} Modell(e)` }];
    if (p.found) rows.push({ good: true, what: `Modell-ID (${who}) in der Modellliste`, detail: `„${model}“ ist eines von ${p.ids.length}: ${p.ids.join(', ')}` });
    else rows.push({ good: false, what: `Modell-ID (${who}) in der Modellliste`, detail: `„${model ?? '(keine)'}“ steht nicht in der Liste von ${p.endpoint} (${p.ids.length}: ${p.ids.join(', ') || 'leer'})${p.near.length ? `; ähnlich: ${p.near.join(', ')}` : ''}. Die ID muss genau so lauten, wie der Endpoint sie anbietet: in SillyTavern das Modell wählen, das die Liste enthält, oder die Liste des Proxys erweitern.` });
    return rows;
}

/** Stop a run before it starts? Only when the endpoint answers and says no (the model missing, the key refused) or nothing answers. */
export function probeBlocks(p) {
    if (!p.reachable) return `the endpoint ${p.endpoint} does not answer (${p.error}); is your proxy running? The runner does not start it`;
    if (p.status === 401 || p.status === 403) return `the endpoint refused the key (${p.error})`;
    if (p.ids && !p.found) return `the model is not in the model list of ${p.endpoint} (${p.ids.join(', ') || 'empty'})`;
    return null;
}
