# Avereth Engine — Aktueller Projektstand und nächste Übergabe

**Dokumenttyp:** zeitabhängiger technischer Hand-off  
**Stichtag:** 21. Oktober 2026 · Fassung 1  
**Pflege:** **nach größeren Patches, Reviews und wichtigen Livetests** aktualisieren  
**Wichtig:** Die unten stehenden Ist-Angaben gelten **nur für den genannten Commit**. Zu Beginn jedes neuen Chats **Git-HEAD prüfen** und neue Änderungen nachtragen.

## 1. Git- und Build-Fakten (geprüft am 21.10.2026)

| Feld | Stand |
|---|---|
| ChatGPT-Projekt | `RPG Engine` |
| Produkt | `Avereth Engine`, Fantasy-Sandbox-RPG als SillyTavern-Extension |
| GitHub | `https://github.com/Mango1331/Claude-AI-RPG-Game` |
| **Aktiver Produkt-/Entwicklungsbranch** | `claude/c-planner-prototype-2026-10-02-gpt-c666` |
| **HEAD, unabhängig über GitHub geprüft** | `2294b9b00a58e83025b9c04925a18eb2ff62b883` |
| **Build (package.json geprüft)** | `4.3.0-c.6.6.24` |
| Produktpfad | **Runtime V4-C** (semantischer Planner); V3/V4-A als Legacy erhalten |
| Nächster großer Patch | **Patch 8 — Living Dungeons**, **noch nicht implementiert** |
| Nächste erwartete Übergabe | Antwort einer **zweiten, unabhängigen Claude-Architektursitzung** zum bereits erstellten Patch-8-Auftrag; danach abschließende Prüfung/ggf. Auftrag überarbeiten |

Commit-Link: `https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2294b9b00a58e83025b9c04925a18eb2ff62b883`

### Testnachweise am Stand .24

- **915/915 `npm test`** laut Claudes Implementierungsbericht (von ChatGPT nicht eigenständig lokal ausgeführt).
- **LIVE SILLYTAVERN SMOKE C: OK**, Exit-Code 0, **21/21 Prüfpunkte `true`**, keiner `false`, vom Nutzer nach dem echten Smoke übermittelt.
- Smoke zeigte `Avereth Engine 4.3.0-c.6.6.24 | runtime v4 | integrity: OK`; Planner/Narrator/Extractor-Aufrufe, Kampferöffnung, Swipe-Plan-Wiederverwendung und Skillnamen-Rückfrage funktionierten; keine gemeldeten Seitenfehler oder API-Key-Lecks.
- Vorherige Patch-7-Dokumentation und Tests liegen im Repository, ersetzen aber nicht die Prüfung des aktuellen HEAD.

**Nicht verwechseln:** Ein bestandener Smoke bescheinigt die Integration, **nicht** die vollständige Korrektheit von Gameplay, Dungeon-Fortschritt und neuer Engine-Logik.

## 2. Ausgangsarchitektur (bestehend, nicht neu planen)

- **Hybridarchitektur:** LLM interpretiert und erzählt; JS besitzt Regeln und persistenten Kampagnenzustand.
- **Engine-Autorität:** `src/state.js` mit Event-Fold, `src/v4/domain.js` mit V4-Domains und Ownership, `src/v4/runtime.js` mit Live-Orchestrierung, `src/v4/world.js` für Extraktor-Deltas und Firewall.
- **V4-C:** `src/v4/planner.js` liest freie natürliche Eingaben in strukturierte Commands; vorhandene Story-/Combat-Handler buchen das Ergebnis. `src/v4/catalog.js` erstellt den bekannten Kontext. `src/v4/envelope.js` und `src/policy.js` begrenzen gültige Weltreaktionen.
- **Combat:** `src/combat.js`; Progression, Monsterprofile, Reichweiten, Wirkung und Tod Engine-owned. `src/display.js`/`src/hud.js` präsentieren Ergebnisse.
- **Quests/Guild:** `src/v4/guild.js` mit Board-Generator, Quest-ID, Status, Engine-gezähltem `DEFEAT`, READY/Turn-in und Belohnung. Board-Tagesangebot im C-Pfad stabil.
- **Dungeons:** `src/v4/dungeon.js` mit Raumgraph, `rooms` vs. echter `dungeon.real`-Klassifikation, Links, Blockern, Levels und Rank-Information. `src/v4/world.js` und `src/v4/commands.js` übernehmen GO, Ankunft und Wege. **Patch 7 bietet die räumliche Grundlage, aber noch nicht das vollständige Living-Dungeons-System.**
- **Loot:** `src/v4/loot.js`, automatisch nach Kampf; einmalige Belohnung aus tatsächlichen besiegten Monstern. Monsteranker/Grundlagen in `content/monsters.json`.
- **Lore:** `content/lore.json`, Narrator-Preset und WorldInfo/Lorebook; Kanon und Wissenstrennung gelten weiter.
- **Installation:** SillyTavern-Extension ohne Server/DB, Browser-JavaScript plus Node-Tests; `npm run smoke:st:c` testet echte ST-C-Integration, wenn Umgebung existiert.

