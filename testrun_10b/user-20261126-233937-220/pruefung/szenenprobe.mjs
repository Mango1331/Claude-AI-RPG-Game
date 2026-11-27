// Abweichende geskriptete Modellantworten auf dem Originalpräfix. Beide Außenbeobachtungen laufen in Folge.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] || '.');
const { engineAt } = await import(pathToFileURL(resolve(root, 'tools/replay/replay.mjs')));
const { host, runtime, content, version } = await engineAt(root);
assert.equal(version, '4.3.0-c.6.6.220');
const archive = new URL('../originals/chat.jsonl', import.meta.url);
const original = fs.readFileSync(archive, 'utf8').trim().split('\n').slice(1).map(JSON.parse);
function appendOriginal(chat, i) {
    const m = structuredClone(original[i]);
    delete m.extra.avereth;
    chat.push(m);
    return m;
}

const hall = structuredClone(original.slice(0, 15));
const glance = appendOriginal(hall, 15);
const sceneTurn = await runtime.prepareGenerationAsync(hall, content, {llm:async ({purpose}) => {
    assert.equal(purpose, 'plan');
    return '{"commands":[]}';
}});
assert.equal(sceneTurn.action, 'context');
assert.ok(host.rec(glance).events.every(e => !['check.recorded','party.joined','entity.created'].includes(e.t)));

const outside = structuredClone(original.slice(0, 35));
const before = host.foldChat(outside).state;
for (const [i, text] of [
    [35, 'From outside, two voices can be heard near the passage; cold green light pulses up the steps.'],
    [37, 'From the doorway Alaric sees two goblins. One says a creature below is chained; the other mentions Tolmag.']
]) {
    appendOriginal(outside, i);
    const turn = await runtime.prepareGenerationAsync(outside, content, {llm:async ({purpose}) => {
        assert.equal(purpose, 'plan');
        return host.rec(original[i]).plan.raw[0];
    }});
    assert.equal(turn.action, 'context');
    const m = appendOriginal(outside, i + 1);
    assert.ok(runtime.processReplyAny(outside, i + 1, content, {}).extract);
    const reported = host.rec(original[i + 1]).extraction.raw.deltas.find(d => d.type === 'thread' && !d.id);
    const observed = {...reported, seq:1, scene:'here', text};
    const answer = {scene:'here', expected:{1:{arrived:false, at:null, with:null, met:null}}, deltas:[observed]};
    await runtime.runExtraction(outside, i + 1, content, async ({purpose}) => {
        assert.equal(purpose, 'extract');
        return JSON.stringify(answer);
    });
    const {state, errors} = host.foldChat(outside);
    assert.deepEqual(errors, []);
    assert.equal(state.scene.at, before.scene.at);
    assert.deepEqual(state.scene.present, before.scene.present);
    assert.equal(state.entities.pc.sheet.mp, before.entities.pc.sheet.mp);
    assert.equal(state.clock.minute, before.clock.minute);
    const record = host.rec(m);
    assert.equal(record.extraction.status, 'applied');
    assert.ok(record.events.every(e => e.t !== 'delta.rejected'));
    const thread = record.events.find(e => e.t === 'thread.set').d.thread;
    assert.equal(thread.text, text);
    console.log({reply:i + 1, at:state.scene.at, minute:state.clock.minute, thread:thread.id});
}

// Nur ein Feld der tatsächlichen X39-Antwort ändern. Das falsche arrive bleibt vollständig erhalten.
const prefix = structuredClone(original.slice(0, 36));
const reply = appendOriginal(prefix, 36);
const anchored = structuredClone(host.rec(original[36]).extraction.raw);
const light = anchored.deltas.find(d => d.type === 'thread' && d.kind === 'mystery');
light.scene = before.scene.at;
assert.ok(runtime.processReplyAny(prefix, 36, content, {}).extract);
await runtime.runExtraction(prefix, 36, content, async ({purpose}) => {
    assert.equal(purpose, 'extract');
    return JSON.stringify(anchored);
});
const record = host.rec(reply);
assert.equal(record.extraction.status, 'applied');
assert.deepEqual(record.events.filter(e => e.t === 'delta.rejected').map(e => e.d.rule),
    ['passage','scene_context','scene_context','travel_time']);
const persisted = record.events.find(e => e.t === 'thread.set').d.thread;
assert.equal(persisted.at, before.scene.at);
assert.equal(persisted.text, light.text);
console.log({singleChangedField:'M36 seq5.scene', preserved:persisted.id, at:persisted.at});
