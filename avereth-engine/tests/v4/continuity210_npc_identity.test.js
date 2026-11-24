import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {loadProductContent} from '../helpers.js';
import {turnContext} from '../../src/engine.js';
import {applyEvent} from '../../src/state.js';

const original = JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/continuity210_name_a13.json.gz',import.meta.url))));
const content = await loadProductContent();
const context = (s,input=original.input) => turnContext(s,content,{input,lastReply:original.prior,budget:1400}).text;
const observer='npc.dann', outsider='npc.mother_wren';
const old='unknown — Dann asked his name and got no answer yet';
const claimId='c.t6.m12.d5_4.1';

test('A13/N43: later personally witnessed knowledge displaces an older disproved guess on the same identity in current recall',()=>{
    const s=structuredClone(original.state);
    assert.ok(original.sent_rows.some(x=>x.includes(old)));
    assert.ok(original.sent_rows.some(x=>x.includes('knows him by name')));
    assert.ok(original.sent_rows.some(x=>x.includes('does NOT know his name')));
    const shown=context(s);
    assert.ok(shown.includes('knows him by name'));
    assert.ok(shown.includes('does NOT know his name'));
    assert.ok(!shown.includes(old));
    assert.equal(s.knowledge[observer][claimId].stance,'suspects');
    s.turn+=4;
    assert.ok(!context(JSON.parse(JSON.stringify(s)),'I ask Dann about the road.').includes(old));
});

test('non-witness, another subject, another topic and a later suspicion keep their own belief',()=>{
    const s=structuredClone(original.state);
    const claim=s.claims[claimId];
    assert.ok(!s.knowledge[outsider]['f.pc.name']);
    applyEvent(s,{t:'knowledge.gained',d:{...s.knowledge[observer][claimId],who:outsider}});
    const foreign=context(s,'I ask Mother Wren what she knows about me.');
    assert.ok(foreign.includes(old));
    assert.ok(foreign.includes('does NOT know his name'));
    const privateFact=structuredClone(original.state);
    privateFact.facts['f.pc.name'].visibility='secret';
    assert.ok(context(privateFact).includes(old));
    const hearsay=structuredClone(original.state);
    hearsay.knowledge[observer]['f.pc.name'].source='rumor';
    assert.ok(context(hearsay).includes(old));
    for(const [subject,predicate,turn] of [['npc.maren_halloran','name',6],['pc','occupation',6],['pc','name',9]]) {
        const other=structuredClone(original.state);
        const unique='an entirely different mistaken report';
        applyEvent(other,{t:'claim.created',d:{claim:{...claim,id:'c.control',s:subject,p:predicate,o:unique}}});
        applyEvent(other,{t:'knowledge.gained',d:{...other.knowledge[observer][claimId],about:'c.control',turn}});
        assert.ok(context(other).includes(unique));
    }
});