Für Details lieber aktuelle Dateien lesen als aus der verkürzten Beschreibung Implementationstiefe abzuleiten.

## 3. Bereits erreichte Patch-Meilensteine (Kurzchronik)

1. **Gen 3 / Runtime V3/V4, Gen 3.5** — JS-Engine, LLM-Narrator, Event-Sourcing, Interpreter/Extractor, Entscheidungs-Ownership, World Envelope, Knowledge- und Agency-Firewalls, persistente Weltfakten. Historische Branches bestehen, sind aber nicht aktuelle Produktbasis.
2. **Prototype C / 4.3.0-C** — semantischer Planner statt fragiler rein lexikalischer Aktionserkennung; natürlicher Kampf-, Skill- und Handlungsinput, Validierung, Mehrfachhandlungssequenzen, Replays.
3. **Patch 1–3** — Memory-Retrieval, Threads/HUD sowie aktive Spielerabsichten und bekannte/berichtete Orte; wichtige Gründe: Retrieval driftete vom Questziel weg und wertlose Threads verdrängten relevante Weltfakten.
4. **Patch 4–6** — mechanische Kohärenz, NPC-/Monstergruppen und Präsenz/Wahrnehmung, Reise/Encounter, Suche, Hindernisse und Fallen, bereits definierte Entscheidungen und echte Konsequenzen. Branch-Historie und Tests für Details konsultieren.
5. **Patch 7 (`.15–.17`)** — Dungeon Foundation: physische Raumverbindungen, offene/gesperrte/verborgene Wege, Ebenen, `#map`, persistente Erkundung, echte Dungeonklassifikation und Rank-Gefahr je Ebene; bekannte Start-Dungeons samt Guild-Board-Anbindung.
6. **Patch 7.1 (`.19–.20`)** — Item-Stärke, Rank-Anforderungen, echte AoE und Cluster/Gruppe präzisiert.
7. **Patch 7.2 (`.21–.22` und Folgefixes)** — zusammenhängende Action-/Item-/Quest-/Narrator-Integration; C-Pfad für Kampagnen verankert. Genaue Chronik in `docs/PROTOTYPE_C.md`.
8. **Hotfix `.24`, Commit `2294b9b`** — letzte Stabilisierung aus dem 21.10.-Dungeon-Livetest (siehe nächster Abschnitt).

**Achtung:** Die Meilensteine sind Einordnung, keine Zusage, dass jede künftige Livetestsituation bereits korrekt funktioniert.

## 4. Hotfix .24: tatsächlich implementierte Korrekturen

Basierend auf dem Test vom 21. Oktober (vor `.24`) und überprüftem Commit `2294b9b`:

- **Skelett-Anchor:** neues korrektes `skeleton`-Bodyplan/Monster-Anchor, Aliase und passendes Loot. Skelette benutzen **Bony Strike**, keine Rat-Bites, Pelts oder Tails.
- **Kein mechanisches Temperament für V4-C:** keine automatische Skittish-Flucht-/Retreat-Schleife; tatsächlich kausale Flucht/Kapitulation weiter möglich. Legacy-Verhalten unberührt.
- **Kapitulation gibt 0 XP;** späterer tatsächlicher Kill kann die dafür vorgesehene XP genau einmal geben.
- **Expliziter toter Gegner:** `Basic Attack D`, falls D tot, schlägt nicht automatisch C; Ziel-Fehler ohne Kosten.
- **Combat-Truth:** „X killed in the First Burial Gallery“ interpretiert nicht mehr den Ortsnamen als gestorbene Kreatur.
- **Regression:** `tests/v4/combat_1021.test.js`; 5 gezielte Fälle laut Claude vor Fix rot, danach grün.

Diese Korrekturen haben im nächsten .24-Livetest grundsätzlich den gewünschten Effekt gezeigt: Ein Skelett kämpfte statt ständig wegzulaufen; korrekte Attack-/Lootgrundlagen. Das bedeutet **nicht**, dass alle Dungeonmechaniken schon richtig sind.

