// Patch 6 (exploration, discovery, environmental hazards): the things of a place that matter to what Alaric does there:
// a collapsed stair, a rotten bridge, a pressure plate under the dust, a locked chest. Not every detail: scenery stays
// prose, a lasting description stays a fact, a thing he can carry stays an object. A feature is what stands in his way
// or can hurt him, kept with its place so a second visit finds it as he left it.
//
//   features  id -> {id, at, name, kind: obstacle|hazard, hidden, status: active|passed|disabled|destroyed, trigger:
//             enter|touch|cross|null, on: the feature a hidden hazard is part of|null, stat, difficulty, harm: hp|sta|null,
//             since, found, history[]}
//
// The story establishes a feature (the extractor's feature delta) with how hard it is, before anyone tries it; its
// status changes only by the engine (his attempt, a trap that springs) or by the story's own world event (it collapses:
// destroyed). Checks are the engine's (src/checks.js resolveCheck), drawn when his command is resolved, before the
// narrator writes; a swipe reuses the record. Harm is the engine's (rules.exploration), never the narrator's number.
import { normText } from '../util.js';
import { resolveCheck } from '../checks.js';
import { useOf } from './items.js';

export const FEATURE_KINDS = ['obstacle', 'hazard'];
export const FEATURE_STATUS = ['active', 'passed', 'disabled', 'destroyed'];
export const TRIGGERS = ['enter', 'touch', 'cross'];
export const DIFFICULTIES = ['trivial', 'easy', 'moderate', 'hard', 'very_hard', 'impossible'];
export const STATS = ['STR', 'VIT', 'AGI', 'INT', 'PER', 'WIL'];
export const AIMS = ['examine', 'pass', 'disable'];

const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'and', 'old', 'his', 'its', 'this', 'that', 'there', 'here']);
/** The words that name a thing ("the old wooden bridge" → wooden, bridge). */
export const keyOf = (t) => [...new Set(normText(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)))];
const at = (s) => ({ turn: s.turn, minute: s.clock.minute });

/** The features of a place (hidden ones only when asked: the narrator's and the engine's, never the player's). */
export function featuresAt(s, place, { hidden = false } = {}) {
    return Object.values(s.features || {}).filter((f) => f.at === place && (hidden || !f.hidden));
}

/** The feature of this place a name means: the same words (all of the shorter name's) — "the bridge" is the rotten bridge. */
export function featureNamed(s, place, name) {
    const want = keyOf(name);
    if (!want.length) return null;
    const hits = featuresAt(s, place, { hidden: true }).filter((f) => {
        const have = keyOf(f.name);
        const [short, long] = want.length <= have.length ? [want, have] : [have, want];
        return short.every((w) => long.includes(w));
    });
    return hits.length === 1 ? hits[0] : null;
}

/** One feature as the catalog, the engine block and the HUD name it. */
export function featureText(f) {
    const state = { active: f.kind === 'hazard' ? 'dangerous' : 'in the way', passed: 'he got past it', disabled: 'made harmless', destroyed: 'destroyed' }[f.status] || f.status;
    return `${f.id} (${f.name}, ${f.kind}, ${state}${f.status === 'active' && f.difficulty && f.difficulty !== 'moderate' ? `, ${f.difficulty.replace('_', ' ')}` : ''})`;
}

/** The events for a feature, whole (feature.set). */
export function featureEvent(f) {
    return { t: 'feature.set', d: { feature: { ...f, history: (f.history || []).slice(-6) } } };
}
function changed(s, f, set, what) {
    return featureEvent({ ...f, ...set, history: [...(f.history || []), { ...at(s), what }] });
}

/** The engine's harm of a feature at a difficulty (rules.exploration.harm); 0 for none. */
export function harmOf(content, f) {
    if (!f.harm) return 0;
    return content.rules.exploration?.harm?.[f.difficulty] ?? content.rules.exploration?.harm?.moderate ?? 0;
}

/**
 * Book the harm of a feature on Alaric, once, within his limits: HP never below 1 (a hazard of the place wounds; the
 * fight is where he can fall), STA never below 0. Returns its line.
 */
