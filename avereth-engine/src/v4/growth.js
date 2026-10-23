// Patch 9C-1 (docs/PATCH9C1_SKILL_ACQUISITION_TRAINING.md): Skill acquisition and training under ruleset 2, booked by
// the engine alone (src/v4/ownership.js pc.progress).
//
//   learning goal   a technique he learns (strike, bolt, guard, ward, mend; its tags and aspects) from a source the
//                   engine verified when the goal opened: a teacher present, competent in its disciplines (their sheet
//                   or template: trained, a class or Skills of those tags) and committed to teaching him (a training
//                   service bought from them, or their fact "teaches" Alaric). The evidence is kept on the goal (the
//                   services view is short and has no topic). growth.opened
//   session         an activity train/study the engine booked with a duration: minutes per game day (split at
//                   midnight) of teacher or own practice. growth.session
//   Learning Prog.  per goal and game day: the day's claim (rules.json growth) minus what the day already gave, so
//                   split sessions add no more than one long one, and nothing is credited twice; a qualifying fight in
//                   which he used a Skill of the goal's tags adds once per fight. growth.progress (ready at the need)
//   finalization    after a regular planned turn, outside a fight: every ready goal becomes its Skill (composer,
//                   definition, learning, the goal closed), checked on a private copy and booked all or nothing.
//                   growth.closed
//   practice        a session on a Skill he knows gives Proficiency Progress once per Skill and day (skill.progress).
//
//   Patch 9C-2c   an Ordinary Passive goal: a core stat he trains on his own for long (the same sessions, ledger and day
//                 cap, at the own rate, no fight, no affinity); complete, it becomes evidence for an offer
//                 (src/v4/passive_growth.js), never the Passive itself. growth.evidence, growth.offered, growth.decided
//
// Pure functions of the state; nothing here calls an LLM, and nothing is booked in a legacy campaign.
import { rulesetOf, skillOf, npcTemplate } from '../content.js';
import { affinityFor, defineSkill, learnSkill, fightQualifies, practiceProgress, skillDefErrors } from '../skills.js';
import { composeSkill, composeTags, composeAspects, composerFunctions, techniqueSignature, acquiredTechnique, techniqueOf } from '../skill_composer.js';
import { applyEvent } from '../state.js';
import { truth, entityLabel } from '../knowledge.js';
import { clone, normText, hash32 } from '../util.js';
import { profileOf, rankRefusal } from './items.js';
import { CORE_STATS, passiveGain, passivesOf, passiveSlots, qualityBudget } from '../passives.js';

const EMPTY = { n: 0, goals: {}, done: [], training: {} };
const DAY = 1440;
// what the state keeps (fixed: a reducer reads no content): the last two game days of a ledger (new sessions book
// each day before trimming it), the last fights a goal was credited for, the last closed goals
const KEEP_DAYS = 2;
const KEEP_FIGHTS = 6;
const KEEP_DONE = 20;
// 9C completion: the qualifying fights a Skill's patterns are kept for (rules.json growth.development.keep_fights is the
// content's copy of it; a reducer reads no content)
const KEEP_NOTED = 8;

const R = (content) => content.rules.growth;
const dayOf = (minute) => Math.floor(minute / DAY);

/** The campaign's learning state (state.growth, created by its first event). */
export function growthOf(state) {
    return state.growth || EMPTY;
}

/** His open learning goals, oldest first. */
export function openGoals(state) {
    return Object.values(growthOf(state).goals).sort((a, b) => a.n - b.n);
}

// 9C completion: a Skill his own evolved from (a chosen starter, or one of a teacher, a stone or a manual) is not learned
// again: its technique, by its kind, leading discipline and aspects, counts as known (a starter he still holds blocks
// nothing, as in 9C-2a)
const looseKey = (t) => JSON.stringify([t.fn, (t.tags || [])[0] ?? null, [...new Set(t.aspects || [])].sort()]);
export function knownTechnique(state, target, content = null) {
    if (target.passive) return null;
    const key = techniqueSignature(target);
    const sheet = state.entities?.pc?.sheet;
    const ids = new Set([...Object.keys(sheet?.skills || {}), ...growthOf(state).done.map((g) => g.skill)]);
    const exact = [...ids].find((id) => {
        const t = acquiredTechnique(state.skill_defs?.[id]);
        return t && techniqueSignature(t) === key;
    });
    if (exact || !content) return exact;
    const loose = looseKey(target);
    const old = (sheet?.skill_history || []).find((h) => {
        const t = techniqueOf(skillOf(content, h.id, state));
        return t && looseKey(t) === loose;
    });
    // the Skill that line stands at now (an evolution of an evolution)
    let id = old?.evolved_to;
    for (let i = 0; id && !sheet.skills[id] && i < 10; i++) id = sheet.skill_history.find((h) => h.id === id)?.evolved_to;
    return id && sheet.skills[id] ? id : undefined;
}

/** Is this word a technique the composer makes (a new main function)? */
export const isTechnique = (content, v) => typeof v === 'string' && composerFunctions(content).includes(v);

/** The minutes of a span from a minute on, per game day: [{day, minutes}] (split at midnight). */
export function dayParts(start, minutes) {
    const parts = [];
    let at = start;
    let left = minutes;
    while (left > 0) {
        const d = dayOf(at);
        const take = Math.min(left, (d + 1) * DAY - at);
        parts.push({ day: d, minutes: take });
        at += take;
        left -= take;
    }
    return parts;
}

