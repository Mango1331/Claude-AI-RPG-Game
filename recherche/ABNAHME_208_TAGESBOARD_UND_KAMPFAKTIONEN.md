# Technische Abnahme .208 – Tagesboard, Hindernis und Kampfzug

Vergleichsbasis ist die persönliche .207 auf `609380b308d89d14c289e9ca1c4e26ed29174789`. Alle neuen Laufversuche verwenden archivierte Antworten oder den lokalen Mockprovider. Die persönlichen Laufzeiten stammen aus den Originalen.

## Etappe 1 – Tagesboard und Hindernisschaden

Ein frisches F-Tagesboard strebt fünf Angebote an. Vier unabhängig gültige und gemeinsam konfliktfreie Verträge genügen schon beim ersten Aufruf. Bis zu drei in einer lesbaren Tafel ergeben keine Buchung und keinen verbrauchten Boardtag. Die nächste ausdrückliche Leseeingabe darf erneut versuchen. Ein struktureller Fehler oder uneindeutiger Konflikt erlaubt eine vollständige Reparatur. Ein abgebrochener Boardtransport beendet den Versuch. Die gesamte geprüfte Antwort stammt jeweils aus einem Entwurf. Die vorhandene eindeutige Artkorrektur greift auch auf der zweiten vollständigen Antwort. Gespeicherte Altversionen bleiben lesbar.

Die User10-Erstantwort vor M11 buchte vier Originalangebote mit einem Planner- und einem Boardrequest. Der zusätzliche Boardaufruf #14 von .207 hatte im Original 3.494 Eingabe- und 902 Ausgabetokens sowie 50,782 s Dauer. Diese Werte betreffen genau diesen entfallenden Aufruf. Die neue sichere Zugzeit wurde am natürlichen Provider nicht gemessen. Folgetag, angenommene Quest, Konflikte, kaputte Antwort, manuelles Neulesen, Swipe und Regenerate wurden lokal geprüft. [Original und Requesttabelle](../testrun_10b/user-20261123-075443-207/CODEX_GEGENREVIEW.md)

Bei User09 M17 steht jetzt einmal „−14 HP · 80 → 66“, bei M21 einmal „−8 HP · 66 → 58“. Die Anzeige benutzt die gebuchte Ressourcenänderung einschließlich Untergrenze. Die Probe scheitert jeweils. In M17 bleibt der Ort erhalten, in M21 trägt die vorhandene Reiseautorisierung die improvisierte Überquerung zum Dungeon. [Originalbefund](../testrun_10b/user-20261123-042623-207/CODEX_GEGENREVIEW.md)

Der erste Node-Gegenlauf auf .207 zeigte vier rote neue Prüfungen. Die vollständige Suite der ersten Etappe bestand mit 3.453/3.453. Im Replay wurden 2.235 Fälle verglichen, 1.131 genehmigte Abweichungen vom historischen Baseline-Manifest und null offene Fingerprints. Genau fünf Fingerprints ändern sich gegenüber .207 durch das jeweils entfallene fünfte Angebot. Betroffen sind b17-mage#5 (Turnip Rows), b17-warrior#25 (Marsh Adder), b19-mage#13 (Quarry Track Wolf), b19-rogue#13 (Reedmire Herons) und b19-warrior#7 (Millpond Marsh Harrier). Vorheriger und neuer Hash stehen je Fall in `tests/replay/accepted_daily208.json`.

Der isolierte ST-1.19.0-Lauf der ersten Etappe bestand 57/57 Browserprüfungen. Er verglich die gespeicherten Verträge und zeigte beide Schadenszeilen bei geschlossenem Charakter-HUD vor und nach Reload jeweils genau einmal. Etappe 1 ist separat rücknehmbar. [Commit 89b3695c](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/89b3695c19523d6c250c956ef6f4bac695ee1be4)

## Etappe 2 – Auswahl und Ausführung eines Kampfzugs

Das vorhandene Aktions-HUD zeigt die gewählte Reihenfolge, Zielgruppe und Kosten vor dem Senden. Der Spieler kann einen Slot leer lassen. Ein normaler Schritt, eine besessene einbändige Mobilitätsfähigkeit oder Ausweichen verbrauchen den Minor. Angriff, Guard und Trank sind Beispiele für einen Major. Flucht verbraucht den ganzen Zug. Eine reine HUD-Wahl arbeitet ohne Planner. Bei ausdrücklich handlungsrelevantem Begleittext bleibt der Planner beteiligt. Eine im Text eindeutig geordnete Ergänzung lässt sich mit dem gewählten Angriff verbinden. Widerspruch und unklare Zusatzhandlungen verlangen eine neue Wahl.

