// Simulation of the PROPOSED PULSE draw (plan §C3). Not product code: a model to check distributions before implementation.
const E = process.env.ENG;
const { hash32 } = await import(`${E}/src/util.js`);
const roll = (k) => parseInt(hash32(k), 16);
const P = { travel: 35, wild: 20, town: 10 };
const KINDS = {
  travel: { meeting: 25, obstacle: 15, trace: 20, strange: 10, danger: 30 },
  wild: { meeting: 20, obstacle: 10, trace: 30, strange: 15, danger: 25 },
  town: { life: 40, meeting: 35, trouble: 20, trace: 5 },
};
function pick(seed, turn, frame, recent) {
  const w = { ...KINDS[frame] };
  const last = recent.at(-1);
  if (last && w[last] != null) w[last] = 0;            // never the same kind twice in a row
  for (const k of recent.slice(-3)) if (w[k]) w[k] = Math.ceil(w[k] / 2); // the last three open windows weigh half
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = roll(`${seed}|${turn}|pulse.kind`) % total;
  for (const [k, v] of Object.entries(w)) { if (r < v) return k; r -= v; }
}
function window(seed, turn, frame, recent) {
  const open = roll(`${seed}|${turn}|pulse`) % 100 < P[frame];
  return open ? pick(seed, turn, frame, recent) : null;
}
const out = {};
// A) per frame: 2000 seeds x 300 consecutive eligible turns of that frame
for (const frame of Object.keys(P)) {
  let open = 0, n = 0, maxQuiet = 0, maxOpen = 0, kinds = {}, sameTwice = 0;
  for (let seed = 1; seed <= 2000; seed++) {
    const recent = []; let q = 0, o = 0, prev = null;
    for (let turn = 1; turn <= 300; turn++) {
      n++; const k = window(seed * 2654435761 >>> 0, turn, frame, recent);
      if (k) { open++; o++; q = 0; kinds[k] = (kinds[k] || 0) + 1; if (k === prev) sameTwice++; prev = k; recent.push(k); if (recent.length > 4) recent.shift(); }
      else { q++; o = 0; }
      maxQuiet = Math.max(maxQuiet, q); maxOpen = Math.max(maxOpen, o);
    }
  }
  const tot = Object.values(kinds).reduce((a, b) => a + b, 0);
  out[frame] = { open_share: +(open / n).toFixed(4), longest_quiet: maxQuiet, longest_open: maxOpen, same_kind_twice: sameTwice,
    kinds: Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, +(v / tot).toFixed(3)])), hostile_per_turn: +(((kinds.danger || 0)) / n).toFixed(4) };
}
// B) a User04-like session: 10 town, 3 wild, 2 travel eligible turns in that order mixture, 20000 seeds
const mix = ['town','town','town','town','town','town','travel','wild','wild','travel','wild','town','town','town','town'];
let none = 0, sum = 0, hostile = 0, hist = {};
for (let seed = 1; seed <= 20000; seed++) {
  const recent = []; let c = 0;
  mix.forEach((frame, i) => { const k = window(seed * 40503 >>> 0, 3 + i * 3, frame, recent); if (k) { c++; recent.push(k); if (k === 'danger') hostile++; } });
  if (!c) none++; sum += c; hist[c] = (hist[c] || 0) + 1;
}
out.user04_like_session = { eligible_turns: mix.length, mean_windows: +(sum / 20000).toFixed(2), p_none: +(none / 20000).toFixed(3), mean_danger: +(hostile / 20000).toFixed(2), hist };
// C) the travel share as today (35 %): unchanged open share of legs, but the danger part is 30 % of it
out.travel_vs_today = { today_open_legs: 0.35, proposed_open_legs: out.travel.open_share, proposed_hostile_legs: out.travel.hostile_per_turn };
console.log(JSON.stringify(out, null, 1));
