// Patch 9C-1 (docs/PATCH9C1_SKILL_ACQUISITION_TRAINING.md): the deterministic Skill composer. A supported main function
// (strike, bolt, guard, ward, mend), the discipline tags and the aspects of what he learns make one dynamic Skill
// definition: C1, F-rank, its numbers from the central provisional rules (rules.json composer), its name and id from
// fixed word lists, unique in the campaign (the content's Skills and every dynamic definition, an NPC's later ones
// too). No catalog of finished Skills, no new effect kind: the definition is validated and booked by src/skills.js
// defineSkill like any other, and fixed once booked. Pure: the same state and request give the same definition.
import { skillNames, skillOf } from './content.js';
import { disciplineTags, skillAspects, calibration } from './skills.js';
import { normText, hash32 } from './util.js';

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

/**
 * The names no new Skill may take: every Skill's, every Passive's, and those an offer holds (9C-2c a Passive, 9C
 * completion a Skill offered to him).
 */
export function takenNames(content, state) {
    const offered = (state?.decisions || []).flatMap((d) => (d.kind === 'passive' ? [d.passive?.name] : d.kind === 'skill' ? [d.skill?.name] : []));
    return new Set([...skillNames(content, state), ...Object.values(state?.passive_defs || {}).map((p) => normText(p.name)), ...offered.filter(Boolean).map(normText)]);
}

/** The first free name of the word pair: "Ember Bolt", else "Ember Bolt II" … "Ember Bolt X". */
function freeName(content, state, base) {
    const taken = takenNames(content, state);
    for (const n of [base, ...ROMAN.map((r) => `${base} ${r}`)]) if (n.length <= 40 && !taken.has(normText(n))) return n;
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
    // 9C completion: and none a Skill offered to him holds
    const offered = new Set((state?.decisions || []).filter((d) => d.kind === 'skill').map((d) => d.skill?.id));
    const used = (id) => content.skills.has(id) || !!state?.skill_defs?.[id] || offered.has(id);
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

// ------------------------------------------------------------------------------------------------ 9C completion
// docs/PATCH9C_COMPLETION.md. A Skill develops one step at a time from what his use of it showed (src/v4/skill_growth.js):
// a closed list of steps, each an existing feature the validator budgets and the combat engine executes; no new effect
// kind, no tree. One step is Complexity +1 (C3 is the end at a Rank), the Rank and the scaling stats stay; the numbers
// of the new Complexity's calibration, never below the Skill it develops from (an area spreads them: three quarters).

/** The fn/tags/aspects of any Skill (static, dynamic, a definition): the technique a teacher or a stone would teach. */
export function techniqueOf(skill) {
    if (!skill || skill.basic || skill.weapon_attack || skill.item) return null;
    const fn = skill.attack ? (skill.range?.band === 'ENGAGED' ? 'strike' : skill.attack.damage_type === 'magical' ? 'bolt' : null)
        : ({ temp_def: 'guard', barrier: 'ward', heal: 'mend' })[skill.effects?.[0]?.kind];
    return fn ? { fn, tags: [...(skill.tags || [])], aspects: [...(skill.aspects || [])] } : null;
}

const featureList = (k) => {
    const kinds = (k.effects || []).map((e) => e.kind);
    return [k.range?.band === 'LONG' ? 'long' : null, k.attack?.ignores_partial_cover ? 'cover' : null, kinds.includes('extra_band') || k.range?.extra_band ? 'extra_band' : null,
        kinds.includes('area') || k.range?.area ? 'area' : null, (k.attack?.strikes ?? k.strikes ?? 1) > 1 ? 'multi' : null, kinds.includes('post_attack_temp_def') ? 'riposte' : null].filter(Boolean);
};

/** The mechanical shape of a Skill: what it does, not what it is called (two of one shape are one technique twice). */
export function techniqueShape(skill) {
    if (!skill) return null;
    const a = skill.attack;
    const kinds = (skill.effects || []).map((e) => e.kind).filter((k) => !['extra_band', 'area', 'post_attack_temp_def'].includes(k)).sort();
    return JSON.stringify([a ? `${skill.range?.band === 'LONG' ? 'MEDIUM' : skill.range?.band}|${a.damage_type}` : 'self', featureList(skill).sort(), kinds, [...(skill.tags || [])].sort(), [...(skill.aspects || [])].sort()]);
}

const DEFENSES = ['temp_def', 'temp_mdef', 'barrier', 'incoming_damage_reduction', 'damage_reduction_next'];
const isArea = (k) => featureList(k).includes('area');
const plainAttack = (k) => !!k.attack && (k.attack.strikes ?? k.strikes ?? 1) === 1;

/**
 * The development steps: the pattern of his use each answers, whether it applies to a Skill, and what it adds. Words:
 * the first word of a fallback name. Never for his Basic Attack's own replacement, a weapon's attack or an item.
 */
export const STEPS = {
    crowd: { word: 'Sweeping', text: 'it strikes every foe ENGAGED with him (three quarters of its power on each)', applies: (k) => plainAttack(k) && k.range.band === 'ENGAGED' && !featureList(k).some((f) => ['area', 'extra_band'].includes(f)) },
    closing: { word: 'Rushing', text: 'he closes one more Range Band with it and strikes', applies: (k) => plainAttack(k) && k.range.band === 'ENGAGED' && !featureList(k).some((f) => ['area', 'extra_band'].includes(f)) },
    cover: { word: 'Piercing', text: 'it ignores partial cover', applies: (k) => !!k.attack && !k.attack.ignores_partial_cover && !isArea(k) },
    reach: { word: 'Far', text: 'it reaches LONG range', applies: (k) => !!k.attack && k.range.band === 'MEDIUM' },
    riposte: { word: 'Guarded', text: 'it leaves him DEF +2 until his next turn', applies: (k) => !!k.attack && !featureList(k).includes('riposte') },
    layered: { word: 'Layered', text: 'a second protection joins the first', applies: (k) => !k.attack && (k.effects || []).length === 1 && DEFENSES.includes(k.effects[0].kind) },
};
export const STEP_ORDER = ['crowd', 'closing', 'cover', 'reach', 'riposte', 'layered'];

const round2 = (x) => Math.floor(x * 100 + 1e-9) / 100;
const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));

