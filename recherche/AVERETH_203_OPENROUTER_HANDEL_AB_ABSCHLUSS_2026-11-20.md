# Natürlicher OpenRouter-Handelstest · B3 gegen Zyklus 3

**Bedingtes GO für den kürzeren Ausrüstungskatalog.** In allen sechs natürlichen Plannerpaaren sank der von OpenRouter gezählte Input bei sonst identischen Nachrichten um genau 121 Tokens. Die acht gespeicherten Warenangebote hatten auf beiden Pins die vom Artikel und seiner Qualität vorgegebenen Werte. Der in B beobachtete Zeitbedarf bis zur sicheren Eingabe war im Median der Paardifferenzen 12,726 Sekunden länger. Für eine allgemeine Aussage über gleichwertige Spielqualität reicht insbesondere der Kampfversuch nicht aus.

## Vergleichsaufbau

A war B3 bei `6d9770f9b31e78d37567719bf1c06d8a4942288c`, B der Katalog aus Zyklus 3 bei `25c46bc9d342c9ed6cf87f8ac59e11c85ab4de18`. Beide isolierten ST-1.19.0-Hosts liefen mit `7e8663cd9c184a550b37238218bdd32c6efc68e9`, eigenem Datenverzeichnis und Browserkontext. Originalkarte, Lore, Preset, Welt und Eingabe waren je Paar identisch. Jede Wiederholung begann in einer eigenen Kopie des Seeds. Alaric fragt im ersten Fall nach einem verbindlichen Handaxtpreis, im zweiten nach einem Turmschild mit ausstehendem Gildensiegel. Im dritten fragt er Nessa während einer Begegnung nach einem Drachenschild, einem roten Tuch als Geschenk und einer Zusage, die Gilde zu warnen. Das bereits im Seed vorhandene blaue Tuch und die Verabredung an der alten Furt zählen nicht als neue Erfolge.

Alle neuen Planner-, Narrator- und Extractorantworten einschließlich Repairs stammen von `z-ai/glm-5.3-flash` über `https://openrouter.ai/api/v1/chat/completions`. Der Transport war auf `wafer/us` festgelegt, Fallbacks waren aus. Beide Arme verwendeten natives Streaming ohne Smooth, `reasoning.effort=low`, Narrator 0,9 / Top-p 0,95 / 4.096, Kontext 131.072 und den ursprünglichen Extractorvertrag. Der feste Testspieler benötigte keine Modellanfrage. Zeit- und Kostenvergleiche beziehen sich allein auf diesen OpenRouter-Lauf.

## Abschluss und Verbrauchskontrolle

Der alte Request 9 wurde 94 ms nach dem lokalen Versand bei Wafer angelegt. Die vom Nutzer zugeordnete ID, Zeitpunkt, Modell, Streaming und Anbieter stimmen überein. OpenRouter bestätigt `cancelled=true`, Anbieterstatus 499, 14.778 Inputtokens, vier Outputtokens (alle Reasoning), 0,000621412 USD und keinen Finish-Grund. Der alte unvollständige ST-Turn bleibt ein Fehlschlag. Die ursprünglich angenommenen 12.642 Inputtokens stammten aus einer anderen Antwort und waren für die Identifikation ungeeignet. Die neun alten Requests kosteten somit 0,002392680 USD. Der Neustart behielt trotzdem das strengere Limit von 51 Requests / 0,453434876 USD bei. [Einzelabrechnung](openrouter_handel_203/natuerlicher_neustart/settlement_9.json)

Beim ersten neuen Canary stoppte der Proxy nach Planner und Narrator wegen einer weiteren Choice nach Stop. OpenRouter bestätigte für beide den Abschluss und zusammen 0,001166800 USD. Sie wurden gegen das Restbudget gerechnet. Im folgenden Canary zeigte das aufgezeichnete Original-SSE einen gültigen ersten Stop mit zusätzlichem `reasoning:null`, gefolgt vom leeren Stop im Usage-Paket. Der korrigierte Testproxy belässt die erste Choice vollständig im Stream. Er entfernt nur den leeren Abrechnungs-Choice unmittelbar nach dem Stop derselben Generation. Zusätzlicher Content, neues Reasoning, Fehler oder fehlendes DONE werden weiterhin verworfen. Die Einzelframes des ersten abgewiesenen Canary wurden noch nicht aufgezeichnet. Der Runner toleriert den vorläufigen Status `extraction.status=incomplete` während des Streams. Eine abgewiesene Revision erkennt er am abschließenden Unvollständigkeits-Hinweis der konkreten Antwort bei ausgeblendeter Stop-Steuerung. Ein offener Transport- oder Speicherfehler sperrt die Fortsetzung. Sieben lokale Tests bestanden. Die Engines und ihre Streamingprüfung wurden unverändert verwendet.

