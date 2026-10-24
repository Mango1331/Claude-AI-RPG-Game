# Avereth combat simulation, 10B groundwork

Node.js >=22; no npm install, network, LLM, ST or credentials required.

```
npm run sim:combat -- --smoke
node tools/sim/combat.mjs --scenario warrior-0-1-wolf-0-1-ENGAGED --seed 7 --runs 1 --detail --out replay
npm run sim:combat -- --matrix baseline --scenario warrior-0-1-wolf-0-1-ENGAGED --seed 100 --runs 500 --out results
node tools/sim/combat.mjs --config my-scenarios.json --runs 10 --out results
```

`baseline.json` is the editable configuration example: `scenarios` and `smoke` (IDs).
Scenario: unique CSV-safe `id`, `pc` build, `opponent`, `band`, `tactic`.
Build: `class` warrior/mage/rogue, two actual pool `skills`, `level` 1/5/10/14/15,
optional positive integer/fraction `stats` weights (all free points distributed),
optional level15 `evolution` normal/rare and engine-offered `direction` (default offense).
Rare evidence in that setup is explicitly SYNTHETIC, not a played career.
Monster: real content `anchor`, positive `level`, `count` 1..8, optional `type` normal/elite/boss.
A character build in `opponent` instead enables class comparison.
Start `band`: ENGAGED/SHORT/MEDIUM/LONG. Tactic: basic/skill/defensive/resource.
Seed is uint32; repetitions use consecutive seeds, no uncontrolled random generation.

The engine does creation, class kits, Favored growth, XP-derived levels, legal stat
assignment, derived values, scaling, initiative, all attacks/moves/effects and NPC turns.
The PC policy selects the first executable attack in its configured skill order;
defensive uses a known protection on alternate actions; resource switches to basic
when either resource fraction is below 30%. These are explicit simple policies, NOT optimal play.
Candidate legality is tested on private copies with a copied Dice cursor: no real
random draws/resources/state are consumed by selection. Movement uses engine actions.
Combat is an open engagement (no ambush or forced First Strike). A 100-round cap is a
censored draw, `complete:false`. No progression during a match, rewards, loot or rests.

Class comparisons are ASYMMETRIC: PC uses the chosen simulation policy, opponent uses
native engine NPC policy, including flee/surrender and defensive actions. Baseline
contains both PC assignments and ENGAGED/LONG starts. They are not symmetric PvP,
and must not be interpreted as intrinsic class strength without these controls.
All equipment is the actual class starter kit of the same origin/tier, not identical
weapon/armor values. No extra proficiency, evolved skills, arbitrary items or generated
NPC signature is secretly added. This matches explicit builds, not campaign NPC materialisation.

Output: results.jsonl (seed, outcome, rounds, complete, per-actor actual HP damage,
remaining pools, action resource costs, skill counts and illegal committed actions),
summary.csv (scenario counts and mean rounds), metadata.json (config, engine version,
Node version, source/content SHA256). Draw includes limit/error; inspect complete/errors.
A PC win includes routed/surrendered foes: per-actor flags distinguish those from kills.
`--detail` adds engine records/rolls; default omits full logs and action libraries.
Do not compare outputs with different source hashes as identical engine experiments.

Create a portable archive (packaging only needs Python; running it only needs Node):
`python3 tools/sim/package.py /absolute/path/Avereth_Combat_Simulator_10B.zip`.
Archive allowlist: src, content, tools/sim and package.json. No tests, profiles, chat,
results, node_modules, .git or environment included. Re-extract in a different directory
and run `npm run sim:combat -- --smoke --out /tmp/sim-smoke` before distribution.
No balance numbers, current_test guide or production engine mechanics are changed.

Verification 2026-10-24: 3 control tests pass; full repository suite 1275/1275.
Outside-repository archive smoke: all 3 classes plus one duel; 3 consecutive-seed
replays also ran without external dependencies. Tested runtime: Node24.19.0 on Linux.
Node22 is the compatibility target (standard APIs only), not a separately executed
runtime here. No large statistical series or balance conclusions have been produced.
