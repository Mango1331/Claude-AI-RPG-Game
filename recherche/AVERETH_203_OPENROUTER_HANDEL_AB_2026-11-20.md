# Natürlicher OpenRouter-Handelstest für Avereth .203 · Teilbericht vom 20.11.2026

**Entscheidung: Die natürliche Qualitätsabnahme des verkürzten Katalogs bleibt offen.** Beide Hosts erreichten Wafer über OpenRouter. Zwei A-Versuche in derselben Angebotsszene lieferten zwei gültige Plannerantworten und eine vollständige natürliche Erzählung. Keiner erreichte einen natürlichen Extractor. Es gibt **0/6 vollständige Paare und 0/12 vollständig gespeicherte natürliche Züge**. Nach unbekanntem Remoteabschluss bei Request 9 endeten sämtliche Modellaufrufe. Der Abbruch lag im Testwerkzeug. Aus den Daten lässt sich weder eine Katalogregression noch natürliche Qualitätsgleichheit ableiten.

## Aufbau und Kontrollgrößen

| Bestandteil | Verwendeter Stand |
|---|---|
| A · Performancezyklus 2 | `experiment/203-performance-cycle2` · `6d9770f9b31e78d37567719bf1c06d8a4942288c` |
| B · Performancezyklus 3 | `experiment/203-performance-cycle3` · `25c46bc9d342c9ed6cf87f8ac59e11c85ab4de18` |
| SillyTavern | 1.19.0 · `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Technischer Vorbefund | Handelsschlussabnahme auf `1c581b83fbf590f05ab5bbbb78302064940ec0dd`, unabhängiger Gegenreview auf main gelesen. Es gab keinen dazwischenliegenden Laufzeitfix an A oder B. |
| Testwerkzeug | `experiment/203-openrouter-trade-ab` · `eb656853e87388fc2ab9fe3dd0f321bacf3a8752`. Der im natürlichen zweiten Anlauf verwendete Beobachter ist zusätzlich im Archiv enthalten. |
| Tatsächlich verwendete Route | `https://openrouter.ai/api/v1/chat/completions`, `z-ai/glm-5.3-flash`, ausschließlich `wafer/us`, keine Fallbacks. Alle acht vollständig empfangenen Modellantworten nennen Wafer und die erwartete Modell-ID. Für Nr. 9 ist nur die gesendete Route belegt. |
| Preise je Million Tokens | Input 0,042 USD, Output 0,184 USD, gelesener Cache 0,041 USD. Anbieterauflistung samt Parameterliste im Archiv. Preislimit und konservative Reservierung vor jedem Versand. |
| ST-Konfiguration | Zwei Loopback-Hosts, eigene Datenwurzeln, Browserkontexte und Chatdateien. Identischer V4-Vertrag, identische Lore, Originalpreset, 131.072 Kontext, 4.096 Narrator-Ausgabelimit, Temperatur 0,9, Top-p 0,95, native Streams, Smooth aus, X2 aus. Planner real mit 2.000 / 0,1. Beide Arme mit `reasoning.effort=low`. |
| Physische Steuerung | Ein Schlüssel im Transportprozess, ein globaler Lock über beide Hosts, eine lokale Ein-Modell-Liste. Jeder Versand vorab im Journal. Höchstens eine beobachtete gleichzeitige Generierung. |

Die finale Engine-Differenz ist auf die Katalogdarstellung in `src/v4/items.js` beschränkt. Beide Seeds stammen aus den ausdrücklich zugelassenen lokalen Handelsfixtures. Im Gildenseed hat Alaric 30 Kupfer. Nessa bietet bereits Kettenhemd an, eine Handaxt ist noch nicht gelistet. Der Kampfseed enthält Nessa, das frühere blaue Tuch und die Verabredung an der alten Furt. Für den Mischfall waren ein rotes Tuch und eine neue Warnung an die Gilde vorgesehen. Jede Eingabe startet aus einer frischen Kopie. Der Vergleichsarm B wurde für die Vorprüfung und später für den kostenlosen Browserregressionstest geöffnet.

## Physische Anfragen und Kosten

