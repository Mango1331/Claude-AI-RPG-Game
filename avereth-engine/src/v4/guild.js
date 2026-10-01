// Runtime V4: the Adventurers' Guild as engine procedure (docs/RUNTIME_V4_PLAN.md §6.3, §6.4). Everything here is
// engine_resolution in the authority matrix (src/v4/firewall.js): the registration and its canon fee, the plate, the
// board and its listings (from the Board generator, validated and booked before the narrator describes them), the
// acceptance with its contract slip, the turn-in with the proof check, the payout, Quest XP, the contract count and
// the promotion. The narrator only tells what the engine booked; the extractor's deltas cannot change any of it.
import { O, S, I, E, A, N, validate } from './schema.js';
import { extractJsonObject } from './json.js';
import { setFactEvents, perceivers, knows, truth, PC_NAME_FACT } from '../knowledge.js';
import { awardXp, questXp } from '../progression.js';
import { rankOf, rankIndex } from '../derived.js';
import { slug } from '../util.js';
import { hallOf, settlementOf, heldBy, membership, listingsOf, boardKey, today, contracts, supportedRanks, placeName, namesKind, namesPeople, peopleNamed } from './domain.js';

export const REGISTRATION_OFFER = 'offer.registration';
export const PLATE_ID = 'obj.guild_plate';
export const BOARD_VERSION = 'board-4.6';
const QTYPES = ['minor', 'standard', 'dangerous', 'major'];
const VERBS = ['GO', 'FIND', 'TALK', 'GET', 'GATHER', 'GIVE', 'DELIVER', 'USE', 'REPAIR', 'DEFEND', 'ESCORT', 'ATTACK', 'DEFEAT'];

export const feeOf = (content) => content.rules.guild.registration_fee_cp ?? 20;
export const ranksOf = (content) => content.rules.guild.ranks;

/**
 * Everyone present who notices Alaric learns a fact the engine just asserted (the clerk sees the acceptance): the
 * witnesses of an engine resolution, at the step it happens (plan §5.2, P0/S3 E5).
 */
export function witnessEvents(s, factId) {
    const out = [];
    for (const who of perceivers(s)) {
        if (who === 'pc' || s.entities[who]?.kind !== 'npc' || s.scene.awareness[who] === 'unaware' || knows(s, who, factId)) continue;
        out.push({ t: 'knowledge.gained', d: { who, about: factId, stance: 'knows', source: 'witnessed', turn: s.turn, minute: s.clock.minute } });
    }
    return out;
}

/** Assert a public fact about Alaric and let the people present witness it. */
function recordFact(s, emit, { p, o, id }) {
    const ev = setFactEvents(s, { s: 'pc', p, o, source: { kind: 'engine' }, importance: 0.7, id });
    ev.forEach(emit);
    const f = ev.find((e) => e.t === 'fact.asserted')?.d.fact;
    if (f) witnessEvents(s, f.id).forEach(emit);
}

// ------------------------------------------------------------------------------------------------ registration
/**
 * The Guild's two rank scales in one sentence, for the narrator whenever registration comes up (live run 28.09.2026:
 * with only "Power Rank F" in view the clerk said "F-Rank to start, for everyone").
 */
export function rankCanon(content) {
    const g = content.rules.guild.ranks;
    const p = content.rules.ranks.order;
    return `a new member starts at Guild Rank ${g[0]} (the Guild's ranks run ${g[0]} to ${g.at(-1)}); Power Rank (${p[0]} to ${p.at(-1)}) is a person's measured strength, a separate scale the Guild reads but never grants`;
}

/** The canon fee as an open offer and an open decision (plan §6.4: pending until Alaric agrees to pay). */
export function openRegistration(s, content, emit) {
    const fee = feeOf(content);
    if (s.offers[REGISTRATION_OFFER]?.status !== 'open') {
        emit({ t: 'offer.created', d: { offer: { id: REGISTRATION_OFFER, seller: 'guild', at: s.scene.at, status: 'open', canon: true, turn: s.turn, lines: [{ id: 'l1', what: 'Guild registration fee', kind: 'service', service: 'guild_registration', qty: 1, price_cp: fee }] } } });
    }
    if (!s.decisions.some((d) => d.id === 'dec.registration')) emit({ t: 'decision.opened', d: { decision: { id: 'dec.registration', kind: 'registration', what: 'Guild registration', offer: REGISTRATION_OFFER, at: s.scene.at, turn: s.turn, price_cp: fee } } });
    return fee;
}

