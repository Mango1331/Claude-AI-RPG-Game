// SillyTavern function-tool definitions for the experimental Narrator-as-GM runtime.
// The action callbacks are injected by index.js so this file stays independent from SillyTavern globals.

const objectArray = {
    type: 'array',
    items: { type: 'object', additionalProperties: true },
};

export function gmToolRegistrations(actions, shouldRegister) {
    return [
        {
            name: 'avereth_lookup',
            displayName: 'Avereth: look up canonical state',
            description: 'Read canonical Avereth state when an id or exact mechanic matters. Use this instead of guessing a skill id, actor id, quest id, object id or place id. kind=scene lists current actors; kind=skills lists Alaric\'s known skills.',
            parameters: {
                type: 'object',
                properties: {
                    kind: { type: 'string', enum: ['scene', 'skills', 'entity', 'quest', 'object', 'place', 'catalog'] },
                    ref: { type: 'string', description: 'Canonical id or exact visible/name reference; omit for scene/skills/catalog.' },
                },
                required: ['kind'],
                additionalProperties: false,
            },
            action: actions.lookup,
            shouldRegister,
        },
        {
            name: 'avereth_resolve_combat',
            displayName: 'Avereth: resolve combat action',
            description: 'Resolve what Alaric actually commits to in the PLAYER MESSAGE when it is an attack, combat skill, stealth, flee, engage or hold. YOU own semantic interpretation: choose the canonical skill and target that the player meant; the engine owns legality, resource costs, initiative, damage, HP and turn order. Call avereth_lookup first if an id is uncertain. Never replace an engine result with a different skill merely because the player used an alias or typo.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['attack', 'skill', 'stealth', 'flee', 'engage', 'hold'] },
                    skill: { type: 'string', description: 'Canonical known skill id or exact skill name for attack/skill; omit when the action needs no skill.' },
                    target: { type: 'string', description: 'Canonical current actor id or exact current scene handle/name; omit when no target is required.' },
                    move: { type: 'string', enum: ['closer', 'away'], description: 'Optional declared combat movement coupled to the action.' },
                },
                required: ['action'],
                additionalProperties: false,
            },
            action: actions.resolveCombat,
            shouldRegister,
        },
        {
            name: 'avereth_resolve_story',
            displayName: 'Avereth: resolve hard story action',
            description: 'Transitional bridge for HARD deterministic non-combat commitments in the PLAYER MESSAGE: travel, timed activity/search, taking/dropping/giving/using inventory, trade/payment, offers, Guild registration/promotion, quest accept/turn-in/abandon, journey continue, equip/unequip. Supply existing V4 command objects directly; there is no semantic interpreter before you. Do NOT use this for ordinary dialogue, looking at scenery, NPC reactions or creative environmental consequences. board.read is intentionally not migrated yet.',
            parameters: {
                type: 'object',
                properties: {
                    commands: { ...objectArray, description: 'Existing V4 command objects, in player-action order. Include type and its normal arguments; seq is optional.' },
                },
                required: ['commands'],
                additionalProperties: false,
            },
            action: actions.resolveStory,
            shouldRegister,
        },
        {
            name: 'avereth_use_ability_on_world',
            displayName: 'Avereth: use ability on world',
            description: 'Use a known Alaric ability creatively on scenery, terrain or another non-combat fictional target, for example Flame Lance at a cracked stone floor to blast open a cave. The engine validates the known skill and spends its resource cost, then returns its mechanical profile. YOU adjudicate the physical consequence from established fiction; if the consequence is durable, persist it with avereth_commit_world. This scaffold intentionally refuses this tool during an ACTIVE encounter until combat action-economy semantics are designed.',
            parameters: {
                type: 'object',
                properties: {
                    skill: { type: 'string', description: 'Canonical known skill id or exact skill name.' },
                    target_description: { type: 'string', description: 'Concrete fictional target as established in the scene.' },
                    target_ref: { type: 'string', description: 'Canonical object/place/entity id when one exists; omit when the target has no canonical id.' },
                    goal: { type: 'string', description: 'What Alaric is trying to achieve with the ability.' },
                },
                required: ['skill', 'target_description', 'goal'],
                additionalProperties: false,
            },
            action: actions.useAbilityOnWorld,
            shouldRegister,
        },
        {
            name: 'avereth_commit_world',
            displayName: 'Avereth: commit world consequence',
            description: 'Persist durable WORLD consequences you established while narrating. This still passes through Avereth firewall/ownership rules. It cannot directly award Alaric coin, XP, Guild payout/rank, or arbitrarily mutate protected inventory/HP. Supported change types: fact, thread, attitude, memory, person_new, person_named, creature_new, enter, leave, position, aware, hostile, intent, quest_detail, quest_progress, quest_ready, time. Examples: {type:"fact",s:"<place id>",p:"stone_floor",o:"blasted open into a person-sized shaft"}; {type:"leave",who:"npc.id"}; {type:"quest_progress",quest:"quest.id",objective:"find the den",status:"done"}.',
            parameters: {
                type: 'object',
                properties: {
                    changes: { ...objectArray, description: 'Durable typed world changes in story order.' },
                    evidence: { type: 'string', description: 'Optional concise statement of what the final narration establishes; used only as validation context.' },
                },
                required: ['changes'],
                additionalProperties: false,
            },
            action: actions.commitWorld,
            shouldRegister,
        },
    ];
}
