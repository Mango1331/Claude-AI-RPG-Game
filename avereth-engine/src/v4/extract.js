import { placeKey, scopedPlaces } from './place_refs.js';
import { privateQuestsOf } from '../content.js';
// Runtime V4: the world-delta extractor (docs/RUNTIME_V4_PLAN.md §5, D2 = A). After every story reply a separate call
// reads the reply and reports, as typed deltas in story order, what it established in the world; the engine answers
// its own questions through `expected`. The narrator writes prose only.
//
// P0/S2: this path (A) was 100 % valid and complete over 41 recorded turns, semantics 87.4 %, expected 25/25; the
// inline block in the narrator's reply (B) was valid and complete in 43.9 %. The format rules below are the
// hidden-schema fix of 27.09.: the prompt states every constraint the validator checks. What the engine commits of a
// valid answer decides the domain/authority firewall (src/v4/firewall.js), not this module.
import { O, S, B, I, E, A, N, validate } from './schema.js';
import { extractJsonObject } from './json.js';
import { saleOfferLines } from './trade.js';
import { normText } from '../util.js';
import { findQuote, openConditionNear } from './finance_evidence.js';
import { creatureContract } from './population.js';

/** Preserve the historical wire vocabulary; new campaigns have only Guild quests. */
export function worldVocab(vocab, state) {
    if (privateQuestsOf(state)) return vocab;
    return { ...vocab, version: vocab.version,
        rules: [...vocab.rules.filter(r => !r.startsWith('Paid work FOR an NPC')),
            'FREE HELP: NPC requests, help, agreements and offered wages are ordinary facts, promises, threads and memories. Never create private quests or job ids. Formal quest deltas concern only existing Guild contracts. Helping earns no automatic Quest XP or payout.',
            'coin.gift is an ACTUAL new handover now, including voluntary thanks, wages, advance or reward from any present NPC. No job or acceptance is required. Promises and conditional/future payments are facts/threads, not coin.gift. In said quote the exact current handover clause INCLUDING the FULL amount and every currency; an unquantified remainder ("and the silver", "a handful of silver") is not a complete sum. Never invent an amount or report only the quantified part. For a recount of a RECENT COIN HANDOVER (including an engine-paid sale or Guild payout) set repeat_of to its existing id; picking up those proceeds never pays again. A distinct new gift uses repeat_of:null even for the same giver/amount. Set phase "transferred" only for coin handed over now, relation "independent" for a gift/thanks/wage/reward of its own, "trade_settlement" for proceeds or change of a purchase or sale (report its bid instead; they are paid by the trade), "recount" with repeat_of, and money with the exact words of the full amount.'],
        deltas: vocab.deltas.filter(d => d.type !== 'quest.offer').map(d => {
            if (d.type !== 'coin.gift') return d;
            const { job, ...fields } = d.fields;
            return { ...d, summary: 'An actual coin handover now, or an explicit reference to an already recorded handover; no formal job. Promises are not handovers.',
                fields: { ...fields, repeat_of: { type: 'string', nullable: true } } };
        }),
    };
}

export const EXTRACTOR_VERSION = 'extract-5.25';
export const PLACE_KINDS = ['realm', 'region', 'wilderness', 'settlement', 'district', 'site', 'interior'];
const SERVICES = ['lodging', 'bath', 'laundry', 'meal', 'healing', 'training', 'other'];

/** A place reference: a known id, or {new: {name, kind, parent}} with one more level of new parent. */
export function placeRef(placeIds) {
    const known = placeIds.length ? [E(placeIds)] : [];
    const parentNew = O({ new: O({ name: S(), kind: E(PLACE_KINDS), parent: placeIds.length ? N(E(placeIds)) : { type: 'null' } }) });
    const parent = { anyOf: [...known, parentNew, { type: 'null' }] };
    return { anyOf: [...known, O({ new: O({ name: S(), kind: E(PLACE_KINDS), parent }) })] };
}

// Patch 3: said, the reply's words for the price (the parser fills it with null when left out: normalizeSoftFields)
// Patch 7.2: effect, the kind of a restorative the line sells (a healing potion: heal), the engine fixes how much
const EFFECTS = ['heal', 'restore_mp', 'restore_sta'];
// (left out it is null: the parser fills it, src/v4/extract.js normalizeSoftFields)
// Patch 9C-2b: what a Skill Stone or a manual teaches, as the story establishes it (the engine checks it against the
// techniques it can compose, src/v4/items.js skillSource); every field left out is null
const TEACHES = O({ source: E(['stone', 'manual']), fn: N(S()), tags: N(A(S())), aspects: N(A(S())) });
// Build .142 (finance consolidation §3.3, §4.2, §4.3): which words carry a price (one total or unit literal, or the
// positions of a bid) and the exact words of handed-over coin; a left-out currency_quote is null (normalizeSoftFields)
const MONEY_WORDS = O({ quote: S(), currency_quote: N(S()) });
// Build .144 (S2, delta-1.14): a new price is ONE total in the reply's words, or unknown; no unit rate times units and
// no positions summed from prose (an older answer's "unit" for exactly one unit is that total, everything else of the
// kind is read as unknown: no binding price, the engine asks for the total – normalizeSoftFields)
const PRICING = { anyOf: [
    O({ basis: E(['total']), quote: S(), currency_quote: N(S()) }),
    O({ basis: E(['unknown']) }),
] };
const PHASE = E(['firm', 'conditional', 'unclear']);
const OFFER_LINE = O({ what: S(), kind: E(['goods', 'service']), service: N(E(SERVICES)), qty: I(1), price_cp: I(0), said: N(S()), effect: N(E(EFFECTS)), teaches: N(TEACHES), equipment: N(B()), base: N(S()), quality: N(S()),
    phase: N(PHASE), condition: N(S()), pricing: N(PRICING) });
