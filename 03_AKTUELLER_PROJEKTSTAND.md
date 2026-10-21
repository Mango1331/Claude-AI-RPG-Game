# Avereth Engine — Aktueller Projektstand und nächste Übergabe

**Dokumenttyp:** zeitabhängiger technischer Hand-off  
**Stichtag:** 21. Oktober 2026 · Fassung 5 (.26-Livetest, Performance- und Videospielisierungsreviews)  
**Pflege:** Nach großen Patches und wichtigen Reviews/Livetests aktualisieren. **Zu Beginn jedes neuen Chats den Git-HEAD neu prüfen.**  
**Quellenrangfolge:** aktueller Code/Commit für implementierte Mechanik; dokumentierter Design-Kanon für Ziele; Claude-Berichte für nicht unabhängig ausgeführte Tests; Livetest-Events/LLM-Logs für reales Gameplay.

## 1. Git, Version und Nachweisstatus

| Feld | Stand |
|---|---|
| ChatGPT-Projekt | RPG Engine |
| Produkt | Avereth Engine – Fantasy-Sandbox-RPG als SillyTavern-Extension |
| GitHub | https://github.com/Mango1331/Claude-AI-RPG-Game |
| **Produkt-/Entwicklungsbranch** | claude/c-planner-prototype-2026-10-02-gpt-c666 |
| **HEAD am 21.10.2026 unabhängig über GitHub geprüft** | c6baa06e159f16069efd728844c7afe7c7dc186a |
| **Build direkt aus package.json und manifest.json geprüft** | 4.3.0-c.6.6.26 |
| **Maßgeblicher Produktpfad** | V4-C, semantischer Planner; V3/V4-A als Legacy |
| **Patchstatus** | **Patch 8.1 (.26) implementiert und im aktuellen GLM-5.3-Flash-Livetest bereits teilweise bestätigt; auffällige Extractor-Latenz, Performance-Review als nächster Schritt** |
| **Nächster Schritt** | Fortgeschrittenen .26-Run und Performance-Logs weiter auswerten. **Vorläufigen Patch 8.2 ausschließlich unabhängig von Claude reviewen lassen**, danach über Implementierung entscheiden. QoL-/Quest-/ROAD-AHEAD-Ideen separat in Datei 04. |
| Dokumentationsbranch | main – Dateien 01, 02, 03 im Repository-Root; nicht mit Entwicklungsbranch verwechseln |

Aktueller Implementierungscommit: https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c6baa06e159f16069efd728844c7afe7c7dc186a  
Vorheriger Patch-8-Commit: https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f3b55819dad21249d871a62b7ede38bd926598cd

**Testnachweise:** Für Patch 8.1 meldet Claude **960/960 npm test** (davon **29/29 neue Tests** in `tests/v4/patch81.test.js`) sowie `smoke:st:c` mit **19/19 Prüfungen**, keine Browserseitenfehler oder offengelegten Keys. Dies sind **Claudes berichtete Läufe**, nicht von ChatGPT unabhängig ausgeführte Tests. Code, Testdateien und Versionsnummern wurden über GitHub verifiziert. Ein vollständiger Dungeon-Clear/Boss-/Reset-Livetest für .26 ist noch nicht als erfolgreich abgeschlossen belegt; **ein echter .26-GLM-Run mit Gate, Gruppencombat, Slimes und Level-up wurde inzwischen gespielt und teilweise ausgewertet**. Zuvor für Patch 8 (.25) meldete Claude 931/931 Tests und einen C-Smoke mit 21/21.

## 2. Architektur – was bereits vorhanden ist

- Leitlinie: **LLM versteht wie ein Game Master; deterministische JavaScript-Engine rechnet wie ein Spiel**.
- SillyTavern-Extension ohne eigene Server-/Datenbank-Infrastruktur; Node-Testumgebung.
- Zustand aus Event-Fold, deterministischer RNG, Replay- und Swipe-Stabilität, Decision Ownership, Player Agency, Knowledge-Firewall.
- V4-C: src/v4/planner.js interpretiert freie Spielernachrichten; src/v4/commands.js / Engine lösen Mechaniken; Narrator erzählt; Extractor und src/v4/world.js persistieren zulässige Weltänderungen. Runtime-Orchestrierung in src/v4/runtime.js.
- Kampf, Monsteranker, NPC-Materialisierung und XP in src/combat.js, src/engine.js, Content und verwandten Modulen; Loot in src/v4/loot.js.
- Gildenboard, Vertragsstatus, DEFEAT-Zählung, READY und Auszahlung in src/v4/guild.js.
- Patch 7: src/v4/dungeon.js für echte räumliche Graphen, bekannte Wege, Fallen, Etagen und feste Ranks; rooms sind von echten Dungeon-Klassifikationen (places[id].dungeon.real) getrennt.
- **Patch 8:** src/v4/living.js für die operative Dungeon-Struktur (dungeons[root]) mit Slots, Gate, Gruppen, Clear-Status, Reset und Ressourcen. Dungeon-Klassifikation bleibt in places[root].dungeon, konkrete Individuen bleiben Entities, Räume bleiben places und Links.
- Neue Fachlogik soll der Strangler-Regel in docs/ARCHITEKTUR.md §13 folgen; kein neues monolithisches World-Applier-System.

**Nicht verwechseln:** Eine funktionierende Engine-Struktur bedeutet noch nicht, dass der Narrator sie in einem echten Modelllauf zuverlässig befolgt.

## 3. Entwicklung bis Patch 8 – Kurzchronik

