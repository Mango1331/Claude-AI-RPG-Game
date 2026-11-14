# Location architecture – places, travel and Living Dungeons (towards 4.3.0-c.6.6.190)

Implementation of the decided design (user decisions D1–D6 of 14.11.2026, on top of the Opus plans A/B/C and the two GPT
counter-reviews on `main`). Reference code: `.189` (`4438241`). Every stage has its own commit and tests.

## Stage 0 – Baseline measurement (no gameplay change)

Tool: `node tools/location_report.mjs <run dir|chat.jsonl|replay baseline.json.gz> … [--json]` (tests:
`tests/unit/location_report.test.js`). It reads stored records only and separates:

- primary location refusals (`no_go`, `passage`, `place`, `area`, `road`, `shut_in`, `dungeon_presence`) and their cascade
  (`scene_context`, `met_without_arrival`, `met_not_known_here`);
- every authorized GO/continuation by what its reply did: arrived, no arrival reported, arrival refused by an engine rule,
  extraction failed; and by target kind (known id, `{new}`, `within`, continuation);
- arrivals told without any GO (`no_go`), episodes of consecutive replies with a refused arrival;
- orphan places (created in a reply whose arrival was refused, never stood in); duplicate candidates (strict prefix rule
  within one settlement, never a settlement against its own site, never halls of two towns; NPC names ending in another);
- refused deltas by type in replies with a primary refusal (candidates for lost content), entities/offers/objects created
  in a reply whose arrival was refused (candidates for wrongly accepted content);
- repairs, length stops, tokens per player turn and turn latency p50/p95 from `calls.json`.

### Baseline on `.189`-recorded data

| | natural `.186` | natural `.188` | replay corpus b16–b19 replayed with `.189` |
|---|---|---|---|
| replies / deltas accepted / refused | 173 / 651 / 151 | 195 / 894 / 196 | 1032 / 3530 / 552 |
| location primary + cascade (share of refusals) | 11 + 50 (40 %) | 16 + 79 (48 %) | 19 + 79 (18 %) |
| authorized GO turns: arrived / no arrival / refused by engine / extraction failed | 61: 49 / 5 / 6 / 1 | 83: 73 / 5 / 4 / 1 | 317: 307 / 9 / 0 / 1 |
| arrivals without GO (`no_go`) | 5 | 11 | 19 |
| episodes (replies) | 6 (11) | 10 (15) | 19 (19) |
| orphan places | 5 (Glimmerdeep rooms) | 0 | 0 |
| duplicate candidates | – | Tannery Rows; rope-walk; NPC Ostrek | 3 place pairs (to be read case by case) |

**Differences to the numbers of the architecture study (explained, not adjusted):**
- **Episodes:** 6/10 instead of 7/12. The tool counts only replies with a refused arrival, not a failed extraction after a GO.
- **GO turns of the corpus:** 317 instead of 334. The tool counts player turns, the study counted resolution events.
- **Duplicate candidates:** a list to read, not a verdict. The rope-walk pair is ambiguous, the corpus pairs are probably
  distinct places (a ford and its guild hall, a lane and its smokehouse, a quarry and the track to it).

## Stage 1 – One place book and the NOT ARRIVED line (1A + 1B)

New module `src/v4/place_book.js` over the one place store `state.places`. It keeps four questions apart:

| question | answer | where |
|---|---|---|
| exists | `s.places[id]` (a hidden room too) | event log |
| known (may a model name it, may Alaric choose it) | `knownPlace`, `knownPlaceIds` | place book |
| advertised (what a prompt shows) | `catalogPlaces`, unchanged rank and budget | catalog |
| reachable from here | GO handler, topology | unchanged in stage 1 (stage 2) |

**Resolver** `resolvePlaceRef(s, ref, {from, kind})` has exactly four outcomes: `existing`, `ambiguous`, `new`, `invalid`.
- An id is valid when it is known, whether the catalog shows it or not. The catalog is no longer the limit of valid
  references: the extractor and planner schemas take `valid_places` (C only; A unchanged).
- A name resolves by its own name in scope: the settlement he is in and its children, or the open realm; never a place of
  another settlement.
- A known true Dungeon resolves by its head word, or by its way in ("the Grotto mouth" → the gate). It never resolves when
  the words go in ("into …", "inside …"), when it is the Dungeon he is in, or when the head word is not the head of his
  words ("the Grotto road").
