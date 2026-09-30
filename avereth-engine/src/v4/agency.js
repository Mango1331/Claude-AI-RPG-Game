// Runtime V4: the agency guard between the command interpreter and the engine (docs/RUNTIME_V4_PLAN.md §4.6).
//
// The interpreter proposes commands; each one carries its evidence, the exact words of the player's message it rests
// on (`quote`). Before the engine resolves a command, this guard checks that evidence and the state. It only ever
// REMOVES a command: it never adds, completes or changes one. A command it removes is a probable misreading, not a
// failed attempt: nothing is booked and the narrator is not told about it (the removal goes to the audit trail).
//
// P0/S1 (docs/P0_BERICHT.md §5): the interpreter wrote 13 false commands on 256 messages, 11 of them commitments, and
// the rules against questions, memories, plans and other people's actions were already in its prompt. The guard is the
// deterministic second line, kept deliberately small:
//
//   evidence      a commitment whose quote is not in the message: word for word, or all its   no_evidence
//                 words in order within a few more of the message ("i say and push 2 silver"
//                 quoted as "i push 2 silver", live run 28.09.); every check below reads the
//                 message's own words
//   question      every sentence the quote touches is a question ("Could I take …?")     question
//   memory        a past-time anchor with a past verb ("I gave you the heads an hour ago") retrospective
//   plan          a future anchor with a future modal before the command's own verb        plan
//                 ("Tomorrow I'll take the fence job"; "Deal, I'll clear it tomorrow" stays: its verb is not "take")
//   purpose       a purpose frame ("I'm here to register", "so I can get my silver at the  purpose
//                 guild") for a Guild act that cannot happen where he is, with no go there before it in the message
//   negation      a negation right before the command's own verb ("I'm not paying")        negation
//   other actor   the quote's subject is a person present, not Alaric ("the clerk takes …") npc_actor
//   other speech  the quote sits in someone else's quoted words ('"…," says the furrier')   npc_speech
//   state         drop/give/sell/use/equip of something he does not hold; a turn-in of a    not_held, same_message,
//                 contract taken in the same message; a registration already under way, or   redundant
//                 of a member ("*i sign the card*" after he paid)
//
// Only clear cases are removed. Everything else goes to the engine, whose guards refuse what cannot be done there.
import { normText } from '../util.js';

/** Commands that commit Alaric to something (the dangerous kind of false agency; same list as the P0 scoring). */
export const COMMITMENTS = new Set(['pay', 'buy', 'sell', 'give', 'drop', 'use', 'offer.accept', 'offer.decline', 'quest.accept', 'quest.turn_in', 'quest.abandon', 'guild.register', 'guild.promote', 'journey.continue']);

/** The verbs that express a command's own act (for the negation and plan checks, not for recognising commands). */
export const LEMMAS = {
    'journey.continue': ['ready', 'go', 'leave', 'depart', 'set off', 'continue'],
    go: ['go', 'goes', 'going', 'went', 'head', 'heading', 'walk', 'walking', 'travel', 'travelling', 'traveling', 'ride', 'riding', 'return', 'returning', 'be at', 'set off', 'leave', 'leaving'],
    activity: ['sleep', 'sleeping', 'rest', 'resting', 'wait', 'waiting', 'work', 'working', 'train', 'training', 'gather', 'gathering', 'search', 'searching', 'study', 'studying', 'craft', 'crafting'],
    take: ['take', 'taking', 'pick up', 'picking up', 'grab', 'grabbing', 'pocket', 'collect', 'collecting'],
    drop: ['drop', 'dropping', 'put down', 'set down', 'leave', 'leaving'],
    give: ['give', 'giving', 'hand', 'handing'],
    use: ['use', 'using', 'drink', 'drinking', 'eat', 'eating', 'burn', 'burning'],
    pay: ['pay', 'paying', 'give', 'giving', 'hand over'],
    buy: ['buy', 'buying', 'purchase', 'take', 'get', 'order'],
    sell: ['sell', 'selling'],
    'offer.accept': ['take', 'accept', 'accepting', 'pay', 'paying', 'buy'],
    'offer.decline': ['decline', 'refuse', 'pass'],
    'quest.accept': ['take', 'taking', 'accept', 'accepting', 'sign', 'signing', 'register', 'registering'],
    'quest.turn_in': ['turn', 'turning', 'hand', 'handing', 'deliver', 'delivering', 'report'],
    'quest.abandon': ['quit', 'quitting', 'abandon', 'give up', 'drop'],
    'guild.register': ['register', 'registering', 'join', 'joining', 'sign up'],
    'guild.promote': ['promote', 'promoted', 'promotion'],
    'board.read': ['read', 'reading', 'look', 'check'],
    equip: ['wear', 'put on', 'equip', 'switch'],
    unequip: ['take off', 'remove', 'stow', 'unequip'],
};

