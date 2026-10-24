# 10B – Double XP rewards (.67, 24 October 2026)

`content/rules.json:xp.reward_multiplier = 2` is the single balance setting. `src/progression.js:defeatXp` and `questXp` apply it after the existing rounding, so 12 becomes 24 and 23 becomes 46. Combat against creatures/humans, Guild contracts and private quests share these functions. Rank, target-type and strength modifiers still apply normally. PP/LP, money, level thresholds and combat rules are unchanged.

`awardXp` does not multiply again. Existing event logs replay their stored amounts unchanged; already locked encounter DefeatXP remains locked. New calculated rewards use the multiplier in both rulesets. No save migration.

Three new regressions: 3/3 fail on .66, 3/3 pass after the change. They cover rank/type/strength modifiers, post-rounding quest rewards and Run 6's 78→156 XP (Level 2, 56 carryover). Existing test expectations were updated for the new rewards and level carryover; original recorded fixtures were preserved. Final `npm test`: **1429/1429**, no skips or failures. No new ST-smoke or natural live run; survival/balance improvement remains to be observed.
