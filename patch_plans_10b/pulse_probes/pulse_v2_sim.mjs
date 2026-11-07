// Simulation of the PROPOSED PULSE v2 draw (plan PULSE_UMSETZUNGSPLAN §4/§9): frame x day phase base, one global miss
// streak, deterministic hash draws. A model to compare variants before implementation; not product code.
const E = process.env.ENG;
const { hash32 } = await import(`${E}/src/util.js`);
const roll = (k) => parseInt(hash32(k), 16) % 10000 / 100; // 0..99.99

// base window chance in % by frame and day phase (dungeon: underground, no phase)
const BASE = {
  travel: { day: 35, evening: 40, night: 45 },
  wild: { day: 20, evening: 24, night: 28 },
  street: { day: 10, evening: 12, night: 8 },
  inside: { day: 6, evening: 8, night: 3 },
  dungeon: { day: 15, evening: 15, night: 15 },
  camp: { day: 20, evening: 24, night: 28 },     // a pause outdoors: the place's own frame (wild)
  lodging: { day: 6, evening: 8, night: 3 },     // a pause in safe lodging: the interior frame
};
const DANGER = { // share of open windows that are danger (from the kind tables, after evidence)
  travel: { day: 0.25, evening: 0.3, night: 0.4 }, wild: { day: 0.2, evening: 0.3, night: 0.4 },
  street: { day: 0, evening: 0, night: 0 }, inside: { day: 0, evening: 0, night: 0 },
  dungeon: { day: 0.35, evening: 0.35, night: 0.35 }, camp: { day: 0.25, evening: 0.35, night: 0.45 }, lodging: { day: 0, evening: 0, night: 0 },
};
const VARIANTS = {
  V0_none: (b, n) => b,
  V1_abs5_cap60: (b, n) => Math.min(60, b + 5 * n),
  V2_rel20_cap2x: (b, n) => Math.min(60, b * 2, b * (1 + 0.2 * n)),
  V3_rel15_cap175: (b, n) => Math.min(60, b * 1.75, b * (1 + 0.15 * n)),
  V4_rel10_cap15: (b, n) => Math.min(60, b * 1.5, b * (1 + 0.1 * n)),
};
const phase = (min) => { const h = Math.floor((min % 1440) / 60); return h >= 6 && h < 19 ? 'day' : h >= 19 && h < 22 ? 'evening' : 'night'; };
const rnd = (seed, k, lo, hi) => lo + (parseInt(hash32(`${seed}|${k}`), 16) % (hi - lo + 1));

// A session: segments of play; each turn is {frame, minutes, eligible}. Combat and DUNGEON AHEAD turns are not eligible.
function session(seed, wantEligible) {
  const turns = []; let clock = 8 * 60 + rnd(seed, 'start', 0, 600); let i = 0; let eligible = 0;
  const push = (frame, minutes, ok = true) => { turns.push({ frame, ph: phase(clock), ok }); clock += minutes; if (ok) eligible++; };
  while (eligible < wantEligible) {
    const kind = rnd(seed, `seg${i}`, 0, 99); i++;
    if (kind < 35) { const n = rnd(seed, `t${i}`, 3, 12); for (let j = 0; j < n; j++) push(rnd(seed, `io${i}.${j}`, 0, 99) < 55 ? 'inside' : 'street', rnd(seed, `tm${i}.${j}`, 10, 40)); }
    else if (kind < 50) { const n = rnd(seed, `l${i}`, 1, 3); for (let j = 0; j < n; j++) push('travel', rnd(seed, `lm${i}.${j}`, 120, 360)); }
    else if (kind < 65) { const n = rnd(seed, `w${i}`, 2, 8); for (let j = 0; j < n; j++) push('wild', rnd(seed, `wm${i}.${j}`, 20, 60)); }
    else if (kind < 85) { const n = rnd(seed, `d${i}`, 6, 20); for (let j = 0; j < n; j++) { const r = rnd(seed, `dr${i}.${j}`, 0, 99); push('dungeon', 15, r >= 45); } } // 35 % combat, 10 % DUNGEON AHEAD
    else { const h = phase(clock); const out = rnd(seed, `r${i}`, 0, 99) < 50; push(out ? 'camp' : 'lodging', h === 'night' || h === 'evening' ? 480 : 180); }
  }
  return turns;
}

