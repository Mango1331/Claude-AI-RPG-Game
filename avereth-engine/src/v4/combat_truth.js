// Patch 7.2C: the mechanical truth of fights in the story's stores. Who died in a fight, and how many, is the engine's
// (src/combat.js books every death); a fact, a memory, a story thread or a quest note may keep the fight as a moment,
// never a kill the engine did not book as an objective truth (live Glimmerdeep: the narrator had four beetles die that
// the engine never struck; their deaths were refused, but a thread kept "four beetles were killed").
//
// One check for every store (facts in src/v4/firewall.js, memories, threads and quest notes in src/v4/world.js), clause
// by clause, so the rest of a text stays. It is deliberately narrow: it reads a claim only where a clause states a
// death and either counts the dead of a kind ("four beetles were killed", "Alaric slew all the wolves") or names one
// fighter ("Crystal Beetle A was killed"). Its limits: a death said in other words ("the swarm is no more") is not
// read; a clause someone says, believes or rumours ("the merchant believes four beetles were killed") is that person's
// claim, not the world's, and stays; a kind the engine never fought, killed by someone other than Alaric ("the hunter
// killed two deer last spring"), is the world's lore, not a fight of the engine.
import { normText } from '../util.js';
import { numbersIn } from '../economy.js';
import { namesKind } from './domain.js';
import { clausesOf } from './ownership.js';
import { sceneHandle } from './scene_handles.js';

const DEATH = '(?:killed|slain|slew|slaughtered|dead|died|destroyed|defeated|felled|cut down|struck down|wiped out|burned to death)';
const COUNT = '(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|twenty|a dozen|all|both|every|each|the)';
// a kind of one to three words ("beetles", "crystal beetles", "of the cave rats"), never a clause ("beetle lunged at the")
const NOUN = "([a-z][a-z'\\-]*(?:\\s+[a-z][a-z'\\-]*){0,2}?)";
const NEGATED = /\b(?:no|not|none|never|nobody|neither|nor|without|failed to|almost|nearly)\b/;
// "four beetles were killed", "all of the wolves lay dead", "the beetles died"
const COUNTED_DEAD = new RegExp(`\\b(${COUNT})\\s+(?:of\\s+(?:the|them|those)\\s+)?${NOUN}\\s+(?:were|was|are|is|lay|lie|had been|have been|has been|got|now|all)?\\s*${DEATH}\\b`);
// "killed four beetles", "slew all the wolves", "four dead beetles"
const KILLED_COUNT = new RegExp(`\\b${DEATH}\\s+(${COUNT})\\s+(?:of\\s+(?:the|them|those)\\s+)?(?:the\\s+)?${NOUN}(?=[,.;!]|\\s+(?:and|with|in|at|on|before|after|while|but|that|who|which)\\b|$)`);
const DEAD_COUNT = new RegExp(`\\b(${COUNT})\\s+dead\\s+${NOUN}(?=[,.;!]|\\s|$)`);
// "four of them were killed": the pronoun is those here
const COUNTED_THEM = new RegExp(`\\b(${COUNT})\\s+of\\s+(them|those)\\s+(?:were|was|are|lay|lie|had been|have been|got|now|all)?\\s*${DEATH}\\b`);
const DEATH_RE = new RegExp(`\\b${DEATH}\\b`);
// whose claim it is: a clause someone says, believes, claims or rumours is that one's, never the world's
const SAID = /\b(?:believes?|believed|thinks?|thought|claims?|claimed|says?|said|hears?|heard|rumou?rs?|rumou?red|swears?|swore|insists?|insisted|boasts?|boasted|suspects?|fears?|feared|supposedly|allegedly|according to|tells? of|told of|whispers?|whispered)\b/;
const ALARIC = /\b(?:alaric|he|him|his)\b/;

/** A count a claim states, or 'all' ("the beetles", "all of them"), or null when it states none. */
function countOf(word, noun) {
    const w = normText(word);
    if (['all', 'every', 'each', 'both'].includes(w)) return w === 'both' ? 2 : 'all';
    if (w === 'the') return /s\b/.test(noun.trim()) ? 'all' : 1;
    if (w === 'a dozen') return 12;
    const n = [...numbersIn(w)];
    return n.length ? n[0] : null;
}

