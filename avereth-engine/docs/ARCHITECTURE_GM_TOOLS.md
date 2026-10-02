# Avereth 4.3 alpha — Narrator as GM, Engine as Tools

Stand: 02.10.2026  
Branch: `chatgpt/narrator-gm-tools-2026-10-02`  
Base: `claude/gen35-world-envelope-2026-10-01` @ `90bd4501be4c007fd3b80e8ee1c42257a4853df2`  
Build on this branch: `4.3.0-alpha.2` (alpha.1 plus the fixes of `docs/ARCHITECTURE_REVIEW_GM_TOOLS.md` §13)

> **Status:** experimental scaffold. The existing 4.2.1 / Gen 3.5 path is preserved and remains the fallback.  
> Enable the new path explicitly with **Experimental Narrator GM tools** in the extension settings.

## 1. Why this branch exists

The first real 4.2.1 / Gen 3.5 live run showed that the engine's deterministic core is useful, but that Avereth has accumulated too much *semantic machinery in front of the Narrator*.

Three live examples exposed the boundary problem:

1. The player wrote `I Fire Lance Barkscorpion B`. The Narrator understood that this meant **Flame Lance**, while the deterministic text parser saw the word `fire`, failed to match the exact skill name and silently resolved **Basic Attack**.
2. The player wrote `I ignore him and look for the other 2`. The interpreter understood the referent but forced the action into the existing command vocabulary as **GO to "the other 2 barkscorpions"**, bypassing the engine-owned SEARCH check.
3. Creative actions such as `I cast Flame Lance into the cracked floor to open the cave` have no natural home in an architecture where every meaningful action must first fit a predefined command/target ontology.

The same run also showed the cost of reconstructing state *after* narration: the Extractor lost access to an off-scene Odlem and a just-killed Barkscorpion and created duplicate actors. That is a different bug, but it points in the same direction: the model that writes the consequence already understands much of what happened, while Avereth asks a second model to infer it again from prose.

The conclusion of this branch is deliberately narrower than "let the LLM own everything":

> **Narrator owns meaning and ordinary fictional adjudication.  
> Engine owns hard rules, numbers, capabilities and canonical state.  
> The Narrator calls the Engine when it crosses a hard boundary.**

## 2. Research basis

This architecture is influenced by current AI-RPG practice, but Avereth does not depend on Craft or any external runtime.

### Craft

Craft's retrospective on Friends & Fables explicitly describes the cost of compensating for weaker models with increasing amounts of code/scaffolding and the resulting "invisible walls", then describes Craft as using smarter models, a different harness and a different way for AI to interact with game state:

- https://www.craftrpgs.com/blog/craft-a-new-approach-to-ai-rpgs

Craft Text demonstrates the opposite extreme: an AI GM interprets free-form fictional actions and abilities instead of routing play through a menu of programmed action combinations:

- https://www.craftrpgs.com/discover/projects/craft-text?chapter=running-it&view=builder-manual
- https://www.craftrpgs.com/discover/projects/craft-text?chapter=the-workspace&view=builder-manual

The useful lesson is **not** to copy Craft Text's lack of math. Avereth intentionally keeps deterministic progression/combat/resources.

The Lancer Craft project is particularly relevant to state ownership: it recommends one authoritative live record for encounter state instead of writing competing truths to multiple places:

- https://www.craftrpgs.com/discover/projects/lancer-craft-version?chapter=running-state-safely&view=builder-manual

StoryRig's AI-GM documentation also recommends keeping standing instructions small and loading specific procedures only when they matter:

- https://www.craftrpgs.com/discover/projects/storyrig-2d6?chapter=gm-context&view=builder-manual

### SillyTavern

SillyTavern now exposes Function Calling to extensions through `registerFunctionTool()`, including `shouldRegister`, recursive tool use and Z.AI/GLM-compatible Chat Completion sources:

- https://github.com/SillyTavern/SillyTavern-Docs/blob/main/For_Contributors/Function-Calling.md
- implementation: `public/scripts/tool-calling.js`, `public/scripts/st-context.js`