1. Frühe Runtime V3/V4 und Gen 3.5: Event-Sourcing, LLM-Narrator, Interpreter/Extractor, Ownership, kausaler World Envelope und persistentes Figuren-/Weltwissen.
2. Prototype C / V4-C: semantischer Planner für natürliche Eingaben und Handlungsabfolgen statt ausschließlich lexikalischer Erkennung; Validierung, Commit-Barriere, Replay.
3. Patches 1–3: Memory Retrieval, Threads und HUD, aktive Spielerabsichten, bekannte und berichtete Orte; gegen verlorene Ziele und Kontextrangfolgefehler.
4. Patches 4–6: Mechanik- und Questkonsistenz, Gruppen-/Encounter-Integration, Reisen, Suche, Fallen und Hindernisse.
5. Patch 7 (.15–.17): Raumgraph, physische Wege, versteckte/gesperrte Passagen, Rückwege, Dungeonebenen und Rank pro Ebene; drei bekannte Start-Dungeons.
6. Patches 7.1 und 7.2 (.19–.22): Items/Skill-Effekte, AoE, Cluster, C-Integration, Combat-/Weltidentität und Stabilität. Details in docs/PROTOTYPE_C.md.
7. Hotfix .24 (2294b9b): Skelettanker statt Ratte, Temperament-Kiting auf C entfernt, keine XP bei Kapitulation, Kill-XP einmalig, explizit tote Angriffsziele schützen, Combat-Truth.
8. **Patch 8 – Living Dungeons (.25, f3b5581):** Neues lebendiges Dungeonmodell; Details Abschnitt 4. Grundlage war der unabhängige Review des großen Implementierungsauftrags durch eine zweite Claude-Architektursitzung und Revision 2 des Auftrags.

Die Chronik ist keine Behauptung, dass jedes historische Randproblem vollständig gelöst ist.

## 4. Patch 8 (.25): Implementiert und im Code dokumentiert

Die vollständige technische Beschreibung und Claudes drei Review-Durchgänge stehen in **avereth-engine/docs/PATCH8_LIVING_DUNGEONS.md** auf dem Entwicklungsbranch. Neue Tests: **avereth-engine/tests/v4/patch8.test.js**; Hilfen: patch8_lib.js; .24-Fixture: live_1021c.json.

| Feature | Implementierungsstand |
|---|---|
| Dungeonaufbau | Einmalige Engine-etablierte lebendige Struktur je Dungeon; eigene Ebenen, Slots und Rollen-Levelbereiche; auch generierte neue Dungeons |
| Raum- und Begegnungsfortschritt | DUNGEON AHEAD vor Erzählung, stabile Slot-Refs; Engine-Bindung an konkrete Kreaturen-Entities; ein vom Narrator ausgelassener Gegner wird trotzdem materialisiert und im nächsten Zug korrigiert |
| Minibosse/Bosse | Wächter je relevanter Ebene, Endboss, eindeutige Rollen-/Zyklusidentität und vorhandene Kampf-/Lootmechanik |
| Ebenenabschluss | Alle verpflichtenden Slots aufgelöst, Floor-Clear mit Credit für PC oder andere; sichtbare Manifestation/Siegel |
| Boss-/Dungeon-Reset | Eigener Spielweltzeit-Zyklus, keine echten Timer; alte ungenommene Zyklusbeute verfällt unter Ausnahmen; neue Individuen je Zyklus |
| Andere Abenteurer | Deterministische Besuchs-/Belegungspläne, eigene Gruppen und stabile Anführer; Konkurrenz um freie Slots und Bosse; keine vollständige Offscreen-NPC-Kampfsimulation |
| Gate | Definierter Eingangsknoten, Kapazität, Gate-Zugang, ggf. Gebühr über explizites Angebot; bestehende Seed-Kontrollregeln |
| Materialien | Einfaches wiederkehrendes Ressourcenmodell; konkrete Fundstelle bisher in Glimmerdeep |
| Rückkehrstein | Seltener Warden-/Boss-Drop; außerhalb Kampf explizit nutzbar, Verbrauch plus Teleport zum Gate |
| Quests | Sichtbare Cull-Zielzahlen und n/N, Zeit-/Orts-/Akteurs-Zurechnung; Dungeon-Clear je Ebene, Auszahlung an der Gildentheke, fremd erledigte Contracts nicht unverdient bezahlt |
| Pacing | Eine zusätzliche GO-Anweisung und Engine-Fortschrittspunkte im Dungeon; weniger künstliche Zwischenstopps beabsichtigt, **reale LLM-Wirkung noch offen** |
| Monster-Content | Ghoul, Slime und Goblin Shaman als eigene Anchors; Skelett weiterhin korrekt |
| Kompatibilität | Vorhandene Orte und Kreaturen bleiben erhalten; neue Dungeonstruktur lazily ergänzt; alte falsche Level werden absichtlich nicht rückwirkend repariert |

**Die drei .24-Regressionen:** Kapelle wird auf Gate/Eingang aufgelöst; Abstieg von Bier Chamber über Stairway Down nach Black Corridor wird Level 2 und nicht erneut Level 1; Ghoul verwendet fleischlichen Untotenanker und ein Dungeon-Rollenfenster statt des Skeleton-Profils. Claude reproduzierte diese Fälle mit den .24-Originalen vor der Korrektur. Nachweise: tests/v4/patch8.test.js und die neue anonymisierte Fixture.

**Konkret definierte Seeds:** Mossback Warrens bei Ashbridge (Goblins, F/E; Guild-Zugang), Glimmerdeep Grotto bei Glassmere (Kristalle, F; Guild + 10 cp), Old Crown Catacombs bei Alderwatch (Untote, F/E; freier Eingang). Die Content-Seeds besitzen nun Gate, Kapazität, Reset und Ebenenslots; die drei Seed-Zyklen sind im aktuellen Code jeweils 3 Spieltage. Das sind Seed-Parameter, kein universelles Gesetz für neue Dungeons.

**Bekannte Grenzen laut Claude:**
- Kein nachträgliches Reparieren falscher alter Etagen/Monsterprofile.
- Nur ein NPC-Anführer je fremder Gruppe; andere Mitglieder als persistente Gruppe, nicht Einzelagenten.
- Vorhandene Ressourcenvorlage Glimmerdeep; neu klassifizierte Dungeons ohne definierte Fundstellen.
- Die Siegelregel Old Crown schließt Level 2 bis zum Clear von Level 1; alte bereits betretene Räume haben eine Übergangsausnahme.
- Wenn der Board-Generator eine Cull-Anzahl weglässt, ergänzt die Engine beim Buchen eine Zielzahl.
- Keine neue Extractor-Delta-Art und laut Bericht keine zusätzlichen LLM-Aufrufe.

## 5. Letzter echter LLM-Livetest (.24) – historische Ausgangslage

Der letzte vollständig ausgewertete echte Dungeon-Livetest lief mit **Build .24** und **GLM-5.3-Flash**. PC Alaric, Mage. Er besiegte ein Skelett (XP/Level-up funktionierten) und starb später beim Ghul. Ein Charaktertod ist kein Fehler.

