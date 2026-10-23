// Prototype C (docs/PROTOTYPE_C.md; the working hypothesis is docs/ARCHITECTURE_C.md Rev. 3, frozen at 717e2f7 on the
// branch chatgpt/narrator-gm-tools-2026-10-02): the semantic planner
// of a V4 campaign. Behind the setting `planner` (off by default) it replaces the regex reading of free text
// (src/intent.js parseIntent: fights, attacks, stealth) and the story interpreter (src/v4/interpret.js) with ONE LLM
// call that writes down what Alaric means. A small validator checks structure and state and never replaces a value;
// the mapping hands the result to the engine's existing inputs, so engine, dice, events, state and swipes stay A's:
//
//   fight, skill use, world use, stealth  -> a parsed intent for playerTurn (src/engine.js), as parseIntent wrote it
//   story commands (go, pay, search …)    -> typed commands for playerTurnV4 (src/v4/turn.js), as the interpreter wrote them
//   a question back to the player         -> a System panel; nothing is spent or rolled
//
// The answer has the interpreter's format ({"commands": [...]}) so its vocabulary, rules, examples and schema are
// reused unchanged; the planner adds eight types: use_skill, ability_world, move, flee, stealth, attempt, other, clarify.
// Pure module: the host makes the call (src/v4/runtime.js), the same state and answer give the same result.
import { normText } from '../util.js';
import { spendsStatPoints, assignHint } from '../commands.js';
import { mentionedSkills } from '../intent.js';
import { activeHostiles } from '../combat.js';
import { sceneHandle, tacticalHere, areaCaught, approachedBy, burstAim } from './scene_handles.js';
import { itemEffectOf, rulesetOf, skillOf } from '../content.js';
import { actionsOf, weaponAttackOf, weaponAttackNamed } from '../derived.js';
import { restoreOf } from './items.js';
import { settlementOf, placeName } from './domain.js';
import { dungeonOf, roomKnown } from './dungeon.js';
import { extractJsonObject } from './json.js';
import { validate } from './schema.js';
import { interpreterSystem, vocabularyText, catalogText, interpreterSchema, PLAIN_FORMAT, repairMessage, amountErrors } from './interpret.js';
import { anchorQuote } from './agency.js';
import { openGoals } from './growth.js';
import { composerFunctions } from '../skill_composer.js';
import { disciplineTags, skillAspects } from '../skills.js';

export const PLANNER_VERSION = 'plan-c0.1';

export const MECH_TYPES = ['use_skill', 'ability_world', 'move', 'flee', 'stealth', 'attempt', 'other', 'clarify'];

// --------------------------------------------------------------------------------------------- prompt
// Role, rules and examples are the ones P0/S4b measured (tools/p0/lib/s4b.mjs, arm p1), adapted to the frozen schema:
// one use_skill instead of attack/skill, "skill": null for an attack without a named skill, target_words for a world
// use, the meaning (flee, search, go, wait) instead of the fight's mechanics.
export const PLANNER_ROLE = 'You are the intent planner of the Avereth engine. You read one PLAYER MESSAGE and write down the engine actions Alaric himself takes in it. The engine resolves them: it decides every outcome, roll, number and cost, and whether something works at all. You never decide or describe an outcome.';

export const MECH_RULES = [
    'Actions with skills, in fights and on things (commands of the same list; the engine decides what is possible now and every outcome):',
    '1. Only Alaric\'s own deeds in this message. Not an action: a question ("Can I …?"), a wish, a thought, a plan or a condition for later ("if it moves, I\'ll …", "next time …"), a memory, words he speaks (threats too), anything another character does. Such a message gets an empty list.',
    '2. A thing he holds (OBJECTS held by Alaric: a tool, food, a potion) that he uses is the story command use with its id, never a skill: "I use the flint and steel to make a light" → use. Skills: use only the ids under KNOWN SKILLS. Players misspell and paraphrase skills: if exactly one known skill fits what he names or describes, use that skill. If he names a skill Alaric does not know, write {"new": "<the name he used>"}; never put a different skill in its place.',
    '3. An attack that names no skill and hints at none ("I strike the rat", "I hit it", "I shoot at it"): "skill": null; the engine uses his Basic Attack. Use the Basic Attack id only when he says "basic attack".',
    '4. Targets: opponents and people by their id. Resolve labels and parts of labels ("B" for "Cave Rat B"), descriptions against the catalog (wounded, ENGAGED = right in front of him, the farthest, a size or kind), pronouns, ENGINE FACTS and RECENT. A target who is not here: {"new": "<description>"}. An area skill needs no target (null). When he names no target at all, null.',
    '5. A known skill used on a thing instead of a creature or person is ability_world: target = an OBJECTS or FEATURES id or {"new": "<the thing>"}; target_words = his exact words for the thing the skill acts on (not the thing he wants to affect in the end); goal = what he wants to happen, in a few of his words. Do not judge whether it can work.',
    '6. Ask instead of guessing: if, after the catalog, ENGINE FACTS and RECENT, two or more readings remain that would play out differently (another target, another skill, another kind of action), answer with one clarify about that point and nothing else. If exactly one reading fits, act and do not ask.',
    '7. Write what he means: in a fight, getting away from it is flee; outside a fight, getting away to another place (back the way he came, through a way he knows, to a room or place) is go, also when he calls it fleeing, backing away or withdrawing (7a and 7c say where "back" leads), and flee only when he names no place to go; stepping back or closing in during a fight is move (chasing one who runs: move "closer" with its target); looking for someone or something is activity with kind "search"; going somewhere is go; waiting is activity with kind "wait". Write every action he intends, even if it may be impossible now: the engine decides what is possible.',
    '7a. Return words such as "back", "return", "the city", "where I came from" are semantic references, not names for new places. Use RECENT ROUTE and known PLACES to resolve them to an existing destination when one clearly fits; if more than one route destination genuinely fits, clarify instead of inventing a generic new place.',
    '7b. go.to is the destination, never the way there. A route, path or way he names ("through the forests", "along the river", "not past the waystation", "by the coast road") is how he travels: to is the destination\'s known id (or {"new": "<the destination>"} when it is not known), and the route stays in his words for the story. A route is never a place of its own.',
    '7c. In a dungeon (EXITS listed): going through a way is go with the id of the room it leads to, also when he names the door, stair or passage ("I take the stair down"); "back" or "the previous room" is the room he came from (RECENT ROUTE); a known room further on is go with its id (the engine checks the way). Going on into a part nobody has shown yet is go {"new": "<his words>"}. Opening or forcing what blocks a way is attempt on its FEATURES id; looking for another way is activity search.',
    '8. Several actions in one message: one command each, in his order. Something he does that no command fits: other.',
    '9. quote: the exact words of the message the command rests on, copied as they are (do not correct the spelling).',
    '10. An obstacle or danger listed in FEATURES that he deals with himself is attempt: feature = its id; aim "examine" (he looks it over, tests or studies it), "pass" (gets past, across, over, through or around it) or "disable" (disarms, opens, breaks, removes or makes it harmless); approach = his words for how; stat = what his way takes: AGI (balance, jump, dodge, slip past), STR (climb, lift, force, hold on), VIT (endure), PER (spot the safe way), INT (work out a mechanism), WIL (steel himself), or null; tool = the OBJECTS id of a thing he holds and uses for it, or null; possible = false only when his way plainly cannot work on it as the catalog describes it, else null. Looking for something hidden is activity search, never attempt.',
].join('\n');

export const MECH_COMMANDS = [
    '- use_skill {skill, target}: a skill, or a plain attack, against a creature or person, or a skill on himself. skill: an id from KNOWN SKILLS | {"new": "<his name for it>"} | null; target: an id from OPPONENTS or PRESENT | {"new": "<description>"} | null (null also for a skill on himself)',
    '- ability_world {skill, target, target_words, goal}: a skill used on a thing. skill as above; target: an id from OBJECTS | {"new": "<the thing>"}',
    '- move {dir, target}: dir "closer" | "away"; target: an id | null',
    '- flee {}: he tries to get away',
    '- stealth {}: he hides or sneaks',
    '- attempt {feature, aim, approach, stat, tool, possible}: he deals with an obstacle or danger of FEATURES (rule 10)',
    '- other {what}: an action of his that no command fits; what: a few of his words',
    '- clarify {about, question, options}: instead of acting; about "target" | "skill" | "action"; question: one short question to the player; options: ids or short texts',
].join('\n');

