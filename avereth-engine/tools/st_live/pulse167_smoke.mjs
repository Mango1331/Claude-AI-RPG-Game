// Real ST host / scripted provider (PULSE package B, .167): the window inside a Living Dungeon on the host path. The
// prefix is built here with the same harness the Node tests use (Old Crown Catacombs, level 1, its first encounter
// fought; the gallery minion free, the warden after it) and seeded into ST. Three runs from it: a wandering minion
// (forced DANGER while he looks around), a normal DUNGEON AHEAD (going on deeper: no draw), a rest cut short by the
// wanderer before a GO (rest interrupted, no second reference); then save/reload and a renewal folded in the host.
// The provider is scripted: this proves the host path, never that a free narrator model tells the encounter.
import fs from 'node:fs';
import path from 'node:path';
import { loadProductContent } from '../../tests/helpers.js';
import { campaign, walk, delve, hero, fightAll, GO, CATA } from '../../tests/v4/patch8_lib.js';

const content = await loadProductContent();
const g = await campaign(content);
hero(g);
await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel; a stair goes down.' });
await delve(g, 'First Burial Gallery');
await fightAll(g);
const x0 = g.state().dungeons[CATA];
const gallery = x0.run.floors[1].slots.find((sl) => sl.id === 'gallery');
const PREFIX = g.chat.map((m) => ({ name: m.is_user ? 'Alaric' : 'Avereth', ...structuredClone(m) }));
const slotDelta = (seq) => ({ seq, type: 'creature.new', ref: gallery.ref, species: gallery.species, anchor: gallery.anchor, desc: [gallery.species], count: gallery.count, present: true, band: 'MEDIUM', cluster: null, stronger: null, threat: true, more: null });
const WANDER = 'I look around the burial gallery for a while.';
const DEEPER = 'I go on deeper into the catacombs.';
const REST = 'I rest against the gallery wall, then go on deeper.';
// rules.pulse.force entries of the installed copy (run_c.mjs): exactly these messages get a forced DANGER window
export const PULSE167_FORCE = [WANDER, DEEPER, REST].map((when) => ({ open: true, kind: 'danger', when }));
export const pulse167Turns = [
    { key: 'pulse167wander', player: WANDER, plan: { commands: [{ seq: 1, type: 'other', what: 'look around', quote: WANDER.replace(/\.$/, '') }] },
        reply: 'Out of a side niche two restless skeletons shamble toward him, raise their rusted blades and attack him.',
        answer: { scene: 'here', expected: {}, deltas: [slotDelta(1), { seq: 2, type: 'hostile', by: [gallery.ref], scope: 'all', evidence: 'raise their rusted blades and attack him' }] } },
    { key: 'pulse167ahead', player: DEEPER, plan: { commands: [{ seq: 1, ...GO({ new: 'deeper' }, DEEPER.replace(/\.$/, '')) }] },
        reply: 'He goes on into a low side gallery; two restless skeletons stand up from the niches there.',
        answer: { scene: { new: { name: 'Low Side Gallery', kind: 'interior', parent: CATA } }, expected: { 1: { arrived: true, at: { new: { name: 'Low Side Gallery', kind: 'interior', parent: CATA } }, with: null } },
            deltas: [{ seq: 1, type: 'arrive', at: { new: { name: 'Low Side Gallery', kind: 'interior', parent: CATA } }, with: null, forced_by: null }, { ...slotDelta(2), scene: { new: { name: 'Low Side Gallery', kind: 'interior', parent: CATA } } }] } },
    { key: 'pulse167rest', player: REST, plan: { commands: [{ seq: 1, type: 'activity', kind: 'rest', what: null, minutes: 120, until: null, quote: 'I rest against the gallery wall' }, { seq: 2, ...GO({ new: 'deeper' }, 'then go on deeper') }] },
        reply: 'Mid-rest, two restless skeletons climb out of the niches and come at him; he had rested two full hours.',
        answer: { scene: 'here', expected: { 1: { minutes: 120, done: false } }, deltas: [slotDelta(1), { seq: 2, type: 'time', minutes: 120 }] } },
];
const engineBlock = (request) => String(request?.messages?.find((m) => String(m.content).startsWith('[AVERETH ENGINE'))?.content || '');
const allText = (request) => (request?.messages || []).map((m) => String(m.content)).join('\n');

