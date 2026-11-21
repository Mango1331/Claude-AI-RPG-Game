// Offline replay against the immutable user07-camp-openrouter-20261122 directory on main.
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';
import assert from 'node:assert/strict';
import { campInspection } from '../src/v4/camp.js';
import { engineAt } from './replay/replay.mjs';

const dir = process.argv[2];
const read = file => fs.readFileSync(path.join(dir, file));
const rows = file => gunzipSync(read(file)).toString().trim().split('\n').map(JSON.parse);
const archive = rows('camp-chat.jsonl.gz').slice(1);
const responses = rows('provider.jsonl.gz').filter(r => r.kind === 'end');
const E = await engineAt();
const fold = chat => {
    const r = E.host.foldChat(JSON.parse(JSON.stringify(chat)));
    assert.deepEqual(r.errors, []);
    return r.state;
};
async function input(chat, words, plan) {
    chat.push({is_user:true, mes:words, extra:{}});
    await E.runtime.prepareGenerationAsync(chat,E.content,{llm:async () => plan});
    return fold(chat).last.outcome;
}
async function reply(chat, prose, answers) {
    const i = chat.length;
    chat.push({is_user:false, mes:prose, extra:{}});
    assert.ok(E.runtime.processReplyAny(chat,i,E.content,{}).extract);
    const queue = [...answers];
    await E.runtime.runExtraction(chat,i,E.content,async () => {
        assert.ok(queue.length, 'unexpected extraction attempt');
        return queue.shift();
    });
    assert.equal(chat[i].extra.avereth.extraction.status,'applied');
    assert.deepEqual(queue, []);
    return fold(chat);
}
const cases = JSON.parse(read('gegenprobe.json')).filter(r => r.engine === 'C');
for (const c of cases) test(c.case,async () => {
    const chat = structuredClone(c.case === 'actual-planner' ? archive.slice(0,-2) : archive.slice(0,43));
    await input(chat,c.input,JSON.stringify({commands:c.commands}));
    const state = await reply(chat,c.prose,[JSON.stringify(c.report)]);
    assert.equal(state.scene.at,c.at);
    const name = c.report.deltas.at(-1).name;
    const objects = Object.values(state.objects).filter(o => o.name === name);
    if (c.case === 'remote') {
        assert.deepEqual(objects, []);
        const text = 'I take the clay bowl from the camp below.';
        const out = await input(chat,text,JSON.stringify({commands:[{seq:1,type:'take',object:{new:name},quote:text}]}));
        assert.deepEqual(out.auth.take, []);
        assert.equal(out.resolutions[0].status,'refused');
    } else {
        assert.deepEqual(objects.map(o => o.holder),[{loc:c.at}]);
        assert.equal(state.places[c.at].camp_stock,undefined);
    }
});

test('Original sighting, deliberate TAKE and revisit, including both archived extractor repairs',async () => {
    const chat = structuredClone(archive.slice(0,43));
    let stockId;
    for (const turn of [2,3,4]) {
        const original = responses.filter(r => r.turn === turn);
        const out = await input(chat,archive[chat.length].mes,original.find(r => r.role === 'planner').text);
        const s = await reply(chat,original.find(r => r.role === 'narrator').text,original.filter(r => r.role === 'extractor').map(r => r.text));
        const at = s.scene.at;
        const pots = Object.values(s.objects).filter(o => /cooking pot/i.test(o.name));
        if (turn === 2) {
            assert.notEqual(at,out.camp.origin);
            assert.deepEqual(pots.map(o => o.holder),[{loc:at}]);
            stockId = pots[0].id;
            assert.deepEqual(chat.at(-1).extra.avereth.rejected.filter(r => r.rule === 'camp_stock').map(r => r.seq),[2,4]);
        } else {
            assert.deepEqual(pots.map(o => [o.id,o.holder]),[[stockId,{entity:'pc'}]]);
        }
        assert.deepEqual(s.places[at].camp_stock,[stockId]);
    }
});


test('An unconfirmed GO and an ambiguous here cannot place the notice',async () => {
    const c = cases.find(r => r.case === 'mixed');
    for (const arrived of [false,true]) {
        const chat = structuredClone(archive.slice(0,43));
        await input(chat,c.input,JSON.stringify({commands:c.commands}));
        const report = structuredClone(c.report);
        report.scene = 'here';
        if (!arrived) {
            report.expected['2'] = {arrived:false,at:null};
            report.deltas.shift();
        }
        const words = arrived ? 'Alaric reaches Ashbridge. He remembers a printed market notice.' : 'He never gets there.';
        const result = await reply(chat,words,[JSON.stringify(report)]);
        assert.ok(!Object.values(result.objects).some(o => o.name === report.deltas.at(-1).name));
    }
});

test('Revisit free flag follows the saved active storm hazard', () => {
    const s = fold(archive.slice(0,47)); // after natural TAKE, just before the revisit
    const view = () => campInspection(s,archive[47].mes);
    assert.equal(view().free,false);
    const hazards = Object.values(s.features).filter(f => f.at === s.scene.at && f.status === 'active' && ['obstacle','hazard'].includes(f.kind));
    assert.deepEqual(hazards.map(f => f.name),['gathering storm']);
    delete s.features[hazards[0].id]; // counterfactual on the folded copy only
    assert.equal(view().free,true);
});


test('Discarding the lookout reply discards its object; regenerate books it only once',async () => {
    const c = cases.find(r => r.case === 'lookout');
    const chat = structuredClone(archive.slice(0,43));
    await input(chat,c.input,JSON.stringify({commands:c.commands}));
    const planEvents = structuredClone(chat.at(-1).extra.avereth.events);
    const marker = s => Object.values(s.objects).filter(o => o.name === c.report.deltas[0].name);
    const original = await reply(chat,c.prose,[JSON.stringify(c.report)]);
    assert.equal(marker(original).length,1);
    for (const type of ['swipe','regenerate']) {
        chat.pop();
        await E.runtime.prepareGenerationAsync(chat,E.content,{type,llm:async () => assert.fail('reused input must not be replanned')});
        assert.deepEqual(chat.at(-1).extra.avereth.events,planEvents);
        assert.deepEqual(marker(fold(chat)),[]);
        const revised = type === 'regenerate' ? c.report : {...c.report,deltas:[]};
        const words = type === 'regenerate' ? c.prose : 'The grass on the rise is bare.';
        const saved = await reply(chat,words,[JSON.stringify(revised)]);
        assert.deepEqual(marker(saved),type === 'regenerate' ? marker(original) : []);
    }
});
