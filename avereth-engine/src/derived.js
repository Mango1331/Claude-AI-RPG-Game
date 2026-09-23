// Derived character values (Core #2, #6, #10, #11). Pure functions of a character sheet + content.
import { num } from './util.js';

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

/**
 * Derived values for a core-stat character sheet.
 * sheet: {level, stats, equipment: {slot: itemRef}, bonuses?: {atk, matk, def, mdef}, temp?: {def, mdef}}
 */
export function deriveCharacter(sheet, content) {
    const r = content.rules.derived;
    const s = sheet.stats;
    const out = {
        maxHp: r.max_hp.base + sheet.level * r.max_hp.per_level + s.VIT * r.max_hp.per_vit,
        maxMp: s.INT * r.max_mp.per_int + s.WIL * r.max_mp.per_wil,
        maxSta: r.max_sta_human,
        init: s.AGI + Math.floor(s.PER / 2),
        baseDef: Math.floor(s.VIT / r.base_def_divisor),
        baseMdef: Math.floor(s.WIL / r.base_mdef_divisor),
        atk: 0, matk: 0, gearDef: 0, gearMdef: 0,
        baseHit: num(content.rules.hit.character_base + s.PER * content.rules.hit.per_factor),
        crit: num(content.rules.crit.character_base + s.PER / content.rules.crit.per_divisor),
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
    const b = sheet.bonuses || {};
    out.atk += b.atk || 0;
    out.matk += b.matk || 0;
    out.def = out.baseDef + out.gearDef + (b.def || 0);
    out.mdef = out.baseMdef + out.gearMdef + (b.mdef || 0);
    return out;
}

/** Raw Power of an action for a character (Core #11): Base + exact scaling terms + ATK/MATK share. Unrounded. */
export function rawPower(skill, stats, derived) {
    const a = skill.attack;
    let raw = a.base;
    for (const t of a.scaling) raw += stats[t.stat] * t.coef;
    raw += (a.uses === 'MATK' ? derived.matk : derived.atk) * a.share;
    return num(raw);
}

/** Human readable Raw formula with the actual numbers, e.g. "16 + AGI 6×0.5 + PER 6×1.375 + ATK 6 = 33.25". */
export function rawPowerText(skill, stats, derived) {
    const a = skill.attack;
    const parts = [String(a.base)];
    for (const t of a.scaling) parts.push(`${t.stat} ${stats[t.stat]}×${t.text ?? t.coef}`);
    const power = a.uses === 'MATK' ? derived.matk : derived.atk;
    parts.push(a.share === 1 ? `${a.uses} ${power}` : `${Math.round(a.share * 100)}% ${a.uses} ${power}`);
    return `${parts.join(' + ')} = ${rawPower(skill, stats, derived)}`;
}
