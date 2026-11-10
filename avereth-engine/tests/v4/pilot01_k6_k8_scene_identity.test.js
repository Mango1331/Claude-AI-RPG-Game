// K6 + K8 (pilot 01 B6/B7/B11/B12, FACHPLAN_PILOT01_KORREKTUREN §7, §9; decisions D4, D6).
//   K6a: the correction after a refused scene names where Alaric is at the end of the reply, not where he stood at that
//        step (T61 → T62: "remains at the Woolpack" beside a header at the crossroads cairn).
//   K6b (D4): only the extractor guidance: a known person called by their role is that person; no merging of ids.
//   D6:  only the extractor guidance: a pack acting together is one creature.new with its count.
//   K8-1: a name fact of a person whose value is Alaric's name is a mixed-up subject (T16: "Wat Dodd name = Alaric Red").
//   K8-2: a role written as the word "null" is no role (T11: Widow Hessa's occupation and first descriptor "null").
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { foldChat } from '../../src/host.js';
import { pilot, upTo, replyCase, events, rejected, valid } from './pilot01_lib.js';

const content = await loadProductContent();
const only = (i, seqs) => {
    const a = structuredClone(pilot[i].extra.avereth.extraction.raw);
    a.deltas = a.deltas.filter((d) => seqs.includes(d.seq));
    return JSON.stringify(a);
};
const facts = (s, id, p) => Object.values(s.facts || {}).filter((f) => f.s === id && (!p || f.p === p));

test('K6a original T61: after the arrival at the crossroads the correction no longer says he remains at the Woolpack', async () => {
    const { chat, r } = await replyCase(content, 122);
    assert.ok(rejected(r, 'scene_context').length >= 1, 'the yard scene is still refused');
    assert.equal(valid(chat, content).scene.at, 'loc.crossroads_cairn_on_the_south_road');
    assert.ok(!r.corrections.some((c) => /remains at the Woolpack/.test(c)), r.corrections.join(' | '));
    assert.ok(r.corrections.some((c) => /took place in a scene the engine did not book: its people, objects and quest outcomes there were not recorded\. Alaric is at crossroads cairn on the south road; continue from there\./.test(c)));
});

test('K6a counter: a refused scene without a later arrival keeps the old correction, once', async () => {
    const { chat, r } = await replyCase(content, 122, { answer: only(122, [2]) });
    assert.equal(rejected(r, 'scene_context').length, 1);
    assert.equal(valid(chat, content).scene.at, 'loc.ashbridge.the_woolpack');
    assert.deepEqual(r.corrections.filter((c) => /other scene was not reached|did not book/.test(c)),
        ['Alaric remains at the Woolpack. The other scene was not reached: its people, objects and quest outcomes were not booked here. Continue from the canonical location; do not invent a completed journey.']);
});

test('K6b/D4 and D6: guidance only – a known person by their role is that person; a pack acting together is one creature.new', () => {
    const rules = content.deltaVocab.rules.find((x) => /^PERSON CONTINUITY/.test(x));
    assert.match(rules, /A known person the reply calls by their role \("the carter" who offered Alaric a ride, "the clerk"\) is that person: use their id \(KNOWN PEOPLE, PRESENT, THREADS\), never a person\.new; person\.new only for someone the story shows as new\./);
    const creature = content.deltaVocab.deltas.find((d) => d.type === 'creature.new').summary;
    assert.match(creature, /a pack or band the reply shows acting together is ONE creature\.new with its count \(its leader among them\), a separate one only for a creature the reply sets apart as another kind or acting on its own/);
});

test('K8-1 original T16: "name = Alaric Red" learned with the carter as its subject is refused, not his name', async () => {
    // the original learn alone (seq 2); see the patchnote for the whole answer under the test-mode ownership check
    const { chat, r } = await replyCase(content, 32, { answer: only(32, [2]) });
    assert.equal(rejected(r, 'identity_subject').length, 1);
    assert.match(rejected(r, 'identity_subject')[0].d.reason, /is Alaric's name, not .*'s: what someone learns of him is about pc/);
    const s = valid(chat, content);
    assert.equal(facts(s, 'npc.npccarter_hazel', 'name').length, 0);
    // what he really learned (Alaric told him his name, the player's message) stays: knowledge of f.pc.name, no other
    assert.deepEqual(events(r, 'knowledge.gained').map((e) => [e.d.who, e.d.about]), [['npc.npccarter_hazel', 'f.pc.name']]);
});

test('K8-1 the same as a plain fact is refused too; a name fact of his own name and what someone learns of Alaric stay', async () => {
    const answer = (deltas) => JSON.stringify({ scene: 'here', expected: {}, deltas });
    const fact = await replyCase(content, 32, { answer: answer([{ scene: null, seq: 1, type: 'fact', s: 'npc.npccarter_hazel', p: 'name', o: 'Alaric Red' }]) });
    assert.equal(rejected(fact.r, 'identity_subject').length, 1);
    const pc = await replyCase(content, 32, { answer: answer([{ scene: null, seq: 1, type: 'learn', who: 'npc.npccarter_hazel', s: 'pc', p: 'name', o: 'Alaric Red', how: 'told' }]) });
    assert.equal(rejected(pc.r).length, 0, rejected(pc.r).map((e) => e.d.reason).join(' | '));
    assert.ok(events(pc.r, 'knowledge.gained').some((e) => e.d.who === 'npc.npccarter_hazel'));
    const own = await replyCase(content, 32, { answer: answer([{ scene: null, seq: 1, type: 'fact', s: 'npc.npccarter_hazel', p: 'trade', o: 'hauls hazel poles for Alaric and others' }]) });
    assert.equal(rejected(own.r, 'identity_subject').length, 0, 'only a name fact is judged');
});

test('K8-2 original T11: Widow Hessa with role "null" gets no occupation "null" and no descriptor "null"', async () => {
    const { chat } = await replyCase(content, 22);
    const s = valid(chat, content);
    const hessa = Object.values(s.entities).find((e) => e.name === 'Widow Hessa');
    assert.ok(hessa);
    assert.ok(!hessa.descriptors.includes('null'), hessa.descriptors.join(', '));
    assert.equal(facts(s, hessa.id, 'occupation').length, 0);
    assert.deepEqual(hessa.descriptors.slice(0, 3), ['half blind', 'sent for the guild about the gnasher', "won't leave the mill"]);
});

test('K8-2 counter: a real role still becomes occupation and first descriptor', async () => {
    const a = structuredClone(pilot[22].extra.avereth.extraction.raw);
    for (const d of a.deltas) if (d.type === 'person.new') d.role = 'miller';
    const { chat } = await replyCase(content, 22, { answer: JSON.stringify(a) });
    const s = valid(chat, content);
    const hessa = Object.values(s.entities).find((e) => e.name === 'Widow Hessa');
    assert.equal(hessa.descriptors[0], 'miller');
    assert.equal(facts(s, hessa.id, 'occupation')[0]?.o, 'miller');
    assert.ok(foldChat(upTo(22).slice(0, 22)).state.entities.pc);
});
