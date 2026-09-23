// Character creation (System #12, Content #0/#11): deterministic two-step flow. The LLM only renders the result.
import { deriveCharacter } from './derived.js';
import { clone } from './util.js';

export function selectClass(state, content, classId) {
    if (state.mode !== 'creation' || state.creation.step !== 1) {
        return { events: [], errors: ['Class selection is only possible in CHARACTER CREATION — STEP 1/2.'] };
    }
    const cls = content.classes.get(classId);
    if (!cls) return { events: [], errors: [`Unknown Base Class "${classId}".`] };
    const events = [{ t: 'creation.class_selected', d: { class: cls.id, favored: cls.favored, basic_attack: cls.basic_attack } }];
    return { events, outcome: { kind: 'creation.step2', class: cls.id } };
}

export function selectSkills(state, content, skillIds) {
    if (state.mode !== 'creation' || state.creation.step !== 2) {
        return { events: [], errors: ['Skill selection is only possible in CHARACTER CREATION — STEP 2/2.'] };
    }
    const cls = content.classes.get(state.creation.class);
    const ids = [...new Set(skillIds)];
    const errors = [];
    if (ids.length !== content.start.creation.choose_skills) errors.push(`Select exactly ${content.start.creation.choose_skills} distinct Skills.`);
    for (const id of ids) if (!cls.skill_pool.includes(id)) errors.push(`${id} is not in the ${cls.name} Base Skill Pool.`);
    if (errors.length) return { events: [], errors };
    const kit = content.kits[cls.id];
    const equip = {};
    const items = {};
    for (const itemId of kit) {
        const it = content.items.get(itemId);
        if (it.slot === 'quiver') {
            equip.quiver = itemId;
            for (const [ammo, qty] of Object.entries(it.contains)) items[ammo] = (items[ammo] || 0) + qty;
        } else {
            equip[it.slot] = itemId;
        }
    }
    const sheet = clone(state.entities.pc.sheet);
    for (const [slot, ref] of Object.entries(equip)) sheet.equipment[slot] = ref;
    const dv = deriveCharacter(sheet, content);
    const events = [{ t: 'creation.completed', d: { skills: ids, equip, items, hp: dv.maxHp, mp: dv.maxMp, sta: dv.maxSta } }];
    return { events, outcome: { kind: 'creation.complete', class: cls.id, skills: ids, kit } };
}
