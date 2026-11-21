import { rulesetOf } from '../content.js';
import { trailingNumber } from '../economy.js';
import { itemProfile } from './items.js';
import { normText } from '../util.js';
import { featuresAt, groundAccess } from './features.js';
import { wareOnSale } from './trade.js';

const CAMP = /\b(?:camp|campsite|encampment)\b/i;
const LOOK = /\b(?:look(?:ing)? (?:around|over|at)|inspect|examine|survey|check|search|what (?:lies|is|can I see))\b/i;
const UNCERTAIN = /\b(?:hidden|concealed|secret|buried|underneath|under|stash|cache|compartment|track|trail|signs of)\b/i;
const REMOTE = /\b(?:from (?:here|afar|a distance|the (?:ridge|rise|hill))|through (?:my |the )?(?:glass|telescope)|without (?:moving|approaching)|distant|faraway|horizon)\b/i;
const BARRED = /\b(?:guarded|occupied|locked|barred|blocked|impassable|cliff|chasm|across the river|miles away|distant|horizon)\b/i;
const OUTSIDE = /\b(?:above|overlooking|outside|towards?|beyond|across from|road to|path to|view of|approach to|distant|horizon)\b/i;
const VACANT = /\b(?:abandoned|deserted|unoccupied|sits empty|stands empty|empty camp)\b/i;
const vantage = name => String(name || '').match(/^(?:.*?\b(?:rise|ridge|slope|hill|bank|ledge|overlook|path|trail))\s+(?:above|beside|overlooking|next to)\s+(?:the\s+)?(.+\bcamp|camp|campsite|encampment)$/i);

// An observation point and its camp are different holders, even before a camp site ID exists.
export function looksDownOnCamp(s) {
    return !!vantage(s.places[s.scene.at]?.name);
}

