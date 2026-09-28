// Runtime V4: stable player-facing handles for people/creatures before combat.
// They are views over canonical entity ids, never a second identity system. Anonymous actors keep the same
// A/B/C handle across scene changes and when another peer leaves; named actors use the name the story established.
import { truth, lookOf } from '../knowledge.js';
import { normText } from '../util.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const titleCase = (s) => String(s || '').replace(/^(?:the|a|an)\s+/i, '').trim()
    .replace(/(^|[\s-])(\p{Ll})/gu, (_, a, b) => a + b.toUpperCase());

function baseOf(state, content, id) {
    const e = state.entities[id];
    if (!e) return { base: String(id), named: true };
    const known = e.known_name ?? e.name;
    if (known) return { base: titleCase(known), named: true };
    if (e.kind === 'creature') {
        const anchor = content?.anchors?.get(e.anchor || e.profile?.anchor);
        return { base: titleCase(e.species || anchor?.name || lookOf(e) || 'creature'), named: false };
    }
    const role = truth(state, id, 'occupation')[0]?.o || e.role || null;
    return { base: titleCase(role || lookOf(e) || e.descriptors?.[0] || 'stranger'), named: false };
}

const orderKey = (e) => [
    Number(e?.created?.turn ?? 0),
    Number(e?.created?.minute ?? 0),
    String(e?.id || ''),
];

/** Stable canonical handle for an entity in ordinary V4 scene play ("Footpad A", "Wolf B", "Tam Otley"). */
export function sceneHandle(state, content, id) {
    if (id === 'pc') return state.entities.pc?.name || 'Alaric';
    const info = baseOf(state, content, id);
    if (info.named) return info.base;
    const peers = Object.values(state.entities || {}).filter((e) => {
        if (!e || e.id === 'pc' || (e.kind !== 'npc' && e.kind !== 'creature')) return false;
        const x = baseOf(state, content, e.id);
        return !x.named && normText(x.base) === normText(info.base);
    }).sort((a, b) => {
        const ka = orderKey(a), kb = orderKey(b);
        return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2]);
    });
    const idx = Math.max(0, peers.findIndex((e) => e.id === id));
    return `${info.base} ${LETTERS[idx] || idx + 1}`;
}

export function sceneHandles(state, content, ids = state.scene?.present || []) {
    return Object.fromEntries(ids.filter((id) => id !== 'pc' && state.entities?.[id]).map((id) => [id, sceneHandle(state, content, id)]));
}
