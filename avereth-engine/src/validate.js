// Validation layer.
//  * validateState: invariants the engine guarantees after every fold (used by tests, #audit tooling and the ST
//    extension's integrity check). A violation means a bug or a corrupted log — never something the LLM may "fix".
//  * validateSchema: a small JSON-Schema subset validator (type, enum, const, required, properties,
//    additionalProperties, items, minItems, minimum, maximum, minLength, pattern, anyOf, oneOf, $ref to #/$defs)
//    so the content pack, events and reports are checked against schemas/ without any dependency.
import { deriveCharacter } from './derived.js';
import { FUNCTIONAL } from './knowledge.js';

const AWARENESS = new Set(['unaware', 'suspicious', 'aware']);
const QUEST_STATUS = new Set(['offered', 'active', 'completed', 'failed']);

function isInt(x) {
    return Number.isInteger(x);
}

export function validateState(state, content) {
    const p = [];
    const pc = state.entities.pc;
    if (!state.meta.started) return p;
    if (!pc || !pc.sheet) return ['PC entity or sheet missing'];
    for (const [id, e] of Object.entries(state.entities)) {
        if (e.id !== id) p.push(`entity key ${id} != id ${e.id}`);
        if (!e.sheet) continue;
        const s = e.sheet;
        const where = id === 'pc' ? 'PC' : id;
        if (!isInt(s.level) || s.level < 1) p.push(`${where}: invalid Level ${s.level}`);
        for (const k of content.rules.stats) if (!isInt(s.stats[k]) || s.stats[k] < 1) p.push(`${where}: invalid ${k} ${s.stats[k]}`);
        const dv = deriveCharacter(s, content);
        for (const [r, max] of [['hp', dv.maxHp], ['mp', dv.maxMp], ['sta', dv.maxSta]]) {
            if (!isInt(s[r]) || s[r] < 0 || s[r] > max) p.push(`${where}: ${r.toUpperCase()} ${s[r]} outside 0..${max}`);
        }
        if (!isInt(s.xp) || s.xp < 0 || s.xp >= s.level * content.rules.progression.xp_to_next_per_level) p.push(`${where}: XP ${s.xp} invalid for Level ${s.level}`);
        if (!isInt(s.free_points) || s.free_points < 0) p.push(`${where}: free points ${s.free_points}`);
        if (!isInt(s.coin_cp) || s.coin_cp < 0) p.push(`${where}: coin ${s.coin_cp}`);
        for (const [item, q] of Object.entries(s.inventory)) if (!isInt(q) || q <= 0) p.push(`${where}: inventory ${item} ×${q}`);
        for (const [sid, v] of Object.entries(s.skills)) {
            if (!content.skills.has(sid)) p.push(`${where}: unknown skill ${sid}`);
            if (!isInt(v.prof) || v.prof < 1 || v.prof > 5) p.push(`${where}: skill ${sid} proficiency ${v.prof}`);
        }
        for (const [slot, ref] of Object.entries(s.equipment)) {
            if (typeof ref === 'string' && !content.items.has(ref)) p.push(`${where}: unknown item ${ref} in ${slot}`);
            if (typeof ref === 'object' && (!ref || !ref.name)) p.push(`${where}: invalid inline item in ${slot}`);
        }
        if (e.status === 'dead' && s.hp !== 0) p.push(`${where}: dead with HP ${s.hp}`);
    }
    const sc = state.scene;
    if (sc.location && !state.entities[sc.location] && !content.locations.has(sc.location)) p.push(`unknown scene location ${sc.location}`);
    if (!sc.present.includes('pc')) p.push('PC not present in own scene');
    for (const id of sc.present) if (!state.entities[id]) p.push(`present entity ${id} does not exist`);
    for (const id of Object.keys(sc.positions)) if (!sc.present.includes(id)) p.push(`position for absent ${id}`);
    for (const [id, a] of Object.entries(sc.awareness)) if (!AWARENESS.has(a)) p.push(`awareness ${id}=${a}`);
    for (const id of sc.concealed) if (!state.entities[id]) p.push(`concealed entity ${id} does not exist`);
    // phase marker: exactly one semantic phase (Core #23)
    if ((state.mode === 'combat') !== !!state.encounter) p.push(`mode ${state.mode} inconsistent with encounter ${state.encounter ? 'present' : 'absent'}`);
    const enc = state.encounter;
    if (enc) {
        let pending = 0;
        for (const [id, c] of Object.entries(enc.combatants)) {
            if (!state.entities[id]) p.push(`combatant ${id} has no entity`);
            if (c.current.hp < 0 || c.current.hp > c.fixed.max_hp) p.push(`combatant ${id} HP ${c.current.hp}/${c.fixed.max_hp}`);
            if (c.side === 'hostile' && typeof c.fixed.defeat_xp !== 'number') p.push(`hostile ${id} without locked DefeatXP`);
            if (enc.defeated.includes(id) && c.side === 'hostile') pending += c.fixed.defeat_xp;
        }
        if (pending !== enc.pending_xp) p.push(`Pending XP ${enc.pending_xp} != sum of defeated DefeatXP ${pending}`);
        for (const id of enc.order) if (!enc.combatants[id]) p.push(`turn order contains unknown ${id}`);
        if (enc.current && !enc.order.includes(enc.current)) p.push(`current actor ${enc.current} not in turn order`);
        const pcC = enc.combatants.pc;
        if (pcC && (pcC.current.hp !== pc.sheet.hp || pcC.current.sta !== pc.sheet.sta || pcC.current.mp !== pc.sheet.mp)) p.push('PC sheet resources differ from encounter snapshot');
    }
    // world truth: one current value per functional predicate
    const seen = new Map();
    for (const f of Object.values(state.facts)) {
        if (f.until && f.since && f.until.minute < f.since.minute) p.push(`fact ${f.id} ends before it starts`);
        if (f.until || !FUNCTIONAL.has(f.p)) continue;
        const k = `${f.s}|${f.p}`;
        if (seen.has(k)) p.push(`two current values for ${k}: ${seen.get(k)} / ${f.id}`);
        seen.set(k, f.id);
    }
    for (const [who, rows] of Object.entries(state.knowledge)) {
        for (const about of Object.keys(rows)) if (!state.facts[about] && !state.claims[about]) p.push(`${who} knows missing proposition ${about}`);
    }
    for (const r of Object.values(state.relations)) if (r.value < -100 || r.value > 100) p.push(`relation ${r.id} value ${r.value}`);
    for (const q of Object.values(state.quests)) if (!QUEST_STATUS.has(q.status)) p.push(`quest ${q.id} status ${q.status}`);
    if (!isInt(state.rng.n) || state.rng.n < 0) p.push(`rng counter ${state.rng.n}`);
    return p;
}

