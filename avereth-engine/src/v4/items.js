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
import { itemTemplateOf, restoreTemplateOf, weaponFamily } from '../content.js';
import { rankOf, rankIndex } from '../derived.js';
import { composerFunctions, composeTags, composeAspects } from '../skill_composer.js';

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

// ------------------------------------------------------------------------------------------------ Patch 7.1
// A concrete item's own values (docs/PROTOTYPE_C.md, Patch 7.1): fixed once when the item is established (an offer
// line, then the purchase that carries the line's profile over; loot; the story) and kept on the object as `profile`,
// never rolled again and never changed by the story. A Rank is a band, not a strength: the quality its name gives it
// places it in the reference range of its kind (content gear instances), higher Ranks scale it (gear references_text:
// HIGHER-RANK GENERATION). Ordinary things (food, tools, documents) have none and stay as they were.

// Final review of Patch 7.1: "[D] wand" was read as no Rank (a "\b" before the bracket never matches) and stored as F.
// A Rank is stated as "[D]" / "[D-Rank]", "D-Rank" / "D rank" / "D-ranked", or "Rank D" / "Rank-D", in any case; only a
// lower-case "a rank" stands apart: it is the adjective ("a rank, rotting hide"), never an A-Rank thing.
const RANK_RE = /\[\s*([fedcbasFEDCBAS])(?:\s*-?\s*[Rr][Aa][Nn][Kk](?:ed)?)?\s*\]|\b([fedcbsFEDCBAS](?:\s+|\s*-\s*)|[Aa]\s*-\s*)[Rr][Aa][Nn][Kk](?:ed)?\b|\b[Rr][Aa][Nn][Kk](?:\s+|\s*-\s*)([fedcbasFEDCBAS])\b/;

/** The Rank a name states ("E-Rank longsword", "[D] wand", "Rank C staff"), or null. */
export function rankInName(name) {
    const m = RANK_RE.exec(String(name || ''));
    return m ? (m[1] || m[2] || m[3])[0].toUpperCase() : null;
}

/** The quality tier the words of a name give a thing (content gear instances.quality); common when none says. */
export function qualityOf(content, name) {
    const q = content.gear?.instances?.quality || [];
    const w = words(name);
    const said = q.filter((x) => x.words.some((p) => w.includes(` ${normText(p).replace(/[^a-z0-9]+/g, ' ').trim()} `)));
    // the strongest word wins ("a fine but battered blade" is no better than fine): the last tier named
    return said.length ? said[said.length - 1] : q.find((x) => x.tier === 'common') || { tier: 'common', at: 0.35, power: 1 };
}

const rankFactor = (content, rank) => 1 + (content.gear?.rank_scaling?.per_rank_index ?? 0.75) * Math.max(0, rankIndex(rank || 'F', content));

/** The gear kind a name is (a wand, a shield, a mail shirt, a sword), or null. */
function gearKindOf(content, name) {
    const w = words(name);
    const kinds = content.gear?.instances?.gear_kinds || [];
    for (const k of kinds) if (k.words.some((p) => w.includes(` ${normText(p).replace(/[^a-z0-9]+/g, ' ').trim()} `))) return k;
    return null;
}

/** Existing equipment slots only, including supported noncombat clothing/quiver templates. */
export const equipmentSlotKnown = (content, slot) => [...content.items.values()].some(i => i.slot === slot)
    || (content.gear?.instances?.gear_kinds || []).some(k => k.slot === slot);

/** An intent flag classifies merchandise; the engine still owns its category, slot and values. */
export function gearOfferWhy(content, line, profile) {
    if (line.kind !== 'goods' || line.equipment === false) return null;
    const head = words(line.what).split(/\b(?:with|of|from)\b/)[0];
    const accessory = /\b(?:straps?|buckles?|repair kit|polish|oil)\b/.test(head);
    const part = !accessory && /\b(?:shin guards?|greaves?|bracers?|gauntlets?|helmets?|pauldrons?)\b/.test(head);
    if (part) return 'that separate armor part has no equipment slot; offer supported whole armor instead';
    const intended = line.equipment === true || (!accessory && /\b(?:armou?r|weapons?)\b/.test(head));
    if (intended && profile?.kind !== 'gear') return 'no supported combat equipment kind';
    if (profile?.kind === 'gear' && !equipmentSlotKnown(content, profile.slot)) return 'no supported equipment slot';
    return null;
}

export function gearText(profile) {
    if (profile === null) return 'ordinary item; no combat stats';
    if (profile?.kind !== 'gear') return '';
    const stats = ['atk', 'matk', 'def', 'mdef'].filter(k => profile[k]).map(k => `${k.toUpperCase()} ${profile[k]}`).join(', ');
    return `${profile.rank} ${profile.slot}: ${stats}`;
}