// ------------------------------------------------------------------------------------------------ teachers
const PC_WORDS = /\b(?:alaric|pc|him|me)\b/;
// New purchase lines have a stable id; old records retain exactly the key their goals already reference.
const serviceKey = (x) => x.id || `svc:${x.turn}:${x.minute}:${x.by}`;
const goalSources = (g) => [g.source, ...Object.values(g.teachers || {})].filter(Boolean);

// Keep consumed service keys only while the short services view can still offer them. This survives completed-goal
// compaction without keeping an unbounded history of purchases. Old events acquire the same index when folded.
function rememberService(state, source) {
    if (source?.basis !== 'service') return;
    const available = new Set((state.services || []).filter((x) => x.service === 'training').map(serviceKey));
    state.growth.used_services = [...new Set([...(state.growth.used_services || []), source.key])].filter((key) => available.has(key));
}

/**
 * The disciplines a person can teach: those their class favours (affinity above 1) and the tags of the Skills they
 * know; only for a person trained in combat (their sheet, else their template). [] for anyone else.
 */
export function teacherTags(state, content, id) {
    const e = state.entities?.[id];
    if (!e || e.kind !== 'npc' || e.status === 'dead') return [];
    const tpl = e.template ? npcTemplate(content, 2, e.template) : null;
    const training = e.sheet?.training ?? tpl?.training ?? null;
    if (training !== 'trained') return [];
    const cls = e.sheet?.class ?? e.class ?? tpl?.class ?? null;
    const tags = new Set(Object.entries(content.affinity?.[cls] || {}).filter(([k, v]) => k !== 'otherwise' && v > 1).map(([k]) => k));
    for (const sid of Object.keys(e.sheet?.skills || {})) {
        const sk = skillOf(content, sid, state);
        if (sk && !sk.basic) for (const t of sk.tags || []) tags.add(t);
    }
    return [...tags];
}

/**
 * The evidence that a person committed to teaching him: a training service bought from them that no goal used yet,
 * or a current fact of theirs that they teach Alaric. {basis, key, turn, minute} or null.
 */
export function teachingCommitment(state, id) {
    const g = growthOf(state);
    const used = new Set([...(g.used_services || []), ...Object.values(g.goals).flatMap((x) => goalSources(x).map((s) => s.key)), ...g.done.flatMap((x) => x.keys || [x.key])].filter(Boolean));
    const svc = [...(state.services || [])].reverse().find((x) => x.service === 'training' && x.by === id && !used.has(serviceKey(x)));
    if (svc) return { basis: 'service', key: serviceKey(svc), turn: svc.turn, minute: svc.minute };
    const fact = [...truth(state, id, 'teaches'), ...truth(state, id, 'trains')].find((f) => PC_WORDS.test(normText(String(f.o))));
    if (fact) return { basis: 'fact', key: `fact:${fact.id}`, turn: fact.since?.turn ?? null, minute: fact.since?.minute ?? null };
    return null;
}

const here = (state, id) => typeof id === 'string' && (state.scene?.present || []).includes(id) && state.entities?.[id]?.status !== 'dead';

/** Can this person teach these tags here and now: {ok, why}. */
function teacherNow(state, content, id, tags) {
    if (typeof id !== 'string' || !state.entities?.[id] || id === 'pc') return { ok: false, why: 'no known teacher is named' };
    const name = entityLabel(state, id);
    if (!here(state, id)) return { ok: false, why: `${name} is not here` };
    const can = teacherTags(state, content, id);
    if (!can.length) return { ok: false, why: `${name} has no combat training to teach` };
    if (!tags.every((t) => can.includes(t))) return { ok: false, why: `${name} has no mastery of ${tags.join(', ')} (${can.join(', ')})` };
    return { ok: true, name };
}

// ------------------------------------------------------------------------------------------------ progress
/** The Learning Progress a day's minutes claim for a goal (rules.json growth.lp_note). */
function dayClaim(content, cls, goal, day) {
    const r = R(content);
    const m = goal.days?.[day] || {};
    const self = Math.min(r.lp_day_cap.self, (r.lp_per_hour.self * (m.self || 0)) / 60);
    const raw = Math.min(r.lp_day_cap.teacher, (r.lp_per_hour.teacher * (m.teacher || 0)) / 60 + self);
    // Patch 9C-2c: a quality of himself he trains has no discipline: no affinity
    return Math.floor(raw * (goal.target.passive ? 1 : affinityFor(content, cls, { tags: goal.target.tags })));
}

/** Apply events to a private copy and give the copy (each step is checked against the state after the ones before). */
function after(state, events) {
    const s = clone(state);
    for (const e of events) applyEvent(s, e);
    return s;
}

/** The progress events of a goal after a session (one per day it touched, none when the day gave its claim). */
function sessionProgress(state, content, goalId, days) {
    const out = [];
    const cls = state.entities.pc.sheet.class;
    let s = state;
    for (const day of days) {
        const g = growthOf(s).goals[goalId];
        if (!g || g.lp >= g.need) break;
        const gain = Math.min(g.need - g.lp, dayClaim(content, cls, g, day) - (g.days?.[day]?.lp || 0));
        if (gain <= 0) continue;
        const e = { t: 'growth.progress', d: { goal: goalId, day, lp: gain, total: g.lp + gain, need: g.need } };
        out.push(e);
        s = after(s, [e]);
    }
    return out;
}

const STAT_WORDS = { STR: 'strength', VIT: 'toughness', AGI: 'agility', INT: 'mind', PER: 'senses', WIL: 'will' };
const techniqueText = (t) => (t.passive ? `an Ordinary Passive of his ${STAT_WORDS[t.stat]} (${t.stat})` : `${t.aspects?.length ? `${t.aspects.join('/')} ` : ''}${t.fn} (${t.tags.join(', ')})`);

