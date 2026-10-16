// Prototype C (4.3.0-c.6.6.4): automatic loot at the end of a fight Alaric won. A video-game comfort the engine owns:
// no "I loot the corpse", no SEARCH check, no time spent. What each foe killed in the fight leaves is credited once, in
// the events of the turn that ended the fight (event-sourced: a reload or a swipe replays those events and draws
// nothing again), deterministically from the fight and the foe (the same fight always yields the same things).
//
// - creatures: the materials of their body plan (content monsters.json loot.anchors), named after their own species,
//   carrying their Power Rank as data (object.rank) and a guide value that rises with the Rank; no coin
// - humanoid creatures (goblin, ogre): a little coin and crude gear by chance; people: the weapon and armour their sheet
//   carries, what their pack holds, and a purse that fits their station (template)
// - stacks: the same material of the same Rank is one stack (object.added); another Rank is another stack
// - never: a foe that fled, surrendered or survived, a fight Alaric fled or died in, a foe already looted, equipping
import { hash32, slug } from '../util.js';
import { rankOf } from '../derived.js';

const ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
/** A draw in [min, max] fixed by the fight, the foe and what is drawn. */
const roll = (key) => parseInt(hash32(key), 16);
function draw(key, [min, max]) {
    if (max <= min) return min;
    return min + (roll(key) % (max - min + 1));
}
const chance = (key, p) => (roll(key) % 1000) < Math.round(p * 1000);
const titled = (t) => String(t || '').split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
/** The species a material is named after: the creature's own kind, at most its last three words ("Road Beast"). */
function speciesName(e, anchor) {
    const words = String(e.species || anchor?.name?.split('/')[0] || 'creature').replace(/[^A-Za-z' -]/g, ' ').trim().split(/\s+/);
    return titled(words.slice(-3).join(' '));
}
const valueOf = (base, rank, factor) => Math.max(1, Math.round((base || 1) * factor ** Math.max(0, ORDER.indexOf(rank))));

/**
 * The events that credit Alaric the loot of this ended encounter (empty when nothing is his to take).
 * @param {object} s the state after the fight's deaths (entity.status dead) were applied
 * @param {object} content the content pack
 * @param {object} enc the terminal encounter
 * @returns {{events: object[], lines: string[]}}
 */
export function lootEvents(s, content, enc) {
    const table = content.monsters?.loot;
    const pc = enc.combatants.pc;
    if (!table || !pc || pc.current.hp === 0 || pc.current.escaped) return { events: [], lines: [] };
    const factor = table.rank_value_factor || 3;
    const events = [];
    const lines = [];
    const stacks = new Map(); // stack key -> {id, name, qty, ...} gathered over all foes of this fight
    const add = (key, item, qty) => {
        if (qty <= 0) return;
        const k = `${key}.${String(item.rank || 'f').toLowerCase()}`;
        const have = stacks.get(k);
        if (have) have.qty += qty;
        else stacks.set(k, { ...item, qty });
    };
    let coin = 0;
    const items = []; // non-stacking gear
    for (const c of Object.values(enc.combatants)) {
        if (c.id === 'pc' || c.current.escaped || c.current.surrendered) continue;
        const e = s.entities[c.id];
        if (!e || e.status !== 'dead' || e.looted) continue;
        const seed = `${enc.id}|${c.id}`;
        if (e.kind === 'creature') {
            const prof = e.profile || {};
            const anchorId = prof.anchor || e.anchor;
            const anchor = content.anchors.get(anchorId);
            const rank = prof.rank || 'F';
            const level = prof.level || 1;
            const spec = table.anchors?.[anchorId];
            const species = speciesName(e, anchor);
            const materials = Array.isArray(spec) ? spec : spec?.materials || [];
            for (const m of materials) {
                const name = `${rank}-Rank ${m.name.replace('{species}', species)}`;
                add(`${slug(species)}.${slug(m.key)}`, { name, rank, level, material: m.key, species, anchor: anchorId, value_cp: valueOf(m.value_cp, rank, factor) }, draw(`${seed}|${m.key}`, m.qty));
            }
            if (spec && !Array.isArray(spec) && spec.humanoid) {
                if (spec.purse_cp) coin += draw(`${seed}|purse`, spec.purse_cp);
                for (const g of spec.gear || []) {
                    if (!chance(`${seed}|gear|${g.name}`, g.chance ?? 1)) continue;
                    items.push({ name: `${rank}-Rank ${g.name.replace('{species}', species)}`, rank, slot: g.slot, atk: g.atk || 0, def: g.def || 0, from: c.id });
                }
            }
        } else if (e.kind === 'npc' && e.sheet) {
            const rank = e.sheet.generated?.rank || rankOf(e.sheet.level || 1, content);
            for (const slot of ['weapon', 'armor']) {
                const g = e.sheet.equipment?.[slot];
                if (!g || /improvised|unarmed|fists?/i.test(g.name || '')) continue;
                items.push({ name: `${rank}-Rank ${titled(g.name)}`, rank, slot, atk: g.atk || 0, matk: g.matk || 0, def: g.def || 0, mdef: g.mdef || 0, from: c.id });
            }
            for (const [item, qty] of Object.entries(e.sheet.inventory || {})) {
                if (qty > 0 && content.items.get(item)) events.push({ t: 'item.changed', d: { id: 'pc', item, qty, why: `loot: ${e.name || 'the fallen'}` } });
            }
            const purse = e.sheet.coin_cp > 0 ? [e.sheet.coin_cp, e.sheet.coin_cp] : table.purse_cp_by_template?.[e.template] || [0, 5];
            coin += draw(`${seed}|purse`, purse);
        }
        events.push({ t: 'entity.updated', d: { id: c.id, set: { looted: enc.id } } });
    }
    for (const [k, m] of stacks) {
        const base = `obj.loot.${k}`;
        const held = s.objects?.[base];
        const source = { turn: s.turn, how: 'loot', encounter: enc.id };
        if (held && held.holder?.entity === 'pc') events.push({ t: 'object.added', d: { id: base, qty: m.qty } });
        else {
            const id = held ? `${base}.${slug(enc.id.replace(/\./g, '_'))}` : base;
            events.push({ t: 'object.created', d: { object: { id, name: m.name, kind: 'resource', stack: true, qty: m.qty, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source,
                rank: m.rank, level: m.level, material: m.material, species: m.species, anchor: m.anchor, value_cp: m.value_cp } } });
        }
        lines.push(`${m.name} ×${m.qty}`);
    }
    for (const [i, g] of items.entries()) {
        const id = `obj.loot.${slug(enc.id.replace(/\./g, '_'))}.${slug(g.from.replace(/\./g, '_'))}.${i + 1}`;
        if (s.objects?.[id]) continue;
        events.push({ t: 'object.created', d: { object: { id, name: g.name, kind: 'item', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: s.turn, how: 'loot', encounter: enc.id },
            rank: g.rank, gear: { slot: g.slot, atk: g.atk || 0, matk: g.matk || 0, def: g.def || 0, mdef: g.mdef || 0 } } } });
        lines.push(g.name);
    }
    if (coin > 0) {
        events.push({ t: 'coin.changed', d: { id: 'pc', value: (s.entities.pc.sheet.coin_cp || 0) + coin, delta: coin, why: 'loot' } });
        lines.push(`${coin} cp`);
    }
    for (const e of events.filter((x) => x.t === 'item.changed')) lines.push(`${content.items.get(e.d.item)?.name || e.d.item} ×${e.d.qty}`);
    return { events, lines };
}

/** "loot the beast", "search the bodies", "skin the wolf": what the engine already credited at the fight's end. */
export const LOOT_WORDS = /\b(?:loot\w*|plunder\w*|corpses?|bod(?:y|ies)|carcass(?:es)?|remains|skin(?:s|ning)?|pelts?|hides?|fangs?|claws?|harvest\w*|dead (?:beast|wolf|wolves|creature|bandits?|goblins?))\b/i;
/** The foes here whose loot the engine credited already (their remains hold nothing more for him). */
export const lootedHere = (s) => (s.scene?.present || []).filter((id) => s.entities?.[id]?.looted);
