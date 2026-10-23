// 9C completion (docs/PATCH9C_COMPLETION.md): how a Skill of his develops from how he fights, booked by the engine alone
// (src/v4/ownership.js pc.progress), on the path the Passives of 9C-2c already take:
//
//   noted      a qualifying fight that is over (src/combat.js endEncounterEvents) notes the patterns each Skill of his showed
//              in it (src/skills.js noteUse: foes ENGAGED with him as it struck, a Range Band closed with it, a foe in
//              partial cover, a MEDIUM attack at its full reach, a foe's strike before his next turn, a defense that still
//              let damage through) and the Skills he used one after the other. growth.noted
//   evidence   from those notes alone, once per its key, at the same fight's end:
//                evolution     a Skill at P5 that showed one pattern in growth.development.evolution_fights such fights at
//                              P5 (a successor counts its own fights only); never his Basic Attack
//                breakthrough  his Basic Attack showing one pattern in breakthrough_fights fights: a technique of its own
//                combination   two of his Skills used one after the other in breakthrough_fights fights: one of them with
//                              what the other did (a guard after a blow, a step before it, a second protection)
//              the fights of one evidence never count for another of the same Skill or pair; one open at a time each.
//              growth.evidence
//   offer      at the first regular planned turn outside a fight (src/v4/runtime.js withGrowth), within max_offers open
//              developments of every kind (Passives too) and one evolution per Skill: the Skill one step further
//              (src/skill_composer.js developSkill), named by the Forge or its fallback. decision.opened (kind skill),
//              growth.offered: nothing of his changes
//   decision   his own command (development.accept / development.decline, src/v4/commands.js): checked again on a private
//              copy and booked all or nothing: skill.defined, then skill.learned (a new technique beside the others) or
//              skill.evolved (the successor in its place, his Proficiency kept, the old one on the sheet's history),
//              growth.decided, decision.closed
//
// Nothing here calls an LLM or a die; a reload, a swipe or a replay reads the booked events.
import { rulesetOf, skillOf } from '../content.js';
import { applyEvent } from '../state.js';
import { clone, hash32 } from '../util.js';
import { defineSkill, learnSkill, fightQualifies, skillDefErrors, rankBar } from '../skills.js';
import { developSkill, STEPS, STEP_ORDER, techniqueShape } from '../skill_composer.js';
import { growthOf } from './growth.js';

const D = (content) => content.rules.growth?.development || {};
export const SKILL_EVIDENCE = new Set(['evolution', 'breakthrough', 'combination']);
const PATTERN_TEXT = {
    crowd: 'with two or more foes ENGAGED with him', closing: 'closing a Range Band with it', cover: 'on a foe in partial cover',
    reach: 'at its full MEDIUM reach', riposte: 'struck back before his next turn', layered: 'still taking damage through it',
};
const DEFENSES = new Set(['temp_def', 'temp_mdef', 'barrier', 'incoming_damage_reduction', 'damage_reduction_next']);

function after(state, events) {
    const s = clone(state);
    for (const e of events) applyEvent(s, e);
    return s;
}
const evidenceOf = (state) => growthOf(state).evidence || {};
const safe = (s) => rulesetOf(s) >= 2 && !s.encounter && !(s.pending_combat || []).length && s.entities?.pc?.status !== 'dead';

/** His open offers of a development of any kind (a Passive, a Skill), oldest first. */
export const developmentOffers = (state) => (state.decisions || []).filter((d) => d.kind === 'passive' || d.kind === 'skill');
/** His open Skill offers (a new technique, an evolution). */
export const skillOffers = (state) => (state.decisions || []).filter((d) => d.kind === 'skill');
/** How many more developments may be offered now (growth.development.max_offers open at a time, every kind). */
export const offerRoom = (state, content) => Math.max(0, (D(content).max_offers ?? 3) - developmentOffers(state).length);

// ------------------------------------------------------------------------------------------------ the fight's end
/**
 * The notes and evidence of a fight that is over (src/combat.js endEncounterEvents): nothing for a fight that was no
 * real challenge (proficiency.award.challenge), one he died in or ran from, or in a legacy campaign.
 */