- A closer name needs a strict prefix *and* a locative rest ("the tannery rows" → "the Tannery Rows behind the Ashbridge
  tanneries"). There is no "contains" rule.
- A settlement is never its own site.
- Two candidates are a question: a GO gets `CLARIFY` with nothing booked, and an arrival gets a refusal naming both ids.
  They never become a third place.
- Rooms are known only once Alaric knows them, and only those of the ruin or Dungeon he is in.

Wired into the GO handler (`{new}` without `within`, outside Dungeons), `arrivalPlace`, `resolvePlace`,
`placeIdentity` (the scene is the reached place) and `knownAt`.

`knownAt` now also names up to 3 known people of the destination's known parts, those met before first, as "usually in
<part>". This gives continuity only and books no presence.

A person reported absent at a known place under a shorter name is the one known person usually there or in one of its
parts whose name ends in it (`usualPersonNamed`). This never matches the people of another place, and never one of two
candidates.

**N2:** after a refused arrival (`no_go`, `passage`, `place`, `combat`) the panel says
`NOT ARRIVED — Alaric remains at <place>; <claimed destination> was not reached.` `playerFacingLines` keeps this line
while the `ENGINE REFUSED` bookkeeping stays hidden. Rejections now keep the claimed `to`.

**Probe** over the 65 natural GO `{new}` of `.186`/`.188`: 4 resolve to known places, all of them correct (Mossback,
Grotto mouth, Tannery Rows, the third grotto). Before the locative rule, the prefix and contains rules merged 4 of 5
wrongly.

**Regressions** (`tests/v4/location190_place_book.test.js`, on the original states of the natural batches):

| case | `.189` | stage 1 |
|---|---|---|
| `.188` Rogue #80 | `extract.failed` (unadvertised site of a completed contract) | applied; "Ostrek" is Meister Ostrek, no second person |
| `.188` Rogue #81/#82 | duplicate `loc.ashbridge.the_tannery_rows`, 2× Ostrek | GO to the known Rows, KNOWN AT names Ostrek "usually in rendering shed", no new place, one Ostrek, no `scene_context` refusal |
| `.186` Mage #63 | `{new}` "the Grotto mouth" | the known Glimmerdeep gate; "into/inside/road" stay apart |

The same file also covers: similar names stay separate (ford/guildhall, smokehouse/carts, quarry/track, city/gate), two
candidates lead to CLARIFY, a hidden room or another ruin's room is no reference, and the N2 line is visible to the player.

**Replay** (2235 cases vs `.126`): 36 changed against `.189`, each with a reason in
`tests/replay/accepted_location190_vs_126.json` (1089 accepted in total, fingerprinted):
- 19 only keep the refused `to`;
- 14 have the KNOWN AT parts line;
- 2 have a planner first answer with a known id that is now valid (no repair to `{new}`) (`b18-warrior#105`, `#179`);
- `b18-warrior#180` arrives at the known millhouse instead of a duplicate.

The corpus location report is unchanged (19 primary, 79 cascade, 0 orphans added), and refusals went from 552 to 549.
The fixed corpus answers cannot show how a model would use the new references; the natural batches above do.
`npm test`: all pass.

**Deliberate deviation from plan A §4.4 (person names):** plan A advises against a new person name match. Without
`usualPersonNamed`, however, stage 1 itself would have created a second Ostrek: `.188` Rogue #80 is applied now, where
`.189` failed. The rule is deliberately narrow and mirrors the existing ruleset-2 rule for longer names (`npc_identity`).
It matches only:
- a person reported absent (`present:false`);
- the last words of exactly one known person's name;
- a person usually at that place or one of its parts.

## Stage 2 – Movement proof (A2) and B1

**Step contract** (`src/v4/movement.js`). The GO handler decides once and stores on the step in `outcome.auth.gos`
(swipe-stable):
- `mode`: `within`, `continue`, `dungeon`, `local` or `travel`;
- `enter`: `{dungeon, root, gate}`; `gate` means the step's words name a true Dungeon's way in ("the Grotto mouth"), from
  outside it;
- `scope`: the habitat, or the Dungeon he set out for, where a new place of this step lies;
- `meant`: the known place that his words for a new target already mean;
- `way_in`.

A record from before .190 gets the same fields from the same rules (`stepOf`), so the legacy path stays narrow and the
records are not rewritten.

**One check** `allowedArrival(s, steps, to, {fresh, forced, reached})`. An arrival is allowed at:
- the target, or the stop on its known way;
- a place on the way there (the road of the land, the town before its hall);
- an open place of a town he set out for, or a new part of the place he set out for;
- for a `{new}` step: the one new place it establishes inside its scope, or the known place the confirmed report names
  for his words;
- a stop short of the target that the report gives as such (`arrived:false`, the existing .181 P2-2 contract).

Not allowed:
- **scope is no destination:** "reached" (`arrived:true`) while he is put at another place of the same town or realm;
- a room of a dungeon he did not set out for (replaces `elsewhere` for ruleset 2);
- a room past the gate of a step that names the gate. He is booked at the gate he did reach, with a correction ("going
  in is his next step"), because gate arrival is not being inside;
- a place outside the habitat of a local hunt exploration (habitat integrity).

**Make after check.** A place this report would create is made only once the arrival is allowed, and otherwise rolled
back. Only the `place.created` events of this one arrival are rolled back, so no orphan is left.

**Return leg.** "… then return to the inn" after an earlier step of the same message used to be refused at
authorization as "already here". Only the old "any arrival once any GO exists" made it work. It is now a step of its
own (`RETURNS — …`).

**B1 (one topology decision).**
- `levelVia`: in a Living Dungeon a way down leads to a deeper level only where the Dungeon has one. Otherwise it is a
  slope of the same level (R-B6, Glimmerdeep).
- The `arrivalPlace` level pre-check is removed.
- Seals, obstacles, the gate check and a level named by the room that does not exist stay refused.
- A room known by report is still reached only by a way the reply shows (Patch 7, review a5035f0; B1's own wording).
  `.188` Mage #100 (no way shown) therefore stays refused in stage 2; the B5 sections of stage 3 take this case.

**Removed:**
- `scopedPlaces` and its two derivations per reply. `newPlaceScope` now only applies the stored scope where answers
  enter (parser, World).
- The ruleset-2 `elsewhere` rule.
- The `arrivalPlace` level pre-check.

**Shadow mode** before the switch (scratch harness over the corpus and over the six natural runs `.186`/`.188`, as far
as their completion logs cover them):
- Corpus: 326 arrivals. After the rule fixes all 326 agree.
- Natural runs: 51 arrivals, 47 agree.
  - The 3 natural cases only the old checks refused: `.186` Mage #76 (the new check lacked `elsewhere`; fixed), `.188`
    Mage #100 (see B1) and `.188` Rogue #62 (room rule outside a true Dungeon, stage 3).
- Rule fixes made from the corpus disagreements:
  - a within-step reaches its habitat itself;
  - a `{new}` step may end at the known place its report names;
  - a stop with `arrived:false` stays allowed.
- After the switch, the natural cases that change are:
  - `.186` Mage #76: same refusal, but the room is no longer made (no orphan);
  - `.186` Rogue #91: "walk out to the grotto entrance, then step back into the entrance chamber", where the second step
    used to be told "NOTHING TO DO".

**Evaluated, not removed: the legacy travel path (`!explicitTravel`: `laterLegs`, `implicitArrivals`, `lodgedHere`,
legacy `elsewhere`).**
- `campaignSupport` refuses ruleset-1 and V3 campaigns, so the product does not reach this path.
- A temporary trap over `npm test` shows that 38 test files still reach it, about 280 replies, mostly through the test
  harness on ruleset-1 states.
- The 15 files that set legacy flags (`ruleset: 1`, `c: false`, `runtime: 'v3'`) test combat, board, NPC decisions,
  runtime migration and contracts, not travel. They stay unchanged:
  - `patch9a_runner`, `b1_current_rules`, `c66`, `c665`, `fixes_4_1_2`, `fixes_4_1_5`, `gen35_envelope`, `patch10b2`,
    `patch7`, `patch72_path`, `patch81`, `patch9b2`, `patch_f_progression`, `patch_run14_board`, `planner_c4`.
- Removing the legacy travel path would mean converting those 38 travel test files. That is out of proportion to this
  stage, so the path stays frozen and A2 applies to ruleset 2 only.

**Regressions:** `tests/v4/location190_movement.test.js` (8 tests).

**Tests updated, each with its reason in place:**

| Test | Change |
|---|---|
| `patch83` floor 3 | Glimmerdeep has no level 2 (B1) |
| `fix158` | the stair down in Glimmerdeep is a level-1 slope; no phantom room |
| `patch_run19` | a "Marrowbridge Guild hall" told as reached on a step to Asterhall's hall is no longer made |
| `pilot01` K5/K6a | T61's crossroads ride was a question to the carter (D2), so these tests give the turn the explicit ride step they presuppose; new test: without it the crossroads stay unreached |
| `patch_batch10_followup` | uses `newPlaceScope` |

**Replay** (2235 cases): 317 records differ from stage 1, all GO turns. With the stored step fields removed they are
identical (checked), and no reply record changes. They are accepted as `location190-s2 outcome` with fingerprints.

**Location report:**
- Orphan rule refined: a place known by report is knowledge, not an orphan. The stage-0 numbers are corrected above.
- Natural replay orphans: 3 before, 0 after.

**Lines:** `src` + `tools` +76 / −63. The new module is 120 lines; `scopedPlaces`, `elsewhere` and the pre-check are
removed.
