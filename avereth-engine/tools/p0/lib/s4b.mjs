// P0 / S4b (docs/P0_S4B.md): the problem class itself. Skill aliases and typos, free target references, creative use
// of known skills on the world, combat + world in one message, search vs travel vs combat, genuine ambiguity, unknown
// or impossible actions, messages without an action. This module holds what every arm shares, so that the arms differ
// only where the design says they do:
//   - the scene: one real engine state per scene (A0 reads it) and the catalog rendered from that same state (the LLM
//     arms read it), plus features, places and RECENT from tests/eval/s4b_scenes.json;
//   - the plan: intent classes, the typed validator and its repair messages (identical for the JSON and the tool arm);
//   - A0: Avereth's deterministic reading of today (src/ir.js readTurn, unchanged) mapped onto the plan classes, and the
//     fast-path gate that decides whether A0 may commit without the LLM (the cascade);
//   - the agency guard of the product on plans, and the scoring: correct · wrong hard commit · missed · unneeded question.
// S4b scores the reading of the message only. Whether a skill works, what it costs and what follows is the engine's.
import fs from 'node:fs';
import path from 'node:path';
import { ENGINE_ROOT, extractJsonObject, readJsonl } from './util.mjs';
import { loadContentPack } from '../../../src/content.js';
import { startCampaign, playerTurn, narratorReply } from '../../../src/engine.js';
import { fold } from '../../../src/state.js';
import { readTurn } from '../../../src/ir.js';
import { declarative, mentionedSkills } from '../../../src/intent.js';
import { normText } from '../../../src/util.js';
import { guardCommands, anchorQuote } from '../../../src/v4/agency.js';