// 4.3.0-c.6.6.5: a bid's line is one of Alaric's things and how many of it the buyer would take
const bidLine = (refs) => A(O({ object: refs.object, qty: I(1) }), 1);

function fieldSchema(spec, refs) {
    let s;
    if (spec.ref === 'place') s = refs.place;
    else if (spec.ref) s = refs[spec.ref] ?? S();
    else if (spec.enum) s = E(spec.enum);
    else if (spec.array === 'offer_line') s = A(OFFER_LINE, 1);
    else if (spec.object === 'teaches') s = TEACHES;
    else if (spec.object === 'pricing') s = PRICING;
    else if (spec.object === 'money') s = MONEY_WORDS;
    else if (spec.array === 'bid_line') s = bidLine(refs);
    else if (spec.array) s = A(S());
    else if (spec.type === 'integer') s = I(spec.min, spec.max);
    else if (spec.type === 'boolean') s = B();
    else s = S();
    return spec.nullable ? N(s) : s;
}

const EXPECTED_SHAPES = {
    go: (refs) => O({ arrived: B(), at: N(refs.place), with: N(A(S())) }),
    activity: () => O({ minutes: I(0), done: B() }),
    take: () => O({ taken: B() }),
    buy: () => O({ priced: B(), taken_anyway: B() }),
    pay: () => O({ priced: B(), taken_anyway: B() }),
    sell: () => O({ sold: B(), price_cp: N(I(0)) }),
};

/**
 * Strict schema of an extractor answer.
 * @param {object} vocab content/deltas.json
 * @param {{places?: string[], quests?: string[], objects?: string[]}} ids the catalog's ids for the references
 * @param {Record<string,string>} expectedKeys {"2": "go", …}: seq of the PLAYER ACTION → its command type
 */
export function deltaSchema(vocab, ids = {}, expectedKeys = {}) {
    const refs = {
        place: placeRef(ids.places || []),
        quest: (ids.quests || []).length ? { anyOf: [E(ids.quests), O({ new: S() })] } : O({ new: S() }),
        object: (ids.objects || []).length ? { anyOf: [E(ids.objects), O({ new: S() })] } : O({ new: S() }),
        person: S(),
        scene: { anyOf: [E(['here']), placeRef(ids.places || [])] },
    };
    const expected = {};
    for (const [k, t] of Object.entries(expectedKeys)) expected[k] = (EXPECTED_SHAPES[t] || (() => O({ done: B() })))(refs);
    const variants = vocab.deltas.map((d) => {
        const props = { seq: I(1), type: E([d.type]), scene: N(refs.scene) };
        for (const [k, spec] of Object.entries(d.fields)) props[k] = fieldSchema(spec, refs);
        return O(props);
    });
    return O({ scene: N(refs.scene), expected: O(expected), deltas: A({ anyOf: variants }) });
}

function fieldType(spec) {
    if (spec.ref) return `${spec.ref}-ref`;
    if (spec.enum) return spec.enum.map((v) => JSON.stringify(v)).join('|');
    if (spec.array === 'offer_line') return 'offer_line[]';
    if (spec.object === 'teaches') return 'teaches';
    if (spec.object === 'pricing') return 'pricing';
    if (spec.object === 'money') return 'money';
    if (spec.array === 'bid_line') return 'bid_line[]';
    if (spec.array) return 'string[]';
    if (spec.type === 'integer') {
        const limits = [spec.min !== undefined ? `>=${spec.min}` : null, spec.max !== undefined ? `<=${spec.max}` : null].filter(Boolean);
        return limits.length ? `integer(${limits.join(',')})` : 'integer';
    }
    if (spec.type === 'boolean') return 'boolean';
    return 'string';
}

const fieldList = (d) => Object.entries(d.fields).map(([k, spec]) => `${k}:${fieldType(spec)}${spec.nullable ? '|null' : ''}`).join(', ');

