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
// reused unchanged; the planner adds seven types: use_skill, ability_world, move, flee, stealth, other, clarify.
// Pure module: the host makes the call (src/v4/runtime.js), the same state and answer give the same result.
import { normText } from '../util.js';
import { mentionedSkills } from '../intent.js';
import { activeHostiles } from '../combat.js';
import { sceneHandle, tacticalHere } from './scene_handles.js';
import { settlementOf } from './domain.js';
import { extractJsonObject } from './json.js';
import { validate } from './schema.js';
import { interpreterSystem, vocabularyText, catalogText, interpreterSchema, PLAIN_FORMAT, repairMessage } from './interpret.js';
import { anchorQuote } from './agency.js';

export const PLANNER_VERSION = 'plan-c0.1';

export const MECH_TYPES = ['use_skill', 'ability_world', 'move', 'flee', 'stealth', 'other', 'clarify'];

// --------------------------------------------------------------------------------------------- prompt
// Role, rules and examples are the ones P0/S4b measured (tools/p0/lib/s4b.mjs, arm p1), adapted to the frozen schema:
// one use_skill instead of attack/skill, "skill": null for an attack without a named skill, target_words for a world
// use, the meaning (flee, search, go, wait) instead of the fight's mechanics.
export const PLANNER_ROLE = 'You are the intent planner of the Avereth engine. You read one PLAYER MESSAGE and write down the engine actions Alaric himself takes in it. The engine resolves them: it decides every outcome, roll, number and cost, and whether something works at all. You never decide or describe an outcome.';

export const MECH_RULES = [
    'Actions with skills, in fights and on things (commands of the same list; the engine decides what is possible now and every outcome):',
    '1. Only Alaric\'s own deeds in this message. Not an action: a question ("Can I …?"), a wish, a thought, a plan or a condition for later ("if it moves, I\'ll …", "next time …"), a memory, words he speaks (threats too), anything another character does. Such a message gets an empty list.',
    '2. Skills: use only the ids under KNOWN SKILLS. Players misspell and paraphrase skills: if exactly one known skill fits what he names or describes, use that skill. If he names a skill Alaric does not know, write {"new": "<the name he used>"}; never put a different skill in its place.',
    '3. An attack that names no skill and hints at none ("I strike the rat", "I hit it", "I shoot at it"): "skill": null; the engine uses his Basic Attack. Use the Basic Attack id only when he says "basic attack".',
    '4. Targets: opponents and people by their id. Resolve labels and parts of labels ("B" for "Cave Rat B"), descriptions against the catalog (wounded, ENGAGED = right in front of him, the farthest, a size or kind), pronouns, ENGINE FACTS and RECENT. A target who is not here: {"new": "<description>"}. An area skill needs no target (null). When he names no target at all, null.',
    '5. A known skill used on a thing instead of a creature or person is ability_world: target = an OBJECTS id or {"new": "<the thing>"}; target_words = his exact words for the thing the skill acts on (not the thing he wants to affect in the end); goal = what he wants to happen, in a few of his words. Do not judge whether it can work.',
    '6. Ask instead of guessing: if, after the catalog, ENGINE FACTS and RECENT, two or more readings remain that would play out differently (another target, another skill, another kind of action), answer with one clarify about that point and nothing else. If exactly one reading fits, act and do not ask.',
    '7. Write what he means: getting away from danger is flee; stepping back or closing in during a fight is move; looking for someone or something is activity with kind "search"; going somewhere is go; waiting is activity with kind "wait". Write every action he intends, even if it may be impossible now: the engine decides what is possible.',
    '7a. Return words such as "back", "return", "the city", "where I came from" are semantic references, not names for new places. Use RECENT ROUTE and known PLACES to resolve them to an existing destination when one clearly fits; if more than one route destination genuinely fits, clarify instead of inventing a generic new place.',
    '7b. go.to is the destination, never the way there. A route, path or way he names ("through the forests", "along the river", "not past the waystation", "by the coast road") is how he travels: to is the destination\'s known id (or {"new": "<the destination>"} when it is not known), and the route stays in his words for the story. A route is never a place of its own.',
    '8. Several actions in one message: one command each, in his order. Something he does that no command fits: other.',
    '9. quote: the exact words of the message the command rests on, copied as they are (do not correct the spelling).',
].join('\n');