Der erfolgreiche A-Canary benötigte drei echte Requests. Die erste Prosa war nach 5,056 s sichtbar, die sichere Eingabe nach 8,966 s möglich. Die Engine bestätigte den Weltcommit und das Speichern, der Runner las den gespeicherten Chat vollständig zurück, lud ihn neu und verglich Zustand und Ereignisse. Nessa bot die feine Handaxt für 14 Kupfer an, die Engine speicherte 140 Kupfer als verbindlichen Preis. Erst danach begann Paar 1.

## Lesart der Messungen

Die Zeiten starten beim Sendeklick. Die erste Prosa misst einen vollständigen Satz im sichtbaren Bereich des Chats. Die letzte Änderung des erfassten Nachrichtentexts kann eine abschließende Host-Aktualisierung enthalten und bildet deshalb eine obere Grenze für die vollständig sichtbare Prosa. Die sichere Eingabe verlangt bestätigtes Speichern und freigegebene UI. Commit und Save-Read-back sind pro Revision im Audit getrennt ausgewiesen. Mittelwerte, Gruppenmediane, Paardifferenzen und alle physischen Requestdauern bleiben in den Messdaten verfügbar. Kosten stammen aus OpenRouter-Usage oder dem individuellen Abrechnungsbeleg. Reasoningtokens sind Teil des Outputs, Cachetokens Teil des Inputs. Kein Ausreißer wurde entfernt.


## Sechs vollständige Paare

Jeder ausgewertete Spielertext, die Anfangswelten und ihre Ereignisse stimmen innerhalb des jeweiligen Paars überein. Alle zwölf sichtbaren ersten Sätze kommen in den gespeicherten Antworten vor. In zwölf von zwölf Fällen bestätigte die Engine die Extraktion. Die Welt ließ sich aus dem zurückgelesenen Ereignislog vollständig und fehlerfrei reproduzieren. Die Zeit zur sicheren Eingabe endet vor dem separaten diagnostischen Reload.

| Paar | Szene / Reihenfolge | Erste Prosa A/B (s) | Letzte DOM-Änderung A/B (s) | Sichere Eingabe A/B (s) | Input A/B | Output A/B | Calls A/B | Repairs A/B | USD A/B |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Handaxt · A→B | 5,51 / 4,35 | 12,92 / 13,07 | 13,00 / 13,16 | 41.278 / 41.083 | 542 / 544 | 3 / 3 | 0 / 0 | 0,0018070 / 0,0018130 |
| 2 | Handaxt · B→A | 4,54 / 6,18 | 11,41 / 10,62 | 11,48 / 10,69 | 41.291 / 41.063 | 559 / 642 | 3 / 3 | 0 / 0 | 0,0017962 / 0,0018077 |
| 3 | Turmschild · A→B | 4,33 / 23,63 | 13,51 / 69,39 | 13,57 / 69,48 | 56.389 / 41.101 | 747 / 634 | 4 / 3 | 1 / 0 | 0,0024663 / 0,0018216 |
| 4 | Turmschild · B→A | 6,99 / 12,91 | 34,85 / 65,65 | 34,93 / 65,77 | 56.480 / 41.139 | 1.470 / 706 | 4 / 3 | 1 / 0 | 0,0026280 / 0,0018337 |
| 5 | Kampf und Handel · A→B | 10,47 / 19,52 | 16,97 / 26,70 | 23,48 / 30,83 | 32.669 / 32.419 | 871 / 753 | 3 / 3 | 0 / 0 | 0,0015324 / 0,0015002 |
| 6 | Kampf und Handel · B→A | 15,31 / 23,26 | 16,63 / 25,66 | 18,39 / 36,50 | 32.643 / 32.454 | 520 / 838 | 3 / 3 | 0 / 0 | 0,0014367 / 0,0015173 |