export function harmEvents(s, content, f, emit) {
    const amount = harmOf(content, f);
    if (!amount) return null;
    const sheet = s.entities.pc.sheet;
    const res = f.harm === 'sta' ? 'sta' : 'hp';
    const before = Number(sheet[res] ?? 0);
    const after = Math.max(res === 'hp' ? Math.min(before, 1) : 0, before - amount);
    if (after === before) return `${res.toUpperCase()} ${before} (no harm left to take)`;
    emit({ t: 'resource.changed', d: { id: 'pc', resource: res, value: after, why: `${f.name} (${f.id})` } });
    return `${res.toUpperCase()} ${before}->${after}`;
}

const score = (content, d) => content.rules.checks?.difficulty_scores?.[d] ?? 6;
const easier = (d, steps) => DIFFICULTIES[Math.max(1, DIFFICULTIES.indexOf(d) - steps)] || d;

/** A check of his stat against a difficulty, not yet recorded, or an automatic result without a roll. */
function roll(s, content, dice, { label, stat, difficulty, feature, aim, seq }) {
    if (difficulty === 'trivial') return { success: true, auto: 'trivial: no roll' };
    if (difficulty === 'impossible') return { success: false, auto: 'impossible this way: no roll' };
    const actor = s.entities.pc.sheet.stats?.[stat] ?? 5;
    const r = resolveCheck(dice, { label, actor, opposition: score(content, difficulty) });
    const record = { what: label.slice(0, 80), stat, actor: r.actor_score, opposition: r.opposition, chance: r.chance, roll: r.roll, success: r.success, claimed: r.success, by: 'engine', seq, feature, aim, difficulty };
    return { success: r.success, record, text: `${stat} ${r.actor_score} vs ${difficulty.replace('_', ' ')} ${r.opposition}: ${r.chance}% (d100 ${r.roll}) → ${r.success ? 'SUCCESS' : 'FAILURE'}` };
}
/** The same, recorded at once (check.recorded). */
function check(s, content, dice, emit, opts) {
    const r = roll(s, content, dice, opts);
    if (r.record) emit({ t: 'check.recorded', d: r.record });
    return r;
}

/** The tool he names, if he holds it: used as the use command uses it (a tool stays his, a consumable is used up). */
function spendTool(s, content, ref, emit) {
    if (!ref) return null;
    const tpl = typeof ref === 'string' && ref.startsWith('item.') ? ref.slice(5) : null;
    const sheet = s.entities.pc.sheet;
    if (tpl) {
        if (!sheet.inventory?.[tpl] && !Object.values(sheet.equipment || {}).includes(tpl)) return { missing: true, name: content.items.get(tpl)?.name || tpl };
        const name = content.items.get(tpl)?.name || tpl;
        const use = useOf(content, { name, template: tpl });
        if (use === 'consumable' || use === 'food') { emit({ t: 'item.changed', d: { id: 'pc', item: tpl, qty: -1, why: 'used' } }); return { name, used: true }; }
        return { name, used: false };
    }
    const o = s.objects?.[ref];
    if (!o || o.holder?.entity !== 'pc') return { missing: true, name: o?.name || String(ref) };
    const use = useOf(content, o);
    if (use === 'consumable' || use === 'food') {
        emit({ t: 'object.consumed', d: { id: o.id, by: 'pc', ...((o.qty ?? 1) > 1 ? { qty: 1 } : {}) } });
        return { name: o.name, used: true };
    }
    return { name: o.name, used: false };
}

/**
 * A hidden hazard of this place that his action springs (trigger enter: he goes into the place; touch: he handles a
 * feature or a thing of it; cross: he tries to get past something there). One per action. The engine rolls his
 * reaction (its stat against its difficulty) and books the harm on a failure; either way it is spent (disabled) and
 * found. Returns the line for PLAYER ACTIONS, or null.
 */
export function springHidden(s, content, dice, emit, { place, triggers, seq, on }) {
    // review of 32c7d2c: touched or crossed only as part of what he handles (on: that feature's id); a hidden danger
    // elsewhere in the room is no part of it, and the engine does not guess one
    const f = featuresAt(s, place, { hidden: true }).find((x) => x.hidden && x.kind === 'hazard' && x.status === 'active' && triggers.includes(x.trigger || 'touch') && !!on && x.on === on);
    if (!f) return null;
    const r = check(s, content, dice, emit, { label: `Hidden ${f.name}`, stat: f.stat || 'AGI', difficulty: f.difficulty || 'moderate', feature: f.id, aim: 'react', seq });
    const harm = r.success ? null : harmEvents(s, content, f, emit);
    emit(changed(s, f, { hidden: false, status: 'disabled', found: { ...at(s), how: 'sprung' } }, r.success ? 'sprung, he avoided it' : 'sprung, it caught him'));
    return `HIDDEN DANGER — ${f.name} (${f.id}), part of what he handles, which he had not found, springs: his reaction ${r.text || r.auto}${harm ? `; it catches him: ${harm}` : '; he avoids it, unharmed'}. It is spent now and known to him. Tell exactly this; no other harm.`;
}

