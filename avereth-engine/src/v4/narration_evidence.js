// Build .107 (technical audit of .106): a few World claims change mechanical state on the story's word alone, an
// involuntary relocation of Alaric (arrive.forced_by) and a known person's arrival from elsewhere (enter). Such a claim
// needs a literal clause of the reply's narration that states the event as happening: not dialogue (threats, plans and
// offers are spoken), not negated, not hypothetical or planned, not a memory, a thought or hearsay. This is a narrow
// literal check of the extractor's own quote, no reading of the story: a clause it cannot confirm is refused, and the
// story goes on as the engine has it (the person not here, Alaric where he was).
import { coinFromWords } from '../economy.js';
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
const FILLER = new Set(['the', 'and', 'his', 'her', 'its', 'their', 'this', 'that', 'from', 'with', 'some', 'one']);
const content = (words) => words.filter((w) => w.length > 2 && !FILLER.has(w)).map((w) => (w.length > 3 ? w.replace(/s$/, '') : w));

/**
 * An involuntary relocation of Alaric the reply narrates (arrive.forced_by, Builds .107/.108): a narrated event whose
 * moving word binds Alaric as its object or an intransitive/passive subject, and whose destination, where
 * the sentence tells one ("… to the gap in the rocks"), is the arrival's place.
 * @param {{self?: string[], target?: string[], above?: string[]}} who self: Alaric's names; target: the arrival's own
 *   names; above: its enclosing places (a told destination may name only these)
 */
