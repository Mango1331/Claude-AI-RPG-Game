# Independent Claude handoff: Avereth Engine experimental 4.0.9 (2026-09-30)

The user wants Claude to compare this branch independently with their previous harder engine architecture. Claude has not seen any experimental branch changes or these recent live tests. This is an experimental review candidate, not a production recommendation.

Repository: Mango1331/Claude-AI-RPG-Game (private).
Base of experimental work: 1cbfdd415a7f0416ae6cd396271f7f5a4a3bb750.
Experimental branch: chatgpt/v4-livetest-fixes-2026-09-28 (Engine and content 4.0.9).
Claude's existing branch: claude/happy-wright-1a4y19 (preserve for independent comparison).
Detailed branch chronology: docs/CHATGPT_FIX_BRANCH_2026-09-28.md.
New tests: tests/v4/livetest_0930_patch.test.js.

## User goals and observed 4.0.8 test

Avereth is a playable sandbox fantasy RPG, not an NPC/quest form-filling system: no guaranteed success or combat, but progress/resolution of purposeful play. Combat, progression, coin/trade, Guild payout/XP/status/promotion, player actions and relevant revealed creatures stay mechanically authoritative. Ordinary unexplored world/NPC actions stay generative and lazy until actually established.

For the current low-level test phase, the user wants Novice Board slots to favor at least two explicit Monster-culling/clearance jobs, one out-of-settlement escort, one out-of-settlement delivery and a fifth from those families. 4.0.8 generated three combat jobs + escort + delivery successfully. The user explicitly approved the 4.0.8 title-first multi-line Board output. Keep the existing appearance. Do not divert into higher-rank scaling or broad cosmetic styling.

The attached successful SillyTavern chat JSONL is the **primary evidence**. The Engine export and the Completion Logger can include a discarded sibling branch: align records by message content and response before counting them as canonical. The separate 4.0.8 evaluation in the handoff bundle provides full context.

4.0.8 live outcomes: first Board narration wrongly caused two just-displayed Monster quests to be removed; the following attempt to accept one therefore failed. A valid escort was then accepted and a genuine four-Wolf fight successfully resolved with separate handles/HP/Range, initiative, stamina, damage and deferred 40 Combat XP. A later Wolf appeared without mandatory combat. Remaining bugs: duplicated escort NPCs after scene.moved, lost continuation after a wait, a legitimate "walk back the way I came from" rejected as retrospective, witness signature mistaken for Guild turn-in, quest.ready accepted after rejected same-reply arrival, 12 peaceful sheep made into 12 active entities, phantom copper inventory item after an already-credited reward, and unpriced tavern water narrated as paid/consumed before authorization.

Money correction from the user: the canonical account was **correct** (50cp initial -20cp registration +90cp quest reward = 120cp = 1 gold 2 silver). Do NOT reduce the posted payout. The bug was an additional physical copper object, not double ledger money. Unknown-price tavern orders should reveal price and stop pending player acceptance; do not invent automatic consent.

## What changed in experimental 4.0.9

- XP in content/rules.json: normal same-rank base_per_level 10→12; quest_base_per_level 10→15. Four normal L1 Wolves earn 48XP; standard L2 Guild Quest earns 60XP: total 108XP, L2 with 8 carry. This is intentionally experimental balance deviating from original Core#25 constants.
- commands.js and world.js: generic already-credited coin cannot become another inventory object; actual purse total remains canonical.
- commands.js, world.js, deltas.json: new Board listings cannot disappear during the very first reply showing them; later justified world events may remove them. No Board presentation changes.
- state.js, world.js, catalog.js and commands.js: small event-sourced journey.party retains existing escort companions across genuine joint travel stops and exposes readiness from real present companions. person.new reuses a uniquely identified existing name or local/party role instead of recreating the same driver/clerk; review potential ambiguous-role collisions.
- world.js: a Guild escort/delivery quest.ready dependent on a same-reply rejected destination arrival is refused; outcome/proof remains story-semantic, not a required literal checklist.
- commands.json cmd-0.6, interpret.js interp-4.4, agency.js: distinguish WAIT followed by "we continue", active return walking with "came from", and a local witness signing evidence vs a formal Guild turn-in.
- world.js, deltas.json delta-0.11, extract.js extract-4.6: passive large herds become compact background facts; *actionable* larger Wolf groups remain individual instant-reveal combatants.
- context.js: explicit binding PENDING TRADE stop after unknown-price offer disclosure; player must accept the now-known price before payment/consumption.
- firewall.js: correct posted Quest payout can appear in operational notes, fictional increased payout cannot, independent route tolls remain allowed.
- Engine, package and content manifest versions now 4.0.9, Board generator board-4.4 unchanged.

## Validation status and next comparative review

New tests/v4/livetest_0930_patch.test.js targets XP carryover, Board availability, return-walk guard, party across route stops, reused named driver, refused arrival/quest-ready dependency, 12 sheep, 5 actionable wolves, phantom cash, canonical reward-vs-fake reward, pending shop price. Static JS syntax checks ran. Isolated real function checks confirmed 4×12+60→108/L2/8, return-walk agency, and firewall accepting correct 90cp while refusing invented 150cp even alongside original 90cp and allowing an independent 5cp toll.

**NOT RUN YET**: full Node suite, full provider UI smoke, or new real 4.0.9 live play. Claude should run them, reproduce actual bugs from the *successful* 4.0.8 chat, compare the original strict branch against these soft/lazy patches, simplify or replace any risky solution, and report which parts are tested and which remain hypotheses. In particular review heuristic NPC-role merging and escort companion auto-follow boundaries, old fixture assertions after intentional XP changes, valid later Board turnover, and nonhostile vs actionable creature materialization. Do not copy the experimental branch wholesale just because it is newer.
