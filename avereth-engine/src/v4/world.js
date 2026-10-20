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
import { coinFromWords, coinMentions, numbersIn } from '../economy.js';
import { deriveCharacter } from '../derived.js';
import { reportToEvents, makeResolver, isGroup, GROUP_WORDS } from '../delta.js';
import { sceneHandle } from './scene_handles.js';
import { truth, entityLabel, setFactEvents, statusOf, normPredicate } from '../knowledge.js';
import { perceiveAll, selfIntro, episode, openCommitted, materialise } from '../engine.js';
import { firewall, pcWound, pcActIn } from './firewall.js';
import { stripOwned, wrongClaim, ownershipViolation, stateRegions, effectViolation } from './ownership.js';
import { mayOpenFight, mayTake } from './envelope.js';
import {
    PLACE_PARENTS, HALL_NAME, hallOf, settlementOf, sameSettlement, placeName, contracts, heldBy, openOffers, membership, isLooseCoin, today, namesKind, SERVICE_ROLE,
    progressKey, sameKinds, kindOf,
} from './domain.js';
import { completeContract, contractReady, owedObjects, abandonContract, acceptContract, REGISTRATION_OFFER, countShort, tallyText, isHunt, statusCorrection, slipMarks } from './guild.js';
import { pickLines, bookPurchase, bookSale, saleUnits, unitsText } from './trade.js';
import { reportPlace, knownByName, reportedTarget, visitEvents } from './known.js';
import { reachedEvents, setIntentEvents } from './intents.js';
import { featureNamed, featureEvent, applySpring } from './features.js';
import { complexOf, dungeonOf, linkBetween, linksAt, wayBetween, roomByName, markEvents, newLink, linkEvent, levelVia, blockerOf, visited } from './dungeon.js';
import { itemTraits, useOf } from './items.js';

// Decision Ownership as an assertion (tests/helpers.js switches it on for the whole suite): every event of an extractor
// delta must be a kind its type may write (src/v4/ownership.js DELTA_WRITES); off in the product
// the predicates of a fight's moment (selective persistence: they end with the fight) and the words of a lasting mark
const FIGHT_MOMENT = /^(?:behaviou?r|demeanou?r|position|posture|stance|gait|movement|motion|action|activity|last_attack|attack(?:ing)?|tactics?|mood|focus|wounded|bleeding|breathing|stamina|fatigue)$/;
// Patch 3: the commands that make one of Alaric's own acts (a fact "pc ate …" after his own use is no news, no overreach)
const ACT_COMMANDS = {
    '^(?:ate|eat|drank|drink|drunk|consum|used)': ['use'],
    '^(?:bought|buy|purchas|spent|paid)': ['buy', 'offer.accept', 'pay'],
    '^(?:sold|sell|traded|trade)': ['sell', 'offer.accept'],
    '^(?:dropped|drop|discard|left|abandon)': ['drop'],
    '^(?:gave|give)': ['give'],
    '^(?:hunt|caught|catch|gather|forag|picked|loot|butcher|skinn|cook|roast|craft|kill|slew)': ['activity', 'take', 'use'],
};
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
        // Patch 3: the engine's mechanical state the story may not overwrite (src/v4/firewall.js)
        lifeOf: (ref) => {
            const id = s.entities[ref] ? ref : names.get(normText(ref));
            const e = id && id !== 'pc' ? s.entities[id] : null;
            return e && (e.profile || s.encounter?.combatants?.[id]) ? (e.status === 'dead' ? 'dead' : 'alive') : null;
        },
        labelOf: (ref) => (s.entities[ref] ? entityLabel(s, ref) : null),
        pcHurt: (s.entities.pc?.sheet?.hp ?? 0) < deriveCharacter(s.entities.pc.sheet, content).maxHp,
        actedOn: (p) => {
            const done = new Set((o.resolutions || []).filter((r) => !['refused', 'clarify'].includes(r.status)).map((r) => r.type));
            return Object.entries(ACT_COMMANDS).some(([re, types]) => new RegExp(re).test(p) && types.some((t) => done.has(t)));
        },
        isGuildPerson: (ref) => guildish(ref) || guildish(names.get(normText(ref))),
        inGuildHall: !!hallOf(s, s.scene.at),
        contracts: contracts(s).map((q) => ({ id: q.id, title: q.title, payout_cp: q.payout_cp ?? null, client: q.client || null, status: q.status })),
        booked: o.booked || { registration: false, grants: [], turnIns: [], accepted: [] },
        auth: { go: !!(auth.gos || []).length || !!auth.go, roam: !!auth.roam, take: !!(auth.take || []).length, gather: !!auth.gather, forced: false },
        heldByPc: (ref) => s.objects?.[ref]?.holder?.entity === 'pc' || (typeof ref === 'string' && ref.startsWith('item.') && !!s.entities.pc.sheet.inventory[ref.slice(5)]),
        // Prototype C (4.3.0-c.6.6.4): lodging he paid for at this very place in the last day, and a room inside it
        lodgedHere: (s.services || []).some((x) => x.service === 'lodging' && x.at === s.scene.at && s.clock.minute - (x.minute ?? 0) <= 24 * 60),
        roomOfHere: (ref) => {
            const n = ref && typeof ref === 'object' ? ref.new : null;
            if (n && typeof n === 'object') return n.parent === s.scene.at && (!n.kind || ['interior', 'room', 'site'].includes(n.kind));
            return typeof ref === 'string' && s.places[ref]?.parent === s.scene.at;
        },
        // Prototype C (4.3.0-c.6.6.3): what he set out to hand over where he went in this turn (commands.js give)
        handingOver: (ref) => (o.conditionals || []).some((k) => k.kind === 'give' && (k.object === ref || normText(s.objects?.[k.object]?.name || '') === normText(ref))),
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
function resolvePlace(s, ref, emit, depth = 0, { c = false, reported = false } = {}) {
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
    const parent = n.parent === null || n.parent === undefined ? { id: s.scene.at } : resolvePlace(s, n.parent, emit, depth + 1, { c, reported });
    if (parent.error) return parent;
    let pid = parent.id;
    // a kind that cannot lie in its parent climbs to the first ancestor where it can (a hamlet named inside a site of
    // the town lies in the realm or region, not in the site). Prototype C (4.3.0-c.6): the wild has insides too, a den,
    // a cave, a chamber (live 04.10.2026 16:35: "Boar den chamber" refused in the Root-Hollow)
    // (4.3.0-c.6.6) and a site out in the open (a waystation on the road, a ford) lies in the realm itself
    const parents = [...(PLACE_PARENTS[n.kind] || []), ...(c && n.kind === 'interior' ? ['wilderness'] : []), ...(c && n.kind === 'site' ? ['realm'] : [])];
    for (let i = 0; i < 6 && pid && !parents.includes(s.places[pid]?.kind); i++) pid = s.places[pid]?.parent;
    if (!pid) return { error: `a ${n.kind} cannot lie in ${placeName(s, parent.id)}` };
    // Patch 7: a room of a dungeon lies in the dungeon, not in the room he stood in when the story named it, and is
    // known there by its name (and level): the same name in another dungeon is another room; two rooms of that name
    // and nothing to tell them apart is a question, never a pick (src/v4/dungeon.js)
    const dun = ['interior', 'site'].includes(n.kind) ? dungeonOf(s, pid) : null;
    if (dun) {
        if (n.parent === null || n.parent === undefined) pid = dun;
        const room = roomByName(s, dun, n, s.scene.at);
        if (room?.ambiguous) return { error: `more than one room "${String(n.name).slice(0, 60)}" in ${s.places[dun].name}: name it by its id` };
        if (room) return { id: room.id };
    }
    // (in a dungeon its rooms by name and level above, not by the parent alone)
    const same = dun ? null : Object.values(s.places).find((p) => p.parent === pid && normText(p.name) === normText(n.name))
        // Patch 2: a place known by report is that place wherever the new mention puts it in this realm
        || knownByName(s, n.name, p0(s, pid), { reportedOnly: !reported });
    if (same) return { id: same.id };
    let id = `${pid.startsWith('loc.') ? pid : 'loc'}.${slug(n.name) || 'place'}`;
    for (let k = 2; s.places[id]; k++) id = `${pid.startsWith('loc.') ? pid : 'loc'}.${slug(n.name)}_${k}`;
    const p = s.places[pid];
    emit({ t: 'place.created', d: { place: { id, name: String(n.name).slice(0, 80), kind: n.kind, parent: pid, realm: p?.realm ?? null, tags: [], by: 'reply', created: { turn: s.turn, minute: s.clock.minute }, ...(reported ? { known: 'reported', reports: [] } : {}), ...(dun && Number.isInteger(n.level) ? { level: n.level } : {}) } } });
    return { id };
}

