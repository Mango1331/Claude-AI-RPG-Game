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


## 4.0.4 — 20:45 live-run: visible Monster → targetable actor

The 4.0.3 run reached the intended Quest-friction Monster reveal but exposed a hard handoff failure: the extractor correctly reported a visible "plated wallow beast" at SHORT range, yet the world rejected the free fantasy species name because it did not itself match an F1 anchor. The following Basic Attack therefore had no canonical target.

4.0.4 changes:
- creature.new now separates the in-world species/display name from an explicit mechanical F1 body-plan anchor;
- a visible creature is materialised immediately at reveal, locking Level/profile/HP before the player's next decision;
- the same reply's System panel shows the canonical scene handle + HP + Range, but does not roll Initiative or begin Combat;
- the first actual player attack then starts the existing deterministic Combat resolver and fixes Initiative;
- final V4 prose is not exposed as final display until its extraction is committed, so a new Monster does not visibly appear seconds before its engine identity/HP;
- unresolved pre-combat attacks are System-only; the narrator is not called to invent movement or an attack after "no valid target";
- equipped starter gear is included in the V4 catalog and readying/drawing an already-equipped weapon cannot become "he does not hold it";
- Guild proof checks sum multiple gathered resource stacks and consume only the required quantity; extractor guidance requires concrete quest GATHER yields to become canonical resource objects;
- invented Guild plate replacement fees are rejected as Guild canon.

Inventory containers/capacity and sack aliases are intentionally out of scope for this patch.


## 4.0.5 — soft-world simplification after 22:21 live run

The 4.0.4 run showed that the Runtime had become too strict outside protected mechanics. The extractor was being used as a permission system for ordinary NPC/world causality, generated proof strings had become exact bureaucratic gates, and final narration was hidden until a slow second LLM extraction finished.

4.0.5 deliberately removes rules rather than adding another subsystem.

Hard / deterministic remains:
- Combat actor identity, target handles, HP, Range, Initiative, Skills, resources, damage, death and Combat XP.
- Character progression and coin/equipment mechanics.
- Guild listing identity/rank, fixed payout, Quest XP, completed-contract credit and Guild promotion.
- Explicit Quest accept/abandon/turn-in.
- Search and Stealth checks already owned by the engine.

Soft / narrator-world state:
- NPC help/refusal/departure/companionship and ordinary causal reactions.
- NPC -> PC item hand-overs and ordinary gifts.
- Quest contacts, witnesses, routes, discovered requirements and plausible verification.
- How the desired Quest outcome is achieved.
- Ordinary non-combat physical/social uncertainty.

Quest design:
- Objectives and generated proof remain continuity memory for the narrator, not exact-token gates.
- New quest.ready is a semantic persistence flag: the extractor sets it only when the reply clearly establishes the desired Quest outcome as substantively achieved.
- quest.ready does NOT complete/pay a Guild contract. The player still explicitly turns it in; only then does the engine award payout, Quest XP, completed-contract count and promotion credit.
- Legacy exact proof can still substantiate older contracts, but story-ready contracts no longer require/consume an exact generated token or mark.

Runtime/UI:
- Narrator prose is visible immediately again. Extraction continues as persistence/bookkeeping; the next-turn barrier still waits for it.
- There is no generic d100 roll on every ordinary V4 story turn. Search, Stealth and Combat keep their actual engine mechanics.
- NPC cards surface established NPC-to-NPC ties from persistent facts, in addition to stance toward Alaric and knowledge.

This patch intentionally does not add container/carry-capacity mechanics and does not loosen Combat.


## 4.0.6 — boundary cleanup: hard mechanics, soft world

A branch-wide review after 4.0.5 found several older safeguards that still treated continuity like Combat mechanics. 4.0.6 removes those without weakening Combat, progression, money or player agency.

### Extractor/runtime
- A reply now gets exactly one primary extractor call and at most one repair (previous worst case: four calls).
- Missing nullable soft fields are filled locally with null; harmless persistence defaults such as person.new.desc=[], creature.new.desc=[]/count=1 and memory.who=[] no longer force an LLM repair.
- The obsolete generic narrator check delta is removed; Search/Stealth/Combat keep their actual engine mechanics.
- Narration remains visible immediately; the commit barrier still protects the next turn.

