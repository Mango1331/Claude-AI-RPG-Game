// Patch 10A.2: V4 player-facing messages hide routine engine bookkeeping, not actionable errors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, loadContent } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { playerFacingLines, showPanel } from '../../src/host.js';
import { runCommands } from '../../src/commands.js';

const content = await loadContent();
const tech = [
    '\x60UNDERSTOOD — "I travel north" → go (allowed)\x60',
    '\x60UNDERSTOOD — "I wave" → other (booked)\x60',
    '\x60NOT A DECISION — "I wonder" (other: guard)\x60',
    '\x60ENGINE REFUSED 2 reported changes (engine_owned_fact, non_canon_fact): see #audit or the event export\x60',
    '\x60NOT APPLIED — Alaric bought food without a decision (Alaric had not decided that)\x60',
    '\x60NON-CANON FACT — redundant bookkeeper assertion\x60',
    '\x60TIME — travel for 120 min\x60',
].join('\n');

test('10A.2: routine report rejections are invisible, but still present in the raw panel record', () => {
    const msg = { mes: 'The road continues.', extra: { avereth: { v: 3, panel: tech } } };
    showPanel(msg, tech, '<details class="avereth-hud">HUD</details>', { playerFacing: true });
    assert.equal(msg.extra.avereth.panel, tech, 'raw audit text is retained');
    assert.doesNotMatch(msg.extra.display_text, /ENGINE REFUSED|NOT APPLIED|NOT A DECISION|UNDERSTOOD|NON-CANON FACT|TIME —/);
    assert.equal(msg.extra.display_text, 'The road continues.\n\n<details class="avereth-hud">HUD</details>', 'no empty System card');
});

test('10A.2: player action failures, uncertainty, serious recording failures and rewards stay visible', () => {
    const panel = [
        '\x60UNDERSTOOD — "I enter the locked hall" → go (refused: door is locked)\x60',
        '\x60UNDERSTOOD — "I attack the wolf" → use_skill (unclear: which wolf?)\x60',
        '\x60COMBAT — not possible: target out of range. Nothing spent, nothing rolled.\x60',
        '\x60CHECK — Search: 50% · d100 40 → SUCCESS\x60',
        '\x60COIN +30 Copper → 8 Silver\x60',
        '\x60WORLD NOT RECORDED — extractor failed. Nothing of this reply changed the game state; swipe to retry, or go on.\x60',
    ].join('\n');
    const msg = { mes: 'The gate does not budge.', extra: {} };
    showPanel(msg, panel, '', { playerFacing: true });
    const visible = msg.extra.display_text;
    assert.match(visible, /ACTION NOT POSSIBLE — "I enter the locked hall" → go: door is locked/);
    assert.match(visible, /ACTION NEEDS CLARIFICATION — "I attack the wolf" → use_skill: which wolf\?/);
    assert.match(visible, /target out of range/);
    assert.match(visible, /CHECK — Search/);
    assert.match(visible, /COIN \+30 Copper/);
    assert.match(visible, /WORLD NOT RECORDED/);
    assert.match(visible, /swipe to retry/);
});

test('10A.2: explicit System target questions and V3 presentation remain unaffected', () => {
    const question = '[SYSTEM // COMBAT — TARGET NEEDED]\nWhich target, Wolf A or Wolf B? Nothing was spent.';
    const msg = { mes: 'Narration.', extra: {} };
    showPanel(msg, question);
    assert.match(msg.extra.display_text, /TARGET NEEDED/);
    assert.match(msg.extra.display_text, /Wolf A or Wolf B/);
    const legacy = { mes: 'Narration.', extra: {} };
    showPanel(legacy, tech);
    assert.match(legacy.extra.display_text, /ENGINE REFUSED 2/);
});

test('10A.2: an explicitly requested #audit shows recorded rejection rules and their reasons', () => {
    const g = new Game(content).ranger();
    applyEvent(g.state, { t: 'delta.rejected', d: { rule: 'engine_owned_fact', reason: 'Quest XP is engine-owned; no new XP was awarded.' } });
    const r = runCommands(g.state, content, '#audit');
    assert.match(r.panels.join('\n'), /Rejected world report \[engine_owned_fact\]: Quest XP is engine-owned/);
});
