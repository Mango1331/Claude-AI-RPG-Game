// Patch 9C-2c (docs/PATCH9C2C_PASSIVE_ACQUISITION.md): how a Passive comes to a person under ruleset 2, booked by the
// engine alone (src/v4/ownership.js pc.progress). One path for every quality and source:
//
//   evidence   a development the engine itself established, once per its key: the end of an ordinary Passive goal
//              trained for long (src/v4/growth.js), an outstanding fight he survived and won (trialEvidence, at the
//              fight's end), an authorized engine source (engineEvidence; later a Passive Stone). growth.evidence
//   candidate  at the first regular planned turn outside a fight (src/v4/runtime.js withGrowth): its effects composed
//              here, deterministic, within its quality's budget and adding something real; named by the Forge (name and
//              flavour only) or a fixed fallback. An open decision of kind passive (decision.opened, growth.offered):
//              no Passive yet, no bonus, nothing of his changes
//   decision   his own command: accept (into a free slot, or a rare or legendary one in exchange for a Passive he names
//              when all four are held) or decline. Checked again on a private copy and booked all or nothing:
//              passive.defined, passive.lost, passive.gained, a stone spent, growth.decided, decision.closed
//
// A declined or decided evidence never comes back; nothing is rolled again on a reload, a swipe or a replay.
import { rulesetOf, skillNames } from '../content.js';
import { applyEvent } from '../state.js';
import { clone, hash32, normText, slug } from '../util.js';
import { definePassive, gainPassive, losePassive, passiveDefErrors, passiveGain, passivesOf, passiveSlots, passiveText, passiveWhen, passiveEffects, qualityBudget, CORE_STATS, QUALITY_TEXT } from '../passives.js';
import { growthOf } from './growth.js';
import { deriveCharacter } from '../derived.js';
import { offerRoom, SKILL_EVIDENCE } from './skill_growth.js';

const ROMAN = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const P = (content) => content.rules.growth?.passive || {};

/** Apply events to a private copy and give the copy (each step is checked against the state after the ones before). */
function after(state, events) {
    const s = clone(state);
    for (const e of events) applyEvent(s, e);
    return s;
}

/** The evidence of his developments toward a Passive, by key (state.growth.evidence). */
export const evidenceOf = (state) => growthOf(state).evidence || {};

/** His open Passive offers (decisions of kind passive), oldest first. */
export const passiveOffers = (state) => (state.decisions || []).filter((d) => d.kind === 'passive');

/** Names and ids an open offer holds for its Passive: no Skill, no other Passive takes them meanwhile. */
export function reservedPassive(state) {
    const offers = passiveOffers(state).map((d) => d.passive).filter(Boolean);
    // 9C completion: and the name a Skill offered to him holds
    const skills = (state.decisions || []).filter((d) => d.kind === 'skill').map((d) => normText(d.skill?.name));
    return { names: [...offers.map((p) => normText(p.name)), ...skills], ids: offers.map((p) => p.id) };
}

// ------------------------------------------------------------------------------------------------ evidence
/** One evidence event: {key, kind, quality, why, …}; the reducer stores it as pending (src/v4/growth.js). */
const evidenceEvent = (state, ev) => ({ t: 'growth.evidence', d: { evidence: { ...ev, turn: state.turn, minute: state.clock?.minute ?? 0 } } });

/**
 * Patch 9C-2c: an authorized engine source of a Passive (an engine fixture, a later Passive Stone or legendary event;
 * never the narrator, an extractor delta or a shop line): its quality and the effects it establishes, validated against
 * that quality's budget. {events} or {errors}.
 */
