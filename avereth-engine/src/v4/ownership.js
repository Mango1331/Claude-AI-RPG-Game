// Gen 3.5: Decision Ownership (docs/ARCHITECTURE_GEN35.md §2.2). Every kind of canonical state has exactly one owner
// domain, and every writer is declared: the engine's domains decide coin, possessions, vitals, progress, a Guild
// contract's status and payout, the Guild's standing and board and the fight; the story decides the world inside
// them (people, places, facts, knowledge, memories), and reaches an engine-owned kind only through a declared gate
// (a gift to Alaric, a robbery, a hostile commitment, a turn-in the player's command made conditional).
//
// The same table serves three purposes: the authority comment that used to live in firewall.js is data here; a test
// replays every recorded live run and checks each delta's events against what its type may write; and free text (a
// quest note, a memory) never keeps the engine's state as a second truth: one clause rule for every such store.
export const OWNERSHIP_VERSION = 'ownership-2';

/** Kinds of canonical state and their one owner domain; engine: decided only by the engine (or through a gate). */
export const STATE_KINDS = {
    'pc.coin': { owner: 'economy', engine: true, about: "Alaric's purse" },
    'pc.inventory': { owner: 'inventory', engine: true, about: 'what Alaric holds and wears' },
    'pc.vitals': { owner: 'combat', engine: true, about: "Alaric's HP, MP, STA and life" },
    'pc.progress': { owner: 'progression', engine: true, about: "Alaric's XP, level, stats, Skills, his creation" },
    'pc.location': { owner: 'movement', engine: false, about: 'where Alaric is (his go, or an arrival the story shows)' },
    'quest.status': { owner: 'guild', engine: true, about: "a Guild contract's formal status (accepted, completed, failed)" },
    'guild.standing': { owner: 'guild', engine: true, about: 'membership, Guild rank, promotion' },
    'guild.board': { owner: 'guild', engine: true, about: 'official listings (the Board generator)' },
    combat: { owner: 'combat', engine: true, about: 'encounters, commitments and what combatants do' },
    trade: { owner: 'economy', engine: false, about: 'offers, open decisions, bookings' },
    quests: { owner: 'quests', engine: false, about: 'private work, quest notes, progress, readiness, journeys' },
    scene: { owner: 'world', engine: false, about: 'who is here, where they stand, who noticed him' },
    entities: { owner: 'world', engine: false, about: 'people and creatures, their names and looks' },
    places: { owner: 'world', engine: false, about: 'the place tree' },
    objects: { owner: 'world', engine: false, about: 'things in the world (not in Alaric\'s hands)' },
    facts: { owner: 'facts', engine: false, about: 'world facts (scoped: docs/ARCHITECTURE_GEN35.md §2.4)' },
    knowledge: { owner: 'knowledge', engine: false, about: 'what someone knows or believes' },
    relations: { owner: 'relations', engine: false, about: 'how someone regards Alaric' },
    memory: { owner: 'memory', engine: false, about: 'moments people remember' },
    threads: { owner: 'threads', engine: false, about: 'story threads' },
    time: { owner: 'clock', engine: false, about: 'story time' },
    audit: { owner: 'audit', engine: false, about: 'records of the turn (no game state)' },
};

const PC = (x) => x === 'pc';
const pcHolder = (h) => !!h && h.entity === 'pc';
/**
 * The kind of state an event changes. Data-dependent where one event type serves several kinds (an object in Alaric's
 * hands is his inventory; a status of a Guild contract is the Guild's).
 * @param {{t: string, d: object}} e
 * @param {object|null} [s] the state the event applies to (before it): whose object moves, which quest changes
 */