export function developmentEvents(state, content, enc) {
    if (rulesetOf(state) < 2 || !enc?.pp || !fightQualifies(state, content, enc)) return [];
    const sheet = state.entities.pc.sheet;
    const fixed = enc.combatants.pc.fixed.actions || {};
    const g = growthOf(state);
    if (Object.values(g.marks || {}).some((list) => list.some((x) => x.fight === enc.id)) || Object.values(g.pairs || {}).some((list) => list.some((x) => x.fight === enc.id))) return [];
    const marks = {};
    for (const [sid, patterns] of Object.entries(enc.pp.marks || {})) {
        if (!sheet.skills[sid] || !fixed[sid] || fixed[sid].weapon) continue;
        const kept = STEP_ORDER.filter((p) => patterns.includes(p));
        if (kept.length) marks[sid] = { prof: fixed[sid].prof || 1, patterns: kept };
    }
    const pairs = (enc.pp.pairs || []).filter((k) => k.split('+').every((id) => sheet.skills[id] && fixed[id] && !fixed[id].weapon)).sort();
    if (!Object.keys(marks).length && !pairs.length) return [];
    const noted = { t: 'growth.noted', d: { fight: enc.id, marks, ...(pairs.length ? { pairs } : {}) } };
    return [noted, ...skillEvidence(after(state, [noted]), content)];
}

/** The shapes of his Skills, of those his Skills evolved from and of those offered to him: what he has already. */
function shapes(state, content) {
    const sheet = state.entities.pc.sheet;
    const ids = [...Object.keys(sheet.skills || {}), ...(sheet.skill_history || []).map((h) => h.id)];
    return new Set([...ids.map((id) => techniqueShape(skillOf(content, id, state))), ...skillOffers(state).map((d) => techniqueShape(d.skill))].filter(Boolean));
}

/** The combination of two Skills used one after the other: one of them taking on what the other did, or null. */
export function combination(state, content, pair) {
    const [a, b] = pair.split('+').map((id) => skillOf(content, id, state));
    if (!a || !b) return null;
    for (const [base, other] of [[a, b], [b, a]]) {
        const kinds = (other.effects || []).map((e) => e.kind);
        const guards = !other.attack && kinds.some((k) => DEFENSES.has(k));
        const moves = kinds.includes('reposition') || !!other.range?.extra_band;
        const step = base.attack && guards && STEPS.riposte.applies(base) ? 'riposte'
            : base.attack && moves && STEPS.closing.applies(base) ? 'closing'
                : !base.attack && guards && STEPS.layered.applies(base) ? 'layered' : null;
        if (step) return { base: base.id, other: other.id, step };
    }
    return null;
}

/**
 * The evidence his notes now hold (once per its key; one open evidence per Skill and kind; the fights of one never count
 * for another). Each one's step is composable now and makes a technique he does not have yet.
 */