// the schema's constraints in words (the validator checks exactly these); without them the P0 sample run of 27.09. was
// 26 % valid, with them 100 %
export const FORMAT_RULES = [
    'Fields shown with |null may be omitted when unknown; the engine fills them with null before validation. Other fields are required unless the delta description says otherwise.',
    'scene is the actual narrative setting at the end of this reply: a place-ref, or "here" ONLY when it is the current engine scene. It never authorizes arrival. Every delta may override scene with a place-ref or "here" (null/omitted inherits the answer scene); use this for earlier scenes in a reply with multiple arrivals. Do not label an unreached camp as here merely because the engine still lists a shop. Local changes need the actual scene; distant reports remain reports. A new scene label creates no place by itself.',
    'TRAVEL: Every actual arrival, including a road or intermediate stop, MUST have its own arrive delta in chronological order. expected.arrived:true requires that matching arrive; expected, time and scene never move Alaric. Local introductions and exchanges follow the arrival at their scene; actions before departure keep the earlier scene. Down means another Dungeon FLOOR, not a sloping passage on the same floor.',
    'SALES: Report an actual buyer price with bid (buyer, exact item ids and quantities, price, said). expected.sold is only a summary, never an independent payment. A current minimum-price instruction can accept a matching bid; a promise or appraisal is not an actual final bid.',
    'Trade evidence: said is required for every NEW financial claim, including each offer line and coin.gift; missing or unlocatable said leaves it unverified. pricing.quote/money.quote must occur inside its own said, never in unrelated narration. offer/bid said quotes the actual commercial clause, including who offers, unit/lot price and conditions. Third-party price advice is fact/place.reported, not an offer or bid of the speaker. Price ranges, possible future prices and unaccepted discounts are not fixed prices. A price binds only as ONE total for exactly the line or the whole bid, in the reply\'s own words; a price per piece for several pieces, part prices without their sum or a count the reply leaves open is no binding price (pricing unknown, phase unclear). Never compute a total yourself. Never invent a seller commitment from a recommendation.',
    'string[] is always a JSON array, even when it contains only one value.',
    `place-ref is an exact known place id from the CATALOG, or {"new":{"name":"...","kind":"...","parent":...}}. For a new place, kind must be exactly one of: ${PLACE_KINDS.join(', ')}. Use settlement for a city, town, village or hamlet; site for a building, inn or Guild hall; interior for a room; wilderness for natural outdoor terrain.`,
    'AREA LEVELS: when an outdoor area’s danger is actually established, report area once with a fixed supported F window. Copy existing area/population levels from the catalog; never adapt to Alaric, overwrite them, or use a mere rumour. A local population’s body plan is authoritative over a free species-name guess. A newly reached local part keeps its genuine geographic parent; never infer a remote relationship merely to inherit levels.',
    'LOCAL HUNT EXPLORATION is an authorized continuation inside an existing habitat: a newly reached den, quarry hollow or other part keeps the stated habitat id as parent, not the realm. A separate journey does not inherit a population just because its species sounds similar. Arrive is still required.',
    'When the CATALOG already contains the place, quest or object, copy its id exactly. Never rewrite an id, invent another id for it, or substitute its title/name.',
    'quest-ref and object-ref mean the exact matching CATALOG id; use {"new":"..."} only when the thing is genuinely new and that reference type permits it.',
    'For a newly created object use object.new {name:"bread",holder:"npc.giver",...} then object.move {object:{new:"bread"},to:"pc",...}. object.new has no ref field. Never invent an obj.* id. The new-name reference must identify exactly one earlier created object; otherwise distinguish the actual objects by their established descriptions.',
    'In a multi-place reply use the existing per-delta scene explicitly for events before the last arrival. Example: enter known npc.giver at the starting place; create bread on that giver there; move {new:"bread"} to pc there; arrive at the authorized destination. present describes co-presence at that step, not only the reply ending. A returning known NPC uses enter, not person.new.',
    'Chronology: when the reply establishes arrival and then meets local people or creatures, emit arrive BEFORE their present:true introductions, with increasing seq. A destination scene label never makes an earlier introduction local. Remote sightings use present:false. In a repair correct both missing scene fields and event order to match the REPLY; never invent an arrival or sort every arrival to the front.',
    'person-ref is a person id from PRESENT or the CATALOG, or the ref of a person.new/creature.new earlier in the same answer.',
    'offer_line is {"what":string,"kind":"goods"|"service","service":"lodging"|"bath"|"laundry"|"meal"|"healing"|"training"|"other"|null,"qty":integer>=1,"price_cp":integer>=0,"said":string|null (the reply\'s words for the price),"effect":"heal"|"restore_mp"|"restore_sta"|null (only for a potion, draught or tonic that restores HP, MP or STA; the engine fixes how much),"teaches":teaches|null,"equipment":boolean|null,"base":string|null,"quality":string|null,"phase":"firm"|"conditional"|"unclear","condition":string|null,"pricing":pricing}.',
    'pricing names the reply\'s words that carry a price: {"basis":"total","quote":"the exact money words that are the price of the whole line or bid"} or {"basis":"unknown"} when the reply names no such total (only a price per piece for several pieces, only part prices, no price). Quote only money words that carry their own coin word ("fifty-six copper", "one hundred fifty copper", "eight silver and four"); currency_quote is null. A bare number ("fifty-six the lot") or an added part ("two more") is no binding total: unknown. A price per piece is the total only of one piece (qty 1). An explicit price for everything ("one hundred fifty for the lot") is the total even after line prices.',
    'phase of a bid or offer line: "firm" only when that side offers this price NOW and only Alaric\'s acceptance is missing (a choice he makes by accepting – "if you want it", "coin or credit" – is no condition); "conditional" when something must still happen first (someone\'s approval or appraisal, an inspection, a delivery, a later time, the goods passing a test), and condition says what; "unclear" when the reply does not settle it. Never firm for a promise, a guess or a price someone else would pay.',
    'money is {"quote":"the exact words of the coin handed over, with the full amount","currency_quote":null|"the coin word of the same sentence for a bare number"}.',
    'Regular F gear offers require base and quality from GEAR MARKET; use separate lines for separate articles, never a package in one base. Missing/unknown bases do not grant equipment. For offer_line.equipment use true for intended combat equipment, false for ordinary/cosmetic merchandise, null if unspecified. This intent supplies no slot or numbers. Use supported categories from GEAR MARKET; separate armor parts have no combat slot. Do not sell ordinary decoration as a combat upgrade.',
    'teaches is {"source":"stone"|"manual","fn":"strike"|"bolt"|"guard"|"ward"|"mend"|null,"tags":string[]|null,"aspects":string[]|null} or null: only for a Skill Stone, or a manual, primer or treatise, that the reply establishes as teaching a technique. fn: strike (a close weapon or body technique), bolt (a ranged spell), guard (a defensive stance), ward (a magical barrier), mend (a healing); tags (Martial, Precision, Mobility, Defense, Arcane, Control) and aspects (Fire, Ice, Lightning, Water, Earth, Wind, Shadow, Light, Poison, Nature, Blood, Sound) only as the reply states them; null for anything the reply does not say. Never for an ordinary stone, a return stone, a storybook or a letter.',
    'A mechanical training service requires an established qualified teacher. A Skill Stone/manual is goods, never silently included in a training service: report separately priced goods and lessons only when the reply actually supplies those separate prices. An indivisible bundle with no split price remains information, not an executable training offer. Ordinary nonmechanical lessons may be service other; none grant automatic skills or progress.',
    'bid_line is {"object":object-ref (an exact OBJECTS id of a thing held by Alaric),"qty":integer>=1}.',
    'expected must contain exactly the keys requested below, no other keys.',
];

