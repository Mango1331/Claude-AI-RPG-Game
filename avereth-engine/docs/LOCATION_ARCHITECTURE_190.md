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
| orphan places | 6 (5 Glimmerdeep rooms) | 0 | 1 |
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
- 2 have a planner first answer with a known id that is now valid (no repair to `{new}`);
- `b18-warrior#168` arrives at the known millhouse instead of a duplicate.

The corpus location report is unchanged (19 primary, 79 cascade, 0 orphans added), and refusals went from 552 to 549.
The fixed corpus answers cannot show how a model would use the new references; the natural batches above do.
`npm test`: all pass.
