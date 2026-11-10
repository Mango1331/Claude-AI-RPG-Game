// Story threads (Patch 2, live run of 18.10.2026: ten open threads, none ever closed). A thread has an id the engine
// gives it, never one derived from its words: the extractor and the V3 narrator update or resolve a thread by that id,
// and a new wording of a matter the record already holds is that matter, not a new thread. What a thread is about
// decides how long it stays current: a sign or a local threat (a sound, fresh tracks, a pack on the ridge) belongs to
// the place and the hours it was seen in, and fades from the scene when Alaric is elsewhere and time has passed;
// mysteries, promises, debts, rumours and deadlines stay until the story settles them. Fading is a view, never an
// event: nothing is closed by it, the journal keeps it, and it is current again when he comes back. Only a reply that
// shows the matter settled resolves a thread.
import { normText, tokenize } from './util.js';

/** Kinds that belong to their place and hours (fade); every other kind lasts until resolved. */
export const LOCAL_KINDS = new Set(['sign', 'threat']);
const FADE_AWAY_MIN = 6 * 60; // a local thread elsewhere and older than this has faded
const FADE_ANY_MIN = 3 * 24 * 60; // a local thread older than this has faded anywhere

/** A fresh engine id: thread.t<turn>.<n>. */
export function newThreadId(state) {
    let n = 1;
    while (state.threads[`thread.t${state.turn}.${n}`]) n += 1;
    return `thread.t${state.turn}.${n}`;
}

const words = (text) => new Set(tokenize(text).filter((w) => w.length > 2));

/** Share of the smaller set's words found in the other (0..1). */
function overlap(a, b) {
    const A = words(a);
    const B = words(b);
    if (!A.size || !B.size) return 0;
    let hit = 0;
    for (const w of A) if (B.has(w)) hit += 1;
    return hit / Math.min(A.size, B.size);
}

/**
 * The open thread a report without an id means: the same words, or a rewording that shares most of its words, and in
 * either case its kind (or one of the two kinds unknown). Null when none is clearly that matter.
 * .173 (GPT review of .172, P2): the parties must fit as well, and exactly one thread may fit:
 * - a report with parties fits a thread whose parties include every reported one (all of them, or a part when World
 *   left Alaric out because nobody of it is here); a thread of other parties never fits because one person is in both
 *   ("Tam and Bess" is no "Alaric and Tam"), so a new party joins a thread only by its id; a thread without parties
 *   (older than E2-B) fits only by its exact words;
 * - a report without parties fits any thread by its exact words, by a rewording only a thread without parties;
 * - two threads fitting by their exact words are ambiguous (`ambiguous`: their ids): none is taken.
 */
export function findThread(state, text, kind = null, who = null) {
    const t = normText(text);
    const parties = Array.isArray(who) && who.some((x) => x !== 'pc') ? [...new Set(who)] : null;
    const open = Object.values(state.threads).filter((x) => x.status === 'open' && (!kind || !x.kind || x.kind === kind));
    const fits = (x) => !parties || !x.who || parties.every((p) => x.who.includes(p));
    const exact = open.filter((x) => normText(x.text) === t && fits(x));
    if (exact.length > 1) return { thread: null, ambiguous: exact.map((x) => x.id) };
    if (exact.length === 1) return { thread: exact[0] };
    const near = open.filter((x) => (parties ? !!x.who : !x.who) && fits(x) && overlap(x.text, text) >= 0.6);
    return { thread: near.length === 1 ? near[0] : null };
}

/** The thread findThread names, or null (also when it is ambiguous). */
export function matchThread(state, text, kind = null, who = null) {
    return findThread(state, text, kind, who).thread;
}

/** The area a place belongs to: its settlement, else its outermost place below the realm (a wild area). */
export function areaOf(state, id) {
    let cur = id;
    let area = id;
    for (let i = 0; i < 12 && cur && state.places?.[cur]; i++) {
        const p = state.places[cur];
        if (p.kind === 'settlement') return cur;
        if (p.kind === 'realm') break;
        area = cur;
        cur = p.parent;
    }
    return area;
}

/** Where Alaric is, for a thread's place: the V4 node, else the V3 location. */
const hereOf = (state) => (state.meta?.runtime === 'v4' && state.scene.at ? state.scene.at : state.scene.location);

/** Is this open thread about the place Alaric is in now (same area)? */
export function threadHere(state, t) {
    if (!t.at) return false;
    const here = hereOf(state);
    if (!here) return false;
    if (t.at === here) return true;
    return !!state.places?.[t.at] && areaOf(state, t.at) === areaOf(state, here);
}

/** An open thread that still matters now: every lasting one; a local one here, or recent. */
export function threadCurrent(state, t) {
    if (t.status !== 'open') return false;
    if (!LOCAL_KINDS.has(t.kind)) return true;
    const age = state.clock.minute - (t.updated?.minute ?? t.since?.minute ?? 0);
    if (age >= FADE_ANY_MIN) return false;
    return threadHere(state, t) || age < FADE_AWAY_MIN;
}

/** The open threads that matter now, the ones of this place first, then the latest. */
export function currentThreads(state) {
    const rank = (t) => (threadHere(state, t) ? 1 : 0);
    return Object.values(state.threads).filter((t) => threadCurrent(state, t))
        .sort((a, b) => rank(b) - rank(a) || (b.updated?.minute ?? 0) - (a.updated?.minute ?? 0));
}