export function eventKind(e, s = null) {
    const d = e.d || {};
    const heldByPc = (id) => pcHolder(s?.objects?.[id]?.holder);
    switch (e.t) {
        case 'coin.changed': return PC(d.id) ? 'pc.coin' : 'entities';
        case 'item.changed': case 'item.equipped': return PC(d.id ?? 'pc') ? 'pc.inventory' : 'entities';
        case 'resource.changed': return PC(d.id) ? 'pc.vitals' : 'entities';
        case 'entity.status': return PC(d.id) ? 'pc.vitals' : 'entities';
        case 'xp.changed': case 'level.up': case 'stat.assigned': case 'skill.learned':
        case 'creation.class_selected': case 'creation.completed':
            return 'pc.progress';
        case 'scene.moved': return 'pc.location';
        case 'scene.entered': case 'scene.left': case 'scene.position': case 'scene.awareness': case 'scene.concealed': case 'journey.party':
            return 'scene';
        case 'entity.created': case 'entity.updated': case 'entity.sheet_set': return 'entities';
        case 'encounter.started': case 'encounter.updated': case 'encounter.ended':
        case 'combat.pending': case 'combat.pending_cleared': case 'combat.intent':
            return 'combat';
        case 'fact.asserted': case 'fact.ended': return 'facts';
        case 'knowledge.gained': case 'claim.created': return 'knowledge';
        case 'relation.set': case 'relation.changed': return 'relations';
        case 'memory.recorded': return 'memory';
        case 'thread.set': return 'threads';
        case 'time.advanced': return 'time';
        case 'place.created': return 'places';
        case 'object.created': return pcHolder(d.object?.holder) ? 'pc.inventory' : 'objects';
        case 'object.moved': return pcHolder(d.to) || heldByPc(d.id) ? 'pc.inventory' : 'objects';
        case 'object.consumed': return heldByPc(d.id) || !s ? 'pc.inventory' : 'objects';
        case 'object.marked': return 'objects';
        case 'offer.created': case 'offer.closed': case 'transaction.completed': case 'service.granted':
        case 'decision.opened': case 'decision.closed':
            return 'trade';
        case 'quest.status': return s?.quests?.[d.id]?.kind === 'guild_contract' ? 'quest.status' : 'quests';
        case 'quest.created': return d.quest?.kind === 'guild_contract' ? 'guild.board' : 'quests';
        case 'quest.set': case 'quest.detailed': case 'quest.progressed': case 'quest.ready': case 'quest.journey': case 'proof.checked':
            return 'quests';
        case 'board.refreshed': case 'board.failed': case 'board.shown': return 'guild.board';
        case 'guild.registered': case 'guild.promoted': return 'guild.standing';
        default:
            return AUDIT_EVENTS.has(e.t) ? 'audit' : null;
    }
}

/** Events that record a turn and change no game state. */
export const AUDIT_EVENTS = new Set([
    'campaign.started', 'turn.begun', 'outcome.recorded', 'delta.rejected', 'report.missing', 'report.requested', 'check.recorded', 'note',
    'cmd.interpreted', 'cmd.resolved', 'cmd.completed', 'cmd.expired', 'extract.applied', 'extract.failed', 'overreach.noted',
]);

/**
 * Why an event of a world step breaks the Decision Ownership, or null. step: {kind: 'delta', type} for an extractor
 * delta (its declared writes and gates), anything else for the engine's own steps (answers to its questions, the
 * conditionals of the player's commands, perception, a committed fight), which write by the player's commands.
 */
export function ownershipViolation(step, e, s) {
    const kind = eventKind(e, s);
    if (kind === null) return `${e.t}: an event of no declared kind`;
    return kindViolation(step, kind, e, 'wrote');
}

/**
 * May this step change this kind? Its own writes, the audit, or a gate whose check this very step passed: a gate is a
 * capability the world applier grants where the check succeeds (`step.granted`, e.g. 'envelope.take' once mayTake
 * said yes), not a declaration that suffices by itself.
 */
function kindViolation(step, kind, e, verb) {
    if (!step || step.kind !== 'delta') return null;
    const w = DELTA_WRITES[step.type];
    if (!w) return `${step.type}: a delta type without declared writes`;
    if (ALWAYS.has(kind) || (w.writes || []).includes(kind)) return null;
    const gate = w.gates?.[kind];
    if (!gate) return `${step.type} ${verb} ${kind} (${e.t}), which it does not own and has no gate for`;
    const needs = [].concat(gate);
    if (needs.some((g) => step.granted?.has(g))) return null;
    return `${step.type} ${verb} ${kind} (${e.t}) without passing its gate ${needs.join(' or ')}`;
}