## 5. Letzter echter .24-Livetest: Befunde und Nutzerfeedback

**Test-PC:** Alaric Red, Mage, Level 1 bei Start (Testkonfiguration). **LLM:** `zai-org/GLM-5.3-Flash` in diesem Lauf. **Nicht als allgemeine Kampagnenpflicht behandeln.**

### Funktionierende Aspekte

- Spieler geht zur Guild, nimmt Aufgaben an, reist zum Dungeon und kämpft; die einfache Skeleton-Anchor-Reparatur aus `.24` funktioniert sichtbar.
- Erstes Skelett Level 10: Alaric gewinnt, bekommt 120 XP, erreicht Level 2; frühe Level-Fortschritte wurden nicht als Fehler angesehen.
- Kampf gegen Level-14-Ghul endet mit Alarics Tod. **Tod allein ist kein Bug;** fehlender Plot-Armor ist gewollt. Die Schadens-/Barriere-Mechanik des Kampfs wurde im vorigen Review als weitgehend nachvollziehbar bewertet.

### Bestätigte bzw. zu reproduzierende Probleme

| Thema | Beobachtung | Plan |
|---|---|---|
| **Kapellen-Ankunft** | Narrator zeigt Reise/Ankunft, Engine verwirft `arrive`/Passage, Engineposition bleibt in Guild Hall | In Patch 8 als reproduzierbare Orts-/Gate-Regression beheben |
| **Etagenzuordnung** | Von Bier Chamber (Level 1) über bekannte Stairway Down (Level 2) wird ein Black Corridor/Ghoul Hollow dennoch fälschlich wieder Level 1 zugeordnet | Patch 8: Ebenengraph-/GO-/Extractor-Kontinuität und RankAt testen |
| **Ghul-Anchor** | Ghoul wurde mit `skeleton`-Anker und „Bony Strike“ statt geeignetem fleischlichem Untotenprofil materialisiert | In Patch 8 kleiner Content-/Extractor-Fix |
| **Dungeon-Pacing** | Mehrere Räume/Etappen: Geräusch, Stille, erneut tiefer, bis endlich ein Gegner auftaucht; bedeutungslose Zwischenstopps | Patch 8 UND allgemeines Quest-/Travel-Pacing adressieren |
| **Allgemeines Pacing** | Dasselbe Problem existiert bei Escort, Delivery, Culling und Reisestrecken, nicht nur Dungeons | Übergreifender Gameplay-Grundsatz, in Patch 8 mit überprüfen |
| **Focused Ward + normale Bewegung** | Ward wird angewendet, kombinierte Rückwärtsbewegung im C-Planner verworfen, während Attack+Move funktioniert | **Separater Combat-Fix**, nicht als zwingende Patch-8-Voraussetzung |
| **Combat-HUD ohne Defensivskill** | Während Fight ersetzt Combat-HUD die unteren Normal-HUDs; die `Attack reach`-Zeile listet nur Skills mit `attack`, nicht Focused Ward | Kleiner UI-/Polish-Fix, eventuell Patch 10B, nicht im Dungeon-Core verstecken |
| **Ghul-Nachricht länger** | Die Begegnungsantwort dauerte deutlich länger als normale Schritte; längere LLM-Completion/Reasoning, keine bestätigte Retry-/Engine-Fehlerkette | **Nur beobachten**, keinen unbelegten Performance-Hotfix |
| **Culling-UX** | Monsterjagden sollen konkrete Zielzahl schon am Board (`Cull Wolves (4)`) zeigen und als `2/4` weiterzählen | In Patch 8 zusammen mit Guild-Quest-UX |
| **Dungeon-Clear** | `Floor 1 cleared` statt willkürlicher Killzahl; echte Engine-Progression statt Erzählerbehauptung | In Patch 8 |

**Wichtig für die Diagnose:** Die vorigen Reviews identifizierten mehrere Konflikte. Claude muss anhand der echten .24-Exporte die jeweiligen Ursachen nachstellen; nicht jede technische Vermutung als bereits nachgewiesene Ursache behandeln.

### Relevante .24-Testartefakte (Namen aus der Übergabe)

- `avereth-events-Avereth Engine Test v4 - 2026-10-21@02h22m54s828ms.json`
- `Avereth Engine Test v4 - 2026-10-21@02h22m54s828ms.jsonl`
- `Chat Completion request {(20261021-051150).txt`