/** Alaric is registered: Novice, the crystal reads his Power Rank, he receives his plate (one document object). */
export function registerEvents(s, content, emit) {
    const hall = hallOf(s, s.scene.at);
    const power = rankOf(s.entities.pc.sheet.level, content);
    emit({ t: 'guild.registered', d: { rank: 'Novice', branch: settlementOf(s, hall), power_rank: power } });
    if (!s.objects[PLATE_ID]) {
        emit({ t: 'object.created', d: { object: { id: PLATE_ID, name: 'Guild plate', kind: 'document', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [{ text: 'Novice stamp', by: 'guild', turn: s.turn }], for_quests: [], source: { turn: s.turn, how: 'guild' } } } });
    }
    recordFact(s, emit, { p: 'guild_rank', o: 'Novice' });
    // the desk writes his name into the register: whoever registers him knows it (live run 28.09.2026: "My name is
    // Alaric Red" at the counter, a dozing bowman made two listeners, and the clerk "did NOT know his name")
    for (const who of deskStaff(s)) {
        if (!knows(s, who, PC_NAME_FACT)) emit({ t: 'knowledge.gained', d: { who, about: PC_NAME_FACT, stance: 'knows', source: 'told:pc', turn: s.turn, minute: s.clock.minute } });
    }
    return { power };
}

const DESK_ROLE = /\b(?:clerk|registrar|receptionist|desk)\b/i;

/** The people at the Guild's desk: present, noticing him, a clerk, registrar or receptionist by occupation or label. */
function deskStaff(s) {
    return perceivers(s).filter((id) => {
        const e = s.entities[id];
        if (id === 'pc' || e?.kind !== 'npc' || s.scene.awareness[id] === 'unaware') return false;
        return DESK_ROLE.test([truth(s, id, 'occupation')[0]?.o, e.traits, ...(e.descriptors || [])].filter(Boolean).join(' '));
    });
}

// ------------------------------------------------------------------------------------------------ contracts
const slipId = (q) => `obj.slip.${q.id.replace(/^quest\./, '')}`;

/** Accept a listed contract at its hall: active, the clerk logs it, Alaric receives its contract slip. */
export function acceptContract(s, content, q, emit, { step } = {}) {
    emit({ t: 'quest.status', d: { id: q.id, from: q.status, to: 'active', taker: 'pc', at: s.scene.at, step } });
    const b = s.guild.boards[boardKey(q.source?.branch, q.rank)];
    if (b?.listings?.includes(q.id)) emit({ t: 'board.refreshed', d: { key: boardKey(q.source.branch, q.rank), branch: q.source.branch, rank: q.rank, day: b.day, listings: b.listings.filter((x) => x !== q.id) } });
    if (!s.objects[slipId(q)]) {
        emit({ t: 'object.created', d: { object: { id: slipId(q), name: `Guild contract slip: ${q.title}`, kind: 'document', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [q.id], source: { turn: s.turn, how: 'guild' } } } });
    }
    recordFact(s, emit, { p: 'accepted_contract', o: q.title, id: `f.pc.accepted.${q.id}` });
}

