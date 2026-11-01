# .148 — Ordinary skill areas and public danger information

Basis: .147 `a9f00b4`; approved Batch22 design decisions. No skill power, cost, range, prices, XP or monster values changed.

## Changes

- One shared `skillAreaTarget` rule filters precombat recruitment and actual ordinary skill strikes. Opposing combat sides are hit; unselected neutral/allied people are spared. Explicit individual and group attacks remain possible and retain NPC reactions. Physical thrown bursts still use their previous friendly-fire rule.
- Planner `use_skill` accepts an optional `targets` list for intentionally attacked actors in one area action. These must be current actors and the skill must be an area skill; the primary target identifies the band. No automatic hostility, additional action, confirmation or geometry. Untargeted ordinary skills cannot select a companion or manufacture an incidental crowd attack.
- Active combat excludes the freshly added primary target from subsequent area recruitment, preventing duplicate initiative entries. Area targets keep their established side until their actual reaction changes it.
- Guild/System/HUD/context render reported population levels, total contract kills and encounter-size uncertainty. Visible threat count excludes concealed, full-cover, dead/escaped/surrendered actors. No secret levels/HP or guaranteed survival/escape. Existing contract meaning and population strength are unchanged.

## Evidence

`design148_combat.test.js` includes the original Batch22 Mage state/command and Warrior six-boar state in `batch22_design148.json.gz` (source ZIP SHA256 ce1bb79b3a6d7ea312c8f2406feb66daebb9c35b8d752e3b7ac2f48c2b513406). Wave hits all three SHORT beetles, never materialises Brenna, spends the same 14MP and preserves replay/reload. Explicit NPC attacks, NPC parity, complete groups, band/cover, illegal actions and thrown burst positive controls are included. Existing friendly-fire regressions now either expect spared bystanders or explicitly attack their subject to retain the damage/reaction check; historical original JSON is unchanged.

Final new regression set: **11/11**; against unchanged .147: **6 red / 5 green controls**. Adjacent Combat-QoL tests: **154/154** before the final additional untargeted-area control. Shared final acceptance after both approved packages: **2679/2679 Node, 2235 replay cases / 478 exact accepted / 0 open or stale, real ST Standard36/36 and Failsoft41/41**. Full scope, original-state evidence and limitations in [the .149 note](DESIGN149_SKILL_GROWTH.md#final-common-acceptance-of-148--149).

Replay against actual .147: 40 changed records: 38 public board-text records and two ordinary-area cases (b17-rogue#15 washerwoman; b19-rogue#59 weir worker). Each new fingerprint has its own record reason, previous-output hash and previous accepted entry where present. All coin/transaction/item/quest-completion/XP events in these records match .147. Removed unselected NPC materialisation/initiative/reactions intentionally alter combat snapshots and RNG consumption. Old acceptance lists are unchanged. New list: `accepted_design148_vs_126.json`.

## Limits

Reports remain reports; a quest total does not determine a visible group's size. Ordinary AoE never establishes an ally relationship by narrative companionship. Intentional attacks depend on the existing Planner/Agency contract; no universal prose interpreter was added. Thrown explosive items, traps and environment have not been redesigned. No natural batch was started.