Diese Dateien **können im Workspace der implementierenden Claude-Sitzung vorliegen, sind durch die Namen allein aber nicht im neuen Chat verfügbar**. Nicht behaupten, sie lägen lokal bereit, bevor sie gefunden wurden. Wenn der Nutzer die Dateien übergeben muss, gezielt nur diese anfordern.

## 6. JETZT: Patch 8 — Living Dungeons

**Projektentscheidung:** Statt einer weiteren vorgelagerten Dungeon-Minifix-Schleife soll **ein größerer, zusammenhängender Patch 8** die ursprüngliche Dungeon-Vision plus verwandte .24-Dungeon-/Pacing-Probleme bearbeiten.

**Stand am Stichtag:** ChatGPT hat bereits einen umfangreichen **Patch-8-Implementierungsauftrag** erstellt. Der Nutzer plant, diesen in der **zweiten Claude-Architektursitzung unabhängig reviewen** zu lassen und das Feedback anschließend an ChatGPT zurückzugeben. **Weder Review-Ergebnis noch Implementierung liegen in diesem Dokument bereits vor.**

### Verbindlicher Patch-8-Umfang, kurz

1. **System-Dungeons mit individuellen Parametern:** Dungeon-Gates, Zugangs-/Belegungslimits, eigene Ebenenzahlen/-Ranks, individuelle Resetintervalle.
2. **Ein tatsächlich spielbarer Dungeon-Run:** Eintritt → Erkundung/Bekämpfung/kleine Entscheidungen → Floor-Clear/Minibosse → Endboss → einmalige Beute → Exit → spätere Rückkehr/Reset.
3. **Echte gemeinsame Welt:** andere Abenteurer besuchen denselben Dungeon, belegen Plätze, beeinflussen Monster/Bosse/Ressourcen; keine kompletten parallel simulierten NPC-Charakterzüge.
4. **Zeitbasierte Respawns** als autoritative Events; keine Verdopplung bei Swipe, kein plötzliches Aufpoppen mitten im Kampf.
5. **Physische Kontinuität:** Kapellen-Ankunft und abwärtsführende Treppe aus .24 reproduzieren/fixen; keine Umgehung von gesperrten/verborgenen Wegen.
6. **Monster-Grundlagen:** Ghoul nicht als Skeleton; Speziesidentität mit passendem Anchor.
7. **Gameplay-Pacing:** Keine Kette bedeutungsloser Geräusch- und „continue“-Züge. Gilt ausdrücklich **auch außerhalb des Dungeons**.
8. **Quest-UX:** Culling-Zahlen und mechanisches `n/N`; Dungeon-Clears pro Etage statt einer künstlichen Killanzahl.
9. **Kompakte Dungeon-Fortschrittsanzeige**, nur soweit der Spieler Kenntnis davon haben darf.
10. **Regressionen, Replay/Savegame-Sicherheit und echter ST-C-Smoke** nach Implementierung.

### Explizite Nicht-Ziele dieses Patches

- Kein allgemeines XP-/Monster-Balancing oder XP-Farm-Nerf.
- Keine zweite Kampfengine, neue allgemeine Skill-Mechanik oder vollständige NPC-Agentensimulation.
- Keine universellen Dungeon-Zimmer-Templates, starren Kampfzahlen oder neue Server-/DB-Infrastruktur.
- **Focused Ward+Move** und **Defense/Utility-Combat-HUD** nicht einfach ungeprüft in den Dungeon-Patch ziehen; als separate Combat-/UI-Aufgaben erhalten.
- Legacy V3/V4-A bewahren.

### Technische Review-Leitlinien für Claude

- Vor Start Bestandsaufnahme in `src/v4/dungeon.js`, `world.js`, `commands.js`, `planner.js`, `guild.js`, `domain.js`, `catalog.js`, `runtime.js`, `state.js`, `combat.js`, Content, Schemas und Tests.
- Kein Doppelmodell: bestehende `places[id].dungeon`, `s.links`, Quest-/Event-/Encounter- und Zeitmechaniken weiterverwenden.
- Bei großer Patcharbeit **drei Reviews**: Architektur vor Implementierung, Integration nach Implementierung, kritischer Final Review auf Gameplay und Overengineering.
- Für externe zweite Claude-Sitzung: **nur unabhängig reviewen, nichts implementieren**; technische Widersprüche/Abhängigkeiten, fehlende ursprüngliche Features und vereinfachte Lösungen benennen. ChatGPT gleicht den Bericht ab und aktualisiert erst dann den finalen Code-Auftrag.

### Starter-Dungeons im Seed

