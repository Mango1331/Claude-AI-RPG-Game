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
    if (!e) return { base: String(id), named: true, kind: null };
    const known = e.known_name ?? e.name;
    if (known) return { base: titleCase(known), named: true, kind: e.kind };
    if (e.kind === 'creature') {
        const anchor = content?.anchors?.get(e.anchor || e.profile?.anchor);
        return { base: titleCase(e.species || anchor?.name || lookOf(e) || 'creature'), named: false, kind: e.kind };
    }
    const role = truth(state, id, 'occupation')[0]?.o || e.role || null;
    return { base: titleCase(role || lookOf(e) || e.descriptors?.[0] || 'stranger'), named: false, kind: e.kind };
}

const orderKey = (e) => [
    Number(e?.created?.turn ?? 0),
    Number(e?.created?.minute ?? 0),
    String(e?.id || ''),
];

/** Stable canonical handle for an entity in ordinary V4 scene play ("Footpad A", "Wolf B", "Tam Otley"). */
export function sceneHandle(state, content, id, { c = null } = {}) {
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
    // Prototype C: anonymous NPC roles only need a suffix when two people actually share the same player-facing role.
    // "Bandit Leader A · Crossbow Bandit A · Young Bandit A" conveyed three false groups in the 05.10 live run.
    // Planner-off A keeps its old always-lettered anonymous handles byte-for-byte; creatures keep A/B in both paths.
    const cPath = c === null ? (state.last?.outcome?.c === true || state.last?.outcome?.auth?.c === true) : !!c;
    if (cPath && info.kind === 'npc' && peers.length === 1) return info.base;
    const idx = Math.max(0, peers.findIndex((e) => e.id === id));
    return `${info.base} ${LETTERS[idx] || idx + 1}`;
}

export function sceneHandles(state, content, ids = state.scene?.present || []) {
    return Object.fromEntries(ids.filter((id) => id !== 'pc' && state.entities?.[id]).map((id) => [id, sceneHandle(state, content, id)]));
}

/** Current-scene tactical actors. Relevance does not confer hostile allegiance or AoE eligibility. */
export function tacticalHere(state, { friendly = true } = {}) {
    const pending = new Set((state.pending_combat || []).map((p) => p.by));
    const relevant = new Set(state.scene?.relevant || []);
    const threats = new Set(state.scene?.threats || []);
    return (state.scene?.present || []).filter((id) => {
        const e = state.entities?.[id];
        if (id === 'pc' || !e || e.status === 'dead' || !['npc', 'creature'].includes(e.kind)) return false;
        if (!state.scene.positions?.[id]?.band) return false;
        const committed = pending.has(id) || !!state.encounter?.combatants?.[id];
        // 4.3.0-c.6.6.2: a creature the story marked as no foe (threat: false, the packhorse) is no part of a hostile field
        if (!friendly) return (e.kind === 'creature' && e.threat !== false) || threats.has(id) || committed;
        return e.kind === 'creature' || relevant.has(id) || threats.has(id) || committed;
    });
}

const BANDS = ['ENGAGED', 'SHORT', 'MEDIUM', 'LONG'];
/**
 * Prototype C (4.3.0-c.6.6.6): who Alaric's one-band step brings him nearer to (or farther from) outside the fight's
 * combatants (their bands are the fight's, src/combat.js repositionPc): the one he names, else those he moves among —
 * the visible foes, and only when there are none the others here (live 18.10.2026: "I walk in front of them" in the
 * pups' den). A bystander beside the foes he steps toward stays as near as the story put them.
 * @returns {{id: string, from: string, to: string}[]} only those whose band changes
 */
export function approachedBy(state, { move = null, moveTarget = null } = {}) {
    if (move !== 'closer' && move !== 'away') return [];
    const foes = tacticalHere(state, { friendly: false });
    const among = moveTarget ? [moveTarget] : foes.length ? foes : tacticalHere(state);
    return among.filter((id) => id !== 'pc' && (state.scene?.present || []).includes(id) && !state.encounter?.combatants?.[id]
        && state.entities?.[id] && state.entities[id].status !== 'dead' && BANDS.includes(state.scene.positions?.[id]?.band))
        .map((id) => {
            const from = state.scene.positions[id].band;
            const to = BANDS[Math.max(0, Math.min(BANDS.length - 1, BANDS.indexOf(from) + (move === 'closer' ? -1 : 1)))];
            return { id, from, to };
        }).filter((x) => x.from !== x.to);
}

/**
 * Prototype C (4.3.0-c.6.6.6, live 18.10.2026: Feral Hounds B, C and D stood ENGAGED with Alaric, the fight held only
 * Hound A, and his Arcane Burst struck A alone): ENGAGED is how near someone is to him, not whether they fight. An area
 * attack centred on him catches everyone present ENGAGED with him after the one-band step he declares with it (see
 * approachedBy): foe, bystander or friend. These are the ones outside the fight; they enter it when the attack happens
 * (src/engine.js). Who stands farther off is not caught.
 * @returns {string[]}
 */
