// Patch 9B-2 (docs/PATCH9B2_PASSIVES_EFFECTS_NPC_DEFENSE.md): dynamic Passives. A Passive is no action: it acts for
// good (scope "always": derived values, Skill costs, resistances) or in a fight only (scope "combat"), there under a
// condition the engine checks on the fight's state when it matters (src/combat.js). Like a dynamic Skill (src/skills.js)
// a definition belongs to one campaign (state.passive_defs, booked by passive.defined) and is fixed once booked; it
// gives it to no one: passive.gained does, and copies the fixed definition into the sheet (sheet.passives), so the
// derived values read the sheet alone (src/derived.js deriveCharacter) and a snapshot, a reload or a replay computes
// the same numbers from it, never twice. Only the engine books them (src/v4/ownership.js); ruleset 2 only.
import { rulesetOf } from './content.js';
import { disciplineTags } from './skills.js';
import { normText, num, roundHalfUp } from './util.js';

const TOP_KEYS = new Set(['id', 'name', 'description', 'origin', 'rank', 'scope', 'condition', 'effects']);
const STATS = ['ATK', 'MATK', 'DEF', 'MDEF'];
const POOLS = ['hp', 'mp', 'sta'];
const CONDITIONS = { hp_at_most_pct: { pct: [25, 50] }, foe_engaged: {} };
// what each effect kind takes, and the scopes it may have (a maximum or a cost changes for good, never inside a fight)
const EFFECTS = {
    stat_bonus: { scopes: ['always', 'combat'], fields: { stat: STATS, value: 'per' } },
    max_bonus: { scopes: ['always'], fields: { resource: POOLS, value: 'per' } },
    cost_reduction: { scopes: ['always'], fields: { resource: ['sta', 'mp'], tag: 'tag', pct: 'per' } },
    resist: { scopes: ['always', 'combat'], fields: { damage_type: ['physical', 'magical'], pct: 'per' } },
};

/** The bounds of rules.json passive_design: per Passive (F-rank) and in total over all Passives of one person. */
export function passiveRules(content) {
    return content.rules.passive_design || {
        per: { stat_bonus: 2, max_bonus: 10, cost_reduction: 10, resist: 10 },
        total: { stat_bonus: 4, max_bonus: 20, cost_reduction: 20, resist: 20 },
    };
}