Dort bestätigt bzw. beobachtet:
- Kapellen-Ankunft widersprach Engineposition.
- Black Corridor/Ghoul Hollow wurden nach einer abwärtsführenden Treppe fälschlich Level 1.
- Ghoul bekam Skeleton-Kampfprofil.
- Mehrere atmosphärische Dungeon-Zwischenmeldungen ohne echte Entscheidung.
- Gleiche Art von unnötigen Zwischenstopps besteht prinzipiell auch bei Reisen, Escorts, Deliveries und Culling außerhalb.
- Focused Ward schützte real (24 Barrier-HP), aber C-Planer verwarf die gewünschte zusätzliche Rückwärtsbewegung. Combat-HUD listete offensive Skills, nicht Ward/Utility.
- Eine Ghul-LLM-Antwort dauerte deutlich länger als normale Antwort, ohne belegten Retry; nur beobachten.

Die drei erstgenannten Probleme wurden in .25 mit Regressionstests adressiert. Das allgemeine Pacing hat jetzt nur eine ergänzende GO-Anweisung; **echte Verhaltensverbesserung im Modelllauf nicht behaupten, bevor sie getestet wurde**. Focused Ward + Movement sowie Defense/Utility-Combat-HUD bleiben **getrennte Combat-/UI-Themen** (mögliche spätere Korrektur/Patch 10B), kein Patch-8-Blocker.

## 5a. Erster echter Patch-8-Livetest (.25, Glassmere → Glimmerdeep, 21.10.2026)

**Quellen:** JSONL, Avereth-Events und Chat-Completion-TXT des neuen Runs. Build .25 in Events verifiziert. **Dieser erste Teilexport endete vor dem Dungeon-Eintritt.** Die anschließende Fortsetzung mit zwei Glas-Käfer-Kämpfen steht in Abschnitt 5b. Floor-Clear, Boss und Reset bleiben mit echtem GLM offen.

**Positiv:** Charaktererstellung, Gildenregistrierung, Guild-Board mit gespeicherten Cull-Zahlen, Questannahme und zusammenhängende Reisen funktionierten. Dungeon-Etablierung erzeugte ein Gate mit Kapazität 6, einen F-Rank-Floor, drei Begegnungsslots (2 Glasbeetles, 2 Mineralschleime, Glimmer Queen) und 3-Tage-Zyklus. Das eingeklappte World-HUD zeigt Belegung 0/6 und Reset in 3 Tagen, nicht jedoch eine auffällige Eintrittskarte. Der Narrator erzählte diese Daten nicht, obwohl sie in seinem Kontext standen.

**Bestätigter Blocker: doppelte Dungeon-Eintrittsforderung.** Der Wachmann erzeugte per Narrator/Extractor das gewöhnliche, nichtkanonische Angebot offer.t18.2 über 10 cp (service other). Alaric bezahlte und die Engine buchte -10 cp, transaction.completed und service.granted. Aber es gab kein dungeon.pass: commands.js erstellt diesen nur bei kanonischen Angeboten mit o.gate. Beim ausdrücklichen Eintrittsbefehl wurde daher ein zweites Angebot offer.gate.glimmerdeep_grotto über dieselben 10 cp geöffnet, und Alaric blieb draußen. Die vom Narrator zuvor behauptete Ankunft in der ersten Galerie wurde von world.js mit no_go berechtigt abgelehnt, weil in diesem Zug noch keine Bewegung autorisiert war.

**Weitere Befunde:**
- Cull Crystal Beetles verlangt 6 Kills; die in diesem Zyklus verankerte Population bietet nur 2 Glasbeetles plus ggf. die Glimmer Queen (höchstens drei passende Ziele in einem Run). Mehrere Resetzyklen wären erforderlich. In diesem Teilexport erfolgte kein Kill; der nachfolgende zweite Export zeigt 1/6 nach dem ersten Kill.
- Engine-Board lieferte die Zahl (6), Narrator ließ sie in der angezeigten Boardliste weg; erst HUD zeigte 0/6.
- Narrator behauptete eine Übernahme des Wool-Cart-Auftrags durch andere Abenteurer, obwohl das kanonische Board den Auftrag weiter listete. Ein narratives fact.asserted über die angebliche Übernahme wurde gespeichert; Board-Truth-Grenze prüfen.
- Narrator ergänzte nicht mechanisch abgesicherte Details zu einem zweiten Akademie-Gate, Loot-Verboten und Reward-Verfall; diese sind im Gildenvertrag als freier Quest-Detailtext gelandet. Kanon und Kreativfreiheit gezielt abgleichen.
- Reise-Pacing in zwei Etappen positiv; Dungeon-Pacing weiterhin nicht getestet.

**Historisches Nutzerfeedback aus dem ersten .25-Teilexport (in Patch 8.1 .26 weitgehend umgesetzt; siehe Abschnitt 5c):**
- Die 10-cp-Gebühr wirkt bei einem offiziellen Guild-Auftrag, der auch der Akademie dient, wenig plausibel. Eine Guild-Quest-Freistellung erwägen, keine allgemeine Abschaffung sämtlicher Gebühren.
- Die Videospiel-Dungeonaspekte sollen als Welt-Lore verständlich werden.
- Eine **Engine-eigene, sofort sichtbare Gate-/System-Anzeige** erwünscht: belegte Plätze / Kapazität, eigene Gruppengröße, aktuelle Reset-Restzeit (nicht nur Tage gerundet), bekannte Etagen-Ranks, Zutrittsvoraussetzungen/Gebühr und Enter?-Entscheidung. Zahlen aus Engine-State, nicht narrativ geschätzt. Bereits ausdrücklich erklärter Eintritt benötigt keine zweite Bestätigung; unbekannte Floors nicht vorzeitig verraten.
- Vor dem ersten vollständigen .25-Dungeonlauf den bestätigten Gate-Payment-Bug beheben; weitere zusammenhängende Integrations-/Darstellungsprobleme sinnvoll bündeln statt erneut einen Minifix-Loop zu beginnen.

## 5b. Fortgesetzter Patch-8-Livetest (.25, erster Dungeon-Encounter, 21.10.2026)

