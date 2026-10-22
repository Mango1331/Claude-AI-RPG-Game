// Deterministic combat profiles for NPCs and creatures.
//  * Creatures: Content #7 F1 anchors + Level scaling (+ Elite/Boss #8). No Human stats, no STA, no Hit value
//    (Combat V3: legal attacks connect; a true Ambush crits for creatures too).
//  * Humans: core-stat characters built from the PROPOSED npc_templates.json (Lore #1: most adults have a Base
//    Class; Content #0 class growth; Core #3 +5 free points per Level). This replaces the ad-hoc improvisation
//    observed in Testrun-v1.
import { rankOf, deriveCharacter } from './derived.js';
import { weaponFamily } from './content.js';
import { roundHalfUp, hash32 } from './util.js';

export function scaleCreature(anchor, level, type, content, variation = null) {
    const g = level - 1;
    const sc = content.monsters.scaling;
    const p = {
        hp: roundHalfUp(anchor.hp * (1 + sc.hp.coef * g)),
        atk: roundHalfUp(anchor.atk * (1 + sc.atk.coef * g)),
        def: Math.max(0, roundHalfUp((anchor.def + 1) * (1 + sc.def.coef * g) - 1)),
        mdef: Math.max(0, roundHalfUp((anchor.mdef + 1) * (1 + sc.mdef.coef * g) - 1)),
        init: roundHalfUp(anchor.init * (1 + sc.init.coef * g)),
    };
    // individual variation (Content #7): an individual the story establishes as bigger or stronger than ordinary ones of
    // its kind, after Level scaling and before Elite/Boss, fixed once (live run 30.09.2026 22:41: the "big boar" had the
    // numbers of a common one)
    if (variation === 'strong') {
        const v = content.monsters.variation;
        p.hp = roundHalfUp(p.hp * (1 + v.hp_atk_pct / 100));
        p.atk = roundHalfUp(p.atk * (1 + v.hp_atk_pct / 100));
        p.def += v.def_mdef;
        p.mdef += v.def_mdef;
        p.init += v.init;
    }
    if (type === 'elite' || type === 'boss') {
        const m = content.monsters[type];
        p.hp = roundHalfUp(p.hp * m.hp);
        p.atk = roundHalfUp(p.atk * m.atk);
        p.def = roundHalfUp(p.def * m.def);
        p.mdef = roundHalfUp(p.mdef * m.mdef);
        p.init = p.init + m.init;
    }
    return {
        model: 'creature', anchor: anchor.id, body_plan: anchor.name, level, rank: rankOf(level, content), type: type || 'normal', ...(variation === 'strong' ? { variation } : {}),
        max_hp: p.hp, atk: p.atk, def: p.def, mdef: p.mdef, init: p.init,
        attack: { name: anchor.attack, damage_type: anchor.damage_type, range: anchor.range },
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
 * Patch 9A: the role a starter Skill fills for a trained NPC: 'attack' (it attacks), 'defense' or 'utility' (by its
 * category; "Defensive / Utility" fills either).
 */
export function starterRoles(skill) {
    if (skill.attack) return ['attack'];
    const cat = String(skill.category || '');
    return [/Defensive/.test(cat) ? 'defense' : null, /Utility/.test(cat) ? 'utility' : null].filter(Boolean);
}

/**
 * Patch 9A: the two starter Skills of a trained NPC: for each role in order, one Skill of the class pool that fills it
 * (not chosen yet); equal choices are decided by the key (the campaign seed and the person's id), never by the order of
 * the pool. Without a Skill for a role, any other Skill of the pool. Exactly two, distinct.
 */
export function chooseStarters(cls, roles, key, content) {
    const pool = cls.skill_pool.map((id) => content.skills.get(id)).filter(Boolean);
    const out = [];
    const pick = (list, role) => list.length ? list[parseInt(hash32(`${key}|${role}|${out.length}`), 16) % list.length] : null;
    for (const role of [...roles, 'any', 'any'].slice(0, Math.max(2, roles.length))) {
        if (out.length >= 2) break;
        const free = pool.filter((sk) => !out.includes(sk.id));
        const fit = role === 'any' ? free : free.filter((sk) => starterRoles(sk).includes(role));
        const sk = pick(fit.length ? fit : free, role);
        if (sk) out.push(sk.id);
    }
    while (out.length < 2 && out.length < pool.length) out.push(pool.find((sk) => !out.includes(sk.id)).id);
    return out;
}

/**
 * Patch 9A (ruleset 2): a human NPC's sheet from a template of npc_templates.json ruleset_2. Class (a lore fact, or none
 * established) and combat training are separate: an untrained person knows no starter Skill (the class Basic Attack
 * when a class is established; else the plain attack of what they hold, src/derived.js weaponAttackOf); a trained one
 * the class Basic Attack and exactly two starter Skills of the class pool by role. Without a class the favored stats of
 * the template's stat_basis are an internal basis, never their class.
 * overrides: {level, class, weapon, armor, key (the choice key), established (the class is a fact of the story)}
 */
function rulesetTwoSheet(template, overrides, content) {
    const cls = content.classes.get(overrides.class || template.class) || null;
    const level = overrides.level || template.level.default;
    const stats = { ...content.rules.human_baseline };
    delete stats.src;
    const basis = cls ? cls.favored : template.stat_basis || [];
    for (const f of basis) stats[f] += level; // +1 at Level 1 and +1 on each later Level
    const priority = template.priority || template.priority_by_class?.[cls?.id] || ['STR', 'VIT', 'AGI'];
    const free = distributeFreePoints(priority, (level - 1) * content.rules.progression.free_points_per_level);
    for (const [k, v] of Object.entries(free)) stats[k] += v;
    const weapon = overrides.weapon || template.weapon || null;
    const armor = overrides.armor === undefined ? template.armor : overrides.armor;
    const equipment = {};
    if (weapon) equipment.weapon = { id: `npc_weapon`, name: weapon.name, slot: 'weapon', family: weapon.family || weaponFamily(content, weapon.name) || 'melee', atk: weapon.atk || 0, matk: weapon.matk || 0 };
    if (armor) equipment.armor = { id: 'npc_armor', name: armor.name || 'Armor', slot: 'armor', def: armor.def || 0, mdef: armor.mdef || 0 };
    const trained = template.training === 'trained' && !!cls;
    const roles = template.starter_roles || template.starter_roles_by_class?.[cls?.id] || ['attack', 'defense'];
    const starters = trained ? chooseStarters(cls, roles, overrides.key || template.id, content) : [];
    const skills = {};
    if (cls) skills[cls.basic_attack] = { prof: 1, pp: 0 };
    for (const sid of starters) skills[sid] = { prof: 1, pp: 0 };
    const sheet = { level, class: cls ? cls.id : null, training: trained ? 'trained' : 'untrained', stats, skills, equipment, inventory: { ...(template.inventory || {}) }, coin_cp: 0, xp: 0, free_points: 0 };
    const dv = deriveCharacter(sheet, content);
    sheet.hp = dv.maxHp; sheet.mp = dv.maxMp; sheet.sta = dv.maxSta;
    sheet.template = template.id;
    sheet.generated = {
        from: 'npc_templates.json ruleset_2', status: 'proposed', ruleset: 2, training: sheet.training, starters,
        class_basis: cls ? (overrides.established ? 'established' : 'template') : 'none', ...(cls ? {} : { stat_basis: basis }),
        weapon_family: equipment.weapon?.family || 'unarmed', rank: rankOf(level, content),
    };
    return sheet;
}

/**
 * Build a human NPC character sheet from a template.
 * overrides: {level, class, weapon: {name, atk|matk, family}, armor: {def, mdef}}
 * Patch 9A: a template of ruleset 2 (it has a training) builds by rulesetTwoSheet; a legacy template exactly as before.
 */
export function humanSheet(template, overrides, content) {
    if (template.training) return rulesetTwoSheet(template, overrides, content);
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
