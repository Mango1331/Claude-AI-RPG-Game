// Architecture package C (.132): the transparent conversion of a recorded extractor answer written before the population
// and age contract (patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md §8.2: "Schemaänderungen mit transparent
// umgerechneten Offline-Testdaten prüfen"). Old answers carry no population and no life_stage on creature.new; the
// conversion writes what the engine of .126 read into them, so a replay shows only what the new rules decide
// differently, never an invented model answer:
//   - life_stage: "young" when the species words name a young one (.126: namesYoung on the species), else "adult";
//   - population: the population the .126 name reading bound the creature to at the place of its event (populationAt,
//     body plan not compared), else "independent"; a remote sighting without a known place, a place inside a true
//     Dungeon: "independent" (.126 bound neither);
//   - anchor: a member takes its population's body plan (.126 world.newEntity did the same).
// A field the answer already states is kept (null is what the parser's normalization fills in, not a statement). The
// archive and the recorded answers stay unchanged; the conversion runs on the copy handed to the engine
// (tools/replay/replay.mjs) and on scripted test answers (tests/v4/harness.js).
import { extractJsonObject } from '../../src/v4/json.js';
import { placeKey, scopedPlaces } from '../../src/v4/place_refs.js';
import { populationAt, namesYoung } from '../../src/v4/domain.js';
import { trueDungeonOf } from '../../src/v4/dungeon.js';

/** Does this vocabulary hold the contract (the engine under test is from .132 on)? */
export const hasContract = (vocab) => !!vocab?.deltas?.find((d) => d.type === 'creature.new')?.fields?.population;

/** The answer object with population and life_stage on every creature.new; null in, null out. */
export function contractValue(value, state, content) {
    if (!value || !Array.isArray(value.deltas)) return value;
    const v = structuredClone(value);
    // places are read as the engine reads them: a new local place inside a player-authorized hunting site is the
    // site's (scopedPlaces, applied by the parser and World before anything else)
    const scoped = scopedPlaces(structuredClone(v), state).deltas;
    let stepAt = state.scene?.at || null;
    const ordered = v.deltas.map((d, i) => ({ d, place: scoped[i] })).filter((x) => x.d && typeof x.d === 'object').sort((a, b) => (a.d.seq ?? 0) - (b.d.seq ?? 0));
    for (const { d, place } of ordered) {
        if (d.type === 'arrive') stepAt = placeKey(state, place.at, content);
        if (d.type !== 'creature.new') continue;
        if (d.life_stage == null) d.life_stage = namesYoung(content, d.species || '') ? 'young' : 'adult';
        if (d.population != null) continue;
        const named = d.scene != null && d.scene !== 'here' ? placeKey(state, place.scene, content) : null;
        let at = d.present === false ? named : named || stepAt;
        if (typeof at === 'string' && at.startsWith('[')) { try { at = JSON.parse(at)[2]; } catch { at = null; } }
        const known = at && state.places?.[at] && !trueDungeonOf(state, at) ? at : null;
        const p = known ? populationAt(state, known, d, content, { matchAnchor: false }) : null;
        d.population = p ? p.id : 'independent';
        if (p && d.anchor !== p.population.anchor) d.anchor = p.population.anchor;
    }
    return v;
}

/** The same for an answer as recorded text; text that holds no JSON object stays as it is. */
export function contractText(text, state, content) {
    if (typeof text !== 'string') return text;
    const { value } = extractJsonObject(text);
    if (!value || typeof value !== 'object' || !Array.isArray(value.deltas) || !value.deltas.some((d) => d?.type === 'creature.new')) return text;
    return JSON.stringify(contractValue(value, state, content));
}
