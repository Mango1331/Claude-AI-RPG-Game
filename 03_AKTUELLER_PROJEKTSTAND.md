# Avereth Engine — Aktueller Projektstand und nächste Übergabe

**Dokumenttyp:** zeitabhängiger technischer Hand-off  
**Stichtag:** 22. Oktober 2026 · Fassung 10 (unabhängiges Claude-Gegenreview des .28-Laufs kritisch gegen Source bestätigt; fokussierte Combat-/Cull-Entscheidung; keine neue Implementierung)  
**Pflege:** Nach großen Patches und wichtigen Reviews/Livetests aktualisieren. **Zu Beginn jedes neuen Chats den Git-HEAD neu prüfen.**  
**Quellenrangfolge:** aktueller Code/Commit für implementierte Mechanik; dokumentierter Design-Kanon für Ziele; Claude-Berichte für nicht unabhängig ausgeführte Tests; Livetest-Events/LLM-Logs für reales Gameplay.

## 1. Git, Version und Nachweisstatus

| Feld | Stand |
|---|---|
| ChatGPT-Projekt | RPG Engine |
| Produkt | Avereth Engine – Fantasy-Sandbox-RPG als SillyTavern-Extension |
| GitHub | https://github.com/Mango1331/Claude-AI-RPG-Game |
| **Produkt-/Entwicklungsbranch** | claude/c-planner-prototype-2026-10-02-gpt-c666 |
| **HEAD am 22.10.2026 unabhängig über GitHub geprüft** | 70cbb5e4ec77ea1ad9fe24fc46b86c2c42cb12ed |
| **Build direkt aus package.json und manifest.json geprüft** | 4.3.0-c.6.6.28 |
| **Maßgeblicher Produktpfad** | V4-C, semantischer Planner; V3/V4-A als Legacy |
| **Patchstatus** | **Patch 8.3 (.28) implementiert und gepusht:** Dungeon-Root als Gate (Ebene 0), erste Ebene korrekt; auf tatsächlicher Zykluspopulation beruhende Culls, räumlich korrekter Kill-Credit, klare Cull-/Clear-Semantik, Quest-Kontext. **Quelle:** Git-Commit und Source-Review. Voller .28-GLM-Livetest weiterhin offen. |
| **Nächster Schritt** | **Nach dem ersten .28-GLM-Glimmerdeep-Livetest** zunächst wiederholte Einzel-Ambushes trotz vier sichtbarer Gruppenmitglieder sowie widersprüchliche Anzeige „(4)“/„at least six“ gezielt unabhängig gegen Combat-/Guild-Code reviewen (§5j), ohne XP-/Damage-Nerf oder Großumbau. Danach realen Floor-Clear/Guardian/Boss und Siegelweg durchtesten. A0/A/C und Narrator-Cache-A/B bleiben separat ausstehend. |
| Dokumentationsbranch | main – vier maßgebliche Projektdateien 01–04 und separate Datei 05 zur Branch-Historie; von Entwicklungsbranch getrennt |

Aktueller Implementierungscommit: https://github.com/Mango1331/Claude-AI-RPG-Game/commit/70cbb5e4ec77ea1ad9fe24fc46b86c2c42cb12ed  
Vorheriger Patch-8.1-Commit: https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c6baa06e159f16069efd728844c7afe7c7dc186a  
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

**Nachtrag zum Performance-Review:** Zwei unabhängige Claude-Rückmeldungen liegen inzwischen vor. Die Extractor-Prompts stiegen laut Vergleich nur um ~1,6 %, Laufzeitzuwachs beruht primär auf langen Reasoning-Ausgaben; Ursache der Modell-/Provider-Verhaltensänderung bleibt offen. **Vorläufig konsentiert:** 8.2a nur Telemetrie, kompatible `v4Llm/ask`-Metadaten-Rückgabe, Latenzprofiling und keine Extraktion leerer Narrator-Antworten (reale Nachricht 36: leere Antwort, 17,6 s Extractor, 0 Deltas). Danach Benchmark **A0 (Reasoning-Parameter fehlt), A (`low`), C (`low` + knappe Promptanweisung)**, echte Requests und Engine-Endzustände vergleichen. `low` ist kleinste dokumentierte GLM-5.3-Flash-Stufe; A0=A beweist noch keine Ignorierung des Parameters durch Provider. Keine rollenbezogenen Request-Extras, kein `#assign`-Fast-Path, Board-/QoL-Änderung oder Promptdefault in 8.2a. **Review fertig, 8.2a noch nicht beauftragt oder implementiert.** Details Datei 04, Abschnitte 9/10.

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

## 5f. Patch 8.2 implementiert (.27, 21.10.2026) – neuer technischer Iststand

**Entwicklungsbranch/Commit:** `claude/c-planner-prototype-2026-10-02-gpt-c666` auf `ef4a819d5b1be76b4229745268172d0da5ce5dd5` (genau ein Commit nach `c6baa06`). **Build 4.3.0-c.6.6.27** in `package.json` und `manifest.json` unabhängig geprüft. Neue Docs `avereth-engine/docs/PATCH8_2_LLM_PERFORMANCE.md`, Tests `tests/v4/patch82.test.js`, anonymisierte .26-Fixture `tests/v4/live_1021e.json`, Benchmark `tools/bench_extract.mjs`.

**Codebasierter Independent Review (ChatGPT):** `src/v4/runtime.js` normalisiert String-/Objektantworten in `ask()`; Provider-`finish_reason`/`usage` werden optional als technische `llm[]`-Records in `plan`, `interp`, `board`, `extraction` gespeichert. `index.js` ergänzt Narrator-Zeit und die Wartezeit auf `pendingWorld.job`; `host.js` instrumentiert `foldChat`. Die Engine belässt ursprüngliche Mechanik-Events und die Sperre unverändert.

