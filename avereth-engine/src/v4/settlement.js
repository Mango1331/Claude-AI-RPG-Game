// Prototype C (4.3.0-c.6.6.5): living settlements (live 15.10.2026: the Ashbridge Market District at midday felt like an
// empty stage; a buyer for monster parts took a failed SEARCH and an hour; a market passer-by could not be attacked).
// Content rules.settlements holds the data; this module reads it:
//
//   size          a settlement's size (village, town, city) from its content sub; one the story created is a village
//   crowd         how busy its open streets are now (ambient: colour, never stored as people)
//   trades        the everyday trades its size has, found by day without a check; the shops the story already
//                 established for a trade (a place or the person working there) come first, so a known shop stays known
//   bystanders    the people of the crowd a fight among them needs as targets, made people only then (an attack on
//                 "the fishmonger", an area attack in the press of the market)
import { normText, slug, formatClock } from '../util.js';
import { settlementOf, placeName } from './domain.js';

const cfg = (content) => content.rules.settlements || null;

/** "village" | "town" | "city" for the settlement a place lies in, or null outside any settlement. */
export function settlementSize(state, content, at = state.scene?.at) {
    const c = cfg(content);
    const town = at ? settlementOf(state, at) : null;
    if (!c || !town) return null;
    return c.size_of[state.places[town]?.sub] || c.default_size;
}

/** "day" | "evening" | "night" by the clock. */
export function dayPart(state) {
    const h = Math.floor(((state.clock?.minute ?? 0) % 1440) / 60);
    return h >= 6 && h < 19 ? 'day' : h >= 19 && h < 22 ? 'evening' : 'night';
}

const atLeast = (content, size, min) => cfg(content).sizes.indexOf(size) >= cfg(content).sizes.indexOf(min);
const wordsRe = (spec) => new RegExp(`\\b(?:${spec})\\b`, 'i');

/** Is Alaric out in the open streets of a settlement (not inside a building)? */
export function outdoorsInTown(state, content, at = state.scene?.at) {
    const c = cfg(content);
    return !!(c && settlementSize(state, content, at) && c.outdoor_kinds.includes(state.places[at]?.kind));
}

/** The people the crowd here would put into a fight now (0 inside, at night, in an empty village street). */
export function crowdCount(state, content) {
    if (!outdoorsInTown(state, content)) return 0;
    return cfg(content).bystanders[settlementSize(state, content)]?.[dayPart(state)] ?? 0;
}

/**
 * The shops the story already established in this settlement for a trade: places whose name, or the work of the people
 * found there, fits the trade's words ("Shop with the Crossed Knife and Shears", its monster-parts shopkeeper).
 */
function knownShops(state, town, trade) {
    const re = wordsRe(trade.words);
    const out = [];
    for (const p of Object.values(state.places || {})) {
        if (p.id === town || settlementOf(state, p.id) !== town || !['site', 'interior', 'district'].includes(p.kind)) continue;
        const keepers = Object.values(state.entities || {}).filter((e) => e.kind === 'npc' && e.status !== 'dead' && whereIs(state, e) === p.id);
        // their work as the story named it (the occupation, the role they came in with), not every passing description
        const work = keepers.flatMap((e) => [...Object.values(state.facts || {}).filter((f) => f.s === e.id && f.p === 'occupation').map((f) => f.o), e.descriptors?.[0]].filter(Boolean));
        if (re.test(normText(p.name)) || work.some((w) => re.test(normText(w)))) out.push({ id: p.id, name: p.name, who: work.find((w) => re.test(normText(w))) || null });
    }
    return out;
}

/** Where a person is to be found: their place, the scene they are in, or the place of their latest memory there. */
function whereIs(state, e) {
    if (e.at) return e.at;
    if ((state.scene?.present || []).includes(e.id)) return state.scene.at;
    const mems = Object.values(state.memories || {}).filter((m) => (m.who || []).includes(e.id) && m.place);
    const last = mems.at(-1);
    return last ? Object.values(state.places || {}).find((p) => normText(p.name) === normText(last.place))?.id || null : null;
}

/** The trades a want names ("a store to sell the monster parts to" → monster parts); all of them when it names none. */
export function tradesWanted(content, text) {
    const t = normText(text);
    const hit = cfg(content).trades.filter((tr) => wordsRe(tr.words).test(t));
    return hit.length ? hit : cfg(content).trades;
}

/** Does a search look for an ordinary shop or service of a settlement (not a secret, an illegal dealer, a hidden way)? */
export function shopSearch(content, text) {
    const c = cfg(content);
    if (!c) return false;
    const t = normText(text);
    return !wordsRe(c.hidden_words).test(t) && (wordsRe(c.shop_words).test(t) || c.trades.some((tr) => tr.key !== 'market' && wordsRe(tr.words).test(t) && /\b(?:sell|buy|shop|store|find|look for|where)\b/.test(t)));
}

/**
 * What finding an ordinary trade here comes to, without a check: the trades the size has (known shops first), the ones
 * it has not (with the settlements of the realm that are large enough), and whether they are open now.
 * @returns {{line: string, minutes: number} | null} null outside a settlement
 */
