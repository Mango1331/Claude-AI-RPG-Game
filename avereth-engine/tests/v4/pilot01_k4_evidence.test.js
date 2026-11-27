import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { replyCase, rejected, events, valid } from './pilot01_lib.js';

const content = await loadProductContent();
const CLERK = 'npc.npcashbridge_clerk';
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

test('T7 links the booked desk step even when the narration uses a pronoun',async()=>{
    const {r} = await replyCase(content,14);
    assert.equal(rejected(r,'desk_handler').length,0);
});
