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
// Pure functions of the state; nothing here calls an LLM, and nothing is booked in a legacy campaign.
import { rulesetOf, skillOf, npcTemplate } from '../content.js';
import { affinityFor, defineSkill, learnSkill, fightQualifies, practiceProgress } from '../skills.js';
import { composeSkill, composeTags, composeAspects, composerFunctions } from '../skill_composer.js';
import { applyEvent } from '../state.js';
import { truth, entityLabel } from '../knowledge.js';
import { clone, normText } from '../util.js';

const EMPTY = { n: 0, goals: {}, done: [], training: {} };
const DAY = 1440;
// what the state keeps (fixed: a reducer reads no content): the last two game days of a ledger (new sessions book
// each day before trimming it), the last fights a goal was credited for, the last closed goals
const KEEP_DAYS = 2;
const KEEP_FIGHTS = 6;
const KEEP_DONE = 20;

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
const serviceKey = (x) => `svc:${x.turn}:${x.minute}:${x.by}`;
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
    return Math.floor(raw * affinityFor(content, cls, { tags: goal.target.tags }));
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

const techniqueText = (t) => `${t.aspects?.length ? `${t.aspects.join('/')} ` : ''}${t.fn} (${t.tags.join(', ')})`;

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
    const known = typeof c.learn === 'string' && sheet.skills?.[c.learn] ? skillOf(content, c.learn, s) : null;
    const fresh = !goal && !known && isTechnique(content, c.learn) ? c.learn : null;
    if (!goal && !known && !fresh) {
        if (c.learn) return { status: 'refused', reason: 'nothing to learn', line: `NOT LEARNING — "${String(c.learn).slice(0, 40)}" is neither a Skill he knows, nor one of his learning goals, nor a technique that can be learned (${composerFunctions(content).join(', ')}); nothing is booked.` };
        const mine = goals.filter((x) => !c.teacher || x.source.who === c.teacher);
        if (mine.length !== 1) return { status: 'clarify', reason: 'what does he learn?', line: `CLARIFY — What does he train or study${mine.length ? `: ${mine.map((x) => techniqueText(x.target)).join(' or ')}` : ''}? Name the Skill or the technique.` };
        goal = mine[0];
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
        const same = goals.find((x) => x.target.fn === fresh && x.target.tags.join() === target.tags.join() && (x.target.aspects || []).join() === target.aspects.join());
        if (same) { goal = same; source = same.source; }
    }
    // a teacher session: the teacher he names, else the goal's own teacher when present; a new goal needs one
    if (c.teacher && typeof c.teacher !== 'string') return { status: 'refused', reason: 'no teacher', line: `NOT LEARNING — no known teacher is named ("${String(c.teacher.new ?? '').replace(/[<>`]/g, '').slice(0, 40)}" is nobody the engine knows here); nothing is booked, no time passes for it.` };
    const named = typeof c.teacher === 'string' ? c.teacher : null;
    const who = named || (source?.who && here(s, source.who) ? source.who : null);
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
    } else if (!goal) {
        return { status: 'refused', reason: 'no source', line: `NOT LEARNING — a new technique needs a teacher here who has agreed to teach him (Skill Stones and study material come later); nothing is booked.` };
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
    const by = kind === 'teacher' ? ` with ${entityLabel(s, who)}` : ' on his own';
    return {
        status: 'resolved', events, open: events[0].t === 'growth.opened',
        engine: `LEARNING — ${techniqueText(target)}${by}: ${span}, +${gained} LP → ${total}/${goal.need}${ready ? ' (complete: the engine books the Skill now)' : ''}${gained ? '' : ' (today\'s learning is used up)'}`,
        line: `LEARNS — ${techniqueText(target)}${by} for ${minutes} minutes, booked by the engine: Learning Progress ${total}/${goal.need}.${ready ? ' The learning is complete; the engine names the new Skill below.' : ' He does not know the technique yet: narrate effort and progress, no new Skill.'}`,
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
    const goal = openGoals(state).find((g) => g.lp < g.need && !(g.fights || []).includes(enc.id) && g.target.tags.some((t) => tags.has(t)));
    if (!goal) return [];
    const gain = Math.min(goal.need - goal.lp, Math.floor(R(content).fight_lp * affinityFor(content, state.entities.pc.sheet.class, { tags: goal.target.tags })));
    if (gain <= 0) return [];
    return [{ t: 'growth.progress', d: { goal: goal.id, fight: enc.id, lp: gain, total: goal.lp + gain, need: goal.need } }];
}

// ------------------------------------------------------------------------------------------------ finalization
/**
 * Patch 9C-1: the ready goals become Skills (after a regular planned turn; src/v4/runtime.js). Each one: composed,
 * defined, learned and closed, checked on a private copy of the state; a goal that fails stays ready with its
 * Learning Progress and source (a later turn tries again). Nothing during a fight, nothing for a dead PC.
 * @returns {{events: object[], learned: {skill, name, goal, technique, teacher}[], failed: {goal, errors}[]}}
 */
export function finalizeGrowth(state, content) {
    const out = { events: [], learned: [], failed: [] };
    if (rulesetOf(state) < 2 || state.encounter || state.entities?.pc?.status === 'dead') return out;
    let s = state;
    for (const g of openGoals(state).filter((x) => x.status === 'ready')) {
        const comp = composeSkill(s, content, { fn: g.target.fn, tags: g.target.tags, aspects: g.target.aspects, origin: { kind: g.source.kind, note: `taught by ${g.source.name}` }, source: `taught by ${g.source.name}` });
        if (comp.errors.length) { out.failed.push({ goal: g.id, errors: comp.errors }); continue; }
        try {
            const def = defineSkill(s, content, comp.def);
            if (def.errors.length) { out.failed.push({ goal: g.id, errors: def.errors }); continue; }
            const s1 = after(s, def.events);
            const learn = learnSkill(s1, content, 'pc', def.skill.id, `learned from ${g.source.name} (${g.id})`);
            if (learn.errors.length) { out.failed.push({ goal: g.id, errors: learn.errors }); continue; }
            const close = { t: 'growth.closed', d: { goal: g.id, skill: def.skill.id, name: def.skill.name } };
            const events = [...def.events, ...learn.events, close];
            s = after(s1, [...learn.events, close]);
            out.events.push(...events);
            out.learned.push({ skill: def.skill.id, name: def.skill.name, goal: g.id, technique: techniqueText(g.target), teacher: g.source.name, category: def.skill.category, cost: def.skill.cost });
        } catch (err) {
            out.failed.push({ goal: g.id, errors: [String(err?.message || err)] });
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
            g.done = [...g.done, { id: d.goal, skill: d.skill, name: d.name, fn: goal.target.fn, who: goal.source.who, key: goal.source.key, keys: goalSources(goal).map((s) => s.key), turn: state.turn, minute: state.clock.minute }].slice(-KEEP_DONE);
            break;
        }
        default:
            throw new Error(`unknown growth event ${e.t}`);
    }
}

/** The #skills lines of his learning goals. */
export function goalLines(state) {
    return openGoals(state).map((g) => `- ${g.id}: ${techniqueText(g.target)} from ${g.source.name} · ${g.lp}/${g.need} LP${g.status === 'ready' ? ' · complete (booked on his next turn outside a fight)' : ''}`);
}