**Konkreter Stabilitätsfix:** `processReplyAny()` behandelt leere/blanke Narrator-Nachricht als `extraction.status='skipped'`, zeigt `NO STORY TEXT`, startet keinen Extractor und erhält bereits gebuchte Kampfergebnisse. Test auf .26-Nachricht 36 und Swipe/Regenerate vorhanden. Sonderfall „Host erzeugt gar keine Assistant-Nachricht“ bleibt Host-Fehlerweg, nicht als vom Code vollständig getestet behaupten.

**Testberichte von Claude, nicht unabhängig von ChatGPT ausgeführt:** `npm test` **975/975**, darunter 15 neue Tests, `smoke:st:c` mit SillyTavern 1.19.0 erfolgreich im finalen Stand. Ein erster Smoke-Ausreißer in ST-Status-Check, bei Basis und erneutem Patch-Lauf nicht reproduziert. Code/Tests über Git überprüft. **Zum Zeitpunkt des .27-Commits noch kein echter GLM-Spiel- oder A0/A/C-Providerlauf; erster kurzer .27-Spieltest inzwischen erfolgt (Abschnitt 5g), Benchmark bleibt ausstehend.**

**Benchmark-Umfang:** Trockenlauf mit 17 von 18 .26-Extractor-Anfragen zuordenbar, Promptnachbau für jene laut Claude byte-gleich; die 18. Extraktion betraf die leere Narrator-Nachricht, die Patch 8.2 künftig vermeidet. Die Varianten A0 (ohne `reasoning_effort`), A (bestehendes `low`) und C (`low` plus knappe Anweisung) werden alternierend geprüft. Es sind 153 echte Requests bei 3 Runden/17 Fällen (~1,3 Mio. Prompttokens), daher erst kleine `--only`-Auswahl.

**Konkreter Code-Review-Hinweis vor kostenpflichtigem Benchmark:** `tools/bench_extract.mjs worldSummary()` vergleicht eine **verkürzte Projektion**, keinen vollständigen Engine-Zustand. Nicht in der Vergleichsprojektion sind u. a. PC-Inventar/Charakterwerte, Mengen und Attribute von Objekten, konkrete Entity-Stats, Questdetails, Inhalt von Erinnerungen, Relations/Claims/Knowledge, Inhalte von Locations/Links. Auch `facts` berücksichtigt nur einen Teil der Felder. Deshalb kann `identical_world` gleiche Summaries trotz relevanter Divergenzen anzeigen. **Nicht automatisch Gameplay-Blocker** und `.27` kann live gespielt werden; **vor Leistungsentscheidung aus dem A0/A/C-Benchmark** Vergleich um jene Weltfelder erweitern, die der Extractor legitim ändern kann, oder als stichprobenartige manuelle Prüfung ergänzen. Nicht unnötig komplette State-Objekte einschließlich RNG/Telemetrie vergleichen.

**Weiterhin offen:** Schwankendes GLM-Reasoning; `low` wird möglicherweise providerseitig anders interpretiert. `#assign` wartet weiterhin an Extraktorbarriere; kein genereller Fast-Path, Engine-only-Board, REST-/Reiseevent-Wurf, ROAD AHEAD, Patch 9 oder neue Default-Promptoptimierung. Kein Commit-History-Forcepush nur wegen kosmetischer Commit-Nachricht.

## 5g. Erster echter .27-GLM-Livetest – Alderwatch / Old Crown (22.10.2026)

**Dateiquellen:** Nutzerexport `Avereth Engine Test v4 - 2026-10-22@02h00m38s865ms.jsonl` (Chat-/technische Records), `avereth-events-Avereth Engine Test v4 - 2026-10-22@02h00m38s865ms.json` (Engine-Events), `Chat Completion request {(20261022-003100).txt` (24 echte Provider-Anfragen/Antworten). **Bestätigt:** alle gespeicherten Kampagnen- und Turn-Records laufen unter `4.3.0-c.6.6.27`, Runtime V4-C, GLM-5.3-Flash. Test umfasst Klassenwahl Mage, Guild-Registrierung, Novice Board (fünf Listings), Annahme „Skeletons in the Burial Galleries“, Reise zum Old-Crown-Eingang, einen verweigerten Abstieg über eine eingestürzte Treppe und `#audit`. **Kein Boss/Floor-Clear, kein Gruppencombat, kein Reset**, kein leerer Narrator und kein getesteter Barrier-`wait_ms`-Fall.

**Echte `.27`-Telemetrie:** 7 Planner-Primärversuche, 2 Planner-Reparaturen (beide bei `finish_reason=length`/900 Completion-Token und leerem Inhalt), ein Board-Generator, 7 Narrator-Responses und 7 Extractor-Aufrufe = **24 Requests**. Planner-Zugdauer Median **3,74 s** (inkl. Reparaturen: 29,98 s und 11,82 s); Board **16,01 s**; Extractor **Median 4,87 s**, Spanne 2,02–9,43 s, keine Reparaturen und kein `finish_reason=length`. Narrator-Dauer gemäß `narration.ms` **Median 17,85 s**, mit massiven Ausreißern **87,46 s** und **94,41 s**; dieses Host-Zeitfenster beweist keine reine Provider-Rechenzeit. Der Extractor verhält sich in diesem kleinen Run schneller als im .26-Problemrun (damals Median 22,8 s), **das beweist keine Kausalität des Diagnose-Patches 8.2**. Allgemeines Performanceproblem besteht durch Narrator- und gelegentliche Planner-Stalls fort.

**BESTÄTIGTER STRUKTURBUG, hohe Priorität:** Beim Narrator-Extractor des Old-Crown-Eingangs entsteht `place.created` mit `name:"Old Crown Catacombs, level 1"`, aber `level:2`. Der gemeldete `passage` geht mit `dir:"down"` vom Dungeon-Root zu diesem Raum; `src/v4/dungeon.js levelVia()` nimmt am Root standardmäßig Basis-Level 1 und addiert eins. Die Living-Dungeon-Engine behandelt den Root jedoch ausdrücklich als Gate/Level **0** (`src/v4/living.js floorAt()`). Das gespeicherte falsche `level:2` kann bei späterem Eintritt die **E-Rank-Level-2-Slots** statt der vorgesehenen F-Rank-Skelette von Level 1 aktivieren. Vor Dungeon-Fortsetzung gezielter Fix plus Tests für Gate → Floor 1 → Floor 2, Richtungs-/Sealsicherung, Alt-Kampagne/Replay/Swipe, keine globale Hierarchie-Änderung ohne Analyse. Der vorliegende Live-Lauf erreicht den falsch nummerierten Raum nicht; falscher Kampf **noch nicht live beobachtet**.

