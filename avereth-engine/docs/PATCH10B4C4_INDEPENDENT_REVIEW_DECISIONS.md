# Patch 10B-4c.4 – Second independent Claude-review triage and focused fixes (Build .65)

**Basis:** User independently reports both the 12 new 10B-4c.3 tests and the full **1412/1412** Node suite GREEN on .64. This is prior-run evidence, **not .65 verification**. Claude's broad review of 10B-4a/b/b.1/c.1/c.2 was compared afresh against the actual .64 HEAD `2e9c177`; all its recommendations were assessed rather than adopted blindly.

## Implemented now

1. **Planner primary transport retry.** A first `plan` request that throws or returns no answer may be followed by precisely **one fresh `plan_recovery`** with the identical original Planner messages and **normal 2000-token budget**. There is **no subsequent JSON repair** if this new transport reply is malformed: cap = two calls on this path. On success, its output passes the unchanged `parsePlan` and all subsequent Engine guards; a second error/invalid JSON safely fails the turn with no guessed player command. `plan.recovery = 'transport'` is recorded (also on failure), enabling the .64 `zeroCommands` and Recovery count reporting. The old empty/empty Planner path remains capped at three requests (2000+2000+4000). The existing single normal schema repair remains two requests.
2. **Stale-host safeguard.** The already available `prepareGenerationAsync` current-generation closure is passed to `plannedTurn → planMessage` as optional `isCurrent`. Before **any** extra Planner request (repair, empty recovery, transport recovery), a stale/changed/swiped/new-chat request returns without spawning a wasted provider call. The existing outer current-generation/commit gate is unchanged. This prevents a cancellation-caused transport error from immediately starting another request. Direct scripted tests without Host may omit `isCurrent`.
3. **Structured extractor timeout.** The local live Driver already probes `extraction.status` while waiting. On turn timeout it now returns `extraction: last.extraction` in addition to its existing human-readable `problem`. `run_live.mjs` passes this value into `driverFailure(chat, problem, extractionStatus)`, which requires a genuine turn-timeout and a saved story record still `pending`. It prefers the structured status; older callers without it retain the old regex fallback. No game behavior or timeout duration changes.
4. **Soft failures counted.** `report.md` now gives the number of `extractor_failed_soft` turns. This count is **not evidence that a dialogue had no world consequences**: an NPC, gift, ambush or other new Narrator fact may have been omitted after a failed extraction even if the player's Planner commands were empty. The Runner's conservative soft/hard classification and all original records remain unchanged.

**Changed code:** `src/v4/runtime.js`, `tools/st_live/live/driver.mjs`, `evaluator.mjs`, `run_live.mjs`, `report.mjs`; Build metadata in `src/util.js`, `manifest.json` and `package.json`. One existing 10B-4a test updated to reflect the deliberately changed initial-transport behavior. **New:** `tests/v4/patch10b4c4_review_followups.test.js` with **9** regression tests, including explicit timeout/retry cap, host Regenerate reuse, stale request, old empty recovery unaffected, structured Driver status, and soft failure count.

## Claude feedback – independently accepted versus deferred or rejected

| Claude point | Decision and source-based reasoning |
|---|---|
| 4a: Planner transport had no retry | **IMPLEMENTED.** Before narrating or committing a player turn this is relatively low risk; capped to 2 calls, never an Engine replay. |
| 4a: recovery prompt tempts model toward `{"commands":[]}` | **OBSERVE, DO NOT REMOVE**. An empty command list is a legitimate player outcome; simply removing its permitted form could force hallucinated player actions, violating player agency. Build .64 explicitly records `recovery:'empty'` and flags zero Commands. |
| 4b.1: failed dialogue extraction may still lose narrated world facts | **ACCEPTED, DOCUMENTED, COUNTED**. It cannot be proved harmless from Planner commands alone. Keep the 100-turn observation policy conservative and retain `FAILED_CORRECTION`; count soft turns, do not treat them as proof of full state. Actual recovery policy in the game is separate. |
| 4b: `extractor_late` normally unreachable | **DOCUMENTATION ONLY.** Set by `closeLatePending` on a later turn, while the Driver waits for pending extraction in normal runs; no reason to fake this case in host code. |
| 4b: Driver timeout regex tied to exact wording | **IMPLEMENTED.** Use structured probed status with backwards-compatible wording fallback. |
| 4c.1: “Empty deltas are allowed” can hide narrated changes | **OBSERVE, DO NOT FORCE DELTAS.** `expected_keys` still gate mandatory actions; a model must not fabricate an NPC or movement to satisfy an arbitrary nonempty count. Zero applied deltas are now a visible independent audit signal in .64. |
| 4c.1: GLM accepting/capping 6000 maxTokens | **DEFER until real provider test.** Endpoint settings and provider caps cannot be inferred from Node mocks; changing them without measurement could worsen recovery. |
| 4c.1/4c.2: extended barrier latency | **MONITOR live** via existing `extraction.ms`, per-call telemetry, next-turn `perf.wait_ms`. No additional artificial timeout or skipped world-state commits. |
| 4c.1: `repaired` conflates JSON repair and transport recovery | **ALREADY ADDRESSED by .64** optional `recovery` origin, leaving old field for compatibility. |
| 4c.2: invalidate every edit, including old history | **RETAIN CURRENT CONSERVATIVE BEHAVIOR.** A changed old conversation turn can change Planner context or historical facts even if the latest reply's own hash stays the same. Cheap extra calls are preferable to wrongly applying world deltas computed from stale history. Optimize only after confirming host event semantics and influence boundaries. |
| 4c.2: ST chat array may be reused in place | **VALID CAVEAT, NO CODE CHANGE**. Safety must not rely on array identity alone. Existing `chatId`, message-object identity, `swipe_id`, text hash and `laterTurns` jointly protect against obvious wrong-chat commits; actual ST array reuse remains unverified until browser testing. |
| 4c.2: indefinite generation barrier with no visible feedback | **DEFER UI change.** The normal bounded provider request phases still apply. Introducing a new toast/indeterminate progress panel during ST generation can interfere with current UI and screenshots. Measure actual wait before deciding how to display it. |
| 4c.2: rename `resumeReport` | **DEFER COSMETIC REFACTOR**; named hook handles both old V3 report and V4 extraction, and renaming now has no gameplay/test benefit. |
| 10B-4d: automatic Narrator swipe/regenerate | **DEFER** pending a real ST host contract. Engine's player-turn state is already booked, but only the ST host can safely generate a replacement assistant answer without creating a new player turn or racing prior generation. |
| Repeated point: real ST/GLM smoke not proven | **OPEN, MUST NOT CLAIM GREEN**. Node green proves scripts, not cancellation, provider output cap or browser behavior. |
 
## Test boundary

User-confirmed prior baseline: **1412/1412** green on .64. **This new .65 build has not been executed in ChatGPT's GitHub-only implementation environment.** After pulling branch:

```powershell
cd avereth-engine
node --test tests/v4/patch10b4c4_review_followups.test.js
npm test
```

Expected only: **9/9** new target tests and **1421** total Node tests. The existing `patch10b4a_planner_empty.test.js` expectation was also updated, and remains in `npm test`; if it fails, correct based on the actual console log. No ST browser or GLM provider smoke has run here.

**Stop point after local green tests:** perform a natural `current_test` with real provider and selectively test reload/chat-switch with a pending extraction before attempting 10B-4d. Do not fabricate a stateful Narrator auto-regenerate process from Node-only evidence.
