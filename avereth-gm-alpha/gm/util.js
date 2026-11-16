export const copy = x => structuredClone(x);
// Exact comparisons, not a lossy hash, guard saves and request identity.
export const digest = x => JSON.stringify(x);
export const fault = message => new Error(message);
export const VERSION = '4.3.0-gm.alpha.2';
export async function sha(value) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
    return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
