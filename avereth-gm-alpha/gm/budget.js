export const MODEL = 'zai-org/GLM-5.3-Flash';
export const LIMITS = Object.freeze({ context: 32768, output: 4096, reserve: 512 });
let tokenizerPromise;
// Restricted equivalent of the pinned GLM template for our system/user-only
// protocol. No native tools, assistant reasoning, media or template substitution.
export function formatGLM(messages) {
    if (!Array.isArray(messages) || !messages.length || messages.at(-1).role !== 'user') throw Error('GLM budget: system/user messages ending in user required');
    for (const m of messages) if (!['system','user'].includes(m.role) || typeof m.content !== 'string' || Object.keys(m).some(k=>!['role','content'].includes(k))) throw Error('Unsupported GLM message format');
    return '[gMASK]<sop><|system|>Reasoning Effort: Low' + messages.map(m=>`<|${m.role}|>${m.content}`).join('') + '<|assistant|><think>';
}
export function checkBudget(inputTokens, output = LIMITS.output, context = LIMITS.context) {
    if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 || output !== LIMITS.output || context !== LIMITS.context) throw Error('Invalid Alpha token budget');
    const total = inputTokens + output + LIMITS.reserve;
    if (total > context) throw Error(`Kontextbudget überschritten: ${inputTokens} lokal gezählte GLM-Inputtokens + ${output} Ausgabe + ${LIMITS.reserve} Reserve > ${context}. Kein Request gesendet; Memory bleibt vollständig erhalten.`);
    return { localInputTokens: inputTokens, outputReserve: output, templateReserve: LIMITS.reserve, context, total, method: 'pinned GLM tokenizer/template; not provider usage' };
}
export async function measureBudget(messages) {
    tokenizerPromise ||= (async()=>{
        await import('../tokenizer/web-tokenizers.js');
        const r = await fetch(new URL('../tokenizer/tokenizer.json', import.meta.url));
        if (!r.ok) throw Error('Bundled GLM tokenizer unavailable; dispatch blocked');
        return globalThis.averethGLMTokenizers.Tokenizer.fromJSON(await r.arrayBuffer());
    })().catch(e=>{tokenizerPromise=null;throw e;});
    return checkBudget((await tokenizerPromise).encode(formatGLM(messages)).length);
}
