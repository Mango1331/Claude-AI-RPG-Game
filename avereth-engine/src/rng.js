// Counter-based deterministic RNG. Every random value is f(seed, n) with a monotonically increasing counter n
// stored in the campaign state, so a campaign replays identically from its event log and every roll is auditable
// (Core #9: exactly one roll per required step, never rerolled). The reducer never rolls; only decision code does,
// and the resulting values are written into the events.

function mix32(x) {
    // murmur3 fmix32
    x ^= x >>> 16;
    x = Math.imul(x, 0x85ebca6b) >>> 0;
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35) >>> 0;
    x ^= x >>> 16;
    return x >>> 0;
}

export function uniform(seed, n) {
    const h = mix32((seed ^ Math.imul(n + 1, 0x9e3779b9)) >>> 0);
    return mix32(h ^ 0x68e31da4) / 4294967296; // [0, 1)
}

export function newSeed() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return crypto.getRandomValues(new Uint32Array(1))[0];
    }
    return Math.floor(Math.random() * 4294967296) >>> 0;
}

/**
 * A mutable cursor over (seed, n). Decision code creates one from state.rng, draws values and hands the final
 * counter back through the events it emits (see state.js: every event with `rng_to` advances state.rng.n).
 */
export class Dice {
    constructor(seed, n = 0) {
        this.seed = seed >>> 0;
        this.n = n;
        this.log = [];
    }

    static from(state) {
        return new Dice(state.rng.seed, state.rng.n);
    }

    next() {
        const u = uniform(this.seed, this.n);
        this.n += 1;
        return u;
    }

    /** d100: integer 1..100. */
    d100(label = 'd100') {
        const value = Math.floor(this.next() * 100) + 1;
        this.log.push({ kind: 'd100', label, value, n: this.n - 1 });
        return value;
    }

    /** Damage variance 0.90..1.10 inclusive in 0.01 steps (Core #11). */
    variance(label = 'variance') {
        const value = (90 + Math.floor(this.next() * 21)) / 100;
        this.log.push({ kind: 'variance', label, value, n: this.n - 1 });
        return value;
    }

    /** Integer in [lo, hi] inclusive (e.g. Level inside an allowed band). */
    int(lo, hi, label = 'int') {
        const value = lo + Math.floor(this.next() * (hi - lo + 1));
        this.log.push({ kind: 'int', label, value, lo, hi, n: this.n - 1 });
        return value;
    }

    /** Unbiased tie-break between equals (Core #24). */
    pick(list, label = 'pick') {
        const i = Math.floor(this.next() * list.length);
        this.log.push({ kind: 'pick', label, value: list[i], n: this.n - 1 });
        return list[i];
    }

    drain() {
        const out = this.log;
        this.log = [];
        return out;
    }
}
