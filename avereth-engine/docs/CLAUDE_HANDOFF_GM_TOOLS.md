# Claude handoff — Narrator GM tools experiment

Date: 02.10.2026  
Repository: `Mango1331/Claude-AI-RPG-Game`  
Work branch: `chatgpt/narrator-gm-tools-2026-10-02`  
Base branch: `claude/gen35-world-envelope-2026-10-01`  
Base commit: `90bd4501be4c007fd3b80e8ee1c42257a4853df2`  
Experimental build: `4.3.0-alpha.1`

Read **`docs/ARCHITECTURE_GM_TOOLS.md` first**, but treat it as a **design proposal and rationale for one experiment, not as the architectural source of truth**. The implementation on this branch is a concrete prototype intended to make the idea testable. You are explicitly expected to challenge it.

## 1. Why you are receiving this branch

The 4.2.1 live test showed that Avereth's deterministic mechanics are useful, but the semantic front end has become too complicated.

Examples from the real run:

- `I Fire Lance Barkscorpion B` was mechanically resolved as Basic Attack although the Narrator understood Flame Lance.
- `I ignore him and look for the other 2` became GO instead of SEARCH.
- creative actions such as using Flame Lance on a cracked floor do not fit the predeclared action ontology without more command types.
- the post-hoc Extractor duplicated an off-scene NPC and a dead creature because it had to reconstruct identity from prose with an incomplete catalog.

The experiment moves **semantic interpretation to the Narrator/AI GM** while keeping hard mechanics/state deterministic.

## 2. Your mandate: evaluate before you refine

Do **not** assume the architecture implemented on this branch is the right answer.

This branch represents one concrete hypothesis:

> A capable Narrator/AI GM should own semantic interpretation and creative fictional adjudication, while a deterministic engine should expose hard mechanics/state as tools or capabilities.

Your first responsibility is to decide whether that hypothesis is actually better for Avereth than the current Gen 3.5 / 4.2.1 design, and whether there is a stronger third option.

Before committing to the prototype, perform an independent architectural review:

1. reconstruct how the existing 4.2.1 path actually works and why each layer exists;
2. reconstruct how the experimental GM-tool path works and what complexity it removes, relocates, or introduces;
3. identify failure modes of both approaches;
4. research current relevant approaches outside this repository if web access is available;
5. derive alternative architectures yourself rather than limiting the comparison to "old branch vs this branch";
6. compare the alternatives using explicit criteria and evidence;
7. only then recommend what should be implemented or tested next.

You are allowed — and encouraged — to conclude that:

- Gen 3.5 should remain largely unchanged;
- the GM-tool idea is directionally right but this implementation is wrong;
- a hybrid is better;
- a different agent/tool/state architecture is better;
- some existing parser/interpreter/extractor layers remain valuable;
- function calling introduces more cost or fragility than it removes.

Do not preserve code merely because it is already written on this branch.

### Independent research

If web/research access is available, investigate current work and implementations relevant to this problem. Do not limit research to the examples already mentioned in `ARCHITECTURE_GM_TOOLS.md`.

Look for useful patterns in areas such as:

- AI-native RPG / AI GM systems;
- agent + deterministic simulator architectures;
- tool/function-calling game agents;
- LLM state machines and event-sourced agents;
- semantic parsing vs direct tool use;
- world-state persistence and entity identity;
- constrained planning / action interfaces;
- model-driven simulation and "LLM as controller" designs;
- approaches that minimize duplicated inference between parser, narrator and extractor.

Prefer primary sources, technical documentation, repositories, papers and implementation write-ups over marketing summaries.

For every external idea, distinguish:

- what the source actually demonstrates;
- what is transferable to Avereth;
- what assumptions differ;
- what would need to be experimentally validated here.

If web access is unavailable, state that explicitly and still perform the repository-internal comparison; leave a concrete research checklist rather than pretending the external comparison was completed.

### Required architectural comparison

At minimum compare these three families:

**A. Gen 3.5 / parser-interpreter-first**
```text
player -> parser/IR/interpreter -> deterministic engine -> narrator -> extractor -> state
```

**B. Narrator-as-GM with engine tools** — the prototype on this branch
```text
player -> narrator/GM <-> engine capabilities -> final prose/state
```

