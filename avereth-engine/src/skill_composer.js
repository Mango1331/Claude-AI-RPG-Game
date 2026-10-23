// Patch 9C-1 (docs/PATCH9C1_SKILL_ACQUISITION_TRAINING.md): the deterministic Skill composer. A supported main function
// (strike, bolt, guard, ward, mend), the discipline tags and the aspects of what he learns make one dynamic Skill
// definition: C1, F-rank, its numbers from the central provisional rules (rules.json composer), its name and id from
// fixed word lists, unique in the campaign (the content's Skills and every dynamic definition, an NPC's later ones
// too). No catalog of finished Skills, no new effect kind: the definition is validated and booked by src/skills.js
// defineSkill like any other, and fixed once booked. Pure: the same state and request give the same definition.
import { skillNames } from './content.js';
import { disciplineTags, skillAspects } from './skills.js';
import { normText } from './util.js';

const ROMAN = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const clean = (t, max) => String(t ?? '').replace(/[<>{}`$\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

function rules(content) {
    return content.rules.composer;
}

/** The main functions the composer supports (rules.json composer.functions). */
export function composerFunctions(content) {
    return Object.keys(rules(content)?.functions || {});
}

/**
 * The tags of a technique: the ones he names, when the function takes them, else the first of the function's tags the
 * teacher's own disciplines cover (prefer), else the function's first. {tags} or {error}.
 */
export function composeTags(content, fn, tags = null, prefer = []) {
    const spec = rules(content)?.functions?.[fn];
    if (!spec) return { error: `no technique of the kind "${fn}" can be learned yet (${composerFunctions(content).join(', ')})` };
    const known = disciplineTags(content);
    const asked = [...new Set((tags || []).filter(Boolean))];
    if (asked.length) {
        const bad = asked.filter((t) => !known.includes(t) || !spec.tags.includes(t));
        if (bad.length) return { error: `a ${fn} carries ${spec.tags.join(', ')}, not ${bad.join(', ')}` };
        return { tags: asked.slice(0, 2) };
    }
    return { tags: [spec.tags.find((t) => prefer.includes(t)) || spec.tags[0]] };
}

/** The aspects he names, when the rules know them: {aspects} or {error}. */
export function composeAspects(content, aspects = null) {
    const known = skillAspects(content);
    const asked = [...new Set((aspects || []).filter(Boolean))];
    const bad = asked.filter((a) => !known.includes(a));
    if (bad.length) return { error: `unknown aspect ${bad.join(', ')} (${known.join(', ')})` };
    return { aspects: asked.slice(0, 2) };
}

/** The first free name of the word pair: "Ember Bolt", else "Ember Bolt II" … "Ember Bolt X". */
function freeName(content, state, base) {
    const taken = new Set([...skillNames(content, state), ...Object.values(state?.passive_defs || {}).map((p) => normText(p.name))]);
    for (const n of [base, ...ROMAN.map((r) => `${base} ${r}`)]) if (!taken.has(normText(n))) return n;
    return null;
}

/** Technique identity ignores prose, source and ordering; the composer still preserves the primary scaling tag. */
export const techniqueSignature = ({ fn, tags = [], aspects = [] }) => JSON.stringify([fn, [...new Set(tags)].sort(), [...new Set(aspects)].sort()]);

/** Older .42 acquisitions carry no function field. Recover it from the closed composer shapes, without rewriting. */
export function acquiredTechnique(def) {
    if (!['teacher', 'stone', 'material'].includes(def?.origin?.kind)) return null;
    const fn = def.attack ? (def.range?.band === 'ENGAGED' ? 'strike' : def.attack.damage_type === 'magical' ? 'bolt' : null)
        : ({ temp_def: 'guard', barrier: 'ward', heal: 'mend' })[def.effects?.[0]?.kind];
    return fn ? { fn, tags: def.tags, aspects: def.aspects || [] } : null;
}

/** The first free id for a name: dyn.<name> (letters, digits, _), else with _2 … _9. */
function freeId(content, state, name) {
    const slug = normText(name).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36) || 'skill';
    const base = `dyn.${/^[a-z]/.test(slug) ? slug : `s_${slug}`}`;
    const used = (id) => content.skills.has(id) || !!state?.skill_defs?.[id];
    for (const id of [base, ...[2, 3, 4, 5, 6, 7, 8, 9].map((k) => `${base}_${k}`)]) if (!used(id)) return id;
    return null;
}

/**
 * The definition of one technique (C1, F-rank). request: {fn, tags, aspects, origin: {kind, note?}, source?: words of
 * where it came from for its description}. {def} or {errors}; the caller books it through defineSkill (validation).
 */
export function composeSkill(state, content, { fn, tags, aspects = [], origin, source = null }) {
    const R = rules(content);
    const spec = R?.functions?.[fn];
    if (!spec) return { errors: [`no technique of the kind "${fn}"`] };
    const t = composeTags(content, fn, tags);
    if (t.error) return { errors: [t.error] };
    const a = composeAspects(content, aspects);
    if (a.error) return { errors: [a.error] };
    const word = a.aspects.length ? R.aspect_words[a.aspects[0]] : R.tag_words[t.tags[0]];
    const name = freeName(content, state, `${word} ${spec.noun}`);
    if (!name) return { errors: [`no free name for ${word} ${spec.noun}`] };
    const id = freeId(content, state, name);
    if (!id) return { errors: [`no free id for ${name}`] };
    const primary = t.tags[0];
    const magical = fn !== 'strike' && fn !== 'guard' ? true : R.magical_tags.includes(primary);
    const resource = magical ? 'mp' : 'sta';
    const what = `${spec.text[0].toUpperCase()}${spec.text.slice(1)} (${t.tags.join(', ')}${a.aspects.length ? `; ${a.aspects.join(', ')} aspect` : ''})`;
    const from = source ? `, ${clean(source, 120)}` : '';
    const def = {
        id, name, description: clean(`${what}${from}.`, 300), origin: { kind: origin.kind, ...(origin.note ? { note: clean(origin.note, 200) } : {}) },
        rank: 'F', complexity: 1, tags: t.tags, ...(a.aspects.length ? { aspects: a.aspects } : {}), category: spec.category, activation: 'action',
        target: spec.attack ? 'enemy' : 'self', cost: { resource, amount: spec.cost }, effects: [],
    };
    if (spec.attack) {
        def.attack = { base: spec.attack.base, scaling: [{ stat: R.stat_by_tag[primary], coef: spec.attack.coef }], damage_type: fn === 'bolt' || magical ? 'magical' : 'physical' };
        def.range = { band: spec.attack.band };
    } else {
        const { kind, ...fields } = spec.effect;
        const allowed = R.effect_stats[kind];
        const stat = allowed.includes(R.stat_by_tag[primary]) ? R.stat_by_tag[primary] : allowed[0];
        def.effects = [{ kind, ...fields, stat }];
    }
    return { def, errors: [] };
}
