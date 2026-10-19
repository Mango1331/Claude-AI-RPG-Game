// Alaric's goals (Patch 2, live run of 18.10.2026: he set off for the chartmaker's old Dungeon on day 1; after a hunt,
// a camp, two fights and a quarry tunnel, "I continue my journey towards the Dungeon location from the map" found
// nothing that remembered where he was going). A goal is his own decision, never the story's: only his commands make
// one (a GO to a place beyond his settlement or to a place known by report, intent.set, intent.drop); the extractor has
// no delta for it. A goal is remembered through fights, rests, detours and changes of place; it is done when he arrives
// where it leads, given up when he says so, and paused when he sets off for another destination instead. It never moves
// him: "I continue" goes on with it only when exactly one goal or journey can be meant, and only because he said so.
import { normText } from '../util.js';
import { placeName, settlementOf } from './domain.js';
import { journeyReady } from './catalog.js';
import { knownShort, KNOWN } from './known.js';

export const INTENT_STATUS = ['active', 'paused', 'done', 'dropped'];
const at = (s) => ({ turn: s.turn, minute: s.clock.minute });

const list = (s) => Object.values(s.intents || {});
export const activeIntents = (s) => list(s).filter((i) => i.status === 'active');

/** Is place `id` the target place or inside it? */
function within(s, id, target) {
    for (let cur = id, i = 0; cur && i < 12; cur = s.places?.[cur]?.parent, i++) if (cur === target) return true;
    return false;
}

/** The goal for this target place, or with these words. */
function existing(s, { place = null, goal = '' }) {
    return list(s).find((i) => (place && i.place === place) || (!place && !i.place && normText(i.goal) === normText(goal))) || null;
}

/**
 * The events for a goal he sets: a new one, or the same one again (active once more). A new destination pauses the
 * other active destination: he chose this one instead; nothing is given up unless he says so.
 */
export function setIntentEvents(s, { goal, place = null, quote = null, why = 'his decision' }) {
    const events = [];
    const cur = existing(s, { place, goal });
    if (place) {
        for (const i of activeIntents(s).filter((x) => x.place && x.place !== place)) {
            events.push({ t: 'intent.set', d: { intent: { ...i, status: 'paused', updated: at(s), why: `he set off for ${placeName(s, place)} instead` } } });
        }
    }
    if (cur?.status === 'active') return { id: cur.id, events, fresh: false };
    const id = cur?.id || `intent.${list(s).length + 1}`;
    const intent = { id, goal: String(goal || (place ? `reach ${placeName(s, place)}` : 'his goal')).slice(0, 120), place, status: 'active', since: cur?.since || at(s), updated: at(s), quote: quote ? String(quote).slice(0, 160) : cur?.quote || null, why };
    events.push({ t: 'intent.set', d: { intent } });
    return { id, events, fresh: !cur };
}

/** He gives a goal up (dropped) or declares it reached (done). */
export function endIntentEvents(s, id, status, why) {
    const i = s.intents?.[id];
    if (!i || i.status === status) return [];
    return [{ t: 'intent.set', d: { intent: { ...i, status, updated: at(s), why } } }];
}

/** Arriving at place id: the goals that lead there (or to a place it lies in) are reached. */
export function reachedEvents(s, id) {
    return list(s).filter((i) => (i.status === 'active' || i.status === 'paused') && i.place && within(s, id, i.place))
        .flatMap((i) => endIntentEvents(s, i.id, 'done', `he arrived at ${placeName(s, id)}`));
}

/**
 * A GO that sets a destination: a place known by report, or a settlement (or a place in one) other than his own. A step
 * within the town, the wild place he is exploring or somewhere new and unnamed is no goal of its own.
 */
export function goSetsGoal(s, to) {
    const p = s.places?.[to];
    if (!p || p.kind === 'realm') return false;
    if (p.known === KNOWN.reported) return true;
    const town = settlementOf(s, to);
    return !!town && town !== settlementOf(s, s.scene.at);
}

/**
 * What "I continue" can mean now: his active goals with a place to reach, and a quest journey he set off on (or one
 * whose people are with him). A journey only read from a quest's or thread's notes yields to a goal he chose himself.
 * @returns {{kind: 'intent'|'quest', id, label, place?, companion?, contact?, why}[]}
 */
export function continueOptions(s, { c = false } = {}) {
    const goals = activeIntents(s).filter((i) => i.place && s.places[i.place] && s.places[i.place].known !== KNOWN.false && !within(s, s.scene.at, i.place))
        .map((i) => ({ kind: 'intent', id: i.id, label: i.goal, place: i.place, why: 'his own goal' }));
    const quest = journeyReady(s, { c });
    const explicit = quest && (quest.why !== 'an established journey' || !!quest.companion);
    // a goal that is the quest journey's own destination (he set off for the escort's town) is that journey, no second
    // option: the journey keeps its companion and its own handling
    const trip = quest && explicit ? s.quests?.[quest.id] : null;
    const words = trip ? normText([trip.title, trip.desired_end_state, ...(trip.objectives || []).flatMap((o) => [o.what, o.where])].filter(Boolean).join(' ')) : '';
    const same = (g) => {
        const n = normText(placeName(s, g.place)).replace(/^the /, '');
        return n.length >= 3 && words.includes(n);
    };
    const out = trip ? goals.filter((g) => !same(g)) : [...goals];
    if (quest && (explicit || !out.length)) out.push({ kind: 'quest', ...quest });
    return out;
}

/** The goals as short lines (active first, then paused): for the catalog, the engine block and the HUD. */
export function goalLines(s, { max = 3, paused = true, ids = true } = {}) {
    const rows = list(s).filter((i) => i.status === 'active' || (paused && i.status === 'paused'))
        .sort((a, b) => (a.status === b.status ? (b.updated?.minute ?? 0) - (a.updated?.minute ?? 0) : a.status === 'active' ? -1 : 1));
    return rows.slice(0, max).map((i) => {
        const p = i.place && s.places[i.place];
        const note = p ? knownShort(s, p) : '';
        const about = [ids && p ? i.place : null, note || null].filter(Boolean).join(', ');
        return { id: i.id, status: i.status, text: `${i.goal}${about ? ` (${about})` : ''}` };
    });
}
