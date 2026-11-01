// Build .142 (finance consolidation §9.3): scripted answers and commands of tests written before the finance contract
// (cmd-1.8 / delta-1.13) get the same disclosed translation as the replay (tools/replay/contract_f.mjs): the old
// contract's meaning (a reported bid/offer was a binding price, a coin.gift a handover now), evidence only where the
// recorded words carry the recorded number. It tests the behaviour around a deal, not the new classification of a
// fresh answer (that is tests/v4/fix142_finance.test.js).
import { financeAnswer, financePlan } from '../../tools/replay/contract_f.mjs';

/** An old extractor answer in the current protocol (state: the fold it is applied to; prose: the reply it reports). */
export const legacyAnswer = (answer, state, content, prose = null) => financeAnswer(answer, state, content, { prose });
/** Old planner commands in the current protocol. */
export const legacyCommands = (commands, content) => financePlan({ commands }, content).commands;

import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { loadProductContent } from '../helpers.js';
const product = await loadProductContent();
/** applyWorld with an old scripted answer translated first (the same call otherwise). */
export function applyWorldLegacy(state, content, answer, opts) {
    return applyWorld(state, content, legacyAnswer(answer, state, content?.deltaVocab ? content : product, opts?.prose ?? null), opts);
}
/** resolveCommands with old scripted commands translated first (the same call otherwise). */
export function resolveCommandsLegacy(s, content, commands, emit, envx) {
    return resolveCommands(s, content, legacyCommands(commands, content?.rules ? content : product), emit, envx);
}
