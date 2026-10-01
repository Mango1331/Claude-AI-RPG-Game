// Deterministic interpretation of the player's message. Mechanics only start from what the player actually
// declared (Core #23 combat gate, #24 PC ACTION SCOPE). Anything not recognised is 'narrative' and left to the LLM.
// The attack phrasing regexes are ported from the v1.24 WorldInfo triggers, where they were validated with 234
// tests (see Avereth_RPG_v1.24_PERFEKTIONIERT/tools/validate/regex_tests.js); here they detect intent instead of
// routing WorldInfo entries.
import { bandIndex, normText } from './util.js';
import { sceneHandle } from './v4/scene_handles.js';

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
const ENGAGE_RE = /\b(?:(?:get|getting|be|am|stand|standing)\s+(?:myself\s+)?ready\s+for\s+(?:combat|a\s+fight|the\s+fight)|prepare(?:s|d|ing)?\s+(?:myself\s+)?to\s+fight|square(?:s|d|ing)?\s+up(?:\s+to\s+fight)?|(?:take|takes|taking)\s+(?:a\s+)?fighting\s+stance)\b/i;
// creep/sneak up and get closer: the natural words for a melee Ambush (found building the Warrior's live smoke);
// "dash at" (live run 25.09. 01:31: "*i dash at the first one and basic attack it*")
const CLOSER_RE = /\b(?:approach|approaches|advance|advances|close\s+(?:in|the\s+distance)|move\s+(?:closer|toward|towards|in|up)|step\s+(?:closer|toward|towards|forward|in)|(?:rush|dash|dashes)\s+(?:at|toward|towards|in)|run\s+(?:at|toward|towards)|(?:creep|creeps|sneak|sneaks|edge|edges|inch|slip)\s+(?:closer|up|in|toward|towards)|(?:get|gets|come|comes)\s+(?:closer|toward|towards))\b/i;
const AWAY_RE = /\b(?:retreat|retreats|back\s+(?:away|off|up)|(?:step|steps|jump|jumps|leap|leaps|hop|hops|spring|springs|dart|darts|skip|skips|scramble|scrambles|stumble|stumbles|fall|falls|move|moves|pull|pulls|ease|eases)\s+back(?:wards?)?|backwards?|kite|kites|kiting|withdraw|withdraws|move\s+away|put\s+distance|keep\s+(?:my\s+)?distance|open\s+(?:up\s+)?(?:the\s+)?distance)\b/i;
const FLEE_RE = /\b(?:flee|flees|run\s+away|escape|make\s+a\s+run\s+for\s+it|bolt\s+(?:away|off))\b/i;
const STEALTH_RE = /\b(?:sneak|sneaks|sneaking|creep|creeps|creeping|hide|hides|hiding|stay\s+hidden|move\s+quietly|stalk|stalks|stalking|crouch\s+low)\b/i;
const PRONOUN_RE = /\b(?:him|her|it|them|the\s+(?:man|woman|creature|beast|animal|thing))\b/i;
// Runtime V4 (live 30.09.2026 14:56): waiting in hiding is declared stealth too ("keep myself hidden as i lay in wait")
const STEALTH_V4 = String.raw`keep(?:s|ing)?\s+(?:myself\s+|himself\s+)?(?:hidden|out\s+of\s+sight|low)|stay(?:s|ing)?\s+out\s+of\s+sight|(?:lay|lays|lie|lies|lying|laying)\s+(?:in\s+wait|low|hidden)|hold(?:s|ing)?\s+(?:myself\s+)?hidden`;
// Runtime V4: stealth is a deed Alaric declares, so its word stands as his verb: after "I" (an adverb between: "I
// carefully creep"), at the start of the message, a sentence or a starred part ("*crouch down and sneak closer*"), or
// after and/then/but/so/or/to ("and sneak", "try to hide"). The word of a name or a noun is none ("the Cull the Gnaw
// Hide Boars contract", "its hide"; live 30.09.2026 22:41: taking that contract was read as hiding from the clerk).
const DEED_LEAD = String.raw`(?:^|[.!?;:,*(]\s*|\b(?:i|we|and|then|but|so|or|to)\s+)(?:\w+ly\s+)?`;
const STEALTH_ACT_RE = new RegExp(String.raw`${DEED_LEAD}(?:sneak|sneaks|sneaking|creep|creeps|creeping|hide|hides|hiding|stay\s+hidden|move\s+quietly|stalk|stalks|stalking|crouch\s+low|${STEALTH_V4})\b`, 'i');
const AT_DEED = new RegExp(`${DEED_LEAD}$`, 'i');

