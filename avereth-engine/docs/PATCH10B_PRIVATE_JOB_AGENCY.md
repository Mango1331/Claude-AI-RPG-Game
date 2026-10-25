# Private jobs: acceptance is not work — Build .76

Base: `ebcc010` / `.75`. Implements the private-job plan on `main` without a second quest/proof system, additional LLM calls or a required sequence of player commands. Guild delivery, boards, XP, combat values and the test-player guide are unchanged.

## Behaviour and implementation

Run 10, input 49 / records 97–98, contained only `quest.accept`. The narrator invented pushing the cart to market. The engine correctly refused arrival (`no_go`), but still booked 45 minutes, completion and three copper. Acceptance now explicitly authorizes only the agreement. In V4-C/ruleset 2, a private completion requires an actual, successful player-chosen job action; progress text and the giver's claim alone do not suffice. An acceptance-only reply claiming that unperformed completion cannot charge its narrated work time.

The planner can attach optional `job: <private quest id>` metadata to an existing GO, activity, other deed, attempt, GIVE or combat skill. The parser validates the reference/action type, and the existing agency guard still validates the player's quote. No new player command or mandatory extra work/travel turn: “I push the cart all the way to market” remains one GO. The planner supplies the semantic job link; the engine checks the action's result. The narrator/giver still judges whether that chosen work actually fulfilled the agreement.

`private_jobs.js` records one bounded `q.work` receipt through the existing `quest.progressed` event. GO requires its own confirmed arrival and actual movement; conditional GIVE needs its successful handover; activities use engine-resolved work or their completed extractor result plus booked time. Failed feature/search checks do not qualify; ordinary local deeds need no invented dice roll. Only the executed combat action counts, not a second skill deferred by the one-action rule.

`world.js` settles private completion and wages after arrivals/conditional actions. `coin.gift.job` identifies agreed wages; a narrow fallback recognizes unlabelled wages or a named/closing job. A first valid payment emits the existing currency and `transaction.completed` events, storing `q.payment`. Repeated claims cannot pay again. Fixed numeric rewards must match; unspecified “bread money” can be priced by the actual payment under existing coin/presence checks. Completion and payment may happen in different turns. Independent gifts, tips and unrelated payments remain legal, including from the same giver.

Work/payment survive ordinary event replay, JSON reload and swipe replacement. Completed jobs awaiting payment remain visible to the planner/extractor/narrator. Ruleset 1 retains its previous semantic completion path. Historical work/payments without receipts are not invented or retroactively migrated; an old unpaid job needs a current verifiable work action. Ambiguous wages require an exact job reference. This is an authorization/result guard, not a general natural-language task evaluator or an advance/instalment-pay system.

## Compatibility and verification

- Delta vocabulary `delta-1.2`, extractor `extract-5.3`: optional nullable `coin.gift.job`; older answers normalize the missing field to null. Existing event types and Planner version remain unchanged; Narrator contract remains `.55`.
- 21 new regressions on unchanged `.75`: **15 red / six green controls** (including validation of the new metadata); `.76`: **21/21 green**. Includes selected original Run-10 mechanical claims, natural combined work/travel, local repair, delayed wages, unknown/wrong/ambiguous payers/jobs, failed checks, conditional handover, unrelated cash, Legacy, replay/reload and paid swipe replacement. The old morning-watch positive test now actually performs the work before claiming completion.
- Adjacent suites: **121/121**. Full `npm test`: **1550/1550**, no failures or skips.
- Real SillyTavern 1.19 Mock-Smoke: **21/21**, five planner/narrator/extractor calls each, no PageErrors; four saved `.76` story records each have `status: applied` and exactly one `extract.applied`. Process exit 0. An earlier same-build smoke also passed 21/21 but printed `fatal library error, lookup self` in its terminal log (origin not established); the final smoke log is clean.
- No natural GLM run started. Natural recognition of private-job actions/payment references remains to be checked in play; the smoke verifies the real host with scripted provider responses.