export function engineEvidence(state, content, { key, quality, why, scope = 'always', condition = null, effects, object = null }) {
    if (rulesetOf(state) < 2) return { events: [], errors: ['Passives belong to the three-class rules (ruleset 2)'] };
    if (typeof key !== 'string' || !/^[a-z0-9_.:-]{3,80}$/.test(key)) return { events: [], errors: ['key: a stable id of the source'] };
    if (evidenceOf(state)[`engine:${key}`]) return { events: [], errors: [`the source ${key} gave its evidence already`] };
    if (!['rare', 'legendary'].includes(quality)) return { events: [], errors: ['an engine source gives a rare or legendary Passive'] };
    const probe = { id: 'dyn.passive_probe', name: 'Probe', description: 'probe', origin: { kind: 'engine' }, rank: 'F', quality, scope, ...(condition ? { condition } : {}), effects };
    const errors = passiveDefErrors(probe, content, null);
    if (errors.length) return { events: [], errors };
    return { events: [evidenceEvent(state, { key: `engine:${key}`, kind: object ? 'stone' : 'engine', quality, why: String(why || 'an extraordinary source').slice(0, 160), scope, condition, effects: clone(effects), ...(object ? { object } : {}) })], errors: [] };
}

/**
 * Patch 9C-2c: the evidence an outstanding fight leaves (src/combat.js endEncounterEvents), at its end, once per fight:
 * he won it alive against a foe that struck him, at least `level_gap` Levels above him, after it drove him from a good
 * start (start_pct) down to `low_pct` of his HP or less, and he used a Skill of his own in it. That is sure: a rare
 * candidate follows. A near case (near.*) is decided once by a die of its own, kept with the evidence (replay-stable).
 */
export function trialEvidence(state, content, enc) {
    const r = P(content).trial;
    if (rulesetOf(state) < 2 || !r || !enc?.pp?.trial) return [];
    const pc = enc.combatants?.pc;
    if (!pc || pc.current.defeated || pc.current.escaped) return [];
    const key = `trial:${enc.id}`;
    if (evidenceOf(state)[key]) return [];
    const t = enc.pp.trial;
    const used = Object.keys(enc.pp.used || {}).length > 0;
    const beaten = (enc.defeated || []).filter((id) => enc.combatants[id]?.side === 'hostile' && (t.foes || []).includes(id) && !enc.combatants[id].current?.surrendered);
    if (!used || t.start === null || t.start < r.start_pct || !beaten.length) return [];
    const gap = Math.max(...beaten.map((id) => (enc.combatants[id].fixed.level ?? 0) - pc.fixed.level));
    const sure = gap >= r.level_gap && t.low <= r.low_pct;
    const near = !sure && gap >= r.near.level_gap && t.low <= r.near.low_pct;
    if (!sure && !near) return [];
    // 9C completion: a fight like one that gave such evidence already (the same kinds of foes, the same place) gives none
    // again, whatever became of the first; it is kept as similar (no offer, no die), so a repetition is no new chance
    const similar = trialSignature(state, beaten);
    const before = Object.values(evidenceOf(state)).find((x) => x.kind === 'trial' && x.facts?.similar === similar);
    if (before) {
        const why = `like ${before.key}: the same kinds of foes in the same place (${enc.id})`;
        return [evidenceEvent(state, { key, kind: 'trial', quality: 'rare', why, facts: { gap, low: t.low, start: t.start, similar }, sure, status: 'similar' })];
    }
    const roll = near ? (parseInt(hash32(`${state.rng?.seed ?? 0}|${key}|passive`), 16) % 100) + 1 : null;
    const passed = sure || roll <= r.near.chance_pct;
    const foe = beaten.reduce((a, id) => ((enc.combatants[id].fixed.level ?? 0) > (enc.combatants[a].fixed.level ?? 0) ? id : a), beaten[0]);
    const facts = { gap, low: t.low, start: t.start, foe: enc.combatants[foe].name || foe, taken: { ...t.taken }, similar };
    const why = `won against ${facts.foe} ${gap} Levels above him, driven down to ${t.low}% HP (${enc.id})`;
    return [evidenceEvent(state, { key, kind: 'trial', quality: 'rare', why, facts, sure, ...(near ? { roll, chance: r.near.chance_pct } : {}), ...(passed ? {} : { status: 'failed' }) })];
}