const p0 = (s, pid) => s.places[pid]?.realm ?? null;

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
    const place = (ref) => resolvePlace(s, ref, emit, 0, { c: cPath });
    const expected = answer.expected || {};
    const tag = msg !== null && msg !== undefined ? msg : s.turn;

    // 1. authority first: what the story may not decide is never applied
    const fw = firewall(answer.deltas, firewallContext(s, content));
    for (const x of fw.reject) { reject(x.delta, x.rule, x.why); refusedArrival(x.delta); }
    // Prototype C (4.3.0-c.6.6.3): what of Alaric's the story moved to someone else without his hand-over (quest.ready below)
    const refusedMoves = new Set(fw.reject.filter((x) => x.rule === 'pc_inventory' && x.delta?.type === 'object.move').map((x) => objectRef(x.delta.object)?.id).filter(Boolean));
    const readied = []; // the contracts this reply made READY (their open deliveries are told after the deltas)
    corrections.push(...fw.corrections);
    // the other side of a trade the engine books this turn: a sale's buyer, a seller he paid exactly (coin.gift below)
    const counterparts = new Set([...(outcome.booked?.sellers || []), ...s.decisions.filter((x) => x.kind === 'sale' && x.turn === s.turn).map((x) => x.seller || '*')]);

    // 2. world deltas in story order, each against the state at its step
    const refs = new Map(); // a delta's ref -> the entity it names (person.new, creature.new of this answer)
    const groups = new Map(); // a creature.new ref with count > 1 -> its individual ids
    const objectsNew = new Map(); // name -> object id, for object.move {new: name} of this answer
    // Patch 7: a feature this answer names (a hazard's on, the obstacle in a way) before reporting it
    const pendingRefs = [];
    const hostileRefs = new Set(fw.accept.filter((d) => d.type === 'hostile').flatMap((d) => d.by || []).map((x) => normText(x)));
    const joinedByNew = new Set();
    const bornHere = new Set(); // the people and creatures this answer introduces (an ambush is the world's move)
    const namedHere = new Set(); // Patch 4: the creatures an entry of this answer named (new, returning or named again)
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
    // Patch 4 (live 18.10.2026: "the two survivors ... calling the rest of the pack in"; a hostile by "the wolves" or by
    // the pack's own ref committed no wolf at all, and the request for them asked for new ones): a group the story names
    // as a whole is each living member of it here: the group by its ref (creature.new count > 1, this reply or an
    // earlier one), or a plural kind or collective ("the wolves", "the pack") by the creatures here it names. A number
    // the story gives must be theirs ("two wolves" of four is no one in particular: null, as an unknown name)
    const QUANT = new Set(['the', 'all', 'both', 'those', 'these', 'of', 'whole', 'entire', 'rest', 'remaining', 'other', 'others']);
    const members = (ref) => {
        if (typeof ref !== 'string') return null;
        const k = normText(ref);
        if (groups.has(k)) return groups.get(k);
        if (refs.has(k) || s.entities[ref]) return null;
        const words = k.replace(/[_.]+/g, ' ').split(' ').filter((w) => w && !QUANT.has(w) && !numbersIn(w).size);
        const bare = words.join(' ');
        // review of c.6.6.12: a group the story showed as no foe (threat false) is still that group; whether it may turn
        // on him is the World Envelope's to decide for each (hostile), never the reference's
        const here = s.scene.present.filter((id) => s.entities[id]?.kind === 'creature' && statusOf(s, id) !== 'dead');
        let ids = here.filter((id) => [k, bare].includes(s.entities[id].group));
        if (!ids.length && bare && isGroup(content, bare)) {
            const kind = words.filter((w) => !GROUP_WORDS.has(w)).join(' ');
            ids = kind ? here.filter((id) => namesKind(kind, s.entities[id].species || '', content.anchors.get(s.entities[id].anchor || s.entities[id].profile?.anchor)))
                : here.filter((id) => s.entities[id].group);
            // a kind or a collective over two groups ("the wolves" with the quarry pack and the eastern pair here) is no
            // one in particular: as an unknown name (the hostile case tells the narrator)
            if (new Set(ids.map((id) => s.entities[id].group || id)).size > 1) ids = [];
        }
        const said = [...numbersIn(k)];
        if (!ids.length || (said.length && !said.includes(ids.length))) return null;
        return ids;
    };
    // a plural kind or a collective that names no one group here ("the wolves" over two packs): never one of them by a
    // guess of the name resolver (Patch 5, position)
    const groupWords = (ref) => {
        if (typeof ref !== 'string' || refs.has(normText(ref)) || s.entities[ref]) return false;
        const bare = normText(ref).replace(/[_.]+/g, ' ').split(' ').filter((w) => w && !QUANT.has(w) && !numbersIn(w).size).join(' ');
        return !!bare && isGroup(content, bare);
    };
    // whom this reply establishes as not having noticed Alaric (aware: unaware), whatever step of it reports that: they do
    // not see him at an earlier step either (perceiveAll)
    const seeing = () => ({ unaware: new Set((fw.accept || []).filter((d) => d?.type === 'aware' && d.level === 'unaware').flatMap((d) => members(d.who) || [mapRef(d.who)]).filter((x) => typeof x === 'string')) });
    // the World Envelope at this step (docs/ARCHITECTURE_GEN35.md §2.3): may this actor turn on Alaric of its own accord?
    const envelopeAllows = (id, d) => {
        if (typeof id !== 'string' || !s.entities[id] || !['npc', 'creature'].includes(s.entities[id].kind)) { grant('envelope.fight'); return true; } // the V3 rules refuse unknown attackers
        // Patch 5: on a leg the engine gave as uneventful (commands.js roadLine), nobody the reply brings onto the road
        // ambushes him; whoever was there before follows the envelope as ever
        if (auth.road === 'quiet' && bornHere.has(id) && !s.encounter) {
            reject(d, 'road', `${id} does not turn on Alaric: this leg of the road was uneventful`);
            const correction = `${entityLabel(s, id)} did not attack Alaric in the last reply: that leg of his journey was uneventful (no ambush or attack on it); no fight started. Whoever the story brought onto the road is there, nothing more.`;
            if (!corrections.includes(correction)) corrections.push(correction);
            return false;
        }
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
        .some((o) => namesKind(o.what, d.species, anchor, cPath ? sameKinds(content) : null));
    // Patch 5: a living creature he left at this very place a short while ago (entity.left; the wary span of Patch 4), or,
    // on the open road, in this very reply (the stretch he just walked on from); anywhere else it is gone from his way
    const nearby = (e) => e.kind === 'creature' && statusOf(s, e.id) !== 'dead' && !s.scene.present.includes(e.id) && !!e.left && e.left.at === s.scene.at
        && (e.left.leg ? e.left.turn === s.turn : s.clock.minute - (e.left.minute ?? 0) <= (content.rules.combat?.wary_min ?? 360));
    const kindOk = (d) => !!String(d.name || d.feature || '').trim() && ['obstacle', 'hazard'].includes(d.kind);
    // a ref the V3 rules resolve to a creature that is not here (dead, or left elsewhere)
    const absentRef = (ref) => { const id = makeResolver(s, new Map(), content)(ref); return !!id && s.entities[id]?.kind === 'creature' && !s.scene.present.includes(id); };
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
        // Patch 5 (review of c.6.6.13): "this area" is the very place it was left at (entity.left), never the settlement or
        // realm it shares with another place (the wolf of one cave is not the wolf of the next cave in Duskreach); at a
        // place of its own it is still there later (Patch 4: the quarry wolf after hours), on the open road only nearby
        const leftHere = (e) => e.kind === 'creature' && statusOf(s, e.id) !== 'dead' && !s.scene.present.includes(e.id) && e.left?.at === s.scene.at
            && (s.places[s.scene.at]?.kind === 'realm' ? nearby(e) : true);
        // Patch 6 (the Patch 5 edge): "another one" (more true) is never the one he left here
        if (kind === 'creature' && (d.count || 1) === 1 && d.present !== false && d.more !== true) {
            const same = Object.values(s.entities).filter((e) => leftHere(e)
                && normText(e.species || '') === normText(d.species || '') && (e.anchor || e.profile?.anchor) === d.anchor);
            // a stronger one than the ordinary one that left, whose numbers are fixed, is another individual (review of
            // 4.1.5: the returning path skipped the variation); one not yet fixed is this one, shown stronger now
            const other = same.length === 1 && d.stronger === true && same[0].variation !== 'strong' && !!same[0].profile;
            if (same.length === 1 && !other) {
                emit({ t: 'scene.entered', d: { id: same[0].id, band: d.band || 'MEDIUM' } });
                refs.set(normText(d.ref), same[0].id);
                if (d.stronger === true && same[0].variation !== 'strong') emit({ t: 'entity.updated', d: { id: same[0].id, set: { variation: 'strong' } } });
                if (!same[0].profile) materialise(s, content, dice, emit, same[0].id);
                namedHere.add(same[0].id);
                return [same[0].id];
            }
        }
        const before = new Set(Object.keys(s.entities));
        const entries = [];
        const count = kind === 'creature' ? Math.max(1, Math.min(12, d.count || 1)) : 1;
        // Patch 4 (live 18.10.2026: the quarry wolves, named again as a group of four, would have been four more): the
        // creatures of this kind already here are the ones the reply names again, the same individuals with their HP,
        // places and letters; only those beyond them are new. One that joins a running fight (hostile in this reply)
        // is a new one, and so is a stronger individual among ordinary ones, and so are those another entry of this same
        // reply introduced (the strider by the mound and the two flankers of one reply are three, live 30.09.2026)
        const anchorOf = (e) => e.anchor || e.profile?.anchor;
        const here = kind === 'creature' && d.present !== false && !(s.encounter && hostileRefs.has(normText(d.ref)))
            ? s.scene.present.filter((id) => {
                const e = s.entities[id];
                // the same kind by the same name: "a big boar" among wild boars is another animal (4.1.5)
                return e?.kind === 'creature' && !namedHere.has(id) && statusOf(s, id) !== 'dead' && anchorOf(e) === d.anchor && normText(e.species || '') === normText(d.species || '');
            }) : [];
        // review of c.6.6.12: which of them the reply means is the extractor's to say, never the engine's guess by kind. A
        // group here is named by its ref (the catalog's "group ..."): with more false or null those are that group named
        // again (only the ones beyond them are new), with more true they are newcomers who join it. Under any other ref:
        // more true is a group of their own; more false is those here only when they are one group (two packs of wolves:
        // which?); null is unclear. Unclear: nothing is merged, picked or doubled, the story is told
        const own = here.filter((id) => s.entities[id].group === normText(d.ref));
        const sets = new Set(here.map((id) => s.entities[id].group || id));
        const unclear = here.length && !own.length && (d.more === false ? sets.size > 1 : d.more !== true);
        if (unclear) {
            const which = d.more === false ? 'which of the groups here they are' : 'whether they are those already here or others';
            reject(d, 'group_unclear', `${count} ${d.species}: the reply does not say ${which} (a group's ref, or more)`);
            const correction = `The engine holds ${here.map((id) => sceneHandle(s, content, id)).join(', ')} here; the ${count > 1 ? `${count} ` : ''}${d.species} of the last reply ${count > 1 ? 'were' : 'was'} not added: it could not tell ${which}. If others came, the story shows them arriving; if not, it names those here.`;
            if (!corrections.includes(correction)) corrections.push(correction);
            return [];
        }
        // Patch 5: none of this kind here, but a group of it he left at this very place a short while ago (nearby): the
        // story showing that kind here again means them, hurt as they were, never unhurt copies; only those beyond them
        // are new. Fewer than they are, or two groups of them: which is the story's to say, nothing is picked
        const back = kind === 'creature' && !here.length && d.present !== false && d.more !== true && !(s.encounter && hostileRefs.has(normText(d.ref)))
            ? Object.values(s.entities).filter((e) => nearby(e) && anchorOf(e) === d.anchor && normText(e.species || '') === normText(d.species || '')).map((e) => e.id) : [];
        if (back.length && (count < back.length || new Set(back.map((id) => s.entities[id].group || id)).size > 1)) {
            reject(d, 'group_unclear', `${count} ${d.species}: ${back.length} of this kind were left here a short while ago; the reply does not say which`);
            const correction = `${back.map((id) => sceneHandle(s, content, id)).join(', ')} ${back.length > 1 ? 'were' : 'was'} left here a short while ago; the ${count > 1 ? `${count} ` : ''}${d.species} of the last reply ${count > 1 ? 'were' : 'was'} not added: the engine could not tell which of them ${count > 1 ? 'they are' : 'it is'}. If the story shows them again, it shows all of them; if others came, they are others.`;
            if (!corrections.includes(correction)) corrections.push(correction);
            return [];
        }
        const pool = own.length ? (d.more === true ? [] : own) : here.length ? (d.more === false ? here : []) : back;
        const again = d.stronger === true && !pool.some((id) => s.entities[id].variation === 'strong') ? [] : pool.slice(0, count);
        for (const id of again.filter((x) => !s.scene.present.includes(x))) emit({ t: 'scene.entered', d: { id, band: d.band || 'MEDIUM' } });
        for (let i = again.length + 1; i <= count; i++) {
            // a newcomer to a group here is one animal of it, numbered after its members ("cre.quarry_pack 5"), never the
            // group's own ref (that would be the whole pack held as one creature, src/delta.js isGroupCreature)
            let ref = own.length ? `${d.ref} ${own.length + i - again.length}` : count > 1 ? `${d.ref} ${i}` : d.ref;
            // Patch 5: a newcomer's ref is its own, never one an earlier creature of that name had (a dead wolf of the
            // last pack, one left far behind): the V3 rules would take it for that one, and the newcomer would be lost
            for (let n = count + 1; kind === 'creature' && n < count + 64 && (entries.some((x) => normText(x.ref) === normText(ref)) || absentRef(ref)); n++) ref = `${d.ref} ${n}`;
            entries.push(kind === 'npc'
                ? { ref, kind: 'npc', name: d.name || undefined, anonymous: !d.name, desc: [...(d.role ? [d.role] : []), ...(d.desc || [])], traits: (d.desc || []).join(', '), band: d.band || undefined }
                : { ref, kind: 'creature', name: undefined, species: d.species, anchor: d.anchor, desc: d.desc || [], band: d.band || undefined });
        }
        const joins = kind === 'creature' && s.encounter && hostileRefs.has(normText(d.ref));
        if (joins) grant('envelope.fight'); // introduced by this reply: an ambush or a reinforcement is the world's move
        const r = entries.length ? v3({ new: entries, ...(joins ? { combat: entries.map((e) => ({ by: e.ref })) } : {}) }, d) : { events: [], accepted: [] };
        if (joins) joinedByNew.add(normText(d.ref));
        const created = r.events.filter((e) => e.t === 'entity.created').map((e) => e.d.entity.id).filter((id) => !before.has(id));
        for (const id of created) bornHere.add(id);
        const known = r.accepted.map((a) => /^known (\S+) \(not duplicated\)$/.exec(a)?.[1]).filter(Boolean);
        const ids = [...again, ...created, ...known];
        // the members of a group keep its name (the ref the story gave them), so a later "the quarry pack" means them; one
        // that joins those already here joins their group (review of c.6.6.12: the fifth wolf under the ref "wolves" is
        // of the quarry pack); a group of others never takes the name of a group already here
        // a newcomer named under a group's ref joins that group (the fifth wolf of "cre.quarry_pack", count 1, more true)
        const joined = own.length ? [normText(d.ref)] : [...new Set(again.map((id) => s.entities[id].group).filter(Boolean))];
        const taken = new Set(Object.values(s.entities).map((e) => e.group).filter(Boolean));
        let name = normText(d.ref);
        // Patch 5: nor the name of a group met before elsewhere (the dead pack of the last stretch of road)
        if (d.more === true || !joined.length) for (let n = 2; taken.has(name); n++) name = `${normText(d.ref)} ${n}`;
        const group = joined.length === 1 ? joined[0] : name;
        if (count > 1 || joined.length === 1) for (const id of [...again.filter((x) => !s.entities[x].group), ...created]) emit({ t: 'entity.updated', d: { id, set: { group } } });
        // the group's ref in this reply (a hostile after it) is the whole group here, its newcomers with it
        if (own.length) groups.set(normText(d.ref), s.scene.present.filter((id) => s.entities[id]?.group === group && statusOf(s, id) !== 'dead'));
        if (ids.length) refs.set(normText(d.ref), ids[0]);
        // Scene relevance is ephemeral; an important person is not automatically an enemy.
        // The NPC identity persists, but relevance and explicit threat expire when the scene ends.
        if (cPath && kind === 'npc' && d.present !== false && d.relevant === true) {
            for (const id of ids) emit({ t: 'scene.tactical', d: { id, relevant: true, threat: d.threat === true } });
        }
        if (d.name && ids.length) refs.set(normText(d.name), ids[0]);
        if (count > 1 && !own.length) groups.set(normText(d.ref), ids);
        // who the person is shows on their card (occupation), as text: the V3 fact rule would read "Guild clerk" as a
        // reference to the clerk himself
        if (kind === 'npc' && d.role && created.length && !truth(s, created[0], 'occupation').length) occupation(created[0], d.role);
        // an individual the story establishes as bigger or stronger than ordinary ones of its kind (creature.new stronger):
        // the individual variation of Content #7, fixed with its profile (live run 30.09.2026 22:41: the big boar had the
        // numbers of a common one); the name it goes by decides nothing
        if (kind === 'creature' && d.stronger === true) for (const id of created) emit({ t: 'entity.updated', d: { id, set: { variation: 'strong' } } });
        // Prototype C (4.3.0-c.6.6.2): a creature the story shows as no foe (the packhorse, a goat, a pet) is no part of the
        // field an area attack is thrown into; a deliberate attack on it still makes it the target (scene_handles.js)
        if (cPath && kind === 'creature' && d.threat === false) for (const id of created) emit({ t: 'entity.updated', d: { id, set: { threat: false } } });
        // Gameplay visibility: once an actual creature is visibly present, lock its deterministic profile immediately.
        // This gives the player a canonical target handle + HP + Range before deciding whether to attack; Initiative still waits for Combat START.
        if (kind === 'creature' && d.present !== false) for (const id of ids) materialise(s, content, dice, emit, id);
        for (const id of ids) namedHere.add(id);
        return ids;
    };

    const explicitArrival = fw.accept.some((d) => d.type === 'arrive');
    if (!explicitArrival && !s.encounter) {
        for (const [k, type] of Object.entries(outcome.expected_keys || {}).sort((a, b) => Number(a[0]) - Number(b[0]))) {
            if (type !== 'go') continue;
            const e = expected[k];
            if (!e || e.arrived !== true) continue;
            const go = (auth.gos || []).find((g) => String(g.seq) === String(k));
            const at = place(reportedTarget(s, auth, expected, e.at, k) || e.at || go?.to || null);
            if (!at.error && at.id !== s.scene.at && !wayRefused(at.id, { seq: Number(k), type: 'expected' })) {
                const party = companions(e.with, { seq: Number(k), type: 'expected' });
                perceiveAll(s, emit, seeing());
                arrive(at.id, party);
                travel.push({ seq: 0, ok: true });
            }
        }
    }

    // Prototype C: an unfinished GO can take hours without reaching where it was going: the extractor rightly reports no
    // arrival at a lighthouse only seen from the road, yet Alaric is no longer in the Guild hall he set off from (live
    // 10.10.2026). 4.3.0-c.6.6.2: where he is instead is the smallest existing place that holds the way: the realm's
    // road when he set off for a known place outside his settlement, on an established journey or for hours toward
    // somewhere new; his settlement, out of the building, when he spent the time looking for something in it ("look for
    // an inn"). Whoever travels with him (the story's answer, the journey's companion) comes along; no waypoint is made.
    // 4.3.0-c.6.6.3: decided from the answer before its deltas, so whom he meets on the road is met on the road, not
    // remembered at the shop he left (live 11.10.2026: the Reed Flats boy "first saw him at Chandler's Row")
    const narrated = fw.accept.filter((d) => d.type === 'time').reduce((n, d) => n + (Number(d.minutes) || 0), 0);
    const roadMinutes = Math.min(Math.max(0, narrated - booked), Math.max(0, cap - booked));
    const arrivesAnyway = explicitArrival || Object.entries(outcome.expected_keys || {}).some(([k, type]) => type === 'go' && expected[k]?.arrived === true);
    let transit = null;
    // Patch 7: inside a dungeon he is where he was until the story has him arrive somewhere (no road to put him on)
    if (cPath && !arrivesAnyway && !s.encounter && !dungeonOf(s, startAt) && auth.timeCap > content.rules.time.default_cap_min
        && roadMinutes >= content.rules.time.engine_clock.go_min_elsewhere
        && (auth.gos || []).length > 0 && s.scene.at === startAt) {
        const destination = (auth.gos || []).at(-1);
        const home = settlementOf(s, startAt);
        const realm = s.places[startAt]?.realm || s.places[s.scene.location]?.realm;
        const far = destination.to ? !sameSettlement(s, startAt, destination.to)
            : !!destination.journey || !home || roadMinutes > content.rules.time.default_cap_min;
        const via = far ? (s.places[realm]?.kind === 'realm' ? realm : null) : destination.to ? null : home;
        // Patch 5: a further leg on the road he is already on moves on as well (diagnosis of Patch 5: the two wolves he
        // left standing, and the two he killed, were still around him four hours of walking later); whoever travels with
        // him comes along, the rest stays where it was
        const further = far && via === startAt && s.places[startAt]?.kind === 'realm';
        if (via && (via !== startAt || further)) {
            const said = expected[String(destination.seq)]?.with;
            const party = [...new Set([...(destination.with || []), ...(Array.isArray(said) ? said.map(idOf) : [])])]
                .filter((id) => id && id !== 'pc' && s.scene.present.includes(id) && s.entities[id]?.status !== 'dead');
            perceiveAll(s, emit, seeing());
            arrive(via, party);
            transit = via;
            if (far) emit({ t: 'scene.moved', d: { place: `On the way to ${destination.journey || destination.name || destination.newName || 'the destination'}` } });
            // Patch 5: he set off for somewhere new and unnamed and is out on the road without having found it: what he
            // went to find is his goal now, a journey he can go on with (src/v4/intents.js seek), never a place yet
            if (far && destination.newName && !destination.to && !destination.journey && !destination.intent) {
                const quote = (outcome.resolutions || []).find((r) => r.seq === destination.seq)?.quote || null;
                setIntentEvents(s, { goal: `find ${destination.newName}`, seek: destination.newName, quote, why: 'he set off to find it' }).events.forEach(emit);
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
                const ref = reportedTarget(s, auth, expected, d.at) || onward(d.at);
                const away = leavesHere(ref);
                const at = place(ref);
                if (at.error) { reject(d, 'place', at.error); travel.push({ seq: d.seq ?? 0, ok: false, away }); break; }
                if (at.id === s.scene.at) break;
                if (wayRefused(at.id, d, { forced: !!String(d.forced_by || '').trim() })) { travel.push({ seq: d.seq ?? 0, ok: false, away }); break; }
                const party = companions(d.with, d);
                perceiveAll(s, emit, seeing());
                arrive(at.id, party);
                travel.push({ seq: d.seq ?? 0, ok: true });
                break;
            }
            case 'person.new': {
                // Prototype C (4.3.0-c.6): a place's service people stay who they are (live 04.10.2026 16:35: back at
                // the Guild desk, a third "Guild desk clerk" was stored): an unnamed newcomer in the role of the one
                // person Alaric left at this place in it is that person. Anyone else unnamed whom nothing else of this
                // answer deals with is scene colour (a gate guard, a mailed man at the board), kept until it matters
                if (cPath && !d.name) {
                    if (SERVICE_ROLE.test(String(d.role || ''))) {
                        const same = d.present !== false ? keptHere(d) : null;
                        if (same) {
                            emit({ t: 'scene.entered', d: { id: same, band: d.band || 'SHORT' } });
                            refs.set(normText(d.ref), same);
                            break;
                        }
                    } else if (!d.relevant && !(answer.deltas || []).some((x) => x && x.seq !== d.seq && JSON.stringify(x).includes(String(d.ref)))) {
                        reject(d, 'ambient', 'scene colour: an unnamed person nothing else of the reply deals with is not kept; the story brings them back when they matter');
                        break;
                    }
                }
                if (d.present === false) {
                    // someone the reply mentions who is elsewhere: exists, not here, not met (P0/S3 E3, Ossler)
                    const known = idOf(d.name || d.ref);
                    if (known && s.entities[known]) { refs.set(normText(d.ref), known); break; }
                    let where = null;
                    if (d.at) {
                        const p = place(d.at);
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
                perceiveAll(s, emit, seeing());
                v3({ leave: [who] }, d);
                // who walks off is not waiting at this place when Alaric comes back
                if (s.entities[who]?.at && !s.scene.present.includes(who)) emit({ t: 'entity.updated', d: { id: who, set: { at: null } } });
                // Patch 5: a creature that goes off stays in the area it left for a while (newEntity: the same one again)
                if (s.entities[who]?.kind === 'creature' && !s.scene.present.includes(who)) emit({ t: 'entity.updated', d: { id: who, set: { left: { at: s.scene.at, minute: s.clock.minute, turn: s.turn, leg: false } } } });
                break;
            }
            case 'position': {
                // Patch 5 (the Patch 4 gap): a group's ref moves each living member of it here, as aware, intent and
                // hostile do ("the east pair closes in"), never only the first; one creature's own ref moves that one
                const whos = members(d.who);
                if (!whos && groupWords(d.who)) { reject(d, 'group_unclear', `"${String(d.who).slice(0, 60)}" names no one group here`); break; }
                v3({ position: (whos || [mapRef(d.who)]).map((who) => ({ who, band: d.band, cover: d.cover || undefined })) }, d);
                break;
            }
            case 'aware':
                // 4.3.0-c.6.6: a group's ref (creature.new count > 1) means each of them (live 07.10.2026: "kobold_small_a"
                // unaware reached only the first of the two small kobolds); its own Ambush awareness, not perception's
                // Patch 4: one that fought him (or watched his fight) a short while ago has not lost track of him because the
                // story says so: no Ambush from it (rules.combat.wary_min); his own stealth check is the engine's way
                const whos = members(d.who) || [mapRef(d.who)];
                const wary = d.level === 'unaware' ? whos.filter((who) => { const w = s.entities[who]?.wary; return !!w && s.clock.minute - (w.minute ?? 0) < (content.rules.combat?.wary_min ?? 360); }) : [];
                if (wary.length) {
                    reject({ ...d, who: wary.length === whos.length ? d.who : wary }, 'engine_owned', `${wary.map((x) => entityLabel(s, x)).join(', ')} fought Alaric or watched his fight a short while ago and is still aware of him`);
                    const correction = `${wary.map((x) => entityLabel(s, x)).join(', ')} did not lose track of Alaric: ${wary.length > 1 ? 'they' : 'it'} fought him or watched his fight a short while ago and ${wary.length > 1 ? 'are' : 'is'} still aware of him. Only his own stealth catches ${wary.length > 1 ? 'them' : 'it'} unaware.`;
                    if (!corrections.includes(correction)) corrections.push(correction);
                }
                const left = whos.filter((who) => !wary.includes(who));
                if (left.length) v3({ aware: left.map((who) => ({ who, level: d.level })) }, d);
                break;
            case 'intent': {
                // an intent to attack him is the same decision as turning on him: the World Envelope's (outside a fight);
                // Patch 4: a group's intent is each member's ("the wolves break and run")
                const whos = (members(d.who) || [mapRef(d.who)]).filter((who) => !(d.intent === 'attack' && !s.encounter && !envelopeAllows(who, d)));
                if (!whos.length) break;
                grant('narrated_intent');
                v3({ intent: whos.map((who) => ({ who, intent: d.intent })) }, d);
                break;
            }
            case 'hostile': {
                // Patch 4: a group named as a whole is each member here, except one this reply shows doing something else
                // (fleeing, holding back, giving up: its own intent); presence or kinship alone commits no one
                const other = new Set(fw.accept.filter((x) => x.type === 'intent' && x.intent !== 'attack').flatMap((x) => members(x.who) || [mapRef(x.who)]));
                const by = (d.by || []).flatMap((x) => { const m = members(x); return m ? m.filter((id) => !other.has(id)) : [mapRef(x)]; }).filter((x) => !joinedByNew.has(normText(x)));
                // who turns on Alaric: inside the World Envelope at this step (an attitude the reply lowered before is
                // a cause); outside it nobody attacks, the next engine block says why
                const left = by.filter((x) => !(typeof x === 'string' && s.encounter?.combatants?.[x])).filter((x) => envelopeAllows(x, d));
                if (left.length) {
                    const r = v3({ combat: left.map((x) => ({ by: x })) }, d);
                    // Patch 4: an attack the engine could not give to anyone ("two wolves" of four): the story must not go on
                    // as if they fight; only the combatants of the engine block do
                    for (const x of left.filter((y) => typeof y === 'string' && !s.entities[y] && r.rejected.length)) {
                        const correction = `The attack of "${String(x).slice(0, 60)}" in the last reply was not booked: the engine cannot tell which of those here attack. Only those the engine has fighting attack and deal damage; name each attacker by its handle when the story has them attack.`;
                        if (!corrections.includes(correction)) corrections.push(correction);
                    }
                }
                // Prototype C (4.3.0-c.6.6.6, review): one already in the fight but no foe of his (caught in his area
                // attack, at his side) whom the story turns on him fights him from its next Turn (src/combat.js asideTurn)
                const turning = cPath ? by.filter((x) => typeof x === 'string' && x !== 'pc' && s.encounter?.combatants?.[x] && s.encounter.combatants[x].side !== 'hostile').filter((x) => envelopeAllows(x, d)) : [];
                if (turning.length) v3({ intent: turning.map((who) => ({ who, intent: 'attack' })) }, d);
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
                // Patch 3: a wound of Alaric's lives while he is hurt; at full health it is healed (a scar is no wound)
                const hurt = !scoped && pcWound(d) ? { hurt: deriveCharacter(s.entities.pc.sheet, content).maxHp } : null;
                v3({ facts: [{ s: subject, p: d.p, o: mapRef(d.o), ...(scoped ? { scope: { fight: enc.id } } : hurt ? { scope: hurt } : {}) }] }, d);
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
                // Patch 3 (review): nor an act of his he did not choose (the fact firewall's pc_decision, in a memory's words:
                // "Alaric hunted and roasted wood pigeons" on a road he only travelled); what he did stays
                const fw = firewallContext(s, content);
                // "He" opening a later clause of a memory about Alaric is Alaric
                const actOf = (c) => pcActIn(/^\s*alaric\b/i.test(d.text) ? c.replace(/^\s*he\b/i, 'Alaric') : c);
                const invented = (c) => { const act = actOf(c); return !!act && !fw.actedOn(act); };
                const cut = stripOwned(d.text, { store: 'memory', extra: invented });
                const acts = cut.other.map(actOf);
                if (acts.length) {
                    const correction = `Alaric did not ${[...new Set(acts)].join(' or ')} anything in the last reply: hunting, eating, buying, using up or leaving behind his things is his decision, and he did not make it. His food, coin and things are as the engine has them.`;
                    if (!corrections.includes(correction)) corrections.push(correction);
                }
                if (!cut.kept.length) { reject(d, acts.length ? 'pc_decision' : 'engine_owned_memory', acts.length ? `a memory of his own act he did not choose (${acts.join(', ')})` : `a memory keeps the moment; ${cut.kinds.join(', ')} is the engine's state, recorded by the engine`); break; }
                v3({ memory: [{ text: cut.owned.length || cut.other.length ? cut.kept.join(' ') : d.text, who: (d.who || []).map(mapRef), imp: d.imp }] }, d);
                break;
            }
            case 'thread':
                // Patch 2: an id from the catalog's THREADS updates or resolves that thread (src/threads.js)
                v3({ threads: [{ id: d.id || null, text: d.text, kind: d.kind, status: d.status, resolution: d.resolution || null }] }, d);
                break;
            case 'place.reported': {
                // Patch 2: a place someone tells of, a map shows or a rumour names: a known place by report, not a
                // place in the world as the story has shown it (src/v4/known.js)
                const r = reportPlace(s, d, emit, { by: d.by ? idOf(d.by) || null : null, place: (ref) => resolvePlace(s, ref, emit, 0, { c: cPath, reported: true }) });
                if (r.error) reject(d, 'place', r.error);
                break;
            }
            case 'feature': {
                // Patch 6 (src/v4/features.js): an obstacle or danger of the place where he is; named again it is the same
                // one (no copy). What it takes, how hard and whether it hurts is fixed when the story establishes it; what
                // Alaric achieves on it (got past, made harmless, found) is the engine's; the world itself may destroy it
                const here = s.scene.at;
                const known = (typeof d.feature === 'string' && s.features?.[d.feature]?.at === here ? s.features[d.feature] : null)
                    || featureNamed(s, here, d.feature) || featureNamed(s, here, d.name);
                if (known) {
                    if (d.status === 'destroyed' && known.status !== 'destroyed') { emit(featureEvent({ ...known, status: 'destroyed', history: [...(known.history || []), { turn: s.turn, minute: s.clock.minute, what: 'destroyed (the story)' }] })); break; }
                    const fixed = ['kind', 'trigger', 'stat', 'difficulty', 'harm'].filter((k) => d[k] != null && d[k] !== known[k]);
                    if (known.hidden && d.hidden === false) fixed.push('hidden');
                    if (fixed.length) reject(d, 'engine_owned', `${known.id}: ${fixed.join(', ')} of a known feature stay as established (found, passed and made harmless only by the engine)`);
                    break;
                }
                if (!kindOk(d)) { reject(d, 'world_rule', 'a feature needs a name and a kind'); break; }
                const id = `feat.${Object.keys(s.features || {}).length + 1}`;
                const harm = d.harm || (d.kind === 'hazard' ? 'hp' : null);
                // review of 32c7d2c: a hidden hazard that is part of a feature here (the needle in that chest's lock)
                const on = d.kind === 'hazard' && d.on ? ((typeof d.on === 'string' && s.features?.[d.on]?.at === here ? s.features[d.on] : null) || featureNamed(s, here, d.on))?.id || null : null;
                // Patch 7 (open point of the Patch 6 review): the feature it is part of may come later in this report
                if (d.kind === 'hazard' && d.on && !on) pendingRefs.push({ kind: 'on', id, at: here, name: String(d.on) });
                emit(featureEvent({
                    id, at: here, name: String(d.name || d.feature).slice(0, 80), kind: d.kind, hidden: d.hidden === true,
                    status: d.status === 'destroyed' ? 'destroyed' : 'active', trigger: d.kind === 'hazard' ? d.trigger || 'touch' : d.trigger || null,
                    stat: d.stat || null, difficulty: d.difficulty || 'moderate', harm, on,
                    since: { turn: s.turn, minute: s.clock.minute }, found: d.hidden === true ? null : { turn: s.turn, minute: s.clock.minute, how: 'seen' },
                    history: [{ turn: s.turn, minute: s.clock.minute, what: 'established' }], by: 'reply',
                }));
                break;
            }
            case 'passage':
                passage(d);
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
            case 'bid':
                bid(d);
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
                const cp = evidenced(d.cp, d.said, d);
                if (cp === null) {
                    reject(d, 'coin', `${d.cp} cp is no sum the reply names`);
                    const correction = `Alaric's purse did not change: the ${d.cp} cp from ${String(d.from).slice(0, 60)} in the last reply were not booked (the reply names no such sum).`;
                    if (!corrections.includes(correction)) corrections.push(correction);
                    break;
                }
                grant('envelope.give');
                emit({ t: 'coin.changed', d: { id: 'pc', value: coin + cp, delta: cp, why: `${from ? entityLabel(s, from) : d.from}: ${String(d.why || 'a gift').slice(0, 80)}` } });
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
                        // Prototype C (4.3.0-c.6): its contract slip shows the outcome; trophies are loot
                        const correction = cPath ? `"${q.title}" is a hunt contract: the Guild pays it at a Guild hall once its contract slip shows the outcome READY; no local inspection, witness, signature or trophy is required.`
                            : `"${q.title}" is a hunt contract: the Guild pays it on the trophies of the kills brought to a Guild hall; no local inspection, witness or signature is required.`;
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
                // Prototype C (4.3.0-c.6.6.6): the same word on the same objective again is no news (one entry each)
                const said = String(d.objective).slice(0, 160);
                if (cPath && (q.progress || []).some((p) => progressKey(q, p.objective) === progressKey(q, said) && p.status === d.status)) break;
                emit({ t: 'quest.progressed', d: { id: q.id, objective: said, status: d.status } });
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
                // Prototype C (4.3.0-c.6.6.4): an escort is done by travelling with the charge, not by waiting where it
                // arrives (live 15.10.2026: Alaric walked to the quarry gate alone, the pay wagon came in, READY and paid).
                // Its journey (quest.journey: he set off or arrived with them) shows it; another arrangement the client
                // agreed to is the claim's alternative. Any number of fights, or none
                if (cPath && q.kind === 'guild_contract' && !q.journey && !String(d.alternative || '').trim() && (q.objectives || []).some((o) => o.verb === 'ESCORT')) {
                    reject(d, 'quest_escort', 'an escort is done by travelling with the charge; the engine has no journey with them');
                    const correction = `"${q.title}" is still IN PROGRESS: an escort is done by travelling with the escorted party along the way, and Alaric has not travelled with them. Their safe arrival without him is not his escort. The contract and its goal stay as they are.`;
                    if (!corrections.includes(correction)) corrections.push(correction);
                    break;
                }
                // Patch 5: nor is it done on the open road between (a washed-out bridge "as good as there"): the charge
                // arrives where the journey leads, and the arrival must happen
                if (cPath && q.kind === 'guild_contract' && s.places[s.scene.at]?.kind === 'realm' && !String(d.alternative || '').trim() && (q.objectives || []).some((o) => o.verb === 'ESCORT')) {
                    reject(d, 'quest_escort', 'the escort is still on the road; it is done where the charge arrives');
                    const correction = `"${q.title}" is still IN PROGRESS: Alaric and his charge are still on the road, not where the escort leads. It is done when the story has them arrive there together.`;
                    if (!corrections.includes(correction)) corrections.push(correction);
                    break;
                }
                // Prototype C (4.3.0-c.6.6.3): an outcome that rests on a hand-over this very reply could not book (Alaric
                // still holds the basket the story put into Sister Maren's hands, live 11.10.2026) is no outcome: no READY
                // beside the thing in his hands. The real hand-over later is the delivery, and its reply the outcome
                if (cPath && q.kind === 'guild_contract') {
                    const refused = owedObjects(s, q).filter((o) => refusedMoves.has(o.id));
                    if (refused.length) {
                        reject(d, 'quest_delivery', `the hand-over of ${refused.map((o) => o.name).join(', ')} in this reply was not booked; Alaric still holds it`);
                        const correction = `"${q.title}" is still IN PROGRESS: the hand-over of ${refused.map((o) => o.name).join(' and ')} in the last reply did not happen in the engine's state; Alaric still holds it. The contract, its goal and its recipient stay exactly as they were: do not invent a new recipient, address or condition to explain it. It is delivered when Alaric hands it over.`;
                        if (!corrections.includes(correction)) corrections.push(correction);
                        break;
                    }
                    readied.push(q.id);
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
                // The same reply in which the player reads an official board is not allowed to retroactively take
                // away its just-published choices. On Prototype C the current-day board stays Alaric's stable choice set;
                // background adventurers do not get a second chance to consume one on a later reply either.
                if ((outcome.board?.listings || []).some((id) => id === (typeof d.listing === 'string' ? d.listing : questRef(d.listing)?.id))) {
                    reject(d, 'board_first_display', 'a listing just presented as available cannot vanish retroactively during the same board-reading reply');
                    const title = questRef(d.listing)?.title || String(d.listing?.new || d.listing);
                    const correction = cPath
                        ? `The newly displayed Guild listing "${title}" remains AVAILABLE to Alaric for this Guild day; background adventurers do not consume one of his five daily choices.`
                        : `The newly displayed Guild listing "${title}" remains AVAILABLE. The previous reply's claim that it had just been taken was not booked; only a later established event may remove it.`;
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
                const key = Object.keys(s.guild.boards).find((k) => s.guild.boards[k].listings.includes(q.id));
                // Prototype C daily board is the player's stable set of choices. Ambient adventurers may exist in the
                // fiction, but they do not consume one of Alaric's remaining same-day listings. Explicit withdrawal or
                // expiry is a different world event and remains possible.
                if (cPath && d.why === 'taken_by_other' && key && s.guild.boards[key].day === today(s)) {
                    reject(d, 'board_stable_player', 'another adventurer does not consume Alaric\'s stable same-day Guild listing');
                    const correction = `The Guild listing "${q.title}" remains AVAILABLE to Alaric for this Guild day; another adventurer taking work in the background does not remove one of his five daily choices.`;
                    if (!corrections.includes(correction)) corrections.push(correction);
                    break;
                }
                grant('world.taken');
                emit({ t: 'quest.status', d: { id: q.id, from: 'listed', to: d.why, by: 'world' } });
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

    // Patch 7 (the open point of the Patch 6 review): a feature that a hazard is part of (on), that stands in a way or
    // holds a thing, named before the same report established it: found now by its name where it was named, once,
    // whatever the order of the report (no second chest, the trap stays hidden); a thing's container by its name
    // when he reaches for it (in_name: commands.js take)
    for (const r of pendingRefs) {
        step = { kind: 'delta', type: r.kind === 'on' ? 'feature' : 'passage', seq: r.seq ?? 0, granted: new Set() };
        const target = wayFeature(r.name, r.at);
        if (!target) continue;
        if (r.kind === 'on' && s.features[r.id] && !s.features[r.id].on && target !== r.id) emit(featureEvent({ ...s.features[r.id], on: target }));
        if (r.kind === 'way' && s.links[r.id] && !s.links[r.id].feature) emit(linkEvent({ ...s.links[r.id], feature: target }));
    }

    // Prototype C (4.3.0-c.6.6.2/3): the story's outcome stands; what he still carries of a delivery keeps the contract from
    // the turn-in until it leaves his hands (guild.js contractReady, read anew every time), so a hand-over the engine books
    // later makes it ready without another claim. Told after all of this reply's hand-overs, and without moving the goal
    for (const id of readied) {
        const r = contractReady(s, content, s.quests[id], { c: true });
        const correction = `"${s.quests[id].title}" is NOT READY for turn-in yet: ${r.reason}. Its goal and recipient stay as they are: it is done when he hands it over there (no new recipient, address or condition).`;
        if (r.mode === 'not_delivered' && !corrections.includes(correction)) corrections.push(correction);
    }

    // 3. what the extractor answered about the player's commands
    step = { kind: 'expected' };
    for (const [k, type] of Object.entries(outcome.expected_keys || {})) {
        const e = expected[k];
        if (!e) continue;
        if (type === 'go' && e.arrived === true && !arrived && !s.encounter) {
            // the arrival the story showed without an arrive delta: where the answer says, else where he set off to
            const go = (auth.gos || []).find((g) => String(g.seq) === String(k));
            const at = place(reportedTarget(s, auth, expected, e.at, k) || e.at || go?.to || null);
            if (!at.error && at.id !== s.scene.at && !wayRefused(at.id, { seq: Number(k), type: 'expected' })) {
                const party = companions(e.with, { seq: Number(k), type: 'expected' });
                perceiveAll(s, emit, seeing());
                arrive(at.id, party);
            }
        }
        if (type === 'activity' && !timeUsed && Number.isInteger(e.minutes) && e.minutes > 0) {
            const m = Math.min(e.minutes, Math.max(0, cap - timeUsed));
            if (m > 0) { emit({ t: 'time.advanced', d: { minutes: m, why: 'activity' } }); timeUsed += m; }
        }
        if (type === 'take' && e.taken === true && !events.some((x) => x.t === 'object.created' && x.d.object.holder?.entity === 'pc') && !events.some((x) => x.t === 'object.moved' && x.d.to?.entity === 'pc')) {
            const name = (auth.takeNames || {})[k];
            if (name && !isLooseCoin(name)) emit({ t: 'object.created', d: { object: { id: uniqueObjectId(s, tag, name), name, kind: 'item', stack: false, qty: 1, unit: null, ...itemTraits(content, { name }, s.clock.minute), holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: s.turn, how: 'taken' } } } });
        }
        if ((type === 'buy' || type === 'pay') && e.taken_anyway === true) overreach(type === 'buy' ? 'purchase' : 'payment', `the reply had Alaric ${type === 'buy' ? 'take or use what he had not bought' : 'pay'} although he had not agreed`);
        if ((type === 'buy' || type === 'pay') && e.priced === true) {
            for (const dec of s.decisions.filter((x) => x.seq === Number(k) && x.turn === s.turn && !x.priced)) emit({ t: 'decision.opened', d: { decision: { ...dec, priced: true } } });
        }
        if (type === 'sell') sale(k, e);
    }

    // Patch 5: a goal with no place (seek) is done where the extractor reports the GO for it arrived: the place the story
    // had him find. A place only named or seen on the way is no arrival
    if (arrived && arrived !== transit) {
        for (const g of auth.gos || []) {
            if (expected[String(g.seq)]?.arrived !== true) continue;
            const i = Object.values(s.intents || {}).find((x) => x.status === 'active' && x.seek && !x.place && (x.id === g.intent || (!g.to && normText(x.seek) === normText(g.newName || ''))));
            if (i) emit({ t: 'intent.set', d: { intent: { ...i, place: arrived, status: 'done', updated: { turn: s.turn, minute: s.clock.minute }, why: `he found it: ${placeName(s, arrived)}` } } });
        }
    }

    // Prototype C: a real journey to another place takes time; without the story's own minutes a small fixed one
    // (rules.time.engine_clock), never 0. Only the minutes beyond the booked activities count as travel.
    // 4.3.0-c.6.6.2: the long one only where the way crosses a settlement's bounds (into or out of a town, from one to
    // another); a short move within the wilds (the next bend of a wolf trail) is local like one within a town
    if (auth.c && arrived && arrived !== startAt && arrived !== transit) {
        const t = content.rules.time.engine_clock;
        const floor = settlementOf(s, startAt) === settlementOf(s, arrived) ? t.go_min_same_settlement : t.go_min_elsewhere;
        const travelled = timeUsed - booked;
        if (travelled < floor) { emit({ t: 'time.advanced', d: { minutes: floor - travelled, why: 'travel' } }); timeUsed += floor - travelled; }
    }

    // 4. what waited for the reply and did not happen
    step = { kind: 'conditional' };
    // Patch 3: what he uses of a thing he took in this very reply (commands.js use, condition 'taken'): the thing the
    // story let him take, in the amount he uses; a tool stays his. Nothing taken, nothing used
    for (const k of conditionals.filter((x) => !x.done && x.kind === 'use')) {
        const got = events.filter((e) => (e.t === 'object.created' && e.d.object.holder?.entity === 'pc') || (e.t === 'object.moved' && e.d.to?.entity === 'pc'))
            .map((e) => s.objects[e.t === 'object.created' ? e.d.object.id : e.d.split || e.d.id])
            .filter((o) => o && o.holder?.entity === 'pc' && sameWant(k.name, o.name));
        const o = got.at(-1);
        if (!o) continue;
        k.done = true;
        if (['food', 'consumable'].includes(useOf(content, o))) {
            const n = Math.min(k.qty || 1, o.qty ?? 1);
            emit({ t: 'object.consumed', d: { id: o.id, by: 'pc', ...(n < (o.qty ?? 1) ? { qty: n } : {}) } });
        }
        emit({ t: 'cmd.completed', d: { seq: k.seq, ok: true, reason: null } });
    }
    // a trap of a place he did not get into does not spring (no expiry of his GO for it: the GO stands as it went)
    for (const c of conditionals.filter((x) => !x.done && x.kind !== 'spring')) emit({ t: 'cmd.expired', d: { seq: c.seq, reason: 'the condition did not happen in this reply' } });

    // 5. who noticed him, his introduction, his own record of the turn, a fight the reply committed to
    step = { kind: 'engine' };
    // Prototype C (4.3.0-c.6): his contract slips show what the engine holds of their contracts (READY, COMPLETED)
    if (cPath) slipMarks(s, content, emit);
    perceiveAll(s, emit, seeing());
    selfIntro(s, emit);
    const ep = episode(s, msg);
    if (ep) emit({ t: 'memory.recorded', d: { memory: ep } });
    const fightFrom = events.length;
    const opened = openCommitted(s, content, dice, emit, { hold: false, c: cPath });
    if (opened) opened.from = fightFrom;
    return { events, rejected, corrections, system, opened, state: s, arrivedHall };

    // ---------------------------------------------------------------------------------------------- step helpers
    /**
     * Prototype C (4.3.0-c.6): the person in this role Alaric met at this place and left there (entity.at): the only one,
     * or of several the one the newcomer's description alone matches (the clerk "with spectacles"); else nobody
     */
    function keptHere(d) {
        const headOf = (x) => { const w = normText(x).split(' '); const end = w.findIndex((y) => RELATION_WORDS.has(y)); return (end < 0 ? w : w.slice(0, end)).at(-1); };
        const want = headOf(d.role);
        if (!want) return null;
        const kept = Object.values(s.entities).filter((e) => e.kind === 'npc' && e.at === s.scene.at && !s.scene.present.includes(e.id) && statusOf(s, e.id) !== 'dead'
            && [truth(s, e.id, 'occupation')[0]?.o, ...(e.descriptors || [])].filter(Boolean).some((x) => headOf(x) === want));
        if (kept.length < 2) return kept[0]?.id || null;
        const roleWords = new Set(normText(d.role).split(' '));
        const words = (x) => new Set(normText(x).split(/[^a-z]+/).filter((w) => w.length > 3 && !roleWords.has(w)));
        const told = words((d.desc || []).join(' '));
        const score = kept.map((e) => [...words([e.traits, ...(e.descriptors || [])].join(' '))].filter((w) => told.has(w)).length);
        const best = Math.max(...score);
        return best > 0 && score.filter((x) => x === best).length === 1 ? kept[score.indexOf(best)].id : null;
    }

    function occupation(id, role) {
        setFactEvents(s, { s: id, p: 'occupation', o: String(role).slice(0, 80), source: { kind: 'narration', msg }, importance: 0.5 }).forEach(emit);
    }

    /** The people an arrival brings along (arrive.with, an expected go's with): known, alive, here before the move. */
    function companions(list, d) {
        // Patch 5: the charge of a quest journey he travels on (the GO's with, along: the journey is under way) arrives
        // with him unless the story parted them; a GO that only might start it (still in town) takes no one along
        const out = (auth.gos || []).filter((g) => g.along).flatMap((g) => g.with || []).filter((id) => s.scene.present.includes(id) && statusOf(s, id) !== 'dead');
        for (const ref of Array.isArray(list) ? list : []) {
            const id = idOf(ref);
            const e = id && id !== 'pc' ? s.entities[id] : null;
            if (!e || !['npc', 'creature'].includes(e.kind) || e.status === 'dead') { reject(d, 'world_rule', `arrive.with: unknown person ${String(ref).slice(0, 40)}`); continue; }
            if (!s.scene.present.includes(id)) { reject(d, 'world_rule', `arrive.with: ${id} was not with Alaric`); continue; }
            if (!out.includes(id)) out.push(id);
        }
        return [...new Set(out)];
    }

    /**
     * 4.3.0-c.6.6: a new place he reaches after this reply has taken him out of the settlement it began in does not lie
     * in that settlement (live 07.10.2026: "arrive Thornwick", then "arrive Thornwick chapel infirmary" in a chapel the
     * extractor parented to Ashbridge, the town he had left). Its stated parent there becomes where he is now. Prototype C.
     */
    function onward(ref) {
        const from = settlementOf(s, startAt);
        const now = settlementOf(s, s.scene.at);
        if (!cPath || !from || now === from || !ref || typeof ref !== 'object') return ref;
        const fix = (r) => {
            const n = r?.new;
            if (!n || typeof n !== 'object' || ['realm', 'region', 'wilderness', 'settlement'].includes(n.kind)) return r;
            if (n.parent && typeof n.parent === 'object') return { new: { ...n, parent: fix(n.parent) } };
            if (typeof n.parent === 'string' && s.places[n.parent] && settlementOf(s, n.parent) === from) return { new: { ...n, parent: now || s.scene.at } };
            return r;
        };
        return fix(ref);
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

    /**
     * Prototype C (4.3.0-c.6.6.6, live 18.10.2026: "I walk into the dark looking for the pups" made the den a room of
     * the alleys, and the four pups the scene held were gone from it: "PRESENT: nobody besides Alaric", his Arcane
     * Burst had no one to hit). A step into a part of the place he is in, back out of it or into the next part of the
     * same place, toward creatures of the scene: those his GO names (their kind or name) are there with him. The story's
     * arrive.with brings anyone else; nobody else is moved into another room.
     */
    function soughtHere(id, party) {
        const from = s.scene.at;
        const local = !!from && !!s.places[id] && (s.places[id].parent === from || s.places[from]?.parent === id
            || (!!s.places[id].parent && s.places[id].parent === s.places[from]?.parent));
        if (!local) return [];
        const said = [...(auth.gos || []).map((g) => g.newName || g.name || ''), ...(outcome.resolutions || []).filter((r) => r.type === 'go').map((r) => r.quote || '')].join(' ');
        const words = kindOf(said).words;
        const named = (e) => [e.species, e.name, e.known_name].filter(Boolean).some((t) => { const h = kindOf(t).head; return !!h && h.length >= 3 && words.has(h); });
        return s.scene.present.filter((who) => who !== 'pc' && !party.includes(who) && s.entities[who]?.kind === 'creature' && statusOf(s, who) !== 'dead' && named(s.entities[who]))
            .map((who) => ({ id: who, awareness: s.scene.awareness?.[who] || null, relevant: (s.scene.relevant || []).includes(who), threat: (s.scene.threats || []).includes(who) }));
    }

    /**
     * Patch 7: an arrival in or out of a dungeon goes by a way he knows and can take (src/v4/dungeon.js), whichever
     * path books it (the arrive delta, an expected go). A part he has not seen (new in this reply, or never joined to
     * any way) he reaches by going on from where he is; one carried or dropped through a way next to him (forced) is
     * there. Refused: the reason (rejected, told as a correction), and he stays where he was.
     */
    function wayRefused(to, d, { forced = false } = {}) {
        const from = s.scene.at;
        if (to === from || (!dungeonOf(s, from) && !dungeonOf(s, to))) return null;
        const direct = linkBetween(s, from, to);
        const unseen = events.some((e) => e.t === 'place.created' && e.d.place.id === to) || (!linksAt(s, to, { hidden: true }).length && !visited(s, to));
        // a room of another dungeon only where he set out for that dungeon (no jump from one ruin into another's room)
        const dTo = dungeonOf(s, to);
        const elsewhere = !!dTo && dTo !== to && dTo !== dungeonOf(s, from) && !forced && !(auth.gos || []).some((g) => g.to && dungeonOf(s, g.to) === dTo);
        const w = elsewhere ? { none: true } : (unseen && !direct) || (forced && direct) ? { path: [] } : wayBetween(s, from, to);
        if (w.path || w.danger) return null;
        const why = w.blocked
            ? `the way to ${placeName(s, to)} is barred by ${w.blocked.feature.name} (${w.blocked.feature.id}), which he has not got past`
            : elsewhere ? `${placeName(s, to)} lies in ${s.places[dTo].name}, where he did not set out for`
                : `he knows no open way from ${placeName(s, from)} to ${placeName(s, to)}`;
        reject(d, 'passage', why);
        const fix = `Alaric is still in ${placeName(s, from)}: ${why}; he did not get there.`;
        if (!corrections.includes(fix)) corrections.push(fix);
        return why;
    }

    /** Patch 7: the feature a way, a hazard or a thing names (its id or its name), at these places. */
    function wayFeature(ref, at) {
        const places = [].concat(at);
        if (typeof ref === 'string' && s.features?.[ref] && places.some((p) => s.features[ref].at === p || linksAt(s, p, { hidden: true }).some((l) => l.feature === ref))) return ref;
        for (const p of places) { const f = featureNamed(s, p, ref); if (f) return f.id; }
        return null;
    }

    /**
     * Patch 7: a way between two rooms of a dungeon as the story shows it (src/v4/dungeon.js). It makes the place a
     * dungeon (its building or cave), the room it leads to a room of it, and keeps the way once: named again it is the
     * same way. What the story may not do: find a hidden way (his search does) or open a barred one (his attempt does).
     */
    function passage(d) {
        const a0 = d.from === null || d.from === undefined ? { id: s.scene.at } : place(d.from);
        if (a0.error) { reject(d, 'place', a0.error); return; }
        markEvents(s, a0.id).forEach(emit);
        // a way up or down leads to a room of another level: a room of the same name there is another room
        const lv = d.dir && d.to?.new && typeof d.to.new === 'object' && dungeonOf(s, a0.id) ? levelVia(s, a0.id, { a: a0.id, dir: d.dir }) : null;
        const b0 = place(Number.isInteger(lv) ? { new: { ...d.to.new, level: lv } } : d.to);
        if (b0.error) { reject(d, 'place', b0.error); return; }
        markEvents(s, b0.id).forEach(emit);
        const dun = dungeonOf(s, a0.id) || dungeonOf(s, b0.id);
        if (!dun) { reject(d, 'world_rule', 'a passage joins the rooms of a building, cave or ruin'); return; }
        // from outside, a way in starts at the dungeon itself
        const a = dungeonOf(s, a0.id) === dun ? a0.id : dun;
        const b = dungeonOf(s, b0.id) === dun ? b0.id : dun;
        if (a === b) { reject(d, 'world_rule', 'a passage joins two different places'); return; }
        const feature = d.feature ? wayFeature(d.feature, [a, b]) : null;
        const known = linkBetween(s, a, b);
        if (known) {
            if (known.hidden && d.hidden === false) reject(d, 'engine_owned', `${known.id}: a hidden way is found by his search, not by the story`);
            // a new obstacle in a way that was open (rubble falls, a portcullis drops); the one that stands stays
            const set = { ...(feature && feature !== known.feature && !blockerOf(s, known) ? { feature } : {}), ...(!known.name && d.name ? { name: String(d.name).slice(0, 60) } : {}) };
            if (Object.keys(set).length) emit(linkEvent({ ...known, ...set }));
            if (d.feature && !feature && !known.feature) pendingRefs.push({ kind: 'way', id: known.id, at: [a, b], name: String(d.feature), seq: d.seq });
            return;
        }
        const l = newLink(s, { a, b, name: d.name, both: d.one_way !== true, hidden: d.hidden === true, feature, dir: d.dir || null });
        emit(linkEvent(l));
        if (d.feature && !feature) pendingRefs.push({ kind: 'way', id: l.id, at: [a, b], name: String(d.feature), seq: d.seq });
        // the room it leads to lies on the level the way leads to
        if (b !== dun && !Number.isInteger(s.places[b].level)) {
            const level = levelVia(s, a, l);
            if (Number.isInteger(level)) emit({ t: 'place.updated', d: { id: b, set: { level } } });
        }
    }

    function arrive(id, party = []) {
        const town = locationOf(s, id);
        const from = s.scene.at;
        // Patch 7: two rooms of a building or cave out in the wild that he walks between make it a dungeon (with the
        // ways he walked in it); and whether he knew a way here before he took it (else the way he took is kept)
        if (cPath && !dungeonOf(s, from) && !dungeonOf(s, id) && s.places[from]?.kind === 'interior' && s.places[id]?.kind === 'interior'
            && complexOf(s, from) && complexOf(s, from) === complexOf(s, id) && !settlementOf(s, complexOf(s, from))) markEvents(s, from).forEach(emit);
        const dun = dungeonOf(s, id);
        const knownWay = dun || dungeonOf(s, from) ? !!wayBetween(s, from, id).path : true;
        // whoever does not come along stays at the place he leaves (entity.at): "the driver" there is that driver again.
        // They are not put back into the scene when he returns: only the story knows whether they are still there (the
        // replay of 30.09.2026 would have had Aldsa waiting at the ford while she was in Millbrook); it brings them in.
        for (const who of s.scene.present) {
            const e = s.entities[who];
            if (who === 'pc' || party.includes(who) || e?.status === 'dead') continue;
            // Patch 5: a living creature he leaves behind stays where it was (entity.left): the story may show the same
            // ones again there, never unhurt copies of them (newEntity)
            if (e?.kind === 'creature') emit({ t: 'entity.updated', d: { id: who, set: { left: { at: from, minute: s.clock.minute, turn: s.turn, leg: id === from } } } });
            if (e?.kind !== 'npc' || e.at === from) continue;
            emit({ t: 'entity.updated', d: { id: who, set: { at: from } } });
        }
        // one that went off on this stretch of road before (leave) stays behind on it as well
        if (id === from) {
            for (const e of Object.values(s.entities).filter((x) => x.kind === 'creature' && x.left?.at === from && !x.left.leg && !s.scene.present.includes(x.id))) {
                emit({ t: 'entity.updated', d: { id: e.id, set: { left: { ...e.left, turn: s.turn, leg: true } } } });
            }
        }
        const near = cPath ? soughtHere(id, party) : [];
        emit({ t: 'scene.moved', d: { at: id, location: town, place: dun && dun !== id ? `${s.places[dun].name} › ${s.places[id].name}` : placeName(s, id), reset_present: true, ...(cPath ? { track_history: true } : {}) } });
        // Patch 7: in a dungeon, the way he took (found by walking it), the room's level, and that he has stood there
        if (dun) {
            const a = dungeonOf(s, from) === dun ? from : dun;
            let way = linkBetween(s, a, id);
            if (!knownWay && a !== id && !way) { way = newLink(s, { a, b: id, how: 'walked', by: 'walked' }); emit(linkEvent(way)); }
            else if (way?.hidden) emit(linkEvent({ ...way, hidden: false, found: { turn: s.turn, minute: s.clock.minute, how: 'walked' } }));
            const level = id !== dun && way && !Number.isInteger(s.places[id].level) ? levelVia(s, a, way) : null;
            if (!s.places[id].visited || Number.isInteger(level)) emit({ t: 'place.updated', d: { id, set: { ...(s.places[id].visited ? {} : { visited: { turn: s.turn, minute: s.clock.minute } }), ...(Number.isInteger(level) ? { level } : {}) } } });
        }
        // who travelled with him arrives with him
        for (const who of party) emit({ t: 'scene.entered', d: { id: who, band: 'SHORT' } });
        // and the creatures he went to in a part of the place he was in are there with him, as he knew them
        for (const n of near) {
            emit({ t: 'scene.entered', d: { id: n.id, band: 'SHORT' } });
            if (n.awareness) emit({ t: 'scene.awareness', d: { id: n.id, level: n.awareness } });
            if (n.relevant || n.threat) emit({ t: 'scene.tactical', d: { id: n.id, relevant: n.relevant, threat: n.threat } });
        }
        arrived = id;
        // Patch 2: a place known only by report is seen now (it, and a reported place it lies in); a goal of his that
        // this place reaches is done (src/v4/intents.js). Nothing else of the report becomes true by it
        for (const e of visitEvents(s, id)) emit(e);
        const reached = reachedEvents(s, id);
        if (reached.length) grant('player.goal');
        for (const e of reached) emit(e);
        // he set off on a quest's journey (a GO while its people were with him) and has left the settlement: it has begun
        const trip = auth.journey && s.quests[auth.journey];
        if (trip?.status === 'active' && !trip.journey && settlementOf(s, from) !== settlementOf(s, id)) emit({ t: 'quest.journey', d: { id: trip.id, at: from } });
        // Prototype C (4.3.0-c.6.6.4): he arrives somewhere with the charge of an escort he took: he is escorting them
        if (cPath && party.length) {
            for (const q of Object.values(s.quests).filter((x) => x.status === 'active' && x.taker === 'pc' && !x.journey && (x.objectives || []).some((o) => o.verb === 'ESCORT'))) {
                const what = (q.objectives || []).filter((o) => o.verb === 'ESCORT').map((o) => normText(o.what || '')).join(' ');
                const charge = party.some((id) => [s.entities[id]?.name, truth(s, id, 'occupation')[0]?.o, ...(s.entities[id]?.descriptors || [])].filter(Boolean).map(normText).some((x) => x.length >= 4 && (what.includes(x) || x.split(' ').some((w) => w.length >= 5 && what.includes(w)))));
                if (charge) emit({ t: 'quest.journey', d: { id: q.id, at: from } });
            }
        }
        // a decision belongs to the place it was opened at: leaving it closes it; one opened in this very turn goes
        // with him ("look for an inn to sleep": the room is bought where he arrives)
        for (const dec of s.decisions.filter((x) => x.at && x.at !== id && x.kind !== 'registration')) {
            if (dec.turn === s.turn) emit({ t: 'decision.opened', d: { decision: { ...dec, at: id } } });
            else emit({ t: 'decision.closed', d: { id: dec.id, status: 'expired' } });
        }
        // Patch 6 (review of 32c7d2c): the hidden trap his GO rolled for springs now that he is in (src/v4/features.js)
        for (const k of conditionals.filter((x) => !x.done && x.kind === 'spring' && x.at === id)) {
            k.done = true;
            applySpring(s, content, emit, k);
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
                const r = q && q.status === 'active' ? completeContract(s, content, q, emit, { step: k.seq, c: cPath }) : { ok: false, reason: 'the contract is no longer active' };
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
        // Patch 7: what lies in a container that is still shut (the locked chest) is not in his hands before it opens
        const box = d.in ? wayFeature(d.in, s.scene.at) : null;
        if (holder.entity === 'pc' && box && s.features[box].status === 'active' && s.features[box].kind === 'obstacle') { reject(d, 'shut_in', `it lies in ${s.features[box].name} (${box}), which is not open yet`); return; }
        const id = uniqueObjectId(s, tag, d.name);
        if (holder.entity === 'pc' && ((auth.take || []).length || auth.gather)) grant('player.take');
        emit({ t: 'object.created', d: { object: { id, name: String(d.name).slice(0, 80), kind: d.kind, stack: d.kind === 'resource', qty: d.qty ?? 1, unit: d.unit || null, ...itemTraits(content, d, s.clock.minute), holder, marks: [], for_quests: q ? [q.id] : [], ...(box ? { in: box } : d.in && holder.loc ? { in_name: String(d.in).slice(0, 80) } : {}), source: { turn: s.turn, how: holder.entity === 'pc' ? (((auth.take || []).length || auth.gather) ? 'taken' : 'world_gift') : 'story' } } } });
        objectsNew.set(normText(d.name), id);
    }

    function objectMove(d) {
        const o = objectRef(d.object);
        if (!o) { reject(d, 'object', 'unknown object'); return; }
        const to = holderOf(d.to);
        if (!to) { reject(d, 'object', `unknown receiver ${String(d.to).slice(0, 40)}`); return; }
        // Prototype C (4.3.0-c.6.6.3): the hand-over he set out to make where he went (commands.js give): booked as the story
        // has it change hands, into someone's hands there
        const handOver = o.holder?.entity === 'pc' && conditionals.find((k) => !k.done && k.kind === 'give' && k.object === o.id);
        if (handOver) {
            if (!to.entity || to.entity === 'pc' || !s.scene.present.includes(to.entity) || (handOver.to && handOver.to !== to.entity)) { reject(d, 'pc_inventory', 'he hands it over only to the one he went to, there'); return; }
            handOver.done = true;
            grant('player.give');
            emit({ t: 'object.moved', d: { id: o.id, to } });
            emit({ t: 'cmd.completed', d: { seq: handOver.seq, ok: true, reason: null } });
            return;
        }
        if (to.entity === 'pc' && o.holder?.loc && !(auth.take || []).length) { reject(d, 'pc_inventory', 'what lies here becomes his only by his own take'); return; }
        const box = o.in ? s.features?.[o.in] : o.in_name && o.holder?.loc ? featureNamed(s, o.holder.loc, o.in_name) : null;
        if (to.entity === 'pc' && box?.status === 'active' && box.kind === 'obstacle') { reject(d, 'shut_in', `it lies in ${box.name} (${box.id}), which is not open yet`); return; }
        const part = d.qty && d.qty < (o.qty ?? 1) ? d.qty : null;
        // to him: from where it lies, by his own take; from someone's hands, their gift (the firewall's rules)
        if (to.entity === 'pc') grant(o.holder?.loc ? 'player.take' : 'envelope.give');
        emit({ t: 'object.moved', d: { id: o.id, to, ...(part ? { qty: part, split: `${o.id}_${tag}` } : {}) } });
    }

    /**
     * Patch 3: the amount the story says is the amount (live 18.10.2026: "two silver" reported as 200 cp). The engine
     * reads the words the extractor copied from the reply (said) itself; where they name another sum than the number,
     * the words win and the audit keeps both. Words that are not in the reply are no evidence: then, as without words,
     * the reply's own sums decide (review of c.6.6.11: "nine gold" that the reply never said legitimised 7 cp):
     * - the number is one the reply says (as coin or as a bare number: "two for the bath") -> it stands;
     * - it is exactly one coin unit off the only such sum (200 for "two silver") -> that sum;
     * - the reply names sums, none of them this one -> no evidence: null, nothing is booked or offered at it;
     * - the reply names no sum at all ("presses a few coins into his hand") -> the extractor's number stands: the story
     *   left the amount to the engine's reading, and the booking event keeps it.
     */
    function evidenced(cp, said, d) {
        if (typeof said === 'string' && said.trim()) {
            const flatSaid = normText(said).replace(/[^a-z0-9]+/g, ' ').trim();
            const inReply = !prose || normText(prose).replace(/[^a-z0-9]+/g, ' ').includes(flatSaid);
            const v = inReply ? coinFromWords(said, content) : null;
            if (v !== null) {
                if (v !== cp) emit({ t: 'note', d: { kind: 'amount.corrected', seq: d?.seq ?? 0, type: d?.type ?? null, reported_cp: cp, said: String(said).slice(0, 60), cp: v } });
                return v;
            }
            if (!inReply) emit({ t: 'note', d: { kind: 'amount.unproven', seq: d?.seq ?? 0, type: d?.type ?? null, reported_cp: cp, said: String(said).slice(0, 60), why: 'the words are not in the reply' } });
        }
        if (!prose || !Number.isInteger(cp)) return cp;
        const stated = coinMentions(prose, content);
        if (stated.includes(cp) || numbersIn(prose).has(cp) || !stated.length) return cp;
        const u = content.rules.currency;
        const factors = [u.copper_per_silver, u.copper_per_silver * u.silver_per_gold];
        const near = [...new Set(stated.filter((v) => factors.some((f) => v * f === cp || cp * f === v)))];
        if (near.length !== 1) return null;
        emit({ t: 'note', d: { kind: 'amount.corrected', seq: d?.seq ?? 0, type: d?.type ?? null, reported_cp: cp, said: null, cp: near[0], why: 'one coin unit off the amount the reply states' } });
        return near[0];
    }

    function offer(d) {
        const seller = idOf(d.seller);
        if (!seller || seller === 'pc' || !s.scene.present.includes(seller)) { reject(d, 'offer', `the seller ${String(d.seller).slice(0, 40)} is not present`); return; }
        const priced = d.lines.map((l) => ({ ...l, price_cp: evidenced(l.price_cp, l.said, d) }));
        // a price the reply does not say is not offered (review of c.6.6.11); the seller's other lines stand
        const unproven = priced.filter((l, i) => l.price_cp === null && Number.isInteger(d.lines[i].price_cp));
        if (unproven.length) {
            reject({ ...d, lines: d.lines.filter((l, i) => unproven.includes(priced[i])) }, 'offer', 'a price the reply does not name');
            const correction = `No price was recorded for ${unproven.map((l) => String(l.what).slice(0, 40)).join(', ')}: the last reply names no such sum. A price stands only as the story names it.`;
            if (!corrections.includes(correction)) corrections.push(correction);
        }
        const lines = priced.filter((l) => !unproven.includes(l)).map((l, i) => ({ id: `l${i + 1}`, ...l }));
        if (!lines.length) return;
        // the seller's latest price for the same thing stands: an open offer of theirs for it closes (one price at a
        // time, as for a buyer's bid); an unchanged one stays and is not offered twice
        const same = openOffers(s).filter((o) => !o.bid && !o.canon && o.seller === seller && o.lines.some((x) => lines.some((l) => sameWant(l.what, x.what) && sameWant(x.what, l.what))));
        if (same.length && same.every((o) => lines.every((l) => o.lines.some((x) => sameWant(l.what, x.what) && x.price_cp === l.price_cp && (x.qty ?? 1) === (l.qty ?? 1))))) return;
        for (const o of same) emit({ t: 'offer.closed', d: { id: o.id, status: 'repriced' } });
        const id = `offer.t${tag}.${Object.keys(s.offers).length + 1}`;
        emit({ t: 'offer.created', d: { offer: { id, seller, at: s.scene.at, status: 'open', canon: false, turn: s.turn, lines } } });
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
            bookPurchase(s, emit, { offer: o, picks: pick.picks, cp: price, objectId: (name) => uniqueObjectId(s, tag, name), content });
            counterparts.add(seller);
            emit({ t: 'offer.closed', d: { id, status: 'accepted' } });
            emit({ t: 'decision.closed', d: { id: dec.id, status: 'accepted' } });
            emit({ t: 'cmd.completed', d: { seq: dec.seq, ok: true } });
        }
    }

    /**
     * Prototype C (4.3.0-c.6.6.5): someone names what they would pay Alaric for things he holds (live 15.10.2026: "eight
     * silver for the lot" became an offer to SELL him his own parts). The bid names his things by id and the units of
     * each, and one price for all of them; nothing changes hands until his own acceptance (commands.js offer.accept).
     * The buyer's latest bid stands: an earlier open one of theirs closes.
     */
    function bid(d) {
        const buyer = idOf(d.buyer);
        if (!buyer || buyer === 'pc' || !s.scene.present.includes(buyer)) { reject(d, 'offer', `the buyer ${String(d.buyer).slice(0, 40)} is not present`); return; }
        const lines = [];
        for (const l of d.lines || []) {
            const o = objectRef(l.object);
            if (!o || o.holder?.entity !== 'pc') { reject(d, 'offer', `a bid is for things Alaric holds (${JSON.stringify(l.object).slice(0, 60)} is not his)`); return; }
            const have = lines.find((x) => x.object === o.id);
            const qty = Math.min((have?.qty || 0) + (Number.isInteger(l.qty) && l.qty > 0 ? l.qty : (o.qty ?? 1)), o.qty ?? 1);
            if (have) have.qty = qty;
            else lines.push({ id: `l${lines.length + 1}`, what: o.name, kind: 'goods', service: null, object: o.id, qty, price_cp: null });
        }
        if (!lines.length || !Number.isInteger(d.price_cp)) { reject(d, 'offer', 'a bid names his things and one price'); return; }
        const price = evidenced(d.price_cp, d.said, d);
        if (price === null) { reject(d, 'offer', `${d.price_cp} cp is no sum the reply names`); return; }
        for (const old of openOffers(s).filter((x) => x.bid && x.seller === buyer)) emit({ t: 'offer.closed', d: { id: old.id, status: 'expired' } });
        const id = `offer.t${tag}.${Object.keys(s.offers).length + 1}`;
        emit({ t: 'offer.created', d: { offer: { id, seller: buyer, bid: true, at: s.scene.at, status: 'open', canon: false, turn: s.turn, price_cp: price, lines } } });
        counterparts.add(buyer);
    }

    function coerce(d) {
        const by = idOf(d.by);
        if (!by || by === 'pc' || !s.scene.present.includes(by)) {
            reject(d, 'coerce', 'the one who takes it is not here');
            // 4.3.0-c.6.6.5 (live 15.10.2026: "the south gate took its usual toll of one copper", booked by nobody): the
            // story must not go on as if it was paid
            if (d.coin_cp) {
                const correction = `Alaric's purse did not change: the ${d.coin_cp} cp ${d.kind} of ${String(d.by).slice(0, 60)} in the last reply was not paid (nobody who could take it was there). Do not refer to it as paid; a toll or fee is paid only when the engine books it.`;
                if (!corrections.includes(correction)) corrections.push(correction);
            }
            return;
        }
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
