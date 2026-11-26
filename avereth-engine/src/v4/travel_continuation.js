// The planner sees the player's choice before the reply. The extractor reports actual arrivals. Neither books a GO.
import { normText } from '../util.js';
import { narratedEvent, narratedPresence, movementEvidence } from './narration_evidence.js';
import { guardCommands } from './agency.js';
import { samePlace } from './place_refs.js';

// One negative boundary, on the whole current input before it is clipped for the event summary. P otherwise
// interprets free language; these direct vetoes also win over a mistaken 'local' or an earlier positive quote.
const holdPosition = /\b(?:(?:i|we) (?:stay|remain) (?:here|put)|(?:i|we) (?:do not|don't|will not|won't) (?:go|leave|follow)|(?:only|just) (?:asking|want directions)|without leaving|ich bleibe hier|ich gehe nicht)\b|^(?:i refuse|i decline|not now)$/i;
const assisted = /^(?:(?:would|could|can|will) you |please )?(?:carry|take|escort|walk|lead) me (?:please )?(?:to|into) (.+?)(?: please)?[.!?]*$/i;
const follows = /^(?:i (?:follow|go with) (?:you|him|her|them)|i['’]m right behind you|ich (?:folge dir|schließe mich an))[.!]*$/i;
const localFurnishing = /\b(counter|table|seat|bed|bunk|cot|bench|tresen|theke|tisch|liege|bank)\b/i;
const localMotion = /^(?:i (?:step|walk|move|head|go) (?:over )?(?:to|towards?) (?:the |my )?(?:counter|table|seat|bed|bunk|cot|bench)\b|ich gehe (?:zum|zur) (?:tresen|theke|tisch|liege|bank))[^.!?]*[.!]*$/i;
const lodgingWords = /\b(?:loft|room|bed|bunk|cot|berth|lodging|quarters|kitchen)\b/i;
const words = value => normText(value).replace(/[^\p{L}\p{N}']+/gu, ' ').trim();
const has = (text, part) => typeof part === 'string' && !!words(part) && ` ${words(text)} `.includes(` ${words(part)} `);

/** Bind a literal, current approach to a unique locally established referent.
 * A person already in the scene needs no GO. The ordinary agency/GO checks still apply. */
export function localApproach(s, input, prose) {
    if (!prose || holdPosition.test(input) || /\?|\b(?:if|unless|after|once|until|would|might|before|instead)\b/i.test(input)) return null;
    const motion = /(?:^|[*.,!]\s*|\bas\s+)(i\s+(?:walk|step|head|go|move)\s+(?:over\s+)?(?:to|towards?|into)\s+(?:the\s+)?([^*.!?,;]+?))(?=\s+and\b|[*.,!?;]|$)/ig;
    const choices = [...input.matchAll(motion)];
    if (choices.length !== 1) return null;
    const [, quote, target] = choices[0];
    if (!has(prose,target)) return null;
    const here = s.scene.at;
    const local = id => s.places[id]?.parent === here;
    const sites = Object.values(s.places).filter(p => local(p.id) && has(p.name,target));
    const people = Object.values(s.entities).filter(e => e.kind === 'npc' && e.status !== 'dead' &&
        (s.scene.present.includes(e.id) || local(e.at)) &&
        [e.name,e.known_name,...(e.descriptors || [])].some(label => has(label,target)));
    if (people.some(e => s.scene.present.includes(e.id)) || people.length > 1) return null;
    const destinations = new Set([...sites.map(p => p.id), ...people.map(e => e.at)]);
    if (destinations.size !== 1) return null;
    const go = { seq:1,type:'go',to:[...destinations][0],quote };
    return guardCommands(input,[go]).kept[0] || null;
}

/** Optional and advisory. A malformed supplied boundary must never broaden permission or cause a planner retry. */
export function travelFrame(frame, input, present) {
    if (frame == null) return null;
    for (const clause of normText(input).split(/[.!?\n]+/)) {
        if (!holdPosition.test(clause.trim())) continue;
        // A timed hold is a boundary in its own right: neutral scope never releases it.
        const prerequisite = clause.split(/\b(?:until|unless|bis)\b/i)[1];
        if (!prerequisite || !has(prerequisite, frame?.after)) return 'stay';
    }
    if (frame === 'local' || frame === 'stay') return frame;
    if (!has(input, frame.choice)) return 'stay';
    if (frame.to != null && !has(frame.choice, frame.to)) return 'stay';
    if (frame.with != null && !present.includes(frame.with)) return 'stay';
    if (frame.after != null && !has(input, frame.after)) return 'stay';
    const reading = guardCommands(input, [{ seq: 1, type: 'go', quote: frame.choice }]);
    if (reading.dropped.some(r => r.rule !== 'question')) return 'stay';
    return { choice: frame.choice, to: frame.to || null, with: frame.with || null, after: frame.after || null };
}

/** Use the booked action or a clear current choice when the planner supplied no narrower boundary. */
export function ordinaryChoice(s, input, boundary = null) {
    if (boundary && typeof boundary === 'object') return null;
    const choice = String(input || '').trim().replace(/^\*+|\*+$/g,'').trim();
    if (!choice || choice.split(/[.!?\n]+/).some(clause => holdPosition.test(clause.trim()))) return null;
    const lower = normText(choice);
    const target = lower.match(assisted)?.[1] || lower.match(/^trag mich (?:bitte )?(?:zur|zum|ins) (.+?)[.!?]*$/i)?.[1];
    if (target) return {choice,to:target.replace(/^(?:my |the )/i,''),assisted:true};
    // Only an explicit transport request can resolve a generic stay classification.
    if (boundary === 'stay') return null;
    const booked = (s.services || []).findLast(x => x.service === 'lodging' && x.at === s.scene.at && x.turn === s.turn);
    const lodging = booked && (booked.what || s.offers?.[booked.offer]?.lines?.find(line => line.id === booked.line)?.what);
    const room = words(lodging).split(' ').find(word => lodgingWords.test(word) && has(lower,word));
    if (room && has(lower,room) && (/^(?:just |i(?:'ll| will) take |i choose |i go to |to )/i.test(lower) || /\b(?:go|walk|head|take me|show me)\b/.test(lower)))
        return {choice,to:room,lodging:true};
    if (follows.test(choice)) return {choice,companion:true};
    if (localMotion.test(choice)) return {choice,to:localFurnishing.exec(choice)?.[0],within:true};
    return null;
}

export function reportedContinuation(s, content, answer, prose) {
    const o = s.last?.outcome;
    const boundary = o?.auth?.continuation;
    const frame = ordinaryChoice(s,s.last?.input,boundary) ?? boundary;
    const arrivals = (answer.deltas || []).filter(d => d.type === 'arrive');
    if (arrivals.length !== 1 || !o?.auth?.c || o.auth.go || o.auth.gos?.length || o.auth.roam || o.interp_failed || o.camp ||
        !frame || frame === 'stay' || s.mode !== 'story' || s.encounter || s.pending_combat?.length || s.scene.threats?.length ||
        s.entities.pc?.status === 'dead' || o.auth.pulse?.interrupt || o.conditionals?.some(r => r.kind === 'go') ||
        [...(o.resolutions || []), ...(o.dropped || [])].some(r => ['go', 'journey.continue', 'attack', 'skill', 'flee'].includes(r?.type)
            || r.type === 'activity' && r.kind === 'wait')) return null;
    const d = arrivals[0];
    if (d.forced_by || !samePlace(s, answer.scene, d.at, content) || (d.with || []).some(id => !s.scene.present.includes(id))) return null;
    // 'local' records only the absence of an explicit limit. An older/missing assessment cannot clear a limit.
    // The current X still has to report a real arrival inside an ordinary site, checked after place resolution.
    const label = typeof d.at === 'string' ? s.places[d.at]?.name : d.at?.new?.name;
    if (frame.to && !has(label, frame.to) || frame.with && !d.with?.includes(frame.with)
        || frame.companion && !d.with?.length) return null;
    const names = [s.entities.pc?.name?.split(' ')[0], 'you'].filter(Boolean);
    // X identifies the stop. A literal quote about a different scene cannot establish presence at that stop.
    const placeWords = normText(label || '').split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 3 && !['the', 'and', 'above', 'below', 'behind', 'near'].includes(w));
    const storyClauses = String(prose).split(/[.!?…\n]+/);
    const atStop = /\b(?:walked|reached|arrived|entered|returned|stood|stepped|crossed|emerged|carried|led|brought|settled|lay|sat|leaving)\b/i;
    const clauses = [d.evidence, ...storyClauses.filter(c => has(c, label)
        && (movementEvidence(c) || frame.assisted && /\b(?:carried|led|brought)\b/i.test(c)))].filter(Boolean);
    const landed = clauses.find(clause => atStop.test(clause) && placeWords.some(w => has(clause, w))
        && narratedPresence(prose, clause, names).ok);
    if (!landed) {
        // A paid room may be narrated through the walk inside and the PC settling there.
        const i = d.evidence ? storyClauses.findIndex(clause => has(clause,d.evidence)) : -1;
        const atRoom = i >= 0 && has(d.evidence,frame.to) && narratedEvent(prose,d.evidence).ok;
        const occupied = (clause) => /\b(?:he|him|his weight)\b/i.test(clause) &&
            /\b(?:mattress|blanket|bed|bunk|cot)\b/i.test(clause) && narratedEvent(prose,clause).ok;
        const reachedRoom = frame.lodging && storyClauses.some((clause,index) =>
            (atRoom && index === i || clause.split(/[,:;]/).some(part => has(part,frame.to) && narratedEvent(prose,part).ok)) &&
            storyClauses.slice(index,index+5).some(occupied));
        if (!reachedRoom) return null;
    }
    if (frame?.after) {
        const story = normText(prose), proof = normText(d.after || '');
        const first = story.indexOf(proof), last = story.indexOf(normText(landed));
        // Pair the two independently chosen receipts. A real clause about an unrelated event is insufficient.
        // P gives a concrete referent from the player's prerequisite (e.g. the item); X quotes its resolution.
        if (!has(proof, frame.after)) return null;
        if (!narratedEvent(prose, d.after).ok || first < 0 || first + proof.length > last) return null;
    }
    const detail = frame.within && d.at?.new?.kind === 'interior' && d.at.new.parent === s.scene.at
        && words(label).replace(/^(?:a|the|my) /,'') === words(frame.to);
    return { delta:d, choice:frame, detail };
}