export const SCENES_FILE = path.join(ENGINE_ROOT, 'tests', 'eval', 's4b_scenes.json');
export const CASES_FILE = path.join(ENGINE_ROOT, 'tests', 'eval', 's4b_cases.jsonl');
const FIRST_MESSAGE = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Redmarch, Veyrhold`';

/** The intent classes of a plan. An empty plan: no engine action in the message. */
export const KINDS = ['attack', 'skill', 'move', 'flee', 'ability_world', 'search', 'go', 'clarify'];
/** What the engine would carry out (a hard commit); A0 can also produce stealth and engage. */
export const HARD = new Set(['attack', 'skill', 'move', 'flee', 'ability_world', 'search', 'go', 'stealth', 'engage']);
export const ABOUT = ['target', 'skill', 'action'];
export const HP_WORDS = { unhurt: 1, wounded: 0.55, 'badly wounded': 0.2 };

// ------------------------------------------------------------------------------------------------ data
export async function loadContent() {
    return loadContentPack(async (name) => JSON.parse(fs.readFileSync(path.join(ENGINE_ROOT, 'content', name), 'utf8')));
}

export function loadSceneSpecs(file = SCENES_FILE) {
    const all = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Object.fromEntries(Object.entries(all).filter(([k]) => !k.startsWith('_')).map(([id, s]) => [id, { id, ...s }]));
}

export function loadCases(file = CASES_FILE) {
    return readJsonl(file);
}

// ------------------------------------------------------------------------------------------------ scene
const idOfRef = (state, ref) => Object.keys(state.entities).find((id) => id.split('.').pop() === String(ref).toLowerCase()) || null;

/**
 * Build one scene as the engine has it: class and skills chosen, Alaric arrives, the narrator reports who is there
 * (and the fight, if any). Bands and HP are then set as the scene file says; the opponents' first turns may have moved
 * them. Returns the state A0 reads (marked runtime V4, as the product reads a fight) and the catalog the LLM arms see.
 */
export function buildScene(spec, content) {
    const log = startCampaign(content, { seed: spec.seed ?? 7, firstMessage: FIRST_MESSAGE });
    let state = fold(log);
    const turn = (text) => { const r = playerTurn(state, content, text, { msg: log.length }); log.push(...r.events); state = r.state; };
    const reply = (text, report = {}) => { const r = narratorReply(state, content, `${text}\n<avereth>${JSON.stringify(report)}</avereth>`, { msg: log.length }); log.push(...r.events); state = r.state; };
    turn(spec.class);
    reply('The narration continues.');
    turn(spec.skills);
    reply('The narration continues.');
    turn(spec.arrive);
    const entry = (o) => ({ ref: o.ref, ...(o.name ? { name: o.name } : {}), kind: o.kind, ...(o.species ? { species: o.species } : {}), desc: o.desc, ...(o.band ? { band: o.band } : {}) });
    const news = [...spec.opponents, ...spec.others].map(entry);
    reply(spec.prose || 'The scene is set.', { new: news, ...(spec.fight ? { combat: spec.opponents.map((o) => ({ by: o.ref })) } : {}) });
    state = structuredClone(state);
    state.meta = { ...(state.meta || {}), runtime: 'v4' };
    const enc = state.encounter;
    if (spec.fight && !enc) throw new Error(`scene ${spec.id}: the fight did not start`);
    const opponents = spec.opponents.map((o) => {
        const id = idOfRef(state, o.ref);
        const c = enc?.combatants?.[id];
        if (!id || !c) throw new Error(`scene ${spec.id}: opponent ${o.ref} is not in the fight`);
        c.current.band = o.band;
        const max = c.current.hp;
        c.current.hp = Math.max(1, Math.round(max * (HP_WORDS[o.hp || 'unhurt'] ?? 1)));
        return { id, label: c.label, hp: o.hp || 'unhurt', band: o.band };
    });
    const others = spec.others.map((o) => {
        const id = idOfRef(state, o.ref);
        if (!id) throw new Error(`scene ${spec.id}: ${o.ref} was not created`);
        if (o.dead) {
            state.entities[id].status = 'dead';
            if (enc?.combatants?.[id]) enc.combatants[id].current.defeated = true;
        }
        const label = o.label || `${o.name || o.desc[0]}${o.name ? ` (${o.desc.join(', ')})` : ''}`;
        return { id, label, note: o.dead ? 'dead' : 'not hostile' };
    });
    const sheet = state.entities.pc.sheet;
    const skills = Object.keys(sheet.skills).map((sid) => skillInfo(content.skills.get(sid))).filter(Boolean);
    const catalog = {
        scene: spec.id, where: spec.where, fight: !!spec.fight, cls: spec.class,
        skills, opponents, others, features: spec.features || [], places: spec.places || [], recent: spec.recent || '',
    };
    return { state, catalog };
}

function skillInfo(s) {
    if (!s) return null;
    const area = !!s.range?.area;
    const attack = !!s.attack;
    return {
        id: s.id,
        name: s.name,
        attack,
        area,
        text: [
            attack ? 'attack' : String(s.category || 'support').toLowerCase(),
            area ? 'area: every foe ENGAGED with Alaric' : attack ? 'single target' : 'on Alaric himself',
            s.range?.band ? `range ${s.range.band}` : null,
            s.type_text || null,
            s.cost ? `${s.cost.amount} ${String(s.cost.resource).toUpperCase()}` : null,
        ].filter(Boolean).join(' · '),
    };
}

export function buildScenes(specs, content) {
    return Object.fromEntries(Object.entries(specs).map(([id, spec]) => [id, buildScene(spec, content)]));
}

/** The catalog block of the user message; RECENT only when the arm reads the history. */
export function catalogText(cat, { history = true } = {}) {
    const L = [`SCENE: ${cat.where} — ${cat.fight ? 'a fight is on' : 'no fight'}`, `ALARIC: ${cat.cls}`];
    L.push('KNOWN SKILLS (the only skill ids):');
    for (const s of cat.skills) L.push(`- ${s.id}: ${s.name} — ${s.text}`);
    L.push(cat.opponents.length ? 'OPPONENTS (in the fight):' : 'OPPONENTS: none');
    for (const o of cat.opponents) L.push(`- ${o.id}: ${o.label} — ${o.hp} · ${o.band}`);
    if (cat.others.length) {
        L.push('OTHERS PRESENT:');
        for (const o of cat.others) L.push(`- ${o.id}: ${o.label} — ${o.note}`);
    }
    if (cat.features.length) {
        L.push('FEATURES (things here):');
        for (const f of cat.features) L.push(`- ${f.id}: ${f.text}`);
    }
    if (cat.places.length) {
        L.push('PLACES:');
        for (const p of cat.places) L.push(`- ${p.id}: ${p.name}`);
    }
    if (history && cat.recent) L.push('RECENT (the last narration):', cat.recent);
    return L.join('\n');
}

export function plannerUser(cat, text, { history = true } = {}) {
    return `${catalogText(cat, { history })}\n\nPLAYER MESSAGE:\n${text}`;
}

// ------------------------------------------------------------------------------------------------ plan validation
const isNew = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && typeof v.new === 'string' && v.new.trim() !== '';

/**
 * Check a plan against the catalog. The error lines name the intent, its kind and the field, and say what is allowed:
 * the same lines go back in the one repair of the JSON arm and of the tool arm.
 * @returns {{intents: object[]|null, errors: string[]}}
 */
export function validatePlan(value, cat) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.intents)) {
        return { intents: null, errors: ['the plan must be an object {"intents": [...]} (an empty list when he takes no engine action)'] };
    }
    const skills = cat.skills.map((s) => s.id);
    const people = [...cat.opponents, ...cat.others].map((o) => o.id);
    const features = cat.features.map((f) => f.id);
    const places = cat.places.map((p) => p.id);
    const errors = [];
    value.intents.forEach((it, i) => {
        const at = `intents[${i}]${it && typeof it === 'object' && it.kind ? ` (${it.kind})` : ''}`;
        if (!it || typeof it !== 'object' || Array.isArray(it)) { errors.push(`${at}: must be an object`); return; }
        if (!KINDS.includes(it.kind)) { errors.push(`${at}: "kind" must be one of ${KINDS.join(', ')}`); return; }
        if (it.kind !== 'clarify' && (typeof it.quote !== 'string' || !it.quote.trim())) errors.push(`${at}: missing "quote" (the exact words of the message)`);
        const skill = () => {
            if (!(skills.includes(it.skill) || isNew(it.skill))) errors.push(`${at}: "skill" must be one of ${skills.join(', ')}, or {"new": "<the name he used>"} for a skill Alaric does not know`);
        };
        const person = (optional) => {
            if (optional && (it.target === null || it.target === undefined)) return;
            if (!(people.includes(it.target) || isNew(it.target))) errors.push(`${at}: "target" must be an id from OPPONENTS or OTHERS PRESENT${people.length ? ` (${people.join(', ')})` : ''}, {"new": "<description>"} for one who is not here${optional ? ', or null' : ''}`);
        };
        switch (it.kind) {
            case 'attack': skill(); person(true); break;
            case 'skill': skill(); person(true); break;
            case 'move':
                if (!['closer', 'away'].includes(it.dir)) errors.push(`${at}: "dir" must be "closer" or "away"`);
                person(true);
                break;
            case 'ability_world':
                skill();
                if (!(features.includes(it.target) || isNew(it.target))) errors.push(`${at}: "target" must be an id from FEATURES${features.length ? ` (${features.join(', ')})` : ''} or {"new": "<the thing>"}`);
                if (typeof it.goal !== 'string' || !it.goal.trim()) errors.push(`${at}: missing "goal" (what he wants to achieve, in a few words)`);
                break;
            case 'search':
                if (it.what !== undefined && it.what !== null && typeof it.what !== 'string') errors.push(`${at}: "what" must be a short text or null`);
                break;
            case 'go':
                if (!(places.includes(it.to) || isNew(it.to))) errors.push(`${at}: "to" must be an id from PLACES${places.length ? ` (${places.join(', ')})` : ''} or {"new": "<where>"}`);
                break;
            case 'clarify':
                if (!ABOUT.includes(it.about)) errors.push(`${at}: "about" must be one of ${ABOUT.join(', ')}`);
                break;
            default:
        }
    });
    if (errors.length) return { intents: null, errors: errors.slice(0, 8) };
    return { intents: value.intents.map((it) => ({ ...it })), errors: [] };
}

/** Read an answer text (JSON arm) or tool arguments (tool arm) into a plan value. */
export function readPlanText(text) {
    if (text && typeof text === 'object') return { value: text, error: null };
    const { value, error } = extractJsonObject(String(text ?? ''));
    return { value, error: value ? null : error || 'no JSON object' };
}

// ------------------------------------------------------------------------------------------------ guard
/** Words of a quote, for the lenient evidence check. */
const contentWords = (t) => normText(String(t ?? '').replace(/\*/g, ' ')).split(/[^a-z0-9']+/).map((w) => w.replace(/'/g, '')).filter((w) => w.length > 2);

/**
 * The product's agency guard on a plan (src/v4/agency.js guardCommands, unchanged): a question, someone else's deed or
 * quoted words of someone else drop the intent. Evidence: a hard intent whose quote is not in the player's message (word
 * for word, anchored like the product, or by most of its words, so that a quote with a corrected typo still counts) is
 * dropped as well: that is how an intent taken from RECENT instead of the message is caught. Clarify carries no quote.
 */
export function guardPlan(text, intents, cat) {
    const present = [...cat.opponents, ...cat.others].map((o) => ({ id: o.id, names: [o.label] }));
    const kept = [];
    const dropped = [];
    const message = new Set(contentWords(text));
    const evidence = (quote) => {
        if (anchorQuote(text, quote)) return true;
        const w = contentWords(quote);
        return w.length > 0 && w.filter((x) => message.has(x)).length / w.length >= 0.6;
    };
    const cmds = [];
    intents.forEach((it, i) => {
        if (it.kind === 'clarify') return;
        if (HARD.has(it.kind) && !evidence(it.quote)) { dropped.push({ i, kind: it.kind, rule: 'no_evidence', quote: it.quote }); return; }
        cmds.push({ seq: i + 1, type: `s4b.${it.kind}`, quote: it.quote, _i: i });
    });
    const g = guardCommands(text, cmds, { present });
    const out = new Set(g.dropped.map((d) => d.command._i));
    for (const d of g.dropped) dropped.push({ i: d.command._i, kind: intents[d.command._i].kind, rule: d.rule, quote: d.command.quote });
    intents.forEach((it, i) => {
        if (!out.has(i) && !dropped.some((d) => d.i === i)) kept.push(it);
    });
    return { kept, dropped: dropped.sort((a, b) => a.i - b.i) };
}

// ------------------------------------------------------------------------------------------------ A0 and the gate
/**
 * A0: what Avereth decides today without an LLM (readTurn → parseIntent, unchanged), as a plan. Out of a fight a message
 * without a named skill goes to the V4 interpreter (route v4): A0 then has no plan of its own (delegated).
 */
export function a0Plan(text, state, content) {
    const ir = readTurn(text, state, content);
    const i = ir.intent;
    let plan;
    switch (i.kind) {
        case 'attack': plan = [{ kind: 'attack', skill: i.skill, target: i.target ?? null }]; break;
        case 'skill': plan = [{ kind: 'skill', skill: i.skill, target: i.target ?? null }]; break;
        case 'move': plan = [{ kind: 'move', dir: i.dir, target: i.target ?? null }]; break;
        case 'flee': plan = [{ kind: 'flee' }]; break;
        case 'stealth': plan = [{ kind: 'stealth' }]; break;
        case 'engage': plan = [{ kind: 'engage' }]; break;
        // the engine's own question (a System panel, nothing resolved)
        case 'ambiguous_target': plan = [{ kind: 'clarify', about: 'target', options: i.candidates }]; break;
        case 'no_target': plan = [{ kind: 'clarify', about: 'target' }]; break;
        // the engine refuses a skill Alaric does not know (it substitutes nothing)
        case 'unknown_skill': plan = [{ kind: 'attack', skill: { new: i.name }, target: null }]; break;
        default: plan = [];
    }
    return { plan, kind: i.kind, route: ir.route, delegated: ir.route === 'v4', intent: i };
}

// words that carry no part of the action when the rest is matched exactly
const CLOSED = new Set(['i', 'me', 'my', 'myself', 'a', 'an', 'the', 'at', 'on', 'onto', 'upon', 'into', 'to', 'toward', 'towards', 'with', 'and', 'then', 'again', 'now', 'use', 'uses', 'using', 'cast', 'casts', 'casting', 'attack', 'attacks', 'hit', 'hits', 'strike', 'strikes', 'it', 'him', 'her', 'them', 'spell', 'skill']);
// an attack verb that names no skill: Basic Attack by the rules of the engine
const CANON_ATTACK = new Set(['attack', 'attacks', 'hit', 'hits', 'strike', 'strikes']);
const words = (t) => normText(String(t ?? '').replace(/\*/g, ' ')).split(/[^a-z0-9]+/).filter(Boolean);
const FAST_TARGETS = new Set(['label', 'named', 'pronoun', 'sole target', 'scene handle']);

/**
 * The fast-path gate of the cascade: may A0's decision stand without the LLM? Only when every word of the message's
 * action part is accounted for by exact catalog matches (a known skill named by its name, the target by its label or
 * name, or no target word at all) plus a closed list of function words. Then A0 has nothing left to misread.
 *   FAST_COMMIT   attack/skill with an exactly named skill (or a plain attack verb for Basic Attack) on an exactly
 *                 named or the only target, nothing else in the message
 *   FAST_CLARIFY  the engine's own "which target?" when the player named no target at all and the skill needs one
 *   FAST_REJECT   an exactly named skill Alaric does not know, nothing else in the message
 *   ESCALATE      everything else goes to the planner: aliases, typos, descriptions, world targets, several actions,
 *                 movement, search, travel, every message A0 reads as narrative or hands to its interpreter
 * The gate decides only whether A0 may stand; whether a question is the right answer is the planner's to decide.
 */
export function gate(text, a0, state, content) {
    if (a0.delegated) return { cls: 'ESCALATE', reason: 'delegated', residual: [] };
    const i = a0.intent;
    const decl = declarative(text);
    let rest = words(decl);
    const named = mentionedSkills(decl, content);
    const drop = (list) => {
        const del = new Set(list.flatMap((x) => words(x)));
        rest = rest.filter((w) => !del.has(w));
    };
    // two skills named: two actions (or a question between them); A0 reads one of them at most
    if (named.length > 1) return { cls: 'ESCALATE', reason: 'several skills named', residual: rest };
    drop(named);
    const verb = words(decl).some((w) => CANON_ATTACK.has(w));
    if (i.kind === 'attack' || i.kind === 'skill' || i.kind === 'ambiguous_target') {
        const skill = content.skills.get(i.skill);
        const skillNamed = !!skill && named.includes(normText(skill.name));
        const basicByVerb = !!skill && skill.basic && !skillNamed && verb;
        if (!skillNamed && !basicByVerb) return { cls: 'ESCALATE', reason: 'skill not named exactly', residual: rest };
        if (i.kind === 'ambiguous_target') {
            if (skill.range?.area) return { cls: 'ESCALATE', reason: 'area skill needs no target', residual: rest };
            drop([...CLOSED]);
            return rest.length ? { cls: 'ESCALATE', reason: 'a target reference A0 could not resolve', residual: rest } : { cls: 'FAST_CLARIFY', reason: 'no target named', residual: [] };
        }
        if (i.target) {
            if (!FAST_TARGETS.has(i.target_how)) return { cls: 'ESCALATE', reason: `target by ${i.target_how}`, residual: rest };
            const c = state.encounter?.combatants?.[i.target];
            const e = state.entities[i.target];
            drop([c?.label, e?.name].filter(Boolean));
        }
        drop([...CLOSED]);
        return rest.length ? { cls: 'ESCALATE', reason: 'words A0 did not account for', residual: rest } : { cls: 'FAST_COMMIT', reason: 'exact', residual: [] };
    }
    if (i.kind === 'unknown_skill') {
        drop([i.name]);
        const t = i.target ? state.encounter?.combatants?.[i.target]?.label : null;
        if (t) drop([t]);
        // the target of an unknown skill is not resolved by A0; an exact label is still part of the message
        for (const c of Object.values(state.encounter?.combatants || {})) if (c.label && normText(decl).includes(normText(c.label))) drop([c.label]);
        drop([...CLOSED]);
        return rest.length ? { cls: 'ESCALATE', reason: 'words A0 did not account for', residual: rest } : { cls: 'FAST_REJECT', reason: 'exactly named unknown skill', residual: [] };
    }
    return { cls: 'ESCALATE', reason: `A0 reads ${i.kind}`, residual: rest };
}

// ------------------------------------------------------------------------------------------------ scoring
const RE = /^\/(.*)\/([a-z]*)$/s;
const asRe = (v) => { const m = typeof v === 'string' ? v.match(RE) : null; return m ? new RegExp(m[1], m[2]) : null; };

/** One gold value against one predicted value: exact id, "/regex/" (on a string or a {new} text), {new: "/regex/"}, a list of alternatives, "any", null. */
export function valueMatch(g, p) {
    if (g === 'any') return true;
    if (Array.isArray(g)) return g.some((x) => valueMatch(x, p));
    if (g === null) return p === null || p === undefined;
    const re = asRe(g);
    if (re) return (typeof p === 'string' && re.test(p)) || (isNew(p) && re.test(p.new));
    if (g && typeof g === 'object' && 'new' in g) return isNew(p) && valueMatch(g.new, p.new);
    return g === p;
}

/**
 * What the engine does with each intent: commit, refuse (a skill or combat target it does not know: nothing is
 * substituted) or ask (a clarify; an attack with a single-target skill and no target makes the engine ask "which?").
 */
export function engineView(intents, cat) {
    const areaSkill = new Set(cat.skills.filter((s) => s.area).map((s) => s.id));
    return (intents || []).map((it) => {
        if (it.kind === 'clarify') return { ...it, effect: 'ask' };
        if (['attack', 'skill', 'ability_world'].includes(it.kind) && isNew(it.skill)) return { ...it, effect: 'refused' };
        if (it.kind === 'attack' && isNew(it.target)) return { ...it, effect: 'refused' };
        if (it.kind === 'attack' && (it.target === null || it.target === undefined) && !areaSkill.has(it.skill)) return { ...it, kind: 'clarify', about: 'target', effect: 'ask' };
        return { ...it, effect: HARD.has(it.kind) ? 'commit' : 'other' };
    });
}

/** One gold intent against one predicted intent (after engineView). strict: goal and what count too. */
export function intentMatch(g, p, strict = true) {
    if (g.kind === 'unknown_attempt') return p.effect === 'refused' && isNew(p.skill) && (!g.name || valueMatch(g.name, p.skill.new));
    if (g.kind === 'clarify') return p.effect === 'ask' && (!g.about || valueMatch(g.about, p.about));
    if (g.kind !== p.kind) return false;
    for (const k of ['skill', 'target', 'dir', 'to', 'what', 'goal']) {
        if (!(k in g)) continue;
        if (!strict && (k === 'goal' || k === 'what')) continue;
        if (!valueMatch(g[k], p[k])) return false;
    }
    return true;
}

/** The accepted plans of a case under an arm's information (without RECENT a needs_history case may also ask). */
export function alternatives(kase, { history = true } = {}) {
    const acc = kase.accept.map((alt) => alt.map((g) => ({ ...g })));
    if (!history && kase.needs_history && !acc.some((alt) => alt.length === 1 && alt[0].kind === 'clarify')) acc.push([{ kind: 'clarify' }]);
    return acc;
}

/**
 * Classify one plan for one case (severity first):
 *   correct           an accepted plan, intent by intent, and nothing committed besides
 *   wrong_commit      a hard commit no accepted plan covers, or a forbidden one:
 *                     false_agency (no action was in the message) · guess (only a question was right) · substitution
 *                     (another skill, or a forbidden reading such as Basic Attack for a named skill) · wrong_target ·
 *                     wrong_kind (e.g. an attack on a creature instead of the skill on the floor) · wrong_args · extra
 *   goal_mismatch     the right actions; only the free-text goal (or search object) misses the gold's pattern
 *   unneeded_clarify  a question where acting was required
 *   missed            nothing wrong committed, but an action (or the needed question) is missing; also an empty or
 *                     invalid answer and a refused skill where a known one was meant
 */
export function classify(kase, intents, cat, { history = true } = {}) {
    const plan = engineView(intents, cat);
    const accept = alternatives(kase, { history });
    const fits = (alt, strict) => {
        const used = new Set();
        for (const g of alt) {
            const k = plan.findIndex((p, j) => !used.has(j) && intentMatch(g, p, strict));
            if (k < 0) return false;
            used.add(k);
        }
        // nothing besides: an extra question or refused attempt makes the plan a different one
        return used.size === plan.length;
    };
    if (accept.some((alt) => fits(alt, true))) return { outcome: 'correct', view: plan };
    // the right actions, only the free-text goal (or search object) does not match the gold's pattern: not a safety
    // error; listed for reading by hand
    if (accept.some((alt) => fits(alt, false))) return { outcome: 'goal_mismatch', view: plan };
    const covered = (p) => accept.some((alt) => alt.some((g) => intentMatch(g, p, false)));
    const forbidden = (p) => (kase.forbid || []).some((f) => intentMatch(f, p, false));
    const wrong = plan.filter((p) => p.effect === 'commit' && (!covered(p) || forbidden(p)));
    if (!wrong.length) {
        const asked = plan.some((p) => p.effect === 'ask');
        const askOk = accept.some((alt) => alt.some((g) => g.kind === 'clarify'));
        if (asked && !askOk) return { outcome: 'unneeded_clarify', view: plan };
        return { outcome: 'missed', view: plan };
    }
    return { outcome: 'wrong_commit', subtype: subtype(kase, accept, wrong[0]), wrong: wrong.map(brief), view: plan };
}

function subtype(kase, accept, p) {
    if (accept.every((alt) => alt.length === 0)) return 'false_agency';
    if (accept.every((alt) => alt.length > 0 && alt.every((g) => g.kind === 'clarify'))) return 'guess';
    if ((kase.forbid || []).some((f) => intentMatch(f, p, false))) return 'substitution';
    const same = accept.flat().filter((g) => g.kind === p.kind);
    if (!same.length) return 'wrong_kind';
    if (same.every((g) => 'skill' in g && !valueMatch(g.skill, p.skill))) return 'substitution';
    if (same.every((g) => 'target' in g && !valueMatch(g.target, p.target))) return 'wrong_target';
    if (same.some((g) => intentMatch(g, p, false))) return 'extra';
    return 'wrong_args';
}

export const brief = (p) => {
    const ref = (v) => (isNew(v) ? `{new:${v.new}}` : v ?? '–');
    switch (p.kind) {
        case 'attack': case 'skill': return `${p.kind} ${ref(p.skill)} → ${ref(p.target)}`;
        case 'ability_world': return `ability_world ${ref(p.skill)} → ${ref(p.target)} (${p.goal ?? ''})`;
        case 'move': return `move ${p.dir}${p.target ? ` ${ref(p.target)}` : ''}`;
        case 'go': return `go ${ref(p.to)}`;
        case 'search': return `search${p.what ? ` (${p.what})` : ''}`;
        case 'clarify': return `clarify ${p.about ?? ''}`;
        default: return p.kind;
    }
};
export const planText = (intents) => (intents && intents.length ? intents.map(brief).join(' + ') : '(kein Plan)');

/** Canonical form of a plan for the stability check (k runs give the same plan). */
export const planKey = (intents) => JSON.stringify((intents || []).map((p) => [p.kind, p.skill ?? null, p.target ?? null, p.dir ?? null, p.to ?? null, p.about ?? null]));

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);

/**
 * The S4b metrics over classified records ({kase, outcome: {outcome, subtype}, plan}). Denominators are end to end:
 * every case, an invalid answer is an empty plan.
 */
export function metrics(rows, { history = true } = {}) {
    const n = rows.length;
    const count = (f) => rows.filter(f).length;
    const is = (o) => (r) => r.outcome.outcome === o;
    const accepts = (r) => alternatives(r.kase, { history });
    const clarifyOnly = (r) => accepts(r).every((alt) => alt.length > 0 && alt.every((g) => g.kind === 'clarify'));
    const negative = (r) => accepts(r).every((alt) => alt.length === 0);
    const actionCase = (r) => !negative(r) && !clarifyOnly(r);
    const strictAction = (r) => actionCase(r) && !accepts(r).some((alt) => alt.some((g) => g.kind === 'clarify'));
    // a plan that only asks (saved results keep this as asked_only instead of the engine view)
    const askedOnly = (r) => (r.outcome.view ? r.outcome.view.length > 0 && r.outcome.view.every((p) => p.effect === 'ask') : !!r.outcome.asked_only);
    const subtypes = {};
    for (const r of rows.filter(is('wrong_commit'))) subtypes[r.outcome.subtype] = (subtypes[r.outcome.subtype] || 0) + 1;
    const clarifyCases = rows.filter(clarifyOnly);
    const askedRows = rows.filter(askedOnly);
    return {
        cases: n,
        correct: count(is('correct')),
        accuracy_pct: pct(count(is('correct')), n),
        wrong_commit: count(is('wrong_commit')),
        wrong_commit_pct: pct(count(is('wrong_commit')), n),
        wrong_by_type: subtypes,
        missed: count(is('missed')),
        unneeded_clarify: count(is('unneeded_clarify')),
        goal_mismatch: count(is('goal_mismatch')),
        action_cases: count(actionCase),
        missed_action_pct: pct(rows.filter(actionCase).filter(is('missed')).length, rows.filter(actionCase).length),
        unneeded_clarify_pct: pct(rows.filter(strictAction).filter(is('unneeded_clarify')).length, rows.filter(strictAction).length),
        clarify_cases: clarifyCases.length,
        clarify_recall_pct: pct(clarifyCases.filter(is('correct')).length, clarifyCases.length),
        clarify_outputs: askedRows.length,
        clarify_precision_pct: pct(askedRows.filter(is('correct')).length, askedRows.length),
        negative_cases: count(negative),
        false_agency: rows.filter(negative).filter(is('wrong_commit')).length,
    };
}

/** Per category: cases, correct, wrong commits, missed, unneeded questions. */
export function byCategory(rows) {
    const out = {};
    for (const r of rows) {
        const c = (out[r.kase.cat] = out[r.kase.cat] || { cases: 0, correct: 0, wrong_commit: 0, missed: 0, unneeded_clarify: 0, goal_mismatch: 0 });
        c.cases += 1;
        c[r.outcome.outcome] += 1;
    }
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

/** Gate quality from A0's own classification: may A0 stand where the gate let it? */
export function gateMetrics(rows) {
    const cls = {};
    for (const r of rows) cls[r.gate.cls] = (cls[r.gate.cls] || 0) + 1;
    const fast = rows.filter((r) => r.gate.cls !== 'ESCALATE');
    const unsafe = fast.filter((r) => r.a0outcome.outcome !== 'correct');
    const missedFast = rows.filter((r) => r.gate.cls === 'ESCALATE' && r.a0outcome.outcome === 'correct');
    return {
        classes: cls,
        fast: fast.length,
        fast_pct: pct(fast.length, rows.length),
        fast_correct: fast.length - unsafe.length,
        unsafe_fast: unsafe.length,
        unsafe_fast_commit: unsafe.filter((r) => r.a0outcome.outcome === 'wrong_commit').length,
        unsafe_cases: unsafe.map((r) => ({ id: r.kase.id, gate: r.gate.cls, a0: planText(r.a0plan), outcome: r.a0outcome.outcome })),
        escalated_but_a0_right: missedFast.length,
        a0_wrong_commits_caught: rows.filter((r) => r.gate.cls === 'ESCALATE' && r.a0outcome.outcome === 'wrong_commit').length,
    };
}

// ------------------------------------------------------------------------------------------------ prompts
export const PLANNER_ROLE = 'You are the intent planner of the Avereth engine. You read one PLAYER MESSAGE and write down the engine actions Alaric himself takes in it. The engine resolves them: it decides every outcome, roll, number and cost, and whether something works at all. You never decide or describe an outcome.';

export const GM_STEP = 'GM PLANNING STEP — Before you narrate this turn, decide which actions Alaric himself takes in the PLAYER MESSAGE that the Avereth engine must resolve. You own the reading of the message; the engine owns every outcome, roll, number and cost. In this step you do not narrate: you only submit the plan.';

export const RULES = [
    'Rules:',
    '1. Only Alaric\'s own deeds in this message. Not an action: a question ("Can I …?"), a wish, a thought, a plan or a condition for later ("if it moves, I\'ll …", "next time …"), a memory, words he speaks (threats too), anything another character does. Such a message gets an empty plan.',
    '2. Skills: use only the ids under KNOWN SKILLS. Players misspell and paraphrase skills: if exactly one known skill fits what he names or describes, use that skill. If he names a skill Alaric does not know, write {"new": "<the name he used>"}; never put a different skill in its place, and never Basic Attack instead of a skill he named.',
    '3. An attack that names no skill and hints at none ("I strike the rat", "I hit it", "I shoot at it") is Basic Attack.',
    '4. Targets: opponents and people by their id. Resolve labels and parts of labels ("B" for "Cave Rat B"), descriptions against the catalog (wounded, ENGAGED = right in front of him, the farthest, a size or kind), pronouns, and what RECENT tells. A target who is not here: {"new": "<description>"}. An area skill needs no target (null).',
    '5. A known skill used on a thing instead of a creature is ability_world: target = the FEATURES id, or {"new": "<the thing>"} for something not listed; goal = what he wants to achieve, in a few of his words. Do not judge whether it can work.',
    '6. Ask instead of guessing: if, after using the catalog and RECENT, two or more readings remain that would play out differently (another target, another skill, another kind of action), answer with one clarify about that point and nothing else. If exactly one reading fits, act and do not ask.',
    '7. In a fight, getting away is flee, and stepping back or closing in is move. Outside a fight, looking for someone or something is search, going somewhere is go.',
    '8. Several actions in one message: one intent each, in his order.',
    '9. quote: the exact words of the message the intent rests on, copied as they are (do not correct the spelling).',
].join('\n');

export const INTENTS_TEXT = [
    'Intents:',
    '- {"kind": "attack", "skill": <skill>, "target": <id | {"new": "…"} | null>, "quote": "…"}',
    '- {"kind": "skill", "skill": <skill>, "target": <id | null>, "quote": "…"}   (a skill that is not an attack: guard, ward, blink)',
    '- {"kind": "move", "dir": "closer" | "away", "target": <id | null>, "quote": "…"}',
    '- {"kind": "flee", "quote": "…"}',
    '- {"kind": "ability_world", "skill": <skill>, "target": <feature id | {"new": "…"}>, "goal": "<his aim>", "quote": "…"}',
    '- {"kind": "search", "what": "<what he looks for>" | null, "quote": "…"}',
    '- {"kind": "go", "to": <place id | {"new": "<where>"}>, "quote": "…"}',
    '- {"kind": "clarify", "about": "target" | "skill" | "action", "question": "<one short question to the player>", "options": [<ids or short texts>]}',
    '<skill> is an id from KNOWN SKILLS or {"new": "<the name he used>"}.',
].join('\n');

// written for the rules, with a catalog and words of their own: none of them is a case of the S4b corpus
export const EXAMPLES_TEXT = [
    'Examples. Example catalog: KNOWN SKILLS mage.frost_dart (Frost Dart: attack · single target · Magical / Projectile / Cold), mage.basic_attack (Basic Attack: attack · single target), mage.ember_ring (Ember Ring: attack · area: every foe ENGAGED with Alaric) · OPPONENTS mon.x1 Cave Rat A (unhurt · ENGAGED), mon.x2 Cave Rat B (wounded · SHORT) · FEATURES feat.icicles (icicles over the tunnel mouth) · PLACES loc.mill (the old mill) · RECENT: "Cave Rat B bit Alaric\'s ankle and scurried back."',
    '- "Frostdart rat B!" → {"intents": [{"kind": "attack", "skill": "mage.frost_dart", "target": "mon.x2", "quote": "Frostdart rat B!"}]}',
    '- "I shatter the icicles with a Frost Dart so they bury the tunnel" → {"intents": [{"kind": "ability_world", "skill": "mage.frost_dart", "target": "feat.icicles", "goal": "bury the tunnel", "quote": "I shatter the icicles with a Frost Dart so they bury the tunnel"}]}',
    '- "I call down Lightning on Rat A" → {"intents": [{"kind": "attack", "skill": {"new": "Lightning"}, "target": "mon.x1", "quote": "I call down Lightning on Rat A"}]}',
    '- "I go for the rat" → {"intents": [{"kind": "clarify", "about": "target", "question": "Which one, Cave Rat A or Cave Rat B?", "options": ["mon.x1", "mon.x2"]}]}',
    '- "Frost Dart the biter" → {"intents": [{"kind": "attack", "skill": "mage.frost_dart", "target": "mon.x2", "quote": "Frost Dart the biter"}]}',
    '- "I back off a step and Frost Dart Rat A" → {"intents": [{"kind": "move", "dir": "away", "target": null, "quote": "I back off a step"}, {"kind": "attack", "skill": "mage.frost_dart", "target": "mon.x1", "quote": "Frost Dart Rat A"}]}',
    '- "I bolt for the exit" → {"intents": [{"kind": "flee", "quote": "I bolt for the exit"}]}',
    '- "Would Frost Dart even hurt them?" → {"intents": []}',
    '- "\\"Back off or I\'ll freeze you,\\" I snarl." → {"intents": []}',
    '- (no fight) "I search the nest for coins" → {"intents": [{"kind": "search", "what": "coins in the nest", "quote": "I search the nest for coins"}]}',
    '- (no fight) "I walk back to the old mill" → {"intents": [{"kind": "go", "to": "loc.mill", "quote": "I walk back to the old mill"}]}',
].join('\n');

export const JSON_FORMAT = 'Answer with only the JSON object {"intents": [...]}, no prose before or after it, no code fences. An empty list when he takes no engine action.';
export const TOOL_FORMAT = 'Submit the plan by calling the tool plan_turn once with the object {"intents": [...]} (an empty list when he takes no engine action). Do not answer in prose.';

/**
 * The system prompt of an LLM arm. p1 / p1_nohist / fc: the planner role. fc_gm: the Narrator contract and a GM step
 * instead of the role. Rules, intents and examples are the same in all; only the last line differs between the JSON
 * answer and the tool call.
 */
export function plannerSystem({ gm = false, tool = false, contract = '' } = {}) {
    return [
        gm ? `${contract.replace(/\{\{user\}\}/g, 'Alaric').trim()}\n\n${GM_STEP}` : PLANNER_ROLE,
        '',
        RULES,
        '',
        INTENTS_TEXT,
        '',
        EXAMPLES_TEXT,
        '',
        tool ? TOOL_FORMAT : JSON_FORMAT,
    ].join('\n');
}

/** The one tool of the tool arms: typed by intent class; ids are checked after the call exactly as in the JSON arm. */
export function planTool() {
    return [{
        type: 'function',
        function: {
            name: 'plan_turn',
            description: 'Submit the engine actions Alaric takes in the player message, in his order (an empty list when he takes none). The engine resolves them.',
            parameters: {
                type: 'object',
                required: ['intents'],
                properties: {
                    intents: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['kind'],
                            properties: {
                                kind: { type: 'string', enum: KINDS },
                                skill: { description: 'a skill id from KNOWN SKILLS, or {"new": "<the name he used>"} for a skill Alaric does not know' },
                                target: { description: 'attack, skill, move: an id from OPPONENTS or OTHERS PRESENT, {"new": "<description>"} for one who is not here, or null; ability_world: an id from FEATURES or {"new": "<the thing>"}' },
                                dir: { type: 'string', enum: ['closer', 'away'] },
                                goal: { type: 'string', description: 'ability_world: what he wants to achieve, in a few of his words' },
                                what: { description: 'search: what he looks for, or null' },
                                to: { description: 'go: a place id from PLACES, or {"new": "<where>"}' },
                                about: { type: 'string', enum: ABOUT },
                                question: { type: 'string', description: 'clarify: one short question to the player' },
                                options: { type: 'array', items: {}, description: 'clarify: the ids or short texts to choose from' },
                                quote: { type: 'string', description: 'the exact words of the message the intent rests on' },
                            },
                        },
                    },
                },
            },
        },
    }];
}

/** A gold plan as the planner would write it (mock backend and tests): the first accepted plan of a case. */
export function goldPlan(kase) {
    const alt = kase.accept[0];
    const concrete = (v) => {
        if (v === 'any') return null;
        if (Array.isArray(v)) return concrete(v[0]);
        const re = asRe(v);
        if (re) return re.source.split('|')[0].replace(/[\\^$()?*+.[\]]/g, '') || 'x';
        if (v && typeof v === 'object' && 'new' in v) return { new: concrete(v.new) };
        return v;
    };
    return {
        intents: alt.map((g) => {
            if (g.kind === 'unknown_attempt') return { kind: 'attack', skill: { new: concrete(g.name || 'x') }, target: null, quote: kase.text };
            if (g.kind === 'clarify') return { kind: 'clarify', about: Array.isArray(g.about) ? g.about[0] : g.about || 'target', question: 'Which one?' };
            const out = { kind: g.kind };
            for (const k of ['skill', 'target', 'dir', 'to', 'what', 'goal']) if (k in g) out[k] = concrete(g[k]);
            if (g.kind === 'ability_world' && !out.goal) out.goal = 'as he says';
            out.quote = kase.text;
            return out;
        }),
    };
}