/**
 * Every region of the state an event actually changed, by kind: a fingerprint of each region before and after the
 * reducer (assertion mode only). One event often changes several regions (an arrival moves Alaric, the people with
 * him and the scene); the check covers all of them, not only the event's primary kind.
 */
export function stateRegions(s) {
    const j = (x) => JSON.stringify(x ?? null);
    const pc = s.entities?.pc || {};
    const sh = pc.sheet || {};
    const { sheet, status, location, at, ...pcRest } = pc;
    const objects = Object.values(s.objects || {});
    const pcHeld = (o) => pcHolder(o.holder);
    // what he holds is the inventory (which thing, how many); marks and quest ties on it are the world's notes
    const held = objects.filter(pcHeld).map((o) => [o.id, o.name, o.kind, o.qty, o.unit, o.holder]);
    const worldObjects = objects.filter((o) => !pcHeld(o) || o.marks?.length || o.for_quests?.length)
        .map((o) => (pcHeld(o) ? [o.id, o.marks, o.for_quests] : o));
    const quests = Object.values(s.quests || {});
    const contracts = quests.filter((q) => q.kind === 'guild_contract');
    return {
        'pc.coin': j(sh.coin_cp),
        'pc.inventory': j([sh.inventory, sh.equipment, held]),
        'pc.vitals': j([sh.hp, sh.mp, sh.sta, status]),
        'pc.progress': j([sh.level, sh.class, sh.stats, sh.skills, sh.xp, sh.free_points, s.creation]),
        'pc.location': j([s.scene?.location, s.scene?.place, s.scene?.at, location, at]),
        entities: j([Object.entries(s.entities || {}).filter(([id]) => id !== 'pc'), pcRest]),
        scene: j([s.scene?.present, s.scene?.positions, s.scene?.awareness, s.scene?.concealed]),
        combat: j([s.encounter, s.pending_combat, s.pending_intents, s.mode]),
        'quest.status': j(contracts.map((q) => [q.id, q.status, q.history])),
        'guild.board': j([s.guild?.boards, contracts.map((q) => q.id)]),
        'guild.standing': j(s.guild?.membership),
        quests: j(quests.map((q) => (q.kind === 'guild_contract' ? (({ status: st, history, ...rest }) => rest)(q) : q))),
        trade: j([s.offers, s.decisions, s.services]),
        facts: j(s.facts),
        knowledge: j([s.knowledge, s.claims]),
        relations: j(s.relations),
        memory: j(s.memories),
        threads: j(s.threads),
        time: j(s.clock),
        places: j(s.places),
        objects: j(worldObjects),
    };
}

/** Why the regions an event of this step changed break the Decision Ownership, or null. */
export function effectViolation(step, e, before, after) {
    for (const kind of Object.keys(after)) {
        if (before[kind] === after[kind]) continue;
        const why = kindViolation(step, kind, e, 'changed');
        if (why) return why;
    }
    return null;
}

/**
 * What each extractor delta may write. `writes`: the kinds of its own handler; `gates`: an engine-owned kind it may
 * reach only through the named check (docs/ARCHITECTURE_GEN35.md §2.2). A test replays every recorded run against it.
 */