This is the enabling host capability. We no longer have to run a separate semantic interpreter LLM before the Narrator merely to obtain structured intent.

## 3. Old and new turn flow

### 4.2.1 / Gen 3.5

```text
PLAYER TEXT
    |
    v
Intent regex / IR
    |
    +-- mechanical fast path ------------------+
    |                                          |
    +-- story path -> Interpreter LLM -> Commands
                                               |
                                               v
                                     deterministic resolution
                                               |
                                               v
                                         ENGINE BLOCK
                                               |
                                               v
                                            Narrator
                                               |
                                               v
                                         Extractor LLM
                                               |
                                               v
                                  Firewall / Ownership / World
                                               |
                                               v
                                           Event Store
```

The engine must understand the player's semantics *before* the strongest semantic model in the loop sees the turn.

### 4.3 alpha target

```text
PLAYER TEXT
    |
    v
NARRATOR / AI GM
    |
    +---- ordinary dialogue, reactions, description ----------------------+
    |                                                                    |
    +---- hard action -> Avereth tool -> deterministic engine result -----+
    |                                                                    |
    +---- creative ability -> validate/spend -> GM adjudicates effect ----+
    |                                                                    |
    +---- durable world consequence -> commit_world -> validation --------+
    |                                                                    |
    v                                                                    |
FINAL PROSE <-------------------------------------------------------------+
    |
    v
assistant swipe owns the staged Event Store changes + HUD
```

The important change is **where semantic authority lives**. Event sourcing and deterministic mechanics do not disappear.

## 4. Decision ownership

### 4.1 Narrator / AI GM owns

- what the player's natural-language action means;
- which established actor/object/place a normal reference points to when context makes it clear;
- aliases, paraphrases and minor wording mistakes (`Fire Lance` -> known `Flame Lance`);
- ordinary NPC decisions and reactions;
- physical/common-sense consequences not defined by a hard mechanic;
- creative use of known abilities against terrain, scenery and objects;
- invention in genuine blank space;
- deciding which hard Engine capability is needed.

### 4.2 Engine owns

The engine remains authoritative for:

- HP / MP / STA;
- legal known Skills and their costs;
- combat Turn order, movement rules, hit/damage and defeat;
- XP, Level and progression;
- Coin;
- Inventory and ownership;
- Guild membership/rank;
- official Guild Quest status, payout and completion credit;
- deterministic searches/checks where the rules say the Engine rolls;
- state schema / IDs / event sourcing;
- HUD;
- capability/firewall checks.

### 4.3 Shared boundary

The Narrator may decide **that** Flame Lance plausibly breaks a weakened floor. It may not decide that Flame Lance cost zero MP.

The Engine may say Flame Lance costs 16 MP and provide its mechanical power profile. It should not need a hardcoded `ATTACK_TERRAIN`, `BREAK_FLOOR`, `BURN_ROPE`, `MELT_ICE` or `OPEN_CAVE` command for every possible fictional application.

This is the core simplification.

## 5. What the scaffold implements now

### 5.1 Feature gate and fallback

`index.js` adds:

```text
Experimental Narrator GM tools
```

Default is **off**.

When off, the existing V4 path is unchanged.

When on:

- only Runtime V4 uses the experimental path;
- Character Creation stays on the existing path;
- `#` engine commands stay on the existing path;
- Continue currently stays on the existing path;
- if SillyTavern/function calling is unavailable, the extension warns once and falls back to normal V4.

### 5.2 Generation-local transaction

A GM turn is staged in memory in `src/gm/runtime.js`.

No new mechanical events are written to the player message before the Narrator has interpreted the message.

Tool calls mutate the staged state only.

When the whole generation has ended (SillyTavern `GENERATION_ENDED`, after every tool recursion), `src/gm/host.js` commits the full staged event list to **the final assistant reply** and renders the HUD from the resulting state. (alpha.1 committed on `MESSAGE_RECEIVED`; SillyTavern emits that for the intermediate tool-call reply too, so the transaction closed before the first tool ran. Fixed in the review of 02.10.2026, `docs/ARCHITECTURE_REVIEW_GM_TOOLS.md` §5.)