Millisekunden sind vom Versand bis zum vollständigen Body beziehungsweise bis zur beobachteten Unterbrechung gemessen. Cache gehört zur Inputmenge, Reasoning zur Outputmenge. Der ST-Client und das Transportjournal lieferten bei beiden Vorprüfungsrunden denselben sichtbaren Antworttext.

| Nr. | Arm und Zweck | ms | Input | Output | davon Reasoning | davon Cache | gemeldete USD |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | A · gepufferte Vorprüfung | 1.538 | 22 | 11 | 0 | 0 | 0,000002948 |
| 2 | B · Streamvorprüfung | 1.346 | 22 | 14 | 0 | 0 | 0,000003500 |
| 3 | A · Handaxt, Planner | 2.118 | 13.886 | 17 | 12 | 0 | 0,000586340 |
| 4 | A · Handaxt, Narrator | 7.018 | 12.642 | 351 | 87 | 0 | 0,000595548 |
| 5 | A-Port · gesonderte Streamformatprobe | 1.631 | 20 | 20 | 0 | 0 | 0,000004520 |
| 6 | A · gepufferte Vorprüfung nach Adapter | 1.424 | 22 | 11 | 0 | 0 | 0,000002948 |
| 7 | B · Streamvorprüfung nach Adapter | 1.330 | 22 | 12 | 0 | 0 | 0,000003132 |
| 8 | A · neuer Handaxtversuch aus Seed, Planner | 2.069 | 13.886 | 16 | 10 | 13.824 | 0,000572332 |
| 9 | A · Narrator, HTTP 200, Verbindung unterbrochen | 2.091 bis zur Unterbrechung | offen | offen | offen | offen | offen |

**Verbrauch: 9/60 physische Requests.** Für acht Antworten sind 40.522 Inputtokens, 452 Outputtokens, darin 109 Reasoningtokens, 13.824 Cachetokens und **0,001771268 USD** gemeldet. Die Abrechnung von Nr. 9 fehlt. Dafür blieben 0,044793856 USD reserviert, berechnet aus dem gesamten Anbieter-Kontext zum Inputpreis plus 4.096 Tokens zum Outputpreis. Kostenbelege und Reserve ergeben zusammen **0,046565124 USD** gegenüber 0,50 USD Limit. Seit Nr. 9 gab es keinen weiteren physischen Modellrequest. Die hohe Cachemeldung in Nr. 8 betrifft die Wiederholung desselben A-Planners.

## Zwei verschiedene Abbruchursachen

1. **Nr. 4, Transport regulär beendet.** Die sichtbare Antwort des Providers ist vollständig und stimmt mit der gespeicherten ST-Nachricht überein. Wafer meldete `finish_reason=stop`, Usage und `[DONE]`. A speicherte die Revision dennoch mit endgültigem Unvollständigkeits-Panel und leerer Antwort-Ereignisliste. Die gezielte Probe Nr. 5 zeigte einen leeren abschließenden Primär-Choice und anschließend ein Usage-Paket mit wiederholtem leeren Primär-Choice und erneutem `stop`. Die gemeinsame Engine behandelt einen weiteren Choice nach `stop` als ungültig. Die einzelnen Frames von Nr. 4 wurden nicht archiviert. Der konkrete Framebeleg stammt aus Nr. 5 auf derselben Route.
2. **Anpassung im Testproxy.** Er übersetzt ausschließlich einen unmittelbar wiederholten, inhaltsleeren Stop-Choice derselben Generation, desselben Modells und Anbieters im Usage-Paket in `choices: []`. Content, Reasoning, Abrechnung, ursprüngliches Stop-Ereignis und `[DONE]` bleiben erhalten. Nr. 7 enthielt genau eine solche Normalisierung und endete regulär. Lokale Gegenproben ließen zusätzlichen Text, Reasoning, Fehler, veränderte Identität, mehrere Choices und fehlerhaftes JSON unangetastet.
3. **Nr. 9, Fehler im Testtreiber.** Die Engine setzt `extraction.status=incomplete` bereits beim Binden einer noch laufenden Revision. Mein Beobachter las diesen vorläufigen Marker als endgültiges Urteil und schloss den Browser zu früh. Der Proxy hat `ClientConnectionResetError` nach HTTP 200 protokolliert. Reguläres Streamende, Usage und tatsächliche Endkosten fehlen. Die globale Sperre hat den Versuch beendet. Der anschließend korrigierte Beobachter verlangt das endgültige Fehlerpanel und eine beendete ST-Generierung. Vor dem Schließen lässt der Runner einen laufenden Transport seine Belegung klassifizieren. Der korrigierte Beobachter wurde ausschließlich lokal nachgetestet.

