// Real ST host / scripted provider (PULSE package C, .164): a rest cut short on the host path. A camp by the flood line
// (User04, out in the land) with a forced DANGER window: the record books only the minutes before the cut and their
// recovery, the danger group may attack, reload keeps it. A second camp whose reply shows no cause: the reply gets the
// correction, a swipe reuses the record, the next request carries the fact line once. A night in the Guild hall (a safe
// lodging) with the same forced danger: booked in full, never cut. Split one-minute waits: one draw. The provider is
// scripted: this proves the host path, never that a free narrator model tells the cause.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { foldChat } from '../../src/host.js';
import { recoveryEvents } from '../../src/v4/commands.js';
import { loadProductContent } from '../../tests/helpers.js';

const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user04_qol159.json.gz', import.meta.url))));
const SLEEP = (quote) => ({ commands: [{ seq: 1, type: 'activity', kind: 'sleep', what: null, minutes: 480, until: null, quote }] });
const WAIT = (quote) => ({ commands: [{ seq: 1, type: 'activity', kind: 'wait', what: null, minutes: 1, until: null, quote }] });
// rules.pulse.force entries of the installed copy (run_c.mjs): exactly these messages get a forced DANGER window
export const PULSE164_FORCE = ['I make camp here by the flood line', 'I bed down by the flood line', 'I find a bench in the hall'].map((when) => ({ open: true, kind: 'danger', when }));
export const pulse164Turns = [
    { key: 'pulse164camp', player: 'I make camp here by the flood line and sleep for eight hours.', plan: SLEEP('I make camp here by the flood line and sleep for eight hours'),
        reply: 'Near midnight steel scrapes on stone: three marsh bandits draw blades and attack him at the edge of his camp.',
        answer: { scene: 'here', expected: {}, deltas: [
            { seq: 1, type: 'person.new', ref: 'marsh bandits', name: null, role: 'bandit', desc: ['marsh bandit with a blade'], present: true, relevant: true, threat: true, at: null, band: 'SHORT' },
            { seq: 2, type: 'hostile', by: ['marsh bandits'], scope: 'all', evidence: 'draw blades and attack him' },
            // .165 (review of .164, P2): the extractor reports the full planned night; the cut stands
            { seq: 3, type: 'time', minutes: 480 },
        ] } },
    { key: 'pulse164quiet', player: 'I bed down by the flood line and sleep for eight hours.', plan: SLEEP('I bed down by the flood line and sleep for eight hours'),
        reply: 'He sleeps by the flood line and wakes stiff in the grey light.', swipe: 'He sleeps on through the cold hours by the water.', answer: { scene: 'here', expected: {}, deltas: [] } },
    { key: 'pulse164after', player: 'I get up and look around the camp.', plan: { commands: [] },
        reply: 'Grey water, flattened reeds, the ashes of his fire.', answer: { scene: 'here', expected: {}, deltas: [] } },
    { key: 'pulse164inn', player: 'I find a bench in the hall and sleep for eight hours.', plan: SLEEP('I find a bench in the hall and sleep for eight hours'),
        reply: 'He sleeps on the bench in the quiet hall.', answer: { scene: 'here', expected: {}, deltas: [] } },
    ...[1, 2, 3].map((n) => ({ key: `pulse164wait${n}`, player: `I wait a minute and listen (${n}).`, plan: WAIT(`I wait a minute and listen (${n})`),
        reply: 'Wind in the reeds.', answer: { scene: 'here', expected: {}, deltas: [] } })),
];
const engineBlock = (request) => String(request?.messages?.find((m) => String(m.content).startsWith('[AVERETH ENGINE'))?.content || '');
const turnOf = (key) => pulse164Turns.find((x) => x.key === key);

