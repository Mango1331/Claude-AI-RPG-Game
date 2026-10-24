// Patch 9D: compact lifetime facts, not narrator claims or a second combat log.
import { rulesetOf, skillOf } from '../content.js';
import { hash32, clone } from '../util.js';
import { dungeonOf } from './dungeon.js';

export const FEAT_TITLES = { giant: 'Giant Slayer', odds: 'Against the Odds', survival: 'Extraordinary Survival', development: 'Remarkable Development' };
export const careerOf = (s) => s.career || { seen: {}, stats: {}, feats: {}, style: {} };

/** Every actual HP loss is tracked before the encounter log is shortened. */
export function noteContribution(ctx, attacker, target, lost) {
    if (rulesetOf(ctx.state) < 2 || target.side !== 'hostile' || lost <= 0) return;
    const book = (ctx.enc.career ||= { damage: {}, personal: {} });
    book.damage[target.id] = (book.damage[target.id] || 0) + lost;
    if (attacker.id === 'pc') book.personal[target.id] = (book.personal[target.id] || 0) + lost;
}

function contextOf(s, enc, ids) {
    const kinds = [...new Set(ids.map((id) => {
        const e = s.entities[id] || {};
        return e.anchor || e.profile?.anchor || e.species || e.sheet?.template || e.template || e.kind || 'unknown';
    }))].sort();
    const place = (s.scene?.at && dungeonOf(s, s.scene.at)) || s.scene?.location || 'unknown';
    return `${kinds.join(',')}@${place}`;
}

/** The engine's own result of one finished fight. Old fights without contribution data give no invented credit. */
export function fightFeats(s, content, enc) {
    if (rulesetOf(s) < 2 || !enc?.career || careerOf(s).seen?.[`fight:${enc.id}`]) return [];
    const pc = enc.combatants.pc;
    const won = !pc.current.defeated && !pc.current.escaped;
    const r = content.rules.class_growth;
    const personal = (enc.defeated || []).filter((id) => {
        const c = enc.combatants[id];
        return c?.side === 'hostile' && c.current.hp === 0 && !c.current.surrendered &&
            (enc.career.personal[id] || 0) >= r.personal_share * Math.max(c.fixed.max_hp, enc.career.damage[id] || 0);
    });
    const source = `fight:${enc.id}`;
    const stats = { fights_won: won && personal.length ? 1 : 0, foes_defeated: personal.length,
        stronger_defeated: personal.filter((id) => enc.combatants[id].fixed.level > pc.fixed.level).length };
    const style = {};
    for (const sid of Object.keys(enc.pp?.used || {})) {
        const k = skillOf(content, sid, s);
        if (!k || k.item || k.weapon_attack) continue;
        for (const tag of k.tags || []) style[tag] = (style[tag] || 0) + 1;
        const role = k.attack ? 'offense' : (k.effects || []).some((e) => ['temp_def', 'temp_mdef', 'barrier', 'incoming_damage_reduction', 'damage_reduction_next'].includes(e.kind)) ? 'defense' : 'utility';
        style[role] = (style[role] || 0) + 1;
    }
    const context = contextOf(s, enc, personal);
    const feats = [];
    const gap = personal.length ? Math.max(...personal.map((id) => enc.combatants[id].fixed.level - pc.fixed.level)) : 0;
    const facts = { fight: enc.id, level: pc.fixed.level, gap, personal: personal.length };
    const add = (kind, more = {}) => feats.push({ key: `${kind}:${hash32(context)}`, kind, title: FEAT_TITLES[kind], context, source, turn: s.turn, minute: s.clock.minute, facts: { ...facts, ...more } });
    if (won && personal.length && gap >= r.giant_gap) add('giant', { extreme: pc.fixed.level === 1 && personal.some((id) => enc.combatants[id].fixed.level >= 15) });
    if (won && personal.filter((id) => enc.combatants[id].fixed.level >= pc.fixed.level).length >= r.outnumbered) { add('odds'); stats.outnumbered_wins = 1; }
    const t = enc.pp?.trial;
    if (won && personal.length && t && t.start >= r.survival.start_pct && t.low <= r.survival.low_pct && gap >= r.survival.gap && personal.some((id) => t.foes.includes(id))) {
        add('survival', { start: t.start, low: t.low }); stats.dangerous_wins = 1;
    }
    stats.extraordinary_wins = feats.length ? 1 : 0;
    return [{ t: 'career.recorded', d: { source, stats, feats, style } }];
}