**ZWEITER BESTÄTIGTER KONSISTENZFEHLER beim Board:** Das Listing „Skeletons in the Burial Galleries“ hat `DEFEAT restless skeletons qty:3` und `quest.dungeon=loc.old_crown_catacombs`/`quest.floor=1`, gleichzeitig verspricht `desired_end_state` einen **vollständig geräumten Level 1** und die Wiederaufnahme der Arbeit der Tempelwächter. `quest.clear` fehlt; `clearTarget()` erkennt absichtlich keine numerische `DEFEAT qty>1` als Floor-Clear. Im festgelegten Dungeon-Zyklus existieren auf Level 1 mindestens **zwei plus zwei Minions und ein Guardian**. Der Auftrag kommuniziert daher zwei verschiedene Erfolgskriterien (3 Kills vs. voller Etagen-Clear). Fix bei Board-Validierung/Vertragsklassifikation ansetzen: echte Floor-Clear-Quests ohne Zahl und mit `quest.clear`; reine numerische Culls ohne falsches Versprechen eines vollständigen Clears. Kein willkürliches Quest-Nerfing.

**Narrator und Pacing:** Ankunft, Registrierung (20 cp, 50→30), Board (fünf kanonische Angebote), Quest-Annahme und Reisezeit (120 Minuten Fußweg) wurden deterministisch korrekt gebucht. Die Treppe ist als echte `feat.1` auf dem Link `link.1` registriert; `*i enter it*` erhielt `cmd.resolved status=refused reason=blocked`, also **kein unerlaubtes Durchqueren im Spielzustand**. Der Narrator beschrieb dennoch einige Schritte den Abstieg hinunter, obwohl die Engine-Aktion als BLOCKED/NOT DONE galt – eine kleine, aber konkrete **Prosa-gegen-Engine-/Player-Agency-Abweichung**. Unnötige Wiederholung des Hindernisses statt Fortschritt aus Nutzersicht beobachten; die Hindernismechanik an sich ist korrekt. Die Clerk-Narration „wardens confirm the work“ kann wie ein zusätzliches Pflicht-Sign-off klingen, obwohl `proof:[]` und Slip-Status statt lokaler Bestätigung maßgeblich sind; bisher keine mechanische Forderung entstanden.

**Codebasierter zusätzlicher Risikopunkt (hier noch kein falsch gebuchter Kill):** `guild.js areaOf()` nutzt ohne `quest.clear` die Branch-Region statt `q.dungeon`/`q.floor`, obwohl dieser Auftrag diese IDs trägt. Ein gleichartiger Kill außerhalb des Ziel-Dungeons könnte dadurch unzutreffend Fortschritt geben; beim gezielten Questfix mit Regressionstest absichern.

**Folgeentscheidung:** Einen **engen Patch 8.3 Dungeon-Etagenidentität + eindeutiger Dungeon-Gildenvertrag** vor dem längeren Old-Crown-Livetest prüfen; Narrator-Wahrheit als gezielten Regressionstest, kein Großumbau, keine allgemeine Balancekorrektur. Separat echte Narrator-/Planner-Providerlatenz analysieren; Benchmark-Judge weiterhin vor A0/A/C absichern. Patch 9/ROAD AHEAD nicht aus diesem kurzen, kampflosen Run ableiten.

## 5h. Unabhängiger .27-Gegenreview von Claude – wichtige Verschärfungen (22.10.2026)

**Quelle:** vom Nutzer am 22.10.2026 vorgelegter unabhängiger Claude-Review (13.329? Zeichen; textbasierter Review der drei Originalexporte gegen den tatsächlichen Code) und anschließende kritische Git-/Log-Prüfung durch ChatGPT. Der Bericht ist ein **Review**, **kein implementierter Patch**. Es wurden keine Änderungen am Entwicklungsbranch vorgenommen.

**P0 – Dungeon-Sackgasse statt bloß falscher Gegner:** `src/v4/dungeon.js levelVia()` zählt den Root als Ebene 1, während `src/v4/living.js floorAt()` den Dungeon-Root als Gate/Level 0 betrachtet. Der vom Narrator benannte Floor-1-Raum bekommt `level:2`. Ein Abstieg nach Level 2 wird bei den Old Crown Catacombs durch das Level-1-Siegel verweigert, bis dessen Guardian gefallen ist; dessen Ebene ist auf diesem Weg nicht erreichbar. Ein offener Dungeon ohne Siegel könnte direkt Level-2-/E-Rank-Gegner vor den Level-1-PC stellen. Fix **nur für echte Dungeon-Roots** prüfen, bestehende Nicht-Dungeon-Raumsemantik bewahren. Tests: Gate→erste Ebene per Treppe, Gate→erste Ebene seitlich, Ebene 1→2, Rückweg, Siegel, Encounter/Floor-Credit, Replay/Swipe.