const isInt = (v) => Number.isInteger(v);
const plain = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[<>{}`$\\]/.test(v);
const keyOf = (x) => `${x.kind}:${x.stat || x.resource || x.damage_type}:${x.tag || ''}`;

/** Patch 9B-2: the errors of a proposed dynamic Passive (empty: valid). Closed like a Skill's; F-rank only. */
export function passiveDefErrors(def, content, state = null) {
    const e = [];
    if (!def || typeof def !== 'object' || Array.isArray(def)) return ['a Passive definition is an object'];
    for (const k of Object.keys(def)) if (!TOP_KEYS.has(k)) e.push(`unknown field ${k}`);
    if (typeof def.id !== 'string' || !/^dyn\.passive_[a-z][a-z0-9_]{2,40}$/.test(def.id)) e.push('id: "dyn.passive_" and a lower-case name');
    else if (state?.passive_defs?.[def.id] || state?.skill_defs?.[def.id] || content.skills.has(def.id)) e.push(`id ${def.id} exists`);
    if (!plain(def.name, 40) || !/^[A-Za-z][A-Za-z' -]{1,39}$/.test(def.name)) e.push('name: 2-40 letters');
    else if (Object.values(state?.passive_defs || {}).some((p) => normText(p.name) === normText(def.name))) e.push(`name ${def.name} is the name of a Passive that exists`);
    if (!plain(def.description, 300)) e.push('description: up to 300 characters');
    if (!def.origin || typeof def.origin !== 'object' || !plain(def.origin.kind, 40) || Object.keys(def.origin).some((k) => !['kind', 'note'].includes(k)) || (def.origin.note !== undefined && !plain(def.origin.note, 200))) e.push('origin: {kind, note?}');
    if (def.rank !== 'F') e.push(`rank ${def.rank}: only F-rank Passives have calibrated bounds yet`);
    if (!['always', 'combat'].includes(def.scope)) e.push('scope: always or combat');
    const c = def.condition ?? null;
    if (c !== null) {
        const spec = CONDITIONS[c?.kind];
        if (!spec) e.push(`condition: one of ${Object.keys(CONDITIONS).join(', ')}`);
        else {
            for (const k of Object.keys(c)) if (k !== 'kind' && !(k in spec)) e.push(`condition ${c.kind}: unknown field ${k}`);
            for (const [k, [lo, hi]] of Object.entries(spec)) if (!isInt(c[k]) || c[k] < lo || c[k] > hi) e.push(`condition ${c.kind}.${k}: ${lo}-${hi}`);
        }
        if (def.scope !== 'combat') e.push('condition: only with scope combat (it is checked in a fight)');
    }
    const per = passiveRules(content).per;
    const tags = disciplineTags(content);
    if (!Array.isArray(def.effects) || !def.effects.length || def.effects.length > 2) e.push('effects: 1-2');
    for (const [i, x] of (Array.isArray(def.effects) ? def.effects : []).entries()) {
        const spec = EFFECTS[x?.kind];
        if (!spec) { e.push(`effects[${i}]: kind ${x?.kind} is not supported`); continue; }
        for (const k of Object.keys(x)) if (k !== 'kind' && !(k in spec.fields)) e.push(`effects[${i}] ${x.kind}: unknown field ${k}`);
        for (const [k, rule] of Object.entries(spec.fields)) {
            const v = x[k];
            if (rule === 'per') { if (!isInt(v) || v < 1 || v > per[x.kind]) e.push(`effects[${i}] ${x.kind}.${k}: 1-${per[x.kind]}`); }
            else if (rule === 'tag') { if (v !== undefined && !tags.includes(v)) e.push(`effects[${i}] ${x.kind}.tag: one of ${tags.join(', ')}`); }
            else if (!rule.includes(v)) e.push(`effects[${i}] ${x.kind}.${k}: one of ${rule.join(', ')}`);
        }
        if (def.scope && !spec.scopes.includes(def.scope)) e.push(`effects[${i}] ${x.kind}: only with scope ${spec.scopes.join(' or ')}`);
    }
    if (Array.isArray(def.effects) && new Set(def.effects.map((x) => keyOf(x || {}))).size !== def.effects.length) e.push('effects: each the same bonus once');
    return e;
}

/** Patch 9B-2: define a dynamic Passive for this campaign (ruleset 2): one passive.defined event or only errors. */
export function definePassive(state, content, def) {
    if (rulesetOf(state) < 2) return { events: [], errors: ['dynamic Passives belong to the three-class rules (ruleset 2)'] };
    const errors = passiveDefErrors(def, content, state);
    if (errors.length) return { events: [], errors };
    const passive = {
        id: def.id, name: def.name, description: def.description, origin: { ...def.origin }, rank: def.rank, dynamic: true,
        scope: def.scope, condition: def.condition ? { ...def.condition } : null, effects: def.effects.map((x) => ({ ...x })),
    };
    return { events: [{ t: 'passive.defined', d: { passive } }], errors: [], passive };
}

/** Patch 9B-2: give a defined Passive to a character who does not have it yet: passive.gained (the authorised step). */
export function gainPassive(state, content, who, passiveId, why = null) {
    const sheet = state.entities?.[who]?.sheet;
    if (rulesetOf(state) < 2) return { events: [], errors: ['dynamic Passives belong to the three-class rules (ruleset 2)'] };
    if (!sheet) return { events: [], errors: [`${who} has no character sheet`] };
    const p = state.passive_defs?.[passiveId];
    if (!p) return { events: [], errors: [`no Passive ${passiveId}`] };
    if (sheet.passives?.[passiveId]) return { events: [], errors: [`${who} has ${p.name} already`] };
    return { events: [{ t: 'passive.gained', d: { id: who, passive: passiveId, ...(why ? { why } : {}) } }], errors: [] };
}

/** The Passives of a sheet, in the order gained. */
export const passivesOf = (sheet) => Object.values(sheet?.passives || {});

const capped = (sum, cap) => Math.min(sum, cap);

/**
 * Patch 9B-2: the Passives' lasting bonuses of a sheet (scope always), summed and capped in total per bonus
 * (passive_design.total): stat {ATK, MATK, DEF, MDEF}, max {hp, mp, sta}, resist {physical, magical}, and the cost
 * reductions as they stand ([{resource, tag, pct}], capped where a Skill's cost is reckoned: costReductionPct).
 */
export function passiveTotals(sheet, content) {
    const total = passiveRules(content).total;
    const out = { stat: { ATK: 0, MATK: 0, DEF: 0, MDEF: 0 }, max: { hp: 0, mp: 0, sta: 0 }, resist: { physical: 0, magical: 0 }, cost: [] };
    for (const p of passivesOf(sheet)) {
        if (p.scope !== 'always') continue;
        for (const x of p.effects) {
            if (x.kind === 'stat_bonus') out.stat[x.stat] += x.value;
            else if (x.kind === 'max_bonus') out.max[x.resource] += x.value;
            else if (x.kind === 'resist') out.resist[x.damage_type] += x.pct;
            else if (x.kind === 'cost_reduction') out.cost.push({ resource: x.resource, tag: x.tag || null, pct: x.pct, name: p.name });
        }
    }
    for (const k of STATS) out.stat[k] = capped(out.stat[k], total.stat_bonus);
    for (const k of POOLS) out.max[k] = capped(out.max[k], total.max_bonus);
    for (const k of ['physical', 'magical']) out.resist[k] = capped(out.resist[k], total.resist);
    return out;
}

/**
 * Patch 9B-2: the percent a Skill's cost is lowered by his Passives: every reduction of its resource, all of them or
 * those of one of its tags, summed once and capped (passive_design.total.cost_reduction).
 */
export function costReductionPct(content, mods, skill) {
    if (!skill?.cost || !mods?.length) return 0;
    const sum = mods.filter((m) => m.resource === skill.cost.resource && (!m.tag || (skill.tags || []).includes(m.tag))).reduce((a, m) => a + m.pct, 0);
    return capped(sum, passiveRules(content).total.cost_reduction);
}

/** The combat snapshot's view of his Passives (src/combat.js characterCombatant), or null without any. */
export function passiveSnapshot(sheet, content) {
    const list = passivesOf(sheet);
    if (!list.length) return null;
    const t = passiveTotals(sheet, content);
    return {
        always: t.stat, resist: t.resist, cost: t.cost,
        combat: list.filter((p) => p.scope === 'combat').map((p) => ({ name: p.name, condition: p.condition, effects: p.effects })),
    };
}

/**
 * Patch 9B-2: does a combat Passive's condition hold for this combatant now (its own HP, a foe ENGAGED with it)?
 * @param {(c: object) => boolean} engagedFoe whether an active opponent stands ENGAGED with it
 */
export function conditionHolds(condition, c, engagedFoe) {
    if (!condition) return true;
    if (condition.kind === 'hp_at_most_pct') return c.current.hp * 100 <= condition.pct * c.fixed.max_hp;
    if (condition.kind === 'foe_engaged') return engagedFoe(c);
    return false;
}

/**
 * Patch 9B-2: what a combatant's combat Passives give now, on top of the lasting ones, within the same total caps:
 * {stat: {ATK, MATK, DEF, MDEF}, resist: {physical, magical}, names}. Nothing for a snapshot without Passives.
 */
export function combatPassive(content, c, engagedFoe) {
    const p = c.fixed.passive;
    const out = { stat: { ATK: 0, MATK: 0, DEF: 0, MDEF: 0 }, resist: { physical: 0, magical: 0 }, names: [] };
    if (!p) return out;
    const total = passiveRules(content).total;
    for (const x of p.combat || []) {
        if (!conditionHolds(x.condition, c, engagedFoe)) continue;
        out.names.push(x.name);
        for (const f of x.effects) {
            if (f.kind === 'stat_bonus') out.stat[f.stat] += f.value;
            else if (f.kind === 'resist') out.resist[f.damage_type] += f.pct;
        }
    }
    for (const k of STATS) out.stat[k] = Math.max(0, capped(out.stat[k], total.stat_bonus - (p.always?.[k] || 0)));
    for (const k of ['physical', 'magical']) out.resist[k] = capped((p.resist?.[k] || 0) + out.resist[k], total.resist);
    return out;
}

/** A Passive in a few words for #class and the panels: "Iron Hide (always): DEF +2, Max HP +10". */
export function passiveText(p) {
    const fx = p.effects.map((x) => {
        if (x.kind === 'stat_bonus') return `${x.stat} +${x.value}`;
        if (x.kind === 'max_bonus') return `Max ${x.resource.toUpperCase()} +${x.value}`;
        if (x.kind === 'cost_reduction') return `${x.tag ? `${x.tag} ` : ''}${x.resource.toUpperCase()} costs -${x.pct}%`;
        return `${x.damage_type} damage taken -${x.pct}%`;
    }).join(', ');
    const when = p.condition ? (p.condition.kind === 'hp_at_most_pct' ? `in a fight at ${p.condition.pct}% HP or less` : 'in a fight with a foe ENGAGED') : p.scope === 'combat' ? 'in a fight' : 'always';
    return `${p.name} (${when}): ${fx}`;
}

/**
 * Patch 9B-2: what a Skill costs at a Proficiency with these cost reductions of his Passives: the written cost, the
 * Proficiency's cost factor and the reduction applied together and rounded once (half up). Without reductions exactly
 * the cost of before.
 */
export function skillCostAmount(content, skill, prof, mods = null) {
    if (!skill?.cost) return 0;
    const f = content.rules.proficiency.levels[String(prof || 1)]?.cost ?? 1;
    const pct = costReductionPct(content, mods, skill);
    return pct ? roundHalfUp(num(skill.cost.amount * f * (1 - pct / 100))) : roundHalfUp(skill.cost.amount * f);
}