// written for the rules with a catalog of their own; no example is a message of the S4b corpus or the test corpora
export const MECH_EXAMPLES = [
    'Examples (another place, not the current scene). Example catalog: KNOWN SKILLS mage.frost_dart (Frost Dart: attack · single target), mage.basic_attack (Basic Attack: attack · single target), mage.ember_ring (Ember Ring: attack · area: everyone ENGAGED with Alaric, friend or foe) · OPPONENTS mon.x1 Cave Rat A (unhurt · ENGAGED), mon.x2 Cave Rat B (wounded · SHORT) · PLACES loc.mill (the old mill) · ENGINE FACTS: Cave Rat B bit Alaric (last round)',
    '- "Frostdart rat B!" → {"commands":[{"seq":1,"type":"use_skill","skill":"mage.frost_dart","target":"mon.x2","quote":"Frostdart rat B!"}]}',
    '- "I shatter the icicles with a Frost Dart so they bury the tunnel" → {"commands":[{"seq":1,"type":"ability_world","skill":"mage.frost_dart","target":{"new":"the icicles over the tunnel"},"target_words":"the icicles","goal":"bury the tunnel","quote":"I shatter the icicles with a Frost Dart so they bury the tunnel"}]}',
    '- "I call down Lightning on Rat A" → {"commands":[{"seq":1,"type":"use_skill","skill":{"new":"Lightning"},"target":"mon.x1","quote":"I call down Lightning on Rat A"}]}',
    '- "I go for the rat" → {"commands":[{"seq":1,"type":"clarify","about":"target","question":"Which one, Cave Rat A or Cave Rat B?","options":["mon.x1","mon.x2"]}]}',
    '- "Frost Dart the biter" → {"commands":[{"seq":1,"type":"use_skill","skill":"mage.frost_dart","target":"mon.x2","quote":"Frost Dart the biter"}]}',
    '- "I kick the one in front of me" → {"commands":[{"seq":1,"type":"use_skill","skill":null,"target":"mon.x1","quote":"I kick the one in front of me"}]}',
    '- "I back off a step and Frost Dart Rat A" → {"commands":[{"seq":1,"type":"move","dir":"away","target":null,"quote":"I back off a step"},{"seq":2,"type":"use_skill","skill":"mage.frost_dart","target":"mon.x1","quote":"Frost Dart Rat A"}]}',
    '- "I step right in among them and then Ember Ring" → {"commands":[{"seq":1,"type":"move","dir":"closer","target":null,"quote":"I step right in among them"},{"seq":2,"type":"use_skill","skill":"mage.ember_ring","target":null,"quote":"Ember Ring"}]}',
    '- "I bolt for the exit" → {"commands":[{"seq":1,"type":"flee","quote":"I bolt for the exit"}]}',
    '- (no fight) "I back away from the sleeping bear and slip back out to the old mill" → {"commands":[{"seq":1,"type":"go","to":"loc.mill","quote":"I back away from the sleeping bear and slip back out to the old mill"}]}',
    '- "Would Frost Dart even hurt them?" → {"commands":[]}',
    '- "\\"Back off or I\'ll freeze you,\\" I snarl." → {"commands":[]}',
    '- (no fight) "I search the nest for coins" → {"commands":[{"seq":1,"type":"activity","kind":"search","what":"coins in the nest","minutes":null,"until":null,"quote":"I search the nest for coins"}]}',
    '- (no fight) "I walk back to the old mill" → {"commands":[{"seq":1,"type":"go","to":"loc.mill","quote":"I walk back to the old mill"}]}',
].join('\n');

// Guild contracts and their slips (live run 03.10.2026: "ill decline the quest myself" was booked as quest.abandon at the
// wagon yard; "turn the slip back in" became quest.turn_in with the slip's object id, invalid twice, the turn failed)
export const CONTRACT_RULES = [
    'Guild contracts (these come before the rules above):',
    '- A contract (quest.<id> under QUESTS) and its contract slip (obj.slip.<id> under OBJECTS) are different things. A quest argument is always the quest id, never the slip\'s object id.',
    '- quest.turn_in is handing in a contract at a Guild hall (his words to the Guild or the desk), for its payout. Taking leave of the contract\'s client or recipient ("that\'s my part done then", "glad it arrived") is no turn_in: it is words. A turn_in he names on the way back ("I head back to the Guild to turn it in") is go plus quest.turn_in.',
    '- quest.turn_in is handing in a contract he has DONE at a Guild hall, for its payout. Handing back the slip of a contract he has not done, because he gives the job up or turned it down, is quest.abandon with the contract\'s quest id, never quest.turn_in.',
    '- quest.abandon only when he gives the contract up in this message: "I abandon the quest", "I give up this contract", "I cancel this job", handing its slip back at the desk. Saying he will do it later is no command: "I\'ll decline the quest myself", "I\'ll go cancel it at the Guild", "I\'ll hand the contract back", "I\'ll return the slip" are words, not the act.',
    '- The slip of a contract that is no longer active (given up or done), handed to someone: give {object: the slip, to: who takes it}; never a quest command.',
    'Examples (another town): CATALOG: PLACES: loc.kf.guild_hall (Guild office, Kestrel Ford) · QUESTS: quest.ferry_job (Ferry Job · Guild contract · active) · OBJECTS: obj.slip.ferry_job (Guild contract slip: Ferry Job, held by Alaric)',
    '- "*i shrug* I\'ll cancel that job at the Guild myself." → {"commands":[]}',
    '- "*i walk back to the guild office and hand the slip back*" → {"commands":[{"seq":1,"type":"go","to":"loc.kf.guild_hall","quote":"i walk back to the guild office"},{"seq":2,"type":"quest.abandon","quest":"quest.ferry_job","quote":"hand the slip back"}]}',
    '- "I give up the ferry job." → {"commands":[{"seq":1,"type":"quest.abandon","quest":"quest.ferry_job","quote":"I give up the ferry job."}]}',
].join('\n');

// 4.3.0-c.6.6.2: a hand-over in gesture (live 10.10.2026: the keeper asked for the requisition, he drew a slip out with
// "you mean this?", no give was booked and the story had her take it). Only the thing she asked for, never a
// substitute: what he names is what changes hands; the agency guard still drops "but I keep it" and her snatching it
export const HANDOVER_RULES = [
    'Handing over (story commands):',
    '- When RECENT shows someone asking Alaric for a particular thing and he now holds out, offers or produces exactly that thing for them, that is give {object, to}, even without the word "give": the hand-over is what he does. The object is the one he names, by its OBJECTS id; never another object in its place.',
    '- No give when he only shows, looks at or examines it, keeps it ("but I don\'t hand it over"), only asks whether they need it, or produces a different thing than the one asked for (then the story lets them answer).',
    '- Saying why he came ("I\'m here to deliver this crate", "I have your delivery") is words, no give: the thing changes hands when he hands it over, holds it out or sets it down for them, or when they reach for it and he lets them.',
    '- He goes to someone in order to hand them a thing himself, now ("I go to Sister Maren and hand her the basket", "I\'ll follow you up to hand it over myself"): go, then give {object, to} with "needs" the go; to is their id, or {"new": "<who>"} when they are not in the catalog. Going somewhere only to ask whether they want it, carrying it along, or handing it over another day is no give.',
    'Examples (another town): RECENT: …"I need the ferry permit before I can let you aboard," the ferryman says, holding out his hand. · OBJECTS: obj.t3.ferry_permit (ferry permit, held by Alaric), obj.slip.ferry_job (Guild contract slip: Ferry Job, held by Alaric) · PRESENT: npc.ferryman',
    '- "you mean this? *i hold out the ferry permit*" → {"commands":[{"seq":1,"type":"give","object":"obj.t3.ferry_permit","to":"npc.ferryman","quote":"i hold out the ferry permit"}]}',
    '- "*i show him the permit but keep hold of it*" → {"commands":[]}',
    '- "*i pull out the contract slip* this one?" → {"commands":[]}',
    '- (RECENT: the ferryman offers to carry the permit up to the harbourmaster) "I\'ll walk up with you and give it to her myself" → {"commands":[{"seq":1,"type":"go","to":{"new":"the harbourmaster"},"quote":"I\'ll walk up with you"},{"seq":2,"type":"give","object":"obj.t3.ferry_permit","to":{"new":"the harbourmaster"},"needs":1,"quote":"give it to her myself"}]}',
    '- "Tomorrow I\'ll take the permit to the harbourmaster." → {"commands":[]}',
    // 4.3.0-c.6.6.5 (live 15.10.2026): "*i take out every monster part i carry with me*" for the furrier who said "put it
    // on the counter" became four gives; the parts were hers before any price was named
    '- Taking things out, laying them out, putting them on a counter or table, or showing them for someone to look at, weigh, appraise or price is no give, even when that person asked to see them or to have them on the counter: they stay his until he sells, trades or gives them.',
    '- Selling (story commands): when a BID in the catalog covers what he agrees to sell ("deal", "I accept and sell them to her"), that is offer.accept with the bid\'s id. Something no bid covers is sell {object, to, qty, min_cp}. Selling his own things is never buy, and never offer.accept of an OFFER.',
    'Examples (another town): RECENT: …"Put it on the counter, let\'s see what you have," the furrier says. · OBJECTS: obj.loot.wolf.pelt.f (F-Rank Grey Wolf Pelt, 3, held by Alaric), obj.loot.wolf.fang.f (F-Rank Grey Wolf Fang, 2, held by Alaric) · PRESENT: npc.furrier',
    '- "*i take out my pelts and fangs and lay them on the counter*" → {"commands":[]}',
    '- "*i give her one fang as a gift*" → {"commands":[{"seq":1,"type":"give","object":"obj.loot.wolf.fang.f","qty":1,"to":"npc.furrier","quote":"i give her one fang as a gift"}]}',
    '- (CATALOG: BIDS: offer.t9.2 (furrier pays 40 cp for: l1 obj.loot.wolf.pelt.f ×3, l2 obj.loot.wolf.fang.f ×2)) "*i nod* deal, they\'re yours" → {"commands":[{"seq":1,"type":"offer.accept","offer":"offer.t9.2","lines":null,"qty":null,"quote":"deal, they\'re yours"}]}',
].join('\n');