**C. At least one independently derived alternative or hybrid**
Examples may include, but are not limited to:

- one structured GM planning call followed by deterministic execution and prose;
- semantic compiler/planner owned by the same main model but separated from narration;
- selective tools only for hard domains while retaining deterministic intent parsing for narrow mechanics;
- direct structured state/action output from the Narrator with deterministic validation;
- post-narration validation/audit without a full Extractor;
- another architecture discovered through research.

Do not force C to resemble the prototype.

### Evaluation criteria

Judge architectures against the actual needs of this project:

- semantic robustness with natural player language;
- creative action freedom;
- deterministic rule integrity;
- canonical entity identity and persistence;
- player agency;
- failure transparency;
- ease of debugging/replay;
- Swipe / Regenerate correctness;
- context/token cost;
- model-call count and latency;
- provider/model portability;
- SillyTavern integration complexity;
- amount of bespoke code and special cases;
- testability;
- long-campaign maintainability;
- ability to add new mechanics without expanding an English-command ontology;
- likelihood of silent semantic errors;
- recovery behavior when the model or a tool call fails.

Do not produce an overall verdict from intuition alone. State what is known, what is inferred, and what still needs measurement.

## 3. Constraints that are probably worth preserving — but may still be challenged with evidence

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

The prototype was built around the following working constraints:

- hard numeric state should not become free-form prose;
- deterministic combat/progression/economy rules should remain reproducible;
- Event Sourcing / replayability is valuable;
- player agency must not be silently overridden;
- creative play should not require pre-enumerating every possible fictional verb/target combination.

These are **project goals, not sacred implementation choices**. If you find a better mechanism for satisfying them, propose it.

The diagram below describes the prototype's current boundary, not a decision already made:

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

A semantic failure in the prototype should not automatically be answered by another regex. But equally, do not assume function tools are automatically superior. Diagnose the failure at the architectural level first.

## 4. Files introduced by this experiment

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

## 5. Existing files intentionally retained

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

## 6. P0 tasks for you

### P0.1 Critical architecture review and independent research

Before treating the new code as the implementation direction, produce a short architecture assessment.

It must:

- explain the actual Gen 3.5 architecture from repository code, not only from its docs;
- explain the actual GM-tools prototype from code;
- identify complexity removed **and** complexity newly introduced;
- independently research relevant alternatives when external research is available;
- compare at least A/B/C from §2;
- list the strongest arguments **against** the GM-tool approach;
- list the strongest arguments **against** keeping Gen 3.5;
- identify which questions can be answered from code/research and which require live experiments;
- recommend a test plan before recommending a rewrite.

Do not modify the architecture substantially until this review exists.

### P0.2 Run and fix the complete suite

From `avereth-engine/`:

```bash
npm test
```

Do not only run the new test file.

Then run the project's browser/SillyTavern smoke commands that are available in `package.json`.

This handoff environment could create and review GitHub files but did not have a local repository checkout capable of executing the Node suite. Treat the new code as **reviewed scaffold, not verified green code** until you run it.

Fix compile/schema/test problems before architectural expansion.

### P0.3 Verify real SillyTavern tool recursion

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

### P0.4 Verify Regenerate and Swipe

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

## 7. P1 design tasks

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

## 8. P1 persistence tasks

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

## 9. P1 Narrator instruction design

Current branch leaves narrator contract revision at **4.2.0** and injects GM-mode instructions at runtime.

Decide whether to:

- keep GM-tool behavior runtime-specific; or
- make a 4.3 narrator contract revision.

Do not duplicate the same long instructions in:

- card contract;
- engine block;
- every tool description.

Keep standing prompt small. Put situational procedure into the tool and returned result where possible.

## 10. P2 cleanup after evidence

Only after successful paired live tests:

- demote/remove semantic routing authority from `intent.js`;
- remove normal Interpreter LLM call;
- simplify/remove IR if it no longer provides value;
- reduce Extractor use;
- reduce prompt-visible World Envelope where capability validation makes it redundant;
- delete compatibility code only when old chats no longer need it.

Do not optimize deletion before the new path is proven.

## 11. Specific live scenarios to run

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

## 12. Performance measurements

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

## 13. Things not to do