**P0 – tatsächlich unerreichbare Cull-Zahl im Seed:** Die `cullNumbers()`-Obergrenze in `guild.js` verwendet `dungeonCull() → cullPopulation()` und zählt die **möglichen Spezies der Slot-Spezifikation** und deren garantierte Mindestanzahl. Die spätere `defeatTally()`-Zählung matcht dagegen die **tatsächlich gezogenen und besiegten Spezies** über `namesKind()` (dazu Scope/Role). Die Live-Instanz von Old Crown, Ebene 1, enthält 2 `risen bones`, 2 `restless skeleton`, einen `armoured skeleton` als Guardian; die `DEFEAT restless skeletons qty:3`-Quest kann normal nur **2** passende Minions zählen. Das ist unabhängig vom Etagenbug. **Eine gemeinsame semantische Treffer-/Scope-Regel für erreichbare Population und tatsächlichen Kill-Credit verwenden** (bevorzugt an der deterministisch gezogenen Population, nicht bloß Variantenpool; auch Reset-Lebensdauer und Nicht-Dungeon-Culls beachten). Keine pauschale Gleichsetzung aller Skelette oder von Bossen mit Culls, keine freien Kills aus anderen Orten. Die Engine behandelt die numerische Quest als Cull ohne `quest.clear`, obwohl `desired_end_state` eine vollständig geräumte Ebene verspricht: Generator-/Validator-Text auf **eindeutige Cull-oder-Clear-Semantik** abstimmen, ohne die Aufgabe ungefragt zur Floor-Clear-Quest umzudeuten.

**Bestätigte Quest-Prompt-Ursachen, enger Fix:** `src/context.js:396` formuliert bei aktiven Gildenquests **`locals confirm, never pay`**, was beim Narrator eine vermeintliche lokale Bestätigungspflicht auslösen kann; bei echten Monster-Culls mit `proof:[]` ist das falsch. Der generische `QUEST PLAY`-Satz in `src/context.js` fordert wenigstens eine relevante Komplikation im Verlauf einer aktiven Quest. Im Livetest entstand darauf folgend die Warnung vor dem beschädigten **unteren** Treppenabschnitt, die Erzählung legte sie anschließend auf den einzigen Eingang und der Extractor erstellte das echte Hindernis `feat.1`. **Kausale Zuschreibung ist plausibel, nicht abschließend experimentell bewiesen.** Für strukturierte Living Dungeons bereits durch Monster-/Guardian-/Siegelmechanik gegebene Friktion anerkennen; **keine erzwungenen Extra-Hürden vor den Dungeon**, aber natürlich begründete Weltgefahren nicht grundsätzlich verbieten.

**Präzisierung zur BLOCKED-Prosa:** `GO` bleibt im Engine-Record `refused/blocked`; kein Durchqueren. Die Narration beschreibt Bewegung auf den sicheren oberen Stufen bis zum Einsturz, ohne gebuchte neue Raumposition. Das ist **kein gesicherter mechanischer Zustandsfehler**. Aus Produktsicht an Hindernis herankommen/ihn beschreiben erlauben, aber **keinen Übergang darüber hinaus und keine gebuchten Wirkungen**; genaue Engine-Wortwahl und Interpretation bei Bedarf enger testen, nicht jeden Schritt bis zur Sperre pauschal verbieten. Niedrigere Priorität.

**Neue Performance-Erkenntnis: Narrator-Prompt-Cache.** Tatsächliches Server-Log enthält 7 Narrator-Requests; **5/7 melden 0 gecachte Prompttokens**. Direkter paarweiser Vergleich im Request-Log zeigt in allen 6 aufeinanderfolgenden Paaren die erste Textabweichung bei etwa Zeichen **2699–2700** der protokollierten Anfrage: die variierenden Lorebook-Einträge werden früh vor dem langen Narrator-Vertrag eingefügt. Der lange danach folgende Vertrags-/Verlaufsteil besitzt dadurch keinen stabilen Gesamtpräfix; diese Anordnung ist ein plausibler wesentlicher Cache-Treiber, aber **die genaue Zeitersparnis ist nicht belegt**. Getrennt von Patch 8.3 die Lorebook-Platzierung im SillyTavern-Profil kontrolliert A/B testen; nur bei wirklich stabilerer Präfixfolge, höherer Cache-Quote und unverändertem Lore-/Canon-Verhalten übernehmen. Nicht ungeprüft alle Lore-Einträge dauerhaft oder die Promptgewichtung ändern. Auch für die zwei Planner-`length`-Reparaturen den Planner vergleichbar benchmarken, **900er Tokenlimit nicht vorschnell absenken**; die Latenzwerte sind Wall-Time inklusive Netzwerk/Host, keine echte Provider-TTFT-Analyse.

**Empfohlene Reihenfolge:** (1) enger Patch 8.3 zu Etagenidentität, einer Zähl-/Scope-Regel und klarer Quest-Kommunikation, (2) gezielter Replay/Regenerate-Test bzw. frischer Dungeon-Run bis Floor-Clear, (3) separate Cache-/Planner-/Extractor-Leistungsversuche. Regenerate des alten .27-Chats kann nur nach Prüfung der korrekten Eventrücknahme als Reparaturweg gelten; ein bereits persistierter Raum mit `level:2` korrigiert sich nicht automatisch durch bloßen Codewechsel.

## 5i. Patch 8.3 wirklich umgesetzt – unabhängiger Git-Code-Review (22.10.2026)

**Entwicklungsbranch/Commit:** `claude/c-planner-prototype-2026-10-02-gpt-c666`, `70cbb5e4ec77ea1ad9fe24fc46b86c2c42cb12ed` (**genau ein Commit nach `ef4a819`**); Build `4.3.0-c.6.6.28` in `package.json` und `manifest.json` unabhängig per GitHub geprüft. Produktpfad bleibt V4-C. 15 Dateien im Diff, darunter `src/v4/{dungeon,living,guild,commands}.js`, `src/context.js`, `tests/v4/patch83.test.js`, `tests/v4/live_1022a.json` und `docs/PATCH8_3_DUNGEON_FLOORS_CULLS.md`.

