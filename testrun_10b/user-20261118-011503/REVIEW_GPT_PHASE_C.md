# GPT-Gegenreview – User05 `.202`, Phase C: Weltabgleich, Kampf-HUD und Blocker

**18.11.2026 · Dritter Export desselben persönlichen Tests.** Review auf Basis der vier vollständig erhaltenen Originale ([Phase-C-Manifest](SOURCE_MANIFEST_PHASE_C.md)), des bereits archivierten [Phase-A-Reviews](REVIEW_GPT.md), des [Phase-B-Reviews](REVIEW_GPT_PHASE_B.md) und gezielter Codelektüre des tatsächlich getesteten Builds [`6a92dcc`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6a92dcc650809eb16934a984c30ce0cf7c5cfe98). Die Originale wurden nicht verändert. **Keine neue Produktimplementierung, keine erneuten Node- oder ST-Tests, keine Provideraufrufe durch GPT.** Nutzerfeedback ist eine beim Spielen spontan notierte Wahrnehmung; es ist nicht automatisch eine beschlossene Spezifikation.

## 1. Vollständigkeit, Umfang und Evidenz

| Messgröße | Phase A | Zuwachs B | Zuwachs C | **User05 insgesamt** |
|---|---:|---:|---:|---:|
| Spielerinputs | 7 | 8 | **11** | **26** |
| Engineevents | 90 | 153 | **98** | **341** |
| Exportgruppen mit Events | 13 | 15 | **13** | **41** |
| Physische Provider-Requests/-Responses | 17/17 | 21/21 | **26/26** | **64/64** |
| Planner/Intent-Planner | 5 | 7 | **11** | **23** |
| Narrator | 5 | 7 | **7** | **19** |
| Extractor inkl. Reparatur | 5 | 7 | **8** | **20** |
| Boardgenerator | 2 | 0 | 0 | **2** |

Phase C enthält **54 sichtbare Chatnachrichten** (I0–I53; plus eine JSONL-Metadatenzeile); alle 31 sichtbaren Nachrichten aus Phase B sind **inhaltlich identisch** enthalten. Die neue Eventdatei enthält 41 Exportgruppen, alle **41/41** strukturell exakt identisch zu den in den jeweiligen Chatnachrichten gespeicherten Events. Die Zählungen beziehen sich auf die vollständigen Exporte jeweils **ohne die alten Präfixe erneut zu addieren**. Der neue Completion-Mitschnitt enthält ausschließlich die 26 zusätzlichen Aufrufpaare, alle `finish_reason:stop` (der Formfeed in diesem Satz ist rein typografisch und nicht Teil der Originaldaten). **Keine** dokumentierte HTTP-429-, Provider-Timeout- oder unvollständige Antwort in den 26 neuen Requests.

Für den letzten bekannten Stand liegen **fünf HUD-Verweigerungen mit null Engineevents** vor; das ist nicht dasselbe wie ein ausstehender Extractor. Die 7 zusätzlichen regulären Narratorantworten wurden je nach Fall mit 8 physischen Extractor-Aufrufen verarbeitet (ein Repair) und 7 erfolgreichen `extract.applied`-Ergebnissen abgeschlossen. Der letzte **erfolgreich gebuchte** Storyzug ist I44/I45; danach nur fehlerhafte HUD-Eingaben und Systemhinweise.

## 2. Tatsächlicher Verlauf und mechanischer Stand