## Handelspaare und Spielqualität

| Paar | Geplante Szene | Reihenfolge | Natürliche Evidenz | Zeit bis erste Prosa / sichere Eingabe, paarweise Usage und Kosten, Reload |
|---:|---|---|---|---|
| 1 | Verbindliches aktuelles Angebot, feine Handaxt | A → B | A zweimal begonnen, eine vollständige Erzählung, beide ohne X. B im Hauptspiel nicht gestartet. | Kein vollständiges Paar. Persistierte A-Teilstände offline gefaltet. |
| 2 | Dasselbe Angebot | B → A | NOT RUN | – |
| 3 | Turmschild, Gildensiegel als echte Kaufbedingung | A → B | NOT RUN | – |
| 4 | Derselbe bedingte Kauf | B → A | NOT RUN | – |
| 5 | Kampfbezug, Drachenschild, rotes Tuch, Zusage an die Gilde | A → B | NOT RUN | – |
| 6 | Dieselbe gemischte Handlung | B → A | NOT RUN | – |

Der Spieler fragte tatsächlich: “Nessa, can you offer me one fine hand-axe for sale right now? What is your firm price for it? I only ask for the offer and keep my purse closed.” Beide Planner lieferten gültiges JSON mit `commands: []`. Nessa zeigte in Nr. 4 eine feine Handaxt und nannte “Fourteen copper. That's my firm price for it”. Sie drängte Alaric weder zum Bezahlen noch zum Anlegen. Hedda blieb am Schalter. Ein verkaufter Gegenstand oder ein zusätzlicher Bonus wurde nicht erzählt.

**Erzählter Preis 14 Kupfer. Tatsächlich gespeicherter natürlicher Handaxtpreis: keiner.** In beiden A-Dateien bleiben 30 Kupfer und null Handaxtangebote. Die vier Spielereingabe-Ereignisse pro separatem Versuch sind `turn.begun`, `cmd.interpreted`, `pulse.rolled` und `outcome.recorded`. Aus der Narration wurde kein Ereignis gebucht. Damit bestand für dieses neue Angebot keine Kaufberechtigung. Beim zweiten Versuch enthält die Datei lediglich den neuen Spielerbeitrag. Es gab in keinem Versuch den vollständigen Weltabschluss mit gestatteter nächster Eingabe. Ein gemeinsamer Zielzustand nach natürlichem A/B-Reload ist nicht messbar.

Kein natürlicher Extractor, keine natürlich beobachteten Repairs und kein B-Spielturn. Die Reparaturquote, die Gleichwertigkeit der Ausrüstungsangebote, die Behandlung einer echten offenen Kaufbedingung und der Erhalt der neuen NPC-Zusage bleiben offen. Sichtbare DOM-Zeitpunkte wurden erst im Erfolgszweig exportiert und fehlen für beide A-Versuche. Die rein physische Narratorzeit von 7.018 ms bleibt getrennt. Vergleichbare Gesamtzeiten, Gruppenmediane und der Median der paarweisen Zeitdifferenzen sind bei null Paaren undefiniert. Die ergänzenden kontrollierten natürlichen P-/X-Anfragen entfielen wegen der Sperre.

## Was offline mit diesen Eingaben überprüft wurde

