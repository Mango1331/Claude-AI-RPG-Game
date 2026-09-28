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
export const STATE_PREDICATES = new Set(['located', 'intent', 'guild_rank']);
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
                if (isPc(d.holder)) {
                    if (granted(d.name) || (booked.registration && GUILD_CANON_ITEM.test(text(d.name)))) {
                        no(d, 'engine_booked', 'the engine already handed Alaric this with its own resolution');
                        continue;
                    }
                    if (guildContract(d.for_quest) && CONTRACT_DOC.test(text(d.name))) {
                        no(d, 'engine_booked', 'a Guild contract\'s slip is the engine\'s: it hands it over when the contract is accepted');
                        continue;
                    }
                    if (!auth.take && !auth.gather) {
                        no(d, 'pc_inventory', 'Alaric holds a new thing only after his own take or gather; a hand-over is object.new with the giver as holder, then object.move to him');
                        continue;
                    }
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
            case 'quest.close': {
                const q = questOf(d.quest);
                if (q && d.status === 'completed') {
                    no(d, 'guild_completion', 'a Guild contract is completed only when Alaric turns it in at a Guild hall (the engine checks the proof and pays)', q.status === 'active' && !booked.turnIns.includes(q.id) ? `"${q.title}" is completed only when Alaric turns it in at a Guild hall; it is still open.` : null);
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
                if (STATE_PREDICATES.has(p)) {
                    no(d, 'domain_fact', `"${d.p}" is state with its own delta (arrive/enter/leave, intent, the Guild's rank), not a fact`);
                    continue;
                }
                if (isPc(d.s) && (POSSESSION_PREDICATES.has(p) || ENGINE_FACT.test(`${words(d.p)} ${words(d.o)}`))) {
                    no(d, 'engine_owned_fact', 'what Alaric holds and his standing, coin and progress are the engine\'s state');
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