// Steps that build on each other (live run 04.10.2026: "go back to the guild and take the Cull the Bog Striders quest
// and register it ad make my way over to the eel weirs": the contract could not be taken and he set off for its site
// anyway). The engine does not take a step whose "needs" did not happen (src/v4/commands.js resolveCommands)
export const ORDER_RULES = [
    'Steps that build on each other (story commands):',
    '- A step that only makes sense once an earlier step of the same message has happened carries "needs": <that step\'s seq>. He takes a contract and then sets off to do it: the go needs the quest.accept. He pays the ferryman and then crosses: the go needs the pay. If that step does not happen, the engine does not take this one either.',
    '- A step that stands on its own carries no "needs": "I drop the broken cup and walk home" — the walk happens whether or not the drop does.',
    'Example (another town): CATALOG: PLACES: loc.kf.guild_hall (Guild office, Kestrel Ford) · KNOWN CONTRACTS: quest.ferry_job (Ferry Job · Guild contract · Novice · 40 cp · on the board of Guild office, Kestrel Ford)',
    '- "*i head to the guild office, take the ferry job and go down to the ferry*" → {"commands":[{"seq":1,"type":"go","to":"loc.kf.guild_hall","quote":"i head to the guild office"},{"seq":2,"type":"quest.accept","quest":"quest.ferry_job","quote":"take the ferry job"},{"seq":3,"type":"go","to":{"new":"the ferry"},"needs":2,"quote":"go down to the ferry"}]}',
].join('\n');

