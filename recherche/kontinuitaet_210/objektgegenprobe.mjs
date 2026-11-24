import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const [engineDirectory] = process.argv.slice(2);
if (!engineDirectory) throw Error('usage: node objektgegenprobe.mjs <avereth-engine directory>');
const replayModule = path.resolve(engineDirectory, 'tools/replay/replay.mjs');
const { engineAt } = await import(pathToFileURL(replayModule));
const { host, runtime, content } = await engineAt(path.resolve(engineDirectory));

const source = new URL('../../testrun_10b/openrouter-20261124-trust-c-208/original-chat.jsonl.gz', import.meta.url);
const messages = zlib.gunzipSync(fs.readFileSync(source)).toString().trim().split('\n')
    .map(line => JSON.parse(line)).filter(message => typeof message.mes === 'string');
const satchel = 'obj.t40.mother_wrens_leather_satchel';
const wren = 'npc.mother_wren';

function cleanMessage(original) {
    const message = structuredClone(original);
    delete message.extra.avereth;
    return message;
}

for (const mode of ['recorded', 'known_and_moves', 'known_without_move', 'offer_only', 'false_offer_receipt']) {
    const chat = structuredClone(messages.slice(0, 41));
    const results = [];
    const offerControl = mode === 'offer_only' || mode === 'false_offer_receipt';
    for (let i = 41; i <= 45; i += 2) {
        chat.push(cleanMessage(messages[i]));
        const plan = JSON.parse(messages[i].extra.avereth.plan.raw.at(-1));
        if (mode !== 'recorded' && i === 41) plan.commands[0].object = satchel;
        if (offerControl) {
            // A one-scene control: both parties remain present and Wren keeps the item.
            chat[i].mes = 'I take the satchel if she hands it to me.';
            plan.commands = [{ seq: 1, type: 'take', object: satchel, qty: 1, quote: 'I take the satchel' }];
        }
        await runtime.prepareGenerationAsync(chat, content, {
            type: 'normal', settings: {}, llm: async ({ purpose }) => {
                assert.equal(purpose, 'plan');
                return JSON.stringify(plan);
            },
        });
        chat.push(cleanMessage(messages[i + 1]));
        if (offerControl) chat[i + 1].mes = 'The healer offers to lend the satchel tomorrow and keeps it for now.';
        runtime.processReplyAny(chat, i + 1, content);

        let report = structuredClone(messages[i + 1].extra.avereth.extraction.raw);
        if (offerControl) {
            report = { scene: 'here', expected: {}, deltas: [] };
            if (mode === 'false_offer_receipt') {
                report.deltas.push({ seq: 1, scene: 'here', type: 'object.move', object: satchel, qty: 1, to: 'pc' });
            }
        }
        if (mode === 'known_and_moves' && i === 41) {
            const origin = host.foldChat(chat, i + 1).state.scene.at;
            for (const delta of report.deltas) delta.seq++;
            report.deltas.unshift({ seq: 1, scene: origin, type: 'object.move', object: satchel, qty: 1, to: 'pc' });
        }
        if (mode === 'known_and_moves' && i === 45) {
            report.deltas.push({ seq: report.deltas.length + 1, scene: 'loc.halloran_steading.halloran_house',
                type: 'object.move', object: satchel, qty: 1, to: wren });
        }
        const calls = [];
        await runtime.runExtraction(chat, i + 1, content, async ({ purpose }) => {
            calls.push(purpose);
            return JSON.stringify(report);
        });
        const record = chat[i + 1].extra.avereth;
        const state = host.foldChat(chat).state;
        results.push({ id: i + 1, status: record.extraction.status, error: record.extraction.error || null,
            calls, holder: state.objects[satchel].holder,
            copies: Object.values(state.objects).filter(object => object.name === 'the bag').length,
            rejectedRules: record.rejected?.map(rejection => rejection.rule) || [] });
        if (offerControl) break;
    }
    console.log(mode, JSON.stringify(results));
}