/**
 * Runtime V4 / Gen 3.5 Intent IR: the names the engine knows in a message, linked to what they name (Guild contract
 * titles, places, people and creatures, things; multi-word names, longest first). A word of a name is no deed of
 * Alaric's ("I take the Cull the Gnaw-Hide Boars contract": the "Hide" is part of a contract's title; the "Walk" of a
 * label was the same kind of error). A name where his own verb would stand stays his deed ("I kill the rats" while a
 * contract is called "Kill the Rats"). The intent patterns read the masked text; the interpreter, the target
 * resolution and the record keep the message as he wrote it; the IR keeps the links (src/ir.js).
 * @returns {{masked: string, links: {kind: string, id: string, text: string, deed: boolean}[]}}
 */
export function linkEntities(text, state) {
    const named = [
        ...Object.values(state.quests || {}).map((q) => ({ kind: 'quest', id: q.id, name: q.title })),
        ...Object.values(state.places || {}).map((p) => ({ kind: 'place', id: p.id, name: p.name })),
        ...Object.values(state.entities || {}).map((e) => ({ kind: e.kind === 'creature' ? 'creature' : e.id === 'pc' ? 'pc' : 'person', id: e.id, name: e.name })),
        ...Object.values(state.objects || {}).map((o) => ({ kind: 'object', id: o.id, name: o.name })),
    ].map((x) => ({ ...x, words: String(x.name || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean) })).filter((x) => x.words.length >= 2);
    let out = String(text);
    const links = [];
    for (const x of named.sort((a, b) => b.words.join(' ').length - a.words.join(' ').length)) {
        out = out.replace(new RegExp(String.raw`\b${x.words.join(String.raw`[^a-z0-9*]+`)}\b`, 'gi'), (name, at, all) => {
            const deed = AT_DEED.test(all.slice(0, at));
            links.push({ kind: x.kind, id: x.id, text: name, deed });
            return deed ? name : ' ';
        });
    }
    return { masked: out, links };
}

/** The message with the names the engine knows masked where they are no deed of Alaric's (linkEntities). */
export const maskNames = (text, state) => linkEntities(text, state).masked;

// "*i say calmly*": the player marks his deeds with asterisks and names what is outside them as his words
const SAY_RE = /\b(?:i|we)\s+(?:\w+\s+)?(?:say|says|said|ask|asks|asked|reply|replies|replied|tell|tells|told|shout|shouts|call|calls|whisper|whispers|answer|answers|add|adds|mutter|mutters)\b/i;

// a sentence outside the stars that still declares his own deed now ("I attack the wolf."): "I", perhaps an adverb, then a
// verb that is no modal or auxiliary ("I will kill you", "I have killed two") and not in the past tense (a report:
// "I found three", "I killed two")
const OWN_DEED_RE = /^(?:(?:and|then|so|now|but)\s+)?i\s+(?:\w+ly\s+)?(?!(?:will|would|could|should|might|must|can|cannot|shall|may|have|had|did|do|was|were|am)\b)([a-z]+)\b/i;
const PAST_IRREGULAR = new Set(['found', 'got', 'took', 'saw', 'went', 'came', 'made', 'left', 'brought', 'caught', 'fought', 'slew', 'struck', 'swung', 'shot', 'threw', 'drew', 'ran', 'met', 'lost', 'won', 'said', 'told', 'heard', 'felt', 'knew', 'thought', 'kept', 'held', 'stood', 'sat', 'bit', 'tore', 'broke', 'began', 'gave', 'ate', 'fell', 'hid', 'led', 'slept']);
const ownDeed = (sentence) => {
    const m = OWN_DEED_RE.exec(sentence.trim());
    return !!m && !/ed$/i.test(m[1]) && !PAST_IRREGULAR.has(m[1].toLowerCase());
};

