// Runtime V4: the command interpreter call (docs/RUNTIME_V4_PLAN.md §4.2). The player's story message becomes typed
// commands for Alaric; the engine checks and books them. Prompt, schema and validator come from one vocabulary
// (content/commands.json). The call itself is the host's (index.js, generateRaw); this module builds it and reads
// the answer. P0/S1 measured the same prompt shape (tools/p0/s1_interpreter.mjs --prompt v4).
//
// Answer format: plain JSON per instruction, validated locally, one repair call with the error list when invalid
// (P0/S0: json_schema is accepted but not enforced by the provider; plain JSON was 30/30 valid).
import { O, S, B, I, E, A, N, REF, validate } from './schema.js';
import { extractJsonObject } from './json.js';

export const INTERPRETER_VERSION = 'interp-4.5';

// Contrastive examples from another town, so they never name a catalog id of the current scene. They follow the error
// clusters of P0/S1 (docs/P0_BERICHT.md §5) without repeating any case of the evaluation corpora: a test checks that no
// example message equals a corpus message.
const EXAMPLES = `Examples (another town, not the current scene):
CATALOG: PRESENT: npc.ferryman (ferryman) · OFFERS: offer.ferry (ferryman: l1 crossing 2 cp)
MESSAGE: *i paid the ferryman and crossed to the far bank* nice weather today
→ {"commands":[{"seq":1,"type":"offer.accept","offer":"offer.ferry","lines":null,"quote":"i paid the ferryman"},{"seq":2,"type":"go","to":{"new":"the far bank"},"quote":"crossed to the far bank"}]}
MESSAGE: Would the smith buy my old boots? Maybe I'll ask him tomorrow.
→ {"commands":[]}
MESSAGE: *I turn toward the cracking branches, ready my sword, and walk in the direction of the sound.*
→ {"commands":[{"seq":1,"type":"go","to":{"new":"toward the sound"},"quote":"walk in the direction of the sound"}]}
CATALOG: OBJECTS: item.starter_longsword (Starter Longsword, held by Alaric, equipped: weapon)
MESSAGE: *I get my sword out and hold it ready.*
→ {"commands":[]}
MESSAGE: I'll take a bed if it's no more than 6 copper, then sleep till morning.
→ {"commands":[{"seq":1,"type":"buy","what":"a bed for the night","from":null,"qty":null,"max_cp":6,"any_price":false,"quote":"I'll take a bed if it's no more than 6 copper"},{"seq":2,"type":"activity","kind":"sleep","what":null,"minutes":null,"until":"morning","quote":"then sleep till morning"}]}
MESSAGE: *the guard waves me through and i nod to him*
→ {"commands":[]}
CATALOG: HERE: Kestrel Ford › east gate (loc.kf.gate) · PRESENT: npc.warden (gate warden)
MESSAGE: I'm here to find work with the Guild. *the warden takes my copper and waves me on*
→ {"commands":[]}
MESSAGE: I rode in on the marsh road an hour ago and paid your toll already.
→ {"commands":[]}
CATALOG: HERE: Kestrel Ford › Guild office (loc.kf.guild_hall) · PRESENT: npc.clerk (Guild clerk) · BOARD: quest.bridge (Bridge repair · Novice · 30 cp)
MESSAGE: Hello there. I'd like to join, if you're taking new members.
→ {"commands":[{"seq":1,"type":"guild.register","quote":"I'd like to join"}]}
MESSAGE: *i stroll over to the notice wall and look over the contracts* could I sign up for the bridge one?
→ {"commands":[{"seq":1,"type":"board.read","rank":null,"quote":"i stroll over to the notice wall and look over the contracts"}]}
MESSAGE: *i pull the bridge slip and have the clerk write it into the ledger*
→ {"commands":[{"seq":1,"type":"quest.accept","quest":"quest.bridge","quote":"i pull the bridge slip and have the clerk write it into the ledger"}]}
CATALOG: JOURNEY READY: quest.wagon — "Wagon to Fenmoor": the contract's journey is underway; Alaric may continue it when he clearly agrees
MESSAGE: We wait for the stragglers and then we continue.
→ {"commands":[{"seq":1,"type":"activity","kind":"wait","what":"for the stragglers","minutes":null,"until":null,"quote":"We wait for the stragglers"},{"seq":2,"type":"journey.continue","quote":"then we continue"}]}
MESSAGE: Please sign my contract slip to show the Guild we arrived.
→ {"commands":[]}
MESSAGE: *I walk back along the road I came from.*
→ {"commands":[{"seq":1,"type":"go","to":{"new":"back along the road"},"quote":"I walk back along the road I came from"}]}`;