export const MECH_COMMANDS = [
    '- use_skill {skill, target}: a skill, or a plain attack, against a creature or person, or a skill on himself. skill: an id from KNOWN SKILLS | {"new": "<his name for it>"} | null; target: an id from OPPONENTS or PRESENT | {"new": "<description>"} | null (null also for a skill on himself)',
    '- ability_world {skill, target, target_words, goal}: a skill used on a thing. skill as above; target: an id from OBJECTS | {"new": "<the thing>"}',
    '- move {dir, target}: dir "closer" | "away"; target: an id | null',
    '- flee {}: he tries to get away',
    '- stealth {}: he hides or sneaks',
    '- other {what}: an action of his that no command fits; what: a few of his words',
    '- clarify {about, question, options}: instead of acting; about "target" | "skill" | "action"; question: one short question to the player; options: ids or short texts',
].join('\n');

// written for the rules with a catalog of their own; no example is a message of the S4b corpus or the test corpora
export const MECH_EXAMPLES = [
    'Examples (another place, not the current scene). Example catalog: KNOWN SKILLS mage.frost_dart (Frost Dart: attack · single target), mage.basic_attack (Basic Attack: attack · single target), mage.ember_ring (Ember Ring: attack · area: every foe ENGAGED with Alaric) · OPPONENTS mon.x1 Cave Rat A (unhurt · ENGAGED), mon.x2 Cave Rat B (wounded · SHORT) · PLACES loc.mill (the old mill) · ENGINE FACTS: Cave Rat B bit Alaric (last round)',
    '- "Frostdart rat B!" → {"commands":[{"seq":1,"type":"use_skill","skill":"mage.frost_dart","target":"mon.x2","quote":"Frostdart rat B!"}]}',
    '- "I shatter the icicles with a Frost Dart so they bury the tunnel" → {"commands":[{"seq":1,"type":"ability_world","skill":"mage.frost_dart","target":{"new":"the icicles over the tunnel"},"target_words":"the icicles","goal":"bury the tunnel","quote":"I shatter the icicles with a Frost Dart so they bury the tunnel"}]}',
    '- "I call down Lightning on Rat A" → {"commands":[{"seq":1,"type":"use_skill","skill":{"new":"Lightning"},"target":"mon.x1","quote":"I call down Lightning on Rat A"}]}',
    '- "I go for the rat" → {"commands":[{"seq":1,"type":"clarify","about":"target","question":"Which one, Cave Rat A or Cave Rat B?","options":["mon.x1","mon.x2"]}]}',
    '- "Frost Dart the biter" → {"commands":[{"seq":1,"type":"use_skill","skill":"mage.frost_dart","target":"mon.x2","quote":"Frost Dart the biter"}]}',
    '- "I kick the one in front of me" → {"commands":[{"seq":1,"type":"use_skill","skill":null,"target":"mon.x1","quote":"I kick the one in front of me"}]}',
    '- "I back off a step and Frost Dart Rat A" → {"commands":[{"seq":1,"type":"move","dir":"away","target":null,"quote":"I back off a step"},{"seq":2,"type":"use_skill","skill":"mage.frost_dart","target":"mon.x1","quote":"Frost Dart Rat A"}]}',
    '- "I bolt for the exit" → {"commands":[{"seq":1,"type":"flee","quote":"I bolt for the exit"}]}',
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
    '- quest.turn_in is handing in a contract he has DONE at a Guild hall, for its payout. Handing back the slip of a contract he has not done, because he gives the job up or turned it down, is quest.abandon with the contract\'s quest id, never quest.turn_in.',
    '- quest.abandon only when he gives the contract up in this message: "I abandon the quest", "I give up this contract", "I cancel this job", handing its slip back at the desk. Saying he will do it later is no command: "I\'ll decline the quest myself", "I\'ll go cancel it at the Guild", "I\'ll hand the contract back", "I\'ll return the slip" are words, not the act.',
    '- The slip of a contract that is no longer active (given up or done), handed to someone: give {object: the slip, to: who takes it}; never a quest command.',
    'Examples (another town): CATALOG: PLACES: loc.kf.guild_hall (Guild office, Kestrel Ford) · QUESTS: quest.ferry_job (Ferry Job · Guild contract · active) · OBJECTS: obj.slip.ferry_job (Guild contract slip: Ferry Job, held by Alaric)',
    '- "*i shrug* I\'ll cancel that job at the Guild myself." → {"commands":[]}',
    '- "*i walk back to the guild office and hand the slip back*" → {"commands":[{"seq":1,"type":"go","to":"loc.kf.guild_hall","quote":"i walk back to the guild office"},{"seq":2,"type":"quest.abandon","quest":"quest.ferry_job","quote":"hand the slip back"}]}',
    '- "I give up the ferry job." → {"commands":[{"seq":1,"type":"quest.abandon","quest":"quest.ferry_job","quote":"I give up the ferry job."}]}',
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

/** quest.abandon commands whose quote announces the act instead of doing it: {kept, dropped} as the agency guard's. */
export function announcedAbandon(message, commands) {
    const kept = [];
    const dropped = [];
    for (const c of commands || []) {
        const words = flat(c.quote ?? '');
        if (c.type === 'quest.abandon' && ANNOUNCED_ABANDON.test(words) && inMessage(message, c.quote ?? '')) dropped.push({ command: c, rule: 'plan' });
        else kept.push(c);
    }
    return { kept, dropped };
}

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
    return [interpreterSystem(vocab), '', CONTRACT_RULES, '', ORDER_RULES, '', mech, '', PLAIN_FORMAT].join('\n');
}

