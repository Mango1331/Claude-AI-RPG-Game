// Runtime V4, P0: world deltas (plan §5). One draft vocabulary (tools/p0/draft/deltas.json) for the inline block
// instruction (variant B), the recovery extractor (variant A, and B's recovery), the JSON schema and the checks of
// S2 and S3. Spike code, not product code.
import fs from 'node:fs';
import path from 'node:path';
import { ENGINE_ROOT, extractJsonObject, validateSchema } from './util.mjs';
import { O, S, B, I, E, A, N } from './schema.mjs';

export const DELTA_VOCAB_FILE = path.join(ENGINE_ROOT, 'tools', 'p0', 'draft', 'deltas.json');
export const PLACE_KINDS = ['realm', 'region', 'wilderness', 'settlement', 'district', 'site', 'interior'];
const SERVICES = ['lodging', 'bath', 'laundry', 'meal', 'healing', 'training', 'other'];

export function loadDeltaVocab(file = DELTA_VOCAB_FILE) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

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
    go: (refs) => O({ arrived: B(), at: N(refs.place) }),
    activity: () => O({ minutes: I(0), done: B() }),
    take: () => O({ taken: B() }),
    buy: () => O({ priced: B() }),
    pay: () => O({ priced: B() }),
};

/**
 * Strict schema of a block or recovery answer.
 * @param {object} vocab  deltas.json
 * @param {{places?: string[], quests?: string[], objects?: string[]}} catalog  ids for the references
 * @param {Record<string,string>} expectedKeys  {"2": "go", …}: seq of the PLAYER ACTION → its command type
 */