| Messgröße | Summe A / B | Gruppenmedian A / B | Median der Paardifferenzen B−A |
|---|---:|---:|---:|
| Erste Prosa (s) | 47,153 / 89,843 | 6,249 / 16,215 | 6,933 |
| Sichere nächste Eingabe (s) | 114,855 / 226,432 | 15,980 / 33,664 | 12,726 |
| Inputtokens | 260.750,0 / 229.259,0 | 41.284,5 / 41.073,0 | -239,0 |
| Outputtokens inkl. Reasoning | 4.709,0 / 4.117,0 | 653,0 / 674,0 | -55,5 |
| Reasoningtokens | 1.940,0 / 1.481,0 | 221,0 / 217,0 | 17,0 |
| Cachetokens | 151.296,0 / 92.992,0 | 28.192,0 / 16.960,0 | -9.792,0 |
| Physische Requests | 20,0 / 18,0 | 3,0 / 3,0 | 0,0 |
| Repairs | 2,0 / 0,0 | 0,0 / 0,0 | 0,0 |
| API-Kosten (USD) | 0,01166666 / 0,01029341 | 0,00180161 / 0,00181034 | -0,00001310 |


Die sechs abgeschlossenen Züge je Arm benötigten bis zur sicheren Eingabe im Mittel 19,143 s für A und 37,739 s für B. Der erste Satz erschien im Mittel nach 7,859 bzw. 14,974 s. Arm B in Paar 3 benötigte allein für die Narration 61,987 s, Arm B in Paar 4 für Narration und Extractor 22,957 bzw. 40,663 s. Die Providerzeiten und Cachemengen schwankten auch innerhalb dieser einen Route. Zwei Reparaturen in A erklären einen großen Teil der gesamten Inputdifferenz. Die sechs Paare erlauben keine kausale Latenz- oder Reparaturprognose.

**Direkter Katalogeffekt.** Alle 30 versendeten Planner-/Extractorarrays im Journal des erfolgreichen Canary und der Hauptserie enthalten genau einen Katalog, einschließlich der abgelehnten Anfrage und der Repairs. Ersetzt man im identischen Array nur diese Darstellung, spart B in 30/30 Fällen genau 121 GLM-Tokens. Für die 29 Antworten mit Input-Usage stimmt die lokale Zählung des tatsächlich verwendeten Arms exakt mit OpenRouter überein. Im natürlichen Plannervergleich meldete OpenRouter bei allen sechs Paaren exakt −121. In den sechs ersten Extractorantworten betrug B−A dagegen −74, −107, −107, −20, −89 und −68 Tokens. Der vorausgehende Narratortext war dort bereits verschieden. Der isolierte Katalogeffekt bei einem vollständigen Zug mit genau einem Planner und einem Extractor beträgt 242 Tokens. Für die tatsächlich erzeugten Folgeprompts, gesamte Kosten oder Wartezeit gibt es keinen solchen Festwert.

Von 26 physischen Maschinenantworten in den zwölf ausgewerteten Zügen waren 24 direkt als JSON lesbar. Zwei A4-Antworten hatten Markdown-Codezäune, die der bestehende Engineparser verarbeitet. Fachliche Korrekturen waren in A3 und A4 nötig. Alle zwölf Endrevisionen wurden angewandt, bei B6 mit zwei ausdrücklich abgewiesenen Einzeländerungen. Die ausgefallenen Versuche sind zusätzlich in der folgenden Abrechnung enthalten.

## Unterbrechungen und Gesamtabrechnung

Bei A5 verweigerte Wafer den Narrator nach einem abgeschlossenen Planner. Bei B6 verweigerte Wafer den Planner. Beide vollständigen HTTP-429-Antworten nannten die Überlastung des gemeinsamen Pools. Nach Prüfung der Ablehnung und Ablauf der Wartefrist begann jeweils nur der betroffene Zug in einem frischen Chat vom gleichen Seed. Die bisherigen erfolgreichen Züge und alle Journalzeilen blieben erhalten. A5 hat einschließlich des unterbrochenen Versuchs fünf physische Anfragen, B6 vier. Die Paarzeiten messen jeweils den abgeschlossenen Versuch. Die Zeit für Fehleranalyse, Wiederaufsetzen der Hosts und die drei separat ausgewiesenen Anfragen gehört zur Durchführung und wird nicht als Spiellatenz ausgegeben.

| Umfang | Physische Requests |
|---|---:|
| Alter Versuch einschließlich Request 9 | 9 |
| Zunächst abgewiesener neuer Canary | 2 |
| Erfolgreicher vollständiger Canary | 3 |
| Zwölf abgeschlossene Vergleichszüge | 38 |
| Zusätzlicher Planner und die zwei 429-Ablehnungen | 3 |
| **Kumulativ** | **55 von 60** |