export function deltaVocabularyText(vocab) {
    return vocab.deltas.map((d) => `- ${d.type} {${fieldList(d)}}: ${d.summary}`).join('\n');
}

export function expectedText(vocab, expectedKeys) {
    const keys = Object.entries(expectedKeys || {});
    if (!keys.length) return 'expected: {} (nothing to answer this turn)';
    return `expected — answer every key: ${keys.map(([k, t]) => {
        const e = vocab.expected[t];
        const shape = e ? `{${Object.entries(e.shape).map(([f, v]) => `"${f}": ${v}`).join(', ')}}` : '{"done": true|false}';
        return `"${k}" (${t}: ${e ? e.summary : 'did it happen'}): ${shape}`;
    }).join(' · ')}`;
}

/** System prompt of the extractor (the same every turn). */
export function extractorSystem(vocab) {
    return [
        'You read one reply of a text RPG narrator and report, as typed deltas in story order, what the reply established in the world. Alaric is the player character. You write no story.',
        '',
        'Rules:',
        ...vocab.rules.map((r) => `- ${r}`),
        '',
        'FORMAT RULES (schema-critical):',
        ...FORMAT_RULES.map((r) => `- ${r}`),
        '',
        'Deltas:',
        deltaVocabularyText(vocab),
        '',
        'Answer with {"expected": {...}, "deltas": [...]}.',
    ].join('\n');
}

export const EXTRACT_PLAIN_FORMAT = 'Return only one JSON object, no prose before or after it, no code fences: {"scene": <place-ref or "here">, "expected": {<every key asked>}, "deltas": [{"seq": 1, "type": "<delta>", <required fields; fields marked |null may be omitted when unknown>}]}.';

export function extractorUser({ catalog, actions, player = null, expectedKeys, vocab, reply }) {
    return [
        catalog || 'CATALOG: –',
        '',
        // what the player wrote (live run 28.09.2026: "*i sign the card*" read as overreach without it)
        ...(player ? [`PLAYER MESSAGE (what the player wrote Alaric saying and doing):\n${String(player).slice(0, 1500)}`, ''] : []),
        `PLAYER ACTIONS (each status is binding: booked actions are done; authorized/conditional actions are not yet completed):\n${actions || 'none'}`,
        '',
        expectedText(vocab, expectedKeys),
        '',
        `REPLY:\n${reply}`,
        '',
        'TRAVEL CHRONOLOGY: expected.arrived answers whether the final chosen destination was reached. If the reply actually stops at an intermediate place on an authorized journey, report its existing arrive BEFORE local events there, even if final arrived is false. Scene labels alone do not move anyone. Annotate events before the final arrival with their earlier scene; never invent travel for a question or WAIT.',
        '',
        'QUEST OUTCOME CHECK: Before answering, compare this reply with every active Guild contract\'s desired end state in the CATALOG. If one is clearly achieved in this reply, quest.ready is required even when arrival/facts/memory are also reported; fact or memory alone is not enough.',
    ].join('\n');
}

/** The messages of an extractor call, and of its one repair (the invalid answer and the errors appended). */
export function extractorRequest(vocab, { catalog, actions, player = null, expectedKeys, reply, startScene = null }, { previous = null, errors = null } = {}) {
    const system = `${extractorSystem(vocab)}\n\n${EXTRACT_PLAIN_FORMAT}`;
    const user = extractorUser({ catalog, actions, player, expectedKeys, vocab, reply });
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    // Patch 8.1 (§9, live 21.10.2026 10:17: twice all 2,500 tokens went to deliberation and the answer was empty): an
    // empty answer is not repeated back; the one repair asks for the report at once, short, without deliberating
    if (previous !== null && errors && !String(previous).trim()) {
        messages.push({ role: 'user', content: 'Your previous answer was empty: it ran out of room before the JSON. Answer now with the JSON object alone, at once and short: report only what the reply plainly establishes, leave out anything you are unsure of (an empty deltas list is a valid answer). Do not deliberate.' });
    } else if (previous !== null && errors) {
        messages.push({ role: 'assistant', content: String(previous) }, { role: 'user', content: `Your answer was not valid: ${errors.slice(0, 8).join('; ')}. Answer again with only the corrected JSON object, nothing else.` });
        if (errors.some(e => /Place reference|\.(?:at|scene):/.test(e))) messages.at(-1).content += ' Place references must be a known id or {"new":{"name":"exact name","kind":"interior","parent":"known id or full new-parent object"}}. Preserve already valid scene and expected fields. Correct only invalid references and actual story chronology; never invent travel.';
        if (startScene && errors.some(e => /\.scene\b/.test(e))) messages.at(-1).content += ` Engine starting scene: ${JSON.stringify(startScene)}. Annotate earlier deltas with their actual scene before the later arrival (including any actual intermediate stop); the final scene is not retroactive. Preserve valid expected answers and independent deltas. Never invent or reorder arrivals to bypass the error.`;
    }
    return { system, user, messages };
}

/**
 * Read an extractor answer: valid (JSON + schema) and complete (every expected key answered).
 * @returns {{value: object|null, valid: boolean, complete: boolean, errors: string[], missing: string[], raw: boolean}}
 */
const softTeaches = (t) => (t && typeof t === 'object' && !Array.isArray(t) ? { fn: null, tags: null, aspects: null, ...t } : t ?? null);