// ---------------------------------------------------------------------------------------------- JSON Schema subset
function typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    if (Number.isInteger(v)) return 'integer';
    return typeof v;
}

function typeMatches(v, t) {
    const actual = typeOf(v);
    if (t === 'number') return actual === 'number' || actual === 'integer';
    return actual === t;
}

export function validateSchema(value, schema, root = schema, path = '$', errors = []) {
    if (schema === true || schema === undefined) return errors;
    if (schema === false) { errors.push(`${path}: not allowed`); return errors; }
    if (schema.$ref) {
        const name = schema.$ref.replace(/^#\/\$defs\//, '');
        if (!root.$defs || !root.$defs[name]) { errors.push(`${path}: unresolved $ref ${schema.$ref}`); return errors; }
        return validateSchema(value, root.$defs[name], root, path, errors);
    }
    if (schema.type) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        if (!types.some((t) => typeMatches(value, t))) { errors.push(`${path}: expected ${types.join('|')}, got ${typeOf(value)}`); return errors; }
    }
    if (schema.const !== undefined && value !== schema.const) errors.push(`${path}: must be ${JSON.stringify(schema.const)}`);
    if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: ${JSON.stringify(value)} not in ${JSON.stringify(schema.enum)}`);
    if (typeof value === 'number') {
        if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: ${value} < ${schema.minimum}`);
        if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: ${value} > ${schema.maximum}`);
    }
    if (typeof value === 'string') {
        if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: shorter than ${schema.minLength}`);
        if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: "${value}" does not match ${schema.pattern}`);
    }
    if (Array.isArray(value)) {
        if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: fewer than ${schema.minItems} items`);
        if (schema.items) value.forEach((v, i) => validateSchema(v, schema.items, root, `${path}[${i}]`, errors));
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const k of schema.required || []) if (!(k in value)) errors.push(`${path}: missing required "${k}"`);
        const props = schema.properties || {};
        for (const [k, v] of Object.entries(value)) {
            if (props[k] !== undefined) validateSchema(v, props[k], root, `${path}.${k}`, errors);
            else if (schema.patternProperties && Object.keys(schema.patternProperties).some((re) => new RegExp(re).test(k))) {
                const re = Object.keys(schema.patternProperties).find((r) => new RegExp(r).test(k));
                validateSchema(v, schema.patternProperties[re], root, `${path}.${k}`, errors);
            } else if (schema.additionalProperties === false) errors.push(`${path}: unexpected property "${k}"`);
            else if (typeof schema.additionalProperties === 'object') validateSchema(v, schema.additionalProperties, root, `${path}.${k}`, errors);
        }
    }
    if (schema.anyOf && !schema.anyOf.some((s) => validateSchema(value, s, root, path, []).length === 0)) errors.push(`${path}: matches none of anyOf`);
    if (schema.oneOf && schema.oneOf.filter((s) => validateSchema(value, s, root, path, []).length === 0).length !== 1) errors.push(`${path}: must match exactly one of oneOf`);
    return errors;
}
