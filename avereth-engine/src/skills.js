// Patch 9B-1 (docs/PATCH9B1_DYNAMIC_SKILLS_PROFICIENCY.md): the campaign's own Skill definitions and the Proficiency
// of known Skills.
//  * A dynamic Skill is a definition of this campaign alone (state.skill_defs, booked by skill.defined): validated
//    against a closed schema and the F-rank calibration of content.6 before it is booked, fixed once booked, resolved
//    with the static content by src/content.js skillOf. Defining is not learning: skill.learned gives it to someone.
//  * Proficiency Progress: P1-P5 by the Skill's Complexity (C1 75, C2 100, C3 150 PP per promotion), the PC's single
//    highest Class Affinity for the Skill's tags, awarded for a fight only when it is over (a running fight keeps the
//    Proficiency it locked) and only for meaningful use; for a booked check of a Skill outside a fight once per thing.
// Only the engine books these events (src/v4/ownership.js: skills, pc.progress); nothing here calls an LLM.
import { skillOf, skillNames, rulesetOf } from './content.js';
import { normText, num, roundHalfUp } from './util.js';

const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
const BANDS = ['ENGAGED', 'SHORT', 'MEDIUM', 'LONG'];
const DAMAGE_STATS = ['STR', 'VIT', 'AGI', 'INT', 'WIL']; // Combat V3: PER never scales damage
const CATEGORIES = ['Offensive', 'Offensive / Utility', 'Offensive / Defensive', 'Offensive / Multi-Hit', 'Defensive', 'Utility', 'Defensive / Utility'];
const TOP_KEYS = new Set(['id', 'name', 'description', 'flavor', 'origin', 'rank', 'complexity', 'tags', 'aspects', 'category', 'activation', 'target', 'cost', 'range', 'attack', 'effects']);
const ATTACK_KEYS = new Set(['base', 'scaling', 'damage_type', 'strikes', 'share', 'ignores_partial_cover']);
// the effect kinds the combat engine executes (src/combat.js attackAction / skillAction), their fields and the F-rank
// bounds of the content's own Skills (the strongest starter or legacy F Skill of each kind); a rider on an attack, or
// an action of its own
const EFFECTS = {
    temp_def: { on: 'self', fields: { base: [0, 6], stat: ['VIT', 'WIL'], coef: [0, 0.8], floor: 'bool', until: ['own_next_turn'] } },
    temp_mdef: { on: 'self', fields: { base: [0, 4], stat: ['VIT', 'WIL'], coef: [0, 0.6], floor: 'bool', until: ['own_next_turn'] } },
    barrier: { on: 'self', fields: { base: [0, 10], stat: ['WIL', 'INT'], coef: [0, 2], floor: 'bool', until: ['destroyed_or_own_next_turn'] } },
    incoming_damage_reduction: { on: 'self', fields: { pct: [1, 25], until: ['own_next_turn'] } },
    damage_reduction_next: { on: 'self', fields: { pct: [1, 25], until: ['own_next_turn'] } },
    next_attack_buff: { on: 'self', fields: { power_pct: [1, 35], scope: ['attack', 'ranged'], expires: ['end_of_next_turn'] } },
    reposition: { on: 'self', fields: { bands: [1, 1], extra: 'bool' } },
    post_attack_temp_def: { on: 'attack', fields: { flat: [1, 4], until: ['own_next_turn'] } },
    extra_band: { on: 'attack', fields: {} },
    area: { on: 'attack', fields: { shape: ['caster_engaged'], shared_rolls: 'bool' } },
    // Patch 9B-2: his own HP restored (a fixed amount by a stat), and MP or STA restored from the other resource's cost
    heal: { on: 'self', fields: { base: [1, 16], stat: ['VIT', 'WIL', 'INT'], coef: [0, 2], floor: 'bool' } },
    restore: { on: 'self', fields: { resource: ['mp', 'sta'], amount: [1, 22] } },
};
// barrier strength by Complexity (Arcane Ward C1, Focused Ward C2)
const BARRIER_CAP = { 1: { base: 6, coef: 1.5 }, 2: { base: 10, coef: 2 }, 3: { base: 10, coef: 2 } };
// Patch 9B-2: healing by Complexity: below a Barrier of the same Complexity (a Barrier lasts a Turn, HP stay)
const HEAL_CAP = { 1: { base: 8, coef: 1 }, 2: { base: 12, coef: 1.5 }, 3: { base: 16, coef: 2 } };
const RESTORES = new Set(['heal', 'restore']);