**Quellen:** Nachgelieferte erweiterte JSONL-, Avereth-Events- und Chat-Completion-TXT-Dateien desselben GLM-5.3-Flash-Runs. Entwicklungsbranch unverändert f3b5581, Build .25. Der Test enthält keinen vollständigen Floor-Clear, Boss und Reset; nach der letzten Narrator-Antwort sind keine neuen Engine-Deltas angewendet.

**Gate:** Der Spieler zahlte die 10 cp ein zweites Mal über das kanonische Angebot offer.gate.glimmerdeep_grotto. Jetzt entstanden dungeon.pass und die GO-Autorisierung, danach Erstgalerie und korrektes dungeon.ahead für zwei Glas-Käfer. Das bestätigt die in 5a identifizierte Doppelzahlungsursache; *kein* Bugfix wurde zwischen beiden Teiltests vorgenommen.

**Bestätigter Gruppen-Encounter-Bug (Gameplay-Schwerpunkt):**
- Die ersten beiden Glass Beetles sind unterschiedliche Entities mon.glimmerdeep_grotto_c1_l1_e1_1 (A, Level 4, 38 HP) und _2 (B, Level 5, 43 HP), **mit demselben gespeicherten group-Wert** glimmerdeep_grotto_c1_l1_e1, demselben Dungeon-Slot und demselben Raum.
- Spieler greift B mit Flame Lance an. encounter.started enc.t13 umfasst **nur B und PC**; Initiative B > PC. Der erste Angriff kostet 16 MP, macht B 43→9 HP, B beißt PC 80→69 HP.
- A bleibt außerhalb des Combats und schaut trotz gruppenbezogener Wahrnehmung untätig zu. Beim nächsten Basic Attack stirbt B und PC erhält 60 XP; A wird als aware/wary gespeichert, tritt aber nicht dem Encounter bei.
- Erst expliziter Spielerangriff auf A startet **neuen** encounter.started enc.t15 mit A und PC. Ursache im verifizierten Code: engine.js Funktion combatants(s, leadId, committed) übernimmt ausschließlich Attack-Target und explizit angreifende NPCs, ignoriert das bereits vorhandene entity.group. Das ist ein globaler Core-Combat-Fehler, kein Dungeon-only-Problem.
- **Verbindliche Designkorrektur in 02_DESIGN_KANON.md:** Ein Angriff auf ein Mitglied einer gemeinsamen, anwesenden und feindlichen Monstergruppe aktiviert die ebenfalls beteiligten Gruppenmitglieder **im selben Encounter mit eigener Initiative**; nicht automatisch AoE/alle getroffen; nicht wahllos neutrale Nebenstehende oder getrennte/unerreichbare Mitglieder. Gruppenzugehörigkeit über bestehende IDs, keine neue AI-Architektur. Besonders FIRST-STRIKE/Initiative, addCombatant und Trennung von Awareness vs. Aggression regressionstesten.

**Zusätzlich gravierender Narrator-Combat-Truth-Verstoß beim zweiten Angriff:**
- enc.t15 löst Flame Lance auf A auf: **37 Schaden, A von 38 auf 1 HP**, danach schließt A von MEDIUM zu ENGAGED und beißt Alaric für **9 HP (69→60)**. A lebt, aktiver Kampf mit A und PC.
- Der echte Narrator-Prompt enthielt diese exakten Werte und den Hinweis „stop on Alaric's turn“; trotzdem erfand GLM eine tödliche Explosion von A und die Flucht eines angeblichen zweiten Käfers, der tatsächlich im vorherigen Encounter gestorben war. Das ist **kein fehlender Engine-Input** und **kein Schaden-/RNG-Bug**.
- Der letzte nachgeschaltete Extractor-Aufruf endete mit finish_reason=length bei 2500 Completion-Tokens und inhaltlich leerer Antwort; der letzte Export enthält deshalb keine angewendeten Deltas zu dieser falschen Schlussnarration. Sichtbarer Narrator-Verstoß trotzdem bestätigt, Speicherung des erfundenen Todes/Flee **nicht** behaupten.
- Regression gegen Toten-/Lebend-Identität, HP, Combat-Mode und Zahl der Gegner; nicht nachträglich einen weiteren echten Beetle erfinden. Prüfen, ob Engine-Truth direkt in noch robuster, knapper, unmissverständlicher Form als letzte bindende Kampfzusammenfassung in den Narrator-Kontext gelangt und ob eine gezielte Post-Narration-Verletzungsprüfung ohne zusätzliche LLM-Schleifen möglich ist. Keine übereilte vollständige natural-language Wahrheits-Firewall bauen.

**Nebenbefund:** Beim Ersteintritt wurde eine Awareness-Delta für beide Beetles mit group_unclear abgelehnt, weil der angegebene Evidenztext nicht im Wortlaut der Narration stand. Bei tatsächlichem Angriff wurden Awareness später gesetzt; dieser Delta-Fall allein ist **nicht** die Gruppen-Encounter-Ursache. Prüfen, ob er ein gezielter Testfall sein sollte.

**Positive Ergebnisse:** Engine reservierte die Begegnungsgruppe/Slots deterministisch und materialisierte individuelle Level/Profile; Angriff auf B und dessen Tod, XP 60, MP-/HP-Verbrauch sowie anschließender Angriff auf A waren im Engine-Eventverlauf rechnerisch stimmig. Die Engine-Zielreferenzen A/B waren eindeutig. Doch Gruppenkoordination und finale Narrator-Ergebniswiedergabe noch fehlerhaft.

**Historischer Zwischenstand am Ende des .25-Tests, nicht der aktuelle Entwicklungsstand:** Zu diesem Zeitpunkt war Patch 8.1 noch nicht implementiert. Vor neuen langen Runs erst einen **gebündelten Integrationspatch** aus Doppelzahlung/Gate-UX, Dungeon-Quests/Board-Truth, Combat-Gruppenaufnahme und Combat-Narrator-Truth formulieren. Große Aufträge vor Claude Code wie vereinbart optional in zweiter Architektur-Review-Sitzung gegenprüfen. Balancing, zusätzliche Dungeons, komplette NPC-Party-KI und neue Simulation explizit nicht automatisch erweitern.

