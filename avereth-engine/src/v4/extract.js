import { tokenize } from '../util.js';
import { movementEvidence, visualDetail } from './narration_evidence.js';
import { thresholdSlot } from './living.js';
import { placeKey } from './place_refs.js';
import { newPlaceScope, reportedEndpoints } from './movement.js';
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
import { findQuote } from './finance_evidence.js';
import { purchaseLines } from './trade.js';


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

export const EXTRACTOR_VERSION = 'extract-5.26';
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
    // NPC E2-A: met (who of KNOWN AT the reply shows there, with its own words) and handled_by (the Guild person the
    // reply shows handling a desk step) are checked by World; a missing or malformed one is null (never a repair)
    go: (refs, supplied = {}) => O({ arrived:B(),
        ...(Object.hasOwn(supplied,'at') ? {at:N(refs.place)} : {}),
        ...(Object.hasOwn(supplied,'with') ? {with:N(A(S()))} : {}),
        ...(Object.hasOwn(supplied,'met') ? {met:N(A(O({who:S(),evidence:S()})))} : {}),
    }),
    desk: () => O({ handled_by: N(S()) }),
    approach: () => O({ standpoint: N(S()) }),
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
export function deltaSchema(vocab, ids = {}, expectedKeys = {}, supplied = {}) {
    const refs = {
        place: placeRef(ids.places || []),
        quest: (ids.quests || []).length ? { anyOf: [E(ids.quests), O({ new: S() })] } : O({ new: S() }),
        object: (ids.objects || []).length ? { anyOf: [E(ids.objects), O({ new: S() })] } : O({ new: S() }),
        person: S(),
        scene: { anyOf: [E(['here']), placeRef(ids.places || [])] },
    };
    const expected = {};
    for (const [k, t] of Object.entries(expectedKeys)) expected[k] = (EXPECTED_SHAPES[t] || (() => O({ done: B() })))(refs, supplied[k]);
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
    'Report physical stops with arrive in story order. Local deltas without scene belong to the current stop, or the starting place before any arrival. Name scene only for a different location, including a remote sighting. In a Living Dungeon use the authorized section.',
    'SALES: Report an actual buyer price with bid (buyer, exact item ids and quantities, price, said). expected.sold is only a summary, never an independent payment. A current minimum-price instruction can accept a matching bid; a promise or appraisal is not an actual final bid.',
    'Trade evidence: said is required for every NEW financial claim, including each offer line and coin.gift; missing or unlocatable said leaves it unverified. pricing.quote/money.quote must occur inside its own said, never in unrelated narration. For offer/bid said copy one continuous clause from the party who actually offers, with the total, without ellipses. Report conditions only for prerequisites that must still be met before the offer binds. Explanations about resale or demand and the customer’s choice are compatible with a firm offer. Third-party price advice is fact/place.reported, not an offer or bid of the speaker. Price ranges, possible future prices and unaccepted discounts are not fixed prices. A price binds only as ONE total for exactly the line or the whole bid, in the reply\'s own words; a price per piece for several pieces, part prices without their sum or a count the reply leaves open is no binding price (pricing unknown, phase unclear). Never compute a total yourself. Never invent a seller commitment from a recommendation.',
    'string[] is always a JSON array, even when it contains only one value.',
    `place-ref is an exact known place id from the CATALOG, or {"new":{"name":"...","kind":"...","parent":...}}. For a new place, kind must be exactly one of: ${PLACE_KINDS.join(', ')}. Use settlement for a city, town, village or hamlet; site for a building, inn or Guild hall; interior for a room; wilderness for natural outdoor terrain.`,
    'AREA LEVELS: when an outdoor area’s danger is actually established, report area once with a fixed supported F window. Copy existing area/population levels from the catalog; never adapt to Alaric, overwrite them, or use a mere rumour. A local population’s body plan is authoritative over a free species-name guess. A newly reached local part keeps its genuine geographic parent; never infer a remote relationship merely to inherit levels.',
    'LOCAL HUNT EXPLORATION is an authorized continuation inside an existing habitat: a newly reached den, quarry hollow or other part keeps the stated habitat id as parent, not the realm. A separate journey does not inherit a population just because its species sounds similar. Arrive is still required.',
    'When the CATALOG already contains the place, quest or object, copy its id exactly. Never rewrite an id, invent another id for it, or substitute its title/name.',
    'quest-ref and object-ref mean the exact matching CATALOG id; use {"new":"..."} only when the thing is genuinely new and that reference type permits it.',
    'A real handover or return of an existing item uses object.move with its catalog ID at the transfer scene, even for a loan or a shorter spoken name. For a requested loan or gift set expected.taken true only on receipt and move that ID. For an offer alone omit the receipt or report false, and no move. Record voluntary receipt, actual quantity and holder; identify a different source for a second namesake. A TAKE boolean alone does not identify a loan. For a newly created object use object.new {name:"bread",holder:"npc.giver",...} then object.move {object:{new:"bread"},to:"pc",...}. object.new has no ref field. Never invent an obj.* id. The new-name reference must identify exactly one earlier created object; otherwise distinguish the actual objects by their established descriptions.',
    'In a multi-place reply use the existing per-delta scene explicitly for events before the last arrival. Example: enter known npc.giver at the starting place; create bread on that giver there; move {new:"bread"} to pc there; arrive at the authorized destination. present means co-presence at that step. Known return: enter with catalog ID/evidence. leave means the NPC departs, not Alaric.',
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
        EXTRACT_PLAIN_FORMAT,
    ].join('\n');
}

