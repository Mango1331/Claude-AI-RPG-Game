// Native ST 1.19 UI and real on-disk readbacks with a loopback scripted provider.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { Driver, loadPlaywright } from './live/driver.mjs';
import { createInstance, writeConfig, seedProfile } from './live/profile.mjs';
import { startServer } from './live/server.mjs';
import { startStub, STUB_MODEL } from './live/stub_provider.mjs';
import { handoverCase, checkHandover } from './live/revision_handover.mjs';

const st = process.env.AVERETH_ST_DIR;
assert(st, 'Set AVERETH_ST_DIR to the pinned SillyTavern checkout.');
assert.equal(
    execFileSync('git', ['-C', st, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    '7e8663cd9c184a550b37238218bdd32c6efc68e9'
);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-revision-check-'));
const file = (name) => path.join(dir, name);
console.log('Artifacts:', dir);
const instance = createInstance({ runId: 'revision', runDir: dir, base: dir });
const port = Number(process.env.AVERETH_REVISION_ST_PORT || 18314);
writeConfig(instance, port);
// This original prefix contains a registered mage, clerk, inventory, money and an accepted quest.
const fixture = JSON.parse(
    gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user05_202.json.gz', import.meta.url)))
);
const prefix = fixture.prefixes[23].slice(0, 15);
const input = 'I walk to a quiet courtyard here in Glassmere.';
const follow = 'I look around and wait to hear what the courier says.';
const scenes = [
    ['Amber Courtyard', 'Mira', 'bronze seal'],
    ['Indigo Courtyard', 'Tavi', 'blue spool'],
    ['Silver Courtyard', 'Edra', 'pewter button'],
    ['Slate Courtyard', 'Ossa', 'slate counter'],
];
const prose = ([where, who, what]) =>
    `Alaric reaches ${where}. A courier steps forward. "I am ${who}," the courier says, pointing to a ${what} on the paving stones. "Someone left this here."`;
const records = [],
    evidence = { checks: {}, stages: {}, events: [], requests: [] };
let next = 0,
    block = null;
const gate = () => {
    let open, enter;
    return {
        held: new Promise((r) => (enter = r)),
        wait: new Promise((r) => (open = r)),
        open: () => open(),
        enter: () => enter(),
    };
};
function waitForHold(gate, label) {
    return Promise.race([
        gate.held,
        sleep(25000, undefined, { ref: false }).then(() => {
            throw new Error('Timed out before observing held ' + label);
        }),
    ]);
}
function decodeLastSavedMessage(route) {
    const req = route.request();
    const bytes = req.postDataBuffer();
    const body = JSON.parse(req.headers()['content-encoding'] === 'gzip' ? gunzipSync(bytes) : bytes);
    return body.chat?.at(-1);
}
let handover;
const mock = await startStub({
    respond: async ({ role, messages }) => {
        const text = messages.at(-1).content;
        records.push({ role, messages: structuredClone(messages) });
        if (handover) return handover.respond(role, messages);
        if (role === 'plan')
            return JSON.stringify({
                commands: text.includes('PLAYER MESSAGE:\n' + input)
                    ? [{ seq: 1, type: 'go', to: { new: 'a quiet courtyard' }, quote: input }]
                    : [],
            });
        if (role === 'narrator') return next === null ? 'The courier waits for Alaric to speak.' : prose(scenes[next]);
        assert.equal(role, 'extract');
        const target = scenes.find((s) => text.includes(prose(s)));
        if (block) {
            const own = block;
            block = null;
            own.enter();
            await own.wait;
        }
        if (!target) return JSON.stringify({ scene: 'here', expected: {}, deltas: [] });
        const [where, who, what] = target,
            at = { new: { name: where, kind: 'site', parent: 'loc.glassmere' } };
        return JSON.stringify({
            scene: at,
            expected: { 1: { arrived: true, at, with: null } },
            deltas: [
                { seq: 1, type: 'arrive', at },
                {
                    seq: 2,
                    type: 'person.new',
                    ref: 'courier',
                    name: who,
                    role: 'courier',
                    desc: ['local courier'],
                    present: true,
                    relevant: true,
                    at,
                    band: 'SHORT',
                },
                { seq: 3, type: 'object.new', name: what, kind: 'item', qty: 1, holder: 'here' },
            ],
        });
    },
});
const report = () => fs.writeFileSync(file('revision.json'), JSON.stringify(evidence, null, 2));
const check = (k, v) => {
    evidence.checks[k] = Boolean(v);
    console.log(evidence.checks[k] ? 'OK' : 'FAIL', k);
    report();
};
let browser, server, page, dr;
async function seed(chat) {
    await page.evaluate(async (prefix) => {
        const c = SillyTavern.getContext();
        c.chat.splice(0, c.chat.length, ...prefix);
        delete c.chatMetadata.pending_action_input;
        await c.saveChat();
        await c.reloadCurrentChat();
    }, chat);
    dr.testChat = await dr.identity();
}
async function idle() {
    await page.waitForFunction(
        () => {
            const c = SillyTavern.getContext();
            return (
                !document.querySelector('#mes_stop')?.checkVisibility() &&
                c.chat.at(-1)?.extra?.avereth?.extraction?.status !== 'pending'
            );
        },
        {},
        { timeout: 20000 }
    );
    await sleep(400);
}
async function snapshot(key) {
    const s = await page.evaluate(async () => {
        const base = '/scripts/extensions/third-party/avereth-engine/';
        const { foldChat } = await import(base + 'src/host.js');
        const c = SillyTavern.getContext(),
            fold = foldChat(c.chat),
            w = fold.state,
            m = c.chat.at(-1);
        const { characterRows, worldRows } = await import(base + 'src/hud.js');
        const { loadContentPack } = await import(base + 'src/content.js');
        const content = await loadContentPack(async (f) => (await fetch(base + 'content/' + f)).json());
        const expected = Object.fromEntries([...characterRows(w, content), ...worldRows(w, content)]);
        const selector = 'details.avereth-hud,details.custom-avereth-hud';
        const dom = [...document.querySelectorAll('#chat .mes')].reverse().find((m) => m.querySelector(selector));
        const panels = [...(dom?.querySelectorAll(selector) || [])];
        for (const p of panels) if (!p.open) p.querySelector('summary').click();
        const rows = Object.fromEntries(
            panels.flatMap((p) =>
                [...p.querySelectorAll('.avereth-hud-body > b,.custom-avereth-hud-body > b')].map((b) => [
                    b.innerText,
                    b.nextSibling?.textContent?.replace(/^:\s*/, '').trim(),
                ])
            )
        );
        const index = dom ? Number(dom.getAttribute('mesid')) : null;
        return {
            expected,
            rows,
            hudMessage: index,
            hudActive: index !== null && !c.chat[index].avereth_inactive,
            ground: [
                ...(dom?.querySelectorAll('.avereth-ground-item span,.custom-avereth-ground-item span') || []),
            ].map((e) => e.innerText),
            text: m.mes,
            swipe: m.swipe_id,
            events: fold.errors,
            where: w.scene.at,
            people: w.scene.present,
            objectNames: Object.values(w.objects).map((o) => o.name),
            extracted: m.extra?.avereth?.extraction?.status,
            record: m.extra?.avereth?.events?.map((e) => e.t),
            turn: w.turn,
            world: JSON.stringify(w),
            activeEvents: JSON.stringify(
                c.chat.filter((m) => !m.avereth_inactive).map((m) => m.extra?.avereth?.events || [])
            ),
        };
    });
    const started = Date.now();
    const status = await page.locator('#avereth-action-status').textContent();
    let disk = await dr.verifySaved(await dr.chat(), { complete: true });
    const initialReadback = disk;
    while (!disk && Date.now() - started < 6000) {
        await sleep(150);
        disk = await dr.verifySaved(await dr.chat(), { complete: true });
    }
    const savedMatches = await page.evaluate(async () => {
        const c = SillyTavern.getContext();
        const card = c.characters[c.characterId];
        const response = await fetch('/api/chats/get', {
            method: 'POST',
            headers: c.getRequestHeaders(),
            body: JSON.stringify({ ch_name: card.name, avatar_url: card.avatar, file_name: c.getCurrentChatId() }),
        });
        if (!response.ok) return false;
        const saved = (await response.json()).slice(1);
        const stamp = (rows) => rows.map((m) => [m.avereth_fork, m.avereth_parent, m.avereth_inactive]);
        const { foldChat } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        return (
            JSON.stringify(stamp(saved)) === JSON.stringify(stamp(c.chat)) &&
            JSON.stringify(foldChat(saved).state) === JSON.stringify(foldChat(c.chat).state)
        );
    });
    const { world, activeEvents, ...summary } = s;
    evidence.stages[key] = {
        ...summary,
        initialReadback,
        readback: disk,
        readbackMs: Date.now() - started,
        statusAtFirstRead: status,
    };
    check(key + 'Readback', disk);
    check(key + 'SavedLineageAndWorld', savedMatches);
    check(key + 'RenderedActiveHud', s.hudActive);
    if (['selectMiddle', 'extractRace'].includes(key))
        check(key + 'ConfirmationTruthful', initialReadback || status !== 'Gespeichert');
    for (const label of ['Location', 'Present', 'Carried', 'Coin', 'Quests', 'Active quests', 'Resources'])
        check(key + 'Hud' + label, s.rows[label] === s.expected[label]);
    check(key + 'Integrity', s.events.length === 0);
    return s;
}
async function changeSwipe(direction, expected) {
    await page
        .locator('#chat .last_mes .swipe_' + direction)
        .last()
        .click();
    await page.waitForFunction((target) => SillyTavern.getContext().chat.at(-1).mes.includes(target), expected, {
        timeout: 20000,
    });
    await idle();
}
async function clickEdit(id, text) {
    const mes = page.locator('#chat .mes[mesid="' + id + '"]');
    await mes.hover();
    await mes.locator('.mes_edit').click({ force: true });
    await mes.locator('textarea.edit_textarea').fill(text);
    await mes.locator('.mes_edit_done').click({ force: true });
    await page.waitForFunction(({ id, text }) => SillyTavern.getContext().chat[id].mes === text, { id, text });
    await idle();
}
try {
    const boot = await startServer({
        stDir: st,
        inst: instance,
        port,
        logFile: file('boot.log'),
        timedFile: file('boot-timed.log'),
    });
    await boot.stop();
    const preset = 'Avereth Narrator V4',
        raw = fs.readFileSync(new URL('../../presets/Avereth Narrator V4.json', import.meta.url), 'utf8');
    seedProfile(instance, {
        username: 'Alaric',
        card: { name: 'Revision mock', first_mes: prefix[0].mes },
        preset: { name: preset, text: raw },
        generation: { openai_max_tokens: 4096, openai_max_context: 32000, stream_openai: false },
        connection: { chat_completion_source: 'custom', custom_url: mock.url, custom_model: STUB_MODEL },
        source: 'custom',
    });
    server = await startServer({
        stDir: st,
        inst: instance,
        port,
        logFile: file('st.log'),
        timedFile: file('st-timed.log'),
    });
    browser = await loadPlaywright().chromium.launch({
        executablePath: process.env.AVERETH_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    dr = await Driver.create(browser, { turnTimeoutMs: 30000, quietMs: 500 });
    page = dr.page;
    assert((await dr.open(server.url)).connected);
    await dr.openCard('Revision mock');
    await seed(prefix);
    const observe = () =>
        page.evaluate(() => {
            const c = SillyTavern.getContext();
            window.revisionEvents = [];
            for (const key of [
                'MESSAGE_EDITED',
                'MESSAGE_UPDATED',
                'MESSAGE_SWIPED',
                'MESSAGE_RECEIVED',
                'CHAT_CHANGED',
            ]) {
                if (c.eventTypes[key])
                    c.eventSource.makeFirst(c.eventTypes[key], (i) =>
                        window.revisionEvents.push({
                            key,
                            i: typeof i === 'number' ? i : null,
                            time: performance.now(),
                        })
                    );
            }
        });
    await observe();
    assert((await dr.send(input)).ok, 'Initial walk did not finish');
    await idle();
    const first = await snapshot('first');
    for (let i = 0; i < 3; i++) {
        if (i) {
            next = i;
            await changeSwipe('right', scenes[i][0]);
        }
        const s = i === 0 ? first : await snapshot('swipe' + i),
            [where, who, what] = scenes[i];
        check(
            'ownedRevision' + i,
            s.expected.Location.includes(where) && s.expected.Present.includes(who) && s.ground.includes(what)
        );
        check(
            'noPreviousRevision' + i,
            !scenes
                .slice(0, i)
                .some(
                    ([a, b, c]) =>
                        s.expected.Location.includes(a) || s.expected.Present.includes(b) || s.objectNames.includes(c)
                )
        );
    }
    const alternatives = await dr.chat();
    // Hold the exact chosen-swipe write. This makes a premature "saved" label observable independently of disk speed.
    const selection = gate();
    let heldSelection = false;
    const selectionSent = gate();
    const holdSelection = async (route) => {
        const row = decodeLastSavedMessage(route);
        if (!heldSelection && row?.swipe_id === 1 && row?.mes === prose(scenes[1])) {
            heldSelection = true;
            selection.enter();
            await selection.wait;
        }
        await route.continue();
        if (row?.swipe_id === 1 && row?.mes === prose(scenes[1])) selectionSent.enter();
    };
    const beforeSelection = await page.evaluate(() => window.revisionEvents.length);
    await page.route('**/api/chats/save', holdSelection);
    try {
        await page.locator('#chat .last_mes .swipe_left').last().click();
        await page.waitForFunction(
            ({ before, target }) =>
                window.revisionEvents.slice(before).some((e) => e.key === 'MESSAGE_SWIPED') &&
                SillyTavern.getContext().chat.at(-1).mes.includes(target),
            { before: beforeSelection, target: scenes[1][0] }
        );
        await sleep(100);
        const label = await page.locator('#avereth-action-status').textContent();
        const presentOnDisk = await dr.verifySaved(await dr.chat(), { complete: true });
        evidence.stages.selectedWritePending = { label, presentOnDisk };
        check('swipeBeforeWriteNotAcknowledged', !presentOnDisk && label !== 'Gespeichert');
        await waitForHold(selection, 'selected swipe');
    } finally {
        selection.open();
        if (heldSelection) await waitForHold(selectionSent, 'selected POST released');
        await page.unroute('**/api/chats/save', holdSelection);
    }
    await idle();
    const selected = await snapshot('selectMiddle');
    check('middleActive', selected.swipe === 1 && selected.ground.includes(scenes[1][2]));
    evidence.preReloadEvents = await page.evaluate(() => window.revisionEvents);
    await dr.reload();
    await idle();
    await observe();
    const loaded = await snapshot('reload');
    check('identicalReload', loaded.world === selected.world && loaded.activeEvents === selected.activeEvents);
    next = 3;
    await page.evaluate(() => SillyTavern.getContext().generate('regenerate'));
    await idle();
    const regen = await snapshot('regenerate');
    check('regenerateNewWorld', regen.ground.includes(scenes[3][2]) && !regen.objectNames.includes(scenes[1][2]));
    next = null;
    const cut = records.length;
    assert((await dr.send(follow)).ok, 'Follow-up did not finish');
    await idle();
    const afterFollow = await snapshot('follow');
    for (const role of ['plan', 'narrator', 'extract']) {
        const msgs = records.slice(cut).find((m) => m.role === role)?.messages;
        check('follow' + role + 'Seen', !!msgs);
        const text = JSON.stringify(msgs);
        const has = (s) => [s[0], s[0].toLowerCase().replaceAll(' ', '_'), s[2]].some((word) => text.includes(word));
        evidence.stages.follow.promptMarkers ??= {};
        evidence.stages.follow.promptMarkers[role] = scenes.map((s) => has(s));
        check('follow' + role + 'NoDiscarded', !!msgs && !scenes.slice(0, 3).some(has));
        check('follow' + role + 'ActivePlace', !!msgs && has(scenes[3]));
    }
    const previousBranch = await dr.chat();
    const ix = prefix.length + 1;
    await clickEdit(ix, prose(scenes[1]));
    const edited = await snapshot('olderEdit');
    check('oldEditedFactsRemoved', !edited.objectNames.includes(scenes[3][2]));
    check(
        'olderEditNewFactsBound',
        edited.ground.includes(scenes[1][2]) && edited.rows.Present?.includes(scenes[1][1])
    );
    const editedChat = await dr.chat();
    const suffix = previousBranch.slice(ix + 1);
    check(
        'oldSuffixStillAuditable',
        suffix.length > 0 &&
            suffix.every((old, i) => {
                const archived = editedChat[ix + 1 + i];
                return (
                    archived?.avereth_inactive &&
                    old.mes === archived.mes &&
                    JSON.stringify(old.extra?.avereth?.events) === JSON.stringify(archived.extra?.avereth?.events)
                );
            })
    );
    const startAfterEdit = records.length;
    assert((await dr.send('I ask the courier about this courtyard.')).ok, 'Follow-up after edit did not finish');
    await idle();
    const postEdit = records.slice(startAfterEdit);
    const oldMarkers = postEdit.filter((c) => JSON.stringify(c.messages).toLowerCase().includes('slate counter'));
    evidence.stages.olderEdit.nextRoles = postEdit.map((r) => r.role);
    check(
        'olderEditNewTurnPlayable',
        postEdit.some((r) => r.role === 'narrator') && postEdit.some((r) => r.role === 'extract')
    );
    check('olderEditSubsequentRequestsExcludeDiscardedObject', oldMarkers.length === 0);
    await seed(previousBranch);
    await clickEdit(ix - 1, 'I stay in the Guild hall and listen.');
    const playerEdited = await snapshot('earlierPlayerEdit');
    check(
        'earlierPlayerEditRetractsOldJourney',
        playerEdited.where === 'loc.glassmere.guild_hall' && !playerEdited.objectNames.includes(scenes[3][2])
    );
    await clickEdit(ix - 1, input);
    const restored = await snapshot('restoreOriginalInput');
    check('restoredExactBranch', restored.world === afterFollow.world);
    await seed(alternatives);
    const beforeEdit = records.length;
    await clickEdit(ix, prose(scenes[3]));
    await idle();
    const latest = await snapshot('latestEdit');
    check(
        'editedLatestTracksChangedText',
        latest.ground.includes(scenes[3][2]) && !latest.objectNames.includes(scenes[2][2])
    );
    check(
        'latestEditInvokesOnlyExtractor',
        JSON.stringify(records.slice(beforeEdit).map((r) => r.role)) === JSON.stringify(['extract'])
    );
    const origin = await page.evaluate(() => SillyTavern.getContext().getCurrentChatId());
    const second = 'Revision control conversation';
    await page.evaluate((id) => SillyTavern.getContext().openCharacterChat(id), second);
    await seed(previousBranch);
    await idle();
    const control = await snapshot('otherOrigin');
    await page.evaluate((id) => SillyTavern.getContext().openCharacterChat(id), origin);
    // A slow, physically running Extractor must lose its authority on the first native swipe away.
    await seed(alternatives);
    await idle();
    next = 3;
    const extraction = gate();
    block = extraction;
    try {
        await page.locator('#chat .last_mes .swipe_right').last().click();
        await waitForHold(extraction, 'extractor');
        await page.locator('#chat .last_mes .swipe_left').last().click({ timeout: 8000 });
        await page.waitForFunction(
            (target) => SillyTavern.getContext().chat.at(-1).mes.includes(target),
            scenes[2][0],
            { timeout: 7000 }
        );
        check('lateExtractorActuallySwiped', true);
    } finally {
        extraction.open();
        block = null;
    }
    await idle();
    await sleep(700);
    const after = await snapshot('extractRace');
    check('extractDiscardsStale', after.ground.includes(scenes[2][2]) && !after.objectNames.includes(scenes[3][2]));
    await page.evaluate(() => SillyTavern.getContext().reloadCurrentChat());
    await idle();
    const raceLoaded = await snapshot('extractRaceReload');
    check('extractPersistentActive', raceLoaded.world === after.world && raceLoaded.text === prose(scenes[2]));

    // Hold the actual origin's successful world POST and request a native switch to a separate chat.
    // ST may defer the switch until the save completes. In either ordering the destination must survive untouched.
    // The preceding native reload has already restored the fully saved Silver branch.
    // Start the next action there; injecting an older copy while ST is finishing this switch can swallow a click.
    dr.testChat = await dr.identity();
    await page.waitForFunction(() =>
        ['Gespeichert', 'Bereit'].includes(document.querySelector('#avereth-action-status')?.textContent)
    );
    const saving = gate();
    let intercepted = false;
    const route = async (request) => {
        const last = decodeLastSavedMessage(request);
        if (!intercepted && last?.mes === prose(scenes[3]) && last.extra?.avereth?.extraction?.status === 'applied') {
            intercepted = true;
            saving.enter();
            await saving.wait;
        }
        await request.continue().catch((error) => {
            if (!page.isClosed()) throw error;
        });
    };
    await page.route('**/api/chats/save', route);
    try {
        await page.evaluate((text) => {
            $('#send_textarea').val(text).trigger('input');
            $('#send_but').trigger('click');
        }, input);
        await waitForHold(saving, 'world save POST');
        const arrowsVisible = await page.locator('#chat .last_mes .swipe_left').last().isVisible();
        await page.evaluate((id) => {
            window.revisionSwitch = SillyTavern.getContext().openCharacterChat(id);
        }, second);
        const switchedWhileHeld = await page
            .waitForFunction((id) => SillyTavern.getContext().getCurrentChatId() === id, second, { timeout: 2500 })
            .then(
                () => true,
                () => false
            );
        evidence.stages.saveGate = { arrowsVisible, switchedWhileHeld };
        saving.open();
        await page.evaluate(() => window.revisionSwitch);
        await idle();
        dr.testChat = await dr.identity();
        const other = await snapshot('otherAfterLateSave');
        check(
            'lateOriginSaveIsolated',
            other.world === control.world && other.activeEvents === control.activeEvents && other.text === control.text
        );
        await page.evaluate((id) => SillyTavern.getContext().openCharacterChat(id), origin);
        dr.testChat = await dr.identity();
        await idle();
        const written = await snapshot('originAfterLateSave');
        check('lateSaveCorrectOrigin', written.ground.includes(scenes[3][2]) && written.text !== control.text);
    } finally {
        saving.open();
        await page.unroute('**/api/chats/save', route);
    }
    evidence.events = await page.evaluate(() => window.revisionEvents);
    check(
        'nativeEditedBeforeUpdated',
        evidence.events.findIndex((e) => e.key === 'MESSAGE_EDITED') >= 0 &&
            evidence.events.findIndex((e) => e.key === 'MESSAGE_UPDATED') >
                evidence.events.findIndex((e) => e.key === 'MESSAGE_EDITED')
    );
    handover = handoverCase();
    await checkHandover({ trial: handover, dr, page, instance, idle, snapshot, check, changeSwipe, evidence, records });
} catch (e) {
    evidence.error = String(e.stack);
    console.error(e);
    process.exitCode = 1;
} finally {
    evidence.requests = records.map((c) => c.role);
    report();
    if (browser) await browser.close();
    if (server) await server.stop();
    await mock.close();
}
if (Object.values(evidence.checks).includes(false)) process.exitCode = 1;
