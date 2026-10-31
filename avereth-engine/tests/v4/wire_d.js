// Scripted pre-D fixture adapter, offline only; malformed current-contract tests use World directly.
import {applyWorld as world} from '../../src/v4/world.js';
import {gearContract} from '../../tools/replay/contract_d.mjs';
export const applyWorld=(s,c,a,opts)=>world(s,c,gearContract(a,c),opts);