/** A learning goal in a few words (the planner's LEARNING, #skills): what, from what, how far. */
export const goalText = (g) => `${techniqueText(g.target)} from ${g.source.name}, ${g.lp}/${g.need} LP`;

/** Patch 9C-2c: the Ordinary Passive his training of this core stat would make (its budget, rules.json passive_design). */
const ordinaryProbe = (content, stat) => ({ id: 'dyn.passive_probe', scope: 'always', effects: [{ kind: 'core_stat_bonus', stat, value: qualityBudget(content, 'ordinary')?.per.core_stat_bonus ?? 2 }] });
const passiveTraining = (s, content, stat) => passiveGain(s.entities.pc.sheet, content, ordinaryProbe(content, stat))[0] > 0;

// ------------------------------------------------------------------------------------------------ Patch 9C-2b: sources
/** The technique a source's fixed profile legitimizes, or why none: {target} | {refuse}. */
function sourceTarget(content, p) {
    if (!p?.fn) return { refuse: 'what technique it holds was never established, so it teaches none' };
    if (p.rank !== 'F') return { refuse: `${p.rank}-Rank techniques cannot be learned yet (only F-Rank)` };
    const t = composeTags(content, p.fn, p.tags?.length ? p.tags : null);
    if (t.error) return { refuse: t.error };
    return { target: { fn: p.fn, tags: t.tags, aspects: [...(p.aspects || [])] } };
}

const manualOf = (content, o) => { const p = profileOf(content, o); return p?.kind === 'skill_source' && p.source === 'manual' ? p : null; };
const holds = (o) => !!o && o.holder?.entity === 'pc' && (o.qty ?? 1) >= 1;

/** The manual he names for his study: {object, profile} | {refuse} | null (none named). */
function materialFor(s, content, ref) {
    if (ref === null || ref === undefined) return null;
    if (typeof ref !== 'string') return { refuse: `he holds no "${String(ref?.new ?? '').replace(/[<>`]/g, '').slice(0, 40)}" the engine knows` };
    const o = s.objects?.[ref];
    if (!holds(o)) return { refuse: `he does not hold ${o?.name || 'that'}` };
    const p = manualOf(content, o);
    if (!p) return { refuse: `${o.name} is no manual that teaches a technique` };
    return { object: o, profile: p };
}

/** The one manual he holds that teaches a technique (this function, when one is named), else null (none, or several). */
function heldManual(s, content, fn) {
    const all = Object.values(s.objects || {}).filter((o) => holds(o) && manualOf(content, o)?.fn && (!fn || manualOf(content, o).fn === fn));
    return all.length === 1 ? { object: all[0], profile: manualOf(content, all[0]) } : null;
}

/**
 * Patch 9C-2b: may he learn from this Skill Stone now (src/v4/commands.js use; checked again in finalizeGrowth)?
 * {target, profile} | {refuse} | null when it is no Skill Stone (or a legacy campaign: nothing changes there).
 */
export function stoneActivation(s, content, o) {
    const p = profileOf(content, o);
    if (rulesetOf(s) < 2 || p?.kind !== 'skill_source' || p.source !== 'stone') return null;
    if (s.encounter || (s.pending_combat || []).length) return { refuse: 'not in a fight: a Skill Stone is learned from in a quiet moment' };
    if (!holds(o)) return { refuse: 'he does not hold it' };
    const own = rankRefusal(content, s.entities.pc.sheet.level, p);
    if (own) return { refuse: own };
    const t = sourceTarget(content, p);
    if (t.refuse) return t;
    if (knownTechnique(s, t.target, content)) return { refuse: `he knows this technique (${techniqueText(t.target)}) already` };
    return { target: t.target, profile: p };
}

/**
 * Review of 9C-2b (R2): a goal studied from a manual is granted only while he holds that manual (the source of what he
 * learns); without it the goal stays ready with its progress. null when its source allows the grant.
 */
function sourceMissing(s, g) {
    if (g.source?.kind !== 'material' || holds(s.objects?.[g.source.object])) return null;
    return `he needs ${g.source.name} in hand to finish learning it`;
}

/** A Skill Stone activation as the transient goal finalization books (opened and closed in one step). */
function stoneGoal(s, content, o, chk, key) {
    const n = (growthOf(s).n || 0) + 1;
    const need = content.rules.proficiency.learning_progress['1'];
    return { id: `learn.${n}`, n, status: 'ready', target: chk.target, source: { kind: 'stone', object: o.id, name: o.name, basis: 'stone', key, turn: s.turn, minute: s.clock.minute }, lp: need, need, opened: { turn: s.turn, minute: s.clock.minute }, days: {}, fights: [] };
}

/**
 * Patch 9C-1: an activity train/study with a learning target (src/v4/commands.js activity, planner path). Decides
 * what it is, checks the source and gives the events to book after the time: {status, line, events, open?} or a
 * refusal/question {status, line} (nothing is booked then, not even the time).
 * c: {kind, learn, teacher, tags, aspects}; minutes: the engine's duration (null: none named); start: the minute it starts.
 */