function run(variant, { sessions = 4000, length = 60 } = {}) {
  const f = VARIANTS[variant];
  const stats = { opens: 0, eligible: 0, none: 0, quietRuns: [], clusterNext: 0, burst3in5: 0, danger: 0, perFrame: {}, rests: 0, restDanger: 0 };
  for (let s = 1; s <= sessions; s++) {
    const seed = (s * 2654435761) >>> 0; const turns = session(seed, length);
    let n = 0, quiet = 0, maxQuiet = 0, prevOpen = false, opens = 0; const window = []; let burst = false;
    turns.forEach((t, k) => {
      if (!t.ok) return; // paused: no roll, streak unchanged
      stats.eligible++; const p = f(BASE[t.frame][t.ph], n);
      const open = roll(`${seed}|${k}|pulse`) < p;
      const pf = (stats.perFrame[t.frame] ||= { e: 0, o: 0 }); pf.e++;
      if (t.frame === 'camp' || t.frame === 'lodging') stats.rests++;
      if (open) {
        opens++; pf.o++; n = 0; quiet = 0; if (prevOpen) stats.clusterNext++;
        if (roll(`${seed}|${k}|pulse.kind`) < DANGER[t.frame][t.ph] * 100) { stats.danger++; if (t.frame === 'camp') stats.restDanger++; }
      } else { n++; quiet++; maxQuiet = Math.max(maxQuiet, quiet); }
      prevOpen = open; window.push(open ? 1 : 0); if (window.length > 5) window.shift(); if (window.reduce((a, b) => a + b, 0) >= 3) burst = true;
    });
    stats.opens += opens; if (!opens) stats.none++; stats.quietRuns.push(maxQuiet); if (burst) stats.burst3in5++;
  }
  const q = [...stats.quietRuns].sort((a, b) => a - b);
  return {
    per10: +(stats.opens / stats.eligible * 10).toFixed(2), p_none: +(stats.none / sessions).toFixed(3),
    quiet_median: q[Math.floor(q.length / 2)], quiet_p95: q[Math.floor(q.length * 0.95)],
    next_after_open: +(stats.clusterNext / Math.max(1, stats.opens)).toFixed(3), sessions_with_3in5: +(stats.burst3in5 / sessions).toFixed(3),
    danger_per_session: +(stats.danger / sessions).toFixed(2), camp_rest_danger_share: +(stats.restDanger / Math.max(1, stats.rests)).toFixed(3),
    frame_rate: Object.fromEntries(Object.entries(stats.perFrame).map(([k, v]) => [k, +(v.o / v.e).toFixed(3)])),
  };
}
const out = {};
for (const length of [15, 60, 150]) for (const v of Object.keys(VARIANTS)) out[`${length}|${v}`] = run(v, { length, sessions: length > 100 ? 1500 : 4000 });

// Split-wait farming: N one-minute waits vs one long wait, with and without the pause-block rule (one roll per pause)
function farm(nMsgs, block) {
  let rolls = 0, opens = 0; const f = VARIANTS.V2_rel20_cap2x; let n = 0;
  for (let s = 1; s <= 2000; s++) { n = 0; for (let k = 0; k < nMsgs; k++) { if (block && k > 0) continue; rolls++; const p = f(BASE.street.day, n); if (roll(`${s}|${k}|farm`) < p) { opens++; n = 0; } else n++; } }
  return { rolls_per_session: rolls / 2000, opens_per_session: +(opens / 2000).toFixed(3) };
}
out.farm = { one_long_wait: farm(1, true), ten_split_no_rule: farm(10, false), ten_split_pause_block: farm(10, true), thirty_split_no_rule: farm(30, false) };
console.log(JSON.stringify(out, null, 1));
