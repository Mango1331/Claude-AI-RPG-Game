# Patch 10B-4c.3 – Recovery observability (Build .64)

**Purpose:** A focused follow-up to the independent all-10B-4 review of .63. **Not** a new retry policy. User-confirmed baseline: new .63 host-lifecycle tests **14/14** and full Node suite **1400/1400**, zero skipped. The independent reviewer also found no proven wrong-world-state bug but warned that a "successful" recovered `{"commands":[]}` or `{"expected":{},"deltas":[]}` may hide gameplay that the Narrator described. The natural Live-Test Runner must make such results visible **before** the next provider-based `current_test` run.

## Product records

- `planMessage()` in `src/v4/runtime.js` returns optional `recovery: 'empty'` **only when its third, fresh `plan_recovery` attempt was actually made** after two zero-text answers. The category persists into `r.plan.recovery`, including failed attempts, and survives normal prior-plan reuse. Ordinary successful Planner calls and their existing JSON repair have no `recovery` field. No Planner transport retry is added here, so `'transport'` is reserved for a potential separate follow-up.
- `runExtraction()` records optional `extraction.recovery: 'transport' | 'empty'`. `transport` means a new `extract_recovery` request after a null answer or transport exception. `empty` means the third request after two transported blank results. The field is applied **both on valid application and final failure** via existing `applyExtraction`. Old persisted records without this optional field remain valid.
- **No further model calls**, no changes to `maxTokens`, schemas, history, Firewalls, ownership, player actions, Host lifecycle, `laterTurns` or the meaning of `repaired`. The older `repaired` boolean is retained for compatibility; its meaning includes multiple-call transport recovery. The new `recovery` field is the authoritative classifier of why a recovery was attempted.

## Runner/evaluation/report

- `tools/st_live/live/evaluator.mjs` exports `recoveryObservation(chat, userIndex)` and `recoverySummary(chat)`. For a **successful** recovered Planner call whose saved interpretation explicitly has `commands: []`, set `zeroCommands=true`; for a recovered **applied** extraction explicitly carrying `deltas: 0`, set `zeroDeltas=true`. Do **not** count failures or absent data as successful zero-results.
- `evaluate(chat)` exposes these six totals in `counts.recovery.planner/extractor`. It records `planner_recovery`, `extractor_recovery`, `planner_recovery_zero_commands`, and `extractor_recovery_zero_deltas` issues where appropriate; `turns[].recovery` includes per-turn evidence. These are **investigation signals**, never automated proof of an incorrect world state or a reason to mark a turn as failed.
- `tools/st_live/live/report.mjs` includes a one-line aggregate Recovery observation with these counts in `report.md`. `evaluation.json` and the per-turn evaluation already contain the complete breakdown; `run.json` retains the Runner's existing events and stop reasons. Existing Runner soft/hard extractor failure policy is unchanged.
- **Important warning:** an Extractor can lose unplanned NPC introductions, gifts, ambushes or narrated movement even after an empty `expected` map. Zero Deltas is a warning, not a guarantee that nothing happened or that something went wrong. Similarly, Planner zero Commands can be legitimate player speech or a missed actionable instruction.

## New regression coverage

`tests/v4/patch10b4c3_recovery_observability.test.js`: **12 Node tests** for Planner empty third-try category, on-host persisted category, ordinary repair without false Recovery, failed Planner Recovery, Extractor transport Recovery, empty-output Recovery on both success/failure, normal repair not reclassified, pure Runner detection/counts with zero-results, legacy records without fields, failed attempts not double-counted as successful zeros, complete `evaluate()` issue/turn integration, and intervening System-Panel handling.

**Verification is not yet measured after this new .64 patch.** The previously locally confirmed **1400/1400** is .63 *before* the 12 new tests. Expected new total **1412**, not a verified passing number. From `avereth-engine/` on the development branch:

```powershell
node --test tests/v4/patch10b4c3_recovery_observability.test.js
npm test
```

No independently executed browser/GLM/SillyTavern acceptance is claimed. Inspect the recovered outputs in actual runs, especially whether `0 Commands` contradicts explicit player actions and whether `0 Deltas` overlooks newly narrated world facts. Confirm `maxTokens: 6000` is honored by the real configured provider. Review `perf.wait` / `extraction.ms` for long next-turn barriers.

## Deferred independently bounded work

- Optional Planner transport retry on primary transport failure. This is a different behavior change and deserves a separate bounded test-first patch.
- Edit invalidation optimization in `index.js` (avoid canceling a world job for wholly unrelated edits). First verify SillyTavern's actual edit semantics, including same-array reuse across chats; this is not required to make recovery observable.
- Real ST browser smoke: chat switch/reentry, reload, swipe during Extraction, generateRaw cancellation behavior.
- 10B-4d: Narrator empty-response recovery by ST's legitimate swipe/regenerate lifecycle, not a second player/Engine turn.
- 10B-3: Threat vs. attack, combat Chronicle and official Guild board truth. Separate project work.
