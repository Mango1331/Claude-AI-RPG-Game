// Patch 9D: one E-rank choice group, exactly one active class trait. Base Class remains a content id.
import { rulesetOf, skillOf } from '../content.js';
import { clone, hash32, normText } from '../util.js';
import { applyEvent } from '../state.js';
import { deriveCharacter } from '../derived.js';
import { effectErrors, passiveEffects, passiveWhen, passiveGain } from '../passives.js';
import { careerOf, classQuality } from './feats.js';

export const classOffer = (s) => (s.decisions || []).find((d) => d.kind === 'class') || null;
export const classOptions = (s) => classOffer(s)?.options || [];
export const legacyValue = (history, content) => (history || []).reduce((n, h) => n + (content.rules.class_growth.legacy[h.quality] || 0), 0);
export const className = (sheet, content) => sheet.evolution?.name || content.classes.get(sheet.class)?.name || sheet.class || 'no Class';
const safe = (s) => rulesetOf(s) >= 2 && !s.encounter && !(s.pending_combat || []).length && s.entities?.pc?.status !== 'dead';
const plain = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[<>{}`$\\\u0000-\u001f\u007f]/.test(v);
const DIRECTIONS = ['offense', 'defense', 'arcane', 'precision', 'mobility', 'control', 'hybrid', 'endurance'];

/** A class validates metadata and uses the same effect primitives with its own E budget. */
export function classDefErrors(def, content) {
    if (!def || typeof def !== 'object' || Array.isArray(def)) return ['class profile: an object'];
    const e = [];
    for (const key of Object.keys(def)) if (!['id', 'name', 'description', 'flavor', 'rank', 'quality', 'direction', 'trait'].includes(key)) e.push(`class: unknown field ${key}`);
    if (typeof def.id !== 'string' || !/^class\.e\.[a-z_]+$/.test(def.id)) e.push('class id: class.e.<direction>');
    if (!plain(def.name, 40) || !/^[A-Za-z][A-Za-z' -]{1,39}$/.test(def.name)) e.push('class name: 2-40 letters');
    if (!plain(def.description, 300)) e.push('class description: up to 300 characters');
    if (def.flavor !== undefined && (!plain(def.flavor, 160) || /\d/.test(def.flavor))) e.push('class flavor: one line, no numbers');
    if (def.rank !== 'E') e.push('only E class profiles are implemented');
    const budget = content.rules.class_growth.budgets[def.quality];
    if (!budget) e.push('first evolution quality: normal or rare; Legendary needs prior Rare');
    if (!DIRECTIONS.includes(def.direction)) e.push('unsupported class direction');
    if (!def.trait || typeof def.trait !== 'object' || Array.isArray(def.trait)) e.push('class trait: an object');
    else {
        for (const key of Object.keys(def.trait)) if (!['scope', 'condition', 'effects'].includes(key)) e.push(`class trait: unknown field ${key}`);
        e.push(...effectErrors(def.trait, content, budget));
    }
    return e;
}

/** Evidence selects mechanical directions, never a catalog of later classes. */
function directions(s, content) {
    const sh = s.entities.pc.sheet, style = careerOf(s).style;
    const known = Object.keys(sh.skills).map((id) => skillOf(content, id, s)).filter((k) => k && !k.item && !k.weapon_attack);
    const tags = (tag) => known.filter((k) => (k.tags || []).includes(tag)).length;
    const used = (tag) => style[tag] || 0;
    const bonus = (stat) => Object.values(sh.passives || {}).flatMap((p) => p.effects || []).filter((e) => e.kind === 'core_stat_bonus' && e.stat === stat).reduce((n,e) => n+e.value,0);
    const invested = (stat) => Math.max(0, sh.stats[stat] - 5) * 0.08 + bonus(stat) * 0.5;
    const deeds = (stat) => (s.deeds || []).filter((d) => d.stat === stat).length * 0.5;
    const scores = [
        ['offense', tags('Martial') + used('offense') * 4 + used('Martial') * 3 + invested('STR')],
        ['defense', tags('Defense') + used('defense') * 7 + used('Defense') * 2 + invested('VIT') + deeds('VIT')],
        ['arcane', tags('Arcane') + used('Arcane') * 5 + (tags('Arcane') ? invested('INT') + deeds('INT') : 0)],
        ['precision', tags('Precision') + used('Precision') * 5 + (tags('Precision') ? invested('PER') + deeds('PER') : 0)],
        ['mobility', tags('Mobility') + used('Mobility') * 5 + (tags('Mobility') ? invested('AGI') + deeds('AGI') : 0)],
        ['control', tags('Control') + used('Control') * 5 + (tags('Control') ? invested('WIL') + deeds('WIL') : 0)],
    ].filter(([, score]) => score > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const out = scores.map(([direction]) => direction).slice(0, 3);
    if (used('Arcane') && (used('Martial') || used('Precision')) && tags('Arcane')) {
        if (out.length >= 3) out.pop();
        out.push('hybrid');
    }
    // Resilience is supported by his actual VIT investment; gives a second direction to an otherwise single style.
    if (out.length < 2 && sh.stats.VIT >= 5) out.push('endurance');
    return [...new Set(out)].slice(0, 3);
}

function traitFor(direction, quality, content) {
    const b = content.rules.class_growth.budgets[quality], p = b.per;
    const stat = (stat) => ({ kind: 'stat_bonus', stat, value: p.stat_bonus });
    const pool = (resource) => ({ kind: 'max_bonus', resource, value: p.max_bonus });
    const cost = (resource, tag) => ({ kind: 'cost_reduction', resource, tag, pct: p.cost_reduction });
    const resist = (damage_type) => ({ kind: 'resist', damage_type, pct: p.resist });
    const effects = {
        offense: [stat('ATK'), cost('sta', 'Martial'), pool('sta')],
        defense: [stat('DEF'), resist('physical'), pool('hp')],
        arcane: [stat('MATK'), cost('mp', 'Arcane'), pool('mp')],
        precision: [stat('ATK'), cost('sta', 'Precision'), pool('sta')],
        mobility: [stat('DEF'), resist('physical')],
        control: [stat('MDEF'), cost('mp', 'Control'), pool('mp')],
        hybrid: [stat('ATK'), stat('MATK'), cost('mp', 'Arcane')],
        endurance: [pool('hp'), resist('physical'), stat('DEF')],
    }[direction].slice(0, b.effects[1]);
    return { scope: direction === 'mobility' ? 'combat' : 'always', condition: direction === 'mobility' ? { kind: 'foe_engaged' } : null, effects };
}

const WORDS = { offense: 'Iron', defense: 'Steadfast', arcane: 'Arcane', precision: 'Keen', mobility: 'Swift', control: 'Focused', hybrid: 'Spellbound', endurance: 'Enduring' };

/** One deterministic batch per claim. No claim can be blocked by the three Skill/Passive slots. */
export function classDrafts(s, content) {
    const sh = s.entities?.pc?.sheet;
    if (!safe(s) || !sh || sh.level < content.rules.class_growth.level || sh.evolution || (sh.class_history || []).some((h) => h.rank === 'E') || classOffer(s)) return [];
    const quality = classQuality(s, content);
    const cls = content.classes.get(sh.class);
    const evidence = { base: cls?.name, stats: clone(sh.stats), style: clone(careerOf(s).style),
        skills: Object.keys(sh.skills).map((id) => { const k = skillOf(content,id,s); return k ? { name:k.name, tags:k.tags, aspects:k.aspects || [], prof:sh.skills[id].prof, origin:k.origin?.kind || 'starter' } : null; }).filter(Boolean),
        passives: Object.values(sh.passives || {}).map((p) => ({ name:p.name,effects:p.effects })),
        feats: Object.values(careerOf(s).feats).map((f) => ({ title:f.title,context:f.context,facts:f.facts })) };
    return directions(s, content).map((direction) => {
        const trait = traitFor(direction, quality, content);
        const def = { id: `class.e.${direction}`, name: `${WORDS[direction]} ${cls?.name || 'Adept'}`, description: `E-rank ${direction} class trait: ${passiveEffects(trait)}.`, rank: 'E', quality, direction, trait };
        return { key: `class:E:${direction}`, hash: hash32(JSON.stringify({def,evidence})), def, evidence };
    }).filter((d) => !classDefErrors(d.def, content).length && passiveGain({ ...sh, evolution: null }, content, { ...d.def.trait, id: d.def.id }).some((n) => n > 0));
}

export function classText(def) {
    return `${def.name} [${def.rank} · ${def.quality === 'rare' ? 'Rare' : 'Normal'}] — ${passiveWhen(def.trait)}: ${passiveEffects(def.trait)}`;
}

export function offerClass(s, content, drafts, entries = {}) {
    if (!drafts.length || classOffer(s) || !safe(s)) return { events: [], offers: [] };
    const names = new Set();
    const options = drafts.map((d) => {
        const n = entries[d.key];
        let def = clone(d.def);
        if (n && !n.fallback) {
            const named = { ...def, name: n.name, ...(n.flavor ? { flavor: n.flavor } : {}) };
            if (!classDefErrors(named, content).length && !names.has(normText(named.name))) def = named;
        }
        if (names.has(normText(def.name))) {
            const base = d.def.name.slice(0, 35).trim();
            def.name = [d.def.name, ...['II','III','IV','V'].map((r) => `${base} ${r}`)].find((n) => !names.has(normText(n))) || `${base} VI`;
        }
        names.add(normText(def.name));
        return def;
    });
    const decision = { id: 'dec.class.e', kind: 'class', at: null, turn: s.turn, rank: 'E', options, evidence: { stats: clone(careerOf(s).stats), feats: Object.keys(careerOf(s).feats), style: clone(careerOf(s).style) } };
    return { events: [{ t: 'decision.opened', d: { decision } }], offers: options.map((o, i) => ({ key: drafts[i].key, name: o.name, text: classText(o), id: o.id })) };
}

/** The option id fits the existing development.accept offer reference; the group itself asks which option. */
export function classSelection(s, ref) {
    const d = classOffer(s);
    if (!d) return null;
    const option = d.options.find((o) => o.id === ref);
    return option ? { decision: d, option } : (ref === d.id ? { decision: d, option: null } : null);
}

export function acceptClass(s, content, ref) {
    const no = (why) => ({ refuse: why, line: `NO CLASS CHANGE — ${why}. His class stays as it is.` });
    const selected = classSelection(s, ref);
    if (!selected?.option) return no('choose one of the class options shown by #class');
    if (!safe(s)) return no('choose the class after the fight, with no combat pending');
    const sh = s.entities.pc.sheet, def = selected.option;
    if (sh.level < content.rules.class_growth.level || sh.evolution || (sh.class_history || []).some((h) => h.rank === 'E')) return no('this E evolution is not available');
    const errors = classDefErrors(def, content);
    if (errors.length) return no(errors.join('; '));
    if (!passiveGain({ ...sh, evolution: null }, content, { ...def.trait, id: def.id }).some((n) => n > 0)) return no('this trait adds nothing within the shared effect limits; the choice remains open');
    const events = [{ t: 'class.evolved', d: { id: 'pc', profile: clone(def), evidence: clone(selected.decision.evidence) } }, { t: 'decision.closed', d: { id: selected.decision.id, status: 'accepted' } }];
    const view = clone(s);
    try { for (const e of events) applyEvent(view, e); } catch (err) { return no(err.message); }
    const dv = deriveCharacter(view.entities.pc.sheet, content);
    for (const [resource, max] of [['hp', dv.maxHp], ['mp', dv.maxMp], ['sta', dv.maxSta]]) if (sh[resource] > max) events.push({ t: 'resource.changed', d: { id: 'pc', resource, value: max } });
    return { events, booked: { name: def.name, quality: def.quality, text: classText(def) }, line: `CLASS EVOLVED — ${classText(def)}, booked by the engine. His Base Class ${content.classes.get(sh.class).name}, Skills, Passives and Favored Stats remain. This one class trait is active; it takes no Passive slot.` };
}

export function classLines(s, content) {
    const sh = s.entities.pc.sheet;
    const out = [`Current class: ${className(sh, content)} | Class quality: ${sh.evolution?.quality || 'Normal (Base Class)'}`];
    if (sh.evolution) out.push(`Class trait: ${classText(sh.evolution)} (shared effect caps; no Passive slot)`, ...(sh.evolution.flavor ? [`Description (appearance only): ${sh.evolution.flavor}`] : []));
    out.push(`Evolution history: ${(sh.class_history || []).map((h) => `${h.name} [${h.rank}/${h.quality}]`).join(' → ') || 'none'}`, `Class legacy: ${legacyValue(sh.class_history, content)} (future budget potential; no extra active traits)`);
    const d = classOffer(s);
    if (d) out.push('CLASS CHOICE — choose exactly one; postponing keeps these same options:', ...d.options.map((o) => `- ${classText(o)} (${o.id})`));
    else if (!sh.evolution) out.push(sh.level >= 15 ? (safe(s) && !classDrafts(s,content).length ? 'E class evolution due; no supported trait currently adds an effect within the shared caps. The entitlement stays.' : 'E class evolution due; offered at the next safe regular turn.') : 'Next class evolution: Level 15 / E.');
    if (sh.level >= 30) out.push('Higher class evolutions D–S and Domains are not implemented; Power Rank still follows Level.');
    return out;
}
