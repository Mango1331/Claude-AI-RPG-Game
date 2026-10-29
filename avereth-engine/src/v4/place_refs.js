// Read-only identity of a reported place. The World handler alone creates nodes.
import { normText } from '../util.js';
import { PLACE_PARENTS, guildDestination, settlementOf, lineage } from './domain.js';
import { dungeonOf, roomByName } from './dungeon.js';
import { knownByName } from './known.js';
import { entranceOf } from './living.js';

export function placeParent(s, kind, id, c = false) {
    // A named part of an established habitat keeps that population's ancestry.
    if (c && kind === 'wilderness' && s.places[id]?.kind === 'site'
        && lineage(s, id).some(p => s.places[p].population)) return id;
    const allowed = [...(PLACE_PARENTS[kind] || []), ...(c && kind === 'interior' ? ['wilderness'] : []), ...(c && kind === 'site' ? ['realm'] : [])];
    for (let i = 0; i < 6 && id && !allowed.includes(s.places[id]?.kind); i++) id = s.places[id]?.parent;
    return id;
}

export function placeIdentity(s, ref, content, { c = true, reported = false, depth = 0 } = {}) {
    if (ref === 'here') return s.scene.at;
    if (typeof ref === 'string') return s.places[ref] ? ref : null;
    const n = ref?.new;
    if (!n || typeof n !== 'object' || !n.name || depth > 1) return null;
    const opts = { c, reported, depth: depth + 1 };
    const rawParent = n.parent == null ? s.scene.at : placeIdentity(s, n.parent, content, opts);
    const hall = guildDestination(s, n.name, settlementOf(s, rawParent || s.scene.at), { allowNew: c && s.meta.ruleset >= 2 });
    if (hall?.id || hall?.error) return hall.id || null;
    const gate = c && content ? entranceOf(s, content, ref) : null;
    if (gate) return gate;
    const parent = placeParent(s, n.kind, rawParent, c);
    if (!parent || !s.places[parent]) return null;
    const dun = ['interior', 'site'].includes(n.kind) ? dungeonOf(s, parent) : null;
    if (dun) {
        const room = roomByName(s, dun, n, s.scene.at);
        return room?.ambiguous ? null : room?.id || null;
    }
    const hits = Object.values(s.places).filter(p => p.parent === parent && normText(p.name) === normText(n.name));
    if (hits.length === 1) return hits[0].id;
    if (hits.length > 1) return null;
    const realm = s.places[parent]?.realm ?? null;
    const known = knownByName(s, n.name, realm, { reportedOnly: !reported });
    if (known) return known.id;
    const label = normText(n.name).replace(/^the /, '');
    const aliases = Object.values(s.places).filter(p => p.realm === realm && (p.known === 'reported' || p.dungeon?.real) && normText(p.name).replace(/^the /, '') === label);
    return aliases.length === 1 ? aliases[0].id : null;
}

export function placeKey(s, ref, content) {
    const id = s && placeIdentity(s, ref, content);
    if (id) return id;
    const n = ref?.new;
    if (!n || typeof n !== 'object') return ref;
    const raw = n.parent == null ? s?.scene.at ?? null : placeKey(s, n.parent, content);
    const parent = s?.places[raw] ? placeParent(s, n.kind, raw, true) : raw;
    return JSON.stringify([normText(n.name || ''), n.kind, parent]);
}
export const samePlace = (s, a, b, content) => placeKey(s, a, content) === placeKey(s, b, content);

/** Preserve only a player-authorized local habitat relation for the arrival's new place.
 * No scope, unconfirmed arrival, known/independent parent or unrelated name: unchanged.
 */
export function scopedPlaces(answer, state) {
    const scopes = (state.last?.outcome?.auth?.gos || []).filter(g => g.within
        && state.places[g.within]?.population && lineage(state, state.scene.at).includes(g.within));
    if (!scopes.length) return answer;
    const rewrite = value => {
        if (Array.isArray(value)) return value.map(rewrite);
        if (!value || typeof value !== 'object') return value;
        const fresh = value.new;
        if (fresh && typeof fresh === 'object' && ['site', 'wilderness', 'interior'].includes(fresh.kind)) {
            const hits = scopes.filter(g => {
                const expected = answer.expected?.[String(g.seq)];
                return expected?.arrived === true && expected.at?.new
                    && normText(expected.at.new.name) === normText(fresh.name);
            });
            if (hits.length === 1) {
                const root = hits[0].within;
                const parent = fresh.parent;
                if (parent == null || (typeof parent === 'string' && ['realm', 'region'].includes(state.places[parent]?.kind) && lineage(state, root).includes(parent)))
                    return { ...value, new: { ...fresh, parent: root } };
            }
        }
        return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, rewrite(v)]));
    };
    return rewrite(answer);
}
