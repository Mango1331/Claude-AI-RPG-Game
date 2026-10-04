// Runtime V4: applying the extractor's world deltas (docs/RUNTIME_V4_PLAN.md §5.2). After the narrator's reply the
// extractor reported, in story order, what the reply established (src/v4/extract.js); the domain/authority firewall
// removed what the story may not decide (src/v4/firewall.js). Here the engine applies the rest step by step, each delta
// checked against the state at its step, and fires what waited for the reply (a turn-in on arrival at a Guild hall).
//
// World deltas without a V4 domain (people, creatures, scene, facts, knowledge, attitudes, memories, threads, combat
// commitments, intents) go through the V3 rules of src/delta.js as one-item reports: the same resolver, the same entity
// creation (names, templates, body-plan anchors), the same witness and fact rules, the same combat commitments; a fight
// opens exactly as in V3 (engine.js openCommitted). Places, time, objects, offers, coin, coercion and quests are V4
// handlers. Nothing here can change what the player's commands resolved.
import { Dice } from '../rng.js';
import { applyEvent } from '../state.js';
import { clone, normText, slug } from '../util.js';
import { deriveCharacter } from '../derived.js';
import { reportToEvents, makeResolver } from '../delta.js';
import { truth, entityLabel, setFactEvents, statusOf, normPredicate } from '../knowledge.js';
import { perceiveAll, selfIntro, episode, openCommitted, materialise } from '../engine.js';
import { firewall } from './firewall.js';
import { stripOwned, wrongClaim, ownershipViolation, stateRegions, effectViolation } from './ownership.js';
import { mayOpenFight, mayTake } from './envelope.js';
import {
    PLACE_PARENTS, HALL_NAME, hallOf, settlementOf, sameSettlement, placeName, contracts, heldBy, openOffers, membership, isLooseCoin, today, namesKind,
} from './domain.js';
import { completeContract, abandonContract, acceptContract, REGISTRATION_OFFER, countShort, tallyText, isHunt, statusCorrection } from './guild.js';
import { pickLines, bookPurchase, bookSale, saleUnits, unitsText } from './trade.js';

// Decision Ownership as an assertion (tests/helpers.js switches it on for the whole suite): every event of an extractor
// delta must be a kind its type may write (src/v4/ownership.js DELTA_WRITES); off in the product
// the predicates of a fight's moment (selective persistence: they end with the fight) and the words of a lasting mark
const FIGHT_MOMENT = /^(?:behaviou?r|demeanou?r|position|posture|stance|gait|movement|motion|action|activity|last_attack|attack(?:ing)?|tactics?|mood|focus|wounded|bleeding|breathing|stamina|fatigue)$/;
const LASTING_MARK = /\b(?:lost|loses|missing|severed|scar\w*|maimed|crippled|blinded|permanent\w*|tattoo\w*|brand\w*)\b/i;

let OWNERSHIP_ASSERT = false;
export function assertOwnership(on = true) { OWNERSHIP_ASSERT = !!on; }

// the words that end a person's name or role in a description ("clerk at the Walk", "steward of the weirs")
const RELATION_WORDS = new Set(['of', 'at', 'in', 'on', 'with', 'by', 'from', 'near', 'behind', 'beside', 'to', 'for', 'who', 'that']);
// a local sign-off made a condition ("must inspect and sign before payment", "will sign once …")
const SIGN_OFF = /\b(?:sign(?:s|ed|ing)?|signature|countersign\w*|inspect\w*|confirm\w*|vouch\w*|witness\w*|verif\w*)\b/i;
const REQUIRE = /\b(?:must|required?|requires|need(?:s|ed)?|before|until|unless|only|once)\b/i;

/** The firewall's view of the state after the player's turn (src/v4/firewall.js FirewallContext). */
export function firewallContext(s, content) {
    const o = s.last?.outcome || {};
    const guildish = (id) => {
        const e = s.entities[id];
        if (!e) return false;
        const role = [truth(s, id, 'occupation')[0]?.o, e.traits, ...(e.descriptors || [])].filter(Boolean).join(' ');
        return /\bguild\b/i.test(role) || (!!hallOf(s, e.at || s.scene.at) && s.scene.present.includes(id) && /\b(?:clerk|registrar|receptionist|desk)\b/i.test(role));
    };
    const names = new Map();
    for (const e of Object.values(s.entities)) if (e.name) names.set(normText(e.name), e.id);
    const auth = o.auth || {};
    return {
        c: !!(auth.c || o.c), // Prototype C: the turn the planner read
        isGuildPerson: (ref) => guildish(ref) || guildish(names.get(normText(ref))),
        inGuildHall: !!hallOf(s, s.scene.at),
        contracts: contracts(s).map((q) => ({ id: q.id, title: q.title, payout_cp: q.payout_cp ?? null, client: q.client || null, status: q.status })),
        booked: o.booked || { registration: false, grants: [], turnIns: [], accepted: [] },
        auth: { go: !!(auth.gos || []).length || !!auth.go, roam: !!auth.roam, take: !!(auth.take || []).length, gather: !!auth.gather, forced: false },
        heldByPc: (ref) => s.objects?.[ref]?.holder?.entity === 'pc' || (typeof ref === 'string' && ref.startsWith('item.') && !!s.entities.pc.sheet.inventory[ref.slice(5)]),
        isGuildContractRef: (ref) => {
            if (typeof ref !== 'string') return false;
            const q = s.quests?.[ref] || Object.values(s.quests || {}).find((x) => x.kind === 'guild_contract' && normText(x.title) === normText(ref));
            return q?.kind === 'guild_contract';
        },
        guildContractForObject: (ref) => {
            if (typeof ref !== 'string') return null;
            let o = s.objects?.[ref] || Object.values(s.objects || {}).find((x) => normText(x.name) === normText(ref));
            if (!o) {
                const active = contracts(s).filter((q) => q.status === 'active');
                if (active.length === 1 && /\b(?:guild\s+)?contract\s+slip\b/i.test(ref)) return active[0];
                return null;
            }
            return (o.for_quests || []).map((id) => s.quests?.[id]).find((q) => q?.kind === 'guild_contract') || null;
        },
        // the Guild's canon for the corrections of refused Guild facts (guild_canon)
        canon: { feeCp: content.rules.guild.registration_fee_cp, guildRanks: content.rules.guild.ranks, powerRanks: content.rules.ranks.order },
    };
}

// ------------------------------------------------------------------------------------------------ places
/** Resolve a place ref; {new: {name, kind, parent}} creates it (the same name under the same parent is the same place). */
function resolvePlace(s, ref, emit, depth = 0) {
    if (typeof ref === 'string') return s.places[ref] ? { id: ref } : { error: `unknown place ${ref}` };
    const n = ref?.new;
    if (!n || typeof n !== 'object' || !n.name) return { error: 'a place needs an id or {new: {name, kind, parent}}' };
    if (depth > 1) return { error: 'at most one level of new parents' };
    if (/\bguild\b/i.test(n.name) && /\b(?:hall|house|office|lodge|building)\b/i.test(n.name)) {
        // the Guild hall is the engine's node: a reply that names it again means that node
        const town = typeof n.parent === 'string' ? settlementOf(s, n.parent) : settlementOf(s, s.scene.at);
        const hall = town && `${town}.guild_hall`;
        return hall && s.places[hall] ? { id: hall } : { error: 'Guild halls are engine nodes; there is no branch in this settlement' };
    }
    const parent = n.parent === null || n.parent === undefined ? { id: s.scene.at } : resolvePlace(s, n.parent, emit, depth + 1);
    if (parent.error) return parent;
    let pid = parent.id;
    // a kind that cannot lie in its parent climbs to the first ancestor where it can (a hamlet named inside a site of
    // the town lies in the realm or region, not in the site)
    for (let i = 0; i < 6 && pid && !(PLACE_PARENTS[n.kind] || []).includes(s.places[pid]?.kind); i++) pid = s.places[pid]?.parent;
    if (!pid) return { error: `a ${n.kind} cannot lie in ${placeName(s, parent.id)}` };
    const same = Object.values(s.places).find((p) => p.parent === pid && normText(p.name) === normText(n.name));
    if (same) return { id: same.id };
    let id = `${pid.startsWith('loc.') ? pid : 'loc'}.${slug(n.name) || 'place'}`;
    for (let k = 2; s.places[id]; k++) id = `${pid.startsWith('loc.') ? pid : 'loc'}.${slug(n.name)}_${k}`;
    const p = s.places[pid];
    emit({ t: 'place.created', d: { place: { id, name: String(n.name).slice(0, 80), kind: n.kind, parent: pid, realm: p?.realm ?? null, tags: [], by: 'reply', created: { turn: s.turn, minute: s.clock.minute } } } });
    return { id };
}

