// Checks (Core #7, #8). Chance% = Actor / (Actor + Opposition) × 100; one d100; roll <= Chance succeeds.
// Situational modifiers (±10/20/35 %) on the same side add before multiplication (Core #8 example: 30 × 1.20 = 36).
// The engine resolves the checks it can recognise deterministically (declared stealth); for other checks it issues
// one pre-committed CHECK DIE per turn that the narrator must use (Core #9: one roll, never rerolled).
import { num } from './util.js';

export function checkChance(actor, opposition, actorMods = [], oppMods = []) {
    const a = num(actor * (1 + actorMods.reduce((s, x) => s + (Number(x) || 0), 0) / 100));
    const o = num(opposition * (1 + oppMods.reduce((s, x) => s + (Number(x) || 0), 0) / 100));
    const chance = num((a / (a + o)) * 100);
    return { actor: a, opposition: o, chance: Math.round(chance * 100) / 100 };
}

/** Resolve one check with a d100 from the campaign Dice. */
export function resolveCheck(dice, { label, actor, opposition, actorMods = [], oppMods = [], note = null }) {
    const c = checkChance(actor, opposition, actorMods, oppMods);
    const roll = dice.d100(label);
    return { label, actor_score: c.actor, opposition: c.opposition, chance: c.chance, roll, success: roll <= c.chance, note };
}

/** Detection Score of an observer (Core #8: PER + explicit Detection bonus). */
export function detectionScore(state, content, id) {
    const e = state.entities[id];
    if (e?.sheet) return e.sheet.stats.PER;
    // Direct-stat creatures have no PER. PROPOSED default (rules.checks.creature_detection): Human baseline PER.
    return content.rules.checks.creature_detection?.value ?? 5;
}

/**
 * Declared stealth vs every present observer (one opposed check against the best Detection Score).
 * Success: Alaric is concealed; observers who were not already aware stay/become unaware, aware ones lose track
 * (suspicious). Failure: the best observer notices him (aware), the others become suspicious.
 * With nobody present the action is automatic (Core #7: uncontested -> no roll).
 */
export function stealthEvents(state, content, dice, { mods = [] } = {}) {
    const observers = state.scene.present.filter((id) => id !== 'pc' && state.entities[id] && state.entities[id].status !== 'dead');
    const pc = state.entities.pc.sheet;
    const concealedOthers = state.scene.concealed.filter((x) => x !== 'pc');
    if (!observers.length) {
        return {
            events: [{ t: 'scene.concealed', d: { ids: [...concealedOthers, 'pc'] } }],
            check: { label: 'Stealth', automatic: true, success: true, note: 'nobody present to notice (automatic, no roll)' },
        };
    }
    let best = observers[0];
    for (const id of observers) if (detectionScore(state, content, id) > detectionScore(state, content, best)) best = id;
    const check = resolveCheck(dice, {
        label: `Stealth (AGI ${pc.stats.AGI}) vs Detection of ${state.entities[best].name || state.entities[best].descriptors?.[0] || best} (PER ${detectionScore(state, content, best)})`,
        actor: pc.stats.AGI, opposition: detectionScore(state, content, best), actorMods: mods,
    });
    const events = [];
    if (check.success) {
        events.push({ t: 'scene.concealed', d: { ids: [...concealedOthers, 'pc'] } });
        for (const id of observers) events.push({ t: 'scene.awareness', d: { id, level: state.scene.awareness[id] === 'aware' ? 'suspicious' : 'unaware' } });
    } else {
        events.push({ t: 'scene.concealed', d: { ids: concealedOthers } });
        for (const id of observers) events.push({ t: 'scene.awareness', d: { id, level: id === best ? 'aware' : 'suspicious' } });
    }
    return { events, check };
}
