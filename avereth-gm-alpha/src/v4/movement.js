// Location architecture .190, stage 2 (docs/LOCATION_ARCHITECTURE_190.md; plan A2 on main, GPT counter-review §A-1/A-2):
// the movement proof. The GO handler decides once what a step is – its target, its kind, the Dungeon and level it goes
// into, the scope a new place of its target lies in – and stores it on the step (outcome.auth.gos, swipe-stable). The
// parser, the World and every check read this decision; none of them works the target, the Dungeon or the scope out
// again from the reply's words.
//
// The proof never says that Alaric arrives (canon §2: an arrival is a confirmed report). It says which arrivals this
// step would allow: its target, a stop on its known way, a place on the way there (the road, the town before its hall),
// and – for a step to a place not known yet – the one new place that becomes it, inside the step's scope. A scope is
// never a destination: another place of the same town or realm is not reached because it lies there.
import { lineage, sameSettlement, settlementOf, realmOf } from './domain.js';
import { dungeonOf, trueDungeonOf, isRoom } from './dungeon.js';
import { placeIdentity } from './place_refs.js';

/**
 * The fixed fields of a step, decided by the GO handler at authorization.
 * @returns {{mode: string, enter: {dungeon: string, root: string|null, gate: boolean}|null, scope: string|null}}
 *   mode   'within' (a new part of the habitat he is in), 'continue' (a stored journey or goal), 'dungeon' (into or
 *          inside a dungeon or a building of rooms), 'local' (another place of his settlement), 'travel'
 *   enter  the dungeon (or building of rooms) the step goes to or goes on in; gate: the step goes to a true Dungeon's
 *          gate from outside it (arriving there is not yet being inside)
 *   scope  where a new place told for this step lies: the habitat (within), the Dungeon he set out for from outside
 */
export const GATE_WORDS = /\b(?:mouth|entrance|entry|gate|gates|threshold|opening|cleft|portal|doorway)\b/i;

export function stepFields(s, go) {
    const here = s.scene?.at;
    // a step to a place not known yet: the place its words already mean (an older plan's {new: "the Mossback Warrens"})
    const dest = go.to && s.places?.[go.to] ? go.to
        : !go.to && go.newName && !go.journey && !go.intent && !go.within ? placeIdentity(s, { new: { name: go.newName, kind: 'site' } }) : null;
    const dun = dest ? dungeonOf(s, dest) : !go.to && !go.journey && !go.intent ? dungeonOf(s, here) : null;
    const root = dest ? trueDungeonOf(s, dest) : dun ? trueDungeonOf(s, here) : null;
    const mode = go.within ? 'within' : go.journey || go.along || (go.intent && !go.to) ? 'continue' : dun ? 'dungeon'
        : dest && sameSettlement(s, dest, here) ? 'local' : 'travel';
    // gate: the step's words name a true Dungeon's way in (the Grotto mouth, its entrance) from outside: it ends at the
    // gate, arriving there is not yet being inside (GPT counter-review §A-2); a step to the Dungeon by its name goes in
    // through the gate check (world.js wayRefused)
    const enter = dun ? { dungeon: dun, root: root || null, gate: !!go.way_in && !!root && dest === root && trueDungeonOf(s, here) !== root } : null;
    const scope = go.within ? go.within : root && root !== trueDungeonOf(s, here) ? root : null;
    return { mode, enter, scope, ...(dest && !go.to ? { meant: dest } : {}) };
}

/** The step as stored, or – for a record from before .190 – its fields worked out once now from the same rules. */
export function stepOf(s, go) {
    // a step whose target is still words ({new}) has no place id
    if (go.to != null && typeof go.to !== 'string') {
        const words = typeof go.to.new === 'string' ? go.to.new : go.to.new?.name;
        go = { ...go, to: null, newName: go.newName || words || null };
    }
    return go.mode ? go : { ...go, ...stepFields(s, go) };
}

/** The steps of this turn (outcome.auth.gos), each with its fields. */
export const stepsOf = (s, gos) => (gos || []).map((g) => stepOf(s, g));