export function areaCaught(state, { move = null, moveTarget = null } = {}) {
    const stepped = new Map(approachedBy(state, { move: move === 'closer' ? 'closer' : null, moveTarget }).map((x) => [x.id, x.to]));
    return (state.scene?.present || []).filter((id) => {
        const e = state.entities?.[id];
        if (id === 'pc' || !e || e.status === 'dead' || !['npc', 'creature'].includes(e.kind) || state.encounter?.combatants?.[id]) return false;
        return (stepped.get(id) || state.scene.positions?.[id]?.band) === 'ENGAGED';
    });
}

/** Where someone stands from him: the fight's distance for a combatant, the scene's for anyone else. */
const bandOf = (state, id) => state.encounter?.combatants?.[id]?.current?.band ?? state.scene?.positions?.[id]?.band ?? null;
/** Someone a strike can still land on: alive, and in a fight neither down, gone nor yielded. */
function standing(state, id) {
    const e = state.entities?.[id];
    if (id === 'pc' || !e || e.status === 'dead' || !['npc', 'creature'].includes(e.kind)) return false;
    const c = state.encounter?.combatants?.[id];
    return !c || (!c.current.defeated && !c.current.escaped && !c.current.surrendered);
}

/**
 * Patch 7.1: the close knot someone stands in (a cluster: those within a stride or two of each other), or null when they
 * stand alone. Only the story establishes it (src/v4/world.js: the cluster of a position, or of creature.new when the
 * reply shows a group packed close; "apart" sets someone alone). A group's name is who they are, never where they stand
 * (final review of Patch 7.1): a pack of twelve may be spread over a cavern, so belonging to one group, or one kind,
 * puts no one in a knot. A cluster counts only among those at the same distance from Alaric (burstCaught): one of the
 * knot that the fight or a step moved away has left it.
 */
export function clusterOf(state, id) {
    return state.scene?.positions?.[id]?.cluster ?? null;
}

/**
 * Hotfix c.6.6.18, Patch 7.1: where a thrown burst (an offensive item, reaching `range`) lands when he names no one: of
 * the foes in sight (in a fight its foes too, at the fight's distances) within its reach, the knot with the most of them
 * (a foe standing alone is a knot of one), the nearer one on a tie; it is thrown at the first of that knot. Null when no
 * foe is within its reach.
 */
export function burstAim(state, range) {
    const reach = BANDS.indexOf(range);
    const fight = Object.values(state.encounter?.combatants || {}).filter((c) => c.side === 'hostile').map((c) => c.id);
    const foes = [...new Set([...fight, ...tacticalHere(state, { friendly: false })])].filter((id) => standing(state, id) && BANDS.indexOf(bandOf(state, id)) >= 0 && BANDS.indexOf(bandOf(state, id)) <= reach);
    let best = null;
    for (const id of foes) {
        const knot = burstCaught(state, id).filter((x) => foes.includes(x));
        const nearer = best && BANDS.indexOf(bandOf(state, id)) < BANDS.indexOf(bandOf(state, best[0]));
        if (!best || knot.length > best.length || (knot.length === best.length && nearer)) best = knot;
    }
    return best ? best[0] : null;
}

/**
 * Hotfix c.6.6.18, Patch 7.1: whom a burst thrown at `target` strikes: that one and everyone in the same knot with it
 * (clusterOf) at the same distance from him, foe, bystander or friend (the fire does not choose), in the fight's order
 * and then the scene's, however many they are. No cap: the burst's size is the knot's, never a number of victims. The
 * engine's whole knowledge of where they stand is their distance from him and the knots the story established; it
 * strikes no one else, never everyone of a room, a distance or a kind because they are there.
 */
export function burstCaught(state, target) {
    const band = bandOf(state, target);
    if (!band || !standing(state, target)) return [];
    const knot = clusterOf(state, target);
    if (!knot) return [target];
    const pool = [...new Set([...Object.keys(state.encounter?.combatants || {}), ...(state.scene?.present || [])])];
    return [target, ...pool.filter((id) => id !== target && standing(state, id) && bandOf(state, id) === band && clusterOf(state, id) === knot)];
}

/**
 * Prototype C (4.3.0-c.6.6.6, review): the side someone his area attack catches stands on in the fight it opens or
 * joins: a foe of the scene stays one (tacticalHere without the friendly), someone friendly toward Alaric (attitude
 * 20 and more) is on his side, anyone else is no party to it. Being caught changes none of it; what they do about the
 * strike is their own answer on their Turns (src/combat.js asideTurn).
 * @returns {'hostile'|'ally'|'neutral'}
 */
export function sideOf(state, id) {
    if (state.encounter?.combatants?.[id]) return state.encounter.combatants[id].side;
    if (tacticalHere(state, { friendly: false }).includes(id)) return 'hostile';
    return (state.relations?.[`rel.${id}.attitude.pc`]?.value ?? 0) >= 20 ? 'ally' : 'neutral';
}
