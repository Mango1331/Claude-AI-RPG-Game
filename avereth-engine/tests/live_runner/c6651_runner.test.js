// 4.3.0-c.6.6.51: the engine asks the planner with 2000 tokens, the extractor with 4000 and the Forge with 1500
// (src/v4/runtime.js LLM). The call table tells the roles by their prompts; a call whose prompt it does not know is
// told by its limit, the new ones and those of the runs before .51.
import test from 'node:test';
import assert from 'node:assert/strict';
import { roleOf } from '../../tools/st_live/live/calls.mjs';
import { LLM } from '../../src/v4/runtime.js';

test('.51 runner: an unknown prompt is told by the new limits as by the old ones; the prompts still decide first', () => {
    const other = (max_tokens) => roleOf({ messages: [{ role: 'system', content: 'Something else.' }], max_tokens });
    assert.deepEqual([LLM.plan.maxTokens, LLM.extract.maxTokens, LLM.forge.maxTokens].map(other), ['plan', 'extract', 'forge']);
    assert.deepEqual([900, 2500, 3000].map(other), ['plan', 'extract', 'board'], 'the exports of earlier builds');
    assert.equal(roleOf({ messages: [{ role: 'system', content: 'You read one reply of the narrator.' }], max_tokens: LLM.plan.maxTokens }), 'extract');
    assert.equal(roleOf({ messages: [{ role: 'system', content: 'Name new fantasy Passives for these entries.' }], max_tokens: LLM.forge.maxTokens }), 'forge');
});