export function forcedRelocation(prose, quote, { self = ['alaric'], target = [], above = [] } = {}) {
    const ev = narratedEvent(prose, quote);
    if (!ev.ok) return ev;
    const w = [...ev.quote, ...ev.rest];
    const own = new Set(['him', 'he', 'himself', ...self.flatMap((x) => flat(x).split(' ')).filter((x) => x.length > 2)]);
    // An object immediately after the verb, or a subject joined only by
    // auxiliaries/adverbs. Mere proximity also matched spectators and helpers.
    const object = k => own.has(w[k + 1]) && w[k + 1] !== 'he';
    const subject = (k, passive) => {
        for (let j = Math.max(0,k-4); j < k; j++) {
            if (!own.has(w[j])) continue;
            const bridge = w.slice(j+1,k);
            if (!bridge.every(x => /^(?:was|were|is|are|be|been|being|had|has|have)$/.test(x) || /ly$/.test(x))) continue;
            if (!passive || bridge.some(x => /^(?:was|were|is|are|be|been|being)$/.test(x))) return true;
        }
        return false;
    };
    const falls = /^(?:fall|falls|falling|fell|fallen|plung\w*|tumbl\w*|slid|slide\w*|slip\w*)$/;
    const opens = (t, k) => SETS_OFF.test(t) && (!/^(?:gave|give|gives)$/.test(t) || w[k + 1] === 'way');
    if (!ev.quote.some((t, k) => MOVES.test(t) || opens(t, k))) return { ok: false, why: 'it names no relocation' };
    const moved = w.some((t, k) => (MOVES.test(t) && (object(k) || subject(k, true) || (falls.test(t) && subject(k, false)))))
        || w.some((t, k) => opens(t, k) && (object(k) || (falls.test(t) && subject(k, false))) && w.slice(k + 1).some((x) => DIRECTION.test(x)));
    if (!moved) return { ok: false, why: 'it does not move Alaric himself' };
    // where the sentence tells a destination, it is the arrival's place (or only a place around it)
    const told = [];
    for (let k = 0; k < w.length; k++) {
        if (!DESTINATION.test(w[k])) continue;
        const phrase = [];
        for (let j = k + 1; j < w.length && !STOP.has(w[j]); j++) phrase.push(w[j]);
        if (content(phrase).length) told.push(content(phrase));
    }
    const names = target.map(x => content(flat(x).split(' '))).filter(x => x.length);
    const enclosing = above.map(x => content(flat(x).split(' '))).filter(x => x.length);
    // Match the recorded name or an unqualified head (ditch for roadside ditch).
    // Extra distinguishing words must agree: south gate cannot match north gate.
    // An enclosing place is evidence only when it is the entire told destination.
    const matches = p => names.some(name => name.every(x => p.includes(x))
        || (p.includes(name.at(-1)) && p.every(x => name.includes(x))))
        || enclosing.some(name => name.every(x => p.includes(x)) && p.every(x => name.includes(x)));
    if (told.length && names.length && !told.every(matches))
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
    // Build .110: the audible voice can identify its owner ("Osser's voice"), but an owned cart or portrait cannot.
    // Keep this local to person evidence; forced movement and literal quote validation retain their normalization.
    const q = flat(expand(quote).replace(/'s(?=\s+voice\b)/g, ''));
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
        // Build .110, original batch 5 T51: "Marta was behind the bar, ... a rhythm that never paused".
        // A separate clause's negation must not erase an actual named presence. Validate each candidate against the
        // ORIGINAL prose, so leading conditions, recollections and hearsay still frame it; never validate a detached
        // fragment as a new story. A fragment without the person's identity cannot establish their presence either.
        // Do not detach an apparently actual clause from a remembered/reported/conditional framing after it either.
        if (RECALLED.test(flat(sentence)) || HEARSAY.test(flat(sentence)) || UNREAL.test(flat(sentence))) continue;
        for (const clause of sentence.split(/[,;:\u2013\u2014]/)) {
            if (narratedPresence(prose, clause, labels).ok) return { ok: true };
        }
    }
    return own;
}

/** Only a retry trigger, never authority to book travel. */
export function movementEvidence(prose) {
    return narrationOnly(prose).split(/[.!?\n|]+/).some(sentence =>
        /\b(?:Alaric|he)\b/i.test(sentence) && /\b(?:walked|reached|entered|returned|stood|crossed|stepped|emerged)\b/i.test(sentence)
        && narratedEvent(prose, sentence.trim()).ok);
}
/** An actual named participant handling a contract/payment, not mere co-presence. */
export function guildParticipationEvidence(prose, labels, { payoutCp = null, content = null } = {}) {
    return narrationOnly(prose).split(/[.!?\n|]+/).some(sentence => {
        const text=flat(sentence);
        return labels.filter(Boolean).some(label => {
            const name=flat(label).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
            return new RegExp(`(?:^| )${name} (?:(?:had|then|carefully|slowly|quietly|deliberately) )*(?:paid|counted|pushed|slid|stamped|recorded|entered|took|accepted)\\b`).test(text);
        })
            && (/\b(?:contract|slip|ledger|payout|reward)\b/.test(text) || (content && payoutCp > 0 ? coinFromWords(sentence,content) === payoutCp : !content && /\b(?:copper|silver|gold)\b/.test(text)))
            && narratedEvent(prose,sentence.trim()).ok;
    });
}

// ------------------------------------------------------------------------------------------------ NPC E2-A
// docs/NPC_E2A_INTEGRITY.md: who of the known people a reply shows present again (expected.go.met), and who of the
// present Guild people a reply shows handling a contract step (expected.desk.handled_by). Both are the extractor's
// claim plus its own quote; this module checks only the quote's words against the reply and the people's recorded
// labels (no reading of the story, no model call). Anything it cannot tie to exactly one person is refused.

const QUANTITY = new Map([['both', 2], ['two', 2], ['pair', 2], ['couple', 2], ['three', 3], ['four', 4], ['five', 5]]);
const DETERMINER = new Set(['the', 'this', 'that', 'these', 'those']);
const INDEFINITE = new Set(['a', 'an', 'another', 'some', 'any', 'one', 'other']);
// people the story may name without a role of anyone here; the nearest one before a pronoun ends the search
const GENERIC_PERSON = new Set(['man', 'woman', 'men', 'women', 'girl', 'boy', 'lad', 'lass', 'person', 'figure', 'stranger', 'someone',
    'somebody', 'fellow', 'child', 'guard', 'guards', 'adventurer', 'adventurers', 'traveller', 'traveler', 'customer', 'patron', 'driver']);
const PRONOUN = new Set(['he', 'she', 'they', 'him', 'her', 'them']);
const PC_PRONOUN = new Set(['he', 'him', 'his', 'himself']);
const PERSON_FILLER = new Set(['the', 'and', 'his', 'her', 'its', 'their', 'this', 'that', 'from', 'with', 'some', 'one', 'who', 'was', 'were',
    'had', 'has', 'have', 'into', 'over', 'onto', 'at', 'of', 'on', 'in', 'by', 'for', 'a', 'an', 'man', 'woman', 'person']);
// a person only shown in a picture, by a trace, or as away is not here (plan §8: a painted sign depicting the clerk)
const DEPICTED = /\b(?:paint\w*|portrait\w*|picture\w*|statue\w*|carv\w*|drawing\w*|drawn|sketch\w*|images?|likeness\w*|depict\w*|mural\w*|tapestr\w*|engrav\w*|effig\w*|posters?)\b/;
const TRACE = /\b(?:notes?|letters?|messages?|notices?|signs?|handwriting|writing|signature|names?|marks?)\b/;
const AWAY = /\b(?:empty|vacant|absent|away|gone|missing|nowhere|abandoned|unattended|deserted)\b/;
// a contract step's own handling at the desk, and what it handles
const HANDLES = /^(?:paid|pays|counted|counts|pushed|slid|stamped|stamps|recorded|entered|took|takes|accepted|accepts|logged|logs|inked|inks|wrote|writes|signed|signs|handed|hands|blotted|filed|noted|marked|initialed|initialled|registered|weighed)$/;
const DESK_OBJECT = /\b(?:contract|contracts|slip|slips|ledger|seal|roll|payout|reward|coins?|copper|silver|gold|posting|notice|tally|stamp)\b/;
const stem = (w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
const singular = (w) => (w.endsWith('men') ? `${w.slice(0, -3)}man` : w.endsWith('ies') ? `${w.slice(0, -3)}y` : /(?:ss|sh|ch|x)es$/.test(w) ? w.slice(0, -2) : w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

/**
 * A person as the evidence checks see them: names, their own short name words, the head of their role, and the words
 * of their recorded look (traits, descriptors, appearance, the weapon they hold), and whether they are a group.
 * @typedef {{id: string, names: string[], nameWords: string[], role: string|null, words: string[], group?: boolean}} PersonProfile
 */
export function personProfile({ id, names = [], nameWords = [], role = null, look = [], group = false }) {
    const own = new Set([...names, ...nameWords].flatMap((n) => flat(n).split(' ')));
    const head = role ? singular(flat(role).split(' ').filter(Boolean).at(-1) || '') : null;
    const words = [...new Set(look.flatMap((x) => flat(x).split(' ')).filter((w) => w.length > 2 && !PERSON_FILLER.has(w) && !own.has(w) && singular(w) !== head).map(stem))];
    return { id, names: names.map(flat).filter(Boolean), nameWords: nameWords.map(flat).filter((w) => w.length >= 3), role: head || null, words, group: !!group };
}

/**
 * Which of the people the words name: a name, their role with a definite determiner (unique, or told apart by a
 * word of their look: "the older clerk"), their role in the plural with its count ("both clerks": all of that role,
 * or the one recorded group of it), or at least two words of their look and more than anyone else's.
 * @param {string[]} w the clause's words (flat)
 * @param {PersonProfile[]} people
 * @returns {Set<string>} ids
 */
export function namedPeople(w, people) {
    const hit = new Set();
    const text = ` ${w.join(' ')} `;
    for (const p of people) {
        if (p.names.some((n) => n && text.includes(` ${n} `)) || p.nameWords.some((n) => w.includes(n))) hit.add(p.id);
    }
    for (let i = 0; i < w.length; i++) {
        const t = w[i];
        // singular role with a determiner before it (adjectives between allowed, never an indefinite one)
        const sameRole = people.filter((p) => p.role && p.role === t);
        if (sameRole.length) {
            const lead = w.slice(Math.max(0, i - 4), i);
            const det = lead.findLastIndex((x) => DETERMINER.has(x));
            if (det >= 0 && !lead.slice(det).some((x) => INDEFINITE.has(x))) {
                const between = lead.slice(det + 1).map(stem);
                if (sameRole.length === 1 && !between.some((x) => people.some((o) => o !== sameRole[0] && o.role === t && o.words.includes(x)))) hit.add(sameRole[0].id);
                else {
                    const told = sameRole.filter((p) => between.some((x) => p.words.includes(x)));
                    if (told.length === 1) hit.add(told[0].id);
                }
            }
        }
        // plural role with its count
        const one = singular(t);
        if (one !== t) {
            const lead = w.slice(Math.max(0, i - 3), i);
            const n = lead.map((x) => QUANTITY.get(x)).find(Boolean);
            const ofRole = people.filter((p) => p.role === one);
            const group = ofRole.filter((p) => p.group);
            if (n && group.length === 1) hit.add(group[0].id);
            else if (n && !group.length && ofRole.length === n) ofRole.forEach((p) => hit.add(p.id));
        }
    }
    // words of their look: two or more, and strictly more than anyone else's
    const ws = new Set(w.map(stem));
    const score = people.map((p) => p.words.filter((x) => ws.has(x)).length);
    const best = Math.max(0, ...score);
    if (best >= 2 && score.filter((x) => x === best).length === 1) hit.add(people[score.indexOf(best)].id);
    return hit;
}

/**
 * expected.go.met (R1): the extractor's own quote is a narrated clause of the reply that shows this person
 * themselves here now: named so that only they are meant, and not a picture, a trace, a memory, a plan or an empty place.
 * @param {PersonProfile[]} people the people offered for the step and those present
 * @returns {{ok: true} | {ok: false, why: string}}
 */
export function metEvidence(prose, evidence, id, people, { here = [], elsewhere = [] } = {}) {
    const ev = narratedEvent(prose, evidence);
    if (!ev.ok) return ev;
    const w = ev.quote.filter((t) => t !== ',');
    const text = w.join(' ');
    if (DEPICTED.test(text)) return { ok: false, why: 'it shows a picture of them, not them' };
    if (AWAY.test(text)) return { ok: false, why: 'it shows their place empty or them away' };
    const named = namedPeople(w, people);
    if (!named.has(id)) return { ok: false, why: 'the quoted words do not name them, or not them alone' };
    // "a note from the clerk", "the clerk's name on the slate": a trace of them, not them
    if (TRACE.test(text) && w.some((t, i) => ['from', 'by', 'of'].includes(t) && namedPeople(w.slice(i + 1, i + 5), people).has(id))) return { ok: false, why: 'it shows a trace of them, not them' };
    // .170 (GPT review of .169 §2): naming them is not showing them here. "The clerk had left the Guild hall before
    // Alaric arrived" names the one clerk and is narrated: only a mention of them that is shown present now counts
    return presentHere(ev.quote, id, people, { here, elsewhere });
}

// .170: what shows a named person present in the scene now. The quote's own words around the mention: the person does
// something of the scene in the story's past (stood, sat, waved, was sorting, was behind the counter), or Alaric sees
// them or the place has them (saw the clerk, had both clerks at work). Anything else is no presence: a departure or any
// other act not read here (left, went, departed), a pluperfect (had left, had stood: before now), a look back
// (yesterday, earlier, before), another place (the other town, a known place elsewhere), a search or an expectation.
const HERE_DOES = new Set(['stood', 'sat', 'waited', 'worked', 'leaned', 'leant', 'looked', 'glanced', 'watched', 'waved', 'nodded', 'smiled', 'grinned',
    'frowned', 'laughed', 'said', 'spoke', 'called', 'asked', 'answered', 'replied', 'greeted', 'wrote', 'counted', 'sorted', 'stacked', 'tallied',
    'stamped', 'weighed', 'kept', 'held', 'raised', 'lifted', 'set', 'laid', 'pushed', 'slid', 'handed', 'took', 'turned', 'rose', 'stirred', 'shifted',
    'sighed', 'grunted', 'muttered', 'shrugged', 'read', 'marked', 'polished', 'wiped', 'dried', 'served', 'poured', 'cleaned', 'tended', 'manned',
    'stayed', 'remained', 'lingered', 'sipped', 'drank', 'ate', 'studied', 'bent', 'peered', 'squinted', 'straightened', 'paused', 'gestured',
    'pointed', 'beckoned', 'coughed', 'talked', 'argued', 'chatted', 'scratched', 'tapped', 'listened', 'inked', 'logged', 'checked', 'tidied',
    'arranged', 'folded', 'blinked', 'yawned', 'hummed', 'mended', 'played']);
const HERE_DOING = new Set([...HERE_DOES].map((x) => x.replace(/(?:ed|t)$/, '')).flatMap((x) => [`${x}ing`, `${x}ting`, `${x.replace(/e$/, '')}ing`])
    .concat(['standing', 'sitting', 'waiting', 'working', 'writing', 'reading', 'drinking', 'eating', 'holding', 'keeping', 'serving', 'talking', 'chatting']));
const SEES = new Set(['saw', 'found', 'spotted', 'noticed', 'met', 'greeted', 'joined', 'recognised', 'recognized', 'faced', 'approached']);
const HAS = new Set(['had', 'held']);
const COPULA = new Set(['was', 'were']);
const LOCATIVE = new Set(['in', 'at', 'inside', 'on', 'near', 'by', 'behind', 'beside', 'over', 'under', 'across', 'within', 'among', 'outside', 'there', 'here', 'back']);
const CLAUSE_END = new Set([',', 'and', 'but', 'while', 'as', 'when', 'until', 'who', 'which', 'whose', 'though', 'although']);
const LOOK_BACK = /^(?:yesterday|earlier|ago|previously|formerly|before|once)$/;
const ELSEWHERE = /^(?:other|another|elsewhere|home|away|outside|abroad)$/;
const SETTLEMENT = /^(?:town|city|village|market|marketplace|street|streets|road|square|harbou?r|docks?|gate|fields?|farm|tavern|inn|temple|camp|quarter)$/;
const LINGER = /^(?:still|again|also|now|just|then|already|alone|quietly|patiently)$|ly$/;

function presentHere(q, id, people, { here = [], elsewhere = [] } = {}) {
    const hereWords = new Set(here.flatMap((x) => flat(x).split(' ')));
    const away = elsewhere.map((x) => flat(x).replace(/^the /, '')).filter((x) => x.length >= 4 && !here.some((h) => flat(h).replace(/^the /, '') === x));
    // the smallest stretches of the quote that name them (positions in the token list with clause marks)
    const pos = q.map((t, i) => (t === ',' ? -1 : i)).filter((i) => i >= 0);
    const spans = [];
    for (let len = 1; len <= 7; len++) for (let a = 0; a + len <= pos.length; a++) {
        const sl = pos.slice(a, a + len);
        if (spans.some(([x, y]) => x >= sl[0] && y <= sl.at(-1))) continue;
        if (namedPeople(sl.map((i) => q[i]), people).has(id)) spans.push([sl[0], sl.at(-1)]);
    }
    const clauseEnd = (from) => { let k = from; while (k < q.length && !CLAUSE_END.has(q[k])) k++; return k; };
    const clauseStart = (from) => { let k = from; while (k > 0 && q[k - 1] !== ',') k--; return k; };
    // the place words of the predicate's clause: here, or somewhere else
    const elsewhereIn = (from, to) => {
        const part = q.slice(from, to);
        const text = ` ${part.join(' ')} `;
        if (part.some((t) => ELSEWHERE.test(t))) return true;
        if (part.some((t, i) => LOCATIVE.has(t) && part.slice(i + 1).some((x) => SETTLEMENT.test(x) && !hereWords.has(x)))) return true;
        return away.some((n) => text.includes(` ${n} `));
    };
    let why = 'it does not show them here now';
    for (const [a, b] of spans) {
        let p = null;
        // the person does it: the act right after their name (adverbs, and a "with …" of their look, between)
        let j = b + 1;
        while (j < q.length && LINGER.test(q[j])) j++;
        if (q[j] === 'with') { let k = j + 1; while (k < q.length && k <= j + 4 && !HERE_DOES.has(q[k]) && !COPULA.has(q[k]) && !CLAUSE_END.has(q[k])) k++; j = k; }
        if (HERE_DOES.has(q[j])) p = j;
        else if (COPULA.has(q[j]) && (HERE_DOING.has(q[j + 1]) || LOCATIVE.has(q[j + 1]))) p = j + 1;
        else if (['had', 'has', 'have'].includes(q[j])) { why = 'it tells what they had done before, not them here now'; continue; }
        // or they are seen, or the place has them (with where: "had both clerks at work")
        if (p === null) {
            const v = q[a - 1];
            if (SEES.has(v) || (HAS.has(v) && LOCATIVE.has(q[b + 1]))) p = b + 1;
        }
        if (p === null) continue;
        const end = clauseEnd(p), start = clauseStart(a);
        if (q.slice(start, end).some((t) => LOOK_BACK.test(t))) { why = 'it looks back, not at them here now'; continue; }
        if (elsewhereIn(p, end)) { why = 'it shows them somewhere else'; continue; }
        return { ok: true };
    }
    return { ok: false, why };
}

/**
 * expected.desk.handled_by (R2): the quote is a narrated act of handling a contract step (a handling word, a desk
 * thing in its sentence) whose doer is this person: named before the act, or a pronoun that is not Alaric's whose
 * nearest preceding person in the narration (at most eight sentences back) is this person alone.
 * @param {PersonProfile[]} people the people present (the handler among them)
 * @param {{self?: string[]}} opts Alaric's names
 */
export function deskHandlingEvidence(prose, evidence, id, people, { self = ['alaric'] } = {}) {
    const ev = narratedEvent(prose, evidence);
    if (!ev.ok) return ev;
    const q = ev.quote;
    const verb = q.findIndex((t) => HANDLES.test(t));
    if (verb < 0) return { ok: false, why: 'the quote shows no handling of a contract step' };
    if (!DESK_OBJECT.test([...q, ...ev.rest].join(' '))) return { ok: false, why: 'the quote handles nothing of the desk (slip, ledger, payout)' };
    const pc = new Set(self.flatMap((x) => flat(x).split(' ')).filter((x) => x.length > 2));
    const personWord = (t) => PRONOUN.has(t) || pc.has(t) || GENERIC_PERSON.has(t) || people.some((p) => p.role === singular(t) || p.nameWords.includes(t) || p.names.some((n) => n.split(' ').includes(t)));
    const doer = (words, at) => {
        for (let j = at; j >= 0; j--) if (words[j] !== ',' && personWord(words[j])) return j;
        return -1;
    };
    const who = (words, j) => {
        const t = words[j];
        if (pc.has(t)) return 'pc';
        // "the nearer clerk — a grey-haired woman with …": the noun of an apposition (a/an + description right after a
        // named or described person) is that person
        let k = j;
        if (GENERIC_PERSON.has(t) && !people.some((p) => p.role === singular(t))) {
            const a = words.slice(Math.max(0, j - 5), j).findLastIndex((x) => x === 'a' || x === 'an');
            if (a >= 0) {
                const ai = Math.max(0, j - 5) + a;
                const between = words.slice(ai + 1, j);
                const b = doer(words, ai - 1);
                if (!between.some((x) => personWord(x) || x === ',') && b >= 0 && ai - b <= 2 && !PRONOUN.has(words[b]) && !GENERIC_PERSON.has(words[b])) k = b;
            }
        }
        const named = namedPeople(words.slice(Math.max(0, k - 4), k + 1).filter((x) => x !== ','), people);
        return named.size === 1 ? [...named][0] : null;
    };
    const j = doer(q, verb - 1);
    if (j < 0) return { ok: false, why: 'the quote does not show who does it' };
    let actor = null;
    if (!PRONOUN.has(q[j])) actor = who(q, j);
    else if (PC_PRONOUN.has(q[j])) return { ok: false, why: `"${q[j]}" is Alaric's pronoun: a clerk acting must be named` };
    else if (q[j] === 'they' || q[j] === 'them') return { ok: false, why: 'a plural pronoun names no one handler' };
    else {
        // the nearest preceding person of the narration
        const sentences = narrationOnly(prose).split(/[.!?…\n|]+/).map(tokens);
        const s = sentences.findIndex((t) => locate(t, q.filter((x) => x !== ',')) || locate(t, q));
        if (s < 0) return { ok: false, why: 'it is spoken, not narrated' };
        const at = (locate(sentences[s], q) || locate(sentences[s], q.filter((x) => x !== ','))).i;
        // back through the words before the pronoun, then up to eight narrated sentences: pronouns are passed over,
        // the first person named or described ends the search
        const lead = sentences[s].slice(0, at);
        let found = null, seen = false;
        for (const [k, t] of [[s, lead], ...sentences.slice(Math.max(0, s - 8), s).map((x, n) => [n, x]).reverse()]) {
            const words = t.filter(Boolean);
            let c = doer(words, words.length - 1);
            while (c >= 0 && PRONOUN.has(words[c])) c = doer(words, c - 1);
            if (c >= 0) { found = who(words, c); seen = true; break; }
        }
        if (!seen) return { ok: false, why: 'no one is named before the pronoun' };
        actor = found;
    }
    if (actor === 'pc') return { ok: false, why: 'Alaric does it, not a clerk' };
    if (actor !== id) return { ok: false, why: actor ? 'the quote shows someone else doing it' : 'the doer cannot be told apart' };
    return { ok: true };
}
