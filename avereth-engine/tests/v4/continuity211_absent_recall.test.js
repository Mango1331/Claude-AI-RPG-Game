import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {loadProductContent} from '../helpers.js';
import {turnContext} from '../../src/engine.js';
import {extractorCatalog} from '../../src/v4/catalog.js';
import {applyEvent} from '../../src/state.js';
import {npcContinuity, PC_NAME_FACT} from '../../src/knowledge.js';

const original = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/continuity211_absent_birta_b17.json.gz', import.meta.url))));
const content = await loadProductContent();
const memoryId = 'm.t22.m44.d3_3.1';
const card = s => npcContinuity(s, original.input).find(row => row.id === original.id)?.text;

test('B17: N169 and X170 present absent Birta’s memory from what she can identify, without changing the objective episode', () => {
    const s = structuredClone(original.state);
    assert.deepEqual(original.sent.map(x => x.id), [169,170]);
    assert.equal(original.sent[0].line,original.sent[1].line);
    assert.match(original.sent[0].line, /remembers: .*told Alaric flatly/);
    assert.ok(!s.knowledge[original.id][PC_NAME_FACT]);
    assert.ok(!s.scene.present.includes(original.id));
    const stored = s.memories.find(m => m.id === memoryId);
    assert.match(stored.text, /told \{pc\} flatly/);
    const expected = original.sent[0].line.replace('told Alaric flatly','told the stranger flatly');
    assert.equal(card(s), expected);
    const narrator = turnContext(s,content,{input:original.input,lastReply:original.prior,budget:1400}).text;
    const extractor = extractorCatalog(s,content,{c:true,input:original.input+'\n'+original.prose}).text;
    for(const projection of [narrator,extractor]) assert.ok(projection.includes(expected));
    assert.deepEqual(s,original.state);
});

test('An absent witness may later recognize the remembered person; someone they never saw in that episode stays unseen', () => {
    const s = structuredClone(original.state);
    applyEvent(s,{t:'knowledge.gained',d:{who:original.id,about:PC_NAME_FACT,stance:'knows',source:'told:pc',turn:s.turn,minute:s.clock.minute}});
    assert.equal(card(s),original.sent[0].line);
    s.memories.find(m => m.id === memoryId).seen = ['pc'];
    assert.match(card(s), /told someone unseen flatly/);
    assert.ok(!s.scene.present.includes(original.id));
    assert.deepEqual(s.memories.find(m => m.id === memoryId).witnesses,original.state.memories.find(m => m.id === memoryId).witnesses);
});
