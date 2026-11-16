import { loadProductContent } from '../../avereth-engine/tests/helpers.js';
import { foldChat, rec } from '../../avereth-engine/src/host.js';
import { prepareGenerationAsync, processReplyAny, extractionRequest, applyExtraction } from '../../avereth-engine/src/v4/runtime.js';
import { parseExtraction } from '../../avereth-engine/src/v4/extract.js';
import { tokenize } from '../../avereth-engine/src/util.js';
import { copy, fault } from './journal.mjs';
export { foldChat, rec };
export const content = await loadProductContent();

// Deliberately narrow complete-string grammar. No prefixes, negation, compound actions, fuzzy IDs or unknown places.
export function route(input, state) {
    if (state.encounter || state.mode === 'creation' || (state.pending_combat || []).length) return null;
    const hit = /^I go to ([^.!?;\n]+)\.$/.exec(input);
    if (!hit) return null;
    const matches = Object.values(state.places).filter(p => p.name === hit[1] && p.id !== state.scene.at);
    if (matches.length !== 1 || /\b(and|then|if|unless|not)\b/i.test(hit[1])) return null;
    return { commands: [{ seq: 1, type: 'go', to: matches[0].id, quote: input.slice(0,-1) }] };
}
export async function prepare(base, input, ask, { fast = true } = {}) {
    const chat = copy(base), before = foldChat(chat);
    if (before.errors.length || before.failures.length) throw fault('broken base fold');
    const local = fast && route(input, before.state);
    chat.push({ mes: input, name: 'Alaric', is_user: true, extra: {} });
    const result = await prepareGenerationAsync(chat, content, { settings: { planner: true }, llm: async req => {
        if (local && req.purpose === 'plan') return JSON.stringify(local);
        try { return await ask(req); }
        catch (error) { throw Object.assign(error, { code: 'LLM_CANCELLED' }); } // coordinator owns retry, not nested runtime repair
    } });
    if (!result.context || rec(chat.at(-1))?.plan?.failed) throw fault('preparation incomplete');
    if (local) rec(chat.at(-1)).plan.prototype_source = 'deterministic-route';
    return { chat, context: result.context, local: !!local };
}
export function draft(chat, narration) {
    const candidate = copy(chat);
    candidate.push({ mes: narration, name: 'Narrator', is_user: false, extra: {} });
    const index = candidate.length - 1;
    const p = processReplyAny(candidate, index, content);
    if (!p.extract) throw fault('expected free-world extraction');
    return { chat: candidate, index, req: extractionRequest(candidate, index, content) };
}
export function validate(chat, narration, world) {
    const c = draft(chat, narration), r = c.req;
    const parsed = parseExtraction(JSON.stringify(world), r.vocab, r.ids, r.expectedKeys, { sceneRequired: r.sceneRequired,
        startScene: r.startScene, state: r.state, content, explicitArrivals: r.sceneRequired, reply: narration });
    if (!parsed.valid || !parsed.complete || parsed.issues?.length) throw fault(`world schema/evidence: ${JSON.stringify({errors:parsed.errors,issues:parsed.issues,missing:parsed.missing})}`);
    applyExtraction(c.chat, c.index, content, parsed, { hash: r.hash });
    const record = rec(c.chat.at(-1));
    if (record.extraction?.status !== 'applied' || record.rejected?.length) throw fault(`world rejected: ${JSON.stringify(record.rejected)}`);
    const folded = foldChat(c.chat);
    if (folded.errors.length || folded.failures.length) throw fault('world fold failed');
    return c.chat;
}
export function linked(narration, world) {
    // Deterministically derived annotation, NOT a recorded natural C1 answer. Spans identify paragraphs;
    // lexical overlap ranks candidates but does not certify semantic completeness.
    const entries = [['scene',world.scene], ...Object.entries(world.expected || {}).map(([k,v])=>[`expected:${k}`,v]), ...world.deltas.map((v,i)=>[`delta:${i}`,v])];
    const paragraphs = [...narration.matchAll(/[^\n]+/g)].map(m=>({start:m.index,end:m.index+m[0].length,quote:m[0]}));
    const links = entries.map(([target,value])=>{
        const words=new Set(tokenize(JSON.stringify(value)));
        const ranked=paragraphs.map((p,i)=>({...p,i,hits:new Set(tokenize(p.quote).filter(w=>words.has(w))).size})).sort((a,b)=>b.hits-a.hits||a.i-b.i);
        const {start,end,quote}=ranked[0];return {target,start,end,quote};
    });
    return { narration, world, links };
}
export function validateJoint(chat, envelope) {
    if (!envelope || typeof envelope.narration !== 'string' || !envelope.world || !Array.isArray(envelope.links)) throw fault('joint envelope invalid');
    const required = linked(envelope.narration, envelope.world).links.map(l => l.target);
    if (new Set(envelope.links.map(l => l.target)).size !== required.length || envelope.links.length !== required.length) throw fault('duplicate/missing links');
    for (const target of required) {
        const l = envelope.links.find(l => l.target === target);
        if (!l || !Number.isInteger(l.start) || !Number.isInteger(l.end) || l.start < 0 || l.end <= l.start || l.end > envelope.narration.length
            || envelope.narration.slice(l.start,l.end) !== l.quote) throw fault(`unsupported text link ${target}`);
    }
    // Links are necessary traceability, NOT a semantic proof. Existing prose/domain guards do the actual checks.
    return validate(chat, envelope.narration, envelope.world);
}
