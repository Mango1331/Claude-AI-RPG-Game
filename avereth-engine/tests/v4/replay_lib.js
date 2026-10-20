// A recorded V4 live run (tests/v4/live_0930*.json: player messages with the interpreter's commands, replies with the
// extractor's answers) replayed through the product's host path, with a hook per message: the Gen 3.5 tests and the
// differential tool (tools/v4_diff.mjs) read the engine block, the records and the state of every step. The run's
// own replay tests keep their special cases (a message whose route changed, the fight to its end); this generic
// replay plays the recorded messages as they are and stops the story where the run's fight began.
import { performance } from 'node:perf_hooks';
import { Chat4 } from './harness.js';
import { turnBlock } from '../../src/host.js';

// Patch 7.2B (delta-0.98): a group's ref in hostile, intent, aware or position commits all of the group only with scope
// "all". The runs were recorded under the older contract, where the ref alone meant all of it; the three group refs
// they hold each name the whole group in the reply's own words (checked: the engine refuses an evidence quote the
// reply does not hold), so they are replayed as the extractor writes them now. Nothing else of an answer changes.
const CONTRACT_098 = new Map([
    ['26 mon.roadwolves_1', { scope: 'all', evidence: 'The wolves on the ridge came down the rocks together' }],
    ['18 npc.bog_strider_flankers', { scope: 'all', evidence: 'two more long-legged silhouettes slide sideways through them, low and deliberate, cutting off the plank path' }],
    ['22 cre.boar_pair', { scope: 'all', evidence: 'The boars had not lifted their heads' }],
]);
/** A recorded turn's extractor answer in the delta-0.98 form (see CONTRACT_098). */
export function answerOf(t) {
    const a = t.answer ?? { expected: {}, deltas: [] };
    return { ...a, deltas: (a.deltas || []).map((d) => {
        const ref = d.type === 'hostile' ? (d.by || []).find((x) => CONTRACT_098.has(`${t.i} ${x}`)) : d.who;
        const up = ['hostile', 'intent', 'aware', 'position'].includes(d.type) ? CONTRACT_098.get(`${t.i} ${ref}`) : null;
        return up ? { ...d, ...up } : d;
    }) };
}

/**
 * @param {object} content
 * @param {object} fx a fixture ({seed, greeting, creation, listings, turns})
 * @param {{onPlayer?: (step) => void, onReply?: (step) => void, maxTurns?: number, Chat?: Function, block?: Function}} [hooks]
 *   Chat, block: another engine tree's harness and host (the differential tool replays an older tree with this driver)
 * @returns {Promise<{g: Chat4, steps: object[]}>} each step with `ms`, the engine's time for the message (host path)
 */
export async function replayRun(content, fx, { onPlayer = null, onReply = null, maxTurns = Infinity, Chat = Chat4, block = turnBlock } = {}) {
    const g = new Chat(content, { seed: fx.seed, greeting: fx.greeting, listings: fx.listings });
    for (const m of fx.creation || []) await g.player(m);
    const steps = [];
    let story = true;
    let n = 0;
    for (const t of fx.turns || []) {
        if (n++ >= maxTurns) break;
        if (t.player !== undefined) {
            const before = g.state();
            // the fight, as the run's own replays play it: the dice may have felled another opponent than in the run;
            // a command against one that is down goes to one still standing (the run's tests do the same per run)
            let text = t.player;
            if (before.encounter) {
                const hostiles = Object.values(before.encounter.combatants).filter((c) => c.side === 'hostile');
                const standing = hostiles.filter((c) => !c.current.defeated && !c.current.escaped && !c.current.surrendered);
                const word = (label) => new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                const named = hostiles.filter((c) => c.label && word(c.label).test(text)).sort((a, b) => b.label.length - a.label.length)[0];
                if (named && !standing.includes(named) && standing.length) text = text.replace(word(named.label), standing[0].label);
            }
            const t0 = performance.now();
            const prep = await g.player(text, t.commands || []);
            const ms = performance.now() - t0;
            const u = g.chat.length - 1 - (prep.action === 'panels' ? 1 : 0);
            const ctx = prep.action === 'context' ? block(g.chat, u, content, {}).context : null;
            const step = { i: t.i, kind: 'player', text, action: prep.action, ms, u, before, block: ctx?.text ?? null, sections: ctx?.sections ?? null, tokens: ctx?.tokens ?? null, record: g.record(u), state: g.state() };
            steps.push(step);
            story = prep.action === 'context';
            onPlayer?.(step, g);
        } else if (story) {
            const t0 = performance.now();
            const r = await g.reply(t.reply, answerOf(t));
            const step = { i: t.i, kind: 'reply', ms: performance.now() - t0, record: r.record, state: g.state() };
            steps.push(step);
            onReply?.(step, g);
        }
    }
    return { g, steps };
}
