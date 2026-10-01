// Who opens violence against Alaric of their own accord (Core #27 NPC DECISION LOCK): one policy for the fight and for
// the story (docs/ARCHITECTURE_GEN35.md §2.3). npcDecide (src/combat.js) asks it for a combatant at its Turn; the World
// Envelope (src/v4/envelope.js) asks it before the narrator writes, and the world applier asks it again when the
// extractor reports that someone turned on him. Pure: the caller reads the inputs from its own state.

/**
 * @param {{sapient: boolean, temperament?: string|null, attitude?: number, harmed?: boolean, band?: string|null}} a
 *   attitude: toward Alaric (-100..100); harmed: hurt or attacked by Alaric; band: distance to Alaric
 * @returns {{ok: boolean, rule?: string, why: string}}
 */
export function opensViolence({ sapient, temperament = null, attitude = 0, harmed = false, band = null }) {
    const temper = temperament || (sapient ? 'cautious' : 'aggressive');
    if (sapient) {
        // a sapient NPC that is not hostile toward Alaric and has been neither hurt nor attacked does not open with
        // violence unless it is aggressive by temperament (npcDecide: it seeks cover or stays put instead)
        if (temper === 'aggressive') return { ok: true, why: 'aggressive by temperament' };
        if (harmed) return { ok: true, why: 'hurt or attacked by Alaric' };
        if (attitude <= -20) return { ok: true, why: 'hostile toward Alaric' };
        return { ok: false, rule: 'provoked_only', why: 'not hostile toward Alaric and not harmed by him' };
    }
    // animals by their body plan's temperament (npcDecide): a skittish one flees from threats and fights only when
    // cornered (ENGAGED, unhurt); a defensive one fights what comes into reach (ENGAGED); the others attack
    if (temper === 'skittish') return band === 'ENGAGED' && !harmed ? { ok: true, why: 'cornered' } : { ok: false, rule: 'cornered_only', why: 'skittish: it flees from threats and fights only when cornered' };
    if (temper === 'defensive') return band === 'ENGAGED' ? { ok: true, why: 'defends itself at arm\'s length' } : { ok: false, rule: 'reach_only', why: 'defensive: it fights only what comes within reach (ENGAGED)' };
    return { ok: true, why: temper };
}