**Codebasiert bestätigt:**
- `levelVia()` gibt beim Eintritt von einem **echten Dungeon-Root** nun Level 1 zurück, unabhängig von `down`/seitlichem Eingang; danach bestimmt die Richtungslogik Level 1→2. Gewöhnliche Nicht-Dungeon-Gebäude behalten ihre bisherige Etagenlogik. Für den alten .27-Spielstand werden bereits gespeicherte `place.created … level:2`-Events nicht überschrieben.
- `runNow()` in `living.js` ermittelt den zur Weltzeit relevanten deterministischen Dungeon-Zyklus **ohne neue Zustandsereignisse**. `cullPopulation()` arbeitet mit gezogenen Slot-Individuen; `cullKind()` ist gemeinsame Art-/Guardian-Regel für Boardobergrenze und `defeatTally()`. Der konkrete Old-Crown-Zyklus verlangt damit **2 statt 3** `restless skeletons`; `risen bones` und der Gallery Warden zählen für diese Art nicht. `areaOf()` begrenzt numerische Dungeon-Culls auf `q.dungeon` und `q.floor` statt auf das ganze Reich.
- Numerischer Dungeon-Cull erhält nach der Buchung einen auf Zahl statt „Etage cleared“ bezogenen `desired_end_state`; echte `quest.clear`-Verträge ohne Killzahl behalten die Floor-Clear-Prüfung. Board-Generator `board-4.7`; `src/context.js` entfernt `locals confirm` und präzisiert QUEST PLAY bei strukturierten Living Dungeons. `commands.js` erläutert korrektes Herantreten bis zu einer BLOCKED-Barriere.
- `tests/v4/patch83.test.js` enthält **11 gezielte Tests** für Gate/Level 1, Level 1→2/Siegel, Glimmerdeep-Seiteneingang, Live-Fixture, gezogene Population, Killscope, Cull vs. Clear, Kontext, BLOCKED, Replay. **Claude berichtet** 986/986 Node-Tests (11 neu) und 21/21 SillyTavern-C-Smoke, inklusive Gegenprobe: die 11 Tests seien auf .27 rot und auf .28 grün gewesen. ChatGPT hat den Commit, die Implementation und die Testdateien eingesehen, **nicht** diese beiden Läufe unabhängig ausgeführt. Der Host-Smoke testet nicht den kompletten Dungeon-Livepfad.

**Zusätzlicher enger Review-Hinweis (noch kein bestätigter Live-Bug, für Folge-Test):** `guild.js cullEndState()` prüft nur `q.dungeon`, eine numerische `DEFEAT`-Aufgabe und das Fehlen von `q.clear`. Es grenzt einen reinen Cull **nicht** mit `isHunt()` bzw. weiteren substantiellen Aufgaben ab. Deshalb kann es bei einem **gemischten Dungeon-Vertrag** („N Monster besiegen und einen Mechanismus reparieren / einen Gegenstand liefern“) den gesamten `desired_end_state` durch ausschließlich einen Killzähler ersetzen und andere vereinbarte Ziele aus der narrativen Readiness entfernen. Codepfad eindeutig vorhanden, reale Fehlbuchung nicht beobachtet; **vor allgemeiner Freigabe gemischter Dungeon-Quests** mit eigener Regression prüfen und den Endzustand ausschließlich für echte reine Culls ersetzen. Der reine aktuelle Skelett-Test wird dadurch nicht blockiert.

**Weitere Beobachtungsgrenze:** `areaOf()` lässt bei numerischem Dungeon-Cull Wesen mit fehlendem oder unbekanntem Ort weiterhin durch (`!p || !s.places[p]`) – eine bewusst beibehaltene Legacy-Toleranz, die bei neuen Dungeon-Entities nicht als normaler Beleg für Kill-Credit dienen sollte. Der neue Test deckt bekannte fremde Orte und falsche Ebenen ab, nicht den ortslosen Grenzfall. Bei relevantem Live-Befund gezielt testen; keine breite Legacy-Migration auf Verdacht.

**Nächste Schritte:** Eine **frische** .28-Kampagne statt Fortsetzen der in .27 fehlerhaft gebuchten Level-2-Treppe und des alten 3er-Culls; durchgängiger GLM-Test von Guild/Quest über Gate und erste F-Rank-Skelette bis Floor-Clear, Guardian und Turn-in. Notwendige Änderungen nur bei belastbarem Befund; die bereits belegte `cullEndState`-Lücke mit kleinem Mixed-Quest-Test prüfen. Die Narrator-Cache-Positionierung (frühe wechselnde Lorebook-Einträge, 5/7 Requests ohne Cache im .27-Lauf) und Planner-Reparatur-Latenz getrennt messen. `tools/bench_extract.mjs worldSummary()` vor A0/A/C-Qualitätsentscheidung weiter härten. Patch 9 Organic Growth und ROAD AHEAD bleiben unverändert offen.

## 5j. Erster echter .28-GLM-Livetest: Glimmerdeep, vier Beetles, Questturn-in (22.10.2026)

**Primärquellen des Nutzers (3 Exporte):** `Avereth Engine Test v4 - 2026-10-22@03h42m25s960ms.jsonl` (39 Chatnachrichten zuzüglich Metadatensatz), `avereth-events-Avereth Engine Test v4 - 2026-10-22@03h42m25s960ms.json` (34 datentragende Record-Einträge), `Chat Completion request {(20261022-022019).txt` (49 tatsächliche LLM-Requests einschließlich Reparaturen). In allen kampagnenbezogenen Events Build `4.3.0-c.6.6.28`, GLM-5.3-Flash, V4-C; frische Kampagne in Glassmere; Mage mit Flame Lance/Blink. **Scope:** Guild-Registrierung, Board, Annahme eines Glimmerdeep-Culls, Gate, erste Galerie/Beetle-Slot, vier Einzelkämpfe, Level-up, Turn-in, fünf Stunden Rast, Board erneut. **Nicht:** Old-Crown-Gate-Treppe/Siegel, Guardian/Glimmer-Queen, voller Dungeon-Floor-Clear, Reset, Boss-Combat, mehrteiliger Gruppenkampf.

