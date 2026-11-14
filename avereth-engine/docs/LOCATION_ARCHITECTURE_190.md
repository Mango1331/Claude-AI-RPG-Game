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
