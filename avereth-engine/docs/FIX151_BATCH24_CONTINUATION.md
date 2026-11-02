# Build .151 — Batch24: safe Planner nonexecution and the current class milestone

2026-11-02. Base: .150 / `bdaacc807fbbf2c69dbb9babba3a4c725f546c4b`.
Scope: the two authorized follow-ups from [Batch24, including GPT counterreview §9](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c3e6d8bae95324d291cad8df50ece94ae5a14f84/testrun_10b/batch-20261102-054921Z/REVIEW.md).

## 1. Confirmed cause and bounded correction

Rogue T314/I627 failed before Engine execution. Both existing Planner attempts rejected with `Failed to fetch`;
`index.js:v4Llm()` forwarded an untyped exception. `runtime.js:ask()` marked it `unclassified:true`, so the
existing hard guard withheld `planner_not_executed`. The Runner correctly refused to continue without that marker.
This explains the stop; it does not identify the original network/provider cause or establish a .150 regression.

- Only the asynchronous rejection of the custom-provider browser Fetch, with the browser's `TypeError: Failed to
  fetch`, receives `LLM_TRANSPORT`, `phase:fetch`, `settled:true`. Request setup, synchronous exceptions, response
  processing and arbitrary TypeErrors are outside that classification. Caller cancellation and timeout retain
  their own classifications. The timer and abort listener are cleaned up before the caller receives the error.
- Only the Planner path accepts this provenance as a classified failure; its telemetry records
  `transport_phase:fetch` and `transport_settled:true`. No global unknown-error relaxation or Extractor recovery change.
- The original single transport recovery remains: at most two attempts, not an additional retry. If both fail,
  `plannedTurn()` returns no commands/events. Existing generation, chat/message identity, input-hash and history
  checks must still pass before that failure record is committed. A stale result is discarded.
- Existing Runtime/Runner logic then shows NOT EXECUTED, validates the fold/state and saved readback, and permits
  a **new player decision**. The old action, payment, time or combat round is never automatically replayed.
  An unresolved Fetch is not a completed failure. Unknown, cancelled and stale failures remain hard.

A settled Fetch means this browser call can no longer deliver a result to the Engine. It does **not** prove that
an upstream server stopped processing, nor that connectivity has recovered. Repeated failures without mechanical
progress retain the Runner's existing stop condition. Other browser error wordings and `generateRaw` exceptions
remain conservatively unclassified; no additional list of network-message variants was introduced.

## 2. Test-player milestone, without changing gameplay

The normal Runner already evaluates Engine-confirmed level milestones. Once `open_run_level` is reached and
`class_accepted` is next, it now passes that public stage ID to the player. No events, hidden feats, requirements,
class identities or undisclosed state enter the player prompt.

Full, short and minimal decision prompts briefly remind the player that the configured level goal is reached:
finish immediate danger, inspect `#class` and displayed E offers, freely choose or postpone. Old self-notes saying
`open_run_level` no longer override that confirmed stage in recovery prompts. There is no automatic command,
class selection, additional model call or change to goals/quests/tactics. Guides without a level target are unchanged.

Methodological limit: future L15→E input counts use this new player guidance. A shorter interval would not prove
an XP/progression balance change or guarantee that a natural model follows the reminder.

## 3. Regression and acceptance evidence

- Seven new tests in `tests/v4/fix151_fetch_continuation.test.js` and
  `tests/live_runner/fix151_class_reminder.test.js`: **three red/four green controls on unchanged .150; seven green on .151**.
  They cover the original Rogue input through the actual adapter function and Runtime, pending Fetch, unknown and
  synchronous TypeErrors, incomplete provenance, cancel/authentication, one successful recovery, input/history/
  generation invalidation, saved/reloaded folding, a subsequent action exactly once, and full/short/minimal prompts.
  The transport reproduction uses a fresh product campaign, **not a claim to replay the full original I627 state**.
- Adjacent Planner/recovery/World-job/Runner suites: **106/106**.
- Full `npm test`: **2703/2703**.
- `npm run replay:check`: **2235 cases; the same 479 accepted exact baseline differences; zero new/unaccepted/stale
  entries**. No fingerprint or acceptance-list change.
- Real ST1.19/Chromium153 smoke with Mockprovider: Standard **40/40**, Failsoft **45/45**, both without PageErrors.
  **36/42 provider calls, 14/16 Extractor calls**; the extra three provider calls versus .150 are the new fixture's
  single post-failure normal turn. Its two aborted Fetch attempts never reach the provider.
  Finance, #pay/edit/reload/swipe/regenerate and simulated save recovery remain included. New
  `AVERETH_SMOKE_FETCH=1` injects **two actual browser request failures** with Playwright `route.abort()`, verifies
  zero Engine events/provider calls for that input, classified telemetry, complete saved readback, restored chat
  after reload, and one subsequent normal Planner→Narrator→Extractor turn. It does not simulate a provider outage's
  root cause or prove native Windows EPERM recovery.

The first run of the new smoke fixture attempted readback while ST was still initializing after navigation.
It failed its chat-identity check. The fixture now reuses `Driver.reload()` to restore the exact saved campaign;
no product safety check was bypassed. Final host results must be distinguished from this failed harness attempt.

## 4. Deliberately unchanged

Neutral Dungeon fauna, Slotpopulation, AoE, combat, finance/S1/S2, XP×5, PP/LP, skill/class requirements, model budgets,
normal gameplay and narrator-card revision. No natural batch started. The next user-run batch can test model/network
behavior and the shorter milestone guidance; mock-host success is not a natural-model reliability claim.