export function findTrades(state, content, text) {
    const size = settlementSize(state, content);
    if (!size) return null;
    const town = settlementOf(state, state.scene.at);
    const part = dayPart(state);
    const wanted = tradesWanted(content, text);
    const here = [];
    const missing = [];
    for (const tr of wanted) {
        if (!atLeast(content, size, tr.min)) { missing.push(tr); continue; }
        const known = knownShops(state, town, tr);
        here.push(`${tr.name}${known.length ? ` — known: ${known.map((k) => `${k.name}${k.who ? ` (${k.who})` : ''}`).join(', ')}` : ''}`);
    }
    const bigger = (tr) => Object.values(state.places).filter((p) => p.kind === 'settlement' && p.realm === state.places[town]?.realm && p.id !== town && atLeast(content, cfg(content).size_of[p.sub] || cfg(content).default_size, tr.min)).map((p) => p.name).slice(0, 3);
    const lines = [];
    if (here.length) lines.push(`${placeName(state, town)} (${size}) has: ${here.join(' · ')}.`);
    for (const tr of missing) lines.push(`A ${size} like ${placeName(state, town)} has no ${tr.name.split(' (')[0]}${bigger(tr).length ? `; the nearest larger places that do: ${bigger(tr).join(', ')}` : ''}.`);
    const open = part === 'day' ? 'Open now: signs, open fronts and a question or two find them; no check.'
        : part === 'evening' ? 'Most fronts are closing for the evening; inns and taverns stay open.'
            : 'At night the shops are shut until morning; inns and taverns stay open.';
    return { line: `${lines.join(' ')} ${open}`, minutes: part === 'day' ? 10 : 5 };
}

/**
 * The narrator's view of the settlement around Alaric (Prototype C): how busy the street is now and that the crowd is
 * colour, and outdoors the everyday trades of its size. '' outside a settlement.
 */
export function settlementLife(state, content) {
    const c = cfg(content);
    const size = settlementSize(state, content);
    if (!c || !size) return '';
    const town = settlementOf(state, state.scene.at);
    const part = dayPart(state);
    const out = outdoorsInTown(state, content);
    const lines = [`SETTLEMENT LIFE — ${placeName(state, town)} is a ${size}; ${formatClock(state.clock.minute).replace(/^Day \d+, /, '')}.`];
    if (out) {
        lines.push(`The street here is ${c.crowd[size][part]}. The crowd is ambient: show it in passing (faces, voices, traffic, smells); it is no list of people, and nobody in it is stored or needs a name until they matter (Alaric speaks to them, they act, trade or are in danger).`);
        const trades = c.trades.filter((tr) => atLeast(content, size, tr.min));
        lines.push(`Everyday trades a ${size} has (no search needed to find them by day; Alaric chooses where he goes): ${trades.map((tr) => tr.name.split(' (')[0]).join(', ')}.`);
    } else lines.push('Inside: the town goes on outside; people come and go as the place would have them.');
    return lines.join('\n');
}

const PERSON = /\b(?:man|woman|men|women|boy|girl|child|kid|person|people|someone|somebody|passer-?by|passers-?by|stranger|bystanders?|onlookers?|crowd|folk|citizens?|townsfolk|villagers?|peasants?|farmers?|merchants?|traders?|vendors?|stallholders?|shopkeepers?|[a-z]+mongers?|bakers?|butchers?|porters?|carters?|drivers?|guards?|watchm[ae]n|beggars?|pickpockets?|thie(?:f|ves)|urchins?|sailors?|dockers?|labou?rers?|workers?|smiths?|apprentices?|priests?|monks?|nobles?|ladies|lady|lords?|gentlem[ae]n|old (?:man|woman)|drunks?|maids?|servants?|cooks?|innkeepers?|barkeeps?|minstrels?|bards?|elves|elf|dwarfs?|dwarves|orcs?|halflings?|gnomes?)\b/i;
const CREATURE = /\b(?:rats?|dogs?|hounds?|wolf|wolves|cats?|horses?|mules?|oxen|ox|cows?|pigs?|goats?|sheep|chickens?|birds?|crows?|pigeons?|beasts?|monsters?|creatures?|snakes?|spiders?)\b/i;

/** Is this description a person of the crowd (not an animal, not a creature)? */
export const personWords = (ref) => PERSON.test(String(ref || '')) && !CREATURE.test(String(ref || ''));

/**
 * Events that make people of the crowd for a fight among them: one person a single attack names ("the fishmonger"),
 * or the people standing closest for an area attack, ENGAGED with him. Each is an ordinary townsperson (template
 * commoner), present and relevant; nothing else about them is decided.
 * @returns {{events: object[], ids: string[]}}
 */
export function bystanderEvents(state, content, { ref = null, count = 1 } = {}) {
    const events = [];
    const ids = [];
    const taken = new Set(Object.keys(state.entities || {}));
    const names = ref ? [ref] : Array.from({ length: count }, () => 'bystander');
    for (const [i, n] of names.entries()) {
        const base = `npc.${slug(String(n).replace(/^(?:the|a|an|that|this)\s+/i, '')) || 'bystander'}`;
        let id = base;
        for (let k = 2; taken.has(id); k++) id = `${base}_${k}`;
        taken.add(id);
        ids.push(id);
        const what = String(n).replace(/^(?:the|a|an|that|this)\s+/i, '').toLowerCase().slice(0, 40);
        events.push({ t: 'entity.created', d: { entity: { id, kind: 'npc', name: null, descriptors: [what], traits: '', status: 'alive', location: state.scene.location, at: state.scene.at, created: { turn: state.turn, minute: state.clock.minute }, source: { kind: 'engine', why: 'crowd' }, card: {}, template: 'commoner' } } });
        events.push({ t: 'scene.entered', d: { id, band: ref ? 'SHORT' : 'ENGAGED' } });
        events.push({ t: 'scene.tactical', d: { id, relevant: true, threat: false } });
        if (ref && i === 0) events.push({ t: 'scene.awareness', d: { id, level: 'aware' } });
    }
    return { events, ids };
}