export function learningActivity(s, content, c, minutes, start) {
    const sheet = s.entities.pc.sheet;
    const g = growthOf(s);
    const goals = openGoals(s);
    let goal = typeof c.learn === 'string' && g.goals[c.learn] ? g.goals[c.learn] : null;
    // Patch 9C-2c: a core stat he trains (learn STR … WIL), or the goal of one: an Ordinary Passive goal
    const focus = typeof c.learn === 'string' && CORE_STATS.includes(c.learn.toUpperCase()) ? c.learn.toUpperCase() : null;
    if (focus || goal?.target.passive) return passiveActivity(s, content, c, minutes, start, goal, focus);
    const known = typeof c.learn === 'string' && sheet.skills?.[c.learn] ? skillOf(content, c.learn, s) : null;
    let fresh = !goal && !known && isTechnique(content, c.learn) ? c.learn : null;
    // Patch 9C-2b: the manual he studies from: the one he names; else, without a teacher, the one manual he holds that
    // teaches the technique he names (or, naming none and working on no goal, the one manual he holds)
    const named = materialFor(s, content, c.material);
    if (named?.refuse) return { status: 'refused', reason: 'no material', line: `NOT LEARNING — ${named.refuse}; nothing is booked, no time passes for it.` };
    let material = named;
    if (!material && !c.teacher && !goal && !known && (fresh || (!c.learn && !goals.length))) material = heldManual(s, content, fresh);
    if (!goal && !known && !fresh && !c.learn && material) fresh = material.profile.fn;
    if (!goal && !known && !fresh) {
        if (c.learn) return { status: 'refused', reason: 'nothing to learn', line: `NOT LEARNING — "${String(c.learn).slice(0, 40)}" is neither a Skill he knows, nor one of his learning goals, nor a technique that can be learned (${composerFunctions(content).join(', ')}); nothing is booked.` };
        const mine = goals.filter((x) => !c.teacher || x.source.who === c.teacher);
        if (mine.length !== 1) return { status: 'clarify', reason: 'what does he learn?', line: `CLARIFY — What does he train or study${mine.length ? `: ${mine.map((x) => techniqueText(x.target)).join(' or ')}` : ''}? Name the Skill or the technique.` };
        goal = mine[0];
        if (goal.target.passive) return passiveActivity(s, content, c, minutes, start, goal, null);
    }
    if (!minutes) return { status: 'clarify', reason: 'how long?', line: `CLARIFY — How long does he ${c.kind}? Name a duration ("for 2 hours") or an end ("until evening").` };
    const parts = dayParts(start, minutes);
    const span = `${minutes} min`;
    if (known) {
        const r = R(content).train_pp;
        const events = [];
        const lines = [];
        let view = s;
        for (const p of parts) {
            const session = { t: 'growth.session', d: { skill: known.id, kind: 'self', parts: [p] } };
            events.push(session);
            view = after(view, [session]);
            if ((growthOf(view).training[known.id]?.[p.day] || 0) < r.min_minutes) continue;
            const ev = practiceProgress(view, content, known.id, r.pp, `practice on day ${p.day + 1}`, `train:${p.day}:${known.id}`);
            events.push(...ev);
            view = after(view, ev);
            for (const e of ev) lines.push(`${known.name} +${e.d.gained} PP${e.d.to.prof > e.d.from.prof ? `, now P${e.d.to.prof}` : ''}`);
        }
        const done = parts.reduce((a, p) => a + p.minutes, 0);
        return { status: 'resolved', events, engine: `PRACTICE — ${known.name}: ${span}${lines.length ? ` → ${lines.join(', ')}` : ` (Proficiency Progress once a day after ${r.min_minutes} min of practice)`}`,
            line: `PRACTISES ${known.name} for ${done} minutes — booked by the engine${lines.length ? `: ${lines.join(', ')}` : ''}. Narrate the practice; it is no new Skill and changes nothing else about him.` };
    }
    let target = goal?.target;
    let source = goal?.source;
    const events = [];
    if (fresh) {
        const t = composeTags(content, fresh, c.tags, c.teacher ? teacherTags(s, content, c.teacher) : []);
        if (t.error) return { status: 'refused', reason: 'not this technique', line: `NOT LEARNING — ${t.error}; nothing is booked.` };
        const a = composeAspects(content, c.aspects);
        if (a.error) return { status: 'refused', reason: 'not this aspect', line: `NOT LEARNING — ${a.error}; nothing is booked.` };
        target = { fn: fresh, tags: t.tags, aspects: a.aspects };
        // Patch 9C-2b: a manual teaches the technique its profile names, nothing else
        if (material) {
            const m = sourceTarget(content, material.profile);
            if (m.refuse) return { status: 'refused', reason: 'not this material', line: `NOT LEARNING — ${material.object.name}: ${m.refuse}; nothing is booked, no time passes for it.` };
            const asked = c.tags?.length || c.aspects?.length;
            if (m.target.fn !== fresh || (asked && techniqueSignature(target) !== techniqueSignature(m.target))) return { status: 'refused', reason: 'not this material', line: `NOT LEARNING — ${material.object.name} teaches ${techniqueText(m.target)}, not ${techniqueText(target)}; nothing is booked, no time passes for it.` };
            target = m.target;
        }
        const same = goals.find((x) => techniqueSignature(x.target) === techniqueSignature(target));
        if (same) { goal = same; source = same.source; }
    }
    if (knownTechnique(s, target, content)) return { status: 'refused', reason: 'already learned', line: `NOT LEARNING — he knows this technique already; practise the known Skill instead. Nothing is booked, no time passes.` };
    // a teacher session: the teacher he names, else the goal's own teacher when present; a new goal needs one
    if (c.teacher && typeof c.teacher !== 'string') return { status: 'refused', reason: 'no teacher', line: `NOT LEARNING — no known teacher is named ("${String(c.teacher.new ?? '').replace(/[<>`]/g, '').slice(0, 40)}" is nobody the engine knows here); nothing is booked, no time passes for it.` };
    const teacher = typeof c.teacher === 'string' ? c.teacher : null;
    const who = teacher || (source?.who && here(s, source.who) ? source.who : null);
    let kind = 'self';
    let boundSource = null;
    if (who) {
        const t = teacherNow(s, content, who, target.tags);
        if (!t.ok) return { status: 'refused', reason: 'no teacher', line: `NOT LEARNING — ${t.why}; nothing is booked, no time passes for it.` };
        const consent = goal?.teachers?.[who] || (who === source?.who ? source : teachingCommitment(s, who));
        if (!consent) return { status: 'refused', reason: 'no teaching commitment', line: `NOT LEARNING — ${t.name} has not agreed to teach him (no training paid for, no promise to teach him on record); nothing is booked, no time passes for it. Asking is words: the story may let them answer.` };
        kind = 'teacher';
        if (!goal) source = { kind: 'teacher', who, name: t.name, basis: consent.basis, key: consent.key, turn: s.turn, minute: start };
        else if (who !== source?.who && !goal.teachers?.[who]) boundSource = { kind: 'teacher', who, name: t.name, basis: consent.basis, key: consent.key, turn: s.turn, minute: start };
    } else if (!goal && material) {
        // Patch 9C-2b: a manual he holds opens the goal; it is bound to it (later study needs it again)
        source = { kind: 'material', object: material.object.id, name: material.object.name, basis: 'material', key: `mat:${material.object.id}`, turn: s.turn, minute: start };
    } else if (!goal) {
        return { status: 'refused', reason: 'no source', line: `NOT LEARNING — a new technique needs a source: a teacher here who has agreed to teach him, or a manual he holds that teaches it (a Skill Stone is used, not studied); nothing is booked.` };
    } else if (source?.kind === 'material') {
        const bound = s.objects?.[source.object];
        if (!bound || bound.holder?.entity !== 'pc') return { status: 'refused', reason: 'no material', line: `NOT LEARNING — he studies ${techniqueText(target)} from ${source.name}, and he does not hold it now; nothing is booked, no time passes for it.` };
    }
    if (!goal) {
        if (goals.length >= R(content).max_active) return { status: 'refused', reason: 'too many goals', line: `NOT LEARNING — he already works on ${goals.length} techniques (${goals.map((x) => techniqueText(x.target)).join('; ')}); finish one first. Nothing is booked.` };
        const n = (g.n || 0) + 1;
        goal = { id: `learn.${n}`, n, status: 'active', target, source, lp: 0, need: content.rules.proficiency.learning_progress['1'], opened: { turn: s.turn, minute: start }, days: {}, fights: [] };
        events.push({ t: 'growth.opened', d: { goal } });
    }
    let view = after(s, events);
    for (const [i, p] of parts.entries()) {
        const session = { t: 'growth.session', d: { goal: goal.id, kind, parts: [p], ...(kind === 'teacher' ? { by: who } : {}), ...(i === 0 && boundSource ? { source: boundSource } : {}) } };
        events.push(session);
        view = after(view, [session]);
        const progress = sessionProgress(view, content, goal.id, [p.day]);
        events.push(...progress);
        view = after(view, progress);
    }
    const last = events.filter((e) => e.t === 'growth.progress').at(-1);
    const total = last ? last.d.total : goal.lp;
    const gained = events.filter((e) => e.t === 'growth.progress').reduce((a, e) => a + e.d.lp, 0);
    const ready = total >= goal.need;
    const by = kind === 'teacher' ? ` with ${entityLabel(s, who)}` : goal.source?.kind === 'material' ? ` from ${goal.source.name}` : ' on his own';
    return {
        status: 'resolved', events, open: events[0].t === 'growth.opened',
        engine: `LEARNING — ${techniqueText(target)}${by}: ${span}, +${gained} LP → ${total}/${goal.need}${ready ? ' (complete: the engine books the Skill now)' : ''}${gained ? '' : ' (today\'s learning is used up)'}`,
        line: `LEARNS — ${techniqueText(target)}${by} for ${minutes} minutes, booked by the engine: Learning Progress ${total}/${goal.need}.${ready ? ' The learning is complete; he knows a new Skill only if the engine names it below (NEW SKILL).' : ' He does not know the technique yet: narrate effort and progress, no new Skill.'}`,
    };
}