/** The same acts in the past tense (the memory check: "I gave you the heads an hour ago", "I drank it yesterday"). */
export const PAST = {
    'journey.continue': ['left', 'departed', 'continued', 'set off'],
    go: ['went', 'walked', 'headed', 'travelled', 'traveled', 'rode', 'returned', 'came', 'left', 'gone'],
    activity: ['slept', 'rested', 'waited', 'worked', 'trained', 'gathered', 'searched', 'studied', 'crafted'],
    take: ['took', 'taken', 'picked up', 'grabbed', 'pocketed', 'collected'],
    drop: ['dropped', 'left', 'put down', 'set down'],
    give: ['gave', 'given', 'handed'],
    use: ['used', 'drank', 'drunk', 'ate', 'eaten', 'burned', 'burnt'],
    pay: ['paid', 'gave', 'given', 'handed over'],
    buy: ['bought', 'ordered'],
    sell: ['sold'],
    'offer.accept': ['took', 'taken', 'accepted', 'paid', 'bought'],
    'offer.decline': ['declined', 'refused', 'passed'],
    'quest.accept': ['took', 'taken', 'accepted', 'signed', 'registered'],
    'quest.turn_in': ['turned in', 'handed in', 'turned', 'handed', 'delivered', 'reported'],
    'quest.abandon': ['quit', 'abandoned', 'gave up', 'dropped'],
    'guild.register': ['registered', 'joined', 'signed up'],
    'guild.promote': ['promoted'],
    'board.read': ['read', 'looked', 'checked'],
    equip: ['wore', 'worn', 'put on', 'equipped'],
    unequip: ['took off', 'removed', 'stowed'],
};

// Guild acts need a Guild hall (plan §4.1): where he is, or reached by a go earlier in the same message.
const GUILD_ACTS = new Set(['guild.register', 'guild.promote', 'quest.turn_in', 'board.read']);
const HELD_ACTS = new Set(['drop', 'give', 'sell', 'use', 'equip', 'unequip']);
const MONEY = /\b(?:silver|copper|gold|coins?|crowns?|pennies|penny|money)\b/i;