/**
 * Review of 32c7d2c: a hidden hazard that springs on entering a place (trigger enter) springs only if he does enter it.
 * His GO toward the place rolls his reaction now (the dice of this turn, so a swipe draws the same) and holds it as a
 * condition of the arrival (conditional spring); the world applier books it, the check, the harm and the trap's
 * change, only where the reply's arrival there is confirmed (src/v4/world.js). The narrator is told both outcomes in
 * advance: if he gets in, exactly this happens; if not, nothing springs.
 */
export function pendingSpring(s, content, dice, { place, seq }) {
    const f = featuresAt(s, place, { hidden: true }).find((x) => x.hidden && x.kind === 'hazard' && x.status === 'active' && x.trigger === 'enter');
    if (!f) return null;
    const r = roll(s, content, dice, { label: `Hidden ${f.name}`, stat: f.stat || 'AGI', difficulty: f.difficulty || 'moderate', feature: f.id, aim: 'react', seq });
    const amount = r.success ? 0 : harmOf(content, f);
    return {
        conditional: { seq, kind: 'spring', condition: 'arrive', at: place, feature: f.id, success: r.success, record: r.record || null, auto: r.auto || null },
        line: `HIDDEN DANGER, IF HE GETS IN — ${f.name} (${f.id}), which he has not found, springs as he enters: his reaction ${r.text || r.auto}${r.success ? '; he avoids it, unharmed' : `; it catches him${amount ? ` (${f.harm === 'sta' ? 'STA' : 'HP'} -${amount})` : ''}`}. Only if the story has him get in; if he does not reach it in this reply, nothing springs. Tell exactly this; no other harm.`,
    };
}

/** The conditional spring of his GO, booked now that he has arrived there (src/v4/world.js arrive). */
export function applySpring(s, content, emit, k) {
    const f = s.features?.[k.feature];
    if (!f || !f.hidden || f.status !== 'active') return false;
    if (k.record) emit({ t: 'check.recorded', d: k.record });
    if (!k.success) harmEvents(s, content, f, emit);
    emit(changed(s, f, { hidden: false, status: 'disabled', found: { ...at(s), how: 'sprung' } }, k.success ? 'sprung, he avoided it' : 'sprung, it caught him'));
    return true;
}

/**
 * His attempt on a feature (planner command attempt): examine it up close (no roll), get past it, or make it harmless.
 * The difficulty is the feature's own, fixed when the story established it; a tool he holds that fits makes it one step
 * easier; an approach the planner reads as impossible gets no roll. Success changes the feature for good (passed,
 * disabled); failure leaves it as it was, and a hazard (or an obstacle that can hurt) harms him by the rules.
 */
