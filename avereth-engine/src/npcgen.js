// Deterministic combat profiles for NPCs and creatures.
//  * Creatures: Content #7 F1 anchors + Level scaling (+ Elite/Boss #8). No Human stats, no Crit, no STA.
//  * Humans: core-stat characters built from the PROPOSED npc_templates.json (Lore #1: most adults have a Base
//    Class; Content #0 class growth; Core #3 +5 free points per Level). This replaces the ad-hoc improvisation
//    observed in Testrun-v1.
import { rankOf, deriveCharacter } from './derived.js';
import { weaponFamily } from './content.js';
import { roundHalfUp } from './util.js';

export function scaleCreature(anchor, level, type, content) {
    const g = level - 1;
    const sc = content.monsters.scaling;
    const p = {
        hp: roundHalfUp(anchor.hp * (1 + sc.hp.coef * g)),
        atk: roundHalfUp(anchor.atk * (1 + sc.atk.coef * g)),
        def: Math.max(0, roundHalfUp((anchor.def + 1) * (1 + sc.def.coef * g) - 1)),
        mdef: Math.max(0, roundHalfUp((anchor.mdef + 1) * (1 + sc.mdef.coef * g) - 1)),
        hit: Math.min(sc.hit.cap, anchor.hit + sc.hit.per_15_levels * Math.floor(g / 15)),
        init: roundHalfUp(anchor.init * (1 + sc.init.coef * g)),
    };
    if (type === 'elite' || type === 'boss') {
        const m = content.monsters[type];
        p.hp = roundHalfUp(p.hp * m.hp);
        p.atk = roundHalfUp(p.atk * m.atk);
        p.def = roundHalfUp(p.def * m.def);
        p.mdef = roundHalfUp(p.mdef * m.mdef);
        p.hit = Math.min(95, p.hit + m.hit_pp);
        p.init = p.init + m.init;
    }
    return {
        model: 'creature', anchor: anchor.id, body_plan: anchor.name, level, rank: rankOf(level, content), type: type || 'normal',
        max_hp: p.hp, atk: p.atk, def: p.def, mdef: p.mdef, hit: p.hit, init: p.init,
        attack: { name: anchor.attack, damage_type: anchor.damage_type, range: anchor.range }, crit: 'none',
        temperament: anchor.temperament,
    };
}

/** Level for a newly instantiated creature without an established Level (Content #7). */
export function chooseCreatureLevel(areaContext, content, dice) {
    const band = content.monsters.level_selection.find((b) => b.context === areaContext)
        || content.monsters.level_selection.find((b) => b.context === 'unknown');
    return band.min === band.max ? band.min : dice.int(band.min, band.max, 'creature level');
}

function distributeFreePoints(priority, points) {
    const out = {};
    const pattern = [2, 2, 1];
    let left = points;
    let i = 0;
    while (left > 0) {
        const stat = priority[i % 3];
        const give = Math.min(left, pattern[i % 3]);
        out[stat] = (out[stat] || 0) + give;
        left -= give;
        i += 1;
    }
    return out;
}

/**
 * Build a human NPC character sheet from a template.
 * overrides: {level, class, weapon: {name, atk|matk, family}, armor: {def, mdef}}
 */
export function humanSheet(template, overrides, content) {
    const cls = content.classes.get(overrides.class || template.class || 'warrior');
    const level = overrides.level || template.level.default;
    const stats = { ...content.rules.human_baseline };
    delete stats.src;
    for (const f of cls.favored) stats[f] += level; // +1 at Level 1 and +1 on each later Level
    const priority = template.priority || template.priority_by_class?.[cls.id] || ['STR', 'VIT', 'AGI'];
    const free = distributeFreePoints(priority, (level - 1) * content.rules.progression.free_points_per_level);
    for (const [k, v] of Object.entries(free)) stats[k] += v;
    const weapon = overrides.weapon || template.weapon || null;
    const armor = overrides.armor === undefined ? template.armor : overrides.armor;
    const equipment = {};
    if (weapon) equipment.weapon = { id: `npc_weapon`, name: weapon.name, slot: 'weapon', family: weapon.family, atk: weapon.atk || 0, matk: weapon.matk || 0 };
    if (armor) equipment.armor = { id: 'npc_armor', name: armor.name || 'Armor', slot: 'armor', def: armor.def || 0, mdef: armor.mdef || 0 };
    const family = weapon?.family || (weapon ? weaponFamily(content, weapon.name) : 'unarmed') || 'unarmed';
    // Basic Attack: the class Basic Attack if it fits the weapon family, else the family's Basic Attack (proposed rule)
    const classBasic = content.skills.get(cls.basic_attack);
    const familyBasicId = content.npc.weapon_family_basic[family] || cls.basic_attack;
    const classFamily = { warrior: 'melee', guardian: 'heavy_melee', duelist: 'precision', ranger: 'bow', mage: 'focus' }[cls.id];
    const basicId = (classFamily === family || (family === 'melee' && classFamily === 'heavy_melee')) ? classBasic.id : familyBasicId;
    const skills = { [basicId]: { prof: 1, pp: 0 } };
    for (const sid of template.skills || []) if (content.skills.has(sid)) skills[sid] = { prof: 1, pp: 0 };
    const sheet = { level, class: cls.id, stats, skills, equipment, inventory: {}, coin_cp: 0, xp: 0, free_points: 0 };
    const dv = deriveCharacter(sheet, content);
    sheet.hp = dv.maxHp; sheet.mp = dv.maxMp; sheet.sta = dv.maxSta;
    sheet.template = template.id;
    sheet.generated = { from: 'npc_templates.json', status: 'proposed', basic_attack: basicId, weapon_family: family, rank: rankOf(level, content) };
    return sheet;
}