Die aktuelle Szene kennt den Deckungszustand eines Kämpfers, aber kein zuverlässig erreichbares Deckungsziel. Daher verwendet .208 den freigegebenen Seitwärtsschritt. Er verändert kein Band, endet mit dem Beginn des nächsten eigenen Zuges und verwendet den vorhandenen Teildeckungsfaktor bei Distanztreffern. Ein Angriff auf ENGAGED erhält diesen Abzug nie. Teildeckung und Ausweichen lösen ihn zusammen nur einmal aus. Gegner, die ihre defensive Position verändern wollen, verwenden dieselbe Wirkung. Das bestehende Gegnerverhalten entscheidet weiterhin selbst, ob es einen Angriff mit einer Annäherung verbindet oder einen Slot ungenutzt lässt.

Die Engine prüft den eigenen erklärten Zug am tatsächlichen Initiativezeitpunkt auf einer Arbeitskopie des Encounters mit demselben Würfelstand. Nur der vollständig erlaubte eigene Zug geht in den regulären Eventpfad. Der erste Schritt bestimmt Reichweite, gültiges Wirkungsband und Treffer des zweiten. Ein veraltetes gewähltes Wirkungsband führt zur Ablehnung. Ein Sieg beendet die Folge. Früher fällige Gegneraktionen und ein dabei eintretender Tod bleiben verbucht. Objektstapel und im Charakterinventar geführte Tränke verlieren bei einer erfolgreichen Kombination genau eine Einheit aus ihrem jeweiligen Bestand.

Beim offenen Erstschlag verbraucht die gesamte Phase genau einen eigenen Turn der ersten Runde. Beim echten Hinterhalt bleibt es bei der separaten kritischen Eröffnung und dem bereits erlaubten Anschleichen für den einen Schlag. Der archivierte „LONG before Flame Lance“-Versuch an der ahnungslosen Glimmer Queen illustriert den Unterschied. Die alte Browsererwartung ließ den Zauber vor dem Rückzug ausführen. Der produktive .208-Pfad lehnt genau diese Eingabe vor Kosten und eigener Bewegung ab. Der Browsertest fordert den gespeicherten Ablehnungsgrund, unveränderte Ereigniszahl und Welt sowie als einzigen physischen Request den Planner.

Die Promptprojektion lässt eine vollständig abgewiesene Deklaration im sichtbaren Chat und im Audit. Für die Modelle fällt ihre Handlungsgeschichte aus der Projektion. Bei bereits eingetretener Gegnerreaktion behält die Projektion die gebuchten Fakten. In späteren Modellaufrufen gibt sie für den nicht ausgeführten eigenen Zug nur dessen Status weiter.

### User10 und der Aufwand je Eingabe

Mit demselben Präfix vor M27, derselben ursprünglichen Plannerantwort und demselben Seed wurden beide Versionen durch den Hostpfad verglichen. „Rückwärtssprung“ ist für die getestete Formulierung ein gewöhnlicher Bandschritt.

| Spielerabsicht | .207 lokal | .208 lokal |
|---|---|---|
| Board M11, identische archivierte Erstantwort | 1 Planner + 2 Boardrequests, keine Veröffentlichung | 1 Planner + 1 Boardrequest, vier Verträge |
| Arcane Wave im HUD und der ursprüngliche Bewegungssatz als freie Handlung | 1 Planner, kein Spielerereignis | 1 Planner, acht Ziele auf SHORT, anschließend Bewegung |
| Beide Schritte vollständig im HUD | .207 kennt diese Eingabeform nicht | 0 Planner. Wave zuerst trifft auf SHORT, Schritt zuerst ergibt MEDIUM. Beide Varianten treffen hier acht Ziele. |
| Nur Arcane Wave wie beim tatsächlichen letzten Angriff | 0 Planner, 49 Ereignisse, 0 HP und 58 MP | dieselben Werte, derselbe regelgerechte Tod |

Bei **beiden** klaren Kombinationsvarianten kostet Wave unter diesem Seed einmal 14 MP, die acht Gegner bleiben tödlich. Das andere Ende des unten dokumentierten Mock-Spielbogens stammt aus einem anderen Kampf. Im tatsächlichen .207-Lauf kostete der Planner #41 für die gemischte M27-Eingabe 13.522 Inputtokens, 80 Outputtokens und 45,557 s. Ein vollständig gewählter HUD-Zug spart den entsprechenden Planner. Für die ursprüngliche gemischte Eingabe bleibt der Aufruf erhalten. Die beiden lokal gebauten Plannerrequests für M27 messen im Nachrichteninhalt 13.496 gegenüber 13.565 GLM-Tokens (+69 für .208). Der Tokenizer hat SHA-256 `19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d`. Providerabrechnung, Chattemplate und lokal gezählter Inhalt haben unterschiedliche Messgrenzen. Die Weltverarbeitung nach einem erfolgreichen eigenen Zug benötigt weiterhin Narrator und Extractor. Eine natürliche Gesamtzeit bis zur nächsten sicheren Eingabe auf .208 ist offen.

