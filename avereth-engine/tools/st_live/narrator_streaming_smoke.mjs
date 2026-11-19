// Runs only from the existing marked ST sandbox. Keep actual ST rendering, transport and saves.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { Driver } from './live/driver.mjs';

const action = 'I climb down into the old burrow.';
const draft = '#status';
const first = 'Alaric lowers himself into the burrow.';
const duration = 1800;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Physical timings are recorded on two otherwise deterministic game events.
function eventHash(events) {
    const copy = structuredClone(events);
    for (const event of copy) {
        if (['cmd.interpreted', 'extract.applied'].includes(event.t)) delete event.d.ms;
    }
    return hash(copy);
}
let script;

function completion(res, message) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ index: 0, message: { role: 'assistant', ...message }, finish_reason: 'stop' }] }));
}

export async function scriptedNarratorResponse(res, purpose, request, text, burrowAnswer) {
    if (!script) return false;
    if (purpose === 'extract') {
        if (['error-after', 'malformed'].includes(script.fault)) {
            // The truncated sentence alone can support arrival. Omit all later creatures and combat.
            assert.ok(request.messages.at(-1).content.includes(first));
            await sleep(1200);
            completion(res, { content: JSON.stringify({ scene: 'here', expected: burrowAnswer.expected,
                deltas: burrowAnswer.deltas.filter(event => event.type === 'arrive') }) });
            return true;
        }
        await sleep(900); // plus the runner's standard 300 ms
        return false;
    }
    if (purpose !== 'narrator') return false;
    const { fault, firstMs, suffix } = script;
    text += suffix;
    if (!request.stream) {
        if (fault === 'error-buffered') {
            await sleep(1350);
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'injected narrator failure' } }));
            return true;
        }
        if (fault === 'reload-buffered') {
            await new Promise(resolve => res.destroyed ? resolve() : res.once('close', resolve));
            return true;
        }
        await sleep(duration);
        completion(res, { content: text, reasoning_content: 'Planning.' });
        return true;
    }
    const chunk = (delta, finish_reason = null) => res.write('data: ' + JSON.stringify({ choices: [{ index: 0, delta, finish_reason }] }) + '\n\n');
    const error = () => res.write('data: {"error":{"message":"injected narrator failure"}}\n\n');
    const done = () => res.end('data: [DONE]\n\n');
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    chunk({ role: 'assistant' });
    await sleep(30);
    chunk({ reasoning_content: 'Planning.' });
    await sleep(firstMs - 30);
    if (fault === 'error-before') { error(); done(); return true; }
    assert.ok(text.startsWith(first), 'fixture narrator mismatch');
    chunk({ content: first });
    if (fault === 'stop' || fault === 'reload-open') {
        // No upstream EOF. ST must release the connection on client cancellation.
        await new Promise(resolve => res.destroyed ? resolve() : res.once('close', resolve));
        return true;
    }
    await sleep(1350 - firstMs);
    if (fault === 'disconnect') { res.destroy(); return true; }
    if (fault === 'eof') { res.end(); return true; }
    if (fault === 'error-after') { error(); done(); return true; }
    if (fault === 'malformed') { res.write('data: {broken\n\n'); done(); return true; }
    const split = text.lastIndexOf(' and ');
    chunk({ content: text.slice(first.length, split) });
    await sleep(duration - 1350);
    chunk({ content: text.slice(split) });
    chunk({}, 'stop');
    if (fault === 'finish-no-done') res.end(); else done();
    return true;
}

async function configure(page, stream) {
    await page.evaluate(stream => {
        const c = SillyTavern.getContext();
        if (c.mainApi !== 'openai' || c.chatCompletionSettings.chat_completion_source !== 'custom' ||
            c.chatCompletionSettings.custom_url !== 'http://127.0.0.1:5001/v1') throw Error('Mock route required');
        Object.assign(c.chatCompletionSettings, { stream_openai: stream, openai_max_tokens: 4096 });
        c.powerUserSettings.smooth_streaming = false;
    }, stream);
}

