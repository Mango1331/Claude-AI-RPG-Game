import { trueDungeonOf } from './dungeon.js';
import { settlementOf } from './domain.js';
import { resolvePlaceRef } from './place_book.js';
import { normText } from '../util.js';

// Offer only previously reached local destinations. GO still resolves obstacles, time and PULSE.
export function knownRoutes(s) {
    const here = s.scene?.at, history = s.scene?.history || [];
    if (!here || !s.places?.[here] || s.encounter || s.pending_combat?.length) return [];
    const dungeon = trueDungeonOf(s, here), town = settlementOf(s, here);
    const nearby = id => dungeon ? id === history.at(-1) && trueDungeonOf(s,id) === dungeon
        : town && settlementOf(s,id) === town && !trueDungeonOf(s,id);
    return [...new Set([history.at(-1), s.places[here].parent, ...history.slice().reverse()])]
        .filter(id => id && id !== here && s.places[id] && history.includes(id) && nearby(id)).slice(0,8);
}

/** Resolve the destination the planner selected, including a known place's room or resident. */
export function knownRouteTarget(s, focus) {
    const ids = knownRoutes(s);
    const target = normText(focus.split(',')[0]).replace(/^the /,'').replace(/\s+itself$/,'');
    const book = resolvePlaceRef(s,{new:target});
    const places = ids.filter(id => {
        const name = normText(s.places[id].name).replace(/^the /,'');
        return book.existing === id || book.ambiguous?.includes(id) || target === name ||
            target.endsWith(' of the '+name) || target.endsWith(' of '+name);
    });
    if (places.length) return places;
    const people = Object.values(s.entities).filter(e => e.kind === 'npc' && e.status !== 'dead' &&
        [e.name,...(e.descriptors || [])].some(label => label && normText(label).replace(/^the /,'') === target));
    return [...new Set(people.filter(e => !s.scene.present.includes(e.id) && ids.includes(e.at)).map(e => e.at))];
}

// A bounded repair hint, never a GO or an arrival. Only flag a direct physical choice with
// evidence of travel beyond the scene (destination in another locality or retracing a route).
export function explicitJourneyClause(input) {
    if (/^[^.!?]*\?/.test(input)) return false;
    const clause = String(input).trim().split(/[.!?]/)[0];
    if (!/^(?:I|we)\s/i.test(clause) || /[?]|\b(?:if|unless|might|would|could|should|not|never|later|tomorrow|plan|intend|want|hope)\b/i.test(clause) || /n['’]t\b/i.test(clause)) return false;
    return /(?:^(?:I|we)\s+|\band\s+)(?:go|walk|travel|head|return|ride)\s+(?:back\s+)?(?:to|into)\s+[^.!?]+/i.test(clause) &&
        /\b(?:town|city|village|settlement)['’]s\s|\b(?:the way (?:I|we) came|back along the route)\b/i.test(clause);
}