/**
 * Build .144 (S2): pricing as delta-1.14 has it. A unit price of exactly one unit is its total; a unit price for more
 * units or the positions of a lot carry no binding price (no arithmetic from prose): unknown, and a "firm" phase of it
 * is unclear – the engine then asks the narrator and the player for the one total, without a repair call.
 */
function totalOnly(p, oneUnit, owner) {
    if (!p || typeof p !== 'object') return p;
    if (p.basis === 'unit' && oneUnit) return { basis: 'total', quote: p.quote, currency_quote: p.currency_quote ?? null };
    if (p.basis === 'unit' || p.basis === 'positions') {
        if (owner && owner.phase === 'firm') owner.phase = 'unclear';
        return { basis: 'unknown' };
    }
    return p;
}
function softWords(w) {
    if (!w || typeof w !== 'object' || Array.isArray(w)) return w;
    const out = { ...w };
    if (out.quote !== undefined && out.currency_quote === undefined) out.currency_quote = null;
    if (Array.isArray(out.positions)) out.positions = out.positions.map((p) => (p && typeof p === 'object' && p.currency_quote === undefined ? { ...p, currency_quote: null } : p));
    return out;
}

function normalizeSoftFields(value, vocab) {
    if (!value || typeof value !== 'object') return value;
    const specs = new Map((vocab.deltas || []).map((d) => [d.type, d]));
    const deltas = Array.isArray(value.deltas) ? value.deltas.map((d) => {
        if (!d || typeof d !== 'object') return d;
        const spec = specs.get(d.type);
        if (!spec) return d;
        const x = { scene: null, ...d };
        for (const [k, f] of Object.entries(spec.fields || {})) if (x[k] === undefined && f.nullable) x[k] = null;
        // Harmless persistence defaults: their omission should not trigger another LLM call.
        if (d.type === 'person.new' && x.desc === undefined) x.desc = [];
        // 4.3.0-c.6.6.53 (live 23.10.2026 20:56: the repair of a Dungeon entry was right but for role ["camp man"], and
        // the whole entry was refused): a person's free words given as a list of words are those words, joined
        if (d.type === 'person.new') for (const k of ['role', 'armed']) if (Array.isArray(x[k]) && x[k].length && x[k].every((w) => typeof w === 'string')) x[k] = x[k].join(', ');
        if (d.type === 'creature.new') {
            if (x.desc === undefined) x.desc = [];
            if (x.count === undefined) x.count = 1;
        }
        if (d.type === 'memory' && x.who === undefined) x.who = [];
        // Build .142: a left-out currency_quote of pricing/money is null; an offer line's phase, condition and pricing
        // left out are null (unclear/unknown – never firm)
        if (x.pricing && typeof x.pricing === 'object') x.pricing = totalOnly(softWords(x.pricing), d.type === 'bid' && (d.lines || []).length === 1 && d.lines[0]?.qty === 1, x);
        if (x.money && typeof x.money === 'object') x.money = softWords(x.money);
        if (d.type === 'offer' && Array.isArray(x.lines)) x.lines = x.lines.map((l) => {
            if (!l || typeof l !== 'object') return l;
            const y = { ...l, phase: l.phase === undefined ? null : l.phase, condition: l.condition === undefined ? null : l.condition };
            y.pricing = l.pricing === undefined ? null : (l.pricing && typeof l.pricing === 'object' ? totalOnly(softWords(l.pricing), l.qty === 1, y) : l.pricing);
            return y;
        });
        // Patch 3: an offer line's words for its price may be left out like a |null field
        if (d.type === 'offer' && Array.isArray(x.lines)) x.lines = x.lines.map((l) => (l && typeof l === 'object' ? { ...l, ...(l.said === undefined ? { said: null } : {}), ...(l.effect === undefined ? { effect: null } : {}), teaches: softTeaches(l.teaches), equipment: l.equipment ?? null, base:l.base ?? null, quality:l.quality ?? null } : l));
        // Patch 9C-2b: the fields of a teaches the reply does not state are null
        if (d.type === 'object.new') x.teaches = softTeaches(x.teaches);
        return x;
    }) : value.deltas;
    return { scene: null, ...value, expected: value.expected && typeof value.expected === 'object' ? value.expected : {}, deltas };
}

/** Build .138: a coin.gift that is the price of things Alaric sells now, with no bid of that buyer in the same answer. */
function saleProceeds(state, value, d) {
    if (d.repeat_of != null || d.relation === 'recount' || typeof d.from !== 'string' || state.entities[d.from]?.kind !== 'npc') return false;
    const bids = (value.deltas || []).filter((x) => x?.type === 'bid' && x.buyer === d.from);
    const sold = Object.values(value.expected || {}).some((e) => e && typeof e === 'object' && e.sold === true);
    // Build .142 (§7.2): reported as proceeds of a sale, the sale needs its bid (the trade pays, not the gift)
    if (d.relation === 'trade_settlement') return sold && !bids.length;
    const why = normText(`${d.why || ''}`);
    if (!/\b(?:sale|sold|sells?|selling|price|proceeds|payment for|paid for|pays? for|buys?|bought)\b/.test(why) || /\b(?:thanks|thank|tip|bonus|gift|extra|reward|wage|wages)\b/.test(why)) return false;
    const bidFor = new Set(bids.flatMap((x) => (x.lines || []).map((l) => l.object)));
    const held = Object.values(state.objects || {}).filter((o) => o.holder?.entity === 'pc');
    const words = (t) => normText(t).split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const named = held.filter((o) => { const n = words(o.name || ''); return n.length && n.filter((w) => words(why).includes(w)).length >= Math.min(2, n.length); });
    // a hint for the repair only: the coin names held goods that no bid of this buyer covers
    if (named.length) return named.some((o) => !bidFor.has(o.id));
    return !bids.length && sold;
}