async function seed(page, prefix) {
    await page.evaluate(async prefix => {
        const c = SillyTavern.getContext();
        c.chat.splice(0, c.chat.length, ...prefix);
        delete c.chatMetadata.pending_action_input;
        await c.saveChat();
        await c.reloadCurrentChat();
    }, prefix);
    await page.waitForSelector('#send_but:visible');
}

async function inspect(page) {
    return page.evaluate(async () => {
        const c = SillyTavern.getContext();
        const { foldChat } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const i = c.chat.findLastIndex(m => m.is_user);
        const reply = c.chat[i + 1], r = reply?.extra?.avereth;
        const storage = Object.keys(localStorage).find(k => k.startsWith('avereth.requests.v1:custom:'));
        return { users: c.chat.filter(m => m.is_user).length, userEvents: c.chat[i]?.extra?.avereth?.events || [],
            text: reply?.mes || '', extraction: r?.extraction?.status || null, replyEvents: r?.events || [],
            textHash: r?.text_hash, swipe: reply?.swipe_id ?? 0, state: foldChat(c.chat).state,
            status: document.querySelector('#avereth-action-status')?.textContent, draft: document.querySelector('#send_textarea').value,
            leases: JSON.parse(localStorage.getItem(storage) || '{}').leases || [] };
    });
}

