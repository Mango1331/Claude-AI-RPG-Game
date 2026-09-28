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

## Live run 15:17 — follow-up findings (Engine 4.0.1)

The real SillyTavern run confirmed the new Search design: a purposeful search produced one engine-owned PER check (5 vs 6, d100 11, SUCCESS) and the narrator turned it into a concrete fresh large-animal trail leading downstream instead of another atmospheric non-result.

It also exposed five follow-up issues now fixed in 4.0.2:

- the extractor echoed that already-booked Search check as a `check` delta, which produced a visible `ENGINE REFUSED: no CHECK DIE`; Search-check echoes are now explicitly forbidden and are silently deduplicated defensively;
- tracks/hair/wallow of an unseen unknown beast were incorrectly proposed as `creature.new`; extractor canon now treats signs as evidence/fact/thread until the creature itself is established;
- the ACTIVE QUESTS / QUEST FRICTION section had been built but accidentally omitted from the final context-section order, so Quest Friction was not actually present in the live narrator prompt; it is now included as priority-0 context;
- V4 word replacement `ledger=register` changed the model's correct canonical title “Deliver a Ledger…” into visible “Deliver a Register…” before extraction; V4 now leaves narrator prose unchanged by style word swaps (V3 retains the feature);
- a Guild `quest.detail` persisted the sentence “he won't pay for early” even though Guild payout is engine-owned. Guild details may now add contacts/routes/schedules but the extractor and firewall forbid payout/payment/reward/proof/completion/rank/fee mechanics.

The same run also exposed a V4 location-view issue: a wilderness leaf could display as `Caelreth, Caelreth — Unnamed Wood...` because context/HUD used the V3 compatibility `scene.location` instead of the V4 leaf `scene.at`. V4 context/HUD/lore keys now prefer `scene.at` while leaving compatibility state unchanged.

Quest Friction itself remains untested by this run because Alaric accepted Night Watch and then left for unrelated free exploration before undertaking the quest.


## 4.0.3 — 17:25 live-run follow-up

The 4.0.2 run confirmed Quest Friction but exposed the handoff from narrative actors to deterministic gameplay.

Implemented in 4.0.3:
- stable pre-combat scene handles (Footpad A/B, Wolf A/B/C) shared by context, catalog, HUD, target parser and combat labels;
- explicit player readiness for combat opens an encounter without attacking or spending resources;
- Core #12 Range Band semantics in the extractor contract;
- fallback GO arrival is applied before destination-scene deltas so reset_present cannot erase a same-reply NPC;
- contextual journey.continue for clear consent to an already-established escort journey;
- engine-booked Guild document dedupe regardless of echoed holder;
- Runtime V4 name:null is authoritative; no ref/place-name inference such as Ashbridge or Drowned;
- Power Rank protected as engine state;
- Guild Board generator redesigned around cause -> stakeholder -> problem -> desired end state -> objectives -> proof -> reward, with rank controlling scope/risk rather than mundane-vs-fantasy and rats no longer the default low-rank combat example.

Not changed: damage/Skill math, XP, initiative policy or class balance. The 17:25 live run never reached actual combat resolution, so those existing mechanics remain untouched pending the next live test.
