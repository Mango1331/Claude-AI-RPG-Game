// Runtime V4: the domains the engine owns (docs/RUNTIME_V4_PLAN.md §6): the place tree, objects, offers, the quest
// aggregate, the Guild and the open decisions. This module holds their reducers (state.js applyEvent hands every V4
// event here) and the queries the command handlers, the world applier, the catalog and the views share.
//
// The model follows the P0/S3 prototype (tools/p0/s3_prototype.mjs), which replayed the V12 gold 36/36; here it is an
// event-sourced part of the product state: every change is an event on a chat message, the state is their fold.
//
//   places     id -> {id, name, kind, sub, parent, realm, tags[], by}      kind: realm|region|wilderness|settlement|
//                                                                       district|site|interior; Guild halls are engine
//                                                                       nodes "<settlement>.guild_hall" (tag guild_hall)
//   objects    id -> {id, name, kind, stack, qty, unit, holder, marks[], for_quests[], source}
//              holder: {entity: id} | {loc: place id} | {consumed: by}; what Alaric holds is mirrored into his sheet's
//              inventory (a derived view, so the V3 views and commands show it)
//   offers     id -> {id, seller, at, status: open|accepted|declined|expired, canon, lines[{id, what, kind, service, qty,
//              price_cp}], turn}
//   quests     the shared quest map; V4 quests carry kind guild_contract|private and the fields of plan §6.3
//   guild      {membership: {rank, since, branch} | null, boards: {"<branch>|<rank>": {branch, rank, day, listings[]}}}
//   decisions  [{id, kind: registration|purchase|payment|sale, what, offer, seller, at, turn, max_cp, any_price, priced}]
//   credits    [{cp, at, day}] the engine's last credits to Alaric (Guild payouts, sales), set on first use
import { clone, normText } from '../util.js';

export const PLACE_KINDS = ['realm', 'region', 'wilderness', 'settlement', 'district', 'site', 'interior'];
/** Which parent a place may have (plan §6.1). */
export const PLACE_PARENTS = {
    realm: [],
    region: ['realm', 'region'],
    wilderness: ['realm', 'region', 'wilderness'],
    settlement: ['realm', 'region', 'wilderness'],
    district: ['settlement'],
    site: ['settlement', 'district', 'region', 'wilderness', 'site'],
    interior: ['site', 'district', 'settlement', 'interior'],
};
export const HALL_NAME = "Adventurers' Guild hall";

export const V4_EVENTS = new Set([
    'place.created',
    'object.created', 'object.moved', 'object.marked', 'object.consumed',
    'offer.created', 'offer.closed', 'transaction.completed', 'service.granted',
    'quest.created', 'quest.status', 'quest.detailed', 'quest.progressed', 'quest.ready', 'quest.journey', 'proof.checked',
    'board.refreshed', 'board.failed', 'board.shown',
    'guild.registered', 'guild.promoted',
    'decision.opened', 'decision.closed',
    'cmd.interpreted', 'cmd.resolved', 'cmd.completed', 'cmd.expired',
    'extract.applied', 'extract.failed', 'overreach.noted',
]);

/** The V4 part of an empty state (state.js emptyState). */
export function emptyDomains() {
    return { places: {}, objects: {}, offers: {}, guild: { membership: null, boards: {} }, decisions: [], services: [] };
}

function ensure(state) {
    for (const [k, v] of Object.entries(emptyDomains())) if (state[k] === undefined) state[k] = v;
}

/** Alaric's sheet inventory mirrors the objects he holds (objects never collide with template ids: "obj.…"). */
function mirror(state, id) {
    const o = state.objects[id];
    const sheet = state.entities.pc?.sheet;
    if (!o || !sheet) return;
    if (o.holder?.entity === 'pc' && (o.qty ?? 1) > 0) {
        sheet.inventory[id] = o.qty ?? 1;
        if (!state.item_names) state.item_names = {};
        state.item_names[id] = o.unit ? `${o.name} (${o.unit})` : o.name;
    } else delete sheet.inventory[id];
}