export function attemptEvents(s, content, dice, emit, c) {
    const place = s.scene.at;
    const f = typeof c.feature === 'string' ? s.features?.[c.feature] : null;
    const words = String(c.approach || c.quote || '').replace(/[<>`]/g, '').slice(0, 100);
    if (!f || f.hidden || f.at !== place) return { status: 'resolved', line: `DOES — "${words}": no obstacle or danger the engine holds here; his own action, told as it happens. It books nothing: no HP, MP, STA or possessions change by it.` };
    const aim = AIMS.includes(c.aim) ? c.aim : 'pass';
    const hidden = aim === 'examine' ? null : springHidden(s, content, dice, emit, { place, triggers: aim === 'pass' ? ['touch', 'cross'] : ['touch'], seq: c.seq, on: f.id });
    if (aim === 'examine') {
        emit(changed(s, f, {}, 'examined'));
        return { status: 'resolved', line: `EXAMINES — ${f.name} (${f.id}) up close, no roll: tell what can be seen of it plainly (${f.kind === 'hazard' ? `how it could hurt him, ${f.difficulty.replace('_', ' ')} to deal with` : `what makes it ${f.difficulty.replace('_', ' ')} to get past`}). Looking does not change it.` };
    }
    if (f.status === 'destroyed') return { status: 'refused', reason: 'destroyed', done: true, line: `NOTHING TO DO — ${f.name} (${f.id}) is destroyed already: nothing to get past or disarm there; the way is as the story left it.${hidden ? ` ${hidden}` : ''}` };
    if (f.status === 'disabled' || (aim === 'pass' && f.status === 'passed')) {
        return { status: 'resolved', done: true, line: `${aim === 'pass' ? 'PASSES' : 'NOTHING TO DO'} — ${f.name} (${f.id}) is ${f.status === 'passed' ? 'already behind him: the way he found holds' : 'harmless already'}; no check, no new risk, no new reward.${hidden ? ` ${hidden}` : ''}` };
    }
    if (c.possible === false) return { status: 'refused', reason: 'impossible', line: `CANNOT — "${words}" cannot work on ${f.name} as it is: no roll, nothing changes, nothing is spent.${hidden ? ` ${hidden}` : ''}` };
    const tool = spendTool(s, content, c.tool, emit);
    if (tool?.missing) return { status: 'refused', reason: 'no such tool', line: `CANNOT — he has no ${tool.name}: no roll, nothing changes.${hidden ? ` ${hidden}` : ''}` };
    const stat = STATS.includes(c.stat) ? c.stat : f.stat || (aim === 'disable' ? 'INT' : 'AGI');
    const difficulty = tool ? easier(f.difficulty || 'moderate', content.rules.exploration?.tool_eases ?? 1) : f.difficulty || 'moderate';
    const r = check(s, content, dice, emit, { label: `${aim === 'pass' ? 'Past' : 'Disarm'} ${f.name}`, stat, difficulty, feature: f.id, aim, seq: c.seq });
    const toolText = tool ? ` With ${tool.name} (${tool.used ? 'used up' : 'it stays his'}): one step easier.` : '';
    if (r.success) {
        emit(changed(s, f, { status: aim === 'pass' ? 'passed' : 'disabled' }, `${aim === 'pass' ? 'passed' : 'made harmless'}: ${words}`));
        return { status: 'resolved', line: `${aim === 'pass' ? 'GETS PAST' : 'MAKES HARMLESS'} — ${f.name} (${f.id}), "${words}": ${r.text || r.auto}.${toolText} It stays so; tell it as done, no harm.${hidden ? ` ${hidden}` : ''}` };
    }
    const harm = f.status === 'active' && (f.kind === 'hazard' || f.harm) ? harmEvents(s, content, f, emit) : null;
    emit(changed(s, f, {}, `failed: ${words}`));
    return { status: 'resolved', line: `FAILS — ${f.name} (${f.id}), "${words}": ${r.text || r.auto}.${toolText} ${aim === 'pass' ? 'He does not get past it' : 'It is not made harmless'}${harm ? `; it hurts him: ${harm}` : '; no harm'}. It stays as it was; another way, a tool or more care may still work. Tell exactly this.${hidden ? ` ${hidden}` : ''}` };
}

/**
 * Patch 6: the same search again, at the same place, with the same aim, while nothing there has changed since and he
 * brings nothing new: no second roll (no dice until it works). Another focus, another tool, a change at the place
 * (a feature found, made harmless, destroyed since) is a new search.
 */
export function searchedBefore(s, place, what, tool = null) {
    const want = keyOf(what);
    const prior = (s.searches || []).filter((x) => x.at === place).reverse().find((x) => {
        const had = x.focus || [];
        const same = want.length === had.length && want.every((w) => had.includes(w));
        return same && (x.tool || null) === (tool || null);
    });
    if (!prior) return null;
    // review of 32c7d2c: a change is a change of what is there (a feature found, got past, made harmless, destroyed,
    // or a new one), never merely a look at one or a failed try on it (history entries that leave it as it was)
    return placeState(s, place) === prior.sig ? prior : null;
}

/** What is there to find at a place, as one comparable text: each feature's id, status and whether it is hidden. */
export function placeState(s, place) {
    return featuresAt(s, place, { hidden: true }).map((f) => `${f.id}:${f.status}:${f.hidden ? 'h' : 'v'}`).sort().join('|');
}

/** The hidden features of this place a successful search finds (the one the focus names first, else one). */
export function searchFinds(s, place, what) {
    const hidden = featuresAt(s, place, { hidden: true }).filter((f) => f.hidden && f.status === 'active');
    if (!hidden.length) return null;
    const want = keyOf(what);
    return hidden.find((f) => keyOf(`${f.name} ${f.kind}`).some((w) => want.includes(w))) || hidden[0];
}
