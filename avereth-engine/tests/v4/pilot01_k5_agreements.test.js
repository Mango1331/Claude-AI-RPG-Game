// K5 + D1 (pilot 01 B3/B4, FACHPLAN_PILOT01_KORREKTUREN §6, GPT review §2 B): an agreement (promise, debt) keeps the
// words it was agreed in; its id reports it, never another matter. A report under its id naming another party is
// refused (T58: Muller's debt to Hesse under the id of his promised copper; T61: the same carter under a second id); a
// settlement needs one of its own people here or named in the report, never its id alone. No `latest` wording, no
// party added by another matter. What the engine cannot tell apart (another matter of the same people) stays the
// extractor's: K5a states the same matter, reports and settlement in the thread summary.
// Originals: T17 (I34) Hessa, T21/T23 (I42/I46) Dodd, T46 (I88) and T58 (I116) thread.t34.1, T61 (I122) the carter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { foldChat } from '../../src/host.js';
import { pilot, upTo, replyCase, chainCase, events, rejected, valid } from './pilot01_lib.js';

const content = await loadProductContent();
const before = (i) => foldChat(upTo(i).slice(0, i)).state;
const threadSet = (r, id) => events(r, 'thread.set').map((e) => e.d.thread).filter((t) => t.id === id);
const identity = (r) => rejected(r).filter((e) => e.d.item?.type === 'thread' && /thread identity/.test(e.d.reason));
const answerWith = (i, thread) => {
    const a = structuredClone(pilot[i].extra.avereth.extraction.raw);
    a.deltas = [...a.deltas.filter((d) => d.type !== 'thread'), { scene: null, seq: 99, type: 'thread', resolution: null, ...thread }];
    return JSON.stringify(a);
};

test('K5 original T58: the debt to Hesse reported under thread.t34.1 does not become the words of Muller\'s promised copper', async () => {
    const was = before(116).threads['thread.t34.1'];
    const { chat, r } = await replyCase(content, 116);
    const t = valid(chat, content).threads['thread.t34.1'];
    assert.equal(t.text, was.text, 'the agreement keeps its words');
    assert.doesNotMatch(t.text, /Hesse|forty silver/);
    assert.equal(t.status, 'open');
    assert.ok(!('latest' in t), 'no unchecked latest wording');
});

test('K5 original T46: a reworded report of the copper under its id keeps the words of T36', async () => {
    const was = before(88).threads['thread.t34.1'];
    const { chat } = await replyCase(content, 88);
    assert.equal(valid(chat, content).threads['thread.t34.1'].text, was.text);
});

test('K5 original T17: the scene at Hessa\'s door reported under the id of her T11 report does not replace its words', async () => {
    const was = before(34).threads['thread.t11.1'];
    const { chat } = await replyCase(content, 34);
    const t = valid(chat, content).threads['thread.t11.1'];
    assert.equal(t.text, was.text);
    assert.doesNotMatch(t.text, /met at her mill door/);
    // known limit: the T11 report stays a promise (an extractor classification, K5a); Alaric is added as its party by
    // the existing R7 rule because Hessa is here with him
    assert.deepEqual(t.who, ['npc.widow_hessa', 'pc']);
});

test('K5 D1: a report under the id naming another person as its party is another matter: refused, parties unchanged', async () => {
    const was = before(116).threads['thread.t47.1'];
    const { chat, r } = await replyCase(content, 116, { answer: answerWith(116, { id: 'thread.t47.1', kind: 'promise', status: 'open', text: 'Muller promises Alaric a seat on the peat wagon', who: ['npc.muller', 'pc'] }) });
    assert.equal(identity(r).length, 1, rejected(r).map((e) => e.d.reason).join(' | '));
    assert.match(identity(r)[0].d.reason, /agreement of npc\.npccarter_woolpack; a report naming npc\.muller is another matter/);
    const t = valid(chat, content).threads['thread.t47.1'];
    assert.deepEqual([t.text, t.who, t.status], [was.text, was.who, was.status]);
});

