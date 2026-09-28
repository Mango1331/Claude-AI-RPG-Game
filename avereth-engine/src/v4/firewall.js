// Runtime V4: the domain/authority firewall between the world-delta extractor and the commit (docs/RUNTIME_V4_PLAN.md
// §5.7). A schema-valid delta is a proposal. Before the engine applies it step by step (src/v4/world.js), this firewall
// decides by who owns the state it would change, never by how plausible it reads:
//
//   source              may change
//   player_command      Alaric's decisions (go, take, pay, accept, turn in, register …), resolved by the engine
//   engine_resolution   coin of a transaction, quest status, Guild membership and rank, payout, XP, what the engine
//                       hands Alaric (the Guild plate, a contract slip), PC inventory
//   board_generator     official Guild listings
//   narrator_delta      the world: new people, places, creatures, facts, knowledge, attitudes, offers of ordinary
//                       sellers, gifts, hand-overs to Alaric, marks, private quests, hostility
//
// P0/S2 (docs/P0_BERICHT.md §4, §11): 5 of the 7 forbidden deltas of variant A were faithful readings of prose that
// contradicted the engine (the reeve paying the Guild reward, the plate handed over a second time, the registration
// fee as an ordinary offer, a Guild contract "delivered" as an objective). Only an engine rule can refuse them; telling
// the extractor to ignore the prose would make it a worse reader. A refused delta is never committed: it goes to the
// audit (event extract.rejected), and where the story contradicted the engine, the next engine block carries a
// correction. What the world handlers check while applying (time caps, place tree, presence, offers of a sale) stays
// in src/v4/world.js; this module only knows authority.
import { normText } from '../util.js';

/** Fact predicates that are state with their own delta or domain (plan §5.1): never a free fact. */
export const STATE_PREDICATES = new Set(['located', 'intent', 'guild_rank', 'power_rank']);
/** Possession predicates: about Alaric they are the engine's inventory, never a fact. */
export const POSSESSION_PREDICATES = new Set(['takes', 'took', 'carries', 'has', 'holds', 'lacks', 'owns', 'receives', 'received', 'pays', 'paid']);

const GUILD_NAME = /\bguild\b/i;
// an official at a Guild desk (only where the context says it is one: a clerk at a harbour office is not the Guild)
const DESK_ROLE = /\b(?:clerk|registrar|receptionist|desk|board)\b/i;
const GUILD_CANON_ITEM = /\b(?:regist\w*|member\w*|plate|badge|medallion|licen[cs]e|fee|rank|contract|slip)\b/i;
const CONTRACT_DOC = /\b(?:slip|tag|contract|chit|docket|writ|paper|ticket)\b/i;
const PAYOUT_WHY = /\b(?:reward|bounty|payout|pay(?:ment)?\s+for|contract|quest|job|fee for the)\b/i;
// handing a contract in: "turn it in", "hand in", or bringing/delivering/reporting something to the Guild or its desk
const TURN_IN_OBJECTIVE = /\b(?:turn(?:ed|s|ing)?|hand(?:ed|s|ing)?)\s+(?:it\s+|them\s+|the\s+\w+\s+)?in\b|\b(?:deliver\w*|return\w*|report\w*|bring\w*|brought|tak(?:e|es|ing)|hand\w*)\b[^.;]*\b(?:guild|desk|hall|clerk)\b/i;
const PC_REF = /^(?:pc|alaric(?: red)?)$/i;
const ENGINE_FACT = /\b(?:regist\w*|guild rank|member\w*|novice|proven|veteran|power rank|coin|copper|silver|paid|reward|payout|xp|level)\b/i;
const GUILD_QUEST_STATE = /\b(?:status|state|complete\w*|done|closed|cleared|turn(?:ed|ing)?\s+in|paid|payment|payout|reward)\b/i;
const GUILD_COMPLETION_MARK = /\b(?:cleared|complete\w*|closed|paid|turned?\s+in|accepted|settled)\b/i;
const GUILD_DETAIL_MECHANIC = /\b(?:fees?|costs?|prices?|pay(?:s|ing|ment)?|paid|payouts?|rewards?|copper|silver|gold|complete\w*|cleared|guild\s+rank|promotion)\b/i;

