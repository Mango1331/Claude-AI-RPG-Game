# 10B-4c.2 Hotfix — Initial swipe identity (.66)

Date: 24 October 2026. Base: dev HEAD `94ed5002f74c711648f1706375ad6c186dee3636` (documentation over product .65 `d182e900c6cb1cd32a945a52afc101590a60462b`). Build: **4.3.0-c.6.6.66**. Narrator contract remains .55. Scope: initial swipe identity only; no changes to recovery budgets, gameplay, authority, narrator, runner or current_test.

## Cause and minimal correction

Run 5 (`20261024-093931Z-current_test`) established the symptom: valid Extractor response after 12.7 s, but no commit and pending until the runner's 900 s timeout. The original forensic review remains unchanged on main. Claude subsequently identified and reproduced the host cause; this implementation independently checked the source of **SillyTavern 1.19.0**, tag commit `7e8663cd9c184a550b37238218bdd32c6efc68e9`.

In `public/script.js:saveReply`, the non-streaming reply emits/awaits MESSAGE_RECEIVED before assigning its initial swipe_id, swipes and swipe_info. Avereth's onMessageReceived prepares the pending record, saves it and starts createWorldJobs/runExtraction. When the model response returns, swipe_id can have changed from undefined to zero. The former strict comparison invalidated that same initial reply. A duplicate start also failed deduplication and could replace its in-flight job.

Only the two identity comparisons in `src/v4/world_jobs.js` are changed:

- belongs: `(msg?.swipe_id ?? 0) === (job.swipeId ?? 0)`;
- start dedupe: `(pending.swipeId ?? 0) === (msg.swipe_id ?? 0)`.

The job still captures its original identity. Null/undefined mean first swipe zero, not an arbitrary current swipe. Actual zero-to-one changes remain unequal. Chat ID, chat array, message object, record/text hashes, later Engine turns, cancellation and commit/save guards are unchanged. No new state fields, events, migrations or recovery calls. This is shared host coordination for existing and new campaigns, not a ruleset-specific gameplay change.

## New regression evidence

Five tests appended to `tests/v4/patch10b4c2_world_jobs.test.js`:

1. Missing swipe at MESSAGE_RECEIVED; provider is already in flight; ST then creates swipe zero, swipes and a cloned pending swipe_info.extra. Real runExtraction must commit one extract.applied and finish the save with status applied.
2. Same ordering with explicit null instead of undefined.
3. Repeated start after initialisation must return the same promise, without aborting/replacing the in-flight job.
4. A real zero-to-one swipe, even with identical text, must reject the valid old response before world commit/save.
5. A preinitialised zero continues to commit and save exactly once.

Against unchanged .65 source: **3 new failures / 2 passing controls**, whole world-jobs file **16/19**. After the two-comparison fix: **19/19**, including all fourteen existing chat-switch, edit/delete, late-turn, exception, resume and save-barrier cases. Full `npm test`: **1426/1426**, zero failures/skips/cancellations, approximately 25.3 s. Diff whitespace check passes.

## Actual SillyTavern smoke

Fresh isolated ST checkout, tag 1.19.0 above; Node 24.22.1, Playwright Chromium Headless 151.0.7922.34 on Linux. ST dependencies and browser installed for this task; no smoke/runner source was changed. Initial browser-missing/download prerequisites were resolved before the browser comparisons.

| Actual browser run | Result | Extractor / Narrator requests | Relevant checks |
|---|---|---|---|
| .66 first attempt | FAILED: 20/21 | 5 / 5 | Mechanics all passed, but noPageErrors failed with `Unexpected token 'I', Internal S... is not valid JSON` and `AbortReason @ openai.js:4565`. Not hidden or counted as a pass. |
| .65 unchanged counterprobe | FAILED: 19/21 | 8 / 5 | extractPerReply=false, fightOpened=false, final status extractor pending; pageErrors empty. Independently reproduces the host regression. |
| .66 final attempt, same installation and unchanged script/product code | **PASSED: 21/21, Exit 0** | **5 / 5** | extractPerReply=true, fightOpened=true, swipeReusesPlan=true, noPageErrors=true. Integrity OK, no final pending status. |

The final run used `AVERETH_ST_DIR=<isolated st66 checkout> npm run smoke:st:c`. After its awaited saveChat, the on-disk JSONL was independently read: all **four current story reply records** had extraction.status=applied and **one extract.applied each**. Five provider calls include the additional swiped reply; they are not five separate current message records. No historical pending swipe_info copies were found in this final saved chat. This does not prove every possible switch-back/reload scenario. The first .66 attempt's ST errors were not reproduced in the final run; their specific cause was not established, and no unrelated code was modified to silence them.

The ST installation and browser are separate test resources, not the user's personal profile. The unchanged product `npm run smoke:st:c` drives a real browser and real ST with its existing deterministic mock provider; it is not a new natural GLM run. No new Run-5 review or original ZIP upload was made.

## Remaining observation: swipe_info

ST copies extra into swipe_info[0] while the authoritative current message can still be pending. The new tests deliberately reproduce that copy; they verify the current record's eventual engine commit and serialized save, not synchronisation of all historical swipe_info copies. Restoring an older snapshot on switching back is a separate observation. This hotfix does not add a second persistence system or rewrite swipe history. A new natural current_test and independent source review remain separate acceptance steps.