Why assistant-owned events?

- A swipe is a different GM interpretation/narrative branch.
- The hard state should branch with it.
- Regenerate should not inherit a previous swipe's semantic decision.
- This mirrors the existing principle that narrated world changes belong to the reply that established them.

### 5.3 Tool-call recursion

SillyTavern saves successful non-stealth tool calls as system messages and performs another model generation.

Therefore the branch:

- preserves the same `gmSession` through recursive tool generations;
- builds subsequent Engine context from the already-staged state;
- does not resolve the primary player action twice;
- remembers the pre-existing tool-invocation lists (the `extra.tool_invocations` arrays themselves, not their ids: a provider may reuse an id) when a fresh Regenerate/Swipe starts and removes those **only from the prompt copy**, so stale previous-branch tool results do not decide the new branch;
- keeps the transaction when SillyTavern deletes the empty intermediate reply before it runs the tools (`MESSAGE_DELETED`); it ends only when its player message is gone.

This code is intentionally explicit because tool-call/regeneration behavior is one of the main areas Claude should harden further.

## 6. Exposed tools

### 6.1 `avereth_lookup`

Read-only canonical state lookup.

Current kinds:

- `scene`
- `skills`
- `entity`
- `quest`
- `object`
- `place`
- `catalog`

Purpose: give the model canonical IDs/mechanics when exactness matters without making it guess from prose.

This should eventually replace much of the reason we needed target/name regex heuristics.

### 6.2 `avereth_resolve_combat`

The Narrator supplies semantic intent:

```json
{
  "action": "attack",
  "skill": "mage.flame_lance",
  "target": "mon.barkscorpion_b"
}
```

The tool constructs an explicit engine intent and delegates to the existing deterministic `playerTurn()` / combat system.

It does **not** implement a second combat engine.

This is the intended answer to the 4.2.1 Fire-Lance failure:

```text
player:  I Fire Lance Barkscorpion B
GM:      understands -> Flame Lance, Barkscorpion B
Engine:  validates known skill + range/resources + resolves combat
GM:      narrates exact Engine result
```

The player's exact string no longer has to pass an attack regex in order for combat to work.

### 6.3 `avereth_resolve_story`

This is a **transitional bridge**, not the desired final public interface.

The Narrator can directly submit existing V4 command objects for hard non-combat domains:

- go
- activity (including search)
- take/drop/give/use
- pay/buy/sell
- offer accept/decline
- quest accept/turn-in/abandon
- Guild registration/promotion
- journey continue
- equip/unequip

These are passed straight to `playerTurnV4()`.

There is no interpreter LLM and no regex semantic gate before them.

Example:

```text
player: I ignore him and look for the other two
GM semantic choice:
    activity { kind: search, what: "the other two barkscorpions" }
Engine:
    rolls the existing engine-owned Search check
```

This specifically prevents the old architecture from forcing the sentence into GO merely because the command interpreter chose the wrong ontology.

**Long-term:** replace this raw command bridge with a small number of ergonomic domain capabilities. Do not make the Narrator memorize the whole old command schema.

### 6.4 `avereth_use_ability_on_world`

This is the first genuinely new capability.

Example:

```json
{
  "skill": "mage.flame_lance",
  "target_description": "the cracked stone floor above the hollow",
  "target_ref": null,
  "goal": "blast open a passage into the cave"
}
```

The Engine currently:

1. verifies Alaric actually knows the canonical Skill;
2. verifies sufficient resource;
3. books the resource cost;
4. exposes the Skill's range/type/effects and a mechanical raw-power comparison value;
5. records an authoritative `gm_ability` outcome.

It intentionally does **not** contain a universal material physics simulation.

The Narrator then decides the fictional result from established context:

- thin cracked floor over a hollow may collapse;
- thick intact fortress granite may scorch/crack but hold;
- dry rope may burn;
- an effect inconsistent with the ability should not be invented.

If the result persists, the Narrator calls `avereth_commit_world`.

Current scaffold restriction: this tool refuses creative environmental ability use during an ACTIVE combat encounter. Combat action economy + environmental AoE/secondary consequences need an explicit design instead of being guessed.