// The Guild's mechanics are the engine's (live run 28.09.2026: the clerk's "F-Rank to start, for everyone" became the fact
// "new Guild members start at F-Rank" and came back in the next engine block): what registration costs or requires,
// the rank a member holds or starts at, which contracts a rank may take, promotion, payouts. The story may describe the
// hall, its people and its customs; a fact that defines these mechanics is refused. "Guild registration takes about a
// quarter hour" stays a fact (P0/S2), so does "a wall of Quest slips marked in rank bands" (V12).
const GUILD_MONEY = /\b(?:fees?|costs?|price[sd]?|payments?|payouts?|pays? out|paid|dues|silver|copper|gold|coins?|crowns?|\d+\s*cp)\b/;
// a client's own bonus on top of a contract is the client's, not the Guild's (lorebook uid 34: "a separate client bonus")
const CLIENT_BONUS = /\b(?:bonus|own purse|from (?:his|her|their) own)\b/;
const GUILD_MONEY_TOPIC = /\b(?:regist\w*|member\w*|join\w*|enrol\w*|dues|contracts?|quests?|bount(?:y|ies)|payouts?|rewards?)\b/;
const REGISTRATION_TOPIC = /\b(?:regist\w*|member\w*|join\w*|enrol\w*)\b/;
// on the lower-cased text, hyphens kept, possessives off: "F-Rank", "rank E", "an E rank" (the Power Rank letters F to
// S; never the article "a rank", nor "a registrant's rank")
const RANK_LABEL = /\b(?:(?:[a-f]|s)-rank(?:ed)?|(?:[b-f]|s) rank|rank (?:[a-f]|s)|novices?|proven|veterans?|elites?|grandmasters?|masters?|legends?)\b/;
const rankText = (v) => text(v).toLowerCase().replace(/['’]s\b/g, '').replace(/_/g, ' ');
const RANK_HOLDERS = /\b(?:members?|newcomers?|recruits?|registrants?|beginners?|everyone|everybody|new ones?)\b/;
const RANK_ASSIGN = /\b(?:start(?:s|ed|ing)?|begin(?:s|ning)?|began|become|becomes|receive[sd]?|given|assigned|placed|enter(?:s|ed)?|holds?|gets?)\b/;
const RANK_RIGHTS = /\b(?:contracts?|quests?|jobs?|listings?)\b[^.;]*\b(?:up to|only|may|can|cannot|allowed|waiver|above|below)\b|\b(?:up to|only|may|can|cannot|allowed|waiver)\b[^.;]*\b(?:contracts?|quests?|jobs?|listings?)\b/;
const PROMOTION = /\bpromot\w*/;
// what contradicts the canon (only then a correction): a Power Rank letter as a Guild rank, or another start than Novice
const POWER_LABEL = /\b(?:(?:[a-f]|s)-rank(?:ed)?|(?:[b-f]|s) rank|rank (?:[a-f]|s))\b/;
const RANK_START = /\b(?:start(?:s|ed|ing)?|begin(?:s|ning)?|began)\b/;
const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20 };
const COIN_CP = { copper: 1, coppers: 1, cp: 1, silver: 10, silvers: 10, gold: 100, golds: 100 };

/** Amounts in copper a text names ("2 silver (20 cp)" → [20, 20]; "a silver" → [10]). */
function amountsCp(t) {
    const out = [];
    for (const m of String(t).toLowerCase().matchAll(/\b(\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten|twenty)\s*(coppers?|cp|silvers?|golds?)\b/g)) {
        const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]];
        out.push(n * COIN_CP[m[2]]);
    }
    return out;
}

/** Is a fact the Guild's mechanics (engine-owned)? Returns the kind ('money', 'rank', 'rights', 'promotion') or null. */
function guildMechanic(d, ctx) {
    const all = words(`${text(d.s)} ${text(d.p)} ${text(d.o)}`);
    if (!GUILD_NAME.test(all) && !ctx.inGuildHall) return null;
    const po = words(`${text(d.p)} ${text(d.o)}`);
    const lower = `${text(d.s)} ${text(d.p)} ${text(d.o)}`.toLowerCase();
    if (GUILD_MONEY.test(po) && GUILD_MONEY_TOPIC.test(all) && !CLIENT_BONUS.test(all)) return 'money';
    if (GUILD_CANON_ITEM.test(words(d.s)) && GUILD_MONEY.test(po) && !CLIENT_BONUS.test(all)) return 'money';
    const label = RANK_LABEL.test(`${rankText(d.p)} ${rankText(d.o)}`);
    const rank = label || /\brank\b/.test(po);
    // his own rank, on him or on his card or plate ("F-Rank, Lumenford branch" on the card, live run 28.09.2026)
    if (label && /^(?:pc|alaric|his)\b/.test(words(d.s))) return 'rank';
    if (rank && RANK_RIGHTS.test(lower)) return 'rights';
    if (label && (RANK_HOLDERS.test(all) || RANK_ASSIGN.test(po))) return 'rank';
    if (rank && RANK_HOLDERS.test(all) && RANK_ASSIGN.test(po)) return 'rank';
    if (PROMOTION.test(po)) return 'promotion';
    return null;
}

