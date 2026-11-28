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
import { aheadEvents, gateCheck } from './living.js';
import { following } from '../party.js';
import { sectionsOf, sectionId } from './sections.js';
import { placeIdentity, samePlace } from './place_refs.js';

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

/** Describe the authorized destination at request time, without changing the saved action. */
export function travelTargetLines(state, content, outcome, narrator = false) {
    const lines = [];
    for (const go of outcome?.auth?.gos || []) {
        const root = go.enter?.root;
        const gate = state.dungeons?.[root]?.gate;
        if (!go.to || (narrator && !gate)) continue;
        lines.push(`GO ${go.seq}: ${go.to}.` + (gate && root === go.to
            ? ` Its access (${gate.text || gate.names?.join(', ')}) is ${root}. Only a crossing reaches an interior section.` : ''));
        if (state.scene.approaching === go.to) lines.push('Continuation from the last stop: account only for the remaining walk.');
        if (!gate || go.section || go.to !== root || root === state.scene.at) continue;
        const group = 1 + new Set([...following(state).map(m=>m.who), ...(go.with || [])]).size;
        const terms = gateCheck(state,content,root,{group});
        if (terms) lines.push(terms.refuse || `Entry requires the keeper's fee of ${terms.fee} cp.`);
        else if (!narrator && journeySection(state,go)) {
            lines.push(`If the reply ends just inside, report ${firstSection(state,root)} for the first section.`);
        } else if (narrator && !go.enter.gate && !outcome.auth.pulse?.open) {
            const preview = aheadEvents(state,content,{into:true,root,floor:1,section:1});
            if (preview) lines.push('Only if he actually crosses the gate:', ...preview.lines);
        }
    }
    return lines;
}

/** Identify the reported endpoint of each GO. This never authorizes an arrival.
 * An unnamed search among several stops needs its existing optional at reference.
 * Receipt matching and the actual place reached stay separate until World accepts the move.
 */
export function reportedEndpoints(answer, state, content, rejected = []) {
    const goals = stepsOf(state, state.last?.outcome?.auth?.gos);
    const arrivals = Array.isArray(answer?.deltas) ? answer.deltas.filter(d => d?.type === 'arrive' && !d.forced_by) : [];
    const ends = new Map();
    for (const g of goals) {
        const e = answer?.expected?.[g.seq];
        const root = g.enter?.root;
        // A step explicitly entering previews a particular section. Reaching only
        // its gate is a valid stop but does not complete that objective.
        const first = journeySection(state,g);
        const interior = first &&
            arrivals.some(d => sectionReport(state,root,first,d.at));
        const ref = g.section?.id || (interior ? first : g.to) || e?.at;
        if (ref) ends.set(String(g.seq), ref);
    }
    const unresolved = goals.filter(g => !ends.has(String(g.seq)) && answer?.expected?.[g.seq]?.arrived === true);
    const unassigned = arrivals.filter(d => ![...ends.values()].some(ref => samePlace(state,d.at,ref,content)));
    if (unresolved.length === 1 && unassigned.length === 1 && !rejected.some(r => r.delta?.type === 'arrive'))
        ends.set(String(unresolved[0].seq),unassigned[0].at);
    return ends;
}

// Only place-typed fields participate. NPCs, item references, evidence and other
// uses of {new: "..."} belong to different namespaces.
function mapReportPlaces(answer, vocab, transform) {
    const types = new Map((vocab?.deltas || []).map(d => [d.type, d.fields]));
    const copy = {...answer};
    if (answer.scene != null) copy.scene = transform(answer.scene);
    copy.deltas = answer.deltas.map(d => {
        if (!d || typeof d !== 'object') return d;
        const next = {...d};
        for (const [key, field] of Object.entries(types.get(d.type) || {}))
            if (field.ref === 'place' && d[key] != null) next[key] = transform(d[key]);
        if (d.scene != null) next.scene = transform(d.scene);
        return next;
    });
    return copy;
}