/** Same content-derived market vocabulary for narrator, planner and extractor; no new slots or numbers. */
export function gearMarketText(content) {
    const kinds = content.gear?.instances?.gear_kinds || [];
    return `GEAR MARKET — Mechanical equipment uses only these supported categories: ${kinds.map(k => `${k.words.slice(0, 2).join('/')} (${k.slot})`).join('; ')}. Use a recognized kind in a combat equipment offer's name; appearance may vary freely. Only the engine fixes its values. No extra head, leg, hand or jewelry slots or bonuses. Separate armor parts are not whole armor. Ordinary tools, clothes and decoration remain available, explicitly without combat stats.`;
}

/**
 * The profile a thing gets when it is established, or null for an ordinary thing:
 *   attack  an offensive item of a kind the content knows (item_effects): its own power (standard × quality × Rank),
 *           reach, area and uses, and the Rank it needs
 *   gear    a weapon, focus, armor or shield: its slot, family and own ATK/MATK/DEF/MDEF (the kind's reference range
 *           placed by quality, scaled by Rank)
 * A content gear template by its exact name (the starter staff) keeps the template's values.
 */
// Patch 9C-2b (docs/PATCH9C2B_STONES_MATERIALS.md): a Skill Stone or a manual is a source of one technique. It is one
// only when its words name the kind (rules.json growth.sources; a manual also as a document) AND what it teaches was
// established with it (the extractor's teaches of object.new or of an offer line, an engine source): the function,
// and the tags and aspects the source states; nothing the source does not state is filled in (a function it does
// not name stays null and teaches nothing). The profile describes the source, never a finished Skill; the engine
// composes the Skill when it is learned (src/v4/growth.js). A return stone, a pebble or a storybook is none.
const has = (name, list) => (list || []).some((w) => words(name).includes(` ${normText(w)} `));
export function skillSource(content, { name, kind = 'item', teaches = null }) {
    const r = content.rules.growth?.sources;
    if (!r || !name || !teaches || typeof teaches !== 'object' || !['stone', 'manual'].includes(teaches.source)) return null;
    // Patch 9C-2c: what is called a Passive Stone is no Skill Stone of the story's: its power is the engine's alone
    if (has(name, r.passive_stone_words)) return null;
    // 4.3.0-c.6.6.48: a stone established as teaching (teaches.source stone) is one by any name calling it a stone
    const recognised = teaches.source === 'stone' ? has(name, r.stone_words) || has(name, r.stone_objects) : (kind === 'document' || has(name, r.manual_words));
    if (!recognised) return null;
    const fn = composerFunctions(content).includes(teaches.fn) ? teaches.fn : null;
    // only tags and aspects the technique supports; an unsupported one is not taken (nor replaced)
    const tags = fn ? [...new Set((Array.isArray(teaches.tags) ? teaches.tags : []).filter((t) => !composeTags(content, fn, [t]).error))].slice(0, 2) : [];
    const aspects = [...new Set((Array.isArray(teaches.aspects) ? teaches.aspects : []).filter((a) => !composeAspects(content, [a]).error))].slice(0, 2);
    return { kind: 'skill_source', source: teaches.source, title: teaches.source === 'stone' ? 'Skill Stone' : 'manual', rank: rankInName(name) || 'F', fn, tags, aspects, value_cp: r.value_cp?.[teaches.source] ?? 0 };
}

/**
 * Review of 9C-2b (R1): what a thing's words call it, a Skill Stone or a manual, whether or not anything it teaches was
 * established ('stone' | 'manual' | null). Only to refuse or to say plainly that it teaches nothing; never a profile.
 */
export function namedSource(content, { name, kind = 'item' }) {
    const r = content.rules.growth?.sources;
    if (!r || !name) return null;
    if (has(name, r.passive_stone_words)) return 'passive_stone';
    if (has(name, r.stone_words)) return 'stone';
    return has(name, r.manual_words) ? 'manual' : null;
}

/** "Skill Stone · F · Fire bolt (Arcane)", "manual · F · teaches no technique the story named". */
export function sourceText(p) {
    if (p?.kind !== 'skill_source') return '';
    const what = p.fn ? `${p.aspects.length ? `${p.aspects.join('/')} ` : ''}${p.fn}${p.tags.length ? ` (${p.tags.join(', ')})` : ''}` : 'no technique the story named';
    return `${p.title} · ${p.rank} · ${p.fn ? (p.source === 'stone' ? 'holds' : 'teaches') : 'holds'} ${what}`;
}

