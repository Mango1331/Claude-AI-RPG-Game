// Runtime V4: the Adventurers' Guild as engine procedure (docs/RUNTIME_V4_PLAN.md §6.3, §6.4). Everything here is
// engine_resolution in the authority matrix (src/v4/firewall.js): the registration and its canon fee, the plate, the
// board and its listings (from the Board generator, validated and booked before the narrator describes them), the
// acceptance with its contract slip, the turn-in with the proof check, the payout, Quest XP, the contract count and
// the promotion. The narrator only tells what the engine booked; the extractor's deltas cannot change any of it.
import { rulesetOf as deliveryRuleset } from '../content.js';
import { deliveryStatus, confirmsOnly, nonphysicalDelivery, deliveryWhere, genericRecipient } from './delivery.js';
import { nearDungeons, dungeonText, rankText, guildRecord, trueDungeonOf } from './dungeon.js';
import { clearOf, clearDone, clearTarget, cullPopulation, slotNameOf, floorAt } from './living.js';
import { O, S, I, E, A, N, validate } from './schema.js';
import { extractJsonObject } from './json.js';
import { setFactEvents, perceivers, knows, truth, PC_NAME_FACT } from '../knowledge.js';
import { awardXp, questXp } from '../progression.js';
import { rankOf, rankIndex } from '../derived.js';
import { slug, normText, hash32 } from '../util.js';
import { hallOf, settlementOf, realmOf, heldBy, membership, listingsOf, boardKey, today, contracts, supportedRanks, placeName, namesKind, namesPeople, peopleNamed, sameKinds, namesYoung } from './domain.js';