/** Apply one V4 event in place (called by state.js applyEvent). */
export function applyDomainEvent(state, e) {
    ensure(state);
    const d = e.d || {};
    switch (e.t) {
        case 'place.created':
            if (state.places[d.place.id]) throw new Error(`place exists: ${d.place.id}`);
            state.places[d.place.id] = clone(d.place);
            break;
        case 'object.created':
            if (state.objects[d.object.id]) throw new Error(`object exists: ${d.object.id}`);
            state.objects[d.object.id] = { marks: [], for_quests: [], ...clone(d.object) };
            mirror(state, d.object.id);
            break;
        case 'object.moved': {
            const o = state.objects[d.id];
            if (!o) throw new Error(`unknown object ${d.id}`);
            if (d.split && d.qty && d.qty < (o.qty ?? 1)) {
                // part of a stack changes hands: the part becomes its own object
                state.objects[d.split] = { ...clone(o), id: d.split, qty: d.qty, holder: clone(d.to) };
                o.qty -= d.qty;
                mirror(state, d.split);
            } else o.holder = clone(d.to);
            mirror(state, d.id);
            break;
        }
        case 'object.marked': {
            const o = state.objects[d.id];
            if (!o) throw new Error(`unknown object ${d.id}`);
            o.marks = [...(o.marks || []), { text: d.mark, by: d.by ?? null, turn: d.turn ?? state.turn }];
            break;
        }
        case 'object.consumed': {
            const o = state.objects[d.id];
            if (!o) throw new Error(`unknown object ${d.id}`);
            if (d.qty && d.qty < (o.qty ?? 1)) o.qty -= d.qty;
            else o.holder = { consumed: d.by || 'used' };
            mirror(state, d.id);
            break;
        }
        case 'offer.created':
            state.offers[d.offer.id] = clone(d.offer);
            break;
        case 'offer.closed':
            if (state.offers[d.id]) state.offers[d.id].status = d.status;
            break;
        case 'service.granted':
            state.services = [...(state.services || []), { service: d.service, by: d.by ?? null, at: d.at ?? null, turn: d.turn ?? state.turn, minute: state.clock.minute }].slice(-10);
            break;
        case 'quest.created':
            state.quests[d.quest.id] = clone(d.quest);
            break;
        case 'quest.status': {
            const q = state.quests[d.id];
            if (!q) throw new Error(`unknown quest ${d.id}`);
            q.status = d.to;
            if (d.taker !== undefined) q.taker = d.taker;
            q.history = [...(q.history || []), { turn: state.turn, minute: state.clock.minute, status: d.to, ...(d.at ? { at: d.at } : {}), ...(d.step ? { step: d.step } : {}), ...(d.by ? { by: d.by } : {}) }];
            break;
        }
        case 'quest.detailed': {
            const q = state.quests[d.id];
            if (!q) throw new Error(`unknown quest ${d.id}`);
            q.details = [...(q.details || []), { note: d.note, schedule: d.schedule ?? null, turn: state.turn }];
            q.notes = [...(q.notes || []), d.note].slice(-6);
            if (d.schedule) q.schedule = { ...(q.schedule || {}), starts_at: d.schedule };
            break;
        }
        case 'quest.progressed': {
            const q = state.quests[d.id];
            if (!q) throw new Error(`unknown quest ${d.id}`);
            q.progress = [...(q.progress || []), { objective: d.objective, status: d.status, turn: state.turn }];
            q.notes = [...(q.notes || []), `${d.objective}: ${d.status}`].slice(-6);
            break;
        }
        case 'quest.ready': {
            const q = state.quests[d.id];
            if (!q) throw new Error(`unknown quest ${d.id}`);
            q.ready = true;
            q.ready_note = d.note || null;
            q.notes = [...(q.notes || []), `Outcome achieved: ${d.note || q.desired_end_state || 'ready for turn-in'}`].slice(-6);
            break;
        }
        case 'quest.journey': {
            // the quest's journey has actually begun: Alaric set off on it (src/v4/catalog.js journeyReady)
            const q = state.quests[d.id];
            if (!q) throw new Error(`unknown quest ${d.id}`);
            q.journey = { since: state.turn, from: d.at ?? null };
            break;
        }
        case 'board.refreshed':
            state.guild.boards[d.key] = { branch: d.branch, rank: d.rank, day: d.day, listings: [...d.listings] };
            break;
        case 'guild.registered':
            state.guild.membership = { rank: d.rank, since: { turn: state.turn, minute: state.clock.minute }, branch: d.branch ?? null };
            break;
        case 'guild.promoted':
            if (state.guild.membership) state.guild.membership.rank = d.rank;
            break;
        case 'decision.opened':
            state.decisions = [...state.decisions.filter((x) => x.id !== d.decision.id), clone(d.decision)];
            break;
        case 'decision.closed':
            state.decisions = state.decisions.filter((x) => x.id !== d.id);
            break;
        case 'transaction.completed':
            // the engine's own credits to Alaric (a Guild payout, a sale), by place and day: coin the story then shows
            // him pick up there that day is this coin, not new coin (src/v4/world.js coin.gift). His payments are audit.
            if (d.to === 'pc') state.credits = [...(state.credits || []), { cp: d.cp, at: d.at ?? state.scene?.at ?? null, day: today(state) }].slice(-6);
            break;
        // audit only: the record of what was interpreted, resolved, applied or refused
        case 'proof.checked':
        case 'board.failed':
        case 'board.shown':
        case 'cmd.interpreted':
        case 'cmd.resolved':
        case 'cmd.completed':
        case 'cmd.expired':
        case 'extract.applied':
        case 'extract.failed':
        case 'overreach.noted':
            break;
        default:
            throw new Error(`unknown V4 event type: ${e.t}`);
    }
}