- **Mossback Warrens** nahe Ashbridge — Goblins, F–E.
- **Glimmerdeep Grotto** nahe Glassmere — Kristallhöhlen, F.
- **Old Crown Catacombs** nahe Alderwatch — Untote, F–E.

Als Integrationsfälle wiederverwenden. Ein bestehender 1-Level-Dungeon muss nicht künstlich weitere Ebenen erhalten, nur um einen finalen Boss zu haben.

## 7. Danach geplante Roadmap

- **Patch 8:** Living Dungeons – als nächstes, noch nicht implementiert.
- **Patch 9:** Organic Classes / organische Entwicklung aus dem wirklichen Spielverhalten statt festem Evolutionsbaum.
- **Patch 10B:** Übergreifendes Polish und späteres Balancing/Scaling; Combat-/Skill-HUD und ggf. der separate Focused-Ward-Move-Fix sind Kandidaten, über genaue Einordnung später entscheiden.
- **CraftRPG:** mögliche spätere Integration/Portierung, derzeit nicht der aktive Entwicklungszweig.

Kleinere Änderungen bei konkreten kritischen Bugs bleiben möglich. Keine generelle Rückkehr zum Minifix-Loop vor jedem größeren geplanten Patch.

## 8. Wichtige Code- und Dokumentationspfade

- `avereth-engine/docs/PROTOTYPE_C.md` — umgesetzte Entwicklung C und Patch-7/7.1/7.2-Historie.
- `avereth-engine/docs/ARCHITEKTUR.md` und `docs/ARCHITECTURE_GEN35.md` — Architekturprinzipien, Decision Ownership und World Envelope.
- `avereth-engine/docs/LOREBOOK.md` und `content/lore.json` — Welt- und Dungeon-Kanon, Guild und Monster-Ökologie.
- `avereth-engine/src/v4/dungeon.js` — Ort-/Room-/Level-Graph, `wayBetween`, `levelVia`, `rankAt`.
- `avereth-engine/src/v4/world.js` — Extraktor-Deltas, `arrive`, `passage`, `wayRefused`.
- `avereth-engine/src/v4/commands.js` — GO und Dungeon-Navigation, Travel-Pacing.
- `avereth-engine/src/v4/planner.js` — Freitext → strukturierte Aktionen.
- `avereth-engine/src/v4/guild.js` — Guild Boards, `defeatTally`, Quest-Turn-in.
- `avereth-engine/src/v4/domain.js`, `src/state.js` — State-Events und Fold.
- `avereth-engine/src/combat.js`, `src/hud.js`, `src/display.js` — Combat, Skill-Wirkung und UI.
- `avereth-engine/content/monsters.json` — Monsteranker und Loot.
- `avereth-engine/tests/v4/patch7.test.js`, `combat_1021.test.js` — existierende Dungeon-/Regressionstests.
- `avereth-engine/package.json` — echte aktuelle Versionsnummer und Testbefehle.

Repository-Dokumentation kann ältere Überschriften/Startdaten enthalten; **bevorzugt Commit, `package.json` und verifizierte Quellcodepfade** für aktuellen Zustand.

## 9. Übergabe an einen neuen Chat: sofortige nächste Schritte

1. Dateien **01 → 02 → 03** lesen, aktuelles Nutzerziel aus dem neuen Chat übernehmen.
2. GitHub-Verbindung prüfen und aktuellen HEAD des Branches `claude/c-planner-prototype-2026-10-02-gpt-c666` lesen. Ist dieser nicht mehr `2294b9b`, Build/Tests/Status aus echtem Git und dem Nutzernachtrag aktualisieren.
3. **Nicht** ungefragt erneut alte Patch-8-Designfragen aufrollen: der große Implementierungsauftrag ist verfasst; nun steht **die kritische zweite Claude-Gegenprüfung** an.
4. Wenn der Nutzer Claudes Review schickt: Befunde punktweise gegen Originalplan, bestehenden Code, Nutzer-UX und Overengineering prüfen. Nur fundierte Änderungsvorschläge in einen finalen Auftrag übernehmen.
5. Wenn Implementierung erfolgt: Commit-/Diff-Review, Tests und echten Live-Smoke prüfen; anschließend Nutzer-Livetest vorbereiten.
6. Nach verifiziertem größerem Meilenstein **diese Datei aktualisieren**, ohne Datei 01/02 zu einer wöchentlichen Versionschronik aufzublähen.

**Keine Annahme, dass eine laufende Aufgabe bereits abgeschlossen ist, nur weil ihre Zielbeschreibung hier detailliert steht.**
