// Build .183 – NPC E3-V-1 (recherche/NPC_E2_E3_KONTINUITAETSAUDIT_OPUS55.md §6 V-1 and GPT §9.2; natural batch
// 12./13.11.2026, testrun_10b/npc-20261112-220625Z/REVIEW.md §5, Fable §8.2/P3-8, GPT §9.3 and §11.3): the extractor's
// contract names the 80-character limit of a voice/manner/interest value, and the extractor's catalog marks who is
// present in a later encounter (the engine's own R10 test: a shared moment with Alaric before this presence began).
// A prompt change only: anchorRefusal, the firewall, E2 and D3 are unchanged; the mark grants nothing.
// The batch ZIP is not in the repository: the two natural anchor_value candidates (Rogue T33, the Guild clerk's manner,
// 103 characters; Mage T36, Hessa's voice, 92 characters) are rebuilt with their trait and length on the original
// User01 chat (Brenna back at the Glassmere desk, #66), the first-contact refusal (Warrior, Dalli) on User02 (Tam, #8).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { replyTurnV4 } from '../../src/v4/turn.js';
import { extractorCatalog, buildCatalog } from '../../src/v4/catalog.js';
import { catalogText } from '../../src/v4/interpret.js';
import { extractorSystem } from '../../src/v4/extract.js';
import { truth } from '../../src/knowledge.js';
import { applyEvent } from '../../src/state.js';
import { validateState } from '../../src/validate.js';
import { Chat4 } from './harness.js';

const content = await loadProductContent();
const u1 = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user01_e2b172.json.gz', import.meta.url)))).chat;
const u2 = zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user02_157.jsonl.gz', import.meta.url))).toString().trim().split('\n').map(JSON.parse).slice(1);
const at = (chat, i) => foldChat(structuredClone(chat), i).state;
const TAM = 'npc.npcguild_clerk', BRENNA = 'npc.npcglassmere_clerk';
const brennaBack = () => at(u1, 66); // back at the desk since turn 27; shared moments of turns 3 and 23
const tamFirst = () => at(u2, 8); // at the desk since turn 3; the first sighting is all they share
const reply = (state, deltas, prose, msg) => replyTurnV4(structuredClone(state), content, { scene: null, expected: {}, deltas }, { prose, msg });
const fact = (s, p, o, seq = 1) => ({ scene: null, seq, type: 'fact', s, p, o });
const asserted = (r) => r.events.filter((e) => e.t === 'fact.asserted').map((e) => e.d.fact);
const rules = (r) => r.events.filter((e) => e.t === 'delta.rejected' && e.d.item?.type === 'fact').map((e) => e.d.rule);
const laterLine = (s, c = true) => extractorCatalog(s, content, { c, known: c }).text.split('\n').find((l) => l.startsWith('LATER ENCOUNTER')) || null;

// the two natural candidates of the batch, rebuilt with their trait and length
const T33_MANNER = 'brisk and dry at the counter, counts every coin twice and never looks up until the ledger line is done.';
const T36_VOICE = "low and unhurried, a farm widow's voice that drops each word as if it cost her a copper each";

// ------------------------------------------------------------------------------------------------ the contract
test('.183 E3-V-1 contract: the fact description names the 80-character limit and who a trait is kept for; the extractor\'s system prompt carries it (.182: no limit named)', () => {
    const fact = content.deltaVocab.deltas.find((d) => d.type === 'fact');
    assert.match(fact.summary, /o is a short phrase of at most 80 characters/);
    assert.match(fact.summary, /kept only for someone who met Alaric before this encounter \(CATALOG LATER ENCOUNTER, or a known person returning in this reply\), never at a first meeting/);
    assert.match(fact.summary, /never this moment's mood, never Alaric's view of them/, 'the earlier rules stay');
    const system = extractorSystem(content.deltaVocab);
    assert.match(system, /at most 80 characters/);
    assert.ok(['delta-1.14', 'delta-1.15'].includes(content.deltaVocab.version), 'a precision of the text, no new contract version (delta-1.15 is .186: creature.new armed)');
});

// ------------------------------------------------------------------------------------------------ the mark
test('.183 E3-V-1 mark: Brenna back at the desk is marked LATER ENCOUNTER for the extractor; the planner\'s catalog is unchanged', () => {
    const s = brennaBack();
    assert.ok(s.scene.present.includes(BRENNA));
    const line = laterLine(s);
    assert.ok(line, 'the extractor catalog has the line');
    assert.match(line, new RegExp(`^LATER ENCOUNTER \\(present now, met Alaric before this visit\\): (?:[^ ]+ \\[[^\\]]+\\] · )*${BRENNA.replace(/\./g, '\\.')} \\[Brenna\\](?: · [^ ]+ \\[[^\\]]+\\])*\\. Only for them a lasting voice, manner or interest this reply SHOWS may be reported as a fact \\(p voice/manner/interest, o at most 80 characters`));
    const planner = catalogText(buildCatalog(s, content, { known: true, c: true }));
    assert.doesNotMatch(planner, /LATER ENCOUNTER/, 'the planner reads no E3 hint');
});

test('.183 E3-V-1 mark against: first contact (Tam), someone not present (Brenna before her return), the non-C path and a creature are never marked', () => {
    assert.equal(laterLine(tamFirst()), null, 'Tam: the first sighting is all they share (Warrior Dalli kind)');
    const away = at(u1, 61);
    assert.ok(!away.scene.present.includes(BRENNA));
    assert.ok(!(laterLine(away) || '').includes(BRENNA), 'not present: not marked');
    assert.equal(laterLine(brennaBack(), false), null, 'only the ruleset-2 C path reads anchors');
    const s = brennaBack();
    const creatures = s.scene.present.filter((id) => s.entities[id]?.kind === 'creature');
    for (const id of creatures) assert.ok(!(laterLine(s) || '').includes(id), id);
});

