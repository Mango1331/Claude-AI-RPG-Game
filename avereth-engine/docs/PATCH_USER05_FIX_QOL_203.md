# .203 — User05: HUD-Bindung, Weltabschluss und gemeinsame Bedienung

18.11.2026 · Entwicklungsbranch `experiment/action-hud-200-v1` · Ausgang `6a92dcc650809eb16934a984c30ce0cf7c5cfe98` (.202).

Auftrag und Abnahmegrenzen: [unabhängiger User05-Gegenreview, §8](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/866b2a9/recherche/GEGENREVIEW_USER05_ACTION_HUD_202_FIX_QOL_2026-11-18.md). Produkt `.200 / 0cd1480`, `main` und User05-Originale bleiben unverändert. Keine natürlichen Provideraufrufe, kein Merge, keine Freigabe des persönlichen User06-Spieltests durch diese technische Abnahme.

## Behobene Ursachen

### 1. Ein eindeutiger F-Vertrag statt fünf verworfener Originalantworten

`plannerRequest` nennt das vollständige äußere Antwortobjekt mit `commands` und **root** `hud_binding`. `normalizeHudBinding` hebt ausschließlich eine einzelne, eindeutig auf ihren Command bezogene verschachtelte Bindung an diese Stelle. Weder ID, Entscheidung, Sequenz, Ziel noch Fähigkeit werden ergänzt oder geändert. Konkurrierende Bindungen, falsche IDs/Ziele, doppelte Sequenzen, Bedingungen ohne gültigen Vorgänger und widersprüchlicher Text bleiben Verweigerungen. Eine doppelte Sequenz `[1,1]` wird zusätzlich ausdrücklich abgewiesen.

Die validierte Bindung wird mit dem Plan gespeichert und bei einer zulässigen Wiederaufnahme erhalten. Ältere gespeicherte Planantworten können ihre vorhandene Bindung durch denselben Parser zurückliefern. Keine neue Autorität, kein zusätzlicher Modellrequest und kein automatisches Wiederholen fehlgeschlagener natürlicher Eingaben.

Beleg: die sechs unveränderten Plannerantworten I42/I44/I46/I48/I50/I52 aus User05. Vor der Korrektur scheitern fünf an der verschachtelten Form; I44 war bereits gültig. Alle sechs passieren danach die bestehenden Fachprüfungen. Im Browser wird nur die Auswahl-ID auf die frische tatsächliche Hosteingabe umgebunden; die übrige Originalantwort bleibt erhalten.

### 2. Ein abgeleiteter Abschlussstatus

`action_status.js` führt die vorhandenen Zustände zusammen: unbekannter Remoteabschluss bzw. Speicherfehler, laufender Worldjob, Savequeue, offener/fehlgeschlagener Weltabschluss, sonst aktuelle Phase. Ein nativer Zwischensave darf bei offenem Worldjob kein „Gespeichert“ ausgeben. Nach dem Entfernen des Worldjobs und nach dem Leeren der Savequeue wird die Anzeige ohne weiteren Klick aktualisiert.

Der Recoveryknopf erscheint bei tatsächlich offener Fehlerbehandlung, nicht als Aufforderung während des normalen Weltabgleichs. Schreiben bleibt möglich; ein neuer Versand wartet auf den Abschluss. `.202`-Ursprungsbindung, vollständige Snapshotprüfung, echte Saves und Read-back bleiben bestehen. Kein verworfener nativer Save wird als erfolgreicher `superseded`-Save bestätigt.

Der Gesamt-Smoke hat zusätzlich eine echte Überschneidung gefunden: Ein schneller Extractor konnte vor dem Ende des nativen Streaming-Abschlusssaves den Chat ändern. Dessen bereits eingefrorener Snapshot wurde dann korrekt mit `Stale origin or records before write` verweigert. Eine unabhängige Gegenprobe mit den Original-I34-Daten reproduziert exakt diese Ablehnung. Der Host wartet nun **unmittelbar vor dem Weltcommit** auf bereits laufende native Saves (`isChatSaving`, einschließlich Kompression) und die bestehende Engine-Savequeue. Die Extraktion selbst darf parallel laufen. Anschließend werden Ursprungszugehörigkeit/Stop/Textrevision erneut geprüft. Kein neuer Save, kein Retry, kein Erfolgsersatz für einen verworfenen Snapshot. Der neue Browserfall hält gezielt den nativen Vorab-Read-back fest, lässt die Extractorantwort eintreffen und prüft die Reihenfolge bis zum echten Reload.

