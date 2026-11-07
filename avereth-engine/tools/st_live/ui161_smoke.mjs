// Real ST rendering and composer interaction, plus three scripted original semantic cases.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const fixture = name => JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(`../../tests/v4/fixtures/${name}`, import.meta.url))));
const u4 = fixture('user04_qol159.json.gz'), frames = fixture('user_qol161.json.gz');
const u2 = zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user02_157.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(JSON.parse).slice(1);
export const ui161Turns = [
    { key: 'ui161breakfast', player: u2[63].mes, plan: JSON.parse(u2[63].extra.avereth.plan.raw[0]), reply: 'Alaric ate breakfast, then walked to the Guild hall.',
        answer: { scene: 'loc.glassmere.guild_hall', expected: { 2: { arrived: true, at: 'loc.glassmere.guild_hall', with: null } }, deltas: [{ seq: 1, type: 'arrive', at: 'loc.glassmere.guild_hall', with: null, forced_by: null, scene: 'loc.glassmere.guild_hall' }] } },
    { key: 'ui161retreat', player: frames.retreat.input, plan: { commands: frames.retreat.commands }, reply: 'Alaric stepped back and cast Flame Lance at the Queen.', answer: { scene: 'here', expected: {}, deltas: [] } },
    { key: 'ui161mixed', player: frames.mixed.input, plan: { commands: frames.mixed.commands }, reply: 'Alaric searched the pool and lair but found nothing new. The corpse had already yielded its loot.', answer: { scene: 'here', expected: {}, deltas: [{ seq: 1, type: 'time', minutes: 30 }] } },
];
export async function ui161Smoke({ page, send, idle, calls, driver, onReload, out }) {
    const seed = async prefix => { await page.evaluate(async prefix => { const c = SillyTavern.getContext(); c.chat.splice(0, c.chat.length, ...prefix); await c.saveChat(); await c.reloadCurrentChat(); }, structuredClone(prefix)); onReload(); };
    const snap = () => page.evaluate(async () => {
        const { foldChat } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const c = SillyTavern.getContext(), f = foldChat(c.chat), r = c.chat.at(-1)?.extra?.avereth;
        return { state: JSON.stringify(f.state), at: f.state.scene.at, minute: f.state.clock.minute, inventory: f.state.entities.pc.sheet.inventory,
            errors: f.errors, extraction: r?.extraction?.status, events: c.chat.flatMap(m => m.extra?.avereth?.events || []), context: r?.narration?.context };
    });
    const render = async mode => {
        await page.evaluate(async mode => {
            const base = '/scripts/extensions/third-party/avereth-engine/';
            const [host, hud, cm] = await Promise.all([import(base + 'src/host.js'), import(base + 'src/hud.js'), import(base + 'src/content.js')]);
            const content = await cm.loadContentPack(async n => await (await fetch(base + 'content/' + n)).json());
            const c = SillyTavern.getContext(), s = structuredClone(host.foldChat(c.chat).state), m = c.chat.at(-1);
            let view = '';
            if (mode === 'board') {
                const b = s.last.outcome.board, ids = b.listings.slice(0, 2);
                for (const id of ids) s.quests[id].title = 'Averylongunbrokentitle'.repeat(8) + ' "quoted" <img src=x onerror="window.qol161Xss=true">';
                view = hud.renderBoardCards(s, content, b);
            } else if (mode === 'ground') {
                const { groundAccess } = await import(base + 'src/v4/features.js');
                const o = Object.values(s.objects).find(o => groundAccess(s, o).ok);
                if (!o) throw Error('Ground fixture missing');
                o.qty = 3; s.objects['obj.same_name'] = { ...structuredClone(o), id: 'obj.same_name', qty: 2 };
                view = hud.renderHud(s, content, 'open');
            } else {
                const id = 'npc.layout_observer';
                s.entities[id] = { id, name: 'An exceptionally long named observer of this ongoing fight', kind: 'npc', status: 'alive' };
                s.scene.present.push(id); s.scene.positions[id] = { band: 'SHORT', cover: 'partial' }; s.scene.awareness[id] = 'suspicious';
                view = hud.renderHud(s, content);
            }
            host.showPanel(m, '', view, { playerFacing: true }); await c.saveChat(); await c.reloadCurrentChat();
        }, mode); onReload();
    };
    const checks = {};
    const checkpoint = () => fs.writeFileSync(path.join(out, 'ui161_checks.json'), JSON.stringify(checks, null, 2));
    await seed(u4.chat.slice(0, 73)); await render('board');
    const before = await snap(), count = calls.length;
    const button = page.locator('#chat .last_mes button[data-avereth-draft]').first();
    checks.boardButtonsSurviveST = await button.count() === 1;
    await page.evaluate(async () => {
        const { installDraftActions } = await import('/scripts/extensions/third-party/avereth-engine/src/ui_actions.js');
        installDraftActions(document); installDraftActions(document);
        const field = document.getElementById('send_textarea'); field.value = 'Keep my existing draft.';
        window.qol161Inputs = 0; field.addEventListener('input', () => window.qol161Inputs++);
    });
    const draft = await button.getAttribute('data-avereth-draft'); await button.click(); await button.click();
    const composer = await page.locator('#send_textarea').inputValue(), after = await snap();
    checks.composerPreservesAndAppends = composer === `Keep my existing draft.\n${draft}`;
    checks.oneHandlerAndNoDuplicate = await page.evaluate(() => window.qol161Inputs === 1);
    checks.noSendNoBooking = calls.length === count && before.state === after.state;
    checks.escapedMarkupInDraft = composer.includes('<img') && !await page.locator('#chat .last_mes img[src="x"]').count() && !await page.evaluate(() => !!window.qol161Xss);
    await page.locator('#send_textarea').fill('My edited request.');
    checks.editableBeforeSending = await page.locator('#send_textarea').inputValue() === 'My edited request.' && calls.length === count;
    await page.locator('#send_textarea').fill('');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('#chat .last_mes .mes_text').evaluate(el => { el.style.width = '320px'; el.style.maxWidth = '320px'; });
    checks.narrowBoardInWideWindow = await page.locator('#chat .last_mes :is(.avereth-board,.custom-avereth-board)').evaluate(el => el.scrollWidth <= el.clientWidth + 2);
    await page.locator('#chat .last_mes :is(.avereth-board-card,.custom-avereth-board-card)').first().screenshot({ path: path.join(out, 'qol161-board-narrow.png') });
    // Re-rendered messages need no per-button rebinding.
    await render('board'); const rerenderBefore = await snap(), rerenderCalls = calls.length;
    await page.locator('#chat .last_mes button[data-avereth-draft]').first().click();
    checks.rerenderDelegation = !!await page.locator('#send_textarea').inputValue() && (await snap()).state === rerenderBefore.state && calls.length === rerenderCalls;
    checkpoint();
    await page.locator('#send_textarea').fill('');
    await seed(u4.chat.slice(0, 38)); await render('ground');
    const groundBefore = await snap(), groundCalls = calls.length;
    const ground = page.locator('#chat .last_mes :is(.avereth-ground-item,.custom-avereth-ground-item)');
    checks.individualGroundQuantities = await ground.count() === 2 && /×3/.test(await ground.first().innerText()) && /×2/.test(await ground.last().innerText());
    await ground.last().locator('button[data-avereth-draft]').click();
    checks.groundDraftOnly = /obj.same_name/.test(await page.locator('#send_textarea').inputValue()) && groundBefore.state === (await snap()).state && calls.length === groundCalls;
    await page.locator('#send_textarea').fill(''); await page.setViewportSize({ width: 390, height: 844 });
    checks.narrowGroundFits = await ground.last().evaluate(el => el.scrollWidth <= el.clientWidth + 2);
    await page.locator('#chat .last_mes :is(.avereth-ground,.custom-avereth-ground)').screenshot({ path: path.join(out, 'qol161-ground-narrow.png') });
    checkpoint();
    await page.setViewportSize({ width: 1280, height: 900 }); await seed(u4.chat.slice(0, 20)); await render('combat');
    const combat = page.locator('#chat .last_mes :is(.avereth-combat-hud,.custom-avereth-combat-hud)');
    checks.oneCombatViewAndOtherActors = await combat.count() === 1 && /Visible · not in the fight yet/.test(await combat.innerText());
    checks.firstStrikeHelpPresent = /First Strike explained/.test(await combat.innerText());
    await page.locator('#chat .last_mes .mes_text').evaluate(el => { el.style.width = '320px'; el.style.maxWidth = '320px'; });
    checks.containerCombatFits = await combat.evaluate(el => el.scrollWidth <= el.clientWidth + 2);
    await combat.screenshot({ path: path.join(out, 'qol161-combat-narrow.png') });
    checkpoint();
    for (const [key, prefix] of [['breakfast', u2.slice(0, 63)], ['retreat', frames.retreat.prefix], ['mixed', frames.mixed.prefix]]) {
        await seed(prefix);
        const t = ui161Turns.find(t => t.key === `ui161${key}`), old = await snap(); await send(t.player); await idle(); const current = await snap();
        checks[`${key}Applied`] = current.extraction === 'applied' && !current.errors.length;
        if (key === 'breakfast') checks.breakfastNoRestQuestion = !current.events.slice(old.events.length).some(e => e.t === 'resource.changed') && current.at === 'loc.glassmere.guild_hall';
        if (key === 'retreat') {
            const outcome = current.events.slice(old.events.length).find(e => e.t === 'outcome.recorded')?.d.outcome;
            checks.retreatOneChosenStep = outcome?.records?.some(r => r.actor === 'pc' && r.after_move?.dir === 'away' && /MEDIUM -> LONG/.test(r.after_move.change));
        }
        if (key === 'mixed') checks.mixedSearchNoExtraLoot = current.events.slice(old.events.length).some(e => e.t === 'check.recorded') && JSON.stringify(old.inventory) === JSON.stringify(current.inventory) && current.minute === old.minute + 30;
        checkpoint();
    }
    // These probes replace historical chats directly; explicitly flush and reload their final state too.
    const final = await snap();
    await page.evaluate(async () => { const c = SillyTavern.getContext(); await c.saveChat(); await c.reloadCurrentChat(); }); onReload();
    checks.savedAndReloaded = final.state === (await snap()).state && await driver().verifySaved(await driver().chat(), { complete: true });
    checkpoint();
    return checks;
}