/**
 * Runtime V4: the deeds of a message that marks them with asterisks and says that the rest is speech ("found 3
 * killed 2 *i say calmly* is that enough?", live 30.09.2026 14:56): the starred parts, in their order; a message
 * without that convention unchanged. Outside the stars, what a speech tag ("*I say*", "*I shout*") gives as said is
 * speech and never a deed (review of 4.1.3: "*I say* I strike the wolf." is words): the words after it, and the words
 * that run into it ("I found three and killed two *I say calmly*", "I strike you down *I shout*"). A sentence closed by
 * a full stop before a tag that has words of its own after it is none of them ("I attack the wolf. *I shout* Get
 * back!", review of 4.1.2): it and the other sentences outside the stars count when they plainly declare his own deed.
 */
export function deedsOf(text) {
    const src = String(text);
    const parts = src.split(/(\*[^*]+\*)/).filter((x) => x.trim());
    const starred = (x) => /^\*[^*]+\*$/.test(x);
    const tag = (x) => !!x && starred(x) && SAY_RE.test(x.slice(1, -1));
    if (!parts.some(tag)) return src;
    const deeds = [];
    parts.forEach((x, i) => {
        if (starred(x)) return deeds.push(x.slice(1, -1));
        if (tag(parts[i - 1])) return; // the words a tag introduces
        const sentences = x.split(/(?<=[.!?])\s+|\n+/).map((y) => y.trim()).filter(Boolean);
        // the words a tag closes: the last sentence before it, unless it ends with a full stop and the tag has its own words
        if (tag(parts[i + 1]) && sentences.length && !(/\.$/.test(sentences.at(-1)) && parts[i + 2] && !starred(parts[i + 2]))) sentences.pop();
        deeds.push(...sentences.filter(ownDeed));
    });
    return deeds.map((x) => x.trim().replace(/[.!]+$/, '')).filter(Boolean).join('. ');
}
// a word for any creature: it names the creatures present, never the people standing by
const CREATURE_RE = /\b(?:creature|creatures|beast|beasts|animal|animals|monster|monsters)\b/i;
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

/**
 * Resolve a target among present entities by target label, name, descriptor, species word or pronoun. In a fight
 * (hostileOnly) the opponents' labels come first and decide exactly ("Quick Slash on Cellar Rat B"); every other
 * reference and every "which one?" only looks at the opponents still fighting: people standing by are no candidates
 * (live run 25.09. 01:31: "the first one" offered the merchant and the ratcatcher), only named they become targets.
 */