/** 9C completion: what makes two outstanding fights alike: the kinds of foes he beat (their body plan, or their kind of
 * person) and the place (the Dungeon or the land it was in). */
function trialSignature(state, beaten) {
    const kinds = [...new Set(beaten.map((id) => {
        const e = state.entities?.[id] || {};
        return e.kind === 'creature' || e.profile ? `creature:${e.anchor || e.profile?.anchor || e.species || 'unknown'}` : `person:${e.sheet?.template || e.template || 'person'}`;
    }))].sort();
    return `${kinds.join(',')}@${state.scene?.location || state.places?.[state.scene?.at]?.realm || 'unknown'}`;
}

/**
 * 9C completion: the Ordinary evidence of what he did (rules.json growth.passive.deeds): `checks` successful checks of one
 * core stat the engine itself rolled (state.deeds, src/state.js), each on another feature, over at least `days` game days,
 * none of them counted for an evidence before. At most one such evidence per stat open at a time. Events.
 */
export function deedEvidence(state, content) {
    const r = P(content).deeds;
    if (rulesetOf(state) < 2 || !r) return [];
    const all = Object.values(evidenceOf(state)).filter((x) => x.kind === 'deeds');
    const out = [];
    for (const stat of CORE_STATS) {
        if (all.some((x) => x.focus === stat && ['pending', 'offered'].includes(x.status))) continue;
        const spent = new Set(all.filter((x) => x.focus === stat).flatMap((x) => x.things || []));
        const seen = new Set();
        const deeds = (state.deeds || []).filter((d) => d.stat === stat && !spent.has(d.thing) && !seen.has(d.thing) && seen.add(d.thing));
        if (deeds.length < r.checks) continue;
        const picked = deeds.slice(-r.checks);
        const days = new Set(picked.map((d) => Math.floor((d.minute ?? 0) / 1440)));
        if (days.size < r.days) continue;
        const things = picked.map((d) => d.thing);
        out.push(evidenceEvent(state, { key: `deeds:${stat}:${things.join('+')}`.slice(0, 160), kind: 'deeds', quality: 'ordinary', focus: stat, things, why: `${r.checks} hard tests of his ${stat} passed on ${days.size} days` }));
    }
    return out;
}

// ------------------------------------------------------------------------------------------------ candidates
const FALLBACK = {
    core: { STR: 'Hardened Strength', VIT: 'Conditioned Body', AGI: 'Light Footing', INT: 'Studious Mind', PER: 'Keen Senses', WIL: 'Steady Will' },
    trial: { physical: 'Unbroken Stance', magical: 'Unbroken Ward' },
    engine: { rare: 'Awakened Gift', legendary: 'Legendary Gift' },
};

/** The first free name (and its id) of a base: "Studious Mind", else "Studious Mind II" … */
function freeName(state, content, base) {
    const r = reservedPassive(state);
    const taken = new Set([...skillNames(content, state), ...Object.values(state.passive_defs || {}).map((p) => normText(p.name)), ...r.names]);
    for (const n of [base, ...ROMAN.map((x) => `${base} ${x}`)]) {
        const id = `dyn.passive_${slug(n)}`.slice(0, 54);
        if (!taken.has(normText(n)) && !state.passive_defs?.[id] && !r.ids.includes(id) && !content.skills.has(id)) return { name: n, id };
    }
    return null;
}

/**
 * The effects a piece of evidence establishes, in the order tried: the first that adds something real is offered. Their
 * size is its quality's whole budget for that bonus (rules.json passive_design.per), so 10B balances them there.
 */