**Bestätigte Kernfunktionen:** Registrierung bei der Glassmere-Gilde kostet genau 20 cp (50→30), Novice/Power F, keine Doppelbuchung. Fünf Novice-Angebote. Der aktive Glimmerdeep-Cull erließ die 10-cp-Gate-Gebühr. Die erste neue `Crystal Gallery` erhält durch seitlichen Link vom echten Glimmerdeep-Gate `floor=1`; `dungeon.ahead` bestimmt den Slot `beetles` mit **vier tatsächlich gezogenen `glass beetle` Leveln 2,3,5,1** (F-Rank-Fenster). Loot und XP wurden pro Kill einmal gebucht; ein Angriff auf bereits toten Beetle C wurde **ohne MP-Kosten und ohne Ersatz-Ziel** verworfen. Vier Flame Lances kosteten je 16 MP (72→8), 12+24+60+36 = 132 Kill-XP, Level 1→2 mit Rest-XP 32. `#assign int 5` wies die fünf Statuspunkte zu, spätere MP-Maximumsanpassung korrekt. Nach dem vierten Kill wurde `quest.ready`/Slip READY übernommen; Rückweg vom Dungeon zum Gate, anschließend zum Guild Hall und `quest.turn_in` in einer Nachricht: `proof.checked ok:true mode:story_outcome`, +60 cp (30→90), +23 Quest-XP (32→55), `quest.status completed`. Fünfstündige Rast wurde 300 Minuten gebucht, HP 80→85/85, MP 8→101/124; andere Adventurer-Gruppe betrat im Hintergrund das Dungeon und verbrauchte einen Slime-Slot (Living-World-Tick). **Der vollständige Floor-Clear war nicht Ziel dieses numerischen Culls und ist nicht belegt.**

**NEUER HOCHPRIORITÄRER GAMEPLAY-BEFUND – Viermal derselbe Ambush:** Alle vier Glass Beetles waren gemeinsam am Ort, als eine Gruppe `glimmerdeep_grotto_c1_l1_e1` und im selben `dungeon.slot` materialisiert; die vier `scene.awareness`-Werte wurden auf `unaware` gesetzt. `COMBAT START — AMBUSH` trat **viermal einzeln** auf: D, A, C und B; jeder erhielt einen durch Flame Lance sofort tödlichen Ambush-Krit, null Gegneraktionen/HP-Schaden. Die verbleibenden Gruppenmitglieder erhielten aus Narrator-/Extractor-Antworten weiterhin `unaware`, obwohl die Prosa explosionsartige laute Treffer schilderte. Das ist eine **reale Interaktion aus bestehender Group-Combat-Logik und Awareness**, kein Nachweis eines falschen Damage- oder XP-Werts: `src/v4/group_combat.js groupJoiners()` ordnet zunächst unaware Gruppenmitglieder `later` zu; bei tödlichem Opening endet der Kampf vor deren Beitritt. Beim nächsten Einzelangriff folgt erneutes Opening. **Design-/Engine-Lücke: eine offensichtlich aufgedeckte und angegriffene nahe Gruppe erhält keine verlässliche kausale Alarmierung.** Vor allem bei sichtbarer, lauter Magie und ohne gewählte Stealth wirkt das nicht wie ein sinnvoller Kampf. Gegenfall echte unbeobachtete/leise Kills respektieren; nicht pauschal alle Umstehenden aggro machen, keine automatische Gegner-Telepathie, keine unbegründete Schadens-/XP-Änderung. Zuerst Szenen-/Wahrnehmungs- und Combat-Brücke gezielt prüfen, dann Regression mit überlebendem Gruppenmitglied und one-shot opening.

**BESTÄTIGTER QUEST-ANZEIGEFEHLER:** `quest.created` führt `title: Cull the Crystal Beetles of the Outer Grottos`, `task: Cull at least six crystal beetles ...`, aber nach `cullNumbers()` `DEFEAT qty:4` und nach `cullEndState()` `desired_end_state: 4 crystal beetles ... defeated`. Offizielle Board-Zeile **zeigt gleichzeitig „(4)“ und „at least six“**, sowohl im Engine-Panel wie in der Narrator-Ausgabe. `guild.js bookBoard()` schreibt die Zahl und den Zielzustand um, **nicht den ursprünglichen Task**. Ein reiner Dungeon-Cull braucht auch im maßgeblichen Task konsistente Zahl/Species-Wortwahl. Die vier gezogenen Gegner hießen `glass beetle`; durch das generische Nomen `beetle` erkennt `namesKind()` diese technisch für das Ziel (keine behauptete fehlerhafte Zählung). Eine spezifische Anzeige „crystal beetles“ sollte als ggf. weiter gefasste Kategorie verständlich sein. Nicht alle unterschiedlichen Monsterspezies automatisch gleichsetzen. Der im §5i dokumentierte Mixed-Dungeon-Task-Randfall bleibt relevant: keine automatischen Task-/EndState-Ersetzungen, die andere substantielle Ziele entfernen.

**LLM-Leistung:** 16 Planner-Requests (**Median 2,44 s**, max 6,32, keine `length`-Reparatur); ein Board-Request plus ein Board-Nachversuch (**Boardzeit laut Record 31,33 s**); 15 Narrator-Antworten (**Median 11,55 s**, max 41,42 s; weitere 34,82 s); 15 extrahierte Narrator-Antworten mit **16 Extractor-Calls** (eine `length`-Reparatur bei 2.500 Completion-Tokens, gesamt 31,98 s). Extractor-Median pro Spielantwort **4,27 s**, max **95,82 s ohne Reparatur** bei 366 Completion-Tokens. Die frühen variierenden Lorebook-Inhalte/Cache-Position bleiben Performanceverdacht: **8/15 Narrator-Provider-Responses mit 0 `cached_tokens`**, gegenüber hohem Cache bei Planner/Extractor. Planner+Board+Narrator als indikative Nutzerlatenz: **Median 14,8 s** der 15 erzählten Spielzüge; keine isolierte Provider-Latenz- oder Kausalitätsmessung. Zeitanteile der Extractor-Barriere sind nicht in diesen sichtbaren Summen enthalten und dürfen nicht additiv als Nutzerwartezeit angenommen werden.

