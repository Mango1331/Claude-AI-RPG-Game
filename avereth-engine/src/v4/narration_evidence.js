// Build .107 (technical audit of .106): a few World claims change mechanical state on the story's word alone, an
// involuntary relocation of Alaric (arrive.forced_by) and a known person's arrival from elsewhere (enter). Such a claim
// needs a literal clause of the reply's narration that states the event as happening: not dialogue (threats, plans and
// offers are spoken), not negated, not hypothetical or planned, not a memory, a thought or hearsay. This is a narrow
// literal check of the extractor's own quote, no reading of the story: a clause it cannot confirm is refused, and the
// story goes on as the engine has it (the person not here, Alaric where he was).
import { normText } from '../util.js';

const flat = (x) => normText(x).replace(/'/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
// words with clause marks kept as ',' tokens: the clause around a quote is read from its own sentence
const tokens = (x) => normText(x).replace(/'/g, '').replace(/[,;:\u2013\u2014]/g, ' , ').replace(/[^a-z0-9,]+/g, ' ').trim().split(/\s+/).filter(Boolean);
// spoken words are no narrated event: "…", “…” and «…» (single quotes stay apostrophes)
const narrationOnly = (prose) => String(prose || '').replace(/"[^"]*"|“[^”]*”|«[^»]*»/g, ' | ');
const has = (text, words) => ` ${text} `.includes(` ${words} `);
/** Where the quote's words start in a sentence's tokens (clause marks inside the quote are skipped), or -1. */
function locate(t, q) {
    for (let i = 0; i < t.length; i++) {
        let j = 0, k = i;
        while (k < t.length && j < q.length) {
            if (t[k] === ',' && j > 0) { k++; continue; }
            if (t[k] !== q[j]) break;
            j++; k++;
        }
        if (j === q.length) return i;
    }
    return -1;
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
        const i = locate(t, q);
        if (i >= 0) { found = { t, i }; break; }
    }
    if (!found) return { ok: false, why: 'it is spoken, not narrated' };
    // the quote and what leads into it in its own clause ("He remembered how …", "If they caught him, they …")
    const lead = found.t.slice(0, found.i);
    const clause = [...lead.slice(lead.lastIndexOf(',') + 1), ...q].join(' ');
    if (NEGATED.test(clause)) return { ok: false, why: 'the reply negates it' };
    if (UNREAL.test(clause)) return { ok: false, why: 'it is planned, threatened or hypothetical, not happening' };
    if (RECALLED.test(clause)) return { ok: false, why: 'it is remembered or imagined, not happening now' };
    if (HEARSAY.test(clause)) return { ok: false, why: 'it is reported, not shown' };
    return { ok: true };
}

// what makes a clause a relocation of Alaric: he is carried, dragged, swept, thrown, falls, or is taken through
const RELOCATED = /\b(?:carr(?:y|ies|ied|ying)|drag\w*|haul\w*|pull\w*|push\w*|shov\w*|thr[eo]w\w*|thrown|toss\w*|hurl\w*|fl[iu]ng\w*|swe[ep]\w*|swept|wash\w*|tore|torn|tears?|f[ae]ll\w*|fallen|drop\w*|plung\w*|tumbl\w*|slid\w*|slip\w*|collaps\w*|gave way|gives way|give way|cave\w*|crumbl\w*|swallow\w*|portal|teleport\w*|whisk\w*|transport\w*|abduct\w*|kidnap\w*|seiz\w*|grabb?\w*|snatch\w*|march\w*|frogmarch\w*|escort\w*|bundl\w*|lift\w*|yank\w*|blown|blew|blast\w*|suck\w*|current|flood\w*|arrest\w*|captur\w*|led|took|taken|brought|deliver\w*)\b/;

/** An involuntary relocation the reply narrates (arrive.forced_by, Build .107). */
export function forcedRelocation(prose, quote) {
    const ev = narratedEvent(prose, quote);
    if (!ev.ok) return ev;
    return RELOCATED.test(flat(quote)) ? { ok: true } : { ok: false, why: 'it names no relocation of Alaric' };
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