Es wurden 46 neue Anfragen versandt. Die höchste gemessene Parallelität beim Neustart betrug eins. Die neu bestätigten Kosten betrugen 0,025168428 USD, kumulativ 0,027561108 USD. Die authentifizierte OpenRouter-Abfrage des Schlüsselverbrauchs nach Abschluss ergab ebenfalls 0,027561108 USD. Die beiden 429-Antworten enthielten keine eigene Kostenmeldung. Mit voller konservativer Reserve von 0,089202048 USD bleibt die obere Buchungsgrenze bei 0,116763156 USD von freigegebenen 0,50 USD. Es wurde keine weitere Generierung für die Auswertung versandt.

## Was die Handelsszenen zeigen

**Paar 1 und 2 · aktuelles Angebot.** Viermal blieb der Artikel eindeutig Nessa zugeordnet: `hand_axe`, Anzeige `hand-axe`, Qualität `fine`, Slot `weapon`, ATK 14, keine weiteren mechanischen Boni. A1, B1 und A2 erzählten 14 Kupfer. B2 nannte 14 Silber, entsprechend 140 Kupfer. Alle vier Angebote waren verbindlich zu 140 Kupfer gespeichert. Alaric hatte 30 Kupfer. Die vier ausdrücklichen Kaufproben auf Kopien des Reload-Zustands verweigerten den Erwerb wegen 110 Kupfer Fehlbetrag. In den natürlichen Zügen wurde nur gefragt. B1 wiederholte außerdem den alten erzählten Kettenhemdpreis von 80 Kupfer, obwohl die Welt dafür 72 führt.

**Paar 3 · Preis und ausstehendes Siegel.** B nannte für den feinen Turmschild „one silver ten copper“ (20 Kupfer) und verlangte ausdrücklich das Gildensiegel. Gespeichert wurden `tower_shield`, `fine`, 64 Kupfer, bedingt. A nannte 90 Kupfer „seal or no seal“. Der erste Extractor stufte den Preis als verbindlich ein. Die eigentliche Repair-Anweisung beanstandete das benachbarte Wort „tomorrow“. Nach dem Repair war das Angebot für 64 Kupfer an Nessas blaue Schärpe gebunden. Das ist eine überstrenge Lesart der Händlerrede und passt zum bereits auf beiden Pins lokal belegten Problem der Preisbedingung. In beiden Reload-Kaufproben sperrte die offene Bedingung die Annahme.

**Paar 4 · zwei Preissituationen.** A bot ausdrücklich einen *gewöhnlichen* Turmschild aus dem Wagen statt der gewünschten feinen Ware an: zwölf Kupfer regulär oder neun bei rechtzeitigem Siegel. Gespeichert blieb der bedingte gewöhnliche Schild für 56 Kupfer. Ein Repair war wegen der Felder `condition`, `phase` und `pricing` auf der falschen Objektebene nötig. B bot tatsächlich feine Ware, erzählte 20 Kupfer regulär und 15 mit Siegel. Gespeichert blieb die bedingte Variante für 64 Kupfer. In beiden Welten fehlt die unbedingte Alternative als separates Angebot. Es wurde nichts übertragen oder bezahlt. Die unterschiedliche Warenqualität war bereits in der Narration angelegt.

**Paar 5 · Kampf und Nessa.** Die finalen Narratorrequests nennen Nessa als anwesende Nichtkämpferin. Die Engine fordert während des laufenden Kampfes Stille und führt das blaue Tuch bereits als Besitz auf. A deutete die frühere Begegnung als gegenstandslos und behauptete, Tuch und Versprechen hätten nie existiert. Der Extractor buchte tatsächlich `scene.left` für Nessa. Das alte Tuch und die Zusage an der Furt blieben nach Reload bestehen. B ließ Nessa am Rand des Raums mit einer Geste auf später verweisen. Die Prosa ließ Alaric allerdings einen Messerstoß mit dem Stab parieren, obwohl seine Eingabe nur das Bereithalten des Stabs autorisierte und der Kampfbeleg keine solche Aktion enthält. Der B-Extractor buchte keine neue Kampfaktion. Beide Arme blieben bei 48 HP, 30 Kupfer und derselben Position. Es entstanden weder ein neues Schildangebot noch eine neue Übergabe oder Warnzusage.


**Paar 6 · zweite Kampfprobe.** Nessa blieb in beiden Antworten anwesend. A ließ sie schweigend das rote Tuch behalten, B mit einem Kopfschütteln auf später verweisen. Weder Schildangebot noch rotes Geschenk oder neue Warnzusage wurden behauptet oder gebucht. A übernahm null neue Deltas. B speicherte drei beschreibende Fakten über Goblinwaffen und Nessas Standort. Zwei vom Modell angebotene Positionsänderungen für aktive Kämpfer wies die Firewall ab. HP, Geld und Spielerstandort blieben in allen zwölf Zügen stabil. Die Kaufproben auf Weltkopien lösten keine Provideranfragen aus.