/** The content or V4 settlement a node belongs to: the scene's "location" for the V3 views (HUD, lore, facts). */
function locationOf(s, id) {
    return settlementOf(s, id) || s.places[id]?.realm || s.scene.location;
}

// ------------------------------------------------------------------------------------------------ apply
/**
 * Apply one valid extractor answer to the state after the player's turn.
 * @param {object} state state after the player's turn (its outcome carries auth, expected keys and conditionals)
 * @param {{expected: object, deltas: object[]}} answer schema-valid extractor answer
 * @param {{msg?: number|null, prose?: string}} opts msg: the reply's chat index (ids); prose: the reply's text
 * @returns {{events, rejected, corrections, system, opened, state, arrivedHall}}
 */
export function applyWorld(state, content, answer, { msg = null, prose = '' } = {}) {
    const s = clone(state);
    const dice = Dice.from(s);
    const events = [];
    // the step whose events these are (Decision Ownership: an extractor delta writes only what its type may write)
    let step = { kind: 'engine' };
    // a gate the current delta passed (src/v4/ownership.js): only then may it reach the engine-owned kind behind it
    const grant = (gate) => step.granted?.add(gate);
    const emit = (e) => {
        if (dice.n !== s.rng.n) e.rng_to = dice.n;
        const checked = OWNERSHIP_ASSERT && step.kind === 'delta';
        const before = checked ? stateRegions(s) : null;
        if (OWNERSHIP_ASSERT) {
            const why = ownershipViolation(step, e, s);
            if (why) throw new Error(`Decision Ownership: ${why}`);
        }
        applyEvent(s, e);
        if (checked) {
            const why = effectViolation(step, e, before, stateRegions(s));
            if (why) throw new Error(`Decision Ownership: ${why}`);
        }
        events.push(e);
    };
    const rejected = [];
    const corrections = [];
    const system = [];
    const reject = (d, rule, why) => {
        rejected.push({ seq: d?.seq ?? 0, type: d?.type ?? 'expected', rule, why });
        emit({ t: 'delta.rejected', d: { item: d, rule, reason: why } });
    };
    // the arrivals of this reply in story order, applied or refused (an escort's readiness, quest.ready below)
    const travel = [];
    const refusedArrival = (d) => { if (d?.type === 'arrive') travel.push({ seq: d.seq ?? 0, ok: false, away: leavesHere(d.at) }); };
    const outcome = s.last?.outcome || {};
    const auth = outcome.auth || {};
    // Prototype C: the turn the planner read (a story turn: auth.c; a V3-routed one: the outcome's c)
    const cPath = !!(auth.c || outcome.c);
    const expected = answer.expected || {};
    const tag = msg !== null && msg !== undefined ? msg : s.turn;

    // 1. authority first: what the story may not decide is never applied
    const fw = firewall(answer.deltas, firewallContext(s, content));
    for (const x of fw.reject) { reject(x.delta, x.rule, x.why); refusedArrival(x.delta); }
    corrections.push(...fw.corrections);
    // the other side of a trade the engine books this turn: a sale's buyer, a seller he paid exactly (coin.gift below)
    const counterparts = new Set([...(outcome.booked?.sellers || []), ...s.decisions.filter((x) => x.kind === 'sale' && x.turn === s.turn).map((x) => x.seller || '*')]);

    // 2. world deltas in story order, each against the state at its step
    const refs = new Map(); // a delta's ref -> the entity it names (person.new, creature.new of this answer)
    const groups = new Map(); // a creature.new ref with count > 1 -> its individual ids
    const objectsNew = new Map(); // name -> object id, for object.move {new: name} of this answer
    const hostileRefs = new Set(fw.accept.filter((d) => d.type === 'hostile').flatMap((d) => d.by || []).map((x) => normText(x)));
    const joinedByNew = new Set();
    const bornHere = new Set(); // the people and creatures this answer introduces (an ambush is the world's move)
    const cap = s.encounter ? content.rules.time.combat_cap_min : auth.timeCap ?? content.rules.time.default_cap_min;
    // Prototype C (auth.c): the minutes the engine already booked for this turn's activities count as used; the
    // extractor's time for the same span is not booked again (its minutes cover the booked ones first)
    const booked = auth.c ? auth.booked_min || 0 : 0;
    let bookedLeft = booked;
    let timeUsed = booked;
    const startAt = s.scene.at;
    let arrived = null;
    let arrivedHall = null;
    const conditionals = (outcome.conditionals || []).map((c) => ({ ...c, done: false }));
    const idOf = (ref) => {
        if (ref === null || ref === undefined || typeof ref !== 'string') return null;
        const k = normText(ref);
        if (refs.has(k)) return refs.get(k);
        if (s.entities[ref]) return ref;
        const hit = makeResolver(s, new Map(), content)(ref);
        if (hit) return hit;
        // a ref in the vocabulary's own form for a known person ("person.aldsa_corren" for Aldsa, live 30.09.2026)
        const bare = ref.replace(/^(?:person|npc|creature|mon)\./i, '');
        const named = bare !== ref ? makeResolver(s, new Map(), content)(bare) : null;
        if (named && named !== 'pc') return named;
        // "the same clerk", "the clerk": the one person here (or met at this place) whose role names that word. Only a
        // short reference is a person; a description ("a squat former tollhouse at the landward end of the Walk") is
        // text, never the clerk whose role ends "at the Walk" (live 30.09.2026 14:56)
        const short = k.replace(/^(?:the |a |an )?(?:same |other |first |second )?/, '').split(' ').filter(Boolean);
        if (!short.length || short.length > 3 || short.some((w) => RELATION_WORDS.has(w))) return null;
        const last = short.at(-1);
        if (last.length < 3) return null;
        const head = (x) => { const w = normText(x).split(' '); const end = w.findIndex((y) => RELATION_WORDS.has(y)); return (end < 0 ? w : w.slice(0, end)).at(-1); };
        const local = Object.values(s.entities).filter((e) => e.kind === 'npc' && e.status !== 'dead' && (s.scene.present.includes(e.id) || (e.location === s.scene.location && (!e.at || e.at === s.scene.at)))
            && [...(e.descriptors || []), truth(s, e.id, 'occupation')[0]?.o].filter(Boolean).some((x) => head(x) === last));
        return local.length === 1 ? local[0].id : null;
    };
    const mapRef = (ref) => (typeof ref === 'string' ? idOf(ref) || ref : ref);
    // the World Envelope at this step (docs/ARCHITECTURE_GEN35.md §2.3): may this actor turn on Alaric of its own accord?
    const envelopeAllows = (id, d) => {
        if (typeof id !== 'string' || !s.entities[id] || !['npc', 'creature'].includes(s.entities[id].kind)) { grant('envelope.fight'); return true; } // the V3 rules refuse unknown attackers
        const v = mayOpenFight(s, content, id, { newInAnswer: bornHere.has(id), c: cPath });
        if (v.ok) { grant('envelope.fight'); return true; }
        const label = entityLabel(s, id);
        reject(d, 'envelope', `${id} does not turn on Alaric: ${v.why}`);
        const correction = `${label} did not turn on Alaric in the last reply (${v.why}); no fight started. ${v.rule === 'provoked_only' ? 'Only a cause the story establishes first (an insult, a threat, harm) turns them against him.' : 'An animal like this one attacks only when cornered or within reach.'}`;
        if (!corrections.includes(correction)) corrections.push(correction);
        return false;
    };
    let calls = 0;
    const v3 = (report, d) => {
        calls += 1;
        const r = reportToEvents(report, s, content, { msg, prose, idTag: `d${d?.seq ?? 0}${calls > 1 ? `_${calls}` : ''}` });
        r.events.forEach(emit);
        for (const x of r.rejected) reject(d, 'world_rule', x.reason);
        return r;
    };
    // Is a group the target of an active ATTACK/DEFEAT objective? By the kind the objective names, never by the body
    // plan alone (review of 4.1.0: the deer plan's alias "goat" made a flock of sheep the targets of a wild-goat job):
    // the group's species names the objective's creature or the objective names the group's ("giant rats" ~ "rats",
    // "swarm of rats" ~ "rats"), or the objective names the body plan's whole kind ("the vermin in the cellar": rats).
    const hunted = (d, anchor) => Object.values(s.quests).filter((q) => q.status === 'active')
        .flatMap((q) => (q.objectives || []).filter((o) => o.verb === 'ATTACK' || o.verb === 'DEFEAT'))
        .some((o) => namesKind(o.what, d.species, anchor));
    const newEntity = (d, kind) => {
        // A large group of skittish animals (their body-plan's temperament: a flock, a herd, a flight of birds) that nobody
        // set on Alaric is the scene's background, one fact, not a dozen combat profiles (live 30.09.2026: twelve penned
        // sheep). A pack of aggressive, defensive or cautious creatures stays individual, whatever its size, and so do
        // the animals an active contract is to attack or defeat (the rats of a cellar job); one animal singled out later
        // is a creature.new of its own.
        const anchor = kind === 'creature' ? content.anchors.get(d.anchor) : null;
        if (anchor?.temperament === 'skittish' && d.count > 4 && !hunted(d, anchor) && !s.encounter && !hostileRefs.has(normText(d.ref))) {
            setFactEvents(s, { s: s.scene.at, p: 'background_fauna', o: `${d.count} ${d.species}`, source: { kind: 'narration', msg }, importance: 0.3 }).forEach(emit);
            return [];
        }
        // One animal of a kind that left this area alive, and no other of its kind: the story shows it coming back, not
        // a second one (live 30.09.2026 14:56: the big bog strider withdrew into the reeds and returned as "Bog
        // Strider D" while the first stayed alive in the state). Two or more such animals stay a question for the story.
        if (kind === 'creature' && (d.count || 1) === 1 && d.present !== false) {
            const same = Object.values(s.entities).filter((e) => e.kind === 'creature' && statusOf(s, e.id) !== 'dead' && !s.scene.present.includes(e.id)
                && normText(e.species || '') === normText(d.species || '') && (e.anchor || e.profile?.anchor) === d.anchor && e.location === s.scene.location);
            // a stronger one than the ordinary one that left, whose numbers are fixed, is another individual (review of
            // 4.1.5: the returning path skipped the variation); one not yet fixed is this one, shown stronger now
            const other = same.length === 1 && d.stronger === true && same[0].variation !== 'strong' && !!same[0].profile;
            if (same.length === 1 && !other) {
                emit({ t: 'scene.entered', d: { id: same[0].id, band: d.band || 'MEDIUM' } });
                refs.set(normText(d.ref), same[0].id);
                if (d.stronger === true && same[0].variation !== 'strong') emit({ t: 'entity.updated', d: { id: same[0].id, set: { variation: 'strong' } } });
                if (!same[0].profile) materialise(s, content, dice, emit, same[0].id);
                return [same[0].id];
            }
        }
        const before = new Set(Object.keys(s.entities));
        const entries = [];
        const count = kind === 'creature' ? Math.max(1, Math.min(12, d.count || 1)) : 1;
        for (let i = 1; i <= count; i++) {
            const ref = count > 1 ? `${d.ref} ${i}` : d.ref;
            entries.push(kind === 'npc'
                ? { ref, kind: 'npc', name: d.name || undefined, anonymous: !d.name, desc: [...(d.role ? [d.role] : []), ...(d.desc || [])], traits: (d.desc || []).join(', '), band: d.band || undefined }
                : { ref, kind: 'creature', name: undefined, species: d.species, anchor: d.anchor, desc: d.desc || [], band: d.band || undefined });
        }
        const joins = kind === 'creature' && s.encounter && hostileRefs.has(normText(d.ref));
        if (joins) grant('envelope.fight'); // introduced by this reply: an ambush or a reinforcement is the world's move
        const r = v3({ new: entries, ...(joins ? { combat: entries.map((e) => ({ by: e.ref })) } : {}) }, d);
        if (joins) joinedByNew.add(normText(d.ref));
        const created = r.events.filter((e) => e.t === 'entity.created').map((e) => e.d.entity.id).filter((id) => !before.has(id));
        for (const id of created) bornHere.add(id);
        const known = r.accepted.map((a) => /^known (\S+) \(not duplicated\)$/.exec(a)?.[1]).filter(Boolean);
        const ids = [...created, ...known];
        if (ids.length) refs.set(normText(d.ref), ids[0]);
        if (d.name && ids.length) refs.set(normText(d.name), ids[0]);
        if (count > 1) groups.set(normText(d.ref), ids);
        // who the person is shows on their card (occupation), as text: the V3 fact rule would read "Guild clerk" as a
        // reference to the clerk himself
        if (kind === 'npc' && d.role && created.length && !truth(s, created[0], 'occupation').length) occupation(created[0], d.role);
        // an individual the story establishes as bigger or stronger than ordinary ones of its kind (creature.new stronger):
        // the individual variation of Content #7, fixed with its profile (live run 30.09.2026 22:41: the big boar had the
        // numbers of a common one); the name it goes by decides nothing
        if (kind === 'creature' && d.stronger === true) for (const id of created) emit({ t: 'entity.updated', d: { id, set: { variation: 'strong' } } });
        // Gameplay visibility: once an actual creature is visibly present, lock its deterministic profile immediately.
        // This gives the player a canonical target handle + HP + Range before deciding whether to attack; Initiative still waits for Combat START.
        if (kind === 'creature' && d.present !== false) for (const id of ids) materialise(s, content, dice, emit, id);
        return ids;
    };

    const explicitArrival = fw.accept.some((d) => d.type === 'arrive');
    if (!explicitArrival && !s.encounter) {
        for (const [k, type] of Object.entries(outcome.expected_keys || {}).sort((a, b) => Number(a[0]) - Number(b[0]))) {
            if (type !== 'go') continue;
            const e = expected[k];
            if (!e || e.arrived !== true) continue;
            const go = (auth.gos || []).find((g) => String(g.seq) === String(k));
            const at = e.at ? resolvePlace(s, e.at, emit) : go?.to ? { id: go.to } : { error: 'no place' };
            if (!at.error && at.id !== s.scene.at) {
                const party = companions(e.with, { seq: Number(k), type: 'expected' });
                perceiveAll(s, emit);
                arrive(at.id, party);
                travel.push({ seq: 0, ok: true });
            }
        }
    }

    for (const d of [...fw.accept].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))) {
        step = { kind: 'delta', type: d.type, seq: d.seq ?? 0, granted: new Set() };
        // Authority is checked again at the actual story step: earlier deltas may have changed its context.
        const stepFw = firewall([d], firewallContext(s, content));
        if (!stepFw.accept.length) {
            for (const x of stepFw.reject) { reject(x.delta, x.rule, x.why); refusedArrival(x.delta); }
            for (const x of stepFw.corrections) if (!corrections.includes(x)) corrections.push(x);
            continue;
        }
        switch (d.type) {
            case 'time': {
                const covered = Math.min(bookedLeft, d.minutes);
                bookedLeft -= covered;
                const want = d.minutes - covered;
                const room = Math.max(0, cap - timeUsed);
                const m = Math.min(want, room);
                if (m < want) reject(d, 'time_cap', `${d.minutes} min exceed what this turn allows (${cap} min${auth.go ? '' : ' without travel or an activity'}); ${m} applied`);
                if (m > 0) { emit({ t: 'time.advanced', d: { minutes: m, why: 'narration' } }); timeUsed += m; }
                break;
            }
            case 'arrive': {
                if (s.encounter) { reject(d, 'combat', 'no travel while combat is ACTIVE'); refusedArrival(d); break; }
                const away = leavesHere(d.at);
                const at = resolvePlace(s, d.at, emit);
                if (at.error) { reject(d, 'place', at.error); travel.push({ seq: d.seq ?? 0, ok: false, away }); break; }
                if (at.id === s.scene.at) break;
                const party = companions(d.with, d);
                perceiveAll(s, emit);
                arrive(at.id, party);
                travel.push({ seq: d.seq ?? 0, ok: true });
                break;
            }
            case 'person.new': {
                if (d.present === false) {
                    // someone the reply mentions who is elsewhere: exists, not here, not met (P0/S3 E3, Ossler)
                    const known = idOf(d.name || d.ref);
                    if (known && s.entities[known]) { refs.set(normText(d.ref), known); break; }
                    let where = null;
                    if (d.at) {
                        const p = resolvePlace(s, d.at, emit);
                        if (!p.error) where = p.id;
                    }
                    const id = uniqueEntityId(s, d.name || d.role || d.ref);
                    bornHere.add(id);
                    emit({ t: 'entity.created', d: { entity: { id, kind: 'npc', name: d.name ? String(d.name).slice(0, 60) : null, descriptors: [...new Set([...(d.role ? [d.role] : []), ...(d.desc || []), d.ref].map((x) => String(x).toLowerCase().slice(0, 40)))], traits: (d.desc || []).join(', ').slice(0, 240), status: 'alive', location: where ? locationOf(s, where) : s.scene.location, at: where, created: { turn: s.turn, minute: s.clock.minute }, source: { kind: 'narration', msg }, card: {}, template: 'commoner' } } });
                    refs.set(normText(d.ref), id);
                    if (d.name) refs.set(normText(d.name), id);
                    if (d.role) occupation(id, d.role);
                    break;
                }
                newEntity(d, 'npc');
                break;
            }
            case 'person.named': {
                // a person known without a name whom the story now names (live 30.09.2026: the anonymous wool cart
                // driver became a second person "Dren"): the same entity, now with its name
                const id = idOf(d.who);
                const e = id && id !== 'pc' ? s.entities[id] : null;
                const name = String(d.name || '').trim().slice(0, 60);
                if (!e || e.kind !== 'npc' || !name) { reject(d, 'world_rule', 'person.named: no such known person'); break; }
                if (e.name && normText(e.name) !== normText(name) && !normText(name).startsWith(`${normText(e.name)} `)) {
                    reject(d, 'world_rule', `${id} is already named ${e.name}`);
                    break;
                }
                if (normText(e.name || '') !== normText(name)) emit({ t: 'entity.updated', d: { id, set: { name, known_name: name, descriptors: [name.toLowerCase()] } } });
                refs.set(normText(name), id);
                break;
            }
            case 'creature.new':
                newEntity(d, 'creature');
                break;
            case 'enter':
                v3({ enter: [mapRef(d.who)] }, d);
                break;
            case 'leave': {
                const who = mapRef(d.who);
                perceiveAll(s, emit);
                v3({ leave: [who] }, d);
                // who walks off is not waiting at this place when Alaric comes back
                if (s.entities[who]?.at && !s.scene.present.includes(who)) emit({ t: 'entity.updated', d: { id: who, set: { at: null } } });
                break;
            }
            case 'position':
                v3({ position: [{ who: mapRef(d.who), band: d.band, cover: d.cover || undefined }] }, d);
                break;
            case 'aware':
                v3({ aware: [{ who: mapRef(d.who), level: d.level }] }, d);
                break;
            case 'intent': {
                // an intent to attack him is the same decision as turning on him: the World Envelope's (outside a fight)
                const who = mapRef(d.who);
                if (d.intent === 'attack' && !s.encounter && !envelopeAllows(who, d)) break;
                grant('narrated_intent');
                v3({ intent: [{ who, intent: d.intent }] }, d);
                break;
            }
            case 'hostile': {
                const by = (d.by || []).flatMap((x) => (groups.get(normText(x)) || [mapRef(x)])).filter((x) => !joinedByNew.has(normText(x)));
                // who turns on Alaric: inside the World Envelope at this step (an attitude the reply lowered before is
                // a cause); outside it nobody attacks, the next engine block says why
                const left = by.filter((x) => !(typeof x === 'string' && s.encounter?.combatants?.[x])).filter((x) => envelopeAllows(x, d));
                if (left.length) v3({ combat: left.map((x) => ({ by: x })) }, d);
                break;
            }
            case 'fact': {
                // selective persistence (Gen 3.5): what the story says about the fighters while the fight runs (how they
                // move, what they do, a fresh wound) describes state the fight owns; it lives as long as that fight. Only
                // such known moment-to-moment predicates, and never a lasting mark ("lost two fingers", a scar): anything
                // else said during a fight keeps its lifetime, as everything said outside one (review of 4.2.0)
                const subject = mapRef(d.s);
                const enc = s.encounter;
                const combatant = !!enc && typeof subject === 'string' && subject !== 'pc' && !!enc.combatants?.[subject];
                // "the wolves", "the last wolf", "wolf pack": no one entity, but the kind of the opponents still fighting
                const fighters = !!enc && typeof subject === 'string' && !s.entities[subject] && Object.values(enc.combatants).some((c) => c.id !== 'pc' && c.side === 'hostile'
                    && !c.current.defeated && namesKind(String(d.s), s.entities[c.id]?.species, content.anchors.get(s.entities[c.id]?.anchor || s.entities[c.id]?.profile?.anchor)));
                const scoped = (combatant || fighters) && FIGHT_MOMENT.test(normPredicate(d.p)) && !LASTING_MARK.test(String(d.o ?? ''));
                v3({ facts: [{ s: subject, p: d.p, o: mapRef(d.o), ...(scoped ? { scope: { fight: enc.id } } : {}) }] }, d);
                break;
            }
            case 'learn':
                // who/s are references; o is the literal proposition value. Resolving "Alaric Red" as an entity
                // turned the name into "pc" in the 28.09. live run.
                v3({ learn: [{ who: mapRef(d.who), s: mapRef(d.s), p: d.p, o: typeof d.o === 'string' ? d.o : String(d.o), how: d.how }] }, d);
                break;
            case 'attitude':
                v3({ attitude: [{ who: mapRef(d.who), delta: d.delta, why: d.why }] }, d);
                break;
            case 'memory': {
                // a memory keeps the moment, never the engine's state as a second truth (Decision Ownership): a clause
                // that states a contract's status, a payout, Quest XP, Guild rank or membership goes; the rest stays
                const cut = stripOwned(d.text, { store: 'memory' });
                if (!cut.kept.length) { reject(d, 'engine_owned_memory', `a memory keeps the moment; ${cut.kinds.join(', ')} is the engine's state, recorded by the engine`); break; }
                v3({ memory: [{ text: cut.owned.length ? cut.kept.join(' ') : d.text, who: (d.who || []).map(mapRef), imp: d.imp }] }, d);
                break;
            }
            case 'thread':
                v3({ threads: [{ text: d.text, kind: d.kind, status: d.status }] }, d);
                break;
            case 'recover': {
                const who = idOf(d.who) || 'pc';
                const serviced = (s.services || []).some((x) => x.turn === s.turn && ['lodging', 'healing', 'meal'].includes(x.service));
                if (who === 'pc' && !auth.rest && !serviced) { reject(d, 'recover', 'Alaric recovers only while resting or sleeping, or with lodging or healing he paid for'); break; }
                // Prototype C: his natural recovery for the rest or sleep is the engine's, booked with the turn
                if (who === 'pc' && auth.c && auth.recovered) { reject(d, 'engine_recovery', 'the engine already booked his recovery for the rest or sleep'); break; }
                const amounts = {};
                if (d.hp) amounts.hp = d.hp;
                if (d.sta) amounts.sta = d.sta;
                if (who === 'pc') grant('player.rest');
                if (Object.keys(amounts).length) v3({ recover: [{ who, ...amounts, why: who === 'pc' ? (serviced ? 'lodging or healing' : 'rest') : 'rest' }] }, d);
                break;
            }
            case 'object.new':
                // coin is a number, never a thing: Alaric's in his purse, anyone else's in the story; coin he gains is
                // coin.gift (a phantom "copper" after the Guild payout, live 30.09.2026)
                if (isLooseCoin(d.name)) {
                    reject(d, 'currency_wallet', 'loose coin is no object: Alaric\'s coin is his purse total, and coin he gains in the story is coin.gift');
                    break;
                }
                objectNew(d);
                break;
            case 'object.move':
                objectMove(d);
                break;
            case 'object.mark': {
                const o = objectRef(d.object);
                if (!o) { reject(d, 'object', 'unknown object'); break; }
                emit({ t: 'object.marked', d: { id: o.id, mark: String(d.mark).slice(0, 120), by: idOf(d.by) || String(d.by || '').slice(0, 60) || null, turn: s.turn } });
                break;
            }
            case 'offer':
                offer(d);
                break;
            case 'coin.gift': {
                const from = idOf(d.from);
                if (from === 'pc') { reject(d, 'coin', 'Alaric does not gift himself coin'); break; }
                const refusal = coinRefusal(d, from);
                if (refusal) {
                    reject(d, refusal.rule, refusal.why);
                    const correction = `Alaric's purse did not change: the ${d.cp} cp from ${String(d.from).slice(0, 60)} in the last reply were not booked (${refusal.fix}).`;
                    if (!corrections.includes(correction)) corrections.push(correction);
                    break;
                }
                const coin = s.entities.pc.sheet.coin_cp;
                grant('envelope.give');
                emit({ t: 'coin.changed', d: { id: 'pc', value: coin + d.cp, delta: d.cp, why: `${from ? entityLabel(s, from) : d.from}: ${String(d.why || 'a gift').slice(0, 80)}` } });
                break;
            }
            case 'coerce':
                coerce(d);
                break;
            case 'quest.offer':
                questOffer(d);
                break;
            case 'quest.detail': {
                const q = questRef(d.quest);
                if (!q) { reject(d, 'quest', 'unknown quest'); break; }
                // A Guild contract's note keeps the story, not the engine's state: a clause that states its status,
                // payout, XP or rank is dropped (live run 30.09.2026 22:41: "Contract registered and active; payout
                // 60 cp" while it was still on the board), and a status the contract is not in is corrected. So is a
                // clause that changes the mechanics (another payout, a payment withheld, the fee); the firewall refuses
                // such a note when it keeps no story. A hunt is proven by the trophies of its kills at a Guild hall: a
                // local inspection or signature the story makes a condition is no part of it (live 30.09.2026 14:56:
                // "the steward must inspect and sign before payment"). The rest of the note (route, contacts, what was
                // seen) stays.
                let note = String(d.note);
                if (q.kind === 'guild_contract') {
                    // the one free-text rule of the Decision Ownership (src/v4/ownership.js), with the hunt's sign-off
                    const cut = stripOwned(note, { store: 'note', quest: q, extra: isHunt(q, content) ? (x) => SIGN_OFF.test(x) && REQUIRE.test(x) : null });
                    if (cut.claims.some((c) => wrongClaim(c, q)) && !corrections.includes(statusCorrection(q))) corrections.push(statusCorrection(q));
                    if (cut.other.length) {
                        const correction = `"${q.title}" is a hunt contract: the Guild pays it on the trophies of the kills brought to a Guild hall; no local inspection, witness or signature is required.`;
                        if (!corrections.includes(correction)) corrections.push(correction);
                    }
                    if (!cut.kept.length) { reject(d, cut.other.length || cut.altered.length ? 'guild_quest_detail' : 'engine_owned_detail', 'a Guild contract note keeps the story; its status, payout, XP, rank and (for a hunt) the proof are the engine\'s'); break; }
                    note = cut.kept.join(' ');
                }
                emit({ t: 'quest.detailed', d: { id: q.id, note: note.slice(0, 200), schedule: d.schedule ? String(d.schedule).slice(0, 80) : null } });
                break;
            }
            case 'quest.progress': {
                const q = questRef(d.quest);
                if (!q) { reject(d, 'quest', 'unknown quest'); break; }
                emit({ t: 'quest.progressed', d: { id: q.id, objective: String(d.objective).slice(0, 160), status: d.status } });
                break;
            }
            case 'quest.ready': {
                const q = questRef(d.quest);
                if (!q) { reject(d, 'quest', 'unknown quest'); break; }
                if (q.status !== 'active') { reject(d, 'quest', `the quest is ${q.status}`); break; }
                // the readiness note is story memory too: the contract's status, payout, XP or rank stay the engine's
                const ownNote = q.kind === 'guild_contract' && d.note ? stripOwned(d.note, { store: 'note', quest: q }).kept.join(' ') : d.note;
                const claimed = String(ownNote || q.desired_end_state || '');
                // an escort or delivery is ready where it arrives: a reply whose journey the engine refused has not
                // taken it there (live 30.09.2026: Millbrook refused, the escort "ready" in the same reply). What
                // counts is the story before this claim: a refused journey away with no arrival applied before it.
                // A refused step inside the place he is in (the factor leads him into her wool hall) or a refused move
                // after an applied arrival (review of 4.1.0) does not undo where the engine has him.
                const before = travel.filter((t) => t.seq < (d.seq ?? 0));
                if (before.some((t) => !t.ok && t.away) && !before.some((t) => t.ok) && (q.objectives || []).some((o) => ['ESCORT', 'DELIVER'].includes(o.verb))) {
                    reject(d, 'quest_dependency', 'the escort/delivery destination was not canonically reached in this reply; readiness cannot depend on the refused arrival');
                    const correction = `"${q.title}" is still IN PROGRESS: the destination arrival in the previous reply was not authorized or booked, so the Guild Quest is not ready to turn in yet.`;
                    if (!corrections.includes(correction)) corrections.push(correction);
                    break;
                }
                // a count the engine keeps is not the story's to settle: fewer defeated than the objective names is ready
                // only when the story says how the outcome was reached otherwise (alternative); trophies are no count
                const short = q.kind === 'guild_contract' ? countShort(s, content, q) : [];
                const alternative = String(d.alternative || '').trim();
                if (short.length && !alternative) {
                    reject(d, 'quest_count', `the engine counts ${tallyText(short)} defeated; trophies or a claimed number do not make the count`);
                    const correction = `"${q.title}" is still IN PROGRESS: the engine counts ${tallyText(short)} defeated. It is ready only when the story establishes that the outcome was reached otherwise (the rest driven off for good, the colony broken).`;
                    if (!corrections.includes(correction)) corrections.push(correction);
                    break;
                }
                // the alternative is kept with the contract: the turn-in accepts the short count on it (guild.js contractReady)
                emit({ t: 'quest.ready', d: { id: q.id, note: `${claimed}${short.length ? ` — ${alternative}` : ''}`.slice(0, 220), ...(short.length ? { alternative: alternative.slice(0, 200) } : {}) } });
                break;
            }
            case 'quest.close': {
                const q = questRef(d.quest);
                if (!q) { reject(d, 'quest', 'unknown quest'); break; }
                if (q.status !== 'active' && q.status !== 'offered') { reject(d, 'quest', `the quest is ${q.status}`); break; }
                if (q.kind === 'private' && d.status === 'completed' && q.giver && idOf(d.by) !== q.giver) { reject(d, 'quest', 'private work is closed by its giver'); break; }
                if (d.status === 'failed') grant('world.failed');
                emit({ t: 'quest.status', d: { id: q.id, from: q.status, to: d.status, by: idOf(d.by) || null } });
                break;
            }
            case 'listing.gone': {
                // The same reply in which the player reads an official board is not allowed to
                // retroactively take away its just-published choices. Later world actions may.
                if ((outcome.board?.listings || []).some((id) => id === (typeof d.listing === 'string' ? d.listing : questRef(d.listing)?.id))) {
                    reject(d, 'board_first_display', 'a listing just presented as available cannot vanish retroactively during the same board-reading reply');
                    const title = questRef(d.listing)?.title || String(d.listing?.new || d.listing);
                    const correction = `The newly displayed Guild listing "${title}" remains AVAILABLE. The previous reply's claim that it had just been taken was not booked; only a later established event may remove it.`;
                    if (!corrections.includes(correction)) corrections.push(correction);
                    break;
                }
                const q = questRef(d.listing);
                // Prototype C (4.3.0-c.5): nor the contract the engine takes for him at the hall this reply brings him to
                if (q && (outcome.conditionals || []).some((k) => k.kind === 'accept' && k.quest === q.id)) {
                    reject(d, 'engine_booked', 'the contract he takes on his arrival in this reply is the engine\'s to book');
                    const correction = `Nobody else took the Guild contract "${q.title}" in the last reply: the engine books it for Alaric when he reaches its Guild hall, else it stays on the board.`;
                    if (!corrections.includes(correction)) corrections.push(correction);
                    break;
                }
                if (!q || q.status !== 'listed') { reject(d, 'quest', 'no such listing on the board'); break; }
                grant('world.taken');
                emit({ t: 'quest.status', d: { id: q.id, from: 'listed', to: d.why, by: 'world' } });
                const key = Object.keys(s.guild.boards).find((k) => s.guild.boards[k].listings.includes(q.id));
                if (key) emit({ t: 'board.refreshed', d: { key, ...s.guild.boards[key], listings: s.guild.boards[key].listings.filter((x) => x !== q.id) } });
                break;
            }
            case 'overreach':
                overreach(d.kind, d.what);
                break;
            default:
                reject(d, 'unknown', `the engine has no handler for ${d.type}`);
        }
    }

    // 3. what the extractor answered about the player's commands
    step = { kind: 'expected' };
    for (const [k, type] of Object.entries(outcome.expected_keys || {})) {
        const e = expected[k];
        if (!e) continue;
        if (type === 'go' && e.arrived === true && !arrived && !s.encounter) {
            // the arrival the story showed without an arrive delta: where the answer says, else where he set off to
            const go = (auth.gos || []).find((g) => String(g.seq) === String(k));
            const at = e.at ? resolvePlace(s, e.at, emit) : go?.to ? { id: go.to } : { error: 'no place' };
            if (!at.error && at.id !== s.scene.at) {
                const party = companions(e.with, { seq: Number(k), type: 'expected' });
                perceiveAll(s, emit);
                arrive(at.id, party);
            }
        }
        if (type === 'activity' && !timeUsed && Number.isInteger(e.minutes) && e.minutes > 0) {
            const m = Math.min(e.minutes, Math.max(0, cap - timeUsed));
            if (m > 0) { emit({ t: 'time.advanced', d: { minutes: m, why: 'activity' } }); timeUsed += m; }
        }
        if (type === 'take' && e.taken === true && !events.some((x) => x.t === 'object.created' && x.d.object.holder?.entity === 'pc') && !events.some((x) => x.t === 'object.moved' && x.d.to?.entity === 'pc')) {
            const name = (auth.takeNames || {})[k];
            if (name && !isLooseCoin(name)) emit({ t: 'object.created', d: { object: { id: uniqueObjectId(s, tag, name), name, kind: 'item', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: s.turn, how: 'taken' } } } });
        }
        if ((type === 'buy' || type === 'pay') && e.taken_anyway === true) overreach(type === 'buy' ? 'purchase' : 'payment', `the reply had Alaric ${type === 'buy' ? 'take or use what he had not bought' : 'pay'} although he had not agreed`);
        if ((type === 'buy' || type === 'pay') && e.priced === true) {
            for (const dec of s.decisions.filter((x) => x.seq === Number(k) && x.turn === s.turn && !x.priced)) emit({ t: 'decision.opened', d: { decision: { ...dec, priced: true } } });
        }
        if (type === 'sell') sale(k, e);
    }

    // Prototype C: a real journey to another place takes time; without the story's own minutes a small fixed one
    // (rules.time.engine_clock), never 0. Only the minutes beyond the booked activities count as travel
    if (auth.c && arrived && arrived !== startAt) {
        const t = content.rules.time.engine_clock;
        const floor = sameSettlement(s, startAt, arrived) ? t.go_min_same_settlement : t.go_min_elsewhere;
        const travelled = timeUsed - booked;
        if (travelled < floor) { emit({ t: 'time.advanced', d: { minutes: floor - travelled, why: 'travel' } }); timeUsed += floor - travelled; }
    }

    // 4. what waited for the reply and did not happen
    step = { kind: 'conditional' };
    for (const c of conditionals.filter((x) => !x.done)) emit({ t: 'cmd.expired', d: { seq: c.seq, reason: 'the condition did not happen in this reply' } });

    // 5. who noticed him, his introduction, his own record of the turn, a fight the reply committed to
    step = { kind: 'engine' };
    perceiveAll(s, emit);
    selfIntro(s, emit);
    const ep = episode(s, msg);
    if (ep) emit({ t: 'memory.recorded', d: { memory: ep } });
    const fightFrom = events.length;
    const opened = openCommitted(s, content, dice, emit, { hold: false, c: cPath });
    if (opened) opened.from = fightFrom;
    return { events, rejected, corrections, system, opened, state: s, arrivedHall };

    // ---------------------------------------------------------------------------------------------- step helpers
    function occupation(id, role) {
        setFactEvents(s, { s: id, p: 'occupation', o: String(role).slice(0, 80), source: { kind: 'narration', msg }, importance: 0.5 }).forEach(emit);
    }

    /** The people an arrival brings along (arrive.with, an expected go's with): known, alive, here before the move. */
    function companions(list, d) {
        const out = [];
        for (const ref of Array.isArray(list) ? list : []) {
            const id = idOf(ref);
            const e = id && id !== 'pc' ? s.entities[id] : null;
            if (!e || !['npc', 'creature'].includes(e.kind) || e.status === 'dead') { reject(d, 'world_rule', `arrive.with: unknown person ${String(ref).slice(0, 40)}`); continue; }
            if (!s.scene.present.includes(id)) { reject(d, 'world_rule', `arrive.with: ${id} was not with Alaric`); continue; }
            if (!out.includes(id)) out.push(id);
        }
        return out;
    }

    /**
     * Would an arrival take Alaric away from where he is: out of his settlement, or, outside one, away from his place?
     * A new site or room with no parent, or with a parent here, is a step inside (the story's "she led him into the
     * wool hall"); a new settlement, region or wilderness is always away.
     */
    function leavesHere(ref) {
        const here = settlementOf(s, s.scene.at) || s.scene.at;
        const inside = (id) => typeof id === 'string' && !!s.places[id] && (settlementOf(s, id) || id) === here;
        if (typeof ref === 'string') return !inside(ref);
        const n = ref?.new;
        if (!n || typeof n !== 'object') return true;
        if (!['district', 'site', 'interior'].includes(n.kind)) return true;
        if (n.parent === null || n.parent === undefined) return false;
        return typeof n.parent === 'string' ? !inside(n.parent) : leavesHere(n.parent);
    }

    /**
     * Why coin the story gives Alaric is not his (review of 4.1.0), or null. Coin is hard state; three questions decide:
     * who hands it over, whether he took it himself, whether the engine has booked it already.
     *   - a living person here may give him coin of their own will; the other side of a trade the engine books this
     *     turn does not (a sale's price and a purchase's change are the engine's numbers)
     *   - coin from anywhere else (a dead man's purse, a chest, a counter) he takes: it is his only by his own TAKE the
     *     reply carried out, or a search or gathering, in PLAYER ACTIONS
     *   - and never when it is the coin the engine credited him at this place today (a Guild payout, a sale): the
     *     story counting it out on the counter and him pocketing it is the same coin
     */
    function coinRefusal(d, from) {
        const giver = from ? s.entities[from] : null;
        if (giver?.kind === 'npc' && statusOf(s, from) !== 'dead' && s.scene.present.includes(from)) {
            if (counterparts.has(from) || counterparts.has('*')) return { rule: 'engine_booked', why: 'the other side of a trade the engine booked this turn does not give him coin', fix: 'the engine booked that trade at its price' };
            return null;
        }
        const took = Object.entries(outcome.expected_keys || {}).some(([k, t]) => t === 'take' && expected[k]?.taken === true)
            || (outcome.resolutions || []).some((r) => r.type === 'take' && r.status === 'resolved') || !!auth.gather;
        if (!took) return { rule: 'pc_inventory', why: 'coin nobody here hands him is his only by his own TAKE or search in PLAYER ACTIONS', fix: 'Alaric took no coin himself' };
        if ((s.credits || []).some((c) => c.at === s.scene.at && c.day === today(s))) return { rule: 'engine_booked', why: 'the coin the engine paid him here today is already in his purse', fix: 'that coin is what the engine paid him here, already counted in his purse' };
        return null;
    }

    function arrive(id, party = []) {
        const town = locationOf(s, id);
        const from = s.scene.at;
        // whoever does not come along stays at the place he leaves (entity.at): "the driver" there is that driver again.
        // They are not put back into the scene when he returns: only the story knows whether they are still there (the
        // replay of 30.09.2026 would have had Aldsa waiting at the ford while she was in Millbrook); it brings them in.
        for (const who of s.scene.present) {
            const e = s.entities[who];
            if (who === 'pc' || party.includes(who) || e?.kind !== 'npc' || e.status === 'dead' || e.at === from) continue;
            emit({ t: 'entity.updated', d: { id: who, set: { at: from } } });
        }
        emit({ t: 'scene.moved', d: { at: id, location: town, place: placeName(s, id), reset_present: true } });
        // who travelled with him arrives with him
        for (const who of party) emit({ t: 'scene.entered', d: { id: who, band: 'SHORT' } });
        arrived = id;
        // he set off on a quest's journey (a GO while its people were with him) and has left the settlement: it has begun
        const trip = auth.journey && s.quests[auth.journey];
        if (trip?.status === 'active' && !trip.journey && settlementOf(s, from) !== settlementOf(s, id)) emit({ t: 'quest.journey', d: { id: trip.id, at: from } });
        // a decision belongs to the place it was opened at: leaving it closes it; one opened in this very turn goes
        // with him ("look for an inn to sleep": the room is bought where he arrives)
        for (const dec of s.decisions.filter((x) => x.at && x.at !== id && x.kind !== 'registration')) {
            if (dec.turn === s.turn) emit({ t: 'decision.opened', d: { decision: { ...dec, at: id } } });
            else emit({ t: 'decision.closed', d: { id: dec.id, status: 'expired' } });
        }
        const hall = hallOf(s, id);
        if (hall) {
            arrivedHall = hall;
            for (const k of conditionals.filter((x) => !x.done && x.condition === 'arrive_guild_hall')) {
                // Prototype C (4.3.0-c.5): a contract taken or a board read at its own hall waits for that hall
                if ((k.kind === 'accept' || k.kind === 'board') && k.hall !== hall) continue;
                k.done = true;
                grant('conditional');
                const q = s.quests[k.quest];
                if (k.kind === 'accept') {
                    const ok = q?.status === 'listed';
                    if (ok) acceptContract(s, content, q, emit, { step: k.seq });
                    emit({ t: 'cmd.completed', d: { seq: k.seq, ok, reason: ok ? null : 'the contract is no longer on the board' } });
                    if (!ok) {
                        system.push(`NOT ACCEPTED — ${q?.title || k.quest}: it is no longer on the board`);
                        corrections.push(`"${q?.title || k.quest}" was not taken: it is no longer on the board; he holds no slip for it.`);
                    }
                    continue;
                }
                if (k.kind === 'board') {
                    emit({ t: 'board.shown', d: { branch: k.branch, rank: k.rank, listings: k.listings } });
                    emit({ t: 'cmd.completed', d: { seq: k.seq, ok: true, reason: null } });
                    continue;
                }
                if (k.kind === 'abandon') {
                    // Prototype C: the contract he gives up at the desk; its slip goes back, nothing is paid
                    const ok = q?.status === 'active';
                    if (ok) abandonContract(s, q, emit, { step: k.seq, desk: true });
                    emit({ t: 'cmd.completed', d: { seq: k.seq, ok, reason: ok ? null : 'the contract is no longer active' } });
                    continue;
                }
                const r = q && q.status === 'active' ? completeContract(s, content, q, emit, { step: k.seq }) : { ok: false, reason: 'the contract is no longer active' };
                emit({ t: 'cmd.completed', d: { seq: k.seq, ok: r.ok, reason: r.reason ?? null } });
                if (!r.ok) system.push(`TURN-IN REFUSED — ${q?.title || k.quest}: ${r.reason}`);
            }
        }
    }

    function objectRef(ref) {
        if (typeof ref === 'string') return s.objects[ref] || null;
        if (ref && typeof ref.new === 'string') {
            const id = objectsNew.get(normText(ref.new));
            if (id) return s.objects[id];
            const here = Object.values(s.objects).filter((o) => normText(o.name) === normText(ref.new) && (o.holder?.loc === s.scene.at || s.scene.present.includes(o.holder?.entity)));
            return here.length === 1 ? here[0] : null;
        }
        return null;
    }

    function holderOf(h) {
        const t = String(h ?? '').trim();
        if (!t || normText(t) === 'here') return { loc: s.scene.at };
        if (s.places[t]) return { loc: t };
        const id = idOf(t);
        if (id === 'pc') return { entity: 'pc' };
        if (id && s.entities[id]) return { entity: id };
        return null;
    }

    function objectNew(d) {
        const holder = holderOf(d.holder);
        if (!holder) { reject(d, 'object', `unknown holder ${String(d.holder).slice(0, 40)}`); return; }
        const q = d.for_quest ? questRef(d.for_quest) : null;
        const id = uniqueObjectId(s, tag, d.name);
        if (holder.entity === 'pc' && ((auth.take || []).length || auth.gather)) grant('player.take');
        emit({ t: 'object.created', d: { object: { id, name: String(d.name).slice(0, 80), kind: d.kind, stack: d.kind === 'resource', qty: d.qty ?? 1, unit: d.unit || null, holder, marks: [], for_quests: q ? [q.id] : [], source: { turn: s.turn, how: holder.entity === 'pc' ? (((auth.take || []).length || auth.gather) ? 'taken' : 'world_gift') : 'story' } } } });
        objectsNew.set(normText(d.name), id);
    }

    function objectMove(d) {
        const o = objectRef(d.object);
        if (!o) { reject(d, 'object', 'unknown object'); return; }
        const to = holderOf(d.to);
        if (!to) { reject(d, 'object', `unknown receiver ${String(d.to).slice(0, 40)}`); return; }
        if (to.entity === 'pc' && o.holder?.loc && !(auth.take || []).length) { reject(d, 'pc_inventory', 'what lies here becomes his only by his own take'); return; }
        const part = d.qty && d.qty < (o.qty ?? 1) ? d.qty : null;
        // to him: from where it lies, by his own take; from someone's hands, their gift (the firewall's rules)
        if (to.entity === 'pc') grant(o.holder?.loc ? 'player.take' : 'envelope.give');
        emit({ t: 'object.moved', d: { id: o.id, to, ...(part ? { qty: part, split: `${o.id}_${tag}` } : {}) } });
    }

    function offer(d) {
        const seller = idOf(d.seller);
        if (!seller || seller === 'pc' || !s.scene.present.includes(seller)) { reject(d, 'offer', `the seller ${String(d.seller).slice(0, 40)} is not present`); return; }
        const id = `offer.t${tag}.${Object.keys(s.offers).length + 1}`;
        emit({ t: 'offer.created', d: { offer: { id, seller, at: s.scene.at, status: 'open', canon: false, turn: s.turn, lines: d.lines.map((l, i) => ({ id: `l${i + 1}`, ...l })) } } });
        // a purchase Alaric agreed to in advance, within his limit (buy with max_cp or any_price), in the number he named
        for (const dec of s.decisions.filter((x) => x.kind === 'purchase' && (x.max_cp !== null || x.any_price) && x.at === s.scene.at && (!x.seller || x.seller === seller))) {
            const o = s.offers[id];
            const lines = o.lines.filter((l) => sameWant(dec.what, l.what));
            if (!lines.length) continue;
            const pick = pickLines(o, lines.map((l) => l.id), dec.qty ?? null);
            if (pick.clarify || pick.error) { system.push(`NOT BOUGHT — ${pick.error || `which of ${pick.clarify.join(' or ')} he wants ${dec.qty} of is open`}`); continue; }
            const price = pick.cp;
            const what = pick.picks.map((p) => unitsText(p.line.what, p.units)).join(', ');
            const coin = s.entities.pc.sheet.coin_cp;
            if (!dec.any_price && price > dec.max_cp) { system.push(`NOT BOUGHT — ${what}: ${price} cp is above his limit of ${dec.max_cp} cp`); emit({ t: 'decision.closed', d: { id: dec.id, status: 'too_expensive' } }); continue; }
            if (coin < price) { system.push(`NOT BOUGHT — ${price} cp needed, he has ${coin} cp`); emit({ t: 'decision.closed', d: { id: dec.id, status: 'no_coin' } }); continue; }
            grant('player.buy');
            bookPurchase(s, emit, { offer: o, picks: pick.picks, cp: price, objectId: (name) => uniqueObjectId(s, tag, name) });
            counterparts.add(seller);
            emit({ t: 'offer.closed', d: { id, status: 'accepted' } });
            emit({ t: 'decision.closed', d: { id: dec.id, status: 'accepted' } });
            emit({ t: 'cmd.completed', d: { seq: dec.seq, ok: true } });
        }
    }

    function coerce(d) {
        const by = idOf(d.by);
        if (!by || by === 'pc' || !s.scene.present.includes(by)) { reject(d, 'coerce', 'the one who takes it is not here'); return; }
        const counterpart = openOffers(s).some((o) => o.seller === by) || events.some((e) => e.t === 'transaction.completed' && e.d.seller === by);
        if (counterpart) { reject(d, 'coerce', 'the other side of a sale or an open offer cannot coerce (a sale is never a confiscation)'); return; }
        if (!d.because) { reject(d, 'coerce', 'coercion needs a because'); return; }
        // taking Alaric's coin or things is the engine's (money is hard state): who may take what is the World Envelope's
        // (src/v4/envelope.js): a fine or confiscation needs an authority, a robbery a hostile robber (or a fight)
        const may = mayTake(s, by, d.kind);
        if (!may.ok) { reject(d, 'coerce', may.why); return; }
        grant('envelope.take');
        const sheet = s.entities.pc.sheet;
        if (d.coin_cp) {
            const cp = Math.min(d.coin_cp, sheet.coin_cp);
            if (cp > 0) emit({ t: 'coin.changed', d: { id: 'pc', value: sheet.coin_cp - cp, delta: -cp, why: `${d.kind} by ${entityLabel(s, by)}: ${String(d.because).slice(0, 80)}` } });
        }
        if (d.object) {
            const o = objectRef(d.object) || heldBy(s, 'pc').find((x) => normText(x.name).includes(normText(d.object)));
            if (o && o.holder?.entity === 'pc') emit({ t: 'object.moved', d: { id: o.id, to: { entity: by } } });
        }
        system.push(`${d.kind.toUpperCase()} — ${entityLabel(s, by)}: ${String(d.because).slice(0, 120)}`);
    }

    function questRef(ref) {
        if (typeof ref === 'string') return s.quests[ref] || null;
        if (ref && typeof ref.new === 'string') return Object.values(s.quests).find((q) => normText(q.title) === normText(ref.new)) || null;
        return null;
    }

    function questOffer(d) {
        const giver = idOf(d.giver);
        let id = `quest.${slug(d.title) || 'job'}`;
        for (let k = 2; s.quests[id]; k++) id = `quest.${slug(d.title)}_${k}`;
        emit({ t: 'quest.created', d: { quest: {
            id, title: String(d.title).slice(0, 80), kind: 'private', giver: giver && giver !== 'pc' ? giver : null, client: null, rank: null,
            payout_cp: d.reward_cp ?? null, reward: d.reward_cp !== null && d.reward_cp !== undefined ? `${d.reward_cp} cp` : null,
            objectives: (d.objectives || []).map((o, i) => ({ id: `o${i + 1}`, what: String(o).slice(0, 160), status: 'open' })),
            proof: (d.proof || []).map((p, i) => ({ id: `p${i + 1}`, kind: 'note', what: String(p).slice(0, 120) })),
            status: 'offered', taker: null, history: [{ turn: s.turn, minute: s.clock.minute, status: 'offered' }], details: [], notes: [], schedule: { starts_at: null, deadline: null },
            source: { giver: giver || null, turn: s.turn },
        } } });
    }

    function overreach(kind, what) {
        emit({ t: 'overreach.noted', d: { kind, what: String(what).slice(0, 160) } });
        system.push(`NOT APPLIED — ${String(what).slice(0, 160)} (Alaric had not decided that)`);
        const c = kind === 'guild_listing'
            ? 'Official Guild contracts come only from the board the engine shows; the contract the last reply showed does not exist.'
            : `Your last reply had Alaric decide something he had not decided (${String(what).slice(0, 120)}); it did not happen. Alaric decides only what PLAYER ACTIONS list.`;
        if (!corrections.includes(c)) corrections.push(c);
    }

    function sale(k, e) {
        const dec = s.decisions.find((x) => x.kind === 'sale' && String(x.seq) === String(k) && x.turn === s.turn);
        if (!dec) return;
        if (e.sold !== true) return;
        const price = Number.isInteger(e.price_cp) ? e.price_cp : null;
        if (dec.min_cp === null || dec.min_cp === undefined || price === null || price < dec.min_cp) {
            overreach('other', `the reply sold ${dec.what}${price !== null ? ` for ${price} cp` : ''} although Alaric had not agreed to that price`);
            return;
        }
        const buyer = dec.seller || null;
        // exactly the units he offered, as far as they are still his at this step; the rest of a stack stays his
        const n = saleUnits(s, dec.object, dec.qty ?? null);
        if (n.error) {
            system.push(`NOT SOLD — ${dec.what}: ${n.error}`);
            emit({ t: 'decision.closed', d: { id: dec.id, status: 'not_held' } });
            return;
        }
        bookSale(s, emit, { ref: dec.object, units: n.units, buyer, cp: price, what: unitsText(dec.what, n.units), splitId: `${dec.object}_${tag}` });
        emit({ t: 'decision.closed', d: { id: dec.id, status: 'sold' } });
        emit({ t: 'cmd.completed', d: { seq: dec.seq, ok: true } });
    }
}