function effectOptions(content, ev) {
    const per = qualityBudget(content, ev.quality)?.per || {};
    if (ev.kind === 'training' || ev.kind === 'deeds') return [{ scope: 'always', condition: null, effects: [{ kind: 'core_stat_bonus', stat: ev.focus, value: per.core_stat_bonus }], base: FALLBACK.core[ev.focus] }];
    if (ev.kind === 'trial') {
        // the danger he lived through: the damage that brought him down (physical or magical), braced against at the edge
        const order = (ev.facts?.taken?.magical || 0) > (ev.facts?.taken?.physical || 0) ? ['magical', 'physical'] : ['physical', 'magical'];
        return order.map((type) => ({
            scope: 'combat', condition: { kind: 'hp_at_most_pct', pct: 50 }, base: FALLBACK.trial[type],
            effects: [{ kind: 'stat_bonus', stat: type === 'magical' ? 'MDEF' : 'DEF', value: per.stat_bonus }, { kind: 'resist', damage_type: type, pct: per.resist }],
        })).concat([{ scope: 'always', condition: null, base: 'Hard-Won Vigor', effects: [{ kind: 'max_bonus', resource: 'hp', value: per.max_bonus }] }]);
    }
    return [{ scope: ev.scope || 'always', condition: ev.condition || null, effects: ev.effects, base: FALLBACK.engine[ev.quality] }];
}

const originNote = (ev) => (ev.kind === 'training' ? `trained for long on his own (${ev.goal})` : String(ev.why).slice(0, 160));

/**
 * 4.3.0-c.6.6.50 (review of 9C-2c): the ways a new Passive of this quality can be his: into a free slot (null), or, all
 * slots held, in the place of each one he holds (a rare or legendary one only; an ordinary one has none).
 */
export function exchangeOptions(sheet, content, quality) {
    const held = passivesOf(sheet);
    if (held.length < passiveSlots(content)) return [null];
    return quality === 'ordinary' ? [] : held.map((p) => p.id);
}

/**
 * The Passive a piece of evidence makes, for this sheet now: composed, validated, and each effect adding something
 * within the totals in at least one way it can be his (a free slot, or in the place of one he holds): one that adds
 * nothing in every way is left out; a candidate of no real effect is none. def | {refuse}.
 */
