// Build .107 (technical audit of .106): a few World claims change mechanical state on the story's word alone, an
// involuntary relocation of Alaric (arrive.forced_by) and a known person's arrival from elsewhere (enter). Such a claim
// needs a literal clause of the reply's narration that states the event as happening: not dialogue (threats, plans and
// offers are spoken), not negated, not hypothetical or planned, not a memory, a thought or hearsay. This is a narrow
// literal check of the extractor's own quote, no reading of the story: a clause it cannot confirm is refused, and the
// story goes on as the engine has it (the person not here, Alaric where he was).
import { normText } from '../util.js';

// Build .108: contractions are read before the apostrophes go ("they'll haul him" is a plan). 'll is will, n't not;
// 'd is had before a past participle ("they'd carried him", also across one adverb) and would otherwise.
const PARTICIPLE = /^(?:been|gone|done|come|become|run|seen|taken|given|thrown|fallen|swept|led|brought|kept|left|felt|held|caught|got|gotten|made|found|lost|struck|torn|worn|drawn|blown|shown|known|flown|\w+ed|\w+en)$/;
const ADVERB = /^(?:already|just|never|always|long|since|all|both|only|once|then|even|often|soon|again|also|still)$/;
const expand = (x) => normText(x)
    .replace(/n't\b/g, ' not').replace(/'ll\b/g, ' will')
    .replace(/'d(\s+)([a-z]+)(?:(\s+)([a-z]+))?/g, (m, s1, w1, s2, w2) => {
        const next = ADVERB.test(w1) && w2 && !ADVERB.test(w2) ? w2 : w1;
        return ` ${PARTICIPLE.test(next) && !ADVERB.test(next) ? 'had' : 'would'}${s1}${w1}${s2 && w2 ? s2 + w2 : ''}`;
    });