const text = (v) => (v === null || v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v));
// ids are snake_case ("npc.guild_clerk"): \b does not fall between "guild" and "_"
const words = (v) => normText(text(v)).replace(/[_.\-/]+/g, ' ').replace(/\s+/g, ' ').trim();
export const isPc = (ref) => PC_REF.test(words(ref));

/**
 * @typedef {object} FirewallContext
 * @property {(ref: string) => boolean} [isGuildPerson]  a known Guild official (clerk, registrar …) by id or name
 * @property {boolean} [inGuildHall]  Alaric is in a Guild hall (there a clerk or a desk is the Guild's)
 * @property {{id: string, title: string, payout_cp: number|null, client: string|null, status: string}[]} [contracts]
 *           the Guild's contracts (listed, active, completed)
 * @property {{registration?: boolean, grants?: string[], turnIns?: string[], accepted?: string[]}} [booked]  what the
 *           engine resolved this turn: registration paid, names of what it handed Alaric (the Guild plate, a contract
 *           slip), contracts turned in (or conditionally, on arrival), contracts accepted
 * @property {{go?: boolean, forced?: boolean, roam?: boolean, take?: boolean, gather?: boolean}} [auth]  what the
 *           player's commands authorised: a go; a forced move; an activity that moves him (search, gather, errand); a
 *           take; an activity that yields things (gather, search, craft)
 * @property {(ref: string) => boolean} [heldByPc]  an object Alaric holds (known id)
 * @property {(ref: string) => boolean} [isGuildContractRef]  a known Guild contract id
 * @property {(ref: string) => object|null} [guildContractForObject]  the Guild contract a known object belongs to
 * @property {{feeCp?: number, guildRanks?: string[], powerRanks?: string[]}} [canon]  the Guild's canon for the
 *           corrections of refused Guild facts (guild_canon): the registration fee, the Guild ranks, the Power Ranks
 */

/**
 * Decide, delta by delta, what the engine may commit.
 * @param {object[]} deltas schema-valid deltas of one extractor answer
 * @param {FirewallContext} ctx
 * @returns {{accept: object[], reject: {delta: object, rule: string, why: string}[], corrections: string[]}}
 */