export async function pulse167Smoke({ page, send, idle, calls, driver, onReload, out }) {
    const seed = async (prefix = PREFIX) => {
        await page.evaluate(async (p) => { const c = SillyTavern.getContext(); c.chat.splice(0, c.chat.length, ...p); await c.saveChat(); await c.reloadCurrentChat(); }, structuredClone(prefix));
        onReload();
        await page.waitForTimeout(600);
    };
    const snapshot = () => page.evaluate(async (root) => {
        const { foldChat, rec } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const chat = SillyTavern.getContext().chat, folded = foldChat(chat), s = folded.state;
        const user = chat.findLast((m) => m.is_user), r = rec(user), reply = chat.at(-1)?.is_user ? null : rec(chat.at(-1));
        const outcome = r?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
        const x = s.dungeons?.[root];
        return { errors: folded.errors, auth: outcome?.auth?.pulse || null, resolutions: outcome?.resolutions || [], events: (r?.events || []).map((e) => ({ t: e.t, d: e.t === 'dungeon.ahead' || e.t === 'time.advanced' || e.t === 'pulse.rolled' ? e.d : null })),
            replyEvents: (reply?.events || []).map((e) => ({ t: e.t, d: ['time.advanced', 'dungeon.slot', 'delta.rejected'].includes(e.t) ? e.d : null })), corrections: reply?.corrections || [],
            gallery: x?.run.floors[1].slots.find((sl) => sl.id === 'gallery') || null, parts: x?.run.floors[1].parts, cycle: x?.cycle, ahead: x?.ahead || null,
            levels: Object.values(s.entities).filter((e) => e.slot?.id === 'gallery').map((e) => e.profile?.level), encounter: !!s.encounter, pending: (s.pending_combat || []).length,
            clock: s.clock.minute, sheet: s.entities.pc.sheet, dungeons: s.dungeons };
    }, CATA);
    const checks = {}, evidence = [];
    const play = async (key) => {
        const n = calls.length;
        await send(pulse167Turns.find((t) => t.key === key).player); await idle();
        const st = await snapshot();
        const narr = calls.slice(n).findLast((c) => c.purpose === 'narrator'), extract = calls.slice(n).findLast((c) => c.purpose === 'extract');
        const block = engineBlock(narr);
        evidence.push({ key, auth: st.auth, aheads: st.events.filter((e) => e.t === 'dungeon.ahead'), lines: block.split('\n').filter((l) => /PULSE \(|DUNGEON AHEAD|REST INTERRUPTED|NOT DONE|CUT SHORT/.test(l)), extractorEncounter: allText(extract).split('\n').filter((l) => /ENGINE ENCOUNTER/.test(l)) });
        return { st, block, extract: allText(extract) };
    };
    const aheads = (st) => st.events.filter((e) => e.t === 'dungeon.ahead');
    const minutes = (list) => list.filter((e) => e.t === 'time.advanced').reduce((a, e) => a + e.d.minutes, 0);
    // 1. a wandering minion: one reservation with the draw, "comes to him here", the slot met at its levels, the fight
    await seed();
    const w = await play('pulse167wander');
    checks.wanderDraw = w.st.auth?.frame === 'dungeon' && w.st.auth?.kind === 'danger' && w.st.events.filter((e) => e.t === 'pulse.rolled').length === 1;
    checks.wanderOneReservation = aheads(w.st).length === 1 && aheads(w.st)[0].d.ahead?.wander === true && aheads(w.st)[0].d.ahead.slot === 'gallery';
    checks.wanderNarratorLine = /PULSE \(the engine's; level 1\) — DANGER: 2 restless skeletons of this level come to him here/.test(w.block) && !/DUNGEON AHEAD/.test(w.block);
    checks.wanderExtractorCatalog = /ENGINE ENCOUNTER \(level 1\): when the reply shows the restless skeletons coming to him here/.test(w.extract);
    checks.wanderSlotMet = !!w.st.gallery?.at && w.st.gallery.entities.length === 2 && JSON.stringify(w.st.levels.sort()) === JSON.stringify([...gallery.levels].sort());
    checks.wanderFight = w.st.encounter || w.st.pending > 0;
    checks.wanderPartsUnchanged = w.st.parts === x0.run.floors[1].parts;
    // save/reload: the same Dungeon (slots, parts, cycle)
    await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); await SillyTavern.getContext().reloadCurrentChat(); });
    onReload(); await page.waitForTimeout(800);
    const re = await snapshot();
    checks.reloadSameDungeon = !re.errors.length && JSON.stringify(re.dungeons) === JSON.stringify(w.st.dungeons) && re.clock === w.st.clock;
    // a renewal folded after the draw: the reservation is gone, nothing of the old cycle stays bound
    await page.evaluate(async ({ root, cycle }) => {
        const c = SillyTavern.getContext(), m = c.chat.findLast((y) => y.extra?.avereth?.events), x = structuredClone(c.chat);
        void x;
        const { foldChat } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const d = foldChat(c.chat).state.dungeons[root];
        const floors = Object.fromEntries(Object.entries(d.run.floors).map(([n, f]) => [n, { ...f, parts: 0, cleared: null, slots: f.slots.map((sl) => ({ ...sl, ref: sl.ref.replace(`_c${cycle}_`, `_c${cycle + 1}_`), at: null, met_turn: null, entities: [], taken: null })) }]));
        m.extra.avereth.events.push({ t: 'dungeon.reset', d: { id: root, cycle: cycle + 1, cycle_start: 0, floors } });
        await c.saveChat(); await c.reloadCurrentChat();
    }, { root: CATA, cycle: x0.cycle });
    onReload(); await page.waitForTimeout(800);
    const renewed = await snapshot();
    checks.resetDropsReservation = !renewed.errors.length && renewed.cycle === x0.cycle + 1 && renewed.ahead === null && !renewed.gallery.at && renewed.gallery.entities.length === 0;
    // 2. a normal DUNGEON AHEAD: no draw, the engine's one reference
    await seed();
    const a = await play('pulse167ahead');
    checks.aheadNoDraw = a.st.events.filter((e) => e.t === 'pulse.rolled').length === 0 && a.st.auth?.reason === 'dungeon_ahead';
    checks.aheadOneReference = aheads(a.st).length === 1 && !aheads(a.st)[0].d.ahead?.wander && /DUNGEON AHEAD \(the engine's\) — going on into a part of level 1/.test(a.block) && !/PULSE \(/.test(a.block);
    checks.aheadSlotMet = !!a.st.gallery?.at && a.st.gallery.entities.length === 2;
    // 3. rest, then GO, with the Dungeon danger: the wanderer reserved at the claim, the GO stopped, the cut minutes kept
    await seed();
    const r = await play('pulse167rest');
    const cut = r.st.auth?.interrupt;
    const order = r.st.events.map((e) => e.t);
    checks.restCut = !!cut && !cut.at_end && cut.who === '2 restless skeletons' && minutes(r.st.events) === cut.after_min;
    checks.restOneReservation = aheads(r.st).length === 1 && aheads(r.st)[0].d.ahead.wander === true && order.indexOf('dungeon.ahead') < order.indexOf('time.advanced');
    checks.restGoStopped = r.st.resolutions[1]?.reason === 'rest interrupted' && !/DUNGEON AHEAD/.test(r.block);
    checks.restRequestCause = /REST INTERRUPTED \(the engine's; level 1\) — .*2 restless skeletons of this level come upon him/.test(r.block) && /NOT DONE — "then go on deeper"/.test(r.block);
    checks.restReplyTimeNoRest = minutes(r.st.replyEvents) === 0 && r.st.replyEvents.some((e) => e.t === 'delta.rejected' && e.d.rule === 'rest_cut');
    checks.restSlotMet = !!r.st.gallery?.at && r.st.gallery.entities.length === 2;
    checks.saved = await driver().verifySaved(await driver().chat(), { complete: true });
    fs.writeFileSync(path.join(out, 'pulse167_requests.json'), JSON.stringify(evidence, null, 2));
    return checks;
}
