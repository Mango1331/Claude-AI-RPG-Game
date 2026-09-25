// Narrative fact report (<avereth>{...}</avereth>) -> validated events.
// The LLM proposes; the engine disposes. Accepted items become events; everything else is rejected with a reason
// (kept in the audit log and fed back as a correction note). Engine-owned values (HP, XP, stats, levels, skills,
// dice) can never enter through this channel.
import { anchorFor, templateFor, locationByName } from './content.js';
import { setFactEvents, truth, normPredicate, FUNCTIONAL, statusOf } from './knowledge.js';
import { awardXp, questXp } from './progression.js';
import { applyCoin } from './economy.js';
import { deriveCharacter } from './derived.js';
import { checkChance } from './checks.js';
import { authorization, takesQuest } from './intent.js';
import { clamp, normText, slug, uniq } from './util.js';

const TAG_RE = /<avereth>\s*([\s\S]*?)\s*<\/avereth>/gi;
const ENGINE_OWNED = new Set(['hp', 'mp', 'sta', 'xp', 'level', 'stats', 'skills', 'damage', 'roll', 'rolls', 'init', 'initiative', 'atk', 'def', 'mdef', 'rank', 'defeat_xp']);
export const REPORT_KEYS = new Set(['time', 'place', 'location', 'forced_by', 'new', 'enter', 'leave', 'position', 'aware', 'concealed', 'facts', 'learn', 'believe', 'attitude', 'memory', 'items', 'coin', 'quests', 'threads', 'combat', 'intent', 'check', 'recover']);
const CREATION_FROZEN = ['time', 'location', 'place', 'items', 'coin', 'recover', 'quests'];
const AWARE = new Set(['unaware', 'suspicious', 'aware']);
const INTENTS = new Set(['attack', 'flee', 'surrender', 'parley', 'hold', 'take_cover']);
const BANDS = new Set(['ENGAGED', 'SHORT', 'MEDIUM', 'LONG']);
const COVERS = new Set(['none', 'partial', 'full']);
// Guild Quest Ranks, in the order of the Power Ranks F..S whose Level bands they correspond to (lorebook v0.11)
export const QUEST_RANKS = ['Novice', 'Proven', 'Veteran', 'Elite', 'Master', 'Grandmaster', 'Legend'];

/** Split the reply into display text and the (last) fact report. Tolerates code fences, smart quotes, trailing commas. */
export function extractReport(text) {
    const src = String(text || '');
    let last = null;
    let m;
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(src))) last = m;
    const clean = src.replace(TAG_RE, '').replace(/\s+$/, '');
    if (!last) return { clean, report: null, error: 'no <avereth> report' };
    const parsed = tolerantJson(last[1]);
    return { clean, report: parsed.value, error: parsed.error, raw: last[1] };
}

/**
 * Bracket repair outside strings: a closing bracket that ends the root while more keys follow ("…}},\"check\":{…}",
 * Test 5 run, turn 11: the whole report was lost) is dropped, a stray closer is dropped, and brackets still open at
 * the end are closed.
 */
function balanced(s) {
    let out = '';
    const open = [];
    let quote = false;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (quote) {
            out += ch;
            if (ch === '\\') out += s[++i] ?? '';
            else if (ch === '"') quote = false;
            continue;
        }
        if (ch === '"') quote = true;
        else if (ch === '{' || ch === '[') open.push(ch === '{' ? '}' : ']');
        else if (ch === '}' || ch === ']') {
            if (!open.length || (open.length === 1 && /^\s*,/.test(s.slice(i + 1)))) continue;
            open.pop();
        }
        out += ch;
    }
    return out + open.reverse().join('');
}

export function tolerantJson(text) {
    let s = String(text).trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
    s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    const noTrailing = s.replace(/,\s*([}\]])/g, '$1');
    const quotedKeys = noTrailing.replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":');
    for (const attempt of [s, noTrailing, quotedKeys, balanced(noTrailing), balanced(quotedKeys)]) {
        try {
            const v = JSON.parse(attempt);
            if (v && typeof v === 'object' && !Array.isArray(v)) return { value: v };
            return { value: null, error: 'report is not a JSON object' };
        } catch { /* next repair */ }
    }
    return { value: null, error: 'report is not valid JSON' };
}

/**
 * Resolve a reference to an id: entity id, 'pc'/'Alaric', entity name/descriptor, a ref introduced in this report,
 * or a content location/faction (id or name, e.g. "Tidecross" -> loc.tidecross). A part of a known person's name
 * finds that person among those present ("Ferran" for Odile Ferran); a full name whose first part is the only name
 * the engine knows finds that person too ("Hesta Gault" for Hesta, Testrun 3) and is kept in resolve.fullNames.
 * Alaric's own full name ("Alaric Red") finds him, but never renames him.
 */
export function makeResolver(state, newRefs, content = null, created = null) {
    const resolve = (ref) => {
        if (ref === undefined || ref === null || typeof ref === 'object') return null;
        const r = normText(ref);
        if (newRefs.has(r)) return newRefs.get(r);
        if (newRefs.has(r.replace(/_/g, ' '))) return newRefs.get(r.replace(/_/g, ' ')); // "lean_guard" for "Lean Guard"
        if (state.entities[ref]) return ref;
        if (['pc', 'alaric', 'player', 'you', 'the player'].includes(r)) return 'pc';
        const pc = state.entities.pc;
        if (pc && normText(pc.name) === r) return 'pc';
        // a combatant by its target label ("Cellar Rat B"), as the engine block names the fight's combatants
        const labelled = state.encounter && Object.values(state.encounter.combatants).find((c) => c.label && normText(c.label) === r);
        if (labelled) return labelled.id;
        // names identify globally; generic descriptors ("guard", "trapper") only within the current scene/location,
        // so the gate guard of another city is never merged with this one
        const bare = r.replace(/^the /, '');
        const spaced = bare.replace(/_/g, ' '); // a name written like an id ("lean_guard" for the Lean Guard, Test 5 run 2)
        const scored = [];
        for (const e of Object.values(state.entities)) {
            const here = state.scene.present.includes(e.id);
            const local = here || (e.location && e.location === state.scene.location);
            const name = e.name ? normText(e.name) : null;
            if (name && (name === bare || name === spaced)) scored.push([e, here ? 3 : 2]);
            else if (local && (e.descriptors || []).map(normText).some((d) => d === bare || d === spaced)) scored.push([e, here ? 2 : 1]);
        }
        scored.sort((a, b) => b[1] - a[1]);
        if (scored.length) return scored[0][0].id;
        if (content) {
            if (content.locations.has(ref) || content.factions.has(ref)) return ref;
            const loc = locationByName(content, ref);
            if (loc) return loc.id;
            for (const f of content.factions.values()) if (normText(f.name) === r) return f.id;
        }
        const words = bare.split(' ').filter(Boolean);
        const fullName = (name) => words.length > 1 && name.length === 1 && name[0] === words[0] && /^[A-Z]/.test(String(ref).trim());
        const hits = new Set();
        for (const id of [...state.scene.present, ...(created ? created.keys() : [])]) {
            const e = state.entities[id] || created?.get(id);
            const name = e?.name ? normText(e.name).split(' ') : [];
            if (id === 'pc' || !name.length) continue;
            if (words.length === 1 && words[0].length >= 3 && name.length > 1 && name.includes(words[0])) hits.add(id);
            if (fullName(name)) hits.add(id);
        }
        // Alaric under a full name the story gave him ("Alaric Red", Test 5 run 2: his Guild Rank went to a stranger);
        // his name itself stays the player's
        if (pc?.name && fullName(normText(pc.name).split(' '))) return hits.size ? null : 'pc';
        if (hits.size !== 1) return null;
        const id = [...hits][0];
        if (words.length > 1) resolve.fullNames.set(id, String(ref).trim().slice(0, 60));
        return id;
    };
    resolve.fullNames = new Map();
    return resolve;
}

