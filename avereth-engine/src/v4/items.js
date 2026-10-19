// How a thing behaves when Alaric uses it (Patch 3, live run of 18.10.2026: "I use the flint and steel to make a small
// light" was read as an unknown skill, and the use command would have used the flint up; the boar meat was one thing,
// eaten whole or not at all). One small model over the objects the engine already keeps, no second inventory:
//
//   equipment   gear with a slot (content gear): worn and wielded, put on and off, never used up
//   tool        anything else he holds that is not food and not used up by its use: flint and steel, a rope, a knife
//   consumable  used up when used: a potion, a torch, a bandage, oil (one unit per use unless he says more)
//   food        eaten in portions (one portion is a meal): a meal takes what he eats, the rest stays; it keeps for a
//               while (rules.items.keeps_min), preserved food longer, and then it is spoiled (eating it is his choice)
//
// The words of a thing's name decide (content/rules.json items), once, when the thing comes into his hands: the object
// keeps its `use` and, for food, `fresh_until`. A document or a trophy is kept, never used up.
import { normText } from '../util.js';

const cache = new WeakMap();
function patterns(content) {
    const r = content.rules.items || {};
    if (!cache.has(r)) {
        const re = (w) => (w ? new RegExp(`(?:^| )(?:${w})(?: |$)`) : null);
        cache.set(r, { food: re(r.food), preserved: re(r.preserved), consumable: re(r.consumable), keeps: r.keeps_min || { fresh: 2880, preserved: 20160 } });
    }
    return cache.get(r);
}

const words = (name) => ` ${normText(String(name || '')).replace(/[^a-z0-9]+/g, ' ').trim()} `;

/** The content gear a name or template is (the staff, the robes, the clothes), or null. */
export function gearOf(content, ref) {
    if (typeof ref === 'string' && content.items.has(ref)) return content.items.get(ref);
    const n = normText(String(ref || ''));
    return [...content.items.values()].find((i) => normText(i.name) === n) || null;
}

/**
 * The behaviour of a thing: 'equipment' | 'tool' | 'consumable' | 'food'.
 * @param {{name: string, kind?: string, use?: string, template?: string}} o an object, or a sheet item
 */
export function useOf(content, o) {
    if (o?.use) return o.use;
    const gear = gearOf(content, o?.template || o?.name);
    if (gear?.slot && !['ammo', 'container'].includes(gear.slot)) return 'equipment';
    if (gear?.slot === 'ammo') return 'consumable';
    if (o?.kind === 'document' || o?.kind === 'trophy') return 'tool';
    const p = patterns(content);
    const w = words(o?.name);
    if (p.food?.test(w)) return 'food';
    if (p.consumable?.test(w)) return 'consumable';
    return o?.kind === 'resource' ? 'consumable' : 'tool';
}

/**
 * The fields a new object of Alaric's world carries for its behaviour: use, and for food its unit (portion) and the
 * minute it keeps until. Spread into object.created.
 */
export function itemTraits(content, { name, kind = 'item', unit = null }, minute) {
    const use = useOf(content, { name, kind });
    if (use !== 'food') return { use };
    const p = patterns(content);
    const keep = p.preserved?.test(words(name)) ? p.keeps.preserved : p.keeps.fresh;
    return { use, unit: unit || 'portion', fresh_until: (minute ?? 0) + keep };
}

/** Has this food spoiled by now? */
export const spoiled = (s, o) => Number.isFinite(o?.fresh_until) && (s.clock?.minute ?? 0) > o.fresh_until;

/** "3 portions", "1 portion", "2 flasks". */
export function unitsOf(n, unit) {
    if (!unit) return String(n);
    return `${n} ${n === 1 ? unit.replace(/s$/, '') : unit.endsWith('s') ? unit : `${unit}s`}`;
}
