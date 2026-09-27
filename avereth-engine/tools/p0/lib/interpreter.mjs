// Runtime V4, P0 / S1: the prototype interpreter call (plan §4.2). Prompt, catalog and schema are generated from the
// draft vocabulary (tools/p0/draft/commands.json) and a scene (tests/eval/scenes.json). Spike code, not product code.
import fs from 'node:fs';
import path from 'node:path';
import { ENGINE_ROOT } from './util.mjs';
import { O, S, B, I, E, A, N, REF } from './schema.mjs';

export const VOCAB_FILE = path.join(ENGINE_ROOT, 'tools', 'p0', 'draft', 'commands.json');
export const SCENES_FILE = path.join(ENGINE_ROOT, 'tests', 'eval', 'scenes.json');

export function loadVocabulary(file = VOCAB_FILE) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadScenes(file = SCENES_FILE) {
    return JSON.parse(fs.readFileSync(file, 'utf8')).scenes;
}

/** The ids a scene offers as references, by kind. */
export function sceneIds(scene) {
    const ids = (list) => (list || []).map((x) => x.id);
    return {
        place: [...new Set([scene.here?.id, ...ids(scene.places)].filter(Boolean))],
        person: ids(scene.present),
        object: ids(scene.objects),
        quest: [...new Set([...ids(scene.quests), ...ids(scene.board), ...ids(scene.completed)])],
        offer: ids(scene.offers),
    };
}

function argSummary(args) {
    const keys = Object.keys(args || {});
    return keys.length ? ` {${keys.join(', ')}}` : '';
}

/** The vocabulary part of the prompt: one line per command. */
export function vocabularyText(vocab) {
    return vocab.commands.map((c) => `- ${c.type}${argSummary(c.args)}: ${c.summary}`).join('\n');
}

const EXAMPLES = `Examples (another town, not the current scene):
CATALOG: PRESENT: npc.ferryman (ferryman) · OFFERS: offer.ferry (ferryman: l1 crossing 2 cp)
MESSAGE: *i paid the ferryman and crossed to the far bank* nice weather today
→ {"commands":[{"seq":1,"type":"offer.accept","offer":"offer.ferry","lines":null,"quote":"i paid the ferryman"},{"seq":2,"type":"go","to":{"new":"the far bank"},"quote":"crossed to the far bank"}]}
MESSAGE: Would the smith buy my old boots? Maybe I'll ask him tomorrow.
→ {"commands":[]}
MESSAGE: I'll take a bed if it's no more than 6 copper, then sleep till morning.
→ {"commands":[{"seq":1,"type":"buy","what":"a bed for the night","from":null,"qty":null,"max_cp":6,"any_price":false,"quote":"I'll take a bed if it's no more than 6 copper"},{"seq":2,"type":"activity","kind":"sleep","what":null,"minutes":null,"until":"morning","quote":"then sleep till morning"}]}
MESSAGE: *the guard waves me through and i nod to him*
→ {"commands":[]}`;

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

function holderText(o) {
    if (!o.holder || o.holder === 'Alaric') return `held by Alaric${o.state ? `, ${o.state}` : ''}`;
    if (o.holder === 'here') return 'lying here';
    return `held by ${o.holder}`;
}

/** Plain mode (plan §4.3 C): a short format instruction instead of the whole schema; the answer is validated locally. */
export const PLAIN_FORMAT = 'Return only one JSON object, no prose before or after it, no code fences: {"commands": [{"seq": 1, "type": "<command>", <every argument of that command>, "quote": "<exact words>"}]}. Give every argument listed for the command; null when the message does not say it (any_price: false when he sets no price rule).';

/** The CATALOG block (plan §4.2) for a scene. */
export function catalogText(scene) {
    const L = ['CATALOG'];
    const here = scene.here || {};
    L.push(`HERE: ${here.path || here.name} (${here.id})${scene.time ? ` · ${scene.time}` : ''}`);
    L.push(`PRESENT: ${(scene.present || []).map((p) => `${p.id} (${p.label})`).join(' · ') || 'nobody besides Alaric'}`);
    if (scene.alaric) L.push(`ALARIC: ${scene.alaric}`);
    const places = (scene.places || []).filter((p) => p.id !== here.id);
    if (places.length) L.push(`PLACES: ${places.map((p) => `${p.id} (${p.name})`).join(' · ')}`);
    if ((scene.quests || []).length) L.push(`QUESTS: ${scene.quests.map((q) => `${q.id} (${q.title} · ${q.info})`).join(' · ')}`);
    if ((scene.completed || []).length) L.push(`COMPLETED TODAY: ${scene.completed.map((q) => `${q.id} (${q.title} · ${q.info})`).join(' · ')}`);
    if ((scene.board || []).length) L.push(`BOARD (${scene.board_label || 'visible here'}): ${scene.board.map((q) => `${q.id} (${q.title} · ${q.info})`).join(' · ')}`);
    if ((scene.offers || []).length) {
        L.push(`OFFERS: ${scene.offers.map((o) => `${o.id} (${o.seller}: ${o.lines.map((l) => `${l.id} ${l.what} ${l.price_cp} cp`).join(', ')})`).join(' · ')}`);
    }
    if ((scene.objects || []).length) L.push(`OBJECTS: ${scene.objects.map((o) => `${o.id} (${o.name}${o.qty ? `, ${o.qty}${o.unit ? ` ${o.unit}` : ''}` : ''}, ${holderText(o)})`).join(' · ')}`);
    if ((scene.open || []).length) L.push(`OPEN DECISIONS: ${scene.open.join(' · ')}`);
    return L.join('\n');
}

export function interpreterUser(scene, text) {
    return `${catalogText(scene)}\n\nPLAYER MESSAGE:\n${text}`;
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

/** Strict JSON schema of the answer: a list of commands, a discriminated union with catalog enums. */
export function interpreterSchema(vocab, scene) {
    const ids = sceneIds(scene);
    const variants = vocab.commands.map((c) => {
        const props = { seq: I(1), type: E([c.type]) };
        for (const [k, spec] of Object.entries(c.args || {})) props[k] = argSchema(spec, ids);
        props.quote = S();
        return O(props);
    });
    return O({ commands: A({ anyOf: variants }) });
}