### World/agency boundary
- Explicit involuntary relocation is now a normal arrive delta with forced_by. Arrest, abduction, being carried or a collapsing floor may move Alaric without pretending he chose GO. Combat movement remains Combat-owned.
- Coercion no longer validates fiction through NPC-role regexes ("must look like a guard/bandit"). A present external actor + an explicit causal reason is enough to persist the consequence; sale/offer safeguards remain.
- journey.continue is no longer hardwired to an ESCORT objective. JOURNEY READY may derive from any persisted travel/departure context (active Quest or open thread) tied to a present NPC.

### Guild / Quest
- Board verification is optional: proof accepts 0–2 story-guidance examples; [] is valid.
- Empty verification never auto-completes a Quest. New contracts still require quest.ready (desired story outcome achieved) before deterministic turn-in/payout/XP unless an older contract has real legacy proof.
- Guild staff may add ordinary witness/field notes to contract documents. Only marks that themselves claim formal completion/payment/clearance are protected.
- quest.detail may store completion-related story information; it still cannot alter payout, Guild rank or promotion.
- Automatic 20%/day random removal of board listings is disabled (0%). World/board changes can still be established explicitly.

### Narrator/context
- NPC cards are authoritative relevant recall, not exhaustive mind dumps. Listed knowledge cannot be contradicted; missing special/private knowledge still cannot be invented, but ordinary established/public knowledge is not erased merely because retrieval did not print it.
- Harmless micro-gestures are allowed when they change no mechanical/decision-relevant state.
- Generic Gear may receive harmless cosmetic/sensory description, but no invented provenance, hidden property, value, faction/Guild mark or mechanical/social significance.
- The free fantasy creature rule is internally consistent again: in-world species name is free; the separate anchor supplies mechanics.

Deliberately NOT changed in 4.0.6:
- Combat actor identity, HP, Range, Initiative, Skills/resources, damage, death and Combat XP.
- Coin arithmetic, purchases/sales, equipment mechanics, Guild payout/XP/count/promotion.
- Search and Stealth mechanics.
- Numeric attitude/memory storage and time caps; those are candidates for later simplification only if live tests show they hurt play.
- Container/carry-capacity mechanics.


## 4.0.7 — lazy world / on-demand Guild board

The first 4.0.6 live run showed that arrival in a Guild hall still generated unseen Board listings in the background. A schema-invalid Board answer triggered a repair; while it was still running, the player's next single message started the interpreter and hit the provider concurrency limit. 4.0.7 removes that proactive world generation.

Principle: the engine does not create ordinary world content in advance. It materialises it when the player actually perceives/requests it or narration establishes it. Protected mechanics become canonical at that boundary.

- Guild-hall arrival no longer generates a Board. The first explicit board.read generates missing listings, canonical first, immediately before narration.
- Unseen listings do not exist and consume no Board LLM call.
- Board/acceptance instructions present contracts as natural requests; stored objectives and verification are continuity memory, not a mandatory checklist.
- proof is optional. [] is preferred when return, witnesses or a credible report can verify the outcome naturally. When proof entries are used, the Board prompt now states the exact object schema required by validation.
- journey.continue derives readiness only from persisted story details/notes or an open thread, not from generated Quest title/client/goal/objective text.
- Quest friction is explicitly tied to actually pursuing that Quest, not merely having an active Quest during an unrelated scene.
- The next normal turn no longer overtakes a still-running extractor/repair after an arbitrary 90-second race.
- Interpreter failure aborts narration and books no story/world events. Regenerate retries interpretation.

Still hard: Combat, Search/Stealth, coin/trade/equipment, Guild payout/XP/count/promotion, and creature mechanical profiles once a creature is actually revealed.


## 4.0.8 — Novice test profile + readable selection lists

For mechanics testing, Novice Board generation is intentionally less open-ended. This is a generator policy, not a hard quest-mechanics validator.

- Fresh Novice boards are prompted to contain at least two explicit Monster culling/clearance jobs with a direct combat route, at least one escort whose route leaves the settlement, and at least one delivery/courier job whose destination leaves the settlement; the fifth listing also comes from those families.
- Partial Novice refills are told to prefer the same three families and avoid administrative errands, pure paperwork, abstract mysteries and low-interaction local chores.
- Escort/delivery travel may produce danger naturally but does not pre-script a mandatory ambush.
- The policy stays soft-world: the engine validates schema/canon, not semantic quest categories.

Presentation:
- Guild Boards render canonical listings as separate title-first lines in the engine instruction.
- The narrator contract now requires multi-option boards, shops/stores, merchant inventories, menus and service lists to use one option per line, title/item name first, followed by price/reward and a concise description.
- Normal surrounding scene narration remains prose.