// ------------------------------------------------------------------------------------------------ queries: places
export const isV4 = (state) => state.meta?.runtime === 'v4';

/** The node and its ancestors, nearest first. */
export function lineage(state, id) {
    const out = [];
    let cur = id;
    for (let i = 0; cur && state.places?.[cur] && i < 16; i++) {
        out.push(cur);
        cur = state.places[cur].parent;
    }
    return out;
}

export const pathNames = (state, id) => lineage(state, id).map((x) => state.places[x].name);

/** "Veyrhold › Redmarch › Adventurers' Guild hall": root first, as the catalog and the engine block write it. */
export function placePath(state, id) {
    const names = pathNames(state, id).reverse();
    return names.length ? names.join(' › ') : String(id || 'unknown');
}

export const settlementOf = (state, id) => lineage(state, id).find((x) => state.places[x].kind === 'settlement') || null;
export const realmOf = (state, id) => lineage(state, id).find((x) => state.places[x].kind === 'realm') || null;
/** The Guild hall node that contains a place (the hall itself or anything below it), or null. */
export const hallOf = (state, id) => lineage(state, id).find((x) => (state.places[x].tags || []).includes('guild_hall')) || null;
/** The Guild hall of a settlement (the engine's fixed node), or null when it has no branch. */
export function hallOfSettlement(state, settlement) {
    const id = `${settlement}.guild_hall`;
    return state.places?.[id] && (state.places[id].tags || []).includes('guild_hall') ? id : null;
}
export const childrenOf = (state, id) => Object.values(state.places || {}).filter((p) => p.parent === id).map((p) => p.id);

/** A place's short name for PLAYER ACTIONS: "Adventurers' Guild hall, Redmarch", "reedbeds". */
export function placeName(state, id) {
    const p = state.places?.[id];
    if (!p) return String(id || 'somewhere');
    if ((p.tags || []).includes('guild_hall')) {
        const town = settlementOf(state, id);
        return town ? `${p.name}, ${state.places[town].name}` : p.name;
    }
    return p.name;
}

const COIN_WORDS = new Set(['coin', 'coins', 'copper', 'coppers', 'silver', 'silvers', 'gold', 'golds', 'cp', 'piece', 'pieces', 'money', 'reward', 'payout', 'payment', 'quest', 'guild']);
const COIN_AMOUNT = /^(?:the|my|his|her|their|our|some|a|an|of|handful|few|several|pile|stack|\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)$/;

/**
 * Loose coin ("the copper", "90 copper", "a pile of coins", "the reward"), not a thing that holds coin ("a coin
 * purse"): coin is his purse's number (sheet.coin_cp), never an inventory object (live 30.09.2026: "take the copper"
 * after the Guild payout became a second, phantom "copper" in his inventory).
 */
