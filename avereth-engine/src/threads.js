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
 * The open thread a report without an id means: the same words, or a rewording that shares most of its words and its
 * kind. Null when none is clearly that matter (two candidates are no match).
 */
export function matchThread(state, text, kind = null) {
    const t = normText(text);
    const open = Object.values(state.threads).filter((x) => x.status === 'open');
    const same = open.find((x) => normText(x.text) === t);
    if (same) return same;
    const close = open.filter((x) => (!kind || !x.kind || x.kind === kind) && overlap(x.text, text) >= 0.6);
    return close.length === 1 ? close[0] : null;
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
 * The events for one reported thread {id?, text, kind, status, resolution?}, or a reason it cannot apply.
 * @returns {{events: object[], accepted?: string, reject?: string}}
 */
export function threadEvents(state, th, { at, src, place = null }) {
    if (!th || !th.text) return { events: [], reject: 'thread needs text' };
    const status = th.status === 'resolved' ? 'resolved' : 'open';
    let cur = null;
    if (th.id) {
        cur = state.threads[th.id] || null;
        if (!cur) return { events: [], reject: `unknown thread ${th.id}` };
    } else cur = matchThread(state, th.text, th.kind || null);
    if (!cur && status === 'resolved') return { events: [], reject: 'cannot resolve an unknown thread' };
    if (cur && cur.status === 'resolved' && status === 'resolved') return { events: [] };
    const id = cur?.id || newThreadId(state);
    // a resolution keeps the matter's words and adds how it ended; an update may say it better
    const text = status === 'resolved' && cur ? cur.text : String(th.text).slice(0, 200);
    const thread = {
        id, text, kind: cur?.kind || th.kind || 'mystery', status, since: cur?.since || at, updated: at, source: cur?.source || src,
        at: cur?.at ?? place ?? null,
        ...(status === 'resolved' ? { resolution: String(th.resolution || th.text).slice(0, 200) } : {}),
    };
    return { events: [{ t: 'thread.set', d: { thread } }], accepted: `thread ${status}: ${text}` };
}
