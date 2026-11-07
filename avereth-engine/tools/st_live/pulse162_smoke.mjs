// Real ST host / scripted provider (PULSE package A, .162): the window on the host path. Checks the record, the
// outgoing narrator request (one THE ROAD line for a leg, no line for a quiet scene, the envelope's standing rule), a
// # command without a draw, save/reload of the streak, and the firewall on an invented ambush by a newcomer. The provider
// is scripted: this proves the host path, never that a free narrator model tells a concrete PULSE event.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user04_qol159.json.gz', import.meta.url))));
const commands = (i) => f.chat[i].extra.avereth.ir.acts.map(({ act, source, ...c }) => ({ ...c, type: act }));
const ROAD = /^THE ROAD — /;
const PULSE = /^(THE ROAD — |PULSE \(|STILL HERE \(PULSE\))/;
export const pulse162Turns = [
    { key: 'pulse162travel', player: f.chat[75].mes, plan: { commands: commands(75) },
        reply: 'He left the hall and took the east road out past the last hedgerows toward the peat cuttings.', answer: { scene: 'here', expected: {}, deltas: [] } },
    { key: 'pulse162hall', player: 'I look around the hall and listen to the room for a while.', plan: { commands: [] },
        reply: 'The hall murmured on: quills, low talk at the benches, the clerk sorting slips.', answer: { scene: 'here', expected: {}, deltas: [] } },
    { key: 'pulse162ambush', player: 'I lean on the counter and wait for the clerk to look up.', plan: { commands: [] },
        reply: 'A stranger with a cudgel shoves through the door and attacks Alaric without a word.',
        answer: { scene: 'here', expected: {}, deltas: [
            { seq: 1, type: 'person.new', ref: 'cudgel stranger', name: null, role: 'thug', desc: ['stranger with a cudgel'], present: true, relevant: true, threat: true, at: null, band: 'SHORT' },
            { seq: 2, type: 'hostile', by: ['cudgel stranger'], scope: 'all', evidence: 'attacks Alaric without a word' },
        ] } },
];
const engineBlock = (request) => String(request?.messages?.find((m) => String(m.content).startsWith('[AVERETH ENGINE'))?.content || '');
const chars = (request) => (request?.messages || []).reduce((n, m) => n + String(m.content || '').length, 0);

export async function pulse162Smoke({ page, send, idle, calls, driver, onReload, out }) {
    const seed = async (end) => {
        await page.evaluate(async (prefix) => { const c = SillyTavern.getContext(); c.chat.splice(0, c.chat.length, ...prefix); await c.saveChat(); await c.reloadCurrentChat(); }, structuredClone(f.chat.slice(0, end)));
        onReload();
        await page.waitForTimeout(600);
    };
    const snapshot = () => page.evaluate(async () => {
        const { foldChat, rec } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const chat = SillyTavern.getContext().chat, folded = foldChat(chat), s = folded.state;
        const user = chat.findLast((m) => m.is_user), r = rec(user);
        const outcome = r?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
        const reply = chat.at(-1)?.is_user ? null : rec(chat.at(-1));
        return { errors: folded.errors, pulse: s.pulse || null, auth: outcome?.auth?.pulse || null, road: outcome?.auth?.road ?? null,
            rolled: (r?.events || []).filter((e) => e.t === 'pulse.rolled').length, extra: outcome?.extra || [], encounter: !!s.encounter,
            pending: (s.pending_combat || []).length, rejected: (reply?.events || []).filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule),
            outcome: (reply?.events || []).find((e) => e.t === 'pulse.outcome')?.d || null, corrections: reply?.corrections || [], extraction: reply?.extraction?.status };
    });
    const checks = {}, evidence = [];
    const turnOf = async (key, end) => {
        await seed(end);
        const n = calls.length;
        const t = pulse162Turns.find((x) => x.key === key);
        await send(t.player); await idle();
        const state = await snapshot();
        const request = calls.slice(n).findLast((c) => c.purpose === 'narrator');
        const block = engineBlock(request);
        evidence.push({ key, auth: state.auth, road: state.road, narrator_request_chars: chars(request), engine_block_chars: block.length,
            pulse_lines: block.split('\n').filter((l) => PULSE.test(l)), envelope_rule: block.split('\n').filter((l) => /Nobody new in this reply|Someone new in this reply/.test(l)) });
        return { state, block };
    };
    // 1. a leg out of Alderwatch (User04 I75): the one window, one THE ROAD line, Patch 5's open text gone
    const travel = await turnOf('pulse162travel', 75);
    checks.travelWindowRecorded = travel.state.auth?.exposure === 'travel' && travel.state.rolled === (travel.state.auth?.rolled ? 1 : 0);
    checks.travelOneRoadLine = travel.block.split('\n').filter((l) => ROAD.test(l)).length === 1 && !/may \(not must\)/.test(travel.block);
    checks.travelRoadFollowsWindow = travel.state.road === (travel.state.auth?.open && travel.state.auth?.kind === 'danger' ? 'open' : 'quiet');
    checks.travelEnvelopeRule = /(Nobody|Someone) new in this reply/.test(travel.block);
    // 2. a quiet look around the hall (inside): a roll, at most one PULSE line, none when closed
    const hall = await turnOf('pulse162hall', 65);
    const lines = hall.block.split('\n').filter((l) => PULSE.test(l));
    checks.hallRolled = hall.state.auth?.rolled === true && hall.state.auth?.frame === 'inside' && hall.state.rolled === 1;
    checks.hallLineOnlyIfOpen = hall.state.auth?.open ? lines.length === 1 : lines.length === 0;
    checks.hallHostApplied = !hall.state.errors.length && hall.state.extraction === 'applied';
    // 3. a # command between: no draw, the streak as it was; reload keeps it
    const before = hall.state.pulse;
    await send('#status'); await idle();
    const status = await snapshot();
    checks.statusNoDraw = JSON.stringify(status.pulse) === JSON.stringify(before);
    await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); await SillyTavern.getContext().reloadCurrentChat(); });
    onReload(); await page.waitForTimeout(800);
    const reloaded = await snapshot();
    checks.reloadKeepsStreak = JSON.stringify(reloaded.pulse) === JSON.stringify(before) && !reloaded.errors.length;
    // 4. an invented ambush by a newcomer in the hall (inside never has DANGER): refused, no fight, a correction
    const ambush = await turnOf('pulse162ambush', 65);
    checks.ambushRefused = ambush.state.rejected.includes('pulse') && !ambush.state.encounter && ambush.state.pending === 0;
    checks.ambushCorrection = ambush.state.corrections.some((c) => /no new attacker was authorized/.test(c));
    checks.ambushDiagnosis = ambush.state.outcome?.persisted?.rejected_pulse >= 1;
    checks.saved = await driver().verifySaved(await driver().chat(), { complete: true });
    fs.writeFileSync(path.join(out, 'pulse162_requests.json'), JSON.stringify(evidence, null, 2));
    return checks;
}