export function itemProfile(content, { name, kind = 'item', effect = null, teaches = null }) {
    const src = skillSource(content, { name, kind, teaches });
    if (src) return src;
    if (!name || kind === 'document' || kind === 'trophy' || kind === 'resource') return null;
    const q = qualityOf(content, name);
    const rank = rankInName(name);
    // Patch 7.2: a restorative the story establishes as one (object.new / offer line effect: heal, restore_mp,
    // restore_sta) is that kind, when the thing is a consumable at all (a potion, a tonic: content rules item_use); its
    // name's words name it otherwise. An effect the engine does not know, or one on a thing that is no consumable, is none
    const said = typeof effect === 'string' && useOf(content, { name, kind }) === 'consumable' ? restoreTemplateOf(content, effect) : null;
    const fx = said || itemTemplateOf(content, name);
    if (fx?.restore) {
        const r = rank || fx.rank || 'F';
        const p = {
            kind: 'restore', base: fx.id, title: fx.name, rank: r, quality: q.tier, effect: fx.effect, resource: fx.restore.resource,
            amount: Math.max(1, Math.round(fx.restore.amount * q.power * rankFactor(content, r) / rankFactor(content, fx.rank || 'F'))),
            uses: fx.uses ?? 1, ...(fx.requires_rank ? { requires_rank: fx.requires_rank } : {}),
        };
        return { ...p, value_cp: valueOf(content, p) };
    }
    if (fx?.attack) {
        const r = rank || fx.rank || 'F';
        const p = {
            kind: 'attack', base: fx.id, title: fx.name, rank: r, quality: q.tier,
            power: Math.round(fx.attack.base * q.power * rankFactor(content, r) / rankFactor(content, fx.rank || 'F')),
            damage_type: fx.attack.damage_type, range: fx.range?.band || 'SHORT',
            area: (fx.effects || []).find((e) => e.kind === 'area') ? { shape: fx.effects.find((e) => e.kind === 'area').shape, size: fx.effects.find((e) => e.kind === 'area').size || null } : null,
            uses: fx.uses ?? 1, ...(fx.requires_rank ? { requires_rank: fx.requires_rank } : {}),
        };
        return { ...p, value_cp: valueOf(content, p) };
    }
    const tpl = gearOf(content, name);
    if (tpl?.slot && !['ammo', 'container', 'quiver', 'clothing'].includes(tpl.slot)) {
        const p = { kind: 'gear', base: tpl.id, title: tpl.name, rank: tpl.rank || 'F', quality: 'common', slot: tpl.slot, family: tpl.family || null, atk: tpl.atk || 0, matk: tpl.matk || 0, def: tpl.def || 0, mdef: tpl.mdef || 0 };
        return { ...p, value_cp: valueOf(content, p) };
    }
    const g = gearKindOf(content, name);
    if (!g) return null;
    const r = rank || 'F';
    const ref = content.gear?.f_rank_reference || {};
    const stat = (key) => {
        const [lo, hi] = ref[key] || [0, 0];
        return Math.max(1, Math.round((lo + q.at * (hi - lo)) * rankFactor(content, r)));
    };
    const vals = Object.fromEntries(Object.entries(g.values).map(([k, key]) => [k, stat(key)]));
    const family = g.family === 'by_words' ? weaponFamily(content, name) || 'melee' : g.family;
    const p = { kind: 'gear', base: g.id, title: null, rank: r, quality: q.tier, slot: g.slot, family, atk: vals.atk || 0, matk: vals.matk || 0, def: vals.def || 0, mdef: vals.mdef || 0 };
    return { ...p, value_cp: valueOf(content, p) };
}

/**
 * A guideline price in copper for a profile (content gear instances.value): what an ordinary merchant would ask for an
 * item like it; a stronger variant of the same kind is worth more. Never a price itself: offers keep their own.
 */
export function valueOf(content, p) {
    const v = content.gear?.instances?.value || {};
    const f = rankFactor(content, p.rank) ** 2;
    if (p.kind === 'attack') return Math.max(1, Math.round(p.power * (v.attack_cp_per_power ?? 0.6) * (p.area ? v.area_factor ?? 1.5 : 1) * (p.uses ?? 1) * f / rankFactor(content, p.rank)));
    if (p.kind === 'restore') return Math.max(1, Math.round(p.amount * (v.restore_cp_per_point?.[p.resource] ?? 0.8) * (p.uses ?? 1) * f / rankFactor(content, p.rank)));
    if (p.kind === 'gear') return Math.max(1, Math.round(((p.atk || 0) + (p.matk || 0) + (p.def || 0) + (p.mdef || 0)) * (v.gear_cp_per_point ?? 8) * f / rankFactor(content, p.rank)));
    return null;
}

/**
 * The plausibility of a price for a profile: null when it lies within the guideline's span (content gear
 * instances.value.plausible, per unit), else a note for the audit. Merchants differ; nothing is refused for it.
 */