- **I31–I32:** Alaric rastet ausdrücklich vier Stunden in der Quarzkammer. Engine: 240 Minuten, **HP 28→70/105, MP 28→107/132**. PULSE `pause/dungeon` rollt, ohne Ereignis. Extractor meldet `engine_recovery` für eine überzählige `recover`-Delta zurück; **Restwirkung war bereits korrekt gebucht**, daher kein verlorener Heal.
- **I33–I34:** Nächster Dungeonabschnitt `l1_s3` („the low hollow“), ein **Quartz Ooze**. Der erste Extractorversuch benötigt einen weiteren physischen Extractor-Aufruf; nach Repair wird der Raum einschließlich Einzelgegner gebucht.
- **I35–I36:** F-HUD `Flame Lance` auf den Ooze. Der Mage besiegt ihn durch einen echten Enginekampf (180 XP), ohne zusätzlichen Narrator-Kampfausgang; aktuelle MP danach 91. Beide Aktion und Weltfolge werden gebucht.
- **I37–I38:** Weiter zum Bossabschnitt `l1_s4`, die **Glimmer Queen** erscheint. Der Narrator beschreibt außerdem ein Dutzend größere Käfer am Kristallhügel. Deren `creature.new` wird mit `dungeon_foe` abgelehnt; eine darauf aufbauende Behauptung wird ebenfalls verworfen. **Die Erzählung enthält diese Tiere trotzdem**, der offizielle Dungeon-Kampfzustand nicht.
- **I39–I41:** Erste F-HUD Flame Lance auf die Glimmer Queen eröffnet einen echten Ambush: **71 Schaden** (145→74 HP, Critical ×1,5), MP 91→75. Queen bewegt sich **LONG→MEDIUM**, später wird eigenständig ihre passive, abwartende Reaktion erzählt (zusätzlicher Narrator-/Extractor-Zug ohne neue PC-Entscheidung).
- **I42–I43:** Erster neuer F-HUD-Aufruf im **laufenden** Bosskampf wird verweigert: `HUD und Freitext sind noch nicht eindeutig verbunden`. Keine gebuchte Aktion.
- **I44–I45:** Ein erneuter F-HUD-Aufruf funktioniert, trifft mit **53 Schaden** (Queen 74→21 HP), MP 75→59; sie bewegt sich **MEDIUM→SHORT**. Alle fünf Ereignisse des Spielerzugs und fünf der Erzählungsantwort werden gebucht.
- **I46–I53:** Vier weitere gleichartige F-HUD-Eingaben scheitern mit derselben Bindungsfehlermeldung, **jeweils ohne Engineevents oder zusätzlichen Narrator-Storyzug**. Insgesamt **5 Verweigerungen bei 6 aktiven Bosskampf-HUD-Versuchen**. Das ist ein **reproduzierter Gameplay-Blocker**, nicht bloß ein unansehnliches Dropdown.

**Letzter gebuchter Zustand:** Mage **Level 4**, Glimmer Queen **21/145 HP**, Alaric **70/105 HP, 59/132 MP**, Queen im **SHORT-Band**. Die Gildenquest `Clear the Outer Grottos of Glimmerdeep` ist weiter **aktiv**, Floor 1 ist nicht clear, kein Turn-in. XP aus dem ersten Käferkampf 600, plus 180 XP für den Quartz Ooze; es gibt keine belegte Boss-XP-Abrechnung. Das Dungeon-/Bossziel wurde nicht fertig gespielt.

## 3. Priorität P1 – HUD/Planner-Bindungsvertrag blockiert den aktiven Kampf

**Ursache anhand Original-Request/Response und Code belastbar nachvollziehbar:** Die F-HUD-Eingaben werden im aktiven Kampf von einem separaten Intent-Planner interpretiert. Dessen Request verlangt das zusätzliche Feld `hud_binding:{id,decision,seqs}` **auf oberster JSON-Ebene**, damit `planner.js::parsePlan()` und `action_input.js::reconcileHudPlan()` die typisierte Auswahl eindeutig an die Kommandos binden können.

Bei den **fünf fehlgeschlagenen** Aufrufen hat GLM `hud_binding` dagegen **innerhalb des einzigen `commands[0]`-Objekts** ausgegeben, zum Beispiel strukturell:

```json
{"commands":[{"seq":1,"type":"use_skill","skill":"mage.flame_lance","target":"mon.glimmerdeep_grotto_c1_l1_e3","hud_binding":{"id":"<Auswahl-ID>","decision":"use","seqs":[1]}}]}
```

Der **eine erfolgreiche** Wiederholungsaufruf enthält `hud_binding` auf Top-Level. So erklärt sich der scheinbare Zufall ohne Annahme eines Server- oder Saveausfalls. Der Engineguard verweigert die fünf falschen Formate absichtlich, wodurch keine verborgene Mehrfachattacke, MP-Abbuchung oder Monsterbeschädigung entsteht. Aber **fünf physische Requests** mit jeweils etwa 6.600 Inputtokens liefen ins Leere; H wurde weiter **nicht** natürlich erprobt.