Zur lokalen Diagnose protokolliert jeder beendete Worldjob Extraktion/Validierung einschließlich etwaiger Save-Wartezeit, anschließenden Save/Read-back und Gesamtdauer sowie `record_changed`, `persisted` und den Extraktionsstatus. Diese Hostzeiten sind keine zusätzlichen Weltevents und kein neuer Persistenzzustand.

### 3. Kurzer Weg über das bestehende Combat-HUD

- Im laufenden Kampf sind die vorhandenen Skill- und Gegnerbuttons die Eingabefläche. Ergänzt werden Bewegung, verwendbare Gegenstände, Annäherung und die aktuelle Auswahl mit „Aktion senden“. Historische Kampfpanels sind keine weiteren aktiven Eingabeflächen.
- **Skill → Ziel → senden**, ohne gesondertes Übernehmen. Ziel → Skill bleibt ebenfalls möglich. Ein Zielklick allein wählt niemals eine Angriffsfähigkeit. Eine reine mechanische Auswahl ohne getippten Text benötigt keinen Planner.
- Der normale ST-Textbereich bleibt die Eingabe für freies Rollenspiel. Bei zusätzlichem Text gilt weiterhin F oder der ausdrücklich gewählte, sichtbar gemerkte H-Modus. F plant Auswahl und Text gemeinsam; H führt nur die Auswahl mechanisch aus. Freitext ohne HUD bleibt vollständig möglich.
- Vor Kampfbeginn liefern die bestehenden Scene Handles „Crystal Beetle A–D“ statt interner IDs. In der Gilde erscheint keine dauerhafte taktische Bedienung; zusätzliche Aktionen bleiben aufklappbar.
- `target_band`-AoE wählt das Entfernungsband und zeigt die von der bestehenden Kampfprüfung ermittelten Ziele. Intern bleibt ein vorhandenes Ziel der Anker derselben Engineaktion. Keine Änderungen an Reichweiten, neutralen Beteiligten, Initiative, Kosten, Schaden oder Würfeln.
- Das Itemangebot dedupliziert Objekt-/Inventaraliase und bietet konkrete Trank-, Angriffsgegenstands- sowie außerhalb des Kampfes gültige Steinaktionen. „Guild Plate benutzen“, Pouch und Körpermaterial erscheinen nicht als inhaltslose Standardaktionen. Erzählerische Nutzung solcher Dinge bleibt im Freitext möglich.

Der Versandknopf klickt ausschließlich den vorhandenen ST-Sendeknopf. Reservierung → `MESSAGE_SENT` → Ursprungs-Save/Read-back → vorhandener Interceptor → Engine/Narrator/Extractor bleibt die gemeinsame Kette. Weder DOM-Buttons noch UI-Vorschauen buchen Ereignisse. Vorschauen laufen auf Kopien.

### 4. Questboard ohne zusätzliche Eingabezeremonie

„Annehmen“ trägt die vorhandene Quest-ID als typisierte Aktion. Die Vorschau und die tatsächliche Ausführung benutzen denselben bestehenden `quest.accept`-Handler; Zugehörigkeit, Ort, Tagesboard, Status und Doppelannahmen werden nicht parallel nachgebaut.

Ohne Textentwurf führt ein Klick über den normalen ST-Versand zur Annahme, ohne Planner. Mit vorhandenem Text wird nur die Auswahl vorgemerkt; der Text bleibt unverändert, der Spieler sendet selbst. Ein zweiter Klick erzeugt keine zweite Annahme. Die normale Freitextannahme funktioniert weiter.

Der aktuelle Character-Description-Vertrag nimmt bereits von der Engine angezeigte Listen ausdrücklich von der allgemeinen Pflicht aus, Auswahlmöglichkeiten in der Narration vollständig aufzulisten. Die Gildenkarten sind die offizielle Liste; der Narrator darf Szene, Gespräch und Bewertung frei gestalten. **Ob ein natürliches Modell diese Vorgabe immer beachtet, ist nicht bewiesen.**

### 5. Kleine fachliche Kontextkorrekturen