async function begin(page, finalText) {
    await page.fill('#send_textarea', action);
    await page.evaluate(({ first, finalText }) => {
        document.querySelector('#send_but').addEventListener('click', () => {
            const start = performance.now(), marks = {};
            window.narratorMarks = marks;
            const c = SillyTavern.getContext();
            const replyIndex = c.chat.length + 1;
            const note = k => { marks[k] ??= Math.round(performance.now() - start); };
            c.eventSource.once(c.eventTypes.CHAT_COMPLETION_SETTINGS_READY, () => note('narratorSettingsReady'));
            const token = text => { if (text.includes(first)) note('firstDecodedSentence'); };
            c.eventSource.on(c.eventTypes.STREAM_TOKEN_RECEIVED, token);
            c.eventSource.once(c.eventTypes.MESSAGE_RECEIVED, () => {
                note('received');
                c.eventSource.removeListener(c.eventTypes.STREAM_TOKEN_RECEIVED, token);
            });
            const frame = () => {
                if (marks !== window.narratorMarks) return;
                const el = document.querySelector('#chat .mes[mesid="' + replyIndex + '"] .mes_text');
                // Text must participate in layout and the first prose sentence must intersect the chat viewport.
                if (el?.checkVisibility() && el.innerText.includes(first)) {
                    const nodes = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                    let n;
                    while ((n = nodes.nextNode())) {
                        const at = n.textContent.indexOf(first);
                        if (at < 0) continue;
                        const range = document.createRange();
                        range.setStart(n, at); range.setEnd(n, at + first.length);
                        const rect = range.getBoundingClientRect(), chat = document.querySelector('#chat').getBoundingClientRect();
                        if (rect.height > 0 && rect.top >= chat.top && rect.bottom <= chat.bottom) note('firstProse');
                        break;
                    }
                    if (el.innerText.includes(finalText)) note('fullProse');
                }
                const reply = c.chat[replyIndex];
                if (marks.fullProse != null && reply?.extra?.avereth?.extraction?.status === 'applied' &&
                    document.querySelector('#avereth-action-status')?.textContent === 'Gespeichert' &&
                    document.querySelector('#send_but')?.checkVisibility()) note('ready');
                if (marks.ready == null) requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        }, { once: true, capture: true });
    }, { first, finalText });
    await page.click('#send_but');
}

async function normal(page, prefix, calls, worldTimings, stream, firstMs, finalText) {
    await seed(page, prefix);
    await configure(page, stream);
    script = { firstMs, suffix: '' };
    const from = calls.length;
    const jobStart = worldTimings.length;
    await begin(page, finalText);
    await page.waitForFunction(() => document.querySelector('#avereth-action-status')?.textContent?.includes('Weltabgleich läuft'));
    const count = await page.locator('#chat .mes').count();
    await page.fill('#send_textarea', draft);
    await page.click('#send_but');
    const blocked = await page.inputValue('#send_textarea') === draft && await page.locator('#chat .mes').count() === count;
    await page.waitForFunction(() => window.narratorMarks.ready != null, null, { timeout: 15000 });
    const marks = await page.evaluate(() => ({ ...window.narratorMarks }));
    const snapshot = await inspect(page);
    const physical = calls.slice(from);
    assert.deepEqual(physical.map(c => [c.purpose, c.stream]), [['plan', false], ['narrator', stream], ['extract', false]]);
    assert.equal(physical[1].maxTokens, 4096);
    assert.equal(snapshot.text, finalText);
    assert.equal(snapshot.draft, draft);
    assert.ok(blocked && marks.firstProse != null && marks.received != null && !snapshot.leases.length);
    // Send the very draft previously blocked. This local command is observable without another LLM request.
    await page.click('#send_but');
    await page.waitForFunction(() => SillyTavern.getContext().chat.some(m => m.is_user && m.mes === '#status'));
    await page.waitForFunction(() => document.querySelector('#send_but')?.checkVisibility() &&
        SillyTavern.getContext().chat.at(-1)?.is_user === false);
    await page.waitForTimeout(350);
    assert.equal(calls.length, from + 3);
    const jobs = worldTimings.slice(jobStart);
    assert.equal(jobs.length, 1);
    assert.ok(jobs[0].persisted && jobs[0].extraction_status === 'applied');
    return { stream, firstMs, marks, requests: physical.map(c => ({ phase: c.purpose, stream: c.stream, maxTokens: c.maxTokens })),
        narratorPrompt: hash(physical[1].messages), verifiedWorld: jobs[0], userEvents: eventHash(snapshot.userEvents),
        replyEvents: eventHash(snapshot.replyEvents), state: hash(snapshot.state), worldEvents: snapshot.replyEvents.length,
        text: hash(snapshot.text), blockedDraftSentAfterSave: true };
}

async function restorePage(page, identity) {
    const driver = new Driver(page);
    await driver.open('http://127.0.0.1:8123/');
    await driver.welcomeDone();
    await page.evaluate(async ({ name, chatId }) => {
        const c = SillyTavern.getContext();
        await c.selectCharacterById(String(c.characters.findIndex(x => x.name === name)));
        if (c.getCurrentChatId() !== chatId) await c.openCharacterChat(chatId);
    }, identity);
    await page.waitForSelector('#avereth-action-status');
    await configure(page, true);
}

async function faultCase(page, prefix, identity, calls, fault, finalText) {
    await restorePage(page, identity);
    await seed(page, prefix);
    const buffered = ['reload-buffered', 'error-buffered'].includes(fault);
    await configure(page, !buffered);
    script = { fault, firstMs: 180, suffix: '' };
    const from = calls.length;
    const errors = [], consoleErrors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().split('\n')[0]); });
    await begin(page, finalText);
    let active;
    if (fault !== 'error-before') {
        if (buffered) {
            await page.waitForFunction(() => {
                const key = Object.keys(localStorage).find(k => k.startsWith('avereth.requests.v1:custom:'));
                return JSON.parse(localStorage.getItem(key) || '{}').leases?.some(l => l.phase === 'narrator');
            });
            for (let i = 0; i < 100 && calls.length < from + 2; i++) await sleep(20);
        } else await page.waitForFunction(() => window.narratorMarks.firstProse != null);
        active = await inspect(page);
        assert.deepEqual(active.leases.map(l => l.status), ['active']);
        assert.deepEqual(calls.slice(from).map(c => c.purpose), ['plan', 'narrator']);
    }
    if (fault === 'stop') await page.click('#mes_stop');
    let openDraftKept = null;
    let draftAfterFirstReload = null;
    if (fault === 'reload-open' || fault === 'reload-buffered') {
        await page.fill('#send_textarea', draft);
        await page.locator('#send_textarea').press('Enter');
        const open = await inspect(page);
        openDraftKept = open.draft === draft && open.users === active.users;
        await restorePage(page, identity);
        draftAfterFirstReload = await page.inputValue('#send_textarea');
    }
    await page.waitForTimeout(4200); // beyond slow X, one repair and native saves
    const before = await inspect(page);
    const callsBeforeReload = calls.slice(from).map(c => c.purpose);
    const blocked = before.status?.includes('unbekannt');
    let kept = null;
    if (blocked) {
        await page.fill('#send_textarea', draft);
        await page.locator('#send_textarea').press('Enter');
        const after = await inspect(page);
        kept = after.draft === draft && after.users === before.users && calls.length === from + callsBeforeReload.length;
    }
    // Navigation without an artificial pre-save. Reopen the same file in the same storage partition.
    await restorePage(page, identity);
    await page.waitForTimeout(1500);
    const readback = await inspect(page);
    let blockedAfterReload = null;
    if (readback.status?.includes('unbekannt')) {
        const n = calls.length;
        await page.fill('#send_textarea', draft);
        await page.locator('#send_textarea').press('Enter');
        const after = await inspect(page);
        blockedAfterReload = after.draft === draft && after.users === readback.users && calls.length === n;
    }
    const compact = s => ({ text: s.text, extraction: s.extraction, events: s.replyEvents.map(e => e.t),
        location: s.state.scene.at, userEvents: hash(s.userEvents), userEventCount: s.userEvents.length, users: s.users,
        status: s.status, leases: s.leases.map(l => l.status) });
    return { fault, heldWhileInFlight: active?.leases.length === 1, callsBeforeReload, calls: calls.slice(from).map(c => c.purpose),
        before: compact(before), readback: compact(readback), openDraftKept, blockedDraftKept: kept, blockedAfterReload,
        draftAfterFirstReload, draftAfterNavigation: kept === true ? readback.draft : null, pageErrors: errors, consoleErrors };
}