const flat = (x) => expand(x).replace(/'/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
// words with clause marks kept as ',' tokens: the clause around a quote is read from its own sentence
const tokens = (x) => expand(x).replace(/'/g, '').replace(/[,;:\u2013\u2014]/g, ' , ').replace(/[^a-z0-9,]+/g, ' ').trim().split(/\s+/).filter(Boolean);
// spoken words are no narrated event: "…", “…”, «…», and single quotes ‘…’ / '…' that open at a word start and close
// before a space or a mark (Build .108: "'I'll drag you there,' the guard threatened"); an apostrophe inside a word
// (I'll, the guard's) opens or closes nothing
const narrationOnly = (prose) => String(prose || '').replace(/[\u2018\u2019\u201b]/g, "'")
    .replace(/"[^"]*"|“[^”]*”|«[^»]*»/g, ' | ')
    .replace(/(^|[\s(\[\u2013\u2014])'(?=[A-Za-z0-9])[^\n]*?[^\s']'(?=[\s.,!?;:)\u2013\u2014]|$)/g, '$1 | ');
const has = (text, words) => ` ${text} `.includes(` ${words} `);
/** Where the quote's words lie in a sentence's tokens (clause marks inside the quote are skipped), or null. */
function locate(t, q) {
    for (let i = 0; i < t.length; i++) {
        let j = 0, k = i;
        while (k < t.length && j < q.length) {
            if (t[k] === ',' && j > 0) { k++; continue; }
            if (t[k] !== q[j]) break;
            j++; k++;
        }
        if (j === q.length) return { i, end: k };
    }
    return null;
}

const NEGATED = /\b(?:not|never|nobody|nothing|nowhere|neither|nor|no one|nearly|almost|cannot|cant|didnt|doesnt|dont|wasnt|werent|isnt|arent|hadnt|hasnt|wont|wouldnt|couldnt|shouldnt|failed to)\b/;
const UNREAL = /\b(?:will|would|could|might|may|shall|should|must|going to|about to|if|unless|or else|threat\w*|plans?|planned|planning|intends?|intended|wants? to|wanted to|tries to|tried to|try to|attempt\w*|promis\w*|ready to|meant to|means to|expects?|expected)\b/;
const RECALLED = /\b(?:remember\w*|recall\w*|reminisc\w*|dream\w*|imagin\w*|thought|thinks?|thinking|wonder\w*|pictur\w*|memor\w*|years ago|long ago|used to)\b/;
const HEARSAY = /\b(?:heard|hears|rumou?rs?|rumou?red|news|letter|message|said that|says that|told him that|word was|mention\w*)\b/;

/**
 * Is `quote` a literal clause of the reply's narration that states an actual event?
 * @returns {{ok: true} | {ok: false, why: string}}
 */
export function narratedEvent(prose, quote, { minWords = 3 } = {}) {
    const q = tokens(quote).filter((t) => t !== ',');
    if (q.length < minWords) return { ok: false, why: 'no quoted clause of the reply' };
    if (!has(flat(prose), q.join(' '))) return { ok: false, why: 'its words are not in the reply' };
    let found = null;
    for (const sentence of narrationOnly(prose).split(/[.!?\u2026\n|]+/)) {
        const t = tokens(sentence);
        const at = locate(t, q);
        if (at) { found = { t, ...at }; break; }
    }
    if (!found) return { ok: false, why: 'it is spoken, not narrated' };
    // a negation or a plan belongs to its own clause ("Before he could react, two men seized him" stands); a memory or
    // hearsay frames the whole sentence before the quote (Build .108: "He remembered the night, when the guards …")
    const lead = found.t.slice(0, found.i);
    const clause = [...lead.slice(lead.lastIndexOf(',') + 1), ...q].join(' ');
    const sentence = [...lead, ...q].join(' ');
    if (NEGATED.test(clause)) return { ok: false, why: 'the reply negates it' };
    if (UNREAL.test(clause)) return { ok: false, why: 'it is planned, threatened or hypothetical, not happening' };
    if (RECALLED.test(sentence)) return { ok: false, why: 'it is remembered or imagined, not happening now' };
    if (HEARSAY.test(sentence)) return { ok: false, why: 'it is reported, not shown' };
    // the quote's own words, then the rest of its sentence (where the story tells what the event did)
    return { ok: true, quote: found.t.slice(found.i, found.end), rest: found.t.slice(found.end) };
}

// Build .108: what moves someone by itself (carried, dragged, swept, fell, swallowed …), and what only seizes or sets
// something off (grabbed, arrested, a portal, the floor gives way): the latter moves him only with a direction told
const MOVES = /^(?:carr(?:y|ies|ied|ying)|drag\w*|haul\w*|shov\w*|threw|throw\w*|thrown|toss\w*|hurl\w*|fling\w*|flung|sweep\w*|swept|wash\w*|fall|falls|falling|fell|fallen|plung\w*|tumbl\w*|slid|slide\w*|swallow\w*|teleport\w*|whisk\w*|transport\w*|abduct\w*|kidnap\w*|march\w*|frogmarch\w*|escort\w*|bundl\w*|led|took|taken|brought|deliver\w*|blown|blew|suck\w*|tore|torn)$/;
const SETS_OFF = /^(?:grabb?\w*|seiz\w*|snatch\w*|arrest\w*|captur\w*|pull\w*|push\w*|yank\w*|lift\w*|drop\w*|slip\w*|collaps\w*|cave\w*|crumbl\w*|portal|current|flood\w*|blast\w*|gave|give|gives)$/;
const DIRECTION = /^(?:into|to|toward|towards|through|down|out|across|away|off|onto|over|under|along|up|downstream|overboard)$/;
const DESTINATION = /^(?:to|into|onto|toward|towards)$/;
const STOP = new Set([',', 'and', 'but', 'while', 'where', 'as', 'before', 'after', 'when', 'until', 'then', 'so', 'with']);
const FILLER = new Set(['the', 'and', 'his', 'her', 'its', 'their', 'this', 'that', 'from', 'with', 'old', 'new', 'some', 'one']);
const content = (words) => words.filter((w) => w.length > 2 && !FILLER.has(w)).map((w) => (w.length > 3 ? w.replace(/s$/, '') : w));

/**
 * An involuntary relocation of Alaric the reply narrates (arrive.forced_by, Builds .107/.108): a narrated event whose
 * moving word has Alaric next to it (him, he, himself or his name, within three words), and whose destination, where
 * the sentence tells one ("… to the gap in the rocks"), is the arrival's place.
 * @param {{self?: string[], target?: string[], above?: string[]}} who self: Alaric's names; target: the arrival's own
 *   names; above: its enclosing places (a told destination may name only these)
 */
export function forcedRelocation(prose, quote, { self = ['alaric'], target = [], above = [] } = {}) {
    const ev = narratedEvent(prose, quote);
    if (!ev.ok) return ev;
    const w = [...ev.quote, ...ev.rest];
    const own = new Set(['him', 'he', 'himself', ...self.flatMap((x) => flat(x).split(' ')).filter((x) => x.length > 2)]);
    const near = (k) => w.slice(Math.max(0, k - 3), k + 4).some((x) => own.has(x));
    const opens = (t, k) => SETS_OFF.test(t) && (!/^(?:gave|give|gives)$/.test(t) || w[k + 1] === 'way');
    if (!ev.quote.some((t, k) => MOVES.test(t) || opens(t, k))) return { ok: false, why: 'it names no relocation' };
    const moved = w.some((t, k) => MOVES.test(t) && near(k))
        || w.some((t, k) => opens(t, k) && near(k) && w.slice(k + 1).some((x) => DIRECTION.test(x)));
    if (!moved) return { ok: false, why: 'it does not move Alaric himself' };
    // where the sentence tells a destination, it is the arrival's place (or only a place around it)
    const told = [];
    for (let k = 0; k < w.length; k++) {
        if (!DESTINATION.test(w[k])) continue;
        const phrase = [];
        for (let j = k + 1; j < w.length && !STOP.has(w[j]); j++) phrase.push(w[j]);
        if (content(phrase).length) told.push(content(phrase));
    }
    const mine = new Set(content(target.flatMap((x) => flat(x).split(' '))));
    const around = new Set(content(above.flatMap((x) => flat(x).split(' '))));
    if (told.length && mine.size && !told.some((p) => p.some((x) => mine.has(x)) || p.every((x) => around.has(x))))
        return { ok: false, why: 'the destination it tells is not the place of the arrival' };
    return { ok: true };
}

/**
 * A known person's own arrival or presence the reply narrates (enter, Build .107): the clause names them (a name or a
 * short role of theirs) and shows something besides the name. Speech at the place counts ("said the guard, leaning on
 * the rail"); a mere mention, a denial, a plan or hearsay does not.
 * @param {string[]} labels the person's names and short role words
 */
export function narratedPresence(prose, quote, labels) {
    const ev = narratedEvent(prose, quote);
    if (!ev.ok) return ev;
    const q = flat(quote);
    const words = new Set(q.split(' '));
    const named = labels.map(flat).filter((l) => l && l.split(' ').length <= 3)
        .filter((l) => l.split(' ').filter((w) => w.length > 2 && !['the', 'and'].includes(w)).every((w) => words.has(w)) && l.split(' ').some((w) => w.length > 2));
    if (!named.length) return { ok: false, why: 'the quoted clause does not name them' };
    const own = new Set(named.flatMap((l) => l.split(' ')));
    const rest = [...words].filter((w) => w.length > 2 && !own.has(w) && !['the', 'and', 'from', 'with'].includes(w));
    return rest.length ? { ok: true } : { ok: false, why: 'only their name is mentioned' };
}

/**
 * A known person's arrival in this reply: the extractor's own quote (enter.evidence), or else any narrated sentence of
 * the reply that names them under the same conditions. An extractor that leaves the quote out costs no legitimate
 * return; a mention, a denial, a plan, a memory or hearsay still brings no one.
 */
export function presenceInReply(prose, evidence, labels) {
    const own = narratedPresence(prose, evidence, labels);
    if (own.ok) return own;
    for (const sentence of narrationOnly(prose).split(/[.!?…\n|]+/)) {
        if (tokens(sentence).filter((t) => t !== ',').length >= 3 && narratedPresence(prose, sentence, labels).ok) return { ok: true };
    }
    return own;
}
