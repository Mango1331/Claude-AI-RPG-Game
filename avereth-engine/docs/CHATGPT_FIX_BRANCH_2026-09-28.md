# ChatGPT V4 live-test fix branch — 28.09.2026

Branch: `chatgpt/v4-livetest-fixes-2026-09-28`  
Base: `1cbfdd415a7f0416ae6cd396271f7f5a4a3bb750`

This is an isolated experimental implementation of the findings from the two Runtime-V4 live tests. It does not replace the independent review planned for Claude.

## Confirmed root causes addressed

- `learn.o` was passed through the entity resolver, so the literal name `Alaric Red` could become the entity id `pc`.
- The extractor's name-learning rule treated narrator prose as possible evidence that an NPC learned Alaric's name.
- The domain firewall was evaluated once against the pre-reply state, so a same-reply arrival could change the authority context after the check.
- Free facts and marks could imitate Guild-contract payout/status/completion state.
- Guild contract objective/proof existed canonically but was not guaranteed narrator-visible at Board/acceptance/active-quest context.
- `activity(search)` had no mechanical resolution and delegated its yield completely to narration.
- The interpreter vocabulary did not make directional lead movement such as “walk toward the sound” explicit.
- `nameFromRef` could infer a person's name from a capitalised business title such as “The Drowned Gull”.

## Minimal redesign choices

### Search

Search reuses Core #7 instead of adding an encounter subsystem. Each `activity(search)` gets one engine-owned PER vs moderate Difficulty check. This check is the turn's check; no second generic CHECK DIE is issued.

- Success must become a concrete discovery, encounter or actionable lead.
- Failure remains a real failure: nothing relevant, a dead/false lead, a complication, or the avenue being exhausted.
- Repeated search may not remain an interchangeable atmosphere loop.

The narrator still creates blank-space content appropriate to the location. The engine decides success/failure, not which cave, person or creature exists.

### Quest friction

No new Quest-state subsystem was added. The V4 narrator contract and world lore now require at least one causal, meaningful complication in a nontrivial accepted adventure Quest before normal resolution. Combat is not mandatory; trivial safe local errands are exempt. This guarantees playable development, not success.

### Quest canon visibility

Board rendering, acceptance, the V4 catalog and pinned active-quest context carry the exact canonical objective and proof. What the engine later requires at turn-in therefore has a narrator-visible source before it becomes necessary.

### Authority / overreach

No generic causal graph was introduced: the current delta schema carries no dependency ids, so a general causal rollback would be speculative. Instead:

- Guild contract payout/status/proof/completion and Guild-clearance marks are protected as engine-domain state.
- legitimate field proof (for example Old Hew confirming delivery) remains world-owned;
- the firewall is re-evaluated at each delta's story step so same-reply arrivals update authority context;
- extractor delta-0.5 says that a world delta existing only because of an overreaching Alaric action must not be emitted separately.

## Regression coverage added

`tests/v4/regressions_0928_afternoon.test.js` covers:

- one engine-owned Search check and no second generic die;
- literal `Alaric Red` learning without `pc.name=pc`;
- Drowned Gull title/name regression;
- protected Guild contract payout/status/slip clearance while field proof remains allowed;
- same-reply arrival followed by a Guild-canon fact;
- exact objective/proof in the active Quest catalog;
- Search/Quest-Friction contract rules;
- directional “walk toward the sound” GO vocabulary.

The existing extractor prompt test is updated for delta-0.5.

## Deliberately not redesigned here

- No new Encounter Director.
- No new Quest complication state machine.
- No global rollback of every delta in a reply containing any overreach.
- No broad combat rewrite.
- Older creature identity/target-clarification issues should still be re-tested and only changed if reproduced on this branch.

The next intended live run remains a Warrior baseline: normal Guild use, a nontrivial Quest, purposeful wilderness Search, then one larger opponent if the world/search result produces one.
