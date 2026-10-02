# Claude handoff — Narrator GM tools experiment

Date: 02.10.2026  
Repository: `Mango1331/Claude-AI-RPG-Game`  
Work branch: `chatgpt/narrator-gm-tools-2026-10-02`  
Base branch: `claude/gen35-world-envelope-2026-10-01`  
Base commit: `90bd4501be4c007fd3b80e8ee1c42257a4853df2`  
Experimental build: `4.3.0-alpha.1`

Read **`docs/ARCHITECTURE_GM_TOOLS.md` first**. It is the architectural source of truth for this experiment.

## 1. Why you are receiving this branch

The 4.2.1 live test showed that Avereth's deterministic mechanics are useful, but the semantic front end has become too complicated.

Examples from the real run:

- `I Fire Lance Barkscorpion B` was mechanically resolved as Basic Attack although the Narrator understood Flame Lance.
- `I ignore him and look for the other 2` became GO instead of SEARCH.
- creative actions such as using Flame Lance on a cracked floor do not fit the predeclared action ontology without more command types.
- the post-hoc Extractor duplicated an off-scene NPC and a dead creature because it had to reconstruct identity from prose with an incomplete catalog.

The experiment moves **semantic interpretation to the Narrator/AI GM** while keeping hard mechanics/state deterministic.

## 2. Architectural rule you must preserve

Do not revert the branch to "make the parser smarter".

The intended boundary is:

```text
Narrator / AI GM
    owns meaning, references, ordinary world causality and creative adjudication
        |
        v
Avereth function tools
    expose hard capabilities and canonical lookups
        |
        v
existing deterministic domains
    own resources, combat math, economy, progression, Guild/Quest hard state
        |
        v
Event Store / fold(events) / HUD
```

A semantic failure should normally be fixed by:

- better tool description/context;
- better canonical lookup;
- a clearer capability boundary;
- asking for clarification when genuinely ambiguous;

not by adding another regex for one English phrase.

## 3. Files introduced by this experiment

### `src/gm/runtime.js`

Pure GM-tool transaction/runtime.

Implemented:

- `createGmSession`
- `resolveCombat`
- `resolveStory`
- `useAbilityOnWorld`
- `commitWorld`
- `lookup`
- `finalizeGmSession`

Important design choice:

The module **reuses existing deterministic implementations**. It does not duplicate combat, V4 commands or world application.

### `src/gm/tools.js`

SillyTavern function-tool schemas/descriptions.

Currently exposes:

- `avereth_lookup`
- `avereth_resolve_combat`
- `avereth_resolve_story`
- `avereth_use_ability_on_world`
- `avereth_commit_world`

The raw story-command bridge is transitional.

### `src/gm/host.js`

Host integration independent of SillyTavern globals.

Responsibilities:

- produce Narrator context without pre-resolving player semantics;
- preserve staged state across tool-call recursive generations;
- commit the staged events only to the final assistant swipe;
- render HUD from that resulting state.

### `index.js`

SillyTavern wiring.

Added:

- setting `gmTools`, default false;
- registration through `registerFunctionTool()`;
- `shouldRegister` gating;
- fallback to legacy V4 when tool calling is unavailable;
- generation-local `gmSession`;
- stale prior-tool-result filtering for Regenerate/Swipe prompt copies;
- no Extractor launch for replies completed through the GM-tool path.

### `tests/v4/gm_tools.test.js`

Regression intent for:

- Fire Lance -> canonical Flame Lance;
- creative ability -> scenery with real MP cost;
- persistent cave opening;
- search-vs-go semantic choice;
- exactly one turn on no-tool narration.

### Documentation

- `docs/ARCHITECTURE_GM_TOOLS.md`
- this handoff file.

## 4. Existing files intentionally retained

Do not delete these just because the new architecture may later replace their normal-turn role:

- `src/intent.js`
- `src/ir.js`
- `src/v4/interpret.js`
- `src/v4/extract.js`
- `src/v4/world.js`
- `src/v4/ownership.js`
- `src/v4/envelope.js`
- existing V4 command handlers

They are currently:

- fallback;
- regression oracle;
- compatibility path;
- deterministic backend during migration.

Removal comes only after measured live parity.

## 5. P0 tasks for you

### P0.1 Run and fix the complete suite

From `avereth-engine/`:

```bash
npm test
```

Do not only run the new test file.

Then run the project's browser/SillyTavern smoke commands that are available in `package.json`.

This handoff environment could create and review GitHub files but did not have a local repository checkout capable of executing the Node suite. Treat the new code as **reviewed scaffold, not verified green code** until you run it.

Fix compile/schema/test problems before architectural expansion.

### P0.2 Verify real SillyTavern tool recursion

Use current SillyTavern function calling with the actual test model/provider.

Confirm:

1. generate interceptor runs before tool registration is materialized into the outgoing request;
2. `shouldRegister` sees the active GM session;
3. a tool call stages events but does not commit them;
4. the recursive follow-up generation sees the staged state;
5. intermediate tool-system messages do not trigger an early Avereth final commit;
6. the final assistant prose receives the full staged event record;
7. HUD is rendered from that exact final state.

