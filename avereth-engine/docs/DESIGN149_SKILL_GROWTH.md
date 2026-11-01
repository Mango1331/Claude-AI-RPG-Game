# .149 — Organic F skill growth

Basis: .148 (Combat-QoL), following .147 `a9f00b4`. Implements only the user's approved Batch22 skill package; no Engine-Shops, finances, Main/Minor, runner strategy, skill power/cost, XP, start-stat or learning-rate change.

## Behaviour and boundaries

- `rules.proficiency.award.challenge.offensive_f_levels_below = 4`: only a F-rank PC's actual offensive F-skill targets use the expanded window. PC/skill ranks beyond F retain the shared −2 rule. The encounter's locked starting level/rank is used. A strong spectator does not qualify attacks on trivial creatures.
- `skills.skillFightQualifies()` is shared by offensive PP and development notes: actual offensive evidence, won encounter, survival and no escape. Defensive/Utility and historical records lacking offensive evidence retain `fightQualifies()`, including actual threat/effect requirements. One PP key per skill/encounter; no reward for illegal actions or repeated attacks in the same fight.
- `skill_growth.developmentEvents()` keeps only qualified skills' actual recorded patterns; combinations require both genuinely effective, qualified uses. Instant kills may retain closing/reach/etc. already recorded by the engine. No prose-derived patterns or new progression store.
- Evolution still requires P5, two different matching encounters, validated offer, and explicit acceptance. The two notes may predate P5. Existing last-eight-notes retention, spent evidence, lineage, complexity bounds and successor identities stay. Accepting still replaces the old skill with a new identity at P5/0PP, as before. No automatic skill/evolution on level-up.
- Combat-end evaluation sees its just-earned promotion. Existing safe-turn offering rechecks notes after real practice can reach P5. Neither path accepts the offer for the player.
- Existing learning goals now explicitly say “Learning”, source, LP progress and that another manual does not add LP. Learning time/caps/costs/rates and PP base12 × affinity remain unchanged.

## Original evidence and regressions

`design149_growth.test.js`: **18/18 green**. Against unchanged .148: **11 red / 7 green controls**. Tests include actual money-independent combat-end/host events, actual practice → P5 → offer (no automatic acceptance), explicit acceptance, declined/spent notes, successor ownership, save/reload and alternate narration. Existing P5-only-era tests were adjusted only where the newly approved rule intentionally supersedes them; the trivial-foe control now uses a five-level gap instead of four.

`fixtures/batch22_growth149.json.gz` holds the original 21 completed Rogue encounters, original prior states and action records. Source: Batch22 .146 ZIP SHA256 `ce1bb79b3a6d7ea312c8f2406feb66daebb9c35b8d752e3b7ac2f48c2b513406`. Actual `enc.t8`, `enc.t48`, `enc.t53` instant-kill closing records now retain notes. Re-evaluating the same recorded struck targets gives **13**, rather than six, eligible Piercing Thrust encounters. This is a fixed-record qualification check, **not a resimulated campaign or guaranteed new mastery/evolution outcome**.

Combat-QoL .148 final regressions: **11/11**, against .147 **6 red / 5 green controls**; original Mage/Brenna/three-beetle and Warrior/six-boar states included. Adjacent Combat-QoL set **154/154** before the final additional untargeted-area control; adjacent skill set **65/65** before two additional host/combat-end checks. All final cases are included in the full suite below.

## Final common acceptance of .148 + .149

| Check | Actual result |
|---|---|
| Full Node suite | **2679/2679**, 0 failed/cancelled/skipped; `npm test -- --test-concurrency=4 --test-reporter=tap`, 28.44s |
| Fingerprint replay | **2235 cases**, 478 exact accepted differences from .126, **0 open / 0 stale**; ten historical original event folds valid, no replay errors |
| Real ST1.19 Standard | **36/36**, 33 model calls, 13 extractor calls, no PageErrors |
| Real ST1.19 Failsoft | **41/41**, 39 model calls, 15 extractor calls, no PageErrors |

Both real-host runs include existing finance/#pay/Edit/Reload/Swipe/Regenerate/continuation and .147 save-recovery probes. Provider is the deterministic smoke mock, **not a natural GLM batch**. Windows EPERM itself remains untested on Windows; Linux real-host HTTP500 simulation is not proof of Windows recovery. No external ST installation was changed. Browser mock was not rerun.

An earlier full Node command exited zero without a complete test summary; it was **not accepted as a full-suite result**. The final repeated command above produced the complete 2679-test summary. Intermediate failures were old superseded design expectations and pending reviewed fingerprints, not hidden passing results.

### Replay changes, individually pinned

- .148 vs actual .147: **40 records** = 38 board-display outputs + two spared neutral-NPC recruitment cases (`b17-rogue#15`, `b19-rogue#59`). `accepted_design148_vs_126.json` pins each prior-output hash, exact new hash, original accepted entry when present and a record-specific reason. Old lists remain unchanged.
- .149 vs .148: **64 records**, including 21 changed PP-award records and 22 pattern-note records (categories overlap); remaining changes are locked offensive-eligibility flags. Each entry in `accepted_design149_vs_126.json` names its skills/encounter/PP result and pins its .148 output. All actual recorded attack records, coins, transactions, created/transferred goods, XP, level-up and quest-completion events match .148 exactly. No blanket fingerprint rewrite.
- Replay is performed on each original prior state. It verifies individual transitions and current event replay; it does not predict all choices in a fresh campaign with faster proficiency.

## Remaining observations

First natural observation of this design is still pending. Relevant next-batch questions: unintended NPC damage, useful known-danger warnings, actual PP-eligible encounters, first voluntary skill evolution and manual learning time. The last-eight note window still exists. Less-used skills need not master by Level15. A more demanding population remains dangerous; no hidden rescue or stronger gear has been added. Engine-Shops, LP-rate changes, E-acquisition/scaling and Main/Minor remain separate unapproved work. No natural batch started.