export function firewall(deltas, ctx = {}) {
    const list = Array.isArray(deltas) ? deltas : [];
    const accept = [];
    const reject = [];
    const corrections = [];
    const no = (delta, rule, why, correction = null) => {
        reject.push({ delta, rule, why });
        if (correction && !corrections.includes(correction)) corrections.push(correction);
    };
    // people this answer introduces: a Guild official by role ("Guild clerk"), or a desk role inside a Guild hall
    const newGuild = new Set(list.filter((d) => d?.type === 'person.new' && (GUILD_NAME.test(words(`${text(d.role)} ${text(d.name)}`)) || (ctx.inGuildHall && DESK_ROLE.test(words(d.role)))))
        .map((d) => text(d.ref)));
    const guildy = (ref) => !!ref && (GUILD_NAME.test(words(ref)) || newGuild.has(text(ref)) || !!ctx.isGuildPerson?.(String(ref)) || (!!ctx.inGuildHall && DESK_ROLE.test(words(ref))));
    const contracts = ctx.contracts || [];
    const booked = { registration: false, grants: [], turnIns: [], accepted: [], ...(ctx.booked || {}) };
    const auth = ctx.auth || {};
    const live = (q) => q.status === 'active' || booked.turnIns.includes(q.id) || booked.accepted.includes(q.id);
    const titleWords = (t) => words(t).split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const namesContract = (s) => contracts.some((q) => { const w = titleWords(q.title); return w.length && w.filter((x) => words(s).includes(x)).length >= Math.min(2, w.length); });
    const granted = (name) => booked.grants.some((g) => words(name).includes(words(g)) || words(g).split(' ').some((w) => w.length > 3 && !/^(?:guild|novice|copper|brass|iron|pewter|silver)$/.test(w) && words(name).includes(w)));
    // known refs are exact; a {new: "<title>"} that names a known Guild contract is that contract (the engine
    // canonicalises it the same way when it applies the delta)
    const questOf = (ref) => (typeof ref === 'string' ? contracts.find((q) => q.id === ref)
        : ref && typeof ref === 'object' && typeof ref.new === 'string' ? contracts.find((q) => words(q.title) === words(ref.new)) : null) || null;
    const guildContract = (ref) => !!questOf(ref);
    for (const d of list) {
        switch (d?.type) {
            case 'offer': {
                if (guildy(d.seller) && (d.lines || []).some((l) => GUILD_CANON_ITEM.test(text(l.what)))) {
                    no(d, 'guild_canon_price', 'the Guild\'s fees and documents are the engine\'s canon, not an ordinary offer');
                    continue;
                }
                break;
            }
            case 'coin.gift': {
                if (guildy(d.from)) {
                    no(d, 'guild_payout', 'the Guild pays only through the engine, at a Guild hall', 'The Guild pays a contract\'s reward only when Alaric turns it in at a Guild hall; no other payment by the Guild was booked.');
                    continue;
                }
                const reward = PAYOUT_WHY.test(text(d.why)) && contracts.some(live);
                const sameSum = contracts.some((q) => live(q) && q.payout_cp && d.cp === q.payout_cp);
                const byClient = contracts.some((q) => q.client && words(d.from).includes(words(q.client)));
                if ((reward && (sameSum || byClient || namesContract(text(d.why)))) || (sameSum && byClient)) {
                    no(d, 'guild_payout', 'a Guild contract\'s reward is the Guild\'s to pay, at a Guild hall', `The reward of a Guild contract is paid only by the Guild when Alaric turns it in at a Guild hall; the payment by ${text(d.from)} in the last reply was not booked.`);
                    continue;
                }
                break;
            }
            case 'object.new': {
                if (granted(d.name) || (booked.registration && GUILD_CANON_ITEM.test(text(d.name)))) {
                    no(d, 'engine_booked', 'the engine already created/handed over this object with its own resolution');
                    continue;
                }
                if (isPc(d.holder) && guildContract(d.for_quest) && CONTRACT_DOC.test(text(d.name))) {
                    no(d, 'engine_booked', 'a Guild contract\'s slip is the engine\'s: it hands it over when the contract is accepted');
                    continue;
                }
                break;
            }
            case 'object.mark': {
                const q = ctx.guildContractForObject?.(text(d.object));
                if (q && (guildy(d.by) || GUILD_COMPLETION_MARK.test(text(d.mark)))) {
                    no(d, 'guild_completion', 'a Guild contract slip may receive field proof from the world, but Guild completion/clearance is booked only by the engine at turn-in',
                        q.status === 'active' ? `"${q.title}" is still active until the engine accepts its proof at a Guild turn-in.` : null);
                    continue;
                }
                break;
            }
            case 'object.move': {
                if (isPc(d.to) && (ctx.heldByPc?.(text(d.object)) || granted(text(d.object)))) {
                    no(d, 'engine_booked', 'Alaric already holds it');
                    continue;
                }
                if (!isPc(d.to) && ctx.heldByPc?.(text(d.object))) {
                    no(d, 'pc_inventory', 'what Alaric holds leaves him only through his own command (give, drop, sell, use) or a coercion', 'What Alaric holds stays his unless he gives, drops, sells or uses it himself; nothing of his changed hands in the last reply.');
                    continue;
                }
                break;
            }
            case 'quest.offer': {
                if (guildy(d.giver)) {
                    no(d, 'guild_listing', 'official Guild contracts come only from the Board generator (canonical first)', 'Official Guild contracts come only from the board the engine shows; the contract the last reply mentioned does not exist.');
                    continue;
                }
                break;
            }
            case 'quest.detail': {
                const q = questOf(d.quest);
                if (q && GUILD_DETAIL_MECHANIC.test(`${text(d.note)} ${text(d.schedule)}`)) {
                    no(d, 'guild_quest_detail', 'a Guild contract detail may add contacts, route, meeting place or schedule, but may not invent or alter payout/payment, proof, completion/turn-in, rank or fee mechanics');
                    continue;
                }
                break;
            }
            case 'quest.ready':
                // Story-owned readiness: the world may establish that the desired outcome has been achieved.
                // Completion/payout/XP still belong to the explicit Guild turn-in.
                break;
            case 'quest.close': {
                const q = questOf(d.quest);
                if (q && d.status === 'completed') {
                    no(d, 'guild_completion', 'a Guild contract is completed only when Alaric explicitly turns it in at a Guild hall; payout, XP and contract credit are engine-owned', q.status === 'active' && !booked.turnIns.includes(q.id) ? `"${q.title}" is still active until Alaric turns it in.` : null);
                    continue;
                }
                break;
            }
            case 'quest.progress': {
                const q = questOf(d.quest);
                if (q && d.status === 'done' && TURN_IN_OBJECTIVE.test(text(d.objective))) {
                    no(d, 'guild_completion', 'handing a Guild contract in is the engine\'s turn-in, not an objective the story ticks off');
                    continue;
                }
                break;
            }
            case 'fact': {
                const p = words(d.p).replace(/\s+/g, '_');
                const factText = `${words(d.s)} ${words(d.p)} ${words(d.o)}`;
                const guildQuestState = !!ctx.isGuildContractRef?.(text(d.s))
                    || !!ctx.guildContractForObject?.(text(d.s))
                    || namesContract(factText)
                    || (!!ctx.inGuildHall && /\b(?:contract|quest|slip)\b/.test(factText) && GUILD_QUEST_STATE.test(factText));
                if (guildQuestState && GUILD_QUEST_STATE.test(`${words(d.p)} ${words(d.o)}`)) {
                    no(d, 'engine_owned_fact', 'a known Guild contract and its proof document keep payout, status, proof/marks and completion in the engine domains; a free fact cannot override them');
                    continue;
                }
                if (STATE_PREDICATES.has(p)) {
                    no(d, 'domain_fact', `"${d.p}" is state with its own delta (arrive/enter/leave, intent, the Guild's rank), not a fact`);
                    continue;
                }
                if (isPc(d.s) && (POSSESSION_PREDICATES.has(p) || ENGINE_FACT.test(`${words(d.p)} ${words(d.o)}`) || RANK_LABEL.test(`${rankText(d.p)} ${rankText(d.o)}`))) {
                    no(d, 'engine_owned_fact', 'what Alaric holds and his standing, coin and progress are the engine\'s state');
                    continue;
                }
                const mechanic = guildMechanic(d, ctx);
                if (mechanic) {
                    const canon = ctx.canon || {};
                    const g = canon.guildRanks || ['Novice', 'Proven', 'Veteran', 'Elite', 'Master', 'Grandmaster', 'Legend'];
                    const pr = canon.powerRanks || ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
                    // a correction only where the story contradicts the canon (a right claim is refused as a fact, not corrected)
                    const rt = `${rankText(d.p)} ${rankText(d.o)}`;
                    const wrongRank = mechanic !== 'money' && (POWER_LABEL.test(rt) || (RANK_START.test(rt) && !rt.includes(g[0].toLowerCase())));
                    const rankFix = wrongRank ? `The Guild's ranks are the engine's: a new member starts at Guild Rank ${g[0]} (${g.join(', ')}); Power Rank (${pr[0]} to ${pr.at(-1)}) is a person's measured strength, a separate scale the Guild never grants.` : null;
                    const fee = canon.feeCp;
                    const wrongFee = mechanic === 'money' && fee && REGISTRATION_TOPIC.test(words(`${text(d.s)} ${text(d.p)} ${text(d.o)}`)) && amountsCp(`${text(d.p)} ${text(d.o)}`).some((cp) => cp !== fee);
                    const feeFix = wrongFee ? `The Guild's registration fee is ${fee % 10 === 0 ? `${fee / 10} silver (${fee} cp)` : `${fee} cp`}, one-time, the same at every branch.` : null;
                    no(d, 'guild_canon', `the Guild's ${mechanic === 'money' ? 'fees and payouts' : mechanic === 'promotion' ? 'promotion' : 'ranks'} are the engine's canon, not a fact of the story`, rankFix || feeFix);
                    continue;
                }
                break;
            }
            case 'arrive': {
                if (!auth.go && !auth.forced && !auth.roam) {
                    no(d, 'no_go', 'Alaric arrives somewhere only after his own go (or when forced)', 'Alaric did not travel in the last reply: he had not decided to go anywhere; he is still where he was.');
                    continue;
                }
                break;
            }
            default:
                break;
        }
        accept.push(d);
    }
    return { accept, reject, corrections };
}