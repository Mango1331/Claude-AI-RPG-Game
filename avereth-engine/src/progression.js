// XP, Level-up loop (Core #3, #25, #28) and free Stat Point assignment.
import { rankOf, rankIndex } from './derived.js';
import { roundHalfUp } from './util.js';

/** Final target XP = round(Level*10 * rank-gap * type) vs the player's Rank at encounter start (Core #25). */
export function defeatXp(targetLevel, targetType, playerRank, content) {
    const x = content.rules.xp;
    const gap = rankIndex(rankOf(targetLevel, content), content) - rankIndex(playerRank, content);
    const key = String(Math.max(-2, Math.min(3, gap)));
    return roundHalfUp(targetLevel * x.base_per_level * x.rank_gap[key] * x.target_type[targetType || 'normal']);
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
