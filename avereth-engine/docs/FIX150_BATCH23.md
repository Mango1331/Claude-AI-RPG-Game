# Build .150 – Batch23: Dungeon identity, total-price evidence and final integrity

Date: 2026-11-02. Base: .149 / b7b30d0b763a4142a821d335e250dfbc4c3c8b4a.
Scope: the independently reproduced Batch23 issues and the GPT counterreview in
[the main review, §7](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ff68dccc022a42e86372d26cb7931a48198c66b3/testrun_10b/batch-20261101-232944Z/REVIEW.md#7-gpt-gegenreview--eigenständiger-codeabgleich-02112026).
One product patch; no balance, new finance architecture, player strategy or new narrative heuristics.

## Confirmed causes and corrections

### 1. Return to an existing Dungeon, not a new Dungeon under the inn

Batch23 Warrior I73 first selected the known entrance-gallery ID. The Planner's RECENT ROUTE advertised that ID,
but its PLACES/schema excluded remote Dungeon rooms. The repair returned a new textual destination instead.
I74 then reported a confirmed arrival at a new interior with parent:null. The resolver parented it to the inn;
Dungeon classification promoted the whole inn complex to a second living population. Later rooms were detached
again; killing their creatures did not clear the contract's original Dungeon. Refusing that payout was correct.

- `catalog.routePlaces()` now supplies both catalog and Planner route text. From outside a Dungeon it names the
  visited root instead of a remote room. Previously visited true Dungeon destinations enter the shared catalog
  through its existing visibility checks. Other historical sites are not indiscriminately added; Planner route
  text is limited to IDs its actual reference schema accepts.
- `place_refs.scopedPlaces()` reuses the existing arrival/habitat scoping mechanism: an authorized GO to a known
  true Dungeon and `expected.arrived:true` can supply that root as the missing parent of the same reported interior.
  Exact scene-reference identity is matched structurally. Explicit independent parents, unrelated rooms and
  unconfirmed arrivals are not rewritten. An already recorded `{new:"the <known Dungeon>"}` GO can use existing
  read-only place-identity resolution; no new name parser or permissive room enumeration.
- `world.wayRefused()` recognizes that same known destination for the existing external-Dungeon check. It does not
  authorize an arrival by itself; gates, seals, passage checks and the player's GO remain required.
- `world.dungeonClass()` refuses an unparented new interior outside an established true Dungeon rather than
  implicitly classifying the unrelated current building. A new cave with its explicit parent and ordinary inn rooms
  remain valid. Classification of an actual current/existing root remains supported.

No Slot, population, guardian, reset, combat or CLEAR-credit rule changed. Existing wrong places in an already
corrupted campaign are not migrated or silently repaired by this patch.

### 2. A price quote is not the span of the money itself

Batch23 Mage I72 offered “Six silver, then — six silver the pair, the fang and the sac both, paid now.”
The Extractor correctly supplied a firm 60-cp total. The literal evidence returned the entire quote
“six silver the pair” as its money span; the rate detector then read the following “, the fang” as a unit rate.

`finance_evidence.moneyLiteral()` now preserves the existing coin reader's actual money offsets separately from
the full quote ranges, for ordinary literals and mixed-currency handfuls. The existing S2 rate check starts at the
money boundary. No new words/rate patterns were added. Consequently the pair total is accepted, while “six silver
the fang” and “six silver each” remain non-total prices for multiple units even when their suffix is inside the quote.

World BID creation and existing `offer.accept` transfer the original fang and sac for exactly 60 cp once. S2 still
requires an explicit end total; quantities, ownership, conditions, consent, stored prices and transaction authority
are unchanged. This does not promise to prevent independent later provider/model failures from the Mage run.

### 3. Concrete place facts and honest completion reports

Warrior I632 used `loc.otterhound_holt_under_the_leading_alder`, while the actual place used `leaning`.
The World concrete-reference guard covered NPCs and monsters but not places. It now also rejects unknown concrete
`loc.` IDs in the existing fact/related reference checks. Known places and ordinary free narrative subjects remain
allowed; no fuzzy correction, new place, or broad prose filter is introduced.

The runner now folds and validates the final exported chat, including an existing disk-read chat when available.
`evaluation.json.integrity` reports fold errors, validation problems and `ok`; the report/run notes also state the result.
A nominal `done` with a bad state becomes `integrity_failed` with `original_kind:done`. This is a diagnostic at
the already reached endpoint, not an extra interruption during play or a recovery mechanism. Provider, manual,
death and other end causes are preserved and their integrity is reported separately. No extra model calls or actions.

The validator cannot detect every semantically wrong but structurally valid world. This endpoint check would expose
the original dangling fact, but does not replace the Dungeon identity correction or independently prove a safe save.

## Regression evidence

`tests/v4/fixtures/batch23_fix150.json` contains original event-only prefixes and relevant narration/extraction,
not prompts or credentials. Source ZIP SHA-256:
`7702cae7baa17c65bc3296aff3f6f98a5a63e8476134d1dd849884dfc785b9c2`.
The complete 111-MB ZIP remains the user-supplied original, not an archive uploaded by this patch.

- **14 product regressions:** against unchanged .149 in a detached worktree, **10 fail / 4 positive controls pass**;
  on .150 **14/14 pass**. They cover the original I73/I74 and I72, confirmed/unconfirmed/no-GO paths, explicit
  independent cave, ordinary inn room, repeated entry, exact quote boundaries, true unit rates, known/free/unknown facts.
- The connected Dungeon case continues the original return through real combat, original remaining slots and guardian,
  floor clearance, normal Guild turn-in, JSON chat reload/fold, and refusal of a second 60-cp payment. Combat-strength
  and melee-position test preconditions make this deterministic; it is not a natural play/balance claim.
- **2 endpoint-report regressions:** valid completion and the original stored dangling fact, with provider/manual/death
  causes preserved. These test the new diagnostic; they are not advertised as two existing .149 APIs failing red.
- **1 additional replay-lineage test:** all 478 .149 acceptance entries remain unchanged; exactly one justified new entry.

## Acceptance

- Full `npm test`: **2696/2696 passed**.
- Full fingerprint replay: **2235 compared; 479 exact accepted differences; 0 open/stale**. Only new difference versus
  .149: **b19-warrior#354**, a fact about the nonexistent
  `loc.thornhollow.the_orchard_terraces_and_brush_slopes_of_thornhollow`, is now individually rejected instead of
  stored. Knowledge, time and episode memory remain; no money, goods, combat, XP, movement or quest-completion event
  changes. Prior fingerprint file unmodified; `accepted_fix150_vs_126.json` pins the additional output and previous hash.
- Real ST 1.19 host, mock provider: **standard 36/36**, **fail-soft 41/41**, no PageErrors. Includes finance/#pay,
  actual source/confirmation edits, reload, swipe, regenerate, normal continuation and simulated save recovery.
  **33/39 model calls, 13/15 extractions**, unchanged from .149.
- Browser environment: Playwright 1.64.1 with the already installed Chromium headless shell **153.0.8010.0**, selected
  through a temporary external launcher preload; no product or ST installation workaround. Downloading the matching
  new browser failed, so the available real browser was used and verified. The ordinary smoke also passed separately.
- Final diff/whitespace review: only the listed correction paths, versions, regressions, replay acceptance and this note.

## Boundaries and next step

No XP/PP/LP/stat/gear-price/skill/AoE changes; no Shop, Main/Minor, provider retry or Runner-strategy work. Prompts,
schema revisions and personal Narrator-card revision unchanged. Read-only route content changes naturally with the state.
No natural batch started. Fresh Warrior/Mage/Rogue runs on .150 must show the corrected paths under real model choices;
the historical replay does not simulate an alternate full campaign. Small narration mistakes remain tolerable.
Windows-native EPERM recovery is still not proven by the Linux simulated-save check.
