import { foldChat, rec } from '../src/host.js';
import { prepareGenerationAsync, processReplyAny, extractionRequest, applyExtraction } from '../src/v4/runtime.js';
import { parseExtraction, worldVocab } from '../src/v4/extract.js';
import { buildCatalog } from '../src/v4/catalog.js';
import { planContext, parsePlan, withContentSkills } from '../src/v4/planner.js';
import { readTurn } from '../src/ir.js';
import { worldInterface, normalizeReferences } from './interface.js';
import { copy, proposalError } from './util.js';
export { foldChat, rec };
export let content;
export function configure(pack) { content = pack; }

export async function prepare(base, input, commands, auxiliary = async () => { throw Error('No auxiliary transport'); }) {
    const chat = copy(base), before = foldChat(chat);
    if (before.errors.length || before.failures.length) throw Error('Broken base fold');
    const catalog=buildCatalog(before.state,content,{known:true,c:true});
    const normalized=normalizeReferences(commands,content,catalog);
    const ir=readTurn(input,before.state,content);
    if(before.state.mode!=='creation' && ir.intent?.kind!=='command' && ir.reason!=='dead') {
        const parsed=parsePlan(JSON.stringify({commands:normalized.commands}),content.commandVocab,
            withContentSkills(planContext(before.state,content,catalog),content,before.state),input);
        if(parsed.errors.length && !parsed.tradeConflict) throw proposalError(`Command proposal rejected (no effects): ${parsed.errors.join('; ')}`);
    }
    chat.push({ mes: input, name: 'Alaric', is_user: true, extra: {} });
    let planned = false, aux = 0, auxiliaryError;
    const result = await prepareGenerationAsync(chat, content, { settings: { planner: true }, llm: async req => {
        try {
            if (req.purpose === 'plan' && !planned) { planned = true; return JSON.stringify({ commands:normalized.commands }); }
            // These are real, situational engine generators (Guild board / development),
            // not an obligatory planner, extractor, or automatic model repair chain.
            if (!['board', 'forge'].includes(req.purpose) || req.messages.some(m=>m.role==='assistant') || aux++ >= 3) throw Error(`Unsupported or repeated engine generator: ${req.purpose}`);
            return await auxiliary(req, aux);
        } catch (e) { auxiliaryError=e; throw Object.assign(new Error(e.message), { code: 'LLM_CANCELLED' }); }
    } });
    if(auxiliaryError) throw auxiliaryError;
    if (rec(chat.at(-1))?.plan?.failed || !['context','panels'].includes(result.action)) throw Error(result.notice || 'Engine preparation incomplete');
    return { chat, context: result.context, panels: result.panels || null, systemQuery:rec(chat.at(-1))?.command?.llm?.kind==='system', normalizations:normalized.changes };
}
export function draft(chat, narration) {
    const candidate = copy(chat);
    candidate.push({ mes: narration, name: 'Avereth GM', is_user: false, extra: {} });
    const index = candidate.length - 1;
    const p = processReplyAny(candidate, index, content);
    if (!p.extract) throw Error('No world completion available for this engine reply');
    return { chat: candidate, index, req: extractionRequest(candidate, index, content) };
}
export function validate(chat, narration, world) {
    if (typeof narration !== 'string' || !narration.trim() || !world) throw proposalError('Narration and world required');
    const c = draft(chat, narration), r = c.req;
    const parsed = parseExtraction(JSON.stringify(world), r.vocab, r.ids, r.expectedKeys, {
        sceneRequired: r.sceneRequired, startScene: r.startScene, state: r.state, content, explicitArrivals: r.sceneRequired, reply: narration,
    });
    if (!parsed.valid || !parsed.complete || parsed.issues?.length) throw proposalError(`World schema/evidence: ${JSON.stringify({ errors: parsed.errors, issues: parsed.issues, missing: parsed.missing })}`);
    applyExtraction(c.chat, c.index, content, parsed, { hash: r.hash });
    const record = rec(c.chat.at(-1)), folded = foldChat(c.chat);
    if(folded.errors.length || folded.failures.length) throw Error('Broken candidate fold');
    if (record.extraction?.status !== 'applied' || record.rejected?.length) throw proposalError(`World rejected: ${JSON.stringify(record.rejected || record.extraction)}`);
    return c.chat;
}
export function worldContract(chat, types) {
    const s = foldChat(chat).state;
    const r = chat.at(-1)?.is_user ? draft(chat, 'World draft.').req : null;
    const vocab = r?.vocab || worldVocab(content.deltaVocab, s);
    const catalog=buildCatalog(s,content,{known:true,c:true,hiddenFeatures:true});
    return { ...worldInterface(content,s,catalog,{types,vocab,expectedKeys:r?.expectedKeys||{},...(r?{ids:r.ids}:{})}),
        ...(r?{pulse:s.last?.outcome?.pulse}:{}),
    };
}