/** The parent of a new place told on arrival for a step whose scope fixes it: the habitat, or the Dungeon. */
export function newPlaceScope(answer, s) {
    const steps = stepsOf(s, s.last?.outcome?.auth?.gos).filter((g) => g.scope && (g.mode !== 'within' || (s.places[g.scope]?.population && lineage(s, s.scene.at).includes(g.scope))));
    if (!steps.length) return answer;
    const rewrite = (value) => {
        if (Array.isArray(value)) return value.map(rewrite);
        if (!value || typeof value !== 'object') return value;
        const fresh = value.new;
        if (fresh && typeof fresh === 'object' && ['site', 'wilderness', 'interior'].includes(fresh.kind)) {
            // the new place this step's confirmed arrival names (expected.<seq>.at), never another one of the reply
            const hits = steps.filter((g) => {
                const e = answer.expected?.[String(g.seq)];
                return e?.arrived === true && e.at?.new && norm(e.at.new.name) === norm(fresh.name);
            });
            if (hits.length === 1) {
                const { scope, mode } = hits[0];
                const habitat = mode === 'within';
                const parent = fresh.parent;
                const implied = parent == null || (habitat && typeof parent === 'string'
                    && ['realm', 'region'].includes(s.places[parent]?.kind) && lineage(s, scope).includes(parent));
                if ((habitat || fresh.kind === 'interior') && implied) return { ...value, new: { ...fresh, parent: scope } };
            }
        }
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v)]));
    };
    return rewrite(answer);
}
const norm = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * May this step's report put him at `to`? One decision for every place (A2 allowedArrival): null when allowed, else
 * {why}. `fresh`: the place is new in this reply; `reached(seq)`: the reply's report says this step reached its target
 * (expected.<seq>.arrived). Dungeon ways (links, seals, gate fee, level) stay the topology's (world.js wayRefused).
 */
export function allowedArrival(s, steps, to, { fresh = false, forced = false, reached = () => false } = {}) {
    if (forced || !steps.length || !s.places[to]) return null;
    const here = s.scene.at;
    const up = (id) => lineage(s, id);
    const p = s.places[to];
    // a room of a dungeon (or a building of rooms) he is not in: only by a step that sets out for it
    const roomElsewhere = isRoom(s, to) && dungeonOf(s, to) !== dungeonOf(s, here);
    for (const g of steps) {
        if (g.mode === 'continue' && !g.to) return null; // a stored journey goes on along its own road (canon §2)
        const target = g.to || g.meant || null;
        if (target === to || (g.stop && g.stop === to)) return null;
        if (g.mode === 'within') {
            // a local hunt exploration: the habitat and its parts, never an independent place beside it
            if (g.scope && (to === g.scope || up(to).includes(g.scope))) return null;
            continue;
        }
        if (g.enter && dungeonOf(s, to) === g.enter.dungeon) {
            // gate arrival is not being inside: a step to the gate from outside ends at the gate
            if (g.enter.gate && to !== g.enter.root) return { why: `he set out for the gate of ${s.places[g.enter.root].name}; going in is his next step`, gate: g.enter.root };
            return null; // a part of the dungeon he goes on in or set out for: its way is the topology's
        }
        if (roomElsewhere) continue;
        if (target) {
            // on the way there: the road of the land, the town before its hall; a part of the place he set out for
            if (up(target).includes(to) && !isRoom(s, to)) return null;
            if (p.kind === 'realm' && (up(here).includes(to) || up(target).includes(to))) return null;
            if (s.places[target].kind === 'settlement' && up(to).includes(target) && p.kind !== 'interior') return null;
            if (fresh && up(to).includes(target)) return null;
            if (fresh && p.kind === 'settlement' && label(s.places[target].name).startsWith(`${label(p.name)} `)) return null;
            // a stop short of it the report gives as such (the target not reached: .181 P2-2), on the way there: in the
            // town he is in or the target's, or out in the land between (control review of .190, R5: never a stop in a
            // third town); a scope is no destination: "reached" at another place of the same town or realm is not
            if (!reached(g.seq) && onTheWay(s, here, target, to)) return null;
            continue;
        }
        // a step to a place not known yet: the one new place it establishes inside its scope, or the known place the
        // reply's confirmed report names for his words (the narrated arrival is the only evidence of which it was)
        if (!fresh || !g.scope || up(to).includes(g.scope)) return null;
    }
    if (roomElsewhere) return { why: `${p.name} lies in ${s.places[dungeonOf(s, to)].name}, where he did not set out for` };
    return { why: `${p.name} is not where his step goes (${steps.map((g) => (g.to ? s.places[g.to]?.name || g.to : g.newName || g.name || 'his way')).join(', ')})` };
}
const label = (t) => norm(t).replace(/^the /, '');
/** Is `to` on the way from here to the target: in either's town, or out in either's realm (never inside a third town)? */
function onTheWay(s, here, target, to) {
    const town = settlementOf(s, to);
    if (town) return town === settlementOf(s, here) || town === settlementOf(s, target);
    const realm = realmOf(s, to);
    return !!realm && (realm === realmOf(s, here) || realm === realmOf(s, target));
}

