# Patch 10B-4c.2 – V4 Extractor host lifecycle recovery (Build .63)

**Base:** Build .62 / development HEAD `23b8ded`, whose 16 new Extractor recovery tests and the complete **1386/1386** `npm test` were confirmed green locally by the user. **Target:** Build `4.3.0-c.6.6.63`. Work limited to the SillyTavern Host and pending Extractor lifecycles, with no new quest, combat, movement or Narrator mechanics.

## Problem and goals

`src/v4/runtime.js:runExtraction` on .62 had an internal late-turn/text-hash guard, but the ST extension's former `startWorld()` invoked extraction against `ctx().chat` without pinning the original chat object throughout the job. A chat switch (including away-and-back), active swipe or page reload could leave an old LLM response running, or a saved `pending` record without an active in-memory job. A different chat could accidentally be consulted under the same message index. The next-turn barrier previously only waited for an *already present* in-memory `pendingWorld` job; following a full reload, a raw player input could reach the engine while the prior stored reply was still `pending`.

**Safety properties:** one active world extraction job per chat/reply, no world-commit or save of an out-of-context result, re-read a genuinely stored `pending` result once after reload/reentry, no duplicate model requests from duplicate host events, and never mechanically resolve the next normal player turn before the pending extraction **and its save** finish.

## Product changes

1. **New pure/testable host helper** `src/v4/world_jobs.js` exports `createWorldJobs`, with dependency-injected active chat, extraction function, persistence callback and error logger. Each job captures the origin `chatId`, `chat` object, reply index, **message object identity**, `swipe_id`, original `text_hash` and an `AbortController`. `start(id)` deduplicates equivalent active calls. `invalidate()` cancels outstanding jobs when the chat or active swipe changes; `belongs()` rejects mismatched chat identity, reply, swipe, hash or an Engine-booked later turn. `currentJob()`/`currentId()` expose the job to the next-turn barrier. An old request cannot publish after cancellation, even if its provider did not abort.
2. **`src/v4/runtime.js`:** optional `isCurrent` callback for `runExtraction`. Before first extraction, before each schema repair/recovery request (combined with existing .62 stale guard), and before final `applyExtraction`, the Host callback must still approve the original chat/reply. Existing firewall, expected keys, committed-world event guard and failed/repaired metadata stay unchanged.
3. **`index.js`:** `startWorld` uses `createWorldJobs`, passes the **captured original chat array** into `runExtraction` rather than a dynamic `ctx().chat` read, and conditions rendering/saving on `isCurrent()`. Chat switches, swipes, deletions and edits invalidate the old job and allow the active saved `pending` reply to resume. Init also calls `resumeReport()` for pending saves surviving a complete browser reload. The normal generation barrier starts a missing pending job before resolving the next user input. It also **awaits the async chat save**, even if status changed from `pending` to `applied` during that save.
4. **Abort behavior:** for the Custom/OpenAI-compatible HTTP route, the pending world job's `AbortSignal` is forwarded into the existing per-request timeout `AbortController`, so chat switching aborts a needless in-flight fetch. SillyTavern `generateRaw` cannot be forcibly canceled through the documented API; its eventual response is safely discarded by `isCurrent`. No change to non-Extractor Planner, Board or Forge calls.
5. `onMessageReceived` captures both the origin chat ID and chat array before the async save and refuses to launch a follow-up `startWorld(id)` into a different chat after the save completes. No world-authoritative state is inferred from a Narrator response without the ordinary validated extraction.
6. Version `.63` in `src/util.js`, `manifest.json`, `package.json`.

## Test coverage and limitations

**New:** `tests/v4/patch10b4c2_world_jobs.test.js` contains **14** Node regression scenarios: duplicate job dedupe; chat switch; same-ID return; identical-text swipe change; edited/replaced reply; deletion/invalidation; pending record restored by a new manager; barrier through delayed save; unexpected provider error containment; real `runExtraction` ignoring stale transport recovery; successful but stale response cannot commit; raw unprocessed user message remains eligible; real chat switch → resume → exactly one `extract.applied`; genuinely Engine-booked later turn blocks resume.

**Prior verified baseline:** **1386/1386** on .62, as reported by the user. These 14 new tests and the full `.63` suite have **NOT** been executed from ChatGPT's GitHub-only implementation environment. Expected count **1400**, not a measured pass.

Run after pulling from `avereth-engine/`:

```powershell
node --test tests/v4/patch10b4c2_world_jobs.test.js
npm test
```

**ST smoke and real GLM/live acceptance still outstanding.** In particular, test the real chat switch during a long Custom-endpoint Extractor call, switching away/back, an actual browser reload after `pending` was saved, duplicate `MESSAGE_RECEIVED`/CHAT_CHANGED events, and a player input sent while a pending-world job is being resumed. Real-life UI events may differ from Node mocks. `generateRaw` cannot guarantee cancellation of the underlying network call; only preventing further reads/commits is guaranteed by the guard.

## Scope deliberately excluded

- Previously finished `failed` extractions are never replayed. Their `FAILED_CORRECTION` and deterministic Engine-state outcome remain authoritative; user can regenerate/swipe before making another choice.
- No automatic Narrator story regeneration, retrying or swiping. This is the separate remaining 10B-4d area.
- No new Extractor interpretation policy, no upgrade to GLM provider model or change to `maxTokens:6000`.
- No changes to the automated Runner's existing 10B-4b.1 soft/hard failure policy.
- Patch 10B-3 and the F60-2 wording gap are untouched.

**Sign-off gate:** Locally green targeted/full tests, independent source review and real ST smoke/live evidence when available; then separately evaluate whether 10B-4d (Narrator no-text recovery) can be made safe within ST's generation lifecycle.

## Follow-up .66 (24 October 2026): ST first-swipe initialisation

Run 5 and subsequent real ST probes exposed a lifecycle mismatch not covered by the original fourteen tests: MESSAGE_RECEIVED precedes ST's assignment of swipe zero. The .66 follow-up normalises absent/null swipe IDs to zero in both identity and dedupe comparisons, while preserving actual swipe-change and all other stale guards. Five additional regressions, full-suite and real-ST results, including unsuccessful attempts and remaining swipe_info observations, are recorded separately in `PATCH10B4C2_SWIPE_ZERO_HOTFIX.md`. Earlier verification statements above remain historical.