export const EXAMPLE_MESSAGES = [...EXAMPLES.matchAll(/^MESSAGE: (.*)$/gm)].map((m) => m[1]);

function argSummary(args) {
    const keys = Object.keys(args || {});
    return keys.length ? ` {${keys.join(', ')}}` : '';
}

/** The vocabulary part of the prompt: one line per command (the positive/negative lists are never used here). */
export function vocabularyText(vocab) {
    return vocab.commands.map((c) => `- ${c.type}${argSummary(c.args)}: ${c.summary}`).join('\n');
}

/** System prompt of the interpreter (the same for every turn; the catalog goes into the user message). */
export function interpreterSystem(vocab, { examples = true } = {}) {
    return [
        'You are the command interpreter of a text RPG engine. Translate the PLAYER MESSAGE into engine commands for Alaric, the player character. You decide no outcomes; the engine checks and books them.',
        '',
        'Rules:',
        ...vocab.rules.map((r) => `- ${r}`),
        '',
        'Commands:',
        vocabularyText(vocab),
        '',
        ...(examples ? [EXAMPLES, ''] : []),
        'Answer with {"commands": [...]}; an empty list when the message contains no such action.',
    ].join('\n');
}

/** Plain JSON per instruction: a short format line instead of the schema text; the answer is validated locally. */
export const PLAIN_FORMAT = 'Return only one JSON object, no prose before or after it, no code fences: {"commands": [{"seq": 1, "type": "<command>", <every argument of that command>, "quote": "<exact words>"}]}. Give every argument listed for the command; null when the message does not say it (any_price: false when he sets no price rule).';

function holderText(o) {
    if (!o.holder || o.holder === 'Alaric') return `held by Alaric${o.state ? `, ${o.state}` : ''}`;
    if (o.holder === 'here') return 'lying here';
    return `held by ${o.holder}`;
}

/**
 * The CATALOG block (plan §4.2). catalog: {here: {id, path}, time, alaric, present: [{id, label}], places: [{id, name}],
 * quests: [{id, title, info}], completed, board_label, board: [...], offers: [{id, seller, lines: [{id, what, price_cp}]}],
 * objects: [{id, name, qty?, unit?, holder?, state?}], open: [text]} — the shape of tests/eval/scenes.json, which the
 * engine builds from its state (src/v4/catalog.js).
 */
export function catalogText(catalog) {
    const L = ['CATALOG'];
    const here = catalog.here || {};
    L.push(`HERE: ${here.path || here.name} (${here.id})${catalog.time ? ` · ${catalog.time}` : ''}`);
    L.push(`PRESENT: ${(catalog.present || []).map((p) => `${p.id}${p.handle ? ` [${p.handle}]` : ''} (${p.label})`).join(' · ') || 'nobody besides Alaric'}`);
    if (catalog.alaric) L.push(`ALARIC: ${catalog.alaric}`);
    const places = (catalog.places || []).filter((p) => p.id !== here.id);
    if (places.length) L.push(`PLACES: ${places.map((p) => `${p.id} (${p.name})`).join(' · ')}`);
    if ((catalog.quests || []).length) L.push(`QUESTS: ${catalog.quests.map((q) => `${q.id} (${q.title} · ${q.info})`).join(' · ')}`);
    if (catalog.journey_ready) L.push(`JOURNEY READY: ${catalog.journey_ready}`);
    if ((catalog.completed || []).length) L.push(`COMPLETED TODAY: ${catalog.completed.map((q) => `${q.id} (${q.title} · ${q.info})`).join(' · ')}`);
    if ((catalog.board || []).length) L.push(`BOARD (${catalog.board_label || 'visible here'}): ${catalog.board.map((q) => `${q.id} (${q.title} · ${q.info})`).join(' · ')}`);
    if ((catalog.offers || []).length) L.push(`OFFERS: ${catalog.offers.map((o) => `${o.id} (${o.seller}: ${o.lines.map((l) => `${l.id} ${l.what} ${l.price_cp} cp`).join(', ')})`).join(' · ')}`);
    if ((catalog.objects || []).length) L.push(`OBJECTS: ${catalog.objects.map((o) => `${o.id} (${o.name}${o.qty ? `, ${o.qty}${o.unit ? ` ${o.unit}` : ''}` : ''}, ${holderText(o)})`).join(' · ')}`);
    if ((catalog.open || []).length) L.push(`OPEN DECISIONS: ${catalog.open.join(' · ')}`);
    return L.join('\n');
}

