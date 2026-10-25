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

/** Preserve the historical wire vocabulary; new campaigns have only Guild quests. */
export function worldVocab(vocab, state) {
    if (privateQuestsOf(state)) return vocab;
    return { ...vocab, version: 'delta-1.6',
        rules: [...vocab.rules.filter(r => !r.startsWith('Paid work FOR an NPC')),
            'FREE HELP: NPC requests, help, agreements and offered wages are ordinary facts, promises, threads and memories. Never create private quests or job ids. Formal quest deltas concern only existing Guild contracts. Helping earns no automatic Quest XP or payout.',
            'coin.gift is an ACTUAL new handover now, including voluntary thanks, wages, advance or reward from any present NPC. No job or acceptance is required. Promises and conditional/future payments are facts/threads, not coin.gift. In said quote the exact current handover clause INCLUDING the amount and currency, never invent an amount. For a recount of a RECENT COIN HANDOVER set repeat_of to its existing id; it never pays twice. A distinct new gift uses repeat_of:null even for the same giver/amount.'],
        deltas: vocab.deltas.filter(d => d.type !== 'quest.offer').map(d => {
            if (d.type !== 'coin.gift') return d;
            const { job, ...fields } = d.fields;
            return { ...d, summary: 'An actual coin handover now, or an explicit reference to an already recorded handover; no formal job. Promises are not handovers.',
                fields: { ...fields, repeat_of: { type: 'string', nullable: true } } };
        }),
    };
}

export const EXTRACTOR_VERSION = 'extract-5.9';
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
const OFFER_LINE = O({ what: S(), kind: E(['goods', 'service']), service: N(E(SERVICES)), qty: I(1), price_cp: I(0), said: N(S()), effect: N(E(EFFECTS)), teaches: N(TEACHES), equipment: N(B()) });
// 4.3.0-c.6.6.5: a bid's line is one of Alaric's things and how many of it the buyer would take
const bidLine = (refs) => A(O({ object: refs.object, qty: I(1) }), 1);

function fieldSchema(spec, refs) {
    let s;
    if (spec.ref === 'place') s = refs.place;
    else if (spec.ref) s = refs[spec.ref] ?? S();
    else if (spec.enum) s = E(spec.enum);
    else if (spec.array === 'offer_line') s = A(OFFER_LINE, 1);
    else if (spec.object === 'teaches') s = TEACHES;
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
    'Trade evidence: offer/bid said quotes the actual commercial clause, including who offers, unit/lot price and conditions. Third-party price advice is fact/place.reported, not an offer or bid of the speaker. Price ranges, possible future prices and unaccepted discounts are not fixed prices. For a unit rate compute the total for the declared units; for a lot keep its total. Never invent a seller commitment from a recommendation.',
    'string[] is always a JSON array, even when it contains only one value.',
    `place-ref is an exact known place id from the CATALOG, or {"new":{"name":"...","kind":"...","parent":...}}. For a new place, kind must be exactly one of: ${PLACE_KINDS.join(', ')}. Use settlement for a city, town, village or hamlet; site for a building, inn or Guild hall; interior for a room; wilderness for natural outdoor terrain.`,
    'When the CATALOG already contains the place, quest or object, copy its id exactly. Never rewrite an id, invent another id for it, or substitute its title/name.',
    'quest-ref and object-ref mean the exact matching CATALOG id; use {"new":"..."} only when the thing is genuinely new and that reference type permits it.',
    'For a newly created object use object.new {name:"bread",holder:"npc.giver",...} then object.move {object:{new:"bread"},to:"pc",...}. object.new has no ref field. Never invent an obj.* id. The new-name reference must identify exactly one earlier created object; otherwise distinguish the actual objects by their established descriptions.',
    'In a multi-place reply use the existing per-delta scene explicitly for events before the last arrival. Example: enter known npc.giver at the starting place; create bread on that giver there; move {new:"bread"} to pc there; arrive at the authorized destination. present describes co-presence at that step, not only the reply ending. A returning known NPC uses enter, not person.new.',
    'person-ref is a person id from PRESENT or the CATALOG, or the ref of a person.new/creature.new earlier in the same answer.',
    'offer_line is {"what":string,"kind":"goods"|"service","service":"lodging"|"bath"|"laundry"|"meal"|"healing"|"training"|"other"|null,"qty":integer>=1,"price_cp":integer>=0,"said":string|null (the reply\'s words for the price),"effect":"heal"|"restore_mp"|"restore_sta"|null (only for a potion, draught or tonic that restores HP, MP or STA; the engine fixes how much),"teaches":teaches|null,"equipment":boolean|null}.',
    'For offer_line.equipment use true for intended combat equipment, false for ordinary/cosmetic merchandise, null if unspecified. This intent supplies no slot or numbers. Use supported categories from GEAR MARKET; separate armor parts have no combat slot. Do not sell ordinary decoration as a combat upgrade.',
    'teaches is {"source":"stone"|"manual","fn":"strike"|"bolt"|"guard"|"ward"|"mend"|null,"tags":string[]|null,"aspects":string[]|null} or null: only for a Skill Stone, or a manual, primer or treatise, that the reply establishes as teaching a technique. fn: strike (a close weapon or body technique), bolt (a ranged spell), guard (a defensive stance), ward (a magical barrier), mend (a healing); tags (Martial, Precision, Mobility, Defense, Arcane, Control) and aspects (Fire, Ice, Lightning, Water, Earth, Wind, Shadow, Light, Poison, Nature, Blood, Sound) only as the reply states them; null for anything the reply does not say. Never for an ordinary stone, a return stone, a storybook or a letter.',
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
        `PLAYER ACTIONS (already booked):\n${actions || 'none'}`,
        '',
        expectedText(vocab, expectedKeys),
        '',
        `REPLY:\n${reply}`,
        '',
        'QUEST OUTCOME CHECK: Before answering, compare this reply with every active Guild contract\'s desired end state in the CATALOG. If one is clearly achieved in this reply, quest.ready is required even when arrival/facts/memory are also reported; fact or memory alone is not enough.',
    ].join('\n');
}

