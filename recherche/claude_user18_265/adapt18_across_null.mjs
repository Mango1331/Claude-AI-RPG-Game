// Control (red/green): only `across` of the two T10 creature.new deltas set to null; everything else archived.
export const answer = (i, purpose, raw) => {
    if (i !== 28) return raw;
    const v = JSON.parse(raw);
    v.deltas = v.deltas.map(d => d.type === 'creature.new' ? {...d, across: null} : d);
    return JSON.stringify(v);
};
