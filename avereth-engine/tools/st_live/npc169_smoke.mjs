// Real ST host / scripted provider (NPC E2-A, .169): User04's three integrity situations in SillyTavern, each from the
// original chat up to the player turn (tests/v4/fixtures/user04_qol159.json.gz): the return to the Guild hall (I72
// prose; met of the narrated crossbowman), the acceptance handled by the older clerk (I73/I74; handled_by of a new
// person), and GO + conditional turn-in with the clerk the original I64 prose shows by pronoun. Plus save/reload and
// the outgoing extractor request (its met/desk shapes). The provider is scripted: this proves the host path, never
// that a free extractor fills met/handled_by from natural prose.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user04_qol159.json.gz', import.meta.url))));
const HALL = 'loc.alderwatch.guild_hall', BOW = 'npc.npcbench_crossbowman', CLERKS = 'npc.npcguild_clerks';
const TITAN = 'quest.slay_the_marsh_titan_of_hollowmere', CATA = 'quest.clear_the_old_crown_catacombs_level_1';
const cmds = (i) => f.chat[i].extra.avereth.events.find((e) => e.t === 'cmd.interpreted').d.commands;
const arrive = { seq: 1, type: 'arrive', at: HALL, with: null, forced_by: null, scene: null };
const BACK = '*I head back over to the adventurers hall*';
const met72 = structuredClone(f.extractions['72']);
met72.expected['1'].met = [{ who: BOW, evidence: 'the stocky man with the crossbow sat over fresh maps again' }];
const older = { seq: 1, type: 'person.new', ref: 'older_clerk', name: null, role: 'clerk', desc: ['older man with ink-stained fingers weighing something on a small brass scale'], armed: null, present: true, relevant: true, threat: false, at: HALL, band: 'SHORT', distinct_from: null, scene: null };
export const npc169Turns = [
    { key: 'npc169met', player: BACK, plan: { commands: [{ seq: 1, type: 'go', to: HALL, quote: 'I head back over to the adventurers hall', within: null }] }, reply: f.chat[72].mes, answer: met72 },
    // .170 (GPT review of .169 §2): a departure that already happened names the clerk but shows no presence
    { key: 'npc170left', player: '*I walk over to the Guild hall once more*', plan: { commands: [{ seq: 1, type: 'go', to: HALL, quote: 'I walk over to the Guild hall once more', within: null }] },
        reply: 'He walked into the Guild hall. The clerk had left the Guild hall before Alaric arrived. At the benches the stocky man with the crossbow sat over fresh maps again.',
        answer: { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: [{ who: CLERKS, evidence: 'The clerk had left the Guild hall before Alaric arrived' }, { who: BOW, evidence: 'the stocky man with the crossbow sat over fresh maps again' }] } }, deltas: [arrive] } },
    // .171 (GPT review of .170 §3): shown at the counter, then gone before he came; the quote is only the first half
    { key: 'npc171stoodleft', player: '*I go to the Guild hall one more time*', plan: { commands: [{ seq: 1, type: 'go', to: HALL, quote: 'I go to the Guild hall one more time', within: null }] },
        reply: 'He walked into the Guild hall. The clerk stood behind the counter and left before Alaric arrived. At the benches the stocky man with the crossbow sat over fresh maps again.',
        answer: { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: [{ who: CLERKS, evidence: 'The clerk stood behind the counter' }, { who: BOW, evidence: 'the stocky man with the crossbow sat over fresh maps again' }] } }, deltas: [arrive] } },
    { key: 'npc169accept', player: f.chat[73].mes, plan: { commands: cmds(73) }, reply: f.chat[74].mes,
        answer: { scene: HALL, expected: { 1: { handled_by: { who: 'older_clerk', evidence: 'The older clerk took it, read the client line, then looked up at Alaric over the top of the slip' } } }, deltas: [older] } },
    { key: 'npc169turnin', player: f.chat[63].mes, plan: { commands: cmds(63) }, reply: f.chat[64].mes,
        answer: { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: null }, 2: { handled_by: { who: CLERKS, evidence: 'she said, and took the slip' } } }, deltas: [arrive, { seq: 2, type: 'enter', who: CLERKS, evidence: null, scene: null }] } },
];
const allText = (request) => (request?.messages || []).map((m) => String(m.content)).join('\n');

