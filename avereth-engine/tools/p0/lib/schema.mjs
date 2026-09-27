// Runtime V4, P0: tiny builders for strict-compatible JSON schemas (plan §4.3 "Schema-Dialekt") and a checker.
// Strict providers (OpenAI-style json_schema with strict: true) want: every object closed (additionalProperties
// false), every property required (optional ones nullable), no oneOf / if-then. validate.js checks the same subset.

/** Closed object; every property is required (make optional ones nullable with N). */
export const O = (properties, description) => ({
    type: 'object',
    ...(description ? { description } : {}),
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
});
export const S = (description) => (description ? { type: 'string', description } : { type: 'string' });
export const B = (description) => (description ? { type: 'boolean', description } : { type: 'boolean' });
export const I = (min, max, description) => ({
    type: 'integer',
    ...(min !== undefined && min !== null ? { minimum: min } : {}),
    ...(max !== undefined && max !== null ? { maximum: max } : {}),
    ...(description ? { description } : {}),
});
export const E = (values, description) => ({ type: 'string', enum: [...values], ...(description ? { description } : {}) });
export const A = (items, minItems, description) => ({
    type: 'array',
    items,
    ...(minItems !== undefined && minItems !== null ? { minItems } : {}),
    ...(description ? { description } : {}),
});

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

const ALLOWED = new Set(['type', 'properties', 'required', 'additionalProperties', 'enum', 'const', 'anyOf', 'items',
    'minItems', 'minimum', 'maximum', 'description', '$ref', '$defs']);

/** Problems that would make a strict json_schema provider reject the schema (empty list = fine). */
export function strictProblems(schema, path = '$', out = []) {
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
    if (schema.enum && schema.enum.length === 0) out.push(`${path}: empty enum`);
    for (const [k, v] of Object.entries(schema.$defs || {})) strictProblems(v, `#/$defs/${k}`, out);
    return out;
}