Relevant upstream documentation:

- https://github.com/SillyTavern/SillyTavern-Docs/blob/main/For_Contributors/Function-Calling.md

Relevant upstream code:

- SillyTavern `public/scripts/tool-calling.js`
- SillyTavern `public/scripts/st-context.js`
- SillyTavern `public/scripts/extensions.js`

### P0.3 Verify Regenerate and Swipe

SillyTavern stores tool invocations as system messages.

The scaffold records pre-existing tool invocation IDs when a fresh GM branch begins and removes those messages only from the prompt copy.

Test:

- normal response with 1 tool call;
- response with 2-4 sequential tool calls;
- Regenerate final response;
- generate a new Swipe;
- select an old Swipe;
- edit latest assistant prose;
- delete latest response and retry;
- save/reload chat after a completed GM turn.

Required invariant:

> A new swipe must begin from the same pre-player-turn state and may make a different semantic/tool decision without inheriting the previous swipe's result.

Do not paper over this with hidden duplicate events.

## 6. P1 design tasks

### P1.1 Replace raw `avereth_resolve_story` command objects with ergonomic domain capabilities

The current bridge proves the architecture but leaks implementation detail.

Good candidate tools/capabilities:

- movement / purposeful activity / search;
- inventory transfer/use;
- trade/offer;
- Guild/Quest operation;
- Board read/generation.

Keep the total tool surface small.

Do not expose one tool per English verb.

### P1.2 Board/Guild/Quest

`board.read` is deliberately not migrated through the GM tool bridge yet.

Design a proper capability that:

- uses existing deterministic Guild board state/generation;
- lets the Narrator show exactly canonical listings;
- does not require a second semantic interpreter;
- preserves official Guild authority.

Likewise make Quest accept/turn-in and registration ergonomic without making the GM construct internal command objects.

### P1.3 Creative abilities during combat

`avereth_use_ability_on_world` currently refuses an active encounter.

Design this carefully.

Questions to answer:

- Does environmental use consume the PC's combat action?
- Can a spell affect both environment and creatures?
- Who computes secondary damage?
- What is GM adjudication vs engine math?
- How are cover/range/area rules reused?
- How do we avoid an environmental tool becoming a way to bypass normal combat cost/turn rules?

Do not simply allow the current outside-combat function inside combat.

### P1.4 Checks

Decide the clean GM-facing interface for uncertain consequential non-combat actions.

Current V4 already has deterministic search/check behavior.

The end-state should let the GM say in effect:

> this action needs a PER check against this established difficulty/reason

without either:

- forcing every action into `activity.search`;
- or letting the Narrator invent the roll/result.

A small `resolve_check` capability may be appropriate.

## 7. P1 persistence tasks

### Direct commit vs Extractor

The experiment assumes that the acting GM should commit durable facts it already knows it established.

Measure this.

Do not immediately remove the Extractor.

Possible migration:

1. tool commits are primary;
2. Extractor becomes audit/recovery;
3. only call audit if narration appears to contain a durable uncommitted change;
4. retire normal extraction only after live tests show low drift.

Pay special attention to:

- actor identity;
- NPC names;
- entering/leaving;
- deaths;
- environmental changes;
- quest progress;
- knowledge/attitude;
- hostile commitments.

## 8. P1 Narrator instruction design

Current branch leaves narrator contract revision at **4.2.0** and injects GM-mode instructions at runtime.

Decide whether to:

- keep GM-tool behavior runtime-specific; or
- make a 4.3 narrator contract revision.

Do not duplicate the same long instructions in:

- card contract;
- engine block;
- every tool description.

Keep standing prompt small. Put situational procedure into the tool and returned result where possible.

## 9. P2 cleanup after evidence

Only after successful paired live tests:

- demote/remove semantic routing authority from `intent.js`;
- remove normal Interpreter LLM call;
- simplify/remove IR if it no longer provides value;
- reduce Extractor use;
- reduce prompt-visible World Envelope where capability validation makes it redundant;
- delete compatibility code only when old chats no longer need it.

Do not optimize deletion before the new path is proven.

## 10. Specific live scenarios to run

Use natural language, not test-language crafted for schemas.

### Combat aliases / references

```text
I Fire Lance Barkscorpion B.
I hit the wounded one with Flame Lance.
I blast the one on the left.
I attack it.
```

Include both clear and genuinely ambiguous scenes.

### Search vs travel

```text
I ignore him and look for the other two.
I follow the drag marks.
I go back to the burrow we already found.
```

### Creative ability

```text
I use Flame Lance on the cracked floor to open the cave.
I try to burn through the wet rope with Flame Lance.
I Arcane Burst the loose rubble away from the doorway.
```

Test sensible success, sensible failure/limited effect and impossible/out-of-scope use.

### Ordinary social play

Run several turns with:

- only conversation;
- NPC initiative;
- no tool call at all.

The architecture fails if every ordinary sentence causes three tools.

### State authority

