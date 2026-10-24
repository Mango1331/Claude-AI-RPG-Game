// Gen 3.5: the World/Reaction Envelope (docs/ARCHITECTURE_GEN35.md §2.3). Before the narrator writes, the engine
// computes from the state which causally relevant reactions of the people and creatures here are free, which need a
// cause the story gives first, which are impossible and which are already the engine's. The narrator sees only the
// limits (the engine block's WORLD ENVELOPE); inside them the story decides who helps, refuses, leaves, bluffs or
// hesitates. After the reply, the world applier asks the same functions about what the extractor reported, at the
// state of each step: one constraint, two uses. Nothing here is a new rule: the violence policy is the fight's own
// (src/policy.js, shared with npcDecide), who may take Alaric's coin or things is the world applier's coercion rule.
import { normText } from '../util.js';
import { opensViolence } from '../policy.js';
import { templateFor } from '../content.js';
import { deriveCharacter } from '../derived.js';
import { truth, statusOf } from '../knowledge.js';
import { sceneHandle } from './scene_handles.js';

export const ENVELOPE_VERSION = 'envelope-1';

// who may fine or confiscate (an authority) and who may rob (a hostile robber), by role
const AUTHORITY_ROLE = /\b(?:guard|watch(?:man)?|sergeant|captain|constable|reeve|bailiff|magistrate|official|officer|toll ?keeper|tax|customs|steward|marshal|warden)\b/i;
const HOSTILE_ROLE = /\b(?:bandit|thief|robber|brigand|cutpurse|pickpocket|thug|highwayman)\b/i;

/** An NPC's template as the fight would build it (engine.js materialise): its own, by its words, else a commoner. */
function templateOf(content, e) {
    const words = [...(e.descriptors || []), e.traits || ''].join(' ');
    return content.templates.get(e.template) || templateFor(content, words) || content.templates.get('commoner') || null;
}

/** Is the actor hurt (its HP below its maximum)? */
function hurt(content, e) {
    if (e.profile) return (e.profile.hp ?? e.profile.max_hp) < e.profile.max_hp;
    if (e.sheet && Number.isFinite(e.sheet.hp)) return e.sheet.hp < deriveCharacter(e.sheet, content).maxHp;
    return false;
}