// A contract given up only in words for later: "ill decline the quest myself", "I'll go cancel it at the Guild", "I'm
// going to hand the contract back". The deterministic second line behind CONTRACT_RULES (A's agency guard needs a time
// anchor such as "tomorrow" for a plan); it only removes the command, the removal is in the record (plan.dropped).
const ANNOUNCED_ABANDON = /(?:^|[^a-z'])(?:i'll|ill|i will|i shall|i'm going to|im going to|i am going to|gonna)\s+(?:(?:go|just|then|simply|also|probably|rather|myself|have to|need to)\s+){0,2}(?:decline|cancel|abandon|give (?:it |this |that |the \w+ )?up|quit|drop|hand|return|turn|bring)\b/;

// 4.3.0-c.6.6.4: "im with the guild and here to deliver this crate" says why he came; the crate changes hands when he
// hands it over (live 15.10.2026: give booked while the warden still read the slip). A message that hands anything over
// in words or gesture keeps its give
const PURPOSE_ONLY = /\b(?:here|came|come|coming)\s+(?:\w+\s+){0,2}to\s+(?:deliver|bring|drop off|hand (?:over|in|off)|give)\b/;
const HANDING = /\b(?:hand(?:s|ed|ing)?|giv(?:e|es|ing)|pass(?:es|ing)?|offer(?:s|ing)?|hold(?:s|ing)? out|holds? it out|set(?:s|ting)? (?:it|the \w+) (?:down|on)|put(?:s|ting)? (?:it|the \w+) (?:down|on|in)|here(?:'s| is| you go)|take it|this is for you)\b(?!\s+(?:to deliver|deliver))/;
// 4.3.0-c.6.6.5: showing, taking out and laying out (for a look, an appraisal, a price) is no hand-over (live 15.10.2026:
// "*i take out every monster part i carry with me*" in a monster-parts shop booked four gives). Showing is never a give;
// laying things out is none for a trader, whose counter is not her hands. A message that gives, sells or trades in words
// keeps its give
const SHOWING = /\b(?:show(?:s|ed|ing)?|display\w*|let (?:her|him|them) (?:see|look|inspect|examine|have a look)|(?:for|to) (?:her |his |their |an? )?(?:appraisal|inspection|look|valuation)|apprais\w*|(?:for (?:her|him|them) |so (?:she|he|they) can )?(?:to )?(?:look (?:at|over)|inspect|examine|value|price|check) (?:it|them|the \w+|my \w+|what i)\b)/;
const LAYING_OUT = /\b(?:(?:take|takes|took|taking|pull|pulls|pulled|pulling|get|gets|got|getting|bring|brings|brought|lay|lays|laid|laying|spread|spreads|spreading|empty|empties|emptied|tip|tips|tipped)\s+(?:\w+\s+){0,5}?(?:out|forth)|unpack\w*|(?:lay|lays|laid|laying|put|puts|putting|set|sets|setting|place|places|placed|placing|spread|spreads)\s+(?:\w+\s+){0,6}?(?:on|onto|across|over)\s+(?:the|her|his|their|a)\s+(?:counter|table|bench|planks|board|cloth|stall))\b/;
const PARTING = /\b(?:giv(?:e|es|ing)|gave|given|gift\w*|sell\w*|sold|trade\w*|swap\w*|(?:let|lets) (?:her|him|them) (?:have|keep)|keep (?:it|them|the)|(?:it'?s|they'?re|that'?s|this is|these are) (?:yours|for (?:you|her|him|them))|deal\b)/;
const HANDS = /\b(?:hand(?:s|ed|ing)?|pass(?:es|ed|ing)?|hold(?:s|ing)? (?:\w+ )?out|held (?:\w+ )?out)\b/;
const TRADER = /\b(?:shop\w*|store\w*|merchant|trader|dealer|buyer|vendor|monger|broker|chandler|furrier|tanner|smith|apothecar\w*|alchemist|herbalist|pawn\w*|fence|outfitter|stall\w*|exchange|peddler|pedlar|haberdasher|leatherworker|clothier|jeweller|jeweler|innkeeper|keeper)\b/;

/** Is this person someone who trades (their role or occupation), or is the place a shop? */
function traderHere(state, id) {
    if (!state) return false;
    const e = state.entities?.[id];
    const role = [e?.role, e?.occupation, e?.name, ...(e?.descriptors || []), ...Object.values(state.facts || {}).filter((f) => f.s === id && f.p === 'occupation').map((f) => f.o)].filter(Boolean).join(' ');
    const place = state.places?.[state.scene?.at]?.name || '';
    return TRADER.test(normText(role)) || TRADER.test(normText(place)) || Object.values(state.offers || {}).some((o) => o.status === 'open' && o.seller === id);
}

/** A thing he carries for an active contract (a delivery set down on the recipient's counter is handed over). */
const owed = (state, id) => typeof id === 'string' && (state?.objects?.[id]?.for_quests || []).some((q) => state.quests?.[q]?.status === 'active');

/**
 * The commands whose quote announces the act instead of doing it: quest.abandon for later, a give that only says why
 * he came, a give that only shows or lays out his things (4.3.0-c.6.6.5). {kept, dropped} as the agency guard's.
 * @param {object} [state] the state before the message (who the recipient is: a trader's counter is not a hand-over)
 */
export function announcedAbandon(message, commands, state = null) {
    const kept = [];
    const dropped = [];
    const all = flat(message ?? '');
    for (const c of commands || []) {
        const words = flat(c.quote ?? '');
        if (c.type === 'quest.abandon' && ANNOUNCED_ABANDON.test(words) && inMessage(message, c.quote ?? '')) dropped.push({ command: c, rule: 'plan' });
        else if (c.type === 'give' && PURPOSE_ONLY.test(words) && !HANDING.test(all.replace(PURPOSE_ONLY, ' '))) dropped.push({ command: c, rule: 'plan' });
        else if (c.type === 'give' && !PARTING.test(all) && (SHOWING.test(words) || (LAYING_OUT.test(words) && !HANDS.test(all) && !owed(state, c.object) && traderHere(state, c.to)))) dropped.push({ command: c, rule: 'shows' });
        else kept.push(c);
    }
    return { kept, dropped };
}

// Patch 9C-1: learning and training are activity train/study with a learning target; a wish to learn books nothing
export const LEARNING_RULES = [
    'Learning and training (story commands):',
    '- Only when he trains, studies or takes a lesson NOW is it activity train or study with learn: a KNOWN SKILLS id he practises, a LEARNING id he goes on with, or the kind of a new technique he is taught (strike, bolt, guard, ward, mend). teacher: the PRESENT person who teaches him in this message, else null. tags and aspects: only those his words or the lesson name, else null. minutes or until as he says them.',
    '- Asking to be taught, a wish ("I\'d like to learn …", "teach me someday"), a question about a technique, a price or a plan for later is no command: words, the story lets the other answer.',
    'Examples (another town): CATALOG: PRESENT: npc.tutor (Brannoc, sword tutor) · KNOWN SKILLS warrior.cleave (Cleave: attack · single target) · LEARNING learn.1 (guard (Defense) from Brannoc, 40/100 LP)',
    '- "*i spend the next two hours with Brannoc drilling the stance he shows me*" → {"commands":[{"seq":1,"type":"activity","kind":"train","what":"the stance Brannoc shows him","minutes":120,"until":null,"learn":"learn.1","teacher":"npc.tutor","tags":null,"aspects":null,"quote":"i spend the next two hours with Brannoc drilling the stance he shows me"}]}',
    '- "*i practise my cleave on the post for an hour*" → {"commands":[{"seq":1,"type":"activity","kind":"train","what":"Cleave on the post","minutes":60,"until":null,"learn":"warrior.cleave","teacher":null,"tags":null,"aspects":null,"quote":"i practise my cleave on the post for an hour"}]}',
    '- "Could you teach me a fire spell some day?" → {"commands":[]}',
].join('\n');

/**
 * The fight prompt shows only the story commands a fight can mean (activity: wait, search); the story prompt all of
 * them. Prototype C (4.3.0-c.6.2): no go in a fight, where it is never taken (mapPlan) — live: "i walk towards the next
 * beasts as i try to gather them all around me for one big action" became go + other, neither taken, the turn lost
 */
const FIGHT_STORY_TYPES = new Set(['activity']);

// Prototype C (4.3.0-c.6.2): a step within the fight is move by the Range Bands, leaving the fight is flee; the purpose
// of a step or an action is part of it, no other
export const FIGHT_RULES = [
    'In a fight (these come before the rules above):',
    '- Every step within the fight is move, by the Range Bands: toward opponents is "closer", back from them is "away". target: the one opponent he heads for, or null when he names none or several ("the next ones", "the others"). There is no go in a fight; getting away from the fight, out of it, is flee.',
    '- What he wants a step or an action to achieve ("to draw them around me", "so I can hit them all at once") belongs to that command and is no command of its own: no other for it.',
    '- (fight, the example catalog above) "I walk over to the rats so they crowd around me for one big blast" → {"commands":[{"seq":1,"type":"move","dir":"closer","target":null,"quote":"I walk over to the rats"}]}',
].join('\n');

/**
 * The system prompt. Story mode: the interpreter's prompt as P0/S1 measured it, followed by the planner's types.
 * Fight mode (a running fight or one committed to): the planner role, rules, types and examples, the fight's rules,
 * with activity.
 */
export function plannerSystem(vocab, { fight = false } = {}) {
    const mech = [MECH_RULES, '', 'Commands for that:', MECH_COMMANDS, '', MECH_EXAMPLES].join('\n');
    if (fight) {
        const story = vocabularyText({ commands: vocab.commands.filter((c) => FIGHT_STORY_TYPES.has(c.type)) });
        return [PLANNER_ROLE, '', mech, '', FIGHT_RULES, '', 'Story commands (the same list):', story, '', 'Answer with {"commands": [...]}; an empty list when the message contains no action of his.', '', PLAIN_FORMAT].join('\n');
    }
    return [interpreterSystem(vocab), '', CONTRACT_RULES, '', HANDOVER_RULES, '', ORDER_RULES, '', LEARNING_RULES, '', mech, '', PLAIN_FORMAT].join('\n');
}

function skillText(skill) {
    const area = (skill.effects || []).some((e) => e.kind === 'area');
    const bits = [skill.attack ? 'attack' : 'not an attack'];
    if (skill.attack) bits.push(area ? 'area: everyone ENGAGED with Alaric, friend or foe' : 'single target');
    if (skill.range?.band && skill.attack) bits.push(`reaches ${skill.range.band}`);
    if (!skill.attack) bits.push(...(skill.effects || []).map((e) => e.kind.replace(/_/g, ' ')));
    if (skill.cost?.amount) bits.push(`${skill.cost.amount} ${skill.cost.resource.toUpperCase()}`);
    if (skill.ammo) bits.push(`${skill.ammo.qty} arrow${skill.ammo.qty > 1 ? 's' : ''}`);
    return bits.join(' · ');
}

function hpWord(hp, max) {
    if (hp === null || hp === undefined || !max) return 'unhurt';
    if (hp >= max) return 'unhurt';
    return hp * 2 >= max ? 'wounded' : 'badly wounded';
}

const isFight = (state) => !!state.encounter || (state.pending_combat || []).length > 0;

/**
 * What the planner sees besides the interpreter's catalog: Alaric's skills, the opponents (in a running fight with
 * their fight labels, before it with their scene handles), the last round's engine facts.
 */
export function planContext(state, content, catalog) {
    const fight = isFight(state);
    const sheet = state.entities.pc?.sheet || {};
    // Patch 9A: his learned Skills and the plain attack of the weapon he holds (src/derived.js actionsOf)
    const known = Object.keys(actionsOf(sheet, content, rulesetOf(state), state));
    const skills = known.map((id) => skillOf(content, id, state)).map((sk) => ({ id: sk.id, name: sk.name, text: skillText(sk) }));
    let opponents = [];
    const enc = state.encounter;
    if (enc) {
        opponents = activeHostiles(enc).map((c) => ({ id: c.id, label: c.label || c.name, hp: hpWord(c.current.hp, c.fixed.max_hp), band: c.current.band, engaged: c.current.band === 'ENGAGED' }));
    } else if (fight) {
        const by = [...new Set((state.pending_combat || []).map((p) => p.by))].filter((id) => state.entities[id] && state.entities[id].status !== 'dead');
        opponents = by.map((id) => {
            const e = state.entities[id];
            const band = state.scene.positions?.[id]?.band || 'MEDIUM';
            return { id, label: sceneHandle(state, content, id), hp: hpWord(e.profile?.hp ?? e.sheet?.hp, e.profile?.max_hp), band, engaged: band === 'ENGAGED' };
        });
    }
    const facts = [];
    if (enc) {
        const label = (id) => (id === 'pc' ? 'Alaric' : enc.combatants[id]?.label || enc.combatants[id]?.name || sceneHandle(state, content, id));
        for (const r of (enc.log || []).slice(-6)) {
            const target = r.strikes?.[0]?.target || r.target;
            const hit = (r.strikes || []).some((x) => x.defeated) ? ' and defeated it' : '';
            if (r.kind === 'attack') facts.push(`${label(r.actor)} ${r.actor === 'pc' ? 'used' : 'attacked with'} ${r.skill_name || 'an attack'} on ${label(target)}${hit} (round ${r.round})`);
            else if (r.kind === 'move' || r.kind === 'flee') facts.push(`${label(r.actor)} ${r.kind === 'flee' ? 'fled' : `moved ${r.dir}`} (round ${r.round})`);
            else if (r.kind !== 'hold') facts.push(`${label(r.actor)}: ${r.kind} (round ${r.round})`);
        }
    }
    const basic = content.classes.get(sheet.class)?.basic_attack || null;
    const weapon = sheet.class ? weaponAttackOf(sheet, content, rulesetOf(state))?.skill.id || null : null;
    const route = [];
    for (const id of (state.scene?.history || []).slice(-12)) {
        const resolved = settlementOf(state, id) || id;
        const p = state.places?.[resolved];
        if (!p || route.at(-1)?.id === resolved) continue;
        route.push({ id: resolved, name: p.name, kind: p.kind });
    }
    // Patch 9C-1: his open learning goals and what a learning activity may name (src/v4/growth.js)
    const learning = rulesetOf(state) >= 2 ? openGoals(state).map((g) => ({ id: g.id, text: `${g.target.aspects?.length ? `${g.target.aspects.join('/')} ` : ''}${g.target.fn} (${g.target.tags.join(', ')}) from ${g.source.name}, ${g.lp}/${g.need} LP` })) : [];
    const techniques = rulesetOf(state) >= 2 ? composerFunctions(content) : [];
    return { fight, skills, known, basic, weapon, opponents, facts, route: route.slice(-12), catalog, cls: sheet.class || null, learning, techniques, disciplines: disciplineTags(content), aspects: skillAspects(content) };
}

/** The user message: the interpreter's CATALOG, then skills, opponents, engine facts, RECENT and the message. */
export function plannerUser(ctx, text, { recent = '' } = {}) {
    const L = [catalogText(ctx.catalog)];
    L.push('KNOWN SKILLS (the only skill ids):');
    for (const s of ctx.skills) L.push(`- ${s.id}: ${s.name} — ${s.text}`);
    if (!ctx.skills.length) L.push('- none');
    if (ctx.learning?.length) L.push('LEARNING (his open learning goals; the only learning ids):', ...ctx.learning.map((g) => `- ${g.id}: ${g.text}`));
    if (ctx.fight) {
        L.push(ctx.opponents.length ? 'OPPONENTS (in the fight):' : 'OPPONENTS: none');
        for (const o of ctx.opponents) L.push(`- ${o.id}: ${o.label} — ${o.hp} · ${o.band}`);
    }
    if (ctx.facts.length) L.push('ENGINE FACTS (the last rounds):', ...ctx.facts.map((f) => `- ${f}`));
    if (ctx.route?.length) L.push('RECENT ROUTE (older → newer; use these ids/names for "back", "return", "the city" and similar references):', ...ctx.route.map((p) => `- ${p.id}: ${p.name} (${p.kind})`));
    if (recent) L.push('RECENT (the end of the last narration; the catalog, RECENT ROUTE and ENGINE FACTS win where they differ):', recent);
    L.push('', 'PLAYER MESSAGE:', String(text ?? ''));
    return L.join('\n');
}

/** The end of the last narrator reply, at most `max` characters, starting at a word. */
export function recentText(reply, max = 600) {
    const t = String(reply ?? '').replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, ' ').replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    const cut = t.slice(-max);
    return `…${cut.slice(cut.indexOf(' ') + 1)}`;
}

/** The messages of a planner call (and of its one repair). */
export function plannerRequest(vocab, ctx, text, { recent = '', previous = null, errors = null } = {}) {
    const system = plannerSystem(vocab, { fight: ctx.fight });
    const user = plannerUser(ctx, text, { recent });
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    if (previous !== null && errors) messages.push({ role: 'assistant', content: String(previous) }, { role: 'user', content: repairMessage(errors) });
    return { system, user, messages };
}

// --------------------------------------------------------------------------------------------- validator
// Structure and state only. Every check accepts, rejects (the one repair call gets the error lines) or, after the
// agency guard, drops a command it cannot stand on; none of them changes a value.
const flat = (t) => normText(String(t ?? '').replace(/\*/g, ' ')).replace(/\s+/g, ' ').trim();
const isNew = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v.new === 'string' && v.new.trim() !== '';

/** The quote is in the message word for word, or anchored as the agency guard anchors it. */
export function inMessage(message, quote) {
    const q = flat(quote).replace(/[.!?,;:"]+$/g, '').trim();
    if (!q) return false;
    return flat(message).includes(q) || !!anchorQuote(message, quote);
}

const FIELDS = {
    use_skill: ['skill', 'target', 'quote'],
    ability_world: ['skill', 'target', 'target_words', 'goal', 'quote'],
    move: ['dir', 'target', 'quote'],
    flee: ['quote'],
    stealth: ['quote'],
    attempt: ['feature', 'aim', 'approach', 'stat', 'tool', 'possible', 'quote'],
    other: ['what', 'quote'],
    clarify: ['about', 'question', 'options'],
};
const NULLABLE = { use_skill: ['skill', 'target'], ability_world: ['skill', 'goal'], move: ['target'], attempt: ['approach', 'stat', 'tool', 'possible'] };

/**
 * Patch 9C-1: the learning arguments of an activity: only for train or study; learn a known Skill, a learning goal or a
 * technique; tags and aspects of the rules' lists. Error lines for the repair, nothing replaced.
 */
function learningErrors(c, ctx, at) {
    const e = [];
    const set = ['learn', 'teacher', 'tags', 'aspects'].filter((k) => c[k] !== null && c[k] !== undefined);
    // a legacy campaign learns nothing this way: the engine takes such an activity as an ordinary one
    if (!set.length || !(ctx.techniques || []).length) return e;
    if (!['train', 'study'].includes(c.kind)) return [`${at}: learn, teacher, tags and aspects belong only to kind train or study (null otherwise)`];
    const known = new Set([...(ctx.known || []), ...(ctx.learning || []).map((g) => g.id), ...(ctx.techniques || [])]);
    if (c.learn !== null && !known.has(c.learn)) e.push(`${at}: learn must be an id from KNOWN SKILLS, an id from LEARNING, one of ${ctx.techniques.join(', ')}, or null`);
    if (Array.isArray(c.tags) && c.tags.some((t) => !(ctx.disciplines || []).includes(t))) e.push(`${at}: tags must be of ${(ctx.disciplines || []).join(', ')}, or null`);
    if (Array.isArray(c.aspects) && c.aspects.some((a) => !(ctx.aspects || []).includes(a))) e.push(`${at}: aspects must be of ${(ctx.aspects || []).join(', ')}, or null`);
    return e;
}

/**
 * Read and check a planner answer.
 * @returns {{commands: object[]|null, errors: string[]}} commands in the planner's order (seq), or the error lines
 */
export function parsePlan(answer, vocab, ctx, message) {
    const { value, error } = extractJsonObject(answer);
    if (!value) return { commands: null, errors: [error || 'no JSON object'] };
    if (!Array.isArray(value.commands)) return { commands: null, errors: ['the answer must be {"commands": [...]} (an empty list when he takes no action)'] };
    const errors = [];
    const story = new Map((vocab.commands || []).map((c) => [c.type, c]));
    const schema = interpreterSchema(vocab, ctx.catalog);
    const people = new Set([...ctx.opponents.map((o) => o.id), ...(ctx.catalog.present || []).map((p) => p.id)]);
    const objects = new Set((ctx.catalog.objects || []).map((o) => o.id));
    // Patch 6: the obstacles and hazards here (src/v4/features.js): what attempt and ability_world may act on
    const features = new Set((ctx.catalog.features || []).map((f) => f.id));
    const held = new Set((ctx.catalog.objects || []).filter((o) => !o.holder).map((o) => o.id));
    const list = value.commands.map((c, i) => ({ c, i }));
    for (const { c, i } of list) {
        const at = `commands[${i}]${c && typeof c === 'object' && c.type ? ` (${c.type})` : ''}`;
        if (!c || typeof c !== 'object' || Array.isArray(c)) { errors.push(`${at}: must be an object`); continue; }
        const type = String(c.type ?? '');
        if (story.has(type)) {
            // a story command: the interpreter's own schema, missing nullable arguments as null (as parseInterpretation)
            for (const [k, spec] of Object.entries(story.get(type).args || {})) if (spec.nullable && c[k] === undefined) c[k] = null;
            if (c.seq === undefined) c.seq = i + 1;
            // "needs" (ORDER_RULES) is the planner's own field, checked here: an earlier step of this answer, or nothing
            const needs = c.needs ?? null;
            delete c.needs;
            const bad = validate({ commands: [c] }, schema);
            if (needs !== null) {
                if (Number.isInteger(needs) && needs < c.seq && value.commands.some((o) => o && o !== c && o.seq === needs)) c.needs = needs;
                else errors.push(`${at}: "needs" must be the seq of an earlier command of this answer, or left out`);
            }
            for (const e of bad) errors.push(e.replace('$.commands[0]', `$.commands[${i}]`));
            // a contract slip named as the contract: say which id the contract has (the repair writes it, nothing is replaced here)
            const slip = typeof c.quest === 'string' ? c.quest : typeof c.quest?.id === 'string' ? c.quest.id : null;
            if (bad.length && slip?.startsWith('obj.slip.')) {
                const qid = `quest.${slip.slice('obj.slip.'.length)}`;
                errors.push(`${at}: ${slip} is the contract slip (an object), not the contract${(ctx.catalog.quests || []).some((q) => q.id === qid) ? `; the contract is ${qid}` : ''}`);
            }
            if (typeof c.quote === 'string' && !inMessage(message, c.quote)) errors.push(`${at}: quote "${c.quote.slice(0, 60)}" is not in the message (copy his exact words)`);
            if (type === 'activity' && !bad.length) errors.push(...learningErrors(c, ctx, at));
            continue;
        }
        if (!FIELDS[type]) { errors.push(`${at}: "type" must be a story command or one of ${MECH_TYPES.join(', ')}`); continue; }
        if (c.seq === undefined) c.seq = i + 1;
        for (const k of NULLABLE[type] || []) if (c[k] === undefined) c[k] = null;
        const extra = Object.keys(c).filter((k) => k !== 'seq' && k !== 'type' && !FIELDS[type].includes(k));
        if (extra.length) errors.push(`${at}: unknown field${extra.length > 1 ? 's' : ''} ${extra.join(', ')} (the engine decides outcomes; write only ${FIELDS[type].join(', ')})`);
        for (const k of FIELDS[type]) if (c[k] === undefined) errors.push(`${at}: "${k}" is missing`);
        if (type !== 'clarify' && (typeof c.quote !== 'string' || !inMessage(message, c.quote))) errors.push(`${at}: quote must be his exact words from the message`);
        if (type === 'use_skill' || type === 'ability_world') {
            const s = c.skill;
            if (!(s === null || isNew(s) || (typeof s === 'string' && ctx.contentSkills.has(s)))) errors.push(`${at}: skill must be an id from KNOWN SKILLS, {"new": "<the name he used>"} or null`);
        }
        if (type === 'use_skill') {
            const t = c.target;
            if (!(t === null || isNew(t) || (typeof t === 'string' && people.has(t)))) errors.push(`${at}: target must be an id from OPPONENTS or PRESENT, {"new": "<description>"} or null${typeof t === 'string' && objects.has(t) ? ' (a thing: use ability_world)' : ''}`);
        }
        if (type === 'ability_world') {
            const t = c.target;
            if (typeof t === 'string' && people.has(t)) errors.push(`${at}: target ${t} is a creature or person: use use_skill`);
            else if (!(isNew(t) || (typeof t === 'string' && (objects.has(t) || features.has(t))))) errors.push(`${at}: target must be an id from OBJECTS or FEATURES or {"new": "<the thing>"}`);
            if (typeof c.target_words !== 'string' || !c.target_words.trim() || !flat(c.quote).includes(flat(c.target_words))) errors.push(`${at}: target_words must be his exact words for the thing, taken from the quote`);
            if (c.goal !== null && typeof c.goal !== 'string') errors.push(`${at}: goal must be a few of his words or null`);
        }
        if (type === 'move') {
            if (!['closer', 'away'].includes(c.dir)) errors.push(`${at}: dir must be "closer" or "away"`);
            if (!(c.target === null || (typeof c.target === 'string' && people.has(c.target)))) errors.push(`${at}: target must be an id from OPPONENTS or PRESENT, or null`);
        }
        if (type === 'attempt') {
            if (!(isNew(c.feature) || (typeof c.feature === 'string' && features.has(c.feature)))) errors.push(`${at}: feature must be an id from FEATURES or {"new": "<the thing>"}`);
            if (!['examine', 'pass', 'disable'].includes(c.aim)) errors.push(`${at}: aim must be "examine", "pass" or "disable"`);
            if (!(c.stat === null || ['STR', 'VIT', 'AGI', 'INT', 'PER', 'WIL'].includes(c.stat))) errors.push(`${at}: stat must be STR, VIT, AGI, INT, PER, WIL or null`);
            if (!(c.tool === null || (typeof c.tool === 'string' && held.has(c.tool)))) errors.push(`${at}: tool must be the id of a thing Alaric holds (OBJECTS) or null`);
            if (!(c.possible === null || typeof c.possible === 'boolean')) errors.push(`${at}: possible must be false or null`);
            if (!(c.approach === null || typeof c.approach === 'string')) errors.push(`${at}: approach must be a few of his words or null`);
        }
        if (type === 'other' && (typeof c.what !== 'string' || !c.what.trim())) errors.push(`${at}: what must be a few of his words`);
        if (type === 'clarify') {
            if (!['target', 'skill', 'action'].includes(c.about)) errors.push(`${at}: about must be "target", "skill" or "action"`);
            if (typeof c.question !== 'string' || !c.question.trim()) errors.push(`${at}: question must be one short question`);
            if (!Array.isArray(c.options) || c.options.some((o) => typeof o !== 'string')) errors.push(`${at}: options must be a list of ids or short texts`);
        }
    }
    errors.push(...amountErrors(value.commands, ctx.currency));
    if (errors.length) return { commands: null, errors: errors.slice(0, 8) };
    return { commands: [...value.commands].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)), errors: [] };
}

// --------------------------------------------------------------------------------------------- safety catch
// A skill:null attack (Basic Attack) must not stand where the words point at a skill: the original failure ("I Fire
// Lance Barkscorpion B" became a silent Basic Attack). A small catch, never an interpreter: it only says "a skill is
// hinted here" and turns the command into a question. Closed parts: a content skill named (A's mentionedSkills), a
// distinctive word of one of Alaric's own skills (exact or one typo away; "lance", "lnace"), the run-together name
// ("flamelance"), a word of magic or skill, a class verb (E1), "use my X on" for an X he does not hold.
const MAGIC_WORDS = /\b(?:spells?|magic|magical|ability|abilities|skill|technique|cast|casts|casting|conjures?|summons?|invokes?|channels?)\b/;
const CLASS_VERBS = { mage: /\b(?:blast|blasts|zap|zaps)\b/ };
const GENERIC = new Set(['attack', 'basic', 'shot', 'strike', 'slash', 'blow', 'hit', 'shoot']);
const USE_MY = /\b(?:use|uses|using|activate|activates|perform|performs)\s+(?:my|a|the|his)\s+([a-z][a-z' -]{1,30}?)\s+(?:on|at|against)\b/;

function damerau(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
    }
    return d[a.length][b.length];
}

/** The sentence(s) of the message a quote stands in, without quoted speech, questions and other commands' quotes. */
function scopeOf(message, quote, others) {
    const sentences = String(message ?? '').replace(/"[^"\n]*"|“[^”\n]*”/g, ' ').split(/(?<=[.!?])\s+|\n+|\*/).map((s) => s.trim()).filter(Boolean);
    const q = flat(quote).replace(/[.!?,;:"]+$/g, '');
    const hit = sentences.filter((s) => !/\?\s*$/.test(s) && (flat(s).includes(q) || (q && q.includes(flat(s).replace(/[.!?]+$/, '')))));
    let text = flat((hit.length ? hit : [quote]).join(' '));
    for (const o of others) {
        const t = flat(o).replace(/[.!?,;:"]+$/g, '');
        if (t && t !== q) text = text.split(t).join(' ');
    }
    return text;
}

/**
 * Does the command's sentence hint at a skill? Returns the hint (for the record) or null.
 * @param {object} ctx planContext; @param {object} content
 */
export function skillHint(message, cmd, others, ctx, content, state = null) {
    const text = scopeOf(message, cmd.quote, others);
    if (!text) return null;
    const named = mentionedSkills(text, content, state).filter((n) => n !== 'basic attack');
    if (named.length) return `names ${named[0]}`;
    const words = text.split(/[^a-z']+/).filter(Boolean);
    const joined = words.join('');
    for (const s of ctx.skills) {
        if (s.id === ctx.basic || s.id === ctx.weapon) continue;
        const name = s.name.toLowerCase();
        if (name.replace(/[^a-z]/g, '').length >= 8 && joined.includes(name.replace(/[^a-z]/g, ''))) return `names ${s.name}`;
        for (const d of name.split(/[^a-z]+/).filter((w) => w.length >= 4 && !GENERIC.has(w))) {
            const w = words.find((x) => x.length >= 4 && (x === d || damerau(x, d) <= (d.length >= 7 ? 2 : 1)));
            if (w) return `"${w}" points at ${s.name}`;
        }
    }
    const magic = MAGIC_WORDS.exec(text);
    if (magic) return `"${magic[0]}" points at a skill`;
    const verb = CLASS_VERBS[ctx.cls]?.exec(text);
    if (verb) return `"${verb[0]}" points at a spell`;
    const use = USE_MY.exec(text);
    if (use) {
        const held = (ctx.catalog.objects || []).filter((o) => !o.holder).map((o) => flat(o.name));
        const thing = flat(use[1]);
        if (!held.some((h) => thing.split(' ').some((w) => w.length > 2 && h.includes(w)))) return `"use ${use[1]}" names no thing he holds`;
    }
    return null;
}

// --------------------------------------------------------------------------------------------- mapping to the engine
const EXPLICIT_REF = /\b(?:the\s+(?:first|second|third|fourth|fifth|other|left|right|last)|at\s+another)\s+ones?\b/;
const PRONOUN = /\b(?:him|her|it|them)\b/;
const area = (skill) => (skill?.effects || []).some((e) => e.kind === 'area');

function clarifyPanel(question, options, waiting = []) {
    const opts = options.filter(Boolean);
    return ['[SYSTEM // CLARIFY]', String(question).replace(/[<>`]/g, '').slice(0, 240), opts.length ? `Options: ${opts.join(' · ')}` : '',
        waiting.length ? `Also waiting with it: ${waiting.join(', ')}.` : '', 'Nothing was spent or rolled; answer and send your message again.'].filter(Boolean).join('\n');
}

/**
 * Turn the validated commands into the engine's input. Nothing is replaced: a value the engine cannot take becomes a
 * question, a refusal the engine already knows (unknown skill, no such target) or a visible "not taken" note.
 * @returns {{route: 'v3', intent: object} | {route: 'v4', commands: object[]} | {route: 'panel', panel: string}} plus notes
 */
// Patch 8.4.3 (live 22.10.2026 09:00, turn 20: "I back away quietly between the columns and slip back through the cleft,
// away from the queen" came as flee outside a fight: story fiction, the narrator told the walk out, the engine kept him
// in the Queen's Crystal Bowl): outside a fight, a flight that says where it goes is a go there, on the ordinary way of
// go with all its checks. The place: a known one he names (every word of its name, the Dungeon's "of …" aside), else,
// when he says he goes back ("back through", "back out", "the way I came"), the room he came from. A flight that says
// neither, or names a place he does not know ("back to …"), gets no place
const BACK_WAY = /\b(?:back\s+(?:out|through|the way|into|past|down|up|along)|the way (?:i|he) came|where (?:i|he) came from|retrac(?:e|es|ing) (?:my|his) steps)\b/i;
const placeWords = (name) => normText(String(name || '').replace(/\s+of\s+.*$/i, '').replace(/,.*$/, '')).split(/[^a-z0-9']+/).filter((w) => w.length > 2 && w !== 'the');
export function retreatGo(state, c) {
    const here = state?.scene?.at;
    const quote = String(c?.quote || '');
    if (!here || !quote) return null;
    const said = ` ${normText(quote).replace(/[^a-z0-9']+/g, ' ')} `;
    const route = (state.scene.history || []).slice(-12);
    const d = dungeonOf(state, here);
    const rooms = d ? Object.keys(state.places || {}).filter((id) => dungeonOf(state, id) === d && roomKnown(state, id)) : [];
    const named = [...new Set([...route, ...rooms])].filter((id) => id !== here && state.places?.[id]).filter((id) => {
        const w = placeWords(state.places[id].name || placeName(state, id));
        return w.length > 0 && w.every((x) => said.includes(` ${x} `));
    });
    if (named.length === 1) return { seq: c.seq, type: 'go', to: named[0], quote: c.quote };
    if (named.length > 1 || /\bback to\b/i.test(quote) || !BACK_WAY.test(quote)) return null;
    const from = [...route].reverse().find((id) => id !== here && state.places?.[id]);
    return from ? { seq: c.seq, type: 'go', to: from, quote: c.quote } : null;
}

export function mapPlan(commands, ctx, content, message, state) {
    // Patch 3 (live 18.10.2026: "I use the flint and steel to make a small light" became the unknown skill "flint and
    // steel" and the "continue" after it was dropped): a thing he holds, named where a skill would stand, is that thing
    // used, a story command among the others, never a skill
    commands = (commands || []).map((c) => heldUse(c, ctx) || c);
    // Hotfix c.6.6.18 (live 20.10.2026: "*i say* Thornash *and throw the scroll at them*" used the scorchburst scroll up
    // and the story burned the beetles): a held thing with an offensive effect profile, used, is an attack made with it
    commands = commands.map((c) => itemAttack(c, content, state) || c);
    // Patch 7.2: in a fight a restorative he drinks is his main action, as a skill (one per Turn, Core #12/#24)
    if (ctx.fight) commands = commands.map((c) => itemRestore(c, content, state) || c);
    const story = (commands || []).filter((c) => !MECH_TYPES.includes(c.type));
    const mech = (commands || []).filter((c) => MECH_TYPES.includes(c.type));
    const label = (id) => ctx.opponents.find((o) => o.id === id)?.label || (ctx.catalog.present || []).find((p) => p.id === id)?.handle || id;
    const skillName = (id) => skillOf(content, id, state)?.name || id;
    const quotes = (commands || []).map((c) => c.quote).filter(Boolean);

    // a question back to the player stands alone: nothing else of the message is booked (the whole plan waits). It is
    // his question with his options by name; never A's attack question, which would name a skill or an attack for him.
    // Patch 3 (review): the whole message waits, not only the step in question, because the answer is the message sent
    // again: a step booked now would happen twice. The clarify names no step of its own (no quote, no "needs"), so which
    // steps rest on it is not known; in a fight the rest is the one main action anyway. The panel names what waits.
    const ask = mech.find((c) => c.type === 'clarify');
    if (ask) {
        const known = (o) => ctx.opponents.some((x) => x.id === o) || (ctx.catalog.present || []).some((p) => p.id === o);
        const opts = ask.options.map((o) => (content.skills.has(o) ? skillName(o) : known(o) ? label(o) : String(o).replace(/[<>`]/g, '').slice(0, 60)));
        const waiting = commands.filter((c) => c !== ask && c.quote).map((c) => `"${String(c.quote).replace(/[<>`]/g, '').slice(0, 60)}"`);
        return { route: 'panel', panel: clarifyPanel(ask.question, opts, waiting), notes: [] };
    }

    const notes = [];
    const free = []; // outside a fight: his deeds without an engine command, story fiction as in A (kept in the record)
    const fight = ctx.fight;
    const mains = mech.filter((c) => ['use_skill', 'ability_world', 'flee', 'stealth'].includes(c.type));
    const moves = mech.filter((c) => c.type === 'move');
    const said = (c) => `"${String(c.quote ?? c.what ?? c.type).replace(/[<>`]/g, '').slice(0, 80)}"`;

    // outside a fight a flight or a deed no command fits is story fiction: the narrator tells it as A's V4 turn does
    // (PLAYER ACTIONS / NOTHING TO BOOK); the record keeps it, so a session shows where it happened
    const mechMain = mains.filter((c) => fight || c.type !== 'flee');
    // Patch 8.4.3: a flight outside a fight that says where it goes is a go there (retreatGo); one that does not stays
    // story fiction, and the engine books no place for it
    if (!fight) {
        for (const c of mech.filter((x) => x.type === 'flee')) {
            const back = retreatGo(state, c);
            if (back) story.push(back); else free.push(`${c.type}: ${said(c)}`);
        }
    }
    if (!fight && !mechMain.length) {
        // 4.3.0-c.6.6.6: a step toward (or back from) the creatures or people of the scene is the engine's to set, one per
        // message; one that brings him nearer to no one, or toward something that is no one here ({new: "the well"}),
        // stays story fiction
        const stepped = (c) => !!state && (c.target === null || typeof c.target === 'string') && approachedBy(state, { move: c.dir, moveTarget: c.target }).length > 0;
        const steps = moves.filter(stepped);
        for (const c of moves.filter((x) => !stepped(x))) free.push(`move: ${said(c)}`);
        for (const c of steps.slice(1)) notes.push(`not taken this turn (one move per turn): ${said(c)}`);
        story.push(...steps.slice(0, 1));
        // Prototype C (4.3.0-c.6): his own deed no command fits is a step of the message, in its place among the others
        // (src/v4/commands.js other); live 04.10.2026 16:35: "cut the tusk ... use some cloth to stop my bleeding ... walk
        // into the den" lost the middle step, the narrator told it anyway and the extractor made it canon
        const others = mech.filter((x) => x.type === 'other' || x.type === 'attempt');
        return { route: 'v4', commands: [...story, ...others].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)), notes, free };
    }
    if (!fight) for (const c of mech.filter((x) => x.type === 'other' || x.type === 'attempt')) free.push(`${c.type}: ${said(c)}`);

    const notTaken = (c, why) => notes.push(`${why}: ${said(c)}`);
    let wait = null;
    for (const c of story) {
        if (!fight) { notTaken(c, 'not taken (the prototype resolves one kind of action per message)'); continue; }
        if (c.type === 'activity' && c.kind === 'wait' && !wait) { wait = c; continue; }
        if (c.type === 'activity' && c.kind === 'search') { notTaken(c, 'searching is not possible during a fight (not resolved by the engine yet)'); continue; }
        if (c.type === 'go') { notTaken(c, 'travel is not possible during a fight; to get away, flee'); continue; }
        notTaken(c, 'not possible during a fight');
    }
    // Patch 8.4.1: words that spend Stat Points are no deed of the fight either; the player is pointed to #assign
    if (fight) for (const c of mech.filter((x) => x.type === 'other')) notTaken(c, spendsStatPoints(`${c.what || ''} ${c.quote || ''}`, content) ? assignHint(state?.entities?.pc?.sheet?.free_points ?? 0) : 'not resolved by the engine');
    if (fight) for (const c of mech.filter((x) => x.type === 'attempt')) notTaken(c, 'not possible during a fight');

    // the first main action is taken; a second one waits for its own turn (one main action per turn, Core #12/#24)
    const main = mechMain[0] || null;
    for (const c of mechMain.slice(1)) notTaken(c, 'not taken this turn (one main action per turn)');
    if (main?.type === 'stealth' && fight) { notTaken(main, 'hiding is not possible during a fight'); }
    const move = moves[0] || null;
    for (const c of moves.slice(1)) notTaken(c, 'not taken this turn (one move per turn)');
    if (wait && (main || move)) { notTaken(wait, 'not taken this turn (one main action per turn)'); wait = null; }
    // a step the engine does not take with the main action: visible in a fight, story fiction outside one
    const leaveMove = (why) => { if (!move) return; if (fight) notTaken(move, why); else free.push(`move: ${said(move)}`); };

    const base = (intent) => ({ route: 'v3', intent: { ...intent, ...(notes.length ? { plan_notes: notes } : {}) }, notes, free });
    if (!main || (main.type === 'stealth' && fight)) {
        if (move && fight) return base({ kind: 'move', dir: move.dir, target: move.target || null });
        if (wait && fight) return base({ kind: 'hold' });
        return base({ kind: 'narrative', flags: {} });
    }
    if (main.type === 'flee') { leaveMove('not taken this turn (fleeing is his whole turn)'); return base({ kind: 'flee' }); }
    if (main.type === 'stealth') { leaveMove('not taken (hiding is his whole action)'); return base({ kind: 'stealth' }); }

    // the skill: an unknown one is refused by the engine (never another in its place); null is the class's Basic
    // Attack unless the words point at a skill (then the player is asked)
    const others = quotes.filter((q) => q !== main.quote);
    let skill = main.skill;
    if (isNew(skill)) return base({ kind: 'unknown_skill', name: String(skill.new).slice(0, 60) });
    // Patch 7.2: a restorative drunk in a fight: no target, his one step of the Turn before it (src/combat.js itemAction)
    if (main.item && skillOf(content, skill, state)?.restore) return base({ kind: 'item', item: main.item, ...(move ? { move: move.dir, move_target: move.target || null } : {}) });
    if (typeof skill === 'string' && !ctx.known.includes(skill) && !main.item) return base({ kind: 'unknown_skill', skill, name: skillName(skill) });
    const basicNamed = typeof skill === 'string' && skill === ctx.basic && /\bbasic\s+attack\b/.test(flat(message));
    // Patch 9A: an attack that names no skill but the weapon he holds is that weapon's plain attack (Bow Shot)
    if (skill === null && ctx.weapon && state && weaponAttackNamed(state.entities.pc.sheet, content, rulesetOf(state), scopeOf(message, main.quote, others) || message)) skill = ctx.weapon;
    if (skill === null || (skill === ctx.basic && !basicNamed)) {
        const hint = skillHint(message, main, others, ctx, content, state);
        if (hint) {
            const opts = ctx.skills.filter((s) => skillOf(content, s.id, state)?.attack).map((s) => s.name);
            return { route: 'panel', panel: clarifyPanel(`Which skill does Alaric use for "${String(main.quote).replace(/[<>`]/g, '').slice(0, 80)}"? (${hint})`, opts), notes, free, hint };
        }
        skill = ctx.basic;
        if (!skill) return base({ kind: 'narrative', flags: { attack_without_class: true } });
    }
    // Patch 7.1: an attack item acts by its own snapshot (its reach); a skill by the content
    const def = (main.item && state ? itemEffectOf(content, state.objects?.[main.item]) : null) || skillOf(content, skill, state);

    // Hotfix c.6.6.18: an offensive item is thrown from where he stands, at the one he names or where most foes within its
    // reach stand (src/v4/scene_handles.js burstAim); with no foe in reach it stays his, unused
    if (main.item) {
        leaveMove('not taken this turn (he throws it from where he stands)');
        const aim = typeof main.target === 'string' ? main.target : !isNew(main.target) && state ? burstAim(state, def.range?.band || 'SHORT') : null;
        return base(aim ? { kind: 'attack', skill, target: aim, target_how: typeof main.target === 'string' ? 'planner' : 'area', move: null, move_target: null, item: main.item } : { kind: 'no_target', skill, item: main.item });
    }

    if (main.type === 'ability_world') {
        leaveMove('not taken this turn (a step with a skill on a thing is not resolved by the engine yet)');
        const target_text = String(main.target_words || (isNew(main.target) ? main.target.new : [...(ctx.catalog.objects || []), ...(ctx.catalog.features || [])].find((o) => o.id === main.target)?.name) || 'something').slice(0, 80);
        return base({ kind: 'ability_world', skill, target_id: typeof main.target === 'string' ? main.target : null, target_text, goal: main.goal ? String(main.goal).slice(0, 120) : null });
    }

    // use_skill: the target; {new} is no one here (the engine says so); null only where he named no one at all
    const dir = move ? move.dir : null;
    if (move && !def.attack && !(def.effects || []).some((e) => e.kind === 'reposition')) leaveMove(`not taken this turn (${def.name} moves no one; the engine resolves no step with it)`);
    const asAction = (target, how) => (def.attack
        ? { kind: 'attack', skill, target, target_how: how, move: dir, move_target: move?.target || null }
        : { kind: 'skill', skill, dir: dir || 'away', target });
    if (isNew(main.target)) return base({ kind: 'no_target', skill, ref: String(main.target.new).slice(0, 60) });
    if (typeof main.target === 'string') {
        // livetest 21.10.2026 ("*i Basic Attack D*", D dead, C the planner's target): the handle he names is the target
        const other = def.attack ? namedPeer(state, content, main.target, main.quote) : null;
        if (other?.dead) return base({ kind: 'no_target', skill, ref: other.handle, dead: true });
        if (other) return base(asAction(other.id, 'handle'));
        return base(asAction(main.target, 'planner'));
    }
    if (!def.attack) return base(asAction(null, 'none'));
    const hostiles = ctx.opponents.map((o) => o.id);
    if (area(def)) {
        const nominal = ctx.opponents.find((o) => o.engaged) || ctx.opponents[0];
        if (nominal) return base(asAction(nominal.id, 'area'));
        // 4.3.0-c.6.6: before a fight the area is the visible field (live 07.10.2026: "I dash in and use Arcane Burst"
        // among visible bandits asked for a target): they enter the fight, the engine moves him and hits whoever is
        // ENGAGED then, or refuses the whole action at no cost
        // 4.3.0-c.6.6.6: and it catches everyone ENGAGED with him after his step, foe or not (live 18.10.2026: the den's
        // pups were no foes, "I walk in front of them and then I arcane burst" asked for a target); with nobody in
        // reach, the engine refuses it at no cost
        if (!fight && state) {
            const caught = areaCaught(state, { move: dir, moveTarget: move?.target ?? null });
            const field = [...new Set([...tacticalHere(state, { friendly: false }), ...caught])];
            const band = (id) => (caught.includes(id) ? -1 : ['ENGAGED', 'SHORT', 'MEDIUM', 'LONG'].indexOf(state.scene.positions[id].band));
            const near = [...(field.length ? field : tacticalHere(state))].sort((a, b) => band(a) - band(b))[0];
            if (near) return base({ ...asAction(near, 'area'), field });
        }
    }
    const words = flat(main.quote);
    const ref = EXPLICIT_REF.exec(words);
    if (ref) return base({ kind: 'no_target', skill, ref: ref[0] });
    if (hostiles.length === 1) return base(asAction(hostiles[0], PRONOUN.test(words) ? 'pronoun' : 'sole target'));
    // before a fight the choice is among the actors that matter, not the clerk behind the desk (4.3.0-c.6.6)
    const tactical = !fight && state ? tacticalHere(state) : [];
    const candidates = hostiles.length ? hostiles : tactical.length ? tactical : (state?.scene?.present || []).filter((id) => id !== 'pc' && state.entities[id] && state.entities[id].status !== 'dead');
    if (candidates.length >= 2) return base({ kind: 'ambiguous_target', skill, candidates });
    if (candidates.length === 1 && !fight) return base({ kind: 'ambiguous_target', skill, candidates });
    return base({ kind: 'no_target', skill });
}

/**
 * Livetest 21.10.2026: the scene handle of another of the target's kind that his words name ("Basic Attack D" while the
 * planner chose Restless Skeleton C, D already dead): {id, handle, dead}, else null. The full handle, or its letter as a
 * word of its own at the end or before a joining word; never the target's own letter as well, never "I".
 */
function namedPeer(state, content, target, quote) {
    if (!state?.entities?.[target] || !quote) return null;
    const split = (h) => /^(.*\S)\s([A-Z])$/.exec(h);
    const mine = split(sceneHandle(state, content, target, { c: true }));
    if (!mine) return null;
    const q = String(quote).replace(/[*_]/g, ' ');
    const names = (h) => flat(q).includes(flat(h[0])) || (h[2] !== 'I' && new RegExp(`(?:^|[^A-Za-z'])${h[2]}(?=\\s*(?:$|[.,;:!?]|\\s(?:and|then|with|again|before|after|first|now)\\b))`).test(q.trim()));
    if (names(mine)) return null;
    const peers = Object.values(state.entities).filter((e) => e.id !== target && (e.kind === 'creature' || e.kind === 'npc'))
        .map((e) => [e, split(sceneHandle(state, content, e.id, { c: true }))]).filter(([, h]) => h && flat(h[1]) === flat(mine[1]) && names(h));
    if (peers.length !== 1) return null;
    const [e, h] = peers[0];
    return { id: e.id, handle: h[0], dead: e.status === 'dead' };
}

const THING_FILLER = new Set(['the', 'and', 'with', 'his', 'my', 'some', 'a', 'an', 'of', 'in', 'to', 'on']);
const thingWords = (t) => flat(t).split(/[^a-z0-9]+/).map((w) => w.replace(/(?<![su])s$/, '')).filter((w) => w.length > 2 && !THING_FILLER.has(w));
/** Does a name he uses name this thing: every word of it is a word of the thing's name ("flint and steel")? */
const namesThing = (said, name) => { const a = thingWords(said); const b = new Set(thingWords(name)); return a.length > 0 && a.every((w) => b.has(w)); };

/**
 * A skill command whose "skill" is a thing Alaric holds (OBJECTS held by him): the story command use of that thing,
 * in its place in the message. Null when no held thing (exactly one) is meant.
 */
function heldUse(c, ctx) {
    if (!['use_skill', 'ability_world'].includes(c?.type) || !isNew(c.skill)) return null;
    const held = (ctx.catalog?.objects || []).filter((o) => !o.holder);
    const byId = typeof c.target === 'string' ? held.find((o) => o.id === c.target) : null;
    const named = byId && namesThing(c.skill.new, byId.name) ? [byId] : held.filter((o) => namesThing(c.skill.new, o.name));
    if (named.length !== 1) return null;
    return { seq: c.seq, type: 'use', object: named[0].id, qty: null, quote: c.quote, ...(Number.isInteger(c.needs) ? { needs: c.needs } : {}) };
}

/**
 * Hotfix c.6.6.18: a use of a thing he holds whose effect profile is an attack (content gear item_effects, by the thing's
 * own profile or the words of its name): that attack, made with the thing, as a main action of the message. Null for
 * anything else (food, tools, gear, an ordinary consumable: the story command use as before).
 */
function itemAttack(c, content, state) {
    if (c?.type !== 'use' || typeof c.object !== 'string' || !state) return null;
    const o = state.objects?.[c.object];
    if (!o || o.holder?.entity !== 'pc') return null;
    const fx = itemEffectOf(content, o);
    if (!fx?.attack) return null;
    return { seq: c.seq, type: 'use_skill', skill: fx.id, item: o.id, target: null, quote: c.quote };
}

/**
 * Patch 7.2: a use, in a fight, of a thing he holds that is a restorative (src/v4/items.js restoreOf): a main action made
 * with it. Null for anything else (outside a fight a restorative stays the story command use: src/v4/commands.js).
 */
function itemRestore(c, content, state) {
    if (c?.type !== 'use' || typeof c.object !== 'string' || !state) return null;
    const o = state.objects?.[c.object];
    if (!o || o.holder?.entity !== 'pc') return null;
    const p = restoreOf(content, o);
    if (!p) return null;
    return { seq: c.seq, type: 'use_skill', skill: p.base, item: o.id, target: null, quote: c.quote };
}

/** The planner's view of the content: every skill id (for the validator's "is this a skill at all"), Patch 9B-1 the campaign's own too. */
export function withContentSkills(ctx, content, state = null) {
    return { ...ctx, contentSkills: new Set([...content.skills.keys(), ...Object.keys(state?.skill_defs || {})]), currency: content.rules.currency };
}
