# .168 — PULSE B: Lern- und Wiederholungsausschluss auch im Living Dungeon

**Basis:** `.167` / `58c29fa68ca0cdc76e2984eaa7f17914cc62a1f8`. Enger Korrekturbuild zum P2-Befund §3 des [GPT-Produktdiff-Gegenreviews .167](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/REVIEW_PULSE167_PRODUKTDIFF_GPT.md). [Paket-B-Patchnote .167](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/58c29fa68ca0cdc76e2984eaa7f17914cc62a1f8/avereth-engine/docs/PULSE167_PACKAGE_B.md) bleibt maßgeblich. Keine Änderung an Dungeon-Pacing, Slots, Rastzeiten, PULSE-Chancen oder Balance; kein Paket D.

## Fehler

`pulse.js` `pulseBegin()` prüfte die statischen Ausschlüsse als eine `else if`-Kette: Kampf → Dungeon → Lernen → Wiederholung. Seit .167 setzt der Dungeon-Zweig in einem Living Dungeon nur den Rahmen (`P.dungeon`, `governs:false`) und keinen Grund; die Kette brach dort trotzdem ab. Im Living Dungeon würfelten deshalb `train`/`study` und eine unmittelbar identische Eingabe.

## Korrektur

Lernen und technische Wiederholung werden nach dem Kampf-/Dungeonzweig als gemeinsame statische Ausschlüsse geprüft, sofern noch kein Grund gesetzt ist. Unverändert: Kampf zuerst (mit `governs` wie bisher), im Dungeon `governs:false`, ein Dungeon ohne Living-Datensatz behält `reason:'dungeon'` vor allen anderen.

## Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot/Grün `tests/v4/pulse_b168.test.js` über den echten Pfad (Planner-Zug, Antwort, Extractor) im Living Dungeon (Old Crown Catacombs, Ebene 1) | `.167`: **2/3 rot** – dieselbe Eingabe zweimal hintereinander würfelt erneut statt `repeat`; ein gültiges `study` (`mage.flame_lance`, 60 min) würfelt statt `learning`. `.168`: **3/3** – Wiederholung: `reason:'repeat'`, kein `pulse.rolled`, kein `dungeon.ahead`, `state.pulse` unverändert, Faltung identisch; Lernen: Studium gebucht, `reason:'learning'`, kein Wurf, keine Reservierung; Positivkontrollen: zwei verschiedene Eingaben würfeln, offene Gefahr reserviert den freien Minion wie in `.167`, DUNGEON AHEAD ohne Wurf, Kampf/`pending_combat` → `combat`, Dungeon ohne Living-Datensatz → `dungeon` |
| Angrenzend | PULSE A/163/C/165/166/B/168 **75/75**; Living Dungeons `patch8*` **107/107**. Ein B-Test rief `pulseBegin` direkt auf einem Stand auf, dessen letzte zwei Eingaben zufällig identisch waren (zweimal derselbe Kampfbefehl); er setzt nun eine eigene Eingabe, damit er weiter den Living-Dungeon-Rahmen prüft |
| Vollständiges `npm test` | **2914/2914** (`.167`: 2911; +3) |
| Replay | **2235** Fälle, **1040** abweichend, **alle 1040** exakt akzeptiert, **0** offen; keine Akzeptanzänderung (im Korpus kein Dungeonzug, der lernt oder sich wiederholt) |
| Echter ST1.19-Host | Standard **116/116**, Failsoft **121/121**, je **0 PageErrors**; die Dungeonläufe des `.167`-Smokes (Wanderer, DUNGEON AHEAD, Rast + GO, Reload, Erneuerung) unverändert grün |

Grenze wie `.167`: geskripteter Provider.