/** What the violence policy reads about an actor, from the state as it is now. */
export function actorTraits(state, content, id, { c = false } = {}) {
    const e = state.entities[id];
    const sapient = e.kind !== 'creature';
    // 4.3.0-c.6.6.24 (livetest 21.10.2026): on the planner path no personality category decides (skeletons fought as
    // skittish rats retreated turn after turn); what counts is harm, hostility and an outlaw's role
    const temperament = c ? null : sapient
        ? e.card?.temperament || e.sheet?.generated?.temperament || templateOf(content, e)?.temperament || null
        : e.profile?.temperament || content.anchors.get(e.anchor || e.profile?.anchor)?.temperament || null;
    return {
        sapient, temperament, ...(c && sapient ? { hostileRole: HOSTILE_ROLE.test(roleText(state, id)) } : {}),
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
    const traits = actorTraits(state, content, id, { c });
    const v = opensViolence(traits);
    // Prototype C (4.3.0-c.4): an animal's temperament is a strong tendency, not a law. The story may give it a cause
    // (cornered, its mate killed); the engine still resolves the attack on the animal's own turn, damage included.
    // People keep their rule (provoked_only)
    return c && !v.ok && !traits.sapient ? { ...v, ok: true, tendency: true } : v;
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
    cornered_only: (names) => `Flee from threats; fight only when cornered (ENGAGED): ${names}.`,
    reach_only: (names) => `Fight only what comes within reach (ENGAGED): ${names}.`,
};
// Prototype C (4.3.0-c.4): the same animals, their temperament a tendency the story may overrule with a cause
const TENDENCY_LINES = {
    cornered_only: (names) => `Skittish by nature, a tendency and not a law: they flee from threats and fight when cornered or given cause: ${names}.`,
    reach_only: (names) => `Defensive by nature, a tendency and not a law: they fight what comes within reach, or when given cause: ${names}.`,
};

/**
 * The narrator's part of the envelope (the engine block's WORLD ENVELOPE): only the limits, grouped, nothing for a
 * scene without them. A V4 story outside a fight; the fight's own block rules it otherwise. On the planner path (c)
 * an animal's temperament is named as the tendency it is there.
 * @returns {string[]}
 */
export function envelopeLines(state, content, { c = false } = {}) {
    if (state.meta?.runtime !== 'v4' || state.mode === 'creation') return [];
    const env = reactionEnvelope(state, content, { c });
    if (env.fight) return [];
    const lines = [];
    for (const [rule, line] of Object.entries(RULE_LINES)) {
        const names = env.actors.filter((a) => (!a.fight.ok || a.fight.tendency) && a.fight.rule === rule).map((a) => a.label);
        if (names.length) lines.push(((c && TENDENCY_LINES[rule]) || line)(names.join(', ')));
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

/** A threat permits a response, but is not yet an attack. Evidence quotes must come from this reply. */
export function attackCommitted(prose, evidence = null, labels = [], others = []) {
    if (!prose?.trim()) return false;
    if (evidence && !normText(prose).includes(normText(evidence))) return false;
    const escape = (x) => normText(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentions = (names, own) => [...new Set(names.filter(Boolean).map(normText))].map((name) => ({ re: new RegExp(`\\b${escape(name)}\\b`, 'g'), own, length: name.length }));
    const actors = [...mentions(labels, true), ...mentions(others, false)];
    // This is positive, local evidence, not a default permission based on an extractor label.
    // One attack may have an unusual weapon/body; it still needs a directed action by this actor.
    const action = /\b(?:attacks?|attacked|lung\w*|pounc\w*|charg\w*|rush\w*|surg\w*|ambush\w*|strik\w*|struck|stabs?|stabbed|swings?|swung|shoots?|shot|looses?|fired|fires|launch\w*|leaps?|springs?|bites?|snaps? at|comes? at|are on him|opens? fire|straight at him|both of them committed|comes? down[^.!?;]{0,40} at|claws first[^.!?;]{0,60} at|(?:hurls?|hurled|drives?|drove|brings?)\b[^.!?;]{0,45}\b(?:knife|blade|sword|axe|spear|stone|boulder|fist|claw)s?\b(?:[^.!?;]{0,25}\bdown)?|slams? into|rams? into|spews?[^.!?;]{0,40} toward|tears? toward)\b/g;
    let previous = null;
    const clauses = prose.replace(/"[^"\n]*"|“[^”\n]*”/g, '').split(/[.!?;\n]+/).map(normText);
    for (const clause of clauses) {
        const found = actors.flatMap((a) => [...clause.matchAll(a.re)].map((m) => ({ index: m.index, ...a })));
        // A specific handle outranks a kind contained in it ('Wolf B', not merely 'wolf').
        const named = found.filter((a) => !found.some((b) => b.length > a.length && b.index <= a.index && b.index + b.length >= a.index + a.length)).sort((a, b) => a.index - b.index);
        const uncertain = /\b(?:if|unless|would|could|might|will|yesterday|previously|ago|last (?:night|spring|year)|rumou?rs?|believes?|threaten\w*|ready to|prepar\w* to|about to|pretend\w* to|refus\w* to|does not|do not|did not|never)\b/.test(clause);
        if (!uncertain) for (const m of clause.matchAll(action)) {
            const prefix = clause.slice(0, m.index);
            if (/\b(?:a|an|the|his|her|their|of|about|after|before)\s+$/.test(prefix) && !named.some((a) => a.index + a.length === prefix.trimEnd().length)) continue; // exclude noun mentions, but keep handles ending in A
            const before = named.filter((a) => a.index < m.index);
            let subject = before.at(-1) || (/\b(?:he|she|it|they)\b/.test(clause.slice(0, m.index)) ? previous : null);
            // Coordinated subjects act together; an intervening predicate ('Rask smiles while Bren ...') does not.
            for (let i = before.length - 2; i >= 0; i--) {
                const a = before[i]; const next = before[i + 1];
                if (a.index + a.length > next.index || !/^[\s,]*(?:and|&)?[\s,]*$/.test(clause.slice(a.index + a.length, next.index))) break;
                if (a.own) subject = a;
            }
            const target = clause.slice(m.index + m[0].length);
            const otherTarget = named.some((a) => !a.own && a.index > m.index);
            if (subject?.own && (!otherTarget || /\b(?:alaric|him|pc)\b/.test(target))) return true;
        }
        if (named.length) previous = named.at(-1);
    }
    return false;
}