- I34: Eine kurze `scene:{new:"Name"}` darf nur dann dieselbe vollständige Referenz übernehmen, wenn genau ein erfolgreicher erwarteter GO und genau eine Ankunft dieselbe schema-gültige vollständige Referenz enthalten. Kein Erraten von Elternort/Typ, keine neue Ankunft, keine Zusammenlegung mehrerer Reiseziele. Verneinte/unvollständige/mehrdeutige Meldungen bleiben außerhalb dieser Normalisierung; danach gelten die üblichen Weltprüfungen. Ein lügender Extractor wird dadurch nicht allgemein semantisch sicher.
- Der Narrator erhält bei relevanter aktiver Dungeonquest die bereits gespeicherte Zielbeschreibung, insbesondere die bekannte Richtung von Glimmerdeep. Kein Umbau der Ortsstruktur.
- Der Dungeonkontext nennt knapp die tatsächlich vorhandenen Kreaturen und die vorhandene Slotquelle. Zusätzliche Phantomgegner bleiben nicht gebuchte Erfindungen; Kulisse, Dialog und gewöhnliche Weltreaktionen bleiben frei.
- Die Beschreibungen der bestehenden Band-AoEs stimmen mit der bereits geltenden Gegner-/expliziten-NPC-Auswahl überein. Nur Beschreibungstext, keine Mechanikänderung.
- Der Boardgenerator hatte die zulässigen Intro-Körpergrundgerüste bereits im ersten Prompt. Ergänzt wird nur die ausdrückliche Klarstellung, keine unpassende Spezies umzubenennen oder feste Werte abzuschwächen, um diese Vorgabe zu erfüllen. Keine zweite Liste, keine neuen Gegner und keine abgeschwächten Prüfungen. Ob dies natürliche Boardrepairs vermeidet, bleibt unbewiesen.

## Installation und tatsächliche Requestpfade

Build `4.3.0-c.6.6.203`. Extension wie gewohnt aktualisieren. Die **tatsächlich verwendete Character Description** durch `content/narrator/Avereth_Narrator_Contract_v4.txt` dieses Builds ersetzen; die Revisionserkennung warnt bei einer alten Karte. Das Preset wird nicht verändert.

| Eingabe | Regulärer physischer Pfad im geprüften Browser |
|---|---|
| Nur eindeutige HUD-Auswahl, kein Freitext | Narrator → Extractor |
| HUD + ausdrücklich gewählter H-Begleittext | Narrator → Extractor |
| HUD + F-Text | Planner → Narrator → Extractor |
| Eindeutige Questannahme, kein Textentwurf | Narrator → Extractor |
| Questauswahl mit Freitext | F/H entsprechend sichtbarem Modus; kein automatisches Senden |
| Reiner Freitext | bisheriger Planner-/Narrator-/Extractorpfad |
| Erneuter Save/Read-back nach Fehler | kein Modellrequest, keine zweite mechanische Auflösung |

Kein pauschales Überspringen des Extractors. NPC-Zusagen, neue Weltinformation und die bisherigen Memoryprüfungen bleiben im regulären Weltabschluss. Plan- und Extraktionsrepairs werden hier nur für die belegten Form-/Kontextursachen vermieden. Bei unbekanntem Remoteabschluss bleibt die vorhandene explizite, begrenzte Wiederaufnahme maßgeblich.

## Technische Abnahme

Die detaillierten Ergebnisse stehen in `USER05_203_TECHNICAL_RESULTS.json`. Die abgeleitete, komprimierte Testfixture enthält Originalantworten und Originalzustände; ihre Herkunftshashes verweisen auf die unveränderten Quellen auf `main`. Synthetische Ergänzungen (defensive Fähigkeit, Trank, verzögerte/fehlerhafte Speicherantworten) sind im Browsertest ausdrücklich markiert.

- Rot: fünf der sechs Originalbindungen abgelehnt; doppelte Itemaliase bzw. unbrauchbare Itemangebote reproduziert. I44 bereits vor dem Fix positiv.
- Gezielte Regressionen: **64/64 bestanden**; sechs Originalbindungen, Autoritätsgegenfälle, Bedingungen/Negation, Wiederaufnahme, lesbare Ziele, Bandvorschau, Questannnahme über Originalhandler, I34 im vollständigen Weltpfad mit genau einem Request und negative Referenzfälle, Status und asynchroner Jobabschluss. Vorhandene Action-/Save-/Memoryregressionen bleiben enthalten.
- Vollständiges `npm test`: **3.398 bestanden, 0 fehlgeschlagen**.
- Vollständiges `npm run replay:check`: **2.235 Fälle, 0 neue/nicht akzeptierte Abweichungen**. Die 1.131 schon vorher einzeln akzeptierten Abweichungen gegenüber der alten `.126`-Basis bleiben exakt dieselben; keinerlei Änderung an Baseline, Akzeptanzdatei oder Testoriginalen.
- Echte isolierte SillyTavern-1.19-Tests: abschließende gezielte User05/PULSE/Save-/Native-Save-Wiederholung **108/108**, 0 PageErrors, einschließlich der tatsächlich gesendeten Vertragsfassung. Vollständiger Standard: **337/337**, Failsoft: **343/343**, jeweils **0 PageErrors**, keine fehlgeschlagene Prüfung.

