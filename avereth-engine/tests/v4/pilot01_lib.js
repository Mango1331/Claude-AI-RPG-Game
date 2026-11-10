// The natural NPC/PULSE pilot 01 (09.11.2026, build .174, runner 2a8b54e; main testrun_10b/npc-20261109-160250Z):
// its 141 original chat messages with their records (the narrator's reasoning text left out). A case replays one
// message the way tools/replay does: the chat up to it, its own record removed, the product reprocessing it with the
// model answers the original record holds (the extractor's final answer, the planner's raw answers).
import fs from 'node:fs';
import zlib from 'node:zlib';
import { foldChat, rec } from '../../src/host.js';
import { processReplyAny, runExtraction, prepareGenerationAsync } from '../../src/v4/runtime.js';
import { validateState } from '../../src/validate.js';

export const pilot = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/pilot01_npc_pulse.json.gz', import.meta.url))));

/** The chat before message i plus message i without its record. */
export function upTo(i) {
    const chat = structuredClone(pilot.slice(0, i + 1));
    delete chat[i].extra.avereth;
    return chat;
}
/** Reprocess the narrator reply i with an extractor answer (default: the original final answer). */
export async function replyCase(content, i, { answer = null, chat = null } = {}) {
    const c = chat || upTo(i);
    const raw = answer ?? JSON.stringify(pilot[i].extra.avereth.extraction.raw);
    const p = processReplyAny(c, i, content, {});
    if (p.extract) await runExtraction(c, i, content, async () => (typeof raw === 'function' ? raw() : raw));
    return { chat: c, r: rec(c[i]) };
}
/** Reprocess the player message i with the planner's original raw answers. */
export async function playerCase(content, i, { answers = null, chat = null } = {}) {
    const c = chat || upTo(i);
    const queue = [...(answers || pilot[i].extra.avereth.plan?.raw || [])];
    await prepareGenerationAsync(c, content, { type: 'normal', settings: {}, llm: async () => (queue.length ? queue.shift() : '{}') });
    return { chat: c, r: rec(c[i]) };
}
/**
 * Reprocess the original messages from..to in order on one chat (each with its original model answers, or the given
 * ones by index), so that what an earlier message now books (an offer, a link) is what the later ones meet.
 */
export async function chainCase(content, from, to, { chat = null, answers = {}, mes = {} } = {}) {
    const c = chat || structuredClone(pilot.slice(0, from));
    for (let i = from; i <= to; i++) {
        const m = structuredClone(pilot[i]);
        if (mes[i] != null) m.mes = mes[i];
        const had = m.extra?.avereth;
        if (m.extra) delete m.extra.avereth;
        c.push(m);
        if (!had || (m.is_system && !m.is_user)) { if (had) m.extra.avereth = structuredClone(had); continue; }
        if (m.is_user) await playerCase(content, i, { chat: c, answers: answers[i] || null });
        else await replyCase(content, i, { chat: c, answer: answers[i] || null });
    }
    return c;
}
export const events = (r, t) => (r?.events || []).filter((e) => (t instanceof RegExp ? t.test(e.t) : e.t === t));
export const rejected = (r, rule) => events(r, 'delta.rejected').filter((e) => !rule || e.d.rule === rule);
export function valid(chat, content) {
    const x = foldChat(chat);
    if (x.errors.length) throw new Error(`fold errors: ${x.errors.map((e) => e.message || e).join('; ')}`);
    const problems = validateState(x.state, content);
    if (problems.length) throw new Error(`validation: ${problems.slice(0, 3).join('; ')}`);
    return x.state;
}
