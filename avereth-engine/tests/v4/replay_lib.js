// A recorded V4 live run (tests/v4/live_0930*.json: player messages with the interpreter's commands, replies with the
// extractor's answers) replayed through the product's host path, with a hook per message: the Gen 3.5 tests and the
// differential tools (tools/v4_diff.mjs) read the engine block, the records and the state of every step. The run's
// own replay tests keep their special cases (a message whose route changed, the fight to its end); this generic
// replay plays the recorded messages as they are and stops the story where the run's fight began.
import { Chat4 } from './harness.js';
import { turnBlock } from '../../src/host.js';

/**
 * @param {object} content
 * @param {object} fx a fixture ({seed, greeting, creation, listings, turns})
 * @param {{onPlayer?: (step) => void, onReply?: (step) => void, maxTurns?: number}} [hooks]
 * @returns {Promise<{g: Chat4, steps: object[]}>}
 */
export async function replayRun(content, fx, { onPlayer = null, onReply = null, maxTurns = Infinity } = {}) {
    const g = new Chat4(content, { seed: fx.seed, greeting: fx.greeting, listings: fx.listings });
    for (const m of fx.creation || []) await g.player(m);
    const steps = [];
    let story = true;
    let n = 0;
    for (const t of fx.turns || []) {
        if (n++ >= maxTurns) break;
        if (t.player !== undefined) {
            const before = g.state();
            const prep = await g.player(t.player, t.commands || []);
            const u = g.chat.length - 1 - (prep.action === 'panels' ? 1 : 0);
            const ctx = prep.action === 'context' ? turnBlock(g.chat, u, content, {}).context : null;
            const step = { i: t.i, kind: 'player', text: t.player, action: prep.action, before, block: ctx?.text ?? null, sections: ctx?.sections ?? null, tokens: ctx?.tokens ?? null, record: g.record(u), state: g.state() };
            steps.push(step);
            story = prep.action === 'context';
            onPlayer?.(step);
        } else if (story) {
            const r = await g.reply(t.reply, t.answer ?? { expected: {}, deltas: [] });
            const step = { i: t.i, kind: 'reply', record: r.record, state: g.state() };
            steps.push(step);
            onReply?.(step);
        }
    }
    return { g, steps };
}