/**
 * A name for a person the report introduces without one: GLM often puts the name in the ref only ("hesta",
 * "carter_muller"). A ref word that the reply writes capitalised and never in lower case, and that is not one of the
 * descriptors, is a name ("Hesta", "Muller"); descriptor refs ("gate_sergeant", "trapper") stay unnamed.
 */
function nameFromRef(n, prose) {
    if (!prose) return null;
    const desc = new Set((Array.isArray(n.desc) ? n.desc : []).flatMap((d) => normText(d).split(' ')));
    const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
    const named = String(n.ref).replace(/[_.]+/g, ' ').trim().split(/\s+/).map((w) => w.toLowerCase()).filter((w) => /^[a-z][a-z'-]+$/.test(w)
        && !desc.has(w) && new RegExp(`\\b${escapeRe(cap(w))}\\b`).test(prose) && !new RegExp(`\\b${escapeRe(w)}\\b`).test(prose));
    return named.length ? named.map(cap).join(' ') : null;
}

function uniqueId(state, prefix, base, taken) {
    let id = `${prefix}.${slug(base) || 'unnamed'}`;
    let n = 2;
    while (state.entities[id] || taken.has(id)) { id = `${prefix}.${slug(base) || 'unnamed'}_${n}`; n += 1; }
    taken.add(id);
    return id;
}

function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Attackers the engine can take as individual combatants (live run 25.09. 01:31, docs/TESTRUN_V7.md). A word that is
// the plural of a creature kind ("rats", "wolves") or a collective ("pack", "swarm") makes a group; counts are never
// read from the text.
const GROUP_WORDS = new Set(['pack', 'swarm', 'horde', 'flock', 'herd', 'colony', 'brood', 'troop', 'mob', 'group', 'gang']);
const wordsOf = (text) => normText(text).replace(/[_.]+/g, ' ').split(' ').filter(Boolean);
const pluralKind = (content, w) => [...content.anchors.values()].some((a) => a.aliases.map(normText)
    .some((x) => x !== w && (w === `${x}s` || w === `${x}es` || (x.endsWith('f') && w === `${x.slice(0, -1)}ves`))));

/**
 * A designation that names several: its last word is a collective or a creature kind in the plural ("Cellar rat pack",
 * "cellar rats", "wolves"). "pack leader", "Big rat" and an indexed ref ("pack_rat_1", "rat_b") name one.
 */
function isGroup(content, text) {
    const last = wordsOf(text).at(-1);
    return !!last && (GROUP_WORDS.has(last) || pluralKind(content, last));
}

/**
 * The anchor of one individual creature named in free text ("a wolf", "the big grey wolf", "another rat"): its kind is
 * the last word, singular, with at most two words before it, no other kind and no person. Else null ("rat pack",
 * "rats", "first rat charging toward the stairs", "a rat and a wolf", "a hooded man riding a horse").
 */
function oneCreature(content, text) {
    const w = wordsOf(String(text).replace(/^\s*(?:the|a|an|another|one)\s+/i, ''));
    const kind = w.at(-1);
    const anchor = kind ? anchorFor(content, kind) : null;
    if (!anchor || w.length > 3 || !anchor.aliases.map(normText).includes(kind) || isGroup(content, kind)) return null;
    if (w.slice(0, -1).some((x) => /\d/.test(x) || anchorFor(content, x) || GROUP_WORDS.has(x)) || templateFor(content, w.join(' '))) return null;
    return anchor;
}

/**
 * Validate a report against the current state and convert accepted items to events.
 * @param {object} [opts] msg = chat index of the reply; prose = the reply's text (names written in it)
 * @returns {{events: object[], accepted: string[], rejected: {item: any, reason: string}[], corrections: string[]}}
 */
export function reportToEvents(report, state, content, { msg = null, prose = '' } = {}) {
    const events = [];
    const accepted = [];
    const rejected = [];
    const corrections = [];
    const reject = (item, reason) => rejected.push({ item, reason });
    if (!report) return { events, accepted, rejected, corrections };
    for (const k of Object.keys(report)) {
        if (ENGINE_OWNED.has(k)) reject({ [k]: report[k] }, `"${k}" is engine-owned and cannot be set by narration`);
        else if (!REPORT_KEYS.has(k)) reject({ [k]: report[k] }, `unknown report key "${k}"`);
    }
    // Character Creation replies are System-only (story time frozen): the engine grants class, Skills and kit itself and
    // nothing moves, passes or changes hands. Testrun 2: the narrator re-reported the starter kit and Alaric carried it twice.
    if (String(state.last?.outcome?.kind || '').startsWith('creation')) {
        for (const k of CREATION_FROZEN) {
            if (report[k] === undefined) continue;
            reject({ [k]: report[k] }, 'Character Creation is System-only: the engine grants class, Skills and starter kit itself; nothing else changes (report {})');
            report = { ...report, [k]: undefined };
        }
    }
    const at = { turn: state.turn, minute: state.clock.minute };
    let idc = 0;
    const mkId = (prefix) => `${prefix}.t${state.turn}${msg !== null && msg !== undefined ? `.m${msg}` : ''}.${++idc}`;
    const newRefs = new Map();
    const taken = new Set();
    const created = new Map(); // entities introduced by this very report (usable by its other keys)
    const groupNew = new Map(); // creatures this report introduced as a group ("Cellar rat pack"): id -> their "new" ref
    const resolve = makeResolver(state, newRefs, content, created);
    const present = new Set(state.scene.present);
    const src = { kind: 'narration', msg };
    const pcName = state.entities.pc?.name || 'Alaric';
    // the part of a person's name the player has read or said (in this reply or his message, as written, or before)
    const told = `${prose}\n${state.last?.input || ''}`;
    const said = (w) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(w)}($|[^\\p{L}\\p{N}])`, /^\p{Lu}/u.test(w) ? 'u' : 'iu').test(told);
    const namePart = (name, before = '') => {
        const had = new Set(String(before).split(' '));
        const words = String(name).split(/\s+/).filter(Boolean);
        const part = words.filter((w) => had.has(w) || said(w));
        return part.length === words.length ? null : part.join(' '); // null: all of it
    };
    const inCombat = (id) => !!(state.encounter && state.encounter.combatants[id]);
    const ent = (id) => (id ? state.entities[id] || created.get(id) : undefined);
    const entityName = (id) => ent(id)?.name || (ent(id)?.descriptors?.[0] ? `the ${ent(id).descriptors[0]}` : id);
    // PLAYER OWNERSHIP: voluntary changes to Alaric need the player's own decision in the current message (or in a
    // message whose reply had no fact report: this report may still record what the player decided there)
    const auth = authorization([...(state.last?.carry || []), state.last?.input || ''].join('\n'));
    const owner = (what) => `PLAYER OWNERSHIP: ${what} needs the player's own decision in the current message`;
    // the one who forces it must be present, or be introduced by this very report (a pickpocket, an arresting patrol)
    const introduced = new Set(arr(report.new).flatMap((n) => [n?.ref, n?.name]).filter(Boolean).map(normText));
    const forcedBy = (x) => {
        if (!x) return null;
        if (introduced.has(normText(x))) return String(x);
        const id = resolve(x);
        return id && id !== 'pc' && (state.scene.present.includes(id) || present.has(id)) ? id : null;
    };

    // time
    if (report.time !== undefined) {
        const t = Number(report.time);
        if (!Number.isInteger(t) || t < 0 || t > 10080) reject({ time: report.time }, 'time must be whole minutes between 0 and 10080 (7 days)');
        else if (t > 0 && state.mode === 'creation') reject({ time: report.time }, 'story time is frozen during Character Creation');
        else if (t > 120 && !auth.rest && !state.encounter) reject({ time: report.time }, owner('skipping more than two hours (rest, travel, waiting)'));
        else if (t > 0) { events.push({ t: 'time.advanced', d: { minutes: t, why: 'narration' } }); accepted.push(`time +${t} min`); }
    }
    // travel / place
    let movedPlace = false;
    const where = report.location ? findLocation(state, content, report.location) : null;
    const loc = where?.loc || null;
    if (where?.spot && !report.place) report = { ...report, place: where.spot };
    // the current city named again ("location":"Lumenford" while in Lumenford) is no travel: only its place counts
    // (Testrun 4: the move from the malthouse cellar to the Guild hall left the dead vermin "present" in the hall)
    if (report.location && !(loc && loc.id === state.scene.location)) {
        if (state.encounter) reject({ location: report.location }, 'cannot travel while combat is ACTIVE');
        else if (!auth.travel && !forcedBy(report.forced_by)) reject({ location: report.location }, owner('travelling to another location'));
        else if (loc) {
            events.push({ t: 'scene.moved', d: { location: loc.id, place: report.place ? String(report.place).slice(0, 120) : loc.name, reset_present: loc.id !== state.scene.location } });
            if (loc.id !== state.scene.location) present.clear();
            present.add('pc');
            accepted.push(`location -> ${loc.name}`);
        } else {
            const id = uniqueId(state, 'loc', where.name, taken);
            events.push({ t: 'entity.created', d: { entity: { id, kind: 'location', name: String(where.name).slice(0, 80), status: 'exists', realm: state.entities[state.scene.location]?.realm || content.locations.get(state.scene.location)?.realm || null, created: at, source: src } } });
            events.push({ t: 'scene.moved', d: { location: id, place: report.place ? String(report.place).slice(0, 120) : String(where.name), reset_present: true } });
            present.clear();
            present.add('pc');
            accepted.push(`new location ${where.name}`);
        }
    } else if (report.place) {
        // a more precise name for the same spot ("Guild hall" -> "Guild hall, front desk") is no move; another spot of
        // the same site is one and needs the player's decision (Testrun 3: queue -> gate tunnel)
        const [a, b] = [normText(report.place), normText(state.scene.place)];
        const refinement = !b || a.includes(b) || b.includes(a);
        if (!refinement && !auth.move && !forcedBy(report.forced_by) && !state.encounter) reject({ place: report.place }, owner('moving Alaric to another spot'));
        else {
            events.push({ t: 'scene.moved', d: { place: String(report.place).slice(0, 120) } });
            accepted.push(`place: ${report.place}`);
            movedPlace = !refinement;
        }
    }
    const placed = new Set(); // people this report places in the (new) scene
    // new entities
    for (const n of arr(report.new)) {
        if (!n || !n.ref) { reject(n, 'new entity needs a ref'); continue; }
        const kind = n.kind === 'creature' ? 'creature' : n.kind === 'npc' ? 'npc' : null;
        if (!kind) { reject(n, 'kind must be "npc" or "creature"'); continue; }
        const existing = resolve(n.ref) || (n.name ? resolve(n.name) : null);
        if (existing && existing !== 'pc' && state.entities[existing]) {
            newRefs.set(normText(n.ref), existing);
            placed.add(existing);
            // a person first named in prose has no look yet (Testrun 4: Fennick, Maretta): the first traits stick, later
            // ones never overwrite them (a changed look is a fact: {s, p: "appearance", o})
            if (n.traits && !state.entities[existing].traits) {
                events.push({ t: 'entity.updated', d: { id: existing, set: { traits: String(n.traits).slice(0, 240) } } });
                accepted.push(`${existing} traits: ${String(n.traits).slice(0, 60)}`);
            }
            if (!present.has(existing) && state.entities[existing].status !== 'dead') {
                events.push({ t: 'scene.entered', d: { id: existing, band: bandOf(n.band), cover: coverOf(n.cover) } });
                present.add(existing);
            }
            accepted.push(`known ${existing} (not duplicated)`);
            continue;
        }
        const desc = uniq([...(Array.isArray(n.desc) ? n.desc : []), n.ref].map((x) => String(x).toLowerCase().slice(0, 40)));
        const id = uniqueId(state, kind === 'npc' ? 'npc' : 'mon', n.name || n.ref, taken);
        const name = n.name ? String(n.name).slice(0, 60) : kind === 'npc' ? nameFromRef(n, prose) : null;
        if (name) newRefs.set(normText(name), id);
        const entity = { id, kind, name, descriptors: desc, traits: n.traits ? String(n.traits).slice(0, 240) : '', status: 'alive', location: state.scene.location, created: at, source: src, card: {} };
        // Test 5 run: "Sergeant Hobb" and "Wick" came in "new" a reply before the story said their names (Testrun 2:
        // "Bram" was said five turns before "Fenn"); the player's views (combat target labels, HUD) show only the
        // part said so far, or the look (knowledge.js playerLabel). Only a person's proper name: a creature's "name"
        // is what it is ("cellar vermin"), and so is a lower-case one
        const part = name && kind === 'npc' && /\p{Lu}/u.test(name) ? namePart(name) : null;
        if (part !== null) entity.known_name = part;
        if (kind === 'creature') {
            const anchor = content.anchors.get(n.species) || anchorFor(content, [n.species, ...desc, n.traits].filter(Boolean).join(' '));
            if (!anchor) { reject(n, 'creature needs a species that maps to an F1 body-plan anchor (or kind "npc")'); continue; }
            entity.species = n.species ? String(n.species).slice(0, 40) : desc[0];
            entity.anchor = anchor.id;
        } else {
            const tpl = content.templates.get(n.template) || templateFor(content, [...desc, n.traits].filter(Boolean).join(' '));
            entity.template = tpl ? tpl.id : 'commoner';
        }
        newRefs.set(normText(n.ref), id);
        if (n.name) newRefs.set(normText(n.name), id);
        created.set(id, entity);
        if (kind === 'creature' && isGroup(content, n.name || n.ref)) groupNew.set(id, String(n.ref));
        events.push({ t: 'entity.created', d: { entity } });
        events.push({ t: 'scene.entered', d: { id, band: bandOf(n.band), cover: coverOf(n.cover) } });
        present.add(id);
        accepted.push(`new ${kind} ${name || n.ref} (${id})`);
    }
    const UNKNOWN = 'unknown person (introduce new people via "new")';
    const person = (id) => !!id && id !== 'pc' && ['npc', 'creature'].includes(ent(id)?.kind);
    // someone the story names but no report introduced: the reply that brought him in had no report (Testrun 4: the
    // malthouse master "Fennick" and the huntress "Maretta" stayed unknown, so every later "aware", "leave" and quest
    // giver naming them was refused). A ref this reply writes only as a capitalised name becomes that person.
    const adopt = (ref) => {
        if (typeof ref !== 'string' || !ref.trim()) return null;
        const name = nameFromRef({ ref, desc: [] }, prose);
        if (!name) return null;
        const known = resolve(name);
        if (known) return known;
        const id = uniqueId(state, 'npc', name, taken);
        const entity = { id, kind: 'npc', name, descriptors: [normText(ref)], traits: '', status: 'alive', location: state.scene.location, created: at, source: src, card: {}, template: 'commoner' };
        created.set(id, entity);
        newRefs.set(normText(ref), id);
        newRefs.set(normText(name), id);
        events.push({ t: 'entity.created', d: { entity } });
        accepted.push(`named in the story: ${name} (${id})`);
        return id;
    };
    const who_ = (ref) => resolve(ref) || adopt(ref);
    // someone known who is not in the scene yet: a report that places them here (enter, position, aware) brings them in
    const bringIn = (id, item, band, cover) => {
        if (ent(id)?.status === 'dead') { reject(item, `${id} is dead and cannot enter`); return false; }
        events.push({ t: 'scene.entered', d: { id, band, cover } }); present.add(id); accepted.push(`enter ${id}`);
        return true;
    };
    for (const r of arr(report.enter)) {
        const id = who_(typeof r === 'object' && r ? r.ref : r);
        if (id && created.has(id)) continue; // introduced by "new" in this report: already in the scene
        if (!person(id) || !state.entities[id]) { reject(r, `enter: ${UNKNOWN}`); continue; }
        if (bringIn(id, r, bandOf(r && r.band), coverOf(r && r.cover))) placed.add(id);
    }
    const leftNow = new Set();
    for (const r of arr(report.leave)) {
        const id = who_(r);
        if (id && created.has(id) && !present.has(id)) continue; // named for the first time on his way out: known, not here
        if (!id || !present.has(id) || id === 'pc') { reject(r, 'leave: entity not present'); continue; }
        if (inCombat(id)) { reject(r, `${id} is in the active encounter; leaving is resolved by the engine (flee/escape)`); continue; }
        events.push({ t: 'scene.left', d: { id } }); present.delete(id); leftNow.add(id); accepted.push(`leave ${id}`);
    }
    for (const p of arr(report.position)) {
        const id = who_(p && p.who);
        if (leftNow.has(id)) continue; // reported as leaving in this same report: where he stood no longer matters
        if (!person(id)) { reject(p, `position: ${UNKNOWN}`); continue; }
        if (inCombat(id)) { reject(p, 'positions of combatants are engine-owned during ACTIVE combat'); continue; }
        const band = bandOf(p.band);
        if (!band) { reject(p, 'position.band must be ENGAGED|SHORT|MEDIUM|LONG (distance to Alaric)'); continue; }
        placed.add(id);
        if (!present.has(id)) { if (!bringIn(id, p, band, coverOf(p.cover) || 'none')) placed.delete(id); continue; }
        events.push({ t: 'scene.position', d: { id, band, cover: coverOf(p.cover) || 'none' } }); accepted.push(`${id} at ${band}`);
    }
    for (const a of arr(report.aware)) {
        const id = who_(a && a.who);
        if (leftNow.has(id)) continue;
        if (!person(id)) { reject(a, `aware: ${UNKNOWN}`); continue; }
        if (!AWARE.has(a.level)) { reject(a, 'aware.level must be unaware|suspicious|aware'); continue; }
        if (!present.has(id) && !bringIn(id, a)) continue;
        placed.add(id);
        if (inCombat(id) && a.level !== 'aware') { reject(a, 'a combatant in an ACTIVE encounter is aware'); continue; }
        // Core #24: unawareness (which enables an Ambush) must rest on established facts or declared stealth; an NPC
        // that already noticed Alaric does not become unaware again by narration
        const before = state.scene.awareness[id];
        if (a.level === 'unaware' && before && before !== 'unaware' && !auth.conceal) { reject(a, `${id} already noticed ${pcName} (${before}); only declared stealth can make it lose track`); continue; }
        events.push({ t: 'scene.awareness', d: { id, level: a.level } }); accepted.push(`${id} ${a.level} of ${pcName}`);
    }
    // combat commitments ({by} or a list; "by" may itself be a list; a bare name is a {by}); empty entries commit nobody
    const commitments = arr(report.combat).flatMap((cb) => (typeof cb === 'string' ? [{ by: cb }] : cb && Array.isArray(cb.by) ? cb.by.map((by) => ({ ...cb, by })) : [cb]));
    // Alaric moved on to another spot within the location: only the people this report places there (new, enter,
    // position, aware, an attack) are with him; everyone else stayed behind. Testrun 2: a trapper left on the ridge
    // "detected" a stealth approach at the stream. Testrun 3: the carter from the gate and the Guild registrar
    // "followed" Alaric into a tannery cellar and witnessed the rat fight, because people close by were assumed to
    // follow. Company that comes along is reported (e.g. position), so presence never rests on a guess.
    if (movedPlace && !state.encounter) {
        for (const cb of commitments) if (cb && typeof cb === 'object' && cb.by) placed.add(resolve(cb.by));
        for (const id of state.scene.present) {
            if (id === 'pc' || !present.has(id) || placed.has(id)) continue;
            events.push({ t: 'scene.left', d: { id } }); present.delete(id); accepted.push(`${id} stays behind`);
        }
    }
    if (report.concealed !== undefined) {
        // "unseen" is the others' perception and only limits what they know; it grants no mechanical advantage
        const ids = uniq(arr(report.concealed).map(resolve).filter(Boolean));
        events.push({ t: 'scene.concealed', d: { ids } }); accepted.push(`concealed: ${ids.join(', ') || 'none'}`);
    }
    // facts (world truth). Hard facts (e.g. a destroyed city, a dead person) change only with an explicit cause.
    for (const f of arr(report.facts)) {
        if (!f || !f.s || !f.p || f.o === undefined || f.o === null) { reject(f, 'fact needs s, p, o'); continue; }
        const s = resolve(f.s) || String(f.s).slice(0, 80);
        const p = normPredicate(f.p);
        const oRef = typeof f.o === 'string' ? resolve(f.o) : null;
        const o = oRef && state.entities[oRef] ? oRef : String(f.o).slice(0, 200);
        const hard = FUNCTIONAL.has(p) ? truth(state, s, p).find((x) => x.hard && normText(x.o) !== normText(o)) : null;
        if (hard && hard.o === 'dead' && ent(s) && ent(s).kind !== 'location') { reject(f, `${s} is dead; revival needs an explicit resurrection mechanic (Core #14)`); continue; }
        if (hard && !f.because) { reject(f, `contradicts established fact "${hard.s} ${hard.p} ${hard.o}" (since turn ${hard.since.turn}); a change needs an explicit cause ("because")`); continue; }
        if (p === 'status' && inCombat(s)) { reject(f, `${s} is a combatant; its condition is resolved by the engine`); continue; }
        if (p === 'status' && s === 'pc' && LIFE_STATUS.has(normText(o))) { reject(f, `${pcName}'s life is engine-owned (0 HP = dead, Core #14)`); continue; }
        let value = o;
        if (p === 'guild_rank') {
            // institutional standing (lorebook v0.11): one of the Guild Ranks, never above the Power Rank it requires
            // exactly one Guild Rank named in a longer value counts ("Novice, registered (F claimed)", Test 5 run)
            const named = QUEST_RANKS.filter((r) => new RegExp(`(^|[^a-z])${normText(r)}($|[^a-z])`).test(normText(o)));
            const gr = QUEST_RANKS.find((r) => normText(r) === normText(o)) || (named.length === 1 ? named[0] : null);
            if (!gr) { reject(f, `guild_rank must be one of ${QUEST_RANKS.join('|')}`); continue; }
            const power = ent(s)?.sheet ? QUEST_RANKS[Math.max(0, content.rules.ranks.order.indexOf(deriveCharacter(ent(s).sheet, content).rank))] : null;
            if (power && QUEST_RANKS.indexOf(gr) > QUEST_RANKS.indexOf(power)) { reject(f, `Guild Rank ${gr} needs Power Rank ${content.rules.ranks.order[QUEST_RANKS.indexOf(gr)]} (a promotion minimum)`); continue; }
            value = gr;
        }
        const evs = setFactEvents(state, { id: mkId('f'), s, p, o: value, visibility: f.vis === 'secret' ? 'secret' : 'public', importance: clamp(Number(f.imp || 5), 1, 10) / 10, hard: !!f.hard, source: { ...src, because: f.because ? String(f.because).slice(0, 160) : null } });
        events.push(...evs);
        const fact = evs.find((e) => e.t === 'fact.asserted')?.d.fact;
        // a person's or creature's entity status is physical (alive/dead); any other "status" stays an ordinary fact
        // (Testrun 4: "registered Guild member, Rank F / Novice" replaced Alaric's "alive")
        if (fact && p === 'status' && ent(s) && ent(s).kind !== 'location' && LIFE_STATUS.has(normText(o))) {
            events.push({ t: 'entity.status', d: { id: s, status: normText(o) } });
        }
        // a character knows secrets about itself
        if (fact && fact.visibility === 'secret' && ent(s) && ent(s).kind !== 'location') {
            events.push({ t: 'knowledge.gained', d: { who: s, about: fact.id, stance: 'knows', source: 'self', ...at } });
        }
        accepted.push(`fact ${s} ${p} ${o}${fact?.hard ? ' (HARD)' : ''}`);
    }
    // knowledge / beliefs. Learning never changes world truth: a wrong "fact" must be reported as a belief.
    for (const k of arr(report.learn)) {
        const who = who_(k && k.who);
        if (!ent(who)) { reject(k, 'learn: unknown character'); continue; }
        if (!k.s || !k.p || k.o === undefined) { reject(k, 'learn needs s, p, o'); continue; }
        const s = resolve(k.s) || String(k.s).slice(0, 80);
        const p = normPredicate(k.p);
        const o = typeof k.o === 'string' ? k.o.slice(0, 200) : String(k.o);
        // facts asserted earlier in this same report count as current truth
        const current = [...truth(state, s, p), ...events.filter((e) => e.t === 'fact.asserted' && e.d.fact.s === s && e.d.fact.p === p).map((e) => e.d.fact)];
        let fact = current.find((x) => sameValue(p, x.o, o) || (ent(x.o) && normText(ent(x.o).name || '') === normText(o)));
        const how = ['witnessed', 'told', 'rumor', 'inferred', 'public'].includes(k.how) ? k.how : 'witnessed';
        if (fact && fact.visibility === 'secret' && how !== 'told' && how !== 'witnessed') {
            reject(k, `"${s} ${p}" is a secret; it can only be learned by being told or witnessing it`); continue;
        }
        const from = k.from ? resolve(k.from) || String(k.from).slice(0, 60) : null;
        const source = from ? `told:${from}` : how;
        // told by Alaric in this reply: the listener is with him (Testrun 4: back in the Guild hall, Serah heard his
        // report of the cellar while the engine still had her at the counter he had left hours before)
        if (from === 'pc' && how === 'told' && person(who) && !present.has(who) && state.entities[who] && !leftNow.has(who)) bringIn(who, k);
        // only someone who is here (or left in this very report) can have seen it, even when the fact itself is known
        // or was established earlier in this report (an absent NPC "witnessing" Alaric's secret would leak it)
        if (how === 'witnessed' && who !== 'pc' && !present.has(who) && !leftNow.has(who)) { reject(k, `${who} is not present and cannot have witnessed it`); continue; }
        if (!fact && how === 'witnessed') {
            // seeing it happen in the scene is the narration establishing it: only a present witness can do that
            if (!present.has(who)) { reject(k, `${who} is not present and cannot have witnessed it`); continue; }
            if (FUNCTIONAL.has(p) && current.length) { reject(k, `contradicts world truth "${current[0].s} ${current[0].p} ${current[0].o}"; change the world with "facts" (hard facts need "because")`); continue; }
            const evs = setFactEvents(state, { id: mkId('f'), s, p, o, visibility: 'public', importance: 0.4, source: src });
            events.push(...evs);
            fact = evs[evs.length - 1].d.fact;
        }
        if (!fact) {
            // hearsay, rumour and inference never create world truth: they create a claim whose truth the world decides
            const truthVal = FUNCTIONAL.has(p) && current.length ? 'false' : 'unknown';
            const cid = mkId('c');
            events.push({ t: 'claim.created', d: { claim: { id: cid, s, p, o, truth: truthVal, source: src } } });
            events.push({ t: 'knowledge.gained', d: { who, about: cid, stance: how === 'told' || how === 'public' ? 'believes' : 'suspects', source, ...at } });
            accepted.push(`${who} heard ${s} ${p} ${o} (claim, truth ${truthVal})`);
            continue;
        }
        events.push({ t: 'knowledge.gained', d: { who, about: fact.id, stance: how === 'inferred' || how === 'rumor' ? 'suspects' : 'knows', source, ...at } });
        accepted.push(`${who} learns ${s} ${p} ${o}`);
    }
    for (const b of arr(report.believe)) {
        const who = resolve(b && b.who);
        if (!ent(who) || !b.s || !b.p || b.o === undefined) { reject(b, 'believe needs who, s, p, o'); continue; }
        const s = resolve(b.s) || String(b.s).slice(0, 80);
        const p = normPredicate(b.p);
        const o = String(b.o).slice(0, 200);
        const cur = truth(state, s, p);
        const matches = cur.some((x) => sameValue(p, x.o, o));
        const verdict = matches ? 'true' : b.true === true ? 'true' : b.true === false ? 'false' : FUNCTIONAL.has(p) && cur.length ? 'false' : 'unknown';
        const id = mkId('c');
        const from = b.from ? resolve(b.from) || String(b.from).slice(0, 60) : null;
        events.push({ t: 'claim.created', d: { claim: { id, s, p, o, truth: verdict, source: src } } });
        events.push({ t: 'knowledge.gained', d: { who, about: id, stance: 'believes', source: from ? `told:${from}` : 'belief', ...at } });
        accepted.push(`${who} believes ${s} ${p} ${o}`);
    }
    // relationships
    const relNow = new Map(); // several changes to one relation in the same report add up
    for (const a of arr(report.attitude)) {
        const who = resolve(a && a.who);
        const toward = resolve((a && a.toward) || 'pc');
        if (!ent(who) || !ent(toward)) { reject(a, 'attitude: unknown entity'); continue; }
        let delta = Number(a.delta);
        if (!Number.isFinite(delta)) { reject(a, 'attitude.delta must be a number'); continue; }
        delta = clamp(Math.round(delta), -50, 50);
        if (delta === 0) continue; // no change is no event: attitudes never drift without a reported cause
        const rid = `rel.${who}.attitude.${toward}`;
        const cur = relNow.get(rid) || state.relations[rid];
        const why = String(a.why || '').slice(0, 160);
        relNow.set(rid, { value: clamp((cur?.value ?? 0) + delta, -100, 100) });
        if (!cur) events.push({ t: 'relation.set', d: { rel: { id: rid, a: who, type: 'attitude', b: toward, value: clamp(delta, -100, 100), since: at, history: [{ ...at, delta, why }] } } });
        else events.push({ t: 'relation.changed', d: { id: rid, value: clamp(cur.value + delta, -100, 100), delta, why, ...at } });
        accepted.push(`${who} attitude toward ${toward} ${delta >= 0 ? '+' : ''}${delta}`);
    }
    // episodic memory. Being present is not perceiving: witnesses are the participants ("who"), those the narrator
    // names as having seen/heard it ("witnesses"), or with "public" everyone present who is not unaware of the scene.
    const alivePresent = (id) => present.has(id) && ent(id) && ent(id).status !== 'dead';
    const concealed = report.concealed !== undefined ? arr(report.concealed).map(resolve).includes('pc') : state.scene.concealed.includes('pc');
    for (const m of arr(report.memory)) {
        if (!m || !m.text) { reject(m, 'memory needs text'); continue; }
        const who = uniq(arr(m.who).map(who_).filter(Boolean));
        const named = arr(m.witnesses).map(who_).filter(Boolean);
        const publicly = m.public === true ? [...present].filter((id) => (state.scene.awareness[id] || 'aware') !== 'unaware') : [];
        const witnesses = uniq(['pc', ...who, ...named, ...publicly].filter(alivePresent));
        const text = String(m.text).slice(0, 300).replace(new RegExp(`\\b${escapeRe(pcName)}\\b`, 'g'), '{pc}');
        events.push({ t: 'memory.recorded', d: { memory: { id: mkId('m'), ...at, text, who, witnesses, seen: concealed ? ['pc'] : witnesses.slice(), location: state.scene.location, place: state.scene.place, importance: clamp(Math.round(Number(m.imp) || 5), 1, 10), kind: 'narrated', msg } } });
        accepted.push(`memory: ${String(m.text).slice(0, 60)}`);
    }
    // items and coin (Core #20: only real hand-overs; Core #22: exact whole-Copper arithmetic)
    for (const it of arr(report.items)) {
        const to = resolve(it && it.to);
        const from = it && it.from ? resolve(it.from) : null;
        const qty = Number(it && it.qty !== undefined ? it.qty : 1);
        if (!it || !it.item || !Number.isInteger(qty) || qty <= 0) { reject(it, 'items need item and a positive whole qty'); continue; }
        if (!to && !from) { reject(it, 'items need "to" (receiver) and/or "from" (giver)'); continue; }
        if (inCombat('pc') && (to === 'pc' || from === 'pc')) { reject(it, 'item changes during ACTIVE combat are resolved by the engine'); continue; }
        // money is Coin, never an item (Testrun 4: Fennick's three silver came both as an item and as coin)
        if (MONEY_RE.test(normText(it.item))) { reject(it, 'money is not an item: report it once in "coin" (Copper; + received, - paid)'); continue; }
        // an item the content pack does not know keeps the narrator's name, without its parenthesised description
        const label = String(it.item).replace(/\s*\([^)]*\)/g, '').trim().slice(0, 60) || String(it.item).slice(0, 60);
        const itemId = content.items.has(it.item) ? it.item : findItemId(content, label);
        const named = content.items.has(itemId) ? {} : { name: label };
        const taker = forcedBy(it.taken_by);
        if (from === 'pc' && !auth.give && !auth.pay && !taker) { reject(it, owner(`handing over ${it.item}`) + ' (a theft or seizure names the taker in "taken_by")'); continue; }
        if (from === 'pc') {
            const have = state.entities.pc.sheet.inventory[itemId] || 0;
            if (have < qty) { reject(it, `${pcName} does not carry ${qty} × ${it.item} (has ${have})`); continue; }
            events.push({ t: 'item.changed', d: { id: 'pc', item: itemId, qty: -qty, why: String(it.why || 'handed over').slice(0, 120) } });
        } else if (from && state.entities[from]?.sheet && (state.entities[from].sheet.inventory[itemId] || 0) >= qty) {
            events.push({ t: 'item.changed', d: { id: from, item: itemId, qty: -qty, why: String(it.why || 'handed over').slice(0, 120) } });
        }
        if (to && ent(to)?.sheet) events.push({ t: 'item.changed', d: { id: to, item: itemId, qty, ...named, why: String(it.why || 'received').slice(0, 120) } });
        accepted.push(`item ${it.item} ×${qty}${from ? ` from ${from}` : ''}${to ? ` to ${to}` : ''}`);
    }
    const purse = new Map(); // several coin entries in one report add up (they used to each start from the old purse)
    for (const c of arr(report.coin)) {
        const who = resolve((c && c.who) || 'pc');
        const cp = Number(c && c.cp);
        if (!who || !state.entities[who]?.sheet) {
            // Testrun 3: the narrator booked Alaric's payment to Hesta on her side, so it never left his purse
            const other = person(who) && Number.isInteger(cp) && cp !== 0;
            reject(c, other ? `coin: only ${pcName}'s purse is tracked; report his side of it ({"who":"pc","cp":${-cp}} if the coin went between him and ${entityName(who)})` : "coin: unknown character (only Alaric's purse is tracked)");
            continue;
        }
        if (who === 'pc' && cp < 0 && !auth.pay && !forcedBy(c.taken_by)) { reject(c, owner('spending coin') + ' (a theft names the taker in "taken_by")'); continue; }
        const res = applyCoin(purse.has(who) ? purse.get(who) : state.entities[who].sheet.coin_cp, cp);
        if (!res.ok) { reject(c, res.error); continue; }
        purse.set(who, res.value);
        events.push({ t: 'coin.changed', d: { id: who, value: res.value, delta: cp, why: String(c.why || '').slice(0, 120) } });
        accepted.push(`coin ${who} ${cp >= 0 ? '+' : ''}${cp} cp`);
    }
    // rest / healing outside combat (Core #14: the narrator decides the amount; never in combat, never above max)
    for (const rc of arr(report.recover)) {
        const who = resolve((rc && rc.who) || 'pc');
        const e = ent(who);
        if (!e?.sheet) { reject(rc, 'recover: unknown character (or no tracked resources)'); continue; }
        if (inCombat(who)) { reject(rc, 'no natural recovery during ACTIVE combat (Core #14)'); continue; }
        if (e.status === 'dead') { reject(rc, 'the dead do not recover (resurrection needs an explicit mechanic)'); continue; }
        if (!rc.why) { reject(rc, 'recover needs "why" (rest, meal, healing, potion ...)'); continue; }
        const dv = deriveCharacter(e.sheet, content);
        const max = { hp: dv.maxHp, mp: dv.maxMp, sta: dv.maxSta };
        const done = [];
        for (const r of ['hp', 'mp', 'sta']) {
            if (rc[r] === undefined) continue;
            const n = Math.round(Number(rc[r]));
            if (!(n > 0)) { reject(rc, `recover.${r} must be a positive amount`); continue; }
            const value = Math.min(max[r], e.sheet[r] + n);
            if (value === e.sheet[r]) continue;
            events.push({ t: 'resource.changed', d: { id: who, resource: r, value, why: String(rc.why).slice(0, 120) } });
            done.push(`${r.toUpperCase()} ${e.sheet[r]}->${value}`);
        }
        if (done.length) accepted.push(`${who} recovers ${done.join(', ')}`);
    }
    // quests and open threads. Quest XP (Core #25) is locked when the quest is offered and awarded once on completion.
    let pcXp = state.entities.pc?.sheet ? { ...state.entities.pc.sheet } : null;
    // PLAYER OWNERSHIP for quests: the current message accepts, in words or by taking a quest by its name, or an
    // earlier message since the quest was offered took this very quest by name and the reply of that turn missed it
    // (Testrun 4: "I take the Vermin in the Malthouse Cellar Quest" got a reply without report and the quest stayed
    // "offered" for good). A message that takes quests by name licenses only those (Testrun 4, discarded first
    // attempt: the player took the vermin bill, the reply signed him onto the wolf contract).
    const nowText = [...(state.last?.carry || []), state.last?.input || ''].join('\n');
    const takenNow = uniq([...Object.values(state.quests).map((x) => x.title), ...arr(report.quests).map((x) => x?.title).filter(Boolean).map(String)])
        .filter((t) => takesQuest(nowText, t));
    const acceptance = (title, cur) => {
        if (takenNow.length) return takenNow.some((t) => normText(t) === normText(title)) ? null : `the player's message takes ${takenNow.map((t) => `"${t}"`).join(', ')}, not "${title}"`;
        if (auth.accept) return null;
        const since = cur?.history?.[0]?.turn ?? state.turn - 3;
        return (state.inputs || []).some((x) => x.turn >= since && takesQuest(x.input, title)) ? null : `accepting the quest "${title}"`;
    };
    for (const q of arr(report.quests)) {
        if (!q || !q.title) { reject(q, 'quest needs a title'); continue; }
        const id = `quest.${slug(q.title)}`;
        const cur = state.quests[id];
        const status = ['offered', 'active', 'completed', 'failed'].includes(q.status) ? q.status : 'offered';
        if (!cur && (status === 'completed' || status === 'failed')) { reject(q, 'cannot finish a quest that was never offered or accepted'); continue; }
        if (cur && ['completed', 'failed'].includes(cur.status) && cur.status !== status) { reject(q, `quest already ${cur.status}`); continue; }
        const refused = status === 'active' && cur?.status !== 'active' ? acceptance(String(q.title), cur) : null;
        if (refused) { reject(q, (refused.startsWith('accepting') ? owner(refused) : `PLAYER OWNERSHIP: ${refused}`) + ' (report it as "offered")'); continue; }
        // a quest's reward is fixed when it first appears: a new quest without its recommended Level and type is not
        // recorded, and the correction asks for the complete entry (Testrun 3: the rat quest came without a level and
        // could never have paid Quest XP). Known quests keep their locked values. The level is the engine's hidden XP
        // basis (Core #25 "Recommended Level"); the story and the Guild speak in Quest Ranks, and a Guild contract's
        // level lies inside its Quest Rank's band (Novice = Power Rank F = Levels 1-14, ...).
        const level = Number(q.level);
        const types = content.rules.xp.quest_type;
        const missing = cur ? [] : [...(Number.isInteger(level) && level > 0 ? [] : ['level']), ...(types[q.type] ? [] : ['type'])];
        if (missing.length) { reject(q, `new quest "${String(q.title).slice(0, 100)}" needs level (its hidden XP basis: the Level the task suits, a whole number from 1) and type (${Object.keys(types).join('|')}), which fix its Quest XP; missing: ${missing.join(' and ')}. Report the quest again with both`); continue; }
        const rank = q.rank === undefined || q.rank === null || q.rank === '' ? null : QUEST_RANKS.find((x) => normText(x) === normText(q.rank));
        // checked when the quest first appears; afterwards its rank is locked like level and type, so a stray rank never
        // blocks a known quest's status change
        if (q.rank && !rank && !cur) { reject(q, `quest rank "${q.rank}" is not a Guild Quest Rank (${QUEST_RANKS.join('|')}); omit it for work outside the Guild`); continue; }
        if (rank && !cur) {
            const band = content.rules.ranks.bands[QUEST_RANKS.indexOf(rank)];
            if (level < band.min || (rank !== 'Legend' && level > band.max)) { reject(q, `quest "${String(q.title).slice(0, 100)}": a ${rank} contract's level lies in ${band.min}${rank === 'Legend' ? '+' : `-${band.max}`} (Power Rank ${band.rank}); reported level ${level}. Report it again with a matching level or rank`); continue; }
        }
        const giver = q.giver ? resolve(q.giver) || String(q.giver).slice(0, 60) : cur?.giver || null;
        const quest = {
            id, title: String(q.title).slice(0, 100), status, giver,
            rec_level: cur?.rec_level ?? (Number.isInteger(level) && level > 0 ? level : null),
            rank: cur ? cur.rank ?? null : rank,
            qtype: cur?.qtype ?? (types[q.type] ? q.type : null),
            // the reward as first posted stays (live run 24.09. 23:23: the board's 5 silver lived only in the prose; at
            // the hand-in, the board long out of the history window, the clerk said four)
            reward: cur?.reward ?? (typeof q.reward === 'string' || typeof q.reward === 'number' ? String(q.reward).slice(0, 120) : null),
            notes: [...(cur?.notes || []), ...(q.note ? [String(q.note).slice(0, 200)] : [])], history: [...(cur?.history || []), { ...at, status }],
        };
        events.push({ t: 'quest.set', d: { quest } });
        accepted.push(`quest ${quest.title}: ${status}`);
        if (status === 'completed' && cur?.status !== 'completed' && pcXp) {
            if (quest.rec_level && quest.qtype) {
                const xp = questXp(quest.rec_level, quest.qtype, content);
                const evs = awardXp(pcXp, xp, content, `Quest XP: ${quest.title} (${quest.rank ? `${quest.rank}, ` : ''}XP basis Level ${quest.rec_level}, ${quest.qtype})`);
                events.push(...evs);
                for (const e of evs) pcXp = e.t === 'xp.changed' ? { ...pcXp, xp: e.d.xp } : { ...pcXp, level: e.d.level, xp: e.d.xp_after };
                accepted.push(`Quest XP +${xp}`);
            } else corrections.push(`Quest "${quest.title}" was completed without a recommended Level and type, so it grants no Quest XP (report level and type when a quest is offered).`);
        }
    }
    for (const th of arr(report.threads)) {
        if (!th || !th.text) { reject(th, 'thread needs text'); continue; }
        const id = `thread.${slug(th.text).slice(0, 48)}`;
        const cur = state.threads[id];
        const status = th.status === 'resolved' ? 'resolved' : 'open';
        if (!cur && status === 'resolved') { reject(th, 'cannot resolve an unknown thread'); continue; }
        events.push({ t: 'thread.set', d: { thread: { id, text: String(th.text).slice(0, 200), kind: th.kind || 'mystery', status, since: cur?.since || at, updated: at, source: src } } });
        accepted.push(`thread ${status}: ${th.text}`);
    }
    // combat commitment by an NPC (PENDING: the engine fixes the encounter after this reply and resolves the Turns
    // with the next player message) and NPC intents. Only an actual commitment makes a combatant: attitude or kinship
    // alone never does. The engine resolves attacks on Alaric; a fight between NPCs is narrated (a target other than
    // Alaric is never silently turned into Alaric)
    // An attacker no report introduced (live run 25.09. 01:31: "combat":{"by":"rat pack — first rat charging toward the
    // stairs, two more bolting along the walls, more following from the wall gaps"} and no "new"; the rats never
    // existed and "the first one" offered the two bystanders): the reply shows the fight, so its attackers must exist.
    // One individual creature named by its kind ("a wolf", "the big rat") that is not in the scene yet comes in as
    // "new" would have brought it. Everything else is never one silent combatant: a group ("rat pack", "rats", the
    // same text twice), a creature this report introduced as a pack ("Cellar rat pack", Testrun 3; "cellar rats",
    // Test 5), a person in free text, or a kind already here (the one there, or a latecomer?). Those are left
    // unidentified: host.js asks for each attacker separately (one "new" entry per individual, their refs in
    // "combat"), and the reply says so until then.
    const fromCombat = new Set();
    const unidentified = [];
    const attacker = (ref) => {
        const look = normText(ref).split(/\s+-\s+|[,;:(]/)[0].trim().slice(0, 40);
        const anchor = oneCreature(content, look);
        if (!anchor || [...present].some((id) => !fromCombat.has(id) && ent(id)?.kind === 'creature' && ent(id).anchor === anchor.id && ent(id).status !== 'dead')) return null;
        const desc = look.replace(/^(?:the|a|an|another|one)\s+/, '');
        const id = uniqueId(state, 'mon', desc, taken);
        const entity = { id, kind: 'creature', name: null, descriptors: [desc], traits: '', status: 'alive', location: state.scene.location, created: at, source: src, card: {}, species: anchor.aliases[0], anchor: anchor.id };
        created.set(id, entity);
        fromCombat.add(id);
        newRefs.set(normText(ref), id);
        events.push({ t: 'entity.created', d: { entity } }, { t: 'scene.entered', d: { id } });
        present.add(id);
        accepted.push(`new creature ${desc} (${id}): the attacker in "combat"`);
        return id;
    };
    const unknownTexts = commitments.filter((cb) => cb && typeof cb.by === 'string' && cb.by.trim() && !resolve(cb.by)).map((cb) => normText(cb.by));
    const repeated = new Set(unknownTexts.filter((t, i) => unknownTexts.indexOf(t) !== i)); // one text for several attackers
    for (const cb of commitments) {
        if (!cb || typeof cb !== 'object' || !cb.by) continue; // an empty entry ({} or {by: []}) commits nobody
        const known = resolve(cb.by);
        const free = !known && typeof cb.by === 'string' && cb.by.trim() && state.mode !== 'creation';
        const by = known || (free && !repeated.has(normText(cb.by)) ? attacker(cb.by) : null);
        if ((free && !by) || groupNew.has(by)) {
            if (!unidentified.some((u) => normText(u.by) === normText(cb.by))) unidentified.push({ by: String(cb.by).slice(0, 200), ref: groupNew.get(by) || null });
            reject(cb, `combat.by "${String(cb.by).slice(0, 80)}" ${groupNew.has(by) ? 'is a group' : 'names no attacker the game can tell apart'}: introduce each attacker as its own "new" entry (one per individual creature or person) and name their refs in "combat"`);
            continue;
        }
        const target = cb && cb.target ? resolve(cb.target) : 'pc';
        if (state.mode === 'creation') reject(cb, 'no combat during Character Creation');
        else if (!person(by)) reject(cb, `combat.by must be a present NPC or creature: ${UNKNOWN}`);
        else if (inCombat(by)) accepted.push(`${by} fights on`); // already a combatant: nothing to commit
        else if (!present.has(by)) reject(cb, `${by} is not in the scene (report "enter" for someone who arrives)`);
        else if (statusOf(state, by) === 'dead') reject(cb, `${by} is dead`);
        else if (target !== 'pc') reject(cb, `combat target "${cb.target}" is not ${pcName}: only an attack on ${pcName} starts engine combat (omit "target"); a fight between NPCs is narrated, not resolved`);
        else { events.push({ t: 'combat.pending', d: { by, target, ...at } }); accepted.push(`combat committed by ${by} (pending)`); }
    }
    for (const i of arr(report.intent)) {
        const who = resolve(i && i.who);
        if (!ent(who) || !INTENTS.has(i.intent)) { reject(i, 'intent needs a known NPC and attack|flee|surrender|parley|hold|take_cover'); continue; }
        events.push({ t: 'combat.intent', d: { who, intent: i.intent } });
        accepted.push(`${who} intends ${i.intent}`);
    }
    // a Core #7 check resolved with this turn's engine CHECK DIE: the engine re-computes it and keeps its own result
    if (report.check) {
        const c = report.check;
        const die = state.last?.outcome?.check_die;
        const stat = c.stat ? String(c.stat).toUpperCase() : null;
        const A = Number(c.actor);
        const O = Number(c.opposition);
        if (!die) reject(c, 'no CHECK DIE was issued this turn');
        else if (stat && !content.rules.stats.includes(stat)) reject(c, `unknown stat ${c.stat}`);
        else if (!(A > 0) || !(O > 0)) reject(c, 'check needs positive actor and opposition scores');
        else {
            const pcStat = stat && state.entities.pc?.sheet ? state.entities.pc.sheet.stats[stat] : null;
            const res = checkChance(A, O, arr(c.actor_mods).map(Number), arr(c.opp_mods).map(Number));
            const success = die <= res.chance;
            const rec = { what: String(c.what || 'check').slice(0, 80), stat, actor: res.actor, opposition: res.opposition, chance: res.chance, roll: die, success, claimed: c.success === undefined ? null : !!c.success };
            events.push({ t: 'check.recorded', d: rec });
            accepted.push(`check ${rec.what}: ${rec.chance}% d100 ${die} ${success ? 'SUCCESS' : 'FAILURE'}`);
            if (rec.claimed !== null && rec.claimed !== success) corrections.push(`Check "${rec.what}": Chance ${rec.chance}% with d100 ${die} is a ${success ? 'SUCCESS' : 'FAILURE'} — the previous reply narrated the opposite; keep the engine result from now on.`);
            if (pcStat !== null && (c.who === undefined || resolve(c.who) === 'pc') && A < pcStat) corrections.push(`Check "${rec.what}": Alaric's Actor Score must include his current ${stat} ${pcStat} (reply used ${A}).`);
        }
    }
    // a full name the narrator now uses for someone the engine knew only by its first part ("Hesta Gault" for Hesta)
    for (const [id, full] of resolve.fullNames) {
        const e = ent(id);
        if (!e?.name || normText(full).split(' ')[0] !== normText(e.name)) continue;
        if (created.has(id)) { e.name = full; continue; }
        events.push({ t: 'entity.updated', d: { id, set: { name: full } } });
        accepted.push(`${id} is ${full}`);
    }
    // a name the story says now ("Sergeant Hobb says it back flat"): the player's views use it from here on
    for (const e of Object.values(state.entities)) {
        if (e.known_name === undefined || e.known_name === null || !e.name) continue;
        const part = namePart(e.name, e.known_name);
        if (part === e.known_name) continue;
        events.push({ t: 'entity.updated', d: { id: e.id, set: { known_name: part } } });
        accepted.push(`${e.id}: the story names ${part ?? e.name}`);
    }
    return { events, accepted, rejected, corrections, unidentified };
}