export const EXTRACT_PLAIN_FORMAT = 'Return only one JSON object, no prose before or after it, no code fences: {"scene": <optional place-ref>, "expected": {<every key asked>}, "deltas": [{"seq": 1, "type": "<delta>", <required fields; fields marked |null may be omitted when unknown>}]}.';

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
        'QUEST OUTCOME CHECK: Before answering, compare this reply with every active Guild contract\'s desired end state in the CATALOG. For contracts judged by story outcomes, if one is clearly achieved in this reply, quest.ready is required even when arrival/facts/memory are also reported; fact or memory alone is not enough.',
    ].join('\n');
}

/**
 * .185 (natural batch 13.11.2026, Rogue T41–T43: three answers in a row lost the envelope – expected answers "1"/"2"
 * at the top level, a delta without type and seq, own field names "price", "unit", "phase" on an offer – and the
 * repair named only the first eight violations): the one repair also gives the form it asks for, built from this
 * turn's expected keys, and per delta the fields it misses, the ones its type does not have and the ones it has.
 * Nothing is read differently: the schema and the number of repairs are unchanged.
 */
export function repairForm(vocab, expectedKeys, errors) {
    const shape = (t) => {
        const e = vocab.expected?.[t];
        return e ? `{${Object.entries(e.shape).map(([f, v]) => `"${f}": ${v}`).join(', ')}}` : '{"done": true|false}';
    };
    const keys = Object.entries(expectedKeys || {});
    const form = `{"scene": <optional place-ref>, "expected": {${keys.map(([k, t]) => `"${k}": ${shape(t)}`).join(', ')}}, "deltas": [{"seq": 1, "type": "<one listed delta type>", <only that type's fields>}]}`;
    const notes = [];
    const top = errors.map((e) => /^\$: unexpected property "([^"]+)"/.exec(e)?.[1]).filter(Boolean);
    const misplaced = top.filter((k) => keys.some(([x]) => x === k));
    if (misplaced.length) notes.push(`${misplaced.map((k) => `"${k}"`).join(', ')} ${misplaced.length > 1 ? 'are answers' : 'is an answer'} of "expected": put ${misplaced.length > 1 ? 'them' : 'it'} inside "expected", never at the top level`);
    const other = top.filter((k) => !misplaced.includes(k));
    if (other.length) notes.push(`the top level has only "scene", "expected" and "deltas" (not ${other.map((k) => `"${k}"`).join(', ')})`);
    for (const [k, type] of keys) {
        const miss = errors.map((e) => e.startsWith(`$.expected.${k}:`) && /missing required "([^"]+)"/.exec(e)?.[1]).filter(Boolean);
        const extra = errors.map((e) => e.startsWith(`$.expected.${k}:`) && /unexpected property "([^"]+)"/.exec(e)?.[1]).filter(Boolean);
        if (miss.length || extra.length) notes.push(`expected "${k}" (${type}) is ${shape(type)}${extra.length ? `, without ${extra.map((f) => `"${f}"`).join(', ')}` : ''}`);
    }
    const specs = new Map((vocab.deltas || []).map((d) => [d.type, d]));
    const byDelta = new Map();
    for (const e of errors) {
        const m = /^\$\.deltas\[(\d+)\](?: \(([^)]+)\))?:\s*:?\s*(.*)$/.exec(e);
        if (!m) continue;
        const d = byDelta.get(m[1]) || { type: m[2] || null, missing: [], unknown: [], typeless: false };
        const miss = /missing required "([^"]+)"/.exec(m[3]), extra = /unexpected property "([^"]+)"/.exec(m[3]);
        if (miss) d.missing.push(miss[1]); else if (extra) d.unknown.push(extra[1]); else if (/needs a "type"/.test(m[3])) d.typeless = true;
        byDelta.set(m[1], d);
    }
    for (const [i, d] of byDelta) {
        const spec = d.type && specs.get(d.type);
        if (d.typeless) { notes.push(`deltas[${i}] needs "seq" and "type" (one of the listed delta types), its fields beside them`); continue; }
        if (!spec || (!d.missing.length && !d.unknown.length)) continue;
        notes.push(`deltas[${i}] (${d.type})${d.missing.length ? ` lacks ${d.missing.map((f) => `"${f}"`).join(', ')}` : ''}${d.missing.length && d.unknown.length ? ';' : ''}${d.unknown.length ? ` has no field ${d.unknown.map((f) => `"${f}"`).join(', ')}` : ''}; the fields of ${d.type}: "seq", "type", ${Object.keys(spec.fields || {}).map((f) => `"${f}"`).join(', ')}`);
    }
    return ` Required form: ${form}.${notes.length ? ` To correct: ${notes.join('; ')}.` : ''} Keep what was valid; invent no field and no event.`;
}