export function skillEvidence(state, content) {
    if (rulesetOf(state) < 2) return [];
    const r = D(content);
    const sheet = state.entities.pc.sheet;
    const g = growthOf(state);
    const all = Object.values(evidenceOf(state));
    const open = (pred) => all.some((x) => ['pending', 'offered'].includes(x.status) && pred(x));
    const used = (pred) => new Set(all.filter(pred).flatMap((x) => x.fights || []));
    const have = shapes(state, content);
    const out = [];
    const add = (ev) => out.push({ t: 'growth.evidence', d: { evidence: { ...ev, turn: state.turn, minute: state.clock?.minute ?? 0 } } });
    const fresh = (base, step) => {
        const d = developSkill(state, content, base, step, { origin: { kind: 'probe' } });
        return !d.errors.length && !have.has(techniqueShape(d.def));
    };
    const pick = (notes, step, need) => {
        const fights = notes.filter((n) => n.patterns.includes(step)).map((n) => n.fight);
        return fights.length >= need ? fights.slice(-need) : null;
    };
    for (const [sid, entry] of Object.entries(sheet.skills || {})) {
        const k = skillOf(content, sid, state);
        if (!k || k.weapon_attack || k.item) continue;
        if (k.basic) {
            // a breakthrough of his Basic Attack: a technique of its own beside it (the Basic Attack stays his fallback)
            if (open((x) => x.kind === 'breakthrough' && x.skill === sid)) continue;
            const spent = used((x) => x.kind === 'breakthrough' && x.skill === sid);
            const notes = (g.marks?.[sid] || []).filter((n) => !spent.has(n.fight));
            for (const step of STEP_ORDER) {
                const fights = STEPS[step].applies(k) ? pick(notes, step, r.breakthrough_fights ?? 3) : null;
                if (!fights || !fresh(k, step)) continue;
                add({ key: `brk:${sid}:${step}:${fights.join('+')}`, kind: 'breakthrough', skill: sid, step, fights, why: `his plain attack, ${PATTERN_TEXT[step]}, in ${fights.length} hard fights` });
                break;
            }
            continue;
        }
        // an evolution: P5, then the pattern in fights he fought at P5 (a successor's own fights: its own id)
        if ((entry.prof || 1) < 5 || open((x) => x.kind === 'evolution' && x.skill === sid)) continue;
        const spent = used((x) => x.kind === 'evolution' && x.skill === sid);
        const notes = (g.marks?.[sid] || []).filter((n) => n.prof >= 5 && !spent.has(n.fight));
        for (const step of STEP_ORDER) {
            const fights = STEPS[step].applies(k) ? pick(notes, step, r.evolution_fights ?? 2) : null;
            if (!fights || !fresh(k, step)) continue;
            add({ key: `evo:${sid}:${step}:${fights.join('+')}`, kind: 'evolution', skill: sid, step, fights, why: `${k.name} at P5, ${PATTERN_TEXT[step]}, in ${fights.length} hard fights` });
            break;
        }
    }
    for (const [pair, list] of Object.entries(g.pairs || {})) {
        if (!pair.split('+').every((id) => sheet.skills[id]) || open((x) => x.kind === 'combination' && x.pair === pair)) continue;
        const c = combination(state, content, pair);
        if (!c) continue;
        const spent = used((x) => x.kind === 'combination' && x.pair === pair);
        const fights = list.filter((n) => !spent.has(n.fight)).map((n) => n.fight);
        const need = r.breakthrough_fights ?? 3;
        if (fights.length < need || !fresh(skillOf(content, c.base, state), c.step)) continue;
        const [a, b] = [skillOf(content, c.base, state), skillOf(content, c.other, state)];
        add({ key: `combo:${pair}:${fights.slice(-need).join('+')}`, kind: 'combination', skill: c.base, with: c.other, pair, step: c.step, fights: fights.slice(-need), why: `${a.name} and ${b.name} one after the other in ${need} hard fights` });
    }
    return out;
}

// ------------------------------------------------------------------------------------------------ offers
/** The Skill an evidence makes now, or a reason why not: {def, base, replaces?} | {refuse}. */
function candidate(state, content, ev) {
    const sheet = state.entities.pc.sheet;
    const base = skillOf(content, ev.skill, state);
    if (!base || !sheet.skills[ev.skill]) return { refuse: `he no longer has ${base?.name || ev.skill}` };
    if (ev.kind === 'evolution' && (sheet.skills[ev.skill].prof || 1) < 5) return { refuse: `${base.name} is not at P5` };
    if (ev.kind === 'combination' && !sheet.skills[ev.with]) return { refuse: `he no longer has ${skillOf(content, ev.with, state)?.name || ev.with}` };
    const origin = ev.kind === 'evolution' ? { kind: 'evolution', note: `evolved from ${base.name}: ${ev.why}` } : { kind: 'breakthrough', note: ev.why };
    const d = developSkill(state, content, base, ev.step, { origin });
    if (d.errors.length) return { refuse: d.errors.join('; ') };
    if (shapes(state, content).has(techniqueShape(d.def))) return { refuse: 'he has this technique already' };
    return { def: d.def, base, ...(ev.kind === 'evolution' ? { replaces: base.id } : {}) };
}

/**
 * The Skill candidates the next safe turn offers (src/v4/runtime.js withGrowth): the oldest pending evidence first,
 * within the room left for offers, one evolution per Skill. [{key, hash, def, evidence, replaces}]
 */
export function skillDrafts(state, content) {
    if (!safe(state)) return [];
    const room = offerRoom(state, content);
    const out = [];
    let view = state;
    for (const ev of Object.values(evidenceOf(state)).filter((x) => SKILL_EVIDENCE.has(x.kind) && x.status === 'pending').sort((a, b) => (a.turn - b.turn) || a.key.localeCompare(b.key))) {
        if (out.length >= room) break;
        if (ev.kind === 'evolution' && skillOffers(view).some((d) => d.replaces === ev.skill)) continue;
        const c = candidate(view, content, ev);
        if (!c.def) continue;
        out.push({ key: `skill:${ev.key}`, hash: hash32(JSON.stringify(c.def)), def: c.def, evidence: ev.key, ...(c.replaces ? { replaces: c.replaces } : {}) });
        view = { ...view, decisions: [...(view.decisions || []), { id: `probe.${ev.key}`, kind: 'skill', skill: c.def, ...(c.replaces ? { replaces: c.replaces } : {}) }] };
    }
    return out;
}