Try to elicit:

- free MP;
- invented XP;
- arbitrary item gain;
- Guild payout without turn-in;
- rank promotion without its engine rule.

These must remain impossible.

## 11. Performance measurements

Compare the GM-tool branch with 4.2.1.

Track per player turn:

- number of model calls;
- number of tool calls;
- prompt tokens;
- completion tokens;
- latency;
- whether Extractor was called;
- corrections/rejections;
- semantic misclassification;
- persistent-state error.

The architectural goal is not merely "works". It should be **simpler and cheaper in cognitive/system complexity** than:

```text
parser + interpreter + guard + engine + narrator + extractor + firewall
```

## 12. Things not to do

- Do not merge this experiment into `claude/gen35-world-envelope-2026-10-01` yet.
- Do not rewrite combat math in the Narrator.
- Do not let the Narrator directly edit HP/MP/XP/Coin/Guild Rank.
- Do not add regex aliases for every phrase the model can already interpret.
- Do not build material physics for every surface.
- Do not replace one giant command ontology with twenty tiny function tools.
- Do not delete old paths before live parity.
- Do not silently change established game rules while doing architectural work.

## 13. Copy/paste prompt for Claude

Use this as the initial Claude Code prompt after checking out the branch:

```text
You are continuing the Avereth RPG Engine architecture experiment on branch
chatgpt/narrator-gm-tools-2026-10-02.

Do NOT start from the old parser-first architecture and do NOT redesign from scratch.

First read, in this order:
1. avereth-engine/docs/ARCHITECTURE_GM_TOOLS.md
2. avereth-engine/docs/CLAUDE_HANDOFF_GM_TOOLS.md
3. avereth-engine/src/gm/runtime.js
4. avereth-engine/src/gm/host.js
5. avereth-engine/src/gm/tools.js
6. the changed portions of avereth-engine/index.js
7. avereth-engine/tests/v4/gm_tools.test.js
8. the existing deterministic backends that these files call:
   src/engine.js, src/combat.js, src/v4/turn.js, src/v4/commands.js,
   src/v4/world.js, src/v4/ownership.js and src/v4/envelope.js.

Architectural goal:
- The Narrator/AI GM owns semantic interpretation of natural-language player intent,
  ordinary NPC/world causality and creative adjudication.
- The Avereth Engine owns hard mechanics, numeric resources and canonical state.
- The Narrator calls a small set of Engine capabilities/tools when hard mechanics/state matter.
- Event sourcing, fold(events), deterministic combat/progression/economy/Guild hard state and HUD remain authoritative.
- Do not solve semantic misses by adding more regex special cases.
- Do not create a command/tool for every possible creative interaction.
- Creative Skill use against terrain/scenery must be possible without an ATTACK_TERRAIN-style ontology.

The current branch is a scaffold, build 4.3.0-alpha.1, based on Gen 3.5 / 4.2.1 commit
90bd4501be4c007fd3b80e8ee1c42257a4853df2.
The legacy V4 path intentionally remains as fallback.

Your first job is NOT feature expansion. First:
A. run the complete npm test suite and fix compile/test failures without violating the architecture;
B. inspect current SillyTavern function-calling behavior and verify registration, recursive tool calls,
   final-message commit, Regenerate and Swipe;
C. verify that staged events are committed exactly once to the correct assistant swipe;
D. run focused live tests for:
   - "I Fire Lance Barkscorpion B" -> actual Flame Lance,
   - "I ignore him and look for the other 2" -> SEARCH, not GO,
   - Flame Lance against a cracked floor -> engine spends MP, GM adjudicates and persists the cave opening.

Then refine the architecture incrementally:
1. replace the raw story-command bridge with a SMALL number of ergonomic domain capabilities;
2. add a proper Board/Guild/Quest capability;
3. design a clean deterministic check capability;
4. design creative environmental ability use during active combat without bypassing combat turn/resource rules;
5. measure whether direct GM world commits can demote the Extractor to audit/recovery;
6. reduce old parser/interpreter/extractor machinery only after paired live tests prove parity.

Keep tool schemas and standing context small. Prefer lookup-on-demand.
Do not duplicate the existing combat/economy/world engine in the GM layer.
Do not merge this branch to the stable Gen 3.5 branch.

When you make changes, document architectural decisions in ARCHITECTURE_GM_TOOLS.md,
add regression tests for each invariant, run the full suite, and finish with:
- exact commits,
- tests/smokes run and results,
- remaining known limitations,
- recommended next live-test script.
```

## 14. Expected outcome of your pass

A good Claude refinement should leave this branch in a state where a human can perform a real SillyTavern live test and answer:

1. Does the Narrator understand natural player intent better than the pre-parser?
2. Does deterministic state remain trustworthy?
3. Can creative actions happen without new parser/command special cases?
4. Are Swipes/Regenerate safe?
5. Can Interpreter/Extractor complexity actually be reduced?
6. Is the system easier to reason about than Gen 3.5?

If the answer to any of those is not yet measurable, improve instrumentation/tests before adding more architecture.
