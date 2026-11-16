// Runtime V4: strict JSON schemas for the structured LLM calls (interpreter, extractor, Board generator) and a
// validator that names the failing field of a discriminated union (docs/RUNTIME_V4_PLAN.md §4.3).
//
// P0/S0 (docs/P0_BERICHT.md §3): the provider accepts json_schema but does not enforce it, so these schemas are not
// sent as response_format; they describe the answer, feed the prompt's format text and are checked locally. The local
// validator is authoritative. The dialect stays strict-compatible (closed objects, every key required, optional ones
// nullable, anyOf, no oneOf) so that a provider that does enforce it can be used later without changes.
import { validateSchema } from '../validate.js';

/** Closed object; every property is required (make optional ones nullable with N). */
export const O = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const S = () => ({ type: 'string' });
export const B = () => ({ type: 'boolean' });
export const I = (min, max) => ({
    type: 'integer',
    ...(min !== undefined && min !== null ? { minimum: min } : {}),
    ...(max !== undefined && max !== null ? { maximum: max } : {}),
});
export const E = (values) => ({ type: 'string', enum: [...values] });
export const A = (items, minItems) => ({ type: 'array', items, ...(minItems !== undefined && minItems !== null ? { minItems } : {}) });

/** Nullable variant of a schema. */
export function N(schema) {
    if (schema.anyOf) return { ...schema, anyOf: [...schema.anyOf, { type: 'null' }] };
    if (schema.enum) return { ...schema, type: [schema.type, 'null'], enum: [...schema.enum, null] };
    if (typeof schema.type === 'string') return { ...schema, type: [schema.type, 'null'] };
    return { anyOf: [schema, { type: 'null' }] };
}

/** A reference: a known id from the catalog, or {"new": …} for something the catalog does not have. */
export function REF(ids, newShape = S()) {
    const fresh = O({ new: newShape });
    return ids && ids.length ? { anyOf: [E(ids), fresh] } : fresh;
}

/** The variant of a type-discriminated union (items with a "type" enum of one value) that an item claims to be. */
function variantFor(union, item) {
    if (!union?.anyOf || !item || typeof item !== 'object') return null;
    return union.anyOf.find((v) => v?.properties?.type?.enum?.length === 1 && v.properties.type.enum[0] === item.type) || null;
}

/**
 * Validate a value; for arrays of type-discriminated unions (commands, deltas) a failing item is checked against the
 * variant its "type" names, so the error says which field is wrong ("$.deltas[3] (object.new): $.kind …") instead of
 * "matches none of anyOf". The repair call and the audit get usable errors.
 * @returns {string[]} errors (empty = valid)
 */
export function validate(value, schema) {
    const errors = validateSchema(value, schema);
    if (!errors.length) return errors;
    const out = [];
    for (const e of errors) {
        const m = /^(\$\.[\w.]+)\[(\d+)\]: matches none of anyOf$/.exec(e);
        if (!m) { out.push(e); continue; }
        const path = m[1].slice(2).split('.');
        let arr = value;
        let sch = schema;
        for (const k of path) { arr = arr?.[k]; sch = sch?.properties?.[k]; }
        const item = Array.isArray(arr) ? arr[Number(m[2])] : null;
        const v = variantFor(sch?.items, item);
        if (!item || typeof item !== 'object' || typeof item.type !== 'string') { out.push(`${m[1]}[${m[2]}]: needs a "type"`); continue; }
        if (!v) { out.push(`${m[1]}[${m[2]}]: unknown type "${item.type}"`); continue; }
        for (const x of validateSchema(item, v)) out.push(`${m[1]}[${m[2]}] (${item.type}): ${x.replace(/^\$/, '')}`);
    }
    return out;
}

/** Problems that would make a strict json_schema provider reject the schema (empty = fine). */
export function strictProblems(schema, path = '$', out = []) {
    const ALLOWED = new Set(['type', 'properties', 'required', 'additionalProperties', 'enum', 'const', 'anyOf', 'items', 'minItems', 'minimum', 'maximum', 'description']);
    if (!schema || typeof schema !== 'object') return out;
    for (const k of Object.keys(schema)) if (!ALLOWED.has(k)) out.push(`${path}: keyword "${k}" is outside the strict dialect`);
    const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
    if (types.includes('object') || schema.properties) {
        const keys = Object.keys(schema.properties || {});
        if (schema.additionalProperties !== false) out.push(`${path}: object without additionalProperties: false`);
        const req = new Set(schema.required || []);
        for (const k of keys) if (!req.has(k)) out.push(`${path}.${k}: not required (make it nullable instead)`);
        for (const k of keys) strictProblems(schema.properties[k], `${path}.${k}`, out);
    }
    if (schema.items) strictProblems(schema.items, `${path}[]`, out);
    if (schema.anyOf) schema.anyOf.forEach((s, i) => strictProblems(s, `${path}|${i}`, out));
    return out;
}
