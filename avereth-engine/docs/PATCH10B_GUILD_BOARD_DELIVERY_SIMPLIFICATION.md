# Guild board and delivery simplification — Build .75

Base: `2ca214f` / `.74`. Implements the owner's Run-10 follow-up decision; no private-job, combat, XP or Monster balance changes.

## New boards

New ruleset-2 V4-C boards contain two Monster hunts, two deliveries and one clearance of a suitable Dungeon level known to the Guild. Without a suitable known Dungeon, a third hunt takes its place. Generation remains creative in titles, clients, goods, places and rewards. A Novice board must include a level-1 minor hunt for one foe; this validates the advertised entry option, not the safety of every subsequent encounter.

`guild.js` checks the families and counts before publication, including retained notices in a partial refill. Invalid or incomplete boards use the existing single repair and atomic publication path. Extra rejected listings cannot bypass the family counts. New boards have no escort or mixed-work contracts; Legacy boards, previously accepted contracts and spontaneous private escorts retain their mechanics.

A delivery has one physical DELIVER objective with an integer quantity and `where` in the form `Recipient at Place` or `deposit at Place`. No additional objectives or proof items. The engine renders its task/end state from that objective, so generated signatures, container returns or other duties cannot become an extra completion gate. Clearance text names the exact level and includes an engine-supplied risk warning. Existing recipient, custody, location, floor/rank and DROP restrictions still apply. Validation checks supported contract structure, not every possible future world event; recipients and destinations are resolved through normal play, without spawning NPCs to make a contract pass.

## Existing deliveries

Run 10 genuinely transferred the physician's satchel to Gretha. The contract described this twice, as DELIVER and GIVE; its one receipt satisfied only the former.

`deliveryStatus(q, state)` now also recognizes a recorded handover as proof of the other description when a contract has exactly two delivery objectives, one of each verb, equal quantities/compatible units, matching physical cargo and the same valid historical recipient/place. Presence is required for a new transfer, not again at the later Guild turn-in. The existing receipt and capacity remain unchanged: no second `quest.delivered`, extra units, new event type or migration. Two DELIVER objectives and unrelated goods, recipients, locations or quantities remain separate. The same check is used by READY, turn-in and old-custody confirmation.

## Open test player

`current_test` now motivates early shop visits, affordable weapon/armour upgrades, supplies, recovery and actually equipping purchases. Saving for gear or earning money through safer work is allowed. It retains free class/quest/route choices and voluntary roleplay; no required purchase, shopping loop, fixed fight, fixture or invented progress. The 100-input observation window is unchanged.

## Verification

- 14 new regressions: on unchanged `.74`, **11 red / three green controls**; on `.75`, **14/14 green**.
- Adjacent suites: **202/202**. Final full `npm test`: **1529/1529**, no failures/skips.
- Coverage: exact/fallback board mix, partial refill, introductory hunt, rejection of redundant objectives/proof, canonical contract text, real deposit at the correct place, the original Run-10 satchel receipt, real GIVE, no re-delivery credit, single payout, JSON reload/replay, Legacy and private escort support.
- Older synthetic board answers were updated to the new profile. Historical archived run JSONs remain unchanged; the historical missing-quantity booking test still checks its original backwards-compatible defaults. The selected original satchel data is in `tests/v4/fixtures/run10_satchel.json`.
- Real ST 1.19 Mock-Smoke: first attempt **20/21**, all five extractions applied, but ST's API-status handler logged `AbortError: The user aborted a request` at `openai.js:4565`. One unchanged repeat **21/21**, five planner/narrator/extractor calls each, no PageErrors; four saved current story records each have one `extract.applied` and `status: applied`. The first failure is retained, not filtered out; its timing cause is not established.
- No natural GLM run started. The new board generation and purchasing behaviour still need natural acceptance. Private-job completion without authorized work, missing narrated targets and combat/escape fairness remain separate open topics.