export async function npc169Smoke({ page, send, idle, calls, onReload, out }) {
    const seed = async (end) => {
        await page.evaluate(async (prefix) => { const c = SillyTavern.getContext(); c.chat.splice(0, c.chat.length, ...prefix); await c.saveChat(); await c.reloadCurrentChat(); },
            structuredClone(f.chat.slice(0, end).map((m) => ({ name: m.is_user ? 'Alaric' : 'Avereth', ...m }))));
        onReload();
        await page.waitForTimeout(600);
    };
    const snapshot = () => page.evaluate(async () => {
        const { foldChat, rec } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const chat = SillyTavern.getContext().chat, folded = foldChat(chat), s = folded.state;
        const user = chat.findLast((m) => m.is_user), r = chat.at(-1)?.is_user ? null : rec(chat.at(-1));
        const outcome = rec(user)?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
        return { errors: folded.errors, present: s.scene.present, at: s.scene.at, knowledge: s.knowledge, coin: s.entities.pc.sheet.coin_cp, quests: Object.fromEntries(Object.entries(s.quests).map(([k, q]) => [k, q.status])),
            entities: Object.values(s.entities).filter((e) => e.kind === 'npc').map((e) => ({ id: e.id, traits: e.traits || '' })),
            outcome: outcome ? { known_at: outcome.known_at || null, desk: outcome.desk || null, expected_keys: outcome.expected_keys } : null,
            replyEvents: (r?.events || []).map((e) => ({ t: e.t, d: ['scene.entered', 'knowledge.gained', 'delta.rejected', 'cmd.completed', 'entity.created'].includes(e.t) ? (e.t === 'entity.created' ? { id: e.d.entity.id, traits: e.d.entity.traits } : e.d) : null })),
            extraction: r?.extraction?.status || null };
    });
    const checks = {}, evidence = [];
    const play = async (key, end) => {
        await seed(end);
        const before = await snapshot(), n = calls.length;
        await send(npc169Turns.find((t) => t.key === key).player); await idle();
        const st = await snapshot();
        const extract = calls.slice(n).filter((c) => c.purpose === 'extract');
        const narr = calls.slice(n).findLast((c) => c.purpose === 'narrator');
        evidence.push({ key, outcome: st.outcome, replyEvents: st.replyEvents.filter((e) => e.d), extractorCalls: extract.length,
            extractorExpected: allText(extract.at(-1)).split('\n').filter((l) => /^expected — /.test(l)), narratorKnownAt: allText(narr).split('\n').filter((l) => /^KNOWN AT /.test(l)) });
        return { st, before, extract, narr };
    };
    const ev = (st, t) => st.replyEvents.filter((e) => e.t === t);
    // 1. the return: the narrated crossbowman is met; the others stay out; the extractor is asked for met
    const a = await play('npc169met', 71);
    checks.metKnownAt = JSON.stringify([...(a.st.outcome?.known_at?.['1'] || [])].sort()) === JSON.stringify([CLERKS, BOW].sort());
    checks.metEntered = ev(a.st, 'scene.entered').some((e) => e.d.id === BOW) && a.st.present.includes(BOW) && !a.st.present.includes(CLERKS);
    checks.metAsked = a.extract.length === 1 && /"met": \[\{"who": id from KNOWN AT/.test(allText(a.extract[0])) && /met: for each person of KNOWN AT this reply shows present/.test(allText(a.extract[0]));
    checks.metNarratorKnownAtUnchanged = /^KNOWN AT Adventurers' Guild hall, Alderwatch \(met there before;/m.test(allText(a.narr)) && !/ARRIVING AT/.test(allText(a.narr));
    checks.metApplied = !a.st.errors.length && a.st.extraction === 'applied' && a.st.coin === a.before.coin;
    await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); await SillyTavern.getContext().reloadCurrentChat(); });
    onReload(); await page.waitForTimeout(800);
    const re = await snapshot();
    checks.reloadKeepsPresence = !re.errors.length && JSON.stringify(re.present) === JSON.stringify(a.st.present);
    // 1b. .170: the clerk who had left stays out (met_evidence), the crossbowman at his maps is met
    const l = await play('npc170left', 71);
    checks.leftNotEntered = !ev(l.st, 'scene.entered').some((e) => e.d.id === CLERKS) && !l.st.present.includes(CLERKS)
        && ev(l.st, 'delta.rejected').some((e) => e.d.rule === 'met_evidence' && e.d.item?.met?.who === CLERKS);
    checks.leftOtherMet = ev(l.st, 'scene.entered').some((e) => e.d.id === BOW) && !l.st.errors.length && l.st.extraction === 'applied' && l.extract.length === 1;
    // 1c. .171: the clerk shown, then gone before he came (short quote) stays out; the crossbowman is met
    const sl = await play('npc171stoodleft', 71);
    checks.stoodLeftNotEntered = !ev(sl.st, 'scene.entered').some((e) => e.d.id === CLERKS) && !sl.st.present.includes(CLERKS)
        && ev(sl.st, 'delta.rejected').some((e) => e.d.rule === 'met_evidence' && e.d.item?.met?.who === CLERKS);
    checks.stoodLeftOtherMet = ev(sl.st, 'scene.entered').some((e) => e.d.id === BOW) && !sl.st.errors.length && sl.st.extraction === 'applied' && sl.extract.length === 1;
    // 2. I73/I74: the older clerk is a new person who knows the acceptance; the wiry woman stays the bystander
    const b = await play('npc169accept', 73);
    const made = ev(b.st, 'entity.created').map((e) => e.d).find((e) => /older man/.test(e.traits || ''));
    checks.acceptDesk = JSON.stringify(b.st.outcome?.desk) === JSON.stringify({ 1: { quest: TITAN, kind: 'accept' } }) && b.st.outcome?.expected_keys?.['1'] === 'desk';
    checks.acceptNewClerk = !!made && made.id !== CLERKS && !ev(b.st, 'scene.entered').some((e) => e.d.id === CLERKS);
    checks.acceptHandlerKnows = ev(b.st, 'knowledge.gained').filter((e) => e.d.about === `f.pc.accepted.${TITAN}`).map((e) => e.d.who).join() === made?.id;
    checks.acceptNoBooking = b.st.quests[TITAN] === 'active' && b.st.coin === b.before.coin && !b.st.errors.length && b.st.extraction === 'applied';
    checks.acceptAskedDesk = /handled_by: the Guild person|"handled_by":/.test(allText(b.extract.at(-1))) && b.extract.length === 1;
    // 3. I63/I64: GO + conditional turn-in; the pronoun handler learns the completion after its cmd.completed
    const c = await play('npc169turnin', 63);
    const done = c.st.replyEvents.findIndex((e) => e.t === 'cmd.completed' && e.d.seq === 2 && e.d.ok);
    const knew = c.st.replyEvents.findIndex((e) => e.t === 'knowledge.gained' && e.d.who === CLERKS && e.d.about === `f.pc.completed.${CATA}`);
    checks.turnInDesk = JSON.stringify(c.st.outcome?.desk) === JSON.stringify({ 2: { quest: CATA, kind: 'turn_in' } });
    checks.turnInHandlerKnows = done >= 0 && knew > done && c.st.quests[CATA] === 'completed';
    checks.turnInApplied = !c.st.errors.length && c.st.extraction === 'applied' && c.extract.length === 1;
    fs.writeFileSync(path.join(out, 'npc169_requests.json'), JSON.stringify(evidence, null, 2));
    return checks;
}
