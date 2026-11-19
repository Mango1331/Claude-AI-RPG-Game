// The natural NPC batch on .191 (15.11.2026, main: testrun_10b/npc-20261115-103140Z/GEGENREVIEW_OPUS.md) as a local
// corpus (tests/replay/corpus191, built with tools/replay/build_corpus.mjs from the batch's recorded model answers):
// one recorded message processed again on its original prior state, its model answers as recorded or changed by a
// disclosed transformation. No provider request.
import { recordedBoardSlot } from '../../tools/replay/contract_board_slot.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { engineAt, loadRun } from '../../tools/replay/replay.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CORPUS191 = path.join(HERE, '../replay/corpus191');
export const E = await engineAt();
const runs = {};
export const run191 = (label) => (runs[label] ||= loadRun(label, CORPUS191));

/** A scripted model: the recorded answers of message i, each passed through change(json, purpose) when given. */
function scripted(answers, change) {
    const queue = [...(answers || [])];
    return async ({ purpose, messages }) => {
        const next = queue.shift();
        if (!next) throw Object.assign(new Error(`no recorded answer for ${purpose}`), { code: 'LLM_PROVIDER', status: 500, retryable: false });
        if (next.error) throw Object.assign(new Error('replayed provider error'), { code: 'LLM_PROVIDER', status: next.error.status, retryable: false });
        if (!change) return recordedBoardSlot(next.content, purpose, messages);
        let json;
        try { json = JSON.parse(next.content); } catch { return next.content; }
        return recordedBoardSlot(JSON.stringify(change(json, purpose) ?? json), purpose, messages);
    };
}

/** The chat up to message i with message i's own record removed (as the product receives it). */
function chatTo(label, i, chat = run191(label).chat) {
    const copy = chat.slice(0, i + 1);
    const own = structuredClone(chat[i]);
    delete own.extra.avereth;
    copy[i] = own;
    return { copy, own };
}

/** Process recorded reply i again; returns the record and the state after it. */
export async function reply191(label, i, change = null, { chat } = {}) {
    const { copy, own } = chatTo(label, i, chat);
    const p = E.runtime.processReplyAny(copy, i, E.content, {});
    if (p.extract) await E.runtime.runExtraction(copy, i, E.content, scripted(run191(label).answers[i], change));
    const record = E.host.rec(own);
    return { record, own, chat: copy, state: () => E.host.foldChat(copy, i + 1).state };
}

/** Process recorded player message i again (planner, board, command handlers). */
export async function player191(label, i, change = null, { chat } = {}) {
    const { copy, own } = chatTo(label, i, chat);
    const res = await E.runtime.prepareGenerationAsync(copy, E.content, { type: 'normal', settings: {}, llm: scripted(run191(label).answers[i], change) });
    return { record: E.host.rec(own), own, chat: copy, res, state: () => E.host.foldChat(copy, i + 1).state };
}

/** The state before message i as the original records fold it. */
export const before191 = (label, i) => E.host.foldChat(run191(label).chat.slice(0, i), i).state;

export const rejectedOf = (record) => (record.rejected || []).map((x) => [x.seq, x.type, x.rule]);
export const eventsOf = (record, t) => (record.events || []).filter((e) => e.t === t);

/**
 * A chained replay from message `from` to `to`: each message processed on the records the replay itself just wrote
 * (not the original ones), with every recorded model answer passed through rewrite(text) (a disclosed translation,
 * e.g. an id the corrected engine names differently). Returns the chat with the new records.
 */
export async function chain191(label, from, to, rewrite = (t) => t) {
    const run = run191(label);
    const chat = run.chat.slice(0, from).map((m) => structuredClone(m));
    for (let i = from; i <= to; i++) {
        const m = structuredClone(run.chat[i]);
        const r = m.extra?.avereth;
        delete m.extra.avereth;
        chat.push(m);
        if (!r) continue;
        const queue = (run.answers[i] || []).map((a) => ({ ...a, content: a.content == null ? a.content : rewrite(a.content) }));
        const llm = scripted(queue);
        if (m.is_user) {
            if (!r.input_hash) { m.extra.avereth = r; continue; }
            await E.runtime.prepareGenerationAsync(chat, E.content, { type: 'normal', settings: {}, llm });
        } else if (!r.extraction && r.events?.some((e) => e.t === 'campaign.started')) {
            m.extra.avereth = r;
        } else {
            const p = E.runtime.processReplyAny(chat, i, E.content, {});
            if (p.extract) await E.runtime.runExtraction(chat, i, E.content, llm);
        }
    }
    return chat;
}