Abschlussberichte in der isolierten Sandbox:

- Gezielt: `out/2026-11-18T06-23-27-380Z/report.json` (108 Prüfungen).
- Gesamt: `out/2026-11-18T06-26-07-166Z/report.json` sowie `report.md`, `standard/run.log`, `failsoft/run.log`; Standard 717 s, Failsoft 738 s. Je Modus liegen außerdem die einzelnen Prüfergebnisse, UI-Screenshots und Worldjobzeiten vor.
- Host: ST **1.19.0 / 7e8663cd**, Node **24.22.1**, Chromium **156.0.8078.79**. Preflight erfolgreich. Die Abnahme lief vor dem Commit auf dem unveränderten `.203`-Arbeitsstand; die SHA-256-Werte der 28 Code-/Testdateien im Abnahme-JSON verbinden diesen Stand mit der Lieferung. Dokumentationsdateien sind von dieser Selbstreferenz ausgenommen.

Die Sandbox ist `/workspace/avereth-setup/st-sandbox`, ausschließlich mit Dummy-Key/Mockprovider. Keine persönliche ST-Installation. `AVERETH_CHROMIUM_EXECUTABLE=/usr/bin/chromium` erlaubt den vorhandenen Systembrowser für Preflight und Runner, ohne eine Neuinstallation zu erzwingen. Reproduzierbar mit `AVERETH_ST_SANDBOX=… AVERETH_CHROMIUM_EXECUTABLE=… npm run smoke:st:check` und `npm run smoke:st:isolated`; `--mode user05` prüft die neuen Browserfälle gesondert.

Gezielte Nodeabnahme aus `avereth-engine/`:

```sh
node --test tests/v4/action_input.test.js tests/v4/action_persistence.test.js tests/v4/patch10b4c2_world_jobs.test.js tests/v4/user05_qol.test.js
```

`--mode native_world` erzwingt den Streaming-Save-Konflikt gesondert. Die normale Gesamt-Abnahme enthält diesen Fall zusammen mit User05 und allen zuvor vorhandenen Standard-/Failsoftmodulen. Eingespritzte Speicherfehler sind im Ergebnis separat ausgewiesen; echte Browser-PageErrors werden unverändert gezählt.

Entwicklungsabweichungen: Der erste Browserversuch entdeckte STs `custom-`-Klassenpräfix an der tatsächlichen Combat-Oberfläche; beide Klassenformen werden jetzt berücksichtigt. Ein verzögerter Playwright-Routehandler wurde im Test zu früh entfernt und verursachte einen Runnerfehler, keinen Engine-PageError; der Test wartet jetzt auf die abgeschlossene Route. Der erste Gesamt-Standardlauf fand außerdem zwei berechtigte PULSE-Kontextfehler: Die neue allgemeine Dungeonzeile verwies auch beim Wanderereignis bzw. unterbrochener Rast auf `DUNGEON AHEAD`, obwohl dort kein solcher Reiseauftrag vorlag. Die Zeile verweist jetzt neutral auf das tatsächlich gelieferte Engineereignis; die negativen Smokeprüfungen bleiben unverändert. Ein alter Boardtest erwartete noch Textanhängen und wurde auf die freigegebene Annahmebedienung umgestellt, einschließlich Escaping, doppelter Titel und Entwurfsschutz. Im erweiterten Failsoftlauf wurde zusätzlich ein horizontaler Überlauf der ausgewählten Kampfaktion bei 390 Pixeln gefunden; der Controlcontainer und sein Modusfeld passen sich jetzt der verfügbaren Breite an. Diese fehlgeschlagenen Zwischenläufe sind keine bestandene Abnahme.

Im zweiten Gesamtlauf bestanden die Fachprüfungen, aber Standard **330/331** und Failsoft **336/337** scheiterten jeweils an einem PageError durch den oben beschriebenen nativen Savekonflikt. Die Lösung ist die Serialisierung des Weltcommits, keine Lockerung der Snapshotprüfung oder des Abnahmekriteriums. Die zusätzliche direkte Browsergegenprobe besteht mit **31/31, 0 PageErrors**.