export function priceAudit(content, p, price_cp, qty = 1) {
    if (!p?.value_cp || !Number.isInteger(price_cp)) return null;
    const [lo, hi] = content.gear?.instances?.value?.plausible || [0.5, 2];
    const each = price_cp / Math.max(1, qty || 1);
    if (each >= p.value_cp * lo && each <= p.value_cp * hi) return null;
    if (p.kind === 'skill_source') return `${each} cp for a ${p.rank}-Rank ${p.title} is ${each < p.value_cp * lo ? 'far below' : 'far above'} the guideline of about ${p.value_cp} cp`;
    return `${each} cp for a ${p.quality} ${p.rank}-Rank ${p.kind === 'attack' ? `${p.title} (power ${p.power})` : p.kind === 'restore' ? `${p.title} (${p.amount} ${p.resource.toUpperCase()})` : `${p.slot} (${['atk', 'matk', 'def', 'mdef'].filter((k) => p[k]).map((k) => `${k.toUpperCase()} ${p[k]}`).join(', ')})`} is ${each < p.value_cp * lo ? 'far below' : 'far above'} the guideline of about ${p.value_cp} cp`;
}

/**
 * The profile of a thing as it stands: its own snapshot; a loot piece of c.6.6.4 by its stored rank and gear values;
 * else null (an ordinary thing, or one established before snapshots: its kind's standard profile, src/content.js).
 */
export function profileOf(content, o) {
    if (o?.profile?.kind) return o.profile;
    if (o?.gear?.slot) return { kind: 'gear', base: null, title: null, rank: o.rank || 'F', quality: 'common', slot: o.gear.slot, family: o.gear.family || (o.gear.slot === 'weapon' ? weaponFamily(content, o.name) || 'melee' : null), atk: o.gear.atk || 0, matk: o.gear.matk || 0, def: o.gear.def || 0, mdef: o.gear.mdef || 0 };
    return null;
}

/**
 * Patch 7.1: may Alaric (or anyone of this level) use a ranked item? Up to his own Power-Rank (F uses F; E uses F and E),
 * or the Rank the item's profile names as its own requirement (an exceptional piece). Unranked things always.
 * @returns {null | string} why not
 */
export function rankRefusal(content, level, p) {
    const need = p?.requires_rank || p?.rank;
    if (!need) return null;
    const own = rankOf(level || 1, content);
    if (rankIndex(own, content) >= rankIndex(need, content)) return null;
    return `${p.title || 'it'} is ${/^[AEFS]/.test(p.rank) ? 'an' : 'a'} ${p.rank}-Rank item${p.requires_rank && p.requires_rank !== p.rank ? ` that needs Power Rank ${p.requires_rank}` : ''}; Alaric's Power Rank is ${own}: he may carry, keep or sell it, but not ${p.kind === 'gear' ? 'wear or wield' : 'activate'} it`;
}

/**
 * Patch 7.2: the restorative a thing is, as its profile: its own snapshot (kind restore, fixed when it was established),
 * else the standard of its kind by the words of its name (one established before 7.2); null for anything else, and
 * never an effect the story told of without the engine knowing the kind.
 */
export function restoreOf(content, o) {
    if (!o) return null;
    if (o.profile?.kind === 'restore' && Number.isFinite(o.profile.amount)) return o.profile;
    if (o.profile?.kind) return null;
    const p = itemProfile(content, { name: o.name, kind: o.kind || 'item' });
    return p?.kind === 'restore' ? p : null;
}

/**
 * Patch 7.2: may Alaric drink it now, and what does it do? One of his own resources, never above its maximum; refused
 * (nothing used up) at the maximum, as a draught that does nothing is no action of his. A Rank requirement only where
 * the item's profile names one (requires_rank): the Core binds no restorative to a Power-Rank.
 * @returns {{refused: string} | {resource: string, amount: number, before: number, after: number, max: number}}
 */
export function restoreEffect(content, p, { level, current, max }) {
    if (p.requires_rank) {
        const no = rankRefusal(content, level, { ...p, rank: p.requires_rank });
        if (no) return { refused: no };
    }
    const r = p.resource;
    const before = current[r] ?? 0;
    if (before >= max[r]) return { refused: `his ${r.toUpperCase()} is full (${before}/${max[r]}): the ${p.title.toLowerCase()} would do nothing` };
    const after = Math.min(max[r], before + p.amount);
    return { resource: r, amount: after - before, before, after, max: max[r] };
}

/**
 * The fields a new object of Alaric's world carries for its behaviour: use, and for food its unit (portion) and the
 * minute it keeps until; Patch 7.1: an item with values of its own (gear, an attack item) its profile, fixed now. Spread
 * into object.created; a purchase carries the offer line's profile instead (src/v4/trade.js).
 */
export function itemTraits(content, { name, kind = 'item', unit = null, effect = null, teaches = null }, minute, profile = undefined) {
    const own = profile !== undefined ? profile : itemProfile(content, { name, kind, effect, teaches });
    const use = own?.kind === 'gear' ? 'equipment' : useOf(content, { name, kind });
    if (own) return { use, profile: own };
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