function bandOf(b) {
    const x = String(b || '').toUpperCase();
    return BANDS.has(x) ? x : null;
}

function coverOf(c) {
    return COVERS.has(c) ? c : undefined;
}

/** The same value; for a name, "Alaric, no family name" is Alaric (Testrun 4: it became a FALSE belief of the clerk). */
/**
 * The location a report names. The engine block names it "Alderwatch, Valedorn Crown" (city, realm) and narrators echo
 * that, or name a spot inside it ("Salt Gate customshouse, Alderwatch"): every comma part is tried, a realm is never a
 * location, and the parts before the known location are the spot (live run 24.09. 23:23: both made a second
 * Alderwatch). name: the location's name without realm, for a new one.
 */
function findLocation(state, content, name) {
    const byName = (n) => content.locations.get(n) || locationByName(content, n)
        || Object.values(state.entities).find((e) => e.kind === 'location' && normText(e.name) === normText(n)) || null;
    const whole = byName(name);
    if (whole) return { loc: whole, spot: null, name: String(name) };
    const realms = new Set([...content.factions.values()].filter((f) => f.kind === 'realm').map((f) => normText(f.name)));
    const parts = String(name).split(',').map((x) => x.trim()).filter((x) => x && !realms.has(normText(x)));
    for (const [i, part] of parts.entries()) {
        const l = byName(part);
        if (l) return { loc: l, spot: parts.slice(0, i).join(', ') || null, name: part };
    }
    return { loc: null, spot: null, name: parts.join(', ') || String(name) };
}