const RETRO_ANCHOR = /\b(?:ago|yesterday|earlier|already|previously|used to|the other day|before now|last (?:night|evening|week|month|year|time))\b/;
const CAME_FROM = /\b(?:came|come) (?:here |over |in |down |up )?from\b/;
const FUTURE_ANCHOR = /\b(?:tomorrow|later|next (?:morning|day|week|month|time)|some other time|another time|some ?day|in a few days|the day after)\b/;
const FUTURE_MODAL = "(?:will|'ll|ll|ill|shall|going to|gonna|plan to|intend to|want to)";
const PURPOSE = /\b(?:so (?:that )?(?:i|we) (?:can|could|may|might)|in order to|to be able to|(?:i'm|im|i am) here to)\b/;
// an inverted auxiliary opens a question ("Could I take …", "did the clerk already log …"), a wh-word with an auxiliary too
const QUESTION_START = /^(?:(?:could|can|may|might|should|shall|would|will|do|does|did|is|are|am|was|were|have|has)\s+(?:i|we|you|he|she|they|it|the|my|your|his|her|their|this|that)\b|(?:what|where|which|who|why)\s+(?:is|are|was|were|do|does|did|can|could|would|should|will)\b|how (?:much|many|long|far|do|does|can|could|would|should|is|are)\b)/;
const NEGATOR = "(?:not|never|n't|won't|wont|don't|dont|didn't|didnt|cannot|can't|cant|no longer|refuse to|refuses to|decline to)";
const FIRST_PERSON = new Set(['i', "i'm", 'im', "i'll", 'ill', "i've", 'ive', "i'd", 'we', "we're", "we'll"]);
const SPEECH_VERB = /\b(?:says|said|asks|asked|replies|replied|shouts|calls|calls out|whispers|adds|mutters|offers|tells|answers|insists|demands|suggests|orders|snaps|grunts|yells|murmurs|explains|repeats|continues|warns|promises|sighs|laughs|growls|barks)\b/;
const DETERMINERS = new Set(['the', 'a', 'an', 'his', 'her', 'their', 'that', 'this']);
const PRONOUNS = new Set(['he', 'she', 'they']);
// words of a person's label that name no one ("Guild clerk": the clerk; "the guild" is no person)
const STOP = new Set(['the', 'a', 'an', 'of', 'at', 'in', 'on', 'and', 'guild', "guild's", "adventurers'", 'adventurers', 'hall']);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const lemmaRe = (type) => (LEMMAS[type] || []).map(esc).join('|');
const pastRe = (type) => (PAST[type] || []).map(esc).join('|');

/** Lower case, straight quotes, no asterisks, single spaces; the same normalisation for message and quote. */
function flat(text) {
    return normText(String(text ?? '').replace(/\*/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * The sentences of a message with their spans in the flattened text. Sentence ends: . ! ? a line break, an asterisk
 * (the switch between narration and speech) and quotation marks.
 */
function sentences(message) {
    const src = normText(String(message ?? '')).replace(/\s+/g, ' ');
    const out = [];
    let start = 0;
    for (let i = 0; i <= src.length; i++) {
        const ch = src[i];
        const end = i === src.length || '.!?*"\n'.includes(ch);
        if (!end) continue;
        const raw = src.slice(start, ch === '?' || ch === '!' || ch === '.' ? i + 1 : i);
        const text = flat(raw);
        if (text) out.push({ text, question: /\?\s*$/.test(raw.trim()) });
        start = i + 1;
    }
    return out;
}

/** Words for anchoring a quote: edge punctuation off, apostrophes dropped ("I'm" = "Im"). */
const tokens = (t) => flat(t).split(' ').map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '').replace(/'/g, '')).filter(Boolean);

/**
 * Where a quote the message does not carry word for word stands in it: all of the quote's words, in their order, within
 * a window at most a few words longer than the quote. The interpreter may leave words out ("My name is Alaric Red *i say
 * and push 2 silver over the counter as i pay the fee*" quoted as "i push 2 silver over the counter as i pay the fee",
 * live run 28.09.2026); a word the message does not have, or words scattered over it, anchor nothing. Returns the
 * message's own words of that window (the evidence every check reads), or null.
 */
export function anchorQuote(message, quote) {
    const q = tokens(quote);
    if (!q.length) return null;
    const m = tokens(message);
    const slack = Math.max(2, Math.ceil(q.length / 4));
    let best = null;
    for (let start = 0; start < m.length; start++) {
        if (m[start] !== q[0]) continue;
        let end = start;
        for (let k = 1; k < q.length && end >= 0; k++) end = m.indexOf(q[k], end + 1);
        if (end < 0 || end - start + 1 > q.length + slack) continue;
        if (!best || end - start < best.end - best.start) best = { start, end };
    }
    return best ? m.slice(best.start, best.end + 1).join(' ') : null;
}

/** The sentences a quote touches (by its words), or null when the quote is not in the message. */
function touched(message, quote) {
    let q = flat(quote).replace(/[.!?,;:"]+$/g, '').trim();
    if (!q) return null;
    const m = flat(message);
    if (!m.includes(q)) {
        q = anchorQuote(message, quote);
        if (!q) return null;
    }
    const parts = sentences(message);
    const words = q.split(' ').filter((w) => w.length > 2 || /^(?:i|go|do|ok)$/.test(w));
    const hit = parts.filter((p) => words.some((w) => p.text.includes(w)) && (q.includes(p.text.replace(/[.!?]+$/, '')) || p.text.includes(q) || overlap(p.text, q)));
    return { parts: hit.length ? hit : parts.filter((p) => p.text.includes(q.split(' ')[0])), evidence: q };
}

function overlap(a, b) {
    const wa = new Set(a.replace(/[.!?,;:]/g, '').split(' '));
    const wb = b.replace(/[.!?,;:]/g, '').split(' ');
    return wb.filter((w) => wa.has(w)).length >= Math.min(3, wb.length);
}

const isQuestion = (s) => s.question || QUESTION_START.test(s.text);

/** Heads of the labels and names of the people present ("Guild clerk" → clerk; "Reeve Aldous" → reeve, aldous). */
function actorWords(context) {
    const words = new Set();
    for (const p of context.present || []) {
        for (const n of p.names || []) for (const w of flat(n).replace(/[,.;:()]/g, ' ').split(' ')) if (w.length > 1 && !STOP.has(w)) words.add(w);
    }
    return words;
}

/** The quote's subject is someone present, not Alaric: "the clerk takes the basket from me …". */
function otherActor(quote, context) {
    const t = flat(quote).replace(/[.!?,;:"]/g, '').split(' ').filter(Boolean);
    if (!t.length || t.some((w) => FIRST_PERSON.has(w))) return false;
    if (PRONOUNS.has(t[0])) return true;
    const who = actorWords(context);
    if (who.has(t[0])) return true;
    return DETERMINERS.has(t[0]) && t.slice(1, 4).some((w) => who.has(w));
}

/** The quote is inside quoted words that the message gives to someone else ('"…," says the furrier'). */
function otherSpeech(message, quote, context) {
    const src = normText(String(message ?? ''));
    const q = tokens(quote).join(' ');
    const who = actorWords(context);
    const speaker = (clause) => {
        const w = flat(clause).replace(/[,.;:!?"]/g, ' ').split(' ').filter(Boolean);
        if (w.some((x) => FIRST_PERSON.has(x))) return false;
        return SPEECH_VERB.test(clause) || w.slice(0, 5).some((x) => PRONOUNS.has(x) || who.has(x));
    };
    const re = /"([^"]+)"/g;
    let m;
    while ((m = re.exec(src))) {
        if (!q || !tokens(m[1]).join(' ').includes(q)) continue;
        const after = src.slice(m.index + m[0].length, m.index + m[0].length + 60).split(/[.!?"]/)[0];
        const before = src.slice(Math.max(0, m.index - 40), m.index).split(/[.!?"]/).pop();
        if ((flat(after) && speaker(after)) || (flat(before) && speaker(before))) return true;
    }
    return false;
}

function negated(text, type) {
    const lemmas = lemmaRe(type);
    if (!lemmas) return false;
    return new RegExp(`\\b${NEGATOR}\\s+(?:(?:going|about) to\\s+|gonna\\s+|be\\s+|really\\s+|even\\s+)?(?:${lemmas})\\b`).test(text);
}

function planned(text, type) {
    const lemmas = lemmaRe(type);
    if (!lemmas || !FUTURE_ANCHOR.test(text)) return false;
    return new RegExp(`\\b${FUTURE_MODAL}\\s+(?:[a-z']+\\s+){0,2}?(?:${lemmas})\\b`).test(text);
}

const idOf = (ref) => (typeof ref === 'string' ? ref : null);

/**
 * Check the interpreter's commands against their evidence and the state.
 * @param {string} message the player's message
 * @param {object[]} commands the interpreter's commands ({seq, type, …args, quote})
 * @param {object} context what the engine knows now:
 *   inGuildHall: boolean · guildHalls: Set<placeId> (places that are or lie in a Guild hall) ·
 *   present: [{id, names: string[]}] · objects: Map<id, {held: boolean, name?: string}> ·
 *   registrationPending: boolean · registrationOffer: string|null (offer id of the open registration) ·
 *   member: boolean (Alaric is a Guild member already)
 * @returns {{kept: object[], dropped: {command: object, rule: string, why: string}[]}}
 */
export function guardCommands(message, commands, context = {}, { language = true, state = true } = {}) {
    const kept = [];
    const dropped = [];
    const list = [...(Array.isArray(commands) ? commands : [])].filter((c) => c && typeof c === 'object').sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    const drop = (command, rule, why) => dropped.push({ command, rule, why });
    const objects = context.objects instanceof Map ? context.objects : new Map(Object.entries(context.objects || {}));
    const halls = context.guildHalls instanceof Set ? context.guildHalls : new Set(context.guildHalls || []);
    for (const c of list) {
        const type = String(c.type || '');
        const commit = COMMITMENTS.has(type);
        const found = touched(message, c.quote);
        if (!found) {
            if (commit) { drop(c, 'no_evidence', `the quote "${String(c.quote ?? '').slice(0, 60)}" is not in the message`); continue; }
            kept.push(c);
            continue;
        }
        const { parts, evidence } = found;
        const text = parts.map((p) => p.text).join(' ');
        if (!language) { if (!stateCheck(c)) kept.push(c); continue; }
        // a request to buy may be phrased as a question ("Can I get a room?"); it books nothing without a price. A polite
        // imperative with a question mark is a request too ("Register me, please?")
        // … and so is asking the listener to do it for him ("Can you register me?", "could you sign me up for the dog?")
        const request = (p) => new RegExp(`^(?:(?:can|could|would|will) you (?:please )?)?(?:${lemmaRe(type) || '$^'})\\b.*(?:\\bme\\b|\\bplease\\b)`).test(p.text);
        if (type !== 'buy' && parts.every((p) => isQuestion(p) && !request(p))) { drop(c, 'question', 'the evidence is a question'); continue; }
        // "I walk back the way I came from" is a current GO; only drop an actual
        // retrospective travel claim, not a subordinate route description.
        if (type === 'go' && CAME_FROM.test(evidence) && !/\b(?:walk|walking|head|heading|go|going|travel|travelling|traveling|return|returning|leave|leaving|ride|riding|set off)\b/.test(evidence.replace(/\bcame (?:here |over |in |down |up )?from\b/g, ''))) {
            drop(c, 'retrospective', 'the evidence only says where he came from'); continue;
        }
        if (RETRO_ANCHOR.test(text) && pastRe(type) && new RegExp(`\\b(?:${pastRe(type)})\\b`).test(text)) { drop(c, 'retrospective', 'the evidence recalls an earlier deed'); continue; }
        if (planned(text, type)) { drop(c, 'plan', 'the evidence plans it for later'); continue; }
        if (negated(text, type)) { drop(c, 'negation', 'the evidence negates it'); continue; }
        if (otherSpeech(message, evidence, context)) { drop(c, 'npc_speech', "the evidence is someone else's quoted words"); continue; }
        if (otherActor(evidence, context)) { drop(c, 'npc_actor', 'the evidence is what someone else does'); continue; }
        const goesToHall = kept.some((k) => k.type === 'go' && (halls.has(idOf(k.to)) || /guild/i.test(String(k.to?.new ?? ''))));
        if (GUILD_ACTS.has(type) && PURPOSE.test(text) && !context.inGuildHall && !goesToHall) { drop(c, 'purpose', 'the evidence names the purpose of a later visit to a Guild hall, not an act here'); continue; }
        if (stateCheck(c)) continue;
        kept.push(c);
    }
    return { kept, dropped };

    /** The state checks; true when the command was dropped. */
    function stateCheck(c) {
        if (!state) return false;
        const type = String(c.type || '');
        if (HELD_ACTS.has(type)) {
            const id = idOf(c.object);
            const name = id ? objects.get(id)?.name : c.object?.new;
            // taken earlier in the same message ("i get the corpse … then leave it with him"): his by then
            const takenNow = id && kept.some((k) => k.type === 'take' && idOf(k.object) === id);
            if (!MONEY.test(String(name ?? '')) && !MONEY.test(String(c.quote ?? '')) && !takenNow) {
                if (id && objects.has(id) && !objects.get(id).held) { drop(c, 'not_held', `Alaric does not hold ${objects.get(id).name || id}`); return true; }
                if (!id && c.object && typeof c.object === 'object' && type !== 'equip') { drop(c, 'not_held', `Alaric holds nothing like "${String(c.object.new ?? '').slice(0, 40)}"`); return true; }
            }
        }
        if (type === 'quest.turn_in' && idOf(c.quest) && kept.some((k) => k.type === 'quest.accept' && k.quest === c.quest)) { drop(c, 'same_message', 'the contract is taken in this very message; handing it in is part of taking it'); return true; }
        // a member registers no second time: signing the card or the register after he paid is part of the story
        if (type === 'guild.register' && context.member) { drop(c, 'redundant', 'Alaric is a Guild member already'); return true; }
        if (type === 'guild.register' && context.registrationPending) {
            const paysFee = list.some((k) => k !== c && ((k.type === 'offer.accept' && (!context.registrationOffer || k.offer === context.registrationOffer)) || k.type === 'pay'));
            if (paysFee) { drop(c, 'redundant', 'the registration is already under way; paying its fee completes it'); return true; }
        }
        return false;
    }
}