/** Legacy/advisory verification check: exact generated proof may still substantiate an older contract, but V4.0.5 no longer requires it when the story has already established the desired quest outcome. */
// what a proof names, without the explanation the generator adds ("boar tusks, one pair per kill" → "boar tusks"), and a
// unit by its first word ("pairs of leg joints" is "pairs"; live runs 30.09.2026 14:56 and 22:41: the trophies in hand
// never matched their proof). How many were killed is the count's matter (contractReady), not the trophies'.
const proofCore = (t) => String(t || '').toLowerCase().split(/[,;:(]|\s[-–—]\s/)[0].trim();
const unitStem = (u) => String(u || '').toLowerCase().trim().split(/\s+/)[0].replace(/(?<!s)s$/, '') || null;

export function checkProof(s, q) {
    const consume = [];
    const held = heldBy(s, 'pc');
    const words = (x) => String(x || '').toLowerCase();
    for (const p of q.proof || []) {
        if (p.kind === 'object') {
            const need = p.qty ?? 1;
            const matches = held.filter((x) => words(x.name).includes(proofCore(p.what)) && unitStem(x.unit) === unitStem(p.unit));
            const have = matches.reduce((n, x) => n + (x.qty ?? 1), 0);
            if (have < need) return { ok: false, reason: `${need} ${p.unit ?? ''} of ${p.what} missing (has ${have})`.replace(/\s+/g, ' ') };
            if (p.consume !== false) {
                let left = need;
                for (const o of matches) {
                    if (left <= 0) break;
                    const qty = Math.min(left, o.qty ?? 1);
                    consume.push({ id: o.id, qty });
                    left -= qty;
                }
            }
        } else if (p.kind === 'mark') {
            const doc = held.find((x) => (x.marks || []).some((m) => words(m.text).includes(words(p.what)) || words(p.what).includes(words(m.text))));
            if (!doc) return { ok: false, reason: `the mark "${p.what}" is missing` };
        }
    }
    return { ok: true, consume };
}

export function proofText(q) {
    if (!(q.proof || []).length) return 'no fixed verification listed';
    return q.proof.map((p) => (p.kind === 'object' ? `${p.qty ?? 1} ${p.unit ?? ''} of ${p.what}`.replace(/\s+/g, ' ') : `"${p.what}" on the ${p.on || 'contract slip'}`)).join(' and ');
}

/**
 * The engine's count for a contract's DEFEAT objectives with a number (live 30.09.2026 14:56: three bog striders
 * died, four pairs of leg joints lay in the pack, the story said "four adults, all told"): the creatures of the named
 * kind that died since the contract was taken. Trophies are no count; the story may still reach the outcome otherwise
 * (the rest fled for good), and quest.ready then says how (src/v4/world.js).
 * @returns {{what: string, qty: number, done: number}[]}
 */
export function defeatTally(s, content, q) {
    const since = (q.history || []).find((h) => h.status === 'active')?.turn ?? 0;
    const dead = Object.values(s.entities).filter((e) => e.kind === 'creature' || e.kind === 'npc').filter((e) => {
        const f = truth(s, e.id, 'status')[0];
        return f?.o === 'dead' && (f.since?.turn ?? 0) >= since;
    });
    return (q.objectives || []).filter((o) => o.verb === 'DEFEAT' && Number.isInteger(o.qty) && o.qty > 0).map((o) => {
        // animals and monsters by their kind; people by their role ("raiders": a dead brigand counts, review of 4.1.3:
        // 4.1.2 counted creatures only, so five dead bandits made 0 of 5)
        const people = peopleNamed(o.what, content);
        const counts = (e) => (people.size
            ? e.kind === 'npc' && (e.descriptors || []).some((d) => [...peopleNamed(d, content)].some((t) => people.has(t)))
            : e.kind === 'creature' && namesKind(o.what, e.species || '', content.anchors.get(e.anchor || e.profile?.anchor)));
        return { what: o.what, qty: o.qty, done: dead.filter(counts).length };
    });
}

/** "3 of 4 bog striders": the tally as the engine block and the catalog show it. */
export const tallyText = (tally) => tally.map((t) => `${t.done} of ${t.qty} ${t.what}`).join('; ');

// What a quest note may not keep as memory (the engine's status, payout, XP and rank of a contract): one clause rule
// for every free-text store, in src/v4/ownership.js (Gen 3.5 Decision Ownership)
export { engineClause, claimedStatus } from './ownership.js';
/** The correction when the story claimed a state the contract is not in (it keeps the engine's). */
export function statusCorrection(q) {
    const state = {
        listed: 'still LISTED on the Guild board: Alaric has not accepted it and nothing is logged for him',
        offered: 'only OFFERED: he has not accepted it', active: 'ACTIVE: accepted, not yet turned in, nothing paid',
        completed: 'COMPLETED: turned in and paid once', failed: 'FAILED', abandoned: 'given up',
    }[q.status] || q.status;
    return `"${q.title}" is ${state} (the engine's state; the story does not change it).`;
}

/** The DEFEAT objectives whose number the engine's count has not reached yet. */
export const countShort = (s, content, q) => defeatTally(s, content, q).filter((t) => t.done < t.qty);

const NOT_READY_COUNT = 'NOT READY FOR TURN-IN: fewer defeated than named and no other way the outcome was reached is established';
/**
 * The readiness the catalog and the quest memory show (src/v4/catalog.js, src/context.js): what the desk would do now
 * (contractReady), so that shown and done agree (review of 4.1.3: the listed proof in hand with the full count is
 * accepted at the desk before any quest.ready). A story readiness the count holds back (a campaign of a build before
 * 4.1.2) shows as not ready.
 */
export function readyText(s, content, q) {
    const r = contractReady(s, content, q);
    if (r.ok) return `READY FOR TURN-IN: ${r.mode === 'story_outcome' ? q.ready_note || 'desired outcome achieved' : `the listed proof is in hand (${proofText(q)})`}`;
    return q.ready ? NOT_READY_COUNT : null;
}

// A hunt or cull contract's work is killing animals or monsters: ATTACK/DEFEAT, and besides them only finding and
// reaching the targets (FIND, GO) or protecting what they threaten (DEFEND "the weir platforms and eel boats"). Other
// work beside the kills (REPAIR the old watch post, DELIVER, ESCORT, GATHER, GET, GIVE, USE, TALK) makes it mixed work,
// whose other parts keep their own proof (review of 4.1.2); a fight or search against people ("FIND bandits", "DEFEAT
// bandits") is no hunt either: body parts are no proof for people (review of 4.1.3).
const KILL_WORK = new Set(['ATTACK', 'DEFEAT']);
const HUNT_SUPPORT = new Set(['FIND', 'GO', 'DEFEND']);
// An objective whose only work is having the result confirmed, signed, witnessed or inspected ("TALK Harl Cotter to
// confirm the losses have stopped", live 30.09.2026 22:41) is no work of its own beside the kills: a hunt is proven by
// the trophies at a Guild hall. A talk that is work (asking where the pack dens) keeps its place and makes it mixed.
const CONFIRMS = /\b(?:confirm\w*|sign(?:s|ed|ing|ature|atures|-?off)?|countersign\w*|verif\w*|vouch\w*|witness\w*|inspect\w*|attest\w*|receipt)\b/i;
const confirmsOnly = (o) => ['TALK', 'GET', 'GIVE'].includes(o.verb) && CONFIRMS.test(o.what || '');
/** A hunt or cull contract (proof: trophies of the kills, no local sign-off); mixed work and work against people are none. */
export const isHunt = (q, content) => {
    const objectives = (q.objectives || []).filter((o) => !confirmsOnly(o));
    return objectives.some((o) => KILL_WORK.has(o.verb)) && objectives.every((o) => KILL_WORK.has(o.verb) || HUNT_SUPPORT.has(o.verb))
        && !objectives.some((o) => (KILL_WORK.has(o.verb) || o.verb === 'FIND') && namesPeople(o.what, content));
};
/** A generated listing as the Guild books it: a hunt without the confirmation errands the generator added anyway. */
export const huntObjectives = (l, content) => (isHunt(l, content) ? l.objectives.filter((o) => !confirmsOnly(o)) : l.objectives);
/** The trophies a hunt is proven by (its object proofs), else the kills' own. */
export const trophyText = (q) => {
    const objects = (q.proof || []).filter((p) => p.kind === 'object');
    return objects.length ? proofText({ proof: objects }) : 'trophies of the kills';
};

/** Canonical objectives in compact narrator-facing prose (the Board generator owns their structure). */
export function objectiveText(q) {
    const objectives = q?.objectives || [];
    if (!objectives.length) return 'the stated objective';
    return objectives.map((o) => {
        const qty = o.qty !== null && o.qty !== undefined ? `${o.qty}${o.unit ? ` ${o.unit}` : ''} ` : '';
        const where = o.where ? ` at ${o.where}` : '';
        return `${String(o.verb || 'DO').toUpperCase()} ${qty}${o.what || 'the objective'}${where}`.replace(/\s+/g, ' ').trim();
    }).join('; ');
}

/**
 * Whether the Guild accepts a contract now: the one check behind every way to complete it (the turn-in at the desk,
 * the turn-in on arriving at a hall, the line that announces a turn-in on the way). The outcome is established (the
 * story's quest.ready, or the listed proof in hand), and a DEFEAT objective with a number has its kills by the
 * engine's count, unless the story established how the outcome was reached otherwise (quest.ready's alternative).
 * Trophies in hand are no count (review of 4.1.2: four pairs of leg joints from three kills completed the contract by
 * its proof, although the count refused its quest.ready).
 * @returns {{ok: boolean, mode: 'story_outcome'|'legacy_verification'|'not_ready'|'count_short', reason: string|null, consume: object[]}}
 */
export function contractReady(s, content, q) {
    const legacy = (q.proof || []).length > 0 ? checkProof(s, q) : { ok: false, consume: [] };
    const mode = q.ready ? 'story_outcome' : legacy.ok ? 'legacy_verification' : 'not_ready';
    if (mode === 'not_ready') return { ok: false, mode, reason: 'the contract outcome has not yet been established as achieved in the world', consume: [] };
    const short = countShort(s, content, q);
    if (short.length && !(q.ready && q.ready_alternative)) {
        return { ok: false, mode: 'count_short', reason: `the engine counts ${tallyText(short)} defeated and the story has not established that the outcome was reached otherwise; trophies are no count`, consume: [] };
    }
    return { ok: true, mode, reason: null, consume: mode === 'legacy_verification' ? legacy.consume : [] };
}

/** Turn a contract in at a Guild hall: its readiness (contractReady), then deterministic payout/XP/count. */
export function completeContract(s, content, q, emit, { step } = {}) {
    const check = contractReady(s, content, q);
    emit({ t: 'proof.checked', d: { quest: q.id, ok: check.ok, reason: check.reason, mode: check.mode } });
    if (!check.ok) return { ok: false, reason: check.reason };
    // Exact generated proof is only a backwards-compatible path. When story-readiness exists, items/marks are
    // continuity evidence, not mandatory tokens and are not auto-consumed by string matching.
    for (const x of check.consume) emit({ t: 'object.consumed', d: { id: typeof x === 'string' ? x : x.id, by: 'guild', ...(typeof x === 'object' ? { qty: x.qty } : {}) } });
    const sheet = s.entities.pc.sheet;
    const pay = q.payout_cp || 0;
    if (pay) {
        emit({ t: 'coin.changed', d: { id: 'pc', value: sheet.coin_cp + pay, delta: pay, why: `Guild payout: ${q.title}` } });
        // the engine's credit, by place: the payout the clerk counts out on the counter is this coin (src/v4/world.js)
        emit({ t: 'transaction.completed', d: { to: 'pc', from: 'guild', cp: pay, for: q.title, at: s.scene.at } });
    }
    const xp = q.level ? questXp(q.level, q.qtype || 'standard', content) : 0;
    if (xp) awardXp(s.entities.pc.sheet, xp, content, `Quest XP: ${q.title}`).forEach(emit);
    emit({ t: 'quest.status', d: { id: q.id, from: q.status, to: 'completed', at: s.scene.at, step } });
    recordFact(s, emit, { p: 'completed_contract', o: q.title, id: `f.pc.completed.${q.id}` });
    return { ok: true, pay, xp, ready: !!q.ready, verification: q.ready_note || null };
}

// ------------------------------------------------------------------------------------------------ board
/**
 * A Board generator is needed when a branch's board for a rank was never filled, or on the first look of a later day
 * when it holds fewer than its size (plan §6.4: at least five per branch and rank; the listings seen stay, the day's
 * change is no reroll, only the gaps are filled). Within one day the board stays as seen.
 */
export function boardNeed(s, content, { rank = null } = {}) {
    const hall = hallOf(s, s.scene.at);
    if (!hall) return null;
    const branch = settlementOf(s, hall);
    const r = rank || membership(s)?.rank || 'Novice';
    if (!supportedRanks(s, content, branch).includes(r)) return null;
    const board = s.guild.boards[boardKey(branch, r)];
    if (board && board.day >= today(s)) return null;
    const size = content.rules.guild.board?.size ?? 5;
    const have = listingsOf(s, branch, r);
    const missing = size - have.length;
    return missing > 0 ? { branch, rank: r, missing, day: today(s), have: have.map((q) => q.title) } : null;
}

const OBJECTIVE = O({ verb: E(VERBS), what: S(), qty: N(I(1)), unit: N(S()), where: N(S()) });
const PROOF = O({ kind: E(['object', 'mark']), what: S(), qty: N(I(1)), unit: N(S()), on: N(S()), consume: N({ type: 'boolean' }) });

export function listingSchema(content) {
    return O({
        listings: A(O({
            title: S(), client: S(), rank: E(ranksOf(content)), level: I(1, 104), qtype: E(QTYPES), payout_cp: I(0),
            task: N(S()), desired_end_state: S(), objectives: A(OBJECTIVE, 1), proof: A(PROOF),
        })),
    });
}

/** The Board generator's call (plan §3.2): the missing listings of one branch and rank. */
export function boardRequest(s, content, need) {
    const [lo, hi] = content.rules.guild.rank_levels[need.rank];
    const guide = content.rules.guild.board?.payout_guide_cp?.[need.rank];
    const town = s.places[need.branch];
    const realm = town?.realm && s.places[town.realm] ? s.places[town.realm].name : null;
    const noviceProfile = need.rank === 'Novice' ? [
        'NOVICE TEST PROFILE:',
        '- Keep Novice work practical and immediately playable. For a fresh five-listing board: at least 2 listings are explicit Monster culling/clearance jobs whose obvious intended route can lead directly to combat; at least 1 is an escort whose route leaves the settlement; at least 1 is a delivery/courier job whose destination leaves the settlement; the fifth is another culling, escort or delivery job.',
        '- Monster culling/clearance names a concrete creature threat and a concrete place/problem to clear, kill, drive off or make safe. Do not disguise both combat slots as open-ended investigations into an unknown culprit.',
        '- Escort and delivery jobs must involve real travel beyond the city/settlement rather than a safe errand between two buildings in town. Route trouble may emerge naturally from the world; do not pre-script a mandatory ambush.',
        '- For partial Board refills, prefer these same three job families and avoid filling the Novice Board with administrative errands, pure paperwork, abstract mysteries or local chores that provide little opportunity to test travel/combat gameplay.',
    ] : [];
    const system = [
        "You write the official contracts on an Adventurers' Guild board in a sandbox fantasy RPG. The engine books exactly what you return as canon; the narrator will only describe these listings. Write no story.",
        '',
        'Rules:',
        '- A contract is a concrete request to change a current situation in the world. Build it from: cause (why now), stakeholder/client, current problem, desired end state, 1–4 useful objective memories, and reward. Verification is optional story guidance, not a mandatory token.',
        '- task is what the notice asks the adventurer to do, one imperative sentence the board shows ("Hunt and cull the bog strider colony at the eel-weirs of the Reed Flats so the eel boats can launch safely again."). desired_end_state is the outcome the Guild recognizes when it is reached ("The bog strider colony is culled and the eel boats launch again."). Keep the two apart.',
        '- A hunt or cull contract (its work is killing animals or monsters: ATTACK/DEFEAT, with FIND/GO to reach the targets or DEFEND for what they threaten) is proven by a species-appropriate body part of each kill (ears, teeth, claws, leg joints …) as its one proof entry. Add no local inspection, witness, sign-off or signature for it. Mixed work (repair the old watch post and clear out what nests in it) keeps a fitting proof for each part: trophies for the kills, a receipt or sign-off only where its other work naturally needs one. Work against people (bandits, raiders, deserters) is no hunt: its proof fits the job (a leader\'s token, recovered goods, the reeve\'s word), never body parts.',
        '- Rank limits scope, risk and complexity — not whether the subject is mundane or fantastical. Low-rank work may involve a manageable Monster, minor magic or a minor ruin, one dangerous animal, or a small clearly defined weak group such as wolves, goblins or feral dogs.',
        '- Do not preferentially default to rats, cellar vermin or indistinct swarms. Rats are allowed occasionally, not the standard low-rank combat answer.',
        '- The listings generated together must differ materially in underlying problem, location and likely play experience. Outside an explicit rank profile, do not make a balanced checklist of predefined quest categories.',
        '- Let contracts arise from this branch and its surroundings: local trades, roads, wilderness, factions, ruins, ecology, magic and already-established places. Nothing world-shaking at low rank.',
        '- Structural example only: a livestock owner reports repeated pen break-ins; identify the threat and stop the losses, with proof appropriate to whether it is killed or driven away. This demonstrates cause, modest scope, alternate solutions and verifiable completion.',
        '- Structural example only: a survey team failed to return from abandoned workings; locate them, rescue survivors if possible, and recover an official seal. What happened is not predetermined by the contract and emerges in play.',
        '- These examples demonstrate structure only. Do not reuse their people, locations, creatures, objects, circumstances or exact objective sequence.',
        ...noviceProfile,
        `- rank is "${need.rank}"; level is the quest level, an integer from ${lo} to ${hi}; qtype is minor, standard, dangerous or major.`,
        `- payout_cp is the Guild's one fixed payout in copper (1 silver = 10 copper)${guide ? `; for ${need.rank} work ${guide[0]}–${guide[1]} cp is usual (a guide, not a limit)` : ''}.`,
        '- 1 to 4 objectives: {verb, what, qty, unit, where}; verb is one of GO, FIND, TALK, GET, GATHER, GIVE, DELIVER, USE, REPAIR, DEFEND, ESCORT, ATTACK, DEFEAT. These are continuity memories for play, not a rigid checklist the narrator must force in order.',
        '- proof contains 0–2 optional verification examples the Guild could recognize. Prefer [] when return, witnesses or a credible report can establish the outcome naturally. If used, EVERY entry must be an object with all fields present: {"kind":"object"|"mark","what":"...","qty":integer>=1|null,"unit":string|null,"on":string|null,"consume":true|false|null}. These are story guidance, NOT exclusive completion tokens.',
        '- Do not use GO merely as a travel checklist item. Objectives should describe meaningful work/outcomes (find, rescue, repair, defend, escort, investigate through FIND/TALK/GET, defeat, deliver, etc.); travel itself is normally just how play reaches them. Do not invent paperwork solely to make verification possible.',
        '- client is who posted the work (a person, a trade, a hamlet); titles differ from the listings already on the board.',
        '',
        'Return only one JSON object, no prose before or after it, no code fences: {"listings": [{"title": "...", "client": "...", "rank": "...", "level": 1, "qtype": "...", "payout_cp": 0, "task": "...", "desired_end_state": "...", "objectives": [...], "proof": [...]}]}. Every field is required; null where a field allows it and does not apply.',
    ].join('\n');
    const user = [
        `BRANCH: ${town?.name || need.branch}${realm ? `, ${realm}` : ''} (${town?.sub || 'settlement'})`,
        `RANK: ${need.rank} · DAY ${need.day}`,
        `ON THE BOARD ALREADY: ${need.have.length ? need.have.join(' | ') : 'nothing'}`,
        `WRITE: ${need.missing} new listing${need.missing > 1 ? 's' : ''}.`,
    ].join('\n');
    return { system, user, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };
}

/** Read the generator's answer: the listings that pass the hard checks, the rest refused with a reason. */
export function parseBoard(answer, content, need) {
    const { value, error } = extractJsonObject(answer);
    if (!value) return { listings: null, errors: [error || 'no JSON object'] };
    // a listing without its board text is still a listing: the board then shows the desired end state (as before 4.1.2)
    for (const l of Array.isArray(value.listings) ? value.listings : []) if (l && typeof l === 'object' && l.task === undefined) l.task = null;
    const errors = validate(value, listingSchema(content));
    if (errors.length) return { listings: null, errors: errors.slice(0, 8) };
    const [lo, hi] = content.rules.guild.rank_levels[need.rank];
    const ok = [];
    const refused = [];
    for (const l of value.listings) {
        const why = l.rank !== need.rank ? `rank ${l.rank} is not ${need.rank}` : l.level < lo || l.level > hi ? `level ${l.level} outside ${lo}–${hi}` : l.objectives.length > 4 ? 'more than 4 objectives' : l.proof.length > 2 ? 'more than 2 verification examples' : null;
        if (why) refused.push({ title: l.title, why });
        else ok.push(l);
    }
    return { listings: ok.slice(0, need.missing), refused, errors: [] };
}

/** Book validated listings: quest.created (listed) for each, and the board. The payout is fixed from here on. */
export function bookBoard(s, content, need, listings, emit) {
    const ids = [];
    const guide = content.rules.guild.board?.payout_guide_cp?.[need.rank];
    for (const l of listings) {
        // the generator never names ids (its schema has none); a fixture's own id (tests) is kept when it is free
        let id = typeof l.id === 'string' && /^quest\.[a-z0-9_]+$/.test(l.id) && !s.quests[l.id] ? l.id : `quest.${slug(l.title) || 'contract'}`;
        for (let n = 2; s.quests[id] || ids.includes(id); n++) id = `quest.${slug(l.title) || 'contract'}_${n}`;
        const quest = {
            id, title: String(l.title).slice(0, 80), kind: 'guild_contract', client: String(l.client || '').slice(0, 80) || null, giver: null,
            rank: need.rank, level: l.level, qtype: l.qtype, payout_cp: l.payout_cp, reward: `${l.payout_cp} cp`,
            task: l.task ? String(l.task).slice(0, 240) : null, desired_end_state: l.desired_end_state, objectives: huntObjectives(l, content).map((o, i) => ({ id: `o${i + 1}`, ...o, status: 'open' })),
            proof: l.proof.map((p, i) => ({ id: `p${i + 1}`, ...p, consume: p.kind === 'object' ? p.consume !== false : undefined })),
            source: { board: `${need.branch}.guild_hall`, branch: need.branch, listed: { turn: s.turn, minute: s.clock.minute, day: need.day } },
            schedule: { starts_at: null, deadline: null }, status: 'listed', taker: null, history: [{ turn: s.turn, minute: s.clock.minute, status: 'listed' }],
            details: [], notes: [], ...(guide && (l.payout_cp < guide[0] || l.payout_cp > guide[1]) ? { audit: [`payout ${l.payout_cp} cp outside the guide ${guide[0]}–${guide[1]} cp`] } : {}),
        };
        emit({ t: 'quest.created', d: { quest } });
        ids.push(id);
    }
    const key = boardKey(need.branch, need.rank);
    const before = (s.guild.boards[key]?.listings || []).filter((id) => s.quests[id]?.status === 'listed');
    emit({ t: 'board.refreshed', d: { key, branch: need.branch, rank: need.rank, day: need.day, listings: [...before, ...ids] } });
    return ids;
}

/**
 * Other adventurers take work (plan §6.4, D9; PROPOSED rate): on the first look at a board on a later day, each listing
 * listed on an earlier day is gone with the configured chance, drawn with the engine's dice.
 */
export function takenByOthers(s, content, branch, rank, dice, emit) {
    const pct = content.rules.guild.board?.taken_by_others_pct_per_day ?? 0;
    const key = boardKey(branch, rank);
    const b = s.guild.boards[key];
    const day = today(s);
    if (!b || !pct || b.day >= day) return [];
    const gone = [];
    for (const q of listingsOf(s, branch, rank)) {
        const days = day - (q.source?.listed?.day ?? b.day);
        let taken = false;
        for (let i = 0; i < days && !taken; i++) taken = dice.d100(`board ${q.id}`) <= pct;
        if (taken) {
            emit({ t: 'quest.status', d: { id: q.id, from: 'listed', to: 'taken_by_other', by: 'board' } });
            gone.push(q.id);
        }
    }
    emit({ t: 'board.refreshed', d: { key, branch, rank, day, listings: b.listings.filter((id) => !gone.includes(id) && s.quests[id]?.status === 'listed') } });
    return gone;
}

// ------------------------------------------------------------------------------------------------ promotion
/** Promotion eligibility, derived, never stored (plan §6.4, UID 65). */
export function promotion(s, content) {
    const m = membership(s);
    if (!m) return { eligible: false, reason: 'not a Guild member' };
    const ranks = ranksOf(content);
    const next = ranks[ranks.indexOf(m.rank) + 1];
    if (!next) return { eligible: false, reason: `${m.rank} is the highest rank` };
    const need = content.rules.guild.promotion_contracts ?? 5;
    const done = contracts(s).filter((q) => q.status === 'completed' && q.rank === m.rank).length;
    const power = rankOf(s.entities.pc.sheet.level, content);
    const min = content.rules.guild.rank_power?.[next];
    const powerOk = !min || rankIndex(power, content) >= rankIndex(min, content);
    const text = `Guild Rank ${m.rank} · ${done}/${need} ${m.rank} contracts · Power Rank ${power}${min ? ` (${next} needs ${min})` : ''}`;
    if (done < need) return { eligible: false, next, reason: `${done}/${need} ${m.rank} contracts completed`, text };
    if (!powerOk) return { eligible: false, next, reason: `Power Rank ${power}; ${next} needs ${min}`, text };
    return { eligible: true, next, text };
}

export const hallName = (s, id) => placeName(s, id);
