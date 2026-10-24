# 10B – Verfolgung, Flucht, Rückzug und sinnvolles Pacing
**Vollständiger fachlicher Design-Patchkandidat – NICHT als Implementierung freigegeben.**

**Basis:** Build `.66`; `06_PATCH10B_MASTERPLAN_UND_REVIEWS.md` §8 mit ausführlicher Ursachenkette H1–H6, Lösungsstufen C0–C3 und 14 Gegenfällen. Die beschriebenen Hasen-/Fuchs-Erlebnisse stammen aus älteren Läufen; ein isoliertes originales Event-Replay ist dort noch **nicht** vollständig hinterlegt. Aktuellen `.66`-Langlauf vor weiterem Design vergleichen.

## 1. Spielerproblem und verbindliche Richtung

Ein Hase oder Fuchs flieht, der Spieler nähert sich wiederholt an, das Tier vergrößert die Distanz erneut: viele nahezu identische Eingaben, ohne dass eine neue Entscheidung entsteht. **Nicht** das Fliehen selbst ist falsch. Ein Tier darf entkommen und ein schwer gerüsteter PC muss keinen schnellen Fuchs mühelos einholen; aber ein klares `chase`-Ergebnis („weg“ oder „eingeholt“) ist besser als ein endloser `move closer / retreats`-Zirkel.

Der Design-Kanon verlangt **bedeutsame Spielerentscheidungen vor Bewegungsmikromanagement**, zugleich ehrliche Reichweite, Skillkosten, Gelände und physische Chancen. Kein Gratisfang, kein automatisches Töten, keine Fremd-Quest-XP durch Entkommen, keine zweite komplette Chase-Simulation.

## 2. Vorhandene Mechanik (nicht neu erfinden)

**`src/combat.js` enthält im C-Pfad bereits:**
- `ENGAGED/SHORT/MEDIUM/LONG` relative Range-Bands und `moveAction`/`repositionPc` (gewöhnlich **ein** Band-Schritt).
- `npcDecide`, `fleeing(enc,id)`, `pcFlee`, `escapeRoll`, `chase(ctx,id)` und `runCombat`-Routing von zielgerichtetem `move closer` bei **wirklich** `fleeing`-Gegner. `chase` kennt bereits den **einmaligen** Ausgang: Flucht gelingt oder `caught:true`/ENGAGED.
- Vorläufige Formel in `06` §8: `clamp(50 + 5*(init_runner - max(init_pursuers)) - 10*(number_pursuers - 1), 15, 85)`; **keine** neue Verbindlichkeit der genauen Zahlen und **kein** Hinweis, dieser Wurf gehöre dem PC statt dem Flüchtenden.
- C-NPC-Temperament wird in einem relevanten Codepfad auf `null` gesetzt; eine narrative scheue Kreatur wird deshalb nicht zwangsläufig mechanisch `fleeing`. Auch `retreat` ist ausdrücklich **nicht** dasselbe wie `flee`.
- `src/v4/world.js` und `src/v4/envelope.js` interpretieren autonome Intent-/Hostility-Aussagen; `src/v4/planner.js` oder `commands.js` muss echte Spielerabsicht auf vorhandene Handlungen mappen. `src/context.js` muss klar die echten Encounter-/Range-/Flee-Resultate zum Narrator transportieren.

**Daher: Priorität C0 – echte bestehende Pfade wieder erreichbar machen**, nicht neues Minispiel bauen. `Hase`-/`Fuchs`-Jagd als End-to-End-Natural-Language-Test, nicht als neues Enum `animal_chase_quest`.

## 3. Vorgesehener Patchumfang – erst nach tatsächlicher Ursachenreproduktion