Ein weiterer Zwischenlauf brach in der Teststeuerung ab: Der neue Barkscorpion-Savefall lief hinter einem Modul, das bereits die Warden-Testszene geladen hatte. Die Engine verweigerte das falsche Ziel korrekt; `failure.json` enthält keine PageErrors. Der Test steht jetzt vor diesen Fixturewechseln und verweigert selbst eine fehlende Ausgangsszene. Sein Antwort-Listener behandelt auch eine spätere Browser-Schließung, statt den ursprünglichen Gatefehler zu überdecken. Der verwaiste eigene Sandboxserver wurde nach Prüfung seines Arbeitsverzeichnisses beendet; keine Installation oder Quelldatei wurde gelöscht. Auch dieser Lauf ist keine bestandene Abnahme.

## Performance: Messung und Grenzen

Historischer User05-Beleg aus dem Gegenreview: 64 physische Requests (23 Planner, 19 Narrator, 20 Extractor, 2 Board), 772.826 Prompttokens, 17.785 Ausgabetokens; gemeldete Cachetokens durchgehend 0. Phase-C-Mediane: Planner 6,847 s, Narrator 23,907 s, Extraktorjob 38,613 s. I34 benötigte zwei Extraktorantworten (21,303 + 19,931 s). Die fünf zusätzlichen F-Versuche waren Spielerversuche, keine automatische Engine-Retrykette.

Der Browsernachweis zählt vollständige physische Requests und misst die Länge des vollständigen `messages`-JSON am lokalen Mockendpoint. Das sind **UTF-16-Zeicheneinheiten des serialisierten Nachrichtenarrays, keine Tokens**, ohne Transportrahmen/Headers; künstliche `usage:1` des Mockproviders wird nicht als Tokenmessung ausgegeben. Save-/Weltzeiten enthalten lokale Hostarbeit und absichtlich injizierte Verzögerungen. Sie sind kein Featherless-Latenzbenchmark. Die Rohmessungen werden im Abnahme-JSON festgehalten.

Tatsächliche Messung aus dem gezielten Abschlusslauf `2026-11-18T06-23-27-380Z` (UTC):

| Fall | Physische Requests | Nachrichten-JSON je Phase, UTF-16-Einheiten |
|---|---:|---|
| Eindeutige Questannahme | 2 | N 59.355; X 62.427 |
| Reine HUD-Aktion, künstlich verzögerter X | 2 | N 58.067; X 60.248 |
| Jede der sechs ursprünglichen F-Antworten | 3 | P 26.563; N 57.977; X 60.248 |

Der letzte Fall benötigt keinen Bindungsrepair. Der getrennte I34-Originaltest schließt den Weltpfad mit **einem** X-Request ab, wo der natürliche Ursprung zwei Antworten benötigte. Im gezielten Browserlauf waren N streamend mit Testlimit 1.200 und P/X nichtstreamend mit 2.000/4.000 Ausgabetokens; das bestehende Produktpreset bleibt unverändert. Die lokalen Weltabschlüsse der sechs F-Fälle dauerten 516–590 ms, davon 175–240 ms Save/Read-back. Das sind ausschließlich Mock-/Hostmessungen dieser Umgebung, keine erwarteten Providerzeiten und kein Cache-Nachweis.

Belegt sind die eingesparten **Phasen im jeweiligen Hostpfad** und die vermiedene erneute Forminterpretation, nicht eine bestimmte natürliche Zeitersparnis oder weniger NPC-Fehler. Für natürliche Sprache, F-Mischhandlungen und neue NPC-/Weltinformationen bleibt Modellinterpretation erforderlich. Ein kürzerer Klickweg ersetzt keine natürliche User06-Abnahme.

## Restrisiken und Grenzen

- Narratorfreiheit und NPC-Memory bleiben erhalten. Phantomkreaturen, wiederholte Boardlisten, übergangene Richtungshinweise oder falsch verstandener F-Text können natürlich weiterhin auftreten. Die technischen Gegenfälle beweisen keine allgemeine Sprachsicherheit.
- Der bewusst gemerkte H-Modus behandelt zusätzlichen Text als Rollenspiel. Weitere mechanische Absichten müssen in F eingegeben werden; die sichtbare Modusanzeige bleibt wesentlich.
- Diese Runde verändert weder Dungeon-Slots/Ortsgranularität noch Gegnerbewegung, Balance, Loot oder Kampfregeln.
- ST-Nachweis gilt für die isolierte 1.19-Instanz und diesen Mocktransport. Keine allgemeine Zusicherung für andere Extensions, Hostversionen oder Provider.
- Erst unabhängiger Produktdiffreview, danach separate Freigabe einer neuen User06-Kampagne. Kein Merge in den eingefrorenen Produktbranch.
