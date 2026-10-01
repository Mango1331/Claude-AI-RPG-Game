// XP, Level-up loop (Core #3, #25, #28) and free Stat Point assignment.
import { rankOf, rankIndex } from './derived.js';
import { roundHalfUp } from './util.js';

/** Final target XP = round(Level*base_per_level (12) * rank-gap * type) vs the player's Rank at encounter start (Core #25). */
export function defeatXp(targetLevel, targetType, playerRank, content, strength = 1) {
    const x = content.rules.xp;
    const gap = rankIndex(rankOf(targetLevel, content), content) - rankIndex(playerRank, content);
    const key = String(Math.max(-2, Math.min(3, gap)));
    return roundHalfUp(targetLevel * x.base_per_level * x.rank_gap[key] * x.target_type[targetType || 'normal'] * strength);
}

/**
 * How much more a creature's defeat is worth than the standard of its Level and type, from its own numbers (live run
 * 30.09.2026 22:41: three boars, one of them the big one, 12 XP each): its HP times its ATK over the standard's,
 * valued at the rate the content prices the Elite type (Elite: HP ×1.75 and ATK ×1.15 for XP ×1.5). A creature with the
 * standard numbers is worth its Level's XP exactly, whatever it is called; a weaker one no less.
 */
export function strengthOf(fixed, standard, content) {
    const power = (fixed.max_hp / standard.max_hp) * (fixed.atk / standard.atk);
    if (!(power > 1)) return 1;
    const elite = content.monsters.elite;
    return 1 + ((power - 1) * (content.rules.xp.target_type.elite - 1)) / (elite.hp * elite.atk - 1);
}

/** Events for an XP award including the WHILE level-up loop with carryover. No resource refill. */
export function awardXp(sheet, amount, content, reason, who = 'pc') {
    const events = [];
    let xp = sheet.xp + amount;
    let level = sheet.level;
    const cls = sheet.class ? content.classes.get(sheet.class) : null;
    events.push({ t: 'xp.changed', d: { id: who, xp, amount, reason } });
    while (xp >= level * content.rules.progression.xp_to_next_per_level) {
        xp -= level * content.rules.progression.xp_to_next_per_level;
        level += 1;
        events.push({
            t: 'level.up', d: {
                id: who, level, xp_after: xp, free_points: content.rules.progression.free_points_per_level,
                favored: cls ? cls.favored : [], rank: rankOf(level, content),
            },
        });
    }
    return events;
}

export function questXp(recLevel, questType, content) {
    const x = content.rules.xp;
    return roundHalfUp(recLevel * x.quest_base_per_level * (x.quest_type[questType] || x.quest_type.standard));
}

export function assignStat(sheet, stat, amount, content) {
    if (!content.rules.stats.includes(stat)) return { errors: [`Unknown stat ${stat}.`] };
    if (!Number.isInteger(amount) || amount <= 0) return { errors: ['Amount must be a positive whole number.'] };
    if (amount > sheet.free_points) return { errors: [`Only ${sheet.free_points} free Stat Points available.`] };
    return { events: [{ t: 'stat.assigned', d: { id: 'pc', stat, amount } }] };
}