## 5c. Patch 8.1 implementiert (.26, 21.10.2026) – damaliger Pre-Livetest-Stand

**Entwicklungscommit (GitHub-Branch überprüft):** `c6baa06e159f16069efd728844c7afe7c7dc186a`. **Build 4.3.0-c.6.6.26** in `package.json` und `manifest.json` unabhängig bestätigt. Vorheriger Build .25 auf `f3b5581`. Ausführlicher technischer Bericht: `avereth-engine/docs/PATCH8_1_GATE_GROUP_COMBAT.md`; Regressionen `tests/v4/patch81.test.js`; anonymisierte .25-Fixture `tests/v4/live_1021d.json` (31 Nachrichten).

**Berichtete Tests:** Claude meldet `npm test` **960/960**, davon 29 neue Patch-8.1-Tests, und `smoke:st:c` **19/19** ohne Seitenfehler oder Schlüssel-Exposure. Testläufe von ChatGPT nicht selbst lokal durchgeführt; echte GLM-5.3-Flash-Erprobung des Builds .26 fehlt.

**Im Git-Code verifizierte Implementierung:**

1. **Gate/Payment:** `living.js gateOfferEvents` erzeugt ein kanonisches `offer.gate.*` bei Gate-Ankunft und schließt nicht mehr erforderliche Angebote. `world.js offer` verhindert konkurrierende Story-Eintrittsangebote (`gate_fee`), ohne den Handel mit anderen Waren zu sperren. Bestehendes `dungeon.pass` bleibt autoritativ; keine zweite Pass-Tabelle.
2. **Questbezogene Freistellung:** Glimmerdeep hat `gate.contract_free: true`; bei aktivem zur Glimmerdeep gehörigem offiziellen Cull-/Clear-Auftrag mit `q.dungeon` bzw. `q.clear.dungeon` entfällt die Gebühr. Keine Freistellung allein für beliebige Guild-Mitgliedschaft. Alte vor .26 gebuchte Aufträge ohne strukturierten Dungeonbezug bekommen laut Claude keinen Erlass.
3. **Sichtbares Spielsystem:** `SYSTEM — DUNGEON GATE` aus dem Engine-Fold mit Belegung, Gruppengröße, Resetrestzeit (d/h/min), bekannten Levels/Ranks, Gebühren-/Access-Status und Enter-Hinweis; keine neue Bestätigung. `SYSTEM — GUILD BOARD` zeigt kanonische Listings und Zielzahlen direkt im System-Panel. Lore-Gate-Displays und Glimmerdeep-Monsterloot/freie Kristallressourcen festgelegt.
4. **Zusammenhängende Gruppen-Encounter:** Neues `src/v4/group_combat.js`; `groupJoiners` wird durch `engine.js` für relevante V4-C-Kampfstarts und laufende Eintritte verwendet. Die zwei aktiven Glimmerdeep-Beetles gehen bei Angriff auf B in denselben Encounter, mit individuellen Zügen; Single-Target-Schaden trifft nur das gewählte Ziel. Unaufmerksame Mitglieder werden im Ambush zeitlich verzögert berücksichtigt. Keine neue NPC-Gruppen-KI oder Balanceänderung.
5. **Combat-Truth und Extraktor:** `floorText` berichtet verbleibende lebende, tote und geflohene Einzelwesen statt pauschal zwei stehende Käfer. `context.js stateNow` liefert aktuelle bindende Kampfergebnisse; Einzelmonster-Beschreibungen präzisiert; Extractor-Katalog enthält relevante RECENT DEAD. Bei leerer `finish_reason=length`-Antwort eine andere, kurze Reparaturaufforderung statt Wiederholung derselben Antwort. Der bestehende Zustandsschutz bleibt bestehen.
6. **Cull-Quests und Board-Kanon:** Board-Spezifikation kann Dungeon-Mindestpopulation ohne vorangegangenen Spielerbesuch deterministisch berechnen. Ziele auf den Mindestbestand passender Minion-Slots pro Zyklus begrenzt; Boss zählt nur bei expliziter Benennung. `q.dungeon` und gegebenenfalls `q.floor` werden für neue Listings strukturiert gespeichert. Firewall schützt Board-Vertragsstatus stärker gegen freie falsche Weltfakten.

**Wichtige Grenzen / Code-Risiken für spätere Prüfung (nicht als im Livetest bestätigte Fehler ausgeben):**

- **Friedliche Tiergruppen:** `groupJoiners` lässt bei PC-Angriff auf ein Mitglied einer Kreaturengruppe auch weitere Mitglieder ohne positiv gesetztes Threat-Merkmal einsteigen, sofern sie nicht ausdrücklich `threat:false` sind. Claude benennt selbst das Risiko einer aggressiv reagierenden Rehherde bei fehlender Threat-Kennzeichnung. Ein Test mit korrekt markiertem `threat:false` genügt nicht, diesen Grenzfall zu widerlegen. Beobachten/gezielt testen, keine pauschale Wiedereinführung von Temperament.
- **Gebietsbezug des Cull-Fortschritts:** In `guild.js areaOf()` wird für Dungeongebiete nur `clearOf(s,q)` geprüft, für reguläre neue Cull-Quests mit `q.dungeon` aber weiterhin auf das ganze Herkunfts-Reich ausgewichen. Somit *könnten* passende anderswo besiegte Monster auf eine dungeonbezogene Jagd zählen, obwohl neue strukturierte `q.dungeon`-Daten vorhanden sind. Codebasierter Verdacht, noch kein beobachteter .26-Livetest-Fehler; vor ggf. größerem Patch gezielt testen.
- **Nachträgliche Gruppenmitglieder:** Neue Ankömmlinge im laufenden Encounter brauchen weiterhin eine erzählte Kampfabsicht/Join; keine vollständige dynamische Gruppenreaktion für jeden Neuankömmling.
- **Vorhandene .25-Kampagnen:** Alte Questzahlen (etwa sechs Käfer) bleiben unverändert, kein rückwirkendes Clamping und kein alter Eintrittsgebührenerlass ohne `q.dungeon`.
- **Narrator-Compliance:** Synthetische Tests prüfen Enginekontext und Guards, keine Garantie, dass GLM bei 1 HP keinen Tod erzählt. Das muss ein neuer echter Livetest zeigen.
- **Promptbudget:** Claude meldet etwa +29 bis +40 Narrator-Tokens und bis +67 Extractor-Tokens in den untersuchten Zügen. Der Kontextabschnitt RELEVANT kann bei Kampf unter dem Budget zurückstehen; Mechanik-Wahrheit hat Vorrang.