/** content.6 (F-rank offensive P1 calibration): Base, total stat coefficients and Cost by Complexity. */
function calibration(content) {
    return content.rules.skill_design?.f_rank || {
        1: { base: 12, coef: 1.9, cost: [5, 10] }, 2: { base: 16, coef: 2.4, cost: [8, 16] }, 3: { base: 18, coef: 2.6, cost: [12, 22] },
    };
}

/**
 * Review of 9B-1: the thematic aspects a dynamic Skill may carry (rules.json skill_design.aspects: Fire, Ice, ...),
 * separate from its affinity tags. Persistent metadata for later patches; nothing in the engine acts on them.
 */
export function skillAspects(content) {
    return content.rules.skill_design?.aspects || [];
}

/** The discipline tags a Skill may carry: those the Class Affinities know (content classes.json affinity). */
export function disciplineTags(content) {
    return [...new Set(Object.values(content.affinity || {}).flatMap((a) => Object.keys(a)).filter((k) => k !== 'otherwise'))].sort();
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const within = (v, [lo, hi]) => isNum(v) && v >= lo && v <= hi;
const plain = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[<>{}`$\\]/.test(v);

/**
 * Patch 9B-1: the errors of a proposed dynamic Skill (empty: valid). Closed: unknown fields, effect kinds and values
 * are refused, never ignored. F-rank only for now: no higher Rank has calibrated bounds yet, so none is accepted.
 */
export function skillDefErrors(def, content, state = null) {
    const e = [];
    if (!def || typeof def !== 'object' || Array.isArray(def)) return ['a Skill definition is an object'];
    for (const k of Object.keys(def)) if (!TOP_KEYS.has(k)) e.push(`unknown field ${k}`);
    if (typeof def.id !== 'string' || !/^dyn\.[a-z][a-z0-9_]{2,40}$/.test(def.id)) e.push('id: "dyn." and a lower-case name (letters, digits, _)');
    else if (content.skills.has(def.id) || state?.skill_defs?.[def.id]) e.push(`id ${def.id} exists`);
    if (!plain(def.name, 40) || !/^[A-Za-z][A-Za-z' -]{1,39}$/.test(def.name)) e.push('name: 2-40 letters');
    else if (skillNames(content, state).includes(normText(def.name))) e.push(`name ${def.name} is the name of a Skill that exists`);
    if (!plain(def.description, 300)) e.push('description: up to 300 characters');
    if (def.flavor !== undefined && (!plain(def.flavor, 160) || /[\d\u0000-\u001f\u007f]/.test(def.flavor))) e.push('flavor: one line, up to 160 characters, without digits or control characters');
    if (!def.origin || typeof def.origin !== 'object' || !plain(def.origin.kind, 40) || Object.keys(def.origin).some((k) => !['kind', 'note'].includes(k)) || (def.origin.note !== undefined && !plain(def.origin.note, 200))) e.push('origin: {kind, note?}');
    if (!RANKS.includes(def.rank)) e.push('rank: F-S');
    else if (def.rank !== 'F') e.push(`rank ${def.rank}: only F-rank Skills have calibrated bounds yet`);
    if (![1, 2, 3].includes(def.complexity)) e.push('complexity: 1, 2 or 3');
    const tags = disciplineTags(content);
    if (!Array.isArray(def.tags) || !def.tags.length || def.tags.length > 3 || def.tags.some((t) => !tags.includes(t)) || new Set(def.tags).size !== def.tags.length) e.push(`tags: 1-3 of ${tags.join(', ')}`);
    const aspects = skillAspects(content);
    if (def.aspects !== undefined && (!Array.isArray(def.aspects) || def.aspects.length > 3 || def.aspects.some((a) => !aspects.includes(a)) || new Set(def.aspects).size !== def.aspects.length)) e.push(`aspects: 0-3 of ${aspects.join(', ')}`);
    if (!CATEGORIES.includes(def.category)) e.push(`category: one of ${CATEGORIES.join(', ')}`);
    if (def.activation !== 'action') e.push('activation: action (his Main Action)');
    const attack = def.attack ?? null;
    if (!!attack !== /^Offensive/.test(def.category || '')) e.push('category: Offensive exactly when it attacks');
    if (def.target !== (attack ? 'enemy' : 'self')) e.push(`target: ${attack ? 'enemy for an attack' : 'self for a Skill without an attack'}`);
    const cal = calibration(content)[def.complexity];
    if (!def.cost || typeof def.cost !== 'object' || Object.keys(def.cost).some((k) => !['resource', 'amount'].includes(k)) || !['sta', 'mp'].includes(def.cost.resource) || !Number.isInteger(def.cost.amount)) e.push('cost: {resource: sta|mp, amount: whole number}');
    else if (cal && !within(def.cost.amount, cal.cost)) e.push(`cost ${def.cost.amount}: ${cal.cost[0]}-${cal.cost[1]} at Complexity ${def.complexity}`);
    const effects = Array.isArray(def.effects) ? def.effects : null;
    if (!effects) e.push('effects: a list (may be empty for a plain attack)');
    const kinds = (effects || []).map((x) => x?.kind);
    for (const [i, x] of (effects || []).entries()) {
        const spec = EFFECTS[x?.kind];
        if (!spec) { e.push(`effects[${i}]: kind ${x?.kind} is not supported`); continue; }
        for (const k of Object.keys(x)) if (k !== 'kind' && !(k in spec.fields)) e.push(`effects[${i}] ${x.kind}: unknown field ${k}`);
        for (const [k, rule] of Object.entries(spec.fields)) {
            const v = x[k];
            if (rule === 'bool') { if (v !== undefined && typeof v !== 'boolean') e.push(`effects[${i}] ${x.kind}.${k}: true or false`); }
            else if (typeof rule[0] === 'string') { if (!rule.includes(v)) e.push(`effects[${i}] ${x.kind}.${k}: one of ${rule.join(', ')}`); }
            else if (!within(v, rule)) e.push(`effects[${i}] ${x.kind}.${k}: ${rule[0]}-${rule[1]}`);
        }
        if (x.kind === 'barrier' && def.complexity && (x.base > BARRIER_CAP[def.complexity].base || x.coef > BARRIER_CAP[def.complexity].coef)) e.push(`effects[${i}] barrier: at most ${BARRIER_CAP[def.complexity].base} + stat ×${BARRIER_CAP[def.complexity].coef} at Complexity ${def.complexity}`);
        if (x.kind === 'heal' && def.complexity && (x.base > HEAL_CAP[def.complexity].base || x.coef > HEAL_CAP[def.complexity].coef)) e.push(`effects[${i}] heal: at most ${HEAL_CAP[def.complexity].base} + stat ×${HEAL_CAP[def.complexity].coef} at Complexity ${def.complexity}`);
        // no resource from nothing: what it restores is the other resource than its cost, never more than the cost
        if (x.kind === 'restore' && def.cost && (x.resource === def.cost.resource || x.amount > def.cost.amount)) e.push(`effects[${i}] restore: the other resource than its cost, at most its cost (${def.cost.amount})`);
        if (spec.on === 'attack' && !attack) e.push(`effects[${i}] ${x.kind}: only on an attack`);
        if (spec.on === 'self' && attack) e.push(`effects[${i}] ${x.kind}: not on an attack (an action of its own)`);
    }
    if (new Set(kinds).size !== kinds.length) e.push('effects: each kind once');
    if (kinds.some((k) => RESTORES.has(k)) && kinds.length > 1) e.push('effects: a heal or a restore is the Skill\'s only effect');
    if (kinds.includes('temp_def') && kinds.includes('barrier')) e.push('effects: a Barrier and a DEF bonus together are not supported');
    if (!attack && effects && !effects.length) e.push('a Skill without an attack needs an effect');
    if (!attack && kinds.length > 2) e.push('effects: at most two');
    if (attack) {
        if (typeof attack !== 'object') e.push('attack: an object');
        else {
            for (const k of Object.keys(attack)) if (!ATTACK_KEYS.has(k)) e.push(`attack: unknown field ${k}`);
            if (!['physical', 'magical'].includes(attack.damage_type)) e.push('attack.damage_type: physical or magical');
            const strikes = attack.strikes ?? 1;
            if (![1, 2, 3].includes(strikes)) e.push('attack.strikes: 1-3');
            const share = attack.share ?? 1;
            if (!within(share, [0.25, 1]) || (strikes > 1 && share > 1 / strikes + 1e-9)) e.push(`attack.share: at most ${strikes > 1 ? `1/${strikes}` : 1}`);
            const scaling = Array.isArray(attack.scaling) ? attack.scaling : null;
            if (!scaling || !scaling.length || scaling.length > 2 || scaling.some((t) => !t || Object.keys(t).some((k) => !['stat', 'coef'].includes(k)) || !DAMAGE_STATS.includes(t.stat) || !within(t.coef, [0.05, 3]))) e.push(`attack.scaling: 1-2 of {stat: ${DAMAGE_STATS.join('/')}, coef}`);
            else if (new Set(scaling.map((t) => t.stat)).size !== scaling.length) e.push('attack.scaling: each stat once');
            if (attack.ignores_partial_cover !== undefined && typeof attack.ignores_partial_cover !== 'boolean') e.push('attack.ignores_partial_cover: true or false');
            const range = def.range;
            if (!range || typeof range !== 'object' || Object.keys(range).some((k) => !['band', 'extra_band'].includes(k)) || !BANDS.includes(range.band) || (range.extra_band !== undefined && typeof range.extra_band !== 'boolean')) e.push(`range: {band: ${BANDS.join('/')}, extra_band?}`);
            else {
                if (!!range.extra_band !== kinds.includes('extra_band')) e.push('range.extra_band exactly with the extra_band effect');
                if (range.extra_band && range.band !== 'ENGAGED') e.push('extra_band: an ENGAGED attack');
                if (kinds.includes('area') && (range.band !== 'ENGAGED' || strikes > 1 || range.extra_band)) e.push('area: an ENGAGED single-strike attack around him');
            }
            if (cal && isNum(attack.base) && scaling) {
                // content.6: LONG range, ignoring Partial Cover, extra band movement, area, multi-hit and a rider consume
                // the same budget; at most one such feature per Complexity step, an area attack per target at three
                // quarters, multi-hit split over its strikes
                const features = [range?.band === 'LONG', !!attack.ignores_partial_cover, kinds.includes('extra_band'), kinds.includes('area'), strikes > 1, kinds.includes('post_attack_temp_def')].filter(Boolean).length;
                if (features > def.complexity) e.push(`${features} budget features (LONG, ignores cover, extra band, area, multi-hit, rider): at most ${def.complexity} at Complexity ${def.complexity}`);
                const k = kinds.includes('area') ? 0.75 : 1 / strikes;
                const coef = scaling.reduce((a, t) => a + (t.coef || 0), 0);
                if (!within(attack.base, [1, cal.base * k + 1e-9])) e.push(`attack.base ${attack.base}: at most ${roundHalfUp(cal.base * k * 100) / 100}${strikes > 1 ? ` per strike` : ''} at Complexity ${def.complexity}`);
                if (coef > cal.coef * k + 1e-9) e.push(`stat coefficients ${coef}: at most ${roundHalfUp(cal.coef * k * 100) / 100}${strikes > 1 ? ' per strike' : ''} at Complexity ${def.complexity}`);
            }
        }
    } else if (def.range !== undefined && def.range !== null) e.push('range: none for a Skill without an attack');
    return e;
}

const coefText = (c) => (Number.isInteger(c * 100) && !Number.isInteger(c * 10) ? c.toFixed(2) : String(c));

/** The runtime Skill a valid definition is (the shape of the content's Skills; src/combat.js executes it). */
function runtimeSkill(def) {
    const a = def.attack;
    const physical = a?.damage_type === 'physical';
    const skill = {
        id: def.id, name: def.name, class: null, basic: false, dynamic: true, category: def.category, rank: def.rank, complexity: def.complexity, tags: [...def.tags], aspects: [...(def.aspects || [])],
        type_text: a ? `${physical ? 'Physical' : 'Magical'} / ${def.range.band === 'ENGAGED' ? 'Melee' : 'Ranged'}` : def.category,
        cost: { resource: def.cost.resource, amount: def.cost.amount }, ammo: null,
        range: a ? { band: def.range.band, extra_band: !!def.range.extra_band, area: null } : null,
        attack: a ? { base: a.base, scaling: a.scaling.map((t) => ({ stat: t.stat, coef: t.coef, text: coefText(t.coef) })), uses: physical ? 'ATK' : 'MATK', share: a.share ?? 1, damage_type: a.damage_type, ...(a.ignores_partial_cover ? { ignores_partial_cover: true } : {}) } : null,
        strikes: a?.strikes ?? 1, effects: def.effects.map((x) => ({ ...x })), effect_text: def.description,
        target: def.target, activation: def.activation, origin: { ...def.origin }, ...(def.flavor ? { flavor: def.flavor } : {}),
    };
    const lines = [`${skill.name} [${skill.category}] (dynamic, ${def.origin.kind})`, `Rank: ${skill.rank}`, `Complexity: ${skill.complexity}`, `Tags: ${skill.tags.join(', ')}`, ...(skill.aspects.length ? [`Aspects: ${skill.aspects.join(', ')}`] : [])];
    if (a) lines.push(`Base Power: ${a.base}`, `Scaling: ${skill.attack.scaling.map((t) => `${t.stat} × ${t.text}`).join(' + ')}`, `Uses: ${skill.attack.share === 1 ? '' : `${skill.attack.share * 100}% of `}${skill.attack.uses}`, `Range: ${def.range.band}${def.range.extra_band ? ' after movement' : ''}`);
    lines.push(`Cost: ${skill.cost.amount} ${skill.cost.resource.toUpperCase()}`, `Effect: ${def.description}`);
    if (def.flavor) lines.push(`Description (appearance only, no mechanical effect): ${def.flavor}`);
    skill.source_text = lines.join('\n');
    return skill;
}

/**
 * Patch 9B-1: define a dynamic Skill for this campaign (ruleset 2). Returns {events, errors, skill}: a valid definition
 * is one skill.defined event, an invalid one nothing at all. It gives the Skill to no one (learnSkill).
 */
export function defineSkill(state, content, def) {
    if (rulesetOf(state) < 2) return { events: [], errors: ['dynamic Skills belong to the three-class rules (ruleset 2)'] };
    const errors = skillDefErrors(def, content, state);
    if (errors.length) return { events: [], errors };
    const skill = runtimeSkill(def);
    return { events: [{ t: 'skill.defined', d: { skill } }], errors: [], skill };
}

/** Patch 9B-1: give a known Skill (static or this campaign's) to a character who does not know it yet: skill.learned. */
export function learnSkill(state, content, who, skillId, why = null) {
    const sheet = state.entities?.[who]?.sheet;
    const skill = skillOf(content, skillId, state);
    if (!sheet) return { events: [], errors: [`${who} has no character sheet`] };
    if (!skill || skill.item || skill.weapon_attack) return { events: [], errors: [`no Skill ${skillId}`] };
    if (sheet.skills[skill.id]) return { events: [], errors: [`${who} knows ${skill.name} already`] };
    return { events: [{ t: 'skill.learned', d: { id: who, skill: skill.id, prof: 1, ...(why ? { why } : {}) } }], errors: [] };
}

// ------------------------------------------------------------------------------------------------ Proficiency
/** The PP one promotion of this Skill takes (Core #5: C1 75, C2 100, C3 150; a Skill without one is C1). */
export function promotionPp(content, skill) {
    const c = [1, 2, 3].includes(skill?.complexity) ? skill.complexity : 1;
    return content.rules.proficiency.promotion_progress[String(c)];
}

/** Core #5: the single highest Class Affinity of his class for the Skill's tags (otherwise the class's otherwise, 1). */
export function affinityFor(content, cls, skill) {
    const a = content.affinity?.[cls] || {};
    const other = a.otherwise ?? 1;
    const tags = skill?.tags || [];
    return tags.length ? Math.max(...tags.map((t) => a[t] ?? other)) : other;
}

/** The PP a qualifying use of the Skill gives him: the base award times his highest affinity, rounded half up. */
export function ppAward(content, sheet, skill) {
    return roundHalfUp((content.rules.proficiency.award?.base_pp ?? 12) * affinityFor(content, sheet.class, skill));
}

/** Where gained PP take a Skill: promotions by its Complexity, carry-over kept, P5 the end (no PP beyond it). */
export function advancePp(content, entry, skill, gained) {
    let prof = entry.prof || 1;
    let pp = entry.pp || 0;
    if (prof >= 5) return null;
    pp += gained;
    const need = promotionPp(content, skill);
    while (prof < 5 && pp >= need) { pp -= need; prof += 1; }
    if (prof >= 5) pp = 0;
    return { prof, pp };
}

/**
 * The Proficiency factor for a numeric non-damage effect (Core #5: P3 ×1.05, P4 ×1.10, P5 ×1.15; totals). Only under
 * ruleset 2 (review of 9B-1): a legacy campaign keeps the written values at every Proficiency.
 */
export function effectFactor(content, prof, ruleset = 1) {
    if (ruleset < 2) return 1;
    return content.rules.proficiency.levels[String(prof || 1)]?.effect ?? 1;
}

/** One numeric effect value at a Proficiency: the written value, its factor applied once, rounded half up when it applies. */
export function effectValue(content, eff, stats, prof, ruleset = 1) {
    const raw = eff.floor ? eff.base + Math.floor(stats[eff.stat] * eff.coef) : num(eff.base + stats[eff.stat] * eff.coef);
    const f = effectFactor(content, prof, ruleset);
    // Patch 9B-2: a whole number in every case (a Barrier of 6 + WIL 5×1.5 was 13.5 HP and left a fractional HP)
    return f === 1 ? roundHalfUp(raw) : roundHalfUp(raw * f);
}

/** A flat numeric effect at a Proficiency (Guarded Cut's DEF +4): its factor applied once, rounded half up. */
export function flatEffectValue(content, flat, prof, ruleset = 1) {
    const f = effectFactor(content, prof, ruleset);
    return f === 1 ? flat : roundHalfUp(flat * f);
}

/**
 * Patch 9B-2: what a heal or restore Skill gives him now, or null for any other Skill: {resource, amount, before,
 * after, max, full}. A heal is its numeric effect at his Proficiency (effectValue, ruleset 2 only grows it); a restore
 * is its amount, never more than the cost this use pays (so no two Skills turn resources round in a gaining cycle);
 * neither goes past the maximum. full: nothing to restore (the use is refused before anything is paid).
 * @param {{stats: object, pools: {hp, mp, sta}, max: {hp, mp, sta}}} who
 */
export function restoration(content, skill, prof, ruleset, who, paid) {
    const eff = (skill?.effects || []).find((e) => RESTORES.has(e.kind));
    if (!eff) return null;
    const resource = eff.kind === 'heal' ? 'hp' : eff.resource;
    const amount = eff.kind === 'heal' ? effectValue(content, eff, who.stats, prof, ruleset) : Math.min(eff.amount, paid);
    const before = who.pools[resource];
    const max = who.max[resource];
    return { resource, amount, before, after: Math.min(max, before + amount), max, full: before >= max };
}

/** The progress events of a gain (none when nothing is gained or the Skill is at P5). */
function progressEvents(content, state, skillId, gained, why, key) {
    const sheet = state.entities.pc.sheet;
    const entry = sheet.skills[skillId];
    const skill = skillOf(content, skillId, state);
    if (!entry || !skill || gained <= 0) return [];
    const to = advancePp(content, entry, skill, gained);
    if (!to) return [];
    return [{ t: 'skill.progress', d: { id: 'pc', skill: skillId, name: skill.name, gained, from: { prof: entry.prof || 1, pp: entry.pp || 0 }, to, need: promotionPp(content, skill), why, key } }];
}

const DEFENSE = new Set(['temp_def', 'temp_mdef', 'barrier', 'incoming_damage_reduction', 'damage_reduction_next']);

/**
 * Patch 9B-1: note what a combat record shows of his use of a Skill (src/combat.js runCombat, every record): an attack
 * on a foe, a defense a foe then tested by attacking him, a step that moved him, a feint his next attack used. Only in a
 * campaign of ruleset 2; kept on the encounter (its log is cut to the last 20 records).
 */
export function noteUse(ctx, r) {
    const { enc } = ctx;
    if (!r || r.illegal || rulesetOf(ctx.state) < 2) return;
    const pp = (enc.pp ||= { used: {}, wait: null, threatened: false });
    const hostile = (id) => enc.combatants[id]?.side === 'hostile';
    if (r.actor !== 'pc') {
        const onHim = r.kind === 'attack' && (r.strikes || []).some((s) => s.target === 'pc');
        if (onHim && hostile(r.actor)) {
            pp.threatened = true;
            if (pp.wait?.kind === 'defense') { pp.used[pp.wait.skill] ||= 'a defense under attack'; pp.wait = null; }
            trialNote(ctx, pp, r);
        }
        return;
    }
    const waiting = pp.wait;
    pp.wait = null;
    const skill = r.skill ? skillOf(ctx.content, r.skill, ctx.state) : null;
    if (waiting?.kind === 'buff' && r.kind === 'attack') pp.used[waiting.skill] ||= 'a feint his next attack used';
    if (!skill || skill.item || skill.weapon_attack || !enc.combatants.pc.fixed.actions[skill.id] || enc.combatants.pc.fixed.actions[skill.id].weapon) return;
    if (r.kind === 'attack' && (r.strikes || []).some((s) => hostile(s.target))) pp.used[skill.id] ||= 'an attack on a foe';
    else if (r.kind === 'skill') {
        const kinds = (skill.effects || []).map((e) => e.kind);
        if (kinds.includes('reposition') && r.reposition) pp.used[skill.id] ||= 'a step that moved him';
        // Patch 9B-2: a heal or a restore that gave him something back is its effect, shown
        if (r.restore?.amount > 0) pp.used[skill.id] ||= `a ${r.restore.resource === 'hp' ? 'heal' : 'restore'} that gave him ${r.restore.amount} ${r.restore.resource.toUpperCase()}`;
        if (kinds.some((k) => DEFENSE.has(k))) pp.wait = { skill: skill.id, kind: 'defense' };
        else if (kinds.includes('next_attack_buff')) pp.wait = { skill: skill.id, kind: 'buff' };
    }
}

/**
 * Patch 9C-2c: what a foe's strikes did to him, for the evidence of an outstanding fight (src/v4/passive_growth.js
 * trialEvidence): his HP when the first foe struck him and the lowest any strike left him at (percent of his maximum),
 * the foes who struck him, and the damage by type. Only the foes' own strikes count: no wound of his own making.
 */
function trialNote(ctx, pp, r) {
    const pc = ctx.enc.combatants.pc;
    const max = pc.fixed.max_hp || 1;
    const t = (pp.trial ||= { start: null, low: 100, foes: [], taken: { physical: 0, magical: 0 } });
    const foe = ctx.enc.combatants[r.actor];
    const magical = foe?.model === 'creature' ? foe.fixed.attack?.damage_type === 'magical' : skillOf(ctx.content, r.skill, ctx.state)?.attack?.damage_type === 'magical';
    for (const s of (r.strikes || []).filter((x) => x.target === 'pc' && Number.isFinite(x.hp_after))) {
        if (t.start === null) t.start = Math.floor((s.hp_before * 100) / max);
        t.low = Math.min(t.low, Math.floor((s.hp_after * 100) / max));
        t.taken[magical ? 'magical' : 'physical'] += s.final || 0;
    }
    if (!t.foes.includes(r.actor)) t.foes.push(r.actor);
}

/**
 * Patch 9B-1 (Patch 9C-1: shared with the Learning Progress of a fight, src/v4/growth.js): a fight that is over counts
 * as a real challenge: ruleset 2, he neither died nor ran, a foe at most `challenge.levels_below` Levels below him took
 * part and a foe attacked him.
 */
export function fightQualifies(state, content, enc) {
    if (rulesetOf(state) < 2 || !enc.pp || enc.combatants.pc.current.defeated || enc.combatants.pc.current.escaped) return false;
    const rule = content.rules.proficiency.award || {};
    const lvl = enc.combatants.pc.fixed.level;
    const below = rule.challenge?.levels_below ?? 2;
    const worthy = Object.values(enc.combatants).some((c) => c.side === 'hostile' && (c.fixed.level ?? 0) >= lvl - below);
    return worthy && !(rule.challenge?.foe_attack !== false && !enc.pp.threatened);
}

/**
 * Patch 9B-1: the Proficiency Progress of a fight that is over (src/combat.js endEncounterEvents): for each Skill he
 * used meaningfully, once, when the fight was a real challenge: a foe at most `challenge.levels_below` Levels below him
 * and a foe's attack on him. None when he died or ran from it, none in a legacy campaign.
 */
export function fightProgress(state, content, enc) {
    if (!fightQualifies(state, content, enc)) return [];
    const sheet = state.entities.pc.sheet;
    const out = [];
    const after = { ...sheet, skills: { ...sheet.skills } };
    const view = { ...state, entities: { ...state.entities, pc: { ...state.entities.pc, sheet: after } } };
    for (const [sid, why] of Object.entries(enc.pp.used)) {
        const skill = skillOf(content, sid, state);
        if (!skill || !sheet.skills[sid] || state.pp_keys?.[`fight:${enc.id}:${sid}`]) continue;
        const ev = progressEvents(content, view, sid, ppAward(content, sheet, skill), `${why} in ${enc.id}`, `fight:${enc.id}:${sid}`);
        for (const e of ev) after.skills[sid] = { ...after.skills[sid], ...e.d.to };
        out.push(...ev);
    }
    return out;
}

/**
 * Patch 9B-1: the Proficiency Progress of a Skill used on a thing outside a fight with a booked check of real
 * difficulty (src/engine.js worldUse): once per Skill and thing, success or failure. Not in a legacy campaign.
 */
export function checkProgress(state, content, skillId, featureId) {
    if (rulesetOf(state) < 2) return [];
    const key = `check:${featureId}:${skillId}`;
    if (state.pp_keys?.[key]) return [];
    const skill = skillOf(content, skillId, state);
    if (!skill || !state.entities.pc.sheet.skills[skillId]) return [];
    return progressEvents(content, state, skillId, ppAward(content, state.entities.pc.sheet, skill), `a check of real difficulty on ${featureId}`, key);
}

/**
 * Patch 9C-1: the Proficiency Progress of practising a Skill he knows (src/v4/growth.js): pp times his highest
 * affinity, rounded half up, once per key (one Skill and game day). Not in a legacy campaign.
 */
export function practiceProgress(state, content, skillId, pp, why, key) {
    if (rulesetOf(state) < 2 || state.pp_keys?.[key]) return [];
    const skill = skillOf(content, skillId, state);
    const sheet = state.entities.pc.sheet;
    if (!skill || !sheet.skills[skillId]) return [];
    return progressEvents(content, state, skillId, roundHalfUp(pp * affinityFor(content, sheet.class, skill)), why, key);
}
