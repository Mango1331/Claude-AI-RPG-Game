# Isolated architecture experiment 201 (B vs C1)

This is **not build .201**. Product .200 and all plugin files are unchanged. The directory is deliberately outside the engine's package scripts and automatic test globs. No external dependencies or provider calls. Run with Node >=20 from the repository root:

```sh
node --test experiments/architecture201/prototype.test.mjs
node experiments/architecture201/measure.mjs
node experiments/architecture201/st119-source-check.mjs /path/to/isolated/SillyTavern
```

The last command only reads a real ST1.19 source checkout. It starts neither server nor browser. `measure.mjs` regenerates `results/measurements.json`; tests and measurement create disposable journals under the OS temporary directory. No personal ST data are accessed. `results/st119-source.json` records the source contract checked in this workspace.

The German comparison/decision report is `recherche/ARCHITEKTUR_PROTOTYP_B_C1_VERGLEICH_2026-11-16.md`.

## Components

- `journal.mjs`: single-process atomic file replacement + fsync + readback, world revision and durable turn/request records. Failures before/during/after replacement can be injected. This is not a distributed transactional database.
- `scheduler.mjs`: weighted admission (four units), bounded attempts, persistent backoff/remote-unknown leases and response receipts. Abort does not release capacity. A transport completion or explicit remote-completion signal is required. Blocked turns are explicitly resumed, not automatically polled in an unbounded loop. Other account sessions are outside its scope.
- `engine.mjs`: calls existing .200 `prepareGenerationAsync`, `parseExtraction`, `applyExtraction`, `foldChat`. A complete-string known-place route can return a local plan through the existing planner transport seam; the planner prompt is constructed but never sent in this fast path. Existing schema/agency/mapping still execute. No alternative combat or world rules.
- `orchestrator.mjs`: same core for B and C1, staged chat copies, saved phase checkpoints, revision compare before commit, retained request receipts, one possible C1 correction phase. B keeps narration plus extraction. C1 passes nested proposals directly to the same domain validator.
- `host.mjs`: ST1.19 behavioral mock and held-publication adapter. Controlled generation buffers response data outside stock `Generate`; `saveChat({chatData})` plus readback precedes chat insertion/display. Stock streaming is modeled as already visible before message-received hooks. Committed regenerate/swipe reuses the result; alternative narrative branching is **unsupported**, pending swipe explicitly refused.
- `fixtures.mjs`: recorded .191/.122 examples plus explicitly labeled synthetic controls; C1 envelopes and paragraph-span associations are **derived**, not naturally generated. The private original .200 chat and the terminal-reconstructed narrator messages are in `fixtures/forest200.json.gz` with source filename/hash. No API keys/headers or full terminal log are included.

## Important bounds

The scheduler measures all messages supplied to its offline transport: UTF-16 content characters and serialized JSON UTF-8 bytes, not provider tokens. Prototype narrator prompts include actual exported style/canon/contract/persona from the original trace plus selected history/current engine context. They do not claim exact reproduction of all ST prompt injections. Original terminal mojibake is preserved in the imported static messages. C1 conservatively includes narrator and extraction instructions; it is **not prompt-optimized**.

One historical sale requires a disclosed current-schema adaptation (price evidence for the already agreed 65cp; remove the redundant narrative coin gift because the engine already settles it). This changes no replay original. The .200 forest has **no successful original extractor answer**: its successful arrival control is synthetic. Its original timeout/wait metadata are asserted separately; remote retention after abort is simulated, not proven to have caused the real incident.

Tests named **COUNTEREXAMPLES** record failed semantic requirements, not successful acceptance: an explicitly denied arrival can still be booked, and an unreported narrative promise can be lost. Exact span links plus schema/domain validity do not prove prose/world consistency or completeness. A green test run therefore **does not mean C1 passed semantic acceptance**. B with an equally incorrect extractor answer shares the guard limitation; no natural quality advantage is measured.

No full integration, public API stability, cross-process locking, provider-wide distributed semaphore, automatic migration, group chat support or new-swipe narrative branch protocol is claimed. No new product version, no product fingerprint changes. The ST mock plus source check establish a feasible controlled path, not an end-to-end browser acceptance.