export const COMPACT = 'Write compact single-line JSON. Keep every required key, expected action and established delta in order. On delta objects only, omit optional fields whose value is null.';

/** The messages of an extractor call, and of its one repair (the invalid answer and the errors appended). */
export function extractorRequest(vocab, { catalog, actions, player = null, expectedKeys, reply, startScene = null }, { previous = null, errors = null } = {}) {
    const system = extractorSystem(vocab);
    const user = extractorUser({ catalog, actions, player, expectedKeys, vocab, reply });
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    // Patch 8.1 (§9, live 21.10.2026 10:17: twice all 2,500 tokens went to deliberation and the answer was empty): an
    // empty answer is not repeated back; the one repair asks for the report at once, short, without deliberating
    if (previous !== null && errors && !String(previous).trim()) {
        messages.push({ role: 'user', content: 'Your previous answer was empty: it ran out of room before the JSON. Answer now with the JSON object alone, at once and short: report only what the reply plainly establishes, include every required expected key and all actual movements with chronological arrive deltas. A GO goal alone proves no arrival. Leave out uncertain claims; empty deltas are valid only when the reply establishes no changes. Do not deliberate.' });
    } else if (previous !== null && errors) {
        messages.push({ role: 'assistant', content: String(previous) }, { role: 'user', content: `Your answer was not valid: ${errors.slice(0, 8).join('; ')}. Answer again with only the corrected JSON object, nothing else.${repairForm(vocab, expectedKeys, errors)}` });
        if (errors.some(e => /Place reference|\.(?:at|scene):/.test(e))) messages.at(-1).content += ' Place references must be a known id or {"new":{"name":"exact name","kind":"interior","parent":"known id or full new-parent object"}}. Preserve already valid scene and expected fields. Correct only invalid references and actual story chronology; never invent travel.';
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
        // The Guild clerk's route note was reported with all object.new fields under "object".
        // Accept only that single unambiguous envelope. The usual schema still checks every field.
        const wrapped = d.object;
        const objectEnvelope = d.type === 'object.new' && Object.hasOwn(d, 'seq') && Object.keys(d).length === 3
            && wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped)
            && Object.keys(wrapped).every(k => Object.hasOwn(spec.fields || {}, k));
        const x = objectEnvelope ? { scene: null, seq: d.seq, type: d.type, ...wrapped } : { scene: null, ...d };
        for (const [k, f] of Object.entries(spec.fields || {})) if (x[k] === undefined && f.nullable) x[k] = null;
        if (d.type === 'arrive') for (const key of ['evidence','after']) {
            if (Object.hasOwn(spec.fields, key) && typeof x[key] !== 'string') x[key] = null;
        }
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
        formOnly(x, spec);
        return x;
    }) : value.deltas;
    if (Array.isArray(deltas)) softSeq(deltas);
    return { scene: null, ...value, expected: value.expected && typeof value.expected === 'object' ? value.expected : {}, deltas };
}