/**
 * Patch 9C-2c: training a quality of himself toward an Ordinary Passive (learn: a core stat, or its goal's id): on his
 * own (a teacher teaches techniques; the hours count as his own practice), at the own rate within its day cap, toward
 * growth.passive.ordinary_need. A new goal needs a Passive slot nothing else holds or awaits (an Ordinary Passive never
 * takes another's place) and a stat his Passives can still raise. Complete, the engine offers what came of it.
 */
function passiveActivity(s, content, c, minutes, start, goal, focus) {
    const g = growthOf(s);
    const goals = openGoals(s);
    const sheet = s.entities.pc.sheet;
    if (!goal) goal = goals.find((x) => x.target.passive && x.target.stat === focus) || null;
    const stat = goal?.target.stat || focus;
    if (!minutes) return { status: 'clarify', reason: 'how long?', line: `CLARIFY — How long does he ${c.kind}? Name a duration ("for 2 hours") or an end ("until evening").` };
    const events = [];
    if (!goal) {
        const slots = passiveSlots(content);
        const promised = passivesOf(sheet).length + goals.filter((x) => x.target.passive).length + (s.decisions || []).filter((d) => d.kind === 'passive' && d.quality === 'ordinary').length;
        if (promised >= slots) return { status: 'refused', reason: 'no passive slot', line: `NOT TRAINING — all ${slots} of his Passive slots are held or awaited (${passivesOf(sheet).length} held); an Ordinary Passive never takes another's place, so nothing comes of training toward one now. Nothing is booked, no time passes for it.` };
        if (!passiveTraining(s, content, stat)) return { status: 'refused', reason: 'stat at its cap', line: `NOT TRAINING — his Passives raise his ${STAT_WORDS[stat]} (${stat}) as far as they can; nothing is booked, no time passes for it.` };
        if (goals.length >= R(content).max_active) return { status: 'refused', reason: 'too many goals', line: `NOT TRAINING — he already works on ${goals.length} goals (${goals.map((x) => techniqueText(x.target)).join('; ')}); finish one first. Nothing is booked.` };
        const n = (g.n || 0) + 1;
        goal = { id: `learn.${n}`, n, status: 'active', target: { passive: 'ordinary', stat }, source: { kind: 'practice', name: 'his own practice', basis: 'self', key: `practice:learn.${n}`, turn: s.turn, minute: start }, lp: 0, need: R(content).passive?.ordinary_need ?? 200, opened: { turn: s.turn, minute: start }, days: {}, fights: [] };
        events.push({ t: 'growth.opened', d: { goal } });
    }
    let view = after(s, events);
    for (const p of dayParts(start, minutes)) {
        const session = { t: 'growth.session', d: { goal: goal.id, kind: 'self', parts: [p] } };
        events.push(session);
        view = after(view, [session]);
        const progress = sessionProgress(view, content, goal.id, [p.day]);
        events.push(...progress);
        view = after(view, progress);
    }
    const total = growthOf(view).goals[goal.id].lp;
    const gained = events.filter((e) => e.t === 'growth.progress').reduce((a, e) => a + e.d.lp, 0);
    const ready = total >= goal.need;
    const alone = c.teacher ? ' (as his own practice: a lasting quality of himself he trains by himself)' : '';
    return {
        status: 'resolved', events, open: events[0]?.t === 'growth.opened',
        engine: `TRAINING — his ${STAT_WORDS[stat]} (${stat}) toward an Ordinary Passive: ${minutes} min, +${gained} LP → ${total}/${goal.need}${ready ? ' (complete: the engine offers what came of it)' : ''}${gained ? '' : ' (today\'s training is used up)'}`,
        line: `TRAINS — his ${STAT_WORDS[stat]} (${stat}) for ${minutes} minutes on his own${alone}, booked by the engine: Learning Progress ${total}/${goal.need} toward an Ordinary Passive.${ready ? ' The training is complete; what came of it is offered only if the engine names it below (POSSIBLE PASSIVE), and nothing about him changes before he accepts it.' : ' Nothing about him changes yet: narrate effort and progress, no new Passive, no stronger mind or body.'}`,
    };
}

