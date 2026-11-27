import { trueDungeonOf } from './dungeon.js';
import { settlementOf } from './domain.js';
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

// Read only a chosen movement clause. Purpose, observation and the route taken do not name its end.
export function chosenKnownRoute(s, input) {
    if (/^[^.!?]*\?/.test(input) || /\b(?:only if|unless)\b/i.test(input)) return null;
    const clause = String(input).split(/[.!?]/)[0].trim();
    if (/\?|\b(?:if|unless|might|would|could|should|don't|not|tomorrow)\b/i.test(clause)) return null;
    const speech = clause.replace(/^([^,]+),\s*/, (all, label) =>
        s.scene.present.some(id => normText(s.entities[id]?.name || '') === normText(label)) ? '' : all);
    const move = speech.match(/^(?:(?:I|we)\s+(?:leave\s+[^,;]+?\s+and\s+)?|let(?:'s| us)\s+)(?:go|walk|head|return|move|travel)\s+(?:back\s+)?(?:upstairs\s+|downstairs\s+)?(?:to|into)\s+(.+)$/i);
    if (!move) return null;
    const target = normText(move[1].split(/[,;]|\s+(?:and|to see|to ask|through|via|before|after|if)\s+/i)[0]).replace(/^the /,'').replace(/\s+itself$/,'');
    const ids=knownRoutes(s);
    const named=ids.filter(id=>{
        const name=normText(s.places[id].name).replace(/^the /,'');
        return target===name || target.endsWith(' of the '+name) || target.endsWith(' of '+name);
    });
    if(named.length) return named.length===1 ? named[0] : null;
    const people=Object.values(s.entities).filter(e=>e.kind==='npc' && e.status!=='dead' &&
        [e.name,...(e.descriptors || [])].some(label=>label && normText(label).replace(/^the /,'')===target));
    return people.length===1 && !s.scene.present.includes(people[0].id) && ids.includes(people[0].at) ? people[0].at : null;
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