/** The messages of an extractor call, and of its one repair (the invalid answer and the errors appended). */
export function extractorRequest(vocab, { catalog, actions, player = null, expectedKeys, reply }, { previous = null, errors = null } = {}) {
    const system = `${extractorSystem(vocab)}\n\n${EXTRACT_PLAIN_FORMAT}`;
    const user = extractorUser({ catalog, actions, player, expectedKeys, vocab, reply });
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    // Patch 8.1 (§9, live 21.10.2026 10:17: twice all 2,500 tokens went to deliberation and the answer was empty): an
    // empty answer is not repeated back; the one repair asks for the report at once, short, without deliberating
    if (previous !== null && errors && !String(previous).trim()) {
        messages.push({ role: 'user', content: 'Your previous answer was empty: it ran out of room before the JSON. Answer now with the JSON object alone, at once and short: report only what the reply plainly establishes, leave out anything you are unsure of (an empty deltas list is a valid answer). Do not deliberate.' });
    } else if (previous !== null && errors) {
        messages.push({ role: 'assistant', content: String(previous) }, { role: 'user', content: `Your answer was not valid: ${errors.slice(0, 8).join('; ')}. Answer again with only the corrected JSON object, nothing else.` });
    }
    return { system, user, messages };
}

/**
 * Read an extractor answer: valid (JSON + schema) and complete (every expected key answered).
 * @returns {{value: object|null, valid: boolean, complete: boolean, errors: string[], missing: string[], raw: boolean}}
 */
const softTeaches = (t) => (t && typeof t === 'object' && !Array.isArray(t) ? { fn: null, tags: null, aspects: null, ...t } : t ?? null);

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
        // Patch 3: an offer line's words for its price may be left out like a |null field
        if (d.type === 'offer' && Array.isArray(x.lines)) x.lines = x.lines.map((l) => (l && typeof l === 'object' ? { ...l, ...(l.said === undefined ? { said: null } : {}), ...(l.effect === undefined ? { effect: null } : {}), teaches: softTeaches(l.teaches), equipment: l.equipment ?? null } : l));
        // Patch 9C-2b: the fields of a teaches the reply does not state are null
        if (d.type === 'object.new') x.teaches = softTeaches(x.teaches);
        return x;
    }) : value.deltas;
    return { scene: null, ...value, expected: value.expected && typeof value.expected === 'object' ? value.expected : {}, deltas };
}

export function parseExtraction(answer, vocab, ids, expectedKeys, { sceneRequired = false, startScene = null } = {}) {
    const parsed = extractJsonObject(answer);
    const { error, raw } = parsed;
    const value = normalizeSoftFields(parsed.value, vocab);
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
    // Schema errors must describe the supported link, never guess which object an invented id meant.
    for (const [i, d] of (Array.isArray(value.deltas) ? value.deltas : []).entries()) {
        if (typeof d?.object !== 'string' || (ids?.objects || []).includes(d.object)) continue;
        const names = value.deltas.filter(x => x?.type === 'object.new' && x.seq < d.seq && typeof x.name === 'string').map(x => x.name);
        if (names.length) errors.push(`$.deltas[${i}].object: unknown catalog id; object.new has no ref. Use {new:exact earlier name}, e.g. ${JSON.stringify({ new: names[0] })}; never invent an obj.* id`);
    }
    // Annotation requirement only: actual scene/arrival authority is still checked in applyWorld.
    const lastArrival = Array.isArray(value.deltas) ? value.deltas.filter(d => d?.type === 'arrive').sort((a, b) => a.seq - b.seq).at(-1) : null;
    if (sceneRequired && startScene && lastArrival && JSON.stringify(lastArrival.at) !== JSON.stringify(startScene)) {
        for (const [i, d] of value.deltas.entries()) if (d.seq < lastArrival.seq && d.scene == null
            && !['time', 'arrive', 'overreach', 'place.reported', 'dungeon'].includes(d.type)
            && !(['person.new', 'creature.new'].includes(d.type) && d.present === false))
            errors.push(`$.deltas[${i}].scene: explicitly name this earlier scene before the later arrival; do not inherit the reply's final scene`);
    }
    if (sceneRequired && value.scene == null && (Object.values(expectedKeys || {}).includes('go') || (Array.isArray(value.deltas) && value.deltas.some(d => !['time', 'overreach', 'place.reported', 'dungeon'].includes(d?.type))))) errors.push('$.scene: actual narrative setting required for world changes');
    return { value, valid: errors.length === 0, complete: missing.length === 0, errors: [...errors.slice(0, 8), ...missing.map((k) => `expected key "${k}" not answered`)], missing, raw };
}
