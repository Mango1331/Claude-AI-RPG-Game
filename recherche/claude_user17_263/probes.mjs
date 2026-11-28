// Probe definitions for User17 (selected by env U17_PROBE). Planner/narrator answers stay archived unless replaced.
import fs from 'node:fs';
const A = JSON.parse(fs.readFileSync(new URL(process.env.U17_ANSWERS || '../u17/answers.json', import.meta.url), 'utf8')).answers;
const ROOT = 'loc.old_crown_catacombs';
const probe = process.env.U17_PROBE;
const j = (x) => JSON.stringify(x);
const first18 = JSON.parse(A[18][0].content);
const repair18 = JSON.parse(A[18][1].content);
const shrine = 'Half an hour on, a small roadside shrine-chapel to the river saints stood by the ford road, its roof whole and a well beside it. Alaric stopped there to drink and rest his legs on the stone bench. The catacombs chapel was still a good way off on its rise.';
const chainT10 = j({expected: {1: {arrived: true}}, deltas: [{seq: 1, type: 'arrive', at: {new: {name: 'Landing before the iron-banded door', kind: 'interior', parent: ROOT}}}]});
const P = {
    // P1: original first answer (chapel, arrived:true); the original repair stays scripted
    P1: {stopAt: 18},
    // P2: the model's first answer is already arrived:false with the new chapel (no flip needed)
    P2: {stopAt: 18, answer: (i, p, raw) => (i === 18 && p === 'extract' ? j(repair18) : raw)},
    // P4a/b: a genuinely different chapel short of the target; correct (false) and mistaken (true) claim
    P4a: {stopAt: 18, prose: {18: shrine}, answer: (i, p, raw) => (i === 18 ? j({expected: {1: {arrived: false}}, deltas: [{seq: 1, type: 'arrive', at: {new: {name: 'Roadside shrine-chapel by the ford road', kind: 'site', parent: 'realm.valedorn_crown'}}, evidence: 'Alaric stopped there to drink'}, {seq: 2, type: 'time', during: 'travel', minutes: 30, evidence: 'Half an hour on'}]}) : raw)},
    P4b: {stopAt: 18, prose: {18: shrine}, answer: (i, p, raw) => (i === 18 ? j({expected: {1: {arrived: true}}, deltas: [{seq: 1, type: 'arrive', at: {new: {name: 'Roadside shrine-chapel by the ford road', kind: 'site', parent: 'realm.valedorn_crown'}}, evidence: 'Alaric stopped there to drink'}]}) : raw),
        extra: (i, p) => (i === 18 && p === 'extract_repair' ? j({expected: {1: {arrived: false}}, deltas: [{seq: 1, type: 'arrive', at: {new: {name: 'Roadside shrine-chapel by the ford road', kind: 'site', parent: 'realm.valedorn_crown'}}}]}) : null)},
    // P3/P7: from the bound gate, "i nod and then go down" (archived planner) with a landing told as the Dungeon's
    P3: {stopAt: 20, answer: (i, p, raw) => (i === 20 ? chainT10 : raw)},
    // P11: the exact gate name as the new place (Patch 8 entranceOf path) under the archived T9 answer otherwise
    P11: {stopAt: 18, answer: (i, p, raw) => (i === 18 && p === 'extract' ? j({...repair18, expected: {1: {arrived: true}}, deltas: repair18.deltas.map((d) => JSON.parse(JSON.stringify(d).replaceAll('Ruined chapel above the ford', 'ruined chapel')))}) : raw)},
};
const landing = (i, p, raw) => (i === 20 ? chainT10 : i === 22 ? j({...JSON.parse(raw), deltas: JSON.parse(raw).deltas.filter((d) => d.type !== 'passage')}) : raw);
P.P7 = {stopAt: 20, answer: landing};
P.P8 = {stopAt: 18, prose: {17: '*i continue onward to the catacombs entrance*'},
    answer: (i, p, raw) => (i === 17 ? j({commands: [{seq: 1, type: 'go', to: ROOT, quote: 'i continue onward to the catacombs entrance', within: null}]}) : raw)};
const user = (mes) => ({is_user: true, mes, extra: {}});
const narr = (mes) => ({is_user: false, mes, extra: {}});
P.P6 = {stopAt: 22, answer: landing,
    append: [user('*i head back to Alderwatch*'), narr('He climbed back up the spiral stair, past the chapel and out along the ford road. By early afternoon the west gate of Alderwatch stood before him, carts queuing at the toll post.')],
    synthetic: {23: [{purpose: 'plan', content: j({commands: [{seq: 1, type: 'go', to: 'loc.alderwatch', quote: 'i head back to Alderwatch', within: null}]})}],
        24: [{purpose: 'extract', content: j({expected: {1: {arrived: true}}, deltas: [{seq: 1, type: 'arrive', at: {new: {name: 'West gate of Alderwatch', kind: 'site', parent: 'realm.valedorn_crown'}}, evidence: 'the west gate of Alderwatch stood before him'}]})}]}};
for (const [k, w] of [['P12a', 'the catacombs'], ['P12b', 'the dungeon'], ['P12c', 'the ruined chapel'], ['P12d', 'the chapel stair']])
    P[k] = {stopAt: 17, answer: (i, p, raw) => (i === 17 ? j({commands: [{seq: 1, type: 'go', to: {new: w}, quote: 'i ignore it and continue onward to ' + w, within: null}]}) : raw)};
for (const [k, w] of [['P13a', 'the dungeon'], ['P13b', 'the dungeon beyond the iron-banded door'], ['P13c', 'the catacombs']])
    P[k] = {stopAt: 21, answer: (i, p, raw) => (i === 21 ? j({commands: [{seq: 1, type: 'go', to: {new: w}, quote: 'i enter the dungeon', within: null}]}) : raw)};
const cur = P[probe] || {};
export const stopAt = cur.stopAt;
export const prose = cur.prose;
export const answer = cur.answer || ((i, p, raw) => raw);
export const extra = cur.extra;
export const append = cur.append;
export const synthetic = cur.synthetic;
// (P6 defined above) (chain A/B end at part 2): "I head back to Alderwatch" with the arrival told as its west gate
const back = 'He climbed back up the spiral stair, past the chapel and out along the ford road. By early afternoon the west gate of Alderwatch stood before him.';

