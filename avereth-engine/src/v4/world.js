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
import { truth, entityLabel, setFactEvents } from '../knowledge.js';
import { perceiveAll, selfIntro, episode, openCommitted, materialise } from '../engine.js';
import { firewall } from './firewall.js';
import {
    PLACE_PARENTS, HALL_NAME, hallOf, settlementOf, placeName, contracts, heldBy, openOffers, membership, isLooseCoin,
} from './domain.js';
import { completeContract, REGISTRATION_OFFER } from './guild.js';

const AUTHORITY_ROLE = /\b(?:guard|watch(?:man)?|sergeant|captain|constable|reeve|bailiff|magistrate|official|officer|toll ?keeper|tax|customs|steward|marshal|warden)\b/i;
const HOSTILE_ROLE = /\b(?:bandit|thief|robber|brigand|cutpurse|pickpocket|thug|highwayman)\b/i;

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
    if (/\bguild\b/i.test(n.name) && /\b(?:hall|house|office|lodge)\b/i.test(n.name)) {
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
    const emit = (e) => {
        if (dice.n !== s.rng.n) e.rng_to = dice.n;
        applyEvent(s, e);
        events.push(e);
    };
    const rejected = [];
    let rejectedTravel = false;
    const corrections = [];
    const system = [];
    const reject = (d, rule, why) => {
        if (d?.type === 'arrive') rejectedTravel = true;
        rejected.push({ seq: d?.seq ?? 0, type: d?.type ?? 'expected', rule, why });
        emit({ t: 'delta.rejected', d: { item: d, rule, reason: why } });
    };
    const outcome = s.last?.outcome || {};
    const auth = outcome.auth || {};
    const expected = answer.expected || {};
    const tag = msg !== null && msg !== undefined ? msg : s.turn;

    // 1. authority first: what the story may not decide is never applied
    const fw = firewall(answer.deltas, firewallContext(s, content));
    for (const x of fw.reject) reject(x.delta, x.rule, x.why);
    corrections.push(...fw.corrections);

    // 2. world deltas in story order, each against the state at its step
    const refs = new Map(); // a delta's ref -> the entity it names (person.new, creature.new of this answer)
    const groups = new Map(); // a creature.new ref with count > 1 -> its individual ids
    const objectsNew = new Map(); // name -> object id, for object.move {new: name} of this answer
    const hostileRefs = new Set(fw.accept.filter((d) => d.type === 'hostile').flatMap((d) => d.by || []).map((x) => normText(x)));
    const joinedByNew = new Set();
    const cap = s.encounter ? content.rules.time.combat_cap_min : auth.timeCap ?? content.rules.time.default_cap_min;
    let timeUsed = 0;
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
        // "the same clerk", "the clerk": the one person here (or met at this place) whose role ends in that word
        const last = k.replace(/^(?:the |a |an )?(?:same |other |first |second )?/, '').split(' ').at(-1);
        if (!last || last.length < 3) return null;
        const local = Object.values(s.entities).filter((e) => e.kind === 'npc' && e.status !== 'dead' && (s.scene.present.includes(e.id) || (e.location === s.scene.location && (!e.at || e.at === s.scene.at)))
            && [...(e.descriptors || []), truth(s, e.id, 'occupation')[0]?.o].filter(Boolean).some((x) => normText(x).split(' ').at(-1) === last));
        return local.length === 1 ? local[0].id : null;
    };
    const mapRef = (ref) => (typeof ref === 'string' ? idOf(ref) || ref : ref);
    let calls = 0;
    const v3 = (report, d) => {
        calls += 1;
        const r = reportToEvents(report, s, content, { msg, prose, idTag: `d${d?.seq ?? 0}${calls > 1 ? `_${calls}` : ''}` });
        r.events.forEach(emit);
        for (const x of r.rejected) reject(d, 'world_rule', x.reason);
        return r;
    };
    // the creature a group is (its species, its body-plan's names) among the targets of an active ATTACK/DEFEAT objective
    const singular = (text) => new Set(normText(text).split(/[^a-z]+/).filter(Boolean).map((w) => w.replace(/s$/, '')));
    const hunted = (d, anchor) => {
        const targets = Object.values(s.quests).filter((q) => q.status === 'active')
            .flatMap((q) => (q.objectives || []).filter((o) => o.verb === 'ATTACK' || o.verb === 'DEFEAT')).map((o) => singular(o.what));
        const names = [d.species, ...(anchor.aliases || [])].filter(Boolean).map((n) => [...singular(n)]).filter((w) => w.length);
        return targets.some((t) => names.some((w) => w.every((x) => t.has(x))));
    };
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
        const r = v3({ new: entries, ...(joins ? { combat: entries.map((e) => ({ by: e.ref })) } : {}) }, d);
        if (joins) joinedByNew.add(normText(d.ref));
        const created = r.events.filter((e) => e.t === 'entity.created').map((e) => e.d.entity.id).filter((id) => !before.has(id));
        const known = r.accepted.map((a) => /^known (\S+) \(not duplicated\)$/.exec(a)?.[1]).filter(Boolean);
        const ids = [...created, ...known];
        if (ids.length) refs.set(normText(d.ref), ids[0]);
        if (d.name && ids.length) refs.set(normText(d.name), ids[0]);
        if (count > 1) groups.set(normText(d.ref), ids);
        // who the person is shows on their card (occupation), as text: the V3 fact rule would read "Guild clerk" as a
        // reference to the clerk himself
        if (kind === 'npc' && d.role && created.length && !truth(s, created[0], 'occupation').length) occupation(created[0], d.role);
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
            }
        }
    }

    for (const d of [...fw.accept].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))) {
        // Authority is checked again at the actual story step: earlier deltas may have changed its context.
        const stepFw = firewall([d], firewallContext(s, content));
        if (!stepFw.accept.length) {
            for (const x of stepFw.reject) reject(x.delta, x.rule, x.why);
            for (const x of stepFw.corrections) if (!corrections.includes(x)) corrections.push(x);
            continue;
        }
        switch (d.type) {
            case 'time': {
                const room = Math.max(0, cap - timeUsed);
                const m = Math.min(d.minutes, room);
                if (m < d.minutes) reject(d, 'time_cap', `${d.minutes} min exceed what this turn allows (${cap} min${auth.go ? '' : ' without travel or an activity'}); ${m} applied`);
                if (m > 0) { emit({ t: 'time.advanced', d: { minutes: m, why: 'narration' } }); timeUsed += m; }
                break;
            }
            case 'arrive': {
                if (s.encounter) { reject(d, 'combat', 'no travel while combat is ACTIVE'); break; }
                const at = resolvePlace(s, d.at, emit);
                if (at.error) { reject(d, 'place', at.error); break; }
                if (at.id === s.scene.at) break;
                const party = companions(d.with, d);
                perceiveAll(s, emit);
                arrive(at.id, party);
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
            case 'intent':
                v3({ intent: [{ who: mapRef(d.who), intent: d.intent }] }, d);
                break;
            case 'hostile': {
                const by = (d.by || []).flatMap((x) => (groups.get(normText(x)) || [mapRef(x)])).filter((x) => !joinedByNew.has(normText(x)));
                const left = by.filter((x) => !(typeof x === 'string' && s.encounter?.combatants?.[x]));
                if (left.length) v3({ combat: left.map((x) => ({ by: x })) }, d);
                break;
            }
            case 'fact':
                v3({ facts: [{ s: mapRef(d.s), p: d.p, o: mapRef(d.o) }] }, d);
                break;
            case 'learn':
                // who/s are references; o is the literal proposition value. Resolving "Alaric Red" as an entity
                // turned the name into "pc" in the 28.09. live run.
                v3({ learn: [{ who: mapRef(d.who), s: mapRef(d.s), p: d.p, o: typeof d.o === 'string' ? d.o : String(d.o), how: d.how }] }, d);
                break;
            case 'attitude':
                v3({ attitude: [{ who: mapRef(d.who), delta: d.delta, why: d.why }] }, d);
                break;
            case 'memory':
                v3({ memory: [{ text: d.text, who: (d.who || []).map(mapRef), imp: d.imp }] }, d);
                break;
            case 'thread':
                v3({ threads: [{ text: d.text, kind: d.kind, status: d.status }] }, d);
                break;
            case 'recover': {
                const who = idOf(d.who) || 'pc';
                const serviced = (s.services || []).some((x) => x.turn === s.turn && ['lodging', 'healing', 'meal'].includes(x.service));
                if (who === 'pc' && !auth.rest && !serviced) { reject(d, 'recover', 'Alaric recovers only while resting or sleeping, or with lodging or healing he paid for'); break; }
                const amounts = {};
                if (d.hp) amounts.hp = d.hp;
                if (d.sta) amounts.sta = d.sta;
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
                const coin = s.entities.pc.sheet.coin_cp;
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
                emit({ t: 'quest.detailed', d: { id: q.id, note: String(d.note).slice(0, 200), schedule: d.schedule ? String(d.schedule).slice(0, 80) : null } });
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
                const claimed = String(d.note || q.desired_end_state || '');
                // an escort or delivery is ready where it arrives: a reply whose arrival the engine refused has not
                // taken it there (live 30.09.2026: Millbrook refused, the escort "ready" in the same reply)
                if (rejectedTravel && (q.objectives || []).some((o) => ['ESCORT', 'DELIVER'].includes(o.verb))) {
                    reject(d, 'quest_dependency', 'the escort/delivery destination was not canonically reached in this reply; readiness cannot depend on the refused arrival');
                    const correction = `"${q.title}" is still IN PROGRESS: the destination arrival in the previous reply was not authorized or booked, so the Guild Quest is not ready to turn in yet.`;
                    if (!corrections.includes(correction)) corrections.push(correction);
                    break;
                }
                emit({ t: 'quest.ready', d: { id: q.id, note: claimed.slice(0, 220) } });
                break;
            }
            case 'quest.close': {
                const q = questRef(d.quest);
                if (!q) { reject(d, 'quest', 'unknown quest'); break; }
                if (q.status !== 'active' && q.status !== 'offered') { reject(d, 'quest', `the quest is ${q.status}`); break; }
                if (q.kind === 'private' && d.status === 'completed' && q.giver && idOf(d.by) !== q.giver) { reject(d, 'quest', 'private work is closed by its giver'); break; }
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
                if (!q || q.status !== 'listed') { reject(d, 'quest', 'no such listing on the board'); break; }
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

    // 4. what waited for the reply and did not happen
    for (const c of conditionals.filter((x) => !x.done)) emit({ t: 'cmd.expired', d: { seq: c.seq, reason: 'the condition did not happen in this reply' } });

    // 5. who noticed him, his introduction, his own record of the turn, a fight the reply committed to
    perceiveAll(s, emit);
    selfIntro(s, emit);
    const ep = episode(s, msg);
    if (ep) emit({ t: 'memory.recorded', d: { memory: ep } });
    const fightFrom = events.length;
    const opened = openCommitted(s, content, dice, emit, { hold: false });
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
                k.done = true;
                const q = s.quests[k.quest];
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
        emit({ t: 'object.moved', d: { id: o.id, to, ...(part ? { qty: part, split: `${o.id}_${tag}` } : {}) } });
    }

    function offer(d) {
        const seller = idOf(d.seller);
        if (!seller || seller === 'pc' || !s.scene.present.includes(seller)) { reject(d, 'offer', `the seller ${String(d.seller).slice(0, 40)} is not present`); return; }
        const id = `offer.t${tag}.${Object.keys(s.offers).length + 1}`;
        emit({ t: 'offer.created', d: { offer: { id, seller, at: s.scene.at, status: 'open', canon: false, turn: s.turn, lines: d.lines.map((l, i) => ({ id: `l${i + 1}`, ...l })) } } });
        // a purchase Alaric agreed to in advance, within his limit (buy with max_cp or any_price)
        for (const dec of s.decisions.filter((x) => x.kind === 'purchase' && (x.max_cp !== null || x.any_price) && x.at === s.scene.at && (!x.seller || x.seller === seller))) {
            const lines = d.lines.map((l, i) => ({ id: `l${i + 1}`, ...l })).filter((l) => sameWant(dec.what, l.what));
            if (!lines.length) continue;
            const price = lines.reduce((n, l) => n + l.price_cp * (l.qty || 1), 0);
            const coin = s.entities.pc.sheet.coin_cp;
            if (!dec.any_price && price > dec.max_cp) { system.push(`NOT BOUGHT — ${lines.map((l) => l.what).join(', ')}: ${price} cp is above his limit of ${dec.max_cp} cp`); emit({ t: 'decision.closed', d: { id: dec.id, status: 'too_expensive' } }); continue; }
            if (coin < price) { system.push(`NOT BOUGHT — ${price} cp needed, he has ${coin} cp`); emit({ t: 'decision.closed', d: { id: dec.id, status: 'no_coin' } }); continue; }
            emit({ t: 'transaction.completed', d: { offer: id, lines: lines.map((l) => l.id), cp: price, seller } });
            emit({ t: 'coin.changed', d: { id: 'pc', value: coin - price, delta: -price, why: lines.map((l) => l.what).join(', ') } });
            for (const l of lines.filter((x) => x.kind === 'goods')) emit({ t: 'object.created', d: { object: { id: uniqueObjectId(s, tag, l.what), name: l.what, kind: 'item', stack: (l.qty || 1) > 1, qty: l.qty || 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: s.turn, how: 'bought', from: seller } } } });
            for (const l of lines.filter((x) => x.kind === 'service')) emit({ t: 'service.granted', d: { service: l.service || 'other', what: l.what, by: seller, at: s.scene.at, turn: s.turn } });
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
        // taking Alaric's coin or things is the engine's (money is hard state): a fine or confiscation needs an authority,
        // a robbery a hostile robber (or a fight); who may take what is not left to the story
        const e = s.entities[by];
        const role = [truth(s, by, 'occupation')[0]?.o, ...(e?.descriptors || []), e?.traits, e?.template].filter(Boolean).join(' ');
        if ((d.kind === 'confiscation' || d.kind === 'fine') && !AUTHORITY_ROLE.test(role)) { reject(d, 'coerce', `${d.kind} needs an authority (a guard, an official)`); return; }
        if (d.kind === 'robbery' && !(HOSTILE_ROLE.test(role) || s.pending_combat?.some((p) => p.by === by) || s.encounter)) { reject(d, 'coerce', 'a robbery needs a hostile robber'); return; }
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
        const o = s.objects[dec.object];
        if (o?.holder?.entity === 'pc') emit({ t: 'object.moved', d: { id: o.id, to: buyer ? { entity: buyer } : { loc: s.scene.at } } });
        else if (dec.object?.startsWith('item.')) emit({ t: 'item.changed', d: { id: 'pc', item: dec.object.slice(5), qty: -(dec.qty || 1), why: 'sold' } });
        emit({ t: 'coin.changed', d: { id: 'pc', value: s.entities.pc.sheet.coin_cp + price, delta: price, why: `sold ${dec.what}` } });
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