/**
 * Build .182 (P2-5, batch 12./13.11.2026 Rogue T38/T63): form that carries no meaning, read as the model's own
 * repair writes it, so that one such slip loses neither the whole answer nor a repair call. In the replay corpus
 * (b16–b19) eight first answers had one of these (desc as one string, leave with evidence), each was repaired to the
 * list or without the field, and in most the repaired delta was otherwise the same. Anything that could mean something
 * stays an error for the existing repair:
 * an extra aware on person.new or creature.new in any value (the repair writes it as an aware delta, and whether an
 * observer is "aware" or has no entry decides a later stealth check: checks.js), any other extra field, null in a field
 * that needs a value, a place given as {"new": "name"}.
 */
function formOnly(x, spec) {
    const fields = spec.fields || {};
    // a string[] field given as its one string is that one-element list ('string[] is always a JSON array')
    for (const [k, f] of Object.entries(fields)) if (f.array === 'string' && typeof x[k] === 'string' && x[k].trim()) x[k] = [x[k]];
    // the reply's words for a delta type that reads none (world and firewall read evidence only where it is a field)
    if (!('evidence' in fields) && Object.hasOwn(x, 'evidence') && (x.evidence === null || typeof x.evidence === 'string')) delete x.evidence;
    // an empty description or witness list said as null is the default an omitted one already gets
    if ((x.type === 'person.new' || x.type === 'creature.new') && x.desc === null) x.desc = [];
    if (x.type === 'memory' && x.who === null) x.who = [];
}

/**
 * Build .182 (P2-5): a seq written as its digits ("3") is that number when no other delta has it. A time delta without
 * seq (Rogue T38/T63) takes the next free number after the delta before it only where its place in story order is
 * beyond doubt: every other delta has an integer seq, they rise in the order written, and the number is free before the
 * next one ([1, 2, time, 4] → 3). With no free number ([1, 2, time, 3]) or any other delta without seq, nothing is
 * guessed: the existing repair asks for it.
 */
function softSeq(deltas) {
    const objects = deltas.filter((d) => d && typeof d === 'object');
    for (const d of objects) {
        if (typeof d.seq !== 'string' || !/^\s*\d+\s*$/.test(d.seq)) continue;
        const n = Number(d.seq);
        if (n >= 1 && !objects.some((y) => y !== d && (y.seq === n || String(y.seq).trim() === String(n)))) d.seq = n;
    }
    const missing = objects.filter((d) => d.seq === undefined);
    if (missing.length !== 1 || missing[0].type !== 'time') return;
    const others = objects.filter((d) => d !== missing[0]);
    if (!others.every((d) => Number.isInteger(d.seq)) || others.some((d, i) => i > 0 && d.seq <= others[i - 1].seq)) return;
    const i = objects.indexOf(missing[0]);
    const before = objects.slice(0, i).at(-1)?.seq ?? 0;
    const after = objects.slice(i + 1)[0]?.seq ?? Infinity;
    if (before + 1 < after) missing[0].seq = before + 1;
}

export const localSceneDelta = d => !['time', 'arrive', 'overreach', 'place.reported', 'dungeon', 'area', 'guild.branch'].includes(d.type)
    && !(['person.new', 'creature.new'].includes(d.type) && d.present === false);