### 6.5 `avereth_commit_world`

Persists durable soft-world consequences through the **existing** `applyWorld()` path, therefore retaining Firewall, Decision Ownership and event sourcing.

Currently exposed world changes:

- fact
- thread
- attitude
- memory
- person_new / person_named
- creature_new
- enter / leave
- position / aware
- hostile / intent
- quest_detail / quest_progress / quest_ready
- time

It deliberately does **not** expose a generic:

```text
set pc.hp
set pc.coin
set pc.xp
set guild.rank
```

Hard state remains behind the relevant Engine capability.

Example after the Flame-Lance call:

```json
{
  "changes": [{
    "type": "fact",
    "s": "loc.some_cave",
    "p": "stone_floor",
    "o": "blasted open into a person-sized passage to the cave below"
  }]
}
```

## 7. What is deliberately preserved

This branch is not a rewrite of Avereth.

Keep:

- Event Sourcing and `fold(events)`;
- the current State object;
- content packs;
- deterministic RNG;
- combat math;
- derived stats;
- XP / Level;
- HP / MP / STA;
- inventory/economy;
- Guild/Quest hard state;
- HUD;
- world validation/firewall;
- Decision Ownership where it protects actual hard state;
- existing V4 implementations as deterministic backends during migration.

The expensive work already done in those systems is useful.

## 8. What should become implementation detail or legacy

The following pieces should no longer define what the player *meant* once GM tools reach parity:

- `src/intent.js` as semantic authority;
- regex attack/target classification as the mandatory entry point;
- `src/ir.js` as a required semantic compiler;
- the separate Interpreter LLM call for every story turn;
- the Extractor LLM as the normal way to rediscover changes the acting GM already knows;
- ever-growing command types for creative fictional combinations.

They do **not** have to be deleted immediately.

During migration they are valuable:

- fallback;
- regression oracle;
- deterministic backend;
- compatibility with old chats/providers without tool calling.

Remove or demote them only after the new path has live-test parity.

## 9. Extractor strategy

Do not delete the Extractor merely because tools exist.

Migration should be staged:

### Phase A — current branch

Tool-based hard actions + explicit durable world commits. Legacy Extractor remains available in old V4 fallback mode.

### Phase B

Measure whether the GM reliably commits state that matters:

- new actors;
- deaths/hostility;
- arrivals/leaving;
- durable environment changes;
- quest progress;
- meaningful knowledge/relationships.

### Phase C

Use a lightweight audit/recovery pass only when a reply appears to contain an uncommitted durable change, rather than extracting every reply unconditionally.

### Phase D

Retire normal Extractor calls if live tests show tools plus audit cover persistence without drift.

The principle is to remove redundant inference, not to remove safety before its replacement works.

## 10. World Envelope strategy

The current World/Reaction Envelope remains active in the scaffold.

Do not expand it.

With tool-mediated NPC attacks and state commits, much of its current prompt-visible policy may eventually become capability validation instead of standing text.

Possible destination:

- ordinary default causal behavior lives in the Narrator contract;
- unusual actor-specific limits are shown on demand;
- a requested hard hostile action is validated when committed.

But this should be measured in live play before deleting the existing envelope.

## 11. Tool design rule: capabilities, not exhaustive verbs

Avereth should expose stable capabilities that protect invariants.

Bad direction:

```text
ATTACK_CREATURE
ATTACK_DOOR
ATTACK_FLOOR
ATTACK_CEILING
BREAK_WALL
BURN_ROPE
MELT_ICE
OPEN_CAVE
...
```

Preferred direction:

```text
use known ability -> engine validates resources/mechanical profile
GM adjudicates target-specific fiction
commit durable consequence -> engine validates state ownership
```

Likewise, do not create a new regex whenever the model understands a paraphrase that the parser misses.

## 12. Context discipline

A tool architecture can still overengineer itself by giving the GM too many tools and too much state every turn.

Keep:

- a short standing contract;
- concise active scene;
- exact hard state needed now;
- canonical lookup tools;
- demand-loaded mechanics.