/**
 * The check for one state: (clause) => null when the clause claims no death the engine contradicts, else
 * {why, correction}. A clause someone else says or believes is never a contradiction (it is their claim).
 * @param {object} s state
 * @param {object} content
 */
export function combatTruth(s, content) {
    const creatures = Object.values(s.entities || {}).filter((e) => e.kind === 'creature' && e.id !== 'pc');
    const fighters = Object.values(s.entities || {}).filter((e) => e.id !== 'pc' && (e.profile || s.encounter?.combatants?.[e.id]));
    const anchor = (e) => content.anchors.get(e.anchor || e.profile?.anchor);
    const ofKind = (noun) => creatures.filter((e) => namesKind(noun, e.species || e.descriptors?.[0] || '', anchor(e)));
    const dead = (es) => es.filter((e) => e.status === 'dead');
    const here = (es) => es.filter((e) => s.scene.present.includes(e.id) || e.location === s.scene.location);
    // the labels a fighter goes by in the story: its handle in the scene and its name
    const labels = (e) => [e.name, s.scene.present.includes(e.id) ? sceneHandle(s, content, e.id) : null].filter(Boolean).map(normText).filter((x) => x.length > 2);
    return (clause) => {
        const c = normText(clause);
        if (!DEATH_RE.test(c)) return null;
        const said = SAID.exec(c);
        const at = (i) => !said || said.index > i; // the claim comes before any "he said" / "they believe" of the clause
        // one fighter by its handle or name the engine has alive
        for (const e of fighters) {
            if (e.status === 'dead') continue;
            const l = labels(e).find((x) => c.includes(x));
            if (!l) continue;
            const i = c.indexOf(l);
            const after = c.slice(i + l.length);
            if (at(i) && new RegExp(`^\\s+(?:(?:was|is|lay|lies|had been|has been|now)\\s+)?${DEATH}\\b`).test(after)) {
                const who = e.name || sceneHandle(s, content, e.id);
                return { why: `${who} is alive in the engine's state`, correction: `${who} is alive, as the engine has it: the death the last reply told of did not happen.` };
            }
        }
        // a count of the dead of a kind
        const m = COUNTED_THEM.exec(c) || COUNTED_DEAD.exec(c) || KILLED_COUNT.exec(c) || DEAD_COUNT.exec(c);
        if (!m || !at(m.index) || NEGATED.test(c.slice(Math.max(0, m.index - 12), m.index + m[0].length))) return null;
        const noun = m[2].trim().replace(/^(?:of\s+)?(?:the|them|those)\s+/, '');
        const claimed = countOf(m[1], noun);
        if (claimed === null) return null;
        const pronoun = /^(?:them|those|they)$/.test(noun);
        const kind = pronoun ? here(creatures) : ofKind(noun);
        // a kind the engine never fought, killed by someone else than Alaric, is the world's lore
        if (!kind.length && !ALARIC.test(c)) return null;
        const fell = dead(kind).length;
        const standing = here(kind).filter((e) => e.status !== 'dead').length;
        const wrong = claimed === 'all' ? fell === 0 || standing > 0 : claimed > fell;
        if (!wrong) return null;
        const what = pronoun ? 'of them' : noun;
        const told = claimed === 'all' ? `all the ${what}` : `${claimed} ${what}`;
        return {
            why: `${told} dead: the engine's fights have ${fell} dead${standing ? `, ${standing} still standing here` : ''}`,
            correction: `The engine's fights have ${fell === 0 ? 'killed none' : `killed ${fell}`} of the ${what}${standing ? ` (${standing} still alive here)` : ''}: the deaths the last reply told of beyond that did not happen, and nothing remembers them.`,
        };
    };
}

/**
 * A text with the clauses that claim a death the engine contradicts taken out.
 * @returns {{text: string, refused: {clause: string, why: string, correction: string}[]}}
 */
export function stripFalseDeaths(check, text) {
    const refused = [];
    const kept = clausesOf(text).filter((c) => {
        const x = check(c);
        if (x) refused.push({ clause: c, ...x });
        return !x;
    });
    return { text: kept.join(' '), refused };
}
