// Derived character values (Core #2, #6). Pure functions of a character sheet + content. Combat V3: no Base Hit and
// no Crit Chance (legal attacks connect; only a true Ambush crits), and PER is not part of Initiative.
import { num, normText } from './util.js';
import { skillOf } from './content.js';
import { passiveTotals } from './passives.js';

export function rankOf(level, content) {
    for (const b of content.rules.ranks.bands) if (level >= b.min && level <= b.max) return b.rank;
    return level < 1 ? 'F' : 'S';
}

export function rankIndex(rank, content) {
    return content.rules.ranks.order.indexOf(rank);
}

/** Resolve an equipment slot value (content item id or inline custom item) to an item object. */
export function itemOf(ref, content) {
    if (!ref) return null;
    if (typeof ref === 'string') return content.items.get(ref) || { id: ref, name: ref };
    return ref;
}

/** The weapon a sheet holds (its weapon slot), or null. */
export function weaponOf(sheet, content) {
    return Object.values(sheet?.equipment || {}).map((r) => itemOf(r, content)).find((it) => it && it.slot === 'weapon') || null;
}

/**
 * Patch 9A: the plain attack of the weapon a character holds, when its class Basic Attack does not use that weapon's
 * family (a Mage or a Warrior with a bow: Bow Shot). Any class can use it; it is no learned Skill (not in sheet.skills,
 * no Proficiency of its own) and comes and goes with the weapon. Only under the rules of Patch 9A (ruleset 2): a legacy
 * campaign keeps its classes' own attacks.
 */
export function weaponAttackOf(sheet, content, ruleset) {
    if (!content.start?.rulesets?.[String(ruleset)]?.weapon_attacks) return null;
    const weapon = weaponOf(sheet, content);
    const id = weapon?.family ? content.weaponAttacks?.[weapon.family] : null;
    const skill = id ? content.skills.get(id) : null;
    if (!skill) return null;
    const basic = content.skills.get(content.classes.get(sheet.class)?.basic_attack);
    if (basic?.weapon_families?.includes(weapon.family)) return null;
    return { skill, weapon };
}

/**
 * The actions a character can take in a fight: its learned Skills (known to the content) and, Patch 9A, the plain attack
 * of the weapon it holds ({prof: 1, pp: 0, weapon: name}; src/combat.js keeps them in the encounter snapshot).
 */
export function actionsOf(sheet, content, ruleset, state = null) {
    // Patch 9B-1: a learned Skill of the campaign's own definitions too (src/content.js skillOf)
    const out = Object.fromEntries(Object.entries(sheet?.skills || {}).filter(([sid]) => skillOf(content, sid, state)));
    const w = weaponAttackOf(sheet, content, ruleset);
    if (w && !out[w.skill.id]) out[w.skill.id] = { prof: 1, pp: 0, weapon: w.weapon.name };
    return out;
}

// an attack with the weapon he holds, named: the weapon by its name, its family's words, a bow by its arrows or a shot
const WEAPON_USE = { bow: /\b(?:bows?|arrows?|shoot(?:s|ing)?|shot|loos(?:e|es|ing)|nocks?)\b/ };

/**
 * Patch 9A: the weapon's plain attack when the words of an attack name the weapon he holds ("I shoot the wolf", "with my
 * shortbow"); null when it has none or they do not (then an attack that names no skill is his class Basic Attack).
 */
export function weaponAttackNamed(sheet, content, ruleset, text) {
    const w = weaponAttackOf(sheet, content, ruleset);
    if (!w) return null;
    const t = normText(text);
    const words = [...normText(w.weapon.name).split(/[^a-z]+/), ...(content.npc?.weapon_words?.[w.weapon.family] || []).map(normText)]
        .filter((x) => x.length > 2 && x !== 'starter' && x !== 'the');
    const named = words.some((x) => new RegExp(`(^|[^a-z])${x.replace(/[^a-z ]/g, '')}($|[^a-z])`).test(t));
    return named || WEAPON_USE[w.weapon.family]?.test(t) ? w.skill : null;
}

/** Core #24 (V3): Initiative = floor(1.5 × AGI). */
export function initiativeOf(agi, content) {
    const r = content.rules.derived.init;
    const v = agi * r.agi_factor;
    return r.floor ? Math.floor(v) : v;
}

/**
 * Derived values for a core-stat character sheet.
 * sheet: {level, stats, equipment: {slot: itemRef}, bonuses?: {atk, matk, def, mdef}, passives?: {id: Passive}, temp?: {def, mdef}}
 */
export function deriveCharacter(sheet, content) {
    const r = content.rules.derived;
    const s = sheet.stats;
    const out = {
        maxHp: r.max_hp.base + sheet.level * r.max_hp.per_level + s.VIT * r.max_hp.per_vit,
        maxMp: s.INT * r.max_mp.per_int + s.WIL * r.max_mp.per_wil,
        maxSta: r.max_sta_human,
        init: initiativeOf(s.AGI, content),
        baseDef: Math.floor(s.VIT / r.base_def_divisor),
        baseMdef: Math.floor(s.WIL / r.base_mdef_divisor),
        atk: 0, matk: 0, gearDef: 0, gearMdef: 0,
        rank: rankOf(sheet.level, content),
    };
    for (const ref of Object.values(sheet.equipment || {})) {
        const it = itemOf(ref, content);
        if (!it) continue;
        out.atk += it.atk || 0;
        out.matk += it.matk || 0;
        out.gearDef += it.def || 0;
        out.gearMdef += it.mdef || 0;
    }
    // explicit bonuses (sheet.bonuses) and, Patch 9B-2, the lasting bonuses of his Passives: one path for every derived
    // value, read from the sheet alone (a reload, a replay or a new fight snapshot computes them once, the same)
    const b = sheet.bonuses || {};
    const p = passiveTotals(sheet, content);
    out.atk += (b.atk || 0) + p.stat.ATK;
    out.matk += (b.matk || 0) + p.stat.MATK;
    out.def = out.baseDef + out.gearDef + (b.def || 0) + p.stat.DEF;
    out.mdef = out.baseMdef + out.gearMdef + (b.mdef || 0) + p.stat.MDEF;
    out.maxHp += p.max.hp;
    out.maxMp += p.max.mp;
    out.maxSta += p.max.sta;
    return out;
}

/** Raw Power of an action for a character (Core #11): Base + exact scaling terms + ATK/MATK share. Unrounded. */
export function rawPower(skill, stats, derived) {
    const a = skill.attack;
    let raw = a.base;
    for (const t of a.scaling) raw += stats[t.stat] * t.coef;
    if (a.share) raw += (a.uses === 'MATK' ? derived.matk : derived.atk) * a.share;
    return num(raw);
}

/** Human readable Raw formula with the actual numbers, e.g. "16 + AGI 6×1.875 + ATK 6 = 33.25". */
export function rawPowerText(skill, stats, derived) {
    const a = skill.attack;
    const parts = [String(a.base)];
    for (const t of a.scaling) parts.push(`${t.stat} ${stats[t.stat]}×${t.text ?? t.coef}`);
    const power = a.uses === 'MATK' ? derived.matk : derived.atk;
    // an item's own fixed power (hotfix c.6.6.18: share 0) adds nothing of its user's
    if (a.share) parts.push(a.share === 1 ? `${a.uses} ${power}` : `${Math.round(a.share * 100)}% ${a.uses} ${power}`);
    else parts[0] = `${a.base} (the item's own power)`;
    return `${parts.join(' + ')} = ${rawPower(skill, stats, derived)}`;
}