export const DELTA_WRITES = {
    time: { writes: ['time'] },
    // an arrival moves him and the people with him, may create the place, starts a journey, carries or closes open
    // decisions, and fires the turn-in his own command made conditional on arriving at a Guild hall (with the engine's
    // own record of it: the fact "completed_contract" and what its witnesses remember; the trophies it consumes take
    // their quest ties with them)
    arrive: { writes: ['pc.location', 'scene', 'entities', 'places', 'quests', 'trade', 'knowledge', 'facts', 'memory', 'objects'], gates: { 'quest.status': 'conditional', 'pc.coin': 'conditional', 'pc.progress': 'conditional', 'pc.inventory': 'conditional', 'guild.standing': 'conditional' } },
    'person.new': { writes: ['entities', 'scene', 'facts', 'places', 'knowledge'] },
    'person.named': { writes: ['entities'] },
    'creature.new': { writes: ['entities', 'scene', 'facts'], gates: { combat: 'envelope.fight' } },
    enter: { writes: ['scene', 'entities'] },
    leave: { writes: ['scene', 'entities', 'knowledge'] },
    position: { writes: ['scene', 'entities'] },
    aware: { writes: ['scene', 'entities'] },
    intent: { writes: [], gates: { combat: 'narrated_intent' } },
    hostile: { writes: ['entities', 'scene'], gates: { combat: 'envelope.fight' } },
    fact: { writes: ['facts', 'entities', 'knowledge'] },
    // a present witness who sees it happen: the narration establishes the fact (delta.js); hearsay only makes a claim
    learn: { writes: ['knowledge', 'facts', 'scene'] },
    attitude: { writes: ['relations'] },
    memory: { writes: ['memory'] },
    thread: { writes: ['threads'] },
    recover: { writes: ['entities'], gates: { 'pc.vitals': 'player.rest' } },
    'object.new': { writes: ['objects'], gates: { 'pc.inventory': 'player.take' } },
    // a thing handed to him (a gift), or taken from where it lies by his own take
    'object.move': { writes: ['objects'], gates: { 'pc.inventory': ['envelope.give', 'player.take'] } },
    'object.mark': { writes: ['objects'] },
    // an offer may meet a purchase he agreed to in advance within his limit: the engine books it (trade.js)
    offer: { writes: ['trade'], gates: { 'pc.coin': 'player.buy', 'pc.inventory': 'player.buy' } },
    'coin.gift': { writes: [], gates: { 'pc.coin': 'envelope.give' } },
    coerce: { writes: [], gates: { 'pc.coin': 'envelope.take', 'pc.inventory': 'envelope.take' } },
    'quest.offer': { writes: ['quests'] },
    'quest.detail': { writes: ['quests'] },
    'quest.progress': { writes: ['quests'] },
    'quest.ready': { writes: ['quests'] },
    'quest.close': { writes: ['quests'], gates: { 'quest.status': 'world.failed' } },
    'listing.gone': { writes: [], gates: { 'guild.board': 'world.taken', 'quest.status': 'world.taken' } },
    overreach: { writes: [] },
};

/** Kinds every step may write without a gate: the audit records of the turn. */
export const ALWAYS = new Set(['audit']);

/** Is a kind engine-owned? */
export const engineOwned = (kind) => !!STATE_KINDS[kind]?.engine;

// ------------------------------------------------------------------------------------------------ free text
// What a free-text store (a quest note, a memory) may not keep: the engine's own state of a contract or of Alaric's
// standing (live run 30.09.2026 22:41: "Contract registered and active; payout 60 cp from the Alderwatch drawer" was
// stored while the contract was still on the board): its formal status (registered, logged, accepted, active,
// completed, turned in, failed), its payout, Quest XP, Guild rank and promotion. Routes, contacts, observations, local
// hints, times and plausible verification stay; so does a client's own bonus. One rule for every store; a memory keeps
// a payment for goods or a service as a moment (it is not a payout).
const ENGINE_STATUS = /\b(?:registered|logged|turned\s+in|handed\s+in|(?:contract|quest|job|slip)\b[^.;]{0,40}\b(?:active|accepted|listed|complete|completed|closed|failed|finished))\b|^\W*(?:active|accepted|completed|closed|failed)\b/i;
const ENGINE_MONEY = /\b(?:payouts?|rewards?|pays?\s+out|paid\s+out|xp|experience\s+points|guild\s+rank|promot\w*)\b/i;
const MONEY_AMOUNT = /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|a\s+hundred)\s*(?:cp|coppers?|silvers?|golds?)\b/i;
const MONEY_TOPIC = /\b(?:pay\w*|reward\w*|fees?|contract|bount(?:y|ies)|drawer|posted)\b/i;
// in a memory "paid the ferryman 2 copper" is a moment; only the Guild's money is the engine's
const GUILD_MONEY_TOPIC = /\b(?:reward\w*|fees?|contract|bount(?:y|ies)|drawer|posted|payouts?)\b/i;
const CLIENT_OWN = /\b(?:bonus|own\s+purse|from\s+(?:his|her|their)\s+own)\b/i;

