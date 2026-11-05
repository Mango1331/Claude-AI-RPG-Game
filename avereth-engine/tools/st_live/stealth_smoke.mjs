// Optional real ST host acceptance of the original .154 T11, with scripted model answers.
import fs from 'node:fs';
import zlib from 'node:zlib';

const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/manual154_stealth.json.gz', import.meta.url))));
const at = f.plan.commands[1].to;
const u = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user01_stealth.json.gz', import.meta.url))));
const target = 'realm.caelreth.the_old_cairn_field_on_the_eastern_moors';
export const stealthTurns = [
    { key: 'sneak155', player: f.player, plan: f.plan,
        reply: 'Alaric slips through the hide curtain into the chamber ahead.',
        swipe: 'Alaric slips through the hide curtain into the chamber ahead. He keeps his staff close.',
        answer: { scene: at, expected: { 2: { arrived: true, at, with: null } }, deltas: [{ seq: 1, type: 'arrive', at, with: null, forced_by: null, scene: at }] } },
    { key: 'sneak155next', player: 'I look around quietly after entering.', plan: { commands: [] },
        reply: 'Alaric pauses to take in the chamber.', answer: { scene: at, expected: {}, deltas: [] } },
    { key: 'sneak156', player: u.player, plan: { commands: [{ seq: 1, type: 'journey.continue', quote: u.player, manner: { kind: 'stealth', scope: 'destination' } }] },
        reply: u.reply, swipe: u.reply + ' Alaric remains at the field.',
        answer: { ...u.answer, expected: { 1: { arrived: true, at: target, with: null } } } },
    { key: 'sneak156next', player: 'I observe the field from here.', plan: { commands: [] },
        reply: 'Alaric watches the quiet field.', answer: { scene: target, expected: {}, deltas: [] } },
];

export async function stealthSmoke({ page, send, idle, calls, driver, onReload }) {
    await page.evaluate(async prefix => {
        const c = SillyTavern.getContext();
        c.chat.splice(0, c.chat.length, ...prefix);
        await c.saveChat(); await c.reloadCurrentChat();
    }, structuredClone(f.prefix));
    onReload();
    const snapshot = () => page.evaluate(async () => {
        const { foldChat } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js').catch(() => import('/extensions/avereth-engine/src/host.js'));
        const c = SillyTavern.getContext(), folded = foldChat(c.chat), s = folded.state;
        const r = c.chat.findLast(m => !m.is_user && !m.is_system)?.extra?.avereth;
        return { errors: folded.errors, at: s.scene.at, turn: s.turn, rng: s.rng, check: s.last.check,
            present: s.scene.present, awareness: s.scene.awareness, concealed: s.scene.concealed,
            status: r?.extraction?.status, events: r?.events, display: c.chat.at(-1)?.extra?.display_text || '' };
    });
    const before = await snapshot(), n = calls.length;
    await send(f.player); await idle();
    const first = await snapshot();
    const initialCalls = calls.slice(n).map(c => c.purpose);
    const saved = await driver().verifySaved(await driver().chat(), { complete: true });
    await page.evaluate(() => document.querySelector('#chat .last_mes .swipe_right')?.click());
    await page.waitForTimeout(400); await idle();
    const swiped = await snapshot();
    await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); await SillyTavern.getContext().reloadCurrentChat(); });
    onReload();
    const reloaded = await snapshot();
    const same = x => JSON.stringify([x.at, x.turn, x.rng, x.check, x.present, x.awareness, x.concealed])
        === JSON.stringify([first.at, first.turn, first.rng, first.check, first.present, first.awareness, first.concealed]);
    const all = await driver().chat();
    const checks = {
        originalMovement: before.at !== at && first.at === at && first.status === 'applied',
        destinationPopulationChecked: first.present.length > 1 && first.check?.what === 'arrival stealth' && !first.check.automatic,
        checkVisible: /Stealth/.test(first.display),
        oneInitialChain: JSON.stringify(initialCalls) === JSON.stringify(['plan', 'narrator', 'extract']),
        savedComplete: saved && await driver().verifySaved(all, { complete: true }),
        swipeAndReloadStable: same(swiped) && same(reloaded) && !reloaded.errors.length
            && calls.slice(n).filter(c => c.purpose === 'plan').length === 1,
    };
    await send(stealthTurns[1].player); await idle();
    const next = await snapshot();
    checks.normalTurnResumed = next.turn === first.turn + 1 && next.status === 'applied' && !next.errors.length;
    await page.evaluate(async prefix => {
        const c = SillyTavern.getContext(); c.chat.splice(0, c.chat.length, ...prefix);
        await c.saveChat(); await c.reloadCurrentChat();
    }, structuredClone(u.prefix));
    onReload();
    const n2 = calls.length;
    await send(u.player); await idle();
    const continued = await snapshot();
    const saved2 = await driver().verifySaved(await driver().chat(), { complete: true });
    await page.evaluate(() => document.querySelector('#chat .last_mes .swipe_right')?.click());
    await page.waitForTimeout(400); await idle();
    const continuedSwipe = await snapshot();
    await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); await SillyTavern.getContext().reloadCurrentChat(); });
    onReload();
    const continuedReload = await snapshot();
    checks.user01Continue = continued.at === target && continued.status === 'applied' && continued.check?.at === target
        && continued.check?.what === 'arrival stealth' && continued.check?.automatic === true && !continued.errors.length;
    const tuple = x => JSON.stringify([x.at, x.turn, x.rng, x.check, x.awareness, x.concealed]);
    checks.user01Save = saved2;
    checks.user01Swipe = tuple(continued) === tuple(continuedSwipe);
    checks.user01Reload = tuple(continued) === tuple(continuedReload);
    checks.user01OnePlanner = calls.slice(n2).filter(c => c.purpose === 'plan').length === 1;
    if (!checks.user01Save || !checks.user01Swipe || !checks.user01Reload || !checks.user01OnePlanner) console.log('USER01 HOST DIAGNOSTIC', JSON.stringify({ saved2, continued, continuedSwipe, continuedReload, purposes: calls.slice(n2).map(c => c.purpose) }));
    await send(stealthTurns[3].player); await idle();
    const resumed = await snapshot();
    checks.user01NormalTurn = resumed.turn === continued.turn + 1 && resumed.status === 'applied' && !resumed.errors.length;
    return checks;
}