export async function pulse164Smoke({ page, send, idle, calls, driver, onReload, out }) {
    const content = await loadProductContent();
    // the camp's precondition, stated: the record before it gets him wounded and twelve hours on (a night camp), as
    // engine events at the end of the last stored record (the fold reads them as any other)
    const nightCamp = (prefix) => {
        const r = prefix.findLast((m) => m.extra?.avereth?.events)?.extra.avereth;
        r.events.push({ t: 'time.advanced', d: { minutes: 720, why: 'smoke: a night camp' } },
            ...[['hp', 30], ['mp', 20], ['sta', 15]].map(([resource, value]) => ({ t: 'resource.changed', d: { id: 'pc', resource, value, why: 'smoke: wounded' } })));
        return prefix;
    };
    const seed = async (end, night = false) => {
        const prefix = structuredClone(f.chat.slice(0, end));
        await page.evaluate(async (prefix) => { const c = SillyTavern.getContext(); c.chat.splice(0, c.chat.length, ...prefix); await c.saveChat(); await c.reloadCurrentChat(); }, night ? nightCamp(prefix) : prefix);
        onReload();
        await page.waitForTimeout(600);
    };
    const chat = () => page.evaluate(() => structuredClone(SillyTavern.getContext().chat));
    const ev = (m) => m?.extra?.avereth?.events || [];
    const snapshot = async () => {
        const c = await chat();
        const folded = foldChat(c), s = folded.state;
        const u = c.findLastIndex((m) => m.is_user), user = c[u];
        const outcome = ev(user).findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
        const reply = c.at(-1)?.is_user ? null : c.at(-1)?.extra?.avereth;
        return { chat: c, u, before: foldChat(c.slice(0, u)).state, state: s, errors: folded.errors, auth: outcome?.auth?.pulse || null,
            events: ev(user), rolled: ev(user).filter((e) => e.t === 'pulse.rolled').length,
            minutes: ev(user).filter((e) => e.t === 'time.advanced').reduce((a, e) => a + e.d.minutes, 0),
            gains: Object.fromEntries(ev(user).filter((e) => e.t === 'resource.changed' && e.d.id === 'pc').map((e) => [e.d.resource, e.d.value])),
            corrections: reply?.corrections || [], extraction: reply?.extraction?.status,
            replyMinutes: (reply?.events || []).filter((e) => e.t === 'time.advanced').reduce((a, e) => a + e.d.minutes, 0),
            replyRejected: (reply?.events || []).filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule), encounter: !!s.encounter, pending: (s.pending_combat || []).length };
    };
    const checks = {}, evidence = [];
    const play = async (key) => {
        const n = calls.length;
        await send(turnOf(key).player); await idle();
        const state = await snapshot();
        const request = calls.slice(n).findLast((c) => c.purpose === 'narrator');
        const block = engineBlock(request);
        evidence.push({ key, auth: state.auth, minutes: state.minutes, gains: state.gains, corrections: state.corrections,
            lines: block.split('\n').filter((l) => /REST INTERRUPTED|REST CUT SHORT|CUT SHORT by the engine|PULSE \(|NOT DONE/.test(l)) });
        return { state, block };
    };
    const recovered = (st, m) => Object.fromEntries(recoveryEvents(st.before, content, m, 'sleep').events.map((e) => [e.d.resource, e.d.value]));
    // 1. a camp out in the land, forced DANGER: cut short, only those minutes and their recovery, the group may attack
    await seed(79, true);
    const camp = await play('pulse164camp');
    const x = camp.state.auth?.interrupt;
    checks.campExposed = camp.state.auth?.safety === 'exposed' && camp.state.auth?.exposure === 'pause' && camp.state.rolled === 1 && camp.state.auth?.phase === 'night';
    checks.campCut = !!x && !x.at_end && x.after_min >= 15 && x.after_min <= 465 && camp.state.minutes === x.after_min;
    // only the booked minutes' recovery, less than the full night's (he is wounded)
    checks.campRecoveryOfBookedMinutes = !!x && Object.keys(camp.state.gains).length > 0 && JSON.stringify(camp.state.gains) === JSON.stringify(recovered(camp.state, x.after_min))
        && (camp.state.gains.hp ?? 0) < (recovered(camp.state, 480).hp ?? 0);
    checks.campEventBeforeTime = camp.state.events.findIndex((e) => e.t === 'pulse.rolled') < camp.state.events.findIndex((e) => e.t === 'time.advanced');
    checks.campRequestCause = /CUT SHORT by the engine after \d+ of the 480 minutes/.test(camp.block) && /REST INTERRUPTED \(the engine's; [a-z]+, out in the land\) — at .*ONE group of this land's people or creatures comes upon him/.test(camp.block)
        && /what he does now is his decision/.test(camp.block) && /Someone new in this reply attacks Alaric only as the ONE hostile group/.test(camp.block);
    checks.campFightOpened = camp.state.encounter || camp.state.pending > 0;
    // .165: the reply's time of the full night books none of the minutes the cut took away
    checks.campReplyTimeNoRest = !!x && camp.state.replyMinutes === 0 && camp.state.replyRejected.includes('rest_cut')
        && camp.state.state.clock.minute === camp.state.before.clock.minute + x.after_min;
    checks.campNoCorrection = !camp.state.corrections.some((c) => /did not show what/.test(c));
    // reload: the same minutes, the same recovery, the same clock and sheet from the stored events
    const beforeReload = { clock: camp.state.state.clock.minute, sheet: camp.state.state.entities.pc.sheet, pulse: camp.state.state.pulse };
    await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); await SillyTavern.getContext().reloadCurrentChat(); });
    onReload(); await page.waitForTimeout(800);
    const reloaded = await snapshot();
    checks.campReloadSame = !reloaded.errors.length && JSON.stringify({ clock: reloaded.state.clock.minute, sheet: reloaded.state.entities.pc.sheet, pulse: reloaded.state.pulse }) === JSON.stringify(beforeReload);
    // 2. a camp whose reply shows no cause: the correction; a swipe reuses the record; the next request: the fact once
    await seed(79, true);
    const quiet = await play('pulse164quiet');
    const q = quiet.state.auth?.interrupt;
    checks.quietCut = !!q && quiet.state.minutes === q.after_min;
    checks.quietCorrection = quiet.state.corrections.some((c) => c.startsWith("REST INTERRUPTED (the engine's, last turn): the last reply did not show what cut his sleep short") && /bring in no new attacker or fight/.test(c));
    const plansBefore = calls.filter((c) => c.purpose === 'plan').length;
    const recordBefore = JSON.stringify(quiet.state.events);
    await page.evaluate(() => { document.querySelector('#chat .last_mes .swipe_right')?.click(); });
    await page.waitForTimeout(400); await idle();
    const swiped = await snapshot();
    checks.swipeReusesRecord = JSON.stringify(swiped.events) === recordBefore && calls.filter((c) => c.purpose === 'plan').length === plansBefore
        && swiped.state.clock.minute === quiet.state.state.clock.minute && JSON.stringify(swiped.state.entities.pc.sheet) === JSON.stringify(quiet.state.state.entities.pc.sheet);
    const after = await play('pulse164after');
    checks.nextFactLineOnce = (after.block.match(/REST CUT SHORT \(the engine's, last turn\)/g) || []).length === 1 && after.block.includes(`after ${q?.after_min} of 480 min of his sleep`);
    checks.nextCorrectionCarried = (after.block.match(/did not show what cut his sleep short/g) || []).length === 1;
    // 3. the Guild hall (a safe lodging), the same forced DANGER: no hostile kind, booked in full, never cut
    await seed(65);
    const inn = await play('pulse164inn');
    checks.innSafe = inn.state.auth?.safety === 'safe' && !inn.state.auth?.interrupt && !['danger', 'obstacle', 'trouble'].includes(inn.state.auth?.kind);
    checks.innFullNight = inn.state.minutes === 480 && JSON.stringify(inn.state.gains) === JSON.stringify(recovered(inn.state, 480));
    checks.innNoCut = !/REST INTERRUPTED|CUT SHORT/.test(inn.block);
    // 4. one-minute waits out in the land: one draw for the block
    await seed(79);
    const waits = [];
    for (const n of [1, 2, 3]) waits.push((await play(`pulse164wait${n}`)).state);
    checks.splitWaitOneDraw = waits.map((w) => w.rolled).join() === '1,0,0' && waits.slice(1).every((w) => w.auth?.reason === 'pause_block');
    checks.saved = await driver().verifySaved(await driver().chat(), { complete: true });
    fs.writeFileSync(path.join(out, 'pulse164_requests.json'), JSON.stringify(evidence, null, 2));
    return checks;
}