**Empfehlung:** Vor Fortsetzung dieses Kampftests **enger technischer Fix plus Regression mit den echten sechs Modellantworten**. Den stabilen Action-HUD-Datenvertrag und den Schutz vor geänderten Zielen/Skills behalten. Schema und Prompt konsistent machen; eine streng begrenzte, mechanisch überprüfte Normalisierung eines *exakt identischen und eindeutig gebundenen* verschachtelten Feldes wäre prüfenswert, ebenso ein direkter HUD-Weg ohne Planner bei wirklich ausschließlich typisierter Aktion ohne zusätzliche mechanische Freitextinhalte. **Kein stilles Übernehmen eines beliebigen Modellplans und keine weitere automatische Retrykette.** Keine neue Gesamtarchitektur nötig.

## 4. Spielerfeedback C1–C6 – unabhängige Einordnung

Der vollständige Originalwortlaut steht in [`originals/phase_c_user_feedback.txt`](originals/phase_c_user_feedback.txt). Im [separaten Feedbackreview](USER_FEEDBACK_PHASE_C_REVIEW.md) sind die sechs spontanen Punkte chronologisch zugeordnet.

**C1 – Gröbere Ortsgranularität:** Eine Guild hall ist bereits ein kanonischer Ort; nicht jede Nische, jeder Schalter oder Tisch benötigt eine separate `place`-ID. Im Dungeon sichern die Engine-Abschnitte dagegen **Begegnungsreihenfolge, betretbare Wege, Rückkehr, Gegner-/Boss-Slot und Floor-Clear**. Ein einziges `dungeon level 1` statt sämtlicher Teile würde diese Grenzen ohne Ersatz verlieren und könnte Anwesenheit über alle Bereiche vermischen. Gute Designrichtung für einen späteren Versuch: **größerer fachlicher Makro-Ort plus optionaler aktueller Szenen-/Encounterabschnitt**, keine formelle GO-Buchung für rein erzählerische Mikro-Wechsel. Nicht sämtliches Dungeon-Slottracking streichen; Nutzerentscheidung nach Astra-Gegenreview.

**C2 – „Squishy“ Gegner bewegen sich zu langsam:** Boss bewegt sich im belegten Kampf LONG→MEDIUM und MEDIUM→SHORT, während Flame Lance bereits 71+53 Schaden verursacht. Das erklärt die Reichweitenüberlegenheit des Magiers; zusammen mit den schnellen Levelups ist das ein ernstzunehmendes **Balancingthema**, aber weder Defekt des HUD noch Beweis für einen pauschalen Buff. Später gezielt Mobilitäts-/Sprintaktionen für passende Kreaturen, Aktionskosten, Initiative und Spielerwarnung gegen unterschiedliche Klassen testen; Charakterrollen nicht nivellieren.

**C3 – Unbeabsichtigtes Senden eines leeren Textes:** Im **gespeicherten Export** steht **keine leere Usernachricht**: Die wiederholten Aktionen tragen einen automatisch eingesetzten Labeltext `Flame Lance → Glimmer Queen`. Eine unabsichtliche Tasten-/Klickfolge oder ein fehlgeschlagener Sendeklick außerhalb des Logs lässt sich damit nicht ausschließen. Das UI mit „Auswählen“ → F/H → regulärer ST-Senden-Knopf bleibt subjektiv fehlerträchtig. Gemeinsamer klarer, optionaler HUD-Senden-Button wäre als **UI** sinnvoll, darf aber **keinen zweiten Save-/Kampfausführungspfad** schaffen.

**C4 – Wieder wahrgenommene Wartezeit:** Die gestiegenen Extractorzeiten sind belegt (unten). Ein plannerfreier H-Test fehlt weiterhin; F und Fehlversuche nutzen Planner weiter. Deshalb ist ein allgemeines Performanceversprechen für `.202` aktuell nicht durch natürliche Daten gedeckt. Extractor ganz zu überspringen würde unbekannte Welt-/NPC-Fakten verlieren können; zuerst messen und ausgewählte redundante Pfade beseitigen.

