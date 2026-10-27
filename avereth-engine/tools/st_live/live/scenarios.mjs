// Runner-only goals. Creation still uses the normal player/Engine exchange; no state is injected.
const CLASSES = ['Warrior', 'Mage', 'Rogue'];
const FOCUS = {
    guild: 'Make official Guild contracts your main occupation: choose achievable jobs from the actual board, perform them, return for earned turn-ins and choose further contracts. Choose different work or another branch when a contract is persistently blocked. Exploration and Dungeons are welcome when relevant or useful; do not endlessly repeat a refused action.',
    explore: 'Make journeys and discoveries your main occupation: travel between cities, villages and wilderness regions, investigate landmarks and rumors, meet people and follow discoveries. Prepare sensibly, then move on rather than remaining in the starting town. Choose suitable wild-monster fights along the way when worthwhile; avoid or withdraw from threats beyond your abilities. Earn your living outside the Guild through selling loot, paid work, trading or other credible local opportunities. Guild registration and contracts are not your progression route; do not join or check boards as a routine first step. Incidental help and suitable Dungeons remain welcome when naturally encountered. Choose your own destinations and income sources; never force a journey, fight or success.',
};
export const SCENARIOS = Object.entries(FOCUS).flatMap(([focus, goal]) => CLASSES.map(baseClass => ({ id: `${focus}-${baseClass.toLowerCase()}`, focus, baseClass, goal })));

export function scenarioById(id) {
    const s = SCENARIOS.find(s => s.id === id);
    if (!s) throw new Error(`Unknown scenario ${id}; choose ${SCENARIOS.map(s => s.id).join(', ')}`);
    return s;
}

export function scenarioGuide(guide, id) {
    if (!id) return guide;
    const s = scenarioById(id);
    if (!guide.openRun || guide.fixture) throw new Error('Scenarios require a natural open-run guide, without a fixture');
    return {
        ...guide, scenario: { id: s.id, focus: s.focus, baseClass: s.baseClass },
        brief: `Start a genuinely new Level-1 campaign. Base class for this run: ${s.baseClass}. Select it through normal character creation; choose your own two starter skills. ${s.goal} Develop your character through real play until the Engine confirms Level ${guide.openRun.targetLevel || 15}, death, a genuine blocker or the technical limits. During sensible town visits sell surplus loot, compare affordable gear and supplies, equip useful purchases and pursue skill learning or development. Keep needed equipment and quest cargo. Allocate earned stats and recover before danger. Routes, contracts, tactics, equipment and skills are yours; incidental help and detours remain welcome. No fixtures, injected resources, scripted victories, forced fights or compulsory quest route. Trust the newest System result over narration.`,
        milestones: guide.milestones.map(m => m.id === 'creation_complete' ? { ...m, goal: `Create a genuine Level-1 ${s.baseClass} through the ordinary creation menu; choose your own starter skills.` } : m),
        focus: [s.goal, 'Observe engine-confirmed progress, loot sales, equipment, recovery and skill growth. Note contradictions and choose alternatives to persistent optional blockages.'],
        personas: ['cautious adventurer: prepare and recover, weigh threats and withdraw when sensible', 'curious adventurer: follow interesting opportunities without forcing dangerous encounters', 'pragmatic adventurer: sell surplus loot and invest in useful equipment and techniques'],
    };
}

/** A mislabeled run is recorded as such, never corrected by rewriting the character. */
export function scenarioMismatch(state, scenario) {
    if (!scenario || state.creation?.step < 3 || !state.entities?.pc?.sheet?.class) return null;
    const actual = state.entities.pc.sheet.class;
    return actual === scenario.baseClass.toLowerCase() ? null
        : { kind: 'scenario_mismatch', why: `requested ${scenario.baseClass}, Engine created ${actual}` };
}