Avoid:

- dumping every rule chapter;
- exposing dozens of near-duplicate tools;
- telling a peaceful clerk every turn that they could theoretically initiate violence;
- duplicating the same state in prose, catalog, tool schema and another ledger.

The Engine should be easy for the GM to *ask*, not impossible for it to ignore.

## 13. Known limitations of 4.3.0-alpha (alpha.1; items 11–13 found in the review)

These are intentional handoff items, not hidden claims of completeness.

1. **No dedicated Board tool yet.** `board.read` remains on the legacy path. The old board generator should not simply be buried inside `avereth_resolve_story`; design a clean capability.
2. **Creative environmental ability use is refused during active combat.** Turn economy, AoE and collateral effects need a deliberate rule.
3. **Environmental resistance/material hardness is not a deterministic subsystem.** The current tool returns power information and leaves physical adjudication to the GM.
4. **The story bridge exposes old command objects.** This is useful for proving the architecture but too implementation-shaped for a mature public tool API.
5. **Trade/Quest/Guild tools are not yet individually ergonomic.**
6. **GM world commits still reuse the old world-delta schema internally.** That is acceptable as a backend but should not force future Narrator-facing schema design.
7. **SillyTavern tool messages remain in saved chat history.** This branch filters stale prior-branch tool results out of Regenerate/Swipe prompt copies, but full host testing is required.
8. **Tool transaction is memory-resident until final prose.** A browser reload/crash in the middle of a tool recursion loses the staged transaction; no half-state is persisted, but the generation must be retried.
9. **Continue uses legacy V4.**
10. **The old Narrator Contract is still revision 4.2.0.** GM-mode instructions are injected in the Engine block. Before production, decide whether tool behavior belongs in a new contract revision or remains runtime-specific.
11. **A swipe whose reply calls tools does not stay one swipe.** SillyTavern 1.19 does not delete the swiped reply when it carries tool calls (`type !== 'swipe'` in `public/script.js`): the swiped message keeps an empty new swipe, the tool messages and the final reply are appended after it. The state stays right (the empty swipe's inherited record no longer matches its text and is skipped), but the old swipe of that message can only be selected again after deleting what follows. Verified with `tools/st_live/run_gm.mjs`.
12. **`avereth_commit_world` covers 18 of the 30 world-delta types.** Not reachable in GM mode: `learn`, `object.new`, `object.move`, `object.mark`, `offer`, `coin.gift`, `coerce`, `quest.offer`, `quest.close`, `listing.gone`, `recover`, `overreach` (an NPC's price offer, a gift, a robbery, knowledge). `arrive` was added in the review (without it no journey ended).
13. **A pending NPC commitment (`pending_combat`) is not opened by `resolve_story` or `use_ability_on_world`.** Rare in V4 (a hostile commitment opens the fight in the reply that reports it), but a bypass.
14. **No automatic alias database is added.** This is deliberate. The Narrator may map `Fire Lance` to the only established `Flame Lance`; if genuinely uncertain it should use lookup/ask, not manufacture a parser heuristic.

## 14. Tests added

`tests/v4/gm_tools.test.js` contains regression intent for:

- narrator-selected `mage.flame_lance` resolving the player's `Fire Lance` wording as the actual Flame Lance combat skill;
- creative Flame Lance use on scenery spending 16 MP without an `ATTACK_TERRAIN` command;
- persistence of the resulting cave opening through the existing world/firewall path;
- `look for the other two` being supplied as SEARCH and receiving the engine-owned search roll instead of GO;
- a no-tool conversational turn still advancing exactly once at finalization;
- (review 02.10.2026) a malformed story command refused with its schema errors; the agency guard on `resolve_story`; `arrive` ending a journey the engine authorized; the tool definitions loading.

`tools/st_live/run_gm.mjs` checks the host side in a real SillyTavern (tool recursion, final commit, Swipe, tool-calling swipe, Regenerate, delete + retry, reload; with and without streaming, with reused tool-call ids). `tools/p0/s4_gm_tools.mjs` measures the semantic decision of the Narrator with these tools against the S1 corpus and the interpreter (the experiment of the review, `docs/ARCHITECTURE_REVIEW_GM_TOOLS.md` §11.1).

The entire existing test suite must stay green before this experiment can replace any old path.

## 15. Required live-test cases

Do not judge this architecture from unit tests alone.

At minimum test:

### Semantics

- `Fire Lance B` when only Flame Lance is known.
- `hit the wounded one` with two similar enemies.
- ambiguous reference where the GM must *not* choose.
- spoken threat vs actual attack.
- past-tense report vs present commitment.

### Creative abilities

- Flame Lance -> cracked cave floor.
- fire spell -> wet timber.
- Arcane Burst near fragile scenery.
- Blink to a visible ledge.
- defensive spell used creatively outside combat.
- attempt beyond the established ability's nature.

### Search/travel

- `look for the other two` -> Search.
- `follow the visible drag marks` -> movement toward an established lead.
- `go to the den` when den location is already known.

### State

- new NPC appears, leaves, returns without duplication.
- dead creature remains the same dead creature in later narration.
- tool-created world fact survives several turns.
- Swipe creates a different consequence without leaking old tool results.
- Regenerate reruns the hard action and deterministic dice from the same pre-turn state.

### Authority attacks

Try to get the Narrator to:

- give itself free MP;
- invent XP;
- alter Guild Rank;
- award Guild payout without turn-in;
- take protected inventory without an allowed cause.

The tool layer/firewall must refuse those.

## 16. Migration plan

### Stage 1 — scaffold (this branch)

- opt-in GM tools;
- preserve old V4 fallback;
- direct deterministic combat bridge;
- direct deterministic story-command bridge;
- creative world-ability proof;
- explicit world commit;
- assistant-swipe transaction;
- regression tests and docs.

### Stage 2 — Claude refinement

- make the transaction/recursion/regenerate behavior production-safe;
- run all tests and SillyTavern live smoke;
- add dedicated ergonomic Guild/Quest/Trade/Board capabilities;
- decide how checks are requested by the GM without leaking random dice unnecessarily;
- design active-combat environmental actions;
- minimize schemas/descriptions based on actual GLM behavior.

### Stage 3 — measured replacement

Run paired live sessions:

- 4.2.1 old path;
- 4.3 GM-tools path.

Measure:

- semantic errors;
- state drift;
- duplicate entities;
- agency violations;
- tool calls/turn;
- prompt tokens;
- total calls/turn;
- latency;
- Narrator prose quality;
- number of corrective special cases added.

Only then demote Interpreter/Intent IR/Extractor.

### Stage 4 — cleanup

If the tool architecture wins:

- remove semantic parser authority;
- remove Interpreter LLM from normal turns;
- reduce or retire Extractor;
- simplify Envelope/context;
- keep compatibility/migration code only where old chats need it.

## 17. Architectural guardrails for further work

1. **Do not fix a semantic miss by adding a regex unless a deterministic lexical rule is genuinely part of the game.**
2. **Do not add a new command type merely because a new fictional target exists.**
3. **Do not let prose become the authoritative numeric state.**
4. **Do not let the Narrator directly mutate protected hard fields.**
5. **Do not build a second combat/economy/quest engine inside GM tools. Reuse the existing deterministic domains.**
6. **Prefer a few capabilities with clear invariants over a broad action ontology.**
7. **When the Narrator already knows what it changed, prefer an explicit commit over asking a second LLM to rediscover it.**
8. **Keep every migration reversible until live evidence shows the new path is better.**

## 18. Success criterion

The new architecture is successful if the player can write ordinary RPG intentions without learning Avereth's command ontology:

```text
I Fire Lance the injured one.
I look for the other two.
I blast the cracked floor open with Flame Lance.
I wedge the staff through the door handles.
I ask whether the ferryman will take half now and half on arrival.
```

and the system behaves like a competent tabletop GM:

- understands the fiction;
- asks/looks up only when genuinely uncertain;
- invokes hard rules when they matter;
- never silently changes the math;
- remembers durable consequences;
- does not require a programmer to pre-enumerate every creative interaction.
