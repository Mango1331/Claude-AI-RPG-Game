// Architecture package C (.132, patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md §5): explicit population
// membership and life stage of a new creature, one rule for the extractor's parser (a semantic issue it may repair) and
// for World (which refuses the creature when the repair did not settle it). Membership is the extractor's statement,
// validated at the confirmed place of the event and its ancestors; it is never derived from a name, never from a level,
// and it puts no creature anywhere (membership is no presence).
import { lineage } from './domain.js';
import { trueDungeonOf } from './dungeon.js';

export const INDEPENDENT = 'independent';
export const LIFE_STAGES = ['adult', 'young'];

/** The populations a creature met at this place may belong to: the place itself and its ancestors; none in a Dungeon. */
export function populationsAt(state, at) {
    if (!at || !state.places?.[at] || trueDungeonOf(state, at)) return [];
    return lineage(state, at).filter((id) => state.places[id]?.population);
}

/**
 * Validate a creature.new's population and life_stage at the place of its event (at: a known place id, or null when the
 * report establishes none: a remote sighting without its place). Returns { why } for a semantic issue, else the values
 * World stores: { population: place id | null (independent), life_stage, anchor: the canonical body plan or null }.
 */
export function creatureContract(state, content, at, d) {
    const stage = d.life_stage ?? null;
    const pop = d.population ?? null;
    const dungeon = at && state.places?.[at] ? trueDungeonOf(state, at) : null;
    const badStage = { why: `life_stage must be "adult" or "young" (the reply's age of ${d.species || d.ref || 'this creature'}; "young" only for juveniles: young, cubs, pups, yearlings ...)` };
    if (dungeon) {
        // a true Dungeon's creatures belong to no outdoor population: missing or independent mean just that; its
        // encounters keep their own identity, body plan and level (src/v4/living.js), so no age is required there
        if (stage !== null && !LIFE_STAGES.includes(stage)) return badStage;
        if (pop === null || pop === INDEPENDENT) return { population: null, life_stage: stage, anchor: null };
        return { why: `population: ${pop} is an outdoor population; a creature inside the Dungeon ${state.places[dungeon]?.name || dungeon} belongs to none (use "${INDEPENDENT}")` };
    }
    if (!LIFE_STAGES.includes(stage)) return badStage;
    const valid = populationsAt(state, at);
    const options = [...valid.map((id) => `${id} (${state.places[id].population.species}, ${state.places[id].population.anchor})`), `"${INDEPENDENT}"`].join(', ');
    if (pop === null) return { why: `population is required for a creature met outside a Dungeon: the id of the population it belongs to at this place or above it, else "${INDEPENDENT}" (here: ${options})` };
    if (pop === INDEPENDENT) return { population: null, life_stage: stage, anchor: null };
    if (!valid.includes(pop)) return { why: `population: ${pop} is no population of ${at ? state.places[at]?.name || at : 'an established sighting place'} or its ancestors (here: ${options}); a creature that belongs to none is "${INDEPENDENT}"` };
    // the population's body plan is canonical for its members; the report's own body plan must be that one (a giant
    // boar reported into a turtle population is no member: GiantBoar ≠ Turtle)
    const population = state.places[pop].population;
    if (d.anchor !== population.anchor) return { why: `population: ${pop} holds ${population.species} (body plan ${population.anchor}); ${d.species || d.ref} (body plan ${d.anchor}) is no member of it: give its own population or "${INDEPENDENT}"` };
    return { population: pop, life_stage: stage, anchor: population.anchor };
}

/** The life stage of a creature: its stored one; an entity of an older record has none (namesYoung decides there). */
export const lifeStageOf = (e, young) => e?.life_stage || (young ? 'young' : 'adult');