**C5 – „Gespeichert“ beim Vorbereiten trotz laufendem Weltabgleich, danach keine sichtbare Ladeanzeige:** **Explizite Nutzerbeobachtung, nicht aus dem Chat-/Eventexport reproduzierbarer DOM-Zeitfehler.** Die Funktion `index.js::setActionStatus` kann `Gespeichert` nach Save-Readback anzeigen, `action_composer.refresh()` zeigt `blocked() || status()`. Gespeicherte Spielermechanik, laufender Extractor und endgültig bestätigter Weltstand sind verschiedene Status. Ein gezielter isolierter ST-Test soll Klick in die Auswahl **während laufendem Extractor und Save** sowie Anzeige bis `extract.applied` abdecken. Die letzten Fehlversuche sind durch Planner-Bindung erklärt und kein Nachweis eines offenen Savejobs. Anzeige nie irreführend „Welt gespeichert“, wenn nur Mechanik/Chat gespeichert ist.

**C6 – Cachetokens ständig 0:** **Alle 64 Antworten von User05 A+B+C melden `cached_tokens:0`**, bei kumulativ **772.826 Prompttokens + 17.785 Completiontokens** (790.611 insgesamt). Im historischen [User04 `.159`](../user-20261106-072640/REVIEW.md) waren **825.898 gemeldete Cachetokens** unter 1.520.007 Prompttokens im damaligen Log; [Architektur-Audit §6](../../recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md) dokumentiert ebenfalls konkrete ältere P-/X-Cachetreffer. **Beides sind andere Provider-/Laufbedingungen.** Der neue Nullwert beweist fehlende gemeldete Hits, nicht, ob der Provider Caching deaktiviert, nicht meldet, durch Prefixvariationen nicht trifft oder es anders abrechnet. Provider-/Modellbedingungen und effektive Cachekonfiguration vergleichen; keinen erdachten Geschwindigkeits-/Kostenfaktor angeben.

## 5. Gemessene Modelllast, korrekt abgegrenzt

| Phase | A | B | C |
|---|---:|---:|---:|
| Planner-/Intent-Aufrufe | 5 | 7 | **11** (davon 5 fehlgeschlagene F-HUD-Bindungen) |
| Narrator-Aufrufe | 5 | 7 | 7 |
| Extractor-Aufrufe | 5 | 7 | **8** (7 Szenen, 1 Reparatur) |
| Boardgenerator | 2 | 0 | 0 |
| **Physische Requests** | **17** | **21** | **26** |
| Extractor Median | **14,339 s** | **27,192 s** | **38,613 s** |
| Extractor Gesamt | **61,173 s** | **164,881 s** | **214,622 s** |
| Narrator-Median | 23,745 s | 23,633 s | 23,907 s |

Die sieben C-Extractor-`ms` sind 46.591, 41.234, 10.478, 41.053, 28.645, 8.008 und 38.613; der reparierte Vorgang umfasst **zwei physische Requests**, die Event-`ms`-Werte sind die berichtete Laufzeit je erfolgreich verarbeitetem Extraktionszug. Wenn man die Phasen summiert, erhält man keine sauber gemessene End-to-end-Latenz über UI-/Save-/Providergrenzen hinweg. Der längere Median ist real, aber die C-Szenen enthalten Grotto-/Boss-/Memory-Kontext und sind nicht identische Vergleichsinputs zu A/B. Im [historischen Audit §6](../../recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md) lagen Extractorzeiten für ausgewählte `.191`-Szenen teilweise bei 4,5–13,4 s, aber auch bei 27,4+15,8+8,0 s mit Repairs; nicht als kontrollierten `.202`-Benchmark darstellen.

C erzeugt **keine nachgewiesene Provider-HTTP-Fehlerserie**. Der Zeitverlust beim Boss ist stattdessen **modellseitige JSON-Vertragsabweichung und strikte korrekte Sperre**. Priorität: die fünf aussichtslosen Modellaufrufe verhindern, bevor aufwändige allgemeine Cache- oder Runtimeoptimierung geplant wird. Danach kontrolliert H- und F-Pfade sowie Speicherstatus messen.

