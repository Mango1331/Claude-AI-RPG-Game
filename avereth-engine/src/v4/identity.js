// Patch 7.2B: identity resolution for the references of a world delta (hostile, intent, aware, position). Pure: it reads
// the state and the refs this answer introduced and returns who a reference means; it emits nothing. The World applier
// (src/v4/world.js) acts on the result.
//
// Who a group's reference means is a question of cardinality, not of naming. The group's name (entity.group) is who they
// are; it says nothing of how many of them do a thing. The extractor says that in a structured field (scope), and the
// engine checks it against the state; a group's ref alone no longer makes every member act (live Glimmerdeep: one
// scarred beetle lunged, the extractor wrote the swarm's ref, and eleven beetles joined the fight).
import { normText } from '../util.js';
import { numbersIn } from '../economy.js';
import { isGroup, GROUP_WORDS } from '../delta.js';
import { statusOf } from '../knowledge.js';
import { namesKind } from './domain.js';

// words of a group reference that say how many or which, never who ("the", "all", "the rest of")
export const QUANT = new Set(['the', 'all', 'both', 'those', 'these', 'of', 'whole', 'entire', 'rest', 'remaining', 'other', 'others']);

const wordsOf = (k) => k.replace(/[_.]+/g, ' ').split(' ').filter((w) => w && !QUANT.has(w) && !numbersIn(w).size);

/**
 * The living creatures here a group reference names as a whole, or null when it names no one group: the group by its
 * ref (creature.new count > 1, this answer's `groups` or an earlier answer's entity.group), or a plural kind or a
 * collective ("the wolves", "the pack") by the creatures here it names, when they are one group. A number the reference
 * gives must be theirs ("two wolves" of four is no one in particular: null). A ref this answer or the state holds as one
 * entity is never a group.
 * @param {object} s state
 * @param {object} content
 * @param {string} ref
 * @param {{groups?: Map<string, string[]>, refs?: Map<string, string>}} known this answer's refs
 * @returns {string[]|null}
 */
export function groupMembers(s, content, ref, { groups = new Map(), refs = new Map() } = {}) {
    if (typeof ref !== 'string') return null;
    const k = normText(ref);
    if (groups.has(k)) return groups.get(k);
    if (refs.has(k) || s.entities[ref]) return null;
    const words = wordsOf(k);
    const bare = words.join(' ');
    // review of c.6.6.12: a group the story showed as no foe (threat false) is still that group; whether it may turn on
    // him is the World Envelope's to decide for each (hostile), never the reference's
    const here = s.scene.present.filter((id) => s.entities[id]?.kind === 'creature' && statusOf(s, id) !== 'dead');
    let ids = here.filter((id) => [k, bare].includes(s.entities[id].group));
    if (!ids.length && bare && isGroup(content, bare)) {
        const kind = words.filter((w) => !GROUP_WORDS.has(w)).join(' ');
        ids = kind ? here.filter((id) => namesKind(kind, s.entities[id].species || '', content.anchors.get(s.entities[id].anchor || s.entities[id].profile?.anchor)))
            : here.filter((id) => s.entities[id].group);
        // a kind or a collective over two groups ("the wolves" with the quarry pack and the eastern pair here) is no one
        // in particular: as an unknown name
        if (new Set(ids.map((id) => s.entities[id].group || id)).size > 1) ids = [];
    }
    const said = [...numbersIn(k)];
    if (!ids.length || (said.length && !said.includes(ids.length))) return null;
    return ids;
}

/** A plural kind or a collective that names no one group here ("the wolves" over two packs, "three of the beetles"). */
export function groupWords(s, content, ref, { refs = new Map() } = {}) {
    if (typeof ref !== 'string' || refs.has(normText(ref)) || s.entities[ref]) return false;
    const bare = wordsOf(normText(ref)).join(' ');
    return !!bare && isGroup(content, bare);
}

/**
 * Who a reference of a delta means, with the cardinality the extractor gave it:
 *   single   one entity (its own handle, a name, a ref of this answer): ids = [it]
 *   all      every living member of one group here, because the delta says the whole group does it (scope "all")
 *   unclear  a group, or a part of it, the engine cannot tell apart: no one ("three of the twelve", scope "part", a
 *            group's ref without a scope, a kind over two groups, an evidence quote the reply does not hold or that
 *            counts another number of them)
 * A list of handles (A, C and F) is a list of singles: the subset is the delta's own list.
 * The evidence quote is checked only for what can be checked: that the reply holds it, and that a number it states is
 * the group's. It is no proof that the whole group acts; that judgement is the extractor's (scope).
 * @param {{scope?: 'all'|'part'|null, evidence?: string|null, prose?: string, groups?: Map, refs?: Map, single: (ref: string) => any}} o
 * @returns {{kind: 'single'|'all'|'unclear', ids: any[], why?: string, group?: string[]}}
 */
export function resolveRef(s, content, ref, { scope = null, evidence = null, prose = '', groups, refs, single }) {
    const members = groupMembers(s, content, ref, { groups, refs });
    if (!members) {
        if (groupWords(s, content, ref, { refs })) return { kind: 'unclear', ids: [], why: `"${String(ref).slice(0, 60)}" names no one group here, or not which of them` };
        return { kind: 'single', ids: [single(ref)] };
    }
    if (members.length === 1) return { kind: 'single', ids: members };
    if (scope !== 'all') {
        return { kind: 'unclear', ids: [], group: members, why: scope === 'part' ? `only some of "${String(ref).slice(0, 60)}" (${members.length}), not which` : `"${String(ref).slice(0, 60)}" names a group of ${members.length}, not that all of it does this` };
    }
    if (typeof evidence === 'string' && evidence.trim()) {
        const flat = (x) => normText(x).replace(/[^a-z0-9]+/g, ' ').trim();
        const q = flat(evidence);
        // Patch 8.1 (§9, live 21.10.2026 10:17: "the nearer one's head came up at the sound of his boots; both watched him
        // now" joined two sentences of the reply): a quote of several clauses holds when each clause is in the reply;
        // the scope and the count are checked as before
        const clauses = String(evidence).split(/[;.!?…]+|\s[—–-]\s|—/).map(flat).filter((c) => c.split(' ').length >= 3);
        const quoted = (c) => flat(prose).includes(c);
        if (prose && !quoted(q) && !(clauses.length > 1 && clauses.every(quoted))) return { kind: 'unclear', ids: [], group: members, why: `the evidence "${evidence.slice(0, 60)}" is not in the reply` };
        // "the nearer one", "the second one's head": a pronoun, no count (Patch 8.1)
        const said = [...numbersIn(q.replace(/\b(?:the|this|that|each|every|any|which|another|other|first|second|third|last|next|\w+er|\w+est)\s+one(?:\s+s)?\b/g, ' '))];
        if (said.length && !said.includes(members.length)) return { kind: 'unclear', ids: [], group: members, why: `the evidence "${evidence.slice(0, 60)}" counts ${said.join(' or ')}, the group is ${members.length}` };
    }
    return { kind: 'all', ids: members };
}
