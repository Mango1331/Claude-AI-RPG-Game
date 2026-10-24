# Planner hotfix: take → attempt (.69, 24 October 2026)

Run 8 ended because `parsePlan` checked `attempt.tool` only against the initial inventory. It now considers earlier commands in `seq` order: TAKE of the exact catalog object can establish planned possession; GIVE/DROP/SELL remove it. A later TAKE or unknown reference does not qualify. No acquisition is invented or committed by validation.

Execution is unchanged: TAKE checks custody, location and closed containers; `attemptEvents` checks actual possession before consuming a tool or rolling. Failed/conditional acquisition cannot make the tool usable. No change to locks, success chances, Player Agency, world extraction, XP or dungeon spawning.

Twelve regressions: on unchanged .68, four fail and eight controls pass; after the fix 12/12. Includes the exact original Run-8 repair commands and player input (in a controlled same-room setup, not a full run replay), sequence order, missing/foreign/elsewhere/enclosed tools, drop-after-take, existing inventory, normal product execution, regenerate/swipe reuse and JSON replay.

Final `npm test`: **1464/1464**, no skips/failures. Real ST 1.19 `smoke:st:c`: **21/21**, exit 0, five planner/narrator/extractor calls each, no PageErrors. Initial smoke attempt was blocked before browser launch by a missing Chromium executable; browser installed and unchanged smoke rerun successfully. Mockprovider smoke, no new natural GLM test. Build .69, narrator contract remains .55. 10B-3A not implemented here.
