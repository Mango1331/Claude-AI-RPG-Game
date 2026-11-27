import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {loadProductContent} from '../helpers.js';
import {parseExtraction} from '../../src/v4/extract.js';
import {processReplyAny, runExtraction} from '../../src/v4/runtime.js';
import {rec} from '../../src/host.js';
import {Chat4} from './harness.js';

const content = await loadProductContent();
const fact = {seq:1,type:'fact',s:'pc',p:'observation',o:'The gate is blue.'};
const report = {expected:{},deltas:[fact]};
const parse = (text, keys = {}) => parseExtraction(text,content.deltaVocab,{},keys);

async function conversation(answers, prose = 'The gate is blue.') {
    const g = new Chat4(content);
    await g.player('Mage');
    await g.player('Flame Lance and Arcane Ward');
    await g.player('What color is the gate?', []);
    const id = g.chat.push({is_user:false,mes:prose,extra:{}}) - 1;
    processReplyAny(g.chat,id,content);
    const calls = [];
    const llm = async req => {
        calls.push(req.purpose);
        const answer = answers.shift();
        if (answer instanceof Error) throw answer;
        return answer;
    };
    await runExtraction(g.chat,id,content,llm);
    await runExtraction(g.chat,id,content,llm);
    return {calls,record:rec(g.chat[id])};
}
for (const [label,first,next] of [
    ['empty','','extract_repair'], ['temporary transport',new Error('network failure'),'extract_recovery'],
    ['unusable JSON','{gibberish','extract_repair'],
]) test('conversation recovers once after '+label, async () => {
    const {calls,record} = await conversation([first,JSON.stringify(report)]);
    assert.deepEqual(calls,['extract',next]);
    assert.equal(record.events.filter(e=>e.t==='fact.asserted').length,1);
});
test('extra root information is audited by name, independent deltas commit once', async () => {
    const text = JSON.stringify({...report,memory:{text:'unbooked secret'},deltas:[fact,{seq:2,type:'creature'}]});
    const {record,calls} = await conversation([text]);
    assert.deepEqual(calls,['extract']);
    assert.deepEqual(record.extraction.llm[0].discarded_root,['memory']);
    assert.deepEqual(record.extraction.raw.deltas.map(d=>d.type),['fact']);
    assert.equal(record.events.filter(e=>e.t==='fact.asserted').length,1);
    assert.ok(!JSON.stringify(record).includes('unbooked secret'));
    assert.equal(parse(text,{'1':'go'}).complete,false);
});
for (const text of [
    '{"expected":{},"deltas":[],"other":{"deltas":[]}}',
    '{"expected":{},"deltas":[],"other":[{"seq":1,"type":"fact"}]}',
    '{"expected":{},"deltas":[],"memory":null,"memory":42}',
    '{"expected":{},"deltas":{},"memory":null}',
    '{"expected":{},"memory":null}',
    '```json\n{"expected":{},"deltas":[],"memory":null}\n```\n```json\n{}\n```',
]) test('ambiguous or incomplete report remains invalid '+text.slice(15,55),()=>assert.equal(parse(text).valid,false));

for (const [label,i] of [['b17-warrior',284],['b18-warrior',64]]) {
    test('archived type aliases receive the canonical schema in '+label+'#'+i,()=>{
        const corpus = JSON.parse(gunzipSync(fs.readFileSync(new URL('../replay/corpus/'+label+'.json.gz',import.meta.url))));
        const raw = JSON.parse(corpus.answers[i][0].content);
        for (const delta of raw.deltas.filter(d=>['creature','object'].includes(d.type))) {
            const canonical = {...delta,type:delta.type+'.new'};
            const run = d => parse(JSON.stringify({expected:{},deltas:[d]}));
            const reference = run(canonical);
            const alias = run(delta);
            assert.deepEqual(alias.value,reference.value);
            assert.deepEqual(alias.rejected,reference.rejected);
        }
    });
}
test('person alias and unknown spellings remain subject to the original schema',()=>{
    const run = type => parse(JSON.stringify({expected:{},deltas:[{seq:1,type}]}));
    assert.deepEqual(run('person').rejected,run('person.new').rejected);
    assert.equal(run('person').value.deltas.length,0);
    assert.equal(run('Person').rejected[0].delta.type,'Person');
});
test('a complete person alias enters the scene with the canonical identity', async () => {
    const d = {seq:1,type:'person',ref:'porter',name:'Rosa',role:'porter',desc:['a porter'],
        present:true,relevant:true,threat:false,at:null,band:'SHORT'};
    const {calls,record} = await conversation([JSON.stringify({expected:{},deltas:[d]})], 'Rosa, a porter, steps forward.');
    assert.deepEqual(calls,['extract']);
    assert.equal(record.events.filter(e=>e.t==='entity.created' && e.d.entity.name==='Rosa').length,1);
    assert.equal(record.events.filter(e=>e.t==='scene.entered').length,1);
});