// ------------------------------------------------------------------------------------------------ fights
/**
 * Patch 9C-1: the Learning Progress of a fight that is over (src/combat.js endEncounterEvents): a fight that qualifies
 * for Proficiency Progress, in which he used a Skill sharing a tag with an open goal; the oldest such goal, once.
 */
export function fightGrowth(state, content, enc) {
    if (rulesetOf(state) < 2 || !fightQualifies(state, content, enc)) return [];
    const tags = new Set(Object.keys(enc.pp?.used || {}).flatMap((id) => skillOf(content, id, state)?.tags || []));
    const goal = openGoals(state).find((g) => !g.target.passive && g.lp < g.need && !(g.fights || []).includes(enc.id) && !knownTechnique(state, g.target, content) && g.target.tags.some((t) => tags.has(t)));
    if (!goal) return [];
    const gain = Math.min(goal.need - goal.lp, Math.floor(R(content).fight_lp * affinityFor(content, state.entities.pc.sheet.class, { tags: goal.target.tags })));
    if (gain <= 0) return [];
    return [{ t: 'growth.progress', d: { goal: goal.id, fight: enc.id, lp: gain, total: goal.lp + gain, need: goal.need } }];
}

// ------------------------------------------------------------------------------------------------ finalization
const canFinalize = (state) => rulesetOf(state) >= 2 && !state.encounter && !(state.pending_combat || []).length && state.entities?.pc?.status !== 'dead';
// Patch 9C-2b: how a Skill names its source (the composer's engine description and its origin note)
const sourceNote = (src) => (src.kind === 'stone' ? `drawn from a Skill Stone (${src.name})` : src.kind === 'material' ? `studied from ${src.name}` : `taught by ${src.name}`);
const composeGoal = (state, content, g) => composeSkill(state, content, { ...g.target, origin: { kind: g.source.kind, note: sourceNote(g.source) }, source: sourceNote(g.source) });

/** The Skill Stones a turn activated (src/v4/commands.js use): [{key, object}] of its outcome. */
export const activationsOf = (outcome) => outcome?.booked?.activations || [];

/** Read-only, legitimized drafts for the asynchronous host. The actual grant below stays synchronous. */
export function growthDrafts(state, content, activations = []) {
    if (!canFinalize(state)) return [];
    const seen = new Set();
    const drafts = [];
    const add = (key, g) => {
        const sig = techniqueSignature(g.target);
        if (seen.has(sig) || knownTechnique(state, g.target, content)) return;
        seen.add(sig);
        const c = composeGoal(state, content, g);
        if (!c.errors.length) drafts.push({ key, hash: hash32(JSON.stringify(c.def)), def: c.def });
    };
    for (const g of openGoals(state).filter((x) => x.status === 'ready' && !x.target.passive && !sourceMissing(state, x))) add(g.id, g);
    for (const a of activations) {
        const o = state.objects?.[a.object];
        const chk = o ? stoneActivation(state, content, o) : null;
        if (chk && !chk.refuse) add(a.key, stoneGoal(state, content, o, chk, a.key));
    }
    return drafts;
}