export async function narratorStreamingSmoke({ page, calls, worldTimings, occupancy, out }) {
    const source = await page.evaluate(action => {
        const c = SillyTavern.getContext(), i = c.chat.findIndex(m => m.is_user && m.mes === action);
        if (i < 1) throw Error('Missing base turn');
        return { prefix: c.chat.slice(0, i), text: c.chat[i + 1].mes, identity: { name: c.characters[c.characterId].name, chatId: c.getCurrentChatId() } };
    }, action);
    const { prefix, text, identity } = source;
    const result = { seed: prefix[0].extra.avereth.events.find(e => e.t === 'campaign.started').d.seed,
        prefixSha256: hash(prefix), smoothStreaming: false, narratorLimit: 4096, endMs: duration,
        timings: [], faults: [], checks: {} };
    const save = () => fs.writeFileSync(path.join(out, 'narrator-streaming.json'), JSON.stringify(result, null, 2) + '\n');
    try {
        for (const [firstMs, order] of [[180, [false, true]], [950, [true, false]], [180, [true, false]], [950, [false, true]]]) {
            for (const stream of order) {
                result.timings.push(await normal(page, prefix, calls, worldTimings, stream, firstMs, text));
                save();
            }
            const [a, b] = result.timings.slice(-2).sort((x, y) => Number(x.stream) - Number(y.stream));
            const pair = result.timings.length / 2;
            result.checks['matchedTurnPair' + pair] = ['narratorPrompt', 'userEvents', 'state', 'replyEvents', 'text'].every(k => a[k] === b[k]) && a.worldEvents > 0;
            result.checks['earlierProsePair' + pair] = b.marks.firstProse + 300 < a.marks.firstProse;
        }
        // Start a clean turn for native revisions. Carry distinct prose through X and a real disk reload.
        await seed(page, prefix);
        await configure(page, true);
        const start = calls.length;
        script = { firstMs: 180, suffix: '' };
        await begin(page, text);
        await page.waitForFunction(() => window.narratorMarks.ready != null);
        const original = await inspect(page);
        for (const revision of ['swipe', 'regenerate']) {
            script.suffix = revision === 'swipe' ? ' They hiss.' : ' Dust rises.';
            const from = calls.length;
            if (revision === 'swipe') await page.locator('#chat .last_mes .swipe_right').last().click();
            else await page.evaluate(() => SillyTavern.getContext().generate('regenerate'));
            await page.waitForFunction(expected => SillyTavern.getContext().chat.at(-1)?.mes === expected &&
                SillyTavern.getContext().chat.at(-1)?.extra?.avereth?.extraction?.status === 'applied' &&
                document.querySelector('#avereth-action-status')?.textContent === 'Gespeichert', text + script.suffix);
            const revised = await inspect(page);
            await page.evaluate(() => SillyTavern.getContext().reloadCurrentChat());
            const loaded = await inspect(page);
            result.checks[revision + 'OnceAndReload'] = JSON.stringify(calls.slice(from).map(c => c.purpose)) === '["narrator","extract"]' &&
                hash(original.userEvents) === hash(revised.userEvents) && original.users === revised.users &&
                revised.textHash !== original.textHash && revised.replyEvents.length > 0 && hash(revised.state) === hash(original.state) &&
                hash(loaded.state) === hash(revised.state) && loaded.text === revised.text && hash(loaded.replyEvents) === hash(revised.replyEvents);
            save();
        }
        result.checks.revisionsSinglePlanner = calls.slice(start).filter(c => c.purpose === 'plan').length === 1;
        for (const fault of ['error-buffered', 'error-before', 'error-after', 'malformed', 'eof', 'finish-no-done', 'disconnect', 'stop', 'reload-buffered', 'reload-open']) {
            // Each fault gets independent lease storage. The previous client is closed before the next case.
            const faultPage = await page.context().browser().newPage();
            try {
                const row = await faultCase(faultPage, prefix, identity, calls, fault, text);
                result.faults.push(row);
                const bounded = fault === 'error-before' ? ['plan,narrator', 'plan,narrator,narrator'] : ['plan,narrator'];
                result.checks[fault + 'Bookings'] = bounded.includes(row.calls.join(',')) && row.before.userEventCount > 0 &&
                    row.before.userEvents === row.readback.userEvents && row.before.users === row.readback.users &&
                    [row.before, row.readback].every(s => s.extraction !== 'applied' &&
                        s.events.every(t => t === 'extract.failed'));
                if (['eof', 'finish-no-done', 'stop', 'reload-buffered', 'reload-open', 'disconnect'].includes(fault)) {
                    result.checks[fault + 'CapacityAndDraft'] = row.readback.leases.length === 1 &&
                        row.blockedAfterReload === true && row.blockedDraftKept !== false;
                }
                if (fault === 'reload-open') {
                    result.checks.draftWhileStreaming = row.openDraftKept === true;
                    const baseline = result.faults.find(f => f.fault === 'reload-buffered');
                    result.checks.reloadDraftParity = row.draftAfterFirstReload === baseline.draftAfterFirstReload;
                }
                // Restore the saved fixture before another independent browser opens this same file.
                await seed(faultPage, prefix);
                save();
            } finally { await faultPage.close(); }
        }
        result.provider = occupancy();
        result.checks.providerSinglePhysicalRequest = result.provider.peakUnits === 4 &&
            result.provider.activeUnits === 0 && result.provider.capacityRejections === 0;
        return result.checks;
    } finally { script = null; save(); }
}