const plain = (t) => String(t ?? '').replace(/[<>{}`$\\]/g, '').replace(/\s+/g, ' ').trim();
const coef = (c) => String(Math.round(c * 1000) / 1000);

/** One line of what a Skill does: "Far Arcane Bolt [F · C2]: 14 + INT×1.92 magical, LONG; 12 MP. Arcane Bolt, one step further: …". */
export function developmentText(skill) {
    const a = skill.attack;
    const mech = a ? `${a.base} + ${a.scaling.map((t) => `${t.stat}×${coef(t.coef)}`).join(' + ')} ${a.damage_type}, ${skill.range.band}${skill.range.extra_band ? ' after one more Range Band' : ''}` : (skill.effects || []).map((e) => e.kind.replace(/_/g, ' ')).join(' + ');
    return `${skill.name} [${skill.rank} · C${skill.complexity}]: ${mech}; ${skill.cost.amount} ${skill.cost.resource.toUpperCase()}. ${skill.description || skill.effect_text || ''}`.trim();
}

/** The offers of these drafts with the Forge's names (entries by key; else the fallback). {events, offers} */
export function offerSkills(state, content, drafts, entries = {}) {
    const events = [];
    const offers = [];
    let s = state;
    for (const d of drafts) {
        const ev = evidenceOf(s)[d.evidence];
        if (!ev || ev.status !== 'pending') continue;
        let def = d.def;
        const named = entries?.[d.key];
        if (named && !named.fallback) {
            const candidateDef = { ...def, name: plain(named.name), ...(named.flavor ? { flavor: plain(named.flavor).slice(0, 160) } : {}) };
            const taken = skillOffers(s).some((x) => x.skill?.name && x.skill.name.toLowerCase() === candidateDef.name.toLowerCase());
            if (!taken && !skillDefErrors(candidateDef, content, s).length) def = candidateDef;
        }
        if (skillDefErrors(def, content, s).length) continue;
        const id = `dec.skill.${String(ev.key).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`.slice(0, 80);
        const base = skillOf(content, ev.skill, s);
        const decision = { id, kind: 'skill', what: def.name, at: null, turn: s.turn, evidence: ev.key, development: ev.kind, skill: clone(def), ...(d.replaces ? { replaces: d.replaces, replaces_name: base?.name || d.replaces } : {}) };
        const ev2 = [{ t: 'growth.offered', d: { key: ev.key, decision: id } }, { t: 'decision.opened', d: { decision } }];
        try {
            s = after(s, ev2);
        } catch {
            continue;
        }
        events.push(...ev2);
        offers.push({ key: d.key, decision: id, name: def.name, text: developmentText(def), why: ev.why, ...(d.replaces ? { replaces: base?.name || d.replaces } : {}) });
    }
    return { events, offers };
}

// ------------------------------------------------------------------------------------------------ his decision
const inFight = (s) => !!s.encounter || (s.pending_combat || []).length > 0;

/** The open Skill offer a command names (its id; null: the one open, when there is exactly one). */
function offerOf(s, ref) {
    const all = skillOffers(s);
    if (typeof ref === 'string') return all.find((d) => d.id === ref) || null;
    return all.length === 1 ? all[0] : null;
}

/**
 * He accepts an offered Skill: a new technique beside the others, or an evolution in the place of the Skill it came from
 * (his Proficiency kept, the old one his no longer). Checked again and booked all or nothing. {events, booked, line} |
 * {refuse, line}
 */
export function acceptSkill(s, content, ref) {
    const no = (why) => ({ refuse: why, line: `NO NEW SKILL — ${why}. Nothing changes: his Skills stay as they are.` });
    if (rulesetOf(s) < 2) return no('Skills develop under the three-class rules');
    const offer = offerOf(s, ref);
    if (!offer) return no(skillOffers(s).length ? `which of the offered Skills: ${skillOffers(s).map((d) => `${d.skill.name} (${d.id})`).join(' or ')}` : 'no Skill is offered to him');
    if (inFight(s)) return no('not in a fight: he decides on it once the fight is over');
    const ev = evidenceOf(s)[offer.evidence];
    if (!ev || ev.status !== 'offered') return no(`${offer.skill.name} is no longer offered`);
    const sheet = s.entities.pc.sheet;
    const def = offer.skill;
    const from = offer.replaces ? sheet.skills[offer.replaces] : null;
    if (offer.replaces && !from) return no(`he no longer has ${offer.replaces_name || offer.replaces}`);
    if (offer.replaces && (from.prof || 1) < 5) return no(`${offer.replaces_name} is not at P5`);
    const bar = rankBar(content, def, sheet.level);
    if (bar) return no(bar);
    try {
        const d = defineSkill(s, content, def);
        if (d.errors.length) return no(`${def.name} cannot be booked (${d.errors.join('; ')})`);
        const view = after(s, d.events);
        const events = [...d.events];
        if (offer.replaces) {
            events.push({ t: 'skill.evolved', d: { id: 'pc', from: offer.replaces, to: def.id, prof: from.prof || 1, pp: 0, from_name: offer.replaces_name || null, name: def.name } });
        } else {
            const l = learnSkill(view, content, 'pc', def.id, `a breakthrough: ${ev.why}`);
            if (l.errors.length) return no(l.errors.join('; '));
            events.push(...l.events);
        }
        events.push({ t: 'growth.decided', d: { key: ev.key, status: 'accepted', skill: def.id } }, { t: 'decision.closed', d: { id: offer.id, status: 'accepted' } });
        after(s, events);
        const text = developmentText(d.skill);
        const booked = { skill: def.id, name: def.name, text, ...(offer.replaces ? { replaced: offer.replaces_name, prof: from.prof || 1 } : {}) };
        return {
            events, booked,
            line: offer.replaces
                ? `EVOLVED — ${offer.replaces_name} becomes ${def.name}, booked by the engine (P${from.prof || 1} kept): ${text} ${offer.replaces_name} is his no longer; ${def.name} is the Skill he uses now. Show the change in a sentence or two; its numbers are the engine's.`
                : `NEW SKILL — ${def.name}, booked by the engine: ${text} His other Skills stay as they are. Show it coming to him in a sentence or two; its numbers are the engine's.`,
        };
    } catch (err) {
        return no(`${def.name} cannot be booked (${String(err?.message || err)})`);
    }
}

