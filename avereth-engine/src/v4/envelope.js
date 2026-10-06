// Gen 3.5: the World/Reaction Envelope (docs/ARCHITECTURE_GEN35.md §2.3). Before the narrator writes, the engine
// computes from the state which causally relevant reactions of the people and creatures here are free, which need a
// cause the story gives first, which are impossible and which are already the engine's. The narrator sees only the
// limits (the engine block's WORLD ENVELOPE); inside them the story decides who helps, refuses, leaves, bluffs or
// hesitates. After the reply, the world applier asks the same functions about what the extractor reported, at the
// state of each step: one constraint, two uses. Nothing here is a new rule: the violence policy is the fight's own
// (src/policy.js, shared with npcDecide), who may take Alaric's coin or things is the world applier's coercion rule.
import { opensViolence } from '../policy.js';
import { deriveCharacter } from '../derived.js';
import { truth, statusOf } from '../knowledge.js';
import { sceneHandle } from './scene_handles.js';

export const ENVELOPE_VERSION = 'envelope-1';

// who may fine or confiscate (an authority) and who may rob (a hostile robber), by role
const AUTHORITY_ROLE = /\b(?:guard|watch(?:man)?|sergeant|captain|constable|reeve|bailiff|magistrate|official|officer|toll ?keeper|tax|customs|steward|marshal|warden)\b/i;
const HOSTILE_ROLE = /\b(?:bandit|thief|robber|brigand|cutpurse|pickpocket|thug|highwayman)\b/i;

/** Is the actor hurt (its HP below its maximum)? */
function hurt(content, e) {
    if (e.profile) return (e.profile.hp ?? e.profile.max_hp) < e.profile.max_hp;
    if (e.sheet && Number.isFinite(e.sheet.hp)) return e.sheet.hp < deriveCharacter(e.sheet, content).maxHp;
    return false;
}

/** What the violence policy reads about an actor, from the state as it is now. */
export function actorTraits(state, content, id) {
    const e = state.entities[id];
    return {
        sapient: e.kind !== 'creature',
        attitude: state.relations?.[`rel.${id}.attitude.pc`]?.value ?? 0,
        harmed: hurt(content, e),
        band: state.scene?.positions?.[id]?.band || null,
    };
}

/**
 * May this actor turn on Alaric now (a hostile commitment, an attack intent)? Someone the same reply introduces is
 * free (an ambush is the world's move); someone already fighting or committed is the engine's.
 * @returns {{ok: boolean, rule?: string, why: string}}
 */
export function mayOpenFight(state, content, id, { newInAnswer = false, c = false } = {}) {
    const e = state.entities[id];
    if (!e || e.kind === 'location') return { ok: true, why: 'not an actor the envelope knows (the world rules decide)' };
    if (newInAnswer) return { ok: true, why: 'introduced by this reply' };
    if (state.encounter?.combatants?.[id]) return { ok: true, why: 'already fighting' };
    if ((state.pending_combat || []).some((p) => p.by === id)) return { ok: true, why: 'already committed' };
    return opensViolence(actorTraits(state, content, id));
}

/** The words of an actor's role (occupation, descriptors, look, template). */
function roleText(state, id) {
    const e = state.entities[id];
    return [truth(state, id, 'occupation')[0]?.o, ...(e?.descriptors || []), e?.traits, e?.template].filter(Boolean).join(' ');
}

/**
 * May this actor take Alaric's coin or things? A fine or a confiscation needs an authority, a robbery a hostile robber
 * (or one committed to a fight with him, or fighting him now). The other side of a sale is decided before (the world
 * applier).
 * @returns {{ok: boolean, why?: string}}
 */
export function mayTake(state, by, kind) {
    const role = roleText(state, by);
    if ((kind === 'confiscation' || kind === 'fine') && !AUTHORITY_ROLE.test(role)) return { ok: false, why: `${kind} needs an authority (a guard, an official)` };
    // in a fight: only one who fights against him there (review of 4.2.0: any running fight let the merchant rob him)
    const fighting = state.encounter?.combatants?.[by]?.side === 'hostile';
    if (kind === 'robbery' && !(HOSTILE_ROLE.test(role) || state.pending_combat?.some((p) => p.by === by) || fighting)) return { ok: false, why: 'a robbery needs a hostile robber' };
    return { ok: true };
}

/**
 * The envelope of the scene: every living actor here (outside a fight) with what the policy says about turning on
 * Alaric and about taking his coin or things.
 * @returns {{v: string, fight: null|'running', actors: {id: string, label: string, fight: object, fine: boolean, rob: boolean}[]}}
 */
export function reactionEnvelope(state, content, { c = false } = {}) {
    if (state.encounter) return { v: ENVELOPE_VERSION, fight: 'running', actors: [] };
    const here = (state.scene?.present || []).filter((id) => id !== 'pc' && state.entities[id] && ['npc', 'creature'].includes(state.entities[id].kind) && statusOf(state, id) !== 'dead');
    return {
        v: ENVELOPE_VERSION, fight: null,
        actors: here.map((id) => ({
            id, label: sceneHandle(state, content, id), fight: mayOpenFight(state, content, id, { c }),
            fine: mayTake(state, id, 'fine').ok, rob: state.entities[id].kind === 'npc' && mayTake(state, id, 'robbery').ok,
        })),
    };
}

const RULE_LINES = {
    provoked_only: (names) => `Violent only once the story gives them cause first (an insult, a threat, harm): ${names}.`,
};

/**
 * The narrator's part of the envelope (the engine block's WORLD ENVELOPE): only the limits, grouped, nothing for a
 * scene without them. A V4 story outside a fight; the fight's own block rules it otherwise. This experimental branch
 * carries no personality category in the envelope.
 * @returns {string[]}
 */
export function envelopeLines(state, content, { c = false } = {}) {
    if (state.meta?.runtime !== 'v4' || state.mode === 'creation') return [];
    const env = reactionEnvelope(state, content, { c });
    if (env.fight) return [];
    const lines = [];
    for (const [rule, line] of Object.entries(RULE_LINES)) {
        const names = env.actors.filter((a) => (!a.fight.ok || a.fight.tendency) && a.fight.rule === rule).map((a) => a.label);
        if (names.length) lines.push(line(names.join(', ')));
    }
    const fine = env.actors.filter((a) => a.fine).map((a) => a.label);
    const rob = env.actors.filter((a) => a.rob).map((a) => a.label);
    if (fine.length || rob.length) {
        lines.push(`Only ${[fine.length ? `${fine.join(', ')} (a fine or confiscation)` : null, rob.length ? `${rob.join(', ')} (a robbery)` : null].filter(Boolean).join(' and ')} may take Alaric's coin or things.`);
    }
    return lines;
}

/** The engine block's section, or ''. */
export function envelopeBlock(state, content, { c = false } = {}) {
    const lines = envelopeLines(state, content, { c });
    return lines.length ? `WORLD ENVELOPE (causal limits for this reply; inside them the story is free):\n${lines.map((l) => `- ${l}`).join('\n')}` : '';
}