/**
 * The engine-owned kind a clause of free text states, or null.
 * @param {string} clause one sentence or clause
 * @param {{store?: 'note'|'memory'}} [opts] note: a quest note (any money with a payment word is the contract's);
 *   memory: a moment (a payment for goods stays)
 */
// A memory is everyday prose: "registered surprise", "the only reward was a smile", "promoted to head cook", "logged
// every boat", "the dice paid out" are moments (review of 4.2.0). There a status word or a soft money word is the
// engine's only beside the Guild's own words; Quest XP and a payout always are.
const GUILD_CONTEXT = /\b(?:guild|contracts?|quests?|jobs?|slips?|members?(?:hip)?|clerks?|desk|registry|bount(?:y|ies)|drawer|listings?|board)\b/i;
const HARD_MONEY = /\b(?:payouts?|xp|experience\s+points)\b/i;
const moneyKind = (x) => (/\b(?:xp|experience\s+points)\b/i.test(x) ? 'pc.progress' : /\b(?:guild\s+rank|promot\w*)\b/i.test(x) ? 'guild.standing' : 'pc.coin');
function ownedInMemory(x) {
    if (ENGINE_STATUS.test(x) && GUILD_CONTEXT.test(x)) return /\b(?:registered)\b/i.test(x) && !/\b(?:contract|quest|job|slip)\b/i.test(x) ? 'guild.standing' : 'quest.status';
    if (CLIENT_OWN.test(x)) return null;
    if (HARD_MONEY.test(x) || (ENGINE_MONEY.test(x) && GUILD_CONTEXT.test(x))) return moneyKind(x);
    if (MONEY_AMOUNT.test(x) && GUILD_MONEY_TOPIC.test(x)) return 'pc.coin';
    return null;
}

export function ownedClause(clause, { store = 'note' } = {}) {
    const x = String(clause || '');
    if (store === 'memory') return ownedInMemory(x);
    if (ENGINE_STATUS.test(x)) return /\b(?:registered)\b/i.test(x) && !/\b(?:contract|quest|job|slip)\b/i.test(x) ? 'guild.standing' : 'quest.status';
    if (CLIENT_OWN.test(x)) return null;
    if (ENGINE_MONEY.test(x)) return /\b(?:xp|experience\s+points)\b/i.test(x) ? 'pc.progress' : /\b(?:guild\s+rank|promot\w*)\b/i.test(x) ? 'guild.standing' : 'pc.coin';
    if (MONEY_AMOUNT.test(x) && (store === 'memory' ? GUILD_MONEY_TOPIC : MONEY_TOPIC).test(x)) return 'pc.coin';
    return null;
}

/** A clause of a quest note that states the engine's state of the contract (its status, payout, XP, rank). */
export const engineClause = (x) => ownedClause(x, { store: 'note' }) !== null;

/** The clauses of a free text, in order ("A. B; C" → ["A.", "B;", "C"]). */
export const clausesOf = (text) => String(text || '').split(/(?<=[.;])\s+/).filter((c) => c.trim());

/** The contract state a text claims ("registered and active", "turned in", "failed"), or null. */
export function claimedStatus(x) {
    if (/\b(?:complete|completed|turned\s+in|handed\s+in|closed|finished|paid\s+out)\b/i.test(x)) return 'completed';
    if (/\bfailed\b/i.test(x)) return 'failed';
    if (/\b(?:registered|logged|accepted|active|stamped)\b/i.test(x)) return 'active';
    return null;
}