/** He declines an offered Skill: this development is decided for good; his Skills stay as they are. */
export function declineSkill(s, content, ref) {
    const offer = offerOf(s, ref);
    if (!offer) return { refuse: 'no such offer', line: `NOTHING TO DECLINE — ${skillOffers(s).length ? `which of ${skillOffers(s).map((d) => d.skill.name).join(' or ')}?` : 'no Skill is offered to him'}` };
    const events = [{ t: 'growth.decided', d: { key: offer.evidence, status: 'declined' } }, { t: 'decision.closed', d: { id: offer.id, status: 'declined' } }];
    return { events, line: `DECLINES — ${offer.skill.name}: he lets this development pass; it does not come back from these fights.${offer.replaces ? ` ${offer.replaces_name} stays his as it is.` : ''} Nothing about him changes.` };
}

// ------------------------------------------------------------------------------------------------ texts
/** The #skills lines of his open Skill offers and of the Skills his own evolved from. */
export function skillOfferLines(state, content) {
    const sheet = state.entities?.pc?.sheet;
    if (!sheet) return [];
    const lines = skillOffers(state).map((d) => `POSSIBLE SKILL — ${developmentText(d.skill)}${d.replaces ? ` · it would replace ${d.replaces_name} (his Proficiency kept; ${d.replaces_name} his no longer)` : ' · a new Skill beside his others'} · not his yet: accept or decline it (${d.id})`);
    for (const h of sheet.skill_history || []) lines.push(`- evolved: ${h.name || skillOf(content, h.id, state)?.name || h.id} → ${skillOf(content, h.evolved_to, state)?.name || h.evolved_to}`);
    return lines;
}

/** What a Skill of his came from, for #skill: "evolved from Arcane Bolt", or null. */
export function lineageText(state, content, skillId) {
    const h = (state.entities?.pc?.sheet?.skill_history || []).find((x) => x.evolved_to === skillId);
    return h ? `Evolved from: ${h.name || skillOf(content, h.id, state)?.name || h.id} (at P${h.prof})` : null;
}