function reportPlaceIdentity(answer, state, content) {
    if (!content?.deltaVocab || !Array.isArray(answer?.deltas)) return answer;
    const byName = new Map();
    // A short reference can repeat a declaration but cannot supply its missing kind or parent.
    const key = ref => {
        const n = ref?.new;
        return n && typeof n === 'object' ? JSON.stringify([n.name,n.kind,n.parent ?? null]) : null;
    };
    function collect(ref) {
        const n = ref?.new;
        if (typeof n?.name !== 'string') return ref;
        const prior = byName.get(n.name);
        if (!byName.has(n.name)) byName.set(n.name,ref);
        else if (key(prior) !== key(ref)) byName.set(n.name,null);
        if (n.parent?.new?.name) collect(n.parent);
        return ref;
    }
    mapReportPlaces(answer,content.deltaVocab,collect);
    const declared = ref => typeof ref?.new === 'string' ? byName.get(ref.new) || ref : ref;
    const stops = answer.deltas.filter(d => d?.type === 'arrive' && !d.forced_by).map(d=>declared(d.at));
    const aliases = new Map();
    const goals = stepsOf(state, state.last?.outcome?.auth?.gos);
    const root = goals.length === 1 && goals[0].enter?.root;
    const gate = state.dungeons?.[root]?.gate;
    const nameOf = ref => typeof ref?.new === 'string' ? ref.new : ref?.new?.name;
    // An outside landing can have its own description. Bind it only when the
    // report connects this very access to a room of the chosen dungeon AND
    // identifies the established gate. A different stop in the same realm is free.
    if (gate && goals[0].to === root && state.scene.at !== root) {
        const candidates = stops.filter(ref => {
            const n = ref?.new;
            return n?.kind === 'site' && key(byName.get(n.name)) === key(ref) &&
                n.parent === state.places[root]?.realm &&
                gate.names?.some(alias => (' '+norm(n.name)+' ').includes(' '+norm(alias)+' '));
        });
        for (const ref of candidates) {
            const touches = stops.filter(child => child?.new?.kind === 'interior' &&
                nameOf(child.new.parent) === ref.new.name && key(byName.get(nameOf(child))) === key(child));
            const linked = touches.filter(child => answer.deltas.some(link => link?.type === 'passage' &&
                nameOf(link.from) === nameOf(child) && declared(link.to)?.new?.parent === root));
            if (linked.length === 1 && candidates.length === 1) {
                aliases.set(ref.new.name, root);
                aliases.set(nameOf(linked[0]), root);
            }
        }
    }
    function resolve(ref, depth = 0) {
        if (!ref || typeof ref !== 'object' || Object.keys(ref).length !== 1 || depth > 2) return ref;
        const full = declared(ref);
        if (!full?.new?.name) return ref;
        const n = full.new;
        if (aliases.has(n.name) && byName.get(n.name) &&
            key(byName.get(n.name)) === key(full) &&
            Object.keys(n).every(k => ['name','kind','parent'].includes(k))) return aliases.get(n.name);
        if (typeof n.parent === 'object' && n.parent) return {new:{...n,parent:resolve(n.parent,depth+1)}};
        return full;
    }
    return mapReportPlaces(answer,content.deltaVocab,ref=>resolve(ref));
}

/** A journey to the dungeon may physically end in its first section. A trip only
 * to the gate, or a reserved section of an interior route, has its own endpoint. */
export function journeySection(state, go) {
    const root = go.enter?.root;
    return root && go.to === root && !go.enter.gate && !go.section &&
        trueDungeonOf(state,state.scene.at) !== root ? firstSection(state,root) : null;
}

export function firstSection(state, root) {
    return sectionsOf(state,root,1)[0] || sectionId(root,1,1);
}

/** A location claim for a specific engine section, before any node is made. */
export function sectionReport(state, root, id, ref) {
    if (!root || !id) return false;
    if (ref === id) return true;
    const n = ref?.new;
    const parent = n?.parent ?? state?.scene?.at;
    return !!state?.places?.[parent] && ['interior','site'].includes(n?.kind) &&
        trueDungeonOf(state,parent) === root;
}

/** Resolve an X receipt against the same destination/preview used by World. */
export function reportsEndpoint(state, go, endpoint, ref, content) {
    if (endpoint && samePlace(state, endpoint, ref, content)) return true;
    const root = go.section?.root || go.enter?.root;
    return !!root && !go.enter?.gate && (!!go.section || endpoint === firstSection(state,root)) &&
        sectionReport(state,root,endpoint,ref);
}

/** Normalize the place declarations and the scoped arrival in both X and World. */
export function newPlaceScope(answer, s, rejected = [], content = null) {
    answer = reportPlaceIdentity(answer, s, content);
    const steps = stepsOf(s, s.last?.outcome?.auth?.gos).filter((g) => g.scope && (g.mode !== 'within' || (s.places[g.scope]?.population && lineage(s, s.scene.at).includes(g.scope))));
    if (!steps.length) return answer;
    const ends = reportedEndpoints(answer,s,null,rejected);
    const rewrite = (value) => {
        if (Array.isArray(value)) return value.map(rewrite);
        if (!value || typeof value !== 'object') return value;
        const fresh = value.new;
        if (fresh && typeof fresh === 'object' && ['site', 'wilderness', 'interior'].includes(fresh.kind)) {
            // the new place this step's confirmed arrival names (expected.<seq>.at), never another one of the reply
            const hits = steps.filter((g) => {
                const e = answer.expected?.[String(g.seq)];
                return e?.arrived === true && (norm((e.at || ends.get(String(g.seq)))?.new?.name) === norm(fresh.name) || (g.section && norm(g.section.name) === norm(fresh.name)));
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
    // A nested parent is still a place reference. Do not project scope into
    // arbitrary NPC, inventory or evidence fields.
    if (content?.deltaVocab && Array.isArray(answer?.deltas)) {
        const normalized = mapReportPlaces(answer,content.deltaVocab,rewrite);
        if (answer.expected) normalized.expected = Object.fromEntries(Object.entries(answer.expected).map(([seq,e]) =>
            [seq,e?.at ? {...e,at:rewrite(e.at)} : e]));
        return normalized;
    }
    return rewrite(answer);
}
/** A report of the entrance on a step that already targets that established gate. */
export function gateAlias(s, ref) {
    const place = ref?.new;
    const root = place?.parent || trueDungeonOf(s, s.scene.at);
    if (!place?.name || !s.places[root]?.dungeon?.real || trueDungeonOf(s, s.scene.at) !== root
        || !/(?:^|\b)(?:entry tunnel|entrance tunnel|dungeon exit|dungeon entrance|entrance gate|entrance mouth)\b/i.test(place.name) || !(s.last?.outcome?.auth?.gos || []).some(go => go.to === root))
        return null;
    return root;
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

