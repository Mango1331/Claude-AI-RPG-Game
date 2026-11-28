// Chain A: T9 extractor uses the canonical identity (the GO's id); T10/T11 extractor answers adjusted to that world.
// Planner and narrator answers stay the archived ones.
const ROOT = 'loc.old_crown_catacombs';
export const answer = (i, purpose, raw) => {
    const v = JSON.parse(raw);
    if (i === 18) return JSON.stringify({expected: {1: {arrived: true}}, deltas: [
        {seq: 1, type: 'arrive', at: ROOT, evidence: 'The chapel ruin sat above the water on a low rise'},
        {seq: 2, type: 'person.new', ref: 'npc.ossler', name: 'Ossler', role: 'yard keeper', desc: ['older man with a bad back, trimming grass with a short hook-blade'], present: true, relevant: true, threat: false, band: 'SHORT'},
        {seq: 3, type: 'fact', s: 'npc.ossler', p: 'occupation', o: 'keeps the chapel yard, trims the grass'},
        {seq: 4, type: 'object.new', name: 'crock of lamp oil', kind: 'item', qty: 1, holder: 'here', in: 'chapel by the door'},
        {seq: 5, type: 'time', during: 'travel', evidence: 'walked on along the road to the ford and the chapel rise', minutes: 20}]});
    if (i === 20) return JSON.stringify({expected: {1: {arrived: true}}, deltas: [
        {seq: 1, type: 'arrive', at: {new: {name: 'Landing before the iron-banded door', kind: 'interior', parent: ROOT}}, evidence: 'The stair ended at a small square landing.'}]});
    if (i === 22) return JSON.stringify({...v, deltas: v.deltas.filter(d => d.type !== 'passage')});
    return raw;
};