**Weitere Narrativeinschränkungen / gute QoL:** Ein Stadtweg, Dungeonreise (120 min), Rückkehr zum Gate (15 min), Guild Hall (60 min) und fünfstündiges Resten wurden jeweils ohne unnötige Continue-Turns verarbeitet. Narrator schreibt einmal Alaric eigenmächtig eine Nachfrage nach dem Gildenweg zu („He asked his way once“), obwohl er sie nicht gesprochen hat; geringprioritärer PC-Speech/Agency-Konflikt. Der anschließende Guild-Turn-in ist dagegen vom Spieler ausdrücklich autorisiert. Noch kein falscher Questturn-in/Abschied. Wiederholte Beetle-„nobody notices“-Prosa ist inhaltlich mit den persisted `unaware`-Werten konsistent, aus Causality-/Gameplay-Sicht aber unplausibel.

**Folgeentscheidung:** Ein **gezieltes Gegenreview** der Combat-/Awareness-Öffnung und der Quest-`task`-Zahl dringend sinnvoll (möglicher kleiner Fix), bevor ein weiterer viermaliger Einzelambush-Livetest gespielt wird. Den vollständigen Dungeon-Floor-Clear/Guardian/Boss separat fortsetzen, ohne Patch 9/ROAD AHEAD oder Damage-Scaling vorziehen. Provider-/Narrator-Cache A/B separat, keine globale Token-Limit-Reduktion.

## 5k. Gegenreview des .28-Livetests: drei Glieder der Ambush-Schleife, Entscheidungsstand (22.10.2026)

**Quelle:** unabhängiger Claude-Review des vom Nutzer gelieferten .28-GLM-Laufs und anschließende eigene Prüfung von `src/v4/group_combat.js`, `src/engine.js`, `src/combat.js`, `src/v4/world.js`, `src/v4/guild.js` und `tests/v4/patch81.test.js` durch ChatGPT im unveränderten Entwicklungsbranch `70cbb5e`. Der Review hat **keinen neuen Patch implementiert**.

**Präzise Ursache für vier Solokämpfe:** Die vier Käfer waren eine Dungeon-Gruppe und in `scene.awareness` alle `unaware`, **Alaric war aber nicht concealed** (`scene.concealed=[]`, keine Stealth-Probe). (1) `groupJoiners()` sortiert `unaware`-Mitglieder pauschal nach `later`; (2) `combatTurn()` fügt sie nur ein, wenn der initiale Angriff den Encounter nicht bereits terminal beendet; (3) `persistCombat()` markiert bei Kampfende nur beigetretene Gegner oder nicht-unaware Zeugen als `wary`. Somit bleiben die Überlebenden als `unaware` bestehen; die weitere Narration folgt diesem bindenden Wert, und `world.js` akzeptiert erneut `unaware`, da kein `wary` vorhanden ist. `combat.js initEncounter()` vergibt beim Angriff auf ein `unaware`-Ziel unabhängig von `concealed` eine Ambush-Opening Action mit kritischem Treffer. Test `8.1 group 5 (stealth)` setzt sogar ausdrücklich `scene.concealed=[]` und reproduziert damit die fehlerhafte Vermengung von echter Deckung/Stealth mit bloß fehlender Wahrnehmung. **Bestätigter Engine-/Designfehler, keine fehlerhafte Damage- oder XP-Formel.**

**Entscheidung für engen Nachfolgepatch (noch nicht implementiert):** Auf dem V4-C-Produktpfad bei einem **unverdeckten Angriff des PC** (`pc` nicht in `scene.concealed`) andere anwesende und nach bestehenden Gruppen-/Hostility-/Threat-/Stays-Out-Regeln beitrittsfähige Mitglieder derselben feindlichen Gruppe **vor der Eröffnungsauflösung** in den Encounter aufnehmen, auch wenn sie zuvor `unaware` waren. Das zuerst überraschte Ziel darf weiterhin eine einzige Ambush-Opening Action erleiden; weitere Mitglieder nehmen in regulärer Initiative teil. Sie müssen nach dem Angriff Engine-seitig als `aware`/`wary` fortgeführt werden, damit der Narrator sie nicht weiter als ahnungslos darstellt. Echtes verborgenes, unbemerktes und lautloses Ausschalten darf weiterhin möglich sein. Keine pauschale Aggro für Tiere mit `threat:false`, friedliche NPC-Gruppen oder aktiv fliehende/kapitulierende Gegner. Tests: reale .28-Beetle-Fixture, One-shot-Öffnung, lange Opening Action, echte Concealment-Variante, friedliche Gruppen, Replay/Swipe und wiederholte Angriffe. Kein genereller Schadens-/XP-Nerf.

**Offene, bewusst getrennte Erweiterung:** Auch **auffällige/laute Angriffe aus echter Deckung** (z. B. Flame Lance) sollten grundsätzlich die Gruppe alarmieren können. `concealed` ist Sichtschutz, keine Geräuschlosigkeitsgarantie; **Alarmierung** verrät aber nicht automatisch den exakten PC-Standort. Zur Vermeidung falscher automatischer Enttarnung **nicht** durch eine ad-hoc-Geräuschmechanik in den engen Patch mischen; als separates Design-/Regressionsthema dokumentieren. Ein gescheiterter oder sichtbarer Angriff und ein wirklich unbemerkter Stealth-Kill müssen differenziert bleiben.

**Präzisierter Guild-Fehler:** `guild.js bookBoard()` passt `DEFEAT qty` und `desired_end_state` auf den gezogenen Dungeon-Zyklus an, lässt `quest.task` aber bei „at least six“ trotz mechanisch vier. Aufgabenbeschreibung daher **nur bei eindeutig reinem Cull** entlang der strukturierten endgültigen Zahl mitziehen; keine naive Regex, die Etagen, weitere Mengen oder Mischaufgaben ändert. Beim gemischten Dungeonvertrag weiterhin den seit §5i erkannten `cullEndState()`-Zielverlust vermeiden. `objectiveText()` ergänzt `qty + unit + what` ungeschützt; daraus entsteht „DEFEAT 4 beetles crystal beetles ...“. Auch das semantisch deduplizieren, ohne legitime Einheiten von Liefer-/Sammelaufgaben zu verlieren. Gleichheit von `glass beetle` und `crystal beetles` durch den Beetle-Kind-Matcher ist hier erwartetes Verhalten; keine generelle Gleichsetzung von unterschiedlichen Arten.