export const REGISTRATION_OFFER = 'offer.registration';
export const PLATE_ID = 'obj.guild_plate';
export const BOARD_VERSION = 'board-5.0';
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
export function openRegistration(s, content, emit, at = s.scene.at) {
    const fee = feeOf(content);
    if (s.offers[REGISTRATION_OFFER]?.status !== 'open') {
        emit({ t: 'offer.created', d: { offer: { id: REGISTRATION_OFFER, seller: 'guild', at, status: 'open', canon: true, turn: s.turn, lines: [{ id: 'l1', what: 'Guild registration fee', kind: 'service', service: 'guild_registration', qty: 1, price_cp: fee }] } } });
    }
    if (!s.decisions.some((d) => d.id === 'dec.registration')) emit({ t: 'decision.opened', d: { decision: { id: 'dec.registration', kind: 'registration', what: 'Guild registration', offer: REGISTRATION_OFFER, at, turn: s.turn, price_cp: fee } } });
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

/**
 * Prototype C (setting 'planner'): give up a Guild contract. At the desk its slip goes back to the Guild; elsewhere he
 * keeps it. Never a payout, Quest XP, completion or contract credit.
 */
export function abandonContract(s, q, emit, { step, desk = false } = {}) {
    if (q.status === 'active') emit({ t: 'quest.status', d: { id: q.id, from: 'active', to: 'abandoned', at: s.scene.at, step } });
    const slip = s.objects[slipId(q)];
    if (desk && slip?.holder?.entity === 'pc') emit({ t: 'object.consumed', d: { id: slip.id, by: 'guild' } });
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
 * Prototype C (4.3.0-c.6.6.6, live 18.10.2026: two feral hounds killed, the count said 0 of 4): the kind is the
 * objective's words or its unit ("feral dogs of the pack", unit "hounds"), with the words content holds as one kind
 * (dog = hound); the young of the kind (the pack's pups) count only when the objective names them; and where the
 * contract allows driving them off, each one the engine saw flee a fight (fled) counts as driven off. One the story
 * only lets walk out of the scene is not counted: quest.ready's alternative says how the outcome was reached then.
 * @returns {{what: string, qty: number, done: number, killed: number, driven: number}[]}
 */
export function defeatTally(s, content, q) {
    const since = (q.history || []).find((h) => h.status === 'active')?.turn ?? 0;
    const status = (e) => truth(s, e.id, 'status')[0];
    const beings = Object.values(s.entities).filter((e) => e.kind === 'creature' || e.kind === 'npc');
    const dead = beings.filter((e) => status(e)?.o === 'dead' && (status(e).since?.turn ?? 0) >= since);
    const fled = drivesOff(content, q) ? beings.filter((e) => status(e)?.o !== 'dead' && e.fled && (e.fled.turn ?? 0) >= since) : [];
    const same = sameKinds(content);
    // Patch 8: where a death counts for this contract: in the Dungeon (and level) it names, else in its branch's land
    // (wolves along the way to the den are the same hunt; a wolf of another realm is not). Only beings met in his own
    // story count: the companies of a Living Dungeon never make entities, so what they kill never fills his count
    const area = areaOf(s, q);
    return (q.objectives || []).filter((o) => o.verb === 'DEFEAT' && Number.isInteger(o.qty) && o.qty > 0).map((o) => {
        // animals and monsters by their kind; people by their role ("raiders": a dead brigand counts, review of 4.1.3:
        // 4.1.2 counted creatures only, so five dead bandits made 0 of 5)
        const people = peopleNamed(o.what, content);
        // Patch 8.3: by its kind and its part in a Dungeon's encounter, the rule the board's count was fixed by (cullKind)
        const kind = (e) => cullKind(content, o, { species: e.species, anchor: e.anchor || e.profile?.anchor, role: e.slot?.role, title: slotNameOf(s, e), name: e.name }, same);
        const counts = (e) => area(e) && (people.size
            ? e.kind === 'npc' && (e.descriptors || []).some((d) => [...peopleNamed(d, content)].some((t) => people.has(t)))
            : e.kind === 'creature' && kind(e));
        const killed = dead.filter(counts).length;
        const driven = fled.filter(counts).length;
        return { what: o.what, qty: o.qty, done: killed + driven, killed, driven };
    });
}

/**
 * Patch 8: the area a contract's kills count in (coarse on purpose): the Dungeon (and level) it is to clear, else the
 * land of the branch that posted it. A being with no known place counts (an older campaign's).
 */
function areaOf(s, q) {
    const clear = clearOf(s, q);
    const where = (e) => e.met_at || e.left?.at || e.at || e.location || null;
    if (clear) return (e) => { const p = where(e); return !p || !s.places[p] || trueDungeonOf(s, p) === clear.dungeon; };
    // Patch 8.3: a cull booked for a Dungeon (Patch 8.1: q.dungeon, q.floor) counts in it, on its level where it names
    // one: an encounter's creature by the level its slot belongs to, another by the place it was met at (the gate is
    // no level). Before, such a cull counted in the branch's whole land, as a hunt outside does
    if (q.dungeon && s.places[q.dungeon]?.dungeon?.real) {
        const level = Number.isInteger(q.floor) ? q.floor : null;
        return (e) => {
            if (e.slot?.dungeon) return e.slot.dungeon === q.dungeon && (level === null || e.slot.floor === level);
            const p = where(e);
            return !p || !s.places[p] || (trueDungeonOf(s, p) === q.dungeon && (level === null || floorAt(s, p) === level));
        };
    }
    const realm = q.source?.branch ? realmOf(s, q.source.branch) : null;
    if (!realm) return () => true;
    return (e) => { const p = where(e); return !p || !s.places[p] || !realmOf(s, p) || realmOf(s, p) === realm; };
}

/**
 * Patch 8: what a contract's goal is, as the board, the catalog and the HUD show it: "(4)" for a cull with its number
 * (on the board), "— 2/4 defeated" once taken; "— Clear Old Crown Catacombs, level 1" for a Dungeon level, with its
 * state once taken. Empty for other work.
 */
export function goalText(s, content, q, { board = false } = {}) {
    const clear = clearOf(s, q);
    if (clear) {
        const name = s.places[clear.dungeon]?.name || clear.dungeon;
        if (board || q.status !== 'active') return ` — Clear ${name}, level ${clear.floor}`;
        return ` — Clear ${name}, level ${clear.floor}: ${clearDone(s, q).text}`;
    }
    const kills = (q.objectives || []).filter((o) => o.verb === 'DEFEAT' && Number.isInteger(o.qty) && o.qty > 0);
    if (!kills.length) return '';
    if (board || q.status !== 'active') return ` (${kills.map((o) => o.qty).join(' + ')})`;
    return ` — ${defeatTally(s, content, q).map((t) => `${t.done}/${t.qty} defeated`).join(', ')}`;
}

/** Does the contract allow its targets to be driven off ("driven off or destroyed", "Clear the hounds from …")? */
export function drivesOff(content, q) {
    const w = content.rules.guild?.drive_off;
    if (!w) return false;
    const re = new RegExp(`\\b(?:${w.verbs})\\b(?:\\s+[a-z'-]+){0,3}?\\s+(?:${w.after})\\b|\\b(?:${w.alone})\\b`, 'i');
    return re.test([q.title, q.desired_end_state, q.description].filter(Boolean).join(' '));
}

/** "3 of 4 bog striders": the tally as the engine block and the catalog show it. */
export const tallyText = (tally) => tally.map((t) => `${t.done} of ${t.qty} ${t.what}${t.driven ? ` (${t.killed} killed, ${t.driven} driven off)` : ''}`).join('; ');

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
export function readyText(s, content, q, { c = false } = {}) {
    const r = contractReady(s, content, q, { c });
    if (r.ok) return `READY FOR TURN-IN: ${r.mode === 'dungeon_clear' ? 'he cleared the level' : r.mode === 'story_outcome' ? q.ready_note || 'desired outcome achieved' : r.mode === 'goods' ? `the goods are in his hands (${goodsText(q)})` : `the listed proof is in hand (${proofText(q)})`}`;
    // Prototype C (4.3.0-c.6): the story's readiness that the goods do not bear out (not in his hands, not handed over)
    if (c && ((q.ready && (r.mode === 'goods_missing' || r.mode === 'not_delivered')) || r.mode === 'not_cleared')) return `NOT READY FOR TURN-IN: ${r.reason}`;
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
// "Witness" counts as the act (have it witnessed, witness the kill), not as the people to ask; an objective that asks
// something (where the beasts den, about the sightings) is inquiry, real work (review of 4.1.5)

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

/** Patch 8.4: a word with its plain singular forms ("beetles": beetle; "wolves": wolf; "flies": fly), to tell one kind. */
const wordForms = (w) => [...new Set([w, w.replace(/s$/, ''), w.replace(/es$/, ''), w.replace(/ies$/, 'y'), w.replace(/ves$/, 'f')])];

/**
 * An objective's amount and what it is about, as prose. Patch 8.4 (live 22.10.2026: "DEFEAT 4 beetles crystal beetles in
 * the outer galleries"): a unit the what already names is said once ("4 crystal beetles …"; "the sealed ledger satchel
 * (1)"); a unit of its own stays ("2 casks ale").
 */
export function amountText(o) {
    const what = o.what || 'the objective';
    if (o.qty === null || o.qty === undefined) return what;
    const unit = o.unit ? normText(o.unit).split(' ').at(-1) : null;
    const theUnit = new Set(unit ? wordForms(unit) : []);
    if (!unit || !normText(what).split(' ').some((w) => wordForms(w).some((f) => theUnit.has(f)))) return `${o.qty}${o.unit ? ` ${o.unit}` : ''} ${what}`;
    return /^(?:the|a|an|his|her|their|its|this|that|these|those|my|our)\b/i.test(what) ? `${what} (${o.qty})` : `${o.qty} ${what}`;
}

/** Canonical objectives in compact narrator-facing prose (the Board generator owns their structure). */
export function objectiveText(q) {
    const objectives = q?.objectives || [];
    if (!objectives.length) return 'the stated objective';
    return objectives.map((o) => {
        const where = o.where ? ` at ${o.where}` : '';
        return `${String(o.verb || 'DO').toUpperCase()} ${amountText(o)}${where}`.replace(/\s+/g, ' ').trim();
    }).join('; ');
}

// ------------------------------------------------------------------------------------------------ Prototype C: goods
// Prototype C (4.3.0-c.6): what a contract's work is. A hunt or cull is done when the world has reached its outcome
// (quest.ready, the engine's count): its contract slip shows it (slipMarks), and trophies are loot, never proof. Goods
// are the work itself: what he is to gather (GATHER), or to get (GET) when the contract names that thing as an object
// to show ("get word from the reeve" is no thing in his hands); a delivery (DELIVER) is done where the goods change hands.
const RELATION = new Set(['of', 'for', 'from', 'to', 'with', 'at', 'in', 'on', 'by']);
const stemOf = (w) => w.replace(/ies$/, 'y').replace(/(?<!s)s$/, '');
/** The word a thing is called by ("sealed satchel of fever tinctures" → satchel, "venom sacs" → sac). */
function headOf(what) {
    const words = normText(what).replace(/'s\b/g, '').split(' ').filter(Boolean);
    const end = words.findIndex((w) => RELATION.has(w));
    return stemOf((end > 0 ? words.slice(0, end) : words).at(-1) || '');
}
/** The objects in his hands called what a contract names (its contract slips, which name their contracts, are none). */
const carried = (s, what) => {
    const h = headOf(what);
    return h.length < 3 ? [] : heldBy(s, 'pc').filter((o) => !o.id.startsWith('obj.slip.') && normText(o.name).split(' ').map(stemOf).includes(h));
};
// 4.3.0-c.6.6.2: a GIVE of a thing is a delivery too (the oil requisition slip to the keeper); a GIVE of word, a
// warning or a confirmation leaves nothing in his hands. A thing he gathers to hand over elsewhere (GATHER the herbs,
// DELIVER them to the apothecary) is that delivery's, not goods for the Guild.
export const deliveriesOf = (q) => (q.objectives || []).filter((o) => ['DELIVER', 'GIVE'].includes(o.verb) && o.what && !confirmsOnly(o));
export const goodsOf = (q) => {
    const delivered = new Set(deliveriesOf(q).map((o) => headOf(o.what)));
    return (q.objectives || []).filter((o) => o.what && !confirmsOnly(o) && !delivered.has(headOf(o.what))
        && (o.verb === 'GATHER' || (o.verb === 'GET' && (q.proof || []).some((p) => p.kind === 'object' && headOf(p.what) === headOf(o.what)))));
};
/**
 * 4.3.0-c.6.6.2: what of a delivery he still holds. The contract's own things (for_quests, the story's link) called by
 * it decide: once they have left his hands his own satchel is no undelivered one. Without such a link, what his hands
 * hold called so. His Guild contract slip is never a delivery. Read anew from the objects every time, never a receipt.
 */
function stillCarried(s, q, o) {
    const h = headOf(o.what);
    const words = normText(o.what).split(' ').map(stemOf);
    const called = (x) => (h.length >= 3 && normText(x.name).split(' ').map(stemOf).includes(h)) || (headOf(x.name).length >= 3 && words.includes(headOf(x.name)));
    const own = Object.values(s.objects || {}).filter((x) => (x.for_quests || []).includes(q.id) && !x.id.startsWith('obj.slip.') && x.source?.how !== 'guild' && called(x));
    return own.length ? own.filter((x) => x.holder?.entity === 'pc') : carried(s, o.what);
}
/** 4.3.0-c.6.6.3: the things of a contract's deliveries he still holds (world.js: a READY resting on a refused hand-over). */
export const owedObjects = (s, q) => [...new Map(deliveriesOf(q).flatMap((o) => stillCarried(s, q, o)).map((x) => [x.id, x])).values()];
const goodsText = (q) => goodsOf(q).map((o) => `${o.qty ?? 1}${o.unit ? ` ${o.unit}` : ''} ${o.what}`).join(', ');
/** The ACCEPTS line's word on proof (Prototype C). */
export function proofTerms(q, content) {
    if (goodsOf(q).length) return ` The goods are the work: ${goodsText(q)} in his hands at a Guild hall; the Guild takes them at the turn-in.`;
    if (deliveriesOf(q).length) return ' A delivery is done where the goods are handed over, not while he still carries them.';
    if (isHunt(q, content)) return ' Proof: the contract slip itself; its Guild seal shows READY once the world has established the outcome (the engine marks it). No trophies or body parts are required or handed over; what he takes from his kills is his own loot.';
    return '';
}
/** The TURNS IN line's word on what changes hands (Prototype C). */
export function handoverTerms(q, content) {
    if (goodsOf(q).length) return ` He hands over ${goodsText(q)}; the Guild keeps them.`;
    if (isHunt(q, content)) return ' The slip\'s READY seal is the proof: nothing else is handed over, and what he carries stays his unless he gives it away himself.';
    return '';
}
/** What the quest memory and the catalog say about proof (Prototype C), instead of the verification examples. */
export function proofMemory(s, content, q) {
    if (goodsOf(q).length) return `goods to hand over at the turn-in: ${goodsText(q)}`;
    if (isHunt(q, content)) {
        const ready = (s.objects[slipId(q)]?.marks || []).some((m) => m.by === 'guild' && m.text === SLIP_READY);
        return `proof: the contract slip, its Guild seal showing READY ${ready ? 'now' : 'once the outcome is established'}; no trophies are required`;
    }
    return (q.proof || []).length ? `verification examples: ${proofText(q)}` : 'verification examples: none listed';
}
export const SLIP_READY = 'READY — the Guild seal shows the contract fulfilled';
export const SLIP_DONE = 'COMPLETED — paid out by the Guild';
/**
 * Prototype C (4.3.0-c.6): a Guild contract slip shows its contract's state, as the engine has it: READY when the Guild
 * would accept it now (contractReady), COMPLETED once it is paid. The slip decides nothing; it is read from the state.
 */
export function slipMarks(s, content, emit) {
    for (const q of contracts(s)) {
        const slip = s.objects[slipId(q)];
        if (!slip) continue;
        const want = q.status === 'completed' ? SLIP_DONE : q.status === 'active' && contractReady(s, content, q, { c: true }).ok ? SLIP_READY : null;
        if (want && !(slip.marks || []).some((m) => m.by === 'guild' && m.text === want)) emit({ t: 'object.marked', d: { id: slip.id, mark: want, by: 'guild', turn: s.turn } });
    }
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
export function contractReady(s, content, q, { c = false } = {}) {
    // Patch 8: a contract to clear a level of a Dungeon is done when he cleared it (the engine's level state, his credit)
    const clear = c ? clearDone(s, q) : null;
    if (clear) return clear.ok ? { ok: true, mode: 'dungeon_clear', reason: null, consume: [] } : { ok: false, mode: 'not_cleared', reason: `${clear.name}, level ${clear.floor}: ${clear.text}; the Guild pays for the level cleared`, consume: [] };
    if (c) {
        // Prototype C (4.3.0-c.6): goods he is to gather or get are the work itself: in his hands at the hall, whatever
        // the story says, and the Guild takes them; a delivery is not done while he still carries what it delivers
        // (4.3.0-c.6.6.2: before the goods, so mixed work checks both)
        const delivery = deliveryRuleset(s) >= 2 ? deliveryStatus(q, s) : null;
        if (delivery) return delivery;
        const owed = deliveriesOf(q).filter((o) => stillCarried(s, q, o).length);
        if (owed.length && (deliveryRuleset(s) < 2 || !deliveriesOf(q).length)) return { ok: false, mode: 'not_delivered', reason: `he still carries ${owed.map((o) => o.what).join(', ')}: a delivery is done where the goods are handed over`, consume: [] };
        const goods = goodsOf(q);
        if (goods.length) {
            const short = goods.map((o) => ({ o, need: o.qty ?? 1, have: carried(s, o.what).reduce((n, x) => n + (x.qty ?? 1), 0) })).filter((x) => x.have < x.need);
            if (short.length) return { ok: false, mode: 'goods_missing', reason: `the goods are the work: ${short.map((x) => `${x.need}${x.o.unit ? ` ${x.o.unit}` : ''} ${x.o.what} (he has ${x.have})`).join(', ')} must be in his hands`, consume: [] };
            const count = countShort(s, content, q);
            if (count.length && !(q.ready && q.ready_alternative)) return { ok: false, mode: 'count_short', reason: `the engine counts ${tallyText(count)} defeated and the story has not established that the outcome was reached otherwise; trophies are no count`, consume: [] };
            const consume = [];
            for (const o of goods) {
                let left = o.qty ?? 1;
                for (const x of carried(s, o.what)) {
                    if (left <= 0) break;
                    const qty = Math.min(left, x.qty ?? 1);
                    consume.push({ id: x.id, qty });
                    left -= qty;
                }
            }
            return { ok: true, mode: 'goods', reason: null, consume };
        }
    }
    const legacy = (q.proof || []).length > 0 ? checkProof(s, q) : { ok: false, consume: [] };
    const mode = (q.ready || (c && deliveryRuleset(s) >= 2 && deliveriesOf(q).length && !deliveryStatus(q, s))) ? 'story_outcome' : legacy.ok ? 'legacy_verification' : 'not_ready';
    if (mode === 'not_ready') return { ok: false, mode, reason: 'the contract outcome has not yet been established as achieved in the world', consume: [] };
    const short = countShort(s, content, q);
    if (short.length && !(q.ready && q.ready_alternative)) {
        return { ok: false, mode: 'count_short', reason: `the engine counts ${tallyText(short)} defeated and the story has not established that the outcome was reached otherwise; trophies are no count`, consume: [] };
    }
    // Prototype C (4.3.0-c.6): what a hunter takes from his kills is his loot, never taken as proof
    return { ok: true, mode, reason: null, consume: mode === 'legacy_verification' && !(c && isHunt(q, content)) ? legacy.consume : [] };
}

/** Turn a contract in at a Guild hall: its readiness (contractReady), then deterministic payout/XP/count. */
export function completeContract(s, content, q, emit, { step, c = false } = {}) {
    const check = contractReady(s, content, q, { c });
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

const DELIVERY = O({ v: I(1, 1), mode: E(['give', 'drop']), recipient_kind: N(E(['name', 'role'])), recipient: N(S()), place: S() });
const OBJECTIVE = O({ delivery: N(DELIVERY), verb: E(VERBS), what: S(), qty: N(I(1)), unit: N(S()), where: N(S()) });
const PROOF = O({ kind: E(['object', 'mark']), what: S(), qty: N(I(1)), unit: N(S()), on: N(S()), consume: N({ type: 'boolean' }) });

export function listingSchema(content) {
    return O({
        listings: A(O({
            title: S(), client: S(), rank: E(ranksOf(content)), level: I(1, 104), qtype: E(QTYPES), payout_cp: I(0),
            task: N(S()), desired_end_state: S(), objectives: A(OBJECTIVE, 1), proof: A(PROOF),
        })),
    });
}

// Newly generated V4-C boards use the simple profile; existing contracts and Legacy stay intact.
function boardProfile(s, content, need) {
    if (!need.c || deliveryRuleset(s) < 2) return null;
    const dungeons = nearDungeons(s, need.branch, s.places[need.branch]?.realm, { guild: true })
        .filter(id => { const ns = fittingLevels(s, content, need.rank, id); return ns === null || ns.length > 0; });
    return { dungeons, hunt: dungeons.length ? 2 : 3, delivery: 2, dungeon: dungeons.length ? 1 : 0 };
}

function boardFamily(s, content, l) {
    if (clearTarget(s, { objectives: huntObjectives(l, content) })) return 'dungeon';
    if (l.objectives.some(o => o.verb === 'DELIVER')) return 'delivery';
    return 'hunt';
}

function simpleListingWhy(s, content, l, profile, family) {
    const os = l.objectives;
    if (l.proof.length) return 'simple board contracts have no additional proof or signature requirement';
    if (family === 'delivery') {
        if (os.length !== 1 || os[0].verb !== 'DELIVER') return 'delivery requires exactly one DELIVER objective; no duplicate GIVE or other duties';
        const o = os[0];
        if (!o.what.trim() || !Number.isInteger(o.qty) || (!o.delivery && !o.where?.trim())) return 'delivery needs physical goods, an exact quantity and one recipient/place';
        if (!o.delivery) {
            // Compatibility for cached pre-descriptor board answers, never existing quests.
            const where = deliveryWhere(o.where);
            if (!where) return 'objectives[0].where: missing separator " at "; provide delivery {v:1,mode,recipient_kind,recipient,place} instead of a comma address';
            if (!where.place || (!where.drop && genericRecipient(where.recipient))) return 'objectives[0].delivery.recipient: name a person or specific role, not generic Recipient/someone/staff';
            const role = /^(?:the )?(?:healer|midwife|clerk|keeper|physician|doctor|nurse|medic|surgeon|apothecary|quartermaster|warden|priest|priestess|abbot|abbess|brother|sister|ferryman|innkeeper|blacksmith|merchant)$/i;
            if (!where.drop && !role.test(where.recipient) && !/^[A-Z][a-z'-]+(?: [A-Z][a-z'-]+)?$/.test(where.recipient))
                return 'objectives[0].delivery: ambiguous free-text receiver; supply explicit recipient_kind name or role';
            o.delivery = { v: 1, mode: where.drop ? 'drop' : 'give', recipient_kind: where.drop ? null : role.test(where.recipient) ? 'role' : 'name', recipient: where.recipient, place: where.place };
        }
        const d = o.delivery;
        if (!d.place.trim() || (d.mode === 'give' && (!d.recipient_kind || !d.recipient?.trim() || genericRecipient(d.recipient)))
            || (d.mode === 'drop' && (d.recipient !== null || d.recipient_kind !== null)))
            return 'objectives[0].delivery: give requires a specific name/role and place; drop requires place with null receiver';
        o.where = d.mode === 'drop' ? `deposit at ${d.place}` : `${d.recipient} at ${d.place}`;
        const cargo = `${o.qty} × ${o.what}`;
        const drop = /^deposit at /i.test(o.where);
        l.task = drop ? `Deposit ${cargo} at ${o.where.slice(11)}.` : `Deliver ${cargo} to ${o.where}.`;
        l.desired_end_state = drop ? `${cargo} deposited at ${o.where.slice(11)}.` : `${cargo} delivered to ${o.where}.`;
        return null;
    }
    if (os.some(o => !['GO', 'FIND', 'DEFEAT'].includes(o.verb))) return 'automatic board work is a hunt, delivery or Dungeon clearance; no escort or mixed duties';
    const kills = os.filter(o => o.verb === 'DEFEAT');
    if (family === 'dungeon') {
        const target = clearTarget(s, { objectives: huntObjectives(l, content) });
        if (!profile.dungeons.includes(target.dungeon) || kills.length !== 1 || kills[0].qty !== null) return 'Dungeon clearance needs one known suitable level and no kill quota';
        const name = s.places[target.dungeon].name;
        l.task = `Clear level ${target.floor} of ${name}. Risk: groups and stronger foes; a matching rank does not guarantee a safe solo expedition.`;
        l.desired_end_state = `Level ${target.floor} of ${name} is clear.`;
        return null;
    }
    if (kills.length !== 1 || !Number.isInteger(kills[0].qty) || !kills[0].where?.trim() || !isHunt(l, content)) return 'hunt needs one animal/Monster DEFEAT objective with an exact quantity and place';
    return null;
}

/** The Board generator's call (plan §3.2): the missing listings of one branch and rank. */
function retainedListings(s, need) {
    return Object.values(s?.quests || {}).filter(q => q.status === 'listed' && q.rank === need.rank
        && q.source?.branch === need.branch && (need.have || []).includes(q.title));
}

export function boardRequest(s, content, need) {
    const [lo, hi] = content.rules.guild.rank_levels[need.rank];
    const guide = content.rules.guild.board?.payout_guide_cp?.[need.rank];
    const town = s.places[need.branch];
    const realm = town?.realm && s.places[town.realm] ? s.places[town.realm].name : null;
    const profile = boardProfile(s, content, need);
    const noviceProfile = !profile && need.rank === 'Novice' ? [
        'NOVICE TEST PROFILE:',
        '- Keep Novice work practical and immediately playable. For a fresh five-listing board: at least 2 listings are explicit Monster culling/clearance jobs whose obvious intended route can lead directly to combat; at least 1 is an escort whose route leaves the settlement; at least 1 is a delivery/courier job whose destination leaves the settlement; the fifth is another culling, escort or delivery job.',
        '- Monster culling/clearance names a concrete creature threat and a concrete place/problem to clear, kill, drive off or make safe. Do not disguise both combat slots as open-ended investigations into an unknown culprit.',
        '- Escort and delivery work that needs a Guild hand says why in its task where there is a reason: a stretch with reported waylayers or beasts, valuable or tempting cargo, a rival who wants it, a client with enemies. Weather and high water are one possible reason among many, not the default; a safe local errand needs none.',
        '- Escort and delivery jobs must involve real travel beyond the city/settlement rather than a safe errand between two buildings in town. Route trouble may emerge naturally from the world; do not pre-script a mandatory ambush.',
        '- For partial Board refills, prefer these same three job families and avoid filling the Novice Board with administrative errands, pure paperwork, abstract mysteries or local chores that provide little opportunity to test travel/combat gameplay.',
    ] : [];
    // Prototype C (4.3.0-c.6.1): a hunt is fulfilled by its outcome, which its contract slip shows (slipMarks); what the
    // hunter takes from the kills is loot, no proof. Harvest, retrieval and delivery keep their things as objectives
    const hunt = need.c
        ? '- A hunt, cull or clearance contract (its work is killing animals or monsters: ATTACK/DEFEAT, with FIND/GO to reach the targets or DEFEND for what they threaten) is fulfilled by its outcome in the world: once the desired end state is reached, the Guild\'s magical contract slip shows it READY. Its proof is []: no body parts or trophies, and no local inspection, witness, sign-off or signature. What a hunter takes from the kills is loot to keep or sell, never the contract\'s proof. Mixed work (repair the old watch post and clear out what nests in it) keeps a proof only where its other work naturally needs one (a receipt for the repair), none for the kills. Harvest, retrieval and delivery work keeps the physical things it is about as its objectives (GATHER the herbs or the venom an apothecary asked for, GET the stolen strongbox back, DELIVER the parcel). Work against people (bandits, raiders, deserters) is no hunt: its proof fits the job (a leader\'s token, recovered goods, the reeve\'s word), never body parts.'
        : '- A hunt or cull contract (its work is killing animals or monsters: ATTACK/DEFEAT, with FIND/GO to reach the targets or DEFEND for what they threaten) is proven by a species-appropriate body part of each kill (ears, teeth, claws, leg joints …) as its one proof entry. Add no local inspection, witness, sign-off or signature for it. Mixed work (repair the old watch post and clear out what nests in it) keeps a fitting proof for each part: trophies for the kills, a receipt or sign-off only where its other work naturally needs one. Work against people (bandits, raiders, deserters) is no hunt: its proof fits the job (a leader\'s token, recovered goods, the reeve\'s word), never body parts.';
    const system = [
        "You write the official contracts on an Adventurers' Guild board in a sandbox fantasy RPG. The engine books exactly what you return as canon; the narrator will only describe these listings. Write no story.",
        '',
        'Rules:',
        '- A contract is a concrete request to change a current situation in the world. Build it from: cause (why now), stakeholder/client, current problem, desired end state, 1–4 useful objective memories, and reward. Verification is optional story guidance, not a mandatory token.',
        '- task is what the notice asks the adventurer to do, one imperative sentence the board shows ("Hunt and cull the bog strider colony at the eel-weirs of the Reed Flats so the eel boats can launch safely again."). desired_end_state is the COMPLETE outcome the Guild recognizes when it is reached ("The bog strider colony is culled and the eel boats launch again."). Keep the two apart.',
        '- desired_end_state is the single semantic completion gate and MUST cover every substantive result the contract actually requires. Never leave required work only in objectives. Objectives may remember useful route/work detail, but may not secretly add required results.',
        hunt,
        ...(need.c && deliveryRuleset(s) >= 2 ? ['- DELIVER/GIVE objectives name physical cargo (a parcel, ledger, written letter), never spoken news, warnings or abstract services. Use TALK for a spoken message or warning; do not invent a cargo object for it.'] : []),
        '- Rank limits scope, risk and complexity — not whether the subject is mundane or fantastical. Low-rank work may involve a manageable Monster, minor magic or a minor ruin, one dangerous animal, or a small clearly defined weak group such as wolves, goblins or feral dogs.',
        '- Do not preferentially default to rats, cellar vermin or indistinct swarms. Rats are allowed occasionally, not the standard low-rank combat answer.',
        '- The listings generated together must differ materially in underlying problem, location and likely play experience. Outside an explicit rank profile, do not make a balanced checklist of predefined quest categories.',
        '- Let contracts arise from this branch and its surroundings: local trades, roads, wilderness, factions, ruins, ecology, magic and already-established places. Nothing world-shaking at low rank.',
        `- Structural example only: a livestock owner reports repeated pen break-ins; identify the threat and stop the losses, ${need.c ? '' : 'with proof appropriate to '}whether it is killed or driven away. This demonstrates cause, modest scope, alternate solutions and verifiable completion.`,
        '- Structural example only: a survey team failed to return from abandoned workings; locate them, rescue survivors if possible, and recover an official seal. What happened is not predetermined by the contract and emerges in play.',
        '- These examples demonstrate structure only. Do not reuse their people, locations, creatures, objects, circumstances or exact objective sequence.',
        ...noviceProfile,
        ...(profile ? [
            `- FIXED BOARD: ${profile.hunt} monster hunts, 2 deliveries, ${profile.dungeon} Dungeon clearance. Escort is not generated on this board. When no suitable known Dungeon exists, its slot is a third hunt; never invent a Dungeon to fill the quota. Existing notices count towards these totals on a partial refill.`,
            '- Each delivery objective MUST include delivery:{v:1,mode:"give",recipient_kind:"name" or "role",recipient:"Fenwick" or "toll clerk",place:"Quarry Gate Toll Station"}. For an expressly permitted drop: mode:"drop", recipient_kind:null, recipient:null. Other objectives use delivery:null. Keep place a precise destination label, with no route directions appended. Name means only that person, role means an appropriate present holder of that role. Unknown destinations and people are permitted; they are encountered naturally.',
            '- Each delivery has exactly one DELIVER objective, concrete physical cargo, integer qty and a specific receiver and exact destination: where "Healer at Quarry Camp Infirmary" or "Gretha at Thornhollow", or "deposit at Receiving Shed". Name a person or a recognizable job role (healer, quartermaster, clerk), never "Recipient", "someone", "staff" or other placeholder. Place must name the ACTUAL destination, not only its parent settlement. A previously unknown interior must be visited before delivery can be confirmed. No GET/GIVE/ESCORT or other objective, signature, return trip, returned container, deadline or additional duty. proof is []. The engine renders task and desired_end_state from this objective; keep its title and client consistent. Travel and obtaining the cargo happen naturally in play; no mandatory ambush.',
            '- Hunts have one DEFEAT objective with an exact quantity and a clear location, plus only optional FIND/GO guidance. proof is []. The target must be an animal or Monster, not people; distinguish living hostile plants from ordinary gardening.',
            ...(need.rank === 'Novice' ? ['- At least one hunt is an introductory single-foe job: qty 1, level 1, qtype minor, one weak ordinary F-rank animal or Monster, no elite/boss or concealed required group. This is an available choice, not a compulsory fight.'] : []),
            '- Dungeon clearance has one DEFEAT objective with qty null, where naming the exact known Dungeon and level number. proof is []. Include a short explicit danger/risk warning in task; a rank-compatible floor is not automatically safe for a fresh solo adventurer.',
        ] : []),
        `- rank is "${need.rank}"; level is the quest level, an integer from ${lo} to ${hi}; qtype is minor, standard, dangerous or major.`,
        `- payout_cp is the Guild's one fixed payout in copper (1 silver = 10 copper)${guide ? `; for ${need.rank} work ${guide[0]}–${guide[1]} cp is usual (a guide, not a limit)` : ''}.`,
        '- A cull names how many its notice asks for: the DEFEAT objective\'s qty (4 wolves; 1 for a single beast). A clearance of a Dungeon level names the level ("level 1") and no number: the level is cleared when its threats are. One listing is one of the two, never both: a cull\'s desired_end_state is that number of them dealt with, not a cleared level or place; a clearance\'s is the level cleared, with no number. Its title says the same: a clearance is titled by what is cleared ("Clear …", "Purge …", "Secure …"), never "Cull" or "Thin", which promise a number.',
        '- 1 to 4 objectives: {verb, what, qty, unit, where, delivery}; verb is one of GO, FIND, TALK, GET, GATHER, GIVE, DELIVER, USE, REPAIR, DEFEND, ESCORT, ATTACK, DEFEAT. These are continuity memories for play, not a rigid checklist the narrator must force in order.',
        '- proof contains 0–2 optional verification examples the Guild could recognize. Prefer [] when return, witnesses or a credible report can establish the outcome naturally. If used, EVERY entry must be an object with all fields present: {"kind":"object"|"mark","what":"...","qty":integer>=1|null,"unit":string|null,"on":string|null,"consume":true|false|null}. These are story guidance, NOT exclusive completion tokens.',
        '- Do not use GO merely as a travel checklist item. Objectives should describe meaningful work/outcomes (find, rescue, repair, defend, escort, investigate through FIND/TALK/GET, defeat, deliver, etc.); travel itself is normally just how play reaches them. Do not invent paperwork solely to make verification possible.',
        '- client is who posted the work (a person, a trade, a hamlet); titles differ from the listings already on the board.',
        '',
        'Return only one JSON object, no prose before or after it, no code fences: {"listings": [{"title": "...", "client": "...", "rank": "...", "level": 1, "qtype": "...", "payout_cp": 0, "task": "...", "desired_end_state": "...", "objectives": [...], "proof": [...]}]}. Every field is required; null where a field allows it and does not apply.',
    ].join('\n');
    // review of Patch 7: the known Dungeons near this branch, by their names (the same places on every board); work
    // there is clearance of a part whose Rank this board's work fits (a Novice board: the F-Rank part), one listing
    // final review: only what the Guild was told or keeps on record (dungeon.guild), never the engine's hidden truth
    const order = content.rules.ranks.order;
    const fits = rankFits(content, need.rank);
    const near = nearDungeons(s, need.branch, town?.realm, { guild: true });
    const dungeons = near.map((id) => `${s.places[id].name} (${dungeonText(s, id, { guild: true }).replace(/^a Dungeon: /, '')}${s.places[id].where ? `; ${s.places[id].where}` : ''})`);
    const up = profile ? retainedListings(s, need).some(l => boardFamily(s, content, l) === 'dungeon')
        : need.have.some(t => dungeonNamed(s, near, t));
    // a Dungeon of mixed Ranks: the work must name its fitting level by number (the check reads "level N")
    const levelRule = near.map((id) => [id, fittingLevels(s, content, need.rank, id)]).filter(([, ns]) => ns?.length)
        .map(([id, ns]) => ` In ${s.places[id].name} that part is ${levelWords(ns)}: write it with its number in the task or an objective's where ("upper galleries" alone names no level).`).join('');
    const user = [
        `BRANCH: ${town?.name || need.branch}${realm ? `, ${realm}` : ''} (${town?.sub || 'settlement'})`,
        ...(dungeons.length ? [`KNOWN DUNGEONS NEAR THIS BRANCH (the Guild's records): ${dungeons.join(' · ')}. ${up ? (profile ? 'A Dungeon clearance is already listed: add no second clearance; numbered hunts in suitable parts remain allowed.' : 'A Dungeon job is on the board already: write no other work in them.') : `At most one listing may be clearance work in one of them, and only in a part whose danger Rank is ${fits.join(' or ')} (this board's work; ${order.filter((r) => !fits.includes(r)).length ? 'deeper or stronger parts are not this board\'s' : 'any part'}): name the Dungeon exactly as written, the part (a level, a gallery) and its concrete outcome; ${profile ? 'this is the separate Dungeon slot, and numbered hunts there do not consume it' : 'it counts as one of the culling jobs'}.${levelRule}`}`] : []),
        `RANK: ${need.rank} · DAY ${need.day}`,
        `ON THE BOARD ALREADY: ${need.have.length ? need.have.join(' | ') : 'nothing'}`,
        `WRITE: ${need.missing} new listing${need.missing > 1 ? 's' : ''}.`,
    ].join('\n');
    return { system, user, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };
}

/** The danger Ranks whose level band meets a board Rank's quest levels (a Novice board: F). */
function rankFits(content, rank) {
    const [lo, hi] = content.rules.guild.rank_levels[rank];
    return content.rules.ranks.bands.filter((b) => b.max >= lo && b.min <= hi).map((b) => b.rank);
}

/** The first of these Dungeons a text names (its exact name, any case). */
function dungeonNamed(s, ids, text) {
    const low = String(text || '').toLowerCase();
    return ids.find((id) => low.includes(String(s.places[id].name).toLowerCase())) || null;
}

const ORDINAL = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 };

/**
 * Livetest 21.10.2026: the levels of a Dungeon a board of this Rank may send work to, by the Guild's record, or null
 * when its whole known range fits (no level needs naming). "the upper galleries" names no level the engine can check.
 */
function fittingLevels(s, content, rank, id) {
    const d = s.places[id];
    const c = d.dungeon;
    const known = guildRecord(c, d.by);
    const fits = rankFits(content, rank);
    if (known.includes('rank') && c.rank && fits.includes(c.rank.min) && fits.includes(c.rank.max)) return null;
    return Object.entries(c.levels || {}).filter(([n, r]) => known.includes(`level:${n}`) && fits.includes(r.min) && fits.includes(r.max)).map(([n]) => Number(n));
}
const levelWords = (ns) => ns.map((n) => `"level ${n}"`).join(' or ');

/**
 * Final review of Patch 7: a listing's Dungeon work must stay in a part the board's Rank fits, by the Guild's own
 * records. A Dungeon whose whole known range fits needs no part named; otherwise each level the listing names must be
 * on record with a fitting Rank. Returns the refusal, or null.
 */
function dungeonPartWhy(s, content, rank, id, text) {
    const d = s.places[id];
    const c = d.dungeon;
    const known = guildRecord(c, d.by);
    const fits = rankFits(content, rank);
    if (known.includes('rank') && c.rank && fits.includes(c.rank.min) && fits.includes(c.rank.max)) return null;
    const levels = [...new Set([...text.matchAll(/\blevel\s+(\d+)\b/g)].map((m) => Number(m[1])).concat([...text.matchAll(/\b(first|second|third|fourth|fifth|sixth)\s+(?:level|floor)\b/g)].map((m) => ORDINAL[m[1]])))];
    if (!levels.length) {
        const ok = fittingLevels(s, content, rank, id) || [];
        return `names no part of ${d.name}: only a part whose Rank is ${fits.join(' or ')} is ${rank} work${ok.length ? `; write ${levelWords(ok)} in its task or an objective's where (a gallery or "upper" alone names no level)` : ''}`;
    }
    for (const n of levels) {
        const r = known.includes(`level:${n}`) ? c.levels?.[n] : null;
        if (!r) return `level ${n} of ${d.name} has no Rank on the Guild's record: not ${rank} work`;
        if (!fits.includes(r.min) || !fits.includes(r.max)) return `level ${n} of ${d.name} is Rank ${rankText(r)}: not ${rank} work`;
    }
    return null;
}

/** Patch 8.1 (§10): a Dungeon cull whose beasts no regular cycle of it holds is no Dungeon cull (refused, regenerated). */
function noCullWhy(s, content, need, at, l, text) {
    // Patch 8.3: a clearance of a level counts no kills (the level's state does): its foes' words are no cull's kind
    if (!need.c || !isHunt(l, content) || clearTarget(s, { objectives: huntObjectives(l, content) })) return null;
    const o = huntObjectives(l, content).find((x) => KILL_WORK.has(x.verb) && dungeonCull(s, content, at, x, levelsNamed(text)) === 0);
    return o ? `${s.places[at].name} holds no "${o.what}" among its renewing foes (a guardian or boss only by its own name): no cull there` : null;
}

/** Read the generator's answer: the listings that pass the hard checks, the rest refused with a reason. */
export function parseBoard(answer, content, need, s = null) {
    const { value, error } = extractJsonObject(answer);
    if (!value) return { listings: null, errors: [error || 'no JSON object'] };
    // a listing without its board text is still a listing: the board then shows the desired end state (as before 4.1.2)
    for (const l of Array.isArray(value.listings) ? value.listings : []) if (l && typeof l === 'object' && l.task === undefined) l.task = null;
    for (const l of Array.isArray(value.listings) ? value.listings : [])
        for (const o of Array.isArray(l?.objectives) ? l.objectives : [])
            if (o && typeof o === 'object' && o.delivery === undefined) o.delivery = null;
    const errors = validate(value, listingSchema(content));
    if (errors.length) return { listings: null, errors: errors.slice(0, 8) };
    for (const l of value.listings) for (const o of l.objectives) if (o.delivery === null) delete o.delivery;
    const [lo, hi] = content.rules.guild.rank_levels[need.rank];
    const ok = [];
    const refused = [];
    // final review of Patch 7: at most one Dungeon job on a board, the one already up counted (a refill adds none)
    const near = s ? nearDungeons(s, need.branch, s.places[need.branch]?.realm, { guild: true }) : [];
    const profile = boardProfile(s, content, need);
    let inDungeon = profile ? retainedListings(s, need).some(l => boardFamily(s, content, l) === 'dungeon')
        : (need.have || []).some(t => dungeonNamed(s, near, t));
    for (const l of value.listings) {
        const text = [l.title, l.task, l.desired_end_state, ...l.objectives.map((o) => `${o.what} ${o.where || ''}`)].join(' \n ').toLowerCase();
        const at = near.length ? dungeonNamed(s, near, text) : null;
        const limited = profile ? boardFamily(s, content, l) === 'dungeon' : !!at;
        let why = l.rank !== need.rank ? `rank ${l.rank} is not ${need.rank}` : l.level < lo || l.level > hi ? `level ${l.level} outside ${lo}–${hi}` : l.objectives.length > 4 ? 'more than 4 objectives' : l.proof.length > 2 ? 'more than 2 verification examples'
            : need.c && (!s || deliveryRuleset(s) >= 2) && l.objectives.some(nonphysicalDelivery) ? 'DELIVER/GIVE requires physical cargo; use TALK for a spoken message or warning'
                : limited && inDungeon ? (profile ? 'at most one Dungeon clearance on this board' : 'at most one Dungeon job on this board, and one is there already') : at ? dungeonPartWhy(s, content, need.rank, at, text) || noCullWhy(s, content, need, at, l, text) : null;
        // Patch 8.1 (§3, §10): the Dungeon its work lies in, fixed with the listing (the gate and the count read this)
        if (at) l.dungeon = at;
        if (!why && profile) why = simpleListingWhy(s, content, l, profile, boardFamily(s, content, l));
        // Patch 8.4.1 (live 22.10.2026 05:43: "Cull the Burial Gallery Skeletons", a clearance of level 1 with no number):
        // a clearance's title says clearing; a cull's verb would promise a count the contract does not have
        if (at && clearanceListing(l, text)) l.title = l.title.replace(CULL_VERB, 'Clear');
        if (why) refused.push({ title: l.title, why });
        else {
            ok.push(l);
            if (limited && ok.length <= need.missing) inDungeon = true;
        }
    }
    const listings = ok.slice(0, need.missing);
    if (profile && listings.length === need.missing
        && need.missing + (need.have || []).length === (content.rules.guild.board?.size ?? 5)) {
        const retained = retainedListings(s, need);
        const all = [...retained, ...listings];
        const count = kind => all.filter(l => boardFamily(s, content, l) === kind).length;
        if (['hunt', 'delivery', 'dungeon'].some(kind => count(kind) !== profile[kind])) return {
            listings: null, refused, errors: [`board requires ${profile.hunt} hunts, 2 deliveries and ${profile.dungeon} suitable Dungeon clearance; include existing notices`],
        };
        if (need.rank === 'Novice' && !all.some(l => boardFamily(s, content, l) === 'hunt' && l.level === 1 && l.qtype === 'minor'
            && l.objectives.some(o => o.verb === 'DEFEAT' && o.qty === 1))) return {
            listings: null, refused, errors: ['Novice board needs an introductory single-foe hunt (qty 1, level 1, qtype minor)'],
        };
    }
    return { listings, refused, errors: [] };
}

const CULL_VERB = /^\s*(?:cull|thin)(?:\s+out)?\b/i;
/** A Dungeon listing that clears a level (it names one, and none of its kills has a number), titled as a cull? */
function clearanceListing(l, text) {
    return CULL_VERB.test(l.title || '') && /\blevel\s+\d+\b/.test(text) && !l.objectives.some((o) => KILL_WORK.has(o.verb) && Number(o.qty) > 0);
}

/** Does an objective name a Dungeon's guardian or boss by its own name ("the Glimmer Queen")? */
function namesBoss(what, name) {
    const n = normText(name || '').replace(/^the /, '');
    return !!n && normText(what || '').includes(n);
}

/**
 * Patch 8.1 (§10, live 21.10.2026 10:17: "Cull the Crystal Beetles" of Glimmerdeep asked 6 where one cycle holds 2 to
 * 4): how many of an objective's kind a Living Dungeon holds in one regular cycle at the least, by its encounters'
 * roles: its ordinary foes by their kind, a guardian or boss only where the objective names it. Null when the
 * listing's work is not in a Living Dungeon (or names no kill).
 */
function dungeonCull(s, content, root, o, levels) {
    if (!s || !root || !KILL_WORK.has(o.verb)) return null;
    const same = sameKinds(content);
    // Patch 8.3: the encounters as drawn for the cycle he meets, by the rule the engine counts their kills with
    return cullPopulation(s, content, root, (sl) => cullKind(content, o, { species: sl.species, anchor: sl.anchor, role: sl.role, title: sl.name }, same), { levels });
}

/**
 * Patch 8.3 (live 22.10.2026: the board asked 3 "restless skeletons" of a level whose cycle held 2 of them and 2 "risen
 * bones"; the count read the encounters' possible kinds, the tally the kind drawn): whether a creature counts for a
 * cull's DEFEAT objective, the one rule for the number the board asks (dungeonCull) and the kills the engine counts
 * (defeatTally). An ordinary foe by its kind (namesKind on the objective's words or unit, with content's same-kind
 * words; the young of a kind only where the objective names them); a Dungeon's guardian or boss only where the
 * objective names it by its own name (8.1 §10: "crystal beetles" is not the Glimmer Queen). Different kinds stay apart.
 */
function cullKind(content, o, { species, anchor, role = null, title = null, name = null }, same = sameKinds(content)) {
    if (role && role !== 'minion') return namesBoss(o.what, title);
    const young = namesYoung(content, `${o.what} ${o.unit || ''}`);
    return [o.what, o.unit].filter(Boolean).some((w) => namesKind(w, species || '', content.anchors.get(anchor), same))
        && (young || !namesYoung(content, `${species || ''} ${name || ''}`));
}
/** The levels a listing's text names ("level 2", "the first level"), or null for none. */
function levelsNamed(text) {
    const t = String(text || '').toLowerCase();
    const ns = [...new Set([...t.matchAll(/\blevel\s+(\d+)\b/g)].map((m) => Number(m[1])).concat([...t.matchAll(/\b(first|second|third|fourth|fifth|sixth)\s+(?:level|floor)\b/g)].map((m) => ORDINAL[m[1]])))];
    return ns.length ? ns : null;
}
const listingText = (l) => [l.title, l.task, l.desired_end_state, ...l.objectives.map((o) => `${o.what} ${o.where || ''}`)].join(' \n ').toLowerCase();

/**
 * Patch 8: a cull's number. A hunt the generator wrote without one (live 21.10.2026: "bog striders nesting in the weir
 * stakes", qty null) gets one from the engine, fixed now and shown on the board: one for a single named beast, else
 * three to five by the listing itself; a contract to clear a Dungeon's level counts no number (its level does).
 */
function cullNumbers(s, content, l, need) {
    const objectives = huntObjectives(l, content);
    if (!need.c || !isHunt(l, content) || clearTarget(s, { objectives })) return objectives;
    // its kills are what the engine counts (DEFEAT): an ATTACK of the notice is the same work
    return objectives.map((o) => {
        if (!KILL_WORK.has(o.verb)) return o;
        // Patch 8.1 (§10): in a Living Dungeon never more than one regular cycle holds of them at the least
        const most = l.dungeon ? dungeonCull(s, content, l.dungeon, o, levelsNamed(listingText(l))) : null;
        const fit = (n) => (most ? Math.min(n, most) : n);
        if (Number.isInteger(o.qty) && o.qty > 0) return { ...o, verb: 'DEFEAT', qty: fit(o.qty) };
        const words = normText(o.what || '').split(' ');
        const cut = words.findIndex((w) => RELATION.has(w));
        const before = cut > 0 ? words.slice(0, cut) : words;
        const plural = before.some((w) => w.length > 3 && /[^s]s$/.test(w));
        return { ...o, verb: 'DEFEAT', qty: fit(plural ? 3 + (parseInt(hash32(`${l.title}|${o.what}`), 16) % 3) : 1) };
    });
}

/**
 * Patch 8.3 (live 22.10.2026: "Skeletons in the Burial Galleries (3)", its desired end state "Level 1 of the Old Crown
 * Catacombs is cleared of restless skeletons …"): a numeric cull in a Living Dungeon is done by its count (the board
 * shows "(2)", the HUD "0/2 defeated", the turn-in counts the kills), so its desired end state, what the narrator and
 * the extractor are told the contract wants, says that count, never a cleared level: a clearance has no number
 * (clearTarget) and keeps its own words. Whether it allows driving them off stays as the generator wrote it (drivesOff
 * reads this text); the purpose stays in the task. Any other contract keeps its end state.
 */
function cullEndState(s, content, q) {
    const kills = (q.objectives || []).filter((o) => o.verb === 'DEFEAT' && Number.isInteger(o.qty) && o.qty > 0);
    if (q.clear || !q.dungeon || !kills.length) return q.desired_end_state;
    // Patch 8.4 (review of 8.3): mixed or guarding work keeps the generator's end state, its other outcomes in it; only
    // the count of its kills follows the engine's number where the text names it plainly (countText)
    if (!pureCull(q, content)) return countText(q.desired_end_state, kills).text;
    const name = s.places[q.dungeon]?.name || q.dungeon;
    const where = Number.isInteger(q.floor) ? `level ${q.floor} of ${name}` : name;
    const how = drivesOff(content, q) ? 'defeated or driven off' : 'defeated';
    return `${kills.map((o) => `${o.qty} ${o.what}`).join(' and ')} of ${where} ${how} (a cull: done at that count, whatever else is left on the level)`;
}

/** Patch 8.4: a pure cull's work is its kills and reaching them (GO, FIND); guarding (DEFEND) or other work besides is more. */
const pureCull = (q, content) => isHunt(q, content) && (q.objectives || []).filter((o) => !confirmsOnly(o)).every((o) => KILL_WORK.has(o.verb) || o.verb === 'GO' || o.verb === 'FIND');

// Patch 8.4: how a notice says a count ("at least six", "6", "half a dozen"): a number and the words that only qualify it
const COUNT_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const COUNT_PHRASE = `(?:(?:at least|no fewer than|no less than|up to|some|about|around|roughly)\\s+)?(?:\\d+|${COUNT_WORDS.join('|')}|half a dozen|a dozen|a pair of|a couple of)`;
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The forms a DEFEAT objective names its kind by: the head word of its what (before a relation word) and its unit. */
function kindHeads(o) {
    const words = normText(o.what || '').split(' ').filter(Boolean);
    const cut = words.findIndex((w) => RELATION.has(w));
    const head = (cut > 0 ? words.slice(0, cut) : words).at(-1);
    return [...new Set([head, normText(o.unit || '').split(' ').at(-1)].filter((w) => w && w.length > 2).flatMap(wordForms).filter((w) => w.length > 2))];
}

/**
 * Patch 8.4 (live 22.10.2026 03:42: "Cull the Crystal Beetles of the Outer Grottos (4)", its task "Cull at least six
 * crystal beetles in the outer galleries of Glimmerdeep Grotto, level 1, …"): a text's own mention of a cull's count
 * follows the engine's number. Only a count that stands right before the objective's own kind word ("six crystal
 * beetles", "at least 6 beetles") is the cull's; other numbers ("level 1", "two wool carts") are left alone. Each kind
 * must be named once with a count: none leaves the text as it is (nothing to contradict), more than one is ambiguous.
 * @returns {{text: string, ambiguous: boolean}}
 */
function countText(text, kills) {
    if (!text) return { text, ambiguous: false };
    let out = String(text);
    let ambiguous = false;
    for (const o of kills) {
        const heads = kindHeads(o);
        if (!heads.length) continue;
        const re = new RegExp(`\\b(${COUNT_PHRASE})((?:\\s+[a-z'-]+){0,3}?\\s+(?:${heads.map(escapeRe).join('|')})(?:es|s)?)\\b`, 'gi');
        const hits = [...out.matchAll(re)];
        if (hits.length > 1) ambiguous = true;
        if (hits.length !== 1) continue;
        const [whole, count, rest] = hits[0];
        const digits = /\d/.test(count);
        let n = digits ? String(o.qty) : (COUNT_WORDS[o.qty - 1] || String(o.qty));
        if (/^[A-Z]/.test(count)) n = n[0].toUpperCase() + n.slice(1);
        out = out.slice(0, hits[0].index) + n + rest + out.slice(hits[0].index + whole.length);
    }
    return { text: out, ambiguous };
}

/**
 * Patch 8.4: a pure cull in a Living Dungeon says its count in its task as its objective and end state do: the notice's
 * own count follows the engine's (countText); where it names the kind with a count more than once, the task is the
 * engine's plain one (what, count, where), never a guess at which number is the cull's. Other contracts keep their task.
 */
function cullTask(s, content, q) {
    const kills = (q.objectives || []).filter((o) => o.verb === 'DEFEAT' && Number.isInteger(o.qty) && o.qty > 0);
    if (q.clear || !q.dungeon || !kills.length || !q.task || !pureCull(q, content)) return q.task;
    const r = countText(q.task, kills);
    if (!r.ambiguous) return r.text;
    const name = s.places[q.dungeon]?.name || q.dungeon;
    return `Cull ${kills.map((o) => `${o.qty} ${o.what}`).join(' and ')} on ${Number.isInteger(q.floor) ? `level ${q.floor} of ${name}` : name}.`;
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
            task: l.task ? String(l.task).slice(0, 240) : null, desired_end_state: l.desired_end_state, objectives: cullNumbers(s, content, l, need).map((o, i) => ({ id: `o${i + 1}`, ...o, status: 'open' })),
            proof: l.proof.map((p, i) => ({ id: `p${i + 1}`, ...p, consume: p.kind === 'object' ? p.consume !== false : undefined })),
            source: { board: `${need.branch}.guild_hall`, branch: need.branch, listed: { turn: s.turn, minute: s.clock.minute, day: need.day } },
            schedule: { starts_at: null, deadline: null }, status: 'listed', taker: null, history: [{ turn: s.turn, minute: s.clock.minute, status: 'listed' }],
            details: [], notes: [], ...(guide && (l.payout_cp < guide[0] || l.payout_cp > guide[1]) ? { audit: [`payout ${l.payout_cp} cp outside the guide ${guide[0]}–${guide[1]} cp`] } : {}),
        };
        // Patch 8: a level of a Dungeon to clear, booked with the contract (src/v4/living.js)
        const clear = need.c ? clearTarget(s, quest) : null;
        if (clear) quest.clear = clear;
        // Patch 8.1 (§3): the Dungeon its work lies in, a stable reference (its gate's waiver and its count read it)
        const where = need.c ? clear?.dungeon || l.dungeon || null : null;
        if (where) {
            quest.dungeon = where;
            const floors = clear ? [clear.floor] : levelsNamed(listingText(l));
            if (floors?.length === 1) quest.floor = floors[0];
            quest.desired_end_state = cullEndState(s, content, quest);
            quest.task = cullTask(s, content, quest);
        }
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