**Ursprünglicher .26-Testplan (mittlerweile teilweise durchgeführt; Fortschritt siehe 5d):** möglichst frischer GLM-5.3-Flash-Run in Glassmere: Guild-Board lesen (Crystal Beetles idealerweise 2 statt 6), Auftrag annehmen, kostenfreie Berechtigung am Glimmerdeep-Gate prüfen, sichtbare Systemkarte inkl. Rank/Timer/Slots, bewusstes Eintreten ohne Doppelzahlung, Encounter mit Beetle A/B als *einem* Kampf und Single-Target-Mechanik, tatsächliche HP/Narrator-Übereinstimmung, Extractor-Events, Fortgang Richtung Floor-Clear. Separat bei Gelegenheit neutrale Tiergruppe/Stealth, Board-Status, echte Questzählung, Rückkehr und Dungeon-Reset. Analyse erneut mit Event-JSON, Chat-JSONL und Completion-TXT; keine neuen großen Patches vor Auswertung.

## 5d. Laufender .26-GLM-Livetest – bestätigte Verbesserungen und akute Performance-Probleme (21.10.2026)

**Quelle:** vom Nutzer bereitgestellte Chat-/Event-/Completion-Exporte und die bisherige ChatGPT-Auswertung; keine vollständige Abschlussvalidierung des Dungeons. **Nutzergefühl:** Nach Patch 8.1 **spielerisch besser, aber spürbar langsamer**; sogar ein `#assign` wirkte nicht mehr unmittelbar.

**Positive echte .26-Befunde:** Beim Glimmerdeep-Run wurden **drei Glas-Käfer gemeinsam im Encounter `enc.t12`** geführt, später **zwei Mineral Slimes gemeinsam in `enc.t18`**. Der passende offizielle Dungeonauftrag berechtigte zum Eintritt **ohne zweite Gatezahlung**. Kämpfe, Loot/XP und **Level-up auf Level 2** wurden mechanisch verarbeitet. Diese Beobachtungen verbessern die im .25-Test nachgewiesenen Schwächen, garantieren aber noch keinen vollständigen Boss-/Clear-/Reset-Erfolg.

**Kritische Latenzdaten (nicht kontrollierter Vergleich):**

| Messung | Vorherige .25-Exporte | Neuer .26-Livetest |
|---|---:|---:|
| Extractor-Median | ca. 4,0 Sekunden, 9 Aufrufe (weitere .25-Exporte ebenfalls um 4–5 s) | **22,8 Sekunden, 18 Aufrufe** |
| Planner-Median | ca. 2,05 s | ca. 2,21 s |
| Extractor über 20 Sekunden | nicht gleichartig erhoben | **9/18** |
| Einzelzeiten | – | ~48,1 s; ~44,3 s; ~37,6 s; ~34,3 s |
| Completion-Befunde | – | **sechs** Extractor-Responses `finish_reason:length` bei 2500 Tokens; **fünf** abgeschlossene Extraktionen mit Repair; **ein** leerer Narrator-Reply am 4096-Token-Limit |

Diese Werte **belegen eine aktuelle Latenzverschlechterung im Test**, jedoch **noch keine ursächliche Regression allein durch Patch 8.1**. Modell/Provider, Szenenkomplexität, Katalogumfang und Reasoning-/Repair-Verhalten müssen verglichen werden.

**Konkrete `#assign`-Korrelation:** Vorheriger Kampf-Narrator ungefähr 12:31:52, dessen Extractor ~34,27 Sekunden; Nutzer `#assign int 5` ungefähr 12:32:19; Systemkarte ~12:32:27 (~7,5 Sekunden Verzögerung). `avereth-engine/index.js` wartet im Interceptor vor neuem normalen Turn auf **`await pendingWorld.job`**, auch für deterministische #Kommandos. Diese Barriere war **bereits im .25-Code vorhanden**. **Nie einfach entfernen:** `laterTurns()`/Commitreihenfolge könnten den alten Extractor-Weltzustand verlieren.

**Offene Risiken:** Das leere Narrator-Resultat nach Tokenlimit gesondert auswerten; keine Verdoppelung des Tokenslimits ohne Grund. Friedliche Tiergruppen mit fehlender Threat-Kennzeichnung und Cull-Ortsbezug (`q.dungeon`) bleiben zu prüfende codebasierte Risiken; nicht ungeprüft als neue .26-Spielbugs deklarieren.

**Nächste Handlung:** Performance-Review-Prompt (vorläufig „Patch 8.2 – Runtime Performance & Fast System Actions“) an **zweite Claude-Sitzung nur zur kritischen Gegenprüfung** geben. Die Vorlage deckt Messung, Extractor-Reasoning/Repair, sichere schnelle #Kommandos, LLM-Abkürzungen, separaten Caching-A/B-Test und Fold-Profiling ab. **Noch kein Implementierungsauftrag/Commit.**

## 5e. Neue Patchideen und Claude-Gegenreviews – keine Implementierung (21.10.2026)

Das neue **`04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md`** sichert ausführlich die intensive Video-Gameification-Auswertung (**141 Diskussionspunkte, 20 konkrete Kandidaten K01–K20, wiederholte Claude-Gegenreviews und Gegenargumente**), darunter:

