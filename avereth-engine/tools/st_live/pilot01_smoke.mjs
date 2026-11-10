// Real ST host / scripted provider: the corrections from the natural NPC/PULSE pilot 01 (09.11.2026, main
// testrun_10b/npc-20261109-160250Z), played from its own original messages (tests/v4/fixtures/pilot01_npc_pulse.json.gz)
// with their original planner and extractor answers. The provider is scripted: this proves the host path (planner,
// PULSE, World, fold, save/reload), never that a free model narrates or extracts like this.
//   .175 K1: the Dungeon entry T65 (from I128): its DUNGEON AHEAD slot foes are not refused by PULSE; with an attack the
//        reply narrates, their fight opens.
//   .175 K2/D5: the bookshop T41–T43 (from I80): the Primer on sale cannot be taken; bought, it is the one from the case;
//        "tucked away" adds nothing; one Primer, 30 cp once, the same after save/reload.
//   .176 K3: the cart road T19 (from I36): the narrator's block has no GEAR MARKET; K4: the Guild turn-in T24 (from I46):
//        the clerk's return by her joined quote, her handling teaches her his completion; K7: the Primer of Guard T27
//        (from I52): the refusal tells the narrator 80 cp needed, 70 cp in his purse, 10 cp short, one purse.
//   .177 K5: Muller's debt to Hesse under the id of his promised copper T58 (from I115) leaves its words; the carter's
//        ride under a second id T61 (from I121) settles nothing of thread.t47.1; K6a: the T61 correction names the
//        crossroads, not the Woolpack, and reaches the next narrator block (T62); K8: T16 (from I31) books no
//        "name = Alaric Red" of the carter; T11 (from I21) gives Widow Hessa no descriptor "null".
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const pilot = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/pilot01_npc_pulse.json.gz', import.meta.url))));
const raw = (i) => pilot[i].extra.avereth;
const planOf = (i) => JSON.parse(raw(i).plan.raw.at(-1));
const ATTACK = 'The nearest goblin scout lunged at Alaric, its spear driving for his ribs.';
const entryAnswer = (() => {
    const a = structuredClone(raw(130).extraction.raw);
    for (const d of a.deltas) if (['hostile', 'intent'].includes(d.type)) d.evidence = ATTACK.replace(/\.$/, '');
    return a;
})();
const turn = (key, u, r, extra = {}) => ({ key, player: pilot[u].mes, plan: planOf(u), reply: pilot[r].mes, answer: raw(r).extraction.raw, ...extra });
export const pilot01Turns = [
    turn('p175entry', 129, 130, { reply: `${pilot[130].mes}\n\n${ATTACK}`, answer: entryAnswer }),
    turn('p175shop', 81, 82),
    { key: 'p175take', player: '*I lift the Primer out of the case and tuck it under my arm*', plan: { commands: [{ seq: 1, type: 'take', object: 'obj.t82.primer', qty: 1, quote: 'I lift the Primer out of the case' }] },
        reply: 'The shopkeeper cleared his throat and tapped the case. "That one is for sale, friend."', answer: { scene: 'here', expected: {}, deltas: [] } },
    turn('p175buy', 83, 84),
    turn('p175tuck', 85, 86),
    turn('p176road', 37, 38),
    turn('p176turnin', 47, 48),
    turn('p176short', 53, 54),
    turn('p177debt', 115, 116),
    turn('p177carter', 121, 122),
    turn('p177cairn', 123, 124),
    turn('p177name', 31, 32),
    turn('p177hessa', 21, 22),
];
const SCOUTS = ['mon.mossback_warrens_c1_l1_e1_1', 'mon.mossback_warrens_c1_l1_e1_2', 'mon.mossback_warrens_c1_l1_e1_3'];

