// Paired deterministic trade extracts in isolated ST. Requires unpacked natural A/B records and main for User06.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const [before, after, raw, main, st, out] = process.argv.slice(2);
assert.equal(
    execFileSync('git', ['-C', st, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    '7e8663cd9c184a550b37238218bdd32c6efc68e9',
);
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-trade-mock-'));
const lines = (f) => fs.readFileSync(path.join(raw, f), 'utf8').trim().split('\n').map(JSON.parse);
const [header, ...guildChat] = lines('main-chat-B.jsonl');
const records = lines('physical.jsonl');
const mod = (dir, p) => import(pathToFileURL(path.resolve(dir, 'avereth-engine', p)));
const { archived } = await mod(before, 'tools/bench_extract_archive.mjs');
const combat = (await archived(main)).find((p) => p.name === 'U6');
const guildAnswer = JSON.parse(records.find((r) => r.kind === 'end' && r.id === 31).text);
const combatAnswer = JSON.parse(combat.items.find((r) => r.id === 20).resp.choices[0].message.content);
const results = [];
for (const [scene, base, label, price, quote] of [
    [1, 'chainmail', 'chainmail', 80, 'Eighty copper for this fine chainmail.'],
    [
        2,
        'hand_axe',
        'hand-axe',
        12,
        'Twelve copper for this fine hand-axe, only after the guild seals your permit.',
    ],
    [3, 'buckler', 'buckler', 64, 'Sixty-four copper for this fine buckler.'],
]) {
    const fighting = scene === 3;
    const chat = structuredClone(fighting ? combat.chat : guildChat);
    const id = fighting ? 20 : 18;
    const card = chat[0].name;
    const condition = scene === 2 ? 'the guild seals your permit' : null;
    const answer = structuredClone(fighting ? combatAnswer : guildAnswer);
    let prose = ' An armorer named Nessa in a blue sash came up and said, "' + quote + '"';
    const extra = [
        {
            type: 'person.new',
            ref: 'nessa',
            name: 'Nessa',
            role: 'armorer',
            desc: ['blue sash'],
            present: true,
            relevant: true,
            band: 'SHORT',
        },
        {
            type: 'offer',
            seller: 'nessa',
            lines: [
                {
                    what: 'fine ' + label,
                    kind: 'goods',
                    service: null,
                    qty: 1,
                    price_cp: price,
                    said: quote,
                    phase: condition ? 'conditional' : 'firm',
                    condition,
                    pricing: { basis: 'total', quote: quote.split(' for ')[0] },
                    equipment: true,
                    base,
                    quality: 'fine',
                    teaches: null,
                    effect: null,
                },
            ],
        },
    ];
    if (fighting) {
        prose +=
            ' She pressed a blue kerchief into Alaric’s hand and promised to meet him at the old ford tomorrow.';
        extra.push(
            { type: 'object.new', name: 'blue kerchief', kind: 'item', qty: 1, holder: 'nessa' },
            { type: 'object.move', object: { new: 'blue kerchief' }, to: 'pc' },
            {
                type: 'thread',
                kind: 'promise',
                text: 'Nessa promised Alaric to meet him at the old ford tomorrow.',
                status: 'open',
                who: ['pc', 'nessa'],
            },
        );
    }
    for (const delta of extra) answer.deltas.push({ ...delta, seq: answer.deltas.length + 1 });
    chat[id].mes += prose;
    if (chat[id].swipes) chat[id].swipes[chat[id].swipe_id || 0] = chat[id].mes;
    const pair = [];
    const requests = {};
    for (const repo of scene === 2 ? [after, before] : [before, after]) {
        const arm = repo === before ? 'A' : 'B';
        const run = 'trade-' + scene + '-' + arm;
        const { createInstance, writeConfig, seedProfile } = await mod(repo, 'tools/st_live/live/profile.mjs');
        const { startServer, freePort } = await mod(repo, 'tools/st_live/live/server.mjs');
        const { Driver, loadPlaywright } = await mod(repo, 'tools/st_live/live/driver.mjs');
        const { pendingChat, worldEvidence } = await mod(repo, 'tools/bench_extract.mjs');
        const seen = [],
            mock = http.createServer(async (req, res) => {
                res.setHeader('Content-Type', 'application/json');
                if (req.method === 'GET' && req.url === '/v1/models')
                    return res.end(
                        JSON.stringify({ object: 'list', data: [{ id: 'mock-trade', object: 'model' }] }),
                    );
                if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
                    res.statusCode = 404;
                    return res.end('{}');
                }
                const chunks = [];
                for await (const c of req) chunks.push(c);
                const body = JSON.parse(Buffer.concat(chunks)),
                    n = seen.length;
                seen.push(body);
                if (!body.messages[0].content.startsWith('You read one reply') || n >= (fighting ? 2 : 1)) {
                    res.statusCode = 400;
                    return res.end('{}');
                }
                res.end(
                    JSON.stringify({
                        id: 'local-' + n,
                        model: 'mock-trade',
                        choices: [
                            {
                                index: 0,
                                message: { role: 'assistant', content: JSON.stringify(answer) },
                                finish_reason: 'stop',
                            },
                        ],
                    }),
                );
            });
        await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
        let browser, server;
        try {
            const inst = createInstance({ runId: run, base: root, runDir: root });
            const port = await freePort(18742);
            writeConfig(inst, port);
            const start = (tag) =>
                startServer({
                    stDir: st,
                    inst,
                    port,
                    logFile: path.join(root, run + tag + '.log'),
                    timedFile: path.join(root, run + tag + '-timed.log'),
                });
            const boot = await start('boot');
            await boot.stop();
            const preset = fs.readFileSync(
                path.join(repo, 'avereth-engine/presets/Avereth Narrator V4.json'),
                'utf8',
            );
            seedProfile(inst, {
                username: chat.find((m) => m.is_user).name,
                card: { name: card, first_mes: chat[0].mes },
                preset: { name: 'Avereth Narrator V4', text: preset },
                generation: {},
                source: 'custom',
                connection: {
                    chat_completion_source: 'custom',
                    custom_url: 'http://127.0.0.1:' + mock.address().port + '/v1',
                    custom_model: 'mock-trade',
                },
            });
            const name = run;
            const folder = path.join(inst.user, 'chats', card);
            fs.mkdirSync(folder, { recursive: true });
            fs.writeFileSync(
                path.join(folder, name + '.jsonl'),
                [header, ...pendingChat(chat, id)].map((m) => JSON.stringify(m)).join('\n') + '\n',
                { flag: 'wx' },
            );
            server = await start('st');
            browser = await loadPlaywright().chromium.launch({
                executablePath: process.env.AVERETH_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
                args: ['--no-sandbox', '--disable-dev-shm-usage'],
            });
            const d = await Driver.create(browser, {});
            assert((await d.open(server.url)).connected);
            await d.openCard(card);
            await d.page.evaluate((n) => SillyTavern.getContext().openCharacterChat(n), name);
            d.testChat = await d.identity();
            await d.page.waitForFunction(
                (id) =>
                    SillyTavern.getContext().chat[id]?.extra?.avereth?.extraction?.status === 'applied' &&
                    document.querySelector('#avereth-action-status')?.textContent === 'Gespeichert',
                id,
                { timeout: 90000 },
            );
            const saved = await d.chat();
            assert(await d.verifySaved(saved, { complete: true }));
            await d.page.evaluate(() => SillyTavern.getContext().reloadCurrentChat());
            const reloaded = await d.chat();
            assert(await d.verifySaved(reloaded, { complete: true }));
            const ev = worldEvidence(reloaded, id);
            assert.deepEqual(ev, worldEvidence(saved, id));
            const hash = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
            const initial = worldEvidence(pendingChat(chat, id), id).state;
            const seller = Object.values(ev.state.entities).find((p) => p.name === 'Nessa');
            assert(seller && ev.state.scene.present.includes(seller.id));
            const line = Object.values(ev.state.offers)
                .find((o) => o.seller === seller.id)
                .lines.find((l) => l.base === base);
            const oracle = [
                { price: 72, atk: 0, def: 7, mdef: 2 },
                { price: 140, atk: 14, def: 0, mdef: 0 },
                { price: 64, atk: 0, def: 5, mdef: 3 },
            ][scene - 1];
            assert.equal(line.price_cp, oracle.price);
            assert.equal(line.said, quote);
            for (const field of ['atk', 'def', 'mdef']) assert.equal(line.profile[field], oracle[field]);
            assert.equal(line.quality, 'fine');
            const intendedTerms = condition ? 'conditional' : 'firm';
            if (fighting) assert(['firm', 'unverified'].includes(line.terms));
            else assert.equal(line.terms, intendedTerms);
            assert.equal(line.profile.title, label);
            assert.equal(line.profile.slot, ['armor', 'weapon', 'offhand'][scene - 1]);
            assert.equal(ev.state.entities.pc.sheet.coin_cp, initial.entities.pc.sheet.coin_cp);
            assert(!ev.events.some((e) => e.t === 'coin.changed'));
            if (condition) {
                assert.equal(line.condition, condition);
                // Probe an explicit acceptance against a copy of the actual reloaded state.
                const { resolveCommands } = await mod(repo, 'src/v4/commands.js');
                const { applyEvent } = await mod(repo, 'src/state.js');
                const state = structuredClone(ev.state);
                const events = [];
                const offer = Object.values(state.offers).find(
                    (o) => o.seller === seller.id && o.lines.some((l) => l.base === base),
                );
                const text = 'I buy the fine hand-axe now.';
                const receipt = resolveCommands(
                    state,
                    combat.content,
                    [{ seq: 1, type: 'offer.accept', offer: offer.id, lines: [line.id], qty: 1, quote: text }],
                    (e) => {
                        events.push(e);
                        applyEvent(state, e);
                    },
                    { c: true, msg: id + 1, text },
                );
                assert.match(receipt.actions.join(' '), /NOT AGREED.*conditional/i);
                assert.equal(state.entities.pc.sheet.coin_cp, initial.entities.pc.sheet.coin_cp);
                assert(!events.some((e) => ['coin.changed', 'object.created', 'offer.accepted'].includes(e.t)));
                assert(
                    !Object.values(ev.state.objects).some(
                        (o) => o.profile?.title === label && o.holder?.entity === 'pc',
                    ),
                );
            }
            if (fighting) {
                assert(initial.encounter);
                assert(
                    Object.values(ev.state.objects).some(
                        (o) => o.name === 'blue kerchief' && o.holder?.entity === 'pc',
                    ),
                );
                assert(
                    Object.values(ev.state.threads).some(
                        (t) =>
                            t.text.includes('old ford tomorrow') &&
                            t.who.includes('pc') &&
                            t.who.includes(seller.id),
                    ),
                );
            }
            assert.equal(seen.length, fighting ? 2 : 1);
            if (fighting)
                assert.match(seen[1].messages.at(-1).content, /open condition next to this price \("tomorrow"\)/);
            const { gearMarketText } = await mod(repo, 'src/v4/items.js');
            const market = gearMarketText(combat.content, false, 'catalog');
            for (const request of seen) {
                const catalog = request.messages[1];
                assert.equal(catalog.content.split(market).length, 2);
                catalog.content = catalog.content.replace(market, '[machine gear catalog]');
            }
            requests[arm] = seen;
            assert.equal(ev.events.find((e) => e.t === 'extract.applied').d.repaired, fighting);
            pair.push({
                scene,
                arm,
                requests: seen.length,
                repairs: seen.length - 1,
                intendedTerms,
                priceBindingCorrect: line.terms === intendedTerms,
                initial: hash(initial),
                state: hash(ev.state),
                events: hash(ev.events),
                base,
                label,
                quality: line.quality,
                slot: line.profile.slot,
                atk: line.profile.atk,
                def: line.profile.def,
                quotedPrice: price,
                storedPrice: line.price_cp,
                mdef: line.profile.mdef,
                terms: line.terms,
                coin: initial.entities.pc.sheet.coin_cp,
                readback: true,
            });
        } finally {
            await browser?.close();
            await server?.stop();
            await new Promise((resolve) => mock.close(resolve));
        }
    }
    for (const key of ['initial', 'state', 'events']) assert.equal(pair[0][key], pair[1][key]);
    assert.deepEqual(requests.A, requests.B);
    results.push(...pair);
}
fs.writeFileSync(out, JSON.stringify(results, null, 2) + '\n');
