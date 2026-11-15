// .200 transport fixtures: original recorded states plus explicitly synthetic copies. No provider calls.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
import { E, run191 } from './batch191_lib.js';
import { buildContext, npcCues } from '../../src/context.js';
import { applyEvent } from '../../src/state.js';
import { setFactEvents } from '../../src/knowledge.js';
import { estimateTokens } from '../../src/util.js';

export const WAT = 'npc.wat', BRENNA = 'npc.npcglassmere_clerk';
export const MANNER = 'always straightens his cuffs before answering and then folds his arms';
export const INTEREST = 'knows the local marsh birds and collects their feathers in a wooden box';
export const VOICE = 'boastful pride in being right, settling matters with a spit';
export const content = E.content;
export const u1 = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user01_e2b172.json.gz', import.meta.url)))).chat;
export const original = (label, i) => E.host.foldChat(run191(label).chat.slice(0, i + 1), i + 1).state;
export function fact(s, id, p, o, extra = {}) {
    for (const e of setFactEvents(s, { s: id, p, o, ...extra })) applyEvent(s, e);
}
export function anchors(s, id, values) {
    for (const k of ['voice', 'manner', 'interest']) fact(s, id, k, values[k] || 'none');
    return s;
}
export const wat = () => anchors(original('w191', 92), WAT, { voice: VOICE, manner: MANNER, interest: INTEREST });
export function cards(ctx) {
    const result = {};
    for (const block of ctx.text.split('\n\n').filter(b => /^(CURRENT INTERLOCUTORS|ARRIVING AT)/.test(b))) {
        let id, index = 0;
        const ids = block.startsWith('CURRENT') ? ctx.diagnostics.focusNpcIds : ctx.diagnostics.arrivalNpcIds;
        for (const row of block.split('\n').slice(1)) {
            if (row.startsWith('• ')) { id = ids[index++]; if (id) result[id] = []; }
            if (id) result[id].push(row);
        }
    }
    return result;
}
export const render = x => buildContext(x.state, content, { outcome: x.state.last.outcome, budget: 1400, ...x.opts });
const hash = x => createHash('sha256').update(x).digest('hex');
export function measure(x, ctx = render(x)) {
    const cs = cards(ctx);
    return {
        cards: Object.fromEntries(Object.entries(cs).map(([id, rows]) => {
            const cues = npcCues(x.state, content, id);
            return [id, { rows, headChars: rows[0].length, chars: rows.join('\n').length,
                tokens: estimateTokens(rows.join('\n')), fields: ['voice', 'manner', 'interest'].filter(k => cues[k] && rows[0].includes(`; ${k}: ${cues[k]}`)) }];
        })),
        contextChars: ctx.text.length, contextTokens: ctx.tokens, contextHash: hash(ctx.text),
        sections: ctx.sections, dropped: ctx.dropped,
        focus: ctx.diagnostics.focusNpcIds, arrival: ctx.diagnostics.arrivalNpcIds || [],
        blocks: ctx.text.split('\n\n').map(b => ({ first: b.split('\n')[0], hash: hash(b) })),
    };
}
export function scenarios() {
    const all = {};
    const add = (key, state, input = 'Wat', opts = {}) => all[key] = { state, opts: { input, ...opts } };
    add('birds', wat(), 'I ask Wat about his birds.');
    add('cuffs', wat(), 'I ask Wat about his cuffs.');
    add('no_hits', wat(), 'Wat');
    add('tie', wat(), 'Wat spit cuffs birds');
    add('empty_focus', wat(), '');
    add('last_reply', wat(), 'Wat', { lastReply: 'The birds return.' });
    add('all_fit', anchors(wat(), WAT, { voice: 'soft', manner: 'nods', interest: 'birds' }));
    const skip = anchors(wat(), WAT, { voice: VOICE, manner: 'nods', interest: INTEREST });
    fact(skip, WAT, 'occupation', 'keeper of the old millpond and its weathered wooden water gates');
    add('skip_long', skip, 'Wat birds feathers');
    const none = wat(); fact(none, WAT, 'occupation', 'keeper of the old millpond and its weathered wooden water gates and sluices along the eastern shore');
    add('none_fit', none, 'Wat birds');
    const long = wat(); long.entities[WAT].name = 'Wat ' + 'of the millpond '.repeat(12);
    add('long_identity', long);
    const longId = wat(), id = 'npc.wat_of_the_old_millpond_weather_gate';
    longId.entities[id] = { ...longId.entities[WAT], id, name: 'Wat of the old millpond' };
    longId.scene.present = ['pc', id]; anchors(longId, id, { voice: VOICE, manner: MANNER, interest: INTEREST });
    add('long_id', longId, 'Wat');
    add('negation', anchors(wat(), WAT, { voice: VOICE, manner: 'nods; waits, but never agrees before reading every clause', interest: INTEREST }), 'Wat clause');
    add('no_anchors', anchors(wat(), WAT, {}));
    add('wat_original', original('w191', 92));
    add('hedwin_original', original('w191', 36), 'Hedwin');
    add('marren_original', original('w191', 80), 'Marren');
    const replaced = wat(); fact(replaced, WAT, 'interest', 'likes wooden boats, never birds');
    add('replaced', replaced, 'Wat boats');
    const arrival = wat(); arrival.scene.present = ['pc'];
    fact(arrival, WAT, 'occupation', 'keeper of the millpond gates');
    const outcome = { kind: 'v4', resolutions: [{ type: 'go', seq: 1, status: 'authorized' }], auth: { gos: [{ seq: 1, to: arrival.scene.at, name: 'Millpond' }] }, known_at: { 1: [WAT] } };
    add('arrival', arrival, 'Wat birds', { outcome });
    const mixed = structuredClone(arrival); mixed.scene.present.push('npc.npcmillpond_farmer');
    add('mixed_slots', mixed, 'Hedwin and Wat birds', { outcome });
    add('two_current', wat(), 'Wat and Hedwin');
    const brenna = E.host.foldChat(structuredClone(u1), 69).state;
    applyEvent(brenna, { t: 'thread.set', d: { thread: { id: 'thread.t30.9', text: 'Brenna said Alaric may ask her about dinner again once he has more lines in her ledger', kind: 'promise', status: 'open', since: { turn: brenna.turn, minute: brenna.clock.minute }, updated: { turn: brenna.turn, minute: brenna.clock.minute }, at: brenna.scene.at, who: ['pc', BRENNA] } } });
    anchors(brenna, BRENNA, { manner: "dry, unhurried, keeps strangers at a ledger's length" });
    add('brenna', brenna, u1[69].mes);
    const fallback = structuredClone(brenna);
    fallback.relations[`rel.${BRENNA}.attitude.pc`] = { value: 0, history: [{ why: 'a careful and measured consideration of their long conversation at the desk' }] };
    add('agreement_fallback', fallback, 'Brenna', { budget: 20000 });
    add('clerk_original', original('r191', 42), 'I ask the clerk about my complaint.');
    const routine = wat();
    for (const m of Object.values(routine.memories)) m.importance = 2;
    add('routine', routine);
    const privateState = wat(); fact(privateState, 'npc.npcmillpond_farmer', 'secret', 'buried emerald cipher', { visibility: 'secret' });
    add('private', privateState, 'Wat birds');
    const absent = wat(); absent.scene.present = ['pc']; add('absent', absent, 'Wat birds');
    const legacy = wat(); legacy.meta.runtime = 'v3'; add('legacy', legacy);
    add('system', wat(), '#system', { systemQuery: true });
    // Real historical combat; no fabricated combatant shape.
    const chat = run191('w191').chat;
    for (let i = 10; i < chat.length; i++) { const s = E.host.foldChat(chat.slice(0, i + 1), i + 1).state; if (s?.encounter) { add('combat', s, 'attack'); break; } }
    add('tight_budget', wat(), 'Wat and Hedwin birds', { budget: 600 });
    return all;
}
