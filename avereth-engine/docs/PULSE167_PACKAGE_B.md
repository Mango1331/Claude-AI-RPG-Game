# .167 — PULSE Paket B: Dungeon-Rahmen mit wandernden Minions

**Basis:** `.166` / `8ded6bfc4c47c4c465d0b0645f158bdf115f20a1` (Paket C mit den Korrekturen .165/.166, nach GPT-Kontrollreview .166 freigegeben). Umsetzung des separat freigegebenen Pakets B aus [`patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md) (§5, §6 B, §12.5, §14.2, §16). Patchnoten [A .162](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0b45c28fb064bde3ad7dd41401b932e7901f2142/avereth-engine/docs/PULSE162_PACKAGE_A.md), [C .164](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a6aa3beb3b3349909fc4584636e904908924c3f2/avereth-engine/docs/PULSE164_PACKAGE_C.md), [.165](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6df4291648be819b1f72ddfbd9f1fad21bd2f29c/avereth-engine/docs/PULSE165_REST_TIME.md), [.166](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8ded6bfc4c47c4c465d0b0645f158bdf115f20a1/avereth-engine/docs/PULSE166_REST_TIME_ATTRIBUTION.md) bleiben maßgeblich.

**Nicht enthalten:** zusätzliche Gegner außerhalb der Slots, wandernde Wächter/Bosse, neue Ebenen-/Reset-/Beutemechanik, Balance, ein zweiter Ereigniswurf, Paket D, NPC-Memory, UI.

## 1. Was Paket B tut

| Baustein | Umsetzung |
|---|---|
| **B1 – PULSE im Dungeon** | `pulse.js` `pulseBegin`: Im Inneren eines echten **Living Dungeons** fällt der bisherige A-Ausschluss weg (`ctx.pulse.dungeon`); Rahmen `dungeon` in `sceneFrame`. Erkunden, Untersuchen, Suchen, Gespräche, Warten und Rast würfeln über denselben einen Wurf (Seed + Zug, V3-Serie, gleiche Ausschlüsse). **DUNGEON AHEAD bleibt Autorität:** Ein GO, das `aheadEvents` auslöst, schließt den Wurf aus (`dungeon_ahead`); ein Weg hinaus aus dem Dungeon bleibt ohne Fenster (`dungeon_leg`); Kampf, `pending_combat`, anwesende Bedrohung (`held`) unverändert. `governs` bleibt `false`: Für Dungeon-Gegner gilt weiter allein die Dungeon-Firewall (`dungeon_foe`, Slots). Ein Dungeon ohne Living-Datensatz behält den A-Ausschluss. |
| **B2 – Rahmen und Arten** | `rules.json` `pulse.base.dungeon` 15/15/15, `pulse.kinds.dungeon` meeting 10, trace 35, strange 25, danger 30 (vorläufig, Plan §5.2/§5.5). `danger` nur mit freiem Minionslot, `meeting` nur mit einer Kompanie auf seiner Ebene; fehlt der Hintergrund, fällt der Anteil weg (der Wurf verteilt ihn anteilig auf die übrigen Arten). Keine Tageszeit, keine Halbierung nach Populationsbeleg (der Slot ist der Beleg). |
| **B3 – `wanderSlot()`** | `living.js`: erster Slot seiner Ebene und seines Zyklus mit Rolle `minion`, nicht getroffen, nicht aufgelöst, nicht von einer Kompanie genommen, ohne eigene Kreaturen. Nie Wächter oder Boss, nie eine fremde Ebene oder ein fremder Zyklus. Die Kreatur bekommt wie jede Slotbegegnung Stufen, Typ und Name ihres Slots (`slotEntityEvents`). |
| **B4 – `dungeon.ahead` und Slotlebenszyklus** | Ein offenes Dungeon-`danger` bindet den Slot **zusammen mit dem Wurf** über das bestehende `dungeon.ahead` mit `wander: true` (bei einer Rast im Handler vor Zeit und Erholung). Getroffen wird er ausschließlich über den bestehenden `dungeon.slot`-Pfad, wenn `slotForNew` eine gültige Kreatur der Antwort zuordnet. Eine nicht erzählte oder abgelehnte Begegnung verbraucht nichts. Gibt es in diesem Zug schon eine Referenz (`x.ahead.turn === s.turn`), entfällt `danger`: höchstens eine Begegnungsreferenz je Zug. Reset (`dungeon.reset`) hebt die Bindung wie bisher auf. |
| **B5 – Pacing, Clear, Quests** | `run.parts`/`run.pace`, `nextWaiting`, `nextSlot`, `aheadEvents`, `clearEvents`, `defeatTally` unverändert. Die Wanderung zählt keinen Abschnitt; `nextSlot` summiert die Pace bis zum nächsten wartenden Slot einschließlich des gewanderten, also kommt die nächste DUNGEON-AHEAD-Begegnung nicht früher. Ein gewanderter Slot ist getroffen und wird nie neu erzeugt. |
| **B6 – Rast (Paket C)** | Keine eigene Rastmechanik: Die C-Unterbrechung gilt im Dungeon mit Sicherheitsrahmen `dungeon`, unterbrochen wird nur durch `danger` (die Wanderbegegnung). Ursache ist der konkret gebundene Slot (`interrupt.who`), auch in Faktzeile und Korrektur. Zeit, Erholung, Folgeschritte (`rest interrupted`) und Extractor-Zeitschutz (.165/.166) unverändert. **Schutzregel:** `livingGo` ruft bei einer Reservierung dieses Zugs (`aheadReserved`) kein `aheadEvents` auf und vermerkt `ctx.pulse.invariant` (im Normalfluss unerreichbar). |
| **B7 – Kontext** | Narrator: `PULSE (the engine's; level N) — DANGER: <Slot> of this level come(s) to him here, where he is (the engine's encounter for this reply; exactly these, nothing else, and no other foe).` Friedliche Arten: `… No foe: the level's foes come only as the engine adds them.` Extractor-Katalog (dynamisch): `ENGINE ENCOUNTER (level N): when the reply shows … coming to him here` statt `where he arrives`. Keine Budgetänderung. |

**Schema:** `pulse.rolled.floor`, `pulse.rolled.wander = {dungeon, cycle, floor, slot, ref, who, many}`, ggf. `pulse.rolled.company`; `dungeon.ahead.ahead.wander`; `interrupt.who/many`; `pulse.outcome` auch für Dungeonwürfe (mit `persisted.slots`). Keine neuen State-Felder, kein Reducer-Umbau.

## 2. Abweichungen vom Plan

1. **Nur `danger` unterbricht eine Dungeon-Rast.** Der Plan nennt für die Dungeon-Rast nur den Wanderslot als Ursache; `trace`/`strange`/`meeting` kommen als Ereignis vor dem Einschlafen bzw. beim Aufwachen (wie bei C außerhalb des Exponierten).
2. **Weg aus dem Dungeon ohne Fenster** (`dungeon_leg`): Ein Abschnitt, der im Dungeon beginnt, würfelte in A nicht; B ändert das nicht, weil sonst ein Reisefenster ohne die Weltfirewall (`governs:false`) entstünde.
3. **Diagnose `pulse.outcome`** jetzt auch für Dungeonwürfe; die Rast-Korrektur aus C zählt eine Slotfüllung (`dungeon.slot`) als gezeigte Ursache.

## 3. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Neue Regressionen `tests/v4/pulse_b.test.js` | **14/14** – Slotauswahl (freier Minion, genommener/gefüllter Slot, Wächter, Boss, andere Ebene, neuer Zyklus); Umsehen mit Gefahr (eine Reservierung `wander`, Zeile, Katalog „coming to him here“, Slot mit Slotstufen getroffen, Kampf, `run.parts` unverändert); friedliches Fenster, Suche, kein `danger` ohne freien Slot; nicht erzählte Begegnung (Slot frei), Nicht-Slot-Kreatur (`dungeon_foe`), `held`; DUNGEON-AHEAD-Zug ohne Wurf; **Pacing-Vergleich** (mit Wanderung „wander, quiet, quiet, warden“, ohne „gallery, quiet, warden“; je eine Räumung durch ihn, gleiche Individuen nach Slot und Stufe, gleiche XP und Stufe, `run.parts` 4); alle **vier B6-Kombinationen** und die Schutzregel; Faktzeile und Korrektur mit Wanderursache; Swipe/Regenerate/Edit/Reload mit genau einer Reservierung und einer Slotfüllung, identische Faltung; Reset zwischen Wurf und Antwort; Dungeon ohne Living-Datensatz |
| Angrenzend | Living Dungeons `patch8*`: **107/107**; PULSE A/163/C/165/166/B: **72/72** (ein C-Test nur in der Beschreibung präzisiert) |
| Vollständiges `npm test` | **2911/2911** (`.166`: 2896; +14 B, +1 Replay-Akzeptanztest) |
| Replay | **2235** Fälle, **1040** abweichend, **alle 1040** exakt akzeptiert, **0** offen (§4) |
| Echter ST1.19-Host Standard | **116/116**, **0 PageErrors** (19 neue `pulse167_*`) |
| Echter ST1.19-Host Failsoft | **121/121**, **0 PageErrors** |

**Hostsmoke `tools/st_live/pulse167_smoke.mjs`:** Ausgangsstand mit demselben Harness wie die Node-Tests erzeugt (Old Crown Catacombs, Ebene 1, erste Begegnung besiegt) und in ST eingespielt; Fenster per Testhaken erzwungen.
- **Wanderer:** ein Wurf im Rahmen `dungeon`, genau ein `dungeon.ahead` (`wander`, Slot `gallery`), im ausgehenden Narratorrequest `… 2 restless skeletons of this level come to him here …` ohne DUNGEON AHEAD, im Extractorrequest „coming to him here“; Slot mit den Slotstufen getroffen, Kampf eröffnet, `run.parts` unverändert; Save/Reload: identischer Dungeonzustand; eine danach eingefaltete Erneuerung hebt die Reservierung auf, nichts vom alten Zyklus bleibt gebunden.
- **Normales DUNGEON AHEAD:** kein Wurf (`dungeon_ahead`), genau eine Referenz ohne `wander`, Slot getroffen.
- **Rast + GO mit Dungeongefahr:** Reservierung vor `time.advanced`, nach 63/120 min unterbrochen mit den Skeletten als Ursache, GO `NOT DONE`, kein DUNGEON AHEAD; Extractor meldet volle 120 min → Antwort bucht 0 (`rest_cut`); Slot getroffen.

## 4. Replay

Gegen `.166` ändern sich **5** bereits akzeptierte Records, alle in `b17-rogue` im Glimmerdeep Grotto; maschinell gegen die `.166`-Ausgabe abgeglichen (alle übrigen Felder gleich, Events bis auf die PULSE-Entscheidung gleich) und mit `previous_acceptance_166` in `tests/replay/accepted_pulse167_vs_126.json` eingetragen. 1035 Einträge byte-gleich.

| Record | Änderung |
|---|---|
| `#193` (er löst einen Beutel aus dem Mineralfilm) | erster Dungeonwurf: Wurf 4,09 < p 15 → offenes `danger`; die zwei Mineralschleime des freien Minionslots werden per `dungeon.ahead` (`wander`) reserviert und in einer PULSE-Zeile genannt. Die aufgezeichnete Antwort bringt sie nicht; ihr Record ist unverändert, der Slot bleibt frei |
| `#191`, `#195`, `#199` | DUNGEON-AHEAD-Züge: weiterhin kein Wurf, Diagnose `dungeon_ahead` statt `dungeon` |
| `#217` | Weg hinaus nach Glassmere: weiterhin kein Wurf, Diagnose `dungeon_leg` statt `dungeon` |

## 5. Grenzen

- Geskripteter Provider: belegt die technische Integration, nicht, dass ein freies Narratormodell die Wanderbegegnung bringt oder keine zweite erfindet (die Dungeon-Firewall weist Nicht-Slot-Gegner weiter ab).
- Die vorläufigen Werte (15 %, Gewichte) sind Hypothesen für den natürlichen Test (Paket D).
- Ein Wanderslot ist der erste freie Minion der Ebene in Slotreihenfolge; derselbe Slot wäre sonst die nächste DUNGEON-AHEAD-Begegnung.
- Ein Wurf im Dungeon zählt in die globale Fehlwurfserie wie jeder andere echte Wurf.
