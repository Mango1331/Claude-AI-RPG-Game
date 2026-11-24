// The planner sees the player's choice before the reply. The extractor reports actual arrivals. Neither books a GO.
import { normText } from '../util.js';
import { narratedEvent, narratedPresence, movementEvidence } from './narration_evidence.js';
import { guardCommands } from './agency.js';
import { samePlace } from './place_refs.js';

// One negative boundary, on the whole current input before it is clipped for the event summary. P otherwise
// interprets free language; these direct vetoes also win over a mistaken 'local' or an earlier positive quote.
const holdPosition = /\b(?:(?:i|we) (?:stay|remain) (?:here|put)|(?:i|we) (?:do not|don't|will not|won't) (?:go|leave|follow)|(?:only|just) (?:asking|want directions)|without leaving|ich bleibe hier|ich gehe nicht)\b|^(?:i refuse|i decline|not now)$/i;
const words = value => normText(value).replace(/[^\p{L}\p{N}']+/gu, ' ').trim();
const has = (text, part) => typeof part === 'string' && !!words(part) && ` ${words(text)} `.includes(` ${words(part)} `);

/** Optional and advisory. A malformed supplied boundary must never broaden permission or cause a planner retry. */
export function travelFrame(frame, input, present) {
    if (frame == null) return null;
    if (normText(input).split(/[.!?\n]+/).some(clause => holdPosition.test(clause.trim()) &&
        !/\b(?:until|unless|bis)\b/i.test(clause))) return 'stay';
    if (frame === 'local' || frame === 'stay') return frame;
    if (!has(input, frame.choice)) return 'stay';
    if (frame.to != null && !has(frame.choice, frame.to)) return 'stay';
    if (frame.with != null && !present.includes(frame.with)) return 'stay';
    if (frame.after != null && !has(input, frame.after)) return 'stay';
    const reading = guardCommands(input, [{ seq: 1, type: 'go', quote: frame.choice }]);
    if (reading.dropped.some(r => r.rule !== 'question')) return 'stay';
    return { choice: frame.choice, to: frame.to || null, with: frame.with || null, after: frame.after || null };
}

export function reportedContinuation(s, content, answer, prose) {
    const o = s.last?.outcome;
    const frame = o?.auth?.continuation;
    const arrivals = (answer.deltas || []).filter(d => d.type === 'arrive');
    if (arrivals.length !== 1 || !o?.auth?.c || o.auth.go || o.auth.gos?.length || o.auth.roam || o.interp_failed || o.camp ||
        !frame || frame === 'stay' || s.mode !== 'story' || s.encounter || s.pending_combat?.length || s.scene.threats?.length ||
        s.entities.pc?.status === 'dead' || o.auth.pulse?.interrupt || o.conditionals?.some(r => r.kind === 'go') ||
        [...(o.resolutions || []), ...(o.dropped || [])].some(r => ['go', 'journey.continue', 'attack', 'skill', 'flee', 'pay', 'offer.accept'].includes(r?.type)
            || r.type === 'activity' && r.kind === 'wait')) return null;
    const d = arrivals[0];
    if (d.forced_by || !samePlace(s, answer.scene, d.at, content) || (d.with || []).some(id => !s.scene.present.includes(id))) return null;
    // 'local' records only the absence of an explicit limit. An older/missing assessment cannot clear a limit.
    // The current X still has to report a real arrival inside an ordinary site, checked after place resolution.
    const label = typeof d.at === 'string' ? s.places[d.at]?.name : d.at?.new?.name;
    if ((frame.to && !has(label, frame.to)) || (frame.with && !d.with?.includes(frame.with))) return null;
    const names = [s.entities.pc?.name?.split(' ')[0], 'you'].filter(Boolean);
    // X identifies the stop. A literal quote about a different scene cannot establish presence at that stop.
    const placeWords = normText(label || '').split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 3 && !['the', 'and', 'above', 'below', 'behind', 'near'].includes(w));
    const clauses = d.evidence ? [d.evidence] : String(prose).split(/[.!?…\n]+/).filter(c => has(c, label) && movementEvidence(c));
    const landed = clauses.find(clause => placeWords.some(w => has(clause, w)) && narratedPresence(prose, clause, names).ok);
    if (!landed) return null;
    if (frame?.after) {
        const story = normText(prose), proof = normText(d.after || '');
        const first = story.indexOf(proof), last = story.indexOf(normText(landed));
        // Pair the two independently chosen receipts. A real clause about an unrelated event is insufficient.
        // P gives a concrete referent from the player's prerequisite (e.g. the item); X quotes its resolution.
        if (!has(proof, frame.after)) return null;
        if (!narratedEvent(prose, d.after).ok || first < 0 || first + proof.length > last) return null;
    }
    return d;
}
