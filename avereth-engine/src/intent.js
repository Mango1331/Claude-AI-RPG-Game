// Deterministic interpretation of the player's message. Mechanics only start from what the player actually
// declared (Core #23 combat gate, #24 PC ACTION SCOPE). Anything not recognised is 'narrative' and left to the LLM.
// The attack phrasing regexes are ported from the v1.24 WorldInfo triggers, where they were validated with 234
// tests (see Avereth_RPG_v1.24_PERFEKTIONIERT/tools/validate/regex_tests.js); here they detect intent instead of
// routing WorldInfo entries.
import { bandIndex, normText } from './util.js';

const ATTACK_VERBS = String.raw`attack(?:s|ed|ing)?|shoot(?:s|ing)?(?!\s+(?:(?:him|her|them|me|us|it)\s+)?(?:a|an)\s+(?:look|glance|glare|smile|grin|wink|question)\b)|stab(?:s|bed|bing)?|slash(?:es|ed|ing)?|(?:strike|strikes|struck|striking)(?!\s+(?:up|out|a\s+(?:deal|bargain|match|pose|chord|balance|light))\b)|hit(?:s|ting)?(?!\s+(?:it\s+off|the\s+(?:road|trail|hay|sack|books|bottle|town|streets|tavern|inn|market))\b)|punch(?:es|ed|ing)?(?!\s+in\b)|kick(?:s|ed|ing)?(?!\s+(?:off|back|in)\b)|smash(?:es|ed|ing)?|kill(?:s|ed|ing)?(?!\s+time\b)|bash(?:es|ed|ing)?|pierce(?:s|d)?|swing(?:s|ing)?(?!\s+by\b)|swung(?!\s+by\b)`;
const DIRECTED = String.raw`(?:fire|fires|fired|firing|loose|looses|loosed|loosing|throw|throws|threw|thrown|throwing|cast|casts|casting|release|releases|released|releasing|hurl|hurls|hurled)\b(?!\s+(?:(?:a|an|my|his|her|the|one|another|quick|last|long|wary|sidelong)\s+){0,2}(?:glance|glances|look|looks|line|lines|net|nets|eye|eyes|shadow|shadows|vote|votes|doubt|light|dice|lots|anchor)\b)(?:\s+\w+){0,4}?\s+(?:at|on|into|against|toward|towards)\b`;
const FIRE_PROJECTILE = String.raw`(?:fire|fires|fired|firing|loose|looses|loosed|loosing|release|releases|released|draw and release)\s+(?:an?\s+|my\s+|the\s+|another\s+)?(?:arrow|arrows|shot|bolt|volley)\b`;
const ADVERB = String.raw`(?:(?:then|now|quickly|suddenly|immediately|just|also|swiftly|instantly)\s+)?`;
const SUBJECT_LED = String.raw`(?:\b(?:i|we)\s+|\*\s*)` + ADVERB + String.raw`(?:(?:lunge|lunges|lunged|lunging|tackle|tackles|tackled|tackling|ram|rams|rammed|ramming)\b|(?:charge|charges|charged|charging)\b(?!\s+(?:for|up|(?:(?:a|an|the|my|his|her|their|\d+)\s+)?(?:fee|fees|toll|price|coin|coins|silver|gold|copper|tax|sum|crystal|crystals|rune|runes|stone|gem|gems)\b))|(?:fire|fires|fired|loose|looses|loosed)\b(?!\s+(?:up|off|out)\b))`;
const PUT_ARROW = String.raw`(?:put|puts|putting|send|sends|sent|sending)\s+(?:an?|another|one|two|a\s+second)\s+(?:\w+\s+)?(?:arrow|arrows|bolt|bolts|shaft|shafts)\s+(?:in|into|through)\b`;
const WEAPON_INTO = String.raw`(?:drive|drives|drove|driving|sink|sinks|sank|sinking|bury|buries|buried|burying|plunge|plunges|plunged|plunging|thrust|thrusts|thrusting|jab|jabs|jabbed|jabbing|ram|rams|rammed|ramming)\s+(?:(?:an?|my|the|his|her|another)\s+)?(?:\w+\s+)?(?:arrow|arrows|bolt|blade|sword|longsword|dagger|knife|spear|rapier|mace|staff|axe|shield|fist|elbow|knee|heel)\s+(?:in|into|through|at|against)\b`;
const LET_FLY = String.raw`let(?:s|ting)?\s+(?:(?:an?|my|the|another)\s+)?(?:(?:arrow|arrows|bolt|bolts|shaft|shafts)\s+)?fly\b`;
const OTHER = String.raw`open(?:s|ed|ing)?\s+fire\b|take(?:s|ing)?\s+(?:the|my)\s+shot\b|(?:aim|aims|aimed|aiming|draw|draws|drew|drawing|nock|nocks|nocked|nocking)\s+and\s+(?:release|releases|released|loose|looses|loosed|fire|fires|fired|let\s+fly)\b|(?:cut|cuts|cutting|slit|slits|slitting|slice|slices|sliced|slicing|open|opens|opened)\s+(?:its|his|her|their|the\s+\w+(?:'s)?)\s+throat\b|go(?:es)?\s+for\s+(?:the\s+kill|(?:its|his|her|their|the\s+\w+(?:'s)?)\s+(?:throat|neck|eyes?|heart))\b`;