export function interpreterUser(catalog, text) {
    return `${catalogText(catalog)}\n\nPLAYER MESSAGE:\n${text}`;
}

/** The ids a catalog offers as references, by kind. */
export function catalogIds(catalog) {
    const ids = (list) => (list || []).map((x) => x.id);
    return {
        place: [...new Set([catalog.here?.id, ...ids(catalog.places)].filter(Boolean))],
        person: ids(catalog.present),
        object: ids(catalog.objects),
        quest: [...new Set([...ids(catalog.quests), ...ids(catalog.board), ...ids(catalog.completed)])],
        offer: ids(catalog.offers),
    };
}

function argSchema(spec, ids) {
    let s;
    if (spec.ref) s = REF(ids[spec.ref] || []);
    else if (spec.enum) s = E(spec.enum);
    else if (spec.array) s = A(S());
    else if (spec.type === 'integer') s = I(spec.min, spec.max);
    else if (spec.type === 'boolean') s = B();
    else s = S();
    return spec.nullable ? N(s) : s;
}

/** Strict schema of the answer: a list of commands, a discriminated union with the catalog's ids as enums. */
export function interpreterSchema(vocab, catalog) {
    const ids = catalogIds(catalog);
    const variants = vocab.commands.map((c) => {
        const props = { seq: I(1), type: E([c.type]) };
        for (const [k, spec] of Object.entries(c.args || {})) props[k] = argSchema(spec, ids);
        props.quote = S();
        return O(props);
    });
    return O({ commands: A({ anyOf: variants }) });
}

/**
 * Read an interpreter answer: the commands if the JSON is valid against the schema, else the errors for a repair.
 * @returns {{commands: object[]|null, errors: string[], raw: boolean}}
 */
export function parseInterpretation(answer, vocab, catalog) {
    const { value, error, raw } = extractJsonObject(answer);
    if (!value) return { commands: null, errors: [error || 'no JSON object'], raw: false };
    const errors = validate(value, interpreterSchema(vocab, catalog));
    if (errors.length) return { commands: null, errors: errors.slice(0, 8), raw };
    return { commands: [...value.commands].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)), errors: [], raw };
}

/** The follow-up message of the one repair call (the previous answer stays in the conversation). */
export function repairMessage(errors) {
    return `Your answer was not valid: ${errors.slice(0, 8).join('; ')}. Answer again with only the corrected JSON object, nothing else.`;
}

/**
 * The messages of an interpreter call (and of its repair, with the invalid answer and the errors appended).
 * @returns {{system: string, user: string, messages: {role, content}[]}}
 */
export function interpreterRequest(vocab, catalog, text, { previous = null, errors = null } = {}) {
    const system = `${interpreterSystem(vocab)}\n\n${PLAIN_FORMAT}`;
    const user = interpreterUser(catalog, text);
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    if (previous !== null && errors) messages.push({ role: 'assistant', content: String(previous) }, { role: 'user', content: repairMessage(errors) });
    return { system, user, messages };
}