## 6. Weitere Abweichungen, ohne sofortige Validator-Ausweitung

- **Narrator-Agency bei Rast (I32):** Erzählt „He ate what he carried and drank“, obwohl nur vier Stunden Rast gewählt und weder ein Nahrungsvorrat noch eine Essenbuchung erkennbar sind. Die gebuchte Mechanik ist richtig; der Erzähler überschreitet unnötig die Grenze kleiner Routinehandlungen. Bei späterer Agency-Präzisierung diese konkrete freie Erzählung als Gegenfall einbeziehen; keine generelle Textzensur.
- **Dutzend Käfer in der Bosskammer (I38/40/41/45):** Der Narrator zeichnet wiederholt zusätzliche größere Käfer um die Queen; die Engine verwirft ihren Spawn korrekt, weil der Dungeon-Floor genau definierte Slots hat. **Sichtbare Erzählung und gespeicherte Bedrohung divergieren**. Nicht pauschal Slotlimit lösen: Im Spiel wäre eine unklare illustrierte Hintergrundmenge vielleicht akzeptabel, aber als potentielle Angreifer/Beute/XP irreführend. Fachregel und Narratorfreiheit zusammen entscheiden.
- **Rast-/Recovery-Delta (I32):** Der Extractor meldete eine zusätzliche Recovery, die mit `engine_recovery` abgewiesen wurde. Mechanische HP-/MP-Erholung war bereits vollständig und einmalig gebucht. Kein weiterer Fehler.
- **Kontinuität Glimmerdeep:** In A/B war die kanonische Lage **nördlich** Glassmeres, der Narrator sprach von **westlich**. In C ist die Route nicht neu verhandelt; der frühere Richtungswiderspruch bleibt als offener Punkt, ohne jetzt einen neuen Bug zu behaupten.

## 7. Prioritäten und nächster Schritt

**P1 / vor weiterem normalem Action-HUD-Test:** F-HUD-Bindungsfehler aus den **sechs echten Intent-Planner-Antworten** reproduzieren und eng korrigieren; echte isolierte ST-Gegenfälle für mehrere aufeinanderfolgende Bosskampf-Aktionen. Den bewusst gewählten H-Modus danach separat natürlich prüfen. Sicherung vor weiterem Test beibehalten; keine Modellretry-Schleifen zum Übergehen eines gültigen Schutzes.

**P2 / UI-Komfort:** Action-Auswahl in den vorhandenen Combat-HUD-Flow integrieren, direkter aber einmaliger Send, AoE-Bandwahl, lesbare Precombat-Zielnamen, ausgeräumte Itemliste, echte Trennung „Spielerhandlung gespeichert / Weltabgleich läuft / Welt gespeichert / Fehler“. Diese Punkte sind zusammenhängend, brauchen aber keinen vollständigen Neubau der Engine.

**P3 / gesonderte Fachentscheidungen:** Gröbere Mikro-Ortsgranularität (besonders Gilde), selektive Dungeon-Level-/Sectiontrennung ohne Verlust von Gegner-/Anwesenheitszustand, ggf. mobile Nahkampfgegner und Balancing, Prompt-Caching-/Extractoroptimierung anhand kontrollierter Vergleichsproben. **Kein blindes Entfernen von Dungeon-/Presence-Logik, kein automatisches Extractor-Skip und keine groß angelegte neue Architektur.**

**Status:** User05 bleibt **unterbrochen bei Glimmer Queen, Quest offen**, nicht erfolgreich abgeschlossen. Phase A/B/C sind archiviert. Die vorgeschlagene Reihenfolge und spätere UI-/Balanceentscheidungen stehen unter Nutzerfreigabe und unabhängigen Astra-Gegenreview; **dieser Review ist keine Implementierungsfreigabe**. Das heutige Akutproblem kann jedoch schon vor einem vollständigen Questabschluss an Astra zur technischen Ursachen-Gegenprüfung übergeben werden.