function skillText(skill) {
    const area = (skill.effects || []).some((e) => e.kind === 'area');
    const bits = [skill.attack ? 'attack' : 'not an attack'];
    if (skill.attack) bits.push(area ? 'area: every foe ENGAGED with Alaric' : 'single target');
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
    const known = Object.keys(sheet.skills || {}).filter((id) => content.skills.has(id));
    const skills = known.map((id) => ({ id, name: content.skills.get(id).name, text: skillText(content.skills.get(id)) }));
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
    const route = [];
    for (const id of (state.scene?.history || []).slice(-12)) {
        const resolved = settlementOf(state, id) || id;
        const p = state.places?.[resolved];
        if (!p || route.at(-1)?.id === resolved) continue;
        route.push({ id: resolved, name: p.name, kind: p.kind });
    }
    return { fight, skills, known, basic, opponents, facts, route: route.slice(-12), catalog, cls: sheet.class || null };
}

/** The user message: the interpreter's CATALOG, then skills, opponents, engine facts, RECENT and the message. */
export function plannerUser(ctx, text, { recent = '' } = {}) {
    const L = [catalogText(ctx.catalog)];
    L.push('KNOWN SKILLS (the only skill ids):');
    for (const s of ctx.skills) L.push(`- ${s.id}: ${s.name} — ${s.text}`);
    if (!ctx.skills.length) L.push('- none');
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
    other: ['what', 'quote'],
    clarify: ['about', 'question', 'options'],
};
const NULLABLE = { use_skill: ['skill', 'target'], ability_world: ['skill', 'goal'], move: ['target'] };

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
            else if (!(isNew(t) || (typeof t === 'string' && objects.has(t)))) errors.push(`${at}: target must be an id from OBJECTS or {"new": "<the thing>"}`);
            if (typeof c.target_words !== 'string' || !c.target_words.trim() || !flat(c.quote).includes(flat(c.target_words))) errors.push(`${at}: target_words must be his exact words for the thing, taken from the quote`);
            if (c.goal !== null && typeof c.goal !== 'string') errors.push(`${at}: goal must be a few of his words or null`);
        }
        if (type === 'move') {
            if (!['closer', 'away'].includes(c.dir)) errors.push(`${at}: dir must be "closer" or "away"`);
            if (!(c.target === null || (typeof c.target === 'string' && people.has(c.target)))) errors.push(`${at}: target must be an id from OPPONENTS or PRESENT, or null`);
        }
        if (type === 'other' && (typeof c.what !== 'string' || !c.what.trim())) errors.push(`${at}: what must be a few of his words`);
        if (type === 'clarify') {
            if (!['target', 'skill', 'action'].includes(c.about)) errors.push(`${at}: about must be "target", "skill" or "action"`);
            if (typeof c.question !== 'string' || !c.question.trim()) errors.push(`${at}: question must be one short question`);
            if (!Array.isArray(c.options) || c.options.some((o) => typeof o !== 'string')) errors.push(`${at}: options must be a list of ids or short texts`);
        }
    }
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
export function skillHint(message, cmd, others, ctx, content) {
    const text = scopeOf(message, cmd.quote, others);
    if (!text) return null;
    const named = mentionedSkills(text, content).filter((n) => n !== 'basic attack');
    if (named.length) return `names ${named[0]}`;
    const words = text.split(/[^a-z']+/).filter(Boolean);
    const joined = words.join('');
    for (const s of ctx.skills) {
        if (s.id === ctx.basic) continue;
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

function clarifyPanel(question, options) {
    const opts = options.filter(Boolean);
    return ['[SYSTEM // CLARIFY]', String(question).replace(/[<>`]/g, '').slice(0, 240), opts.length ? `Options: ${opts.join(' · ')}` : '', 'Nothing was spent or rolled; answer and send your message again.'].filter(Boolean).join('\n');
}

/**
 * Turn the validated commands into the engine's input. Nothing is replaced: a value the engine cannot take becomes a
 * question, a refusal the engine already knows (unknown skill, no such target) or a visible "not taken" note.
 * @returns {{route: 'v3', intent: object} | {route: 'v4', commands: object[]} | {route: 'panel', panel: string}} plus notes
 */
export function mapPlan(commands, ctx, content, message, state) {
    const story = (commands || []).filter((c) => !MECH_TYPES.includes(c.type));
    const mech = (commands || []).filter((c) => MECH_TYPES.includes(c.type));
    const label = (id) => ctx.opponents.find((o) => o.id === id)?.label || (ctx.catalog.present || []).find((p) => p.id === id)?.handle || id;
    const skillName = (id) => content.skills.get(id)?.name || id;
    const quotes = (commands || []).map((c) => c.quote).filter(Boolean);

    // a question back to the player stands alone: nothing else of the message is booked (the whole plan waits). It is
    // his question with his options by name; never A's attack question, which would name a skill or an attack for him
    const ask = mech.find((c) => c.type === 'clarify');
    if (ask) {
        const known = (o) => ctx.opponents.some((x) => x.id === o) || (ctx.catalog.present || []).some((p) => p.id === o);
        const opts = ask.options.map((o) => (content.skills.has(o) ? skillName(o) : known(o) ? label(o) : String(o).replace(/[<>`]/g, '').slice(0, 60)));
        return { route: 'panel', panel: clarifyPanel(ask.question, opts), notes: [] };
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
    if (!fight) for (const c of mech.filter((x) => x.type === 'flee')) free.push(`${c.type}: ${said(c)}`);
    if (!fight && !mechMain.length) {
        for (const c of moves) free.push(`move: ${said(c)}`);
        // Prototype C (4.3.0-c.6): his own deed no command fits is a step of the message, in its place among the others
        // (src/v4/commands.js other); live 04.10.2026 16:35: "cut the tusk ... use some cloth to stop my bleeding ... walk
        // into the den" lost the middle step, the narrator told it anyway and the extractor made it canon
        const others = mech.filter((x) => x.type === 'other');
        return { route: 'v4', commands: [...story, ...others].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)), notes, free };
    }
    if (!fight) for (const c of mech.filter((x) => x.type === 'other')) free.push(`${c.type}: ${said(c)}`);

    const notTaken = (c, why) => notes.push(`${why}: ${said(c)}`);
    let wait = null;
    for (const c of story) {
        if (!fight) { notTaken(c, 'not taken (the prototype resolves one kind of action per message)'); continue; }
        if (c.type === 'activity' && c.kind === 'wait' && !wait) { wait = c; continue; }
        if (c.type === 'activity' && c.kind === 'search') { notTaken(c, 'searching is not possible during a fight (not resolved by the engine yet)'); continue; }
        if (c.type === 'go') { notTaken(c, 'travel is not possible during a fight; to get away, flee'); continue; }
        notTaken(c, 'not possible during a fight');
    }
    if (fight) for (const c of mech.filter((x) => x.type === 'other')) notTaken(c, 'not resolved by the engine');

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
    if (typeof skill === 'string' && !ctx.known.includes(skill)) return base({ kind: 'unknown_skill', skill, name: skillName(skill) });
    const basicNamed = typeof skill === 'string' && skill === ctx.basic && /\bbasic\s+attack\b/.test(flat(message));
    if (skill === null || (skill === ctx.basic && !basicNamed)) {
        const hint = skillHint(message, main, others, ctx, content);
        if (hint) {
            const opts = ctx.skills.filter((s) => content.skills.get(s.id)?.attack).map((s) => s.name);
            return { route: 'panel', panel: clarifyPanel(`Which skill does Alaric use for "${String(main.quote).replace(/[<>`]/g, '').slice(0, 80)}"? (${hint})`, opts), notes, free, hint };
        }
        skill = ctx.basic;
        if (!skill) return base({ kind: 'narrative', flags: { attack_without_class: true } });
    }
    const def = content.skills.get(skill);

    if (main.type === 'ability_world') {
        leaveMove('not taken this turn (a step with a skill on a thing is not resolved by the engine yet)');
        const target_text = String(main.target_words || (isNew(main.target) ? main.target.new : (ctx.catalog.objects || []).find((o) => o.id === main.target)?.name) || 'something').slice(0, 80);
        return base({ kind: 'ability_world', skill, target_id: typeof main.target === 'string' ? main.target : null, target_text, goal: main.goal ? String(main.goal).slice(0, 120) : null });
    }

    // use_skill: the target; {new} is no one here (the engine says so); null only where he named no one at all
    const dir = move ? move.dir : null;
    if (move && !def.attack && !(def.effects || []).some((e) => e.kind === 'reposition')) leaveMove(`not taken this turn (${def.name} moves no one; the engine resolves no step with it)`);
    const asAction = (target, how) => (def.attack
        ? { kind: 'attack', skill, target, target_how: how, move: dir, move_target: move?.target || null }
        : { kind: 'skill', skill, dir: dir || 'away', target });
    if (isNew(main.target)) return base({ kind: 'no_target', skill, ref: String(main.target.new).slice(0, 60) });
    if (typeof main.target === 'string') return base(asAction(main.target, 'planner'));
    if (!def.attack) return base(asAction(null, 'none'));
    const hostiles = ctx.opponents.map((o) => o.id);
    if (area(def)) {
        const nominal = ctx.opponents.find((o) => o.engaged) || ctx.opponents[0];
        if (nominal) return base(asAction(nominal.id, 'area'));
        // 4.3.0-c.6.6: before a fight the area is the visible field (live 07.10.2026: "I dash in and use Arcane Burst"
        // among visible bandits asked for a target): they enter the fight, the engine moves him and hits whoever is
        // ENGAGED then, or refuses the whole action at no cost
        if (!fight && state) {
            const field = tacticalHere(state, { friendly: false });
            const band = (id) => ['ENGAGED', 'SHORT', 'MEDIUM', 'LONG'].indexOf(state.scene.positions[id].band);
            const near = [...field].sort((a, b) => band(a) - band(b))[0];
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

/** The planner's view of the content: every skill id (for the validator's "is this a skill at all"). */
export function withContentSkills(ctx, content) {
    return { ...ctx, contentSkills: new Set(content.skills.keys()) };
}