/** A claimed state that is not the contract's (it keeps the engine's): "active" holds for an active or completed one. */
export const wrongClaim = (claim, q) => !!claim && !!q && !(claim === 'active' ? ['active', 'completed'] : [claim]).includes(q.status);

const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20 };
const COIN_CP = { copper: 1, coppers: 1, cp: 1, silver: 10, silvers: 10, gold: 100, golds: 100 };

/** Amounts in copper a text names ("2 silver (20 cp)" → [20, 20]; "a silver" → [10]). */
export function amountsCp(t) {
    const out = [];
    for (const m of String(t).toLowerCase().matchAll(/\b(\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten|twenty)\s*(coppers?|cp|silvers?|golds?)\b/g)) {
        const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]];
        out.push(n * COIN_CP[m[2]]);
    }
    return out;
}

const REWARD_WORD = /\b(?:payouts?|rewards?|bount(?:y|ies)|pay(?:s|ing|ment)?|paid)\b/;
const NEGATION = /\b(?:not|no|never|won't|wont|don't|doesn't|without|unpaid|forfeit\w*)\b/;
const REWARD_REVISION = /\b(?:chang\w*|rais\w*|lower\w*|increas\w*|decreas\w*|overrid\w*|replac\w*|doubl\w*|halv\w*|waiv\w*|prepa\w*|advance[sd]?|already paid)\b/;
const INSTITUTION_RULE = /\b(?:guild rank|promot\w*|xp|experience points|registration fee)\b/;
const CLIENT_BONUS = /\b(?:bonus|own purse|from (?:his|her|their) own)\b/;

/**
 * Does a Guild contract's quest.detail change what the engine owns (live 30.09.2026)? A detail keeps story memory
 * (contacts, routes, schedules, witnesses, a road toll). The payout is the Guild's, paid at turn-in: within a clause
 * about payment, an amount other than the posted payout (in any coin and wording: "payout eight silver" is the posted
 * 80 cp), a revision of it or a condition that withholds it is the engine's; so are Guild rank, promotion, XP and the
 * registration fee.
 */
export function detailRevisesMechanics(detail, q) {
    const lower = String(detail).toLowerCase();
    if (INSTITUTION_RULE.test(lower)) return true;
    const posted = Number(q.payout_cp);
    for (const clause of lower.split(/[.;]/)) {
        if (!REWARD_WORD.test(clause) || CLIENT_BONUS.test(clause)) continue;
        if (REWARD_REVISION.test(clause) || NEGATION.test(clause)) return true;
        const amounts = amountsCp(clause);
        if (amounts.length && !amounts.every((a) => a === posted) && amounts.reduce((sum, a) => sum + a, 0) !== posted) return true;
    }
    return false;
}

/**
 * A free text with what the engine owns taken out (docs/ARCHITECTURE_GEN35.md §2.2): the clauses it keeps, the ones it
 * drops (with the kind they state) and the contract states it claims.
 * @param {string} text
 * @param {{store?: 'note'|'memory', quest?: object|null, extra?: (clause: string) => boolean}} [opts] quest: the
 *   Guild contract the text is about (a clause that changes its mechanics goes too); extra: further clauses the
 *   caller's domain refuses (a hunt's local sign-off)
 * @returns {{kept: string[], owned: string[], altered: string[], other: string[], kinds: string[], claims: string[]}}
 */
export function stripOwned(text, { store = 'note', quest = null, extra = null } = {}) {
    const clauses = clausesOf(text);
    const owned = clauses.filter((c) => ownedClause(c, { store }) !== null);
    const altered = quest ? clauses.filter((c) => detailRevisesMechanics(c, quest)) : [];
    const other = extra ? clauses.filter((c) => !owned.includes(c) && !altered.includes(c) && extra(c)) : [];
    const kept = clauses.filter((c) => !owned.includes(c) && !altered.includes(c) && !other.includes(c));
    return {
        kept, owned, altered, other,
        kinds: [...new Set(owned.map((c) => ownedClause(c, { store })))],
        claims: owned.map(claimedStatus).filter(Boolean),
    };
}
