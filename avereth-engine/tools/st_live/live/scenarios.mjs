// Runner-only goals. Creation still uses the normal player/Engine exchange; no state is injected.
const CLASSES = ['Warrior', 'Mage', 'Rogue'];
const FOCUS = {
    guild: 'Make official Guild contracts your main occupation: choose achievable jobs from the actual board, perform them, return for earned turn-ins and choose further contracts. Choose different work or another branch when a contract is persistently blocked. Exploration and Dungeons are welcome when relevant or useful; do not endlessly repeat a refused action.',
    explore: 'Make journeys and discoveries your main occupation: travel between cities, villages and wilderness regions, investigate landmarks and rumors, meet people and follow discoveries. Prepare sensibly, then move on rather than remaining in the starting town. Choose suitable wild-monster fights along the way when worthwhile; avoid or withdraw from threats beyond your abilities. Earn your living outside the Guild through selling loot, paid work, trading or other credible local opportunities. Guild registration and contracts are not your progression route; do not join or check boards as a routine first step. Incidental help and suitable Dungeons remain welcome when naturally encountered. Choose your own destinations and income sources; never force a journey, fight or success.',
};
export const SCENARIOS = Object.entries(FOCUS).flatMap(([focus, goal]) => CLASSES.map(baseClass => ({ id: `${focus}-${baseClass.toLowerCase()}`, focus, baseClass, goal })));
// The targeted NPC/PULSE batch (guides/npc_pulse_test.json, batch.mjs --mode npc): three independent natural runs with
// their own class and playing style. Only the run's base class and style are set; people, contracts, routes, words and
// encounters stay the player's and the game's. Separate from SCENARIOS so the Guild batch's seeds stay as they were.
export const NPC_SCENARIOS = [
    { id: 'npc-sociable', focus: 'npc', baseClass: 'Warrior', style: 'warm, curious and sociable: you seek out people, ask about their work and lives and follow up on it later; you readily offer help or ask capable people to come along, and accept a refusal gracefully; you still judge people by how they act and keep your guard up with anyone who threatens you' },
    { id: 'npc-wary', focus: 'npc', baseClass: 'Rogue', style: 'wary and pragmatic: polite but guarded with strangers, you ask questions before you trust, haggle, decline offers that seem off, keep the promises you make and expect the same; you work with people who prove reliable, avoid or stand up to those who do not, and prefer scouting to needless fights' },
    { id: 'npc-inquisitive', focus: 'npc', baseClass: 'Mage', style: 'inquisitive, observant and independently minded: as a Mage you seek to understand unfamiliar places, old stories and the people who know them. Ask concrete questions, distinguish a rumour from what you personally saw, and return to a previous contact when a new lead gives you a real reason. Prefer exploration, thoughtful preparation and creative problem-solving over needless violence, but take worthwhile risks and suitable Guild work when they fit your priorities. Never force a discovery or make the world agree with you.' },
];
const ALL_SCENARIOS = [...SCENARIOS, ...NPC_SCENARIOS];

export function scenarioById(id) {
    const s = ALL_SCENARIOS.find(s => s.id === id);
    if (!s) throw new Error(`Unknown scenario ${id}; choose ${ALL_SCENARIOS.map(s => s.id).join(', ')}`);
    return s;
}

/** An NPC/PULSE profile on its own guide: the guide's brief and goals, the run's base class and one playing style. */
function npcScenarioGuide(guide, s) {
    if (guide.analysis !== 'npc_pulse') throw new Error(`Scenario ${s.id} belongs to the npc_pulse guide (npc_pulse_test), not ${guide.id}`);
    return {
        ...guide, scenario: { id: s.id, focus: s.focus, baseClass: s.baseClass },
        brief: `${guide.brief} Base class for this run: ${s.baseClass}; select it through the normal creation menu and choose your own two starter skills.`,
        milestones: guide.milestones.map(m => m.id === 'creation_complete' ? { ...m, goal: `Create a genuine Level-1 ${s.baseClass} through the ordinary creation menu; choose your own two starter skills.` } : m),
        personas: [s.style],
    };
}

export function scenarioGuide(guide, id) {
    if (!id) return guide;
    const s = scenarioById(id);
    if (!guide.openRun || guide.fixture) throw new Error('Scenarios require a natural open-run guide, without a fixture');
    if (s.focus === 'npc') return npcScenarioGuide(guide, s);
    if (guide.analysis === 'npc_pulse') throw new Error(`The npc_pulse guide takes only its own profiles (${NPC_SCENARIOS.map((x) => x.id).join(', ')})`);
    const aoe = guide.starterAoe?.[s.baseClass.toLowerCase()];
    const loadout = aoe ? `One of the two starter skills MUST be ${aoe}; choose the other freely. Use AoE only when tactically useful; do not force fights or ignore friendly fire.` : 'choose your own two starter skills';
    return {
        ...guide, scenario: { id: s.id, focus: s.focus, baseClass: s.baseClass, ...(aoe ? { starterAoe: aoe } : {}) },
        brief: `Start a genuine Level-1 campaign. Base class for this run: ${s.baseClass}; select it through normal creation; ${loadout}. ${s.goal} Continue to Engine-confirmed Level ${guide.openRun.targetLevel || 15} AND your chosen E class; death, blockers and limits remain separate endings. On town visits sell surplus loot, compare affordable gear, equip useful purchases and pursue skills. Keep needed gear/cargo, assign stats and recover before danger. Routes, purchases and tactics are yours; incidental help and detours remain welcome. No fixtures, injected resources, scripted victories or forced fights. Trust System results.`,
        milestones: guide.milestones.map(m => m.id === 'creation_complete' ? { ...m, goal: `Create a genuine Level-1 ${s.baseClass} through the ordinary creation menu; ${loadout}.` } : m),
        focus: ['Observe engine-confirmed progress, loot sales, equipment, recovery and skill growth. Note contradictions and choose alternatives to persistent optional blockages.'],
        personas: ['cautious adventurer: prepare and recover, weigh threats and withdraw when sensible', 'curious adventurer: follow interesting opportunities without forcing dangerous encounters', 'pragmatic adventurer: sell surplus loot and invest in useful equipment and techniques'],
    };
}

/** A mislabeled run is recorded as such, never corrected by rewriting the character. */
export function scenarioMismatch(state, scenario, starterAoe = null) {
    if (state.creation?.step < 3 || !state.entities?.pc?.sheet?.class) return null;
    const actual = state.entities.pc.sheet.class;
    if (scenario && actual !== scenario.baseClass.toLowerCase()) return { kind: 'scenario_mismatch', why: `requested ${scenario.baseClass}, Engine created ${actual}` };
    const required = scenario?.starterAoe || starterAoe?.[actual];
    if (required && !state.entities.pc.sheet.skills?.[required]) return { kind: 'scenario_mismatch', why: `required AoE starter ${required} was not selected` };
    return null;
}