function sameValue(p, a, b) {
    const core = (v) => (p === 'name' ? normText(v).replace(/\b(?:with )?(?:no|without) (?:family name|family|surname|last name)\b/g, ' ').replace(/\s+/g, ' ').trim() : normText(v));
    const [x, y] = [core(a), core(b)];
    // a name with a family name added is the same name: "Alaric Red" is Alaric (live run 24.09. 23:23: the clerk
    // "believed" it as a false name and did not know his name)
    return x === y || (p === 'name' && !!x && !!y && (y.startsWith(`${x} `) || x.startsWith(`${y} `)));
}

const LIFE_STATUS = new Set(['alive', 'dead']);

const MONEY_RE = /^(?:\d+ )?(?:(?:copper|silver|gold)(?: (?:coins?|pieces?|crowns?|marks?|bits?))?|coins?|money|cash)$/;

function findItemId(content, name) {
    const t = normText(name);
    for (const [id, it] of content.items) {
        const n = normText(it.name);
        // "Standard Arrows" is the content item standard_arrow, not a new item (Testrun 2)
        for (const f of [n, n.replace(/^starter /, ''), normText(id.replace(/_/g, ' '))]) if (t === f || t === `${f}s` || t === `${f}es`) return id;
    }
    return slug(name);
}

function arr(x) {
    if (x === undefined || x === null) return [];
    return Array.isArray(x) ? x : [x];
}
