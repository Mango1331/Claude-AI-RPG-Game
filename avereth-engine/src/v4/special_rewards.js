// Bossloot V1 (.193): independent hash draws, existing item profiles and object events only.
import { hash32, slug } from '../util.js';
import { gearBases, itemProfile, itemTraits, profileOf, rankRefusal, sourceText, gearText } from './items.js';

const roll = key => parseInt(hash32(key), 16) / 0x100000000;
const pick = (key, entries) => {
    const pairs = Array.isArray(entries) ? entries.map(v => [v, 1]) : Object.entries(entries);
    let n = roll(key) * pairs.reduce((n, [, w]) => n + w, 0);
    return pairs.find(([, w]) => (n -= w) < 0)?.[0];
};
const roleKey = e => e.slot && JSON.stringify([e.slot.dungeon, e.slot.floor, e.slot.role]);
export function rewardTier(e) {
    if (e.kind !== 'creature') return null;
    if (e.slot) return e.slot.role === 'guard' ? 'guardian' : e.slot.role === 'boss' ? 'boss' : null;
    return e.profile?.type === 'elite' ? 'elite' : null;
}
const slotTaken = (s, e) => {
    const slot = e.slot;
    const dungeon = s.dungeons?.[slot?.dungeon];
    return slot && dungeon?.cycle === slot.cycle && dungeon.run?.floors?.[slot.floor]?.slots?.some(x => x.id === slot.id && x.taken);
};

/** Prior looted markers are PC loot credit, including pre-.193 saves; taken slots are not. */
export function firstReward(s, e, seen = new Set()) {
    const key = roleKey(e);
    return !!key && !seen.has(key) && !Object.values(s.entities).some(old => old.id !== e.id && old.looted && roleKey(old) === key);
}

export function rewardDescription(s, content, o) {
    const p = profileOf(content, o);
    let info = gearText(p) || sourceText(p) || (p?.kind === 'restore' ? `${p.amount} ${p.resource.toUpperCase()} per use` : 'trade material, no effect');
    if (p?.kind === 'gear') {
        const eq = s.entities.pc.sheet.equipment?.[p.slot];
        const current = typeof eq === 'string' ? content.items.get(eq) : eq;
        if (current) info += ' · vs equipped ' + ['atk', 'matk', 'def', 'mdef'].filter(k => p[k] || current[k]).map(k => `${k.toUpperCase()} ${current[k] || 0} → ${p[k] || 0} (${p[k] - (current[k] || 0) >= 0 ? '+' : ''}${(p[k] || 0) - (current[k] || 0)})`).join(', ');
    }
    if (p?.kind === 'skill_source') info += ' · use outside combat to learn; no reroll if known';
    const refusal = p?.kind !== 'restore' && rankRefusal(content, s.entities.pc.sheet.level, p);
    return `${o.name}${o.qty > 1 ? ` ×${o.qty}` : ''} · ${info}${refusal ? ` · ${refusal}` : ''} · value guide ~${o.value_cp ?? p?.value_cp} cp each (not a guaranteed sale price)`;
}

export function specialReward(s, content, enc, e, seen) {
    const cfg = content.monsters.loot.special;
    const tier = rewardTier(e);
    if (!cfg || !tier || slotTaken(s, e)) return null;
    const first = tier !== 'elite' && firstReward(s, e, seen);
    const rule = cfg.tiers[tier][first ? 'first' : 'repeat'];
    const rank = e.profile.rank;
    // Explicit fields rather than an assumed slot.ref; current entities store dungeon/cycle/floor/id/role.
    const identity = e.slot ? JSON.stringify([e.slot.dungeon, e.slot.cycle, e.slot.floor, e.slot.id, e.id]) : `${enc.id}|${e.id}`;
    const key = `${s.rng?.seed}|${identity}|special_reward`;
    const chosen = [];
    const object = (name, kind = 'item', teaches = null, qty = 1, value_cp = null) => {
        const profile = itemProfile(content, {name, kind, teaches, balance: true});
        const id = `obj.reward.${slug(enc.id)}.${slug(e.id)}.${chosen.length + 1}`;
        chosen.push({ id, name, kind, qty, stack: qty > 1, unit: null, holder: {entity: 'pc'}, marks: [], for_quests: [],
            source: {turn: s.turn, how: 'special_reward', encounter: enc.id, foe: e.id}, rank,
            ...itemTraits(content, {name, kind, teaches, balance: true}, s.clock?.minute, profile),
            ...(value_cp !== null ? {value_cp, use: 'tool'} : {}) });
    };
    if (roll(`${key}|chance`) < rule.chance) {
        if (roll(`${key}|stone`) < rule.stone) {
            const fn = pick(`${key}|fn`, cfg.stone_fn_by_anchor[e.profile.anchor] || cfg.stone_fn_by_anchor.default);
            object(`${rank}-Rank Skill Stone`, 'item', {source: 'stone', fn, tags: [], aspects: []});
        } else {
            const type = pick(`${key}|type`, rule.types);
            if (type === 'gear') {
                const quality = pick(`${key}|quality`, rule.quality);
                const cls = String(s.entities.pc.sheet.class || '').split('.').at(-1).toLowerCase();
                const pool = roll(`${key}|class`) < cfg.class_chance && cfg.class_pool[cls] ? cfg.class_pool[cls]
                    : cfg.theme_pool[e.profile.anchor] || cfg.theme_pool.default;
                const base = gearBases(content).find(b => b.id === pick(`${key}|base`, pool));
                if (!base) throw new Error('special reward: unsupported gear base');
                object(`${quality} ${rank}-Rank ${base.name}`);
            } else if (type === 'potions') {
                const count = tier === 'boss' ? 3 : 2;
                for (let i = 0; i < count; i++) {
                    const quality = tier === 'boss' ? pick(`${key}|pquality|${i}`, ['fine', 'superior']) : 'fine';
                    const pool = String(s.entities.pc.sheet.class).endsWith('mage') ? cfg.potions.mage : cfg.potions.other;
                    object(`${quality} ${rank}-Rank ${pick(`${key}|potion|${i}`, pool)}`);
                }
            } else object(`${rank}-Rank ${e.name || e.species} Trophy`, 'resource', null, 1, cfg.material_cp * 3 ** ['F','E','D','C','B','A','S'].indexOf(rank));
        }
    }
    if (tier === 'boss' && first) object(`${rank}-Rank ${e.name || e.species} Trophy`, 'resource', null, 1, cfg.boss_trophy_cp * 3 ** ['F','E','D','C','B','A','S'].indexOf(rank));
    if (e.slot) seen.add(roleKey(e));
    const objects = chosen.filter(o => !s.objects?.[o.id]);
    // U10: historical participation, not prose or survivors only. Neutral bystanders are not allies.
    const solo = !Object.values(enc.combatants).some(c => c.id !== 'pc' && (c.side === 'ally' || c.side === 'pc'));
    const meta = {tier, first, solo, ...(e.slot ? {cycle: e.slot.cycle} : {})};
    return { meta, objects, events: objects.map(object => ({t: 'object.created', d: {object}})),
        lines: objects.length ? [`SPECIAL REWARD — ${e.name || e.species} (${tier}${e.slot ? ` · level ${e.slot.floor}` : ''} · ${first ? 'first defeat' : 'repeat'})`, ...objects.map(o => rewardDescription(s, content, o))] : [] };
}
