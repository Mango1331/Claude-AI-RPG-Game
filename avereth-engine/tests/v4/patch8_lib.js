// Patch 8 (Living Dungeons) test helpers: a campaign played through the product's host path with a scripted planner
// and scripted extractor answers (tests/v4/harness.js), as the Patch 7 tests do.
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec } from '../../src/host.js';
import { Chat4 } from './harness.js';

export const ALDERWATCH = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Alderwatch, Valedorn Crown`';
export const CATA = 'loc.old_crown_catacombs';
export const GROTTO = 'loc.glimmerdeep_grotto';
export const WARRENS = 'loc.mossback_warrens';

/** A current five-notice mock board; callers still choose all actions independently. */
export function simpleBoard(dungeon = 'Old Crown Catacombs') {
    const make = (title, verb, what, qty, where) => ({ title, client: 'local residents', rank: 'Novice', level: 1, qtype: 'minor', payout_cp: 30,
        task: verb === 'DEFEAT' && qty === null ? `Clear level 1 of ${dungeon}. Danger: groups may overwhelm a solo beginner.` : title,
        desired_end_state: title, objectives: [{ verb, what, qty, unit: null, where }], proof: [] });
    return [make('Pasture wolf', 'DEFEAT', 'wolf', 1, 'the west pasture'), make('Road beasts', 'DEFEAT', 'feral dogs', 2, 'the old road'),
        make('Medicine parcel', 'DELIVER', 'sealed medicine parcel', 1, 'Healer at Quarry Camp'),
        make('Ledger delivery', 'DELIVER', 'sealed ledger', 1, 'Ferryman at River Ford'),
        make(`Clear ${dungeon}`, 'DEFEAT', 'restless skeletons', null, `${dungeon}, level 1`)];
}

/** Current hunt-only generation; historical simpleBoard fixtures keep their original distribution. */
export function huntBoard(dungeon = 'Old Crown Catacombs') {
    return simpleBoard(dungeon).map((l, i) => l.objectives[0].verb !== 'DELIVER' ? l : {
        ...l, title: `Cull the pasture wolves ${i}`, task: `Cull a wolf at pasture ${i}.`, desired_end_state: `The wolf at pasture ${i} is defeated.`,
        objectives: [{ verb: 'DEFEAT', what: 'wolf', qty: 1, unit: null, where: `pasture ${i}` }],
    });
}

/**
 * B1 (.130): huntBoard as the current Novice board profile asks for it (world progression is no campaign variant): every
 * world hunt with its habitat in a fixed F window, the introductory hunt at 1-1, a mid-F (4-7) and an upper-F (8-11) hunt.
 */
export function progressionBoard(dungeon = 'Old Crown Catacombs') {
    const habitat = [['wolf', 'wolf', 1, 1, 1], ['feral dog', 'wolf', 4, 7, 4], ['wolf', 'wolf', 8, 11, 8], ['wolf', 'wolf', 1, 3, 2]];
    let i = 0;
    return huntBoard(dungeon).map((l) => {
        if (l.objectives[0].qty === null) return l;
        const [species, anchor, min, max, level] = habitat[i++];
        return { ...l, level, ...(level > 1 ? { qtype: 'standard' } : {}), habitat: { species, anchor, min_level: min, max_level: max } };
    });
}

export async function campaign(content, { greeting = ALDERWATCH, cls = 'Mage', skills = 'Flame Lance + Focused Ward', legacyPrivateQuests = false, fProgression = false } = {}) {
    // B1 (.130): the planner campaigns of these suites pin path C on their start, as a product campaign does
    const g = new Chat4(content, { greeting, legacyPrivateQuests, fProgression, planner: true });
    await g.player(cls);
    await g.player(skills);
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
/** A player message the planner reads as these commands. */
export async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    const own = (q) => (q && text.includes(q) ? q : text.replace(/\*/g, '').trim());
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c, quote: own(c.quote) })) })];
    const r = await prepareGenerationAsync(g.chat, g.content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    if (r.action === 'panels') g.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
    return r;
}
export const lastUser = (g) => rec(g.chat.findLast((m) => m.is_user));
export const outcomeOf = (g) => lastUser(g)?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
export const linesOf = (g) => [...(outcomeOf(g)?.actions || []), ...(outcomeOf(g)?.extra || [])].join('\n');
export const GO = (to, quote) => ({ type: 'go', to, quote });
export const room = (name, parent = null) => ({ new: { name, kind: 'interior', parent } });
export const way = (to, more = {}, seq = 1) => ({ seq, type: 'passage', from: null, to, name: null, hidden: null, one_way: null, dir: null, feature: null, ...more });
/** The story has him arrive (at: where) with these deltas. */
export async function walk(g, to, { text = '*I go on*', at, deltas = [], arrived = true, prose = 'He goes.' } = {}) {
    await say(g, text, GO(to, text.replace(/\*/g, '')));
    return g.reply(prose, { expected: { 1: { arrived, at: at === undefined ? (typeof to === 'string' ? to : null) : at, with: null } }, deltas });
}
/** Events of the engine's own (a test's precondition) at the end of the last message's record. */
export function inject(g, events) {
    const r = rec(g.chat.findLast((m) => m.extra?.avereth?.events));
    r.events.push(...events);
}
export const living = (g, root = CATA) => g.state().dungeons?.[root];
/** The encounter the engine placed ahead of the last GO (its slot instance), or null. */
export function ahead(g, root = CATA) {
    const x = living(g, root);
    if (!x?.ahead) return null;
    const a = x.ahead;
    return { ...a, slot: x.run.floors[a.floor].slots.find((y) => y.id === a.slot) };
}
/** The creature.new of the engine's encounter as the extractor reports it from the catalog. */
export const slotDelta = (sl, seq = 2) => ({ seq, type: 'creature.new', ref: sl.ref, species: sl.species, anchor: sl.anchor, desc: [sl.species], count: sl.count, present: true, band: 'MEDIUM', cluster: null, stronger: null, threat: true, more: null });
/** He goes on into a new part of the Dungeon; the story shows the engine's encounter there, if one was placed. */
export async function delve(g, name, { root = CATA, parent = root, text = '*I go on deeper*', bring = true, extra = [] } = {}) {
    await say(g, text, GO({ new: 'deeper' }, text.replace(/\*/g, '')));
    const a = ahead(g, root);
    const sl = a && a.turn === g.state().turn ? a.slot : null;
    const deltas = [...(sl && bring ? [slotDelta(sl)] : []), ...extra];
    const r = await g.reply(`He goes on into ${name}.`, { expected: { 1: { arrived: true, at: room(name, parent).new ? { new: { name, kind: 'interior', parent } } : null, with: null } }, deltas });
    return { ...r, slot: sl };
}
/** Alaric strong enough for an F/E Dungeon (a test's precondition, not play). */
export function hero(g, level = 40) {
    inject(g, [
        { t: 'level.up', d: { id: 'pc', level, free_points: 120, favored: [], xp_after: 0 } },
        { t: 'stat.assigned', d: { id: 'pc', stat: 'INT', amount: 60 } },
        { t: 'stat.assigned', d: { id: 'pc', stat: 'VIT', amount: 40 } },
        { t: 'stat.assigned', d: { id: 'pc', stat: 'WIL', amount: 20 } },
        { t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: 400 } },
        { t: 'resource.changed', d: { id: 'pc', resource: 'mp', value: 300 } },
    ]);
}
/** Fight every foe present to the end with Flame Lance, a Turn at a time (the narrator's replies say nothing). */
export async function fightAll(g, { skill = 'mage.flame_lance', max = 40 } = {}) {
    for (let i = 0; i < max; i++) {
        const s = g.state();
        if (s.entities.pc.status === 'dead') throw new Error('Alaric died');
        const foe = s.encounter
            ? Object.values(s.encounter.combatants).find((c) => c.side === 'hostile' && c.current.hp > 0 && !c.current.escaped && !c.current.surrendered)?.id
            : s.scene.present.find((id) => s.entities[id]?.kind === 'creature' && s.entities[id].status !== 'dead');
        if (!foe) return;
        if (!s.encounter && s.entities.pc.sheet.mp < 100) inject(g, [{ t: 'resource.changed', d: { id: 'pc', resource: 'mp', value: 300 } }]);
        const mp = s.encounter ? s.encounter.combatants.pc.current.mp : 300;
        const use = mp >= 20 ? skill : 'mage.basic_attack';
        await say(g, `*I use ${use} on it*`, { type: 'use_skill', skill: use, target: foe, quote: `I use ${use} on it` });
        await g.reply('The fight goes on.', { expected: {}, deltas: [] });
    }
    const s = g.state();
    throw new Error(`the fight did not end: ${JSON.stringify(s.encounter?.log?.slice(-6))} ${JSON.stringify(s.encounter?.combatants?.pc?.current)} ${JSON.stringify((lastUser(g).command?.panels || []).join(' ').slice(0, 300))} ${JSON.stringify(lastUser(g).plan?.mapped)} ${lastUser(g).events.map((e) => e.t).join(',')} ${JSON.stringify(outcomeOf(g)).slice(0, 600)}`);
}