export function resolveTarget(text, state, content, { hostileOnly = false } = {}) {
    const t = normText(text);
    const enc = hostileOnly ? state.encounter : null;
    if (enc) {
        // the longest label named wins ("Cellar Rat B" over a plain "Cellar Rat"); one that is out of the fight is no target
        const named = Object.values(enc.combatants).filter((c) => c.id !== 'pc' && c.label && wordRe(normText(c.label)).test(t));
        const top = named.filter((c) => c.label.length === Math.max(...named.map((x) => x.label.length)));
        const fighting = top.filter((c) => c.side === 'hostile' && !c.current.defeated && !c.current.escaped && !c.current.surrendered);
        if (fighting.length === 1) return { id: fighting[0].id, how: 'label' };
        if (fighting.length > 1) return { ambiguous: fighting.map((c) => c.id) };
        if (top.length) return { none: true, ref: top[0].label };
    }
    const present = state.scene.present.filter((id) => id !== 'pc' && state.entities[id] && state.entities[id].status !== 'dead');
    const valid = enc ? present.filter((id) => enc.combatants[id]?.side === 'hostile' && !enc.combatants[id].current.defeated && !enc.combatants[id].current.escaped && !enc.combatants[id].current.surrendered) : present;
    if (!enc && state.meta?.runtime === 'v4') {
        const byHandle = valid.filter((id) => wordRe(normText(sceneHandle(state, content, id))).test(t));
        if (byHandle.length === 1) return { id: byHandle[0], how: 'scene handle' };
        if (byHandle.length > 1) return { ambiguous: byHandle };
    }
    // named targets; the most specific match wins ("the grey wolf" beats another plain "wolf"). In a fight the
    // opponents first; someone standing by only when no opponent is named
    const namedAmong = (ids) => {
        let hits = [];
        let best = 0;
        for (const id of ids) {
            const e = state.entities[id];
            const words = [e.name, ...(e.descriptors || [])].filter(Boolean).map(normText);
            const anchor = content.anchors.get(e.anchor || e.profile?.anchor);
            if (anchor) words.push(...anchor.aliases);
            const len = Math.max(0, ...words.filter((w) => w && wordRe(w).test(t)).map((w) => w.length));
            if (!len) continue;
            if (len > best) { best = len; hits = [id]; } else if (len === best) hits.push(id);
        }
        return hits;
    };
    let hits = namedAmong(valid);
    if (enc && !hits.length) hits = namedAmong(present.filter((id) => !valid.includes(id)));
    // "the creature", "the beast": the creatures among the targets (live run 27.09. 02:30: "a Basic Attack at the
    // creature" asked "Bren or Blue Ox barkeep or Cellar Gnawer", two people and the one creature in the cellar)
    if (!hits.length && CREATURE_RE.test(t)) hits = valid.filter((id) => state.entities[id].kind === 'creature');
    // Runtime V4: "it" is a creature, never one of the people standing by (live 30.09.2026 14:56: "Heavy Slash at it"
    // asked "Oss or the bait woman or Bog Strider D")
    if (!hits.length && state.meta?.runtime === 'v4' && /\bit\b/.test(t)) hits = valid.filter((id) => state.entities[id].kind === 'creature');
    if (hits.length === 1) return { id: hits[0], how: 'named' };
    // "the nearest one": the player chooses by distance, so the closest Range Band decides among the targets he named
    // ("the nearest wolf") or, in a fight, among the hostiles; equally close targets remain his choice (Core #23).
    // Outside a fight "the nearest one" could be anyone present, so it stays his choice as well.
    const pool = hits.length > 1 ? hits : enc ? valid : [];
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
export function parseIntent(text, state, content, { masked = null } = {}) {
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
    const v4 = state.meta?.runtime === 'v4';
    const decl = declarative(v4 ? deedsOf(masked ?? maskNames(raw, state)) : raw);
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
    if (!state.encounter && state.meta?.runtime === 'v4' && ENGAGE_RE.test(d) && !attackWords && !offensive) {
        const targets = state.scene.present.filter((id) => id !== 'pc' && state.entities[id]?.status !== 'dead'
            && ['attack', 'flee', 'surrender', 'parley', 'hold', 'take_cover'].includes(state.pending_intents?.[id]));
        if (targets.length) return { kind: 'engage', targets };
    }
    if (nonOffensive) {
        const target = resolveTarget(raw, state, content, {});
        return { kind: 'skill', skill: nonOffensive.id, dir: move || 'away', target: target.id || null };
    }
    if (state.encounter && move) {
        const target = resolveTarget(raw, state, content, { hostileOnly: true });
        return { kind: 'move', dir: move, target: target.id || null };
    }
    if (v4 ? STEALTH_ACT_RE.test(d) : STEALTH_RE.test(d)) return { kind: 'stealth' };
    return { kind: 'narrative', flags: { aim: AIM_RE.test(d) } };
}


// ------------------------------------------------------------------------------------------ player authorization
// What the player's own message licenses Alaric to do (PLAYER OWNERSHIP). The narrator's fact report may only record
// voluntary PC changes (travel, payments, hand-overs, accepting a quest, hiding, long time skips) that the current
// message authorizes. Speech counts ("Deal, I'll take the job"), questions do not ("Should I pay him?").
const AUTH_RE = {
    travel: /\b(?:go|goes|going|went|walk|walks|walking|head|heads|heading|travel|travels|travelling|traveling|ride|rides|riding|return|returns|returning|journey|leave|leaves|leaving|enter|enters|entering|follow|follows|following|set (?:off|out)|march|sail|run|runs|continue|continues|move on|take the (?:\w+ )?(?:road|path|trail|ferry|ship|coach)|make (?:my|our) way)\b/i,
    move: /\b(?:go|walk|head|travel|ride|return|journey|leave|enter|follow|track|tracks|tracking|approach|approaches|climb|climbs|cross|crosses|step|steps|search|explore|sneak|creep|crawl|run|move|moves|continue|wander|wanders|circle|descend|ascend|jump|swim|push through|make (?:my|our) way|take the (?:road|path|trail|stairs))\w*\b/i,
    pay: /\b(?:pay|pays|paid|paying|buy|buys|bought|buying|purchase|rent|rents|tip|tips|bribe|bribes|hire|hires|spend|spends|donate|settle the bill|trade|trades|sell|sells|sold|here(?:'s| is|,) (?:\w+ ){0,2}(?:coins?|money|silver|copper|gold|payment)|(?:coins?|copper|silver|gold|crowns?) (?:for|to cover) (?:the|your|my|a) \w+|(?:give|gives|gave|giving|hand|hands|handed|slide|slides|put|puts|place|places|toss|tosses|count out|counts out) (?:\w+ ){0,3}(?:coins?|copper|silver|gold|crowns?|money))\b/i,
    // "turn in the signature slip" (live run 24.09. 23:23: the Guild never got its delivery slip)
    give: /\b(?:give|gives|gave|giving|hand|hands|handed|offer|offers|lend|lends|trade|trades|sell|sells|sold|drop|drops|toss|tosses|throw|throws|deliver|delivers|return (?:the|his|her|their|it)|leave (?:the|my) \w+|take (?:it|this|these|them)|turn(?:s|ed|ing)? (?:(?:it|them|(?:the|my|this|that) [\w-]+(?: [\w-]+)?) )?in(?!\s+for\b)|submit(?:s|ted|ting)?)\b/i,
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
export const titleWords = (title) => [...new Set(normText(title).split(' ').filter((w) => w && !TITLE_FILLER.has(w)).map(stem))];

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

// turning a quest in: "I turn in the Wolf Problem quest", "I hand in Wolf Problem", "turn the Quest in", "report the
// completed Wolf Problem" (not "turn around in the doorway", "turned in for the night"). A Guild contract is completed only
// when the player turns it in (live run 27.09. 04:11); "I return to Alderwatch" or "I killed the wolves" turns nothing in.
const TURN_IN_RE = /\b(?:turn|hand)(?:s|ed|ing)?\s+in\b(?!\s+for\b)|\b(?:turn|hand)(?:s|ed|ing)?\s+(?:[\w'’-]+\s+){1,6}?in\b(?!\s+(?:the|a|an|this|that|his|her|my|their|its|for)\b)|\bsubmit(?:s|ted|ting)?\b|\breport(?:s|ed|ing)?\b/i;
// a quest named by what it is, not by its title: "turn the Quest in", "hand in the job", "turn it in"
const QUEST_NOUN_RE = /\b(?:quests?|contracts?|jobs?|bount(?:y|ies)|tasks?|bills?)\b|\b(?:turn|hand)(?:s|ed|ing)?\s+(?:it|them)\s+in\b/i;

/** Whether the message turns this quest in by name ("I hand in Wolf Problem." with its full stop). */
export function turnsInQuest(text, title) {
    const t = said(text);
    return TURN_IN_RE.test(t) && namesQuest(t.replace(/[^\p{L}\p{N}']+/gu, ' '), title);
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
    // turning in a quest it does not name ("I go back to the guild to turn the Quest in"): any quest the reply completes
    out.turnIn = TURN_IN_RE.test(said_) && QUEST_NOUN_RE.test(said_);
    return out;
}