**Qualitätsentscheidung.** Bei den acht neuen Angebotszeilen stimmten alle gespeicherten Profile exakt mit dem geprüften Ausrüstungsprofil überein. Beim feinen Turmschild waren es DEF 5 / MDEF 3, beim gewöhnlichen DEF 4 / MDEF 3. Es gab keine unbeabsichtigte Zahlung oder Warenübergabe. A5 und B5 zeigen konkrete Fehler der natürlich erzeugten Erzählung. Die gesendeten Narratorarrays der abgeschlossenen Kampfwiederholung 6 waren identisch, diejenigen im abgeschlossenen Paar 5 wichen bereits voneinander ab. Wegen Kampfstille entstand in keinem der vier Kampfzüge die gewünschte neue Kombination aus Handel, Geschenk und Zusage. Damit bleibt deren vollständige Übernahme unter natürlicher Generierung offen. Die benachbarte Verabredung mit „tomorrow“ bleibt eine vorbestehende Preisbindungsauffälligkeit beider Pins. Die Evidenz trägt den kompakten Katalog als Tokenoptimierung für den Gegenreview. Eine höhere Spielgeschwindigkeit, eine bessere Reparaturquote oder allgemeine qualitative Gleichwertigkeit ist aus diesen Paaren nicht ableitbar.

## Belege und Offline-Reproduktion

Das Hauptarchiv enthält Seeds, vollständige finale Requestarrays, sichtbare Modellantworten, Provider-Usage, Zeitpunkte, ST-Logs, Kaufproben, persistierte Chats und Weltzustände. Zugangsdaten und private Reasoningtexte sind ausgespart. Die Datei `interruption.json` dokumentiert die Unterbrechung durch 429, der Endstand steht in `main-complete.json`. Das alte Journal bleibt im früheren Forschungsarchiv. [Hauptarchiv](openrouter_handel_203/natuerlicher_neustart/laufdaten.tar.gz) · [Erster neuer Canary](openrouter_handel_203/natuerlicher_neustart/erster_canary.tar.gz) · [Kennzahlen](openrouter_handel_203/natuerlicher_neustart/kennzahlen.json) · [Katalogzählung je Request](openrouter_handel_203/natuerlicher_neustart/katalogtokens.json) · [Abrechnung und Prüfsummen](openrouter_handel_203/natuerlicher_neustart/abschlussbeleg.json)

Das Testwerkzeug ging von `eb656853e87388fc2ab9fe3dd0f321bacf3a8752` aus. Ausgewerteter Stand ist `3a507c08b5551756cf0654d22b8cc10fff52d2a2` auf `experiment/203-openrouter-trade-ab`. Die Anpassungen betreffen die Zuordnung des alten Belegs, den Usage-Stop im isolierten Proxy, die gesicherte Fortsetzung nach einzeln geprüften Ablehnungen sowie die Auswertung und Bereinigung der Journale. Die früheren großen Engine-Smokes wurden bei unveränderten Pins übernommen. [Werkzeug und Anleitung](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/3a507c08b5551756cf0654d22b8cc10fff52d2a2/avereth-engine/tools/st_live/openrouter_trade) · [Vorheriger Gegenreview](GEGENREVIEW_203_OPENROUTER_HANDEL_TEILVERSUCH_GPT_2026-11-20.md)

Zur Reproduktion das Hauptarchiv in einen leeren Ordner `OUT` entpacken. Aus dem Werkzeugverzeichnis die beiden gepinnten Engine-Checkouts und die in `tokens.py` per SHA-256 geprüften GLM-Tokenizer- und Template-Dateien übergeben.

```sh
python -m unittest test_stream_usage test_restart
node audit.mjs "$OUT" "$A" "$B"
python paired.py "$OUT"
python tokens.py "$OUT" "$GLM_TOKENIZER" "$GLM_TEMPLATE"
```

Diese Offline-Auswertung wurde mit dem veröffentlichten Archiv wiederholt. Paarkennzahlen und Tokenvergleich waren bytegleich. Für den unabhängigen Review sind besonders der Preistext in A3, die abweichenden Preise in Paar 4 und die Prosa-Ereignis-Abweichungen in Paar 5 relevant.