export function isLooseCoin(name) {
    // the coin itself, not whose it was or where it lies ("the bandit's coins", "the silver on the counter")
    const phrase = normText(name || '').replace(/^.*\b[a-z]+'s?\s+/, '').split(/\s+(?:in|on|from|at|inside|under|behind|beneath|off)\s+/)[0];
    const w = phrase.split(/\s+/).filter((x) => x && !COIN_AMOUNT.test(x));
    return w.length > 0 && w.every((x) => COIN_WORDS.has(x)) && w.some((x) => !['quest', 'guild'].includes(x));
}

/** Local = the same settlement (plan §6.1); else a journey. */
export function sameSettlement(state, a, b) {
    const sa = settlementOf(state, a);
    return !!sa && sa === settlementOf(state, b);
}

// ------------------------------------------------------------------------------------------------ queries: creature kinds
/** A noun's stem, the same for its singular and plural ("wolves"/"wolf", "ponies"/"pony", "horses"/"horse"). */
const stem = (w) => String(w).replace(/ves$/, 'f').replace(/ies$/, 'y').replace(/(?<!s)s$/, '').replace(/e$/, '');
const PLACE_WORDS = new Set(['in', 'at', 'on', 'near', 'from', 'within', 'inside', 'around', 'along', 'by', 'under', 'beyond', 'across', 'behind', 'over', 'through', 'to', 'for', 'that', 'which', 'who', 'with']);
const DETERMINERS = new Set(['the', 'a', 'an', 'some', 'those', 'these', 'its', 'their', 'his', 'her']);
/**
 * The creature a text names: the stems of all its words, of its noun phrase (up to a place, a clause or a participle:
 * "the rats in the cellar", "the wolves harrying the sheep", not "the stirring dead") and of its last word.
 */
export function kindOf(text) {
    const tokens = normText(text).replace(/[^a-z\s-]+/g, ' ').split(/\s+/).filter(Boolean);
    const cut = tokens.findIndex((w, i) => PLACE_WORDS.has(w) || (i > 0 && w.length >= 6 && w.endsWith('ing') && !w.includes('-') && !DETERMINERS.has(tokens[i - 1])));
    const words = (list) => list.flatMap((w) => w.split('-')).filter(Boolean).map(stem);
    const phrase = words(cut < 0 ? tokens : tokens.slice(0, cut));
    return { words: new Set(words(tokens)), phrase: new Set(phrase), head: phrase.at(-1) || null };
}

/**
 * Does a hunting objective ("the vermin in the cellar", "wild goats") name this creature kind? By the kind the text
 * names, never by the body plan alone (review of 4.1.0: the deer plan's alias "goat" made sheep wild-goat targets):
 * the species names the objective's creature or the objective the species' ("giant rats" ~ "rats", "swarm of rats"
 * ~ "rats"), or the objective names the body plan's whole kind (content monsters.json "kinds": vermin for rats).
 */
export function namesKind(what, species, anchor) {
    const t = kindOf(what);
    const g = kindOf(species || '');
    const kinds = new Set((anchor?.kinds || []).map(stem));
    return (!!g.head && t.phrase.has(g.head)) || (!!t.head && g.words.has(t.head)) || [...t.phrase].some((w) => kinds.has(w));
}

// ------------------------------------------------------------------------------------------------ queries: things
export const heldBy = (state, who) => Object.values(state.objects || {}).filter((o) => o.holder?.entity === who);
export const lyingAt = (state, at) => Object.values(state.objects || {}).filter((o) => o.holder?.loc === at);
export const openOffers = (state) => Object.values(state.offers || {}).filter((o) => o.status === 'open');
export const contracts = (state) => Object.values(state.quests || {}).filter((q) => q.kind === 'guild_contract');
export const membership = (state) => state.guild?.membership || null;
export const today = (state) => Math.floor((state.clock?.minute ?? 0) / 1440) + 1;
export const boardKey = (branch, rank) => `${branch}|${rank}`;

/** The listed contracts of a branch's board for one rank. */
export function listingsOf(state, branch, rank) {
    const b = state.guild?.boards?.[boardKey(branch, rank)];
    return (b?.listings || []).map((id) => state.quests[id]).filter((q) => q && q.status === 'listed');
}

/** The branch's supported ranks (content may name them per place; else the proposed runtime defaults). */
export function supportedRanks(state, content, settlement) {
    const p = state.places?.[settlement];
    if (Array.isArray(p?.supported_ranks)) return p.supported_ranks;
    return content.rules.guild.supported_ranks?.[p?.sub] || ['Novice'];
}

// ------------------------------------------------------------------------------------------------ campaign start
/**
 * The place tree a V4 campaign starts with (plan §6.1): every realm, every settlement of the content (lore.json) under
 * its realm, the engine's fixed Guild hall node in each settlement with a branch (rules.guild.branch_kinds), and the
 * spot the campaign begins at, outside its city. Deterministic: the same content gives the same tree.
 */
export function seedPlaces(content, loc, startName) {
    const places = [];
    const branch = content.rules.guild?.branch_kinds || [];
    for (const f of content.factions.values()) {
        if (f.kind === 'realm') places.push({ id: f.id, name: f.name, kind: 'realm', parent: null, realm: f.id, tags: [], by: 'content' });
    }
    for (const l of content.locations.values()) {
        places.push({ id: l.id, name: l.name, kind: 'settlement', sub: l.kind, parent: l.realm || null, realm: l.realm || null, tags: [], by: 'content' });
        if (branch.includes(l.kind)) places.push({ id: `${l.id}.guild_hall`, name: HALL_NAME, kind: 'site', parent: l.id, realm: l.realm || null, tags: ['guild_hall'], by: 'engine' });
    }
    const at = `${loc.id}.verge`;
    places.push({ id: at, name: startName, kind: 'site', parent: loc.id, realm: loc.realm || null, tags: [], by: 'content' });
    return { places, at };
}