/** An accepted mechanical Skill evolution is development; PP and mere names are not. */
export function developmentFeats(s, content, events) {
    if (rulesetOf(s) < 2) return [];
    const out = events.filter((e) => e.t === 'skill.evolved' && e.d.id === 'pc').flatMap((e) => {
        const k = skillOf(content, e.d.to, s);
        const source = `evolution:${e.d.to}`;
        if (!k || careerOf(s).seen?.[source]) return [];
        const context = `development:${(k.tags || []).slice().sort().join(',')}:${k.complexity}`;
        return [{ t: 'career.recorded', d: { source, stats: {}, style: {}, feats: [{ key: `development:${hash32(context)}`, kind: 'development', title: FEAT_TITLES.development, context, source, turn: s.turn, minute: s.clock.minute, facts: { skill: k.id, complexity: k.complexity } }] } }];
    });
    for (const e of events.filter((e) => e.t === 'growth.session' && e.d.minutes > 0)) {
        const goal = s.growth?.goals?.[e.d.goal];
        if (!goal) continue;
        const source = `training:${e.d.goal}:${e.d.day}`;
        if (careerOf(s).seen?.[source] || out.some((x) => x.d.source === source)) continue;
        const style = Object.fromEntries((goal.target.tags || []).map((tag) => [tag,1]));
        if (Object.keys(style).length) out.push({ t:'career.recorded', d:{source,stats:{},feats:[],style} });
    }
    return out;
}

/** One stable source is counted once. Only compact facts and the best record of each category/context are kept. */
export function applyCareerEvent(s, d) {
    const c = (s.career ||= { seen: {}, stats: {}, feats: {}, style: {}, since: { turn: s.turn, minute: s.clock.minute } });
    if (c.seen[d.source]) return;
    c.seen[d.source] = true;
    for (const [k, n] of Object.entries(d.stats || {})) c.stats[k] = (c.stats[k] || 0) + n;
    for (const [k, n] of Object.entries(d.style || {})) c.style[k] = (c.style[k] || 0) + n;
    for (const f of d.feats || []) {
        const old = c.feats[f.key];
        if (!old || f.facts?.extreme || (f.facts?.gap || 0) > (old.facts?.gap || 0)) c.feats[f.key] = clone(f);
    }
}

/** First evolution is capped at Rare. Extreme facts survive for a future Legendary gate. */
export function classQuality(s, content) {
    const c = careerOf(s), r = content.rules.class_growth.rare;
    const feats = Object.values(c.feats || {});
    const contexts = {};
    for (const f of feats) contexts[f.context] = Math.min(r.per_context, (contexts[f.context] || 0) + 1);
    const points = Object.values(contexts).reduce((a, b) => a + b, 0);
    return (s.entities?.pc?.sheet?.class_history || []).some((h) => ['rare','legendary'].includes(h.quality)) || feats.some((f) => f.kind === 'giant') || (points >= r.feats && Object.keys(contexts).length >= r.contexts) ? 'rare' : 'normal';
}

export function featLines(s, content) {
    if (rulesetOf(s) < 2) return ['[SYSTEM // FEATS]', 'Lifetime feats are not part of this campaign ruleset.'];
    const c = careerOf(s);
    return ['[SYSTEM // FEATS]', `Tracked career${c.since ? ` since turn ${c.since.turn}` : ': tracking begins with Patch 9D'}.`,
        `Fights won ${c.stats.fights_won || 0} | Personally defeated ${c.stats.foes_defeated || 0} | Stronger foes ${c.stats.stronger_defeated || 0}`,
        `Extraordinary wins ${c.stats.extraordinary_wins || 0} | Outnumbered wins ${c.stats.outnumbered_wins || 0} | Dangerous wins ${c.stats.dangerous_wins || 0}`,
        `Class quality unlocked: ${classQuality(s, content)} (first evolution: at most Rare)`,
        ...Object.values(c.feats).map((f) => `- ${f.title}: ${f.context} (${f.source})${f.facts.extreme ? ' · exceptional Legendary evidence preserved; prior Rare class required' : ''}`)];
}
