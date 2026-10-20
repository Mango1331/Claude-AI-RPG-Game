// Content pack loading and indexing. The pack is static knowledge (rules, classes, monsters, lore);
// campaign state never copies it except where Core requires a locked copy (encounter Action Library).
import { normText } from './util.js';

/**
 * Load all files named in content/manifest.json.
 * @param {(name: string) => Promise<any>} readJson  Node: fs + JSON.parse; browser: fetch(url).json()
 */
export async function loadContentPack(readJson) {
    const manifest = await readJson('manifest.json');
    const pack = { manifest };
    for (const [key, file] of Object.entries(manifest.files)) {
        pack[key] = await readJson(file);
    }
    return indexContent(pack);
}

export function indexContent(pack) {
    const c = {
        manifest: pack.manifest,
        rules: pack.rules,
        classes: new Map(),
        skills: new Map(),
        skillsByName: new Map(),
        affinity: pack.classes.affinity,
        anchors: new Map(),
        anchorAliases: [],
        monsters: pack.monsters,
        templates: new Map(),
        templateDescriptors: [],
        npc: pack.npc_templates,
        items: new Map(Object.entries(pack.gear.items)),
        kits: pack.gear.starter_kits,
        gear: pack.gear,
        lore: pack.lore.entries,
        locations: new Map(pack.lore.locations.map((l) => [l.id, l])),
        factions: new Map(pack.lore.factions.map((f) => [f.id, f])),
        // review of Patch 7: the known Dungeons of the content, each near a settlement (lore.json dungeons)
        dungeons: new Map((pack.lore.dungeons || []).map((x) => [x.id, x])),
        rulesText: new Map(pack.rules_text.entries.map((r) => [r.id, r])),
        narrator: pack.narrator,
        start: pack.campaign_start,
        // Runtime V4: the interpreter's command vocabulary and the extractor's delta vocabulary (src/v4/)
        commandVocab: pack.commands || null,
        deltaVocab: pack.deltas || null,
    };
    for (const cls of pack.classes.classes) c.classes.set(cls.id, cls);
    for (const s of pack.classes.skills) {
        c.skills.set(s.id, s);
        const key = normText(s.name);
        if (!c.skillsByName.has(key)) c.skillsByName.set(key, []);
        c.skillsByName.get(key).push(s);
    }
    // Hotfix c.6.6.18: an offensive consumable's effect is an action of the combat pipeline (by id, never by a player's
    // skill name: he holds the thing, he does not know a skill)
    c.itemEffects = pack.gear.item_effects?.effects || [];
    for (const x of c.itemEffects) c.skills.set(x.id, x);
    for (const a of pack.monsters.anchors) {
        c.anchors.set(a.id, a);
        for (const alias of a.aliases) c.anchorAliases.push([normText(alias), a.id]);
    }
    c.anchorAliases.sort((x, y) => y[0].length - x[0].length);
    for (const t of pack.npc_templates.templates) {
        c.templates.set(t.id, t);
        for (const d of t.descriptors) c.templateDescriptors.push([normText(d), t.id]);
    }
    c.templateDescriptors.sort((x, y) => y[0].length - x[0].length);
    return c;
}

/**
 * Hotfix c.6.6.18: the effect profile of a thing (an object of the world or an item template): its own stored one, else
 * the profile whose match words are all words of its name (a scroll bought before the profile existed). Null for an
 * ordinary thing.
 */
export function itemEffectOf(content, thing) {
    if (!thing) return null;
    if (thing.effect && content.skills.get(thing.effect)?.item) return content.skills.get(thing.effect);
    const words = new Set(normText(thing.name || '').split(/[^a-z0-9]+/).filter(Boolean));
    return (content.itemEffects || []).find((x) => x.match.every((w) => words.has(w))) || null;
}

/** Find a skill by exact id or (case-insensitive) name, preferring the given class. */
export function findSkill(content, nameOrId, preferClass = null) {
    if (content.skills.has(nameOrId)) return content.skills.get(nameOrId);
    const list = content.skillsByName.get(normText(nameOrId)) || [];
    if (!list.length) return null;
    return list.find((s) => s.class === preferClass) || list[0];
}

function wordMatch(haystack, needle) {
    const re = new RegExp(`(^|[^a-z])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`);
    return re.test(haystack);
}

/** Nearest F1 body-plan anchor for a creature description (Content #7 "Unlisted species"). */
export function anchorFor(content, text) {
    const t = normText(text);
    for (const [alias, id] of content.anchorAliases) if (wordMatch(t, alias)) return content.anchors.get(id);
    return null;
}

/** Human NPC template by descriptor words (proposed content, npc_templates.json). */
export function templateFor(content, text) {
    const t = normText(text);
    for (const [d, id] of content.templateDescriptors) if (wordMatch(t, d)) return content.templates.get(id);
    return null;
}

export function weaponFamily(content, weaponText) {
    const t = normText(weaponText);
    let best = null;
    for (const [family, words] of Object.entries(content.npc.weapon_words)) {
        for (const w of words) if (wordMatch(t, normText(w)) && (!best || w.length > best[1])) best = [family, w.length];
    }
    return best ? best[0] : null;
}

export function locationByName(content, name) {
    const t = normText(name);
    for (const l of content.locations.values()) if (normText(l.name) === t) return l;
    return null;
}

/** The spot a campaign begins at, outside its city (campaign_start.json: "public roadside verge outside Redmarch"). */
export function startPlace(content, loc) {
    return content.start.start_scene.place.replace(/the city$/, loc.name);
}