export function campInspection(s, text) {
    if (!text || rulesetOf(s) < 2 || s.encounter || !LOOK.test(text) || /\b(?:if|would|might|should|don't|do not|look for (?:a|another)|search for (?:a|another))\b/i.test(text)) return null;
    const place = s.places?.[s.scene.at];
    if (!place || !['site','wilderness'].includes(place.kind)) return null;
    const facts = Object.values(s.facts || {}).filter(f => f.s === place.id && !f.until && f.visibility !== 'private');
    const campHere = facts.some(f => CAMP.test(String(f.p).replace(/_/g,' ') + ' ' + f.o) &&
        /\b(?:camp(?:site)? (?:here|on this spot)|(?:here|this clearing) (?:is|holds|contains) (?:an? |the )?(?:abandoned |deserted )?camp)\b/i.test(f.o));
    const view = vantage(place.name);
    // A place named after a camp may still be a lookout. Only the camp itself or a corroborated nearby approach qualifies.
    if (!view && !campHere && !place.camp_stock && !/\b(?:camp|campsite|encampment)$/i.test(place.name)) return null;
    if (!CAMP.test(text) && (view || !/\b(?:here|around|equipment|stock|gear)\b/i.test(text))) return null;
    if (/\b(?:search|look) (?:the (?:area|woods|forest) )?for (?:goblins|a camp|another camp|enemies)\b/i.test(text)) return null;
    const sought = text.match(/\bfor\s+(.+)$/i)?.[1];
    if (sought && !UNCERTAIN.test(sought) && !ordinarySupply(sought) &&
        !/^(?:(?:any|some|useful|ordinary|accessible|visible|camp|the)\s+)*(?:loot|supplies|equipment|gear|things|items|stock|tools)\b/i.test(sought)) return null;
    const details = facts.map(f => String(f.o)).join(' ');
    const people = s.scene.present.filter(id => id !== 'pc' && s.entities[id]?.status !== 'dead');
    const danger = s.pending_combat?.length || people.some(id => s.entities[id]?.kind === 'creature');
    const closed = danger || BARRED.test(place.name + ' ' + details) || featuresAt(s, place.id, {hidden:true}).some(f => f.status === 'active' && ['obstacle','hazard'].includes(f.kind));
    const near = !view || facts.some(f => CAMP.test(f.o) && /\b(?:below the (?:rise|ridge|slope|hill)|next to|beside|nearby|at the foot)\b/i.test(f.o) && VACANT.test(f.o));
    const far = REMOTE.test(text) || (!view && OUTSIDE.test(place.name)) || !!view && (!near || closed || people.length > 0 || !/\b(?:around|inspect|examine|survey|search|approach|enter|walk to)\b/i.test(text));
    return {origin:place.id, name:view ? normText(view[1]) : place.name, approach:!!view && !far,
        at:!view && !far ? place.id : null, far, free:!far && !closed && !people.length && (!view || VACANT.test(details)),
        hidden:UNCERTAIN.test(text)};
}

export function campObjects(s, at) {
    if (!at || at !== s.scene.at) return [];
    return Object.values(s.objects).filter(o => !o.in && !o.in_name && groundAccess(s,o).ok && !wareOnSale(s,o));
}

export function campLine(s, view) {
    if (view.far) return 'CAMP IN VIEW — describe only what is visible from this position. No camp inventory, approach or transfer.';
    const objects = campObjects(s,view.at).map(o => o.name + ' (' + o.id + ', ' + (o.qty ?? 1) + ')');
    const known = view.at && s.places[view.at].camp_stock;
    const stock = known ? 'The recorded inventory stands. Reuse its IDs; removed items stay gone.' :
        'Describe ordinary portable equipment only if actually present, visible and accessible. Record a new item on the ground only when its use and lack of an owner are clear in the narration.';
    return 'CAMP INSPECTION — ' + (objects.length ? objects.join(', ') + '. ' : '') + stock +
        ' Looking transfers nothing. Corpses were settled separately. Hidden contents stay unknown without a successful search.';
}

export function uncoveredSupply(d, prose) {
    if (d.in) return true;
    const name = normText(d.name);
    return String(prose).split(/[.!?;\n]/).some(line => normText(line).includes(name) &&
        /\b(?:uncovers?|uncovered|unearths?|unearthed|dug up|beneath|buried|hidden inside)\b/i.test(line) &&
        !/\b(?:no|nothing|never|not|might)\b/i.test(line));
}

// A portable object reported in an inspection needs an affirmative description. Borrowed, ruined and valuable
// goods can still exist through the ordinary trade, gift, search and discovery paths.
export const ordinarySupply = name => /\b(?:bowl|pot|pan|cup|kettle|utensil|ladle|spoon|blanket|bedroll|rope|cord|cloth|sack|basket|waterskin|flask|pail|bucket|tinder|firewood|peat|ration|rabbit|meat|hide|tarp|tent peg)s?\b/i.test(name);

export function visibleSupply(content, d, prose) {
    if (!['item','resource'].includes(d.kind) || d.teaches || d.effect || d.for_quest || d.in) return false;
    const name = normText(d.name);
    if (itemProfile(content, {name, kind:'item'})) return false;
    const clause = String(prose).split(/[.!?;\n]/).find(line => normText(line).includes(name));
    if (!clause || (d.qty ?? 1) < 1 || (!ordinarySupply(name) && !/\b(?:plain|ordinary|mundane|commonplace)\b/i.test(clause))) return false;
    if (d.qty > 1) {
        const before = normText(clause).split(name)[0].replace(/\b(?:unclaimed|discarded|ownerless|abandoned)\s*$/i, '');
        if (trailingNumber(before) !== d.qty) return false;
    }
    return /\b(?:abandoned|discarded|ownerless|unclaimed|left behind|free to take)\b/i.test(clause) && !/\b(?:if|might|would|could|imagined|not|no|nothing|without|missing|broken|ruined|rotten|spoiled|inedible|shattered|locked|hidden|buried|owned|borrowed|loan|belongs|sale|valuable|gold(?:en)?|silver|platinum|diamond|gemstone|jewels?|jewelled|jeweled|coins?|enchanted|magical)\b|['’]s\b/i.test(clause);
}