const ATTACK_RE = new RegExp(String.raw`\b(?:${ATTACK_VERBS}|${DIRECTED}|${FIRE_PROJECTILE})\b`, 'i');
const ACTION_RE = new RegExp(String.raw`(?:${SUBJECT_LED}|\b(?:${PUT_ARROW}|${WEAPON_INTO}|${LET_FLY}|${OTHER}))`, 'i');
const INFO_RE = /\b(?:what\s+(?:does|do|is|are|would)|how\s+(?:does|do|much|many|would)|explain|describe|tell me about|compare|difference between)\b[^.!?]{0,60}?\b(?:skill|skills)\b/i;
const AIM_RE = /\b(?:aim|aims|aiming|take\s+aim|draw\s+(?:my\s+)?bow|nock|ready\s+(?:my\s+)?bow)\b/i;
// creep/sneak up and get closer: the natural words for a melee Ambush (found building the Warrior's live smoke)
const CLOSER_RE = /\b(?:approach|approaches|advance|advances|close\s+(?:in|the\s+distance)|move\s+(?:closer|toward|towards|in|up)|step\s+(?:closer|toward|towards|forward|in)|rush\s+(?:at|toward|towards|in)|run\s+(?:at|toward|towards)|(?:creep|creeps|sneak|sneaks|edge|edges|inch|slip)\s+(?:closer|up|in|toward|towards)|(?:get|gets|come|comes)\s+(?:closer|toward|towards))\b/i;
const AWAY_RE = /\b(?:retreat|retreats|back\s+(?:away|off|up)|(?:step|steps|jump|jumps|leap|leaps|hop|hops|spring|springs|dart|darts|skip|skips|scramble|scrambles|stumble|stumbles|fall|falls|move|moves|pull|pulls|ease|eases)\s+back(?:wards?)?|backwards?|kite|kites|kiting|withdraw|withdraws|move\s+away|put\s+distance|keep\s+(?:my\s+)?distance|open\s+(?:up\s+)?(?:the\s+)?distance)\b/i;
const FLEE_RE = /\b(?:flee|flees|run\s+away|escape|make\s+a\s+run\s+for\s+it|bolt\s+(?:away|off))\b/i;
const STEALTH_RE = /\b(?:sneak|sneaks|sneaking|creep|creeps|creeping|hide|hides|hiding|stay\s+hidden|move\s+quietly|stalk|stalks|stalking|crouch\s+low)\b/i;
const PRONOUN_RE = /\b(?:him|her|it|them|the\s+(?:man|woman|creature|beast|animal|thing))\b/i;
const NEAREST_RE = /\b(?:nearest|closest)\b/i;
// the player tells targets apart ("at the second one", "the other one", "the left one"): not a pronoun, so the sole
// valid target is no answer (Testrun 4: "aimed shot at the second one" hit the only combatant). "another one" is an
// arrow as often as a target, so only "at another one" counts.
const EXPLICIT_REF_RE = /\b(?:the\s+(?:first|second|third|fourth|fifth|other|left|right)|at\s+another)\s+ones?\b/i;
const INTERROGATIVE_RE = /^[\s*_"“]*(?:what|how|can|could|would|should|is|are|does|do|did|will|which|why|when|where|who|may|might|shall)\b/i;
const USE_RE = /\b(?:use|uses|using|cast|casts|casting|activate|activates|perform|performs)\s+(?:my\s+|a\s+|the\s+)?$/i;

/**
 * The part of a message that declares actions: quoted dialogue (threats are not commitments, Core #23) and
 * questions ("Can I shoot him from here?") are removed before looking for attacks.
 */
export function declarative(text) {
    const noQuotes = String(text).replace(/"[^"\n]*"|“[^”\n]*”/g, ' ');
    return noQuotes.split(/(?<=[.!?])\s+|\n+/).filter((p) => !(/\?[\s*_]*$/.test(p) && INTERROGATIVE_RE.test(p))).join(' ').trim();
}

function wordRe(term) {
    return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`, 'i');
}

/** Skills mentioned by name (longest names first so "Twin Shot" wins over "Shot"). */
export function mentionedSkills(text, content) {
    const t = normText(text);
    const names = [...content.skillsByName.keys()].sort((a, b) => b.length - a.length);
    const found = [];
    let rest = t;
    for (const n of names) {
        if (n === 'basic attack' && !/basic attack/.test(rest)) continue;
        const re = wordRe(n);
        if (re.test(rest)) {
            found.push(n);
            rest = rest.replace(re, ' ');
        }
    }
    return found;
}

/** Resolve a target among present entities by name, descriptor, species word or pronoun. */
export function resolveTarget(text, state, content, { hostileOnly = false } = {}) {
    const t = normText(text);
    const present = state.scene.present.filter((id) => id !== 'pc' && state.entities[id] && state.entities[id].status !== 'dead');
    // named targets; the most specific match wins ("the grey wolf" beats another plain "wolf")
    let hits = [];
    let best = 0;
    for (const id of present) {
        const e = state.entities[id];
        const words = [e.name, ...(e.descriptors || [])].filter(Boolean).map(normText);
        const anchor = content.anchors.get(e.anchor || e.profile?.anchor);
        if (anchor) words.push(...anchor.aliases);
        const len = Math.max(0, ...words.filter((w) => w && wordRe(w).test(t)).map((w) => w.length));
        if (!len) continue;
        if (len > best) { best = len; hits = [id]; } else if (len === best) hits.push(id);
    }
    const valid = hostileOnly && state.encounter
        ? present.filter((id) => state.encounter.combatants[id] && state.encounter.combatants[id].side === 'hostile' && !state.encounter.combatants[id].current.defeated)
        : present;
    if (hits.length === 1) return { id: hits[0], how: 'named' };
    // "the nearest one": the player chooses by distance, so the closest Range Band decides among the targets he named
    // ("the nearest wolf") or, in a fight, among the hostiles; equally close targets remain his choice (Core #23).
    // Outside a fight "the nearest one" could be anyone present, so it stays his choice as well.
    const pool = hits.length > 1 ? hits : hostileOnly && state.encounter ? valid : [];
    if (NEAREST_RE.test(t) && pool.length > 1) {
        const band = (id) => bandIndex(state.encounter?.combatants[id]?.current.band || state.scene.positions[id]?.band || 'MEDIUM');
        const near = pool.filter((id) => band(id) === Math.min(...pool.map(band)));
        return near.length === 1 ? { id: near[0], how: 'nearest' } : { ambiguous: near };
    }
    if (hits.length > 1) return { ambiguous: hits };
    // pronoun or no target words: the sole valid target (Core #23 sole-hostile default); 2+ -> the player chooses.
    // A target he tells apart but that is not in the fight is his decision, never silently the only combatant.
    const explicit = String(text).match(EXPLICIT_REF_RE);
    if (valid.length === 1 && explicit) return { none: true, ref: explicit[0].replace(/^at\s+/i, '') };
    if (valid.length === 1) return { id: valid[0], how: PRONOUN_RE.test(t) ? 'pronoun' : 'sole target' };
    if (valid.length > 1) return { ambiguous: valid };
    return { none: true };
}

/**
 * @returns {object} intent: {kind: 'command'|'creation.class'|'creation.skills'|'creation.invalid'|'attack'|'skill'
 *   |'move'|'flee'|'stealth'|'narrative'|'ambiguous_target'|'unknown_skill'|'no_target', ...}
 */
export function parseIntent(text, state, content) {
    const raw = String(text || '');
    const t = normText(raw);
    const cmd = raw.match(/^\s*#\s*([a-z]+)\s*([\s\S]*)$/i);
    if (cmd) return { kind: 'command', name: cmd[1].toLowerCase(), arg: cmd[2].trim() };

    if (state.mode === 'creation') {
        if (state.creation.step === 1) {
            const cls = [...content.classes.values()].filter((c) => wordRe(c.name.toLowerCase()).test(t));
            if (cls.length === 1) return { kind: 'creation.class', class: cls[0].id };
            return { kind: 'creation.invalid', reason: cls.length ? 'choose exactly one Base Class' : 'no Base Class named' };
        }
        if (state.creation.step === 2) {
            const pool = content.classes.get(state.creation.class).skill_pool.map((id) => content.skills.get(id));
            const chosen = pool.filter((s) => wordRe(s.name.toLowerCase()).test(t)).map((s) => s.id);
            return chosen.length ? { kind: 'creation.skills', skills: chosen } : { kind: 'creation.invalid', reason: 'no Skill from the pool named' };
        }
    }

    const sheet = state.entities.pc?.sheet;
    const known = sheet ? Object.keys(sheet.skills) : [];
    const decl = declarative(raw);
    const d = normText(decl);
    if (!d) return { kind: 'narrative', flags: { info: /\?/.test(raw), speech: /["“]/.test(raw) } };
    // Skills: known ones by name; an unknown one only when unmistakable (multi-word name or "use/cast X"), so that
    // ordinary words that are also Skill names ("guard", "charge", "blink") are not misread as Skill use
    const skills = [];
    let unknownSkill = null;
    for (const n of mentionedSkills(decl, content)) {
        const list = content.skillsByName.get(n);
        const mine = list.find((s) => known.includes(s.id));
        if (mine) skills.push(mine);
        else if (!unknownSkill && (n.includes(' ') || USE_RE.test(d.slice(0, d.indexOf(n))))) unknownSkill = list.find((s) => s.class === sheet?.class) || list[0];
    }
    const infoQuestion = INFO_RE.test(d) || (skills.length && /\b(?:what does it|how does it|explain|describe|details|description)\b/i.test(d));
    if (infoQuestion && !ATTACK_RE.test(d)) return { kind: 'narrative', flags: { info: true } };

    const attackWords = ATTACK_RE.test(d) || ACTION_RE.test(decl) || ACTION_RE.test(d);
    const offensive = skills.find((s) => s.attack);
    const nonOffensive = skills.find((s) => !s.attack);
    const move = CLOSER_RE.test(d) ? 'closer' : AWAY_RE.test(d) ? 'away' : null;

    if (FLEE_RE.test(d) && !attackWords && !offensive) return { kind: 'flee' };

    if (unknownSkill && !offensive && !nonOffensive) return { kind: 'unknown_skill', skill: unknownSkill.id, name: unknownSkill.name };
    if (offensive || attackWords) {
        const skill = offensive || (sheet && sheet.class ? content.skills.get(content.classes.get(sheet.class).basic_attack) : null);
        if (!skill) return { kind: 'narrative', flags: { attack_without_class: true } };
        const target = resolveTarget(raw, state, content, { hostileOnly: !!state.encounter });
        if (target.ambiguous) return { kind: 'ambiguous_target', skill: skill.id, candidates: target.ambiguous };
        if (target.none) return { kind: 'no_target', skill: skill.id, ...(target.ref ? { ref: target.ref } : {}) };
        return { kind: 'attack', skill: skill.id, target: target.id, target_how: target.how, move };
    }
    if (nonOffensive) {
        const target = resolveTarget(raw, state, content, {});
        return { kind: 'skill', skill: nonOffensive.id, dir: move || 'away', target: target.id || null };
    }
    if (state.encounter && move) {
        const target = resolveTarget(raw, state, content, { hostileOnly: true });
        return { kind: 'move', dir: move, target: target.id || null };
    }
    if (STEALTH_RE.test(d)) return { kind: 'stealth' };
    return { kind: 'narrative', flags: { aim: AIM_RE.test(d) } };
}


// ------------------------------------------------------------------------------------------ player authorization
// What the player's own message licenses Alaric to do (PLAYER OWNERSHIP). The narrator's fact report may only record
// voluntary PC changes (travel, payments, hand-overs, accepting a quest, hiding, long time skips) that the current
// message authorizes. Speech counts ("Deal, I'll take the job"), questions do not ("Should I pay him?").
const AUTH_RE = {
    travel: /\b(?:go|goes|going|went|walk|walks|walking|head|heads|heading|travel|travels|travelling|traveling|ride|rides|riding|return|returns|returning|journey|leave|leaves|leaving|enter|enters|entering|follow|follows|following|set (?:off|out)|march|sail|run|runs|continue|continues|move on|take the (?:\w+ )?(?:road|path|trail|ferry|ship|coach)|make (?:my|our) way)\b/i,
    move: /\b(?:go|walk|head|travel|ride|return|journey|leave|enter|follow|track|tracks|tracking|approach|approaches|climb|climbs|cross|crosses|step|steps|search|explore|sneak|creep|crawl|run|move|moves|continue|wander|wanders|circle|descend|ascend|jump|swim|push through|make (?:my|our) way|take the (?:road|path|trail|stairs))\w*\b/i,
    pay: /\b(?:pay|pays|paid|paying|buy|buys|bought|buying|purchase|rent|rents|tip|tips|bribe|bribes|hire|hires|spend|spends|donate|settle the bill|trade|trades|sell|sells|sold|here(?:'s| is|,) (?:\w+ ){0,2}(?:coins?|money|silver|copper|gold|payment)|(?:coins?|copper|silver|gold|crowns?) (?:for|to cover) (?:the|your|my|a) \w+)\b/i,
    give: /\b(?:give|gives|gave|giving|hand|hands|handed|offer|offers|lend|lends|trade|trades|sell|sells|sold|drop|drops|toss|tosses|throw|throws|deliver|delivers|return (?:the|his|her|their|it)|leave (?:the|my) \w+|take (?:it|this|these|them))\b/i,
    accept: /\b(?:accept|accepts|accepted|agree|agrees|agreed|deal|i'll do it|i will do it|i'?ll take (?:it|the (?:[\w'-]+ ){0,6}(?:job|work|contract|quest|task|bill|bounty))|take the (?:[\w'-]+ ){0,6}(?:job|work|contract|quest|task|bill|bounty)|sign (?:up|on)|count me in|i'm in|i will help|i'll help|yes|sure|very well|fine,)\b/i,
    conceal: /\b(?:hide|hides|hiding|sneak|sneaks|sneaking|creep|creeps|creeping|conceal|stay hidden|duck (?:behind|into|down)|take cover|crouch (?:low|behind)|hold still)\b/i,
    rest: /\b(?:rest|rests|resting|sleep|sleeps|sleeping|wait|waits|waiting|camp|camps|spend the (?:night|day|evening)|stay the night|train|trains|work|works|meditate|recover|eat|drink)\b/i,
};

/** The parts of a message that can authorize: questions do not; quoted speech does (commitments are often spoken). */
function said(text) {
    return String(text || '').split(/(?<=[.!?])\s+|\n+/).filter((p) => !(/\?[\s*_"”]*$/.test(p) && INTERROGATIVE_RE.test(p))).join(' ');
}

// A quest is named by the distinctive words of its title ("Vermin in the Malthouse Cellar": vermin, malthouse,
// cellar); two of them (or the only one) must occur in the message, so "the cellar" alone names no quest.
const TITLE_FILLER = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'of', 'to', 'for', 'near', 'by', 'with', 'from', 'and', 'or', 'into', 'off', 'quest', 'job', 'bill', 'contract', 'task', 'work', 'bounty']);
const stem = (w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
const titleWords = (title) => [...new Set(normText(title).split(' ').filter((w) => w && !TITLE_FILLER.has(w)).map(stem))];

export function namesQuest(text, title) {
    const words = titleWords(title);
    if (!words.length) return false;
    const have = new Set(normText(text).split(' ').map(stem));
    return words.filter((w) => have.has(w)).length >= Math.min(2, words.length);
}

// taking a quest by name: "I take the Vermin in the Malthouse Cellar Quest", "I'll pick the drake bill" (not "take a look")
const TAKE_RE = /\b(?:accept|accepts|accepted|choose|chooses|chose|pick|picks|picked|grab|grabs|grabbed|claim|claims|claimed|sign(?:s|ed)?\s+(?:up\s+)?for|take|takes|taking|took)\b(?!\s+(?:a|another|one)\s+(?:look|peek|glance|breath|seat|moment|step|rest|break|walk|shot)\b)(?!\s+(?:cover|aim)\b)/i;

/** Whether the message takes this quest by name (its reply may record it "active" even a few turns later). */
export function takesQuest(text, title) {
    const t = said(text);
    return TAKE_RE.test(t) && namesQuest(t, title);
}

export function authorization(text) {
    const raw = String(text || '');
    // questions do not authorize; quoted speech does (commitments are often spoken)
    const said_ = said(raw);
    const out = {};
    for (const [k, re] of Object.entries(AUTH_RE)) out[k] = re.test(said_);
    out.travel = out.travel || false;
    out.move = out.move || out.travel;
    out.rest = out.rest || out.travel;
    return out;
}