export function deltaSchema(vocab, catalog = {}, expectedKeys = {}) {
    const refs = {
        place: placeRef(catalog.places || []),
        quest: (catalog.quests || []).length ? { anyOf: [E(catalog.quests), O({ new: S() })] } : O({ new: S() }),
        object: (catalog.objects || []).length ? { anyOf: [E(catalog.objects), O({ new: S() })] } : O({ new: S() }),
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

function fieldList(d) {
    return Object.entries(d.fields).map(([k, spec]) => (spec.nullable ? `${k}?` : k)).join(', ');
}

/** The delta list as prompt text (the same lines for the narrator block and the recovery extractor). */
export function deltaVocabularyText(vocab, only) {
    return vocab.deltas.filter((d) => !only || only.includes(d.type)).map((d) => `- ${d.type} {${fieldList(d)}}: ${d.summary}`).join('\n');
}

export function expectedText(vocab, expectedKeys) {
    const keys = Object.entries(expectedKeys || {});
    if (!keys.length) return 'expected: {} (no question this turn)';
    return `expected — answer every key:\n${keys.map(([k, t]) => {
        const e = vocab.expected[t];
        return `  "${k}": {${Object.entries(e?.shape || { done: 'true|false' }).map(([f, v]) => `"${f}": ${v}`).join(', ')}}  (${e?.summary || 'did it happen'})`;
    }).join('\n')}`;
}

/** WORLD DELTAS section of the V4 engine block (variant B). */
export function blockInstruction(vocab, expectedKeys) {
    return [
        'WORLD DELTAS (after the story, exactly one <avereth>{"expected":{…},"deltas":[…]}</avereth>; only what this reply established, in the order it happens):',
        ...vocab.rules.map((r) => `- ${r}`),
        expectedText(vocab, expectedKeys),
        'deltas — use only:',
        deltaVocabularyText(vocab),
        'Example: <avereth>{"expected":{"1":{"arrived":true,"at":{"new":{"name":"Stone Bridge","kind":"site","parent":"loc.example_town"}}}},"deltas":[{"seq":1,"type":"time","minutes":25},{"seq":2,"type":"arrive","at":{"new":{"name":"Stone Bridge","kind":"site","parent":"loc.example_town"}}},{"seq":3,"type":"person.new","ref":"toll_keeper","name":null,"role":"toll keeper","desc":["old man","leather apron"],"present":true,"at":null}]}</avereth>',
    ].join('\n');
}

export const BLOCK_FINAL = 'OUTPUT FORMAT (final instruction): the story text, then exactly one <avereth>{"expected":{…},"deltas":[…]}</avereth> block as WORLD DELTAS defines it ({"expected":{},"deltas":[]} if nothing changed). Nothing after </avereth>.';

/** System prompt of the recovery extractor (variant A always; variant B only for a missing, invalid or incomplete block). */
export function recoverySystem(vocab) {
    return [
        'You read one reply of the narrator of a text RPG and report, as typed world deltas, what the reply established. Alaric is the player character.',
        '',
        'Rules:',
        ...vocab.rules.map((r) => `- ${r}`),
        '',
        'Deltas:',
        deltaVocabularyText(vocab),
        '',
        'Answer with {"expected": {...}, "deltas": [...]}.',
    ].join('\n');
}

export function recoveryUser({ catalog, actions, expectedKeys, vocab, reply, errors }) {
    return [
        catalog || 'CATALOG: –',
        '',
        `PLAYER ACTIONS (already booked):\n${actions}`,
        '',
        expectedText(vocab, expectedKeys),
        ...(errors && errors.length ? ['', `The block in the reply was not usable: ${errors.slice(0, 6).join('; ')}`] : []),
        '',
        `REPLY:\n${reply}`,
    ].join('\n');
}

/** Plain-mode format line for the recovery extractor (instead of the whole schema text). */
export const RECOVERY_PLAIN_FORMAT = 'Return only one JSON object, no prose before or after it, no code fences: {"expected": {<every key asked>}, "deltas": [{"seq": 1, "type": "<delta>", <every field of that delta; null where allowed and unknown>}]}.';

/** Split a narrator reply into prose and its <avereth> block (the last one; an unclosed one at the end counts). */
export function splitBlock(text) {
    const s = String(text ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '');
    const re = /<avereth>([\s\S]*?)(<\/avereth>|$)/gi;
    let m;
    let last = null;
    while ((m = re.exec(s))) last = { index: m.index, body: m[1], closed: m[2] !== '' };
    if (!last) return { prose: s.trim(), block: null, closed: false };
    return { prose: s.slice(0, last.index).trim(), block: last.body.trim(), closed: last.closed };
}

/**
 * Parse and check one block: valid (JSON + schema) and complete (every expected key answered).
 * @returns {{present: boolean, valid: boolean, complete: boolean, value: any, errors: string[], missing: string[]}}
 */
export function checkBlock(blockText, schema, expectedKeys) {
    if (blockText === null || blockText === undefined) return { present: false, valid: false, complete: false, value: null, errors: ['no <avereth> block'], missing: Object.keys(expectedKeys || {}) };
    const { value, error } = extractJsonObject(blockText);
    if (!value) return { present: true, valid: false, complete: false, value: null, errors: [`block is not JSON: ${error}`], missing: Object.keys(expectedKeys || {}) };
    const exp = value && typeof value.expected === 'object' && value.expected ? value.expected : {};
    const missing = Object.keys(expectedKeys || {}).filter((k) => !exp[k] || typeof exp[k] !== 'object');
    // a missing expected key makes the block incomplete, not invalid (plan §3.4: missing | invalid | incomplete)
    let local = schema;
    if (missing.length && schema?.properties?.expected?.required) {
        local = structuredClone(schema);
        local.properties.expected.required = local.properties.expected.required.filter((k) => !missing.includes(k));
    }
    const errors = validateSchema(value, local);
    return { present: true, valid: errors.length === 0, complete: missing.length === 0, value, errors: errors.slice(0, 8), missing };
}

// ------------------------------------------------------------------------------------------------ semantic scoring
/** All string leaves of a value (to match a place {new: {name, parent: {new: …}}} or a ref by regex). */
function leaves(v, out = []) {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
    else if (v && typeof v === 'object') Object.values(v).forEach((x) => leaves(x, out));
    return out;
}

const RE = /^\/(.*)\/([a-z]*)$/s;

/**
 * Gold value vs predicted: exact, null, "*" (anything), "/regex/" (against any string leaf), array of alternatives,
 * {"$has": [pattern, …]} (an array containing a match for each pattern), {"$range": [min, max]} (a number in it),
 * or an object subset; in an object subset the key "$any" is a regex tested against every string leaf of the delta.
 */
export function goldMatch(gold, pred) {
    if (Array.isArray(gold)) return gold.some((g) => goldMatch(g, pred));
    if (gold === null) return pred === null || pred === undefined;
    if (gold === '*') return pred !== undefined && pred !== null;
    if (gold && typeof gold === 'object' && Array.isArray(gold.$range)) return typeof pred === 'number' && pred >= gold.$range[0] && pred <= gold.$range[1];
    if (gold && typeof gold === 'object' && Array.isArray(gold.$has)) {
        return Array.isArray(pred) && gold.$has.every((p) => pred.some((x) => goldMatch(p, x)));
    }
    const m = typeof gold === 'string' ? gold.match(RE) : null;
    if (m) {
        const re = new RegExp(m[1], m[2]);
        return leaves(pred).some((x) => re.test(x));
    }
    if (typeof gold === 'object') {
        if (!pred || typeof pred !== 'object') return false;
        return Object.entries(gold).every(([k, v]) => (k === '$any' ? goldMatch(v, leaves(pred)) : goldMatch(v, pred[k])));
    }
    return gold === pred;
}

/**
 * S2 semantic score of one answer (block or recovery) against a turn's gold.
 * gold: {expected: {"2": {...}}, critical: [delta pattern], forbidden: [delta pattern]}
 */
export function scoreDeltas(gold, value) {
    const deltas = Array.isArray(value?.deltas) ? value.deltas : [];
    const exp = value && typeof value.expected === 'object' && value.expected ? value.expected : {};
    const expKeys = Object.keys(gold.expected || {});
    const expectedOk = expKeys.filter((k) => goldMatch(gold.expected[k], exp[k]));
    const used = new Set();
    const critical = (gold.critical || []).map((c) => {
        const idx = deltas.findIndex((d, i) => !used.has(i) && goldMatch(c, d));
        if (idx >= 0) used.add(idx);
        return { pattern: c, found: idx >= 0 };
    });
    const forbiddenHits = [];
    for (const f of gold.forbidden || []) for (const d of deltas) if (goldMatch(f, d)) forbiddenHits.push({ pattern: f, delta: d });
    const items = expKeys.length + critical.length;
    const hits = expectedOk.length + critical.filter((c) => c.found).length;
    return {
        expected_total: expKeys.length,
        expected_ok: expectedOk.length,
        expected_wrong: expKeys.filter((k) => !expectedOk.includes(k)),
        critical_total: critical.length,
        critical_found: critical.filter((c) => c.found).length,
        critical_missing: critical.filter((c) => !c.found).map((c) => c.pattern),
        forbidden_hits: forbiddenHits,
        semantic: items + forbiddenHits.length ? hits / (items + forbiddenHits.length) : 1,
        deltas: deltas.length,
    };
}
