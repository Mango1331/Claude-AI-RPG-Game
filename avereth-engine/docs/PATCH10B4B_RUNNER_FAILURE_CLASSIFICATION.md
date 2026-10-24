# Patch 10B-4b – Local live runner: exact failure phases

**Scope:** Very small second slice of Patch 10B-4. Base: 10B-4a `4.3.0-c.6.6.61` (development branch after Windows CRLF regression fixes). **Only the automated local live-test runner changes**; the shipped SillyTavern engine, `src/v4/runtime.js`, prompts, game state, Narrator, Extractor, classes, combat and `current_test` guide remain unchanged. Build stays `.61` since no extension product file changed.

## Why

Runs 2–4 showed several distinct terminating error classes, but before this patch the automated runner sometimes stopped with the generic `ui`/no-reply reason after a **Planner failure**, and continued to accept a visible Narrator story even if the **World Extractor failed** and did not persist the narrated move. Continuing then created misleading follow-up gameplay (Run 4: narrator claims Guild arrival/official jobs, engine never booked arrival or Guild Board).

The runtime already protects authoritative events, but the runner is a *diagnostic test harness*. It should stop and preserve the original, independently reviewable evidence when any of these phases fails, rather than attempt an unauthorized retry or continue its 100-turn observation as if the story had been committed.

## Changes

1. `tools/st_live/live/evaluator.mjs` adds `turnFailure(chat, u)` to classify **narrator_empty**, **planner_failed**, **interpreter_failed**, **extractor_failed**, **extractor_late**, and undiagnosed **missing** from the original, unmodified `turnOutcome()` plus recorded `plan/interp/extraction` fields. Ordinary story with successful or pending extraction, ordinary Engine/System panels and `#commands` are not failures. `failureEnd(fault, turn)` produces stable `end.kind` and the phase-specific `why` text.
2. `tools/st_live/live/run_live.mjs` stops on classified failures **after** the Browser Driver finishes a turn, with screenshot, `end.kind`, turn log and original chat/LLM calls retained. In addition, if the Browser Driver times out specifically with `no reply after the message`, it checks the latest saved user record to detect the aborted Planner/Interpreter and labels the stop correctly; other true UI errors remain `ui`. It preserves that terminal chat record for export.
3. `tests/live_runner/patch10b4b_failure_classification.test.js` contains **12 scripted unit regression tests** covering each failure class, original `turnOutcome` compatibility, precedence, correct turn scoping, normal System replies and the phase-specific run end labels.

## Explicit non-goals

- No automated retry/regeneration, no provider request, no increase in LLM budget, no Narrator empty recovery.
- No attempt to book a narrated move after Extractor failure. The runner **stops**; it does not correct gameplay or solve the existing Ghost-Travel problem in the game itself.
- No new player-visible HUD, quest, combat, guild, or state semantics.
- No changes to the automatic player's memory, permissions, prompts or decision process.
- This intentionally makes some runs **shorter**: a confirmed failed extraction now terminates the diagnostic run instead of letting later turns drift into a fictional location. A follow-up partial run can be interpreted from the saved ZIP.

## Verification boundaries

The previous .61 target tests **7/7** and Windows full-suite **1346/1346** were reported by the user before this patch. The 12 new tests and this branch diff have **not been executed in ChatGPT's environment**: only GitHub file operations are available and a complete local checkout cannot be obtained here (network DNS does not resolve GitHub). Do not treat the additional tests as already green.

Run locally from `avereth-engine`:

```powershell
node --test tests/live_runner/patch10b4b_failure_classification.test.js
npm test
```

Expected test count if nothing else changed: **1358** total (prior 1346 plus 12). Actual pass/fail numbers need the local console output. The real ST smoke remains **unavailable locally** (no configured `AVERETH_ST_DIR`) and is not claimed passed. Source review or a green Node suite cannot certify real Browser/Provider handling.

## Remaining 10B-4

10B-4a: limited third Planner attempt completed, local green according to user. 10B-4b: diagnostic runner classification added. Still open: bounded **Narrator** empty-response recovery in actual SillyTavern host, safe treatment of live **Extractor** timeouts/failed world state, and independent real long-run verification. **10B-3 unchanged.**