/** Local semantic diagnostics, also enforced by World against its actually reached state.
 * These are not malformed JSON; one repair may clarify them without losing independent information.
 */
export const localSceneDelta = d => !['time', 'arrive', 'overreach', 'place.reported', 'dungeon', 'area', 'guild.branch'].includes(d.type)
    && !(['person.new', 'creature.new'].includes(d.type) && d.present === false);
export function sceneIssues(value, startScene, state = null, content = null, explicitArrivals = false) {
    const sceneKey = ref => placeKey(state, ref, content);
    const issues = [];
    const ordered = (Array.isArray(value.deltas) ? value.deltas : []).map((d, i) => ({d, i})).filter(x => x.d && typeof x.d === 'object').sort((a, b) => a.d.seq - b.d.seq);
    const arrivals = ordered.filter(x => x.d.type === 'arrive');
    const last = arrivals.at(-1)?.d;
    if (explicitArrivals) for (const [seq, e] of Object.entries(value.expected || {})) {
        if (e?.arrived === true && !arrivals.some(x => sceneKey(x.d.at) === sceneKey(e.at)))
            issues.push({ index: -1, seq: Number(seq), why: `expected.${seq}.arrived:true requires a corresponding arrive delta in story order; expected and scene cannot move the player` });
    }
    const implicitMove = !last && Object.values(value.expected || {}).some(e => e?.arrived === true
        && sceneKey(e.at ?? value.scene) !== sceneKey(startScene));
    const implicit = implicitMove && ordered.some(x => localSceneDelta(x.d)
        && sceneKey(x.d.scene) === sceneKey(startScene));
    for (const {d, i} of ordered) {
        if (!localSceneDelta(d)) continue;
        // In an Expected-only move, explicit "here" does not identify either temporal scene.
        if ((d.scene === 'here' && implicitMove) || ((d.scene == null || d.scene === 'here')
            && ((last && d.seq < last.seq && sceneKey(last.at) !== sceneKey(startScene)) || implicit))) {
            issues.push({index: i, seq: d.seq, why: `$.deltas[${i}].scene: explicitly name this earlier scene before the later arrival; here/final scene does not establish chronology`});
            continue;
        }
        const at = sceneKey(d.scene ?? value.scene);
        if (!['person.new', 'creature.new', 'enter'].includes(d.type) || at === sceneKey(startScene)) continue;
        const prior = arrivals.some(x => x.d.seq < d.seq && sceneKey(x.d.at) === at);
        if (!prior && arrivals.some(x => x.d.seq > d.seq && sceneKey(x.d.at) === at))
            issues.push({index:i, seq:d.seq, why:`$.deltas[${i}]: arrival must come before this local introduction in the REPLY's order; correct scene and seq; remote sightings use present:false`});
    }
    return issues;
}

// Repair diagnostics only: never resolve an ID, change the report, or relax its schema.
function fieldRepairHint(error, d, i, ids = {}, spec) {
    const line = /\.lines\[(\d+)\]/.exec(error);
    const object = d.type === 'bid' && line && error.includes('.object:')
        ? { value: d.lines?.[Number(line[1])]?.object, path: `$.deltas[${i}].lines[${line[1]}].object` }
        : Object.entries(spec?.fields || {}).filter(([key, field]) => field.ref === 'object' && error.includes(`.${key}:`))
            .map(([key]) => ({ value: d[key], path: `$.deltas[${i}].${key}` }))[0];
    if (typeof object?.value === 'string' && !(ids.objects || []).includes(object.value)) {
        const known = [...new Set(ids.objects || [])];
        // Prefix similarity orders suggestions only. Every candidate still requires exact reference/holder checks.
        const near = known.filter(id => id.startsWith(object.value));
        const ordered = [...near, ...known.filter(id => !near.includes(id))];
        const shown = [];
        for (const id of ordered) {
            if (shown.length === 12 || JSON.stringify([...shown, id]).length > 1600) break;
            shown.push(id); // never truncate a candidate ID or conceal an encounter suffix
        }
        return ` ${object.path}: invalid object ID ${JSON.stringify(object.value).slice(0, 200)}; copy an exact current CATALOG ID. Candidates${near.length > 1 ? ' include multiple matching identities' : ''}: ${JSON.stringify(shown)}${shown.length < known.length ? ' (others omitted; consult CATALOG)' : ''}. Do not guess an encounter suffix or merge objects; select the actual object. For a genuinely new object created earlier in this reply, use the existing {"new":"exact name"} reference, never an invented obj.* ID. Catalog membership alone does not establish PC ownership or quantity.`;
    }
    if (error.includes('.pricing:') && (d.type === 'bid' || (d.type === 'offer' && line))) {
        const item = d.type === 'bid' ? d : d.lines?.[Number(line[1])];
        if (item?.pricing?.basis === 'unknown') {
            const extra = Object.keys(item.pricing).filter(key => key !== 'basis');
            if (extra.length) return ` $.deltas[${i}]${d.type === 'offer' ? `.lines[${line[1]}]` : ''}.pricing: basis unknown permits only basis; remove forbidden fields ${JSON.stringify(extra).slice(0, 200)}. Keep {"basis":"unknown"}; do not invent a total or binding commitment. Preserve independent valid lines.`;
        }
    }
    return '';
}

