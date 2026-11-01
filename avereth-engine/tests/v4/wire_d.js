// Scripted pre-D fixture adapter, offline only; malformed current-contract tests use World directly.
import {applyWorld as world} from '../../src/v4/world.js';
import {gearContract} from '../../tools/replay/contract_d.mjs';
// Build .142: and the finance translation of pre-delta-1.13 answers (tests/v4/finance_legacy.js)
import {legacyAnswer} from './finance_legacy.js';
export const applyWorld=(s,c,a,opts)=>world(s,c,legacyAnswer(gearContract(a,c),s,c),opts);
