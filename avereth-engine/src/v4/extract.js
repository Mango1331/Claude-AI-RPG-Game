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

export const EXTRACTOR_VERSION = 'extract-5.0';
export const PLACE_KINDS = ['realm', 'region', 'wilderness', 'settlement', 'district', 'site', 'interior'];
const SERVICES = ['lodging', 'bath', 'laundry', 'meal', 'healing', 'training', 'other'];

/** A place reference: a known id, or {new: {name, kind, parent}} with one more level of new parent. */
export function placeRef(placeIds) {
    const known = placeIds.length ? [E(placeIds)] : [];
    const parentNew = O({ new: O({ name: S(), kind: E(PLACE_KINDS), parent: placeIds.length ? N(E(placeIds)) : { type: 'null' } }) });
    const parent = { anyOf: [...known, parentNew, { type: 'null' }] };
    return { anyOf: [...known, O({ new: O({ name: S(), kind: E(PLACE_KINDS), parent }) })] };
}

const OFFER_LINE = O({ what: S(), kind: E(['goods', 'service']), service: N(E(SERVICES)), qty: I(1), price_cp: I(0) });

function fieldSchema(spec, refs) {
    let s;
    if (spec.ref === 'place') s = refs.place;
    else if (spec.ref) s = refs[spec.ref] ?? S();
    else if (spec.enum) s = E(spec.enum);
    else if (spec.array === 'offer_line') s = A(OFFER_LINE, 1);
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
    };
    const expected = {};
    for (const [k, t] of Object.entries(expectedKeys)) expected[k] = (EXPECTED_SHAPES[t] || (() => O({ done: B() })))(refs);
    const variants = vocab.deltas.map((d) => {
        const props = { seq: I(1), type: E([d.type]) };
        for (const [k, spec] of Object.entries(d.fields)) props[k] = fieldSchema(spec, refs);
        return O(props);
    });
    return O({ expected: O(expected), deltas: A({ anyOf: variants }) });
}

function fieldType(spec) {
    if (spec.ref) return `${spec.ref}-ref`;
    if (spec.enum) return spec.enum.map((v) => JSON.stringify(v)).join('|');
    if (spec.array === 'offer_line') return 'offer_line[]';
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
    'string[] is always a JSON array, even when it contains only one value.',
    `place-ref is an exact known place id from the CATALOG, or {"new":{"name":"...","kind":"...","parent":...}}. For a new place, kind must be exactly one of: ${PLACE_KINDS.join(', ')}. Use settlement for a city, town, village or hamlet; site for a building, inn or Guild hall; interior for a room; wilderness for natural outdoor terrain.`,
    'When the CATALOG already contains the place, quest or object, copy its id exactly. Never rewrite an id, invent another id for it, or substitute its title/name.',
    'quest-ref and object-ref mean the exact matching CATALOG id; use {"new":"..."} only when the thing is genuinely new and that reference type permits it.',
    'person-ref is a person id from PRESENT or the CATALOG, or the ref of a person.new/creature.new earlier in the same answer.',
    'offer_line is {"what":string,"kind":"goods"|"service","service":"lodging"|"bath"|"laundry"|"meal"|"healing"|"training"|"other"|null,"qty":integer>=1,"price_cp":integer>=0}.',
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

export const EXTRACT_PLAIN_FORMAT = 'Return only one JSON object, no prose before or after it, no code fences: {"expected": {<every key asked>}, "deltas": [{"seq": 1, "type": "<delta>", <required fields; fields marked |null may be omitted when unknown>}]}.';

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
    ].join('\n');
}

/** The messages of an extractor call, and of its one repair (the invalid answer and the errors appended). */
export function extractorRequest(vocab, { catalog, actions, player = null, expectedKeys, reply }, { previous = null, errors = null } = {}) {
    const system = `${extractorSystem(vocab)}\n\n${EXTRACT_PLAIN_FORMAT}`;
    const user = extractorUser({ catalog, actions, player, expectedKeys, vocab, reply });
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    if (previous !== null && errors) {
        messages.push({ role: 'assistant', content: String(previous) }, { role: 'user', content: `Your answer was not valid: ${errors.slice(0, 8).join('; ')}. Answer again with only the corrected JSON object, nothing else.` });
    }
    return { system, user, messages };
}

/**
 * Read an extractor answer: valid (JSON + schema) and complete (every expected key answered).
 * @returns {{value: object|null, valid: boolean, complete: boolean, errors: string[], missing: string[], raw: boolean}}
 */
function normalizeSoftFields(value, vocab) {
    if (!value || typeof value !== 'object') return value;
    const specs = new Map((vocab.deltas || []).map((d) => [d.type, d]));
    const deltas = Array.isArray(value.deltas) ? value.deltas.map((d) => {
        if (!d || typeof d !== 'object') return d;
        const spec = specs.get(d.type);
        if (!spec) return d;
        const x = { ...d };
        for (const [k, f] of Object.entries(spec.fields || {})) if (x[k] === undefined && f.nullable) x[k] = null;
        // Harmless persistence defaults: their omission should not trigger another LLM call.
        if (d.type === 'person.new' && x.desc === undefined) x.desc = [];
        if (d.type === 'creature.new') {
            if (x.desc === undefined) x.desc = [];
            if (x.count === undefined) x.count = 1;
        }
        if (d.type === 'memory' && x.who === undefined) x.who = [];
        return x;
    }) : value.deltas;
    return { ...value, expected: value.expected && typeof value.expected === 'object' ? value.expected : {}, deltas };
}

export function parseExtraction(answer, vocab, ids, expectedKeys) {
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
    return { value, valid: errors.length === 0, complete: missing.length === 0, errors: [...errors.slice(0, 8), ...missing.map((k) => `expected key "${k}" not answered`)], missing, raw };
}