export function parseExtraction(answer, vocab, ids, expectedKeys, { sceneRequired = false, startScene = null, state = null, content = null, explicitArrivals = sceneRequired, reply = null } = {}) {
    const parsed = extractJsonObject(answer);
    const { error, raw } = parsed;
    const value = state ? scopedPlaces(normalizeSoftFields(parsed.value, vocab), state) : normalizeSoftFields(parsed.value, vocab);
    const want = Object.keys(expectedKeys || {});
    if (!value) return { value: null, valid: false, complete: false, errors: [error || 'no JSON object'], missing: want, raw: false };
    const exp = value && typeof value.expected === 'object' && value.expected ? value.expected : {};
    // who came along may be left out of an arrival answer, like a |null delta field
    for (const [k, t] of Object.entries(expectedKeys || {})) if (t === 'go' && exp[k] && typeof exp[k] === 'object' && exp[k].with === undefined) exp[k].with = null;
    const missing = want.filter((k) => !exp[k] || typeof exp[k] !== 'object');
    // A missing expected answer may remain incomplete, but a schema-valid partial extraction is still useful state.
    const schema = deltaSchema(vocab, ids, Object.fromEntries(Object.entries(expectedKeys || {}).filter(([k]) => !missing.includes(k))));
    const clean = missing.length ? { ...value, expected: Object.fromEntries(Object.entries(exp).filter(([k]) => !missing.includes(k))) } : value;
    const errors = validate(clean, schema);
    const semanticIssues = [];
    let placeHintAdded = false;
    for (const [errorIndex,error] of [...errors].entries()) {
        const match = /^\$\.deltas\[(\d+)\]/.exec(error);
        const d = match ? value.deltas[Number(match[1])] : null;
        const spec = vocab.deltas.find(x => x.type === d?.type);
        if (d) errors[errorIndex] += fieldRepairHint(error, d, Number(match[1]), ids, spec);
        const fields = spec ? Object.entries(spec.fields).filter(([key, field]) => field.ref === 'place' && error.includes(`.${key}:`)).map(([key]) => key) : [];
        if (/^\$\.scene:/.test(error) || error.includes('.scene:') || fields.length) {
            if (placeHintAdded) continue;
            placeHintAdded = true;
            errors[errorIndex] += `; Place reference at ${match ? `deltas[${match[1]}].${fields[0] || 'scene'}` : 'scene'}: use a known place id or {"new":{"name":"exact name","kind":"interior","parent":"known parent id"}}; a new parent uses the same full shape. No {"new":"name"} shorthand. Preserve already valid scene and expected fields; never invent an arrival.`;
        }
    }
    let stepAt = startScene;
    const entered = new Map();
    const present = new Set(state?.scene?.present || []), introduced = new Set();
    if (!errors.length && sceneRequired && state?.meta?.ruleset >= 2) for (const { d, i } of value.deltas.map((d, i) => ({ d, i })).sort((a, b) => a.d.seq - b.d.seq)) {
        if (d?.type === 'arrive') {
            stepAt = placeKey(state, d.at, content);
            present.clear();
            for (const id of d.with || []) present.add(id);
        }
        // A prior local enter may explain the reintroduction. World still validates that event.
        if (d?.type === 'enter' && state.entities[d.who]?.kind === 'npc'
            && placeKey(state, d.scene ?? value.scene, content) === stepAt) {
            entered.set(d.who, stepAt);
            present.add(d.who);
        }
        if (d?.type === 'leave') present.delete(d.who);
        if (d?.type === 'person.new' && d.present !== false) introduced.add(d.ref);
        // .146: an arrival resets co-presence. A merchant report cannot silently restore it or invent an id.
        // Ask the existing bounded repair for the actual encounter, never synthesize enter or authorize travel.
        if (d?.type === 'offer' || d?.type === 'bid') {
            const field = d.type === 'offer' ? 'seller' : 'buyer', id = d[field];
            if (!introduced.has(id) && ((state.entities[id]?.kind === 'npc' && !present.has(id))
                || (typeof id === 'string' && id.startsWith('npc.') && !state.entities[id])))
                semanticIssues.push({ index: i, seq: d.seq, why: `$.deltas[${i}].${field}: counterparty ${id} is not established as present at this step. Copy the exact known person id from the CATALOG. Only if this REPLY shows that person actually meeting/trading here, report enter with its reply evidence before this ${d.type}; a genuinely new person needs person.new first. Otherwise omit the local trade. Never infer presence from an offer, remembered workplace or the PC's arrival alone.` });
        }
        if (d?.type === 'offer' && saleOfferLines(state, d.seller, d.lines || []).length)
            semanticIssues.push({index:i, seq:d.seq, why:`$.deltas[${i}]: these are current PC sale goods; use bid with buyer, held object ids and price_cp, not offer/seller`});
        // Build .138 (batch 20 crystal shard T26–T32, seven plates T58): the buyer's coin for things Alaric sells, reported
        // as coin.gift without the buyer's bid, is never paid; the existing repair asks for the bid. Nothing is converted:
        // a separate thanks or tip stays a gift, and a recount (repeat_of) stays a recount.
        if (d?.type === 'coin.gift' && saleProceeds(state, value, d))
            semanticIssues.push({ index: i, seq: d.seq, why: `$.deltas[${i}]: this coin pays for goods Alaric sells; report the buyer's price as bid (buyer, his held object ids and units, price_cp, phase, pricing), and give this coin relation "trade_settlement". A sale pays only through that bid; keep coin.gift relation "independent" only for a separate gift or thanks` });
        // Build .142 (§4.4): a finance report without its phase, pricing or relation is unclear, never firm or paid;
        // the existing bounded repair is asked once for the missing meaning
        if (d?.type === 'bid' || d?.type === 'offer') {
            const items = d.type === 'bid' ? [d] : (Array.isArray(d.lines) ? d.lines : []);
            items.forEach((x, k) => {
                if (!x || typeof x !== 'object') return;
                const where = d.type === 'bid' ? `$.deltas[${i}]` : `$.deltas[${i}].lines[${k}]`;
                const gear = d.type === 'offer' && (x.base != null || x.equipment === true);
                if (!gear && (!x.said || (reply && findQuote(reply, x.said).state !== 'found')))
                    semanticIssues.push({ index: i, seq: d.seq, why: `${where}.said: provide the exact complete commercial clause from this reply; without its own located action anchor the price stays unverified` });
                if (reply && !gear && x.said) {
                    const anchor = findQuote(reply, x.said);
                    const quotes = [x.pricing?.quote];
                    if (anchor.state === 'found' && quotes.some(q=>q && findQuote(reply,q,anchor).state === 'missing'))
                        semanticIssues.push({ index: i, seq: d.seq, why: `${where}.pricing: every money quote must belong to this same said, not another sentence or purse` });
                }
                if (x.phase == null) semanticIssues.push({ index: i, seq: d.seq, why: `${where}.phase: say whether this price binds now ("firm"), waits for something ("conditional" with condition) or is "unclear"` });
                else if (x.phase === 'firm' && x.condition) semanticIssues.push({ index: i, seq: d.seq, why: `${where}: "firm" with a condition; a price that waits for "${String(x.condition).slice(0, 40)}" is "conditional"` });
                if (!gear && Number.isInteger(x.price_cp) && x.price_cp > 0 && (!x.pricing || x.pricing.basis === 'unknown') && x.phase === 'firm')
                    semanticIssues.push({ index: i, seq: d.seq, why: `${where}.pricing: a firm price needs the reply's one total for it (basis total with its money words); a price per piece for several pieces or part prices without their total are basis "unknown" with phase "unclear"` });
                if (x.phase === 'firm' && !x.condition && reply && typeof x.said === 'string') {
                    const at = findQuote(reply, x.said);
                    const word = at.state === 'found' ? openConditionNear(reply, at.start, at.end) : null;
                    if (word) semanticIssues.push({ index: i, seq: d.seq, why: `${where}: the reply names an open condition next to this price ("${word}"); "firm" only if the price binds now regardless, else "conditional" with condition` });
                }
            });
        }
        if (d?.type === 'coin.gift' && !privateQuestsOf(state)) {
            const anchor = reply && d.said ? findQuote(reply,d.said) : null;
            if (!d.said || (reply && (anchor?.state !== 'found' || (d.money?.quote && findQuote(reply,d.money.quote,anchor).state === 'missing'))))
                semanticIssues.push({ index:i, seq:d.seq, why:`$.deltas[${i}].said: quote the complete actual handover with its own money; no amount from elsewhere in the reply` });
            if (d.phase == null || d.relation == null) semanticIssues.push({ index: i, seq: d.seq, why: `$.deltas[${i}]: say phase ("transferred" only for coin handed over now) and relation ("independent", "trade_settlement" or "recount")` });
            else if (d.phase === 'transferred' && !d.money) semanticIssues.push({ index: i, seq: d.seq, why: `$.deltas[${i}].money: quote the exact words of the coin handed over, with the full amount` });
        }
        // Package C (.132): population and life stage of a new creature, at the place of its event (a remote sighting:
        // the place its scene names, else none), by the rule World enforces (src/v4/population.js)
        if (d?.type === 'creature.new') {
            const named = d.scene != null && d.scene !== 'here' ? placeKey(state, d.scene, content) : null;
            const at = d.present === false ? named : named || stepAt;
            // a place this report creates is validated at its known parent (its own population cannot exist yet)
            const parent = typeof at === 'string' && at.startsWith('[') ? (() => { try { return JSON.parse(at)[2]; } catch { return null; } })() : null;
            const c = creatureContract(state, content, state.places[at] ? at : state.places[parent] ? parent : null, d);
            if (c.why) semanticIssues.push({ index: i, seq: d.seq, why: `$.deltas[${i}].${c.why}` });
        }
        if (d?.type === 'person.new' && d.present !== false) {
            const exact = Object.values(state.entities).filter(e => e.kind === 'npc' && d.name && normText(e.name || e.known_name || '') === normText(d.name));
            const known = state.entities[d.ref] || (exact.length === 1 ? exact[0] : null);
            if (known?.kind === 'npc' && !state.scene.present.includes(known.id) && known.at !== stepAt && entered.get(known.id) !== stepAt)
                semanticIssues.push({index:i, seq:d.seq, why:`$.deltas[${i}]: ${known.id} is known, last at ${known.at || 'an unknown place'}; preserve identity/history. Report an actual newly established local arrival as enter, otherwise present:false. Do not repeat an old predicament or infer presence merely from the PC’s arrival.`});
        }
    }
    // Schema errors must describe the supported link, never guess which object an invented id meant.
    for (const [i, d] of (Array.isArray(value.deltas) ? value.deltas : []).entries()) {
        if (typeof d?.object !== 'string' || (ids?.objects || []).includes(d.object)) continue;
        const names = value.deltas.filter(x => x?.type === 'object.new' && x.seq < d.seq && typeof x.name === 'string').map(x => x.name);
        if (names.length) errors.push(`$.deltas[${i}].object: unknown catalog id; object.new has no ref. Use {new:exact earlier name}, e.g. ${JSON.stringify({ new: names[0] })}; never invent an obj.* id`);
    }
    if (sceneRequired && value.scene == null && (Object.values(expectedKeys || {}).includes('go') || (Array.isArray(value.deltas) && value.deltas.some(d => !['time', 'overreach', 'place.reported', 'dungeon', 'area', 'guild.branch'].includes(d?.type))))) errors.push('$.scene: actual narrative setting required for world changes');
    return { value, issues: [...semanticIssues, ...(sceneRequired && startScene ? sceneIssues(value, startScene, state, content, explicitArrivals) : [])], valid: errors.length === 0, complete: missing.length === 0, errors: [...errors.slice(0, 8), ...missing.map((k) => `expected key "${k}" not answered`)], missing, raw };
}
