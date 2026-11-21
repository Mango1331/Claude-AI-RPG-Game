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
const NEARBY = /\b(?:below the (?:rise|ridge|slope|hill)|next to|beside|nearby|at the foot)\b/i;
const vantage = name => String(name || '').match(/^(?:.*?\b(?<terrain>rise|ridge|slope|hill|bank|ledge|overlook|path|trail))\s+(?:above|beside|overlooking|next to)\s+(?:the\s+)?(?<camp>.+\bcamp|camp|campsite|encampment)$/i);

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
    const near = !view || facts.some(f => CAMP.test(f.o) && NEARBY.test(f.o) && VACANT.test(f.o));
    const far = REMOTE.test(text) || (!view && OUTSIDE.test(place.name)) || !!view && (!near || closed || people.length > 0 || !/\b(?:around|inspect|examine|survey|search|approach|enter|walk to)\b/i.test(text));
    return {origin:place.id, name:view ? normText(view.groups.camp) : place.name, approach:!!view && !far,
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

// Match one noun phrase, including "pot of dented copper". Words from separate objects
// must never complete the label. Keep the offset for the existing quantity check.
function itemMention(line, name) {
    const label = (normText(name).match(/[a-z0-9]+/g) || []).filter(w => !['of', 'the'].includes(w));
    if (!label.length) return null;
    const normalized = normText(line).replace(/(?<=[a-z])-(?=[a-z])/g, ' ');
    const tokens = [...normalized.matchAll(/[a-z0-9]+|[^\s]/g)];
    for (let start = 0; start < tokens.length; start++) {
        const remaining = new Set(label);
        for (let i = start; i < tokens.length; i++) {
            const word = tokens[i][0];
            if (i > start && ['of','the'].includes(word)) continue;
            if (!remaining.delete(word) && !remaining.delete(word.replace(/s$/, ''))) break;
            if (!remaining.size) return {before:normalized.slice(0,tokens[start].index), after:normalized.slice(tokens[i].index + word.length)};
        }
    }
    return null;
}

const UNSUITABLE = /\b(?:if|might|would|could|should|imagined|missing|gone|not|no|nothing|without|isn't|wasn't|weren't|unseen|inaccessible|underneath|inside|shut|broken|ruined|rotten|spoiled|inedible|shattered|locked|tied shut|laced shut|hidden|buried|concealed|stolen|costly|priceless|ornate|unreachable|owned|owns?|guards?|borrowed|loan|belong(?:s|ed|ing)?|his|her|hers|their|sale|valuable|precious|rare|gilded|gold(?:en)?|silver|platinum|diamond|gemstone|jewels?|jewelled|jeweled|coins?|enchanted|magical|painting|depiction|replica of|dreamed)\b|['’]s\b/i;
const DISCLAIMS = /\b(?:abandoned|discarded|ownerless|unclaimed|left behind|free to take)\b/i;

// Only a local record of this camp can stand in for an explicit disclaimer on the item.
export function vacantSite(s, view) {
    const place = s.places[view.origin];
    const local = text => CAMP.test(text) && VACANT.test(text) && !/\b(?:not|never|no longer|formerly|once|might|possibly|appears?|looks?|seems?|rumou?r(?:ed)?|other|another)\b/i.test(text);
    if (!view.approach && local(place?.name || '')) return true;
    return Object.values(s.facts || {}).some(f => f.s === view.origin && !f.until && f.visibility !== 'private' && local(f.o)
        && (view.approach ? NEARBY.test(f.o)
            : /\b(?:here|this (?:camp|clearing)|camp here)\b/i.test(f.o)));
}

export function visibleSupply(content, d, prose, vacant = false) {
    if (!['item','resource'].includes(d.kind) || d.teaches || d.effect || d.for_quest || d.in) return false;
    const name = normText(d.name);
    if (itemProfile(content, {name, kind:'item'}) || (d.qty ?? 1) < 1) return false;
    const lines = String(prose).split(/[.!?;\n]+/).map(line => line.trim()).filter(Boolean);
    let affirmed = false;
    for (const [i,line] of lines.entries()) {
        const mention = itemMention(line,name);
        if (!mention) continue;
        const next = lines[i+1] || '';
        if (UNSUITABLE.test(line) || (/^(?:it|this|that)\b/i.test(next) && UNSUITABLE.test(next))
            || /\b(?:owns?|claims?|guards?) (?:it|them)\b/i.test(next)) return false;
        if (!ordinarySupply(name) && !/\b(?:plain|ordinary|mundane|commonplace)\b/i.test(line)) continue;
        if (d.qty > 1 && trailingNumber(mention.before.replace(/\b(?:unclaimed|discarded|ownerless|abandoned)\s*$/i, '')) !== d.qty) continue;
        // At a proven vacant site a directly listed object or one physically placed in
        // the scene is sufficient. A remembered, wanted or merely mentioned item is not.
        const listed = /^(?:a|an|the)?\s*$/.test(mention.before.trim()) && /^(?:\s*$|\s*,)/.test(mention.after);
        const placed = /^\s+(?:(?:is|was|were|are) (?:lying|resting|sitting|hanging)|sits?|hangs?|lies|rests?|stands?|leans?|lay)\b/.test(mention.after)
            || /\b(?:lies|rests?|hangs?|sits?|stands?|lay)\s+(?:a|an|the)\s+$/.test(mention.before);
        if (DISCLAIMS.test(line) || (vacant && ordinarySupply(name.split(/\s+/).at(-1)) && (listed || placed))) affirmed = true;
    }
    return affirmed;
}

// A remote view can include a second object on the lookout. Bind proximity to
// the reported noun itself; "he looks down from the rise" locates only the observer.
export function atObserver(place, name, prose) {
    const terrain = vantage(place?.name)?.groups.terrain.toLowerCase();
    if (!terrain) return false;
    const near = "(?:beside alaric|at alaric's feet|(?:beside him|at his feet) on the " + terrain + ")";
    const before = new RegExp('(?:^|,\\s*)(?:(?:right|directly) )?' + near + ',? (?:a|an|the) $');
    const after = new RegExp('^\\s+(?:lies|rests|lands|falls) (?:right |directly )?' + near + '\\b');
    return String(prose).split(/[.!?;\n]/).some(line => {
        const mention = itemMention(line,name);
        if (!mention || UNSUITABLE.test(line.replace(/(?:his|alaric['’]s) feet/ig,'feet')) || /\b(?:below|downhill|camp|distant|afar|imagines?|might|could|not|no)\b/i.test(line)) return false;
        return (before.test(mention.before.trimStart()) && /^\s+(?:lies|rests|lands|falls)\b/.test(mention.after)) || after.test(mention.after);
    });
}