| Gegenprobe | Ergebnis |
|---|---|
| Tatsächlich gesendete A-Plannerarrays Nr. 3 und 8 | Gleicher Inhalt, Katalog je einmal. OpenRouter meldete jeweils 13.886 Inputtokens. Der gepinnte GLM-Tokenizer ergibt 13.886 für A und bei reinem Austausch des Katalogs 13.765 für B. **121 Tokens weniger**, eine eindeutige Eingabe zweimal gesendet. Kein abgerechneter B-Vergleich. |
| Korrigierter Treiber in zwei echten ST-Hosts mit lokalem Provider | Nr.-4-Prosa wiedergegeben, Planner und Extractor geskriptet. Beide Arme erreichten mit je drei lokalen Requests Save, Read-back und Reload. Beide Welt-Hashes `7ed2cefab68a88b5ad3e535641592aa38f3685d90458b36cacfff0ea40c681ab`. Eine frühe lokale Extractorfixture scheiterte an fehlendem `service`; nach Vervollständigung der Fixture war kein Repair nötig. |
| Final gesendete P-/X-Arrays der lokalen ST-Gegenprobe | Nach Ersetzung ausschließlich des Katalogs identische Arrays je Rolle. Lokaler Planner **13.886 → 13.765**, lokaler Extractor **14.802 → 14.681**. |
| Gespeicherter Preis und Kaufprobe in dieser lokalen Welt | Nessa bot `hand_axe`, Anzeige `hand-axe`, F/fine, Slot `weapon`, ATK 14, MATK/DEF/MDEF 0. Beide Arme speicherten das verbindliche Angebot zu **140 Kupfer**. Ein ausdrücklicher Kauf auf Kopien der Reload-Welten scheiterte in beiden mit **110 Kupfer Fehlbetrag**. Keine Zahlung, keine Übergabe. |
| Unabhängige NPC-Zusage im Folgesatz | Ohne Folgesatz liefert `openConditionNear` auf beiden Pins keinen Treffer. Beim unabhängigen Treffen an der alten Furt meldet es fälschlich `tomorrow`. Bei der wirklichen Gildensiegelbedingung erkennt es auf beiden `after the`. Das reproduziert die bekannte gemeinsame Auffälligkeit. |

**Katalogurteil: Experimentkandidat beibehalten, natürliche Freigabe vertagen.** Die 121 Tokens sind für diese Eingaben lokal exakt nachgewiesen. Das natürliche Handelsspiel mit B, der Einfluss auf Repairs und die Wartezeit pro sicher gespeichertem Zug fehlen. Der gemeinsame Preisbindungsfehler bleibt ein eigener Befund. Die bereits abgenommenen großen Regressionen und Standard-, Board-, Failsoft- und Streaming-Smokes wurden für diesen Auftrag nicht erneut gestartet. Beide Spielpins, Schutzregeln und Preise blieben unverändert.

## Nachweise und Reproduktion

Das Archiv enthält die finalen Upstreamrequestarrays, alle verfügbaren sichtbaren Antworten, Finish-/Usage-Daten, Zeitpunkte, ST-Protokolle, beide Ausgangschats, die beiden tatsächlich geschriebenen Teilstände, die Streamformatprobe und die ausgeführte Treiberfassung. Rohes Modell-Reasoning und Zugangsdaten sind aus der Übergabe ausgenommen. Die getrennt bezeichnete lokale Gegenprobe enthält normalisierte Prompthashes, konkrete Kaufablehnung und beide Reload-Fingerprints. Das Archiv wurde dateiweise auf den tatsächlichen Schlüssel geprüft. SHA-256 `da7a65d42f331ac85adbdc66b598857012d5bfa48c14b34de0844e5270dd23b1`. [Kennzahlen](openrouter_handel_203/kennzahlen.json) · [Bereinigtes Laufarchiv](openrouter_handel_203/laufdaten.tar.gz) · [Reproduktion im Testbranch](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/eb656853e87388fc2ab9fe3dd0f321bacf3a8752/avereth-engine/tools/st_live/openrouter_trade)

Offizielle Angaben zum Filter und zur getesteten Modellroute: [OpenRouter Provider-Routing](https://openrouter.ai/docs/guides/routing/provider-selection) · [Endpointliste für GLM-5.3-Flash](https://openrouter.ai/api/v1/models/z-ai/glm-5.3-flash/endpoints). Der produktive Pfad und die früheren Handelsannahmen sind im [unabhängigen Gegenreview](GEGENREVIEW_203_HANDEL_SCHLUSSABNAHME_GPT_2026-11-20.md) dokumentiert.