test('.183 E3-V-1 mark = the engine\'s R10 test: in every state of the User01 chat, a present person is marked exactly when a short lasting manner of theirs passes the first-contact and presence checks', () => {
    let checked = 0, marked = 0;
    for (let i = 40; i <= 80; i += 2) {
        const s = at(u1, i);
        if (!s.last?.outcome?.c && !s.last?.outcome?.auth?.c) continue;
        const line = laterLine(s) || '';
        for (const id of s.scene.present.filter((x) => s.entities[x]?.kind === 'npc')) {
            const r = reply(s, [fact(id, 'manner', 'dry, unhurried, keeps strangers at arm\'s length')], 'They look up.', i);
            const passes = !rules(r).some((x) => ['anchor_first_contact', 'anchor_absent'].includes(x));
            assert.equal(line.includes(`${id} [`), passes, `#${i} ${id}: mark ${line.includes(`${id} [`)}, engine ${rules(r).join(',') || 'kept'}`);
            checked++; if (passes) marked++;
        }
    }
    assert.ok(checked >= 10 && marked >= 1, `${checked} checked, ${marked} marked`);
});

// ------------------------------------------------------------------------------------------------ the engine is unchanged
test('.183 E3-V-1 natural candidates (Rogue T33 manner 103, Mage T36 voice 92): still refused as anchor_value; the same trait within 80 characters is kept', () => {
    const s = brennaBack();
    assert.equal(T33_MANNER.length, 103);
    assert.equal(T36_VOICE.length, 92);
    assert.deepEqual(rules(reply(s, [fact(BRENNA, 'manner', T33_MANNER)], u1[66].mes, 66)), ['anchor_value']);
    assert.deepEqual(rules(reply(s, [fact(BRENNA, 'voice', T36_VOICE)], u1[66].mes, 66)), ['anchor_value']);
    const short = reply(s, [fact(BRENNA, 'manner', 'brisk and dry at the counter, counts every coin twice'), fact(BRENNA, 'voice', "low and unhurried, each word weighed like a copper", 2)], u1[66].mes, 66);
    assert.deepEqual(rules(short), []);
    assert.deepEqual(asserted(short).map((f) => `${f.s} ${f.p}`).sort(), [`${BRENNA} manner`, `${BRENNA} voice`]);
});

test('.183 E3-V-1 protection unchanged: first contact, mood, Alaric\'s view and an absent person are still refused', () => {
    assert.deepEqual(rules(reply(tamFirst(), [fact(TAM, 'manner', 'dry and teasing with newcomers')], u2[8].mes, 8)), ['anchor_first_contact']);
    const s = brennaBack();
    assert.deepEqual(rules(reply(s, [fact(BRENNA, 'manner', 'irritated today')], u1[66].mes, 66)), ['anchor_mood']);
    assert.deepEqual(rules(reply(s, [fact(BRENNA, 'manner', 'warm toward Alaric, cool with everyone else')], u1[66].mes, 66)), ['anchor_value']);
    assert.deepEqual(rules(reply(at(u1, 61), [fact(BRENNA, 'manner', 'brisk and dry at the counter')], u1[62].mes, 62)), ['anchor_absent']);
});

// ------------------------------------------------------------------------------------------------ host path
test('.183 E3-V-1 host path (User01 #66): the extractor request names the limit and marks Brenna; a short manner is kept and survives a reload', async () => {
    const g = new Chat4(content);
    g.chat = u1.slice(0, 66).map((m) => structuredClone(m));
    const calls = g.calls.length;
    const r = await g.reply(u1[66].mes, { expected: {}, deltas: [fact(BRENNA, 'manner', 'brisk and dry at the counter, counts every coin twice')] });
    const req = g.calls.slice(calls).find((c) => c.purpose === 'extract');
    const text = req.messages.map((m) => m.content).join('\n');
    assert.match(text, /o is a short phrase of at most 80 characters/);
    assert.match(text, new RegExp(`\\nLATER ENCOUNTER \\(present now, met Alaric before this visit\\): [^\\n]*${BRENNA.replace(/\./g, '\\.')}`));
    assert.equal(r.record.extraction.status, 'applied', JSON.stringify(r.record.extraction));
    assert.equal(truth(g.state(), BRENNA, 'manner')[0]?.o, 'brisk and dry at the counter, counts every coin twice');
    const folded = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(folded, g.state());
    assert.equal(truth(folded, BRENNA, 'manner')[0]?.o, 'brisk and dry at the counter, counts every coin twice', 'E3 persistence after reload');
    assert.deepEqual(validateState(folded, content), []);
});

test('.183 E3-V-1 host path against (User02 #8, first contact): no LATER ENCOUNTER line in the request; a trait reported anyway is refused', async () => {
    const g = new Chat4(content);
    g.chat = u2.slice(0, 8).map((m) => structuredClone(m));
    const calls = g.calls.length;
    const r = await g.reply(u2[8].mes, { expected: {}, deltas: [fact(TAM, 'manner', 'dry and teasing with newcomers')] });
    const req = g.calls.slice(calls).find((c) => c.purpose === 'extract');
    assert.ok(req, 'the extractor was asked');
    assert.doesNotMatch(req.messages.map((m) => m.content).join('\n'), /\nLATER ENCOUNTER \(present now/, 'no catalog line (the contract text names it)');
    assert.ok(r.record.rejected?.some((x) => x.rule === 'anchor_first_contact') || rec(g.chat.at(-1)).events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'anchor_first_contact'));
});
