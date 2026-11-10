// K4 + D2 (pilot 01 B8, FACHPLAN_PILOT01_KORREKTUREN §5, GPT review §2 D): a met / handled_by quote joining several
// literal places of the reply ("..." or across a sentence end) counts when one place alone passes every R1/R2 rule,
// checked against the original prose (framing, negation, plan, memory, hearsay, identity, presence, doer). D2: checked,
// pressed, sealed and pulled handle a step only with the desk thing in their own clause; "she" is never Alaric.
// Originals: T24 (I48) the clerk's return and turn-in, T33 (I66) her return, T26 (I52) the acceptance, T7 (I14).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { metEvidence, deskHandlingEvidence, personProfile } from '../../src/v4/narration_evidence.js';
import { pilot, replyCase, rejected, events, valid } from './pilot01_lib.js';

const content = await loadProductContent();
const CLERK = 'npc.npcashbridge_clerk';
const clerk = personProfile({ id: CLERK, names: [], nameWords: [], role: 'clerk', look: ['broad woman with gray-streaked hair', 'counts coins into a leather tray at the front desk'] });
const self = ['Alaric Red', 'Alaric'];
const HALL = ["Adventurers' Guild hall, Ashbridge"];
const met = (prose, ev) => metEvidence(prose, ev, CLERK, [clerk], { here: HALL, self });
const desk = (prose, ev) => deskHandlingEvidence(prose, ev, CLERK, [clerk], { self });

test('K4 original T24: her return is booked by the narrated part of the joined quote; the turn-in teaches her his completion', async () => {
    const { chat, r } = await replyCase(content, 48);
    assert.equal(rejected(r, 'met_evidence').length, 0, rejected(r, 'met_evidence').map((e) => e.d.reason).join(' | '));
    assert.equal(rejected(r, 'desk_handler').length, 0, rejected(r, 'desk_handler').map((e) => e.d.reason).join(' | '));
    const s = valid(chat, content);
    assert.ok(s.scene.present.includes(CLERK));
    assert.ok(events(r, 'knowledge.gained').some((e) => e.d.who === CLERK && e.d.about === 'f.pc.completed.quest.cull_the_millpond_gnasher'));
    // her manner (100 characters) is now judged as an anchor of someone present, not refused as absent
    assert.ok(!rejected(r, 'anchor_absent').length && rejected(r).some((e) => e.d.rule === 'anchor_value'));
});

test('K4 original T33: her return by the narrated first part of "… leather tray... She glanced up …"', async () => {
    const { r } = await replyCase(content, 66);
    assert.equal(rejected(r, 'met_evidence').length, 0);
});

test('K4/D2 original T26: "She listened, nodded once, and pulled a fresh slip across the desk" is her acceptance of the contract', async () => {
    const { r } = await replyCase(content, 52);
    assert.equal(rejected(r, 'desk_handler').length, 0, rejected(r, 'desk_handler').map((e) => e.d.reason).join(' | '));
    assert.ok(events(r, 'knowledge.gained').some((e) => e.d.who === CLERK && /^f\.pc\.accepted\./.test(e.d.about)));
});

test('K4 unchanged: T7 "She dipped the quill …" before the reply names her stays refused (§8 pronoun rule)', async () => {
    const { r } = await replyCase(content, 14);
    assert.ok(rejected(r, 'desk_handler').some((e) => /no one is named before the pronoun/.test(e.d.reason)));
});

test('K4 guard: a part that is dialogue, denied, remembered or hearsay is no evidence; another part must carry it alone', () => {
    const prose = `${pilot[48].mes}\n\nThe clerk had not been at the desk that morning. He remembered how the clerk had waved him over in spring. Word was the clerk sat at the desk at dawn.`;
    assert.equal(met(prose, '"The millpond man." ... "Turn-in?"').ok, false, 'dialogue only');
    assert.equal(met(prose, 'The clerk had not been at the desk that morning ... "Turn-in?"').ok, false, 'a denial and dialogue');
    assert.equal(met(prose, 'He remembered how the clerk had waved him over in spring ... "Turn-in?"').ok, false, 'a memory');
    assert.equal(met(prose, 'Word was the clerk sat at the desk at dawn ... "The millpond man."').ok, false, 'hearsay');
    assert.equal(met(prose, 'He remembered how the clerk had waved him over in spring ... the clerk looked up, and recognition crossed her face').ok, true, 'the narrated part alone');
});

test('D2 guard: the new verbs need the desk thing in their clause; Alaric and a mere tray are no handling', () => {
    const prose = 'The clerk looked up as Alaric came to the desk. She pulled the tray closer and checked the window. Alaric checked the slip against his notes. She pressed the Guild\'s seal into the wax.';
    assert.equal(desk(prose, 'She pulled the tray closer and checked the window').ok, false);
    assert.match(desk(prose, 'Alaric checked the slip against his notes').why, /Alaric does it/);
    assert.equal(desk(prose, "She pressed the Guild's seal into the wax").ok, true);
    const noClerk = 'Alaric came to the desk. She pressed the seal into the wax.';
    assert.equal(desk(noClerk, 'She pressed the seal into the wax').ok, false, 'she never means Alaric: no one else is named');
});

test('K4 the parts of a quote are the reply\'s literal places; single quotes stay one part', async () => {
    const { evidenceParts } = await import('../../src/v4/narration_evidence.js');
    assert.deepEqual(evidenceParts('a broad clerk counted coins into a tray ... the clerk looked up, and recognition crossed her face. "The millpond man."'),
        ['a broad clerk counted coins into a tray', 'the clerk looked up, and recognition crossed her face.', 'The millpond man.']);
    assert.deepEqual(evidenceParts('The clerk at the long counter looked up'), ['The clerk at the long counter looked up']);
});