/** The definition (validator input) of a resolved Skill: static content or a dynamic runtime Skill. */
function defOf(skill) {
    const a = skill.attack;
    return {
        rank: skill.rank || 'F', complexity: skill.complexity || 1, tags: [...skill.tags], ...((skill.aspects || []).length ? { aspects: [...skill.aspects] } : {}), category: skill.category,
        activation: 'action', target: a ? 'enemy' : 'self', cost: { resource: skill.cost?.resource || 'sta', amount: skill.cost?.amount || 0 },
        ...(a ? {
            attack: { base: a.base, scaling: a.scaling.map((t) => ({ stat: t.stat, coef: t.coef })), damage_type: a.damage_type, ...((a.strikes ?? skill.strikes ?? 1) > 1 ? { strikes: a.strikes ?? skill.strikes } : {}), ...(a.share !== undefined && a.share !== 1 ? { share: a.share } : {}), ...(a.ignores_partial_cover ? { ignores_partial_cover: true } : {}) },
            range: { band: skill.range.band, ...(skill.range.extra_band ? { extra_band: true } : {}) },
        } : {}),
        effects: (skill.effects || []).map((e) => ({ ...e })),
    };
}

/** The second protection a defense takes on (the validator's pairs: never a Barrier with a DEF bonus). */
function secondDefense(content, first, tags) {
    const R = rules(content);
    const stat = (allowed) => (allowed.includes(R.stat_by_tag[tags[0]]) ? R.stat_by_tag[tags[0]] : allowed[0]);
    if (first.kind === 'temp_def' || first.kind === 'temp_mdef') return { kind: 'incoming_damage_reduction', pct: 10, until: 'own_next_turn' };
    if (first.kind === 'barrier') return { kind: 'damage_reduction_next', pct: 15, until: 'own_next_turn' };
    if (first.kind === 'incoming_damage_reduction') return { kind: 'temp_def', base: 3, stat: stat(['VIT', 'WIL']), coef: 0.4, floor: true, until: 'own_next_turn' };
    return { kind: 'barrier', base: 4, stat: stat(['WIL', 'INT']), coef: 0.8, floor: true, until: 'destroyed_or_own_next_turn' };
}

/**
 * A Skill one step further (an evolution, a breakthrough from his Basic Attack or from two Skills, a person's signature):
 * {def} or {errors}; the caller books it through defineSkill (validation) when it is accepted or fixed.
 * opts: {origin: {kind, note}, name: a preferred name (else the step's word and the Skill's name), rank (default: the
 * Skill's own; a Rank without bounds is refused, never taken for F), text: words of where it came from}
 */
