// Patch 8.1 (§7, live 21.10.2026 10:17): who of a group fights when one of it is fought. Two glass beetles of the same
// Dungeon encounter (one entity.group, one slot) stood in one gallery; the attack on B opened a fight of B alone, A
// watched it die and was fought in a second encounter later. Members of a group that is established as hostile, present
// with him, enter the same encounter, each with its own HP, Initiative, Turn and fate; a single-target attack still
// strikes only its target. Bystanders stay out (engine.js combatants): a member of an established hostile group is no
// bystander.
//
// One determination for every start of a fight on the planner path (engine.js combatTurn and its legality trial,
// engagementTurn, openCommitted) and for an attack on a group's member during a fight. It is no group AI: it decides
// who is in the fight, never how anyone fights (src/combat.js npcDecide on the planner path: the fight as it stands, the
// story's intents). What counts, from state only:
//   - the group: entity.group, the members present in his scene, alive, not surrendered, not already fighting;
//   - hostile: a Living Dungeon's own foe (entity.slot), a threat the story marked (scene.threats), a hostile side in
//     the fight, an outlaw's role (actorTraits). A member's own fresh commitment to attack puts that member in the fight
//     (engine.js combatants), never its kin: the story chose who attacks (four wolves, two attack: Patch 5);
//   - a beast whose pack-mate he attacks defends it (a wolf pack), unless the story marked it as no foe (threat: false:
//     grazing deer, livestock, a pet); a person joins only a group established as hostile (no faction makes a
//     peaceful person a foe); one the story has fleeing, holding, parleying or giving up stays out;
//   - awareness: one unaware of him (his stealth) does not know where he is when the fight opens; it enters only if the
//     fight goes on past its opening (later), never when the opening ended it.
import { actorTraits } from './envelope.js';

const STAYS_OUT = new Set(['flee', 'hold', 'surrender', 'parley', 'take_cover']);

/** Is a member of a group established as hostile here (the engine's state, never kinship or a label alone)? */
function hostileSign(s, content, id) {
    const e = s.entities[id];
    if (!e) return false;
    return !!e.slot
        || (s.scene.threats || []).includes(id)
        || s.encounter?.combatants?.[id]?.side === 'hostile'
        || (e.kind === 'npc' && !!actorTraits(s, content, id, { c: true }).hostileRole);
}

/**
 * The members of the leads' groups who enter the fight with them.
 * @param {string[]} leads who is fought (his target) or fights (a committed attacker)
 * @param {{c?: boolean, pcAttacks?: boolean, exclude?: string[]}} opts pcAttacks: he attacks a lead (a beast defends its
 *   pack-mate); exclude: already in the fight
 * @returns {{now: string[], later: string[]}} now: in from the start; later: unaware of him, in once the fight goes on
 */
export function groupJoiners(s, content, leads, { c = false, pcAttacks = false, exclude = [] } = {}) {
    const out = { now: [], later: [] };
    if (!c || s.meta?.runtime !== 'v4') return out;
    const taken = new Set([...leads, ...exclude, ...Object.keys(s.encounter?.combatants || {})]);
    for (const lead of leads) {
        const group = s.entities[lead]?.group;
        if (!group) continue;
        const mates = (s.scene.present || []).filter((id) => {
            const e = s.entities[id];
            return id !== 'pc' && !taken.has(id) && e?.group === group && ['npc', 'creature'].includes(e.kind) && e.status !== 'dead' && !e.surrendered_to;
        });
        if (!mates.length) continue;
        const hostile = [lead, ...mates].some((id) => hostileSign(s, content, id));
        for (const id of mates) {
            const e = s.entities[id];
            if (e.threat === false || STAYS_OUT.has(s.pending_intents?.[id])) continue;
            if (!hostile && !(pcAttacks && e.kind === 'creature')) continue;
            (s.scene.awareness?.[id] === 'unaware' ? out.later : out.now).push(id);
            taken.add(id);
        }
    }
    return out;
}
