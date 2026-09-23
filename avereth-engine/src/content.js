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
        rulesText: new Map(pack.rules_text.entries.map((r) => [r.id, r])),
        narrator: pack.narrator,
        start: pack.campaign_start,
    };
    for (const cls of pack.classes.classes) c.classes.set(cls.id, cls);
    for (const s of pack.classes.skills) {
        c.skills.set(s.id, s);
        const key = normText(s.name);
        if (!c.skillsByName.has(key)) c.skillsByName.set(key, []);
        c.skillsByName.get(key).push(s);
    }
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