- **Engine-only-Guild-Board:** Offizielle Quests weiterhin separater LLM-Generator + Enginevalidierung; nur die redundante Narration reinen `board.read` eliminieren. Volle V4-C-Boardgenerierung/Eventbuchung beibehalten, dann `playerTurnV4`-Panelroute; Mischturns brauchen Narrator.
- **Engine-only Rest/Sleep/Wait/Fast-Travel:** Restdauer, Zeit und HP/MP/STA-Regeneration sind bereits Engine-owned, *nicht* das Risiko einer langen Rast. Sichere Orte könnten Panel-only funktionieren; wildes Gebiet/System-Dungeon benötigt zuerst eine echte Unterbrechungsregel. Bekannte sichere Rückwege zusammenfassen; unbekannte gefährliche Reise nicht als Gratis-Teleport.
- **Zufallsereignisse/Pacing:** `commands.js roadLine()` besitzt bereits einen Hashwurf, der auf Reiseetappen nur eine mögliche Story-Unterbrechung gestattet. **Kein orts-/dauerabhängiger Encounter-Wurf beim Rest**, keine allgemein steigende Wahrscheinlichkeit nach langer ereignisloser Zeit. Nutzer berichtet stundenlang ungestörten Dungeon-Rest; gewünschter künftiger Prüffall, **noch nicht beschlossen/implementiert**.
- **ROAD AHEAD:** Engine verankert gewöhnliche Reise-Gegner/Funde/Hindernisse vor Narration; Narrator erfindet keine abweichenden mechanischen Populationen. Hashseed um konkrete Reiseinstanz ergänzen, nächste Etappe statt gesamte Route; Fundentdeckung ist keine automatische Sammlung.
- **Quest-Erweiterbarkeit:** `GO/FIND/TALK/GET/GATHER/GIVE/DELIVER/USE/REPAIR/DEFEND/ESCORT/ATTACK/DEFEAT`-Bausteine; weitere E-/D-Aufträge sollen kreative Story und allgemein prüfbare Pflicht-/Optional-/Alternativziele verbinden; nicht jeden höheren Rang neu festprogrammieren.
- **SillyTavern Quick Replies:** optionale Buttons/Kommandos als Interface **zur selben Engine-Autorität**; freie Texteingabe bleibt. Keine neuen UI-Knöpfe als Ersatz für Performance-Fixes.
- **Ausführungsprofile:** nur wenn benötigt `full/panel` aus tatsächlich autorisierten Aktionen ableiten, **nicht persistent `turn.mode` speichern**; `combat_lite` nur A/B-Experiment.
- **Patch 9 Organic Growth** bleibt geplantes Kernsystem. Der frühere Klassen-Katalogpunkt F1/#71 wird **ausdrücklich ignoriert**; derzeitige fünf Basisklassen nicht heimlich ersetzen.
- **Reihenfolge:** Patch 9 vs. ROAD AHEAD nach realem Reise-/Suchverhalten im .26-Run entscheiden; Performance-Review und kleinere QoL-Kandidaten zunächst getrennt.

## 6. Fortgesetzter .26-GLM-Dungeonlauf – verbleibende Testziele

**Keinen automatischen weiteren Dungeon-Hotfix starten.** Der .26-Live-Run ist bereits begonnen und teilweise ausgewertet worden (Abschnitt 5d). Den vorhandenen Run mit Exporten weiter analysieren; .25 als historische Regression heranziehen und von einem kontrollierten Performance-A/B-Test getrennt halten. Sinnvolle Testreihenfolge:

1. **Ursprünglicher Testplan – teilweise bereits erfolgt:** Build .26 im Engine-Panel kontrollieren; Startstadt und Guild-Beitritt prüfen. Eine neue Kampagne ist wichtig: Der alte .24-Black-Corridor wird nicht rückwirkend auf Level 2 korrigiert.
2. **Glimmerdeep als zusammenhängender F-Rank-Run** (wenn die Startstadt Glassmere ist): Gate + Registrierung + Auftrag als gebührenfreie Berechtigung (ohne passenden Auftrag ggf. einmalige ausdrückliche 10-cp-Zustimmung), wenige ruhige Schritte, Kristallkäfer/Schleim, Boss, Clear, Loot/Ressourcen, Rückweg. Bei anderem Startort den dortigen Seed-Dungeon statt Ortswechsel erzwingen.
3. **Old Crown als gezielter zweiter Run oder eigener neuer Chat** (wenn Alderwatch): Kapelle/Gate, Skelettslots, Gallery Warden, Level-1-Clear/Siegel und Abstieg. Ebene 2 ist E und darf für schwache PCs riskant sein; kein Spieler-Scaling fordern.
4. **Begleitetes Quest-Pacing außerhalb des Dungeons:** Wenn in diesem Run erreichbar, eine kurze Escort-/Delivery-/Culling-Reise mit klarer Spielerabsicht durchführen.
5. **Optionaler Reset-/Wiederbesuchstest** per legitimer Weltzeit-Rast (3 Tage); prüfen, ob neue Zyklusbegegnungen und andere Abenteurer den Zustand glaubwürdig beeinflussen.

Auf folgende Fälle besonders achten:
- Der Narrator bringt **das angekündigte Engine-Monster in derselben Antwort**. Nicht erst eine Engine-Korrektur im nächsten Zug.
- Extractor verwendet dieselbe Slot-Identität; keine Doppelmonster, falschen Namen/Levels oder Phantomgegner.
- Keine bedeutungslosen „I continue deeper“-Schleifen, auch nicht durch ein einziges künstliches „quiet part“ zwischen jeder Begegnung.
- Spieler behält die Entscheidung bei neuen Gefahren, Abzweigungen oder Zielen.
- Etagen-/Raumgraph und Quest-Credit stimmen; kein Clear trotz lebendem Pflichtgegner, kein unverdientes Credit aus NPC-Kills.
- HUD kennt nur den tatsächlich sichtbar werdenden Fortschritt.
- Nach längerem Zeitverlauf Reset/andere Gruppen korrekt, ohne alte Slot-Rollen aus falschen Zyklen.

**Exporte für Analyse:** SillyTavern-Chat als JSONL, Avereth-Events als JSON und vollständiger Chat-Completion-/Planner-/Extractor-Log als TXT. Nur Dateien des aktuellen Runs nötig. Im Review **genau die realen Ereignisse** von Story-Bugs, bestätigten Mechanikfehlern und bloßen Stilfragen unterscheiden. Nicht ungefragt automatisch Balance ändern.

**Zusätzliche technische Prüfidee (noch kein bestätigter Fehler):** Lange Weltzeit-Sprünge über mehrere Resetintervalle auf korrekte chronologische Gruppenevents prüfen. Im Code wird ein langer Zeitabschnitt über Reset- und Gruppenfunktionen verarbeitet; der normale Ein-Zyklus-Test garantiert nicht jeden Langzeitsprung. Nur priorisieren, wenn relevant oder reproduziert.

