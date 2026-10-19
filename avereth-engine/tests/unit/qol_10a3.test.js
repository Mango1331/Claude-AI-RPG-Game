// Patch 10A.3: short character HUD and genuinely useful #audit, all without gameplay changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { characterRows } from '../../src/hud.js';
import { runCommands } from '../../src/commands.js';
import { showPanel } from '../../src/host.js';

const content = await loadContent();
const chars = (s) => Object.fromEntries(characterRows(s, content));

test('10A.3: long inventory and contract lists do not overwhelm the character HUD', () => {
    const g = new Game(content).ranger();
    // Use genuine item ids, so labels are resolved through the normal content pack.
    const items = [...content.items.keys()].slice(0, 11);
    assert.ok(items.length >= 10, 'test content needs ten distinct inventory items');
    g.state.entities.pc.sheet.inventory = Object.fromEntries(items.map((id) => [id, 1]));
    for (let i = 1; i <= 6; i++) {
        g.state.quests['quest.10a3_' + i] = { id: 'quest.10a3_' + i, title: 'Notice ' + i, status: 'offered' };
    }
    const c = chars(g.state);
    assert.match(c.Carried, new RegExp('\\\\+' + (items.length - 8) + ' more \\(#bag\\)'));
    assert.match(c.Quests, /Notice 1|Notice 2|Notice 3/);
    assert.match(c.Quests, /\+3 more \(#quests\)/);
    assert.doesNotMatch(c.Quests, /Notice 6/);
});

test('10A.3: #audit reports extractor failures and narratorial overreach instead of saying nothing happened', () => {
    const g = new Game(content).ranger();
    applyEvent(g.state, { t: 'extract.failed', d: { error: 'extractor JSON invalid', ms: 1500 } });
    applyEvent(g.state, { t: 'overreach.noted', d: { kind: 'pc_action', what: 'Alaric purchased a horse without choosing to' } });
    const audit = runCommands(g.state, content, '#audit').panels.join('\n');
    assert.match(audit, /World report FAILED: extractor JSON invalid/);
    assert.match(audit, /Narrator overreach \[pc_action\]: Alaric purchased a horse without choosing to \(not applied\)/);
    assert.doesNotMatch(audit, /No rolls or recorded world-report problems/);
    // A new turn resets only the previous turn's diagnostic entries; this doesn't alter player state.
    applyEvent(g.state, { t: 'turn.begun', d: { turn: g.state.turn + 1, input: 'Look around' } });
    const next = runCommands(g.state, content, '#audit').panels.join('\n');
    assert.doesNotMatch(next, /extractor JSON invalid|purchased a horse/);
});

test('10A.3: ambiguous player action is a warning, not a silent or ordinary status line', () => {
    const msg = { mes: 'The wolves circle.', extra: {} };
    showPanel(msg, '\x60UNDERSTOOD — "I attack" → use_skill (unclear: which wolf?)\x60', '', { playerFacing: true });
    assert.match(msg.extra.display_text, /avereth-system-warning[^>]*>ACTION NEEDS CLARIFICATION/);
    assert.match(msg.extra.display_text, /which wolf\?/);
});