export async function pilot01Smoke({ page, send, idle, calls, onReload, out }) {
    const seed = async (n) => {
        await page.evaluate(async (prefix) => { const c = SillyTavern.getContext(); c.chat.splice(0, c.chat.length, ...prefix); await c.saveChat(); await c.reloadCurrentChat(); },
            structuredClone(pilot.slice(0, n).map((m) => ({ name: m.is_user ? 'Alaric' : 'Avereth', ...m }))));
        onReload();
        await page.waitForTimeout(600);
    };
    const snapshot = () => page.evaluate(async () => {
        const { foldChat, rec } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const chat = SillyTavern.getContext().chat, folded = foldChat(chat), s = folded.state;
        const last = chat.at(-1), user = [...chat].reverse().find((m) => m.is_user);
        const r = last?.is_user ? null : rec(last);
        return { errors: folded.errors, present: s.scene.present, at: s.scene.at, coin: s.entities.pc.sheet.coin_cp, encounter: !!s.encounter, pending: (s.pending_combat || []).length,
            primers: Object.values(s.objects).filter((o) => /^primer$/i.test(o.name) && o.holder?.entity === 'pc').map((o) => o.id),
            primerAt: s.objects['obj.t82.primer']?.holder || null, slots: Object.fromEntries(Object.entries(s.entities).filter(([, e]) => e.slot).map(([id, e]) => [id, e.slot.id])),
            replyRejected: (r?.events || []).filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule), corrections: r?.corrections || [],
            userResolved: (rec(user)?.events || []).filter((e) => e.t === 'cmd.resolved').map((e) => [e.d.type, e.d.status, e.d.reason || null]),
            userEvents: (rec(user)?.events || []).map((e) => e.t), extraction: r?.extraction?.status || null,
            clerkKnows: Object.keys(s.knowledge?.['npc.npcashbridge_clerk'] || {}),
            threads: Object.fromEntries(Object.entries(s.threads || {}).map(([k, t]) => [k, { text: t.text, status: t.status, who: t.who || null }])),
            carterNames: Object.values(s.facts || {}).filter((f) => f.s === 'npc.npccarter_hazel' && f.p === 'name').map((f) => f.o),
            hessa: Object.values(s.entities).find((e) => e.name === 'Widow Hessa')?.descriptors || null };
    });
    const checks = {}, evidence = [];
    const play = async (key) => {
        await send(pilot01Turns.find((t) => t.key === key).player); await idle();
        const st = await snapshot();
        evidence.push({ key, ...st, errors: st.errors.length });
        return st;
    };
    // K1: the Dungeon entry
    await seed(129);
    const e = await play('p175entry');
    checks.k1NoPulseVeto = !e.replyRejected.includes('pulse') && !e.corrections.some((c) => /no new attacker was authorized/.test(c));
    checks.k1SlotFoesHere = SCOUTS.every((id) => e.present.includes(id) && e.slots[id] === 'scouts');
    checks.k1FightOpens = (e.encounter || e.pending > 0) && !e.errors.length && e.extraction === 'applied';
    // K2/D5: the bookshop
    await seed(81);
    const shop = await play('p175shop');
    const before = shop.coin;
    const take = await play('p175take');
    checks.d5TakeRefused = take.userResolved.some(([t, st, why]) => t === 'take' && st === 'refused' && /for sale/.test(why || '')) && take.primers.length === 0 && take.primerAt?.loc === 'loc.ashbridge.bookshop_with_the_primer';
    const buy = await play('p175buy');
    checks.k2BoughtTheShownOne = JSON.stringify(buy.primers) === JSON.stringify(['obj.t82.primer']) && buy.coin === before - 30 && !buy.userEvents.includes('object.created');
    const tuck = await play('p175tuck');
    checks.k2TuckAddsNothing = JSON.stringify(tuck.primers) === JSON.stringify(['obj.t82.primer']) && tuck.coin === before - 30 && !tuck.errors.length;
    await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); await SillyTavern.getContext().reloadCurrentChat(); });
    onReload(); await page.waitForTimeout(800);
    const re = await snapshot();
    checks.k2SaveReload = !re.errors.length && JSON.stringify(re.primers) === JSON.stringify(['obj.t82.primer']) && re.coin === before - 30;
    // .176 K3: no equipment catalog on the cart road
    await seed(37);
    let n = calls.length;
    const road = await play('p176road');
    const roadNarr = calls.slice(n).filter((c) => c.purpose === 'narrator').map((c) => (c.messages || []).map((m) => String(m.content)).join('\n')).join('\n');
    checks.k3NoCatalogOnRoad = roadNarr.includes('[AVERETH ENGINE') && !roadNarr.includes('GEAR MARKET') && !road.errors.length;
    // .176 K4: the clerk's return at the turn-in and her handling of it
    await seed(47);
    const ti = await play('p176turnin');
    checks.k4ClerkReturns = ti.present.includes('npc.npcashbridge_clerk') && !ti.replyRejected.includes('met_evidence') && !ti.replyRejected.includes('desk_handler');
    checks.k4HandlerKnows = ti.clerkKnows.includes('f.pc.completed.quest.cull_the_millpond_gnasher');
    // .176 K7: the refusal names the purse, the price, what is missing and the one purse
    await seed(53);
    n = calls.length;
    const sh = await play('p176short');
    const shortNarr = calls.slice(n).filter((c) => c.purpose === 'narrator').map((c) => (c.messages || []).map((m) => String(m.content)).join('\n')).join('\n');
    checks.k7ShortfallToNarrator = /80 cp \(8 Silver\) needed; he has 70 cp \(7 Silver\), 10 cp \(1 Silver\) short/.test(shortNarr) && /no coin needs changing/.test(shortNarr) && sh.coin === 70;
    // .177 K5: the agreement keeps its words; a second carter id settles nothing of it
    await seed(115);
    const copper = (await snapshot()).threads['thread.t34.1'];
    const debt = await play('p177debt');
    checks.k5CopperKeepsWords = !!copper && debt.threads['thread.t34.1']?.text === copper.text && !/Hesse/.test(debt.threads['thread.t34.1'].text) && !debt.errors.length;
    await seed(121);
    const carter = await play('p177carter');
    const ride = carter.threads['thread.t47.1'];
    checks.k5NoSettlementBySecondId = ride?.status === 'open' && JSON.stringify(ride.who) === JSON.stringify(['npc.npccarter_woolpack', 'pc']);
    // .177 K6a: the correction names the place he reached, and the next narrator block carries it
    checks.k6aCorrectionAtCairn = carter.at === 'loc.crossroads_cairn_on_the_south_road' && !carter.corrections.some((c) => /remains at the Woolpack/.test(c))
        && carter.corrections.some((c) => /Alaric is at crossroads cairn on the south road; continue from there/.test(c));
    n = calls.length;
    const cairn = await play('p177cairn');
    const cairnNarr = calls.slice(n).filter((c) => c.purpose === 'narrator').map((c) => (c.messages || []).map((m) => String(m.content)).join('\n')).join('\n');
    checks.k6aNarratorToldCairn = /Alaric is at crossroads cairn on the south road; continue from there/.test(cairnNarr) && !/remains at the Woolpack/.test(cairnNarr) && !cairn.errors.length;
    // .177 K8: no carter named "Alaric Red"; no role "null"
    await seed(31);
    const name = await play('p177name');
    checks.k8NoPcNameOnCarter = name.replyRejected.includes('identity_subject') && name.carterNames.length === 0 && !name.errors.length;
    await seed(21);
    const hessa = await play('p177hessa');
    checks.k8NoNullRole = Array.isArray(hessa.hessa) && !hessa.hessa.includes('null') && !hessa.errors.length;
    fs.writeFileSync(path.join(out, 'pilot01_smoke.json'), JSON.stringify(evidence, null, 2));
    return checks;
}
