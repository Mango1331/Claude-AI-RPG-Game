// Who opens violence against Alaric of their own accord (Core #27 NPC DECISION LOCK): one policy for the fight and for
// the story. This experimental branch carries no pre-assigned personality category through Engine or Content.
// Behaviour comes from established hostility/harm, explicit intent and the current tactical state.

/**
 * @param {{sapient: boolean, attitude?: number, harmed?: boolean, band?: string|null}} a
 * @returns {{ok: boolean, rule?: string, why: string}}
 */
export function opensViolence({ sapient, attitude = 0, harmed = false, band = null }) {
    if (sapient) {
        if (harmed) return { ok: true, why: 'hurt or attacked by Alaric' };
        if (attitude <= -20) return { ok: true, why: 'hostile toward Alaric' };
        return { ok: false, rule: 'provoked_only', why: 'not hostile toward Alaric and not harmed by him' };
    }
// Non-sapient world reactions are not pre-classified into behavioural archetypes.
    // The story may establish an attack, retreat or flight from the concrete fiction; the combat engine resolves it.
    return { ok: true, why: band ? `non-sapient world reaction at ${band} is story-established` : 'non-sapient world reaction is story-established' };
}