/**
 * A thread by the id a reply gives for it: its own ("thread.t10.1") or that without the "thread." prefix ("t10.1"), as
 * the extractor gave it in the live test of 22.10.2026 07:49 (Patch 8.4.2); always the thread that exists, never a new one.
 */
export function threadById(state, id) {
    const key = String(id);
    return state.threads[key] || state.threads[`thread.${key}`] || (key.startsWith('thread.') ? state.threads[key.slice(7)] : null) || null;
}

const AGREEMENTS = new Set(['promise', 'debt']);
/**
 * Does the text name this person? Their name or known name does; their role word (first descriptor) only when it is
 * theirs alone: no other living person of the record has it, and the text names no other person by name (.178, GPT
 * review §3.1: "the clerk" of two clerks, or "the other clerk Bess", is not the absent clerk).
 */
function namedIn(state, id, text) {
    const e = state.entities?.[id];
    const words = ` ${normText(text)} `;
    const said = (x) => typeof x === 'string' && !!x.trim() && words.includes(` ${normText(x)} `);
    if ([e?.name, e?.known_name].some(said)) return true;
    const role = e?.descriptors?.[0];
    if (!said(role)) return false;
    const r = ` ${normText(role)} `;
    const others = Object.values(state.entities || {}).filter((x) => x.id !== id && x.kind === 'npc' && x.status !== 'dead');
    const sameRole = (x) => [x.descriptors?.[0], x.role].some((d) => typeof d === 'string' && !!d.trim() && (` ${normText(d)} `.includes(r) || r.includes(` ${normText(d)} `)));
    return !others.some((x) => sameRole(x) || [x.name, x.known_name].some(said));
}

/**
 * The events for one reported thread {id?, text, kind, status, resolution?}, or a reason it cannot apply.
 * @returns {{events: object[], accepted?: string, reject?: string}}
 */
export function threadEvents(state, th, { at, src, place = null }) {
    if (!th || !th.text) return { events: [], reject: 'thread needs text' };
    const status = th.status === 'resolved' ? 'resolved' : 'open';
    let cur = null;
    if (th.id) {
        cur = threadById(state, th.id);
        if (!cur) return { events: [], reject: `unknown thread ${th.id}` };
    } else {
        const found = findThread(state, th.text, th.kind || null, th.who || null);
        // .173: several threads of these words fit: none is updated or settled by chance
        if (found.ambiguous) return { events: [], reject: `ambiguous thread: ${found.ambiguous.length} open threads fit these words (${found.ambiguous.join(', ')}); give its id` };
        cur = found.thread;
    }
    if (!cur && status === 'resolved') return { events: [], reject: 'cannot resolve an unknown thread' };
    // K5 / D1 (pilot 01 B3/B4, .177): an agreement keeps what it was agreed as. Its id reports it, never another matter:
    // a report naming someone else as its party is none of it (T58: Muller's debt to Hesse under the id of his promised
    // copper; T61: a second carter id); its settlement needs one of its own people here or named in the report (its id
    // and a copy of its parties are no proof). What cannot be told apart deterministically (another matter of the same
    // people) stays the extractor's.
    const agreement = cur && AGREEMENTS.has(cur.kind);
    if (agreement && th.id) {
        const stored = (cur.who || []).filter((x) => x !== 'pc');
        const reported = (Array.isArray(th.who) ? th.who : []).filter((x) => x !== 'pc');
        const others = reported.filter((x) => !stored.includes(x));
        if (stored.length && others.length) return { events: [], reject: `thread identity: ${cur.id} is the agreement of ${stored.join(', ')}; a report naming ${others.join(', ')} is another matter (a new thread, id null)` };
        if (status === 'resolved' && stored.length && !stored.some((x) => (state.scene?.present || []).includes(x) || namedIn(state, x, `${th.text || ''} ${th.resolution || ''}`))) {
            return { events: [], reject: `thread identity: ${cur.id} is settled only with one of its parties (${stored.join(', ')}) here or named` };
        }
    }
    if (cur && cur.status === 'resolved' && status === 'resolved') return { events: [] };
    const id = cur?.id || newThreadId(state);
    // a resolution keeps the matter's words and adds how it ended; an update may say it better, an agreement's never
    // (D1: its words are what was agreed; a later report's wording is not taken over)
    const text = (status === 'resolved' || agreement) && cur ? cur.text : String(th.text).slice(0, 200);
    // NPC E2-B (R7): the parties of an agreement stay with it: an update adds parties, never drops one; a resolution
    // keeps them; a thread without parties gets them by its id or its exact words only (matchThread)
    const parties = Array.isArray(th.who) && th.who.length ? th.who : null;
    const who = cur?.who ? [...new Set([...cur.who, ...(parties || [])])].slice(0, 3) : parties ? [...new Set(parties)].slice(0, 3) : null;
    const thread = {
        id, text, kind: cur?.kind || th.kind || 'mystery', status, since: cur?.since || at, updated: at, source: cur?.source || src,
        at: cur?.at ?? place ?? null,
        ...(status === 'resolved' ? { resolution: String(th.resolution || th.text).slice(0, 200) } : {}),
        ...(who ? { who } : {}),
    };
    return { events: [{ t: 'thread.set', d: { thread } }], accepted: `thread ${status}: ${text}` };
}