/** One grant on a private copy: composed, named (the Forge's name when it is valid), defined, learned, closed. */
function grant(s, content, g, chosen) {
    const comp = composeGoal(s, content, g);
    if (comp.errors.length) return { errors: comp.errors };
    if (chosen && !chosen.fallback) {
        const candidate = { ...comp.def, name: chosen.name, ...(chosen.flavor ? { flavor: chosen.flavor } : {}) };
        const passiveCollision = [...Object.values(s.passive_defs || {}), ...(s.decisions || []).filter((d) => d.kind === 'passive').map((d) => d.passive)].some((p) => normText(p?.name) === normText(candidate.name));
        if (!passiveCollision && !skillDefErrors(candidate, content, s).length) comp.def = candidate;
    }
    const def = defineSkill(s, content, comp.def);
    if (def.errors.length) return { errors: def.errors };
    const s1 = after(s, def.events);
    const learn = learnSkill(s1, content, 'pc', def.skill.id, `learned ${sourceNote(g.source)} (${g.id})`);
    if (learn.errors.length) return { errors: learn.errors };
    const close = { t: 'growth.closed', d: { goal: g.id, skill: def.skill.id, name: def.skill.name } };
    return { events: [...def.events, ...learn.events, close], state: after(s1, [...learn.events, close]), skill: def.skill };
}

/**
 * Patch 9C-1: the ready goals become Skills (after a regular planned turn; src/v4/runtime.js). Each one: composed,
 * defined, learned and closed, checked on a private copy of the state; a goal that fails stays ready with its
 * Learning Progress and source (a later turn tries again). Nothing during a fight, nothing for a dead PC.
 * Patch 9C-2b: then the Skill Stones the turn activated, each checked again here and booked with the same grant plus
 * its transient goal and the one unit it spends; one that fails books nothing, the stone stays his.
 * @returns {{events: object[], learned: {key, skill, name, goal, technique, teacher}[], failed: {goal|key, errors}[]}}
 */
export function finalizeGrowth(state, content, names = {}, activations = []) {
    const out = { events: [], learned: [], failed: [] };
    if (!canFinalize(state)) return out;
    let s = state;
    const learned = (key, g, skill) => out.learned.push({ key, skill: skill.id, name: skill.name, goal: g.id, technique: techniqueText(g.target), teacher: g.source.name, source: g.source.kind, category: skill.category, cost: skill.cost });
    for (const g of openGoals(state)) {
        const known = knownTechnique(s, g.target, content);
        if (known) {
            // Retire .42 duplicates even if still active: they cannot progress or consume a learning slot.
            const close = { t: 'growth.closed', d: { goal: g.id, skill: known, name: skillOf(content, known, s).name } };
            s = after(s, [close]);
            out.events.push(close);
            continue;
        }
        if (g.status !== 'ready') continue;
        // Patch 9C-2c: a complete Ordinary Passive goal becomes evidence (src/v4/passive_growth.js offers it in this same
        // step); while no slot is free or his Passives raise the stat no further it stays complete, nothing is lost
        if (g.target.passive) {
            const full = passivesOf(s.entities.pc.sheet).length >= passiveSlots(content);
            const why = full ? `all ${passiveSlots(content)} of his Passive slots are held` : !passiveTraining(s, content, g.target.stat) ? `his Passives raise ${g.target.stat} as far as they can` : null;
            if (why) { out.failed.push({ goal: g.id, source: 'practice', name: g.source.name, technique: techniqueText(g.target), lp: g.lp, need: g.need, errors: [why] }); continue; }
            const key = `train:${g.id}`;
            const close = { t: 'growth.closed', d: { goal: g.id, evidence: key, name: techniqueText(g.target) } };
            const evidence = { t: 'growth.evidence', d: { evidence: { key, kind: 'training', quality: 'ordinary', focus: g.target.stat, goal: g.id, why: `long practice of his ${STAT_WORDS[g.target.stat]}`, turn: s.turn, minute: s.clock.minute } } };
            s = after(s, [close, evidence]);
            out.events.push(close, evidence);
            continue;
        }
        const missing = sourceMissing(s, g);
        if (missing) { out.failed.push({ goal: g.id, source: 'material', name: g.source.name, technique: techniqueText(g.target), lp: g.lp, need: g.need, errors: [missing] }); continue; }
        try {
            const r = grant(s, content, g, names[g.id]);
            if (r.errors) { out.failed.push({ goal: g.id, errors: r.errors }); continue; }
            s = r.state;
            out.events.push(...r.events);
            learned(g.id, g, r.skill);
        } catch (err) {
            out.failed.push({ goal: g.id, errors: [String(err?.message || err)] });
        }
    }
    for (const a of activations) {
        const o = s.objects?.[a.object];
        const fail = (why) => out.failed.push({ key: a.key, object: a.object, name: o?.name || a.object, errors: [why] });
        const chk = o ? stoneActivation(s, content, o) : null;
        if (!chk || chk.refuse) { fail(chk?.refuse || 'it is no longer his'); continue; }
        try {
            const goal = stoneGoal(s, content, o, chk, a.key);
            const open = { t: 'growth.opened', d: { goal } };
            const r = grant(after(s, [open]), content, goal, names[a.key]);
            if (r.errors) { fail(r.errors.join('; ')); continue; }
            const spend = { t: 'object.consumed', d: { id: o.id, by: 'pc', ...((o.qty ?? 1) > 1 ? { qty: 1 } : {}) } };
            s = after(r.state, [spend]);
            out.events.push(open, ...r.events, spend);
            learned(a.key, goal, r.skill);
        } catch (err) {
            fail(String(err?.message || err));
        }
    }
    return out;
}