const FILLER = new Set(['the', 'and', 'for', 'with', 'some', 'any', 'one', 'his', 'her', 'its', 'our', 'your', 'this', 'that', 'what', 'from', 'into']);
/** The words that name a want or an offer's line ("a bed for the night" ~ "bed in the Guild dormitory"). */
export const keyWords = (t) => normText(t).split(/[^a-z0-9]+/).map((w) => w.replace(/s$/, '')).filter((w) => w.length >= 3 && !FILLER.has(w));
export const sameWant = (want, what) => { const k = keyWords(what); return keyWords(want).some((w) => k.includes(w)); };

function uniqueEntityId(s, base) {
    let id = `npc.${slug(base) || 'unnamed'}`;
    for (let n = 2; s.entities[id]; n++) id = `npc.${slug(base) || 'unnamed'}_${n}`;
    return id;
}

/** "obj.t<reply index>.<name>" (the P0/S3 ids: obj.t16.marshmint), unique. */
function uniqueObjectId(s, tag, name) {
    let id = `obj.t${tag}.${slug(name) || 'thing'}`;
    for (let n = 2; s.objects[id]; n++) id = `obj.t${tag}.${slug(name)}_${n}`;
    return id;
}

/** A missing extractor answer: nothing of the reply was recorded (plan §3.4); the audit and the next block say so. */
export function extractionFailedEvents(error, ms = null) {
    return [{ t: 'extract.failed', d: { error: String(error || 'unknown').slice(0, 200), ms } }];
}

export { HALL_NAME, REGISTRATION_OFFER, membership, deriveCharacter };
