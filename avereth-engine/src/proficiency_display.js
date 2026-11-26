import { effectValue, flatEffectValue } from './skills.js';
import { effectiveStats, passiveTotals, skillCostAmount } from './passives.js';
import { rulesetOf } from './content.js';

/** Patch 9B-1: what a Skill's numeric effects give at this Proficiency, as the combat engine books them. */
export function effectsNow(content, sk, stats, prof, ruleset) {
    return (sk.effects || []).map((e) => {
        if (e.kind === 'temp_def' || e.kind === 'temp_mdef') return `${e.kind === 'temp_def' ? 'DEF' : 'MDEF'} +${effectValue(content, e, stats, prof, ruleset)}`;
        if (e.kind === 'barrier') return `Barrier ${effectValue(content, e, stats, prof, ruleset)} HP`;
        if (e.kind === 'post_attack_temp_def') return `DEF +${flatEffectValue(content, e.flat, prof, ruleset)} after the attack`;
        return null;
    }).filter(Boolean);
}

// Presentation only. Both sides of the comparison use the same current sheet.
export function masteryChange(state, content, skill, from, to, who = 'pc') {
    const sheet = state.entities[who]?.sheet || state.entities[who]?.profile;
    if (!sheet || !skill) return '';
    const levels = content.rules.proficiency.levels;
    const mods = passiveTotals(sheet, content).cost;
    const cost = p => skillCostAmount(content, skill, p, mods, true);
    const describe = (a, b) => a === b ? String(b) + ' (unchanged)' : a + ' → ' + b;
    const parts = ['Cost ' + describe(cost(from), cost(to)) + (skill.cost ? ' ' + skill.cost.resource.toUpperCase() : '')];
    if (skill.attack) {
        const power = p => Math.round(levels[p].power * 100) + '%';
        parts.push('Power ' + describe(power(from), power(to)));
        const next = Object.keys(levels).map(Number).find(p => p > to && levels[p].power > levels[to].power);
        if (next && levels[from].power === levels[to].power) parts.push('next Power increase P' + next);
    }
    const effects = p => effectsNow(content, skill, effectiveStats(sheet, content), p, rulesetOf(state)).join(', ');
    if (effects(to)) parts.push(describe(effects(from), effects(to)));
    return parts.join(' · ');
}