1. Nachstellen, ob der Narrator ein eindeutiges „der Hase flieht“ liefert, der World-Extractor `intent:flee` persistiert und `npcDecide` ihn als fliehend markiert. Fehlende **Intentbuchung** vs. korrekte `retreat`-/Distanzentscheidung unterscheiden. Ein verfehlter Intent darf nicht durch pauschales `temperament===skittish` oder zufälliges Fleeing aller Tiere ersetzt werden.
2. Natural-Language-Planner: „ich **verfolge** genau dieses fliehende Tier“ vs. „ich **gehe einen Schritt näher**“ sauber in das bereits vorhandene zielgerichtete Movement/Chase-Routing überführen. Kein Teleport, keine freie sofortige Waffe, keine zusätzliche PC-Aktion. Zielidentität/Range/Encounter muss eindeutig bleiben; bei unklaren mehreren Flüchtenden keine heimliche Zielwahl.
3. `chase`-Beendigung in Engine/Eventlog und HUD/Narrator durchprüfen: **escaped** → Gegner tatsächlich aus laufendem Encounter und nicht loottable; **caught** → für diesen Einholversuch wirklicher `ENGAGED`-Status und keine sofort erfundene neue Flucht. NPC-Verbände erhalten individuelle Statuswerte.
4. Wenn eine tatsächliche bekannte Flucht an LONG bereits irreversibel erfolgreich ist, **kurz und verständlich beenden**, keine ewigen Range-Band-Reisen; wenn der NPC nur repositioniert, darf die normale Movementregel weiter gelten. Positive Schutzkontrolle für Drohung≠Kampfstart und tatsächliche NPC-Ambushes aus 10B-3.
5. **Keine** neuen globalen Movementwerte und kein allgemeiner Shortcut für Tierjagd. Erst falls die reproduzierte Ursache mit C0 nicht lösbar ist, C1 (enge Policy beim Escape-Outcome) nach eigener Freigabe. C2/C3 (erweiterte Terrain-/Speed-Proben, neue Stamina-/AGI-/Move-Balance) als spätere ausdrücklich zu entscheidende Features.

## 4. Regressionen – fachlich zusammenhängend statt Mini-Patchfolge

- **Z1** Hase mit eindeutig gebuchtem `flee`: Exit-/Flee-Status entsteht; keine Phantom-Dauerschleife.
- **Z2** „Ich verfolge den fliehenden Hasen“: genau eine legale zielbezogene `chase`-Entscheidung.
- **Z3** „Ich gehe einen Schritt näher“: normale Bewegung, kein ungefragter Chase-Wurf.
- **Z4/Z5** Chase gelungen/fehlgeschlagen: bei `caught` ENGAGED, bei `escaped` weg; keine doppelte/flüchtige XP-/Loot-/Questgutschrift.
- **Z6** bloßes `retreat`: keine unberechtigte `caught`-Abkürzung.
- **Z7** langsamer Nahkämpfer vs. schneller Flüchtender; kein automatischer Fang durch Wunschformulierung.
- **Z8** Mage/Rogue-Mobilität, Blink, Fernkampf und Ressourcen; vorhandene Reichweiten-/Skilllegality unverändert.
- **Z9** aggressiver Eber/Gruppe bleibt kämpferisch, nicht überall skittish durch neues Temperament.
- **Z10** sapienter Dieb flieht kausal; kein pauschales Monster-only-System.
- **Z11** PC-Flucht ENGAGED vs. LONG folgt `pcFlee`, keine gratis Escape-/Doppelaktion.
- **Z12** Gruppenbezug: einzelne Flüchtende vs. mehrere Verfolger, keine Massen-Retreat-Automatik.
- **Z13** Snapshot, Fold/Reload, Replay und Swipe/Regenerate für `fleeing/caught/escaped`.
- **Z14** klare Text-/HUD-Beschreibung ohne neue ungebuchte Enginebewegungen.

**Metriken für Abnahme:** Spielerinputs pro Chase, tatsächlich neue Entscheidungen, korrekt endende Encounter, `escapeRoll`-Akteur/Chance/Outcome, nie falsche Kill-/Cull-/Lootgutschrift, Klassenunterschiede qualitativ statt pauschaler Balance-Nerfs.

## 5. Implementierungs- und Abnahmeregeln

- Erst die älteren Hasen-/Fuchs-Vorfälle anhand vorhandener Rohlogs rekonstruieren oder ausdrücklich als nur teilweise belegtes Nutzererlebnis behandeln; reine simulierte Fixtures nicht als originale Livebeweise darstellen.
- Red-/Green-Test des tatsächlich falsch erreichten Pfads und positive Kontrollen. **Ein normaler fachlicher Chase-Patch** darf `planner`, `commands`, `combat`, `world`, `context` betreffen, muss aber in seinem eigenen Diff isoliert sein.
- `npm test`, Simulatorszenarien zu Level 1/5/10/14/15 und falls sinnvoll PvP **nur für echte betroffene Regeln**, realer `smoke:st:c`, danach natürlicher Lauf mit echten Tier-/NPC-Fluchtsituationen. Keine pauschale Änderung aller Klassengeschwindigkeiten vor Spielnutzenbeleg.
- Kein 10B-3 Guild, kein 10B-4d Auto-Regenerate, kein Monster-/Loot-Redesign im Chasepatch.

**Status:** Kandidat vorbereitet. Benutzerentscheidung zur Implementierung und ggf. Variant C0/C1 weiterhin erforderlich; kein Produktcommit/Build/Test durch dieses Dokument.
