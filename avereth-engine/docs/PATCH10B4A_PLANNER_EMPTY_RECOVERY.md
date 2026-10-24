# Patch 10B-4a – Bounded empty Planner recovery (.61)

**Scope:** a strictly limited first slice of 10B-4. Based on Engine `4.3.0-c.6.6.60` / dev HEAD `e7155d3`, after 10B-2b; result `4.3.0-c.6.6.61`. **This is not complete 10B-4.** It does not repair the Narrator, Extractor, browser abort handling, retry host integration, or the automated local test player's memory.

## Original failure and design

In natural .57 Run 3 (T21, calls 63/64), the Planner's first answer and existing repair returned no JSON: each spent its 2,000 completion tokens in reasoning, so the host correctly aborted without committing a story turn. Similar empty/reasoning-exhaustion failures appear in other phases of Runs 2 and 4; this patch treats **only the Planner's two consecutive empty text answers**.

Previously `planMessage()` performed exactly two calls: `plan` and (if needed) `plan_repair`, both at `maxTokens: 2000`. When both returned empty text, it failed. The new path keeps those two calls unchanged and makes **at most one third fresh request** under the following conditions:

1. The first call returned a non-null answer with empty/whitespace content.
2. The repair was also a successful LLM transport call but returned empty/whitespace content.
3. There is still no valid parsed command list.

The third `plan_recovery` call reuses the original system prompt, catalog, player message and recent context, without including empty assistant answers. It adds a brief request for the normal `{"commands":[...]}` output. It uses `maxTokens: 4000` once. The response goes through the **same `parsePlan` validator** as the other calls. An empty command array is permitted only when actually returned as valid JSON by the model; the engine does not invent one.

If recovery again returns no valid commands, the existing abort/notice behavior remains. There is **no fourth call**, no infinite retry, no synthetic player action, and no additional engine mutation during the LLM calls. The existing input-hash, history, host stale-request guards and regenerate caching still govern the eventual turn commit.

## Changed files

- `src/v4/runtime.js`: optional per-call budget override in `ask`, normalizes recovery to base purpose `plan`; exactly one conditional `plan_recovery` attempt after two empty replies in `planMessage`, with telemetry and validation.
- `tests/v4/patch10b4a_planner_empty.test.js`: seven scripted Node regression cases: recovery success, capped failure, normal repair, malformed nonempty answer, initial transport failure, a successful real host preparation followed by Regenerate without double-planning, and a host abort without events after exhausted recovery.
- `src/util.js`, `manifest.json`, `package.json`: build `.61`.
- `docs/PROTOTYPE_C.md`: this concise status reference.

## Verification and honesty boundary

**Source-level checks only in this session.** The GitHub connector can read and commit files, but the complete repository was not available as an executable local checkout in this environment. Therefore:

- The test file is added; **red on .60 and green on .61 have not been executed here**.
- The full `npm test` suite has **not** been rerun here.
- `npm run smoke:st:c` has **not** been rerun here.
- No GLM/SillyTavern natural run or end-to-end provider result has been verified.
- The third attempt is an extra chance, **not a guarantee** the provider will produce content, and may use up to 4,000 more completion tokens on a repeated failure.
- The `plan_recovery` telemetry is recorded as a distinct purpose with the provider's actual `finish_reason` / token counts where supported; never inferred.

**Required independent/local checks before approval:** from `avereth-engine/` run `node --test tests/v4/patch10b4a_planner_empty.test.js`, then `npm test`; use the local SillyTavern checkout for `npm run smoke:st:c`. Verify the two-empty recovery scenario and no duplicate action on regenerate. Record actual numbers; repair any failures before marking 10B-4a technically accepted.

## Scope left for later 10B-4

Narrator empty-response recovery needs proof that SillyTavern can safely retry story generation on **the same already-booked player turn**. Extractor aborts need phase-aware failure/arrival handling. The automated Runner's true end reasons should distinguish Planner/Narrator/Extractor/provider failures. These remain separate and are **not implemented by this patch**.