**Separater Performance-Nachtrag:** Der Glimmerdeep-Board-Generator brauchte **zwei** Requests insgesamt 31,3 s. Der erste enthielt zwei Glimmerdeep-Aufträge (Verstoß gegen max. einen Dungeon-Job je Board); der zweite nach Ablehnung eines Eintrags generierte **alle fünf** erneut, statt nur fehlende. Der Nachversuch kostete ca. 12,4 s. Eine partielle Ergänzung fehlender Listings wäre eine spätere **eigenständige** QoL-/Performance-Verbesserung, nicht Teil der Combat-Mechanik. Narrator-Cache-A/B und Extractor-Ausreißer ebenfalls getrennt.

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

- **Jetzt:** Patch 8.2 (.27) ist implementiert und in Git überprüft, 975/975 Tests und erfolgreicher SillyTavern-C-Smoke von Claude berichtet. **Erster kurzer .27-Livetest erfolgt (5g); danach gezielter Old-Crown-Etagen-/Quest-Fix, weiterer Dungeon-Livetest und echter A0/A/C-Providerbenchmark** (nach kleinem Qualitätsvergleichs-Fix), erst dann 8.2b entscheiden.
- **Bei Bedarf:** Nach .26-Livetest und Review bestätigte Integrations- und Latenzprobleme gezielt beheben; keine vorschnelle Minifix-Schleife, keine globalen Balance-/XP-Änderungen.
- **Patch 9 (verbindlich geplant, Implementierung ausstehend):** Organic Classes/Growth anhand tatsächlichen Spielerhandelns einschließlich sinnvoller Skill-Bausteine und besonderer Entwicklungsmomente. **Keine** Änderung der Standard-Basisklassen aus dem verworfenen Katalogpunkt F1/#71 ableiten.
- **Patch 10B / späteres Polish:** HUD/Defense-/Utility-Skills, allgemeines Balancing/Scaling; Focused-Ward-Plus-Move bleibt bekannte separate Aufgabe. Exakter Umfang noch offen.
- **Engine Actions & QoL (KANDIDAT):** Engine-only-Gildenboard, Rest/Wait in sicherer Umgebung, bekannte Wege, direkte Systemkarten und optionale Quick Replies; Umfang noch nicht freigegeben. **ROAD AHEAD (KANDIDAT):** vorverankerte Reisebegegnungen und Suche, ggf. vor Patch 9 nur bei bestätigtem Bedarf.
- **Langfristig:** möglicher CraftRPG-Port, derzeit keine aktive Umstellung.

**Unveränderliche Designpräferenzen:** Player Agency, Quality of Life, bedeutungsvolle Entscheidungen und ein echtes Spiel vor Simulationsrealismus; keine Traglastverwaltung, keine Trophäen-Zwangsbeweise, keine bedeutungslosen Zwischenstopps, kein Level-Scaling an Alaric, kein unbegründetes XP-Farm-Nerf. Living Dungeons sind geteilte Weltorte, keine privaten Instanzen. Der Narrator bleibt kreativ, aber die Engine entscheidet Mechanik.

## 8. Wichtigste aktuelle Dateien

- **avereth-engine/docs/PATCH8_3_DUNGEON_FLOORS_CULLS.md; tests/v4/patch83.test.js; tests/v4/live_1022a.json** – aktueller Patch 8.3 (.28), Regressionen und .27-GLM-Fixture.
- **avereth-engine/docs/PATCH8_2_LLM_PERFORMANCE.md** – Details zum zuvor implementierten Diagnosepatch .27, Metadaten, leerer Narrator-Antwort, Benchmark.
- **avereth-engine/tools/bench_extract.mjs; tests/v4/patch82.test.js; tests/v4/live_1021e.json** – A0/A/C-Benchmark und Regressionen.

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
2. **Aktueller Code ist Patch 8.3 (.28), `70cbb5e`**; der neue reale .28-Glimmerdeep-Livetest bestätigt Gate→Level 1 und Quest-Turn-in, zeigt aber vier Einzel-Ambushes trotz vier gemeinsamer Gruppenmitglieder sowie „(4)“/„at least six“ auf demselben Board (siehe §5j). Der volle Floor-Clear/Boss/Siegel-Livetest bleibt ausstehend.
3. Die .25-Befunde führten zu .26, die Latenzprobleme zu **Patch 8.2 (.27, §5f)**; dessen Livetest führte zu **Patch 8.3 (.28, §5i)**. `#assign`-Fastpath, Engine-only-Board, ROAD AHEAD und Organic Growth sind **nicht** implementiert. Echte Performanceverbesserung, A0/A/C und Narrator-Cache-Versuch weiter offen.
4. Bei Live-Exports zuerst Engine-Events, Chat-JSONL und LLM-TXT korrelieren; Gameplay- und Designregeln der Dateien 01/02 berücksichtigen.
5. **Datei 04** enthält die 141-Ideen-Zusammenfassung, 20 ausgewählten K-Kandidaten, Claude-Gegenreviews, Engine-only-Board, Rest/Wait/Fast-Travel/Quick Replies und die offene Patch-9-/ROAD-AHEAD-Reihenfolge. Keine Ideen ohne Nutzerfreigabe in den bindenden Kanon oder die Implementierung übernehmen.
6. Nach neuen Meilensteinen nur betroffene Projektdateien auf `main` aktualisieren; Implementierungsbranch nicht für Dokumentationspflege mergen.

**Letzter dokumentierter Git-Stand ist ein überprüfter Zeitpunkt, kein dauerhaft garantierter HEAD.**