export function composeCandidate(state, content, ev) {
    const sheet = state.entities?.pc?.sheet;
    if (!sheet) return { refuse: 'no character' };
    const budget = qualityBudget(content, ev.quality);
    const ways = exchangeOptions(sheet, content, ev.quality);
    if (!ways.length) return { refuse: 'all his Passive slots are held, and an Ordinary Passive takes no other\'s place' };
    for (const o of effectOptions(content, ev)) {
        const probe = { id: 'dyn.passive_probe', scope: o.scope, condition: o.condition, effects: o.effects };
        const gains = ways.map((w) => passiveGain(sheet, content, probe, w));
        const effects = o.effects.filter((_, i) => gains.some((g) => g[i] > 0));
        if (effects.length < (budget?.effects?.[0] || 1)) continue;
        const free = freeName(state, content, o.base);
        if (!free) return { refuse: `no free name for ${o.base}` };
        const draft = { id: free.id, name: free.name, description: '', origin: { kind: ev.kind, note: originNote(ev) }, rank: 'F', quality: ev.quality, scope: o.scope, ...(o.condition ? { condition: o.condition } : {}), effects };
        draft.description = `${QUALITY_TEXT[ev.quality]} Passive, ${passiveWhen(draft)}: ${passiveEffects(draft)}. ${originNote(ev)[0].toUpperCase()}${originNote(ev).slice(1)}.`.replace(/[<>{}`$\\]/g, '').slice(0, 300);
        const errors = passiveDefErrors(draft, content, state);
        if (errors.length) return { refuse: errors.join('; ') };
        return { def: draft };
    }
    return { refuse: 'it would add nothing to what his Passives give him already' };
}

/**
 * The candidates the next safe turn offers (src/v4/runtime.js withGrowth): every pending evidence that makes a real
 * Passive; an ordinary one only while a slot is free (it can never take another's). [{key, hash, def, evidence}]
 */
export function passiveDrafts(state, content) {
    if (rulesetOf(state) < 2 || state.encounter || (state.pending_combat || []).length || state.entities?.pc?.status === 'dead') return [];
    const sheet = state.entities.pc.sheet;
    const full = passivesOf(sheet).length >= passiveSlots(content);
    const out = [];
    let view = state;
    // 9C completion: within the room left for offers of every kind (rules.json growth.development.max_offers); the
    // evidence of a Skill's development is src/v4/skill_growth.js's
    const room = offerRoom(state, content);
    for (const ev of Object.values(evidenceOf(state)).filter((x) => x.status === 'pending' && !SKILL_EVIDENCE.has(x.kind)).sort((a, b) => (a.turn - b.turn) || a.key.localeCompare(b.key))) {
        if (out.length >= room) break;
        if (ev.quality === 'ordinary' && full) continue;
        const c = composeCandidate(view, content, ev);
        if (!c.def) continue;
        out.push({ key: `passive:${ev.key}`, hash: hash32(JSON.stringify(c.def)), def: c.def, evidence: ev.key });
        // the next candidate of this turn does not take the same name
        view = { ...view, decisions: [...(view.decisions || []), { id: `probe.${ev.key}`, kind: 'passive', passive: c.def }] };
    }
    return out;
}

const plain = (t) => String(t ?? '').replace(/[<>{}`$\\]/g, '').replace(/\s+/g, ' ').trim();

/**
 * The offers of these drafts with the Forge's names (entries by key; a name that is not valid or not free now, and a
 * missing entry, keep the fallback). Each one checked on a private copy. {events, offers: [{decision, name, quality, text}]}
 */
export function offerPassives(state, content, drafts, entries = {}) {
    const events = [];
    const offers = [];
    let s = state;
    for (const d of drafts) {
        const ev = evidenceOf(s)[d.evidence];
        if (!ev || ev.status !== 'pending') continue;
        let def = d.def;
        const named = entries?.[d.key];
        if (named && !named.fallback) {
            const r = reservedPassive(s);
            const candidate = { ...def, name: plain(named.name), ...(named.flavor ? { flavor: plain(named.flavor).slice(0, 160) } : {}) };
            const clash = r.names.includes(normText(candidate.name));
            if (!clash && !passiveDefErrors(candidate, content, s).length) def = candidate;
        }
        if (passiveDefErrors(def, content, s).length) continue;
        const id = `dec.passive.${String(ev.key).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`.slice(0, 80);
        const decision = { id, kind: 'passive', what: def.name, at: null, turn: s.turn, evidence: ev.key, quality: ev.quality, passive: clone(def), ...(ev.object ? { object: ev.object } : {}) };
        const ev2 = [{ t: 'growth.offered', d: { key: ev.key, decision: id } }, { t: 'decision.opened', d: { decision } }];
        try {
            s = after(s, ev2);
        } catch {
            continue;
        }
        events.push(...ev2);
        offers.push({ key: d.key, decision: id, name: def.name, quality: ev.quality, text: passiveText(def), why: originNote(ev) });
    }
    return { events, offers };
}

// ------------------------------------------------------------------------------------------------ his decision
const quality = (q) => QUALITY_TEXT[q] || q;
const inFight = (s) => !!s.encounter || (s.pending_combat || []).length > 0;

/** The open offer a command names (its id; null: the one open offer, when there is exactly one). */
function offerOf(s, ref) {
    const all = passiveOffers(s);
    if (typeof ref === 'string') return all.find((d) => d.id === ref) || null;
    return all.length === 1 ? all[0] : null;
}

/**
 * Patch 9C-2c: he accepts an offered Passive (src/v4/commands.js passive.accept): into a free slot, or, a rare or
 * legendary one with all four slots held, in exchange for the one Passive he names, given up for good. Checked again
 * (source, slot, quality bounds, totals after the exchange, a stone still in his hands) and booked all or nothing.
 * {events, line, gained} | {refuse, line}
 */
export function acceptPassive(s, content, ref, replace = null) {
    const no = (why) => ({ refuse: why, line: `NO NEW PASSIVE — ${why}. Nothing changes: his Passives, their slots and his values stay as they are.` });
    if (rulesetOf(s) < 2) return no('Passives belong to the three-class rules');
    const offer = offerOf(s, ref);
    if (!offer) return no(passiveOffers(s).length ? `which of the offered developments: ${passiveOffers(s).map((d) => `${d.passive.name} (${d.id})`).join(' or ')}` : 'no development is offered to him');
    if (inFight(s)) return no('not in a fight: he decides on it once the fight is over');
    const ev = evidenceOf(s)[offer.evidence];
    if (!ev || ev.status !== 'offered') return no(`${offer.passive.name} is no longer offered`);
    const sheet = s.entities.pc.sheet;
    const slots = passiveSlots(content);
    const held = passivesOf(sheet);
    const def = offer.passive;
    let lose = null;
    if (held.length >= slots) {
        if (def.quality === 'ordinary') return no(`all ${slots} Passive slots are held (${held.length}/${slots}); an Ordinary Passive takes no other's place`);
        if (!replace) return no(`all ${slots} Passive slots are held (${held.length}/${slots}): he names the Passive he gives up for good for ${def.name} (${held.map((p) => p.name).join(', ')})`);
        lose = held.find((p) => p.id === replace || normText(p.name) === normText(String(replace)));
        if (!lose) return no(`he holds no Passive "${String(replace).slice(0, 40)}" (${held.map((p) => p.name).join(', ')})`);
    } else if (replace) {
        return no(`a slot is free (${held.length}/${slots}): ${def.name} takes it, and he gives up nothing; accept it without naming one`);
    }
    if (!passiveGain(sheet, content, def, lose?.id).some((g) => g > 0)) return no(`${def.name} would add nothing to what his Passives give him now`);
    const errors = passiveDefErrors(def, content, s);
    if (errors.length) return no(`${def.name} cannot be booked (${errors.join('; ')})`);
    if (offer.object) {
        const o = s.objects?.[offer.object];
        if (!o || o.holder?.entity !== 'pc') return no(`he does not hold ${o?.name || 'the stone'} now`);
    }
    try {
        const d = definePassive(s, content, def);
        if (d.errors.length) return no(d.errors.join('; '));
        let view = after(s, d.events);
        const events = [...d.events];
        if (lose) {
            const l = losePassive(view, 'pc', lose.id, `given up for ${def.name}`, def.id);
            if (l.errors.length) return no(l.errors.join('; '));
            events.push(...l.events);
            view = after(view, l.events);
        }
        const g = gainPassive(view, content, 'pc', def.id, `${quality(def.quality)}: ${def.origin.note}`);
        if (g.errors.length) return no(g.errors.join('; '));
        events.push(...g.events);
        if (offer.object) {
            const o = view.objects[offer.object];
            events.push({ t: 'object.consumed', d: { id: o.id, by: 'pc', ...((o.qty ?? 1) > 1 ? { qty: 1 } : {}) } });
        }
        // 4.3.0-c.6.6.50 (review of 9C-2c): what the Passive he gave up raised (a maximum, or a core stat behind one) ends
        // with it: HP, MP and STA above their new maxima come down to them in the same booking, nothing is filled up
        const settled = after(s, events).entities.pc.sheet;
        const dv = deriveCharacter(settled, content);
        const lowered = [];
        for (const [r, max] of [['hp', dv.maxHp], ['mp', dv.maxMp], ['sta', dv.maxSta]]) {
            if (!(settled[r] > max)) continue;
            events.push({ t: 'resource.changed', d: { id: 'pc', resource: r, value: max, why: `${lose?.name || def.name}: its maximum ended` } });
            lowered.push(`${r.toUpperCase()} ${settled[r]} → ${max}`);
        }
        events.push({ t: 'growth.decided', d: { key: ev.key, status: 'accepted', passive: def.id } }, { t: 'decision.closed', d: { id: offer.id, status: 'accepted' } });
        after(s, events);
        const gained = { passive: def.id, name: def.name, quality: def.quality, text: passiveText(def), ...(lose ? { replaced: lose.name } : {}), ...(lowered.length ? { lowered } : {}), slots: `${held.length - (lose ? 1 : 0) + 1}/${slots}` };
        return {
            events, gained,
            line: `NEW PASSIVE — ${def.name} (${quality(def.quality)}), booked by the engine: ${passiveWhen(def)}, ${passiveEffects(def)}${lose ? `; ${lose.name} is given up for good (its effects end${lowered.length ? `: ${lowered.join(', ')}` : ''})` : ''}. Passive slots ${gained.slots}. Show the change settling in him in a sentence or two; its numbers are the engine's, nothing else about him changes.`,
        };
    } catch (err) {
        return no(`${def.name} cannot be booked (${String(err?.message || err)})`);
    }
}

/** Patch 9C-2c: he declines an offered Passive: this development is decided for good; a stone stays his, unspent. */
export function declinePassive(s, content, ref) {
    const offer = offerOf(s, ref);
    if (!offer) return { refuse: 'no such offer', line: `NOTHING TO DECLINE — ${passiveOffers(s).length ? `which of ${passiveOffers(s).map((d) => d.passive.name).join(' or ')}?` : 'no development is offered to him'}` };
    const events = [{ t: 'growth.decided', d: { key: offer.evidence, status: 'declined' } }, { t: 'decision.closed', d: { id: offer.id, status: 'declined' } }];
    return { events, line: `DECLINES — ${offer.passive.name} (${quality(offer.quality)}): he lets this development pass; it does not come back. Nothing about him changes${offer.object ? ' and the stone stays his, unspent' : ''}.` };
}

// ------------------------------------------------------------------------------------------------ texts
/**
 * 4.3.0-c.6.6.50: the exchanges worth making for an offered Passive, all slots held: for each Passive he holds whose
 * place it could take with a real gain, what it would add there and what would end. ["Iron Hide it adds INT +2 (Iron
 * Hide's DEF +2 ends)", …]
 */
export function exchangeTexts(sheet, content, def) {
    const out = [];
    for (const p of passivesOf(sheet)) {
        const g = passiveGain(sheet, content, def, p.id);
        const fx = def.effects.map((x, i) => (g[i] > 0 ? { ...x, ...('value' in x ? { value: g[i] } : { pct: g[i] }) } : null)).filter(Boolean);
        if (fx.length) out.push(`${p.name} it adds ${passiveEffects({ effects: fx })} (${p.name}'s ${passiveEffects(p)} ends)`);
    }
    return out;
}

/** The lines of his Passive slots and open offers (#passives, #class): "PASSIVES — 2/4", each Passive, each offer. */
export function passiveLines(state, content) {
    const sheet = state.entities?.pc?.sheet;
    if (!sheet) return [];
    const slots = passiveSlots(content);
    const held = passivesOf(sheet);
    const lines = [`PASSIVES — ${held.length}/${slots}`, ...(held.length ? held.map((p) => `- ${passiveText(p)}`) : ['- none'])];
    for (const d of passiveOffers(state)) {
        const full = held.length >= slots;
        const worth = full && d.passive.quality !== 'ordinary' ? exchangeTexts(sheet, content, d.passive) : [];
        const how = !full ? 'accept it into a free slot, or decline it' : d.passive.quality === 'ordinary' ? 'all slots are held: an Ordinary Passive cannot be taken'
            : worth.length ? `all slots are held: accept it by naming the Passive he gives up for good; in the place of ${worth.join('; of ')}; or decline it` : 'all slots are held, and in the place of none he holds would it add anything now; decline it or keep it open';
        lines.push(`POSSIBLE PASSIVE — ${passiveText(d.passive)} · ${d.passive.origin?.note || ''} · not his yet: ${how} (${d.id})`);
    }
    for (const h of sheet.passive_history || []) lines.push(`- given up: ${h.name}${h.quality ? ` [${quality(h.quality)}]` : ''}${h.replaced_by ? ` (for ${state.passive_defs?.[h.replaced_by]?.name || h.replaced_by})` : ''}`);
    return lines;
}

export { CORE_STATS };