test('K5 original T61: the carter under a second id settles nothing of the agreement with the Woolpack carter', async () => {
    const { chat, r } = await replyCase(content, 122);
    assert.equal(identity(r).length, 1);
    assert.match(identity(r)[0].d.reason, /thread\.t47\.1 is the agreement of npc\.npccarter_woolpack; a report naming npc\.carter/);
    const t = valid(chat, content).threads['thread.t47.1'];
    assert.equal(t.status, 'open', 'known limit: the ride was given, but by an id that is not his');
    assert.deepEqual(t.who, ['npc.npccarter_woolpack', 'pc'], 'no party from the duplicate');
});

test('K5 D1: a settlement by id alone, none of its people here or named, is refused; named, it settles', async () => {
    // at the crossroads cairn (I124) Muller is not present
    assert.deepEqual(before(124).scene.present, ['pc']);
    const bare = await replyCase(content, 124, { answer: answerWith(124, { id: 'thread.t34.1', kind: 'debt', status: 'resolved', text: 'The copper was paid in full', resolution: 'paid', who: null }) });
    assert.equal(identity(bare.r).length, 1);
    assert.equal(valid(bare.chat, content).threads['thread.t34.1'].status, 'open');
    const copied = await replyCase(content, 124, { answer: answerWith(124, { id: 'thread.t34.1', kind: 'debt', status: 'resolved', text: 'The copper was paid in full', resolution: 'paid', who: ['npc.muller', 'pc'] }) });
    assert.equal(identity(copied.r).length, 1, 'a copy of its parties is no proof');
    const named = await replyCase(content, 124, { answer: answerWith(124, { id: 'thread.t34.1', kind: 'debt', status: 'resolved', text: 'Muller paid the copper he had put in for the gnasher', resolution: 'Muller paid Alaric', who: null }) });
    assert.equal(identity(named.r).length, 0);
    const t = valid(named.chat, content).threads['thread.t34.1'];
    assert.equal(t.status, 'resolved');
    assert.equal(t.text, before(124).threads['thread.t34.1'].text, 'a settlement keeps the words');
});

test('K5 counter: Dodd\'s ride T16→T21→T23 keeps its words, is settled with him, parties unchanged', async () => {
    const chat = await chainCase(content, 42, 46);
    const t = valid(chat, content).threads['thread.t16.1'];
    assert.match(t.text, /^Wat Dodd offers Alaric a free ride to Ashbridge/);
    assert.equal(t.status, 'resolved');
    assert.match(t.resolution, /delivered him to Ashbridge/);
    assert.deepEqual(t.who, ['npc.npccarter_hazel', 'pc']);
});

test('K5 counter: the debt to Hesse reported as a new thread (id null, as K5a asks) is its own thread; t34.1 untouched', async () => {
    const was = before(116).threads['thread.t34.1'];
    const { chat, r } = await replyCase(content, 116, { answer: answerWith(116, { id: null, kind: 'debt', status: 'open', text: "Muller owes forty silver to Garvin Hesse; Hesse's men will seize the mill on a third visit", who: ['npc.muller'] }) });
    const s = valid(chat, content);
    const made = events(r, 'thread.set').map((e) => e.d.thread);
    assert.equal(made.length, 1);
    assert.notEqual(made[0].id, 'thread.t34.1');
    assert.deepEqual(s.threads[made[0].id].who, ['npc.muller']);
    assert.deepEqual(s.threads['thread.t34.1'], was);
});

test('K5 counter: a thread that is no agreement (a rumour) still takes its better words by id', async () => {
    const { chat, r } = await replyCase(content, 116, { answer: answerWith(116, { id: 'thread.t43.1', kind: 'rumor', status: 'open', text: 'The west road ford is running high; the ferryman takes only those who pay double' }) });
    assert.equal(identity(r).length, 0);
    assert.equal(threadSet(r, 'thread.t43.1').length, 1);
    assert.match(valid(chat, content).threads['thread.t43.1'].text, /pay double/);
});

test('K5a: the thread summary names the same matter, a report and the settlement in a trade', () => {
    const t = content.deltaVocab.deltas.find((d) => d.type === 'thread').summary;
    assert.match(t, /the same matter is the same parties and the same thing promised or owed: another promise or debt, even of the same person \(a debt of theirs to someone else\), is a new thread with id null/);
    assert.match(t, /a promise kept, a debt paid, also when it is paid as part of a trade/);
    assert.match(t, /Not: a report about someone \(they sent for help, they are ill, they owe someone else: a fact or a rumor\)/);
    assert.match(t, /pc = Alaric only when he himself promised or is owed/);
});
