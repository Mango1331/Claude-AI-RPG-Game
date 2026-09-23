// Retrieval: select the few items that matter for THIS scene from a campaign that may hold thousands of events.
// Hybrid scoring in the spirit of Generative Agents (recency + importance + relevance) extended with the
// structured signals an RPG has for free (entities present, location, active quests, relationships), plus
// BM25 lexical relevance. No embeddings required (entity names and places are exact strings); a vector score can
// be plugged in via opts.semantic(item) if a host provides one.
import { tokenize } from './util.js';

export class Bm25 {
    constructor(docs, { k1 = 1.2, b = 0.75 } = {}) {
        this.k1 = k1;
        this.b = b;
        this.docs = docs.map((d) => tokenize(d));
        this.len = this.docs.map((d) => d.length);
        this.avg = this.len.reduce((a, x) => a + x, 0) / Math.max(1, this.len.length);
        this.df = new Map();
        for (const d of this.docs) for (const w of new Set(d)) this.df.set(w, (this.df.get(w) || 0) + 1);
        this.N = this.docs.length;
    }

    score(query, i) {
        const q = tokenize(query);
        const d = this.docs[i];
        if (!d.length || !q.length) return 0;
        const tf = new Map();
        for (const w of d) tf.set(w, (tf.get(w) || 0) + 1);
        let s = 0;
        for (const w of new Set(q)) {
            const f = tf.get(w);
            if (!f) continue;
            const df = this.df.get(w) || 0;
            const idf = Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
            s += idf * (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * this.len[i] / this.avg));
        }
        return s;
    }
}

export const DEFAULT_WEIGHTS = { entity: 3, location: 1.5, quest: 1.5, recency: 0.5, importance: 2, lexical: 2, relation: 1 };

/**
 * Score items. item: {text, entities:[], location, quests:[], turn, importance (0..1)}
 * focus: {entities:[], location, realm, quests:[], turn, query, relationStrength: Map(entityId -> 0..1)}
 */
export function rank(items, focus, opts = {}) {
    const w = { ...DEFAULT_WEIGHTS, ...(opts.weights || {}) };
    const bm = new Bm25(items.map((it) => it.text));
    const lex = items.map((_, i) => (focus.query ? bm.score(focus.query, i) : 0));
    // absolute scale (not max-normalised): one rare shared term ~ 1, common words ~ 0.1, so the best of many weak
    // matches is not inflated into a "perfect" match
    const lexScale = opts.lexicalScale || 6;
    const fe = new Set(focus.entities || []);
    const fq = new Set(focus.quests || []);
    const scored = items.map((it, i) => {
        const ents = it.entities || [];
        const overlap = ents.filter((e) => fe.has(e)).length;
        const entity = fe.size ? Math.min(1, overlap / Math.min(fe.size, 2)) : 0;
        const location = it.location && it.location === focus.location ? 1 : it.realm && it.realm === focus.realm ? 0.4 : 0;
        const quest = (it.quests || []).some((q) => fq.has(q)) ? 1 : 0;
        const age = Math.max(0, (focus.turn ?? 0) - (it.turn ?? 0));
        const recency = Math.pow(0.99, age);
        const importance = Math.max(0, Math.min(1, it.importance ?? 0.3));
        const lexical = Math.min(1, lex[i] / lexScale);
        let relation = 0;
        if (focus.relationStrength) for (const e of ents) relation = Math.max(relation, focus.relationStrength.get(e) || 0);
        const semantic = opts.semantic ? opts.semantic(it) : 0;
        const score = w.entity * entity + w.location * location + w.quest * quest + w.recency * recency
            + w.importance * importance + w.lexical * lexical + w.relation * relation + (opts.semanticWeight || 0) * semantic;
        return { item: it, score, parts: { entity, location, quest, recency, importance, lexical, relation } };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored;
}

/** Greedy packing under a token budget (items are already sorted by priority). */
export function pack(scored, budgetTokens, estimate, minScore = 0) {
    const out = [];
    let used = 0;
    for (const s of scored) {
        if (s.score < minScore) break;
        const cost = estimate(s.item.text);
        if (used + cost > budgetTokens) continue;
        out.push(s);
        used += cost;
    }
    return { items: out, used };
}
