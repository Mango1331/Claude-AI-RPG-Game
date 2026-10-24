# Patch 10B-4c.1 – bounded in-call Extractor recovery (Build .62)

**Scope:** First product-code part of the remaining 10B-4 Extractor recovery. Base: development branch after 10B-4b.1 `9f2d808`, Build `.61`. Result: `4.3.0-c.6.6.62`.

**Rationale:** In the natural .57 runs, Extractor transport timeouts/aborts could leave a visible story with no persisted travel or world facts. The existing V4 Extractor already had an ordinary schema repair when the *first response returned text but was invalid/incomplete*. It did not retry **any** first-call transport exception/null answer. Two reasoning-only completions could also exhaust the normal 4000+4000 output tokens without delivering any JSON.

## Implementation – only inside an already pending Extractor attempt

- **Primary transport failure/null answer:** The runtime makes **exactly one** fresh `extract_recovery` call with the original Extractor messages and its usual **4000-token budget**. It is not an automatic new story or an attempted replay of a completed player turn. If the fresh response fails or is invalid, the existing safe `extract.failed` status applies. No third attempt in this path.
- **Two successfully transported but empty/whitespace responses (normal `extract` + existing `extract_repair`):** When **neither response produced a valid report**, make **exactly one** fresh `extract_recovery` call at **6000 tokens**, retaining the identical original catalog, player message, narrated reply and expected-key schema. A short user instruction asks for one JSON report immediately; prior empty assistant responses are omitted. Maximum **three calls total**, never a fourth.
- **All other cases:** Normal valid extraction remains one call. Normal incomplete or nonempty malformed report uses the existing maximum two calls; partial valid evidence is preserved under the established `parseExtraction`/missing-key rules. No extra call after a nonempty invalid repair. A failed second call following the initial empty text does not trigger a third automatically.
- **Authority and determinism:** Every recovery result goes through the same `parseExtraction` schema/expected-key validator and the existing `applyExtraction` firewall. Events are committed **only after the selected answer passes validation**. `text_hash`, current pending status and `laterTurns` prevent stale swipe/edited-reply/late results from committing. No guessed `deltas: []`, no auto-arrival, no Engine-owned fact override, no compensation for a previously committed `extract.failed`.
- **Telemetry:** `extraction.llm` logs the purpose, actual reported finish/tokens and timing of the extra call; `repaired` is true when there was a second or third call. Retries can increase the time spent on a failed turn; a third 6000-token generation can itself exhaust its reasoning without useful text.

**Changed product file:** `src/v4/runtime.js` only, in `runExtraction`. Build metadata updated in `src/util.js`, `manifest.json` and `package.json`. No new data schema, migration, quest/combat rule, player UI or SillyTavern Host event. No `current_test` changes.

## Regression coverage

New: `tests/v4/patch10b4c1_extractor_recovery.test.js`, **11 cases**:
1. Exception → fresh success and one `extract.applied`.
2. Null primary → fresh success.
3. Two transport errors → failed and no third call.
4. Empty primary → normal successful repair without extra call.
5. Two empty length completions → third 6000-token recovery and one application.
6. Three empty answers → bounded failure without fourth call.
7. Two nonempty malformed replies → only the normal two-call repair path.
8. Malformed primary → valid repair in two calls.
9. Narrator text edited/swiped during recovery → no commit.
10. Following player turn during recovery → no late commit.
11. Reinvoking extraction on already applied reply → no new LLM call or second event.

Two older tests had deliberately obsolete **exactly-two-call assumptions** for two empty responses; they are updated narrowly:
- `tests/v4/patch81.test.js`: case of two empty reports now expects a bounded `extract_recovery`; valid second attempt still exactly two.
- `tests/v4/patch82.test.js`: performance summary of three `finish_reason: length` calls correctly lists three reasons.

## Validation and release limits

Prior local report from the user: **1370/1370 `npm test` green** on previous Build `.61`/10B-4b.1. This predates the current extractor product diff.

**The new tests and full suite have NOT been executed by ChatGPT**, because its GitHub connector can fetch/update files but its separate runtime lacks a complete runnable repository. They must be run locally:

```powershell
cd avereth-engine
node --test tests/v4/patch10b4c1_extractor_recovery.test.js
npm test
```

**Expected only, not measured:** 11/11 target tests, 1381 total suite tests, unless other changes were merged. If anything fails, repair based on the actual console output; do not report assumed green.

**Separate pending work:** ST smoke and real GLM provider test; host-level crash/reload/disconnect recovery and empty Narrator response recovery. This patch **does not retry a finished `failed` extraction** on a subsequent turn and does not modify the automated Runner's 10B-4b.1 soft/hard policy. 10B-3 remains untouched.

**Decision:** The complete Extractor recovery cannot be considered proven in one commit without reproducing real ST-host lifecycle cases. This first part is bounded in-call recovery; after local red/green verification, separately decide whether a small host-level recovery step is needed.