Im finalen ST-Standardlauf lagen Weltcommit, bestätigter Read-back und sichere Eingabefreigabe bei der Vierertafel 845/898/906 ms nach Senden. Der vollständige Erstentwurf lag bei 806/885/894 ms und der Mockfall mit zweitem vollständigem Boardrequest bei 754/812/818 ms. Das sind Einzelmessungen auf .208 mit geskriptetem Extractor (300 ms). Sie belegen die Reihenfolge der Freigabe. Daraus lässt sich keine Beschleunigung beim echten Modell berechnen.

### Node-Abnahme

Die vollständige Suite bestand auf dem zweiten Etappenstand mit 3.472/3.472 Tests und null übersprungenen Fällen. 19 der neuen Prüfungen gelten der geordneten Kampfphase. Sie decken beide Reihenfolgen, reinen HUD- und Mischtextpfad, fehlendes Ziel oder Objekt, MP/STA, Schadensfaktor, Ablauf des Schutzes, Guard-Proficiency, Unterbrechung, alten Kampftod, Swipe, Regenerate und Reload ab. Ein zusätzlicher Rotfall zeigte, dass ein im Charakterinventar geführter Heiltrank anders als ein Weltobjekt vom bisherigen Kombinationspfad nicht erkannt wurde. Die Korrektur nutzt dieselbe Katalogreferenz wie das HUD und belastet die vorhandene Inventarbuchung einmal. Der mechanische Test für freundliche Ziele im Bereich eines geworfenen Gegenstands besteht ebenfalls.

### Replay und Spielqualität

Das Replay vergleicht die Originalpräfixe unabhängig mit dem historischen Fingerprintbestand (.126). Etappe 2 verändert gegenüber Etappe 1 genau 76 Ausgaben. Jede hat im Manifest einen eigenen Fall, neuen Hash und fachlichen Grund. 15 betrafen bereits im älteren Manifest erfasste Abweichungen. Zusammen mit den fünf Tagesboards ändern sich gegenüber .207 insgesamt 81 Fälle. Der Gesamtzähler 1.192 umfasst auch historische Änderungen vor .208.

Beispiele aus der Einzelfallprüfung:

- `b16-rogue-sale#59` trifft nach Annäherung mit Fan of Blades zwei Hunde. Die Gegnerantwort lässt 36 statt 49 HP übrig.
- `b17-mage#161` bewegt sich gezielt relativ zu einem Gegner. Zwei andere Gnolle wechseln dadurch ihr Band nicht.
- `b17-mage#189` trifft nach Annäherung zwei Gegner statt eines. Der Kampfzustand endet bei 104 statt 128 HP.
- `b17-rogue#141` und `b18-rogue#309` enthalten zusätzliche Vorbereitung bzw. Abwarten. Die Engine verlangt eine getrennte Klärung der Mehrfachdeklaration. Diese Einschränkung kann einen zusätzlichen Spielerzug kosten.
- Ein anderer HP-Ausgang nach bewusst veränderter Zielmenge oder Reichweite ist in diesen Fällen mechanisch begründet. Das ursprüngliche tödliche User10-Ergebnis bleibt als eigener unveränderter Einzelschritt-Referenzfall erhalten.

### Gemeinsame Abnahme und verbleibende Fragen

| Isolierter ST-1.19.0-Lauf | Bestandene Prüfungen | Browserfehler |
|---|---:|---:|
| Etappe 1, Tagesboard und Schaden | 57/57 | 0 |
| Standard mit sämtlichen vorgesehenen Modulen | 373/373 | 0 |
| Failsoft mit absichtlich gestörten Requests und Speicherung | 379/379 | 0 |
| Durchgehender Spielbogen mit zusätzlicher Prüfung der späteren Prompts | 75/75 | 0 |

Die vollständige Node-Suite (3.472 Tests) und die 2.235 Replayfälle wurden auf dem gepushten Etappen-2-Commit erneut erfolgreich geprüft. Der durchgehende Browsertest lief vor dem zweiten Commit und nochmals auf dessen verifizierter SHA. Beginn ist der User09-Präfix an der Gilde. Der Mock liefert die User10-Erstantwort für die Tafel. Danach folgen HUD-Annahme von Mossback Warrens, Anreise, Furt, Brücke, Dungeoneintritt und der kombinierte Kampfzug. Jeder der acht Züge erreichte einen angewandten Extractor und vollständigen Read-back aus der ST-Chatdatei. Nach dem letzten Reload stimmten Weltzustand, aktive Quest und Ereignisse überein. Endstand 18 HP, 58 MP. Die acht Züge benötigten 23 durch den Mock angenommene Generierungsrequests, davon sechs Planner, ein Board, acht Narrator und acht Extractor. Einrichtung und separate Gegenproben zählen nicht zu diesen 23.