export function developSkill(state, content, base, step, { origin, name = null, rank = null, text = null } = {}) {
    const S = STEPS[step];
    if (!S) return { errors: [`no development step "${step}"`] };
    if (!base || base.item || base.weapon_attack) return { errors: ['only a Skill develops'] };
    if (!S.applies(base)) return { errors: [`${base.name} cannot develop this way (${step})`] };
    const c = (base.complexity || 1) + 1;
    if (c > 3) return { errors: [`${base.name} is Complexity ${base.complexity}, the last at its Rank`] };
    const R = rank || base.rank || 'F';
    const cal = calibration(content, R)?.[c];
    if (!cal) return { errors: [`Rank ${R} has no calibrated bounds`] };
    const def = defOf(base);
    def.rank = R;
    def.complexity = c;
    if (def.attack) {
        const area = step === 'crowd' || isArea(base);
        const strikes = def.attack.strikes ?? 1;
        const k = area ? 0.75 : 1 / strikes;
        // the new Complexity's power, never below what it develops from (an area: three quarters of that, on each)
        const single = Math.max(def.attack.base / (isArea(base) ? 0.75 : 1), Math.round(cal.base * 0.85 / strikes));
        def.attack.base = Math.max(1, Math.min(Math.floor(cal.base * k + 1e-9), Math.round(single * (step === 'crowd' ? 0.75 : 1))));
        const sum = def.attack.scaling.reduce((n, t) => n + t.coef, 0);
        const want = Math.min(cal.coef * k, Math.max(sum / (isArea(base) ? 0.75 : 1), cal.coef * 0.8 / strikes) * (step === 'crowd' ? 0.75 : 1));
        def.attack.scaling = def.attack.scaling.map((t) => ({ stat: t.stat, coef: Math.max(0.05, round2((t.coef / sum) * want)) }));
        if (step === 'crowd') def.effects.push({ kind: 'area', shape: 'caster_engaged', shared_rolls: true });
        if (step === 'closing') { def.range.extra_band = true; def.effects.push({ kind: 'extra_band' }); }
        if (step === 'cover') def.attack.ignores_partial_cover = true;
        if (step === 'reach') def.range.band = 'LONG';
        if (step === 'riposte') def.effects.push({ kind: 'post_attack_temp_def', flat: 2, until: 'own_next_turn' });
        if (def.category === 'Offensive') def.category = step === 'riposte' ? 'Offensive / Defensive' : step === 'closing' ? 'Offensive / Utility' : 'Offensive';
    } else {
        def.effects.push(secondDefense(content, def.effects[0], def.tags));
    }
    def.cost.amount = clamp(def.cost.amount + 2, cal.cost);
    const preferred = name && name.length <= 40 ? name : null;
    // a Basic Attack's development is a technique of its own: named by its discipline, not "Basic Attack"
    const plain = `${S.word} ${rules(content).tag_words[def.tags[0]] || 'Iron'} ${def.attack ? (def.range.band === 'ENGAGED' ? 'Strike' : 'Bolt') : 'Guard'}`;
    const chosen = (preferred && !takenNames(content, state).has(normText(preferred)) ? preferred : null) || (base.basic ? null : freeName(content, state, `${S.word} ${base.name}`)) || freeName(content, state, plain);
    if (!chosen) return { errors: [`no free name for ${S.word} ${base.name}`] };
    const id = freeId(content, state, chosen);
    if (!id) return { errors: [`no free id for ${chosen}`] };
    def.id = id;
    def.name = chosen;
    def.description = clean(`${base.basic ? 'His plain attack' : base.name}, one step further: ${S.text}${text ? `; ${text}` : ''}.`, 300);
    def.origin = { kind: origin?.kind || 'evolution', ...(origin?.note ? { note: clean(origin.note, 200) } : {}) };
    // key order as the composer's (id, name, … effects): nothing reads it, a record stays readable
    const ordered = { id: def.id, name: def.name, description: def.description, origin: def.origin, rank: def.rank, complexity: def.complexity, tags: def.tags, ...(def.aspects ? { aspects: def.aspects } : {}), category: def.category, activation: def.activation, target: def.target, cost: def.cost, ...(def.range ? { range: def.range } : {}), ...(def.attack ? { attack: def.attack } : {}), effects: def.effects };
    return { def: ordered, errors: [] };
}

/** The steps a Skill may take (in order), for a person of the world: never an area or a strike that splits. */
export function signatureSteps(skill) {
    return STEP_ORDER.filter((k) => k !== 'crowd' && STEPS[k].applies(skill));
}

/**
 * 9C completion: the technique of their own a trained person of the world has from npc_signature_level Levels on: one
 * of their starter Skills developed one step (never an area or a multi-strike one), Rank F, chosen by the campaign seed
 * and the person (no die of the fight, no LLM). {def} or null.
 */
export function signatureSkill(state, content, person, sheet) {
    const starters = (sheet.generated?.starters || []).map((id) => skillOf(content, id, state)).filter(Boolean);
    const options = starters.flatMap((k) => signatureSteps(k).map((step) => ({ k, step })));
    if (!options.length) return null;
    const key = `${state.rng?.seed ?? 0}|${person.id}|signature`;
    const pick = options[parseInt(hash32(key), 16) % options.length];
    const first = String(person.name || '').trim().split(/\s+/)[0] || '';
    const own = /^[A-Za-z][A-Za-z'-]{1,15}$/.test(first) ? `${first}'s ${STEPS[pick.step].word} ${pick.k.name}` : null;
    const r = developSkill(state, content, pick.k, pick.step, { rank: 'F', name: own, origin: { kind: 'signature', note: `${person.name || 'their'} own way with ${pick.k.name}` } });
    return r.def || null;
}