- Do not merge this experiment into `claude/gen35-world-envelope-2026-10-01` yet.
- Do not rewrite combat math in the Narrator.
- Do not let the Narrator directly edit HP/MP/XP/Coin/Guild Rank.
- Do not add regex aliases for every phrase the model can already interpret.
- Do not build material physics for every surface.
- Do not replace one giant command ontology with twenty tiny function tools.
- Do not delete old paths before live parity.
- Do not silently change established game rules while doing architectural work.

## 14. Copy/paste prompt for Claude

Use this as the initial Claude Code prompt after checking out the branch:

```text
You are reviewing an Avereth RPG Engine architecture experiment on branch
chatgpt/narrator-gm-tools-2026-10-02.

IMPORTANT: this branch is NOT an approved architecture and NOT a specification you are expected to implement faithfully.
It is a prototype created to make one hypothesis concrete enough to test.

Your task is to act as a critical senior architect/researcher first and an implementer second.

The central hypothesis being tested is:
"A capable Narrator/AI GM may be better at owning semantic interpretation and creative fictional adjudication,
while the deterministic Avereth Engine exposes hard mechanics/state as tools or capabilities."

You must NOT assume that hypothesis is correct.
You are explicitly allowed to reject it, replace it with a hybrid, or propose a materially different architecture.

First inspect the repository yourself. Read at minimum:
1. avereth-engine/docs/CLAUDE_HANDOFF_GM_TOOLS.md
2. avereth-engine/docs/ARCHITECTURE_GM_TOOLS.md
3. avereth-engine/docs/ARCHITECTURE_GEN35.md
4. the Gen 3.5 turn path and its real implementation:
   src/intent.js, src/ir.js, src/v4/interpret.js, src/v4/turn.js,
   src/v4/extract.js, src/v4/world.js, src/v4/ownership.js, src/v4/envelope.js,
   src/engine.js, src/combat.js and the relevant host/index integration
5. the experimental implementation:
   src/gm/runtime.js, src/gm/host.js, src/gm/tools.js,
   changed portions of index.js and tests/v4/gm_tools.test.js
6. relevant live-test docs and recorded failures that motivated the experiment.

Do not rely only on the handoff's interpretation. Verify claims against code and tests.

PHASE 1 — CRITICAL ARCHITECTURE REVIEW

Reconstruct and compare at least these architecture families:

A. Gen 3.5 / parser-interpreter-first:
player -> parser/IR/interpreter -> deterministic engine -> narrator -> extractor -> state

B. Narrator-as-GM + Engine tools:
player -> narrator/GM <-> engine capabilities -> final prose/state

C. At least one independently derived alternative or hybrid.
Do not make C a cosmetic variation of B.

Possible C families could include, but are not limited to:
- one structured GM planning call followed by deterministic execution and prose;
- one main model that emits a structured action/state plan before narrating;
- selective tool use only for hard domains while retaining deterministic parsing for narrow mechanics;
- a constrained planner/controller separate from prose but using the same model;
- direct structured state/action output plus deterministic validation;
- post-narration validation/audit rather than a full Extractor;
- an architecture discovered independently through research.

Research current relevant approaches if web/research access is available.
Do not limit yourself to Craft or the sources already named in our docs.
Look for AI-native RPG systems, agent/simulator designs, function-calling game agents,
LLM state machines, event-sourced agents, semantic parsing vs direct tool use,
world-state persistence/entity identity, constrained planning and model-driven simulation.
Prefer primary technical sources, repositories, papers and implementation write-ups.
Clearly distinguish source evidence from your inference.
If external research is unavailable, say so and provide the exact research questions you would pursue.

Evaluate A/B/C against:
- semantic robustness with natural player language;
- creative action freedom;
- deterministic rule integrity;
- canonical identity and long-term persistence;
- player agency;
- silent-failure risk;
- debuggability/replayability;
- Swipe and Regenerate behavior;
- context/token cost;
- number of model calls and latency;
- provider/model portability;
- SillyTavern integration complexity;
- bespoke code/special-case growth;
- testability;
- long-campaign maintainability;
- extensibility for new mechanics;
- recovery when model/tool calls fail.

Actively search for reasons the GM-tool prototype may be a bad idea.
Actively search for reasons Gen 3.5 may still be the better architecture.
Do not become anchored by the amount of code already written in either path.

Deliver an architecture review BEFORE substantial implementation changes containing:
1. what each current layer is buying us;
2. what is accidental complexity vs necessary complexity;
3. strongest case for Gen 3.5;
4. strongest case for GM tools;
5. best independently derived alternative/hybrid;
6. key unknowns;
7. experiments needed to discriminate between them;
8. your provisional recommendation, with confidence and evidence.

PHASE 2 — VERIFY THE PROTOTYPE AS A TEST IMPLEMENTATION

The current branch is build 4.3.0-alpha.1 based on Gen 3.5 / 4.2.1 commit
90bd4501be4c007fd3b80e8ee1c42257a4853df2.

Run the complete npm test suite and fix only blocking compile/test defects necessary to evaluate the prototype.
Then verify actual SillyTavern function-calling behavior:
- tool registration timing and shouldRegister;
- recursive tool calls;
- staged state across recursion;
- final-message commit exactly once;
- HUD from the committed state;
- Regenerate;
- Swipe;
- stale tool-result isolation;
- save/reload behavior.

Run focused tests for the motivating cases:
- "I Fire Lance Barkscorpion B" should not silently become Basic Attack when Flame Lance is clearly intended;
- "I ignore him and look for the other 2" should be capable of becoming SEARCH rather than being forced into GO;
- Flame Lance against a cracked floor should be expressible without an ATTACK_TERRAIN command,
  while MP/resource rules remain authoritative.

Also test cases that could make the prototype look bad:
- ambiguous references;
- several sequential tool calls;
- ordinary dialogue that should require no tools;
- provider without function calling;
- model chooses wrong tool despite understanding the prose;
- model forgets to commit a durable state change;
- excessive tool/schema context;
- failure midway through a staged transaction.

PHASE 3 — DECIDE, THEN REFINE

Do not automatically continue implementing the current tool design.

After research and tests, choose one of:
- keep Gen 3.5 with targeted simplification;
- continue the GM-tool architecture;
- build a hybrid;
- prototype a different C architecture;
- run additional discriminating experiments before choosing.

If you continue with GM tools, treat src/gm/* as disposable prototype code.
You may redesign its APIs completely if evidence supports that.
Do not preserve avereth_resolve_story or the five current tools merely because they exist.

Project constraints/goals that should remain unless you have a well-supported reason to challenge them:
- hard numeric state must remain trustworthy;
- combat/progression/economy rules must remain reproducible;
- Event Sourcing/replayability is valuable;
- player agency must not be silently overridden;
- creative play should not require a programmer to pre-enumerate every possible fictional interaction.

Do not:
- solve natural-language misses by accumulating phrase-specific regex patches unless the lexical rule is genuinely game-defined;
- move HP/MP/XP/Coin/Guild Rank into unconstrained prose;
- duplicate the combat/economy engine in an LLM layer;
- replace one giant command ontology with dozens of tiny tools;
- delete the old architecture before evidence supports replacement;
- merge this experiment into the stable Gen 3.5 branch.

When finished, document:
- sources researched and what each contributed;
- architecture comparison A/B/C;
- your recommendation and why;
- code changes, if any;
- exact commits;
- tests/smokes/live tests run;
- measurements;
- unresolved risks;
- the next experiment that would most reduce uncertainty.

The goal is NOT to prove this branch right.
The goal is to find the best architecture for Avereth.
```

## 15. Expected outcome of your pass

A good Claude pass does **not** have to leave the current prototype more developed. It should leave us with a better-founded architectural decision and enough evidence to know what to test or build next. At minimum it should let a human answer:

1. Does the Narrator understand natural player intent better than the pre-parser?
2. Does deterministic state remain trustworthy?
3. Can creative actions happen without new parser/command special cases?
4. Are Swipes/Regenerate safe?
5. Can Interpreter/Extractor complexity actually be reduced?
6. Is the system easier to reason about than Gen 3.5?

Add two more explicit questions:

7. Is the GM-tool design actually better than a well-designed structured planning/hybrid approach?
8. Which architecture has the lowest total complexity once model calls, prompts, failure recovery and host integration are counted — not only lines of engine code?

If these are not yet measurable, prefer research, instrumentation and discriminating experiments over adding more architecture.