// ------------------------------------------------------------------------------------------------ reducer
/** Apply one growth event in place (src/state.js). */
export function applyGrowthEvent(state, e) {
    const d = e.d || {};
    if (!state.growth) state.growth = clone(EMPTY);
    const g = state.growth;
    const keep = (days, n) => Object.fromEntries(Object.entries(days).sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, n));
    switch (e.t) {
        case 'growth.opened':
            if (g.goals[d.goal.id]) throw new Error(`learning goal exists: ${d.goal.id}`);
            g.goals[d.goal.id] = clone(d.goal);
            g.n = Math.max(g.n || 0, d.goal.n || 0);
            rememberService(state, d.goal.source);
            break;
        case 'growth.session': {
            if (d.goal) {
                const goal = g.goals[d.goal];
                if (!goal) throw new Error(`session of an unknown learning goal ${d.goal}`);
                if (d.source) {
                    (goal.teachers ||= {})[d.source.who] = clone(d.source);
                    rememberService(state, d.source);
                }
                for (const p of d.parts) {
                    const day = goal.days[p.day] || (goal.days[p.day] = { teacher: 0, self: 0, lp: 0 });
                    day[d.kind === 'teacher' ? 'teacher' : 'self'] += p.minutes;
                }
                goal.days = keep(goal.days, KEEP_DAYS);
            } else {
                const t = g.training[d.skill] || (g.training[d.skill] = {});
                for (const p of d.parts) t[p.day] = (t[p.day] || 0) + p.minutes;
                g.training[d.skill] = keep(t, KEEP_DAYS);
            }
            break;
        }
        case 'growth.progress': {
            const goal = g.goals[d.goal];
            if (!goal) throw new Error(`progress of an unknown learning goal ${d.goal}`);
            goal.lp = d.total;
            if (d.day !== undefined) { const day = goal.days[d.day] || (goal.days[d.day] = { teacher: 0, self: 0, lp: 0 }); day.lp += d.lp; }
            if (d.fight) goal.fights = [...(goal.fights || []), d.fight].slice(-KEEP_FIGHTS);
            if (goal.lp >= goal.need) goal.status = 'ready';
            break;
        }
        case 'growth.closed': {
            const goal = g.goals[d.goal];
            if (!goal) throw new Error(`close of an unknown learning goal ${d.goal}`);
            delete g.goals[d.goal];
            g.done = [...g.done, { id: d.goal, ...(d.evidence ? { evidence: d.evidence } : { skill: d.skill }), name: d.name, fn: goal.target.fn ?? null, who: goal.source.who, key: goal.source.key, keys: goalSources(goal).map((s) => s.key), turn: state.turn, minute: state.clock.minute }].slice(-KEEP_DONE);
            break;
        }
        // 9C completion (src/v4/skill_growth.js): the patterns his Skills showed in a qualifying fight, and the Skills he used
        // one after the other in it: the last few fights of each, by fight (a fight is noted once)
        case 'growth.noted': {
            const marks = (g.marks ||= {});
            const pairs = (g.pairs ||= {});
            const at = { fight: d.fight, turn: state.turn, minute: state.clock.minute };
            for (const [sid, m] of Object.entries(d.marks || {})) {
                if ((marks[sid] || []).some((x) => x.fight === d.fight)) throw new Error(`fight noted twice: ${d.fight}`);
                marks[sid] = [...(marks[sid] || []), { ...at, prof: m.prof, patterns: [...m.patterns] }].slice(-KEEP_NOTED);
            }
            for (const k of d.pairs || []) pairs[k] = [...(pairs[k] || []), at].slice(-KEEP_NOTED);
            break;
        }
        // Patch 9C-2c (src/v4/passive_growth.js): a development's evidence, its offer, his decision on it; kept for good,
        // so the same evidence is never offered or rolled again
        case 'growth.evidence': {
            const ev = (g.evidence ||= {});
            if (ev[d.evidence.key]) throw new Error(`evidence exists: ${d.evidence.key}`);
            ev[d.evidence.key] = { ...clone(d.evidence), status: d.evidence.status || 'pending' };
            break;
        }
        case 'growth.offered': {
            const ev = g.evidence?.[d.key];
            if (!ev || ev.status !== 'pending') throw new Error(`offer of evidence not pending: ${d.key}`);
            ev.status = 'offered';
            ev.decision = d.decision;
            break;
        }
        case 'growth.decided': {
            const ev = g.evidence?.[d.key];
            if (!ev || ev.status !== 'offered') throw new Error(`decision on evidence not offered: ${d.key}`);
            ev.status = d.status;
            if (d.passive) ev.passive = d.passive;
            if (d.skill) ev.skill_booked = d.skill;
            break;
        }
        default:
            throw new Error(`unknown growth event ${e.t}`);
    }
}

/** The #skills lines of his learning goals. */
export function goalLines(state) {
    return openGoals(state).map((g) => `- ${g.id}: ${techniqueText(g.target)} from ${g.source.name} · ${g.lp}/${g.need} LP${g.status === 'ready' ? (g.target.passive ? ' · complete (offered on his next turn outside a fight, while a Passive slot is free)' : ' · complete (booked on his next turn outside a fight)') : ''}`);
}

