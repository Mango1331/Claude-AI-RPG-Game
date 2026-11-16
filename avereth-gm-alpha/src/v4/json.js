// Runtime V4: read the one JSON object an LLM answer should be (interpreter, extractor, Board generator).
// Tolerant of <think> blocks, code fences and prose around the object; the repairs of delta.js tolerantJson apply
// (smart quotes, trailing commas, unquoted keys, unbalanced brackets). `raw` says whether the answer was the bare
// object: P0/S0 measured 100 % bare JSON with the plain instruction.
import { tolerantJson } from '../delta.js';

/** @returns {{value: object|null, error: string|null, raw: boolean}} */
export function extractJsonObject(text) {
    let s = String(text ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const raw = s.startsWith('{') && s.endsWith('}');
    const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) s = fenced[1].trim();
    const direct = tolerantJson(s);
    if (direct.value) return { value: direct.value, error: null, raw };
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a >= 0 && b > a) {
        const inner = tolerantJson(s.slice(a, b + 1));
        if (inner.value) return { value: inner.value, error: null, raw: false };
    }
    return { value: null, error: direct.error || 'no JSON object in the answer', raw: false };
}