Die zusätzliche ST-Gegenprobe beginnt vor dem nächsten Zug im User10-Original, nachdem die verworfene Erklärung und der Hinweis bereits im Chat stehen. Der Originaltext ist im Chat-Audit erhalten. In den tatsächlich eingegangenen Planner-, Narrator- und Extractorarrays des Folgezugs ist der verworfene Rücksprung nicht enthalten. Die tabellarischen Browserzahlen und Prüfergebnisse sind im [Maschinenprotokoll](abnahme_208/st-mock.json) hinterlegt.

Der erste Standard-/Failsoft-Durchlauf fiel wegen der veralteten Erwartung für die Glimmer Queen durch (370/371 bzw. 376/377). Das Originalpräfix zeigte den echten Hinterhalt. Die neue Prüfung bestätigt den konkreten Grund, null eigene Kosten und null Narrator-/Extractoraufrufe. Alle übrigen Prüfungen bestanden bereits im ersten Lauf.

**Technisches GO für einen persönlichen .208-Test nach unabhängigem Diffreview.** Der sinnvolle Naturaltest ist ein neuer Spielzug mit eingeklappter Charakteransicht, Vierertafel bei passender Erstantwort und einem bewusst gewählten Ausweich- oder Rückwärtsmanöver. Lesbarkeit, die Zuverlässigkeit neuer natürlicher Plannerformulierungen, Kampfgefühl und sichere Wartezeit sind weiter offen. Ein gescheiterter persönlicher Angriff oder ein tödlicher Rückzug allein ist kein Regelverstoß. Die Spieldaten auf .207, der eingefrorene Produktstand und die persönliche Installation wurden nicht verändert.

- Entwicklungsbranch `experiment/208-board-hazard-main-minor`, Etappe 2 und Schlussstand [`cb1eb944a041b26be9210199d780be9ff740f74d`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cb1eb944a041b26be9210199d780be9ff740f74d).
- Einzelne Replayabweichungen mit Begründung und Hash stehen in den [fünf Boardfällen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cb1eb944a041b26be9210199d780be9ff740f74d/avereth-engine/tests/replay/accepted_daily208.json) und [76 Kampffällen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cb1eb944a041b26be9210199d780be9ff740f74d/avereth-engine/tests/replay/accepted_phase208.json).
- Nachspiele mit archiviertem Eingabepräfix stehen in den [Board- und Hindernistests](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cb1eb944a041b26be9210199d780be9ff740f74d/avereth-engine/tests/v4/user09_10_daily.test.js) und [Kampfphasentests](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cb1eb944a041b26be9210199d780be9ff740f74d/avereth-engine/tests/v4/user10_phase208.test.js). Der [ST-Spielbogen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cb1eb944a041b26be9210199d780be9ff740f74d/avereth-engine/tools/st_live/board159_smoke.mjs) bedient die echte Oberfläche.

### Nachspielen in einer isolierten Umgebung

Ab dem Verzeichnis `avereth-engine/` des jeweiligen Codecommits lassen sich die archivierten Eingaben und die Tests ohne Modellzugang ausführen. Der Browserlauf verwendet die markierte Sandbox mit eigener Datenwurzel gemäß Projektarbeitsweise. Node 24.22.1, Chromium 156.0.8078.79 und SillyTavern 1.19.0 bei `7e8663cd9c184a550b37238218bdd32c6efc68e9` wurden verwendet.

```sh
node --test tests/v4/user09_10_daily.test.js tests/v4/user10_phase208.test.js
npm test
npm run replay:check
npm run smoke:st:check
npm run smoke:st:isolated
npm run smoke:st:isolated -- --mode journey208
```

### Dateien für eine vorhandene .207-Installation

Aus dem abgenommenen Experimentcommit die folgenden Pfade relativ zum vorhandenen Extensionordner `avereth-engine/` kopieren. Die erste Zeile umfasst beide Versionsmetadaten.

```text
manifest.json
package.json
src/action_composer.js
src/action_input.js
src/combat.js
src/display.js
src/engine.js
src/host.js
src/skills.js
src/util.js
src/v4/commands.js
src/v4/features.js
src/v4/guild.js
src/v4/planner.js
src/v4/runtime.js
src/v4/scene_handles.js
```

Der Importumfang für Preset, Lore und Character Card ist leer. Zum Verifizieren nach dem vom Nutzer entschiedenen Wechsel die Extension neu laden und die Buildkennung prüfen. Die persönlichen Datenwurzeln wurden im Test nicht benutzt.