// Keep the extractor's sequence numbers as audit and dependency identities. For a single visit,
// explicitly located observations immediately preceding their own arrival belong after that arrival.
// A time change, a transaction, an unnamed scene or a second visit makes that inference ambiguous.
const arrivalObservations = new Set(['enter', 'person.new', 'fact', 'learn', 'memory']);
export function sceneSteps(deltas, start, state, content, explicit) {
    const steps = (Array.isArray(deltas) ? deltas : []).map((d, i) => ({d, i}))
        .filter(x => x.d && typeof x.d === 'object').sort((a, b) => (a.d.seq ?? 0) - (b.d.seq ?? 0));
    if (!explicit || !steps.some(x => x.d.type === 'arrive') ||
        steps.some((x, i) => !Number.isInteger(x.d.seq) || (i > 0 && steps[i - 1].d.seq === x.d.seq))) return steps;

    const visits = new Map();
    for (const {d} of steps) if (d.type === 'arrive') {
        const at = placeKey(state, d.at, content);
        visits.set(at, (visits.get(at) || 0) + 1);
    }
    for (let i = 1; i < steps.length; i++) {
        const arrival = steps[i].d;
        if (arrival.type !== 'arrive') continue;
        const at = placeKey(state, arrival.at, content);
        if (!at || at === start || visits.get(at) !== 1) continue;
        let first = i;
        while (first > 0) {
            const d = steps[first - 1].d;
            if (!arrivalObservations.has(d.type) || d.present === false || d.scene == null || d.scene === 'here'
                || placeKey(state, d.scene, content) !== at) break;
            first--;
        }
        if (first < i) {
            const [step] = steps.splice(i, 1);
            steps.splice(first, 0, step);
        }
    }
    return steps;
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

// User05 I34: an identical full reference is already supplied by both the expected GO and arrival.
// Only resolve that repeated name; no inferred parent/kind, no extra arrival, no multi-stop inference.
export function resolveRepeatedScene(value, ids, expectedKeys) {
    const short=value?.scene;
    if(!short || Object.keys(short).length!==1 || typeof short.new!=='string')return value;
    const keys=Object.keys(expectedKeys || {});
    if(keys.length!==1 || expectedKeys[keys[0]]!=='go')return value;
    const expected=value.expected?.[keys[0]],arrivals=Array.isArray(value.deltas)?value.deltas.filter(d=>d?.type==='arrive'):[];
    if(expected?.arrived!==true || arrivals.length!==1)return value;
    const full=arrivals[0].at;
    if(full?.new?.name!==short.new || (expected.at!=null && JSON.stringify(full)!==JSON.stringify(expected.at)) || validate(full,placeRef(ids.places || [])).length)return value;
    return {...value,scene:JSON.parse(JSON.stringify(full))};
}

// JSON.parse keeps the last of two equal member names. Check the original object before
// adopting a misplaced list, including escaped names and duplicates inside an evidence record.
function deltaEnvelopeKeys(source) {
    const scopes = [];
    let duplicate = false, lists = 0;
    for (const [token, colon] of source.matchAll(/"(?:\\.|[^"\\])*"\s*(:)?|[{}]/gs)) {
        if (token === '{') scopes.push(new Set());
        else if (token === '}') scopes.pop();
        else if (colon && scopes.length) {
            const key = JSON.parse(token.slice(0, -1));
            const scope = scopes.at(-1);
            if (scope.has(key)) duplicate = true;
            scope.add(key);
            if (key === 'deltas') lists++;
        }
    }
    return { duplicate, lists };
}

function readDeltaEnvelope(answer) {
    const parsed = extractJsonObject(answer);
    const { value } = parsed;
    const original = String(answer ?? '').trim();
    const nested = Object.hasOwn(value?.expected || {}, 'deltas');
    // Ordinary reports use the existing reader. A second list (even one hidden by
    // last-key-wins) needs a repair. Quoted evidence can itself contain the word deltas.
    if (value && !nested && original.indexOf('deltas') === original.lastIndexOf('deltas') && !original.includes('\\u')) return parsed;

    // All seven archived reports had a complete expected object and delta list, but
    // lacked the final root brace. Never complete a truncated list or rewrite quoted evidence here.
    // Admit only one payload. The shared reader may discard prose or replace punctuation
    // even inside evidence. Read the original text for this lossless move.
    const body = original.replace(/^<think>[\s\S]*?<\/think>\s*/i, '');
    const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(body);
    const source = fence ? fence[1].trim() : body;
    let keys;
    try { keys = deltaEnvelopeKeys(source); }
    catch { /* An invalid string escape cannot establish unique member names. */ }
    if (keys?.lists > 1) return { ...parsed, value: null, error: 'Competing deltas fields. Supply a single root deltas array.' };
    let intact;
    try { intact = JSON.parse(source); }
    catch {
        try { intact = JSON.parse(source + '}'); }
        catch { return nested ? { ...parsed, value: null, error: 'Incomplete or ambiguous expected.deltas envelope.' } : parsed; }
    }
    if (!Object.hasOwn(intact?.expected || {}, 'deltas')) return parsed;
    const { deltas, ...steps } = intact.expected;
    if (Object.hasOwn(intact, 'deltas') || !Array.isArray(deltas) || !keys || keys.duplicate || Object.values(steps).some(Array.isArray))
        return { ...parsed, value: null, error: 'Ambiguous expected.deltas envelope. Supply a single root deltas array.' };
    return { ...parsed, value: { ...intact, expected: steps, deltas } };
}