## 7. Danach – Roadmap und bewusste Grenzen (Status in 5d/5e beachten)

- **Jetzt:** Patch 8.1 (.26) ist in Git verifiziert und der GLM-Livetest wurde fortgesetzt. Mechanikverbesserungen sowie massive Extractor-Verzögerungen dokumentiert; zuerst unabhängiges Claude-Review des **vorläufigen** Performance-Patches 8.2 und kontrollierte Ursachenanalyse.
- **Bei Bedarf:** Nach .26-Livetest und Review bestätigte Integrations- und Latenzprobleme gezielt beheben; keine vorschnelle Minifix-Schleife, keine globalen Balance-/XP-Änderungen.
- **Patch 9 (verbindlich geplant, Implementierung ausstehend):** Organic Classes/Growth anhand tatsächlichen Spielerhandelns einschließlich sinnvoller Skill-Bausteine und besonderer Entwicklungsmomente. **Keine** Änderung der Standard-Basisklassen aus dem verworfenen Katalogpunkt F1/#71 ableiten.
- **Patch 10B / späteres Polish:** HUD/Defense-/Utility-Skills, allgemeines Balancing/Scaling; Focused-Ward-Plus-Move bleibt bekannte separate Aufgabe. Exakter Umfang noch offen.
- **Engine Actions & QoL (KANDIDAT):** Engine-only-Gildenboard, Rest/Wait in sicherer Umgebung, bekannte Wege, direkte Systemkarten und optionale Quick Replies; Umfang noch nicht freigegeben. **ROAD AHEAD (KANDIDAT):** vorverankerte Reisebegegnungen und Suche, ggf. vor Patch 9 nur bei bestätigtem Bedarf.
- **Langfristig:** möglicher CraftRPG-Port, derzeit keine aktive Umstellung.

**Unveränderliche Designpräferenzen:** Player Agency, Quality of Life, bedeutungsvolle Entscheidungen und ein echtes Spiel vor Simulationsrealismus; keine Traglastverwaltung, keine Trophäen-Zwangsbeweise, keine bedeutungslosen Zwischenstopps, kein Level-Scaling an Alaric, kein unbegründetes XP-Farm-Nerf. Living Dungeons sind geteilte Weltorte, keine privaten Instanzen. Der Narrator bleibt kreativ, aber die Engine entscheidet Mechanik.

## 8. Wichtigste aktuelle Dateien

- **04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md** (Repository-Root auf `main`) – 141er-Katalog, K01–K20, Claude-Gegenreviews, Patch-8.2-Review, noch nicht beschlossene QoL-/ROAD-AHEAD-/Organic-Growth-Ideen.

- avereth-engine/docs/PATCH8_1_GATE_GROUP_COMBAT.md – aktueller Patch-8.1-Implementierungs- und Reviewbericht.
- avereth-engine/src/v4/group_combat.js – Gruppenbeitritt zu Combat-Encountern (V4-C).
- avereth-engine/tests/v4/patch81.test.js; live_1021d.json – .26-Regressionstests und anonymisierte .25-Live-Fixture.
- avereth-engine/docs/PATCH8_LIVING_DUNGEONS.md – Implementierungs- und Reviewbericht Patch 8.
- avereth-engine/src/v4/living.js – Dungeonstruktur, Slots, Bosse, NPC-Gruppen, Gate, Reset, Ressourcen, Return Stone.
- avereth-engine/src/v4/dungeon.js – Räume, Wege, Ebenen, Rank.
- avereth-engine/src/v4/commands.js – GO, Gateprüfung, DUNGEON AHEAD, Pacing.
- avereth-engine/src/v4/world.js – Extractor-Ankunft, Slot-Zuordnung, Wegtreue, World-Applier.
- avereth-engine/src/v4/guild.js – Board, Cull und Dungeon-Clear, Zurechnung/Turn-in.
- avereth-engine/src/v4/domain.js; src/state.js – Events und Fold.
- avereth-engine/tests/v4/patch8.test.js; patch8_lib.js; live_1021c.json – Regressionstests, Testhelfer und .24-Fixture.
- avereth-engine/docs/PROTOTYPE_C.md – Entwicklungshistorie, insbesondere Patch 7–7.2.
- avereth-engine/docs/ARCHITEKTUR.md – grundlegende Architektur und Strangler-Regel.
- avereth-engine/content/lore.json; content/monsters.json; content/rules.json – Welt-/Monster-/Dungeonparameter.
- avereth-engine/package.json – aktuelle Version.

## 9. Übergabe an den nächsten Chat (vier Projektdateien)

1. Dateien **01–04** **vom Branch main** vollständig lesen (`04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md` ist das Review-/Katalogarchiv). Den tatsächlichen Entwicklungsbranch und Build unabhängig per Git prüfen.
2. **Aktueller Code ist Patch 8.1 (.26), `c6baa06`**, nicht Patch 8 (.25). Ein echter .26-GLM-Dungeonlauf wurde bereits teilweise ausgewertet; vollständiger Boss/Clear/Reset-Nachweis steht aus.
3. Die .25-Livetest-Befunde in 5a/5b führten zu Patch 8.1 (.26, Abschnitt 5c). **Neuen .26-Befund in 5d lesen:** Gruppencombat besser, Extractor auffällig langsam, deterministisches `#assign` blockiert. Performance-Patch 8.2 **nur Reviewentwurf**, noch nicht implementieren.
4. Bei Live-Exports zuerst Engine-Events, Chat-JSONL und LLM-TXT korrelieren; Gameplay- und Designregeln der Dateien 01/02 berücksichtigen.
5. **Datei 04** enthält die 141-Ideen-Zusammenfassung, 20 ausgewählten K-Kandidaten, Claude-Gegenreviews, Engine-only-Board, Rest/Wait/Fast-Travel/Quick Replies und die offene Patch-9-/ROAD-AHEAD-Reihenfolge. Keine Ideen ohne Nutzerfreigabe in den bindenden Kanon oder die Implementierung übernehmen.
6. Nach neuen Meilensteinen nur betroffene Projektdateien auf `main` aktualisieren; Implementierungsbranch nicht für Dokumentationspflege mergen.

**Letzter dokumentierter Git-Stand ist ein überprüfter Zeitpunkt, kein dauerhaft garantierter HEAD.**