export function parseExtraction(answer, vocab, ids, expectedKeys, { sceneRequired = false, startScene = null, state = null, content = null, explicitArrivals = sceneRequired, reply = null, previous = null } = {}) {
    const parsed = readDeltaEnvelope(answer);
    const { error, raw } = parsed;
    const resolved=resolveRepeatedScene(parsed.value,ids,expectedKeys);
    const value = state ? newPlaceScope(normalizeSoftFields(resolved, vocab), state) : normalizeSoftFields(resolved, vocab);
    const want = Object.keys(expectedKeys || {});
    if (!value) return { value: null, valid: false, complete: false, errors: [error || 'no JSON object'], missing: want, raw: false };
    // .190 (stage 5): an expected key nobody asked for (no step of this turn has it) is left out, empty or not: it never
    // spoils the report and never stands for a step or an arrival
    if (value && value.expected && typeof value.expected === 'object' && !Array.isArray(value.expected)) {
        const asked = new Set(Object.keys(expectedKeys || {}));
        const unasked = Object.keys(value.expected).filter((k) => !asked.has(k));
        if (unasked.length) value.expected = Object.fromEntries(Object.entries(value.expected).filter(([k]) => asked.has(k)));
    }
    const exp = value && typeof value.expected === 'object' && value.expected ? value.expected : {};
    // A voluntary receipt is opt-in. Its omission confirms nothing and must not cost a repair
    // or drop unrelated world facts. Other TAKE steps and all other expected types keep their contract.
    for (const pending of state?.last?.outcome?.conditionals || []) {
        if (pending.kind === 'receive' && expectedKeys?.[pending.seq] === 'take' && exp[pending.seq] === undefined) {
            exp[pending.seq] = { taken:false };
        }
    }
    // NPC E2-A: met and handled_by are optional evidence, never a reason for a repair call: a missing or malformed one
    // is null (a malformed item of met is left out), a desk step the answer leaves out is answered "no handler shown"
    const pair = (x) => x && typeof x === 'object' && !Array.isArray(x) && typeof x.who === 'string' && typeof x.evidence === 'string' ? { who: x.who, evidence: x.evidence } : null;
    for (const [k, t] of Object.entries(expectedKeys || {})) {
        if (t === 'go' && exp[k] && Object.hasOwn(exp[k], 'met')) exp[k].met = Array.isArray(exp[k].met) && exp[k].met.map(pair).filter(Boolean).length ? exp[k].met.map(pair).filter(Boolean) : null;
        if (t === 'desk') {
            const ref = exp[k]?.handled_by;
            exp[k] = {handled_by: typeof ref === 'string' ? ref : typeof ref?.who === 'string' ? ref.who : null};
        }
    }
    // A new dungeon section already has an engine ID in the authorized step. Its
    // name becomes a place reference in this report only alongside its reported arrival.
    for (const go of state?.last?.outcome?.auth?.gos || []) {
        const section = go.section, at = exp[go.seq]?.at || section?.id;
        if (!section || !exp[go.seq]?.arrived || expectedKeys?.[go.seq] !== 'go') continue;
        if (at !== section.id && !(at?.new?.kind === 'interior' && at.new.parent === section.root)) continue;
        if (Array.isArray(value.deltas) && value.deltas.some(d =>
            d?.type === 'arrive' && placeKey(state, d.at, content) === placeKey(state, at, content))) {
            ids = {...ids, places:[...(ids.places || []), section.id]};
        }
    }
    const entrance = thresholdSlot(state);
    if (entrance && Array.isArray(value.deltas)) {
        for (const delta of value.deltas) {
            if (delta?.type === 'creature.new' && delta.present === true && delta.across &&
                delta.ref === entrance.ref && delta.count === entrance.count && !Object.hasOwn(delta,'anchor')) {
                delta.anchor = entrance.anchor;
            }
        }
    }
    const missing = want.filter((k) => !exp[k] || typeof exp[k] !== 'object');
    // A missing expected answer may remain incomplete, but a schema-valid partial extraction is still useful state.
    const schema = deltaSchema(vocab, ids, Object.fromEntries(Object.entries(expectedKeys || {}).filter(([k]) => !missing.includes(k))), exp);
    const clean = missing.length ? { ...value, expected: Object.fromEntries(Object.entries(exp).filter(([k]) => !missing.includes(k))) } : value;
    const errors = [];
    const invalid = new Map();
    const violations = validate(clean, schema);
    const diagnostics = [];
    for (const reason of violations) {
        const entry = /^\$\.deltas\[(\d+)\]/.exec(reason);
        const step = /^\$\.expected\.(\d+)\b/.exec(reason);
        if (entry) {
            const index = Number(entry[1]), delta = value.deltas[index];
            const why = reason + (delta ? fieldRepairHint(reason,delta,index,ids,vocab.deltas.find(x => x.type === delta.type)) : '');
            if (!invalid.has(index)) invalid.set(index,{delta, why});
            diagnostics.push(why);
        } else if (step) {
            diagnostics.push(reason);
            if (!missing.includes(step[1])) missing.push(step[1]);
            delete exp[step[1]];
        } else { errors.push(reason); diagnostics.push(reason); }
    }
    value.expected = exp;
    if (invalid.size) value.deltas = value.deltas.filter((_,index) => !invalid.has(index));
    // Optional receipts participate in strict validation. Keep legacy arrival/event payloads identical afterwards.
    if (!errors.length) for (const d of value.deltas) if (d.type === 'arrive') {
        if (d.evidence === null) delete d.evidence;
        if (d.after === null) delete d.after;
    }
    if (!errors.length) for (const d of value.deltas) if (d.type === 'thread') {
        if (d.recall_at === null) delete d.recall_at;
        if (d.player_words === null) delete d.player_words;
    }
    if (!errors.length) for (const d of value.deltas) if (d.type === 'creature.new' && d.across === null) delete d.across;
    const semanticIssues = [];
    let stepAt = startScene;
    if (!errors.length && sceneRequired && state?.meta?.ruleset >= 2) for (const d of [...value.deltas].sort((a,b) => a.seq-b.seq)) {
        if (d.type === 'arrive') stepAt = placeKey(state,d.at,content);
        // The local stealth action needs actual observers. Keep the existing threshold
        // receipt repair when dropping this sighting would also drop the booked check.
        const approach = state.last?.outcome?.auth?.approach;
        if (approach?.stealth && expectedKeys?.[approach.seq] === 'approach' && entrance &&
            d.type === 'creature.new' && d.ref === entrance.ref && d.present &&
            (!d.across || (reply && (findQuote(reply,d.across).state !== 'found' || (d.desc || []).some(label => !visualDetail(reply,label)))))) {
            semanticIssues.push({seq:approach.seq,why:'For the booked stealth approach, report the actual threshold observers with across and individual desc copied from the reply. If only heard, report a clue.'});
        }
        // Package C (.132): population and life stage of a new creature, at the place of its event (a remote sighting:
        // the place its scene names, else none), by the rule World enforces (src/v4/population.js)
        if (d?.type === 'creature.new') {
            const named = d.scene != null && d.scene !== 'here' ? placeKey(state, d.scene, content) : null;
            const at = d.present === false ? named : named || stepAt;
            // a place this report creates is validated at its known parent (its own population cannot exist yet)
            const parent = typeof at === 'string' && at.startsWith('[') ? (() => { try { return JSON.parse(at)[2]; } catch { return null; } })() : null;
            // A repair of the same reported animal must not erase an asserted
            // membership just to pass validation. Revalidate it at the reported site.
            if (d.population === 'independent' && previous) {
                const prior = previous.deltas.filter(x => x.type === d.type && x.ref === d.ref &&
                    x.species === d.species && x.anchor === d.anchor && x.present === d.present);
                if (prior.length === 1 && prior[0].population &&
                    (prior[0].population === d.species || state.places[prior[0].population]?.population))
                    d.population = prior[0].population;
            }
            const c = creatureContract(state, content, state.places[at] ? at : state.places[parent] ? parent : null, d);
            if (!c.why && c.population) d.population = c.population;
        }
    }
    if (!errors.length && sceneRequired) {
        const arrivals = value.deltas.filter(d => d.type === 'arrive' && !d.forced_by);
        const ends = state ? reportedEndpoints(value,state,content,[...invalid.values()]) : new Map();
        for (const [key,type] of Object.entries(expectedKeys || {})) {
            if (type !== 'go') continue;
            const g = state?.last?.outcome?.auth?.gos?.find(g => String(g.seq) === key) || {seq:key};
            const end = ends.get(key) || exp[key]?.at;
            const section = g.section;
            const match = arrivals.some(d => (end && placeKey(state,end,content) === placeKey(state,d.at,content))
                || (section && d.at?.new?.kind === 'interior' && d.at.new.parent === section.root));
            // A free goal involving a known contact can have competing place identities.
            // Preserve the old continuity repair only when it can change that booked endpoint.
            if (match && !g.to && end?.new && g.newName) {
                const goalWords = tokenize(g.newName);
                for (const d of value.deltas) {
                    if (d.type !== 'person.new' || d.present === false || placeKey(state,d.at,content) !== placeKey(state,end,content)) continue;
                    const known = state.entities[d.ref];
                    const name = tokenize(d.name);
                    if (known?.kind === 'npc' && known.at && !state.scene.present.includes(known.id) &&
                        name.length && name.every(word => goalWords.includes(word)) &&
                        !value.deltas.some(x => x.type === 'enter' && x.who === known.id)) {
                        semanticIssues.push({seq:g.seq, why:`Check the GO destination against the established site of ${known.id} at ${known.at}. Preserve the known contact or report their actual arrival at the new site.`});
                        break;
                    }
                }
            }
            if (exp[g.seq]?.arrived === true && !match)
                semanticIssues.push({seq:g.seq,why:`GO ${g.seq} reports its objective reached without its corresponding arrive delta. Report the actual stop or correct the objective answer.`});
            else if (!arrivals.length && exp[g.seq]?.arrived === false && reply && movementEvidence(reply) &&
                value.scene && placeKey(state,value.scene,content) !== startScene && value.scene !== 'here')
                semanticIssues.push({seq:g.seq,why:'The reply describes movement to another scene. Report its actual stop or confirm that no travel occurred.'});
        }
    }
    // .185 (Z3.1; natural batch 13.11.2026, Rogue T38: "four copper the pair" answered priced: true with no offer, the
    // stew could never be bought; Mage T24 the same for the bunk): a buy answered as priced, with no offer in the answer
    // and none open here for it, asks the one bounded repair for the seller's offer – or priced false. Nothing is made up
    if (state && Array.isArray(value?.deltas) && !value.deltas.some((d) => d?.type === 'offer')) {
        for (const [k, t] of Object.entries(expectedKeys || {})) {
            if (t !== 'buy' || value.expected?.[k]?.priced !== true) continue;
            const dec = (state.decisions || []).find((x) => x.kind === 'purchase' && String(x.seq) === String(k) && x.turn === state.turn);
            if (!dec || Object.values(state.offers || {}).some((o) => o.status === 'open' && !o.bid && o.at === state.scene?.at && purchaseLines(dec.what, o.lines || []).length)) continue;
            semanticIssues.push({ index: -1, seq: Number(k), why: `expected.${k}.priced is true, but no offer reports that price: if this reply has the seller name one binding total in coin for ${String(dec.what).slice(0, 60)}, report that offer (seller, lines with price_cp, said and pricing in the reply's own words); otherwise priced is false. Never make up an offer or a price` });
        }
    }
    return {value, rejected:[...invalid.values()], issues:semanticIssues, valid:!errors.length, complete:!missing.length,
        errors:[...diagnostics.slice(0,8), ...missing.map(k => `expected key "${k}" not answered or invalid`)], missing, raw};
}
